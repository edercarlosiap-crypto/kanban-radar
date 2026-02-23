const { v4: uuidv4 } = require('uuid');
const { db_run, db_all } = require('../src/config/database');

async function seedColaboradores() {
  try {
    console.log('🌱 Iniciando seed de colaboradores...');

    // Buscar todas as regionais
    const regionais = await db_all('SELECT id, nome FROM regionais WHERE ativo = 1');

    if (regionais.length === 0) {
      console.log('⚠️  Nenhuma regional encontrada. Crie regionais primeiro.');
      process.exit(0);
    }

    console.log(`📍 Encontradas ${regionais.length} regionais`);

    // Para cada regional, criar alguns colaboradores de exemplo
    const nomesExemplo = [
      'João Silva',
      'Maria Santos',
      'Pedro Oliveira',
      'Ana Costa',
      'Carlos Souza',
      'Juliana Lima',
      'Rafael Martins',
      'Fernanda Alves'
    ];

    let totalCriados = 0;

    for (const regional of regionais) {
      console.log(`\n📋 Processando regional: ${regional.nome}`);

      // Verificar se já existem colaboradores nesta regional
      const existentes = await db_all(
        'SELECT COUNT(*) as qtd FROM colaboradores WHERE regional_id = ?',
        [regional.id]
      );

      if (existentes[0].qtd > 0) {
        console.log(`   ✅ Já existem ${existentes[0].qtd} colaboradores. Pulando...`);
        continue;
      }

      // Criar 3-5 colaboradores por regional
      const quantidade = Math.floor(Math.random() * 3) + 3; // 3 a 5 colaboradores

      for (let i = 0; i < quantidade && i < nomesExemplo.length; i++) {
        const id = uuidv4();
        const cpf = `${Math.floor(Math.random() * 90000000000) + 10000000000}`;
        
        await db_run(
          `INSERT INTO colaboradores (id, nome, cpf, regional_id, status, dataCriacao)
           VALUES (?, ?, ?, ?, 'ativo', datetime('now'))`,
          [id, nomesExemplo[i], cpf, regional.id]
        );

        totalCriados++;
        console.log(`   ✅ Criado: ${nomesExemplo[i]}`);
      }
    }

    console.log(`\n✅ Seed concluído! ${totalCriados} colaboradores criados.`);
    process.exit(0);

  } catch (erro) {
    console.error('❌ Erro ao fazer seed:', erro);
    process.exit(1);
  }
}

// Aguardar um pouco para o banco inicializar
setTimeout(() => {
  seedColaboradores();
}, 1000);
