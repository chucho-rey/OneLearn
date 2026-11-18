/* Rutas de aprendizaje: la página de rutas (módulos, avance y «qué sigue»), la tarjeta de Inicio,
   el aviso de ruta al final de las lecciones, la barra lateral y la búsqueda. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const {prueba,pagina,cerrar,listo,revisar,RAIZ}=require('./lib');

function txt(p,sel){return p.textContent(sel).then(function(t){return t.trim()})}
function catalogo(){
  const ctx={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ,'assets/js/catalogo.js'),'utf8'),ctx);
  return ctx.window.AT;
}
/* Avance de una lección terminada: todas sus secciones leídas */
function leida(){return {total:1,leidas:{'s-x':'2026-11-18T10:00:00.000Z'}}}

prueba('Rutas',async function({browser,base,r}){
  const AT=catalogo(),C=AT.caminos[0];
  /* El catálogo y la ruta coinciden: cada lección y proyecto de la ruta existe */
  const ids={},proy={};
  AT.catalogo.forEach(function(g){g.lecciones.forEach(function(l){ids[l.id]=l})});
  AT.proyectos.forEach(function(x){proy[x.id]=x});
  const faltan=[];
  C.modulos.forEach(function(m){(m.lecciones||[]).forEach(function(id){if(!ids[id])faltan.push(id)});(m.proyectos||[]).forEach(function(id){if(!proy[id])faltan.push(id)})});
  r.cumple(!faltan.length,'todas las lecciones y proyectos de la ruta están en el catálogo',faltan);
  const todas=[].concat.apply([],C.modulos.map(function(m){return m.lecciones||[]}));
  r.cumple(todas.length===27&&todas.every(function(id){return ids[id].archivo}),'las 27 lecciones de la ruta están publicadas',todas.filter(function(id){return !ids[id].archivo}));

  /* Se ve bien en todas las variantes de lectura, también con avance */
  for(const [ancho,tema,contraste,escala,fuente] of [[390,'dark','high',1.5,'opendyslexic'],[1280,'light','normal',1,'normal'],[390,'light','high',1,'atkinson']]){
    const p=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala,fuente:fuente},
      local:{'aprende-tecnologia:avance':JSON.stringify({lecciones:{'sistema-operativo':leida(),terminal:{total:4,leidas:{a:'x'}}}})}});
    await p.goto(base+'rutas.html');await listo(p,400);
    await revisar(p,r,'rutas '+ancho+'px '+tema+'/'+contraste+' ×'+escala+' '+fuente);
    await cerrar(p);
  }

  /* Sin avance */
  const p=await pagina(browser,{ancho:1280,reducir:true});
  await p.goto(base+'rutas.html');await listo(p);
  r.igual(await p.locator('.rt-m').count(),C.modulos.length,'se ven los '+C.modulos.length+' módulos');
  r.igual(await p.locator('.rt-m').first().locator('.rt-l li').count(),5,'el módulo 1 tiene 5 lecciones');
  r.igual(await p.locator('.rt-m .exp-i.soon').count(),0,'ninguna lección de la ruta sale como «Pronto»');
  r.cumple(await p.locator('.rt-m').last().locator('a.exp-i small').count()===2,'el último módulo tiene los dos proyectos');
  r.igual(await txt(p,'.rt-sig .btn'),'Empezar: Sistema operativo','sin avance, la ruta empieza por Sistema operativo');
  r.cumple(await p.getAttribute('.rt-m.actual','aria-current')==='step'&&/Linux y la terminal/.test(await txt(p,'.rt-m.actual h3')),'el módulo 1 se marca como «Vas aquí»');
  r.cumple(await p.isVisible('#side a.nv.on#sideRutas'),'«Rutas» aparece en la barra lateral, marcado');
  r.igual(await txt(p,'.crumbs .cur'),'Rutas','la barra superior dice Rutas');
  await p.click('.rt-sig .btn');await p.waitForURL(/sistema-operativo\.html/);await listo(p);
  r.cumple(/Módulo 1: Linux y la terminal/.test(await txt(p,'.ruta-nota'))&&/Siguiente en la ruta: La terminal/.test(await txt(p,'.ruta-nota')),
    'al final de Sistema operativo se dice el módulo y que en la ruta sigue «La terminal» (aunque en el temario siga Memoria virtual)');
  r.cumple(/memoria-virtual\.html$/.test(await p.getAttribute('a.next','href')),'el enlace normal sigue llevando a la siguiente del temario');
  await p.click('.ruta-nota a[href$="terminal.html"]');await p.waitForURL(/terminal\.html/);await listo(p);
  r.cumple(/Módulo 1/.test(await txt(p,'.ruta-nota'))&&!/Siguiente en la ruta/.test(await txt(p,'.ruta-nota')),'en La terminal la siguiente de la ruta y del temario es la misma: no se repite');
  await p.goto(base+'lecciones/ram.html');await listo(p);
  r.igual(await p.locator('.ruta-nota').count(),0,'una lección fuera de la ruta no tiene aviso');
  r.cumple(p.errores.length===0,'sin errores al navegar',p.errores);
  await cerrar(p);

  /* Con avance: Sistema operativo terminada, La terminal empezada */
  const q=await pagina(browser,{ancho:390,reducir:true,local:{'aprende-tecnologia:avance':JSON.stringify({lecciones:{'sistema-operativo':leida(),terminal:{total:4,leidas:{a:'x'}}}})}});
  await q.goto(base+'rutas.html');await listo(q);
  r.igual(await txt(q,'.rt-sig .btn'),'Continuar: La terminal: primeros comandos','con Sistema operativo terminada, sigue La terminal (empezada)');
  r.cumple(/llevas 25 %/.test(await txt(q,'.rt-sig-m')),'y dice cuánto llevas');
  r.cumple(/1 de \d+ terminados/.test(await txt(q,'.rt-av-t')),'el avance cuenta 1 terminada');
  r.cumple(/Terminada/.test(await txt(q,'.rt-m.actual .exp-i.hecho')),'Sistema operativo se marca como terminada');
  /* Inicio */
  await q.goto(base+'index.html');await listo(q);
  r.cumple(/Sigue con: La terminal/.test(await txt(q,'#iniRutas .btn.pri')),'Inicio sugiere seguir la ruta con La terminal');
  await q.click('#iniRutas a[href^="rutas.html"]');await q.waitForURL(/rutas\.html#redes-sistemas/);await listo(q);
  r.cumple(q.errores.length===0,'sin errores con avance',q.errores);
  await cerrar(q);

  /* Ruta terminada */
  const todo={};
  C.modulos.forEach(function(m){(m.lecciones||[]).forEach(function(id){if(ids[id].archivo)todo[id]=leida()})});
  const tareas={};
  C.modulos.forEach(function(m){(m.proyectos||[]).forEach(function(id){const t={};for(let i=0;i<proy[id].tareas;i++)t['t'+i]='2026-11-18';tareas[id]={tareas:t}})});
  const z=await pagina(browser,{ancho:1280,local:{'aprende-tecnologia:avance':JSON.stringify({lecciones:todo}),'aprende-tecnologia:proyectos':JSON.stringify(tareas)}});
  await z.goto(base+'rutas.html');await listo(z);
  r.cumple(!await z.locator('.rt-sig .btn').count()&&/Terminaste la ruta completa/.test(await txt(z,'.rt-sig-m')),'con todo terminado, se felicita por la ruta completa');
  r.igual(await z.locator('.rt-m.hecho').count(),C.modulos.length,'los '+C.modulos.length+' módulos se marcan como completos');
  await cerrar(z);

  /* La búsqueda encuentra la ruta */
  const b=await pagina(browser,{ancho:1280});
  await b.goto(base+'index.html');await listo(b);
  await b.keyboard.press('Control+k');await b.waitForTimeout(200);
  await b.keyboard.type('redes y sistemas');await b.waitForTimeout(700);
  r.cumple(/Ruta: Redes y sistemas/.test(await b.textContent('dialog[open]')),'Ctrl K encuentra la ruta');
  await cerrar(b);
});
