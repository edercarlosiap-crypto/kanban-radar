import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (nome, email, senha, senhaConfirm) =>
    api.post('/auth/register', { nome, email, senha, senhaConfirm }),
  login: (email, senha) =>
    api.post('/auth/login', { email, senha }),
  perfil: () =>
    api.get('/auth/me')
};

export const usuariosAPI = {
  listar: () =>
    api.get('/usuarios'),
  buscar: (id) =>
    api.get(`/usuarios/${id}`),
  atualizar: (id, dados) =>
    api.put(`/usuarios/${id}`, dados),
  deletar: (id) =>
    api.delete(`/usuarios/${id}`)
};

export const regionaisAPI = {
  listar: () =>
    api.get('/regionais'),
  buscar: (id) =>
    api.get(`/regionais/${id}`),
  criar: (dados) =>
    api.post('/regionais', dados),
  atualizar: (id, dados) =>
    api.put(`/regionais/${id}`, dados),
  deletar: (id) =>
    api.delete(`/regionais/${id}`)
};

export const colaboradoresAPI = {
  listar: () =>
    api.get('/colaboradores'),
  buscar: (id) =>
    api.get(`/colaboradores/${id}`),
  porRegional: (regionalId) =>
    api.get(`/colaboradores/regional/${regionalId}`),
  criar: (dados) =>
    api.post('/colaboradores', dados),
  atualizar: (id, dados) =>
    api.put(`/colaboradores/${id}`, dados),
  deletar: (id) =>
    api.delete(`/colaboradores/${id}`)
};

export const regrasComissaoAPI = {
  listar: () =>
    api.get('/regras-comissao'),
  buscar: (id) =>
    api.get(`/regras-comissao/${id}`),
  porRegional: (regionalId) =>
    api.get(`/regras-comissao/regional/${regionalId}`),
  criar: (dados) =>
    api.post('/regras-comissao', dados),
  atualizar: (id, dados) =>
    api.put(`/regras-comissao/${id}`, dados),
  deletar: (id) =>
    api.delete(`/regras-comissao/${id}`)
};

export const vendasAPI = {
  listar: () =>
    api.get('/vendas'),
  buscar: (id) =>
    api.get(`/vendas/${id}`),
  porUsuario: (usuarioId) =>
    api.get(`/vendas/usuario/${usuarioId}`),
  porRegional: (regionalId) =>
    api.get(`/vendas/regional/${regionalId}`),
  criar: (dados) =>
    api.post('/vendas', dados),
  atualizar: (id, dados) =>
    api.put(`/vendas/${id}`, dados),
  deletar: (id) =>
    api.delete(`/vendas/${id}`)
};

export const vendasMensaisAPI = {
  listar: (periodo) =>
    api.get('/vendas-mensais', { params: periodo ? { periodo } : {} }),
  buscar: (id) =>
    api.get(`/vendas-mensais/${id}`),
  porRegional: (regionalId, periodo) =>
    api.get(`/vendas-mensais/regional/${regionalId}`, { params: periodo ? { periodo } : {} }),
  porVendedor: (vendedorId, periodo) =>
    api.get(`/vendas-mensais/vendedor/${vendedorId}`, { params: periodo ? { periodo } : {} }),
  criar: (dados) =>
    api.post('/vendas-mensais', dados),
  atualizar: (id, dados) =>
    api.put(`/vendas-mensais/${id}`, dados),
  deletar: (id) =>
    api.delete(`/vendas-mensais/${id}`)
};

export const churnRegionaisAPI = {
  listar: (params = {}) =>
    api.get('/churn-regionais', { params }),
  buscar: (id) =>
    api.get(`/churn-regionais/${id}`),
  criarOuAtualizar: (dados) =>
    api.post('/churn-regionais', dados),
  atualizar: (id, dados) =>
    api.put(`/churn-regionais/${id}`, dados),
  deletar: (id) =>
    api.delete(`/churn-regionais/${id}`)
};

export const comissionamentoAPI = {
  calcular: (periodo, regionalId) =>
    api.get('/comissionamento', { params: { periodo, regionalId } }),
  listarVendedores: (periodo, regionalId) =>
    api.get('/comissionamento/vendedores', { params: { periodo, regionalId } }),
  listarConsolidado: (periodo) =>
    api.get('/comissionamento/consolidado', { params: { periodo } })
};

export const tiposMetaAPI = {
  listar: () =>
    api.get('/tipos-meta'),
  buscar: (id) =>
    api.get(`/tipos-meta/${id}`),
  criar: (dados) =>
    api.post('/tipos-meta', dados),
  atualizar: (id, dados) =>
    api.put(`/tipos-meta/${id}`, dados),
  deletar: (id) =>
    api.delete(`/tipos-meta/${id}`)
};

export default api;

