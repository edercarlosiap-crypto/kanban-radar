const backend_path = require('path').join(__dirname, 'backend');
const jwt = require('./backend/node_modules/jsonwebtoken');

const SECRET = 'seu_jwt_secret_super_secreto_minimo_32_caracteres_12345';
const usuarioId = 'e9ca5a50-b4d3-4ae3-a72f-25f969a37519'; // Admin

const token = jwt.sign(
  { usuarioId },
  SECRET,
  { expiresIn: '24h' }
);

console.log('✅ Token gerado:');
console.log(token);

// Salvar em arquivo para reutilizar
const fs = require('fs');
fs.writeFileSync('./TOKEN.txt', token);
console.log('\n✅ Token salvo em ./TOKEN.txt');
