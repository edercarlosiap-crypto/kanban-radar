const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const churnRegionaisController = require('../controllers/churnRegionaisController');

router.use(autenticar);

// GET /api/churn-regionais
router.get('/', churnRegionaisController.listar);

// GET /api/churn-regionais/:id
router.get('/:id', churnRegionaisController.buscar);

// POST /api/churn-regionais
router.post('/', churnRegionaisController.criarOuAtualizar);
router.post('/lote', churnRegionaisController.importarLote);

// PUT /api/churn-regionais/:id
router.put('/:id', churnRegionaisController.atualizar);

// DELETE /api/churn-regionais/:id
router.delete('/:id', churnRegionaisController.deletar);

module.exports = router;
