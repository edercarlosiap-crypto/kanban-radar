const COLUMN_WEIGHTS = {
  Backlog: 5,
  Planejado: 10,
  'Em Estruturação': 15,
  'Em Execução': 20,
  Travado: 40,
  Validação: 15,
  Concluído: 0
};

const daysBetween = (from, to) => {
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null;
  const diff = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));
  return diff;
};

const getIdleDays = (task, now) => {
  const base = task.updatedAt || task.createdAt;
  return daysBetween(base, now);
};

const getAgeDays = (task, now) => daysBetween(task.createdAt, now);

const dueInHours = (task, now) => {
  if (!task.dueDate) return null;
  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return null;
  return Math.ceil((dueDate - now) / (1000 * 60 * 60));
};

const buildReason = (parts) => parts.filter(Boolean).join(' + ');

const calculatePriorityScore = (task, context) => {
  const now = context.now;
  const reasons = [];
  let score = 0;

  const idleDays = getIdleDays(task, now);
  if (idleDays !== null && idleDays > 0) {
    const idleScore = Math.min(idleDays * 2, 30);
    score += idleScore;
    reasons.push(`Sem atualizacao ha ${idleDays} dias`);
  }

  const dueHours = dueInHours(task, now);
  if (dueHours !== null) {
    if (dueHours < 0) {
      score += 50;
      reasons.push('Prazo vencido');
    } else if (dueHours <= 48) {
      score += 30;
      reasons.push('Prazo em 48h');
    }
  }

  const ageDays = getAgeDays(task, now);
  if (ageDays !== null && ageDays > 0) {
    score += ageDays;
    reasons.push(`Tarefa aberta ha ${ageDays} dias`);
  }

  const columnWeight = COLUMN_WEIGHTS[task.status] || 8;
  score += columnWeight;
  if (task.status === 'Travado') reasons.push('Tarefa bloqueada');

  const workload = context.workloadByAttendant[task.attendant] || { openCount: 0 };
  if (workload.openCount >= context.overloadThreshold) {
    const extra = (workload.openCount - context.overloadThreshold + 1) * 3;
    score += extra;
    reasons.push('Responsavel sobrecarregado');
  }

  return {
    score,
    reason: buildReason(reasons)
  };
};

module.exports = {
  calculatePriorityScore,
  daysBetween
};
