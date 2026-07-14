import { useEffect, useRef } from 'react';
import { gravarPontoGPS } from '../services/api';

export function useGpsTracker() {
  const watchIdRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startWatcher = (idEmpresa: string, idLote: string, numeroPedido: string) => {
    // Limpar watcher anterior se houver
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Iniciar áudio silencioso em segundo plano para manter a aba ativa no mobile
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        audioRef.current.loop = true;
      }
      audioRef.current.play()
        .then(() => console.log('[GPS Tracker] Áudio silencioso em segundo plano iniciado.'))
        .catch((err) => console.warn('[GPS Tracker] Reprodução de áudio silencioso bloqueada ou falhou:', err));
    } catch (audioErr) {
      console.error('[GPS Tracker] Erro ao instanciar áudio silencioso:', audioErr);
    }

    if (!navigator.geolocation) {
      console.error('Geolocalização não suportada no navegador.');
      return;
    }

    console.log(`[GPS Tracker] Iniciando rastreamento para Pedido ${numeroPedido}...`);
    
    // Gravar ponto inicial imediatamente
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        gravarPontoGPS(idEmpresa, idLote, numeroPedido, latitude, longitude, accuracy)
          .catch((e) => console.error('[GPS Tracker] Erro ao gravar ponto inicial:', e));
      },
      (err) => console.error('[GPS Tracker] Erro ao obter ponto inicial:', err),
      { enableHighAccuracy: true, timeout: 5000 }
    );

    // Iniciar watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`[GPS Tracker] Ponto capturado: Lat ${latitude}, Lng ${longitude}, Acc ${accuracy}`);
        gravarPontoGPS(idEmpresa, idLote, numeroPedido, latitude, longitude, accuracy)
          .catch((e) => console.error('[GPS Tracker] Erro ao gravar ponto de rota:', e));
      },
      (error) => {
        console.error('[GPS Tracker] Erro no watchPosition:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Evitar salvar em intervalos extremamente pequenos se parado
        timeout: 10000
      }
    );
  };

  const stopWatcher = () => {
    if (watchIdRef.current !== null) {
      console.log('[GPS Tracker] Parando rastreamento...');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current = null;
        console.log('[GPS Tracker] Áudio silencioso parado.');
      } catch (audioErr) {
        console.error('[GPS Tracker] Erro ao pausar áudio:', audioErr);
      }
    }
  };

  useEffect(() => {
    // 1. Verificar se há rastreamento ativo salvo no localStorage
    const savedActive = localStorage.getItem('gps_tracking_active');
    if (savedActive) {
      try {
        const { idEmpresa, idLote, numeroPedido } = JSON.parse(savedActive);
        if (idEmpresa && idLote && numeroPedido) {
          startWatcher(idEmpresa, idLote, numeroPedido);
        }
      } catch (e) {
        console.error('Erro ao ler gps_tracking_active do localStorage:', e);
      }
    }

    // 2. Escutar eventos globais para iniciar/parar
    const handleStartEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { idEmpresa, idLote, numeroPedido } = customEvent.detail;
      localStorage.setItem('gps_tracking_active', JSON.stringify({ idEmpresa, idLote, numeroPedido }));
      startWatcher(idEmpresa, idLote, numeroPedido);
    };

    const handleStopEvent = () => {
      localStorage.removeItem('gps_tracking_active');
      stopWatcher();
    };

    window.addEventListener('iniciar-gps', handleStartEvent);
    window.addEventListener('parar-gps', handleStopEvent);

    return () => {
      window.removeEventListener('iniciar-gps', handleStartEvent);
      window.removeEventListener('parar-gps', handleStopEvent);
      stopWatcher();
    };
  }, []);
}
