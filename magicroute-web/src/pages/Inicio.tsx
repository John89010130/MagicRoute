import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buscarEntregasPorData } from '../services/api';
import { Calendar, List, Map, MapPin, Truck, RefreshCw, Package } from 'lucide-react';

export default function Inicio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<any[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'abertos' | 'finalizados'>('abertos');
  const [loading, setLoading] = useState(true);
  const fetchLotes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await buscarEntregasPorData(
        user.idEmpresa,
        user.codigo,
        undefined,
        undefined,
        true // ignorarData
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
  }, [user]);

  const handleLoteClick = (lote: any) => {
    navigate(`/entregas?idLote=${lote.IDLote}`);
  };

  const lotesFiltrados = lotes.filter(l => {
    const sit = (l.SituacaoLote || l.Situacao || '').toLowerCase();
    const isFinalizado = sit === 'concluido' || sit === 'concluído' || sit === 'entregue';
    if (abaAtiva === 'finalizados') return isFinalizado;
    return !isFinalizado;
  });

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
        <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: '6px 0 0 0', fontWeight: 500 }}>
          {(() => {
            const hrs = new Date().getHours();
            let greeting = 'Boa noite';
            if (hrs < 12) greeting = 'Bom dia';
            else if (hrs < 18) greeting = 'Boa tarde';
            return `${greeting}, ${user?.nomeUsuario || 'Motorista'}`;
          })()}!
        </p>
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

      {/* Seletor de Abas Sutil (Sem sujar layout) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #eaeaea' }}>
        <button 
          onClick={() => setAbaAtiva('abertos')}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px 12px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: abaAtiva === 'abertos' ? '#8c2cf5' : '#868e96',
            borderBottom: abaAtiva === 'abertos' ? '2.5px solid #8c2cf5' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Em Aberto
        </button>
        <button 
          onClick={() => setAbaAtiva('finalizados')}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px 12px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: abaAtiva === 'finalizados' ? '#8c2cf5' : '#868e96',
            borderBottom: abaAtiva === 'finalizados' ? '2.5px solid #8c2cf5' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Finalizados
        </button>
      </div>

      {/* Lista de Lotes com Rolagem */}
      <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', paddingBottom: '90px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
            <div className="spinner" style={{ borderColor: '#eaeaea', borderTopColor: '#8c2cf5' }} />
            <p style={{ color: '#868e96', fontSize: '0.9rem' }}>Buscando lotes...</p>
          </div>
        ) : lotesFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#868e96' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#495057', marginBottom: '6px' }}>Nenhum lote aqui</h3>
            <p style={{ fontSize: '0.85rem' }}>Não existem lotes de entrega cadastrados nesta categoria para hoje.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {lotesFiltrados.map((lote, index) => {
              const pendente = Number(lote.Pendente || 0);
              const entregue = Number(lote.Entregue || 0);
              const emTransporte = Number(lote.EmTransporte || 0);
              const total = Number(lote.Total || (pendente + entregue + emTransporte));

              return (
                <div
                  key={lote.IDLote || index}
                  onClick={() => handleLoteClick(lote)}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    border: '1.5px solid #eaeaea',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
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
                  {/* Foto do Veículo à Esquerda */}
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '16px',
                    border: '1.5px solid #eaeaea',
                    background: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {lote.UrlVeiculo ? (
                      <img 
                        src={lote.UrlVeiculo} 
                        alt={lote.Veiculo || 'Veículo'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Truck size={36} color="#8c2cf5" />
                    )}
                  </div>

                  {/* Lote Info à Direita */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      Lote {lote.IDLote}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, margin: 0 }}>
                      <strong>Data Prevista:</strong> {lote.DataEntrega || 'N/A'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                      <strong>Início Previsto:</strong> {lote.HoraSaidaPrevista || 'N/A'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                      <strong>Fim Previsto:</strong> {lote.HoraRetornoPrevista || 'N/A'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      <strong>Saída:</strong> {lote.LocalSaida || 'Base Central'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#2a9d8f', fontWeight: 600, margin: 0 }}>
                      <strong>Realizadas:</strong> {entregue} / {total}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#e67700', fontWeight: 600, margin: 0 }}>
                      <strong>Pendentes:</strong> {pendente}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                      <strong>Veículo:</strong> {lote.Veiculo || 'VW 3201'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                      <strong>Placa:</strong> {lote.PlacaEntrega || 'Sem Placa'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      <strong>Volta base:</strong> {lote.LocalChegada || lote.LocalSaida || 'Base Central'}
                    </p>
                  </div>

                  {/* Ícones de Ação à Direita */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', paddingLeft: '8px' }}>
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
              );
            })}
          </div>
        )}
      </div>



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
