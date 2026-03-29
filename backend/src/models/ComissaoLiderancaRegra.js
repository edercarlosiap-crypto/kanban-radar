const { db_run, db_get } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ComissaoLiderancaRegra {
  static valoresPadrao(periodo) {
    return {
      periodo,
      gerenteRegionalMultiplier: 1.2,
      supervisorRegionalMultiplier: 1.0,
      gerenteMatrizMultiplier: 2.4
    };
  }

  static async obterPorPeriodo(periodo) {
    const row = await db_get(
      `SELECT
        periodo,
        gerenteRegionalMultiplier,
        supervisorRegionalMultiplier,
        gerenteMatrizMultiplier
       FROM comissao_lideranca_regras
       WHERE periodo = ?`,
      [periodo]
    );

    if (!row) {
      return ComissaoLiderancaRegra.valoresPadrao(periodo);
    }

    return {
      periodo: row.periodo,
      gerenteRegionalMultiplier: Number(row.gerenteRegionalMultiplier) || 1.2,
      supervisorRegionalMultiplier: Number(row.supervisorRegionalMultiplier) || 1.0,
      gerenteMatrizMultiplier: Number(row.gerenteMatrizMultiplier) || 2.4
    };
  }

  static async salvarPorPeriodo(dados) {
    const periodo = String(dados.periodo || '').trim();
    const gerenteRegionalMultiplier = Number(dados.gerenteRegionalMultiplier);
    const supervisorRegionalMultiplier = Number(dados.supervisorRegionalMultiplier);
    const gerenteMatrizMultiplier = Number(dados.gerenteMatrizMultiplier);

    const existente = await db_get(
      'SELECT id FROM comissao_lideranca_regras WHERE periodo = ?',
      [periodo]
    );

    if (existente?.id) {
      await db_run(
        `UPDATE comissao_lideranca_regras SET
          gerenteRegionalMultiplier = ?,
          supervisorRegionalMultiplier = ?,
          gerenteMatrizMultiplier = ?,
          dataAtualizacao = CURRENT_TIMESTAMP
         WHERE periodo = ?`,
        [
          gerenteRegionalMultiplier,
          supervisorRegionalMultiplier,
          gerenteMatrizMultiplier,
          periodo
        ]
      );
      return existente.id;
    }

    const id = uuidv4();
    await db_run(
      `INSERT INTO comissao_lideranca_regras (
        id, periodo, gerenteRegionalMultiplier, supervisorRegionalMultiplier, gerenteMatrizMultiplier
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        periodo,
        gerenteRegionalMultiplier,
        supervisorRegionalMultiplier,
        gerenteMatrizMultiplier
      ]
    );

    return id;
  }
}

module.exports = ComissaoLiderancaRegra;
