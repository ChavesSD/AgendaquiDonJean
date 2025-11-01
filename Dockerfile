# Dockerfile para Don Jean - Suporte a Puppeteer no Railway
FROM node:18-slim

# Instalar dependências do sistema necessárias para Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY Procfile ./

# Copiar backend
COPY backend/ ./backend/

# Copiar frontend (necessário para servir arquivos estáticos)
COPY frontend/ ./frontend/

# Copiar assets (necessário para imagens e recursos)
COPY assets/ ./assets/

# Instalar dependências do backend
RUN cd backend && npm install --production

# Variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_EXECUTABLE_PATH=""
ENV NODE_ENV=production

# Expor porta
EXPOSE 3000

# Comando para iniciar (usar Procfile ou comando direto)
WORKDIR /app/backend
CMD ["node", "server.js"]

