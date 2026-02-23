const VendasMensais = require('../models/VendasMensais');

const normalizarNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }

  const numero = Number(valor);
  return Number.isNaN(numero) ? 0 : numero;
};

const montarDados = (body) => ({
  periodo: body.periodo,
  vendedorId: body.vendedorId,
  regionalId: body.regionalId,
  vendasVolume: normalizarNumero(body.vendasVolume),
  vendasFinanceiro: normalizarNumero(body.vendasFinanceiro),
  mudancaTitularidadeVolume: normalizarNumero(body.mudancaTitularidadeVolume),
  mudancaTitularidadeFinanceiro: normalizarNumero(body.mudancaTitularidadeFinanceiro),
  migracaoTecnologiaVolume: normalizarNumero(body.migracaoTecnologiaVolume),
  migracaoTecnologiaFinanceiro: normalizarNumero(body.migracaoTecnologiaFinanceiro),
  renovacaoVolume: normalizarNumero(body.renovacaoVolume),
  renovacaoFinanceiro: normalizarNumero(body.renovacaoFinanceiro),
  planoEventoVolume: normalizarNumero(body.planoEventoVolume),
  planoEventoFinanceiro: normalizarNumero(body.planoEventoFinanceiro),
  svaVolume: normalizarNumero(body.svaVolume),
  svaFinanceiro: normalizarNumero(body.svaFinanceiro),
  telefoniaVolume: normalizarNumero(body.telefoniaVolume),
  telefoniaFinanceiro: normalizarNumero(body.telefoniaFinanceiro)
});

// GET /api/vendas-mensais
exports.listar = async (req, res) => {
  try {
    const { periodo } = req.query;

    if (periodo) {
      const vendas = await VendasMensais.listarPorPeriodo(periodo);
      return res.json({ vendas });
    }

    const vendas = await VendasMensais.listar();
    res.json({ vendas });
  } catch (erro) {
    console.error('Erro ao listar vendas mensais:', erro);
    res.status(500).json({ erro: 'Erro ao listar vendas mensais' });
  }
};

// GET /api/vendas-mensais/:id
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const venda = await VendasMensais.buscarPorId(id);

    if (!venda) {
      return res.status(404).json({ erro: 'Registro de vendas não encontrado' });
    }

    res.json(venda);
  } catch (erro) {
    console.error('Erro ao buscar vendas mensais:', erro);
    res.status(500).json({ erro: 'Erro ao buscar vendas mensais' });
  }
};

// GET /api/vendas-mensais/regional/:regionalId
exports.porRegional = async (req, res) => {
  try {
    const { regionalId } = req.params;
    const { periodo } = req.query;
    const vendas = await VendasMensais.listarPorRegional(regionalId, periodo);

    res.json({ vendas });
  } catch (erro) {
    console.error('Erro ao listar vendas mensais por regional:', erro);
    res.status(500).json({ erro: 'Erro ao listar vendas mensais' });
  }
};

// GET /api/vendas-mensais/vendedor/:vendedorId
exports.porVendedor = async (req, res) => {
  try {
    const { vendedorId } = req.params;
    const { periodo } = req.query;
    const vendas = await VendasMensais.listarPorVendedor(vendedorId, periodo);

    res.json({ vendas });
  } catch (erro) {
    console.error('Erro ao listar vendas mensais por vendedor:', erro);
    res.status(500).json({ erro: 'Erro ao listar vendas mensais' });
  }
};

// POST /api/vendas-mensais
exports.criar = async (req, res) => {
  try {
    const { periodo, vendedorId, regionalId } = req.body;

    if (!periodo || !vendedorId || !regionalId) {
      return res.status(400).json({ erro: 'Periodo, vendedorId e regionalId são obrigatórios' });
    }

    const dados = montarDados(req.body);
    const id = await VendasMensais.criar(dados);

    res.status(201).json({ mensagem: 'Vendas mensais registradas com sucesso', id });
  } catch (erro) {
    console.error('Erro ao criar vendas mensais:', erro);
    res.status(500).json({ erro: 'Erro ao registrar vendas mensais' });
  }
};

// PUT /api/vendas-mensais/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { periodo, vendedorId, regionalId } = req.body;

    if (!periodo || !vendedorId || !regionalId) {
      return res.status(400).json({ erro: 'Periodo, vendedorId e regionalId são obrigatórios' });
    }

    const dados = montarDados(req.body);
    const alteracoes = await VendasMensais.atualizar(id, dados);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Registro de vendas não encontrado' });
    }

    res.json({ mensagem: 'Vendas mensais atualizadas com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar vendas mensais:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar vendas mensais' });
  }
};

// DELETE /api/vendas-mensais/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const alteracoes = await VendasMensais.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Registro de vendas não encontrado' });
    }

    res.json({ mensagem: 'Vendas mensais deletadas com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar vendas mensais:', erro);
    res.status(500).json({ erro: 'Erro ao deletar vendas mensais' });
  }
};
