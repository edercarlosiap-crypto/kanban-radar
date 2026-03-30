const { v4: uuidv4 } = require('uuid');
const { db_run, db_all } = require('../config/database');

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter((v) => String(v || '').trim());
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

class MarketingOrcadoReal {
  static async substituirAno(anoReferencia) {
    await db_run('DELETE FROM marketing_lancamentos WHERE ano_referencia = ?', [anoReferencia]);
    await db_run('DELETE FROM marketing_orcamentos WHERE ano_referencia = ?', [anoReferencia]);
  }

  static async importar({
    anoReferencia,
    origemArquivo,
    substituirAno = true,
    lancamentos = [],
    orcamentos = []
  }) {
    if (substituirAno) {
      await this.substituirAno(anoReferencia);
    }

    let totalLancamentos = 0;
    let totalOrcamentos = 0;

    for (const item of lancamentos) {
      await db_run(
        `INSERT INTO marketing_lancamentos (
          id, ano_referencia, mes_referencia, regional, tipo_lancamento, tipo_custo, patrocinador, projeto,
          valor, data_inicio, data_fim, status, observacoes, origem_arquivo, dataAtualizacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          uuidv4(),
          anoReferencia,
          item.mesReferencia ?? null,
          item.regional || null,
          item.tipoLancamento || null,
          item.tipoCusto || null,
          item.patrocinador || null,
          item.projeto || null,
          Number(item.valor || 0),
          item.dataInicio || null,
          item.dataFim || null,
          item.status || null,
          item.observacoes || null,
          origemArquivo || null
        ]
      );
      totalLancamentos += 1;
    }

    for (const item of orcamentos) {
      await db_run(
        `INSERT INTO marketing_orcamentos (
          id, ano_referencia, mes_referencia, categoria, valor_orcado, origem_arquivo, dataAtualizacao
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          uuidv4(),
          anoReferencia,
          Number(item.mesReferencia),
          item.categoria || '',
          Number(item.valorOrcado || 0),
          origemArquivo || null
        ]
      );
      totalOrcamentos += 1;
    }

    return { totalLancamentos, totalOrcamentos };
  }

  static async listarAnos() {
    return db_all(
      `SELECT DISTINCT ano FROM (
        SELECT ano_referencia AS ano FROM marketing_lancamentos
        UNION
        SELECT ano_referencia AS ano FROM marketing_orcamentos
      ) t
      WHERE ano IS NOT NULL
      ORDER BY ano`
    );
  }

  static async listarFiltros({ anoReferencia } = {}) {
    const where = ['1=1'];
    const params = [];
    if (anoReferencia) {
      where.push('ano_referencia = ?');
      params.push(Number(anoReferencia));
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [regionais, categorias, tipos, status] = await Promise.all([
      db_all(
        `SELECT DISTINCT regional FROM marketing_lancamentos ${whereSql}
         AND regional IS NOT NULL AND TRIM(regional) <> '' ORDER BY regional`,
        params
      ),
      db_all(
        `SELECT DISTINCT tipo_custo AS categoria FROM marketing_lancamentos ${whereSql}
         AND tipo_custo IS NOT NULL AND TRIM(tipo_custo) <> '' ORDER BY categoria`,
        params
      ),
      db_all(
        `SELECT DISTINCT tipo_lancamento FROM marketing_lancamentos ${whereSql}
         AND tipo_lancamento IS NOT NULL AND TRIM(tipo_lancamento) <> '' ORDER BY tipo_lancamento`,
        params
      ),
      db_all(
        `SELECT DISTINCT status FROM marketing_lancamentos ${whereSql}
         AND status IS NOT NULL AND TRIM(status) <> '' ORDER BY status`,
        params
      )
    ]);

    return {
      regionais: regionais.map((r) => r.regional).filter(Boolean),
      categorias: categorias.map((r) => r.categoria).filter(Boolean),
      tiposLancamento: tipos.map((r) => r.tipo_lancamento).filter(Boolean),
      status: status.map((r) => r.status).filter(Boolean)
    };
  }

  static async listarLancamentos(filtros = {}) {
    const where = ['ano_referencia = ?'];
    const params = [Number(filtros.anoReferencia)];

    const regionais = toArray(filtros.regionais);
    const categorias = toArray(filtros.categorias);
    const tiposLancamento = toArray(filtros.tiposLancamento);
    const status = toArray(filtros.status);

    if (regionais.length) {
      where.push(`regional IN (${regionais.map(() => '?').join(',')})`);
      params.push(...regionais);
    }
    if (categorias.length) {
      where.push(`tipo_custo IN (${categorias.map(() => '?').join(',')})`);
      params.push(...categorias);
    }
    if (tiposLancamento.length) {
      where.push(`tipo_lancamento IN (${tiposLancamento.map(() => '?').join(',')})`);
      params.push(...tiposLancamento);
    }
    if (status.length) {
      where.push(`status IN (${status.map(() => '?').join(',')})`);
      params.push(...status);
    }

    const limite = Math.max(1, Math.min(Number(filtros.limite) || 500, 5000));
    params.push(limite);

    return db_all(
      `SELECT *
       FROM marketing_lancamentos
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(data_inicio, data_fim) DESC, dataCriacao DESC
       LIMIT ?`,
      params
    );
  }

  static async listarOrcamentos(anoReferencia) {
    return db_all(
      `SELECT *
       FROM marketing_orcamentos
       WHERE ano_referencia = ?
       ORDER BY categoria, mes_referencia`,
      [Number(anoReferencia)]
    );
  }

  static async listarDados(filtros = {}) {
    const [lancamentos, orcamentos] = await Promise.all([
      this.listarLancamentos({ ...filtros, limite: filtros.limite || 5000 }),
      this.listarOrcamentos(filtros.anoReferencia)
    ]);

    return { lancamentos, orcamentos };
  }
}

module.exports = MarketingOrcadoReal;
