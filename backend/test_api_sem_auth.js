const http = require('http');

function fazerRequisicao(opcoes) {
  return new Promise((resolve, reject) => {
    const req = http.request(opcoes, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            rawData: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testarAPI() {
  try {
    console.log('Testando GET /api/regras-comissao sem autenticação...\n');
    
    const opcoes = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/regras-comissao',
      method: 'GET'
    };

    const resp = await fazerRequisicao(opcoes);
    
    console.log('Status:', resp.status);
    console.log('Resposta:', JSON.stringify(resp.data || { raw: resp.rawData }, null, 2));

  } catch (erro) {
    console.error('✗ Erro de conexão:', erro.message);
  }
}

testarAPI();
