const { daysBetween } = require('./priorityEngine');

const analyzeWorkload = (tasks, now, overloadThreshold = 5) => {
  const byAttendant = {};
  const alerts = [];

  tasks.forEach((task) => {
    const attendant = task.attendant || 'Nao informado';
    if (!byAttendant[attendant]) {
      byAttendant[attendant] = { openCount: 0, avgLeadTime: 0, tasks: [] };
    }
    if (task.status !== 'Concluído') {
      byAttendant[attendant].openCount += 1;
    }
    const lead = daysBetween(task.createdAt, task.completedAt || now);
    if (lead !== null) {
      byAttendant[attendant].tasks.push(lead);
    }
  });

  Object.entries(byAttendant).forEach(([attendant, data]) => {
    if (data.tasks.length > 0) {
      const total = data.tasks.reduce((acc, val) => acc + val, 0);
      data.avgLeadTime = Number((total / data.tasks.length).toFixed(2));
    }
    if (data.openCount >= overloadThreshold) {
      alerts.push(`${attendant} possui sobrecarga de tarefas`);
    }
  });

  return {
    byAttendant,
    alerts,
    overloadThreshold
  };
};

module.exports = {
  analyzeWorkload
};
