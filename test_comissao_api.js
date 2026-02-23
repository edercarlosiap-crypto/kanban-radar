const http = require('http');

const makeRequest = (method, path, body, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

(async () => {
  try {
    console.log('📝 Fazendo login...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      senha: 'senha123'
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Login falhou:', loginResponse.data);
      process.exit(1);
    }

    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');
    console.log('Token:', token.substring(0, 50) + '...\n');

    // Primeiro, buscar regional_id válido
    console.log('🔍 Buscando regional...');
    const regionaisResponse = await makeRequest('GET', '/api/regionais', null, token);
    if (regionaisResponse.status !== 200) {
      console.error('❌ Erro ao buscar regionais:', regionaisResponse.data);
      process.exit(1);
    }

    const regionais = regionaisResponse.data;
    if (!Array.isArray(regionais) || regionais.length === 0) {
      console.error('❌ Nenhuma regional encontrada');
      process.exit(1);
    }

    const regionalId = regionais[0].id;
    console.log('✅ Regional encontrada:', regionais[0].nome, '(ID:', regionalId + ')');
    console.log('');

    console.log('🔍 Testando endpoint de vendedores...');
    const vendedoresResponse = await makeRequest(
      'GET', 
      `/api/comissionamento/vendedores?periodo=Jan/25&regionalId=${regionalId}`,
      null,
      token
    );

    if (vendedoresResponse.status !== 200) {
      console.error('❌ Erro ao buscar vendedores:', vendedoresResponse.data);
      process.exit(1);
    }

    const resultado = vendedoresResponse.data;
    console.log('✅ Endpoint respondeu com sucesso\n');

    console.log('📊 Resultado:');
    console.log('- Período:', resultado.periodo);
    console.log('- Regional:', resultado.regionalId);
    console.log('- Soma percentuais ponderados:', resultado.somaPercentuaisPonderados);
    console.log('- Vendedores encontrados:', resultado.vendedores.length);
    
    if (resultado.vendedores.length > 0) {
      console.log('\n📋 Exemplo de primeiro vendedor:');
      const vendor = resultado.vendedores[0];
      console.log('  Nome:', vendor.nome);
      console.log('  Vendas:');
      console.log('    - Quantidade:', vendor.vendas.quantidade);
      console.log('    - Valor Total: R$', vendor.vendas.valorTotal);
      console.log('    - % Alcançado:', (vendor.vendas.percentualAlcancado * 100).toFixed(2) + '%');
      console.log('    - ✨ COMISSÃO: R$', vendor.vendas.comissao?.toFixed(2) || 'NÃO ENCONTRADO');
      
      if (vendor.vendas.comissao === undefined) {
        console.log('\n❌ AVISO: Campo "comissão" não foi retornado pelo backend!');
        console.log('Resposta completa:', JSON.stringify(resultado.vendedores[0], null, 2));
      } else {
        console.log('\n✅ Campo "comissão" foi calculado com sucesso!');
      }
    }

  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
})();
