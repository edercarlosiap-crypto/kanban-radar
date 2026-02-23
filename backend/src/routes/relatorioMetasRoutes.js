const express = require('express');
const relatorioMetasController = require('../controllers/relatorioMetasController');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Listar metas individualizadas por todas as regionais
router.get('/', autenticar, relatorioMetasController.obterMetasIndividualizadas);

// Listar metas individualizadas de uma regional específica
router.get('/:regionalId', autenticar, relatorioMetasController.obterMetasIndividualizadasPorRegional);

module.exports = router;
