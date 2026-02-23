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
    // Usar credenciais aleatórias para garantir novo usuário
    const timestamp = Date.now();
    const novoUsuario = {
      nome: `User ${timestamp}`,
      email: `user${timestamp}@example.com`,
      senha: 'senha123',
      senhaConfirm: 'senha123'
    };

    console.log('1. Registrando novo usuário...');
    
    const registroOpcoes = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST'
    };

    const respRegistro = await fazerRequisicao(registroOpcoes, novoUsuario);

    if (respRegistro.status === 201 && respRegistro.data.token) {
      console.log('✓ Usuário registrado');

      const token = respRegistro.data.token;

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
        console.log('\n✅ SUCESSO! Primeira regra:');
        console.log(JSON.stringify(respRegras.data[0], null, 2));
      } else {
        console.log('\n❌ Nenhuma regra retornada.');
        console.log('Resposta:', JSON.stringify(respRegras.data, null, 2));
      }
    } else {
      console.error('✗ Erro no registro:', respRegistro.status, respRegistro.data);
    }

  } catch (erro) {
    console.error('✗ Erro de conexão:', erro.message);
  }
}

testarAPI();
