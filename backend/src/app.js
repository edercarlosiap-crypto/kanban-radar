const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

const corsDefaults = [
  'http://localhost:3000',
  'http://localhost:3003',
  'http://localhost:3303',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3303'
];

const envCors = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigins = Array.from(new Set([...corsDefaults, ...envCors]));

const allowAllOrigins = corsOrigins.includes('*');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(compression());

app.use(cors({
  origin: (origin, callback) => {
    if (allowAllOrigins || !origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return callback(null, true);
    return callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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
app.use('/api/regional-cidades', require('./routes/regionalCidadesRoutes'));
app.use('/api/funcoes', require('./routes/funcaesRoutes'));
app.use('/api/colaboradores', require('./routes/colaboradoresRoutes'));
app.use('/api/regras-comissao', require('./routes/regrasComissaoRoutes'));
app.use('/api/vendas', require('./routes/vendasRoutes'));
app.use('/api/vendas-mensais', require('./routes/vendasMensaisRoutes'));
app.use('/api/churn-regionais', require('./routes/churnRegionaisRoutes'));
app.use('/api/retencao', require('./routes/retencaoRoutes'));
app.use('/api/contratos', require('./routes/contratosRoutes'));
app.use('/api/marketing', require('./routes/marketingRoutes'));
app.use('/api/relatorio-metas', require('./routes/relatorioMetasRoutes'));
app.use('/api/tipos-meta', require('./routes/tiposMetaRoutes'));
app.use('/api/comissionamento', require('./routes/comissionamentoRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Arquivo de importacao muito grande para o limite atual da API' });
  }
  console.error('Erro:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

module.exports = app;

 
