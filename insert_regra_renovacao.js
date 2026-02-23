const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Buscar regional ALTA FLORESTA DOESTE
db.all("SELECT id, nome FROM regionais WHERE LOWER(nome) LIKE '%ALTA%FLORESTA%'", [], (err, regionais) => {
  if (err) {
    console.error('Erro:', err);
    db.close();
    return;
  }
  
  console.log('=== REGIONAIS ENCONTRADAS ===');
  if (regionais && regionais.length > 0) {
    regionais.forEach(r => {
      console.log(`ID: ${r.id}`);
      console.log(`Nome: ${r.nome}\n`);
    });
  } else {
    console.log('Nenhuma regional encontrada');
    db.close();
    return;
  }
  
  // Agora vamos inserir a regra de RENOVAÇÃO
  const regionalId = regionais[0].id;
  const regra = {
    id: require('crypto').randomUUID(),
    regionalId: regionalId,
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
  
  console.log('\n=== INSERINDO REGRA DE RENOVAÇÃO ===');
  console.log(`Regional: ${regionalId}`);
  console.log(`Tipo: ${regra.tipoMeta}`);
  console.log(`Período: ${regra.periodo}`);
  console.log(`Meta1: ${regra.meta1Volume} unidades = ${regra.meta1Percent}%`);
  console.log(`Meta2: ${regra.meta2Volume} unidades = ${regra.meta2Percent}%`);
  console.log(`Meta3: ${regra.meta3Volume} unidades = ${regra.meta3Percent}%`);
  
  db.run(
    `INSERT INTO regras_comissao (id, regionalId, tipoMeta, periodo, meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn, dataCriacao, dataAtualizacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [regra.id, regra.regionalId, regra.tipoMeta, regra.periodo, regra.meta1Volume, regra.meta1Percent, regra.meta2Volume, regra.meta2Percent, regra.meta3Volume, regra.meta3Percent, regra.incrementoGlobal, regra.pesoVendasChurn],
    function(err) {
      if (err) {
        console.error('\nErro ao inserir:', err.message);
      } else {
        console.log('\n✅ Regra inserida com sucesso!');
      }
      db.close();
    }
  );
});
