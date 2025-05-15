/**
 * Sistema de persistência para histórico de pensamentos
 */

import * as fs from 'fs';
import * as path from 'path';
import { ThoughtEntry, CoConuTConfig, SavedFileInfo } from './types';
import { Logger } from './logger';

/**
 * Interface para dados armazenados pelo provedor
 */
export interface StorageData {
    thoughts: ThoughtEntry[];
    branches: Record<string, Array<number>>;
}

/**
 * Interface para diferentes tipos de armazenamento
 */
export interface StorageProvider {
    initialize(): Promise<void>;
    saveThought(entry: ThoughtEntry): Promise<SavedFileInfo | null>;
    loadHistory(): Promise<ThoughtEntry[]>;
    saveBranch(branchId: string, thoughtNumbers: number[]): Promise<SavedFileInfo | null>;
    loadBranches(): Promise<Record<string, Array<number>>>;
    clear(): Promise<void>;

    // Novos métodos para exportar/importar dados
    exportData(): Promise<StorageData>;
    importData(data: StorageData): Promise<void>;
}

/**
 * Implementação de armazenamento em arquivo
 */
export class FileStorageProvider implements StorageProvider {
    private filePath: string | null = null;
    private branchesFilePath: string | null = null;
    private logger: Logger;
    private config: CoConuTConfig;

    constructor(config: CoConuTConfig) {
        this.config = config;
        this.logger = Logger.getInstance();

        // Não inicializar os caminhos no construtor, eles serão definidos quando necessário
    }

    /**
     * Configura os caminhos de arquivo com base no projectPath fornecido
     */
    private setupPaths(projectPath: string): void {
        // Criar diretório de dados no caminho especificado
        const storageDir = path.resolve(projectPath, 'coconut-data');

        this.filePath = path.resolve(storageDir, 'thought-history.json');
        this.branchesFilePath = path.resolve(storageDir, 'branches.json');

        // Garantir que o diretório existe
        if (!fs.existsSync(storageDir)) {
            try {
                fs.mkdirSync(storageDir, { recursive: true });
                this.logger.info('Diretório de armazenamento criado', { storageDir });
            } catch (error: any) {
                this.logger.error('Falha ao criar diretório de armazenamento', { error, storageDir });
                throw new Error(`Falha ao criar diretório de armazenamento: ${error?.message || 'Erro desconhecido'}`);
            }
        }

        this.logger.debug('Diretório de armazenamento configurado', {
            storageDir,
            filePath: this.filePath,
            branchesFilePath: this.branchesFilePath
        });
    }

    /**
     * Inicializa o provedor de armazenamento
     */
    public async initialize(): Promise<void> {
        // Não fazer nada no initialize, pois os caminhos serão configurados quando necessário
        this.logger.debug('FileStorageProvider inicializado');
    }

    /**
     * Salva um pensamento no armazenamento
     * @param entry Entrada de pensamento a ser salva
     * @param projectPath Caminho opcional do projeto para salvar (sobrescreve config.projectPath)
     * @returns Informações sobre o arquivo salvo
     */
    public async saveThought(entry: ThoughtEntry, projectPath?: string): Promise<SavedFileInfo | null> {
        try {
            // Usar o projectPath fornecido ou o da configuração
            const effectiveProjectPath = projectPath || this.config.projectPath;

            if (!effectiveProjectPath) {
                throw new Error("Nenhum caminho foi fornecido para salvar os arquivos");
            }

            // Configurar caminhos se necessário
            if (!this.filePath) {
                this.setupPaths(effectiveProjectPath);
            }

            if (!this.filePath) {
                throw new Error("Falha ao configurar caminhos de armazenamento");
            }

            // Carregar histórico existente
            const history = await this.loadHistory();

            // Verificar se é uma revisão
            const index = history.findIndex(t =>
                t.thoughtNumber === entry.thoughtNumber && t.branchId === entry.branchId
            );

            if (index >= 0) {
                // Atualizar pensamento existente
                history[index] = entry;
            } else {
                // Adicionar novo pensamento
                history.push(entry);
            }

            // Salvar histórico atualizado
            await fs.promises.writeFile(this.filePath, JSON.stringify(history, null, 2));
            this.logger.debug('Pensamento salvo com sucesso', { entry });

            // Retornar informações sobre o arquivo salvo
            return {
                filePath: this.filePath,
                type: 'thought',
                timestamp: Date.now()
            };
        } catch (error: any) {
            this.logger.error('Erro ao salvar pensamento', { error, entry });
            throw new Error(`Falha ao salvar pensamento: ${error?.message || 'Erro desconhecido'}`);
        }
    }

    /**
     * Carrega o histórico completo de pensamentos
     */
    public async loadHistory(): Promise<ThoughtEntry[]> {
        try {
            if (!this.filePath) {
                throw new Error("Caminho do arquivo de histórico não configurado");
            }

            const data = await fs.promises.readFile(this.filePath, 'utf-8');
            const history: ThoughtEntry[] = JSON.parse(data);
            this.logger.debug('Histórico carregado com sucesso', { count: history.length });
            return history;
        } catch (error: any) {
            this.logger.error('Erro ao carregar histórico', { error });
            return [];
        }
    }

    /**
     * Salva informações sobre uma ramificação específica
     * @returns Informações sobre o arquivo salvo
     */
    public async saveBranch(branchId: string, thoughtNumbers: number[]): Promise<SavedFileInfo | null> {
        try {
            // Carregar branches existentes
            const branches = await this.loadBranches();

            // Atualizar ou adicionar a branch específica
            branches[branchId] = thoughtNumbers;

            // Salvar branches atualizadas
            const branchesFilePath = this.branchesFilePath || path.resolve(this.config.projectPath || '', 'branches.json');
            await fs.promises.writeFile(branchesFilePath, JSON.stringify(branches, null, 2));
            this.logger.debug('Ramificação salva com sucesso', { branchId, thoughtNumbers });

            // Retornar informações sobre o arquivo salvo
            return {
                filePath: branchesFilePath,
                type: 'branch',
                timestamp: Date.now()
            };
        } catch (error: any) {
            this.logger.error('Erro ao salvar ramificação', { error, branchId });
            throw new Error(`Falha ao salvar ramificação: ${error?.message || 'Erro desconhecido'}`);
        }
    }

    /**
     * Carrega informações sobre ramificações
     */
    public async loadBranches(): Promise<Record<string, Array<number>>> {
        try {
            if (!this.branchesFilePath) {
                throw new Error("Caminho do arquivo de branches não configurado");
            }

            const data = await fs.promises.readFile(this.branchesFilePath, 'utf-8');
            const branches = JSON.parse(data);
            this.logger.debug('Ramificações carregadas com sucesso', { branches });
            return branches;
        } catch (error: any) {
            this.logger.error('Erro ao carregar ramificações', { error });
            return { 'main': [] };
        }
    }

    /**
     * Limpa todo o armazenamento
     */
    public async clear(): Promise<void> {
        try {
            if (this.filePath && fs.existsSync(this.filePath)) {
                await fs.promises.unlink(this.filePath);
            }

            if (this.branchesFilePath && fs.existsSync(this.branchesFilePath)) {
                await fs.promises.unlink(this.branchesFilePath);
            }

            this.logger.info('Armazenamento limpo com sucesso');
        } catch (error: any) {
            this.logger.error('Erro ao limpar armazenamento', { error });
            throw new Error(`Falha ao limpar armazenamento: ${error?.message || 'Erro desconhecido'}`);
        }
    }

    /**
     * Exporta todos os dados armazenados
     */
    public async exportData(): Promise<StorageData> {
        const thoughts = await this.loadHistory();
        const branches = await this.loadBranches();

        return {
            thoughts,
            branches
        };
    }

    /**
     * Importa dados para o armazenamento
     */
    public async importData(data: StorageData): Promise<void> {
        try {
            // Garantir que os diretórios existam
            const storageDir = path.dirname(this.filePath || '');
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

            // Salvar pensamentos
            await fs.promises.writeFile(this.filePath || '', JSON.stringify(data.thoughts, null, 2));

            // Salvar branches
            await fs.promises.writeFile(this.branchesFilePath || '', JSON.stringify(data.branches, null, 2));

            this.logger.info('Dados importados com sucesso', {
                thoughtCount: data.thoughts.length,
                branchCount: Object.keys(data.branches).length
            });
        } catch (error: any) {
            this.logger.error('Erro ao importar dados', { error });
            throw new Error(`Falha ao importar dados: ${error?.message || 'Erro desconhecido'}`);
        }
    }
}

/**
 * Implementação de armazenamento em memória
 */
export class MemoryStorageProvider implements StorageProvider {
    private thoughts: ThoughtEntry[] = [];
    private branches: Record<string, Array<number>> = { 'main': [] };
    private logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Inicializa o provedor de armazenamento
     */
    public async initialize(): Promise<void> {
        this.logger.debug('MemoryStorageProvider inicializado');
    }

    /**
     * Guarda um pensamento em memória
     * @returns Informações sobre o pensamento guardado
     */
    public async saveThought(entry: ThoughtEntry): Promise<SavedFileInfo | null> {
        try {
            // Verificar se é uma revisão
            const index = this.thoughts.findIndex(t =>
                t.thoughtNumber === entry.thoughtNumber && t.branchId === entry.branchId
            );

            if (index >= 0) {
                // Atualizar pensamento existente
                this.thoughts[index] = entry;
            } else {
                // Adicionar novo pensamento
                this.thoughts.push(entry);
            }

            this.logger.debug('Pensamento guardado em memória', { entry });

            // Retornar informações sobre o pensamento guardado
            return {
                filePath: 'memory://thought',
                type: 'thought',
                timestamp: Date.now()
            };
        } catch (error: any) {
            this.logger.error('Erro ao guardar pensamento em memória', { error, entry });
            return null;
        }
    }

    /**
     * Carrega o histórico completo de pensamentos da memória
     */
    public async loadHistory(): Promise<ThoughtEntry[]> {
        return [...this.thoughts];
    }

    /**
     * Guarda informações sobre uma ramificação específica
     * @returns Informações sobre a ramificação guardada
     */
    public async saveBranch(branchId: string, thoughtNumbers: number[]): Promise<SavedFileInfo | null> {
        try {
            // Atualizar ou adicionar a branch específica
            this.branches[branchId] = thoughtNumbers;

            this.logger.debug('Ramificação guardada em memória', { branchId, thoughtNumbers });

            // Retornar informações sobre a ramificação guardada
            return {
                filePath: 'memory://branch',
                type: 'branch',
                timestamp: Date.now()
            };
        } catch (error: any) {
            this.logger.error('Erro ao guardar ramificação em memória', { error, branchId });
            return null;
        }
    }

    /**
     * Carrega informações sobre ramificações da memória
     */
    public async loadBranches(): Promise<Record<string, Array<number>>> {
        return { ...this.branches };
    }

    /**
     * Limpa toda a memória
     */
    public async clear(): Promise<void> {
        this.thoughts = [];
        this.branches = { 'main': [] };
        this.logger.debug('Memória limpa');
    }

    /**
     * Exporta todos os dados da memória
     */
    public async exportData(): Promise<StorageData> {
        return {
            thoughts: [...this.thoughts],
            branches: { ...this.branches }
        };
    }

    /**
     * Importa dados para a memória
     */
    public async importData(data: StorageData): Promise<void> {
        this.thoughts = [...data.thoughts];
        this.branches = { ...data.branches };
        this.logger.debug('Dados importados para a memória', {
            thoughtCount: this.thoughts.length,
            branchCount: Object.keys(this.branches).length
        });
    }
}

/**
 * Fábrica para criar provedores de armazenamento
 */
export class StorageFactory {
    public static createProvider(config: CoConuTConfig): StorageProvider {
        // Verificar se estamos usando persistência
        if (config.persistenceEnabled) {
            // Quando persistência está habilitada, verificar se temos um caminho de projeto
            if (!config.projectPath) {
                // Se não houver caminho disponível, lançar erro
                throw new Error("Nenhum caminho foi fornecido para salvar os arquivos");
            }

            // Se temos um caminho válido, usar o FileStorageProvider
            return new FileStorageProvider(config);
        } else {
            // Se persistência não estiver habilitada, usar armazenamento em memória
            return new MemoryStorageProvider();
        }
    }
} 