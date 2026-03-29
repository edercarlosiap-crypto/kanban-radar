import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { comissionamentoAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/DashboardVariavelPage.css';

const moeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const numero = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const percentual = (valor) =>
  `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const MESES = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11
};

const parsePeriodo = (periodo) => {
  const [mesTxt, anoTxt] = String(periodo || '').split('/');
  const mesToken = String(mesTxt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 3);
  const mes = MESES[mesToken];
  const anoNum = Number(String(anoTxt || '').trim());
  if (mes === undefined || Number.isNaN(anoNum)) return null;
  const ano = anoNum < 100 ? 2000 + anoNum : anoNum;
  return { mes, ano };
};

const isPeriodoMesVigente = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return false;
  const hoje = new Date();
  return parsed.ano === hoje.getFullYear() && parsed.mes === hoje.getMonth();
};

const contarDiasUteisMes = (periodo) => {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return 0;
  const { ano, mes } = parsed;
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
  const { ano, mes } = parsed;
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

const labelTipo = (tipo) => {
  const map = {
    vendas: 'Vendas',
    churn: 'Churn',
    mudancaTitularidade: 'Mud. Titularidade',
    migracaoTecnologia: 'Migracao Tecnologia',
    renovacao: 'Renovacao',
    planoEvento: 'Plano Evento',
    sva: 'SVA',
    telefonia: 'Telefonia'
  };
  return map[tipo] || tipo;
};

const TIPOS_COMISSAO = [
  'vendas',
  'churn',
  'mudancaTitularidade',
  'migracaoTecnologia',
  'renovacao',
  'planoEvento',
  'sva',
  'telefonia'
];

const PERFIS_VENDEDOR = [
  { value: 'todos', label: 'Todos os vendedores' },
  { value: 'vendas_ou_ambos', label: 'Apenas vendedores com vendas do tipo Vendas' }
];

export default function DashboardVariavelPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.role || 'leitura';

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState(null);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [filtroPerfilVendedor, setFiltroPerfilVendedor] = useState('todos');
  const [regionalSelecionada, setRegionalSelecionada] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [modoLeitura, setModoLeitura] = useState('projetado');
  const [periodoReferencia, setPeriodoReferencia] = useState('');
  const [periodoBase, setPeriodoBase] = useState('');
  const [modoComparacao, setModoComparacao] = useState('anterior');

  const carregar = useCallback(async (inicioParam, fimParam, perfilVendedorParam = 'todos') => {
    try {
      setCarregando(true);
      setErro('');
      const resp = await comissionamentoAPI.obterDashboardVariavel(
        inicioParam || undefined,
        fimParam || undefined,
        perfilVendedorParam || undefined
      );
      const payload = resp.data || {};
      setDados(payload);
      if (!inicioParam && payload.periodoInicio) setPeriodoInicio(payload.periodoInicio);
      if (!fimParam && payload.periodoFim) setPeriodoFim(payload.periodoFim);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar dashboard variavel');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const periodosBrutos = Array.isArray(dados?.periodos) ? dados.periodos : [];
    const periodosOrdenados = [...periodosBrutos].sort((a, b) => {
      const pa = parsePeriodo(a);
      const pb = parsePeriodo(b);
      if (!pa && !pb) return String(a).localeCompare(String(b), 'pt-BR');
      if (!pa) return 1;
      if (!pb) return -1;
      if (pa.ano !== pb.ano) return pa.ano - pb.ano;
      return pa.mes - pb.mes;
    });

    if (!periodoReferencia || !periodosOrdenados.includes(periodoReferencia)) {
      setPeriodoReferencia(periodosOrdenados[periodosOrdenados.length - 1] || '');
    }

    const baseSugerida = periodosOrdenados.includes('Dez/25')
      ? 'Dez/25'
      : (periodosOrdenados[0] || '');
    if (!periodoBase || !periodosOrdenados.includes(periodoBase)) {
      setPeriodoBase(baseSugerida);
    }
  }, [dados, periodoReferencia, periodoBase]);

  const handleAplicarFiltro = () => {
    if (periodoInicio && periodoFim) {
      const idxInicio = periodosDisponiveis.indexOf(periodoInicio);
      const idxFim = periodosDisponiveis.indexOf(periodoFim);
      if (idxInicio > -1 && idxFim > -1 && idxInicio > idxFim) {
        setErro('Periodo inicio nao pode ser maior que periodo fim.');
        return;
      }
    }

    setRegionalSelecionada('');
    setTipoSelecionado('');
    carregar(periodoInicio, periodoFim, filtroPerfilVendedor);
  };

  const handlePerfilVendedorChange = (event) => {
    const proximoFiltro = event.target.value;
    setFiltroPerfilVendedor(proximoFiltro);
    setRegionalSelecionada('');
    setTipoSelecionado('');
    carregar(periodoInicio, periodoFim, proximoFiltro);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const serieMensalBase = dados?.serieMensal;
  const serieRegionalMensalBase = dados?.serieRegionalMensal;
  const serieTipoMensalBase = dados?.serieTipoMensal;
  const serieRegionalTipoMensalBase = dados?.serieRegionalTipoMensal;
  const serieTipoMensalQuantidadeBase = dados?.serieTipoMensalQuantidade;
  const serieRegionalTipoMensalQuantidadeBase = dados?.serieRegionalTipoMensalQuantidade;
  const periodos = Array.isArray(dados?.periodos) ? dados.periodos : [];
  const periodosDisponiveis = dados?.periodosDisponiveis?.length ? dados.periodosDisponiveis : periodos;
  const possuiMesVigenteNoRecorte = periodos.some((periodo) => isPeriodoMesVigente(periodo));

  const fatorModoPeriodo = useCallback((periodo) => {
    if (modoLeitura !== 'realizado') return 1;
    if (!isPeriodoMesVigente(periodo)) return 1;
    const duTotal = contarDiasUteisMes(periodo);
    const duPassado = contarDiasUteisPassados(periodo);
    if (duTotal <= 0 || duPassado <= 0) return 1;
    return duPassado / duTotal;
  }, [modoLeitura]);

  const serieMensal = useMemo(() => (
    (serieMensalBase || []).map((item) => {
      const fator = fatorModoPeriodo(item.periodo);
      const comissaoVendedores = (Number(item.comissaoVendedores) || 0) * fator;
      const comissaoLiderancas = (Number(item.comissaoLiderancas) || 0) * fator;
      const comissaoTotal = comissaoVendedores + comissaoLiderancas;
      const dsrTotal = comissaoTotal / 6;
      const baseTicket = Number(item.qtdVendedoresFte) || Number(item.qtdVendedores) || 0;
      return {
        ...item,
        comissaoVendedores,
        comissaoLiderancas,
        comissaoTotal,
        dsrTotal,
        ticketMedioVendedor: baseTicket > 0 ? comissaoVendedores / baseTicket : 0
      };
    })
  ), [serieMensalBase, fatorModoPeriodo]);

  const serieRegionalMensal = useMemo(() => (
    (serieRegionalMensalBase || []).map((item) => ({
      ...item,
      valor: (Number(item.valor) || 0) * fatorModoPeriodo(item.periodo)
    }))
  ), [serieRegionalMensalBase, fatorModoPeriodo]);

  const serieTipoMensal = useMemo(() => (
    (serieTipoMensalBase || []).map((item) => ({
      ...item,
      valor: (Number(item.valor) || 0) * fatorModoPeriodo(item.periodo)
    }))
  ), [serieTipoMensalBase, fatorModoPeriodo]);

  const serieRegionalTipoMensal = useMemo(() => (
    (serieRegionalTipoMensalBase || []).map((item) => ({
      ...item,
      valor: (Number(item.valor) || 0) * fatorModoPeriodo(item.periodo)
    }))
  ), [serieRegionalTipoMensalBase, fatorModoPeriodo]);

  const serieTipoMensalQuantidade = useMemo(() => (
    (serieTipoMensalQuantidadeBase || []).map((item) => ({
      ...item,
      quantidade: (Number(item.quantidade) || 0) * fatorModoPeriodo(item.periodo)
    }))
  ), [serieTipoMensalQuantidadeBase, fatorModoPeriodo]);

  const serieRegionalTipoMensalQuantidade = useMemo(() => (
    (serieRegionalTipoMensalQuantidadeBase || []).map((item) => ({
      ...item,
      quantidade: (Number(item.quantidade) || 0) * fatorModoPeriodo(item.periodo)
    }))
  ), [serieRegionalTipoMensalQuantidadeBase, fatorModoPeriodo]);

  const serieMensalMap = useMemo(
    () => new Map(serieMensal.map((item) => [item.periodo, item])),
    [serieMensal]
  );

  const serieRegionalMensalMap = useMemo(
    () => new Map(serieRegionalMensal.map((item) => [`${item.periodo}::${item.regionalNome}`, item])),
    [serieRegionalMensal]
  );

  const evolucaoFiltrada = useMemo(() => {
    if (regionalSelecionada && tipoSelecionado) {
      return serieRegionalTipoMensal
        .filter((i) => i.regionalNome === regionalSelecionada && i.tipo === tipoSelecionado)
        .sort((a, b) => a.ordem - b.ordem)
        .map((i) => ({ periodo: i.periodo, valor: i.valor }));
    }
    if (regionalSelecionada) {
      return serieRegionalMensal
        .filter((i) => i.regionalNome === regionalSelecionada)
        .sort((a, b) => a.ordem - b.ordem)
        .map((i) => ({ periodo: i.periodo, valor: i.valor }));
    }
    if (tipoSelecionado) {
      return serieTipoMensal
        .filter((i) => i.tipo === tipoSelecionado)
        .sort((a, b) => a.ordem - b.ordem)
        .map((i) => ({ periodo: i.periodo, valor: i.valor }));
    }
    return serieMensal;
  }, [regionalSelecionada, tipoSelecionado, serieMensal, serieRegionalMensal, serieTipoMensal, serieRegionalTipoMensal]);

  const composicaoFiltrada = useMemo(() => {
    const mapa = new Map();
    const base = regionalSelecionada
      ? serieRegionalTipoMensal.filter((i) => i.regionalNome === regionalSelecionada)
      : serieTipoMensal;

    base.forEach((item) => {
      const tipo = item.tipo;
      const atual = mapa.get(tipo) || 0;
      mapa.set(tipo, atual + (Number(item.valor) || 0));
    });

    return Array.from(mapa.entries())
      .map(([tipo, valor]) => ({
        tipo,
        valor,
        tipoLabel: labelTipo(tipo)
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [regionalSelecionada, serieTipoMensal, serieRegionalTipoMensal]);

  const tituloEvolucao = regionalSelecionada && tipoSelecionado
    ? `Evolucao Mensal - ${regionalSelecionada} | ${labelTipo(tipoSelecionado)}`
    : regionalSelecionada
      ? `Evolucao Mensal - ${regionalSelecionada}`
      : tipoSelecionado
        ? `Evolucao Mensal - ${labelTipo(tipoSelecionado)}`
        : 'Evolucao Mensal';

  const resumoMensalFiltrado = useMemo(() => {
    if (!regionalSelecionada && !tipoSelecionado) {
      return serieMensal.map((item) => ({
        periodo: item.periodo,
        comissaoVendedores: Number(item.comissaoVendedores) || 0,
        comissaoLiderancas: Number(item.comissaoLiderancas) || 0,
        comissaoTotal: item.comissaoTotal,
        dsrTotal: item.dsrTotal,
        totalComDsr: (Number(item.comissaoTotal) || 0) + (Number(item.dsrTotal) || 0),
        ticketMedioVendedor: item.ticketMedioVendedor,
        qtdVendedores: item.qtdVendedores,
        qtdVendedoresFte: item.qtdVendedoresFte,
        qtdLiderancas: item.qtdLiderancas
      }));
    }

    if (regionalSelecionada && !tipoSelecionado) {
      return serieRegionalMensal
        .filter((item) => item.regionalNome === regionalSelecionada)
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => {
          const comissaoTotal = Number(item.valor) || 0;
          const dsrTotal = comissaoTotal / 6;
          const qtdVend = Number(item.qtdVendedoresFte) || Number(item.qtdVendedores) || 0;
          return {
            periodo: item.periodo,
            comissaoVendedores: comissaoTotal,
            comissaoLiderancas: 0,
            comissaoTotal,
            dsrTotal,
            totalComDsr: comissaoTotal + dsrTotal,
            ticketMedioVendedor: qtdVend > 0 ? comissaoTotal / qtdVend : 0,
            qtdVendedores: item.qtdVendedores,
            qtdVendedoresFte: item.qtdVendedoresFte,
            qtdLiderancas: '-'
          };
        });
    }

    if (!regionalSelecionada && tipoSelecionado) {
      return serieTipoMensal
        .filter((item) => item.tipo === tipoSelecionado)
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => {
          const baseMes = serieMensalMap.get(item.periodo);
          const comissaoTotal = Number(item.valor) || 0;
          const dsrTotal = comissaoTotal / 6;
          const qtdVend = Number(baseMes?.qtdVendedoresFte) || Number(baseMes?.qtdVendedores) || 0;
          return {
            periodo: item.periodo,
            comissaoVendedores: comissaoTotal,
            comissaoLiderancas: 0,
            comissaoTotal,
            dsrTotal,
            totalComDsr: comissaoTotal + dsrTotal,
            ticketMedioVendedor: qtdVend > 0 ? comissaoTotal / qtdVend : 0,
            qtdVendedores: baseMes?.qtdVendedores ?? '-',
            qtdVendedoresFte: baseMes?.qtdVendedoresFte ?? '-',
            qtdLiderancas: '-'
          };
        });
    }

    return serieRegionalTipoMensal
      .filter((item) => item.regionalNome === regionalSelecionada && item.tipo === tipoSelecionado)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => {
        const baseRegionalMes = serieRegionalMensalMap.get(`${item.periodo}::${regionalSelecionada}`);
        const comissaoTotal = Number(item.valor) || 0;
        const dsrTotal = comissaoTotal / 6;
        const qtdVend = Number(baseRegionalMes?.qtdVendedoresFte) || Number(baseRegionalMes?.qtdVendedores) || 0;
        return {
          periodo: item.periodo,
          comissaoVendedores: comissaoTotal,
          comissaoLiderancas: 0,
          comissaoTotal,
          dsrTotal,
          totalComDsr: comissaoTotal + dsrTotal,
          ticketMedioVendedor: qtdVend > 0 ? comissaoTotal / qtdVend : 0,
          qtdVendedores: baseRegionalMes?.qtdVendedores ?? '-',
          qtdVendedoresFte: baseRegionalMes?.qtdVendedoresFte ?? '-',
          qtdLiderancas: '-'
        };
      });
  }, [
    regionalSelecionada,
    tipoSelecionado,
    serieMensal,
    serieRegionalMensal,
    serieTipoMensal,
    serieRegionalTipoMensal,
    serieMensalMap,
    serieRegionalMensalMap
  ]);

  const indicadoresFiltrados = useMemo(() => {
    if (!resumoMensalFiltrado.length) return null;

    const primeiro = resumoMensalFiltrado[0];
    const ultimo = resumoMensalFiltrado[resumoMensalFiltrado.length - 1];
    const totalComissaoVendedores = resumoMensalFiltrado.reduce(
      (acc, item) => acc + (Number(item.comissaoVendedores) || 0),
      0
    );
    const totalComissaoLiderancas = resumoMensalFiltrado.reduce(
      (acc, item) => acc + (Number(item.comissaoLiderancas) || 0),
      0
    );
    const totalComissao = resumoMensalFiltrado.reduce((acc, item) => acc + (Number(item.comissaoTotal) || 0), 0);
    const totalDsr = resumoMensalFiltrado.reduce((acc, item) => acc + (Number(item.dsrTotal) || 0), 0);
    const totalComDsr = totalComissao + totalDsr;
    const somaVendedores = resumoMensalFiltrado.reduce(
      (acc, item) => acc + (Number(item.qtdVendedoresFte) || Number(item.qtdVendedores) || 0),
      0
    );
    const ticketMedioVendedor = somaVendedores > 0 ? totalComissao / somaVendedores : 0;
    const variacaoMensalPercent = Number(primeiro.comissaoTotal) > 0
      ? ((Number(ultimo.comissaoTotal) - Number(primeiro.comissaoTotal)) / Number(primeiro.comissaoTotal)) * 100
      : null;

    return {
      periodo: resumoMensalFiltrado.length > 1
        ? `${primeiro.periodo} a ${ultimo.periodo}`
        : ultimo.periodo,
      comissaoVendedores: totalComissaoVendedores,
      comissaoLiderancas: totalComissaoLiderancas,
      comissaoTotal: totalComissao,
      dsrTotal: totalDsr,
      totalComDsr,
      ticketMedioVendedor,
      variacaoMensalPercent
    };
  }, [resumoMensalFiltrado]);

  const resumoOrdenado = useMemo(
    () => [...resumoMensalFiltrado].sort((a, b) => {
      const pa = parsePeriodo(a.periodo);
      const pb = parsePeriodo(b.periodo);
      if (!pa && !pb) return String(a.periodo).localeCompare(String(b.periodo), 'pt-BR');
      if (!pa) return 1;
      if (!pb) return -1;
      if (pa.ano !== pb.ano) return pa.ano - pb.ano;
      return pa.mes - pb.mes;
    }),
    [resumoMensalFiltrado]
  );

  const linhaReferencia = useMemo(
    () => resumoOrdenado.find((item) => item.periodo === periodoReferencia) || resumoOrdenado[resumoOrdenado.length - 1],
    [resumoOrdenado, periodoReferencia]
  );

  const linhaBase = useMemo(
    () => resumoOrdenado.find((item) => item.periodo === periodoBase) || resumoOrdenado[0],
    [resumoOrdenado, periodoBase]
  );

  const linhaAnterior = useMemo(() => {
    if (!linhaReferencia) return null;
    const idx = resumoOrdenado.findIndex((item) => item.periodo === linhaReferencia.periodo);
    if (idx <= 0) return null;
    return resumoOrdenado[idx - 1];
  }, [resumoOrdenado, linhaReferencia]);

  const linhaComparacao = modoComparacao === 'base' ? linhaBase : linhaAnterior;
  const rotuloComparacao = modoComparacao === 'base'
    ? `vs ${linhaBase?.periodo || '-'}` : `vs ${linhaAnterior?.periodo || '-'}`;

  const variacaoExecutiva = useMemo(() => {
    if (!linhaReferencia || !linhaComparacao) {
      return {
        deltaAbsoluto: 0,
        deltaPercentual: null,
        deltaTicket: 0,
        deltaTicketPercentual: null
      };
    }
    const deltaAbsoluto = Number(linhaReferencia.comissaoTotal || 0) - Number(linhaComparacao.comissaoTotal || 0);
    const baseComissao = Number(linhaComparacao.comissaoTotal || 0);
    const deltaPercentual = baseComissao > 0 ? (deltaAbsoluto / baseComissao) * 100 : null;

    const deltaTicket = Number(linhaReferencia.ticketMedioVendedor || 0) - Number(linhaComparacao.ticketMedioVendedor || 0);
    const baseTicket = Number(linhaComparacao.ticketMedioVendedor || 0);
    const deltaTicketPercentual = baseTicket > 0 ? (deltaTicket / baseTicket) * 100 : null;

    return {
      deltaAbsoluto,
      deltaPercentual,
      deltaTicket,
      deltaTicketPercentual
    };
  }, [linhaReferencia, linhaComparacao]);

  const contribuicaoTipoPositiva = useMemo(() => {
    if (!linhaReferencia || !linhaComparacao) return [];

    const fonteAtual = regionalSelecionada
      ? serieRegionalTipoMensal.filter((item) => item.periodo === linhaReferencia.periodo && item.regionalNome === regionalSelecionada)
      : serieTipoMensal.filter((item) => item.periodo === linhaReferencia.periodo);

    const fonteBase = regionalSelecionada
      ? serieRegionalTipoMensal.filter((item) => item.periodo === linhaComparacao.periodo && item.regionalNome === regionalSelecionada)
      : serieTipoMensal.filter((item) => item.periodo === linhaComparacao.periodo);

    const mapaAtual = new Map();
    const mapaBase = new Map();
    fonteAtual.forEach((item) => mapaAtual.set(item.tipo, (mapaAtual.get(item.tipo) || 0) + (Number(item.valor) || 0)));
    fonteBase.forEach((item) => mapaBase.set(item.tipo, (mapaBase.get(item.tipo) || 0) + (Number(item.valor) || 0)));

    const tipos = new Set([...mapaAtual.keys(), ...mapaBase.keys()]);
    return Array.from(tipos)
      .map((tipo) => {
        const atual = Number(mapaAtual.get(tipo) || 0);
        const base = Number(mapaBase.get(tipo) || 0);
        const delta = atual - base;
        const deltaPct = base > 0 ? (delta / base) * 100 : null;
        return {
          tipo,
          tipoLabel: labelTipo(tipo),
          atual,
          base,
          delta,
          deltaPct
        };
      })
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta);
  }, [linhaReferencia, linhaComparacao, serieRegionalTipoMensal, serieTipoMensal, regionalSelecionada]);

  const contribuicaoRegionalPositiva = useMemo(() => {
    if (!linhaReferencia || !linhaComparacao) return [];

    const fonteAtual = tipoSelecionado
      ? serieRegionalTipoMensal.filter((item) => item.periodo === linhaReferencia.periodo && item.tipo === tipoSelecionado)
      : serieRegionalMensal.filter((item) => item.periodo === linhaReferencia.periodo);

    const fonteBase = tipoSelecionado
      ? serieRegionalTipoMensal.filter((item) => item.periodo === linhaComparacao.periodo && item.tipo === tipoSelecionado)
      : serieRegionalMensal.filter((item) => item.periodo === linhaComparacao.periodo);

    const mapaAtual = new Map();
    const mapaBase = new Map();
    fonteAtual.forEach((item) => mapaAtual.set(item.regionalNome, (mapaAtual.get(item.regionalNome) || 0) + (Number(item.valor) || 0)));
    fonteBase.forEach((item) => mapaBase.set(item.regionalNome, (mapaBase.get(item.regionalNome) || 0) + (Number(item.valor) || 0)));

    const regionais = new Set([...mapaAtual.keys(), ...mapaBase.keys()]);
    return Array.from(regionais)
      .map((regionalNome) => {
        const atual = Number(mapaAtual.get(regionalNome) || 0);
        const base = Number(mapaBase.get(regionalNome) || 0);
        const delta = atual - base;
        const deltaPct = base > 0 ? (delta / base) * 100 : null;
        return { regionalNome, atual, base, delta, deltaPct };
      })
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta);
  }, [linhaReferencia, linhaComparacao, serieRegionalTipoMensal, serieRegionalMensal, tipoSelecionado]);

  const qualidadeComercial = useMemo(() => {
    const totalTiposConsiderados = contribuicaoTipoPositiva.length;
    const totalRegionaisPositivas = contribuicaoRegionalPositiva.length;

    const mesesComAlta = resumoOrdenado.reduce((acc, item, idx) => {
      if (idx === 0) return acc;
      const anterior = resumoOrdenado[idx - 1];
      return acc + (Number(item.comissaoTotal || 0) > Number(anterior.comissaoTotal || 0) ? 1 : 0);
    }, 0);
    const totalComparacoesMes = Math.max(resumoOrdenado.length - 1, 1);
    const consistenciaAltaPct = (mesesComAlta / totalComparacoesMes) * 100;

    return {
      totalTiposConsiderados,
      totalRegionaisPositivas,
      consistenciaAltaPct
    };
  }, [contribuicaoTipoPositiva, contribuicaoRegionalPositiva, resumoOrdenado]);

  const resumoPagamentoMedioTipo = useMemo(() => {
    if (!linhaReferencia) return [];

    const fonteComissao = regionalSelecionada
      ? serieRegionalTipoMensal.filter((item) => item.periodo === linhaReferencia.periodo && item.regionalNome === regionalSelecionada)
      : serieTipoMensal.filter((item) => item.periodo === linhaReferencia.periodo);

    const fonteQuantidade = regionalSelecionada
      ? serieRegionalTipoMensalQuantidade.filter((item) => item.periodo === linhaReferencia.periodo && item.regionalNome === regionalSelecionada)
      : serieTipoMensalQuantidade.filter((item) => item.periodo === linhaReferencia.periodo);

    const mapaComissao = new Map();
    const mapaQuantidade = new Map();
    fonteComissao.forEach((item) => mapaComissao.set(item.tipo, (mapaComissao.get(item.tipo) || 0) + (Number(item.valor) || 0)));
    fonteQuantidade.forEach((item) => mapaQuantidade.set(item.tipo, (mapaQuantidade.get(item.tipo) || 0) + (Number(item.quantidade) || 0)));

    const ordemTipo = new Map(TIPOS_COMISSAO.map((tipo, idx) => [tipo, idx]));
    const tiposBase = tipoSelecionado ? [tipoSelecionado] : TIPOS_COMISSAO;
    const catalogoTipos = new Set([...tiposBase, ...mapaComissao.keys(), ...mapaQuantidade.keys()]);
    const linhas = Array.from(catalogoTipos)
      .map((tipo) => {
        const totalComissao = Number(mapaComissao.get(tipo) || 0);
        const quantidadeEventos = Number(mapaQuantidade.get(tipo) || 0);
        return {
          tipo,
          tipoLabel: labelTipo(tipo),
          quantidadeEventos,
          totalComissao,
          valorMedioEvento: quantidadeEventos > 0 ? (totalComissao / quantidadeEventos) : 0
        };
      })
      .sort((a, b) => {
        const ordemA = ordemTipo.has(a.tipo) ? ordemTipo.get(a.tipo) : 999;
        const ordemB = ordemTipo.has(b.tipo) ? ordemTipo.get(b.tipo) : 999;
        if (ordemA !== ordemB) return ordemA - ordemB;
        return a.tipoLabel.localeCompare(b.tipoLabel, 'pt-BR');
      });

    const totalComissaoExibida = linhas.reduce((acc, item) => acc + (Number(item.totalComissao) || 0), 0);
    return linhas.map((item) => ({
      ...item,
      participacaoPercentual: totalComissaoExibida > 0
        ? ((Number(item.totalComissao) || 0) / totalComissaoExibida) * 100
        : 0
    }));
  }, [
    linhaReferencia,
    regionalSelecionada,
    tipoSelecionado,
    serieRegionalTipoMensal,
    serieRegionalTipoMensalQuantidade,
    serieTipoMensal,
    serieTipoMensalQuantidade
  ]);

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
          <h1>Dashboard Variavel</h1>
          <p>Indicadores e tendencias mes a mes de remuneracao variavel</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <div className="glass-card dashboard-variavel-filtros">
          <div className="form-group">
            <label className="form-label">Periodo Inicio</label>
            <select className="form-select" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)}>
              <option value="">Todos</option>
              {periodosDisponiveis.map((p) => (
                <option key={`ini-${p}`} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Periodo Fim</label>
            <select className="form-select" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)}>
              <option value="">Todos</option>
              {periodosDisponiveis.map((p) => (
                <option key={`fim-${p}`} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Perfil de Vendedor</label>
            <select
              className="form-select"
              value={filtroPerfilVendedor}
              onChange={handlePerfilVendedorChange}
            >
              {PERFIS_VENDEDOR.map((perfilOpcao) => (
                <option key={perfilOpcao.value} value={perfilOpcao.value}>
                  {perfilOpcao.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Modo de Leitura</label>
            <select
              className="form-select"
              value={modoLeitura}
              onChange={(e) => setModoLeitura(e.target.value)}
            >
              <option value="projetado">Projetado</option>
              <option value="realizado">Realizado Estimado</option>
            </select>
          </div>
          <div className="form-group filtro-botoes">
            <button className="btn btn-primary" onClick={handleAplicarFiltro} disabled={carregando}>
              {carregando ? 'Carregando...' : 'Aplicar'}
            </button>
          </div>
        </div>

        <div className="glass-card dashboard-variavel-filtros dashboard-variavel-filtros--secondary">
          <div className="form-group">
            <label className="form-label">Mes de Analise</label>
            <select
              className="form-select"
              value={periodoReferencia}
              onChange={(e) => setPeriodoReferencia(e.target.value)}
            >
              {resumoOrdenado.map((item) => (
                <option key={`ref-${item.periodo}`} value={item.periodo}>{item.periodo}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Comparacao</label>
            <select
              className="form-select"
              value={modoComparacao}
              onChange={(e) => setModoComparacao(e.target.value)}
            >
              <option value="anterior">Mes Anterior</option>
              <option value="base">Mes Base</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Mes Base</label>
            <select
              className="form-select"
              value={periodoBase}
              onChange={(e) => setPeriodoBase(e.target.value)}
              disabled={modoComparacao !== 'base'}
            >
              {resumoOrdenado.map((item) => (
                <option key={`base-${item.periodo}`} value={item.periodo}>{item.periodo}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Recortes Rapidos</label>
            <div className="dashboard-selecoes">
              <button className="btn btn-small" onClick={() => setRegionalSelecionada('')}>
                Limpar Regional
              </button>
              <button className="btn btn-small" onClick={() => setTipoSelecionado('')}>
                Limpar Tipo
              </button>
            </div>
          </div>
        </div>

        {possuiMesVigenteNoRecorte && (
          <div className="alert alert-warning">
            <strong>Atencao: mes vigente com projecao.</strong> No mes atual os valores sao projetados por dias uteis e
            podem gerar vies na comparacao com meses fechados.
          </div>
        )}

        {indicadoresFiltrados && (
          <div className="cards-grid cards-grid--executivo">
            <div className="info-card info-card--highlight">
              <span className="info-label">Comissao Total ({linhaReferencia?.periodo || '-'})</span>
              <strong>{moeda(linhaReferencia?.comissaoTotal)}</strong>
              <small>{rotuloComparacao} {variacaoExecutiva.deltaPercentual === null ? '-' : percentual(variacaoExecutiva.deltaPercentual)}</small>
            </div>
            <div className="info-card">
              <span className="info-label">Incremento Absoluto</span>
              <strong>{moeda(variacaoExecutiva.deltaAbsoluto)}</strong>
              <small>{rotuloComparacao}</small>
            </div>
            <div className="info-card">
              <span className="info-label">Ticket Medio por Vendedor</span>
              <strong>{moeda(linhaReferencia?.ticketMedioVendedor)}</strong>
              <small>{variacaoExecutiva.deltaTicketPercentual === null ? '-' : percentual(variacaoExecutiva.deltaTicketPercentual)}</small>
            </div>
            <div className="info-card">
              <span className="info-label">Tipos em Crescimento Positivo</span>
              <strong>{numero(qualidadeComercial.totalTiposConsiderados)}</strong>
              <small>{rotuloComparacao}</small>
            </div>
            <div className="info-card">
              <span className="info-label">Regionais em Crescimento Positivo</span>
              <strong>{numero(qualidadeComercial.totalRegionaisPositivas)}</strong>
              <small>{rotuloComparacao}</small>
            </div>
            <div className="info-card">
              <span className="info-label">Consistencia de Alta (Mes a Mes)</span>
              <strong>{percentual(qualidadeComercial.consistenciaAltaPct)}</strong>
              <small>Dentro do recorte selecionado</small>
            </div>
          </div>
        )}

        <div className="dashboard-variavel-grid">
          <div className="glass-card chart-card">
            <h3>{tituloEvolucao} (Clique nos graficos para filtrar)</h3>
            {(regionalSelecionada || tipoSelecionado) && (
              <div className="dashboard-selecoes">
                {regionalSelecionada ? <span className="tag-selecao">Regional: {regionalSelecionada}</span> : null}
                {tipoSelecionado ? <span className="tag-selecao">Tipo: {labelTipo(tipoSelecionado)}</span> : null}
                <button className="btn btn-small" onClick={() => { setRegionalSelecionada(''); setTipoSelecionado(''); }}>
                  Limpar selecao
                </button>
              </div>
            )}
            <div className="chart-area">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={evolucaoFiltrada}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip formatter={(v) => moeda(v)} />
                  <Legend />
                  {regionalSelecionada || tipoSelecionado ? (
                    <Line type="monotone" dataKey="valor" name="Comissao" stroke="#2563eb" strokeWidth={2} />
                  ) : (
                    <>
                      <Line type="monotone" dataKey="comissaoTotal" name="Comissao Total" stroke="#2563eb" strokeWidth={2} />
                      <Line type="monotone" dataKey="comissaoVendedores" name="Comissao Vendedores" stroke="#16a34a" strokeWidth={2} />
                      <Line type="monotone" dataKey="comissaoLiderancas" name="Comissao Liderancas" stroke="#f97316" strokeWidth={2} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card chart-card">
            <h3>Contribuicao Positiva por Tipo ({linhaReferencia?.periodo || '-'})</h3>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={contribuicaoTipoPositiva}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipoLabel" />
                  <YAxis />
                  <Tooltip formatter={(v, name, item) => {
                    if (name === 'Delta') return moeda(v);
                    if (name === 'Atual') return moeda(item?.payload?.atual);
                    if (name === 'Base') return moeda(item?.payload?.base);
                    return moeda(v);
                  }} />
                  <Bar
                    dataKey="delta"
                    name="Delta"
                    fill="#0ea5e9"
                    onClick={(entry) => {
                      const payload = entry?.payload || entry;
                      const tipo = payload?.tipo;
                      if (!tipo) return;
                      setTipoSelecionado((atual) => (atual === tipo ? '' : tipo));
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card chart-card">
            <h3>Contribuicao Positiva por Regional ({linhaReferencia?.periodo || '-'})</h3>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={contribuicaoRegionalPositiva.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="regionalNome" />
                  <YAxis />
                  <Tooltip formatter={(v, name, item) => {
                    if (name === 'Delta') return moeda(v);
                    if (name === 'Atual') return moeda(item?.payload?.atual);
                    if (name === 'Base') return moeda(item?.payload?.base);
                    return moeda(v);
                  }} />
                  <Bar
                    dataKey="delta"
                    name="Delta"
                    fill="#7c3aed"
                    onClick={(entry) => {
                      const payload = entry?.payload || entry;
                      const regional = payload?.regionalNome;
                      if (!regional) return;
                      setRegionalSelecionada((atual) => (atual === regional ? '' : regional));
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card chart-card">
            <h3>Composicao por Tipo no Recorte (Vendedores)</h3>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={composicaoFiltrada}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipoLabel" />
                  <YAxis />
                  <Tooltip formatter={(v) => moeda(v)} />
                  <Bar
                    dataKey="valor"
                    name="Comissao"
                    fill="#16a34a"
                    onClick={(entry) => {
                      const payload = entry?.payload || entry;
                      const tipo = payload?.tipo;
                      if (!tipo) return;
                      setTipoSelecionado((atual) => (atual === tipo ? '' : tipo));
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card chart-card chart-card--full">
            <h3>Resumo Mensal e Pagamento Medio por Evento</h3>
            <div className="table-wrap">
              <table className="table-variavel">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Comissao Vendedores</th>
                    <th>Comissao Liderancas</th>
                    <th>Comissao Total</th>
                    <th>DSR</th>
                    <th>Total com DSR</th>
                    <th>Vendedores</th>
                    <th>FTE</th>
                    <th>Liderancas</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoMensalFiltrado.map((linha) => (
                    <tr key={linha.periodo}>
                      <td>{linha.periodo}</td>
                      <td>{moeda(linha.comissaoVendedores)}</td>
                      <td>{moeda(linha.comissaoLiderancas)}</td>
                      <td>{moeda(linha.comissaoTotal)}</td>
                      <td>{moeda(linha.dsrTotal)}</td>
                      <td>{moeda(linha.totalComDsr)}</td>
                      <td>{linha.qtdVendedores}</td>
                      <td>{linha.qtdVendedoresFte === undefined || linha.qtdVendedoresFte === null || linha.qtdVendedoresFte === '-' ? '-' : numero(linha.qtdVendedoresFte)}</td>
                      <td>{linha.qtdLiderancas}</td>
                    </tr>
                  ))}
                  {resumoMensalFiltrado.length === 0 && (
                    <tr>
                      <td colSpan={9} className="empty-cell">Nenhum dado encontrado para o intervalo selecionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-wrap" style={{ marginTop: '12px' }}>
              <table className="table-variavel">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Qtde Eventos</th>
                    <th>Total Comissao</th>
                    <th>Valor Medio por Evento</th>
                    <th>Participacao %</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoPagamentoMedioTipo.map((item) => (
                    <tr key={`drv-tipo-${item.tipo}`}>
                      <td>{item.tipoLabel}</td>
                      <td>{numero(item.quantidadeEventos)}</td>
                      <td>{moeda(item.totalComissao)}</td>
                      <td>{moeda(item.valorMedioEvento)}</td>
                      <td>{percentual(item.participacaoPercentual)}</td>
                    </tr>
                  ))}
                  {resumoPagamentoMedioTipo.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-cell">Nenhum tipo encontrado para o mes de analise selecionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
