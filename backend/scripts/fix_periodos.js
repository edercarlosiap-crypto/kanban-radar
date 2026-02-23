require('../src/config/database');
const { db_run, db_all, db_get } = require('../src/config/database');

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_UPPER = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function normalizarPeriodo(valor) {
  if (!valor) return '';
  const valorStr = String(valor).trim();
  
  // Já está no formato correto "Nov/25"?
  if (/^[A-Z][a-z]{2}\/\d{2}$/.test(valorStr)) {
    return valorStr;
  }
  
  // Está em minúsculas "nov/25"?
  const partes = valorStr.split('/');
  if (partes.length === 2) {
    const mesStr = partes[0].toLowerCase();
    const ano = partes[1];
    
    const mesIdx = MESES.indexOf(mesStr);
    if (mesIdx !== -1) {
      return `${MESES_UPPER[mesIdx]}/${ano}`;
    }
    
    // Tentar com o primeiro índice
    const mesIdxUp = MESES_UPPER.findIndex(m => m.toLowerCase() === mesStr);
    if (mesIdxUp !== -1) {
      return `${MESES_UPPER[mesIdxUp]}/${ano}`;
    }
  }
  
  return valorStr;
}

setTimeout(async () => {
  try {
    console.log('\n=== CORRIGINDO PERÍODOS NO BANCO ===\n');
    
    // 1. Buscar todos os períodos únicos
    const periodos = await db_all(
      "SELECT DISTINCT periodo FROM vendas_mensais ORDER BY periodo"
    );
    
    console.log(`📅 Períodos encontrados: ${periodos.length}`);
    const periodosParaCorrigir = [];
    
    for (const p of periodos) {
      const normalizado = normalizarPeriodo(p.periodo);
      if (normalizado !== p.periodo) {
        periodosParaCorrigir.push({ de: p.periodo, para: normalizado });
        console.log(`  "${p.periodo}" → "${normalizado}"`);
      } else {
        console.log(`  "${p.periodo}" já está correto`);
      }
    }
    
    // 2. Corrigir vendas_mensais
    if (periodosParaCorrigir.length > 0) {
      console.log('\n✏️ Corrigindo vendas_mensais...');
      for (const item of periodosParaCorrigir) {
        const resultado = await db_run(
          `UPDATE vendas_mensais SET periodo = ? WHERE periodo = ?`,
          [item.para, item.de]
        );
        console.log(`   ${item.de} → ${item.para} (${resultado.changes} registros)`);
      }
    }
    
    // 3. Corrigir churn_regionais
    console.log('\n✏️ Analisando churn_regionais...');
    const períodosChurn = await db_all(
      "SELECT DISTINCT periodo FROM churn_regionais ORDER BY periodo"
    );
    
    for (const p of períodosChurn) {
      const normalizado = normalizarPeriodo(p.periodo);
      if (normalizado !== p.periodo) {
        const resultado = await db_run(
          `UPDATE churn_regionais SET periodo = ?, dataAtualizacao = CURRENT_TIMESTAMP WHERE periodo = ?`,
          [normalizado, p.periodo]
        );
        console.log(`   ${p.periodo} → ${normalizado} (${resultado.changes} registros)`);
      }
    }
    
    // 4. Verificação final
    console.log('\n✅ Verificação final:');
    const countFinal = await db_get("SELECT COUNT(*) as total FROM vendas_mensais");
    const periodosFinal = await db_all(
      "SELECT DISTINCT periodo FROM vendas_mensais ORDER BY periodo"
    );
    
    console.log(`   Total de registros: ${countFinal.total}`);
    console.log(`   Períodos encontrados: ${periodosFinal.length}`);
    periodosFinal.forEach(p => {
      console.log(`     - "${p.periodo}"`);
    });
    
    console.log('\n=== MIGRAÇÃO CONCLUÍDA ===\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}, 1000);
