const { db_all, db_get, db_run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RegrasComissao {
  static async listar() {
    try {
      const regras = await db_all(`
        SELECT 
          rc.*,
          r.nome as regionalNome
         FROM regras_comissao rc
         LEFT JOIN regionais r ON rc.regionalId = r.id
         ORDER BY rc.dataCriacao DESC
      `);
      return regras;
    } catch (erro) {
      throw erro;
    }
  }

  static async buscarPorId(id) {
    try {
      const regra = await db_get(
        'SELECT * FROM regras_comissao WHERE id = ?',
        [id]
      );
      return regra;
    } catch (erro) {
      throw erro;
    }
  }

  static async buscarPorRegional(regionalId) {
    try {
      const regras = await db_all(
        'SELECT * FROM regras_comissao WHERE regionalId = ? ORDER BY tipoMeta ASC',
        [regionalId]
      );
      return regras;
    } catch (erro) {
      throw erro;
    }
  }

  static async criar(dados) {
    try {
      const id = uuidv4();

      await db_run(
        `INSERT INTO regras_comissao (
          id, regionalId, tipoMeta, periodo, meta1Volume, meta1Percent,
          meta2Volume, meta2Percent, meta3Volume, meta3Percent,
          meta1PercentIndividual, meta2PercentIndividual, meta3PercentIndividual,
          incrementoGlobal, pesoVendasChurn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          dados.regionalId,
          dados.tipoMeta,
          dados.periodo || 'Dez/25',
          dados.meta1Volume,
          dados.meta1Percent,
          dados.meta2Volume,
          dados.meta2Percent,
          dados.meta3Volume,
          dados.meta3Percent,
          dados.meta1PercentIndividual || 0,
          dados.meta2PercentIndividual || 0,
          dados.meta3PercentIndividual || 0,
          dados.incrementoGlobal || 0,
          dados.pesoVendasChurn || 0.5
        ]
      );

      return id;
    } catch (erro) {
      throw erro;
    }
  }

  static async atualizar(id, dados) {
    try {
      const result = await db_run(
        `UPDATE regras_comissao SET 
          tipoMeta = ?, periodo = ?, meta1Volume = ?, meta1Percent = ?,
          meta2Volume = ?, meta2Percent = ?,
          meta3Volume = ?, meta3Percent = ?,
          meta1PercentIndividual = ?, meta2PercentIndividual = ?, meta3PercentIndividual = ?,
          incrementoGlobal = ?, pesoVendasChurn = ?,
          dataAtualizacao = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          dados.tipoMeta,
          dados.periodo || 'Dez/25',
          dados.meta1Volume,
          dados.meta1Percent,
          dados.meta2Volume,
          dados.meta2Percent,
          dados.meta3Volume,
          dados.meta3Percent,
          dados.meta1PercentIndividual || 0,
          dados.meta2PercentIndividual || 0,
          dados.meta3PercentIndividual || 0,
          dados.incrementoGlobal || 0,
          dados.pesoVendasChurn || 0.5,
          id
        ]
      );

      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }

  static async deletar(id) {
    try {
      const result = await db_run(
        'DELETE FROM regras_comissao WHERE id = ?',
        [id]
      );
      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = RegrasComissao;
