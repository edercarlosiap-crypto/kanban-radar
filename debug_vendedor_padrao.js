const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Buscar dados do vendedor Padrão
db.all("SELECT DISTINCT u.id, u.nome, u.email FROM usuarios u WHERE LOWER(u.nome) LIKE '%padr%'", [], (err, usuarios) => {
  if (err) {
    console.error('Erro ao buscar vendedor:', err.message);
    db.close();
    return;
  }

  console.log('=== VENDEDORES ENCONTRADOS ===');
  console.table(usuarios);
  
  if (usuarios && usuarios.length > 0) {
    const vendedorId = usuarios[0].id;
    console.log('\nBuscando renovações do vendedor:', usuarios[0].nome);
    
    // Buscar renovações
    db.all("SELECT COUNT(*) as total, SUM(valor) as valor_total FROM vendas_mensais WHERE usuario_id = ? AND LOWER(tipo_produto) = 'renovação'", [vendedorId], (err2, renovacoes) => {
      if (err2) {
        console.error('Erro:', err2.message);
        db.close();
        return;
      }
      console.log('\n=== RENOVAÇÕES DO VENDEDOR ===');
      console.table(renovacoes);
      
      // Detalhes de cada renovação
      db.all("SELECT id, periodo, valor, tipo_produto FROM vendas_mensais WHERE usuario_id = ? AND LOWER(tipo_produto) = 'renovação' ORDER BY periodo DESC", [vendedorId], (err3, detalhes) => {
        if (err3) {
          console.error('Erro:', err3.message);
        } else {
          console.log('\n=== DETALHES DAS RENOVAÇÕES ===');
          console.table(detalhes);
        }
        db.close();
      });
    });
  } else {
    db.close();
  }
});
