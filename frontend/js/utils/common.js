/**
 * Utilitários Comuns - CH Studio
 * Funções compartilhadas entre diferentes módulos
 */

class CommonUtils {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost';
    }

    // Formatar data para exibição
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            ...options
        };
        
        return new Date(date).toLocaleDateString('pt-BR', defaultOptions);
    }

    // Formatar data e hora
    formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };
        
        return new Date(date).toLocaleString('pt-BR', defaultOptions);
    }

    // Formatar moeda
    formatCurrency(value, currency = 'BRL') {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency
        }).format(value);
    }

    // Formatar número
    formatNumber(value, options = {}) {
        const defaultOptions = {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...options
        };
        
        return new Intl.NumberFormat('pt-BR', defaultOptions).format(value);
    }

    // Debounce para otimizar eventos
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // Throttle para otimizar eventos
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

    // Gerar ID único
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validar telefone
    isValidPhone(phone) {
        const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/;
        return phoneRegex.test(phone);
    }

    // Sanitizar string
    sanitizeString(str) {
        return str
            .replace(/[<>]/g, '') // Remover < e >
            .replace(/javascript:/gi, '') // Remover javascript:
            .replace(/on\w+=/gi, '') // Remover event handlers
            .trim();
    }

    // Copiar para clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        }
    }

    // Download de arquivo
    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Verificar se é mobile
    isMobile() {
        return window.innerWidth <= 768;
    }

    // Verificar se é tablet
    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    // Verificar se é desktop
    isDesktop() {
        return window.innerWidth > 1024;
    }

    // Obter breakpoint atual
    getCurrentBreakpoint() {
        if (this.isMobile()) return 'mobile';
        if (this.isTablet()) return 'tablet';
        return 'desktop';
    }

    // Animar elemento
    animateElement(element, animation, duration = 300) {
        return new Promise((resolve) => {
            element.style.animation = `${animation} ${duration}ms ease`;
            setTimeout(() => {
                element.style.animation = '';
                resolve();
            }, duration);
        });
    }

    // Fade in
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Fade out
    fadeOut(element, duration = 300) {
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = Math.max(1 - progress, 0);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Scroll suave
    smoothScrollTo(element, offset = 0) {
        const targetPosition = element.offsetTop - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 500;
        let start = null;

        const animation = (currentTime) => {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = this.easeInOutQuad(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        };

        requestAnimationFrame(animation);
    }

    // Função de easing
    easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    // Verificar se elemento está visível
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Obter dados do usuário atual
    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('userData') || '{}');
        } catch (error) {
            console.warn('Erro ao obter dados do usuário:', error);
            return {};
        }
    }

    // Verificar se usuário está logado
    isLoggedIn() {
        const user = this.getCurrentUser();
        return user && user.id && localStorage.getItem('authToken');
    }

    // Fazer logout
    logout() {
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        localStorage.removeItem('systemColors');
        sessionStorage.clear();
        window.location.href = '/';
    }

    // Obter configuração do sistema
    getSystemConfig() {
        try {
            return JSON.parse(localStorage.getItem('systemConfig') || '{}');
        } catch (error) {
            console.warn('Erro ao obter configuração do sistema:', error);
            return {};
        }
    }

    // Salvar configuração do sistema
    saveSystemConfig(config) {
        try {
            localStorage.setItem('systemConfig', JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Erro ao salvar configuração do sistema:', error);
            return false;
        }
    }
}

// Instância global
window.commonUtils = new CommonUtils();

// Funções helper para uso rápido
window.formatDate = (date, options) => window.commonUtils.formatDate(date, options);
window.formatDateTime = (date, options) => window.commonUtils.formatDateTime(date, options);
window.formatCurrency = (value, currency) => window.commonUtils.formatCurrency(value, currency);
window.formatNumber = (value, options) => window.commonUtils.formatNumber(value, options);
window.generateId = (prefix) => window.commonUtils.generateId(prefix);
window.isValidEmail = (email) => window.commonUtils.isValidEmail(email);
window.isValidPhone = (phone) => window.commonUtils.isValidPhone(phone);
window.copyToClipboard = (text) => window.commonUtils.copyToClipboard(text);
window.downloadFile = (data, filename, type) => window.commonUtils.downloadFile(data, filename, type);
window.isMobile = () => window.commonUtils.isMobile();
window.isTablet = () => window.commonUtils.isTablet();
window.isDesktop = () => window.commonUtils.isDesktop();
window.fadeIn = (element, duration) => window.commonUtils.fadeIn(element, duration);
window.fadeOut = (element, duration) => window.commonUtils.fadeOut(element, duration);
window.smoothScrollTo = (element, offset) => window.commonUtils.smoothScrollTo(element, offset);
window.isElementVisible = (element) => window.commonUtils.isElementVisible(element);
window.getCurrentUser = () => window.commonUtils.getCurrentUser();
window.isLoggedIn = () => window.commonUtils.isLoggedIn();
window.logout = () => window.commonUtils.logout();

// Exportar para uso em outros módulos
window.CommonUtils = CommonUtils;
