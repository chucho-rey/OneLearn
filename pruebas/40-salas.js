/* Etapa Empresas, E3: salas por departamento (empresa.js, datos.js, sala.js, crear.js, explorador.js, barra.js).
   - Hay una sala General y una por departamento (con id fijo); una empresa de antes recibe las suyas al cargar.
   - La página de una sala: quién entra, herramientas para empezar, «Nueva página aquí» y sus páginas.
   - Crear pregunta «¿Dónde?» (la sala donde estás o la General; también Privado); cada página nueva es de quien la
     crea, en esa sala y de esta empresa.
   - Lo que ve cada quien: la barra, el explorador, la búsqueda y la página misma solo muestran lo de sus salas; una
     página donde no estás dice «No tienes acceso» y deja pedirlo; el responsable administra su sala (agrega otros
     departamentos que editan o solo ven); un miembro de consulta solo lee.
   - Salas entre departamentos (las crea un responsable), mover una página de sala, quitar una sala con páginas no se
     puede, quitar un departamento deja su sala con la misma gente, y el respaldo lleva las salas.
   - Contraste y desbordes en escritorio, celular, oscuro y alto contraste. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

const PF={perfil:'negocio',modulos:['negocio'],nombre:'',negocio:{nombre:'Ferretería El Clavo',giro:'tienda',telefono:''},creado:'2026-01-01',migrado:true};
function textos(p,sel){return p.$$eval(sel,function(e){return e.map(function(x){return x.textContent.trim()}).join(' | ')})}
async function entrarComo(p,pid){
  await p.click('#sidePersona');await p.waitForSelector('dialog.pe-dlg[open]');
  await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.click('.pe-p[data-id="'+pid+'"]')]);
  await listo(p,300);
}
function salaDe(p,id){return p.evaluate(function(i){return AT.datos.documentos.leer(i).then(function(d){return d&&d.acceso&&d.acceso.sala})},id)}
async function crearEn(p,tipo,donde){
  await p.waitForSelector('dialog.crear-dlg[open]');
  if(donde)await p.selectOption('#crDonde',donde);
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('dialog.crear-dlg .crear-o[data-tipo="'+tipo+'"]')]);
  await listo(p,500);
  return p.evaluate(function(){return AT.docActual.id});
}
function titulosExplorador(p){return p.$$eval('#xpLista [data-fila] .xp-a span',function(e){return e.map(function(x){return x.textContent.trim()}).sort().join(' | ')})}

prueba('Salas por departamento',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:PF});
  await p.goto(base+'inicio.html');await listo(p);
  const ids=await p.evaluate(function(){
    var E=AT.empresa,o={};
    E.cambiarPersona(AT.datos.yoId(),{nombre:'Lupita Hernández'});
    var v=E.agregarDepto({nombre:'Ventas'}),al=E.agregarDepto({nombre:'Almacén',color:'ambar'});
    var dv={},da={},dr={};dv[v.id]='miembro';da[al.id]='consulta';dr[al.id]='responsable';
    o.carlos=E.agregarPersona({nombre:'Carlos Ruiz',deptos:dv}).id;
    o.mario=E.agregarPersona({nombre:'Mario Díaz',deptos:da}).id;
    o.ana=E.agregarPersona({nombre:'Ana Gómez',deptos:dr}).id;
    o.lupita=AT.datos.yoId();o.ventas=v.id;o.almacen=al.id;o.sv=E.salaDeDepto(v.id);o.sa=E.salaDeDepto(al.id);o.empresa=E.id();
    return o;
  });
  const salas=await p.evaluate(function(){return AT.empresa.salas().map(function(s){return s.id+':'+s.tipo+':'+s.nombre}).join(' | ')});
  r.igual(salas,'sa-general:general:General | '+ids.sa+':depto:Almacén | '+ids.sv+':depto:Ventas','hay una sala General y una por departamento');
  r.cumple(ids.sv==='sa-d'+ids.ventas.slice(3),'la sala de un departamento tiene un id fijo, sacado del departamento',ids);
  /* Una empresa de antes de las salas las recibe al cargar */
  await p.evaluate(function(){var e=JSON.parse(localStorage.getItem('aprende-tecnologia:empresa'));delete e.salas;localStorage.setItem('aprende-tecnologia:empresa',JSON.stringify(e))});
  await p.reload();await listo(p);
  r.igual(await p.evaluate(function(){return AT.empresa.salas().length}),3,'una empresa de antes de las salas recibe las suyas');
  r.igual(await textos(p,'#salasLista .nv'),'General | Almacén | Ventas | Privado','la barra lateral lista las salas y Privado');

  /* ---------- La página de una sala ---------- */
  await Promise.all([p.waitForURL(/sala\.html\?id=/),p.click('#salasLista a[href*="'+ids.sv+'"]')]);await listo(p);
  r.cumple(await p.textContent('#sala h1')==='Ventas'&&/La sala del departamento Ventas · Tú la administras/.test(await p.textContent('.emp-sub'))&&await p.getAttribute('#salasLista a[href*="'+ids.sv+'"]','aria-current')==='page',
    'la sala dice qué es y qué puedes hacer, y la barra la marca');
  r.cumple(/Carlos Ruiz \(miembro\)/.test(await p.textContent('.sala-quien'))&&/Quien administra la empresa/.test(await p.textContent('.sala-quien')),'dice quién entra');
  r.igual(await textos(p,'.sala-herr .btn'),'Nota de venta | Corte de caja | Fiado | Clientes','sugiere las herramientas de ventas');
  r.cumple(/Todavía no hay páginas/.test(await p.textContent('#sala')),'todavía sin páginas');
  await revisar(p,r,'sala de Ventas (escritorio)');
  /* «Nueva página aquí» */
  await p.click('[data-sala="nueva"]');await p.waitForSelector('dialog.crear-dlg[open]');
  r.cumple(await p.inputValue('#crDonde')===ids.sv&&/Privado \(solo tú\)/.test(await p.textContent('#crDonde')),'Crear pregunta «¿Dónde?», con esta sala elegida (y Privado)');
  await revisar(p,r,'Crear con «¿Dónde?»');
  const pNotas=await crearEn(p,'notas');
  const acc=await p.evaluate(function(){return AT.docActual.acceso});
  r.cumple(acc.sala===ids.sv&&acc.empresa===ids.empresa&&acc.dueno.id===ids.lupita,'la página nueva nace en la sala, de esta empresa y es de quien la crea',acc);
  r.igual(await p.textContent('.crumbs>:first-child'),'Ventas','la barra superior dice su sala');
  await p.goto(base+'sala.html?id='+ids.sv);await listo(p);
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('.sala-herr [data-tipo="venta"]')]);await listo(p,500);
  const pVenta=await p.evaluate(function(){return AT.docActual.id});
  r.igual(await salaDe(p,pVenta),ids.sv,'una herramienta sugerida también se crea en la sala');
  /* Privado y una página de Almacén; una página de antes queda en la General */
  await p.goto(base+'inicio.html');await listo(p);
  await p.click('#sideCrear');
  const pPriv=await crearEn(p,'notas','privado');
  r.igual(await salaDe(p,pPriv),'privado','Crear también deja elegir Privado');
  await p.evaluate(function(i){return Promise.all([
    AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-bodega',titulo:'Conteo de bodega',props:[],acceso:AT.datos.acceso.nueva(i.sa),contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-bod001'},content:[{type:'text',text:'Clavos: 40 cajas.'}]}]}}),
    AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-avisos',titulo:'Avisos para todos',props:[],contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-avi001'},content:[{type:'text',text:'El lunes no abrimos.'}]}]}})
  ])},ids);
  await p.evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){d.titulo='Metas de ventas';return AT.datos.documentos.guardar(d)})},pNotas);
  await p.evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){d.titulo='Mis pendientes';return AT.datos.documentos.guardar(d)})},pPriv);
  await p.goto(base+'inicio.html');await listo(p,500);await p.waitForSelector('#xpLista [data-fila]');
  r.cumple(await p.isVisible('[data-ubic="sala:'+ids.sv+'"]')&&await p.textContent('[data-ubic="sala:'+ids.sv+'"] em')==='2'&&await p.textContent('[data-ubic="sala:privado"] em')==='1',
    'el explorador tiene una ubicación por sala y Privado, con cuántas páginas hay');
  await p.click('[data-ubic="sala:'+ids.sa+'"]');await p.waitForTimeout(200);
  r.igual(await titulosExplorador(p),'Conteo de bodega','en la ubicación de una sala, solo sus páginas');
  r.cumple(/Almacén/.test(await p.textContent('#xpLista td.xp-c-sala')),'y la columna «Sala» dice dónde está');
  await revisar(p,r,'explorador con salas');
  await p.click('[data-ubic="todas"]');await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(){return AT.datos.documentos.leer('d-avisos').then(function(d){return (d.acceso?'con lista':'sin lista')+'|'+AT.datos.acceso.sala(d)})}),'sin lista|sa-general',
    'una página de antes (sin lista de acceso) cuenta como de la General');

  /* ---------- Carlos (miembro de Ventas) ---------- */
  await entrarComo(p,ids.carlos);
  r.igual(await textos(p,'#salasLista .nv'),'General | Ventas | Privado','Carlos ve la General, Ventas y Privado');
  await p.waitForSelector('#xpLista [data-fila]');
  r.igual(await titulosExplorador(p),'Avisos para todos | Metas de ventas | Nota de venta V-001','su explorador solo tiene lo que puede ver');
  await p.keyboard.press('Control+k');await p.waitForSelector('#busQ');await p.fill('#busQ','bodega');await p.waitForTimeout(500);
  r.cumple(!/Conteo de bodega/.test(await p.textContent('#busRes')),'la búsqueda no encuentra páginas de otras salas');
  await p.keyboard.press('Escape');
  await p.goto(base+'documento.html?id='+pPriv);await listo(p,500);
  r.cumple(/No tienes acceso a esta página/.test(await p.textContent('#docPage'))&&/Es una página privada/.test(await p.textContent('#docPage'))&&!(await p.$('.ProseMirror'))&&await p.isHidden('#docMas'),
    'una página privada de otra persona no se ve: «No tienes acceso»');
  await revisar(p,r,'sin acceso a una página');
  await p.click('#docPedirAcceso');await p.waitForSelector('dialog.perm-dlg[open] #permPedirRol');
  await p.selectOption('#permPedirRol','lector');await p.click('#permPedir [type="submit"]');await p.waitForTimeout(300);
  r.cumple(/Pediste «Solo puede ver»/.test(await p.textContent('dialog.perm-dlg')),'y deja pedir acceso');
  await p.keyboard.press('Escape');
  await p.goto(base+'sala.html?id='+ids.sa);await listo(p);
  r.cumple(/No tienes acceso a esta sala/.test(await p.textContent('#sala')),'tampoco entra a la sala de Almacén');
  await p.goto(base+'documento.html?id='+pNotas);await listo(p,500);
  r.cumple(await p.evaluate(function(){return !!AT.docCambio&&document.getElementById('docEstado').textContent!=='Solo lectura'}),'en Ventas, Carlos edita');

  /* ---------- Mario (consulta en Almacén) ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  await entrarComo(p,ids.mario);
  await p.goto(base+'sala.html?id='+ids.sa);await listo(p);
  r.cumple(/Tú solo ves sus páginas/.test(await p.textContent('.emp-sub'))&&!(await p.$('[data-sala="nueva"]'))&&!(await p.$('.sala-herr')),'Mario, de consulta, solo ve las páginas de Almacén: sin «Nueva página aquí»');
  await p.goto(base+'documento.html?id=d-bodega');await listo(p,500);
  r.igual(await p.textContent('#docEstado'),'Solo lectura','y las abre solo para leer');

  /* ---------- Ana (responsable de Almacén) ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  await entrarComo(p,ids.ana);
  await p.goto(base+'sala.html?id='+ids.sa);await listo(p);
  await p.click('[data-sala="admin"]');await p.waitForSelector('dialog.emp-dlg[open]');
  r.cumple(!(await p.$('dialog.emp-dlg[open] input[name="nombre"]'))&&!(await p.$('dialog.emp-dlg[open] [data-acc="quitar"]')),'la sala de un departamento toma su nombre del departamento y no se quita aquí');
  await p.selectOption('dialog.emp-dlg[open] select[name="d-'+ids.ventas+'"]','ve');
  await revisar(p,r,'administrar la sala');
  await p.click('dialog.emp-dlg[open] button[type="submit"]');await p.waitForTimeout(200);
  r.cumple(/Ventas\s*solo ve/.test(await p.textContent('.sala-quien')),'la responsable deja que Ventas vea Almacén');
  /* Una sala entre departamentos */
  await p.goto(base+'sala.html?nueva');await listo(p);await p.waitForSelector('dialog.emp-dlg[open]');
  await p.fill('dialog.emp-dlg[open] input[name="nombre"]','Proyecto sucursal');await p.selectOption('dialog.emp-dlg[open] select[name="d-'+ids.ventas+'"]','edita');
  await Promise.all([p.waitForURL(/sala\.html\?id=sa-l/),p.click('dialog.emp-dlg[open] button[type="submit"]')]);await listo(p);
  r.cumple(await p.textContent('#sala h1')==='Proyecto sucursal'&&/Una sala entre departamentos · Tú la administras/.test(await p.textContent('.emp-sub')),'una responsable crea una sala entre departamentos y la administra');
  const sp=await p.evaluate(function(){return new URLSearchParams(location.search).get('id')});
  await p.click('[data-sala="nueva"]');const pProy=await crearEn(p,'notas');
  await p.goto(base+'sala.html?id='+sp);await listo(p);
  await p.click('[data-sala="admin"]');await p.waitForSelector('dialog.emp-dlg[open]');
  await p.click('dialog.emp-dlg[open] [data-acc="quitar"]');await p.waitForTimeout(100);
  r.cumple(/todavía tiene 1 página/.test(await p.textContent('#salaDlgMsg')),'una sala con páginas no se quita');
  await p.keyboard.press('Escape');

  /* ---------- Carlos ahora ve Almacén (solo ve) y la sala nueva ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  await entrarComo(p,ids.carlos);
  r.igual(await textos(p,'#salasLista .nv'),'General | Almacén | Ventas | Proyecto sucursal | Privado','Carlos ya ve Almacén y la sala nueva');
  await p.goto(base+'documento.html?id=d-bodega');await listo(p,500);
  r.igual(await p.textContent('#docEstado'),'Solo lectura','Almacén, solo para leer');
  await p.goto(base+'documento.html?id='+pProy);await listo(p,500);
  r.cumple(await p.evaluate(function(){return !!AT.docCambio}),'en la sala nueva, edita');

  /* ---------- Lupita mueve una página, aprueba la solicitud y quita un departamento ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  await entrarComo(p,ids.lupita);
  await p.goto(base+'documento.html?id='+pVenta);await listo(p,500);
  await p.click('#docMas');await p.click('.menu-i:has-text("Mover a otra sala")');await p.waitForSelector('dialog.doc-mover[open]');
  await revisar(p,r,'mover a otra sala');
  await p.selectOption('dialog.doc-mover select','privado');await p.click('dialog.doc-mover [type="submit"]');await p.waitForTimeout(300);
  r.cumple(await salaDe(p,pVenta)==='privado'&&await p.textContent('.crumbs>:first-child')==='Privado','«Mover a otra sala» la pasa a Privado');
  await p.goto(base+'documento.html?id='+pPriv);await listo(p,500);
  await p.click('#docMas');await p.click('.menu-i:has-text("Personas y permisos")');await p.waitForSelector('dialog.perm-dlg[open]');
  r.cumple(/Privada: solo la ven/.test(await p.textContent('dialog.perm-dlg')),'la ventana de permisos dice que es privada');
  await p.click('dialog.perm-dlg [data-perm="aprobar"]');await p.waitForTimeout(300);
  await p.keyboard.press('Escape');
  await p.goto(base+'empresa.html');await listo(p);
  await p.click('[data-emp="depto"][data-id="'+ids.almacen+'"]');await p.waitForSelector('dialog.emp-dlg[open]');
  await p.click('dialog.emp-dlg[open] [data-acc="quitar"]');await p.click('dialog.emp-dlg[open] [data-acc="quitar"]');await p.waitForTimeout(200);
  const conv=await p.evaluate(function(i){var s=AT.empresa.sala(i.sa);return s&&s.tipo+'|'+s.nombre+'|'+s.acceso.personas[i.ana]+'|'+s.acceso.personas[i.mario]+'|'+s.acceso.deptos[i.ventas]},ids);
  r.igual(conv,'libre|Almacén|admin|ve|ve','quitar un departamento deja su sala (con sus páginas) con la misma gente');
  r.cumple(/Proyecto sucursal/.test(await p.textContent('#empSalas'))&&/Almacén/.test(await p.textContent('#empSalas')),'«Tu empresa» lista las salas');
  await revisar(p,r,'Tu empresa con salas');

  /* Carlos ya puede leer la página que pidió; Mario sigue viendo Almacén */
  await entrarComo(p,ids.carlos);
  await p.goto(base+'documento.html?id='+pPriv);await listo(p,500);
  r.igual(await p.textContent('#docEstado'),'Solo lectura','con la solicitud aprobada, Carlos lee la página privada');
  await p.goto(base+'inicio.html');await listo(p);
  await entrarComo(p,ids.mario);
  await p.goto(base+'documento.html?id=d-bodega');await listo(p,500);
  r.igual(await p.textContent('#docEstado'),'Solo lectura','Mario sigue leyendo lo de Almacén');

  /* ---------- Respaldo ---------- */
  const resp=await p.evaluate(function(){return AT.datos.exportar()});
  const q=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await q.goto(base+'entrar.html');await listo(q);
  await Promise.all([q.waitForURL(/inicio\.html$/),q.setInputFiles('#enArchivo',{name:'respaldo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(resp))})]);await listo(q,400);
  r.igual(await q.evaluate(function(){return AT.empresa.salas({todas:true}).map(function(s){return s.nombre}).join(', ')}),'General, Ventas, Almacén, Proyecto sucursal','el respaldo lleva las salas');
  await q.goto(base+'sala.html?id='+ids.sv);await listo(q);
  await revisar(q,r,'sala (celular)');
  r.cumple(q.errores.length===0,'sin errores en celular',q.errores);
  await cerrar(q);
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);

  /* ---------- Variantes ---------- */
  for(const [nombre,aj,ancho] of [['oscuro',{tema:'dark'},1280],['alto contraste',{contraste:'high'},900],['oscuro y alto contraste ×1.5',{tema:'dark',contraste:'high',escala:1.5},390]]){
    const x=await pagina(browser,{ancho:ancho,alto:900,ajustes:aj,reducir:true,perfil:PF});
    await x.goto(base+'inicio.html');await listo(x);
    await x.evaluate(function(d){return AT.datos.importar(d).then(function(){return 1})},resp);
    await x.goto(base+'sala.html?id='+ids.sa);await listo(x);
    await revisar(x,r,'sala, '+nombre);
    await x.goto(base+'documento.html?id=d-bodega');await listo(x,400);
    await revisar(x,r,'página de una sala, '+nombre);
    await cerrar(x);
  }
});
