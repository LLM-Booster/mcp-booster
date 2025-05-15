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