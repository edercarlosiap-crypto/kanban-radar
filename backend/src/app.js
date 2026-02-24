const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3003')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllOrigins = corsOrigins.includes('*');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(compression());

app.use(cors({
  origin: allowAllOrigins ? true : corsOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Backend funcionando ✓' });
});

// Importar rotas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/regionais', require('./routes/regionaisRoutes'));
app.use('/api/funcoes', require('./routes/funcaesRoutes'));
app.use('/api/colaboradores', require('./routes/colaboradoresRoutes'));
app.use('/api/regras-comissao', require('./routes/regrasComissaoRoutes'));
app.use('/api/vendas', require('./routes/vendasRoutes'));
app.use('/api/vendas-mensais', require('./routes/vendasMensaisRoutes'));
app.use('/api/churn-regionais', require('./routes/churnRegionaisRoutes'));
app.use('/api/relatorio-metas', require('./routes/relatorioMetasRoutes'));
app.use('/api/tipos-meta', require('./routes/tiposMetaRoutes'));
app.use('/api/comissionamento', require('./routes/comissionamentoRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

module.exports = app;

 
