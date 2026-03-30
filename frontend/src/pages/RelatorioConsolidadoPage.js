import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { comissionamentoAPI, regionaisAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/RelatorioMetasPage.css';
import '../styles/RelatorioComissionamentoPage.css';
import '../styles/SidebarCollapse.css';

const RelatorioConsolidadoPage = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';

  const [periodosDisponiveis, setPeriodosDisponiveis] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');
  const [regionaisDisponiveis, setRegionaisDisponiveis] = useState([]); // Agora com id e nome
  const [regionalSelecionada, setRegionalSelecionada] = useState('');
  const [dadosConsolidado, setDadosConsolidado] = useState(null);
  const [carregandoMetas, setCarregandoMetas] = useState(true);
  const [carregandoConsolidado, setCarregandoConsolidado] = useState(false);
  const [erro, setErro] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const valorConsiderado = (valor) => Number(valor || 0);

  const carregarPeriodos = useCallback(async () => {
    try {
      setCarregandoMetas(true);
      const [metasResp, regionaisResp] = await Promise.all([
        api.get('/relatorio-metas'),
        regionaisAPI.listar()
      ]);

      const metas = metasResp.data || [];
      const regionaisData = regionaisResp.data?.regionais || [];

      // Extrair períodos
      const periodos = new Set();
      metas.forEach((regional) => {
        regional.metas.forEach((meta) => periodos.add(meta.periodo));
      });

      const periodosOrdenados = Array.from(periodos).sort();
      
      setPeriodosDisponiveis(periodosOrdenados);
      setRegionaisDisponiveis(regionaisData);
      
      if (periodosOrdenados.length > 0) {
        setPeriodoSelecionado(periodosOrdenados[periodosOrdenados.length - 1]);
      }
      if (regionaisData.length > 0) {
        setRegionalSelecionada(''); // Vazio = todas as regionais
      }

      setErro('');
    } catch (error) {
      console.error('Erro ao carregar períodos:', error);
      const mensagem = error.response?.data?.erro || error.message || 'Erro ao carregar períodos.';
      setErro(mensagem);
    } finally {
      setCarregandoMetas(false);
    }
  }, []);

  const carregarConsolidado = useCallback(async () => {
    if (!periodoSelecionado || regionaisDisponiveis.length === 0) {
      setDadosConsolidado(null);
      return;
    }

    try {
      setCarregandoConsolidado(true);

      // Determinar quais regionais carregar
      let regionaisParaCarregar = regionaisDisponiveis;
      if (regionalSelecionada) {
        regionaisParaCarregar = regionaisDisponiveis.filter(r => r.id === regionalSelecionada);
      }

      // Carregar vendedores de cada regional usando listarVendedores
      const promises = regionaisParaCarregar.map(regional =>
        comissionamentoAPI.listarVendedores(periodoSelecionado, regional.id)
          .then(response => ({
            regionalId: regional.id,
            regionalNome: regional.nome,
            vendedores: response.data?.vendedores || []
          }))
          .catch(error => {
            console.warn(`Erro ao carregar vendedores da regional ${regional.nome}:`, error);
            return {
              regionalId: regional.id,
              regionalNome: regional.nome,
              vendedores: []
            };
          })
      );

      const resultados = await Promise.all(promises);

      // Consolidar dados em linhas no formato esperado pela tabela
      const linhas = [];
      resultados.forEach(resultado => {
        resultado.vendedores.forEach(vendedor => {
          linhas.push({
            regional: resultado.regionalNome,
            vendedor: vendedor.nome,
            comissaoVendas: vendedor.vendas?.comissao || 0,
            comissaoChurn: vendedor.churn?.comissao || 0,
            comissaoMudancaTitularidade: vendedor.mudancaTitularidade?.comissao || 0,
            comissaoMigracaoTecnologia: vendedor.migracaoTecnologia?.comissao || 0,
            comissaoRenovacao: vendedor.renovacao?.comissao || 0,
            comissaoPlanoEvento: vendedor.planoEvento?.comissao || 0,
            comissaoSVA: vendedor.sva?.comissao || 0,
            comissaoTelefonia: vendedor.telefonia?.comissao || 0
          });
        });
      });

      setDadosConsolidado({
        periodo: periodoSelecionado,
        linhas
      });
      setErro('');
    } catch (error) {
      const mensagem = error.response?.data?.erro || 'Erro ao carregar consolidado.';
      console.error('Erro ao carregar consolidado:', error);
      setErro(mensagem);
      setDadosConsolidado(null);
    } finally {
      setCarregandoConsolidado(false);
    }
  }, [periodoSelecionado, regionalSelecionada, regionaisDisponiveis]);

  useEffect(() => {
    carregarPeriodos();
  }, [carregarPeriodos]);

  useEffect(() => {
    carregarConsolidado();
  }, [carregarConsolidado]);

  // Dados já consolidados e filtrados
  const dadosFiltrados = useMemo(() => {
    return dadosConsolidado;
  }, [dadosConsolidado]);

  // Calcular totais por coluna
  const calcularTotais = (linhas) => {
    const totais = {
      vendas: 0,
      churn: 0,
      mudanca: 0,
      migracao: 0,
      renovacao: 0,
      planoEvento: 0,
      sva: 0,
      telefonia: 0
    };

    linhas.forEach(linha => {
      totais.vendas += valorConsiderado(linha.comissaoVendas);
      totais.churn += valorConsiderado(linha.comissaoChurn);
      totais.mudanca += valorConsiderado(linha.comissaoMudancaTitularidade);
      totais.migracao += valorConsiderado(linha.comissaoMigracaoTecnologia);
      totais.renovacao += valorConsiderado(linha.comissaoRenovacao);
      totais.planoEvento += valorConsiderado(linha.comissaoPlanoEvento);
      totais.sva += valorConsiderado(linha.comissaoSVA);
      totais.telefonia += valorConsiderado(linha.comissaoTelefonia);
    });

    return totais;
  };

  const formatNumero = (valor) => {
    const numero = Number(valor) || 0;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numero);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

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
          {/* Header com botão toggle */}
          <div className="page-header">
            <div>
              <h1>📊 Relatório Consolidado - Todas as Regionais</h1>
              <p>Visualize o total de comissionamento de todas as regionais em um único relatório</p>
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn-toggle-sidebar"
              title={sidebarCollapsed ? 'Expandir menu (→)' : 'Recolher menu (←)'}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {/* Filtros */}
          <div className="filters-section" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div className="filter-group">
              <label htmlFor="periodo">Período:</label>
              <select
                id="periodo"
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
                disabled={carregandoMetas}
              >
                {periodosDisponiveis.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="regional">Regional:</label>
              <select
                id="regional"
                value={regionalSelecionada}
                onChange={(e) => setRegionalSelecionada(e.target.value)}
                disabled={carregandoMetas}
              >
                <option value="">Todas as regionais</option>
                {regionaisDisponiveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <div className="error-message">
              <p>⚠️ {erro}</p>
            </div>
          )}

          {/* Loading inicial */}
          {carregandoMetas && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Carregando períodos disponíveis...</p>
            </div>
          )}

          {/* Tabela de Relatório Consolidado */}
          {!carregandoMetas && periodoSelecionado && (
            <div className="comissao-card comissao-card--consolidado" style={{ marginTop: '20px' }}>
              <h2 className="comissao-title comissao-title--consolidado">
                Comissionamento - Período: {periodoSelecionado}
                {regionalSelecionada && ` - ${regionalSelecionada}`}
              </h2>
              {carregandoConsolidado ? (
                <div className="loading" style={{ padding: '40px' }}>
                  <div className="spinner"></div>
                </div>
              ) : dadosFiltrados && dadosFiltrados.linhas && dadosFiltrados.linhas.length > 0 ? (
                <div className="comissao-table-scroll" style={{ 
                  overflowX: 'auto', 
                  maxHeight: '600px', 
                  overflowY: 'auto',
                  width: '100%',
                  marginLeft: '-12px',
                  marginRight: '-12px',
                  paddingLeft: '12px',
                  paddingRight: '12px'
                }}>
                  <table className="comissao-table comissao-table--consolidado" style={{ fontSize: '0.75rem', minWidth: 'fit-content', width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: '600', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '110px' }}>Regional</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '110px' }}>Vendedor</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '80px' }}>VENDAS</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '70px' }}>CHURN</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '80px' }}>MUD. TITUL.</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '80px' }}>MIG. TECN.</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '75px' }}>RENOV.</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '75px' }}>PLANO EV.</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '60px' }}>SVA</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '75px' }}>TELEF.</th>
                        <th style={{ textAlign: 'center', padding: '8px', minWidth: '85px', backgroundColor: '#f0f0f0', fontWeight: '700' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosFiltrados.linhas.map((linha, index) => {
                        const totalLinha = valorConsiderado(linha.comissaoVendas) +
                                          valorConsiderado(linha.comissaoChurn) +
                                          valorConsiderado(linha.comissaoMudancaTitularidade) +
                                          valorConsiderado(linha.comissaoMigracaoTecnologia) +
                                          valorConsiderado(linha.comissaoRenovacao) +
                                          valorConsiderado(linha.comissaoPlanoEvento) +
                                          valorConsiderado(linha.comissaoSVA) +
                                          valorConsiderado(linha.comissaoTelefonia);

                        return (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                            <td style={{ textAlign: 'center', padding: '6px', fontWeight: '500' }}><strong>{linha.regional}</strong></td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>{linha.vendedor}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoVendas))}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoChurn))}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoMudancaTitularidade))}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoMigracaoTecnologia))}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoRenovacao))}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoPlanoEvento))}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoSVA))}</td>
                            <td style={{ textAlign: 'center', padding: '6px' }}>R$ {formatNumero(valorConsiderado(linha.comissaoTelefonia))}</td>
                            <td style={{ textAlign: 'center', padding: '6px', backgroundColor: '#f9f9f9', fontWeight: '600' }}>R$ {formatNumero(totalLinha)}</td>
                          </tr>
                        );
                      })}

                      {/* Linha de Totais */}
                      {(() => {
                        const totais = calcularTotais(dadosFiltrados.linhas);
                        const totalGeral = totais.vendas + totais.churn + totais.mudanca + totais.migracao + totais.renovacao + totais.planoEvento + totais.sva + totais.telefonia;
                        return (
                          <tr style={{ backgroundColor: '#e8e8e8', fontWeight: '700', borderTop: '2px solid var(--border-color)', fontSize: '0.75rem' }}>
                            <td colSpan="2" style={{ padding: '8px', textAlign: 'right', backgroundColor: '#e8e8e8' }}>TOTAL:</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.vendas)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.churn)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.mudanca)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.migracao)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.renovacao)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.planoEvento)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.sva)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8e8e8' }}>R$ {formatNumero(totais.telefonia)}</td>
                            <td style={{ textAlign: 'center', padding: '8px', backgroundColor: '#d8d8d8' }}>R$ {formatNumero(totalGeral)}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <p>⚠️ Nenhum dado consolidado encontrado para os filtros selecionados</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RelatorioConsolidadoPage;
