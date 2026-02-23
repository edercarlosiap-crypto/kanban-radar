import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendasMensaisAPI, regionaisAPI, churnRegionaisAPI, colaboradoresAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const calcularDiasUteisAteHoje = (ano, mes) => {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Se for mês anterior, contar até o último dia do mês
  let dataLimite;
  if (ano < anoAtual || (ano === anoAtual && mes < mesAtual)) {
    // Mês anterior - contar até o último dia do mês
    dataLimite = new Date(ano, mes + 1, 0, 23, 59, 59);
  } else {
    // Mês atual - contar até hoje
    dataLimite = new Date(anoAtual, mesAtual, hoje.getDate(), 23, 59, 59);
  }

  let diasUteis = 0;
  let data = new Date(ano, mes, 1);

  while (data <= dataLimite) {
    const diaSemana = data.getDay();
    
    // Segunda (1) a sexta (5) = 1 DU
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasUteis += 1;
    }
    // Sábado (6) = 0.5 DU
    else if (diaSemana === 6) {
      diasUteis += 0.5;
    }
    // Domingo (0) = 0 DU

    data.setDate(data.getDate() + 1);
  }

  return diasUteis;
};

const calcularTotalDiasUteisDoMes = (ano, mes) => {
  let diasUteis = 0;
  const dataFim = new Date(ano, mes + 1, 0);

  for (let dia = 1; dia <= dataFim.getDate(); dia++) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay();

    if (diaSemana >= 1 && diaSemana <= 5) {
      diasUteis += 1;
    } else if (diaSemana === 6) {
      diasUteis += 0.5;
    }
  }

  return diasUteis;
};

const obterPeriodoAtual = () => {
  const hoje = new Date();
  const mes = MESES[hoje.getMonth()];
  const ano = String(hoje.getFullYear()).slice(-2);
  return `${mes}/${ano}`;
};

const classificarPeriodo = (periodo) => {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const parte = periodo.split('/');
  if (parte.length !== 2) return 'desconhecido';

  const mesPeriodo = MESES.indexOf(parte[0]);
  const anoPeriodo = 2000 + parseInt(parte[1]);

  if (anoPeriodo < anoAtual || (anoPeriodo === anoAtual && mesPeriodo < mesAtual)) {
    return 'fechado';
  } else if (anoPeriodo === anoAtual && mesPeriodo === mesAtual) {
    return 'atual';
  } else {
    return 'futuro';
  }
};

export default function RelatorioVendasPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.role || 'leitura';

  const [vendas, setVendas] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [churnData, setChurnData] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState(obterPeriodoAtual());
  const [regionaisExpandidas, setRegionaisExpandidas] = useState(new Set());

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [vendRes, regRes, colabRes, churnRes] = await Promise.all([
        vendasMensaisAPI.listar(),
        regionaisAPI.listar(),
        colaboradoresAPI.listar(),
        churnRegionaisAPI.listar()
      ]);

      setVendas(vendRes.data.vendas || []);
      setRegionais(regRes.data.regionais || []);
      setColaboradores(colabRes.data.colaboradores || []);
      setChurnData(churnRes.data.registros || []);
      setErro('');
    } catch (error) {
      console.error(error);
      setErro('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  const regionaisMap = useMemo(() => {
    const map = new Map();
    regionais.forEach(r => map.set(r.id, r.nome));
    return map;
  }, [regionais]);

  const colaboradoresMap = useMemo(() => {
    const map = new Map();
    colaboradores.forEach(c => map.set(c.id, c.nome));
    return map;
  }, [colaboradores]);

  // Dados filtrados e processados
  const relatorioData = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Filtrar vendas pelo período
    const vendasFiltradas = vendas.filter(v => v.periodo === filtroPeriodo);

    // Extrair mês/ano do filtro
    const partePeriodo = filtroPeriodo.split('/');
    const mesPeriodo = MESES.indexOf(partePeriodo[0]);
    const anoPeriodo = 2000 + parseInt(partePeriodo[1]);

    const ehMesAtual = mesPeriodo === mesAtual && anoPeriodo === anoAtual;

    const criarRegistroBase = () => ({
      vendas_volume: 0,
      vendas_financeiro: 0,
      mudanca_titularidade_volume: 0,
      mudanca_titularidade_financeiro: 0,
      migracao_tecnologia_volume: 0,
      migracao_tecnologia_financeiro: 0,
      renovacao_volume: 0,
      renovacao_financeiro: 0,
      plano_evento_volume: 0,
      plano_evento_financeiro: 0,
      sva_volume: 0,
      sva_financeiro: 0,
      telefonia_volume: 0,
      telefonia_financeiro: 0
    });

    // Agrupar vendas por regional e somar
    const vendaByRegional = {};
    const vendasPorRegionalEVendedor = {};
    vendasFiltradas.forEach(venda => {
      const regId = venda.regional_id;
      const vendedorId = venda.vendedor_id;
      
      if (!vendaByRegional[regId]) {
        vendaByRegional[regId] = criarRegistroBase();
      }

      if (!vendasPorRegionalEVendedor[regId]) {
        vendasPorRegionalEVendedor[regId] = {};
      }

      if (!vendasPorRegionalEVendedor[regId][vendedorId]) {
        vendasPorRegionalEVendedor[regId][vendedorId] = {
          vendedorId,
          vendedorNome: colaboradoresMap.get(vendedorId) || 'Sem vendedor',
          ...criarRegistroBase()
        };
      }

      // Somar todos os campos
      vendaByRegional[regId].vendas_volume += venda.vendas_volume || 0;
      vendaByRegional[regId].vendas_financeiro += venda.vendas_financeiro || 0;
      vendaByRegional[regId].mudanca_titularidade_volume += venda.mudanca_titularidade_volume || 0;
      vendaByRegional[regId].mudanca_titularidade_financeiro += venda.mudanca_titularidade_financeiro || 0;
      vendaByRegional[regId].migracao_tecnologia_volume += venda.migracao_tecnologia_volume || 0;
      vendaByRegional[regId].migracao_tecnologia_financeiro += venda.migracao_tecnologia_financeiro || 0;
      vendaByRegional[regId].renovacao_volume += venda.renovacao_volume || 0;
      vendaByRegional[regId].renovacao_financeiro += venda.renovacao_financeiro || 0;
      vendaByRegional[regId].plano_evento_volume += venda.plano_evento_volume || 0;
      vendaByRegional[regId].plano_evento_financeiro += venda.plano_evento_financeiro || 0;
      vendaByRegional[regId].sva_volume += venda.sva_volume || 0;
      vendaByRegional[regId].sva_financeiro += venda.sva_financeiro || 0;
      vendaByRegional[regId].telefonia_volume += venda.telefonia_volume || 0;
      vendaByRegional[regId].telefonia_financeiro += venda.telefonia_financeiro || 0;

      const vendedorRegistro = vendasPorRegionalEVendedor[regId][vendedorId];
      vendedorRegistro.vendas_volume += venda.vendas_volume || 0;
      vendedorRegistro.vendas_financeiro += venda.vendas_financeiro || 0;
      vendedorRegistro.mudanca_titularidade_volume += venda.mudanca_titularidade_volume || 0;
      vendedorRegistro.mudanca_titularidade_financeiro += venda.mudanca_titularidade_financeiro || 0;
      vendedorRegistro.migracao_tecnologia_volume += venda.migracao_tecnologia_volume || 0;
      vendedorRegistro.migracao_tecnologia_financeiro += venda.migracao_tecnologia_financeiro || 0;
      vendedorRegistro.renovacao_volume += venda.renovacao_volume || 0;
      vendedorRegistro.renovacao_financeiro += venda.renovacao_financeiro || 0;
      vendedorRegistro.plano_evento_volume += venda.plano_evento_volume || 0;
      vendedorRegistro.plano_evento_financeiro += venda.plano_evento_financeiro || 0;
      vendedorRegistro.sva_volume += venda.sva_volume || 0;
      vendedorRegistro.sva_financeiro += venda.sva_financeiro || 0;
      vendedorRegistro.telefonia_volume += venda.telefonia_volume || 0;
      vendedorRegistro.telefonia_financeiro += venda.telefonia_financeiro || 0;
    });

    const calcularTotaisCategorias = (registro) => {
      const totalVolume =
        (registro.vendas_volume || 0) +
        (registro.mudanca_titularidade_volume || 0) +
        (registro.migracao_tecnologia_volume || 0) +
        (registro.renovacao_volume || 0) +
        (registro.plano_evento_volume || 0) +
        (registro.sva_volume || 0) +
        (registro.telefonia_volume || 0);

      const totalFinanceiro =
        (registro.vendas_financeiro || 0) +
        (registro.mudanca_titularidade_financeiro || 0) +
        (registro.migracao_tecnologia_financeiro || 0) +
        (registro.renovacao_financeiro || 0) +
        (registro.plano_evento_financeiro || 0) +
        (registro.sva_financeiro || 0) +
        (registro.telefonia_financeiro || 0);

      return { totalVolume, totalFinanceiro };
    };

    // Calcular métricas
    const totalDU = calcularTotalDiasUteisDoMes(anoPeriodo, mesPeriodo);
    const duAteHoje = calcularDiasUteisAteHoje(anoPeriodo, mesPeriodo);
    const percentualDU = totalDU > 0 ? (duAteHoje / totalDU) * 100 : 0;

    const relatorio = regionais.map(regional => {
      const vendaRegional = vendaByRegional[regional.id];
      const churnReg = churnData.find(c => c.periodo === filtroPeriodo && c.regional_id === regional.id);

      const vendedoresDetalhe = Object.values(vendasPorRegionalEVendedor[regional.id] || {})
        .map((item) => ({
          ...item,
          ...calcularTotaisCategorias(item)
        }))
        .sort((a, b) => a.vendedorNome.localeCompare(b.vendedorNome, 'pt-BR'));

      if (!vendaRegional) {
        return {
          regional: regional.nome,
          regionalId: regional.id,
          status: ehMesAtual ? 'vazio' : 'fechado',
          periodo: filtroPeriodo,
          totalVolume: 0,
          totalFinanceiro: 0,
          totalVolumeProj: 0,
          totalFinanceiroProj: 0,
          vendasVolume: 0,
          vendasFinanceiro: 0,
          mudancaTitularidadeVolume: 0,
          mudancaTitularidadeFinanceiro: 0,
          migracaoTecnologiaVolume: 0,
          migracaoTecnologiaFinanceiro: 0,
          renovacaoVolume: 0,
          renovacaoFinanceiro: 0,
          planoEventoVolume: 0,
          planoEventoFinanceiro: 0,
          svaVolume: 0,
          svaFinanceiro: 0,
          telefoniaVolume: 0,
          telefoniaFinanceiro: 0,
          churn: churnReg?.churn || 0,
          duAteHoje: 0,
          totalDU: 0,
          percentualDU: 0,
          vendedoresDetalhe
        };
      }

      const { totalVolume, totalFinanceiro } = calcularTotaisCategorias(vendaRegional);

      let metricas = {
        regional: regional.nome,
        regionalId: regional.id,
        status: classificarPeriodo(filtroPeriodo),
        periodo: filtroPeriodo,
        totalVolume,
        totalFinanceiro,
        totalVolumeProj: totalVolume,
        totalFinanceiroProj: totalFinanceiro,
        vendasVolume: vendaRegional.vendas_volume,
        vendasFinanceiro: vendaRegional.vendas_financeiro,
        mudancaTitularidadeVolume: vendaRegional.mudanca_titularidade_volume,
        mudancaTitularidadeFinanceiro: vendaRegional.mudanca_titularidade_financeiro,
        migracaoTecnologiaVolume: vendaRegional.migracao_tecnologia_volume,
        migracaoTecnologiaFinanceiro: vendaRegional.migracao_tecnologia_financeiro,
        renovacaoVolume: vendaRegional.renovacao_volume,
        renovacaoFinanceiro: vendaRegional.renovacao_financeiro,
        planoEventoVolume: vendaRegional.plano_evento_volume,
        planoEventoFinanceiro: vendaRegional.plano_evento_financeiro,
        svaVolume: vendaRegional.sva_volume,
        svaFinanceiro: vendaRegional.sva_financeiro,
        telefoniaVolume: vendaRegional.telefonia_volume,
        telefoniaFinanceiro: vendaRegional.telefonia_financeiro,
        churn: churnReg?.churn || 0,
        duAteHoje,
        totalDU,
        percentualDU,
        vendedoresDetalhe
      };

      // Se for mês atual, calcular projeção
      if (ehMesAtual && totalDU > 0 && duAteHoje > 0) {
        const velocidade = totalVolume / duAteHoje;
        const velocidadeFinanceiro = totalFinanceiro / duAteHoje;

        metricas.totalVolumeProj = Math.round(velocidade * totalDU);
        metricas.totalFinanceiroProj = Math.round(velocidadeFinanceiro * totalDU);
      }

      return metricas;
    });

    return {
      ehMesAtual,
      duAteHoje,
      totalDU,
      percentualDU,
      relatorio
    };
  }, [vendas, regionais, churnData, filtroPeriodo, colaboradoresMap]);

  useEffect(() => {
    if (relatorioData.relatorio.length === 0) {
      setRegionaisExpandidas(new Set());
      return;
    }

    setRegionaisExpandidas(new Set(relatorioData.relatorio.map((r) => r.regionalId)));
  }, [relatorioData.relatorio]);

  const alternarRegional = (regionalId) => {
    setRegionaisExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(regionalId)) {
        next.delete(regionalId);
      } else {
        next.add(regionalId);
      }
      return next;
    });
  };

  const expandirTudo = () => {
    setRegionaisExpandidas(new Set(relatorioData.relatorio.map((r) => r.regionalId)));
  };

  const recolherTudo = () => {
    setRegionaisExpandidas(new Set());
  };

  const tudoExpandido =
    relatorioData.relatorio.length > 0 &&
    relatorioData.relatorio.every((r) => regionaisExpandidas.has(r.regionalId));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // Períodos disponíveis (últimos 6 meses)
  const periodosDisponiveis = useMemo(() => {
    const periodos = [];
    const hoje = new Date();
    for (let i = -6; i <= 0; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = MESES[data.getMonth()];
      const ano = String(data.getFullYear()).slice(-2);
      periodos.push(`${mes}/${ano}`);
    }
    return periodos;
  }, []);

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
          <h1>📊 Relatório de Vendas Mensais</h1>
          <p>Acompanhe as vendas por regional com fechamento e projeção</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <div className="glass-card">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Período</label>
              <select
                className="form-select"
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
              >
                {periodosDisponiveis.map(p => (
                  <option key={p} value={p}>{p}</option>
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
                {regionais.map(r => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {relatorioData.ehMesAtual && (
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              📅 <strong>Mês Atual (Jan/26)</strong> - Dias úteis até hoje: <strong>{relatorioData.duAteHoje.toFixed(1)}</strong> de <strong>{relatorioData.totalDU.toFixed(1)}</strong> ({relatorioData.percentualDU.toFixed(1)}%)
            </div>
          )}

          {!relatorioData.ehMesAtual && (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              🔒 <strong>Período Fechado</strong> - Dados consolidados
            </div>
          )}

          <div className="table-responsive">
            <table style={{ marginTop: '16px' }}>
              <thead>
                <tr>
                  <th>Regional</th>
                  <th>{relatorioData.ehMesAtual ? 'Total (Real)' : 'Total'}</th>
                  <th>{relatorioData.ehMesAtual ? 'R$ (Real)' : 'R$'}</th>
                  {relatorioData.ehMesAtual && (
                    <>
                      <th>Total (Projeção)</th>
                      <th>R$ (Projeção)</th>
                    </>
                  )}
                  <th>Churn</th>
                </tr>
              </thead>
              <tbody>
                {relatorioData.relatorio.length === 0 ? (
                  <tr>
                    <td colSpan={relatorioData.ehMesAtual ? 6 : 4} style={{ textAlign: 'center' }}>
                      Sem dados para este período
                    </td>
                  </tr>
                ) : (
                  relatorioData.relatorio
                    .filter(r => !filtroRegional || r.regionalId === filtroRegional)
                    .map((regiao, idx) => (
                      <tr key={idx} style={{ background: regiao.status === 'vazio' ? '#f9f9f9' : 'inherit' }}>
                        <td style={{ fontWeight: '500' }}>{regiao.regional}</td>
                        <td>{regiao.totalVolume.toLocaleString('pt-BR')}</td>
                        <td>R$ {regiao.totalFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        {relatorioData.ehMesAtual && (
                          <>
                            <td style={{ color: 'var(--primary)', fontWeight: '500' }}>
                              {regiao.totalVolumeProj.toLocaleString('pt-BR')}
                            </td>
                            <td style={{ color: 'var(--primary)', fontWeight: '500' }}>
                              R$ {regiao.totalFinanceiroProj.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </>
                        )}
                        <td style={{ color: regiao.churn > 5 ? '#ff6b6b' : 'inherit' }}>
                          {(regiao.churn || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {relatorioData.relatorio.length > 0 && (
            <>
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>📋 Detalhamento de Itens</h3>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={tudoExpandido ? recolherTudo : expandirTudo}
                  >
                    {tudoExpandido ? 'Recolher tudo' : 'Expandir tudo'}
                  </button>
                </div>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Regional</th>
                        <th>Vendas</th>
                        <th>Mudança Titularidade</th>
                        <th>Migração Tecnologia</th>
                        <th>Renovação</th>
                        <th>Plano Evento</th>
                        <th>SVA</th>
                        <th>Telefonia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioData.relatorio
                        .filter(r => !filtroRegional || r.regionalId === filtroRegional)
                        .map((regiao, idx) => (
                          <React.Fragment key={regiao.regionalId || idx}>
                            <tr>
                              <td style={{ fontWeight: '500' }}>
                                <button
                                  type="button"
                                  onClick={() => alternarRegional(regiao.regionalId)}
                                  style={{
                                    marginRight: '8px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: '#666'
                                  }}
                                  aria-label={regionaisExpandidas.has(regiao.regionalId) ? 'Recolher vendedores' : 'Expandir vendedores'}
                                  title={regionaisExpandidas.has(regiao.regionalId) ? 'Recolher vendedores' : 'Expandir vendedores'}
                                >
                                  {regionaisExpandidas.has(regiao.regionalId) ? '▾' : '▸'}
                                </button>
                                {regiao.regional}
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#666' }}>V: {regiao.vendasVolume}</div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {regiao.vendasFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#666' }}>V: {regiao.mudancaTitularidadeVolume}</div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {regiao.mudancaTitularidadeFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#666' }}>V: {regiao.migracaoTecnologiaVolume}</div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {regiao.migracaoTecnologiaFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#666' }}>V: {regiao.renovacaoVolume}</div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {regiao.renovacaoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#666' }}>V: {regiao.planoEventoVolume}</div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {regiao.planoEventoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#666' }}>V: {regiao.svaVolume}</div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {regiao.svaFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#666' }}>V: {regiao.telefoniaVolume}</div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {regiao.telefoniaFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                              </td>
                            </tr>
                            {regionaisExpandidas.has(regiao.regionalId) &&
                              regiao.vendedoresDetalhe?.map((vendedor) => (
                                <tr key={`${regiao.regionalId}-${vendedor.vendedorId}`} style={{ background: '#fafafa' }}>
                                  <td style={{ paddingLeft: '24px', color: '#666' }}>↳ {vendedor.vendedorNome}</td>
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#666' }}>V: {vendedor.vendas_volume}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {vendedor.vendas_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#666' }}>V: {vendedor.mudanca_titularidade_volume}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {vendedor.mudanca_titularidade_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#666' }}>V: {vendedor.migracao_tecnologia_volume}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {vendedor.migracao_tecnologia_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#666' }}>V: {vendedor.renovacao_volume}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {vendedor.renovacao_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#666' }}>V: {vendedor.plano_evento_volume}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {vendedor.plano_evento_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#666' }}>V: {vendedor.sva_volume}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {vendedor.sva_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#666' }}>V: {vendedor.telefonia_volume}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>R$: {vendedor.telefonia_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="glass-card" style={{ marginTop: '20px' }}>
          {relatorioData.relatorio.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: '500' }}>Total Vendas (Volume)</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                  {relatorioData.relatorio
                    .filter(r => !filtroRegional || r.regionalId === filtroRegional)
                    .reduce((acc, r) => acc + r.totalVolume, 0).toLocaleString('pt-BR')}
                </p>
              </div>
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: '500' }}>Total Vendas (R$)</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                  R$ {relatorioData.relatorio
                    .filter(r => !filtroRegional || r.regionalId === filtroRegional)
                    .reduce((acc, r) => acc + r.totalFinanceiro, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {relatorioData.ehMesAtual && (
                <>
                  <div style={{ padding: '12px', background: '#e3f2fd', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: '500' }}>Projeção Volume</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                      {relatorioData.relatorio
                        .filter(r => !filtroRegional || r.regionalId === filtroRegional)
                        .reduce((acc, r) => acc + r.totalVolumeProj, 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div style={{ padding: '12px', background: '#e3f2fd', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: '500' }}>Projeção Financeiro</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                      R$ {relatorioData.relatorio
                        .filter(r => !filtroRegional || r.regionalId === filtroRegional)
                        .reduce((acc, r) => acc + r.totalFinanceiroProj, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </>
              )}
              <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: '500' }}>Churn Total</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                  {relatorioData.relatorio
                    .filter(r => !filtroRegional || r.regionalId === filtroRegional)
                    .reduce((acc, r) => acc + r.churn, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
