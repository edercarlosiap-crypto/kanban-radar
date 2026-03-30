const { db_run, db_all, db_get } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const texto = (value) => String(value || '').trim();
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
  const periodo = removerAcentos(texto(periodoRaw)).toLowerCase();
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
    return texto(a).localeCompare(texto(b));
  }
  if (chaveA === null) return 1;
  if (chaveB === null) return -1;
  if (chaveA !== chaveB) return chaveA - chaveB;
  return texto(a).localeCompare(texto(b));
};

class ContratoEmpresa {
  static segmentoExpr() {
    return `CASE
      WHEN tipo_assinante IS NULL OR TRIM(tipo_assinante) = '' THEN 'Sem segmento'
      ELSE TRIM(tipo_assinante)
    END`;
  }

  static areaExpr() {
    return `CASE
      WHEN (
        COALESCE(TRIM(tipo_contrato), '') = '' AND
        COALESCE(TRIM(descricao_servico), '') = '' AND
        COALESCE(TRIM(tipo_assinante), '') = ''
      ) THEN 'Nao classificado'
      WHEN (
        LOWER(COALESCE(tipo_contrato, '')) LIKE '%rural%' OR
        LOWER(COALESCE(descricao_servico, '')) LIKE '%rural%' OR
        LOWER(COALESCE(tipo_assinante, '')) LIKE '%rural%'
      ) THEN 'Rural'
      ELSE 'Urbano'
    END`;
  }

  static naturezaReceitaExpr() {
    const fonteNatureza = `LOWER(
      COALESCE(carteira_cobranca, '') || ' ' ||
      COALESCE(tipo_cobranca, '') || ' ' ||
      COALESCE(descricao_servico, '') || ' ' ||
      COALESCE(tipo_produto, '')
    )`;

    return `CASE
      WHEN (
        COALESCE(TRIM(carteira_cobranca), '') = '' AND
        COALESCE(TRIM(tipo_cobranca), '') = '' AND
        COALESCE(TRIM(descricao_servico), '') = '' AND
        COALESCE(TRIM(tipo_produto), '') = ''
      ) THEN 'Nao classificado'
      WHEN (${fonteNatureza} LIKE '%permuta aluguel infra%') THEN 'Permuta Aluguel Infra'
      WHEN (
        ${fonteNatureza} LIKE '%permuta%patroc%' OR
        ${fonteNatureza} LIKE '%permuta%mkt%' OR
        ${fonteNatureza} LIKE '%patroc%/mkt%' OR
        ${fonteNatureza} LIKE '%patroc% mkt%'
      ) THEN 'Permuta Patrocinio/MKT'
      WHEN (${fonteNatureza} LIKE '%cortesia%') THEN 'Cortesias'
      WHEN (
        ${fonteNatureza} LIKE '%beneficio internet time%' OR
        ${fonteNatureza} LIKE '%benef%internet time%' OR
        ${fonteNatureza} LIKE '%benef%internet%' OR
        ${fonteNatureza} LIKE '%internet time%'
      ) THEN 'Beneficio Internet Time'
      WHEN (${fonteNatureza} LIKE '%permuta%') THEN 'Permuta'
      ELSE 'Pago'
    END`;
  }

  static async upsert(dados) {
    const id = uuidv4();
    await db_run(
      `INSERT INTO contratos_base (
        id,
        periodo_referencia,
        empresa,
        filial,
        contrato_id,
        cliente_id,
        tipo_assinante,
        tipo_cliente,
        origem,
        status,
        status_acesso,
        base,
        descricao_servico,
        tipo_produto,
        tipo_contrato,
        tipo_cobranca,
        carteira_cobranca,
        vendedor,
        valor,
        cidade,
        uf,
        dt_criacao_contrato,
        dt_ativacao,
        dt_cancelamento,
        chave_negocio,
        origem_arquivo,
        dataAtualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(chave_negocio) DO UPDATE SET
        empresa = excluded.empresa,
        filial = excluded.filial,
        contrato_id = excluded.contrato_id,
        cliente_id = excluded.cliente_id,
        tipo_assinante = excluded.tipo_assinante,
        tipo_cliente = excluded.tipo_cliente,
        origem = excluded.origem,
        status = excluded.status,
        status_acesso = excluded.status_acesso,
        base = excluded.base,
        descricao_servico = excluded.descricao_servico,
        tipo_produto = excluded.tipo_produto,
        tipo_contrato = excluded.tipo_contrato,
        tipo_cobranca = excluded.tipo_cobranca,
        carteira_cobranca = excluded.carteira_cobranca,
        vendedor = excluded.vendedor,
        valor = excluded.valor,
        cidade = excluded.cidade,
        uf = excluded.uf,
        dt_criacao_contrato = excluded.dt_criacao_contrato,
        dt_ativacao = excluded.dt_ativacao,
        dt_cancelamento = excluded.dt_cancelamento,
        origem_arquivo = excluded.origem_arquivo,
        dataAtualizacao = CURRENT_TIMESTAMP`,
      [
        id,
        dados.periodoReferencia,
        dados.empresa || null,
        dados.filial || null,
        dados.contratoId || null,
        dados.clienteId || null,
        dados.tipoAssinante || null,
        dados.tipoCliente || null,
        dados.origem || null,
        dados.status || null,
        dados.statusAcesso || null,
        dados.base || null,
        dados.descricaoServico || null,
        dados.tipoProduto || null,
        dados.tipoContrato || null,
        dados.tipoCobranca || null,
        dados.carteiraCobranca || null,
        dados.vendedor || null,
        Number.isFinite(Number(dados.valor)) ? Number(dados.valor) : 0,
        dados.cidade || null,
        dados.uf || null,
        dados.dtCriacaoContrato || null,
        dados.dtAtivacao || null,
        dados.dtCancelamento || null,
        dados.chaveNegocio,
        dados.origemArquivo || null
      ]
    );
  }

  static async limparPeriodo(periodoReferencia) {
    return db_run(
      `DELETE FROM contratos_base WHERE periodo_referencia = ?`,
      [texto(periodoReferencia)]
    );
  }

  static montarWhere(filtros = {}, params = []) {
    let where = ' WHERE 1=1';
    const segmentoExpr = this.segmentoExpr();
    const areaExpr = this.areaExpr();
    const naturezaReceitaExpr = this.naturezaReceitaExpr();

    if (texto(filtros.periodo)) {
      where += ' AND periodo_referencia = ?';
      params.push(texto(filtros.periodo));
    }
    if (texto(filtros.filial)) {
      where += ' AND filial = ?';
      params.push(texto(filtros.filial));
    }
    if (texto(filtros.status)) {
      where += ' AND status = ?';
      params.push(texto(filtros.status));
    }
    if (texto(filtros.statusAcesso)) {
      where += ' AND status_acesso = ?';
      params.push(texto(filtros.statusAcesso));
    }
    if (texto(filtros.base)) {
      where += ' AND base = ?';
      params.push(texto(filtros.base));
    }

    const segmentos = Array.isArray(filtros.segmentos)
      ? filtros.segmentos.map((s) => texto(s)).filter(Boolean)
      : [];

    if (segmentos.length > 0) {
      const placeholders = segmentos.map(() => '?').join(', ');
      where += ` AND ${segmentoExpr} IN (${placeholders})`;
      params.push(...segmentos);
    } else if (texto(filtros.segmento)) {
      where += ` AND ${segmentoExpr} = ?`;
      params.push(texto(filtros.segmento));
    }

    if (texto(filtros.area)) {
      where += ` AND ${areaExpr} = ?`;
      params.push(texto(filtros.area));
    }

    const naturezasReceita = Array.isArray(filtros.naturezasReceita)
      ? filtros.naturezasReceita.map((n) => texto(n)).filter(Boolean)
      : [];

    if (naturezasReceita.length > 0) {
      const placeholders = naturezasReceita.map(() => '?').join(', ');
      where += ` AND ${naturezaReceitaExpr} IN (${placeholders})`;
      params.push(...naturezasReceita);
    } else if (texto(filtros.naturezaReceita)) {
      where += ` AND ${naturezaReceitaExpr} = ?`;
      params.push(texto(filtros.naturezaReceita));
    }

    return where;
  }

  static async listar(filtros = {}) {
    const params = [];
    const where = this.montarWhere(filtros, params);
    const areaExpr = this.areaExpr();
    const naturezaReceitaExpr = this.naturezaReceitaExpr();
    const segmentoExpr = this.segmentoExpr();

    return db_all(
      `SELECT
        periodo_referencia,
        filial,
        ${segmentoExpr} AS segmento,
        contrato_id,
        cliente_id,
        descricao_servico,
        tipo_produto,
        status,
        status_acesso,
        base,
        ${areaExpr} AS area_classificacao,
        ${naturezaReceitaExpr} AS natureza_receita,
        valor
      FROM contratos_base
      ${where}
      ORDER BY valor DESC
      LIMIT 500`,
      params
    );
  }

  static async listarPeriodos() {
    const periodos = await db_all(
      `SELECT DISTINCT periodo_referencia AS periodo
       FROM contratos_base
       WHERE periodo_referencia IS NOT NULL AND TRIM(periodo_referencia) <> ''`
    );
    return periodos.sort((a, b) => compararPeriodos(a.periodo, b.periodo));
  }

  static async listarOpcoesFiltro() {
    const segmentoExpr = this.segmentoExpr();
    const areaExpr = this.areaExpr();
    const naturezaReceitaExpr = this.naturezaReceitaExpr();

    const [filiais, status, statusAcesso, bases, segmentos, areas, naturezas] = await Promise.all([
      db_all(`SELECT DISTINCT filial FROM contratos_base WHERE filial IS NOT NULL AND TRIM(filial) <> '' ORDER BY filial`),
      db_all(`SELECT DISTINCT status FROM contratos_base WHERE status IS NOT NULL AND TRIM(status) <> '' ORDER BY status`),
      db_all(`SELECT DISTINCT status_acesso FROM contratos_base WHERE status_acesso IS NOT NULL AND TRIM(status_acesso) <> '' ORDER BY status_acesso`),
      db_all(`SELECT DISTINCT base FROM contratos_base WHERE base IS NOT NULL AND TRIM(base) <> '' ORDER BY base`),
      db_all(`SELECT DISTINCT ${segmentoExpr} AS segmento FROM contratos_base ORDER BY segmento`),
      db_all(`SELECT DISTINCT ${areaExpr} AS area FROM contratos_base ORDER BY area`),
      db_all(`SELECT DISTINCT ${naturezaReceitaExpr} AS natureza FROM contratos_base ORDER BY natureza`)
    ]);

    const naturezaPadrao = [
      'Pago',
      'Permuta',
      'Permuta Aluguel Infra',
      'Permuta Patrocinio/MKT',
      'Cortesias',
      'Beneficio Internet Time',
      'Nao classificado'
    ];
    const naturezaDoBanco = naturezas.map((r) => r.natureza).filter(Boolean);
    const naturezasReceita = Array.from(new Set([...naturezaPadrao, ...naturezaDoBanco]));

    return {
      filiais: filiais.map((r) => r.filial),
      status: status.map((r) => r.status),
      statusAcessos: statusAcesso.map((r) => r.status_acesso),
      bases: bases.map((r) => r.base),
      segmentos: segmentos.map((r) => r.segmento),
      areas: areas.map((r) => r.area),
      naturezasReceita
    };
  }

  static async analytics(filtros = {}) {
    const params = [];
    const where = this.montarWhere(filtros, params);
    const segmentoExpr = this.segmentoExpr();
    const areaExpr = this.areaExpr();
    const naturezaReceitaExpr = this.naturezaReceitaExpr();

    const resumo = await db_get(
      `SELECT
        COUNT(*) AS total_contratos,
        COALESCE(SUM(valor), 0) AS total_receita,
        COALESCE(AVG(valor), 0) AS ticket_medio
      FROM contratos_base
      ${where}`,
      params
    );

    const receitaPorSegmento = await db_all(
      `SELECT
        ${segmentoExpr} AS segmento,
        COUNT(*) AS contratos,
        COALESCE(SUM(valor), 0) AS receita
      FROM contratos_base
      ${where}
      GROUP BY ${segmentoExpr}
      ORDER BY receita DESC`,
      params
    );

    const receitaPorArea = await db_all(
      `SELECT
        ${areaExpr} AS area,
        COUNT(*) AS contratos,
        COALESCE(SUM(valor), 0) AS receita
      FROM contratos_base
      ${where}
      GROUP BY ${areaExpr}
      ORDER BY receita DESC`,
      params
    );

    const receitaPorNaturezaReceita = await db_all(
      `SELECT
        ${naturezaReceitaExpr} AS natureza_receita,
        COUNT(*) AS contratos,
        COALESCE(SUM(valor), 0) AS receita
      FROM contratos_base
      ${where}
      GROUP BY ${naturezaReceitaExpr}
      ORDER BY receita DESC`,
      params
    );

    return {
      resumo: {
        totalContratos: Number(resumo?.total_contratos || 0),
        totalReceita: Number(resumo?.total_receita || 0),
        ticketMedio: Number(resumo?.ticket_medio || 0)
      },
      receitaPorSegmento: receitaPorSegmento.map((r) => ({
        segmento: r.segmento || 'Sem segmento',
        contratos: Number(r.contratos || 0),
        receita: Number(r.receita || 0)
      })),
      receitaPorArea: receitaPorArea.map((r) => ({
        area: r.area || 'Nao classificado',
        contratos: Number(r.contratos || 0),
        receita: Number(r.receita || 0)
      })),
      receitaPorNaturezaReceita: receitaPorNaturezaReceita.map((r) => ({
        naturezaReceita: r.natureza_receita || 'Nao classificado',
        contratos: Number(r.contratos || 0),
        receita: Number(r.receita || 0)
      }))
    };
  }
}

module.exports = ContratoEmpresa;


