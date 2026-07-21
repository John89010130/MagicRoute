const CACHE_NAME = 'magicroute-v1.1.9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheKeys) => {
      return Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// ── Notificação de segundo plano "Em Transporte" ──────────────────────────
// O app envia mensagens para mostrar/fechar a notificação de rastreamento ativo
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_TRANSPORT_NOTIFICATION') {
    const { clienteNome, endereco } = event.data;
    // Fecha notificações anteriores do mesmo tag
    self.registration.getNotifications({ tag: 'em-transporte' }).then((prev) => {
      prev.forEach(n => n.close());
    });
    self.registration.showNotification('🚚 MagicRoute — Em Transporte', {
      body: (clienteNome ? clienteNome + '\n' : '') + (endereco || 'Toque para voltar ao app e finalizar'),
      tag: 'em-transporte',
      icon: './icon-192.png',
      badge: './icon-192.png',
      requireInteraction: true, // não some sozinha no Android
      silent: true,
      actions: [
        { action: 'open', title: '📋 Abrir App' },
        { action: 'dismiss', title: 'Fechar' }
      ],
      data: { url: self.registration.scope }
    });
  }

  if (event.data.type === 'CLOSE_TRANSPORT_NOTIFICATION') {
    self.registration.getNotifications({ tag: 'em-transporte' }).then((notifs) => {
      notifs.forEach(n => n.close());
    });
  }
});

// Ao clicar na notificação: foca ou abre o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find(c => c.url.startsWith(self.registration.scope));
      if (existing) return existing.focus();
      return self.clients.openWindow(self.registration.scope);
    })
  );
});

// Interceptar requisições (Fetch)
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const reqUrl = new URL(event.request.url);

  // Nunca cachear API, GPS, mapas ou túneis
  if (
    event.request.method !== 'GET' ||
    reqUrl.pathname.includes('/api/') ||
    reqUrl.pathname.includes('gps-point') ||
    reqUrl.hostname.includes('ngrok') ||
    reqUrl.hostname.includes('loca.lt') ||
    reqUrl.hostname.includes('trycloudflare.com') ||
    reqUrl.hostname.includes('google') ||
    reqUrl.pathname.includes('UrlCliente') ||
    reqUrl.pathname.includes('BuscaUsuario')
  ) {
    return;
  }

  // Network-First para index.html / raiz
  if (reqUrl.pathname.endsWith('/') || reqUrl.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate para CSS, JS, imagens
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      });
    })
  );
});
