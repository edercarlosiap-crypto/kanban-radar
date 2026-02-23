const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// 1. Buscar novamente a configuração de renovação
db.get("SELECT * FROM regras_comissao WHERE tipoMeta = 'RENOVAÇÃO' AND periodo = 'Dez/25'", [], (err, metaRenovacao) => {
  if (err) {
    console.error('Erro:', err);
    db.close();
    return;
  }
  
  console.log('=== REGRA DE RENOVAÇÃO ===');
  console.log(JSON.stringify(metaRenovacao, null, 2));
  
  // 2. Buscar volume total de renovação da regional
  db.get(
    "SELECT SUM(renovacao_volume) as total, SUM(renovacao_financeiro) as financeiro FROM vendas_mensais WHERE regional_id = ? AND periodo = ?",
    [metaRenovacao.regionalId, metaRenovacao.periodo],
    (err2, volumes) => {
      if (err2) {
        console.error('Erro:', err2);
        db.close();
        return;
      }
      
      console.log('\n=== VOLUMES TOTAIS DA REGIONAL ===');
      console.log(`Volume: ${volumes.total} unidades`);
      console.log(`Financeiro: R$ ${volumes.financeiro}`);
      
      // 3. Calcular o percentual conforme a lógica
      let percentual = 0;
      if (volumes.total <= metaRenovacao.meta1Volume) {
        percentual = metaRenovacao.meta1Percent / 100;
      } else if (volumes.total <= metaRenovacao.meta2Volume) {
        percentual = metaRenovacao.meta2Percent / 100;
      } else if (volumes.total <= metaRenovacao.meta3Volume) {
        percentual = metaRenovacao.meta3Percent / 100;
      } else {
        percentual = metaRenovacao.meta3Percent / 100;
      }
      
      console.log('\n=== CÁLCULO ===');
      console.log(`Volume: ${volumes.total} unidades`);
      if (volumes.total <= 36) {
        console.log(`Como ${volumes.total} <= 36 (Meta3), percentual = 1%`);
      }
      
      const comissao = volumes.financeiro * percentual;
      console.log(`\nComissão = R$ ${volumes.financeiro} × ${(percentual * 100).toFixed(2)}% = R$ ${comissao.toFixed(2)}`);
      
      db.close();
    }
  );
});
