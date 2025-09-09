const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar ao MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://chstudiobanco_db_user:VKwho9FvxKQiTO9E@cluster0.qj9gn8z.mongodb.net/ch-studio?retryWrites=true&w=majority&appName=Cluster0';

async function createAdminDirect() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Conectado ao MongoDB Atlas');

        // Modelo de usuário
        const User = require('./models/User');

        // Deletar usuário admin existente
        await User.deleteMany({ email: 'admin@chstudio.com' });
        console.log('🗑️  Usuários admin antigos removidos');

        // Criptografar senha
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Criar usuário admin
        const admin = new User({
            name: 'Administrador CH Studio',
            email: 'admin@chstudio.com',
            password: hashedPassword,
            role: 'admin'
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
        await mongoose.connection.close();
        console.log('🔌 Conexão fechada');
    }
}

// Executar criação do admin
createAdminDirect();
