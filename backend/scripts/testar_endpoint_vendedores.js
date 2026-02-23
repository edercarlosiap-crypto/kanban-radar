const axios = require('axios');

async function testarEndpoint() {
  try {
    console.log('🧪 TESTE DO ENDPOINT DE VENDEDORES\n');

    // Obter token (você precisa ajustar email/senha se necessário)
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@teste.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('   ✅ Login realizado\n');

    // Buscar regionais disponíveis
    console.log('2️⃣ Buscando regionais...');
    const regionaisResponse = await axios.get('http://localhost:3002/api/regionais', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const regionais = regionaisResponse.data.regionais;
    console.log(`   ✅ ${regionais.length} regionais encontradas`);
    const primeiraRegional = regionais[0];
    console.log(`   📍 Testando com: ${primeiraRegional.nome} (${primeiraRegional.id})\n`);

    // Testar endpoint de vendedores
    console.log('3️⃣ Chamando /api/comissionamento/vendedores...');
    const periodo = 'Dez/25'; // Ajustar se necessário
    
    console.log(`   Parâmetros: periodo="${periodo}", regionalId="${primeiraRegional.id}"`);
    
    const vendedoresResponse = await axios.get('http://localhost:3002/api/comissionamento/vendedores', {
      params: { periodo, regionalId: primeiraRegional.id },
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n✅ RESPOSTA DA API:');
    console.log(JSON.stringify(vendedoresResponse.data, null, 2));

    if (vendedoresResponse.data.vendedores) {
      console.log(`\n📊 Total de vendedores retornados: ${vendedoresResponse.data.vendedores.length}`);
      if (vendedoresResponse.data.vendedores.length > 0) {
        console.log('\n👥 Primeiros 3 vendedores:');
        vendedoresResponse.data.vendedores.slice(0, 3).forEach((v, i) => {
          console.log(`   ${i + 1}. ${v.nome}`);
          console.log(`      Vendas: ${v.vendas.quantidade} | R$ ${v.vendas.valorTotal} | ${(v.vendas.percentualAlcancado * 100).toFixed(2)}%`);
        });
      }
    }

  } catch (erro) {
    console.error('\n❌ ERRO:');
    if (erro.response) {
      console.error('   Status:', erro.response.status);
      console.error('   Dados:', erro.response.data);
    } else {
      console.error('   Mensagem:', erro.message);
    }
  }
}

testarEndpoint();
