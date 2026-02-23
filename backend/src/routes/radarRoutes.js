// ===================================================================
// ROTAS DO RADAR ESTRATÉGICO
// ===================================================================

const express = require('express');
const router = express.Router();
const radarController = require('../controllers/radarController');
const { autenticar } = require('../middleware/auth');
const { apenasEditorOuSuperior, apenasGestorOuSuperior, apenasAdmin } = require('../middleware/permissao');

router.use(autenticar);

// GET /radar - Lista todos os itens
router.get('/', radarController.listar);

// DELETE /radar - Deleta todos os itens (somente admin, com confirmacao na UI)
router.delete('/', apenasAdmin, radarController.deletarTodos);

// GET /radar/estatisticas/dashboard - Retorna estatísticas
router.get('/estatisticas/dashboard', radarController.obterEstatisticas);

// POST /radar - Cria novo item
router.post('/', apenasEditorOuSuperior, radarController.criar);

// POST /radar/preparar-importacao - Analisa Excel e retorna colunas
router.post('/preparar-importacao', apenasGestorOuSuperior, radarController.prepararImportacao);

// POST /radar/importar-excel - Importa de Excel com mapeamento
router.post('/importar-excel', apenasGestorOuSuperior, radarController.importarExcel);

// GET /radar/:id - Busca item específico
router.get('/:id', radarController.buscar);

// PUT /radar/:id - Atualiza item
router.put('/:id', apenasEditorOuSuperior, radarController.atualizar);

// DELETE /radar/:id - Deleta item
router.delete('/:id', apenasGestorOuSuperior, radarController.deletar);

module.exports = router;
