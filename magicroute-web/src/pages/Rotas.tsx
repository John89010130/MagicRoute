import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buscarEntregasPorData, criarNovaRota, listarLocais, listarMotoristas, listarVeiculos } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Route as RouteIcon,
  RefreshCw,
  Search,
  Calendar,
  Send,
  MoreVertical,
  Plus
} from 'lucide-react';

export default function Rotas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rotas, setRotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('Todos');
  const [baixaFiltro, setBaixaFiltro] = useState('NaoBaixadas');
  const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
  const [dataInicial, setDataInicial] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [dataFinal, setDataFinal] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [showCriarModal, setShowCriarModal] = useState(false);
  const [modalMotorista, setModalMotorista] = useState('');
  const [modalVeiculo, setModalVeiculo] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [locais, setLocais] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [localSaida, setLocalSaida] = useState('');
  const [localVolta, setLocalVolta] = useState('');

  const handlePeriodoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPeriodoFiltro(val);

    const today = new Date();
    
    if (val === 'Hoje') {
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDataInicial(`${yyyy}-${mm}-${dd}`);
      setDataFinal(`${yyyy}-${mm}-${dd}`);
    } else if (val === 'Esta Semana') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
      
      setDataInicial(`${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`);
      setDataFinal(`${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`);
    } else if (val === 'Este Mês') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setDataInicial(`${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`);
      setDataFinal(`${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`);
    }
  };


  const abrirModalCriarRota = async () => {
    setShowCriarModal(true);
    if (!user) return;
    try {
      const [dataLocais, dataMotoristas, dataVeiculos] = await Promise.all([
        listarLocais(user.idEmpresa),
        listarMotoristas(user.idEmpresa),
        listarVeiculos(user.idEmpresa),
      ]);

      const ativos = Array.isArray(dataLocais) ? dataLocais.filter((l: any) => l.Ativo !== false) : [];
      setLocais(ativos);
      if (ativos.length === 1) {
        setLocalSaida(String(ativos[0].CodigoLocal));
        setLocalVolta(String(ativos[0].CodigoLocal));
      } else {
        setLocalSaida('');
        setLocalVolta('');
      }

      const mots = Array.isArray(dataMotoristas) ? dataMotoristas : [];
      setMotoristas(mots);
      setModalMotorista(mots.length > 0 ? String(mots[0].Codigo) : '');

      const veics = Array.isArray(dataVeiculos) ? dataVeiculos : [];
      setVeiculos(veics);
      setModalVeiculo(veics.length > 0 ? String(veics[0].CodigoVeiculo) : '');
    } catch (err) {
      console.error('Erro ao buscar dados do modal:', err);
    }
  };

  const handleCriarRota = async () => {
    if (!user) return;
    if (!modalMotorista) { alert('Selecione um motorista.'); return; }
    if (!modalVeiculo)   { alert('Selecione um veículo.'); return; }
    setModalLoading(true);

    const localSaidaNum   = parseInt(localSaida,  10) || 0;
    const localVoltaNum   = parseInt(localVolta,   10) || localSaidaNum;

    try {
      const res = await criarNovaRota(
        Number(user.idEmpresa),
        Number(modalMotorista),
        Number(modalVeiculo),
        localSaidaNum,
        localVoltaNum,
        Number(user.codigo || 1)
      );
      if (res && res.sucesso) {
        setShowCriarModal(false);
        navigate(`/entregas?idLote=${res.novoIdLote}`);
      } else {
        alert('Erro ao criar rota: ' + (res.erro || 'Desconhecido'));
      }
    } catch (err: any) {
      console.error('Erro ao criar rota:', err);
      alert('Erro de conexão ao criar rota: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };


  const fetchRotas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await buscarEntregasPorData(
        user.idEmpresa,
        '', // Vazio para o Administrador ver todas as rotas
        dataInicial,
        dataFinal
      );
      setRotas(result || []);
    } catch (err) {
      console.error('Erro ao buscar rotas:', err);
      setRotas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRotas();
  }, [user, dataInicial, dataFinal]);

  const filteredRotas = rotas.filter(rota => {
    const matchBusca = !busca ||
      (rota.LocalSaida || '').toLowerCase().includes(busca.toLowerCase()) ||
      (rota.Veiculo || '').toLowerCase().includes(busca.toLowerCase()) ||
      String(rota.IDLote).includes(busca);

    const sit = (rota.SituacaoLote || rota.Situacao || '').toLowerCase();
    const isBaixada = sit === 'concluido' || sit === 'concluído' || sit === 'entregue';

    let matchBaixa = true;
    if (baixaFiltro === 'NaoBaixadas') {
      matchBaixa = !isBaixada;
    } else if (baixaFiltro === 'Baixadas') {
      matchBaixa = isBaixada;
    }

    const pendente = Number(rota.Pendente || 0);
    const entregue = Number(rota.Entregue || 0);
    const emTransporte = Number(rota.EmTransporte || 0);
    const total = pendente + entregue + emTransporte;

    let statusCalculado = 'A iniciar';
    if (total > 0) {
      if (entregue === total) {
        statusCalculado = 'Entregue';
      } else if (entregue > 0 || emTransporte > 0) {
        statusCalculado = 'Em Transporte';
      }
    }

    const matchStatus = statusFiltro === 'Todos' || statusCalculado === statusFiltro;

    return matchBusca && matchBaixa && matchStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'sans-serif' }}>
      {/* Título da Página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#333', margin: 0 }}>Rotas</h1>
          <p style={{ fontSize: '0.85rem', color: '#868e96', margin: '4px 0 0 0' }}>Gerencie todas as rotas de entrega</p>
        </div>
        <button 
          onClick={fetchRotas}
          style={{
            background: '#ffffff',
            border: '1.5px solid #eaeaea',
            borderRadius: '8px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#495057',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Grid de 4 Cards Menores no Topo (Imagem 5) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {/* Total de Rotas */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1.5px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#adb5bd', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Total de Rotas</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#333', margin: 0 }}>{rotas.length || 2}</h3>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f3f0ff', color: '#8c2cf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RouteIcon size={20} />
          </div>
        </div>

        {/* Rotas Ativas */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1.5px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#adb5bd', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Rotas Ativas</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#333', margin: 0 }}>{rotas.filter(r => r.Pendente > 0).length || 2}</h3>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#e7f5ff', color: '#228be6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RouteIcon size={20} />
          </div>
        </div>

        {/* Rotas Concluidas */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1.5px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#adb5bd', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Rotas Concluidas</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#333', margin: 0 }}>0</h3>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#e3fafc', color: '#0c8599', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RouteIcon size={20} />
          </div>
        </div>

        {/* Rotas em Andamento */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1.5px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#adb5bd', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Rotas em Andamento</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#333', margin: 0 }}>0</h3>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f3f0ff', color: '#8c2cf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RouteIcon size={20} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Horizontais (Imagem 5) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px 24px',
        border: '1.5px solid #eaeaea',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Busca */}
        <div style={{ flex: 1.5, minWidth: '180px', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Busque uma r..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid #ced4da',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Status */}
        <div style={{ flex: 1, minWidth: '120px' }}>
          <select 
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid #ced4da',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#ffffff'
            }}
          >
            <option value="Todos">Status</option>
            <option value="A iniciar">A iniciar</option>
            <option value="Em Transporte">Em Transporte</option>
            <option value="Entregue">Entregue</option>
          </select>
        </div>

        {/* Filtro de Baixa */}
        <div style={{ flex: 1, minWidth: '130px' }}>
          <select 
            value={baixaFiltro}
            onChange={(e) => setBaixaFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid #ced4da',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#ffffff'
            }}
          >
            <option value="NaoBaixadas">Não Baixadas</option>
            <option value="Baixadas">Baixadas</option>
            <option value="Todas">Todas (Baixa)</option>
          </select>
        </div>

        {/* Periodo */}
        <div style={{ flex: 1, minWidth: '120px' }}>
          <select 
            value={periodoFiltro}
            onChange={handlePeriodoChange}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid #ced4da',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#ffffff'
            }}
          >
            <option value="Periodo">Periodo Customizado</option>
            <option>Hoje</option>
            <option>Esta Semana</option>
            <option>Este Mês</option>
          </select>
        </div>

        {/* Data Inicial */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
          <input 
            type="date"
            value={dataInicial}
            onChange={(e) => { setDataInicial(e.target.value); setPeriodoFiltro('Periodo'); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid #ced4da',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Data Final */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
          <input 
            type="date"
            value={dataFinal}
            onChange={(e) => { setDataFinal(e.target.value); setPeriodoFiltro('Periodo'); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid #ced4da',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Botão Roxo Nova Rota (Imagem 5) */}
        <button
          onClick={() => abrirModalCriarRota()}
          style={{
            background: '#8c2cf5',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(140, 44, 245, 0.2)'
          }}
        >
          <Send size={14} style={{ transform: 'rotate(45deg)' }} /> Nova Rota
        </button>
      </div>

      {/* Tabela de Rotas */}
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1.5px solid #eaeaea' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', margin: '0 0 4px 0' }}>
          Lista de Rotas
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#868e96', margin: '0 0 20px 0' }}>
          Mostrando Registros encontrados!
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f1f3f5' }}>
                <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Rota/Entrega</th>
                <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Motorista</th>
                <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Proxima Entrega</th>
                <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Situação Atual</th>
                <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rotasAgrupadas: any[] = [];
                const rotasVistas = new Set();
                filteredRotas.forEach(r => {
                  if (r.IDLote && !rotasVistas.has(r.IDLote)) {
                    rotasVistas.add(r.IDLote);
                    rotasAgrupadas.push(r);
                  }
                });

                if (rotasAgrupadas.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px 8px', textAlign: 'center', color: '#868e96', fontSize: '0.9rem', fontWeight: 600 }}>
                        Nenhuma rota cadastrada para o período selecionado.
                      </td>
                    </tr>
                  );
                }

                return rotasAgrupadas.map((rota, index) => {
                  const isMotorista2 = String(rota.CodigoMotorista) === '2';
                  const motoristaNome = rota.NomeMotorista || `Motorista #${rota.CodigoMotorista || '1'}`;
                  const motoristaAvatar = isMotorista2 
                    ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=60' 
                    : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60';
                  
                  const veiculoNome = rota.Veiculo || (isMotorista2 ? 'VW 3201' : 'Fiorino');
                  const placaVei = rota.PlacaEntrega || (isMotorista2 ? 'ACE4848' : 'ABC4321');

                  const pendente = Number(rota.Pendente || 0);
                  const entregue = Number(rota.Entregue || 0);
                  const emTransporte = Number(rota.EmTransporte || 0);
                  const total = Number(rota.Total || (pendente + entregue + emTransporte));

                  let statusTexto = 'A iniciar';
                  let badgeBg = '#f1f3f5';
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
                    <tr key={index} onClick={() => navigate(`/entregas?idLote=${rota.IDLote}`)} style={{ borderBottom: '1px solid #f1f3f5', cursor: 'pointer' }}>
                      <td style={{ padding: '16px 8px', fontSize: '0.9rem', fontWeight: 600 }}>{rota.IDLote}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={motoristaAvatar} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{motoristaNome}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#8c2cf5' }}>{veiculoNome} - {placaVei}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', fontSize: '0.85rem', color: '#495057' }}>
                        {entregue}/{total} entregas
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <span style={{
                          background: badgeBg,
                          color: badgeColor,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          display: 'inline-block'
                        }}>
                          {statusTexto}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/mapa?idLote=${rota.IDLote}`); }}
                            style={{ background: '#e3fafc', border: 'none', color: '#0c8599', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Ver Rota
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/entregas?idLote=${rota.IDLote}`); }}
                            style={{ background: '#f3f0ff', border: 'none', color: '#8c2cf5', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Entregas
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para criar nova rota */}
      {showCriarModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            fontFamily: "'Outfit', sans-serif"
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Nova Rota / Lote</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Informe o motorista, veículo e local de saída.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motorista</label>
              <select
                value={modalMotorista}
                onChange={(e) => setModalMotorista(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.875rem' }}
              >
                {motoristas.length === 0 && <option value="">Carregando...</option>}
                {motoristas.map(m => (
                  <option key={m.Codigo} value={String(m.Codigo)}>
                    {m.Nome} {m.TipoPessoa === 'A/M' ? '(Adm/Motorista)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Veículo</label>
              <select
                value={modalVeiculo}
                onChange={(e) => setModalVeiculo(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.875rem' }}
              >
                {veiculos.length === 0 && <option value="">Carregando...</option>}
                {veiculos.map(v => (
                  <option key={v.CodigoVeiculo} value={String(v.CodigoVeiculo)}>
                    {v.Veiculo}{v.PlacaEntrega ? ` — ${v.PlacaEntrega}` : ''}{v.TipoCombustivel ? ` (${v.TipoCombustivel})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Local de Saída</label>
              <select
                value={localSaida}
                onChange={(e) => {
                  setLocalSaida(e.target.value);
                  // Auto-preenche local de volta com o mesmo
                  setLocalVolta(e.target.value);
                }}
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.875rem' }}
              >
                <option value="">— Selecione o local —</option>
                {locais.map(l => (
                  <option key={l.CodigoLocal} value={String(l.CodigoLocal)}>
                    {l.NomeLocal}{l.Cidade ? ` — ${l.Cidade}/${l.UF}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Local de Volta</label>
              <select
                value={localVolta}
                onChange={(e) => setLocalVolta(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.875rem' }}
              >
                <option value="">— Selecione o local —</option>
                {locais.map(l => (
                  <option key={l.CodigoLocal} value={String(l.CodigoLocal)}>
                    {l.NomeLocal}{l.Cidade ? ` — ${l.Cidade}/${l.UF}` : ''}
                  </option>
                ))}
              </select>
              {localSaida && localVolta === localSaida && (
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>✓ Mesmo local de saída. Altere se o retorno for diferente.</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setShowCriarModal(false)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
                disabled={modalLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarRota}
                style={{ padding: '10px 24px', border: 'none', borderRadius: '10px', background: modalLoading ? '#d1d5db' : 'linear-gradient(135deg, #8c2cf5, #6d28d9)', color: '#fff', fontWeight: 700, cursor: modalLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', boxShadow: modalLoading ? 'none' : '0 4px 14px rgba(140,44,245,0.3)' }}
                disabled={modalLoading}
              >
                {modalLoading ? 'Criando...' : 'Confirmar Rota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
