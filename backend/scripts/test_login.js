const http = require('http');

async function testarLogin() {
  const data = JSON.stringify({
    email: 'admin@uni.com',
    senha: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Resposta:', body);
      
      if (res.statusCode === 200) {
        console.log('✅ Login bem-sucedido!');
      } else {
        console.log('❌ Erro no login');
      }
    });
  });

  req.on('error', (erro) => {
    console.error('❌ Erro na requisição:', erro.message);
  });

  req.write(data);
  req.end();
}

testarLogin();
