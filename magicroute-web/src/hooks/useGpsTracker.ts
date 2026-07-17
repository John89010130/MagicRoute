import { useEffect, useRef } from 'react';
import { gravarPontoGPS } from '../services/api';

export const adicionarGpsLog = (msg: string) => {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  const logMsg = `[${timestamp}] ${msg}`;
  console.log(logMsg);
  
  if (typeof window !== 'undefined') {
    const win = window as any;
    win._gpsLogs = win._gpsLogs || [];
    win._gpsLogs.unshift(logMsg);
    
    if (win._gpsLogs.length > 150) {
      win._gpsLogs = win._gpsLogs.slice(0, 150); // Aumentar limite para 150 para coletar mais detalhes
    }
    
    try {
      localStorage.setItem('gps_debug_logs', JSON.stringify(win._gpsLogs));
    } catch (e) {}
    
    window.dispatchEvent(new CustomEvent('gps-log-added', { detail: logMsg }));
  }
};

export function useGpsTracker() {
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<any | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);

  const startWatcher = (idEmpresa: string, idLote: string, numeroPedido: string) => {
    adicionarGpsLog(`Iniciando startWatcher para Pedido ${numeroPedido}...`);
    adicionarGpsLog(`UA: ${navigator.userAgent}`);
    
    // Logar bateria
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        adicionarGpsLog(`Bateria: ${(battery.level * 100).toFixed(0)}% | Carregando: ${battery.charging ? 'Sim' : 'Não'}`);
      }).catch(() => {});
    }

    // Logar permissão de Geolocalização
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          adicionarGpsLog(`Permissão do Navegador: ${result.state}`);
        })
        .catch(() => {});
    }

    // Limpar watcher e intervalo anterior se houver
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      adicionarGpsLog('Watcher de GPS anterior limpo.');
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      adicionarGpsLog('Intervalo de GPS anterior limpo.');
    }

    // Iniciar áudio silencioso em segundo plano para manter a aba ativa no mobile
    try {
      if ('audioSession' in navigator) {
        try {
          (navigator as any).audioSession.type = 'playback';
          adicionarGpsLog('AudioSession configurada para playback.');
        } catch (sessionErr: any) {
          adicionarGpsLog(`Erro ao configurar AudioSession: ${sessionErr.message}`);
        }
      }

      const globalAudio = (window as any)._gpsSilentAudio;
      if (globalAudio) {
        adicionarGpsLog('Utilizando áudio silencioso global iniciado pelo clique.');
      } else if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
        audioRef.current.loop = true;
        audioRef.current.play()
          .then(() => adicionarGpsLog('Áudio silencioso local iniciado.'))
          .catch((err: any) => adicionarGpsLog(`Erro ao iniciar áudio local: ${err.message}`));
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Rastreamento de Rota Ativo',
          artist: 'MagicRoute',
          album: 'Em Transporte'
        });
        adicionarGpsLog('MediaSession metadata configurado.');
      }
    } catch (audioErr: any) {
      adicionarGpsLog(`Erro ao configurar áudio silencioso: ${audioErr.message}`);
    }

    // Iniciar Screen Wake Lock (impedir tela de apagar)
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          adicionarGpsLog('Screen Wake Lock ativo.');
        } else {
          adicionarGpsLog('Wake Lock não suportado pelo navegador.');
        }
      } catch (err: any) {
        adicionarGpsLog(`Falha ao solicitar Wake Lock: ${err.name} - ${err.message}`);
      }
    };
    requestWakeLock();

    if (!navigator.geolocation) {
      adicionarGpsLog('Erro: Geolocalização não suportada pelo navegador.');
      return;
    }

    // Função auxiliar para processar e gravar coordenadas com deduplicação inteligente
    const processarPontoGPS = (latitude: number, longitude: number, accuracy?: number, origem: string = 'Watch', speed: number | null = null) => {
      const speedStr = speed !== null ? ` | Vel: ${speed.toFixed(1)}m/s` : '';
      adicionarGpsLog(`GPS Capturado (${origem}): Lat ${latitude}, Lng ${longitude}, Acc ${accuracy || 'N/A'}m${speedStr}`);
      
      if (lastCoordsRef.current) {
        const { latitude: lastLat, longitude: lastLng, timestamp: lastTime } = lastCoordsRef.current;
        const timeDiff = Date.now() - lastTime;

        if (lastLat === latitude && lastLng === longitude) {
          if (timeDiff < 60 * 1000) {
            adicionarGpsLog('Ponto GPS ignorado: coordenadas idênticas há < 1 min.');
            return;
          }
        } else {
          const diffLat = Math.abs(lastLat - latitude);
          const diffLng = Math.abs(lastLng - longitude);
          if (diffLat < 0.0001 && diffLng < 0.0001 && timeDiff < 10 * 1000) {
            adicionarGpsLog('Ponto GPS ignorado: deslocamento insignificante (< 10m) há < 10s.');
            return;
          }
        }
      }

      lastCoordsRef.current = { latitude, longitude, timestamp: Date.now() };
      adicionarGpsLog(`Gravando ponto no servidor...`);

      const tStart = Date.now();
      gravarPontoGPS(idEmpresa, idLote, numeroPedido, latitude, longitude, accuracy)
        .then(() => adicionarGpsLog(`Sucesso no envio do ponto! Lat ${latitude}, Lng ${longitude} (Latência: ${Date.now() - tStart}ms)`))
        .catch((e: any) => adicionarGpsLog(`Erro no envio: ${e.message}`));
    };

    // Gravar ponto inicial imediatamente
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        processarPontoGPS(latitude, longitude, accuracy, 'Inicial', speed);
      },
      (err) => adicionarGpsLog(`Erro no ponto inicial GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 5000 }
    );

    // Iniciar watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        processarPontoGPS(latitude, longitude, accuracy, 'Watch', speed);
      },
      (error) => adicionarGpsLog(`Erro no watchPosition: ${error.message}`),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    // Iniciar timer de backup para segundo plano (a cada 5 segundos)
    intervalIdRef.current = setInterval(() => {
      adicionarGpsLog('GPS Timer disparado (Segundo Plano)...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed } = position.coords;
          processarPontoGPS(latitude, longitude, accuracy, 'Interval', speed);
        },
        (err) => adicionarGpsLog(`Erro no GPS do Timer: ${err.message}`),
        {
          enableHighAccuracy: false, // Usar baixa precisão no background para evitar o bloqueio de hardware do iOS/Safari
          maximumAge: 15000, // Aceitar posições em cache de até 15 segundos
          timeout: 4000 // Timeout menor para evitar acumular requisições pendentes
        }
      );
    }, 5000);
  };

  const stopWatcher = () => {
    adicionarGpsLog('Parando watch e interval...');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release()
          .then(() => {
            wakeLockRef.current = null;
            adicionarGpsLog('Screen Wake Lock liberado.');
          })
          .catch((err: any) => adicionarGpsLog(`Erro ao liberar Wake Lock: ${err.message}`));
      } catch (e: any) {
        adicionarGpsLog(`Exceção ao liberar Wake Lock: ${e.message}`);
      }
    }
    
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current = null;
        adicionarGpsLog('Áudio silencioso local parado.');
      } catch (audioErr: any) {
        adicionarGpsLog(`Erro ao pausar áudio local: ${audioErr.message}`);
      }
    }

    if ((window as any)._gpsSilentAudio) {
      try {
        (window as any)._gpsSilentAudio.pause();
        (window as any)._gpsSilentAudio = null;
        adicionarGpsLog('Áudio silencioso global parado.');
      } catch (audioErr: any) {
        adicionarGpsLog(`Erro ao pausar áudio global: ${audioErr.message}`);
      }
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
    }

    lastCoordsRef.current = null;
  };

  useEffect(() => {
    const savedActive = localStorage.getItem('gps_tracking_active');
    if (savedActive) {
      try {
        const { idEmpresa, idLote, numeroPedido } = JSON.parse(savedActive);
        if (idEmpresa && idLote && numeroPedido) {
          adicionarGpsLog(`Resumindo rastreamento ativo do localStorage para pedido ${numeroPedido}.`);
          startWatcher(idEmpresa, idLote, numeroPedido);
        }
      } catch (e: any) {
        adicionarGpsLog(`Erro ao ler localStorage: ${e.message}`);
      }
    }

    const handleStartEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { idEmpresa, idLote, numeroPedido } = customEvent.detail;
      adicionarGpsLog(`Evento iniciar-gps recebido para pedido ${numeroPedido}.`);
      localStorage.setItem('gps_tracking_active', JSON.stringify({ idEmpresa, idLote, numeroPedido }));
      startWatcher(idEmpresa, idLote, numeroPedido);
    };

    const handleStopEvent = () => {
      adicionarGpsLog('Evento parar-gps recebido.');
      localStorage.removeItem('gps_tracking_active');
      stopWatcher();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('gps_tracking_active')) {
        adicionarGpsLog('Visibilidade restaurada. Solicitando Wake Lock novamente.');
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          (navigator as any).wakeLock.request('screen')
            .then((sentinel: any) => {
              wakeLockRef.current = sentinel;
              adicionarGpsLog('Screen Wake Lock reativado com sucesso.');
            })
            .catch((err: any) => adicionarGpsLog(`Erro ao reativar Wake Lock: ${err.message}`));
        }
      } else if (document.visibilityState === 'hidden') {
        adicionarGpsLog('Página oculta (minimizado/segundo plano).');
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
