import * as fs from 'fs';
import * as path from 'path';
import { PathUtils } from '../utils/cache';

/**
 * Shows support information when errors occur
 */
function showSupportInfo(): void {
    console.log('');
    console.log('🆘 Precisa de ajuda?');
    console.log('   Nossa equipe de suporte está pronta para ajudar!');
    console.log('   📧 Entre em contato: https://llmbooster.com/suporte');
    console.log('   ⏰ Horário de atendimento: Segunda a Sexta, 9h às 18h');
    console.log('');
}

export interface CursorRulesConfig {
    projectPath: string;
    systemPromptPath: string;
}

export interface CursorRulesResult {
    success: boolean;
    message: string;
    filePath?: string;
    error?: string;
    details?: {
        directoryCreated?: boolean;
        fileExists?: boolean;
        fileSize?: number;
        permissions?: string;
    };
}

/**
 * Cria cursor rules locais baseado no conteúdo do systemPrompt.md
 */
export async function createCursorRules(config: CursorRulesConfig): Promise<CursorRulesResult> {
    const debugMode = process.env.DEBUG === 'true';
    
    try {
        if (debugMode) {
            console.log('🔍 [DEBUG] Starting cursor rules creation...');
            console.log('🔍 [DEBUG] Config:', JSON.stringify(config, null, 2));
            console.log('🔍 [DEBUG] Platform:', process.platform);
        }

        // Decodificar e normalizar o projectPath para resolver problemas de URL encoding no Windows
        const normalizedProjectPath = PathUtils.normalizePath(config.projectPath);
        
        if (debugMode) {
            console.log('🔍 [DEBUG] Original path:', config.projectPath);
            console.log('🔍 [DEBUG] Normalized path:', normalizedProjectPath);
        }

        // Verificar se o systemPrompt.md existe antes de continuar
        if (!fs.existsSync(config.systemPromptPath)) {
            const error = `Arquivo systemPrompt.md não encontrado em: ${config.systemPromptPath}`;
            if (debugMode) {
                console.log('❌ [DEBUG] SystemPrompt file not found');
            }
            return {
                success: false,
                message: 'SystemPrompt.md não encontrado',
                error
            };
        }

        // Lê o conteúdo do systemPrompt.md
        const systemPromptContent = await readSystemPrompt(config.systemPromptPath);
        
        if (debugMode) {
            console.log('🔍 [DEBUG] SystemPrompt content length:', systemPromptContent.length);
        }

        // Determina o caminho de destino (sempre local)
        const targetPath = getLocalCursorRulesPath(normalizedProjectPath);
        
        if (debugMode) {
            console.log('🔍 [DEBUG] Target path:', targetPath);
        }

        // Cria o arquivo de cursor rules locais com verificações robustas
        const createResult = await createCursorRulesFile(targetPath, systemPromptContent);
        
        if (!createResult.success) {
            return {
                success: false,
                message: 'Erro ao criar cursor rules',
                error: createResult.error,
                filePath: targetPath
            };
        }

        // Verificar se o arquivo foi realmente criado e obter detalhes
        const verificationResult = await verifyCursorRulesFile(targetPath);
        
        if (debugMode) {
            console.log('🔍 [DEBUG] Verification result:', verificationResult);
        }

        return {
            success: true,
            message: 'Cursor rules locais criadas com sucesso',
            filePath: targetPath,
            details: verificationResult
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (debugMode) {
            console.log('❌ [DEBUG] Unexpected error:', errorMessage);
            console.log('❌ [DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        } else {
            console.error('❌ Erro crítico na criação das cursor rules:', errorMessage);
            showSupportInfo();
        }

        return {
            success: false,
            message: 'Erro inesperado ao criar cursor rules',
            error: errorMessage
        };
    }
}

/**
 * Lê o conteúdo do arquivo systemPrompt.md com verificação robusta
 */
async function readSystemPrompt(systemPromptPath: string): Promise<string> {
    const debugMode = process.env.DEBUG === 'true';
    
    try {
        if (!fs.existsSync(systemPromptPath)) {
            throw new Error(`Arquivo systemPrompt.md não encontrado em: ${systemPromptPath}`);
        }

        // Verificar se é um arquivo e se podemos lê-lo
        const stats = fs.statSync(systemPromptPath);
        if (!stats.isFile()) {
            throw new Error(`O caminho não aponta para um arquivo: ${systemPromptPath}`);
        }

        // Verificar permissões de leitura
        try {
            fs.accessSync(systemPromptPath, fs.constants.R_OK);
        } catch {
            throw new Error(`Sem permissão de leitura para: ${systemPromptPath}`);
        }

        const content = fs.readFileSync(systemPromptPath, 'utf-8');
        
        if (!content || content.trim().length === 0) {
            throw new Error(`Arquivo systemPrompt.md está vazio: ${systemPromptPath}`);
        }

        if (debugMode) {
            console.log('✅ [DEBUG] SystemPrompt read successfully, length:', content.length);
        }

        return content;
    } catch (error) {
        if (debugMode) {
            console.log('❌ [DEBUG] Error reading systemPrompt:', error);
        }
        throw error;
    }
}

/**
 * Obtém o caminho para cursor rules locais com criação segura de diretório
 */
function getLocalCursorRulesPath(projectPath: string): string {
    const debugMode = process.env.DEBUG === 'true';
    const rulesDir = path.join(projectPath, '.cursor', 'rules');

    if (debugMode) {
        console.log('🔍 [DEBUG] Rules directory path:', rulesDir);
    }

    // Usar a função segura para criar diretório
    const createResult = PathUtils.safeCreateDirectory(rulesDir);
    
    if (!createResult.success) {
        throw new Error(`Falha ao criar diretório .cursor/rules: ${createResult.error}`);
    }

    if (debugMode) {
        console.log('✅ [DEBUG] Rules directory ensured');
        
        // Listar arquivos existentes para debug
        try {
            const existingFiles = fs.readdirSync(rulesDir).filter(file => file !== 'llmbooster.mdc');
            if (existingFiles.length > 0) {
                console.log('🔍 [DEBUG] Existing files in rules directory:', existingFiles);
            }
        } catch (error) {
            console.log('⚠️ [DEBUG] Could not list existing files:', error);
        }
    }

    return path.join(rulesDir, 'llmbooster.mdc');
}

/**
 * Cria o arquivo de cursor rules no formato MDC com verificações robustas
 */
async function createCursorRulesFile(
    targetPath: string,
    systemPromptContent: string
): Promise<{ success: boolean; error?: string; details?: any }> {
    const debugMode = process.env.DEBUG === 'true';
    
    try {
        if (debugMode) {
            console.log('🔍 [DEBUG] Creating cursor rules file at:', targetPath);
        }

        // Verificar se o arquivo já existe
        const fileExists = fs.existsSync(targetPath);
        
        if (debugMode && fileExists) {
            console.log('🔍 [DEBUG] File already exists, will overwrite');
        }

        // Verificar permissões no diretório pai
        const dirPath = path.dirname(targetPath);
        if (!PathUtils.canWriteToDirectory(dirPath)) {
            return {
                success: false,
                error: `Sem permissão de escrita no diretório: ${dirPath}`
            };
        }

        // Formato MDC para cursor rules locais
        const mdcContent = createMDCContent(systemPromptContent);

        if (debugMode) {
            console.log('🔍 [DEBUG] MDC content length:', mdcContent.length);
        }

        // Escrever o arquivo
        fs.writeFileSync(targetPath, mdcContent, 'utf-8');

        // Verificar se foi escrito com sucesso
        if (!fs.existsSync(targetPath)) {
            return {
                success: false,
                error: `Arquivo não foi criado: ${targetPath}`
            };
        }

        // Verificar se o conteúdo foi escrito corretamente
        const writtenContent = fs.readFileSync(targetPath, 'utf-8');
        if (writtenContent !== mdcContent) {
            return {
                success: false,
                error: `Conteúdo do arquivo não confere com o esperado`
            };
        }

        if (debugMode) {
            console.log('✅ [DEBUG] File created and verified successfully');
        }

        return { success: true };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (debugMode) {
            console.log('❌ [DEBUG] Error creating file:', errorMessage);
        }

        return {
            success: false,
            error: `Erro ao escrever arquivo: ${errorMessage}`
        };
    }
}

/**
 * Verifica se o arquivo foi criado corretamente e retorna detalhes
 */
async function verifyCursorRulesFile(filePath: string): Promise<{
    fileExists: boolean;
    fileSize?: number;
    permissions?: string;
    isReadable?: boolean;
    isWritable?: boolean;
}> {
    try {
        if (!fs.existsSync(filePath)) {
            return { fileExists: false };
        }

        const stats = fs.statSync(filePath);
        
        // Verificar permissões
        let isReadable = false;
        let isWritable = false;
        
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
            isReadable = true;
        } catch {}
        
        try {
            fs.accessSync(filePath, fs.constants.W_OK);
            isWritable = true;
        } catch {}

        return {
            fileExists: true,
            fileSize: stats.size,
            permissions: `${isReadable ? 'R' : ''}${isWritable ? 'W' : ''}`,
            isReadable,
            isWritable
        };

    } catch (error) {
        return {
            fileExists: false
        };
    }
}

/**
 * Cria o conteúdo no formato MDC (Markdown with metadata)
 */
function createMDCContent(systemPromptContent: string): string {
    const metadata = {
        description: "LLM Booster - System Prompt Project Rules",
        alwaysApply: true
    };

    return `---
description: ${metadata.description}
alwaysApply: ${metadata.alwaysApply}
---

${systemPromptContent}
`;
}

/**
 * Verifica se cursor rules já existem
 */
export function cursorRulesExist(config: CursorRulesConfig): boolean {
    try {
        // Decodificar o projectPath para resolver problemas de URL encoding no Windows
        const normalizedProjectPath = PathUtils.normalizePath(config.projectPath);
        const targetPath = getLocalCursorRulesPath(normalizedProjectPath);
        return fs.existsSync(targetPath);
    } catch {
        return false;
    }
}

/**
 * Remove cursor rules existentes
 */
export async function removeCursorRules(config: CursorRulesConfig): Promise<CursorRulesResult> {
    const debugMode = process.env.DEBUG === 'true';
    
    try {
        // Decodificar o projectPath para resolver problemas de URL encoding no Windows
        const normalizedProjectPath = PathUtils.normalizePath(config.projectPath);
        const targetPath = getLocalCursorRulesPath(normalizedProjectPath);

        if (debugMode) {
            console.log('🔍 [DEBUG] Removing cursor rules at:', targetPath);
        }

        if (fs.existsSync(targetPath)) {
            // Verificar permissões antes de tentar remover
            try {
                fs.accessSync(targetPath, fs.constants.W_OK);
            } catch {
                return {
                    success: false,
                    message: 'Sem permissão para remover cursor rules',
                    error: `Sem permissão de escrita para: ${targetPath}`
                };
            }

            fs.unlinkSync(targetPath);
            
            // Verificar se foi removido
            if (fs.existsSync(targetPath)) {
                return {
                    success: false,
                    message: 'Falha ao remover cursor rules',
                    error: 'Arquivo ainda existe após tentativa de remoção'
                };
            }

            if (debugMode) {
                console.log('✅ [DEBUG] Cursor rules removed successfully');
            }
        }

        return {
            success: true,
            message: 'Cursor rules locais removidas com sucesso'
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (debugMode) {
            console.log('❌ [DEBUG] Error removing cursor rules:', errorMessage);
        } else {
            console.error('❌ Erro ao remover cursor rules:', errorMessage);
            showSupportInfo();
        }

        return {
            success: false,
            message: 'Erro ao remover cursor rules',
            error: errorMessage
        };
    }
} 