// ===================================================================
// CONTROLADOR DE AUTENTICAÇÃO
// ===================================================================
// Funções para registro e login de usuários

const Usuario = require('../models/Usuario');

// POST /auth/register - Registra um novo usuário
exports.registrar = async (req, res) => {
  try {
    const { nome, email, senha, senhaConfirm } = req.body;

    // Validações básicas
    if (!nome || !email || !senha || !senhaConfirm) {
      return res.status(400).json({ 
        erro: 'Nome, email e senha são obrigatórios' 
      });
    }

    if (senha !== senhaConfirm) {
      return res.status(400).json({ 
        erro: 'Senhas não conferem' 
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({ 
        erro: 'Senha deve ter no mínimo 6 caracteres' 
      });
    }

    // Valida email duplicado
    const usuarioExistente = await Usuario.buscarPorEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ 
        erro: 'Email já registrado' 
      });
    }

    // Cria o novo usuário
    const totalUsuarios = await Usuario.contarUsuarios();

    let usuarioId;
    let status = 'pendente';
    let perfil = 'leitura';
    let mensagem = 'Usuário registrado com sucesso. Aguardando aprovação do administrador';

    if (totalUsuarios === 0) {
      status = 'aprovado';
      perfil = 'admin';
      mensagem = 'Usuário registrado e aprovado como administrador inicial';
      usuarioId = await Usuario.criarComStatusPerfil(nome, email, senha, status, perfil);
    } else {
      usuarioId = await Usuario.criar(nome, email, senha);
    }

    return res.status(201).json({
      mensagem,
      usuarioId,
      status,
      perfil
    });
  } catch (erro) {
    console.error('Erro ao registrar:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao registrar usuário' 
    });
  }
};

// POST /auth/login - Faz login do usuário
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validações
    if (!email || !senha) {
      return res.status(400).json({ 
        erro: 'Email e senha são obrigatórios' 
      });
    }

    // Busca o usuário
    const usuario = await Usuario.buscarPorEmail(email);

    if (!usuario) {
      return res.status(401).json({ 
        erro: 'Email ou senha incorretos' 
      });
    }

    // Verifica status
    if (usuario.status !== 'aprovado') {
      const mensagem = usuario.status === 'pendente'
        ? 'Aguardando aprovação do administrador'
        : 'Usuário desativado';

      return res.status(403).json({
        erro: mensagem
      });
    }

    // Verifica a senha
    const senhaValida = await Usuario.verificarSenha(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ 
        erro: 'Email ou senha incorretos' 
      });
    }

    // Gera o token JWT
    const token = Usuario.gerarToken(usuario.id, usuario.email, usuario.nome);

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status
      }
    });
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao fazer login' 
    });
  }
};

// GET /auth/me - Retorna dados do usuário logado
exports.obterUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.usuarioId);

    if (!usuario) {
      return res.status(404).json({ 
        erro: 'Usuário não encontrado' 
      });
    }

    return res.status(200).json({
      usuario
    });
  } catch (erro) {
    console.error('Erro ao obter usuário:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao obter dados do usuário' 
    });
  }
};
