import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { radarAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import '../App.css';

const CORES = {
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#5AC8FA',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canImportar = ['editor', 'gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';
  
  const [stats, setStats] = useState({
    total: 0,
    concluidos: 0,
    criticos: 0,
    atrasados: 0,
    emAndamento: 0,
    planejados: 0
  });
  
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroEquipe, setFiltroEquipe] = useState('total');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [statsResponse, itensResponse] = await Promise.all([
        radarAPI.obterEstatisticas(),
        radarAPI.listar()
      ]);
      
      setStats(statsResponse.data);
      setItens(itensResponse.data.itens || []);
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
    } finally {
      setCarregando(false);
    }
  };

  // Preparar dados para gráficos
  const dadosPorStatus = [
    { name: 'Concluído', value: stats.concluidos, color: CORES.success },
    { name: 'Em Andamento', value: stats.emAndamento || stats.total - stats.concluidos, color: CORES.info },
    { name: 'Atrasados', value: stats.atrasados, color: CORES.danger },
    { name: 'Críticos', value: stats.criticos, color: CORES.warning },
  ].filter(item => item.value > 0);

  const isConcluido = (item) => item.kanban === 'Concluído' || item.statusRadar === 'Concluído';
  const isAtrasado = (item) => item.indicador === 'vermelho-atrasado' || (Number.isFinite(item.diasRestantes) && item.diasRestantes < 0);
  const isCritico = (item) => item.indicador === 'vermelho' || item.indicador === 'vermelho-atrasado';
  const isEmAndamento = (item) => item.statusRadar === 'Em andamento' || ['Em Execução', 'Travado', 'Validação'].includes(item.kanban);

  const itensFiltrados = itens.filter((item) => {
    switch (filtroEquipe) {
      case 'concluidos':
        return isConcluido(item);
      case 'atrasados':
        return isAtrasado(item);
      case 'criticos':
        return isCritico(item);
      case 'andamento':
        return isEmAndamento(item);
      default:
        return true;
    }
  });

  const aplicarFiltroEquipe = (novoFiltro) => {
    if (novoFiltro === 'total') {
      setFiltroEquipe('total');
      return;
    }
    setFiltroEquipe((atual) => (atual === novoFiltro ? 'total' : novoFiltro));
  };

  // Agrupar por equipe
  const porEquipe = itensFiltrados.reduce((acc, item) => {
    const equipe = item.equipe || 'Não informado';
    acc[equipe] = (acc[equipe] || 0) + 1;
    return acc;
  }, {});

  const dadosPorEquipe = Object.entries(porEquipe)
    .map(([equipe, total]) => ({ equipe, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  if (carregando) {
    return (
      <div className="app-layout">
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '20px' }}>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <LogoImage size={32} />
          <h1 style={{ margin: 0, fontSize: '22px' }}>Radar PRO</h1>
        </div>
        
        <nav>
          <a onClick={() => navigate('/dashboard')} className="active">
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
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Dashboard</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Visão geral do Radar Estratégico</p>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas com design iOS */}
        <div className="stats-grid">
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)', cursor: 'pointer' }}
            onClick={() => aplicarFiltroEquipe('total')}
          >
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' }}>
              TOTAL DE ITENS
            </div>
            <div style={{ color: 'white', fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '8px' }}>
              {stats.total}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>
              Ativos no sistema
            </div>
          </div>

          <div
            className="stat-card verde"
            style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)', cursor: 'pointer' }}
            onClick={() => aplicarFiltroEquipe('concluidos')}
          >
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' }}>
              CONCLUÍDOS
            </div>
            <div style={{ color: 'white', fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '8px' }}>
              {stats.concluidos}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>
              {stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0}% do total
            </div>
          </div>

          <div
            className="stat-card vermelho"
            style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #FF6961 100%)', cursor: 'pointer' }}
            onClick={() => aplicarFiltroEquipe('criticos')}
          >
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' }}>
              CRÍTICOS
            </div>
            <div style={{ color: 'white', fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '8px' }}>
              {stats.criticos}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>
              Atenção urgente
            </div>
          </div>

          <div
            className="stat-card amarelo"
            style={{ background: 'linear-gradient(135deg, #FF9500 0%, #FFCC00 100%)', cursor: 'pointer' }}
            onClick={() => aplicarFiltroEquipe('atrasados')}
          >
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' }}>
              ATRASADOS
            </div>
            <div style={{ color: 'white', fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '8px' }}>
              {stats.atrasados}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>
              Requerem ação
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {/* Gráfico de Pizza - Status */}
          <div className="card">
            <h2 className="card-title">📊 Distribuição por Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPorStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(payload) => {
                    const status = payload?.name;
                    if (status === 'Concluído') return aplicarFiltroEquipe('concluidos');
                    if (status === 'Em Andamento') return aplicarFiltroEquipe('andamento');
                    if (status === 'Atrasados') return aplicarFiltroEquipe('atrasados');
                    if (status === 'Críticos') return aplicarFiltroEquipe('criticos');
                  }}
                >
                  {dadosPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: 'white',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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

          {/* Gráfico de Pizza - Por Equipe */}
          {dadosPorEquipe.length > 0 && (
            <div className="card">
              <h2 className="card-title">👥 Itens por Equipe</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosPorEquipe}
                    dataKey="total"
                    nameKey="equipe"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                  >
                    {dadosPorEquipe.map((entry, index) => {
                      const cores = [CORES.primary, CORES.info, CORES.success, CORES.warning, CORES.danger];
                      return (
                        <Cell key={`equipe-${entry.equipe}-${index}`} fill={cores[index % cores.length]} />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Ações Rápidas */}
        <div className="card" style={{ marginTop: '32px' }}>
          <h2 className="card-title">⚡ Ações Rápidas</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/radar')}
              className="btn btn-primary"
            >
              ➕ Novo Item
            </button>
            <button 
              onClick={() => navigate('/kanban')}
              className="btn btn-primary"
            >
              🎯 Ver Kanban
            </button>
            {canImportar && (
              <button 
                onClick={() => navigate('/importar')}
                className="btn btn-success"
              >
                📥 Importar Excel
              </button>
            )}
            <button 
              onClick={() => navigate('/relatorios/visao-geral')}
              className="btn btn-secondary"
            >
              📊 Ver Relatórios
            </button>
          </div>
        </div>

        {/* Últimas Atualizações */}
        {itens.length > 0 && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h2 className="card-title">🕒 Últimos Itens Atualizados</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {itens.slice(0, 5).map((item) => (
                <div 
                  key={item.id}
                  style={{
                    padding: '16px',
                    background: 'rgba(0, 122, 255, 0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 122, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 122, 255, 0.03)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={() => navigate('/radar')}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.acao}
                    </div>
                    <div style={{ fontSize: '13px', color: '#8E8E93' }}>
                      {item.equipe} • {item.responsavel}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge badge-${
                      item.indicador === 'verde' ? 'success' :
                      item.indicador === 'amarelo' ? 'warning' : 'danger'
                    }`}>
                      {item.statusRadar}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
