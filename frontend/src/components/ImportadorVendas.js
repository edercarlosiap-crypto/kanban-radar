import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import '../styles/ImportadorVendas.css';

const CIDADE_REGIONAL_PADRAO = {
  "alta floresta d'oeste": 'ALTA FLORESTA DOESTE',
  'alto alegre dos parecis': 'ALTA FLORESTA DOESTE',
  "alvorada d'oeste": 'ALVORADA DOESTE',
  ariquemes: '',
  buritis: '',
  cacoal: 'ROLIM DE MOURA',
  castanheiras: 'PRESIDENTE MEDICI',
  cujubim: 'MACHADINHO DOESTE',
  "espigao d'oeste": '',
  'guajara-mirim': '',
  jaru: 'JARU',
  'ji-parana': 'JI-PARANA',
  "machadinho d'oeste": 'MACHADINHO DOESTE',
  'mirante da serra': '',
  "nova brasilandia d'oeste": 'NOVA BRASILANDIA',
  'nova uniao': '',
  'novo horizonte do oeste': 'ROLIM DE MOURA',
  'ouro preto do oeste': 'OURO PRETO',
  parecis: 'ROLIM DE MOURA',
  'pimenta bueno': 'ROLIM DE MOURA',
  'porto velho': '',
  'presidente medici': 'PRESIDENTE MEDICI',
  'primavera de rondonia': 'ROLIM DE MOURA',
  'rolim de moura': 'ROLIM DE MOURA',
  "santa luzia d'oeste": 'ROLIM DE MOURA',
  "sao felipe d'oeste": 'ROLIM DE MOURA',
  'sao francisco do guapore': 'SAO FRANCISCO',
  'sao miguel do guapore': 'SAO FRANCISCO',
  seringueiras: 'SAO FRANCISCO',
  teixeiropolis: 'ALVORADA DOESTE',
  theobroma: 'JARU',
  urupa: 'ALVORADA DOESTE',
  'vale do anari': 'MACHADINHO DOESTE',
  'vale do paraiso': 'OURO PRETO'
};

const ImportadorVendas = ({
  onImportar,
  regionais,
  regionalCidades = [],
  colaboradores,
  carregando,
  periodosDisponiveis = []
}) => {
  const [, setArquivo] = useState(null);
  const [dados, setDados] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [etapa, setEtapa] = useState('upload'); // upload | preview | confirmacao
  const [filtroErros, setFiltroErros] = useState(false);
  const [modalEdicao, setModalEdicao] = useState(null);
  const [validacoes, setValidacoes] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const SVA_FINANCEIRO_PADRAO = 30;
  const TELEFONIA_FINANCEIRO_PADRAO = 19.9;

  const limparTextoCampo = (valor) => {
    if (valor === null || valor === undefined) return '';
    let texto = String(valor).replace(/\uFEFF/g, '').trim();
    // Remove aspas envolventes e aspas duplicadas comuns de CSV
    texto = texto.replace(/^"+|"+$/g, '').replace(/""/g, '"').trim();
    return texto;
  };

  const decodificarTextoTabular = (conteudo) => {
    const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(conteudo);
    const latin1 = new TextDecoder('iso-8859-1').decode(conteudo);

    const pontuarRuido = (texto) => {
      const substituicoes = (texto.match(/\uFFFD/g) || []).length;
      const sinaisMojibake = (texto.match(/[ÃÂ]/g) || []).length;
      return (substituicoes * 4) + sinaisMojibake;
    };

    return pontuarRuido(latin1) < pontuarRuido(utf8) ? latin1 : utf8;
  };

  const linhaTemConteudo = (colunas = []) =>
    Array.isArray(colunas) && colunas.some((campo) => limparTextoCampo(campo) !== '');

  const normalizarPeriodo = (valor) => {
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
      const epoch = new Date(1899, 11, 30);
      const date = new Date(epoch.getTime() + valorNum * 24 * 60 * 60 * 1000);
      return formatarPeriodo(date.getMonth(), date.getFullYear());
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

    const numerico = normalizado.replace(/[.-]/g, '/');
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

  const periodoPadrao = (periodo) => /^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\/\d{2}$/.test(periodo);

  const normalizarNumero = (valor) => {
    // Tratamento de nulos e vazios
    if (valor === null || valor === undefined || valor === '') return 0;
    
    const raw = limparTextoCampo(valor);
    if (!raw) return 0;
    
    // Reconhecer "-" (traÃ§o) e "R$" vazio como 0
    if (raw === '-' || raw === 'R$' || raw === 'R$ -') return 0;
    
    // Remover sÃ­mbolo de moeda "R$"
    let normalizado = raw.replace(/R\s*\$?\s*/gi, '').trim();
    
    // Se virou vazio depois de remover R$, retornar 0
    if (!normalizado || normalizado === '-') return 0;
    
    // Tratamento de separadores de milhar e decimal
    // Detectar se hÃ¡ ponto e vÃ­rgula (caso tenha ambos, ponto Ã© milhar)
    if (normalizado.includes('.') && normalizado.includes(',')) {
      normalizado = normalizado.replace(/\./g, '').replace(',', '.');
    } else if (normalizado.includes(',')) {
      // Se tem apenas vÃ­rgula, pode ser decimal
      normalizado = normalizado.replace(',', '.');
    }
    
    const numero = Number(normalizado);
    return Number.isNaN(numero) ? 0 : numero;
  };

  const campos = [
    'periodo', 'vendedor', 'regional',
    'vendasVolume', 'vendasFinanceiro',
    'mudancaTitularidadeVolume', 'mudancaTitularidadeFinanceiro',
    'migracaoTecnologiaVolume', 'migracaoTecnologiaFinanceiro',
    'renovacaoVolume', 'renovacaoFinanceiro',
    'planoEventoVolume', 'planoEventoFinanceiro',
    'svaVolume', 'svaFinanceiro',
    'telefoniaVolume', 'telefoniaFinanceiro'
  ];

  // FunÃ§Ã£o para reparar caracteres corrompidos de encoding
  const repararEncodingCorreto = (texto) => {
    if (!texto) return '';

    let reparado = texto;
    
    // Tentar consertar com regex para ? e caracteres invÃ¡lidos
    // PadrÃ£o comum: quando hÃ¡ ?, substituir por equivalente sem acento
    reparado = reparado.replace(/Virg[?]nia/gi, 'Virginia');
    reparado = reparado.replace(/Padr[?]o/gi, 'Padrao');
    reparado = reparado.replace(/Gon[?]alves/gi, 'Goncalves');
    reparado = reparado.replace(/Cati[?]li/gi, 'Catiali');
    reparado = reparado.replace(/Guimar[?]es/gi, 'Guimaraes');
    reparado = reparado.replace(/S[?]O/gi, 'SAO');
    reparado = reparado.replace(/\uFFFD/g, ' ');
    reparado = reparado.replace(/[?]/g, ' ');
    
    return reparado;
  };

  // FunÃ§Ã£o para normalizar nomes removendo acentos
  const normalizarNome = (nome) => {
    let processado = limparTextoCampo(nome);
    
    // Primeiro, tentar reparar encoding corrompido
    processado = repararEncodingCorreto(processado);
    
    // Depois, normalizar acentos restantes
    processado = processado
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normaliza espaÃ§os mÃºltiplos para um Ãºnico espaÃ§o
      .trim();
    
    return processado;
  };

  const tokenizarTexto = (texto) => {
    return normalizarNome(texto)
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  };

  const possuiTokenComPrefixo = (tokens, prefixos) => {
    return tokens.some((token) => prefixos.some((prefixo) => token.startsWith(prefixo)));
  };

  const normalizarRegionalComparacao = (nome) => {
    return normalizarNome(nome)
      .replace(/^uni\s*-\s*/i, '')
      .replace(/^uni\s+/i, '')
      .replace(/\bdoeste\b/g, 'do oeste')
      .trim();
  };

  const localizarRegionalPorNome = (nomeRegional) => {
    if (!nomeRegional) return null;
    const chave = normalizarRegionalComparacao(nomeRegional);
    const exata = regionais.find((r) => normalizarRegionalComparacao(r.nome) === chave);
    if (exata) return exata;

    const aliases = [
      { origem: 'sao francisco do guapore', destino: 'sao francisco' },
      { origem: 'sao miguel do guapore', destino: 'sao francisco' },
      { origem: 'seringueiras', destino: 'sao francisco' },
      { origem: 'nova brasilandia doeste', destino: 'nova brasilandia' }
    ];
    const alias = aliases.find((a) => chave.includes(a.origem));
    if (alias) {
      return regionais.find((r) => normalizarRegionalComparacao(r.nome) === alias.destino) || null;
    }

    return null;
  };

  const localizarRegionalPorCidade = (cidade) => {
    if (!cidade) return null;
    const cidadeNormalizada = normalizarNome(cidade);
    const mapeamento = regionalCidades.find((item) => normalizarNome(item.cidade) === cidadeNormalizada);
    if (mapeamento?.regional_id) {
      return regionais.find((r) => r.id === mapeamento.regional_id) || null;
    }
    if (mapeamento?.regional_nome) {
      return localizarRegionalPorNome(mapeamento.regional_nome);
    }
    const regionalPadrao = CIDADE_REGIONAL_PADRAO[cidadeNormalizada] || '';
    if (regionalPadrao) {
      return localizarRegionalPorNome(regionalPadrao);
    }
    return null;
  };

  const resolverRegional = ({ regional, cidade }) => {
    const porNome = localizarRegionalPorNome(regional);
    if (porNome) return porNome;
    const porCidade = localizarRegionalPorCidade(cidade);
    if (porCidade) return porCidade;
    return null;
  };

  const validarRegistro = (registro, indice) => {
    const erros = [];
    const vendedorNormalizado = normalizarNome(registro.vendedor);
    const vendedorGlobal = colaboradores.find((c) => normalizarNome(c.nome) === vendedorNormalizado);

    if (!registro.periodo || registro.periodo.trim() === '') {
      erros.push('Periodo obrigatorio');
    } else if (!periodoPadrao(registro.periodo.trim())) {
      erros.push('Periodo invalido (use MMM/AA)');
    }

    // Validar regional primeiro
    const regionalEncontrada = resolverRegional({
      regional: registro.regional,
      cidade: registro.cidade
    });

    if ((!registro.regional || registro.regional.trim() === '') && (!registro.cidade || registro.cidade.trim() === '') && !vendedorGlobal) {
      erros.push('Regional obrigatoria');
    } else if (!regionalEncontrada && !vendedorGlobal) {
      erros.push(`Regional "${registro.regional}" nao encontrada`);
    }

    // Validar vendedor considerando a regional
    if (!registro.vendedor || registro.vendedor.trim() === '') {
      erros.push('Vendedor obrigatorio');
    } else {
      // Vendedor novo sera criado automaticamente se houver regional valida.
      if (!vendedorGlobal && !regionalEncontrada) {
        erros.push(`Vendedor "${registro.vendedor}" nao encontrado e regional invalida`);
      }
    }

    return { indice, linha: indice + 2, erros, temErros: erros.length > 0 };
  };

  const manipularArquivo = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setArquivo(arquivo);
    const leitor = new FileReader();

    leitor.onload = (evento) => {
      try {
        const conteudo = evento.target.result;
        let linhas = [];

        if (arquivo.name.endsWith('.xlsx') || arquivo.name.endsWith('.xls')) {
          const workbook = XLSX.read(conteudo, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          // LÃª direto como matriz para evitar artefatos de aspas da serializaÃ§Ã£o CSV
          linhas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
            .map((linha) => linha.map((campo) => limparTextoCampo(campo)))
            .filter((linha) => linha.some((campo) => String(campo).trim() !== ''));
        } else {
          // Para CSV/TXT, escolhe automaticamente entre UTF-8 e Latin-1.
          const texto = decodificarTextoTabular(conteudo);

          linhas = texto.split('\n')
            .filter(linha => linha.trim())
            .map(linha => {
              const separador = linha.includes('\t') ? '\t' : (linha.includes(';') ? ';' : ',');
              return linha.split(separador).map(campo => limparTextoCampo(campo));
            })
            .filter((colunas) => linhaTemConteudo(colunas));
        }

        if (linhas.length < 2) {
          alert('Arquivo vazio ou invalido');
          return;
        }

        // Usar primeira linha como header
        const headers = linhas[0];
        const normalizarHeader = (header) => {
          return String(header || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[_\s-]+/g, ' ')
            .trim();
        };

        const headersNormalizados = headers.map(normalizarHeader);
        const ehLayoutOperadora = [
          'filial',
          'vendedor',
          'cidade',
          'motivo inclusao',
          'valor'
        ].every((h) => headersNormalizados.includes(h));

        if (ehLayoutOperadora) {
          const idx = {
            filial: headersNormalizados.indexOf('filial'),
            vendedor: headersNormalizados.indexOf('vendedor'),
            cidade: headersNormalizados.indexOf('cidade'),
            motivo: headersNormalizados.indexOf('motivo inclusao'),
            descricao: headersNormalizados.indexOf('descricao'),
            tipo: headersNormalizados.indexOf('tipo'),
            comboServico: headersNormalizados.indexOf('combo/servico'),
            valor: headersNormalizados.indexOf('valor'),
            conexoes: headersNormalizados.indexOf('conexoes'),
            dtAtivacao: headersNormalizados.indexOf('dt ativacao'),
            dtCriacao: headersNormalizados.indexOf('dt criacao')
          };

          const definirCategoria = (motivo, tipo, descricao, comboServico, valor) => {
            const textoMotivo = normalizarNome(motivo);
            const textoTipo = normalizarNome(tipo);
            const textoDescricao = normalizarNome(descricao);
            const textoCombo = normalizarNome(comboServico);
            const texto = [textoMotivo, textoTipo, textoDescricao, textoCombo].join(' ');
            const tokens = tokenizarTexto(texto);
            const tokensMotivo = tokenizarTexto(textoMotivo);
            const tokensCombo = tokenizarTexto(textoCombo);

            const ehMudanca = possuiTokenComPrefixo(tokens, ['mudan', 'mudanc', 'mudanac']);
            const ehEndereco = possuiTokenComPrefixo(tokens, ['enderec', 'endere']);
            const ehTitularidade = possuiTokenComPrefixo(tokens, ['titular']);
            const ehTecnologia = possuiTokenComPrefixo(tokens, ['tecnolog']);
            const ehMigracao = possuiTokenComPrefixo(tokens, ['migrac']);
            const ehInstalacao = possuiTokenComPrefixo(tokens, ['instal']);

            const ehMudancaEndereco = ehMudanca && ehEndereco;
            const ehInstalacaoEvento =
              /instal[a-z0-9]*\s+em\s+evento/.test(texto) ||
              (possuiTokenComPrefixo(tokensMotivo, ['instal']) && tokensMotivo.some((token) => token.startsWith('evento'))) ||
              texto.includes('plano evento');
            const ehMudancaTitularidade = ehMudanca && ehTitularidade;
            const ehMudancaTecnologia = (ehMudanca && ehTecnologia) || ehMigracao;
            const ehRenovacao = possuiTokenComPrefixo(tokens, ['renovac', 'renova']);
            const ehReativacao = possuiTokenComPrefixo(tokens, ['reativ']);
            const ehUpgrade = possuiTokenComPrefixo(tokens, ['upgrad']);
            const temSinalTelefoniaDireto = possuiTokenComPrefixo(tokens, ['telefon', 'telefone', 'voip', 'fone', 'stfc']);
            const temSinalVoz = possuiTokenComPrefixo(tokens, ['voz']);
            const temSinalFixo = possuiTokenComPrefixo(tokens, ['fixo']);
            const apenasIpFixo = /\bip\s*fixo\b/.test(texto) && !temSinalTelefoniaDireto && !temSinalVoz;
            const ehTelefonia = !apenasIpFixo && (temSinalTelefoniaDireto || (temSinalVoz && temSinalFixo));
            const ehSvaExplicito = tokens.some((token) => token === 'sva' || token.startsWith('sva'));

            let categoria = 'vendas';
            if (ehMudancaEndereco) {
              categoria = 'naoComissiona';
            } else if (ehInstalacaoEvento) {
              categoria = 'planoEvento';
            } else if (ehMudancaTitularidade) {
              categoria = 'mudancaTitularidade';
            } else if (ehMudancaTecnologia) {
              categoria = 'migracaoTecnologia';
            } else if (ehRenovacao) {
              categoria = 'renovacao';
            } else if (ehSvaExplicito) {
              categoria = 'sva';
            } else if (ehTelefonia) {
              categoria = 'telefonia';
            } else if (ehReativacao || ehUpgrade || ehInstalacao) {
              categoria = 'vendas';
            }

            // Regra adicional de SVA:
            // Toda venda, reativacao, renovacao e upgrade de plano Varejo/Urbano acima de R$ 99,90.
            const planoElegivelSva = possuiTokenComPrefixo(tokensCombo, ['varej', 'urban']);
            const eventoElegivelSva = categoria === 'vendas' || categoria === 'renovacao' || ehReativacao || ehUpgrade;
            const contaSva =
              categoria !== 'naoComissiona' &&
              (categoria === 'sva' || (eventoElegivelSva && planoElegivelSva && valor > 99.9));

            return { categoria, contaSva };
          };

          const acumulado = new Map();

          linhas.slice(1).forEach((linha) => {
            if (!linhaTemConteudo(linha)) return;

            const vendedor = limparTextoCampo(linha[idx.vendedor] || '');
            const cidade = limparTextoCampo(linha[idx.cidade] || '');
            const regionalBruta = limparTextoCampo(linha[idx.filial] || '');
            const regionalResolvida = resolverRegional({ regional: regionalBruta, cidade });
            const regional = regionalResolvida?.nome || regionalBruta;
            const periodoFonte = linha[idx.dtAtivacao] || linha[idx.dtCriacao] || '';
            const periodo = periodoSelecionado || normalizarPeriodo(periodoFonte);
            const conexoes = Math.max(1, normalizarNumero(linha[idx.conexoes] || 1));
            const valor = normalizarNumero(linha[idx.valor] || 0);

            if (!vendedor || !periodo) return;

            const classificacao = definirCategoria(
              linha[idx.motivo] || '',
              linha[idx.tipo] || '',
              linha[idx.descricao] || '',
              linha[idx.comboServico] || '',
              valor
            );
            const categoria = classificacao.categoria;
            const contaSva = classificacao.contaSva;

            if (categoria === 'naoComissiona') return;

            const chave = `${periodo}|${normalizarNome(vendedor)}|${normalizarRegionalComparacao(regional)}`;
            if (!acumulado.has(chave)) {
              acumulado.set(chave, {
                periodo,
                vendedor,
                regional,
                cidade,
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
                telefoniaFinanceiro: 0
              });
            }

            const item = acumulado.get(chave);
            if (categoria === 'mudancaTitularidade') {
              item.mudancaTitularidadeVolume += conexoes;
              item.mudancaTitularidadeFinanceiro += valor;
            } else if (categoria === 'migracaoTecnologia') {
              item.migracaoTecnologiaVolume += conexoes;
              item.migracaoTecnologiaFinanceiro += valor;
            } else if (categoria === 'renovacao') {
              item.renovacaoVolume += conexoes;
              item.renovacaoFinanceiro += valor;
            } else if (categoria === 'planoEvento') {
              item.planoEventoVolume += conexoes;
              item.planoEventoFinanceiro += valor;
            } else if (categoria === 'sva') {
              item.svaVolume += conexoes;
              item.svaFinanceiro += conexoes * SVA_FINANCEIRO_PADRAO;
            } else if (categoria === 'telefonia') {
              item.telefoniaVolume += conexoes;
              item.telefoniaFinanceiro += conexoes * TELEFONIA_FINANCEIRO_PADRAO;
            } else {
              item.vendasVolume += conexoes;
              item.vendasFinanceiro += valor;
            }

            if (contaSva && categoria !== 'sva') {
              item.svaVolume += conexoes;
              item.svaFinanceiro += conexoes * SVA_FINANCEIRO_PADRAO;
            }
          });

          const dadosProcessadosOperadora = Array.from(acumulado.values()).map((obj, index) => ({
            __indice: index,
            __objeto: obj
          }));

          setDados(dadosProcessadosOperadora);
          setSelecionados(new Set());
          const validacoesResultado = dadosProcessadosOperadora.map((d, idxLinha) =>
            validarRegistro(d.__objeto, idxLinha)
          );
          setValidacoes(validacoesResultado);
          setEtapa('preview');
          return;
        }

        const mapeadorHeader = {
          'periodo': 'periodo',
          'perido': 'periodo',
          'mes/ano': 'periodo',
          'mes': 'periodo',
          'data': 'periodo',
          'mes_ano': 'periodo',
          'vendedor': 'vendedor',
          'vendedores': 'vendedor',
          'vendedor name': 'vendedor',
          'colaborador': 'vendedor',
          'colaboradores': 'vendedor',
          'regional': 'regional',
          'regionais': 'regional',
          'regiao': 'regional',
          'regioes': 'regional',
          'vendas': 'vendasVolume',
          'vendas volume': 'vendasVolume',
          'vendas_volume': 'vendasVolume',
          'vendas financeiro': 'vendasFinanceiro',
          'vendas_financeiro': 'vendasFinanceiro',
          'mudanca de titularidade': 'mudancaTitularidadeVolume',
          'mudanca de titularidade volume': 'mudancaTitularidadeVolume',
          'mudanca titularidade': 'mudancaTitularidadeVolume',
          'mudanca_titularidade': 'mudancaTitularidadeVolume',
          'mudanca titularidade volume': 'mudancaTitularidadeVolume',
          'mudanca_titularidade_volume': 'mudancaTitularidadeVolume',
          'mudanca de titularidade financeiro': 'mudancaTitularidadeFinanceiro',
          'mudanca titularidade financeiro': 'mudancaTitularidadeFinanceiro',
          'mudanca_titularidade_financeiro': 'mudancaTitularidadeFinanceiro',
          'migracao de tecnologia': 'migracaoTecnologiaVolume',
          'migracao tecnologia': 'migracaoTecnologiaVolume',
          'migracao de tecnologia volume': 'migracaoTecnologiaVolume',
          'migracao_tecnologia': 'migracaoTecnologiaVolume',
          'migracao_tecnologia_volume': 'migracaoTecnologiaVolume',
          'migracoes_tecnologia_volume': 'migracaoTecnologiaVolume',
          'migracao tecnica': 'migracaoTecnologiaVolume',
          'migracao tecnica volume': 'migracaoTecnologiaVolume',
          'migracao_tecnica': 'migracaoTecnologiaVolume',
          'tecnica': 'migracaoTecnologiaVolume',
          'tecnica volume': 'migracaoTecnologiaVolume',
          'migracao de tecnologia financeiro': 'migracaoTecnologiaFinanceiro',
          'migracao tecnologia financeiro': 'migracaoTecnologiaFinanceiro',
          'migracao_tecnologia_financeiro': 'migracaoTecnologiaFinanceiro',
          'renovacao': 'renovacaoVolume',
          'renovacao volume': 'renovacaoVolume',
          'renovacao_volume': 'renovacaoVolume',
          'renovacao financeiro': 'renovacaoFinanceiro',
          'renovacao_financeiro': 'renovacaoFinanceiro',
          'plano evento': 'planoEventoVolume',
          'plano evento volume': 'planoEventoVolume',
          'plano_evento': 'planoEventoVolume',
          'plano_evento_volume': 'planoEventoVolume',
          'plano evento financeiro': 'planoEventoFinanceiro',
          'plano_evento_financeiro': 'planoEventoFinanceiro',
          'sva': 'svaVolume',
          'sva volume': 'svaVolume',
          'sva_volume': 'svaVolume',
          'sva financeiro': 'svaFinanceiro',
          'sva_financeiro': 'svaFinanceiro',
          'telefonia': 'telefoniaVolume',
          'telefonia volume': 'telefoniaVolume',
          'telefonia_volume': 'telefoniaVolume',
          'telefonia financeiro': 'telefoniaFinanceiro',
          'telefonia_financeiro': 'telefoniaFinanceiro'
        };

        // Mapeamento inteligente: detecta "Financeiro" isolado e atribui ao campo anterior
        const indicesColuna = {};
        let ultimoCampoVolume = null;
        
        headers.forEach((header, idx) => {
          const chaveNormalizada = normalizarHeader(header);
          let chaveMapeada = mapeadorHeader[chaveNormalizada];
          
          if (chaveMapeada) {
            indicesColuna[chaveMapeada] = idx;
            
            // Se Ã© um campo de volume, guardar para uso posterior
            if (chaveMapeada.endsWith('Volume')) {
              ultimoCampoVolume = chaveMapeada.replace('Volume', 'Financeiro');
            }
          } else if (chaveNormalizada === 'financeiro' && ultimoCampoVolume) {
            // Se encontrar "Financeiro" isolado, mapear para o financeiro do campo anterior
            indicesColuna[ultimoCampoVolume] = idx;
          }
        });

        const dadosProcessados = linhas.slice(1)
          .filter((linha) => linhaTemConteudo(linha))
          .map((linha, idx) => ({
          __indice: idx,
          __objeto: {
            periodo: periodoSelecionado || normalizarPeriodo(limparTextoCampo(linha[indicesColuna.periodo] || '')),
            vendedor: limparTextoCampo(linha[indicesColuna.vendedor] || ''),
            regional: limparTextoCampo(linha[indicesColuna.regional] || ''),
            vendasVolume: linha[indicesColuna.vendasVolume] || '0',
            vendasFinanceiro: linha[indicesColuna.vendasFinanceiro] || '0',
            mudancaTitularidadeVolume: linha[indicesColuna.mudancaTitularidadeVolume] || '0',
            mudancaTitularidadeFinanceiro: linha[indicesColuna.mudancaTitularidadeFinanceiro] || '0',
            migracaoTecnologiaVolume: linha[indicesColuna.migracaoTecnologiaVolume] || '0',
            migracaoTecnologiaFinanceiro: linha[indicesColuna.migracaoTecnologiaFinanceiro] || '0',
            renovacaoVolume: linha[indicesColuna.renovacaoVolume] || '0',
            renovacaoFinanceiro: linha[indicesColuna.renovacaoFinanceiro] || '0',
            planoEventoVolume: linha[indicesColuna.planoEventoVolume] || '0',
            planoEventoFinanceiro: linha[indicesColuna.planoEventoFinanceiro] || '0',
            svaVolume: linha[indicesColuna.svaVolume] || '0',
            svaFinanceiro: linha[indicesColuna.svaFinanceiro] || '0',
            telefoniaVolume: linha[indicesColuna.telefoniaVolume] || '0',
            telefoniaFinanceiro: linha[indicesColuna.telefoniaFinanceiro] || '0'
          }
        }));

        setDados(dadosProcessados);
        setSelecionados(new Set());

        // Validar todos
        const validacoesResultado = dadosProcessados.map((d, idx) =>
          validarRegistro(d.__objeto, idx)
        );
        setValidacoes(validacoesResultado);
        setEtapa('preview');
      } catch (erro) {
        console.error('Erro ao processar arquivo:', erro);
        alert('Erro ao processar arquivo. Verifique o formato.');
      }
    };

    leitor.readAsArrayBuffer(arquivo);
  };

  const registrosFiltrados = filtroErros
    ? dados.filter(d => validacoes.find(v => v.indice === d.__indice)?.temErros)
    : dados;

  const selecionarTodos = (e) => {
    if (e.target.checked) {
      setSelecionados(new Set(registrosFiltrados.map(d => d.__indice)));
    } else {
      setSelecionados(new Set());
    }
  };

  const selecionarRegistro = (indice) => {
    const novo = new Set(selecionados);
    if (novo.has(indice)) {
      novo.delete(indice);
    } else {
      novo.add(indice);
    }
    setSelecionados(novo);
  };

  const excluirSelecionados = () => {
    if (selecionados.size === 0) return;
    const novosDados = dados.filter(d => !selecionados.has(d.__indice));
    setDados(novosDados);
    setSelecionados(new Set());

    const novasValidacoes = novosDados.map((d, idx) =>
      validarRegistro(d.__objeto, idx)
    );
    setValidacoes(novasValidacoes);
  };

  const atualizarRegistro = (indice, campo, valor) => {
    const novosDados = dados.map(d => {
      if (d.__indice === indice) {
        return {
          ...d,
          __objeto: { ...d.__objeto, [campo]: valor }
        };
      }
      return d;
    });

    setDados(novosDados);

    // Revalidar
    const validacao = validarRegistro(novosDados.find(d => d.__indice === indice).__objeto, indice);
    setValidacoes(validacoes.map(v => v.indice === indice ? validacao : v));
  };

  const confirmarImportacao = async () => {
    const registrosValidos = dados.filter(d => {
      const validacao = validacoes.find(v => v.indice === d.__indice);
      return !validacao?.temErros;
    });

    if (registrosValidos.length === 0) {
      alert('Nenhum registro valido para importar');
      return;
    }

    const periodosImportados = Array.from(new Set(
      registrosValidos.map((r) => String(r.__objeto?.periodo || '').trim()).filter(Boolean)
    ));

    await onImportar(
      registrosValidos.map(r => r.__objeto),
      {
        sincronizarPeriodo: true,
        periodosImportados
      }
    );
    resetar();
  };

  const resetar = () => {
    setArquivo(null);
    setDados([]);
    setSelecionados(new Set());
    setEtapa('upload');
    setValidacoes([]);
    setModalEdicao(null);
  };

  if (etapa === 'upload') {
    return (
      <div className="importador-vendas">
        <h3>Importar Vendas (Excel ou CSV)</h3>
        
        {periodosDisponiveis.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderLeftColor: '#ffc107', borderLeftWidth: '4px', borderRadius: '4px' }}>
            <label className="form-label"><strong>Periodo (RECOMENDADO)</strong></label>
            <select
              className="form-select"
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              style={{ marginBottom: '8px' }}
            >
              <option value="">-- Selecione o periodo --</option>
              {periodosDisponiveis.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: '#333', margin: '8px 0 0 0', lineHeight: '1.5' }}>
              <strong>Recomendacao:</strong> Selecione o periodo antes de importar. Se deixar em branco, o sistema tentara extrair do arquivo (formato: DD/MM/YYYY, MM/YYYY, ou nome do mes).
            </p>
          </div>
        )}

        <div className="upload-area">
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={manipularArquivo}
            disabled={carregando}
          />
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Suportados: XLSX, XLS, CSV, TXT
          </p>
        </div>
      </div>
    );
  }

  if (etapa === 'preview') {
    const registrosComErro = validacoes.filter(v => v.temErros);

    return (
      <div className="importador-vendas">
        <h3>Preview dos Dados Importados</h3>

        {periodosDisponiveis.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderLeftColor: '#ffc107', borderLeftWidth: '4px', borderRadius: '4px' }}>
            <label className="form-label"><strong>Periodo (voce pode ajustar aqui)</strong></label>
            <select
              className="form-select"
              value={periodoSelecionado}
              onChange={(e) => {
                setPeriodoSelecionado(e.target.value);
                if (e.target.value) {
                  const novosDados = dados.map(d => ({
                    ...d,
                    __objeto: { ...d.__objeto, periodo: e.target.value }
                  }));
                  setDados(novosDados);
                  const novasValidacoes = novosDados.map((d) => validarRegistro(d.__objeto, d.__indice));
                  setValidacoes(novasValidacoes);
                }
              }}
              style={{ marginBottom: '8px' }}
            >
              <option value="">-- Selecione o periodo --</option>
              {periodosDisponiveis.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {!periodoSelecionado && (
          <div style={{ padding: '12px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '16px', color: '#721c24' }}>
            <strong>Atencao:</strong> Periodo nao foi selecionado. O sistema tentara extrair de cada linha automaticamente. Recomendamos selecionar um periodo acima para garantir consistencia.
            <br/>
            <button type="button" className="btn btn-link btn-sm" onClick={() => setEtapa('upload')} style={{ padding: '0', marginTop: '8px' }}>
              Voltar e selecionar periodo
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px;' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={filtroErros}
              onChange={(e) => setFiltroErros(e.target.checked)}
            />
            Mostrar apenas com erros ({registrosComErro.length})
          </label>

          {selecionados.size > 0 && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={excluirSelecionados}
              disabled={carregando}
            >
              Excluir Selecionados ({selecionados.size})
            </button>
          )}
        </div>

        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="tabela-preview">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selecionados.size === registrosFiltrados.length}
                    onChange={selecionarTodos}
                  />
                </th>
                <th>Linha</th>
                <th>Periodo</th>
                <th>Vendedor</th>
                <th>Regional</th>
                <th>Vendas Vol.</th>
                <th>Status</th>
                <th>Acao</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((registro) => {
                const validacao = validacoes.find(v => v.indice === registro.__indice);
                return (
                  <tr key={registro.__indice} className={validacao?.temErros ? 'erro' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selecionados.has(registro.__indice)}
                        onChange={() => selecionarRegistro(registro.__indice)}
                      />
                    </td>
                    <td>{validacao?.linha}</td>
                    <td>{registro.__objeto.periodo}</td>
                    <td>{registro.__objeto.vendedor}</td>
                    <td>{registro.__objeto.regional}</td>
                    <td>{registro.__objeto.vendasVolume}</td>
                    <td>
                      {validacao?.temErros ? (
                        <span className="status-erro" title={validacao.erros.join('\n')}>
                          ERRO: {validacao.erros.length}
                        </span>
                      ) : (
                        <span className="status-ok">OK</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setModalEdicao(registro.__indice)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {validacoes.some(v => v.temErros) && (
          <div className="alert alert-warning" style={{ marginTop: '16px' }}>
            <strong>{registrosComErro.length} linha(s) com erro(s):</strong>
            <ul style={{ marginTop: '8px' }}>
              {registrosComErro.map((validacao) => (
                <li key={validacao.linha}>
                  <strong>Linha {validacao.linha}:</strong> {validacao.erros.join('; ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetar}
            disabled={carregando}
          >
            Voltar
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={confirmarImportacao}
            disabled={carregando || !dados.some(d => !validacoes.find(v => v.indice === d.__indice)?.temErros)}
          >
            Confirmar Importacao
          </button>
        </div>

        {modalEdicao !== null && (
          <ModalEdicao
            indice={modalEdicao}
            registro={dados.find(d => d.__indice === modalEdicao)?.__objeto}
            validacao={validacoes.find(v => v.indice === modalEdicao)}
            campos={campos}
            onSalvar={(campo, valor) => {
              atualizarRegistro(modalEdicao, campo, valor);
            }}
            onFechar={() => setModalEdicao(null)}
          />
        )}
      </div>
    );
  }

  return null;
};

const ModalEdicao = ({ indice, registro, validacao, campos, onSalvar, onFechar }) => {
  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h4>Editar Linha {validacao?.linha}</h4>

        {validacao?.temErros && (
          <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
            {validacao.erros.join('; ')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {campos.map((campo) => (
            <div key={campo} className="form-group">
              <label className="form-label">{campo}</label>
              <input
                type="text"
                className="form-control"
                value={registro?.[campo] || ''}
                onChange={(e) => onSalvar(campo, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportadorVendas;

