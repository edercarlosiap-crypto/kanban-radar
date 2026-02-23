const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');
const crypto = require('crypto');

// Regras de VENDAS (padrão baseadas nas existentes)
const regrasVendas = {
  meta1Volume: 150,
  meta1Percent: 8,
  meta1PercentIndividual: 1,
  meta2Volume: 120,
  meta2Percent: 5,
  meta2PercentIndividual: 0.5,
  meta3Volume: 100,
  meta3Percent: 3,
  meta3PercentIndividual: 0.3,
  incrementoGlobal: 0.05, // 5%
  pesoVendasChurn: 0.6 // 60% vendas, 40% churn
};

// 1. Buscar todas as regionais
db.all("SELECT id, nome FROM regionais ORDER BY nome", [], async (err, regionais) => {
  if (err) {
    console.error('Erro ao buscar regionais:', err);
    db.close();
    return;
  }
  
  console.log(`=== CRIANDO REGRAS DE VENDAS PARA ${regionais.length} REGIONAIS ===\n`);
  
  let totalInserted = 0;
  let totalAlreadyExists = 0;
  let totalErrors = 0;
  
  const periodo = 'Dez/25';
  const tipoMeta = 'Vendas';
  
  // Para cada regional
  for (const regional of regionais) {
    const id = crypto.randomUUID();
    
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO regras_comissao (id, regionalId, tipoMeta, periodo, meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn, dataCriacao, dataAtualizacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [id, regional.id, tipoMeta, periodo, regrasVendas.meta1Volume, regrasVendas.meta1Percent, regrasVendas.meta2Volume, regrasVendas.meta2Percent, regrasVendas.meta3Volume, regrasVendas.meta3Percent, regrasVendas.incrementoGlobal, regrasVendas.pesoVendasChurn],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE') || err.code === 'SQLITE_CONSTRAINT') {
              console.log(`⚠️  ${regional.nome}: Já existe`);
              totalAlreadyExists++;
            } else {
              console.error(`❌ ${regional.nome}: ${err.message}`);
              totalErrors++;
            }
          } else {
            console.log(`✅ ${regional.nome}`);
            totalInserted++;
          }
          resolve();
        }
      );
    });
  }
  
  setTimeout(() => {
    console.log('\n=== RESUMO ===');
    console.log(`Regionais: ${regionais.length}`);
    console.log(`Criadas: ${totalInserted}`);
    console.log(`Já existiam: ${totalAlreadyExists}`);
    console.log(`Erros: ${totalErrors}`);
    db.close();
  }, 500);
});
