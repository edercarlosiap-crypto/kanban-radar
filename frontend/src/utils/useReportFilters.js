import { useEffect, useState } from 'react';

const STORAGE_KEY = 'relatoriosFiltros';

const carregarFiltros = () => {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) return { camada: '', diretoria: '', responsavel: '', status: 'todos' };
    return { camada: '', diretoria: '', responsavel: '', status: 'todos', ...JSON.parse(salvo) };
  } catch {
    return { camada: '', diretoria: '', responsavel: '', status: 'todos' };
  }
};

export default function useReportFilters() {
  const [filtros, setFiltros] = useState(carregarFiltros);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtros));
  }, [filtros]);

  return { filtros, setFiltros };
}
