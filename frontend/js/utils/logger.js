// ==================== SISTEMA DE LOGS ESTRUTURADOS ====================

class Logger {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost';
        this.logLevel = this.isProduction ? 'error' : 'info'; // Reduzir logs em produção
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.maxLogs = this.isProduction ? 50 : 200; // Limitar logs em produção
        this.logCount = 0;
    }

    // Verificar se deve logar
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    // Formatar timestamp
    getTimestamp() {
        return new Date().toISOString();
    }

    // Criar entrada de log estruturada
    createLogEntry(level, message, data = {}, context = {}) {
        return {
            timestamp: this.getTimestamp(),
            level: level.toUpperCase(),
            message,
            data,
            context: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                userId: this.getCurrentUserId(),
                sessionId: this.getSessionId(),
                ...context
            }
        };
    }

    // Obter ID do usuário atual
    getCurrentUserId() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            return userData.id || 'anonymous';
        } catch {
            return 'anonymous';
        }
    }

    // Obter ID da sessão
    getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // Log de erro
    error(message, data = {}, context = {}) {
        if (!this.shouldLog('error') || this.logCount >= this.maxLogs) return;

        const logEntry = this.createLogEntry('error', message, data, context);
        this.logCount++;
        
        if (this.isProduction) {
            this.sendToServer(logEntry);
        } else {
            console.error(`🚨 ${message}`, data, context);
        }
    }

    // Log de warning
    warn(message, data = {}, context = {}) {
        if (!this.shouldLog('warn') || this.logCount >= this.maxLogs) return;

        const logEntry = this.createLogEntry('warn', message, data, context);
        this.logCount++;
        
        if (this.isProduction) {
            this.sendToServer(logEntry);
        } else {
            console.warn(`⚠️ ${message}`, data, context);
        }
    }

    // Log de informação
    info(message, data = {}, context = {}) {
        if (!this.isProduction && this.shouldLog('info') && this.logCount < this.maxLogs) {
            this.logCount++;
            console.info(`ℹ️ ${message}`, data, context);
        }
    }

    // Log de debug
    debug(message, data = {}, context = {}) {
        if (!this.isProduction && this.shouldLog('debug') && this.logCount < this.maxLogs) {
            this.logCount++;
            console.debug(`🐛 ${message}`, data, context);
        }
    }

    // Log de performance
    performance(operation, duration, data = {}) {
        const logEntry = this.createLogEntry('info', `Performance: ${operation}`, {
            duration,
            ...data
        }, { type: 'performance' });

        if (this.isProduction) {
            this.sendToServer(logEntry);
        } else {
            console.log(`⏱️ ${operation}: ${duration}ms`, data);
        }
    }

    // Log de API
    api(method, endpoint, status, duration, data = {}) {
        const logEntry = this.createLogEntry('info', `API ${method} ${endpoint}`, {
            method,
            endpoint,
            status,
            duration,
            ...data
        }, { type: 'api' });

        if (this.isProduction) {
            this.sendToServer(logEntry);
        } else {
            const emoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
            console.log(`${emoji} ${method} ${endpoint} - ${status} (${duration}ms)`, data);
        }
    }

    // Log de usuário
    user(action, data = {}) {
        const logEntry = this.createLogEntry('info', `User action: ${action}`, data, { type: 'user' });

        if (this.isProduction) {
            this.sendToServer(logEntry);
        } else {
            console.log(`👤 User: ${action}`, data);
        }
    }

    // Log de sistema
    system(component, action, data = {}) {
        const logEntry = this.createLogEntry('info', `System ${component}: ${action}`, data, { type: 'system' });

        if (this.isProduction) {
            this.sendToServer(logEntry);
        } else {
            console.log(`🔧 ${component}: ${action}`, data);
        }
    }

    // Enviar log para servidor
    async sendToServer(logEntry) {
        try {
            // Em produção, enviar para endpoint de logs
            await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            // Fallback: armazenar localmente se não conseguir enviar
            this.storeLocally(logEntry);
        }
    }

    // Armazenar log localmente como fallback
    storeLocally(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('localLogs') || '[]');
            logs.push(logEntry);
            
            // Manter apenas os últimos 100 logs
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('localLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Erro ao armazenar log localmente:', error);
        }
    }

    // Obter logs locais
    getLocalLogs() {
        try {
            return JSON.parse(localStorage.getItem('localLogs') || '[]');
        } catch {
            return [];
        }
    }

    // Limpar logs locais
    clearLocalLogs() {
        localStorage.removeItem('localLogs');
    }

    // Medir performance de função
    measurePerformance(name, fn) {
        return async (...args) => {
            const start = performance.now();
            try {
                const result = await fn(...args);
                const duration = performance.now() - start;
                this.performance(name, duration, { success: true });
                return result;
            } catch (error) {
                const duration = performance.now() - start;
                this.performance(name, duration, { success: false, error: error.message });
                throw error;
            }
        };
    }
}

// Instância global
window.logger = new Logger();

// Funções helper para uso rápido
window.logError = (message, data, context) => window.logger.error(message, data, context);
window.logWarn = (message, data, context) => window.logger.warn(message, data, context);
window.logInfo = (message, data, context) => window.logger.info(message, data, context);
window.logDebug = (message, data, context) => window.logger.debug(message, data, context);
window.logPerformance = (operation, duration, data) => window.logger.performance(operation, duration, data);
window.logAPI = (method, endpoint, status, duration, data) => window.logger.api(method, endpoint, status, duration, data);
window.logUser = (action, data) => window.logger.user(action, data);
window.logSystem = (component, action, data) => window.logger.system(component, action, data);

// Wrapper para fetch com logging automático
window.loggedFetch = async function(url, options = {}) {
    const start = performance.now();
    const method = options.method || 'GET';
    
    try {
        const response = await fetch(url, options);
        const duration = performance.now() - start;
        
        window.logAPI(method, url, response.status, duration, {
            headers: options.headers,
            body: options.body ? 'present' : 'none'
        });
        
        return response;
    } catch (error) {
        const duration = performance.now() - start;
        
        window.logAPI(method, url, 0, duration, {
            error: error.message,
            headers: options.headers,
            body: options.body ? 'present' : 'none'
        });
        
        throw error;
    }
};

// Interceptar erros globais
window.addEventListener('error', (event) => {
    window.logger.error('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
    });
});

window.addEventListener('unhandledrejection', (event) => {
    window.logger.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
    });
});
