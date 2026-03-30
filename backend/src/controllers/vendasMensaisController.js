const fs = require('fs');
const pdfParse = require('pdf-parse');
const { db_all, db_get } = require('../config/database');
const VendasMensais = require('../models/VendasMensais');

const normalizarNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }

  const numero = Number(valor);
  return Number.isNaN(numero) ? 0 : numero;
};

const arredondar2 = (valor) => Number(normalizarNumero(valor).toFixed(2));

const harmonizarVolumeFinanceiro = (dados, campoVolume, campoFinanceiro) => {
  const volumeAtual = normalizarNumero(dados[campoVolume]);
  const financeiroAtual = normalizarNumero(dados[campoFinanceiro]);
  if (financeiroAtual > 0 && volumeAtual <= 0) {
    dados[campoVolume] = 1;
  }
};

const aplicarFinanceiroPadrao = (dados, campoVolume, campoFinanceiro, valorUnitario) => {
  const volume = normalizarNumero(dados[campoVolume]);
  if (volume > 0) {
    dados[campoFinanceiro] = arredondar2(volume * valorUnitario);
  }
};

const harmonizarDadosComissionamento = (dados) => {
  const pares = [
    ['vendasVolume', 'vendasFinanceiro'],
    ['mudancaTitularidadeVolume', 'mudancaTitularidadeFinanceiro'],
    ['migracaoTecnologiaVolume', 'migracaoTecnologiaFinanceiro'],
    ['renovacaoVolume', 'renovacaoFinanceiro'],
    ['planoEventoVolume', 'planoEventoFinanceiro'],
    ['svaVolume', 'svaFinanceiro'],
    ['telefoniaVolume', 'telefoniaFinanceiro']
  ];

  pares.forEach(([campoVolume, campoFinanceiro]) => {
    harmonizarVolumeFinanceiro(dados, campoVolume, campoFinanceiro);
  });

  // Financeiro de SVA e Telefonia sempre segue regra fixa por volume.
  aplicarFinanceiroPadrao(dados, 'svaVolume', 'svaFinanceiro', SVA_FINANCEIRO_PADRAO);
  aplicarFinanceiroPadrao(dados, 'telefoniaVolume', 'telefoniaFinanceiro', TELEFONIA_FINANCEIRO_PADRAO);

  return dados;
};

const montarDados = (body) => harmonizarDadosComissionamento({
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

const possuiAlgumValorInformado = (dados) => {
  const camposNumericos = [
    dados.vendasVolume,
    dados.vendasFinanceiro,
    dados.mudancaTitularidadeVolume,
    dados.mudancaTitularidadeFinanceiro,
    dados.migracaoTecnologiaVolume,
    dados.migracaoTecnologiaFinanceiro,
    dados.renovacaoVolume,
    dados.renovacaoFinanceiro,
    dados.planoEventoVolume,
    dados.planoEventoFinanceiro,
    dados.svaVolume,
    dados.svaFinanceiro,
    dados.telefoniaVolume,
    dados.telefoniaFinanceiro
  ];

  return camposNumericos.some((valor) => valor !== 0);
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SVA_FINANCEIRO_PADRAO = 30;
const TELEFONIA_FINANCEIRO_PADRAO = 19.9;

const SVA_PLANOS_SEMPRE_ELEGIVEIS = new Set([
  'combo start - at',
  'combo turbo pf - at',
  'combo ultra - at'
]);

const TELEFONIA_PADROES_POSITIVOS = [
  { regex: /\bvoip\b/i, label: 'VOIP' },
  { regex: /\btelefonia\b/i, label: 'Telefonia' },
  { regex: /\btelefone\b/i, label: 'Telefone' },
  { regex: /\bstfc\b/i, label: 'STFC' },
  { regex: /\bnbs\s+fone\b/i, label: 'NBS Fone' },
  { regex: /\bfone\b/i, label: 'Fone' },
  { regex: /\bvoz\b/i, label: 'Voz' }
];

const CAMPOS_EVENTO = {
  vendas: {
    campoVolume: 'vendasVolume',
    campoFinanceiro: 'vendasFinanceiro',
    colunaVolume: 'vendas_volume',
    colunaFinanceiro: 'vendas_financeiro'
  },
  mudancaTitularidade: {
    campoVolume: 'mudancaTitularidadeVolume',
    campoFinanceiro: 'mudancaTitularidadeFinanceiro',
    colunaVolume: 'mudanca_titularidade_volume',
    colunaFinanceiro: 'mudanca_titularidade_financeiro'
  },
  migracaoTecnologia: {
    campoVolume: 'migracaoTecnologiaVolume',
    campoFinanceiro: 'migracaoTecnologiaFinanceiro',
    colunaVolume: 'migracao_tecnologia_volume',
    colunaFinanceiro: 'migracao_tecnologia_financeiro'
  },
  renovacao: {
    campoVolume: 'renovacaoVolume',
    campoFinanceiro: 'renovacaoFinanceiro',
    colunaVolume: 'renovacao_volume',
    colunaFinanceiro: 'renovacao_financeiro'
  },
  planoEvento: {
    campoVolume: 'planoEventoVolume',
    campoFinanceiro: 'planoEventoFinanceiro',
    colunaVolume: 'plano_evento_volume',
    colunaFinanceiro: 'plano_evento_financeiro'
  },
  sva: {
    campoVolume: 'svaVolume',
    campoFinanceiro: 'svaFinanceiro',
    colunaVolume: 'sva_volume',
    colunaFinanceiro: 'sva_financeiro'
  },
  telefonia: {
    campoVolume: 'telefoniaVolume',
    campoFinanceiro: 'telefoniaFinanceiro',
    colunaVolume: 'telefonia_volume',
    colunaFinanceiro: 'telefonia_financeiro'
  }
};

const CIDADE_REGIONAL_PADRAO = {
  "alta floresta d'oeste": 'ALTA FLORESTA DOESTE',
  'alto alegre dos parecis': 'ALTA FLORESTA DOESTE',
  "alvorada d'oeste": 'ALVORADA DOESTE',
  cacoal: 'ROLIM DE MOURA',
  castanheiras: 'PRESIDENTE MEDICI',
  cujubim: 'MACHADINHO DOESTE',
  jaru: 'JARU',
  'ji-parana': 'JI-PARANA',
  "machadinho d'oeste": 'MACHADINHO DOESTE',
  "nova brasilandia d'oeste": 'NOVA BRASILANDIA',
  'novo horizonte do oeste': 'ROLIM DE MOURA',
  'ouro preto do oeste': 'OURO PRETO',
  parecis: 'ROLIM DE MOURA',
  'pimenta bueno': 'ROLIM DE MOURA',
  'presidente medici': 'PRESIDENTE MEDICI',
  'primavera de rondonia': 'ROLIM DE MOURA',
  'rolim de moura': 'ROLIM DE MOURA',
  "santa luzia d'oeste": 'ROLIM DE MOURA',
  "sao felipe d'oeste": 'ROLIM DE MOURA',
  'sao francisco do guapore': 'SAO FRANCISCO',
  'sao miguel do guapore': 'SAO FRANCISCO',
  seringueiras: 'SAO FRANCISCO',
  teixeiropolis: 'ALVORADA DOESTE',
  theobroma: 'JARU',
  urupa: 'ALVORADA DOESTE',
  'vale do anari': 'MACHADINHO DOESTE',
  'vale do paraiso': 'OURO PRETO'
};

const MAPA_MESES = {
  jan: 0,
  janeiro: 0,
  fev: 1,
  fevereiro: 1,
  mar: 2,
  marco: 2,
  abr: 3,
  abril: 3,
  mai: 4,
  maio: 4,
  jun: 5,
  junho: 5,
  jul: 6,
  julho: 6,
  ago: 7,
  agosto: 7,
  set: 8,
  setembro: 8,
  out: 9,
  outubro: 9,
  nov: 10,
  novembro: 10,
  dez: 11,
  dezembro: 11
};

const MAPA_TIPO_EVENTO = {
  vendas: 'vendas',
  venda: 'vendas',
  instalacao: 'vendas',
  reativacao: 'vendas',
  upgrade: 'vendas',
  mudancatitularidade: 'mudancaTitularidade',
  mudancadetitularidade: 'mudancaTitularidade',
  titularidade: 'mudancaTitularidade',
  mudancatecnologia: 'migracaoTecnologia',
  migracaotecnologia: 'migracaoTecnologia',
  tecnologica: 'migracaoTecnologia',
  renovacao: 'renovacao',
  planoevento: 'planoEvento',
  evento: 'planoEvento',
  sva: 'sva',
  telefonia: 'telefonia',
  telefone: 'telefonia',
  voip: 'telefonia',
  fone: 'telefonia',
  stfc: 'telefonia',
  voz: 'telefonia',
  telefonefixo: 'telefonia',
  telefoniafixa: 'telefonia'
};

const limparTexto = (valor) => String(valor || '').replace(/\uFEFF/g, '').trim();

const removerAcentos = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizarComparacao = (valor) => removerAcentos(limparTexto(valor))
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const normalizarNomePessoa = (valor) => normalizarComparacao(valor)
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizarRegionalComparacao = (valor) => normalizarComparacao(valor)
  .replace(/^uni\s*-\s*/i, '')
  .replace(/^uni\s+/i, '')
  .replace(/\bdoeste\b/g, 'do oeste')
  .trim();

const normalizarTipoEvento = (valor) => {
  const chave = normalizarComparacao(valor).replace(/[^a-z0-9]+/g, '');
  return MAPA_TIPO_EVENTO[chave] || '';
};

const normalizarPlanoSva = (valor) => normalizarComparacao(valor)
  .replace(/\s+/g, ' ')
  .trim();

const parseValorMonetario = (valor) => {
  const raw = limparTexto(valor);
  if (!raw) return 0;
  const numero = Number(raw.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
};

const formatarPeriodo = (mesIdx, ano) => {
  if (!Number.isInteger(mesIdx) || mesIdx < 0 || mesIdx > 11) return '';
  const ano2 = String(ano).slice(-2);
  return `${MESES[mesIdx]}/${ano2}`;
};

const normalizarPeriodo = (valor) => {
  const texto = limparTexto(valor);
  if (!texto) return '';

  const dataBr = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dataBr) {
    let ano = Number(dataBr[3]);
    if (ano < 100) ano += 2000;
    return formatarPeriodo(Number(dataBr[2]) - 1, ano);
  }

  const mesAno = texto.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (mesAno) {
    let ano = Number(mesAno[2]);
    if (ano < 100) ano += 2000;
    return formatarPeriodo(Number(mesAno[1]) - 1, ano);
  }

  const textoNormalizado = normalizarComparacao(texto).replace(/[-_.]/g, '/');
  const tokens = textoNormalizado.split(/[^a-z0-9]+/).filter(Boolean);
  const tokenMes = tokens.find((token) => Object.prototype.hasOwnProperty.call(MAPA_MESES, token));
  if (tokenMes) {
    const tokenAno = tokens.find((token) => /^\d{4}$/.test(token))
      || tokens.find((token) => /^\d{2}$/.test(token));
    let ano = Number(tokenAno || new Date().getFullYear());
    if (ano < 100) ano += 2000;
    return formatarPeriodo(MAPA_MESES[tokenMes], ano);
  }

  const mesAnoTexto = texto.match(/^([a-zA-Z]{3})\/(\d{2})$/);
  if (mesAnoTexto) {
    const idxMes = MAPA_MESES[normalizarComparacao(mesAnoTexto[1])];
    if (Number.isInteger(idxMes)) {
      return formatarPeriodo(idxMes, Number(`20${mesAnoTexto[2]}`));
    }
  }

  return '';
};

const dataBrParaPeriodo = (dataBr) => {
  const match = limparTexto(dataBr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return '';
  let ano = Number(match[3]);
  if (ano < 100) ano += 2000;
  return formatarPeriodo(Number(match[2]) - 1, ano);
};

const extrairPeriodoDoNomeArquivo = (nomeArquivo) => {
  const base = normalizarComparacao(nomeArquivo);
  if (!base) return '';

  const matchTexto = base.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[^0-9]{0,3}(\d{2,4})/);
  if (matchTexto) {
    let ano = Number(matchTexto[2]);
    if (ano < 100) ano += 2000;
    return formatarPeriodo(MAPA_MESES[matchTexto[1]], ano);
  }

  const matchNum = base.match(/(\d{1,2})[\/_\-.](\d{2,4})/);
  if (matchNum) {
    let ano = Number(matchNum[2]);
    if (ano < 100) ano += 2000;
    return formatarPeriodo(Number(matchNum[1]) - 1, ano);
  }

  return '';
};

const linhaIgnoravelPdf = (linha) => {
  const texto = normalizarComparacao(linha);
  if (!texto) return true;
  return (
    texto.startsWith('uni telecom') ||
    texto.startsWith('usuario:') ||
    texto.startsWith('fone:') ||
    texto.startsWith('rua ') ||
    texto.startsWith('relatorio ') ||
    texto.startsWith('ativacao') ||
    texto.startsWith('www.ixcsoft.com.br') ||
    /^pagina\s+\d+\/\d+/.test(texto)
  );
};

const prepararLinhaPdf = (linha) => {
  let texto = limparTexto(linha).replace(/\s+/g, ' ');
  if (!texto) return '';

  texto = texto.replace(/(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})/g, '$1 $2');
  texto = texto.replace(/([A-Za-zÀ-ÿ])((?:Combo|Via R[aá]dio|Enterprise|Plano|Fibra|Internet))/g, '$1 $2');
  texto = texto.replace(/(\d{1,3}(?:\.\d{3})*,\d{2})([A-Za-zÀ-ÿ])/g, '$1 $2');
  texto = texto.replace(/([A-Za-zÀ-ÿ])(\d{1,3}(?:\.\d{3})*,\d{2})/g, '$1 $2');
  return texto.replace(/\s+/g, ' ').trim();
};

const extrairPlanoDoTrechoPdf = (restanteLinha) => {
  const trecho = limparTexto(restanteLinha).replace(/\s+/g, ' ').trim();
  if (!trecho) return '';

  const matchPrimeiroValor = trecho.match(/\d{1,3}(?:\.\d{3})*,\d{2}/);
  if (!matchPrimeiroValor) return '';

  const prefixo = trecho.slice(0, matchPrimeiroValor.index).trim();
  if (!prefixo) return '';

  const inicioPlano = prefixo.search(
    /combo|via\s+r[a-z]*dio|enterprise|fibra|plano|radio|eventos|\d{2,4}\s*mega/i
  );

  if (inicioPlano >= 0) {
    return prefixo.slice(inicioPlano).replace(/\s+/g, ' ').trim();
  }

  return prefixo.replace(/\s+/g, ' ').trim();
};

const extrairVelocidadePlano = (plano) => {
  const texto = limparTexto(plano);
  if (!texto) return null;

  const regexes = [
    /(\d{2,4})\s*MEGA/i,
    /(\d{2,4})\s*(?:MBPS|MB)\b/i,
    /time\s*uni\s*-\s*(\d{2,4})\b/i
  ];

  for (const regex of regexes) {
    const match = texto.match(regex);
    if (match) {
      const velocidade = Number(match[1]);
      if (Number.isFinite(velocidade)) return velocidade;
    }
  }

  return null;
};

const avaliarElegibilidadeSva = (plano) => {
  const planoNormalizado = normalizarPlanoSva(plano);
  if (!planoNormalizado) {
    return { elegivel: false, motivo: 'Plano nao identificado' };
  }

  if (SVA_PLANOS_SEMPRE_ELEGIVEIS.has(planoNormalizado)) {
    return { elegivel: true, motivo: 'Plano em whitelist SVA' };
  }

  if (/\bvia\s+r[a-z]*dio\b|\bradio\b/i.test(planoNormalizado)) {
    return { elegivel: false, motivo: 'Plano de radio nao comissiona SVA' };
  }

  if (/\bcombo\s+fast\s*-\s*at\b/i.test(planoNormalizado)) {
    return { elegivel: false, motivo: 'Combo Fast - AT nao comissiona SVA' };
  }

  const velocidade = extrairVelocidadePlano(plano);
  if (velocidade !== null) {
    if (velocidade === 500) {
      const fastComComplemento = /\bfast\s*\+\s*[a-z0-9]/i.test(planoNormalizado);
      if (!fastComComplemento) {
        return { elegivel: false, motivo: 'Plano 500 mega so com Fast + complemento' };
      }
    }

    if (velocidade >= 500) {
      return { elegivel: true, motivo: `Plano ${velocidade} mega elegivel` };
    }
    return { elegivel: false, motivo: `Plano ${velocidade} mega abaixo de 500` };
  }

  return { elegivel: false, motivo: 'Plano sem velocidade explicita (fora da whitelist)' };
};

const detectarSinalTelefonia = (texto) => {
  const textoLimpo = limparTexto(texto).replace(/\s+/g, ' ').trim();
  if (!textoLimpo) return null;

  const temIpFixo = /\bip\s*fixo\b/i.test(textoLimpo);
  for (const padrao of TELEFONIA_PADROES_POSITIVOS) {
    if (padrao.regex.test(textoLimpo)) {
      return { positivo: true, label: padrao.label, texto: textoLimpo };
    }
  }

  if (temIpFixo) {
    return { positivo: false, motivo: 'Apenas IP fixo (sem telefone/voip)', texto: textoLimpo };
  }

  return null;
};

const avaliarElegibilidadeTelefonia = (fontes = []) => {
  const fontesValidas = (Array.isArray(fontes) ? fontes : [])
    .map((fonte) => ({
      nome: limparTexto(fonte?.nome || ''),
      texto: limparTexto(fonte?.texto || '')
    }))
    .filter((fonte) => fonte.texto);

  if (!fontesValidas.length) {
    return { elegivel: false, motivo: 'Sem dados de plano/contrato para validar telefonia' };
  }

  let encontrouIpFixoIsolado = false;
  for (const fonte of fontesValidas) {
    const sinal = detectarSinalTelefonia(fonte.texto);
    if (!sinal) continue;
    if (sinal.positivo) {
      return {
        elegivel: true,
        motivo: `Sinal de telefonia (${sinal.label})`,
        fonte: fonte.nome || 'fonte nao informada',
        evidencia: sinal.texto
      };
    }
    encontrouIpFixoIsolado = true;
  }

  if (encontrouIpFixoIsolado) {
    return { elegivel: false, motivo: 'Apenas IP fixo sem sinal de telefonia' };
  }

  return { elegivel: false, motivo: 'Sem sinal de telefonia (telefone/voip/fone/stfc/voz)' };
};

const extrairLinhaEventoPdf = (linhaOriginal) => {
  const linha = prepararLinhaPdf(linhaOriginal);
  const inicio = linha.match(/^(\d{2}\/\d{2}\/\d{4})(.*)$/);
  if (!inicio) return null;

  const dataAtivacao = inicio[1];
  let restanteInicio = limparTexto(inicio[2]);
  let dataEvento = dataAtivacao;

  const segundaData = restanteInicio.match(/^(\d{2}\/\d{2}\/\d{4})(.*)$/);
  if (segundaData) {
    dataEvento = segundaData[1];
    restanteInicio = limparTexto(segundaData[2]);
  }

  const clienteMatch = restanteInicio.match(/^(\d{3,})(.*)$/);
  if (!clienteMatch) return null;

  const clienteId = limparTexto(clienteMatch[1]);
  const restante = limparTexto(clienteMatch[2]);
  if (!clienteId || !restante) return null;

  const restanteLimpo = restante.replace(/\s+/g, ' ').trim();
  const planoPdf = extrairPlanoDoTrechoPdf(restanteLimpo);

  const matchComAt = restanteLimpo.match(
    /- AT\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*(.+?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*\d+[xX]\s*vencimento/i
  );

  if (matchComAt) {
    let vendedor = limparTexto(matchComAt[2]).replace(/\s+/g, ' ');
    if (!vendedor) vendedor = 'Vendedor padrao';

    return {
      dataAtivacao,
      dataEvento,
      clienteId: limparTexto(clienteId),
      vendedor,
      planoPdf,
      valorBase: parseValorMonetario(matchComAt[1]),
      linhaOriginal: linha
    };
  }

  const matchesMoeda = [...restanteLimpo.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}/g)];
  if (!matchesMoeda.length) return null;

  const primeiraMoeda = matchesMoeda[0];
  const segundaMoeda = matchesMoeda[1] || null;
  const valorBase = parseValorMonetario(primeiraMoeda[0]);

  let vendedor = '';
  if (segundaMoeda) {
    vendedor = restanteLimpo.slice(primeiraMoeda.index + primeiraMoeda[0].length, segundaMoeda.index).trim();
  } else {
    const aposValor = restanteLimpo.slice(primeiraMoeda.index + primeiraMoeda[0].length).trim();
    const idxParcela = aposValor.search(/\b\d+[xX]\b/);
    vendedor = idxParcela >= 0 ? aposValor.slice(0, idxParcela).trim() : aposValor;
  }

  vendedor = vendedor.replace(/\s+/g, ' ').trim();
  if (!vendedor) vendedor = 'Vendedor padrao';

  return {
    dataAtivacao,
    dataEvento,
    clienteId: limparTexto(clienteId),
    vendedor,
    planoPdf,
    valorBase,
    linhaOriginal: linha
  };
};

const criarRegistroZerado = (periodo, vendedorId, regionalId) => ({
  periodo,
  vendedorId,
  regionalId,
  vendasVolume: 0,
  vendasFinanceiro: 0,
  mudancaTitularidadeVolume: 0,
  mudancaTitularidadeFinanceiro: 0,
  migracaoTecnologiaVolume: 0,
  migracaoTecnologiaFinanceiro: 0,
  renovacaoVolume: 0,
  renovacaoFinanceiro: 0,
  planoEventoVolume: 0,
  planoEventoFinanceiro: 0,
  svaVolume: 0,
  svaFinanceiro: 0,
  telefoniaVolume: 0,
  telefoniaFinanceiro: 0
});

const linhaBancoParaDados = (registro) => ({
  periodo: registro.periodo,
  vendedorId: registro.vendedor_id,
  regionalId: registro.regional_id,
  vendasVolume: normalizarNumero(registro.vendas_volume),
  vendasFinanceiro: normalizarNumero(registro.vendas_financeiro),
  mudancaTitularidadeVolume: normalizarNumero(registro.mudanca_titularidade_volume),
  mudancaTitularidadeFinanceiro: normalizarNumero(registro.mudanca_titularidade_financeiro),
  migracaoTecnologiaVolume: normalizarNumero(registro.migracao_tecnologia_volume),
  migracaoTecnologiaFinanceiro: normalizarNumero(registro.migracao_tecnologia_financeiro),
  renovacaoVolume: normalizarNumero(registro.renovacao_volume),
  renovacaoFinanceiro: normalizarNumero(registro.renovacao_financeiro),
  planoEventoVolume: normalizarNumero(registro.plano_evento_volume),
  planoEventoFinanceiro: normalizarNumero(registro.plano_evento_financeiro),
  svaVolume: normalizarNumero(registro.sva_volume),
  svaFinanceiro: normalizarNumero(registro.sva_financeiro),
  telefoniaVolume: normalizarNumero(registro.telefonia_volume),
  telefoniaFinanceiro: normalizarNumero(registro.telefonia_financeiro)
});

const chaveRegistro = (periodo, vendedorId, regionalId) => `${periodo}::${vendedorId}::${regionalId}`;

const campoFinanceiroPorTipoEvento = (tipoEvento, valorBase) => {
  if (tipoEvento === 'sva') return SVA_FINANCEIRO_PADRAO;
  if (tipoEvento === 'telefonia') return TELEFONIA_FINANCEIRO_PADRAO;
  return normalizarNumero(valorBase);
};

const resolverArquivoUpload = (req) => {
  const arquivos = req.files || {};
  return arquivos.arquivo || arquivos.file || Object.values(arquivos)[0] || null;
};

const carregarBufferArquivo = async (arquivo) => {
  if (!arquivo) return { buffer: null, tempFilePath: '' };
  if (arquivo.data && arquivo.data.length) {
    return { buffer: arquivo.data, tempFilePath: arquivo.tempFilePath || '' };
  }
  if (arquivo.tempFilePath) {
    const buffer = await fs.promises.readFile(arquivo.tempFilePath);
    return { buffer, tempFilePath: arquivo.tempFilePath };
  }
  return { buffer: null, tempFilePath: '' };
};

const extrairLinhasPdf = (textoBruto) => {
  const linhas = limparTexto(textoBruto).split(/\r?\n/);
  return linhas
    .map((linha) => prepararLinhaPdf(linha))
    .filter((linha) => linha && !linhaIgnoravelPdf(linha))
    .map((linha) => extrairLinhaEventoPdf(linha))
    .filter(Boolean);
};

const carregarMapaRegionalPorCidade = async () => {
  const [regionais, cidades] = await Promise.all([
    db_all('SELECT id, nome FROM regionais'),
    db_all(`SELECT rc.cidade, rc.regional_id, rc.ativo, r.nome AS regional_nome
            FROM regional_cidades rc
            LEFT JOIN regionais r ON r.id = rc.regional_id`)
  ]);

  const regionalPorNome = new Map();
  (regionais || []).forEach((item) => {
    const chave = normalizarRegionalComparacao(item.nome);
    if (chave) regionalPorNome.set(chave, item.id);
  });

  const regionalPorCidade = new Map();
  (cidades || []).forEach((item) => {
    if (Number(item.ativo) === 0) return;
    const chaveCidade = normalizarComparacao(item.cidade);
    if (!chaveCidade) return;

    if (item.regional_id) {
      regionalPorCidade.set(chaveCidade, item.regional_id);
      return;
    }

    if (item.regional_nome) {
      const regionalId = regionalPorNome.get(normalizarRegionalComparacao(item.regional_nome));
      if (regionalId) regionalPorCidade.set(chaveCidade, regionalId);
    }
  });

  Object.entries(CIDADE_REGIONAL_PADRAO).forEach(([cidade, regionalNome]) => {
    const chaveCidade = normalizarComparacao(cidade);
    if (!chaveCidade || regionalPorCidade.has(chaveCidade)) return;
    const regionalId = regionalPorNome.get(normalizarRegionalComparacao(regionalNome));
    if (regionalId) regionalPorCidade.set(chaveCidade, regionalId);
  });

  return regionalPorCidade;
};

const buscarCidadePorCliente = async (clienteId, periodoReferencia, cache) => {
  const cliente = limparTexto(clienteId);
  if (!cliente) return null;

  const chaveCache = `${cliente}::${periodoReferencia || ''}`;
  if (cache.has(chaveCache)) return cache.get(chaveCache);

  const linha = await db_get(
    `SELECT cidade, periodo_referencia, dt_ativacao
       FROM contratos_base
      WHERE TRIM(cliente_id) = TRIM(?)
      ORDER BY
        CASE WHEN periodo_referencia = ? THEN 0 ELSE 1 END,
        CASE WHEN dt_ativacao IS NULL OR TRIM(dt_ativacao) = '' THEN 1 ELSE 0 END,
        dt_ativacao DESC,
        periodo_referencia DESC,
        dataAtualizacao DESC,
        dataCriacao DESC
      LIMIT 1`,
    [cliente, periodoReferencia || '']
  );

  const cidade = limparTexto(linha?.cidade);
  cache.set(chaveCache, cidade || null);
  return cidade || null;
};

const chunkArray = (itens = [], tamanho = 400) => {
  const resultado = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    resultado.push(itens.slice(i, i + tamanho));
  }
  return resultado;
};

const normalizarClienteId = (clienteId) => limparTexto(clienteId).replace(/\s+/g, '');

const scorePeriodoContrato = (periodoReferencia, periodoDesejado) => (
  periodoDesejado && periodoReferencia === periodoDesejado ? 1 : 0
);

const scoreDataContrato = (dtAtivacao) => {
  const timestamp = Date.parse(limparTexto(dtAtivacao));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const escolherMelhorContrato = (atual, candidato, periodoDesejado) => {
  if (!atual) return candidato;

  const scoreAtualPeriodo = scorePeriodoContrato(atual.periodo_referencia, periodoDesejado);
  const scoreCandidatoPeriodo = scorePeriodoContrato(candidato.periodo_referencia, periodoDesejado);
  if (scoreCandidatoPeriodo !== scoreAtualPeriodo) {
    return scoreCandidatoPeriodo > scoreAtualPeriodo ? candidato : atual;
  }

  const scoreAtualData = scoreDataContrato(atual.dt_ativacao);
  const scoreCandidatoData = scoreDataContrato(candidato.dt_ativacao);
  if (scoreCandidatoData !== scoreAtualData) {
    return scoreCandidatoData > scoreAtualData ? candidato : atual;
  }

  const periodoAtual = limparTexto(atual.periodo_referencia);
  const periodoCandidato = limparTexto(candidato.periodo_referencia);
  if (periodoCandidato !== periodoAtual) {
    return periodoCandidato > periodoAtual ? candidato : atual;
  }

  return atual;
};

const carregarContratosPorClientes = async (clienteIds, periodoDesejado = '') => {
  const idsNormalizados = Array.from(new Set(
    (clienteIds || []).map((id) => normalizarClienteId(id)).filter(Boolean)
  ));
  if (!idsNormalizados.length) return new Map();

  const melhorContratoPorCliente = new Map();
  const indicadorTelefoniaPorCliente = new Map();
  const blocos = chunkArray(idsNormalizados, 400);

  for (const bloco of blocos) {
    const placeholders = bloco.map(() => '?').join(', ');
    const linhas = await db_all(
      `SELECT cliente_id, cidade, descricao_servico, tipo_produto, tipo_contrato, periodo_referencia, dt_ativacao
         FROM contratos_base
        WHERE TRIM(cliente_id) IN (${placeholders})`,
      bloco
    );

    (linhas || []).forEach((linha) => {
      const chave = normalizarClienteId(linha.cliente_id);
      if (!chave) return;

      const melhorAtual = melhorContratoPorCliente.get(chave);
      const melhor = escolherMelhorContrato(melhorAtual, linha, periodoDesejado);
      melhorContratoPorCliente.set(chave, melhor);

      if (!indicadorTelefoniaPorCliente.has(chave)) {
        const avaliacaoTelefonia = avaliarElegibilidadeTelefonia([
          { nome: 'descricao_servico', texto: linha?.descricao_servico },
          { nome: 'tipo_produto', texto: linha?.tipo_produto },
          { nome: 'tipo_contrato', texto: linha?.tipo_contrato }
        ]);

        if (avaliacaoTelefonia.elegivel) {
          indicadorTelefoniaPorCliente.set(chave, {
            temTelefonia: true,
            evidencia: limparTexto(avaliacaoTelefonia.evidencia || linha?.descricao_servico)
          });
        }
      }
    });
  }

  const contratoPorCliente = new Map();
  melhorContratoPorCliente.forEach((linha, clienteId) => {
    const indicadorTelefonia = indicadorTelefoniaPorCliente.get(clienteId);
    contratoPorCliente.set(clienteId, {
      cidade: limparTexto(linha?.cidade),
      descricaoServico: limparTexto(linha?.descricao_servico),
      tipoProduto: limparTexto(linha?.tipo_produto),
      tipoContrato: limparTexto(linha?.tipo_contrato),
      temTelefonia: Boolean(indicadorTelefonia?.temTelefonia),
      evidenciaTelefonia: limparTexto(indicadorTelefonia?.evidencia)
    });
  });

  return contratoPorCliente;
};

const obterFimDoPeriodo = (periodo) => {
  const periodoNormalizado = normalizarPeriodo(periodo || '');
  const [mesTxt, anoTxt] = String(periodoNormalizado).split('/');
  if (!mesTxt || !anoTxt) return null;

  const mes = MAPA_MESES[normalizarComparacao(mesTxt)];
  if (!Number.isInteger(mes)) return null;

  let ano = Number(anoTxt);
  if (Number.isNaN(ano)) return null;
  if (ano < 100) ano += 2000;

  return new Date(ano, mes + 1, 0, 23, 59, 59, 999);
};

const periodoParaIndice = (periodo) => {
  const periodoNormalizado = normalizarPeriodo(periodo || '');
  const [mesTxt, anoTxt] = String(periodoNormalizado).split('/');
  if (!mesTxt || !anoTxt) return Number.NEGATIVE_INFINITY;

  const mes = MAPA_MESES[normalizarComparacao(mesTxt)];
  if (!Number.isInteger(mes)) return Number.NEGATIVE_INFINITY;

  let ano = Number(anoTxt);
  if (Number.isNaN(ano)) return Number.NEGATIVE_INFINITY;
  if (ano < 100) ano += 2000;

  return (ano * 12) + mes;
};

const estaAtivoNoPeriodo = (colaborador, periodo) => {
  const status = normalizarComparacao(colaborador?.status || '');
  const fimPeriodo = obterFimDoPeriodo(periodo);
  if (!fimPeriodo) return status === 'ativo';

  const dataAtivacao = colaborador?.data_ativacao ? new Date(colaborador.data_ativacao) : null;
  if (dataAtivacao && !Number.isNaN(dataAtivacao.getTime()) && dataAtivacao > fimPeriodo) {
    return false;
  }

  if (!colaborador?.data_inativacao) {
    return status === 'ativo';
  }
  const dataInativacao = new Date(colaborador.data_inativacao);
  if (Number.isNaN(dataInativacao.getTime())) return status === 'ativo';

  return dataInativacao > fimPeriodo;
};

const indexarPorNomeNormalizado = (lista = []) => {
  const mapa = new Map();
  (Array.isArray(lista) ? lista : []).forEach((item) => {
    const nomeChave = normalizarNomePessoa(item?.nome);
    if (!nomeChave) return;
    if (!mapa.has(nomeChave)) {
      mapa.set(nomeChave, []);
    }
    mapa.get(nomeChave).push(item);
  });
  return mapa;
};

const selecionarMaisRecentePorPeriodo = (lista = []) => {
  if (!Array.isArray(lista) || !lista.length) return null;

  return lista.reduce((melhor, atual) => {
    if (!melhor) return atual;
    const scoreAtual = periodoParaIndice(atual?.periodo);
    const scoreMelhor = periodoParaIndice(melhor?.periodo);
    if (scoreAtual === scoreMelhor) return melhor;
    return scoreAtual > scoreMelhor ? atual : melhor;
  }, null);
};

const resolverVendedorId = ({ nomeVendedor, regionalId, periodo, contexto }) => {
  const nomeNormalizado = normalizarNomePessoa(nomeVendedor);
  if (!nomeNormalizado || !regionalId) {
    return {
      vendedorId: null,
      estrategia: 'nao_encontrado',
      motivo: 'Nome do vendedor ou regional ausente.'
    };
  }

  const candidatosColaborador = contexto.colaboradoresPorNome.get(nomeNormalizado) || [];
  const candidatosAtivosNoPeriodo = candidatosColaborador.filter((item) => estaAtivoNoPeriodo(item, periodo));

  const ativoMesmaRegional = candidatosAtivosNoPeriodo.find((item) => item.regional_id === regionalId);
  if (ativoMesmaRegional?.id) {
    return { vendedorId: ativoMesmaRegional.id, estrategia: 'ativos_regional' };
  }

  if (candidatosAtivosNoPeriodo[0]?.id) {
    return { vendedorId: candidatosAtivosNoPeriodo[0].id, estrategia: 'ativos_outra_regional' };
  }

  const candidatosVendas = contexto.vendedoresVendasPorNome.get(nomeNormalizado) || [];
  const periodoNormalizado = normalizarPeriodo(periodo || '');

  const mesmaRegionalMesmoPeriodo = selecionarMaisRecentePorPeriodo(
    candidatosVendas.filter((item) => (
      item.regional_id === regionalId
      && normalizarPeriodo(item.periodo) === periodoNormalizado
    ))
  );
  if (mesmaRegionalMesmoPeriodo?.id) {
    return {
      vendedorId: mesmaRegionalMesmoPeriodo.id,
      estrategia: 'vendas_regional_periodo'
    };
  }

  const qualquerRegionalMesmoPeriodo = selecionarMaisRecentePorPeriodo(
    candidatosVendas.filter((item) => normalizarPeriodo(item.periodo) === periodoNormalizado)
  );
  if (qualquerRegionalMesmoPeriodo?.id) {
    return {
      vendedorId: qualquerRegionalMesmoPeriodo.id,
      estrategia: 'vendas_periodo'
    };
  }

  const mesmaRegionalHistorico = selecionarMaisRecentePorPeriodo(
    candidatosVendas.filter((item) => item.regional_id === regionalId)
  );
  if (mesmaRegionalHistorico?.id) {
    return {
      vendedorId: mesmaRegionalHistorico.id,
      estrategia: 'vendas_regional_historico'
    };
  }

  const qualquerRegionalHistorico = selecionarMaisRecentePorPeriodo(candidatosVendas);
  if (qualquerRegionalHistorico?.id) {
    return {
      vendedorId: qualquerRegionalHistorico.id,
      estrategia: 'vendas_historico'
    };
  }

  return {
    vendedorId: null,
    estrategia: 'nao_encontrado',
    motivo: 'Nao encontrado na base de vendedores ativos nem no relatorio de vendas.'
  };
};

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
    if (!possuiAlgumValorInformado(dados)) {
      return res.status(400).json({ erro: 'Informe pelo menos um valor de venda diferente de zero' });
    }
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
    if (!possuiAlgumValorInformado(dados)) {
      return res.status(400).json({ erro: 'Informe pelo menos um valor de venda diferente de zero' });
    }
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

// POST /api/vendas-mensais/lote
exports.importarLote = async (req, res) => {
  try {
    const registros = Array.isArray(req.body?.registros) ? req.body.registros : [];
    const sincronizarPeriodo = Boolean(
      req.body?.sincronizarPeriodo || req.body?.modoImportacao === 'espelho'
    );

    if (!registros.length) {
      return res.status(400).json({ erro: 'Nenhum registro informado para importacao em lote' });
    }

    let sucesso = 0;
    let atualizados = 0;
    let falhas = 0;
    const erros = [];
    const registrosValidos = [];

    for (let i = 0; i < registros.length; i += 1) {
      const linha = i + 1;
      const row = registros[i] || {};
      const { periodo, vendedorId, regionalId } = row;

      if (!periodo || !vendedorId || !regionalId) {
        falhas += 1;
        erros.push(`Linha ${linha}: periodo, vendedorId e regionalId sao obrigatorios`);
        continue;
      }

      const dados = montarDados(row);
      if (!possuiAlgumValorInformado(dados)) {
        falhas += 1;
        erros.push(`Linha ${linha}: informe pelo menos um valor de venda diferente de zero`);
        continue;
      }

      registrosValidos.push({ linha, dados });
    }

    if (sincronizarPeriodo && falhas > 0) {
      return res.status(400).json({
        erro: 'Importacao em modo espelho cancelada: existem linhas invalidas no lote.',
        sucesso: 0,
        atualizados: 0,
        falhas,
        erros: erros.slice(0, 100)
      });
    }

    if (!registrosValidos.length) {
      return res.status(400).json({
        erro: 'Nenhum registro valido para importacao em lote',
        sucesso: 0,
        atualizados: 0,
        falhas,
        erros: erros.slice(0, 100)
      });
    }

    const periodos = Array.from(new Set(
      registrosValidos.map((r) => String(r?.dados?.periodo || '').trim()).filter(Boolean)
    ));
    const existentesMap = new Map();

    if (sincronizarPeriodo) {
      for (const periodo of periodos) {
        await VendasMensais.deletarPorPeriodo(periodo);
      }
    } else {
      for (const periodo of periodos) {
        const existentesPeriodo = await VendasMensais.listarPorPeriodo(periodo);
        existentesPeriodo.forEach((item) => {
          const chave = `${item.periodo}::${item.vendedor_id}::${item.regional_id}`;
          if (!existentesMap.has(chave)) {
            existentesMap.set(chave, item.id);
          }
        });
      }
    }

    for (let i = 0; i < registrosValidos.length; i += 1) {
      const { linha, dados } = registrosValidos[i];
      try {
        const chave = `${dados.periodo}::${dados.vendedorId}::${dados.regionalId}`;
        const existenteId = existentesMap.get(chave);

        if (existenteId) {
          await VendasMensais.atualizar(existenteId, dados);
          atualizados += 1;
        } else {
          const novoId = await VendasMensais.criar(dados);
          existentesMap.set(chave, novoId);
        }

        sucesso += 1;
      } catch (error) {
        falhas += 1;
        erros.push(`Linha ${linha}: ${error.message}`);
      }
    }

    return res.json({
      mensagem: `Importacao concluida: ${sucesso} registro(s) processado(s), ${atualizados} atualizado(s), ${falhas} falha(s).`,
      sucesso,
      atualizados,
      falhas,
      sincronizadoPeriodos: sincronizarPeriodo ? periodos : [],
      erros: erros.slice(0, 100)
    });
  } catch (erro) {
    console.error('Erro ao importar vendas mensais em lote:', erro);
    return res.status(500).json({ erro: 'Erro ao importar vendas mensais em lote' });
  }
};

// POST /api/vendas-mensais/importar-pdf-evento
exports.importarPdfEvento = async (req, res) => {
  let tempFilePath = '';
  try {
    const arquivo = resolverArquivoUpload(req);
    if (!arquivo) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado. Use o campo "arquivo".' });
    }

    const nomeArquivo = limparTexto(arquivo.name || arquivo?.filename || 'importacao.pdf');
    if (!nomeArquivo.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ erro: 'Arquivo invalido. Envie um PDF.' });
    }

    const tipoEvento = normalizarTipoEvento(
      req.body?.tipoEvento || req.body?.evento || req.body?.tipo || ''
    );
    const definicaoEvento = CAMPOS_EVENTO[tipoEvento];
    if (!definicaoEvento) {
      return res.status(400).json({
        erro: 'Tipo de evento invalido para importacao de PDF.',
        tiposAceitos: Object.keys(CAMPOS_EVENTO)
      });
    }

    const nomeArquivoNormalizado = normalizarComparacao(nomeArquivo);
    const permitirTelefoniaPorNomeArquivo = (
      tipoEvento === 'telefonia'
      && /(telefon|telefone|voip|fone|stfc|voz)/i.test(nomeArquivoNormalizado)
    );

    const periodoInformado = normalizarPeriodo(req.body?.periodo || '');
    const periodoDoArquivo = extrairPeriodoDoNomeArquivo(nomeArquivo);
    const periodoPadrao = periodoInformado || periodoDoArquivo;
    const sobrescreverTipoNoPeriodo = !(
      req.body?.sobrescreverTipoNoPeriodo === false
      || String(req.body?.sobrescreverTipoNoPeriodo || '').toLowerCase() === 'false'
      || String(req.body?.sobrescreverTipoNoPeriodo || '') === '0'
    );

    const { buffer, tempFilePath: arquivoTemporario } = await carregarBufferArquivo(arquivo);
    tempFilePath = arquivoTemporario || '';
    if (!buffer || !buffer.length) {
      return res.status(400).json({ erro: 'Nao foi possivel ler o arquivo PDF enviado.' });
    }

    const pdf = await pdfParse(buffer);
    const linhasPdf = extrairLinhasPdf(pdf.text || '');
    if (!linhasPdf.length) {
      return res.status(400).json({
        erro: 'Nenhuma linha valida foi identificada no PDF.'
      });
    }

    const regionalPorCidade = await carregarMapaRegionalPorCidade();
    const [colaboradores, vendedoresComMovimentoVendas] = await Promise.all([
      db_all(`
        SELECT id, nome, regional_id, status, data_ativacao, data_inativacao
          FROM colaboradores
      `),
      db_all(`
        SELECT vm.vendedor_id AS id,
               c.nome,
               vm.regional_id,
               vm.periodo,
               COALESCE(vm.vendas_volume, 0) AS vendas_volume,
               COALESCE(vm.vendas_financeiro, 0) AS vendas_financeiro
          FROM vendas_mensais vm
          INNER JOIN colaboradores c ON c.id = vm.vendedor_id
         WHERE COALESCE(vm.vendas_volume, 0) > 0
            OR COALESCE(vm.vendas_financeiro, 0) > 0
      `)
    ]);

    const contextoColaborador = {
      colaboradoresPorNome: indexarPorNomeNormalizado(colaboradores || []),
      vendedoresVendasPorNome: indexarPorNomeNormalizado(vendedoresComMovimentoVendas || [])
    };

    const periodoContratoPreferencial = (periodoPadrao || '')
      .replace(/^([A-Za-z]{3})\/(\d{2})$/, (_, mes, ano) => {
        const idxMes = MAPA_MESES[normalizarComparacao(mes)];
        if (!Number.isInteger(idxMes)) return `${mes}/${ano}`;
        return `${String(idxMes + 1).padStart(2, '0')}/${ano}`;
      });

    const contratosPorCliente = await carregarContratosPorClientes(
      linhasPdf.map((item) => item.clienteId),
      periodoContratoPreferencial
    );

    const agregados = new Map();
    const pendencias = [];
    const descartadasPorRegra = [];
    const resumoDescartadasPorRegra = new Map();
    const resumoResolucaoVendedor = {
      ativos_regional: 0,
      ativos_outra_regional: 0,
      vendas_regional_periodo: 0,
      vendas_periodo: 0,
      vendas_regional_historico: 0,
      vendas_historico: 0,
      nao_encontrado: 0
    };
    const vendedoresNaoEncontradosMap = new Map();

    for (let indice = 0; indice < linhasPdf.length; indice += 1) {
      const item = linhasPdf[indice];
      const linha = indice + 1;
      const periodoLinha = periodoPadrao || dataBrParaPeriodo(item.dataEvento);

      if (!periodoLinha) {
        pendencias.push({
          linha,
          clienteId: item.clienteId,
          motivo: 'Periodo nao identificado na linha nem no nome do arquivo.'
        });
        continue;
      }

      const contratoCliente = contratosPorCliente.get(normalizarClienteId(item.clienteId)) || null;
      const cidade = limparTexto(contratoCliente?.cidade);
      if (!cidade) {
        pendencias.push({
          linha,
          clienteId: item.clienteId,
          vendedor: item.vendedor,
          motivo: 'Cliente sem cidade na base de contratos.'
        });
        continue;
      }

      const regionalId = regionalPorCidade.get(normalizarComparacao(cidade)) || null;
      if (!regionalId) {
        pendencias.push({
          linha,
          clienteId: item.clienteId,
          cidade,
          vendedor: item.vendedor,
          motivo: 'Cidade sem mapeamento de regional.'
        });
        continue;
      }

      const resolucaoVendedor = resolverVendedorId({
        nomeVendedor: item.vendedor,
        regionalId,
        periodo: periodoLinha,
        contexto: contextoColaborador
      });
      resumoResolucaoVendedor[resolucaoVendedor.estrategia] = (
        (resumoResolucaoVendedor[resolucaoVendedor.estrategia] || 0) + 1
      );

      if (!resolucaoVendedor.vendedorId) {
        const chaveVendedorNaoEncontrado = normalizarNomePessoa(item.vendedor)
          || `vendedor_nao_informado_${linha}`;
        if (!vendedoresNaoEncontradosMap.has(chaveVendedorNaoEncontrado)) {
          vendedoresNaoEncontradosMap.set(chaveVendedorNaoEncontrado, {
            vendedor: limparTexto(item.vendedor) || '(sem nome no PDF)',
            ocorrencias: 0,
            periodos: new Set(),
            regionais: new Set(),
            clientesExemplo: []
          });
        }
        const infoVendedor = vendedoresNaoEncontradosMap.get(chaveVendedorNaoEncontrado);
        infoVendedor.ocorrencias += 1;
        infoVendedor.periodos.add(periodoLinha);
        infoVendedor.regionais.add(regionalId);
        if (infoVendedor.clientesExemplo.length < 5) {
          infoVendedor.clientesExemplo.push(limparTexto(item.clienteId));
        }

        pendencias.push({
          linha,
          clienteId: item.clienteId,
          cidade,
          vendedor: item.vendedor,
          motivo: resolucaoVendedor.motivo || 'Nao foi possivel resolver vendedor.'
        });
        continue;
      }
      const vendedorId = resolucaoVendedor.vendedorId;

      if (tipoEvento === 'sva') {
        const planoReferencia = limparTexto(contratoCliente?.descricaoServico || item.planoPdf || '');
        const avaliacaoSva = avaliarElegibilidadeSva(planoReferencia);
        if (!avaliacaoSva.elegivel) {
          const motivo = avaliacaoSva.motivo || 'Plano nao elegivel para SVA';
          resumoDescartadasPorRegra.set(
            motivo,
            (resumoDescartadasPorRegra.get(motivo) || 0) + 1
          );

          if (descartadasPorRegra.length < 200) {
            descartadasPorRegra.push({
              linha,
              clienteId: item.clienteId,
              plano: planoReferencia || item.planoPdf || '(sem plano)',
              motivo
            });
          }
          continue;
        }
      }

      if (tipoEvento === 'telefonia') {
        const avaliacaoTelefonia = avaliarElegibilidadeTelefonia([
          { nome: 'contrato.descricao_servico', texto: contratoCliente?.descricaoServico },
          { nome: 'contrato.tipo_produto', texto: contratoCliente?.tipoProduto },
          { nome: 'contrato.tipo_contrato', texto: contratoCliente?.tipoContrato },
          { nome: 'contrato.evidencia', texto: contratoCliente?.evidenciaTelefonia },
          { nome: 'pdf.plano', texto: item.planoPdf },
          { nome: 'pdf.linha', texto: item.linhaOriginal }
        ]);

        const elegivelHistoricoContrato = Boolean(contratoCliente?.temTelefonia);
        if (!avaliacaoTelefonia.elegivel && !elegivelHistoricoContrato && !permitirTelefoniaPorNomeArquivo) {
          const motivo = avaliacaoTelefonia.motivo || 'Sem sinal de telefonia para comissionamento';
          resumoDescartadasPorRegra.set(
            motivo,
            (resumoDescartadasPorRegra.get(motivo) || 0) + 1
          );

          if (descartadasPorRegra.length < 200) {
            descartadasPorRegra.push({
              linha,
              clienteId: item.clienteId,
              plano: item.planoPdf || '(sem plano no PDF)',
              contrato: contratoCliente?.descricaoServico || '(sem descricao de contrato)',
              motivo
            });
          }
          continue;
        }
      }

      const chave = chaveRegistro(periodoLinha, vendedorId, regionalId);
      if (!agregados.has(chave)) {
        agregados.set(chave, {
          periodo: periodoLinha,
          vendedorId,
          regionalId,
          volume: 0,
          financeiro: 0
        });
      }

      const acumulado = agregados.get(chave);
      acumulado.volume += 1;
      acumulado.financeiro += campoFinanceiroPorTipoEvento(tipoEvento, item.valorBase);
    }

    if (!agregados.size) {
      return res.status(400).json({
        erro: 'Nenhuma linha do PDF foi elegivel para importacao.',
        linhasLidas: linhasPdf.length,
        pendencias: pendencias.slice(0, 200),
        resumoResolucaoVendedor,
        totalVendedoresNaoEncontrados: vendedoresNaoEncontradosMap.size,
        vendedoresNaoEncontrados: Array.from(vendedoresNaoEncontradosMap.values()).map((item) => ({
          vendedor: item.vendedor,
          ocorrencias: item.ocorrencias,
          periodos: Array.from(item.periodos),
          regionais: Array.from(item.regionais),
          clientesExemplo: item.clientesExemplo
        })),
        descartadasPorRegra: descartadasPorRegra.slice(0, 200),
        resumoDescartesRegra: Array.from(resumoDescartadasPorRegra.entries()).map(([motivo, total]) => ({
          motivo,
          total
        }))
      });
    }

    const periodosImportados = Array.from(
      new Set(Array.from(agregados.values()).map((item) => item.periodo))
    );

    if (sobrescreverTipoNoPeriodo) {
      for (const periodo of periodosImportados) {
        await VendasMensais.zerarCamposPorPeriodo(periodo, [
          definicaoEvento.colunaVolume,
          definicaoEvento.colunaFinanceiro
        ]);
      }
    }

    const existentesMap = new Map();
    for (const periodo of periodosImportados) {
      const existentes = await VendasMensais.listarPorPeriodo(periodo);
      (existentes || []).forEach((registro) => {
        existentesMap.set(
          chaveRegistro(registro.periodo, registro.vendedor_id, registro.regional_id),
          registro
        );
      });
    }

    let criados = 0;
    let atualizados = 0;
    for (const agregado of agregados.values()) {
      const chave = chaveRegistro(agregado.periodo, agregado.vendedorId, agregado.regionalId);
      const existente = existentesMap.get(chave);

      if (existente?.id) {
        const dadosAtualizados = linhaBancoParaDados(existente);
        dadosAtualizados[definicaoEvento.campoVolume] = agregado.volume;
        dadosAtualizados[definicaoEvento.campoFinanceiro] = Number(agregado.financeiro.toFixed(2));
        await VendasMensais.atualizar(existente.id, dadosAtualizados);
        atualizados += 1;
        continue;
      }

      const novo = criarRegistroZerado(agregado.periodo, agregado.vendedorId, agregado.regionalId);
      novo[definicaoEvento.campoVolume] = agregado.volume;
      novo[definicaoEvento.campoFinanceiro] = Number(agregado.financeiro.toFixed(2));
      const novoId = await VendasMensais.criar(novo);
      existentesMap.set(chave, { id: novoId, ...novo });
      criados += 1;
    }

    const resumoRegionalMap = new Map();
    for (const agregado of agregados.values()) {
      const chaveRegional = agregado.regionalId;
      if (!resumoRegionalMap.has(chaveRegional)) {
        resumoRegionalMap.set(chaveRegional, {
          regionalId: chaveRegional,
          volume: 0,
          financeiro: 0
        });
      }
      const resumo = resumoRegionalMap.get(chaveRegional);
      resumo.volume += agregado.volume;
      resumo.financeiro += agregado.financeiro;
    }

    return res.json({
      mensagem: `Importacao PDF concluida para ${tipoEvento}: ${agregados.size} agrupamento(s), ${criados} criado(s), ${atualizados} atualizado(s).`,
      tipoEvento,
      periodoPadrao: periodoPadrao || null,
      sobrescreverTipoNoPeriodo,
      linhasLidas: linhasPdf.length,
      linhasImportadas: Array.from(agregados.values()).reduce((acc, item) => acc + item.volume, 0),
      agrupamentosImportados: agregados.size,
      criados,
      atualizados,
      periodosImportados,
      pendencias: pendencias.slice(0, 200),
      totalPendencias: pendencias.length,
      resumoResolucaoVendedor,
      totalVendedoresNaoEncontrados: vendedoresNaoEncontradosMap.size,
      vendedoresNaoEncontrados: Array.from(vendedoresNaoEncontradosMap.values()).map((item) => ({
        vendedor: item.vendedor,
        ocorrencias: item.ocorrencias,
        periodos: Array.from(item.periodos),
        regionais: Array.from(item.regionais),
        clientesExemplo: item.clientesExemplo
      })),
      descartadasPorRegra: descartadasPorRegra.slice(0, 200),
      totalDescartadasPorRegra: Array.from(resumoDescartadasPorRegra.values())
        .reduce((acc, valor) => acc + Number(valor || 0), 0),
      resumoDescartesRegra: Array.from(resumoDescartadasPorRegra.entries()).map(([motivo, total]) => ({
        motivo,
        total
      })),
      resumoPorRegional: Array.from(resumoRegionalMap.values()).map((item) => ({
        regionalId: item.regionalId,
        volume: item.volume,
        financeiro: Number(item.financeiro.toFixed(2))
      }))
    });
  } catch (erro) {
    console.error('Erro ao importar PDF de vendas mensais:', erro);
    return res.status(500).json({ erro: 'Erro ao importar PDF de vendas mensais' });
  } finally {
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
};
