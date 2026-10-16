/* 키보토스 대화 OS PWA Service Worker. 앱의 localStorage는 이 파일에서 수정하지 않습니다. */
const CACHE_NAME = 'kivotos-pwa-v10-9-1';
const APP_SHELL = ['./index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 앱 HTML이 큰 경우에도 기본 설치가 실패하지 않도록 항목별로 시도합니다.
    for (const url of APP_SHELL) {
      try { await cache.add(url); } catch (error) { console.warn('[Kivotos PWA] 캐시 건너뜀:', url); }
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('kivotos-pwa-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // 앱 페이지 탐색은 최신 버전을 우선하고, 연결이 없으면 캐시된 HTML을 사용합니다.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone()).catch(() => {});
          return response;
        }
      } catch (error) {}
      return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
    })());
    return;
  }
  // 같은 사이트의 앱 아이콘/manifest만 캐시에서 제공하고, 외부 API 요청은 건드리지 않습니다.
  const url = new URL(request.url);
  if (url.pathname.endsWith('/manifest.json') || url.pathname.includes('/icons/')) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone()).catch(() => {});
        return response;
      } catch (error) { return Response.error(); }
    })());
  }
});
