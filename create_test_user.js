const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./database.db');

const email = 'test@test.com';
const senha = 'teste123';
const nome = 'Usuário Teste';

// Hash da senha
bcrypt.hash(senha, 10, (err, senhaHash) => {
  if (err) {
    console.error('Erro ao fazer hash:', err);
    db.close();
    return;
  }

  const id = uuidv4();
  
  db.run(
    'INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, dataCriacao) VALUES (?, ?, ?, ?, ?, datetime("now"))',
    [id, nome, email, senhaHash, 'gestor'],
    (err) => {
      if (err) {
        console.error('Erro ao inserir usuário:', err);
      } else {
        console.log('✅ Usuário criado com sucesso!');
        console.log('Email:', email);
        console.log('Senha:', senha);
        console.log('ID:', id);
      }
      db.close();
    }
  );
});
