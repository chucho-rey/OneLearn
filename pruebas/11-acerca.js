/* «Cómo está hecho OneLearn» (acerca.html): la página para estudiantes de programación. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Cómo está hecho OneLearn',async function({browser,base,r}){
  /* Se ve bien en celular y escritorio, en todos los temas y con texto grande */
  for(const ancho of [390,1280])for(const tema of ['light','dark'])for(const contraste of ['normal','high']){
    const escala=ancho===390&&contraste==='high'?1.5:1;
    const p=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala}});
    await p.goto(base+'acerca.html');await listo(p);
    await revisar(p,r,'acerca '+ancho+'px '+tema+'/'+contraste+' ×'+escala);
    await cerrar(p);
  }

  const p=await pagina(browser,{reducir:true});
  await p.goto(base+'acerca.html');await listo(p);
  const info=await p.evaluate(function(){
    const pg=document.querySelector('.page');
    const av=pg.querySelector('.callout.aviso');
    return {h1:pg.querySelector('h1').textContent,secciones:pg.querySelectorAll('.toc li').length,codigo:pg.querySelectorAll('pre.codigo').length,
      tablas:pg.querySelectorAll('.tbl-wrap').length,repaso:pg.querySelectorAll('.repaso-q .q, #qz > *').length,
      avisoFijo:av?getComputedStyle(av).position:'',miga:document.querySelector('.crumbs').textContent,
      enlace:!!document.querySelector('#side a.nv.on[aria-current="page"][href="acerca.html"]'),
      externos:[...pg.querySelectorAll('a[href^="http"]')].map(function(a){return a.getAttribute('href')})};
  });
  r.igual(info.h1,'Cómo está hecho OneLearn','la página se dibuja desde su JSON');
  r.cumple(info.secciones>=12,'tiene índice con todas las secciones',info.secciones);
  r.igual(info.codigo,9,'muestra los ejemplos de código');
  r.cumple(info.tablas>=3,'muestra las tablas',info.tablas);
  r.cumple(info.repaso>0,'tiene preguntas de repaso',info.repaso);
  r.igual(info.avisoFijo,'static','un callout de aviso se queda en el texto (no se confunde con la notificación flotante)');
  r.igual(info.miga,'OneLearn/Cómo está hecho','la barra superior dice dónde estás');
  r.cumple(info.enlace,'la barra lateral marca «Cómo está hecho» como página actual');
  r.cumple(info.externos.length>0&&info.externos.every(function(h){return h.startsWith('https://')}),'los enlaces externos usan https',info.externos);

  /* El código de los ejemplos se muestra tal cual: nada se interpreta como HTML */
  r.cumple(await p.evaluate(function(){return [...document.querySelectorAll('pre.codigo')].some(function(x){return x.textContent.indexOf('<script type="application/json"')>=0})&&!document.querySelector('.page img')}),
    'el HTML de los ejemplos se ve como texto');

  /* Modo zen y J/K también aquí */
  await p.keyboard.press('z');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return document.documentElement.classList.contains('zen')}),'Z entra al modo zen');
  await p.keyboard.press('j');await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(){return document.activeElement.id}),'s-resumen','J va a la primera sección');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  await cerrar(p);

  /* Se llega desde Inicio y la búsqueda la encuentra */
  const q=await pagina(browser,{});
  await q.goto(base+'index.html');await listo(q);
  r.cumple(await q.locator('.page a[href="acerca.html"]').isVisible(),'Inicio tiene un acceso a «Cómo está hecho»');
  await q.keyboard.press('Control+k');await q.waitForTimeout(200);
  await q.keyboard.type('service worker');await q.waitForTimeout(800);
  const res=await q.locator('[role=option]').allTextContents();
  r.cumple(res.some(function(t){return t.indexOf('Sin conexión y como app')>=0}),'Ctrl K encuentra las secciones de la página',res.slice(0,3));
  await cerrar(q);
});
