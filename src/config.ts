/**
 * Configuração do Servidor MCP
 */

/**
 * Interface para configurações do servidor MCP
 */
export interface ServerConfig {
    name: string;
    version: string;
    transport: string;
    protocolVersion: string;
}

/**
 * Interface para configurações de API
 */
export interface ApiConfig {
    apiKey?: string;
}

/**
 * Interface para configurações
 */
export interface CoConuTConfig {
    persistenceEnabled: boolean;
    maxHistorySize: number;
    cycleDetectionThreshold: number;
    similarityAlgorithm: 'levenshtein' | 'jaccard' | 'cosine';
    maxBranches: number;
    reflectionInterval: number;
    autoAnalyze: boolean;
}

/**
 * Interface para configurações de logging
 */
export interface LoggingConfig {
    minLevel: string;
    enableConsole: boolean;
    includeTimestamp: boolean;
    logFilePath?: string;
}

/**
 * Interface para configuração completa do sistema
 */
export interface Config {
    server: ServerConfig;
    api: ApiConfig;
    coconut: CoConuTConfig;
    logging: LoggingConfig;
}

/**
 * Configuração padrão do sistema
 */
export const defaultConfig: Config = {
    // Configurações do servidor MCP
    server: {
        name: "MCP-Booster",
        version: "1.0.0",
        transport: "stdio",
        protocolVersion: "0.1.0"
    },

    // Configurações de API
    api: {
        apiKey: undefined // Será configurado via parâmetros ou variáveis de ambiente
    },

    // Configurações
    coconut: {
        persistenceEnabled: true,
        maxHistorySize: 1000,
        cycleDetectionThreshold: 0.8,
        similarityAlgorithm: 'levenshtein',
        maxBranches: 10,
        reflectionInterval: 5,
        autoAnalyze: true
    },

    // Configuração de logging
    logging: {
        minLevel: "info",
        enableConsole: true,
        includeTimestamp: true,
        logFilePath: undefined // Logs apenas no console, sem salvar em arquivo
    }
};

/**
 * Configuração atual do sistema (começa com os valores padrão)
 */
export let config: Config = { ...defaultConfig };

/**
 * Atualiza a configuração do sistema com novos valores
 */
export function updateConfig(newConfig: Partial<Config>): void {
    // Mesclar configurações de servidor
    if (newConfig.server) {
        config.server = { ...config.server, ...newConfig.server };
    }

    // Mesclar configurações de API
    if (newConfig.api) {
        config.api = { ...config.api, ...newConfig.api };
    }

    // Mesclar configurações do CoConuT
    if (newConfig.coconut) {
        config.coconut = { ...config.coconut, ...newConfig.coconut };
    }

    // Mesclar configurações de logging
    if (newConfig.logging) {
        config.logging = { ...config.logging, ...newConfig.logging };
    }
}

/**
 * Obtém a configuração atual do sistema
 */
export function getConfig(): Config {
    return config;
}

/**
 * Configura a API key
 */
export function setApiKey(apiKey: string): void {
    config.api.apiKey = apiKey;
}

/**
 * Obtém a API key atual
 */
export function getApiKey(): string | undefined {
    return config.api.apiKey;
} 