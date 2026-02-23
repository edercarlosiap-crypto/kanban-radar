const sqlite3 = require('sqlite3').verbose();

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const db = new sqlite3.Database('./database.db');

console.log('📝 Inserindo dados de teste...\n');

// Obter primeiro regional e colaborador
db.get('SELECT id FROM regionais LIMIT 1', (err, regional) => {
  if (err || !regional) {
    console.error('❌ Nenhuma regional encontrada');
    db.close();
    return;
  }

  const regionalId = regional.id;
  console.log('Regional: ' + regionalId);

  // Obter colaboradores da regional
  db.all(
    'SELECT id FROM colaboradores WHERE regional_id = ? LIMIT 3',
    [regionalId],
    (err, colaboradores) => {
      if (err || !colaboradores || colaboradores.length === 0) {
        console.error('❌ Nenhum colaborador encontrado para esta regional');
        db.close();
        return;
      }

      console.log('Colaboradores encontrados: ' + colaboradores.length);

      const periodo = 'Jan/25';
      let count = 0;

      // Inserir vendas para cada colaborador
      colaboradores.forEach((collab, idx) => {
        const vendidId = generateUUID();

        db.run(`
          INSERT OR REPLACE INTO vendas_mensais (
            id, periodo, vendedor_id, regional_id,
            vendas_volume, vendas_financeiro,
            mudanca_titularidade_volume, mudanca_titularidade_financeiro,
            migracao_tecnologia_volume, migracao_tecnologia_financeiro,
            renovacao_volume, renovacao_financeiro,
            plano_evento_volume, plano_evento_financeiro,
            sva_volume, sva_financeiro,
            telefonia_volume, telefonia_financeiro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          vendidId, periodo, collab.id, regionalId,
          100 + idx * 10,        // vendas_volume
          5000 + idx * 500,      // vendas_financeiro
          20 + idx * 2,          // mudanca_volume
          1000 + idx * 100,      // mudanca_financeiro
          15 + idx * 1,          // migracao_volume
          800 + idx * 80,        // migracao_financeiro
          30 + idx * 3,          // renovacao_volume
          1500 + idx * 150,      // renovacao_financeiro
          10 + idx,              // plano_evento_volume
          500 + idx * 50,        // plano_evento_financeiro
          25 + idx * 2,          // sva_volume
          1200 + idx * 120,      // sva_financeiro
          5 + idx,               // telefonia_volume
          250 + idx * 25         // telefonia_financeiro
        ], (err) => {
          if (err) {
            console.error('❌ Erro ao inserir vendas:', err);
          } else {
            console.log('  ✅ Vendedor ' + (idx + 1) + ': R$ ' + (5000 + idx * 500).toFixed(2));
            count++;
          }

          if (count === colaboradores.length) {
            console.log('\n✅ Dados inseridos com sucesso!');
            db.close();
          }
        });
      });
    }
  );
});
