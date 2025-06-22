/**
 * Sistema de cache para resultados de similaridade
 * Melhora o desempenho evitando recálculos de similaridade entre textos
 */

/**
 * Chave para o cache de similaridade
 */
interface SimilarityCacheKey {
    text1: string;
    text2: string;
    algorithm: string;
}

/**
 * Entrada do cache
 */
interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
}

/**
 * Classe de cache genérico com limite de tamanho e expiração
 */
export class LRUCache<T> {
    private cache: Map<string, CacheEntry<T>>;
    private maxSize: number;
    private ttl: number; // Tempo de vida em ms (0 = sem expiração)

    constructor(maxSize: number = 1000, ttl: number = 0) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    /**
     * Gera uma chave de cache a partir de um objeto
     */
    private generateKey(obj: any): string {
        return JSON.stringify(obj);
    }

    /**
     * Verifica se uma entrada expirou
     */
    private isExpired(entry: CacheEntry<T>): boolean {
        if (this.ttl === 0) return false;
        const now = Date.now();
        return now - entry.timestamp > this.ttl;
    }

    /**
     * Obtém um valor do cache
     */
    get(key: any): T | undefined {
        const cacheKey = this.generateKey(key);
        const entry = this.cache.get(cacheKey);

        if (!entry) return undefined;

        // Verificar expiração
        if (this.isExpired(entry)) {
            this.cache.delete(cacheKey);
            return undefined;
        }

        // Atualizar timestamp para LRU
        entry.timestamp = Date.now();
        return entry.value;
    }

    /**
     * Define um valor no cache
     */
    set(key: any, value: T): void {
        const cacheKey = this.generateKey(key);

        // Verificar se já existe para atualizar
        if (this.cache.has(cacheKey)) {
            this.cache.set(cacheKey, {
                key: cacheKey,
                value,
                timestamp: Date.now()
            });
            return;
        }

        // Verificar tamanho do cache e remover o item mais antigo se necessário
        if (this.cache.size >= this.maxSize) {
            let oldest: CacheEntry<T> | null = null;
            let oldestKey = '';

            for (const [k, entry] of this.cache.entries()) {
                if (!oldest || entry.timestamp < oldest.timestamp) {
                    oldest = entry;
                    oldestKey = k;
                }
            }

            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        // Adicionar nova entrada
        this.cache.set(cacheKey, {
            key: cacheKey,
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Remove um valor do cache
     */
    delete(key: any): boolean {
        const cacheKey = this.generateKey(key);
        return this.cache.delete(cacheKey);
    }

    /**
     * Limpa o cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Retorna o tamanho atual do cache
     */
    size(): number {
        return this.cache.size;
    }
}

/**
 * Cache específico para resultados de similaridade
 */
export class SimilarityCache {
    private cache: LRUCache<number>;

    constructor(maxSize: number = 1000) {
        this.cache = new LRUCache<number>(maxSize);
    }

    /**
     * Obtém um valor de similaridade do cache
     */
    getSimilarity(text1: string, text2: string, algorithm: string): number | undefined {
        const key: SimilarityCacheKey = { text1, text2, algorithm };
        return this.cache.get(key);
    }

    /**
     * Armazena um valor de similaridade no cache
     */
    setSimilarity(text1: string, text2: string, algorithm: string, similarity: number): void {
        const key: SimilarityCacheKey = { text1, text2, algorithm };
        this.cache.set(key, similarity);
    }

    /**
     * Limpa o cache de similaridade
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Retorna o tamanho atual do cache
     */
    size(): number {
        return this.cache.size();
    }
}

/**
 * Utilitários para manipulação de paths
 */
export class PathUtils {
    /**
     * Decodifica um caminho que pode estar URL-encoded
     * Resolve o problema do Windows onde paths vem como /c%3A/... em vez de /c:/...
     * @param path Caminho que pode estar URL-encoded
     * @returns Caminho decodificado
     */
    static decodePath(path: string): string {
        if (!path || typeof path !== 'string') {
            return path;
        }

        try {
            // Verificar se o path parece estar URL-encoded (contém %)
            if (path.includes('%')) {
                // Decodificar usando decodeURIComponent
                const decoded = decodeURIComponent(path);

                // Log para debug (pode ser removido em produção)
                if (decoded !== path) {
                    console.debug(`PathUtils: Decoded URL-encoded path: ${path} -> ${decoded}`);
                }

                return decoded;
            }

            // Se não contém %, retornar como está
            return path;
        } catch (error) {
            // Se falhar na decodificação, retornar o path original
            console.warn(`PathUtils: Failed to decode path "${path}":`, error);
            return path;
        }
    }

    /**
     * Normaliza um caminho removendo barras duplas e resolvendo relativos
     * Melhorado para Windows com tratamento de barras backward, caminhos WSL/Unix e resolução adequada
     * @param path Caminho a ser normalizado
     * @returns Caminho normalizado e resolvido
     */
    static normalizePath(path: string): string {
        if (!path || typeof path !== 'string') {
            return path;
        }

        try {
            // Primeiro decodificar se necessário
            let decoded = this.decodePath(path);

            // Importar path module para normalização adequada
            const nodePath = require('path');

            // No Windows, tratar caminhos especiais
            if (process.platform === 'win32') {
                // Detectar e converter caminhos WSL/Unix no formato /c/... para C:\...
                const wslPathMatch = decoded.match(/^\/([a-zA-Z])(\/.*)?$/);
                if (wslPathMatch) {
                    // Converter /c/path para C:\path
                    const driveLetter = wslPathMatch[1].toUpperCase();
                    const restOfPath = wslPathMatch[2] || '';
                    decoded = `${driveLetter}:${restOfPath.replace(/\//g, '\\')}`;
                    
                    if (process.env.DEBUG) {
                        console.debug(`PathUtils: Converted WSL path: ${path} -> ${decoded}`);
                    }
                }
                // Se o caminho contém dois pontos (drive letter já formatado), garantir formato Windows
                else if (decoded.match(/^\/[a-zA-Z]:/)) {
                    // Converter /c:/ para c:\
                    decoded = decoded.substring(1);
                }
            }

            // Usar path.resolve para normalização completa e resolução de relativos
            const resolved = nodePath.resolve(decoded);

            // Log para debug
            if (process.env.DEBUG && resolved !== path) {
                console.debug(`PathUtils: Normalized path: ${path} -> ${resolved}`);
            }

            return resolved;

        } catch (error) {
            // Se falhar na normalização, tentar normalização básica
            console.warn(`PathUtils: Failed to normalize path "${path}":`, error);
            
            // Fallback: normalização básica com tratamento WSL
            let decoded = this.decodePath(path);
            
            // Fallback para Windows com WSL
            if (process.platform === 'win32') {
                const wslPathMatch = decoded.match(/^\/([a-zA-Z])(\/.*)?$/);
                if (wslPathMatch) {
                    const driveLetter = wslPathMatch[1].toUpperCase();
                    const restOfPath = wslPathMatch[2] || '';
                    return `${driveLetter}:${restOfPath.replace(/\//g, '\\')}`;
                }
            }
            
            return decoded
                .replace(/\/+/g, '/') // Substituir múltiplas barras por uma
                .replace(/\/$/, '') // Remover barra final
                .trim();
        }
    }

    /**
     * Verifica se um diretório pode ser criado/escrito
     * @param dirPath Caminho do diretório
     * @returns true se pode escrever, false caso contrário
     */
    static canWriteToDirectory(dirPath: string): boolean {
        try {
            const fs = require('fs');
            const nodePath = require('path');

            // Se o diretório não existe, verificar se podemos criar
            if (!fs.existsSync(dirPath)) {
                // Verificar se podemos criar o diretório pai
                const parentDir = nodePath.dirname(dirPath);
                if (!fs.existsSync(parentDir)) {
                    return this.canWriteToDirectory(parentDir);
                }
                
                // Tentar verificar permissões no diretório pai
                try {
                    fs.accessSync(parentDir, fs.constants.W_OK);
                    return true;
                } catch {
                    return false;
                }
            }

            // Se existe, verificar se podemos escrever
            try {
                fs.accessSync(dirPath, fs.constants.W_OK);
                return true;
            } catch {
                return false;
            }

        } catch (error) {
            console.warn(`PathUtils: Error checking write permissions for "${dirPath}":`, error);
            return false;
        }
    }

    /**
     * Cria um diretório de forma segura com verificações de permissão
     * @param dirPath Caminho do diretório a ser criado
     * @returns Resultado da operação
     */
    static safeCreateDirectory(dirPath: string): { success: boolean; error?: string } {
        try {
            const fs = require('fs');

            // Verificar se já existe
            if (fs.existsSync(dirPath)) {
                // Verificar se é um diretório e se podemos escrever
                const stats = fs.statSync(dirPath);
                if (!stats.isDirectory()) {
                    return { success: false, error: `Path exists but is not a directory: ${dirPath}` };
                }
                
                if (!this.canWriteToDirectory(dirPath)) {
                    return { success: false, error: `No write permission for directory: ${dirPath}` };
                }
                
                return { success: true };
            }

            // Verificar se podemos criar
            if (!this.canWriteToDirectory(dirPath)) {
                return { success: false, error: `No permission to create directory: ${dirPath}` };
            }

            // Criar o diretório
            fs.mkdirSync(dirPath, { recursive: true });
            
            // Verificar se foi criado com sucesso
            if (!fs.existsSync(dirPath)) {
                return { success: false, error: `Directory creation failed: ${dirPath}` };
            }

            return { success: true };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Error creating directory "${dirPath}": ${errorMessage}` };
        }
    }
} 