# 🚀 Como Usar o Sistema CH Studio

## ⚡ Teste Rápido (Sem Node.js)

Se você não tem Node.js instalado ou está com problemas, pode testar a interface imediatamente:

### 1. Abra o arquivo de login
- Navegue até a pasta `frontend`
- Abra o arquivo `simple-start.html` no seu navegador
- Ou clique duas vezes no arquivo para abrir

### 2. Faça login
- **Email**: `admin@chstudio.com` (já preenchido)
- **Senha**: `admin123` (já preenchida)
- Clique em "Entrar"

### 3. Explore o sistema
- Navegue pelo menu lateral
- Teste o recolhimento do menu
- Veja todas as telas disponíveis

## 🔧 Instalação Completa (Com Backend)

Se quiser usar o sistema completo com banco de dados:

### 1. Instale o Node.js
- Baixe em: https://nodejs.org/
- Instale a versão LTS (recomendada)

### 2. Instale o MongoDB
- Baixe em: https://www.mongodb.com/try/download/community
- Instale e inicie o serviço

### 3. Execute o sistema
```bash
# No terminal, na pasta do projeto:
cd backend
npm install
node create-admin.js
npm start
```

### 4. Acesse
- Abra: http://localhost:3000
- Login: admin@chstudio.com / admin123

## 📱 Funcionalidades Disponíveis

### ✅ Funcionando Agora
- **Tela de Login** - Design responsivo e validações
- **Dashboard** - Estatísticas e visão geral
- **Menu Lateral** - Recolhível e responsivo
- **Navegação SPA** - Sem recarregar a página
- **Todas as Telas** - Estrutura pronta para desenvolvimento

### 🚧 Em Desenvolvimento
- Agenda
- Financeiro
- Profissionais
- Serviços
- Relatórios
- Configurações

## 🎨 Personalização

### Cores
Edite o arquivo `frontend/styles/dashboard.css`:
```css
:root {
    --primary-color: #3498db;    /* Azul principal */
    --secondary-color: #2c3e50;  /* Azul escuro */
    --success-color: #27ae60;    /* Verde */
    --warning-color: #e67e22;    /* Laranja */
    --danger-color: #e74c3c;     /* Vermelho */
}
```

### Logo e Imagens
- Substitua `Logo.png` pela sua logo
- Substitua `Favicon.png` pelo seu favicon
- Substitua `Background Login.png` pela imagem de fundo

## 🆘 Problemas Comuns

### "Arquivo não encontrado"
- Certifique-se de estar na pasta correta
- Use o arquivo `simple-start.html` para teste rápido

### "Node.js não encontrado"
- Instale o Node.js primeiro
- Ou use a versão simplificada (`simple-start.html`)

### "MongoDB não encontrado"
- Instale o MongoDB
- Ou use a versão simplificada que não precisa de banco

## 📞 Suporte

Se tiver problemas:
1. Tente a versão simplificada primeiro
2. Verifique se os arquivos estão na pasta correta
3. Teste em um navegador diferente

---

**CH Studio** - Sistema de Gestão Empresarial © 2024
