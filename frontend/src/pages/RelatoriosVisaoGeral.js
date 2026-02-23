import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { radarAPI, relatoriosAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import RelatoriosFiltros from '../components/RelatoriosFiltros';
import RelatoriosTabs from '../components/RelatoriosTabs';
import useReportFilters from '../utils/useReportFilters';
import '../App.css';

const CORES = {
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#5AC8FA',
  purple: '#AF52DE',
  pink: '#FF2D55',
};

const getStatusColor = (status) => {
  if (!status) return '#8E8E93';
  const normalizado = status.toLowerCase();
  if (normalizado.includes('atrasado')) return CORES.danger;
  if (normalizado.includes('andamento')) return CORES.info;
  if (normalizado.includes('finalizado') || normalizado.includes('prazo')) return CORES.success;
  if (normalizado.includes('não iniciado')) return CORES.warning;
  return '#8E8E93';
};

const getStatusLabel = (item) => {
  if (!item) return '';
  if (item.status) return item.status;
  if (!item.statusRadar) return '';

  const normalizado = item.statusRadar.toLowerCase();
  if (normalizado.includes('concluido') || normalizado.includes('concluído')) return 'Finalizado';
  if (normalizado.includes('nao iniciado') || normalizado.includes('não iniciado')) return 'Não iniciado';
  if (normalizado.includes('andamento')) return 'Em andamento';
  return item.statusRadar;
};

const getStatusCategory = (statusLabel) => {
  if (!statusLabel) return 'indefinido';
  const normalizado = statusLabel.toLowerCase();
  if (normalizado.includes('atrasado')) return 'atrasado';
  if (normalizado.startsWith('em andamento')) return 'andamento';
  if (normalizado.startsWith('nao iniciado') || normalizado.startsWith('não iniciado')) return 'naoIniciado';
  if (normalizado.startsWith('finalizado') || normalizado.includes('concluido') || normalizado.includes('concluído')) {
    return 'finalizado';
  }
  return 'indefinido';
};

const STATUS_LABELS = {
  finalizado: 'Finalizado',
  andamento: 'Em andamento',
  atrasado: 'Atrasado',
  naoIniciado: 'Nao iniciado',
  indefinido: 'Indefinido'
};

const isFinalizado = (statusLabel) => {
  if (!statusLabel) return false;
  const normalizado = statusLabel.toLowerCase();
  return normalizado.startsWith('finalizado') || normalizado.includes('concluido') || normalizado.includes('concluído');
};

const isAtrasado = (statusLabel, indicador, diasRestantes) => {
  if (!statusLabel && !indicador && diasRestantes == null) return false;
  if (indicador === 'vermelho-atrasado') return true;
  if (diasRestantes != null && Number.isFinite(diasRestantes)) return diasRestantes < 0;
  if (!statusLabel) return false;
  return statusLabel.toLowerCase().includes('atrasado');
};

export default function RelatoriosVisaoGeral() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canImportar = ['editor', 'gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';
  const { filtros, setFiltros } = useReportFilters();

  const [dados, setDados] = useState({ status: {}, porCamada: [], porEquipe: [] });
  const [opcoes, setOpcoes] = useState({ camadas: [], diretorias: [], responsaveis: [] });
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const response = await radarAPI.listar();
        const lista = response.data.itens || [];
        setItens(lista);
        const camadas = Array.from(new Set(lista.map(item => item.camada).filter(Boolean)));
        const diretorias = Array.from(new Set(lista.map(item => item.equipe).filter(Boolean)));
        const responsaveis = Array.from(new Set(lista.map(item => item.responsavel).filter(Boolean)));
        setOpcoes({ camadas, diretorias, responsaveis });
      } catch {
        setOpcoes({ camadas: [], diretorias: [], responsaveis: [] });
      }
    };

    carregarOpcoes();
  }, []);

  useEffect(() => {
    const carregarRelatorio = async () => {
      try {
        setCarregando(true);
        const response = await relatoriosAPI.visaoGeral(filtros);
        setDados(response.data);
        setErro('');
      } catch (e) {
        setErro(e.response?.data?.erro || 'Erro ao carregar relatório');
      } finally {
        setCarregando(false);
      }
    };

    carregarRelatorio();
  }, [filtros]);

  const filteredItems = itens.filter((item) => {
    if (filtros.camada && item.camada !== filtros.camada) return false;
    if (filtros.diretoria && item.equipe !== filtros.diretoria) return false;
    if (filtros.responsavel && item.responsavel !== filtros.responsavel) return false;
    if (filtros.status && filtros.status !== 'todos' && item.status !== filtros.status) return false;
    return true;
  });

  const statusCount = Object.values(
    filteredItems.reduce((acc, item) => {
      const chave = getStatusLabel(item) || 'Indefinido';
      if (!acc[chave]) {
        acc[chave] = { status: chave, total: 0 };
      }
      acc[chave].total += 1;
      return acc;
    }, {})
  );

  // Dados para gráfico de pizza
  const pizzaData = statusCount.map(item => ({
    name: item.status,
    value: item.total,
    color: getStatusColor(item.status)
  }));

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <LogoImage size={32} />
          <h1 style={{ margin: 0, fontSize: '22px' }}>Radar PRO</h1>
        </div>
        
        <nav>
          <a onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </a>
          <a onClick={() => navigate('/radar')}>
            📈 Radar
          </a>
          <a onClick={() => navigate('/kanban')}>
            🎯 Kanban
          </a>
          <a onClick={() => navigate('/ai-insights')}>
            🧠 Smart Priority AI
          </a>
          <a onClick={() => navigate('/relatorios/visao-geral')} className="active">
            📑 Relatórios
          </a>
          {canImportar && (
            <a onClick={() => navigate('/importar')}>
              📥 Importar Excel
            </a>
          )}
          {isAdmin && (
            <a onClick={() => navigate('/admin/usuarios')}>
              👥 Usuários
            </a>
          )}
        </nav>

        <div style={{ 
          marginTop: '32px', 
          padding: '16px', 
          background: 'rgba(0, 122, 255, 0.08)',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>👤 {usuario.nome}</div>
          <small style={{ color: '#8E8E93' }}>{usuario.email}</small>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#007AFF' }}>
            {perfil.toUpperCase()}
          </div>
        </div>

        <button onClick={sairDoSistema} className="logout-btn">
          🚪 Sair
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <LogoImage size={42} />
            <div>
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Relatórios - Visão Geral</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Análise completa do desempenho estratégico</p>
            </div>
          </div>
        </div>

        <RelatoriosTabs ativo="/relatorios/visao-geral" />
        <RelatoriosFiltros filtros={filtros} setFiltros={setFiltros} opcoes={opcoes} />

        {erro && (
          <div className="alert alert-error">
            ⚠️ {erro}
          </div>
        )}

        {carregando ? (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '20px' }}>Carregando relatório...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* KPIs em Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '600', marginBottom: '8px' }}>TOTAL ITENS</div>
                <div style={{ fontSize: '36px', fontWeight: '700' }}>{filteredItems.length}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(52, 199, 89, 0.2)'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '600', marginBottom: '8px' }}>CONCLUÍDOS</div>
                <div style={{ fontSize: '36px', fontWeight: '700' }}>
                  {filteredItems.filter((item) => isFinalizado(getStatusLabel(item))).length}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #FF3B30 0%, #FF6961 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '600', marginBottom: '8px' }}>ATRASADOS</div>
                <div style={{ fontSize: '36px', fontWeight: '700' }}>
                  {filteredItems.filter((item) => isAtrasado(getStatusLabel(item), item.indicador, item.diasRestantes)).length}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #FF9500 0%, #FFCC00 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(255, 149, 0, 0.2)'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '600', marginBottom: '8px' }}>EM ANDAMENTO</div>
                <div style={{ fontSize: '36px', fontWeight: '700' }}>
                  {filteredItems.filter(i => i.statusRadar?.includes('andamento')).length}
                </div>
              </div>
            </div>

            {/* Gráficos Principais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              {/* Distribuição por Status - Pizza */}
              <div className="report-card">
                <h3 className="report-title">📊 Distribuição por Status</h3>
                <p className="report-desc">Panorama visual do progresso geral das iniciativas</p>
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pizzaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pizzaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          background: 'white',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Saúde dos Projetos - Barra Horizontal */}
              <div className="report-card">
                <h3 className="report-title">💚 Saúde dos Projetos</h3>
                <p className="report-desc">Estado atual de todas as iniciativas em andamento</p>
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={statusCount}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: '#1D1D1F', fontSize: 12 }} />
                      <YAxis 
                        dataKey="status" 
                        type="category" 
                        width={160} 
                        tick={{ fill: '#1D1D1F', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          background: 'white',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }}
                      />
                      <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                        {statusCount.map((entry, index) => (
                          <Cell key={`status-${index}`} fill={getStatusColor(entry.status)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Projetos por Camada */}
            {dados.porCamada && dados.porCamada.length > 0 && (
              <div className="report-card">
                <h3 className="report-title">🎯 Projetos por Camada Estratégica</h3>
                <p className="report-desc">Distribuição das iniciativas por nível de prioridade</p>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dados.porCamada.map((item) => ({
                          name: item.camada || 'Nao informado',
                          value: item.total
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={120}
                        paddingAngle={4}
                      >
                        {dados.porCamada.map((item, index) => {
                          const cores = [CORES.primary, CORES.info, CORES.success, CORES.warning, CORES.danger, CORES.purple, CORES.pink];
                          return (
                            <Cell key={`camada-${item.camada || 'nao'}-${index}`} fill={cores[index % cores.length]} />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Status por Diretoria */}
            {(() => {
              const diretoriaMap = new Map();

              filteredItems.forEach((item) => {
                const diretoria = item.equipe || 'Nao informado';
                const statusLabel = getStatusLabel(item) || 'Indefinido';
                const categoria = getStatusCategory(statusLabel);

                if (!diretoriaMap.has(diretoria)) {
                  diretoriaMap.set(diretoria, { diretoria, counts: {} });
                }
                const registro = diretoriaMap.get(diretoria);
                registro.counts[categoria] = (registro.counts[categoria] || 0) + 1;
              });

              const diretorias = Array.from(diretoriaMap.values())
                .map((item) => ({
                  ...item,
                  total: Object.values(item.counts).reduce((acc, valor) => acc + valor, 0)
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 3);

              if (diretorias.length === 0) return null;

              return (
                <div className="report-card">
                  <h3 className="report-title">👥 Status por Diretoria</h3>
                  <p className="report-desc">Distribuição de status por diretoria</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {diretorias.map((item) => {
                      const data = Object.entries(item.counts).map(([categoria, total]) => ({
                        name: STATUS_LABELS[categoria] || categoria,
                        value: total,
                        color: getStatusColor(STATUS_LABELS[categoria] || categoria)
                      }));

                      return (
                        <div key={`dir-status-${item.diretoria}`} className="report-card" style={{ margin: 0 }}>
                          <h4 className="report-title" style={{ fontSize: '16px' }}>{item.diretoria}</h4>
                          <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={data}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={4}
                                >
                                  {data.map((entry, index) => (
                                    <Cell key={`dir-status-${item.diretoria}-${entry.name}-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    padding: '12px'
                                  }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Diretorias por Status */}
            {(() => {
              const diretoriaByStatus = {};
              const todosStatus = new Set();
              
              filteredItems.forEach((item) => {
                const diretoria = item.equipe || 'Não informado';
                const status = getStatusLabel(item) || 'Indefinido';
                todosStatus.add(status);
                
                if (!diretoriaByStatus[diretoria]) diretoriaByStatus[diretoria] = {};
                diretoriaByStatus[diretoria][status] = (diretoriaByStatus[diretoria][status] || 0) + 1;
              });

              const diretorias = Object.keys(diretoriaByStatus);
              const statusCategorias = ['finalizado', 'andamento', 'atrasado', 'naoIniciado'];

              if (diretorias.length === 0 || Array.from(todosStatus).length === 0) return null;

              return (
                <div className="report-card">
                  <h3 className="report-title">🏢 Diretorias por Status</h3>
                  <p className="report-desc">Distribuição de diretorias por status</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {statusCategorias.map((categoria) => {
                      const data = diretorias.map((diretoria) => ({
                        name: diretoria,
                        value: diretoriaByStatus[diretoria][
                          Array.from(todosStatus).find((status) => getStatusCategory(status) === categoria)
                        ] || 0
                      })).filter((item) => item.value > 0);

                      if (data.length === 0) return null;

                      return (
                        <div key={`status-dir-${categoria}`} className="report-card" style={{ margin: 0 }}>
                          <h4 className="report-title" style={{ fontSize: '16px' }}>{STATUS_LABELS[categoria]}</h4>
                          <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={data}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={4}
                                >
                                  {data.map((item, index) => {
                                    const cores = [CORES.primary, CORES.info, CORES.success, CORES.warning, CORES.danger, CORES.purple, CORES.pink];
                                    return (
                                      <Cell key={`status-dir-${categoria}-${item.name}-${index}`} fill={cores[index % cores.length]} />
                                    );
                                  })}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    padding: '12px'
                                  }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
