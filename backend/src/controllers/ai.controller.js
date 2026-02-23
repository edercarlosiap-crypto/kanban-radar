const Radar = require('../models/Radar');
const { calculatePriorityScore } = require('../../ai/priorityEngine');
const { analyzeWorkload } = require('../../ai/workloadAnalyzer');
const { detectBottlenecks } = require('../../ai/bottleneckDetector');
const { generateInsights } = require('../../ai/insightsGenerator');

const mapRadarToTask = (item, index) => {
  return {
    id: item.id,
    title: item.acao,
    status: item.kanban,
    priority: item.prioridade,
    attendant: item.responsavel,
    createdAt: item.dataCriacao,
    updatedAt: item.dataAtualizacao || item.dataCriacao,
    dueDate: item.concluirAte,
    completedAt: item.kanban === 'Concluído' ? item.dataAtualizacao : null,
    columnPosition: index
  };
};

exports.getPriorities = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const itens = await Radar.listarPorUsuario(usuarioId);
    const tasks = itens.map(mapRadarToTask);

    const now = new Date();
    const workload = analyzeWorkload(tasks, now, 5);
    const bottlenecks = detectBottlenecks(tasks, usuarioId, now);

    const context = {
      now,
      workloadByAttendant: Object.fromEntries(
        Object.entries(workload.byAttendant).map(([key, value]) => [key, value])
      ),
      overloadThreshold: workload.overloadThreshold
    };

    const suggestedOrder = tasks
      .filter((task) => task.status !== 'Concluído')
      .map((task) => {
        const result = calculatePriorityScore(task, context);
        return {
          taskId: task.id,
          title: task.title,
          score: result.score,
          reason: result.reason || 'Analise heuristica'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const insights = generateInsights(tasks, workload, bottlenecks);
    const alerts = [...workload.alerts, ...bottlenecks.alerts];

    return res.status(200).json({
      suggestedOrder,
      alerts,
      insights,
      workload: workload.byAttendant
    });
  } catch (erro) {
    console.error('Erro ao gerar prioridades:', erro);
    return res.status(500).json({ erro: 'Erro ao gerar prioridades' });
  }
};
