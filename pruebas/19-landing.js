/* Página de bienvenida (index.html, la raíz del sitio): la ve quien llega por primera vez; quien ya usa OneLearn va
   directo a su Inicio (inicio.html), salvo con ?conoce. Las cifras salen del temario, los botones llevan a la app y
   «Crear un documento» abre la ventana de Crear. Contraste y desbordes en celular, escritorio y las variantes de lectura. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Página de bienvenida',async function({browser,base,r}){
  /* ---------- Primera visita: la bienvenida ---------- */
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base);await listo(p);
  const v=await p.evaluate(function(){
    var AT=window.AT,n=0,ruta=0;
    AT.catalogo.forEach(function(g){g.lecciones.forEach(function(l){if(l.archivo)n++})});
    AT.caminos[0].modulos.forEach(function(m){(m.lecciones||[]).forEach(function(){ruta++})});
    return {url:location.pathname+location.search,h1:document.querySelectorAll('h1').length,titulo:document.querySelector('h1').textContent,
      cifras:[document.getElementById('lpLecciones').textContent,document.getElementById('lpRuta').textContent,document.getElementById('lpProyectos').textContent].join('/'),
      esperado:[n,ruta,AT.proyectos.length].join('/'),app:!!document.querySelector('.side,.topbar'),desc:document.querySelector('meta[name="description"]').content};
  });
  r.cumple(/\/$/.test(v.url)&&v.h1===1&&/Aprende cómo funciona la tecnología/.test(v.titulo),'quien llega por primera vez a la raíz ve la bienvenida',v);
  r.igual(v.cifras,v.esperado,'las cifras salen del temario (lecciones, ruta y proyectos)');
  r.cumple(!v.app&&v.desc.length>80,'es una página propia, sin la barra de la app, con descripción para buscadores');
  r.igual(p.externos.length,0,'no pide nada a otros servidores');
  r.cumple(await p.evaluate(function(){return !Object.keys(localStorage).some(function(k){return k.indexOf('aprende-tecnologia:')===0})}),'verla no guarda nada en el navegador');
  await revisar(p,r,'bienvenida en escritorio');
  /* Saltar al contenido con el teclado */
  await p.keyboard.press('Tab');
  r.cumple(await p.evaluate(function(){var a=document.activeElement;return a.classList.contains('lp-saltar')&&a.getBoundingClientRect().top>=0}),'la primera tecla Tab muestra «Ir al contenido»');
  const hrefs=await p.$$eval('a.btn',function(e){return e.map(function(a){return a.textContent+'→'+a.getAttribute('href')})});
  r.cumple(hrefs.indexOf('Entrar→inicio.html')>=0&&hrefs.indexOf('Empezar ahora→inicio.html')>=0&&hrefs.indexOf('Crear un documento→inicio.html#crear')>=0,'los botones llevan a la app',hrefs);

  /* ---------- Entrar y volver: quien ya usa OneLearn va a su Inicio ---------- */
  await Promise.all([p.waitForURL(/inicio\.html$/),p.click('.lp-cab .btn.pri')]);await listo(p);
  r.cumple(/Buen|Hola/.test(await p.textContent('#saludo')),'«Entrar» abre el Inicio de la app');
  const marcas=await p.evaluate(function(){return {
    brand:document.querySelector('.side .brand').getAttribute('href'),
    inicio:document.querySelector('.side a.nv[aria-current="page"]').getAttribute('href')}});
  r.cumple(marcas.brand==='inicio.html'&&marcas.inicio==='inicio.html','dentro de la app, el logo e «Inicio» llevan a inicio.html',marcas);
  await p.goto(base);await p.waitForURL(/inicio\.html$/);await listo(p);
  r.cumple(/inicio\.html$/.test(p.url())&&!!await p.$('#saludo'),'después, la raíz lleva directo al Inicio');
  await p.goto(base+'index.html?conoce');await listo(p);
  r.cumple(/index\.html\?conoce$/.test(p.url())&&!!await p.$('#lpTitulo'),'con ?conoce se puede volver a ver la bienvenida');
  await cerrar(p);

  /* ---------- «Crear un documento» abre la ventana de Crear ---------- */
  const c=await pagina(browser,{ancho:1280,reducir:true});
  await c.goto(base);await listo(c);
  await Promise.all([c.waitForURL(/inicio\.html/),c.click('a[href="inicio.html#crear"]')]);await listo(c,300);
  r.cumple(await c.isVisible('dialog.crear,dialog[open]')&&!/#crear/.test(c.url()),'«Crear un documento» abre la ventana de Crear en el Inicio');
  await cerrar(c);

  /* ---------- Celular y variantes de lectura ---------- */
  const m=await pagina(browser,{ancho:390,alto:844,reducir:true});
  await m.goto(base);await listo(m);
  await revisar(m,r,'bienvenida en celular');
  r.cumple(await m.evaluate(function(){var n=document.querySelector('.lp-nav'),b=n.querySelector('.btn');return getComputedStyle(n.querySelector('a:not(.btn)')).display==='none'&&b.getBoundingClientRect().height>=34}),'en celular la cabecera deja solo «Entrar», con buen tamaño para el dedo');
  await cerrar(m);
  for(const [nombre,aj,ancho] of [['oscuro',{tema:'dark'},1280],['alto contraste ×1.5 y OpenDyslexic',{contraste:'high',escala:1.5,fuente:'opendyslexic'},390],['oscuro y alto contraste',{tema:'dark',contraste:'high'},900]]){
    const q=await pagina(browser,{ancho:ancho,ajustes:aj,reducir:true});
    /* Con ajustes guardados el navegador ya «usa» OneLearn: se pide la bienvenida con ?conoce */
    await q.goto(base+'index.html?conoce');await listo(q);
    await revisar(q,r,'bienvenida en '+nombre);
    await cerrar(q);
  }
});
