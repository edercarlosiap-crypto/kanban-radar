// Dar tempo para as tabelas serem criadas
setTimeout(async () => {
  try {
    const { db_all, db_get } = require('../src/config/database');
    
    console.log('\n=== DEBUG VENDAS MENSAIS ===\n');
    
    // 2. Contar registros
    console.log('📊 Total de registros:');
    const count = await db_get("SELECT COUNT(*) as total FROM vendas_mensais");
    console.log(`Total: ${count?.total || 0}`);
    
    // 3. Ver períodos únicos
    console.log('\n📅 Períodos encontrados:');
    const periodos = await db_all(
      "SELECT DISTINCT periodo FROM vendas_mensais ORDER BY periodo DESC"
    );
    console.table(periodos);
    
    // 4. Ver amostra de dados (últimos 10 registros)
    console.log('\n📝 Últimos 10 registros:');
    const amostra = await db_all(
      `SELECT 
        id, periodo, vendedor_id, regional_id, 
        vendas_volume, vendas_financeiro,
        mudanca_titularidade_volume, migracao_tecnologia_volume,
        renovacao_volume, plano_evento_volume, sva_volume, telefonia_volume
      FROM vendas_mensais 
      ORDER BY id DESC 
      LIMIT 10`
    );
    console.table(amostra);
    
    // 5. Ver churn
    console.log('\n🔴 Churn Regionais (últimos 10):');
    const churn = await db_all(
      `SELECT id, periodo, regional_id, churn FROM churn_regionais ORDER BY id DESC LIMIT 10`
    );
    console.table(churn);
    
    // 6. Análise por período e regional
    console.log('\n🗂️ Resumo por Período e Regional:');
    const resumo = await db_all(
      `SELECT 
        periodo, 
        regional_id,
        COUNT(*) as qtd_vendedores,
        SUM(vendas_volume) as total_volume,
        SUM(vendas_financeiro) as total_financeiro
      FROM vendas_mensais
      GROUP BY periodo, regional_id
      ORDER BY periodo DESC, regional_id`
    );
    console.table(resumo);
    
    // 7. Períodos em diferentes formatos
    console.log('\n🔍 Períodos com segmentação:');
    const periodosDetalhes = await db_all(
      `SELECT periodo, COUNT(*) as qtd FROM vendas_mensais GROUP BY periodo ORDER BY periodo`
    );
    if (periodosDetalhes && periodosDetalhes.length > 0) {
      periodosDetalhes.forEach(p => {
        console.log(`  "${p.periodo}" -> ${p.qtd} registros`);
      });
    } else {
      console.log('  ❌ Nenhum registro encontrado');
    }
    
    console.log('\n=== FIM DEBUG ===\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}, 1000);

if (false) {
  const { db_all, db_get } = require('../src/config/database');
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');

  const dbPath = path.join(__dirname, '../../database.db');

  async function debugVendas() {
    try {
      console.log('\n=== DEBUG VENDAS MENSAIS ===\n');
      
      // Conectar ao banco para queries customizadas
      const database = new sqlite3.Database(dbPath);
    
    // 1. Ver estrutura da tabela
    console.log('📋 Estrutura da tabela vendas_mensais:');
    const info = await new Promise((resolve, reject) => {
      database.all("PRAGMA table_info(vendas_mensais)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.table(info);
    
    // 2. Contar registros
    console.log('\n📊 Total de registros:');
    const count = await new Promise((resolve, reject) => {
      database.get("SELECT COUNT(*) as total FROM vendas_mensais", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    console.log(`Total: ${count.total}`);
    
    // 3. Ver períodos únicos
    console.log('\n📅 Períodos encontrados:');
    const periodos = await new Promise((resolve, reject) => {
      database.all(
        "SELECT DISTINCT periodo FROM vendas_mensais ORDER BY periodo DESC",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    console.table(periodos);
    
    // 4. Ver amostra de dados (últimos 10 registros)
    console.log('\n📝 Últimos 10 registros:');
    const amostra = await new Promise((resolve, reject) => {
      database.all(
        `SELECT 
          id, periodo, vendedor_id, regional_id, 
          vendas_volume, vendas_financeiro,
          mudanca_titularidade_volume, migracao_tecnologia_volume,
          renovacao_volume, plano_evento_volume, sva_volume, telefonia_volume
        FROM vendas_mensais 
        ORDER BY id DESC 
        LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    console.table(amostra);
    
    // 5. Ver churn
    console.log('\n🔴 Churn Regionais:');
    const churn = await new Promise((resolve, reject) => {
      database.all(
        `SELECT periode, regional_id, churn FROM churn_regionais ORDER BY id DESC LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    console.table(churn);
    
    // 6. Análise por período e regional
    console.log('\n🗂️ Resumo por Período e Regional:');
    const resumo = await new Promise((resolve, reject) => {
      database.all(
        `SELECT 
          periodo, 
          regional_id,
          COUNT(*) as qtd_vendedores,
          SUM(vendas_volume) as total_volume,
          SUM(vendas_financeiro) as total_financeiro
        FROM vendas_mensais
        GROUP BY periodo, regional_id
        ORDER BY periodo DESC, regional_id`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    console.table(resumo);
    
    // 7. Períodos em diferentes formatos
    console.log('\n🔍 Períodos com segmentação:');
    const periodosDetalhes = await new Promise((resolve, reject) => {
      database.all(
        `SELECT periodo, COUNT(*) as qtd FROM vendas_mensais GROUP BY periodo ORDER BY periodo`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    periodosDetalhes.forEach(p => {
      console.log(`  "${p.periodo}" -> ${p.qtd} registros`);
    });
    
    console.log('\n=== FIM DEBUG ===\n');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

debugVendas();
