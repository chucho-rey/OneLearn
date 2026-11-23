/* Hito 2.4: marcadores y búsqueda. Citas un bloque de la RAM en una libreta, y al tocar la cita llegas a
   ese punto de la lección. También: marcar con ratón, teclado (M) y en celular, la lista en Mis apuntes,
   quitar marcadores, y la búsqueda con Ctrl K en lecciones, documentos, notas y marcadores. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Hito 2.4 · Marcadores y búsqueda',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,local:{'aprende-tecnologia:apuntes:cpu':'La ley de Amdahl limita cuánto ayudan los núcleos'}});
  await p.goto(base+'lecciones/ram.html');await listo(p);

  /* ---------- Guardar marcadores en una lección ---------- */
  await p.hover('#s-celda + p');await p.waitForTimeout(150);
  r.cumple(await p.isVisible('.marc-btn'),'al pasar el ratón por un bloque aparece el botón de marcador');
  r.igual(await p.getAttribute('.marc-btn','aria-label'),'Guardar este bloque como marcador','el botón dice qué hace');
  await p.click('.marc-btn');await p.waitForTimeout(300);
  const id=await p.evaluate(function(){return document.querySelector('#s-celda + p').id});
  r.cumple(await p.evaluate(function(i){return document.getElementById(i).classList.contains('marcado')},id),'el bloque queda marcado en la lección');
  r.igual(await p.getAttribute('.marc-btn','aria-pressed'),'true','el botón queda presionado');
  r.cumple(/Cítalo en tus documentos/.test(await p.textContent('#avisoApp')),'un aviso explica cómo citarlo');
  let ms=await p.evaluate(function(){return AT.datos.marcadores.todos()});
  r.cumple(ms.length===1&&ms[0].doc==='ram'&&ms[0].bloque===id&&ms[0].url==='lecciones/ram.html'&&/DRAM/.test(ms[0].texto)&&ms[0].seccion==='Cómo guarda un bit la RAM',
    'el marcador guarda lección, bloque, texto y sección',ms[0]);
  /* Con el teclado: M marca la sección enfocada */
  await p.keyboard.press('Escape');
  await p.focus('#s-ddr');await p.evaluate(function(){document.getElementById('s-ddr').scrollIntoView()});
  await p.evaluate(function(){var h=document.getElementById('s-ddr');h.setAttribute('tabindex','-1');h.focus()});
  await p.keyboard.press('m');await p.waitForTimeout(300);
  ms=await p.evaluate(function(){return AT.datos.marcadores.todos()});
  r.cumple(ms.some(function(m){return m.bloque==='s-ddr'&&m.tipo==='seccion'&&m.texto==='Generaciones DDR y rendimiento'}),'M guarda la sección como marcador');
  await p.keyboard.press('m');await p.waitForTimeout(300);
  ms=await p.evaluate(function(){return AT.datos.marcadores.todos()});
  r.cumple(!ms.some(function(m){return m.bloque==='s-ddr'}),'otra M lo quita');
  await p.keyboard.press('m');await p.waitForTimeout(300);

  /* Mis apuntes los lista */
  await p.click('#tab-apuntes');await p.waitForTimeout(300);
  const lista=await p.$$eval('#marcLista .marc b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(lista.length===2&&lista[0]==='Generaciones DDR y rendimiento','Mis apuntes lista los marcadores, el más nuevo primero',lista);
  await p.evaluate(function(){window.scrollTo(0,0)});
  await p.click('#marcLista .marc >> nth=1');await p.waitForTimeout(800);
  const top=await p.evaluate(function(i){return Math.round(document.getElementById(i).getBoundingClientRect().top)},id);
  r.cumple(top>=0&&top<200&&/#b-/.test(p.url()),'tocar un marcador de la misma lección lleva al bloque',top);
  await p.click('#marcLista .marc-x >> nth=0');await p.waitForTimeout(300);
  r.igual((await p.$$('#marcLista .marc')).length,1,'la ✕ quita un marcador');
  r.cumple(await p.evaluate(function(){return !!document.activeElement.closest('#marcLista')||document.activeElement.id==='tab-apuntes'}),'después de quitarlo, el foco sigue en la lista');
  r.cumple(p.errores.length===0,'sin errores en la lección',p.errores);

  /* ---------- Búsqueda ---------- */
  await p.keyboard.press('Control+k');await p.waitForTimeout(500);
  r.cumple(await p.evaluate(function(){return document.querySelector('dialog.buscar-dlg').open&&document.activeElement.id==='busQ'}),'Ctrl K abre la búsqueda con el cursor en el campo');
  await p.keyboard.type('amdahl');await p.waitForTimeout(300);
  let grupos=await p.$$eval('.bus-gt',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(grupos.indexOf('Lecciones')>=0&&grupos.indexOf('Notas rápidas')>=0,'encuentra en las lecciones (aunque no estén abiertas) y en las notas',grupos);
  await p.fill('#busQ','memoria cache');await p.waitForTimeout(300);
  r.cumple((await p.$$('.bus-o')).length>0,'busca sin acentos y con varias palabras');
  await p.fill('#busQ','refresco');await p.waitForTimeout(300);
  const primeros=await p.$$eval('.bus-o small',function(e){return e.slice(0,3).map(function(x){return x.textContent})});
  r.cumple(/Memoria RAM/.test(primeros.join()),'los resultados dicen dónde están',primeros);
  r.cumple(await p.evaluate(function(){var q=document.getElementById('busQ');return q.getAttribute('aria-activedescendant')==='bus-o-0'&&q.getAttribute('aria-expanded')==='true'}),'el resultado activo se anuncia a los lectores de pantalla');
  await p.keyboard.press('ArrowDown');
  r.igual(await p.evaluate(function(){return document.getElementById('busQ').getAttribute('aria-activedescendant')}),'bus-o-1','las flechas eligen el resultado');
  await p.fill('#busQ','xyzzy');await p.waitForTimeout(200);
  r.cumple(/Nada coincide/.test(await p.textContent('#busPie')),'si nada coincide, lo dice');
  await revisar(p,r,'búsqueda en escritorio');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(!await p.evaluate(function(){return document.querySelector('dialog.buscar-dlg').open}),'Esc cierra la búsqueda');
  /* Ir a una sección de otra lección */
  await p.keyboard.press('Control+k');await p.fill('#busQ','núcleos e hilos');await p.waitForTimeout(400);
  await Promise.all([p.waitForURL(/cpu\.html#s-nucleos/),p.keyboard.press('Enter')]);await listo(p,500);
  const t2=await p.evaluate(function(){return Math.round(document.getElementById('s-nucleos').getBoundingClientRect().top)});
  r.cumple(t2>=0&&t2<150,'Enter abre la otra lección en esa sección',t2);
  r.cumple(/Buscar/.test(await p.textContent('#sideBuscar')),'«Buscar» está también en la barra lateral');

  /* ---------- Citar el marcador en una libreta ---------- */
  await Promise.all([p.waitForURL(/documento/),p.evaluate(function(){AT.crear.nuevo('libreta');return 1}).catch(function(){return 1})]);await listo(p,500);
  await p.keyboard.type('Repaso de memoria');await p.keyboard.press('Enter');await p.waitForTimeout(60);
  await p.keyboard.type('DRAM');await p.keyboard.press('Enter');await p.waitForTimeout(60);
  await p.keyboard.type('Según la lección ');await p.keyboard.type('@capacitor');await p.waitForTimeout(700);
  const ops=await p.$$eval('.menu-cita .menu-i small',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(ops.length>0&&ops[0]==='Marcador · Memoria RAM','«@» busca qué citar, pone primero el marcador y dice de dónde viene cada opción',ops);
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  await p.keyboard.type('es la base.');
  const cita=await p.evaluate(function(){var a=document.querySelector('.ed-cuerpo a.cita');return a&&{href:a.getAttribute('href'),t:a.textContent}});
  r.cumple(cita&&cita.href==='lecciones/ram.html#'+id&&/DRAM/.test(cita.t),'Enter inserta la cita al bloque de la RAM',cita);
  r.cumple(!/@capacitor/.test(await p.textContent('.ed-cuerpo')),'lo escrito después de «@» se reemplaza por la cita');
  /* Tocar la cita en el editor ofrece abrirla */
  await p.click('.ed-cuerpo a.cita');await p.waitForTimeout(200);
  r.cumple(/Ir a/.test(await p.textContent('.menu'))&&/Quitar la cita/.test(await p.textContent('.menu')),'en el editor, tocar la cita ofrece abrirla o quitarla');
  await p.keyboard.press('Escape');
  await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'});
  const d=await p.evaluate(function(){return AT.datos.documentos.leer(AT.documentoAbierto)});
  r.cumple(JSON.stringify(d.contenido).indexOf('"type":"cita"')>0,'la cita se guarda en el documento');
  /* «Listo cuando»: en modo lectura, tocar la cita lleva a ese punto de la lección */
  await p.click('#docModo');await p.waitForTimeout(300);
  await Promise.all([p.waitForURL(new RegExp('ram\\.html#'+id)),p.click('#docPage a.cita')]);await listo(p,500);
  const llegada=await p.evaluate(function(i){var b=document.getElementById(i);return {top:Math.round(b.getBoundingClientRect().top),target:b.matches(':target')}},id);
  r.cumple(llegada.target&&llegada.top>=0&&llegada.top<200,'al tocar la cita llegas a ese bloque de la lección, resaltado',llegada);
  r.cumple(p.errores.length===0,'sin errores',p.errores);

  /* La búsqueda también encuentra el documento */
  await p.keyboard.press('Control+k');await p.fill('#busQ','repaso de memoria');await p.waitForTimeout(500);
  r.cumple(/Tus documentos/.test(await p.textContent('#busRes'))&&/Repaso de memoria/.test(await p.textContent('#busRes')),'la búsqueda encuentra tus documentos');
  await p.keyboard.press('Escape');
  await cerrar(p);

  /* ---------- En celular ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,movil:true});
  await c.goto(base+'lecciones/cpu.html');await listo(c);
  await c.tap('#s-reloj + p');await c.waitForTimeout(200);
  r.cumple(await c.isVisible('.marc-btn'),'en celular, tocar un bloque muestra el botón de marcador');
  const caja=await c.locator('.marc-btn').boundingBox();
  r.cumple(caja.x>=0&&caja.x+caja.width<=390,'el botón cabe en la pantalla',caja);
  await c.tap('.marc-btn');await c.waitForTimeout(300);
  r.igual((await c.evaluate(function(){return AT.datos.marcadores.todos()})).length,1,'y guarda el marcador');
  await revisar(c,r,'lección con marcador en celular');
  await c.tap('#menuBtn');await c.waitForTimeout(300);await c.tap('#sideBuscar');await c.waitForTimeout(400);
  await c.keyboard.type('reloj');await c.waitForTimeout(300);
  await revisar(c,r,'búsqueda en celular');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);

  /* Búsqueda y marcadores en alto contraste y letra grande */
  for(const [ancho,tema] of [[390,'dark'],[1280,'light']]){
    const s=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:'high',escala:1.5,fuente:'opendyslexic',pestana:'apuntes'}});
    await s.goto(base+'lecciones/ram.html');await listo(s);
    await s.evaluate(function(){return AT.datos.marcadores.guardar({id:'m-x',doc:'ram',docTitulo:'Memoria RAM',url:'lecciones/ram.html',bloque:'s-tipos',texto:'Tipos de RAM con un título larguísimo para revisar que no se desborde la barra lateral',seccion:'Tipos de RAM',tipo:'seccion'})});
    await s.reload();await listo(s,400);
    await revisar(s,r,'marcadores ×1.5 '+ancho+'px '+tema+'/alto');
    await s.keyboard.press('Control+k');await s.keyboard.type('ddr');await s.waitForTimeout(400);
    await revisar(s,r,'búsqueda ×1.5 '+ancho+'px '+tema+'/alto');
    await cerrar(s);
  }
});
