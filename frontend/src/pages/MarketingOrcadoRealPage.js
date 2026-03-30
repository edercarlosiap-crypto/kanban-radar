import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import { marketingAPI } from '../services/api';
import '../styles/MarketingOrcadoRealPage.css';

const MESES = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' }
];

const STATUS_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#64748b', '#0ea5e9'];

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const parseMoney = (value) => {
  const raw = String(value ?? '').replace(/\s/g, '').replace(/R\$/gi, '').replace(/[()]/g, '');
  if (!raw) return 0;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');

  if (hasComma && hasDot) {
    if (raw.lastIndexOf('.') > raw.lastIndexOf(',')) {
      const n = Number(raw.replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(raw.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  if (hasComma && !hasDot) {
    if (/,\d{3}$/.test(raw)) {
      const n = Number(raw.replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

const parseDateIso = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]) < 100 ? Number(`20${m[3]}`) : Number(m[3]);
    if (Number.isFinite(d) && Number.isFinite(mo) && Number.isFinite(y)) {
      return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getMesFromIso = (iso) => {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const mes = Number(m[2]);
  return Number.isFinite(mes) && mes >= 1 && mes <= 12 ? mes : null;
};

const getSelectedValues = (event) => Array.from(event.target.selectedOptions).map((opt) => opt.value);

const moeda = (value) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2
});

const percentual = (value) => `${Number(value || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}%`;

const detectarAnoOrcamento = (sheetName = '') => {
  const m = String(sheetName).match(/(20\d{2})/);
  if (!m) return null;
  return Number(m[1]);
};

const parseWorkbookMarketing = (workbook) => {
  const names = workbook.SheetNames || [];
  const lancSheetName = names.find((n) => normalize(n).includes('lanc'));
  const orcSheetName = names.find((n) => normalize(n).includes('orcamento'));

  if (!lancSheetName || !orcSheetName) {
    throw new Error('Nao foi possivel identificar as abas LANÇAMENTO e ORÇAMENTO_2026.');
  }

  const lancArr = XLSX.utils.sheet_to_json(workbook.Sheets[lancSheetName], { header: 1, defval: '' });
  const orcArr = XLSX.utils.sheet_to_json(workbook.Sheets[orcSheetName], { header: 1, defval: '' });

  const headerLancIdx = lancArr.findIndex((row) => normalize(row[0]) === 'regional' && normalize(row[1]).includes('tipo lancamento'));
  if (headerLancIdx < 0) throw new Error('Cabecalho da aba LANÇAMENTO nao encontrado.');

  const lancamentos = lancArr
    .slice(headerLancIdx + 1)
    .filter((row) => row.some((col) => String(col || '').trim()))
    .map((row) => {
      const dataInicio = parseDateIso(row[6]);
      const dataFim = parseDateIso(row[7]);
      const mesReferencia = getMesFromIso(dataInicio) || getMesFromIso(dataFim);
      return {
        regional: String(row[0] || '').trim(),
        tipoLancamento: String(row[1] || '').trim().toUpperCase(),
        tipoCusto: String(row[2] || '').trim(),
        patrocinador: String(row[3] || '').trim(),
        projeto: String(row[4] || '').trim(),
        valor: parseMoney(row[5]),
        dataInicio,
        dataFim,
        mesReferencia,
        status: String(row[8] || '').trim().toUpperCase(),
        observacoes: String(row[9] || '').trim()
      };
    })
    .filter((item) => item.regional || item.tipoCusto || item.projeto || item.valor);

  const headerOrcIdx = orcArr.findIndex((row) => normalize(row[1]) === '' && normalize(row[2]) === 'jan');
  const anoDetectado = detectarAnoOrcamento(orcSheetName);

  if (headerOrcIdx < 0) throw new Error('Cabecalho de meses da aba ORÇAMENTO_2026 nao encontrado.');

  const orcamentos = [];
  orcArr.slice(headerOrcIdx + 3).forEach((row) => {
    const categoria = String(row[1] || '').trim();
    if (!categoria) return;
    const categoriaNorm = normalize(categoria);
    if (categoriaNorm.includes('total mensal')) return;
    if (categoriaNorm.includes('acoes de marketing recorrentes')) return;

    for (let mes = 1; mes <= 12; mes += 1) {
      const valor = parseMoney(row[1 + mes]);
      orcamentos.push({
        categoria,
        mesReferencia: mes,
        valorOrcado: valor
      });
    }
  });

  return { lancamentos, orcamentos, anoDetectado };
};

export default function MarketingOrcadoRealPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [anos, setAnos] = useState([]);
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState({
    regionais: [],
    categorias: [],
    tiposLancamento: [],
    status: []
  });

  const [filtros, setFiltros] = useState({
    anoReferencia: '',
    mesCorte: new Date().getMonth() + 1,
    regionais: [],
    categorias: [],
    tiposLancamento: [],
    status: []
  });

  const [analytics, setAnalytics] = useState(null);
  const [registros, setRegistros] = useState([]);

  const [arquivoNome, setArquivoNome] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [substituirAno, setSubstituirAno] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const carregarAnos = async () => {
    const res = await marketingAPI.listarAnos();
    const anosApi = (res.data?.anos || []).filter(Boolean);
    setAnos(anosApi);
    if (!filtros.anoReferencia && anosApi.length) {
      setFiltros((prev) => ({ ...prev, anoReferencia: anosApi[anosApi.length - 1] }));
    }
  };

  const carregarFiltros = async (anoReferencia) => {
    if (!anoReferencia) return;
    const res = await marketingAPI.listarFiltros(anoReferencia);
    setFiltrosDisponiveis({
      regionais: res.data?.regionais || [],
      categorias: res.data?.categorias || [],
      tiposLancamento: res.data?.tiposLancamento || [],
      status: res.data?.status || []
    });
  };

  const montarParams = (base) => ({
    anoReferencia: base.anoReferencia,
    mesCorte: base.mesCorte,
    regionais: (base.regionais || []).join(','),
    categorias: (base.categorias || []).join(','),
    tiposLancamento: (base.tiposLancamento || []).join(','),
    status: (base.status || []).join(',')
  });

  const carregarDados = async (baseFiltros) => {
    if (!baseFiltros?.anoReferencia) return;
    const params = montarParams(baseFiltros);
    const [analyticsRes, lancRes] = await Promise.all([
      marketingAPI.analytics(params),
      marketingAPI.listarLancamentos({ ...params, limite: 800 })
    ]);
    setAnalytics(analyticsRes.data || null);
    setRegistros(lancRes.data?.registros || []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        setCarregando(true);
        await carregarAnos();
      } catch (e) {
        setErro(e?.response?.data?.erro || e.message || 'Erro ao carregar anos');
      } finally {
        setCarregando(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!filtros.anoReferencia) return;
    const run = async () => {
      try {
        setCarregando(true);
        await carregarFiltros(filtros.anoReferencia);
        const base = { ...filtros };
        await carregarDados(base);
      } catch (e) {
        setErro(e?.response?.data?.erro || e.message || 'Erro ao carregar painel de marketing');
      } finally {
        setCarregando(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.anoReferencia]);

  const aplicarFiltros = async () => {
    try {
      setCarregando(true);
      setErro('');
      setMensagem('');
      const base = { ...filtros };
      await carregarDados(base);
    } catch (e) {
      setErro(e?.response?.data?.erro || e.message || 'Erro ao aplicar filtros');
    } finally {
      setCarregando(false);
    }
  };

  const limparFiltrosAnaliticos = async () => {
    const base = {
      ...filtros,
      regionais: [],
      categorias: [],
      tiposLancamento: [],
      status: []
    };
    setFiltros(base);
    try {
      setCarregando(true);
      await carregarDados(base);
    } catch (e) {
      setErro(e?.response?.data?.erro || e.message || 'Erro ao limpar filtros');
    } finally {
      setCarregando(false);
    }
  };

  const processarArquivo = async (file) => {
    setErro('');
    setMensagem('');
    setImportPreview(null);
    if (!file) return;
    try {
      setArquivoNome(file.name || 'marketing.xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const { lancamentos, orcamentos, anoDetectado } = parseWorkbookMarketing(workbook);
      setImportPreview({ lancamentos, orcamentos, anoDetectado });
      if (anoDetectado) {
        setFiltros((prev) => ({ ...prev, anoReferencia: anoDetectado }));
      }
      setMensagem(`Planilha validada: ${lancamentos.length} lancamento(s) e ${orcamentos.length} linha(s) de orcamento.`);
    } catch (e) {
      setErro(`Erro ao processar planilha: ${e.message}`);
    }
  };

  const importarArquivo = async () => {
    if (!importPreview) {
      setErro('Selecione e valide uma planilha antes de importar.');
      return;
    }
    const anoRef = Number(filtros.anoReferencia || importPreview.anoDetectado);
    if (!Number.isFinite(anoRef)) {
      setErro('Defina o ano de referencia antes de importar.');
      return;
    }

    try {
      setCarregando(true);
      setErro('');
      const res = await marketingAPI.importar({
        anoReferencia: anoRef,
        origemArquivo: arquivoNome || 'orcado_real_marketing.xlsx',
        substituirAno,
        lancamentos: importPreview.lancamentos,
        orcamentos: importPreview.orcamentos
      });
      setMensagem(res.data?.mensagem || 'Importacao concluida.');
      setImportPreview(null);
      await carregarAnos();
      await carregarFiltros(anoRef);
      const base = { ...filtros, anoReferencia: anoRef };
      setFiltros(base);
      await carregarDados(base);
    } catch (e) {
      setErro(e?.response?.data?.erro || e.message || 'Erro ao importar planilha de marketing');
    } finally {
      setCarregando(false);
    }
  };

  const categoriasTop = useMemo(() => (analytics?.graficos?.categorias || []).slice(0, 12), [analytics]);
  const regionaisTop = useMemo(() => (analytics?.graficos?.regionais || []).slice(0, 10), [analytics]);
  const statusData = useMemo(() => analytics?.graficos?.status || [], [analytics]);

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
          <h1>Orcado x Real - Marketing</h1>
          <p>Painel gerencial com importacao da planilha, comparativos financeiros e alertas de budget.</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        <div className="glass-card marketing-import-card">
          <h3>Importacao da planilha</h3>
          <div className="marketing-import-row">
            <input type="file" accept=".xlsx,.xls" onChange={(e) => processarArquivo(e.target.files?.[0])} />
            <label className="marketing-check">
              <input
                type="checkbox"
                checked={substituirAno}
                onChange={(e) => setSubstituirAno(e.target.checked)}
              />
              Substituir dados do ano na nova importacao
            </label>
            <button className="btn btn-primary" onClick={importarArquivo} disabled={carregando || !importPreview}>
              {carregando ? 'Importando...' : 'Importar'}
            </button>
          </div>
          {importPreview && (
            <div className="marketing-import-preview">
              <span><strong>Ano detectado:</strong> {importPreview.anoDetectado || 'Nao identificado'}</span>
              <span><strong>Lancamentos:</strong> {importPreview.lancamentos.length}</span>
              <span><strong>Orcamento:</strong> {importPreview.orcamentos.length} linhas mensais</span>
            </div>
          )}
        </div>

        <div className="glass-card marketing-filter-card">
          <h3>Filtros de analise</h3>
          <div className="marketing-filters-grid">
            <div>
              <label>Ano</label>
              <select
                value={filtros.anoReferencia}
                onChange={(e) => setFiltros((p) => ({ ...p, anoReferencia: Number(e.target.value) }))}
              >
                <option value="">Selecione...</option>
                {anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
              </select>
            </div>

            <div>
              <label>Mes de corte (tendencia)</label>
              <select
                value={filtros.mesCorte}
                onChange={(e) => setFiltros((p) => ({ ...p, mesCorte: Number(e.target.value) }))}
              >
                {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label>Regionais (multi)</label>
              <select multiple value={filtros.regionais} onChange={(e) => setFiltros((p) => ({ ...p, regionais: getSelectedValues(e) }))}>
                {filtrosDisponiveis.regionais.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label>Categorias (multi)</label>
              <select multiple value={filtros.categorias} onChange={(e) => setFiltros((p) => ({ ...p, categorias: getSelectedValues(e) }))}>
                {filtrosDisponiveis.categorias.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label>Tipo de lancamento (multi)</label>
              <select multiple value={filtros.tiposLancamento} onChange={(e) => setFiltros((p) => ({ ...p, tiposLancamento: getSelectedValues(e) }))}>
                {filtrosDisponiveis.tiposLancamento.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label>Status (multi)</label>
              <select multiple value={filtros.status} onChange={(e) => setFiltros((p) => ({ ...p, status: getSelectedValues(e) }))}>
                {filtrosDisponiveis.status.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="marketing-filter-actions">
            <button className="btn btn-primary" onClick={aplicarFiltros} disabled={carregando || !filtros.anoReferencia}>
              Aplicar filtros
            </button>
            <button className="btn btn-secondary" onClick={limparFiltrosAnaliticos} disabled={carregando || !filtros.anoReferencia}>
              Limpar filtros
            </button>
          </div>
        </div>

        {analytics && (
          <>
            <div className="marketing-kpis">
              <div className="marketing-kpi-card">
                <span>Orcado anual</span>
                <strong>{moeda(analytics.kpis.totalOrcadoAnual)}</strong>
              </div>
              <div className="marketing-kpi-card">
                <span>Real acumulado</span>
                <strong>{moeda(analytics.kpis.totalReal)}</strong>
              </div>
              <div className="marketing-kpi-card">
                <span>Projetado pipeline</span>
                <strong>{moeda(analytics.kpis.totalProjetado)}</strong>
              </div>
              <div className="marketing-kpi-card">
                <span>Comprometido (Real + Projetado)</span>
                <strong>{moeda(analytics.kpis.totalComprometido)}</strong>
              </div>
              <div className="marketing-kpi-card">
                <span>Tendencia anual</span>
                <strong>{moeda(analytics.kpis.tendenciaAnual)}</strong>
              </div>
              <div className="marketing-kpi-card">
                <span>Saldo tendencia</span>
                <strong>{moeda(analytics.kpis.saldoTendencia)}</strong>
              </div>
              <div className="marketing-kpi-card">
                <span>% Execucao real</span>
                <strong>{percentual(analytics.kpis.taxaExecucaoReal)}</strong>
              </div>
              <div className="marketing-kpi-card">
                <span>% Execucao comprometida</span>
                <strong>{percentual(analytics.kpis.taxaExecucaoComprometida)}</strong>
              </div>
            </div>

            <div className="glass-card marketing-chart-card">
              <h3>Evolucao mensal: Orcado x Real x Projetado</h3>
              <div className="marketing-chart">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={analytics.graficos.mensal || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mesLabel" />
                    <YAxis />
                    <Tooltip formatter={(v) => moeda(v)} />
                    <Legend />
                    <Bar dataKey="orcado" fill="#94a3b8" name="Orcado" />
                    <Bar dataKey="real" fill="#2563eb" name="Real" />
                    <Bar dataKey="projetado" fill="#16a34a" name="Projetado" />
                    <Line type="monotone" dataKey="gapComprometido" stroke="#ef4444" strokeWidth={2} name="Gap comprometido" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="marketing-grid-2">
              <div className="glass-card marketing-chart-card">
                <h3>Orcado x Real por categoria</h3>
                <div className="marketing-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={categoriasTop}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="categoria" hide />
                      <YAxis />
                      <Tooltip formatter={(v) => moeda(v)} />
                      <Legend />
                      <Bar dataKey="orcado" fill="#94a3b8" name="Orcado" />
                      <Bar dataKey="real" fill="#2563eb" name="Real" />
                      <Bar dataKey="comprometido" fill="#16a34a" name="Comprometido" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card marketing-chart-card">
                <h3>Distribuicao por status (valor)</h3>
                <div className="marketing-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={statusData} dataKey="valor" nameKey="status" outerRadius={110} label={(d) => d.status}>
                        {statusData.map((entry, idx) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => moeda(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="marketing-grid-2">
              <div className="glass-card marketing-chart-card">
                <h3>Concentracao por regional</h3>
                <div className="marketing-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={regionaisTop}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="regional" hide />
                      <YAxis />
                      <Tooltip formatter={(v) => moeda(v)} />
                      <Legend />
                      <Bar dataKey="real" fill="#2563eb" name="Real" />
                      <Bar dataKey="projetado" fill="#16a34a" name="Projetado" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card marketing-op-card">
                <h3>Oportunidades e alertas</h3>
                <ul>
                  {(analytics.oportunidades || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
                <div className="marketing-badge-row">
                  <span className="marketing-badge">Ano: {analytics.kpis.anoReferencia}</span>
                  <span className="marketing-badge">Mes de corte: {MESES.find((m) => m.value === analytics.kpis.mesCorte)?.label || analytics.kpis.mesCorte}</span>
                  <span className="marketing-badge">Lancamentos analisados: {analytics.kpis.totalLancamentos}</span>
                </div>
              </div>
            </div>

            <div className="glass-card marketing-table-card">
              <h3>Detalhamento por categoria</h3>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Orcado</th>
                      <th>Real</th>
                      <th>Projetado</th>
                      <th>Comprometido</th>
                      <th>% Execucao Real</th>
                      <th>% Execucao Comprometida</th>
                      <th>Saldo Comprometido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics.graficos.categorias || []).map((item) => (
                      <tr key={item.categoria}>
                        <td>{item.categoria}</td>
                        <td>{moeda(item.orcado)}</td>
                        <td>{moeda(item.real)}</td>
                        <td>{moeda(item.projetado)}</td>
                        <td>{moeda(item.comprometido)}</td>
                        <td>{percentual(item.execucaoReal)}</td>
                        <td>{percentual(item.execucaoComprometida)}</td>
                        <td className={item.saldoComprometido < 0 ? 'negativo' : 'positivo'}>
                          {moeda(item.saldoComprometido)}
                        </td>
                      </tr>
                    ))}
                    {!(analytics.graficos.categorias || []).length && (
                      <tr>
                        <td colSpan={8} className="retencao-vazio">{carregando ? 'Carregando...' : 'Sem dados para os filtros selecionados'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card marketing-table-card">
              <h3>Amostra de lancamentos ({registros.length})</h3>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Regional</th>
                      <th>Tipo</th>
                      <th>Categoria</th>
                      <th>Projeto/Evento</th>
                      <th>Patrocinador</th>
                      <th>Status</th>
                      <th>Valor</th>
                      <th>Data inicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r) => (
                      <tr key={r.id}>
                        <td>{r.regional || '-'}</td>
                        <td>{r.tipo_lancamento || '-'}</td>
                        <td>{r.tipo_custo || '-'}</td>
                        <td>{r.projeto || '-'}</td>
                        <td>{r.patrocinador || '-'}</td>
                        <td>{r.status || '-'}</td>
                        <td>{moeda(r.valor)}</td>
                        <td>{r.data_inicio || '-'}</td>
                      </tr>
                    ))}
                    {!registros.length && (
                      <tr>
                        <td colSpan={8} className="retencao-vazio">{carregando ? 'Carregando...' : 'Nenhum lancamento encontrado'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
