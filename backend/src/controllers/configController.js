// ===================================================================
// CONTROLADOR DE CONFIGURACOES PUBLICAS
// ===================================================================

const fs = require('fs');
const path = require('path');
const { db_get } = require('../config/database');
const { obterRadarOpcoes } = require('../utils/radarOpcoes');

exports.obterLogo = async (req, res) => {
  try {
    const registro = await db_get('SELECT logo FROM configuracoes WHERE id = 1', []);

    if (!registro || !registro.logo) {
      return res.status(200).json({ logoUrl: null });
    }

    const logoPath = registro.logo.replace(/\\/g, '/');
    const arquivo = path.join(__dirname, '../../', logoPath);

    if (!fs.existsSync(arquivo)) {
      return res.status(200).json({ logoUrl: null });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/${logoPath}`;

    return res.status(200).json({ logoUrl: url });
  } catch (erro) {
    console.error('Erro ao obter logo:', erro);
    return res.status(500).json({ erro: 'Erro ao obter logo' });
  }
};

// GET /config/radar-opcoes - Retorna opcoes publicas do radar
exports.obterRadarOpcoes = async (req, res) => {
  try {
    const opcoes = await obterRadarOpcoes();
    return res.status(200).json(opcoes);
  } catch (erro) {
    console.error('Erro ao obter opcoes do radar:', erro);
    return res.status(500).json({ erro: 'Erro ao obter opcoes do radar' });
  }
};
