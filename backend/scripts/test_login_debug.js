const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db_get } = require('../src/config/database');
require('dotenv').config();

async function testarLogin() {
  try {
    console.log('=== Teste de Login Detalhado ===\n');
    
    const email = 'admin@uni.com';
    const senha = 'admin123';
    
    console.log('1. Buscando usuário com email:', email);
    const usuario = await db_get(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }
    
    console.log('✅ Usuário encontrado:');
    console.log('   - ID:', usuario.id);
    console.log('   - Nome:', usuario.nome);
    console.log('   - Email:', usuario.email);
    console.log('   - Status:', usuario.status);
    console.log('   - Perfil:', usuario.perfil);
    console.log('   - Hash da senha:', usuario.senha.substring(0, 20) + '...');
    
    console.log('\n2. Verificando status...');
    if (usuario.status !== 'aprovado') {
      console.log('❌ Usuário não aprovado. Status:', usuario.status);
      process.exit(1);
    }
    console.log('✅ Status aprovado');
    
    console.log('\n3. Verificando senha...');
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    
    if (!senhaValida) {
      console.log('❌ Senha incorreta!');
      process.exit(1);
    }
    console.log('✅ Senha correta');
    
    console.log('\n4. Gerando token JWT...');
    console.log('   - JWT_SECRET definido?', !!process.env.JWT_SECRET);
    
    const token = jwt.sign(
      {
        usuarioId: usuario.id,
        email: usuario.email,
        nome: usuario.nome
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Token gerado:', token.substring(0, 30) + '...');
    
    console.log('\n=== Login seria bem-sucedido! ===');
    console.log('Token completo:', token);
    
    process.exit(0);
  } catch (erro) {
    console.error('\n❌ Erro durante teste:', erro);
    process.exit(1);
  }
}

setTimeout(() => {
  testarLogin();
}, 1000);
