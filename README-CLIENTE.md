# 🏢 CH Studio - Sistema de Agendamento

Sistema completo de agendamento e gestão para salões de beleza, clínicas e prestadores de serviços.

## 🚀 Funcionalidades

- **📅 Agenda**: Gestão completa de agendamentos
- **👥 Profissionais**: Cadastro e gestão de profissionais
- **🛍️ Estoque**: Controle de produtos e serviços
- **💰 Financeiro**: Relatórios e controle financeiro
- **📊 Relatórios**: Dashboards e análises
- **💬 WhatsApp**: Integração com WhatsApp Business
- **🔄 Backup**: Sistema de backup automático

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Banco de Dados**: MongoDB
- **Deploy**: Railway
- **Integração**: WhatsApp Business API

## 📦 Instalação

### **1. Clone o repositório**
```bash
git clone https://github.com/ChavesSD/AgendaquiCHStudio.git
cd AgendaquiCHStudio
```

### **2. Instalar dependências**
```bash
# Backend
cd backend
npm install

# Frontend (se necessário)
cd ../frontend
# Dependências já incluídas via CDN
```

### **3. Configurar variáveis de ambiente**
```bash
# Copiar arquivo de exemplo
cp backend/env.example backend/.env

# Editar variáveis
nano backend/.env
```

### **4. Executar localmente**
```bash
# Backend
cd backend
npm start

# Frontend
# Abrir frontend/index.html no navegador
```

## 🌐 Deploy no Railway

### **1. Conectar ao Railway**
```bash
railway login
railway init
```

### **2. Configurar banco de dados**
```bash
railway add mongodb
```

### **3. Configurar variáveis de ambiente**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000
# Adicionar outras variáveis conforme necessário
```

### **4. Deploy**
```bash
railway up
```

## 🔧 Configuração

### **Variáveis de Ambiente Necessárias**

```env
# Servidor
NODE_ENV=production
PORT=3000

# Banco de Dados
MONGODB_URI=mongodb://...

# WhatsApp (opcional)
WHATSAPP_TOKEN=seu_token_aqui
WHATSAPP_PHONE_ID=seu_phone_id_aqui

# Outras configurações
JWT_SECRET=sua_chave_secreta
```

## 📱 Uso do Sistema

### **1. Primeiro Acesso**
- Acesse a URL do sistema
- Faça login com as credenciais fornecidas
- Configure os dados da empresa

### **2. Configuração Inicial**
- Cadastre profissionais
- Configure serviços e produtos
- Defina horários de funcionamento
- Configure integração WhatsApp (opcional)

### **3. Uso Diário**
- Gerencie agendamentos
- Controle estoque
- Acompanhe relatórios financeiros
- Use backup automático

## 🔒 Segurança

- **Autenticação**: Sistema de login seguro
- **Permissões**: Controle de acesso por usuário
- **Backup**: Backup automático dos dados
- **SSL**: Certificado de segurança automático

## 📊 Relatórios Disponíveis

- **Agenda**: Atendimentos por período
- **Estoque**: Produtos e movimentações
- **Financeiro**: Receitas e despesas
- **Profissionais**: Performance individual
- **Serviços**: Serviços mais procurados
- **Comissões**: Cálculo de comissões

## 🆘 Suporte

Para dúvidas ou problemas:

1. **Verificar logs** do Railway
2. **Consultar documentação** do sistema
3. **Entrar em contato** com o suporte técnico

## 📈 Atualizações

O sistema recebe atualizações automáticas via GitHub. Para aplicar:

1. **Fazer pull** das atualizações
2. **Fazer deploy** no Railway
3. **Verificar funcionamento**

## 🎯 Multi-Cliente

Este repositório é preparado para funcionar em sistemas multi-cliente:

- **Detecção automática** de cliente via URL
- **URLs dinâmicas** para API e assets
- **Isolamento de dados** por cliente
- **Configuração flexível** por cliente

---

**Desenvolvido por CH Studio** 🚀
