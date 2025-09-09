// Sistema de autenticação simples sem MongoDB
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Usuários em memória (simulando banco de dados)
let users = [
    {
        id: 1,
        name: 'Administrador CH Studio',
        email: 'admin@chstudio.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
        role: 'admin',
        createdAt: new Date()
    }
];

// Funções de autenticação
const authService = {
    // Buscar usuário por email
    async findByEmail(email) {
        return users.find(user => user.email === email);
    },

    // Buscar usuário por ID
    async findById(id) {
        return users.find(user => user.id === parseInt(id));
    },

    // Verificar senha
    async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    },

    // Gerar token JWT
    generateToken(user) {
        return jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'ch-studio-secret-key',
            { expiresIn: '24h' }
        );
    },

    // Verificar token JWT
    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'ch-studio-secret-key');
        } catch (error) {
            return null;
        }
    },

    // Criar novo usuário
    async createUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = {
            id: users.length + 1,
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role || 'user',
            createdAt: new Date()
        };
        users.push(newUser);
        return newUser;
    }
};

module.exports = authService;
