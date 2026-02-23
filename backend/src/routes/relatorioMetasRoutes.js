const express = require('express');
const relatorioMetasController = require('../controllers/relatorioMetasController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar metas individualizadas por todas as regionais
router.get('/', autenticar, apenasAdmin, relatorioMetasController.obterMetasIndividualizadas);

// Listar metas individualizadas de uma regional específica
router.get('/:regionalId', autenticar, apenasAdmin, relatorioMetasController.obterMetasIndividualizadasPorRegional);

module.exports = router;
