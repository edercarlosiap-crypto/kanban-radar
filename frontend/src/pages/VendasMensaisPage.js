import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { regionaisAPI, vendasMensaisAPI, churnRegionaisAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';
import ImportadorVendas from '../components/ImportadorVendas';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const obterPeriodoAtual = () => {
  const hoje = new Date();
  const mes = MESES[hoje.getMonth()];
  const ano = String(hoje.getFullYear()).slice(-2);
  return `${mes}/${ano}`;
};

const excelToPeriodo = (excelDate) => {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
  const mes = MESES[date.getMonth()];
  const ano = String(date.getFullYear()).slice(-2);
  return `${mes}/${ano}`;
};

const parsePeriodo = (valor) => {
  if (!valor && valor !== 0) return '';

  const formatarPeriodo = (mesIdx, ano) => {
    if (mesIdx < 0 || mesIdx > 11 || !ano) return '';
    const ano2 = String(ano).slice(-2);
    return `${MESES[mesIdx]}/${ano2}`;
  };

  const valorStr = String(valor).trim();
  if (!valorStr) return '';

  const valorNum = Number(valorStr);
  if (!Number.isNaN(valorNum) && valorNum > 1000 && valorNum < 70000) {
    return excelToPeriodo(valorNum);
  }

  const normalizado = valorStr
    .replace('T', ' ')
    .replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const mapaMeses = {
    jan: 0, janeiro: 0,
    fev: 1, fevereiro: 1, feb: 1,
    mar: 2, marco: 2,
    abr: 3, abril: 3, apr: 3,
    mai: 4, maio: 4, may: 4,
    jun: 5, junho: 5,
    jul: 6, julho: 6,
    ago: 7, agosto: 7, aug: 7,
    set: 8, setembro: 8, sep: 8,
    out: 9, outubro: 9, oct: 9,
    nov: 10, novembro: 10,
    dez: 11, dezembro: 11, dec: 11
  };

  const tokens = normalizado.split(/[^a-z0-9]+/).filter(Boolean);
  const tokenMes = tokens.find((t) => Object.prototype.hasOwnProperty.call(mapaMeses, t));
  if (tokenMes) {
    const tokenAno = tokens.find((t) => /^\d{4}$/.test(t)) || tokens.find((t) => /^\d{2}$/.test(t));
    const ano = tokenAno || new Date().getFullYear();
    return formatarPeriodo(mapaMeses[tokenMes], ano);
  }

  const numerico = normalizado.replace(/[.\-]/g, '/');
  const partes = numerico.split('/').filter(Boolean);

  if (partes.length === 3 && partes.every((p) => /^\d+$/.test(p))) {
    const [p1, p2, p3] = partes;
    if (p1.length === 4) {
      return formatarPeriodo(Number(p2) - 1, p1);
    }
    if (p3.length === 4) {
      return formatarPeriodo(Number(p2) - 1, p3);
    }
    return formatarPeriodo(Number(p2) - 1, p3);
  }

  if (partes.length === 2 && partes.every((p) => /^\d+$/.test(p))) {
    const [p1, p2] = partes;
    if (p1.length === 4) {
      return formatarPeriodo(Number(p2) - 1, p1);
    }
    return formatarPeriodo(Number(p1) - 1, p2);
  }

  return '';
};

const normalizarNumero = (valor) => {
  // Tratamento de nulos e vazios
  if (valor === null || valor === undefined || valor === '') return 0;
  
  const raw = String(valor).trim();
  if (!raw) return 0;
  
  // Reconhecer "-" (traço) e "R$" vazio como 0
  if (raw === '-' || raw === 'R$' || raw === 'R$ -') return 0;
  
  // Remover símbolo de moeda "R$"
  let normalizado = raw.replace(/R\s*\$?\s*/gi, '').trim();
  
  // Se virou vazio depois de remover R$, retornar 0
  if (!normalizado || normalizado === '-') return 0;
  
  // Tratamento de separadores de milhar e decimal
  // Detectar se há ponto e vírgula (caso tenha ambos, ponto é milhar)
  if (normalizado.includes('.') && normalizado.includes(',')) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
  } else if (normalizado.includes(',')) {
    // Se tem apenas vírgula, pode ser decimal
    normalizado = normalizado.replace(',', '.');
  }
  
  const numero = Number(normalizado);
  return Number.isNaN(numero) ? 0 : numero;
};

const normalizarChave = (header) => {
  return String(header || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s-]+/g, ' ')
    .trim();
};

const identificarSeparador = (linha) => {
  if (!linha) return ',';
  const separadores = ['\t', ';', ',', '|'];
  let melhorSeparador = ',';
  let maxColunas = 0;

  for (const sep of separadores) {
    const colunas = linha.split(sep).length;
    if (colunas > maxColunas) {
      maxColunas = colunas;
      melhorSeparador = sep;
    }
  }

  return melhorSeparador;
};

export default function VendasMensaisPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.role || 'leitura';

  const [regionais, setRegionais] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [vendasMensais, setVendasMensais] = useState([]);
  const [churnRegistros, setChurnRegistros] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [modoLoteVendas, setModoLoteVendas] = useState(false);
  const [modoLoteChurn, setModoLoteChurn] = useState(false);
  const [textoLoteVendas, setTextoLoteVendas] = useState('');
  const [textoLoteChurn, setTextoLoteChurn] = useState('');
  const [falhasLoteVendas, setFalhasLoteVendas] = useState([]);
  const [falhasLoteChurn, setFalhasLoteChurn] = useState([]);
  const [editandoVendaId, setEditandoVendaId] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState(obterPeriodoAtual());
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [selecionadosVendas, setSelecionadosVendas] = useState(new Set());
  const [selecionadosChurn, setSelecionadosChurn] = useState(new Set());
  const [modalImportadorAberto, setModalImportadorAberto] = useState(false);
  const [formData, setFormData] = useState({
    periodo: obterPeriodoAtual(),
    vendedorId: '',
    regionalId: '',
    vendasVolume: '',
    vendasFinanceiro: '',
    mudancaTitularidadeVolume: '',
    mudancaTitularidadeFinanceiro: '',
    migracaoTecnologiaVolume: '',
    migracaoTecnologiaFinanceiro: '',
    renovacaoVolume: '',
    renovacaoFinanceiro: '',
    planoEventoVolume: '',
    planoEventoFinanceiro: '',
    svaVolume: '',
    svaFinanceiro: '',
    telefoniaVolume: '',
    telefoniaFinanceiro: ''
  });
  const [churnForm, setChurnForm] = useState({
    periodo: obterPeriodoAtual(),
    regionalId: '',
    churn: ''
  });

  const periodosDisponiveis = useMemo(() => {
    const periodos = [];
    const hoje = new Date();
    for (let i = -6; i <= 3; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = MESES[data.getMonth()];
      const ano = String(data.getFullYear()).slice(-2);
      periodos.push(`${mes}/${ano}`);
    }
    return periodos;
  }, []);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const resultados = await Promise.allSettled([
        regionaisAPI.listar(),
        api.get('/colaboradores'),
        vendasMensaisAPI.listar(),
        churnRegionaisAPI.listar()
      ]);

      const [regResp, colabResp, vendasResp, churnResp] = resultados;
      const falhas = [];

      if (regResp.status === 'fulfilled') {
        setRegionais(regResp.value.data.regionais || []);
      } else {
        falhas.push('regionais');
      }

      if (colabResp.status === 'fulfilled') {
        setColaboradores(colabResp.value.data.colaboradores || []);
      } else {
        falhas.push('colaboradores');
      }

      if (vendasResp.status === 'fulfilled') {
        setVendasMensais(vendasResp.value.data.vendas || []);
      } else {
        falhas.push('vendas mensais');
      }

      if (churnResp.status === 'fulfilled') {
        setChurnRegistros(churnResp.value.data.registros || []);
      } else {
        falhas.push('churn');
      }

      if (falhas.length) {
        setErro(`Erro ao carregar: ${falhas.join(', ')}`);
      } else {
        setErro('');
      }
    } catch (error) {
      console.error(error);
      setErro('Erro ao carregar dados de vendas/churn');
    } finally {
      setCarregando(false);
    }
  };

  const regionaisMap = useMemo(() => {
    const map = new Map();
    regionais.forEach((r) => map.set(r.id, r.nome));
    return map;
  }, [regionais]);

  const colaboradoresMap = useMemo(() => {
    const map = new Map();
    colaboradores.forEach((c) => map.set(c.id, c.nome));
    return map;
  }, [colaboradores]);

  const colaboradoresFiltrados = useMemo(() => {
    if (!formData.regionalId) return colaboradores;
    return colaboradores.filter((c) => c.regional_id === formData.regionalId);
  }, [colaboradores, formData.regionalId]);

  // Função para normalizar nomes (remover acentos, espaços extras, lowercase)
  const normalizarNome = (nome) => {
    return String(nome || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
      .trim();
  };

  const localizarRegional = (valor) => {
    if (!valor) return null;
    const direto = regionais.find((r) => r.id === valor);
    if (direto) return direto.id;
    const valorNormalizado = normalizarNome(valor);
    const nome = regionais.find((r) => normalizarNome(r.nome) === valorNormalizado);
    return nome ? nome.id : null;
  };

  const localizarVendedor = (valor, regionalId = null) => {
    if (!valor) return null;
    const direto = colaboradores.find((c) => c.id === valor);
    if (direto) return direto.id;
    const valorNormalizado = normalizarNome(valor);
    
    // Se regionalId for fornecida, buscar vendedor que pertença àquela regional
    if (regionalId) {
      const nome = colaboradores.find((c) => 
        normalizarNome(c.nome) === valorNormalizado && c.regional_id === regionalId
      );
      return nome ? nome.id : null;
    }
    
    // Caso contrário, buscar apenas por nome (comportamento padrão)
    const nome = colaboradores.find((c) => normalizarNome(c.nome) === valorNormalizado);
    return nome ? nome.id : null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegionalChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      regionalId: value,
      vendedorId: ''
    }));
  };

  const handleChurnChange = (e) => {
    const { name, value } = e.target;
    setChurnForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const limparMensagens = () => {
    setErro('');
    setMensagem('');
    setFalhasLoteVendas([]);
    setFalhasLoteChurn([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    limparMensagens();

    if (!formData.periodo || !formData.vendedorId || !formData.regionalId) {
      setErro('Informe periodo, vendedor e regional');
      return;
    }

    try {
      setCarregando(true);
      const payload = {
        periodo: formData.periodo,
        vendedorId: formData.vendedorId,
        regionalId: formData.regionalId,
        vendasVolume: normalizarNumero(formData.vendasVolume),
        vendasFinanceiro: normalizarNumero(formData.vendasFinanceiro),
        mudancaTitularidadeVolume: normalizarNumero(formData.mudancaTitularidadeVolume),
        mudancaTitularidadeFinanceiro: normalizarNumero(formData.mudancaTitularidadeFinanceiro),
        migracaoTecnologiaVolume: normalizarNumero(formData.migracaoTecnologiaVolume),
        migracaoTecnologiaFinanceiro: normalizarNumero(formData.migracaoTecnologiaFinanceiro),
        renovacaoVolume: normalizarNumero(formData.renovacaoVolume),
        renovacaoFinanceiro: normalizarNumero(formData.renovacaoFinanceiro),
        planoEventoVolume: normalizarNumero(formData.planoEventoVolume),
        planoEventoFinanceiro: normalizarNumero(formData.planoEventoFinanceiro),
        svaVolume: normalizarNumero(formData.svaVolume),
        svaFinanceiro: normalizarNumero(formData.svaFinanceiro),
        telefoniaVolume: normalizarNumero(formData.telefoniaVolume),
        telefoniaFinanceiro: normalizarNumero(formData.telefoniaFinanceiro)
      };

      if (editandoVendaId) {
        await vendasMensaisAPI.atualizar(editandoVendaId, payload);
        setMensagem('Vendas mensais atualizadas com sucesso');
      } else {
        await vendasMensaisAPI.criar(payload);
        setMensagem('Vendas mensais registradas com sucesso');
      }

      setEditandoVendaId(null);
      setFormData({
        periodo: formData.periodo,
        vendedorId: '',
        regionalId: '',
        vendasVolume: '',
        vendasFinanceiro: '',
        mudancaTitularidadeVolume: '',
        mudancaTitularidadeFinanceiro: '',
        migracaoTecnologiaVolume: '',
        migracaoTecnologiaFinanceiro: '',
        renovacaoVolume: '',
        renovacaoFinanceiro: '',
        planoEventoVolume: '',
        planoEventoFinanceiro: '',
        svaVolume: '',
        svaFinanceiro: '',
        telefoniaVolume: '',
        telefoniaFinanceiro: ''
      });
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao salvar vendas mensais');
    } finally {
      setCarregando(false);
    }
  };

  const handleEditarVenda = (registro) => {
    setEditandoVendaId(registro.id);
    setFormData({
      periodo: registro.periodo || obterPeriodoAtual(),
      vendedorId: registro.vendedor_id || '',
      regionalId: registro.regional_id || '',
      vendasVolume: registro.vendas_volume ?? '',
      vendasFinanceiro: registro.vendas_financeiro ?? '',
      mudancaTitularidadeVolume: registro.mudanca_titularidade_volume ?? '',
      mudancaTitularidadeFinanceiro: registro.mudanca_titularidade_financeiro ?? '',
      migracaoTecnologiaVolume: registro.migracao_tecnologia_volume ?? '',
      migracaoTecnologiaFinanceiro: registro.migracao_tecnologia_financeiro ?? '',
      renovacaoVolume: registro.renovacao_volume ?? '',
      renovacaoFinanceiro: registro.renovacao_financeiro ?? '',
      planoEventoVolume: registro.plano_evento_volume ?? '',
      planoEventoFinanceiro: registro.plano_evento_financeiro ?? '',
      svaVolume: registro.sva_volume ?? '',
      svaFinanceiro: registro.sva_financeiro ?? '',
      telefoniaVolume: registro.telefonia_volume ?? '',
      telefoniaFinanceiro: registro.telefonia_financeiro ?? ''
    });
  };

  const handleCancelarEdicao = () => {
    setEditandoVendaId(null);
    setFormData({
      periodo: obterPeriodoAtual(),
      vendedorId: '',
      regionalId: '',
      vendasVolume: '',
      vendasFinanceiro: '',
      mudancaTitularidadeVolume: '',
      mudancaTitularidadeFinanceiro: '',
      migracaoTecnologiaVolume: '',
      migracaoTecnologiaFinanceiro: '',
      renovacaoVolume: '',
      renovacaoFinanceiro: '',
      planoEventoVolume: '',
      planoEventoFinanceiro: '',
      svaVolume: '',
      svaFinanceiro: '',
      telefoniaVolume: '',
      telefoniaFinanceiro: ''
    });
  };

  const handleDeletarVenda = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este registro?')) return;

    try {
      setCarregando(true);
      await vendasMensaisAPI.deletar(id);
      setMensagem('Registro de vendas deletado');
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao deletar registro de vendas');
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarChurn = async (e) => {
    e.preventDefault();
    limparMensagens();

    if (!churnForm.periodo || !churnForm.regionalId) {
      setErro('Informe periodo e regional para o churn');
      return;
    }

    try {
      setCarregando(true);
      await churnRegionaisAPI.criarOuAtualizar({
        periodo: churnForm.periodo,
        regionalId: churnForm.regionalId,
        churn: normalizarNumero(churnForm.churn)
      });
      setMensagem('Churn regional registrado com sucesso');
      setChurnForm((prev) => ({ ...prev, churn: '' }));
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao salvar churn regional');
    } finally {
      setCarregando(false);
    }
  };

  const handleDeletarChurn = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este churn?')) return;

    try {
      setCarregando(true);
      await churnRegionaisAPI.deletar(id);
      setMensagem('Churn regional deletado');
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao deletar churn regional');
    } finally {
      setCarregando(false);
    }
  };

  // Funções para seleção e exclusão em massa de Vendas
  const selecionarTodasVendas = (e) => {
    if (e.target.checked) {
      setSelecionadosVendas(new Set(vendasFiltradas.map(v => v.id)));
    } else {
      setSelecionadosVendas(new Set());
    }
  };

  const selecionarVenda = (id, checked) => {
    const novosSelecionados = new Set(selecionadosVendas);
    if (checked) {
      novosSelecionados.add(id);
    } else {
      novosSelecionados.delete(id);
    }
    setSelecionadosVendas(novosSelecionados);
  };

  const deletarVendasEmMassa = async () => {
    if (selecionadosVendas.size === 0) {
      setErro('Selecione pelo menos um registro para deletar');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja deletar ${selecionadosVendas.size} registro(s)?`)) return;

    try {
      setCarregando(true);
      limparMensagens();
      
      for (const id of selecionadosVendas) {
        await vendasMensaisAPI.deletar(id);
      }
      
      setMensagem(`✓ ${selecionadosVendas.size} registro(s) deletado(s) com sucesso`);
      setSelecionadosVendas(new Set());
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao deletar registros de vendas');
    } finally {
      setCarregando(false);
    }
  };

  // Funções para seleção e exclusão em massa de Churn
  const selecionarTodosChurn = (e) => {
    if (e.target.checked) {
      setSelecionadosChurn(new Set(churnFiltrado.map(c => c.id)));
    } else {
      setSelecionadosChurn(new Set());
    }
  };

  const selecionarChurn = (id, checked) => {
    const novosSelecionados = new Set(selecionadosChurn);
    if (checked) {
      novosSelecionados.add(id);
    } else {
      novosSelecionados.delete(id);
    }
    setSelecionadosChurn(novosSelecionados);
  };

  const deletarChurnEmMassa = async () => {
    if (selecionadosChurn.size === 0) {
      setErro('Selecione pelo menos um registro de churn para deletar');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja deletar ${selecionadosChurn.size} registro(s) de churn?`)) return;

    try {
      setCarregando(true);
      limparMensagens();
      
      for (const id of selecionadosChurn) {
        await churnRegionaisAPI.deletar(id);
      }
      
      setMensagem(`✓ ${selecionadosChurn.size} registro(s) de churn deletado(s) com sucesso`);
      setSelecionadosChurn(new Set());
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao deletar registros de churn');
    } finally {
      setCarregando(false);
    }
  };

  const mapearHeader = (header) => {
    const chave = normalizarChave(header);

    const mapa = {
      periodo: 'periodo',
      perido: 'periodo',
      'mes/ano': 'periodo',
      'mes ano': 'periodo',
      mes: 'periodo',
      data: 'periodo',
      mes_ano: 'periodo',
      vendedor: 'vendedor',
      vendedores: 'vendedor',
      colaborador: 'vendedor',
      colaboradores: 'vendedor',
      'vendedor name': 'vendedor',
      regional: 'regional',
      regionais: 'regional',
      regiao: 'regional',
      regioes: 'regional',
      vendas: 'vendasVolume',
      'vendas volume': 'vendasVolume',
      vendas_volume: 'vendasVolume',
      'vendas financeiro': 'vendasFinanceiro',
      vendas_financeiro: 'vendasFinanceiro',
      'mudanca de titularidade': 'mudancaTitularidadeVolume',
      'mudanca de titularidade volume': 'mudancaTitularidadeVolume',
      'mudanca titularidade': 'mudancaTitularidadeVolume',
      mudanca_titularidade: 'mudancaTitularidadeVolume',
      'mudanca de titularidade financeiro': 'mudancaTitularidadeFinanceiro',
      'mudanca titularidade financeiro': 'mudancaTitularidadeFinanceiro',
      mudanca_titularidade_financeiro: 'mudancaTitularidadeFinanceiro',
      'migracao de tecnologia': 'migracaoTecnologiaVolume',
      'migracao tecnologia': 'migracaoTecnologiaVolume',
      'migracao de tecnologia volume': 'migracaoTecnologiaVolume',
      migracao_tecnologia: 'migracaoTecnologiaVolume',
      migracao_tecnologia_volume: 'migracaoTecnologiaVolume',
      'migracao de tecnologia financeiro': 'migracaoTecnologiaFinanceiro',
      'migracao tecnologia financeiro': 'migracaoTecnologiaFinanceiro',
      migracao_tecnologia_financeiro: 'migracaoTecnologiaFinanceiro',
      renovacao: 'renovacaoVolume',
      'renovacao volume': 'renovacaoVolume',
      renovacao_volume: 'renovacaoVolume',
      'renovacao financeiro': 'renovacaoFinanceiro',
      renovacao_financeiro: 'renovacaoFinanceiro',
      'plano evento': 'planoEventoVolume',
      'plano evento volume': 'planoEventoVolume',
      plano_evento: 'planoEventoVolume',
      plano_evento_volume: 'planoEventoVolume',
      'plano evento financeiro': 'planoEventoFinanceiro',
      plano_evento_financeiro: 'planoEventoFinanceiro',
      sva: 'svaVolume',
      'sva volume': 'svaVolume',
      sva_volume: 'svaVolume',
      'sva financeiro': 'svaFinanceiro',
      sva_financeiro: 'svaFinanceiro',
      telefonia: 'telefoniaVolume',
      'telefonia volume': 'telefoniaVolume',
      telefonia_volume: 'telefoniaVolume',
      'telefonia financeiro': 'telefoniaFinanceiro',
      telefonia_financeiro: 'telefoniaFinanceiro',
      churn: 'churn'
    };

    return mapa[chave] || '';
  };

  const handleImportarVendas = async (registrosValidos) => {
    try {
      setCarregando(true);
      limparMensagens();
      
      let sucesso = 0;
      let falhas = 0;

      for (const registro of registrosValidos) {
        try {
          const periodo = parsePeriodo(registro.periodo);
          const regionalId = localizarRegional(registro.regional);
          const vendedorId = localizarVendedor(registro.vendedor, regionalId);

          if (!periodo || !vendedorId || !regionalId) {
            falhas++;
            continue;
          }

          const vendedor = colaboradores.find((c) => c.id === vendedorId);
          if (vendedor && vendedor.regional_id !== regionalId) {
            falhas++;
            continue;
          }

          await vendasMensaisAPI.criar({
            periodo,
            vendedorId,
            regionalId,
            vendasVolume: normalizarNumero(registro.vendasVolume),
            vendasFinanceiro: normalizarNumero(registro.vendasFinanceiro),
            mudancaTitularidadeVolume: normalizarNumero(registro.mudancaTitularidadeVolume),
            mudancaTitularidadeFinanceiro: normalizarNumero(registro.mudancaTitularidadeFinanceiro),
            migracaoTecnologiaVolume: normalizarNumero(registro.migracaoTecnologiaVolume),
            migracaoTecnologiaFinanceiro: normalizarNumero(registro.migracaoTecnologiaFinanceiro),
            renovacaoVolume: normalizarNumero(registro.renovacaoVolume),
            renovacaoFinanceiro: normalizarNumero(registro.renovacaoFinanceiro),
            planoEventoVolume: normalizarNumero(registro.planoEventoVolume),
            planoEventoFinanceiro: normalizarNumero(registro.planoEventoFinanceiro),
            svaVolume: normalizarNumero(registro.svaVolume),
            svaFinanceiro: normalizarNumero(registro.svaFinanceiro),
            telefoniaVolume: normalizarNumero(registro.telefoniaVolume),
            telefoniaFinanceiro: normalizarNumero(registro.telefoniaFinanceiro)
          });
          sucesso++;
        } catch (err) {
          console.error('Erro ao processar registro:', err);
          falhas++;
        }
      }

      setMensagem(`✅ Importação concluída: ${sucesso} registros importados com sucesso${falhas > 0 ? `, ${falhas} falharam` : ''}`);
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao importar vendas mensais');
    } finally {
      setCarregando(false);
    }
  };

  const parseLoteVendas = (texto) => {
    const linhas = texto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
    if (linhas.length === 0) return [];

    const separador = identificarSeparador(linhas[0]);
    let headers = [];
    let inicioDados = 0;

    const primeiraLinha = linhas[0].split(separador).map((campo) => campo.trim());
    const headerCandidato = primeiraLinha.map(mapearHeader);
    const camposMapeados = headerCandidato.filter((item) => item);
    const temHeader = camposMapeados.length >= 3 && headerCandidato.includes('periodo');

    if (temHeader) {
      headers = headerCandidato;
      inicioDados = 1;
    }

    return linhas.slice(inicioDados).map((linha) => {
      const colunas = linha.split(separador).map((campo) => campo.trim());
      const dados = {
        periodo: '',
        vendedor: '',
        regional: '',
        vendasVolume: '',
        vendasFinanceiro: '',
        mudancaTitularidadeVolume: '',
        mudancaTitularidadeFinanceiro: '',
        migracaoTecnologiaVolume: '',
        migracaoTecnologiaFinanceiro: '',
        renovacaoVolume: '',
        renovacaoFinanceiro: '',
        planoEventoVolume: '',
        planoEventoFinanceiro: '',
        svaVolume: '',
        svaFinanceiro: '',
        telefoniaVolume: '',
        telefoniaFinanceiro: ''
      };

      if (headers.length) {
        headers.forEach((key, idx) => {
          if (key) dados[key] = colunas[idx];
        });
      } else {
        const ordem = [
          'periodo',
          'vendedor',
          'regional',
          'vendasVolume',
          'vendasFinanceiro',
          'mudancaTitularidadeVolume',
          'mudancaTitularidadeFinanceiro',
          'migracaoTecnologiaVolume',
          'migracaoTecnologiaFinanceiro',
          'renovacaoVolume',
          'renovacaoFinanceiro',
          'planoEventoVolume',
          'planoEventoFinanceiro',
          'svaVolume',
          'svaFinanceiro',
          'telefoniaVolume',
          'telefoniaFinanceiro'
        ];

        ordem.forEach((key, idx) => {
          dados[key] = colunas[idx] ?? '';
        });
      }

      return dados;
    });
  };

  const parseLoteChurn = (texto) => {
    const linhas = texto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
    if (linhas.length === 0) return [];

    const separador = identificarSeparador(linhas[0]);
    let headers = [];
    let inicioDados = 0;

    const primeiraLinha = linhas[0].split(separador).map((campo) => campo.trim());
    const headerCandidato = primeiraLinha.map(mapearHeader);
    const camposMapeados = headerCandidato.filter((item) => item);
    const temHeader = camposMapeados.length >= 2 && (headerCandidato.includes('periodo') || headerCandidato.includes('regional'));

    if (temHeader) {
      headers = headerCandidato;
      inicioDados = 1;
    }

    return linhas.slice(inicioDados).map((linha) => {
      const colunas = linha.split(separador).map((campo) => campo.trim());
      const dados = { periodo: '', regional: '', churn: '' };

      if (headers.length) {
        headers.forEach((key, idx) => {
          if (key) dados[key] = colunas[idx];
        });
      } else {
        dados.periodo = colunas[0] ?? '';
        dados.regional = colunas[1] ?? '';
        dados.churn = colunas[2] ?? '';
      }

      return dados;
    });
  };

  const processarLoteVendas = async () => {
    limparMensagens();
    if (!textoLoteVendas.trim()) {
      setErro('Informe dados para importacao em lote');
      return;
    }

    const registros = parseLoteVendas(textoLoteVendas);
    if (registros.length === 0) {
      setErro('Nenhuma linha valida para importacao');
      return;
    }

    try {
      setCarregando(true);
      let sucesso = 0;
      let falhas = 0;
      const detalhesFalhas = [];

      registros.forEach((registro, idx) => {
        registro.__linha = idx + 1;
      });

      for (const registro of registros) {
        const periodo = parsePeriodo(registro.periodo);
        const vendedorId = localizarVendedor(registro.vendedor);
        const regionalId = localizarRegional(registro.regional);
        const vendedor = colaboradores.find((c) => c.id === vendedorId);

        if (!periodo || !vendedorId || !regionalId) {
          falhas++;
          detalhesFalhas.push({
            linha: registro.__linha,
            motivo: 'Periodo, vendedor ou regional invalidos'
          });
          continue;
        }

        if (vendedor && vendedor.regional_id !== regionalId) {
          falhas++;
          detalhesFalhas.push({
            linha: registro.__linha,
            motivo: 'Vendedor nao pertence a regional informada'
          });
          continue;
        }

        await vendasMensaisAPI.criar({
          periodo,
          vendedorId,
          regionalId,
          vendasVolume: normalizarNumero(registro.vendasVolume),
          vendasFinanceiro: normalizarNumero(registro.vendasFinanceiro),
          mudancaTitularidadeVolume: normalizarNumero(registro.mudancaTitularidadeVolume),
          mudancaTitularidadeFinanceiro: normalizarNumero(registro.mudancaTitularidadeFinanceiro),
          migracaoTecnologiaVolume: normalizarNumero(registro.migracaoTecnologiaVolume),
          migracaoTecnologiaFinanceiro: normalizarNumero(registro.migracaoTecnologiaFinanceiro),
          renovacaoVolume: normalizarNumero(registro.renovacaoVolume),
          renovacaoFinanceiro: normalizarNumero(registro.renovacaoFinanceiro),
          planoEventoVolume: normalizarNumero(registro.planoEventoVolume),
          planoEventoFinanceiro: normalizarNumero(registro.planoEventoFinanceiro),
          svaVolume: normalizarNumero(registro.svaVolume),
          svaFinanceiro: normalizarNumero(registro.svaFinanceiro),
          telefoniaVolume: normalizarNumero(registro.telefoniaVolume),
          telefoniaFinanceiro: normalizarNumero(registro.telefoniaFinanceiro)
        });
        sucesso++;
      }

      setMensagem(`Importacao concluida: ${sucesso} registros OK, ${falhas} falhas`);
      setFalhasLoteVendas(detalhesFalhas);
      setTextoLoteVendas('');
      setModoLoteVendas(false);
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao importar vendas mensais');
    } finally {
      setCarregando(false);
    }
  };

  const processarLoteChurn = async () => {
    limparMensagens();
    if (!textoLoteChurn.trim()) {
      setErro('Informe dados para importacao de churn');
      return;
    }

    const registros = parseLoteChurn(textoLoteChurn);
    if (registros.length === 0) {
      setErro('Nenhuma linha valida para importacao');
      return;
    }

    try {
      setCarregando(true);
      let sucesso = 0;
      let falhas = 0;
      const detalhesFalhas = [];

      registros.forEach((registro, idx) => {
        registro.__linha = idx + 1;
      });

      for (const registro of registros) {
        const periodo = parsePeriodo(registro.periodo);
        const regionalId = localizarRegional(registro.regional);

        if (!periodo || !regionalId) {
          falhas++;
          detalhesFalhas.push({
            linha: registro.__linha,
            motivo: 'Periodo ou regional invalido'
          });
          continue;
        }

        await churnRegionaisAPI.criarOuAtualizar({
          periodo,
          regionalId,
          churn: normalizarNumero(registro.churn)
        });
        sucesso++;
      }

      setMensagem(`Importacao concluida: ${sucesso} registros OK, ${falhas} falhas`);
      setFalhasLoteChurn(detalhesFalhas);
      setTextoLoteChurn('');
      setModoLoteChurn(false);
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro('Erro ao importar churn');
    } finally {
      setCarregando(false);
    }
  };

  const handleArquivoLote = (e, tipo) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      const conteudo = String(leitor.result || '');
      if (tipo === 'vendas') {
        setTextoLoteVendas(conteudo);
      } else {
        setTextoLoteChurn(conteudo);
      }
    };
    leitor.readAsText(arquivo);
  };

  const vendasFiltradas = useMemo(() => {
    return vendasMensais.filter((registro) => {
      if (filtroPeriodo && registro.periodo !== filtroPeriodo) return false;
      if (filtroRegional && registro.regional_id !== filtroRegional) return false;
      if (filtroVendedor && registro.vendedor_id !== filtroVendedor) return false;
      return true;
    });
  }, [vendasMensais, filtroPeriodo, filtroRegional, filtroVendedor]);

  const churnFiltrado = useMemo(() => {
    if (!filtroPeriodo) return churnRegistros;
    return churnRegistros.filter((registro) => registro.periodo === filtroPeriodo);
  }, [churnRegistros, filtroPeriodo]);

  const exportarCSV = () => {
    const headers = [
      'Periodo',
      'Vendedor',
      'Regional',
      'Vendas Volume',
      'Vendas Financeiro',
      'Mudanca Titularidade Volume',
      'Mudanca Titularidade Financeiro',
      'Migracao Tecnologia Volume',
      'Migracao Tecnologia Financeiro',
      'Renovacao Volume',
      'Renovacao Financeiro',
      'Plano Evento Volume',
      'Plano Evento Financeiro',
      'SVA Volume',
      'SVA Financeiro',
      'Telefonia Volume',
      'Telefonia Financeiro',
      'Churn Regional'
    ];

    const linhas = vendasFiltradas.map((registro) => {
      const churn = churnFiltrado.find((c) => c.regional_id === registro.regional_id)?.churn ?? '';
      const colunas = [
        registro.periodo,
        colaboradoresMap.get(registro.vendedor_id) || '',
        regionaisMap.get(registro.regional_id) || '',
        registro.vendas_volume ?? 0,
        registro.vendas_financeiro ?? 0,
        registro.mudanca_titularidade_volume ?? 0,
        registro.mudanca_titularidade_financeiro ?? 0,
        registro.migracao_tecnologia_volume ?? 0,
        registro.migracao_tecnologia_financeiro ?? 0,
        registro.renovacao_volume ?? 0,
        registro.renovacao_financeiro ?? 0,
        registro.plano_evento_volume ?? 0,
        registro.plano_evento_financeiro ?? 0,
        registro.sva_volume ?? 0,
        registro.sva_financeiro ?? 0,
        registro.telefonia_volume ?? 0,
        registro.telefonia_financeiro ?? 0,
        churn
      ];

      return colunas.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(';');
    });

    const csv = [headers.join(';'), ...linhas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendas_mensais_${filtroPeriodo || 'todos'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
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
        <header className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>📈 Vendas Mensais & Churn</h1>
            <p>Cadastre as vendas por vendedor e o churn por regional</p>
          </div>
          <button 
            type="button"
            className="btn btn-success"
            onClick={() => setModalImportadorAberto(true)}
            style={{ height: 'fit-content' }}
          >
            📥 Importar Excel
          </button>
        </header>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        <div className="glass-card">
          <h3>Cadastro de Vendas Mensais</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Período</label>
                <select
                  name="periodo"
                  className="form-select"
                  value={formData.periodo}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione o período</option>
                  {periodosDisponiveis.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Regional</label>
                <select
                  name="regionalId"
                  className="form-select"
                  value={formData.regionalId}
                  onChange={handleRegionalChange}
                  required
                >
                  <option value="">Selecione</option>
                  {regionais.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendedor</label>
                <select
                  name="vendedorId"
                  className="form-select"
                  value={formData.vendedorId}
                  onChange={handleChange}
                  required
                  disabled={!formData.regionalId}
                >
                  <option value="">Selecione</option>
                  {colaboradoresFiltrados.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Vendas (Volume)</label>
                <input name="vendasVolume" className="form-control" value={formData.vendasVolume} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Vendas (Financeiro)</label>
                <input name="vendasFinanceiro" className="form-control" value={formData.vendasFinanceiro} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Mudanca Titularidade (Volume)</label>
                <input name="mudancaTitularidadeVolume" className="form-control" value={formData.mudancaTitularidadeVolume} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Mudanca Titularidade (Financeiro)</label>
                <input name="mudancaTitularidadeFinanceiro" className="form-control" value={formData.mudancaTitularidadeFinanceiro} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Migracao de Tecnologia (Volume)</label>
                <input name="migracaoTecnologiaVolume" className="form-control" value={formData.migracaoTecnologiaVolume} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Migracao de Tecnologia (Financeiro)</label>
                <input name="migracaoTecnologiaFinanceiro" className="form-control" value={formData.migracaoTecnologiaFinanceiro} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Renovacao (Volume)</label>
                <input name="renovacaoVolume" className="form-control" value={formData.renovacaoVolume} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Renovacao (Financeiro)</label>
                <input name="renovacaoFinanceiro" className="form-control" value={formData.renovacaoFinanceiro} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Plano Evento (Volume)</label>
                <input name="planoEventoVolume" className="form-control" value={formData.planoEventoVolume} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Plano Evento (Financeiro)</label>
                <input name="planoEventoFinanceiro" className="form-control" value={formData.planoEventoFinanceiro} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">SVA (Volume)</label>
                <input name="svaVolume" className="form-control" value={formData.svaVolume} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">SVA (Financeiro)</label>
                <input name="svaFinanceiro" className="form-control" value={formData.svaFinanceiro} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefonia (Volume)</label>
                <input name="telefoniaVolume" className="form-control" value={formData.telefoniaVolume} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefonia (Financeiro)</label>
                <input name="telefoniaFinanceiro" className="form-control" value={formData.telefoniaFinanceiro} onChange={handleChange} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-success" disabled={carregando}>
                {editandoVendaId ? '✓ Atualizar' : '✓ Registrar'}
              </button>
              {editandoVendaId && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelarEdicao}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="glass-card">
          <h3>Importacao em Lote - Vendas (Texto)</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => setModoLoteVendas(!modoLoteVendas)}>
              📋 {modoLoteVendas ? 'Ocultar' : 'Mostrar'} Importacao Lote
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setTextoLoteVendas('')}>
              Limpar texto
            </button>
          </div>
          {modoLoteVendas && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Formato: Periodo | Vendedor | Regional | Vendas Volume | Vendas Financeiro | (demais campos opcionais)
              </p>
              <textarea
                className="form-control"
                rows="8"
                value={textoLoteVendas}
                onChange={(e) => setTextoLoteVendas(e.target.value)}
                placeholder="Fev/26;João Silva;São Paulo;100;5000&#10;Fev/26;Maria Santos;Rio de Janeiro;80;4000"
                style={{ fontFamily: 'monospace', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input type="file" accept=".csv,.txt" onChange={(e) => handleArquivoLote(e, 'vendas')} />
                <button type="button" className="btn btn-success" onClick={processarLoteVendas} disabled={carregando}>
                  ✓ Importar Vendas em Lote
                </button>
              </div>
              {falhasLoteVendas.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div className="alert alert-warning">
                    Algumas linhas falharam na importacao. Revise a lista abaixo.
                  </div>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Linha</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {falhasLoteVendas.map((falha, idx) => (
                          <tr key={`${falha.linha}-${idx}`}>
                            <td>{falha.linha}</td>
                            <td>{falha.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <ImportadorVendas
          onImportar={handleImportarVendas}
          regionais={regionais}
          colaboradores={colaboradores}
          carregando={carregando}
        />

        <div className="glass-card">
          <h3>Cadastro de Churn por Regional</h3>
          <form onSubmit={handleSalvarChurn}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Período</label>
                <select
                  name="periodo"
                  className="form-select"
                  value={churnForm.periodo}
                  onChange={handleChurnChange}
                  required
                >
                  <option value="">Selecione o período</option>
                  {periodosDisponiveis.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Regional</label>
                <select
                  name="regionalId"
                  className="form-select"
                  value={churnForm.regionalId}
                  onChange={handleChurnChange}
                  required
                >
                  <option value="">Selecione</option>
                  {regionais.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Churn</label>
                <input
                  name="churn"
                  className="form-control"
                  value={churnForm.churn}
                  onChange={handleChurnChange}
                  placeholder="2.5"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-success" disabled={carregando}>
                ✓ Salvar Churn
              </button>
            </div>
          </form>
        </div>

        <div className="glass-card">
          <h3>Importacao em Lote - Churn</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => setModoLoteChurn(!modoLoteChurn)}>
              📋 {modoLoteChurn ? 'Ocultar' : 'Mostrar'} Importacao
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setTextoLoteChurn('')}>
              Limpar texto
            </button>
          </div>
          {modoLoteChurn && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Formato: Periodo | Regional | Churn
              </p>
              <textarea
                className="form-control"
                rows="6"
                value={textoLoteChurn}
                onChange={(e) => setTextoLoteChurn(e.target.value)}
                placeholder="Fev/26;Sao Paulo;2.5"
                style={{ fontFamily: 'monospace', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input type="file" accept=".csv,.txt" onChange={(e) => handleArquivoLote(e, 'churn')} />
                <button type="button" className="btn btn-success" onClick={processarLoteChurn} disabled={carregando}>
                  ✓ Importar Churn
                </button>
              </div>
              {falhasLoteChurn.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div className="alert alert-warning">
                    Algumas linhas falharam na importacao. Revise a lista abaixo.
                  </div>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Linha</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {falhasLoteChurn.map((falha, idx) => (
                          <tr key={`${falha.linha}-${idx}`}>
                            <td>{falha.linha}</td>
                            <td>{falha.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Registros do Periodo</h3>
            <select
              className="form-select"
              style={{ maxWidth: '160px' }}
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
            >
              <option value="">Todos os períodos</option>
              {periodosDisponiveis.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ maxWidth: '200px' }}
              value={filtroRegional}
              onChange={(e) => setFiltroRegional(e.target.value)}
            >
              <option value="">Todas as regionais</option>
              {regionais.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ maxWidth: '220px' }}
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
            >
              <option value="">Todos os vendedores</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <button className="btn btn-secondary" type="button" onClick={exportarCSV}>
              ⬇️ Exportar CSV
            </button>
            {selecionadosVendas.size > 0 && (
              <button className="btn btn-danger" type="button" onClick={deletarVendasEmMassa} disabled={carregando}>
                🗑️ Deletar Selecionados ({selecionadosVendas.size})
              </button>
            )}
          </div>

          {carregando ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        onChange={selecionarTodasVendas}
                        checked={selecionadosVendas.size === vendasFiltradas.length && vendasFiltradas.length > 0}
                      />
                    </th>
                    <th>Periodo</th>
                    <th>Vendedor</th>
                    <th>Regional</th>
                    <th>Vendas</th>
                    <th>Vendas R$</th>
                    <th>Churn</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasFiltradas.length === 0 ? (
                    <tr><td colSpan="8">Nenhum registro encontrado</td></tr>
                  ) : (
                    vendasFiltradas.map((registro) => (
                      <tr key={registro.id}>
                        <td style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selecionadosVendas.has(registro.id)}
                            onChange={(e) => selecionarVenda(registro.id, e.target.checked)}
                          />
                        </td>
                        <td>{registro.periodo}</td>
                        <td>{colaboradoresMap.get(registro.vendedor_id) || '—'}</td>
                        <td>{regionaisMap.get(registro.regional_id) || '—'}</td>
                        <td>{registro.vendas_volume || 0}</td>
                        <td>{registro.vendas_financeiro || 0}</td>
                        <td>{
                          churnFiltrado.find((c) => c.regional_id === registro.regional_id)?.churn ?? '—'
                        }</td>
                        <td>
                          <button className="btn btn-secondary btn-small" onClick={() => handleEditarVenda(registro)}>
                            ✏️ Editar
                          </button>
                          <button className="btn btn-danger btn-small" onClick={() => handleDeletarVenda(registro.id)} style={{ marginLeft: '8px' }}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Churn por Regional</h3>
            {selecionadosChurn.size > 0 && (
              <button className="btn btn-danger" type="button" onClick={deletarChurnEmMassa} disabled={carregando}>
                🗑️ Deletar Selecionados ({selecionadosChurn.size})
              </button>
            )}
          </div>
          {carregando ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        onChange={selecionarTodosChurn}
                        checked={selecionadosChurn.size === churnFiltrado.length && churnFiltrado.length > 0}
                      />
                    </th>
                    <th>Periodo</th>
                    <th>Regional</th>
                    <th>Churn</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {churnFiltrado.length === 0 ? (
                    <tr><td colSpan="5">Nenhum churn encontrado</td></tr>
                  ) : (
                    churnFiltrado.map((registro) => (
                      <tr key={registro.id}>
                        <td style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selecionadosChurn.has(registro.id)}
                            onChange={(e) => selecionarChurn(registro.id, e.target.checked)}
                          />
                        </td>
                        <td>{registro.periodo}</td>
                        <td>{regionaisMap.get(registro.regional_id) || '—'}</td>
                        <td>{registro.churn}</td>
                        <td>
                          <button className="btn btn-danger btn-small" onClick={() => handleDeletarChurn(registro.id)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {modalImportadorAberto && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            overflowY: 'auto',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '2px solid #007bff'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px',
                borderBottom: '2px solid #007bff',
                position: 'sticky',
                top: 0,
                backgroundColor: '#f8f9fa',
                zIndex: 10000
              }}>
                <h2 style={{ margin: 0, color: '#333' }}>📥 Importar Vendas</h2>
                <button
                  type="button"
                  onClick={() => setModalImportadorAberto(false)}
                  style={{
                    fontSize: '24px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <ImportadorVendas
                  onImportar={handleImportarVendas}
                  regionais={regionais}
                  colaboradores={colaboradores}
                  carregando={carregando}
                  periodosDisponiveis={periodosDisponiveis}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
