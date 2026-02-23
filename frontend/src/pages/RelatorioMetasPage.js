import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { regionaisAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/RelatorioMetasPage.css';

const RelatorioMetasPage = () => {
  const navigate = useNavigate();
  const [relatorio, setRelatorio] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState([]);
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';

  const tiposMetaOrdenados = [
    'Vendas',
    'Churn',
    'Mudança de titularidade',
    'Migração de tecnologia',
    'Renovação',
    'Plano evento',
    'SVA',
    'Telefonia'
  ];

  const carregarRelatorio = async () => {
    try {
      setCarregando(true);
      
      // Buscar regionais e relatório em paralelo
      const [metasResp, regionaisResp] = await Promise.all([
        api.get('/relatorio-metas'),
        regionaisAPI.listar()
      ]);
      
      setRelatorio(metasResp.data);
      setRegionais(regionaisResp.data.regionais || []);
      
      // Extrair períodos disponíveis
      const periodos = new Set();
      metasResp.data.forEach(regional => {
        regional.metas.forEach(meta => {
          periodos.add(meta.periodo);
        });
      });
      
      const periodosOrdenados = Array.from(periodos).sort();
      setPeriodosDisponiveis(periodosOrdenados);
      
      if (periodosOrdenados.length > 0) {
        setPeriodoSelecionado((atual) => {
          if (atual && periodosOrdenados.includes(atual)) {
            return atual;
          }
          return periodosOrdenados[periodosOrdenados.length - 1];
        });
      }
      
      setErro('');
    } catch (error) {
      console.error('Erro completo:', error);
      console.error('Response:', error.response);
      
      let mensagemErro = 'Erro desconhecido';
      
      if (error.response) {
        // Servidor respondeu com erro
        if (error.response.status === 403) {
          mensagemErro = 'Acesso negado. Você precisa ser Admin para acessar este relatório.';
        } else if (error.response.status === 401) {
          mensagemErro = 'Não autorizado. Faça login novamente.';
        } else {
          mensagemErro = error.response.data?.erro || `Erro ${error.response.status}`;
        }
      } else if (error.request) {
        // Requisição foi feita mas não houve resposta
        mensagemErro = 'Erro de conexão: Backend não está respondendo. Verifique se o servidor está rodando.';
      } else {
        // Erro na configuração da requisição
        mensagemErro = error.message;
      }
      
      setErro(`Erro ao carregar relatório: ${mensagemErro}`);
      setRelatorio([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, []);

  const filtrarMetasPorPeriodo = (metas) => {
    if (!periodoSelecionado) return [];
    return metas.filter(meta => meta.periodo === periodoSelecionado);
  };

  const arredondarParaCima = (valor) => {
    return Math.ceil(valor);
  };

  const construirTabelaPorRegional = (regional) => {
    const metasDoRegional = filtrarMetasPorPeriodo(regional.metas);
    
    if (metasDoRegional.length === 0) {
      return (
        <div key={regional.id} className="dashboard-card">
          <h2 className="comissao-title">{regional.nome}</h2>
          <div className="comissao-resumo">
            <div>
              <span className="comissao-label">Total de Vendedores</span>
              <strong>{regional.totalVendedores}</strong>
            </div>
            <div>
              <span className="comissao-label">Incremento Global</span>
              <strong>-</strong>
            </div>
            <div>
              <span className="comissao-label">Período</span>
              <strong>{periodoSelecionado}</strong>
            </div>
          </div>
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>⚠️ Nenhuma meta cadastrada para o período {periodoSelecionado}</p>
          </div>
        </div>
      );
    }

    // Organizar metas por tipo
    const metasPorTipo = {};
    tiposMetaOrdenados.forEach(tipo => {
      metasPorTipo[tipo] = metasDoRegional.find(m => 
        m.tipoMeta.toLowerCase() === tipo.toLowerCase()
      );
    });

    return (
      <div key={regional.id} className="dashboard-card">
        <h2 className="comissao-title">{regional.nome}</h2>
        <div className="comissao-resumo">
          <div>
            <span className="comissao-label">Total de Vendedores</span>
            <strong>{regional.totalVendedores}</strong>
          </div>
          <div>
            <span className="comissao-label">Incremento Global</span>
            <strong>+{metasDoRegional[0]?.incrementoGlobal || 0}%</strong>
          </div>
          <div>
            <span className="comissao-label">Período</span>
            <strong>{periodoSelecionado}</strong>
          </div>
        </div>
        
        <table className="comissao-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th colSpan="2" style={{ textAlign: 'center' }}>Global M1</th>
              <th colSpan="2" style={{ textAlign: 'center' }}>Global M2</th>
              <th colSpan="2" style={{ textAlign: 'center' }}>Global M3</th>
              <th colSpan="2" style={{ textAlign: 'center' }}>Individual M1</th>
              <th colSpan="2" style={{ textAlign: 'center' }}>Individual M2</th>
              <th colSpan="2" style={{ textAlign: 'center' }}>Individual M3</th>
            </tr>
            <tr>
              <th></th>
              <th>V</th>
              <th>%</th>
              <th>V</th>
              <th>%</th>
              <th>V</th>
              <th>%</th>
              <th>V</th>
              <th>%</th>
              <th>V</th>
              <th>%</th>
              <th>V</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {tiposMetaOrdenados.map(tipo => {
              const meta = metasPorTipo[tipo];
              
              if (!meta) {
                return (
                  <tr key={tipo}>
                    <td>{tipo.toUpperCase()}</td>
                    <td colSpan="12" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sem dados</td>
                  </tr>
                );
              }

              return (
                <tr key={tipo}>
                  <td>{tipo.toUpperCase()}</td>
                  <td>{arredondarParaCima(meta.metaRegional1)}</td>
                  <td>{meta.percentual1}%</td>
                  <td>{arredondarParaCima(meta.metaRegional2)}</td>
                  <td>{meta.percentual2}%</td>
                  <td>{arredondarParaCima(meta.metaRegional3)}</td>
                  <td>{meta.percentual3}%</td>
                  <td>{arredondarParaCima(meta.metaIndividual1)}</td>
                  <td>{meta.percentualIndividual1}%</td>
                  <td>{arredondarParaCima(meta.metaIndividual2)}</td>
                  <td>{meta.percentualIndividual2}%</td>
                  <td>{arredondarParaCima(meta.metaIndividual3)}</td>
                  <td>{meta.percentualIndividual3}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (carregando) {
    return <div className="loading"><div className="spinner" /></div>;
  }

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
          <h1>🎯 Relatório de Metas</h1>
          <p>Acompanhe o desempenho das metas globais e individuais por regional</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <div className="glass-card">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Período</label>
              <select
                className="form-select"
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
              >
                <option value="">Selecione um período</option>
                {periodosDisponiveis.map((periodo, index) => (
                  <option key={`${periodo}-${index}`} value={periodo}>{periodo}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Regional (opcional)</label>
              <select
                className="form-select"
                value={filtroRegional}
                onChange={(e) => setFiltroRegional(e.target.value)}
              >
                <option value="">Todas as regionais</option>
                {regionais.map((r, index) => (
                  <option key={`${r.id || r.nome || 'regional'}-${index}`} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 0, minWidth: 'auto', display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={carregarRelatorio}>
                🔄 Atualizar
              </button>
            </div>
          </div>

          {periodoSelecionado && !erro && (
            <div className="dashboards">
              {(() => {
                const filtrados = relatorio.filter(regional => {
                  if (!filtroRegional || filtroRegional === '') return true;
                  return regional.id === filtroRegional; // Comparar strings diretamente
                });
                
                if (filtrados.length === 0) {
                  return (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <p>⚠️ Nenhuma regional encontrada com os filtros aplicados</p>
                    </div>
                  );
                }
                
                return filtrados.map(regional => construirTabelaPorRegional(regional));
              })()}
            </div>
          )}

          {!periodoSelecionado && !erro && (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>⚠️ Selecione um período para visualizar os relatórios</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RelatorioMetasPage;

