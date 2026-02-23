const sqlite3 = require('sqlite3').verbose();
const http = require('http');

// Conectar ao banco de dados
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado ao banco de dados');
});

// Buscar ID da regional "ALTA FLORESTA DOESTE"
db.all(`SELECT id, nome FROM regionais WHERE nome LIKE '%ALTA FLORESTA%'`, (err, rows) => {
  if (err) {
    console.error('❌ Erro na consulta:', err.message);
    db.close();
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('❌ Regional ALTA FLORESTA DOESTE não encontrada');
    db.close();
    process.exit(1);
  }

  const regional = rows[0];
  console.log(`\n📍 Regional encontrada: ${regional.nome} (ID: ${regional.id})\n`);

  // Buscar Gabriella
  db.all(`
    SELECT c.id, c.nome 
    FROM colaboradores c 
    WHERE c.nome LIKE '%Gabriella%' AND c.regional_id = ?
  `, [regional.id], (err, colaboradores) => {
    if (err) {
      console.error('❌ Erro na consulta:', err.message);
      db.close();
      process.exit(1);
    }

    if (!colaboradores || colaboradores.length === 0) {
      console.log('❌ Gabriella não encontrada nessa regional');
      db.close();
      process.exit(1);
    }

    const gabriella = colaboradores[0];
    console.log(`👤 Gabriella encontrada: ${gabriella.nome} (ID: ${gabriella.id})`);

    // Buscar dados de vendas
    db.all(`
      SELECT * FROM vendas_mensais 
      WHERE vendedor_id = ? AND regional_id = ? AND periodo = ?
    `, [gabriella.id, regional.id, 'Dez/25'], (err, vendas) => {
      if (err) {
        console.error('❌ Erro na consulta de vendas:', err.message);
        db.close();
        process.exit(1);
      }

      if (vendas && vendas.length > 0) {
        const v = vendas[0];
        console.log('\n📊 Dados de vendas de Gabriella (Dez/25):');
        console.log(`   Mudança de Titularidade: ${v.mudanca_titularidade_volume} unidades | R$ ${v.mudanca_titularidade_financeiro}`);
      }

      // Agora fazer requisição ao backend
      setTimeout(() => {
        testarBackend(regional.id, gabriella.id, gabriella.nome);
        db.close();
      }, 1000);
    });
  });
});

function testarBackend(regionalId, gabriellaId, gabriellaNome) {
  console.log('\n🔄 Fazendo requisição ao backend...\n');

  // Primeiro, fazer login
  const loginBody = JSON.stringify({ email: 'admin@example.com', senha: '123456' });
  
  const loginReq = http.request({
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginBody.length
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const loginResponse = JSON.parse(data);
        const token = loginResponse.token;

        if (!token) {
          console.error('❌ Erro ao fazer login:', loginResponse);
          process.exit(1);
        }

        console.log('✅ Login realizado com sucesso');

        // Agora fazer requisição de comissionamento
        const options = {
          hostname: 'localhost',
          port: 3002,
          path: `/api/comissionamento/vendedores?periodo=Dez/25&regionalId=${regionalId}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        const comissaoReq = http.get(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const comissaoData = JSON.parse(data);
              
              if (comissaoData.erro) {
                console.error('❌ Erro na requisição de comissionamento:', comissaoData.erro);
                process.exit(1);
              }

              // Procurar Gabriella
              const gabriella = comissaoData.vendedores.find(v => v.id === gabriellaId);
              
              if (!gabriella) {
                console.error('❌ Gabriella não encontrada na resposta');
                process.exit(1);
              }

              console.log(`\n📋 RESULTADO PARA ${gabriella.nome}:\n`);
              console.log('═══════════════════════════════════════════');
              console.log('\n💰 RESUMO REGIONAL (Dez/25):');
              console.log(`   • Percentual Vendas: ${(comissaoData.percentualVendas * 100).toFixed(2)}%`);
              console.log(`   • Percentual Mudança Titularidade (RESUMO): ${(comissaoData.percentualMudancaTitularidadeResumo * 100).toFixed(2)}%`);
              
              console.log('\n👤 GABRIELLA GOBATTO:');
              console.log(`   Mudança de Titularidade:`);
              console.log(`     - Quantidade: ${gabriella.mudancaTitularidade.quantidade}`);
              console.log(`     - Valor Total: R$ ${gabriella.mudancaTitularidade.valorTotal.toFixed(2)}`);
              console.log(`     - % Alcançado (individual): ${(gabriella.mudancaTitularidade.percentualAlcancado * 100).toFixed(2)}%`);
              console.log(`     - COMISSÃO: R$ ${gabriella.mudancaTitularidade.comissao.toFixed(2)}`);
              
              console.log('\n═══════════════════════════════════════════');
              
              // Verificar se a correção funcionou
              if (gabriella.mudancaTitularidade.comissao === 0) {
                console.log('\n✅ CORREÇÃO FUNCIONOU!');
                console.log('A comissão agora é R$ 0,00 (esperado quando % Resumo = 0% e % Individual = 0%)');
              } else if (Math.abs(gabriella.mudancaTitularidade.comissao - 17.97) < 0.01) {
                console.log('\n❌ PROBLEMA NÃO FOI CORRIGIDO');
                console.log('A comissão ainda é R$ 17,97 - a fórmula ainda está usando somaPercentuaisPonderados');
              } else {
                console.log('\n⚠️  COMISSÃO DIFERENTE DO ESPERADO');
                console.log(`Valor: R$ ${gabriella.mudancaTitularidade.comissao.toFixed(2)}`);
              }

              process.exit(0);
            } catch (e) {
              console.error('❌ Erro ao parsear resposta:', e.message);
              console.error('Resposta:', data);
              process.exit(1);
            }
          });
        });

        comissaoReq.on('error', (err) => {
          console.error('❌ Erro na requisição:', err);
          process.exit(1);
        });
      } catch (e) {
        console.error('❌ Erro ao parsear login:', e.message);
        process.exit(1);
      }
    });
  });

  loginReq.on('error', (err) => {
    console.error('❌ Erro ao fazer login:', err);
    process.exit(1);
  });

  loginReq.write(loginBody);
  loginReq.end();
}
