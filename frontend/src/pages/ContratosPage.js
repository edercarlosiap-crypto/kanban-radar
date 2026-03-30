import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import { contratosAPI } from '../services/api';
import '../styles/ContratosPage.css';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (v) => Number(v || 0).toLocaleString('pt-BR');
const CORES_GRAFICO_SEGMENTO = ['#0ea5e9', '#2563eb', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#84cc16', '#f97316'];
const CACHE_MAX_ENTRADAS = 30;
const criarFiltrosIniciais = () => ({
  periodo: '',
  filial: '',
  status: '',
  statusAcesso: '',
  base: '',
  segmentos: [],
  area: '',
  naturezasReceita: []
});

const normalizarFiltrosComparacao = (filtro = {}) => JSON.stringify({
  periodo: filtro.periodo || '',
  filial: filtro.filial || '',
  status: filtro.status || '',
  statusAcesso: filtro.statusAcesso || '',
  base: filtro.base || '',
  area: filtro.area || '',
  segmentos: [...(filtro.segmentos || [])].sort(),
  naturezasReceita: [...(filtro.naturezasReceita || [])].sort()
});

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

const toPeriodo = (monthValue) => {
  if (!String(monthValue || '').trim()) return '';
  const [ano, mes] = String(monthValue).split('-');
  if (!ano || !mes) return '';
  return `${mes}/${String(ano).slice(-2)}`;
};

const mapRows = (rows) => rows
  .map((row) => ({
    empresa: pickValue(row, ['empresa']),
    filial: pickValue(row, ['filial']),
    contratoId: pickValue(row, ['id contrato']),
    clienteId: pickValue(row, ['id cliente']),
    tipoAssinante: pickValue(row, ['tipo assinante']),
    tipoCliente: pickValue(row, ['tipo cliente']),
    origem: pickValue(row, ['origem']),
    status: pickValue(row, ['status']),
    statusAcesso: pickValue(row, ['status acesso']),
    base: pickValue(row, ['base']),
    descricaoServico: pickValue(row, ['descricao']),
    tipoProduto: pickValue(row, ['tipo']),
    tipoContrato: pickValue(row, ['tipo contrato']),
    tipoCobranca: pickValue(row, ['tipo cobranca']),
    carteiraCobranca: pickValue(row, ['carteira cobranca']),
    vendedor: pickValue(row, ['vendedor']),
    valor: pickValue(row, ['valor']),
    cidade: pickValue(row, ['cidade']),
    uf: pickValue(row, ['uf']),
    dtCriacaoContrato: pickValue(row, ['dt criacao']),
    dtAtivacao: pickValue(row, ['dt ativacao']),
    dtCancelamento: pickValue(row, ['dt cancelamento'])
  }))
  .filter((r) => String(r.filial || '').trim() && String(r.tipoAssinante || '').trim());

export default function ContratosPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const cacheConsultasRef = useRef(new Map());
  const cacheMetaRef = useRef({ periodos: null, opcoes: null });

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipoGraficoSegmento, setTipoGraficoSegmento] = useState('bar');
  const [arquivoNome, setArquivoNome] = useState('');
  const [pendentes, setPendentes] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [opcoes, setOpcoes] = useState({ filiais: [], status: [], statusAcessos: [], bases: [], segmentos: [], areas: [], naturezasReceita: [] });
  const [analytics, setAnalytics] = useState({
    resumo: {},
    receitaPorSegmento: [],
    receitaPorArea: [],
    receitaPorNaturezaReceita: []
  });
  const [registros, setRegistros] = useState([]);
  const [mesReferencia, setMesReferencia] = useState('');
  const [filtros, setFiltros] = useState(criarFiltrosIniciais);
  const [filtrosAplicados, setFiltrosAplicados] = useState(criarFiltrosIniciais);

  const paramsConsulta = useMemo(() => ({
    periodo: filtrosAplicados.periodo || undefined,
    filial: filtrosAplicados.filial || undefined,
    status: filtrosAplicados.status || undefined,
    statusAcesso: filtrosAplicados.statusAcesso || undefined,
    base: filtrosAplicados.base || undefined,
    segmentos: filtrosAplicados.segmentos.length ? filtrosAplicados.segmentos.join(',') : undefined,
    area: filtrosAplicados.area || undefined,
    naturezasReceita: filtrosAplicados.naturezasReceita.length ? filtrosAplicados.naturezasReceita.join(',') : undefined
  }), [
    filtrosAplicados.periodo,
    filtrosAplicados.filial,
    filtrosAplicados.status,
    filtrosAplicados.statusAcesso,
    filtrosAplicados.base,
    filtrosAplicados.segmentos,
    filtrosAplicados.area,
    filtrosAplicados.naturezasReceita
  ]);

  const temFiltrosPendentes = useMemo(
    () => normalizarFiltrosComparacao(filtros) !== normalizarFiltrosComparacao(filtrosAplicados),
    [filtros, filtrosAplicados]
  );
  const chaveConsulta = useMemo(
    () => normalizarFiltrosComparacao(filtrosAplicados),
    [filtrosAplicados]
  );

  const carregar = async () => {
    try {
      setCarregando(true);
      const cacheMeta = cacheMetaRef.current;
      const cacheConsulta = cacheConsultasRef.current.get(chaveConsulta);

      if (cacheMeta.periodos && cacheMeta.opcoes && cacheConsulta) {
        setPeriodos(cacheMeta.periodos);
        setOpcoes(cacheMeta.opcoes);
        setAnalytics(cacheConsulta.analytics);
        setRegistros(cacheConsulta.registros);
        setErro('');
        return;
      }

      const precisaMeta = !cacheMeta.periodos || !cacheMeta.opcoes;
      const precisaConsulta = !cacheConsulta;

      const [resPeriodos, resFiltros, resAnalytics, resRegistros] = await Promise.all([
        precisaMeta ? contratosAPI.listarPeriodos() : Promise.resolve(null),
        precisaMeta ? contratosAPI.listarFiltros() : Promise.resolve(null),
        precisaConsulta ? contratosAPI.analytics(paramsConsulta) : Promise.resolve(null),
        precisaConsulta ? contratosAPI.listar(paramsConsulta) : Promise.resolve(null)
      ]);

      if (precisaMeta) {
        const periodosNovos = resPeriodos?.data?.periodos || [];
        const opcoesNovas = {
          filiais: resFiltros?.data?.filiais || [],
          status: resFiltros?.data?.status || [],
          statusAcessos: resFiltros?.data?.statusAcessos || [],
          bases: resFiltros?.data?.bases || [],
          segmentos: resFiltros?.data?.segmentos || [],
          areas: resFiltros?.data?.areas || [],
          naturezasReceita: resFiltros?.data?.naturezasReceita || []
        };
        cacheMetaRef.current = {
          periodos: periodosNovos,
          opcoes: opcoesNovas
        };
        setPeriodos(periodosNovos);
        setOpcoes(opcoesNovas);
      } else {
        setPeriodos(cacheMeta.periodos);
        setOpcoes(cacheMeta.opcoes);
      }

      if (precisaConsulta) {
        const analyticsNovos = {
          resumo: resAnalytics?.data?.resumo || {},
          receitaPorSegmento: resAnalytics?.data?.receitaPorSegmento || [],
          receitaPorArea: resAnalytics?.data?.receitaPorArea || [],
          receitaPorNaturezaReceita: resAnalytics?.data?.receitaPorNaturezaReceita || []
        };
        const registrosNovos = resRegistros?.data?.registros || [];

        const cache = cacheConsultasRef.current;
        if (cache.has(chaveConsulta)) cache.delete(chaveConsulta);
        cache.set(chaveConsulta, { analytics: analyticsNovos, registros: registrosNovos });
        while (cache.size > CACHE_MAX_ENTRADAS) {
          const chaveMaisAntiga = cache.keys().next().value;
          cache.delete(chaveMaisAntiga);
        }

        setAnalytics(analyticsNovos);
        setRegistros(registrosNovos);
      } else {
        setAnalytics(cacheConsulta.analytics);
        setRegistros(cacheConsulta.registros);
      }
      setErro('');
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Erro ao carregar dados de contratos');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsConsulta]);

  const processarArquivo = async (file) => {
    setErro('');
    setMensagem('');
    if (!file) return;
    setArquivoNome(file.name || 'contratos.xlsx');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const primeiraAba = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { defval: '' });
      const mapped = mapRows(rows);

      if (!mapped.length) {
        setErro('Nao foi possivel identificar os campos obrigatorios da planilha de contratos.');
        return;
      }

      setPendentes(mapped);
      setMensagem(`${mapped.length} registro(s) preparado(s) para importacao.`);
    } catch (e) {
      setErro(`Erro ao ler planilha: ${e.message}`);
    }
  };

  const importar = async () => {
    setErro('');
    setMensagem('');

    const periodoReferencia = toPeriodo(mesReferencia);
    if (!periodoReferencia) {
      setErro('Defina o mes de referencia para a importacao.');
      return;
    }
    if (!pendentes.length) {
      setErro('Nenhum registro preparado para importar.');
      return;
    }

    try {
      setCarregando(true);
      const TAMANHO_LOTE = 500;
      let sucesso = 0;
      let falhas = 0;
      let removidosPeriodo = 0;
      const erros = [];

      for (let i = 0; i < pendentes.length; i += TAMANHO_LOTE) {
        const lote = pendentes.slice(i, i + TAMANHO_LOTE);
        const res = await contratosAPI.importar(
          lote,
          periodoReferencia,
          arquivoNome || 'contratos.xlsx',
          i === 0
        );
        sucesso += Number(res.data?.sucesso || 0);
        falhas += Number(res.data?.falhas || 0);
        removidosPeriodo += Number(res.data?.removidosPeriodo || 0);
        if (Array.isArray(res.data?.erros) && res.data.erros.length) {
          erros.push(...res.data.erros);
        }
      }

      setMensagem(`Importacao concluida: ${sucesso} OK, ${falhas} falha(s). ${removidosPeriodo ? `${removidosPeriodo} registro(s) anterior(es) removido(s) do periodo.` : ''}`.trim());
      setErro(erros.length ? erros.slice(0, 30).join(' | ') : '');
      setPendentes([]);
      cacheConsultasRef.current.clear();
      cacheMetaRef.current = { periodos: null, opcoes: null };
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Erro ao importar contratos');
    } finally {
      setCarregando(false);
    }
  };

  const receitaPorSegmento = useMemo(
    () => analytics.receitaPorSegmento || [],
    [analytics.receitaPorSegmento]
  );
  const receitaPorArea = useMemo(
    () => analytics.receitaPorArea || [],
    [analytics.receitaPorArea]
  );
  const receitaPorNaturezaReceita = useMemo(
    () => analytics.receitaPorNaturezaReceita || [],
    [analytics.receitaPorNaturezaReceita]
  );
  const totalReceita = Number(analytics?.resumo?.totalReceita || 0);

  const aberturaSegmento = useMemo(
    () => receitaPorSegmento.map((item) => ({
      ...item,
      participacao: totalReceita > 0 ? (Number(item.receita || 0) / totalReceita) * 100 : 0
    })),
    [receitaPorSegmento, totalReceita]
  );
  const aberturaArea = useMemo(
    () => receitaPorArea.map((item) => ({
      ...item,
      participacao: totalReceita > 0 ? (Number(item.receita || 0) / totalReceita) * 100 : 0
    })),
    [receitaPorArea, totalReceita]
  );
  const aberturaNaturezaReceita = useMemo(
    () => receitaPorNaturezaReceita.map((item) => ({
      ...item,
      participacao: totalReceita > 0 ? (Number(item.receita || 0) / totalReceita) * 100 : 0
    })),
    [receitaPorNaturezaReceita, totalReceita]
  );

  const toggleSegmento = (segmento) => {
    setFiltros((prev) => {
      const selecionados = new Set(prev.segmentos || []);
      if (selecionados.has(segmento)) selecionados.delete(segmento);
      else selecionados.add(segmento);
      return { ...prev, segmentos: Array.from(selecionados) };
    });
  };

  const toggleNaturezaReceita = (natureza) => {
    setFiltros((prev) => {
      const selecionados = new Set(prev.naturezasReceita || []);
      if (selecionados.has(natureza)) selecionados.delete(natureza);
      else selecionados.add(natureza);
      return { ...prev, naturezasReceita: Array.from(selecionados) };
    });
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados({
      periodo: filtros.periodo || '',
      filial: filtros.filial || '',
      status: filtros.status || '',
      statusAcesso: filtros.statusAcesso || '',
      base: filtros.base || '',
      segmentos: [...(filtros.segmentos || [])],
      area: filtros.area || '',
      naturezasReceita: [...(filtros.naturezasReceita || [])]
    });
  };

  const limparFiltros = () => {
    const filtrosLimpos = criarFiltrosIniciais();
    setFiltros(filtrosLimpos);
    setFiltrosAplicados(filtrosLimpos);
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
          <h1>Analise de Contratos</h1>
          <p>Abertura de receita por segmento e filtros operacionais da base de contratos.</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>Importacao da base de contratos</h3>
          <div className="contratos-actions">
            <input type="file" accept=".xlsx,.xls" onChange={(e) => processarArquivo(e.target.files?.[0])} />
            <input
              type="month"
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              title="Mes de referencia"
            />
            <button className="btn btn-primary" onClick={importar} disabled={carregando}>
              {carregando ? 'Importando...' : 'Importar'}
            </button>
          </div>
          <small>Registros preparados: {numero(pendentes.length)}</small>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>Filtros</h3>
          <div className="contratos-filtros">
            <select value={filtros.periodo} onChange={(e) => setFiltros((f) => ({ ...f, periodo: e.target.value }))}>
              <option value="">Todos os periodos</option>
              {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filtros.filial} onChange={(e) => setFiltros((f) => ({ ...f, filial: e.target.value }))}>
              <option value="">Todas as filiais</option>
              {opcoes.filiais.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Todos os status</option>
              {opcoes.status.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={filtros.statusAcesso} onChange={(e) => setFiltros((f) => ({ ...f, statusAcesso: e.target.value }))}>
              <option value="">Todos os status de acesso</option>
              {opcoes.statusAcessos.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={filtros.base} onChange={(e) => setFiltros((f) => ({ ...f, base: e.target.value }))}>
              <option value="">Todas as bases</option>
              {opcoes.bases.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={filtros.area} onChange={(e) => setFiltros((f) => ({ ...f, area: e.target.value }))}>
              <option value="">Rural + Urbano</option>
              {opcoes.areas.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="contratos-segmento-box">
            <div className="contratos-segmento-header">
              <strong>Segmentos (multi-selecao)</strong>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFiltros((f) => ({ ...f, segmentos: [] }))}
                disabled={!filtros.segmentos.length}
              >
                Limpar segmentos
              </button>
            </div>
            <div className="contratos-segmentos">
              {opcoes.segmentos.map((seg) => (
                <label key={seg} className="contratos-segmento-item">
                  <input
                    type="checkbox"
                    checked={filtros.segmentos.includes(seg)}
                    onChange={() => toggleSegmento(seg)}
                  />
                  <span>{seg}</span>
                </label>
              ))}
            </div>
            <small>Selecionados: {numero(filtros.segmentos.length)}</small>
          </div>
          <div className="contratos-segmento-box">
            <div className="contratos-segmento-header">
              <strong>Natureza da receita (multi-selecao)</strong>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFiltros((f) => ({ ...f, naturezasReceita: [] }))}
                disabled={!filtros.naturezasReceita.length}
              >
                Limpar naturezas
              </button>
            </div>
            <div className="contratos-segmentos">
              {opcoes.naturezasReceita.map((natureza) => (
                <label key={natureza} className="contratos-segmento-item">
                  <input
                    type="checkbox"
                    checked={filtros.naturezasReceita.includes(natureza)}
                    onChange={() => toggleNaturezaReceita(natureza)}
                  />
                  <span>{natureza}</span>
                </label>
              ))}
            </div>
            <small>Selecionados: {numero(filtros.naturezasReceita.length)}</small>
          </div>
          <div className="contratos-filtros-acoes">
            <button
              type="button"
              className="btn btn-primary"
              onClick={aplicarFiltros}
              disabled={!temFiltrosPendentes || carregando}
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={limparFiltros}
              disabled={carregando}
            >
              Limpar tudo
            </button>
          </div>
        </div>

        <div className="contratos-kpis">
          <div className="contratos-kpi-card">
            <span>Total de contratos</span>
            <strong>{numero(analytics?.resumo?.totalContratos || 0)}</strong>
          </div>
          <div className="contratos-kpi-card">
            <span>Receita total</span>
            <strong>{moeda(analytics?.resumo?.totalReceita || 0)}</strong>
          </div>
          <div className="contratos-kpi-card">
            <span>Ticket medio</span>
            <strong>{moeda(analytics?.resumo?.ticketMedio || 0)}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <div className="contratos-chart-header">
            <h3>Abertura de receita por segmento</h3>
            <select
              value={tipoGraficoSegmento}
              onChange={(e) => setTipoGraficoSegmento(e.target.value)}
              className="form-select contratos-chart-type-select"
            >
              <option value="bar">Barras</option>
              <option value="line">Linha</option>
              <option value="area">Area</option>
              <option value="pie">Pizza</option>
              <option value="donut">Rosca</option>
            </select>
          </div>
          <div className="contratos-chart">
            {tipoGraficoSegmento === 'bar' && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={aberturaSegmento}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segmento" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => (name === 'receita' ? moeda(value) : numero(value))} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="#0ea5e9" />
                  <Bar dataKey="contratos" name="Contratos" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {tipoGraficoSegmento === 'line' && (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={aberturaSegmento}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segmento" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => (name === 'receita' ? moeda(value) : numero(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="receita" name="Receita" stroke="#0ea5e9" strokeWidth={2} />
                  <Line type="monotone" dataKey="contratos" name="Contratos" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
            {tipoGraficoSegmento === 'area' && (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={aberturaSegmento}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segmento" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => (name === 'receita' ? moeda(value) : numero(value))} />
                  <Legend />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="contratos" name="Contratos" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {tipoGraficoSegmento === 'pie' && (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Tooltip formatter={(value) => moeda(value)} />
                  <Legend />
                  <Pie
                    data={aberturaSegmento}
                    dataKey="receita"
                    nameKey="segmento"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {aberturaSegmento.map((item, index) => (
                      <Cell key={`${item.segmento}-${index}`} fill={CORES_GRAFICO_SEGMENTO[index % CORES_GRAFICO_SEGMENTO.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            {tipoGraficoSegmento === 'donut' && (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Tooltip formatter={(value) => moeda(value)} />
                  <Legend />
                  <Pie
                    data={aberturaSegmento}
                    dataKey="receita"
                    nameKey="segmento"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={110}
                    label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {aberturaSegmento.map((item, index) => (
                      <Cell key={`${item.segmento}-${index}`} fill={CORES_GRAFICO_SEGMENTO[index % CORES_GRAFICO_SEGMENTO.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>Detalhamento por segmento</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Segmento</th>
                  <th>Contratos</th>
                  <th>Receita</th>
                  <th>Participacao</th>
                </tr>
              </thead>
              <tbody>
                {aberturaSegmento.map((item) => (
                  <tr key={item.segmento}>
                    <td>{item.segmento}</td>
                    <td>{numero(item.contratos)}</td>
                    <td>{moeda(item.receita)}</td>
                    <td>{Number(item.participacao || 0).toFixed(2)}%</td>
                  </tr>
                ))}
                {!aberturaSegmento.length && (
                  <tr>
                    <td colSpan={4} className="retencao-vazio">
                      {carregando ? 'Carregando...' : 'Nenhum dado encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>Detalhamento por area (Rural x Urbano)</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Contratos</th>
                  <th>Receita</th>
                  <th>Participacao</th>
                </tr>
              </thead>
              <tbody>
                {aberturaArea.map((item) => (
                  <tr key={item.area}>
                    <td>{item.area}</td>
                    <td>{numero(item.contratos)}</td>
                    <td>{moeda(item.receita)}</td>
                    <td>{Number(item.participacao || 0).toFixed(2)}%</td>
                  </tr>
                ))}
                {!aberturaArea.length && (
                  <tr>
                    <td colSpan={4} className="retencao-vazio">
                      {carregando ? 'Carregando...' : 'Nenhum dado encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>Detalhamento por natureza de receita (Pago x Permuta)</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Natureza</th>
                  <th>Contratos</th>
                  <th>Receita</th>
                  <th>Participacao</th>
                </tr>
              </thead>
              <tbody>
                {aberturaNaturezaReceita.map((item) => (
                  <tr key={item.naturezaReceita}>
                    <td>{item.naturezaReceita}</td>
                    <td>{numero(item.contratos)}</td>
                    <td>{moeda(item.receita)}</td>
                    <td>{Number(item.participacao || 0).toFixed(2)}%</td>
                  </tr>
                ))}
                {!aberturaNaturezaReceita.length && (
                  <tr>
                    <td colSpan={4} className="retencao-vazio">
                      {carregando ? 'Carregando...' : 'Nenhum dado encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card">
          <h3>Top contratos por valor (amostra)</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Filial</th>
                  <th>Segmento</th>
                  <th>Area</th>
                  <th>Natureza</th>
                  <th>Contrato</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((item, idx) => (
                  <tr key={`${item.contrato_id || 'sem'}-${idx}`}>
                    <td>{item.filial || '-'}</td>
                    <td>{item.segmento || 'Sem segmento'}</td>
                    <td>{item.area_classificacao || 'Nao classificado'}</td>
                    <td>{item.natureza_receita || 'Nao classificado'}</td>
                    <td>{item.contrato_id || '-'}</td>
                    <td>{item.tipo_produto || '-'}</td>
                    <td>{item.status || '-'}</td>
                    <td>{moeda(item.valor)}</td>
                  </tr>
                ))}
                {!registros.length && (
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
