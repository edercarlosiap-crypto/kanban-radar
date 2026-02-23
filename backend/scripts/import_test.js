(async () => {
  const API = 'http://localhost:5000';
  const XLSX = require('xlsx');

  try {
    // Registrar / login
    try {
      await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Teste CI', email: 'teste.ci+dev@example.com', senha: 'senha123', senhaConfirm: 'senha123' }) });
    } catch(e){}

    const loginRes = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'teste.ci+dev@example.com', senha: 'senha123' }) });
    if (!loginRes.ok) throw new Error('Login falhou: ' + await loginRes.text());
    const login = await loginRes.json();
    const token = login.token;
    console.log('Token obtido');

    // Gera planilha de exemplo
    const ws_data = [
      ['Data criação','Camada','Prioridade','Tipo','Ação','Equipe','Responsável','Concluir até','Kanban','Observação','Link bitrix','ColunaExtra1'],
      ['2024-02-07','🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI','🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO','Tarefa','Criar script de deploy','Comercial','Osmilton','2024-03-01','Backlog','Teste','https://bitrix','Extra'],
      ['2024-02-01','🔵 CAMADA 3 — MARCA E PRESENÇA (SUPORTE AO CRESCIMENTO)','🅲 1C — ESTRUTURA FUTURA','Projeto','Campanha marca','Marketing','Maria','2024-04-10','Planejado','OK','', 'Extra2']
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Radar');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Preparar FormData para /preparar-importacao (usar Blob no Node)
    const form1 = new FormData();
    const arquivoBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    form1.append('arquivo', arquivoBlob, 'teste_import.xlsx');

    console.log('Chamando /radar/preparar-importacao ...');
    const prepRes = await fetch(`${API}/radar/preparar-importacao`, { method: 'POST', body: form1, headers: { 'Authorization': 'Bearer ' + token } });
    const prepJson = await prepRes.json();
    console.log('Status preparar-importacao:', prepRes.status);
    console.log(JSON.stringify(prepJson, null, 2));

    if (!prepRes.ok) throw new Error('preparar-importacao falhou: ' + (prepJson.erro || prepRes.status));

    // Monta mapeamento automático: tentar mapear por descrição
    const colunas = prepJson.colunasDisponiveis || [];
    const campos = prepJson.camposEsperados || [];
    const mapeamento = {};
    for (const c of campos) {
      const encontrada = colunas.find(col => col.toLowerCase().includes(c.descricao.toLowerCase()) || col.toLowerCase().includes(c.campo.toLowerCase()));
      if (encontrada) mapeamento[c.campo] = encontrada;
    }
    console.log('Mapeamento automático:', mapeamento);

    // Agora importa com mapeamento
    const form2 = new FormData();
    form2.append('arquivo', arquivoBlob, 'teste_import.xlsx');
    const mapaBlob = new Blob([JSON.stringify(mapeamento)], { type: 'application/json' });
    form2.append('mapeamento', mapaBlob, 'mapeamento.json');

    console.log('Chamando /radar/importar-excel ...');
    const impRes = await fetch(`${API}/radar/importar-excel`, { method: 'POST', body: form2, headers: { 'Authorization': 'Bearer ' + token, 'x-mapeamento': JSON.stringify(mapeamento) } });
    const impJson = await impRes.json();
    console.log('Status importar-excel:', impRes.status);
    console.log(JSON.stringify(impJson, null, 2));

    if (!impRes.ok) throw new Error('importar-excel falhou: ' + (impJson.erro || impRes.status));

    console.log('Teste de importação finalizado com sucesso');
  } catch (err) {
    console.error('Erro no teste:', err.message || err);
    process.exit(1);
  }
})();
