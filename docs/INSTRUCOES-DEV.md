# 🚀 CH Studio - Modo Desenvolvimento

## ✅ **Sim! Você pode usar `npm run dev` no backend**

### 🎯 **Comandos Disponíveis:**

#### **Modo Desenvolvimento (Recomendado)**
```bash
cd backend
npm run dev
```
- ✅ **Reinicia automaticamente** quando você edita arquivos
- ✅ **Melhor para desenvolvimento**
- ✅ **Mostra logs detalhados**

#### **Modo Produção**
```bash
cd backend
npm start
```
- ✅ **Mais estável**
- ✅ **Para uso final**

## 🚀 **Como Usar Agora:**

### **Opção 1: Script Automático**
```bash
# Na pasta raiz do projeto:
start.bat
```
- Escolha opção [2] para desenvolvimento
- O sistema fará tudo automaticamente

### **Opção 2: Manual**
```bash
# 1. Ir para pasta backend
cd backend

# 2. Instalar dependências (se necessário)
npm install

# 3. Iniciar em modo desenvolvimento
npm run dev
```

## 🔧 **Vantagens do `npm run dev`:**

- ✅ **Auto-reload**: Reinicia quando você edita arquivos
- ✅ **Logs detalhados**: Mostra erros e mudanças
- ✅ **Desenvolvimento ágil**: Não precisa parar/iniciar manualmente
- ✅ **Debugging**: Melhor para encontrar problemas

## 📱 **Acessar o Sistema:**

1. **Inicie o servidor**: `npm run dev` (na pasta backend)
2. **Acesse**: http://localhost:3000
3. **Login**: admin@chstudio.com / admin123

## 🎯 **Fluxo de Desenvolvimento:**

1. **Edite arquivos** no frontend ou backend
2. **Salve** as alterações
3. **Nodemon reinicia** automaticamente
4. **Teste** no navegador
5. **Repita** o processo

## 🚨 **Diferenças:**

| Comando | Uso | Reinicia Automaticamente |
|---------|-----|-------------------------|
| `npm start` | Produção | ❌ Não |
| `npm run dev` | Desenvolvimento | ✅ Sim |

## 📁 **Estrutura do Projeto:**

```
CH Studio/
├── backend/           ← Use npm run dev aqui
│   ├── server.js
│   ├── package.json
│   └── ...
├── frontend/          ← Não precisa de npm
│   ├── index.html
│   ├── dashboard.html
│   └── ...
└── start.bat          ← Script automático
```

## ✅ **Resumo:**

- ✅ **Backend**: Use `npm run dev` (na pasta backend)
- ✅ **Frontend**: Não precisa de npm (HTML/CSS/JS puro)
- ✅ **Acesso**: http://localhost:3000
- ✅ **Desenvolvimento**: Nodemon reinicia automaticamente

---

**CH Studio** - Sistema de Gestão Empresarial © 2024
