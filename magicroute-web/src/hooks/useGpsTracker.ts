import { useEffect, useRef } from 'react';
import { gravarPontoGPS } from '../services/api';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (position?: any, error?: any) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');


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
  const timeUpdateListenerRef = useRef<(() => void) | null>(null);
  const nativeWatcherIdRef = useRef<string | null>(null);


  const idEmpresaRef = useRef<string>('');
  const idLoteRef = useRef<string>('');
  const numeroPedidoRef = useRef<string>('');

  const processarPontoGPS = (latitude: number, longitude: number, accuracy?: number, origem: string = 'Watch', speed: number | null = null) => {
    const speedStr = speed !== null ? ` | Vel: ${speed.toFixed(1)}m/s` : '';
    adicionarGpsLog(`GPS Capturado (${origem}): Lat ${latitude}, Lng ${longitude}, Acc ${accuracy || 'N/A'}m${speedStr}`);
    
    if (lastCoordsRef.current) {
      const { latitude: lastLat, longitude: lastLng, timestamp: lastTime } = lastCoordsRef.current;
      const timeDiff = Date.now() - lastTime;

      if (lastLat === latitude && lastLng === longitude) {
        if (timeDiff < 60 * 1000) {
          adicionarGpsLog('Ponto GPS ignorado: coordenadas idênticas há < 1 min.');
          enviarFilaPendentes();
          return;
        }
      } else {
        const diffLat = Math.abs(lastLat - latitude);
        const diffLng = Math.abs(lastLng - longitude);
        if (diffLat < 0.0001 && diffLng < 0.0001 && timeDiff < 10 * 1000) {
          adicionarGpsLog('Ponto GPS ignorado: deslocamento insignificante (< 10m) há < 10s.');
          enviarFilaPendentes();
          return;
        }
      }
    }

    lastCoordsRef.current = { latitude, longitude, timestamp: Date.now() };

    // Adicionar novo ponto à fila offline no localStorage
    const novoPonto = {
      idEmpresa: idEmpresaRef.current,
      idLote: idLoteRef.current,
      numeroPedido: numeroPedidoRef.current,
      latitude,
      longitude,
      accuracy,
      timestamp: Date.now()
    };
    
    let fila = [];
    try {
      const filaSalva = localStorage.getItem('gps_pending_queue');
      fila = filaSalva ? JSON.parse(filaSalva) : [];
    } catch (e) {
      fila = [];
    }
    fila.push(novoPonto);
    localStorage.setItem('gps_pending_queue', JSON.stringify(fila));
    
    // Iniciar processo de envio da fila
    enviarFilaPendentes();
  };

  const enviarFilaPendentes = async () => {
    const filaSalva = localStorage.getItem('gps_pending_queue');
    if (!filaSalva) return;
    
    let fila = [];
    try {
      fila = JSON.parse(filaSalva);
    } catch (e) {
      localStorage.removeItem('gps_pending_queue');
      return;
    }
    
    if (fila.length === 0) return;
    
    // Evitar envios concorrentes da fila
    if ((window as any)._gpsSendingQueue) return;
    (window as any)._gpsSendingQueue = true;
    
    adicionarGpsLog(`[Fila] Sincronizando ${fila.length} pontos pendentes...`);
    
    const pontosRestantes = [...fila];
    
    while (pontosRestantes.length > 0) {
      const ponto = pontosRestantes[0];
      const tStart = Date.now();
      try {
        await gravarPontoGPS(
          ponto.idEmpresa,
          ponto.idLote,
          ponto.numeroPedido,
          ponto.latitude,
          ponto.longitude,
          ponto.accuracy
        );
        // Sucesso! Remover da fila
        pontosRestantes.shift();
        adicionarGpsLog(`[Fila] Sucesso no envio! Lat ${ponto.latitude}, Lng ${ponto.longitude} (Latência: ${Date.now() - tStart}ms)`);
      } catch (err: any) {
        adicionarGpsLog(`[Fila] Erro ao enviar ponto: ${err.message || err}. Suspendendo sincronização.`);
        break; // Se falhar (por exemplo, sem rede), para o loop
      }
    }
    
    localStorage.setItem('gps_pending_queue', JSON.stringify(pontosRestantes));
    (window as any)._gpsSendingQueue = false;
  };

  const startWatcher = async (idEmpresa: string, idLote: string, numeroPedido: string) => {
    adicionarGpsLog(`Iniciando startWatcher para Pedido ${numeroPedido}...`);
    adicionarGpsLog(`UA: ${navigator.userAgent}`);
    
    // Configurar os refs do lote ativo
    idEmpresaRef.current = idEmpresa;
    idLoteRef.current = idLote;
    numeroPedidoRef.current = numeroPedido;

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

    // Limpar watcher nativo anterior se houver
    if (nativeWatcherIdRef.current) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: nativeWatcherIdRef.current });
        adicionarGpsLog('Watcher nativo anterior removido.');
      } catch (e) {}
      nativeWatcherIdRef.current = null;
    }

    // Limpar watcher e intervalo anterior se houver
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      adicionarGpsLog('Watcher de GPS anterior limpo.');
    }
    if (intervalIdRef.current !== null) {
      clearTimeout(intervalIdRef.current);
      intervalIdRef.current = null;
      adicionarGpsLog('Intervalo de GPS anterior limpo.');
    }

    // Se estiver em uma plataforma nativa (App Android instalado), use o plugin nativo de segundo plano
    if (Capacitor.isNativePlatform()) {
      adicionarGpsLog('Plataforma nativa detectada. Iniciando Geolocation via Foreground Service do Capacitor...');
      try {
        const watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: 'Rastreamento MagicRoute Ativo',
            backgroundMessage: 'Sua rota está em transporte e a localização está sendo transmitida.',
            requestPermissions: true,
            stale: false,
            distanceFilter: 10 // Dispara a cada 10 metros
          },
          (location: any, error: any) => {
            if (error) {
              adicionarGpsLog(`[GPS Nativo] Erro no watcher: ${error.message || error}`);
              return;
            }
            if (location) {
              const { latitude, longitude, accuracy, speed } = location;
              processarPontoGPS(latitude, longitude, accuracy, 'BackgroundPlugin', speed);
            }
          }
        );
        nativeWatcherIdRef.current = watcherId;
        adicionarGpsLog(`[GPS Nativo] Watcher registrado com sucesso! ID: ${watcherId}`);
        
        // Também gravar ponto inicial nativo instantâneo para fins de feedback imediato
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy, speed } = position.coords;
            processarPontoGPS(latitude, longitude, accuracy, 'InicialNativa', speed);
          },
          (err) => adicionarGpsLog(`Erro no ponto inicial GPS nativo: ${err.message}`),
          { enableHighAccuracy: true, timeout: 5000 }
        );
        
        return; // Retorna para pular o fluxo web fallback
      } catch (err: any) {
        adicionarGpsLog(`[GPS Nativo] Falha ao configurar watcher nativo: ${err.message || err}. Usando fallback web...`);
      }
    }

    // Fluxo Web Fallback (Safari, Chrome Mobile, PWA)
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

      if (!audioRef.current) {
        adicionarGpsLog('Criando novo elemento de áudio silencioso local.');
        audioRef.current = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
        audioRef.current.loop = true;
      }

      adicionarGpsLog('Garantindo reprodução ativa do áudio silencioso...');
      audioRef.current.play()
        .then(() => adicionarGpsLog('Áudio silencioso iniciado e tocando ativamente.'))
        .catch((err: any) => adicionarGpsLog(`Alerta de Áudio: ${err.message}`));

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

    // Configurar heartbeat de áudio silencioso para evitar suspensão de timers no background
    if (audioRef.current) {
      if (timeUpdateListenerRef.current) {
        try {
          audioRef.current.removeEventListener('timeupdate', timeUpdateListenerRef.current);
        } catch (e) {}
      }

      let lastHeartbeatTime = 0;
      const handleTimeUpdate = () => {
        const now = Date.now();
        // Disparar a cada 10 segundos
        if (now - lastHeartbeatTime >= 10000) {
          lastHeartbeatTime = now;
          adicionarGpsLog('GPS Heartbeat disparado (Via Evento de Áudio)...');
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude, accuracy, speed } = position.coords;
              processarPontoGPS(latitude, longitude, accuracy, 'Heartbeat', speed);
            },
            (err) => adicionarGpsLog(`Erro no GPS do Heartbeat: ${err.message}`),
            {
              enableHighAccuracy: false,
              maximumAge: 15000,
              timeout: 8000
            }
          );
        }
      };

      timeUpdateListenerRef.current = handleTimeUpdate;
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      adicionarGpsLog('Listener de timeupdate registrado no áudio silencioso.');
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

    // Iniciar timer recursivo (setTimeout) de backup para segundo plano para evitar acúmulos e timeouts
    const rodarTimerGPS = () => {
      if (intervalIdRef.current === null) {
        adicionarGpsLog('Timer de GPS cancelado ou parado.');
        return;
      }
      
      adicionarGpsLog('GPS Timer disparado (Segundo Plano)...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed } = position.coords;
          processarPontoGPS(latitude, longitude, accuracy, 'Interval', speed);
          
          if (intervalIdRef.current !== null) {
            intervalIdRef.current = setTimeout(rodarTimerGPS, 10000);
          }
        },
        (err) => {
          adicionarGpsLog(`Erro no GPS do Timer: ${err.message}`);
          
          if (intervalIdRef.current !== null) {
            intervalIdRef.current = setTimeout(rodarTimerGPS, 10000);
          }
        },
        {
          enableHighAccuracy: false, // Usar baixa precisão no background para economizar bateria e hardware
          maximumAge: 15000, // Aceitar posições em cache de até 15 segundos
          timeout: 8000 // Timeout de 8s para dar mais estabilidade em segundo plano
        }
      );
    };

    // Iniciar o timeout recursivo
    intervalIdRef.current = setTimeout(rodarTimerGPS, 5000);
  };

  const stopWatcher = async () => {
    adicionarGpsLog('Parando watch e interval...');
    
    // Parar watcher nativo se ativo
    if (nativeWatcherIdRef.current) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: nativeWatcherIdRef.current });
        adicionarGpsLog('Watcher nativo removido com sucesso.');
      } catch (e: any) {
        adicionarGpsLog(`Erro ao remover watcher nativo: ${e.message}`);
      }
      nativeWatcherIdRef.current = null;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalIdRef.current !== null) {
      clearTimeout(intervalIdRef.current);
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
      if (timeUpdateListenerRef.current) {
        try {
          audioRef.current.removeEventListener('timeupdate', timeUpdateListenerRef.current);
          timeUpdateListenerRef.current = null;
          adicionarGpsLog('Listener de timeupdate do áudio removido.');
        } catch (e) {}
      }
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
      const { idEmpresa, idLote, numeroPedido, audioElement } = customEvent.detail;
      adicionarGpsLog(`Evento iniciar-gps recebido para pedido ${numeroPedido}.`);
      if (audioElement) {
        adicionarGpsLog('Elemento de áudio recebido do evento de gesto de clique.');
        audioRef.current = audioElement;
      }
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
        // Sincronizar fila local ao retornar visibilidade
        enviarFilaPendentes();
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
