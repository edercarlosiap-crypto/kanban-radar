// ===================================================================
// ROTAS DE RETENCAO DE CLIENTES
// ===================================================================

const express = require('express');
const router = express.Router();
const retentionController = require('../controllers/retentionController');
const { autenticar } = require('../middleware/auth');

// Todas as rotas de retencao exigem autenticacao
router.use(autenticar);

// POST /retention/attempts - Registrar nova tentativa de retencao
router.post('/attempts', retentionController.createAttempt);

// GET /retention/metadata - Retorna opcoes para selects do frontend
router.get('/metadata', retentionController.getMetadata);

// GET /retention/dashboard - Retorna KPIs e dados para graficos do dashboard
router.get('/dashboard', retentionController.getDashboardData);

// GET /retention/leaderboard - Retorna dados para o leaderboard de atendentes
router.get('/leaderboard', retentionController.getLeaderboardData);

module.exports = router;
