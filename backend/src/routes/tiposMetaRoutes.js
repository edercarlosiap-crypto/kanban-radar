const express = require('express');
const router = express.Router();
const tiposMetaController = require('../controllers/tiposMetaController');
const { autenticar } = require('../middleware/auth');

// Aplicar middleware de autenticação
router.use(autenticar);

// GET - Listar todos os tipos de meta
router.get('/', tiposMetaController.listar);

// GET - Obter um tipo de meta específico
router.get('/:id', tiposMetaController.obter);

// POST - Criar novo tipo de meta
router.post('/', tiposMetaController.criar);

// PUT - Atualizar tipo de meta
router.put('/:id', tiposMetaController.atualizar);

// DELETE - Deletar tipo de meta
router.delete('/:id', tiposMetaController.deletar);

module.exports = router;
