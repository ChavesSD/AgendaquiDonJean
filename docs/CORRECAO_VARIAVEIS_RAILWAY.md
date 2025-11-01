# 🔧 Correção de Variáveis de Ambiente no Railway

## ❌ Problema Identificado

O erro 500 no login está ocorrendo porque a variável `JWT_SECRET` **não está configurada** no Railway.

## ✅ Solução

### 1. Adicionar a variável `JWT_SECRET`

1. Acesse o painel do Railway
2. Vá em **Variables** do serviço `web`
3. Clique em **"+ New Variable"**
4. Configure:
   - **Nome:** `JWT_SECRET`
   - **Valor:** `don-jean-super-secret-key-2024`

### 2. Corrigir o `RAILWAY_STATIC_URL` (Opcional mas recomendado)

Atualmente está: `web-production-4120.up.railway.app`  
Deveria ser: `https://web-production-4120.up.railway.app`

1. Edite a variável `RAILWAY_STATIC_URL`
2. Altere para: `https://web-production-4120.up.railway.app`

## 📋 Checklist de Variáveis

Confirme que todas estas variáveis estão configuradas no Railway:

- ✅ `PORT` = `3000`
- ✅ `NODE_ENV` = `production`
- ✅ `MONGODB_URI` = (sua URI do MongoDB Atlas)
- ✅ `CORS_ORIGIN` = `https://web-production-4120.up.railway.app`
- ✅ `RAILWAY_STATIC_URL` = `https://web-production-4120.up.railway.app`
- ❌ **`JWT_SECRET` = `don-jean-super-secret-key-2024`** ⚠️ **FALTANDO!**

## 🔒 Segurança (Opcional)

Para produção, recomenda-se gerar uma chave JWT mais segura:

```bash
# Gerar chave segura (32 caracteres)
openssl rand -base64 32
```

Depois use o resultado como valor da variável `JWT_SECRET`.

## 🚀 Depois de Configurar

1. O Railway irá fazer deploy automaticamente
2. Aguarde o deploy completar
3. Teste o login novamente

## 📝 Notas

- A variável `JWT_SECRET` é **obrigatória** para o sistema funcionar
- Sem ela, o login retornará erro 500
- O código já possui verificação para alertar se `JWT_SECRET` não estiver configurado

