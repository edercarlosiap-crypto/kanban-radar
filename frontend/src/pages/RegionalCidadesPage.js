import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { regionaisAPI, regionalCidadesAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';

export default function RegionalCidadesPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const isAdmin = usuario.role === 'admin';

  const [cidades, setCidades] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [form, setForm] = useState({ cidade: '', regionalId: '' });

  const carregar = async () => {
    try {
      setCarregando(true);
      const [cidadesResp, regionaisResp] = await Promise.all([
        regionalCidadesAPI.listar(),
        regionaisAPI.listar()
      ]);
      setCidades(cidadesResp.data.cidades || []);
      setRegionais(regionaisResp.data.regionais || []);
      setErro('');
    } catch (e) {
      console.error(e);
      setErro('Erro ao carregar cidades por regional');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const cidadesFiltradas = useMemo(() => {
    const termo = String(filtroCidade || '').trim().toLowerCase();
    if (!termo) return cidades;
    return cidades.filter((item) => String(item.cidade || '').toLowerCase().includes(termo));
  }, [cidades, filtroCidade]);

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!form.cidade.trim()) {
      setErro('Cidade obrigatoria');
      return;
    }
    try {
      await regionalCidadesAPI.criar({
        cidade: form.cidade.trim(),
        regionalId: form.regionalId || null
      });
      setForm({ cidade: '', regionalId: '' });
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao criar mapeamento de cidade');
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Deseja remover este mapeamento?')) return;
    try {
      await regionalCidadesAPI.deletar(id);
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao remover mapeamento');
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
          </div>
          <button className="btn-sair" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Cidades por Regional</h1>
          <p>Cadastro de de-para para importacao por cidade</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        {isAdmin && (
          <div className="glass-card">
            <h2>Novo Mapeamento</h2>
            <form className="form-grid" onSubmit={handleCriar}>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input
                  className="form-control"
                  value={form.cidade}
                  onChange={(e) => setForm((prev) => ({ ...prev, cidade: e.target.value }))}
                  placeholder="Ex.: Alta Floresta D'Oeste"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Regional</label>
                <select
                  className="form-select"
                  value={form.regionalId}
                  onChange={(e) => setForm((prev) => ({ ...prev, regionalId: e.target.value }))}
                >
                  <option value="">Nao definido</option>
                  {regionais.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-buttons">
                <button className="btn btn-primary" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        )}

        <div className="glass-card">
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Filtrar cidade</label>
            <input
              className="form-control"
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              placeholder="Digite parte do nome da cidade"
            />
          </div>

          {carregando ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Cidade</th>
                    <th>Regional</th>
                    {isAdmin && <th>Acoes</th>}
                  </tr>
                </thead>
                <tbody>
                  {cidadesFiltradas.map((item) => (
                    <tr key={item.id}>
                      <td>{item.cidade}</td>
                      <td>{item.regional_nome || 'Nao definido'}</td>
                      {isAdmin && (
                        <td>
                          <button className="btn btn-danger btn-small" onClick={() => handleDeletar(item.id)}>
                            Deletar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!cidadesFiltradas.length && (
                    <tr>
                      <td colSpan={isAdmin ? 3 : 2} style={{ textAlign: 'center' }}>
                        Nenhum mapeamento encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

