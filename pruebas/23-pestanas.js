/* Fase F3 · Pestañas y navegación (app.html, pestanas.js, base.js, documento.js).
   Varias páginas abiertas a la vez dentro de la app: abrir con «+», Alt+T, Ctrl+clic o el botón de «Tus páginas»;
   cambiar con clic, flechas, Alt+1…9; cerrar con «×», clic central, Supr o Alt+W (guardando lo pendiente); hasta 12;
   se recuerdan y se descargan las que no se usan; en celular, la lista de pestañas. La misma página en dos pestañas
   no se pisa (la vieja queda para leer, con «Editar aquí»). El botón Atrás (CloseWatcher) cierra lo abierto.
   «Abrir en pestañas» entra desde cualquier página. Contraste y desbordes en celular, escritorio y variantes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const NEGOCIO={perfil:'negocio',modulos:['negocio'],nombre:'',negocio:{nombre:'Abarrotes Lupita',giro:'tienda',telefono:''},creado:'2026-01-01'};

function lista(p){return p.evaluate(function(){return AT.pestanas.lista()})}
async function activo(p){const h=await p.waitForSelector('iframe.pt-marco:not([hidden])');return h.contentFrame()}
function esperar(p,fn,arg){return p.waitForFunction(fn,arg,{timeout:8000})}
/* Espera a que la pestaña activa tenga ese título */
function titulo(p,re){return esperar(p,function(r){return AT.pestanas.lista().some(function(t){return t.activa&&new RegExp(r).test(t.titulo)})},re.source)}
async function listoMarco(f){await f.waitForLoadState('load');await f.waitForFunction(function(){return !!window.AT&&!!document.getElementById('side')&&!!document.getElementById('side').innerHTML})}

prueba('Pestañas dentro de la app',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:800,reducir:true,perfil:NEGOCIO});
  await p.goto(base+'app.html');await listo(p);
  let f=await activo(p);await listoMarco(f);
  let l=await lista(p);
  r.cumple(l.length===1&&l[0].url==='inicio.html'&&l[0].titulo==='Inicio'&&l[0].activa,'al abrir sin pestañas guardadas, una con el Inicio',l);
  r.cumple(await f.evaluate(function(){return AT.enPestana&&document.documentElement.classList.contains('en-pestanas')&&!document.getElementById('sidePestanas')}),'la página sabe que vive en una pestaña y no ofrece «Abrir en pestañas»');
  r.igual(await p.getAttribute('#ptLista','role'),'tablist','la barra de pestañas es una lista de pestañas');
  await revisar(p,r,'pestañas en escritorio');

  /* Navegar dentro de la pestaña cambia su título */
  await Promise.all([f.waitForNavigation(),f.evaluate(function(){AT.crear.nuevo('surtir');return 1})]);await titulo(p,/^Lista para surtir$/);
  f=await activo(p);await listoMarco(f);
  r.cumple(/^documento\.html\?id=d-/.test((await lista(p))[0].url)&&/Lista para surtir/.test(await p.title()),'al abrir una página en la pestaña, su título y su dirección se actualizan');
  const docUrl=(await lista(p))[0].url;

  /* «+» y Alt+T abren el Inicio en una pestaña nueva */
  await p.click('#ptNueva');await titulo(p,/^Inicio$/);
  f=await activo(p);await listoMarco(f);
  r.cumple((await lista(p)).length===2&&await p.evaluate(function(){return document.activeElement&&document.activeElement.tagName==='IFRAME'}),'«+» abre otra pestaña con el Inicio y el foco entra en ella');
  await f.click('h1');await p.keyboard.press('Alt+t');await esperar(p,function(){return AT.pestanas.lista().length===3});
  r.cumple((await lista(p))[2].activa,'Alt+T (desde dentro de la página) abre otra, junto a la actual');

  /* Ctrl+clic en «Tus páginas» abre el documento en una pestaña nueva; la otra queda para leer */
  f=await activo(p);await listoMarco(f);
  r.cumple(await f.$$eval('#arbol .doc-pt',function(e){return e.length})===1,'dentro de las pestañas, cada página de la barra trae «Abrir en una pestaña nueva»');
  await f.click('#arbol a.doc',{modifiers:['Control']});
  await esperar(p,function(){return AT.pestanas.lista().length===4});await titulo(p,/^Lista para surtir$/);
  l=await lista(p);
  r.cumple(l[3].activa&&l[3].url===docUrl,'Ctrl+clic en un enlace lo abre en una pestaña nueva',l);
  const vieja=await (await p.$('#pm-t1')).contentFrame();
  await vieja.waitForSelector('.doc-bloqueo',{state:'attached'});
  r.cumple(await vieja.evaluate(function(){return /otra pestaña/.test(document.querySelector('.doc-bloqueo').textContent)&&AT.docCambio===null&&document.getElementById('docModo').hidden&&document.getElementById('docEstado').textContent==='Solo lectura'}),
    'la misma página abierta en otra pestaña: la vieja queda solo para leer, con aviso');
  /* En la nueva se escribe y se guarda */
  const nueva=await activo(p);await listoMarco(nueva);
  await nueva.waitForSelector('.ed-cuerpo');
  await nueva.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});await nueva.waitForTimeout(100);
  await p.keyboard.type('Refresco de cola');
  await nueva.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000});
  /* «Editar aquí» en la vieja: vuelve a ser la que edita, con lo que se escribió en la otra */
  await p.click('#pt-t1');await vieja.click('#docEditarAqui');
  await vieja.waitForFunction(function(){return !!window.AT&&!!AT.docActual&&!document.querySelector('.doc-bloqueo')},null,{timeout:8000});
  r.cumple(await vieja.evaluate(function(){return JSON.stringify(AT.docActual.contenido).indexOf('Refresco de cola')>=0}),'«Editar aquí» la vuelve la pestaña que edita, con lo escrito en la otra: nada se pisó');
  await nueva.waitForSelector('.doc-bloqueo',{state:'attached'});
  r.cumple(!!await nueva.$('.doc-bloqueo'),'y la otra queda ahora para leer');

  /* Teclado en la barra de pestañas */
  await p.focus('#pt-t1');await p.keyboard.press('ArrowRight');
  l=await lista(p);
  r.cumple(l[1].activa&&await p.evaluate(function(){return document.activeElement.id==='pt-t2'}),'las flechas cambian de pestaña (patrón de pestañas)');
  await p.keyboard.press('End');
  r.cumple((await lista(p))[3].activa,'Fin va a la última');
  await p.keyboard.press('Delete');await esperar(p,function(){return AT.pestanas.lista().length===3});
  r.cumple((await lista(p))[2].activa&&await p.evaluate(function(){return document.activeElement.getAttribute('role')==='tab'}),'Supr cierra la pestaña y el foco pasa a la vecina');
  await p.keyboard.press('Alt+Digit1');
  r.cumple((await lista(p))[0].activa,'Alt+1 va a la primera');
  await p.click('#pt-t2',{button:'middle'});await esperar(p,function(){return AT.pestanas.lista().length===2});
  r.cumple((await lista(p)).map(function(t){return t.titulo}).join()==='Lista para surtir,Inicio','el clic central cierra la pestaña');

  /* Cerrar con Alt+W guarda lo pendiente */
  f=await activo(p);await listoMarco(f);
  await f.waitForSelector('.ed-cuerpo');
  await f.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});await f.waitForTimeout(100);
  await p.keyboard.type(' y agua');
  await f.evaluate(function(){document.activeElement.blur()});
  await p.keyboard.press('Alt+w');await esperar(p,function(){return AT.pestanas.lista().length===1});
  const guardado=await (await activo(p)).evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){return JSON.stringify(d.contenido)})},docUrl.split('=')[1]);
  r.cumple(/Refresco de cola y agua/.test(guardado),'al cerrar una pestaña, lo que tenía pendiente se guarda');

  /* Se recuerdan y solo se carga la activa */
  await p.click('#ptNueva');await titulo(p,/^Inicio$/);
  f=await activo(p);await listoMarco(f);
  await f.click('#arbol .doc-pt');await esperar(p,function(){return AT.pestanas.lista().length===3});await titulo(p,/^Lista para surtir$/);
  await p.click('#pt-t'+(await p.evaluate(function(){return document.querySelectorAll('.pt-tab')[0].id.slice(4)})));
  await p.reload();await listo(p,600);
  l=await lista(p);
  r.cumple(l.length===3&&l[0].activa&&l.filter(function(t){return t.cargada}).length===1&&l[1].titulo==='Inicio'&&l[2].titulo==='Lista para surtir','al volver se restauran las pestañas (y solo se carga la activa)',l);
  await p.keyboard.press('Alt+Digit3');await titulo(p,/^Lista para surtir$/);
  r.cumple((await lista(p))[2].cargada,'una pestaña restaurada se carga al usarla');
  await p.evaluate(function(){return AT.pestanas.descargar(0)});
  l=await lista(p);
  r.cumple(l.filter(function(t){return t.cargada}).length===1&&l[2].cargada&&l[0].titulo,'las que no se usan se descargan sin perder su lugar ni su nombre',l);

  /* Sin pestañas dentro de pestañas */
  f=await activo(p);
  await Promise.all([f.waitForNavigation(),f.evaluate(function(){location.href='app.html';return 1})]);
  await esperar(p,function(){var t=AT.pestanas.lista().filter(function(x){return x.activa})[0];return t&&t.url==='inicio.html'});
  f=await activo(p);await listoMarco(f);
  r.cumple(!await f.$('.pt-barra'),'el contenedor no se abre dentro de una pestaña: va al Inicio');

  /* Hasta 12 */
  await p.evaluate(function(){for(var i=0;i<12;i++)AT.pestanas.abrir('inicio.html',{foco:false});return 1});
  await p.waitForTimeout(300);
  r.cumple((await lista(p)).length===12&&await p.getAttribute('#ptNueva','aria-disabled')==='true'&&/12 pestañas/.test(await p.textContent('#avisoApp')),'no pasa de 12 pestañas y lo explica');
  await cerrar(p);

  /* ---------- «Abrir en pestañas» desde cualquier página ---------- */
  const a=await pagina(browser,{ancho:1280,reducir:true,perfil:NEGOCIO});
  await a.goto(base+'inicio.html');await listo(a);
  const href=await a.getAttribute('#sidePestanas','href');
  r.igual(href,'app.html#abrir=inicio.html','fuera de las pestañas, la barra lateral ofrece «Abrir en pestañas» con la página actual');
  await a.goto(base+'ayuda.html');await listo(a);
  r.igual(await a.getAttribute('#sidePestanas','href'),'app.html#abrir=ayuda.html','también desde la Ayuda');
  await Promise.all([a.waitForURL(/app\.html$/),a.click('#sidePestanas')]);await listo(a);
  await titulo(a,/Ayuda/);
  r.cumple((await lista(a)).length===1&&(await lista(a))[0].url==='ayuda.html','y entra con esa página en una pestaña');
  r.cumple(await a.evaluate(function(){return !document.querySelector('.doc-pt')&&!location.hash}),'sin dejar la dirección con #abrir');
  await cerrar(a);

  /* ---------- El botón Atrás (CloseWatcher) ---------- */
  const z=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:NEGOCIO});
  await z.goto(base+'inicio.html');await listo(z);
  const cw=await z.evaluate(function(){return typeof CloseWatcher==='function'});
  if(cw){
    await z.evaluate(function(){window.__atras=0;window.__soltar=AT.alAtras(function(){window.__atras++})});
    await z.keyboard.press('Escape');await z.waitForTimeout(100);
    r.igual(await z.evaluate(function(){return window.__atras}),1,'AT.alAtras responde a la petición de cerrar (Esc o el botón Atrás del celular)');
  }else r.cumple(true,'(este navegador no tiene CloseWatcher: se usan Esc y las ventanas nativas)');
  await z.click('#menuBtn');await z.waitForTimeout(250);
  await z.keyboard.press('Escape');await z.waitForTimeout(250);
  r.cumple(await z.evaluate(function(){return !document.body.classList.contains('nav-open')}),'el menú lateral en celular se cierra con Atrás o Esc');
  await cerrar(z);

  /* ---------- Celular: la lista de pestañas ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:NEGOCIO});
  await c.goto(base+'app.html');await listo(c);
  await c.click('#ptNueva');await esperar(c,function(){return AT.pestanas.lista().length===2});
  r.cumple(await c.isHidden('#ptLista')&&await c.isVisible('#ptTodas')&&await c.textContent('#ptN')==='2','en celular, un botón con el número de pestañas en lugar de la barra');
  await revisar(c,r,'pestañas en celular');
  await c.click('#ptTodas');await c.waitForSelector('dialog.ptv[open]');
  r.cumple(await c.$$eval('.ptv-b',function(e){return e.length})===2&&await c.evaluate(function(){return document.activeElement.getAttribute('aria-current')==='true'}),'la lista muestra las pestañas, con el foco en la actual');
  await revisar(c,r,'lista de pestañas en celular');
  await c.click('.ptv-i:first-child .ptv-x');await c.waitForTimeout(300);
  r.cumple((await lista(c)).length===1&&await c.$$eval('.ptv-b',function(e){return e.length})===1,'desde la lista se cierra una pestaña');
  await c.click('[data-ptv="nueva"]');await esperar(c,function(){return AT.pestanas.lista().length===2});
  r.cumple(!await c.evaluate(function(){return document.querySelector('dialog.ptv').open}),'y se abre otra');
  await cerrar(c);

  /* ---------- Variantes de lectura ---------- */
  for(const [nombre,aj,ancho] of [['oscuro',{tema:'dark'},1280],['alto contraste ×1.5 y OpenDyslexic',{contraste:'high',escala:1.5,fuente:'opendyslexic'},390],['oscuro y alto contraste',{tema:'dark',contraste:'high'},900]]){
    const q=await pagina(browser,{ancho:ancho,ajustes:aj,reducir:true,perfil:NEGOCIO});
    await q.goto(base+'app.html');await listo(q);
    await q.click('#ptNueva');await q.waitForTimeout(300);
    await revisar(q,r,'pestañas en '+nombre);
    await cerrar(q);
  }
});
