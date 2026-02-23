const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

async function resetarSenhaAdmin() {
  try {
    const novaSenha = 'admin123';
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    db.run(
      'UPDATE usuarios SET senha = ? WHERE email = ?',
      [senhaHash, 'admin@uni.com'],
      function(err) {
        if (err) {
          console.error('Erro ao atualizar senha:', err);
        } else {
          console.log('✓ Senha do admin atualizada com sucesso');
          console.log(`📧 Email: admin@uni.com`);
          console.log(`🔑 Senha: ${novaSenha}`);
        }
        db.close();
      }
    );
  } catch (erro) {
    console.error('Erro:', erro);
    db.close();
  }
}

resetarSenhaAdmin();
