const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db");
const regionalId = "bd402487-06a3-40c3-b206-2fc7bf5d9db4";
const periodo = "Dez/25";

const qRegras = "SELECT id, regionalId, periodo, tipoMeta, meta1Volume, meta2Volume, meta3Volume, meta1PercentIndividual, meta2PercentIndividual, meta3PercentIndividual, incrementoGlobal FROM regras_comissao WHERE regionalId=? AND periodo=? AND LOWER(tipoMeta)='vendas'";
const qVendedores = "SELECT COUNT(*) as total FROM colaboradores WHERE regional_id=? AND status='ativo'";
const qVendas = "SELECT c.nome, vm.vendas_volume, vm.vendas_financeiro FROM vendas_mensais vm JOIN colaboradores c ON c.id=vm.vendedor_id WHERE vm.regional_id=? AND vm.periodo=? AND c.nome LIKE 'Gabriella%'";

db.all(qRegras, [regionalId, periodo], (err, regras) => {
  if (err) {
    console.error(err.message);
    db.close();
    return;
  }
  db.get(qVendedores, [regionalId], (err2, tot) => {
    if (err2) {
      console.error(err2.message);
      db.close();
      return;
    }
    db.all(qVendas, [regionalId, periodo], (err3, vendas) => {
      if (err3) {
        console.error(err3.message);
        db.close();
        return;
      }
      console.log(JSON.stringify({ regras, totalVendedores: tot?.total || 0, vendas }, null, 2));
      db.close();
    });
  });
});
