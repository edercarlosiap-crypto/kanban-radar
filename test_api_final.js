const http = require('http');

// Gerador simples de UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Gerar JWT manualmente
const SECRET = 'sua_chave_secreta_super_segura_123';
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
const payload = Buffer.from(JSON.stringify({
  usuarioId: '15a3147b-0c33-45da-bf50-609acad60d00',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400
})).toString('base64');

const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', SECRET)
  .update(header + '.' + payload)
  .digest('base64');

const TOKEN = header + '.' + payload + '.' + signature;

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
    console.log('Query: periodo=' + periodo + '&regionalId=' + regionalId);
    console.log('');

    const response = await makeRequest(
      'GET',
      `/api/comissionamento/vendedores?periodo=${encodeURIComponent(periodo)}&regionalId=${regionalId}`,
      TOKEN
    );

    console.log('Status:', response.status);
    console.log('');

    if (response.status !== 200) {
      console.error('❌ Erro:', response.data);
      process.exit(1);
    }

    const resultado = response.data;

    if (!resultado.vendedores || resultado.vendedores.length === 0) {
      console.error('❌ Nenhum vendedor retornado');
      process.exit(1);
    }

    console.log('✅ Resposta recebida com sucesso!\n');

    console.log('📊 Resumo:');
    console.log('- Período: ' + resultado.periodo);
    console.log('- Regional ID: ' + resultado.regionalId);
    console.log('- Soma percentuais ponderados: ' + resultado.somaPercentuaisPonderados);
    console.log('- Total de vendedores: ' + resultado.vendedores.length);

    resultado.vendedores.forEach((vendor, idx) => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Vendedor ' + (idx + 1) + ': ' + vendor.nome);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('CPF: ' + vendor.cpf);
      
      console.log('\n📈 VENDAS:');
      console.log('  Quantidade: ' + vendor.vendas.quantidade);
      console.log('  Valor Total: R$ ' + vendor.vendas.valorTotal.toFixed(2));
      console.log('  % Alcançado: ' + (vendor.vendas.percentualAlcancado * 100).toFixed(2) + '%');
      
      if (vendor.vendas.comissao !== undefined) {
        console.log('  ✨ COMISSÃO: R$ ' + vendor.vendas.comissao.toFixed(2));
      } else {
        console.log('  ❌ COMISSÃO: NÃO ENCONTRADA');
      }
    });

    // Verificar se algum vendedor tem comissao definida
    const temComissao = resultado.vendedores.some(v => v.vendas.comissao !== undefined);
    
    if (temComissao) {
      console.log('\n✅✅✅ SUCESSO! A coluna "comissão" foi adicionada e está sendo calculada! ✅✅✅');
    } else {
      console.log('\n❌ Campo comissão ainda não está sendo retornado');
    }

  } catch (erro) {
    console.error('❌ Erro de conexão:', erro.message);
    process.exit(1);
  }
})();
