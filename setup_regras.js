const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const regionalComDados = '090c6426-8d34-429d-a42e-fbba953dca21';

const regras = [
  {
    tipoMeta: 'Vendas',
    meta1Volume: 100,
    meta1Percent: 10,
    meta2Volume: 75,
    meta2Percent: 7,
    meta3Volume: 50,
    meta3Percent: 5,
    pesoVendasChurn: 0.65,
    incrementoGlobal: 0
  },
  {
    tipoMeta: 'Churn',
    meta1Volume: 5,
    meta1Percent: 8,
    meta2Volume: 10,
    meta2Percent: 5,
    meta3Volume: 15,
    meta3Percent: 2,
    pesoVendasChurn: 0.35,
    incrementoGlobal: 0
  }
];

console.log('Inserindo regras de comissão para Minas Gerais...\n');

let inseridas = 0;
regras.forEach(regra => {
  db.run(
    `INSERT OR REPLACE INTO regras_comissao (
      regionalId, tipoMeta, meta1Volume, meta1Percent, 
      meta2Volume, meta2Percent, meta3Volume, meta3Percent,
      pesoVendasChurn, incrementoGlobal
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      regionalComDados,
      regra.tipoMeta,
      regra.meta1Volume,
      regra.meta1Percent,
      regra.meta2Volume,
      regra.meta2Percent,
      regra.meta3Volume,
      regra.meta3Percent,
      regra.pesoVendasChurn,
      regra.incrementoGlobal
    ],
    function(err) {
      if (err) {
        console.error(`❌ Erro ao inserir ${regra.tipoMeta}:`, err);
      } else {
        inseridas++;
        console.log(`✅ Regra de ${regra.tipoMeta} inserida`);
      }

      if (inseridas === regras.length) {
        console.log('\n✅ Todas as regras foram inseridas!\n');
        db.close();
      }
    }
  );
});
