const axios = require('axios');

async function testarCriarItem() {
  try {
    // Primeiro faz login para obter o token
    console.log('🔑 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@uni.com',
      senha: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login bem-sucedido!');

    // Cria um item de teste
    console.log('\n📝 Criando item de teste...');
    const novoItem = {
      camada: '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
      prioridade: '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO',
      tipo: 'Projeto',
      acao: 'Teste de criação via script',
      equipe: 'Comercial',
      responsavel: 'Osmilton',
      concluirAte: '2026-03-15',
      kanban: 'Backlog',
      observacao: 'Este é um item de teste',
      linkBitrix: '',
      dataCriacao: '2026-02-12'
    };

    const criarResponse = await axios.post('http://localhost:5000/api/radar', novoItem, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Item criado com sucesso!');
    console.log('ID:', criarResponse.data.item.id);
    console.log('Ação:', criarResponse.data.item.acao);

    // Lista todos os itens
    console.log('\n📋 Listando itens...');
    const listarResponse = await axios.get('http://localhost:5000/api/radar', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`✅ ${listarResponse.data.total} item(ns) no radar`);
    listarResponse.data.itens.forEach((item, index) => {
      console.log(`${index + 1}. ${item.acao} - ${item.status}`);
    });

  } catch (erro) {
    console.error('❌ Erro:', erro.response?.data || erro.message);
  }
}

testarCriarItem();
