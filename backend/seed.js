#!/usr/bin/env node

/**
 * Script de Seed - Dados de Teste
 * 
 * Execute esse script após a primeira inicialização do backend
 * para popular o banco com dados de teste.
 * 
 * Uso: node backend/seed.js
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');

let db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  console.log('✅ Conectado ao banco de dados');
  seedDados();
});

async function seedDados() {
  try {
    // Limpar dados existentes (comentado por padrão)
    // await limparDados();

    // Criar usuários
    console.log('\n📝 Criando usuários...');
    const senhaAdmin = await bcrypt.hash('123456', 10);
    const senhaVendedor = await bcrypt.hash('123456', 10);

    const usuarios = [
      {
        id: uuidv4(),
        nome: 'Administrador',
        email: 'admin@example.com',
        senha: senhaAdmin,
        role: 'admin',
        regionalId: null,
        status: 'ativo'
      },
      {
        id: uuidv4(),
        nome: 'Editor Demo',
        email: 'editor@example.com',
        senha: senhaVendedor,
        role: 'editor',
        regionalId: null,
        status: 'ativo'
      },
      {
        id: uuidv4(),
        nome: 'Gestor Demo',
        email: 'gestor@example.com',
        senha: senhaVendedor,
        role: 'gestor',
        regionalId: null,
        status: 'ativo'
      },
      {
        id: uuidv4(),
        nome: 'Leitor Demo',
        email: 'leitura@example.com',
        senha: senhaVendedor,
        role: 'leitura',
        regionalId: null,
        status: 'ativo'
      }
    ];

    for (const u of usuarios) {
      db.run(
        `INSERT OR IGNORE INTO usuarios (id, nome, email, senha, role, regionalId, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.nome, u.email, u.senha, u.role, u.regionalId, u.status],
        (err) => {
          if (err) console.error('❌ Erro ao criar usuário:', err);
          else console.log(`  ✓ ${u.nome} (${u.email})`);
        }
      );
    }

    // Criar regionais
    console.log('\n🗺️  Criando regionais...');
    const regionais = [
      { id: uuidv4(), nome: 'São Paulo', ativo: 1 },
      { id: uuidv4(), nome: 'Rio de Janeiro', ativo: 1 },
      { id: uuidv4(), nome: 'Minas Gerais', ativo: 1 },
      { id: uuidv4(), nome: 'Bahia', ativo: 1 },
      { id: uuidv4(), nome: 'Santa Catarina', ativo: 1 }
    ];

    for (const r of regionais) {
      db.run(
        `INSERT OR IGNORE INTO regionais (id, nome, ativo) VALUES (?, ?, ?)`,
        [r.id, r.nome, r.ativo],
        (err) => {
          if (err) console.error('❌ Erro ao criar regional:', err);
          else console.log(`  ✓ ${r.nome}`);
        }
      );
    }

    // Criar regras de comissão
    console.log('\n📋 Criando regras de comissão...');
    const regras = [];
    for (let i = 0; i < regionais.length; i++) {
      regras.push({
        id: uuidv4(),
        regionalId: regionais[i].id,
        tipoMeta: 'Vendas',
        meta1Volume: 10000,
        meta1Percent: 2,
        meta2Volume: 15000,
        meta2Percent: 3,
        meta3Volume: 20000,
        meta3Percent: 4,
        incrementoGlobal: 5,
        pesoVendasChurn: 0.7
      });
    }

    for (const r of regras) {
      db.run(
        `INSERT OR IGNORE INTO regras_comissao 
         (id, regionalId, tipoMeta, meta1Volume, meta1Percent, meta2Volume, meta2Percent, 
          meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.regionalId, r.tipoMeta, r.meta1Volume, r.meta1Percent, r.meta2Volume, r.meta2Percent,
         r.meta3Volume, r.meta3Percent, r.incrementoGlobal, r.pesoVendasChurn],
        (err) => {
          if (err) console.error('❌ Erro ao criar regra:', err);
          else console.log(`  ✓ Regra para ${regionais.find(reg => reg.id === r.regionalId)?.nome}`);
        }
      );
    }

    // Criar vendas de teste
    console.log('\n📊 Criando registros de vendas...');
    const vendas = [];
    for (let i = 0; i < 20; i++) {
      vendas.push({
        id: uuidv4(),
        usuarioId: usuarios[1].id,
        regionalId: regionais[Math.floor(Math.random() * regionais.length)].id,
        valor: Math.floor(Math.random() * 50000) + 5000,
        tipo: Math.random() > 0.5 ? 'Venda' : 'Renovação',
        status: 'confirmado'
      });
    }

    for (const v of vendas) {
      db.run(
        `INSERT OR IGNORE INTO vendas (id, usuarioId, regionalId, valor, tipo, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [v.id, v.usuarioId, v.regionalId, v.valor, v.tipo, v.status],
        (err) => {
          if (err) console.error('❌ Erro ao criar venda:', err);
        }
      );
    }

    console.log(`  ✓ ${vendas.length} registros de vendas criados`);

    // Resumo final
    setTimeout(() => {
      console.log('\n' + '='.repeat(50));
      console.log('✅ SEED COMPLETO!');
      console.log('='.repeat(50));
      console.log('\n📝 Dados criados:');
      console.log(`  • ${usuarios.length} usuários`);
      console.log(`  • ${regionais.length} regionais`);
      console.log(`  • ${regras.length} regras de comissão`);
      console.log(`  • ${vendas.length} registros de vendas`);
      console.log('\n🔑 Credenciais de teste:');
      console.log('  Email: admin@example.com');
      console.log('  Senha: 123456');
      console.log('\n');
      db.close();
      process.exit(0);
    }, 2000);

  } catch (erro) {
    console.error('❌ Erro:', erro);
    db.close();
    process.exit(1);
  }
}

// Função para limpar dados (comentada)
/*
function limparDados() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM vendas', (err) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM regras_comissao', (err) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM usuarios', (err) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM regionais', (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  });
}
*/
