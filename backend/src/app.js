const path = require('path');

// ===================================================================
// CONFIGURAÇÃO PRINCIPAL DO EXPRESS
// ===================================================================

const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ================= MIDDLEWARES GLOBAIS =================

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= UPLOAD DE ARQUIVOS =================

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}));

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ erro: 'Arquivo muito grande. Limite: 50MB' });
  }
  next(err);
});

// ================= ROTAS =================

const authRoutes = require('./routes/authRoutes');
const radarRoutes = require('./routes/radarRoutes');
const adminRoutes = require('./routes/adminRoutes');
const configRoutes = require('./routes/configRoutes');
const relatoriosRoutes = require('./routes/relatoriosRoutes');
const retentionRoutes = require('./routes/retentionRoutes');
const aiRoutes = require('./routes/ai.routes');
const relatorioMetasRoutes = require('./routes/relatorioMetasRoutes');

// 🔥 PADRÃO ÚNICO DE API
app.use('/api/auth', authRoutes);
app.use('/api/radar', radarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/retention', retentionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/relatorio-metas', relatorioMetasRoutes);


// arquivos enviados
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ================= HEALTH CHECK =================

app.get('/health', (req, res) => {
  res.json({ status: 'Backend funcionando ✓' });
});

// ================= 404 =================

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// ================= ERRO GLOBAL =================

app.use((err, req, res, next) => {
  console.error('Erro global não tratado no Express:', err.stack || err);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor'
  });
});

module.exports = app;
