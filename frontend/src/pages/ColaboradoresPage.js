import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    funcao_id: '',
    status: 'ativo',
    data_ativacao: '',
    data_inativacao: null
  });
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [modoLote, setModoLote] = useState(false);
  const [textoLote, setTextoLote] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordenacaoCampo, setOrdenacaoCampo] = useState('nome');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState('asc');
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

      setFormData({ nome: '', regional_id: '', funcao_id: '', status: 'ativo', data_ativacao: '', data_inativacao: null });
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
      setErro('Nenhum colaborador valido encontrado');
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
            falhas.push(`${linha} (formato invalido)`);
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
            falhas.push(`${nome} (regional "${regionalNome}" nao encontrada)`);
            continue;
          }
          if (!funcao) {
            falhas.push(`${nome} (funcao "${funcaoNome}" nao encontrada)`);
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
          ? `${sucesso} colaborador(es) criado(s)${falhas.length > 0 ? ` (${falhas.length} falharam)` : ''}`
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
      funcao_id: colaborador.funcao_id,
      status: colaborador.status || 'ativo',
      data_ativacao: colaborador.data_ativacao ? String(colaborador.data_ativacao).slice(0, 10) : '',
      data_inativacao: colaborador.data_inativacao || null
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
    setFormData({ nome: '', regional_id: '', funcao_id: '', status: 'ativo', data_ativacao: '', data_inativacao: null });
  };

  const handleInativar = async (colaborador) => {
    if (!window.confirm(`Tem certeza que deseja inativar ${colaborador.nome}?`)) return;
    try {
      setLoading(true);
      await api.put(`/colaboradores/${colaborador.id}/inativar`, {
        data_inativacao: new Date().toISOString()
      });
      carregarDados();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao inativar colaborador');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReativar = async (colaborador) => {
    if (!window.confirm(`Tem certeza que deseja reativar ${colaborador.nome}?`)) return;
    try {
      setLoading(true);
      await api.put(`/colaboradores/${colaborador.id}/reativar`);
      carregarDados();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao reativar colaborador');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const getNomeRegional = useCallback((id) => {
    const regional = regionais.find(r => r.id === id);
    return regional?.nome || '-';
  }, [regionais]);

  const getNomeFuncao = useCallback((id) => {
    const funcao = funcoes.find(f => f.id === id);
    return funcao?.nome || '-';
  }, [funcoes]);

  const colaboradoresFiltradosOrdenados = useMemo(() => {
    const termoNome = filtroNome.trim().toLowerCase();

    const filtrados = colaboradores.filter((colab) => {
      const nomeOk = !termoNome || String(colab.nome || '').toLowerCase().includes(termoNome);
      const regionalOk = !filtroRegional || colab.regional_id === filtroRegional;
      const funcaoOk = !filtroFuncao || colab.funcao_id === filtroFuncao;
      const statusOk = !filtroStatus || String(colab.status || '').toLowerCase() === filtroStatus.toLowerCase();
      return nomeOk && regionalOk && funcaoOk && statusOk;
    });

    filtrados.sort((a, b) => {
      let valorA = '';
      let valorB = '';

      if (ordenacaoCampo === 'nome') {
        valorA = String(a.nome || '');
        valorB = String(b.nome || '');
      } else if (ordenacaoCampo === 'regional') {
        valorA = getNomeRegional(a.regional_id);
        valorB = getNomeRegional(b.regional_id);
      } else if (ordenacaoCampo === 'funcao') {
        valorA = getNomeFuncao(a.funcao_id);
        valorB = getNomeFuncao(b.funcao_id);
      } else if (ordenacaoCampo === 'status') {
        valorA = String(a.status || '');
        valorB = String(b.status || '');
      }

      const comparacao = valorA.localeCompare(valorB, 'pt-BR', { sensitivity: 'base' });
      return ordenacaoDirecao === 'asc' ? comparacao : -comparacao;
    });

    return filtrados;
  }, [
    colaboradores,
    filtroNome,
    filtroRegional,
    filtroFuncao,
    filtroStatus,
    ordenacaoCampo,
    ordenacaoDirecao,
    getNomeRegional,
    getNomeFuncao
  ]);

  const limparFiltros = () => {
    setFiltroNome('');
    setFiltroRegional('');
    setFiltroFuncao('');
    setFiltroStatus('');
    setOrdenacaoCampo('nome');
    setOrdenacaoDirecao('asc');
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
              {perfil.toUpperCase()}
            </p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>
            Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Colaboradores</h1>
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
              Novo Colaborador
            </button>
            <button
              className="btn btn-info"
              onClick={() => {
                setModoLote(!modoLote);
                handleCancelarEdicao();
              }}
            >
              Adicionar em Lote
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
                placeholder="Ex: Joao Silva"
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
              <label htmlFor="funcao_id">Funcao *</label>
              <select
                id="funcao_id"
                name="funcao_id"
                value={formData.funcao_id}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Selecione uma funcao</option>
                {funcoes.map(funcao => (
                  <option key={funcao.id} value={funcao.id}>
                    {funcao.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="data_ativacao">Data Ativacao</label>
              <input
                type="date"
                id="data_ativacao"
                name="data_ativacao"
                value={formData.data_ativacao || ''}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : (editando ? 'Atualizar' : 'Adicionar')}
              </button>
              {editando && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelarEdicao} disabled={loading}>
                  Cancelar
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
                  Colaboradores (formato: Nome | Regional | Funcao)
                </label>
                <textarea
                  className="form-control"
                  value={textoLote}
                  onChange={(e) => setTextoLote(e.target.value)}
                  placeholder="Exemplo:&#10;Joao Silva | Sao Paulo | Vendedor&#10;Maria Santos | Rio de Janeiro | Gerente&#10;Pedro Costa | Minas Gerais | Supervisor"
                  rows="8"
                  style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '14px' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                Use apenas regionais e funcoes que ja existem no sistema<br />
                Formato: Nome completo | Nome da Regional | Nome da Funcao
              </p>
              <button type="submit" className="btn btn-success btn-small" disabled={loading}>
                {loading ? 'Processando...' : 'Criar Todos'}
              </button>
            </form>
          )}
        </div>

        {!modoLote && (
          <div className="glass-card">
            <h2>Colaboradores Cadastrados ({colaboradoresFiltradosOrdenados.length} de {colaboradores.length})</h2>

            <div className="form-grid" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label htmlFor="filtro_nome">Filtrar por nome</label>
                <input
                  id="filtro_nome"
                  type="text"
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  placeholder="Digite parte do nome"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="filtro_regional">Regional</label>
                <select
                  id="filtro_regional"
                  value={filtroRegional}
                  onChange={(e) => setFiltroRegional(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Todas</option>
                  {regionais.map((regional) => (
                    <option key={regional.id} value={regional.id}>
                      {regional.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="filtro_funcao">Funcao</label>
                <select
                  id="filtro_funcao"
                  value={filtroFuncao}
                  onChange={(e) => setFiltroFuncao(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Todas</option>
                  {funcoes.map((funcao) => (
                    <option key={funcao.id} value={funcao.id}>
                      {funcao.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="filtro_status">Status</label>
                <select
                  id="filtro_status"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ordenacao_campo">Classificar por</label>
                <select
                  id="ordenacao_campo"
                  value={ordenacaoCampo}
                  onChange={(e) => setOrdenacaoCampo(e.target.value)}
                  disabled={loading}
                >
                  <option value="nome">Nome</option>
                  <option value="regional">Regional</option>
                  <option value="funcao">Funcao</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ordenacao_direcao">Ordem</label>
                <select
                  id="ordenacao_direcao"
                  value={ordenacaoDirecao}
                  onChange={(e) => setOrdenacaoDirecao(e.target.value)}
                  disabled={loading}
                >
                  <option value="asc">Crescente (A-Z)</option>
                  <option value="desc">Decrescente (Z-A)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={limparFiltros} disabled={loading}>
                Limpar filtros
              </button>
            </div>

            {colaboradoresFiltradosOrdenados.length === 0 ? (
              <p className="text-center">Nenhum colaborador cadastrado</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Regional</th>
                      <th>Funcao</th>
                      <th>Status</th>
                      <th>Data Ativacao</th>
                      <th>Data Inativacao</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradoresFiltradosOrdenados.map(colab => (
                      <tr key={colab.id}>
                        <td>{colab.nome}</td>
                        <td>{getNomeRegional(colab.regional_id)}</td>
                        <td>{getNomeFuncao(colab.funcao_id)}</td>
                        <td>
                          <span className="badge badge-success">{colab.status}</span>
                        </td>
                        <td>{colab.data_ativacao ? new Date(colab.data_ativacao).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>{colab.data_inativacao ? new Date(colab.data_inativacao).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="actions">
                          <button
                            className="btn-mini btn-edit"
                            onClick={() => handleEditar(colab)}
                            disabled={loading}
                            title="Editar"
                          >
                            Editar
                          </button>
                          {String(colab.status || '').toLowerCase() === 'ativo' ? (
                            <button
                              className="btn-mini btn-secondary"
                              onClick={() => handleInativar(colab)}
                              disabled={loading}
                              title="Inativar"
                            >
                              Inativar
                            </button>
                          ) : (
                            <button
                              className="btn-mini btn-info"
                              onClick={() => handleReativar(colab)}
                              disabled={loading}
                              title="Reativar"
                            >
                              Reativar
                            </button>
                          )}
                          <button
                            className="btn-mini btn-delete"
                            onClick={() => handleDeletar(colab.id)}
                            disabled={loading}
                            title="Deletar"
                          >
                            Excluir
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

