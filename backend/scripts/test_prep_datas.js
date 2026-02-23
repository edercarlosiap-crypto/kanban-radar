// Teste do endpoint /radar/preparar-importacao diretamente
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

// Configurar URL do backend
const API_URL = 'http://localhost:3001';

// Tokens para autenticação (você precisa preencher com um token válido)
const EMAIL = 'teste@example.com';
const SENHA = 'senha123';

async function testarPreparacao() {
  try {
    console.log('🧪 Testando /radar/preparar-importacao com conversão de datas\n');

    // Step 1: Login
    console.log('1️⃣ Fazendo login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      senha: SENHA
    });
    const token = loginRes.data.token;
    console.log('✓ Autenticado\n');

    // Step 2: Criar arquivo Excel com datas
    console.log('2️⃣ Criando arquivo Excel com datas...');
    const dadosExcel = [
      { 'Camada': 'Estratégica', 'Data criação': new Date(2024, 1, 7), 'Concluir até': new Date(2024, 2, 15), 'Ação': 'Teste 1' },
      { 'Camada': 'Tática', 'Data criação': new Date(2024, 0, 15), 'Concluir até': new Date(2024, 1, 28), 'Ação': 'Teste 2' }
    ];

    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    
    const filePath = path.join(__dirname, 'test_excel_datas.xlsx');
    XLSX.writeFile(wb, filePath);
    console.log(`✓ Arquivo criado: ${filePath}\n`);

    // Step 3: Preparar importação
    console.log('3️⃣ Enviando arquivo para /radar/preparar-importacao...');
    const form = new FormData();
    form.append('arquivo', fs.createReadStream(filePath));

    const prepRes = await axios.post(
      `${API_URL}/radar/preparar-importacao`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✓ Resposta recebida:\n');
    console.log(JSON.stringify(prepRes.data, null, 2));

    // Validar datas
    console.log('\n\n4️⃣ Validando conversão de datas no preview:');
    if (prepRes.data.preview && prepRes.data.preview.length > 0) {
      const firstRow = prepRes.data.preview[0];
      console.log('\nPrimeira linha do preview:');
      console.log(JSON.stringify(firstRow, null, 2));

      if (firstRow['Data criação']) {
        console.log(`\n  "Data criação": ${firstRow['Data criação']}`);
        console.log(`  Tipo: ${typeof firstRow['Data criação']}`);
        console.log(`  É string ISO? ${typeof firstRow['Data criação'] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(firstRow['Data criação'])}`);
      }

      if (firstRow['Concluir até']) {
        console.log(`\n  "Concluir até": ${firstRow['Concluir até']}`);
        console.log(`  Tipo: ${typeof firstRow['Concluir até']}`);
        console.log(`  É string ISO? ${typeof firstRow['Concluir até'] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(firstRow['Concluir até'])}`);
      }
    }

    // Limpar arquivo
    fs.unlinkSync(filePath);
    console.log('\n✓ Arquivo de teste deletado');

  } catch (erro) {
    console.error('❌ Erro:', erro.response?.data || erro.message);
  }
}

testarPreparacao();
