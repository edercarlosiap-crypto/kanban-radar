/**
 * Script para corrigir acentuação de "migração de técnologia" 
 * para "migração de tecnologia" no banco de dados
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

async function corrigirAcentuacao() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔍 Buscando registros com "migração de técnologia"...');

      // Buscar registros com erro de acentuação
      db.all(
        `SELECT id, tipoMeta FROM regras_comissao 
         WHERE LOWER(tipoMeta) LIKE '%técnolog%' OR tipoMeta LIKE '%técnolog%'`,
        [],
        (err, rows) => {
          if (err) {
            console.error('❌ Erro ao buscar registros:', err);
            reject(err);
            return;
          }

          console.log(`📊 Total de registros encontrados: ${rows.length}`);

          if (rows.length === 0) {
            console.log('✅ Nenhum registro com erro de acentuação encontrado');
            resolve();
            return;
          }

          let atualizados = 0;
          let erros = 0;

          // Atualizar cada registro
          const stmt = db.prepare(
            'UPDATE regras_comissao SET tipoMeta = ? WHERE id = ?'
          );

          rows.forEach((row, index) => {
            // Corrigir a acentuação
            const tipoCorrigido = row.tipoMeta
              .toLowerCase()
              .replace('técnologia', 'tecnologia');

            stmt.run([tipoCorrigido, row.id], (err) => {
              if (err) {
                console.error(`❌ Erro ao atualizar ${row.id}:`, err);
                erros++;
              } else {
                console.log(`✓ ${row.tipoMeta} → ${tipoCorrigido}`);
                atualizados++;
              }

              // Verifica se é o último registro
              if (index === rows.length - 1) {
                stmt.finalize();
                console.log('\n📝 Resumo:');
                console.log(`✅ Registros atualizados: ${atualizados}`);
                console.log(`❌ Erros: ${erros}`);
                resolve();
              }
            });
          });
        }
      );
    });
  });
}

// Executar correção
console.log('🚀 Iniciando correção de acentuação...\n');

corrigirAcentuacao()
  .then(() => {
    console.log('\n✅ Correção concluída com sucesso!');
    db.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro durante correção:', err);
    db.close();
    process.exit(1);
  });
