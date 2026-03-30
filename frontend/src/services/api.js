import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const API_CANDIDATES = Array.from(new Set([
  API_BASE,
  '/api',
  'http://localhost:3001/api',
  'http://127.0.0.1:3001/api',
  'http://localhost:3301/api',
  'http://127.0.0.1:3301/api'
]));

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
  async (error) => {
    const originalConfig = error.config || {};
    const isNetworkError = !error.response && String(error.message || '').toLowerCase().includes('network');

    if (isNetworkError && !originalConfig._networkRetried) {
      originalConfig._networkRetried = true;
      const atual = originalConfig.baseURL || API_BASE;
      const alternativas = API_CANDIDATES.filter((base) => base !== atual);

      for (const baseURL of alternativas) {
        try {
          return await axios.request({
            ...originalConfig,
            baseURL
          });
        } catch (retryError) {
          if (retryError.response) {
            return Promise.reject(retryError);
          }
        }
      }
    }

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

export const regionalCidadesAPI = {
  listar: () =>
    api.get('/regional-cidades'),
  criar: (dados) =>
    api.post('/regional-cidades', dados),
  atualizar: (id, dados) =>
    api.put(`/regional-cidades/${id}`, dados),
  deletar: (id) =>
    api.delete(`/regional-cidades/${id}`)
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
  inativar: (id, dados = {}) =>
    api.put(`/colaboradores/${id}/inativar`, dados),
  reativar: (id) =>
    api.put(`/colaboradores/${id}/reativar`),
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
  obterRegraLideranca: (periodo) =>
    api.get('/regras-comissao/lideranca', { params: { periodo } }),
  salvarRegraLideranca: (dados) =>
    api.put('/regras-comissao/lideranca', dados),
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
  importarLote: (registros, opcoes = {}) =>
    api.post('/vendas-mensais/lote', { registros, ...opcoes }),
  importarPdfEvento: (formData) =>
    api.post('/vendas-mensais/importar-pdf-evento', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
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
  importarLote: (registros) =>
    api.post('/churn-regionais/lote', { registros }),
  atualizar: (id, dados) =>
    api.put(`/churn-regionais/${id}`, dados),
  deletar: (id) =>
    api.delete(`/churn-regionais/${id}`)
};

export const retencaoAPI = {
  listar: (params = {}) =>
    api.get('/retencao', { params }),
  listarPeriodos: () =>
    api.get('/retencao/periodos'),
  analytics: (params = {}) =>
    api.get('/retencao/analytics', { params }),
  importar: (registros, origemArquivo, opcoes = {}) =>
    api.post('/retencao/importar', { registros, origemArquivo, ...opcoes }),
  importarPorUrl: (url, origemArquivo = '', opcoes = {}) =>
    api.post('/retencao/importar-url', { url, origemArquivo, ...opcoes })
};

export const contratosAPI = {
  listar: (params = {}) =>
    api.get('/contratos', { params }),
  listarPeriodos: () =>
    api.get('/contratos/periodos'),
  listarFiltros: () =>
    api.get('/contratos/filtros'),
  analytics: (params = {}) =>
    api.get('/contratos/analytics', { params }),
  importar: (registros, periodoReferencia, origemArquivo = '', limparPeriodo = false) =>
    api.post('/contratos/importar', { registros, periodoReferencia, origemArquivo, limparPeriodo })
};

export const marketingAPI = {
  importar: (payload) =>
    api.post('/marketing/importar', payload),
  listarAnos: () =>
    api.get('/marketing/anos'),
  listarFiltros: (anoReferencia) =>
    api.get('/marketing/filtros', { params: { anoReferencia } }),
  listarLancamentos: (params = {}) =>
    api.get('/marketing/lancamentos', { params }),
  analytics: (params = {}) =>
    api.get('/marketing/analytics', { params })
};

export const comissionamentoAPI = {
  calcular: (periodo, regionalId) =>
    api.get('/comissionamento', { params: { periodo, regionalId } }),
  listarVendedores: (periodo, regionalId, filtroPerfilVendedor) =>
    api.get('/comissionamento/vendedores', {
      params: { periodo, regionalId, filtroPerfilVendedor }
    }),
  listarLiderancas: (periodo) =>
    api.get('/comissionamento/liderancas', { params: { periodo } }),
  listarRelatorioRH: (periodo, regionalId) =>
    api.get('/comissionamento/relatorio-rh', { params: { periodo, regionalId } }),
  listarConsolidado: (periodo) =>
    api.get('/comissionamento/consolidado', { params: { periodo } }),
  obterDashboardVariavel: (periodoInicio, periodoFim, filtroPerfilVendedor) =>
    api.get('/comissionamento/dashboard-variavel', {
      params: { periodoInicio, periodoFim, filtroPerfilVendedor }
    }),
  simularVendedor: (dados) =>
    api.post('/comissionamento/simulador', dados)
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

