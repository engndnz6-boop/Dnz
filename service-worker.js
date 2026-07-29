/* DNZ PWA — yalnızca aynı origin (kendi site) GET isteklerini yönetir */
const CACHE_NAME = 'dnz-cache-v3';

function isSameOrigin(url){
  try{
    return new URL(url).origin === self.location.origin;
  }catch(e){
    return false;
  }
}

self.addEventListener('install', (event)=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache)=>
      cache.addAll(['./', './index.html']).catch(()=>{})
    )
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then((keys)=>
      Promise.all(keys.filter((k)=>k !== CACHE_NAME).map((k)=>caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (event)=>{
  const request = event.request;
  if(request.method !== 'GET') return;
  // Uzantı / analytics / CDN — service worker'a hiç sokma
  if(!isSameOrigin(request.url)) return;

  event.respondWith((async ()=>{
    const cache = await caches.open(CACHE_NAME);
    try{
      const networkResponse = await fetch(request);
      if(networkResponse && networkResponse.ok){
        try{ await cache.put(request, networkResponse.clone()); }catch(_){}
      }
      return networkResponse;
    }catch(_){
      const cached = await cache.match(request);
      if(cached) return cached;
      if(request.mode === 'navigate'){
        const fallback = await cache.match('./index.html');
        if(fallback) return fallback;
      }
      // Ağ yok + cache yok: boş 503 (uncaught TypeError üretme)
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
