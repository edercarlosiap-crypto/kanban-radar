const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Buscar renovações agrupadas por vendedor
db.all("SELECT vendedor_id, SUM(renovacao_volume) as total_renovacoes, SUM(renovacao_financeiro) as valor_total FROM vendas_mensais GROUP BY vendedor_id", [], (err, dados) => {
  if (err) {
    console.error('Erro:', err);
    db.close();
    return;
  }
  
  console.log('=== RENOVAÇÕES POR VENDEDOR ===');
  if (dados && dados.length > 0) {
    dados.forEach(d => {
      console.log('Vendedor:', d.vendedor_id, '| Volume:', d.total_renovacoes, '| Valor:', d.valor_total);
    });
    
    // Buscar dados de renovação com volume = 36
    db.all("SELECT vendedor_id, SUM(renovacao_volume) as total_renovacoes, SUM(renovacao_financeiro) as valor_total FROM vendas_mensais WHERE renovacao_volume > 0 GROUP BY vendedor_id HAVING total_renovacoes = 36", [], (err2, vendedor36) => {
      if (err2) {
        console.error('Erro:', err2);
        db.close();
        return;
      }
      
      if (vendedor36 && vendedor36.length > 0) {
        console.log('\n=== VENDEDOR COM 36 RENOVAÇÕES ===');
        console.table(vendedor36);
        
        // Buscar nome do vendedor
        const vId = vendedor36[0].vendedor_id;
        db.get("SELECT nome FROM usuarios WHERE id = ?", [vId], (err3, usuario) => {
          if (err3) {
            console.error('Erro:', err3);
          } else if (usuario) {
            console.log('\nNome do vendedor:', usuario.nome);
          }
          db.close();
        });
      } else {
        console.log('\nNenhum vendedor com exatamente 36 renovações encontrado');
        db.close();
      }
    });
  } else {
    console.log('Nenhuma renovação encontrada');
    db.close();
  }
});
