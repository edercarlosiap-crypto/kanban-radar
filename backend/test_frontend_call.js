const axios = require('axios');

async function testarFrontend() {
  try {
    const API_BASE = 'http://localhost:3002/api';
    
    // Login primeiro
    console.log('1. Fazendo login...');
    const loginResp = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      senha: '123456'
    });
    
    const token = loginResp.data.token;
    console.log('✓ Token obtido');
    
    // Criar API instance com interceptor (assim como o frontend faz)
    const api = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    api.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    
    // Fazer a chamada como o frontend faz
    console.log('\n2. Chamando regrasComissaoAPI.listar()...');
    const regrasResp = await api.get('/regras-comissao');
    
    console.log('\n=== RESPOSTA DO BACKEND ===');
    console.log('Tipo:', regrasResp.constructor.name);
    console.log('Status:', regrasResp.status);
    console.log('Data type:', typeof regrasResp.data);
    console.log('Data keys:', Object.keys(regrasResp.data));
    console.log('Has regras:', !!regrasResp.data.regras);
    console.log('Regras count:', regrasResp.data.regras?.length || 0);
    
    if (regrasResp.data.regras && regrasResp.data.regras.length > 0) {
      console.log('\n✓ SUCESSO! Primeira regra:');
      console.log(JSON.stringify(regrasResp.data.regras[0], null, 2));
    } else {
      console.log('\n❌ PROBLEMA: Nenhuma regra retornada');
      console.log('Resposta completa:', JSON.stringify(regrasResp.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testarFrontend();
