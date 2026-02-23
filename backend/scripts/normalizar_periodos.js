const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatarPeriodo = (mesIdx, ano) => {
  if (mesIdx < 0 || mesIdx > 11 || !ano) return '';
  const ano2 = String(ano).slice(-2);
  return `${MESES[mesIdx]}/${ano2}`;
};

const normalizarPeriodo = (valor) => {
  if (!valor && valor !== 0) return '';

  const valorStr = String(valor).trim();
  if (!valorStr) return '';

  const valorNum = Number(valorStr);
  if (!Number.isNaN(valorNum) && valorNum > 1000 && valorNum < 70000) {
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + valorNum * 24 * 60 * 60 * 1000);
    return formatarPeriodo(date.getMonth(), date.getFullYear());
  }

  const normalizado = valorStr
    .replace('T', ' ')
    .replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const mapaMeses = {
    jan: 0, janeiro: 0,
    fev: 1, fevereiro: 1, feb: 1,
    mar: 2, marco: 2,
    abr: 3, abril: 3, apr: 3,
    mai: 4, maio: 4, may: 4,
    jun: 5, junho: 5,
    jul: 6, julho: 6,
    ago: 7, agosto: 7, aug: 7,
    set: 8, setembro: 8, sep: 8,
    out: 9, outubro: 9, oct: 9,
    nov: 10, novembro: 10,
    dez: 11, dezembro: 11, dec: 11
  };

  const tokens = normalizado.split(/[^a-z0-9]+/).filter(Boolean);
  const tokenMes = tokens.find((t) => Object.prototype.hasOwnProperty.call(mapaMeses, t));
  if (tokenMes) {
    const tokenAno = tokens.find((t) => /^\d{4}$/.test(t)) || tokens.find((t) => /^\d{2}$/.test(t));
    const ano = tokenAno || new Date().getFullYear();
    return formatarPeriodo(mapaMeses[tokenMes], ano);
  }

  const numerico = normalizado.replace(/[.\-]/g, '/');
  const partes = numerico.split('/').filter(Boolean);

  if (partes.length === 3 && partes.every((p) => /^\d+$/.test(p))) {
    const [p1, p2, p3] = partes;
    if (p1.length === 4) {
      return formatarPeriodo(Number(p2) - 1, p1);
    }
    if (p3.length === 4) {
      return formatarPeriodo(Number(p2) - 1, p3);
    }
    return formatarPeriodo(Number(p2) - 1, p3);
  }

  if (partes.length === 2 && partes.every((p) => /^\d+$/.test(p))) {
    const [p1, p2] = partes;
    if (p1.length === 4) {
      return formatarPeriodo(Number(p2) - 1, p1);
    }
    return formatarPeriodo(Number(p1) - 1, p2);
  }

  return '';
};

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this.changes);
  });
});

const normalizarTabelaVendas = async () => {
  const rows = await dbAll('SELECT id, periodo FROM vendas_mensais');
  let atualizados = 0;
  let invalidos = 0;

  for (const row of rows) {
    const novo = normalizarPeriodo(row.periodo);
    if (!novo) {
      invalidos += 1;
      continue;
    }
    if (novo !== row.periodo) {
      await dbRun('UPDATE vendas_mensais SET periodo = ?, dataAtualizacao = CURRENT_TIMESTAMP WHERE id = ?', [novo, row.id]);
      atualizados += 1;
    }
  }

  return { total: rows.length, atualizados, invalidos };
};

const normalizarTabelaChurn = async () => {
  const rows = await dbAll('SELECT id, periodo, regional_id FROM churn_regionais');
  let atualizados = 0;
  let invalidos = 0;
  let conflitos = 0;

  for (const row of rows) {
    const novo = normalizarPeriodo(row.periodo);
    if (!novo) {
      invalidos += 1;
      continue;
    }
    if (novo !== row.periodo) {
      const existente = await dbGet(
        'SELECT id FROM churn_regionais WHERE periodo = ? AND regional_id = ? AND id <> ?',
        [novo, row.regional_id, row.id]
      );
      if (existente) {
        conflitos += 1;
        continue;
      }
      await dbRun('UPDATE churn_regionais SET periodo = ?, dataAtualizacao = CURRENT_TIMESTAMP WHERE id = ?', [novo, row.id]);
      atualizados += 1;
    }
  }

  return { total: rows.length, atualizados, invalidos, conflitos };
};

const executar = async () => {
  try {
    console.log('=== Normalizacao de periodos (padrao: MMM/AA PT-BR) ===');

    const vendas = await normalizarTabelaVendas();
    console.log('vendas_mensais:', vendas);

    const churn = await normalizarTabelaChurn();
    console.log('churn_regionais:', churn);

    console.log('=== Concluido ===');
    db.close();
  } catch (err) {
    console.error('Erro ao normalizar periodos:', err);
    db.close();
    process.exit(1);
  }
};

executar();
