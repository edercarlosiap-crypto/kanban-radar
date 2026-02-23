import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { radarAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import RelatoriosTabs from '../components/RelatoriosTabs';

const CHART_TYPES = [
  { value: 'bar', label: 'Barra' },
  { value: 'line', label: 'Linha' },
  { value: 'pie', label: 'Pizza' },
  { value: 'area', label: 'Area' }
];

const METRICS = [
  { value: 'COUNT', label: 'COUNT (quantidade de cards)' },
  { value: 'AVG', label: 'AVG (tempo medio)' },
  { value: 'SUM', label: 'SUM' },
  { value: 'MAX', label: 'MAX' },
  { value: 'MIN', label: 'MIN' }
];

const DIMENSIONS = [
  { key: 'camada', label: 'Camada' },
  { key: 'prioridade', label: 'Prioridade Camada 1' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'responsavel', label: 'Responsavel' },
  { key: 'kanban', label: 'Kanban' },
  { key: 'statusRadar', label: 'Status' }
];

const FILTER_FIELDS = [
  { key: 'camada', label: 'Camada' },
  { key: 'prioridade', label: 'Prioridade Camada 1' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'responsavel', label: 'Responsavel' },
  { key: 'kanban', label: 'Kanban' },
  { key: 'statusRadar', label: 'Status' }
];

const STORAGE_KEY = 'radarPro.dynamicCharts';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5AC8FA', '#AF52DE', '#FF2D55'];

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const calcTempoBase = (item, base) => {
  const inicio = toDate(item.dataCriacao);
  const fim = toDate(item.concluirAte);
  if (base === 'prazoTotal' && inicio && fim) {
    return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
  }
  if (base === 'diasRestantes' && item.diasRestantes !== null && item.diasRestantes !== undefined) {
    return Number(item.diasRestantes);
  }
  return null;
};

const normalizeValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Nao informado';
  return String(value);
};

const loadSavedCharts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCharts = (charts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
};

export default function RelatoriosConstrutor() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canImportar = ['editor', 'gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';

  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [chartType, setChartType] = useState('bar');
  const [eixoX, setEixoX] = useState('camada');
  const [metric, setMetric] = useState('COUNT');
  const [metricBase, setMetricBase] = useState('prazoTotal');
  const [filtrosSelecionados, setFiltrosSelecionados] = useState({});
  const [filtrosAplicados, setFiltrosAplicados] = useState({});
  const [savedCharts, setSavedCharts] = useState(loadSavedCharts());
  const [nomeConfig, setNomeConfig] = useState('');
  const [configSelecionada, setConfigSelecionada] = useState('');
  const chartRef = useRef(null);

  useEffect(() => {
    const carregarItens = async () => {
      try {
        setCarregando(true);
        const response = await radarAPI.listar();
        setItens(response.data.itens || []);
        setErro('');
      } catch (e) {
        setErro(e.response?.data?.erro || 'Erro ao carregar dados do radar');
      } finally {
        setCarregando(false);
      }
    };

    carregarItens();
  }, []);

  const dimensoesDisponiveis = useMemo(() => {
    const keysPresentes = new Set();
    itens.forEach((item) => {
      DIMENSIONS.forEach((dim) => {
        if (item[dim.key]) keysPresentes.add(dim.key);
      });
    });
    return DIMENSIONS.filter((dim) => keysPresentes.has(dim.key) || dim.key === 'camada');
  }, [itens]);

  useEffect(() => {
    if (!dimensoesDisponiveis.find((dim) => dim.key === eixoX)) {
      setEixoX(dimensoesDisponiveis[0]?.key || 'camada');
    }
  }, [dimensoesDisponiveis, eixoX]);

  const opcoesFiltros = useMemo(() => {
    const mapa = {};
    FILTER_FIELDS.forEach((field) => {
      mapa[field.key] = Array.from(new Set(itens.map((item) => item[field.key]).filter(Boolean)));
    });
    return mapa;
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      return Object.entries(filtrosAplicados).every(([key, valores]) => {
        if (!valores || valores.length === 0) return true;
        return valores.includes(item[key]);
      });
    });
  }, [itens, filtrosAplicados]);

  const dadosGrafico = useMemo(() => {
    const agrupado = {};
    itensFiltrados.forEach((item) => {
      const chave = normalizeValue(item[eixoX]);
      if (!agrupado[chave]) {
        agrupado[chave] = { name: chave, valores: [] };
      }
      agrupado[chave].valores.push(item);
    });

    return Object.values(agrupado).map((grupo) => {
      if (metric === 'COUNT') {
        return { name: grupo.name, value: grupo.valores.length };
      }

      const tempos = grupo.valores
        .map((item) => calcTempoBase(item, metricBase))
        .filter((value) => value !== null && value !== undefined && !Number.isNaN(value));

      if (tempos.length === 0) {
        return { name: grupo.name, value: 0 };
      }

      if (metric === 'AVG') {
        const total = tempos.reduce((acc, val) => acc + val, 0);
        return { name: grupo.name, value: Number((total / tempos.length).toFixed(2)) };
      }
      if (metric === 'SUM') {
        return { name: grupo.name, value: tempos.reduce((acc, val) => acc + val, 0) };
      }
      if (metric === 'MAX') {
        return { name: grupo.name, value: Math.max(...tempos) };
      }
      if (metric === 'MIN') {
        return { name: grupo.name, value: Math.min(...tempos) };
      }
      return { name: grupo.name, value: 0 };
    });
  }, [itensFiltrados, eixoX, metric, metricBase]);

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtrosSelecionados);
  };

  const limparFiltros = () => {
    setFiltrosSelecionados({});
    setFiltrosAplicados({});
  };

  const salvarConfiguracao = () => {
    if (!nomeConfig.trim()) return;
    const nova = {
      id: `${Date.now()}`,
      nome: nomeConfig.trim(),
      chartType,
      eixoX,
      metric,
      metricBase,
      filtrosAplicados
    };
    const atualizadas = [nova, ...savedCharts].slice(0, 20);
    setSavedCharts(atualizadas);
    saveCharts(atualizadas);
    setNomeConfig('');
    setConfigSelecionada(nova.id);
  };

  const carregarConfiguracao = (id) => {
    const cfg = savedCharts.find((item) => item.id === id);
    if (!cfg) return;
    setChartType(cfg.chartType);
    setEixoX(cfg.eixoX);
    setMetric(cfg.metric);
    setMetricBase(cfg.metricBase || 'prazoTotal');
    setFiltrosSelecionados(cfg.filtrosAplicados || {});
    setFiltrosAplicados(cfg.filtrosAplicados || {});
  };

  const removerConfiguracao = (id) => {
    const atualizadas = savedCharts.filter((item) => item.id !== id);
    setSavedCharts(atualizadas);
    saveCharts(atualizadas);
    if (configSelecionada === id) {
      setConfigSelecionada('');
    }
  };

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const renderChart = () => {
    if (dadosGrafico.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Nenhum dado para exibir. Ajuste os filtros ou escolhas.
        </div>
      );
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={dadosGrafico} dataKey="value" nameKey="name" outerRadius={140}>
              {dadosGrafico.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={dadosGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" name="Valor" stroke="#007AFF" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={dadosGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="value" name="Valor" stroke="#007AFF" fill="#5AC8FA" fillOpacity={0.35} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={dadosGrafico}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name="Valor" fill="#007AFF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const exportPng = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `grafico-${chartType}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
    }
  };

  const exportPdf = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { cacheBust: true });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'PNG', 20, 20, width - 40, height - 40);
      pdf.save(`grafico-${chartType}-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    }
  };

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <LogoImage size={32} />
          <h1 style={{ margin: 0, fontSize: '22px' }}>Radar PRO</h1>
        </div>

        <nav>
          <a onClick={() => navigate('/dashboard')}>📊 Dashboard</a>
          <a onClick={() => navigate('/radar')}>📈 Radar</a>
          <a onClick={() => navigate('/kanban')}>🎯 Kanban</a>
          <a onClick={() => navigate('/relatorios/visao-geral')} className="active">📑 Relatorios</a>
          {canImportar && <a onClick={() => navigate('/importar')}>📥 Importar Excel</a>}
          {isAdmin && <a onClick={() => navigate('/admin/usuarios')}>👥 Usuarios</a>}
        </nav>

        <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(0, 122, 255, 0.08)', borderRadius: '12px', fontSize: '14px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>👤 {usuario.nome}</div>
          <small style={{ color: '#8E8E93' }}>{usuario.email}</small>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#007AFF' }}>
            {perfil.toUpperCase()}
          </div>
        </div>

        <button onClick={sairDoSistema} className="logout-btn">🚪 Sair</button>
      </div>

      <div className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <LogoImage size={42} />
            <div>
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Relatorios - Construtor Dinamico</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Monte e salve graficos personalizados com filtros dinamicos</p>
            </div>
          </div>
        </div>

        <RelatoriosTabs ativo="/relatorios/construtor" />

        {erro && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            ⚠️ {erro}
          </div>
        )}

        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong>Grafico gerado</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {metric} por {dimensoesDisponiveis.find((dim) => dim.key === eixoX)?.label || eixoX}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={exportPng}>⬇️ PNG</button>
              <button className="btn btn-secondary" onClick={exportPdf}>⬇️ PDF</button>
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
            {carregando ? 'Carregando...' : `${itensFiltrados.length} cards considerados`}
          </div>
          {carregando ? (
            <div className="loading" style={{ padding: '24px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div ref={chartRef} style={{ background: 'white', borderRadius: '12px', padding: '8px' }}>
              {renderChart()}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tipo de grafico</label>
              <select className="form-select" value={chartType} onChange={(e) => setChartType(e.target.value)}>
                {CHART_TYPES.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Eixo X (dimensao)</label>
              <select className="form-select" value={eixoX} onChange={(e) => setEixoX(e.target.value)}>
                {dimensoesDisponiveis.map((dim) => (
                  <option key={dim.key} value={dim.key}>{dim.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Metrica (Eixo Y)</label>
              <select className="form-select" value={metric} onChange={(e) => setMetric(e.target.value)}>
                {METRICS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Base da metrica</label>
              <select className="form-select" value={metricBase} onChange={(e) => setMetricBase(e.target.value)}>
                <option value="prazoTotal">Tempo total (criacao → prazo)</option>
                <option value="diasRestantes">Dias restantes</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <h4 style={{ margin: 0 }}>Filtros</h4>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Use CTRL para multi-selecao
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {FILTER_FIELDS.map((field) => (
                <div className="form-group" key={field.key}>
                  <label className="form-label">{field.label}</label>
                  <select
                    className="form-select"
                    multiple
                    size={Math.min(6, (opcoesFiltros[field.key] || []).length || 1)}
                    value={filtrosSelecionados[field.key] || []}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions).map(option => option.value);
                      setFiltrosSelecionados((prev) => ({
                        ...prev,
                        [field.key]: values
                      }));
                    }}
                    style={{ minHeight: '120px', textAlign: 'left' }}
                  >
                    {(opcoesFiltros[field.key] || []).length === 0 ? (
                      <option value="" disabled>Sem opcoes</option>
                    ) : (
                      (opcoesFiltros[field.key] || []).map((opcao) => (
                        <option key={opcao} value={opcao}>{opcao}</option>
                      ))
                    )}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={aplicarFiltros}>Gerar grafico</button>
              <button className="btn btn-secondary" onClick={limparFiltros}>Limpar filtros</button>
              <button className="btn btn-secondary" onClick={() => setFiltrosAplicados(filtrosSelecionados)}>Atualizar grafico</button>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '12px' }}>Salvar configuracao</h4>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Nome da configuracao"
              value={nomeConfig}
              onChange={(e) => setNomeConfig(e.target.value)}
              style={{ minWidth: '240px' }}
            />
            <button className="btn btn-success" onClick={salvarConfiguracao} disabled={!nomeConfig.trim()}>
              💾 Salvar
            </button>
            <select
              className="form-select"
              value={configSelecionada}
              onChange={(e) => {
                setConfigSelecionada(e.target.value);
                carregarConfiguracao(e.target.value);
              }}
              style={{ minWidth: '220px' }}
            >
              <option value="">Carregar configuracao</option>
              {savedCharts.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>{cfg.nome}</option>
              ))}
            </select>
            {configSelecionada && (
              <button className="btn btn-danger" onClick={() => removerConfiguracao(configSelecionada)}>
                🗑 Remover
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
