import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { radarAPI, relatoriosAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import RelatoriosFiltros from '../components/RelatoriosFiltros';
import RelatoriosTabs from '../components/RelatoriosTabs';
import useReportFilters from '../utils/useReportFilters';

export default function RelatoriosPessoas() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canImportar = ['gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';
  const { filtros, setFiltros } = useReportFilters();

  const [pessoas, setPessoas] = useState([]);
  const [opcoes, setOpcoes] = useState({ camadas: [], diretorias: [], responsaveis: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const response = await radarAPI.listar();
        const dados = response.data.itens || [];
        setOpcoes({
          camadas: Array.from(new Set(dados.map(item => item.camada).filter(Boolean))),
          diretorias: Array.from(new Set(dados.map(item => item.equipe).filter(Boolean))),
          responsaveis: Array.from(new Set(dados.map(item => item.responsavel).filter(Boolean)))
        });
      } catch {
        setOpcoes({ camadas: [], diretorias: [], responsaveis: [] });
      }
    };

    carregarOpcoes();
  }, []);

  useEffect(() => {
    const carregarRelatorio = async () => {
      try {
        setCarregando(true);
        const response = await relatoriosAPI.pessoas(filtros);
        setPessoas(response.data.pessoas || []);
        setErro('');
      } catch (e) {
        setErro(e.response?.data?.erro || 'Erro ao carregar relatorio');
      } finally {
        setCarregando(false);
      }
    };

    carregarRelatorio();
  }, [filtros]);

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <div style={styles.appLayout}>
      <div style={styles.sidebar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <LogoImage size={28} />
          <h1 style={{ margin: 0 }}>Menu</h1>
        </div>
        <nav>
          <button onClick={() => navigate('/dashboard')} style={styles.navLink}>📊 Dashboard</button>
          <button onClick={() => navigate('/radar')} style={styles.navLink}>📈 Radar</button>
          <button onClick={() => navigate('/kanban')} style={styles.navLink}>🎯 Kanban</button>
          <button onClick={() => navigate('/relatorios/visao-geral')} style={{ ...styles.navLink, background: '#2563eb' }}>📑 Relatorios</button>
          {canImportar && (
            <button onClick={() => navigate('/importar')} style={styles.navLink}>📥 Importar Excel</button>
          )}
          {isAdmin && (
            <button onClick={() => navigate('/admin/usuarios')} style={styles.navLink}>🛡 Usuarios</button>
          )}
        </nav>

        <div style={styles.userInfo}>
          <div>👤 {usuario.nome}</div>
          <small>{usuario.email}</small>
          <div style={{ marginTop: '6px', fontSize: '12px' }}>Perfil: {usuario.perfil || 'leitura'}</div>
        </div>

        <button onClick={sairDoSistema} style={styles.logoutBtn}>🚪 Sair</button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LogoImage size={32} />
            <h1>Relatorios - Pessoas</h1>
          </div>
        </div>

        <RelatoriosTabs ativo="/relatorios/pessoas" />
        <RelatoriosFiltros filtros={filtros} setFiltros={setFiltros} opcoes={opcoes} />

        {erro && <div style={styles.alert}>{erro}</div>}

        {carregando ? (
          <div style={styles.loading}>Carregando relatorio...</div>
        ) : (
          <div style={styles.card}>
            <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pessoas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="responsavel" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="emAndamento" name="Em andamento" fill="#3b82f6" />
                  <Bar dataKey="atrasados" name="Atrasados" fill="#ef4444" />
                  <Bar dataKey="finalizados" name="Finalizados" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  sidebar: {
    width: '250px',
    background: '#1e293b',
    color: 'white',
    padding: '30px 20px',
    position: 'fixed',
    height: '100vh',
    overflowY: 'auto',
    boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    minHeight: '44px',
    padding: '10px 14px',
    color: '#cbd5e1',
    textDecoration: 'none',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  userInfo: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #334155',
    fontSize: '13px',
    color: '#cbd5e1',
  },
  logoutBtn: {
    marginTop: '20px',
    minHeight: '44px',
    padding: '10px 14px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  mainContent: {
    marginLeft: '250px',
    flex: 1,
    padding: '30px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
    marginTop: '20px'
  },
  alert: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
    marginTop: '12px'
  },
  loading: {
    padding: '20px',
    color: '#64748b'
  }
};
