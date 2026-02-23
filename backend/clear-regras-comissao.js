#!/usr/bin/env node
/**
 * Script para limpar todos os dados da tabela regras_comissao
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function main() {
  const db = new sqlite3.Database(dbPath);

  try {
    console.log('🔄 Limpando dados da tabela regras_comissao...\n');

    const result = await runAsync(db, 'DELETE FROM regras_comissao');
    
    console.log(`✅ ${result.changes} regra(s) deletada(s) com sucesso!`);
    
  } catch (erro) {
    console.error('❌ Erro ao limpar dados:', erro.message);
    throw erro;
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error('❌ Falha ao limpar dados:', err);
  process.exit(1);
});
