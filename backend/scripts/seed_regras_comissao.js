const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database('./database.sqlite');

async function inserirRegrasExemplo() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Primeiro, obter IDs das regionais e tipos_meta
      db.all('SELECT id FROM regionais LIMIT 1', (err, regionais) => {
        if (err || regionais.length === 0) {
          console.error('Erro: Nenhuma regional encontrada');
          reject(err);
          return;
        }

        db.all('SELECT id, nome FROM tipos_meta', (err, tipos) => {
          if (err || tipos.length === 0) {
            console.error('Erro: Nenhum tipo de meta encontrado');
            reject(err);
            return;
          }

          const regionalId = regionais[0].id;
          let tiposInseridos = 0;

          // Criar uma regra para cada tipo de meta
          tipos.forEach(tipo => {
            const regra = {
              id: uuidv4(),
              regionalId: regionalId,
              tipoMeta: tipo.nome,
              periodo: 'Dez/25',
              meta1Volume: 150,
              meta1Percent: 8,
              meta2Volume: 120,
              meta2Percent: 5,
              meta3Volume: 100,
              meta3Percent: 3,
              incrementoGlobal: 0.05,
              pesoVendasChurn: 0.6,
              meta1PercentIndividual: 1,
              meta2PercentIndividual: 0.5,
              meta3PercentIndividual: 0.3
            };

            db.run(
              `INSERT INTO regras_comissao (
                id, regionalId, tipoMeta, periodo, meta1Volume, meta1Percent,
                meta2Volume, meta2Percent, meta3Volume, meta3Percent,
                incrementoGlobal, pesoVendasChurn, meta1PercentIndividual,
                meta2PercentIndividual, meta3PercentIndividual
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                regra.id, regra.regionalId, regra.tipoMeta, regra.periodo,
                regra.meta1Volume, regra.meta1Percent,
                regra.meta2Volume, regra.meta2Percent,
                regra.meta3Volume, regra.meta3Percent,
                regra.incrementoGlobal, regra.pesoVendasChurn,
                regra.meta1PercentIndividual, regra.meta2PercentIndividual,
                regra.meta3PercentIndividual
              ],
              (err) => {
                if (!err) tiposInseridos++;
                else if (!err.message.includes('UNIQUE')) {
                  console.error('Erro ao inserir regra:', err);
                }
              }
            );
          });

          setTimeout(() => {
            db.all('SELECT COUNT(*) as total FROM regras_comissao', (err, rows) => {
              if (err) {
                console.error('Erro ao contar:', err);
              } else {
                console.log(`✓ Total de regras de comissão no banco: ${rows[0].total}`);
              }
              resolve();
            });
          }, 300);
        });
      });
    });
  });
}

inserirRegrasExemplo()
  .then(() => {
    console.log('✅ Regras de exemplo inseridas com sucesso!');
    db.close();
  })
  .catch(err => {
    console.error('✗ Erro:', err);
    db.close();
    process.exit(1);
  });
