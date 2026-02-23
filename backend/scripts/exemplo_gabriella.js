const { db_get } = require('../src/config/database');

async function run() {
  const vendedor = await db_get(
    "SELECT id, nome, regional_id FROM colaboradores WHERE nome = 'Gabriella Gobatto' LIMIT 1"
  );

  if (!vendedor) {
    console.log('NOT_FOUND');
    process.exit(0);
  }

  const vendas = await db_get(
    'SELECT periodo, vendas_volume, vendas_financeiro FROM vendas_mensais WHERE vendedor_id = ? ORDER BY periodo DESC LIMIT 1',
    [vendedor.id]
  );

  const regra = vendas
    ? await db_get(
        "SELECT meta1Volume, meta1PercentIndividual, meta2Volume, meta2PercentIndividual, meta3Volume, meta3PercentIndividual FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'vendas'",
        [vendedor.regional_id, vendas.periodo]
      )
    : null;

  console.log(JSON.stringify({ vendedor, vendas, regra }, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
