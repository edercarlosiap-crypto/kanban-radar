import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { regionaisAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';

export default function RegionaisPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const isAdmin = usuario.role === 'admin';

  const [regionais, setRegionais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [modoLote, setModoLote] = useState(false);
  const [textolote, setTextoLote] = useState('');

  useEffect(() => {
    carregarRegionais();
  }, []);

  const carregarRegionais = async () => {
    try {
      setCarregando(true);
      const response = await regionaisAPI.listar();
      setRegionais(response.data.regionais || []);
    } catch (error) {
      setErro('Erro ao carregar regionais');
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    try {
      await regionaisAPI.criar({ nome });
      setNome('');
      setFormAberto(false);
      carregarRegionais();
    } catch (error) {
      setErro('Erro ao criar regional');
    }
  };

  const handleCriarLote = async (e) => {
    e.preventDefault();
    if (!textolote.trim()) {
      setErro('Digite pelo menos uma regional');
      return;
    }

    const linhas = textolote
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);

    if (linhas.length === 0) {
      setErro('Nenhuma regional válida encontrada');
      return;
    }

    try {
      setCarregando(true);
      let sucesso = 0;
      let falhas = [];

      for (const nome of linhas) {
        try {
          await regionaisAPI.criar({ nome });
          sucesso++;
        } catch (error) {
          falhas.push(nome);
        }
      }

      setTextoLote('');
      setModoLote(false);
      setErro(
        sucesso > 0
          ? `✓ ${sucesso} regional(is) criada(s)${falhas.length > 0 ? ` (${falhas.length} falharam)` : ''}`
          : 'Erro ao criar regionais'
      );
      setTimeout(() => setErro(''), 3000);
      carregarRegionais();
    } catch (error) {
      setErro('Erro ao processar lote');
    } finally {
      setCarregando(false);
    }
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar?')) {
      try {
        await regionaisAPI.deletar(id);
        carregarRegionais();
      } catch (error) {
        setErro('Erro ao deletar regional');
      }
    }
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
              🏷️ {usuario.role?.toUpperCase()}
            </p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>
            🚪 Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>🗺️ Regionais</h1>
          <p>Gerencie as regionais do sistema</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        {isAdmin && (
          <div className="glass-card">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setFormAberto(!formAberto);
                  setModoLote(false);
                }}
              >
                ➕ Nova Regional
              </button>
              <button
                className="btn btn-info"
                onClick={() => {
                  setModoLote(!modoLote);
                  setFormAberto(false);
                }}
              >
                📋 Adicionar em Lote
              </button>
            </div>

            {formAberto && (
              <form onSubmit={handleCriar} style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Nome da Regional</label>
                  <input
                    type="text"
                    className="form-control"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success btn-small">
                  ✓ Criar
                </button>
              </form>
            )}

            {modoLote && (
              <form onSubmit={handleCriarLote} style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Regionais (uma por linha)
                  </label>
                  <textarea
                    className="form-control"
                    value={textolote}
                    onChange={(e) => setTextoLote(e.target.value)}
                    placeholder="Digite cada regional em uma linha&#10;Exemplo:&#10;São Paulo&#10;Rio de Janeiro&#10;Minas Gerais"
                    rows="8"
                    style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '14px' }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  📝 Deixe uma linha em branco entre cada regional
                </p>
                <button type="submit" className="btn btn-success btn-small" disabled={carregando}>
                  {carregando ? '⏳ Processando...' : '✓ Criar Todas'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="glass-card">
          {carregando ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : regionais.length === 0 ? (
            <p>Nenhuma regional cadastrada</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Status</th>
                    {isAdmin && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {regionais.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: '12px' }}>{r.id.substring(0, 8)}...</td>
                      <td>{r.nome}</td>
                      <td>{r.ativo ? '✓ Ativa' : '✗ Inativa'}</td>
                      {isAdmin && (
                        <td>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeletar(r.id)}
                          >
                            🗑️ Deletar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
