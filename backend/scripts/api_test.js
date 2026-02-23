(async () => {
  const API = 'http://localhost:5000';
  try {
    // tentar registrar (ignora erro se já existir)
    try {
      const r = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Teste CI', email: 'teste.ci+dev@example.com', senha: 'senha123', senhaConfirm: 'senha123' })
      });
    } catch (e) {}

    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste.ci+dev@example.com', senha: 'senha123' })
    });

    if (!loginRes.ok) {
      const txt = await loginRes.text();
      throw new Error('Login falhou: ' + txt);
    }

    const login = await loginRes.json();
    const token = login.token;
    console.log('Token:', token);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const createRes = await fetch(`${API}/radar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        camada: '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
        prioridade: '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO',
        tipo: 'Tarefa',
        acao: 'Criar script de deploy',
        equipe: 'Comercial',
        responsavel: 'Osmilton',
        concluirAte: new Date().toISOString().split('T')[0],
        kanban: 'Backlog',
        observacao: 'Teste automático',
        linkBitrix: ''
      })
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      throw new Error('Create falhou: ' + txt);
    }

    const create = await createRes.json();
    console.log('Criado ID:', create.item.id);
    const id = create.item.id;

    const putRes = await fetch(`${API}/radar/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ acao: 'Criar script de deploy (EDITADO)' })
    });

    if (!putRes.ok) {
      const txt = await putRes.text();
      throw new Error('PUT falhou: ' + txt);
    }

    const put = await putRes.json();
    console.log('PUT resposta:', JSON.stringify(put));

    const getRes = await fetch(`${API}/radar/${id}`, { method: 'GET', headers });
    const getData = await getRes.json();
    console.log('GET resultado:', JSON.stringify(getData, null, 2));
  } catch (err) {
    console.error('Erro no teste:', err.message || err);
    process.exit(1);
  }
})();
