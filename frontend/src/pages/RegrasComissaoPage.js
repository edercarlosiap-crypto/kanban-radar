import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colaboradoresAPI, regrasComissaoAPI, regionaisAPI, tiposMetaAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import * as XLSX from 'xlsx';

export default function RegrasComissaoPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || usuario.role || 'leitura';
  const isAdmin = perfil === 'admin';

  const [regras, setRegras] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [tiposMeta, setTiposMeta] = useState([]);
  const [colaboradoresPorRegional, setColaboradoresPorRegional] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [modoLote, setModoLote] = useState(false);
  const [textoLote, setTextoLote] = useState('');
  const [periodosDetectadosLote, setPeriodosDetectadosLote] = useState([]);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [sortField, setSortField] = useState('dataCriacao');
  const [sortDirection, setSortDirection] = useState('desc');
  const [formData, setFormData] = useState({
    regionalId: '',
    tipoMeta: '',
    periodo: '',
    meta1Volume: '',
    meta1Percent: '',
    meta1PercentIndividual: '',
    meta2Volume: '',
    meta2Percent: '',
    meta2PercentIndividual: '',
    meta3Volume: '',
    meta3Percent: '',
    meta3PercentIndividual: '',
    incrementoGlobal: 0,
    pesoVendasChurn: 0.5
  });
  const [parametrosLideranca, setParametrosLideranca] = useState({
    periodo: '',
    gerenteRegionalMultiplier: 1.2,
    supervisorRegionalMultiplier: 1.0,
    gerenteMatrizMultiplier: 2.4
  });
  const [periodosConhecidos, setPeriodosConhecidos] = useState([]);
  const [salvandoLideranca, setSalvandoLideranca] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    const periodo = (parametrosLideranca.periodo || '').trim();
    if (!periodo) return;
    carregarRegraLideranca(periodo);
  }, [parametrosLideranca.periodo]);

  const splitLinhaLote = (linha) => {
    if (!linha) return [];
    if (linha.includes('|')) return linha.split('|').map((p) => p.trim());
    if (linha.includes('\t')) return linha.split('\t').map((p) => p.trim());
    if (/\s{2,}/.test(linha)) return linha.split(/\s{2,}/).map((p) => p.trim());
    return linha.split(';').map((p) => p.trim());
  };

  const excelToPeriodoUTC = (excelDate) => {
    const epochUTC = Date.UTC(1899, 11, 30);
    const date = new Date(epochUTC + Number(excelDate) * 24 * 60 * 60 * 1000);
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[date.getUTCMonth()]}/${String(date.getUTCFullYear()).slice(-2)}`;
  };

  const parsePeriodoLote = (valor) => {
    const valorStr = String(valor || '').trim();
    if (!valorStr) return '';

    const meses = {
      jan: 'Jan', janeiro: 'Jan',
      fev: 'Fev', fevereiro: 'Fev',
      mar: 'Mar', marco: 'Mar', março: 'Mar',
      abr: 'Abr', abril: 'Abr',
      mai: 'Mai', maio: 'Mai',
      jun: 'Jun', junho: 'Jun',
      jul: 'Jul', julho: 'Jul',
      ago: 'Ago', agosto: 'Ago',
      set: 'Set', setembro: 'Set',
      out: 'Out', outubro: 'Out',
      nov: 'Nov', novembro: 'Nov',
      dez: 'Dez', dezembro: 'Dez'
    };

    const normalizarMes = (txt) =>
      String(txt || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const valorNum = parseFloat(valorStr);
    if (!Number.isNaN(valorNum) && valorNum > 0 && valorNum < 70000 && !valorStr.includes('/') && !valorStr.includes(',') && !valorStr.includes('.')) {
      return excelToPeriodoUTC(valorNum);
    }

    const ddmmyyyy = valorStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (ddmmyyyy) {
      const mesNum = Number(ddmmyyyy[2]);
      const anoNum = Number(ddmmyyyy[3]);
      if (mesNum >= 1 && mesNum <= 12) {
        const lista = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${lista[mesNum - 1]}/${String(anoNum).slice(-2)}`;
      }
    }

    const mmyyyy = valorStr.match(/^(\d{1,2})\/(\d{2,4})$/);
    if (mmyyyy) {
      const mesNum = Number(mmyyyy[1]);
      const anoNum = Number(mmyyyy[2]);
      if (mesNum >= 1 && mesNum <= 12) {
        const lista = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${lista[mesNum - 1]}/${String(anoNum).slice(-2)}`;
      }
    }

    const yyyymm = valorStr.match(/^(\d{4})-(\d{1,2})$/);
    if (yyyymm) {
      const anoNum = Number(yyyymm[1]);
      const mesNum = Number(yyyymm[2]);
      if (mesNum >= 1 && mesNum <= 12) {
        const lista = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${lista[mesNum - 1]}/${String(anoNum).slice(-2)}`;
      }
    }

    const mesAno = valorStr.match(/^([A-Za-zÀ-ÿ]{3,12})\/(\d{2,4})$/);
    if (mesAno) {
      const mes = meses[normalizarMes(mesAno[1])];
      if (mes) return `${mes}/${String(mesAno[2]).slice(-2)}`;
    }

    return '';
  };

  const atualizarPeriodosDetectados = (texto) => {
    const linhas = String(texto || '').split('\n').filter((l) => l.trim());
    const detectados = new Set();
    linhas.forEach((linha) => {
      const partes = splitLinhaLote(linha);
      if (!partes.length) return;
      const p1 = parsePeriodoLote(partes[1]);
      const p2 = parsePeriodoLote(partes[2]);
      if (p1) detectados.add(p1);
      if (p2) detectados.add(p2);
    });
    const lista = Array.from(detectados).sort((a, b) => {
      const [ma, aa] = a.split('/');
      const [mb, ab] = b.split('/');
      const mapa = { Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5, Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11 };
      const va = Number(`20${aa}`) * 100 + (mapa[ma] ?? 0);
      const vb = Number(`20${ab}`) * 100 + (mapa[mb] ?? 0);
      return va - vb;
    });
    setPeriodosDetectadosLote(lista);
  };

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [regrasResp, regionaisResp, colaboradoresResp, tiposMetaResp] = await Promise.all([
        regrasComissaoAPI.listar(),
        regionaisAPI.listar(),
        colaboradoresAPI.listar(),
        tiposMetaAPI.listar()
      ]);
      setRegras(regrasResp.data.regras || []);
      const periodos = Array.from(
        new Set((regrasResp.data.regras || []).map((r) => String(r.periodo || '').trim()).filter(Boolean))
      ).sort();
      setPeriodosConhecidos(periodos);
      setParametrosLideranca((atual) => ({
        ...atual,
        periodo: atual.periodo || periodos[periodos.length - 1] || 'Dez/25'
      }));
      setRegionais(regionaisResp.data.regionais || []);
      setTiposMeta(tiposMetaResp.data?.tiposMeta || []);

      const colaboradores = colaboradoresResp.data.colaboradores || [];
      const contagemPorRegional = colaboradores.reduce((acc, colaborador) => {
        const regionalId = colaborador.regional_id || colaborador.regionalId;
        if (!regionalId) return acc;
        acc[regionalId] = (acc[regionalId] || 0) + 1;
        return acc;
      }, {});
      setColaboradoresPorRegional(contagemPorRegional);
    } catch (error) {
      setErro('Erro ao carregar dados');
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!formData.regionalId) {
      setErro('Selecione uma regional');
      return;
    }

    try {
      await regrasComissaoAPI.criar(formData);
      setFormData({
        regionalId: '',
        tipoMeta: '',
        periodo: '',
        meta1Volume: '',
        meta1Percent: '',
        meta1PercentIndividual: '',
        meta2Volume: '',
        meta2Percent: '',
        meta2PercentIndividual: '',
        meta3Volume: '',
        meta3Percent: '',
        meta3PercentIndividual: '',
        incrementoGlobal: 0,
        pesoVendasChurn: 0.5
      });
      setFormAberto(false);
      carregarDados();
    } catch (error) {
      setErro('Erro ao criar regra');
    }
  };

  const handleCriarLote = async () => {
    const normalizarTexto = (valor) => String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
      .trim();

    const splitLinha = (linha) => {
      if (!linha) return [];
      if (linha.includes('|')) return linha.split('|').map((p) => p.trim());
      if (linha.includes('\t')) return linha.split('\t').map((p) => p.trim());
      if (/\s{2,}/.test(linha)) return linha.split(/\s{2,}/).map((p) => p.trim());
      return linha.split(';').map((p) => p.trim());
    };

    const ehCabecalho = (partes) => {
      const c0 = normalizarTexto(partes[0]);
      const c1 = normalizarTexto(partes[1]);
      const c2 = normalizarTexto(partes[2]);
      return c0 === 'regional' && (c1 === 'periodo' || c1 === 'tipometa') && (c2 === 'tipometa' || c2 === 'periodo');
    };

    const excelToDate = (excelDate) => {
      const epochUTC = Date.UTC(1899, 11, 30);
      const date = new Date(epochUTC + Number(excelDate) * 24 * 60 * 60 * 1000);
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mes = meses[date.getUTCMonth()];
      const ano = String(date.getUTCFullYear()).slice(-2);
      return mes + '/' + ano;
    };

    const parsePeriodo = (valor) => {
      const valorStr = String(valor || '').trim();
      if (!valorStr) return '';

      const meses = {
        jan: 'Jan', janeiro: 'Jan',
        fev: 'Fev', fevereiro: 'Fev',
        mar: 'Mar', marco: 'Mar', março: 'Mar',
        abr: 'Abr', abril: 'Abr',
        mai: 'Mai', maio: 'Mai',
        jun: 'Jun', junho: 'Jun',
        jul: 'Jul', julho: 'Jul',
        ago: 'Ago', agosto: 'Ago',
        set: 'Set', setembro: 'Set',
        out: 'Out', outubro: 'Out',
        nov: 'Nov', novembro: 'Nov',
        dez: 'Dez', dezembro: 'Dez'
      };

      const normalizarMes = (txt) =>
        String(txt || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

      const valorNum = parseFloat(valorStr);
      if (!isNaN(valorNum) && valorNum > 0 && valorNum < 70000 && !valorStr.includes('/') && !valorStr.includes(',') && !valorStr.includes('.')) {
        try {
          return excelToDate(valorNum);
        } catch {
          return '';
        }
      }

      const ddmmyyyy = valorStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (ddmmyyyy) {
        const mesNum = Number(ddmmyyyy[2]);
        const anoNum = Number(ddmmyyyy[3]);
        if (mesNum >= 1 && mesNum <= 12) {
          const lista = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          return `${lista[mesNum - 1]}/${String(anoNum).slice(-2)}`;
        }
      }

      const mmyyyy = valorStr.match(/^(\d{1,2})\/(\d{2,4})$/);
      if (mmyyyy) {
        const mesNum = Number(mmyyyy[1]);
        const anoNum = Number(mmyyyy[2]);
        if (mesNum >= 1 && mesNum <= 12) {
          const lista = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          return `${lista[mesNum - 1]}/${String(anoNum).slice(-2)}`;
        }
      }

      const yyyymm = valorStr.match(/^(\d{4})-(\d{1,2})$/);
      if (yyyymm) {
        const anoNum = Number(yyyymm[1]);
        const mesNum = Number(yyyymm[2]);
        if (mesNum >= 1 && mesNum <= 12) {
          const lista = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          return `${lista[mesNum - 1]}/${String(anoNum).slice(-2)}`;
        }
      }

      const mesAno = valorStr.match(/^([A-Za-zÀ-ÿ]{3,12})\/(\d{2,4})$/);
      if (mesAno) {
        const mes = meses[normalizarMes(mesAno[1])];
        if (mes) return `${mes}/${String(mesAno[2]).slice(-2)}`;
      }

      return '';
    };

    const parseNumero = (valor) => {
      if (!valor) return 0;
      const valorStr = String(valor).trim();
      if (valorStr.includes('%')) {
        const numStr = valorStr.replace('%', '').replace(',', '.');
        return parseFloat(numStr) / 100 || 0;
      }
      const valorNormalizado = valorStr.replace(',', '.');
      return parseFloat(valorNormalizado) || 0;
    };

    const parecePeriodo = (valor) => {
      const texto = String(valor || '').trim();
      if (!texto) return false;
      if (/^[A-Za-z]{3,12}\/\d{2,4}$/i.test(texto)) return true;
      if (/^\d{1,2}\/\d{2,4}$/.test(texto)) return true;
      if (/^\d{4}-\d{1,2}$/.test(texto)) return true;
      return false;
    };

    const linhas = textoLote.split('\n').filter((l) => l.trim());
    let sucesso = 0;
    let falhas = 0;

    for (const linha of linhas) {
      const partes = splitLinha(linha);
      if (!partes.length || ehCabecalho(partes)) continue;

      if (partes.length < 9) {
        falhas++;
        continue;
      }

      const nomeRegional = partes[0];
      const regional = regionais.find((r) => normalizarTexto(r.nome) === normalizarTexto(nomeRegional));
      if (!regional) {
        falhas++;
        continue;
      }

      const formatoRegionalPeriodoTipo = parecePeriodo(partes[1]) && !parecePeriodo(partes[2]);
      const tipoMeta = formatoRegionalPeriodoTipo ? partes[2] : partes[1];
      const periodo = parsePeriodo(formatoRegionalPeriodoTipo ? partes[1] : partes[2]);

      if (!periodo) {
        falhas++;
        continue;
      }

      const dados = {
        regionalId: regional.id,
        tipoMeta,
        periodo,
        meta1Volume: parseNumero(partes[3]),
        meta1Percent: parseNumero(partes[4]),
        meta2Volume: parseNumero(partes[5]),
        meta2Percent: parseNumero(partes[6]),
        meta3Volume: parseNumero(partes[7]),
        meta3Percent: parseNumero(partes[8]),
        meta1PercentIndividual: parseNumero(partes[9]),
        meta2PercentIndividual: parseNumero(partes[10]),
        meta3PercentIndividual: parseNumero(partes[11]),
        incrementoGlobal: parseNumero(partes[12]) || 0,
        pesoVendasChurn: parseNumero(partes[13]) || 0.5
      };

      try {
        await regrasComissaoAPI.criar(dados);
        sucesso++;
      } catch {
        falhas++;
      }
    }

    alert('Importacao finalizada: ' + sucesso + ' sucesso(s), ' + falhas + ' falha(s).');
    setTextoLote('');
    setPeriodosDetectadosLote([]);
    setArquivoSelecionado(null);
    setModoLote(false);
    carregarDados();
  };

  const carregarRegraLideranca = async (periodo) => {
    try {
      const resp = await regrasComissaoAPI.obterRegraLideranca(periodo);
      const regra = resp.data?.regra || {};
      setParametrosLideranca((atual) => ({
        ...atual,
        periodo,
        gerenteRegionalMultiplier: regra.gerenteRegionalMultiplier ?? 1.2,
        supervisorRegionalMultiplier: regra.supervisorRegionalMultiplier ?? 1.0,
        gerenteMatrizMultiplier: regra.gerenteMatrizMultiplier ?? 2.4
      }));
    } catch (error) {
      console.error('Erro ao carregar parametros de lideranca:', error);
    }
  };

  const handleSalvarParametrosLideranca = async () => {
    const periodo = String(parametrosLideranca.periodo || '').trim();
    if (!periodo) {
      setErro('Informe o periodo para os parametros de lideranca');
      return;
    }

    try {
      setSalvandoLideranca(true);
      await regrasComissaoAPI.salvarRegraLideranca({
        periodo,
        gerenteRegionalMultiplier: Number(parametrosLideranca.gerenteRegionalMultiplier),
        supervisorRegionalMultiplier: Number(parametrosLideranca.supervisorRegionalMultiplier),
        gerenteMatrizMultiplier: Number(parametrosLideranca.gerenteMatrizMultiplier)
      });
      alert('Parametros de comissao da lideranca salvos com sucesso.');
      setErro('');
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao salvar parametros de lideranca');
    } finally {
      setSalvandoLideranca(false);
    }
  };
  const handleArquivoSelecionado = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    setArquivoSelecionado(arquivo);
    const nomeArquivo = arquivo.name.toLowerCase();

    try {
      if (nomeArquivo.endsWith('.xlsx') || nomeArquivo.endsWith('.xls')) {
        // Processar arquivo Excel
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const primeiraAba = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[primeiraAba];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Converter linhas do Excel para texto no formato esperado
            const linhasTexto = jsonData
              .filter(linha => linha.length > 0 && linha[0]) // Remove linhas vazias
              .map(linha => linha.join(' | ')) // Junta colunas com pipe
              .join('\n');
            
            setTextoLote(linhasTexto);
            atualizarPeriodosDetectados(linhasTexto);
          } catch (error) {
            alert('❌ Erro ao processar arquivo Excel: ' + error.message);
          }
        };
        reader.readAsArrayBuffer(arquivo);
      } else if (nomeArquivo.endsWith('.csv') || nomeArquivo.endsWith('.txt')) {
        // Processar arquivo CSV/TXT
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            let texto = event.target.result;
            // Se for CSV com vírgula, converte para pipe
            if (nomeArquivo.endsWith('.csv') && !texto.includes('|')) {
              texto = texto.split('\n')
                .map(linha => linha.split(',').map(c => c.trim()).join(' | '))
                .join('\n');
            }
            setTextoLote(texto);
            atualizarPeriodosDetectados(texto);
          } catch (error) {
            alert('❌ Erro ao processar arquivo: ' + error.message);
          }
        };
        reader.readAsText(arquivo);
      } else {
        alert('❌ Formato de arquivo não suportado. Use .xlsx, .csv ou .txt');
        setArquivoSelecionado(null);
        setPeriodosDetectadosLote([]);
      }
    } catch (error) {
      alert('❌ Erro ao ler arquivo: ' + error.message);
      setArquivoSelecionado(null);
      setPeriodosDetectadosLote([]);
    }
  };

  const handleEditar = (regra) => {
    setEditandoId(regra.id);
    setFormData({
      regionalId: regra.regionalId,
      tipoMeta: regra.tipoMeta,
      periodo: regra.periodo,
      meta1Volume: regra.meta1Volume,
      meta1Percent: regra.meta1Percent,
      meta1PercentIndividual: regra.meta1PercentIndividual,
      meta2Volume: regra.meta2Volume,
      meta2Percent: regra.meta2Percent,
      meta2PercentIndividual: regra.meta2PercentIndividual,
      meta3Volume: regra.meta3Volume,
      meta3Percent: regra.meta3Percent,
      meta3PercentIndividual: regra.meta3PercentIndividual,
      incrementoGlobal: regra.incrementoGlobal,
      pesoVendasChurn: regra.pesoVendasChurn
    });
    setFormAberto(true);
    setModoLote(false);
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!formData.regionalId) {
      setErro('Selecione uma regional');
      return;
    }

    try {
      await regrasComissaoAPI.atualizar(editandoId, formData);
      setFormData({
        regionalId: '',
        tipoMeta: '',
        periodo: '',
        meta1Volume: '',
        meta1Percent: '',
        meta1PercentIndividual: '',
        meta2Volume: '',
        meta2Percent: '',
        meta2PercentIndividual: '',
        meta3Volume: '',
        meta3Percent: '',
        meta3PercentIndividual: '',
        incrementoGlobal: 0,
        pesoVendasChurn: 0.5
      });
      setEditandoId(null);
      setFormAberto(false);
      carregarDados();
    } catch (error) {
      setErro('Erro ao atualizar regra');
    }
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setFormData({
      regionalId: '',
      tipoMeta: '',
      periodo: '',
      meta1Volume: '',
      meta1Percent: '',
      meta1PercentIndividual: '',
      meta2Volume: '',
      meta2Percent: '',
      meta2PercentIndividual: '',
      meta3Volume: '',
      meta3Percent: '',
      meta3PercentIndividual: '',
      incrementoGlobal: 0,
      pesoVendasChurn: 0.5
    });
    setFormAberto(false);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedRegras = () => {
    const sorted = [...regras].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'regionalNome') {
        aVal = (a.regionalNome || a.regionalId || '').toLowerCase();
        bVal = (b.regionalNome || b.regionalId || '').toLowerCase();
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar?')) {
      try {
        await regrasComissaoAPI.deletar(id);
        carregarDados();
      } catch (error) {
        setErro('Erro ao deletar regra');
      }
    }
  };

  const handleExclusaoMassa = async () => {
    const periodo = prompt('Digite o período que deseja excluir (Ex: Jan/26, Fev/26):');
    
    if (!periodo || periodo.trim() === '') {
      return;
    }

    const periodoTrim = periodo.trim();
    const regrasParaDeletar = regras.filter(r => 
      (r.periodo || 'Dez/25').toLowerCase() === periodoTrim.toLowerCase()
    );

    if (regrasParaDeletar.length === 0) {
      alert(`⚠️ Nenhuma regra encontrada para o período "${periodoTrim}"`);
      return;
    }

    const confirmacao = window.confirm(
      `🗑️ Tem certeza que deseja deletar ${regrasParaDeletar.length} regra(s) do período "${periodoTrim}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmacao) {
      return;
    }

    let sucesso = 0;
    let falhas = 0;

    for (const regra of regrasParaDeletar) {
      try {
        await regrasComissaoAPI.deletar(regra.id);
        sucesso++;
      } catch (error) {
        falhas++;
        console.error('Erro ao deletar regra:', error);
      }
    }

    alert(`✅ ${sucesso} regra(s) deletada(s)\n❌ ${falhas} falha(s)`);
    carregarDados();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const formatPercentual = (valor) => {
    const numero = Number(valor) || 0;
    const percentual = numero <= 1 ? numero * 100 : numero;
    return `${percentual.toFixed(2)}%`;
  };

  const formatNumero = (valor) => {
    const numero = Number(valor) || 0;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numero);
  };

  const calcularMetaIndividual = (metaVolume, incrementoGlobal, totalVendedores) => {
    if (!totalVendedores) return 0;
    const incremento = Number(incrementoGlobal) || 0;
    const volume = Number(metaVolume) || 0;
    return (volume * (1 + incremento)) / totalVendedores;
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
          <h1>📋 Regras de Comissão</h1>
          <p>Configure as regras de comissão por regional e tipo de meta</p>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}

        {isAdmin && (
          <div className="glass-card">
            <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fafafa' }}>
              <h3 style={{ marginBottom: '10px' }}>Parametros de Comissao para Lideranca</h3>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                Configure por periodo os multiplicadores usados no calculo da lideranca.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Periodo</label>
                  <input
                    list="periodos-lideranca"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Jan/26"
                    value={parametrosLideranca.periodo}
                    onChange={(e) => setParametrosLideranca({ ...parametrosLideranca, periodo: e.target.value })}
                  />
                  <datalist id="periodos-lideranca">
                    {periodosConhecidos.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Gerente Regional (x)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={parametrosLideranca.gerenteRegionalMultiplier}
                    onChange={(e) => setParametrosLideranca({ ...parametrosLideranca, gerenteRegionalMultiplier: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Supervisor Comercial (x)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={parametrosLideranca.supervisorRegionalMultiplier}
                    onChange={(e) => setParametrosLideranca({ ...parametrosLideranca, supervisorRegionalMultiplier: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Gerente da Matriz (x)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={parametrosLideranca.gerenteMatrizMultiplier}
                    onChange={(e) => setParametrosLideranca({ ...parametrosLideranca, gerenteMatrizMultiplier: e.target.value })}
                  />
                </div>
              </div>
              <button
                className="btn btn-success btn-small"
                onClick={handleSalvarParametrosLideranca}
                disabled={salvandoLideranca}
                style={{ marginTop: '12px' }}
              >
                {salvandoLideranca ? 'Salvando...' : 'Salvar parametros de lideranca'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditandoId(null);
                  setFormAberto(!formAberto);
                  setModoLote(false);
                  if (!formAberto) {
                    setFormData({
                      regionalId: '',
                      tipoMeta: '',
                      periodo: '',
                      meta1Volume: '',
                      meta1Percent: '',
                      meta1PercentIndividual: '',
                      meta2Volume: '',
                      meta2Percent: '',
                      meta2PercentIndividual: '',
                      meta3Volume: '',
                      meta3Percent: '',
                      meta3PercentIndividual: '',
                      incrementoGlobal: 0,
                      pesoVendasChurn: 0.5
                    });
                  }
                }}
              >
                ➕ Nova Regra
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setModoLote(!modoLote);
                  setFormAberto(false);
                  setEditandoId(null);
                  if (!modoLote) setPeriodosDetectadosLote([]);
                }}
              >
                📋 Adicionar em Lote
              </button>
              <button
                className="btn btn-danger"
                onClick={handleExclusaoMassa}
              >
                🗑️ Exclusão em Massa
              </button>
            </div>

            {modoLote && (
              <div style={{ marginTop: '20px' }}>
                <label className="form-label">Insira as regras (uma por linha) ou faça upload de arquivo</label>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  <strong>Formato Completo:</strong> Regional | TipoMeta | Período | Meta1Vol | Meta1% | Meta2Vol | Meta2% | Meta3Vol | Meta3% | Meta1%Ind | Meta2%Ind | Meta3%Ind | IncrementoGlobal | PesoVendasChurn<br/>
                  Exemplo 1 (Texto): JI-PARANA | Vendas | dez/25 | 400 | 0,15 | 320 | 0,06 | 256 | 0,03 | 0,08 | 0,03 | 0,02 | 0,4 | 0,5<br/>
                  Exemplo 2 (Excel): JI-PARANA | Vendas | 45992 | 400 | 0,15 | 320 | 0,06 | 256 | 0,03 | 0,08 | 0,03 | 0,02 | 0,4 | 0,5<br/>
                  Exemplo 3 (Percentual): JI-PARANA | Vendas | dez/25 | 400 | 15% | 320 | 6% | 256 | 3% | 8% | 3% | 2% | 40% | 50%<br/>
                  <br/>
                  <strong>Formato Compacto:</strong> Regional | Período | TipoMeta | (Vol1 Perc1%) | (Vol2 Perc2%) | (Vol3 Perc3%) | [PercInd1%] | [PercInd2%] | [PercInd3%]<br/>
                  Exemplo: Alta Floresta | Nov/25 | SVA | 10 (100%) | 5 (80%) | 3 (50%) | 8% | 3% | 2%<br/>
                  <em>Nota: Percentuais individuais são opcionais no formato compacto</em>
                </p>
                
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label htmlFor="fileUpload" className="btn btn-secondary btn-small" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    📎 Escolher Arquivo (.xlsx, .csv, .txt)
                  </label>
                  <input
                    id="fileUpload"
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleArquivoSelecionado}
                    style={{ display: 'none' }}
                  />
                  {arquivoSelecionado && (
                    <span style={{ fontSize: '13px', color: '#28a745' }}>
                      ✓ {arquivoSelecionado.name}
                    </span>
                  )}
                </div>
                <textarea
                  className="form-control"
                  rows="10"
                  value={textoLote}
                  onChange={(e) => {
                    const texto = e.target.value;
                    setTextoLote(texto);
                    atualizarPeriodosDetectados(texto);
                  }}
                  placeholder="FORMATO COMPACTO:&#10;Regional | Período | TipoMeta | (Vol1 Perc1%) | (Vol2 Perc2%) | (Vol3 Perc3%)&#10;Alta Floresta | Nov/25 | SVA | 10 (100%) | 5 (80%) | 3 (50%)&#10;&#10;FORMATO CLÁSSICO:&#10;Regional | TipoMeta | Período | Meta1Vol | Meta1% | Meta2Vol | Meta2% | Meta3Vol | Meta3% | Meta1%Ind | Meta2%Ind | Meta3%Ind | IncrGlobal | PesoChurn&#10;JI-PARANA | Vendas | dez/25 | 400 | 0,15 | 320 | 0,06 | 256 | 0,03 | 0,08 | 0,03 | 0,02 | 0,4 | 0,5"
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
                <div style={{ marginTop: '10px', fontSize: '13px' }}>
                  <strong>PerÃ­odos detectados:</strong>{' '}
                  {periodosDetectadosLote.length > 0 ? periodosDetectadosLote.join(', ') : 'nenhum'}
                </div>
                <button
                  className="btn btn-success btn-small"
                  onClick={handleCriarLote}
                  style={{ marginTop: '10px' }}
                >
                  ✓ Criar Regras em Lote
                </button>
              </div>
            )}

            {formAberto && (
              <form onSubmit={editandoId ? handleSalvarEdicao : handleCriar} style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>{editandoId ? '✏️ Editar Regra' : '➕ Nova Regra'}</h3>
                <div className="form-group">
                  <label className="form-label">Regional</label>
                  <select
                    className="form-select"
                    value={formData.regionalId}
                    onChange={(e) => setFormData({ ...formData, regionalId: e.target.value })}
                    required
                  >
                    <option value="">Selecione uma regional</option>
                    {regionais.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Meta</label>
                  <select
                    className="form-select"
                    value={formData.tipoMeta}
                    onChange={(e) => setFormData({ ...formData, tipoMeta: e.target.value })}
                    required
                  >
                    <option value="">Selecione um tipo de meta</option>
                    {tiposMeta.map((tipo) => (
                      <option key={tipo.id} value={tipo.nome}>
                        {(tipo.nome || '').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Período (Mês/Ano)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Jan/26, Fev/26, Mar/26"
                    value={formData.periodo}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                    required
                  />
                </div>

                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Meta Nível 1</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Volume</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta1Volume}
                      onChange={(e) => setFormData({ ...formData, meta1Volume: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Percentual (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta1Percent}
                      onChange={(e) => setFormData({ ...formData, meta1Percent: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Percentual Individual (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta1PercentIndividual}
                      onChange={(e) => setFormData({ ...formData, meta1PercentIndividual: e.target.value })}
                    />
                  </div>
                </div>

                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Meta Nível 2</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Volume</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta2Volume}
                      onChange={(e) => setFormData({ ...formData, meta2Volume: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Percentual (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta2Percent}
                      onChange={(e) => setFormData({ ...formData, meta2Percent: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Percentual Individual (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta2PercentIndividual}
                      onChange={(e) => setFormData({ ...formData, meta2PercentIndividual: e.target.value })}
                    />
                  </div>
                </div>

                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Meta Nível 3</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Volume</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta3Volume}
                      onChange={(e) => setFormData({ ...formData, meta3Volume: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Percentual (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta3Percent}
                      onChange={(e) => setFormData({ ...formData, meta3Percent: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Percentual Individual (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.meta3PercentIndividual}
                      onChange={(e) => setFormData({ ...formData, meta3PercentIndividual: e.target.value })}
                    />
                  </div>
                </div>

                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Parâmetros Globais</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Incremento Global (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="Ex: 15"
                      value={formData.incrementoGlobal}
                      onChange={(e) => setFormData({ ...formData, incrementoGlobal: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Peso Vendas/Churn (0-1)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      className="form-control"
                      placeholder="Ex: 0.5"
                      value={formData.pesoVendasChurn}
                      onChange={(e) => setFormData({ ...formData, pesoVendasChurn: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-success btn-small" style={{ marginTop: '20px' }}>
                  ✓ {editandoId ? 'Atualizar Regra' : 'Criar Regra'}
                </button>
                {editandoId && (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-small" 
                    onClick={handleCancelarEdicao}
                    style={{ marginTop: '20px', marginLeft: '10px' }}
                  >
                    ❌ Cancelar
                  </button>
                )}
              </form>
            )}
          </div>
        )}

        <div className="glass-card">
          {carregando ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : regras.length === 0 ? (
            <p>Nenhuma regra de comissão cadastrada</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th rowSpan="2" onClick={() => handleSort('regionalNome')} style={{ cursor: 'pointer' }}>
                      Regional {sortField === 'regionalNome' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th rowSpan="2" onClick={() => handleSort('periodo')} style={{ cursor: 'pointer' }}>
                      Período {sortField === 'periodo' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th rowSpan="2" onClick={() => handleSort('tipoMeta')} style={{ cursor: 'pointer' }}>
                      Tipo de Meta {sortField === 'tipoMeta' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th colSpan="3" style={{ textAlign: 'center' }}>Global</th>
                    <th colSpan="3" style={{ textAlign: 'center' }}>Individual</th>
                    {isAdmin && <th rowSpan="2">Ações</th>}
                  </tr>
                  <tr>
                    <th onClick={() => handleSort('meta1Volume')} style={{ cursor: 'pointer' }}>
                      M1 {sortField === 'meta1Volume' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('meta2Volume')} style={{ cursor: 'pointer' }}>
                      M2 {sortField === 'meta2Volume' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('meta3Volume')} style={{ cursor: 'pointer' }}>
                      M3 {sortField === 'meta3Volume' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>M1</th>
                    <th>M2</th>
                    <th>M3</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedRegras().map((r) => (
                    <tr key={r.id}>
                      {(() => {
                        const totalVendedores = colaboradoresPorRegional[r.regionalId] || 0;
                        const metaIndividual1 = Math.ceil(calcularMetaIndividual(r.meta1Volume, r.incrementoGlobal, totalVendedores));
                        const metaIndividual2 = Math.ceil(calcularMetaIndividual(r.meta2Volume, r.incrementoGlobal, totalVendedores));
                        const metaIndividual3 = Math.ceil(calcularMetaIndividual(r.meta3Volume, r.incrementoGlobal, totalVendedores));
                        return (
                          <>
                            <td>{r.regionalNome || r.regionalId}</td>
                            <td><strong>{r.periodo || 'Dez/25'}</strong></td>
                            <td>{r.tipoMeta.toUpperCase()}</td>
                            <td>{`${formatNumero(r.meta1Volume)} (${formatPercentual(r.meta1Percent)})`}</td>
                            <td>{`${formatNumero(r.meta2Volume)} (${formatPercentual(r.meta2Percent)})`}</td>
                            <td>{`${formatNumero(r.meta3Volume)} (${formatPercentual(r.meta3Percent)})`}</td>
                            <td>{`${formatNumero(metaIndividual1)} (${formatPercentual(r.meta1PercentIndividual)})`}</td>
                            <td>{`${formatNumero(metaIndividual2)} (${formatPercentual(r.meta2PercentIndividual)})`}</td>
                            <td>{`${formatNumero(metaIndividual3)} (${formatPercentual(r.meta3PercentIndividual)})`}</td>
                          </>
                        );
                      })()}
                      {isAdmin && (
                        <td>
                          <button
                            className="btn btn-primary btn-small"
                            onClick={() => handleEditar(r)}
                            style={{ marginRight: '5px' }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeletar(r.id)}
                          >
                            🗑️ Deletar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
