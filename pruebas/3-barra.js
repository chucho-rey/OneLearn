/* La barra lateral: Inicio, Crear, Buscar, «Tus páginas» como un explorador y el pie (Lectura, Tus datos, Ayuda y modo
   zen en una página). «Tus páginas»: las ubicaciones con su cuenta (en el Inicio cambian el explorador; desde otra
   página abren el Inicio ahí), las salas como carpetas con sus páginas (favoritas primero; sin «Mi negocio» ni «Tu
   equipo»; se abren y se cierran, y se recuerda), la sala de la página abierta abierta, por
   tipo y la papelera con su cuenta. Se maneja con flechas como un árbol. En celular el menú retiene el foco.
   Variantes de lectura sin desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function doc(id,titulo,extra){
  return Object.assign({formato:1,tipo:'notas',id:id,titulo:titulo,props:[],creado:'2026-11-01T10:00:00.000Z',editado:'2026-11-01T10:00:00.000Z',
    contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-'+id.slice(2,8)},content:[{type:'text',text:'Hola'}]}]}},extra||{});
}
const DOCS=[doc('d-uno','Ventas de noviembre',{editado:'2026-11-20T10:00:00.000Z'}),doc('d-dos','Proveedores',{editado:'2026-11-22T10:00:00.000Z'}),
  doc('d-fav','Lista de precios',{favorito:true}),doc('d-miequipo','Tu equipo')];
async function sembrar(p){await p.evaluate(function(l){return Promise.all(l.map(function(d){return AT.datos.documentos.guardar(d,{conservarFecha:true})}))},DOCS)}
const GEN='#arbol [data-sala="sa-general"]';
function nombres(p){return p.$$eval(GEN+' .arb-pags a.doc > span',function(e){return e.map(function(x){return x.textContent})})}
function cuenta(p,k){return p.textContent('#arbol [data-ubic="'+k+'"] em')}

prueba('Hito 3 · Barra lateral',async function({browser,base,r}){
  const p=await pagina(browser);
  await p.goto(base+'inicio.html');await listo(p);
  await sembrar(p);
  await p.reload();await listo(p,500);
  r.cumple(await cuenta(p,'todas')==='3'&&await cuenta(p,'favoritas')==='1'&&await p.textContent(GEN+' .sala-nv em')==='3','las ubicaciones y la sala General dicen cuántas páginas tienen (sin «Mi negocio» ni «Tu equipo»)');
  r.igual((await nombres(p)).join(' · '),'Lista de precios · Proveedores · Ventas de noviembre','la General está abierta: la favorita primero y después las más recientes');
  r.cumple(await p.isVisible(GEN+' a.doc .doc-est'),'la favorita lleva su estrella');
  r.cumple(await p.evaluate(function(){var h=[].map.call(document.querySelectorAll('#arbol .arb-h'),function(x){return getComputedStyle(x).textTransform});return h.length>=2&&h.every(function(t){return t==='none'})}),'los encabezados («Tus páginas», «Salas») van en letra normal, no en mayúsculas');
  r.igual(await p.getAttribute('#arbol [data-ubic="todas"]','aria-current'),'true','en el Inicio, la ubicación del explorador está marcada');
  /* En el Inicio, una ubicación cambia el explorador (el explorador ya no tiene su propia columna) */
  r.cumple(!(await p.$('#xpNav,.xp-nav')),'el explorador ya no tiene su columna de ubicaciones');
  await p.click('#arbol [data-ubic="favoritas"]');await p.waitForTimeout(200);
  r.cumple(/Favoritas/.test(await p.textContent('#xpRuta'))&&await p.getAttribute('#arbol [data-ubic="favoritas"]','aria-current')==='true'&&!(await p.getAttribute('#arbol [data-ubic="todas"]','aria-current'))&&/inicio\.html$/.test(p.url()),
    '«Favoritas» cambia el explorador sin recargar y queda marcada');
  r.igual(await p.$$eval('#xpLista a.xp-a > span',function(e){return e.map(function(x){return x.textContent}).join(' · ')}),'Lista de precios','y el explorador muestra solo la favorita');
  /* Abrir y cerrar una sala; se recuerda */
  await p.click(GEN+' .arb-tg');
  r.cumple(await p.getAttribute(GEN+' .arb-tg','aria-expanded')==='false'&&await p.isHidden(GEN+' .arb-pags'),'la flecha cierra la sala');
  await p.reload();await listo(p,400);
  r.cumple(await p.isHidden(GEN+' .arb-pags')&&/Favoritas/.test(await p.textContent('#xpRuta')),'después de recargar sigue cerrada y el explorador sigue en «Favoritas»');
  /* Con el teclado, como un árbol */
  await p.focus(GEN+' .sala-nv');await p.keyboard.press('ArrowRight');await p.waitForTimeout(50);
  r.cumple(await p.getAttribute(GEN+' .arb-tg','aria-expanded')==='true','→ abre la sala');
  await p.keyboard.press('ArrowRight');
  r.igual(await p.evaluate(function(){return document.activeElement.textContent}),'Lista de precios (favorita)','→ otra vez entra a su primera página');
  await p.keyboard.press('ArrowDown');
  r.igual(await p.evaluate(function(){return document.activeElement.textContent}),'Proveedores','↓ baja a la siguiente');
  await p.keyboard.press('ArrowLeft');
  r.cumple(await p.evaluate(function(){return document.activeElement.classList.contains('sala-nv')}),'← sube a su sala');
  await p.keyboard.press('ArrowLeft');
  r.cumple(await p.getAttribute(GEN+' .arb-tg','aria-expanded')==='false','← otra vez la cierra');
  await p.keyboard.press('Home');
  r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('data-ubic')}),'todas','Inicio va a la primera ubicación');
  await p.click('#arbol [data-ubic="todas"]');await p.waitForTimeout(150);
  await p.click(GEN+' .arb-tg');
  r.cumple(await p.getAttribute('#side a.nv[href="inicio.html"]','aria-current')==='page','el Inicio está marcado como la página actual');
  r.cumple(await p.isVisible('#sideCrear')&&await p.isVisible('#sideBuscar')&&await p.isVisible('#sideAyuda')&&await p.isVisible('#sideDatos'),'Crear, Buscar, Ayuda y Tus datos están en la barra');
  r.igual(await p.$$eval('#side .tabs,#side .tab,#side .grp-btn,#notasLista,#marcLista',function(e){return e.length}),0,'ya no hay pestañas de temas, apuntes ni marcadores');
  r.cumple(!await p.$('#sideRutas')&&!await p.$('#sideProyectos')&&!await p.$('#side a[href="acerca.html"]'),'ni rutas, ni proyectos, ni «Cómo está hecho»');
  /* La papelera aparece al final cuando hay algo en ella */
  await p.evaluate(function(){return AT.datos.documentos.leer('d-uno').then(function(d){return AT.datos.papelera.mover(d)})});
  await p.waitForTimeout(700);
  r.igual((await nombres(p)).join(' · '),'Lista de precios · Proveedores','al mandar una página a la papelera sale de la lista');
  r.cumple(/Papelera\s*1/.test(await p.textContent('#arbol [data-papelera]'))&&await cuenta(p,'todas')==='2','y la papelera, al final, dice cuántas tiene');
  await p.click('#arbol [data-papelera]');await p.waitForSelector('dialog.pap-dlg[open]');
  r.cumple(true,'la papelera de la barra abre la ventana de la papelera');
  await p.keyboard.press('Escape');
  await p.click('#sideLectura');
  r.cumple(await p.isVisible('#lectura'),'«Lectura» del pie abre el panel');
  await p.keyboard.press('Escape');
  /* En una página: queda marcada y el pie ofrece el modo zen */
  await p.goto(base+'documento.html?id=d-dos');await listo(p,400);
  r.cumple(await p.getAttribute(GEN+' a.doc.on','aria-current')==='page'&&await p.isVisible(GEN+' a.doc.on')&&await p.evaluate(function(){return document.querySelector('#arbol [data-sala="sa-general"] .sala-nv').classList.contains('on')}),'la página abierta está marcada, dentro de su sala (abierta y marcada)');
  /* Una ubicación desde otra página abre el Inicio ahí */
  await Promise.all([p.waitForURL(/inicio\.html$/),p.click('#arbol [data-ubic="favoritas"]')]);await listo(p,400);
  r.cumple(/Favoritas/.test(await p.textContent('#xpRuta'))&&await p.getAttribute('#arbol [data-ubic="favoritas"]','aria-current')==='true','desde una página, «Favoritas» abre el Inicio con el explorador en «Favoritas»',[p.url(),await p.textContent('#xpRuta'),await p.getAttribute('#arbol [data-ubic="favoritas"]','aria-current')]);
  await p.goto(base+'documento.html?id=d-dos');await listo(p,400);
  r.cumple(await p.isVisible('#sideZen'),'en una página, el pie ofrece el modo zen');
  r.cumple(p.errores.length===0,'sin errores en escritorio',p.errores);
  await cerrar(p);

  /* Sin páginas */
  const v=await pagina(browser);
  await v.goto(base+'inicio.html');await listo(v,400);
  r.cumple(/Todavía no tienes páginas/.test(await v.textContent('#arbol')),'sin páginas, la barra dice cómo crear la primera');
  await cerrar(v);

  /* Celular: el menú retiene el foco */
  const c=await pagina(browser,{ancho:390,alto:844});
  await c.goto(base+'inicio.html');await listo(c);
  await sembrar(c);await c.reload();await listo(c,400);
  await c.focus('#menuBtn');await c.keyboard.press('Enter');await c.waitForTimeout(300);
  r.cumple(/Inicio/.test(await c.evaluate(function(){return document.activeElement.textContent})),'en celular, al abrir el menú el foco va a la página actual');
  let fuera=0;
  for(let i=0;i<30;i++){await c.keyboard.press('Tab');if(!await c.evaluate(function(){return document.getElementById('side').contains(document.activeElement)}))fuera++}
  r.igual(fuera,0,'en celular, Tab no sale del menú abierto');
  await Promise.all([c.waitForURL(/documento\.html\?id=d-fav/),c.click(GEN+' a.doc:has-text("Lista de precios")')]);await listo(c,400);
  r.cumple(!await c.evaluate(function(){return document.body.classList.contains('nav-open')}),'al elegir una página, se abre y el menú queda cerrado');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);

  /* Letra grande, OpenDyslexic y alto contraste, con una página de nombre muy largo */
  for(const ancho of [390,1280])for(const [escala,fuente] of [[1,'normal'],[1.5,'normal'],[1,'opendyslexic'],[1.5,'opendyslexic']])
  for(const [tema,contraste] of [['light','normal'],['dark','high']]){
    const s=await pagina(browser,{ancho:ancho,alto:844,ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste}});
    await s.goto(base+'inicio.html');await listo(s);
    await s.evaluate(function(d){return AT.datos.documentos.guardar(d,{conservarFecha:true})},doc('d-largo','Un nombre con una palabra larguísimasinespaciosquepodríadesbordar la barra'));
    await s.reload();await listo(s,300);
    if(ancho<900){await s.click('#menuBtn');await s.waitForTimeout(350)}
    const et=ancho+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste;
    r.cumple(await s.evaluate(function(){const b=document.getElementById('side');return b.scrollWidth<=b.clientWidth}),et+': la barra lateral no se desborda');
    await revisar(s,r,et);
    await cerrar(s);
  }
});
