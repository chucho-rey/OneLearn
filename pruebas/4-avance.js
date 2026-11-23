/* Hito 4: avance de lectura, mapa del tema e inicio.
   Usa el reloj simulado de Playwright para no esperar los segundos mínimos de lectura reales. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function visible(p,sel){return p.evaluate(function(s){const e=document.querySelector(s);return !!e&&!e.hidden&&e.getClientRects().length>0},sel)}
function texto(p,sel){return p.evaluate(function(s){return document.querySelector(s).textContent.replace(/\s+/g,' ').trim()},sel)}
/* Lee una sección: se queda en ella el tiempo suficiente y llega a su final */
async function leer(p,id){
  await p.evaluate(function(i){document.getElementById(i).scrollIntoView({block:'start'})},id);
  await p.clock.runFor(16000);
  await p.evaluate(function(i){const hs=[].slice.call(document.querySelectorAll('.page h2')),h=document.getElementById(i);hs[hs.indexOf(h)+1].scrollIntoView({block:'end'})},id);
  await p.clock.runFor(1200);
}

prueba('Hito 4 · Avance, mapa del tema e inicio',async function({browser,base,r}){
  const p=await pagina(browser,{reducir:true});
  await p.clock.install();

  /* Primera visita */
  await p.goto(base+'inicio.html');await p.clock.runFor(300);
  r.cumple(await visible(p,'#bienvenida')&&!await visible(p,'#continuar'),'la primera visita muestra la bienvenida');
  r.cumple(/Aún no tienes apuntes/.test(await texto(p,'#recientes')),'sin notas, el inicio explica dónde se escriben');
  r.igual(await p.getAttribute('#side .nv[data-id="ram"]','href'),'lecciones/ram.html','desde el inicio, los enlaces apuntan a lecciones/');
  r.igual(await texto(p,'.crumbs'),'Inicio','la ruta dice «Inicio»');
  r.cumple(/Inicio/.test(await texto(p,'#side .nv.on[aria-current="page"]')),'«Inicio» aparece como página actual en la barra');

  /* Bajar de golpe no marca nada */
  await p.goto(base+'lecciones/ram.html');await p.clock.runFor(500);
  await p.evaluate(function(){scrollTo(0,document.body.scrollHeight)});await p.clock.runFor(1500);
  r.igual(await texto(p,'#mapaPct'),'0%','bajar de golpe hasta el final no marca secciones');
  r.cumple(await visible(p,'.mapa'),'el mapa del tema se ve en escritorio');
  const ids=await p.$$eval('.page h2[id]',function(e){return e.map(function(x){return x.id})});
  r.igual(await p.$$eval('.mapa li',function(e){return e.length}),ids.length,'el mapa tiene una entrada por sección');

  /* Leer cuatro secciones y quedarse en la cuarta */
  for(const id of ids.slice(0,4))await leer(p,id);
  await p.evaluate(function(){document.getElementById('s-celda').scrollIntoView({block:'start'})});await p.clock.runFor(1500);
  r.igual(await texto(p,'#mapaPct'),'44%','leer 4 de 9 secciones da 44%');
  r.igual(JSON.stringify(await p.$$eval('.mapa li.leida',function(e){return e.map(function(x){return x.dataset.id})})),JSON.stringify(ids.slice(0,4)),'el mapa marca las secciones leídas');
  r.igual(await p.getAttribute('.mapa li.aqui','data-id'),'s-celda','el mapa marca la sección actual');
  r.igual(await texto(p,'#side .nv[data-id="ram"] em.pct'),'44%','la barra lateral muestra el porcentaje');

  await p.click('.mapa li[data-id="s-tipos"] a');await p.clock.runFor(1500);
  const salto=await p.evaluate(function(){return {foco:document.activeElement.id,top:Math.round(document.getElementById('s-tipos').getBoundingClientRect().top)}});
  r.cumple(salto.foco==='s-tipos'&&salto.top>0&&salto.top<120,'tocar una sección del mapa lleva a ella y le pasa el foco',salto);
  await p.evaluate(function(){document.getElementById('s-celda').scrollIntoView({block:'start'})});await p.clock.runFor(1500);

  /* Volver al inicio y continuar: el criterio del hito */
  await p.goto(base+'inicio.html');await p.clock.runFor(300);
  r.cumple(/Memoria RAM/.test(await texto(p,'#continuar'))&&/Cómo guarda un bit la RAM/.test(await texto(p,'#continuar'))&&/44% leído/.test(await texto(p,'#continuar')),'«Continúa» muestra la lección, la sección y el avance',await texto(p,'#continuar'));
  r.igual(await p.getAttribute('#continuar a','href'),'lecciones/ram.html#s-celda','«Continúa» enlaza a la sección exacta');
  await Promise.all([p.waitForURL(/ram\.html/),p.click('#continuar a')]);await p.waitForLoadState('load');await p.clock.runFor(2000);
  const top=await p.evaluate(function(){return Math.round(document.getElementById('s-celda').getBoundingClientRect().top)});
  r.cumple(top>0&&top<120,'al continuar, la sección queda justo bajo la barra superior',top);

  /* Repaso */
  for(let i=0;i<4;i++)await p.click('.q[data-q="'+i+'"] .qo[data-j="0"]');
  await p.clock.runFor(300);
  const rep=await p.evaluate(function(){return JSON.parse(localStorage.getItem('aprende-tecnologia:avance')).lecciones.ram.repaso});
  r.cumple(rep&&rep.ok===2&&rep.total===4,'el resultado del repaso se guarda',rep);
  r.cumple(await p.evaluate(function(){return document.querySelector('.mapa li[data-id="s-repaso"]').classList.contains('leida')}),'terminar el repaso marca su sección como leída');

  /* Terminar la lección y ver la sugerencia */
  for(const id of ids)await leer(p,id);
  r.igual(await texto(p,'#mapaPct'),'100%','leer todas las secciones da 100%');
  await p.click('#shMain');await p.fill('#notes','nota de ram');await p.clock.runFor(1500);
  await p.goto(base+'lecciones/cpu.html');await p.clock.runFor(500);
  await p.click('#shMain');await p.type('#notes','nota de cpu');await p.clock.runFor(1500);
  await p.goto(base+'inicio.html');await p.clock.runFor(300);
  r.igual(JSON.stringify(await p.$$eval('#recientes .nota b',function(e){return e.map(function(x){return x.textContent})})),JSON.stringify(['Procesador (CPU)','Memoria RAM']),'las notas recientes van de la más nueva a la más vieja');
  r.igual(await texto(p,'.exp-i[href="lecciones/ram.html"] em'),'100%','explorar muestra el avance de cada lección');
  await p.evaluate(function(){const d=JSON.parse(localStorage.getItem('aprende-tecnologia:avance'));d.ultima='ram';localStorage.setItem('aprende-tecnologia:avance',JSON.stringify(d))});
  await p.reload();await p.clock.runFor(300);
  r.cumple(/Terminaste Memoria RAM/.test(await texto(p,'#continuar'))&&await p.getAttribute('#continuar a','href')==='lecciones/cpu.html','al terminar una lección, el inicio sugiere la siguiente');
  r.cumple(p.errores.length===0,'sin errores en el recorrido',p.errores);
  await cerrar(p);

  /* Inicio y lecciones en varios tamaños y modos */
  const AVANCE=JSON.stringify({ultima:'ram',lecciones:{ram:{total:9,leidas:{'s-que':'x','s-escritorio':'x'},seccion:'s-jerarquia',seccionTitulo:'La jerarquía de memoria',repaso:{ok:3,total:4}}}});
  for(const pag of ['inicio.html','lecciones/ram.html','lecciones/cpu.html'])for(const ancho of [390,1280,1600])
  for(const [escala,fuente] of [[1,'normal'],[1.5,'opendyslexic']])for(const [tema,contraste] of [['light','normal'],['dark','high']]){
    const s=await pagina(browser,{ancho:ancho,ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste},
      local:{'aprende-tecnologia:avance':AVANCE,'aprende-tecnologia:apuntes:ram':'Una nota con texto suficiente para ver la tarjeta'}});
    await s.goto(base+pag);await listo(s);
    await s.evaluate(function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});
    const et=pag+' '+ancho+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste;
    await revisar(s,r,et);
    if(pag!=='inicio.html'){
      const m=await s.evaluate(function(){const e=document.querySelector('.mapa');return {ve:getComputedStyle(e).display!=='none',ov:e.scrollWidth-e.clientWidth}});
      r.cumple(m.ov<=0,et+': el mapa no se desborda',m);
      if(ancho>=1280&&escala===1)r.cumple(m.ve,et+': el mapa se ve cuando hay espacio',m);
      if(ancho<900)r.cumple(!m.ve,et+': en celular no hay mapa',m);
    }
    await cerrar(s);
  }
});
