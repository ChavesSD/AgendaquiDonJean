# Don Jean - Sistema de Gestão Empresarial

Sistema completo de gestão empresarial desenvolvido com HTML, CSS, JavaScript (Frontend) e Node.js + MongoDB (Backend).

> 📚 **Para documentação completa e detalhada, consulte: [DOCUMENTACAO-COMPLETA.md](DOCUMENTACAO-COMPLETA.md)**

## 🚀 Funcionalidades

- **Autenticação segura** com JWT
- **Dashboard interativo** com estatísticas
- **Menu lateral recolhível** e responsivo
- **Interface moderna** e intuitiva
- **Sistema SPA** (Single Page Application)
- **Design responsivo** para mobile e desktop

## 📋 Módulos Disponíveis

- ✅ **Dashboard** - Visão geral e estatísticas
- 🚧 **Agenda** - Gestão de agendamentos
- 🚧 **Financeiro** - Controle financeiro
- 🚧 **Profissionais** - Gestão de equipe
- 🚧 **Serviços** - Catálogo de serviços
- 🚧 **Relatórios** - Relatórios e análises
- 🚧 **Configurações** - Configurações do sistema

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5
- CSS3 (Flexbox, Grid, Animações)
- JavaScript (ES6+)
- Font Awesome (Ícones)

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT (Autenticação)
- Bcrypt (Criptografia)

## 📦 Instalação

### Pré-requisitos
- Node.js (versão 14 ou superior)
- MongoDB (versão 4.4 ou superior)
- Git

### Passo a passo

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd AgendaquiDonJean
```

2. **Instale as dependências do backend**
```bash
cd backend
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Copie o arquivo de configuração
cp config.env .env

# Edite as configurações se necessário
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/domjeanbanco_db_user?retryWrites=true&w=majority
# JWT_SECRET=don-jean-super-secret-key-2024
```

4. **Inicie o MongoDB**
```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongod
```

5. **Crie o usuário administrador**
```bash
node create-admin.js
```

6. **Inicie o servidor**
```bash
npm start
# ou para desenvolvimento
npm run dev
```

7. **Acesse o sistema**
```
http://localhost:3000
```

## 👤 Credenciais de Acesso

**Usuário Administrador:**
- Email: `admin@donjean.com`
- Senha: `dev18021992`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

## 📁 Estrutura do Projeto

```
AgendaquiDonJean/
├── frontend/
│   ├── index.html          # Tela de login
│   ├── dashboard.html      # Dashboard principal
│   ├── styles/
│   │   ├── login.css       # Estilos da tela de login
│   │   └── dashboard.css   # Estilos do dashboard
│   └── js/
│       ├── login.js        # Lógica da tela de login
│       └── dashboard.js    # Lógica do dashboard
├── backend/
│   ├── server.js           # Servidor principal
│   ├── models/
│   │   └── User.js         # Modelo de usuário
│   ├── create-admin.js     # Script para criar admin
│   ├── package.json        # Dependências
│   └── config.env          # Configurações
├── Logo.png                # Logo da empresa
├── Favicon.png            # Favicon
├── Background Login.png    # Background da tela de login
├── Background Dashboard.jpg # Background do dashboard
└── README.md              # Este arquivo
```

## 🎨 Personalização

### Cores e Tema
As cores principais podem ser alteradas no arquivo `frontend/styles/dashboard.css`:

```css
:root {
    --primary-color: #3498db;
    --secondary-color: #2c3e50;
    --success-color: #27ae60;
    --warning-color: #e67e22;
    --danger-color: #e74c3c;
}
```

### Logo e Imagens
- Substitua `Logo.png` pela logo da sua empresa
- Substitua `Favicon.png` pelo favicon desejado
- Substitua `Background Login.png` e `Background Dashboard.jpg` pelas imagens de fundo

## 🔧 Desenvolvimento

### Adicionando Novas Páginas

1. **Crie o HTML da página** em `frontend/dashboard.html`
2. **Adicione o item no menu** lateral
3. **Implemente a lógica** em `frontend/js/dashboard.js`
4. **Adicione estilos** em `frontend/styles/dashboard.css`

### Adicionando Novas APIs

1. **Crie as rotas** em `backend/server.js`
2. **Implemente os modelos** em `backend/models/`
3. **Adicione validações** e middlewares necessários

## 🚀 Deploy

### Produção

1. **Configure as variáveis de ambiente** para produção
2. **Use um processo manager** como PM2
3. **Configure um proxy reverso** (Nginx)
4. **Use HTTPS** para segurança

### Docker (Opcional)

```dockerfile
# Dockerfile para o backend
FROM node:16-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte e dúvidas, entre em contato:

- Email: suporte@donjean.com
- Documentação: [Link para documentação]
- Issues: [Link para issues do GitHub]

---

**Don Jean** - Sistema de Gestão Empresarial © 2024
