# 📚 Agendaqui - Documentação Completa

## 🎯 **Visão Geral**

O **Agendaqui** é um sistema completo de gestão empresarial desenvolvido com tecnologias modernas, oferecendo uma interface intuitiva e funcionalidades robustas para gerenciamento de negócios.

## 🚀 **Funcionalidades Implementadas**

### ✅ **Sistema de Autenticação**
- Login seguro com JWT (JSON Web Token)
- Criptografia de senhas com bcrypt
- Sistema de permissões por role (admin, manager, user)
- Persistência de sessão no localStorage

### ✅ **Interface Moderna**
- Dashboard responsivo e interativo
- Menu lateral recolhível
- Design SPA (Single Page Application)
- Interface adaptável para mobile e desktop
- Tema personalizável com cores consistentes

### ✅ **Módulos Disponíveis**
- **Dashboard** - Visão geral e estatísticas
- **Agenda** - Gestão de agendamentos (em desenvolvimento)
- **Estoque** - Controle de inventário (em desenvolvimento)
- **Financeiro** - Controle financeiro (em desenvolvimento)
- **Profissionais** - Gestão de equipe (em desenvolvimento)
- **Serviços** - Catálogo de serviços (em desenvolvimento)
- **Relatórios** - Relatórios e análises (em desenvolvimento)
- **Configurações** - Configurações do sistema

### ✅ **Sistema de Backup e Manutenção**
- Criação automática de backups do banco de dados
- Download de backups em formato ZIP
- Importação de backups externos
- Restauração de backups (sistema e importados)
- Manutenção e otimização do banco de dados
- Interface em tabela organizada e responsiva
- Filtros por data para localização de backups

### ✅ **Gerenciamento de Usuários**
- Criação e edição de usuários
- Sistema de roles e permissões
- Upload de avatar personalizado
- Validações de segurança

## 🛠️ **Tecnologias Utilizadas**

### **Frontend**
- **HTML5** - Estrutura semântica
- **CSS3** - Estilos modernos com Flexbox e Grid
- **JavaScript ES6+** - Lógica interativa
- **Font Awesome** - Biblioteca de ícones
- **Responsive Design** - Adaptável a todos os dispositivos

### **Backend**
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação segura
- **Bcrypt** - Criptografia de senhas
- **Multer** - Upload de arquivos
- **Archiver** - Criação de arquivos ZIP

## 📦 **Instalação e Configuração**

### **Pré-requisitos**
- Node.js (versão 14 ou superior)
- MongoDB (versão 4.4 ou superior) ou MongoDB Atlas
- Git

### **Instalação Passo a Passo**

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd ch-studio
```

2. **Instale as dependências do backend**
```bash
cd backend
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Edite o arquivo config.env com suas configurações
MONGODB_URI=mongodb://localhost:27017/ch-studio
JWT_SECRET=ch-studio-super-secret-key-2024
```

4. **Crie o usuário administrador**
```bash
node create-admin.js
```

5. **Inicie o servidor**
```bash
# Modo desenvolvimento (com auto-reload)
npm run dev

# Modo produção
npm start
```

6. **Acesse o sistema**
```
http://localhost:3000
```

## 👤 **Credenciais de Acesso**

### **Usuário Administrador Padrão**
- **Email**: `admin@chstudio.com`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

## 📁 **Estrutura do Projeto**

```
ch-studio/
├── frontend/
│   ├── index.html              # Tela de login
│   ├── dashboard.html          # Dashboard principal
│   ├── js/
│   │   ├── login.js           # Lógica de autenticação
│   │   ├── dashboard.js       # Lógica do dashboard
│   │   └── backup.js          # Gerenciamento de backups
│   └── styles/
│       ├── login.css          # Estilos da tela de login
│       └── dashboard.css      # Estilos do dashboard
├── backend/
│   ├── server.js              # Servidor principal
│   ├── models/
│   │   ├── User.js            # Modelo de usuário
│   │   ├── CompanySettings.js # Configurações da empresa
│   │   └── WhatsAppMessages.js # Mensagens do WhatsApp
│   ├── services/
│   │   ├── backupService.js   # Serviços de backup
│   │   └── whatsappService.js # Serviços do WhatsApp
│   ├── create-admin.js        # Script para criar admin
│   ├── package.json           # Dependências
│   └── config.env             # Configurações
├── assets/                    # Imagens e recursos
├── docs/                     # Documentação
└── README.md                 # Documentação principal
```

## 🎨 **Personalização**

### **Cores e Tema**
Edite o arquivo `frontend/styles/dashboard.css`:

```css
:root {
    --primary-color: #975756;      /* Cor principal (vinho) */
    --secondary-color: #2c3e50;    /* Cor secundária (azul escuro) */
    --success-color: #27ae60;      /* Verde para sucesso */
    --warning-color: #e67e22;      /* Laranja para avisos */
    --danger-color: #e74c3c;       /* Vermelho para erros */
}
```

### **Logo e Imagens**
- Substitua `assets/Logo.png` pela logo da sua empresa
- Substitua `assets/Favicon.png` pelo favicon desejado
- Substitua `assets/Background Login.png` pela imagem de fundo do login
- Substitua `assets/Background Dashboard.jpg` pela imagem de fundo do dashboard

## 🔧 **Desenvolvimento**

### **Adicionando Novas Páginas**

1. **Crie o HTML da página** em `frontend/dashboard.html`
2. **Adicione o item no menu** lateral
3. **Implemente a lógica** em `frontend/js/dashboard.js`
4. **Adicione estilos** em `frontend/styles/dashboard.css`
5. **Configure permissões** no sistema de roles

### **Adicionando Novas APIs**

1. **Crie as rotas** em `backend/server.js`
2. **Implemente os modelos** em `backend/models/`
3. **Adicione validações** e middlewares necessários
4. **Configure permissões** no middleware `requirePermission`

### **Sistema de Permissões**

```javascript
// Roles disponíveis
const PERMISSIONS = {
    admin: {
        canCreateUsers: true,
        canCreateAdmin: true,
        canAccessBackup: true,
        canAccessAllPages: true,
        pages: ['dashboard', 'agenda', 'estoque', 'financeiro', 'profissionais', 'servicos', 'relatorios', 'configuracoes']
    },
    manager: {
        canCreateUsers: true,
        canCreateAdmin: false,
        canAccessBackup: false,
        canAccessAllPages: true,
        pages: ['dashboard', 'agenda', 'estoque', 'financeiro', 'profissionais', 'servicos', 'relatorios', 'configuracoes']
    },
    user: {
        canCreateUsers: false,
        canCreateAdmin: false,
        canAccessBackup: false,
        canAccessAllPages: false,
        pages: ['dashboard', 'agenda', 'estoque']
    }
};
```

## 🚀 **Deploy e Produção**

### **Deploy no Railway (Recomendado)**

O sistema está completamente preparado para deploy na plataforma Railway:

#### **Configuração Rápida**
1. **Acesse [railway.app](https://railway.app)**
2. **Conecte o repositório GitHub**
3. **Configure root directory**: `/backend`
4. **Adicione as variáveis de ambiente**
5. **Deploy automático será executado**

#### **Variáveis de Ambiente Necessárias**
```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ch-studio
JWT_SECRET=sua-chave-super-secreta-aqui
CORS_ORIGIN=https://seu-dominio.railway.app
RAILWAY_STATIC_URL=https://seu-dominio.railway.app
```

📖 **Guia completo**: [RAILWAY_DEPLOY_COMPLETE.md](../RAILWAY_DEPLOY_COMPLETE.md)

### **Deploy Tradicional (VPS/Dedicado)**

#### **Configuração para Produção**

1. **Configure as variáveis de ambiente** para produção
2. **Use um processo manager** como PM2
3. **Configure um proxy reverso** (Nginx)
4. **Use HTTPS** para segurança
5. **Configure backup automático** do banco de dados

#### **Comandos de Produção**

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação com PM2
pm2 start backend/server.js --name "ch-studio"

# Verificar status
pm2 status

# Parar aplicação
pm2 stop ch-studio
```

## 🐛 **Solução de Problemas**

### **Problemas Comuns**

#### **"Não consegue conectar"**
- Verifique se o servidor está rodando na porta 3000
- Certifique-se de acessar `http://localhost:3000`
- Verifique se não há conflitos de porta

#### **"Erro de login"**
- Use as credenciais: `admin@chstudio.com` / `admin123`
- Verifique se o MongoDB está acessível
- Verifique o console do navegador (F12) para erros

#### **"Página não encontrada"**
- Certifique-se de acessar `http://localhost:3000`
- Não acesse os arquivos HTML diretamente
- Use o servidor Node.js para servir os arquivos

#### **"Erro 403 Forbidden"**
- Verifique as permissões do usuário
- Certifique-se de que o usuário tem acesso à funcionalidade
- Verifique se o token JWT é válido

### **Logs e Debug**

```bash
# Ver logs do servidor
pm2 logs ch-studio

# Ver logs em tempo real
pm2 logs ch-studio --lines 100

# Reiniciar aplicação
pm2 restart ch-studio
```

## 📊 **Banco de Dados**

### **MongoDB Collections**

- **users** - Dados dos usuários
- **companysettings** - Configurações da empresa
- **whatsappmessages** - Mensagens do WhatsApp
- **backups** - Metadados dos backups

### **Backup e Restauração**

O sistema inclui funcionalidades completas de backup:

- **Criação automática** de backups do banco
- **Download** de backups em formato ZIP
- **Importação** de backups externos
- **Restauração** de dados
- **Manutenção** e otimização do banco

## 🔒 **Segurança**

### **Medidas Implementadas**

- **Autenticação JWT** com tokens seguros
- **Criptografia de senhas** com bcrypt
- **Validação de entrada** em todas as rotas
- **Sistema de permissões** granular
- **Sanitização de dados** para prevenir XSS
- **Rate limiting** para prevenir ataques

### **Recomendações**

- Altere a senha padrão do administrador
- Configure HTTPS em produção
- Mantenha as dependências atualizadas
- Faça backups regulares do banco de dados
- Monitore logs de acesso

## 📞 **Suporte e Contribuição**

### **Como Contribuir**

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### **Reportar Problemas**

- Use o sistema de Issues do GitHub
- Inclua logs de erro quando possível
- Descreva os passos para reproduzir o problema
- Inclua informações sobre o ambiente (OS, Node.js, etc.)

## 📝 **Changelog**

### **Versão Atual - v1.0.0**

#### **Funcionalidades Implementadas**
- ✅ Sistema de autenticação completo
- ✅ Dashboard responsivo e interativo
- ✅ Sistema de backup e manutenção
- ✅ Gerenciamento de usuários
- ✅ Interface moderna e responsiva
- ✅ Sistema de permissões por role
- ✅ Módulo de Estoque (estrutura)
- ✅ Configurações do sistema

#### **Melhorias Futuras**
- 🚧 Implementação completa dos módulos
- 🚧 Integração com WhatsApp
- 🚧 Relatórios avançados
- 🚧 API REST completa
- 🚧 Testes automatizados

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Agendaqui** - Sistema de Gestão Empresarial © 2025

**Desenvolvido com ❤️ para facilitar a gestão empresarial**
