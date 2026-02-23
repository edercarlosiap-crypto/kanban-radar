import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { radarAPI } from '../services/api';
import LogoImage from '../components/LogoImage';

// Função auxiliar para normalizar nomes de colunas (mesma lógica do backend)
function normalizeColumnName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '') // Remove caracteres especiais, mantém espaços
    .toLowerCase() // Converte para minúsculas
    .replace(/ (\w)/g, (match, p1) => p1.toUpperCase()); // Converte a primeira letra de cada palavra após um espaço para maiúscula (camelCase)
}

export default function ImportarExcel() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canImportar = ['gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';
  const [etapa, setEtapa] = useState('upload'); // upload, mapeamento, importando
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState('success');
  const fileInputRef = useRef();

  // Estado para mapeamento
  const [colunasDisponiveis, setColunasDisponiveis] = useState([]);
  const [camposEsperados, setCamposEsperados] = useState([]);
  const [preview, setPreview] = useState([]);
  const [totalLinhas, setTotalLinhas] = useState(0);
  const [mapeamento, setMapeamento] = useState({});

  const handleArquivoSelecionado = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setArquivo(file);
        setMensagem('');
      } else {
        setMensagem('Por favor, selecione um arquivo .xlsx ou .xls');
        setTipo('error');
      }
    }
  };

  const handleAnalisarArquivo = async () => {
    if (!arquivo) {
      setMensagem('Selecione um arquivo para continuar');
      setTipo('error');
      return;
    }

    setCarregando(true);
    setMensagem('');

    try {
      const response = await radarAPI.prepararImportacao(arquivo);
      
      const { camposEsperados, preview, totalLinhas, originalHeaders } = response.data;

      setColunasDisponiveis(originalHeaders); // Agora colunasDisponiveis no frontend são os nomes originais do Excel
      setCamposEsperados(camposEsperados);
      setPreview(preview);
      setTotalLinhas(totalLinhas);

      // Cria mapeamento automático (tenta corresponder campos esperados com nomes ORIGINAIS do Excel)
      const mapAuto = {};
      for (const campo of camposEsperados) {
        // Tentar mapear campos esperados com os nomes originais dos cabeçalhos do Excel
        const originalHeaderMatch = originalHeaders.find(originalCol => normalizeColumnName(originalCol) === normalizeColumnName(campo.descricao) ||
                                                                      normalizeColumnName(originalCol) === normalizeColumnName(campo.campo));
        
        if (originalHeaderMatch) {
          mapAuto[campo.campo] = originalHeaderMatch; // Armazenar o nome ORIGINAL para enviar ao backend
        }
      }

      setMapeamento(mapAuto);
      setMapeamento(mapAuto);
      setEtapa('mapeamento');
      setMensagem(`✓ Arquivo analisado! ${totalLinhas} linhas encontradas.`);
      setTipo('success');
    } catch (erro) {
      setMensagem(erro.response?.data?.erro || 'Erro ao analisar arquivo');
      setTipo('error');
    } finally {
      setCarregando(false);
    }
  };

  const handleMudancaMapeamento = (campo, coluna) => {
    setMapeamento(prev => ({
      ...prev,
      [campo]: coluna === '' ? null : coluna // Armazena o nome original da coluna do Excel
    }));
  };

  const handleImportar = async () => {
    // Valida se todos os campos obrigatórios foram mapeados
    const camposObrigatorios = camposEsperados.filter(c => c.obrigatorio);
    for (const campo of camposObrigatorios) {
      if (!mapeamento[campo.campo]) {
        setMensagem(`❌ Campo obrigatório "${campo.descricao}" não mapeado`);
        setTipo('error');
        return;
      }
    }

    setCarregando(true);
    setMensagem('');
    setEtapa('importando');

    try {
      const response = await radarAPI.importarExcel(arquivo, mapeamento);

      const errosText = response.data.erros ? `\n❌ Erros: ${response.data.erros.join('; ')}` : '';
      setMensagem(
        `✓ Importação concluída! ${response.data.itensImportados} itens importados.${errosText}`
      );
      setTipo('success');

      // Limpa dados
      setArquivo(null);
      setEtapa('upload');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Redireciona para o radar em 2 segundos
      setTimeout(() => {
        navigate('/radar');
      }, 2000);
    } catch (erro) {
      setMensagem(erro.response?.data?.erro || 'Erro ao importar arquivo');
      setTipo('error');
      setEtapa('mapeamento');
    } finally {
      setCarregando(false);
    }
  };

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  if (!canImportar) {
    return (
      <div className="app-layout">
        <div className="loading">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚫</div>
            <h2>Acesso Restrito</h2>
            <p style={{ marginTop: '16px', color: '#8E8E93' }}>
              Seu perfil não permite importação de Excel. É necessário perfil gestor ou admin.
            </p>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn btn-primary"
              style={{ marginTop: '24px' }}
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <LogoImage size={32} />
          <h1 style={{ margin: 0, fontSize: '22px' }}>Radar PRO</h1>
        </div>
        
        <nav>
          <a onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </a>
          <a onClick={() => navigate('/radar')}>
            📈 Radar
          </a>
          <a onClick={() => navigate('/kanban')}>
            🎯 Kanban
          </a>
          <a onClick={() => navigate('/relatorios/visao-geral')}>
            📑 Relatórios
          </a>
          <a onClick={() => navigate('/importar')} className="active">
            📥 Importar Excel
          </a>
          {isAdmin && (
            <a onClick={() => navigate('/admin/usuarios')}>
              👥 Usuários
            </a>
          )}
        </nav>

        <div style={{ 
          marginTop: '32px', 
          padding: '16px', 
          background: 'rgba(0, 122, 255, 0.08)',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>👤 {usuario.nome}</div>
          <small style={{ color: '#8E8E93' }}>{usuario.email}</small>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#007AFF' }}>
            {perfil.toUpperCase()}
          </div>
        </div>

        <button onClick={sairDoSistema} className="logout-btn">
          🚪 Sair
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <LogoImage size={42} />
            <div>
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Importar Excel Inteligente</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Sistema detecta colunas automaticamente e você escolhe o mapeamento</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>

          {/* ETAPA 1: UPLOAD E PREVIEW */}
          {etapa === 'upload' && (
            <>
              <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{
                  border: '3px dashed var(--primary)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '60px 40px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, var(--primary-light) 0%, white 100%)',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
                  <h2 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Etapa 1: Selecionar Arquivo
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Selecione um arquivo .xlsx ou .xls para importar
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleArquivoSelecionado}
                    style={{ display: 'none' }}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary btn-lg"
                  >
                    📁 Selecionar Arquivo
                  </button>

                  {arquivo && (
                    <div className="alert alert-success" style={{ marginTop: '20px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                      ✓ {arquivo.name}
                    </div>
                  )}
                </div>

                {mensagem && (
                  <div className={`alert ${tipo === 'success' ? 'alert-success' : 'alert-danger'}`}>
                    {mensagem}
                  </div>
                )}

                <button
                  onClick={handleAnalisarArquivo}
                  disabled={!arquivo || carregando}
                  className="btn btn-primary btn-lg"
                  style={{ 
                    width: '100%',
                    opacity: !arquivo || carregando ? 0.6 : 1,
                    cursor: !arquivo || carregando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {carregando ? '⏳ Analisando...' : '→ Próximo: Mapear Colunas'}
                </button>
              </div>

              {/* Instruções */}
              <div className="glass-card" style={{ padding: '28px' }}>
                <h3 className="card-title" style={{ marginBottom: '20px' }}>📋 Como funciona</h3>
                <ul style={{ 
                  marginTop: '12px', 
                  paddingLeft: '20px',
                  lineHeight: '1.8',
                  color: 'var(--text-secondary)'
                }}>
                  <li>✓ Suporte para planilhas com <strong>qualquer número de colunas</strong></li>
                  <li>✓ Sistema <strong>detecta automaticamente</strong> as colunas</li>
                  <li>✓ Você <strong>escolhe o mapeamento</strong> na próxima etapa</li>
                  <li>✓ Importação com <strong>validação de dados</strong></li>
                  <li>✓ Relatório de <strong>erros por linha</strong></li>
                </ul>
              </div>
            </>
          )}

          {/* ETAPA 2: MAPEAMENTO */}
          {etapa === 'mapeamento' && (
            <div className="glass-card" style={{ padding: '32px' }}>
              <h2 className="card-title" style={{ marginBottom: '12px' }}>
                Etapa 2: Mapear Colunas
              </h2>
              <p style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Associe cada coluna da sua planilha com os campos do sistema
              </p>
              <p className="text-tertiary" style={{ fontSize: '13px', marginBottom: '24px' }}>
                {totalLinhas} linhas de dados encontradas. Preview das 3 primeiras:
              </p>

              {/* Preview */}
              <div style={{
                marginBottom: '32px',
                overflowX: 'auto',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--background-secondary)',
              }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {colunasDisponiveis.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((linha, idx) => (
                      <tr key={idx}>
                        {Object.keys(linha).map(normalizedColName => (
                          <td key={`${idx}-${normalizedColName}`}>
                            {String(linha[normalizedColName] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mapeamento */}
              <div className="form-grid" style={{ marginBottom: '24px' }}>
                {camposEsperados.map(campo => (
                  <div key={campo.campo} className="form-group">
                    <label className="form-label">
                      {campo.descricao}
                      {campo.obrigatorio && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
                    </label>
                    <select
                      className="form-select"
                      value={mapeamento[campo.campo] || ''}
                      onChange={(e) => handleMudancaMapeamento(campo.campo, e.target.value)}
                    >
                      <option value="">-- Não mapear --</option>
                      {colunasDisponiveis.map(col => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {mensagem && (
                <div className={`alert ${tipo === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '24px' }}>
                  {mensagem}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setEtapa('upload');
                    setColunasDisponiveis([]);
                    setCamposEsperados([]);
                    setPreview([]);
                    setMapeamento({});
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleImportar}
                  disabled={carregando}
                  className="btn btn-success btn-lg"
                  style={{ 
                    flex: 2,
                    opacity: carregando ? 0.6 : 1,
                    cursor: carregando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {carregando ? '⏳ Importando...' : '✓ Importar Agora'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
