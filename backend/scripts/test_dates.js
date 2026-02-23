(async () => {
  const XLSX = require('xlsx');
  const fs = require('fs');
  const path = require('path');

  const API = 'http://localhost:5000';
  
  try {
    // Registra usuário
    try {
      await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Teste CI', email: 'teste.ci+dev@example.com', senha: 'senha123', senhaConfirm: 'senha123' })
      });
    } catch (e) {}

    // Login
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste.ci+dev@example.com', senha: 'senha123' })
    });

    const login = await loginRes.json();
    const token = login.token;
    console.log('✓ Autenticado');

    // Cria Excel com datas reais (Excel as armazena como números seriais)
    const ws_data = [
      [
        'Data criação',
        'Camada',
        'Tipo',
        'Ação',
        'Equipe',
        'Responsável',
        'Concluir até',
        'Kanban',
        'Observação',
        'Link Bitrix'
      ],
      [
        new Date('2024-02-07'),  // Data como Date object (Excel converterá para serial)
        'CAMADA 1',
        'Projeto',
        'Test action 1',
        'Comercial',
        'Osmilton',
        new Date('2024-03-15'),  // Outra data
        'Backlog',
        'Teste',
        'https://bitrix.com'
      ],
      [
        new Date('2024-01-15'),
        'CAMADA 2',
        'Tarefa',
        'Test action 2',
        'Marketing',
        'Sergio',
        new Date('2024-04-20'),
        'Backlog',
        'Outro teste',
        'https://bitrix.com/2'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Radar');
    const filePath = path.join(__dirname, 'test_dates.xlsx');
    XLSX.writeFile(wb, filePath);
    console.log('✓ Arquivo com datas criado');

    // Lê arquivo e envia
    const fileBuffer = fs.readFileSync(filePath);
    
    // Cria multipart
    const boundary = '----' + Math.random().toString(36).substring(2, 15);
    const boundaryBuffer = Buffer.from(`--${boundary}\r\n`);
    const partHeader = Buffer.from(
      `Content-Disposition: form-data; name="arquivo"; filename="test_dates.xlsx"\r\n` +
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
    );
    const endBoundary = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([boundaryBuffer, partHeader, fileBuffer, endBoundary]);

    const prepRes = await fetch(`${API}/radar/preparar-importacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body
    });

    const prepData = await prepRes.json();
    console.log('\n✓ Preview de dados:');
    console.log('Coluna "Data criação" (primeira linha):');
    const dataCriacao = prepData.preview[0]['Data criação'];
    console.log(`  Valor: ${dataCriacao}`);
    console.log(`  Tipo: ${typeof dataCriacao}`);
    
    console.log('\nColuna "Concluir até" (primeira linha):');
    const concluirAte = prepData.preview[0]['Concluir até'];
    console.log(`  Valor: ${concluirAte}`);
    console.log(`  Tipo: ${typeof concluirAte}`);

    // Verifica se estão em formato ISO
    if (dataCriacao && dataCriacao.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log('\n✓✓ SUCESSO: Datas foram convertidas para formato ISO 8601!');
    } else {
      console.log('\n✗✗ PROBLEMA: Datas NÃO estão no formato ISO!');
      console.log('Preview completo:', JSON.stringify(prepData.preview, null, 2));
    }

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(1);
  }
})();
