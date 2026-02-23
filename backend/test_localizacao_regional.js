const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

const normalizarNome = (nome) => {
  return String(nome || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

// Buscar colaboradores e regionais
db.all('SELECT id, nome FROM regionais ORDER BY nome', (err1, regionais) => {
  if (err1) {
    console.error(err1);
    process.exit(1);
  }

  db.all('SELECT id, nome, regional_id FROM colaboradores ORDER BY nome', (err2, colaboradores) => {
    if (err2) {
      console.error(err2);
      process.exit(1);
    }

    const localizarRegional = (valor) => {
      if (!valor) return null;
      const direto = regionais.find((r) => r.id === valor);
      if (direto) return direto.id;
      const valorNormalizado = normalizarNome(valor);
      const nome = regionais.find((r) => normalizarNome(r.nome) === valorNormalizado);
      return nome ? nome : null;
    };

    const localizarVendedor = (valor, regionalId = null) => {
      if (!valor) return null;
      const direto = colaboradores.find((c) => c.id === valor);
      if (direto) return direto;
      const valorNormalizado = normalizarNome(valor);
      
      // Se regionalId for fornecida, buscar vendedor que pertença àquela regional
      if (regionalId) {
        const nome = colaboradores.find((c) => 
          normalizarNome(c.nome) === valorNormalizado && c.regional_id === regionalId
        );
        return nome ? nome : null;
      }
      
      // Caso contrário, buscar apenas por nome (comportamento padrão)
      const nome = colaboradores.find((c) => normalizarNome(c.nome) === valorNormalizado);
      return nome ? nome : null;
    };

    console.log('=== TESTE DE LOCALIZAÇÃO COM REGIONAL ===\n');

    // Teste 1: Vendedor Padrão de JARU
    const jaruRegional = localizarRegional('JARU');
    const vendedorJaru = localizarVendedor('Vendedor Padrão', jaruRegional.id);
    console.log(`Regional: JARU (${jaruRegional.id})`);
    console.log(`Vendedor Padrão encontrado: ${vendedorJaru ? vendedorJaru.nome : 'NÃO ENCONTRADO'}`);
    console.log(`ID: ${vendedorJaru ? vendedorJaru.id : 'null'}`);
    console.log(`Regional do vendedor: ${vendedorJaru ? vendedorJaru.regional_id : 'null'}`);
    console.log(`✓ Match regional: ${vendedorJaru && vendedorJaru.regional_id === jaruRegional.id ? 'SIM' : 'NÃO'}\n`);

    // Teste 2: Vendedor Padrão de JI-PARANA
    const jiparanaRegional = localizarRegional('JI-PARANA');
    const vendedorJiparana = localizarVendedor('Vendedor Padrão', jiparanaRegional.id);
    console.log(`Regional: JI-PARANA (${jiparanaRegional.id})`);
    console.log(`Vendedor Padrão encontrado: ${vendedorJiparana ? vendedorJiparana.nome : 'NÃO ENCONTRADO'}`);
    console.log(`ID: ${vendedorJiparana ? vendedorJiparana.id : 'null'}`);
    console.log(`Regional do vendedor: ${vendedorJiparana ? vendedorJiparana.regional_id : 'null'}`);
    console.log(`✓ Match regional: ${vendedorJiparana && vendedorJiparana.regional_id === jiparanaRegional.id ? 'SIM' : 'NÃO'}\n`);

    // Teste 3: Vendedor Padrão de SÃO FRANCISCO
    const sfRegional = localizarRegional('SÃO FRANCISCO');
    const vendedorSF = localizarVendedor('Vendedor Padrão', sfRegional.id);
    console.log(`Regional: SÃO FRANCISCO (${sfRegional.id})`);
    console.log(`Vendedor Padrão encontrado: ${vendedorSF ? vendedorSF.nome : 'NÃO ENCONTRADO'}`);
    console.log(`ID: ${vendedorSF ? vendedorSF.id : 'null'}`);
    console.log(`Regional do vendedor: ${vendedorSF ? vendedorSF.regional_id : 'null'}`);
    console.log(`✓ Match regional: ${vendedorSF && vendedorSF.regional_id === sfRegional.id ? 'SIM' : 'NÃO'}\n`);

    // Teste 4: Confirmar que IDs são diferentes
    console.log('=== CONFIRMAÇÃO: IDs DIFERENTES ===');
    console.log(`Vendedor Padrão JARU: ${vendedorJaru ? vendedorJaru.id : 'null'}`);
    console.log(`Vendedor Padrão JI-PARANA: ${vendedorJiparana ? vendedorJiparana.id : 'null'}`);
    console.log(`Vendedor Padrão SÃO FRANCISCO: ${vendedorSF ? vendedorSF.id : 'null'}`);
    console.log(`✓ Todos diferentes: ${vendedorJaru && vendedorJiparana && vendedorSF && 
      vendedorJaru.id !== vendedorJiparana.id && 
      vendedorJaru.id !== vendedorSF.id && 
      vendedorJiparana.id !== vendedorSF.id ? 'SIM' : 'NÃO'}`);

    db.close();
  });
});
