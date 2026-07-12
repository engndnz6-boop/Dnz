// DNZ Metraj & Teklif — Service Worker
// Amaç: uygulama bir kez internetli açıldıktan sonra, sonraki açılışlarda tamamen
// internetsiz (offline) çalışabilmesini sağlamak. Uygulama kabuğunu (index.html,
// manifest, ikonlar) ve dışarıdan yüklenen kütüphaneleri (fontlar, html2canvas, jsPDF)
// önbelleğe alır; ağ yoksa önbellekten, varsa güncel sürümden sunar.

const CACHE_NAME = 'dnz-metraj-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(()=>{ /* çekirdek dosyalardan biri bulunamazsa sessizce geç */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Strateji: "stale-while-revalidate" — önce önbellekten anında yanıt ver (varsa),
// arka planda ağdan güncel sürümü çekip önbelleği tazele. Ağ yoksa (offline) ve
// önbellekte de yoksa, sayfa isteklerinde index.html'e düş (uygulama en azından açılsın).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => null);

      if (cached) return cached;

      return networkFetch.then((res) => {
        if (res) return res;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline ve önbellekte yok' });
      });
    })
  );
});
