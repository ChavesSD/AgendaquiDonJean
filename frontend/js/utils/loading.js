// ==================== SISTEMA DE LOADING STATES ====================

class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
        this.loadingOverlay = null;
        this.createLoadingOverlay();
    }

    // Criar overlay de loading global
    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'global-loading-overlay';
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="loading-text">Carregando...</p>
            </div>
        `;
        this.loadingOverlay.style.display = 'none';
        document.body.appendChild(this.loadingOverlay);
    }

    // Mostrar loading global
    showGlobalLoading(message = 'Carregando...') {
        const textElement = this.loadingOverlay.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = message;
        }
        this.loadingOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Esconder loading global
    hideGlobalLoading() {
        this.loadingOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Mostrar loading em elemento específico
    showElementLoading(elementId, message = 'Carregando...') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const loaderId = `loader-${elementId}`;
        this.activeLoaders.add(loaderId);

        // Criar overlay de loading para o elemento
        const overlay = document.createElement('div');
        overlay.id = loaderId;
        overlay.className = 'element-loading-overlay';
        overlay.innerHTML = `
            <div class="element-loading-spinner">
                <div class="spinner-small"></div>
                <p class="loading-text-small">${message}</p>
            </div>
        `;

        // Posicionar o overlay sobre o elemento
        const rect = element.getBoundingClientRect();
        overlay.style.position = 'absolute';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.zIndex = '1000';

        document.body.appendChild(overlay);
    }

    // Esconder loading de elemento específico
    hideElementLoading(elementId) {
        const loaderId = `loader-${elementId}`;
        const overlay = document.getElementById(loaderId);
        
        if (overlay) {
            overlay.remove();
            this.activeLoaders.delete(loaderId);
        }
    }

    // Mostrar loading em botão
    showButtonLoading(buttonId, loadingText = 'Carregando...') {
        const button = document.getElementById(buttonId) || document.querySelector(`[data-button-id="${buttonId}"]`);
        if (!button) return;

        // Salvar estado original
        button.dataset.originalText = button.innerHTML;
        button.dataset.originalDisabled = button.disabled;

        // Aplicar estado de loading
        button.innerHTML = `
            <span class="button-spinner"></span>
            ${loadingText}
        `;
        button.disabled = true;
        button.classList.add('loading');
    }

    // Esconder loading de botão
    hideButtonLoading(buttonId) {
        const button = document.getElementById(buttonId) || document.querySelector(`[data-button-id="${buttonId}"]`);
        if (!button) return;

        // Restaurar estado original
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
        if (button.dataset.originalDisabled !== undefined) {
            button.disabled = button.dataset.originalDisabled === 'true';
        }
        button.classList.remove('loading');
    }

    // Mostrar loading em lista
    showListLoading(listId, message = 'Carregando itens...') {
        const list = document.getElementById(listId);
        if (!list) return;

        const loadingItem = document.createElement('div');
        loadingItem.className = 'list-loading-item';
        loadingItem.innerHTML = `
            <div class="list-loading-content">
                <div class="spinner-small"></div>
                <span>${message}</span>
            </div>
        `;
        loadingItem.id = `list-loading-${listId}`;

        list.appendChild(loadingItem);
    }

    // Esconder loading de lista
    hideListLoading(listId) {
        const loadingItem = document.getElementById(`list-loading-${listId}`);
        if (loadingItem) {
            loadingItem.remove();
        }
    }

    // Mostrar loading em formulário
    showFormLoading(formId, message = 'Salvando...') {
        const form = document.getElementById(formId);
        if (!form) return;

        // Desabilitar todos os inputs
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('loading');
        });

        // Mostrar mensagem de loading
        let loadingMessage = form.querySelector('.form-loading-message');
        if (!loadingMessage) {
            loadingMessage = document.createElement('div');
            loadingMessage.className = 'form-loading-message';
            form.appendChild(loadingMessage);
        }
        loadingMessage.innerHTML = `
            <div class="form-loading-content">
                <div class="spinner-small"></div>
                <span>${message}</span>
            </div>
        `;
        loadingMessage.style.display = 'block';
    }

    // Esconder loading de formulário
    hideFormLoading(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Reabilitar todos os inputs
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('loading');
        });

        // Esconder mensagem de loading
        const loadingMessage = form.querySelector('.form-loading-message');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    }

    // Limpar todos os loadings ativos
    clearAllLoadings() {
        this.hideGlobalLoading();
        
        // Limpar loadings de elementos
        this.activeLoaders.forEach(loaderId => {
            const overlay = document.getElementById(loaderId);
            if (overlay) overlay.remove();
        });
        this.activeLoaders.clear();

        // Limpar loadings de botões
        const loadingButtons = document.querySelectorAll('.loading[data-button-id]');
        loadingButtons.forEach(button => {
            this.hideButtonLoading(button.dataset.buttonId);
        });
    }

    // Verificar se há loadings ativos
    hasActiveLoadings() {
        return this.activeLoaders.size > 0 || this.loadingOverlay.style.display !== 'none';
    }
}

// Instância global
window.loadingManager = new LoadingManager();

// Funções helper para uso rápido
window.showLoading = (message) => window.loadingManager.showGlobalLoading(message);
window.hideLoading = () => window.loadingManager.hideGlobalLoading();
window.showButtonLoading = (buttonId, text) => window.loadingManager.showButtonLoading(buttonId, text);
window.hideButtonLoading = (buttonId) => window.loadingManager.hideButtonLoading(buttonId);
window.showListLoading = (listId, message) => window.loadingManager.showListLoading(listId, message);
window.hideListLoading = (listId) => window.loadingManager.hideListLoading(listId);
window.showFormLoading = (formId, message) => window.loadingManager.showFormLoading(formId, message);
window.hideFormLoading = (formId) => window.loadingManager.hideFormLoading(formId);
