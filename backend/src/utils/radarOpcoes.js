const { db_get, db_run } = require('../config/database');

const DEFAULT_CAMADAS = [
  '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
  '🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)',
  '🔵 CAMADA 3 — MARCA E PRESENÇA (SUPORTE AO CRESCIMENTO)',
  '⚪ CAMADA 4 — OPERACIONAL / SUPORTE'
];

const DEFAULT_TIPOS = ['Tarefa', 'Projeto', 'OKR'];
const DEFAULT_EQUIPES = ['Comercial', 'Marketing', 'Gov', 'Retenção', 'Diretoria Comercial'];
const DEFAULT_RESPONSAVEIS = ['Osmilton', 'Sergio', 'Eder', 'Ezequias', 'João Paulo', 'Mailon'];
const DEFAULT_PRIORIDADES_CAMADA1 = [
  '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO',
  '🅱️ 1B — ORGANIZA A BASE PARA ESCALAR',
  '🅲 1C — ESTRUTURA FUTURA'
];

const DEFAULTS = {
  camadas: DEFAULT_CAMADAS,
  tipos: DEFAULT_TIPOS,
  equipes: DEFAULT_EQUIPES,
  responsaveis: DEFAULT_RESPONSAVEIS,
  prioridadesCamada1: DEFAULT_PRIORIDADES_CAMADA1
};

const normalizeList = (list) => {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  const seen = new Set();
  for (const item of list) {
    const value = String(item || '').trim();
    if (!value || seen.has(value)) continue;
    cleaned.push(value);
    seen.add(value);
  }
  return cleaned;
};

const parseStoredList = (value, fallback) => {
  if (!value) return fallback.slice();
  try {
    const parsed = JSON.parse(value);
    const normalized = normalizeList(parsed);
    return normalized.length ? normalized : fallback.slice();
  } catch (error) {
    return fallback.slice();
  }
};

const normalizeInputList = (value, fallback) => {
  const normalized = normalizeList(value);
  return normalized.length ? normalized : fallback.slice();
};

const obterRadarOpcoes = async () => {
  const row = await db_get(
    'SELECT radar_camadas, radar_tipos, radar_equipes, radar_responsaveis, radar_prioridades_camada1 FROM configuracoes WHERE id = 1',
    []
  );

  const camadas = parseStoredList(row?.radar_camadas, DEFAULTS.camadas);
  const tipos = parseStoredList(row?.radar_tipos, DEFAULTS.tipos);
  const equipes = parseStoredList(row?.radar_equipes, DEFAULTS.equipes);
  const responsaveis = parseStoredList(row?.radar_responsaveis, DEFAULTS.responsaveis);
  const prioridadesCamada1 = parseStoredList(row?.radar_prioridades_camada1, DEFAULTS.prioridadesCamada1);

  return {
    camadas,
    tipos,
    equipes,
    responsaveis,
    prioridadesCamada1
  };
};

const salvarRadarOpcoes = async (dados) => {
  const camadas = normalizeInputList(dados?.camadas, DEFAULTS.camadas);
  const tipos = normalizeInputList(dados?.tipos, DEFAULTS.tipos);
  const equipes = normalizeInputList(dados?.equipes, DEFAULTS.equipes);
  const responsaveis = normalizeInputList(dados?.responsaveis, DEFAULTS.responsaveis);
  const prioridadesCamada1 = normalizeInputList(dados?.prioridadesCamada1, DEFAULTS.prioridadesCamada1);

  await db_run('INSERT OR IGNORE INTO configuracoes (id) VALUES (1)');
  await db_run(
    'UPDATE configuracoes SET radar_camadas = ?, radar_tipos = ?, radar_equipes = ?, radar_responsaveis = ?, radar_prioridades_camada1 = ? WHERE id = 1',
    [
      JSON.stringify(camadas),
      JSON.stringify(tipos),
      JSON.stringify(equipes),
      JSON.stringify(responsaveis),
      JSON.stringify(prioridadesCamada1)
    ]
  );

  return {
    camadas,
    tipos,
    equipes,
    responsaveis,
    prioridadesCamada1
  };
};

module.exports = {
  DEFAULTS,
  obterRadarOpcoes,
  salvarRadarOpcoes
};
