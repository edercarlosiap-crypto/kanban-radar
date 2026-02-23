import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import LogoImage from '../components/LogoImage';

export default function AdminLogs() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarLogs = async () => {
    try {
      setCarregando(true);
      const response = await adminAPI.listarLogs();
      setLogs(response.data.logs || []);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar logs');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  if (usuario.perfil !== 'admin') {
    return (
      <div className="app-layout">
        <div className="loading" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h2>Acesso restrito</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Somente administradores podem acessar esta página.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            ← Voltar ao Dashboard
          </button>
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
          <a onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </a>
          <a onClick={() => navigate('/radar')}>
            📈 Radar
          </a>
          <a onClick={() => navigate('/kanban')}>
            🎯 Kanban
          </a>
          <a onClick={() => navigate('/relatorios/visao-geral')}>
            📑 Relatórios
          </a>
          <a onClick={() => navigate('/importar')}>
            📥 Importar Excel
          </a>
          <a onClick={() => navigate('/admin/usuarios')}>
            👥 Usuários
          </a>
          <a onClick={() => navigate('/admin/logs')} className="active">
            🧾 Logs
          </a>
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
            {usuario.perfil?.toUpperCase() || 'LEITURA'}
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
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Logs de Auditoria</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Acompanhe todas as ações realizadas no sistema</p>
            </div>
          </div>
          <button onClick={carregarLogs} className="btn btn-secondary" style={{ marginTop: '16px' }}>
            🔄 Atualizar
          </button>
        </div>

        {erro && (
          <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '20px' }}>Carregando logs...</p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Usuário</th>
                    <th>Ação</th>
                    <th>Item ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600' }}>{log.data}</td>
                      <td>{log.usuario}</td>
                      <td><span className="badge badge-secondary">{log.acao}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.item_id ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
