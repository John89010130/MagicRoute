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
      win._gpsLogs = win._gpsLogs.slice(0, 150);
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
  const nativeIntervalIdRef = useRef<any | null>(null); // timer de fallback para modo nativo
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);
  const timeUpdateListenerRef = useRef<(() => void) | null>(null);
  const nativeWatcherIdRef = useRef<string | null>(null);

  const idEmpresaRef = useRef<string>('');
  const idLoteRef = useRef<string>('');
  const numeroPedidoRef = useRef<string>('');

  // ─── Envio da fila com try/finally para nunca travar ───────────────────────
  const enviarFilaPendentes = async () => {
    const filaSalva = localStorage.getItem('gps_pending_queue');
    if (!filaSalva) return;
    
    let fila: any[] = [];
    try {
      fila = JSON.parse(filaSalva);
    } catch (e) {
      localStorage.removeItem('gps_pending_queue');
      return;
    }
    
    if (fila.length === 0) return;
    
    // Evitar envios concorrentes da fila — mas SEMPRE garantir liberação no finally
    if ((window as any)._gpsSendingQueue) return;
    (window as any)._gpsSendingQueue = true;
    
    adicionarGpsLog(`[Fila] Sincronizando ${fila.length} pontos pendentes...`);
    
    const pontosRestantes = [...fila];
    
    try {
      while (pontosRestantes.length > 0) {
        const ponto = pontosRestantes[0];
        const tStart = Date.now();
        let retries = 0;
        let enviado = false;
        
        // Tenta até 3 vezes com backoff exponencial
        while (retries < 3 && !enviado) {
          try {
            await gravarPontoGPS(
              ponto.idEmpresa,
              ponto.idLote,
              ponto.numeroPedido,
              ponto.latitude,
              ponto.longitude,
              ponto.accuracy
            );
            enviado = true;
            pontosRestantes.shift();
            adicionarGpsLog(`[Fila] ✓ Enviado! Lat ${ponto.latitude}, Lng ${ponto.longitude} (${Date.now() - tStart}ms, tentativa ${retries + 1})`);
          } catch (err: any) {
            retries++;
            if (retries < 3) {
              adicionarGpsLog(`[Fila] Tentativa ${retries} falhou: ${err.message}. Aguardando ${retries * 2}s...`);
              await new Promise(resolve => setTimeout(resolve, retries * 2000));
            } else {
              adicionarGpsLog(`[Fila] ✗ Ponto falhou após 3 tentativas: ${err.message}. Suspendendo fila.`);
              break;
            }
          }
        }
        
        if (!enviado) break; // Para o loop se esgotou retentativas
      }
    } finally {
      // CRÍTICO: sempre libera a flag, mesmo que uma exceção inesperada ocorra
      localStorage.setItem('gps_pending_queue', JSON.stringify(pontosRestantes));
      (window as any)._gpsSendingQueue = false;
    }
  };

  // ─── Processamento e deduplicação de ponto GPS ─────────────────────────────
  const processarPontoGPS = (
    latitude: number,
    longitude: number,
    accuracy?: number,
    origem: string = 'Watch',
    speed: number | null = null
  ) => {
    const speedStr = speed !== null ? ` | Vel: ${speed.toFixed(1)}m/s` : '';
    adicionarGpsLog(`GPS Capturado (${origem}): Lat ${latitude}, Lng ${longitude}, Acc ${accuracy || 'N/A'}m${speedStr}`);
    
    if (lastCoordsRef.current) {
      const { latitude: lastLat, longitude: lastLng, timestamp: lastTime } = lastCoordsRef.current;
      const timeDiff = Date.now() - lastTime;

      if (lastLat === latitude && lastLng === longitude) {
        // Coordenadas exatamente idênticas: aguarda só 30s (não 60s) antes de forçar envio
        if (timeDiff < 30 * 1000) {
          adicionarGpsLog('Ponto GPS ignorado: coordenadas idênticas há < 30s. Tentando fila...');
          enviarFilaPendentes(); // Tenta esvaziar fila mesmo sem novo ponto
          return;
        }
      } else {
        const diffLat = Math.abs(lastLat - latitude);
        const diffLng = Math.abs(lastLng - longitude);
        // Deslocamento insignificante (< ~10m) em menos de 10s
        if (diffLat < 0.0001 && diffLng < 0.0001 && timeDiff < 10 * 1000) {
          adicionarGpsLog('Ponto GPS ignorado: deslocamento < 10m em < 10s. Tentando fila...');
          enviarFilaPendentes();
          return;
        }
      }
    }

    lastCoordsRef.current = { latitude, longitude, timestamp: Date.now() };

    // Encapsular o ponto na fila offline
    const novoPonto = {
      idEmpresa: idEmpresaRef.current,
      idLote: idLoteRef.current,
      numeroPedido: numeroPedidoRef.current,
      latitude,
      longitude,
      accuracy,
      timestamp: Date.now()
    };
    
    let fila: any[] = [];
    try {
      const filaSalva = localStorage.getItem('gps_pending_queue');
      fila = filaSalva ? JSON.parse(filaSalva) : [];
    } catch (e) {
      fila = [];
    }
    fila.push(novoPonto);
    localStorage.setItem('gps_pending_queue', JSON.stringify(fila));
    
    enviarFilaPendentes();
  };

  // ─── Início do rastreamento ─────────────────────────────────────────────────
  const startWatcher = async (idEmpresa: string, idLote: string, numeroPedido: string) => {
    adicionarGpsLog(`Iniciando startWatcher para Pedido ${numeroPedido}...`);
    adicionarGpsLog(`UA: ${navigator.userAgent}`);
    
    idEmpresaRef.current = idEmpresa;
    idLoteRef.current = idLote;
    numeroPedidoRef.current = numeroPedido;

    // Log de diagnóstico
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        adicionarGpsLog(`Bateria: ${(battery.level * 100).toFixed(0)}% | Carregando: ${battery.charging ? 'Sim' : 'Não'}`);
      }).catch(() => {});
    }
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((result) => adicionarGpsLog(`Permissão GPS: ${result.state}`))
        .catch(() => {});
    }

    // Limpar watchers e timers anteriores
    if (nativeWatcherIdRef.current) {
      try { await BackgroundGeolocation.removeWatcher({ id: nativeWatcherIdRef.current }); } catch (e) {}
      nativeWatcherIdRef.current = null;
    }
    if (nativeIntervalIdRef.current !== null) {
      clearInterval(nativeIntervalIdRef.current);
      nativeIntervalIdRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearTimeout(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // ── MODO NATIVO (APK Android / iOS) ────────────────────────────────────
    if (Capacitor.isNativePlatform()) {
      adicionarGpsLog('Plataforma nativa. Iniciando BackgroundGeolocation Foreground Service...');
      try {
        const watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: 'MagicRoute — Rastreamento Ativo',
            backgroundMessage: 'Localização em transmissão. Não feche o app.',
            requestPermissions: true,
            stale: false,
            distanceFilter: 0 // 0 = dispara por tempo (sem filtro de distância)
          },
          (location: any, error: any) => {
            if (error) {
              adicionarGpsLog(`[GPS Nativo] Erro: ${error.message || JSON.stringify(error)}`);
              return;
            }
            if (location) {
              processarPontoGPS(location.latitude, location.longitude, location.accuracy, 'NativePlugin', location.speed);
            }
          }
        );
        nativeWatcherIdRef.current = watcherId;
        adicionarGpsLog(`[GPS Nativo] Watcher ativo! ID: ${watcherId}`);

        // Ponto inicial imediato
        navigator.geolocation.getCurrentPosition(
          (pos) => processarPontoGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'NativeInicial', pos.coords.speed),
          (err) => adicionarGpsLog(`[GPS Nativo] Erro ponto inicial: ${err.message}`),
          { enableHighAccuracy: true, timeout: 8000 }
        );

        // Timer de 30s de fallback nativo — garante envios mesmo sem movimento
        nativeIntervalIdRef.current = setInterval(() => {
          adicionarGpsLog('[GPS Nativo] Timer 30s de fallback disparado...');
          navigator.geolocation.getCurrentPosition(
            (pos) => processarPontoGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'NativeTimer', pos.coords.speed),
            (err) => {
              adicionarGpsLog(`[GPS Nativo] Erro no timer: ${err.message}`);
              enviarFilaPendentes(); // Tenta esvaziar fila mesmo sem novo ponto
            },
            { enableHighAccuracy: false, maximumAge: 20000, timeout: 10000 }
          );
        }, 30000);

        return; // Não executa o fluxo web abaixo
      } catch (err: any) {
        adicionarGpsLog(`[GPS Nativo] Falha: ${err.message}. Fallback para modo web...`);
      }
    }

    // ── MODO WEB FALLBACK (PWA / Chrome / Safari) ──────────────────────────
    adicionarGpsLog('Modo Web (PWA/Browser). Iniciando rastreamento via navigator.geolocation...');

    // Áudio silencioso para manter a aba ativa no background
    try {
      if ('audioSession' in navigator) {
        try { (navigator as any).audioSession.type = 'playback'; } catch (e) {}
      }
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Rastreamento MagicRoute',
          artist: 'Em Transporte',
          album: 'GPS Ativo'
        });
      }
    } catch (e) {}

    // Heartbeat via audio timeupdate (a cada 15s)
    if (audioRef.current) {
      if (timeUpdateListenerRef.current) {
        audioRef.current.removeEventListener('timeupdate', timeUpdateListenerRef.current);
      }
      let lastHb = 0;
      const handleTimeUpdate = () => {
        const now = Date.now();
        if (now - lastHb >= 15000) {
          lastHb = now;
          adicionarGpsLog('Heartbeat via áudio (15s)...');
          navigator.geolocation.getCurrentPosition(
            (pos) => processarPontoGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'Heartbeat', pos.coords.speed),
            (err) => adicionarGpsLog(`Heartbeat GPS erro: ${err.message}`),
            { enableHighAccuracy: false, maximumAge: 15000, timeout: 8000 }
          );
        }
      };
      timeUpdateListenerRef.current = handleTimeUpdate;
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    }

    // Wake Lock
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        adicionarGpsLog('Screen Wake Lock ativo.');
      }
    } catch (e: any) { adicionarGpsLog(`Wake Lock falhou: ${e.message}`); }

    if (!navigator.geolocation) {
      adicionarGpsLog('Erro: geolocalização não suportada.');
      return;
    }

    // Ponto inicial
    navigator.geolocation.getCurrentPosition(
      (pos) => processarPontoGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'Inicial', pos.coords.speed),
      (err) => adicionarGpsLog(`Erro ponto inicial: ${err.message}`),
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // watchPosition contínuo
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => processarPontoGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'Watch', pos.coords.speed),
      (err) => adicionarGpsLog(`watchPosition erro: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    // Timer recursivo de backup (15s)
    const rodarTimer = () => {
      if (intervalIdRef.current === null) return;
      adicionarGpsLog('Timer GPS backup (15s)...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          processarPontoGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'Timer', pos.coords.speed);
          if (intervalIdRef.current !== null) intervalIdRef.current = setTimeout(rodarTimer, 15000);
        },
        (err) => {
          adicionarGpsLog(`Timer GPS erro: ${err.message}`);
          enviarFilaPendentes(); // Tenta esvaziar fila mesmo sem novo ponto
          if (intervalIdRef.current !== null) intervalIdRef.current = setTimeout(rodarTimer, 15000);
        },
        { enableHighAccuracy: false, maximumAge: 20000, timeout: 10000 }
      );
    };
    intervalIdRef.current = setTimeout(rodarTimer, 15000);
  };

  // ─── Parada do rastreamento ─────────────────────────────────────────────────
  const stopWatcher = async () => {
    adicionarGpsLog('Parando rastreamento GPS...');
    
    if (nativeWatcherIdRef.current) {
      try { await BackgroundGeolocation.removeWatcher({ id: nativeWatcherIdRef.current }); } catch (e) {}
      nativeWatcherIdRef.current = null;
    }
    if (nativeIntervalIdRef.current !== null) {
      clearInterval(nativeIntervalIdRef.current);
      nativeIntervalIdRef.current = null;
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
      try { await wakeLockRef.current.release(); } catch (e) {}
      wakeLockRef.current = null;
    }
    if (audioRef.current) {
      if (timeUpdateListenerRef.current) {
        audioRef.current.removeEventListener('timeupdate', timeUpdateListenerRef.current);
        timeUpdateListenerRef.current = null;
      }
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current = null;
    }
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    lastCoordsRef.current = null;
    // Garantir liberação da flag de envio
    (window as any)._gpsSendingQueue = false;
    adicionarGpsLog('Rastreamento GPS parado com sucesso.');
  };

  // ─── Montagem do hook ───────────────────────────────────────────────────────
  useEffect(() => {
    // Retomar rastreamento se estava ativo antes (reload/crash)
    const savedActive = localStorage.getItem('gps_tracking_active');
    if (savedActive) {
      try {
        const { idEmpresa, idLote, numeroPedido } = JSON.parse(savedActive);
        if (idEmpresa && idLote && numeroPedido) {
          adicionarGpsLog(`Retomando rastreamento para pedido ${numeroPedido}...`);
          startWatcher(idEmpresa, idLote, numeroPedido);
        }
      } catch (e: any) {
        adicionarGpsLog(`Erro ao retomar rastreamento: ${e.message}`);
      }
    }

    const handleStartEvent = (e: Event) => {
      const ev = e as CustomEvent;
      const { idEmpresa, idLote, numeroPedido, audioElement } = ev.detail;
      adicionarGpsLog(`Evento iniciar-gps para pedido ${numeroPedido}.`);
      if (audioElement) audioRef.current = audioElement;
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
        adicionarGpsLog('Visibilidade restaurada — reativando Wake Lock e esvaziando fila.');
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          (navigator as any).wakeLock.request('screen')
            .then((s: any) => { wakeLockRef.current = s; })
            .catch(() => {});
        }
        enviarFilaPendentes();
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
