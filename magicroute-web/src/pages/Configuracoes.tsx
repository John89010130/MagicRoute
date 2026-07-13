import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buscarConfiguracoes, salvarConfiguracoes } from '../services/api';
import { Settings, Save, Loader2, Info } from 'lucide-react';

export default function Configuracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tempoAtendimento, setTempoAtendimento] = useState('');
  const [permiteRoteirizar, setPermiteRoteirizar] = useState(false);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      try {
        const config = await buscarConfiguracoes(user.idEmpresa);
        if (config && config.TempoAtendimentoPadrao !== undefined) {
          setTempoAtendimento(config.TempoAtendimentoPadrao.toString());
        }
        if (config && config.PermiteMotoristaRoteirizar !== undefined) {
          setPermiteRoteirizar(!!config.PermiteMotoristaRoteirizar);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSucesso('');
    try {
      await salvarConfiguracoes(user.idEmpresa, tempoAtendimento, permiteRoteirizar);
      setSucesso('Configurações updated successfully!');
      setTimeout(() => setSucesso(''), 3000);
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6c757d' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '12px' }}>
          <Settings size={24} color="#8c2cf5" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#212529', margin: 0 }}>Configurações Globais</h1>
          <p style={{ color: '#6c757d', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Gerencie os parâmetros padrões da sua empresa</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #eaeaea', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', marginBottom: '16px' }}>Roteirização e Entregas</h2>
        
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#495057', marginBottom: '8px' }}>
              Tempo Médio de Atendimento (minutos)
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="number" 
                min="0"
                step="1"
                required
                value={tempoAtendimento}
                onChange={(e) => setTempoAtendimento(e.target.value)}
                style={{
                  width: '120px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ced4da',
                  fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>minutos por parada</span>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
              <Info size={16} color="#4dabf7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0, lineHeight: 1.4 }}>
                Este tempo será somado a cada entrega para simular o tempo que o motorista gasta estacionando e entregando a mercadoria. 
                Você pode substituir esse valor individualmente dentro de cada Lote na tela de Entregas.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px', borderTop: '1px solid #f1f3f5', paddingTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600, color: '#495057', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={permiteRoteirizar}
                onChange={(e) => setPermiteRoteirizar(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#8c2cf5', cursor: 'pointer' }}
              />
              Habilitar Roteirização para Motoristas
            </label>
            <p style={{ fontSize: '0.8rem', color: '#6c757d', margin: '4px 0 0 28px', lineHeight: 1.4 }}>
              Se ativado, os motoristas terão a permissão de recalcular e reordenar a sequência de paradas das suas rotas diretamente pelo aplicativo móvel.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              type="submit"
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#8c2cf5', color: 'white', border: 'none',
                padding: '10px 20px', borderRadius: '8px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1
              }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar Configurações
            </button>
            {sucesso && (
              <span style={{ color: '#2a9d8f', fontSize: '0.9rem', fontWeight: 600 }}>{sucesso}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
