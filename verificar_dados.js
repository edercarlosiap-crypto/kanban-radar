const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Regionais disponíveis no banco:\n');

db.all('SELECT id, nome FROM regionais', (err, regionais) => {
  if (err) {
    console.error('Erro:', err);
    db.close();
    return;
  }

  if (!regionais || regionais.length === 0) {
    console.log('❌ Nenhuma regional encontrada');
    db.close();
    return;
  }

  regionais.forEach((r, i) => {
    console.log(`${i + 1}. ${r.nome}`);
    console.log(`   ID: ${r.id}\n`);
  });

  // Pega a primeira regional para análise
  const primeiraRegional = regionais[0];
  console.log('='.repeat(70));
  console.log(`Analisando regional: ${primeiraRegional.nome}`);
  console.log('='.repeat(70));

  // Busca períodos disponíveis
  db.all(
    'SELECT DISTINCT periodo FROM vendas_mensais ORDER BY periodo',
    (err, periodos) => {
      console.log('\nPeríodos com dados de vendas:');
      if (periodos && periodos.length > 0) {
        periodos.forEach(p => console.log(`  - ${p.periodo}`));
      }

      // Busca regras de comissão
      db.all(
        'SELECT * FROM regras_comissao WHERE regionalId = ?',
        [primeiraRegional.id],
        (err, regras) => {
          console.log('\nRegras de comissão para esta regional:');
          if (regras && regras.length > 0) {
            regras.forEach((r, i) => {
              console.log(`  ${i + 1}. Tipo: ${r.tipoMeta} | Meta1: ${r.meta1Volume} | Meta2: ${r.meta2Volume} | Meta3: ${r.meta3Volume}`);
            });
          } else {
            console.log('  Nenhuma regra encontrada');
          }

          // Busca dados de comissionamento_resumos
          db.all(
            'SELECT * FROM comissionamento_resumos LIMIT 5',
            (err, resumos) => {
              console.log('\nExemplos de dados em comissionamento_resumos:');
              if (resumos && resumos.length > 0) {
                resumos.forEach((r, i) => {
                  console.log(`  ${i + 1}. Regional: ${r.regionalId?.substring(0, 8)}... | Período: ${r.periodo} | PercVendas: ${r.percentualVendas} | PercChurn: ${r.percentualChurn}`);
                });
              } else {
                console.log('  Nenhum resumo encontrado (tabela pode estar vazia)');
              }

              db.close();
            }
          );
        }
      );
    }
  );
});
