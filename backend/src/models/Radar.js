// ===================================================================
// MODELO DE RADAR ESTRATEGICO
// ===================================================================
// Funcoes para gerenciar itens do radar no banco de dados

const { db_run, db_get, db_all } = require('../config/database');

class Radar {
  static calcularStatusRadar(diasRestantes, kanban) {
    if (kanban === 'Concluído') return 'Concluído';
    if (['Backlog', 'Planejado', 'Em Estruturação'].includes(kanban)) return 'Não iniciado';
    if (['Em Execução', 'Travado', 'Validação'].includes(kanban)) return 'Em andamento';
    return 'Não definido';
  }

  static calcularIndicador(diasRestantes, kanban) {
    if (kanban === 'Concluído') return 'verde';
    if (diasRestantes < 0) return 'vermelho-atrasado';
    if (diasRestantes >= 0 && diasRestantes <= 3) return 'vermelho';
    if (diasRestantes > 3 && diasRestantes <= 7) return 'amarelo';
    if (diasRestantes > 7) return 'verde';
    return 'neutro';
  }

  static async criar(dados, usuarioId) {
    try {
      const {
        dataCriacao,
        camada,
        prioridade,
        tipo,
        acao,
        equipe,
        responsavel,
        concluirAte,
        kanban = 'Backlog',
        status = '',
        observacao = '',
        linkBitrix = ''
      } = dados;

      const result = await db_run(
        `INSERT INTO radar (
          dataCriacao, camada, prioridade, tipo, acao,
          equipe, responsavel, concluirAte, kanban, status,
          observacao, linkBitrix, usuarioId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dataCriacao,
          camada,
          prioridade,
          tipo,
          acao,
          equipe,
          responsavel,
          concluirAte,
          kanban,
          status,
          observacao,
          linkBitrix,
          usuarioId
        ]
      );

      return result.id;
    } catch (erro) {
      throw erro;
    }
  }

  // Mantido nome para compatibilidade; agora retorna visao global
  static async listarPorUsuario() {
    try {
      const itens = await db_all('SELECT * FROM radar ORDER BY concluirAte ASC');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      return itens.map((item) => {
        const dataConclui = new Date(item.concluirAte);
        const diasRestantes = Math.floor((dataConclui - hoje) / (1000 * 60 * 60 * 24));

        return {
          ...item,
          diasRestantes,
          indicador: this.calcularIndicador(diasRestantes, item.kanban),
          statusRadar: this.calcularStatusRadar(diasRestantes, item.kanban)
        };
      });
    } catch (erro) {
      throw erro;
    }
  }

  static async buscarPorId(id) {
    try {
      const item = await db_get('SELECT * FROM radar WHERE id = ?', [id]);

      if (item) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataConclui = new Date(item.concluirAte);
        const diasRestantes = Math.floor((dataConclui - hoje) / (1000 * 60 * 60 * 24));

        item.diasRestantes = diasRestantes;
        item.indicador = this.calcularIndicador(diasRestantes, item.kanban);
        item.statusRadar = this.calcularStatusRadar(diasRestantes, item.kanban);
      }

      return item;
    } catch (erro) {
      throw erro;
    }
  }

  static async atualizar(id, dados) {
    try {
      const camposPermitidos = [
        'camada', 'prioridade', 'tipo', 'acao', 'equipe',
        'responsavel', 'concluirAte', 'kanban', 'status', 'observacao', 'linkBitrix'
      ];

      const campos = [];
      const valores = [];

      for (const [chave, valor] of Object.entries(dados)) {
        if (camposPermitidos.includes(chave)) {
          campos.push(`${chave} = ?`);
          valores.push(valor);
        }
      }

      if (campos.length === 0) {
        await db_run('UPDATE radar SET dataAtualizacao = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        return true;
      }

      campos.push('dataAtualizacao = CURRENT_TIMESTAMP');
      valores.push(id);

      const query = `UPDATE radar SET ${campos.join(', ')} WHERE id = ?`;
      await db_run(query, valores);

      return true;
    } catch (erro) {
      throw erro;
    }
  }

  static async deletar(id) {
    try {
      await db_run('DELETE FROM radar WHERE id = ?', [id]);
      return true;
    } catch (erro) {
      throw erro;
    }
  }

  static async deletarTodos() {
    try {
      const row = await db_get('SELECT COUNT(*) as total FROM radar', []);
      const total = row ? row.total : 0;

      if (total > 0) {
        await db_run('DELETE FROM radar', []);
      }

      return total;
    } catch (erro) {
      throw erro;
    }
  }

  static async obterEstatisticas() {
    try {
      const itens = await this.listarPorUsuario();

      const total = itens.length;
      const concluidos = itens.filter((i) => i.kanban === 'Concluído').length;
      const criticos = itens.filter((i) => i.indicador === 'vermelho' || i.indicador === 'vermelho-atrasado').length;
      const atrasados = itens.filter((i) => i.diasRestantes < 0).length;

      return {
        total,
        concluidos,
        criticos,
        atrasados
      };
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = Radar;
