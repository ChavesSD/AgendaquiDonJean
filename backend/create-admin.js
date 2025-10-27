const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar ao MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI não configurada! Configure a variável de ambiente MONGODB_URI');
    process.exit(1);
}

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado ao MongoDB Atlas'))
.catch(err => console.error('❌ Erro ao conectar MongoDB Atlas:', err));

// Modelo de usuário
const User = require('./models/User');

async function createAdmin() {
    try {
        // Verificar se já existe um admin
        const existingAdmin = await User.findOne({ email: 'admin@chstudio.com' });
        if (existingAdmin) {
            console.log('⚠️  Usuário admin já existe:', existingAdmin.email);
            return;
        }

        // Dados do admin
        const adminData = {
            name: 'Administrador CH Studio',
            email: 'admin@chstudio.com',
            password: 'admin123',
            role: 'admin'
        };

        // Criptografar senha
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Criar usuário admin
        const admin = new User({
            name: adminData.name,
            email: adminData.email,
            password: hashedPassword,
            role: adminData.role
        });

        await admin.save();

        console.log('✅ Usuário admin criado com sucesso!');
        console.log('📧 Email: admin@chstudio.com');
        console.log('🔑 Senha: admin123');
        console.log('');
        console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Executar criação do admin
createAdmin();
