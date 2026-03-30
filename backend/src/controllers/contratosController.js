const crypto = require('crypto');
const ContratoEmpresa = require('../models/ContratoEmpresa');

const texto = (value) => String(value || '').trim();

const normalizarFilial = (value) => texto(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .toUpperCase();

const normalizarComparacao = (value) => texto(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const normalizarSegmentoPublico = (value) => {
  const bruto = texto(value);
  if (!bruto) return bruto;
  const comparacao = normalizarComparacao(bruto).replace(/\?/g, 'u');
  if (comparacao === 'publico' || comparacao === 'poder publico') {
    return 'Publico';
  }
  return bruto;
};

const parseValor = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let raw = texto(value).replace(/R\$/gi, '').replace(/\s+/g, '');
  if (!raw) return 0;

  if (raw.includes(',') && raw.includes('.')) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  } else if (raw.includes(',')) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  }

  const numero = Number(raw);
  return Number.isFinite(numero) ? numero : 0;
};

const parseData = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = value * 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + ms);
  }

  const raw = texto(value);
  if (!raw) return null;

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const dia = Number(br[1]);
    const mes = Number(br[2]) - 1;
    const ano = Number(br[3]) < 100 ? 2000 + Number(br[3]) : Number(br[3]);
    const data = new Date(ano, mes, dia);
    if (!Number.isNaN(data.getTime())) return data;
  }

  const dataIso = new Date(raw);
  return Number.isNaN(dataIso.getTime()) ? null : dataIso;
};

const dataParaIso = (value) => {
  const data = parseData(value);
  if (!data) return null;
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isPeriodoValido = (periodo) => /^\d{2}\/\d{2}$/.test(texto(periodo));
const parseLista = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => texto(v)).filter(Boolean);
  }
  if (!texto(value)) return [];
  return texto(value).split(',').map((v) => texto(v)).filter(Boolean);
};

const chaveNegocio = (row) => {
  const payload = [
    row.periodoReferencia,
    texto(row.contratoId),
    texto(row.clienteId),
    texto(row.tipoProduto),
    texto(row.descricaoServico),
    normalizarFilial(row.filial),
    texto(row.cidade),
    texto(row.uf)
  ].join('|');

  return crypto.createHash('sha1').update(payload).digest('hex');
};

const normalizarRegistro = (row, periodoReferencia, origemArquivo) => ({
  periodoReferencia: texto(periodoReferencia),
  empresa: texto(row.empresa),
  filial: normalizarFilial(row.filial),
  contratoId: texto(row.contratoId),
  clienteId: texto(row.clienteId),
  tipoAssinante: normalizarSegmentoPublico(row.tipoAssinante),
  tipoCliente: texto(row.tipoCliente),
  origem: texto(row.origem),
  status: texto(row.status),
  statusAcesso: texto(row.statusAcesso),
  base: texto(row.base),
  descricaoServico: texto(row.descricaoServico),
  tipoProduto: normalizarSegmentoPublico(row.tipoProduto),
  tipoContrato: texto(row.tipoContrato),
  tipoCobranca: texto(row.tipoCobranca),
  carteiraCobranca: texto(row.carteiraCobranca),
  vendedor: texto(row.vendedor),
  valor: parseValor(row.valor),
  cidade: texto(row.cidade),
  uf: texto(row.uf).toUpperCase(),
  dtCriacaoContrato: dataParaIso(row.dtCriacaoContrato),
  dtAtivacao: dataParaIso(row.dtAtivacao),
  dtCancelamento: dataParaIso(row.dtCancelamento),
  origemArquivo: texto(origemArquivo) || 'importacao_contratos.xlsx'
});

// POST /api/contratos/importar
exports.importarLote = async (req, res) => {
  try {
    const {
      registros,
      periodoReferencia,
      origemArquivo,
      limparPeriodo = false
    } = req.body || {};

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ erro: 'Nenhum registro informado para importar.' });
    }

    if (!isPeriodoValido(periodoReferencia)) {
      return res.status(400).json({ erro: 'Periodo de referencia invalido. Use MM/YY.' });
    }

    let sucesso = 0;
    let falhas = 0;
    const erros = [];
    let removidosPeriodo = 0;

    if (limparPeriodo === true) {
      const resultadoLimpeza = await ContratoEmpresa.limparPeriodo(periodoReferencia);
      removidosPeriodo = Number(resultadoLimpeza?.changes || 0);
    }

    for (let i = 0; i < registros.length; i += 1) {
      const linha = i + 2;
      try {
        const dados = normalizarRegistro(registros[i] || {}, periodoReferencia, origemArquivo);
        if (!dados.filial || !dados.tipoAssinante) {
          falhas += 1;
          erros.push(`Linha ${linha}: filial ou tipo de assinante nao informado.`);
          continue;
        }
        dados.chaveNegocio = chaveNegocio(dados);
        await ContratoEmpresa.upsert(dados);
        sucesso += 1;
      } catch (error) {
        falhas += 1;
        erros.push(`Linha ${linha}: ${error.message}`);
      }
    }

    return res.json({
      mensagem: `Importacao concluida: ${sucesso} registro(s) processado(s), ${falhas} falha(s).`,
      sucesso,
      falhas,
      removidosPeriodo,
      erros: erros.slice(0, 100)
    });
  } catch (erro) {
    console.error('Erro ao importar contratos:', erro);
    return res.status(500).json({ erro: 'Erro interno ao importar contratos' });
  }
};

// GET /api/contratos
exports.listar = async (req, res) => {
  try {
    const segmentos = parseLista(req.query.segmentos);
    const naturezasReceita = parseLista(req.query.naturezasReceita);
    const registros = await ContratoEmpresa.listar({
      periodo: req.query.periodo,
      filial: req.query.filial,
      status: req.query.status,
      statusAcesso: req.query.statusAcesso,
      base: req.query.base,
      segmento: req.query.segmento,
      segmentos,
      area: req.query.area,
      naturezaReceita: req.query.naturezaReceita,
      naturezasReceita
    });
    return res.json({ registros });
  } catch (erro) {
    console.error('Erro ao listar contratos:', erro);
    return res.status(500).json({ erro: 'Erro ao listar contratos' });
  }
};

// GET /api/contratos/periodos
exports.listarPeriodos = async (req, res) => {
  try {
    const periodos = await ContratoEmpresa.listarPeriodos();
    return res.json({ periodos: periodos.map((p) => p.periodo).filter(Boolean) });
  } catch (erro) {
    console.error('Erro ao listar periodos de contratos:', erro);
    return res.status(500).json({ erro: 'Erro ao listar periodos de contratos' });
  }
};

// GET /api/contratos/filtros
exports.listarFiltros = async (req, res) => {
  try {
    const filtros = await ContratoEmpresa.listarOpcoesFiltro();
    return res.json(filtros);
  } catch (erro) {
    console.error('Erro ao listar filtros de contratos:', erro);
    return res.status(500).json({ erro: 'Erro ao listar filtros de contratos' });
  }
};

// GET /api/contratos/analytics
exports.analytics = async (req, res) => {
  try {
    const segmentos = parseLista(req.query.segmentos);
    const naturezasReceita = parseLista(req.query.naturezasReceita);
    const analytics = await ContratoEmpresa.analytics({
      periodo: req.query.periodo,
      filial: req.query.filial,
      status: req.query.status,
      statusAcesso: req.query.statusAcesso,
      base: req.query.base,
      segmento: req.query.segmento,
      segmentos,
      area: req.query.area,
      naturezaReceita: req.query.naturezaReceita,
      naturezasReceita
    });
    return res.json(analytics);
  } catch (erro) {
    console.error('Erro ao gerar analytics de contratos:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar analytics de contratos' });
  }
};
