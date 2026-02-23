import { useState } from "react";
import "./TooltipInfo.css";

export default function TooltipInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div 
      className="info-container"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(!open)}
    >
      <span className="info-icon">ℹ️</span>

      {open && (
        <div className="info-box">
          <h3>Fluxo do Radar Estratégico</h3>
          <ul>
            <li><b>Backlog:</b> Ideias e demandas ainda não estruturadas</li>
            <li><b>Planejado:</b> Projeto aprovado, mas sem detalhamento</li>
            <li><b>Em Estruturação:</b> Definição de escopo, responsáveis e prazos</li>
            <li><b>Em Execução:</b> Trabalho em andamento</li>
            <li><b>Travado:</b> Execução interrompida por impedimento</li>
            <li><b>Validação:</b> Entregue, aguardando aprovação</li>
            <li><b>Concluído:</b> Finalizado e validado</li>
          </ul>
        </div>
      )}
    </div>
  );
}
