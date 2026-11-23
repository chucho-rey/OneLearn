/* Hito 2.3: «Crear» y el editor. Creas una libreta con secciones, callouts, una tabla y preguntas de repaso,
   y se ve como una lección oficial. También: autoguardado, deshacer, mover y duplicar bloques, menú «/»,
   asa «+», barra con teclado, Markdown, duplicar, eliminar con «Deshacer», notas, apuntes de clase y zen. */
'use strict';
const fs=require('fs');
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function docGuardado(p){
  return p.evaluate(function(){return AT.datos.documentos.leer(AT.documentoAbierto)});
}
function tipos(d){return d.contenido.content.map(function(b){return b.type})}
async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}

prueba('Hito 2.3 · Crear y el editor',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900});
  await p.goto(base+'inicio.html');await listo(p);
  r.cumple(/Crea una libreta/.test(await p.textContent('#iniDocs')),'el inicio invita a crear el primer documento');

  /* ---------- La ventana «¿Qué quieres crear?» ---------- */
  await p.click('.ini-sec-h [data-crear]');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return document.querySelector('dialog.crear-dlg').open}),'«+ Crear» del inicio abre la pregunta');
  const opciones=await p.$$eval('.crear-o b',function(e){return e.map(function(x){return x.textContent})});
  r.igual(opciones.join(' | '),'Libreta de estudio | Notas | Apuntes de clase | Tesis','se ofrecen libreta, notas, apuntes de clase y tesis');
  r.cumple(/Libro/.test(await p.textContent('.crear-p'))&&!/Tesis/.test(await p.textContent('.crear-p')),'libro, investigación y los demás se anuncian para después; la tesis ya no')
  r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('data-tipo')}),'libreta','el foco empieza en la primera opción');
  await revisar(p,r,'ventana Crear en escritorio');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){return !document.querySelector('dialog.crear-dlg').open&&document.activeElement.hasAttribute('data-crear')}),'Esc cierra y el foco vuelve a «+ Crear»');

  /* ---------- Crear una libreta ---------- */
  await p.click('#sideCrear');await p.waitForTimeout(200);
  await Promise.all([p.waitForURL(/documento\.html\?id=d-/),p.click('[data-tipo="libreta"]')]);await listo(p,500);
  r.cumple(await p.evaluate(function(){var t=document.activeElement;return t.id==='docTitulo'&&t.selectionStart===0&&t.selectionEnd===t.value.length}),'la libreta nueva abre con el título seleccionado para escribirlo');
  await p.keyboard.type('Fotosíntesis');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Luz y clorofila');
  r.igual(await p.evaluate(function(){var s=window.getSelection();return s.anchorNode&&s.anchorNode.parentElement.closest('h2')?'h2':'otro'}),'h2','Enter en el título lleva a la primera sección');
  await p.keyboard.press('Enter');
  await p.keyboard.type('La planta convierte la luz en energía química.');
  /* Negrita con el teclado y la barra lo refleja */
  await p.keyboard.down('Shift');for(let i=0;i<8;i++)await p.keyboard.press('ArrowLeft');await p.keyboard.up('Shift');
  await p.waitForTimeout(250);
  await p.keyboard.press('Control+b');
  r.igual(await p.getAttribute('.tb-btn[data-k="bold"]','aria-pressed'),'true','Ctrl+B pone negrita y la barra lo marca');
  /* (las teclas de movimiento las aplica el navegador; se da un instante, como haría una persona) */
  await p.keyboard.press('End');await p.waitForTimeout(60);
  /* Menú «/» */
  await p.keyboard.press('Enter');await p.keyboard.type('/avi');await p.waitForTimeout(250);
  const menu=await p.$$eval('.menu-barra .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.igual(menu.join(','),'Callout de aviso','«/» abre el menú y filtra mientras escribes');
  r.cumple(await p.evaluate(function(){var d=document.querySelector('.ed-cuerpo');return !!d.getAttribute('aria-activedescendant')}),'el menú «/» indica la opción activa a los lectores de pantalla');
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  await p.keyboard.type('No olvides la clorofila.');
  r.cumple(!/\/avi/.test(await p.textContent('.ed-cuerpo')),'elegir en el menú borra lo que escribiste después de «/»');
  await p.keyboard.press('ArrowDown');await p.waitForTimeout(60);
  await p.keyboard.type('/tabla');await p.waitForTimeout(250);await p.keyboard.press('Enter');await p.waitForTimeout(150);
  await p.keyboard.type('Fase');await p.keyboard.press('Tab');await p.keyboard.type('Dónde ocurre');
  await p.keyboard.press('Tab');await p.keyboard.type('Producto');await p.keyboard.press('Tab');
  await p.keyboard.type('Luminosa');await p.keyboard.press('Tab');await p.keyboard.type('Tilacoides');
  r.cumple(await p.isVisible('.tb-btn[data-k="tabla"]'),'dentro de una tabla, la barra muestra sus opciones');
  /* Preguntas de repaso con su formulario */
  const rep='.ed-repaso';
  await p.fill(rep+' textarea[data-c="q"]','¿Dónde ocurre la fase luminosa?');
  await p.fill(rep+' input[data-c="o"][data-j="0"]','En las mitocondrias');
  await p.fill(rep+' input[data-c="o"][data-j="1"]','En los tilacoides');
  await p.check(rep+' input[data-c="a"][data-j="1"]');
  await p.click(rep+' [data-acc="op"]');
  r.cumple(await p.evaluate(function(){return document.activeElement.getAttribute('data-j')==='2'}),'«+ Opción» agrega una opción y la enfoca');
  await p.keyboard.type('En el núcleo');
  await p.fill(rep+' input[data-c="e"]','Los tilacoides tienen la clorofila.');
  /* Resumen */
  await p.click('.ed-cuerpo .resumen li');await p.keyboard.type('La luz se vuelve energía química.');
  await esperarGuardado(p);
  let d=await docGuardado(p);
  const t=tipos(d);
  r.cumple(d.titulo==='Fotosíntesis'&&['indice','heading','paragraph','callout','table','repaso','resumen'].every(function(x){return t.indexOf(x)>=0}),'se guarda solo: título, secciones, callout, tabla, repaso y resumen',t);
  const cal=d.contenido.content.filter(function(b){return b.type==='callout'})[0];
  r.igual(cal&&cal.attrs.variante,'aviso','el callout guarda su variante');
  const q=d.contenido.content.filter(function(b){return b.type==='repaso'})[0].attrs.preguntas[0];
  r.cumple(q.q==='¿Dónde ocurre la fase luminosa?'&&q.o.length===3&&q.a===1&&q.e,'la pregunta guarda texto, opciones, respuesta y explicación',q);
  const ids=d.contenido.content.map(function(b){return b.attrs&&b.attrs.id});
  r.cumple(ids.every(Boolean)&&new Set(ids).size===ids.length,'cada bloque tiene un identificador propio');
  const negrita=JSON.stringify(d.contenido.content).indexOf('"type":"bold"')>=0;
  r.cumple(negrita,'la negrita se guarda');

  /* Deshacer, mover y duplicar */
  await p.click('.ed-cuerpo h2');await p.waitForTimeout(80);await p.keyboard.press('End');await p.keyboard.type(' (prueba)');
  await p.keyboard.press('Control+z');await p.waitForTimeout(100);
  r.cumple(!/\(prueba\)/.test(await p.textContent('.ed-cuerpo h2')),'Ctrl+Z deshace');
  await p.click('.ed-cuerpo .callout p');await p.waitForTimeout(80);
  const antes=await p.evaluate(function(){return Array.from(document.querySelector('.ed-cuerpo').children).map(function(e){return e.className.split(' ')[0]||e.tagName})});
  await p.keyboard.press('Alt+ArrowUp');await p.waitForTimeout(100);
  const despues=await p.evaluate(function(){return Array.from(document.querySelector('.ed-cuerpo').children).map(function(e){return e.className.split(' ')[0]||e.tagName})});
  r.cumple(antes.indexOf('callout')-1===despues.indexOf('callout'),'Alt+↑ sube el bloque',{antes:antes,despues:despues});
  await p.keyboard.press('Alt+ArrowDown');
  await p.keyboard.press('Control+Shift+d');await p.waitForTimeout(700);
  d=await docGuardado(p);
  const callouts=d.contenido.content.filter(function(b){return b.type==='callout'});
  r.cumple(callouts.length===2&&callouts[0].attrs.id!==callouts[1].attrs.id,'Ctrl+Mayús+D duplica el bloque con un identificador nuevo');
  await p.keyboard.press('Control+z');await p.waitForTimeout(100);

  /* Asa de bloque: «+» abre el menú de bloques */
  const par=await p.$('.ed-cuerpo h2 + p');
  await par.hover();await p.waitForTimeout(150);
  r.cumple(await p.isVisible('.asa'),'al pasar el ratón por un bloque aparece su asa');
  await p.click('.asa [data-a="mas"]');await p.waitForTimeout(250);
  r.cumple(await p.isVisible('.menu-barra'),'«+» del asa abre el menú para insertar debajo');
  await p.keyboard.press('Escape');await p.keyboard.press('Backspace');
  await par.hover();await p.click('.asa [data-a="menu"]');await p.waitForTimeout(200);
  r.cumple(/Mover arriba/.test(await p.textContent('.menu'))&&await p.evaluate(function(){return document.activeElement.classList.contains('menu-i')}),'«⋮⋮» abre las opciones del bloque con el foco en el menú');
  await p.keyboard.press('Escape');
  /* Arrastrar un bloque con el asa */
  const orden0=await p.evaluate(function(){return Array.from(document.querySelectorAll('.ed-cuerpo > *')).map(function(e){return e.getAttribute('data-id')})});
  await par.hover();await p.waitForTimeout(100);
  const caja=await p.locator('.asa [data-a="menu"]').boundingBox(),meta=await p.locator('.ed-cuerpo h2').first().boundingBox();
  await p.mouse.move(caja.x+caja.width/2,caja.y+caja.height/2);await p.mouse.down();
  await p.mouse.move(caja.x+caja.width/2+5,caja.y+caja.height/2+5,{steps:3});
  await p.mouse.move(meta.x+20,meta.y+4,{steps:8});await p.mouse.up();await p.waitForTimeout(300);
  const orden1=await p.evaluate(function(){return Array.from(document.querySelectorAll('.ed-cuerpo > *')).map(function(e){return e.getAttribute('data-id')})});
  r.cumple(orden0.join()!==orden1.join()&&orden0.length===orden1.length,'arrastrar el asa mueve el bloque',{antes:orden0,despues:orden1});
  await p.keyboard.press('Control+z');

  /* Barra con teclado */
  await p.focus('#docTitulo');await p.keyboard.press('Tab');
  let foco=await p.evaluate(function(){return document.activeElement.closest('.tb')?document.activeElement.getAttribute('data-k'):document.activeElement.className});
  /* Las propiedades están antes de la barra: se avanza hasta llegar */
  for(let i=0;i<6&&foco&&foco.indexOf&&!/^(deshacer|rehacer|bloque|bold)$/.test(foco);i++){await p.keyboard.press('Tab');foco=await p.evaluate(function(){return document.activeElement.closest('.tb')?document.activeElement.getAttribute('data-k'):document.activeElement.className})}
  r.cumple(/^(deshacer|rehacer|bloque|bold)$/.test(foco),'con Tab se llega a la barra de herramientas',foco);
  const f1=foco;await p.keyboard.press('ArrowRight');
  foco=await p.evaluate(function(){return document.activeElement.getAttribute('data-k')});
  r.cumple(foco&&foco!==f1,'las flechas recorren la barra',foco);
  await p.keyboard.press('Tab');
  r.cumple(await p.evaluate(function(){return !!document.activeElement.closest('.ed-cuerpo')}),'un solo Tab sale de la barra al texto');

  /* Mis apuntes muestra el documento */
  await p.click('#tab-apuntes');await p.waitForTimeout(300);
  r.cumple(/Fotosíntesis/.test(await p.textContent('#docsLista .nv.on')),'Mis apuntes lista el documento y marca el abierto');

  /* ---------- Se ve como una lección ---------- */
  await esperarGuardado(p);
  await p.click('#docModo');await p.waitForTimeout(400);
  const lec=await p.evaluate(function(){
    const pg=document.querySelector('#docPage');
    return {h1:pg.querySelector('h1').textContent,toc:pg.querySelectorAll('.toc li').length,aviso:!!pg.querySelector('.callout.aviso'),
      tabla:pg.querySelectorAll('.tbl-wrap table thead th').length,preguntas:pg.querySelectorAll('#qz .q').length,resumen:!!pg.querySelector('.resumen .callout li'),
      editor:!!pg.querySelector('.ProseMirror'),materia:!!pg.querySelector('.props')};
  });
  r.cumple(lec.h1==='Fotosíntesis'&&lec.toc===2&&lec.aviso&&lec.tabla===3&&lec.preguntas===1&&lec.resumen&&!lec.editor,'«Leer» lo dibuja como una lección: índice, callout, tabla, repaso y resumen',lec);
  r.cumple(!lec.materia,'las propiedades vacías no se muestran al leer');
  await p.click('#qz .qo:nth-child(3)');
  r.cumple(/Correcto/.test(await p.textContent('#qz .expl')),'el repaso se puede responder');
  await revisar(p,r,'libreta en modo lectura');
  await p.reload();await listo(p,400);
  r.cumple(await p.evaluate(function(){return !document.querySelector('.ProseMirror')&&!!document.querySelector('#docPage h1')}),'al volver, se abre en el último modo usado');
  await p.keyboard.press('e');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return !!document.querySelector('.ProseMirror')&&!!document.activeElement.closest('.ed-cuerpo')}),'E pasa a editar con el cursor en el texto');

  /* Modo zen en el documento */
  await p.keyboard.press('Escape');await p.waitForTimeout(100);
  r.cumple(await p.evaluate(function(){return !document.activeElement.closest('.ed-cuerpo')}),'Esc en el editor suelta el foco');
  await p.keyboard.press('z');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return document.documentElement.classList.contains('zen')}),'Z entra al modo zen en un documento');
  r.cumple(await p.isVisible('.doc-barra')&&!await p.isVisible('#side'),'en el modo zen quedan el texto y la barra de herramientas');
  r.cumple(!await p.$('.zen-bar [data-z="nota"]'),'sin «nota rápida» en la barra zen de un documento');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){return !document.documentElement.classList.contains('zen')}),'Esc sale del modo zen');
  await revisar(p,r,'libreta en modo edición');

  /* ---------- Markdown, duplicar y eliminar ---------- */
  await p.click('#docMas');await p.waitForTimeout(150);
  const [md]=await Promise.all([p.waitForEvent('download'),p.click('.menu-i:has-text("Markdown")')]);
  const ruta=await md.path();const texto=fs.readFileSync(ruta,'utf8');
  r.cumple(md.suggestedFilename()==='fotosintesis.md'&&/^# Fotosíntesis/.test(texto)&&/## Luz y clorofila/.test(texto)&&/\*\*Aviso:\*\*/.test(texto)&&/\| Fase \| Dónde ocurre \| Producto \|/.test(texto)&&/\(correcta\)/.test(texto),
    'se descarga como Markdown con secciones, callout, tabla y repaso',texto.slice(0,300));
  await p.click('#docMas');await p.waitForTimeout(150);
  /* La copia se abre en otro documento.html: se espera una URL distinta de la actual */
  const original=p.url();
  await Promise.all([p.waitForURL(function(u){return u.href.indexOf(base)===0&&/documento/.test(u.href)&&u.href!==original}),p.click('.menu-i:has-text("Duplicar")')]);await listo(p,400);
  r.cumple(/^Copia de Fotosíntesis/.test(await p.evaluate(function(){return document.title})),'«Duplicar» crea una copia y la abre');
  await p.click('#docMas');await p.click('.menu-i:has-text("Eliminar")');await p.waitForTimeout(150);
  r.cumple(await p.evaluate(function(){return document.activeElement.getAttribute('data-el')==='no'}),'eliminar pide confirmación con el foco en «Cancelar»');
  await Promise.all([p.waitForURL(/inicio\.html/),p.click('[data-el="si"]')]);await listo(p,300);
  r.cumple(/Se eliminó «Copia de Fotosíntesis»/.test(await p.textContent('#avisoApp')),'al eliminar, el inicio avisa y ofrece deshacer');
  r.cumple((await p.$$('#iniDocs .nota')).length===1,'el inicio lista los documentos que quedan');
  await Promise.all([p.waitForURL(/documento\.html/),p.click('#avisoApp .btn')]);await listo(p,300);
  r.cumple(/^Copia de Fotosíntesis/.test(await p.evaluate(function(){return document.title})),'«Deshacer» recupera el documento eliminado');
  r.cumple(p.errores.length===0,'sin errores en escritorio',p.errores);
  await cerrar(p);

  /* ---------- Notas y apuntes de clase, en celular ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,movil:true});
  await c.goto(base+'inicio.html');await listo(c);
  await c.tap('[data-crear]');await c.waitForTimeout(300);
  await revisar(c,r,'ventana Crear en celular');
  await Promise.all([c.waitForURL(/documento/),c.tap('[data-tipo="clase"]')]);await listo(c,500);
  const clase=await c.evaluate(function(){return {props:Array.from(document.querySelectorAll('.dp-n')).map(function(x){return x.value}),tareas:!!document.querySelector('.ed-cuerpo ul.tareas'),h2:Array.from(document.querySelectorAll('.ed-cuerpo h2')).map(function(h){return h.textContent})}});
  r.cumple(clase.props.join()==='Materia,Profesor,Fecha'&&clase.tareas&&clase.h2.indexOf('Tareas')>=0,'los apuntes de clase traen materia, profesor, fecha y tareas',clase);
  await c.fill('.dp-fila:nth-child(1) .dp-v','Biología');
  await c.tap('.ed-cuerpo ul.tareas li p');await c.keyboard.type('Leer el capítulo 3');
  await c.tap('.ed-cuerpo ul.tareas li input');
  await esperarGuardado(c);
  await revisar(c,r,'apuntes de clase en celular');
  await c.tap('#docModo');await c.waitForTimeout(300);
  r.cumple(/Biología/.test(await c.textContent('.props'))&&await c.$('li.tarea.hecha'),'al leer, la materia y la tarea hecha se muestran');
  await revisar(c,r,'apuntes de clase al leer en celular');
  await c.goto(base+'inicio.html');await listo(c);
  await c.tap('[data-crear]');await c.waitForTimeout(200);
  await Promise.all([c.waitForURL(/documento/),c.tap('[data-tipo="notas"]')]);await listo(c,500);
  r.cumple(await c.evaluate(function(){return document.querySelectorAll('.ed-cuerpo > *').length===1&&!document.querySelector('.dp-fila')}),'las notas empiezan como una página en blanco');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);

  /* ---------- Un documento que no existe, y enlaces peligrosos ---------- */
  const s=await pagina(browser);
  await s.goto(base+'documento.html?id=d-noexiste');await listo(s,300);
  r.cumple(/No encontramos este documento/.test(await s.textContent('#docPage')),'un documento que no existe lo explica y ofrece crear otro');
  await s.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-peligro',titulo:'Peligro',contenido:{type:'doc',content:[
    {type:'paragraph',attrs:{id:'b-1'},content:[{type:'text',text:'clic',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]},
    {type:'tipo-raro',attrs:{id:'b-2'}},{type:'paragraph',attrs:{id:'b-3'},content:[{type:'text',text:'sigue'}]}]}})});
  await s.goto(base+'documento.html?id=d-peligro');await listo(s,400);
  r.cumple(!await s.$('.ed-cuerpo a[href^="javascript"]'),'el editor no acepta enlaces javascript:');
  r.cumple(/sigue/.test(await s.textContent('#docPage')),'un bloque desconocido no impide abrir el documento');
  await cerrar(s);

  /* ---------- El editor en varios tamaños y modos ---------- */
  for(const [ancho,escala,fuente,tema,contraste] of [[390,1.5,'opendyslexic','dark','high'],[1280,1.3,'atkinson','light','high'],[1600,1,'normal','dark','normal']]){
    const v=await pagina(browser,{ancho:ancho,ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste}});
    await v.goto(base+'inicio.html');await listo(v);
    /* nuevo() navega al documento: se espera la página, no la promesa (que se pierde al navegar) */
    await Promise.all([v.waitForURL(/documento/),v.evaluate(function(){AT.crear.nuevo('libreta');return 1}).catch(function(){return 1})]);await listo(v,500);
    await v.click('.ed-cuerpo h2');await v.keyboard.type('Sección de prueba con un título bastante largo para ver si cabe');
    await v.keyboard.press('Enter');await v.keyboard.type('/');await v.waitForTimeout(200);
    await revisar(v,r,'editor '+ancho+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste);
    await v.keyboard.press('Escape');
    await cerrar(v);
  }
});
