const { db_run, db_all, db_get } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const normalizarTexto = (value) => String(value || '').trim();
const removerAcentos = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const MAPA_MESES = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12
};

const periodoParaChaveOrdenacao = (periodoRaw) => {
  const periodo = removerAcentos(normalizarTexto(periodoRaw)).toLowerCase();
  if (!periodo) return null;

  const numero = periodo.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (numero) {
    const mes = Number(numero[1]);
    let ano = Number(numero[2]);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) return null;
    if (!Number.isInteger(ano)) return null;
    if (ano < 100) ano += 2000;
    return (ano * 100) + mes;
  }

  const textoMes = periodo.match(/^([a-z]{3})\/(\d{2,4})$/);
  if (textoMes) {
    const mes = MAPA_MESES[textoMes[1]];
    let ano = Number(textoMes[2]);
    if (!mes || !Number.isInteger(ano)) return null;
    if (ano < 100) ano += 2000;
    return (ano * 100) + mes;
  }

  return null;
};

const compararPeriodos = (a, b) => {
  const chaveA = periodoParaChaveOrdenacao(a);
  const chaveB = periodoParaChaveOrdenacao(b);

  if (chaveA === null && chaveB === null) {
    return normalizarTexto(a).localeCompare(normalizarTexto(b));
  }
  if (chaveA === null) return 1;
  if (chaveB === null) return -1;
  if (chaveA !== chaveB) return chaveA - chaveB;
  return normalizarTexto(a).localeCompare(normalizarTexto(b));
};
const normalizarFilial = (value) => normalizarTexto(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .toUpperCase();

class RetencaoAtendimento {
  static async buscarPorAssinatura(assinatura) {
    if (!assinatura) return null;
    return db_get('SELECT id FROM retencao_atendimentos WHERE assinatura = ?', [assinatura]);
  }

  static async criar(dados) {
    const id = uuidv4();
    await db_run(
      `INSERT INTO retencao_atendimentos (
        id, tipo_registro, data_atendimento, periodo, atendente, cliente_id, nome_completo, filial, contrato_id,
        houve_chamado_anterior, qtd_chamados, origem_chamada, motivo, submotivo, cliente_aceitou_acordo,
        tipo_atendimento, possui_multa_contratual, possui_proporcional_mensalidade, equipamentos,
        resultado_tratativa, historico, origem_arquivo, assinatura, dataAtualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        dados.tipoRegistro,
        dados.dataAtendimento,
        dados.periodo,
        dados.atendente,
        dados.clienteId || null,
        dados.nomeCompleto,
        dados.filial,
        dados.contratoId || null,
        dados.houveChamadoAnterior ? 1 : 0,
        Number.isFinite(Number(dados.qtdChamados)) ? Number(dados.qtdChamados) : 0,
        dados.origemChamada || null,
        dados.motivo || null,
        dados.subMotivo || null,
        dados.clienteAceitouAcordo ? 1 : 0,
        dados.tipoAtendimento || null,
        dados.possuiMultaContratual ? 1 : 0,
        dados.possuiProporcionalMensalidade ? 1 : 0,
        dados.equipamentos || null,
        dados.resultadoTratativa || null,
        dados.historico || null,
        dados.origemArquivo || null,
        dados.assinatura || null
      ]
    );
    return id;
  }

  static async listar(filtros = {}) {
    let query = `SELECT * FROM retencao_atendimentos WHERE 1=1`;
    const params = [];

    if (filtros.periodo) {
      query += ' AND periodo = ?';
      params.push(filtros.periodo);
    }
    if (filtros.tipoRegistro) {
      query += ' AND tipo_registro = ?';
      params.push(filtros.tipoRegistro);
    }
    if (filtros.filial) {
      query += ' AND filial = ?';
      params.push(normalizarFilial(filtros.filial));
    }
    if (filtros.atendente) {
      query += ' AND UPPER(TRIM(atendente)) LIKE UPPER(TRIM(?))';
      params.push(`%${filtros.atendente}%`);
    }
    if (filtros.dataInicio) {
      query += ' AND data_atendimento >= ?';
      params.push(filtros.dataInicio);
    }
    if (filtros.dataFim) {
      query += ' AND data_atendimento <= ?';
      params.push(filtros.dataFim);
    }
    if (filtros.escopoTime === 'matriz') {
      query += ` AND (
        LOWER(COALESCE(origem_arquivo, '')) LIKE '%[crm_matriz]%'
        OR (
          LOWER(COALESCE(origem_arquivo, '')) LIKE '%crm prot%'
          AND LOWER(COALESCE(origem_arquivo, '')) LIKE '%reten%'
        )
      )`;
    }
    if (filtros.escopoTime === 'regional') {
      query += ` AND (
        LOWER(COALESCE(origem_arquivo, '')) LIKE '%[base_empresa]%'
        OR LOWER(COALESCE(origem_arquivo, '')) LIKE '%regional%'
        OR LOWER(COALESCE(origem_arquivo, '')) LIKE '%base empresa%'
      )`;
    }

    query += ' ORDER BY data_atendimento DESC, dataCriacao DESC';
    return db_all(query, params);
  }

  static async listarPeriodos() {
    const periodos = await db_all(
      `SELECT DISTINCT periodo
       FROM retencao_atendimentos
       WHERE periodo IS NOT NULL AND TRIM(periodo) <> ''`
    );
    return periodos.sort((a, b) => compararPeriodos(a.periodo, b.periodo));
  }

  static async listarOrigensArquivo() {
    return db_all(
      `SELECT DISTINCT origem_arquivo AS origemArquivo
       FROM retencao_atendimentos
       WHERE origem_arquivo IS NOT NULL AND TRIM(origem_arquivo) <> ''`
    );
  }

  static async removerPorOrigensArquivo(origens = []) {
    const lista = (origens || []).map((v) => normalizarTexto(v)).filter(Boolean);
    if (!lista.length) return 0;

    const placeholders = lista.map(() => '?').join(', ');
    const result = await db_run(
      `DELETE FROM retencao_atendimentos
       WHERE origem_arquivo IN (${placeholders})`,
      lista
    );
    return Number(result?.changes || 0);
  }
}

module.exports = RetencaoAtendimento;
