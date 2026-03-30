const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const vendasMensaisController = require('../controllers/vendasMensaisController');

router.use(autenticar);

// GET /api/vendas-mensais
router.get('/', vendasMensaisController.listar);

// GET /api/vendas-mensais/regional/:regionalId
router.get('/regional/:regionalId', vendasMensaisController.porRegional);

// GET /api/vendas-mensais/vendedor/:vendedorId
router.get('/vendedor/:vendedorId', vendasMensaisController.porVendedor);

// GET /api/vendas-mensais/:id
router.get('/:id', vendasMensaisController.buscar);

// POST /api/vendas-mensais
router.post('/', vendasMensaisController.criar);
router.post('/lote', vendasMensaisController.importarLote);
router.post('/importar-pdf-evento', vendasMensaisController.importarPdfEvento);

// PUT /api/vendas-mensais/:id
router.put('/:id', vendasMensaisController.atualizar);

// DELETE /api/vendas-mensais/:id
router.delete('/:id', vendasMensaisController.deletar);

module.exports = router;
