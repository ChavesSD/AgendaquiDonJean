// WhatsApp Integration JavaScript
class WhatsAppManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.qrCode = null;
        this.status = 'disconnected';
        this.clientInfo = null;
        
        this.init();
    }

    // Inicializar
    init() {
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadStatus();
        this.loadMessages();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botão conectar
        const connectBtn = document.getElementById('connect-whatsapp');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connect());
        }

        // Botão desconectar
        const disconnectBtn = document.getElementById('disconnect-whatsapp');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }

        // Botão enviar mensagem de teste
        const sendTestBtn = document.getElementById('send-test-message');
        if (sendTestBtn) {
            sendTestBtn.addEventListener('click', () => this.sendTestMessage());
        }

        // Salvar mensagem de boas-vindas
        const saveWelcomeBtn = document.getElementById('save-welcome-message');
        if (saveWelcomeBtn) {
            saveWelcomeBtn.addEventListener('click', () => this.saveWelcomeMessage());
        }

        // Botão testar mensagem automática
        const testAutomaticBtn = document.getElementById('send-automatic-message');
        if (testAutomaticBtn) {
            testAutomaticBtn.addEventListener('click', () => this.testAutomaticMessage());
        }

        // Botão testar conexão
        const testConnectionBtn = document.getElementById('test-connection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testConnection());
        }
    }

    // Conectar WebSocket
    connectWebSocket() {
        this.socket = io();
        
        this.socket.on('whatsapp_qr', (data) => {
            this.displayQRCode(data.qrCode);
        });

        this.socket.on('whatsapp_ready', (data) => {
            this.onConnected(data.message);
        });

        this.socket.on('whatsapp_disconnected', (data) => {
            this.onDisconnected(data.reason);
        });

        this.socket.on('whatsapp_message', (data) => {
            this.onMessageReceived(data);
        });
    }

    // Carregar status inicial
    async loadStatus() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const status = await response.json();
                this.updateStatus(status);
                
                if (status.hasQR) {
                    this.displayQRCode(status.qrCode);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar status:', error);
        }
    }

    // Conectar WhatsApp
    async connect() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/connect', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.updateConnectionStatus('connecting');
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao conectar:', error);
            this.showNotification('Erro ao conectar WhatsApp', 'error');
        }
    }

    // Desconectar WhatsApp
    async disconnect() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/disconnect', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.updateConnectionStatus('disconnected');
                this.clearQRCode();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao desconectar:', error);
            this.showNotification('Erro ao desconectar WhatsApp', 'error');
        }
    }

    // Exibir QR Code
    displayQRCode(qrCodeImage) {
        const qrContainer = document.getElementById('qr-code-container');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div class="qr-code-wrapper">
                    <img src="${qrCodeImage}" alt="QR Code WhatsApp" class="qr-code-image">
                    <p class="qr-code-text">Escaneie o QR Code com seu WhatsApp</p>
                </div>
            `;
        }
        
        this.updateConnectionStatus('qr_ready');
    }

    // Limpar QR Code
    clearQRCode() {
        const qrContainer = document.getElementById('qr-code-container');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div class="qr-code-placeholder">
                    <i class="fab fa-whatsapp"></i>
                    <p>QR Code aparecerá aqui</p>
                </div>
            `;
        }
    }

    // Atualizar status da conexão
    updateStatus(status) {
        this.isConnected = status.isConnected;
        this.status = status.status;
        this.qrCode = status.qrCode;
        
        this.updateConnectionStatus(status.status);
    }

    // Atualizar interface de conexão
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('whatsapp-status');
        const connectBtn = document.getElementById('connect-whatsapp');
        const disconnectBtn = document.getElementById('disconnect-whatsapp');
        
        if (statusElement) {
            const statusText = statusElement.querySelector('.status-text');
            const statusDot = statusElement.querySelector('.status-dot');
            
            if (statusText && statusDot) {
                switch (status) {
                    case 'connected':
                        statusText.textContent = 'Conectado';
                        statusDot.className = 'status-dot connected';
                        break;
                    case 'connecting':
                    case 'loading':
                        statusText.textContent = 'Conectando...';
                        statusDot.className = 'status-dot connecting';
                        break;
                    case 'qr_ready':
                        statusText.textContent = 'Aguardando QR Code';
                        statusDot.className = 'status-dot qr-ready';
                        break;
                    case 'disconnected':
                    default:
                        statusText.textContent = 'Desconectado';
                        statusDot.className = 'status-dot disconnected';
                        break;
                }
            }
        }
        
        // Atualizar botões
        const sendTestBtn = document.getElementById('send-test-message');
        const sendAutomaticBtn = document.getElementById('send-automatic-message');
        const testConnectionBtn = document.getElementById('test-connection');
        
        if (connectBtn && disconnectBtn) {
            if (status === 'connected') {
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'inline-block';
                if (sendTestBtn) sendTestBtn.style.display = 'inline-block';
                if (sendAutomaticBtn) sendAutomaticBtn.style.display = 'inline-block';
                if (testConnectionBtn) testConnectionBtn.style.display = 'inline-block';
            } else {
                connectBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'none';
                if (sendTestBtn) sendTestBtn.style.display = 'none';
                if (sendAutomaticBtn) sendAutomaticBtn.style.display = 'none';
                if (testConnectionBtn) testConnectionBtn.style.display = 'none';
            }
        }
    }

    // Callback quando conectado
    onConnected(message) {
        this.isConnected = true;
        this.status = 'connected';
        this.showNotification(message, 'success');
        this.updateConnectionStatus('connected');
        this.clearQRCode();
        this.loadClientInfo();
    }

    // Callback quando desconectado
    onDisconnected(reason) {
        this.isConnected = false;
        this.status = 'disconnected';
        this.showNotification(`WhatsApp desconectado: ${reason}`, 'warning');
        this.updateConnectionStatus('disconnected');
        this.clearQRCode();
    }

    // Callback quando mensagem recebida
    onMessageReceived(data) {
        console.log('Mensagem recebida:', data);
        // Aqui você pode implementar lógica para processar mensagens recebidas
    }

    // Carregar informações do cliente
    async loadClientInfo() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/client-info', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.clientInfo = await response.json();
                this.displayClientInfo();
            }
        } catch (error) {
            console.error('Erro ao carregar informações do cliente:', error);
        }
    }

    // Exibir informações do cliente
    displayClientInfo() {
        if (this.clientInfo) {
            const infoElement = document.getElementById('client-info');
            if (infoElement) {
                infoElement.innerHTML = `
                    <div class="client-info">
                        <h4>Informações da Conta</h4>
                        <p><strong>Nome:</strong> ${this.clientInfo.pushname || 'N/A'}</p>
                        <p><strong>Número:</strong> ${this.clientInfo.wid || 'N/A'}</p>
                        <p><strong>Plataforma:</strong> ${this.clientInfo.platform || 'N/A'}</p>
                    </div>
                `;
            }
        }
    }

    // Enviar mensagem de teste
    async sendTestMessage() {
        const testNumber = prompt('Digite o número para teste (com DDD, apenas números):');
        if (!testNumber) return;

        const message = 'Teste de integração WhatsApp - CH Studio';
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/send-message', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: testNumber,
                    message: message
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Mensagem de teste enviada!', 'success');
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem de teste:', error);
            this.showNotification('Erro ao enviar mensagem de teste', 'error');
        }
    }

    // Carregar mensagens automáticas
    async loadMessages() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const welcomeInput = document.getElementById('welcome-message');
                const outOfHoursInput = document.getElementById('msg-fora-horario');
                
                if (welcomeInput) welcomeInput.value = data.welcomeMessage || '';
                if (outOfHoursInput) outOfHoursInput.value = data.outOfHoursMessage || '';
                
                console.log('Mensagens carregadas:', data);
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        }
    }

    // Salvar mensagens automáticas
    async saveWelcomeMessage() {
        const welcomeInput = document.getElementById('welcome-message');
        const outOfHoursInput = document.getElementById('msg-fora-horario');
        
        if (!welcomeInput || !outOfHoursInput) return;

        const welcomeMessage = welcomeInput.value.trim();
        const outOfHoursMessage = outOfHoursInput.value.trim();

        if (!welcomeMessage && !outOfHoursMessage) {
            this.showNotification('Digite pelo menos uma mensagem', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/messages', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    welcomeMessage: welcomeMessage,
                    outOfHoursMessage: outOfHoursMessage
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                console.log('Mensagens salvas:', result);
            } else {
                const error = await response.json();
                this.showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar mensagens:', error);
            this.showNotification('Erro ao salvar mensagens', 'error');
        }
    }

    // Testar mensagem automática
    async testAutomaticMessage() {
        const number = prompt('Digite o número para testar a mensagem automática (com DDD, apenas números):');
        if (!number) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/send-automatic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ number })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(`Mensagem automática enviada! Tipo: ${result.messageType}`, 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao testar mensagem automática:', error);
            this.showNotification('Erro ao testar mensagem automática', 'error');
        }
    }

    // Testar conexão do WhatsApp
    async testConnection() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/test-connection', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showNotification(`✅ ${result.message}`, 'success');
                    console.log('Informações do cliente:', result.clientInfo);
                } else {
                    this.showNotification(`❌ ${result.message}`, 'error');
                }
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.message}`, 'error');
            }
        } catch (error) {
            console.error('Erro ao testar conexão:', error);
            this.showNotification('❌ Erro ao testar conexão', 'error');
        }
    }

    // Mostrar notificação
    showNotification(message, type = 'info') {
        // Usar a função de notificação existente se disponível
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se estamos na aba de WhatsApp
    if (document.getElementById('whatsapp-tab')) {
        window.whatsappManager = new WhatsAppManager();
    }
});

// Exportar para uso global
window.WhatsAppManager = WhatsAppManager;
