const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');
const crypto = require('crypto');

// Regras padrão para todos os tipos
const regraspadrao = {
  'MUDANÇA DE TITULARIDADE': {
    meta1Volume: 56,
    meta1Percent: 5,
    meta2Volume: 45,
    meta2Percent: 3,
    meta3Volume: 36,
    meta3Percent: 1
  },
  'MIGRAÇÃO DE TECNOLOGIA': {
    meta1Volume: 56,
    meta1Percent: 5,
    meta2Volume: 45,
    meta2Percent: 3,
    meta3Volume: 36,
    meta3Percent: 1
  },
  'PLANO EVENTO': {
    meta1Volume: 56,
    meta1Percent: 5,
    meta2Volume: 45,
    meta2Percent: 3,
    meta3Volume: 36,
    meta3Percent: 1
  },
  'SVA': {
    meta1Volume: 56,
    meta1Percent: 5,
    meta2Volume: 45,
    meta2Percent: 3,
    meta3Volume: 36,
    meta3Percent: 1
  },
  'TELEFONIA': {
    meta1Volume: 56,
    meta1Percent: 5,
    meta2Volume: 45,
    meta2Percent: 3,
    meta3Volume: 36,
    meta3Percent: 1
  }
};

// 1. Buscar todas as regionais
db.all("SELECT id, nome FROM regionais ORDER BY nome", [], async (err, regionais) => {
  if (err) {
    console.error('Erro ao buscar regionais:', err);
    db.close();
    return;
  }
  
  console.log(`=== CRIANDO REGRAS DE COMISSÃO PARA ${regionais.length} REGIONAIS ===\n`);
  
  let totalInserted = 0;
  let totalAlreadyExists = 0;
  let totalErrors = 0;
  
  const periodo = 'Dez/25';
  const incrementoGlobal = 0;
  const pesoVendasChurn = 0.5;
  
  // Para cada regional
  for (const regional of regionais) {
    // Para cada tipo de meta
    for (const [tipoMeta, regra] of Object.entries(regraspadrao)) {
      const id = crypto.randomUUID();
      
      await new Promise((resolve) => {
        db.run(
          `INSERT INTO regras_comissao (id, regionalId, tipoMeta, periodo, meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn, dataCriacao, dataAtualizacao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [id, regional.id, tipoMeta, periodo, regra.meta1Volume, regra.meta1Percent, regra.meta2Volume, regra.meta2Percent, regra.meta3Volume, regra.meta3Percent, incrementoGlobal, pesoVendasChurn],
          function(err) {
            if (err) {
              if (err.message.includes('UNIQUE') || err.code === 'SQLITE_CONSTRAINT') {
                //console.log(`⚠️  ${regional.nome} - ${tipoMeta}: Já existe`);
                totalAlreadyExists++;
              } else {
                console.error(`❌ ${regional.nome} - ${tipoMeta}: ${err.message}`);
                totalErrors++;
              }
            } else {
              console.log(`✅ ${regional.nome} - ${tipoMeta}`);
              totalInserted++;
            }
            resolve();
          }
        );
      });
    }
  }
  
  setTimeout(() => {
    console.log('\n=== RESUMO ===');
    console.log(`Regionais: ${regionais.length}`);
    console.log(`Tipos de meta: ${Object.keys(regraspadrao).length}`);
    console.log(`Total esperado: ${regionais.length * Object.keys(regraspadrao).length}`);
    console.log(`Criadas: ${totalInserted}`);
    console.log(`Já existiam: ${totalAlreadyExists}`);
    console.log(`Erros: ${totalErrors}`);
    db.close();
  }, 1000);
});
