/* DNZ PWA service worker — yalnızca http(s) isteklerini önbelleğe alır */
const CACHE_NAME = 'dnz-cache-v2';

function isCacheableRequest(request){
  try{
    const url = new URL(request.url);
    if(url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if(url.protocol === 'chrome-extension:') return false;
    return true;
  }catch(e){
    return false;
  }
}

self.addEventListener('install', (event)=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache)=>{
      return cache.addAll([
        './',
        './index.html'
      ]).catch(()=>{ /* offline ilk kurulumda bazı dosyalar eksik olabilir */ });
    })
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
  if(!isCacheableRequest(request)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache)=>{
      try{
        const networkResponse = await fetch(request);
        if(networkResponse && networkResponse.ok && isCacheableRequest(request)){
          try{ await cache.put(request, networkResponse.clone()); }catch(_){ /* chrome-extension vb. atla */ }
        }
        return networkResponse;
      }catch(e){
        const cached = await cache.match(request);
        if(cached) return cached;
        if(request.mode === 'navigate'){
          const fallback = await cache.match('./index.html');
          if(fallback) return fallback;
        }
        throw e;
      }
    })
  );
});
