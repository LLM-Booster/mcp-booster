/**
 * Configuração do Servidor MCP para CoConuT e CoConuT_Storage
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
    autoRedirectOnError?: boolean;  // Controla se deve redirecionar automaticamente para o site em caso de erro
}

/**
 * Interface para configurações do CoConuT
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
        version: "0.7.4",
        transport: "stdio",
        protocolVersion: "0.1.0"
    },

    // Configurações de API
    api: {
        apiKey: undefined, // Será configurado via parâmetros ou variáveis de ambiente
        autoRedirectOnError: true  // Por padrão, redireciona automaticamente para o site em caso de erro
    },

    // Configurações do CoConuT
    coconut: {
        // Configurações mantidas para uso pelo CoConuT_Storage
        persistenceEnabled: true,
        maxHistorySize: 1000,

        // Estas configurações são mantidas por compatibilidade,
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
 * @param newConfig Configuração parcial com valores a serem atualizados
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
 * @returns A configuração atual
 */
export function getConfig(): Config {
    return config;
}

/**
 * Configura a API key
 * @param apiKey API key a ser configurada
 */
export function setApiKey(apiKey: string): void {
    config.api.apiKey = apiKey;
}

/**
 * Obtém a API key atual
 * @returns A API key atual ou undefined se não estiver configurada
 */
export function getApiKey(): string | undefined {
    return config.api.apiKey;
} 