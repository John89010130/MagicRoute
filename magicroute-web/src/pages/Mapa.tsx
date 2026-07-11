import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buscarEntregasPorLote, buscarPontosGPS } from '../services/api';
import { Map as MapIcon, Loader2, List, ExternalLink, ArrowLeft } from 'lucide-react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, MarkerF, InfoWindowF, PolylineF } from '@react-google-maps/api';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

const getPrimeiroNome = (nomeCompleto: string) => {
  if (!nomeCompleto) return '';
  return nomeCompleto.trim().split(' ')[0];
};

export default function Mapa() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idLote = searchParams.get('idLote') || '';
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [gpsPoints, setGpsPoints] = useState<any[]>([]);
  const [showRealPath, setShowRealPath] = useState(true);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  useEffect(() => {
    const fetchEntregasAndGPS = async () => {
      if (!user || !idLote) {
        setLoading(false);
        return;
      }
      try {
        const isAdm = user.tipoPessoaAtivo === 'Administrador';
        const result = await buscarEntregasPorLote(user.idEmpresa, isAdm ? '' : user.codigo, idLote);
        setEntregas(result || []);
        
        // Buscar histórico de GPS do motorista para o lote
        const points = await buscarPontosGPS(idLote);
        setGpsPoints(points || []);
      } catch (err) {
        console.error('Erro ao buscar entregas/GPS:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntregasAndGPS();
  }, [idLote, user]);

  useEffect(() => {
    if (!isLoaded || entregas.length === 0) return;

    const fetchRoute = async () => {
      const e = entregas[0];
      const latSaida = Number(e.LatitudeLocalSaida);
      const lngSaida = Number(e.LongitudeLocalSaida);
      const latChegada = Number(e.LatitudeLocalChegada) || latSaida;
      const lngChegada = Number(e.LongitudeLocalChegada) || lngSaida;
      
      if (isNaN(latSaida) || isNaN(lngSaida) || latSaida === 0 || lngSaida === 0) return;

      const coords = entregas.map(ent => {
        const lat = Number(ent.LatitudeEntrega || ent.Latitude);
        const lng = Number(ent.LongitudeEntrega || ent.Longitude);
        return { lat, lng };
      }).filter(c => !isNaN(c.lat) && !isNaN(c.lng) && c.lat !== 0 && c.lng !== 0);

      if (coords.length === 0) return;

      const waypoints = coords.map(c => ({
        location: new window.google.maps.LatLng(c.lat, c.lng),
        stopover: true
      }));

      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route({
        origin: new window.google.maps.LatLng(latSaida, lngSaida),
        destination: new window.google.maps.LatLng(latChegada, lngChegada),
        waypoints: waypoints,
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
        } else {
          console.error(`Erro ao traçar rota no Google Maps: ${status}`);
        }
      });
    };

    fetchRoute();
  }, [isLoaded, entregas]);

  const googleMapsEmbedUrl = () => {
    if (entregas.length === 0) return '';
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    const e = entregas[0];
    const latSaida = e.LatitudeLocalSaida || e.LATITUDELOCALSAIDA;
    const lngSaida = e.LongitudeLocalSaida || e.LONGITUDELOCALSAIDA;
    const latChegada = e.LatitudeLocalChegada || e.LATITUDELOCALCHEGADA || latSaida;
    const lngChegada = e.LongitudeLocalChegada || e.LONGITUDELOCALCHEGADA || lngSaida;
    
    let pontoSaida = '';
    if (latSaida && lngSaida && Number(latSaida) !== 0 && Number(lngSaida) !== 0) {
      pontoSaida = `${latSaida},${lngSaida}`;
    } else {
      const ruaSaida = e.EnderecoLocalSaida || '';
      const cidadeSaida = e.CidadeLocalSaida || '';
      const ufSaida = e.UFLocalSaida || '';
      pontoSaida = `${ruaSaida}${cidadeSaida ? `, ${cidadeSaida}` : ''}${ufSaida ? ` - ${ufSaida}` : ''}`.trim();
    }

    let pontoChegada = '';
    if (latChegada && lngChegada && Number(latChegada) !== 0 && Number(lngChegada) !== 0) {
      pontoChegada = `${latChegada},${lngChegada}`;
    } else {
      const ruaChegada = e.EnderecoLocalChegada || e.EnderecoLocalSaida || '';
      const cidadeChegada = e.CidadeLocalChegada || e.CidadeLocalSaida || '';
      const ufChegada = e.UFLocalChegada || e.UFLocalSaida || '';
      pontoChegada = `${ruaChegada}${cidadeChegada ? `, ${cidadeChegada}` : ''}${ufChegada ? ` - ${ufChegada}` : ''}`.trim();
    }

    const points = entregas.map(ent => {
      const lat = ent.LatitudeEntrega || ent.Latitude || ent.LATITUDEENTREGA || ent.LATITUDE;
      const lng = ent.LongitudeEntrega || ent.Longitude || ent.LONGITUDEENTREGA || ent.LONGITUDE;
      
      if (lat && lng && Number(lat) !== 0 && Number(lng) !== 0) {
        return `${lat},${lng}`;
      } else {
        const ruaNumero = ent.EnderecoEntrega || ent.ENDERECO || '';
        const bairro = ent.Bairro || ent.BAIRRO || '';
        const cidade = ent.Cidade || ent.CIDADE || '';
        const uf = ent.UFEntrega || ent.UF || '';
        const cep = ent.CEP || ent.Cep || '';
        return `${ruaNumero}${bairro ? `, ${bairro}` : ''}${cidade ? `, ${cidade}` : ''}${uf ? ` - ${uf}` : ''}${cep ? `, ${cep}` : ''}`.trim();
      }
    }).filter(p => p.length > 5);

    if (points.length === 0) return '';

    if (pontoSaida.length > 5) {
      const origin = encodeURIComponent(pontoSaida);
      const destination = encodeURIComponent(pontoChegada || pontoSaida);
      const waypoints = points.map(p => encodeURIComponent(p)).join('|');
      return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
    } else {
      const origin = encodeURIComponent(points[0]);
      const destination = encodeURIComponent(points[points.length - 1]);
      const waypoints = points.slice(1, -1).map(p => encodeURIComponent(p)).join('|');
      return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
    }
  };

  const getGpsPathsByDelivery = () => {
    const paths: Record<string, { lat: number; lng: number }[]> = {};
    gpsPoints.forEach(pt => {
      const ped = pt.NumeroPedido || 'Desconhecido';
      const lat = Number(pt.Latitude);
      const lng = Number(pt.Longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        if (!paths[ped]) paths[ped] = [];
        paths[ped].push({ lat, lng });
      }
    });
    return paths;
  };

  const renderGoogleMap = (height: string) => {
    if (loadError) return <div>Erro ao carregar o mapa. Verifique a chave de API.</div>;
    if (!isLoaded) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={40} color="#8c2cf5" /></div>;

    const e = entregas[0] || {};
    const latSaida = Number(e.LatitudeLocalSaida);
    const lngSaida = Number(e.LongitudeLocalSaida);
    const latChegada = Number(e.LatitudeLocalChegada) || latSaida;
    const lngChegada = Number(e.LongitudeLocalChegada) || lngSaida;

    const hasSaida = !isNaN(latSaida) && !isNaN(lngSaida) && latSaida !== 0 && lngSaida !== 0;
    const hasChegada = !isNaN(latChegada) && !isNaN(lngChegada) && latChegada !== 0 && lngChegada !== 0;
    const isSameStartEnd = latSaida === latChegada && lngSaida === lngChegada;

    const center = hasSaida ? { lat: latSaida, lng: lngSaida } : { lat: -23.5505, lng: -46.6333 };

    const getCircleIcon = (color: string) => {
      if (!window.google) return undefined;
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2,
        scale: 12,
        labelOrigin: new window.google.maps.Point(0, 0)
      };
    };

    return (
      <div style={{ height: height, width: '100%', position: 'relative', zIndex: 1 }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={13}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
          }}
        >
          {directionsResponse && (
            <DirectionsRenderer 
              directions={directionsResponse}
              options={{
                suppressMarkers: true,
                polylineOptions: { strokeColor: '#8c2cf5', strokeWeight: 5, strokeOpacity: 0.8 }
              }}
            />
          )}

          {hasSaida && (
            <MarkerF 
              position={{ lat: latSaida, lng: lngSaida }} 
              icon={getCircleIcon('#2a9d8f')} 
              label={{ text: isSameStartEnd ? 'S/V' : 'S', color: 'white', fontSize: '11px', fontWeight: 'bold' }}
              onClick={() => setActiveMarker('start')}
            >
              {activeMarker === 'start' && (
                <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                  <div style={{ fontSize: '12px', color: '#333' }}>
                    <strong>{isSameStartEnd ? 'Saída e Volta' : 'Saída'}: {e.LocalSaida || 'Base Central'}</strong><br />
                    {e.EnderecoLocalSaida}
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          )}

          {hasChegada && !isSameStartEnd && (
            <MarkerF 
              position={{ lat: latChegada, lng: lngChegada }} 
              icon={getCircleIcon('#2a9d8f')} 
              label={{ text: 'V', color: 'white', fontSize: '11px', fontWeight: 'bold' }}
              onClick={() => setActiveMarker('end')}
            >
              {activeMarker === 'end' && (
                <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                  <div style={{ fontSize: '12px', color: '#333' }}>
                    <strong>Volta: {e.LocalChegada || 'Base Central'}</strong><br />
                    {e.EnderecoLocalChegada}
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          )}

          {entregas.map((ent, idx) => {
            const lat = Number(ent.LatitudeEntrega || ent.Latitude);
            const lng = Number(ent.LongitudeEntrega || ent.Longitude);
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

            return (
              <MarkerF 
                key={idx}
                position={{ lat, lng }} 
                icon={getCircleIcon('#8c2cf5')} 
                label={{ text: String(idx + 1), color: 'white', fontSize: '11px', fontWeight: 'bold' }}
                onClick={() => setActiveMarker(`ent-${idx}`)}
              >
                {activeMarker === `ent-${idx}` && (
                  <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                    <div style={{ fontSize: '12px', color: '#333' }}>
                      <strong>Parada {idx + 1}: {ent.NomeCliente || 'Cliente'}</strong><br />
                      Doc/Pedido: {ent.NumeroPedido || 'N/A'}<br />
                      Endereço: {ent.EnderecoEntrega || 'Não informado'}
                    </div>
                  </InfoWindowF>
                )}
              </MarkerF>
            );
          })}

          {/* Renderizar trajeto do GPS real realizado pelo motorista */}
          {showRealPath && Object.entries(getGpsPathsByDelivery()).map(([pedido, path], idx) => {
            const colors = ['#00e676', '#ff9100', '#2979ff', '#ff1744', '#d500f9', '#00e5ff'];
            const color = colors[idx % colors.length];
            return (
              <PolylineF
                key={pedido}
                path={path}
                options={{
                  strokeColor: color,
                  strokeOpacity: 0.95,
                  strokeWeight: 5,
                  icons: window.google ? [{
                    icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                    offset: '100%',
                    repeat: '100px'
                  }] : undefined
                }}
              />
            );
          })}
        </GoogleMap>
      </div>
    );
  };

  const isMotorista = user?.tipoPessoa === 'Motorista';

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
        <Loader2 className="animate-spin" size={40} color="#8c2cf5" />
        <p style={{ color: '#868e96', fontSize: '0.9rem' }}>Carregando entregas...</p>
      </div>
    );
  }

  // RENDERIZAÇÃO PARA MOTORISTA (Mobile)
  if (isMotorista) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        <div style={{
          background: '#8c2cf5',
          padding: '20px 16px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 10px rgba(140, 44, 245, 0.15)',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
          zIndex: 10
        }}>
          <button onClick={() => navigate(`/entregas?idLote=${idLote}`)} style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', borderRadius: '12px', padding: '10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.5px' }}>Trajeto Realizado</h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.9 }}>Lote #{idLote}</p>
          </div>
          <button 
            onClick={() => setShowRealPath(!showRealPath)}
            style={{ 
              background: showRealPath ? '#2a9d8f' : 'rgba(255, 255, 255, 0.2)', 
              border: 'none', 
              borderRadius: '12px', 
              padding: '8px 12px', 
              color: '#fff', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              cursor: 'pointer' 
            }}
          >
            {showRealPath ? 'Ver GPS' : 'Original'}
          </button>
        </div>
        
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
          {renderGoogleMap('100%')}
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO PARA ADMIN / DESKTOP
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '24px', background: '#ffffff', borderBottom: '1px solid #f1f3f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button onClick={() => navigate(`/entregas?idLote=${idLote}`)} style={{ background: '#f8f9fa', border: 'none', borderRadius: '12px', padding: '10px', color: '#495057', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>Visualização de Rota</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
              Lote #{idLote} • {entregas.length} paradas
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate(`/entregas?idLote=${idLote}`)} style={{ background: '#f3f0ff', border: 'none', color: '#8c2cf5', padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
            <List size={16} /> Ver Lista de Entregas
          </button>
          <button 
            onClick={() => setShowRealPath(!showRealPath)}
            style={{ 
              background: showRealPath ? '#e6fcf5' : '#f1f3f5', 
              border: '1.5px solid',
              borderColor: showRealPath ? '#099268' : '#ced4da',
              color: showRealPath ? '#099268' : '#495057', 
              padding: '10px 20px', 
              borderRadius: '10px', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              transition: 'all 0.2s' 
            }}
          >
            <MapIcon size={16} /> {showRealPath ? 'Ocultar Trajeto Real (GPS)' : 'Exibir Trajeto Real (GPS)'}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {renderGoogleMap('100%')}
      </div>
    </div>
  );
}
