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

  /* Todos los proyectos del catálogo: coinciden con su archivo, cada fase se dibuja completa y sus enlaces existen */
  const g=await pagina(browser,{ancho:1280,reducir:true});
  await g.goto(base+'proyectos/index.html');await listo(g);
  const cat=await g.evaluate(function(){return AT.proyectos.map(function(x){return {id:x.id,archivo:x.archivo,tareas:x.tareas,fases:x.fases}})});
  r.igual(await g.locator('#pjLista .pj-card').count(),cat.length,'la lista muestra los '+cat.length+' proyectos');
  for(const c of cat){
    await g.goto(base+'proyectos/'+c.archivo);await listo(g);
    const e=await g.evaluate(function(){return {id:AT.proyecto.id,fases:AT.proyecto.fases.map(function(f){return f.id}),tareas:AT.proyecto.fases.reduce(function(s,f){return s+f.tareas.length},0),
      hrefs:(function(){const set=new Set();JSON.stringify(AT.proyecto).replace(/"href":"([^"]+)"/g,function(_,h){set.add(h)});return Array.from(set)})()}});
    r.cumple(e.id===c.id&&e.tareas===c.tareas&&e.fases.length===c.fases,c.id+': el catálogo coincide con el proyecto',{e:e.tareas,c:c.tareas});
    for(const f of e.fases){
      await g.goto(base+'proyectos/'+c.archivo+'#'+f);await g.waitForTimeout(150);
      const v=await g.evaluate(function(){return {cuerpo:document.querySelectorAll('.pj-cuerpo [data-b]').length,tareas:document.querySelectorAll('.pj-tl input').length,
        labs:document.querySelectorAll('.pj-cuerpo .demo').length,vivos:Array.from(document.querySelectorAll('.pj-cuerpo .demo-b')).filter(function(b){return b.children.length>1}).length}});
      r.cumple(v.cuerpo>3&&v.tareas>=3&&v.labs===v.vivos,c.id+' '+f+': contenido, tareas y diagramas funcionando',v);
    }
    for(const h of e.hrefs){
      const res=await g.request.get(new URL(h,base+'proyectos/'+c.archivo).href.split('#')[0]);
      r.cumple(res.ok(),c.id+': el enlace '+h+' existe');
    }
    r.cumple(g.errores.length===0,c.id+': sin errores',g.errores.slice(0,2));
  }
  await cerrar(g);

  /* La red de una oficina: sus diagramas en todas las variantes y lo que calculan */
  for(const [ancho,tema,contraste,escala,fuente] of [[390,'dark','high',1.5,'opendyslexic'],[1280,'light','normal',1,'normal']])
  for(const f of ['f2','f7']){
    const v=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala,fuente:fuente}});
    await v.goto(base+'proyectos/red-oficina.html#'+f);await listo(v,400);
    await revisar(v,r,'red-oficina '+f+' '+ancho+'px '+tema+'/'+contraste+' ×'+escala+' '+fuente);
    await cerrar(v);
  }
  const n=await pagina(browser,{ancho:390,reducir:true});
  await n.goto(base+'proyectos/red-oficina.html#f2');await listo(n);
  await n.click('#toRuta [data-v="casa"]');
  r.cumple(await n.locator('#toSvg .to-vpn.on').count()===1&&await n.locator('#toSvg .to-e.on').count()===4&&/túnel VPN/.test(await txt(n,'#toMsg')),'desde casa, el camino va por el túnel VPN: internet, router, switch y servidor');
  await n.click('#toRuta [data-v="visita"]');
  r.cumple(await n.getAttribute('#toStat','data-k')==='bad'&&await n.locator('#toSvg .to-x').count()===1,'la visita del Wi-Fi de invitados no llega al servidor');
  await n.click('#toEq [data-v="srv"]');
  r.cumple(/192\.168\.10\.10/.test(await txt(n,'#toMsg')),'tocar un equipo muestra su dirección y su papel');
  const casos=[['192.168.10.30','good'],['192.168.10.10','bad'],['192.168.10.150','warn'],['192.168.11.5','bad'],['192.168.10.255','bad'],['hola','bad']];
  for(const [ip,k] of casos){
    await n.fill('#ipNueva',ip);
    r.igual(await n.getAttribute('#ipStat','data-k'),k,'el plan de IP califica '+ip+' como '+k);
  }
  r.cumple(await n.locator('#ipMapa i.tu').count()===0,'una dirección inválida no se marca en el mapa');
  await n.goto(base+'proyectos/red-oficina.html#f7');await listo(n);
  await n.click('#reOp [data-v="0"]');
  r.cumple(await n.getAttribute('#reStat','data-k')==='bad'&&/No se recomienda/.test(await txt(n,'#reMsg')),'abrir un puerto del router se marca como riesgoso');
  await n.click('#reOp [data-v="1"]');
  r.cumple(/IP pública/.test(await txt(n,'#reTab')),'WireGuard propio explica que necesita una IP pública');
  r.cumple(n.errores.length===0,'red-oficina: sin errores',n.errores.slice(0,2));
  await cerrar(n);

  /* Seguridad para un pequeño negocio: matriz de riesgos y router simulado */
  for(const [ancho,tema,contraste,escala,fuente] of [[390,'dark','high',1.5,'opendyslexic'],[1280,'light','normal',1,'normal']])
  for(const f of ['f2','f5']){
    const v=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala,fuente:fuente}});
    await v.goto(base+'proyectos/seguridad-negocio.html#'+f);await listo(v,400);
    await revisar(v,r,'seguridad-negocio '+f+' '+ancho+'px '+tema+'/'+contraste+' ×'+escala+' '+fuente);
    await cerrar(v);
  }
  const s=await pagina(browser,{ancho:1280,reducir:true});
  await s.goto(base+'proyectos/seguridad-negocio.html#f2');await listo(s);
  r.cumple(await s.locator('#rgLista li.alta').count()===3&&/Phishing/.test(await txt(s,'#rgLista li:first-child')),'la matriz empieza con tres riesgos altos, phishing primero');
  await s.click('#rgAm [data-v="5"]');await s.click('#rgP [data-v="3"]');await s.click('#rgI [data-v="3"]');
  r.cumple(await s.locator('#rgLista li.alta').count()===4&&/= 9, prioridad alta/.test(await txt(s,'#rgMsg')),'subir la probabilidad y el impacto del exempleado lo vuelve prioridad alta');
  r.igual(await s.locator('#rgMx .mx-c.alta b.sel').count(),1,'la amenaza elegida se marca en la matriz');
  await s.goto(base+'proyectos/seguridad-negocio.html#f5');await listo(s);
  r.cumple(await txt(s,'#rtOk')==='0 de 7'&&await s.locator('#rtHall li').count()===7,'el router de fábrica tiene 7 fallas');
  for(const [id,v] of [['panel','nueva'],['cifrado','wpa3'],['clave','larga'],['wps','no'],['invitados','aparte'],['remota','no'],['firmware','nuevo']])await s.click('#rt-'+id+' [data-v="'+v+'"]');
  r.cumple(await txt(s,'#rtOk')==='7 de 7'&&/Sin fallas/.test(await txt(s,'#rtHall')),'corrigiendo todo, el router queda sin fallas');
  await s.click('#rt-cifrado [data-v="wep"]');
  r.cumple(await txt(s,'#rtOk')==='6 de 7'&&/WEP se rompe/.test(await txt(s,'#rtHall')),'volver a WEP aparece como falla con su explicación');
  r.cumple(s.errores.length===0,'seguridad-negocio: sin errores',s.errores.slice(0,2));
  await cerrar(s);
});
