import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buscarEmpresaPorCNPJ, loginUsuario } from '../services/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tipoPessoa, setTipoPessoa] = useState('Motorista');
  const [cnpj, setCnpj] = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);

  // Formatar CNPJ
  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})/, '$1.')
      .replace(/^(\d{2})\.(\d{3})/, '$1.$2.')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})/, '$1.$2.$3/')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})/, '$1.$2.$3/$4-');
  };

  const handleCNPJChange = async (value: string) => {
    setCnpj(value);
    setEmpresaInfo(null);
    setError('');

    const cleanValue = value.trim();
    if (cleanValue.length >= 2) {
      try {
        let result = await buscarEmpresaPorCNPJ(cleanValue);
        if (result && result.length > 0 && result[0].IDEmpresa) {
          setEmpresaInfo(result[0]);
          return;
        }

        const digitsOnly = cleanValue.replace(/\D/g, '');
        if (digitsOnly && digitsOnly !== cleanValue) {
          result = await buscarEmpresaPorCNPJ(digitsOnly);
          if (result && result.length > 0 && result[0].IDEmpresa) {
            setEmpresaInfo(result[0]);
            return;
          }
        }

        const formatted = formatCNPJ(cleanValue);
        if (formatted && formatted !== cleanValue && formatted !== digitsOnly) {
          result = await buscarEmpresaPorCNPJ(formatted);
          if (result && result.length > 0 && result[0].IDEmpresa) {
            setEmpresaInfo(result[0]);
            return;
          }
        }
      } catch {
        // Ignora erros
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    let info = empresaInfo;

    if (!info && cnpj.trim()) {
      setLoading(true);
      try {
        const cleanValue = cnpj.trim();
        let result = await buscarEmpresaPorCNPJ(cleanValue);
        if (result && result.length > 0 && result[0].IDEmpresa) {
          info = result[0];
        } else {
          const digitsOnly = cleanValue.replace(/\D/g, '');
          result = await buscarEmpresaPorCNPJ(digitsOnly);
          if (result && result.length > 0 && result[0].IDEmpresa) {
            info = result[0];
          }
        }
      } catch {
        // erro
      } finally {
        setLoading(false);
      }
    }

    if (!info) {
      setError('Informe um CNPJ válido primeiro.');
      return;
    }

    if (!codigo || !senha) {
      setError('Preencha código e senha.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginUsuario(
        String(info.IDEmpresa),
        tipoPessoa,
        codigo,
        senha
      );

      if (result && result.length > 0) {
        const dbTipo = result[0].TipoPessoa || result[0].tipopessoa || (tipoPessoa === 'Administrador' ? 'A' : 'M');
        login({
          idEmpresa: String(info.IDEmpresa),
          nomeEmpresa: info.NomeEmpresa || info.Empresa || 'Empresa',
          cnpj: cnpj,
          urlApi: info.UrlAPI || '',
          tipoPessoa: dbTipo,
          tipoPessoaAtivo: tipoPessoa,
          codigo: String(result[0].Codigo || codigo),
          nomeUsuario: result[0].Nome || result[0].Motorista || 'Usuário',
        });
        const targetPath = tipoPessoa === 'Motorista' ? '/inicio' : '/dashboard';
        navigate(targetPath);
      } else {
        setError('Código ou senha inválidos.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#f8f9fe',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
    }}>
      {/* Card de Login Limpo (Sem moldura de plástico) */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(140, 44, 245, 0.08)',
        border: '1.5px solid #eaeaea',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 28px',
      }}>
        {/* Logo MagicRoute (Roxo com linha, igual à Imagem 1) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              <path d="M50,15 C35,15 25,27 25,40 C25,58 50,85 50,85 C50,85 75,58 75,40 C75,27 65,15 50,15 Z" fill="none" stroke="#8c2cf5" strokeWidth="6" />
              <circle cx="50" cy="40" r="12" fill="#8c2cf5" />
              <path d="M20,80 C35,65 65,95 80,80" fill="none" stroke="#8c2cf5" strokeWidth="5" strokeLinecap="round" />
              <circle cx="20" cy="80" r="5" fill="#8c2cf5" />
              <circle cx="80" cy="80" r="5" fill="#8c2cf5" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: '500',
          color: '#333',
          marginBottom: '32px',
          fontFamily: 'sans-serif'
        }}>
          Login
        </h2>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tipo de acesso */}
          <div style={{ position: 'relative' }}>
            <select
              value={tipoPessoa}
              onChange={(e) => setTipoPessoa(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '2px solid #8c2cf5', // Roxo conforme imagem
                background: '#ffffff',
                fontSize: '1rem',
                color: '#495057',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="Motorista">Motorista</option>
              <option value="Administrador">Administrador</option>
            </select>
            <div style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #8c2cf5',
            }} />
          </div>

          {/* CNPJ */}
          <div>
            <input
              type="text"
              placeholder="Informe o CNPJ"
              value={cnpj}
              onChange={(e) => handleCNPJChange(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '1.5px solid #ced4da',
                fontSize: '1rem',
                outline: 'none',
                color: '#495057',
              }}
            />
            {empresaInfo && (
              <p style={{
                fontSize: '0.8rem',
                color: '#28a745',
                marginTop: '6px',
                paddingLeft: '4px',
                fontWeight: 600
              }}>
                ✓ {empresaInfo.NomeEmpresa || empresaInfo.Empresa}
              </p>
            )}
          </div>

          {/* Código e Senha em linha (Imagem 1) */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Código menor */}
            <div style={{ width: '100px', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1.5px solid #ced4da',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#495057',
                  textAlign: 'center',
                }}
              />
            </div>

            {/* Senha */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Informe sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 44px 16px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #ced4da',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#495057',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#6c757d',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{
              color: '#dc3545',
              fontSize: '0.85rem',
              padding: '10px 14px',
              background: '#f8d7da',
              borderRadius: '8px',
              border: '1px solid #f5c6cb',
              margin: '4px 0 0 0',
            }}>
              {error}
            </p>
          )}

          {/* Mantenha-me conectado + Botão de Entrar alinhado à direita */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px'
          }}>
            {/* Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#6c757d' }}>
              <input
                type="checkbox"
                defaultChecked
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#8c2cf5',
                  cursor: 'pointer',
                }}
              />
              Mantenha-me Conectado
            </label>

            {/* Botão Entrar Roxo */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#8c2cf5',
                color: '#ffffff',
                border: 'none',
                padding: '12px 36px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(140, 44, 245, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                'Entrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
