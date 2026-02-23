import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';

export default function ColaboradoresPage() {
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [funcoes, setFuncoes] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    regional_id: '',
    funcao_id: ''
  });
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [modoLote, setModoLote] = useState(false);
  const [textoLote, setTextoLote] = useState('');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.role || 'leitura';

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [colabRes, regRes, funcRes] = await Promise.all([
        api.get('/colaboradores'),
        api.get('/regionais'),
        api.get('/funcoes')
      ]);

      setColaboradores(colabRes.data.colaboradores || []);
      setRegionais(regRes.data.regionais || []);
      setFuncoes(funcRes.data.funcoes || []);
      setErro('');
    } catch (err) {
      setErro('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.regional_id || !formData.funcao_id) {
      setErro('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);

      if (editando) {
        await api.put(`/colaboradores/${editando}`, formData);
        setErro('');
        alert('Colaborador atualizado com sucesso!');
      } else {
        await api.post('/colaboradores', formData);
        setErro('');
        alert('Colaborador criado com sucesso!');
      }

      setFormData({ nome: '', regional_id: '', funcao_id: '' });
      setEditando(null);
      carregarDados();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar colaborador');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarLote = async (e) => {
    e.preventDefault();
    if (!textoLote.trim()) {
      setErro('Digite pelo menos um colaborador');
      return;
    }

    const linhas = textoLote
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);

    if (linhas.length === 0) {
      setErro('Nenhum colaborador válido encontrado');
      return;
    }

    try {
      setLoading(true);
      let sucesso = 0;
      let falhas = [];

      for (const linha of linhas) {
        try {
          // Formato esperado: "Nome | Regional | Funcao"
          const partes = linha.split('|').map((p) => p.trim());
          if (partes.length !== 3) {
            falhas.push(`${linha} (formato inválido)`);
            continue;
          }

          const [nome, regionalNome, funcaoNome] = partes;

          // Buscar IDs baseado nos nomes
          const regional = regionais.find(
            (r) => r.nome.toLowerCase() === regionalNome.toLowerCase()
          );
          const funcao = funcoes.find(
            (f) => f.nome.toLowerCase() === funcaoNome.toLowerCase()
          );

          if (!regional) {
            falhas.push(`${nome} (regional "${regionalNome}" não encontrada)`);
            continue;
          }
          if (!funcao) {
            falhas.push(`${nome} (função "${funcaoNome}" não encontrada)`);
            continue;
          }

          await api.post('/colaboradores', {
            nome,
            regional_id: regional.id,
            funcao_id: funcao.id
          });
          sucesso++;
        } catch (error) {
          falhas.push(linha);
        }
      }

      setTextoLote('');
      setModoLote(false);
      setErro(
        sucesso > 0
          ? `✓ ${sucesso} colaborador(es) criado(s)${falhas.length > 0 ? ` (${falhas.length} falharam)` : ''}`
          : 'Erro ao criar colaboradores'
      );
      setTimeout(() => setErro(''), 3000);
      carregarDados();
    } catch (error) {
      setErro('Erro ao processar lote');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (colaborador) => {
    setFormData({
      nome: colaborador.nome,
      regional_id: colaborador.regional_id,
      funcao_id: colaborador.funcao_id
    });
    setEditando(colaborador.id);
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este colaborador?')) {
      try {
        setLoading(true);
        await api.delete(`/colaboradores/${id}`);
        setErro('');
        carregarDados();
        alert('Colaborador deletado com sucesso!');
      } catch (err) {
        setErro(err.response?.data?.erro || 'Erro ao deletar colaborador');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelarEdicao = () => {
    setEditando(null);
    setFormData({ nome: '', regional_id: '', funcao_id: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const getNomeRegional = (id) => {
    const regional = regionais.find(r => r.id === id);
    return regional?.nome || '—';
  };

  const getNomeFuncao = (id) => {
    const funcao = funcoes.find(f => f.id === id);
    return funcao?.nome || '—';
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
          <h1>👥 Colaboradores</h1>
          <p>Gerencie os colaboradores sujeitos a comissionamento</p>
        </header>

        {erro && <div className="alert alert-error">{erro}</div>}

        <div className="glass-card">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setModoLote(false);
                handleCancelarEdicao();
              }}
            >
              ➕ Novo Colaborador
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
              <h2>{editando ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
              <form onSubmit={handleSubmit} className="form-grid">
                <div className="form-group">
                  <label htmlFor="nome">Nome *</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: João Silva"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="regional_id">Regional *</label>
              <select
                id="regional_id"
                name="regional_id"
                value={formData.regional_id}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Selecione uma regional</option>
                {regionais.map(regional => (
                  <option key={regional.id} value={regional.id}>
                    {regional.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="funcao_id">Função *</label>
              <select
                id="funcao_id"
                name="funcao_id"
                value={formData.funcao_id}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Selecione uma função</option>
                {funcoes.map(funcao => (
                  <option key={funcao.id} value={funcao.id}>
                    {funcao.nome}
                  </option>
                ))}
              </select>
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
              <h2>Adicionar Colaboradores em Lote</h2>
              <div className="form-group">
                <label className="form-label">
                  Colaboradores (formato: Nome | Regional | Função)
                </label>
                <textarea
                  className="form-control"
                  value={textoLote}
                  onChange={(e) => setTextoLote(e.target.value)}
                  placeholder="Exemplo:&#10;João Silva | São Paulo | Vendedor&#10;Maria Santos | Rio de Janeiro | Gerente&#10;Pedro Costa | Minas Gerais | Supervisor"
                  rows="8"
                  style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '14px' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                📝 Use apenas regionais e funções que já existem no sistema<br />
                📋 Formato: Nome completo | Nome da Regional | Nome da Função
              </p>
              <button type="submit" className="btn btn-success btn-small" disabled={loading}>
                {loading ? '⏳ Processando...' : '✓ Criar Todos'}
              </button>
            </form>
          )}
        </div>

        {!modoLote && (
          <div className="glass-card">
            <h2>Colaboradores Cadastrados ({colaboradores.length})</h2>
            {colaboradores.length === 0 ? (
              <p className="text-center">Nenhum colaborador cadastrado</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Regional</th>
                      <th>Função</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map(colab => (
                      <tr key={colab.id}>
                        <td>{colab.nome}</td>
                        <td>{getNomeRegional(colab.regional_id)}</td>
                        <td>{getNomeFuncao(colab.funcao_id)}</td>
                        <td>
                          <span className="badge badge-success">{colab.status}</span>
                        </td>
                        <td className="actions">
                          <button
                            className="btn-mini btn-edit"
                            onClick={() => handleEditar(colab)}
                            disabled={loading}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-mini btn-delete"
                            onClick={() => handleDeletar(colab.id)}
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
      </main>
    </div>
  );
}
