const axios = require('axios');

(async () => {
  try {
    console.log('🔧 Testando criação de item CAMADA 2...\n');

    // Registra/login
    try {
      await axios.post('http://localhost:5000/auth/register', {
        nome: 'Teste CAMADA2',
        email: 'teste.camada2@example.com',
        senha: 'senha123',
        senhaConfirm: 'senha123'
      });
    } catch (e) {
      // usuário já existe
    }

    const loginRes = await axios.post('http://localhost:5000/auth/login', {
      email: 'teste.camada2@example.com',
      senha: 'senha123'
    });

    const token = loginRes.data.token;
    console.log('✓ Login realizado\n');

    const headers = { Authorization: `Bearer ${token}` };

    // Teste 1: CAMADA 2 com todos os campos
    console.log('📝 Teste 1: Criando item CAMADA 2 com todos os campos');
    const payload = {
      camada: '🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)',
      tipo: 'Tarefa',
      acao: 'Teste de item CAMADA 2',
      equipe: 'Comercial',
      responsavel: 'Osmilton',
      concluirAte: new Date().toISOString().split('T')[0],
      kanban: 'Backlog',
      observacao: 'Teste automático',
      linkBitrix: ''
    };

    console.log('Enviando payload:', JSON.stringify(payload, null, 2));

    const res = await axios.post('http://localhost:5000/radar', payload, { headers });
    console.log('✓ Item criado com sucesso!');
    console.log('ID:', res.data.item.id);
    console.log('Status:', res.data.item.status);
    console.log('\n✅ Teste passou!\n');

  } catch (erro) {
    console.error('❌ Erro:', erro.response?.data || erro.message);
  }
})();
