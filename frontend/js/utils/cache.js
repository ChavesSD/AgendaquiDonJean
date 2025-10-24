// ==================== SISTEMA DE CACHE ====================

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos
        this.maxSize = 100; // Máximo de 100 itens no cache
    }

    // Gerar chave de cache
    generateKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((result, key) => {
                result[key] = params[key];
                return result;
            }, {});
        
        return `${endpoint}:${JSON.stringify(sortedParams)}`;
    }

    // Verificar se item está no cache e não expirou
    isValid(cacheItem) {
        if (!cacheItem) return false;
        return Date.now() < cacheItem.expiresAt;
    }

    // Obter item do cache
    get(endpoint, params = {}) {
        const key = this.generateKey(endpoint, params);
        const cacheItem = this.cache.get(key);
        
        if (this.isValid(cacheItem)) {
            console.log(`📦 Cache hit: ${key}`);
            return cacheItem.data;
        }
        
        if (cacheItem) {
            this.cache.delete(key);
            console.log(`📦 Cache expired: ${key}`);
        }
        
        return null;
    }

    // Armazenar item no cache
    set(endpoint, params = {}, data, ttl = this.defaultTTL) {
        const key = this.generateKey(endpoint, params);
        
        // Limpar cache se estiver muito grande
        if (this.cache.size >= this.maxSize) {
            this.cleanup();
        }
        
        const cacheItem = {
            data: data,
            expiresAt: Date.now() + ttl,
            createdAt: Date.now()
        };
        
        this.cache.set(key, cacheItem);
        console.log(`📦 Cache stored: ${key} (TTL: ${ttl}ms)`);
    }

    // Limpar cache expirado
    cleanup() {
        const now = Date.now();
        let removedCount = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now >= item.expiresAt) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        
        // Se ainda estiver muito grande, remover os mais antigos
        if (this.cache.size >= this.maxSize) {
            const sortedEntries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].createdAt - b[1].createdAt);
            
            const toRemove = sortedEntries.slice(0, this.cache.size - this.maxSize + 10);
            toRemove.forEach(([key]) => {
                this.cache.delete(key);
                removedCount++;
            });
        }
        
        if (removedCount > 0) {
            console.log(`📦 Cache cleanup: removed ${removedCount} items`);
        }
    }

    // Limpar cache específico
    clear(endpoint, params = {}) {
        const key = this.generateKey(endpoint, params);
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`📦 Cache cleared: ${key}`);
        }
        return deleted;
    }

    // Limpar todo o cache
    clearAll() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`📦 Cache cleared: ${size} items removed`);
    }

    // Obter estatísticas do cache
    getStats() {
        const now = Date.now();
        let validItems = 0;
        let expiredItems = 0;
        
        for (const item of this.cache.values()) {
            if (this.isValid(item)) {
                validItems++;
            } else {
                expiredItems++;
            }
        }
        
        return {
            totalItems: this.cache.size,
            validItems,
            expiredItems,
            hitRate: this.calculateHitRate()
        };
    }

    // Calcular taxa de acerto (simplificado)
    calculateHitRate() {
        // Implementação básica - em produção seria mais sofisticada
        return this.cache.size > 0 ? Math.min(0.8, this.cache.size / 10) : 0;
    }
}

// Instância global
window.cacheManager = new CacheManager();

// Wrapper para fetch com cache
window.cachedFetch = async function(endpoint, options = {}, cacheOptions = {}) {
    const {
        ttl = 5 * 60 * 1000, // 5 minutos
        useCache = true,
        params = {}
    } = cacheOptions;

    // Tentar obter do cache primeiro
    if (useCache && options.method === 'GET') {
        const cachedData = window.cacheManager.get(endpoint, params);
        if (cachedData) {
            return {
                ok: true,
                json: () => Promise.resolve(cachedData),
                fromCache: true
            };
        }
    }

    // Fazer requisição real
    try {
        const response = await fetch(endpoint, options);
        
        if (response.ok && options.method === 'GET') {
            const data = await response.json();
            
            // Armazenar no cache
            if (useCache) {
                window.cacheManager.set(endpoint, params, data, ttl);
            }
            
            return {
                ...response,
                json: () => Promise.resolve(data),
                fromCache: false
            };
        }
        
        return response;
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
};

// Configurações de cache por endpoint
const CACHE_CONFIG = {
    '/api/professionals': { ttl: 10 * 60 * 1000 }, // 10 minutos
    '/api/services': { ttl: 10 * 60 * 1000 }, // 10 minutos
    '/api/appointments': { ttl: 2 * 60 * 1000 }, // 2 minutos
    '/api/finance': { ttl: 1 * 60 * 1000 }, // 1 minuto
    '/api/commissions': { ttl: 2 * 60 * 1000 }, // 2 minutos
    '/api/dashboard': { ttl: 1 * 60 * 1000 }, // 1 minuto
};

// Função helper para obter configuração de cache
window.getCacheConfig = function(endpoint) {
    return CACHE_CONFIG[endpoint] || { ttl: 5 * 60 * 1000 };
};

// Função para invalidar cache relacionado
window.invalidateRelatedCache = function(endpoint) {
    const relatedEndpoints = {
        '/api/appointments': ['/api/dashboard', '/api/commissions'],
        '/api/finance': ['/api/dashboard'],
        '/api/professionals': ['/api/appointments', '/api/commissions'],
        '/api/services': ['/api/appointments', '/api/commissions']
    };
    
    const toInvalidate = relatedEndpoints[endpoint] || [];
    toInvalidate.forEach(relatedEndpoint => {
        // Limpar cache de endpoints relacionados
        for (const key of window.cacheManager.cache.keys()) {
            if (key.startsWith(relatedEndpoint)) {
                window.cacheManager.cache.delete(key);
            }
        }
    });
    
    console.log(`📦 Invalidated related cache for: ${endpoint}`);
};

// Auto cleanup a cada 5 minutos
setInterval(() => {
    window.cacheManager.cleanup();
}, 5 * 60 * 1000);
