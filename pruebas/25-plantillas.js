/* Fase F5 (sin páginas dentro de páginas): la galería de plantillas en Crear (categorías, búsqueda, lo que trae
   cada una, paquetes por giro), tus plantillas («Guardar como plantilla», sin lo anotado, folio nuevo, eliminar
   con «Deshacer», en el respaldo), favoritas, la papelera (recuperar, borrar para siempre, vaciar, 30 días) y el
   Inicio de negocio (acciones rápidas, favoritas y recientes, «Prepara tu negocio»). */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

const NEGOCIO={perfil:'negocio',modulos:['negocio'],nombre:'',negocio:{nombre:'Abarrotes Lupita',giro:'tienda',telefono:'55 1234 5678'},creado:'2026-01-01'};
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
const HOY=iso(new Date());
/* Sin «Mi negocio» (fase F7e): el Inicio de un negocio la crea sola */
function docs(p){return p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return d.id!=='d-minegocio'}).map(function(d){return {id:d.id,tipo:d.tipo,titulo:d.titulo,fav:!!d.favorito,editado:d.editado,tipos:(d.contenido.content||[]).map(function(b){return b.type})}})})})}
function visibles(p){return p.evaluate(function(){return [].filter.call(document.querySelectorAll('dialog.crear-dlg .crear-o'),function(o){return o.getClientRects().length}).map(function(o){return o.querySelector('b').firstChild.textContent.trim()})})}
/* En celular la barra lateral está cerrada: se abre el menú y ahí «Crear» */
async function abrirCrear(p){
  if(!await p.isVisible('#sideCrear')){await p.click('#menuBtn');await p.waitForTimeout(300)}
  await p.click('#sideCrear');await p.waitForSelector('dialog.crear-dlg[open]');await p.waitForTimeout(300);
}
async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}
function bloqueEd(p,tipo){return p.evaluate(function(t){var b=null;AT.editorActual.tiptap.state.doc.forEach(function(n){if(n.type.name===t&&!b)b=JSON.parse(JSON.stringify(n.attrs))});return b},tipo)}

prueba('Plantillas, favoritas y papelera',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:NEGOCIO});
  const errores=[];p.on('pageerror',function(e){errores.push(e.message)});
  await p.goto(base+'inicio.html');await listo(p);

  /* ---------- Inicio de negocio, recién creado ---------- */
  const ini=await p.evaluate(function(){
    return {acciones:[].map.call(document.querySelectorAll('#iniAcciones [data-accion]'),function(b){return b.textContent}).join(' | '),rapidas:!document.getElementById('iniRapidas').hidden,
      prepara:!document.getElementById('iniPrepara').hidden,pasos:document.querySelectorAll('#iniPrepLista li').length,n:document.getElementById('iniPrepN').textContent,
      listas:document.querySelectorAll('#iniPlantillas .ini-pl').length,mas:!!document.querySelector('#iniEmpezar [data-crear]')};
  });
  r.cumple(ini.rapidas&&ini.acciones==='Corte de hoy | Nueva venta | Anotar fiado | Anotar un gasto','Inicio de negocio: acciones rápidas',ini);
  r.cumple(ini.prepara&&ini.pasos===5&&ini.n==='0 de 5','«Prepara tu negocio» con 5 pasos, ninguno hecho',ini);
  r.cumple(ini.listas===9&&ini.mas,'nueve páginas listas para usar y «Ver todas las plantillas»',ini);
  await revisar(p,r,'Inicio de negocio en celular');

  /* ---------- La galería ---------- */
  await abrirCrear(p);
  const chips=await p.$$eval('dialog.crear-dlg .crear-chip',function(e){return e.map(function(x){return x.textContent+(x.getAttribute('aria-pressed')==='true'?'*':'')}).join(' | ')});
  r.igual(chips,'Todas* | Para tu negocio | Paquetes por giro | Tus finanzas','categorías de la galería (sin estudio), en el orden de sus secciones');
  r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('data-tipo')}),'notas','el foco empieza en la primera plantilla');
  r.cumple(await p.evaluate(function(){var o=document.querySelector('.crear-o[data-tipo="proveedores"] .crear-trae');return o&&o.textContent==='Trae: Tabla · Cuentas por pagar'}),'cada plantilla dice qué bloques trae');
  r.cumple(await p.evaluate(function(){var o=document.querySelector('.crear-o[data-paquete="tienda"]');return !!o&&/Tu giro/.test(o.textContent)&&/Crea 5 páginas/.test(o.textContent)}),'el paquete del giro del negocio se marca como «Tu giro»');
  await revisar(p,r,'galería de plantillas en celular');
  await p.click('.crear-chip[data-filtro="finanzas"]');await p.waitForTimeout(100);
  r.igual((await visibles(p)).join(' | '),'Presupuesto del mes | Finanzas del mes | Me deben | Préstamo o crédito','«Tus finanzas» filtra la galería');
  await p.click('.crear-chip[data-filtro="todas"]');
  await p.fill('#crBuscar','fiádo');await p.waitForTimeout(100);
  r.igual((await visibles(p)).join(' | '),'Fiado | Tienda o abarrotes | Me deben','la búsqueda (sin acentos) encuentra el fiado, el paquete que lo trae y «Me deben»');
  await p.fill('#crBuscar','zzz');await p.waitForTimeout(100);
  r.cumple(await p.isVisible('#crNada')&&!(await visibles(p)).length,'si nada coincide, lo dice');
  await p.fill('#crBuscar','');

  /* Paquete por giro: varias páginas de una vez */
  await Promise.all([p.waitForURL(/inicio\.html$/),p.click('.crear-o[data-paquete="tienda"]')]);await listo(p,400);
  let ds=await docs(p);
  r.igual(ds.map(function(d){return d.tipo}).sort().join(),'corte,fiado,inventario,proveedores,reporte','el paquete de tienda crea sus 5 páginas');
  r.cumple(/Se crearon 5 páginas: Cortes de caja, Inventario, Reporte de .+, Fiado, Proveedores\./.test(await p.textContent('#avisoApp')),'y el Inicio lo avisa',await p.textContent('#avisoApp'));

  /* Las plantillas nuevas traen sus bloques */
  const pl=await p.evaluate(function(){var o={};['plan','finanzas','medeben','clientes','lista'].forEach(function(t){var d=AT.crear.armar(t);o[t]=d.titulo+': '+d.contenido.content.map(function(b){return b.type}).filter(function(x){return x!=='paragraph'&&x!=='heading'}).join(',')});return o});
  r.cumple(pl.plan==='Plan de negocio: precio,taskList'&&pl.finanzas==='Finanzas del mes: gastos,pagos,taskList'&&pl.medeben==='Me deben: fiado'&&pl.clientes==='Clientes: basedatos'&&pl.lista==='Lista de precios: callout,table',
    'plan de negocio, finanzas del mes, me deben, clientes y lista de precios traen sus bloques',pl);

  /* ---------- Acciones rápidas ---------- */
  const corteId=ds.filter(function(d){return d.tipo==='corte'})[0].id;
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('[data-accion="corte"]')]);await listo(p,500);
  r.cumple(p.url().indexOf(corteId)>0&&!/#agregar/.test(p.url())&&await p.evaluate(function(){return document.activeElement.getAttribute('data-k')==='fondo'}),'«Corte de hoy» abre tus cortes en el de hoy, listo para escribir');
  r.igual(await p.evaluate(function(){var n=0;AT.editorActual.tiptap.state.doc.forEach(function(b){if(b.type.name==='corte')n++});return n}),1,'si ya está el corte de hoy, no agrega otro');
  await p.fill('.nb-corte [data-k="ventas.efectivo"]','1500');await esperarGuardado(p);
  /* Un corte de ayer: «Corte de hoy» agrega el de hoy al final */
  await p.evaluate(function(){var t=AT.editorActual.tiptap,pos=null;t.state.doc.forEach(function(n,o){if(n.type.name==='corte')pos=o});t.view.dispatch(t.state.tr.setNodeAttribute(pos,'fecha','2020-01-01'))});
  await esperarGuardado(p);
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('[data-accion="corte"]')]);await listo(p,500);
  const cortes=await p.evaluate(function(){var l=[];AT.editorActual.tiptap.state.doc.forEach(function(b){if(b.type.name==='corte')l.push(b.attrs.fecha)});return l});
  r.cumple(cortes.length===2&&cortes[0]==='2020-01-01'&&cortes[1]===HOY&&await p.evaluate(function(){return document.activeElement.getAttribute('data-k')==='fondo'}),'si el último corte no es de hoy, agrega el de hoy al final',cortes);
  await esperarGuardado(p);
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('[data-accion="venta"]')]);await listo(p,500);
  r.cumple(/^Nota de venta V-001$/.test(await p.inputValue('#docTitulo'))&&!!await p.$('.nb-venta'),'«Nueva venta» crea una nota con su folio');
  await p.fill('.nb-venta [data-k="conceptos.0.desc"]','Garrafón');await p.fill('.nb-venta [data-k="conceptos.0.precio"]','45');await p.fill('.nb-venta [data-k="cliente"]','Don Beto');
  await esperarGuardado(p);
  const ventaId=await p.evaluate(function(){return AT.docActual.id});

  /* ---------- Guardar como plantilla ---------- */
  await p.click('#docMas');await p.click('.menu-i:has-text("Guardar como plantilla")');await p.waitForSelector('#plNombre');
  r.cumple(await p.inputValue('#plNombre')==='Nota de venta V-001'&&await p.isChecked('#plVaciar')&&await p.evaluate(function(){return document.activeElement.id==='plNombre'}),
    'la ventana propone el título de la página, «Sin lo anotado» marcado y el foco en el nombre');
  await revisar(p,r,'Guardar como plantilla en celular');
  await p.fill('#plNombre','Venta de garrafón');await p.fill('#plDesc','Garrafón a domicilio');
  await p.click('#plSi');await p.waitForTimeout(300);
  r.cumple(/Se guardó la plantilla «Venta de garrafón»/.test(await p.textContent('#avisoApp')),'avisa que se guardó y dónde encontrarla');
  const guardada=await p.evaluate(function(){return AT.datos.plantillas.todos().then(function(l){var x=l[0],v=x.contenido.content.filter(function(b){return b.type==='venta'})[0].attrs;return {n:l.length,nombre:x.nombre,desc:x.desc,folio:v.folio,cliente:v.cliente,concepto:v.conceptos[0].desc}})});
  r.cumple(guardada.n===1&&guardada.desc==='Garrafón a domicilio'&&guardada.folio===''&&guardada.cliente===''&&guardada.concepto==='Garrafón','sin lo anotado: sin folio ni cliente, pero con sus conceptos',guardada);
  /* El fiado, con un cliente y un abono: la plantilla se queda con el cliente, sin sus movimientos */
  const fiadoId=ds.filter(function(d){return d.tipo==='fiado'})[0].id;
  await p.goto(base+'documento.html?id='+fiadoId);await listo(p,500);
  await p.click('.nb-fiado [data-acc="agregar"]');await p.keyboard.type('Doña Mary');
  await p.fill('.nb-fiado [data-k="clientes.0.apunte.monto"]','200');await p.click('.nb-fiado [data-acc="cargo"]');await esperarGuardado(p);
  await p.click('#docMas');await p.click('.menu-i:has-text("Guardar como plantilla")');await p.waitForSelector('#plNombre');
  await p.fill('#plNombre','Fiado de la tienda');await p.click('#plSi');await p.waitForTimeout(300);

  /* ---------- Mis plantillas en la galería ---------- */
  await abrirCrear(p);
  r.cumple(await p.evaluate(function(){var s=document.querySelector('.crear-sec');return s.getAttribute('data-cat')==='mis'&&s.querySelectorAll('[data-plantilla]').length===2}),'«Mis plantillas» sale primero, con las dos');
  r.cumple(await p.isVisible('.crear-chip[data-filtro="mis"]'),'y tiene su categoría');
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('.crear-o:has-text("Venta de garrafón")')]);await listo(p,500);
  const v2=await bloqueEd(p,'venta');
  r.cumple(await p.inputValue('#docTitulo')==='Nota de venta V-002'&&v2.folio==='V-002'&&v2.fecha===HOY&&v2.cliente===''&&v2.conceptos[0].desc==='Garrafón'&&v2.conceptos[0].precio==='45',
    'una página desde tu plantilla: folio nuevo (también en el título), fecha de hoy y sus conceptos',v2);
  await abrirCrear(p);
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('.crear-o:has-text("Fiado de la tienda")')]);await listo(p,500);
  const f2=await bloqueEd(p,'fiado');
  r.cumple(f2.clientes.length===1&&f2.clientes[0].nombre==='Doña Mary'&&f2.clientes[0].movs.length===0,'el fiado desde tu plantilla trae al cliente sin sus movimientos',f2.clientes);
  /* Eliminar una plantilla, y «Deshacer» */
  await abrirCrear(p);
  await p.click('[aria-label="Eliminar la plantilla «Fiado de la tienda»"]');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return document.querySelectorAll('[data-plantilla]').length===1&&document.activeElement&&document.activeElement.classList.contains('crear-o')}),'se elimina la plantilla y el foco queda en la galería');
  await p.keyboard.press('Escape');
  await p.click('#avisoApp .btn');await p.waitForTimeout(300);
  r.igual(await p.evaluate(function(){return AT.datos.plantillas.todos().then(function(l){return l.length})}),2,'«Deshacer» la regresa');
  /* En el respaldo */
  const resp=await p.evaluate(function(){return AT.datos.exportar().then(function(d){return d.plantillas.map(function(x){return x.nombre}).sort().join()})});
  r.igual(resp,'Fiado de la tienda,Venta de garrafón','tus plantillas entran en el respaldo');
  const imp=await p.evaluate(function(){return AT.datos.importar({app:'OneBook',formato:1,plantillas:[{id:'p-importada',nombre:'Del respaldo',contenido:{type:'doc',content:[]}},{id:'p-mala',nombre:3}]}).then(function(r){return r.plantillas})});
  r.igual(imp,1,'y se importan (solo las válidas)');

  /* ---------- Favoritas ---------- */
  await p.goto(base+'documento.html?id='+ventaId);await listo(p,500);
  const antes=(await docs(p)).filter(function(d){return d.id===ventaId})[0].editado;
  r.cumple(await p.getAttribute('#docFav','aria-pressed')==='false','la estrella de favorita, sin marcar');
  await p.click('#docFav');await p.waitForTimeout(300);
  const fv=(await docs(p)).filter(function(d){return d.id===ventaId})[0];
  r.cumple(await p.getAttribute('#docFav','aria-pressed')==='true'&&fv.fav&&fv.editado===antes,'marcarla favorita se guarda sin cambiar la fecha de edición',fv);
  await p.click('#menuBtn');await p.waitForTimeout(700);
  r.cumple(await p.evaluate(function(){var a=document.querySelector('#docsLista li a.doc');return !!a&&/Nota de venta V-001/.test(a.textContent)&&!!a.querySelector('.doc-est')}),'en la barra lateral, las favoritas van primero, con su estrella');
  await p.keyboard.press('Escape');
  await p.goto(base+'inicio.html');await listo(p);
  r.cumple(await p.evaluate(function(){var f=document.getElementById('iniFavs');return !f.hidden&&f.querySelectorAll('.nota').length===1&&/Nota de venta V-001/.test(f.textContent)&&!/Nota de venta V-001/.test(document.getElementById('iniDocs').textContent)&&!document.getElementById('iniRecT').hidden}),
    'en el Inicio: favoritas y, aparte, las recientes');
  /* «Prepara tu negocio» se marca solo */
  r.cumple(await p.evaluate(function(){return [].map.call(document.querySelectorAll('#iniPrepLista .hecho'),function(li){return li.querySelector('b').textContent}).join()==='Haz tu primer corte de caja,Anota a quién le fías,Haz tu primera nota de venta'&&document.getElementById('iniPrepN').textContent==='3 de 5'}),
    '«Prepara tu negocio» marca solos el corte, el fiado y la nota de venta');
  await revisar(p,r,'Inicio con favoritas y Prepara tu negocio en celular');
  await p.click('#iniPrepOcultar');await p.waitForTimeout(150);
  r.cumple(await p.isHidden('#iniPrepara')&&await p.evaluate(function(){return document.activeElement.id==='t-docs'}),'«Ocultar esta lista» la esconde y el foco pasa a tus páginas');
  await p.reload();await listo(p);
  r.cumple(await p.isHidden('#iniPrepara'),'y se queda oculta');

  /* ---------- Papelera ---------- */
  await p.goto(base+'documento.html?id='+ventaId);await listo(p,500);
  await p.click('#docMas');await p.click('.menu-i:has-text("Mover a la papelera")');await p.waitForTimeout(150);
  r.cumple(/Puedes recuperarla desde la papelera durante 30 días/.test(await p.textContent('dialog[open]')),'mover a la papelera explica que se puede recuperar');
  await Promise.all([p.waitForURL(/inicio\.html/),p.click('[data-el="si"]')]);await listo(p,400);
  r.cumple(/«Nota de venta V-001» se movió a la papelera/.test(await p.textContent('#avisoApp'))&&!(await docs(p)).some(function(d){return d.id===ventaId}),'sale de tus páginas y el Inicio lo avisa');
  await p.click('#menuBtn');await p.waitForTimeout(700);
  r.cumple(/Papelera\s*1/.test(await p.textContent('#docsLista .doc-pap')),'al final de tus páginas aparece la papelera con cuántas tiene');
  await p.click('#docsLista .doc-pap');await p.waitForSelector('dialog.pap-dlg[open]');
  r.cumple(/Nota de venta V-001/.test(await p.textContent('#papL'))&&/se borra en 30 días/.test(await p.textContent('#papL'))&&await p.evaluate(function(){return document.activeElement.getAttribute('data-pap')==='restaurar'}),
    'la papelera lista la página con los días que le quedan; el foco en «Recuperar»');
  await revisar(p,r,'papelera en celular');
  await p.click('[data-pap="restaurar"]');await p.waitForTimeout(300);
  const rec=await docs(p);
  r.cumple(rec.some(function(d){return d.id===ventaId&&d.fav})&&/Se recuperó «Nota de venta V-001»/.test(await p.textContent('#papMsg'))&&/está vacía/.test(await p.textContent('#papL')),'«Recuperar» la regresa tal como estaba (sigue siendo favorita)');
  await p.keyboard.press('Escape');
  /* Borrar para siempre y vaciar */
  await p.evaluate(function(ids){return Promise.all(ids.map(function(id){return AT.datos.documentos.leer(id).then(function(d){return AT.datos.papelera.mover(d)})}))},[ventaId,fiadoId]);
  await p.evaluate(function(){return AT.papelera.abrir()});await p.waitForTimeout(200);
  await p.click('[data-pap="borrar"] >> nth=0');
  r.cumple(/¿Borrarla para siempre\?/.test(await p.textContent('#papL'))&&await p.evaluate(function(){return document.activeElement.getAttribute('data-pap')==='no'}),'«Borrar para siempre» pide confirmar ahí mismo, con el foco en «Cancelar»');
  await p.click('[data-pap="si-borrar"]');await p.waitForTimeout(300);
  r.igual(await p.evaluate(function(){return AT.datos.papelera.todos().then(function(l){return l.length})}),1,'se borra para siempre');
  await p.click('[data-pap="vaciar"]');await p.click('[data-pap="si-vaciar"]');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return AT.datos.papelera.todos().then(function(l){return l.length===0})})&&/quedó vacía/.test(await p.textContent('#papMsg')),'«Vaciar la papelera» la deja vacía');
  await p.keyboard.press('Escape');
  /* Lo que lleva más de 30 días se borra solo */
  const viejo=await p.evaluate(function(){
    return new Promise(function(ok){
      var q=indexedDB.open('onelearn');
      q.onsuccess=function(){var db=q.result,t=db.transaction('papelera','readwrite');
        t.objectStore('papelera').put({id:'d-viejo',titulo:'Vieja',eliminado:new Date(Date.now()-31*864e5).toISOString(),contenido:{type:'doc',content:[]}});
        t.objectStore('papelera').put({id:'d-nueva',titulo:'Nueva',eliminado:new Date(Date.now()-29*864e5).toISOString(),contenido:{type:'doc',content:[]}});
        t.oncomplete=function(){db.close();ok()}};
    }).then(function(){return AT.datos.papelera.todos()}).then(function(l){return l.map(function(d){return d.id}).join()});
  });
  r.igual(viejo,'d-nueva','lo que lleva más de 30 días en la papelera se borra solo');
  await p.evaluate(function(){return AT.datos.papelera.vaciar()});
  await cerrar(p);

  /* ---------- Escritorio: galería y papelera desde «Tus datos» ---------- */
  const q=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:NEGOCIO,ajustes:{tema:'dark'}});
  await q.goto(base+'inicio.html');await listo(q);
  await q.evaluate(function(){var d=AT.crear.armar('notas');d.titulo='Borrador';return AT.datos.documentos.guardar(d).then(function(x){return AT.datos.papelera.mover(x)})});
  await q.click('#sideDatos');await q.waitForSelector('#tdPap .btn');
  r.cumple(/1 página en la papelera/.test(await q.textContent('#tdPap')),'«Tus datos» dice cuántas páginas hay en la papelera');
  await q.click('#tdPap .btn');await q.waitForSelector('dialog.pap-dlg[open]');
  r.cumple(/Borrador/.test(await q.textContent('#papL')),'y abre la papelera');
  await revisar(q,r,'papelera en escritorio (oscuro)');
  await q.keyboard.press('Escape');
  await abrirCrear(q);
  await revisar(q,r,'galería de plantillas en escritorio (oscuro)');
  await cerrar(q);

  /* Personal: sus acciones y su galería; sin «Prepara tu negocio» */
  const s=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'personal',modulos:['negocio'],nombre:'Ana',negocio:null,creado:'2026-01-01'},ajustes:{contraste:'high'}});
  await s.goto(base+'inicio.html');await listo(s);
  r.cumple(await s.evaluate(function(){return [].map.call(document.querySelectorAll('#iniAcciones [data-accion]'),function(b){return b.textContent}).join(' | ')==='Anotar un gasto | Me deben | Una deuda'&&document.getElementById('iniPrepara').hidden&&
    [].map.call(document.querySelectorAll('#iniPlantillas .ini-pl b'),function(b){return b.textContent}).join(' | ')==='Finanzas del mes | Gastos del mes | Préstamo o crédito | Me deben | Notas'}),'personal: acciones de finanzas, sus páginas listas y sin «Prepara tu negocio»');
  await Promise.all([s.waitForURL(/documento\.html/),s.click('[data-accion="gasto"]')]);await listo(s,500);
  r.cumple(/Finanzas del mes/.test(await s.inputValue('#docTitulo'))&&!!await s.$('.nb-gastos'),'«Anotar un gasto» sin páginas crea «Finanzas del mes»');
  await revisar(s,r,'finanzas del mes en escritorio (alto contraste)');
  await s.goto(base+'inicio.html');await listo(s);
  await abrirCrear(s);
  r.igual(await s.$$eval('dialog.crear-dlg .crear-chip',function(e){return e.map(function(x){return x.textContent}).join(' | ')}),'Todas | Tus finanzas | Para tu negocio | Paquetes por giro','personal: la galería empieza por sus finanzas');
  r.igual(await s.evaluate(function(){return document.querySelector('.crear-sec').getAttribute('data-cat')}),'finanzas','con «Tus finanzas» primero');
  await revisar(s,r,'galería en escritorio (alto contraste)');
  await cerrar(s);

  if(errores.length)r.cumple(false,'sin errores de JavaScript',errores);
});
