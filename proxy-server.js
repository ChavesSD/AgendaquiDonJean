const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração dos clientes
const clients = {
  'chstudio': {
    target: process.env.CHSTUDIO_URL || 'https://chstudio-production.up.railway.app',
    pathRewrite: { '^/chstudio': '' },
    changeOrigin: true
  },
  'cliente2': {
    target: process.env.CLIENTE2_URL || 'https://cliente2-production.up.railway.app',
    pathRewrite: { '^/cliente2': '' },
    changeOrigin: true
  },
  'cliente3': {
    target: process.env.CLIENTE3_URL || 'https://cliente3-production.up.railway.app',
    pathRewrite: { '^/cliente3': '' },
    changeOrigin: true
  }
};

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Página inicial com lista de clientes
app.get('/', (req, res) => {
  const clientList = Object.keys(clients).map(client => ({
    name: client,
    url: `/${client}`,
    status: 'online' // Aqui você pode implementar verificação de status
  }));

  res.json({
    message: 'AgendaQui - Sistema Multi-Cliente',
    clients: clientList,
    totalClients: clientList.length
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    clients: Object.keys(clients)
  });
});

// Roteamento dinâmico para cada cliente
Object.keys(clients).forEach(clientName => {
  const clientConfig = clients[clientName];
  
  // Proxy para API
  app.use(`/${clientName}/api`, createProxyMiddleware({
    target: clientConfig.target,
    changeOrigin: clientConfig.changeOrigin,
    pathRewrite: { [`^/${clientName}/api`]: '/api' },
    onError: (err, req, res) => {
      console.error(`Erro no proxy ${clientName}:`, err.message);
      res.status(503).json({ 
        error: 'Serviço temporariamente indisponível',
        client: clientName
      });
    }
  }));

  // Proxy para assets estáticos
  app.use(`/${clientName}/assets`, createProxyMiddleware({
    target: clientConfig.target,
    changeOrigin: clientConfig.changeOrigin,
    pathRewrite: { [`^/${clientName}/assets`]: '/assets' }
  }));

  // Proxy para todas as outras rotas do cliente
  app.use(`/${clientName}`, createProxyMiddleware({
    target: clientConfig.target,
    changeOrigin: clientConfig.changeOrigin,
    pathRewrite: clientConfig.pathRewrite,
    onError: (err, req, res) => {
      console.error(`Erro no proxy ${clientName}:`, err.message);
      res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Serviço Indisponível</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">Serviço Temporariamente Indisponível</h1>
          <p>O cliente <strong>${clientName}</strong> está temporariamente fora do ar.</p>
          <p>Tente novamente em alguns minutos.</p>
        </body>
        </html>
      `);
    }
  }));
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Cliente não encontrado',
    availableClients: Object.keys(clients),
    requestedPath: req.originalUrl
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Proxy Server rodando na porta ${PORT}`);
  console.log(`📋 Clientes configurados: ${Object.keys(clients).join(', ')}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});

module.exports = app;
