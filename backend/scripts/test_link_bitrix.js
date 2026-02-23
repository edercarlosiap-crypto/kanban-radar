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

    // Cria arquivo Excel de teste com coluna "Link Bitrix"
    const ws_data = [
      [
        'Data criação',
        'Camada',
        'Prioridade',
        'Tipo',
        'Ação',
        'Equipe',
        'Responsável',
        'Concluir até',
        'Kanban',
        'Observação',
        'Link Bitrix'  // Coluna suspeita
      ],
      [
        '2024-02-07',
        'CAMADA 1',
        '1A',
        'Projeto',
        'Test action',
        'Comercial',
        'Osmilton',
        '2024-03-15',
        'Backlog',
        'Teste',
        'https://bitrix.com/test'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Radar');
    const filePath = path.join(__dirname, 'test_import.xlsx');
    XLSX.writeFile(wb, filePath);
    console.log('✓ Arquivo criado');

    // Lê e envia arquivo
    const fileBuffer = fs.readFileSync(filePath);
    
    // Cria multipart manualmente
    const boundary = '----' + Math.random().toString(36).substring(2, 15);
    const boundaryBuffer = Buffer.from(`--${boundary}\r\n`);
    const partHeader = Buffer.from(
      `Content-Disposition: form-data; name="arquivo"; filename="test_import.xlsx"\r\n` +
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
    console.log('✓ Colunas detectadas:', prepData.colunasDisponiveis);

    // Verifica se "Link Bitrix" está
    const temLinkBitrix = prepData.colunasDisponiveis.find(col => 
      col.toLowerCase().includes('link') && col.toLowerCase().includes('bitrix')
    );

    if (temLinkBitrix) {
      console.log(`✓✓ SUCESSO: Coluna '${temLinkBitrix}' estava lá!`);
    } else {
      console.log('✗✗ PROBLEMA: Coluna "Link Bitrix" está FALTANDO!');
      console.log('   Columnas:', JSON.stringify(prepData.colunasDisponiveis));
    }

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(1);
  }
})();
