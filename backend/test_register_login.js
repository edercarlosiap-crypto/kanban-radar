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

async function registrarETestar() {
  try {
    console.log('1. Registrando novo usuário...');
    
    const registroOpcoes = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST'
    };

    const novoUsuario = {
      nome: 'Usuário Teste 3',
      email: 'user.teste3@example.com',
      senha: 'senha123',
      senhaConfirm: 'senha123'
    };

    const respRegistro = await fazerRequisicao(registroOpcoes, novoUsuario);
    
    console.log('Status:', respRegistro.status);
    console.log('Resposta:', JSON.stringify(respRegistro.data, null, 2));

    if (respRegistro.status === 201) {
      console.log('\n✓ Usuário registrado com sucesso!');
      console.log('Agora vou tentar fazer login...\n');

      const loginOpcoes = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST'
      };

      const respLogin = await fazerRequisicao(loginOpcoes, {
        email: novoUsuario.email,
        senha: novoUsuario.senha
      });

      console.log('Status:', respLogin.status);
      console.log('Resposta:', JSON.stringify(respLogin.data, null, 2));

      if (respLogin.status === 200 && respLogin.data.token) {
        const token = respLogin.data.token;
        console.log('\n✓ Login bem-sucedido!');
        console.log('Token:', token.substring(0, 50) + '...');

        console.log('\n Agora vou testar GET /api/regras-comissao com token...\n');

        const regrasOpcoes = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/regras-comissao',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        };

        const respRegras = await fazerRequisicao(regrasOpcoes);
        
        console.log('Status:', respRegras.status);
        console.log('Total de regras:', Array.isArray(respRegras.data) ? respRegras.data.length : 0);
        
        if (Array.isArray(respRegras.data) && respRegras.data.length > 0) {
          console.log('\n✓ Primeira regra:');
          console.log(JSON.stringify(respRegras.data[0], null, 2));
        }
      }
    }

  } catch (erro) {
    console.error('✗ Erro:', erro.message);
  }
}

registrarETestar();
