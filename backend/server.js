const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const whatsappService = require('./services/whatsappService');
const backupService = require('./services/backupService');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sem origin (healthchecks, postman, etc.)
        // Isso é necessário para healthchecks da Railway e outras ferramentas
        if (!origin) {
            return callback(null, true);
        }
        
        // Permitir acesso de qualquer IP da rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const isLocalNetwork = origin && (
            origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) ||
            origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/) ||
            origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/) ||
            origin.match(/^http:\/\/localhost:\d+$/) ||
            origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)
        );
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            process.env.CORS_ORIGIN,
            process.env.RAILWAY_STATIC_URL
        ].filter(Boolean);
        
        if (allowedOrigins.indexOf(origin) !== -1 || isLocalNetwork) {
            callback(null, true);
        } else {
            // Em produção, bloquear origens não autorizadas
            if (process.env.NODE_ENV === 'production') {
                console.warn(`🚫 CORS bloqueado em produção para origin: ${origin}`);
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            } else {
                console.log(`⚠️ CORS: Origin não autorizado em desenvolvimento, mas permitindo: ${origin}`);
                callback(null, true);
            }
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting (Configuração mais permissiva para desenvolvimento)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 requests por IP por janela (aumentado para desenvolvimento)
    message: {
        error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // máximo 20 tentativas de login por IP por janela (aumentado)
    message: {
        error: 'Muitas tentativas de login, tente novamente em 15 minutos.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // máximo 100 requests por IP por minuto (aumentado)
    message: {
        error: 'Muitas requisições de API, tente novamente em 1 minuto.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplicar rate limiting baseado no ambiente
if (process.env.NODE_ENV === 'production') {
    app.use(generalLimiter);
    app.use('/api/auth', authLimiter);
    app.use('/api', apiLimiter);
}

// Health check endpoint para Railway
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

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

// Rate limiting (usando a declaração já feita no topo do arquivo)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});
app.use('/api/auth', limiter);

// Conexão com MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chstudio';

if (!process.env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI não configurada! Usando banco local como fallback');
}

console.log('🔗 Tentando conectar ao MongoDB...');
console.log('📍 URI:', MONGODB_URI.substring(0, 50) + '...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => {
    console.error('❌ Erro ao conectar MongoDB:', err.message);
    console.log('💡 Verifique suas credenciais e conexão com a internet');
    console.log('🔍 URI usada:', MONGODB_URI);
    
    // Em produção, não sair do processo, apenas logar o erro
    if (process.env.NODE_ENV === 'production') {
        console.log('⚠️ Continuando sem conexão com banco de dados em produção');
    } else {
        process.exit(1);
    }
});

// Modelos
const User = require('./models/User');
const CompanySettings = require('./models/CompanySettings');
const WhatsAppMessages = require('./models/WhatsAppMessages');
const Professional = require('./models/Professional');
const Service = require('./models/Service');
const Product = require('./models/Product');
const Revenue = require('./models/Revenue');
const Expense = require('./models/Expense');
const PosMachine = require('./models/PosMachine');
const Sale = require('./models/Sale');
const Appointment = require('./models/Appointment');

// Função auxiliar para converter horário em minutos
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Função auxiliar para converter duração do serviço para minutos
function getServiceDurationInMinutes(service) {
    if (!service || !service.duration) return 0;
    
    if (service.durationUnit === 'hours') {
        return service.duration * 60; // Converter horas para minutos
    }
    
    return service.duration; // Já está em minutos
}

// Rotas de autenticação
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar dados
        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        // Verificar se MongoDB está conectado
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ MongoDB não está conectado! Estado:', mongoose.connection.readyState);
            return res.status(500).json({ message: 'Banco de dados não está disponível. Tente novamente em alguns instantes.' });
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
        const jwtSecret = process.env.JWT_SECRET || 'chave-temporaria-desenvolvimento-123456789';
        
        if (!process.env.JWT_SECRET) {
            console.warn('⚠️ JWT_SECRET não configurado! Usando chave temporária para desenvolvimento');
        }
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            jwtSecret,
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
        console.error('❌ Erro no login:', error);
        console.error('📋 Stack:', error.stack);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Middleware de autenticação
// ==================== FUNÇÕES UTILITÁRIAS ====================

// Função para excluir dados relacionados a um agendamento
async function deleteAppointmentRelatedData(appointmentId, clientName) {
    try {
        let totalDeleted = 0;
        
        // Excluir receitas do agendamento (incluindo comissões)
        const revenueResult = await Revenue.deleteMany({ appointmentId: appointmentId });
        totalDeleted += revenueResult.deletedCount;
        console.log(`✅ Receitas excluídas: ${revenueResult.deletedCount}`);
        
        // Excluir gastos relacionados ao agendamento (comissões)
        if (clientName) {
            const expenseResult = await Expense.deleteMany({ 
                name: { $regex: /Comissão.*/i },
                description: { $regex: clientName }
            });
            totalDeleted += expenseResult.deletedCount;
            console.log(`✅ Gastos de comissão excluídos: ${expenseResult.deletedCount}`);
        }
        
        return totalDeleted;
    } catch (error) {
        console.error('❌ Erro ao excluir dados relacionados:', error);
        throw error;
    }
}

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acesso necessário' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'chave-temporaria-desenvolvimento-123456789';
    
    if (!process.env.JWT_SECRET) {
        console.warn('⚠️ JWT_SECRET não configurado! Usando chave temporária para desenvolvimento');
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, jwtSecret, (err, user) => {
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
                companyName: 'Don Jean',
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
            whatsapp,
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
        if (whatsapp !== undefined) settings.whatsapp = whatsapp;

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

app.get('/public-booking.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public-booking.html'));
});

// Rotas públicas para a página de agendamento
app.get('/api/public/company-settings', async (req, res) => {
    try {
        let settings = await CompanySettings.findOne();
        
        if (!settings) {
            // Retornar configurações padrão se não existirem
            settings = {
                companyName: 'Don Jean',
                whatsapp: '(11) 99999-9999',
                workingHours: {
                    weekdays: { open: '08:00', close: '18:00' },
                    saturday: { enabled: false, open: '08:00', close: '12:00' },
                    sunday: { enabled: false, open: '08:00', close: '12:00' }
                },
                street: 'Rua das Flores',
                number: '123',
                neighborhood: 'Centro',
                city: 'São Paulo',
                state: 'SP'
            };
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Erro ao buscar configurações públicas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

app.get('/api/public/professionals', async (req, res) => {
    try {
        const professionals = await Professional.find({ status: 'active' }).select('firstName lastName function photo status');
        res.json({ success: true, professionals });
    } catch (error) {
        console.error('Erro ao buscar profissionais públicos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/public/services', async (req, res) => {
    try {
        const services = await Service.find({ status: 'active' })
            .select('name description status duration durationUnit price commission professionals');
        res.json({ success: true, services });
    } catch (error) {
        console.error('Erro ao buscar serviços públicos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/public/appointments', async (req, res) => {
    try {
        console.log('🔍 Buscando agendamentos para página pública...');
        
        const appointments = await Appointment.find({ 
            status: { $in: ['pending', 'confirmed'] } 
        })
        .populate('professional', 'firstName lastName')
        .populate('service', 'name duration durationUnit')
        .select('professional service date time status')
        .sort({ date: 1, time: 1 });
        
        console.log(`📋 Agendamentos ativos encontrados: ${appointments.length}`);
        appointments.forEach(apt => {
            const serviceDuration = apt.service.durationUnit === 'hours' ? 
                apt.service.duration * 60 : apt.service.duration;
            console.log(`📅 ${apt.date.toLocaleDateString('pt-BR')} ${apt.time} - ${apt.professional?.firstName} - ${apt.service?.name} (${serviceDuration}min) - Status: ${apt.status}`);
        });
        
        res.json({ success: true, appointments });
    } catch (error) {
        console.error('Erro ao buscar agendamentos públicos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota pública para criar agendamento
app.post('/api/public/appointments', async (req, res) => {
    try {
        console.log('📝 Recebendo dados do agendamento:', req.body);
        
        const {
            professionalId,
            serviceId,
            date,
            time,
            clientName,
            clientLastName,
            clientPhone
        } = req.body;

        console.log('🔍 Dados extraídos:', {
            professionalId,
            serviceId,
            date,
            time,
            clientName,
            clientLastName,
            clientPhone
        });

        // Validar dados obrigatórios
        if (!professionalId || !serviceId || !date || !time || !clientName || !clientPhone) {
            console.log('❌ Dados obrigatórios não fornecidos');
            return res.status(400).json({ 
                success: false, 
                message: 'Dados obrigatórios não fornecidos' 
            });
        }

        // Verificar se o profissional existe
        console.log('🔍 Verificando profissional:', professionalId);
        const professional = await Professional.findById(professionalId);
        if (!professional) {
            console.log('❌ Profissional não encontrado');
            return res.status(400).json({ 
                success: false, 
                message: 'Profissional não encontrado' 
            });
        }
        console.log('✅ Profissional encontrado:', professional.firstName);

        // Verificar se o serviço existe
        console.log('🔍 Verificando serviço:', serviceId);
        const service = await Service.findById(serviceId);
        if (!service) {
            console.log('❌ Serviço não encontrado');
            return res.status(400).json({ 
                success: false, 
                message: 'Serviço não encontrado' 
            });
        }
        console.log('✅ Serviço encontrado:', service.name);

        // Verificar se já existe agendamento que conflita com o horário solicitado
        // Considerando a duração do serviço (convertendo para minutos)
        const serviceDuration = getServiceDurationInMinutes(service); // em minutos
        const requestedStartMinutes = timeToMinutes(time);
        const requestedEndMinutes = requestedStartMinutes + serviceDuration;
        
        const conflictingAppointments = await Appointment.find({
            professional: professionalId,
            date: new Date(date),
            status: { $in: ['pending', 'confirmed'] }
        }).populate('service', 'duration durationUnit');
        
        for (const existingAppointment of conflictingAppointments) {
            const existingStartMinutes = timeToMinutes(existingAppointment.time);
            const existingServiceDuration = getServiceDurationInMinutes(existingAppointment.service);
            const existingEndMinutes = existingStartMinutes + existingServiceDuration;
            
            // Verificar sobreposição de horários
            // Novo agendamento não pode começar antes do anterior terminar
            // e não pode terminar depois do próximo começar
            if (requestedStartMinutes < existingEndMinutes && requestedEndMinutes > existingStartMinutes) {
                const serviceDurationText = service.durationUnit === 'hours' ? 
                    `${service.duration}h` : `${service.duration}min`;
                return res.status(400).json({ 
                    success: false, 
                    message: `Horário não disponível. O serviço "${service.name}" (${serviceDurationText}) conflita com um agendamento existente.` 
                });
            }
        }

        // Criar novo agendamento
        console.log('📝 Criando agendamento...');
        console.log('📊 Dados do agendamento:', {
            professional: professionalId,
            service: serviceId,
            date: new Date(date),
            time: time,
            clientName: clientName,
            clientLastName: clientLastName,
            clientPhone: clientPhone,
            status: 'pending',
            source: 'public_booking'
        });
        
        const appointment = new Appointment({
            professional: professionalId,
            service: serviceId,
            date: new Date(date),
            time: time,
            clientName: clientName,
            clientLastName: clientLastName,
            clientPhone: clientPhone,
            status: 'pending',
            source: 'public_booking'
        });

        console.log('💾 Salvando agendamento...');
        await appointment.save();
        console.log('✅ Agendamento salvo com ID:', appointment._id);

        // Popular os dados para retorno
        console.log('🔄 Populando dados...');
        await appointment.populate('professional', 'firstName lastName');
        await appointment.populate('service', 'name duration');
        console.log('✅ Dados populados');

        res.json({ 
            success: true, 
            message: 'Agendamento criado com sucesso',
            appointment: appointment
        });

    } catch (error) {
        console.error('💥 Erro ao criar agendamento público:', error);
        console.error('📊 Stack trace:', error.stack);
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor: ' + error.message
        });
    }
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
        console.log('🔌 Iniciando conexão manual do WhatsApp...');
        const result = await whatsappService.connect();
        res.json({
            ...result,
            message: 'Tentativa de conexão iniciada',
            status: 'connecting'
        });
    } catch (error) {
        console.error('❌ Erro ao conectar WhatsApp:', error);
        res.status(500).json({ 
            message: 'Erro ao conectar WhatsApp: ' + error.message,
            status: 'error'
        });
    }
});

// Verificar status do WhatsApp
app.get('/api/whatsapp/status', authenticateToken, async (req, res) => {
    try {
        const status = whatsappService.getStatus();
        const connectionTest = await whatsappService.testConnection();
        
        res.json({
            status: status,
            connectionTest: connectionTest,
            isReady: status.isConnected && connectionTest.success
        });
    } catch (error) {
        console.error('Erro ao verificar status do WhatsApp:', error);
        res.status(500).json({ 
            message: 'Erro ao verificar status',
            status: 'error'
        });
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
                welcomeMessage: 'Olá! Seja bem-vindo ao Don Jean! Como posso ajudá-lo?',
                outOfHoursMessage: 'Olá! Obrigado por entrar em contato. Estamos fora do horário de funcionamento. Retornaremos em breve!',
                confirmationMessage: 'Olá! Seu agendamento foi confirmado com sucesso! Aguardamos você no horário marcado.',
                cancellationMessage: 'Olá! Infelizmente seu agendamento foi cancelado. Entre em contato conosco para reagendar em outro horário.'
            });
            await messages.save();
        }
        
        res.json({
            welcomeMessage: messages.welcomeMessage,
            outOfHoursMessage: messages.outOfHoursMessage,
            confirmationMessage: messages.confirmationMessage,
            cancellationMessage: messages.cancellationMessage
        });
    } catch (error) {
        console.error('Erro ao obter mensagens automáticas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Salvar mensagens automáticas
app.put('/api/whatsapp/messages', authenticateToken, async (req, res) => {
    try {
        const { welcomeMessage, outOfHoursMessage, confirmationMessage, cancellationMessage } = req.body;
        
        if (!welcomeMessage && !outOfHoursMessage && !confirmationMessage && !cancellationMessage) {
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
        
        if (confirmationMessage !== undefined) {
            messages.confirmationMessage = confirmationMessage;
        }
        
        if (cancellationMessage !== undefined) {
            messages.cancellationMessage = cancellationMessage;
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

// Enviar mensagem de confirmação de agendamento
app.post('/api/whatsapp/send-confirmation', authenticateToken, async (req, res) => {
    try {
        const { number, appointmentDetails } = req.body;
        
        if (!number) {
            return res.status(400).json({ message: 'Número é obrigatório' });
        }

        // Verificar se WhatsApp está conectado
        const status = whatsappService.getStatus();
        console.log('🔍 Status do WhatsApp (confirmação):', status);
        
        if (!status.isConnected) {
            console.log('⚠️ WhatsApp não conectado, tentando conectar automaticamente...');
            
            // Tentar conectar automaticamente
            try {
                await whatsappService.connect();
                console.log('✅ Tentativa de conexão automática iniciada');
                
                // Aguardar um pouco para a conexão ser estabelecida
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Verificar novamente
                const newStatus = whatsappService.getStatus();
                if (!newStatus.isConnected) {
                    return res.status(400).json({ 
                        message: 'WhatsApp não está conectado. Acesse Configurações > WhatsApp para conectar primeiro.',
                        needsConnection: true,
                        details: 'Tentativa de conexão automática falhou'
                    });
                }
            } catch (connectError) {
                console.error('❌ Erro na conexão automática:', connectError);
                return res.status(400).json({ 
                    message: 'WhatsApp não está conectado. Acesse Configurações > WhatsApp para conectar primeiro.',
                    needsConnection: true,
                    details: 'Erro na conexão automática: ' + connectError.message
                });
            }
        }

        // Testar conexão primeiro
        const connectionTest = await whatsappService.testConnection();
        if (!connectionTest.success) {
            return res.status(400).json({ 
                message: connectionTest.message,
                needsConnection: true,
                details: 'Teste de conexão falhou'
            });
        }

        // Buscar mensagens automáticas
        const messages = await WhatsAppMessages.findOne({ isActive: true });
        if (!messages || !messages.confirmationMessage) {
            return res.status(404).json({ message: 'Mensagem de confirmação não configurada' });
        }

        // Personalizar mensagem com detalhes do agendamento se fornecidos
        let personalizedMessage = messages.confirmationMessage;
        if (appointmentDetails) {
            personalizedMessage = personalizedMessage
                .replace('{clientName}', appointmentDetails.clientName || 'Cliente')
                .replace('{serviceName}', appointmentDetails.serviceName || 'serviço')
                .replace('{date}', appointmentDetails.date || 'data')
                .replace('{time}', appointmentDetails.time || 'horário')
                .replace('{professionalName}', appointmentDetails.professionalName || 'profissional');
        }

        const result = await whatsappService.sendMessage(number, personalizedMessage);
        
        res.json(result);
    } catch (error) {
        console.error('Erro ao enviar mensagem de confirmação:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Enviar mensagem de cancelamento de agendamento
app.post('/api/whatsapp/send-cancellation', authenticateToken, async (req, res) => {
    try {
        const { number, appointmentDetails } = req.body;
        
        if (!number) {
            return res.status(400).json({ message: 'Número é obrigatório' });
        }

        // Verificar se WhatsApp está conectado
        const status = whatsappService.getStatus();
        console.log('🔍 Status do WhatsApp (cancelamento):', status);
        
        if (!status.isConnected) {
            console.log('⚠️ WhatsApp não conectado, tentando conectar automaticamente...');
            
            // Tentar conectar automaticamente
            try {
                await whatsappService.connect();
                console.log('✅ Tentativa de conexão automática iniciada');
                
                // Aguardar um pouco para a conexão ser estabelecida
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Verificar novamente
                const newStatus = whatsappService.getStatus();
                if (!newStatus.isConnected) {
                    return res.status(400).json({ 
                        message: 'WhatsApp não está conectado. Acesse Configurações > WhatsApp para conectar primeiro.',
                        needsConnection: true,
                        details: 'Tentativa de conexão automática falhou'
                    });
                }
            } catch (connectError) {
                console.error('❌ Erro na conexão automática:', connectError);
                return res.status(400).json({ 
                    message: 'WhatsApp não está conectado. Acesse Configurações > WhatsApp para conectar primeiro.',
                    needsConnection: true,
                    details: 'Erro na conexão automática: ' + connectError.message
                });
            }
        }

        // Testar conexão primeiro
        const connectionTest = await whatsappService.testConnection();
        if (!connectionTest.success) {
            return res.status(400).json({ 
                message: connectionTest.message,
                needsConnection: true,
                details: 'Teste de conexão falhou'
            });
        }

        // Buscar mensagens automáticas
        const messages = await WhatsAppMessages.findOne({ isActive: true });
        if (!messages || !messages.cancellationMessage) {
            return res.status(404).json({ message: 'Mensagem de cancelamento não configurada' });
        }

        // Personalizar mensagem com detalhes do agendamento se fornecidos
        let personalizedMessage = messages.cancellationMessage;
        if (appointmentDetails) {
            personalizedMessage = personalizedMessage
                .replace('{clientName}', appointmentDetails.clientName || 'Cliente')
                .replace('{serviceName}', appointmentDetails.serviceName || 'serviço')
                .replace('{date}', appointmentDetails.date || 'data')
                .replace('{time}', appointmentDetails.time || 'horário')
                .replace('{professionalName}', appointmentDetails.professionalName || 'profissional');
        }

        const result = await whatsappService.sendMessage(number, personalizedMessage);
        
        res.json(result);
    } catch (error) {
        console.error('Erro ao enviar mensagem de cancelamento:', error);
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

// WhatsApp será conectado manualmente via interface
console.log('📱 WhatsApp: Aguardando conexão manual via interface');
console.log('💡 Acesse Configurações > WhatsApp para conectar');

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

// ==================== ROTAS DE SERVIÇOS ====================

// Estatísticas dos serviços para Dashboard (dados gerais - sem filtro de usuário)
app.get('/api/dashboard/services/stats', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, limit = 5 } = req.query;
        
        console.log('📊 Dashboard: API /api/dashboard/services/stats chamada');
        console.log('📅 Parâmetros:', { startDate, endDate, limit });
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.$gte = new Date(startDate);
            if (endDate) dateFilter.date.$lte = new Date(endDate);
        }

        console.log('🔍 Filtro de data:', dateFilter);

        // DASHBOARD: SEM FILTRO DE USUÁRIO - sempre dados gerais
        console.log('📊 Dashboard: Exibindo dados gerais de serviços (sem filtro de usuário)');

        // Buscar agendamentos com filtro de data (todos os status para Dashboard)
        const appointments = await Appointment.find({
            ...dateFilter
            // Removido filtro de status para mostrar todos os agendamentos no Dashboard
        })
            .populate('service', 'name price duration')
            .select('service');

        console.log('📅 Agendamentos encontrados:', appointments.length);

        // Contar agendamentos por serviço
        const serviceCounts = {};
        appointments.forEach(apt => {
            if (apt.service && apt.service._id) {
                const serviceId = apt.service._id.toString();
                if (!serviceCounts[serviceId]) {
                    serviceCounts[serviceId] = {
                        service: apt.service,
                        count: 0
                    };
                }
                serviceCounts[serviceId].count++;
            }
        });

        console.log('🛍️ Contagem por serviço:', Object.keys(serviceCounts).length);

        // Converter para array e ordenar por count
        const servicesWithCounts = Object.values(serviceCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, parseInt(limit));

        console.log('🏆 Top serviços retornados:', servicesWithCounts.length);

        res.json({ success: true, services: servicesWithCounts });
    } catch (error) {
        console.error('💥 Erro ao buscar estatísticas de serviços do dashboard:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Estatísticas dos serviços (para dashboard)
app.get('/api/services/stats', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, limit = 5 } = req.query;
        
        console.log('📊 API /api/services/stats chamada');
        console.log('📅 Parâmetros:', { startDate, endDate, limit });
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.$gte = new Date(startDate);
            if (endDate) dateFilter.date.$lte = new Date(endDate);
        }

        console.log('🔍 Filtro de data:', dateFilter);

        // Buscar agendamentos com filtro de data e status concluído
        const appointments = await Appointment.find({
            ...dateFilter,
            status: 'completed' // Apenas agendamentos concluídos
        })
            .populate('service', 'name price duration')
            .select('service');

        console.log('📅 Agendamentos encontrados:', appointments.length);

        // Contar agendamentos por serviço
        const serviceCounts = {};
        appointments.forEach(apt => {
            if (apt.service && apt.service._id) {
                const serviceId = apt.service._id.toString();
                if (!serviceCounts[serviceId]) {
                    serviceCounts[serviceId] = {
                        service: apt.service,
                        count: 0
                    };
                }
                serviceCounts[serviceId].count++;
            }
        });

        console.log('🛍️ Contagem por serviço:', Object.keys(serviceCounts).length);

        // Converter para array e ordenar por count
        const servicesWithCounts = Object.values(serviceCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, parseInt(limit));

        console.log('🏆 Top serviços retornados:', servicesWithCounts.length);

        res.json({
            success: true,
            services: servicesWithCounts
        });
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas dos serviços:', error);
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

// Estatísticas dos profissionais para Dashboard (dados gerais - sem filtro de usuário)
app.get('/api/dashboard/professionals/stats', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, limit = 5 } = req.query;
        
        console.log('📊 Dashboard: API /api/dashboard/professionals/stats chamada');
        console.log('📅 Parâmetros:', { startDate, endDate, limit });
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.$gte = new Date(startDate);
            if (endDate) dateFilter.date.$lte = new Date(endDate);
        }

        console.log('🔍 Filtro de data:', dateFilter);

        // DASHBOARD: SEM FILTRO DE USUÁRIO - sempre dados gerais
        console.log('📊 Dashboard: Exibindo dados gerais de profissionais (sem filtro de usuário)');

        // Buscar agendamentos com filtro de data (todos os status para Dashboard)
        const appointments = await Appointment.find({
            ...dateFilter
            // Removido filtro de status para mostrar todos os agendamentos no Dashboard
        })
            .populate('professional', 'firstName lastName photo function')
            .select('professional');

        console.log('📅 Agendamentos finalizados encontrados:', appointments.length);

        // Contar agendamentos por profissional
        const professionalCounts = {};
        appointments.forEach(apt => {
            if (apt.professional && apt.professional._id) {
                const profId = apt.professional._id.toString();
                if (!professionalCounts[profId]) {
                    professionalCounts[profId] = {
                        professional: apt.professional,
                        count: 0
                    };
                }
                professionalCounts[profId].count++;
            }
        });

        console.log('👥 Contagem por profissional (apenas finalizados):', Object.keys(professionalCounts).length);

        // Converter para array e ordenar por count
        let professionalsWithCounts = Object.values(professionalCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, parseInt(limit));

        // Se não há profissionais com agendamentos, buscar todos os profissionais ativos
        if (professionalsWithCounts.length === 0) {
            console.log('📋 Nenhum profissional com agendamentos encontrado, buscando todos os profissionais ativos...');
            const allProfessionals = await Professional.find({ status: 'active' })
                .select('firstName lastName photo function')
                .limit(parseInt(limit));
            
            professionalsWithCounts = allProfessionals.map(prof => ({
                professional: prof,
                count: 0
            }));
        }

        console.log('🏆 Top profissionais retornados:', professionalsWithCounts.length);

        res.json({ success: true, professionals: professionalsWithCounts });
    } catch (error) {
        console.error('💥 Erro ao buscar estatísticas de profissionais do dashboard:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Estatísticas dos profissionais (para dashboard)
app.get('/api/professionals/stats', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, limit = 5 } = req.query;
        
        console.log('📊 API /api/professionals/stats chamada');
        console.log('📅 Parâmetros:', { startDate, endDate, limit });
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.$gte = new Date(startDate);
            if (endDate) dateFilter.date.$lte = new Date(endDate);
        }

        console.log('🔍 Filtro de data:', dateFilter);

        // Buscar agendamentos com filtro de data e apenas os finalizados
        const appointments = await Appointment.find({
            ...dateFilter,
            status: 'completed'
        })
            .populate('professional', 'firstName lastName photo function')
            .select('professional');

        console.log('📅 Agendamentos finalizados encontrados:', appointments.length);

        // Contar agendamentos por profissional
        const professionalCounts = {};
        appointments.forEach(apt => {
            if (apt.professional && apt.professional._id) {
                const profId = apt.professional._id.toString();
                if (!professionalCounts[profId]) {
                    professionalCounts[profId] = {
                        professional: apt.professional,
                        count: 0
                    };
                }
                professionalCounts[profId].count++;
            }
        });

        console.log('👥 Contagem por profissional (apenas finalizados):', Object.keys(professionalCounts).length);

        // Converter para array e ordenar por count
        let professionalsWithCounts = Object.values(professionalCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, parseInt(limit));

        // Se não há profissionais com agendamentos, buscar todos os profissionais ativos
        if (professionalsWithCounts.length === 0) {
            console.log('📭 Nenhum profissional com agendamentos, buscando todos os profissionais ativos...');
            const allProfessionals = await Professional.find({ status: 'active' })
                .select('firstName lastName photo function')
                .limit(parseInt(limit));
            
            professionalsWithCounts = allProfessionals.map(professional => ({
                professional,
                count: 0
            }));
            
            console.log('👥 Profissionais ativos encontrados:', professionalsWithCounts.length);
        }

        console.log('🏆 Top profissionais retornados:', professionalsWithCounts.length);

        res.json({
            success: true,
            professionals: professionalsWithCounts
        });
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas dos profissionais:', error);
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

// Obter histórico de movimentações
app.get('/api/products/history', authenticateToken, async (req, res) => {
    try {
        const products = await Product.find().select('name category movements');
        
        const history = [];
        
        for (const product of products) {
            for (const movement of product.movements) {
                // Buscar dados do usuário
                let userName = 'Usuário Desconhecido';
                try {
                    const user = await User.findById(movement.user);
                    if (user) {
                        userName = user.name;
                    }
                } catch (userError) {
                    console.log('Usuário não encontrado:', movement.user);
                }
                
                history.push({
                    productId: product._id,
                    productName: product.name,
                    productCategory: product.category,
                    type: movement.type,
                    quantity: movement.quantity,
                    reason: movement.reason,
                    notes: movement.notes,
                    userName: userName,
                    date: movement.date
                });
            }
        }
        
        // Ordenar por data (mais recente primeiro)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({ success: true, history });
    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Obter produto por ID
app.get('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        res.json({ success: true, product });
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Criar produto
app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const {
            name,
            category,
            description,
            quantity,
            minQuantity,
            price,
            supplier,
            status,
            photo
        } = req.body;

        // Validar campos obrigatórios
        if (!name || !quantity || !minQuantity) {
            return res.status(400).json({ message: 'Nome, quantidade e quantidade mínima são obrigatórios' });
        }

        // Validar URL da foto se fornecida
        let photoUrl = null;
        if (photo && photo.trim()) {
            try {
                new URL(photo);
                photoUrl = photo.trim();
            } catch (error) {
                return res.status(400).json({ message: 'URL da foto inválida' });
            }
        }

        // Criar produto
        const product = new Product({
            name,
            category,
            description,
            quantity: parseInt(quantity),
            minQuantity: parseInt(minQuantity),
            price: parseFloat(price) || 0,
            supplier,
            status: status || 'active',
            photo: photoUrl
        });

        // Adicionar movimentação inicial de entrada
        if (parseInt(quantity) > 0) {
            product.movements.push({
                type: 'entrada',
                quantity: parseInt(quantity),
                reason: 'Estoque inicial',
                notes: 'Produto adicionado ao sistema',
                user: req.user.userId,
                date: new Date()
            });
        }

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
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            category,
            description,
            quantity,
            minQuantity,
            price,
            supplier,
            status,
            photo
        } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Calcular diferença de quantidade
        const oldQuantity = product.quantity;
        const newQuantity = parseInt(quantity);
        const quantityDifference = newQuantity - oldQuantity;

        // Atualizar dados básicos
        product.name = name || product.name;
        product.category = category;
        product.description = description;
        product.minQuantity = parseInt(minQuantity) || product.minQuantity;
        product.price = parseFloat(price) || product.price;
        product.supplier = supplier;
        product.status = status || product.status;

        // Validar e atualizar URL da foto se fornecida
        if (photo !== undefined) {
            if (photo && photo.trim()) {
                try {
                    new URL(photo);
                    product.photo = photo.trim();
                } catch (error) {
                    return res.status(400).json({ message: 'URL da foto inválida' });
                }
            } else {
                product.photo = null;
            }
        }

        // Adicionar movimentação se quantidade mudou
        if (quantityDifference !== 0) {
            product.movements.push({
                type: quantityDifference > 0 ? 'entrada' : 'saida',
                quantity: Math.abs(quantityDifference),
                reason: quantityDifference > 0 ? 'Ajuste de estoque (entrada)' : 'Ajuste de estoque (saída)',
                notes: `Quantidade ajustada de ${oldQuantity} para ${newQuantity}`,
                user: req.user.userId,
                date: new Date()
            });
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

// Adicionar itens ao produto
app.post('/api/products/:id/add-items', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason, notes } = req.body;

        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Quantidade deve ser maior que zero' });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Atualizar quantidade
        product.quantity += quantity;

        // Adicionar movimentação
        product.movements.push({
            type: 'entrada',
            quantity: quantity,
            reason: reason || 'Adição de itens',
            notes: notes || '',
            user: req.user.userId,
            date: new Date()
        });

        await product.save();

        res.json({ 
            success: true, 
            message: 'Itens adicionados com sucesso',
            product 
        });
    } catch (error) {
        console.error('Erro ao adicionar itens:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Retirar produto do estoque
app.post('/api/products/withdraw', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity, reason, notes } = req.body;

        // Validar dados
        if (!productId || !quantity || !reason) {
            return res.status(400).json({ message: 'ID do produto, quantidade e motivo são obrigatórios' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        const withdrawalQuantity = parseInt(quantity);
        if (withdrawalQuantity <= 0) {
            return res.status(400).json({ message: 'Quantidade deve ser maior que zero' });
        }

        if (withdrawalQuantity > product.quantity) {
            return res.status(400).json({ message: 'Quantidade solicitada maior que o estoque disponível' });
        }

        // Adicionar movimentação de saída
        product.movements.push({
            type: 'saida',
            quantity: withdrawalQuantity,
            reason,
            notes: notes || '',
            user: req.user.userId,
            date: new Date()
        });

        await product.save();

        res.json({ 
            success: true, 
            message: `${withdrawalQuantity} unidades retiradas do estoque com sucesso`,
            product 
        });
    } catch (error) {
        console.error('Erro ao retirar produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Adicionar produto ao estoque
app.post('/api/products/add', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity, reason, notes } = req.body;

        // Validar dados
        if (!productId || !quantity) {
            return res.status(400).json({ message: 'ID do produto e quantidade são obrigatórios' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        const addQuantity = parseInt(quantity);
        if (addQuantity <= 0) {
            return res.status(400).json({ message: 'Quantidade deve ser maior que zero' });
        }

        // Adicionar movimentação de entrada
        product.movements.push({
            type: 'entrada',
            quantity: addQuantity,
            reason: reason || 'Entrada de estoque',
            notes: notes || '',
            user: req.user.userId,
            date: new Date()
        });

        await product.save();

        res.json({ 
            success: true, 
            message: `${addQuantity} unidades adicionadas ao estoque com sucesso`,
            product 
        });
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Obter estatísticas do estoque
app.get('/api/products/statistics', authenticateToken, async (req, res) => {
    try {
        const statistics = await Product.getStockStatistics();
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Obter produtos com estoque baixo
app.get('/api/products/low-stock', authenticateToken, async (req, res) => {
    try {
        const products = await Product.findLowStock();
        res.json({ success: true, products });
    } catch (error) {
        console.error('Erro ao buscar produtos com estoque baixo:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Obter produtos sem estoque
app.get('/api/products/out-of-stock', authenticateToken, async (req, res) => {
    try {
        const products = await Product.findOutOfStock();
        res.json({ success: true, products });
    } catch (error) {
        console.error('Erro ao buscar produtos sem estoque:', error);
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

// ==================== ROTAS FINANCEIRAS ====================

// Rota para obter dados financeiros gerais
app.get('/api/finance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate } = req.query;
        
        // Consultando dados financeiros
        
        // Configurar filtros de data
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) {
                dateFilter.date.$gte = new Date(startDate);
                console.log('💰 Filtro data início:', dateFilter.date.$gte);
            }
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                dateFilter.date.$lte = endDateObj;
                console.log('💰 Filtro data fim:', dateFilter.date.$lte);
            }
        }
        
        // Buscar receitas (apenas do tipo 'agendamento' para a tela de Finanças)
        // Tentar ambas as formas para garantir compatibilidade
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // Buscando receitas
        
        // Primeiro tentar com ObjectId
        let revenues = await Revenue.find({ 
            user: userObjectId, 
            isActive: true,
            type: 'agendamento', // Apenas receitas de agendamentos, não comissões
            ...dateFilter
        })
            .sort({ date: -1 });
        
        // Se não encontrar nada, tentar com string
        if (revenues.length === 0) {
            revenues = await Revenue.find({ 
                user: userId, 
                isActive: true,
                type: 'agendamento',
                ...dateFilter
            })
                .sort({ date: -1 });
        }
        
        // Buscar receitas sem filtro de tipo (apenas se necessário)
        const allRevenuesNoTypeFilter = await Revenue.find({ user: userObjectId, isActive: true });
        
        // Buscar gastos - tentar ambas as formas
        let expenses = await Expense.find({ 
            user: userObjectId, 
            isActive: true,
            ...dateFilter
        })
            .sort({ date: -1 });
        
        console.log('💸 Gastos encontrados com ObjectId:', expenses.length);
        console.log('💸 Detalhes dos gastos:', expenses.map(e => ({ id: e._id, name: e.name, value: e.value, user: e.user, type: e.type, date: e.date })));
        
        // Se não encontrar nada, tentar com string
        if (expenses.length === 0) {
            console.log('💸 Tentando consulta de gastos com string userId...');
            expenses = await Expense.find({ 
                user: userId, 
                isActive: true,
                ...dateFilter
            })
                .sort({ date: -1 });
            console.log('💸 Gastos encontrados com string:', expenses.length);
        }
        
        // Buscar maquininhas
        const posMachines = await PosMachine.find({ user: userObjectId, isActive: true })
            .sort({ createdAt: -1 });
        
        // Buscar vendas
        const sales = await Sale.find({ user: userObjectId })
            .populate('posMachine', 'name rate')
            .populate('professional', 'name')
            .sort({ date: -1 });
        
        // Buscar histórico financeiro
        const history = [];
        
        // Adicionar receitas ao histórico
        revenues.forEach(revenue => {
            history.push({
                type: 'receita',
                name: revenue.name,
                value: revenue.value,
                date: revenue.date,
                description: revenue.description,
                userName: req.user.name
            });
        });
        
        // Adicionar gastos ao histórico
        expenses.forEach(expense => {
            history.push({
                type: 'gasto',
                name: expense.name,
                value: expense.value,
                date: expense.date,
                description: expense.description,
                userName: req.user.name
            });
        });
        
        // Adicionar vendas ao histórico
        sales.forEach(sale => {
            history.push({
                type: 'venda',
                name: `Venda - ${sale.posMachine.name}`,
                value: sale.value,
                date: sale.date,
                description: `Profissional: ${sale.professional.name}`,
                userName: req.user.name
            });
        });
        
        // Ordenar histórico por data
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({
            success: true,
            revenues,
            expenses,
            posMachines,
            sales,
            history
        });
    } catch (error) {
        console.error('Erro ao buscar dados financeiros:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE RECEITAS ====================

// Criar receita
app.post('/api/revenues', authenticateToken, async (req, res) => {
    try {
        const { name, type, value, description } = req.body;
        
        if (!name || !type || !value) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nome, tipo e valor são obrigatórios' 
            });
        }
        
        const revenue = new Revenue({
            name,
            type,
            value: parseFloat(value),
            description,
            user: req.user.userId
        });
        
        await revenue.save();
        
        res.status(201).json({ success: true, revenue });
    } catch (error) {
        console.error('Erro ao criar receita:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Atualizar receita
app.put('/api/revenues/:id', authenticateToken, async (req, res) => {
    try {
        const { name, type, value, description } = req.body;
        
        const revenue = await Revenue.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { name, type, value: parseFloat(value), description },
            { new: true }
        );
        
        if (!revenue) {
            return res.status(404).json({ success: false, message: 'Receita não encontrada' });
        }
        
        res.json({ success: true, revenue });
    } catch (error) {
        console.error('Erro ao atualizar receita:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Excluir receita
app.delete('/api/revenues/:id', authenticateToken, async (req, res) => {
    try {
        const revenue = await Revenue.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { isActive: false },
            { new: true }
        );
        
        if (!revenue) {
            return res.status(404).json({ success: false, message: 'Receita não encontrada' });
        }
        
        // Se for uma receita de agendamento, também excluir comissões relacionadas
        if (revenue.appointmentId) {
            console.log('🗑️ Excluindo comissões relacionadas ao agendamento...');
            
            // Excluir comissões do mesmo agendamento
            const commissionResult = await Revenue.deleteMany({ 
                appointmentId: revenue.appointmentId,
                type: 'comissao'
            });
            console.log(`✅ Comissões excluídas: ${commissionResult.deletedCount}`);
            
            // Excluir gastos de comissão relacionados
            const appointment = await Appointment.findById(revenue.appointmentId);
            if (appointment) {
                const expenseResult = await Expense.deleteMany({ 
                    name: { $regex: /Comissão.*/i },
                    description: { $regex: appointment.clientName }
                });
                console.log(`✅ Gastos de comissão excluídos: ${expenseResult.deletedCount}`);
            }
        }
        
        res.json({ success: true, message: 'Receita e dados relacionados excluídos com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir receita:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE GASTOS ====================

// Criar gasto
app.post('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const { name, type, value, description, totalInstallments } = req.body;
        
        if (!name || !type || !value) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nome, tipo e valor são obrigatórios' 
            });
        }
        
        const expense = new Expense({
            name,
            type,
            value: parseFloat(value),
            description,
            totalInstallments: type === 'installment' ? parseInt(totalInstallments) : 1,
            user: req.user.userId
        });
        
        await expense.save();
        
        res.status(201).json({ success: true, expense });
    } catch (error) {
        console.error('Erro ao criar gasto:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Atualizar gasto
app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const { name, type, value, description, totalInstallments } = req.body;
        
        const expense = await Expense.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { 
                name, 
                type, 
                value: parseFloat(value), 
                description,
                totalInstallments: type === 'installment' ? parseInt(totalInstallments) : 1
            },
            { new: true }
        );
        
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Gasto não encontrado' });
        }
        
        res.json({ success: true, expense });
    } catch (error) {
        console.error('Erro ao atualizar gasto:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Excluir gasto
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const expense = await Expense.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { isActive: false },
            { new: true }
        );
        
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Gasto não encontrado' });
        }
        
        // Se for um gasto de comissão, também excluir a comissão relacionada
        if (expense.name && expense.name.toLowerCase().includes('comissão')) {
            console.log('🗑️ Excluindo comissão relacionada ao gasto...');
            
            // Buscar e excluir comissões relacionadas pelo nome do cliente
            if (expense.description) {
                const commissionResult = await Revenue.deleteMany({ 
                    type: 'comissao',
                    description: { $regex: expense.description, $options: 'i' }
                });
                console.log(`✅ Comissões relacionadas excluídas: ${commissionResult.deletedCount}`);
            }
        }
        
        res.json({ success: true, message: 'Gasto e dados relacionados excluídos com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir gasto:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE CONTATOS ====================

// Listar contatos
app.get('/api/contacts', authenticateToken, async (req, res) => {
    try {
        console.log('📞 Buscando contatos...');
        
        // Por enquanto, retornar array vazio
        // TODO: Implementar busca de contatos do WhatsApp ou banco de dados
        const contacts = [];
        
        console.log(`📞 Contatos encontrados: ${contacts.length}`);
        
        res.json({
            success: true,
            contacts: contacts
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Sincronizar contatos com WhatsApp
app.post('/api/contacts/sync-whatsapp', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Sincronizando contatos com WhatsApp...');
        
        // Por enquanto, retornar sucesso sem sincronização real
        // TODO: Implementar sincronização real com WhatsApp
        console.log('✅ Sincronização simulada concluída');
        
        res.json({
            success: true,
            message: 'Contatos sincronizados com sucesso',
            contactsCount: 0
        });
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// ==================== ROTAS DE MAQUININHAS ====================

// Criar maquininha
app.post('/api/pos-machines', authenticateToken, async (req, res) => {
    try {
        const { name, photo, rate, description } = req.body;
        
        if (!name || !rate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nome e taxa são obrigatórios' 
            });
        }
        
        const posMachine = new PosMachine({
            name,
            photo,
            rate: parseFloat(rate),
            description,
            user: req.user.userId
        });
        
        await posMachine.save();
        
        res.status(201).json({ success: true, posMachine });
    } catch (error) {
        console.error('Erro ao criar maquininha:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Atualizar maquininha
app.put('/api/pos-machines/:id', authenticateToken, async (req, res) => {
    try {
        const { name, photo, rate, description } = req.body;
        
        const posMachine = await PosMachine.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { name, photo, rate: parseFloat(rate), description },
            { new: true }
        );
        
        if (!posMachine) {
            return res.status(404).json({ success: false, message: 'Maquininha não encontrada' });
        }
        
        res.json({ success: true, posMachine });
    } catch (error) {
        console.error('Erro ao atualizar maquininha:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Excluir maquininha
app.delete('/api/pos-machines/:id', authenticateToken, async (req, res) => {
    try {
        const posMachine = await PosMachine.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { isActive: false },
            { new: true }
        );
        
        if (!posMachine) {
            return res.status(404).json({ success: false, message: 'Maquininha não encontrada' });
        }
        
        res.json({ success: true, message: 'Maquininha excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir maquininha:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE VENDAS ====================

// Criar venda
app.post('/api/sales', authenticateToken, async (req, res) => {
    try {
        const { posMachineId, value, professionalId, professionalCommission, description } = req.body;
        
        if (!posMachineId || !value || !professionalId || !professionalCommission) {
            return res.status(400).json({ 
                success: false, 
                message: 'Maquininha, valor, profissional e comissão são obrigatórios' 
            });
        }
        
        // Buscar maquininha para obter a taxa
        const posMachine = await PosMachine.findById(posMachineId);
        if (!posMachine) {
            return res.status(404).json({ success: false, message: 'Maquininha não encontrada' });
        }
        
        const sale = new Sale({
            posMachine: posMachineId,
            value: parseFloat(value),
            professional: professionalId,
            professionalCommission: parseFloat(professionalCommission),
            posRate: posMachine.rate,
            description,
            user: req.user.userId
        });
        
        await sale.save();
        
        // Popular dados para resposta
        await sale.populate('posMachine', 'name rate');
        await sale.populate('professional', 'name');
        
        res.status(201).json({ success: true, sale });
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE COMISSÕES ====================

// Buscar comissões do usuário logado
app.get('/api/commissions', authenticateToken, async (req, res) => {
    try {
        console.log('💰 Buscando comissões do usuário:', req.user.userId);
        
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.$gte = new Date(startDate);
            if (endDate) {
                // Adicionar 23:59:59 ao final do dia para incluir todo o dia
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                dateFilter.date.$lte = endDateObj;
            }
        }

        // Buscar receitas do tipo 'comissao' do usuário logado
        // Para usuários comuns, filtrar apenas suas próprias comissões
        let commissionFilter = {
            type: 'comissao',
            ...dateFilter
        };
        
        // Para todos os usuários, buscar comissões pelo user (que é quem finalizou o agendamento)
        // As comissões são criadas com user: req.user.userId quando o agendamento é finalizado
        commissionFilter.user = req.user.userId;
        console.log('🔒 Buscando comissões para usuário:', req.user.userId, 'Role:', req.user.role);
        
        const commissions = await Revenue.find(commissionFilter)
        .populate('appointmentId', 'clientName clientLastName date time service')
        .populate('professionalId', 'firstName lastName')
        .sort({ date: -1 });

        console.log('💰 Comissões encontradas:', commissions.length);
        console.log('💰 Comissões detalhadas:', commissions.map(c => ({ value: c.value, date: c.date, type: c.type })));

        // Calcular estatísticas
        const totalCommissions = commissions.reduce((sum, comm) => sum + (comm.value || 0), 0);
        
        console.log('💰 Total de comissões:', totalCommissions);
        console.log('💰 Total de comissões encontradas:', commissions.length);

        // Buscar agendamentos concluídos pelo usuário que finalizou
        let appointmentFilter = {
            status: 'completed',
            completedBy: req.user.userId, // Buscar agendamentos finalizados pelo usuário logado
            ...dateFilter
        };
        
        const appointments = await Appointment.find(appointmentFilter)
        .populate('service', 'name price commission');

        console.log('📅 Agendamentos concluídos:', appointments.length);
        console.log('📅 Filtro aplicado:', appointmentFilter);
        console.log('📅 Agendamentos detalhados:', appointments.map(a => ({ 
            client: `${a.clientName} ${a.clientLastName}`, 
            date: a.date, 
            service: a.service?.name, 
            commission: a.service?.commission 
        })));

        // Calcular percentual médio de comissão
        let averageCommission = 0;
        if (appointments.length > 0) {
            const totalCommissionPercent = appointments.reduce((sum, apt) => {
                const commission = apt.service?.commission || 0;
                console.log(`📊 Serviço: ${apt.service?.name}, Comissão: ${commission}%`);
                return sum + commission;
            }, 0);
            averageCommission = totalCommissionPercent / appointments.length;
            console.log('📊 Total de percentuais:', totalCommissionPercent);
            console.log('📊 Percentual médio calculado:', averageCommission);
        } else {
            console.log('📊 Nenhum agendamento concluído encontrado para calcular percentual médio');
        }

        res.json({
            success: true,
            commissions,
            stats: {
                totalCommissions,
                totalAppointments: appointments.length, // Usar agendamentos concluídos como base
                averageCommission: Math.round(averageCommission * 100) / 100
            }
        });

    } catch (error) {
        console.error('💥 Erro ao buscar comissões:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Buscar evolução mensal das comissões
app.get('/api/commissions/evolution', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Buscando evolução das comissões...');
        
        const { startDate, endDate } = req.query;
        
        // Definir período padrão (últimos 6 meses se não especificado)
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            // Adicionar 23:59:59 ao final do dia para incluir todo o dia
            end.setHours(23, 59, 59, 999);
        } else {
            end = new Date();
            start = new Date();
            start.setMonth(start.getMonth() - 6);
        }

        // Buscar comissões por mês
        let commissionMatchFilter = {
            type: 'comissao',
            date: { $gte: start, $lte: end }
        };
        
        // Se for usuário comum, buscar comissões do profissional associado
        if (req.user.role === 'user') {
            console.log('🔒 Aplicando filtro de usuário comum - buscando profissional associado para evolução');
            const professional = await Professional.findOne({ userId: req.user.userId });
            if (professional) {
                commissionMatchFilter.professionalId = professional._id;
                console.log('🔒 Profissional encontrado para evolução:', professional._id);
            } else {
                console.log('❌ Nenhum profissional associado ao usuário para evolução');
                commissionMatchFilter.professionalId = null; // Nenhum profissional encontrado
            }
        } else {
            // Para admin/manager, buscar comissões do usuário logado
            // Como as comissões são criadas com professionalId, precisamos buscar pelo profissional associado
            const professional = await Professional.findOne({ userId: req.user.userId });
            if (professional) {
                commissionMatchFilter.professionalId = professional._id;
                console.log('🔒 Profissional encontrado para admin/manager na evolução:', professional._id);
            } else {
                console.log('❌ Nenhum profissional associado ao usuário admin/manager para evolução');
                commissionMatchFilter.professionalId = null; // Nenhum profissional encontrado
            }
        }
        
        const monthlyCommissions = await Revenue.aggregate([
            {
                $match: commissionMatchFilter
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalCommissions: { $sum: '$value' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Buscar agendamentos concluídos por mês
        let appointmentMatchFilter = {
            status: 'completed',
            date: { $gte: start, $lte: end }
        };
        
        // Se for usuário comum, só pode ver seus próprios agendamentos
        if (req.user.role === 'user') {
            console.log('🔒 Aplicando filtro de usuário comum - apenas agendamentos próprios na evolução');
            
            // Buscar o profissional associado ao usuário
            const professional = await Professional.findOne({ userId: req.user.userId });
            if (professional) {
                console.log('🔒 Profissional encontrado para evolução:', professional._id);
                appointmentMatchFilter.professional = professional._id;
            } else {
                console.log('⚠️ Nenhum profissional encontrado para o usuário na evolução');
                // Se não encontrar profissional, retornar array vazio
                appointmentMatchFilter.professional = null;
            }
        } else {
            // Para admin/manager, pode ver todos os agendamentos ou filtrar por usuário específico
            appointmentMatchFilter.professional = req.user.userId; // Por enquanto, manter apenas do usuário logado
        }
        
        const monthlyAppointments = await Appointment.aggregate([
            {
                $match: appointmentMatchFilter
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Buscar percentual de comissão por mês
        let commissionPercentMatchFilter = {
            status: 'completed',
            date: { $gte: start, $lte: end }
        };
        
        // Se for usuário comum, só pode ver seus próprios agendamentos
        if (req.user.role === 'user') {
            console.log('🔒 Aplicando filtro de usuário comum - apenas percentual de comissões próprias');
            
            // Buscar o profissional associado ao usuário
            const professional = await Professional.findOne({ userId: req.user.userId });
            if (professional) {
                console.log('🔒 Profissional encontrado para percentual:', professional._id);
                commissionPercentMatchFilter.professional = professional._id;
            } else {
                console.log('⚠️ Nenhum profissional encontrado para o usuário no percentual');
                // Se não encontrar profissional, retornar array vazio
                commissionPercentMatchFilter.professional = null;
            }
        } else {
            // Para admin/manager, pode ver todos os agendamentos ou filtrar por usuário específico
            commissionPercentMatchFilter.professional = req.user.userId; // Por enquanto, manter apenas do usuário logado
        }
        
        const monthlyCommissionPercent = await Appointment.aggregate([
            {
                $match: commissionPercentMatchFilter
            },
            {
                $lookup: {
                    from: 'services',
                    localField: 'service',
                    foreignField: '_id',
                    as: 'serviceData'
                }
            },
            {
                $unwind: '$serviceData'
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    avgCommission: { $avg: '$serviceData.commission' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        console.log('📊 Dados de evolução processados');

        res.json({
            success: true,
            monthlyCommissions,
            monthlyAppointments,
            monthlyCommissionPercent
        });

    } catch (error) {
        console.error('💥 Erro ao buscar evolução das comissões:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE AGENDAMENTOS ====================

// Endpoint de teste para verificar se o modelo está funcionando
app.get('/api/test-appointments', async (req, res) => {
    try {
        console.log('🧪 Testando modelo Appointment...');
        
        if (!Appointment) {
            return res.status(500).json({
                success: false,
                message: 'Modelo Appointment não encontrado'
            });
        }
        
        const count = await Appointment.countDocuments();
        
        res.json({
            success: true,
            message: 'Modelo Appointment funcionando',
            appointmentCount: count
        });
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        res.status(500).json({
            success: false,
            message: 'Erro no teste: ' + error.message
        });
    }
});

// Endpoint para limpar cache de rate limiting (apenas desenvolvimento)
app.post('/api/clear-rate-limit', async (req, res) => {
    try {
        // Limpar cache de rate limiting
        if (generalLimiter.resetKey) {
            generalLimiter.resetKey('*');
        }
        if (authLimiter.resetKey) {
            authLimiter.resetKey('*');
        }
        if (apiLimiter.resetKey) {
            apiLimiter.resetKey('*');
        }
        
        res.json({
            success: true,
            message: 'Cache de rate limiting limpo com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao limpar cache: ' + error.message
        });
    }
});

// Endpoint simples para apagar agendamentos (SEM autenticação para teste)
app.delete('/api/clear-appointments-simple', async (req, res) => {
    try {
        console.log('🗑️ Endpoint simples chamado');
        
        if (!Appointment) {
            return res.status(500).json({
                success: false,
                message: 'Modelo Appointment não encontrado'
            });
        }
        
        const countBefore = await Appointment.countDocuments();
        console.log(`📊 Total de agendamentos: ${countBefore}`);
        
        if (countBefore === 0) {
            return res.json({
                success: true,
                message: 'Nenhum agendamento encontrado',
                deletedCount: 0
            });
        }
        
        // Primeiro, buscar todos os agendamentos que serão excluídos para limpar dados relacionados
        const appointmentsToDelete = await Appointment.find({});
        console.log(`🗑️ Encontrados ${appointmentsToDelete.length} agendamentos para excluir`);
        
        // Excluir receitas, comissões e gastos relacionados a todos os agendamentos
        let totalRelatedDeleted = 0;
        for (const appointment of appointmentsToDelete) {
            const deletedCount = await deleteAppointmentRelatedData(appointment._id, appointment.clientName);
            totalRelatedDeleted += deletedCount;
        }
        
        console.log(`✅ Dados relacionados excluídos: ${totalRelatedDeleted} registros`);
        
        // Agora excluir os agendamentos
        const result = await Appointment.deleteMany({});
        
        res.json({
            success: true,
            message: `Agendamentos e dados relacionados apagados com sucesso`,
            deletedCount: result.deletedCount,
            relatedDeletedCount: totalRelatedDeleted
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro: ' + error.message
        });
    }
});

// Endpoint simples para limpar comissões (sem autenticação para teste)
app.delete('/api/clear-commissions-simple', async (req, res) => {
    try {
        console.log('🗑️ Endpoint simples de limpeza de comissões chamado');
        
        const countBefore = await Revenue.countDocuments({ type: 'comissao' });
        console.log(`📊 Comissões encontradas antes da limpeza: ${countBefore}`);
        
        if (countBefore === 0) {
            return res.json({
                success: true,
                message: 'Nenhuma comissão encontrada para apagar',
                deletedCount: 0
            });
        }

        const result = await Revenue.deleteMany({ type: 'comissao' });
        console.log(`✅ Comissões apagadas: ${result.deletedCount}`);
        
        res.json({
            success: true,
            message: `Todas as comissões foram apagadas com sucesso`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ Erro ao apagar comissões:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// Endpoint para limpar comissões órfãs (sem agendamento correspondente)
app.delete('/api/clear-orphan-commissions', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Verificando comissões órfãs...');
        
        // Buscar todas as comissões
        const allCommissions = await Revenue.find({ type: 'comissao' });
        console.log(`📊 Total de comissões encontradas: ${allCommissions.length}`);
        
        let orphanCount = 0;
        const orphanIds = [];
        
        // Verificar cada comissão se tem agendamento correspondente
        for (const commission of allCommissions) {
            if (commission.appointmentId) {
                const appointment = await Appointment.findById(commission.appointmentId);
                if (!appointment) {
                    orphanCount++;
                    orphanIds.push(commission._id);
                    console.log(`🗑️ Comissão órfã encontrada: ${commission._id} (agendamento ${commission.appointmentId} não existe)`);
                }
            } else {
                // Comissão sem appointmentId também é considerada órfã
                orphanCount++;
                orphanIds.push(commission._id);
                console.log(`🗑️ Comissão sem agendamento: ${commission._id}`);
            }
        }
        
        if (orphanCount === 0) {
            return res.json({
                success: true,
                message: 'Nenhuma comissão órfã encontrada',
                deletedCount: 0
            });
        }
        
        // Excluir comissões órfãs
        const result = await Revenue.deleteMany({ _id: { $in: orphanIds } });
        
        console.log(`✅ Comissões órfãs excluídas: ${result.deletedCount}`);
        
        res.json({
            success: true,
            message: `${result.deletedCount} comissões órfãs foram excluídas com sucesso`,
            deletedCount: result.deletedCount,
            orphanCount: orphanCount
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar comissões órfãs:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// Endpoint para forçar limpeza completa de comissões (admin only)
app.delete('/api/force-clear-commissions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem executar esta operação'
            });
        }

        console.log('🚨 FORÇANDO limpeza completa de comissões...');
        
        // Contar comissões antes
        const countBefore = await Revenue.countDocuments({ type: 'comissao' });
        console.log(`📊 Comissões encontradas antes da limpeza: ${countBefore}`);
        
        if (countBefore === 0) {
            return res.json({
                success: true,
                message: 'Nenhuma comissão encontrada para apagar',
                deletedCount: 0
            });
        }

        // Excluir TODAS as comissões sem verificação
        const result = await Revenue.deleteMany({ type: 'comissao' });
        
        console.log(`✅ TODAS as comissões foram excluídas: ${result.deletedCount}`);
        
        res.json({
            success: true,
            message: `FORÇA BRUTA: ${result.deletedCount} comissões foram apagadas com sucesso`,
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('❌ Erro ao forçar limpeza de comissões:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// Rota para apagar todos os agendamentos (APENAS PARA DESENVOLVIMENTO)
app.delete('/api/appointments/clear-all', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Endpoint clear-all chamado');
        console.log('👤 Usuário:', req.user);
        
        // Verificar se o usuário é admin
        if (req.user.role !== 'admin') {
            console.log('❌ Usuário não é admin:', req.user.role);
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem executar esta operação'
            });
        }

        console.log('🗑️ Iniciando limpeza de todos os agendamentos...');
        
        // Verificar se o modelo Appointment está disponível
        if (!Appointment) {
            console.error('❌ Modelo Appointment não encontrado');
            return res.status(500).json({
                success: false,
                message: 'Modelo Appointment não encontrado'
            });
        }
        
        // Contar agendamentos antes de apagar
        const countBefore = await Appointment.countDocuments();
        console.log(`📊 Total de agendamentos encontrados: ${countBefore}`);
        
        if (countBefore === 0) {
            return res.json({
                success: true,
                message: 'Nenhum agendamento encontrado para apagar',
                deletedCount: 0
            });
        }
        
        // Primeiro, buscar todos os agendamentos que serão excluídos para limpar dados relacionados
        const appointmentsToDelete = await Appointment.find({});
        console.log(`🗑️ Encontrados ${appointmentsToDelete.length} agendamentos para excluir`);
        
        // Excluir receitas, comissões e gastos relacionados a todos os agendamentos
        let totalRelatedDeleted = 0;
        for (const appointment of appointmentsToDelete) {
            const deletedCount = await deleteAppointmentRelatedData(appointment._id, appointment.clientName);
            totalRelatedDeleted += deletedCount;
        }
        
        console.log(`✅ Dados relacionados excluídos: ${totalRelatedDeleted} registros`);
        
        // Agora excluir os agendamentos
        const result = await Appointment.deleteMany({});
        
        console.log(`✅ Agendamentos apagados: ${result.deletedCount}`);
        
        res.json({
            success: true,
            message: `Todos os agendamentos e dados relacionados foram apagados com sucesso`,
            deletedCount: result.deletedCount,
            relatedDeletedCount: totalRelatedDeleted
        });
        
    } catch (error) {
        console.error('❌ Erro ao apagar agendamentos:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// Listar agendamentos para Dashboard (dados gerais - sem filtro de usuário)
app.get('/api/dashboard/appointments', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Dashboard: Buscando agendamentos gerais...');
        console.log('🔍 Query params:', req.query);
        console.log('👤 Usuário logado:', req.user.userId, 'Role:', req.user.role);
        
        const { startDate, endDate, professionalId, status } = req.query;
        
        let filter = {};
        
        // Filtro por data
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        
        // Filtro por profissional
        if (professionalId) {
            filter.professional = professionalId;
        }
        
        // Filtro por status
        if (status) {
            filter.status = status;
        }
        
        // DASHBOARD: SEM FILTRO DE USUÁRIO - sempre dados gerais
        console.log('📊 Dashboard: Exibindo dados gerais (sem filtro de usuário)');
        
        console.log('🔍 Filtro aplicado:', filter);
        
        const appointments = await Appointment.find(filter)
            .populate('professional', 'firstName lastName function photo')
            .populate('service', 'name price duration')
            .sort({ date: 1, time: 1 });
        
        console.log('📋 Agendamentos encontrados:', appointments.length);
        appointments.forEach(apt => {
            console.log('📅', apt.date.toLocaleDateString('pt-BR'), apt.time, '-', apt.clientName, apt.clientLastName, '-', apt.status, '- Source:', apt.source || 'dashboard');
        });
        
        res.json({ success: true, appointments });
    } catch (error) {
        console.error('💥 Erro ao listar agendamentos do dashboard:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Listar agendamentos
app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        console.log('📋 Buscando agendamentos...');
        console.log('🔍 Query params:', req.query);
        console.log('👤 Usuário logado:', req.user.userId, 'Role:', req.user.role);
        
        const { startDate, endDate, professionalId, status } = req.query;
        
        let filter = {};
        
        // Filtro por data
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        
        // Filtro por profissional
        if (professionalId) {
            filter.professional = professionalId;
        }
        
        // Filtro por status
        if (status) {
            filter.status = status;
        }
        
        // FILTRO POR USUÁRIO: Se for usuário comum, só pode ver seus próprios agendamentos
        console.log('🔍 Verificando role do usuário:', req.user.role);
        console.log('🔍 Tipo do role:', typeof req.user.role);
        console.log('🔍 Comparação com "user":', req.user.role === 'user');
        
        if (req.user.role === 'user') {
            console.log('🔒 Aplicando filtro de usuário comum - apenas agendamentos próprios');
            console.log('🔒 ID do usuário para filtro:', req.user.userId);
            
            // Buscar o profissional associado ao usuário
            const professional = await Professional.findOne({ userId: req.user.userId });
            if (professional) {
                console.log('🔒 Profissional encontrado:', professional._id);
                filter.professional = professional._id;
            } else {
                console.log('⚠️ Nenhum profissional encontrado para o usuário');
                // Se não encontrar profissional, retornar array vazio
                filter.professional = null;
            }
        } else {
            console.log('👑 Usuário admin/manager - sem filtro de usuário aplicado');
        }
        
        console.log('🔍 Filtro aplicado:', filter);
        
        const appointments = await Appointment.find(filter)
            .populate('professional', 'firstName lastName function photo')
            .populate('service', 'name price duration')
            .sort({ date: 1, time: 1 });
        
        console.log('📋 Agendamentos encontrados:', appointments.length);
        appointments.forEach(apt => {
            console.log('📅', apt.date.toLocaleDateString('pt-BR'), apt.time, '-', apt.clientName, apt.clientLastName, '-', apt.status, '- Source:', apt.source || 'dashboard');
        });
        
        res.json({ success: true, appointments });
    } catch (error) {
        console.error('💥 Erro ao listar agendamentos:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Obter estatísticas de agendamentos
app.get('/api/appointments/statistics', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Buscando estatísticas de agendamentos...');
        console.log('👤 Usuário logado:', req.user.userId, 'Role:', req.user.role);
        
        const { startDate, endDate } = req.query;
        
        let filter = {};
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        
        // FILTRO POR USUÁRIO: Se for usuário comum, só pode ver suas próprias estatísticas
        if (req.user.role === 'user') {
            console.log('🔒 Aplicando filtro de usuário comum - apenas estatísticas próprias');
            
            // Buscar o profissional associado ao usuário
            const professional = await Professional.findOne({ userId: req.user.userId });
            if (professional) {
                console.log('🔒 Profissional encontrado para estatísticas:', professional._id);
                filter.professional = professional._id;
            } else {
                console.log('⚠️ Nenhum profissional encontrado para o usuário nas estatísticas');
                // Se não encontrar profissional, retornar array vazio
                filter.professional = null;
            }
        }
        
        console.log('🔍 Filtro de estatísticas aplicado:', filter);
        
        const total = await Appointment.countDocuments(filter);
        const pending = await Appointment.countDocuments({ ...filter, status: 'pending' });
        const confirmed = await Appointment.countDocuments({ ...filter, status: 'confirmed' });
        const cancelled = await Appointment.countDocuments({ ...filter, status: 'cancelled' });
        const completed = await Appointment.countDocuments({ ...filter, status: 'completed' });
        
        const statistics = {
            total,
            pending,
            confirmed,
            cancelled,
            completed
        };
        
        console.log('📊 Estatísticas calculadas:', statistics);
        
        res.json({
            success: true,
            statistics
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Criar agendamento
app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const {
            professionalId,
            serviceId,
            date,
            time,
            clientName,
            clientPhone,
            notes
        } = req.body;
        
        // Validar campos obrigatórios
        if (!professionalId || !serviceId || !date || !time || !clientName || !clientPhone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos os campos obrigatórios devem ser preenchidos' 
            });
        }
        
        // Verificar se profissional existe
        const professional = await Professional.findById(professionalId);
        if (!professional) {
            return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
        }
        
        // Verificar se serviço existe
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
        }
        
        // Verificar se horário está disponível considerando duração do serviço
        const serviceDuration = getServiceDurationInMinutes(service); // em minutos
        const requestedStartMinutes = timeToMinutes(time);
        const requestedEndMinutes = requestedStartMinutes + serviceDuration;
        
        const conflictingAppointments = await Appointment.find({
            professional: professionalId,
            date: new Date(date),
            status: { $in: ['pending', 'confirmed'] }
        }).populate('service', 'duration durationUnit');
        
        for (const existingAppointment of conflictingAppointments) {
            const existingStartMinutes = timeToMinutes(existingAppointment.time);
            const existingServiceDuration = getServiceDurationInMinutes(existingAppointment.service);
            const existingEndMinutes = existingStartMinutes + existingServiceDuration;
            
            // Verificar sobreposição de horários
            if (requestedStartMinutes < existingEndMinutes && requestedEndMinutes > existingStartMinutes) {
                const serviceDurationText = service.durationUnit === 'hours' ? 
                    `${service.duration}h` : `${service.duration}min`;
                return res.status(400).json({ 
                    success: false, 
                    message: `Horário não disponível. O serviço "${service.name}" (${serviceDurationText}) conflita com um agendamento existente.` 
                });
            }
        }
        
        // Criar agendamento
        const appointment = new Appointment({
            professional: professionalId,
            service: serviceId,
            date: new Date(date),
            time: time,
            clientName,
            clientPhone,
            notes: notes || '',
            status: 'pending',
            createdBy: req.user.userId
        });
        
        await appointment.save();
        
        // Popular dados para resposta
        await appointment.populate('professional', 'firstName lastName function photo');
        await appointment.populate('service', 'name price duration');
        
        res.status(201).json({ 
            success: true, 
            message: 'Agendamento criado com sucesso',
            appointment 
        });
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Atualizar agendamento
app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            professionalId,
            serviceId,
            date,
            time,
            clientName,
            clientPhone,
            notes,
            status
        } = req.body;
        
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }
        
        // Verificar se profissional existe
        if (professionalId) {
            const professional = await Professional.findById(professionalId);
            if (!professional) {
                return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
            }
        }
        
        // Verificar se serviço existe
        if (serviceId) {
            const service = await Service.findById(serviceId);
            if (!service) {
                return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
            }
        }
        
        // Verificar disponibilidade de horário se data/horário mudou
        if ((date || time) && (professionalId || appointment.professional)) {
            const checkDate = date ? new Date(date) : appointment.date;
            const checkTime = time || appointment.time;
            const checkProfessional = professionalId || appointment.professional;
            const checkService = serviceId || appointment.service;
            
            // Buscar o serviço para obter a duração
            const serviceToCheck = await Service.findById(checkService);
            if (!serviceToCheck) {
                return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
            }
            
            const serviceDuration = getServiceDurationInMinutes(serviceToCheck);
            const requestedStartMinutes = timeToMinutes(checkTime);
            const requestedEndMinutes = requestedStartMinutes + serviceDuration;
            
            const conflictingAppointments = await Appointment.find({
                _id: { $ne: id },
                professional: checkProfessional,
                date: checkDate,
                status: { $in: ['pending', 'confirmed'] }
            }).populate('service', 'duration durationUnit');
            
            for (const existingAppointment of conflictingAppointments) {
                const existingStartMinutes = timeToMinutes(existingAppointment.time);
                const existingServiceDuration = getServiceDurationInMinutes(existingAppointment.service);
                const existingEndMinutes = existingStartMinutes + existingServiceDuration;
                
                // Verificar sobreposição de horários
                if (requestedStartMinutes < existingEndMinutes && requestedEndMinutes > existingStartMinutes) {
                    const serviceDurationText = serviceToCheck.durationUnit === 'hours' ? 
                        `${serviceToCheck.duration}h` : `${serviceToCheck.duration}min`;
                    return res.status(400).json({ 
                        success: false, 
                        message: `Horário não disponível. O serviço "${serviceToCheck.name}" (${serviceDurationText}) conflita com um agendamento existente.` 
                    });
                }
            }
        }
        
        // Atualizar dados
        if (professionalId) appointment.professional = professionalId;
        if (serviceId) appointment.service = serviceId;
        if (date) appointment.date = new Date(date);
        if (time) appointment.time = time;
        if (clientName) appointment.clientName = clientName;
        if (clientPhone) appointment.clientPhone = clientPhone;
        if (notes !== undefined) appointment.notes = notes;
        if (status) appointment.status = status;
        
        appointment.updatedBy = req.user.userId;
        
        await appointment.save();
        
        // Popular dados para resposta
        await appointment.populate('professional', 'firstName lastName function photo');
        await appointment.populate('service', 'name price duration');
        
        res.json({ 
            success: true, 
            message: 'Agendamento atualizado com sucesso',
            appointment 
        });
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Marcar agendamento como finalizado
app.put('/api/appointments/:id/complete', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Iniciando finalização do agendamento:', req.params.id);
        const { id } = req.params;
        
        console.log('🔍 Buscando agendamento...');
        const appointment = await Appointment.findById(id)
            .populate('professional', 'firstName lastName function')
            .populate('service', 'name price commission');
        
        if (!appointment) {
            console.log('❌ Agendamento não encontrado');
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }
        
        console.log('📋 Agendamento encontrado:', {
            id: appointment._id,
            status: appointment.status,
            service: appointment.service?.name,
            price: appointment.service?.price,
            commission: appointment.service?.commission
        });
        
        if (appointment.status === 'completed') {
            console.log('⚠️ Agendamento já foi finalizado');
            return res.status(400).json({ success: false, message: 'Agendamento já foi finalizado' });
        }
        
        console.log('💾 Atualizando status do agendamento...');
        // Atualizar status
        appointment.status = 'completed';
        appointment.completedAt = new Date();
        appointment.completedBy = req.user.userId;
        
        await appointment.save();
        console.log('✅ Agendamento atualizado');
        
        console.log('💰 Criando receita do agendamento...');
        console.log('👤 Usuário que está finalizando:', req.user.userId, 'Role:', req.user.role);
        console.log('👤 Tipo do userId:', typeof req.user.userId);
        console.log('👤 userId como string:', req.user.userId.toString());
        
        // Criar receita automaticamente (sempre do tipo 'agendamento' para aparecer no financeiro)
        const revenue = new Revenue({
            name: `Agendamento - ${appointment.service.name}`,
            type: 'agendamento',
            value: appointment.service.price,
            description: `Agendamento finalizado - Cliente: ${appointment.clientName}, Profissional: ${appointment.professional.firstName} ${appointment.professional.lastName}`,
            user: req.user.userId,
            appointmentId: appointment._id,
            professionalId: appointment.professional._id,
            date: appointment.date // Usar a data do agendamento, não a data atual
        });
        
        console.log('💰 Dados da receita antes de salvar:', {
            name: revenue.name,
            type: revenue.type,
            value: revenue.value,
            user: revenue.user,
            userType: typeof revenue.user,
            userRole: req.user.role,
            userIdFromToken: req.user.userId,
            userIdType: typeof req.user.userId
        });
        
        await revenue.save();
        console.log('✅ Receita do agendamento criada:', revenue._id);
        console.log('💰 Valor da receita:', revenue.value);
        console.log('👤 Receita criada para usuário:', revenue.user);
        console.log('👤 Tipo do user na receita salva:', typeof revenue.user);
        
        console.log('💸 Calculando comissão do profissional...');
        // Calcular comissão do profissional
        const commissionValue = appointment.service.price * (appointment.service.commission / 100);
        console.log('📊 Comissão calculada:', commissionValue);
        console.log('📊 Percentual de comissão do serviço:', appointment.service.commission + '%');
        
        // 1. Criar gasto (comissão) na tela de Finanças
        console.log('💸 Criando gasto de comissão...');
        console.log('💸 Dados do gasto:', {
            name: `Comissão - ${appointment.service.name}`,
            type: 'unique',
            value: commissionValue,
            user: req.user.userId,
            date: new Date()
        });
        
        console.log('💸 Dados do gasto antes de salvar:', {
            name: `Comissão - ${appointment.service.name}`,
            type: 'unique',
            value: commissionValue,
            user: req.user.userId,
            userRole: req.user.role,
            userIdFromToken: req.user.userId,
            userIdType: typeof req.user.userId,
            date: new Date()
        });
        
        try {
            const commissionExpense = new Expense({
                name: `Comissão - ${appointment.service.name}`,
                type: 'unique',
                value: commissionValue,
                description: `Comissão do agendamento - Cliente: ${appointment.clientName}, Profissional: ${appointment.professional.firstName} ${appointment.professional.lastName}`,
                user: req.user.userId,
                appointmentId: appointment._id,
                professionalId: appointment.professional._id,
                date: appointment.date // Usar a data do agendamento, não a data atual
            });
            
            console.log('💸 Tentando salvar gasto...');
            await commissionExpense.save();
            console.log('✅ Gasto de comissão criado:', commissionExpense._id);
            console.log('💰 Valor do gasto:', commissionExpense.value);
            console.log('🔍 isActive do gasto:', commissionExpense.isActive);
        } catch (expenseError) {
            console.error('❌ ERRO ao criar gasto de comissão:', expenseError);
            console.error('❌ Detalhes do erro:', expenseError.message);
            console.error('❌ Stack trace:', expenseError.stack);
            // Continuar mesmo com erro no gasto
        }
        
        // 2. Criar comissão para Minhas Comissões
        console.log('💸 Criando comissão para Minhas Comissões...');
        const professionalRevenue = new Revenue({
            name: `Comissão - ${appointment.service.name}`,
            type: 'comissao',
            value: commissionValue,
            description: `Comissão do agendamento - Cliente: ${appointment.clientName}, Profissional: ${appointment.professional.firstName} ${appointment.professional.lastName}`,
            user: req.user.userId,
            appointmentId: appointment._id,
            professionalId: appointment.professional._id,
            date: appointment.date // Usar a data do agendamento, não a data atual
        });
        
        await professionalRevenue.save();
        console.log('✅ Comissão do profissional criada:', professionalRevenue._id);
        console.log('💰 Valor da comissão:', professionalRevenue.value);
        
        console.log('🎉 Agendamento finalizado com sucesso');
        res.json({ 
            success: true, 
            message: 'Agendamento finalizado com sucesso',
            appointment,
            revenue: {
                total: appointment.service.price,
                commission: commissionValue
            }
        });
    } catch (error) {
        console.error('💥 Erro ao finalizar agendamento:', error);
        console.error('📊 Stack trace:', error.stack);
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor: ' + error.message 
        });
    }
});

// Confirmar agendamento
app.put('/api/appointments/:id/confirm', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }
        
        if (appointment.status === 'confirmed') {
            return res.status(400).json({ success: false, message: 'Agendamento já está confirmado' });
        }
        
        if (appointment.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Não é possível confirmar um agendamento cancelado' });
        }
        
        appointment.status = 'confirmed';
        appointment.confirmedAt = new Date();
        appointment.confirmedBy = req.user.userId;
        
        await appointment.save();
        
        res.json({ 
            success: true, 
            message: 'Agendamento confirmado com sucesso',
            appointment 
        });
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Cancelar agendamento
app.put('/api/appointments/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }
        
        if (appointment.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Agendamento já está cancelado' });
        }
        
        if (appointment.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Não é possível cancelar um agendamento finalizado' });
        }
        
        appointment.status = 'cancelled';
        appointment.cancelledAt = new Date();
        appointment.cancelledBy = req.user.userId;
        appointment.cancellationReason = reason || '';
        
        await appointment.save();
        
        res.json({ 
            success: true, 
            message: 'Agendamento cancelado com sucesso',
            appointment 
        });
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Excluir agendamento
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }
        
        // Excluir dados relacionados usando função utilitária
        console.log('🗑️ Excluindo agendamento e todos os dados relacionados...');
        const relatedDeletedCount = await deleteAppointmentRelatedData(id, appointment.clientName);
        
        // Log adicional se for agendamento finalizado
        if (appointment.status === 'completed') {
            console.log('📋 Agendamento finalizado - dados financeiros limpos');
        }
        
        await Appointment.findByIdAndDelete(id);
        
        res.json({ 
            success: true, 
            message: 'Agendamento excluído com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Obter horários disponíveis
app.get('/api/appointments/available-times', authenticateToken, async (req, res) => {
    try {
        const { professionalId, date, serviceId } = req.query;
        
        if (!professionalId || !date) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do profissional e data são obrigatórios' 
            });
        }
        
        // Buscar duração do serviço se fornecido
        let serviceDuration = 30; // padrão 30 minutos
        if (serviceId) {
            const service = await Service.findById(serviceId);
            if (service) {
                serviceDuration = getServiceDurationInMinutes(service);
            }
        }
        
        // Horários padrão (8h às 18h)
        const startHour = 8;
        const endHour = 18;
        const availableTimes = [];
        
        // Buscar agendamentos existentes para o profissional na data
        const existingAppointments = await Appointment.find({
            professional: professionalId,
            date: new Date(date),
            status: { $in: ['pending', 'confirmed'] }
        }).populate('service', 'duration durationUnit');
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const requestedStartMinutes = timeToMinutes(timeString);
                const requestedEndMinutes = requestedStartMinutes + serviceDuration;
                
                // Verificar se o horário + duração não ultrapassa o horário de fechamento
                if (requestedEndMinutes > (endHour * 60)) {
                    continue;
                }
                
                // Verificar conflitos com agendamentos existentes
                let hasConflict = false;
                for (const existingAppointment of existingAppointments) {
                    const existingStartMinutes = timeToMinutes(existingAppointment.time);
                    const existingServiceDuration = getServiceDurationInMinutes(existingAppointment.service);
                    const existingEndMinutes = existingStartMinutes + existingServiceDuration;
                    
                    // Verificar sobreposição
                    if (requestedStartMinutes < existingEndMinutes && requestedEndMinutes > existingStartMinutes) {
                        hasConflict = true;
                        break;
                    }
                }
                
                if (!hasConflict) {
                    availableTimes.push(timeString);
                }
            }
        }
        
        res.json({ 
            success: true, 
            availableTimes 
        });
    } catch (error) {
        console.error('Erro ao obter horários disponíveis:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Obter agendamentos por data (para calendário)
app.get('/api/appointments/by-date', authenticateToken, async (req, res) => {
    try {
        console.log('📅 Buscando agendamentos por data...');
        console.log('👤 Usuário logado:', req.user.userId, 'Role:', req.user.role);
        
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data é obrigatória' 
            });
        }
        
        let filter = {
            date: new Date(date)
        };
        
        // FILTRO POR USUÁRIO: Se for usuário comum, só pode ver seus próprios agendamentos
        if (req.user.role === 'user') {
            console.log('🔒 Aplicando filtro de usuário comum - apenas agendamentos próprios por data');
            
            // Buscar o profissional associado ao usuário
            const professional = await Professional.findOne({ userId: req.user.userId });
            if (professional) {
                console.log('🔒 Profissional encontrado para data:', professional._id);
                filter.professional = professional._id;
            } else {
                console.log('⚠️ Nenhum profissional encontrado para o usuário por data');
                // Se não encontrar profissional, retornar array vazio
                filter.professional = null;
            }
        }
        
        console.log('🔍 Filtro por data aplicado:', filter);
        
        const appointments = await Appointment.find(filter)
        .populate('professional', 'firstName lastName function photo')
        .populate('service', 'name price duration')
        .sort({ time: 1 });
        
        console.log('📅 Agendamentos encontrados para a data:', appointments.length);
        
        res.json({ 
            success: true, 
            appointments 
        });
    } catch (error) {
        console.error('Erro ao obter agendamentos por data:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DE CONTATOS ====================

const Contact = require('./models/Contact');

// Listar contatos
app.get('/api/contacts', authenticateToken, async (req, res) => {
    try {
        const { search, origin, page = 1, limit = 20 } = req.query;
        
        let filter = { isActive: true };
        
        // Filtro por busca
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Filtro por origem
        if (origin && origin !== 'all') {
            filter.origin = origin;
        }
        
        const skip = (page - 1) * limit;
        
        const contacts = await Contact.find(filter)
            .sort({ lastInteraction: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Contact.countDocuments(filter);
        
        res.json({
            success: true,
            contacts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Erro ao listar contatos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Obter contato por ID
app.get('/api/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contato não encontrado' });
        }
        
        res.json({ success: true, contact });
        
    } catch (error) {
        console.error('Erro ao obter contato:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Criar novo contato
app.post('/api/contacts', authenticateToken, async (req, res) => {
    try {
        const { name, phone, email, notes, tags } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nome e telefone são obrigatórios' 
            });
        }
        
        // Verificar se já existe contato com este telefone
        const existingContact = await Contact.findOne({ phone });
        if (existingContact) {
            return res.status(400).json({ 
                success: false, 
                message: 'Já existe um contato com este telefone' 
            });
        }
        
        const contact = new Contact({
            name,
            phone,
            email,
            notes,
            tags: tags || [],
            origin: 'manual',
            createdBy: req.user.userId,
            isActive: true
        });
        
        await contact.save();
        
        res.status(201).json({ success: true, contact });
        
    } catch (error) {
        console.error('Erro ao criar contato:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Atualizar contato
app.put('/api/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const { name, phone, email, notes, tags, isActive } = req.body;
        
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contato não encontrado' });
        }
        
        // Verificar se o telefone já existe em outro contato
        if (phone && phone !== contact.phone) {
            const existingContact = await Contact.findOne({ 
                phone, 
                _id: { $ne: req.params.id } 
            });
            if (existingContact) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Já existe um contato com este telefone' 
                });
            }
        }
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (notes !== undefined) updateData.notes = notes;
        if (tags !== undefined) updateData.tags = tags;
        if (isActive !== undefined) updateData.isActive = isActive;
        
        const updatedContact = await Contact.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        res.json({ success: true, contact: updatedContact });
        
    } catch (error) {
        console.error('Erro ao atualizar contato:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Deletar contato (soft delete)
app.delete('/api/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contato não encontrado' });
        }
        
        res.json({ success: true, message: 'Contato removido com sucesso' });
        
    } catch (error) {
        console.error('Erro ao deletar contato:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Sincronizar contatos do WhatsApp
app.post('/api/contacts/sync-whatsapp', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Iniciando sincronização de contatos do WhatsApp...');
        
        const whatsappService = require('./services/whatsappService');
        
        // Verificar se WhatsApp está conectado
        const status = whatsappService.getStatus();
        if (!status.isConnected) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp não está conectado. Conecte o WhatsApp primeiro.'
            });
        }
        
        // Executar sincronização
        const result = await whatsappService.syncContacts();
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                contactsCount: result.contactsCount
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('Erro na sincronização de contatos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Obter contatos do WhatsApp (sem salvar no banco)
app.get('/api/contacts/whatsapp', authenticateToken, async (req, res) => {
    try {
        const whatsappService = require('./services/whatsappService');
        
        const status = whatsappService.getStatus();
        if (!status.isConnected) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp não está conectado'
            });
        }
        
        const result = await whatsappService.getWhatsAppContacts();
        
        if (result.success) {
            res.json({
                success: true,
                contacts: result.contacts,
                count: result.count
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('Erro ao obter contatos do WhatsApp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Estatísticas de contatos
app.get('/api/contacts/stats', authenticateToken, async (req, res) => {
    try {
        const totalContacts = await Contact.countDocuments({ isActive: true });
        const whatsappContacts = await Contact.countDocuments({ 
            isActive: true, 
            origin: 'whatsapp' 
        });
        const manualContacts = await Contact.countDocuments({ 
            isActive: true, 
            origin: 'manual' 
        });
        
        // Contatos com mais interações
        const topContacts = await Contact.find({ isActive: true })
            .sort({ totalAppointments: -1 })
            .limit(5)
            .select('name phone totalAppointments totalSpent');
        
        res.json({
            success: true,
            stats: {
                total: totalContacts,
                whatsapp: whatsappContacts,
                manual: manualContacts,
                topContacts
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter estatísticas de contatos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    
    // Se for erro de JSON malformado
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ 
            success: false, 
            message: 'JSON inválido enviado' 
        });
    }
    
    // Erro genérico
    res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    // Encontrar o IP da rede local
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
        if (localIP !== 'localhost') break;
    }
    
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse localmente: http://localhost:${PORT}`);
    console.log(`🌐 Acesse de outros dispositivos: http://${localIP}:${PORT}`);
    console.log(`🔌 WebSocket ativo para atualizações em tempo real`);
    console.log(`🔧 CORS configurado para aceitar conexões da rede local`);
});
