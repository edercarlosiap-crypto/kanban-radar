const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

// 1. Encontrar regional ALTA FLORESTA DOESTE
db.get("SELECT id, nome FROM regionais WHERE nome LIKE '%ALTA FLORESTA%'", (err, regional) => {
  if (err || !regional) {
    console.log('❌ Regional não encontrada:', err?.message);
    db.close();
    return;
  }
  
  console.log('\n✅ Regional encontrada:', regional.nome, '| ID:', regional.id);
  
  // 2. Encontrar Gabriella Gobatto naquela regional
  db.get("SELECT c.id, c.nome, c.cpf FROM colaboradores c WHERE c.regional_id = ? AND c.nome LIKE '%Gabriella%'", 
    [regional.id], (err, colaborador) => {
    if (err || !colaborador) {
      console.log('❌ Colaborador não encontrado:', err?.message);
      db.close();
      return;
    }
    
    console.log('✅ Colaborador encontrado:', colaborador.nome, '| ID:', colaborador.id);
    
    // 3. Buscar vendas do período
    db.get("SELECT * FROM vendas_mensais WHERE vendedor_id = ? AND regional_id = ? AND periodo = 'Dez/25'", 
      [colaborador.id, regional.id], (err, vendas) => {
      if (err || !vendas) {
        console.log('❌ Vendas não encontradas:', err?.message);
        db.close();
        return;
      }
      
      console.log('\n📊 DADOS DE VENDAS (Dez/25):');
      console.log('   Mudança Titularidade - Volume:', vendas.mudanca_titularidade_volume);
      console.log('   Mudança Titularidade - Financeiro: R$', vendas.mudanca_titularidade_financeiro);
      
      // 4. Buscar regras de comissão
      db.get("SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = 'Dez/25' AND LOWER(tipoMeta) = 'mudança de titularidade'", 
        [regional.id], (err, regras) => {
        if (err || !regras) {
          console.log('❌ Regras não encontradas:', err?.message);
          db.close();
          return;
        }
        
        console.log('\n📋 REGRAS DE COMISSÃO (Mudança de Titularidade):');
        console.log('   Meta1: Volume =', regras.meta1Volume, '| Percent =', regras.meta1Percent + '%');
        console.log('   Meta2: Volume =', regras.meta2Volume, '| Percent =', regras.meta2Percent + '%');
        console.log('   Meta3: Volume =', regras.meta3Volume, '| Percent =', regras.meta3Percent + '%');
        
        // 5. Buscar totais regionais
        db.get("SELECT COUNT(*) as vendedores FROM vendas_mensais WHERE regional_id = ? AND periodo = 'Dez/25'", 
          [regional.id], (err, count) => {
          if (err) console.log('Erro:', err.message);
          
          console.log('\n👥 Vendedores na regional:', count?.vendedores);
          
          // 6. Buscar soma de percentuais ponderados
          db.get("SELECT SUM(churn_percentual_ponderado) as soma_ponderados FROM vendas_mensais WHERE regional_id = ? AND periodo = 'Dez/25'", 
            [regional.id], (err, ponderados) => {
            if (err) console.log('Erro:', err.message);
            
            console.log('   Soma de Percentuais Ponderados (regional):', ponderados?.soma_ponderados?.toFixed(4));
            
            // Agora calcular o racional
            console.log('\n🔧 CÁLCULO DO RACIONAL:');
            console.log('------------------------------------------');
            
            const volume = vendas.mudanca_titularidade_volume || 0;
            const financeiro = vendas.mudanca_titularidade_financeiro || 0;
            
            console.log('\n1️⃣  PASSO 1: Determinar % Alcançado');
            console.log('   Volume atingido:', volume);
            
            let percentualAlcancado = 0;
            let motivo = '';
            
            if (volume >= regras.meta1Volume) {
              percentualAlcancado = regras.meta1Percent;
              motivo = `Volume ${volume} >= Meta1 ${regras.meta1Volume}`;
            } else if (volume >= regras.meta2Volume) {
              percentualAlcancado = regras.meta2Percent;
              motivo = `Volume ${volume} >= Meta2 ${regras.meta2Volume} (mas < Meta1)`;
            } else if (volume >= regras.meta3Volume) {
              percentualAlcancado = regras.meta3Percent;
              motivo = `Volume ${volume} >= Meta3 ${regras.meta3Volume} (mas < Meta2)`;
            } else {
              percentualAlcancado = 0;
              motivo = `Volume ${volume} < Meta3 ${regras.meta3Volume}`;
            }
            
            console.log('   Análise:', motivo);
            console.log('   ➜ % Alcançado: ' + percentualAlcancado + '%');
            
            // Passo 2
            const somaPercentuaisPonderados = ponderados?.soma_ponderados || 0;
            console.log('\n2️⃣  PASSO 2: Calcular Comissão');
            console.log('   Fórmula: (Valor Financeiro × % Alcançado/100) + (Valor Financeiro × Soma Percentuais Ponderados)');
            console.log('   Financeiro:', financeiro);
            console.log('   % Alcançado:', percentualAlcancado + '%');
            console.log('   Soma Percentuais Ponderados:', somaPercentuaisPonderados.toFixed(4));
            
            const comissaoTipo = (financeiro * (percentualAlcancado / 100));
            const comissaoPonderada = (financeiro * somaPercentuaisPonderados);
            const comissaoTotal = comissaoTipo + comissaoPonderada;
            
            console.log('\n3️⃣  PASSO 3: Resultado Final');
            console.log('   Comissão (% Alcançado):', 'R$ ' + comissaoTipo.toFixed(2));
            console.log('   Comissão (Percentual Ponderado):', 'R$ ' + comissaoPonderada.toFixed(2));
            console.log('   ➜ COMISSÃO TOTAL: R$', comissaoTotal.toFixed(2));
            console.log('\n------------------------------------------');
            
            db.close();
          });
        });
      });
    });
  });
});
