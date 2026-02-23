// ===================================================================
// MODELO DE TENTATIVAS DE RETENCAO (RETENTION ATTEMPTS)
// ===================================================================

const { db_run, db_all, db_get } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RetentionAttempt {
  static async create(data) {
    const id = uuidv4();
    const { attendant_id, attendant_name, customer_id, customer_name, branch, contract_id, 
            previous_calls_3_months, previous_call_count, call_origin, reason_category, 
            reason_subcategory, interaction_type, has_fine, outcome, notes } = data;

    await db_run(
      `INSERT INTO retention_attempts (
        id, attendant_id, attendant_name, customer_id, customer_name, branch, contract_id,
        previous_calls_3_months, previous_call_count, call_origin, reason_category,
        reason_subcategory, interaction_type, has_fine, outcome, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, attendant_id, attendant_name, customer_id, customer_name, branch, contract_id,
       previous_calls_3_months ? 1 : 0, previous_call_count, call_origin, reason_category,
       reason_subcategory, interaction_type, has_fine ? 1 : 0, outcome, notes]
    );
    return id;
  }

  static async list(filters = {}) {
    let query = 'SELECT * FROM retention_attempts WHERE 1=1';
    const params = [];

    if (filters.attendant_id) {
      query += ' AND attendant_id = ?';
      params.push(filters.attendant_id);
    }
    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.outcome) {
      query += ' AND outcome = ?';
      params.push(filters.outcome);
    }
    if (filters.reason_category) {
      query += ' AND reason_category = ?';
      params.push(filters.reason_category);
    }
    // Adicionar mais filtros conforme necessario

    query += ' ORDER BY created_at DESC';
    return db_all(query, params);
  }

  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM retention_attempts WHERE 1=1';
    const params = [];

    if (filters.attendant_id) {
      query += ' AND attendant_id = ?';
      params.push(filters.attendant_id);
    }
    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.outcome) {
      query += ' AND outcome = ?';
      params.push(filters.outcome);
    }
    if (filters.reason_category) {
      query += ' AND reason_category = ?';
      params.push(filters.reason_category);
    }

    const result = await db_get(query, params);
    return result ? result.total : 0;
  }

  static async countCancellations(filters = {}) {
    let query = "SELECT COUNT(*) as total FROM retention_attempts WHERE outcome = 'Cancelamento Efetivado'";

    const params = [];

    if (filters.attendant_id) {
      query += ' AND attendant_id = ?';
      params.push(filters.attendant_id);
    }
    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.reason_category) {
      query += ' AND reason_category = ?';
      params.push(filters.reason_category);
    }

    const result = await db_get(query, params);
    return result ? result.total : 0;
  }

  static async countReversals(filters = {}) {
    let query = `SELECT COUNT(*) as total FROM retention_attempts 
                 WHERE outcome LIKE 'Reversao (%)' OR outcome = 'Titularidade'`;
    const params = [];

    if (filters.attendant_id) {
      query += ' AND attendant_id = ?';
      params.push(filters.attendant_id);
    }
    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.reason_category) {
      query += ' AND reason_category = ?';
      params.push(filters.reason_category);
    }

    const result = await db_get(query, params);
    return result ? result.total : 0;
  }

  static async countByOutcome(filters = {}) {
    let query = 'SELECT outcome, COUNT(*) as total FROM retention_attempts WHERE 1=1';
    const params = [];

    if (filters.attendant_id) {
      query += ' AND attendant_id = ?';
      params.push(filters.attendant_id);
    }
    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.reason_category) {
      query += ' AND reason_category = ?';
      params.push(filters.reason_category);
    }

    query += ' GROUP BY outcome';
    return db_all(query, params);
  }

  static async countByReasonCategory(filters = {}) {
    let query = 'SELECT reason_category, COUNT(*) as total FROM retention_attempts WHERE 1=1';
    const params = [];

    if (filters.attendant_id) {
      query += ' AND attendant_id = ?';
      params.push(filters.attendant_id);
    }
    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.outcome) {
      query += ' AND outcome = ?';
      params.push(filters.outcome);
    }

    query += ' GROUP BY reason_category';
    return db_all(query, params);
  }

  static async countAttemptsPerDay(filters = {}) {
    let query = `SELECT
                   DATE(created_at) as date,
                   COUNT(*) as total
                 FROM retention_attempts
                 WHERE 1=1`;
    const params = [];

    if (filters.attendant_id) {
      query += ' AND attendant_id = ?';
      params.push(filters.attendant_id);
    }
    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.outcome) {
      query += ' AND outcome = ?';
      params.push(filters.outcome);
    }
    if (filters.reason_category) {
      query += ' AND reason_category = ?';
      params.push(filters.reason_category);
    }

    query += ' GROUP BY date ORDER BY date';
    return db_all(query, params);
  }

  static async countByAttendant(filters = {}) {
    let query = `SELECT
                   attendant_id,
                   attendant_name,
                   COUNT(*) as total_calls,
                   SUM(CASE WHEN outcome LIKE 'Reversao (%)' OR outcome = 'Titularidade' THEN 1 ELSE 0 END) as total_retentions
                 FROM retention_attempts
                 WHERE 1=1`;
    const params = [];

    if (filters.branch) {
      query += ' AND branch = ?';
      params.push(filters.branch);
    }
    if (filters.reason_category) {
      query += ' AND reason_category = ?';
      params.push(filters.reason_category);
    }
    if (filters.outcome) {
      query += ' AND outcome = ?';
      params.push(filters.outcome);
    }

    query += ' GROUP BY attendant_id, attendant_name ORDER BY total_retentions DESC';
    return db_all(query, params);
  }

  static async getUniqueValues(field) {
    return db_all(`SELECT DISTINCT ${field} FROM retention_attempts WHERE ${field} IS NOT NULL ORDER BY ${field}`);
  }
}

module.exports = RetentionAttempt;
