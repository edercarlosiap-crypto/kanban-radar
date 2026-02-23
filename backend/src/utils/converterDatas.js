// backend/src/utils/converterDatas.js

exports.converterData = (data) => {
  if (data === null || data === undefined || data === '') return null;

  let d;
  // Se for um número, assume que é um número de série do Excel
  if (typeof data === 'number') {
    // A data de referência do Excel (1900-01-01) é dia 1. JS Date (1970-01-01) é dia 0.
    // Adiciona 25569 (diferença entre 1900-01-01 e 1970-01-01 em dias + ajuste)
    // Multiplica por 86400000 (milissegundos em um dia)
    d = new Date(Math.round((data - 25569) * 86400 * 1000));
  } else {
    // Tenta parsear como string de data
    d = new Date(data);
  }

  if (isNaN(d.getTime())) {
    console.error(`Erro de conversão de data: '${data}' não é uma data válida.`);
    return null; // Data inválida
  }

  return d.toISOString().split('T')[0]; // Retorna YYYY-MM-DD
};
