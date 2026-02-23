import axios from 'axios';

// URL base da API
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Cria instância do axios com configuração padrão
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== AUTENTICAÇÃO =====

export const authAPI = {
  // Registra novo usuário
  register: (nome, email, senha, senhaConfirm) =>
    api.post('/auth/register', { nome, email, senha, senhaConfirm }),

  // Faz login
  login: (email, senha) =>
    api.post('/auth/login', { email, senha }),

  // Obtém dados do usuário logado
  getMe: () =>
    api.get('/auth/me')
};

// ===== RADAR =====

export const radarAPI = {
  // Lista todos os itens
  listar: () =>
    api.get('/radar'),

  // Cria novo item
  criar: (dados) =>
    api.post('/radar', dados),

  // Busca item específico
  buscar: (id) =>
    api.get(`/radar/${id}`),

  // Atualiza item
  atualizar: (id, dados) =>
    api.put(`/radar/${id}`, dados),

  // Deleta item
  deletar: (id) =>
    api.delete(`/radar/${id}`),

  // Deleta todos os itens do usuário
  deletarTodos: () =>
    api.delete('/radar'),

  // Importa Excel
  prepararImportacao: (arquivo) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return api.post('/radar/preparar-importacao', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  importarExcel: (arquivo, mapeamento) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    formData.append('mapeamento', JSON.stringify(mapeamento)); // Mapeamento é um JSON
    return api.post('/radar/importar-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Obtém estatísticas
  obterEstatisticas: () =>
    api.get('/radar/estatisticas/dashboard')
};

// ===== ADMIN =====

export const adminAPI = {
  listarUsuarios: () =>
    api.get('/admin/usuarios'),

  aprovarUsuario: (id) =>
    api.put(`/admin/usuarios/${id}/aprovar`),

  atualizarPerfil: (id, perfil) =>
    api.put(`/admin/usuarios/${id}/perfil`, { perfil }),

  desativarUsuario: (id) =>
    api.put(`/admin/usuarios/${id}/desativar`),

  uploadLogo: (arquivo) => {
    const formData = new FormData();
    formData.append('logo', arquivo);
    return api.post('/admin/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  obterRadarOpcoes: () =>
    api.get('/admin/radar-opcoes'),

  atualizarRadarOpcoes: (dados) =>
    api.put('/admin/radar-opcoes', dados),

  listarLogs: () =>
    api.get('/admin/logs')
};

// ===== CONFIG =====

export const configAPI = {
  obterLogo: () =>
    api.get('/config/logo'),

  obterRadarOpcoes: () =>
    api.get('/config/radar-opcoes')
};

// ===== RELATORIOS =====

const montarQuery = (filtros) => {
  const params = new URLSearchParams();
  if (filtros?.camada) params.append('camada', filtros.camada);
  if (filtros?.diretoria) params.append('diretoria', filtros.diretoria);
  if (filtros?.responsavel) params.append('responsavel', filtros.responsavel);
  if (filtros?.status) params.append('status', filtros.status);
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const relatoriosAPI = {
  visaoGeral: (filtros) =>
    api.get(`/relatorios/visao-geral${montarQuery(filtros)}`),

  riscos: (filtros) =>
    api.get(`/relatorios/riscos${montarQuery(filtros)}`),

  pessoas: (filtros) =>
    api.get(`/relatorios/pessoas${montarQuery(filtros)}`),

  diretorias: (filtros) =>
    api.get(`/relatorios/diretorias${montarQuery(filtros)}`),

  timeline: (filtros) =>
    api.get(`/relatorios/timeline${montarQuery(filtros)}`)
};

// ===== AI =====

export const aiAPI = {
  prioridades: () =>
    api.get('/ai/priorities')
};

export default api;
