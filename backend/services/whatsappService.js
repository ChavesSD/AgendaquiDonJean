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
            if (!this.isConnected) {
                return { success: false, message: 'WhatsApp não está conectado' };
            }

            // Formatar número (adicionar @c.us se necessário)
            const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
            
            const result = await this.client.sendMessage(formattedNumber, message);
            
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
}

// Instância singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
