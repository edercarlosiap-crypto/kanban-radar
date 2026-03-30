const crypto = require('crypto');
const XLSX = require('xlsx');
const RetencaoAtendimento = require('../models/RetencaoAtendimento');

const normalizarTexto = (value) => String(value || '').trim();

const normalizarFilial = (value) => normalizarTexto(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .toUpperCase();

const parseData = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = value * 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + ms);
  }

  const raw = normalizarTexto(value);
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const dia = Number(match[1]);
    const mes = Number(match[2]) - 1;
    const ano = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    const d = new Date(ano, mes, dia);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
};

const dataParaIso = (data) => {
  if (!data) return null;
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const dataParaPeriodo = (data) => {
  if (!data) return null;
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const yy = String(data.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};

const parseBool = (value) => {
  const v = normalizarTexto(value).toLowerCase();
  return ['sim', 's', 'yes', 'y', 'true', '1'].includes(v);
};

const normalizarUrlDownloadPlanilha = (urlRaw) => {
  const raw = String(urlRaw || '').trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = (url.hostname || '').toLowerCase();
  const path = url.pathname || '';

  // Google Drive (arquivo)
  const driveMatch = path.match(/\/file\/d\/([^/]+)/i);
  if (host.includes('drive.google.com') && driveMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  // Google Sheets -> export xlsx
  const sheetMatch = path.match(/\/spreadsheets\/d\/([^/]+)/i);
  if ((host.includes('docs.google.com') || host.includes('drive.google.com')) && sheetMatch?.[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=xlsx`;
  }

  // OneDrive / SharePoint - tentativa de forçar download
  if (host.includes('1drv.ms') || host.includes('onedrive.live.com') || host.includes('sharepoint.com')) {
    url.searchParams.set('download', '1');
    return url.toString();
  }

  return raw;
};

const assinatura = (dados) => crypto
  .createHash('sha1')
  .update([
    dados.tipoRegistro,
    dados.dataAtendimento,
    normalizarFilial(dados.filial),
    normalizarTexto(dados.clienteId),
    normalizarTexto(dados.contratoId),
    normalizarTexto(dados.atendente),
    normalizarTexto(dados.motivo),
    normalizarTexto(dados.subMotivo),
    normalizarTexto(dados.resultadoTratativa)
  ].join('|'))
  .digest('hex');

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const TIPO_BASE = {
  CRM_MATRIZ: 'crm_matriz',
  EMPRESA_GERAL: 'empresa_geral',
  GERAL: 'geral'
};

const PREFIXO_TIPO_BASE = {
  [TIPO_BASE.CRM_MATRIZ]: '[CRM_MATRIZ]',
  [TIPO_BASE.EMPRESA_GERAL]: '[BASE_EMPRESA]'
};

const normalizarTipoBase = (tipo) => {
  const t = normalize(tipo);
  if (t === TIPO_BASE.CRM_MATRIZ) return TIPO_BASE.CRM_MATRIZ;
  if (t === TIPO_BASE.EMPRESA_GERAL) return TIPO_BASE.EMPRESA_GERAL;
  return TIPO_BASE.GERAL;
};

const detectarTipoBasePorOrigem = (origemArquivo) => {
  const nome = normalizarTexto(origemArquivo);
  const nomeNormalizado = normalize(nome);
  if (!nomeNormalizado) return TIPO_BASE.GERAL;

  if (nomeNormalizado.includes(normalize(PREFIXO_TIPO_BASE[TIPO_BASE.CRM_MATRIZ]))) {
    return TIPO_BASE.CRM_MATRIZ;
  }
  if (nomeNormalizado.includes(normalize(PREFIXO_TIPO_BASE[TIPO_BASE.EMPRESA_GERAL]))) {
    return TIPO_BASE.EMPRESA_GERAL;
  }

  if (nomeNormalizado.startsWith('crm prototipo retencao uni')) {
    return TIPO_BASE.CRM_MATRIZ;
  }
  if (nomeNormalizado.includes('regional') || nomeNormalizado.includes('empresa')) {
    return TIPO_BASE.EMPRESA_GERAL;
  }
  return TIPO_BASE.GERAL;
};

const construirOrigemArquivo = (origemArquivo, tipoBase) => {
  const origem = normalizarTexto(origemArquivo) || 'importacao_frontend.xlsx';
  const tipo = normalizarTipoBase(tipoBase);
  const prefixo = PREFIXO_TIPO_BASE[tipo];
  if (!prefixo) return origem;
  if (normalize(origem).includes(normalize(prefixo))) return origem;
  return `${prefixo} ${origem}`;
};

const pickValue = (row, aliases) => {
  const entries = Object.entries(row || {});
  for (const [key, value] of entries) {
    const normalizedKey = normalize(key);
    if (aliases.some((alias) => normalizedKey === alias || normalizedKey.includes(alias))) {
      return value;
    }
  }
  return '';
};

const mapRows = (rows, tipoRegistro) => rows
  .map((row) => ({
    tipoRegistro,
    dataAtendimento: pickValue(row, ['data', 'coluna 1', 'coluna1']),
    atendente: pickValue(row, ['atendente']),
    clienteId: pickValue(row, ['id cliente', 'id']),
    nomeCompleto: pickValue(row, ['nome completo', 'nome']),
    filial: pickValue(row, ['filial', 'regional']),
    contratoId: pickValue(row, ['id contrato', 'contrato']),
    houveChamadoAnterior: pickValue(row, ['houve chamado anterior']),
    qtdChamados: pickValue(row, ['qtd chamados', 'quantidade chamados']),
    origemChamada: pickValue(row, ['origem', 'chamado tipo', 'tipo chamado']),
    motivo: pickValue(row, ['motivo']),
    subMotivo: pickValue(row, ['sub-motivo', 'sub motivo', 'submotivo']),
    clienteAceitouAcordo: pickValue(row, ['cliente aceitou acordo']),
    tipoAtendimento: pickValue(row, ['tipo de atendimento']),
    possuiMultaContratual: pickValue(row, ['multa contratual', 'possui multa']),
    possuiProporcionalMensalidade: pickValue(row, ['proporcional mensalidade']),
    equipamentos: pickValue(row, ['equipamentos']),
    resultadoTratativa: pickValue(row, ['resultado da tratativa', 'resultado']),
    historico: pickValue(row, ['historico', 'hist'])
  }))
  .filter((r) => String(r.nomeCompleto || '').trim() || String(r.filial || '').trim() || String(r.motivo || '').trim());

const detectarTipoRegistroExport = (row) => {
  const assunto = normalize(pickValue(row, ['assunto', 'motivo']));
  const diagnostico = normalize(pickValue(row, ['diagnostico', 'sub-motivo', 'sub motivo', 'submotivo']));
  const descricao = normalize(pickValue(row, ['descricao', 'historico', 'hist']));
  const combinado = `${assunto} ${diagnostico} ${descricao}`;

  if (combinado.includes('inadimpl') || combinado.includes('cobranc') || combinado.includes('financeir') || combinado.includes('negoci')) {
    return 'cobrancas_inadimplentes';
  }

  return 'cancelamentos_reversoes';
};

const mapRowsExport = (rows) => rows
  .map((row) => {
    const retidoRaw = String(pickValue(row, ['retido'])).trim();
    const retido = normalize(retidoRaw);
    const assunto = pickValue(row, ['assunto', 'motivo']);
    const descricao = pickValue(row, ['descricao', 'historico', 'hist']);
    const diagnostico = pickValue(row, ['diagnostico', 'sub-motivo', 'sub motivo', 'submotivo']);
    const tipoRegistro = detectarTipoRegistroExport(row);

    let resultadoTratativa = '';
    if (retido === 'sim') resultadoTratativa = 'Reversao';
    else if (normalize(assunto).includes('cancel')) resultadoTratativa = 'Cancelamento Efetivado';
    else if (tipoRegistro === 'cobrancas_inadimplentes' && normalize(`${descricao} ${diagnostico}`).includes('acordo')) resultadoTratativa = 'Acordo';
    else resultadoTratativa = String(assunto || '').trim();

    return {
      tipoRegistro,
      dataAtendimento: pickValue(row, ['dt conclusao', 'data conclusao', 'dt abertura', 'data abertura', 'data']),
      atendente: pickValue(row, ['responsavel', 'atendente', 'usuario criador']),
      clienteId: pickValue(row, ['id cliente', 'id']),
      nomeCompleto: pickValue(row, ['cliente', 'nome completo', 'nome']),
      filial: pickValue(row, ['filial', 'regional']),
      contratoId: pickValue(row, ['id contrato', 'contrato']),
      houveChamadoAnterior: '',
      qtdChamados: 0,
      origemChamada: pickValue(row, ['origem', 'chamado tipo', 'tipo chamado']),
      motivo: assunto,
      subMotivo: diagnostico,
      clienteAceitouAcordo: retidoRaw,
      tipoAtendimento: pickValue(row, ['tipo de atendimento', 'tipo']),
      possuiMultaContratual: '',
      possuiProporcionalMensalidade: '',
      equipamentos: pickValue(row, ['plano venda', 'equipamentos']),
      resultadoTratativa,
      historico: descricao
    };
  })
  .filter((r) => String(r.nomeCompleto || '').trim() || String(r.filial || '').trim() || String(r.motivo || '').trim());

const chunkArray = (arr = [], size = 500) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const limparVersoesAnterioresPorTipoBase = async (tipoBase) => {
  const tipo = normalizarTipoBase(tipoBase);
  if (![TIPO_BASE.CRM_MATRIZ, TIPO_BASE.EMPRESA_GERAL].includes(tipo)) {
    return { removidos: 0, origensRemovidas: [] };
  }

  const origens = await RetencaoAtendimento.listarOrigensArquivo();
  const candidatas = (origens || [])
    .map((item) => normalizarTexto(item?.origemArquivo))
    .filter(Boolean)
    .filter((origem) => detectarTipoBasePorOrigem(origem) === tipo);

  if (!candidatas.length) {
    return { removidos: 0, origensRemovidas: [] };
  }

  const removidos = await RetencaoAtendimento.removerPorOrigensArquivo(candidatas);
  return { removidos, origensRemovidas: candidatas };
};

const classificarDesfechoImportacao = (resultado = '') => {
  const r = normalize(resultado);
  if (!r) return 'sem_desfecho';
  if (r.includes('revers') || r.includes('titular')) return 'retido';
  if (r.includes('desist')) return 'cancelamento';
  if (r.includes('cancel')) return 'cancelamento';
  if (r.includes('acordo')) return 'acordo';
  if (r.includes('pagament') || r.includes('quit')) return 'pagamento';
  return 'ambiguo';
};

const montarResumoQualidade = (qualidade) => {
  const total = Number(qualidade?.totalValidos || 0);
  const percent = (v) => (total ? (Number(v || 0) / total) * 100 : 0);
  return {
    ...qualidade,
    reconhecimentoPercent: percent(qualidade?.desfechosReconhecidos),
    ambiguoPercent: percent(qualidade?.desfechosAmbiguos),
    coberturaHistoricoPercent: percent(total - Number(qualidade?.semHistorico || 0)),
    coberturaMotivoPercent: percent(total - Number(qualidade?.semMotivo || 0))
  };
};

const processarImportacao = async (registros, origemArquivo, opcoes = {}) => {
  const tipoBase = normalizarTipoBase(opcoes.tipoBase || detectarTipoBasePorOrigem(origemArquivo));
  const limparAnteriores = Boolean(opcoes.limparAnteriores);
  const bloquearAmbiguo = Boolean(opcoes.bloquearAmbiguo);
  const origemArquivoComTipo = construirOrigemArquivo(origemArquivo, tipoBase);

  let sucesso = 0;
  let duplicados = 0;
  let falhas = 0;
  const erros = [];
  const avisos = [];
  const processados = [];
  let removidosAnteriores = 0;
  let origensRemovidas = [];
  const qualidade = {
    totalValidos: 0,
    desfechosReconhecidos: 0,
    desfechosAmbiguos: 0,
    semHistorico: 0,
    semMotivo: 0
  };

  // Fase 1: normalizacao/validacao em memoria (sem I/O em banco)
  for (let i = 0; i < registros.length; i += 1) {
    const row = registros[i] || {};
    const linha = i + 2;
    try {
      const dataObj = parseData(row.dataAtendimento);
      const dataAtendimento = dataParaIso(dataObj);
      const periodo = normalizarTexto(row.periodo) || dataParaPeriodo(dataObj);

      const payload = {
        tipoRegistro: normalizarTexto(row.tipoRegistro) || 'cobrancas_inadimplentes',
        dataAtendimento,
        periodo,
        atendente: normalizarTexto(row.atendente),
        clienteId: normalizarTexto(row.clienteId),
        nomeCompleto: normalizarTexto(row.nomeCompleto),
        filial: normalizarFilial(row.filial),
        contratoId: normalizarTexto(row.contratoId),
        houveChamadoAnterior: parseBool(row.houveChamadoAnterior),
        qtdChamados: Number(row.qtdChamados || 0),
        origemChamada: normalizarTexto(row.origemChamada),
        motivo: normalizarTexto(row.motivo),
        subMotivo: normalizarTexto(row.subMotivo),
        clienteAceitouAcordo: parseBool(row.clienteAceitouAcordo),
        tipoAtendimento: normalizarTexto(row.tipoAtendimento),
        possuiMultaContratual: parseBool(row.possuiMultaContratual),
        possuiProporcionalMensalidade: parseBool(row.possuiProporcionalMensalidade),
        equipamentos: normalizarTexto(row.equipamentos),
        resultadoTratativa: normalizarTexto(row.resultadoTratativa),
        historico: normalizarTexto(row.historico),
        origemArquivo: origemArquivoComTipo
      };

      if (!payload.dataAtendimento || !payload.atendente || !payload.nomeCompleto || !payload.filial) {
        falhas += 1;
        erros.push(`Linha ${linha}: campos obrigatorios faltando (Data/Atendente/Nome/Filial).`);
        continue;
      }

      qualidade.totalValidos += 1;
      if (!payload.historico) qualidade.semHistorico += 1;
      if (!payload.motivo) qualidade.semMotivo += 1;

      const classeDesfecho = classificarDesfechoImportacao(payload.resultadoTratativa);
      const reconhecido = classeDesfecho !== 'ambiguo' && classeDesfecho !== 'sem_desfecho';
      if (reconhecido) qualidade.desfechosReconhecidos += 1;
      else qualidade.desfechosAmbiguos += 1;

      if (!reconhecido) {
        const aviso = classeDesfecho === 'sem_desfecho'
          ? `Linha ${linha}: desfecho ausente ("vazio").`
          : `Linha ${linha}: desfecho ambiguo ("${payload.resultadoTratativa || 'vazio'}").`;
        if (bloquearAmbiguo && classeDesfecho === 'ambiguo') {
          falhas += 1;
          erros.push(`${aviso} Corrija a tratativa para importar.`);
          continue;
        }
        if (avisos.length < 100) avisos.push(aviso);
      }

      payload.assinatura = assinatura(payload);
      processados.push({ linha, payload });
    } catch (error) {
      falhas += 1;
      erros.push(`Linha ${linha}: ${error.message}`);
    }
  }

  if (!processados.length) {
    return {
      sucesso,
      falhas,
      duplicados,
      erros,
      avisos,
      qualidade: montarResumoQualidade(qualidade),
      removidosAnteriores,
      origensRemovidas
    };
  }

  if (limparAnteriores) {
    // Mantem apenas a versao mais recente dentro do tipo de base (CRM Matriz ou Base Empresa).
    const limpeza = await limparVersoesAnterioresPorTipoBase(tipoBase);
    removidosAnteriores = limpeza.removidos;
    origensRemovidas = limpeza.origensRemovidas;
  }

  // Fase 2: reduz N+1 - dedup em memoria + consulta em lote no banco por assinatura
  const assinaturasUnicas = Array.from(new Set(processados.map((p) => p.payload.assinatura)));
  const existentes = new Set();
  for (const chunk of chunkArray(assinaturasUnicas, 500)) {
    const encontrados = await Promise.all(chunk.map((sig) => RetencaoAtendimento.buscarPorAssinatura(sig)));
    encontrados.forEach((r, idx) => {
      if (r?.id) existentes.add(chunk[idx]);
    });
  }

  const vistosNaCarga = new Set();

  // Fase 3: grava somente efetivamente novos
  for (const item of processados) {
    const { payload } = item;
    if (existentes.has(payload.assinatura) || vistosNaCarga.has(payload.assinatura)) {
      duplicados += 1;
      continue;
    }

    await RetencaoAtendimento.criar(payload);
    vistosNaCarga.add(payload.assinatura);
    sucesso += 1;
  }

  return {
    sucesso,
    falhas,
    duplicados,
    erros,
    avisos,
    qualidade: montarResumoQualidade(qualidade),
    removidosAnteriores,
    origensRemovidas,
    tipoBase,
    origemArquivo: origemArquivoComTipo
  };
};

// POST /api/retencao/importar
exports.importarLote = async (req, res) => {
  try {
    const { registros, origemArquivo, tipoBase, limparAnteriores, bloquearAmbiguo } = req.body;

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ erro: 'Nenhum registro informado para importar' });
    }

    const {
      sucesso,
      falhas,
      duplicados,
      erros,
      avisos,
      qualidade,
      removidosAnteriores,
      origensRemovidas,
      tipoBase: tipoBaseEfetivo,
      origemArquivo: origemEfetiva
    } = await processarImportacao(registros, origemArquivo, { tipoBase, limparAnteriores, bloquearAmbiguo });

    return res.json({
      mensagem: `Importacao concluida: ${sucesso} registro(s) OK, ${falhas} falha(s), ${duplicados} duplicado(s), ${removidosAnteriores} removido(s) de versoes anteriores.`,
      sucesso,
      falhas,
      duplicados,
      tipoBase: tipoBaseEfetivo,
      origemArquivo: origemEfetiva,
      removidosAnteriores,
      origensRemovidas,
      qualidade,
      avisos: avisos.slice(0, 100),
      erros: erros.slice(0, 100)
    });
  } catch (erro) {
    console.error('Erro ao importar lote de retencao:', erro);
    return res.status(500).json({ erro: 'Erro ao importar lote de retencao' });
  }
};

// POST /api/retencao/importar-url
exports.importarPorUrl = async (req, res) => {
  try {
    const { url } = req.body || {};
    const origemArquivo = normalizarTexto(req.body?.origemArquivo) || 'importacao_url.xlsx';
    const tipoBase = req.body?.tipoBase;
    const limparAnteriores = req.body?.limparAnteriores;
    const bloquearAmbiguo = req.body?.bloquearAmbiguo;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ erro: 'Informe uma URL valida da planilha.' });
    }

    const urlDownload = normalizarUrlDownloadPlanilha(url);
    if (!urlDownload) {
      return res.status(400).json({ erro: 'URL invalida.' });
    }

    const parsedUrl = new URL(urlDownload);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ erro: 'A URL deve usar http:// ou https://.' });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UNI-Importador/1.0)'
      }
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return res.status(400).json({
          erro: `Falha ao baixar planilha (${response.status}). Link protegido. Gere um link de download direto/publico (sem exigir login).`
        });
      }
      return res.status(400).json({ erro: `Falha ao baixar planilha (${response.status}).` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer', cellDates: true });
    const names = workbook.SheetNames || [];

    const sheetCobrancas = names.find((name) => {
      const n = normalize(name);
      return n.includes('cobranca') || n.includes('inadimpl');
    });
    const sheetCancel = names.find((name) => {
      const n = normalize(name);
      return n.includes('cancelamento') || n.includes('revers');
    });
    const sheetExport = names.find((name) => {
      const n = normalize(name);
      return n === 'export' || n.includes('export');
    });

    const rows = [];
    if (sheetCobrancas) {
      const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[sheetCobrancas], { defval: '' });
      rows.push(...mapRows(parsed, 'cobrancas_inadimplentes'));
    }
    if (sheetCancel) {
      const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[sheetCancel], { defval: '' });
      rows.push(...mapRows(parsed, 'cancelamentos_reversoes'));
    }
    if (!rows.length && sheetExport) {
      const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[sheetExport], { defval: '' });
      rows.push(...mapRowsExport(parsed));
    }
    if (!rows.length && names.length) {
      const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[names[0]], { defval: '' });
      const headers = Object.keys(parsed[0] || {}).map((h) => normalize(h));
      const pareceExport = headers.some((h) => h.includes('assunto'))
        && headers.some((h) => h.includes('responsavel'))
        && (headers.some((h) => h.includes('dt abertura')) || headers.some((h) => h.includes('dt conclusao')));
      if (pareceExport) rows.push(...mapRowsExport(parsed));
    }

    if (!rows.length) {
      return res.status(400).json({ erro: 'Nao foi possivel identificar abas de cobrancas/cancelamentos nem o formato Export na planilha online.' });
    }

    const {
      sucesso,
      falhas,
      duplicados,
      erros,
      avisos,
      qualidade,
      removidosAnteriores,
      origensRemovidas,
      tipoBase: tipoBaseEfetivo,
      origemArquivo: origemEfetiva
    } = await processarImportacao(rows, origemArquivo, { tipoBase, limparAnteriores, bloquearAmbiguo });

    return res.json({
      mensagem: `Importacao por URL concluida: ${sucesso} registro(s) OK, ${falhas} falha(s), ${duplicados} duplicado(s), ${removidosAnteriores} removido(s) de versoes anteriores.`,
      sucesso,
      falhas,
      duplicados,
      tipoBase: tipoBaseEfetivo,
      origemArquivo: origemEfetiva,
      removidosAnteriores,
      origensRemovidas,
      registrosPreparados: rows.length,
      qualidade,
      avisos: avisos.slice(0, 100),
      erros: erros.slice(0, 100)
    });
  } catch (erro) {
    console.error('Erro ao importar retencao por URL:', erro);
    return res.status(500).json({ erro: 'Erro ao importar planilha por URL' });
  }
};

// GET /api/retencao
exports.listar = async (req, res) => {
  try {
    const registros = await RetencaoAtendimento.listar({
      periodo: req.query.periodo,
      tipoRegistro: req.query.tipoRegistro,
      filial: req.query.filial,
      atendente: req.query.atendente,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      escopoTime: req.query.escopoTime
    });
    return res.json({ registros });
  } catch (erro) {
    console.error('Erro ao listar retencao:', erro);
    return res.status(500).json({ erro: 'Erro ao listar retencao' });
  }
};

// GET /api/retencao/periodos
exports.listarPeriodos = async (req, res) => {
  try {
    const periodos = await RetencaoAtendimento.listarPeriodos();
    return res.json({ periodos: periodos.map((p) => p.periodo).filter(Boolean) });
  } catch (erro) {
    console.error('Erro ao listar periodos de retencao:', erro);
    return res.status(500).json({ erro: 'Erro ao listar periodos' });
  }
};

const isRetido = (resultado) => {
  const r = normalizarTexto(resultado).toLowerCase();
  return r.includes('revers') || r.includes('titular');
};

const isCancelamento = (resultado) => {
  const r = normalizarTexto(resultado).toLowerCase();
  return r.includes('cancel') || r.includes('desist');
};

// GET /api/retencao/analytics
exports.analytics = async (req, res) => {
  try {
    const registros = await RetencaoAtendimento.listar({
      periodo: req.query.periodo,
      tipoRegistro: req.query.tipoRegistro,
      filial: req.query.filial,
      atendente: req.query.atendente,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      escopoTime: req.query.escopoTime
    });

    const totalTentativas = registros.length;
    const totalRetidos = registros.filter((r) => isRetido(r.resultado_tratativa)).length;
    const totalCancelamentos = registros.filter((r) => isCancelamento(r.resultado_tratativa)).length;
    const totalTitularidade = registros.filter((r) => normalizarTexto(r.resultado_tratativa).toLowerCase().includes('titular')).length;
    const totalAcordos = registros.filter((r) => Number(r.cliente_aceitou_acordo) === 1).length;
    const atendentesUnicos = new Set(registros.map((r) => normalizarTexto(r.atendente)).filter(Boolean)).size;
    const diasComDados = new Set(registros.map((r) => normalizarTexto(r.data_atendimento)).filter(Boolean)).size;

    const taxaRetencao = totalTentativas ? (totalRetidos / totalTentativas) * 100 : 0;
    const taxaCancelamento = totalTentativas ? (totalCancelamentos / totalTentativas) * 100 : 0;
    const taxaAcordo = totalTentativas ? (totalAcordos / totalTentativas) * 100 : 0;
    const produtividadeDia = diasComDados ? totalTentativas / diasComDados : 0;
    const produtividadeColaborador = (atendentesUnicos && diasComDados)
      ? totalTentativas / atendentesUnicos / diasComDados
      : 0;

    const timelineMap = new Map();
    const motivosMap = new Map();
    const atendenteMap = new Map();

    registros.forEach((r) => {
      const data = normalizarTexto(r.data_atendimento) || 'sem_data';
      const motivo = normalizarTexto(r.motivo) || 'Sem motivo';
      const atendente = normalizarTexto(r.atendente) || 'Sem atendente';
      const retido = isRetido(r.resultado_tratativa);
      const cancelado = isCancelamento(r.resultado_tratativa);

      if (!timelineMap.has(data)) {
        timelineMap.set(data, { data, tentativas: 0, retidos: 0, cancelamentos: 0 });
      }
      const t = timelineMap.get(data);
      t.tentativas += 1;
      if (retido) t.retidos += 1;
      if (cancelado) t.cancelamentos += 1;

      motivosMap.set(motivo, (motivosMap.get(motivo) || 0) + 1);

      if (!atendenteMap.has(atendente)) {
        atendenteMap.set(atendente, { atendente, tentativas: 0, retidos: 0, cancelamentos: 0, taxaRetencao: 0 });
      }
      const a = atendenteMap.get(atendente);
      a.tentativas += 1;
      if (retido) a.retidos += 1;
      if (cancelado) a.cancelamentos += 1;
    });

    const timeline = Array.from(timelineMap.values())
      .sort((a, b) => a.data.localeCompare(b.data));

    const topMotivos = Array.from(motivosMap.entries())
      .map(([motivo, total]) => ({ motivo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const performanceAtendentes = Array.from(atendenteMap.values())
      .map((a) => ({
        ...a,
        taxaRetencao: a.tentativas ? (a.retidos / a.tentativas) * 100 : 0
      }))
      .sort((a, b) => b.tentativas - a.tentativas)
      .slice(0, 12);

    return res.json({
      kpis: {
        totalTentativas,
        totalRetidos,
        totalCancelamentos,
        totalTitularidade,
        totalAcordos,
        atendentesUnicos,
        diasComDados,
        produtividadeDia,
        produtividadeColaborador,
        taxaRetencao,
        taxaCancelamento,
        taxaAcordo
      },
      graficos: {
        timeline,
        topMotivos,
        performanceAtendentes
      }
    });
  } catch (erro) {
    console.error('Erro ao calcular analytics de retencao:', erro);
    return res.status(500).json({ erro: 'Erro ao calcular analytics de retencao' });
  }
};
