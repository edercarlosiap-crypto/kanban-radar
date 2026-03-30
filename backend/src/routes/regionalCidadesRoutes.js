const express = require('express');
const router = express.Router();
const { autenticar, apenasAdmin } = require('../middleware/auth');
const controller = require('../controllers/regionalCidadesController');

router.use(autenticar);

router.get('/', controller.listar);
router.post('/', apenasAdmin, controller.criar);
router.put('/:id', apenasAdmin, controller.atualizar);
router.delete('/:id', apenasAdmin, controller.deletar);

module.exports = router;

