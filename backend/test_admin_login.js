const http = require('http');

function fazerRequisicao(opcoes, dados = null) {
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
    
    if (dados) {
      const json = JSON.stringify(dados);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(json));
      req.write(json);
    }
    req.end();
  });
}

async function testarAPI() {
  try {
    // Fazer login com admin
    const credenciais = {
      email: 'admin@uni.com',
      senha: 'admin123'
    };

    console.log('1. Fazendo login com admin@uni.com...');
    
    const loginOpcoes = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST'
    };

    const respLogin = await fazerRequisicao(loginOpcoes, credenciais);

    if (respLogin.status === 200 && respLogin.data && respLogin.data.token) {
      console.log('✓ Login bem-sucedido');

      const token = respLogin.data.token;

      console.log('\n2. Testando GET /api/regras-comissao...');
      const regrasOpcoes = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/regras-comissao',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      };

      const respRegras = await fazerRequisicao(regrasOpcoes);
      
      console.log('✓ Status:', respRegras.status);
      console.log('✓ Total de regras:', Array.isArray(respRegras.data) ? respRegras.data.length : 0);
      
      if (Array.isArray(respRegras.data) && respRegras.data.length > 0) {
        console.log('\n✅✅✅ SUCESSO! Encontrou regras de comissão!');
        console.log('Primeira regra:');
        console.log(JSON.stringify(respRegras.data[0], null, 2));
      } else {
        console.log('\n❌ Nenhuma regra retornada.');
        console.log('Resposta:', JSON.stringify(respRegras.data, null, 2));
      }
    } else {
      console.error('✗ Erro no login:', respLogin.status);
      console.error('Resposta:', respLogin.data);
    }

  } catch (erro) {
    console.error('✗ Erro de conexão:', erro.message);
  }
}

testarAPI();
