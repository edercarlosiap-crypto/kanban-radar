const Usuario = require('../models/Usuario');
const { gerarToken } = require('../middleware/auth');

// POST /api/auth/register
exports.registrar = async (req, res) => {
  try {
    const { nome, email, senha, senhaConfirm, role } = req.body;

    if (!nome || !email || !senha || !senhaConfirm) {
      return res.status(400).json({ erro: 'Campos obrigatórios não fornecidos' });
    }

    if (senha !== senhaConfirm) {
      return res.status(400).json({ erro: 'Senhas não conferem' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const usuarioExistente = await Usuario.buscarPorEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ erro: 'Email já cadastrado' });
    }

    const usuarioId = await Usuario.criar({
      nome,
      email,
      senha,
      role: role || 'leitura'
    });

    const token = gerarToken(usuarioId);
    const usuario = await Usuario.buscarPorId(usuarioId);

    res.status(201).json({
      mensagem: 'Usuário criado com sucesso',
      token,
      usuario
    });
  } catch (erro) {
    console.error('Erro ao registrar:', erro);
    res.status(500).json({ erro: 'Erro ao registrar usuário' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha obrigatórios' });
    }

    const usuario = await Usuario.buscarPorEmail(email);

    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    if (usuario.status !== 'ativo') {
      return res.status(403).json({ erro: 'Usuário não ativo' });
    }

    const senhaValida = await Usuario.verificarSenha(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const token = gerarToken(usuario.id);

    res.json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        regionalId: usuario.regionalId
      }
    });
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
};

// GET /api/auth/me
exports.perfil = async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.usuarioId);

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (erro) {
    console.error('Erro ao buscar perfil:', erro);
    res.status(500).json({ erro: 'Erro ao buscar perfil' });
  }
};
