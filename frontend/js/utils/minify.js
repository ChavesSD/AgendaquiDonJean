/**
 * Sistema de Minificação e Otimização para Produção
 * Este arquivo contém funções para otimizar o código em produção
 */

class MinificationUtils {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost';
    }

    // Minificar CSS inline
    minifyCSS(css) {
        if (!this.isProduction) return css;
        
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentários
            .replace(/\s+/g, ' ') // Remover espaços extras
            .replace(/;\s*}/g, '}') // Remover ponto e vírgula antes de }
            .replace(/,\s+/g, ',') // Remover espaços após vírgulas
            .replace(/:\s+/g, ':') // Remover espaços após dois pontos
            .replace(/{\s+/g, '{') // Remover espaços após {
            .replace(/;\s+/g, ';') // Remover espaços após ;
            .trim();
    }

    // Minificar JavaScript inline
    minifyJS(js) {
        if (!this.isProduction) return js;
        
        return js
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentários de bloco
            .replace(/\/\/.*$/gm, '') // Remover comentários de linha
            .replace(/\s+/g, ' ') // Remover espaços extras
            .replace(/;\s*}/g, '}') // Remover ponto e vírgula antes de }
            .replace(/,\s+/g, ',') // Remover espaços após vírgulas
            .replace(/{\s+/g, '{') // Remover espaços após {
            .replace(/;\s+/g, ';') // Remover espaços após ;
            .trim();
    }

    // Otimizar imagens (lazy loading)
    optimizeImages() {
        if (!this.isProduction) return;

        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // Comprimir dados para localStorage
    compressData(data) {
        if (!this.isProduction) return data;
        
        try {
            const jsonString = JSON.stringify(data);
            // Implementação básica de compressão
            return btoa(jsonString);
        } catch (error) {
            console.warn('Erro ao comprimir dados:', error);
            return data;
        }
    }

    // Descomprimir dados do localStorage
    decompressData(compressedData) {
        if (!this.isProduction) return compressedData;
        
        try {
            const jsonString = atob(compressedData);
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Erro ao descomprimir dados:', error);
            return compressedData;
        }
    }

    // Otimizar requisições (debounce)
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Otimizar requisições (throttle)
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Preload de recursos críticos
    preloadCriticalResources() {
        if (!this.isProduction) return;

        const criticalResources = [
            '/assets/Logo.png',
            '/assets/Favicon.png',
            '/styles/variables.css',
            '/styles/dashboard.css'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.endsWith('.css') ? 'style' : 'image';
            document.head.appendChild(link);
        });
    }

    // Otimizar cache do navegador
    optimizeCache() {
        if (!this.isProduction) return;

        // Configurar cache para recursos estáticos
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrado:', registration);
                })
                .catch(error => {
                    console.warn('Erro ao registrar Service Worker:', error);
                });
        }
    }

    // Limpar logs desnecessários em produção
    cleanProductionLogs() {
        if (!this.isProduction) return;

        // Sobrescrever console.log em produção
        const originalLog = console.log;
        console.log = function(...args) {
            // Apenas logs críticos em produção
            if (args[0] && typeof args[0] === 'string' && args[0].includes('🚨')) {
                originalLog.apply(console, args);
            }
        };

        // Limpar console após 5 segundos
        setTimeout(() => {
            console.clear();
        }, 5000);
    }
}

// Instância global
window.minificationUtils = new MinificationUtils();

// Inicializar otimizações quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    window.minificationUtils.optimizeImages();
    window.minificationUtils.preloadCriticalResources();
    window.minificationUtils.optimizeCache();
    window.minificationUtils.cleanProductionLogs();
});

// Exportar para uso em outros módulos
window.MinificationUtils = MinificationUtils;
