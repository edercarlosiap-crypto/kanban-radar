// ===================================================================
// CONTROLADOR DE RETENCAO DE CLIENTES
// ===================================================================

const Attendant = require('../models/Attendant');
const RetentionAttempt = require('../models/RetentionAttempt');
const registrarLog = require('../utils/registrarLog');

const OUTCOME_VALUES = [
  'Cancelamento Efetivado',
  'Reversao (Desconto)',
  'Reversao (Upgrade)',
  'Reversao (Visita Tecnica)',
  'Reversao (Downgrade)',
  'Titularidade'
];

const CALL_ORIGIN_VALUES = ['Interno', 'Externo'];
const INTERACTION_TYPE_VALUES = ['Chat', 'Phone', 'WhatsApp', 'Presential'];

// Helpers para validacao e normalizacao
const normalizeValue = (value, validOptions) => {
  const normalized = String(value || '').trim();
  const found = validOptions.find(opt => opt.toLowerCase() === normalized.toLowerCase());
  return found || null;
};

const calculateRetentionRate = (totalAttempts, totalCancellations) => {
  if (totalAttempts === 0) return 0;
  const retained = totalAttempts - totalCancellations;
  return (retained / totalAttempts) * 100;
};

// POST /retention/attempts - Registrar nova tentativa de retencao
exports.createAttempt = async (req, res) => {
  try {
    const { 
      attendant_id,
      attendant_name, // Temporario, para facilitar o log
      customer_id,
      customer_name,
      branch,
      contract_id,
      previous_calls_3_months,
      previous_call_count,
      call_origin,
      reason_category,
      reason_subcategory,
      interaction_type,
      has_fine,
      outcome,
      notes
    } = req.body;

    if (!attendant_id || !customer_id || !customer_name || !branch || !call_origin || 
        !reason_category || !reason_subcategory || !interaction_type || !outcome) {
      return res.status(400).json({ erro: 'Campos obrigatorios faltando.' });
    }

    const normalizedOutcome = normalizeValue(outcome, OUTCOME_VALUES);
    if (!normalizedOutcome) {
      return res.status(400).json({ erro: 'Outcome invalido.' });
    }

    const normalizedCallOrigin = normalizeValue(call_origin, CALL_ORIGIN_VALUES);
    if (!normalizedCallOrigin) {
      return res.status(400).json({ erro: 'Call Origin invalido.' });
    }

    const normalizedInteractionType = normalizeValue(interaction_type, INTERACTION_TYPE_VALUES);
    if (!normalizedInteractionType) {
      return res.status(400).json({ erro: 'Interaction Type invalido.' });
    }

    // Verificar se attendant existe e está ativo (opcional, mas boa pratica)
    const attendant = await Attendant.getById(attendant_id);
    if (!attendant || !attendant.active) {
      return res.status(400).json({ erro: 'Atendente invalido ou inativo.' });
    }

    const newAttemptId = await RetentionAttempt.create({
      attendant_id,
      attendant_name: attendant.name, // Usar nome do banco para consistencia
      customer_id,
      customer_name,
      branch,
      contract_id: contract_id || null,
      previous_calls_3_months: !!previous_calls_3_months,
      previous_call_count: previous_call_count || null,
      call_origin: normalizedCallOrigin,
      reason_category,
      reason_subcategory,
      interaction_type: normalizedInteractionType,
      has_fine: !!has_fine,
      outcome: normalizedOutcome,
      notes: notes || null
    });

    await registrarLog(req.usuario?.email || req.usuario?.nome, 'CRIAR_TENTATIVA_RETENCAO', newAttemptId);

    return res.status(201).json({ mensagem: 'Tentativa de retencao registrada com sucesso', id: newAttemptId });
  } catch (erro) {
    console.error('Erro ao registrar tentativa de retencao:', erro);
    return res.status(500).json({ erro: 'Erro interno ao registrar tentativa de retencao' });
  }
};

// GET /retention/metadata - Retorna opcoes para selects do frontend
exports.getMetadata = async (req, res) => {
  try {
    const branches = await RetentionAttempt.getUniqueValues('branch');
    const reasonCategories = await RetentionAttempt.getUniqueValues('reason_category');
    const reasonSubcategories = await RetentionAttempt.getUniqueValues('reason_subcategory');
    const attendants = await Attendant.listActive();

    return res.status(200).json({
      branches: branches.map(b => b.branch),
      reasonCategories: reasonCategories.map(r => r.reason_category),
      reasonSubcategories: reasonSubcategories.map(r => r.reason_subcategory),
      outcomes: OUTCOME_VALUES,
      callOrigins: CALL_ORIGIN_VALUES,
      interactionTypes: INTERACTION_TYPE_VALUES,
      attendants: attendants.map(att => ({ id: att.id, name: att.name }))
    });
  } catch (erro) {
    console.error('Erro ao obter metadata de retencao:', erro);
    return res.status(500).json({ erro: 'Erro ao obter metadados' });
  }
};

// GET /retention/dashboard - Retorna KPIs e dados para graficos do dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const filters = req.query; // Aplicar filtros (branch, attendant_id, etc.)

    const totalAttempts = await RetentionAttempt.count(filters);
    const totalCancellations = await RetentionAttempt.countCancellations(filters);
    const totalReversals = await RetentionAttempt.countReversals(filters);
    const retentionRate = calculateRetentionRate(totalAttempts, totalCancellations);

    const reasonsData = await RetentionAttempt.countByReasonCategory(filters);
    const outcomesData = await RetentionAttempt.countByOutcome(filters);
    const attemptsPerDayData = await RetentionAttempt.countAttemptsPerDay(filters);

    return res.status(200).json({
      kpis: {
        totalAttempts,
        totalCancellations,
        totalReversals,
        retentionRate: retentionRate.toFixed(2)
      },
      graphs: {
        reasons: reasonsData,
        outcomes: outcomesData,
        attemptsPerDay: attemptsPerDayData
      }
    });
  } catch (erro) {
    console.error('Erro ao obter dados do dashboard de retencao:', erro);
    return res.status(500).json({ erro: 'Erro ao obter dados do dashboard' });
  }
};

// GET /retention/leaderboard - Retorna dados para o leaderboard de atendentes
exports.getLeaderboardData = async (req, res) => {
  try {
    const filters = req.query;
    const leaderboard = await RetentionAttempt.countByAttendant(filters);

    const formattedLeaderboard = leaderboard.map(att => {
      const retentionRate = calculateRetentionRate(att.total_calls, att.total_calls - att.total_retentions);
      return {
        attendant_name: att.attendant_name,
        total_calls: att.total_calls,
        total_retentions: att.total_retentions,
        retention_rate: retentionRate.toFixed(2)
      };
    });

    return res.status(200).json({ leaderboard: formattedLeaderboard });
  } catch (erro) {
    console.error('Erro ao obter dados do leaderboard de retencao:', erro);
    return res.status(500).json({ erro: 'Erro ao obter dados do leaderboard' });
  }
};
