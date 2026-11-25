/* Etapa Empresas, E4: el Inicio armable y la portada de cada sala (tablero.js, empresa.js).
   - Mientras nadie lo arma, «De tu empresa» trae los accesos rápidos y «Mi negocio» (que se crea sola) y «Lo tuyo»,
     tus favoritas y recientes y tus salas.
   - Quien administra la empresa edita su tablero: mover antes y después, arrastrar, tamaño, quitar, agregar desde el
     catálogo y configurar (avisos, una página, una gráfica de una base); todo se guarda al momento.
   - «Lo tuyo» es de cada persona (la nota se guarda sola); un miembro no edita el de la empresa; un módulo de una
     página que no puedes ver no se muestra.
   - La portada de una sala la arma quien la administra; vacía, no se muestra a los demás.
   - El respaldo lleva los tableros. Contraste y desbordes en escritorio, celular, oscuro y alto contraste. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

const PF={perfil:'negocio',modulos:['negocio'],nombre:'',negocio:{nombre:'Ferretería El Clavo',giro:'tienda',telefono:''},creado:'2026-01-01',migrado:true};
const EMP='#iniTabEmp',TUYO='#iniTabTuyo';
function modulos(p,sel){return p.$$eval(sel+' .tab-m',function(e){return e.map(function(x){return x.getAttribute('data-modulo')+':'+(/tam-(\w)/.exec(x.className)||[])[1]}).join(' | ')})}
function guardados(p,capa,sala){return p.evaluate(function(a){var m=AT.empresa.tablero(a[0],a[1]);return m?m.map(function(x){return x.tipo+':'+x.tam}).join(' | '):null},[capa,sala||''])}
async function entrarComo(p,pid){
  await p.click('#sidePersona');await p.waitForSelector('dialog.pe-dlg[open]');
  await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.click('.pe-p[data-id="'+pid+'"]')]);
  await listo(p,500);
}

prueba('Inicio armable y portada de las salas',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:PF});
  await p.goto(base+'inicio.html');await listo(p,800);
  await p.waitForSelector('[data-m="m-minegocio"] .tab-pag');
  r.igual(await modulos(p,EMP),'acciones:l | pagina:l','«De tu empresa» trae los accesos rápidos y «Mi negocio»');
  r.cumple(await p.evaluate(function(){return AT.datos.documentos.leer('d-minegocio').then(function(d){return !!d})})&&/Mi negocio/.test(await p.textContent('[data-m="m-minegocio"] h3')),'«Mi negocio» se crea sola y su módulo lleva su nombre');
  r.igual(await modulos(p,TUYO),'recientes:m | salas:s','«Lo tuyo» trae tus favoritas y recientes y tus salas');
  r.cumple(await guardados(p,'empresa')===null&&await guardados(p,'persona')===null,'mientras nadie los arma, no se guarda nada');
  await revisar(p,r,'Inicio con el tablero');

  /* ---------- Editar el tablero de la empresa ---------- */
  const ids=await p.evaluate(function(){
    var E=AT.empresa;E.cambiarPersona(AT.datos.yoId(),{nombre:'Lupita Hernández'});
    var v=E.agregarDepto({nombre:'Ventas'}),dv={};dv[v.id]='miembro';
    return {lupita:AT.datos.yoId(),carlos:E.agregarPersona({nombre:'Carlos Ruiz',deptos:dv}).id,ventas:v.id,sv:E.salaDeDepto(v.id)};
  });
  await p.click(EMP+' [data-tab="editar"]');await p.waitForTimeout(100);
  r.cumple(await p.isVisible(EMP+' [data-tab="agregar"]')&&await p.isVisible(EMP+' [data-tab="listo"]')&&(await p.$$(EMP+' .tab-ctl')).length===2&&await p.evaluate(function(){return document.activeElement.getAttribute('data-tab')==='listo'}),
    '«Editar» muestra los controles de cada módulo, «Agregar» y «Listo»');
  await revisar(p,r,'tablero al editar');
  await p.click(EMP+' [data-m="m-minegocio"] [data-t="antes"]');await p.waitForTimeout(150);
  r.igual(await guardados(p,'empresa'),'pagina:l | acciones:l','«Mover antes» lo sube y se guarda');
  r.cumple(await p.evaluate(function(){var a=document.activeElement;return !!a&&!!a.closest('[data-m="m-minegocio"]')}),'el foco se queda en el módulo que moviste');
  await p.selectOption(EMP+' [data-m="m-acciones"] .tab-tam','m');await p.waitForTimeout(150);
  r.cumple(await guardados(p,'empresa')==='pagina:l | acciones:m'&&await p.evaluate(function(){return document.querySelector('#iniTabEmp [data-m="m-acciones"]').classList.contains('tam-m')}),'el tamaño se cambia y se guarda');
  /* Agregar avisos y configurarlo */
  await p.click(EMP+' [data-tab="agregar"]');await p.waitForSelector('dialog.tab-dlg[open]');
  const cat=await p.$$eval('dialog.tab-dlg .tab-o b',function(e){return e.map(function(x){return x.textContent}).join(', ')});
  r.cumple(/Avisos/.test(cat)&&/Gráfica de una base/.test(cat)&&!/Nota/.test(cat),'el catálogo de la empresa ofrece avisos y gráficas (la nota es de cada quien)',cat);
  await revisar(p,r,'catálogo de módulos');
  await p.click('dialog.tab-dlg [data-tipo="avisos"]');await p.waitForSelector('dialog.tab-dlg[open] textarea[name="texto"]');
  await p.fill('dialog.tab-dlg textarea[name="texto"]','El lunes 1 no abrimos.\nInventario el sábado.');
  await revisar(p,r,'configurar avisos');
  await p.click('dialog.tab-dlg [type="submit"]');await p.waitForTimeout(200);
  r.cumple(/El lunes 1 no abrimos/.test(await p.textContent(EMP+' .tab-aviso'))&&(await guardados(p,'empresa'))==='pagina:l | acciones:m | avisos:l','al agregarlo pide su texto y se ve');
  /* Arrastrar */
  const avisos=await p.evaluate(function(){var m=AT.empresa.tablero('empresa');return m[2].id});
  /* (sin desplazar la página a mitad del arrastre: los tres módulos a la vista) */
  await p.setViewportSize({width:1280,height:2400});await p.waitForTimeout(100);
  await p.dragAndDrop(EMP+' [data-m="'+avisos+'"] .tab-mh h3',EMP+' [data-m="m-minegocio"] .tab-mh h3');await p.waitForTimeout(200);
  await p.setViewportSize({width:1280,height:900});
  r.igual(await guardados(p,'empresa'),'avisos:l | pagina:l | acciones:m','también se mueve arrastrando');
  /* Quitar */
  await p.click(EMP+' [data-m="m-acciones"] [data-t="quitar"]');await p.waitForTimeout(150);
  r.igual(await guardados(p,'empresa'),'avisos:l | pagina:l','«Quitar» lo saca del tablero');
  await p.click(EMP+' [data-tab="listo"]');await p.waitForTimeout(100);
  r.cumple(!(await p.$(EMP+' .tab-ctl'))&&await p.evaluate(function(){return document.activeElement.getAttribute('data-tab')==='editar'}),'«Listo» esconde los controles y el foco vuelve a «Editar»');
  await p.reload();await listo(p,800);
  r.igual(await modulos(p,EMP),'avisos:l | pagina:l','después de recargar, el tablero está como lo dejaste');

  /* ---------- Lo tuyo: una nota y una gráfica ---------- */
  await p.click(TUYO+' [data-tab="editar"]');await p.click(TUYO+' [data-tab="agregar"]');await p.waitForSelector('dialog.tab-dlg[open]');
  await p.click('dialog.tab-dlg [data-tipo="nota"]');await p.waitForTimeout(200);
  await p.click(TUYO+' [data-tab="listo"]');
  await p.fill(TUYO+' .tab-nota','Llamar al proveedor de clavos');await p.waitForTimeout(900);
  r.cumple(await p.evaluate(function(){return AT.empresa.tablero('persona').filter(function(x){return x.tipo==='nota'})[0].cfg.texto})==='Llamar al proveedor de clavos','la nota se guarda sola');
  /* Una base para la gráfica */
  await p.evaluate(function(){
    return AT.inventario.asegurar('',['productos','movimientos']).then(function(o){
      var B=AT.bases;return B.cargar(o.productos).then(function(){return Promise.all([
        B.guardarFila(B.nuevaFila(o.productos,{'p-nombre':'Clavos','p-cat':'Ferretería','p-ini':40})),
        B.guardarFila(B.nuevaFila(o.productos,{'p-nombre':'Martillo','p-cat':'Herramienta','p-ini':5})),
        B.guardarFila(B.nuevaFila(o.productos,{'p-nombre':'Pinzas','p-cat':'Herramienta','p-ini':3}))])});
    });
  });
  await p.click(TUYO+' [data-tab="editar"]');await p.click(TUYO+' [data-tab="agregar"]');await p.waitForSelector('dialog.tab-dlg[open]');
  await p.click('dialog.tab-dlg [data-tipo="grafica"]');await p.waitForSelector('dialog.tab-dlg[open] select[name="base"]');
  const prod=await p.evaluate(function(){return AT.inventario.ids().productos});
  await p.selectOption('dialog.tab-dlg select[name="base"]',prod);await p.waitForSelector('dialog.tab-dlg select[name="filas"]');
  await p.selectOption('dialog.tab-dlg select[name="filas"]','p-cat');await p.selectOption('dialog.tab-dlg select[name="periodo"]','todo');
  await revisar(p,r,'configurar una gráfica');
  await p.click('dialog.tab-dlg [type="submit"]');await p.waitForTimeout(500);
  await p.click(TUYO+' [data-tab="listo"]');
  await p.waitForFunction(function(){var x=document.querySelector('#iniTabTuyo [data-modulo="grafica"] .rep');return x&&/Herramienta/.test(x.textContent)},null,{timeout:8000});
  r.cumple(/Herramienta/.test(await p.textContent(TUYO+' [data-modulo="grafica"]'))&&/Ferretería/.test(await p.textContent(TUYO+' [data-modulo="grafica"]')),'la gráfica agrupa la base por la columna elegida');
  await revisar(p,r,'Inicio armado (escritorio)');

  /* ---------- Una página en una sala que no todos ven ---------- */
  await p.evaluate(function(i){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-metas',titulo:'Metas privadas',props:[],acceso:AT.datos.acceso.nueva('privado'),
    contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-met001'},content:[{type:'text',text:'Abrir otra sucursal.'}]}]}})},ids);
  await p.evaluate(function(){var m=AT.empresa.tablero('empresa');m.push({id:'m-metas',tipo:'pagina',tam:'m',cfg:{doc:'d-metas'}});AT.empresa.guardarTablero('empresa',m)});
  /* La portada de la sala de Ventas */
  await p.goto(base+'sala.html?id='+ids.sv);await listo(p,500);
  r.cumple(await p.isVisible('.sala-tab [data-tab="editar"]')&&/Arma la portada/.test(await p.textContent('.sala-tab')),'quien administra la sala ve su portada vacía, lista para armarse');
  await p.click('.sala-tab [data-tab="editar"]');await p.click('.sala-tab [data-tab="agregar"]');await p.waitForSelector('dialog.tab-dlg[open]');
  await p.click('dialog.tab-dlg [data-tipo="avisos"]');await p.waitForSelector('dialog.tab-dlg[open] textarea');
  await p.fill('dialog.tab-dlg textarea','Meta de la semana: 50 notas de venta.');await p.click('dialog.tab-dlg [type="submit"]');await p.waitForTimeout(200);
  await p.click('.sala-tab [data-tab="listo"]');
  r.igual(await guardados(p,'sala',ids.sv),'avisos:l','la portada de la sala se guarda en la sala');
  await revisar(p,r,'portada de una sala');

  /* ---------- Carlos (miembro) ---------- */
  await p.goto(base+'inicio.html');await listo(p,600);
  await entrarComo(p,ids.carlos);
  r.cumple(!(await p.$(EMP+' [data-tab="editar"]'))&&/El lunes 1 no abrimos/.test(await p.textContent(EMP)),'un miembro ve el tablero de la empresa, sin poder editarlo');
  r.cumple(await p.isHidden(EMP+' [data-m="m-metas"]'),'un módulo con una página que no puede ver no se le muestra');
  r.igual(await modulos(p,TUYO),'recientes:m | salas:s','su «Lo tuyo» es el suyo (no la nota ni la gráfica de Lupita)');
  r.cumple(await p.isVisible(TUYO+' [data-tab="editar"]'),'y lo puede armar');
  await p.goto(base+'sala.html?id='+ids.sv);await listo(p,500);
  r.cumple(/Meta de la semana/.test(await p.textContent('.sala-tab'))&&!(await p.$('.sala-tab [data-tab="editar"]')),'en la sala ve la portada, sin editarla');
  await p.goto(base+'sala.html?id=sa-general');await listo(p,500);
  r.cumple(await p.isHidden('.sala-tab'),'una portada vacía que no puede armar no se muestra');

  /* ---------- Respaldo ---------- */
  await p.goto(base+'inicio.html');await listo(p,500);
  await entrarComo(p,ids.lupita);
  const resp=await p.evaluate(function(){return AT.datos.exportar()});
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);
  const q=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await q.goto(base+'entrar.html');await listo(q);
  await Promise.all([q.waitForURL(/inicio\.html$/),q.setInputFiles('#enArchivo',{name:'respaldo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(resp))})]);await listo(q,800);
  r.cumple(await guardados(q,'empresa')==='avisos:l | pagina:l | pagina:m'&&/nota/.test(await guardados(q,'persona'))&&await guardados(q,'sala',ids.sv)==='avisos:l','el respaldo lleva los tableros: de la empresa, el tuyo y el de la sala');
  await revisar(q,r,'Inicio armado (celular)');
  await q.click(EMP+' [data-tab="editar"]');
  await revisar(q,r,'tablero al editar (celular)');
  r.cumple(q.errores.length===0,'sin errores en celular',q.errores);
  await cerrar(q);

  /* ---------- Variantes ---------- */
  for(const [nombre,aj,ancho] of [['oscuro',{tema:'dark'},1280],['alto contraste',{contraste:'high'},900],['oscuro y alto contraste ×1.5',{tema:'dark',contraste:'high',escala:1.5},390]]){
    /* (con ajustes guardados, entrar.html ya da el espacio por creado: se restaura antes de fijarlos) */
    const x=await pagina(browser,{ancho:ancho,alto:900,reducir:true,perfil:false});
    await x.goto(base+'entrar.html');await listo(x);
    await Promise.all([x.waitForURL(/inicio\.html$/),x.setInputFiles('#enArchivo',{name:'respaldo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(resp))})]);await listo(x,300);
    await x.evaluate(function(a){localStorage.setItem('aprende-tecnologia:ajustes',JSON.stringify(a))},aj);await x.reload();await listo(x,800);
    await revisar(x,r,'Inicio armado, '+nombre);
    await x.click(TUYO+' [data-tab="editar"]');await x.click(TUYO+' [data-tab="agregar"]');await x.waitForSelector('dialog.tab-dlg[open]');
    await revisar(x,r,'catálogo, '+nombre);
    await cerrar(x);
  }
});
