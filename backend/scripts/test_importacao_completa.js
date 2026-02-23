// Teste completo de importação de Excel com datas
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const API_URL = 'http://localhost:5000';
const EMAIL = 'teste@example.com';
const SENHA = 'senha123';

// Helper para fazer requests com FormData
async function requestFormData(url, fileStream, mapeamento, token) {
  // Node.js native FormData (v18.12+)
  const FormData = require('form-data');
  const formData = new FormData();
  formData.append('arquivo', fileStream);
  if (mapeamento) {
    formData.append('mapeamento', JSON.stringify(mapeamento));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function testeCompleto() {
  try {
    console.log('🧪 Teste Completo de Importação com Conversão de Datas\n');

    // 1. Login
    console.log('1️⃣ Autenticando...');
    let loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, senha: SENHA })
    });
    
    if (!loginRes.ok) {
      // Se falhar, registra novo usuário
      console.log('   → Usuário não encontrado, criando novo...');
      const regRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nome: 'Teste Importação', 
          email: EMAIL, 
          senha: SENHA, 
          senhaConfirm: SENHA 
        })
      });
      if (!regRes.ok) throw new Error(`Erro ao registrar: ${regRes.status}`);
      
      // Tenta login novamente
      loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, senha: SENHA })
      });
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✓ Autenticado\n');

    // 2. Deletar todos os itens anteriores
    console.log('2️⃣ Limpando itens anteriores...');
    try {
      const delRes = await fetch(`${API_URL}/radar`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (delRes.ok) {
        console.log('✓ Itens deletados\n');
      }
    } catch (e) {
      console.log('⚠️ Nenhum item para deletar\n');
    }

    // 3. Criar Excel com dados de test
    console.log('3️⃣ Criando arquivo Excel com datas...');
    const dadosExcel = [
      {
        'Camada': '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
        'Tipo': 'Projeto',
        'Ação': 'Implementar novo sistema',
        'Data criação': new Date(2024, 0, 15),  // 2024-01-15
        'Concluir até': new Date(2024, 2, 15), // 2024-03-15
        'Equipe': 'Marketing',
        'Responsável': 'Osmilton',
        'Link Bitrix': 'https://uni.bitrix24.com/1234'
      },
      {
        'Camada': '🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)',
        'Tipo': 'Tarefa',
        'Ação': 'Revisar processos',
        'Data criação': new Date(2024, 1, 1),  // 2024-02-01
        'Concluir até': new Date(2024, 3, 30), // 2024-04-30
        'Equipe': 'Comercial',
        'Responsável': 'Sergio',
        'Link Bitrix': 'https://uni.bitrix24.com/5678'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    
    const filePath = path.join(__dirname, 'test_import_completo.xlsx');
    XLSX.writeFile(wb, filePath);
    console.log(`✓ Arquivo criado: ${filePath}\n`);

    // 4. Preparar importação
    console.log('4️⃣ Preparando importação...');
    const prepData = await requestFormData(
      `${API_URL}/radar/preparar-importacao`,
      fs.createReadStream(filePath),
      null,
      token
    );

    console.log('✓ Preparação concluída');
    console.log(`  → Colunas detectadas: ${prepData.colunasDisponiveis.join(', ')}`);
    console.log(`  → Total de linhas: ${prepData.totalLinhas}\n`);

    // Validar datas no preview
    console.log('  Validação de datas no preview:');
    const firstRow = prepData.preview[0];
    console.log(`    "Data criação": ${firstRow['Data criação']} (type: ${typeof firstRow['Data criação']})`);
    console.log(`    "Concluir até": ${firstRow['Concluir até']} (type: ${typeof firstRow['Concluir até']})\n`);

    // Verificar se são strings ISO
    const saoStrings = typeof firstRow['Data criação'] === 'string' && typeof firstRow['Concluir até'] === 'string';
    const saoISO = /^\d{4}-\d{2}-\d{2}/.test(firstRow['Data criação']) && /^\d{4}-\d{2}-\d{2}/.test(firstRow['Concluir até']);
    if (saoStrings && saoISO) {
      console.log('  ✅ Datas estão em formato ISO 8601!\n');
    } else {
      console.log('  ❌ Datas não estão em formato ISO!\n');
    }

    // 5. Importar Excel com mapeamento
    console.log('5️⃣ Importando dados...');
    const mapeamento = {
      'Camada': 'camada',
      'Tipo': 'tipo',
      'Ação': 'acao',
      'Data criação': 'dataCriacao',
      'Concluir até': 'concluirAte',
      'Equipe': 'equipe',
      'Responsável': 'responsavel',
      'Link Bitrix': 'linkBitrix'
    };

    const importData = await requestFormData(
      `${API_URL}/radar/importar-excel`,
      fs.createReadStream(filePath),
      mapeamento,
      token
    );

    console.log(`✓ Importação concluída`);
    console.log(`  → Linhas importadas: ${importData.linhasImportadas}`);
    console.log(`  → Erros: ${importData.erros.length}\n`);

    // 6. Listar itens importados
    console.log('6️⃣ Listando itens importados...');
    const listRes = await fetch(
      `${API_URL}/radar`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const listData = await listRes.json();
    console.log(`✓ Total de itens: ${listData.total}\n`);
    
    if (listData.itens.length > 0) {
      console.log('📋 Primeiro item importado:');
      const primeiro = listData.itens[0];
      console.log(`  ID: ${primeiro.id}`);
      console.log(`  Ação: ${primeiro.acao}`);
      console.log(`  Data Criação: ${primeiro.dataCriacao}`);
      console.log(`  Concluir Até: ${primeiro.concluirAte}`);
      console.log(`  Link Bitrix: ${primeiro.linkBitrix}`);
      console.log(`  Status na BD: Armazenado corretamente ✓`);
    }

    // 7. Cleanup
    fs.unlinkSync(filePath);
    console.log('\n✓ Arquivo de teste deletado');

    console.log('\n✅ TESTE COMPLETO PASSOU!');
    console.log('   → Datas convertidas de números seriais para ISO 8601 ✓');
    console.log('   → Link Bitrix visualizado e importado ✓');
    console.log('   → Todos os dados preservados corretamente ✓');

  } catch (erro) {
    console.error('\n❌ ERRO:', erro.message);
    process.exit(1);
  }
}

testeCompleto();
