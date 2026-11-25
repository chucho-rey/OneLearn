/* La barra lateral: Inicio, Crear, Buscar, «Tus páginas» (favoritas primero, la página abierta marcada; sin «Mi negocio»,
   «Tu equipo» ni las páginas de estudio; la papelera al final si hay algo) y el pie (Lectura, Tus datos, Ayuda y
   modo zen en una página). En celular el menú retiene el foco. Variantes de lectura sin desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function doc(id,titulo,extra){
  return Object.assign({formato:1,tipo:'notas',id:id,titulo:titulo,props:[],creado:'2026-11-01T10:00:00.000Z',editado:'2026-11-01T10:00:00.000Z',
    contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-'+id.slice(2,8)},content:[{type:'text',text:'Hola'}]}]}},extra||{});
}
const DOCS=[doc('d-uno','Ventas de noviembre',{editado:'2026-11-20T10:00:00.000Z'}),doc('d-dos','Proveedores',{editado:'2026-11-22T10:00:00.000Z'}),
  doc('d-fav','Lista de precios',{favorito:true}),doc('d-tesis','Mi tesis',{tipo:'tesis'}),doc('d-miequipo','Tu equipo')];
async function sembrar(p){await p.evaluate(function(l){return Promise.all(l.map(function(d){return AT.datos.documentos.guardar(d,{conservarFecha:true})}))},DOCS)}
function nombres(p){return p.$$eval('#docsLista a.doc > span',function(e){return e.map(function(x){return x.textContent})})}

prueba('Hito 3 · Barra lateral',async function({browser,base,r}){
  const p=await pagina(browser);
  await p.goto(base+'inicio.html');await listo(p);
  await sembrar(p);
  await p.reload();await listo(p,500);
  r.igual((await nombres(p)).join(' · '),'Lista de precios · Proveedores · Ventas de noviembre','«Tus páginas»: la favorita primero y después las más recientes; sin «Mi negocio», «Tu equipo» ni la tesis');
  r.cumple(await p.isVisible('#docsLista a.doc .doc-est'),'la favorita lleva su estrella');
  r.cumple(await p.getAttribute('#side a.nv[href="inicio.html"]','aria-current')==='page','el Inicio está marcado como la página actual');
  r.cumple(await p.isVisible('#sideCrear')&&await p.isVisible('#sideBuscar')&&await p.isVisible('#sideAyuda')&&await p.isVisible('#sideDatos'),'Crear, Buscar, Ayuda y Tus datos están en la barra');
  r.igual(await p.$$eval('#side .tabs,#side .tab,#side .grp-btn,#notasLista,#marcLista',function(e){return e.length}),0,'ya no hay pestañas de temas, apuntes ni marcadores');
  r.cumple(!await p.$('#sideRutas')&&!await p.$('#sideProyectos')&&!await p.$('#side a[href="acerca.html"]'),'ni rutas, ni proyectos, ni «Cómo está hecho»');
  /* La papelera aparece al final cuando hay algo en ella */
  await p.evaluate(function(){return AT.datos.documentos.leer('d-uno').then(function(d){return AT.datos.papelera.mover(d)})});
  await p.waitForTimeout(700);
  r.igual((await nombres(p)).join(' · '),'Lista de precios · Proveedores','al mandar una página a la papelera sale de la lista');
  r.cumple(/Papelera\s*1/.test(await p.textContent('#docsLista [data-papelera]')),'y la papelera aparece al final con cuántas tiene');
  await p.click('#sideLectura');
  r.cumple(await p.isVisible('#lectura'),'«Lectura» del pie abre el panel');
  await p.keyboard.press('Escape');
  /* En una página: queda marcada y el pie ofrece el modo zen */
  await p.goto(base+'documento.html?id=d-dos');await listo(p,400);
  r.igual(await p.getAttribute('#docsLista a.doc.on','aria-current'),'page','la página abierta está marcada en la lista');
  r.cumple(await p.isVisible('#sideZen'),'en una página, el pie ofrece el modo zen');
  r.cumple(p.errores.length===0,'sin errores en escritorio',p.errores);
  await cerrar(p);

  /* Sin páginas */
  const v=await pagina(browser);
  await v.goto(base+'inicio.html');await listo(v,400);
  r.cumple(/Todavía no tienes páginas/.test(await v.textContent('#docsLista')),'sin páginas, la barra dice cómo crear la primera');
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
  await Promise.all([c.waitForURL(/documento\.html\?id=d-fav/),c.click('#docsLista a.doc:has-text("Lista de precios")')]);await listo(c,400);
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
