import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buscarEntregasPorData } from '../services/api';
import { Calendar, List, Map, MapPin, Truck, RefreshCw, Package } from 'lucide-react';

export default function Inicio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataFiltro, setDataFiltro] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchLotes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [y, m, d] = dataFiltro.split('-');
      const dataFormatada = `${d}/${m}/${y}`;
      const result = await buscarEntregasPorData(
        user.idEmpresa,
        user.codigo,
        dataFormatada,
        dataFormatada
      );
      setLotes(result || []);
    } catch (err) {
      console.error('Erro ao buscar lotes:', err);
      setLotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotes();
  }, [dataFiltro, user]);

  const handleLoteClick = (lote: any) => {
    navigate(`/entregas?idLote=${lote.IDLote}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative', background: '#f8f9fe' }}>
      {/* Header Roxo (Imagem 2) */}
      <div style={{
        background: '#8c2cf5',
        padding: '24px 16px',
        color: '#ffffff',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 4px 10px rgba(140, 44, 245, 0.15)',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
      }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0, letterSpacing: '0.02em' }}>
          Minhas Entregas
        </h1>
        <button 
          onClick={fetchLotes}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Atualizar"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Lista de Lotes com Rolagem */}
      <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', paddingBottom: '90px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
            <div className="spinner" style={{ borderColor: '#eaeaea', borderTopColor: '#8c2cf5' }} />
            <p style={{ color: '#868e96', fontSize: '0.9rem' }}>Buscando lotes...</p>
          </div>
        ) : lotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#868e96' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#495057', marginBottom: '6px' }}>Nenhum lote para hoje</h3>
            <p style={{ fontSize: '0.85rem' }}>Use o botão flutuante de calendário para selecionar outro dia.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {lotes.map((lote, index) => (
              <div
                key={lote.IDLote || index}
                onClick={() => handleLoteClick(lote)}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  border: '1.5px solid #eaeaea',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
                }}
              >
                {/* Lote Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', margin: 0 }}>
                    Lote de Entrega: [{lote.IDLote}]
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Local de Saida: [{lote.LocalSaida || 'Não informado'}]
                  </p>
                  
                  {/* Status do Lote em Roxo (Imagem 2) */}
                  <p style={{ fontSize: '0.85rem', color: '#8c2cf5', fontWeight: 600, margin: 0 }}>
                    A Entregar: [{lote.Pendente}] Entregues: [{lote.Entregue}]
                  </p>
                  
                  <p style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0 }}>
                    Veiculo: [{lote.Veiculo || 'N/A'}]
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0 }}>
                    Placa: [{lote.PlacaEntrega || 'Sem placa'}]
                  </p>
                </div>

                {/* Ícones de Ação à Direita */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', paddingLeft: '16px' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoteClick(lote);
                    }}
                    style={{ background: 'none', border: 'none', color: '#495057', cursor: 'pointer', padding: '6px' }}
                    title="Ver entregas"
                  >
                    <List size={22} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/mapa?idLote=${lote.IDLote}`);
                    }}
                    style={{ background: 'none', border: 'none', color: '#495057', cursor: 'pointer', padding: '6px' }}
                    title="Ver no mapa"
                  >
                    <Map size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date Picker Overlay flutuante */}
      {showDatePicker && (
        <div style={{
          position: 'absolute',
          bottom: '110px',
          right: '24px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          border: '1.5px solid #eaeaea',
          zIndex: 110,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8c2cf5', textTransform: 'uppercase' }}>Filtrar por data</label>
          <input 
            type="date" 
            value={dataFiltro} 
            onChange={(e) => {
              setDataFiltro(e.target.value);
              setShowDatePicker(false);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid #ced4da',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
        </div>
      )}

      {/* Botão flutuante de Calendário no Canto Inferior Direito (Imagem 2) */}
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#8c2cf5',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 15px rgba(140, 44, 245, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
        }}
        title="Selecionar Data"
      >
        <Calendar size={24} />
      </button>

      {/* Footer Roxo Estético (Idêntico ao original da Imagem) */}
      <div style={{
        background: '#8c2cf5',
        height: '24px',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        zIndex: 50,
      }} />
    </div>
  );
}
