const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');
const crypto = require('crypto');

// 1. Buscar todas as regionais
db.all("SELECT id, nome FROM regionais ORDER BY nome", [], (err, regionais) => {
  if (err) {
    console.error('Erro ao buscar regionais:', err);
    db.close();
    return;
  }
  
  console.log(`=== CRIANDO REGRAS DE RENOVAÇÃO PARA ${regionais.length} REGIONAIS ===\n`);
  
  const regrasRenovacao = {
    tipoMeta: 'RENOVAÇÃO',
    periodo: 'Dez/25',
    meta1Volume: 56,
    meta1Percent: 5,
   meta2Volume: 45,
    meta2Percent: 3,
    meta3Volume: 36,
    meta3Percent: 1,
    incrementoGlobal: 0,
    pesoVendasChurn: 0.5
  };
  
  // 2. Inserir regra para cada regional
  let inserted = 0;
  let errors = 0;
  
  regionais.forEach((regional, index) => {
    const id = crypto.randomUUID();
    
    db.run(
      `INSERT INTO regras_comissao (id, regionalId, tipoMeta, periodo, meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn, dataCriacao, dataAtualizacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, regional.id, regrasRenovacao.tipoMeta, regrasRenovacao.periodo, regrasRenovacao.meta1Volume, regrasRenovacao.meta1Percent, regrasRenovacao.meta2Volume, regrasRenovacao.meta2Percent, regrasRenovacao.meta3Volume, regrasRenovacao.meta3Percent, regrasRenovacao.incrementoGlobal, regrasRenovacao.pesoVendasChurn],
      function(err) {
        if (err) {
          // Verificar se já existe
          if (err.message.includes('UNIQUE') || err.code === 'SQLITE_CONSTRAINT') {
            console.log(`⚠️  ${regional.nome}: Regra já existe`);
          } else {
            console.error(`❌ ${regional.nome}: Erro - ${err.message}`);
            errors++;
          }
        } else {
          console.log(`✅ ${regional.nome}: Regra criada`);
          inserted++;
        }
        
        // Quando terminar todas
        if (index === regionais.length - 1) {
          setTimeout(() => {
            console.log(`\n=== RESUMO ===`);
            console.log(`Total de regionais: ${regionais.length}`);
            console.log(`Regras criadas: ${inserted}`);
            console.log(`Erros: ${errors}`);
            db.close();
          }, 500);
        }
      }
    );
  });
});
