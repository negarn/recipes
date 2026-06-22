const CACHE_NAME = 'recipes-offline-v3';
const APP_SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg?v=7'];

function isSameOriginUrl(url) {
  return url.origin === self.location.origin;
}

async function cacheResponse(request, response) {
  if (!response || !response.ok || response.type === 'opaque') {
    return response;
  }

  const responseUrl = response.url ? new URL(response.url) : null;

  if (responseUrl?.origin === self.location.origin && responseUrl.pathname.startsWith('/auth/')) {
    return response;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {
    return response;
  }

  return response;
}

function getHtmlAssetUrls(html) {
  return Array.from(html.matchAll(/\b(?:src|href)="([^"]+)"/g))
    .map((match) => match[1])
    .filter((url) => url.startsWith('/assets/'));
}

async function fetchCacheableResponse(url) {
  const response = await fetch(url, {
    cache: 'reload',
    credentials: 'same-origin'
  });

  if (!response || !response.ok || response.redirected || response.type === 'opaque') {
    return null;
  }

  const responseUrl = response.url ? new URL(response.url) : null;

  if (responseUrl?.origin === self.location.origin && responseUrl.pathname.startsWith('/auth/')) {
    return null;
  }

  return response;
}

async function cacheUrl(cache, url) {
  try {
    const response = await fetchCacheableResponse(url);

    if (response) {
      await cache.put(url, response.clone());
    }

    return response;
  } catch {
    return null;
  }
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const indexResponse = await cacheUrl(cache, '/index.html');
  const indexHtml = indexResponse ? await indexResponse.clone().text() : '';
  const assetUrls = getHtmlAssetUrls(indexHtml);

  await Promise.all(
    [...APP_SHELL_URLS, ...assetUrls].map((url) => cacheUrl(cache, url))
  );
}

async function fetchAndCache(request) {
  return cacheResponse(request, await fetch(request));
}

async function respondWithCachedFallback(request, fallbackRequest = request) {
  try {
    return await fetchAndCache(request);
  } catch (error) {
    const cachedResponse = await caches.match(fallbackRequest);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (
    !isSameOriginUrl(url) ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/auth/')
  ) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(respondWithCachedFallback(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(respondWithCachedFallback(request, '/index.html'));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse ?? fetchAndCache(request);
    })
  );
});
