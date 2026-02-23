const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function teste() {
  try {
    console.log('='.repeat(100));
    console.log('🔍 COMPARAÇÃO VALORES METAS vs COMISSIONAMENTO');
    console.log('='.repeat(100));

    // 1) Buscar um período disponível
    const metas = await run(`
      SELECT DISTINCT periodo 
      FROM regras_comissao 
      WHERE periodo IS NOT NULL AND periodo != ''
      LIMIT 1
    `);
    
    const periodo = metas[0]?.periodo || 'Dez/25';
    console.log(`\n📅 Testando período: ${periodo}\n`);

    // 2) Buscar uma regional e um vendedor específico
    const vendas = await run(`
      SELECT 
        vendedor_id, 
        periodo,
        vendas_volume,
        mudanca_titularidade_volume,
        migracao_tecnologia_volume,
        renovacao_volume,
        plano_evento_volume,
        sva_volume,
        telefonica_churn,
        telefonica_volume
      FROM vendas_mensais 
      WHERE periodo = ?
      LIMIT 5
    `, [periodo]);

    if (vendas.length === 0) {
      console.log('❌ Nenhum dado de vendas encontrado para este período');
      return;
    }

    // 3) Para cada vendedor, buscar suas regras e comparar
    for (const venda of vendas) {
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`👤 Vendedor ID: ${venda.vendedor_id}`);
      console.log(`📊 Período: ${periodo}`);
      
      // Buscar dados do colaborador
      const colaborador = await run(
        'SELECT nome FROM colaboradores WHERE id = ?',
        [venda.vendedor_id]
      );
      
      if (colaborador.length > 0) {
        console.log(`   Nome: ${colaborador[0].nome}`);
      }

      // Buscar regras para cada tipo de meta
      const tipos = ['VENDAS', 'CHURN', 'MUD. TITUL.', 'MIG. TECN.', 'RENOVAÇÃO', 'PLANO EVENTO', 'SVA', 'TELEFONIA'];
      
      console.log(`\n📋 ANÁLISE DE CÁLCULOS:`);
      console.log('┌' + '─'.repeat(98) + '┐');
      
      for (const tipo of tipos) {
        const regra = await run(`
          SELECT 
            tipo_meta,
            meta1Volume, meta1Percent,
            meta2Volume, meta2Percent,
            meta3Volume, meta3Percent,
            incrementoGlobal
          FROM regras_comissao
          WHERE tipo_meta = ? AND periodo = ?
          LIMIT 1
        `, [tipo, periodo]);

        if (regra.length === 0) {
          console.log(`│ ${tipo.padEnd(20)} | Regra NÃO encontrada`);
          continue;
        }

        const r = regra[0];
        
        // Mapear o volume correto de venda
        let volume = 0;
        switch(tipo) {
          case 'VENDAS': volume = venda.vendas_volume || 0; break;
          case 'CHURN': volume = venda.telefonica_churn || 0; break;
          case 'MUD. TITUL.': volume = venda.mudanca_titularidade_volume || 0; break;
          case 'MIG. TECN.': volume = venda.migracao_tecnologia_volume || 0; break;
          case 'RENOVAÇÃO': volume = venda.renovacao_volume || 0; break;
          case 'PLANO EVENTO': volume = venda.plano_evento_volume || 0; break;
          case 'SVA': volume = venda.sva_volume || 0; break;
          case 'TELEFONIA': volume = venda.telefonica_volume || 0; break;
        }

        // Simular cálculo do percentual
        const meta1V = parseFloat(r.meta1Volume) || 0;
        const meta2V = parseFloat(r.meta2Volume) || 0;
        const meta3V = parseFloat(r.meta3Volume) || 0;
        const meta1P = parseFloat(r.meta1Percent) || 0;
        const meta2P = parseFloat(r.meta2Percent) || 0;
        const meta3P = parseFloat(r.meta3Percent) || 0;
        const incremental = parseFloat(r.incrementoGlobal) || 1;

        let percentualCalculado = 0;
        let faixaAcertada = 'SEM META';

        if (volume >= meta3V && volume < meta2V) {
          percentualCalculado = meta3P;
          faixaAcertada = `Faixa 3: [${meta3V}-${meta2V}) = ${meta3P}%`;
        } else if (volume >= meta2V && volume < meta1V) {
          percentualCalculado = meta2P;
          faixaAcertada = `Faixa 2: [${meta2V}-${meta1V}) = ${meta2P}%`;
        } else if (volume >= meta1V) {
          percentualCalculado = meta1P;
          faixaAcertada = `Faixa 1: [${meta1V}+) = ${meta1P}%`;
        }

        const comissao = volume * (percentualCalculado / 100) * incremental;

        console.log(`│ ${tipo.padEnd(15)} | Vol: ${String(volume).padStart(6)} | ${faixaAcertada.padEnd(35)} | Comissão: R$ ${comissao.toFixed(2)}`);
      }
      
      console.log('└' + '─'.repeat(98) + '┘');
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ Teste concluído');
    console.log('='.repeat(100));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    db.close();
  }
}

teste();
