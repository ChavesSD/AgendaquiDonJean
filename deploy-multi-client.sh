#!/bin/bash

# Script de deploy para sistema multi-cliente AgendaQui
# Este script configura e faz deploy de múltiplos clientes no Railway

echo "🚀 Iniciando deploy do sistema multi-cliente AgendaQui..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${2}${1}${NC}"
}

# Verificar se o Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    print_message "❌ Railway CLI não encontrado. Instale com: npm install -g @railway/cli" $RED
    exit 1
fi

# Verificar se está logado no Railway
if ! railway whoami &> /dev/null; then
    print_message "❌ Não está logado no Railway. Execute: railway login" $RED
    exit 1
fi

print_message "✅ Railway CLI configurado" $GREEN

# Criar projeto proxy principal
print_message "📦 Criando projeto proxy principal..." $BLUE
railway login
railway init --name agendaqui-proxy
railway add

# Configurar variáveis de ambiente do proxy
print_message "⚙️ Configurando variáveis de ambiente..." $YELLOW
railway variables set PORT=3000
railway variables set NODE_ENV=production

# Fazer deploy do proxy
print_message "🚀 Fazendo deploy do proxy..." $BLUE
cp proxy-package.json package.json
railway up

print_message "✅ Deploy do proxy concluído!" $GREEN

# Instruções para configurar clientes
print_message "
📋 PRÓXIMOS PASSOS:

1. Configure as URLs dos clientes no Railway:
   railway variables set CHSTUDIO_URL=https://chstudio-production.up.railway.app
   railway variables set CLIENTE2_URL=https://cliente2-production.up.railway.app
   railway variables set CLIENTE3_URL=https://cliente3-production.up.railway.app

2. Configure o domínio personalizado:
   railway domain add agendaqui.com.br

3. Para cada cliente, faça deploy separado:
   - Crie um novo projeto no Railway
   - Configure o banco de dados
   - Faça deploy da aplicação
   - Atualize a URL no proxy

4. Teste o sistema:
   - Acesse https://agendaqui.com.br/chstudio
   - Acesse https://agendaqui.com.br/cliente2
   - Acesse https://agendaqui.com.br/cliente3

🎉 Sistema multi-cliente configurado com sucesso!
" $GREEN

print_message "🔗 URL do proxy: https://agendaqui-proxy-production.up.railway.app" $BLUE
