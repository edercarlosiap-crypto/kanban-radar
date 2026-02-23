import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tiposMetaAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/RelatorioMetasPage.css';
import '../styles/SidebarCollapse.css';

const TiposMetaPage = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || usuario.role || 'leitura';

  const [tiposMeta, setTiposMeta] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    meta1Volume: '',
    meta1Percent: '',
    meta1PercentIndividual: '',
    meta2Volume: '',
    meta2Percent: '',
    meta2PercentIndividual: '',
    meta3Volume: '',
    meta3Percent: '',
    meta3PercentIndividual: '',
    incrementoGlobal: '',
    pesoVendasChurn: ''
  });

  const carregarTiposMeta = async () => {
    try {
      setCarregando(true);
      const resposta = await tiposMetaAPI.listar();
      setTiposMeta(resposta.data?.tiposMeta || []);
      setErro('');
    } catch (erro) {
      console.error('Erro ao carregar tipos de meta:', erro);
      setErro('Erro ao carregar tipos de meta');
      setTiposMeta([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTiposMeta();
  }, []);

  const handleLimparFormulario = () => {
    setFormData({
      nome: '',
      descricao: '',
      meta1Volume: '',
      meta1Percent: '',
      meta1PercentIndividual: '',
      meta2Volume: '',
      meta2Percent: '',
      meta2PercentIndividual: '',
      meta3Volume: '',
      meta3Percent: '',
      meta3PercentIndividual: '',
      incrementoGlobal: '',
      pesoVendasChurn: ''
    });
    setEditando(null);
    setFormularioAberto(false);
  };

  const handleEditar = (tipo) => {
    setFormData(tipo);
    setEditando(tipo.id);
    setFormularioAberto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome) {
      setErro('Nome do tipo de meta é obrigatório');
      return;
    }

    try {
      if (editando) {
        // Atualizar
        await tiposMetaAPI.atualizar(editando, formData);
      } else {
        // Criar novo
        await tiposMetaAPI.criar(formData);
      }
      await carregarTiposMeta();
      handleLimparFormulario();
      setErro('');
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || 'Erro ao salvar tipo de meta';
      setErro(mensagem);
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este tipo de meta?')) {
      return;
    }

    try {
      await tiposMetaAPI.deletar(id);
      await carregarTiposMeta();
      setErro('');
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || 'Erro ao deletar tipo de meta';
      setErro(mensagem);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  if (perfil !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página</p>
      </div>
    );
  }

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <LogoImage />
        {!sidebarCollapsed && <SidebarNav />}
        <div className="sidebar-profile">
          {!sidebarCollapsed && <strong>{usuario.nome}</strong>}
          {!sidebarCollapsed && <span>{perfil}</span>}
          <button onClick={handleLogout} className="btn-logout" title={sidebarCollapsed ? 'Sair' : ''}>
            {sidebarCollapsed ? '🚪' : '🚪 Sair'}
          </button>
        </div>
      </aside>

      <main className="container">
        <div className="content">
          <div className="page-header">
            <div>
              <h1>📋 Cadastro de Tipos de Meta</h1>
              <p>Gerenciar os tipos de metas e suas mecânicas de cálculo</p>
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn-toggle-sidebar"
              title={sidebarCollapsed ? 'Expandir menu (→)' : 'Recolher menu (←)'}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {erro && (
            <div className="error-message">
              <p>⚠️ {erro}</p>
              <button onClick={() => setErro('')} style={{ marginTop: '10px' }}>Fechar</button>
            </div>
          )}

          {!formularioAberto && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => {
                  handleLimparFormulario();
                  setFormularioAberto(true);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ➕ Novo Tipo de Meta
              </button>
            </div>
          )}

          {formularioAberto && (
            <div className="card" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f5f5f5' }}>
              <h2>{editando ? 'Editar' : 'Novo'} Tipo de Meta</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label>Nome *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      disabled={editando} // Não permitir editar nome
                    />
                  </div>
                  <div>
                    <label>Descrição</label>
                    <input
                      type="text"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Meta 1 (Alcance / Primeira Camada)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label>Volume</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta1Volume}
                      onChange={(e) => setFormData({ ...formData, meta1Volume: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label>Percentual Coletivo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta1Percent}
                      onChange={(e) => setFormData({ ...formData, meta1Percent: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label>Percentual Individual</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta1PercentIndividual}
                      onChange={(e) => setFormData({ ...formData, meta1PercentIndividual: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Meta 2 (Segunda Camada)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label>Volume</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta2Volume}
                      onChange={(e) => setFormData({ ...formData, meta2Volume: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label>Percentual Coletivo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta2Percent}
                      onChange={(e) => setFormData({ ...formData, meta2Percent: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label>Percentual Individual</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta2PercentIndividual}
                      onChange={(e) => setFormData({ ...formData, meta2PercentIndividual: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Meta 3 (Terceira Camada)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label>Volume</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta3Volume}
                      onChange={(e) => setFormData({ ...formData, meta3Volume: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label>Percentual Coletivo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta3Percent}
                      onChange={(e) => setFormData({ ...formData, meta3Percent: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label>Percentual Individual</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.meta3PercentIndividual}
                      onChange={(e) => setFormData({ ...formData, meta3PercentIndividual: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Parâmetros Globais</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label>Incremento Global</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.incrementoGlobal}
                      onChange={(e) => setFormData({ ...formData, incrementoGlobal: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label>Peso Vendas/Churn</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pesoVendasChurn}
                      onChange={(e) => setFormData({ ...formData, pesoVendasChurn: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleLimparFormulario}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {editando ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {carregando ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Carregando tipos de meta...</p>
            </div>
          ) : tiposMeta.length > 0 ? (
            <div className="card">
              <h2>Tipos de Meta Cadastrados</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.85rem'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Nome</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Descrição</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd' }}>Meta 1</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd' }}>Meta 2</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd' }}>Meta 3</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd' }}>Inc. Global</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiposMeta.map((tipo) => (
                      <tr key={tipo.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', borderRight: '1px solid #eee' }}>{(tipo.nome || '').toUpperCase()}</td>
                        <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{tipo.descricao || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #eee', fontSize: '0.8rem' }}>
                          {tipo.meta1Volume !== null ? `V: ${tipo.meta1Volume} | ${(tipo.meta1Percent * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #eee', fontSize: '0.8rem' }}>
                          {tipo.meta2Volume !== null ? `V: ${tipo.meta2Volume} | ${(tipo.meta2Percent * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #eee', fontSize: '0.8rem' }}>
                          {tipo.meta3Volume !== null ? `V: ${tipo.meta3Volume} | ${(tipo.meta3Percent * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #eee' }}>
                          {tipo.incrementoGlobal !== null ? `${(tipo.incrementoGlobal * 100).toFixed(0)}%` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEditar(tipo)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#FF9800',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeletar(tipo.id)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            🗑️ Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhum tipo de meta cadastrado</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TiposMetaPage;
