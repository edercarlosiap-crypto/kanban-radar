const { db_run, db_get, db_all } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class VendasMensais {
  static async listar() {
    return db_all('SELECT * FROM vendas_mensais ORDER BY periodo DESC, dataCriacao DESC');
  }

  static async buscarPorId(id) {
    return db_get('SELECT * FROM vendas_mensais WHERE id = ?', [id]);
  }

  static async listarPorPeriodo(periodo) {
    return db_all(
      'SELECT * FROM vendas_mensais WHERE periodo = ? ORDER BY dataCriacao DESC',
      [periodo]
    );
  }

  static async listarPorRegional(regionalId, periodo = null) {
    if (periodo) {
      return db_all(
        'SELECT * FROM vendas_mensais WHERE regional_id = ? AND periodo = ? ORDER BY dataCriacao DESC',
        [regionalId, periodo]
      );
    }

    return db_all(
      'SELECT * FROM vendas_mensais WHERE regional_id = ? ORDER BY dataCriacao DESC',
      [regionalId]
    );
  }

  static async listarPorVendedor(vendedorId, periodo = null) {
    if (periodo) {
      return db_all(
        'SELECT * FROM vendas_mensais WHERE vendedor_id = ? AND periodo = ? ORDER BY dataCriacao DESC',
        [vendedorId, periodo]
      );
    }

    return db_all(
      'SELECT * FROM vendas_mensais WHERE vendedor_id = ? ORDER BY dataCriacao DESC',
      [vendedorId]
    );
  }

  static async criar(dados) {
    const id = uuidv4();

    await db_run(
      `INSERT INTO vendas_mensais (
        id, periodo, vendedor_id, regional_id,
        vendas_volume, vendas_financeiro,
        mudanca_titularidade_volume, mudanca_titularidade_financeiro,
        migracao_tecnologia_volume, migracao_tecnologia_financeiro,
        renovacao_volume, renovacao_financeiro,
        plano_evento_volume, plano_evento_financeiro,
        sva_volume, sva_financeiro,
        telefonia_volume, telefonia_financeiro,
        dataAtualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        dados.periodo,
        dados.vendedorId,
        dados.regionalId,
        dados.vendasVolume,
        dados.vendasFinanceiro,
        dados.mudancaTitularidadeVolume,
        dados.mudancaTitularidadeFinanceiro,
        dados.migracaoTecnologiaVolume,
        dados.migracaoTecnologiaFinanceiro,
        dados.renovacaoVolume,
        dados.renovacaoFinanceiro,
        dados.planoEventoVolume,
        dados.planoEventoFinanceiro,
        dados.svaVolume,
        dados.svaFinanceiro,
        dados.telefoniaVolume,
        dados.telefoniaFinanceiro
      ]
    );

    return id;
  }

  static async atualizar(id, dados) {
    const result = await db_run(
      `UPDATE vendas_mensais SET
        periodo = ?,
        vendedor_id = ?,
        regional_id = ?,
        vendas_volume = ?,
        vendas_financeiro = ?,
        mudanca_titularidade_volume = ?,
        mudanca_titularidade_financeiro = ?,
        migracao_tecnologia_volume = ?,
        migracao_tecnologia_financeiro = ?,
        renovacao_volume = ?,
        renovacao_financeiro = ?,
        plano_evento_volume = ?,
        plano_evento_financeiro = ?,
        sva_volume = ?,
        sva_financeiro = ?,
        telefonia_volume = ?,
        telefonia_financeiro = ?,
        dataAtualizacao = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        dados.periodo,
        dados.vendedorId,
        dados.regionalId,
        dados.vendasVolume,
        dados.vendasFinanceiro,
        dados.mudancaTitularidadeVolume,
        dados.mudancaTitularidadeFinanceiro,
        dados.migracaoTecnologiaVolume,
        dados.migracaoTecnologiaFinanceiro,
        dados.renovacaoVolume,
        dados.renovacaoFinanceiro,
        dados.planoEventoVolume,
        dados.planoEventoFinanceiro,
        dados.svaVolume,
        dados.svaFinanceiro,
        dados.telefoniaVolume,
        dados.telefoniaFinanceiro,
        id
      ]
    );

    return result.changes;
  }

  static async deletar(id) {
    const result = await db_run('DELETE FROM vendas_mensais WHERE id = ?', [id]);
    return result.changes;
  }
}

module.exports = VendasMensais;
