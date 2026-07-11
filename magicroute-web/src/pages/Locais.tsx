import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarLocais, adicionarLocal, editarLocal, excluirLocal } from '../services/api';
import { MapPin, Plus, Edit2, Trash2, Search, RefreshCw, Building2, CheckCircle, XCircle } from 'lucide-react';

interface Local {
  CodigoLocal: number;
  NomeLocal: string;
  TipoLocal: string;
  Endereco: string;
  Bairro: string;
  Cidade: string;
  UF: string;
  CEP: string;
  Pais: string;
  Latitude: number | null;
  Longitude: number | null;
  Observacoes: string;
  Ativo: boolean;
  DataCriacao: string;
}

const emptyLocal: Omit<Local, 'CodigoLocal' | 'DataCriacao'> = {
  NomeLocal: '',
  TipoLocal: 'Empresa',
  Endereco: '',
  Bairro: '',
  Cidade: '',
  UF: 'SP',
  CEP: '',
  Pais: 'Brasil',
  Latitude: null,
  Longitude: null,
  Observacoes: '',
  Ativo: true,
};

export default function Locais() {
  const { user } = useAuth();
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Local | null>(null);
  const [formData, setFormData] = useState(emptyLocal);
  const [cepLoading, setCepLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Local | null>(null);

  const fetchLocais = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listarLocais(user.idEmpresa);
      setLocais(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar locais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocais(); }, [user]);

  const buscarCoordenadas = async (enderecoBusca?: string) => {
    const addressToSearch = enderecoBusca || `${formData.Endereco}${formData.Cidade ? `, ${formData.Cidade}` : ''}${formData.UF ? ` - ${formData.UF}` : ''}, Brasil`;
    if (!addressToSearch || addressToSearch.length < 5) return;
    
    setGpsLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressToSearch)}&key=${apiKey}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setFormData(prev => ({
          ...prev,
          Latitude: location.lat,
          Longitude: location.lng
        }));
      } else if (!enderecoBusca) {
        alert('Coordenadas não encontradas para o endereço informado no Google Maps.');
      }
    } catch (err) {
      console.error('Erro ao buscar coordenadas no Google Maps:', err);
    } finally {
      setGpsLoading(false);
    }
  };

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          Endereco: data.logradouro || prev.Endereco,
          Bairro: data.bairro || prev.Bairro,
          Cidade: data.localidade || prev.Cidade,
          UF: data.uf || prev.UF,
        }));
        
        const enderecoAproximado = `${data.logradouro}, ${data.localidade} - ${data.uf}, Brasil`;
        await buscarCoordenadas(enderecoAproximado);
      }
    } catch {
      // silencioso
    } finally {
      setCepLoading(false);
    }
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData(emptyLocal);
    setShowModal(true);
  };

  const abrirEditar = (local: Local) => {
    setEditando(local);
    setFormData({
      NomeLocal: local.NomeLocal,
      TipoLocal: local.TipoLocal || 'Empresa',
      Endereco: local.Endereco || '',
      Bairro: local.Bairro || '',
      Cidade: local.Cidade || '',
      UF: local.UF || 'SP',
      CEP: local.CEP || '',
      Pais: local.Pais || 'Brasil',
      Latitude: local.Latitude,
      Longitude: local.Longitude,
      Observacoes: local.Observacoes || '',
      Ativo: local.Ativo !== false,
    });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!formData.NomeLocal.trim()) return alert('Nome do Local é obrigatório.');
    if (!user) return;
    setSaving(true);
    try {
      if (editando) {
        await editarLocal({ IdEmpresa: user.idEmpresa, CodigoLocal: editando.CodigoLocal, ...formData });
      } else {
        await adicionarLocal({ IdEmpresa: user.idEmpresa, UsuarioCriacao: user.codigo || '', ...formData });
      }
      setShowModal(false);
      fetchLocais();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (local: Local) => {
    if (!user) return;
    try {
      await excluirLocal({ IdEmpresa: user.idEmpresa, CodigoLocal: local.CodigoLocal });
      setConfirmDelete(null);
      fetchLocais();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filtered = locais.filter(l =>
    !busca ||
    l.NomeLocal.toLowerCase().includes(busca.toLowerCase()) ||
    (l.Cidade || '').toLowerCase().includes(busca.toLowerCase()) ||
    (l.Endereco || '').toLowerCase().includes(busca.toLowerCase())
  );

  const totalAtivos = locais.filter(l => l.Ativo !== false).length;
  const totalInativos = locais.filter(l => l.Ativo === false).length;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#1e293b',
    background: '#fff',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Locais / Unidades</h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0' }}>Gerencie os locais de saída e retorno dos motoristas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchLocais} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={abrirNovo} style={{ background: 'linear-gradient(135deg, #8c2cf5, #6d28d9)', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(140,44,245,0.3)' }}>
            <Plus size={16} /> Novo Local
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total de Locais', value: locais.length, color: '#8c2cf5', bg: '#f3f0ff', icon: <Building2 size={20} /> },
          { label: 'Ativos', value: totalAtivos, color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={20} /> },
          { label: 'Inativos', value: totalInativos, color: '#ef4444', bg: '#fef2f2', icon: <XCircle size={20} /> },
          { label: 'Com GPS', value: locais.filter(l => l.Latitude && l.Longitude).length, color: '#3b82f6', bg: '#eff6ff', icon: <MapPin size={20} /> },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 6px', textTransform: 'uppercase' }}>{card.label}</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{card.value}</h3>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #f1f5f9' }}>
        {/* Barra de busca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou endereço..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '38px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.9rem' }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {['Cód.', 'Nome / Tipo', 'Endereço', 'Cidade / UF', 'GPS', 'Situação', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '12px 10px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                      {busca ? 'Nenhum local encontrado para a busca.' : 'Nenhum local cadastrado ainda. Clique em "Novo Local" para começar.'}
                    </td>
                  </tr>
                ) : filtered.map(local => (
                  <tr key={local.CodigoLocal} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 10px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>#{local.CodigoLocal}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{local.NomeLocal}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#8c2cf5', fontWeight: 600 }}>{local.TipoLocal || '—'}</p>
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: '0.8rem', color: '#475569', maxWidth: '200px' }}>
                      {local.Endereco ? `${local.Endereco}${local.Bairro ? ', ' + local.Bairro : ''}` : '—'}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {local.Cidade ? `${local.Cidade} / ${local.UF}` : '—'}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      {local.Latitude && local.Longitude ? (
                        <span style={{ background: '#eff6ff', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px' }}>
                          📍 {Number(local.Latitude).toFixed(4)}, {Number(local.Longitude).toFixed(4)}
                        </span>
                      ) : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Sem GPS</span>}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      <span style={{
                        background: local.Ativo !== false ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: local.Ativo !== false ? '#16a34a' : '#dc2626',
                        fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px'
                      }}>
                        {local.Ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => abrirEditar(local)} style={{ background: '#f3f0ff', border: 'none', color: '#8c2cf5', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          <Edit2 size={12} /> Editar
                        </button>
                        <button onClick={() => setConfirmDelete(local)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Adicionar / Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            {/* Header modal */}
            <div style={{ padding: '24px 28px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                    {editando ? 'Editar Local' : 'Novo Local'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {editando ? `Editando: ${editando.NomeLocal}` : 'Preencha os dados do novo local/unidade'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>✕ Fechar</button>
              </div>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nome e Tipo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nome do Local *</label>
                  <input style={inputStyle} value={formData.NomeLocal} onChange={e => setFormData(p => ({ ...p, NomeLocal: e.target.value }))} placeholder="Ex: Base Central" />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select style={inputStyle} value={formData.TipoLocal} onChange={e => setFormData(p => ({ ...p, TipoLocal: e.target.value }))}>
                    <option value="Empresa">Empresa</option>
                    <option value="Filial">Filial</option>
                    <option value="Depósito">Depósito</option>
                    <option value="Centro de Distribuição">Centro de Distribuição</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* CEP com busca automática */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>CEP{cepLoading ? ' (buscando...)' : ''}</label>
                  <input
                    style={inputStyle}
                    value={formData.CEP}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(p => ({ ...p, CEP: val }));
                      if (val.replace(/\D/g, '').length === 8) buscarCEP(val);
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Endereço</label>
                  <input style={inputStyle} value={formData.Endereco} onChange={e => setFormData(p => ({ ...p, Endereco: e.target.value }))} placeholder="Rua, número, complemento" />
                </div>
              </div>

              {/* Bairro, Cidade, UF */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Bairro</label>
                  <input style={inputStyle} value={formData.Bairro} onChange={e => setFormData(p => ({ ...p, Bairro: e.target.value }))} placeholder="Bairro" />
                </div>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input style={inputStyle} value={formData.Cidade} onChange={e => setFormData(p => ({ ...p, Cidade: e.target.value }))} placeholder="Cidade" />
                </div>
                <div>
                  <label style={labelStyle}>UF</label>
                  <input style={inputStyle} value={formData.UF} onChange={e => setFormData(p => ({ ...p, UF: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} />
                </div>
              </div>

              {/* Latitude e Longitude */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Coordenadas GPS</label>
                  <button 
                    onClick={() => buscarCoordenadas()} 
                    disabled={gpsLoading}
                    style={{ background: '#f3f0ff', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#8c2cf5', fontWeight: 700, fontSize: '0.7rem', cursor: gpsLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <MapPin size={12} />
                    {gpsLoading ? 'Buscando...' : 'Buscar pelo Endereço'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input style={inputStyle} type="number" step="any" value={formData.Latitude ?? ''} onChange={e => setFormData(p => ({ ...p, Latitude: e.target.value ? Number(e.target.value) : null }))} placeholder="Latitude (Ex: -22.7553)" />
                  <input style={inputStyle} type="number" step="any" value={formData.Longitude ?? ''} onChange={e => setFormData(p => ({ ...p, Longitude: e.target.value ? Number(e.target.value) : null }))} placeholder="Longitude (Ex: -47.6508)" />
                </div>
              </div>

              {/* Observações e Situação */}
              <div>
                <label style={labelStyle}>Observações</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} value={formData.Observacoes} onChange={e => setFormData(p => ({ ...p, Observacoes: e.target.value }))} placeholder="Observações opcionais" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="chkAtivo"
                  type="checkbox"
                  checked={formData.Ativo}
                  onChange={e => setFormData(p => ({ ...p, Ativo: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#8c2cf5' }}
                />
                <label htmlFor="chkAtivo" style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Local ativo</label>
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Cancelar</button>
                <button
                  onClick={salvar}
                  disabled={saving}
                  style={{ background: saving ? '#d1d5db' : 'linear-gradient(135deg, #8c2cf5, #6d28d9)', border: 'none', borderRadius: '10px', padding: '10px 28px', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', boxShadow: saving ? 'none' : '0 4px 12px rgba(140,44,245,0.3)' }}
                >
                  {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Adicionar Local'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação de exclusão */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '420px', padding: '28px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={24} color="#ef4444" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Excluir Local?</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                Tem certeza que deseja excluir <strong>{confirmDelete.NomeLocal}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', width: '100%' }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '10px', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => excluir(confirmDelete)} style={{ flex: 1, background: '#ef4444', border: 'none', borderRadius: '10px', padding: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
