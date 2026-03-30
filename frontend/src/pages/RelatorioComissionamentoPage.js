import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { churnRegionaisAPI, comissionamentoAPI, regionaisAPI, vendasMensaisAPI } from '../services/api';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import '../styles/RelatorioMetasPage.css';
import '../styles/RelatorioComissionamentoPage.css';

const TIPOS_META = [
  { key: 'vendas', label: 'Vendas' },
  { key: 'churn', label: 'Churn' },
  { key: 'mudancaTitularidade', label: 'Mudança de titularidade' },
  { key: 'migracaoTecnologia', label: 'Migração de tecnologia' },
  { key: 'renovacao', label: 'Renovação' },
  { key: 'planoEvento', label: 'Plano evento' },
  { key: 'sva', label: 'SVA' },
  { key: 'telefonia', label: 'Telefonia' }
];

const MESES = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
};

const PERFIS_VENDEDOR = [
  { value: 'todos', label: 'Todos os vendedores' },
  { value: 'vendas_ou_ambos', label: 'Apenas vendedores com vendas do tipo Vendas' }
];

const PERFIL_VENDEDOR_FILTRO = {
  TODOS: 'todos',
  VENDAS_OU_AMBOS: 'vendas_ou_ambos'
};

const vendedorTemMovimentoVendas = (vendedor = {}) => {
  const vendas = vendedor?.vendas || {};
  return (Number(vendas.quantidade) || 0) > 0
    || (Number(vendas.valorTotal) || 0) > 0
    || (Number(vendas.comissao) || 0) > 0;
};

const aplicarFiltroPerfilVendedorLocal = (vendedores = [], filtroPerfilVendedor = PERFIL_VENDEDOR_FILTRO.TODOS) => {
  const lista = Array.isArray(vendedores) ? vendedores : [];
  if (filtroPerfilVendedor !== PERFIL_VENDEDOR_FILTRO.VENDAS_OU_AMBOS) {
    return lista;
  }
  return lista.filter((vendedor) => vendedorTemMovimentoVendas(vendedor));
};

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
const TIPO_LABEL_MAP = {
  vendas: 'Vendas',
  churn: 'Churn',
  mudancaTitularidade: 'Mudança de titularidade',
  migracaoTecnologia: 'Migração de tecnologia',
  renovacao: 'Renovação',
  planoEvento: 'Plano evento',
  sva: 'SVA',
  telefonia: 'Telefonia'
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
  const mes = MESES[normalizarTexto(mesTxt).slice(0, 3)];
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

const RelatorioComissionamentoPage = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';

  const [relatorioMetas, setRelatorioMetas] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroPerfilVendedor, setFiltroPerfilVendedor] = useState('todos');
  const [dadosComissao, setDadosComissao] = useState(null);
  const [dadosVendedores, setDadosVendedores] = useState(null);
  const [dadosLiderancas, setDadosLiderancas] = useState(null);
  const [dadosRelatorioRH, setDadosRelatorioRH] = useState(null);
  const [carregandoMetas, setCarregandoMetas] = useState(true);
  const [carregandoComissao, setCarregandoComissao] = useState(false);
  const [carregandoVendedores, setCarregandoVendedores] = useState(false);
  const [carregandoLiderancas, setCarregandoLiderancas] = useState(false);
  const [carregandoRelatorioRH, setCarregandoRelatorioRH] = useState(false);
  const [erro, setErro] = useState('');
  const [duTotal, setDuTotal] = useState(0);
  const [duPassado, setDuPassado] = useState(0);
  const [indicadoresPorRegional, setIndicadoresPorRegional] = useState({});

  const carregarMetas = useCallback(async () => {
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
  }, []);

  const carregarComissionamento = useCallback(async () => {
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
  }, [periodoSelecionado, filtroRegional]);

  const carregarVendedores = useCallback(async (filtroPerfilParam) => {
    if (!periodoSelecionado) {
      setDadosVendedores(null);
      return;
    }

    try {
      setCarregandoVendedores(true);
      const filtroPerfilAplicado = filtroPerfilParam || filtroPerfilVendedor;

      if (filtroRegional) {
        const response = await comissionamentoAPI.listarVendedores(
          periodoSelecionado,
          filtroRegional,
          filtroPerfilAplicado
        );
        const vendedoresFiltrados = aplicarFiltroPerfilVendedorLocal(
          response.data?.vendedores || [],
          filtroPerfilAplicado
        );
        const qtdVendedoresFteFiltrado = vendedoresFiltrados.reduce(
          (acc, vendedor) => acc + (Number(vendedor?.ftePesoRegional) || 0),
          0
        );
        setDadosVendedores({
          ...response.data,
          filtroPerfilVendedor: filtroPerfilAplicado,
          vendedores: vendedoresFiltrados,
          qtdVendedoresHeadcount: vendedoresFiltrados.length,
          qtdVendedoresFte: qtdVendedoresFteFiltrado > 0
            ? qtdVendedoresFteFiltrado
            : Number(response.data?.qtdVendedoresFte || 0)
        });
      } else {
        const resultados = await Promise.all(
          regionais.map(async (regional) => {
            try {
              const response = await comissionamentoAPI.listarVendedores(
                periodoSelecionado,
                regional.id,
                filtroPerfilAplicado
              );
              const vendedores = aplicarFiltroPerfilVendedorLocal(
                response.data?.vendedores || [],
                filtroPerfilAplicado
              );
              const qtdVendedoresFteFiltrado = vendedores.reduce(
                (acc, vendedor) => acc + (Number(vendedor?.ftePesoRegional) || 0),
                0
              );
              const vendedoresDecorados = vendedores.map((vendedor) => ({
                ...vendedor,
                regionalNome: regional.nome,
                regionalId: regional.id
              }));
              return {
                vendedores: vendedoresDecorados,
                qtdVendedoresHeadcount: vendedores.length,
                qtdVendedoresFte: qtdVendedoresFteFiltrado > 0
                  ? qtdVendedoresFteFiltrado
                  : Number(response.data?.qtdVendedoresFte || 0)
              };
            } catch (errorRegional) {
              console.warn(`Falha ao carregar vendedores da regional ${regional.nome}:`, errorRegional);
              return {
                vendedores: [],
                qtdVendedoresHeadcount: 0,
                qtdVendedoresFte: 0
              };
            }
          })
        );

        const vendedoresConsolidados = resultados
          .flatMap((item) => item.vendedores || [])
          .sort((a, b) => {
            const regA = (a.regionalNome || '').toLowerCase();
            const regB = (b.regionalNome || '').toLowerCase();
            if (regA !== regB) return regA.localeCompare(regB);
            return (a.nome || '').localeCompare(b.nome || '');
          });

        const totalHeadcount = resultados.reduce(
          (acc, item) => acc + (Number(item.qtdVendedoresHeadcount) || 0),
          0
        );
        const totalFte = resultados.reduce(
          (acc, item) => acc + (Number(item.qtdVendedoresFte) || 0),
          0
        );

        setDadosVendedores({
          periodo: periodoSelecionado,
          filtroPerfilVendedor: filtroPerfilAplicado,
          vendedores: vendedoresConsolidados,
          coberturaRegional: resultados.map((item, idx) => ({
            regionalId: regionais[idx]?.id,
            regionalNome: regionais[idx]?.nome || '-',
            qtdVendedoresHeadcount: Number(item.qtdVendedoresHeadcount) || 0,
            qtdVendedoresFte: Number(item.qtdVendedoresFte) || 0
          })),
          qtdVendedoresHeadcount: totalHeadcount,
          qtdVendedoresFte: totalFte
        });
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      setDadosVendedores(null);
    } finally {
      setCarregandoVendedores(false);
    }
  }, [periodoSelecionado, filtroRegional, filtroPerfilVendedor, regionais]);

  const carregarLiderancas = useCallback(async () => {
    if (!periodoSelecionado) {
      setDadosLiderancas(null);
      return;
    }

    try {
      setCarregandoLiderancas(true);
      const response = await comissionamentoAPI.listarLiderancas(periodoSelecionado);
      setDadosLiderancas(response.data);
    } catch (error) {
      console.error('Erro ao carregar liderancas:', error);
      setDadosLiderancas(null);
    } finally {
      setCarregandoLiderancas(false);
    }
  }, [periodoSelecionado]);

  const carregarRelatorioRH = useCallback(async () => {
    if (!periodoSelecionado) {
      setDadosRelatorioRH(null);
      return;
    }

    try {
      setCarregandoRelatorioRH(true);
      const response = await comissionamentoAPI.listarRelatorioRH(
        periodoSelecionado,
        filtroRegional || undefined
      );
      setDadosRelatorioRH(response.data || null);
    } catch (error) {
      console.error('Erro ao carregar relatorio RH:', error);
      setDadosRelatorioRH(null);
    } finally {
      setCarregandoRelatorioRH(false);
    }
  }, [periodoSelecionado, filtroRegional]);

  useEffect(() => {
    carregarMetas();
  }, [carregarMetas]);

  useEffect(() => {
    carregarComissionamento();
  }, [carregarComissionamento]);

  useEffect(() => {
    carregarVendedores();
  }, [carregarVendedores]);

  useEffect(() => {
    carregarLiderancas();
  }, [carregarLiderancas]);

  useEffect(() => {
    carregarRelatorioRH();
  }, [carregarRelatorioRH]);

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
      } catch (error) {
        setIndicadoresPorRegional({});
      }
    };

    carregarIndicadores();
  }, [periodoSelecionado]);

  const filtrarMetasPorPeriodo = (metas) => {
    if (!periodoSelecionado) return [];
    return metas.filter((meta) => meta.periodo === periodoSelecionado);
  };

  const arredondarParaCima = (valor) => Math.ceil(valor);
  const formatMetaIndividual = (valor) => formatNumero(Number(valor) || 0, 2);

  const formatNumero = (valor) => {
    const numero = Number(valor) || 0;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numero);
  };

  const formatMoedaContabil = (valor) => {
    const numero = Number(valor) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
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

  const mostraTendenciaMes = isPeriodoMesVigente(periodoSelecionado);
  const fatorProjecaoMes = mostraTendenciaMes && duPassado > 0 ? (duTotal / duPassado) : 1;
  const avisoProjecaoMesVigente = mostraTendenciaMes && duPassado > 0 && duTotal > 0;
  const valorConsiderado = (valor) => Number(valor || 0) * fatorProjecaoMes;

  const dadosRelatorioRHExibicaoBase = (() => {
    if (!dadosRelatorioRH) return null;

    const agrupado = (dadosRelatorioRH.agrupadoPorRegional || []).map((regional) => {
        const cargos = (regional.cargos || []).map((cargo) => {
          const linhas = (cargo.linhas || []).map((linha) => {
          const comissao = Number(linha.comissao) || 0;
          const dsr = Number(linha.dsr) || 0;
          return {
            ...linha,
            comissao,
            dsr,
            totalComDsr: comissao + dsr
          };
        });
        return { ...cargo, linhas };
      });

      const subtotalComissao = cargos.reduce(
        (acc, cargo) => acc + (cargo.linhas || []).reduce((s, l) => s + (Number(l.comissao) || 0), 0),
        0
      );
      const subtotalDsr = cargos.reduce(
        (acc, cargo) => acc + (cargo.linhas || []).reduce((s, l) => s + (Number(l.dsr) || 0), 0),
        0
      );
      return {
        ...regional,
        cargos,
        subtotalComissao,
        subtotalDsr,
        subtotalTotalComDsr: subtotalComissao + subtotalDsr
      };
    });

    const totalGeralComissao = agrupado.reduce((acc, r) => acc + (Number(r.subtotalComissao) || 0), 0);
    const totalGeralDsr = agrupado.reduce((acc, r) => acc + (Number(r.subtotalDsr) || 0), 0);

    return {
      ...dadosRelatorioRH,
      agrupadoPorRegional: agrupado,
      totalGeralComissao,
      totalGeralDsr,
      totalGeralComDsr: totalGeralComissao + totalGeralDsr
    };
  })();

  const construirLinhasRelatorioRHExportacao = () => {
    if (!dadosRelatorioRHExibicao) return [];

    const linhas = [];
    (dadosRelatorioRHExibicao.agrupadoPorRegional || []).forEach((regional) => {
      (regional.cargos || []).forEach((cargo) => {
        (cargo.linhas || []).forEach((linha) => {
          linhas.push({
            regional: regional.regionalNome,
            cargo: cargo.cargo,
            colaborador: linha.nome,
            tipo: linha.tipoColaborador,
            comissao: Number(linha.comissao) || 0,
            dsr: Number(linha.dsr) || 0,
            total: Number(linha.totalComDsr) || 0
          });
        });
      });

      linhas.push({
        regional: `SUBTOTAL ${regional.regionalNome}`,
        cargo: '',
        colaborador: '',
        tipo: '',
        comissao: Number(regional.subtotalComissao) || 0,
        dsr: Number(regional.subtotalDsr) || 0,
        total: Number(regional.subtotalTotalComDsr) || 0
      });
    });

    linhas.push({
      regional: 'TOTAL GERAL',
      cargo: '',
      colaborador: '',
      tipo: '',
      comissao: Number(dadosRelatorioRHExibicao.totalGeralComissao) || 0,
      dsr: Number(dadosRelatorioRHExibicao.totalGeralDsr) || 0,
      total: Number(dadosRelatorioRHExibicao.totalGeralComDsr) || 0
    });

    return linhas;
  };

  const baixarCsvRelatorioRH = () => {
    const linhas = construirLinhasRelatorioRHExportacao();
    if (!linhas.length) return;

    const header = ['Regional', 'Cargo', 'Colaborador', 'Tipo', 'Comissao', 'DSR', 'Total'];
    const conteudo = linhas.map((linha) => ([
      linha.regional,
      linha.cargo,
      linha.colaborador,
      linha.tipo,
      String(linha.comissao).replace('.', ','),
      String(linha.dsr).replace('.', ','),
      String(linha.total).replace('.', ',')
    ].join(';')));

    const csv = [header.join(';'), ...conteudo].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_rh_${dadosRelatorioRHExibicao?.periodo || 'periodo'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const baixarExcelRelatorioRH = () => {
    const linhas = construirLinhasRelatorioRHExportacao();
    if (!linhas.length) return;

    const linhasExcel = linhas.map((linha) => ({
      Regional: linha.regional,
      Cargo: linha.cargo,
      Colaborador: linha.colaborador,
      Tipo: linha.tipo,
      Comissao: linha.comissao,
      DSR: linha.dsr,
      Total: linha.total
    }));

    const ws = XLSX.utils.json_to_sheet(linhasExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio RH');
    XLSX.writeFile(wb, `relatorio_rh_${dadosRelatorioRHExibicao?.periodo || 'periodo'}.xlsx`);
  };

  const baixarPdfRelatorioRH = () => {
    const linhas = construirLinhasRelatorioRHExportacao();
    if (!linhas.length) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margemX = 8;
    const larguraPagina = doc.internal.pageSize.getWidth();
    const limiteY = doc.internal.pageSize.getHeight() - 10;
    const headers = ['Regional', 'Cargo', 'Colaborador', 'Tipo', 'Comissao', 'DSR', 'Total'];

    doc.setFontSize(9);
    const larguraDisponivel = larguraPagina - margemX * 2;
    const largurasFixasNumericas = [24, 24, 24];
    const larguraTextoDisponivel = larguraDisponivel - largurasFixasNumericas.reduce((a, b) => a + b, 0);

    const colunasTextoValores = [
      [headers[0], ...linhas.map((l) => String(l.regional || ''))],
      [headers[1], ...linhas.map((l) => String(l.cargo || ''))],
      [headers[2], ...linhas.map((l) => String(l.colaborador || ''))],
      [headers[3], ...linhas.map((l) => String(l.tipo || ''))]
    ];

    const minTextos = [28, 24, 34, 18];
    const maxTextos = [70, 55, 80, 30];
    const desejadas = colunasTextoValores.map((valores, idx) => {
      const maior = valores.reduce((acc, v) => Math.max(acc, doc.getTextWidth(v) + 4), 0);
      return Math.max(minTextos[idx], Math.min(maxTextos[idx], maior));
    });

    const somaDesejada = desejadas.reduce((a, b) => a + b, 0);
    const fator = somaDesejada > 0 ? Math.min(1, larguraTextoDisponivel / somaDesejada) : 1;
    const largurasTextos = desejadas.map((v, idx) => Math.max(minTextos[idx], v * fator));
    const somaAjustadaTextos = largurasTextos.reduce((a, b) => a + b, 0);
    const sobra = larguraTextoDisponivel - somaAjustadaTextos;
    if (sobra > 0) largurasTextos[2] += sobra;

    const colunas = [...largurasTextos, ...largurasFixasNumericas];

    let y = 10;
    doc.setFontSize(11);
    doc.text(`Relatorio Oficial RH - ${dadosRelatorioRHExibicao?.periodo || ''}`, margemX, y);
    y += 6;
    doc.setFontSize(9);

    const desenharHeader = () => {
      let x = margemX;
      doc.setFont('helvetica', 'bold');
      headers.forEach((header, idx) => {
        doc.text(header, x, y);
        x += colunas[idx];
      });
      doc.setFont('helvetica', 'normal');
      y += 4;
      doc.line(margemX, y - 2, larguraPagina - margemX, y - 2);
      y += 2;
    };

    desenharHeader();

    linhas.forEach((linha) => {
      const isSubtotalRegional = String(linha.regional || '').startsWith('SUBTOTAL ');
      const isTotalGeral = String(linha.regional || '') === 'TOTAL GERAL';
      const isLinhaResumo = isSubtotalRegional || isTotalGeral;

      const valores = [
        linha.regional || '',
        linha.cargo || '',
        linha.colaborador || '',
        linha.tipo || '',
        formatMoedaContabil(linha.comissao),
        formatMoedaContabil(linha.dsr),
        formatMoedaContabil(linha.total)
      ];

      const linhasPorCelula = valores.map((valor, idx) => (
        doc.splitTextToSize(String(valor), Math.max(6, colunas[idx] - 2))
      ));
      const alturaLinha = Math.max(...linhasPorCelula.map((arr) => arr.length), 1) * 4;

      if (y + alturaLinha > limiteY) {
        doc.addPage();
        y = 10;
        desenharHeader();
      }

      const yTop = y - 2;
      const yBottom = y + alturaLinha - 1;

      // Grade leve tracejada para facilitar impressao.
      doc.setDrawColor(185, 185, 185);
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([0.8, 0.8], 0);
      let xGrade = margemX;
      doc.line(xGrade, yTop, xGrade, yBottom);
      colunas.forEach((larguraColuna) => {
        xGrade += larguraColuna;
        doc.line(xGrade, yTop, xGrade, yBottom);
      });
      doc.line(margemX, yBottom, larguraPagina - margemX, yBottom);
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', isLinhaResumo ? 'bold' : 'normal');
      let x = margemX;
      linhasPorCelula.forEach((linhasCelula, idx) => {
        linhasCelula.forEach((textoLinha, linhaIdx) => {
          doc.text(textoLinha, x, y + (linhaIdx * 4));
        });
        x += colunas[idx];
      });
      doc.setFont('helvetica', 'normal');
      y += alturaLinha;
    });

    doc.save(`relatorio_rh_${dadosRelatorioRHExibicao?.periodo || 'periodo'}.pdf`);
  };

  const liderancasFiltradas = (() => {
    if (!dadosLiderancas?.liderancas) return [];
    if (!filtroRegional) return dadosLiderancas.liderancas;
    return dadosLiderancas.liderancas.filter((item) => (
      item.tipoLideranca === 'GERENTE_MATRIZ' || item.regionalId === filtroRegional
    ));
  })();

  const rotuloMediaLideranca = filtroRegional
    ? 'Media da regional filtrada'
    : 'Media total das regionais';
  const totalVendedoresHeadcountExibido = Number(
    dadosVendedores?.qtdVendedoresHeadcount
    || dadosVendedores?.qtdVendedores
    || dadosVendedores?.vendedores?.length
    || 0
  );
  const totalVendedoresFteExibido = Number(dadosVendedores?.qtdVendedoresFte || 0);
  const obterResumoRegional = (regional) => {
    if (filtroRegional) {
      return {
        headcount: totalVendedoresHeadcountExibido || Number(regional?.totalVendedores || 0),
        fte: totalVendedoresFteExibido || 0
      };
    }

    const cobertura = (dadosVendedores?.coberturaRegional || []).find((item) =>
      item.regionalId === regional?.id || item.regionalNome === regional?.nome
    );

    return {
      headcount: Number(cobertura?.qtdVendedoresHeadcount ?? regional?.totalVendedores ?? 0),
      fte: Number(cobertura?.qtdVendedoresFte ?? 0)
    };
  };

  const mostrarRegionalNaTabelaVendedores = !filtroRegional;
  const colSpanResumoTotalVendedores = mostrarRegionalNaTabelaVendedores ? 29 : 28;

  const obterMetaDoTipo = (regionalId, tipoKey) => {
    if (!regionalId || !periodoSelecionado) return null;
    const regional = relatorioMetas.find((r) => r.id === regionalId);
    if (!regional) return null;
    const alvo = normalizarTexto(TIPO_LABEL_MAP[tipoKey] || tipoKey);
    return (regional.metas || []).find(
      (m) => m.periodo === periodoSelecionado && normalizarTexto(m.tipoMeta) === alvo
    ) || null;
  };

  const normalizarPercentualRegra = (valor) => {
    const numero = Number(valor || 0);
    return numero >= 1 ? numero / 100 : numero;
  };

  const calcularPercentualPorMeta = (valorAtingido, meta, inverterPolaridade = false, individual = false) => {
    if (!meta || Number(valorAtingido || 0) === 0) return 0;

    const volume1 = Number(individual ? meta.metaIndividual1 : meta.metaRegional1);
    const volume2 = Number(individual ? meta.metaIndividual2 : meta.metaRegional2);
    const volume3 = Number(individual ? meta.metaIndividual3 : meta.metaRegional3);
    const percent1 = normalizarPercentualRegra(individual ? meta.percentualIndividual1 : meta.percentual1);
    const percent2 = normalizarPercentualRegra(individual ? meta.percentualIndividual2 : meta.percentual2);
    const percent3 = normalizarPercentualRegra(individual ? meta.percentualIndividual3 : meta.percentual3);

    if ([volume1, volume2, volume3].some((v) => Number.isNaN(v))) return 0;
    const valor = Number(valorAtingido || 0);

    if (inverterPolaridade) {
      if (valor <= volume1) return percent1;
      if (valor <= volume2) return percent2;
      if (valor <= volume3) return percent3;
      return 0;
    }

    if (valor >= volume3) {
      if (valor >= volume2) {
        if (valor >= volume1) return percent1;
        return percent2;
      }
      return percent3;
    }
    return 0;
  };

  const obterPercentualResumoExibido = (tipoKey, valorRealizado, fallbackPercentual) => {
    if (!mostraTendenciaMes || !filtroRegional) return Number(fallbackPercentual || 0);
    const meta = obterMetaDoTipo(filtroRegional, tipoKey);
    if (!meta) return Number(fallbackPercentual || 0);
    return calcularPercentualPorMeta(
      valorConsiderado(valorRealizado),
      meta,
      tipoKey === 'churn',
      false
    );
  };

  const obterPercentualIndividualExibido = (vendedor, tipoKey, fallbackPercentual, quantidadeBase) => {
    if (!mostraTendenciaMes) return Number(fallbackPercentual || 0);
    const regionalId = vendedor.regionalId || filtroRegional;
    if (!regionalId) return Number(fallbackPercentual || 0);
    const meta = obterMetaDoTipo(regionalId, tipoKey);
    if (!meta) return Number(fallbackPercentual || 0);
    return calcularPercentualPorMeta(
      valorConsiderado(quantidadeBase),
      meta,
      false,
      true
    );
  };

  const TIPOS_COMISSAO_VENDEDOR = [
    'vendas',
    'mudancaTitularidade',
    'migracaoTecnologia',
    'renovacao',
    'planoEvento',
    'sva',
    'telefonia'
  ];

  const calcularComissaoTipoExibida = (vendedor, tipoKey) => {
    const bloco = vendedor?.[tipoKey];
    if (!bloco) return 0;
    // Valor oficial por tipo vem do backend (evita divergencia ao filtrar regional).
    return Number(bloco.comissao || 0);
  };

  const calcularTotalComissaoExibidaVendedor = (vendedor) => TIPOS_COMISSAO_VENDEDOR.reduce(
    (acc, tipoKey) => acc + calcularComissaoTipoExibida(vendedor, tipoKey),
    0
  );

  const totalComissaoVendedores = (dadosVendedores?.vendedores || []).reduce(
    (acc, vendedor) => acc + calcularTotalComissaoExibidaVendedor(vendedor),
    0
  );

  const vendedoresExibicao = dadosVendedores?.vendedores || [];
  const coberturaRegional = Array.isArray(dadosVendedores?.coberturaRegional)
    ? dadosVendedores.coberturaRegional
    : [];

  const obterRegionalIdVendedor = (vendedor) =>
    String(vendedor?.regionalId || vendedor?.regional_id || filtroRegional || '');
  const obterChaveVendedorRegional = (vendedorId, regionalId) =>
    `${String(vendedorId || '')}::${String(regionalId || '')}`;

  const somaComissaoProjetadaPorRegional = {};
  vendedoresExibicao.forEach((vendedor) => {
    const regionalKey = obterRegionalIdVendedor(vendedor);
    if (!regionalKey) return;
    somaComissaoProjetadaPorRegional[regionalKey] =
      (Number(somaComissaoProjetadaPorRegional[regionalKey]) || 0)
      + calcularTotalComissaoExibidaVendedor(vendedor);
  });

  const qtdBaseMediaPorRegional = {};
  coberturaRegional.forEach((item) => {
    const regionalKey = String(item?.regionalId || '');
    if (!regionalKey) return;
    const qtdFte = Number(item?.qtdVendedoresFte) || 0;
    if (qtdFte > 0) {
      qtdBaseMediaPorRegional[regionalKey] = qtdFte;
    }
  });

  if (filtroRegional && Number(totalVendedoresFteExibido) > 0) {
    qtdBaseMediaPorRegional[String(filtroRegional)] = Number(totalVendedoresFteExibido);
  }

  Object.keys(somaComissaoProjetadaPorRegional).forEach((regionalKey) => {
    if (Number(qtdBaseMediaPorRegional[regionalKey]) > 0) return;
    const qtdFallback = vendedoresExibicao.filter(
      (vendedor) => obterRegionalIdVendedor(vendedor) === regionalKey
    ).length;
    if (qtdFallback > 0) {
      qtdBaseMediaPorRegional[regionalKey] = qtdFallback;
    }
  });

  const mediaComissaoProjetadaPorRegional = {};
  Object.keys(somaComissaoProjetadaPorRegional).forEach((regionalKey) => {
    const soma = Number(somaComissaoProjetadaPorRegional[regionalKey]) || 0;
    const qtdBase = Number(qtdBaseMediaPorRegional[regionalKey]) || 0;
    mediaComissaoProjetadaPorRegional[regionalKey] = qtdBase > 0 ? (soma / qtdBase) : 0;
  });

  const mediasProjetadasValidas = Object.values(mediaComissaoProjetadaPorRegional)
    .map((valor) => Number(valor) || 0)
    .filter((valor) => valor > 0);

  const mediaComissaoRegionaisProjetada = mediasProjetadasValidas.length > 0
    ? mediasProjetadasValidas.reduce((acc, valor) => acc + valor, 0) / mediasProjetadasValidas.length
    : 0;

  const mediaRegionalFiltrada = filtroRegional
    ? dadosLiderancas?.mediasRegionais?.find((item) => item.regionalId === filtroRegional)
    : null;

  const obterBaseMediaMatrizExibida = () => {
    const baseGlobalOficial = Number(dadosLiderancas?.mediaComissaoRegionais);
    const baseFallback = Number.isFinite(baseGlobalOficial) && baseGlobalOficial > 0
      ? baseGlobalOficial
      : Number(dadosLiderancas?.liderancas?.find((item) => item.tipoLideranca === 'GERENTE_MATRIZ')?.baseMedia || 0);

    if (!mostraTendenciaMes) {
      return baseFallback;
    }
    return valorConsiderado(baseFallback);
  };

  const obterBaseMediaLiderancaExibida = (item) => {
    if (!mostraTendenciaMes) {
      return Number(item?.baseMedia) || 0;
    }

    if (item?.tipoLideranca === 'GERENTE_MATRIZ') {
      // Gerente Matriz sempre usa base global das regionais (nao depende do filtro regional).
      const baseMatriz = obterBaseMediaMatrizExibida();
      if (Number(baseMatriz) > 0) return Number(baseMatriz);
      return valorConsiderado(item?.baseMedia);
    }

    const regionalKey = String(item?.regionalId || '');
    const baseRegionalProjetada = Number(mediaComissaoProjetadaPorRegional[regionalKey]) || 0;
    if (baseRegionalProjetada > 0) return baseRegionalProjetada;
    return valorConsiderado(item?.baseMedia);
  };

  const obterComissaoLiderancaExibida = (item) =>
    obterBaseMediaLiderancaExibida(item) * (Number(item?.multiplicador) || 0);

  const mediaLiderancaExibida = (() => {
    if (!mostraTendenciaMes) {
      return filtroRegional
        ? (Number(mediaRegionalFiltrada?.mediaComissao) || 0)
        : (Number(dadosLiderancas?.mediaComissaoRegionais) || 0);
    }

    if (filtroRegional) {
      const baseRegionalProjetada = Number(mediaComissaoProjetadaPorRegional[String(filtroRegional)]) || 0;
      if (baseRegionalProjetada > 0) return baseRegionalProjetada;
      return valorConsiderado(mediaRegionalFiltrada?.mediaComissao);
    }

    if (Number(mediaComissaoRegionaisProjetada) > 0) return Number(mediaComissaoRegionaisProjetada);
    return valorConsiderado(dadosLiderancas?.mediaComissaoRegionais);
  })();

  const totalComissaoLiderancas = liderancasFiltradas.reduce(
    (acc, item) => acc + obterComissaoLiderancaExibida(item),
    0
  );

  const comissaoProjetadaVendedorPorChave = vendedoresExibicao.reduce((mapa, vendedor) => {
    const vendedorId = String(vendedor?.id || '');
    const regionalId = obterRegionalIdVendedor(vendedor);
    if (!vendedorId || !regionalId) return mapa;
    const chave = obterChaveVendedorRegional(vendedorId, regionalId);
    const acumuladoAtual = Number(mapa.get(chave) || 0);
    mapa.set(chave, acumuladoAtual + calcularTotalComissaoExibidaVendedor(vendedor));
    return mapa;
  }, new Map());

  const comissaoProjetadaLiderancaPorId = new Map(
    (dadosLiderancas?.liderancas || []).map((item) => [String(item.colaboradorId), obterComissaoLiderancaExibida(item)])
  );

  const dadosRelatorioRHExibicao = (() => {
    if (!dadosRelatorioRHExibicaoBase) return null;

    const dsrDivisor = Number(dadosRelatorioRHExibicaoBase.dsrDivisor) || 6;

    const agrupado = (dadosRelatorioRHExibicaoBase.agrupadoPorRegional || []).map((regional) => {
      const cargos = (regional.cargos || []).map((cargo) => {
        const linhas = (cargo.linhas || []).map((linha) => {
          const idKey = String(linha.colaboradorId ?? '');
          const regionalLinhaKey = String(linha.regionalId ?? '');
          const chaveVendedorRegional = obterChaveVendedorRegional(idKey, regionalLinhaKey);
          let comissao = Number(linha.comissao) || 0;

          if (mostraTendenciaMes) {
            if (linha.tipoColaborador === 'VENDEDOR' && comissaoProjetadaVendedorPorChave.has(chaveVendedorRegional)) {
              comissao = Number(comissaoProjetadaVendedorPorChave.get(chaveVendedorRegional)) || 0;
            } else if (linha.tipoColaborador === 'LIDERANCA' && comissaoProjetadaLiderancaPorId.has(idKey)) {
              comissao = Number(comissaoProjetadaLiderancaPorId.get(idKey)) || 0;
            } else {
              comissao = valorConsiderado(comissao);
            }
          }

          const dsr = comissao / dsrDivisor;

          return {
            ...linha,
            comissao,
            dsr,
            totalComDsr: comissao + dsr
          };
        });

        return { ...cargo, linhas };
      });

      const subtotalComissao = cargos.reduce(
        (acc, cargo) => acc + (cargo.linhas || []).reduce((soma, linha) => soma + (Number(linha.comissao) || 0), 0),
        0
      );
      const subtotalDsr = cargos.reduce(
        (acc, cargo) => acc + (cargo.linhas || []).reduce((soma, linha) => soma + (Number(linha.dsr) || 0), 0),
        0
      );

      return {
        ...regional,
        cargos,
        subtotalComissao,
        subtotalDsr,
        subtotalTotalComDsr: subtotalComissao + subtotalDsr
      };
    });

    const totalGeralComissao = agrupado.reduce((acc, regional) => acc + (Number(regional.subtotalComissao) || 0), 0);
    const totalGeralDsr = agrupado.reduce((acc, regional) => acc + (Number(regional.subtotalDsr) || 0), 0);

    return {
      ...dadosRelatorioRHExibicaoBase,
      agrupadoPorRegional: agrupado,
      totalGeralComissao,
      totalGeralDsr,
      totalGeralComDsr: totalGeralComissao + totalGeralDsr
    };
  })();

  const construirTabelaMetas = (regional) => {
    const metasDoRegional = filtrarMetasPorPeriodo(regional.metas);
    const resumoRegional = obterResumoRegional(regional);
    const baseMetaIndividualExibida = Number(metasDoRegional?.[0]?.baseMetaIndividual?.valor || resumoRegional.fte || 0);
    const mostraTendencia = isPeriodoMesVigente(periodoSelecionado);

    if (metasDoRegional.length === 0) {
      return (
        <div key={regional.id} className="dashboard-card">
          <h2 className="comissao-title">{regional.nome}</h2>
              <div className="comissao-resumo">
                <div>
                  <span className="comissao-label">Total de Vendedores</span>
                  <strong>{formatNumero(resumoRegional.headcount)}</strong>
                </div>
                <div>
                  <span className="comissao-label">Base Meta (FTE)</span>
                  <strong>{formatNumero(baseMetaIndividualExibida)}</strong>
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
            <p>Atenção: Nenhuma meta cadastrada para o período {periodoSelecionado}</p>
          </div>
        </div>
      );
    }

    const metasPorTipo = {};
    TIPOS_META.forEach(({ key }) => {
      metasPorTipo[key] = metasDoRegional.find((m) =>
        obterChaveTipo(m.tipoMeta) === key
      );
    });

    return (
      <div key={regional.id} className="dashboard-card">
        <h2 className="comissao-title">{regional.nome}</h2>
        <div className="comissao-resumo">
          <div>
            <span className="comissao-label">Total de Vendedores</span>
            <strong>{formatNumero(resumoRegional.headcount)}</strong>
          </div>
          <div>
            <span className="comissao-label">Base Meta (FTE)</span>
            <strong>{formatNumero(baseMetaIndividualExibida)}</strong>
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
              {mostraTendencia && <th colSpan="2" style={{ textAlign: 'center' }}>Tendência Mês</th>}
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
            {TIPOS_META.map(({ key, label }) => {
              const meta = metasPorTipo[key];
              if (!meta) {
                return (
                  <tr key={key}>
                    <td>{label.toUpperCase()}</td>
                    <td colSpan={mostraTendencia ? 14 : 12} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sem dados</td>
                  </tr>
                );
              }

              const tipoKey = key;
              const realizado = Number(indicadoresPorRegional?.[regional.id]?.[tipoKey] || 0);
              const tendencia = duPassado > 0 ? (realizado / duPassado) * duTotal : 0;
              const percMetaM1 = Number(meta.metaRegional1) > 0 ? (tendencia / Number(meta.metaRegional1)) * 100 : 0;

              return (
                <tr key={key}>
                  <td>{label.toUpperCase()}</td>
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
              {perfil.toUpperCase()}
            </p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>
            Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Relatório de Comissionamento</h1>
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
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label className="form-label">Perfil de Vendedor</label>
              <select
                className="form-select"
                value={filtroPerfilVendedor}
                onChange={(e) => {
                  const proximoFiltro = e.target.value;
                  setFiltroPerfilVendedor(proximoFiltro);
                  carregarVendedores(proximoFiltro);
                }}
              >
                {PERFIS_VENDEDOR.map((perfilOpcao) => (
                  <option key={perfilOpcao.value} value={perfilOpcao.value}>
                    {perfilOpcao.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 0, minWidth: 'auto', display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => { carregarComissionamento(); carregarVendedores(); carregarLiderancas(); carregarRelatorioRH(); }}>
                Atualizar
              </button>
            </div>
          </div>

          {avisoProjecaoMesVigente && (
            <div className="alert alert-warning">
              <strong>Atencao: mes vigente com projecao.</strong> Os valores desta aba estao em tendencia com base em
              {` ${duPassado}/${duTotal} `}dias uteis e podem gerar vies na leitura de comissionamento.
            </div>
          )}

          {!periodoSelecionado ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>Atenção: Selecione um período para visualizar o relatório</p>
            </div>
          ) : (
            <>
              <div className="dashboards">
                {(() => {
                  if (!filtroRegional) {
                    return (
                      <div className="empty-state" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                        <p>Selecione uma regional para visualizar metas e comissão detalhada.</p>
                      </div>
                    );
                  }
                  const regionalSelecionada = relatorioMetas.find((r) => r.id === filtroRegional);
                  if (!regionalSelecionada) {
                    return (
                      <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <p>Atenção: Regional não encontrada</p>
                      </div>
                    );
                  }
                  return construirTabelaMetas(regionalSelecionada);
                })()}
              </div>

              {erro ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <p>Atenção: Não foi possível carregar o comissionamento. Verifique a rota do backend.</p>
                </div>
              ) : carregandoComissao ? (
                <div className="loading" style={{ marginTop: '20px' }}>
                  <div className="spinner"></div>
                </div>
              ) : dadosComissao ? (
                <div className="comissao-card">
                  <h2 className="comissao-title">Resumo de Comissionamento</h2>
                  {(() => {
                    dadosComissao.vendas.percentualAtingidoExibido = obterPercentualResumoExibido('vendas', dadosComissao.vendas.realizado, dadosComissao.vendas.percentualAtingido);
                    dadosComissao.churn.percentualAtingidoExibido = obterPercentualResumoExibido('churn', dadosComissao.churn.realizado, dadosComissao.churn.percentualAtingido);
                    dadosComissao.mudancaTitularidade.percentualAtingidoExibido = obterPercentualResumoExibido('mudancaTitularidade', dadosComissao.mudancaTitularidade.realizado, dadosComissao.mudancaTitularidade.percentualAtingido);
                    dadosComissao.migracaoTecnologia.percentualAtingidoExibido = obterPercentualResumoExibido('migracaoTecnologia', dadosComissao.migracaoTecnologia.realizado, dadosComissao.migracaoTecnologia.percentualAtingido);
                    dadosComissao.renovacao.percentualAtingidoExibido = obterPercentualResumoExibido('renovacao', dadosComissao.renovacao.realizado, dadosComissao.renovacao.percentualAtingido);
                    dadosComissao.planoEvento.percentualAtingidoExibido = obterPercentualResumoExibido('planoEvento', dadosComissao.planoEvento.realizado, dadosComissao.planoEvento.percentualAtingido);
                    dadosComissao.sva.percentualAtingidoExibido = obterPercentualResumoExibido('sva', dadosComissao.sva.realizado, dadosComissao.sva.percentualAtingido);
                    dadosComissao.telefonia.percentualAtingidoExibido = obterPercentualResumoExibido('telefonia', dadosComissao.telefonia.realizado, dadosComissao.telefonia.percentualAtingido);
                    dadosComissao.vendas.percentualPonderadoExibido = dadosComissao.vendas.percentualAtingidoExibido * Number(dadosComissao.vendas.peso || 0);
                    dadosComissao.churn.percentualPonderadoExibido = dadosComissao.churn.percentualAtingidoExibido * Number(dadosComissao.churn.peso || 0);
                    dadosComissao.calculo.percentualFinalPonderadoExibido = dadosComissao.vendas.percentualPonderadoExibido + dadosComissao.churn.percentualPonderadoExibido;
                    return null;
                  })()}
                  <div className="comissao-resumo">
                    <div>
                      <span className="comissao-label">Vendedores (headcount)</span>
                      <strong>{formatNumero(totalVendedoresHeadcountExibido || dadosComissao.qtdVendedores)}</strong>
                    </div>
                    <div>
                      <span className="comissao-label">Vendedores (FTE)</span>
                      <strong>{formatNumero(totalVendedoresFteExibido)}</strong>
                    </div>
                    <div>
                      <span className="comissao-label">Incremento sobre Meta Global</span>
                      <strong>{formatPercentual(dadosComissao.incrementoGlobal)}</strong>
                    </div>
                    <div>
                      <span className="comissao-label">Soma dos Percentuais Ponderados</span>
                      <strong>{formatPercentual(mostraTendenciaMes ? dadosComissao.calculo.percentualFinalPonderadoExibido : dadosComissao.calculo.percentualFinalPonderado)}</strong>
                    </div>
                    {mostraTendenciaMes && (
                      <div>
                        <span className="comissao-label">Dias úteis (passado/mês)</span>
                        <strong>{duPassado}/{duTotal}</strong>
                      </div>
                    )}
                  </div>
                  <table className="comissao-table">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>{mostraTendenciaMes ? 'Tendência' : 'Realizado'}</th>
                        <th>% Atingido</th>
                        <th>Peso</th>
                        <th>% Ponderado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>VENDAS</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.vendas.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.vendas.percentualAtingidoExibido : dadosComissao.vendas.percentualAtingido)}</td>
                        <td>{formatPercentual(dadosComissao.vendas.peso)}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.vendas.percentualPonderadoExibido : dadosComissao.vendas.percentualPonderado)}</td>
                      </tr>
                      <tr>
                        <td>CHURN</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.churn.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.churn.percentualAtingidoExibido : dadosComissao.churn.percentualAtingido)}</td>
                        <td>{formatPercentual(dadosComissao.churn.peso)}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.churn.percentualPonderadoExibido : dadosComissao.churn.percentualPonderado)}</td>
                      </tr>
                      <tr>
                        <td>MUDANÇA DE TITULARIDADE</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.mudancaTitularidade.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.mudancaTitularidade.percentualAtingidoExibido : dadosComissao.mudancaTitularidade.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>MIGRAÇÃO DE TECNOLOGIA</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.migracaoTecnologia.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.migracaoTecnologia.percentualAtingidoExibido : dadosComissao.migracaoTecnologia.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>RENOVAÇÃO</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.renovacao.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.renovacao.percentualAtingidoExibido : dadosComissao.renovacao.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>PLANO EVENTO</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.planoEvento.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.planoEvento.percentualAtingidoExibido : dadosComissao.planoEvento.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>SVA</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.sva.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.sva.percentualAtingidoExibido : dadosComissao.sva.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>TELEFONIA</td>
                        <td>{formatNumero(valorConsiderado(dadosComissao.telefonia.realizado))}</td>
                        <td>{formatPercentual(mostraTendenciaMes ? dadosComissao.telefonia.percentualAtingidoExibido : dadosComissao.telefonia.percentualAtingido)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <p>Atenção: Nenhum dado de comissionamento encontrado para o filtro selecionado</p>
                </div>
              )}

              {/* Seção de Comissionamento por Vendedor */}
              {periodoSelecionado && (
                <div className="comissao-card comissao-card--vendedores" style={{ marginTop: '20px' }}>
                  <h2 className="comissao-title comissao-title--vendedores">Comissionamento por Vendedor</h2>
                  {carregandoVendedores ? (
                    <div className="loading" style={{ padding: '40px' }}>
                      <div className="spinner"></div>
                    </div>
                  ) : dadosVendedores && dadosVendedores.vendedores && dadosVendedores.vendedores.length > 0 ? (
                    <>
                      <div className="comissao-resumo" style={{ marginBottom: '12px' }}>
                        <div>
                          <span className="comissao-label">Total de vendedores (headcount)</span>
                          <strong>{formatNumero(totalVendedoresHeadcountExibido)}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Total de vendedores (FTE)</span>
                          <strong>{formatNumero(totalVendedoresFteExibido)}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Total de comissão (vendedores)</span>
                          <strong>R$ {formatNumero(totalComissaoVendedores)}</strong>
                        </div>
                      </div>
                      {!filtroRegional && Array.isArray(dadosVendedores.coberturaRegional) && (
                        <div className="comissao-table-scroll" style={{ marginBottom: '12px' }}>
                          <table className="comissao-table">
                            <thead>
                              <tr>
                                <th>Regional</th>
                                <th>Headcount</th>
                                <th>FTE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dadosVendedores.coberturaRegional.map((item) => (
                                <tr key={item.regionalId || item.regionalNome}>
                                  <td>{item.regionalNome}</td>
                                  <td>{formatNumero(item.qtdVendedoresHeadcount)}</td>
                                  <td>{formatNumero(item.qtdVendedoresFte)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="comissao-table-scroll">
                        <table className="comissao-table comissao-table--vendedores">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: '600' }}>
                            {mostrarRegionalNaTabelaVendedores && (
                              <th style={{ textAlign: 'left', padding: '12px' }}>Regional</th>
                            )}
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
                            {mostrarRegionalNaTabelaVendedores && <th></th>}
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
                              {mostrarRegionalNaTabelaVendedores && <td>{vendedor.regionalNome || '-'}</td>}
                              <td><strong>{vendedor.nome}</strong></td>
                              <td>
                                R$ {formatNumero(calcularTotalComissaoExibidaVendedor(vendedor))}
                              </td>
                              <td>{formatNumero(valorConsiderado(vendedor.vendas.quantidade))}</td>
                              <td>R$ {formatNumero(valorConsiderado(vendedor.vendas.valorTotal))}</td>
                              <td>{formatPercentual(obterPercentualIndividualExibido(vendedor, 'vendas', vendedor.vendas.percentualAlcancado, vendedor.vendas.quantidade))}</td>
                              <td>R$ {formatNumero(calcularComissaoTipoExibida(vendedor, 'vendas'))}</td>
                              <td>{formatNumero(valorConsiderado(vendedor.mudancaTitularidade.quantidade))}</td>
                              <td>R$ {formatNumero(valorConsiderado(vendedor.mudancaTitularidade.valorTotal))}</td>
                              <td>{formatPercentual(obterPercentualIndividualExibido(vendedor, 'mudancaTitularidade', vendedor.mudancaTitularidade.percentualAlcancado, vendedor.mudancaTitularidade.quantidade))}</td>
                              <td>R$ {formatNumero(calcularComissaoTipoExibida(vendedor, 'mudancaTitularidade'))}</td>
                              <td>{formatNumero(valorConsiderado(vendedor.migracaoTecnologia.quantidade))}</td>
                              <td>R$ {formatNumero(valorConsiderado(vendedor.migracaoTecnologia.valorTotal))}</td>
                              <td>{formatPercentual(obterPercentualIndividualExibido(vendedor, 'migracaoTecnologia', vendedor.migracaoTecnologia.percentualAlcancado, vendedor.migracaoTecnologia.quantidade))}</td>
                              <td>R$ {formatNumero(calcularComissaoTipoExibida(vendedor, 'migracaoTecnologia'))}</td>
                              <td>{formatNumero(valorConsiderado(vendedor.renovacao.quantidade))}</td>
                              <td>R$ {formatNumero(valorConsiderado(vendedor.renovacao.valorTotal))}</td>
                              <td>{formatPercentual(obterPercentualIndividualExibido(vendedor, 'renovacao', vendedor.renovacao.percentualAlcancado, vendedor.renovacao.quantidade))}</td>
                              <td>R$ {formatNumero(calcularComissaoTipoExibida(vendedor, 'renovacao'))}</td>
                              <td>{formatNumero(valorConsiderado(vendedor.planoEvento.quantidade))}</td>
                              <td>R$ {formatNumero(valorConsiderado(vendedor.planoEvento.valorTotal))}</td>
                              <td>{formatPercentual(obterPercentualIndividualExibido(vendedor, 'planoEvento', vendedor.planoEvento.percentualAlcancado, vendedor.planoEvento.quantidade))}</td>
                              <td>R$ {formatNumero(calcularComissaoTipoExibida(vendedor, 'planoEvento'))}</td>
                              <td>{formatNumero(valorConsiderado(vendedor.sva.quantidade))}</td>
                              <td>R$ {formatNumero(valorConsiderado(vendedor.sva.valorTotal))}</td>
                              <td>{formatPercentual(obterPercentualIndividualExibido(vendedor, 'sva', vendedor.sva.percentualAlcancado, vendedor.sva.quantidade))}</td>
                              <td>R$ {formatNumero(calcularComissaoTipoExibida(vendedor, 'sva'))}</td>
                              <td>{formatNumero(valorConsiderado(vendedor.telefonia.quantidade))}</td>
                              <td>R$ {formatNumero(valorConsiderado(vendedor.telefonia.valorTotal))}</td>
                              <td>{formatPercentual(obterPercentualIndividualExibido(vendedor, 'telefonia', vendedor.telefonia.percentualAlcancado, vendedor.telefonia.quantidade))}</td>
                              <td>R$ {formatNumero(calcularComissaoTipoExibida(vendedor, 'telefonia'))}</td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 700 }}>
                            {mostrarRegionalNaTabelaVendedores && <td></td>}
                            <td>TOTAL GERAL</td>
                            <td>R$ {formatNumero(totalComissaoVendedores)}</td>
                            <td colSpan={colSpanResumoTotalVendedores} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                              Somatório de comissão de todos os vendedores listados.
                            </td>
                          </tr>
                        </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <p>Atenção: Nenhum vendedor encontrado para o filtro selecionado</p>
                    </div>
                  )}
                </div>
              )}

              {periodoSelecionado && (
                <div className="comissao-card" style={{ marginTop: '20px' }}>
                  <h2 className="comissao-title">Comissão de Lideranças</h2>
                  {carregandoLiderancas ? (
                    <div className="loading" style={{ padding: '30px' }}>
                      <div className="spinner"></div>
                    </div>
                  ) : !dadosLiderancas ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      <p>Sem dados de lideranças para o período selecionado.</p>
                    </div>
                  ) : (
                    <>
                      <div className="comissao-resumo">
                        <div>
                          <span className="comissao-label">{rotuloMediaLideranca}</span>
                          <strong>R$ {formatNumero(mediaLiderancaExibida)}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Gerente Regional</span>
                          <strong>{dadosLiderancas.regras?.GERENTE_REGIONAL || 0}x</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Supervisor Comercial</span>
                          <strong>{dadosLiderancas.regras?.SUPERVISOR_COMERCIAL || dadosLiderancas.regras?.SUPERVISOR_REGIONAL || 0}x</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Gerente da Matriz</span>
                          <strong>{dadosLiderancas.regras?.GERENTE_MATRIZ || 0}x</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Total de comissão (lideranças)</span>
                          <strong>R$ {formatNumero(totalComissaoLiderancas)}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Total de lideranças</span>
                          <strong>{liderancasFiltradas.length}</strong>
                        </div>
                      </div>

                      <table className="comissao-table">
                        <thead>
                          <tr>
                            <th>Colaborador</th>
                            <th>Função</th>
                            <th>Regional</th>
                            <th>Base (media)</th>
                            <th>Multiplicador</th>
                            <th>Comissão</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liderancasFiltradas.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                Nenhuma liderança encontrada para este filtro.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {liderancasFiltradas.map((item) => (
                                <tr key={item.colaboradorId}>
                                  <td>{item.nome}</td>
                                  <td>{item.funcaoNome}</td>
                                  <td>{item.regionalNome || 'Matriz'}</td>
                                  <td>R$ {formatNumero(obterBaseMediaLiderancaExibida(item))}</td>
                                  <td>{item.multiplicador}x</td>
                                  <td><strong>R$ {formatNumero(obterComissaoLiderancaExibida(item))}</strong></td>
                                </tr>
                              ))}
                              <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 700 }}>
                                <td colSpan="5">TOTAL GERAL</td>
                                <td><strong>R$ {formatNumero(totalComissaoLiderancas)}</strong></td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}

              {periodoSelecionado && (
                <div className="comissao-card" style={{ marginTop: '20px' }}>
                  <h2 className="comissao-title">Relatório Oficial RH (Comissão + DSR)</h2>
                  {carregandoRelatorioRH ? (
                    <div className="loading" style={{ padding: '30px' }}>
                      <div className="spinner"></div>
                    </div>
                  ) : !dadosRelatorioRHExibicao ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      <p>Sem dados para gerar o relatório oficial no período selecionado.</p>
                    </div>
                  ) : (
                    <>
                      <div className="comissao-resumo">
                        <div>
                          <span className="comissao-label">Período</span>
                          <strong>{dadosRelatorioRHExibicao.periodo}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Colaboradores</span>
                          <strong>{dadosRelatorioRHExibicao.totalColaboradores || 0}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Vendedores</span>
                          <strong>{dadosRelatorioRHExibicao.totalVendedores || 0}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Vendedores (FTE)</span>
                          <strong>{formatNumero(totalVendedoresFteExibido)}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Lideranças</span>
                          <strong>{dadosRelatorioRHExibicao.totalLiderancas || 0}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Total Comissão (Vendedores + Lideranças)</span>
                          <strong>R$ {formatNumero(dadosRelatorioRHExibicao.totalGeralComissao)}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Total DSR (1/{dadosRelatorioRHExibicao.dsrDivisor || 6})</span>
                          <strong>R$ {formatNumero(dadosRelatorioRHExibicao.totalGeralDsr)}</strong>
                        </div>
                        <div>
                          <span className="comissao-label">Total Geral (Comissão + DSR)</span>
                          <strong>R$ {formatNumero(dadosRelatorioRHExibicao.totalGeralComDsr)}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={baixarExcelRelatorioRH}>
                          Baixar Excel
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={baixarCsvRelatorioRH}>
                          Baixar CSV
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={baixarPdfRelatorioRH}>
                          Baixar PDF
                        </button>
                      </div>

                      <div className="comissao-table-scroll">
                        <table className="comissao-table">
                          <thead>
                            <tr>
                              <th>Regional</th>
                              <th>Cargo</th>
                              <th>Colaborador</th>
                              <th>Tipo</th>
                              <th>Comissão</th>
                              <th>DSR</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(dadosRelatorioRHExibicao.agrupadoPorRegional || []).length === 0 ? (
                              <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                  Nenhum colaborador com comissão para os filtros selecionados.
                                </td>
                              </tr>
                            ) : (
                              <>
                                {(dadosRelatorioRHExibicao.agrupadoPorRegional || []).map((regional) => (
                                  <React.Fragment key={regional.regionalId || regional.regionalNome}>
                                    {(regional.cargos || []).map((cargo) => (
                                      <React.Fragment key={`${regional.regionalNome}-${cargo.cargo}`}>
                                        {(cargo.linhas || []).map((linha) => (
                                          <tr key={`${linha.colaboradorId}-${linha.tipoColaborador}`}>
                                            <td>{regional.regionalNome}</td>
                                            <td>{cargo.cargo}</td>
                                            <td>{linha.nome}</td>
                                            <td>{linha.tipoColaborador}</td>
                                            <td>R$ {formatNumero(linha.comissao)}</td>
                                            <td>R$ {formatNumero(linha.dsr)}</td>
                                            <td><strong>R$ {formatNumero(linha.totalComDsr)}</strong></td>
                                          </tr>
                                        ))}
                                      </React.Fragment>
                                    ))}
                                    <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 700 }}>
                                      <td colSpan="4">SUBTOTAL {regional.regionalNome}</td>
                                      <td>R$ {formatNumero(regional.subtotalComissao)}</td>
                                      <td>R$ {formatNumero(regional.subtotalDsr)}</td>
                                      <td><strong>R$ {formatNumero(regional.subtotalTotalComDsr)}</strong></td>
                                    </tr>
                                  </React.Fragment>
                                ))}
                                <tr style={{ backgroundColor: '#e9ecef', fontWeight: 700 }}>
                                  <td colSpan="4">TOTAL GERAL</td>
                                  <td>R$ {formatNumero(dadosRelatorioRHExibicao.totalGeralComissao)}</td>
                                  <td>R$ {formatNumero(dadosRelatorioRHExibicao.totalGeralDsr)}</td>
                                  <td><strong>R$ {formatNumero(dadosRelatorioRHExibicao.totalGeralComDsr)}</strong></td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
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



