import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import LogoImage from '../components/LogoImage';

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [perfisSelecionados, setPerfisSelecionados] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoMensagem, setLogoMensagem] = useState('');
  const [radarOpcoesTexto, setRadarOpcoesTexto] = useState({
    camadas: '',
    tipos: '',
    equipes: '',
    responsaveis: '',
    prioridadesCamada1: ''
  });
  const [radarOpcoesMsg, setRadarOpcoesMsg] = useState('');

  const PERFIS = ['leitura', 'editor', 'gestor', 'admin'];

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      const response = await adminAPI.listarUsuarios();
      const lista = response.data.usuarios || [];
      setUsuarios(lista);
      const mapPerfis = {};
      lista.forEach(u => {
        mapPerfis[u.id] = u.perfil || 'leitura';
      });
      setPerfisSelecionados(mapPerfis);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar usuarios');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
    carregarRadarOpcoes();
  }, []);

  const carregarRadarOpcoes = async () => {
    try {
      const response = await adminAPI.obterRadarOpcoes();
      const dados = response.data || {};
      setRadarOpcoesTexto({
        camadas: (dados.camadas || []).join('\n'),
        tipos: (dados.tipos || []).join('\n'),
        equipes: (dados.equipes || []).join('\n'),
        responsaveis: (dados.responsaveis || []).join('\n'),
        prioridadesCamada1: (dados.prioridadesCamada1 || []).join('\n')
      });
    } catch (e) {
      setRadarOpcoesMsg(e.response?.data?.erro || 'Erro ao carregar opções do radar');
    }
  };

  const aprovarUsuario = async (id) => {
    try {
      await adminAPI.aprovarUsuario(id);
      carregarUsuarios();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao aprovar usuario');
    }
  };

  const atualizarPerfil = async (id) => {
    try {
      await adminAPI.atualizarPerfil(id, perfisSelecionados[id]);
      carregarUsuarios();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao atualizar perfil');
    }
  };

  const desativarUsuario = async (id) => {
    if (!window.confirm('Tem certeza que deseja desativar este usuario?')) return;
    try {
      await adminAPI.desativarUsuario(id);
      carregarUsuarios();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao desativar usuario');
    }
  };

  const enviarLogo = async () => {
    if (!logoFile) {
      setLogoMensagem('Selecione um arquivo de logo.');
      return;
    }

    try {
      await adminAPI.uploadLogo(logoFile);
      setLogoMensagem('Logo atualizada com sucesso.');
      setLogoFile(null);
    } catch (e) {
      setLogoMensagem(e.response?.data?.erro || 'Erro ao atualizar logo');
    }
  };

  const parseLista = (texto) => {
    const linhas = texto
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
    return Array.from(new Set(linhas));
  };

  const atualizarRadarOpcoes = async () => {
    try {
      const payload = {
        camadas: parseLista(radarOpcoesTexto.camadas),
        tipos: parseLista(radarOpcoesTexto.tipos),
        equipes: parseLista(radarOpcoesTexto.equipes),
        responsaveis: parseLista(radarOpcoesTexto.responsaveis),
        prioridadesCamada1: parseLista(radarOpcoesTexto.prioridadesCamada1)
      };
      const response = await adminAPI.atualizarRadarOpcoes(payload);
      const dados = response.data?.opcoes || payload;
      setRadarOpcoesTexto({
        camadas: (dados.camadas || []).join('\n'),
        tipos: (dados.tipos || []).join('\n'),
        equipes: (dados.equipes || []).join('\n'),
        responsaveis: (dados.responsaveis || []).join('\n'),
        prioridadesCamada1: (dados.prioridadesCamada1 || []).join('\n')
      });
      setRadarOpcoesMsg('Opções do radar atualizadas com sucesso.');
    } catch (e) {
      setRadarOpcoesMsg(e.response?.data?.erro || 'Erro ao atualizar opções do radar');
    }
  };

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
          <a onClick={() => navigate('/admin/usuarios')} className="active">
            👥 Usuários
          </a>
          <a onClick={() => navigate('/admin/logs')}>
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
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Controle de Usuários</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Gerencie usuários e permissões do sistema</p>
            </div>
          </div>
          <button onClick={carregarUsuarios} className="btn btn-secondary" style={{ marginTop: '16px' }}>
            🔄 Atualizar
          </button>
        </div>

        {erro && (
          <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
            {erro}
          </div>
        )}

        <div className="glass-card" style={{ marginBottom: '24px', padding: '28px' }}>
          <h3 className="card-title" style={{ marginBottom: '20px' }}>🎨 Branding - Logo</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              style={{ flex: 1, minWidth: '250px' }}
            />
            <button onClick={enviarLogo} className="btn btn-primary">Enviar Logo</button>
          </div>
          {logoMensagem && (
            <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {logoMensagem}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ marginBottom: '24px', padding: '28px' }}>
          <h3 className="card-title" style={{ marginBottom: '12px' }}>🧩 Variáveis do Radar</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '16px' }}>
            Edite as opções exibidas nos campos Camada, Tipo, Equipe e Responsável. Use uma linha por opção.
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Camadas</label>
              <textarea
                className="form-input"
                rows={6}
                value={radarOpcoesTexto.camadas}
                onChange={(e) => setRadarOpcoesTexto(prev => ({ ...prev, camadas: e.target.value }))}
              />
              <small style={{ color: 'var(--text-secondary)' }}>
                A primeira camada define as prioridades da Camada 1.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridades da Camada 1</label>
              <textarea
                className="form-input"
                rows={6}
                value={radarOpcoesTexto.prioridadesCamada1}
                onChange={(e) => setRadarOpcoesTexto(prev => ({ ...prev, prioridadesCamada1: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipos</label>
              <textarea
                className="form-input"
                rows={6}
                value={radarOpcoesTexto.tipos}
                onChange={(e) => setRadarOpcoesTexto(prev => ({ ...prev, tipos: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Equipes</label>
              <textarea
                className="form-input"
                rows={6}
                value={radarOpcoesTexto.equipes}
                onChange={(e) => setRadarOpcoesTexto(prev => ({ ...prev, equipes: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Responsáveis</label>
              <textarea
                className="form-input"
                rows={6}
                value={radarOpcoesTexto.responsaveis}
                onChange={(e) => setRadarOpcoesTexto(prev => ({ ...prev, responsaveis: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <button onClick={atualizarRadarOpcoes} className="btn btn-primary">
              💾 Salvar opções
            </button>
            {radarOpcoesMsg && (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{radarOpcoesMsg}</span>
            )}
          </div>
        </div>

        {carregando ? (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '20px' }}>Carregando usuários...</p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Perfil</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '600' }}>{u.nome}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${getBadgeClass(u.status)}`}>
                          {u.status || 'pendente'}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={perfisSelecionados[u.id] || 'leitura'}
                          onChange={(e) => setPerfisSelecionados(prev => ({ ...prev, [u.id]: e.target.value }))}
                          style={{ minWidth: '140px' }}
                        >
                          {PERFIS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {u.status !== 'aprovado' && (
                            <button onClick={() => aprovarUsuario(u.id)} className="btn btn-success" style={{ fontSize: '13px', padding: '6px 12px' }}>
                              ✓ Aprovar
                            </button>
                          )}
                          <button onClick={() => atualizarPerfil(u.id)} className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                            💾 Salvar
                          </button>
                          <button onClick={() => desativarUsuario(u.id)} className="btn btn-danger" style={{ fontSize: '13px', padding: '6px 12px' }}>
                            🚫 Desativar
                          </button>
                        </div>
                      </td>
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

const getBadgeClass = (status) => {
  if (status === 'aprovado') return 'badge-success';
  if (status === 'desativado') return 'badge-danger';
  return 'badge-warning';
};
