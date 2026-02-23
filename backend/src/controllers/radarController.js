// ===================================================================
// CONTROLADOR DE RADAR ESTRATÉGICO
// ===================================================================
// Funções para gerenciar itens do radar

const XLSX = require('xlsx');
const Radar = require('../models/Radar');
const calcularStatus = require('../utils/calcularStatus');
const { converterData } = require('../utils/converterDatas');
const registrarLog = require('../utils/registrarLog');
const { obterRadarOpcoes } = require('../utils/radarOpcoes');

// Função auxiliar para normalizar nomes de colunas (remover espaços, caracteres especiais e converter para camelCase)
// Função auxiliar para normalizar nomes de colunas
function normalizeColumnName(name) {
  if (!name) return '';
  // Remove acentos, caracteres especiais, e converte para camelCase
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '') // Remove caracteres especiais, mantém espaços
    .toLowerCase() // Converte para minúsculas
    .replace(/ (\w)/g, (match, p1) => p1.toUpperCase()); // Converte a primeira letra de cada palavra após um espaço para maiúscula (camelCase)
}

function normalizeLabel(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mapToCanonical(value, options) {
  const normalized = normalizeLabel(value);
  if (!normalized) return null;
  return options.find(option => normalizeLabel(option) === normalized) || null;
}

function normalizeText(value) {
  if (value === null || value === undefined) return value;
  return String(value).trim();
}

function normalizePayloadFields(dados, fields) {
  fields.forEach((field) => {
    if (dados[field] !== undefined && dados[field] !== null) {
      dados[field] = normalizeText(dados[field]);
    }
  });
}

// GET /radar - Lista todos os itens do radar (visao global)
exports.listar = async (req, res) => {
  try {
    const itens = await Radar.listarPorUsuario();

    return res.status(200).json({
      itens,
      total: itens.length
    });
  } catch (erro) {
    console.error('Erro ao listar radar:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao listar itens do radar' 
    });
  }
};

// POST /radar - Cria um novo item no radar
exports.criar = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const dados = req.body;

    normalizePayloadFields(dados, ['camada', 'prioridade', 'tipo', 'acao', 'equipe', 'responsavel', 'observacao', 'linkBitrix', 'status', 'kanban']);

    const {
      camadas: CAMADAS,
      tipos: TIPOS,
      equipes: EQUIPES,
      responsaveis: RESPONSAVEIS,
      prioridadesCamada1: PRIORIDADES_CAMADA1
    } = await obterRadarOpcoes();

    // Validações obrigatórias básicas
    if (!dados.camada || !dados.tipo || !dados.acao || !dados.equipe || !dados.responsavel || !dados.concluirAte) {
      return res.status(400).json({ erro: 'Campos obrigatórios: camada, tipo, acao, equipe, responsavel, concluirAte' });
    }

    // Valida camada permitida (aceita variações de formato)
    const camadaCanonica = mapToCanonical(dados.camada, CAMADAS);
    if (!camadaCanonica) {
      return res.status(400).json({ erro: 'Camada inválida' });
    }
    dados.camada = camadaCanonica;

    // Valida tipo/equipe/responsavel (aceita variações de formato)
    const tipoCanonico = mapToCanonical(dados.tipo, TIPOS);
    if (!tipoCanonico) {
      return res.status(400).json({ erro: 'Tipo inválido' });
    }
    dados.tipo = tipoCanonico;

    const equipeCanonica = mapToCanonical(dados.equipe, EQUIPES);
    if (!equipeCanonica) {
      return res.status(400).json({ erro: 'Equipe inválida' });
    }
    dados.equipe = equipeCanonica;

    const responsavelCanonico = mapToCanonical(dados.responsavel, RESPONSAVEIS);
    if (!responsavelCanonico) {
      return res.status(400).json({ erro: 'Responsável inválido' });
    }
    dados.responsavel = responsavelCanonico;

    // Regras para prioridade: somente válida para CAMADA 1
    if (dados.camada === CAMADAS[0]) {
      const prioridadeCanonica = mapToCanonical(dados.prioridade, PRIORIDADES_CAMADA1);
      if (!prioridadeCanonica) {
        return res.status(400).json({ erro: 'Prioridade obrigatória e válida para CAMADA 1' });
      }
      dados.prioridade = prioridadeCanonica;
    } else {
      // Para camadas 2/3/4 prioridade deve ser null
      dados.prioridade = null;
    }

    // Calcula o status automaticamente
    const hoje = new Date();
    const dataPrazo = new Date(dados.concluirAte);
    const dias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));
    const statusCalculado = calcularStatus(dados.kanban || 'Backlog', dias);
    dados.status = statusCalculado;
    const novoId = await Radar.criar(dados, usuarioId);

    // Busca o item criado para retornar com status calculado
    const novoItem = await Radar.buscarPorId(novoId, usuarioId);

    await registrarLog(req.usuario?.email || req.usuario?.nome, 'CRIAR_RADAR', novoId);

    return res.status(201).json({
      mensagem: 'Item criado com sucesso',
      item: novoItem
    });
  } catch (erro) {
    console.error('Erro ao criar radar:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao criar item' 
    });
  }
};

// GET /radar/:id - Busca um item específico
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Radar.buscarPorId(id);

    if (!item) {
      return res.status(404).json({ 
        erro: 'Item não encontrado' 
      });
    }

    return res.status(200).json({ item });
  } catch (erro) {
    console.error('Erro ao buscar item:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao buscar item' 
    });
  }
};

// PUT /radar/:id - Atualiza um item (principalmente o kanban)
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    normalizePayloadFields(dados, ['camada', 'prioridade', 'tipo', 'acao', 'equipe', 'responsavel', 'observacao', 'linkBitrix', 'status', 'kanban']);

    const {
      camadas: CAMADAS,
      tipos: TIPOS,
      equipes: EQUIPES,
      responsaveis: RESPONSAVEIS,
      prioridadesCamada1: PRIORIDADES_CAMADA1
    } = await obterRadarOpcoes();

    // Se alteração de camada está sendo feita, aplicar regras sobre subprioridade
    if (dados.camada) {
      const camadaCanonica = mapToCanonical(dados.camada, CAMADAS);
      if (!camadaCanonica) {
        return res.status(400).json({ erro: 'Camada inválida' });
      }
      dados.camada = camadaCanonica;

      if (dados.camada === CAMADAS[0]) {
        // CAMADA 1 exige prioridade válida
        const prioridadeCanonica = mapToCanonical(dados.prioridade, PRIORIDADES_CAMADA1);
        if (!prioridadeCanonica) {
          return res.status(400).json({ erro: 'Prioridade obrigatória para CAMADA 1' });
        }
        dados.prioridade = prioridadeCanonica;
      } else {
        // Para outras camadas limpar prioridade
        dados.prioridade = null;
      }
    }

    if (dados.tipo) {
      const tipoCanonico = mapToCanonical(dados.tipo, TIPOS);
      if (!tipoCanonico) {
        return res.status(400).json({ erro: 'Tipo inválido' });
      }
      dados.tipo = tipoCanonico;
    }

    if (dados.equipe) {
      const equipeCanonica = mapToCanonical(dados.equipe, EQUIPES);
      if (!equipeCanonica) {
        return res.status(400).json({ erro: 'Equipe inválida' });
      }
      dados.equipe = equipeCanonica;
    }

    if (dados.responsavel) {
      const responsavelCanonico = mapToCanonical(dados.responsavel, RESPONSAVEIS);
      if (!responsavelCanonico) {
        return res.status(400).json({ erro: 'Responsável inválido' });
      }
      dados.responsavel = responsavelCanonico;
    }

    // Verifica se o item pertence ao usuário
    const itemExistente = await Radar.buscarPorId(id);

    if (!itemExistente) {
      return res.status(404).json({ 
        erro: 'Item não encontrado' 
      });
    }

    // Calcula o status automaticamente baseado no kanban e prazo atualizados
    const kanbanAtual = dados.kanban || itemExistente.kanban;
    const prazAtual = dados.concluirAte || itemExistente.concluirAte;
    const hoje = new Date();
    const dataPrazo = new Date(prazAtual);
    const dias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));
    const statusCalculado = calcularStatus(kanbanAtual, dias);
    dados.status = statusCalculado;
    await Radar.atualizar(id, dados);

    if (dados.kanban && dados.kanban !== itemExistente.kanban) {
      await registrarLog(req.usuario?.email || req.usuario?.nome, 'MOVER_KANBAN', id);
    } else {
      await registrarLog(req.usuario?.email || req.usuario?.nome, 'EDITAR_RADAR', id);
    }

    // Busca o item atualizado
    const itemAtualizado = await Radar.buscarPorId(id);

    return res.status(200).json({
      mensagem: 'Item atualizado com sucesso',
      item: itemAtualizado
    });
  } catch (erro) {
    console.error('Erro ao atualizar radar:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao atualizar item' 
    });
  }
};

// DELETE /radar/:id - Deleta um item
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    // Verifica se o item existe
    const item = await Radar.buscarPorId(id);

    if (!item) {
      return res.status(404).json({ 
        erro: 'Item não encontrado' 
      });
    }

    // Deleta o item
    await Radar.deletar(id);
    await registrarLog(req.usuario?.email || req.usuario?.nome, 'DELETAR_RADAR', id);

    return res.status(200).json({
      mensagem: 'Item deletado com sucesso'
    });
  } catch (erro) {
    console.error('Erro ao deletar radar:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao deletar item' 
    });
  }
};

// DELETE /radar - Deleta todos os itens (somente admin)
exports.deletarTodos = async (req, res) => {
  try {
    const totalDeletados = await Radar.deletarTodos();

    return res.status(200).json({
      mensagem: 'Itens deletados com sucesso',
      itensDeletados: totalDeletados
    });
  } catch (erro) {
    console.error('Erro ao deletar todos os itens do radar:', erro);
    return res.status(500).json({ erro: 'Erro ao deletar itens' });
  }
};

// POST /radar/preparar-importacao - Analisa Excel e retorna colunas para mapeamento
exports.prepararImportacao = async (req, res) => {
  console.log('Iniciando prepararImportacao. Conteúdo de req.files:', req.files);
  try {
    // Verifica se arquivo foi enviado
    if (!req.files || !req.files.arquivo) {
      return res.status(400).json({ 
        erro: 'Nenhum arquivo enviado' 
      });
    }

    const arquivo = req.files.arquivo;

    // Valida extensão
    if (!arquivo.name.endsWith('.xlsx') && !arquivo.name.endsWith('.xls')) {
      return res.status(400).json({ 
        erro: 'Apenas arquivos .xlsx ou .xls são aceitos' 
      });
    }

    // Lê o arquivo Excel como array de arrays para controle manual dos cabeçalhos
    let livro;
    let dadosRaw;
    try {
      livro = XLSX.read(arquivo.data, { type: 'buffer' });
      const planilha = livro.Sheets[livro.SheetNames[0]];
      // Lê como array de arrays para processar cabeçalhos manualmente
      dadosRaw = XLSX.utils.sheet_to_json(planilha, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }); 
    } catch (xlsxError) {
      console.error('Erro ao ler ou converter arquivo Excel com XLSX (prepararImportacao):', xlsxError);
      return res.status(500).json({ 
        erro: 'Erro ao processar o conteúdo do arquivo Excel' 
      });
    }

    if (!dadosRaw || dadosRaw.length === 0) {
      return res.status(400).json({ 
        erro: 'Planilha vazia ou sem cabeçalhos' 
      });
    }

    // Extrai e normaliza os cabeçalhos, tratando duplicatas
    const headersRaw = dadosRaw[0];
    const headersNormalizedMap = new Map(); // Mapa para armazenar original -> {normalizedName, index}
    const colunasDisponiveis = [];

    headersRaw.forEach((header, index) => {
      if (header) {
        const originalHeader = String(header).trim();
        const normalized = normalizeColumnName(originalHeader);
        
        // Tratar duplicatas: adicionar um sufixo numérico (ex: acao, acao1, acao2)
        let finalNormalized = normalized;
        let counter = 1;
        while (colunasDisponiveis.includes(finalNormalized)) {
          finalNormalized = `${normalized}${counter}`;
          counter++;
        }

        colunasDisponiveis.push(finalNormalized);
        headersNormalizedMap.set(originalHeader, { name: finalNormalized, index: index });
      }
    });

    // Campos esperados do sistema
    const camposEsperados = [
      { campo: 'camada', obrigatorio: true, descricao: 'Camada' },
      { campo: 'prioridade', obrigatorio: false, descricao: 'Prioridade' },
      { campo: 'tipo', obrigatorio: true, descricao: 'Tipo' },
      { campo: 'acao', obrigatorio: true, descricao: 'Ação' },
      { campo: 'equipe', obrigatorio: true, descricao: 'Equipe' },
      { campo: 'responsavel', obrigatorio: true, descricao: 'Responsável' },
      { campo: 'concluirAte', obrigatorio: true, descricao: 'Concluir até' },
      { campo: 'kanban', obrigatorio: false, descricao: 'Status Kanban' },
      { campo: 'observacao', obrigatorio: false, descricao: 'Observação' },
      { campo: 'linkBitrix', obrigatorio: false, descricao: 'Link Bitrix' }
    ];

    // Prepara o preview usando os dados (a partir da segunda linha) e os cabeçalhos normalizados
    const previewRaw = dadosRaw.slice(1, Math.min(4, dadosRaw.length)); // Pega no máximo 3 linhas de dados
    const preview = previewRaw.map(row => {
      const newRow = {};
      headersRaw.forEach((originalHeader, index) => {
        if (headersNormalizedMap.has(originalHeader)) {
          const { name: normalizedName } = headersNormalizedMap.get(originalHeader);
          newRow[normalizedName] = row[index];
        }
      });
      return newRow;
    });

    return res.status(200).json({
      mensagem: 'Arquivo analisado com sucesso',
      colunasDisponiveis,
      camposEsperados,
      preview,
      totalLinhas: dadosRaw.length - 1, // Exclui a linha de cabeçalho
      originalHeaders: headersRaw, // Adiciona os cabeçalhos originais
      headersNormalizedMap: Object.fromEntries(headersNormalizedMap) // Envia o mapa para o frontend
    });
  } catch (erro) {
    console.error('Erro ao preparar importação (geral):', erro);
    return res.status(500).json({ 
      erro: 'Erro ao analisar arquivo' 
    });
  }
};

// POST /radar/importar-excel - Importa itens de um arquivo Excel com mapeamento
exports.importarExcel = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    // Verifica se arquivo foi enviado
    if (!req.files || !req.files.arquivo) {
      return res.status(400).json({ 
        erro: 'Nenhum arquivo enviado' 
      });
    }

    // Recebe o mapeamento do frontend (que deve vir como JSON string)
    let mapeamento = req.body.mapeamento;

    if (!mapeamento) {
      return res.status(400).json({ 
        erro: 'Mapeamento de colunas não fornecido' 
      });
    }

    // Se mapeamento é string, fazer parse
    if (typeof mapeamento === 'string') {
      try {
        mapeamento = JSON.parse(mapeamento);
      } catch (e) {
        console.error('Erro ao fazer parse do mapeamento:', e);
        return res.status(400).json({ 
          erro: 'Mapeamento inválido (não é um JSON válido)' 
        });
      }
    }

    if (typeof mapeamento !== 'object') {
      return res.status(400).json({ 
        erro: 'Mapeamento deve ser um objeto' 
      });
    }

    const arquivo = req.files.arquivo;

    // Valida extensão
    if (!arquivo.name.endsWith('.xlsx') && !arquivo.name.endsWith('.xls')) {
      return res.status(400).json({ 
        erro: 'Apenas arquivos .xlsx ou .xls são aceitos' 
      });
    }

    // Lê o arquivo Excel como array de arrays
    let livro;
    let dadosRaw;
    try {
      livro = XLSX.read(arquivo.data, { type: 'buffer' });
      const planilha = livro.Sheets[livro.SheetNames[0]];
      dadosRaw = XLSX.utils.sheet_to_json(planilha, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }); // Lê como array de arrays
    } catch (xlsxError) {
      console.error('Erro ao ler ou converter arquivo Excel com XLSX durante importação:', xlsxError);
      return res.status(500).json({ 
        erro: 'Erro ao processar o conteúdo do arquivo Excel para importação' 
      });
    }

    if (!dadosRaw || dadosRaw.length < 2) { // Pelo menos 2 linhas (cabeçalho + 1 dado)
      return res.status(400).json({ 
        erro: 'Planilha vazia ou sem dados para importação' 
      });
    }

    // Extrai e normaliza os cabeçalhos da planilha para usar no mapeamento
    const headersRaw = dadosRaw[0];
    const headersNormalizedMap = new Map(); // Mapa para armazenar original -> {normalizedName, index}
    // Reconstroi o mapa de normalização de cabeçalhos para esta importação
    headersRaw.forEach((header, index) => {
      if (header) {
        const originalHeader = String(header).trim();
        const normalized = normalizeColumnName(originalHeader);
        
        let finalNormalized = normalized;
        let counter = 1;
        // Verifica se o nome normalizado já foi usado (para tratar duplicatas de nomes originais)
        // É importante que este map contenha tanto o nome normalizado quanto o índice da coluna
        while (Array.from(headersNormalizedMap.values()).some(h => h.name === finalNormalized)) {
          finalNormalized = `${normalized}${counter}`;
          counter++;
        }

        headersNormalizedMap.set(originalHeader, { name: finalNormalized, index: index });
      }
    });

    const {
      camadas: CAMADAS,
      tipos: TIPOS,
      equipes: EQUIPES,
      responsaveis: RESPONSAVEIS,
      prioridadesCamada1: PRIORIDADES_CAMADA1
    } = await obterRadarOpcoes();

    const itensImportados = [];
    const erros = [];

    // Processa cada linha de dados do Excel (ignora a primeira linha de cabeçalho)
    for (let i = 1; i < dadosRaw.length; i++) {
      try {
        const linhaRaw = dadosRaw[i];
        const item = {};

        // Transforma os dados com mapeamento do usuário (colunaPlanilhaOriginal é o nome EXATO do Excel)
        for (const [campoSistema, colunaPlanilhaOriginal] of Object.entries(mapeamento)) {
          const headerInfo = headersNormalizedMap.get(colunaPlanilhaOriginal);
          if (headerInfo && linhaRaw[headerInfo.index] !== undefined) {
            item[campoSistema] = linhaRaw[headerInfo.index];
          }
        }

        // Converter datas
        if (item.concluirAte) {
          item.concluirAte = converterData(item.concluirAte);
        }
        // Adicionar dataCriacao
        item.dataCriacao = new Date().toISOString().split('T')[0];

        console.log(`[Importação] Linha ${i + 1}: item.camada = '${item.camada}', item.prioridade = '${item.prioridade}'`);

        if (!item.camada || !item.tipo || !item.acao || !item.equipe || !item.responsavel || !item.concluirAte) {
          erros.push(`Linha ${i + 1}: Campos obrigatórios faltando (camada, tipo, acao, equipe, responsavel, concluirAte)`);
          continue;
        }

        const camadaCanonica = mapToCanonical(item.camada, CAMADAS);
        if (!camadaCanonica) {
          erros.push(`Linha ${i + 1}: Camada inválida ('${item.camada}')`);
          continue;
        }
        item.camada = camadaCanonica;

        const tipoCanonico = mapToCanonical(item.tipo, TIPOS);
        if (!tipoCanonico) {
          erros.push(`Linha ${i + 1}: Tipo inválido ('${item.tipo}')`);
          continue;
        }
        item.tipo = tipoCanonico;

        const equipeCanonica = mapToCanonical(item.equipe, EQUIPES);
        if (!equipeCanonica) {
          erros.push(`Linha ${i + 1}: Equipe inválida ('${item.equipe}')`);
          continue;
        }
        item.equipe = equipeCanonica;

        const responsavelCanonico = mapToCanonical(item.responsavel, RESPONSAVEIS);
        if (!responsavelCanonico) {
          erros.push(`Linha ${i + 1}: Responsável inválido ('${item.responsavel}')`);
          continue;
        }
        item.responsavel = responsavelCanonico;

        if (item.camada === CAMADAS[0]) {
          const prioridadeCanonica = mapToCanonical(item.prioridade, PRIORIDADES_CAMADA1);
          if (!prioridadeCanonica) {
            erros.push(`Linha ${i + 1}: Prioridade inválida/obrigatória para CAMADA 1 ('${item.prioridade}')`);
            continue;
          }
          item.prioridade = prioridadeCanonica;
        } else {
          item.prioridade = null;
        }

        // Calcula o status automaticamente
        const hoje = new Date();
        const dataPrazo = new Date(item.concluirAte);
        const dias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));
        const statusCalculado = calcularStatus(item.kanban || 'Backlog', dias);
        item.status = statusCalculado;

        // Cria o item
        const novoId = await Radar.criar(item, usuarioId);
        itensImportados.push(novoId);
      } catch (erro) {
        console.error(`Erro ao processar linha ${i + 1} na importação:`, erro);
        erros.push(`Linha ${i + 1}: ${erro.message}`);
      }
    }

    return res.status(200).json({
      mensagem: 'Importação concluída',
      itensImportados: itensImportados.length,
      erros: erros.length > 0 ? erros : undefined
    });
  } catch (erro) {
    console.error('Erro ao importar Excel (geral):', erro);
    return res.status(500).json({ 
      erro: 'Erro ao importar arquivo' 
    });
  }
};

// GET /radar/estatisticas/dashboard - Retorna estatísticas do dashboard
exports.obterEstatisticas = async (req, res) => {
  try {
    const stats = await Radar.obterEstatisticas();

    return res.status(200).json(stats);
  } catch (erro) {
    console.error('Erro ao obter estatísticas:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao obter estatísticas' 
    });
  }
};
