const historyCache = new Map();

const detectBottlenecks = (tasks, usuarioId, now) => {
  const alerts = [];
  const columns = {};

  tasks.forEach((task) => {
    const column = task.status || 'Nao informado';
    if (!columns[column]) {
      columns[column] = { count: 0, idleDays: [] };
    }
    columns[column].count += 1;
    if (task.updatedAt) {
      const idle = Math.floor((now - new Date(task.updatedAt)) / (1000 * 60 * 60 * 24));
      if (!Number.isNaN(idle)) columns[column].idleDays.push(idle);
    }
  });

  const history = historyCache.get(usuarioId) || {};
  Object.entries(columns).forEach(([column, data]) => {
    const prev = history[column] || [];
    const updated = [...prev.slice(-2), data.count];
    history[column] = updated;

    if (updated.length === 3 && updated[0] < updated[1] && updated[1] < updated[2]) {
      alerts.push(`Coluna '${column}' acumulando cards`);
    }

    if (data.idleDays.length > 0) {
      const avgIdle = data.idleDays.reduce((acc, val) => acc + val, 0) / data.idleDays.length;
      if (avgIdle >= 7) {
        alerts.push(`Cards parados por muito tempo na coluna '${column}'`);
      }
    }
  });

  historyCache.set(usuarioId, history);

  return {
    columnStats: columns,
    alerts
  };
};

module.exports = {
  detectBottlenecks
};
