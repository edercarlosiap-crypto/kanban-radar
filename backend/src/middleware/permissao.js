// ===================================================================
// MIDDLEWARE DE PERMISSAO POR PERFIL
// ===================================================================

const NIVEIS = {
  leitura: 1,
  editor: 2,
  gestor: 3,
  admin: 4
};

const criarVerificador = (perfilMinimo) => (req, res, next) => {
  const perfil = req.usuario?.perfil || 'leitura';
  const nivelAtual = NIVEIS[perfil] || 0;
  const nivelNecessario = NIVEIS[perfilMinimo] || 0;

  if (nivelAtual < nivelNecessario) {
    return res.status(403).json({
      erro: 'Permissao insuficiente'
    });
  }

  return next();
};

const apenasEditorOuSuperior = criarVerificador('editor');
const apenasGestorOuSuperior = criarVerificador('gestor');
const apenasAdmin = criarVerificador('admin');

module.exports = {
  apenasEditorOuSuperior,
  apenasGestorOuSuperior,
  apenasAdmin
};
