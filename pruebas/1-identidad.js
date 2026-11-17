/* Hito 1: identidad visual, tamaños en rem y módulo de ajustes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Hito 1 · Identidad, tamaños en rem y ajustes',async function({browser,base,r}){
  /* Cada lección en celular y escritorio, claro y oscuro, contraste normal y alto, texto al 100% y 150% */
  for(const lec of ['ram','cpu'])for(const ancho of [390,1280])for(const tema of ['light','dark'])
  for(const contraste of ['normal','high'])for(const escala of [1,1.5]){
    const p=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala}});
    await p.goto(base+'lecciones/'+lec+'.html');await listo(p);
    await p.evaluate(function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});
    const et=lec+' '+ancho+'px '+tema+'/'+contraste+' ×'+escala;
    await revisar(p,r,et);
    r.cumple(await p.evaluate(function(){
      const s=document.getElementById('sheet').getBoundingClientRect(),t=document.querySelector('.sh-title').getBoundingClientRect();
      return t.top>=s.top&&t.bottom<=s.bottom+0.5;
    }),et+': la barra de apuntes no se corta');
    await cerrar(p);
  }

  /* Los cinco tamaños de texto, sin desborde */
  for(const lec of ['ram','cpu'])for(const ancho of [390,1280])for(const escala of [0.9,1,1.15,1.3,1.5]){
    const p=await pagina(browser,{ancho:ancho,ajustes:{escala:escala}});
    await p.goto(base+'lecciones/'+lec+'.html');await listo(p,100);
    r.cumple(await p.evaluate(function(){return document.documentElement.scrollWidth<=document.documentElement.clientWidth}),lec+' '+ancho+'px al '+Math.round(escala*100)+'%: sin desborde');
    await cerrar(p);
  }

  /* Migración de las claves de la versión anterior; los apuntes se conservan */
  const p=await pagina(browser,{local:{'aprende-tecnologia:tema':'dark','aprende-tecnologia:barra':'cerrada','aprende-tecnologia:apuntes:ram':'mis apuntes viejos'}});
  await p.goto(base+'lecciones/ram.html');await listo(p);
  const m=await p.evaluate(function(){return {
    tema:document.documentElement.dataset.theme,colapsada:document.documentElement.classList.contains('side-collapsed'),
    nueva:JSON.parse(localStorage.getItem('aprende-tecnologia:ajustes')||'{}'),vieja:localStorage.getItem('aprende-tecnologia:tema'),
    apuntes:document.getElementById('notes').value}});
  r.igual(m.tema,'dark','migración: el tema oscuro guardado se aplica');
  r.cumple(m.colapsada,'migración: la barra lateral sigue cerrada');
  r.igual(m.nueva.tema,'dark','migración: se guarda en la clave nueva');
  r.igual(m.vieja,null,'migración: la clave vieja se borra');
  r.igual(m.apuntes,'mis apuntes viejos','migración: los apuntes se conservan');
  await p.click('#menuBtn');
  await p.click('#aaBtn');await p.click('#lectura .seg[data-k="tema"] button[data-v="auto"]');
  await p.reload();await listo(p);
  const d=await p.evaluate(function(){return {tema:document.documentElement.dataset.theme||'auto',colapsada:document.documentElement.classList.contains('side-collapsed')}});
  r.igual(d.tema,'auto','al recargar se conserva el tema elegido');
  r.igual(d.colapsada,false,'al recargar se conserva la barra abierta');
  await cerrar(p);
});
