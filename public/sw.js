const CACHE_NAME = 'recipes-shell-v1';

// Only the public app shell is cached here. Private data is cached by the app,
// and /api/session, login, logout, and backups always go to the network.
async function cacheResponse(request, response) {
  if (response.ok && !response.redirected && response.type !== 'opaque') {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheShell() {
  try {
    const response = await fetch('/', { cache: 'reload' });
    if (!response.ok) return;
    const html = await response.clone().text();
    await cacheResponse('/index.html', response);
    const assets = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
      .map((match) => match[1]).filter((url) => url.startsWith('/assets/'));
    await Promise.all(['/manifest.webmanifest', '/favicon.svg', ...assets].map(async (url) => {
      try { await cacheResponse(url, await fetch(url)); } catch { /* Retry on next visit. */ }
    }));
  } catch { /* Installation must also work with an interrupted connection. */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('recipes-') && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    if (request.mode === 'navigate') {
      try { return await cacheResponse('/index.html', await fetch(request)); }
      catch (error) {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        throw error;
      }
    }
    const cached = await caches.match(request);
    return cached ?? cacheResponse(request, await fetch(request));
  })());
});
