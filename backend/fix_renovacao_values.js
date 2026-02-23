const { db_run, db_all } = require('./src/config/database');

async function atualizarRegrasRenovacao() {
  console.log('🔧 Atualizando regras de RENOVAÇÃO com valores corretos...\n');
  
  // Aguardar inicialização
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Buscar todas as regras de renovação
    const regras = await db_all(`
      SELECT id, regionalId, periodo, tipoMeta, meta1Volume, meta2Volume, meta3Volume, 
             meta1Percent, meta2Percent, meta3Percent
      FROM regras_comissao
      WHERE LOWER(tipoMeta) = 'renovação'
    `);
    
    console.log(`📊 Encontradas ${regras.length} regras de renovação\n`);
    
    // Valores corretos conforme especificação do usuário
    const valoresCorretos = {
      meta1Volume: 56,
      meta1Percent: 0.05,  // 5%
      meta2Volume: 45,
      meta2Percent: 0.03,  // 3%
      meta3Volume: 36,
      meta3Percent: 0.01   // 1%
    };
    
    for (const regra of regras) {
      console.log(`🔄 Atualizando: ${regra.tipoMeta} | ${regra.periodo}`);
      console.log(`   Before: M1=${regra.meta1Volume}, M2=${regra.meta2Volume}, M3=${regra.meta3Volume}`);
      console.log(`   Percentuais Before: M1=${regra.meta1Percent}, M2=${regra.meta2Percent}, M3=${regra.meta3Percent}`);
      
      await db_run(`
        UPDATE regras_comissao
        SET meta1Volume = ?,
            meta1Percent = ?,
            meta1PercentIndividual = ?,
            meta2Volume = ?,
            meta2Percent = ?,
            meta2PercentIndividual = ?,
            meta3Volume = ?,
            meta3Percent = ?,
            meta3PercentIndividual = ?
        WHERE id = ?
      `, [
        valoresCorretos.meta1Volume,
        valoresCorretos.meta1Percent,
        valoresCorretos.meta1Percent,  // Individual = Coletivo para renovação
        valoresCorretos.meta2Volume,
        valoresCorretos.meta2Percent,
        valoresCorretos.meta2Percent,
        valoresCorretos.meta3Volume,
        valoresCorretos.meta3Percent,
        valoresCorretos.meta3Percent,
        regra.id
      ]);
      
      console.log(`   After: M1=${valoresCorretos.meta1Volume}, M2=${valoresCorretos.meta2Volume}, M3=${valoresCorretos.meta3Volume}`);
      console.log(`   Percentuais After: M1=${valoresCorretos.meta1Percent}, M2=${valoresCorretos.meta2Percent}, M3=${valoresCorretos.meta3Percent}\n`);
    }
    
    console.log('✅ Atualização concluída!');
    
    // Verificar
    console.log('\n🔍 Verificando alterações...');
    const verificacao = await db_all(`
      SELECT id, regionalId, periodo, meta1Volume, meta2Volume, meta3Volume,
             meta1Percent, meta2Percent, meta3Percent
      FROM regras_comissao
      WHERE LOWER(tipoMeta) = 'renovação'
    `);
    
    console.log('\n📋 Estado final:');
    verificacao.forEach(r => {
      console.log(`  Período: ${r.periodo} | M1: ${r.meta1Volume} (${r.meta1Percent*100}%) | M2: ${r.meta2Volume} (${r.meta2Percent*100}%) | M3: ${r.meta3Volume} (${r.meta3Percent*100}%)`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

atualizarRegrasRenovacao();
