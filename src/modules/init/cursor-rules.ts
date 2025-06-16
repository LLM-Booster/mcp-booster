import * as fs from 'fs';
import * as path from 'path';

export interface CursorRulesConfig {
    projectPath: string;
    systemPromptPath: string;
}

export interface CursorRulesResult {
    success: boolean;
    message: string;
    filePath?: string;
    error?: string;
}

/**
 * Cria cursor rules locais baseado no conteúdo do systemPrompt.md
 */
export async function createCursorRules(config: CursorRulesConfig): Promise<CursorRulesResult> {
    try {
        // Lê o conteúdo do systemPrompt.md
        const systemPromptContent = await readSystemPrompt(config.systemPromptPath);

        // Determina o caminho de destino (sempre local)
        const targetPath = getLocalCursorRulesPath(config.projectPath);

        // Cria o arquivo de cursor rules locais
        await createCursorRulesFile(targetPath, systemPromptContent);

        return {
            success: true,
            message: 'Cursor rules locais criadas com sucesso',
            filePath: targetPath
        };
    } catch (error) {
        return {
            success: false,
            message: 'Erro ao criar cursor rules',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Lê o conteúdo do arquivo systemPrompt.md
 */
async function readSystemPrompt(systemPromptPath: string): Promise<string> {
    if (!fs.existsSync(systemPromptPath)) {
        throw new Error(`Arquivo systemPrompt.md não encontrado em: ${systemPromptPath}`);
    }

    return fs.readFileSync(systemPromptPath, 'utf-8');
}

/**
 * Obtém o caminho para cursor rules locais
 */
function getLocalCursorRulesPath(projectPath: string): string {
    const rulesDir = path.join(projectPath, '.cursor', 'rules');

    // Garante que o diretório existe (preserva arquivos existentes)
    if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
        console.log(`📁 Diretório .cursor/rules criado`);
    } else {
        // Lista arquivos existentes (silencioso)
        const existingFiles = fs.readdirSync(rulesDir).filter(file => file !== 'llmbooster.mdc');
    }

    return path.join(rulesDir, 'llmbooster.mdc');
}

/**
 * Cria o arquivo de cursor rules no formato MDC
 */
async function createCursorRulesFile(
    targetPath: string,
    systemPromptContent: string
): Promise<void> {
    // Verifica se o arquivo já existe (silencioso)
    const fileExists = fs.existsSync(targetPath);

    // Formato MDC para cursor rules locais
    const mdcContent = createMDCContent(systemPromptContent);

    // Escreve o arquivo
    fs.writeFileSync(targetPath, mdcContent, 'utf-8');
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
        const targetPath = getLocalCursorRulesPath(config.projectPath);
        return fs.existsSync(targetPath);
    } catch {
        return false;
    }
}

/**
 * Remove cursor rules existentes
 */
export async function removeCursorRules(config: CursorRulesConfig): Promise<CursorRulesResult> {
    try {
        const targetPath = getLocalCursorRulesPath(config.projectPath);

        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        return {
            success: true,
            message: 'Cursor rules locais removidas com sucesso'
        };
    } catch (error) {
        return {
            success: false,
            message: 'Erro ao remover cursor rules',
            error: error instanceof Error ? error.message : String(error)
        };
    }
} 