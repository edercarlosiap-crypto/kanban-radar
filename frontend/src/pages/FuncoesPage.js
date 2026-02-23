import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';

export default function FuncoesPage() {
  const navigate = useNavigate();
  const [funcoes, setFuncoes] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    eligivel_comissionamento: true
  });
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [modoLote, setModoLote] = useState(false);
  const [textoLote, setTextoLote] = useState('');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.role || 'leitura';

  useEffect(() => {
    carregarFuncoes();
  }, []);

  const carregarFuncoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/funcoes');
      setFuncoes(response.data.funcoes || []);
      setErro('');
    } catch (err) {
      setErro('Erro ao carregar funções');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      setErro('Digite o nome da função');
      return;
    }

    try {
      setLoading(true);
      
      if (editando) {
        await api.put(`/funcoes/${editando}`, formData);
        setErro('');
        alert('Função atualizada com sucesso!');
      } else {
        await api.post('/funcoes', formData);
        setErro('');
        alert('Função criada com sucesso!');
      }

      setFormData({ nome: '', eligivel_comissionamento: true });
      setEditando(null);
      carregarFuncoes();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar função');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarLote = async (e) => {
    e.preventDefault();
    if (!textoLote.trim()) {
      setErro('Digite pelo menos uma função');
      return;
    }

    const linhas = textoLote
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);

    if (linhas.length === 0) {
      setErro('Nenhuma função válida encontrada');
      return;
    }

    try {
      setLoading(true);
      let sucesso = 0;
      let falhas = [];

      for (const nome of linhas) {
        try {
          await api.post('/funcoes', {
            nome,
            eligivel_comissionamento: true
          });
          sucesso++;
        } catch (error) {
          falhas.push(nome);
        }
      }

      setTextoLote('');
      setModoLote(false);
      setErro(
        sucesso > 0
          ? `✓ ${sucesso} função(ões) criada(s)${falhas.length > 0 ? ` (${falhas.length} falharam)` : ''}`
          : 'Erro ao criar funções'
      );
      setTimeout(() => setErro(''), 3000);
      carregarFuncoes();
    } catch (error) {
      setErro('Erro ao processar lote');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (funcao) => {
    setFormData({
      nome: funcao.nome,
      eligivel_comissionamento: funcao.eligivel_comissionamento === 1
    });
    setEditando(funcao.id);
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta função?')) {
      try {
        setLoading(true);
        await api.delete(`/funcoes/${id}`);
        setErro('');
        carregarFuncoes();
        alert('Função deletada com sucesso!');
      } catch (err) {
        setErro(err.response?.data?.erro || 'Erro ao deletar função');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelarEdicao = () => {
    setEditando(null);
    setFormData({ nome: '', eligivel_comissionamento: true });
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
            <p style={{ fontSize: '12px', color: 'var(--primary)' }}>
              🏷️ {perfil.toUpperCase()}
            </p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>
            🚪 Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>💼 Funções</h1>
          <p>Gerencie as funções elegíveis a comissionamento</p>
        </header>

        {erro && <div className="alert alert-error">{erro}</div>}

        <>
          <div className="glass-card">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setModoLote(false);
                  handleCancelarEdicao();
                }}
              >
                ➕ Nova Função
              </button>
              <button
                className="btn btn-info"
                onClick={() => {
                  setModoLote(!modoLote);
                  handleCancelarEdicao();
                }}
              >
                📋 Adicionar em Lote
              </button>
            </div>

            {!modoLote ? (
              <>
                <h2>{editando ? 'Editar Função' : 'Nova Função'}</h2>
                <form onSubmit={handleSubmit} className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nome">Nome da Função *</label>
                    <input
                      type="text"
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      placeholder="Ex: Vendedor, Gerente, etc."
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        name="eligivel_comissionamento"
                        checked={formData.eligivel_comissionamento}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      Elegível a Comissionamento
                    </label>
                  </div>

                  <div className="form-buttons">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? '⏳...' : (editando ? '💾 Atualizar' : '➕ Adicionar')}
                    </button>
                    {editando && (
                      <button type="button" className="btn btn-secondary" onClick={handleCancelarEdicao} disabled={loading}>
                        ❌ Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <form onSubmit={handleCriarLote} style={{ marginBottom: '20px' }}>
                <h2>Adicionar Funções em Lote</h2>
                <div className="form-group">
                  <label className="form-label">
                    Funções (uma por linha)
                  </label>
                  <textarea
                    className="form-control"
                    value={textoLote}
                    onChange={(e) => setTextoLote(e.target.value)}
                    placeholder="Digite cada função em uma linha&#10;Exemplo:&#10;Vendedor&#10;Gerente&#10;Supervisor"
                    rows="8"
                    style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '14px' }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  📝 Todas as funções adicionadas serão marcadas como elegíveis a comissionamento
                </p>
                <button type="submit" className="btn btn-success btn-small" disabled={loading}>
                  {loading ? '⏳ Processando...' : '✓ Criar Todas'}
                </button>
              </form>
            )}
          </div>

          {!modoLote && (
            <div className="glass-card">
              <h2>Funções Cadastradas ({funcoes.length})</h2>
              {funcoes.length === 0 ? (
                <p className="text-center">Nenhuma função cadastrada</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Elegível</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funcoes.map(funcao => (
                        <tr key={funcao.id}>
                          <td>{funcao.nome}</td>
                          <td>
                            {funcao.eligivel_comissionamento === 1 ? (
                              <span className="badge badge-success">✓ Sim</span>
                            ) : (
                              <span className="badge badge-gray">✗ Não</span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-success">{funcao.status}</span>
                          </td>
                          <td className="actions">
                            <button
                              className="btn-mini btn-edit"
                              onClick={() => handleEditar(funcao)}
                              disabled={loading}
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-mini btn-delete"
                              onClick={() => handleDeletar(funcao.id)}
                              disabled={loading}
                              title="Deletar"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      </main>
    </div>
  );
}
