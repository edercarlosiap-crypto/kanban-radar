import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { comissionamentoAPI, regionaisAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/RelatorioMetasPage.css';
import '../styles/RelatorioComissionamentoPage.css';

const tiposMetaOrdenados = [
  'Vendas',
  'Churn',
  'Mudança de titularidade',
  'Migração de tecnologia',
  'Renovação',
  'Plano evento',
  'SVA',
  'Telefonia',
];

const RelatorioComissionamentoPage = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';

  const [relatorioMetas, setRelatorioMetas] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [dadosComissao, setDadosComissao] = useState(null);
  const [dadosVendedores, setDadosVendedores] = useState(null);
  const [carregandoMetas, setCarregandoMetas] = useState(true);
  const [carregandoComissao, setCarregandoComissao] = useState(false);
  const [carregandoVendedores, setCarregandoVendedores] = useState(false);
  const [erro, setErro] = useState('');

  const carregarMetas = async () => {
    try {
      setCarregandoMetas(true);
      const [metasResp, regionaisResp] = await Promise.all([
        api.get('/relatorio-metas'),
        regionaisAPI.listar()
      ]);

      const metas = metasResp.data || [];
      setRelatorioMetas(metas);
      setRegionais(regionaisResp.data.regionais || []);

      const periodos = new Set();
      metas.forEach((regional) => {
        regional.metas.forEach((meta) => periodos.add(meta.periodo));
      });

      const periodosOrdenados = Array.from(periodos).sort();
      setPeriodosDisponiveis(periodosOrdenados);
      if (periodosOrdenados.length > 0) {
        setPeriodoSelecionado(periodosOrdenados[periodosOrdenados.length - 1]);
      }

      setErro('');
    } catch (error) {
      console.error('Erro detalhado ao carregar metas:', error);
      const mensagem = error.response?.data?.erro || error.message || 'Erro ao carregar metas. Verifique o backend.';
      setErro(mensagem);
    } finally {
      setCarregandoMetas(false);
    }
  };

  const carregarComissionamento = async () => {
    if (!periodoSelecionado || !filtroRegional) {
      setDadosComissao(null);
      return;
    }

    try {
      setCarregandoComissao(true);
      const response = await comissionamentoAPI.calcular(periodoSelecionado, filtroRegional);
      setDadosComissao(response.data);
      setErro('');
    } catch (error) {
      const mensagem = error.response?.data?.erro || 'Erro ao carregar comissionamento.';
      setErro(mensagem);
      setDadosComissao(null);
    } finally {
      setCarregandoComissao(false);
    }
  };

  const carregarVendedores = async () => {
    if (!periodoSelecionado || !filtroRegional) {
      setDadosVendedores(null);
      return;
    }

    try {
      setCarregandoVendedores(true);
      const response = await comissionamentoAPI.listarVendedores(periodoSelecionado, filtroRegional);
      setDadosVendedores(response.data);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      setDadosVendedores(null);
    } finally {
      setCarregandoVendedores(false);
    }
  };

  useEffect(() => {
    carregarMetas();
  }, []);

  useEffect(() => {
    carregarComissionamento();
    carregarVendedores();
  }, [periodoSelecionado, filtroRegional]);

  const filtrarMetasPorPeriodo = (metas) => {
    if (!periodoSelecionado) return [];
    return metas.filter((meta) => meta.periodo === periodoSelecionado);
  };

  const arredondarParaCima = (valor) => Math.ceil(valor);

  const formatNumero = (valor) => {
    const numero = Number(valor) || 0;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numero);
  };

  const formatPercentual = (valor) => {
    const numero = Number(valor) || 0;
    const percentual = numero * 100;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(percentual) + '%';
  };

  const construirTabelaMetas = (regional) => {
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

    const metasPorTipo = {};
    tiposMetaOrdenados.forEach((tipo) => {
      metasPorTipo[tipo] = metasDoRegional.find((m) => 
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
            {tiposMetaOrdenados.map((tipo) => {
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

  if (carregandoMetas) {
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
          <h1>💵 Relatório de Comissionamento</h1>
          <p>Detalhamento completo conforme regras, metas e pesos por regional</p>
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
                {periodosDisponiveis.map((periodo) => (
                  <option key={periodo} value={periodo}>{periodo}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Regional</label>
              <select
                className="form-select"
                value={filtroRegional}
                onChange={(e) => setFiltroRegional(e.target.value)}
              >
                <option value="">Selecione uma regional</option>
                {regionais.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 0, minWidth: 'auto', display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => { carregarComissionamento(); carregarVendedores(); }}>
                🔄 Atualizar
              </button>
            </div>
          </div>

          {!periodoSelecionado || !filtroRegional ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>⚠️ Selecione um período e uma regional para visualizar o relatório</p>
            </div>
          ) : (
            <>
              <div className="dashboards">
                {(() => {
                  const regionalSelecionada = relatorioMetas.find((r) => r.id === filtroRegional);
                  if (!regionalSelecionada) {
                    return (
                      <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <p>⚠️ Regional não encontrada</p>
                      </div>
                    );
                  }
                  return construirTabelaMetas(regionalSelecionada);
                })()}
              </div>

              {erro ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <p>⚠️ Não foi possível carregar o comissionamento. Verifique a rota do backend.</p>
                </div>
              ) : carregandoComissao ? (
                <div className="loading" style={{ marginTop: '20px' }}>
                  <div className="spinner"></div>
                </div>
              ) : dadosComissao ? (
                <div className="comissao-card">
                  <h2 className="comissao-title">Resumo de Comissionamento</h2>
                  <div className="comissao-resumo">
                    <div>
                      <span className="comissao-label">Quantidade de Vendedores</span>
                      <strong>{formatNumero(dadosComissao.qtdVendedores)}</strong>
                    </div>
                    <div>
                      <span className="comissao-label">Incremento sobre Meta Global</span>
                      <strong>{formatPercentual(dadosComissao.incrementoGlobal)}</strong>
                    </div>
                    <div>
                      <span className="comissao-label">Soma dos Percentuais Ponderados</span>
                      <strong>{formatPercentual(dadosComissao.calculo.percentualFinalPonderado)}</strong>
                    </div>
                  </div>
                  <table className="comissao-table">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Realizado</th>
                        <th>% Atingido</th>
                        <th>Peso</th>
                        <th>% Ponderado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>VENDAS</td>
                        <td>{formatNumero(dadosComissao.vendas.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.vendas.percentualAtingido)}</td>
                        <td>{formatPercentual(dadosComissao.vendas.peso)}</td>
                        <td>{formatPercentual(dadosComissao.vendas.percentualPonderado)}</td>
                      </tr>
                      <tr>
                        <td>CHURN</td>
                        <td>{formatNumero(dadosComissao.churn.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.churn.percentualAtingido)}</td>
                        <td>{formatPercentual(dadosComissao.churn.peso)}</td>
                        <td>{formatPercentual(dadosComissao.churn.percentualPonderado)}</td>
                      </tr>
                      <tr>
                        <td>MUDANÇA DE TITULARIDADE</td>
                        <td>{formatNumero(dadosComissao.mudancaTitularidade.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.mudancaTitularidade.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>MIGRAÇÃO DE TECNOLOGIA</td>
                        <td>{formatNumero(dadosComissao.migracaoTecnologia.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.migracaoTecnologia.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>RENOVAÇÃO</td>
                        <td>{formatNumero(dadosComissao.renovacao.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.renovacao.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>PLANO EVENTO</td>
                        <td>{formatNumero(dadosComissao.planoEvento.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.planoEvento.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>SVA</td>
                        <td>{formatNumero(dadosComissao.sva.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.sva.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>TELEFONIA</td>
                        <td>{formatNumero(dadosComissao.telefonia.realizado)}</td>
                        <td>{formatPercentual(dadosComissao.telefonia.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <p>⚠️ Nenhum dado de comissionamento encontrado para o filtro selecionado</p>
                </div>
              )}

              {/* Seção de Comissionamento por Vendedor */}
              {periodoSelecionado && filtroRegional && (
                <div className="comissao-card comissao-card--vendedores" style={{ marginTop: '20px' }}>
                  <h2 className="comissao-title comissao-title--vendedores">Comissionamento por Vendedor</h2>
                  {carregandoVendedores ? (
                    <div className="loading" style={{ padding: '40px' }}>
                      <div className="spinner"></div>
                    </div>
                  ) : dadosVendedores && dadosVendedores.vendedores && dadosVendedores.vendedores.length > 0 ? (
                    <div className="comissao-table-scroll">
                      <table className="comissao-table comissao-table--vendedores">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: '600' }}>
                            <th style={{ textAlign: 'left', padding: '12px' }}>Vendedor</th>
                            <th style={{ textAlign: 'center', padding: '12px' }}>Total Comissão</th>
                            <th colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>Vendas</th>
                            <th colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>Mudança de Titularidade</th>
                            <th colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>Migração de Tecnologia</th>
                            <th colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>Renovação</th>
                            <th colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>Plano Evento</th>
                            <th colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>SVA</th>
                            <th colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>Telefonia</th>
                          </tr>
                          <tr style={{ backgroundColor: '#f8f9fa', fontSize: '12px', fontWeight: '500' }}>
                            <th></th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Valor Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>% Alcançado</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Comissão</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Valor Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>% Alcançado</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Comissão</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Valor Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>% Alcançado</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Comissão</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Valor Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>% Alcançado</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Comissão</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Valor Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>% Alcançado</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Comissão</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Valor Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>% Alcançado</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Comissão</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Valor Total</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>% Alcançado</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Comissão</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dadosVendedores.vendedores.map((vendedor) => (
                            <tr key={vendedor.id}>
                              <td><strong>{vendedor.nome}</strong></td>
                              <td>
                                R$ {formatNumero(
                                  (Number(vendedor.vendas.comissao) || 0) +
                                  (Number(vendedor.mudancaTitularidade.comissao) || 0) +
                                  (Number(vendedor.migracaoTecnologia.comissao) || 0) +
                                  (Number(vendedor.renovacao.comissao) || 0) +
                                  (Number(vendedor.planoEvento.comissao) || 0) +
                                  (Number(vendedor.sva.comissao) || 0) +
                                  (Number(vendedor.telefonia.comissao) || 0)
                                )}
                              </td>
                              <td>{formatNumero(vendedor.vendas.quantidade)}</td>
                              <td>R$ {formatNumero(vendedor.vendas.valorTotal)}</td>
                              <td>{formatPercentual(vendedor.vendas.percentualAlcancado)}</td>
                              <td>R$ {formatNumero(vendedor.vendas.comissao)}</td>
                              <td>{formatNumero(vendedor.mudancaTitularidade.quantidade)}</td>
                              <td>R$ {formatNumero(vendedor.mudancaTitularidade.valorTotal)}</td>
                              <td>{formatPercentual(vendedor.mudancaTitularidade.percentualAlcancado)}</td>
                              <td>R$ {formatNumero(vendedor.mudancaTitularidade.comissao)}</td>
                              <td>{formatNumero(vendedor.migracaoTecnologia.quantidade)}</td>
                              <td>R$ {formatNumero(vendedor.migracaoTecnologia.valorTotal)}</td>
                              <td>{formatPercentual(vendedor.migracaoTecnologia.percentualAlcancado)}</td>
                              <td>R$ {formatNumero(vendedor.migracaoTecnologia.comissao)}</td>
                              <td>{formatNumero(vendedor.renovacao.quantidade)}</td>
                              <td>R$ {formatNumero(vendedor.renovacao.valorTotal)}</td>
                              <td>{formatPercentual(vendedor.renovacao.percentualAlcancado)}</td>
                              <td>R$ {formatNumero(vendedor.renovacao.comissao)}</td>
                              <td>{formatNumero(vendedor.planoEvento.quantidade)}</td>
                              <td>R$ {formatNumero(vendedor.planoEvento.valorTotal)}</td>
                              <td>{formatPercentual(vendedor.planoEvento.percentualAlcancado)}</td>
                              <td>R$ {formatNumero(vendedor.planoEvento.comissao)}</td>
                              <td>{formatNumero(vendedor.sva.quantidade)}</td>
                              <td>R$ {formatNumero(vendedor.sva.valorTotal)}</td>
                              <td>{formatPercentual(vendedor.sva.percentualAlcancado)}</td>
                              <td>R$ {formatNumero(vendedor.sva.comissao)}</td>
                              <td>{formatNumero(vendedor.telefonia.quantidade)}</td>
                              <td>R$ {formatNumero(vendedor.telefonia.valorTotal)}</td>
                              <td>{formatPercentual(vendedor.telefonia.percentualAlcancado)}</td>
                              <td>R$ {formatNumero(vendedor.telefonia.comissao)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <p>⚠️ Nenhum vendedor encontrado para esta regional e período</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default RelatorioComissionamentoPage;
