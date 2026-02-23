const http = require('http');
const fs = require('fs');

// Ler token do arquivo
const TOKEN = fs.readFileSync('./TOKEN.txt', 'utf8').trim();

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
    const regionalId = '090c6426-8d34-429d-a42e-fbba953dca21';
    const periodo = 'Jan/25';

    console.log('📡 Testando endpoint /api/comissionamento/vendedores\n');
    console.log('Query: periodo=' + periodo);
    console.log('       regionalId=' + regionalId);
    console.log('');

    const response = await makeRequest(
      'GET',
      `/api/comissionamento/vendedores?periodo=${encodeURIComponent(periodo)}&regionalId=${regionalId}`,
      TOKEN
    );

    console.log('Status HTTP:', response.status);
    console.log('');

    if (response.status !== 200) {
      console.error('❌ Erro:', response.data);
      process.exit(1);
    }

    const resultado = response.data;

    if (!resultado.vendedores || resultado.vendedores.length === 0) {
      console.error('❌ Nenhum vendedor retornado');
      console.log('Resposta completa:', response.data);
      process.exit(1);
    }

    console.log('✅ Resposta recebida com sucesso!\n');

    console.log('📊 Resumo da Resposta:');
    console.log('  Período: ' + resultado.periodo);
    console.log('  Regional: ' + resultado.regionalId);
    console.log('  Soma percentuais ponderados: ' + resultado.somaPercentuaisPonderados);
    console.log('  Total de vendedores: ' + resultado.vendedores.length);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    resultado.vendedores.forEach((vendor, idx) => {
      console.log('👤 Vendedor ' + (idx + 1) + ': ' + vendor.nome);
      console.log('  CPF: ' + vendor.cpf);
      
      console.log('\n  📈 VENDAS:');
      console.log('    • Quantidade: ' + vendor.vendas.quantidade);
      console.log('    • Valor Total: R$ ' + vendor.vendas.valorTotal.toFixed(2));
      console.log('    • % Alcançado: ' + (vendor.vendas.percentualAlcancado * 100).toFixed(2) + '%');
      
      if (vendor.vendas.comissao !== undefined) {
        console.log('    💰 COMISSÃO: R$ ' + vendor.vendas.comissao.toFixed(2));
      } else {
        console.log('    ❌ COMISSÃO: INDEFINIDA');
      }
      
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar sucesso
    const temComissao = resultado.vendedores.some(v => v.vendas.comissao !== undefined);
    
    if (temComissao) {
      console.log('✅✅✅ SUCESSO! ✅✅✅');
      console.log('');
      console.log('A coluna "comissão" foi adicionada com sucesso!');
      console.log('');
      console.log('Fórmula implementada:');
      console.log('  comissão = (vendas_financeiro × percentualAlcançado)');
      console.log('           + (vendas_financeiro × somaPercentuaisPonderados)');
    } else {
      console.log('❌ Campo comissão ainda não está sendo retornado');
    }

  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
})();
