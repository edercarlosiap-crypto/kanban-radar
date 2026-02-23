// ===================================================================
// SCRIPT PARA INSERIR DADOS DE EXEMPLO PARA O CRM DE RETENCAO
// ===================================================================

require('dotenv').config();
const Attendant = require('../src/models/Attendant');
const RetentionAttempt = require('../src/models/RetentionAttempt');
const { db } = require('../src/config/database'); // Para fechar a conexao
const { v4: uuidv4 } = require('uuid');

const seed = async () => {
  console.log('Iniciando o seeding de dados de retencao...');

  try {
    // === 1. Criar atendentes de exemplo ===
    const attendant1Id = uuidv4();
    const attendant2Id = uuidv4();
    const attendant3Id = uuidv4();

    console.log('Criando atendentes...');
    await Attendant.create(attendant1Id, 'Thaynna P.');
    await Attendant.create(attendant2Id, 'Caio S.');
    await Attendant.create(attendant3Id, 'Mariana R.');
    console.log('Atendentes criados.');

    // === 2. Inserir tentativas de retencao de exemplo ===
    console.log('Inserindo tentativas de retencao...');

    const attempts = [
      // PERDA: Thaynna -> Mudanca e Viabilidade -> Mudanca sem cobertura -> Cancelamento Efetivado
      {
        attendant_id: attendant1Id,
        attendant_name: 'Thaynna P.',
        customer_id: 1001,
        customer_name: 'Cliente Alfa',
        branch: 'Matriz',
        contract_id: 12345,
        previous_calls_3_months: true,
        previous_call_count: 2,
        call_origin: 'Interno',
        reason_category: 'Mudanca e Viabilidade',
        reason_subcategory: 'Mudanca sem cobertura',
        interaction_type: 'Phone',
        has_fine: false,
        outcome: 'Cancelamento Efetivado',
        notes: 'Cliente se mudou para area sem cobertura. Tentativa de reversao sem sucesso.'
      },
      // GANHO: Caio -> Motivos Financeiros -> Corte de gastos -> Reversao (Desconto)
      {
        attendant_id: attendant2Id,
        attendant_name: 'Caio S.',
        customer_id: 1002,
        customer_name: 'Cliente Beta',
        branch: 'Filial Centro',
        contract_id: 54321,
        previous_calls_3_months: true,
        previous_call_count: 1,
        call_origin: 'Externo',
        reason_category: 'Motivos Financeiros',
        reason_subcategory: 'Corte de gastos',
        interaction_type: 'WhatsApp',
        has_fine: true,
        outcome: 'Reversao (Desconto)',
        notes: 'Oferecido desconto de 15% por 6 meses. Cliente aceitou.'
      },
      // Outros cenarios
      {
        attendant_id: attendant3Id,
        attendant_name: 'Mariana R.',
        customer_id: 1003,
        customer_name: 'Cliente Gama',
        branch: 'Matriz',
        previous_calls_3_months: false,
        call_origin: 'Interno',
        reason_category: 'Qualidade do Servico',
        reason_subcategory: 'Lentidao na internet',
        interaction_type: 'Chat',
        has_fine: false,
        outcome: 'Reversao (Visita Tecnica)',
        notes: 'Agendado visita tecnica para resolver problema de lentidao.'
      },
      {
        attendant_id: attendant2Id,
        attendant_name: 'Caio S.',
        customer_id: 1004,
        customer_name: 'Cliente Delta',
        branch: 'Filial Sul',
        previous_calls_3_months: true,
        previous_call_count: 3,
        call_origin: 'Externo',
        reason_category: 'Insatisfacao Geral',
        reason_subcategory: 'Concorrencia mais barata',
        interaction_type: 'Phone',
        has_fine: true,
        outcome: 'Cancelamento Efetivado',
        notes: 'Cliente nao aceitou nenhuma oferta, migrou para concorrente.'
      },
      {
        attendant_id: attendant1Id,
        attendant_name: 'Thaynna P.',
        customer_id: 1005,
        customer_name: 'Cliente Epsilon',
        branch: 'Matriz',
        previous_calls_3_months: false,
        call_origin: 'Interno',
        reason_category: 'Mudanca e Viabilidade',
        reason_subcategory: 'Mudanca de cidade',
        interaction_type: 'Phone',
        has_fine: false,
        outcome: 'Titularidade',
        notes: 'Cliente transferiu a titularidade para o novo morador.'
      },
      {
        attendant_id: attendant2Id,
        attendant_name: 'Caio S.',
        customer_id: 1006,
        customer_name: 'Cliente Zeta',
        branch: 'Filial Centro',
        previous_calls_3_months: true,
        previous_call_count: 1,
        call_origin: 'Interno',
        reason_category: 'Motivos Financeiros',
        reason_subcategory: 'Aumento de mensalidade',
        interaction_type: 'WhatsApp',
        has_fine: false,
        outcome: 'Reversao (Downgrade)',
        notes: 'Cliente optou por plano mais barato.'
      },
      // Mais dados para diversificar
      {
        attendant_id: attendant1Id,
        attendant_name: 'Thaynna P.',
        customer_id: 1007,
        customer_name: 'Cliente Eta',
        branch: 'Filial Sul',
        call_origin: 'Externo',
        reason_category: 'Insatisfacao Geral',
        reason_subcategory: 'Atendimento ruim',
        interaction_type: 'Phone',
        outcome: 'Cancelamento Efetivado',
        created_at: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString()
      },
      {
        attendant_id: attendant3Id,
        attendant_name: 'Mariana R.',
        customer_id: 1008,
        customer_name: 'Cliente Theta',
        branch: 'Matriz',
        call_origin: 'Interno',
        reason_category: 'Outros',
        reason_subcategory: 'Falta de uso',
        interaction_type: 'Chat',
        outcome: 'Reversao (Desconto)',
        created_at: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString()
      },
      {
        attendant_id: attendant1Id,
        attendant_name: 'Thaynna P.',
        customer_id: 1009,
        customer_name: 'Cliente Iota',
        branch: 'Filial Centro',
        call_origin: 'Interno',
        reason_category: 'Mudanca e Viabilidade',
        reason_subcategory: 'Viagem longa',
        interaction_type: 'Phone',
        outcome: 'Reversao (Upgrade)',
        created_at: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString()
      },
      {
        attendant_id: attendant2Id,
        attendant_name: 'Caio S.',
        customer_id: 1010,
        customer_name: 'Cliente Kappa',
        branch: 'Matriz',
        call_origin: 'Externo',
        reason_category: 'Motivos Financeiros',
        reason_subcategory: 'Renegociacao',
        interaction_type: 'WhatsApp',
        outcome: 'Reversao (Desconto)',
        created_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString()
      },
    ];

    for (const attemptData of attempts) {
      // Garante que o created_at seja um ISO string formatado para SQLite
      if (!attemptData.created_at) {
        attemptData.created_at = new Date().toISOString();
      }
      // Converter booleanos para 0 ou 1
      attemptData.previous_calls_3_months = attemptData.previous_calls_3_months ? 1 : 0;
      attemptData.has_fine = attemptData.has_fine ? 1 : 0;

      const columns = Object.keys(attemptData).join(', ');
      const placeholders = Object.keys(attemptData).map(() => '?').join(', ');
      const values = Object.values(attemptData);

      await db_run(`INSERT INTO retention_attempts (${columns}) VALUES (${placeholders})`, values);
    }
    console.log(`Inseridas ${attempts.length} tentativas de retencao.`);

  } catch (err) {
    console.error('Erro durante o seeding de dados de retencao:', err);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Erro ao fechar o banco de dados:', err.message);
      } else {
        console.log('Conexao com o banco de dados fechada.');
      }
    });
  }
};

seed();
