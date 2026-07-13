import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buscarEntregasPorLote, buscarPontosGPS } from '../services/api';
import { Map as MapIcon, Loader2, List, ExternalLink, ArrowLeft, Truck } from 'lucide-react';
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
  const [hoveredDelivery, setHoveredDelivery] = useState<string | null>(null);
  const [clickedPolyline, setClickedPolyline] = useState<any | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [preserveViewport, setPreserveViewport] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const fetchEntregasAndGPS = async (silent = false) => {
    if (!user || !idLote) {
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntregasAndGPS(false);

    // Polling a cada 10 segundos
    const interval = setInterval(() => {
      fetchEntregasAndGPS(true);
    }, 10000);

    return () => clearInterval(interval);
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
          // Trava a recentralização após o primeiro carregamento bem sucedido
          setTimeout(() => setPreserveViewport(true), 1500);
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

  const getDeliveryColor = (pedido: string) => {
    const idx = entregas.findIndex(ent => String(ent.NumeroPedido || ent.NUMEROPEDIDO) === String(pedido));
    if (idx === -1) return '#8c2cf5'; // padrão roxo
    const colors = [
      '#10b981', // Emerald
      '#3b82f6', // Blue
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#ec4899', // Pink
      '#14b8a6'  // Teal
    ];
    return colors[idx % colors.length];
  };

  const getDriverCurrentLocation = () => {
    if (gpsPoints.length === 0) return null;
    const sortedPoints = [...gpsPoints].sort((a, b) => {
      const t1 = new Date(a.DataRegistro || a.dataRegistro || 0).getTime();
      const t2 = new Date(b.DataRegistro || b.dataRegistro || 0).getTime();
      return t1 - t2;
    });
    return sortedPoints[sortedPoints.length - 1];
  };

  const driverLocation = getDriverCurrentLocation();

  const getActiveDelivery = () => {
    const inTransit = entregas.find(ent => {
      const status = (ent.StatusEntrega || ent.STATUSENTREGA || ent.situacaoentrega || '').toLowerCase();
      return status.includes('transporte');
    });
    if (inTransit) return inTransit;

    if (driverLocation) {
      const match = entregas.find(ent => String(ent.NumeroPedido || ent.NUMEROPEDIDO) === String(driverLocation.NumeroPedido));
      if (match) return match;
    }

    return entregas.find(ent => {
      const status = (ent.StatusEntrega || ent.STATUSENTREGA || ent.situacaoentrega || '').toLowerCase();
      return status.includes('pendente');
    });
  };

  const activeDelivery = getActiveDelivery();

  const truckSvgPath = 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2-5.5h-3V9h3v4z';

  const getDriverIcon = () => {
    if (!window.google) return undefined;
    return {
      path: truckSvgPath,
      fillColor: '#10b981',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 1.5,
      scale: 1.4,
      anchor: new window.google.maps.Point(12, 12)
    };
  };

  const focusOnDriver = () => {
    if (map && driverLocation) {
      map.panTo({ lat: Number(driverLocation.Latitude), lng: Number(driverLocation.Longitude) });
      map.setZoom(15);
    }
  };

  const handleRecenterRoute = () => {
    if (!map || entregas.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    
    const e = entregas[0];
    const latSaida = Number(e.LatitudeLocalSaida);
    const lngSaida = Number(e.LongitudeLocalSaida);
    if (!isNaN(latSaida) && !isNaN(lngSaida) && latSaida !== 0 && lngSaida !== 0) {
      bounds.extend(new window.google.maps.LatLng(latSaida, lngSaida));
    }
    
    entregas.forEach(ent => {
      const lat = Number(ent.LatitudeEntrega || ent.Latitude);
      const lng = Number(ent.LongitudeEntrega || ent.Longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        bounds.extend(new window.google.maps.LatLng(lat, lng));
      }
    });

    if (driverLocation) {
      const lat = Number(driverLocation.Latitude);
      const lng = Number(driverLocation.Longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        bounds.extend(new window.google.maps.LatLng(lat, lng));
      }
    }
    
    map.fitBounds(bounds);
  };

  const e_first = entregas[0] || {};
  const nomeMotorista = e_first.NomeMotorista || e_first.Nome || e_first.NOMEMOTORISTA || `Motorista #${e_first.CodigoMotorista || ''}`;

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
          center={preserveViewport ? undefined : center}
          zoom={preserveViewport ? undefined : 13}
          onLoad={(map) => {
            setMap(map);
          }}
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
                preserveViewport: preserveViewport,
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
            const color = getDeliveryColor(pedido);
            const isHovered = hoveredDelivery === pedido;
            return (
              <PolylineF
                key={pedido}
                path={path}
                onClick={(e) => {
                  setClickedPolyline({
                    pedido,
                    lat: e.latLng?.lat() || path[path.length - 1].lat,
                    lng: e.latLng?.lng() || path[path.length - 1].lng
                  });
                }}
                options={{
                  strokeColor: color,
                  strokeOpacity: isHovered ? 1.0 : (hoveredDelivery ? 0.35 : 0.85),
                  strokeWeight: isHovered ? 8 : 5,
                  icons: window.google ? [{
                    icon: {
                      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: isHovered ? 4.5 : 3.5,
                      fillColor: color,
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 1.5,
                    },
                    offset: '50px',
                    repeat: '100px'
                  }] : undefined
                }}
              />
            );
          })}

          {/* Linha dinâmica conectando o motorista à entrega ativa (Estilo Uber/iFood) */}
          {driverLocation && activeDelivery && (
            (() => {
              const destLat = Number(activeDelivery.LatitudeEntrega || activeDelivery.Latitude || activeDelivery.LATITUDEENTREGA || activeDelivery.LATITUDE);
              const destLng = Number(activeDelivery.LongitudeEntrega || activeDelivery.Longitude || activeDelivery.LONGITUDEENTREGA || activeDelivery.LONGITUDE);
              if (isNaN(destLat) || isNaN(destLng) || destLat === 0 || destLng === 0) return null;
              
              return (
                <PolylineF
                  path={[
                    { lat: Number(driverLocation.Latitude), lng: Number(driverLocation.Longitude) },
                    { lat: destLat, lng: destLng }
                  ]}
                  options={{
                    strokeColor: '#3b82f6',
                    strokeOpacity: 0,
                    icons: [{
                      icon: {
                        path: 'M 0,-1 0,1',
                        strokeOpacity: 0.8,
                        scale: 3,
                        strokeColor: '#3b82f6',
                        strokeWeight: 3
                      },
                      offset: '0',
                      repeat: '15px'
                    }]
                  }}
                />
              );
            })()
          )}

          {/* Marcador do Motorista em Tempo Real */}
          {driverLocation && (
            <MarkerF
              position={{ lat: Number(driverLocation.Latitude), lng: Number(driverLocation.Longitude) }}
              icon={getDriverIcon()}
              onClick={() => setActiveMarker('driver')}
            >
              {activeMarker === 'driver' && (
                <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                  <div style={{ fontSize: '12px', padding: '4px', maxWidth: '240px', color: '#333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      <strong style={{ color: '#10b981' }}>Motorista Online (GPS)</strong>
                    </div>
                    <strong>Motorista:</strong> {nomeMotorista}<br />
                    {activeDelivery ? (
                      <>
                        <strong>Indo para:</strong> {activeDelivery.NomeCliente}<br />
                        <strong>Pedido:</strong> {activeDelivery.NumeroPedido}<br />
                        <strong>Endereço:</strong> {activeDelivery.EnderecoEntrega}
                      </>
                    ) : (
                      <span>Em trânsito</span>
                    )}
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          )}

          {/* Tooltip ao clicar no trajeto */}
          {clickedPolyline && (
            <InfoWindowF
              position={{ lat: clickedPolyline.lat, lng: clickedPolyline.lng }}
              onCloseClick={() => setClickedPolyline(null)}
            >
              <div style={{ fontSize: '12px', padding: '4px', maxWidth: '220px', color: '#333' }}>
                <strong style={{ color: '#8c2cf5' }}>Trajeto de Entrega Realizado</strong><br />
                {(() => {
                  const match = entregas.find(ent => String(ent.NumeroPedido || ent.NUMEROPEDIDO) === String(clickedPolyline.pedido));
                  if (!match) return `Pedido: ${clickedPolyline.pedido}`;
                  return (
                    <>
                      <strong>Cliente:</strong> {match.NomeCliente}<br />
                      <strong>Pedido:</strong> {match.NumeroPedido}<br />
                      <strong>Status atual:</strong> {match.StatusEntrega}
                    </>
                  );
                })()}
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>

        {/* Botão de Centralizar Rota flutuante */}
        <button 
          onClick={handleRecenterRoute}
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#0f172a',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 10,
          }}
        >
          <MapIcon size={16} color="#8c2cf5" /> Centralizar Rota
        </button>

        {/* Card Flutuante de Rastreamento em Tempo Real */}
        {driverLocation && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            padding: '16px',
            width: '320px',
            zIndex: 10,
            fontFamily: 'sans-serif'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="live-pulse" style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)'
                }}></span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rastreamento ao Vivo</span>
              </div>
              <button 
                onClick={focusOnDriver}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Focar Motorista
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569'
              }}>
                <Truck size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{nomeMotorista}</p>
                {activeDelivery ? (
                  <>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      Indo para: <strong style={{ color: '#0f172a' }}>{activeDelivery.NomeCliente}</strong>
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                      Parada #{entregas.findIndex(ent => String(ent.NumeroPedido || ent.NUMEROPEDIDO) === String(activeDelivery.NumeroPedido)) + 1} • Pedido: {activeDelivery.NumeroPedido}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Em deslocamento...</p>
                )}
              </div>
            </div>
            
            <style>{`
              .live-pulse {
                animation: pulse 2s infinite;
              }
              @keyframes pulse {
                0% {
                  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                }
                70% {
                  box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
                }
                100% {
                  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                }
              }
            `}</style>
          </div>
        )}
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
        {/* Botão flutuante de Voltar no topo esquerdo */}
        <button 
          onClick={() => navigate(`/entregas?idLote=${idLote}`)} 
          style={{ 
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '50%', 
            width: '44px',
            height: '44px',
            color: '#0f172a', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10
          }}
        >
          <ArrowLeft size={20} />
        </button>

        {/* Botão flutuante para toggle GPS no topo direito */}
        <button 
          onClick={() => setShowRealPath(!showRealPath)}
          style={{ 
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: showRealPath ? '#2a9d8f' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            border: showRealPath ? 'none' : '1px solid rgba(226, 232, 240, 0.8)', 
            borderRadius: '20px', 
            padding: '10px 16px', 
            color: showRealPath ? '#fff' : '#0f172a', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10
          }}
        >
          {showRealPath ? 'Ver GPS' : 'Original'}
        </button>
        
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
          {renderGoogleMap('100%')}
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO PARA ADMIN / DESKTOP
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif' }}>
      {/* Top Header */}
      <div style={{ padding: '20px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(`/entregas?idLote=${idLote}`)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Painel de Roteamento ao Vivo</h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Lote #{idLote} • {entregas.length} paradas • {entregas.filter(ent => String(ent.StatusEntrega || ent.STATUSENTREGA || '').toLowerCase().includes('entregue') && !String(ent.StatusEntrega || ent.STATUSENTREGA || '').toLowerCase().includes('não')).length}/{entregas.length} concluídas
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate(`/entregas?idLote=${idLote}`)} style={{ background: '#f3f0ff', border: 'none', color: '#8c2cf5', padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
            <List size={14} /> Ver Lista
          </button>
          <button 
            onClick={() => setShowRealPath(!showRealPath)}
            style={{ 
              background: showRealPath ? '#ecfdf5' : '#f1f5f9', 
              border: '1px solid',
              borderColor: showRealPath ? '#059669' : '#cbd5e1',
              color: showRealPath ? '#059669' : '#475569', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              transition: 'all 0.2s' 
            }}
          >
            <MapIcon size={14} /> {showRealPath ? 'Ocultar Trajeto Real' : 'Exibir Trajeto Real'}
          </button>
        </div>
      </div>

      {/* Main Content Side-by-Side */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar: Paradas e Legendas */}
        <div style={{
          width: '360px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sequência de Paradas
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Passe o mouse sobre uma parada para destacar seu trajeto no mapa
            </p>
          </div>

          <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Saída da Base */}
            {entregas.length > 0 && (() => {
              const first = entregas[0];
              return (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#2a9d8f',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>S</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      Saída: {first.LocalSaida || 'Base Central'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                      {first.EnderecoLocalSaida}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Paradas do Lote */}
            {entregas.map((ent, idx) => {
              const pedido = ent.NumeroPedido || ent.NUMEROPEDIDO || '';
              const color = getDeliveryColor(pedido);
              const isHovered = hoveredDelivery === pedido;
              const isDeliveryActive = activeDelivery && String(activeDelivery.NumeroPedido) === String(pedido);
              
              return (
                <div 
                  key={idx}
                  onMouseEnter={() => setHoveredDelivery(pedido)}
                  onMouseLeave={() => setHoveredDelivery(null)}
                  onClick={() => {
                    const lat = Number(ent.LatitudeEntrega || ent.Latitude);
                    const lng = Number(ent.LongitudeEntrega || ent.Longitude);
                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                      map?.panTo({ lat, lng });
                      map?.setZoom(15);
                      setActiveMarker(`ent-${idx}`);
                    }
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: isHovered ? '#f1f5f9' : (isDeliveryActive ? '#eff6ff' : '#ffffff'),
                    border: `1px solid ${isDeliveryActive ? '#3b82f6' : (isHovered ? '#cbd5e1' : '#e2e8f0')}`,
                    borderLeft: `4px solid ${color}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.2s',
                    boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                      Parada {idx + 1} • Pedido {pedido}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 
                        String(ent.StatusEntrega || '').toLowerCase().includes('entregue') ? '#dcfce7' : 
                        String(ent.StatusEntrega || '').toLowerCase().includes('transporte') ? '#dbeafe' : '#fef3c7',
                      color: 
                        String(ent.StatusEntrega || '').toLowerCase().includes('entregue') ? '#15803d' : 
                        String(ent.StatusEntrega || '').toLowerCase().includes('transporte') ? '#1d4ed8' : '#b45309'
                    }}>
                      {ent.StatusEntrega || 'Pendente'}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                    {ent.NomeCliente || 'Cliente'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ent.EnderecoEntrega}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Map Pane */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          {renderGoogleMap('100%')}
        </div>
      </div>
    </div>
  );
}
