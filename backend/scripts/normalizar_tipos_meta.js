/**
 * Script para normalizar tipoMeta em todos os registros existentes
 * Converte todos os valores para lowercase para garantir consistência
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

async function normalizarTiposMeta() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔍 Verificando registros com tipoMeta...');

      // Buscar todos os registros
      db.all('SELECT id, tipoMeta FROM regras_comissao', [], (err, rows) => {
        if (err) {
          console.error('❌ Erro ao buscar registros:', err);
          reject(err);
          return;
        }

        console.log(`📊 Total de registros encontrados: ${rows.length}`);

        if (rows.length === 0) {
          console.log('✅ Nenhum registro para normalizar');
          resolve();
          return;
        }

        let atualizados = 0;
        let erros = 0;

        // Atualizar cada registro
        const stmt = db.prepare('UPDATE regras_comissao SET tipoMeta = ? WHERE id = ?');

        rows.forEach((row, index) => {
          const tipoMetaNormalizado = row.tipoMeta.toLowerCase().trim();

          // Só atualiza se for diferente
          if (tipoMetaNormalizado !== row.tipoMeta) {
            stmt.run([tipoMetaNormalizado, row.id], (err) => {
              if (err) {
                console.error(`❌ Erro ao atualizar ${row.id}:`, err);
                erros++;
              } else {
                console.log(`✓ ${row.tipoMeta} → ${tipoMetaNormalizado}`);
                atualizados++;
              }

              // Verifica se é o último registro
              if (index === rows.length - 1) {
                stmt.finalize();
                console.log('\n📝 Resumo:');
                console.log(`✅ Registros atualizados: ${atualizados}`);
                console.log(`❌ Erros: ${erros}`);
                console.log(`📌 Sem alterações: ${rows.length - atualizados - erros}`);
                resolve();
              }
            });
          } else {
            // Se não precisa atualizar, verifica se é o último
            if (index === rows.length - 1) {
              stmt.finalize();
              console.log('\n📝 Resumo:');
              console.log(`✅ Registros atualizados: ${atualizados}`);
              console.log(`❌ Erros: ${erros}`);
              console.log(`📌 Sem alterações: ${rows.length - atualizados - erros}`);
              resolve();
            }
          }
        });
      });
    });
  });
}

// Executar normalização
console.log('🚀 Iniciando normalização de tipos de meta...\n');

normalizarTiposMeta()
  .then(() => {
    console.log('\n✅ Normalização concluída com sucesso!');
    db.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro durante normalização:', err);
    db.close();
    process.exit(1);
  });
