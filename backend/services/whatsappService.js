const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.qrCode = null;
        this.status = 'disconnected';
        this.callbacks = {
            onQR: null,
            onReady: null,
            onDisconnected: null,
            onMessage: null
        };
    }

    // Inicializar cliente WhatsApp
    initialize() {
        if (this.client) {
            return;
        }

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "ch-studio-whatsapp"
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        // Evento: QR Code gerado
        this.client.on('qr', async (qr) => {
            console.log('QR Code gerado');
            this.qrCode = qr;
            this.status = 'qr_ready';
            
            // Gerar QR Code como imagem
            try {
                const qrCodeImage = await qrcode.toDataURL(qr);
                this.qrCodeImage = qrCodeImage;
                
                if (this.callbacks.onQR) {
                    this.callbacks.onQR(qrCodeImage);
                }
            } catch (error) {
                console.error('Erro ao gerar QR Code:', error);
            }
        });

        // Evento: Cliente pronto
        this.client.on('ready', () => {
            console.log('WhatsApp conectado com sucesso!');
            this.isConnected = true;
            this.status = 'connected';
            this.qrCode = null;
            this.qrCodeImage = null;
            
            if (this.callbacks.onReady) {
                this.callbacks.onReady();
            }
        });

        // Evento: Cliente desconectado
        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp desconectado:', reason);
            this.isConnected = false;
            this.status = 'disconnected';
            this.qrCode = null;
            this.qrCodeImage = null;
            
            if (this.callbacks.onDisconnected) {
                this.callbacks.onDisconnected(reason);
            }
        });

        // Evento: Mensagem recebida
        this.client.on('message', (message) => {
            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(message);
            }
        });

        // Evento: Erro de autenticação
        this.client.on('auth_failure', (msg) => {
            console.error('Falha na autenticação:', msg);
            this.status = 'auth_failure';
        });

        // Evento: Cliente carregado
        this.client.on('loading_screen', (percent, message) => {
            console.log(`Carregando: ${percent}% - ${message}`);
            this.status = 'loading';
        });
    }

    // Conectar WhatsApp
    async connect() {
        try {
            if (!this.client) {
                this.initialize();
            }

            if (this.isConnected) {
                return { success: true, message: 'WhatsApp já está conectado' };
            }

            await this.client.initialize();
            this.status = 'connecting';
            
            return { success: true, message: 'Iniciando conexão com WhatsApp...' };
        } catch (error) {
            console.error('Erro ao conectar WhatsApp:', error);
            this.status = 'error';
            return { success: false, message: 'Erro ao conectar: ' + error.message };
        }
    }

    // Desconectar WhatsApp
    async disconnect() {
        try {
            if (this.client && this.isConnected) {
                await this.client.destroy();
                this.client = null;
                this.isConnected = false;
                this.status = 'disconnected';
                this.qrCode = null;
                this.qrCodeImage = null;
                
                return { success: true, message: 'WhatsApp desconectado com sucesso' };
            }
            
            return { success: true, message: 'WhatsApp já estava desconectado' };
        } catch (error) {
            console.error('Erro ao desconectar WhatsApp:', error);
            return { success: false, message: 'Erro ao desconectar: ' + error.message };
        }
    }

    // Obter status da conexão
    getStatus() {
        return {
            isConnected: this.isConnected,
            status: this.status,
            qrCode: this.qrCodeImage,
            hasQR: !!this.qrCodeImage
        };
    }

    // Enviar mensagem
    async sendMessage(number, message) {
        try {
            // Aguardar WhatsApp estar pronto
            await this.waitForReady();

            if (!this.isConnected) {
                return { success: false, message: 'WhatsApp não está conectado' };
            }

            // Formatar número corretamente
            const formattedNumber = this.formatPhoneNumber(number);
            const chatId = `${formattedNumber}@c.us`;
            
            console.log(`Enviando mensagem para: ${chatId}`);
            console.log(`Mensagem: ${message}`);
            
            // Aguardar um pouco para garantir que o WhatsApp está estável
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar se o chat existe antes de enviar
            const isRegistered = await this.client.isRegisteredUser(chatId);
            if (!isRegistered) {
                return { 
                    success: false, 
                    message: `Número ${formattedNumber} não está registrado no WhatsApp` 
                };
            }
            
            const result = await this.client.sendMessage(chatId, message);
            
            return { 
                success: true, 
                message: 'Mensagem enviada com sucesso',
                messageId: result.id._serialized
            };
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            return { success: false, message: 'Erro ao enviar mensagem: ' + error.message };
        }
    }

    // Configurar callbacks
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Obter informações do cliente
    async getClientInfo() {
        try {
            if (!this.isConnected) {
                return null;
            }

            const info = await this.client.info;
            return {
                wid: info.wid._serialized,
                pushname: info.pushname,
                platform: info.platform
            };
        } catch (error) {
            console.error('Erro ao obter informações do cliente:', error);
            return null;
        }
    }

    // Verificar se está dentro do horário de funcionamento
    isWithinBusinessHours() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc.
        const currentTime = now.getHours() * 60 + now.getMinutes(); // minutos desde meia-noite

        // Horários padrão (pode ser configurado via banco de dados)
        const businessHours = {
            1: { start: 8 * 60, end: 18 * 60 }, // Segunda: 8h às 18h
            2: { start: 8 * 60, end: 18 * 60 }, // Terça: 8h às 18h
            3: { start: 8 * 60, end: 18 * 60 }, // Quarta: 8h às 18h
            4: { start: 8 * 60, end: 18 * 60 }, // Quinta: 8h às 18h
            5: { start: 8 * 60, end: 18 * 60 }, // Sexta: 8h às 18h
            6: { start: 8 * 60, end: 12 * 60 }, // Sábado: 8h às 12h
            0: { start: 0, end: 0 } // Domingo: fechado
        };

        const todayHours = businessHours[dayOfWeek];
        if (!todayHours || todayHours.start === todayHours.end) {
            return false; // Fechado
        }

        return currentTime >= todayHours.start && currentTime <= todayHours.end;
    }

    // Formatar número de telefone para WhatsApp
    formatPhoneNumber(phoneNumber) {
        // Remove todos os caracteres não numéricos
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // Se começar com 55 (Brasil), mantém
        if (cleaned.startsWith('55')) {
            return cleaned;
        }
        
        // Se começar com 0, remove o 0 e adiciona 55
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // Se não começar com 55, adiciona
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        
        return cleaned;
    }

    // Aguardar WhatsApp estar pronto
    async waitForReady() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve(true);
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timeout: WhatsApp não ficou pronto a tempo'));
            }, 30000); // 30 segundos

            const checkReady = () => {
                if (this.isConnected) {
                    clearTimeout(timeout);
                    resolve(true);
                } else {
                    setTimeout(checkReady, 1000);
                }
            };

            checkReady();
        });
    }

    // Testar conectividade do WhatsApp
    async testConnection() {
        try {
            if (!this.client || !this.isConnected) {
                return { success: false, message: 'WhatsApp não está conectado' };
            }

            // Tentar obter informações do cliente para testar a conexão
            const info = await this.client.info;
            if (info && info.wid) {
                return { 
                    success: true, 
                    message: 'WhatsApp conectado e funcionando',
                    clientInfo: {
                        wid: info.wid._serialized,
                        pushname: info.pushname,
                        platform: info.platform
                    }
                };
            } else {
                return { success: false, message: 'WhatsApp conectado mas não está respondendo' };
            }
        } catch (error) {
            console.error('Erro ao testar conexão:', error);
            return { success: false, message: 'Erro ao testar conexão: ' + error.message };
        }
    }

    // Enviar mensagem automática baseada no horário
    async sendAutomaticMessage(contactNumber, welcomeMessage, outOfHoursMessage) {
        try {
            // Aguardar WhatsApp estar pronto
            await this.waitForReady();

            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp não está conectado');
            }

            const isWithinHours = this.isWithinBusinessHours();
            const message = isWithinHours ? welcomeMessage : outOfHoursMessage;

            if (!message || message.trim() === '') {
                console.log('Nenhuma mensagem automática configurada');
                return { success: false, message: 'Nenhuma mensagem automática configurada' };
            }

            // Formatar número corretamente
            const formattedNumber = this.formatPhoneNumber(contactNumber);
            const chatId = `${formattedNumber}@c.us`;
            
            console.log(`Enviando mensagem para: ${chatId}`);
            console.log(`Mensagem: ${message}`);
            
            // Aguardar um pouco para garantir que o WhatsApp está estável
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verificar se o chat existe antes de enviar
            const isRegistered = await this.client.isRegisteredUser(chatId);
            if (!isRegistered) {
                throw new Error(`Número ${formattedNumber} não está registrado no WhatsApp`);
            }

            await this.client.sendMessage(chatId, message);
            
            console.log(`Mensagem automática enviada para ${formattedNumber}: ${isWithinHours ? 'boas-vindas' : 'fora do horário'}`);
            return { success: true, messageType: isWithinHours ? 'welcome' : 'outOfHours' };
        } catch (error) {
            console.error('Erro ao enviar mensagem automática:', error);
            throw error;
        }
    }
}

// Instância singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
