// ==================== PWA - PROGRESSIVE WEB APP ====================

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registrado com sucesso:', registration.scope);
                
                // Verificar atualizações periodicamente
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000); // A cada hora
                
                // Detectar atualização do service worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nova versão disponível
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch(error => {
                console.error('❌ Erro ao registrar Service Worker:', error);
            });
    });
    
    // Escutar mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'NEW_VERSION') {
            showUpdateNotification();
        }
    });
}

// Variável global para o evento de instalação
let deferredPrompt;
let installButton = null;

// Detectar quando o app pode ser instalado
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir o prompt automático
    e.preventDefault();
    // Guardar o evento para usar depois
    deferredPrompt = e;
    
    // Mostrar botão de instalação se existir
    showInstallButton();
});

// Função para mostrar botão de instalação
function showInstallButton() {
    // Se já está instalado, não mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return;
    }
    
    // Procurar por elemento de instalação no dashboard
    const installContainer = document.querySelector('.pwa-install-container');
    if (installContainer) {
        installContainer.style.display = 'block';
        installButton = installContainer.querySelector('.pwa-install-btn');
        if (installButton) {
            installButton.addEventListener('click', installPWA);
        }
    }
}

// Função para instalar o PWA
async function installPWA() {
    if (!deferredPrompt) {
        // Se não há evento de instalação, mostrar instruções
        showInstallInstructions();
        return;
    }
    
    // Mostrar prompt de instalação
    deferredPrompt.prompt();
    
    // Aguardar resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('✅ Usuário aceitou a instalação');
        if (typeof showNotification === 'function') {
            showNotification('App instalado com sucesso! 🎉', 'success');
        }
    } else {
        console.log('❌ Usuário rejeitou a instalação');
    }
    
    // Limpar o evento
    deferredPrompt = null;
    
    // Esconder botão
    const installContainer = document.querySelector('.pwa-install-container');
    if (installContainer) {
        installContainer.style.display = 'none';
    }
}

// Função para mostrar instruções de instalação manual
function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
        instructions = `
            <div class="pwa-instructions">
                <h3>Instalar CH Studio no iOS</h3>
                <ol>
                    <li>Toque no botão <strong>Compartilhar</strong> (ícone de compartilhamento)</li>
                    <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong></li>
                    <li>Toque em <strong>Adicionar</strong></li>
                </ol>
            </div>
        `;
    } else if (isAndroid) {
        instructions = `
            <div class="pwa-instructions">
                <h3>Instalar CH Studio no Android</h3>
                <ol>
                    <li>Toque no menu (3 pontos) no navegador</li>
                    <li>Selecione <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></li>
                    <li>Toque em <strong>Instalar</strong></li>
                </ol>
            </div>
        `;
    } else {
        instructions = `
            <div class="pwa-instructions">
                <h3>Instalar CH Studio</h3>
                <p>No Chrome/Edge: Clique no ícone de instalação na barra de endereços</p>
                <p>Ou use o menu do navegador → Instalar aplicativo</p>
            </div>
        `;
    }
    
    if (typeof showNotification === 'function') {
        // Criar modal com instruções
        const modal = document.createElement('div');
        modal.className = 'pwa-instructions-modal';
        modal.innerHTML = `
            <div class="pwa-instructions-content">
                <span class="close-instructions">&times;</span>
                ${instructions}
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.close-instructions').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Detectar quando o app foi instalado
window.addEventListener('appinstalled', () => {
    console.log('✅ PWA instalado com sucesso');
    deferredPrompt = null;
    
    // Esconder botão de instalação
    const installContainer = document.querySelector('.pwa-install-container');
    if (installContainer) {
        installContainer.style.display = 'none';
    }
});

// Função para mostrar notificação de atualização
function showUpdateNotification() {
    // Verificar se existe sistema de notificações
    if (typeof showNotification !== 'function') {
        return;
    }
    
    // Criar botão para atualizar
    const updateBanner = document.createElement('div');
    updateBanner.className = 'pwa-update-banner';
    updateBanner.innerHTML = `
        <div class="pwa-update-content">
            <span>✨ Nova versão disponível!</span>
            <button class="pwa-update-btn" onclick="updatePWA()">Atualizar</button>
        </div>
    `;
    document.body.appendChild(updateBanner);
}

// Função para atualizar o PWA
window.updatePWA = function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        });
    }
};

// Detectar se está rodando como PWA instalado
window.isPWAInstalled = function() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
};

// Ajustar comportamento quando instalado como PWA
if (window.isPWAInstalled()) {
    document.documentElement.classList.add('pwa-installed');
    console.log('📱 App rodando como PWA instalado');
}

// Exportar funções globais
window.installPWA = installPWA;
window.showInstallInstructions = showInstallInstructions;

