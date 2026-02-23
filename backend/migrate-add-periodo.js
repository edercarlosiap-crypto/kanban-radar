#!/usr/bin/env node
/**
 * Script de migração para adicionar campo de período (mês/ano) nas regras de comissão
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
    console.log('🔄 Iniciando migração para adicionar período...\n');

    // Adicionar coluna periodo
    await runAsync(db, `
      ALTER TABLE regras_comissao 
      ADD COLUMN periodo TEXT DEFAULT 'Dez/25'
    `);
    console.log('  ✓ Adicionada coluna periodo');

    // Atualizar registros existentes
    await runAsync(db, `
      UPDATE regras_comissao 
      SET periodo = 'Dez/25' 
      WHERE periodo IS NULL OR periodo = ''
    `);
    console.log('  ✓ Registros existentes atualizados com "Dez/25"');

    console.log('\n✅ Migração concluída com sucesso!');
  } catch (erro) {
    if (erro.message.includes('duplicate column name')) {
      console.log('⚠️  Coluna periodo já existe no banco de dados');
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
