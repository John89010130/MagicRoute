const CACHE_NAME = 'magicroute-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalação - Pré-cacheia os recursos fundamentais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-cacheando recursos essenciais...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação - Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheKeys) => {
      return Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requisições (Fetch)
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Pular requisições de API, Google Maps, localtunnel, ngrok, etc. (Sempre buscar da rede)
  if (
    event.request.method !== 'GET' ||
    reqUrl.pathname.includes('/api/') ||
    reqUrl.hostname.includes('ngrok') ||
    reqUrl.hostname.includes('loca.lt') ||
    reqUrl.hostname.includes('google') ||
    reqUrl.pathname.includes('UrlCliente') ||
    reqUrl.pathname.includes('BuscaUsuario')
  ) {
    return; // Deixa ir direto para a rede sem cache
  }

  // Estratégia Network-First para index.html e a raiz '/' para garantir atualizações instantâneas
  if (reqUrl.pathname.endsWith('/') || reqUrl.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para o restante (CSS, JS, Imagens, HTML do app)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Em caso de falha de rede total, retorna o cache se existir
          return cachedResponse;
        });

        // Retorna a resposta cacheada imediatamente se existir, caso contrário aguarda a rede
        return cachedResponse || fetchPromise;
      });
    })
  );
});
