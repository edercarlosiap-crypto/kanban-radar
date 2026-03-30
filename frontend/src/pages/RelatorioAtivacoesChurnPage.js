import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  churnRegionaisAPI,
  regionaisAPI,
  regrasComissaoAPI,
  vendasMensaisAPI
} from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/RelatorioAtivacoesChurnPage.css';

const REGIONAL_ORDEM = [
  'JI-PARANA',
  'MACHADINHO DOESTE',
  'ROLIM DE MOURA',
  'SAO FRANCISCO',
  'JARU',
  'PRESIDENTE MEDICI',
  'ALTA FLORESTA DOESTE',
  'ALVORADA DOESTE',
  'NOVA BRASILANDIA',
  'OURO PRETO'
];

const normalizarTexto = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/^UNI\s*-\s*/, '')
    .replace(/D['’]?OESTE/g, 'DOESTE');

const formatNumero = (valor, casas = 0) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const formatPercent = (valor) => `${formatNumero((valor || 0) * 100, 2)}%`;

const obterStatusPercentual = (valor, { invertido = false } = {}) => {
  const numero = Number(valor || 0);
  if (invertido) {
    if (numero <= 1) return { classe: 'kpi-bom', icone: '↓' };
    if (numero <= 1.1) return { classe: 'kpi-alerta', icone: '→' };
    return { classe: 'kpi-critico', icone: '↑' };
  }

  if (numero >= 1) return { classe: 'kpi-bom', icone: '↑' };
  if (numero >= 0.9) return { classe: 'kpi-alerta', icone: '→' };
  return { classe: 'kpi-critico', icone: '↓' };
};

const renderPercentualKpi = (valor, opcoes = {}) => {
  const status = obterStatusPercentual(valor, opcoes);
  return (
    <span className={`kpi-percent ${status.classe}`}>
      <span className="kpi-icon">{status.icone}</span>
      <span>{formatPercent(valor)}</span>
    </span>
  );
};

const obterStatusAdicao = (tipo, valor) => {
  const numero = Number(valor || 0);

  if (tipo === 'ab') {
    if (numero >= 0.02) return { classe: 'kpi-bom', icone: '↑' };
    if (numero >= 0.015) return { classe: 'kpi-alerta', icone: '→' };
    return { classe: 'kpi-critico', icone: '↓' };
  }

  if (tipo === 'churn') {
    if (numero <= 0.01) return { classe: 'kpi-bom', icone: '↓' };
    if (numero <= 0.012) return { classe: 'kpi-alerta', icone: '→' };
    return { classe: 'kpi-critico', icone: '↑' };
  }

  if (numero >= 0.01) return { classe: 'kpi-bom', icone: '↑' };
  if (numero >= 0.008) return { classe: 'kpi-alerta', icone: '→' };
  return { classe: 'kpi-critico', icone: '↓' };
};

const renderPercentualKpiAdicao = (tipo, valor) => {
  const status = obterStatusAdicao(tipo, valor);
  return (
    <span className={`kpi-percent ${status.classe}`}>
      <span className="kpi-icon">{status.icone}</span>
      <span>{formatPercent(valor)}</span>
    </span>
  );
};

const calcNecDia = (meta, realizado, duTotal, duPassado) => {
  const restantes = (duTotal || 0) - (duPassado || 0);
  if (restantes <= 0) return 0;
  return ((meta || 0) - (realizado || 0)) / restantes;
};

const MESES = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
};

const parsePeriodo = (periodo) => {
  const [mesTxt, anoTxt] = String(periodo || '').split('/');
  const mes = MESES[String(mesTxt || '').toLowerCase()];
  const anoNum = Number(anoTxt);
  if (mes === undefined || Number.isNaN(anoNum)) return null;
  const ano = anoNum < 100 ? 2000 + anoNum : anoNum;
  return { mes, ano };
};

const ordenarPeriodosCrescente = (periodos = []) => {
  return [...periodos].sort((a, b) => {
    const pa = parsePeriodo(a);
    const pb = parsePeriodo(b);
    if (!pa && !pb) return String(a).localeCompare(String(b), 'pt-BR');
    if (!pa) return 1;
    if (!pb) return -1;
    if (pa.ano !== pb.ano) return pa.ano - pb.ano;
    return pa.mes - pb.mes;
  });
};

const contarDiasUteisMes = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return 0;
  const { mes, ano } = parsed;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= ultimoDia; d += 1) {
    const day = new Date(ano, mes, d).getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const contarDiasUteisPassados = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return 0;
  const { mes, ano } = parsed;
  const hoje = new Date();
  const hojeMes = hoje.getMonth();
  const hojeAno = hoje.getFullYear();
  const ordemPeriodo = ano * 100 + mes;
  const ordemHoje = hojeAno * 100 + hojeMes;

  if (ordemPeriodo < ordemHoje) {
    return contarDiasUteisMes(periodo);
  }
  if (ordemPeriodo > ordemHoje) {
    return 0;
  }

  let count = 0;
  for (let d = 1; d <= hoje.getDate(); d += 1) {
    const day = new Date(ano, mes, d).getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const isPeriodoMesVigente = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return false;
  const hoje = new Date();
  return parsed.ano === hoje.getFullYear() && parsed.mes === hoje.getMonth();
};

const totalizar = (dados) =>
  dados.reduce(
    (acc, item) => ({
      metaAtivacoes: acc.metaAtivacoes + (item.metaAtivacoes || 0),
      ativacoes: acc.ativacoes + (item.ativacoes || 0),
      tendencia: acc.tendencia + (item.tendencia || 0),
      churn: acc.churn + (item.churn || 0),
      churnTendencia: acc.churnTendencia + (item.churnTendencia || 0),
      baseRef: acc.baseRef + (item.baseRef || 0),
      adicaoBruta: acc.adicaoBruta + (item.adicaoBruta || 0),
      adicaoLiquida: acc.adicaoLiquida + (item.adicaoLiquida || 0)
    }),
    { metaAtivacoes: 0, ativacoes: 0, tendencia: 0, churn: 0, churnTendencia: 0, baseRef: 0, adicaoBruta: 0, adicaoLiquida: 0 }
  );

const extrairTipoMeta = (tipoMeta) => normalizarTexto(tipoMeta).toLowerCase();
const LS_GRAFICO_MODELO = 'relatorio_ativacoes_churn_grafico_modelo';
const LS_GRAFICO_METRICA = 'relatorio_ativacoes_churn_grafico_metrica';
const LS_GRAFICO_VISUALIZACAO = 'relatorio_ativacoes_churn_grafico_visualizacao';

export default function RelatorioAtivacoesChurnPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.role || usuario.perfil || 'leitura';

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [dadosExport, setDadosExport] = useState([]);
  const [duPlan, setDuPlan] = useState(0);
  const [duReal, setDuReal] = useState(0);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState([]);
  const [modeloGrafico, setModeloGrafico] = useState(() => localStorage.getItem(LS_GRAFICO_MODELO) || 'combo');
  const [metricaGrafico, setMetricaGrafico] = useState(() => localStorage.getItem(LS_GRAFICO_METRICA) || 'todas');
  const [modoVisualizacao, setModoVisualizacao] = useState(() => localStorage.getItem(LS_GRAFICO_VISUALIZACAO) || 'absoluto');
  const mesVigente = isPeriodoMesVigente(periodoSelecionado);
  const mostraAvisoProjecaoMesVigente = mesVigente && duPlan > 0 && duReal > 0;

  const totais = useMemo(() => totalizar(dadosExport), [dadosExport]);
  const dadosGrafico = useMemo(() => {
    return dadosExport.map((item) => {
      const adicaoBrutaTendencia = Number(item.tendencia || 0);
      const churnTendencia = Number((mesVigente ? item.churnTendencia : item.churn) || 0);
      const adicaoLiquidaTendencia = adicaoBrutaTendencia - churnTendencia;
      const baseRef = Number(item.baseRef || 0);
      return {
        regional: item.regional,
        baseRef,
        adicaoBrutaTendencia,
        churnTendencia,
        adicaoLiquidaTendencia,
        adicaoBrutaPerc: baseRef > 0 ? adicaoBrutaTendencia / baseRef : 0,
        churnPerc: baseRef > 0 ? churnTendencia / baseRef : 0,
        adicaoLiquidaPerc: baseRef > 0 ? adicaoLiquidaTendencia / baseRef : 0
      };
    });
  }, [dadosExport, mesVigente]);

  const resumoTendencia = useMemo(() => {
    const adicaoBruta = Number(dadosGrafico.reduce((acc, i) => acc + (i.adicaoBrutaTendencia || 0), 0));
    const churn = Number(dadosGrafico.reduce((acc, i) => acc + (i.churnTendencia || 0), 0));
    const adicaoLiquida = adicaoBruta - churn;
    const baseRef = Number(dadosGrafico.reduce((acc, i) => acc + (i.baseRef || 0), 0));

    return {
      adicaoBruta,
      churn,
      adicaoLiquida,
      baseRef,
      adicaoBrutaPerc: baseRef > 0 ? adicaoBruta / baseRef : 0,
      churnPerc: baseRef > 0 ? churn / baseRef : 0,
      adicaoLiquidaPerc: baseRef > 0 ? adicaoLiquida / baseRef : 0
    };
  }, [dadosGrafico]);

  const chavesSerie = useMemo(() => ({
    adicaoBruta: modoVisualizacao === 'percentual' ? 'adicaoBrutaPerc' : 'adicaoBrutaTendencia',
    churn: modoVisualizacao === 'percentual' ? 'churnPerc' : 'churnTendencia',
    adicaoLiquida: modoVisualizacao === 'percentual' ? 'adicaoLiquidaPerc' : 'adicaoLiquidaTendencia'
  }), [modoVisualizacao]);

  useEffect(() => {
    localStorage.setItem(LS_GRAFICO_MODELO, modeloGrafico);
  }, [modeloGrafico]);

  useEffect(() => {
    localStorage.setItem(LS_GRAFICO_METRICA, metricaGrafico);
  }, [metricaGrafico]);

  useEffect(() => {
    localStorage.setItem(LS_GRAFICO_VISUALIZACAO, modoVisualizacao);
  }, [modoVisualizacao]);

  const carregarDoBanco = useCallback(async (periodo) => {
    if (!periodo) {
      setDadosExport([]);
      return;
    }

    try {
      setCarregando(true);
      setErro('');

      const [regionaisResp, vendasResp, churnResp, regrasResp] = await Promise.all([
        regionaisAPI.listar(),
        vendasMensaisAPI.listar(periodo),
        churnRegionaisAPI.listar({ periodo }),
        regrasComissaoAPI.listar()
      ]);

      const regionais = regionaisResp.data?.regionais || [];
      const vendas = vendasResp.data?.vendas || [];
      const churnRegistros = churnResp.data?.registros || [];
      const regras = (regrasResp.data?.regras || []).filter((r) => r.periodo === periodo);

      const regionalNomePorId = {};
      regionais.forEach((r) => {
        regionalNomePorId[r.id] = normalizarTexto(r.nome);
      });

      const metasPorRegional = {};
      regras.forEach((r) => {
        const tipo = extrairTipoMeta(r.tipoMeta);
        if (!metasPorRegional[r.regionalId]) {
          metasPorRegional[r.regionalId] = { metaAtivacoes: 0, metaChurn: 0 };
        }
        if (tipo === 'vendas') metasPorRegional[r.regionalId].metaAtivacoes = Number(r.meta1Volume) || 0;
        if (tipo === 'churn') metasPorRegional[r.regionalId].metaChurn = Number(r.meta1Volume) || 0;
      });

      const somaAtivacoesPorRegional = {};
      vendas.forEach((v) => {
        const id = v.regional_id || v.regionalId;
        if (!id) return;
        somaAtivacoesPorRegional[id] = (somaAtivacoesPorRegional[id] || 0) + (Number(v.vendas_volume) || 0);
      });

      const churnPorRegional = {};
      const baseRefPorRegional = {};
      churnRegistros.forEach((c) => {
        const id = c.regional_id || c.regionalId;
        if (!id) return;
        const canceladosChurn = Number(c.cancelados_churn ?? c.canceladosChurn ?? c.churn) || 0;
        const baseRef = Number(c.base_ref ?? c.baseRef) || 0;
        churnPorRegional[id] = (churnPorRegional[id] || 0) + canceladosChurn;
        baseRefPorRegional[id] = (baseRefPorRegional[id] || 0) + baseRef;
      });

      const duTotal = contarDiasUteisMes(periodo);
      const duPassado = contarDiasUteisPassados(periodo);

      const linhas = regionais.map((r) => {
        const regional = normalizarTexto(r.nome);
        const ativacoes = Number(somaAtivacoesPorRegional[r.id] || 0);
        const metaAtivacoes = Number(metasPorRegional[r.id]?.metaAtivacoes || 0);
        const metaChurn = Number(metasPorRegional[r.id]?.metaChurn || 0);
        const baseRefDerivadaMeta = metaChurn > 0 ? metaChurn / 0.01 : 0;
        const baseRef = Number(baseRefPorRegional[r.id] || 0) > 0
          ? Number(baseRefPorRegional[r.id] || 0)
          : baseRefDerivadaMeta;
        const churn = Number(churnPorRegional[r.id] || 0);
        const churnTendencia = duPassado > 0 ? (churn / duPassado) * duTotal : 0;
        const tendencia = duPassado > 0 ? (ativacoes / duPassado) * duTotal : 0;
        const realDia = duPassado > 0 ? ativacoes / duPassado : 0;
        const necDia = calcNecDia(metaAtivacoes, ativacoes, duTotal, duPassado);
        const gapAtivacoes = metaAtivacoes - tendencia;
        const adicaoBruta = ativacoes;
        const adicaoLiquida = ativacoes - churn;
        const percMeta = metaAtivacoes > 0 ? ativacoes / metaAtivacoes : 0;
        const percTendencia = metaAtivacoes > 0 ? tendencia / metaAtivacoes : 0;
        const percAB = baseRef > 0 ? adicaoBruta / baseRef : 0;
        const percChurn = baseRef > 0 ? churn / baseRef : 0;
        const percAL = baseRef > 0 ? adicaoLiquida / baseRef : 0;

        return {
          regional,
          metaAtivacoes,
          ativacoes,
          percMeta,
          tendencia,
          percTendencia,
          realDia,
          necDia,
          gapAtivacoes,
          baseRef,
          churn,
          churnTendencia,
          adicaoBruta,
          adicaoLiquida,
          percAB,
          percChurn,
          percAL
        };
      });

      const ordenada = linhas.sort((a, b) => {
        const ia = REGIONAL_ORDEM.indexOf(a.regional);
        const ib = REGIONAL_ORDEM.indexOf(b.regional);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return a.regional.localeCompare(b.regional, 'pt-BR');
      });

      setDadosExport(ordenada);
      setDuPlan(duTotal);
      setDuReal(duPassado);
    } catch (e) {
      setErro('Erro ao carregar dados do banco para Ativacoes e Churn.');
      setDadosExport([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const carregarPeriodos = async () => {
      try {
        const [vendasResp, churnResp, regrasResp] = await Promise.all([
          vendasMensaisAPI.listar(),
          churnRegionaisAPI.listar(),
          regrasComissaoAPI.listar()
        ]);

        const periodos = new Set();
        (vendasResp.data?.vendas || []).forEach((r) => r.periodo && periodos.add(r.periodo));
        (churnResp.data?.registros || []).forEach((r) => r.periodo && periodos.add(r.periodo));
        (regrasResp.data?.regras || []).forEach((r) => r.periodo && periodos.add(r.periodo));

        const ordenados = ordenarPeriodosCrescente(Array.from(periodos));
        setPeriodosDisponiveis(ordenados);
        if (ordenados.length > 0) {
          const ultimo = ordenados[ordenados.length - 1];
          setPeriodoSelecionado(ultimo);
          carregarDoBanco(ultimo);
        }
      } catch (e) {
        setErro('Erro ao carregar periodos disponiveis.');
      }
    };
    carregarPeriodos();
  }, [carregarDoBanco]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const onTrocaPeriodo = (valor) => {
    setPeriodoSelecionado(valor);
    carregarDoBanco(valor);
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
            <p style={{ fontSize: '12px', color: 'var(--primary)' }}>{perfil.toUpperCase()}</p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>Sair do Sistema</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Relatorio de Ativacoes e Churn</h1>
          <p>Visualizacao oficial com dados do banco para o periodo selecionado.</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <div className="glass-card ativacoes-churn-page">
          <div className="upload-row" style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '220px' }}>
              <label className="form-label" htmlFor="periodoRelatorio">Periodo</label>
              <select
                id="periodoRelatorio"
                className="form-select"
                value={periodoSelecionado}
                onChange={(e) => onTrocaPeriodo(e.target.value)}
              >
                <option value="">Selecione</option>
                {periodosDisponiveis.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => carregarDoBanco(periodoSelecionado)} disabled={!periodoSelecionado || carregando}>
              {carregando ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>

          {mostraAvisoProjecaoMesVigente && (
            <div className="alert alert-warning">
              <strong>Atencao: mes vigente com projecao.</strong> Tendencia de ativacoes/churn e adicao liquida usa
              projecao por dias uteis ({duReal}/{duPlan}) e pode gerar vies frente a meses encerrados.
            </div>
          )}

          {dadosExport.length > 0 && (
            <div className="tendencia-chart-card">
              <div className="tendencia-chart-header">
                <div>
                  <h3>Painel de Tendencia</h3>
                  <p>Adicao Bruta, Churn e Adicao Liquida por regional.</p>
                </div>
                <div className="tendencia-chart-filtros">
                  <div>
                    <label className="form-label">Modelo</label>
                    <select className="form-select" value={modeloGrafico} onChange={(e) => setModeloGrafico(e.target.value)}>
                      <option value="combo">Combo</option>
                      <option value="barras">Barras</option>
                      <option value="area">Area</option>
                      <option value="kpi">KPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Metrica</label>
                    <select className="form-select" value={metricaGrafico} onChange={(e) => setMetricaGrafico(e.target.value)}>
                      <option value="todas">Todas</option>
                      <option value="ab">Adicao Bruta</option>
                      <option value="churn">Churn</option>
                      <option value="al">Adicao Liquida</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Visualizacao</label>
                    <select className="form-select" value={modoVisualizacao} onChange={(e) => setModoVisualizacao(e.target.value)}>
                      <option value="absoluto">Absoluto</option>
                      <option value="percentual">Percentual</option>
                    </select>
                  </div>
                </div>
              </div>

              {modeloGrafico === 'kpi' ? (
                <div className="tendencia-kpis">
                  {(metricaGrafico === 'todas' || metricaGrafico === 'ab') && (
                    <div className="tendencia-kpi-item">
                      <span>{modoVisualizacao === 'percentual' ? 'Adicao Bruta (% da Base)' : 'Adicao Bruta (Tendencia)'}</span>
                      <strong>{modoVisualizacao === 'percentual' ? formatPercent(resumoTendencia.adicaoBrutaPerc) : formatNumero(resumoTendencia.adicaoBruta)}</strong>
                    </div>
                  )}
                  {(metricaGrafico === 'todas' || metricaGrafico === 'churn') && (
                    <div className="tendencia-kpi-item">
                      <span>{modoVisualizacao === 'percentual' ? 'Churn (% da Base)' : 'Churn (Tendencia)'}</span>
                      <strong>{modoVisualizacao === 'percentual' ? formatPercent(resumoTendencia.churnPerc) : formatNumero(resumoTendencia.churn)}</strong>
                    </div>
                  )}
                  {(metricaGrafico === 'todas' || metricaGrafico === 'al') && (
                    <div className="tendencia-kpi-item">
                      <span>{modoVisualizacao === 'percentual' ? 'Adicao Liquida (% da Base)' : 'Adicao Liquida (Tendencia)'}</span>
                      <strong>{modoVisualizacao === 'percentual' ? formatPercent(resumoTendencia.adicaoLiquidaPerc) : formatNumero(resumoTendencia.adicaoLiquida)}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="tendencia-chart-area">
                  <ResponsiveContainer width="100%" height={340}>
                    {modeloGrafico === 'area' ? (
                      <AreaChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="regional" interval={0} angle={-20} textAnchor="end" height={80} />
                        <YAxis tickFormatter={modoVisualizacao === 'percentual' ? (v) => formatPercent(v) : undefined} />
                        <Tooltip formatter={(valor) => (
                          modoVisualizacao === 'percentual'
                            ? formatPercent(Number(valor || 0))
                            : formatNumero(valor, 2)
                        )} />
                        <Legend />
                        {(metricaGrafico === 'todas' || metricaGrafico === 'ab') && (
                          <Area type="monotone" dataKey={chavesSerie.adicaoBruta} name={modoVisualizacao === 'percentual' ? 'Adicao Bruta (%)' : 'Adicao Bruta'} stroke="#2563eb" fill="#bfdbfe" />
                        )}
                        {(metricaGrafico === 'todas' || metricaGrafico === 'churn') && (
                          <Area type="monotone" dataKey={chavesSerie.churn} name={modoVisualizacao === 'percentual' ? 'Churn (%)' : 'Churn'} stroke="#dc2626" fill="#fecaca" />
                        )}
                        {(metricaGrafico === 'todas' || metricaGrafico === 'al') && (
                          <Area type="monotone" dataKey={chavesSerie.adicaoLiquida} name={modoVisualizacao === 'percentual' ? 'Adicao Liquida (%)' : 'Adicao Liquida'} stroke="#059669" fill="#a7f3d0" />
                        )}
                      </AreaChart>
                    ) : (
                      <ComposedChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="regional" interval={0} angle={-20} textAnchor="end" height={80} />
                        <YAxis tickFormatter={modoVisualizacao === 'percentual' ? (v) => formatPercent(v) : undefined} />
                        <Tooltip formatter={(valor) => (
                          modoVisualizacao === 'percentual'
                            ? formatPercent(Number(valor || 0))
                            : formatNumero(valor, 2)
                        )} />
                        <Legend />
                        {(metricaGrafico === 'todas' || metricaGrafico === 'ab') && (
                          <Bar dataKey={chavesSerie.adicaoBruta} name={modoVisualizacao === 'percentual' ? 'Adicao Bruta (%)' : 'Adicao Bruta'} fill="#2563eb" radius={[6, 6, 0, 0]} />
                        )}
                        {(metricaGrafico === 'todas' || metricaGrafico === 'churn') && (
                          <Bar dataKey={chavesSerie.churn} name={modoVisualizacao === 'percentual' ? 'Churn (%)' : 'Churn'} fill="#dc2626" radius={[6, 6, 0, 0]} />
                        )}
                        {(metricaGrafico === 'todas' || metricaGrafico === 'al') && (
                          modeloGrafico === 'combo'
                            ? <Line type="monotone" dataKey={chavesSerie.adicaoLiquida} name={modoVisualizacao === 'percentual' ? 'Adicao Liquida (%)' : 'Adicao Liquida'} stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
                            : <Bar dataKey={chavesSerie.adicaoLiquida} name={modoVisualizacao === 'percentual' ? 'Adicao Liquida (%)' : 'Adicao Liquida'} fill="#059669" radius={[6, 6, 0, 0]} />
                        )}
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {dadosExport.length === 0 ? (
            <div className="empty-state">{carregando ? 'Carregando dados...' : 'Sem dados para o periodo selecionado.'}</div>
          ) : (
            <div className="table-wrap">
              <table className="table-layout-excel">
                <tbody>
                  <tr className="row-header">
                    <td rowSpan={dadosExport.length + 2} className="col-bloco">ATIVACOES</td>
                    <td className="cell-header">Regional / Cidade / Filial</td>
                    <td className="cell-header">META</td>
                    <td className="cell-header">REALIZADO</td>
                    <td className="cell-header">%META</td>
                    <td className="cell-header">TENDENCIA</td>
                    <td className="cell-header">TENDENCIA %</td>
                    <td className="cell-header">REAL DIA</td>
                    <td className="cell-header">NEC. DIA</td>
                    <td className="cell-header">GAP</td>
                    <td className="cell-header" />
                    <td className="cell-header">TEND. ADIC. LIQ.</td>
                    <td className="cell-header col-side">Data</td>
                    <td className="col-side">{new Date().toLocaleDateString('pt-BR')}</td>
                    <td className="cell-header col-side">DIA UTL TOTAL</td>
                    <td className="col-side">{formatNumero(duPlan)}</td>
                  </tr>
                  {dadosExport.map((item, idx) => (
                    <tr key={`a-${item.regional}`}>
                      <td>{item.regional}</td>
                      <td>{formatNumero(item.metaAtivacoes)}</td>
                      <td>{formatNumero(item.ativacoes)}</td>
                      <td>{formatPercent(item.percMeta)}</td>
                      <td>{formatNumero(item.tendencia)}</td>
                      <td>{renderPercentualKpi(item.percTendencia)}</td>
                      <td>{formatNumero(item.realDia, 2)}</td>
                      <td>{formatNumero(item.necDia, 2)}</td>
                      <td>{formatNumero(item.gapAtivacoes)}</td>
                      <td />
                      <td>{formatNumero(item.tendencia - (mesVigente ? item.churnTendencia : item.churn))}</td>
                      {idx === 0 ? (
                        <>
                          <td className="cell-header col-side">DIA UTIL PASSADO</td>
                          <td className="col-side">{formatNumero(duReal)}</td>
                          <td className="col-side" colSpan={2} />
                        </>
                      ) : (
                        <td className="col-side" colSpan={4} />
                      )}
                    </tr>
                  ))}
                  <tr className="row-total">
                    <td className="cell-total-label">TOTAL</td>
                    <td>{formatNumero(totais.metaAtivacoes)}</td>
                    <td>{formatNumero(totais.ativacoes)}</td>
                    <td>{formatPercent(totais.metaAtivacoes > 0 ? totais.ativacoes / totais.metaAtivacoes : 0)}</td>
                    <td>{formatNumero(totais.tendencia)}</td>
                    <td>{renderPercentualKpi(totais.metaAtivacoes > 0 ? totais.tendencia / totais.metaAtivacoes : 0)}</td>
                    <td>{formatNumero(duReal > 0 ? totais.ativacoes / duReal : 0, 2)}</td>
                    <td>{formatNumero(calcNecDia(totais.metaAtivacoes, totais.ativacoes, duPlan, duReal), 2)}</td>
                    <td>{formatNumero(totais.metaAtivacoes - totais.tendencia)}</td>
                    <td />
                    <td>{formatNumero(totais.tendencia - (mesVigente ? totais.churnTendencia : totais.churn))}</td>
                    <td className="col-side" colSpan={4} />
                  </tr>

                  <tr><td colSpan={16}>&nbsp;</td></tr>

                  <tr className="row-header">
                    <td rowSpan={dadosExport.length + 2} className="col-bloco">CHURN</td>
                    <td className="cell-header">Regional / Cidade / Filial</td>
                    <td className="cell-header">META</td>
                    <td className="cell-header">CANCELADOS</td>
                    <td className="cell-header">%META</td>
                    <td className="cell-header">TENDENCIA</td>
                    <td className="cell-header">TENDENCIA %</td>
                    <td className="cell-header">REAL DIA</td>
                    <td className="cell-header">NEC. DIA</td>
                    <td className="cell-header">GAP</td>
                    <td colSpan={6} />
                  </tr>
                  {dadosExport.map((item) => (
                    (() => {
                      const metaChurn = (item.baseRef || 0) * 0.01;
                      const percMetaChurn = metaChurn > 0 ? (item.churn || 0) / metaChurn : 0;
                      const percTendenciaChurn = metaChurn > 0 ? (item.churnTendencia || 0) / metaChurn : 0;
                      const gapChurn = metaChurn - (item.churnTendencia || 0);
                      const necDiaChurn = calcNecDia(metaChurn, item.churn || 0, duPlan, duReal);
                      return (
                        <tr key={`c-${item.regional}`}>
                          <td>{item.regional}</td>
                          <td>{formatNumero(metaChurn, 2)}</td>
                          <td>{formatNumero(item.churn)}</td>
                          <td>{formatPercent(percMetaChurn)}</td>
                          <td>{formatNumero(item.churnTendencia)}</td>
                          <td>{renderPercentualKpi(percTendenciaChurn, { invertido: true })}</td>
                          <td>{formatNumero(duReal > 0 ? item.churn / duReal : 0, 2)}</td>
                          <td>{formatNumero(necDiaChurn, 2)}</td>
                          <td>{formatNumero(gapChurn, 2)}</td>
                          <td colSpan={6} />
                        </tr>
                      );
                    })()
                  ))}
                  <tr className="row-total">
                    <td className="cell-total-label">TOTAL</td>
                    <td>{formatNumero(totais.baseRef * 0.01, 2)}</td>
                    <td>{formatNumero(totais.churn)}</td>
                    <td>{formatPercent((totais.baseRef * 0.01) > 0 ? totais.churn / (totais.baseRef * 0.01) : 0)}</td>
                    <td>{formatNumero(totais.churnTendencia)}</td>
                    <td>{renderPercentualKpi((totais.baseRef * 0.01) > 0 ? totais.churnTendencia / (totais.baseRef * 0.01) : 0, { invertido: true })}</td>
                    <td>{formatNumero(duReal > 0 ? totais.churn / duReal : 0, 2)}</td>
                    <td>{formatNumero(calcNecDia(totais.baseRef * 0.01, totais.churn, duPlan, duReal), 2)}</td>
                    <td>{formatNumero((totais.baseRef * 0.01) - totais.churnTendencia, 2)}</td>
                    <td colSpan={6} />
                  </tr>

                  <tr><td colSpan={16}>&nbsp;</td></tr>

                  <tr className="row-header">
                    <td rowSpan={dadosExport.length + 2} className="col-bloco">ADICAO</td>
                    <td className="cell-header">Regional / Cidade / Filial</td>
                    <td className="cell-header">BASE REF.</td>
                    <td className="cell-header">ADIC. BRUTA</td>
                    <td className="cell-header">% A.B.</td>
                    <td className="cell-header">CHURN</td>
                    <td className="cell-header">% CHURN</td>
                    <td className="cell-header">ADIC. LIQ.</td>
                    <td className="cell-header">% A.L.</td>
                    <td colSpan={7} />
                  </tr>
                  {dadosExport.map((item) => (
                    (() => {
                      const adicaoBrutaExibida = mesVigente ? (item.tendencia || 0) : (item.adicaoBruta || 0);
                      const churnExibido = mesVigente ? (item.churnTendencia || 0) : (item.churn || 0);
                      const adicaoLiquidaExibida = adicaoBrutaExibida - churnExibido;
                      const percABExibido = item.baseRef > 0 ? adicaoBrutaExibida / item.baseRef : 0;
                      const percChurnExibido = item.baseRef > 0 ? churnExibido / item.baseRef : 0;
                      const percALExibido = item.baseRef > 0 ? adicaoLiquidaExibida / item.baseRef : 0;
                      return (
                        <tr key={`l-${item.regional}`}>
                          <td>{item.regional}</td>
                          <td>{formatNumero(item.baseRef)}</td>
                          <td>{formatNumero(adicaoBrutaExibida)}</td>
                          <td>{renderPercentualKpiAdicao('ab', percABExibido)}</td>
                          <td>{formatNumero(churnExibido)}</td>
                          <td>{renderPercentualKpiAdicao('churn', percChurnExibido)}</td>
                          <td>{formatNumero(adicaoLiquidaExibida)}</td>
                          <td>{renderPercentualKpiAdicao('al', percALExibido)}</td>
                          <td colSpan={7} />
                        </tr>
                      );
                    })()
                  ))}
                  <tr className="row-total">
                    {(() => {
                      const adicaoBrutaTotal = mesVigente ? (totais.tendencia || 0) : (totais.adicaoBruta || 0);
                      const churnTotal = mesVigente ? (totais.churnTendencia || 0) : (totais.churn || 0);
                      const adicaoLiquidaTotal = adicaoBrutaTotal - churnTotal;
                      const percABTotal = totais.baseRef > 0 ? adicaoBrutaTotal / totais.baseRef : 0;
                      const percChurnTotal = totais.baseRef > 0 ? churnTotal / totais.baseRef : 0;
                      const percALTotal = totais.baseRef > 0 ? adicaoLiquidaTotal / totais.baseRef : 0;
                      return (
                        <>
                          <td className="cell-total-label">TOTAL</td>
                          <td>{formatNumero(totais.baseRef)}</td>
                          <td>{formatNumero(adicaoBrutaTotal)}</td>
                          <td>{renderPercentualKpiAdicao('ab', percABTotal)}</td>
                          <td>{formatNumero(churnTotal)}</td>
                          <td>{renderPercentualKpiAdicao('churn', percChurnTotal)}</td>
                          <td>{formatNumero(adicaoLiquidaTotal)}</td>
                          <td>{renderPercentualKpiAdicao('al', percALTotal)}</td>
                          <td colSpan={7} />
                        </>
                      );
                    })()}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
