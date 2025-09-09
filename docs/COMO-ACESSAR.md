# 🌐 Como Acessar o Sistema CH Studio

## ❌ **ERRO COMUM**
**NÃO use `npm run dev` no frontend!** O frontend é HTML/CSS/JS puro e não precisa de npm.

## ✅ **FORMA CORRETA**

### 1. Iniciar o Servidor Backend
```bash
# No terminal, na pasta do projeto:
cd backend
node server.js
```

### 2. Acessar no Navegador
- Abra seu navegador
- Acesse: **http://localhost:3000**
- **NÃO** acesse os arquivos HTML diretamente!

## 🔧 **Passo a Passo Detalhado**

### Passo 1: Abrir Terminal
- Abra o PowerShell ou CMD
- Navegue até a pasta do projeto

### Passo 2: Iniciar Servidor
```bash
cd "F:\Dev\Projetos\CH Studio\backend"
node server.js
```

### Passo 3: Verificar se Funcionou
Você deve ver estas mensagens:
```
🚀 Servidor rodando na porta 3000
📱 Acesse: http://localhost:3000
✅ Conectado ao MongoDB Atlas
```

### Passo 4: Acessar no Navegador
- Abra qualquer navegador (Chrome, Firefox, Edge)
- Digite: `http://localhost:3000`
- Pressione Enter

### Passo 5: Fazer Login
- **Email**: `admin@chstudio.com`
- **Senha**: `admin123`

## 🚨 **Problemas Comuns**

### "Não consegue conectar"
- Verifique se o servidor está rodando
- Certifique-se de acessar `http://localhost:3000`
- Não acesse `file:///` ou arquivos HTML diretamente

### "Erro no terminal"
- Certifique-se de estar na pasta `backend`
- Verifique se o Node.js está instalado
- Execute `node server.js` (não `npm run dev`)

### "Página em branco"
- Aguarde alguns segundos para o servidor carregar
- Verifique se não há erros no terminal
- Tente recarregar a página (F5)

## 📱 **Teste Rápido**

1. **Terminal**: `cd backend && node server.js`
2. **Navegador**: `http://localhost:3000`
3. **Login**: `admin@chstudio.com` / `admin123`
4. **Pronto!** Sistema funcionando

## 🎯 **Por que não usar npm no frontend?**

- O frontend é **HTML/CSS/JavaScript puro**
- Não precisa de compilação ou build
- O servidor Node.js já serve os arquivos
- `npm run dev` é para projetos React/Vue/Angular

## ✅ **Resumo**

1. ✅ Inicie o servidor: `node server.js` (na pasta backend)
2. ✅ Acesse: `http://localhost:3000`
3. ✅ Login: `admin@chstudio.com` / `admin123`
4. ✅ Pronto para usar!

---

**CH Studio** - Sistema de Gestão Empresarial © 2024
