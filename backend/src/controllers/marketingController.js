const MarketingOrcadoReal = require('../models/MarketingOrcadoReal');

const normalizarTexto = (v) => String(v || '').trim();
const normalizarUpper = (v) => normalizarTexto(v).toUpperCase();
const toArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => normalizarTexto(x)).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const filtrarLancamentos = (lancamentos, filtros = {}) => {
  const regionais = new Set(toArray(filtros.regionais));
  const categorias = new Set(toArray(filtros.categorias));
  const tiposLancamento = new Set(toArray(filtros.tiposLancamento).map((x) => normalizarUpper(x)));
  const status = new Set(toArray(filtros.status).map((x) => normalizarUpper(x)));

  return (lancamentos || []).filter((item) => {
    if (regionais.size && !regionais.has(normalizarTexto(item.regional))) return false;
    if (categorias.size && !categorias.has(normalizarTexto(item.tipo_custo))) return false;
    if (tiposLancamento.size && !tiposLancamento.has(normalizarUpper(item.tipo_lancamento))) return false;
    if (status.size && !status.has(normalizarUpper(item.status))) return false;
    return true;
  });
};

const sumBy = (arr, fn) => arr.reduce((acc, item) => acc + Number(fn(item) || 0), 0);

const onlyRealizadoValido = (item) => {
  const tipo = normalizarUpper(item.tipo_lancamento);
  const status = normalizarUpper(item.status);
  return tipo === 'REALIZADO' && status !== 'NEGADO';
};

const onlyProjetadoValido = (item) => {
  const tipo = normalizarUpper(item.tipo_lancamento);
  const status = normalizarUpper(item.status);
  return tipo === 'PROJETADO' && status !== 'NEGADO';
};

const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;

exports.importar = async (req, res) => {
  try {
    const {
      anoReferencia,
      origemArquivo,
      substituirAno = true,
      lancamentos = [],
      orcamentos = []
    } = req.body || {};

    const ano = Number(anoReferencia);
    if (!Number.isFinite(ano) || ano < 2000 || ano > 2100) {
      return res.status(400).json({ erro: 'Ano de referencia invalido para importacao' });
    }

    if (!Array.isArray(lancamentos) || !Array.isArray(orcamentos)) {
      return res.status(400).json({ erro: 'Formato de payload invalido. Informe lancamentos e orcamentos.' });
    }

    const result = await MarketingOrcadoReal.importar({
      anoReferencia: ano,
      origemArquivo: normalizarTexto(origemArquivo) || 'importacao_marketing.xlsx',
      substituirAno: Boolean(substituirAno),
      lancamentos,
      orcamentos
    });

    return res.json({
      mensagem: `Importacao concluida: ${result.totalLancamentos} lancamento(s) e ${result.totalOrcamentos} orcamento(s).`,
      ...result
    });
  } catch (erro) {
    console.error('Erro ao importar dados de marketing:', erro);
    return res.status(500).json({ erro: 'Erro ao importar dados de marketing' });
  }
};

exports.listarAnos = async (req, res) => {
  try {
    const rows = await MarketingOrcadoReal.listarAnos();
    return res.json({ anos: rows.map((r) => Number(r.ano)).filter((n) => Number.isFinite(n)) });
  } catch (erro) {
    console.error('Erro ao listar anos de marketing:', erro);
    return res.status(500).json({ erro: 'Erro ao listar anos' });
  }
};

exports.listarFiltros = async (req, res) => {
  try {
    const anoReferencia = Number(req.query.anoReferencia);
    const filtros = await MarketingOrcadoReal.listarFiltros({
      anoReferencia: Number.isFinite(anoReferencia) ? anoReferencia : undefined
    });
    return res.json(filtros);
  } catch (erro) {
    console.error('Erro ao listar filtros de marketing:', erro);
    return res.status(500).json({ erro: 'Erro ao listar filtros' });
  }
};

exports.listarLancamentos = async (req, res) => {
  try {
    const anoReferencia = Number(req.query.anoReferencia);
    if (!Number.isFinite(anoReferencia)) {
      return res.status(400).json({ erro: 'Informe anoReferencia para listar lancamentos' });
    }

    const rows = await MarketingOrcadoReal.listarLancamentos({
      anoReferencia,
      regionais: req.query.regionais,
      categorias: req.query.categorias,
      tiposLancamento: req.query.tiposLancamento,
      status: req.query.status,
      limite: req.query.limite
    });

    return res.json({ registros: rows });
  } catch (erro) {
    console.error('Erro ao listar lancamentos de marketing:', erro);
    return res.status(500).json({ erro: 'Erro ao listar lancamentos' });
  }
};

exports.analytics = async (req, res) => {
  try {
    const anoReferencia = Number(req.query.anoReferencia);
    if (!Number.isFinite(anoReferencia)) {
      return res.status(400).json({ erro: 'Informe anoReferencia para analytics' });
    }

    const mesCorteRaw = Number(req.query.mesCorte);
    const mesCorte = Number.isFinite(mesCorteRaw) && mesCorteRaw >= 1 && mesCorteRaw <= 12
      ? mesCorteRaw
      : new Date().getMonth() + 1;

    const { lancamentos, orcamentos } = await MarketingOrcadoReal.listarDados({
      anoReferencia,
      regionais: req.query.regionais,
      categorias: req.query.categorias,
      tiposLancamento: req.query.tiposLancamento,
      status: req.query.status
    });

    const lancamentosFiltrados = filtrarLancamentos(lancamentos, {
      regionais: req.query.regionais,
      categorias: req.query.categorias,
      tiposLancamento: req.query.tiposLancamento,
      status: req.query.status
    });

    const real = lancamentosFiltrados.filter(onlyRealizadoValido);
    const projetado = lancamentosFiltrados.filter(onlyProjetadoValido);

    const totalOrcadoAnual = sumBy(orcamentos, (o) => o.valor_orcado);
    const totalReal = sumBy(real, (l) => l.valor);
    const totalProjetado = sumBy(projetado, (l) => l.valor);
    const totalComprometido = totalReal + totalProjetado;

    const realComMesAteCorte = sumBy(
      real.filter((r) => Number(r.mes_referencia) >= 1 && Number(r.mes_referencia) <= mesCorte),
      (r) => r.valor
    );
    const realSemMes = sumBy(real.filter((r) => !Number(r.mes_referencia)), (r) => r.valor);
    const tendenciaAnual = mesCorte > 0 ? ((realComMesAteCorte / mesCorte) * 12) + realSemMes : totalReal;

    const saldoOrcamento = totalOrcadoAnual - totalReal;
    const saldoTendencia = totalOrcadoAnual - tendenciaAnual;
    const saldoComprometido = totalOrcadoAnual - totalComprometido;

    const taxaExecucaoReal = totalOrcadoAnual ? (totalReal / totalOrcadoAnual) * 100 : 0;
    const taxaExecucaoComprometida = totalOrcadoAnual ? (totalComprometido / totalOrcadoAnual) * 100 : 0;
    const taxaEstouroTendencia = totalOrcadoAnual ? ((tendenciaAnual - totalOrcadoAnual) / totalOrcadoAnual) * 100 : 0;

    const mensalMap = new Map();
    for (let mes = 1; mes <= 12; mes += 1) {
      mensalMap.set(mes, {
        mes,
        mesLabel: MESES[mes - 1],
        orcado: 0,
        real: 0,
        projetado: 0
      });
    }
    orcamentos.forEach((o) => {
      const m = Number(o.mes_referencia);
      if (mensalMap.has(m)) mensalMap.get(m).orcado += Number(o.valor_orcado || 0);
    });
    real.forEach((l) => {
      const m = Number(l.mes_referencia);
      if (mensalMap.has(m)) mensalMap.get(m).real += Number(l.valor || 0);
    });
    projetado.forEach((l) => {
      const m = Number(l.mes_referencia);
      if (mensalMap.has(m)) mensalMap.get(m).projetado += Number(l.valor || 0);
    });
    const mensal = Array.from(mensalMap.values()).map((m) => ({
      ...m,
      gapReal: round2(m.orcado - m.real),
      gapComprometido: round2(m.orcado - (m.real + m.projetado))
    }));

    const categorias = new Map();
    orcamentos.forEach((o) => {
      const c = normalizarTexto(o.categoria) || 'Sem categoria';
      if (!categorias.has(c)) categorias.set(c, { categoria: c, orcado: 0, real: 0, projetado: 0 });
      categorias.get(c).orcado += Number(o.valor_orcado || 0);
    });
    real.forEach((l) => {
      const c = normalizarTexto(l.tipo_custo) || 'Sem categoria';
      if (!categorias.has(c)) categorias.set(c, { categoria: c, orcado: 0, real: 0, projetado: 0 });
      categorias.get(c).real += Number(l.valor || 0);
    });
    projetado.forEach((l) => {
      const c = normalizarTexto(l.tipo_custo) || 'Sem categoria';
      if (!categorias.has(c)) categorias.set(c, { categoria: c, orcado: 0, real: 0, projetado: 0 });
      categorias.get(c).projetado += Number(l.valor || 0);
    });

    const categoriasDetalhe = Array.from(categorias.values())
      .map((c) => ({
        ...c,
        comprometido: c.real + c.projetado,
        saldoReal: c.orcado - c.real,
        saldoComprometido: c.orcado - (c.real + c.projetado),
        execucaoReal: c.orcado ? (c.real / c.orcado) * 100 : 0,
        execucaoComprometida: c.orcado ? ((c.real + c.projetado) / c.orcado) * 100 : 0
      }))
      .sort((a, b) => b.comprometido - a.comprometido);

    const regionalMap = new Map();
    [...real, ...projetado].forEach((l) => {
      const regional = normalizarTexto(l.regional) || 'Sem regional';
      if (!regionalMap.has(regional)) regionalMap.set(regional, { regional, real: 0, projetado: 0, total: 0 });
      const target = regionalMap.get(regional);
      if (onlyRealizadoValido(l)) target.real += Number(l.valor || 0);
      if (onlyProjetadoValido(l)) target.projetado += Number(l.valor || 0);
      target.total = target.real + target.projetado;
    });
    const regionais = Array.from(regionalMap.values()).sort((a, b) => b.total - a.total);

    const statusMap = new Map();
    lancamentosFiltrados.forEach((l) => {
      const s = normalizarTexto(l.status) || 'Sem status';
      if (!statusMap.has(s)) statusMap.set(s, { status: s, quantidade: 0, valor: 0 });
      const item = statusMap.get(s);
      item.quantidade += 1;
      item.valor += Number(l.valor || 0);
    });
    const statusDetalhe = Array.from(statusMap.values()).sort((a, b) => b.valor - a.valor);

    const topProjetos = [...lancamentosFiltrados]
      .map((l) => ({
        projeto: normalizarTexto(l.projeto) || 'Sem projeto',
        patrocinador: normalizarTexto(l.patrocinador) || 'Sem patrocinador',
        regional: normalizarTexto(l.regional) || 'Sem regional',
        tipoLancamento: normalizarTexto(l.tipo_lancamento) || 'Sem tipo',
        valor: Number(l.valor || 0),
        status: normalizarTexto(l.status) || 'Sem status'
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 15);

    const oportunidades = [];
    const acimaOrcamento = categoriasDetalhe.filter((c) => c.saldoComprometido < 0);
    if (acimaOrcamento.length) {
      oportunidades.push(
        `${acimaOrcamento.length} categoria(s) com estouro potencial: ${acimaOrcamento.slice(0, 3).map((c) => c.categoria).join(', ')}.`
      );
    }
    const baixaExecucao = categoriasDetalhe.filter((c) => c.orcado > 0 && c.execucaoReal < 30);
    if (baixaExecucao.length) {
      oportunidades.push(
        `${baixaExecucao.length} categoria(s) com baixa execucao real (<30%): ${baixaExecucao.slice(0, 3).map((c) => c.categoria).join(', ')}.`
      );
    }
    if (taxaEstouroTendencia > 0) {
      oportunidades.push(`Tendencia anual aponta estouro de ${taxaEstouroTendencia.toFixed(2)}% sobre o orcado.`);
    } else {
      oportunidades.push(`Tendencia anual ainda dentro do orcamento, com folga de R$ ${Math.abs(saldoTendencia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    }

    return res.json({
      kpis: {
        anoReferencia,
        mesCorte,
        totalOrcadoAnual: round2(totalOrcadoAnual),
        totalReal: round2(totalReal),
        totalProjetado: round2(totalProjetado),
        totalComprometido: round2(totalComprometido),
        tendenciaAnual: round2(tendenciaAnual),
        saldoOrcamento: round2(saldoOrcamento),
        saldoTendencia: round2(saldoTendencia),
        saldoComprometido: round2(saldoComprometido),
        taxaExecucaoReal: round2(taxaExecucaoReal),
        taxaExecucaoComprometida: round2(taxaExecucaoComprometida),
        taxaEstouroTendencia: round2(taxaEstouroTendencia),
        totalLancamentos: lancamentosFiltrados.length
      },
      graficos: {
        mensal,
        categorias: categoriasDetalhe,
        regionais,
        status: statusDetalhe,
        topProjetos
      },
      oportunidades
    });
  } catch (erro) {
    console.error('Erro ao gerar analytics de marketing:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar analytics de marketing' });
  }
};
