const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar ao MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://chstudiobanco_db_user:VKwho9FvxKQiTO9E@cluster0.qj9gn8z.mongodb.net/ch-studio?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado ao MongoDB Atlas'))
.catch(err => console.error('❌ Erro ao conectar MongoDB Atlas:', err));

// Modelo de usuário
const User = require('./models/User');

async function resetAdmin() {
    try {
        // Deletar usuário admin existente
        await User.deleteOne({ email: 'admin@chstudio.com' });
        console.log('🗑️  Usuário admin antigo removido');

        // Dados do admin
        const adminData = {
            name: 'Administrador Agendaqui',
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

// Executar reset do admin
resetAdmin();
