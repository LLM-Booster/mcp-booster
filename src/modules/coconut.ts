/**
 * Módulo simplificado do CoConuT para operações de armazenamento
 * Mantém apenas a funcionalidade de armazenamento necessária para o serviço CoConuT_Storage
 */

import {
    CoConuTConfig,
    ThoughtEntry,
    DEFAULT_CONFIG,
    SavedFileInfo,
    CoConuTStorageParams,
} from './types';
import { Logger } from './logger';
import { MemoryStorageProvider } from './storage';
import { CoConuT_Storage } from './coconut-storage';

/**
 * Classe simplificada para operações de armazenamento do CoConuT
 */
export class CoConuTService {
    private config: CoConuTConfig;
    private logger: Logger;
    private storageProvider: MemoryStorageProvider;
    private lastSavedFiles: SavedFileInfo[] = [];
    private temporaryThoughts: ThoughtEntry[] = [];
    private projectPath?: string;

    /**
     * Construtor
     */
    constructor(config: Partial<CoConuTConfig> = {}) {
        // Mesclar configuração padrão com a fornecida
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Configurar logger
        this.logger = Logger.getInstance();

        // Inicializar armazenamento em memória
        this.storageProvider = new MemoryStorageProvider();
    }

    /**
     * Salva pensamentos e conclusão no armazenamento persistente
     * Este método é chamado pela ferramenta CoConuT_Storage
     */
    public async saveWithStorage(
        projectPath: string,
        whyChange: string,
        whatChange: string,
        additionalParams?: Partial<CoConuTStorageParams>
    ): Promise<SavedFileInfo[]> {
        try {
            // Configurar caminho do projeto para uso futuro
            this.projectPath = projectPath;

            // Criar instância de storage
            const storage = new CoConuT_Storage(this.storageProvider, {
                ...this.config,
                projectPath
            });

            // Usar pensamentos temporários ou um array vazio
            const thoughts = this.temporaryThoughts;

            // Processar conclusão
            this.lastSavedFiles = await storage.processConclusion(
                thoughts,
                projectPath,
                whyChange,
                whatChange,
                additionalParams
            );

            return this.lastSavedFiles;
        } catch (error: any) {
            this.logger.error('Error in saveWithStorage', { error });
            throw new Error(`Failed to save with storage: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Configura o caminho do projeto para uso futuro
     */
    public setProjectPath(projectPath: string): void {
        this.projectPath = projectPath;
    }
} 