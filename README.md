# 🏢 CH Studio - Sistema de Gestão Empresarial

Sistema completo de gestão empresarial desenvolvido com HTML, CSS, JavaScript (Frontend) e Node.js + MongoDB (Backend).

## 📁 Estrutura do Projeto

```
CH Studio/
├── 📁 frontend/              # Interface do usuário
│   ├── index.html            # Tela de login
│   ├── dashboard.html        # Dashboard principal
│   ├── styles/               # Arquivos CSS
│   └── js/                   # Arquivos JavaScript
├── 📁 backend/               # Servidor e API
│   ├── server.js             # Servidor principal
│   ├── models/               # Modelos do banco
│   └── package.json          # Dependências
├── 📁 assets/                # Imagens e recursos
│   ├── Logo.png              # Logo da empresa
│   ├── Favicon.png           # Favicon
│   ├── Background Login.png  # Background do login
│   └── Background Dashboard.jpg # Background do dashboard
├── 📁 docs/                  # Documentação
│   ├── README.md             # Documentação completa
│   ├── COMO-USAR.md          # Guia de uso
│   ├── COMO-ACESSAR.md       # Instruções de acesso
│   ├── INSTRUCOES-DEV.md     # Guia de desenvolvimento
│   ├── TESTE-SISTEMA.md      # Guia de teste
│   └── TESTE-LOGIN.md        # Correções de login
├── start.bat                 # Script de inicialização (Windows)
├── start.sh                  # Script de inicialização (Linux/Mac)
└── README.md                 # Este arquivo
```

## 🚀 Início Rápido

### 1. **Desenvolvimento Local**
```bash
# Windows
start.bat

# Linux/Mac
./start.sh

# Manual
cd backend
npm run dev
```

### 2. **Deploy em Produção (Railway)**
```bash
# 1. Configure as variáveis de ambiente no Railway
# 2. Conecte o repositório GitHub
# 3. Deploy automático será executado
```
📖 **Guia completo**: [RAILWAY_DEPLOY_COMPLETE.md](RAILWAY_DEPLOY_COMPLETE.md)

### 3. **Acessar o Sistema**
- **Local**: http://localhost:3000
- **Produção**: https://seu-dominio.railway.app
- **Email**: `admin@chstudio.com`
- **Senha**: `admin123`

## 🎯 Funcionalidades

### ✅ **Implementadas**
- **Tela de Login** - Autenticação segura
- **Dashboard** - Visão geral e estatísticas
- **Menu Lateral** - Navegação recolhível
- **Sistema SPA** - Navegação sem recarregar
- **Design Responsivo** - Mobile e desktop
- **Autenticação JWT** - Segurança avançada

### 🚧 **Estrutura Pronta**
- **Agenda** - Gestão de agendamentos
- **Financeiro** - Controle financeiro
- **Profissionais** - Gestão de equipe
- **Serviços** - Catálogo de serviços
- **Relatórios** - Relatórios e análises
- **Configurações** - Configurações do sistema

## 🛠️ Tecnologias

### **Frontend**
- HTML5, CSS3, JavaScript (ES6+)
- Font Awesome (Ícones)
- Design responsivo

### **Backend**
- Node.js, Express.js
- MongoDB Atlas (Banco de dados)
- JWT (Autenticação)
- Bcrypt (Criptografia)

## 📚 Documentação

### **Documentação Principal**
- **[README Completo](docs/README.md)** - Documentação detalhada
- **[Documentação Completa](docs/DOCUMENTACAO-COMPLETA.md)** - Guia técnico completo

### **Deploy e Produção**
- **[Deploy Railway](RAILWAY_DEPLOY_COMPLETE.md)** - Guia completo de deploy no Railway
- **[Checklist Deploy](DEPLOY_CHECKLIST.md)** - Checklist de verificação

### **Guias de Uso**
- **[Como Usar](docs/COMO-USAR.md)** - Guia de uso
- **[Como Acessar](docs/COMO-ACESSAR.md)** - Instruções de acesso
- **[Desenvolvimento](docs/INSTRUCOES-DEV.md)** - Guia para desenvolvedores
- **[Teste do Sistema](docs/TESTE-SISTEMA.md)** - Guia de testes
- **[Correções de Login](docs/TESTE-LOGIN.md)** - Solução de problemas

## 🎨 Personalização

### **Cores**
Edite `frontend/styles/dashboard.css`:
```css
:root {
    --primary-color: #3498db;    /* Azul principal */
    --secondary-color: #2c3e50;  /* Azul escuro */
    --success-color: #27ae60;    /* Verde */
    --warning-color: #e67e22;    /* Laranja */
    --danger-color: #e74c3c;     /* Vermelho */
}
```

### **Imagens**
Substitua os arquivos na pasta `assets/`:
- `Logo.png` - Logo da empresa
- `Favicon.png` - Favicon
- `Background Login.png` - Background do login
- `Background Dashboard.jpg` - Background do dashboard

## 🔧 Desenvolvimento

### **Comandos Úteis**
```bash
# Modo desenvolvimento (auto-reload)
cd backend
npm run dev

# Modo produção
cd backend
npm start

# Instalar dependências
cd backend
npm install
```

### **Estrutura de Desenvolvimento**
- **Frontend**: HTML/CSS/JS puro (sem build)
- **Backend**: Node.js com Express
- **Banco**: MongoDB Atlas (nuvem)
- **Desenvolvimento**: Nodemon para auto-reload

## 📞 Suporte

Para dúvidas e problemas:
1. Consulte a documentação em `docs/`
2. Verifique o console do navegador (F12)
3. Verifique os logs do servidor

---

**CH Studio** - Sistema de Gestão Empresarial © 2024

**Status**: ✅ **PRONTO PARA USO!**
