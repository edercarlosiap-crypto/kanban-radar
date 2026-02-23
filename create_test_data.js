const sqlite3 = require('sqlite3').verbose();

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const db = new sqlite3.Database('./database.db');

console.log('📝 Criando colaboradoresse e vendas...\n');

// Obter primeiro regional
db.get('SELECT id FROM regionais LIMIT 1', (err, regional) => {
  if (err || !regional) {
    console.error('❌ Nenhuma regional encontrada');
    db.close();
    return;
  }

  const regionalId = regional.id;
  console.log('Regional ID: ' + regionalId);

  // Criar 3 colaboradores
  const nomes = ['Vendedor A', 'Vendedor B', 'Vendedor C'];
  let collabsCreated = 0;

  nomes.forEach((nome, idx) => {
    const collabId = generateUUID();

    db.run(`
      INSERT OR IGNORE INTO colaboradores (id, nome, cpf, regional_id, status)
      VALUES (?, ?, ?, ?, 'ativo')
    `, [collabId, nome, '000.000.000-' + (idx + 1).toString().padStart(2, '0'), regionalId],
    (err) => {
      if (err) console.error('Erro:', err);
      else {
        console.log('  ✅ Colaborador criado: ' + nome);
        collabsCreated++;

        // Agora inserir vendas para este colaborador
        if (collabsCreated === nomes.length) {
          insertVendas(regionalId);
        }
      }
    });
  });

  function insertVendas(regionalId) {
    console.log('\n📊 Inserindo vendas para Jan/25...\n');

    db.all(
      'SELECT id, nome FROM colaboradores WHERE regional_id = ? LIMIT 3',
      [regionalId],
      (err, colaboradores) => {
        if (err || !colaboradores) {
          console.error('❌ Erro ao buscar colaboradores');
          db.close();
          return;
        }

        const periodo = 'Jan/25';
        let vendidCount = 0;

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
            1000 + idx * 100,      // mudanca_ financeiro
            15 + idx,              // migracao_volume
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
              console.error('Erro:', err);
            } else {
              console.log('  ✅ ' + collab.nome + ': R$ ' + (5000 + idx * 500).toFixed(2));
              vendidCount++;
            }

            if (vendidCount === colaboradores.length) {
              console.log('\n✅ Dados de teste inseridos com sucesso!');
              db.close();
            }
          });
        });
      }
    );
  }
});
