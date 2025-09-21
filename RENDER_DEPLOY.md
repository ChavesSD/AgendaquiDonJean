# Deploy no Render - CH Studio

## Configuração do Deploy

### 1. Configurações do Serviço Web

- **Tipo**: Web Service
- **Ambiente**: Node
- **Plano**: Free (ou pago conforme necessário)
- **Branch**: master (ou main)

### 2. Comandos de Build e Start

- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`

**⚠️ IMPORTANTE:** Use `&&` (não `;`) para garantir que o segundo comando só execute se o primeiro for bem-sucedido.

### 3. Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no painel do Render:

```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://chstudiobanco_db_user:VKwho9FvxKQiTO9E@cluster0.qj9gn8z.mongodb.net/ch-studio?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=ch-studio-super-secret-key-2024-production
CORS_ORIGIN=*
```

### 4. Estrutura do Projeto

O projeto está configurado para:
- Servir arquivos estáticos do frontend através do Express
- Usar MongoDB Atlas como banco de dados
- Implementar autenticação JWT
- Suportar CORS para requisições do frontend

### 5. Arquivos Importantes

- `backend/server.js` - Servidor principal
- `backend/package.json` - Dependências e scripts
- `render.yaml` - Configuração do Render (opcional)
- `frontend/` - Arquivos estáticos do frontend

### 6. Verificações Pós-Deploy

1. Verificar se o servidor está rodando na porta correta
2. Testar conexão com MongoDB Atlas
3. Verificar se os arquivos estáticos estão sendo servidos
4. Testar autenticação e APIs

### 7. Logs e Monitoramento

- Acesse os logs através do painel do Render
- Monitore o uso de recursos
- Configure alertas se necessário

### 8. Backup e Segurança

- O banco de dados está no MongoDB Atlas (backup automático)
- Variáveis sensíveis estão em variáveis de ambiente
- CORS configurado para produção

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão com MongoDB**: Verificar se a string de conexão está correta
2. **Arquivos estáticos não carregam**: Verificar se o caminho está correto no server.js
3. **Erro de CORS**: Verificar configuração do CORS_ORIGIN
4. **Porta não configurada**: O Render define automaticamente a porta via PORT

### Contato

Para suporte técnico, consulte a documentação do Render ou entre em contato com a equipe de desenvolvimento.
