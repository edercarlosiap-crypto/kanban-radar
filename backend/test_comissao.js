const http = require('http');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3VhcmlvSWQiOiIxNWEzMTQ3Yi0wYzMzLTQ1ZGE0YmY1MC02MDlhY2FkNjBkMDAiLCJpYXQiOjE3NzE1NDk1MDIsImV4cCI6MTc3MTYzNTkwMn0.abZVuYROy5IMeLcha8aK6SjDWSo6RkPVMHI_E8taT0w';

const makeRequest = (method, path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

(async () => {
  try {
    console.log('🔍 Buscando regional...');
    const regionaisResponse = await makeRequest('GET', '/api/regionais', TOKEN);
    
    if (regionaisResponse.status !== 200) {
      console.error('❌ Erro:', regionaisResponse.data);
      process.exit(1);
    }

    const regionais = regionaisResponse.data;
    if (!Array.isArray(regionais) || regionais.length === 0) {
      console.error('❌ Nenhuma regional encontrada');
      process.exit(1);
    }

    const regionalId = regionais[0].id;
    console.log('✅ Regional: ' + regionais[0].nome + ' (ID: ' + regionalId + ')\n');

    console.log('📡 Testando endpoint de vendedores...\n');
    const vendedoresResponse = await makeRequest(
      'GET',
      `/api/comissionamento/vendedores?periodo=Jan/25&regionalId=${regionalId}`,
      TOKEN
    );

    if (vendedoresResponse.status !== 200) {
      console.error('❌ Erro:', vendedoresResponse.data);
      process.exit(1);
    }

    const resultado = vendedoresResponse.data;
    console.log('✅ Resposta recebida com sucesso!\n');

    console.log('📊 Dados da resposta:');
    console.log('- Período: ' + resultado.periodo);
    console.log('- Regional: ' + resultado.regionalId);
    console.log('- Soma percentuais ponderados: ' + resultado.somaPercentuaisPonderados);
    console.log('- Total de vendedores: ' + resultado.vendedores.length);
    
    if (resultado.vendedores.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Exemplo de Primeiro Vendedor:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const vendor = resultado.vendedores[0];
      console.log('Nome: ' + vendor.nome);
      console.log('CPF: ' + vendor.cpf);
      
      console.log('\n📈 VENDAS:');
      console.log('  Quantidade: ' + vendor.vendas.quantidade);
      console.log('  Valor Total: R$ ' + vendor.vendas.valorTotal.toFixed(2));
      console.log('  % Alcançado: ' + (vendor.vendas.percentualAlcancado * 100).toFixed(2) + '%');
      
      if (vendor.vendas.comissao !== undefined) {
        console.log('  ✨ COMISSÃO: R$ ' + vendor.vendas.comissao.toFixed(2));
        console.log('\n✅ SUCESSO! Campo "comissão" foi calculado corretamente!');
      } else {
        console.log('  ❌ COMISSÃO: NÃO ENCONTRADA');
        console.log('\nAviso: Campo comissão não está sendo retornado');
      }
    }

  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
})();
