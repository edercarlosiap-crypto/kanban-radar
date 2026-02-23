#!/usr/bin/env node
/**
 * Script de migração para adicionar campos de incremento por meta nivel
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
    console.log('🔄 Iniciando migração...\n');

    // Adicionar colunas de incremento por nível de meta
    await runAsync(db, `
      ALTER TABLE regras_comissao 
      ADD COLUMN meta1Incremento REAL DEFAULT 0
    `);
    console.log('  ✓ Adicionada coluna meta1Incremento');

    await runAsync(db, `
      ALTER TABLE regras_comissao 
      ADD COLUMN meta2Incremento REAL DEFAULT 0
    `);
    console.log('  ✓ Adicionada coluna meta2Incremento');

    await runAsync(db, `
      ALTER TABLE regras_comissao 
      ADD COLUMN meta3Incremento REAL DEFAULT 0
    `);
    console.log('  ✓ Adicionada coluna meta3Incremento');

    console.log('\n✅ Migração concluída com sucesso!');
  } catch (erro) {
    if (erro.message.includes('duplicate column name')) {
      console.log('⚠️  Colunas já existem no banco de dados');
    } else {
      console.error('❌ Erro na migração:', erro.message);
      throw erro;
    }
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error('❌ Falha na migração:', err);
  process.exit(1);
});
