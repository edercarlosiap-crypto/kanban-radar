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
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (dados) {
      req.write(JSON.stringify(dados));
    }
    req.end();
  });
}

async function testarAPI() {
  try {
    // Fazer login com credenciais padrão
    console.log('1. Fazendo login com admin@uni.com...');
    const loginOpcoes = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const loginResp = await fazerRequisicao(loginOpcoes, {
      email: 'admin@uni.com',
      senha: 'admin123'
    });

    if (loginResp.status === 200 && loginResp.data.token) {
      const token = loginResp.data.token;
      console.log('✓ Login bem-sucedido');

      // Testar API de regras
      console.log('\n2. Testando GET /api/regras-comissao...');
      const regrasOpcoes = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/regras-comissao',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      };

      const regrasResp = await fazerRequisicao(regrasOpcoes);
      
      console.log('✓ Status:', regrasResp.status);
      console.log('✓ Total de regras retornadas:', Array.isArray(regrasResp.data) ? regrasResp.data.length : 0);
      
      if (Array.isArray(regrasResp.data) && regrasResp.data.length > 0) {
        console.log('\n✓ Primeira regra:');
        console.log(JSON.stringify(regrasResp.data[0], null, 2));
      } else {
        console.log('\n✗ Nenhuma regra foi retornada!');
        console.log('Resposta completa:', JSON.stringify(regrasResp.data, null, 2));
      }
    } else {
      console.error('✗ Erro no login:', loginResp.status, loginResp.data);
    }

  } catch (erro) {
    console.error('✗ Erro:', erro.message);
  }
}

testarAPI();
