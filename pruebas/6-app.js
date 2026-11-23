/* Hito 6: app instalable y sin conexión (manifiesto, íconos, service worker e «Instalar»). */
'use strict';
const fs=require('fs'),path=require('path');
const {prueba,pagina,cerrar,listo,revisar,RAIZ}=require('./lib');

/* Archivos que el sitio necesita: todo, menos pruebas, herramientas de compilación, la configuración de Claude Code (.claude), documentación, licencias y el propio sw.js */
function archivosDelSitio(){
  const fuera=/^(\.git|\.claude|pruebas|herramientas|node_modules)(\/|$)|\.md$|\.txt$|^\.gitignore$|^sw\.js$/;
  const lista=[];
  (function recorrer(dir){
    fs.readdirSync(dir,{withFileTypes:true}).forEach(function(d){
      const abs=path.join(dir,d.name),rel=path.relative(RAIZ,abs).split(path.sep).join('/');
      if(fuera.test(rel))return;
      if(d.isDirectory())recorrer(abs);else lista.push(rel);
    });
  })(RAIZ);
  return lista.sort();
}
function tamPng(buf){return buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20)}

prueba('Hito 6 · App instalable y sin conexión',async function({browser,base,r}){
  /* La lista del service worker cubre todo el sitio, y todo lo que lista existe */
  const sw=fs.readFileSync(path.join(RAIZ,'sw.js'),'utf8');
  const lista=JSON.parse(sw.match(/const ARCHIVOS=(\[[\s\S]*?\]);/)[1].replace(/'/g,'"'));
  const version=sw.match(/const VERSION='([^']+)'/)[1];
  const sitio=archivosDelSitio();
  const faltan=sitio.filter(function(f){return lista.indexOf(f)<0});
  const sobran=lista.filter(function(f){return f!=='./'&&!fs.existsSync(path.join(RAIZ,f))});
  r.cumple(faltan.length===0,'sw.js guarda todos los archivos del sitio',faltan);
  r.cumple(sobran.length===0,'todo lo que lista sw.js existe',sobran);

  /* Manifiesto e íconos */
  const p=await pagina(browser);
  await p.goto(base+'inicio.html');await listo(p);
  const man=await (await p.request.get(base+'manifest.webmanifest')).json();
  r.cumple(man.name==='OneBook'&&man.lang==='es'&&man.display==='standalone'&&man.start_url==='inicio.html'&&man.scope==='./','el manifiesto tiene nombre, idioma, modo app y abre en Inicio (relativo)',man);
  for(const ic of man.icons){
    const res=await p.request.get(base+ic.src);
    r.igual(res.status(),200,'el ícono '+ic.src+' existe');
    if(ic.type==='image/png')r.igual(tamPng(await res.body()),ic.sizes,'el ícono '+ic.src+' mide lo que dice el manifiesto');
  }
  r.cumple(man.icons.some(function(i){return i.purpose==='maskable'}),'hay un ícono «maskable» para Android');
  for(const pag of ['inicio.html','lecciones/ram.html','lecciones/cpu.html']){
    const q=await pagina(browser);
    await q.goto(base+pag);await listo(q);
    const h=await q.evaluate(function(){const m=document.querySelector('link[rel="manifest"]'),i=document.querySelector('link[rel="icon"]');return {m:m&&m.href,i:i&&i.href}});
    r.igual(h.m,base+'manifest.webmanifest',pag+': enlaza el manifiesto');
    r.cumple(!!h.i,pag+': tiene ícono para la pestaña');
    r.igual(q.externos.length,0,pag+': no pide nada a otros servidores (fuentes incluidas)');
    await cerrar(q);
  }

  /* Service worker: se instala, guarda el sitio y toma el control */
  await p.evaluate(function(){return navigator.serviceWorker.ready.then(function(){})});
  await p.reload();await listo(p);
  r.cumple(await p.evaluate(function(){return !!navigator.serviceWorker.controller}),'el service worker controla la página');
  const guardados=await p.evaluate(function(v){return caches.open(v).then(function(c){return c.keys()}).then(function(k){return k.length})},version);
  r.igual(guardados,lista.length,'se guardan todos los archivos de la lista');

  /* Sin conexión: el criterio del hito */
  await p.context().setOffline(true);
  p.errores.length=0;
  await p.goto(base+'inicio.html');await listo(p);
  r.cumple(/Buen|Hola/.test(await p.textContent('#saludo')),'sin conexión abre el inicio');
  for(const [pag,titulo] of [['lecciones/ram.html','Memoria RAM'],['lecciones/cpu.html','Procesador (CPU)']]){
    await p.goto(base+pag);await listo(p);
    r.igual(await p.textContent('h1'),titulo,'sin conexión abre '+titulo+', aunque no se haya visitado');
    r.cumple(await p.evaluate(function(){return document.fonts.check('16px "IBM Plex Sans"')&&!!document.querySelector('.cell')||!!document.querySelector('#cpuMem')}),titulo+': sin conexión carga la letra y los laboratorios');
  }
  await p.goto(base+'lecciones/cpu.html#s-cache');await listo(p,500);
  const top=await p.evaluate(function(){return Math.round(document.getElementById('s-cache').getBoundingClientRect().top)});
  r.cumple(top>0&&top<120,'sin conexión, un enlace a una sección lleva a ella',top);
  await p.click('#aaBtn');await p.click('#lectura .seg[data-k="fuente"] button[data-v="opendyslexic"]');await p.waitForTimeout(400);
  r.cumple(await p.evaluate(function(){return document.fonts.check('16px "OpenDyslexic"')}),'sin conexión se puede cambiar a OpenDyslexic');
  await p.goto(base+'lecciones/no-existe.html');await listo(p);
  r.cumple(!!await p.$('#saludo'),'sin conexión, una página que no existe muestra el inicio');
  r.cumple(p.errores.length===0,'sin errores sin conexión',p.errores.slice(0,3));
  await p.context().setOffline(false);
  await cerrar(p);

  /* «Instalar» en el inicio */
  const a=await pagina(browser);
  await a.goto(base+'inicio.html');await listo(a);
  r.cumple(await a.isHidden('#instalar'),'si el navegador no ofrece instalar, no se muestra nada');
  await a.evaluate(function(){
    const e=new Event('beforeinstallprompt',{cancelable:true});
    e.prompt=function(){window.__pidio=true};e.userChoice=Promise.resolve({outcome:'accepted'});
    window.dispatchEvent(e);
  });
  r.cumple(await a.isVisible('#instalarBtn'),'cuando el navegador lo permite, aparece «Instalar»');
  await revisar(a,r,'inicio con «Instalar»');
  await a.click('#instalarBtn');await a.waitForTimeout(200);
  r.cumple(await a.evaluate(function(){return window.__pidio===true}),'«Instalar» abre el diálogo del navegador');
  r.cumple(await a.isHidden('#instalar'),'al aceptar, la tarjeta desaparece');
  /* El aviso de actualización */
  await a.evaluate(function(){window.__recarga=0;AT.aviso('OneBook se actualizó.','Recargar',function(){window.__recarga++})});
  r.cumple(await a.isVisible('#avisoApp'),'el aviso de actualización se muestra');
  await revisar(a,r,'aviso de actualización');
  await a.click('#avisoApp .btn');
  r.cumple(await a.evaluate(function(){return window.__recarga===1})&&await a.isHidden('#avisoApp'),'«Recargar» del aviso funciona y lo cierra');
  await cerrar(a);

  /* iPhone: se explica cómo instalar */
  const ctx=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',isMobile:true,hasTouch:true});
  const i=await ctx.newPage();
  await i.goto(base+'inicio.html');await i.waitForLoadState('load');
  r.cumple(await i.isVisible('#instalar')&&await i.isHidden('#instalarBtn')&&/Agregar a inicio/.test(await i.textContent('#instalarTxt')),'en iPhone se explica cómo agregarlo al inicio');
  await ctx.close();
});
