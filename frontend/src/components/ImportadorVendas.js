import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import '../styles/ImportadorVendas.css';

const ImportadorVendas = ({
  onImportar,
  regionais,
  colaboradores,
  carregando,
  periodosDisponiveis = []
}) => {
  const [arquivo, setArquivo] = useState(null);
  const [dados, setDados] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [etapa, setEtapa] = useState('upload'); // upload | preview | confirmacao
  const [filtroErros, setFiltroErros] = useState(false);
  const [modalEdicao, setModalEdicao] = useState(null);
  const [validacoes, setValidacoes] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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

  const periodoPadrao = (periodo) => /^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\/\d{2}$/.test(periodo);

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

  const atualizarPeriodoImportado = (indice, novoPeriodo) => {
    const novosDados = dados.map(d => {
      if (d.__indice === indice && novoPeriodo) {
        return {
          ...d,
          __objeto: { ...d.__objeto, periodo: novoPeriodo }
        };
      }
      return d;
    });

    setDados(novosDados);

    // Revalidar
    const validacao = validarRegistro(novosDados.find(d => d.__indice === indice).__objeto, indice);
    setValidacoes(validacoes.map(v => v.indice === indice ? validacao : v));
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

  // Função para reparar caracteres corrompidos de encoding
  const repararEncodingCorreto = (texto) => {
    if (!texto) return '';
    
    // Mapa de caracteres corrompidos comuns (UTF-8 mal interpretado)
    const mapeamentoCorrecao = {
      '?': 'o',
      '?': 'a',
      '?': 'e',
      '?': 'i',
      '?': 'u',
      '?': 'c',
      '?': 'n',
      '?': 'o', // mais variações
      'virg?nia': 'virginia',
      'padr?o': 'padrao',
      'gon?alves': 'goncalves',
      'cati?li': 'catiali',
      'guimar?es': 'guimaraes',
      'são francisco': 'sao francisco',
      'são paulo': 'sao paulo',
    };

    let reparado = texto;
    
    // Tentar consertar com regex para ? e caracteres inválidos
    // Padrão comum: quando há ?, substituir por equivalente sem acento
    reparado = reparado.replace(/Virg[?]nia/gi, 'Virginia');
    reparado = reparado.replace(/Padr[?]o/gi, 'Padrao');
    reparado = reparado.replace(/Gon[?]alves/gi, 'Goncalves');
    reparado = reparado.replace(/Cati[?]li/gi, 'Catiali');
    reparado = reparado.replace(/Guimar[?]es/gi, 'Guimaraes');
    reparado = reparado.replace(/S[?]O/gi, 'SAO');
    reparado = reparado.replace(/[?]/g, 'a'); // Fallback genérico
    
    return reparado;
  };

  // Função para normalizar nomes removendo acentos
  const normalizarNome = (nome) => {
    let processado = String(nome || '').trim();
    
    // Primeiro, tentar reparar encoding corrompido
    processado = repararEncodingCorreto(processado);
    
    // Depois, normalizar acentos restantes
    processado = processado
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normaliza espaços múltiplos para um único espaço
      .trim();
    
    return processado;
  };

  const validarRegistro = (registro, indice) => {
    const erros = [];

    if (!registro.periodo || registro.periodo.trim() === '') {
      erros.push('Período obrigatório');
    } else if (!periodoPadrao(registro.periodo.trim())) {
      erros.push('Período inválido (use MMM/AA)');
    }

    // Validar regional primeiro
    const regionalNormalizada = registro.regional ? normalizarNome(registro.regional) : '';
    const regionalEncontrada = regionalNormalizada 
      ? regionais.find(r => normalizarNome(r.nome) === regionalNormalizada)
      : null;

    if (!registro.regional || registro.regional.trim() === '') {
      erros.push('Regional obrigatória');
    } else if (!regionalEncontrada) {
      erros.push(`Regional "${registro.regional}" não encontrada`);
    }

    // Validar vendedor considerando a regional
    if (!registro.vendedor || registro.vendedor.trim() === '') {
      erros.push('Vendedor obrigatório');
    } else {
      const vendedorNormalizado = normalizarNome(registro.vendedor);
      
      // Se a regional foi encontrada, buscar vendedor que pertença a ela
      if (regionalEncontrada) {
        const vendedorEncontrado = colaboradores.find(
          c => normalizarNome(c.nome) === vendedorNormalizado && c.regional_id === regionalEncontrada.id
        );
        if (!vendedorEncontrado) {
          erros.push(`Vendedor "${registro.vendedor}" não encontrado na regional "${registro.regional}"`);
        }
      } else {
        // Se regional não foi encontrada, apenas verificar se vendedor existe (qualquer regional)
        const vendedorEncontrado = colaboradores.find(
          c => normalizarNome(c.nome) === vendedorNormalizado
        );
        if (!vendedorEncontrado) {
          erros.push(`Vendedor "${registro.vendedor}" não encontrado`);
        }
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
          // Usar 'array' para ArrayBuffer
          const workbook = XLSX.read(conteudo, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Converter para CSV primeiro (melhor controle de encoding)
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          linhas = csv.split('\n')
            .filter(linha => linha.trim())
            .map(linha => {
              const separador = linha.includes('\t') ? '\t' : ',';
              return linha.split(separador).map(campo => campo.trim());
            });
        } else {
          // Para CSV/TXT, tentar UTF-8 e se não der, tentar Latin-1
          let texto = '';
          try {
            texto = new TextDecoder('utf-8').decode(conteudo);
          } catch {
            texto = new TextDecoder('iso-8859-1').decode(conteudo);
          }
          
          linhas = texto.split('\n')
            .filter(linha => linha.trim())
            .map(linha => {
              const separador = linha.includes('\t') ? '\t' : (linha.includes(';') ? ';' : ',');
              return linha.split(separador).map(campo => campo.trim());
            });
        }

        if (linhas.length < 2) {
          alert('Arquivo vazio ou inválido');
          return;
        }

        // Usar primeira linha como header
        const headers = linhas[0];
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

        const normalizarHeader = (header) => {
          return String(header || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[_\s-]+/g, ' ')
            .trim();
        };

        // Mapeamento inteligente: detecta "Financeiro" isolado e atribui ao campo anterior
        const indicesColuna = {};
        let ultimoCampoVolume = null;
        
        headers.forEach((header, idx) => {
          const chaveNormalizada = normalizarHeader(header);
          let chaveMapeada = mapeadorHeader[chaveNormalizada];
          
          if (chaveMapeada) {
            indicesColuna[chaveMapeada] = idx;
            
            // Se é um campo de volume, guardar para uso posterior
            if (chaveMapeada.endsWith('Volume')) {
              ultimoCampoVolume = chaveMapeada.replace('Volume', 'Financeiro');
            }
          } else if (chaveNormalizada === 'financeiro' && ultimoCampoVolume) {
            // Se encontrar "Financeiro" isolado, mapear para o financeiro do campo anterior
            indicesColuna[ultimoCampoVolume] = idx;
            console.log(`Detectado "Financeiro" isolado na coluna ${idx}, mapeado para: ${ultimoCampoVolume}`);
          } else {
            console.warn(`Coluna não mapeada: "${header}" → "${chaveNormalizada}"`);
          }
        });

        // DEBUG: Mostrar estrutura dos headers
        console.log('=== HEADERS ENCONTRADOS ===');
        console.log('Headers brutos:', headers);
        console.log('Índices mapeados:', indicesColuna);
        console.log('Primeira linha de dados:', linhas[1]);
        console.log('Dados extraídos:', {
          periodo: linhas[1]?.[indicesColuna.periodo],
          vendedor: linhas[1]?.[indicesColuna.vendedor],
          regional: linhas[1]?.[indicesColuna.regional],
          vendasVolume: linhas[1]?.[indicesColuna.vendasVolume],
          vendasFinanceiro: linhas[1]?.[indicesColuna.vendasFinanceiro]
        });
        console.log('========================');

        const dadosProcessados = linhas.slice(1).map((linha, idx) => ({
          __indice: idx,
          __objeto: {
            periodo: periodoSelecionado || normalizarPeriodo(linha[indicesColuna.periodo] || ''),
            vendedor: linha[indicesColuna.vendedor] || '',
            regional: linha[indicesColuna.regional] || '',
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
      alert('Nenhum registro válido para importar');
      return;
    }

    await onImportar(registrosValidos.map(r => r.__objeto));
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
        <h3>📁 Importar Vendas (Excel ou CSV)</h3>
        
        {periodosDisponiveis.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderLeftColor: '#ffc107', borderLeftWidth: '4px', borderRadius: '4px' }}>
            <label className="form-label"><strong>⚠️ Período (RECOMENDADO)</strong></label>
            <select
              className="form-select"
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              style={{ marginBottom: '8px' }}
            >
              <option value="">-- Selecione o período --</option>
              {periodosDisponiveis.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: '#333', margin: '8px 0 0 0', lineHeight: '1.5' }}>
              <strong>Recomendação:</strong> Selecione o período antes de importar. Se deixar em branco, o sistema tentará extrair do arquivo (formato: DD/MM/YYYY, MM/YYYY, ou nome do mês).
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
    const temErros = validacoes.some(v => v.temErros);
    const registrosComErro = validacoes.filter(v => v.temErros);

    return (
      <div className="importador-vendas">
        <h3>👁️ Preview dos Dados Importados</h3>

        {periodosDisponiveis.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderLeftColor: '#ffc107', borderLeftWidth: '4px', borderRadius: '4px' }}>
            <label className="form-label"><strong>📅 Período (você pode ajustar aqui)</strong></label>
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
              <option value="">-- Selecione o período --</option>
              {periodosDisponiveis.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {!periodoSelecionado && (
          <div style={{ padding: '12px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '16px', color: '#721c24' }}>
            <strong>⚠️ Atenção:</strong> Período não foi selecionado. O sistema tentará extrair de cada linha automaticamente. Recomendamos selecionar um período acima para garantir consistência.
            <br/>
            <button type="button" className="btn btn-link btn-sm" onClick={() => setEtapa('upload')} style={{ padding: '0', marginTop: '8px' }}>
              ← Voltar e selecionar período
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
              🗑️ Excluir Selecionados ({selecionados.size})
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
                <th>Período</th>
                <th>Vendedor</th>
                <th>Regional</th>
                <th>Vendas Vol.</th>
                <th>Status</th>
                <th>Ação</th>
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
                          ❌ {validacao.erros.length} erro(s)
                        </span>
                      ) : (
                        <span className="status-ok">✓ OK</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setModalEdicao(registro.__indice)}
                      >
                        ✏️ Editar
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
            <strong>⚠️ {registrosComErro.length} linha(s) com erro(s):</strong>
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
            ← Voltar
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={confirmarImportacao}
            disabled={carregando || !dados.some(d => !validacoes.find(v => v.indice === d.__indice)?.temErros)}
          >
            ✓ Confirmar Importação
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
            ⚠️ {validacao.erros.join('; ')}
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
