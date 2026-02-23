function calcularStatus(etapa, dias) {
  if (etapa === "Concluído") {
    return dias <= 3
      ? "Finalizado - com atraso"
      : "Finalizado - no prazo";
  }

  if (["Backlog", "Planejado", "Em Estruturação"].includes(etapa)) {
    return dias <= 3
      ? "Não iniciado - atrasado"
      : "Não iniciado - no prazo";
  }

  if (["Em Execução", "Travado", "Validação"].includes(etapa)) {
    return dias <= 3
      ? "Em andamento - atrasado"
      : "Em andamento - no prazo";
  }

  return "";
}

module.exports = calcularStatus;
