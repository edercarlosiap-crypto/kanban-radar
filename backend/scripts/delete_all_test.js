(async () => {
  const API = 'http://localhost:5000';
  try {
    // registra usuário de teste (ignora erro se já existir)
    try {
      await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Teste CI', email: 'teste.ci+dev@example.com', senha: 'senha123', senhaConfirm: 'senha123' })
      });
    } catch (e) {}

    // login
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

    // Cria 2 itens de teste
    for (let i = 0; i < 2; i++) {
      await fetch(`${API}/radar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          camada: '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
          prioridade: '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO',
          tipo: 'Tarefa',
          acao: `Teste delete_all ${i}`,
          equipe: 'Comercial',
          responsavel: 'Osmilton',
          concluirAte: new Date().toISOString().split('T')[0],
          kanban: 'Backlog',
          observacao: 'Teste automático',
          linkBitrix: ''
        })
      });
    }

    // Chama DELETE /radar
    const delRes = await fetch(`${API}/radar`, { method: 'DELETE', headers });
    const txt = await delRes.text();
    console.log('DELETE status:', delRes.status);
    console.log('DELETE body:', txt);

    // Verifica listagem
    const listar = await fetch(`${API}/radar`, { method: 'GET', headers });
    const dados = await listar.json();
    console.log('Itens restantes:', dados.total);
  } catch (err) {
    console.error('Erro no teste:', err.message || err);
    process.exit(1);
  }
})();
