/* Proyectos guiados: la lista, el proyecto «Tu portafolio web» con sus fases, las tareas que se guardan,
   el entregable final (solo https), el respaldo, Inicio y la búsqueda. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function txt(p,sel){return p.textContent(sel).then(function(t){return t.trim()})}

prueba('Proyectos',async function({browser,base,r}){
  /* Se ven bien en todas las variantes de lectura */
  for(const [ancho,tema,contraste,escala,fuente] of [[390,'dark','high',1.5,'opendyslexic'],[1280,'light','normal',1,'normal']]){
    for(const ruta of ['proyectos/index.html','proyectos/portafolio.html','proyectos/portafolio.html#f3','proyectos/portafolio.html#f8']){
      const p=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala,fuente:fuente}});
      await p.goto(base+ruta);await listo(p,400);
      await revisar(p,r,ruta+' '+ancho+'px '+tema+'/'+contraste+' ×'+escala+' '+fuente);
      await cerrar(p);
    }
  }

  const p=await pagina(browser,{ancho:1280,reducir:true});
  /* La lista */
  await p.goto(base+'proyectos/index.html');await listo(p);
  r.cumple(await p.locator('#pjLista .pj-card').count()>=1&&/Sin empezar/.test(await txt(p,'#pjLista')),'la lista muestra el portafolio, sin empezar');
  r.cumple(await p.isVisible('#side a.nv.on#sideProyectos'),'«Proyectos» aparece en la barra lateral, marcado');
  await p.click('#pjLista .pj-card');await p.waitForURL(/portafolio\.html/);await listo(p);

  /* El proyecto */
  const d=await p.evaluate(function(){
    const cat=AT.proyectos.filter(function(x){return x.id==='portafolio'})[0];
    return {total:AT.proyecto.fases.reduce(function(s,f){return s+f.tareas.length},0),cat:cat.tareas,fases:AT.proyecto.fases.length,catFases:cat.fases,
      nav:document.querySelectorAll('.pj-f').length,h1:document.querySelector('h1').textContent,miga:document.querySelector('.crumbs').textContent};
  });
  r.cumple(d.total===d.cat&&d.fases===d.catFases&&d.nav===d.fases,'el catálogo coincide con el proyecto: fases y tareas',d);
  r.cumple(d.h1==='Tu portafolio web'&&d.miga==='Proyectos/Tu portafolio web','título y ruta en la barra superior',d);
  r.igual(await txt(p,'#pjFaseT'),'Prepara tu computadora','sin avance, empieza en la fase 1');

  /* Cada fase tiene contenido, tareas, entregable y se llega a ella por su enlace */
  const fases=await p.evaluate(function(){return AT.proyecto.fases.map(function(f){return f.id})});
  for(const f of fases){
    await p.click('.pj-f[href="#'+f+'"]');await p.waitForTimeout(150);
    const e=await p.evaluate(function(){return {cuerpo:document.querySelectorAll('.pj-cuerpo [data-b]').length,tareas:document.querySelectorAll('.pj-tl input').length,
      ent:!!document.querySelector('.pj-ent'),foco:document.activeElement.id,actual:document.querySelector('.pj-f[aria-current="step"]').getAttribute('href')}});
    r.cumple(e.cuerpo>3&&e.tareas>=4&&e.ent&&e.foco==='pjFaseT'&&e.actual==='#'+f,f+': contenido, tareas y entregable; el foco va al título',e);
  }
  r.cumple(p.errores.length===0,'recorrer las fases no da errores',p.errores);

  /* Los enlaces del contenido llevan a páginas que existen */
  const enlaces=await p.evaluate(function(){
    const set=new Set();
    AT.proyecto.fases.concat([{contenido:AT.proyecto.intro}]).forEach(function(f){
      JSON.stringify(f.contenido).replace(/"href":"([^"]+)"/g,function(_,h){set.add(h)});
    });
    return Array.from(set);
  });
  for(const h of enlaces){
    const u=new URL(h,base+'proyectos/portafolio.html').href.split('#')[0];
    const res=await p.request.get(u);
    r.cumple(res.ok(),'el enlace '+h+' lleva a una página que existe');
  }

  /* Marcar tareas: se guarda, avanza la barra y la fase completa se marca */
  await p.click('.pj-f[href="#f1"]');await p.waitForTimeout(100);
  const n1=await p.locator('.pj-tl input').count();
  for(let k=0;k<n1;k++)await p.locator('.pj-tl input').nth(k).check();
  r.cumple(/Fase completa/.test(await txt(p,'#pjEst'))&&await txt(p,'.pj-f[href="#f1"] .pj-n')==='✓','al marcar todas las tareas, la fase 1 queda completa');
  r.igual(await txt(p,'#pjCuenta'),n1+' de '+d.total+' tareas','el avance cuenta las tareas hechas');
  await p.click('.pj-f[href="#f2"]');await p.waitForTimeout(100);
  await p.locator('.pj-tl input').first().check();
  await p.goto(base+'proyectos/portafolio.html');await listo(p);
  r.cumple(await txt(p,'#pjFaseT')==='Planea tu portafolio'&&await p.locator('.pj-tl input:checked').count()===1,'al volver sin #, abre la fase donde te quedaste, con sus tareas guardadas');
  await p.locator('.pj-tl input').first().uncheck();
  r.igual(await txt(p,'#pjCuenta'),n1+' de '+d.total+' tareas','desmarcar una tarea la quita del avance');

  /* El entregable: solo direcciones https */
  await p.goto(base+'proyectos/portafolio.html#f8');await listo(p);
  await p.fill('#pjUrl','javascript:alert(1)');await p.click('#pjGuardar');
  r.cumple(await p.getAttribute('#pjUrl','aria-invalid')==='true'&&await p.locator('#pjUrlMsg a').count()===0,'una dirección que no es https se rechaza');
  await p.fill('#pjUrl','https://ana-lopez.github.io/portafolio/');await p.click('#pjGuardar');
  r.cumple(await p.getAttribute('#pjUrlMsg a','href')==='https://ana-lopez.github.io/portafolio/'&&await p.getAttribute('#pjUrlMsg a','rel')==='noopener noreferrer','una dirección https se guarda y se ofrece abrirla');
  await p.reload();await listo(p);
  r.igual(await p.inputValue('#pjUrl'),'https://ana-lopez.github.io/portafolio/','la dirección sigue ahí al recargar');

  /* Respaldo: el avance del proyecto sale y entra */
  const resp=await p.evaluate(function(){return AT.datos.exportar()});
  r.cumple(resp.proyectos&&resp.proyectos.portafolio&&Object.keys(resp.proyectos.portafolio.tareas).length===n1&&resp.proyectos.portafolio.enlace,'el respaldo incluye el avance y el enlace del proyecto');
  const q=await pagina(browser,{ancho:1280});
  await q.goto(base+'index.html');await listo(q);
  r.cumple(/Empezar el proyecto/.test(await txt(q,'#iniProyectos')),'en Inicio, sin avance, invita a empezar el proyecto');
  const imp=await q.evaluate(function(d){return AT.datos.importar(d)},resp);
  r.cumple(imp.proyectos===true,'importar el respaldo trae el avance del proyecto',imp);
  await q.reload();await listo(q);
  r.cumple(/Continuar/.test(await txt(q,'#iniProyectos')),'después, Inicio ofrece continuar');
  const malo=await q.evaluate(function(){return AT.datos.importar({app:'OneLearn',formato:1,proyectos:{'../x':{tareas:{a:1}},portafolio:{enlace:'javascript:alert(1)',tareas:{'f9-1':'x','<b>':'y'}}}}).then(function(){return AT.proyectosAvance.leer('portafolio')})});
  r.cumple(malo.enlace==='https://ana-lopez.github.io/portafolio/'&&!malo.tareas['<b>'],'un respaldo con datos raros no mete enlaces peligrosos ni claves inválidas',malo);

  /* La búsqueda encuentra el proyecto */
  await q.keyboard.press('Control+k');await q.waitForTimeout(200);
  await q.keyboard.type('portafolio');await q.waitForTimeout(800);
  r.cumple((await q.locator('[role=option]').allTextContents()).some(function(t){return /Tu portafolio web/.test(t)&&/Proyecto/.test(t)}),'Ctrl K encuentra el proyecto');
  r.cumple(q.errores.length===0&&p.errores.length===0,'sin errores',q.errores.concat(p.errores));
  await cerrar(q);await cerrar(p);
});
