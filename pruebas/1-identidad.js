/* Hito 1: identidad visual, tamaños en rem y módulo de ajustes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Hito 1 · Identidad, tamaños en rem y ajustes',async function({browser,base,r}){
  /* El Inicio y la Ayuda en celular y escritorio, claro y oscuro, contraste normal y alto, texto al 100% y 150% */
  for(const pag of ['inicio','ayuda'])for(const ancho of [390,1280])for(const tema of ['light','dark'])
  for(const contraste of ['normal','high'])for(const escala of [1,1.5]){
    const p=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala}});
    await p.goto(base+pag+'.html');await listo(p);
    await p.evaluate(function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});
    await revisar(p,r,pag+' '+ancho+'px '+tema+'/'+contraste+' ×'+escala);
    await cerrar(p);
  }

  /* Los cinco tamaños de texto, sin desborde */
  for(const pag of ['inicio','ayuda'])for(const ancho of [390,1280])for(const escala of [0.9,1,1.15,1.3,1.5]){
    const p=await pagina(browser,{ancho:ancho,ajustes:{escala:escala}});
    await p.goto(base+pag+'.html');await listo(p,100);
    r.cumple(await p.evaluate(function(){return document.documentElement.scrollWidth<=document.documentElement.clientWidth}),pag+' '+ancho+'px al '+Math.round(escala*100)+'%: sin desborde');
    await cerrar(p);
  }

  /* Migración de las claves de la versión anterior; las notas de antes (de las lecciones) se conservan en tus datos */
  const p=await pagina(browser,{local:{'aprende-tecnologia:tema':'dark','aprende-tecnologia:barra':'cerrada','aprende-tecnologia:apuntes:ram':'mis apuntes viejos'}});
  await p.goto(base+'inicio.html');await listo(p);
  await p.waitForTimeout(300);
  const m=await p.evaluate(function(){return AT.datos.notas.todas().then(function(l){return {
    tema:document.documentElement.dataset.theme,colapsada:document.documentElement.classList.contains('side-collapsed'),
    nueva:JSON.parse(localStorage.getItem('aprende-tecnologia:ajustes')||'{}'),vieja:localStorage.getItem('aprende-tecnologia:tema'),
    apuntes:(l.filter(function(n){return n.id==='ram'})[0]||{}).texto}})});
  r.igual(m.tema,'dark','migración: el tema oscuro guardado se aplica');
  r.cumple(m.colapsada,'migración: la barra lateral sigue cerrada');
  r.igual(m.nueva.tema,'dark','migración: se guarda en la clave nueva');
  r.igual(m.vieja,null,'migración: la clave vieja se borra');
  r.igual(m.apuntes,'mis apuntes viejos','migración: los apuntes de antes se conservan en tus datos');
  await p.click('#menuBtn');
  await p.click('#aaBtn');await p.click('#lectura .seg[data-k="tema"] button[data-v="auto"]');
  await p.reload();await listo(p);
  const d=await p.evaluate(function(){return {tema:document.documentElement.dataset.theme||'auto',colapsada:document.documentElement.classList.contains('side-collapsed')}});
  r.igual(d.tema,'auto','al recargar se conserva el tema elegido');
  r.igual(d.colapsada,false,'al recargar se conserva la barra abierta');
  await cerrar(p);
});
