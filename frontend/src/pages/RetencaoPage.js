import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  ReferenceLine
} from 'recharts';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import { retencaoAPI } from '../services/api';
import '../styles/RetencaoPage.css';

const TIPOS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'cobrancas_inadimplentes', label: 'Cobrancas/Inadimplentes' },
  { value: 'cancelamentos_reversoes', label: 'Cancelamentos/Reversoes' }
];

const ESCOPOS_TIME = [
  { value: '', label: 'Todos os times' },
  { value: 'matriz', label: 'Time Matriz (CRM)' },
  { value: 'regional', label: 'Times Regionais (Base Empresa)' }
];

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

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

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const pickDisplayLabel = (atual = '', proximo = '') => {
  const a = String(atual || '').trim();
  const b = String(proximo || '').trim();
  if (!a) return b;
  if (!b) return a;

  const score = (texto) => {
    const t = String(texto || '').trim();
    let pontos = 0;
    if (/[a-z]/.test(t) && /[A-Z]/.test(t)) pontos += 3;
    if (!/^[A-Z0-9\s\-_/.'"]+$/.test(t)) pontos += 2;
    if (t.length > 8) pontos += 1;
    return pontos;
  };

  return score(b) > score(a) ? b : a;
};

const prioridadeOrigem = (origem) => {
  const n = normalizeValue(origem);
  if (n.includes('[crm_matriz]') || n.includes('crm prototipo retencao')) return 3;
  if (n.includes('[base_empresa]')) return 2;
  return 1;
};

const chaveDedupeRegistro = (registro = {}) => {
  const data = normalizeValue(registro.data_atendimento || registro.dataAtendimento);
  const contrato = normalizeValue(registro.contrato_id || registro.contratoId);
  const cliente = normalizeValue(registro.cliente_id || registro.clienteId);
  const atendente = normalizeValue(registro.atendente);
  const tipo = normalizeValue(registro.tipo_registro || registro.tipoRegistro);

  if (data && contrato && atendente) return `dca|${data}|${contrato}|${atendente}|${tipo}`;
  if (data && cliente && atendente) return `dcl|${data}|${cliente}|${atendente}|${tipo}`;

  const id = normalizeValue(registro.id);
  if (id) return `id|${id}`;

  return `fallback|${data}|${cliente}|${atendente}|${normalizeValue(registro.motivo)}|${tipo}`;
};

const scoreRegistro = (registro = {}) => {
  const origem = prioridadeOrigem(registro.origem_arquivo || registro.origemArquivo);
  const retido = isRetido(registro.resultado_tratativa || registro.resultadoTratativa) ? 2 : 0;
  const resultado = normalizeValue(registro.resultado_tratativa || registro.resultadoTratativa) ? 1 : 0;
  const historico = normalizeValue(registro.historico) ? 1 : 0;
  return origem + retido + resultado + historico;
};

const deduplicarRegistros = (registros = []) => {
  const mapa = new Map();
  (registros || []).forEach((registro) => {
    const chave = chaveDedupeRegistro(registro);
    const existente = mapa.get(chave);
    if (!existente) {
      mapa.set(chave, registro);
      return;
    }

    if (scoreRegistro(registro) > scoreRegistro(existente)) {
      mapa.set(chave, registro);
    }
  });
  return Array.from(mapa.values());
};

const montarLegendaIndexada = (lista = [], campo, prefixo, campoValor = 'total') => {
  const itens = (lista || []).map((item, idx) => ({
    ...item,
    indice: `${prefixo}${idx + 1}`
  }));
  const mapa = itens.map((item) => ({
    indice: item.indice,
    texto: String(item[campo] || ''),
    valor: Number(item[campoValor] || 0)
  }));
  return { itens, mapa };
};

const isRetido = (resultado) => {
  const text = normalizeValue(resultado);
  return text.includes('revers') || text.includes('titular');
};

const isCancelamento = (resultado) => {
  const texto = normalizeValue(resultado);
  return texto.includes('cancel') || texto.includes('desist');
};
const isRegistroTeste = (registro = {}) => {
  const campos = [
    registro.atendente,
    registro.nome_completo,
    registro.nomeCompleto,
    registro.motivo,
    registro.resultado_tratativa,
    registro.resultadoTratativa
  ]
    .map((v) => normalizeValue(v))
    .filter(Boolean);

  return campos.some((texto) => texto.includes('teste'));
};

const COLORS = {
  tentativas: '#2563eb',
  retidos: '#16a34a',
  cancelamentos: '#dc2626',
  total: '#0ea5e9',
  muted: '#93c5fd'
};

const isCobrancaInadimplente = (registro = {}) =>
  normalizeValue(registro.tipo_registro || registro.tipoRegistro) === 'cobrancas_inadimplentes';

const classificarDesfechoCobranca = (registro = {}) => {
  const resultado = normalizeValue(registro.resultado_tratativa || registro.resultadoTratativa);
  const aceitouAcordo = Number(registro.cliente_aceitou_acordo) === 1 || resultado.includes('acordo');

  if (resultado.includes('pagamento') || resultado.includes('quit')) return 'Pagamento';
  if (aceitouAcordo) return 'Acordo';
  if (resultado.includes('desist')) return 'Cancelamento';
  if (resultado.includes('cancel')) return 'Cancelamento';
  if (resultado.includes('revers') || resultado.includes('retid')) return 'Retido';
  if (!resultado || resultado.includes('resultado da tratativa')) return 'Sem desfecho';
  return 'Outros';
};

const calcularAnalyticsCobranca = (registros = []) => {
  const cobrancas = (registros || []).filter(isCobrancaInadimplente);
  const totalCobrancas = cobrancas.length;
  const desfechoMap = new Map();
  const filialMap = new Map();
  const atendenteMap = new Map();

  let totalReincidentes = 0;
  let totalAcordosFormais = 0;

  cobrancas.forEach((r) => {
    const desfecho = classificarDesfechoCobranca(r);
    const recuperado = desfecho === 'Pagamento' || desfecho === 'Acordo' || desfecho === 'Retido';
    const cancelado = desfecho === 'Cancelamento';
    const semDesfecho = desfecho === 'Sem desfecho';
    const filialLabel = String(r.filial || '').trim() || 'Sem regional';
    const filialKey = normalizeValue(filialLabel) || 'sem regional';
    const atendenteLabel = String(r.atendente || '').trim() || 'Sem atendente';
    const atendenteKey = normalizeValue(atendenteLabel) || 'sem atendente';
    const qtdChamados = Number(r.qtd_chamados || 0);
    const houveAnterior = Number(r.houve_chamado_anterior) === 1;
    const acordoFormal = Number(r.cliente_aceitou_acordo) === 1 || normalizeValue(r.resultado_tratativa).includes('acordo');

    desfechoMap.set(desfecho, (desfechoMap.get(desfecho) || 0) + 1);
    if (houveAnterior || qtdChamados > 1) totalReincidentes += 1;
    if (acordoFormal) totalAcordosFormais += 1;

    if (!filialMap.has(filialKey)) {
      filialMap.set(filialKey, { filial: filialLabel, total: 0, recuperados: 0, cancelados: 0, semDesfecho: 0 });
    }
    const f = filialMap.get(filialKey);
    f.filial = pickDisplayLabel(f.filial, filialLabel);
    f.total += 1;
    if (recuperado) f.recuperados += 1;
    if (cancelado) f.cancelados += 1;
    if (semDesfecho) f.semDesfecho += 1;

    if (!atendenteMap.has(atendenteKey)) {
      atendenteMap.set(atendenteKey, { atendente: atendenteLabel, total: 0, recuperados: 0, cancelados: 0, semDesfecho: 0 });
    }
    const a = atendenteMap.get(atendenteKey);
    a.atendente = pickDisplayLabel(a.atendente, atendenteLabel);
    a.total += 1;
    if (recuperado) a.recuperados += 1;
    if (cancelado) a.cancelados += 1;
    if (semDesfecho) a.semDesfecho += 1;
  });

  const getDesfecho = (nome) => desfechoMap.get(nome) || 0;
  const totalRecuperados = getDesfecho('Pagamento') + getDesfecho('Acordo') + getDesfecho('Retido');
  const totalCancelados = getDesfecho('Cancelamento');
  const totalSemDesfecho = getDesfecho('Sem desfecho');

  const taxaRecuperacao = totalCobrancas ? (totalRecuperados / totalCobrancas) * 100 : 0;
  const taxaPerda = totalCobrancas ? (totalCancelados / totalCobrancas) * 100 : 0;
  const taxaSemDesfecho = totalCobrancas ? (totalSemDesfecho / totalCobrancas) * 100 : 0;
  const taxaReincidencia = totalCobrancas ? (totalReincidentes / totalCobrancas) * 100 : 0;
  const taxaAcordoFormal = totalCobrancas ? (totalAcordosFormais / totalCobrancas) * 100 : 0;

  const desfechosOrdenados = ['Pagamento', 'Acordo', 'Retido', 'Cancelamento', 'Sem desfecho', 'Outros']
    .map((desfecho) => ({ desfecho, total: getDesfecho(desfecho) }))
    .filter((item) => item.total > 0);

  const riscoPorFilial = Array.from(filialMap.values())
    .map((item) => ({
      ...item,
      taxaRecuperacao: item.total ? (item.recuperados / item.total) * 100 : 0,
      taxaRisco: item.total ? ((item.cancelados + item.semDesfecho) / item.total) * 100 : 0
    }))
    .sort((a, b) => b.taxaRisco - a.taxaRisco || b.total - a.total)
    .slice(0, 10);

  const eficienciaAtendentes = Array.from(atendenteMap.values())
    .map((item) => ({
      ...item,
      taxaRecuperacao: item.total ? (item.recuperados / item.total) * 100 : 0,
      taxaRisco: item.total ? ((item.cancelados + item.semDesfecho) / item.total) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const mediaRecuperacao = eficienciaAtendentes.length
    ? eficienciaAtendentes.reduce((acc, item) => acc + item.taxaRecuperacao, 0) / eficienciaAtendentes.length
    : 0;

  const oportunidades = [];
  if (totalCobrancas === 0) {
    oportunidades.push('Sem dados de cobranca/inadimplencia para os filtros aplicados.');
  } else {
    if (taxaSemDesfecho >= 20) {
      oportunidades.push(`Taxa alta de casos sem desfecho (${taxaSemDesfecho.toFixed(1)}%). Priorizar fechamento da tratativa no mesmo dia.`);
    }
    if (taxaPerda >= 10) {
      oportunidades.push(`Taxa de perda elevada (${taxaPerda.toFixed(1)}%). Reforcar script preventivo antes do cancelamento.`);
    }
    const filialCritica = riscoPorFilial.find((f) => f.total >= 3 && f.taxaRisco >= 50);
    if (filialCritica) {
      oportunidades.push(`Regional critica: ${filialCritica.filial} com risco ${filialCritica.taxaRisco.toFixed(1)}% em ${filialCritica.total} casos.`);
    }
    const atendenteAbaixo = eficienciaAtendentes.find((a) => a.total >= 4 && a.taxaRecuperacao < mediaRecuperacao * 0.7);
    if (atendenteAbaixo) {
      oportunidades.push(`Treinamento recomendado: ${atendenteAbaixo.atendente} com recuperacao de ${atendenteAbaixo.taxaRecuperacao.toFixed(1)}%.`);
    }
    if (!oportunidades.length) {
      oportunidades.push('Cenario estavel para cobranca/inadimplencia nos filtros atuais. Mantener rotina de monitoramento diario.');
    }
  }

  return {
    kpis: {
      totalCobrancas,
      totalRecuperados,
      totalCancelados,
      totalSemDesfecho,
      totalReincidentes,
      totalAcordosFormais,
      taxaRecuperacao,
      taxaPerda,
      taxaSemDesfecho,
      taxaReincidencia,
      taxaAcordoFormal
    },
    graficos: {
      desfechos: desfechosOrdenados,
      riscoPorFilial,
      eficienciaAtendentes
    },
    oportunidades
  };
};

const calcularAnalytics = (registros = []) => {
  const totalTentativas = registros.length;
  const totalRetidos = registros.filter((r) => isRetido(r.resultado_tratativa)).length;
  const totalCancelamentos = registros.filter((r) => isCancelamento(r.resultado_tratativa)).length;
  const totalTitularidade = registros.filter((r) => normalizeValue(r.resultado_tratativa).includes('titular')).length;
  const totalAcordos = registros.filter((r) => Number(r.cliente_aceitou_acordo) === 1).length;
  const atendentesUnicos = new Set(registros.map((r) => normalizeValue(r.atendente)).filter(Boolean)).size;
  const diasComDados = new Set(registros.map((r) => normalizeValue(r.data_atendimento)).filter(Boolean)).size;

  const timelineMap = new Map();
  const motivosMap = new Map();
  const atendenteMap = new Map();

  registros.forEach((r) => {
    const data = String(r.data_atendimento || '').trim() || 'sem_data';
    const motivoLabel = String(r.motivo || '').trim() || 'Sem motivo';
    const motivoKey = normalizeValue(motivoLabel) || 'sem motivo';
    const atendenteLabel = String(r.atendente || '').trim() || 'Sem atendente';
    const atendenteKey = normalizeValue(atendenteLabel) || 'sem atendente';
    const retido = isRetido(r.resultado_tratativa);
    const cancelado = isCancelamento(r.resultado_tratativa);

    if (!timelineMap.has(data)) {
      timelineMap.set(data, { data, tentativas: 0, retidos: 0, cancelamentos: 0 });
    }
    const t = timelineMap.get(data);
    t.tentativas += 1;
    if (retido) t.retidos += 1;
    if (cancelado) t.cancelamentos += 1;

    if (!motivosMap.has(motivoKey)) {
      motivosMap.set(motivoKey, { motivo: motivoLabel, total: 0 });
    }
    const m = motivosMap.get(motivoKey);
    m.motivo = pickDisplayLabel(m.motivo, motivoLabel);
    m.total += 1;

    if (!atendenteMap.has(atendenteKey)) {
      atendenteMap.set(atendenteKey, {
        atendente: atendenteLabel,
        tentativas: 0,
        retidos: 0,
        cancelamentos: 0,
        taxaRetencao: 0
      });
    }
    const a = atendenteMap.get(atendenteKey);
    a.atendente = pickDisplayLabel(a.atendente, atendenteLabel);
    a.tentativas += 1;
    if (retido) a.retidos += 1;
    if (cancelado) a.cancelamentos += 1;
  });

  return {
    kpis: {
      totalTentativas,
      totalRetidos,
      totalCancelamentos,
      totalTitularidade,
      totalAcordos,
      atendentesUnicos,
      diasComDados,
      produtividadeDia: diasComDados ? totalTentativas / diasComDados : 0,
      produtividadeColaborador: (atendentesUnicos && diasComDados)
        ? totalTentativas / atendentesUnicos / diasComDados
        : 0,
      taxaRetencao: totalTentativas ? (totalRetidos / totalTentativas) * 100 : 0,
      taxaCancelamento: totalTentativas ? (totalCancelamentos / totalTentativas) * 100 : 0,
      taxaAcordo: totalTentativas ? (totalAcordos / totalTentativas) * 100 : 0
    },
    graficos: {
      timeline: Array.from(timelineMap.values()).sort((a, b) => a.data.localeCompare(b.data)),
      topMotivos: Array.from(motivosMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      performanceAtendentes: Array.from(atendenteMap.values())
        .map((a) => ({
          ...a,
          taxaRetencao: a.tentativas ? (a.retidos / a.tentativas) * 100 : 0
        }))
        .sort((a, b) => b.tentativas - a.tentativas)
        .slice(0, 12)
    }
  };
};

const classificarQualidadeAmostra = (tentativas = 0) => {
  if (tentativas >= 30) return 'Alta';
  if (tentativas >= 10) return 'Media';
  return 'Baixa';
};

const escolherOrigemMatriz = (origens = [], origemSelecionada = '') => {
  const lista = Array.isArray(origens) ? origens.filter(Boolean) : [];
  if (!lista.length) return '';

  const selecionada = normalize(origemSelecionada);
  if (selecionada) {
    const match = lista.find((item) => normalize(item) === selecionada);
    if (match) return match;
  }

  const prioridade = [
    'crm retencao',
    'time de retencao',
    'time retencao',
    'matriz',
    'retencao'
  ];

  for (const termo of prioridade) {
    const match = lista.find((item) => normalize(item).includes(termo));
    if (match) return match;
  }

  return lista[0];
};

const abreviarRegional = (regional = '', max = 26) => {
  const texto = String(regional || '').replace(/^UNI\s*-\s*/i, '').trim();
  if (!texto) return '-';
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max - 1)}...`;
};

const calcularBenchmarkMatrizRegionais = (registros = [], matrizFilialSelecionada = '', matrizOrigemSelecionada = '') => {
  const vazio = {
    filiaisDisponiveis: [],
    regionaisDisponiveis: [],
    origensDisponiveis: [],
    origemMatriz: '',
    matrizRegional: '',
    matrizFilial: '',
    kpis: {
      totalTentativas: 0,
      taxaGeral: 0,
      matrizTaxa: 0,
      regionaisTaxa: 0,
      gapPP: 0,
      coberturaRegionais: 0,
      amplitudeRegional: 0
    },
    insights: ['Sem dados para benchmark com os filtros atuais.'],
    graficos: {
      taxaPorRegional: [],
      deltaPorRegional: []
    },
    tabelaComparativa: []
  };

  if (!Array.isArray(registros) || !registros.length) return vazio;

  const origensDisponiveis = Array.from(new Set((registros || []).map((r) => String(r.origem_arquivo || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  const origemMatriz = escolherOrigemMatriz(origensDisponiveis, matrizOrigemSelecionada);
  const origemMatrizNormalizada = normalize(origemMatriz);

  const registrosMatriz = origemMatriz
    ? registros.filter((registro) => normalize(registro.origem_arquivo) === origemMatrizNormalizada)
    : registros;

  const registrosRegionaisBase = origemMatriz
    ? registros.filter((registro) => normalize(registro.origem_arquivo) !== origemMatrizNormalizada)
    : registros;

  const mapaFilial = new Map();
  registrosRegionaisBase.forEach((registro) => {
    const filial = String(registro.filial || '').trim() || 'Sem regional';
    const chave = normalize(filial);
    if (!mapaFilial.has(chave)) {
      mapaFilial.set(chave, {
        chave,
        regional: filial,
        filial,
        tentativas: 0,
        retidos: 0,
        cancelados: 0
      });
    }
    const item = mapaFilial.get(chave);
    item.tentativas += 1;
    if (isRetido(registro.resultado_tratativa)) item.retidos += 1;
    if (isCancelamento(registro.resultado_tratativa)) item.cancelados += 1;
  });

  const filiais = Array.from(mapaFilial.values()).map((item) => ({
    ...item,
    taxaRetencao: item.tentativas ? (item.retidos / item.tentativas) * 100 : 0,
    taxaCancelamento: item.tentativas ? (item.cancelados / item.tentativas) * 100 : 0
  }));

  if (!filiais.length) return vazio;

  let matriz;
  if (origemMatriz) {
    const baseMatriz = registrosMatriz;
    const tentativas = baseMatriz.length;
    const retidos = baseMatriz.reduce((acc, registro) => acc + (isRetido(registro.resultado_tratativa) ? 1 : 0), 0);
    const cancelados = baseMatriz.reduce((acc, registro) => acc + (isCancelamento(registro.resultado_tratativa) ? 1 : 0), 0);
    matriz = {
      chave: '__time_retencao_matriz__',
      regional: 'TIME DE RETENCAO',
      filial: 'TIME DE RETENCAO',
      tentativas,
      retidos,
      cancelados,
      taxaRetencao: tentativas ? (retidos / tentativas) * 100 : 0,
      taxaCancelamento: tentativas ? (cancelados / tentativas) * 100 : 0
    };
  } else {
    const chaveSelecionada = normalize(matrizFilialSelecionada);
    matriz = filiais.find((item) => item.chave === chaveSelecionada);
    if (!matriz) matriz = filiais.find((item) => item.chave.includes('matriz'));
    if (!matriz) matriz = filiais.find((item) => item.chave.includes('ji parana'));
    if (!matriz) matriz = [...filiais].sort((a, b) => b.tentativas - a.tentativas)[0] || {
      chave: '__sem_matriz__',
      regional: 'SEM MATRIZ',
      filial: 'SEM MATRIZ',
      tentativas: 0,
      retidos: 0,
      cancelados: 0,
      taxaRetencao: 0,
      taxaCancelamento: 0
    };
  }

  const regionais = origemMatriz ? filiais : filiais.filter((item) => item.chave !== matriz.chave);

  const totalRegionais = regionais.reduce((acc, item) => ({
    tentativas: acc.tentativas + item.tentativas,
    retidos: acc.retidos + item.retidos
  }), { tentativas: 0, retidos: 0 });

  const totalTentativasSemOrigemMatriz = filiais.reduce((acc, item) => acc + item.tentativas, 0);
  const totalRetidosSemOrigemMatriz = filiais.reduce((acc, item) => acc + item.retidos, 0);
  const totalTentativas = origemMatriz ? (matriz.tentativas + totalRegionais.tentativas) : totalTentativasSemOrigemMatriz;
  const totalRetidos = origemMatriz ? (matriz.retidos + totalRegionais.retidos) : totalRetidosSemOrigemMatriz;

  const matrizTaxa = matriz.taxaRetencao || 0;
  const regionaisTaxa = totalRegionais.tentativas ? (totalRegionais.retidos / totalRegionais.tentativas) * 100 : 0;
  const gapPP = regionaisTaxa - matrizTaxa;

  const regionaisComVolume = regionais.filter((item) => item.tentativas >= 10);
  const baseRanking = regionaisComVolume.length ? regionaisComVolume : regionais;
  const melhorRegional = [...baseRanking].sort((a, b) => b.taxaRetencao - a.taxaRetencao || b.tentativas - a.tentativas)[0] || null;
  const piorRegional = [...baseRanking].sort((a, b) => a.taxaRetencao - b.taxaRetencao || b.tentativas - a.tentativas)[0] || null;

  const maxRegional = regionais.length ? Math.max(...regionais.map((item) => item.taxaRetencao)) : 0;
  const minRegional = regionais.length ? Math.min(...regionais.map((item) => item.taxaRetencao)) : 0;
  const amplitudeRegional = regionais.length ? (maxRegional - minRegional) : 0;
  const baseCobertura = origemMatriz ? totalTentativas : totalTentativasSemOrigemMatriz;
  const coberturaRegionais = baseCobertura ? (totalRegionais.tentativas / baseCobertura) * 100 : 0;

  const tabelaComparativa = [
    {
      tipo: 'Matriz',
      regional: matriz.regional,
      filial: matriz.filial,
      tentativas: matriz.tentativas,
      retidos: matriz.retidos,
      taxaRetencao: matriz.taxaRetencao,
      deltaPP: 0,
      indiceVsMatriz: 100,
      qualidadeAmostra: classificarQualidadeAmostra(matriz.tentativas)
    },
    ...regionais
      .map((item) => ({
        tipo: 'Regional',
        regional: item.regional,
        filial: item.filial,
        tentativas: item.tentativas,
        retidos: item.retidos,
        taxaRetencao: item.taxaRetencao,
        deltaPP: item.taxaRetencao - matrizTaxa,
        indiceVsMatriz: matrizTaxa ? (item.taxaRetencao / matrizTaxa) * 100 : 0,
        qualidadeAmostra: classificarQualidadeAmostra(item.tentativas)
      }))
      .sort((a, b) => b.taxaRetencao - a.taxaRetencao || b.tentativas - a.tentativas)
  ];

  const taxaPorRegional = [...(origemMatriz ? regionais : filiais)]
    .sort((a, b) => b.tentativas - a.tentativas)
    .slice(0, 12)
    .map((item) => ({
      regional: item.regional,
      filial: item.filial,
      regionalCurta: abreviarRegional(item.regional),
      tentativas: item.tentativas,
      taxaRetencao: item.taxaRetencao,
      taxaMatriz: matrizTaxa
    }));

  const deltaPorRegional = taxaPorRegional.map((item) => {
    const deltaPP = item.taxaRetencao - matrizTaxa;
    return {
      ...item,
      deltaPP,
      deltaPositivo: deltaPP > 0 ? deltaPP : 0,
      deltaNegativo: deltaPP < 0 ? deltaPP : 0
    };
  });

  const insights = [];
  if (melhorRegional) {
    insights.push(`Melhor regional: ${melhorRegional.regional} com ${melhorRegional.taxaRetencao.toFixed(2)}% de retencao.`);
  }
  if (piorRegional) {
    insights.push(`Ponto de atencao: ${piorRegional.regional} com ${piorRegional.taxaRetencao.toFixed(2)}% de retencao.`);
  }
  if (gapPP >= 3) {
    insights.push(`Regionais acima da matriz em ${gapPP.toFixed(2)} p.p. Priorizar replicacao de boas praticas da melhor regional.`);
  } else if (gapPP <= -3) {
    insights.push(`Regionais abaixo da matriz em ${Math.abs(gapPP).toFixed(2)} p.p. Reforcar coaching operacional nas regionais abaixo da media.`);
  }
  const baixaAmostra = regionais.filter((item) => item.tentativas < 10).length;
  if (baixaAmostra > 0) {
    insights.push(`${baixaAmostra} regional(is) com amostra baixa (<10 casos). Interpretar taxa com cautela.`);
  }
  if (!insights.length) {
    insights.push('Benchmark equilibrado entre matriz e regionais nos filtros atuais.');
  }

  return {
    filiaisDisponiveis: filiais.map((item) => item.regional).sort((a, b) => a.localeCompare(b)),
    regionaisDisponiveis: filiais.map((item) => item.regional).sort((a, b) => a.localeCompare(b)),
    origensDisponiveis,
    origemMatriz,
    matrizRegional: matriz.regional,
    matrizFilial: matriz.filial,
    kpis: {
      totalTentativas,
      taxaGeral: totalTentativas ? (totalRetidos / totalTentativas) * 100 : 0,
      matrizTaxa,
      regionaisTaxa,
      gapPP,
      coberturaRegionais,
      amplitudeRegional
    },
    insights,
    graficos: {
      taxaPorRegional,
      deltaPorRegional
    },
    tabelaComparativa
  };
};

const CATEGORIAS_DESCRICAO = [
  {
    nome: 'Mudanca de endereco/cidade',
    termos: [
      'mudanca de endereco',
      'mudou de endereco',
      'mudanca de cidade',
      'mudou de cidade',
      'mudou de local',
      'mudou para',
      'mudou-se',
      'mudanca de bairro',
      'mudou de bairro'
    ]
  },
  {
    nome: 'Qualidade tecnica/suporte',
    termos: [
      'instabil',
      'oscil',
      'lent',
      'sem sinal',
      'suporte',
      'tecnic',
      'queda',
      'qualidade',
      'rompimento'
    ]
  },
  {
    nome: 'Financeiro/preco',
    termos: [
      'financeir',
      'valor',
      'preco',
      'mensalidade',
      'caro',
      'desempreg',
      'sem condic',
      'sem renda',
      'inadimpl'
    ]
  },
  {
    nome: 'Concorrencia/oferta',
    termos: [
      'concorr',
      'outra operadora',
      'outro provedor',
      'promoc',
      'oferta',
      'plano melhor',
      'desconto'
    ]
  },
  {
    nome: 'Mudanca sem viabilidade/cobertura',
    termos: [
      'sem viabilidade',
      'sem cobertura',
      'fora da area',
      'nao atende',
      'sem disponibilidade'
    ]
  },
  {
    nome: 'Encerramento de atividade',
    termos: [
      'encerrou atividade',
      'fechou empresa',
      'cancelou cnpj',
      'faliu',
      'encerramento'
    ]
  },
  {
    nome: 'Questao pessoal/saude',
    termos: [
      'saude',
      'doenc',
      'interna',
      'falec',
      'problema pessoal'
    ]
  },
  {
    nome: 'Sem uso no local',
    termos: [
      'nao mora',
      'nao reside',
      'imovel vazio',
      'casa vazia',
      'sem uso',
      'nao usa'
    ]
  }
];

const classificarCategoriaDescricao = (descricao = '') => {
  const texto = normalize(descricao);
  if (!texto) return 'Sem descricao';

  for (const categoria of CATEGORIAS_DESCRICAO) {
    if ((categoria.termos || []).some((termo) => texto.includes(termo))) {
      return categoria.nome;
    }
  }

  return 'Outros';
};

const calcularAnaliseDescricao = (registros = []) => {
  const totalRegistros = (registros || []).length;
  const mapa = new Map();
  let totalComDescricao = 0;
  let retidosComDescricao = 0;

  (registros || []).forEach((registro) => {
    const descricao = String(registro.historico || '').trim();
    const temDescricao = Boolean(normalize(descricao));
    const categoria = classificarCategoriaDescricao(descricao);
    const retido = isRetido(registro.resultado_tratativa);

    if (temDescricao) {
      totalComDescricao += 1;
      if (retido) retidosComDescricao += 1;
    }

    if (!mapa.has(categoria)) {
      mapa.set(categoria, {
        categoria,
        total: 0,
        retidos: 0
      });
    }
    const item = mapa.get(categoria);
    item.total += 1;
    if (retido) item.retidos += 1;
  });

  const totalSemDescricao = totalRegistros - totalComDescricao;

  const tabela = Array.from(mapa.values())
    .map((item) => ({
      ...item,
      percentualBase: totalRegistros ? (item.total / totalRegistros) * 100 : 0,
      percentualDescricoes: (item.categoria !== 'Sem descricao' && totalComDescricao)
        ? (item.total / totalComDescricao) * 100
        : 0,
      taxaRetencao: item.total ? (item.retidos / item.total) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  const categoriasComDescricao = tabela.filter((item) => item.categoria !== 'Sem descricao');
  const topCategoria = categoriasComDescricao[0] || null;

  return {
    kpis: {
      totalRegistros,
      totalComDescricao,
      totalSemDescricao,
      coberturaDescricao: totalRegistros ? (totalComDescricao / totalRegistros) * 100 : 0,
      categoriasMapeadas: categoriasComDescricao.length,
      topCategoria: topCategoria?.categoria || '-',
      topCategoriaPercentual: topCategoria ? topCategoria.percentualDescricoes : 0,
      taxaRetencaoComDescricao: totalComDescricao ? (retidosComDescricao / totalComDescricao) * 100 : 0
    },
    grafico: tabela.slice(0, 10),
    tabela
  };
};

const classificarDesfechoQualidade = (resultado = '') => {
  const r = normalizeValue(resultado);
  if (!r) return 'sem_desfecho';
  if (r.includes('revers') || r.includes('titular')) return 'retido';
  if (r.includes('desist')) return 'cancelamento';
  if (r.includes('cancel')) return 'cancelamento';
  if (r.includes('acordo')) return 'acordo';
  if (r.includes('pagament') || r.includes('quit')) return 'pagamento';
  return 'ambiguo';
};

const calcularQualidadeDados = (registros = []) => {
  const total = (registros || []).length;
  let semHistorico = 0;
  let semMotivo = 0;
  let semDesfecho = 0;
  let desfechosReconhecidos = 0;
  let desfechosAmbiguos = 0;
  const dist = new Map();

  (registros || []).forEach((registro) => {
    const historico = normalizeValue(registro.historico);
    const motivo = normalizeValue(registro.motivo);
    const classe = classificarDesfechoQualidade(registro.resultado_tratativa);

    if (!historico) semHistorico += 1;
    if (!motivo) semMotivo += 1;
    if (classe === 'sem_desfecho') semDesfecho += 1;
    if (classe === 'ambiguo') desfechosAmbiguos += 1;
    else if (classe !== 'sem_desfecho') desfechosReconhecidos += 1;

    dist.set(classe, (dist.get(classe) || 0) + 1);
  });

  const percentual = (valor) => (total ? (valor / total) * 100 : 0);
  const graficos = [
    { tipo: 'Retido', total: dist.get('retido') || 0 },
    { tipo: 'Cancelamento', total: dist.get('cancelamento') || 0 },
    { tipo: 'Acordo', total: dist.get('acordo') || 0 },
    { tipo: 'Pagamento', total: dist.get('pagamento') || 0 },
    { tipo: 'Ambiguo', total: dist.get('ambiguo') || 0 },
    { tipo: 'Sem desfecho', total: dist.get('sem_desfecho') || 0 }
  ];

  const insights = [];
  if (percentual(desfechosAmbiguos + semDesfecho) > 20) {
    insights.push('Qualidade de desfecho abaixo do ideal. Padronize "resultado da tratativa" para reduzir ambiguidades.');
  }
  if (percentual(semHistorico) > 30) {
    insights.push('Cobertura de historico baixa. Exigir descricao minima melhora a analise de causas.');
  }
  if (percentual(semMotivo) > 15) {
    insights.push('Motivo ausente em parte relevante dos registros. Recomenda-se tornar o campo obrigatorio.');
  }
  if (!insights.length) {
    insights.push('Qualidade de dado adequada para leitura gerencial no recorte atual.');
  }

  return {
    kpis: {
      total,
      semHistorico,
      semMotivo,
      semDesfecho,
      desfechosReconhecidos,
      desfechosAmbiguos,
      coberturaHistorico: percentual(total - semHistorico),
      coberturaMotivo: percentual(total - semMotivo),
      coberturaDesfechoReconhecido: percentual(desfechosReconhecidos),
      ambiguidadeDesfecho: percentual(desfechosAmbiguos + semDesfecho)
    },
    graficos,
    insights
  };
};

const formatarResumoQualidadeImportacao = (qualidade = {}) => {
  if (!qualidade || !Number.isFinite(Number(qualidade.totalValidos))) return '';
  const total = Number(qualidade.totalValidos || 0);
  const reconhecido = Number(qualidade.reconhecimentoPercent || 0).toFixed(2);
  const ambiguo = Number(qualidade.ambiguoPercent || 0).toFixed(2);
  const hist = Number(qualidade.coberturaHistoricoPercent || 0).toFixed(2);
  const motivo = Number(qualidade.coberturaMotivoPercent || 0).toFixed(2);
  return `Qualidade: base valida ${total}, desfecho reconhecido ${reconhecido}%, ambiguo ${ambiguo}%, cobertura historico ${hist}%, cobertura motivo ${motivo}%.`;
};

const tooltipTopMotivos = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || {};

  return (
    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{item.indice || 'Motivo'}</div>
      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{item.motivo || '-'}</div>
      <div style={{ fontSize: 12, color: '#334155' }}>
        Ocorrências: <strong>{item.total || 0}</strong>
      </div>
    </div>
  );
};

const tooltipPerformanceAtendente = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || {};

  return (
    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{item.indice || 'Atendente'}</div>
      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{item.atendente || '-'}</div>
      <div style={{ fontSize: 12, color: '#334155' }}>Tentativas: <strong>{item.tentativas || 0}</strong></div>
      <div style={{ fontSize: 12, color: '#334155' }}>Retidos: <strong>{item.retidos || 0}</strong></div>
      <div style={{ fontSize: 12, color: '#334155' }}>Cancelamentos: <strong>{item.cancelamentos || 0}</strong></div>
      <div style={{ fontSize: 12, color: '#334155' }}>% Retidos: <strong>{Number(item.taxaRetencao || 0).toFixed(2)}%</strong></div>
    </div>
  );
};

const tooltipDescricaoMotivos = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || {};

  return (
    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{item.indice || 'Categoria'}</div>
      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{item.categoria || '-'}</div>
      <div style={{ fontSize: 12, color: '#334155' }}>
        Ocorrencias: <strong>{item.total || 0}</strong>
      </div>
      <div style={{ fontSize: 12, color: '#334155' }}>
        % da base: <strong>{Number(item.percentualBase || 0).toFixed(2)}%</strong>
      </div>
    </div>
  );
};

const TIPO_BASE_IMPORTACAO = {
  CRM_MATRIZ: 'crm_matriz',
  EMPRESA_GERAL: 'empresa_geral'
};

const criarEstadoImportacao = () => ({
  arquivoNome: '',
  urlPlanilha: '',
  pendentes: []
});

export default function RetencaoPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [periodos, setPeriodos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [tipoGrafico, setTipoGrafico] = useState({
    evolucao: 'line',
    motivos: 'bar',
    performance: 'bar',
    descricao: 'bar'
  });
  const [interacoes, setInteracoes] = useState({
    data: '',
    motivo: '',
    atendente: ''
  });
  const [filtros, setFiltros] = useState({
    periodo: '',
    tipoRegistro: '',
    escopoTime: '',
    filial: '',
    atendente: '',
    dataInicio: '',
    dataFim: ''
  });

  const [importacao, setImportacao] = useState({
    [TIPO_BASE_IMPORTACAO.CRM_MATRIZ]: criarEstadoImportacao(),
    [TIPO_BASE_IMPORTACAO.EMPRESA_GERAL]: criarEstadoImportacao()
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [matrizFilialSelecionada, setMatrizFilialSelecionada] = useState('');
  const [matrizOrigemSelecionada, setMatrizOrigemSelecionada] = useState('');

  const registrosDeduplicados = useMemo(
    () => deduplicarRegistros(registros || []),
    [registros]
  );

  const filiais = useMemo(() => {
    const mapa = new Map();
    (registrosDeduplicados || []).forEach((registro) => {
      const label = String(registro.filial || '').trim();
      const key = normalizeValue(label);
      if (!key) return;
      mapa.set(key, pickDisplayLabel(mapa.get(key), label));
    });
    return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b));
  }, [registrosDeduplicados]);

  const atendentes = useMemo(() => {
    const mapa = new Map();
    (registrosDeduplicados || []).forEach((registro) => {
      const label = String(registro.atendente || '').trim();
      const key = normalizeValue(label);
      if (!key) return;
      mapa.set(key, pickDisplayLabel(mapa.get(key), label));
    });
    return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b));
  }, [registrosDeduplicados]);

  const registrosInterativos = useMemo(() => {
    const dataSelecionada = normalizeValue(interacoes.data);
    const motivoSelecionado = normalizeValue(interacoes.motivo);
    const atendenteSelecionado = normalizeValue(interacoes.atendente);

    return (registrosDeduplicados || []).filter((r) => {
      const matchData = !dataSelecionada || normalizeValue(r.data_atendimento) === dataSelecionada;
      const matchMotivo = !motivoSelecionado || normalizeValue(r.motivo) === motivoSelecionado;
      const matchAtendente = !atendenteSelecionado || normalizeValue(r.atendente) === atendenteSelecionado;
      return matchData && matchMotivo && matchAtendente;
    });
  }, [registrosDeduplicados, interacoes.data, interacoes.motivo, interacoes.atendente]);

  const registrosVisualizacao = useMemo(
    () => (registrosInterativos || []).filter((r) => !isRegistroTeste(r)),
    [registrosInterativos]
  );

  const analyticsView = useMemo(() => calcularAnalytics(registrosVisualizacao), [registrosVisualizacao]);
  const descricaoView = useMemo(() => calcularAnaliseDescricao(registrosVisualizacao), [registrosVisualizacao]);
  const qualidadeView = useMemo(() => calcularQualidadeDados(registrosVisualizacao), [registrosVisualizacao]);
  const cobrancaView = useMemo(() => calcularAnalyticsCobranca(registrosVisualizacao), [registrosVisualizacao]);
  const benchmarkView = useMemo(
    () => calcularBenchmarkMatrizRegionais(registrosVisualizacao, matrizFilialSelecionada, matrizOrigemSelecionada),
    [registrosVisualizacao, matrizFilialSelecionada, matrizOrigemSelecionada]
  );
  const motivosIndexados = useMemo(
    () => montarLegendaIndexada(analyticsView.graficos.topMotivos || [], 'motivo', 'M', 'total'),
    [analyticsView.graficos.topMotivos]
  );
  const atendentesIndexados = useMemo(
    () => montarLegendaIndexada(analyticsView.graficos.performanceAtendentes || [], 'atendente', 'A', 'tentativas'),
    [analyticsView.graficos.performanceAtendentes]
  );
  const descricaoIndexada = useMemo(
    () => montarLegendaIndexada(descricaoView.grafico || [], 'categoria', 'D', 'total'),
    [descricaoView.grafico]
  );

  const toggleInteracao = (campo, valor) => {
    const parsed = String(valor || '').trim();
    if (!parsed) return;
    setInteracoes((prev) => ({
      ...prev,
      [campo]: prev[campo] === parsed ? '' : parsed
    }));
  };

  const limparInteracoes = () => {
    setInteracoes({ data: '', motivo: '', atendente: '' });
  };

  const carregar = async () => {
    try {
      setCarregando(true);
      const [resPeriodos, resRegistros] = await Promise.all([
        retencaoAPI.listarPeriodos(),
        retencaoAPI.listar(filtros)
      ]);
      setPeriodos(resPeriodos.data?.periodos || []);
      setRegistros(resRegistros.data?.registros || []);
      setInteracoes({ data: '', motivo: '', atendente: '' });
    } catch (e) {
      const status = e?.response?.status;
      const detalhe = e?.response?.data?.erro || e?.message || 'Erro desconhecido';
      setErro(status ? `Erro ao carregar dados de retencao (${status}): ${detalhe}` : `Erro ao carregar dados de retencao: ${detalhe}`);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.periodo, filtros.tipoRegistro, filtros.escopoTime, filtros.filial, filtros.atendente, filtros.dataInicio, filtros.dataFim]);

  const regionaisBenchmark = useMemo(
    () => benchmarkView.regionaisDisponiveis || benchmarkView.filiaisDisponiveis || [],
    [benchmarkView.regionaisDisponiveis, benchmarkView.filiaisDisponiveis]
  );
  const origensBenchmark = useMemo(
    () => benchmarkView.origensDisponiveis || [],
    [benchmarkView.origensDisponiveis]
  );

  useEffect(() => {
    if (!origensBenchmark.length) {
      if (matrizOrigemSelecionada) setMatrizOrigemSelecionada('');
      return;
    }

    const origemAtualValida = origensBenchmark
      .some((origem) => normalize(origem) === normalize(matrizOrigemSelecionada));

    if (!origemAtualValida) {
      setMatrizOrigemSelecionada(benchmarkView.origemMatriz || escolherOrigemMatriz(origensBenchmark));
    }
  }, [origensBenchmark, matrizOrigemSelecionada, benchmarkView.origemMatriz]);

  useEffect(() => {
    if (!regionaisBenchmark.length) {
      if (matrizFilialSelecionada) setMatrizFilialSelecionada('');
      return;
    }

    const matrizAtualValida = regionaisBenchmark
      .some((filial) => normalize(filial) === normalize(matrizFilialSelecionada));

    if (!matrizAtualValida) {
      setMatrizFilialSelecionada(benchmarkView.matrizRegional || benchmarkView.matrizFilial || '');
    }
  }, [regionaisBenchmark, benchmarkView.matrizRegional, benchmarkView.matrizFilial, matrizFilialSelecionada]);

  const atualizarImportacao = (tipoBase, payload) => {
    setImportacao((prev) => ({
      ...prev,
      [tipoBase]: {
        ...(prev[tipoBase] || criarEstadoImportacao()),
        ...payload
      }
    }));
  };

  const processarArquivo = async (file, tipoBase) => {
    setErro('');
    setMensagem('');
    atualizarImportacao(tipoBase, { arquivoNome: file?.name || '' });
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
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
        setErro('Nao foi possivel identificar abas de cobrancas/cancelamentos nem o formato Export no arquivo.');
        return;
      }

      atualizarImportacao(tipoBase, { pendentes: rows });
      setMensagem(`${rows.length} registro(s) preparado(s) para importacao (${tipoBase === TIPO_BASE_IMPORTACAO.CRM_MATRIZ ? 'CRM Matriz' : 'Base Empresa'}).`);
    } catch (e) {
      setErro(`Erro ao ler planilha: ${e.message}`);
    }
  };

  const importar = async (tipoBase) => {
    const contexto = importacao[tipoBase] || criarEstadoImportacao();
    if (!contexto.pendentes.length) {
      setErro('Nenhum registro preparado para importar');
      return;
    }

    try {
      setCarregando(true);
      const TAMANHO_LOTE = 300;
      const lotes = [];
      for (let i = 0; i < contexto.pendentes.length; i += TAMANHO_LOTE) {
        lotes.push(contexto.pendentes.slice(i, i + TAMANHO_LOTE));
      }

      let sucesso = 0;
      let falhas = 0;
      let duplicados = 0;
      let removidosAnteriores = 0;
      const errosColetados = [];
      const avisosColetados = [];
      const qualidadeAcumulada = {
        totalValidos: 0,
        desfechosReconhecidos: 0,
        desfechosAmbiguos: 0,
        semHistorico: 0,
        semMotivo: 0
      };

      for (let i = 0; i < lotes.length; i += 1) {
        const lote = lotes[i];
        const res = await retencaoAPI.importar(
          lote,
          contexto.arquivoNome || 'importacao.xlsx',
          { tipoBase, limparAnteriores: i === 0 }
        );
        sucesso += Number(res.data?.sucesso || 0);
        falhas += Number(res.data?.falhas || 0);
        duplicados += Number(res.data?.duplicados || 0);
        removidosAnteriores += Number(res.data?.removidosAnteriores || 0);
        const q = res.data?.qualidade || {};
        qualidadeAcumulada.totalValidos += Number(q.totalValidos || 0);
        qualidadeAcumulada.desfechosReconhecidos += Number(q.desfechosReconhecidos || 0);
        qualidadeAcumulada.desfechosAmbiguos += Number(q.desfechosAmbiguos || 0);
        qualidadeAcumulada.semHistorico += Number(q.semHistorico || 0);
        qualidadeAcumulada.semMotivo += Number(q.semMotivo || 0);
        if (Array.isArray(res.data?.erros) && res.data.erros.length) {
          errosColetados.push(...res.data.erros);
        }
        if (Array.isArray(res.data?.avisos) && res.data.avisos.length) {
          avisosColetados.push(...res.data.avisos);
        }
      }

      const totalValidos = qualidadeAcumulada.totalValidos || 0;
      const qualidadeResumo = totalValidos
        ? {
            ...qualidadeAcumulada,
            reconhecimentoPercent: (qualidadeAcumulada.desfechosReconhecidos / totalValidos) * 100,
            ambiguoPercent: (qualidadeAcumulada.desfechosAmbiguos / totalValidos) * 100,
            coberturaHistoricoPercent: ((totalValidos - qualidadeAcumulada.semHistorico) / totalValidos) * 100,
            coberturaMotivoPercent: ((totalValidos - qualidadeAcumulada.semMotivo) / totalValidos) * 100
          }
        : null;

      setMensagem(
        `Importacao concluida (${tipoBase === TIPO_BASE_IMPORTACAO.CRM_MATRIZ ? 'CRM Matriz' : 'Base Empresa'}): ${sucesso} OK, ${falhas} falha(s), ${duplicados} duplicado(s), ${removidosAnteriores} removido(s) anterior(es). ${formatarResumoQualidadeImportacao(qualidadeResumo)}`
      );
      const errosEAlertas = [
        ...errosColetados.slice(0, 20),
        ...avisosColetados.slice(0, 10)
      ];
      setErro(errosEAlertas.length ? errosEAlertas.join(' | ') : '');
      atualizarImportacao(tipoBase, { pendentes: [] });
      await carregar();
    } catch (e) {
      const status = e?.response?.status;
      const detalhe = e?.response?.data?.erro || e?.message || 'Erro desconhecido';
      setErro(status ? `Erro ao importar registros (${status}): ${detalhe}` : `Erro ao importar registros: ${detalhe}`);
    } finally {
      setCarregando(false);
    }
  };

  const importarViaUrl = async (tipoBase) => {
    const contexto = importacao[tipoBase] || criarEstadoImportacao();
    if (!String(contexto.urlPlanilha || '').trim()) {
      setErro('Informe a URL da planilha online para importar.');
      return;
    }

    try {
      setCarregando(true);
      setErro('');
      const origemArquivo = (() => {
        try {
          const u = new URL(contexto.urlPlanilha);
          const file = u.pathname.split('/').pop();
          return file || 'importacao_url.xlsx';
        } catch {
          return 'importacao_url.xlsx';
        }
      })();

      const res = await retencaoAPI.importarPorUrl(contexto.urlPlanilha.trim(), origemArquivo, {
        tipoBase,
        limparAnteriores: true
      });
      setMensagem(`${res.data?.mensagem || 'Importacao por URL concluida'} ${formatarResumoQualidadeImportacao(res.data?.qualidade)}`);
      const errosEAlertas = [
        ...(Array.isArray(res.data?.erros) ? res.data.erros.slice(0, 20) : []),
        ...(Array.isArray(res.data?.avisos) ? res.data.avisos.slice(0, 10) : [])
      ];
      if (errosEAlertas.length) setErro(errosEAlertas.join(' | '));
      atualizarImportacao(tipoBase, { urlPlanilha: '' });
      await carregar();
    } catch (e) {
      const status = e?.response?.status;
      const detalhe = e?.response?.data?.erro || e?.message || 'Erro desconhecido';
      setErro(status ? `Erro ao importar via URL (${status}): ${detalhe}` : `Erro ao importar via URL: ${detalhe}`);
    } finally {
      setCarregando(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <LogoImage />
        <SidebarNav />
        <div className="sidebar-profile">
          <div className="profile-card">
            <strong>{usuario.nome}</strong>
            <p>{usuario.email}</p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>Sair do Sistema</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Retencao de Clientes - Painel Integrado</h1>
          <p>Analise completa da operacao: qualidade da base, KPIs, benchmark matriz x regionais, cobranca e performance.</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        <div className="retencao-section-header">
          <h2>1. Ingestao de Dados</h2>
          <p>Carregue as bases da Matriz e da Empresa. A qualidade da importacao e validada automaticamente.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <h3>Importacao em lote</h3>

          <div className="retencao-actions" style={{ marginBottom: '10px', justifyContent: 'space-between' }}>
            <strong>Base 1: CRM Matriz (Time de Retencao)</strong>
            <small>Substitui a versao anterior dessa base</small>
          </div>
          <div className="retencao-actions">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => processarArquivo(e.target.files?.[0], TIPO_BASE_IMPORTACAO.CRM_MATRIZ)}
            />
            <button
              className="btn btn-primary"
              onClick={() => importar(TIPO_BASE_IMPORTACAO.CRM_MATRIZ)}
              disabled={carregando}
            >
              {carregando ? 'Importando...' : 'Importar CRM Matriz'}
            </button>
          </div>
          <div className="retencao-actions" style={{ marginTop: '8px' }}>
            <input
              type="url"
              placeholder="Cole a URL da planilha CRM Matriz (.xlsx)"
              value={importacao[TIPO_BASE_IMPORTACAO.CRM_MATRIZ]?.urlPlanilha || ''}
              onChange={(e) => atualizarImportacao(TIPO_BASE_IMPORTACAO.CRM_MATRIZ, { urlPlanilha: e.target.value })}
            />
            <button
              className="btn btn-secondary"
              onClick={() => importarViaUrl(TIPO_BASE_IMPORTACAO.CRM_MATRIZ)}
              disabled={carregando}
            >
              {carregando ? 'Buscando...' : 'Importar CRM Matriz via URL'}
            </button>
          </div>
          <small>Registros preparados (CRM Matriz): {importacao[TIPO_BASE_IMPORTACAO.CRM_MATRIZ]?.pendentes?.length || 0}</small>

          <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />

          <div className="retencao-actions" style={{ marginBottom: '10px', justifyContent: 'space-between' }}>
            <strong>Base 2: Empresa (Matriz + Regionais)</strong>
            <small>Substitui a versao anterior dessa base</small>
          </div>
          <div className="retencao-actions">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => processarArquivo(e.target.files?.[0], TIPO_BASE_IMPORTACAO.EMPRESA_GERAL)}
            />
            <button
              className="btn btn-primary"
              onClick={() => importar(TIPO_BASE_IMPORTACAO.EMPRESA_GERAL)}
              disabled={carregando}
            >
              {carregando ? 'Importando...' : 'Importar Base Empresa'}
            </button>
          </div>
          <div className="retencao-actions" style={{ marginTop: '8px' }}>
            <input
              type="url"
              placeholder="Cole a URL da planilha Base Empresa (.xlsx)"
              value={importacao[TIPO_BASE_IMPORTACAO.EMPRESA_GERAL]?.urlPlanilha || ''}
              onChange={(e) => atualizarImportacao(TIPO_BASE_IMPORTACAO.EMPRESA_GERAL, { urlPlanilha: e.target.value })}
            />
            <button
              className="btn btn-secondary"
              onClick={() => importarViaUrl(TIPO_BASE_IMPORTACAO.EMPRESA_GERAL)}
              disabled={carregando}
            >
              {carregando ? 'Buscando...' : 'Importar Base Empresa via URL'}
            </button>
          </div>
          <small>Registros preparados (Base Empresa): {importacao[TIPO_BASE_IMPORTACAO.EMPRESA_GERAL]?.pendentes?.length || 0}</small>
        </div>

        <div className="retencao-section-header">
          <h2>2. Filtros do Painel</h2>
          <p>Os filtros abaixo controlam todos os KPIs, graficos e tabelas desta pagina.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <h3>Filtros</h3>
          <div className="retencao-filtros">
            <select value={filtros.periodo} onChange={(e) => setFiltros((f) => ({ ...f, periodo: e.target.value }))}>
              <option value="">Todos os periodos</option>
              {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <select value={filtros.tipoRegistro} onChange={(e) => setFiltros((f) => ({ ...f, tipoRegistro: e.target.value }))}>
              {TIPOS.map((t) => <option key={t.value || 'all'} value={t.value}>{t.label}</option>)}
            </select>

            <select value={filtros.escopoTime} onChange={(e) => setFiltros((f) => ({ ...f, escopoTime: e.target.value }))}>
              {ESCOPOS_TIME.map((t) => <option key={t.value || 'all'} value={t.value}>{t.label}</option>)}
            </select>

            <select value={filtros.filial} onChange={(e) => setFiltros((f) => ({ ...f, filial: e.target.value }))}>
              <option value="">Todas as regionais</option>
              {filiais.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>

            <select value={filtros.atendente} onChange={(e) => setFiltros((f) => ({ ...f, atendente: e.target.value }))}>
              <option value="">Todos os atendentes</option>
              {atendentes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))}
              title="Data inicial"
            />

            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))}
              title="Data final"
            />
          </div>
        </div>

        <div className="retencao-section-header">
          <h2>3. Qualidade do Dado</h2>
          <p>Confiabilidade da base para leitura executiva e analises de causa.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <div className="retencao-kpis">
            <div className="retencao-kpi-card">
              <span>Base analisada</span>
              <strong>{qualidadeView.kpis.total || 0}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Desfecho reconhecido</span>
              <strong>{Number(qualidadeView.kpis.coberturaDesfechoReconhecido || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Ambiguidade de desfecho</span>
              <strong>{Number(qualidadeView.kpis.ambiguidadeDesfecho || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Cobertura de historico</span>
              <strong>{Number(qualidadeView.kpis.coberturaHistorico || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Cobertura de motivo</span>
              <strong>{Number(qualidadeView.kpis.coberturaMotivo || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Sem desfecho</span>
              <strong>{qualidadeView.kpis.semDesfecho || 0}</strong>
            </div>
          </div>
          <div className="retencao-chart-grid" style={{ marginTop: 12, marginBottom: 0 }}>
            <div className="glass-card retencao-subcard">
              <h3>Distribuicao de desfecho</h3>
              <div className="retencao-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={qualidadeView.graficos || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Registros" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card retencao-subcard">
              <h3>Leituras de qualidade</h3>
              <div className="retencao-oportunidades" style={{ marginTop: 0 }}>
                <ul>
                  {(qualidadeView.insights || []).map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="retencao-section-header">
          <h2>4. Operacao Geral</h2>
          <p>Visao consolidada de retencao para o periodo e recorte selecionados.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <h3>KPIs Operacionais</h3>
          <div className="retencao-interacoes">
            <span className="retencao-interacoes-label">Filtros por clique:</span>
            <span className={`retencao-chip ${interacoes.data ? 'ativo' : ''}`}>Data: {interacoes.data || 'Todas'}</span>
            <span className={`retencao-chip ${interacoes.motivo ? 'ativo' : ''}`}>Motivo: {interacoes.motivo || 'Todos'}</span>
            <span className={`retencao-chip ${interacoes.atendente ? 'ativo' : ''}`}>Atendente: {interacoes.atendente || 'Todos'}</span>
            <button className="btn btn-secondary" type="button" onClick={limparInteracoes}>Limpar cliques</button>
          </div>
          <div className="retencao-kpis">
            <div className="retencao-kpi-card">
              <span>Tentativas</span>
              <strong>{analyticsView.kpis.totalTentativas || 0}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Taxa Retencao</span>
              <strong>{Number(analyticsView.kpis.taxaRetencao || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Taxa Cancelamento</span>
              <strong>{Number(analyticsView.kpis.taxaCancelamento || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Taxa Acordo</span>
              <strong>{Number(analyticsView.kpis.taxaAcordo || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Atendentes</span>
              <strong>{analyticsView.kpis.atendentesUnicos || 0}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Produtividade/Dia</span>
              <strong>{Number(analyticsView.kpis.produtividadeDia || 0).toFixed(2)}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Produtividade/Colaborador</span>
              <strong>{Number(analyticsView.kpis.produtividadeColaborador || 0).toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div className="retencao-section-header">
          <h2>5. Diagnostico de Causas</h2>
          <p>Leitura estruturada do campo descricao para priorizar planos de acao.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <div className="retencao-chart-header">
            <h3>Resumo de Motivos (campo Descricao)</h3>
            <select
              value={tipoGrafico.descricao}
              onChange={(e) => setTipoGrafico((p) => ({ ...p, descricao: e.target.value }))}
            >
              <option value="bar">Barras</option>
              <option value="line">Linha</option>
              <option value="area">Area</option>
            </select>
          </div>

          <div className="retencao-kpis">
            <div className="retencao-kpi-card">
              <span>Total de registros</span>
              <strong>{descricaoView.kpis.totalRegistros || 0}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Com descricao</span>
              <strong>{descricaoView.kpis.totalComDescricao || 0}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Sem descricao</span>
              <strong>{descricaoView.kpis.totalSemDescricao || 0}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Cobertura da descricao</span>
              <strong>{Number(descricaoView.kpis.coberturaDescricao || 0).toFixed(2)}%</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Categoria principal</span>
              <strong style={{ fontSize: 16 }}>{descricaoView.kpis.topCategoria || '-'}</strong>
              <small>{Number(descricaoView.kpis.topCategoriaPercentual || 0).toFixed(2)}% das descricoes</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Taxa de retencao (com descricao)</span>
              <strong>{Number(descricaoView.kpis.taxaRetencaoComDescricao || 0).toFixed(2)}%</strong>
              <small>{descricaoView.kpis.categoriasMapeadas || 0} categorias mapeadas</small>
            </div>
          </div>

          <div className="retencao-chart">
            {tipoGrafico.descricao === 'bar' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={descricaoIndexada.itens || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="indice" interval={0} angle={0} textAnchor="middle" height={40} />
                  <YAxis />
                  <Tooltip content={tooltipDescricaoMotivos} />
                  <Legend />
                  <Bar dataKey="total" fill={COLORS.total} name="Ocorrencias por categoria" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {tipoGrafico.descricao === 'line' && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={descricaoIndexada.itens || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="indice" interval={0} angle={0} textAnchor="middle" height={40} />
                  <YAxis />
                  <Tooltip content={tooltipDescricaoMotivos} />
                  <Legend />
                  <Line dataKey="total" stroke={COLORS.total} name="Ocorrencias por categoria" />
                </LineChart>
              </ResponsiveContainer>
            )}
            {tipoGrafico.descricao === 'area' && (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={descricaoIndexada.itens || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="indice" interval={0} angle={0} textAnchor="middle" height={40} />
                  <YAxis />
                  <Tooltip content={tooltipDescricaoMotivos} />
                  <Legend />
                  <Area dataKey="total" stroke={COLORS.total} fill={COLORS.total} fillOpacity={0.3} name="Ocorrencias por categoria" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="retencao-mapa-rotulos">
            {(descricaoIndexada.mapa || []).map((item) => (
              <span key={item.indice} className="retencao-mapa-chip" title={item.texto}>
                <strong>{item.indice}</strong> {item.texto} <span className="retencao-mapa-meta">({item.valor})</span>
              </span>
            ))}
          </div>

          <div className="table-responsive" style={{ marginTop: '10px' }}>
            <table>
              <thead>
                <tr>
                  <th>Categoria (Descricao)</th>
                  <th>Qtde</th>
                  <th>% Descricoes</th>
                  <th>% Base</th>
                  <th>Retidos</th>
                  <th>% Retencao</th>
                </tr>
              </thead>
              <tbody>
                {(descricaoView.tabela || []).map((item) => (
                  <tr key={item.categoria}>
                    <td>{item.categoria}</td>
                    <td>{item.total}</td>
                    <td>{item.categoria === 'Sem descricao' ? '-' : `${Number(item.percentualDescricoes || 0).toFixed(2)}%`}</td>
                    <td>{Number(item.percentualBase || 0).toFixed(2)}%</td>
                    <td>{item.retidos}</td>
                    <td>{Number(item.taxaRetencao || 0).toFixed(2)}%</td>
                  </tr>
                ))}
                {!(descricaoView.tabela || []).length && (
                  <tr>
                    <td colSpan={6} className="retencao-vazio">
                      Sem dados para analise de descricoes com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="retencao-section-header">
          <h2>6. Benchmark Matriz x Regionais</h2>
          <p>Comparativo de desempenho para orientar coaching, replicacao e correcoes.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <div className="retencao-benchmark-header">
            <div>
              <h3>Benchmark Matriz x Regionais</h3>
              <p>Comparativo de performance entre matriz e regionais com base nos filtros selecionados.</p>
            </div>
            <div className="retencao-benchmark-matriz">
              <label htmlFor="matrizOrigem">Base da Matriz (Time de Retencao)</label>
              <select
                id="matrizOrigem"
                value={matrizOrigemSelecionada}
                onChange={(e) => setMatrizOrigemSelecionada(e.target.value)}
              >
                {!origensBenchmark.length && (
                  <option value="">Sem origem disponivel</option>
                )}
                {origensBenchmark.map((origem) => (
                  <option key={origem} value={origem}>{origem}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="retencao-kpis">
            <div className="retencao-kpi-card">
              <span>Taxa Matriz</span>
              <strong>{Number(benchmarkView.kpis.matrizTaxa || 0).toFixed(2)}%</strong>
              <small>{benchmarkView.matrizRegional || benchmarkView.matrizFilial || '-'}</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Taxa Regionais</span>
              <strong>{Number(benchmarkView.kpis.regionaisTaxa || 0).toFixed(2)}%</strong>
              <small>Media ponderada por volume</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Gap Regionais vs Matriz</span>
              <strong>{Number(benchmarkView.kpis.gapPP || 0).toFixed(2)} p.p.</strong>
              <small>Diferenca percentual de retencao</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Taxa Geral</span>
              <strong>{Number(benchmarkView.kpis.taxaGeral || 0).toFixed(2)}%</strong>
              <small>{benchmarkView.kpis.totalTentativas || 0} tentativas</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Cobertura Regionais</span>
              <strong>{Number(benchmarkView.kpis.coberturaRegionais || 0).toFixed(2)}%</strong>
              <small>Participacao no volume total</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Amplitude Regional</span>
              <strong>{Number(benchmarkView.kpis.amplitudeRegional || 0).toFixed(2)} p.p.</strong>
              <small>Distancia entre melhor e pior taxa</small>
            </div>
          </div>

          <div className="retencao-oportunidades">
            <h4>Leituras executivas</h4>
            <ul>
              {(benchmarkView.insights || []).map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="retencao-chart-grid">
          <div className="glass-card">
            <h3>Taxa de Retencao por Regional</h3>
            <div className="retencao-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={benchmarkView.graficos.taxaPorRegional || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="regionalCurta" interval={0} angle={-20} textAnchor="end" height={68} />
                  <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === '% Retencao' || name === '% Matriz (referencia)') {
                        return `${Number(value || 0).toFixed(2)}%`;
                      }
                      return Number(value || 0);
                    }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.regional || label}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="taxaRetencao" fill="#2563eb" name="% Retencao" />
                  <Line yAxisId="left" dataKey="taxaMatriz" stroke="#f59e0b" strokeWidth={2} dot={false} name="% Matriz (referencia)" />
                  <Bar yAxisId="right" dataKey="tentativas" fill="#94a3b8" name="Tentativas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card">
            <h3>Delta vs Matriz (p.p.)</h3>
            <div className="retencao-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={benchmarkView.graficos.deltaPorRegional || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="regionalCurta" interval={0} angle={-20} textAnchor="end" height={68} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${Number(v).toFixed(0)} p.p.`} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Delta + (p.p.)' || name === 'Delta - (p.p.)') return `${Number(value || 0).toFixed(2)} p.p.`;
                      if (name === '% Retencao' || name === '% Matriz') return `${Number(value || 0).toFixed(2)}%`;
                      return Number(value || 0);
                    }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.regional || label}
                  />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={0} stroke="#334155" strokeDasharray="4 4" />
                  <Bar yAxisId="left" dataKey="deltaPositivo" stackId="delta" fill="#16a34a" name="Delta + (p.p.)" />
                  <Bar yAxisId="left" dataKey="deltaNegativo" stackId="delta" fill="#dc2626" name="Delta - (p.p.)" />
                  <Line yAxisId="right" type="monotone" dataKey="taxaRetencao" stroke="#2563eb" strokeWidth={2} dot={false} name="% Retencao" />
                  <Line yAxisId="right" type="monotone" dataKey="taxaMatriz" stroke="#64748b" strokeWidth={2} dot={false} name="% Matriz" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <h3>Matriz x Regionais - Detalhamento</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Regional</th>
                  <th>Tentativas</th>
                  <th>Retidos</th>
                  <th>% Retencao</th>
                  <th>Delta vs Matriz</th>
                  <th>Indice vs Matriz</th>
                  <th>Amostra</th>
                </tr>
              </thead>
              <tbody>
                {(benchmarkView.tabelaComparativa || []).map((item) => (
                  <tr key={`${item.tipo}-${item.regional}`}>
                    <td>{item.tipo}</td>
                    <td>{item.regional}</td>
                    <td>{item.tentativas}</td>
                    <td>{item.retidos}</td>
                    <td>{Number(item.taxaRetencao || 0).toFixed(2)}%</td>
                    <td className={item.deltaPP > 0 ? 'retencao-indicador-positivo' : item.deltaPP < 0 ? 'retencao-indicador-negativo' : 'retencao-indicador-neutro'}>
                      {Number(item.deltaPP || 0).toFixed(2)} p.p.
                    </td>
                    <td>{Number(item.indiceVsMatriz || 0).toFixed(1)}%</td>
                    <td>{item.qualidadeAmostra}</td>
                  </tr>
                ))}
                {!(benchmarkView.tabelaComparativa || []).length && (
                  <tr>
                    <td colSpan={8} className="retencao-vazio">
                      Sem dados para comparar matriz e regionais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="retencao-section-header">
          <h2>7. Cobranca e Inadimplencia</h2>
          <p>KPI de recuperacao, perda e risco, com foco em eficiencia operacional.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <h3>Cobranca/Inadimplencia - Oportunidades</h3>
          <div className="retencao-kpis">
            <div className="retencao-kpi-card">
              <span>Casos em cobranca</span>
              <strong>{cobrancaView.kpis.totalCobrancas || 0}</strong>
            </div>
            <div className="retencao-kpi-card">
              <span>Recuperados</span>
              <strong>{cobrancaView.kpis.totalRecuperados || 0}</strong>
              <small>{Number(cobrancaView.kpis.taxaRecuperacao || 0).toFixed(2)}%</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Cancelados</span>
              <strong>{cobrancaView.kpis.totalCancelados || 0}</strong>
              <small>{Number(cobrancaView.kpis.taxaPerda || 0).toFixed(2)}%</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Sem desfecho</span>
              <strong>{cobrancaView.kpis.totalSemDesfecho || 0}</strong>
              <small>{Number(cobrancaView.kpis.taxaSemDesfecho || 0).toFixed(2)}%</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Reincidencia</span>
              <strong>{cobrancaView.kpis.totalReincidentes || 0}</strong>
              <small>{Number(cobrancaView.kpis.taxaReincidencia || 0).toFixed(2)}%</small>
            </div>
            <div className="retencao-kpi-card">
              <span>Acordo formalizado</span>
              <strong>{cobrancaView.kpis.totalAcordosFormais || 0}</strong>
              <small>{Number(cobrancaView.kpis.taxaAcordoFormal || 0).toFixed(2)}%</small>
            </div>
          </div>
          <div className="retencao-oportunidades">
            <h4>Alertas e oportunidades</h4>
            <ul>
              {(cobrancaView.oportunidades || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="retencao-chart-grid">
          <div className="glass-card">
            <h3>Desfecho da Cobranca</h3>
            <div className="retencao-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cobrancaView.graficos.desfechos || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="desfecho" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Casos">
                    {(cobrancaView.graficos.desfechos || []).map((item) => {
                      const key = `desfecho-${item.desfecho}`;
                      let fill = '#0ea5e9';
                      if (item.desfecho === 'Cancelamento') fill = '#dc2626';
                      if (item.desfecho === 'Sem desfecho') fill = '#f59e0b';
                      if (item.desfecho === 'Pagamento' || item.desfecho === 'Acordo' || item.desfecho === 'Retido') fill = '#16a34a';
                      return <Cell key={key} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card">
            <h3>Regionais com Maior Risco de Perda</h3>
            <div className="retencao-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cobrancaView.graficos.riscoPorFilial || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="filial" hide />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v, n) => (n === 'Taxa de risco' ? `${Number(v).toFixed(2)}%` : v)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total" fill="#64748b" name="Volume de casos" />
                  <Bar yAxisId="right" dataKey="taxaRisco" fill="#ef4444" name="Taxa de risco" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <h3>Eficiencia por Atendente (Cobranca)</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Atendente</th>
                  <th>Casos</th>
                  <th>Recuperados</th>
                  <th>Cancelados</th>
                  <th>Sem desfecho</th>
                  <th>% Recuperacao</th>
                  <th>% Risco</th>
                </tr>
              </thead>
              <tbody>
                {(cobrancaView.graficos.eficienciaAtendentes || []).map((item) => (
                  <tr key={item.atendente}>
                    <td>{item.atendente}</td>
                    <td>{item.total}</td>
                    <td>{item.recuperados}</td>
                    <td>{item.cancelados}</td>
                    <td>{item.semDesfecho}</td>
                    <td>{Number(item.taxaRecuperacao || 0).toFixed(2)}%</td>
                    <td>{Number(item.taxaRisco || 0).toFixed(2)}%</td>
                  </tr>
                ))}
                {!(cobrancaView.graficos.eficienciaAtendentes || []).length && (
                  <tr>
                    <td colSpan={7} className="retencao-vazio">
                      Sem dados de cobranca/inadimplencia para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="retencao-section-header">
          <h2>8. Evolucao e Performance</h2>
          <p>Serie temporal, top motivos e desempenho por atendente com filtros por clique.</p>
        </div>
        <div className="glass-card" style={{ marginBottom: '16px' }}>
          <div className="retencao-chart-header">
            <h3>Evolucao Diaria</h3>
            <select
              value={tipoGrafico.evolucao}
              onChange={(e) => setTipoGrafico((p) => ({ ...p, evolucao: e.target.value }))}
            >
              <option value="line">Linha</option>
              <option value="bar">Barras</option>
              <option value="area">Area</option>
            </select>
          </div>
          <div className="retencao-chart">
            {tipoGrafico.evolucao === 'bar' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={analyticsView.graficos.timeline || []}
                  onClick={(state) => toggleInteracao('data', state?.activePayload?.[0]?.payload?.data)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tentativas" fill={COLORS.tentativas} name="Tentativas" />
                  <Bar dataKey="retidos" fill={COLORS.retidos} name="Retidos" />
                  <Bar dataKey="cancelamentos" fill={COLORS.cancelamentos} name="Cancelamentos" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {tipoGrafico.evolucao === 'area' && (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={analyticsView.graficos.timeline || []}
                  onClick={(state) => toggleInteracao('data', state?.activePayload?.[0]?.payload?.data)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="tentativas" fill={COLORS.tentativas} stroke={COLORS.tentativas} name="Tentativas" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="retidos" fill={COLORS.retidos} stroke={COLORS.retidos} name="Retidos" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="cancelamentos" fill={COLORS.cancelamentos} stroke={COLORS.cancelamentos} name="Cancelamentos" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {tipoGrafico.evolucao === 'line' && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={analyticsView.graficos.timeline || []}
                  onClick={(state) => toggleInteracao('data', state?.activePayload?.[0]?.payload?.data)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tentativas" stroke={COLORS.tentativas} name="Tentativas" />
                  <Line type="monotone" dataKey="retidos" stroke={COLORS.retidos} name="Retidos" />
                  <Line type="monotone" dataKey="cancelamentos" stroke={COLORS.cancelamentos} name="Cancelamentos" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="retencao-chart-grid">
          <div className="glass-card">
            <div className="retencao-chart-header">
              <h3>Top Motivos</h3>
              <select
                value={tipoGrafico.motivos}
                onChange={(e) => setTipoGrafico((p) => ({ ...p, motivos: e.target.value }))}
              >
                <option value="bar">Barras</option>
                <option value="line">Linha</option>
                <option value="area">Area</option>
              </select>
            </div>
            <div className="retencao-chart">
              {tipoGrafico.motivos === 'bar' && (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={motivosIndexados.itens || []}
                    onClick={(state) => toggleInteracao('motivo', state?.activePayload?.[0]?.payload?.motivo)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="indice"
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis />
                    <Tooltip content={tooltipTopMotivos} />
                    <Legend />
                    <Bar dataKey="total" name="Total de ocorrencias por motivo">
                      {(motivosIndexados.itens || []).map((entry, index) => (
                        <Cell
                          key={`motivo-cell-${index}`}
                          fill={interacoes.motivo && normalizeValue(interacoes.motivo) !== normalizeValue(entry.motivo) ? COLORS.muted : COLORS.total}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {tipoGrafico.motivos === 'line' && (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={motivosIndexados.itens || []}
                    onClick={(state) => toggleInteracao('motivo', state?.activePayload?.[0]?.payload?.motivo)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="indice"
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis />
                    <Tooltip content={tooltipTopMotivos} />
                    <Legend />
                    <Line dataKey="total" stroke={COLORS.total} name="Total de ocorrencias por motivo" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {tipoGrafico.motivos === 'area' && (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={motivosIndexados.itens || []}
                    onClick={(state) => toggleInteracao('motivo', state?.activePayload?.[0]?.payload?.motivo)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="indice"
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis />
                    <Tooltip content={tooltipTopMotivos} />
                    <Legend />
                    <Area dataKey="total" stroke={COLORS.total} fill={COLORS.total} fillOpacity={0.3} name="Total de ocorrencias por motivo" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="retencao-mapa-rotulos">
              {(motivosIndexados.mapa || []).map((item) => (
                <span key={item.indice} className="retencao-mapa-chip" title={item.texto}>
                  <strong>{item.indice}</strong> {item.texto} <span className="retencao-mapa-meta">({item.valor})</span>
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <div className="retencao-chart-header">
              <h3>Performance por Atendente</h3>
              <select
                value={tipoGrafico.performance}
                onChange={(e) => setTipoGrafico((p) => ({ ...p, performance: e.target.value }))}
              >
                <option value="bar">Barras</option>
                <option value="line">Linha</option>
                <option value="area">Area</option>
              </select>
            </div>
            <div className="retencao-chart">
              {tipoGrafico.performance === 'bar' && (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={atendentesIndexados.itens || []}
                    onClick={(state) => toggleInteracao('atendente', state?.activePayload?.[0]?.payload?.atendente)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="indice"
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={tooltipPerformanceAtendente} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="tentativas" fill={COLORS.tentativas} name="Barras azuis: tentativas" />
                    <Bar yAxisId="left" dataKey="retidos" fill={COLORS.retidos} name="Barras verdes: retidos" />
                    <Bar yAxisId="left" dataKey="cancelamentos" fill={COLORS.cancelamentos} name="Barras vermelhas: cancelamentos" />
                    <Line yAxisId="right" type="monotone" dataKey="taxaRetencao" stroke="#f59e0b" strokeWidth={2} dot={false} name="% Retidos (linha laranja)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {tipoGrafico.performance === 'line' && (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={atendentesIndexados.itens || []}
                    onClick={(state) => toggleInteracao('atendente', state?.activePayload?.[0]?.payload?.atendente)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="indice"
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={tooltipPerformanceAtendente} />
                    <Legend />
                    <Line yAxisId="left" dataKey="tentativas" stroke={COLORS.tentativas} name="Linha azul: tentativas" />
                    <Line yAxisId="left" dataKey="retidos" stroke={COLORS.retidos} name="Linha verde: retidos" />
                    <Line yAxisId="left" dataKey="cancelamentos" stroke={COLORS.cancelamentos} name="Linha vermelha: cancelamentos" />
                    <Line yAxisId="right" dataKey="taxaRetencao" stroke="#f59e0b" strokeWidth={2} dot={false} name="% Retidos (linha laranja)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {tipoGrafico.performance === 'area' && (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={atendentesIndexados.itens || []}
                    onClick={(state) => toggleInteracao('atendente', state?.activePayload?.[0]?.payload?.atendente)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="indice"
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={tooltipPerformanceAtendente} />
                    <Legend />
                    <Area yAxisId="left" dataKey="tentativas" stroke={COLORS.tentativas} fill={COLORS.tentativas} fillOpacity={0.25} name="Area azul: tentativas" />
                    <Area yAxisId="left" dataKey="retidos" stroke={COLORS.retidos} fill={COLORS.retidos} fillOpacity={0.25} name="Area verde: retidos" />
                    <Area yAxisId="left" dataKey="cancelamentos" stroke={COLORS.cancelamentos} fill={COLORS.cancelamentos} fillOpacity={0.25} name="Area vermelha: cancelamentos" />
                    <Line yAxisId="right" dataKey="taxaRetencao" stroke="#f59e0b" strokeWidth={2} dot={false} name="% Retidos (linha laranja)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="retencao-mapa-rotulos">
              {(atendentesIndexados.mapa || []).map((item) => (
                <span key={item.indice} className="retencao-mapa-chip" title={item.texto}>
                  <strong>{item.indice}</strong> {item.texto} <span className="retencao-mapa-meta">({item.valor} casos)</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="retencao-section-header">
          <h2>9. Base Detalhada</h2>
          <p>Rastreabilidade completa dos registros para auditoria do resultado.</p>
        </div>
        <div className="glass-card">
          <h3>Registros ({registrosVisualizacao.length})</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Periodo</th>
                  <th>Tipo</th>
                  <th>Atendente</th>
                  <th>Cliente</th>
                  <th>Regional</th>
                  <th>Motivo</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {registrosVisualizacao.map((r) => (
                  <tr key={r.id}>
                    <td>{r.data_atendimento || '-'}</td>
                    <td>{r.periodo || '-'}</td>
                    <td>{r.tipo_registro || '-'}</td>
                    <td>{r.atendente || '-'}</td>
                    <td>{r.nome_completo || '-'}</td>
                    <td>{r.filial || '-'}</td>
                    <td>{r.motivo || '-'}</td>
                    <td>{r.resultado_tratativa || '-'}</td>
                  </tr>
                ))}
                {!registrosVisualizacao.length && (
                  <tr>
                    <td colSpan={8} className="retencao-vazio">
                      {carregando ? 'Carregando...' : 'Nenhum registro encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
