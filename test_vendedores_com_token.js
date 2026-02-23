const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'seu_jwt_secret_super_secreto_minimo_32_caracteres_12345';

// Gerar token válido
const usuario = { id: 'user-123', email: 'test@test.com', role: 'admin' };
const token = jwt.sign(usuario, JWT_SECRET, { expiresIn: '24h' });

console.log('\n🔑 TOKEN GERADO:');
console.log(token);
console.log('\n');

// Agora testar a API com o token
const http = require('http');
const url = require('url');

const options = new url.URL('http://localhost:3002/api/comissionamento/vendedores?periodo=Dez/25&regionalId=c187019b-956d-486a-b547-b9ce7a997e98');

const req = http.get(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      console.log('✅ RESPOSTA DO SERVIDOR:\n');
      console.log(`Regional: ${json.regional?.nome}`);
      console.log(`Período: ${json.periodo}`);
      console.log(`Soma dos Percentuais Ponderados: ${(json.somaPercentuaisPonderados * 100).toFixed(2)}%`);
      
      if (json.vendedores && json.vendedores.length > 0) {
        console.log(`\n💰 Amostra de vendedores:`);
        json.vendedores.slice(0, 2).forEach(v => {
          console.log(`  - ${v.nome}: R$ ${(v.vendas?.comissao || 0).toFixed(2)}`);
        });
      }
      
      console.log('\n');
      db.close();
    } catch (e) {
      console.error('❌ Erro ao processar resposta:', e.message);
      db.close();
    }
  });
}, (err) => {
  console.error('❌ Erro na requisição:', err.message);
  db.close();
});

req.setHeader('Authorization', `Bearer ${token}`);
req.on('error', (e) => {
  console.error('❌ Erro:', e.message);
  db.close();
});
