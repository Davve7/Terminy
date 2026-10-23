/* terminy: offline cache.
   Page: network first (always revalidated, also behind GitHub Pages 10 min cache) with a 4 s limit, then the saved copy (updates arrive as soon as you are online).
   Other files: saved copy first, refreshed in the background. */
const V="terminy-20261023143657";
const CORE=["./", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "favicon-32.png", "favicon.ico"];
const EXT=/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/;
const PAGE="./";
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>fetch(u,{cache:"reload"}).then(res=>{if(res.ok&&!res.redirected)return c.put(u,res)}).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(x=>x.startsWith("terminy-")&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
function savePage(res){if(res&&res.ok&&!res.redirected&&res.type==="basic"){const c=res.clone();caches.open(V).then(x=>x.put(PAGE,c))}}
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(r.mode==="navigate"){
    e.respondWith((async()=>{
      const cached=await caches.match(PAGE,{cacheName:V});
      const net=fetch(r.url,{cache:"no-cache",credentials:"same-origin"}).then(res=>{savePage(res);return res});
      if(!cached)return net.catch(()=>new Response("Aplikace potřebuje při prvním spuštění internet.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}}));
      const timer=new Promise(res=>setTimeout(()=>res(null),4000));
      try{const first=await Promise.race([net,timer]);if(first)return first}catch(err){}
      return cached;
    })());
    return;
  }
  if(u.origin!==location.origin&&!EXT.test(u.hostname))return;
  e.respondWith(caches.open(V).then(c=>c.match(r,{ignoreSearch:u.origin===location.origin}).then(hit=>{
    const net=fetch(r).then(res=>{if((res.ok&&!res.redirected)||res.type==="opaque")c.put(r,res.clone());return res}).catch(()=>hit||Response.error());
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}
    return net;
  })));
});
