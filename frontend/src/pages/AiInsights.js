import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import LogoImage from '../components/LogoImage';

const getRiskLevel = (score) => {
  if (score >= 80) return { label: 'Alto', color: '#ef4444' };
  if (score >= 50) return { label: 'Medio', color: '#f59e0b' };
  return { label: 'Baixo', color: '#22c55e' };
};

export default function AiInsights() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canImportar = ['editor', 'gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';

  const [dados, setDados] = useState({ suggestedOrder: [], alerts: [], insights: [], workload: {} });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const carregar = async () => {
    try {
      setCarregando(true);
      const response = await aiAPI.prioridades();
      setDados(response.data || { suggestedOrder: [], alerts: [], insights: [], workload: {} });
      setErro('');
      setLastUpdated(new Date());
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar insights');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 60000);
    return () => clearInterval(timer);
  }, []);

  const workloadList = useMemo(() => {
    return Object.entries(dados.workload || {}).map(([attendant, info]) => ({ attendant, ...info }));
  }, [dados.workload]);

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const abrirNoRadar = (taskId) => {
    if (!taskId) return;
    localStorage.setItem('radarFocusId', String(taskId));
    navigate('/radar');
  };

  return (
    <div className="app-layout">
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
          <a onClick={() => navigate('/ai-insights')} className="active">
            🧠 Smart Priority AI
          </a>
          <a onClick={() => navigate('/relatorios/visao-geral')}>
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

        <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(0, 122, 255, 0.08)', borderRadius: '12px', fontSize: '14px' }}>
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

      <div className="main-content">
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <LogoImage size={42} />
              <div>
                <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Smart Priority AI</h1>
                <p style={{ color: '#8E8E93', margin: 0 }}>Sugestoes automaticas para o Kanban</p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={carregar}>
              🔄 Reanalisar Kanban
            </button>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {lastUpdated ? `Ultima analise: ${lastUpdated.toLocaleTimeString()}` : 'Aguardando analise'}
          </div>
        </div>

        {erro && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            ⚠️ {erro}
          </div>
        )}

        {carregando ? (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '20px' }}>Analisando Kanban...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="card-title" style={{ marginBottom: '16px' }}>Prioridades sugeridas</h3>
              {dados.suggestedOrder.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>Nenhuma sugestao no momento.</div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {dados.suggestedOrder.map((item, index) => {
                    const risk = getRiskLevel(item.score);
                    return (
                      <div key={`${item.taskId}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <button
                            type="button"
                            onClick={() => abrirNoRadar(item.taskId)}
                            style={{
                              fontWeight: 600,
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              color: '#0f172a',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            #{index + 1} {item.title || `Task ${item.taskId}`}
                          </button>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item.reason}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{item.score}</div>
                          <div style={{ color: risk.color, fontWeight: 600, fontSize: '13px' }}>{risk.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ marginBottom: '12px' }}>Alertas operacionais</h3>
                {dados.alerts.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Sem alertas.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {dados.alerts.map((alerta, index) => (
                      <li key={`${alerta}-${index}`} style={{ marginBottom: '8px' }}>{alerta}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ marginBottom: '12px' }}>Insights estrategicos</h3>
                {dados.insights.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Sem insights.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {dados.insights.map((insight, index) => (
                      <li key={`${insight}-${index}`} style={{ marginBottom: '8px' }}>{insight}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ marginBottom: '12px' }}>Carga por responsavel</h3>
                {workloadList.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Sem dados.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {workloadList.map((item) => (
                      <div key={item.attendant} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>{item.attendant}</span>
                        <span>{item.openCount} abertas • {item.avgLeadTime || 0} dias</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
