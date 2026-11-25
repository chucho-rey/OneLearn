/* Historial de versiones: la base pasa de la versión 3 a la 4 sin perder nada; la primera versión al abrir; no se
   guarda una en cada tecla (a lo más cada 5 minutos) pero sí antes de un borrado grande; la ventana (por día, motivo
   y qué cambió), la vista previa con lo que ya no está y lo que cambió (palabras), recuperar un bloque, volver un
   bloque a como estaba, restaurar con «Deshacer», copiar como página nueva, versiones con nombre; los bloques se
   guardan una sola vez (trozos compartidos); la depuración conserva las con nombre y limpia los trozos; una versión
   con un trozo perdido se abre igual; importar un respaldo guarda la de antes; borrar la página borra su historial;
   celular, contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const NEGOCIO={perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Abarrotes Ana',giro:'tienda',telefono:''},creado:'2026-01-01'};
const CAP=process.env.CAPTURAS||'';
function guardado(p){return p.waitForFunction(function(){var e=document.querySelector('.doc-estado');return e&&e.getAttribute('data-k')==='ok'},null,{timeout:8000})}
function versiones(p){return p.evaluate(function(){return AT.datos.versiones.listar(AT.docActual.id)})}
const LARGO='Este párrafo tiene suficiente texto para que borrarlo cuente como un borrado grande en el historial de versiones de la página.';

prueba('Historial de versiones',async function({browser,base,r}){
  /* ---------- La base sube de la versión 3 a la 4 sin perder páginas ---------- */
  const m=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:NEGOCIO});
  await m.goto(base+'ayuda.html');await listo(m,300);
  /* Una base vieja (versión 3) con una página, como la de quien ya usaba OneBook */
  await m.evaluate(function(){
    return new Promise(function(ok,no){
      var q=indexedDB.deleteDatabase('onelearn');
      q.onsuccess=q.onerror=q.onblocked=function(){
        var r=indexedDB.open('onelearn',3);
        r.onupgradeneeded=function(){var db=r.result;['documentos','notas','marcadores','plantillas','papelera','bases','filas'].forEach(function(a){db.createObjectStore(a,{keyPath:'id'})});r.transaction.objectStore('filas').createIndex('base','base')};
        r.onsuccess=function(){var db=r.result,t=db.transaction('documentos','readwrite');
          t.objectStore('documentos').put({formato:1,tipo:'notas',id:'d-vieja',titulo:'Página vieja',props:[],creado:'2026-01-01T00:00:00Z',editado:'2026-01-01T00:00:00Z',
            contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-v1'},content:[{type:'text',text:'Lo de antes'}]}]}});
          t.oncomplete=function(){db.close();ok()};t.onerror=function(){no(t.error)}};
        r.onerror=function(){no(r.error)};
      };
    });
  });
  await m.goto(base+'documento.html?id=d-vieja');await listo(m,800);
  r.cumple(/Lo de antes/.test(await m.textContent('.ProseMirror')),'la página de antes sigue ahí después de subir la base a la versión 4');
  await m.waitForFunction(function(){return AT.datos.versiones.listar('d-vieja').then(function(l){return l.length===1})},null,{timeout:5000}).catch(function(){});
  const v0=await versiones(m);
  r.cumple(v0.length===1&&v0[0].motivo==='auto','al abrirla se guarda su primera versión',v0.length);
  await cerrar(m);

  /* ---------- Escribir: no una versión por tecla, sí antes de un borrado grande ---------- */
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:NEGOCIO});
  await p.goto(base+'inicio.html');await listo(p,400);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(){AT.crear.nuevo('notas')})]);await listo(p,800);
  await p.fill('#docTitulo','Plan de la semana');
  await p.click('.ProseMirror');await p.waitForTimeout(150);
  for(const t of ['Primero: hacer el pedido a Gepp.','Segundo: '+LARGO,'Tercero: '+LARGO,'Cuarto: revisar la caja.']){await p.keyboard.type(t);await p.keyboard.press('Enter')}
  await p.waitForTimeout(800);await guardado(p);await p.waitForTimeout(300);
  let vs=await versiones(p);
  r.cumple(vs.length===1,'mientras escribes no se guarda una versión por tecla (una cada 5 minutos)',vs.length);
  /* Un borrado grande: los cuatro párrafos */
  await p.click('.ProseMirror');await p.keyboard.press('Control+a');await p.waitForTimeout(150);await p.keyboard.press('Delete');
  await p.waitForTimeout(800);await guardado(p);await p.waitForTimeout(400);
  vs=await versiones(p);
  const borrado=vs.filter(function(v){return v.motivo==='borrado'})[0];
  r.cumple(!!borrado&&borrado.ids.length>=4,'antes de un borrado grande se guarda la versión de justo antes',vs.map(function(v){return v.motivo}));
  r.cumple(borrado&&borrado.cambios.nuevos===3&&borrado.cambios.cambiados===1&&borrado.cambios.titulo,'la versión dice qué cambió contra la anterior (3 nuevos, el primero cambió y el título)',borrado&&borrado.cambios);
  /* Un párrafo nuevo después del borrado */
  await p.keyboard.type('Quinto: lo nuevo.');await p.waitForTimeout(800);await guardado(p);

  /* ---------- La ventana ---------- */
  await p.click('#docMas');await p.waitForTimeout(200);
  await p.click('.menu [role="menuitem"]:has-text("Historial de versiones")');
  await p.waitForSelector('dialog.ver-dlg[open] .ver-i',{timeout:8000});
  vs=await versiones(p);
  r.cumple(vs.length===3&&vs[0].motivo==='auto','al abrir el historial, lo de ahora entra como versión',vs.map(function(v){return v.motivo}));
  r.igual(await p.textContent('.ver-dia'),'Hoy','las versiones se agrupan por día');
  const items=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.ver-i'),function(b){return b.textContent})});
  r.cumple(/Igual que ahora/.test(items[0])&&/Antes de un borrado grande/.test(items[1])&&/Primera versión/.test(items[2]),'cada versión dice su hora, por qué se guardó y qué cambió',items);
  r.cumple(await p.getAttribute('.ver-p [data-ver="restaurar"]','aria-disabled')==='true','la versión igual a la de ahora no se puede restaurar');
  /* La de antes del borrado */
  await p.click('.ver-i:has-text("Antes de un borrado grande")');await p.waitForTimeout(400);
  const prev=await p.textContent('.ver-p');
  r.cumple(/Primero: hacer el pedido a Gepp/.test(prev)&&/Cuarto: revisar la caja/.test(prev),'la vista previa muestra la página como estaba');
  /* Los cuatro párrafos (el vacío que dejó el último Enter no cuenta) */
  r.cumple(/4 bloques de esta versión ya no están, 1 bloque se agregó después/.test(prev),'y resume qué cambió desde entonces',prev.slice(0,400));
  r.igual(await p.evaluate(function(){return document.querySelectorAll('.ver-p .ver-quitado').length}),4,'cada bloque que ya no está sale marcado (un párrafo vacío no)');
  r.cumple(await p.evaluate(function(){var b=document.querySelector('.ver-p .ver-quitado [data-b]');return b&&b.hasAttribute('inert')&&!b.id}),'la vista previa es solo para leer y no repite ids de la página');
  await revisar(p,r,'Historial de versiones (escritorio)');
  if(CAP)await p.screenshot({path:CAP+'/versiones.png'});
  /* Recuperar un bloque */
  await p.click('.ver-quitado:has-text("Cuarto") [data-ver="recuperar"]');await p.waitForTimeout(600);await guardado(p);
  const txt=await p.evaluate(function(){return AT.bloques.textoDe(AT.docActual.contenido)});
  r.cumple(/Cuarto: revisar la caja\./.test(txt)&&/Quinto: lo nuevo/.test(txt),'«Recuperar este bloque» lo regresa a la página sin quitar lo nuevo');
  r.igual(await p.evaluate(function(){return document.querySelectorAll('.ver-p .ver-quitado').length}),3,'y ya no sale como quitado');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);

  /* ---------- Un bloque que cambió: palabras y «Volver a como estaba» ---------- */
  await p.evaluate(function(){AT.datos.versiones.config.ventana=0});
  await p.click('.ProseMirror p:has-text("Cuarto")');await p.keyboard.press('End');await p.keyboard.type(' y contar el fondo');
  await p.waitForTimeout(800);await guardado(p);await p.waitForTimeout(300);
  await p.click('#docMas');await p.waitForTimeout(200);await p.click('.menu [role="menuitem"]:has-text("Historial de versiones")');
  await p.waitForSelector('dialog.ver-dlg[open] .ver-i');
  await p.click('.ver-i:has-text("Antes de un borrado grande")');await p.waitForTimeout(400);
  await p.click('.ver-cambio:has-text("Cuarto") summary');await p.waitForTimeout(150);
  const dif=await p.innerHTML('.ver-cambio:has-text("Cuarto") .ver-dif p');
  r.cumple(/<ins>[^<]*contar el fondo<\/ins>/.test(dif),'«Ver qué cambió» marca las palabras agregadas',dif);
  await p.click('.ver-cambio:has-text("Cuarto") [data-ver="devolver"]');await p.waitForTimeout(600);await guardado(p);
  r.cumple(!/contar el fondo/.test(await p.evaluate(function(){return AT.bloques.textoDe(AT.docActual.contenido)})),'«Volver a como estaba» deja el bloque como en esa versión');

  /* ---------- Restaurar, con «Deshacer» ---------- */
  await p.click('.ver-p [data-ver="restaurar"]');await p.waitForTimeout(900);await guardado(p);
  const rest=await p.evaluate(function(){return AT.bloques.textoDe(AT.docActual.contenido)});
  r.cumple(/Primero: hacer el pedido/.test(rest)&&!/Quinto/.test(rest),'«Restaurar esta versión» deja la página como estaba');
  r.cumple(await p.isHidden('dialog.ver-dlg[open]'),'la ventana se cierra');
  vs=await versiones(p);
  r.cumple(vs.some(function(v){return v.motivo==='restaurar'}),'antes de restaurar se guardó la página como estaba');
  await p.click('.aviso button:has-text("Deshacer"), [role="status"] button:has-text("Deshacer")');await p.waitForTimeout(900);await guardado(p);
  r.cumple(/Quinto: lo nuevo/.test(await p.evaluate(function(){return AT.bloques.textoDe(AT.docActual.contenido)})),'«Deshacer» la regresa a como estaba antes de restaurar');

  /* ---------- Versión con nombre y depuración ---------- */
  await p.click('#docMas');await p.waitForTimeout(200);await p.click('.menu [role="menuitem"]:has-text("Historial de versiones")');
  await p.waitForSelector('dialog.ver-dlg[open] #verNombre');
  await p.evaluate(function(){var d=AT.docActual;d.contenido.content.push({type:'paragraph',attrs:{id:'b-extra'},content:[{type:'text',text:'Con nombre'}]})});
  await p.fill('#verNombre','Antes de cambiar precios');await p.click('#verNueva button[type="submit"]');await p.waitForTimeout(600);
  r.cumple(/Antes de cambiar precios/.test(await p.textContent('.ver-i.ver-con-nombre')),'«Guardar versión» con nombre aparece en la lista');
  const dep=await p.evaluate(function(){
    var V=AT.datos.versiones,id=AT.docActual.id,antes;
    return V.cuenta().then(function(c){antes=c;return V.depurar(id,Date.now()+400*864e5)}).then(function(n){
      return Promise.all([V.listar(id),V.cuenta()]).then(function(r){return {borradas:n,quedan:r[0].map(function(v){return v.nombre||v.motivo}),antes:antes,despues:r[1]}});
    });
  });
  r.cumple(dep.quedan.length===1&&dep.quedan[0]==='Antes de cambiar precios','al pasar el tiempo, la versión con nombre se queda y las automáticas se van',dep);
  r.cumple(dep.despues.trozos<dep.antes.trozos,'y los bloques que ya nadie usa se borran',dep);
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  /* ---------- Los bloques se guardan una sola vez ---------- */
  const dedup=await p.evaluate(function(){
    var V=AT.datos.versiones,doc={formato:1,tipo:'notas',id:'d-dedup',titulo:'Veinte párrafos',props:[],contenido:{type:'doc',content:[]}};
    for(var i=0;i<20;i++)doc.contenido.content.push({type:'paragraph',attrs:{id:'b-p'+i},content:[{type:'text',text:'Párrafo número '+i+' con su texto.'}]});
    var c0,p=V.cuenta().then(function(c){c0=c});
    for(var k=0;k<5;k++)(function(k){p=p.then(function(){doc.contenido.content[k].content[0].text='Cambio '+k;return V.tomar(doc)})})(k);
    return p.then(function(){return V.cuenta()}).then(function(c){return {versiones:c.versiones-c0.versiones,trozos:c.trozos-c0.trozos}});
  });
  r.cumple(dedup.versiones===5&&dedup.trozos<=26,'cinco versiones de 20 bloques guardan solo lo que cambió (no 100 bloques)',dedup);

  /* ---------- Un trozo perdido no rompe la versión ---------- */
  const rota=await p.evaluate(function(){
    var V=AT.datos.versiones;
    return V.listar('d-dedup').then(function(l){
      var v=l[l.length-1],h=v.bloques[3];
      return new Promise(function(ok){var r=indexedDB.open('onelearn');r.onsuccess=function(){var t=r.result.transaction('trozos','readwrite');t.objectStore('trozos').delete(h);t.oncomplete=function(){r.result.close();ok()}}}).then(function(){return V.leer(v)});
    }).then(function(x){return {incompleta:x.incompleta,n:x.doc.contenido.content.length,aviso:AT.bloques.textoDe(x.doc.contenido.content[3])}});
  });
  r.cumple(rota.incompleta&&rota.n===20&&/no se pudo recuperar/.test(rota.aviso),'si falta un bloque, la versión se abre igual y ese bloque lo avisa',rota);

  /* ---------- Importar un respaldo que reemplaza la página guarda la de antes ---------- */
  const imp=await p.evaluate(function(){
    /* La página guardada cambia (sin pasar por el historial) y luego llega un respaldo más nuevo */
    var d0=JSON.parse(JSON.stringify(AT.docActual));d0.contenido.content.push({type:'paragraph',attrs:{id:'b-imp'},content:[{type:'text',text:'Antes del respaldo'}]});
    return AT.datos.documentos.guardar(d0).then(function(){
      var d=JSON.parse(JSON.stringify(d0));d.titulo='Del respaldo';d.editado='2099-01-01T00:00:00.000Z';
      return AT.datos.importar({app:'OneBook',formato:1,documentos:[d]});
    }).then(function(){return AT.datos.versiones.listar(d0.id)}).then(function(l){return l[0]&&[l[0].motivo,l[0].titulo]});
  });
  r.cumple(imp&&imp[0]==='importar'&&imp[1]==='Plan de la semana','antes de que un respaldo reemplace la página, se guarda su versión',imp);

  /* ---------- Copiar como página nueva ---------- */
  await p.reload();await listo(p,800);
  await p.click('#docMas');await p.waitForTimeout(200);await p.click('.menu [role="menuitem"]:has-text("Historial de versiones")');
  await p.waitForSelector('dialog.ver-dlg[open] .ver-i');
  await p.click('.ver-i:has-text("Antes de importar")');await p.waitForTimeout(400);
  await Promise.all([p.waitForURL(function(u){return /documento\.html/.test(u)&&!/id=d-/.test('')}),p.click('.ver-p [data-ver="copiar"]')]);
  await p.waitForFunction(function(){return AT.docActual&&/\(versión del/.test(AT.docActual.titulo)},null,{timeout:8000});
  r.cumple(/^Plan de la semana \(versión del/.test(await p.evaluate(function(){return AT.docActual.titulo})),'«Copiar como página nueva» crea otra página con esa versión');
  const idCopia=await p.evaluate(function(){return AT.docActual.id});

  /* ---------- Borrar la página para siempre borra su historial ---------- */
  const borr=await p.evaluate(function(id){
    var D=AT.datos;
    return D.documentos.leer(id).then(function(d){return D.papelera.mover(d)}).then(function(){return D.papelera.eliminar(id)}).then(function(){return D.versiones.listar(id)}).then(function(l){return l.length});
  },idCopia);
  r.igual(borr,0,'al borrar una página para siempre se borra su historial');
  r.cumple(p.errores.length===0,'sin errores',p.errores.slice(0,3));
  await cerrar(p);

  /* ---------- Celular oscuro ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:NEGOCIO});
  await c.goto(base+'inicio.html');await listo(c,400);
  await c.evaluate(function(){AT.ajustes.set('tema','dark')});
  await Promise.all([c.waitForURL(/documento\.html/),c.evaluate(function(){AT.crear.nuevo('notas')})]);await listo(c,800);
  await c.evaluate(function(){AT.datos.versiones.config.ventana=0});
  await c.click('.ProseMirror');await c.keyboard.type('Uno');await c.keyboard.press('Enter');await c.keyboard.type('Dos');
  await c.waitForTimeout(800);await guardado(c);await c.waitForTimeout(300);
  await c.click('#docMas');await c.waitForTimeout(200);await c.click('.menu [role="menuitem"]:has-text("Historial de versiones")');
  await c.waitForSelector('dialog.ver-dlg[open] .ver-i');
  r.cumple(await c.isVisible('.ver-l')&&await c.isHidden('.ver-p'),'en celular primero se ve la lista');
  await revisar(c,r,'Historial en celular (lista)');
  await c.click('.ver-i >> nth=-1');await c.waitForTimeout(400);
  r.cumple(await c.isHidden('.ver-l')&&await c.isVisible('.ver-p .ver-atras'),'al elegir una versión se ve la vista previa con «Versiones» para volver');
  await revisar(c,r,'Historial en celular (vista previa)');
  await c.click('.ver-atras');await c.waitForTimeout(200);
  r.cumple(await c.isVisible('.ver-l'),'«Versiones» regresa a la lista');
  await cerrar(c);
});
