import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import '../App.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [abaSelecionada, setAbaSelecionada] = useState('login'); // login ou registro
  const navigate = useNavigate();

  // Estado para registro
  const [nome, setNome] = useState('');
  const [senhaConfirm, setSenhaConfirm] = useState('');

  // Função para fazer login
  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    setMensagem('');

    try {
      const response = await authAPI.login(email, senha);

      // Armazena o token no localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));

      // Redireciona para o dashboard
      navigate('/dashboard');
    } catch (erro) {
      setErro(erro.response?.data?.erro || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  };

  // Função para registrar
  const handleRegistro = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    setMensagem('');

    try {
      const response = await authAPI.register(nome, email, senha, senhaConfirm);
      setErro('');
      setMensagem(response.data?.mensagem || 'Cadastro realizado com sucesso. Aguarde aprovacao do administrador.');
      setAbaSelecionada('login');
      setNome('');
      setEmail('');
      setSenha('');
      setSenhaConfirm('');
    } catch (erro) {
      setErro(erro.response?.data?.erro || 'Erro ao registrar');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <LogoImage size={48} />
            <h1 style={styles.titulo}>Radar Estratégico PRO</h1>
          </div>
          <p style={styles.subtitulo}>Sistema de Controle de Projetos</p>
        </div>

        {erro && (
          <div style={styles.alert}>
            <strong>⚠️ Erro:</strong> {erro}
          </div>
        )}

        {mensagem && (
          <div style={{ ...styles.alert, background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}>
            <strong>✅ Ok:</strong> {mensagem}
          </div>
        )}

        {/* Abas */}
        <div className="auth-tabs">
          <button
            onClick={() => {
              setAbaSelecionada('login');
              setErro('');
            }}
            className={`auth-tab-btn ${abaSelecionada === 'login' ? 'active' : ''}`}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setAbaSelecionada('registro');
              setErro('');
              setMensagem('');
            }}
            className={`auth-tab-btn ${abaSelecionada === 'registro' ? 'active' : ''}`}
          >
            Registrar
          </button>
        </div>

        {/* Formulário de Login */}
        {abaSelecionada === 'login' && (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={styles.btnSubmit}
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Formulário de Registro */}
        {abaSelecionada === 'registro' && (
          <form onSubmit={handleRegistro} style={styles.form}>
            <div style={styles.formGroup}>
              <label>Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label>Confirmar Senha</label>
              <input
                type="password"
                value={senhaConfirm}
                onChange={(e) => setSenhaConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={styles.btnSubmit}
            >
              {carregando ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
        )}

        <p style={styles.info}>
          💡 Sistema interno de controle de projetos e iniciativas estratégicas
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  titulo: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '8px',
  },
  subtitulo: {
    fontSize: '14px',
    color: '#64748b',
  },
  alert: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
    color: '#991b1b',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#1e293b',
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  btnSubmit: {
    minHeight: '44px',
    padding: '10px 16px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '13px',
    color: '#64748b',
  },
};
