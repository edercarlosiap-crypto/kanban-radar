const { db_run } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function criarAdmin() {
  try {
    const senha = 'admin123'; // Senha padrão - ALTERAR APÓS PRIMEIRO LOGIN!
    const senhaHash = await bcrypt.hash(senha, 10);
    const id = uuidv4();

    await db_run(
      `INSERT INTO usuarios (id, nome, email, senha, perfil, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 'Administrador', 'admin@uni.com', senhaHash, 'admin', 'aprovado']
    );

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('📧 Email: admin@uni.com');
    console.log('🔑 Senha: admin123');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    process.exit(0);
  } catch (erro) {
    if (erro.message.includes('UNIQUE constraint failed')) {
      console.log('ℹ️  Usuário admin já existe!');
    } else {
      console.error('❌ Erro ao criar administrador:', erro);
    }
    process.exit(1);
  }
}

criarAdmin();
