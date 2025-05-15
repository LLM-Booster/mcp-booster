/**
 * Storage and conclusion module for CoConuT
 * Generates conclusions and explanations of changes made in the chain of thoughts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ThoughtEntry, CoConuTConfig, SavedFileInfo, CoConuTStorageParams } from './types';
import { Logger } from './logger';
import { StorageProvider } from './storage';

/**
 * Interface para metadados de conclusão
 */
interface ConclusionMetadata {
    id: string;
    timestamp: string;
    category: string;
    subCategories: string[];
    tags: string[];
    impactLevel: 'low' | 'medium' | 'high';
    affectedFiles: string[];
    relatedConclusions: string[];
    ticketReference?: string;
    businessContext?: string;
    technicalContext?: string;
    thoughtNumbers?: number[];
}

/**
 * Interface para o sistema de templates
 */
interface ConclusionTemplate {
    name: string;
    template: string;
}

/**
 * Interface para mensagens internacionalizadas
 */
interface I18nMessages {
    [key: string]: {
        [locale: string]: string;
    };
}

/**
 * Classe responsável por gerar conclusões e salvar o histórico final de pensamentos
 */
export class CoConuT_Storage {
    private logger: Logger;
    private storageProvider: StorageProvider;
    private config: CoConuTConfig;
    private locale: string = 'en'; // Default locale
    private templates: Map<string, ConclusionTemplate> = new Map();
    private searchIndex: Map<string, Set<string>> = new Map();

    /**
     * Mensagens internacionalizadas do sistema
     */
    private i18n: I18nMessages = {
        'error.no.path': {
            'en': 'No path provided to save files',
            'pt': 'Nenhum caminho foi fornecido para salvar os arquivos'
        },
        'info.adding.content': {
            'en': 'Adding new entry to existing conclusion file',
            'pt': 'Adicionando nova entrada ao arquivo de conclusão existente'
        },
        'info.creating.file': {
            'en': 'Creating new conclusion file',
            'pt': 'Criando novo arquivo de conclusão'
        },
        'error.saving.conclusion': {
            'en': 'Error saving conclusion',
            'pt': 'Erro ao salvar conclusão'
        },
        'error.adding.conclusion': {
            'en': 'Error adding text to conclusion file',
            'pt': 'Erro ao adicionar texto ao arquivo de conclusão'
        },
        'error.processing.conclusion': {
            'en': 'Failed to process conclusion',
            'pt': 'Falha ao processar conclusão'
        }
    };

    constructor(storageProvider: StorageProvider, config: CoConuTConfig) {
        this.storageProvider = storageProvider;
        this.config = config;
        this.logger = Logger.getInstance();

        // Verificar se o caminho do projeto está presente
        if (!config.projectPath) {
            this.logger.warn('CoConuT_Storage: No project path configured. It will need to be provided in processConclusion');
        }

        // Registrar o template padrão
        this.registerDefaultTemplates();
    }

    /**
     * Método para traduzir mensagens
     * @param key Chave da mensagem no dicionário
     * @param replacements Substituições a serem feitas na mensagem
     * @returns A mensagem traduzida
     */
    private t(key: string, replacements: Record<string, string> = {}): string {
        const message = this.i18n[key]?.[this.locale] || key;
        return message.replace(/\{(\w+)\}/g, (_, k) => replacements[k] || `{${k}}`);
    }

    /**
     * Define o idioma a ser usado pelo sistema
     * @param locale Código do idioma (en, pt, etc)
     */
    public setLocale(locale: string): void {
        if (Object.keys(this.i18n).some(key => this.i18n[key][locale])) {
            this.locale = locale;
            this.logger.info(`Locale set to ${locale}`);
        } else {
            this.logger.warn(`Locale ${locale} not supported, using ${this.locale}`);
        }
    }

    /**
     * Registra templates padrão
     */
    private registerDefaultTemplates(): void {
        // Criar mapa de emojis para os diferentes tipos de categoria
        const emojiMap: Record<string, string> = {
            'feature': '✨',
            'docs': '📝',
            'test': '🧪',
            'refactor': '♻️',
            'fix': '🐛',
            'chore': '🔧',
            'style': '💄',
            'perf': '⚡'
        };

        // Template único semântico como template default
        this.registerTemplate('default', `## {emoji} {category} | {impactLevel} [ID:{id}]
**Why:** {whyChange}
**What:** {whatChange}
**Files:** {affectedFilesInline}
<!-- metadata -->
`);
    }

    /**
     * Registra um novo template
     * @param name Nome do template
     * @param template Template em formato de string com placeholders
     */
    public registerTemplate(name: string, template: string): void {
        this.templates.set(name, { name, template });
        this.logger.info(`Template ${name} registered`);
    }

    /**
     * Renderiza um template com os dados fornecidos
     * @param templateName Nome do template a ser renderizado
     * @param data Dados a serem inseridos no template
     * @returns Template renderizado
     */
    private renderTemplate(templateName: string, data: Record<string, any>): string {
        const template = this.templates.get(templateName);
        if (!template) {
            this.logger.warn(`Template ${templateName} not found, using default`);
            return this.renderTemplate('default', data);
        }

        // Renderização simples com substituição de placeholders
        return template.template.replace(/\{(\w+)\}/g, (_, key) => {
            if (data[key] === undefined) return `{${key}}`;
            if (Array.isArray(data[key])) {
                if (data[key].length === 0) return '';
                return data[key].map((item: any) => `- ${item}`).join('\n');
            }
            return data[key].toString();
        });
    }

    /**
     * Adiciona conteúdo ao índice de busca
     * @param id ID único da conclusão
     * @param content Conteúdo a ser indexado
     */
    private indexContent(id: string, content: string): void {
        try {
            // Extrair palavras do conteúdo
            const words = content.toLowerCase()
                .replace(/[^\p{L}\s]/gu, ' ') // Remove caracteres não-alfabéticos
                .split(/\s+/)
                .filter(word => word.length > 3); // Ignorar palavras muito curtas

            // Adicionar ao índice
            words.forEach(word => {
                if (!this.searchIndex.has(word)) {
                    this.searchIndex.set(word, new Set());
                }
                this.searchIndex.get(word)?.add(id);
            });

            this.logger.debug(`Indexed ${words.length} unique words for conclusion ${id}`);
        } catch (error) {
            this.logger.error('Error indexing content', { error });
        }
    }

    /**
     * Busca conclusões no índice
     * @param query Query de busca
     * @returns Array de IDs de conclusões ordenados por relevância
     */
    public searchConclusions(query: string): string[] {
        try {
            const searchTerms = query.toLowerCase()
                .replace(/[^\p{L}\s]/gu, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);

            const results: Map<string, number> = new Map();

            // Buscar cada termo
            searchTerms.forEach(term => {
                const ids = this.searchIndex.get(term);
                if (ids) {
                    ids.forEach(id => {
                        results.set(id, (results.get(id) || 0) + 1);
                    });
                }
            });

            // Ordenar por relevância e retornar IDs
            return Array.from(results.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([id]) => id);
        } catch (error) {
            this.logger.error('Error searching conclusions', { error });
            return [];
        }
    }

    /**
     * Gera uma conclusão e salva o histórico de pensamentos
     * @param thoughts Histórico de pensamentos para processar
     * @param projectPath Caminho do projeto onde os arquivos serão salvos
     * @param whyChange Motivo da mudança
     * @param whatChange Descrição da mudança
     * @param params Parâmetros adicionais opcionais
     * @returns Array com informações dos arquivos salvos
     */
    public async processConclusion(thoughts: ThoughtEntry[], projectPath: string, whyChange: string, whatChange: string, params?: Partial<CoConuTStorageParams>): Promise<SavedFileInfo[]> {
        try {
            // Verificar e configurar o caminho do projeto
            if (!projectPath) {
                throw new Error(this.t('error.no.path'));
            }

            // Atualizar o caminho do projeto na configuração
            this.config.projectPath = projectPath;

            // Mesclar parâmetros recebidos
            const fullParams: Partial<CoConuTStorageParams> = {
                ...params,
                projectPath,
                WhyChange: whyChange,
                WhatChange: whatChange
            };

            // Gerar conclusão baseada nos parâmetros fornecidos
            const conclusion = this.generateCustomConclusion(whyChange, whatChange, fullParams);

            // Adicionar a conclusão como um metadado ao último pensamento
            const lastThought = thoughts[thoughts.length - 1];
            if (lastThought) {
                lastThought.metadata = lastThought.metadata || {};
                lastThought.metadata.conclusion = conclusion;
                lastThought.metadata.whyChange = whyChange;
                lastThought.metadata.whatChange = whatChange;

                // Adicionar metadados enriquecidos
                if (params) {
                    lastThought.metadata.category = params.category;
                    lastThought.metadata.tags = params.tags;
                    lastThought.metadata.impactLevel = params.impactLevel;
                }
            }

            // Salvar todos os pensamentos
            const savedFiles: SavedFileInfo[] = [];
            for (const thought of thoughts) {
                try {
                    const fileInfo = await this.storageProvider.saveThought(thought);
                    if (fileInfo) {
                        savedFiles.push(fileInfo);
                    }
                } catch (thoughtError) {
                    this.logger.error('Error saving individual thought', { thoughtError, thoughtNumber: thought.thoughtNumber });
                    // Continuar tentando salvar os outros pensamentos
                }
            }

            // Registrar a conclusão em um arquivo separado
            const conclusionFileInfo = await this.saveConclusion(conclusion, projectPath);
            if (conclusionFileInfo) {
                savedFiles.push(conclusionFileInfo);
            }

            return savedFiles;
        } catch (error: any) {
            this.logger.error(this.t('error.processing.conclusion'), { error });
            throw new Error(`${this.t('error.processing.conclusion')}: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Automatically records a summary of the current interaction in the conclusion.md file
     * @param projectPath Project path where the files will be saved
     * @param interactionSummary An object containing information about the current interaction
     * @returns Information about the saved file or null in case of error
     */
    public async appendInteractionSummary(
        projectPath: string,
        interactionSummary: {
            thoughtNumber: number,
            totalThoughts: number,
            what: string,
            why: string
        }
    ): Promise<SavedFileInfo | null> {
        try {
            // Verify and configure the project path
            if (!projectPath) {
                throw new Error("A path must be provided to save the interaction summary");
            }

            // Create interaction summary text
            const summary = `## Interaction Summary ${interactionSummary.thoughtNumber}/${interactionSummary.totalThoughts}

### Why it was done
${interactionSummary.why}

### What was done
${interactionSummary.what}`;

            // Save the summary to the conclusion.md file
            return await this.appendToConclusion(summary, projectPath);
        } catch (error: any) {
            this.logger.error('Error recording interaction summary', { error });
            return null;
        }
    }

    /**
     * Gera metadados para a conclusão a partir dos parâmetros fornecidos
     * @param thoughts Array de pensamentos (opcional)
     * @param params Parâmetros adicionais
     * @returns Objeto de metadados estruturado
     */
    private generateMetadata(thoughts?: ThoughtEntry[], params?: Partial<CoConuTStorageParams>): ConclusionMetadata {
        try {
            const now = new Date();
            const metadata: ConclusionMetadata = {
                id: `conclusion-${now.getTime()}`,
                timestamp: now.toISOString(),
                category: params?.category || 'docs',
                subCategories: params?.subCategories || [],
                tags: params?.tags || [],
                impactLevel: (params?.impactLevel || 'medium') as 'low' | 'medium' | 'high',
                affectedFiles: params?.affectedFiles || [],
                relatedConclusions: params?.relatedConclusions || [],
                ticketReference: params?.ticketReference || '',
                businessContext: params?.businessContext || '',
                technicalContext: params?.technicalContext || ''
            };

            // Adicionar números dos pensamentos se disponíveis
            if (thoughts && thoughts.length > 0) {
                metadata.thoughtNumbers = thoughts.map(t => t.thoughtNumber);
            }

            return metadata;
        } catch (error) {
            this.logger.error('Error generating metadata', { error });
            // Retornar metadados mínimos em caso de erro
            return {
                id: `conclusion-${Date.now()}`,
                timestamp: new Date().toISOString(),
                category: 'docs',
                subCategories: [],
                tags: [],
                impactLevel: 'medium' as 'low' | 'medium' | 'high',
                affectedFiles: [],
                relatedConclusions: []
            };
        }
    }

    /**
     * Formata a lista de arquivos afetados
     */
    private formatAffectedFiles(files: string[]): string {
        try {
            if (!files || files.length === 0) {
                return 'No affected files specified.';
            }

            return files.map(file => `- \`${file}\``).join('\n');
        } catch (error) {
            return 'Error formatting affected files.';
        }
    }

    /**
     * Formata a lista de arquivos afetados em uma única linha
     */
    private formatAffectedFilesInline(files: string[]): string {
        try {
            if (!files || files.length === 0) {
                return 'No affected files specified.';
            }

            return files.map(file => `\`${file}\``).join(', ');
        } catch (error) {
            return 'Error formatting affected files.';
        }
    }

    /**
     * Formata as alternativas consideradas
     */
    private formatAlternatives(alternatives: string[]): string {
        try {
            if (!alternatives || alternatives.length === 0) {
                return 'No alternatives considered were specified.';
            }

            return alternatives.map((alt, i) => `${i + 1}. ${alt}`).join('\n');
        } catch (error) {
            return 'Error formatting considered alternatives.';
        }
    }

    /**
     * Formata as conclusões relacionadas
     */
    private formatRelatedConclusions(conclusions: string[]): string {
        try {
            if (!conclusions || conclusions.length === 0) {
                return 'No related conclusions.';
            }

            return conclusions.map(ref => `- ${ref}`).join('\n');
        } catch (error) {
            return 'Error formatting related conclusions.';
        }
    }

    /**
     * Formata os snippets de código
     */
    private formatCodeSnippets(snippets: Array<{ before: string, after: string, file: string }>): string {
        try {
            if (!snippets || snippets.length === 0) return '';

            let result = `\n### 💻 Code Changes\n`;

            snippets.forEach((snippet, index) => {
                result += `#### Change ${index + 1} in \`${snippet.file}\`\n`;
                result += `**Before:**\n\`\`\`\n${snippet.before}\n\`\`\`\n\n`;
                result += `**After:**\n\`\`\`\n${snippet.after}\n\`\`\`\n\n`;
            });

            return result;
        } catch (error) {
            return '\n### 💻 Error formatting code snippets\n';
        }
    }

    /**
     * Salva a conclusão em um arquivo separado
     * @param conclusion Texto da conclusão a ser salva
     * @param projectPath Caminho do projeto onde o arquivo será salvo
     */
    private async saveConclusion(conclusion: string, projectPath: string): Promise<SavedFileInfo | null> {
        try {
            // Verificar caminho
            if (!projectPath) {
                throw new Error(this.t('error.no.path'));
            }

            // Usar o método comum para preparar e salvar o conteúdo
            return await this.prepareAndSaveContent(conclusion, projectPath, true);
        } catch (error: any) {
            this.logger.error(this.t('error.saving.conclusion'), { error });
            return null;
        }
    }

    /**
     * Adiciona texto ao arquivo de conclusão sem substituir o conteúdo existente
     * @param text Texto a ser adicionado ao arquivo de conclusão
     * @param projectPath Caminho do projeto onde o arquivo será salvo
     */
    private async appendToConclusion(text: string, projectPath: string): Promise<SavedFileInfo | null> {
        try {
            // Verificar caminho
            if (!projectPath) {
                throw new Error(this.t('error.no.path'));
            }

            // Usar o método comum para preparar e salvar o conteúdo
            return await this.prepareAndSaveContent(text, projectPath, true);
        } catch (error: any) {
            this.logger.error(this.t('error.adding.conclusion'), { error });
            return null;
        }
    }

    /**
     * Prepara e salva conteúdo no arquivo de conclusão
     * @param text Texto a ser salvo
     * @param projectPath Caminho do projeto onde salvar
     * @param isNewEntry Se é uma entrada nova (adiciona timestamp)
     * @returns Informações sobre o arquivo salvo ou null em caso de erro
     */
    private async prepareAndSaveContent(
        text: string,
        projectPath: string,
        isNewEntry: boolean = true
    ): Promise<SavedFileInfo | null> {
        try {
            // Verificar caminho do projeto
            if (!projectPath) {
                throw new Error(this.t('error.no.path'));
            }

            // Criar caminhos
            const storageDir = path.resolve(projectPath, 'coconut-data');
            const conclusionPath = path.resolve(storageDir, 'conclusion.md');

            // Garantir que o diretório existe
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

            // Verificar se o texto já possui um cabeçalho semântico com emoji
            const hasSemanticHeader = /^## [✨📝🧪♻️🐛🔧💄⚡]/i.test(text);

            // Preparar o conteúdo com timestamp se for uma nova entrada
            let processedText = text;
            if (isNewEntry && !hasSemanticHeader) {
                const now = new Date();
                const dateStr = now.toLocaleDateString();
                const timeStr = now.toLocaleTimeString();
                const timestamp = `## Entrada em ${dateStr} às ${timeStr}`;
                processedText = `${timestamp}\n\n${text}`;
                this.logger.debug('Adding timestamp to regular conclusion');
            } else if (isNewEntry && hasSemanticHeader) {
                // Para templates semânticos, manter o formato original
                this.logger.debug('Preserving semantic header format');
            }

            let finalContent = "";
            const separator = "\n\n---\n\n";

            // Verificar e adicionar conteúdo existente
            if (fs.existsSync(conclusionPath)) {
                const existingContent = await fs.promises.readFile(conclusionPath, 'utf-8');
                finalContent = existingContent + separator + processedText;
                this.logger.info(this.t('info.adding.content'));
            } else {
                finalContent = processedText;
                this.logger.info(this.t('info.creating.file'));
            }

            // Salvar o conteúdo
            await fs.promises.writeFile(conclusionPath, finalContent);

            // Se for uma conclusão completa, indexar o conteúdo para busca
            const conclusionId = `conclusion-${Date.now()}`;
            if (text.includes('## Conclusão da Cadeia de Pensamentos') || hasSemanticHeader) {
                this.indexContent(conclusionId, text);
            }

            return {
                filePath: conclusionPath,
                type: 'conclusion',
                timestamp: Date.now()
            };
        } catch (error: any) {
            const errorType = isNewEntry ? 'error.saving.conclusion' : 'error.adding.conclusion';
            this.logger.error(this.t(errorType), { error });
            return null;
        }
    }

    /**
     * Generates a custom conclusion based on the provided parameters
     * @param whyChange Reason for the change
     * @param whatChange Description of the change
     * @param params Additional parameters
     * @returns Formatted conclusion string
     */
    private generateCustomConclusion(whyChange: string, whatChange: string, params?: Partial<CoConuTStorageParams>): string {
        try {
            // Gerar metadados
            const metadata = this.generateMetadata(undefined, params);

            // Serializar metadados para armazenamento
            const metadataJson = JSON.stringify(metadata, null, 2);

            // Mapa de emojis para categorias
            const emojiMap: Record<string, string> = {
                'feature': '✨',
                'docs': '📝',
                'test': '🧪',
                'refactor': '♻️',
                'fix': '🐛',
                'chore': '🔧',
                'style': '💄',
                'perf': '⚡'
            };

            // Obter a categoria e seu emoji correspondente
            const category = params?.category || 'feature';
            const emoji = emojiMap[category] || '✨';

            // Preparar dados para o template
            const templateData: Record<string, any> = {
                ...metadata,
                emoji,
                whyChange,
                whatChange,
                context: this.formatContext(metadata),
                affectedFiles: this.formatAffectedFiles(metadata.affectedFiles),
                affectedFilesInline: this.formatAffectedFilesInline(metadata.affectedFiles),
                alternatives: this.formatAlternatives(params?.alternativesConsidered || []),
                testing: params?.testingPerformed || '',
                relatedConclusions: this.formatRelatedConclusions(metadata.relatedConclusions)
            };

            // Sempre usar o template default
            let templateName = 'default';

            // Renderizar com o template selecionado
            let markdown = this.renderTemplate(templateName, templateData);

            // Armazenar metadados JSON em comentário HTML para facilitar extração programática
            // Para templates compactos, apenas adicionar o ID nos metadados
            markdown = markdown.replace('<!-- metadata -->', `<!-- metadata:${metadata.id} -->`);

            // Registrar qual template foi usado
            this.logger.info(`Using template: ${templateName} for category: ${category}`);

            return markdown;
        } catch (error) {
            this.logger.error('Error generating custom conclusion', { error });
            // Fallback simples em caso de erro
            return `## Conclusão\n**Por que:** ${whyChange}\n**O que:** ${whatChange}\n`;
        }
    }

    /**
     * Formata a seção de contexto
     */
    private formatContext(metadata: ConclusionMetadata): string {
        try {
            let context = '';

            if (metadata.businessContext) {
                context += `#### Business Context\n${metadata.businessContext}\n\n`;
            }

            if (metadata.technicalContext) {
                context += `#### Technical Context\n${metadata.technicalContext}\n\n`;
            }

            return context || 'No additional context provided.';
        } catch (error) {
            return 'Error formatting context.';
        }
    }
} 