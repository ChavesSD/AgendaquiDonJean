/**
 * Utilitário para detectar e gerenciar o cliente atual
 * Funciona com subpaths dinâmicos (ex: /chstudio, /cliente2, etc.)
 */

class ClientDetector {
    constructor() {
        this.currentClient = this.detectCurrentClient();
        this.basePath = this.getBasePath();
        this.apiBase = this.getApiBase();
        this.assetsBase = this.getAssetsBase();
    }

    /**
     * Detecta o cliente atual baseado na URL
     */
    detectCurrentClient() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(segment => segment);
        
        // Se estiver na raiz, usar cliente padrão
        if (segments.length === 0) {
            return 'chstudio';
        }
        
        // Primeiro segmento é o cliente
        const client = segments[0];
        
        // Lista de clientes válidos
        const validClients = ['chstudio', 'cliente2', 'cliente3'];
        
        return validClients.includes(client) ? client : 'chstudio';
    }

    /**
     * Retorna o base path do cliente atual
     */
    getBasePath() {
        return `/${this.currentClient}`;
    }

    /**
     * Retorna a base da API para o cliente atual
     */
    getApiBase() {
        return `${this.basePath}/api`;
    }

    /**
     * Retorna a base dos assets para o cliente atual
     */
    getAssetsBase() {
        return `${this.basePath}/assets`;
    }

    /**
     * Constrói uma URL completa para o cliente atual
     */
    buildUrl(path = '') {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${this.basePath}/${cleanPath}`;
    }

    /**
     * Constrói uma URL da API para o cliente atual
     */
    buildApiUrl(endpoint = '') {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.apiBase}/${cleanEndpoint}`;
    }

    /**
     * Constrói uma URL de asset para o cliente atual
     */
    buildAssetUrl(asset = '') {
        const cleanAsset = asset.startsWith('/') ? asset.slice(1) : asset;
        return `${this.assetsBase}/${cleanAsset}`;
    }

    /**
     * Verifica se está rodando em modo multi-cliente
     */
    isMultiClientMode() {
        return this.currentClient !== 'chstudio' || window.location.hostname !== 'localhost';
    }

    /**
     * Retorna informações do cliente atual
     */
    getClientInfo() {
        return {
            name: this.currentClient,
            basePath: this.basePath,
            apiBase: this.apiBase,
            assetsBase: this.assetsBase,
            isMultiClient: this.isMultiClientMode()
        };
    }

    /**
     * Redireciona para outro cliente
     */
    redirectToClient(clientName, path = '') {
        const newPath = `/${clientName}/${path}`;
        window.location.href = newPath;
    }

    /**
     * Atualiza todas as URLs do DOM para usar o base path correto
     */
    updateDomUrls() {
        // Atualizar links
        const links = document.querySelectorAll('a[href^="/"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith(this.basePath)) {
                link.setAttribute('href', this.buildUrl(href));
            }
        });

        // Atualizar forms
        const forms = document.querySelectorAll('form[action^="/"]');
        forms.forEach(form => {
            const action = form.getAttribute('action');
            if (action && !action.startsWith(this.basePath)) {
                form.setAttribute('action', this.buildUrl(action));
            }
        });

        // Atualizar assets
        const images = document.querySelectorAll('img[src^="/assets"]');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith(this.assetsBase)) {
                img.setAttribute('src', this.buildAssetUrl(src));
            }
        });
    }
}

// Criar instância global
window.clientDetector = new ClientDetector();

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientDetector;
}
