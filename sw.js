/* Service worker de OneLearn: guarda el sitio completo para usarlo sin conexión.
   Estrategia «red primero»: con conexión, cada archivo se pide a la red (así siempre ves la versión
   publicada) y se actualiza la copia guardada; sin conexión, o si la red tarda más de 4 s, se usa la copia.
   Al agregar o quitar archivos del sitio, actualiza ARCHIVOS y sube VERSION.
   pruebas/6-app.js comprueba que ARCHIVOS incluya todo lo que el sitio necesita. */
'use strict';
const VERSION='onelearn-5';
const ARCHIVOS=[
  './',
  'index.html',
  'documento.html',
  'manifest.webmanifest',
  'assets/css/base.css',
  'assets/css/editor.css',
  'assets/js/ajustes.js',
  'assets/js/catalogo.js',
  'assets/js/base.js',
  'assets/js/datos.js',
  'assets/js/respaldo.js',
  'assets/js/barra.js',
  'assets/js/lectura.js',
  'assets/js/apuntes.js',
  'assets/js/app.js',
  'assets/js/bloques.js',
  'assets/js/crear.js',
  'assets/js/editor.js',
  'assets/js/documento.js',
  'assets/js/avance.js',
  'assets/js/inicio.js',
  'assets/js/zen.js',
  'lecciones/ram.html',
  'lecciones/ram.css',
  'lecciones/ram.js',
  'lecciones/cpu.html',
  'lecciones/cpu.css',
  'lecciones/cpu.js',
  'assets/vendor/tiptap.min.js',
  'assets/icons/icono.svg',
  'assets/icons/icono-maskable.svg',
  'assets/icons/icono-32.png',
  'assets/icons/icono-180.png',
  'assets/icons/icono-192.png',
  'assets/icons/icono-512.png',
  'assets/icons/icono-maskable-512.png',
  'assets/fonts/ibm-plex-sans-latin-400-normal.woff2',
  'assets/fonts/ibm-plex-sans-latin-400-italic.woff2',
  'assets/fonts/ibm-plex-sans-latin-500-normal.woff2',
  'assets/fonts/ibm-plex-sans-latin-600-normal.woff2',
  'assets/fonts/ibm-plex-sans-latin-700-normal.woff2',
  'assets/fonts/ibm-plex-mono-latin-400-normal.woff2',
  'assets/fonts/ibm-plex-mono-latin-500-normal.woff2',
  'assets/fonts/ibm-plex-mono-latin-600-normal.woff2',
  'assets/fonts/ibm-plex-mono-latin-700-normal.woff2',
  'assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  'assets/fonts/atkinson-hyperlegible-latin-400-italic.woff2',
  'assets/fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  'assets/fonts/opendyslexic-latin-400-normal.woff2',
  'assets/fonts/opendyslexic-latin-400-italic.woff2',
  'assets/fonts/opendyslexic-latin-700-normal.woff2'
];
const ESPERA_RED=4000;

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(ARCHIVOS)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('onelearn-')===0&&k!==VERSION}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});

async function redPrimero(req){
  const cache=await caches.open(VERSION);
  const red=fetch(req).then(function(res){
    if(res.ok&&res.type==='basic')cache.put(req,res.clone());
    return res;
  });
  /* Si la red falla después de servir la copia, no hay nada más que hacer */
  red.catch(function(){});
  try{
    return await Promise.race([red,new Promise(function(_,no){setTimeout(function(){no(new Error('la red tarda'))},ESPERA_RED)})]);
  }catch(err){
    const guardado=await cache.match(req,{ignoreSearch:true});
    if(guardado)return guardado;
    /* Una página que no está guardada: se lleva al inicio (con redirección, para que sus rutas relativas funcionen) */
    if(req.mode==='navigate'&&await cache.match('index.html'))return Response.redirect(new URL('index.html',self.registration.scope).href,302);
    return red;
  }
}
self.addEventListener('fetch',function(e){
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  e.respondWith(redPrimero(req));
});
