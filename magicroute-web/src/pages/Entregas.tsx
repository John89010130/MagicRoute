import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buscarEntregasPorLote, roteirizarLote, salvarHoraSaidaLote, salvarTempoAtendimentoLote, salvarDataLote, gravarEvento, atualizarSequencia, adicionarEntrega, editarEntrega, excluirEntrega, criarLog, buscarLogs, buscarPontosGPS, importarEntregasLote, buscarConfiguracoes, finalizarLote, reabrirLote, listarMotoristas, alterarMotoristaLote } from '../services/api';
import { ArrowLeft, Check, Navigation, Package, RefreshCw, Loader2, List, MapPin, CheckCircle2, RotateCcw, Edit, Trash2, Printer, Plus, Compass, History, Upload, XCircle } from 'lucide-react';
import { adicionarGpsLog } from '../hooks/useGpsTracker';

export default function Entregas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idLote = searchParams.get('idLote') || '';

  const [entregas, setEntregas] = useState<any[]>([]);
  const [permiteRoteirizar, setPermiteRoteirizar] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roteirizando, setRoteirizando] = useState(false);
  const [isRouteForced, setIsRouteForced] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [formHoraSaida, setFormHoraSaida] = useState('');
  const [formTempoAtendimento, setFormTempoAtendimento] = useState('');
  const [formDataLote, setFormDataLote] = useState('');
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<any>(null);

  // Form Fields
  const [formPedido, setFormPedido] = useState('');
  const [formNota, setFormNota] = useState('');
  const [formCliente, setFormCliente] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formCep, setFormCep] = useState('');
  const [formUf, setFormUf] = useState('SP');
  const [formValor, setFormValor] = useState('0');
  const [formPagamento, setFormPagamento] = useState('A Faturar');
  const [formStatus, setFormStatus] = useState('Pendente');
  const [formObs, setFormObs] = useState('');
  const [formDocRecebedor, setFormDocRecebedor] = useState('');
  const [formNomeRecebimento, setFormNomeRecebimento] = useState('');
  const [formDataExigida, setFormDataExigida] = useState('');
  const [formHoraExigida, setFormHoraExigida] = useState('');
  const [formHoraInicio1, setFormHoraInicio1] = useState('');
  const [formHoraFim1, setFormHoraFim1] = useState('');
  const [formHoraInicio2, setFormHoraInicio2] = useState('');
  const [formHoraFim2, setFormHoraFim2] = useState('');
  const [formDataEntrega, setFormDataEntrega] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'entregas' | 'logs'>('entregas');
  const [loteLogs, setLoteLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [gpsTrace, setGpsTrace] = useState<any>(null);
  const [loadingGpsTrace, setLoadingGpsTrace] = useState(false);

  // Modal de seleção de app de navegação
  const [showNavModal, setShowNavModal] = useState(false);
  const [navModalEntrega, setNavModalEntrega] = useState<any>(null);
  const [navModalAudio, setNavModalAudio] = useState<HTMLAudioElement | null>(null);

  // Estado de entrega ativa para widget flutuante
  const [entregaEmTransporte, setEntregaEmTransporte] = useState<any>(null);

  // Debugger console states
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugConsole, setShowDebugConsole] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gps_debug_logs');
      if (saved) {
        setDebugLogs(JSON.parse(saved));
      }
    } catch (e) {}

    const handleLogAdded = () => {
      const win = window as any;
      setDebugLogs([...(win._gpsLogs || [])]);
    };

    window.addEventListener('gps-log-added', handleLogAdded);
    return () => window.removeEventListener('gps-log-added', handleLogAdded);
  }, []);

  // States para Importação de Planilha
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const handleDownloadTemplate = () => {
    const headers = [
      'NumeroPedido',
      'NrNotaFiscal',
      'NomeCliente',
      'EnderecoEntrega',
      'Bairro',
      'Cidade',
      'CEP',
      'UFEntrega',
      'ValorRecebido',
      'TipoPagamento',
      'DataEntrega',
      'LatitudeEntrega',
      'LongitudeEntrega',
      'Observacoes',
      'HoraRecebimentoInicio1',
      'HoraRecebimentoFim1',
      'HoraRecebimentoInicio2',
      'HoraRecebimentoFim2'
    ];
    
    // Duas linhas de exemplo prontas (uma com endereço, outra com lat/lng)
    const row1 = [
      'P001',
      'NF101A',
      'Cliente Exemplo 1',
      'Av. Paulista, 1000',
      'Bela Vista',
      'São Paulo',
      '01310-100',
      'SP',
      150.50,
      'Pix',
      '15/07/2026',
      '',
      '',
      'Cuidado ao descarregar no local',
      '08:00',
      '11:30',
      '',
      ''
    ];
    const row2 = [
      'P002',
      'NF102B',
      'Cliente Exemplo 2',
      '',
      '',
      '',
      '',
      '',
      0.00,
      'A Faturar',
      '15/07/2026',
      -23.5612,
      -46.6553,
      'Entregar para o porteiro',
      '',
      '',
      '',
      ''
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, row1, row2]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');
    XLSX.writeFile(workbook, `modelo_importacao_lote_${idLote}.xlsx`);
  };

  const processParsedRows = (headers: string[], dataRows: string[][]) => {
    const parsedItems: any[] = [];
    const errors: string[] = [];
    
    const colIndex = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    
    const idxPedido = colIndex('NumeroPedido');
    const idxNota = colIndex('NrNotaFiscal');
    const idxCliente = colIndex('NomeCliente');
    const idxEndereco = colIndex('EnderecoEntrega');
    const idxBairro = colIndex('Bairro');
    const idxCidade = colIndex('Cidade');
    const idxCep = colIndex('CEP');
    const idxUf = colIndex('UFEntrega');
    const idxValor = colIndex('ValorRecebido');
    const idxPagamento = colIndex('TipoPagamento');
    const idxData = colIndex('DataEntrega');
    const idxLat = colIndex('LatitudeEntrega');
    const idxLng = colIndex('LongitudeEntrega');
    const idxObs = colIndex('Observacoes');
    const idxHInicio1 = colIndex('HoraRecebimentoInicio1');
    const idxHFim1 = colIndex('HoraRecebimentoFim1');
    const idxHInicio2 = colIndex('HoraRecebimentoInicio2');
    const idxHFim2 = colIndex('HoraRecebimentoFim2');
    
    if (idxPedido === -1 || idxNota === -1 || idxCliente === -1) {
      setImportErrors(['Cabeçalhos obrigatórios ausentes. Certifique-se de que a planilha possui as colunas: NumeroPedido, NrNotaFiscal, NomeCliente.']);
      return;
    }
    
    for (let i = 0; i < dataRows.length; i++) {
      const rowCells = dataRows[i];
      if (rowCells.every(c => !c.trim())) continue;
      
      const getValue = (idx: number) => (idx !== -1 && rowCells[idx] !== undefined) ? rowCells[idx] : '';
      
      const numLinha = i + 2;
      const pedido = getValue(idxPedido).trim();
      const nota = getValue(idxNota).trim();
      const cliente = getValue(idxCliente).trim();
      const endereco = getValue(idxEndereco).trim();
      const bairro = getValue(idxBairro).trim();
      const cidade = getValue(idxCidade).trim();
      const cep = getValue(idxCep).trim();
      const uf = getValue(idxUf).trim() || 'SP';
      const valorStr = getValue(idxValor).trim() || '0';
      const pagamento = getValue(idxPagamento).trim() || 'A Faturar';
      const dataStr = getValue(idxData).trim();
      const latStr = getValue(idxLat).trim();
      const lngStr = getValue(idxLng).trim();
      const obs = getValue(idxObs).trim();
      const hInicio1 = getValue(idxHInicio1).trim();
      const hFim1 = getValue(idxHFim1).trim();
      const hInicio2 = getValue(idxHInicio2).trim();
      const hFim2 = getValue(idxHFim2).trim();
      
      if (!pedido) {
        errors.push(`Linha ${numLinha}: Coluna 'NumeroPedido' está vazia.`);
        continue;
      }
      if (!nota) {
        errors.push(`Linha ${numLinha}: Coluna 'NrNotaFiscal' está vazia.`);
        continue;
      }
      if (!cliente) {
        errors.push(`Linha ${numLinha}: Coluna 'NomeCliente' está vazia.`);
        continue;
      }
      
      const latNum = parseFloat(latStr.replace(',', '.'));
      const lngNum = parseFloat(lngStr.replace(',', '.'));
      const hasCoords = !isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0;
      
      if (!endereco && !hasCoords) {
        errors.push(`Linha ${numLinha} (Pedido ${pedido}): Deve conter 'EnderecoEntrega' ou 'LatitudeEntrega' e 'LongitudeEntrega' válidos.`);
        continue;
      }
      
      const valor = parseFloat(valorStr.replace(',', '.'));
      if (isNaN(valor)) {
        errors.push(`Linha ${numLinha} (Pedido ${pedido}): Coluna 'ValorRecebido' deve ser numérica (valor informado: '${valorStr}').`);
        continue;
      }
      
      parsedItems.push({
        NumeroPedido: pedido,
        NrNotaFiscal: nota,
        NomeCliente: cliente,
        EnderecoEntrega: endereco,
        Bairro: bairro,
        Cidade: cidade,
        CEP: cep,
        UFEntrega: uf,
        ValorRecebido: valor,
        TipoPagamento: pagamento,
        DataEntrega: dataStr,
        LatitudeEntrega: hasCoords ? String(latNum) : '',
        LongitudeEntrega: hasCoords ? String(lngNum) : '',
        Observacoes: obs,
        HoraRecebimentoInicio1: hInicio1,
        HoraRecebimentoFim1: hFim1,
        HoraRecebimentoInicio2: hInicio2,
        HoraRecebimentoFim2: hFim2
      });
    }
    
    setImportData(parsedItems);
    setImportErrors(errors);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    
    const reader = new FileReader();
    
    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          setImportErrors(['A planilha está vazia ou sem cabeçalhos.']);
          return;
        }
        
        const headerLine = lines[0];
        let separator = ';';
        if (headerLine.includes(',') && !headerLine.includes(';')) {
          separator = ',';
        }
        
        const headers = headerLine.split(separator).map(h => h.replace(/^"|"$/g, '').trim());
        processParsedRows(headers, lines.slice(1).map(line => {
          if (separator === ';') {
            return line.split(';').map(c => c.replace(/^"|"$/g, '').trim());
          } else {
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            return matches ? matches.map(c => c.replace(/^"|"$/g, '').trim()) : line.split(',').map(c => c.trim());
          }
        }));
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length <= 1) {
          setImportErrors(['A planilha está vazia ou sem cabeçalhos.']);
          return;
        }
        
        const headers = (rows[0] as any[]).map(h => String(h || '').trim());
        const dataRows = rows.slice(1).map(row => {
          const formattedRow: string[] = [];
          for (let colIdx = 0; colIdx < headers.length; colIdx++) {
            formattedRow.push(row[colIdx] !== undefined ? String(row[colIdx]) : '');
          }
          return formattedRow;
        });
        
        processParsedRows(headers, dataRows);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!user || !idLote || importData.length === 0) return;
    setImportLoading(true);
    try {
      const res = await importarEntregasLote({
        IdEmpresa: user.idEmpresa,
        IDLote: idLote,
        Entregas: importData,
        UsuarioNome: user.nomeUsuario
      });
      if (res && res.sucesso) {
        setShowImportModal(false);
        alert(res.mensagem || 'Importação realizada com sucesso!');
        window.location.reload();
      } else {
        alert('Erro ao importar: ' + (res.erro || 'Desconhecido'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro de conexão ao importar entregas: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const renderImportModal = () => {
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
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          fontFamily: "sans-serif",
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Importar Planilha de Entregas</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Selecione o arquivo Excel (.xlsx, .xls) ou CSV com as entregas.</p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#8c2cf5', background: '#f3f0ff', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Lote #{idLote}</span>
          </div>

          {/* Passo 1: Download de Modelo */}
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e9ecef' }}>
            <div>
              <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#495057', fontWeight: 700 }}>1. Planilha Modelo de Exemplo (.xlsx)</h5>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#868e96' }}>Baixe o modelo pré-formatado para preencher.</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{ background: '#ffffff', border: '1.5px solid #8c2cf5', color: '#8c2cf5', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Baixar Modelo
            </button>
          </div>

          {/* Passo 2: Upload de Arquivo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Upload do Arquivo (.xlsx, .xls, .csv)</label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{ padding: '12px', borderRadius: '10px', border: '1.5px dashed #ced4da', background: '#f8f9fe', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            />
          </div>

          {/* Resultados de Validação */}
          {(importData.length > 0 || importErrors.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h5 style={{ margin: 0, fontSize: '0.8rem', color: '#495057', fontWeight: 700 }}>Resumo do Processamento:</h5>
              
              {/* Sucesso */}
              {importData.length > 0 && (
                <div style={{ background: 'rgba(40, 167, 69, 0.1)', border: '1px solid rgba(40, 167, 69, 0.2)', padding: '10px 14px', borderRadius: '8px', color: '#28a745', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <Check size={16} /> ✓ {importData.length} entregas válidas e prontas para importação.
                </div>
              )}
              
              {/* Erros */}
              {importErrors.length > 0 && (
                <div style={{ background: 'rgba(220, 53, 69, 0.08)', border: '1px solid rgba(220, 53, 69, 0.15)', padding: '12px 14px', borderRadius: '8px', color: '#dc3545', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>⚠️ Encontrados {importErrors.length} erros de validação:</strong>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                    {importErrors.map((err, idx) => (
                      <span key={idx}>• {err}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid #f1f5f9', marginTop: '8px' }}>
            <button
              onClick={() => setShowImportModal(false)}
              style={{ padding: '10px 18px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
              disabled={importLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              style={{ padding: '10px 24px', border: 'none', borderRadius: '10px', background: (importLoading || importData.length === 0) ? '#d1d5db' : 'linear-gradient(135deg, #8c2cf5, #6d28d9)', color: '#fff', fontWeight: 700, cursor: (importLoading || importData.length === 0) ? 'not-allowed' : 'pointer', fontSize: '0.875rem', boxShadow: (importLoading || importData.length === 0) ? 'none' : '0 4px 14px rgba(140,44,245,0.3)' }}
              disabled={importLoading || importData.length === 0}
            >
              {importLoading ? 'Importando...' : 'Confirmar Importação'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const fetchLoteLogs = async () => {
    if (!user || !idLote) return;
    setLoadingLogs(true);
    try {
      const data = await buscarLogs(user.idEmpresa, Number(idLote));
      setLoteLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar logs do lote:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number, streetOnly = false): Promise<string> => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await res.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const routeComponent = result.address_components.find((c: any) => c.types.includes('route'));
        const streetNumberComponent = result.address_components.find((c: any) => c.types.includes('street_number'));
        
        if (routeComponent) {
          if (streetOnly) return routeComponent.long_name;
          const num = streetNumberComponent ? `, ${streetNumberComponent.long_name}` : '';
          return `${routeComponent.long_name}${num}`;
        }
        return result.formatted_address.split(',')[0];
      }
    } catch (e) {
      console.error('Erro no reverseGeocode:', e);
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const fetchAndProcessGpsTrace = async (pedido: string) => {
    if (!idLote) return;
    setLoadingGpsTrace(true);
    setGpsTrace(null);
    try {
      const allPoints = await buscarPontosGPS(idLote);
      const deliveryPoints = (allPoints || []).filter((p: any) => p.NumeroPedido === pedido);
      
      if (deliveryPoints.length === 0) {
        setGpsTrace(null);
        return;
      }

      // 1. Ponto Inicial (Partida)
      const firstPt = deliveryPoints[0];
      const startAddress = await reverseGeocode(firstPt.Latitude, firstPt.Longitude);
      const startTime = new Date(firstPt.DataRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 2. Ponto Final (Chegada)
      const lastPt = deliveryPoints[deliveryPoints.length - 1];
      const endAddress = await reverseGeocode(lastPt.Latitude, lastPt.Longitude);
      const endTime = new Date(lastPt.DataRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 3. Pontos intermediários
      const intermediateStreets: string[] = [];
      const sampledPoints: any[] = [];
      
      // Amostragem para evitar estouro da cota de requisições do Google
      const step = Math.max(1, Math.floor(deliveryPoints.length / 8));
      for (let i = 1; i < deliveryPoints.length - 1; i += step) {
        sampledPoints.push(deliveryPoints[i]);
      }

      for (const pt of sampledPoints) {
        const street = await reverseGeocode(pt.Latitude, pt.Longitude, true);
        if (
          street && 
          !intermediateStreets.includes(street) && 
          street !== startAddress.split(',')[0] && 
          street !== endAddress.split(',')[0]
        ) {
          intermediateStreets.push(street);
        }
      }

      setGpsTrace({
        start: { address: startAddress, time: startTime },
        end: { address: endAddress, time: endTime },
        streets: intermediateStreets
      });
    } catch (err) {
      console.error('Erro ao processar histórico de trajeto:', err);
    } finally {
      setLoadingGpsTrace(false);
    }
  };

  // Integração de busca automática por CEP (ViaCEP)
  const handleCepBlur = async () => {
    const cepLimpo = formCep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormEndereco(data.logradouro || '');
          setFormBairro(data.bairro || '');
          setFormCidade(data.localidade || '');
          setFormUf(data.uf || 'SP');
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      }
    }
  };

  const handleOpenAdd = () => {
    setFormPedido('');
    setFormNota('');
    setFormCliente('');
    setFormEndereco('');
    setFormBairro('');
    setFormCidade('Americana');
    setFormCep('');
    setFormUf('SP');
    setFormValor('0');
    setFormPagamento('A Faturar');
    setFormStatus('Pendente');
    setFormObs('');
    setFormDocRecebedor('');
    setFormNomeRecebimento('');
    setFormDataExigida('');
    setFormHoraExigida('');
    setFormHoraInicio1('');
    setFormHoraFim1('');
    setFormHoraInicio2('');
    setFormHoraFim2('');
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const hojeStr = `${dd}/${mm}/${yyyy}`;
    setFormDataEntrega(hojeStr);
    setShowAddModal(true);
  };

  const handleOpenEdit = (ent: any) => {
    setSelectedEntrega(ent);
    setFormPedido(ent.NumeroPedido || ent.NUMEROPEDIDO || '');
    setFormNota(ent.NrNotaFiscal || ent.NRNOTAFISCAL || '');
    setFormCliente(ent.NomeCliente || ent.NOMECLIENTE || '');
    setFormEndereco(ent.EnderecoEntrega || ent.ENDERECOENTREGA || '');
    setFormBairro(ent.Bairro || ent.BAIRRO || '');
    setFormCidade(ent.Cidade || ent.CIDADE || 'Americana');
    setFormCep(ent.CEP || ent.Cep || '');
    setFormUf(ent.UFEntrega || ent.UF || 'SP');
    setFormValor(String(ent.ValorRecebido || ent.VALORRECEBIDO || '0'));
    setFormPagamento(ent.TipoPagamento || ent.TIPOPAGAMENTO || 'A Faturar');
    setFormStatus(ent.StatusEntrega || ent.STATUSENTREGA || 'Pendente');
    setFormObs(ent.Observacoes || ent.OBSERVACOES || '');
    setFormDocRecebedor(ent.DocumentoRecebedor || ent.DOCUMENTORECEBEDOR || '');
    setFormNomeRecebimento(ent.NomeRecebimento || ent.NOMERECEBIMENTO || '');
    setFormDataExigida(ent.DataEntregaExigida || ent.DATAENTREGAEXIGIDA || '');
    setFormHoraExigida(ent.HoraEntregaExigida || ent.HORAENTREGAEXIGIDA || '');
    setFormHoraInicio1(ent.HoraRecebimentoInicio1 || ent.HORARECEBIMENTOINICIO1 || '');
    setFormHoraFim1(ent.HoraRecebimentoFim1 || ent.HORARECEBIMENTOFIM1 || '');
    setFormHoraInicio2(ent.HoraRecebimentoInicio2 || ent.HORARECEBIMENTOINICIO2 || '');
    setFormHoraFim2(ent.HoraRecebimentoFim2 || ent.HORARECEBIMENTOFIM2 || '');
    setFormDataEntrega(ent.DataEntrega || ent.DATAENTREGA || '');
    const pedido = ent.NumeroPedido || ent.NUMEROPEDIDO || '';
    if (pedido) {
      fetchAndProcessGpsTrace(pedido);
    }
    setShowEditModal(true);
  };

  const handleAddSubmit = async () => {
    if (!user || !idLote) return;
    if (!formPedido || !formNota || !formCliente || !formEndereco) {
      alert('Pedido, Nota Fiscal, Cliente e Endereço são obrigatórios!');
      return;
    }
    setFormLoading(true);
    try {
      await adicionarEntrega({
        IdEmpresa: user.idEmpresa,
        IDLote: idLote,
        NumeroPedido: formPedido,
        NrNotaFiscal: formNota,
        NomeCliente: formCliente,
        EnderecoEntrega: formEndereco,
        Bairro: formBairro,
        Cidade: formCidade,
        CEP: formCep,
        UFEntrega: formUf,
        ValorRecebido: Number(formValor),
        TipoPagamento: formPagamento,
        StatusEntrega: formStatus,
        Observacoes: formObs,
        DocumentoRecebedor: formDocRecebedor,
        NomeRecebimento: formNomeRecebimento,
        DataEntregaExigida: formDataExigida,
        HoraEntregaExigida: formHoraExigida,
        HoraRecebimentoInicio1: formHoraInicio1,
        HoraRecebimentoFim1: formHoraFim1,
        HoraRecebimentoInicio2: formHoraInicio2,
        HoraRecebimentoFim2: formHoraFim2,
        DataEntrega: formDataEntrega,
        UsuarioNome: user.nomeUsuario
      });
      setShowAddModal(false);
      fetchEntregas();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao adicionar entrega: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!user || !idLote || !selectedEntrega) return;
    if (!formCliente || !formEndereco) {
      alert('Cliente e Endereço são obrigatórios!');
      return;
    }
    setFormLoading(true);
    try {
      await editarEntrega({
        IdEmpresa: user.idEmpresa,
        IDLote: idLote,
        NumeroPedido: selectedEntrega.NumeroPedido,
        NrNotaFiscal: selectedEntrega.NrNotaFiscal,
        NomeCliente: formCliente,
        EnderecoEntrega: formEndereco,
        Bairro: formBairro,
        Cidade: formCidade,
        CEP: formCep,
        UFEntrega: formUf,
        ValorRecebido: Number(formValor),
        TipoPagamento: formPagamento,
        StatusEntrega: formStatus,
        Observacoes: formObs,
        DocumentoRecebedor: formDocRecebedor,
        NomeRecebimento: formNomeRecebimento,
        DataEntregaExigida: formDataExigida,
        HoraEntregaExigida: formHoraExigida,
        HoraRecebimentoInicio1: formHoraInicio1,
        HoraRecebimentoFim1: formHoraFim1,
        HoraRecebimentoInicio2: formHoraInicio2,
        HoraRecebimentoFim2: formHoraFim2,
        DataEntrega: formDataEntrega,
        UsuarioNome: user.nomeUsuario
      });
      setShowEditModal(false);
      fetchEntregas();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao editar entrega: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (ent: any) => {
    if (!user || !idLote) return;
    if (!window.confirm(`Deseja realmente excluir a entrega do cliente "${ent.NomeCliente || ent.NomeRecebimento}"?`)) return;
    try {
      await excluirEntrega({
        IdEmpresa: user.idEmpresa,
        IDLote: idLote,
        NumeroPedido: ent.NumeroPedido,
        NrNotaFiscal: ent.NrNotaFiscal,
        UsuarioNome: user.nomeUsuario
      });
      fetchEntregas();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir entrega: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const entregasRef = useRef(entregas);
  useEffect(() => {
    entregasRef.current = entregas;
  }, [entregas]);

  const checkIsLate = (ent: any) => {
    if (!ent.HoraEntregaPrevista) return false;
    const [hp, mp] = ent.HoraEntregaPrevista.split(':').map(Number);
    if (isNaN(hp) || isNaN(mp)) return false;
    const currentMin = hp * 60 + mp;

    const w1Def = ent.HoraRecebimentoInicio1 && ent.HoraRecebimentoFim1;
    const w2Def = ent.HoraRecebimentoInicio2 && ent.HoraRecebimentoFim2;

    if (w1Def || w2Def) {
      if (w1Def && w2Def) {
        const [h1, m1] = ent.HoraRecebimentoInicio1.split(':').map(Number);
        const [hf1, mf1] = ent.HoraRecebimentoFim1.split(':').map(Number);
        const [h2, m2] = ent.HoraRecebimentoInicio2.split(':').map(Number);
        const [hf2, mf2] = ent.HoraRecebimentoFim2.split(':').map(Number);
        
        const i1Min = h1 * 60 + m1;
        const f1Min = hf1 * 60 + mf1;
        const i2Min = h2 * 60 + m2;
        const f2Min = hf2 * 60 + mf2;

        if (currentMin < i1Min) {
          return false;
        }
        if (currentMin <= f1Min) {
          return false;
        }
        if (currentMin < i2Min) {
          return false;
        }
        return currentMin > (f2Min + 15);
      }
      
      if (w1Def) {
        const [hf1, mf1] = ent.HoraRecebimentoFim1.split(':').map(Number);
        return currentMin > (hf1 * 60 + mf1 + 15);
      }

      if (w2Def) {
        const [hf2, mf2] = ent.HoraRecebimentoFim2.split(':').map(Number);
        return currentMin > (hf2 * 60 + mf2 + 15);
      }
    }

    // Fallback para a HoraEntregaExigida antiga
    if (ent.HoraEntregaExigida) {
      const [he, me] = ent.HoraEntregaExigida.split(':').map(Number);
      if (!isNaN(he) && !isNaN(me)) {
        return currentMin > (he * 60 + me + 15);
      }
    }

    return false;
  };

  const getTempoTotalTrânsito = () => {
    if (entregas.length === 0) return '';
    const saida = entregas[0].HoraSaidaPrevista;
    const chegada = entregas[0].HoraRetornoPrevista || entregas[entregas.length - 1].HoraEntregaPrevista;
    if (!saida || !chegada) return '';
    
    const [h1, m1] = saida.split(':').map(Number);
    const [h2, m2] = chegada.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return '';
    
    let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMin < 0) {
      diffMin += 24 * 60;
    }
    
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    if (h > 0) {
      return `${h}h${m.toString().padStart(2, '0')}m`;
    }
    return `${m} min`;
  };

  const fetchEntregas = async () => {
    if (!user) return;
    if (!idLote) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const isAdm = user.tipoPessoaAtivo === 'Administrador';
      const result = await buscarEntregasPorLote(user.idEmpresa, isAdm ? '' : user.codigo, idLote);
      setEntregas(result || []);
      
      if (result && result.length > 0) {
        const horaBanco = result[0].HoraSaidaPrevista || '';
        setFormHoraSaida(horaBanco.substring(0, 5));
        
        if (result[0].TempoAtendimento !== undefined && result[0].TempoAtendimento !== null) {
          setFormTempoAtendimento(result[0].TempoAtendimento.toString());
        }

        setSelectedMotorista(String(result[0].CodigoMotorista || ''));

        const dataLoteBanco = result[0].DataLote || '';
        if (dataLoteBanco) {
          try {
            const isoDate = new Date(dataLoteBanco).toISOString().split('T')[0];
            setFormDataLote(isoDate);
          } catch (e) {
            console.error('Erro ao formatar DataLote:', e);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar entregas:', err);
      setEntregas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntregas();
    if (idLote && user) {
      fetchLoteLogs();
    }

    const handleFocus = () => {
      console.log('[Entregas] App ganhou foco/visibilidade. Atualizando entregas e logs...');
      fetchEntregas();
      if (idLote && user) {
        fetchLoteLogs();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [idLote, user, activeTab]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      try {
        const config = await buscarConfiguracoes(user.idEmpresa);
        setPermiteRoteirizar(!!config?.PermiteMotoristaRoteirizar);
      } catch (err) {
        console.error('Erro ao buscar configurações da empresa:', err);
      }
    };
    fetchConfig();
  }, [user]);

  useEffect(() => {
    const finishedLote = localStorage.getItem('lote_recem_finalizado');
    if (finishedLote && String(finishedLote) === String(idLote)) {
      setShowCelebration(true);
      localStorage.removeItem('lote_recem_finalizado');
    }
  }, [idLote]);

  useEffect(() => {
    const fetchMotoristasList = async () => {
      if (!user) return;
      try {
        const data = await listarMotoristas(user.idEmpresa);
        setMotoristas(data || []);
      } catch (err) {
        console.error('Erro ao buscar motoristas:', err);
      }
    };
    fetchMotoristasList();
  }, [user]);

  const handleMotoristaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoCodigo = Number(e.target.value);
    if (!novoCodigo || !user || !idLote) return;
    const motNome = motoristas.find(m => Number(m.Codigo) === novoCodigo)?.Nome || `Motorista ${novoCodigo}`;
    if (!window.confirm(`Deseja alterar o motorista deste lote para "${motNome}"?`)) {
      if (entregas.length > 0) {
        setSelectedMotorista(String(entregas[0].CodigoMotorista || ''));
      }
      return;
    }
    try {
      await alterarMotoristaLote(user.idEmpresa, idLote, novoCodigo);
      await criarLog(
        Number(user.idEmpresa),
        Number(idLote),
        user.nomeUsuario,
        'ALTERAR_MOTORISTA',
        `Alterou o motorista do lote para ${motNome}`
      );
      alert('Motorista alterado com sucesso!');
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao alterar motorista: ' + err.message);
      if (entregas.length > 0) {
        setSelectedMotorista(String(entregas[0].CodigoMotorista || ''));
      }
    }
  };

  const handleHoraSaidaBlur = async (e: any) => {
    if (!user || !idLote) return;
    try {
      await salvarHoraSaidaLote(user.idEmpresa, idLote, e.target.value);
      await criarLog(
        Number(user.idEmpresa), 
        Number(idLote), 
        user.nomeUsuario, 
        'ALTERACAO_ADM', 
        `Alterou a hora de saída do depósito para ${e.target.value}.`
      );
    } catch (err) {
      console.error('Erro ao salvar hora de saída:', err);
    }
  };

  const handleTempoAtendimentoBlur = async (e: any) => {
    if (!user || !idLote) return;
    try {
      await salvarTempoAtendimentoLote(user.idEmpresa, idLote, e.target.value);
      await criarLog(
        Number(user.idEmpresa), 
        Number(idLote), 
        user.nomeUsuario, 
        'ALTERACAO_ADM', 
        `Alterou o tempo de atendimento padrão para ${e.target.value} min.`
      );
    } catch (err) {
      console.error('Erro ao salvar tempo de atendimento:', err);
    }
  };

  const handleDataLoteBlur = async (e: any) => {
    if (!user || !idLote || !e.target.value) return;
    try {
      await salvarDataLote(user.idEmpresa, idLote, e.target.value);
      await criarLog(
        Number(user.idEmpresa), 
        Number(idLote), 
        user.nomeUsuario, 
        'ALTERACAO_ADM', 
        `Alterou a data das entregas do lote para ${e.target.value}.`
      );
      await fetchEntregas();
    } catch (err) {
      console.error('Erro ao salvar data do lote:', err);
    }
  };

  const handleRoteirizar = async () => {
    if (!user || !idLote) return;
    setRoteirizando(true);
    try {
      await roteirizarLote(user.idEmpresa, idLote, '1', formHoraSaida, formTempoAtendimento, user.nomeUsuario);
      setIsRouteForced(false); 
      await fetchEntregas();
    } catch (err) {
      console.error('Erro ao roteirizar:', err);
      alert('Erro ao roteirizar. Verifique se o serviço de rotas está ativo.');
    } finally {
      setRoteirizando(false);
    }
  };

  // Monta as URLs de navegação para Waze e Google Maps
  const buildNavUrls = (entrega: any) => {
    const lat = entrega.LatitudeEntrega || entrega.LATITUDE;
    const lng = entrega.LongitudeEntrega || entrega.LONGITUDE;
    const endereco = entrega.EnderecoEntrega || entrega.ENDERECO || '';

    let wazeUrl = '';
    let mapsUrl = '';

    if (lat && lng && lat !== '0' && lng !== '0') {
      wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    } else if (endereco) {
      wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`;
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}&travelmode=driving`;
    }
    return { wazeUrl, mapsUrl };
  };

  // Inicia GPS e dispara evento de entrega, depois abre o app escolhido
  const prosseguirNavegacao = (entrega: any, audio: HTMLAudioElement | null, navUrl: string) => {
    if (!user) return;
    adicionarGpsLog('Iniciando processo de entrega...');

    // Atualizar UI imediatamente
    setEntregas(prev => prev.map(ent => {
      if (String(ent.NumeroPedido) === String(entrega.NumeroPedido)) {
        return { ...ent, StatusEntrega: 'Em Transporte', SITUACAOENTREGA: 'Em Transporte' };
      }
      return ent;
    }));

    // Ativar widget flutuante
    setEntregaEmTransporte(entrega);

    // Disparar GPS
    window.dispatchEvent(new CustomEvent('iniciar-gps', {
      detail: {
        idEmpresa: String(entrega.IDEmpresa || user.idEmpresa),
        idLote: String(idLote),
        numeroPedido: String(entrega.NumeroPedido),
        audioElement: audio
      }
    }));

    // Gravar evento e abrir app de navegação
    const chave = `${entrega.IDEmpresa || user.idEmpresa}${idLote}${entrega.NumeroPedido}`;
    gravarEvento(user.codigo, user.codigo, 'InicioEntrega', chave)
      .then(() => fetchEntregas())
      .catch(() => {})
      .finally(() => {
        adicionarGpsLog(`Abrindo navegador: ${navUrl}`);
        if (navUrl) window.open(navUrl, '_blank');
      });
  };

  const handleIniciarEntrega = async (entrega: any) => {
    if (!user) return;

    const { wazeUrl, mapsUrl } = buildNavUrls(entrega);

    // Iniciar áudio silencioso no gesto de clique (obrigatório para mobile)
    let audio: HTMLAudioElement | null = null;
    try {
      if ('audioSession' in navigator) {
        try { (navigator as any).audioSession.type = 'playback'; } catch (e) {}
      }
      audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
      audio.loop = true;
      audio.play().then(() => {
        (window as any)._gpsSilentAudio = audio;
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Rastreamento MagicRoute',
            artist: 'Em Transporte',
            album: 'GPS Ativo'
          });
        }
      }).catch(() => {});
    } catch (e) {}

    // Pedir permissão de localização
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização.');
      // Sem geolocalização: mostrar modal de escolha mesmo assim
      setNavModalEntrega(entrega);
      setNavModalAudio(audio);
      setShowNavModal(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        // Permissão concedida: mostrar modal de escolha de app
        setNavModalEntrega(entrega);
        setNavModalAudio(audio);
        setShowNavModal(true);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          if (audio) { try { audio.pause(); (window as any)._gpsSilentAudio = null; } catch (e) {} }
          alert(
            "Atenção: Acesso à localização foi negado.\n\n" +
            "O rastreamento não funcionará até que você conceda permissão nas configurações do celular."
          );
        }
        // Mesmo sem GPS, mostrar modal para o usuário escolher o navegador
        setNavModalEntrega(entrega);
        setNavModalAudio(audio);
        setShowNavModal(true);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
    );

    // Silenciar linter — wazeUrl e mapsUrl são usados no modal
    void wazeUrl; void mapsUrl;
  };



  const handleCancelarInicio = async (entrega: any) => {
    if (!user) return;
    const confirm = window.confirm("Deseja realmente cancelar o trajeto iniciado de entrega?");
    if (!confirm) return;

    // Disparar parada do GPS
    window.dispatchEvent(new CustomEvent('parar-gps'));

    // Limpar metadados de mídia
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
    }

    // Atualizar UI imediatamente para 'Pendente'
    setEntregas(prev => prev.map(ent => {
      if (String(ent.NumeroPedido) === String(entrega.NumeroPedido)) {
        return { ...ent, StatusEntrega: 'Pendente', SITUACAOENTREGA: 'Pendente' };
      }
      return ent;
    }));
    setEntregaEmTransporte(null); // Remover widget flutuante

    const chave = `${entrega.IDEmpresa || user.idEmpresa}${idLote}${entrega.NumeroPedido}`;
    try {
      await gravarEvento(user.codigo, user.codigo, 'LimpaInicioFinalEntrega', chave);
      window.location.reload(); // Recarrega a página para atualizar o status limpo da base (evita race condition no fetch)
    } catch (err) {
      console.error('Erro ao cancelar início da entrega:', err);
    }
  };

  const handleFinalizarEntrega = async (entrega: any) => {
    if (!user) return;
    const chave = `${entrega.IDEmpresa || user.idEmpresa}${idLote}${entrega.NumeroPedido}`;
    
    // Disparar parada do rastreamento GPS
    window.dispatchEvent(new CustomEvent('parar-gps'));
    setEntregaEmTransporte(null); // Remover widget flutuante

    try {
      // Verificar se esta é a última entrega pendente
      const pendentes = entregas.filter(e => {
        const s = (e.StatusEntrega || e.SITUACAOENTREGA || '').toLowerCase();
        return !s.includes('entregue') && !s.includes('concluido') && !s.includes('finalizada');
      });

      await gravarEvento(user.codigo, user.codigo, 'FimEntrega', chave);
      
      if (pendentes.length === 1 && String(pendentes[0].NumeroPedido) === String(entrega.NumeroPedido)) {
        localStorage.setItem('lote_recem_finalizado', idLote);
      }
      
      window.location.reload();
    } catch (err) {
      console.error('Erro ao finalizar entrega:', err);
    }
  };

  const handleReabrirEntrega = async (entrega: any) => {
    if (!user) return;
    const chave = `${entrega.IDEmpresa || user.idEmpresa}${idLote}${entrega.NumeroPedido}`;
    
    // Limpar qualquer rastreamento ativo
    window.dispatchEvent(new CustomEvent('parar-gps'));

    try {
      await gravarEvento(user.codigo, user.codigo, 'LimpaInicioFinalEntrega', chave);
      window.location.reload();
    } catch (err) {
      console.error('Erro ao reabrir entrega:', err);
    }
  };

  const handleFinalizarLote = async () => {
    if (!user || !idLote) return;
    if (!window.confirm('Deseja realmente dar baixa / finalizar este lote de entrega?')) return;
    try {
      await finalizarLote(user.idEmpresa, idLote, user.nomeUsuario);
      fetchEntregas();
    } catch (err: any) {
      alert('Erro ao finalizar lote: ' + err.message);
    }
  };

  const handleReabrirLote = async () => {
    if (!user || !idLote) return;
    if (!window.confirm('Deseja realmente reabrir este lote de entrega?')) return;
    try {
      await reabrirLote(user.idEmpresa, idLote, user.nomeUsuario);
      fetchEntregas();
    } catch (err: any) {
      alert('Erro ao reabrir lote: ' + err.message);
    }
  };

  const handleAbrirMapa = (entrega: any) => {
    const lat = entrega.LatitudeEntrega || entrega.LATITUDE;
    const lng = entrega.LongitudeEntrega || entrega.LONGITUDE;
    const endereco = entrega.EnderecoEntrega || entrega.ENDERECO || '';

    if (lat && lng && lat !== '0' && lng !== '0') {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    } else if (endereco) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(endereco)}`, '_blank');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  };

  const handleDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === overIndex) return;

    const listCopy = [...entregas];
    const draggedItem = listCopy[draggedIndex];
    listCopy.splice(draggedIndex, 1);
    listCopy.splice(overIndex, 0, draggedItem);
    
    setDraggedIndex(overIndex);
    setEntregas(listCopy);
  };

  const handleDragEnd = async (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedIndex(null);

    if (!user || !idLote) return;
    try {
      await Promise.all(
        entregasRef.current.map((entrega, idx) => {
          const nf = entrega.NrNotaFiscal || entrega.NRDOCUMENTO || '';
          return atualizarSequencia(user.idEmpresa, idLote, nf, idx + 1);
        })
      );
      
      await roteirizarLote(user.idEmpresa, idLote, '0', formHoraSaida, formTempoAtendimento, user.nomeUsuario);
      setIsRouteForced(true);
      
      await fetchEntregas();
    } catch (err) {
      console.error('Erro ao atualizar sequencias:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('entregue') && !s.includes('não')) return 'badge-success';
    if (s.includes('transporte')) return 'badge-info';
    if (s.includes('pendente')) return 'badge-warning';
    return 'badge-danger';
  };

  const isAdm = user?.tipoPessoaAtivo === 'Administrador';
  const loteSituacao = entregas.length > 0 ? (entregas[0].SituacaoLote || 'Em Aberto') : 'Em Aberto';

  const formatCPF_CNPJ = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      v = v.replace(/^(\d{2})(\d)/, "$1.$2");
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
      v = v.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v;
  };

  const formatCEP = (val: string) => {
    let v = val.replace(/\D/g, "");
    v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    return v.substring(0, 9);
  };

  const formatDate = (val: string) => {
    let v = val.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/, "$1/$2");
    v = v.replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
    return v.substring(0, 10);
  };

  const formatTime = (val: string) => {
    let v = val.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/, "$1:$2");
    return v.substring(0, 5);
  };

  const renderFormModal = (title: string, onSubmit: () => void, isNew: boolean) => {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f1f3f5', paddingBottom: '12px', boxSizing: 'border-box' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#212529' }}>{title}</h3>
            <span style={{ fontSize: '0.75rem', color: '#868e96', background: '#f1f3f5', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Lote #{idLote}</span>
          </div>
          
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dados do Pedido e Status</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Número Pedido *</label>
                <input 
                  type="text" 
                  value={formPedido} 
                  onChange={(e) => setFormPedido(e.target.value)}
                  disabled={!isNew}
                  required
                  placeholder="Ex: P001"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: !isNew ? '#e9ecef' : '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Nota Fiscal *</label>
                <input 
                  type="text" 
                  value={formNota} 
                  onChange={(e) => setFormNota(e.target.value)}
                  disabled={!isNew}
                  required
                  placeholder="Ex: NF101A"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: !isNew ? '#e9ecef' : '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Status da Entrega</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem', height: '37px' }}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Transporte">Em Transporte</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Nao Entregue">Não Entregue</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destinatário e Recebimento</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Nome do Cliente *</label>
                <input 
                  type="text" 
                  value={formCliente} 
                  onChange={(e) => setFormCliente(e.target.value)}
                  required
                  placeholder="Nome Completo do Cliente"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Nome do Recebedor</label>
                  <input 
                    type="text" 
                    value={formNomeRecebimento} 
                    onChange={(e) => setFormNomeRecebimento(e.target.value)}
                    placeholder="Nome de quem assinou"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Documento Recebedor (CPF/RG)</label>
                  <input 
                    type="text" 
                    value={formDocRecebedor} 
                    onChange={(e) => setFormDocRecebedor(formatCPF_CNPJ(e.target.value))}
                    placeholder="Documento de quem assinou"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
              <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endereço de Entrega</h4>
              <span style={{ fontSize: '0.65rem', background: 'rgba(140, 44, 245, 0.08)', color: '#8c2cf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Busca CEP integrada</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>CEP (Auto-preenche ao sair) *</label>
                  <input 
                    type="text" 
                    value={formCep} 
                    onChange={(e) => setFormCep(formatCEP(e.target.value))}
                    onBlur={handleCepBlur}
                    required
                    placeholder="Ex: 13400-000"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Endereço Completo (Rua, Nº) *</label>
                  <input 
                    type="text" 
                    value={formEndereco} 
                    onChange={(e) => setFormEndereco(e.target.value)}
                    required
                    placeholder="Rua, Avenida, Número, Complemento"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Bairro *</label>
                  <input 
                    type="text" 
                    value={formBairro} 
                    onChange={(e) => setFormBairro(e.target.value)}
                    required
                    placeholder="Bairro"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Cidade *</label>
                  <input 
                    type="text" 
                    value={formCidade} 
                    onChange={(e) => setFormCidade(e.target.value)}
                    required
                    placeholder="Cidade"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>UF *</label>
                  <input 
                    type="text" 
                    value={formUf} 
                    onChange={(e) => setFormUf(e.target.value)}
                    required
                    placeholder="SP"
                    maxLength={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valores e Prazo de Entrega</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Valor Receber (R$)</label>
                <input 
                  type="number" 
                  value={formValor} 
                  onChange={(e) => setFormValor(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Tipo de Pagamento</label>
                <select
                  value={formPagamento}
                  onChange={(e) => setFormPagamento(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem', height: '37px' }}
                >
                  <option value="A Faturar">A Faturar</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartao Credito">Cartão de Crédito</option>
                  <option value="Cartao Debito">Cartão de Débito</option>
                  <option value="Pix">Pix</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Data Entrega *</label>
                <input 
                  type="text" 
                  value={formDataEntrega} 
                  onChange={(e) => setFormDataEntrega(formatDate(e.target.value))}
                  placeholder="DD/MM/YYYY"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Data Exigida</label>
                <input 
                  type="text" 
                  value={formDataExigida} 
                  onChange={(e) => setFormDataExigida(formatDate(e.target.value))}
                  placeholder="DD/MM/YYYY"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Hora Exigida</label>
                <input 
                  type="text" 
                  value={formHoraExigida} 
                  onChange={(e) => setFormHoraExigida(formatTime(e.target.value))}
                  placeholder="HH:MM"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Janelas de Recebimento (Horários do Cliente)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ borderRight: '1.5px dashed #eaeaea', paddingRight: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Janela 1 (Ex: Manhã)</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', boxSizing: 'border-box' }}>
                  <input 
                    type="text" 
                    value={formHoraInicio1} 
                    onChange={(e) => setFormHoraInicio1(formatTime(e.target.value))}
                    placeholder="Início (08:00)"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#868e96' }}>até</span>
                  <input 
                    type="text" 
                    value={formHoraFim1} 
                    onChange={(e) => setFormHoraFim1(formatTime(e.target.value))}
                    placeholder="Fim (11:30)"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Janela 2 (Ex: Tarde)</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', boxSizing: 'border-box' }}>
                  <input 
                    type="text" 
                    value={formHoraInicio2} 
                    onChange={(e) => setFormHoraInicio2(formatTime(e.target.value))}
                    placeholder="Início (14:40)"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#868e96' }}>até</span>
                  <input 
                    type="text" 
                    value={formHoraFim2} 
                    onChange={(e) => setFormHoraFim2(formatTime(e.target.value))}
                    placeholder="Fim (18:00)"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Observações / Instruções Especiais</label>
            <textarea 
              value={formObs} 
              onChange={(e) => setFormObs(e.target.value)}
              placeholder="Ex: Deixar na portaria com o zelador..."
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'sans-serif' }}
            />
          </div>

          {!isNew && (
            <div style={{ background: '#f3f0ff', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', border: '1.5px solid #dcd3ff' }}>
              <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trajeto Realizado pelo Motorista (GPS)</h4>
              
              {loadingGpsTrace ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#6c757d' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #eaeaea', borderTopColor: '#8c2cf5' }} />
                  <span>Carregando histórico de ruas...</span>
                </div>
              ) : gpsTrace ? (
                <div style={{ fontSize: '0.85rem', color: '#495057', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#2a9d8f', fontWeight: 'bold' }}>Iniciou às {gpsTrace.start.time}:</span>
                    <span style={{ fontWeight: 600 }}>{gpsTrace.start.address}</span>
                  </div>
                  
                  {gpsTrace.streets.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <span style={{ color: '#8c2cf5', fontWeight: 'bold' }}>Percurso:</span>
                      <span style={{ color: '#495057', fontWeight: 500, background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                        {gpsTrace.streets.join(' ➔ ')}
                      </span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#e63946', fontWeight: 'bold' }}>Finalizou às {gpsTrace.end.time}:</span>
                    <span style={{ fontWeight: 600 }}>{gpsTrace.end.address}</span>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#868e96', fontStyle: 'italic' }}>
                  Nenhum trajeto de GPS capturado para esta entrega.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1.5px solid #f1f3f5', paddingTop: '16px', boxSizing: 'border-box' }}>
            <button 
              type="button"
              onClick={() => {
                if (isNew) setShowAddModal(false);
                else setShowEditModal(false);
              }}
              style={{ padding: '10px 18px', border: '1.5px solid #eaeaea', borderRadius: '8px', background: '#ffffff', color: '#495057', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              disabled={formLoading}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              style={{ padding: '10px 22px', border: 'none', borderRadius: '8px', background: '#8c2cf5', color: '#ffffff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(140, 44, 245, 0.2)', fontSize: '0.85rem' }}
              disabled={formLoading}
            >
              {formLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderRomaneio = () => {
    const primeiraEntrega = entregas[0] || {};
    const isMotorista2 = String(primeiraEntrega.CodigoMotorista) === '2';
    const motoristaNome = isMotorista2 ? 'John Eric' : 'Carlos Eduardo';
    const veiculoNome = primeiraEntrega.Veiculo || (isMotorista2 ? 'VW 3201' : 'Fiorino');
    const placaVei = primeiraEntrega.PlacaEntrega || (isMotorista2 ? 'ACE4848' : 'ABC4321');

    return (
      <div id="romaneio-impressao" style={{ display: 'none' }}>
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #romaneio-impressao, #romaneio-impressao * {
              visibility: visible;
            }
            #romaneio-impressao {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              font-family: Arial, sans-serif;
              color: #000;
              display: block !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>MAGICROUTE • ROMANEIO DE ENTREGA</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#333' }}>Sistema de Roteirização Inteligente</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Lote #{idLote}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '15px', background: '#f8f9fa', padding: '12px', border: '1px solid #ccc', borderRadius: '6px', marginBottom: '20px', fontSize: '12px' }}>
          <div>
            <p style={{ margin: 0 }}><strong>Motorista:</strong> {motoristaNome}</p>
            <p style={{ margin: '4px 0 0 0' }}><strong>Veículo:</strong> {veiculoNome} ({placaVei})</p>
          </div>
          <div>
            <p style={{ margin: 0 }}><strong>Qtd. Entregas:</strong> {entregas.length}</p>
            <p style={{ margin: '4px 0 0 0' }}><strong>Situação:</strong> Em Rota de Carga</p>
          </div>
          <div>
            <p style={{ margin: 0 }}><strong>KM Saída:</strong> ____________________</p>
            <p style={{ margin: '4px 0 0 0' }}><strong>Hora Saída:</strong> __________________</p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '6px', width: '30px', textAlign: 'center' }}>Seq</th>
              <th style={{ border: '1px solid #000', padding: '6px', width: '70px' }}>Pedido/NF</th>
              <th style={{ border: '1px solid #000', padding: '6px', width: '140px' }}>Cliente</th>
              <th style={{ border: '1px solid #000', padding: '6px' }}>Endereço Completo</th>
              <th style={{ border: '1px solid #000', padding: '6px', width: '70px', textAlign: 'center' }}>Valor/Pgto</th>
              <th style={{ border: '1px solid #000', padding: '6px', width: '160px', textAlign: 'center' }}>Assinatura / Recebedor</th>
            </tr>
          </thead>
          <tbody>
            {entregas.map((ent, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                  {ent.SequenciaRoteirizada || ent.SequenciaOriginal || idx + 1}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px' }}>
                  {ent.NumeroPedido || 'N/A'}<br />
                  <span style={{ fontSize: '9px', color: '#666' }}>NF: {ent.NrNotaFiscal || 'N/A'}</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>
                  {ent.NomeCliente || 'N/A'}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', fontSize: '10px' }}>
                  {ent.EnderecoEntrega || 'N/A'}, {ent.Bairro || 'N/A'} - {ent.Cidade || 'N/A'}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  R$ {ent.ValorRecebido || '0,00'}<br />
                  <span style={{ fontSize: '9px', color: '#666' }}>{ent.TipoPagamento || 'A Faturar'}</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', height: '35px', verticalAlign: 'bottom', fontSize: '8px', color: '#999' }}>
                  Doc: _______________________
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontSize: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0 }}>________________________________________________</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>Assinatura do Motorista ({motoristaNome})</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0 }}>________________________________________________</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>Conferido por (Expedição)</p>
          </div>
        </div>
      </div>
    );
  };

  if (isAdm) {
    if (!idLote) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', fontFamily: 'sans-serif', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <Package size={64} style={{ color: '#8c2cf5', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#495057', marginBottom: '8px', fontWeight: 700 }}>Nenhum Lote Selecionado</h3>
          <p style={{ color: '#6c757d', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center', margin: '0 0 16px 0' }}>
            Vá para a tela de <strong>Rotas</strong> ou <strong>Dashboard</strong> e clique nas ações de uma rota ativa para abrir as entregas.
          </p>
          <button 
            onClick={() => navigate('/rotas')}
            style={{ background: '#8c2cf5', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(140, 44, 245, 0.2)' }}
          >
            Ver Rotas
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => navigate('/rotas')} 
                style={{ background: '#ffffff', border: '1.5px solid #eaeaea', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#495057' }}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#333', margin: 0 }}>Entregas do Lote #{idLote}</h1>
                <p style={{ fontSize: '0.85rem', color: '#868e96', margin: '4px 0 0 0' }}>Administração, edição e sequenciamento da rota</p>
                {entregas.length > 0 && entregas[0].HoraSaidaPrevista && (
                  <p style={{ fontSize: '0.85rem', color: '#2a9d8f', fontWeight: 700, margin: '4px 0 0 0' }}>
                    Início Previsto: {entregas[0].HoraSaidaPrevista} • Fim Estimado: {entregas[0].HoraRetornoPrevista || entregas[entregas.length - 1].HoraEntregaPrevista} {getTempoTotalTrânsito() && `• Em Trânsito: ${getTempoTotalTrânsito()}`}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              onClick={handlePrint}
              style={{ background: '#ffffff', border: '1.5px solid #eaeaea', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#495057', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              <Printer size={16} /> Imprimir Lote
            </button>
            <button 
              onClick={() => navigate(`/mapa?idLote=${idLote}`)}
              style={{ background: '#ffffff', border: '1.5px solid #eaeaea', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0c8599', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              <Compass size={16} /> Ver no Mapa
            </button>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #eaeaea' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#495057', marginRight: '8px' }}>Data Entrega:</label>
              <input 
                type="date" 
                value={formDataLote}
                onChange={(e) => setFormDataLote(e.target.value)}
                onBlur={handleDataLoteBlur}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#333' }}
              />
            </div>

            {motoristas.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #eaeaea' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#495057', marginRight: '8px' }}>Motorista:</label>
                <select 
                  value={selectedMotorista}
                  onChange={handleMotoristaChange}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#333', cursor: 'pointer' }}
                >
                  <option value="">Selecione...</option>
                  {motoristas.map((m: any) => (
                    <option key={m.Codigo} value={String(m.Codigo)}>
                      {m.Nome || `Motorista ${m.Codigo}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #eaeaea' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#495057', marginRight: '8px' }}>Saída (opcional):</label>
              <input 
                type="time" 
                value={formHoraSaida}
                onChange={(e) => setFormHoraSaida(e.target.value)}
                onBlur={handleHoraSaidaBlur}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#333' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #eaeaea' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#495057', marginRight: '8px' }}>Tempo/Parada (min):</label>
              <input 
                type="number"
                placeholder="Padrão"
                value={formTempoAtendimento}
                onChange={(e) => setFormTempoAtendimento(e.target.value)}
                onBlur={handleTempoAtendimentoBlur}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#333', width: '60px' }}
              />
            </div>
            <button 
              onClick={handleRoteirizar}
              disabled={roteirizando}
              style={{ background: '#ffffff', border: '1.5px solid #eaeaea', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#8c2cf5', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              {roteirizando ? <Loader2 size={16} className="spinner" /> : <RefreshCw size={16} />} 
              {roteirizando ? 'Roteirizando...' : 'Roteirizar Lote'}
            </button>
            {isRouteForced && (
              <span style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                ⚠️ Rota Manual (Forçada)
              </span>
            )}
            <button 
              onClick={() => {
                setImportFile(null);
                setImportData([]);
                setImportErrors([]);
                setShowImportModal(true);
              }}
              style={{ background: '#ffffff', border: '1.5px solid #eaeaea', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#495057', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              <Upload size={16} /> Importar Planilha
            </button>
            <button 
              onClick={handleOpenAdd}
              style={{ background: '#8c2cf5', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(140, 44, 245, 0.2)' }}
            >
              <Plus size={16} /> Adicionar Entrega
            </button>

            {loteSituacao === 'Concluido' ? (
              <button 
                onClick={handleReabrirLote}
                style={{ background: '#ffc107', color: '#212529', border: 'none', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                <RotateCcw size={16} /> Reabrir Lote
              </button>
            ) : (
              <button 
                onClick={handleFinalizarLote}
                style={{ background: '#28a745', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(40, 167, 69, 0.2)' }}
              >
                <CheckCircle2 size={16} /> Dar Baixa no Lote
              </button>
            )}
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #eaeaea', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('entregas')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'entregas' ? '3px solid #8c2cf5' : '3px solid transparent',
              color: activeTab === 'entregas' ? '#8c2cf5' : '#868e96',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <List size={16} /> Entregas da Rota
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'logs' ? '3px solid #8c2cf5' : '3px solid transparent',
              color: activeTab === 'logs' ? '#8c2cf5' : '#868e96',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <History size={16} /> Histórico de Logs
          </button>
        </div>

        {activeTab === 'logs' ? (
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1.5px solid #eaeaea' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', marginBottom: '16px' }}>Histórico de Atividades do Lote #{idLote}</h3>
            {loadingLogs ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
                <Loader2 size={36} className="spinner" style={{ color: '#8c2cf5' }} />
                <p style={{ color: '#868e96', fontSize: '0.9rem' }}>Carregando histórico...</p>
              </div>
            ) : loteLogs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#868e96', gap: '12px' }}>
                <History size={48} style={{ opacity: 0.25 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Nenhum log registrado para este lote.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                {/* Linha vertical do Timeline */}
                <div style={{
                  position: 'absolute',
                  left: '17px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  background: '#eaeaea',
                  zIndex: 1
                }} />

                {loteLogs.map((log, index) => {
                  let badgeBg = '#f1f3f5';
                  let badgeColor = '#495057';
                  if (log.TipoAcao === 'ENTREGUE') { badgeBg = '#e6fcf5'; badgeColor = '#0ca678'; }
                  else if (log.TipoAcao === 'INICIO_ENTREGA') { badgeBg = '#e3fafc'; badgeColor = '#0b7285'; }
                  else if (log.TipoAcao === 'REORDENACAO_ROTA') { badgeBg = '#f3f0ff'; badgeColor = '#7048e8'; }
                  else if (log.TipoAcao === 'ALTERACAO_ADM') { badgeBg = '#fff9db'; badgeColor = '#f08c00'; }

                  return (
                    <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                      {/* Círculo do Timeline */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '2px solid #8c2cf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8c2cf5',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        {loteLogs.length - index}
                      </div>

                      {/* Conteúdo do Log */}
                      <div style={{
                        flex: 1,
                        background: '#f8f9fe',
                        borderRadius: '10px',
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        border: '1px solid #f1f3f5'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#868e96' }}>
                            {new Date(log.DataCriacao).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#495057', lineHeight: '1.4' }}>
                          {log.Descricao}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Tabela de Entregas */
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1.5px solid #eaeaea' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
                <Loader2 size={36} className="spinner" style={{ color: '#8c2cf5' }} />
                <p style={{ color: '#868e96', fontSize: '0.9rem' }}>Carregando entregas...</p>
              </div>
            ) : entregas.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
                <Package size={48} style={{ color: '#8c2cf5', opacity: 0.3, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#495057', margin: 0 }}>Nenhuma entrega cadastrada</h3>
                <p style={{ fontSize: '0.85rem', color: '#868e96', margin: '4px 0 0 0' }}>Clique em "Adicionar Entrega" para registrar a primeira parada do lote.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #f1f3f5' }}>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Seq</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Pedido</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>NF</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Cliente</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Endereço</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Bairro</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Cidade</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Data</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Exigida</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Viagem</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Chegada</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entregas.map((ent, idx) => {
                      const status = (ent.StatusEntrega || 'Pendente').toLowerCase();
                      let badgeBg = '#f1f3f5';
                      let badgeColor = '#495057';
                      let statusText = 'Pendente';

                      if (status.includes('progresso') || status.includes('transporte')) {
                        badgeBg = '#e3fafc';
                        badgeColor = '#0c8599';
                        statusText = 'Em Transporte';
                      } else if (status.includes('entregue') || status.includes('concluido') || status.includes('finalizada')) {
                        badgeBg = 'rgba(42, 157, 143, 0.1)';
                        badgeColor = '#2a9d8f';
                        statusText = 'Entregue';
                      }
                      const isEntregue = statusText === 'Entregue';

                      return (
                        <tr 
                          key={idx} 
                          draggable={!isEntregue}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          style={{ 
                            borderBottom: '1px solid #f1f3f5',
                            cursor: isEntregue ? 'default' : 'grab',
                            opacity: isEntregue ? 0.65 : 1,
                            background: draggedIndex === idx ? '#f8f9fe' : '#ffffff'
                          }}
                        >
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', fontWeight: 700, color: '#495057' }}>
                            {ent.SequenciaRoteirizada || ent.SequenciaOriginal || idx + 1}
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', fontWeight: 600 }}>{ent.NumeroPedido || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#495057' }}>{ent.NrNotaFiscal || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', fontWeight: 700, color: '#8c2cf5' }}>{ent.NomeCliente || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#495057' }}>{ent.EnderecoEntrega || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#495057' }}>{ent.Bairro || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#495057' }}>{ent.Cidade || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#495057' }}>{ent.DataEntrega || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.82rem', color: (ent.HoraRecebimentoInicio1 || ent.HoraRecebimentoInicio2 || ent.HoraEntregaExigida) ? '#e67700' : '#adb5bd', fontWeight: 600 }}>
                            {(() => {
                              const w1 = (ent.HoraRecebimentoInicio1 && ent.HoraRecebimentoFim1)
                                ? `${ent.HoraRecebimentoInicio1}-${ent.HoraRecebimentoFim1}`
                                : '';
                              const w2 = (ent.HoraRecebimentoInicio2 && ent.HoraRecebimentoFim2)
                                ? `${ent.HoraRecebimentoInicio2}-${ent.HoraRecebimentoFim2}`
                                : '';
                              
                              if (w1 && w2) return `${w1} | ${w2}`;
                              if (w1) return w1;
                              if (w2) return w2;
                              return ent.HoraEntregaExigida || '—';
                            })()}
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#6c757d', fontWeight: 600 }}>{ent.TempoPrevistoEntrega || 'N/A'}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', fontWeight: 600, color: checkIsLate(ent) ? '#e63946' : '#2a9d8f' }}>
                            {ent.HoraEntregaPrevista || 'N/A'}
                            {checkIsLate(ent) && (
                              <span title="Atraso previsto" style={{ marginLeft: '4px', fontSize: '0.7rem' }}>⚠️</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{ background: badgeBg, color: badgeColor, fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px' }}>
                              {statusText}
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleOpenEdit(ent)}
                                style={{ background: '#f1f3f5', border: 'none', color: '#495057', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit size={12} /> Editar
                              </button>
                              <button 
                                onClick={() => handleDelete(ent)}
                                style={{ background: '#fff5f5', border: 'none', color: '#e63946', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={12} /> Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {entregas.length > 0 && entregas[0].HoraRetornoPrevista && (
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eaeaea' }}>
                        <td colSpan={7} style={{ padding: '14px 8px', fontSize: '0.85rem', fontWeight: 700, color: '#495057', textAlign: 'right' }}>
                          Retorno ao Depósito (Fim da Rota)
                        </td>
                        <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#6c757d', fontWeight: 600 }}>-</td>
                        <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: '#2a9d8f', fontWeight: 600 }}>
                          {entregas[0].HoraRetornoPrevista}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal de Adicionar Entrega */}
        {showAddModal && renderFormModal('Adicionar Nova Entrega', handleAddSubmit, true)}

        {/* Modal de Editar Entrega */}
        {showEditModal && renderFormModal('Editar Entrega', handleEditSubmit, false)}

        {/* Modal de Importar Planilha */}
        {showImportModal && renderImportModal()}

        {/* Romaneio de Impressão para o Motorista */}
        {renderRomaneio()}
      </div>
    );
  }

  if (!idLote) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          background: '#8c2cf5',
          padding: '24px 16px',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative',
        }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>Entregas</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <Package size={64} style={{ color: '#8c2cf5', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#495057', marginBottom: '8px' }}>Nenhum Lote Selecionado</h3>
          <p style={{ color: '#6c757d', fontSize: '0.9rem', maxWidth: '300px' }}>
            Vá para a tela <strong>Início</strong> e clique na lista para abrir as entregas do lote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Header Roxo com botão voltar e badge do Lote (Imagem 3) */}
      <div style={{
        background: '#8c2cf5',
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) 16px 24px 16px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 10px rgba(140, 44, 245, 0.15)',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
      }}>
        <button 
          onClick={() => {
            window.location.hash = '#/inicio';
            window.location.reload();
          }}
          style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={24} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Entregas Pendentes
          </h1>
          {entregas.length > 0 && entregas[0].HoraSaidaPrevista && (
            <p style={{ fontSize: '0.75rem', opacity: 0.9, margin: '2px 0 0 0', fontWeight: 600 }}>
              Início: {entregas[0].HoraSaidaPrevista} • Fim: {entregas[0].HoraRetornoPrevista || entregas[entregas.length - 1].HoraEntregaPrevista} {getTempoTotalTrânsito() && `• Trânsito: ${getTempoTotalTrânsito()}`}
            </p>
          )}
        </div>

        {/* Badge do lote */}
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '6px 12px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '0.9rem',
        }}>
          [{idLote}]
        </div>
      </div>

      {/* Lista de Entregas */}
      <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', paddingBottom: '90px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
            <div className="spinner" style={{ borderColor: '#eaeaea', borderTopColor: '#8c2cf5' }} />
            <p style={{ color: '#868e96', fontSize: '0.9rem' }}>Buscando entregas...</p>
          </div>
        ) : entregas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#868e96' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3>Nenhuma entrega pendente</h3>
            <p style={{ fontSize: '0.85rem' }}>Não há registros pendentes para este lote.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {entregas.map((entrega, index) => {
              const statusLower = (entrega.StatusEntrega || entrega.SITUACAOENTREGA || '').toLowerCase();
              const isEntregue = statusLower.includes('entregue') || statusLower.includes('concluido') || statusLower.includes('concluído');
              const isEmTransporte = statusLower.includes('transporte') || statusLower.includes('progresso');

              return (
                <div
                  key={index}
                  draggable={!isEntregue}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: isEntregue ? '#f8f9fa' : '#ffffff',
                    opacity: isEntregue ? 0.65 : 1,
                    borderRadius: '16px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    border: '1.5px solid #eaeaea',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: isEntregue ? 'default' : 'grab',
                    userSelect: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Detalhes da Entrega */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    {/* Linha 1: Pedido, NF e Badge de Sequência */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        📦 Pedido: {entrega.NumeroPedido || 'N/A'} • NF: {entrega.NrNotaFiscal || entrega.NRDOCUMENTO || 'N/A'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isEmTransporte && (
                          <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                            Em Transporte
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', background: '#f3e8ff', color: '#8c2cf5', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                          Seq: {entrega.SequenciaRoteirizada || entrega.SEQUENCIA || index + 1}
                        </span>
                      </div>
                    </div>
                    
                    {/* Linha 2: Cliente */}
                    <p style={{ fontSize: '0.82rem', color: '#8c2cf5', fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      👤 Cliente: {entrega.NomeCliente || entrega.NOMECLIENTE || 'Cliente'}
                    </p>
                    
                    {/* Linha 3: Endereço completo (Endereço, Bairro, Cidade/UF) */}
                    <p style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 500, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      📍 {entrega.EnderecoEntrega || entrega.ENDERECO || 'Não informado'}, {entrega.Bairro || entrega.BAIRRO || 'N/A'} - {entrega.Cidade || entrega.CIDADE || 'N/A'}/{entrega.UFEntrega || entrega.UF || 'N/A'}
                    </p>
                    
                    {/* Linha 4: Data, Viagem, Chegada e Distância */}
                    <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
                      📅 {entrega.DataEntrega || entrega.DATAENTREGA || 'N/A'} • 🕐 Chegada: {entrega.HoraEntregaPrevista || 'N/A'} (Viagem: {entrega.TempoPrevistoEntrega || 'N/A'} • Dist: {entrega.DistanciaPrevista || '0.00'})
                    </p>

                    {isEntregue && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px dashed #eaeaea', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2a9d8f', fontWeight: 600, fontSize: '0.85rem' }}>
                          <CheckCircle2 size={16} /> Entrega Realizada
                        </div>
                        <button
                          onClick={() => handleReabrirEntrega(entrega)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e63946',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Reabrir Entrega"
                        >
                          <RotateCcw size={12} />
                          Reabrir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3 Botões Empilhados à Direita ou Apenas o de Visualizar se já Realizada */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px' }}>
                    {!isEntregue ? (
                      <>
                        {isEmTransporte ? (
                          /* Botão Vermelho Cancelar Início de Entrega */
                          <button 
                            onClick={() => handleCancelarInicio(entrega)}
                            style={{
                              background: '#e63946',
                              color: 'white',
                              border: 'none',
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 5px rgba(230, 57, 70, 0.2)'
                            }}
                            title="Cancelar início de entrega"
                          >
                            <XCircle size={16} />
                          </button>
                        ) : (
                          /* Botão Azul Iniciar Transporte (GPS Waze) */
                          <button 
                            onClick={() => handleIniciarEntrega(entrega)}
                            style={{
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 5px rgba(37, 99, 235, 0.2)'
                            }}
                            title="Iniciar com Waze"
                          >
                            <Navigation size={16} style={{ transform: 'rotate(90deg)' }} />
                          </button>
                        )}

                        {/* Botão Verde Finalizar */}
                        <button 
                          onClick={() => handleFinalizarEntrega(entrega)}
                          style={{
                            background: '#2a9d8f',
                            color: 'white',
                            border: 'none',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(42, 157, 143, 0.2)'
                          }}
                          title="Entregar Realizada"
                        >
                          <Check size={18} />
                        </button>
                      </>
                    ) : null}

                    {/* Botão Cinza Ver no Mapa/Detalhes */}
                    <button 
                      onClick={() => handleAbrirMapa(entrega)}
                      style={{
                        background: '#f1f3f5',
                        color: '#495057',
                        border: '1.5px solid #ced4da',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Visualizar Mapa"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            {entregas.length > 0 && entregas[0].HoraRetornoPrevista && (
              <div style={{
                background: '#f1f3f5',
                borderRadius: '20px',
                padding: '16px',
                border: '1.5px dashed #ced4da',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#495057', margin: 0 }}>Retorno ao Depósito</h3>
                  <p style={{ fontSize: '0.8rem', color: '#6c757d', margin: 0 }}>Fim da Rota</p>
                </div>
                <div style={{ fontSize: '1rem', color: '#2a9d8f', fontWeight: 700 }}>
                  {entregas[0].HoraRetornoPrevista}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão "Roteirizar" Grande e Roxo Fixo na Parte Inferior (Imagem 3) */}
      {(isAdm || permiteRoteirizar) && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#f8f9fe',
          padding: '12px 16px',
          borderTop: '1px solid #eaeaea',
          zIndex: 5
        }}>
          <button
            onClick={handleRoteirizar}
            disabled={roteirizando}
            style={{
              background: '#8c2cf5',
              color: '#ffffff',
              border: 'none',
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(140, 44, 245, 0.3)',
            }}
          >
            {roteirizando ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Processando Rota...
              </>
            ) : (
              <>
                <Navigation size={18} style={{ transform: 'rotate(45deg)' }} />
                Roteirizar
              </>
            )}
          </button>
        </div>
      )}

      {/* Pop-up de Celebração com Efeito de Confetes */}
      {showCelebration && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          fontFamily: 'sans-serif',
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '90%',
            maxWidth: '400px',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Confetes animados em CSS */}
            <div className="confetti-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
              {[...Array(25)].map((_, i) => {
                const colors = ['#8c2cf5', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                const randomLeft = Math.random() * 100;
                const randomDelay = Math.random() * 2;
                const randomRotation = Math.random() * 360;
                const randomScale = 0.5 + Math.random() * 0.8;
                return (
                  <div 
                    key={i} 
                    style={{
                      position: 'absolute',
                      width: '10px',
                      height: '10px',
                      background: randomColor,
                      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                      left: `${randomLeft}%`,
                      top: '-20px',
                      transform: `rotate(${randomRotation}deg) scale(${randomScale})`,
                      opacity: 0.8,
                      animation: `fall 2.5s infinite linear`,
                      animationDelay: `${randomDelay}s`
                    }}
                  />
                );
              })}
            </div>

            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
            }}>
              <CheckCircle2 size={48} />
            </div>

            <h2 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              Parabéns!
            </h2>
            <p style={{ margin: '0 0 28px 0', fontSize: '0.95rem', color: '#64748b', lineHeight: 1.5 }}>
              Todas as entregas do lote foram concluídas com sucesso!
            </p>

            <button
              onClick={() => {
                setShowCelebration(false);
                window.location.hash = '#/inicio';
                window.location.reload();
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #8c2cf5 0%, #6e1ac9 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(140, 44, 245, 0.3)',
                transition: 'transform 0.2s'
              }}
            >
              Voltar para Minhas Entregas
            </button>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.85); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes fall {
              0% { top: -20px; transform: translateY(0) rotate(0deg); }
              100% { top: 100%; transform: translateY(300px) rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {/* Painel Flutuante de Debug de Logs do GPS */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        zIndex: 99999,
        fontFamily: 'monospace',
        fontSize: '0.68rem',
        maxWidth: '320px',
        width: 'calc(100% - 20px)',
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#10b981',
        borderRadius: '8px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '8px 12px',
          background: '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }} onClick={() => setShowDebugConsole(!showDebugConsole)}>
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>⚙️ GPS Debug Console</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const textToCopy = debugLogs.join('\n');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(textToCopy)
                    .then(() => alert('Logs copiados com sucesso!'))
                    .catch((err) => alert('Erro ao copiar: ' + err));
                } else {
                  try {
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    alert('Logs copiados com sucesso! (Fallback)');
                  } catch (err) {
                    alert('Falha ao copiar automaticamente.');
                  }
                }
              }}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '0.6rem',
                cursor: 'pointer'
              }}
            >
              Copiar
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Deseja limpar os logs locais do GPS?')) {
                  localStorage.removeItem('gps_debug_logs');
                  (window as any)._gpsLogs = [];
                  setDebugLogs([]);
                }
              }}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '0.6rem',
                cursor: 'pointer'
              }}
            >
              Limpar
            </button>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{showDebugConsole ? '▼' : '▲'}</span>
          </div>
        </div>
        
        {showDebugConsole && (
          <div style={{
            padding: '8px',
            maxHeight: '140px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            borderTop: '1px solid #334155',
            background: '#0f172a'
          }}>
            {debugLogs.length === 0 ? (
              <span style={{ color: '#64748b', fontStyle: 'italic' }}>Nenhum log de rastreamento ainda.</span>
            ) : (
              debugLogs.map((log, idx) => (
                <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', borderBottom: '1px solid #1e293b', paddingBottom: '2px' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Indicador de versão imperceptível no rodapé para controle do cache PWA */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.62rem',
        color: '#94a3b8',
        padding: '12px 0 20px 0',
        opacity: 0.35,
        fontFamily: 'monospace',
        pointerEvents: 'none',
        userSelect: 'none',
        width: '100%'
      }}>
        Versão: 1.1.8 - GPS Fix &amp; Nav Modal
      </div>

      {/* ── Modal de Seleção de Navegador ─────────────────────────────────── */}
      {showNavModal && navModalEntrega && (() => {
        const { wazeUrl, mapsUrl } = buildNavUrls(navModalEntrega);
        return (
          <div
            onClick={() => setShowNavModal(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: '0 0 24px 0',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                borderRadius: '20px 20px 16px 16px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '24px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{
                  width: '40px', height: '4px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '2px', margin: '0 auto 16px'
                }} />
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>
                  📍 {navModalEntrega.EnderecoEntrega || navModalEntrega.ENDERECO || 'Destino selecionado'}
                </p>
                <h3 style={{ color: '#f1f5f9', margin: '6px 0 20px', fontSize: '1rem', fontWeight: 700 }}>
                  Abrir com qual app?
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Waze */}
                {wazeUrl && (
                  <button
                    id="btn-nav-waze"
                    onClick={() => {
                      setShowNavModal(false);
                      prosseguirNavegacao(navModalEntrega, navModalAudio, wazeUrl);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'linear-gradient(135deg, #33ccff22, #33ccff11)',
                      border: '1px solid #33ccff44',
                      borderRadius: '12px', padding: '14px 18px',
                      cursor: 'pointer', color: '#f1f5f9',
                      fontSize: '0.95rem', fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #33ccff33, #33ccff22)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #33ccff22, #33ccff11)')}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🗺️</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>Waze</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>Trânsito em tempo real</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#33ccff', fontSize: '1rem' }}>→</span>
                  </button>
                )}

                {/* Google Maps */}
                {mapsUrl && (
                  <button
                    id="btn-nav-maps"
                    onClick={() => {
                      setShowNavModal(false);
                      prosseguirNavegacao(navModalEntrega, navModalAudio, mapsUrl);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'linear-gradient(135deg, #4ade8022, #4ade8011)',
                      border: '1px solid #4ade8044',
                      borderRadius: '12px', padding: '14px 18px',
                      cursor: 'pointer', color: '#f1f5f9',
                      fontSize: '0.95rem', fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #4ade8033, #4ade8022)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #4ade8022, #4ade8011)')}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🌍</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>Google Maps</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>Navegação detalhada</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: '1rem' }}>→</span>
                  </button>
                )}

                {/* Sem URL disponível */}
                {!wazeUrl && !mapsUrl && (
                  <button
                    onClick={() => {
                      setShowNavModal(false);
                      prosseguirNavegacao(navModalEntrega, navModalAudio, '');
                    }}
                    style={{
                      background: '#2563eb22', border: '1px solid #2563eb44',
                      borderRadius: '12px', padding: '14px 18px',
                      cursor: 'pointer', color: '#f1f5f9', fontSize: '0.95rem'
                    }}
                  >
                    Iniciar sem navegação
                  </button>
                )}

                {/* Cancelar */}
                <button
                  id="btn-nav-cancel"
                  onClick={() => setShowNavModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', padding: '12px',
                    cursor: 'pointer', color: '#94a3b8',
                    fontSize: '0.85rem', marginTop: '4px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Widget Flutuante "Em Transporte" ──────────────────────────────── */}
      {entregaEmTransporte && (
        <div
          id="floating-transport-widget"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 8000,
            animation: 'slideUpFade 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.3)',
            minWidth: '280px',
            maxWidth: '360px',
          }}>
            {/* Indicador pulsante */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '12px', height: '12px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
                animation: 'pulseDot 1.5s ease-in-out infinite',
              }} />
            </div>

            {/* Info da entrega */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🚚 Em Transporte
              </div>
              <div style={{
                color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {entregaEmTransporte.NomeCliente || entregaEmTransporte.NOMECLIENTE || `Pedido ${entregaEmTransporte.NumeroPedido}`}
              </div>
            </div>

            {/* Botão de voltar ao app */}
            <button
              id="btn-widget-voltar-app"
              onClick={() => {
                window.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Finalizar
            </button>

            {/* Fechar widget */}
            <button
              onClick={() => setEntregaEmTransporte(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '1rem',
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}