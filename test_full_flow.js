const http = require('http');

const makeRequest = (method, path, body = null, token = null) => {
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
    console.log('🔐 Fazendo login...\n');
    
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      senha: '123456'
    });

    if (loginRes.status !== 200) {
      console.error('❌ Erro ao fazer login:', loginRes.data);
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('✅ Login realizado com sucesso!');
    console.log('Token: ' + token.substring(0, 50) + '...\n');

    // Buscar uma regional válida
    console.log('🔍 Buscando regionais...\n');
    const regionaisRes = await makeRequest('GET', '/api/regionais', null, token);
    
    if (regionaisRes.status !== 200) {
      console.error('❌ Erro ao buscar regionais:', regionaisRes.data);
      process.exit(1);
    }

    console.log('Response data type:', typeof regionaisRes.data);
    console.log('Response data:', JSON.stringify(regionaisRes.data, null, 2));

    const regionais = Array.isArray(regionaisRes.data) ? regionaisRes.data : regionaisRes.data.regionais;
    if (!Array.isArray(regionais) || regionais.length === 0) {
      console.error('❌ Nenhuma regional encontrada');
      process.exit(1);
    }

    const regionalId = regionais[0].id;
    const regionalNome = regionais[0].nome;
    console.log('✅ Regional encontrada: ' + regionalNome + '\n');

    console.log('📡 Testando GET /api/comissionamento/vendedores\n');
    console.log('Parâmetros:');
    console.log('  - periodo: Jan/25');
    console.log('  - regionalId: ' + regionalId + '\n');

    const vendedoresRes = await makeRequest(
      'GET',
      `/api/comissionamento/vendedores?periodo=Jan/25&regionalId=${encodeURIComponent(regionalId)}`,
      null,
      token
    );

    console.log('Status HTTP: ' + vendedoresRes.status + '\n');

    if (vendedoresRes.status !== 200) {
      console.error('❌ Erro ao buscar vendedores:');
      console.error(JSON.stringify(vendedoresRes.data, null, 2));
      process.exit(1);
    }

    const resultado = vendedoresRes.data;

    console.log('✅ Resposta recebida com sucesso!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Dados Retornados:');
    console.log('  Período: ' + resultado.periodo);
    console.log('  Regional: ' + resultado.regionalId);
    console.log('  Soma percentuais ponderados: ' + resultado.somaPercentuaisPonderados);
    console.log('  Total de vendedores: ' + resultado.vendedores.length);

    if (resultado.vendedores.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 Primeiro Vendedor:\n');
      
      const vendor = resultado.vendedores[0];
      console.log('  Nome: ' + vendor.nome);
      console.log('  CPF: ' + (vendor.cpf || 'N/A'));
      
      console.log('\n  📈 VENDAS:');
      console.log('    • Quantidade: ' + vendor.vendas.quantidade);
      console.log('    • Valor Total: R$ ' + vendor.vendas.valorTotal.toFixed(2));
      console.log('    • % Alcançado: ' + (vendor.vendas.percentualAlcancado * 100).toFixed(2) + '%');
      
      if (vendor.vendas.comissao !== undefined) {
        console.log('    💰 COMISSÃO: R$ ' + vendor.vendas.comissao.toFixed(2));
      } else {
        console.log('    ❌ COMISSÃO: NÃO ENCONTRADA');
      }
    } else {
      console.log('\n⚠️ Nenhum vendedor encontrado para essa regional/período');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const temComissao = resultado.vendedores.some(v => v.vendas.comissao !== undefined);
    
    if (temComissao) {
      console.log('✅✅✅ SUCESSO! ✅✅✅\n');
      console.log('A coluna "comissão" foi adicionada com sucesso!');
      console.log('\nFórmula implementada:');
      console.log('  comissão = (vendas_financeiro × percentualAlcançado)');
      console.log('           + (vendas_financeiro × somaPercentuaisPonderados)');
    } else {
      console.log('⚠️ Nenhum vendedor com comissão foi encontrado');
    }

  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
})();
