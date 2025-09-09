const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
                role: user.role
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

// Rota para verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Rotas protegidas
app.get('/api/dashboard', authenticateToken, (req, res) => {
    res.json({ message: 'Dados do dashboard' });
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
});
