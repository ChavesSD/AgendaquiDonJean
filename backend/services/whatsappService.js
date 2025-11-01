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

        // Configuração do Puppeteer otimizada para Railway/produção (Linux)
        // As dependências do sistema devem estar instaladas via Dockerfile
        const puppeteerOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-images',
                '--disable-javascript',
                '--disable-default-apps',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-software-rasterizer',
                '--disable-background-networking',
                '--disable-sync',
                '--metrics-recording-only',
                '--mute-audio'
            ],
            timeout: 60000,
            protocolTimeout: 60000
        };

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "don-jean-whatsapp"
            }),
            puppeteer: puppeteerOptions
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

    // Gerar novo QR Code (força nova conexão)
    async generateNewQRCode() {
        try {
            // Desconectar e limpar instância anterior se existir
            if (this.client) {
                console.log('Desconectando instância anterior para gerar novo QR...');
                await this.disconnect();
                // Aguardar um pouco para garantir desconexão
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Limpar estado
            this.isConnected = false;
            this.status = 'disconnected';
            this.qrCode = null;
            this.qrCodeImage = null;
            this.clientInfo = null;

            console.log('Criando nova instância do WhatsApp para novo QR...');
            
            // Criar nova instância com ID único
            const timestamp = Date.now();
            
            // Configuração do Puppeteer otimizada para Railway/produção (Linux)
            // As dependências do sistema devem estar instaladas via Dockerfile
            const puppeteerOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images',
                    '--disable-javascript',
                    '--disable-default-apps',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-software-rasterizer',
                    '--disable-background-networking',
                    '--disable-sync',
                    '--metrics-recording-only',
                    '--mute-audio'
                ],
                timeout: 60000,
                protocolTimeout: 60000
            };

            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `don-jean-whatsapp-${timestamp}`
                }),
                puppeteer: puppeteerOptions
            });

            // Evento: QR Code gerado
            this.client.on('qr', async (qr) => {
                console.log('NOVO QR Code gerado');
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
                console.log('Nova instância WhatsApp conectada com sucesso!');
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
                console.log('Nova instância desconectada:', reason);
                this.isConnected = false;
                this.status = 'disconnected';
                this.qrCode = null;
                this.qrCodeImage = null;
                this.clientInfo = null;
                
                if (this.callbacks.onDisconnected) {
                    this.callbacks.onDisconnected(reason);
                }
            });

            // Evento: Mensagem recebida
            this.client.on('message', message => {
                if (this.callbacks.onMessage) {
                    this.callbacks.onMessage(message);
                }
            });

            // Inicializar cliente
            await this.client.initialize();
            this.status = 'connecting';
            
            return { success: true, message: 'Gerando novo QR Code...' };
        } catch (error) {
            console.error('Erro ao gerar novo QR Code:', error);
            console.error('Detalhes do erro:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            this.status = 'error';
            
            // Mensagem de erro mais detalhada para troubleshooting
            let errorMessage = 'Erro ao gerar QR Code: ' + error.message;
            
            // Verificar se é erro de dependências do sistema
            if (error.message.includes('libnss3.so') || 
                error.message.includes('shared libraries') ||
                error.message.includes('cannot open shared object')) {
                errorMessage = 'Erro ao gerar QR Code: Dependências do sistema não encontradas. ' +
                              'Verifique se o Dockerfile está instalando todas as dependências necessárias para o Puppeteer. ' +
                              'Erro original: ' + error.message;
            }
            
            // Verificar se é erro de lançamento do navegador
            if (error.message.includes('Failed to launch') || 
                error.message.includes('No such file or directory')) {
                errorMessage = 'Erro ao gerar QR Code: Não foi possível iniciar o navegador. ' +
                              'Isso geralmente ocorre em ambientes Linux sem as dependências do Chrome instaladas. ' +
                              'Erro original: ' + error.message;
            }
            
            return { success: false, message: errorMessage };
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

    // Enviar mensagem com retry automático
    async sendMessage(number, message, retryCount = 0) {
        try {
            console.log('🚀 Iniciando envio de mensagem...');
            console.log('📱 Número recebido:', number);
            console.log('💬 Mensagem recebida:', message);
            console.log('🔗 Status da conexão:', this.isConnected);
            console.log('📊 Status geral:', this.status);
            
            // Aguardar WhatsApp estar pronto
            console.log('⏳ Aguardando WhatsApp estar pronto...');
            await this.waitForReady();
            console.log('✅ WhatsApp está pronto!');

            if (!this.isConnected) {
                console.log('❌ WhatsApp não está conectado');
                return { success: false, message: 'WhatsApp não está conectado' };
            }

            // Verificar se o WhatsApp está realmente funcionando
            console.log('🔍 Verificando funcionalidade do WhatsApp...');
            const functionalityCheck = await this.verifyWhatsAppFunctionality();
            if (!functionalityCheck.success) {
                console.log('❌ WhatsApp não está funcionando corretamente:', functionalityCheck.message);
                return { success: false, message: functionalityCheck.message };
            }
            console.log('✅ WhatsApp está funcionando corretamente');

            // Formatar número corretamente
            const formattedNumber = this.formatPhoneNumber(number);
            const chatId = `${formattedNumber}@c.us`;
            
            console.log(`📞 Número formatado: ${formattedNumber}`);
            console.log(`💬 Chat ID: ${chatId}`);
            console.log(`📝 Mensagem a ser enviada: ${message}`);
            
            // Aguardar um pouco para garantir que o WhatsApp está estável
            console.log('⏳ Aguardando estabilidade do WhatsApp...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar se o chat existe antes de enviar
            console.log('🔍 Verificando se o número está registrado no WhatsApp...');
            let isRegistered = false;
            try {
                isRegistered = await this.client.isRegisteredUser(chatId);
                console.log('📋 Número registrado:', isRegistered);
            } catch (registrationError) {
                console.log('⚠️ Erro ao verificar registro, tentando enviar mesmo assim:', registrationError.message);
                // Se der erro na verificação, tenta enviar mesmo assim
                isRegistered = true;
            }
            
            if (!isRegistered) {
                console.log('❌ Número não está registrado no WhatsApp');
                return { 
                    success: false, 
                    message: `Número ${formattedNumber} não está registrado no WhatsApp` 
                };
            }
            
            console.log('📤 Enviando mensagem via WhatsApp...');
            
            // Aguardar um pouco mais para garantir estabilidade
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const result = await this.client.sendMessage(chatId, message);
            console.log('✅ Mensagem enviada com sucesso!');
            console.log('🆔 ID da mensagem:', result.id._serialized);
            
            // Aguardar um pouco para verificar se a mensagem foi realmente entregue
            console.log('⏳ Aguardando confirmação de entrega...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Tentar verificar se a mensagem foi entregue
            try {
                const chat = await this.client.getChatById(chatId);
                const messages = await chat.fetchMessages({ limit: 1 });
                if (messages.length > 0) {
                    const lastMessage = messages[0];
                    console.log('📨 Última mensagem no chat:', {
                        id: lastMessage.id._serialized,
                        body: lastMessage.body?.substring(0, 50) + '...',
                        fromMe: lastMessage.fromMe
                    });
                }
            } catch (chatError) {
                console.log('⚠️ Não foi possível verificar entrega:', chatError.message);
            }
            
            return { 
                success: true, 
                message: 'Mensagem enviada com sucesso',
                messageId: result.id._serialized
            };
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            console.error('📊 Detalhes do erro:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Tratamento específico para erro de chat não encontrado
            if (error.message.includes('findChat: new chat not found')) {
                console.log('🔍 Erro específico: Chat não encontrado');
                return { 
                    success: false, 
                    message: 'Número não encontrado no WhatsApp. Verifique se o número está correto e se a pessoa tem WhatsApp instalado.' 
                };
            }
            
            // Tratamento específico para erro de número não registrado
            if (error.message.includes('not registered')) {
                console.log('🔍 Erro específico: Número não registrado');
                return { 
                    success: false, 
                    message: 'Número não está registrado no WhatsApp.' 
                };
            }
            
            // Tentar novamente se ainda não excedeu o limite de tentativas
            if (retryCount < 2) {
                console.log(`🔄 Tentativa ${retryCount + 1} falhou, tentando novamente em 5 segundos...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                return await this.sendMessage(number, message, retryCount + 1);
            }
            
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
        console.log('📞 Número original recebido:', phoneNumber);
        
        // Remove todos os caracteres não numéricos
        let cleaned = phoneNumber.replace(/\D/g, '');
        console.log('🧹 Número limpo:', cleaned);
        
        // Se começar com 0, remove o 0
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
            console.log('🔧 Removido 0 inicial:', cleaned);
        }
        
        // Se não começar com 55, adiciona código do Brasil
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
            console.log('🌍 Adicionado código do país:', cleaned);
        }
        
        // Lógica específica para números brasileiros
        if (cleaned.startsWith('55')) {
            // Remove o código do país para análise
            const withoutCountryCode = cleaned.substring(2);
            console.log('🇧🇷 Número sem código do país:', withoutCountryCode);
            
            // Verifica se é um número de celular brasileiro
            if (withoutCountryCode.length === 11) {
                // Número com 11 dígitos - pode ser DDD + 9 + 8 dígitos (formato antigo)
                // Verifica se o terceiro dígito é 9 (DDD + 9 + número)
                if (withoutCountryCode.charAt(2) === '9') {
                    // Remove o 9 adicional (terceiro dígito)
                    const ddd = withoutCountryCode.substring(0, 2);
                    const number = withoutCountryCode.substring(3);
                    cleaned = '55' + ddd + number;
                    console.log('📱 Removido 9 adicional do celular:', cleaned);
                } else {
                    console.log('✅ Número com 11 dígitos já no formato correto:', cleaned);
                }
            } else if (withoutCountryCode.length === 10) {
                // Número com 10 dígitos (formato correto: DDD + 8 dígitos)
                console.log('✅ Número já no formato correto:', cleaned);
            } else if (withoutCountryCode.length === 8) {
                // Número com 8 dígitos (apenas o número local)
                console.log('✅ Número local (8 dígitos):', cleaned);
            } else {
                console.log('⚠️ Número com formato inesperado:', withoutCountryCode);
            }
        }
        
        console.log('📱 Número final formatado:', cleaned);
        return cleaned;
    }

    // Aguardar WhatsApp estar pronto
    async waitForReady() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                console.log('✅ WhatsApp já está conectado');
                resolve(true);
                return;
            }

            console.log('⏳ Aguardando WhatsApp ficar pronto...');
            const timeout = setTimeout(() => {
                console.log('⏰ Timeout: WhatsApp não ficou pronto em 30 segundos');
                reject(new Error('Timeout: WhatsApp não ficou pronto a tempo'));
            }, 30000); // 30 segundos

            const checkReady = () => {
                console.log(`🔍 Verificando status: ${this.status}, conectado: ${this.isConnected}`);
                if (this.isConnected) {
                    console.log('✅ WhatsApp está pronto!');
                    clearTimeout(timeout);
                    resolve(true);
                } else if (this.status === 'disconnected' || this.status === 'error') {
                    console.log('❌ WhatsApp está desconectado ou com erro');
                    clearTimeout(timeout);
                    reject(new Error('WhatsApp está desconectado'));
                } else {
                    setTimeout(checkReady, 2000); // Verificar a cada 2 segundos
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

    // Verificar se o WhatsApp está realmente funcionando
    async verifyWhatsAppFunctionality() {
        try {
            if (!this.client || !this.isConnected) {
                return { success: false, message: 'WhatsApp não está conectado' };
            }

            // Tentar obter informações básicas
            const info = await this.client.info;
            if (!info || !info.wid) {
                return { success: false, message: 'WhatsApp não está respondendo' };
            }

            // Tentar obter chats para verificar se a API está funcionando
            const chats = await this.client.getChats();
            console.log(`📊 WhatsApp funcionando: ${chats.length} chats encontrados`);

            return { 
                success: true, 
                message: 'WhatsApp está funcionando corretamente',
                chatCount: chats.length
            };
        } catch (error) {
            console.error('Erro ao verificar funcionalidade do WhatsApp:', error);
            return { success: false, message: 'Erro ao verificar funcionalidade: ' + error.message };
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

    // Sincronizar contatos do WhatsApp
    async syncContacts() {
        try {
            console.log('🔄 Iniciando sincronização de contatos do WhatsApp...');
            
            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp não está conectado');
            }

            // Aguardar WhatsApp estar pronto
            await this.waitForReady();

            // Obter todos os chats
            const chats = await this.client.getChats();
            console.log(`📱 Encontrados ${chats.length} chats no WhatsApp`);

            const contacts = [];
            const Contact = require('../models/Contact');

            for (const chat of chats) {
                try {
                    // Pular grupos por enquanto (focar em contatos individuais)
                    if (chat.isGroup) {
                        continue;
                    }

                    const contactId = chat.id._serialized;
                    const phoneNumber = contactId.replace('@c.us', '');
                    
                    // Obter informações do contato
                    const contactInfo = await this.client.getContactById(contactId);
                    
                    if (contactInfo) {
                        const contactData = {
                            name: contactInfo.name || contactInfo.pushname || phoneNumber,
                            phone: phoneNumber,
                            whatsappId: contactId,
                            origin: 'whatsapp',
                            isActive: true,
                            lastInteraction: new Date(),
                            whatsappData: {
                                isGroup: chat.isGroup || false,
                                isBusiness: contactInfo.isBusiness || false,
                                status: contactInfo.status || '',
                                isOnline: contactInfo.isOnline || false
                            }
                        };

                        // Verificar se o contato já existe
                        const existingContact = await Contact.findOne({
                            $or: [
                                { whatsappId: contactId },
                                { phone: phoneNumber }
                            ]
                        });

                        if (existingContact) {
                            // Atualizar contato existente
                            await Contact.findByIdAndUpdate(existingContact._id, {
                                ...contactData,
                                lastSyncAt: new Date()
                            });
                            console.log(`✅ Contato atualizado: ${contactData.name}`);
                        } else {
                            // Criar novo contato
                            const newContact = new Contact({
                                ...contactData,
                                createdBy: 'system' // Será atualizado pelo usuário logado
                            });
                            await newContact.save();
                            console.log(`➕ Novo contato criado: ${contactData.name}`);
                        }

                        contacts.push(contactData);
                    }
                } catch (contactError) {
                    console.error(`❌ Erro ao processar contato:`, contactError.message);
                    continue;
                }
            }

            console.log(`✅ Sincronização concluída: ${contacts.length} contatos processados`);
            return {
                success: true,
                message: `Sincronização concluída com sucesso`,
                contactsCount: contacts.length,
                contacts: contacts
            };

        } catch (error) {
            console.error('❌ Erro na sincronização de contatos:', error);
            return {
                success: false,
                message: 'Erro na sincronização: ' + error.message
            };
        }
    }

    // Obter contatos do WhatsApp
    async getWhatsAppContacts() {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp não está conectado');
            }

            await this.waitForReady();
            const chats = await this.client.getChats();
            
            const contacts = [];
            for (const chat of chats) {
                if (!chat.isGroup) {
                    const contactId = chat.id._serialized;
                    const phoneNumber = contactId.replace('@c.us', '');
                    
                    try {
                        const contactInfo = await this.client.getContactById(contactId);
                        if (contactInfo) {
                            contacts.push({
                                id: contactId,
                                name: contactInfo.name || contactInfo.pushname || phoneNumber,
                                phone: phoneNumber,
                                isBusiness: contactInfo.isBusiness || false,
                                status: contactInfo.status || '',
                                isOnline: contactInfo.isOnline || false
                            });
                        }
                    } catch (contactError) {
                        console.error(`Erro ao obter contato ${contactId}:`, contactError.message);
                    }
                }
            }

            return {
                success: true,
                contacts: contacts,
                count: contacts.length
            };

        } catch (error) {
            console.error('Erro ao obter contatos do WhatsApp:', error);
            return {
                success: false,
                message: 'Erro ao obter contatos: ' + error.message
            };
        }
    }
}

// Instância singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
