import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import { colaboradoresAPI, comissionamentoAPI, regionaisAPI, vendasMensaisAPI } from '../services/api';

const DSR_DIVISOR_PADRAO = 6;
const TOLERANCIA = 0.01;

const TIPOS = [
  { key: 'vendas', label: 'Vendas', invertido: false, semFinanceiro: false },
  { key: 'churn', label: 'Churn', invertido: true, semFinanceiro: true },
  { key: 'mudancaTitularidade', label: 'Mudanca de Titularidade', invertido: false, semFinanceiro: false },
  { key: 'migracaoTecnologia', label: 'Migracao de Tecnologia', invertido: false, semFinanceiro: false },
  { key: 'renovacao', label: 'Renovacao', invertido: false, semFinanceiro: false },
  { key: 'planoEvento', label: 'Plano Evento', invertido: false, semFinanceiro: false },
  { key: 'sva', label: 'SVA', invertido: false, semFinanceiro: false },
  { key: 'telefonia', label: 'Telefonia', invertido: false, semFinanceiro: false }
];

const novoRegistroMeta = () => ({ meta1: '', meta2: '', meta3: '', percM1: '', percM2: '', percM3: '', realizadoQtd: '' });
const novoRegistroIndividual = () => ({ meta1: '', meta2: '', meta3: '', percM1: '', percM2: '', percM3: '', realizadoQtd: '', realizadoValor: '' });
const estadoRegionalInicial = () => TIPOS.reduce((acc, t) => { acc[t.key] = novoRegistroMeta(); return acc; }, {});
const estadoIndividualInicial = () => TIPOS.reduce((acc, t) => { acc[t.key] = novoRegistroIndividual(); return acc; }, {});
const estadoBoolTipos = () => TIPOS.reduce((acc, t) => { acc[t.key] = false; return acc; }, {});
const estadoNumeroTipos = () => TIPOS.reduce((acc, t) => { acc[t.key] = 0; return acc; }, {});

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;

  // Formato pt-BR com virgula decimal: 1.234,56 -> 1234.56
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Apenas separador de milhar com ponto: 1.234.567 -> 1234567
    s = s.replace(/\./g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const MESES_MAP = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
};

const obterFimPeriodo = (periodo) => {
  const [mesTxt, anoTxt] = String(periodo || '').trim().split('/');
  if (!mesTxt || !anoTxt) return null;
  const mes = MESES_MAP[String(mesTxt).toLowerCase()];
  if (mes === undefined) return null;
  const anoNum = Number(anoTxt);
  if (!Number.isFinite(anoNum)) return null;
  const ano = anoNum < 100 ? 2000 + anoNum : anoNum;
  return new Date(ano, mes + 1, 0, 23, 59, 59, 999);
};

const colaboradorAtivoNoPeriodo = (colaborador, periodo) => {
  const status = String(colaborador?.status || '').toLowerCase();
  const fimPeriodo = obterFimPeriodo(periodo);
  if (!fimPeriodo) return status === 'ativo';

  const dataAtivacao = colaborador?.data_ativacao ? new Date(colaborador.data_ativacao) : null;
  if (dataAtivacao && Number.isFinite(dataAtivacao.getTime()) && dataAtivacao > fimPeriodo) {
    return false;
  }

  const dataInativacao = colaborador?.data_inativacao ? new Date(colaborador.data_inativacao) : null;
  if (dataInativacao && Number.isFinite(dataInativacao.getTime()) && dataInativacao <= fimPeriodo) {
    return false;
  }

  if (!dataInativacao) {
    return status === 'ativo';
  }

  return true;
};

const colaboradorElegivelComoVendedor = (colaborador) => {
  const funcao = String(colaborador?.funcao_nome || '').toLowerCase();
  if (!funcao) return true;

  if (funcao.includes('gerente regional')) return false;
  if (funcao.includes('supervisor comercial')) return false;
  if (funcao.includes('supervisor regional')) return false;
  if (funcao.includes('gerente da matriz')) return false;
  if (funcao.includes('gerente matriz')) return false;
  if (funcao.includes('gerente') && funcao.includes('matriz')) return false;

  return true;
};
const toPerc = (v) => {
  const num = toNum(v);
  // Campos da UI sao preenchidos em "pontos percentuais" (ex.: 1, 3, 5, 100).
  // Logo, 1 deve ser interpretado como 1% (0.01), nao 100% (1.0).
  return Math.abs(num) >= 1 ? num / 100 : num;
};
const moeda = (v) => toNum(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const percentual = (v) => `${(toNum(v) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const formatarCampoPercentual = (fator) => (toNum(fator) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatarCampoNumero = (valor, casas = 2) => {
  const numero = toNum(valor);
  if (!Number.isFinite(numero)) return '';
  return numero.toLocaleString('pt-BR', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: casas
  });
};

function calcularPercentualPorMeta(quantidade, regra, invertido = false) {
  const q = toNum(quantidade);
  const m1 = toNum(regra.meta1);
  const m2 = toNum(regra.meta2);
  const m3 = toNum(regra.meta3);
  const p1 = toPerc(regra.percM1);
  const p2 = toPerc(regra.percM2);
  const p3 = toPerc(regra.percM3);

  if (invertido) {
    if (q <= m1) return p1;
    if (q <= m2) return p2;
    if (q <= m3) return p3;
    return 0;
  }

  if (q >= m3) {
    if (q >= m2) {
      if (q >= m1) return p1;
      return p2;
    }
    return p3;
  }
  return 0;
}

export default function SimuladorRemuneracaoPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [periodos, setPeriodos] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [vendedoresPeriodoRegional, setVendedoresPeriodoRegional] = useState([]);

  const [contexto, setContexto] = useState({ periodo: '', regionalId: '', vendedorId: '' });

  const [pesoVendas, setPesoVendas] = useState('50');
  const [regional, setRegional] = useState(estadoRegionalInicial);
  const [individual, setIndividual] = useState(estadoIndividualInicial);
  const [valorManualPorTipo, setValorManualPorTipo] = useState(estadoBoolTipos);
  const [ticketMedioPorTipo, setTicketMedioPorTipo] = useState(estadoNumeroTipos);

  const [baselineReal, setBaselineReal] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        setCarregando(true);
        const [vendasResp, regionaisResp, colabResp] = await Promise.allSettled([
          vendasMensaisAPI.listar(),
          regionaisAPI.listar(),
          colaboradoresAPI.listar()
        ]);

        const vendas = vendasResp.status === 'fulfilled' ? (vendasResp.value.data?.vendas || []) : [];
        const listaRegionais = regionaisResp.status === 'fulfilled' ? (regionaisResp.value.data?.regionais || []) : [];
        const listaColaboradores = colabResp.status === 'fulfilled' ? (colabResp.value.data?.colaboradores || []) : [];

        const periodosSet = new Set(vendas.map((v) => v.periodo).filter(Boolean));
        const listaPeriodos = Array.from(periodosSet);
        const ordemMes = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
        listaPeriodos.sort((a, b) => {
          const [ma, aa] = String(a).toLowerCase().split('/');
          const [mb, ab] = String(b).toLowerCase().split('/');
          const oa = (Number(aa || 0) * 100) + (ordemMes[ma] ?? 0);
          const ob = (Number(ab || 0) * 100) + (ordemMes[mb] ?? 0);
          return oa - ob;
        });

        const falhas = [];
        if (vendasResp.status === 'rejected') falhas.push('periodos');
        if (regionaisResp.status === 'rejected') falhas.push('regionais');
        if (colabResp.status === 'rejected') falhas.push('colaboradores');

        setPeriodos(listaPeriodos);
        setRegionais(listaRegionais);
        setColaboradores(listaColaboradores);

        if (falhas.length > 0) {
          setErro(`Carga parcial no simulador. Falha em: ${falhas.join(', ')}`);
        }
      } catch (e) {
        setErro(e?.response?.data?.erro || 'Erro ao carregar dados iniciais do simulador');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  useEffect(() => {
    const carregarVendedoresContexto = async () => {
      if (!contexto.periodo || !contexto.regionalId) {
        setVendedoresPeriodoRegional([]);
        return;
      }

      try {
        const resp = await comissionamentoAPI.listarVendedores(contexto.periodo, contexto.regionalId);
        const vendedores = Array.isArray(resp?.data?.vendedores) ? resp.data.vendedores : [];
        setVendedoresPeriodoRegional(vendedores);

        setContexto((prev) => {
          if (!prev.vendedorId) return prev;
          const existe = vendedores.some((v) => v.id === prev.vendedorId);
          return existe ? prev : { ...prev, vendedorId: '' };
        });
      } catch (_) {
        setVendedoresPeriodoRegional([]);
      }
    };

    carregarVendedoresContexto();
  }, [contexto.periodo, contexto.regionalId]);

  const vendedoresFiltrados = useMemo(() => {
    if (contexto.periodo && contexto.regionalId && vendedoresPeriodoRegional.length > 0) {
      return vendedoresPeriodoRegional;
    }

    if (contexto.periodo && contexto.regionalId && vendedoresPeriodoRegional.length === 0) {
      return colaboradores.filter(
        (c) =>
          c.regional_id === contexto.regionalId &&
          colaboradorAtivoNoPeriodo(c, contexto.periodo) &&
          colaboradorElegivelComoVendedor(c)
      );
    }

    if (!contexto.regionalId) return colaboradores.filter(colaboradorElegivelComoVendedor);
    return colaboradores.filter((c) => c.regional_id === contexto.regionalId && colaboradorElegivelComoVendedor(c));
  }, [colaboradores, contexto.periodo, contexto.regionalId, vendedoresPeriodoRegional]);

  const calculo = useMemo(() => {
    const percentualRegional = {};

    TIPOS.forEach((tipo) => {
      percentualRegional[tipo.key] = calcularPercentualPorMeta(
        regional[tipo.key]?.realizadoQtd,
        regional[tipo.key] || novoRegistroMeta(),
        tipo.invertido
      );
    });

    const pesoVendasNorm = Math.min(1, Math.max(0, toPerc(pesoVendas)));
    const pesoChurnNorm = 1 - pesoVendasNorm;

    const percentualResumo = {
      ...percentualRegional,
      vendas: (percentualRegional.vendas || 0) * pesoVendasNorm + (percentualRegional.churn || 0) * pesoChurnNorm
    };

    const etapas = TIPOS.map((tipo) => {
      const dadosInd = individual[tipo.key] || novoRegistroIndividual();
      const percIndividual = calcularPercentualPorMeta(dadosInd.realizadoQtd, dadosInd, tipo.invertido);
      const valor = tipo.semFinanceiro ? 0 : toNum(dadosInd.realizadoValor);
      const percResumoTipo = toNum(percentualResumo[tipo.key]);
      const comissao = tipo.semFinanceiro ? 0 : (valor * percResumoTipo) + (valor * percIndividual);

      return {
        ...tipo,
        percRegional: percentualRegional[tipo.key] || 0,
        percResumo: percResumoTipo,
        percIndividual,
        valor,
        comissao
      };
    });

    const totalComissao = etapas.reduce((acc, e) => acc + toNum(e.comissao), 0);
    const dsr = totalComissao / DSR_DIVISOR_PADRAO;
    const totalComDsr = totalComissao + dsr;

    return { pesoVendasNorm, pesoChurnNorm, percentualRegional, percentualResumo, etapas, totalComissao, dsr, totalComDsr };
  }, [regional, individual, pesoVendas]);

  const validacao = useMemo(() => {
    if (!baselineReal) return null;

    const porTipo = TIPOS.map((tipo) => {
      const sim = calculo.etapas.find((e) => e.key === tipo.key);
      const real = baselineReal.etapas.find((e) => e.tipo === tipo.key);
      const diff = toNum(sim?.comissao) - toNum(real?.comissao);
      return {
        tipo: tipo.label,
        real: toNum(real?.comissao),
        simulado: toNum(sim?.comissao),
        diferenca: diff,
        ok: Math.abs(diff) <= TOLERANCIA
      };
    });

    const diffTotal = toNum(calculo.totalComissao) - toNum(baselineReal.resultado?.totalComissao);
    return {
      porTipo,
      totalReal: toNum(baselineReal.resultado?.totalComissao),
      totalSimulado: toNum(calculo.totalComissao),
      diffTotal,
      okTotal: Math.abs(diffTotal) <= TOLERANCIA
    };
  }, [baselineReal, calculo]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const setCampoContexto = (campo, valor) => setContexto((prev) => ({ ...prev, [campo]: valor, ...(campo === 'regionalId' ? { vendedorId: '' } : {}) }));
  const setCampoRegional = (tipo, campo, valor) => setRegional((prev) => ({ ...prev, [tipo]: { ...prev[tipo], [campo]: valor } }));
  const setCampoIndividual = (tipo, campo, valor) => {
    setIndividual((prev) => {
      const atual = { ...prev[tipo], [campo]: valor };
      if (campo === 'realizadoQtd' && !TIPOS.find((t) => t.key === tipo)?.semFinanceiro) {
        const ticket = toNum(ticketMedioPorTipo[tipo]);
        if (!valorManualPorTipo[tipo] && ticket > 0) {
          atual.realizadoValor = (toNum(valor) * ticket).toFixed(2);
        }
      }
      return { ...prev, [tipo]: atual };
    });

    if (campo === 'realizadoValor') {
      setValorManualPorTipo((prev) => ({ ...prev, [tipo]: true }));
    }
  };

  const carregarCenarioReal = async () => {
    setErro('');
    setMensagem('');
    setBaselineReal(null);

    if (!contexto.periodo || !contexto.regionalId || !contexto.vendedorId) {
      setErro('Selecione periodo, regional e vendedor para carregar dados reais');
      return;
    }

    try {
      setCarregando(true);
      const resp = await comissionamentoAPI.simularVendedor({
        periodo: contexto.periodo,
        regionalId: contexto.regionalId,
        vendedorId: contexto.vendedorId,
        simulacao: {}
      });

      const real = resp.data;
      setBaselineReal(real);

      const peso = toNum(real?.regras?.vendas?.pesoVendasChurn) * 100;
      setPesoVendas(String(Number.isFinite(peso) ? peso : 50));

      const proximoRegional = estadoRegionalInicial();
      const proximoIndividual = estadoIndividualInicial();
      const etapasPorTipo = new Map((real.etapas || []).map((e) => [e.tipo, e]));

      TIPOS.forEach((tipo) => {
        const regra = real?.regras?.[tipo.key] || null;
        const etapa = etapasPorTipo.get(tipo.key) || {};
        const baseInd = real?.entradas?.base?.[tipo.key] || { quantidade: 0, valorTotal: 0 };

        proximoRegional[tipo.key] = {
          meta1: formatarCampoNumero(regra?.meta1Volume),
          meta2: formatarCampoNumero(regra?.meta2Volume),
          meta3: formatarCampoNumero(regra?.meta3Volume),
          percM1: formatarCampoPercentual(regra?.meta1Percent),
          percM2: formatarCampoPercentual(regra?.meta2Percent),
          percM3: formatarCampoPercentual(regra?.meta3Percent),
          realizadoQtd: formatarCampoNumero(real?.regionalRealizado?.[tipo.key], 0)
        };

        proximoIndividual[tipo.key] = {
          meta1: formatarCampoNumero(etapa?.metaIndividual?.meta1),
          meta2: formatarCampoNumero(etapa?.metaIndividual?.meta2),
          meta3: formatarCampoNumero(etapa?.metaIndividual?.meta3),
          percM1: ((toNum(regra?.meta1PercentIndividual)) * 100).toFixed(2),
          percM2: ((toNum(regra?.meta2PercentIndividual)) * 100).toFixed(2),
          percM3: ((toNum(regra?.meta3PercentIndividual)) * 100).toFixed(2),
          realizadoQtd: formatarCampoNumero(baseInd?.quantidade, 0),
          realizadoValor: tipo.semFinanceiro ? '' : formatarCampoNumero(baseInd?.valorTotal)
        };
      });

      const proximoTicket = estadoNumeroTipos();
      TIPOS.forEach((tipo) => {
        const baseInd = real?.entradas?.base?.[tipo.key] || { quantidade: 0, valorTotal: 0 };
        const qtd = toNum(baseInd?.quantidade);
        const val = toNum(baseInd?.valorTotal);
        proximoTicket[tipo.key] = qtd > 0 ? (val / qtd) : 0;
      });

      setRegional(proximoRegional);
      setIndividual(proximoIndividual);
      setTicketMedioPorTipo(proximoTicket);
      setValorManualPorTipo(estadoBoolTipos());
      setMensagem('Dados reais carregados. Todos os campos permanecem editaveis para testes.');
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Erro ao carregar cenario real');
    } finally {
      setCarregando(false);
    }
  };

  const limpar = () => {
    setRegional(estadoRegionalInicial());
    setIndividual(estadoIndividualInicial());
    setPesoVendas('50');
    setTicketMedioPorTipo(estadoNumeroTipos());
    setValorManualPorTipo(estadoBoolTipos());
    setBaselineReal(null);
    setMensagem('');
    setErro('');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <LogoImage className="app-logo-mark" alt="UNI Internet" />
          <h1>UNI Gestao Variavel</h1>
        </div>
        <SidebarNav />
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{usuario.nome}</strong>
            <p>{usuario.email}</p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>Sair do Sistema</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Simulador Completo de Comissionamento</h1>
          <p>Carregue um cenario real e teste alteracoes mantendo a regra fiel ao modelo.</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>1. Contexto e Carga Real</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Periodo</label>
              <select className="form-select" value={contexto.periodo} onChange={(e) => setCampoContexto('periodo', e.target.value)}>
                <option value="">Selecione</option>
                {periodos.map((pItem) => <option key={pItem} value={pItem}>{pItem}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Regional</label>
              <select className="form-select" value={contexto.regionalId} onChange={(e) => setCampoContexto('regionalId', e.target.value)}>
                <option value="">Selecione</option>
                {regionais.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vendedor</label>
              <select className="form-select" value={contexto.vendedorId} onChange={(e) => setCampoContexto('vendedorId', e.target.value)}>
                <option value="">Selecione</option>
                {vendedoresFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Peso Vendas (%)</label>
              <input className="form-control" value={pesoVendas} onChange={(e) => setPesoVendas(e.target.value)} />
              <small>Peso Vendas = {percentual(calculo.pesoVendasNorm)} | Peso Churn = {percentual(calculo.pesoChurnNorm)}</small>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button className="btn btn-success" type="button" onClick={carregarCenarioReal} disabled={carregando}>{carregando ? 'Carregando...' : 'Carregar Dados Reais'}</button>
            <button className="btn btn-secondary" type="button" onClick={limpar}>Limpar</button>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>2. Premissas Regionais (% Resumo)</h3>
          <div className="table-responsive"><table><thead><tr>
            <th>Tipo</th><th>Meta M1</th><th>% M1</th><th>Meta M2</th><th>% M2</th><th>Meta M3</th><th>% M3</th><th>Realizado Regional</th><th>% Regional</th><th>% Resumo</th>
          </tr></thead><tbody>
            {TIPOS.map((tipo) => {
              const linha = regional[tipo.key] || novoRegistroMeta();
              return (
                <tr key={`reg-${tipo.key}`}>
                  <td>{tipo.label}</td>
                  <td><input className="form-control" value={linha.meta1} onChange={(e) => setCampoRegional(tipo.key, 'meta1', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.percM1} onChange={(e) => setCampoRegional(tipo.key, 'percM1', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.meta2} onChange={(e) => setCampoRegional(tipo.key, 'meta2', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.percM2} onChange={(e) => setCampoRegional(tipo.key, 'percM2', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.meta3} onChange={(e) => setCampoRegional(tipo.key, 'meta3', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.percM3} onChange={(e) => setCampoRegional(tipo.key, 'percM3', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.realizadoQtd} onChange={(e) => setCampoRegional(tipo.key, 'realizadoQtd', e.target.value)} /></td>
                  <td>{percentual(calculo.percentualRegional[tipo.key] || 0)}</td>
                  <td>{percentual(calculo.percentualResumo[tipo.key] || 0)}</td>
                </tr>
              );
            })}
          </tbody></table></div>
          <div style={{ marginTop: 8, color: '#475569' }}>
            Vendas Resumo = (%Regional Vendas x {percentual(calculo.pesoVendasNorm)}) + (%Regional Churn x {percentual(calculo.pesoChurnNorm)})
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>3. Premissas Individuais do Vendedor</h3>
          <div className="table-responsive"><table><thead><tr>
            <th>Tipo</th><th>Meta M1</th><th>% M1</th><th>Meta M2</th><th>% M2</th><th>Meta M3</th><th>% M3</th><th>Realizado Qtd</th><th>Realizado Valor (R$)</th>
          </tr></thead><tbody>
            {TIPOS.map((tipo) => {
              const linha = individual[tipo.key] || novoRegistroIndividual();
              return (
                <tr key={`ind-${tipo.key}`}>
                  <td>{tipo.label}</td>
                  <td><input className="form-control" value={linha.meta1} onChange={(e) => setCampoIndividual(tipo.key, 'meta1', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.percM1} onChange={(e) => setCampoIndividual(tipo.key, 'percM1', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.meta2} onChange={(e) => setCampoIndividual(tipo.key, 'meta2', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.percM2} onChange={(e) => setCampoIndividual(tipo.key, 'percM2', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.meta3} onChange={(e) => setCampoIndividual(tipo.key, 'meta3', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.percM3} onChange={(e) => setCampoIndividual(tipo.key, 'percM3', e.target.value)} /></td>
                  <td><input className="form-control" value={linha.realizadoQtd} onChange={(e) => setCampoIndividual(tipo.key, 'realizadoQtd', e.target.value)} /></td>
                  <td>{tipo.semFinanceiro ? <span style={{ color: '#64748b' }}>Nao se aplica</span> : <input className="form-control" value={linha.realizadoValor} onChange={(e) => setCampoIndividual(tipo.key, 'realizadoValor', e.target.value)} />}</td>
                </tr>
              );
            })}
          </tbody></table></div>
        </div>

        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3>4. Etapas do Calculo</h3>
          <div className="table-responsive"><table><thead><tr>
            <th>Tipo</th><th>% Resumo</th><th>% Individual</th><th>Comissao</th>
          </tr></thead><tbody>
            {calculo.etapas.map((e) => (
              <tr key={`et-${e.key}`}>
                <td>{e.label}</td>
                <td>{percentual(e.percResumo)}</td>
                <td>{percentual(e.percIndividual)}</td>
                <td>{moeda(e.comissao)}</td>
              </tr>
            ))}
          </tbody></table></div>
        </div>

        {validacao && (
          <div className="glass-card" style={{ marginBottom: 16 }}>
            <h3>5. Conferencia Simulacao x Real</h3>
            <div className="table-responsive"><table><thead><tr>
              <th>Tipo</th><th>Real</th><th>Simulado</th><th>Diferenca</th><th>Status</th>
            </tr></thead><tbody>
              {validacao.porTipo.map((v) => (
                <tr key={`val-${v.tipo}`}>
                  <td>{v.tipo}</td>
                  <td>{moeda(v.real)}</td>
                  <td>{moeda(v.simulado)}</td>
                  <td>{moeda(v.diferenca)}</td>
                  <td>{v.ok ? 'OK' : 'Divergente'}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td>Total</td>
                <td>{moeda(validacao.totalReal)}</td>
                <td>{moeda(validacao.totalSimulado)}</td>
                <td>{moeda(validacao.diffTotal)}</td>
                <td>{validacao.okTotal ? 'OK' : 'Divergente'}</td>
              </tr>
            </tbody></table></div>
          </div>
        )}

        <div className="glass-card">
          <h3>6. Resultado Final</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 12 }}>
            <div><strong>Total Comissao:</strong> {moeda(calculo.totalComissao)}</div>
            <div><strong>DSR (1/6):</strong> {moeda(calculo.dsr)}</div>
            <div><strong>Total com DSR:</strong> {moeda(calculo.totalComDsr)}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
