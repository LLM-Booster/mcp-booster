/**
 * Sistema de log para o serviço CoConuT
 * Fornece logs formatados com diferentes níveis e timestamps
 */

/**
 * Interface para o sistema de logs
 */
export interface ILogger {
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
}

/**
 * Níveis de log
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * Opções de configuração do logger
 */
export interface LoggerOptions {
    minLevel?: LogLevel;
    enableConsole?: boolean;
    includeTimestamp?: boolean;
    logFilePath?: string;
}

/**
 * Implementação do sistema de logs
 */
export class Logger implements ILogger {
    private static instance: Logger;
    private minLevel: LogLevel;
    private enableConsole: boolean;
    private includeTimestamp: boolean;
    private logFilePath?: string;
    private fs: any;

    /**
     * Construtor privado para implementação Singleton
     */
    private constructor(options: LoggerOptions = {}) {
        this.minLevel = options.minLevel || LogLevel.INFO;
        this.enableConsole = options.enableConsole !== false;
        this.includeTimestamp = options.includeTimestamp !== false;
        this.logFilePath = options.logFilePath;

        // Carregar fs apenas se necessário
        if (this.logFilePath) {
            try {
                this.fs = require('fs');
            } catch {
                console.warn('Módulo fs não disponível. Logs serão enviados apenas para o console.');
                this.fs = null;
            }
        }
    }

    /**
     * Obtém a instância singleton do logger
     */
    public static getInstance(options?: LoggerOptions): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(options);
        } else if (options) {
            // Atualizar configurações existentes
            const instance = Logger.instance;
            instance.minLevel = options.minLevel !== undefined ? options.minLevel : instance.minLevel;
            instance.enableConsole = options.enableConsole !== undefined ? options.enableConsole : instance.enableConsole;
            instance.includeTimestamp = options.includeTimestamp !== undefined ? options.includeTimestamp : instance.includeTimestamp;

            if (options.logFilePath !== undefined) {
                instance.logFilePath = options.logFilePath;
                if (instance.logFilePath && !instance.fs) {
                    try {
                        instance.fs = require('fs');
                    } catch {
                        console.warn('Módulo fs não disponível. Logs serão enviados apenas para o console.');
                        instance.fs = null;
                    }
                }
            }
        }
        return Logger.instance;
    }

    /**
     * Obtém o nível de log numérico a partir do nome
     */
    public static getLevelFromName(levelName: string): LogLevel {
        switch (levelName.toLowerCase()) {
            case 'debug': return LogLevel.DEBUG;
            case 'info': return LogLevel.INFO;
            case 'warn': return LogLevel.WARN;
            case 'error': return LogLevel.ERROR;
            default: return LogLevel.INFO;
        }
    }

    /**
     * Formatação base de mensagens de log
     */
    private formatMessage(level: string, message: string, meta?: any): string {
        const timestamp = this.includeTimestamp ? new Date().toISOString() + ' - ' : '';
        const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
        return `${timestamp}[${level.toUpperCase()}] ${message}${metaStr}`;
    }

    /**
     * Escreve um log no nível DEBUG
     */
    public debug(message: string, meta?: any): void {
        if (this.minLevel <= LogLevel.DEBUG) {
            const formattedMessage = this.formatMessage('debug', message, meta);
            this.writeLog(formattedMessage);
        }
    }

    /**
     * Escreve um log no nível INFO
     */
    public info(message: string, meta?: any): void {
        if (this.minLevel <= LogLevel.INFO) {
            const formattedMessage = this.formatMessage('info', message, meta);
            this.writeLog(formattedMessage);
        }
    }

    /**
     * Escreve um log no nível WARN
     */
    public warn(message: string, meta?: any): void {
        if (this.minLevel <= LogLevel.WARN) {
            const formattedMessage = this.formatMessage('warn', message, meta);
            this.writeLog(formattedMessage);
        }
    }

    /**
     * Escreve um log no nível ERROR
     */
    public error(message: string, meta?: any): void {
        if (this.minLevel <= LogLevel.ERROR) {
            const formattedMessage = this.formatMessage('error', message, meta);
            this.writeLog(formattedMessage);
        }
    }

    /**
     * Escreve o log no destino adequado (console e/ou arquivo)
     */
    private writeLog(formattedMessage: string): void {
        if (this.enableConsole) {
            console.log(formattedMessage);
        }

        if (this.logFilePath && this.fs) {
            try {
                this.fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
            } catch (err) {
                console.error('Erro ao escrever no arquivo de log:', err);
            }
        }
    }
} 