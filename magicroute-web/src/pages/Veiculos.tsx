import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarVeiculos, adicionarVeiculo, editarVeiculo, excluirVeiculo } from '../services/api';
import { Truck, Plus, Edit, Trash2, Loader2, Fuel, CreditCard, Image } from 'lucide-react';

const compressAndConvertBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // compress quality 75%
        resolve(dataUrl);
      };
      img.onerror = (err: any) => reject(err);
    };
    reader.onerror = (err: any) => reject(err);
  });
};

export default function Veiculos() {
  const { user } = useAuth();
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Control
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [formVeiculo, setFormVeiculo] = useState('');
  const [formTipoCombustivel, setFormTipoCombustivel] = useState('Flex');
  const [formPlacaEntrega, setFormPlacaEntrega] = useState('');
  const [formUrlVeiculo, setFormUrlVeiculo] = useState('');

  useEffect(() => {
    fetchVeiculos();
  }, [user]);

  const fetchVeiculos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listarVeiculos(user.idEmpresa);
      setVeiculos(data || []);
    } catch (err) {
      console.error('Erro ao buscar veículos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormVeiculo('');
    setFormTipoCombustivel('Flex');
    setFormPlacaEntrega('');
    setFormUrlVeiculo('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (v: any) => {
    setSelectedVeiculo(v);
    setFormVeiculo(v.Veiculo || v.veiculo || '');
    setFormTipoCombustivel(v.TipoCombustivel || v.tipocombustivel || 'Flex');
    setFormPlacaEntrega(v.PlacaEntrega || v.placaentrega || '');
    setFormUrlVeiculo(v.UrlVeiculo || v.urlveiculo || '');
    setShowEditModal(true);
  };

  const handleAddSubmit = async () => {
    if (!user) return;
    if (!formVeiculo) {
      alert('Descrição do veículo é obrigatória!');
      return;
    }
    setFormLoading(true);
    try {
      await adicionarVeiculo({
        IdEmpresa: user.idEmpresa,
        Veiculo: formVeiculo,
        TipoCombustivel: formTipoCombustivel,
        PlacaEntrega: formPlacaEntrega,
        UrlVeiculo: formUrlVeiculo
      });
      setShowAddModal(false);
      fetchVeiculos();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao adicionar veículo: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!user || !selectedVeiculo) return;
    if (!formVeiculo) {
      alert('Descrição do veículo é obrigatória!');
      return;
    }
    setFormLoading(true);
    try {
      await editarVeiculo({
        IdEmpresa: user.idEmpresa,
        CodigoVeiculo: Number(selectedVeiculo.CodigoVeiculo),
        Veiculo: formVeiculo,
        TipoCombustivel: formTipoCombustivel,
        PlacaEntrega: formPlacaEntrega,
        UrlVeiculo: formUrlVeiculo
      });
      setShowEditModal(false);
      fetchVeiculos();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao editar veículo: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (v: any) => {
    if (!user) return;
    if (!window.confirm(`Deseja realmente excluir o veículo "${v.Veiculo}"?`)) return;
    try {
      await excluirVeiculo({
        IdEmpresa: user.idEmpresa,
        CodigoVeiculo: Number(v.CodigoVeiculo)
      });
      fetchVeiculos();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir veículo: ' + err.message);
    }
  };

  // Contadores
  const totalFlex = veiculos.filter(v => (v.TipoCombustivel || v.tipocombustivel) === 'Flex').length;
  const totalDiesel = veiculos.filter(v => (v.TipoCombustivel || v.tipocombustivel) === 'Diesel').length;
  const totalOutros = veiculos.length - totalFlex - totalDiesel;

  const renderModal = (title: string, onSubmit: () => void, onClose: () => void) => {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15,23,42,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{title}</h3>
            <span style={{ fontSize: '0.75rem', color: '#8c2cf5', background: '#f3f0ff', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Empresa #{user?.idEmpresa}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Descrição do Veículo *</label>
              <input 
                type="text" 
                value={formVeiculo} 
                onChange={(e) => setFormVeiculo(e.target.value)}
                placeholder="Ex: Fiorino Branca 1.4"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Placa de Entrega</label>
                <input 
                  type="text" 
                  value={formPlacaEntrega} 
                  onChange={(e) => setFormPlacaEntrega(e.target.value)}
                  placeholder="Ex: ABC-1234"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Combustível</label>
                <select
                  value={formTipoCombustivel}
                  onChange={(e) => setFormTipoCombustivel(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#ffffff', fontSize: '0.85rem', height: '41px' }}
                >
                  <option value="Flex">Flex</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Etanol">Etanol</option>
                  <option value="GNV">GNV</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Foto do Veículo</label>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '48px', borderRadius: '6px', background: '#e2e8f0', overflow: 'hidden', border: '1.5px solid #8c2cf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {formUrlVeiculo ? (
                    <img src={formUrlVeiculo} alt="Veículo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Truck size={20} style={{ color: '#94a3b8' }} />
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await compressAndConvertBase64(file);
                          setFormUrlVeiculo(base64);
                        } catch (err) {
                          console.error('Erro ao processar imagem:', err);
                          alert('Erro ao processar imagem do veículo.');
                        }
                      }
                    }}
                    style={{ fontSize: '0.75rem', color: '#64748b' }}
                  />
                  {formUrlVeiculo && (
                    <button 
                      type="button"
                      onClick={() => setFormUrlVeiculo('')}
                      style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.75rem', padding: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left', fontWeight: 600, width: 'fit-content' }}
                    >
                      Remover Foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button 
              onClick={onClose}
              style={{ padding: '10px 18px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              disabled={formLoading}
            >
              Cancelar
            </button>
            <button 
              onClick={onSubmit}
              style={{ padding: '10px 22px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #8c2cf5 0%, #6e1ac9 100%)', color: '#ffffff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(140, 44, 245, 0.2)', fontSize: '0.85rem' }}
              disabled={formLoading}
            >
              {formLoading ? 'Salvando...' : 'Salvar Veículo'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'sans-serif' }}>
      {/* Topo com Título e Ação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#212529' }}>Veículos cadastrados</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#868e96' }}>Gerencie a frota de veículos disponíveis para o roteamento e entregas.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #8c2cf5 0%, #6e1ac9 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(140, 44, 245, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={16} />
          Novo Veículo
        </button>
      </div>

      {/* Cards de Contadores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(140, 44, 245, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c2cf5' }}>
            <Truck size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Total Frota</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{veiculos.length}</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(54, 162, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#36a2eb' }}>
            <Fuel size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Veículos Flex</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{totalFlex}</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(75, 192, 192, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4bc0c0' }}>
            <Fuel size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Veículos Diesel</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{totalDiesel}</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 193, 7, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffc107' }}>
            <Fuel size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Outros Motores</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{totalOutros}</p>
          </div>
        </div>
      </div>

      {/* Tabela de Veículos */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '12px' }}>
            <Loader2 className="animate-spin" size={32} color="#8c2cf5" />
            <span style={{ fontSize: '0.9rem', color: '#868e96', fontWeight: 600 }}>Carregando frota de veículos...</span>
          </div>
        ) : veiculos.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '8px' }}>
            <Truck size={40} color="#adb5bd" />
            <span style={{ fontSize: '0.95rem', color: '#495057', fontWeight: 700 }}>Nenhum veículo cadastrado</span>
            <span style={{ fontSize: '0.85rem', color: '#868e96' }}>Clique no botão "Novo Veículo" para começar.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Código</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Foto</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Descrição / Modelo</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Placa</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Combustível</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map((v, index) => {
                  const cod = v.CodigoVeiculo || v.codigoveiculo;
                  const desc = v.Veiculo || v.veiculo || '';
                  const placa = v.PlacaEntrega || v.placaentrega || '-';
                  const comb = v.TipoCombustivel || v.tipocombustivel || 'Flex';
                  const url = v.UrlVeiculo || v.urlveiculo || '';

                  return (
                    <tr key={cod} style={{ borderBottom: index === veiculos.length - 1 ? 'none' : '1px solid #f1f3f5', transition: 'background 0.2s', background: index % 2 === 0 ? '#ffffff' : '#fcfdff' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>{cod}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ width: '48px', height: '36px', borderRadius: '6px', background: '#f1f3f5', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {url ? (
                            <img src={url} alt={desc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <Truck size={16} color="#adb5bd" />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#212529' }}>{desc}</td>
                      <td style={{ padding: '16px 20px', color: '#495057', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{placa}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          background: comb === 'Diesel' ? 'rgba(253, 126, 20, 0.1)' : comb === 'Gasolina' ? 'rgba(13, 110, 253, 0.1)' : 'rgba(40, 167, 69, 0.1)',
                          color: comb === 'Diesel' ? '#fd7e14' : comb === 'Gasolina' ? '#0d6efd' : '#28a745',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {comb}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <button 
                            onClick={() => handleOpenEdit(v)}
                            style={{ border: 'none', background: 'none', color: '#868e96', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Editar veículo"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(v)}
                            style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Excluir veículo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && renderModal('Cadastrar Novo Veículo', handleAddSubmit, () => setShowAddModal(false))}
      {showEditModal && renderModal('Editar Veículo', handleEditSubmit, () => setShowEditModal(false))}
    </div>
  );
}
