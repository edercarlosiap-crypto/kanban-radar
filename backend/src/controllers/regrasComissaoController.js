const RegrasComissao = require('../models/RegrasComissao');
const ComissaoLiderancaRegra = require('../models/ComissaoLiderancaRegra');

const PERIODO_REGEX = /^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\/\d{2}$/i;

const normalizarPeriodo = (valor) => {
  const periodo = String(valor || '').trim();
  if (!periodo) return '';
  const partes = periodo.split('/');
  if (partes.length !== 2) return periodo;
  const mes = partes[0];
  const ano = partes[1];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1).toLowerCase()}/${ano}`;
};

// GET /api/regras-comissao
exports.listar = async (req, res) => {
  try {
    const regras = await RegrasComissao.listar();
    res.json({ regras });
  } catch (erro) {
    console.error('Erro ao listar regras:', erro);
    res.status(500).json({ erro: 'Erro ao listar regras' });
  }
};

// GET /api/regras-comissao/:id
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const regra = await RegrasComissao.buscarPorId(id);

    if (!regra) {
      return res.status(404).json({ erro: 'Regra nao encontrada' });
    }

    res.json(regra);
  } catch (erro) {
    console.error('Erro ao buscar regra:', erro);
    res.status(500).json({ erro: 'Erro ao buscar regra' });
  }
};

// GET /api/regras-comissao/regional/:regionalId
exports.porRegional = async (req, res) => {
  try {
    const { regionalId } = req.params;
    const regras = await RegrasComissao.buscarPorRegional(regionalId);

    res.json({ regras });
  } catch (erro) {
    console.error('Erro ao buscar regras por regional:', erro);
    res.status(500).json({ erro: 'Erro ao buscar regras' });
  }
};

// POST /api/regras-comissao
exports.criar = async (req, res) => {
  try {
    const dados = req.body;

    if (!dados.regionalId || !dados.tipoMeta || !dados.periodo) {
      return res.status(400).json({ erro: 'Campos obrigatorios nao fornecidos' });
    }

    // Normalizar campos
    dados.tipoMeta = String(dados.tipoMeta).toLowerCase().trim();
    dados.periodo = normalizarPeriodo(dados.periodo);

    if (!PERIODO_REGEX.test(dados.periodo)) {
      return res.status(400).json({ erro: 'Periodo invalido. Use formato Mes/AA (ex: Mar/26)' });
    }

    const id = await RegrasComissao.criar(dados);

    res.status(201).json({
      mensagem: 'Regra de comissao criada com sucesso',
      id
    });
  } catch (erro) {
    console.error('Erro ao criar regra:', erro);
    res.status(500).json({ erro: 'Erro ao criar regra' });
  }
};

// PUT /api/regras-comissao/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    // Normalizar campos
    if (dados.tipoMeta) {
      dados.tipoMeta = String(dados.tipoMeta).toLowerCase().trim();
    }

    if (!dados.periodo) {
      return res.status(400).json({ erro: 'Periodo e obrigatorio' });
    }

    dados.periodo = normalizarPeriodo(dados.periodo);
    if (!PERIODO_REGEX.test(dados.periodo)) {
      return res.status(400).json({ erro: 'Periodo invalido. Use formato Mes/AA (ex: Mar/26)' });
    }

    const alteracoes = await RegrasComissao.atualizar(id, dados);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Regra nao encontrada' });
    }

    res.json({ mensagem: 'Regra atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar regra:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar regra' });
  }
};

// DELETE /api/regras-comissao/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const alteracoes = await RegrasComissao.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Regra nao encontrada' });
    }

    res.json({ mensagem: 'Regra deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar regra:', erro);
    res.status(500).json({ erro: 'Erro ao deletar regra' });
  }
};

// GET /api/regras-comissao/lideranca?periodo=Jan/26
exports.obterRegraLideranca = async (req, res) => {
  try {
    const periodo = String(req.query.periodo || '').trim();
    if (!periodo) {
      return res.status(400).json({ erro: 'Periodo e obrigatorio' });
    }

    const regra = await ComissaoLiderancaRegra.obterPorPeriodo(periodo);
    return res.json({ regra });
  } catch (erro) {
    console.error('Erro ao obter regra de lideranca:', erro);
    return res.status(500).json({ erro: 'Erro ao obter regra de lideranca' });
  }
};

// PUT /api/regras-comissao/lideranca
exports.salvarRegraLideranca = async (req, res) => {
  try {
    const periodo = String(req.body?.periodo || '').trim();
    const gerenteRegionalMultiplier = Number(req.body?.gerenteRegionalMultiplier);
    const supervisorRegionalMultiplier = Number(req.body?.supervisorRegionalMultiplier);
    const gerenteMatrizMultiplier = Number(req.body?.gerenteMatrizMultiplier);

    if (!periodo) {
      return res.status(400).json({ erro: 'Periodo e obrigatorio' });
    }

    if ([gerenteRegionalMultiplier, supervisorRegionalMultiplier, gerenteMatrizMultiplier].some(Number.isNaN)) {
      return res.status(400).json({ erro: 'Multiplicadores invalidos' });
    }

    if ([gerenteRegionalMultiplier, supervisorRegionalMultiplier, gerenteMatrizMultiplier].some((v) => v < 0)) {
      return res.status(400).json({ erro: 'Multiplicadores nao podem ser negativos' });
    }

    const id = await ComissaoLiderancaRegra.salvarPorPeriodo({
      periodo,
      gerenteRegionalMultiplier,
      supervisorRegionalMultiplier,
      gerenteMatrizMultiplier
    });

    return res.json({ mensagem: 'Parametros de lideranca salvos com sucesso', id });
  } catch (erro) {
    console.error('Erro ao salvar regra de lideranca:', erro);
    return res.status(500).json({ erro: 'Erro ao salvar regra de lideranca' });
  }
};
