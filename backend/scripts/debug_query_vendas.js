const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const db = new sqlite3.Database('./database.db');

const db_get = promisify(db.get.bind(db));

const regionalId = 'e78ea0b6-c672-4af9-bac9-87f576d0257d';
const periodo = 'Dez/25';

(async () => {
  try {
    console.log('🔍 Testando query do controller...\n');
    console.log('Params:', { regionalId, periodo });
    console.log('');
    
    // Testar query exata do controller
    const metaVendas = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'vendas'
      LIMIT 1
    `, [regionalId, periodo]);
    
    if (metaVendas) {
      console.log('✅ Meta de vendas ENCONTRADA!');
      console.log(JSON.stringify(metaVendas, null, 2));
    } else {
      console.log('❌ Meta de vendas NÃO encontrada');
      
      // Debug: buscar sem filtro de tipoMeta
      console.log('\n🔎 Buscando todas as regras desta regional e período...\n');
      const todasRegras = await new Promise((resolve, reject) => {
        db.all(`
          SELECT id, regionalId, tipoMeta, periodo
          FROM regras_comissao
          WHERE regionalId = ? AND periodo = ?
        `, [regionalId, periodo], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      console.log('Regras encontradas:', todasRegras.length);
      todasRegras.forEach(r => {
        console.log(`  - tipoMeta: "${r.tipoMeta}" (LOWER: "${r.tipoMeta.toLowerCase()}")`);
      });
    }
    
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    db.close();
  }
})();
