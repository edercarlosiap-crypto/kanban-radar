// ===================================================================
// CONTROLADOR DE RELATORIOS
// ===================================================================

const Radar = require('../models/Radar');

const aplicarFiltros = (itens, filtros) => {
  const { camada, diretoria, responsavel, status } = filtros;

  return itens.filter((item) => {
    if (camada && item.camada !== camada) return false;
    if (diretoria && item.equipe !== diretoria) return false;
    if (responsavel && item.responsavel !== responsavel) return false;
    if (status && status !== 'todos' && item.status !== status) return false;
    return true;
  });
};

const normalizarStatus = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const obterLabelStatus = (item) => {
  if (item?.status) return item.status;
  if (item?.statusRadar) return item.statusRadar;
  return '';
};

const statusCategoria = (item) => {
  const status = obterLabelStatus(item);
  const normalizado = normalizarStatus(status);

  if (normalizado.includes('atrasado')) return 'atrasados';
  if (normalizado.includes('em andamento') || normalizado.includes('andamento')) return 'andamento';
  if (normalizado.includes('nao iniciado')) return 'naoIniciado';
  if (normalizado.includes('finalizado') || normalizado.includes('concluido')) return 'noPrazo';

  if (item?.indicador === 'vermelho-atrasado') return 'atrasados';
  if (typeof item?.diasRestantes === 'number' && item.diasRestantes < 0) return 'atrasados';

  const statusRadarNorm = normalizarStatus(item?.statusRadar || '');
  if (statusRadarNorm.includes('andamento')) return 'andamento';
  if (statusRadarNorm.includes('nao iniciado')) return 'naoIniciado';
  if (statusRadarNorm.includes('concluido')) return 'noPrazo';

  return 'indefinido';
};

const obterMesChave = (dataStr) => {
  if (!dataStr) return null;
  const data = new Date(dataStr);
  if (Number.isNaN(data.getTime())) return null;
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
};

exports.visaoGeral = async (req, res) => {
  try {
    const itens = await Radar.listarPorUsuario();
    const filtrados = aplicarFiltros(itens, req.query);

    const status = {
      noPrazo: 0,
      atrasados: 0,
      andamento: 0,
      naoIniciado: 0
    };

    filtrados.forEach((item) => {
      const categoria = statusCategoria(item);
      if (categoria && status[categoria] !== undefined) {
        status[categoria] += 1;
      }
    });

    const porCamadaMap = new Map();
    filtrados.forEach((item) => {
      const chave = item.camada || 'Nao informado';
      porCamadaMap.set(chave, (porCamadaMap.get(chave) || 0) + 1);
    });

    const porCamada = Array.from(porCamadaMap.entries()).map(([camada, total]) => ({
      camada,
      total
    }));

    return res.status(200).json({ status, porCamada });
  } catch (erro) {
    console.error('Erro no relatorio visao-geral:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar relatorio' });
  }
};

exports.riscos = async (req, res) => {
  try {
    const itens = await Radar.listarPorUsuario();
    const filtrados = aplicarFiltros(itens, req.query);

    const riscos = filtrados.filter((item) => {
      const atrasado = item.status && item.status.includes('atrasado');
      const critico = item.diasRestantes !== null && item.diasRestantes <= 3;
      return atrasado || critico;
    });

    return res.status(200).json({ itens: riscos });
  } catch (erro) {
    console.error('Erro no relatorio riscos:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar relatorio' });
  }
};

exports.pessoas = async (req, res) => {
  try {
    const itens = await Radar.listarPorUsuario();
    const filtrados = aplicarFiltros(itens, req.query);

    const mapa = new Map();

    filtrados.forEach((item) => {
      const responsavel = item.responsavel || 'Nao informado';
      if (!mapa.has(responsavel)) {
        mapa.set(responsavel, { responsavel, emAndamento: 0, atrasados: 0, finalizados: 0 });
      }
      const registro = mapa.get(responsavel);

      if (item.status && item.status.includes('atrasado')) {
        registro.atrasados += 1;
      } else if (item.status && item.status.startsWith('Finalizado')) {
        registro.finalizados += 1;
      } else if (item.status && item.status.startsWith('Em andamento')) {
        registro.emAndamento += 1;
      }
    });

    const pessoas = Array.from(mapa.values());

    return res.status(200).json({ pessoas });
  } catch (erro) {
    console.error('Erro no relatorio pessoas:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar relatorio' });
  }
};

exports.diretorias = async (req, res) => {
  try {
    const itens = await Radar.listarPorUsuario();
    const filtrados = aplicarFiltros(itens, req.query);

    const mapa = new Map();

    filtrados.forEach((item) => {
      const diretoria = item.equipe || 'Nao informado';
      if (!mapa.has(diretoria)) {
        mapa.set(diretoria, { diretoria, total: 0, atrasados: 0, percentualNoPrazo: 0 });
      }
      const registro = mapa.get(diretoria);
      registro.total += 1;

      if (item.status && item.status.includes('atrasado')) {
        registro.atrasados += 1;
      }
    });

    const diretorias = Array.from(mapa.values()).map((registro) => {
      const noPrazo = registro.total - registro.atrasados;
      const percentual = registro.total > 0 ? Math.round((noPrazo / registro.total) * 100) : 0;
      return {
        ...registro,
        percentualNoPrazo: percentual
      };
    });

    return res.status(200).json({ diretorias });
  } catch (erro) {
    console.error('Erro no relatorio diretorias:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar relatorio' });
  }
};

exports.timeline = async (req, res) => {
  try {
    const itens = await Radar.listarPorUsuario();
    const filtrados = aplicarFiltros(itens, req.query);

    const mapa = new Map();

    filtrados.forEach((item) => {
      const inicio = obterMesChave(item.dataCriacao);
      const fim = obterMesChave(item.concluirAte);

      if (inicio) {
        if (!mapa.has(inicio)) {
          mapa.set(inicio, { mes: inicio, iniciados: 0, finais: 0 });
        }
        mapa.get(inicio).iniciados += 1;
      }

      if (fim) {
        if (!mapa.has(fim)) {
          mapa.set(fim, { mes: fim, iniciados: 0, finais: 0 });
        }
        mapa.get(fim).finais += 1;
      }
    });

    const timeline = Array.from(mapa.values()).sort((a, b) => a.mes.localeCompare(b.mes));

    return res.status(200).json({ timeline });
  } catch (erro) {
    console.error('Erro no relatorio timeline:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar relatorio' });
  }
};
