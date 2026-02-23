const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db");
const regionalId = "bd402487-06a3-40c3-b206-2fc7bf5d9db4";
const periodo = "Dez/25";

const qRegras = "SELECT meta1Volume, meta1Percent, meta1PercentIndividual, meta2Volume, meta2Percent, meta2PercentIndividual, meta3Volume, meta3Percent, meta3PercentIndividual, incrementoGlobal FROM regras_comissao WHERE regionalId=? AND periodo=? AND LOWER(tipoMeta)='vendas' LIMIT 1";
const qVendedores = "SELECT COUNT(*) as total FROM colaboradores WHERE regional_id=? AND status='ativo'";
const qVendas = "SELECT c.nome, vm.vendas_volume FROM vendas_mensais vm JOIN colaboradores c ON c.id=vm.vendedor_id WHERE vm.regional_id=? AND vm.periodo=? AND c.nome LIKE 'Gabriella%'";

const normalizarPercentual = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 0;
  return numero > 1 ? numero / 100 : numero;
};

db.all(qRegras, [regionalId, periodo], (err, regras) => {
  if (err) {
    console.error(err.message);
    db.close();
    return;
  }

  db.all(qVendedores, [regionalId], (err2, tot) => {
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

      const regra = regras[0] || null;
      const totalVendedores = tot[0]?.total || 0;
      const incrementoGlobal = normalizarPercentual(regra?.incrementoGlobal || 0);
      const metaIndividual1 = totalVendedores > 0 ? (regra.meta1Volume / totalVendedores) * (1 + incrementoGlobal) : 0;
      const metaIndividual2 = totalVendedores > 0 ? (regra.meta2Volume / totalVendedores) * (1 + incrementoGlobal) : 0;
      const metaIndividual3 = totalVendedores > 0 ? (regra.meta3Volume / totalVendedores) * (1 + incrementoGlobal) : 0;

      let percentualAlcancado = 0;
      if (vendas[0]) {
        const volume = Number(vendas[0].vendas_volume) || 0;
        const p1 = normalizarPercentual(regra?.meta1PercentIndividual);
        const p2 = normalizarPercentual(regra?.meta2PercentIndividual);
        const p3 = normalizarPercentual(regra?.meta3PercentIndividual);
        if (volume >= metaIndividual1) {
          percentualAlcancado = p1;
        } else if (volume >= metaIndividual2) {
          percentualAlcancado = p2;
        } else if (volume >= metaIndividual3) {
          percentualAlcancado = p3;
        }
      }

      console.log(JSON.stringify({
        regras: regra,
        totalVendedores,
        metaIndividual1,
        metaIndividual2,
        metaIndividual3,
        vendas,
        percentualAlcancado
      }, null, 2));

      db.close();
    });
  });
});
