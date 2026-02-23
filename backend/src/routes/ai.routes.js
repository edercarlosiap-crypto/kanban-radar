const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

// GET /api/ai/priorities
router.get('/priorities', aiController.getPriorities);

module.exports = router;
