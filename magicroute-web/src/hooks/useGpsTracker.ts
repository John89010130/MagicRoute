import { useEffect, useRef } from 'react';
import { gravarPontoGPS } from '../services/api';

export function useGpsTracker() {
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<any | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);

  const startWatcher = (idEmpresa: string, idLote: string, numeroPedido: string) => {
    // Limpar watcher e intervalo anterior se houver
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Iniciar áudio silencioso em segundo plano para manter a aba ativa no mobile
    try {
      // Configurar AudioSession para playback (evita suspensão no iOS)
      if ('audioSession' in navigator) {
        try {
          (navigator as any).audioSession.type = 'playback';
          console.log('[GPS Tracker] AudioSession configurada para playback.');
        } catch (sessionErr) {
          console.warn('[GPS Tracker] Erro ao configurar AudioSession.type:', sessionErr);
        }
      }

      // Se já houver um áudio iniciado globalmente via gesto de clique, nós o respeitamos e não criamos outro
      const globalAudio = (window as any)._gpsSilentAudio;
      if (globalAudio) {
        console.log('[GPS Tracker] Utilizando áudio silencioso global iniciado pelo clique.');
      } else if (!audioRef.current) {
        // Usar um WAV silencioso minimalista (altamente compatível e inicia instantaneamente)
        audioRef.current = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
        audioRef.current.loop = true;
        audioRef.current.play()
          .then(() => console.log('[GPS Tracker] Áudio silencioso em segundo plano iniciado.'))
          .catch((err) => console.warn('[GPS Tracker] Reprodução de áudio silencioso bloqueada ou falhou:', err));
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Rastreamento de Rota Ativo',
          artist: 'MagicRoute',
          album: 'Em Transporte'
        });
      }
    } catch (audioErr) {
      console.error('[GPS Tracker] Erro ao instanciar áudio silencioso:', audioErr);
    }

    // Iniciar Screen Wake Lock (impedir tela de apagar)
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('[GPS Tracker] Screen Wake Lock ativo.');
        }
      } catch (err: any) {
        console.warn(`[GPS Tracker] Falha ao solicitar Wake Lock: ${err.name}, ${err.message}`);
      }
    };
    requestWakeLock();

    if (!navigator.geolocation) {
      console.error('Geolocalização não suportada no navegador.');
      return;
    }

    console.log(`[GPS Tracker] Iniciando rastreamento para Pedido ${numeroPedido}...`);
    
    // Função auxiliar para processar e gravar coordenadas com deduplicação inteligente
    const processarPontoGPS = (latitude: number, longitude: number, accuracy?: number) => {
      if (lastCoordsRef.current) {
        const { latitude: lastLat, longitude: lastLng, timestamp: lastTime } = lastCoordsRef.current;
        const timeDiff = Date.now() - lastTime;

        // Se a coordenada for idêntica e passou menos de 60 segundos (1 minuto), ignorar
        if (lastLat === latitude && lastLng === longitude) {
          if (timeDiff < 60 * 1000) {
            console.log('[GPS Tracker] Ponto idêntico ignorado (tempo < 1 min)');
            return;
          }
        } else {
          // Se moveu muito pouco (diferença lat/lng < 0.0001 ~ 10 metros) e passou menos de 10 segundos, ignorar
          const diffLat = Math.abs(lastLat - latitude);
          const diffLng = Math.abs(lastLng - longitude);
          if (diffLat < 0.0001 && diffLng < 0.0001 && timeDiff < 10 * 1000) {
            console.log('[GPS Tracker] Movimento insignificante ignorado (tempo < 10s)');
            return;
          }
        }
      }

      // Atualizar o último ponto
      lastCoordsRef.current = { latitude, longitude, timestamp: Date.now() };

      gravarPontoGPS(idEmpresa, idLote, numeroPedido, latitude, longitude, accuracy)
        .then(() => console.log(`[GPS Tracker] Ponto gravado: Lat ${latitude}, Lng ${longitude}`))
        .catch((e) => console.error('[GPS Tracker] Erro ao gravar ponto de rota:', e));
    };

    // Gravar ponto inicial imediatamente
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        processarPontoGPS(latitude, longitude, accuracy);
      },
      (err) => console.error('[GPS Tracker] Erro ao obter ponto inicial:', err),
      { enableHighAccuracy: true, timeout: 5000 }
    );

    // Iniciar watch (usado principalmente com tela ligada / primeiro plano)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`[GPS Tracker Watch] Ponto capturado: Lat ${latitude}, Lng ${longitude}, Acc ${accuracy}`);
        processarPontoGPS(latitude, longitude, accuracy);
      },
      (error) => {
        console.error('[GPS Tracker Watch] Erro no watchPosition:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    // Iniciar timer de backup para segundo plano (getCurrentPosition periódico a cada 5 segundos)
    intervalIdRef.current = setInterval(() => {
      console.log('[GPS Tracker Interval] Buscando localização em segundo plano...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(`[GPS Tracker Interval] Ponto capturado: Lat ${latitude}, Lng ${longitude}, Acc ${accuracy}`);
          processarPontoGPS(latitude, longitude, accuracy);
        },
        (err) => {
          console.error('[GPS Tracker Interval] Erro no getCurrentPosition de backup:', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0, // Forçar leitura nova
          timeout: 10000
        }
      );
    }, 5000); // Executar a cada 5 segundos
  };

  const stopWatcher = () => {
    if (watchIdRef.current !== null) {
      console.log('[GPS Tracker] Parando rastreamento (watch)...');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalIdRef.current !== null) {
      console.log('[GPS Tracker] Parando rastreamento (interval)...');
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Liberar Wake Lock
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release()
          .then(() => {
            wakeLockRef.current = null;
            console.log('[GPS Tracker] Screen Wake Lock liberado.');
          })
          .catch((err: any) => console.warn('[GPS Tracker] Erro ao liberar Wake Lock:', err));
      } catch (e) {
        console.error('[GPS Tracker] Erro ao liberar Wake Lock:', e);
      }
    }
    
    // Parar áudio interno do hook
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current = null;
        console.log('[GPS Tracker] Áudio silencioso local parado.');
      } catch (audioErr) {
        console.error('[GPS Tracker] Erro ao pausar áudio local:', audioErr);
      }
    }

    // Parar áudio global iniciado na página
    if ((window as any)._gpsSilentAudio) {
      try {
        (window as any)._gpsSilentAudio.pause();
        (window as any)._gpsSilentAudio = null;
        console.log('[GPS Tracker] Áudio silencioso global parado.');
      } catch (audioErr) {
        console.error('[GPS Tracker] Erro ao pausar áudio global:', audioErr);
      }
    }

    // Limpar metadados de mídia
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
    }

    lastCoordsRef.current = null;
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

    // Re-solicitar Wake Lock se a visibilidade da página mudar e o GPS estiver ativo
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('gps_tracking_active')) {
        console.log('[GPS Tracker] Visibilidade restaurada. Solicitando Wake Lock novamente.');
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          (navigator as any).wakeLock.request('screen')
            .then((sentinel: any) => {
              wakeLockRef.current = sentinel;
              console.log('[GPS Tracker] Screen Wake Lock reativado com sucesso.');
            })
            .catch((err: any) => console.warn('[GPS Tracker] Erro ao reativar Wake Lock:', err));
        }
      }
    };

    window.addEventListener('iniciar-gps', handleStartEvent);
    window.addEventListener('parar-gps', handleStopEvent);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('iniciar-gps', handleStartEvent);
      window.removeEventListener('parar-gps', handleStopEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopWatcher();
    };
  }, []);
}
