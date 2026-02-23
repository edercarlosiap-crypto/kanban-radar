const generateInsights = (tasks, workload, bottlenecks) => {
  const insights = [];

  const blocked = tasks.filter((task) => task.status === 'Travado');
  if (blocked.length > 0) {
    insights.push('Priorize tarefas bloqueadas para destravar o fluxo.');
  }

  const openTasks = tasks.filter((task) => task.status !== 'Concluído');
  if (openTasks.length >= 15) {
    insights.push('Equipe operando acima da capacidade ideal.');
  }

  const avgLeadTimes = Object.values(workload.byAttendant || {}).map((data) => data.avgLeadTime).filter(Boolean);
  if (avgLeadTimes.length > 0) {
    const avg = avgLeadTimes.reduce((acc, val) => acc + val, 0) / avgLeadTimes.length;
    if (avg >= 10) {
      insights.push('Aumento de lead time detectado.');
    }
  }

  if (bottlenecks.alerts.length > 0) {
    insights.push('Gargalos detectados em colunas criticas.');
  }

  return insights;
};

module.exports = {
  generateInsights
};
