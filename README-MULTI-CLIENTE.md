# 🏢 Sistema Multi-Cliente AgendaQui

Sistema de agendamento que suporta múltiplos clientes em um único domínio, com repositórios e bancos de dados separados.

## 🎯 Estrutura do Sistema

```
agendaqui.com.br/
├── /chstudio          → Cliente 1 (CH Studio)
├── /cliente2          → Cliente 2
├── /cliente3          → Cliente 3
└── /admin             → Painel administrativo (opcional)
```

## 🏗️ Arquitetura

### **Proxy Reverso**
- **Arquivo**: `proxy-server.js`
- **Função**: Roteia requisições para clientes corretos
- **Deploy**: Railway (projeto principal)

### **Clientes**
- **Repositórios**: Separados no GitHub
- **Deploys**: Railway independentes
- **Bancos**: Dados isolados por cliente

## 🚀 Como Implementar

### **1. Configurar Proxy Principal**

```bash
# Fazer deploy do proxy
railway login
railway init --name agendaqui-proxy
cp proxy-package.json package.json
railway up
```

### **2. Configurar Variáveis de Ambiente**

```bash
# URLs dos clientes
railway variables set CHSTUDIO_URL=https://chstudio-production.up.railway.app
railway variables set CLIENTE2_URL=https://cliente2-production.up.railway.app
railway variables set CLIENTE3_URL=https://cliente3-production.up.railway.app
```

### **3. Configurar Domínio**

```bash
# Adicionar domínio personalizado
railway domain add agendaqui.com.br
```

### **4. Deploy de Cada Cliente**

Para cada cliente:

1. **Criar repositório** no GitHub
2. **Criar projeto** no Railway
3. **Configurar banco** de dados
4. **Fazer deploy** da aplicação
5. **Atualizar URL** no proxy

## 📁 Estrutura de Arquivos

```
/
├── proxy-server.js              # Servidor proxy principal
├── proxy-package.json           # Dependências do proxy
├── clients-config.json          # Configuração dos clientes
├── deploy-multi-client.sh       # Script de deploy
├── railway-proxy.json           # Configuração Railway
├── frontend/
│   ├── js/utils/
│   │   └── client-detector.js   # Detecção de cliente
│   ├── dashboard.html           # Interface principal
│   └── js/dashboard.js          # Lógica com suporte multi-cliente
└── README-MULTI-CLIENTE.md      # Esta documentação
```

## 🔧 Configuração dos Clientes

### **Arquivo de Configuração** (`clients-config.json`)

```json
{
  "clients": {
    "chstudio": {
      "name": "CH Studio",
      "url": "https://chstudio-production.up.railway.app",
      "database": "chstudio_db",
      "status": "active",
      "features": ["agenda", "estoque", "financeiro", "profissionais", "servicos", "comissoes"]
    }
  }
}
```

## 🌐 URLs de Acesso

- **Cliente 1**: `https://agendaqui.com.br/chstudio`
- **Cliente 2**: `https://agendaqui.com.br/cliente2`
- **Cliente 3**: `https://agendaqui.com.br/cliente3`
- **API Cliente 1**: `https://agendaqui.com.br/chstudio/api`
- **API Cliente 2**: `https://agendaqui.com.br/cliente2/api`

## 🔒 Segurança

- **Isolamento de dados**: Cada cliente tem seu próprio banco
- **Autenticação**: Tokens isolados por cliente
- **Proxy seguro**: Headers de segurança configurados
- **SSL**: Certificado automático via Railway

## 📊 Monitoramento

### **Health Check**
```bash
curl https://agendaqui.com.br/health
```

### **Status dos Clientes**
```bash
curl https://agendaqui.com.br/
```

## 🛠️ Desenvolvimento

### **Local**
```bash
# Instalar dependências do proxy
npm install

# Executar proxy local
node proxy-server.js
```

### **Teste Multi-Cliente**
```bash
# Acessar cliente 1
http://localhost:3000/chstudio

# Acessar cliente 2
http://localhost:3000/cliente2
```

## 📈 Escalabilidade

### **Adicionar Novo Cliente**

1. **Atualizar** `clients-config.json`
2. **Adicionar** variável de ambiente no Railway
3. **Fazer deploy** da aplicação do cliente
4. **Testar** roteamento

### **Exemplo de Novo Cliente**

```javascript
// Adicionar em clients-config.json
"cliente4": {
  "name": "Cliente 4",
  "url": "https://cliente4-production.up.railway.app",
  "database": "cliente4_db",
  "status": "active",
  "features": ["agenda", "profissionais"]
}
```

## 🎉 Benefícios

- ✅ **Custo reduzido**: Um domínio para todos
- ✅ **Gerenciamento centralizado**: Fácil administração
- ✅ **Escalabilidade**: Adicionar clientes é simples
- ✅ **Isolamento**: Dados separados por cliente
- ✅ **SEO otimizado**: Domínio principal forte
- ✅ **Backup centralizado**: Todos os dados em um lugar

## 🆘 Suporte

Para dúvidas ou problemas:

1. **Verificar logs** do Railway
2. **Testar health check** de cada cliente
3. **Verificar configuração** das variáveis de ambiente
4. **Consultar documentação** do Railway

---

**Desenvolvido por CH Studio** 🚀
