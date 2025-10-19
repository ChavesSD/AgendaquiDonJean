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

        // Botão gerar QR Code
        const generateQrBtn = document.getElementById('generate-qr');
        if (generateQrBtn) {
            generateQrBtn.addEventListener('click', () => this.generateQRCode());
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

    // Gerar QR Code
    async generateQRCode() {
        try {
            this.updateConnectionStatus('connecting');
            this.showNotification('Gerando novo QR Code...', 'info');
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/generate-qr', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Novo QR Code sendo gerado...', 'success');
                this.updateConnectionStatus('qr_ready');
            } else {
                this.showNotification(result.message, 'error');
                this.updateConnectionStatus('disconnected');
            }
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            this.showNotification('Erro ao gerar QR Code', 'error');
            this.updateConnectionStatus('disconnected');
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
        const generateQrBtn = document.getElementById('generate-qr');
        
        if (connectBtn && disconnectBtn) {
            if (status === 'connected') {
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'inline-block';
                if (sendTestBtn) sendTestBtn.style.display = 'inline-block';
                if (generateQrBtn) generateQrBtn.style.display = 'none';
            } else if (status === 'qr_ready') {
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'none';
                if (sendTestBtn) sendTestBtn.style.display = 'none';
                if (generateQrBtn) generateQrBtn.style.display = 'none';
            } else {
                connectBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'none';
                if (sendTestBtn) sendTestBtn.style.display = 'none';
                if (generateQrBtn) generateQrBtn.style.display = 'inline-block';
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
                const confirmationInput = document.getElementById('confirmation-message');
                const cancellationInput = document.getElementById('cancellation-message');
                
                if (welcomeInput) welcomeInput.value = data.welcomeMessage || '';
                if (outOfHoursInput) outOfHoursInput.value = data.outOfHoursMessage || '';
                if (confirmationInput) confirmationInput.value = data.confirmationMessage || '';
                if (cancellationInput) cancellationInput.value = data.cancellationMessage || '';
                
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
        const confirmationInput = document.getElementById('confirmation-message');
        const cancellationInput = document.getElementById('cancellation-message');
        
        if (!welcomeInput || !outOfHoursInput || !confirmationInput || !cancellationInput) return;

        const welcomeMessage = welcomeInput.value.trim();
        const outOfHoursMessage = outOfHoursInput.value.trim();
        const confirmationMessage = confirmationInput.value.trim();
        const cancellationMessage = cancellationInput.value.trim();

        if (!welcomeMessage && !outOfHoursMessage && !confirmationMessage && !cancellationMessage) {
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
                    outOfHoursMessage: outOfHoursMessage,
                    confirmationMessage: confirmationMessage,
                    cancellationMessage: cancellationMessage
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


    // Enviar mensagem de confirmação
    async sendConfirmationMessage(phoneNumber, appointmentDetails) {
        try {
            console.log('📤 Tentando enviar mensagem de confirmação...');
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/send-confirmation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    number: phoneNumber,
                    appointmentDetails: appointmentDetails
                })
            });

            const result = await response.json();
            console.log('📨 Resposta da confirmação:', result);

            if (result.success) {
                this.showNotification('Mensagem de confirmação enviada!', 'success');
                return true;
            } else {
                if (result.needsConnection) {
                    console.log('⚠️ WhatsApp não conectado, tentando conectar automaticamente...');
                    const connected = await this.attemptAutoConnect();
                    if (connected) {
                        // Tentar novamente após conectar
                        return await this.sendConfirmationMessage(phoneNumber, appointmentDetails);
                    } else {
                        this.showNotification('WhatsApp não está conectado. Acesse Configurações > WhatsApp para conectar primeiro.', 'error');
                    }
                } else {
                    this.showNotification(result.message, 'error');
                }
                return false;
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem de confirmação:', error);
            this.showNotification('Erro ao enviar mensagem de confirmação', 'error');
            return false;
        }
    }

    // Enviar mensagem de cancelamento
    async sendCancellationMessage(phoneNumber, appointmentDetails) {
        try {
            console.log('📤 Tentando enviar mensagem de cancelamento...');
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/whatsapp/send-cancellation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    number: phoneNumber,
                    appointmentDetails: appointmentDetails
                })
            });

            const result = await response.json();
            console.log('📨 Resposta do cancelamento:', result);

            if (result.success) {
                this.showNotification('Mensagem de cancelamento enviada!', 'success');
                return true;
            } else {
                if (result.needsConnection) {
                    console.log('⚠️ WhatsApp não conectado, tentando conectar automaticamente...');
                    const connected = await this.attemptAutoConnect();
                    if (connected) {
                        // Tentar novamente após conectar
                        return await this.sendCancellationMessage(phoneNumber, appointmentDetails);
                    } else {
                        this.showNotification('WhatsApp não está conectado. Acesse Configurações > WhatsApp para conectar primeiro.', 'error');
                    }
                } else {
                    this.showNotification(result.message, 'error');
                }
                return false;
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem de cancelamento:', error);
            this.showNotification('Erro ao enviar mensagem de cancelamento', 'error');
            return false;
        }
    }

    // Tentar conectar automaticamente
    async attemptAutoConnect() {
        try {
            console.log('🔄 Tentando conectar WhatsApp automaticamente...');
            const token = localStorage.getItem('authToken');
            
            // Tentar conectar
            const connectResponse = await fetch('/api/whatsapp/connect', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const connectResult = await connectResponse.json();
            console.log('🔌 Resultado da conexão:', connectResult);
            
            if (connectResult.success) {
                // Aguardar um pouco para a conexão ser estabelecida
                console.log('⏳ Aguardando conexão ser estabelecida...');
                await new Promise(resolve => setTimeout(resolve, 8000));
                
                // Verificar status
                const statusResponse = await fetch('/api/whatsapp/status', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const statusResult = await statusResponse.json();
                console.log('📊 Status após conexão:', statusResult);
                
                if (statusResult.isReady) {
                    console.log('✅ WhatsApp conectado com sucesso!');
                    this.showNotification('WhatsApp conectado automaticamente!', 'success');
                    return true;
                } else {
                    console.log('❌ WhatsApp ainda não está pronto');
                    return false;
                }
            } else {
                console.log('❌ Falha na conexão automática:', connectResult.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro na conexão automática:', error);
            return false;
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
