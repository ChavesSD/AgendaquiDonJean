const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const whatsappService = require('./services/whatsappService');
const backupService = require('./services/backupService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar multer para upload de arquivos
const storage = multer.memoryStorage();

// Upload para imagens (avatar)
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos'), false);
        }
    }
});

// Upload para backups (arquivos ZIP)
const uploadBackup = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.originalname.toLowerCase().endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos ZIP são permitidos para backup'), false);
        }
    }
});

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets'))); // Para acessar imagens

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});
app.use('/api/auth', limiter);

// Conexão com MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chstudiobanco_db_user:VKwho9FvxKQiTO9E@cluster0.qj9gn8z.mongodb.net/ch-studio?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado ao MongoDB Atlas'))
.catch(err => {
    console.log('⚠️  Erro ao conectar MongoDB Atlas:', err.message);
    console.log('💡 Verifique suas credenciais e conexão com a internet');
});

// Modelos
const User = require('./models/User');
const CompanySettings = require('./models/CompanySettings');
const WhatsAppMessages = require('./models/WhatsAppMessages');
const Professional = require('./models/Professional');
const Service = require('./models/Service');
const Product = require('./models/Product');
const authService = require('./simple-auth');

// Rotas de autenticação
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar dados
        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário no MongoDB
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Verificar senha
        const bcrypt = require('bcryptjs');
        if (!user.password) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'ch-studio-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acesso necessário' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'ch-studio-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Middleware de permissões
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            const userRole = user.role || 'user';
            const permissions = {
                admin: {
                    canCreateUsers: true,
                    canCreateAdmin: true,
                    canAccessBackup: true,
                    canAccessAllPages: true
                },
                manager: {
                    canCreateUsers: true,
                    canCreateAdmin: false,
                    canAccessBackup: false,
                    canAccessAllPages: true
                },
                user: {
                    canCreateUsers: false,
                    canCreateAdmin: false,
                    canAccessBackup: false,
                    canAccessAllPages: false
                }
            };

            const userPermissions = permissions[userRole] || permissions.user;
            
            if (!userPermissions[permission]) {
                return res.status(403).json({ message: 'Você não tem permissão para realizar esta ação' });
            }

            next();
        } catch (error) {
            console.error('Erro na verificação de permissões:', error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    };
};

// Rota para verificar token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        // Buscar dados completos do usuário do banco
        const user = await User.findById(req.user.userId, { password: 0 });
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        res.json({ 
            valid: true, 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Rotas protegidas
app.get('/api/dashboard', authenticateToken, (req, res) => {
    res.json({ message: 'Dados do dashboard' });
});

// Rotas para configurações da empresa
app.get('/api/company-settings', authenticateToken, async (req, res) => {
    try {
        let settings = await CompanySettings.findOne();
        
        if (!settings) {
            // Criar configurações padrão se não existirem
            settings = new CompanySettings({
                companyName: 'CH Studio',
                cnpj: '',
                cep: '',
                street: '',
                number: '',
                neighborhood: '',
                city: '',
                state: ''
            });
            await settings.save();
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

app.put('/api/company-settings', authenticateToken, async (req, res) => {
    try {
        const {
            companyName,
            cnpj,
            cep,
            street,
            number,
            neighborhood,
            city,
            state,
            workingHours
        } = req.body;

        // Buscar ou criar configurações
        let settings = await CompanySettings.findOne();
        
        if (!settings) {
            settings = new CompanySettings();
        }

        // Atualizar dados da empresa apenas se fornecidos
        if (companyName !== undefined) settings.companyName = companyName;
        if (cnpj !== undefined) settings.cnpj = cnpj;
        if (cep !== undefined) settings.cep = cep;
        if (street !== undefined) settings.street = street;
        if (number !== undefined) settings.number = number;
        if (neighborhood !== undefined) settings.neighborhood = neighborhood;
        if (city !== undefined) settings.city = city;
        if (state !== undefined) settings.state = state;

        // Atualizar horário de funcionamento se fornecido
        if (workingHours) {
            if (!settings.workingHours) {
                settings.workingHours = {
                    weekdays: { open: '08:00', close: '18:00' },
                    saturday: { enabled: true, open: '08:00', close: '12:00' },
                    sunday: { enabled: false, open: '08:00', close: '12:00' }
                };
            }

            if (workingHours.weekdays) {
                settings.workingHours.weekdays = {
                    open: workingHours.weekdays.open || settings.workingHours.weekdays.open,
                    close: workingHours.weekdays.close || settings.workingHours.weekdays.close
                };
            }

            if (workingHours.saturday) {
                settings.workingHours.saturday = {
                    enabled: workingHours.saturday.enabled !== undefined ? workingHours.saturday.enabled : settings.workingHours.saturday.enabled,
                    open: workingHours.saturday.open || settings.workingHours.saturday.open,
                    close: workingHours.saturday.close || settings.workingHours.saturday.close
                };
            }

            if (workingHours.sunday) {
                settings.workingHours.sunday = {
                    enabled: workingHours.sunday.enabled !== undefined ? workingHours.sunday.enabled : settings.workingHours.sunday.enabled,
                    open: workingHours.sunday.open || settings.workingHours.sunday.open,
                    close: workingHours.sunday.close || settings.workingHours.sunday.close
                };
            }
        }

        await settings.save();

        res.json({ 
            message: 'Configurações salvas com sucesso',
            settings 
        });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Servir arquivos estáticos do frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Rota para criar usuário admin (apenas para desenvolvimento)
app.post('/api/auth/create-admin', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar se já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Usuário já existe' });
        }

        // Criar usuário admin
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        await user.save();

        res.json({ message: 'Usuário admin criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Rotas para gerenciamento de usuários
app.get('/api/users', authenticateToken, requirePermission('canCreateUsers'), async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Excluir senha do retorno
        console.log('Usuários encontrados:', users.map(u => ({ name: u.name, hasAvatar: !!u.avatar, avatarLength: u.avatar ? u.avatar.length : 0 })));
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

app.post('/api/users', authenticateToken, requirePermission('canCreateUsers'), upload.single('avatar'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const avatarFile = req.file;

        console.log('Dados recebidos:', { 
            name, 
            email, 
            password: password ? '***' : 'undefined', 
            role,
            hasAvatar: !!avatarFile
        });

        // Validar dados obrigatórios
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
        }

        // Verificar se email já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email já está em uso' });
        }

        // Verificar se gerente está tentando criar admin
        const currentUser = await User.findById(req.user.userId);
        if (currentUser.role === 'manager' && role === 'admin') {
            return res.status(403).json({ message: 'Gerentes não podem criar usuários administradores' });
        }

        // Processar avatar se fornecido
        let avatarUrl = '';
        if (avatarFile) {
            // Converter buffer para base64 para armazenamento simples
            avatarUrl = `data:${avatarFile.mimetype};base64,${avatarFile.buffer.toString('base64')}`;
            console.log('Avatar processado:', avatarUrl.substring(0, 50) + '...');
        } else {
            console.log('Nenhum arquivo de avatar recebido');
        }

        // Criar usuário
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user',
            avatar: avatarUrl
        });

        await user.save();
        
        console.log('Usuário criado com avatar:', {
            name: user.name,
            hasAvatar: !!user.avatar,
            avatarLength: user.avatar ? user.avatar.length : 0
        });

        // Retornar usuário sem senha
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ 
            message: 'Usuário criado com sucesso',
            user: userResponse
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar usuário por ID
        const user = await User.findById(id, { password: 0 }); // Excluir senha do retorno
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

app.put('/api/users/:id', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, password } = req.body;
        const avatarFile = req.file;

        console.log('Dados de atualização recebidos:', { 
            name, 
            email, 
            role, 
            password: password ? '***' : 'undefined',
            hasAvatar: !!avatarFile
        });

        // Verificar se usuário existe
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Verificar se é o usuário logado atual
        const isCurrentUser = user._id.toString() === req.user.userId;
        
        // Buscar dados do usuário logado para verificar se é admin
        const currentUser = await User.findById(req.user.userId);
        const isCurrentUserAdmin = currentUser.role === 'admin';
        
        // Admin pode editar qualquer usuário, outros usuários só podem editar a si mesmos
        if (!isCurrentUserAdmin && !isCurrentUser) {
            return res.status(403).json({ message: 'Apenas o próprio usuário pode editar seu perfil' });
        }

        // Verificar se email já está em uso por outro usuário
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email já está em uso' });
            }
        }

        // Atualizar usuário
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;

        // Processar avatar se fornecido
        if (avatarFile) {
            user.avatar = `data:${avatarFile.mimetype};base64,${avatarFile.buffer.toString('base64')}`;
            console.log('Avatar atualizado:', user.avatar.substring(0, 50) + '...');
        } else {
            console.log('Nenhum arquivo de avatar para atualização');
        }

        // Atualizar senha se fornecida
        if (password) {
            const bcrypt = require('bcryptjs');
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();
        
        console.log('Usuário salvo com avatar:', {
            name: user.name,
            hasAvatar: !!user.avatar,
            avatarLength: user.avatar ? user.avatar.length : 0
        });

        // Retornar usuário sem senha
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ 
            message: 'Usuário atualizado com sucesso',
            user: userResponse
        });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se usuário existe
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Verificar se é o usuário logado atual
        const isCurrentUser = user._id.toString() === req.user.userId;
        
        // Buscar dados do usuário logado para verificar se é admin
        const currentUser = await User.findById(req.user.userId);
        const isCurrentUserAdmin = currentUser.role === 'admin';
        
        // Se não for admin, não pode deletar o próprio usuário nem o admin original
        if (!isCurrentUserAdmin) {
            if (isCurrentUser) {
                return res.status(400).json({ message: 'Não é possível deletar seu próprio usuário' });
            }
            
            if (user.email === 'admin@chstudio.com' && user.name === 'Desenvolvedor') {
                return res.status(400).json({ message: 'Não é possível excluir o usuário administrador do sistema' });
            }
        }

        await User.findByIdAndDelete(id);

        res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS WHATSAPP ====================

// Obter status do WhatsApp
app.get('/api/whatsapp/status', authenticateToken, (req, res) => {
    try {
        const status = whatsappService.getStatus();
        res.json(status);
    } catch (error) {
        console.error('Erro ao obter status do WhatsApp:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Conectar WhatsApp
app.post('/api/whatsapp/connect', authenticateToken, async (req, res) => {
    try {
        const result = await whatsappService.connect();
        res.json(result);
    } catch (error) {
        console.error('Erro ao conectar WhatsApp:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Gerar QR Code
app.post('/api/whatsapp/generate-qr', authenticateToken, async (req, res) => {
    try {
        const result = await whatsappService.generateNewQRCode();
        res.json(result);
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Desconectar WhatsApp
app.post('/api/whatsapp/disconnect', authenticateToken, async (req, res) => {
    try {
        const result = await whatsappService.disconnect();
        res.json(result);
    } catch (error) {
        console.error('Erro ao desconectar WhatsApp:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Enviar mensagem
app.post('/api/whatsapp/send-message', authenticateToken, async (req, res) => {
    try {
        const { number, message } = req.body;
        
        if (!number || !message) {
            return res.status(400).json({ message: 'Número e mensagem são obrigatórios' });
        }

        const result = await whatsappService.sendMessage(number, message);
        res.json(result);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Obter informações do cliente
app.get('/api/whatsapp/client-info', authenticateToken, async (req, res) => {
    try {
        const info = await whatsappService.getClientInfo();
        res.json(info);
    } catch (error) {
        console.error('Erro ao obter informações do cliente:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS MENSAGENS AUTOMÁTICAS ====================

// Obter mensagens automáticas
app.get('/api/whatsapp/messages', authenticateToken, async (req, res) => {
    try {
        let messages = await WhatsAppMessages.findOne({ isActive: true });
        
        if (!messages) {
            // Criar mensagens padrão se não existirem
            messages = new WhatsAppMessages({
                welcomeMessage: 'Olá! Seja bem-vindo ao CH Studio! Como posso ajudá-lo?',
                outOfHoursMessage: 'Olá! Obrigado por entrar em contato. Estamos fora do horário de funcionamento. Retornaremos em breve!'
            });
            await messages.save();
        }
        
        res.json({
            welcomeMessage: messages.welcomeMessage,
            outOfHoursMessage: messages.outOfHoursMessage
        });
    } catch (error) {
        console.error('Erro ao obter mensagens automáticas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Salvar mensagens automáticas
app.put('/api/whatsapp/messages', authenticateToken, async (req, res) => {
    try {
        const { welcomeMessage, outOfHoursMessage } = req.body;
        
        if (!welcomeMessage && !outOfHoursMessage) {
            return res.status(400).json({ message: 'Pelo menos uma mensagem deve ser fornecida' });
        }
        
        let messages = await WhatsAppMessages.findOne({ isActive: true });
        
        if (!messages) {
            messages = new WhatsAppMessages();
        }
        
        if (welcomeMessage !== undefined) {
            messages.welcomeMessage = welcomeMessage;
        }
        
        if (outOfHoursMessage !== undefined) {
            messages.outOfHoursMessage = outOfHoursMessage;
        }
        
        await messages.save();
        
        res.json({ 
            message: 'Mensagens automáticas salvas com sucesso!',
            welcomeMessage: messages.welcomeMessage,
            outOfHoursMessage: messages.outOfHoursMessage
        });
    } catch (error) {
        console.error('Erro ao salvar mensagens automáticas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Enviar mensagem automática
app.post('/api/whatsapp/send-automatic', authenticateToken, async (req, res) => {
    try {
        const { number } = req.body;
        
        if (!number) {
            return res.status(400).json({ message: 'Número é obrigatório' });
        }

        // Testar conexão primeiro
        const connectionTest = await whatsappService.testConnection();
        if (!connectionTest.success) {
            return res.status(400).json({ message: connectionTest.message });
        }

        // Buscar mensagens automáticas
        const messages = await WhatsAppMessages.findOne({ isActive: true });
        if (!messages) {
            return res.status(404).json({ message: 'Mensagens automáticas não configuradas' });
        }

        const result = await whatsappService.sendAutomaticMessage(
            number, 
            messages.welcomeMessage, 
            messages.outOfHoursMessage
        );
        
        res.json(result);
    } catch (error) {
        console.error('Erro ao enviar mensagem automática:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Testar conexão do WhatsApp
app.get('/api/whatsapp/test-connection', authenticateToken, async (req, res) => {
    try {
        const result = await whatsappService.testConnection();
        res.json(result);
    } catch (error) {
        console.error('Erro ao testar conexão:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// WebSocket para atualizações em tempo real
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configurar callbacks do WhatsApp para WebSocket
whatsappService.setCallbacks({
    onQR: (qrCodeImage) => {
        io.emit('whatsapp_qr', { qrCode: qrCodeImage });
    },
    onReady: () => {
        io.emit('whatsapp_ready', { message: 'WhatsApp conectado com sucesso!' });
    },
    onDisconnected: (reason) => {
        io.emit('whatsapp_disconnected', { reason });
    },
    onMessage: (message) => {
        io.emit('whatsapp_message', { 
            from: message.from,
            body: message.body,
            timestamp: message.timestamp
        });
    }
});

// ==================== ROTAS DE BACKUP ====================

// Criar backup
app.post('/api/backup/create', authenticateToken, requirePermission('canAccessBackup'), async (req, res) => {
    try {
        const result = await backupService.createBackup();
        res.json(result);
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Listar backups
app.get('/api/backup/list', authenticateToken, requirePermission('canAccessBackup'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let backups;

        if (startDate || endDate) {
            backups = backupService.filterBackupsByDate(startDate, endDate);
        } else {
            backups = backupService.getBackups();
        }

        res.json({ success: true, backups });
    } catch (error) {
        console.error('Erro ao listar backups:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Restaurar backup
app.post('/api/backup/restore/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await backupService.restoreBackup(id);
        res.json(result);
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Deletar backup
app.delete('/api/backup/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = backupService.deleteBackup(id);
        res.json(result);
    } catch (error) {
        console.error('Erro ao deletar backup:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Download de backup
app.get('/api/backup/download/:id', authenticateToken, requirePermission('canAccessBackup'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = backupService.getBackupForDownload(id);
        
        if (!result.success) {
            return res.status(404).json({ message: result.message });
        }

        const backup = result.backup;
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(backup.filepath)) {
            return res.status(404).json({ message: 'Arquivo de backup não encontrado' });
        }

        // Configurar headers para download
        res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Length', backup.size);

        // Enviar arquivo
        const fileStream = fs.createReadStream(backup.filepath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Erro ao enviar arquivo:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Erro ao enviar arquivo' });
            }
        });

    } catch (error) {
        console.error('Erro no download do backup:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Importar backup
app.post('/api/backup/import', authenticateToken, requirePermission('canAccessBackup'), uploadBackup.single('backupFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado' });
        }

        console.log('Arquivo recebido:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        const result = await backupService.importBackup(req.file.buffer, req.file.originalname);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ message: result.message });
        }

    } catch (error) {
        console.error('Erro ao importar backup:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Manutenção do banco
app.post('/api/backup/maintenance', authenticateToken, requirePermission('canAccessBackup'), async (req, res) => {
    try {
        const result = await backupService.performMaintenance();
        res.json(result);
    } catch (error) {
        console.error('Erro na manutenção:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE PROFISSIONAIS ====================

// Listar profissionais
app.get('/api/professionals', authenticateToken, async (req, res) => {
    try {
        const professionals = await Professional.find().sort({ createdAt: -1 });
        res.json({ success: true, professionals });
    } catch (error) {
        console.error('Erro ao listar profissionais:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Criar profissional
app.post('/api/professionals', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            contact,
            email,
            address,
            function: professionalFunction,
            dailyCapacity,
            status,
            createUserAccount,
            userEmail,
            userPassword
        } = req.body;

        // Validar campos obrigatórios
        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'Nome e sobrenome são obrigatórios' });
        }

        // Processar foto se fornecida
        let photoUrl = null;
        if (req.file) {
            // Converter para base64
            const base64 = req.file.buffer.toString('base64');
            photoUrl = `data:${req.file.mimetype};base64,${base64}`;
        }

        // Criar profissional
        const professional = new Professional({
            firstName,
            lastName,
            contact,
            email,
            address,
            function: professionalFunction,
            dailyCapacity: parseInt(dailyCapacity) || 0,
            status: status || 'active',
            photo: photoUrl,
            userAccount: createUserAccount === 'true' || createUserAccount === true || createUserAccount === 'on',
            userEmail: (createUserAccount === 'true' || createUserAccount === true || createUserAccount === 'on') ? userEmail : null
        });

        // Se deve criar conta de usuário
        if (createUserAccount === 'true' || createUserAccount === true || createUserAccount === 'on') {
            console.log('Criando conta de usuário para profissional:', {
                userEmail,
                userPassword: userPassword ? '***' : 'undefined',
                firstName,
                lastName
            });

            if (!userEmail || !userPassword) {
                console.log('Erro: Email ou senha não fornecidos');
                return res.status(400).json({ message: 'Email e senha são obrigatórios para criar conta de usuário' });
            }

            // Verificar se email já existe
            const existingUser = await User.findOne({ email: userEmail });
            if (existingUser) {
                console.log('Erro: Email já existe:', userEmail);
                return res.status(400).json({ message: 'Este email já está em uso' });
            }

            // Criar usuário
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(userPassword, 10);
            
            const user = new User({
                name: `${firstName} ${lastName}`,
                email: userEmail,
                password: hashedPassword,
                role: 'user',
                avatar: photoUrl
            });

            try {
                await user.save();
                console.log('Usuário criado com sucesso:', user._id);
                professional.userId = user._id;
            } catch (userError) {
                console.error('Erro ao criar usuário:', userError);
                return res.status(500).json({ message: 'Erro ao criar conta de usuário' });
            }
        }

        await professional.save();

        res.json({ 
            success: true, 
            message: 'Profissional criado com sucesso',
            professional 
        });
    } catch (error) {
        console.error('Erro ao criar profissional:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Atualizar profissional
app.put('/api/professionals/:id', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            contact,
            email,
            address,
            function: professionalFunction,
            dailyCapacity,
            status,
            createUserAccount,
            userEmail,
            userPassword
        } = req.body;

        const professional = await Professional.findById(id);
        if (!professional) {
            return res.status(404).json({ message: 'Profissional não encontrado' });
        }

        // Atualizar dados básicos
        professional.firstName = firstName;
        professional.lastName = lastName;
        professional.contact = contact;
        professional.email = email;
        professional.address = address;
        professional.function = professionalFunction;
        professional.dailyCapacity = parseInt(dailyCapacity) || 0;
        professional.status = status;

        // Processar foto se fornecida
        if (req.file) {
            const base64 = req.file.buffer.toString('base64');
            professional.photo = `data:${req.file.mimetype};base64,${base64}`;
        }

        // Gerenciar conta de usuário
        if (createUserAccount === 'true' || createUserAccount === true || createUserAccount === 'on') {
            if (!userEmail) {
                return res.status(400).json({ message: 'Email é obrigatório para criar conta de usuário' });
            }

            if (professional.userId) {
                // Atualizar usuário existente
                const user = await User.findById(professional.userId);
                if (user) {
                    user.name = `${firstName} ${lastName}`;
                    user.email = userEmail;
                    if (userPassword) {
                        const bcrypt = require('bcryptjs');
                        user.password = await bcrypt.hash(userPassword, 10);
                    }
                    if (professional.photo) {
                        user.avatar = professional.photo;
                    }
                    await user.save();
                }
            } else {
                // Criar novo usuário
                const existingUser = await User.findOne({ email: userEmail });
                if (existingUser) {
                    return res.status(400).json({ message: 'Este email já está em uso' });
                }

                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash(userPassword || '123456', 10);
                
                const user = new User({
                    name: `${firstName} ${lastName}`,
                    email: userEmail,
                    password: hashedPassword,
                    role: 'user',
                    avatar: professional.photo
                });

                await user.save();
                professional.userId = user._id;
            }
            professional.userAccount = true;
            professional.userEmail = userEmail;
        } else {
            // Remover conta de usuário se existir
            if (professional.userId) {
                await User.findByIdAndDelete(professional.userId);
                professional.userId = null;
            }
            professional.userAccount = false;
            professional.userEmail = null;
        }

        await professional.save();

        res.json({ 
            success: true, 
            message: 'Profissional atualizado com sucesso',
            professional 
        });
    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Excluir profissional
app.delete('/api/professionals/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const professional = await Professional.findById(id);
        if (!professional) {
            return res.status(404).json({ message: 'Profissional não encontrado' });
        }

        // Excluir usuário associado se existir
        if (professional.userId) {
            await User.findByIdAndDelete(professional.userId);
        }

        await Professional.findByIdAndDelete(id);

        res.json({ 
            success: true, 
            message: 'Profissional excluído com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao excluir profissional:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE SERVIÇOS ====================

// Listar serviços
app.get('/api/services', authenticateToken, async (req, res) => {
    try {
        const services = await Service.find()
            .populate('professionals', 'firstName lastName function photo status')
            .sort({ createdAt: -1 });
        res.json({ success: true, services });
    } catch (error) {
        console.error('Erro ao listar serviços:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Criar serviço
app.post('/api/services', authenticateToken, async (req, res) => {
    try {
        const {
            name,
            description,
            status,
            duration,
            durationUnit,
            price,
            commission,
            professionals
        } = req.body;

        // Validar campos obrigatórios
        if (!name || !duration || !price || commission === undefined) {
            return res.status(400).json({ message: 'Nome, duração, preço e comissão são obrigatórios' });
        }

        // Validar profissionais se fornecidos
        let professionalIds = [];
        if (professionals && Array.isArray(professionals)) {
            // Verificar se todos os profissionais existem
            const existingProfessionals = await Professional.find({
                _id: { $in: professionals }
            });
            
            if (existingProfessionals.length !== professionals.length) {
                return res.status(400).json({ message: 'Um ou mais profissionais não foram encontrados' });
            }
            
            professionalIds = professionals;
        }

        // Criar serviço
        const service = new Service({
            name,
            description,
            status: status || 'active',
            duration: parseInt(duration),
            durationUnit: durationUnit || 'minutes',
            price: parseFloat(price),
            commission: parseFloat(commission),
            professionals: professionalIds,
            createdBy: req.user.userId
        });

        await service.save();

        res.json({ 
            success: true, 
            message: 'Serviço criado com sucesso',
            service 
        });
    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Atualizar serviço
app.put('/api/services/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            status,
            duration,
            durationUnit,
            price,
            commission,
            professionals
        } = req.body;

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({ message: 'Serviço não encontrado' });
        }

        // Validar profissionais se fornecidos
        let professionalIds = service.professionals;
        if (professionals && Array.isArray(professionals)) {
            // Verificar se todos os profissionais existem
            const existingProfessionals = await Professional.find({
                _id: { $in: professionals }
            });
            
            if (existingProfessionals.length !== professionals.length) {
                return res.status(400).json({ message: 'Um ou mais profissionais não foram encontrados' });
            }
            
            professionalIds = professionals;
        }

        // Atualizar dados
        service.name = name || service.name;
        service.description = description;
        service.status = status || service.status;
        service.duration = duration ? parseInt(duration) : service.duration;
        service.durationUnit = durationUnit || service.durationUnit;
        service.price = price ? parseFloat(price) : service.price;
        service.commission = commission !== undefined ? parseFloat(commission) : service.commission;
        service.professionals = professionalIds;
        service.updatedBy = req.user.userId;

        await service.save();

        res.json({ 
            success: true, 
            message: 'Serviço atualizado com sucesso',
            service 
        });
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Excluir serviço
app.delete('/api/services/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({ message: 'Serviço não encontrado' });
        }

        await Service.findByIdAndDelete(id);

        res.json({ 
            success: true, 
            message: 'Serviço excluído com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE PRODUTOS (ESTOQUE) ====================

// Listar produtos
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Criar produto
app.post('/api/products', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const {
            name,
            description,
            quantity,
            minQuantity,
            maxQuantity,
            unit,
            category
        } = req.body;

        // Validar campos obrigatórios
        if (!name || quantity === undefined) {
            return res.status(400).json({ message: 'Nome e quantidade são obrigatórios' });
        }

        // Processar foto se fornecida
        let photoUrl = null;
        if (req.file) {
            const base64 = req.file.buffer.toString('base64');
            photoUrl = `data:${req.file.mimetype};base64,${base64}`;
        }

        // Criar produto
        const product = new Product({
            name,
            description,
            quantity: parseInt(quantity) || 0,
            minQuantity: parseInt(minQuantity) || 0,
            maxQuantity: parseInt(maxQuantity) || 1000,
            unit: unit || 'unidade',
            category,
            photo: photoUrl,
            createdBy: req.user.userId
        });

        await product.save();

        res.json({ 
            success: true, 
            message: 'Produto criado com sucesso',
            product 
        });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Atualizar produto
app.put('/api/products/:id', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            quantity,
            minQuantity,
            maxQuantity,
            unit,
            category,
            status
        } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Atualizar dados
        product.name = name || product.name;
        product.description = description;
        product.quantity = quantity !== undefined ? parseInt(quantity) : product.quantity;
        product.minQuantity = minQuantity !== undefined ? parseInt(minQuantity) : product.minQuantity;
        product.maxQuantity = maxQuantity !== undefined ? parseInt(maxQuantity) : product.maxQuantity;
        product.unit = unit || product.unit;
        product.category = category;
        product.status = status || product.status;
        product.updatedBy = req.user.userId;

        // Processar foto se fornecida
        if (req.file) {
            const base64 = req.file.buffer.toString('base64');
            product.photo = `data:${req.file.mimetype};base64,${base64}`;
        }

        await product.save();

        res.json({ 
            success: true, 
            message: 'Produto atualizado com sucesso',
            product 
        });
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Excluir produto
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        await Product.findByIdAndDelete(id);

        res.json({ 
            success: true, 
            message: 'Produto excluído com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Adicionar estoque (entrada)
app.post('/api/products/:id/add-stock', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Quantidade deve ser maior que zero' });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        await product.addStock(parseInt(amount), reason || 'Entrada de estoque');

        res.json({ 
            success: true, 
            message: 'Estoque adicionado com sucesso',
            product 
        });
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Remover estoque (saída)
app.post('/api/products/:id/remove-stock', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Quantidade deve ser maior que zero' });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        if (product.quantity < amount) {
            return res.status(400).json({ message: 'Quantidade insuficiente em estoque' });
        }

        await product.removeStock(parseInt(amount), reason || 'Saída de estoque');

        res.json({ 
            success: true, 
            message: 'Estoque removido com sucesso',
            product 
        });
    } catch (error) {
        console.error('Erro ao remover estoque:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Obter estatísticas do estoque
app.get('/api/products/stats', authenticateToken, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ status: 'active' });
        const outOfStock = await Product.countDocuments({ quantity: { $lte: 0 } });
        const lowStock = await Product.countDocuments({
            $expr: {
                $lte: ['$quantity', '$minQuantity']
            },
            quantity: { $gt: 0 }
        });

        // Produtos por categoria
        const productsByCategory = await Product.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Produtos com estoque baixo
        const lowStockProducts = await Product.find({
            $expr: {
                $lte: ['$quantity', '$minQuantity']
            },
            status: 'active'
        }).select('name quantity minQuantity');

        res.json({
            success: true,
            stats: {
                totalProducts,
                activeProducts,
                outOfStock,
                lowStock,
                productsByCategory,
                lowStockProducts
            }
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ativo para atualizações em tempo real`);
});
