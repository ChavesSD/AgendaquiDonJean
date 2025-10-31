# ✅ Checklist de Deploy - Don Jean

## 🔧 Configuração do Railway

### 1. Projeto Railway
- [ ] Conta criada no Railway
- [ ] Projeto conectado ao repositório GitHub
- [ ] Build settings configurados (Root: `/backend`)

### 2. Variáveis de Ambiente
- [ ] `PORT=3000`
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` configurada (MongoDB Atlas)
- [ ] `JWT_SECRET` definida (chave segura)
- [ ] `CORS_ORIGIN` configurada (domínio Railway)
- [ ] `RAILWAY_STATIC_URL` configurada

### 3. MongoDB Atlas
- [ ] Cluster criado e configurado
- [ ] Usuário com permissões de leitura/escrita
- [ ] IP whitelisted (`0.0.0.0/0` para Railway)
- [ ] String de conexão testada

## 🚀 Deploy

### 1. Código
- [ ] Código commitado e enviado para GitHub
- [ ] Branch `master` atualizada
- [ ] Arquivos de configuração criados:
  - [ ] `railway.json`
  - [ ] `RAILWAY_DEPLOY.md`
  - [ ] `backend/.gitignore`

### 2. Build
- [ ] Build executado com sucesso
- [ ] Dependências instaladas
- [ ] Health check respondendo (`/api/health`)

### 3. Testes
- [ ] Aplicação acessível via URL Railway
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] API endpoints respondendo
- [ ] Banco de dados conectado

## 🔍 Verificações Pós-Deploy

### 1. Funcionalidades Básicas
- [ ] Página de login carrega
- [ ] Autenticação funciona
- [ ] Dashboard principal carrega
- [ ] Navegação entre páginas funciona

### 2. API Endpoints
- [ ] `/api/health` - Status OK
- [ ] `/api/auth/login` - Login funciona
- [ ] `/api/appointments` - Lista agendamentos
- [ ] `/api/finance` - Dados financeiros
- [ ] `/api/professionals` - Lista profissionais

### 3. Banco de Dados
- [ ] Conexão estabelecida
- [ ] Modelos carregando
- [ ] CRUD operations funcionando
- [ ] Backup automático ativo

### 4. Frontend
- [ ] Assets carregando (CSS, JS, imagens)
- [ ] Responsividade funcionando
- [ ] Botão AI visível (apenas para admins)
- [ ] Formulários funcionando

## 🛠️ Troubleshooting

### Problemas Comuns

#### Build Falha
- [ ] Verificar dependências no `package.json`
- [ ] Confirmar `NODE_ENV=production`
- [ ] Verificar logs de build no Railway

#### Banco não Conecta
- [ ] Verificar string de conexão MongoDB
- [ ] Confirmar IP whitelisted
- [ ] Testar credenciais do usuário

#### CORS Errors
- [ ] Configurar `CORS_ORIGIN` corretamente
- [ ] Verificar domínio exato (sem trailing slash)
- [ ] Testar com diferentes browsers

#### Assets não Carregam
- [ ] Verificar caminhos dos arquivos estáticos
- [ ] Confirmar estrutura de pastas
- [ ] Verificar permissões de arquivo

## 📊 Monitoramento

### 1. Logs
- [ ] Logs acessíveis no Railway
- [ ] Erros sendo logados corretamente
- [ ] Performance sendo monitorada

### 2. Métricas
- [ ] CPU usage normal
- [ ] Memória dentro dos limites
- [ ] Network traffic adequado

### 3. Alertas
- [ ] Alertas configurados para downtime
- [ ] Notificações de erro ativas
- [ ] Monitoramento de performance

## 🔄 Manutenção

### 1. Atualizações
- [ ] Processo de deploy automatizado
- [ ] Rollback strategy definida
- [ ] Backup antes de updates

### 2. Segurança
- [ ] JWT secret forte
- [ ] Rate limiting ativo
- [ ] CORS configurado corretamente
- [ ] Dependências atualizadas

### 3. Performance
- [ ] Cache implementado
- [ ] Otimizações de banco
- [ ] Compressão de assets
- [ ] CDN configurado (se necessário)

---

## 🎯 Status Final

- [ ] **Deploy Completo**: Sistema funcionando em produção
- [ ] **Testes Passando**: Todas as funcionalidades verificadas
- [ ] **Monitoramento Ativo**: Logs e métricas configurados
- [ ] **Documentação Atualizada**: Guias de deploy e manutenção

**✅ Sistema pronto para produção!**
