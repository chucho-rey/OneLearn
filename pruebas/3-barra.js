/* Hito 3: barra lateral con Temas, Mis apuntes y Comunidad. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

const NOTAS={'aprende-tecnologia:apuntes:ram':'Refresco: 64 ms en DDR4\nsegunda línea','aprende-tecnologia:apuntes:cpu':'Amdahl limita los núcleos'};
function activo(p){return p.evaluate(function(){const a=document.activeElement;return a.id||a.className})}

prueba('Hito 3 · Barra lateral',async function({browser,base,r}){
  /* Escritorio: pestañas, notas y teclado */
  const p=await pagina(browser,{local:NOTAS});
  await p.goto(base+'lecciones/ram.html');await listo(p);
  r.igual(await p.getAttribute('.tab[aria-selected="true"]','id'),'tab-temas','empieza en la pestaña Temas');
  await p.focus('#tab-temas');await p.keyboard.press('ArrowRight');
  r.igual(await activo(p),'tab-apuntes','la flecha derecha pasa a Mis apuntes');
  r.cumple(await p.isVisible('#pn-apuntes')&&await p.isHidden('#pn-temas'),'solo se ve el panel de la pestaña elegida');
  const tarjetas=await p.$$eval('#notasLista .nota',function(e){return e.map(function(x){return [x.querySelector('b').textContent,x.querySelector('span').textContent,x.querySelector('small').textContent,x.classList.contains('on')]})});
  r.cumple(tarjetas.length===2&&tarjetas[0][0]==='Memoria RAM'&&tarjetas[0][1]==='Refresco: 64 ms en DDR4'&&tarjetas[0][2]==='7 palabras'&&tarjetas[0][3]&&tarjetas[1][0]==='Procesador (CPU)',
    'Mis apuntes muestra una tarjeta por nota, con primera línea, palabras y la lección actual marcada',tarjetas);
  await p.keyboard.press('End');r.igual(await activo(p),'tab-comunidad','Fin va a la última pestaña');
  await p.keyboard.press('Home');r.igual(await activo(p),'tab-temas','Inicio va a la primera pestaña');
  await p.keyboard.press('ArrowLeft');r.igual(await activo(p),'tab-comunidad','la flecha izquierda da la vuelta');
  await p.click('#tab-apuntes');await p.reload();await listo(p);
  r.igual(await p.getAttribute('.tab[aria-selected="true"]','id'),'tab-apuntes','se recuerda la última pestaña');

  await p.click('#shMain');await p.fill('#notes','');await p.type('#notes','Nueva idea sobre la RAM');await p.waitForTimeout(700);
  r.igual(await p.textContent('#notasLista .nota.on span'),'Nueva idea sobre la RAM','la lista se actualiza mientras escribes');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  await p.click('#notasLista .nota.on');await p.waitForTimeout(300);
  r.cumple(/ram\.html$/.test(p.url())&&await p.getAttribute('#sheet','data-state')==='half'&&await activo(p)==='notes','la nota de la lección actual se abre sin recargar');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);

  await p.focus('#tab-apuntes');await p.keyboard.press('Tab');await p.keyboard.press('Tab');
  r.cumple(/Procesador/.test(await p.evaluate(function(){return document.activeElement.textContent})),'con Tab se llega a la nota de otra lección');
  await Promise.all([p.waitForURL(/cpu\.html/),p.keyboard.press('Enter')]);await listo(p,400);
  r.cumple(await p.getAttribute('#sheet','data-state')==='half'&&await p.inputValue('#notes')==='Amdahl limita los núcleos'&&await activo(p)==='notes',
    'Enter abre la otra lección con su nota abierta');
  r.cumple(!/#apuntes/.test(p.url()),'la marca #apuntes se quita de la dirección');
  await p.keyboard.press('Escape');
  await p.click('#sideLectura');
  r.cumple(await p.isVisible('#lectura'),'«Lectura» del pie abre el panel');
  r.cumple(p.errores.length===0,'sin errores en escritorio',p.errores);
  await cerrar(p);

  /* Sin notas */
  const v=await pagina(browser,{ajustes:{pestana:'apuntes'}});
  await v.goto(base+'lecciones/ram.html');await listo(v);
  r.cumple(/Todavía no tienes apuntes/.test(await v.textContent('#notasLista')),'sin notas se explica cómo escribir la primera');
  await cerrar(v);

  /* Celular: el menú retiene el foco */
  const c=await pagina(browser,{ancho:390,alto:844,local:{'aprende-tecnologia:apuntes:ram':'nota de ram'}});
  await c.goto(base+'lecciones/cpu.html');await listo(c);
  await c.focus('#menuBtn');await c.keyboard.press('Enter');await c.waitForTimeout(300);
  r.cumple(/Procesador/.test(await c.evaluate(function(){return document.activeElement.textContent})),'en celular, al abrir el menú el foco va a la lección actual');
  let fuera=0;
  for(let i=0;i<30;i++){await c.keyboard.press('Tab');if(!await c.evaluate(function(){return document.getElementById('side').contains(document.activeElement)}))fuera++}
  r.igual(fuera,0,'en celular, Tab no sale del menú abierto');
  await c.focus('#tab-temas');await c.keyboard.press('ArrowRight');await c.keyboard.press('Tab');
  await Promise.all([c.waitForURL(/ram\.html/),c.keyboard.press('Enter')]);await listo(c,400);
  r.cumple(await c.getAttribute('#sheet','data-state')==='half'&&!await c.evaluate(function(){return document.body.classList.contains('nav-open')}),'en celular, la nota de otra lección se abre y el menú se cierra');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);

  /* Grupos plegables del temario: no se satura aunque haya muchos temas */
  const g=await pagina(browser,{ancho:1280});
  await g.goto(base+'lecciones/cpu.html');await listo(g);
  const grupos=function(){return g.evaluate(function(){return [...document.querySelectorAll('#side .grp-btn')].map(function(b){
    return b.getAttribute('data-grupo')+':'+(b.getAttribute('aria-expanded')==='true'?'abierto':'cerrado')+(document.getElementById(b.getAttribute('aria-controls')).hidden?':oculto':'')})})};
  let gs=await grupos();
  r.igual(gs.join(' '),'hardware:abierto electronica:cerrado:oculto software:cerrado:oculto redes:cerrado:oculto ciberseguridad:cerrado:oculto inteligencia-artificial:cerrado:oculto',
    'la primera vez solo se abre el grupo con lecciones; Ciberseguridad e Inteligencia artificial están en el temario');
  r.igual(await g.textContent('#grpb-hardware em'),'4/5','el grupo dice cuántas lecciones tiene disponibles');
  r.cumple(/4 de 5 lecciones disponibles/.test(await g.textContent('#grpb-hardware')),'y lo dice completo a los lectores de pantalla');
  await g.click('#grpb-ciberseguridad');await g.waitForTimeout(100);
  r.cumple(await g.isVisible('#grp-ciberseguridad .nv.soon'),'al tocar un grupo se abre y muestra sus lecciones');
  await g.focus('#grpb-hardware');await g.keyboard.press('Enter');await g.waitForTimeout(100);
  r.cumple(!await g.isVisible('#grp-hardware'),'con el teclado (Enter) también se pliega');
  await g.reload();await listo(g);
  gs=await grupos();
  r.cumple(gs.indexOf('ciberseguridad:abierto')>=0,'se recuerda qué grupos dejaste abiertos',gs);
  r.cumple(gs.indexOf('hardware:abierto')>=0,'el grupo de la lección actual siempre se abre, aunque lo hayas plegado',gs);
  await g.goto(base+'index.html');await listo(g);
  gs=await grupos();
  r.cumple(gs.indexOf('hardware:cerrado:oculto')>=0&&gs.indexOf('ciberseguridad:abierto')>=0,'en Inicio se respeta lo que plegaste',gs);
  r.igual(await g.evaluate(function(){return [...document.querySelectorAll('.exp-pronto b')].map(function(b){return b.textContent}).join(', ')}),
    'Electrónica, Software, Redes, Ciberseguridad, Inteligencia artificial','Inicio junta los grupos sin lecciones en «Próximos temas»');
  await revisar(g,r,'Inicio con grupos plegados');
  await cerrar(g);

  /* Las tres pestañas con letra grande, OpenDyslexic y alto contraste */
  for(const ancho of [390,1280])for(const [escala,fuente] of [[1,'normal'],[1.5,'normal'],[1,'opendyslexic'],[1.5,'opendyslexic']])
  for(const [tema,contraste] of [['light','normal'],['dark','high']])for(const pestana of ['temas','apuntes','comunidad']){
    const s=await pagina(browser,{ancho:ancho,alto:844,local:{'aprende-tecnologia:apuntes:ram':'Una nota con una palabra larguísimasinespaciosquepodríadesbordar la barra','aprende-tecnologia:apuntes:cpu':'otra'},
      ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste,pestana:pestana}});
    await s.goto(base+'lecciones/ram.html');await listo(s);
    if(ancho<900){await s.click('#menuBtn');await s.waitForTimeout(350)}
    const et=ancho+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste+' pestaña '+pestana;
    r.cumple(await s.evaluate(function(){const b=document.getElementById('side');return b.scrollWidth<=b.clientWidth}),et+': la barra lateral no se desborda');
    if(pestana!=='comunidad')await revisar(s,r,et);
    await cerrar(s);
  }
});
