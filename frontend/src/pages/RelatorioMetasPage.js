import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { churnRegionaisAPI, regionaisAPI, vendasMensaisAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/RelatorioMetasPage.css';

const MESES = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
};

const TIPOS_META = [
  { key: 'vendas', label: 'Vendas' },
  { key: 'churn', label: 'Churn' },
  { key: 'mudancaTitularidade', label: 'Mudanca de titularidade' },
  { key: 'migracaoTecnologia', label: 'Migracao de tecnologia' },
  { key: 'renovacao', label: 'Renovacao' },
  { key: 'planoEvento', label: 'Plano evento' },
  { key: 'sva', label: 'SVA' },
  { key: 'telefonia', label: 'Telefonia' }
];

const TIPO_ALIASES = {
  vendas: ['vendas'],
  churn: ['churn'],
  mudancaTitularidade: ['mudanca de titularidade', 'mudanca titularidade'],
  migracaoTecnologia: ['migracao de tecnologia', 'migracao tecnologia'],
  renovacao: ['renovacao'],
  planoEvento: ['plano evento'],
  sva: ['sva'],
  telefonia: ['telefonia']
};

const TIPO_KEY_MAP = {
  vendas: 'vendas',
  churn: 'churn',
  mudancaTitularidade: 'mudancaTitularidade',
  migracaoTecnologia: 'migracaoTecnologia',
  renovacao: 'renovacao',
  planoEvento: 'planoEvento',
  sva: 'sva',
  telefonia: 'telefonia'
};

const normalizarTexto = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const obterChaveTipo = (valor) => {
  const texto = normalizarTexto(valor);
  for (const [chave, aliases] of Object.entries(TIPO_ALIASES)) {
    if (aliases.some((alias) => texto === alias || texto.includes(alias))) {
      return chave;
    }
  }
  return null;
};

const parsePeriodo = (periodo) => {
  const [mesTxt, anoTxt] = String(periodo || '').split('/');
  const mesToken = normalizarTexto(mesTxt).slice(0, 3);
  const mes = MESES[mesToken];
  const anoNum = Number(String(anoTxt || '').trim());
  if (mes === undefined || Number.isNaN(anoNum)) return null;
  const ano = anoNum < 100 ? 2000 + anoNum : anoNum;
  return { mes, ano };
};

const contarDiasUteisMes = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return 0;
  const { mes, ano } = parsed;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= ultimoDia; d += 1) {
    const day = new Date(ano, mes, d).getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const contarDiasUteisPassados = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return 0;
  const { mes, ano } = parsed;
  const hoje = new Date();
  const ordemPeriodo = ano * 100 + mes;
  const ordemHoje = hoje.getFullYear() * 100 + hoje.getMonth();

  if (ordemPeriodo < ordemHoje) return contarDiasUteisMes(periodo);
  if (ordemPeriodo > ordemHoje) return 0;

  let count = 0;
  for (let d = 1; d <= hoje.getDate(); d += 1) {
    const day = new Date(ano, mes, d).getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const isPeriodoMesVigente = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return false;
  const hoje = new Date();
  return parsed.ano === hoje.getFullYear() && parsed.mes === hoje.getMonth();
};

const formatMetaIndividual = (valor) => {
  const numero = Number(valor) || 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
};

const arredondarParaCima = (valor) => Math.ceil(Number(valor) || 0);

export default function RelatorioMetasPage() {
  const navigate = useNavigate();
  const [relatorio, setRelatorio] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState([]);
  const [duTotal, setDuTotal] = useState(0);
  const [duPassado, setDuPassado] = useState(0);
  const [indicadoresPorRegional, setIndicadoresPorRegional] = useState({});
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';

  const carregarRelatorio = async () => {
    try {
      setCarregando(true);
      const [metasResp, regionaisResp] = await Promise.all([
        api.get('/relatorio-metas'),
        regionaisAPI.listar()
      ]);

      const metas = metasResp.data || [];
      const regionaisData = regionaisResp.data?.regionais || [];
      setRelatorio(metas);
      setRegionais(regionaisData);

      const periodos = new Set();
      metas.forEach((regional) => {
        (regional.metas || []).forEach((meta) => {
          if (meta.periodo) periodos.add(meta.periodo);
        });
      });

      const periodosOrdenados = Array.from(periodos).sort();
      setPeriodosDisponiveis(periodosOrdenados);

      if (periodosOrdenados.length > 0) {
        setPeriodoSelecionado((atual) =>
          atual && periodosOrdenados.includes(atual)
            ? atual
            : periodosOrdenados[periodosOrdenados.length - 1]
        );
      }

      setErro('');
    } catch (error) {
      let mensagemErro = 'Erro desconhecido';
      if (error.response?.status === 403) {
        mensagemErro = 'Acesso negado. Voce precisa ser Admin para acessar este relatorio.';
      } else if (error.response?.status === 401) {
        mensagemErro = 'Nao autorizado. Faca login novamente.';
      } else if (error.response) {
        mensagemErro = error.response.data?.erro || `Erro ${error.response.status}`;
      } else if (error.request) {
        mensagemErro = 'Erro de conexao: backend nao esta respondendo.';
      } else {
        mensagemErro = error.message;
      }

      setErro(`Erro ao carregar relatorio: ${mensagemErro}`);
      setRelatorio([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, []);

  useEffect(() => {
    if (!periodoSelecionado) {
      setDuTotal(0);
      setDuPassado(0);
      setIndicadoresPorRegional({});
      return;
    }

    const vigente = isPeriodoMesVigente(periodoSelecionado);
    setDuTotal(contarDiasUteisMes(periodoSelecionado));
    setDuPassado(contarDiasUteisPassados(periodoSelecionado));

    if (!vigente) {
      setIndicadoresPorRegional({});
      return;
    }

    const carregarIndicadores = async () => {
      try {
        const [vendasResp, churnResp] = await Promise.all([
          vendasMensaisAPI.listar(periodoSelecionado),
          churnRegionaisAPI.listar({ periodo: periodoSelecionado })
        ]);

        const porRegional = {};
        const vendas = vendasResp.data?.vendas || [];
        const churn = churnResp.data?.registros || [];

        vendas.forEach((item) => {
          const regionalId = item.regional_id || item.regionalId;
          if (!regionalId) return;
          if (!porRegional[regionalId]) porRegional[regionalId] = {};
          porRegional[regionalId].vendas = (porRegional[regionalId].vendas || 0) + (Number(item.vendas_volume) || 0);
          porRegional[regionalId].mudancaTitularidade = (porRegional[regionalId].mudancaTitularidade || 0) + (Number(item.mudanca_titularidade_volume) || 0);
          porRegional[regionalId].migracaoTecnologia = (porRegional[regionalId].migracaoTecnologia || 0) + (Number(item.migracao_tecnologia_volume) || 0);
          porRegional[regionalId].renovacao = (porRegional[regionalId].renovacao || 0) + (Number(item.renovacao_volume) || 0);
          porRegional[regionalId].planoEvento = (porRegional[regionalId].planoEvento || 0) + (Number(item.plano_evento_volume) || 0);
          porRegional[regionalId].sva = (porRegional[regionalId].sva || 0) + (Number(item.sva_volume) || 0);
          porRegional[regionalId].telefonia = (porRegional[regionalId].telefonia || 0) + (Number(item.telefonia_volume) || 0);
        });

        churn.forEach((item) => {
          const regionalId = item.regional_id || item.regionalId;
          if (!regionalId) return;
          if (!porRegional[regionalId]) porRegional[regionalId] = {};
          porRegional[regionalId].churn = (porRegional[regionalId].churn || 0) + (Number(item.churn) || 0);
        });

        setIndicadoresPorRegional(porRegional);
      } catch {
        setIndicadoresPorRegional({});
      }
    };

    carregarIndicadores();
  }, [periodoSelecionado]);

  const filtrarMetasPorPeriodo = (metas) => {
    if (!periodoSelecionado) return [];
    return (metas || []).filter((meta) => meta.periodo === periodoSelecionado);
  };

  const construirTabelaPorRegional = (regional) => {
    const metasDoRegional = filtrarMetasPorPeriodo(regional.metas);
    const baseMetaIndividualExibida = Number(metasDoRegional?.[0]?.baseMetaIndividual?.valor || 0);
    const mostraTendencia = isPeriodoMesVigente(periodoSelecionado);

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
              <span className="comissao-label">Base Meta (FTE)</span>
              <strong>{baseMetaIndividualExibida > 0 ? baseMetaIndividualExibida : '-'}</strong>
            </div>
            <div>
              <span className="comissao-label">Periodo</span>
              <strong>{periodoSelecionado}</strong>
            </div>
          </div>
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Nenhuma meta cadastrada para o periodo {periodoSelecionado}</p>
          </div>
        </div>
      );
    }

    const metasPorTipo = {};
    metasDoRegional.forEach((meta) => {
      const key = obterChaveTipo(meta.tipoMeta);
      if (key && !metasPorTipo[key]) {
        metasPorTipo[key] = meta;
      }
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
            <span className="comissao-label">Base Meta (FTE)</span>
            <strong>{baseMetaIndividualExibida > 0 ? baseMetaIndividualExibida : '-'}</strong>
          </div>
          <div>
            <span className="comissao-label">Incremento Global</span>
            <strong>+{metasDoRegional[0]?.incrementoGlobal || 0}%</strong>
          </div>
          <div>
            <span className="comissao-label">Periodo</span>
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
              {mostraTendencia && <th colSpan="2" style={{ textAlign: 'center' }}>Tendencia Mes</th>}
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
              {mostraTendencia && (
                <>
                  <th>Proj.</th>
                  <th>% M1</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {TIPOS_META.map((tipoCfg) => {
              const meta = metasPorTipo[tipoCfg.key];

              if (!meta) {
                return (
                  <tr key={tipoCfg.key}>
                    <td>{tipoCfg.label.toUpperCase()}</td>
                    <td colSpan={mostraTendencia ? 14 : 12} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Sem dados
                    </td>
                  </tr>
                );
              }

              const tipoKey = TIPO_KEY_MAP[tipoCfg.key];
              const realizado = Number(indicadoresPorRegional?.[regional.id]?.[tipoKey] || 0);
              const tendencia = duPassado > 0 ? (realizado / duPassado) * duTotal : 0;
              const percMetaM1 = Number(meta.metaRegional1) > 0 ? (tendencia / Number(meta.metaRegional1)) * 100 : 0;

              return (
                <tr key={tipoCfg.key}>
                  <td>{tipoCfg.label.toUpperCase()}</td>
                  <td>{arredondarParaCima(meta.metaRegional1)}</td>
                  <td>{meta.percentual1}%</td>
                  <td>{arredondarParaCima(meta.metaRegional2)}</td>
                  <td>{meta.percentual2}%</td>
                  <td>{arredondarParaCima(meta.metaRegional3)}</td>
                  <td>{meta.percentual3}%</td>
                  <td>{formatMetaIndividual(meta.metaIndividual1)}</td>
                  <td>{meta.percentualIndividual1}%</td>
                  <td>{formatMetaIndividual(meta.metaIndividual2)}</td>
                  <td>{meta.percentualIndividual2}%</td>
                  <td>{formatMetaIndividual(meta.metaIndividual3)}</td>
                  <td>{meta.percentualIndividual3}%</td>
                  {mostraTendencia && (
                    <>
                      <td>{formatMetaIndividual(tendencia)}</td>
                      <td>{formatMetaIndividual(percMetaM1)}%</td>
                    </>
                  )}
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

  const mostraAvisoProjecaoMesVigente = (
    periodoSelecionado
    && isPeriodoMesVigente(periodoSelecionado)
    && duPassado > 0
    && duTotal > 0
  );

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
            <p style={{ fontSize: '12px', color: 'var(--primary)' }}>{perfil.toUpperCase()}</p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>Sair do Sistema</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Relatorio de Metas</h1>
          <p>Acompanhe o desempenho das metas globais e individuais por regional</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <div className="glass-card">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Periodo</label>
              <select
                className="form-select"
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
              >
                <option value="">Selecione um periodo</option>
                {periodosDisponiveis.map((periodo) => (
                  <option key={periodo} value={periodo}>{periodo}</option>
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
                {regionais.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 0, minWidth: 'auto', display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={carregarRelatorio}>Atualizar</button>
            </div>
          </div>

          {mostraAvisoProjecaoMesVigente && (
            <div className="alert alert-warning">
              <strong>Atencao: mes vigente com projecao.</strong> A coluna de tendencia usa projecao por dias uteis
              ({duPassado}/{duTotal}) e pode gerar vies quando comparada com meses fechados.
            </div>
          )}

          {periodoSelecionado && !erro && (
            <div className="dashboards">
              {(() => {
                const filtrados = relatorio.filter((regional) => {
                  if (!filtroRegional) return true;
                  return String(regional.id) === String(filtroRegional);
                });

                if (filtrados.length === 0) {
                  return (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <p>Nenhuma regional encontrada com os filtros aplicados</p>
                    </div>
                  );
                }

                return filtrados.map((regional) => construirTabelaPorRegional(regional));
              })()}
            </div>
          )}

          {!periodoSelecionado && !erro && (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>Selecione um periodo para visualizar os relatorios</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
