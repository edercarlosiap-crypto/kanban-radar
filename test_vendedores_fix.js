const axios = require('axios');

// ID da regional Alta Floresta Doeste
const regionalId = 'c187019b-956d-486a-b547-b9ce7a997e98';
const periodo = 'Dez/25';

console.log('\n🧪 Testando endpoint /api/comissionamento/vendedores...\n');

axios.get(`http://localhost:3002/api/comissionamento/vendedores`, {
  params: {
    periodo,
    regionalId
  }
})
.then(response => {
  const data = response.data;
  
  console.log('✅ RESPOSTA RECEBIDA COM SUCESSO\n');
  console.log('🗺️  Regional:', data.regional);
  console.log('📅 Período:', data.periodo);
  console.log('👥 Total de vendedores:', data.totalVendedores);
  
  if (data.somaPercentuaisPonderados) {
    console.log('\n✅ SOMA DOS PERCENTUAIS PONDERADOS:');
    console.log(`   ${(data.somaPercentuaisPonderados * 100).toFixed(2)}%`);
  }
  
  console.log('\n💰 VENDEDORES:');
  if (data.vendedores && data.vendedores.length > 0) {
    data.vendedores.forEach((v, i) => {
      console.log(`\n   ${i + 1}. ${v.nome}`);
      console.log(`      Comissão: R$ ${v.vendas?.comissao?.toFixed(2) || 'N/A'}`);
    });
  }
  
  console.log('\n');
  process.exit(0);
})
.catch(err => {
  console.error('❌ ERRO:', err.response?.status, err.response?.data || err.message);
  process.exit(1);
});
