# 🌐 Acesso à Rede Local - Don Jean

## 📱 Como Acessar de Outros Dispositivos

### 🔗 URLs de Acesso:
- **Local (mesmo computador):** `http://localhost:3000`
- **Rede local:** `http://10.0.0.15:3000`

### 📋 Pré-requisitos:
1. **Dispositivos na mesma rede Wi-Fi**
2. **Firewall do Windows configurado** (se necessário)
3. **Servidor rodando** na máquina principal

### 🚀 Como Iniciar o Servidor:
```bash
cd backend
node server.js
```

### 🔧 Configurações Atuais:
- **IP da máquina:** `10.0.0.15`
- **Porta:** `3000`
- **CORS:** Configurado para aceitar conexões da rede local
- **Binding:** `0.0.0.0` (aceita conexões de qualquer IP)

### 📱 Testando o Acesso:
1. **No celular/tablet:** Abra o navegador
2. **Digite:** `http://10.0.0.15:3000`
3. **Deve carregar:** A página de login do Don Jean

### ⚠️ Solução de Problemas:

#### Se não conseguir acessar:
1. **Verificar firewall:** Windows Defender pode estar bloqueando
2. **Verificar rede:** Dispositivos devem estar na mesma rede Wi-Fi
3. **Verificar IP:** Execute `ipconfig` para confirmar o IP atual

#### Para liberar no firewall:
```powershell
# Executar como Administrador
New-NetFirewallRule -DisplayName "Don Jean" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### 🔄 Atualizar IP (se necessário):
Se o IP da máquina mudar, edite o arquivo `backend/server.js`:
```javascript
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://SEU_IP_AQUI:3000',  // ← Atualizar aqui
    'http://SEU_IP_AQUI:3001',  // ← E aqui
    process.env.CORS_ORIGIN,
    process.env.RAILWAY_STATIC_URL
].filter(Boolean);
```

### 📊 Status do Servidor:
- ✅ **Servidor rodando:** `0.0.0.0:3000`
- ✅ **CORS configurado:** Para rede local
- ✅ **Conectividade testada:** Funcionando
- ✅ **Responsividade mobile:** Implementada

---
**🎯 Agora você pode acessar o Don Jean de qualquer dispositivo na sua rede local!**
