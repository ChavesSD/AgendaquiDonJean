const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Rota de teste
app.get('/test', (req, res) => {
    res.json({ message: 'Servidor funcionando!', timestamp: new Date().toISOString() });
});

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota do dashboard
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Rota da página pública
app.get('/public-booking.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public-booking.html'));
});

// Conexão com MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chstudiobanco_db_user:VKwho9FvxKQiTO9E@cluster0.qj9gn8z.mongodb.net/ch-studio?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔗 Tentando conectar ao MongoDB...');
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Conectado ao MongoDB Atlas');
    
    // Iniciar servidor
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📱 Acesse: http://localhost:${PORT}`);
    });
})
.catch(err => {
    console.log('⚠️  Erro ao conectar MongoDB Atlas:', err.message);
    console.log('💡 Verifique suas credenciais e conexão com a internet');
    console.log('🔍 URI usada:', MONGODB_URI);
    
    // Iniciar servidor mesmo sem MongoDB para teste
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT} (sem MongoDB)`);
        console.log(`📱 Acesse: http://localhost:${PORT}`);
    });
});
