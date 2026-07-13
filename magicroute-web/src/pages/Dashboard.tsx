import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buscarDashboard, buscarEntregasPorData } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Monitor,
  Compass,
  MoreVertical,
  RefreshCw,
  TrendingUp,
  MapPin,
  Truck
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const dashboardStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  
  .dashboard-container {
    font-family: 'Outfit', sans-serif;
    display: flex;
    flex-direction: column;
    gap: 24px;
    background: #f8f9fe;
    min-height: 100%;
    color: #212529;
  }
  
  .dashboard-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 24px;
    border: 1.5px solid #eaeaea;
    box-shadow: 0 4px 16px rgba(140, 44, 245, 0.02);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .dashboard-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 24px rgba(140, 44, 245, 0.06);
    border-color: #8c2cf5;
  }
  
  .dashboard-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }
  
  .dashboard-table th {
    padding: 16px 12px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #adb5bd;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 2px solid #f1f3f5;
  }
  
  .dashboard-table td {
    padding: 18px 12px;
    font-size: 0.88rem;
    border-bottom: 1px solid #f1f3f5;
    vertical-align: middle;
  }
  
  .dashboard-table tr {
    transition: background-color 0.2s ease;
  }
  
  .dashboard-table tr:hover {
    background-color: #fdfcff;
  }

  .badge-transito {
    background: rgba(12, 133, 153, 0.1);
    color: #0c8599;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 20px;
    display: inline-block;
  }

  .badge-iniciar {
    background: rgba(108, 117, 125, 0.1);
    color: #495057;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 20px;
    display: inline-block;
  }
`;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [lotesDia, setLotesDia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Dashboard KPIs
      const resultDash = await buscarDashboard(user.idEmpresa);
      if (resultDash && resultDash.length > 0) {
        setData(resultDash[0]);
      }

      // 2. Tabela de entregas em andamento para a data de hoje (fuso local)
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const resultLotes = await buscarEntregasPorData(
        user.idEmpresa,
        '', // Tudo do administrador
        todayStr,
        todayStr
      );
      setLotesDia(resultLotes || []);
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Gráficos circulares auxiliares
  const renderHalfPie = (percentValue: number) => {
    const pieData = [
      { value: percentValue },
      { value: 100 - percentValue }
    ];
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={32}
            outerRadius={45}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill="#8c2cf5" />
            <Cell fill="#e9ecef" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const entregasFinalizadasDia = data?.EntregasFinalizadasDia ?? 0;
  const entregasDia = data?.EntregasDia ?? 0;
  const rotasFinalizadasDia = data?.RotasFinalizadasDia ?? 0;
  const rotasDia = data?.RotasDia ?? 0;

  const percentEntregas = data?.PercentEntregasDia 
    ? Number(data.PercentEntregasDia * 100) 
    : (entregasDia > 0 ? (entregasFinalizadasDia / entregasDia) * 100 : 0);

  const percentRotas = data?.PercentRotasDia 
    ? Number(data.PercentRotasDia * 100) 
    : (rotasDia > 0 ? (rotasFinalizadasDia / rotasDia) * 100 : 0);

  // Agrupar entregas por Lote para exibir uma linha por Rota/Motorista
  const lotesAgrupados: any[] = [];
  const lotesVistos = new Set();
  lotesDia.forEach(e => {
    if (e.IDLote && !lotesVistos.has(e.IDLote)) {
      lotesVistos.add(e.IDLote);
      lotesAgrupados.push(e);
    }
  });

  return (
    <div className="dashboard-container">
      <style>{dashboardStyles}</style>

      {/* Título da Página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1a1d20', margin: 0, letterSpacing: '-0.02em' }}>Overview</h1>
          <p style={{ fontSize: '0.88rem', color: '#6c757d', margin: '4px 0 0 0', fontWeight: 500 }}>Análise de Entregas Geral</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          style={{
            background: '#ffffff',
            border: '1.5px solid #eaeaea',
            borderRadius: '12px',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#495057',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8c2cf5'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#eaeaea'}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Grid de 4 Cards Menores no Topo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {/* Entregas no Mês */}
        <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#adb5bd', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Entregas no Mês</p>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1a1d20', margin: 0 }}>{data?.EntregasMes ?? 0}</h3>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f3f0ff', color: '#8c2cf5', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(140, 44, 245, 0.08)' }}>
            <Package size={22} />
          </div>
        </div>

        {/* Entregas em Abertas */}
        <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#adb5bd', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Entregas em Abertas</p>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1a1d20', margin: 0 }}>{data?.EntregasEmAbertas ?? 0}</h3>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e7f5ff', color: '#228be6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(34, 139, 230, 0.08)' }}>
            <Monitor size={22} />
          </div>
        </div>

        {/* Rotas no Mês */}
        <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#adb5bd', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Rotas no Mês</p>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1a1d20', margin: 0 }}>{data?.Lotes ?? 0}</h3>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e3fafc', color: '#0c8599', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(12, 133, 153, 0.08)' }}>
            <Compass size={22} />
          </div>
        </div>

        {/* Rotas em abertas */}
        <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#adb5bd', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Rotas em abertas</p>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1a1d20', margin: 0 }}>{data?.RotasEmAberta ?? 0}</h3>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f3f0ff', color: '#8c2cf5', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(140, 44, 245, 0.08)' }}>
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* Grid Principal Duas Colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '24px', alignItems: 'start' }}>
        {/* Coluna Esquerda: Gráficos circulares empilhados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card Entregas do Dia */}
          <div className="dashboard-card" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px',
            cursor: 'pointer'
          }} onClick={() => navigate('/rotas')}>
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#adb5bd', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Entregas do Dia</p>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1a1d20', margin: 0 }}>
                {entregasFinalizadasDia} / {entregasDia}
              </h3>
            </div>
            {/* Gráfico circular */}
            <div style={{ width: '90px', height: '90px', position: 'relative' }}>
              {renderHalfPie(percentEntregas)}
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.92rem', fontWeight: 800, color: '#8c2cf5' }}>
                {percentEntregas.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Card Rotas do Dia */}
          <div className="dashboard-card" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px',
            cursor: 'pointer'
          }} onClick={() => navigate('/rotas')}>
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#adb5bd', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Rotas do Dia</p>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1a1d20', margin: 0 }}>
                {rotasFinalizadasDia} / {rotasDia}
              </h3>
            </div>
            {/* Gráfico circular */}
            <div style={{ width: '90px', height: '90px', position: 'relative' }}>
              {renderHalfPie(percentRotas)}
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.92rem', fontWeight: 800, color: '#8c2cf5' }}>
                {percentRotas.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Planejado vs Realizado */}
          <div className="dashboard-card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1d20', width: '100%', textAlign: 'left', margin: 0 }}>
              Planejado vs Realizado
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#6c757d', width: '100%', textAlign: 'left', margin: '0 0 12px 0', fontWeight: 500 }}>
              Aproveitamento da rota planejada.
            </p>

            <div style={{ width: '150px', height: '150px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: 55 }, { value: 45 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={70}
                    paddingAngle={0}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill="#8c2cf5" />
                    <Cell fill="#e9ecef" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a1d20', letterSpacing: '-0.02em' }}>562k</span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#6c757d', margin: '12px 0 0 0', lineHeight: '1.4' }}>
              <strong style={{ color: '#1a1d20', fontWeight: 700 }}>Indicador de sinalizador</strong><br />
              Este indicador mostra o quanto foi seguido pelo motorista da rota que foi planejada dentro do app.
            </p>
          </div>
        </div>

        {/* Coluna Direita: Tabela Grande */}
        <div className="dashboard-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a1d20', margin: 0, letterSpacing: '-0.01em' }}>
                Entregas em andamento por motorista
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#6c757d', margin: '4px 0 0 0', fontWeight: 500 }}>
                Relação atual do motorista para entregas do dia!
              </p>
            </div>
            {/* Botão Roxo */}
            <button
              onClick={() => navigate('/rotas')}
              style={{
                background: '#8c2cf5',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(140, 44, 245, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Ir para Rotas do dia!
            </button>
          </div>

          {/* Tabela de Motoristas/Rotas */}
          <div style={{ overflowX: 'auto' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Rota/Entrega</th>
                  <th>Motorista</th>
                  <th>Próxima Entrega</th>
                  <th>Situação Atual</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lotesAgrupados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', color: '#868e96', fontSize: '0.9rem', fontWeight: 600 }}>
                      Nenhuma rota cadastrada para o dia de hoje.
                    </td>
                  </tr>
                ) : (
                  lotesAgrupados.map((lote, idx) => {
                    const isMotorista2 = String(lote.CodigoMotorista) === '2';
                    const motoristaNome = lote.NomeMotorista || `Motorista #${lote.CodigoMotorista || '1'}`;
                    const motoristaAvatar = isMotorista2 
                      ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=60' 
                      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60';
                    
                    const veiculoNome = lote.Veiculo || lote.veiculo || (isMotorista2 ? 'VW 3201' : 'Fiorino');
                    const placaVei = lote.PlacaEntrega || (isMotorista2 ? 'ACE4848' : 'ABC4321');
                    
                    // Situação atual calculada pelos contadores do banco
                    const pendente = Number(lote.Pendente || 0);
                    const entregue = Number(lote.Entregue || 0);
                    const emTransporte = Number(lote.EmTransporte || 0);
                    const total = Number(lote.Total || (pendente + entregue + emTransporte));

                    let statusTexto = 'A iniciar';
                    let badgeBg = 'rgba(108, 117, 125, 0.1)';
                    let badgeColor = '#495057';

                    if (total > 0) {
                      if (entregue === total) {
                        statusTexto = 'Entregue';
                        badgeBg = 'rgba(40, 167, 69, 0.1)';
                        badgeColor = '#28a745';
                      } else if (entregue > 0 || emTransporte > 0) {
                        statusTexto = 'Em Transporte';
                        badgeBg = 'rgba(54, 162, 235, 0.1)';
                        badgeColor = '#36a2eb';
                      }
                    }

                    return (
                      <tr key={idx} onClick={() => navigate(`/mapa?idLote=${lote.IDLote}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 700, color: '#495057' }}>{lote.IDLote}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={motoristaAvatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#1a1d20' }}>{motoristaNome}</p>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#8c2cf5', fontWeight: 600 }}>{veiculoNome} - {placaVei}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500, color: '#495057' }}>{entregue}/{total} entregas</td>
                        <td>
                          <span style={{
                            background: badgeBg,
                            color: badgeColor,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '5px 12px',
                            borderRadius: '20px',
                            display: 'inline-block'
                          }}>
                            {statusTexto}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/mapa?idLote=${lote.IDLote}`); }}
                              style={{ background: '#e3fafc', border: 'none', color: '#0c8599', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Ver Rota
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/entregas?idLote=${lote.IDLote}`); }}
                              style={{ background: '#f3f0ff', border: 'none', color: '#8c2cf5', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Entregas
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
