import React from 'react';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // Se não tem token ou usuário, redireciona para login
  if (!token || !usuario.id) {
    return <Navigate to="/login" replace />;
  }

  // Se tem token e usuário, renderiza o componente filho
  return children;
}
