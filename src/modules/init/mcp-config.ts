import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface para definir a estrutura de um servidor MCP
 */
export interface McpServer {
    command: string;
    args: string[];
    env?: Record<string, string>;
}

/**
 * Interface para definir a estrutura completa do arquivo mcp.json
 */
export interface McpConfig {
    mcpServers: Record<string, McpServer>;
}

/**
 * Interface para resultado das operações de configuração
 */
export interface ConfigResult {
    success: boolean;
    message: string;
    configPath?: string;
    error?: string;
}

/**
 * Lê o arquivo mcp.json existente ou retorna configuração vazia
 */
export function readMcpConfig(configPath: string): McpConfig {
    const mcpJsonPath = path.join(configPath, 'mcp.json');

    try {
        if (fs.existsSync(mcpJsonPath)) {
            const content = fs.readFileSync(mcpJsonPath, 'utf8');
            const config = JSON.parse(content) as McpConfig;

            // Garante que mcpServers existe
            if (!config.mcpServers) {
                config.mcpServers = {};
            }

            return config;
        }
    } catch (error) {
        console.warn(`⚠️  Erro ao ler arquivo mcp.json existente: ${error}`);
    }

    // Retorna configuração vazia se arquivo não existe ou há erro
    return {
        mcpServers: {}
    };
}

/**
 * Cria a configuração do servidor MCP-Booster
 */
export function createMcpBoosterConfig(apiKey: string): McpServer {
    return {
        command: "mcp-booster",
        args: [
            "--api-key",
            apiKey
        ]
    };
}

/**
 * Mescla a configuração do MCP-Booster com configuração existente
 */
export function mergeMcpConfig(existingConfig: McpConfig, apiKey: string): McpConfig {
    const boosterConfig = createMcpBoosterConfig(apiKey);

    return {
        ...existingConfig,
        mcpServers: {
            ...existingConfig.mcpServers,
            "llm-booster": boosterConfig
        }
    };
}

/**
 * Escreve a configuração MCP no arquivo mcp.json
 */
export function writeMcpConfig(configPath: string, config: McpConfig): ConfigResult {
    const mcpJsonPath = path.join(configPath, 'mcp.json');

    try {
        // Cria o diretório se não existir
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(configPath, { recursive: true });
        }

        // Converte para JSON com formatação bonita
        const jsonContent = JSON.stringify(config, null, 2);

        // Escreve o arquivo
        fs.writeFileSync(mcpJsonPath, jsonContent, 'utf8');

        return {
            success: true,
            message: `✅ Configuração MCP instalada com sucesso em: ${mcpJsonPath}`,
            configPath: mcpJsonPath
        };

    } catch (error) {
        return {
            success: false,
            message: `❌ Erro ao escrever arquivo de configuração`,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Instala a configuração MCP-Booster no arquivo mcp.json
 */
export function installMcpBoosterConfig(configPath: string, apiKey: string): ConfigResult {
    try {
        // Lê configuração existente
        const existingConfig = readMcpConfig(configPath);

        // Verifica se já existe configuração do llm-booster
        const hasExistingBooster = existingConfig.mcpServers['llm-booster'];

        // Mescla com nova configuração
        const mergedConfig = mergeMcpConfig(existingConfig, apiKey);

        // Escreve arquivo atualizado
        const result = writeMcpConfig(configPath, mergedConfig);

        if (result.success) {
            if (hasExistingBooster) {
                result.message = `✅ Configuração llm-booster atualizada com sucesso em: ${result.configPath}`;
            } else {
                result.message = `✅ Configuração llm-booster adicionada com sucesso em: ${result.configPath}`;
            }
        }

        return result;

    } catch (error) {
        return {
            success: false,
            message: '❌ Erro ao instalar configuração MCP',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Valida se a estrutura do arquivo mcp.json está correta
 */
export function validateMcpConfig(config: any): boolean {
    try {
        // Verifica se tem a estrutura básica
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Verifica se tem mcpServers
        if (!config.mcpServers || typeof config.mcpServers !== 'object') {
            return false;
        }

        // Valida cada servidor
        for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
            const server = serverConfig as any;

            // Verifica se tem command
            if (!server.command || typeof server.command !== 'string') {
                console.warn(`⚠️  Servidor '${serverName}' não tem comando válido`);
                return false;
            }

            // Verifica se args é array (se existir)
            if (server.args && !Array.isArray(server.args)) {
                console.warn(`⚠️  Servidor '${serverName}' tem args inválido`);
                return false;
            }
        }

        return true;

    } catch (error) {
        console.warn('⚠️  Erro ao validar configuração MCP:', error);
        return false;
    }
}

/**
 * Faz backup do arquivo mcp.json existente
 */
export function backupMcpConfig(configPath: string): string | null {
    const mcpJsonPath = path.join(configPath, 'mcp.json');

    if (!fs.existsSync(mcpJsonPath)) {
        return null; // Não há arquivo para fazer backup
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(configPath, `mcp.json.backup.${timestamp}`);

        fs.copyFileSync(mcpJsonPath, backupPath);
        console.log(`📋 Backup criado: ${backupPath}`);

        return backupPath;

    } catch (error) {
        console.warn('⚠️  Erro ao criar backup:', error);
        return null;
    }
}

/**
 * Remove a configuração do MCP-Booster do arquivo mcp.json
 */
export function uninstallMcpBoosterConfig(configPath: string): ConfigResult {
    try {
        const existingConfig = readMcpConfig(configPath);

        if (!existingConfig.mcpServers['llm-booster']) {
            return {
                success: false,
                message: '⚠️  Configuração llm-booster não encontrada'
            };
        }

        // Remove a configuração
        delete existingConfig.mcpServers['llm-booster'];

        // Escreve arquivo atualizado
        return writeMcpConfig(configPath, existingConfig);

    } catch (error) {
        return {
            success: false,
            message: '❌ Erro ao remover configuração MCP',
            error: error instanceof Error ? error.message : String(error)
        };
    }
} 