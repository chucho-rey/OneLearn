/* Etapa Empresas, E5: la empresa de ejemplo (ejemplo.html, ejemplo.js) y «Crear mi empresa».
   - En un navegador sin espacio, ejemplo.html arma Ferretería El Clavo (seis personas, cuatro departamentos con su
     sala, páginas en cada sala, inventario con ventas, compras, gastos, equipo y los tableros) y abre el Inicio, que
     dice que es un ejemplo. Las cifras salen iguales cada vez.
   - Cada persona ve lo suyo: Carlos (Ventas) no ve el almacén ni «Tu equipo»; Ana (Recursos humanos) sí ve su equipo.
   - Volver a ejemplo.html abre el Inicio; con una empresa propia, ejemplo.html no toca nada y lo explica.
   - «Crear mi empresa» pide confirmar, borra todo y abre «Crea tu empresa»; la bienvenida vuelve a mostrarse.
   - Contraste y desbordes en escritorio, celular, oscuro y alto contraste. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function entrarComo(p,nombre){
  const pid=await p.evaluate(function(n){return AT.empresa.leer().personas.filter(function(x){return x.nombre===n})[0].id},nombre);
  await p.click('#sidePersona');await p.waitForSelector('dialog.pe-dlg[open]');
  await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.click('.pe-p[data-id="'+pid+'"]')]);
  await listo(p,600);
}
function salasBarra(p){return p.$$eval('.side a.sala-nv[href*="sala.html?id=sa-"] > span',function(e){return e.map(function(a){return a.textContent.trim()}).join(', ')})}
function resumen(p){
  return p.evaluate(function(){
    var e=AT.empresa.leer();
    return AT.datos.documentos.todos().then(function(l){
      return AT.inventario.cargar().then(function(){
        var ids=AT.inventario.ids(),B=AT.bases,pb=B.base(ids.productos),filas=B.filas(ids.productos);
        var ex={};filas.forEach(function(f){ex[B.valor(pb,f,B.col(pb,'p-nombre'))]=B.valor(pb,f,B.col(pb,'p-exist'))});
        return {personas:e.personas.filter(function(x){return !x.borrado}).length,deptos:e.departamentos.map(function(d){return d.nombre}).join(', '),
          docs:l.length,productos:filas.length,movs:B.filas(ids.movimientos).length,foco:ex['Foco LED 9 W'],cinta:ex['Cinta teflón'],
          empleados:B.filas(ids.empleados).length,tablero:(AT.empresa.tablero('empresa')||[]).map(function(m){return m.tipo}).join(' | '),
          portadas:e.salas.filter(function(s){return s.tablero&&s.tablero.modulos.length}).length,ejemplo:AT.perfil.actual().ejemplo};
      });
    });
  });
}

prueba('Empresa de ejemplo',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  await p.goto(base+'ejemplo.html');
  await p.waitForURL(/inicio\.html$/,{timeout:20000});await listo(p,1200);
  const a=await resumen(p);
  r.cumple(a.personas===6&&a.deptos==='Ventas, Almacén, Administración, Recursos humanos'&&a.ejemplo===true,'ejemplo.html arma la empresa: seis personas y cuatro departamentos',a);
  r.cumple(a.docs===15&&a.productos===14&&a.movs>500&&a.empleados===6&&a.portadas===4,'con sus páginas, el inventario con dos meses de ventas, el equipo y la portada de cada sala',a);
  r.cumple(a.foco===0&&a.cinta===12,'las existencias salen iguales cada vez (un producto agotado y otros bajos)',a);
  r.igual(a.tablero,'avisos | acciones | pagina | pagina | actividad','el Inicio de la empresa ya está armado');
  r.cumple(await p.isVisible('#iniEjemplo')&&/empresa de ejemplo/.test(await p.textContent('#iniEjemplo')),'el Inicio dice que es una empresa de ejemplo');
  await p.waitForFunction(function(){var x=document.querySelector('[data-m="m-minegocio"] .ind-n, [data-m="m-minegocio"] .ind');return !!x},null,{timeout:8000}).catch(function(){});
  r.cumple(/Ventas del mes\s*\$[\d,]+\.\d\d/.test(await p.textContent('[data-m="m-minegocio"]')),'«Mi negocio» muestra las ventas del mes');
  r.cumple(/Jorge Díaz/.test(await p.textContent('[data-m="m-miequipo"]')),'«Tu equipo» dice quién falta hoy');
  r.igual(await salasBarra(p),'General, Administración, Almacén, Recursos humanos, Ventas','Lupita, la dueña, ve todas las salas');
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await revisar(p,r,'Inicio de la empresa de ejemplo');

  /* La página «Empieza aquí» */
  const emp=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return d.titulo==='Empieza aquí'})[0].id})});
  await p.goto(base+'documento.html?id='+emp);await listo(p,800);
  r.cumple(/Cambia de persona/.test(await p.textContent('.ProseMirror, .doc-cuerpo, main')),'«Empieza aquí» dice qué probar');
  await p.goto(base+'inicio.html');await listo(p,600);

  /* ---------- Cada quien ve lo suyo ---------- */
  await entrarComo(p,'Carlos Ruiz');
  r.igual(await salasBarra(p),'General, Ventas','Carlos (Ventas) solo ve la General y Ventas');
  r.cumple(await p.isHidden('[data-m="m-miequipo"]'),'y no ve «Tu equipo» (está en la sala de Recursos humanos)');
  r.cumple(!/Inventario/.test(await p.textContent('.side')),'ni las páginas del almacén');
  await entrarComo(p,'Ana Pérez');
  r.cumple(/Recursos humanos/.test(await salasBarra(p))&&await p.isVisible('[data-m="m-miequipo"]'),'Ana (Recursos humanos) ve su sala y «Tu equipo»');
  await entrarComo(p,'Lupita Hernández');

  /* ---------- Volver a ejemplo.html ---------- */
  await p.goto(base+'ejemplo.html');await p.waitForURL(/inicio\.html$/);await listo(p,500);
  r.igual((await resumen(p)).docs,15,'volver a ejemplo.html abre el Inicio sin armar otra vez');

  /* ---------- Crear mi empresa ---------- */
  await p.click('#iniEjemplo [data-ej="crear"]');
  r.cumple(/Borrar la empresa de ejemplo/.test(await p.textContent('#iniEjemplo'))&&await p.evaluate(function(){return document.activeElement.getAttribute('data-ej')==='no'}),'«Crear mi empresa» pide confirmar (el foco va a «Cancelar»)');
  await revisar(p,r,'confirmar «Crear mi empresa»');
  await p.click('#iniEjemplo [data-ej="no"]');
  r.cumple(await p.evaluate(function(){return document.activeElement.getAttribute('data-ej')==='crear'}),'«Cancelar» lo deja como estaba');
  await p.click('#iniEjemplo [data-ej="crear"]');
  await Promise.all([p.waitForURL(/entrar\.html$/,{timeout:10000}),p.click('#iniEjemplo [data-ej="si"]')]);await listo(p);
  const b=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return {docs:l.length,claves:Object.keys(localStorage).filter(function(k){return k.indexOf('aprende-tecnologia:')===0}).join(',')}})});
  r.cumple(b.docs===0&&b.claves===''&&/Paso 1 de 3/.test(await p.textContent('#enPaso')),'«Sí, borrarla» borra todo y abre «Crea tu empresa»',b);
  await p.goto(base);await listo(p);
  r.cumple(!!await p.$('#lpTitulo')&&/\/$/.test(p.url()),'la bienvenida vuelve a mostrarse');
  r.cumple(p.errores.length===0,'sin errores al borrar',p.errores);
  await cerrar(p);

  /* ---------- Con una empresa propia, ejemplo.html no toca nada ---------- */
  const q=await pagina(browser,{ancho:390,alto:844,reducir:true});
  await q.goto(base+'inicio.html');await listo(q,500);
  const antes=await q.evaluate(function(){return {e:AT.empresa.leer().id,n:AT.empresa.leer().personas.length}});
  await q.goto(base+'ejemplo.html');await listo(q,800);
  const d=await q.evaluate(function(){return {e:AT.empresa.leer().id,n:AT.empresa.leer().personas.length,ej:!!AT.perfil.actual().ejemplo}});
  r.cumple(/Ya tienes una empresa aquí/.test(await q.textContent('#ejCaja'))&&/ventana privada/.test(await q.textContent('#ejCaja'))&&d.e===antes.e&&d.n===antes.n&&!d.ej,'con una empresa propia, ejemplo.html no la toca y sugiere una ventana privada',d);
  await revisar(q,r,'ejemplo.html con una empresa propia (celular)');
  await cerrar(q);

  /* ---------- Celular y variantes ---------- */
  for(const [nombre,aj,ancho] of [['celular',null,390],['oscuro',{tema:'dark'},1280],['alto contraste ×1.5',{contraste:'high',escala:1.5},390],['oscuro y alto contraste',{tema:'dark',contraste:'high'},900]]){
    const x=await pagina(browser,{ancho:ancho,alto:900,reducir:true,perfil:false});
    await x.goto(base+'ejemplo.html');await x.waitForURL(/inicio\.html$/,{timeout:20000});
    if(aj){await x.evaluate(function(a){localStorage.setItem('aprende-tecnologia:ajustes',JSON.stringify(a))},aj);await x.reload()}
    await listo(x,1200);
    await revisar(x,r,'Inicio de ejemplo, '+nombre);
    await cerrar(x);
  }
});
