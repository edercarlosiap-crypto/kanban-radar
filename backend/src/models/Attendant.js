// ===================================================================
// MODELO DE ATENDENTES (ATTENDANTS)
// ===================================================================

const { db_run, db_all, db_get } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Attendant {
  static async create(name) {
    const id = uuidv4();
    await db_run(
      'INSERT INTO attendants (id, name) VALUES (?, ?)',
      [id, name]
    );
    return id;
  }

  static async listActive() {
    return db_all('SELECT id, name FROM attendants WHERE active = 1 ORDER BY name');
  }

  static async getById(id) {
    return db_get('SELECT id, name, active FROM attendants WHERE id = ?', [id]);
  }
}

module.exports = Attendant;
