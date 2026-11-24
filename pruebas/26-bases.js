/* Fase F6: bases de datos y vistas. Una base vive aparte de las páginas (AT.datos.bases y filas). Clientes y ventas
   relacionadas: tipos de columna, fórmulas (#REF, #ERROR), relación, dato de la relación, suma de otra base, totales
   al pie, vistas guardadas (filtro, orden, agrupar con subtotal, tablero, galería, calendario), ficha con las filas
   relacionadas, deshacer y rehacer, CSV (exportar e importar con tipos), al leer, imprimir, duplicar, papelera,
   respaldo, plantillas (inventario y clientes) e importar un respaldo de Bases unificadas. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function nuevoDoc(p,base,tipo){
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(t){AT.crear.nuevo(t);return 1},tipo||'notas').catch(function(){return 1})]);await listo(p,600);
  await p.waitForSelector('.bd [data-acc="nuevaFila"], .ed-cuerpo',{timeout:8000});
}
async function esperarBd(p){await p.waitForSelector('.bd [data-bd-nombre]',{timeout:8000});await p.waitForTimeout(150)}
function foco(p){return p.evaluate(function(){var a=document.activeElement;return a.getAttribute('data-c')||a.getAttribute('data-acc')||a.getAttribute('name')||a.className||''})}
/* Columna nueva desde la tabla */
async function columna(p,datos){
  await p.click('.bd [data-acc="nuevaCol"]');await p.waitForSelector('dialog.bd-col[open]');
  await p.fill('dialog.bd-col [name="nombre"]',datos.nombre);
  await p.selectOption('dialog.bd-col [name="tipo"]',datos.tipo);
  if(datos.opciones)await p.fill('dialog.bd-col [name="opciones"]',datos.opciones.join('\n'));
  if(datos.base)await p.selectOption('dialog.bd-col [name="base"]',datos.base);
  if(datos.rel){await p.selectOption('dialog.bd-col [name="rel"]',datos.rel);await p.waitForTimeout(100);await p.selectOption('dialog.bd-col [name="campo"]',datos.campo)}
  if(datos.sbase){await p.selectOption('dialog.bd-col [name="sbase"]',datos.sbase);await p.waitForTimeout(100);await p.selectOption('dialog.bd-col [name="srel"]',datos.srel);await p.selectOption('dialog.bd-col [name="scampo"]',datos.scampo)}
  if(datos.expr!==undefined)await p.fill('dialog.bd-col [name="expr"]',datos.expr);
  if(datos.moneda)await p.check('dialog.bd-col [name="moneda"]');
  if(datos.pie)await p.selectOption('dialog.bd-col [name="pie"]',datos.pie);
  await p.click('dialog.bd-col [type="submit"]');await p.waitForTimeout(250);
}
/* Escribe en una celda (por columna y fila) y sale con Tab */
async function escribir(p,col,fid,valor){
  const s='.bd [data-c="'+col+'"][data-f="'+fid+'"]';
  const tag=await p.$eval(s,function(e){return e.tagName+(e.type?':'+e.type:'')});
  if(/^SELECT/.test(tag))await p.selectOption(s,{label:valor});
  else if(tag==='INPUT:checkbox'){if(valor)await p.check(s);else await p.uncheck(s)}
  else{await p.fill(s,valor);await p.press(s,'Tab')}
  await p.waitForTimeout(120);
}
async function nuevaFila(p,nombre){
  await p.click('.bd .bd-barra [data-acc="nuevaFila"]');await p.waitForTimeout(200);
  await p.keyboard.type(nombre);await p.keyboard.press('Tab');await p.waitForTimeout(150);
  return p.evaluate(function(n){var b=AT.bases.base(document.querySelector('.bd').getAttribute('data-bd'));return AT.bases.filas(b.id).filter(function(f){return f.v[b.columnas[0].id]===n})[0].id},nombre);
}
function base(p){return p.evaluate(function(){return document.querySelector('.bd').getAttribute('data-bd')})}
function colId(p,nombre){return p.evaluate(function(n){var b=AT.bases.base(document.querySelector('.bd').getAttribute('data-bd'));var c=AT.bases.colPorNombre(b,n);return c&&c.id},nombre)}
function celdaTexto(p,col,fid){return p.evaluate(function(a){var e=document.querySelector('.bd [data-calc="'+a[0]+'"][data-f="'+a[1]+'"]')||document.querySelector('.bd [data-c="'+a[0]+'"][data-f="'+a[1]+'"]');return e?(e.tagName==='SELECT'?e.options[e.selectedIndex].text:e.value!==undefined&&e.tagName!=='OUTPUT'?e.value:e.textContent):null},[col,fid])}
function totales(p){return p.evaluate(function(){return [].map.call(document.querySelectorAll('.bd tfoot [data-total]'),function(x){return x.textContent}).join(' | ')})}
function filasVisibles(p){return p.evaluate(function(){return [].map.call(document.querySelectorAll('.bd tbody tr[data-fila]'),function(tr){return tr.querySelector('.bd-tit').value})})}

prueba('Bases de datos y vistas',async function({browser,base:raiz,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  const errores=[];p.on('pageerror',function(e){errores.push(e.message)});

  /* ---------- Clientes (plantilla) ---------- */
  await nuevoDoc(p,raiz,'clientes');await esperarBd(p);
  const cli=await base(p);
  r.cumple(await p.evaluate(function(){var b=AT.docActual.contenido.content.filter(function(x){return x.type==='basedatos'})[0];return !!b.attrs.base&&!b.attrs.semilla})||await p.evaluate(function(){var n=null;AT.editorActual.tiptap.state.doc.forEach(function(x){if(x.type.name==='basedatos')n=x.attrs});return !!n.base&&!n.semilla}),
    'la plantilla «Clientes» crea su base al abrir la página y el bloque se queda con su id');
  r.igual(await p.$$eval('.bd [role="tab"]',function(e){return e.map(function(x){return x.textContent}).join(' | ')}),'Tabla | Tarjetas','con sus vistas: tabla y tarjetas');
  const lupita=await nuevaFila(p,'Abarrotes Lupita');
  const tel=await colId(p,'Teléfono');
  await escribir(p,tel,lupita,'55 1234 5678');
  const beto=await nuevaFila(p,'Don Beto');
  await escribir(p,tel,beto,'55 8765 4321');
  r.igual((await filasVisibles(p)).join(','),'Abarrotes Lupita,Don Beto','«+ Nueva» agrega filas, ordenadas por nombre');
  const docClientes=await p.evaluate(function(){return AT.docActual.id});

  /* ---------- Ventas: /base y columnas de cada tipo ---------- */
  await nuevoDoc(p,raiz,'notas');
  await p.click('.ed-cuerpo');await p.keyboard.type('/base');await p.waitForTimeout(200);
  r.igual(await p.textContent('.menu-barra .menu-i b'),'Base de datos','«/base» ofrece la base de datos');
  await p.keyboard.press('Enter');await esperarBd(p);await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){var a=document.activeElement;return a.hasAttribute('data-bd-nombre')&&a.selectionStart===0&&a.selectionEnd===a.value.length}),'la base nueva pone el foco en su nombre, seleccionado');
  await p.keyboard.type('Ventas');await p.keyboard.press('Tab');await p.waitForTimeout(200);
  const ven=await base(p);
  r.igual(await p.evaluate(function(id){return AT.bases.base(id).nombre},ven),'Ventas','el nombre de la base se guarda');
  await columna(p,{nombre:'Cliente',tipo:'relacion',base:cli});
  await columna(p,{nombre:'Teléfono del cliente',tipo:'referencia',rel:await colId(p,'Cliente'),campo:tel});
  await columna(p,{nombre:'Cantidad',tipo:'numero'});
  await columna(p,{nombre:'Precio',tipo:'moneda'});
  /* Una fórmula mal escrita no se guarda */
  await p.click('.bd [data-acc="nuevaCol"]');await p.waitForSelector('dialog.bd-col[open]');
  await p.fill('dialog.bd-col [name="nombre"]','Total');await p.selectOption('dialog.bd-col [name="tipo"]','formula');
  await p.fill('dialog.bd-col [name="expr"]','{Cantidad} *');
  r.cumple(/tiene un error/.test(await p.textContent('dialog.bd-col .bd-prev')),'la fórmula se revisa mientras la escribes');
  await p.click('dialog.bd-col [type="submit"]');await p.waitForTimeout(150);
  r.cumple(await p.isVisible('dialog.bd-col[open]')&&/tiene un error/.test(await p.textContent('dialog.bd-col [data-msg]')),'y una fórmula con error no se guarda');
  await p.fill('dialog.bd-col [name="expr"]','{Cantidad} * {Precio}');await p.check('dialog.bd-col [name="moneda"]');await p.selectOption('dialog.bd-col [name="pie"]','suma');
  await p.click('dialog.bd-col [type="submit"]');await p.waitForTimeout(250);
  await columna(p,{nombre:'Fecha',tipo:'fecha'});
  await columna(p,{nombre:'Estado',tipo:'seleccion',opciones:['Pendiente','Pagada']});
  await columna(p,{nombre:'Revisar',tipo:'formula',expr:'{No existe} * 2'});
  r.igual(await p.$$eval('.bd thead .bd-th[data-col]',function(e){return e.map(function(x){return x.firstChild.nextSibling.textContent}).join(',')}),'Nombre,Notas,Cliente,Teléfono del cliente,Cantidad,Precio,Total,Fecha,Estado,Revisar','las columnas se agregan en orden');
  const C={cli:await colId(p,'Cliente'),tel:await colId(p,'Teléfono del cliente'),cant:await colId(p,'Cantidad'),precio:await colId(p,'Precio'),total:await colId(p,'Total'),fecha:await colId(p,'Fecha'),estado:await colId(p,'Estado'),rev:await colId(p,'Revisar')};
  const filas=[['V-001','Abarrotes Lupita','3','18.50','2026-11-02','Pendiente'],['V-002','Don Beto','2','$100','2026-11-03','Pagada'],['V-003','Abarrotes Lupita','1','45','2026-11-05','Pagada']];
  const ids={};
  for(const f of filas){
    const id=await nuevaFila(p,f[0]);ids[f[0]]=id;
    await escribir(p,C.cli,id,f[1]);await escribir(p,C.cant,id,f[2]);await escribir(p,C.precio,id,f[3]);await escribir(p,C.fecha,id,f[4]);await escribir(p,C.estado,id,f[5]);
  }
  await p.waitForTimeout(300);
  r.igual(await celdaTexto(p,C.total,ids['V-001']),'$55.50','fórmula: 3 × $18.50 = $55.50, en pesos');
  r.igual(await celdaTexto(p,C.tel,ids['V-002']),'55 8765 4321','dato de la relación: el teléfono del cliente');
  r.cumple(await celdaTexto(p,C.rev,ids['V-001'])==='#REF'&&await p.evaluate(function(){return /ya no existe/.test(document.querySelector('.bd output.err').title)}),'una fórmula con una columna que no existe dice #REF y lo explica');
  r.igual(await celdaTexto(p,C.precio,ids['V-002']),'$100.00','la moneda se ve en pesos');
  r.igual(await totales(p),'$300.50','total al pie: la suma de lo que se ve');
  await revisar(p,r,'base de datos en escritorio');

  /* ---------- Vistas: filtro, orden, agrupar ---------- */
  await p.click('.bd [data-acc="vista"]');await p.waitForSelector('dialog.bd-vis[open]');
  await p.selectOption('dialog.bd-vis [name="fcol"]',C.estado);await p.selectOption('dialog.bd-vis [name="fop"]','igual');await p.fill('dialog.bd-vis [name="fval"]','pagada');
  await p.selectOption('dialog.bd-vis [name="scol"]',C.total);await p.selectOption('dialog.bd-vis [name="sdir"]','-1');
  await p.click('dialog.bd-vis [type="submit"]');await p.waitForTimeout(250);
  r.igual((await filasVisibles(p)).join(','),'V-002,V-003','filtro (Estado es igual a «pagada», sin importar mayúsculas) y orden por Total de mayor a menor');
  r.cumple(await totales(p)==='$245.00'&&/2 de 3 filas/.test(await p.textContent('.bd .bd-n'))&&/Filtro: Estado es igual a «pagada»/.test(await p.textContent('.bd .bd-res')),'el total respeta el filtro y la vista dice qué muestra',await totales(p));
  await p.fill('.bd [data-bd-buscar]','beto');await p.waitForTimeout(200);
  r.igual((await filasVisibles(p)).join(','),'V-002','la búsqueda busca en todas las columnas (también en la relación)');
  await p.fill('.bd [data-bd-buscar]','');await p.waitForTimeout(150);
  /* Una vista nueva, agrupada por cliente con subtotales */
  await p.click('.bd [data-acc="nuevaVista"]');await p.waitForSelector('dialog.bd-vis[open]');
  await p.fill('dialog.bd-vis [name="nombre"]','Por cliente');await p.selectOption('dialog.bd-vis [name="agrupar"]',C.cli);
  await p.click('dialog.bd-vis [type="submit"]');await p.waitForTimeout(250);
  const grupos=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.bd .bd-g'),function(g){return g.querySelector('.bd-grupo th').firstChild.textContent.trim()+' '+g.querySelectorAll('tr[data-fila]').length+' '+(g.querySelector('.bd-sub [data-total]')||{}).textContent}).join(' / ')});
  r.igual(grupos,'Abarrotes Lupita 2 $100.50 / Don Beto 1 $200.00','agrupar por cliente, con subtotal por grupo');
  r.igual(await p.$$eval('.bd [role="tab"]',function(e){return e.map(function(x){return x.textContent+(x.getAttribute('aria-selected')==='true'?'*':'')}).join(' | ')}),'Tabla | Por cliente*','la vista nueva queda como pestaña');
  await p.focus('.bd [role="tab"][aria-selected="true"]');await p.keyboard.press('ArrowLeft');
  r.cumple(await p.evaluate(function(){return document.activeElement.textContent==='Tabla'}),'las pestañas de vistas se recorren con flechas');
  /* Tablero por Estado */
  await p.click('.bd [data-acc="nuevaVista"]');await p.waitForSelector('dialog.bd-vis[open]');
  await p.fill('dialog.bd-vis [name="nombre"]','Tablero');await p.selectOption('dialog.bd-vis [name="tipo"]','tablero');await p.selectOption('dialog.bd-vis [name="agrupar"]',C.estado);
  await p.click('dialog.bd-vis [type="submit"]');await p.waitForTimeout(250);
  const carriles=function(){return p.evaluate(function(){return [].map.call(document.querySelectorAll('.bd .bd-carril'),function(c){return c.querySelector('.bd-carril-t').firstChild.textContent.trim()+':'+[].map.call(c.querySelectorAll('.bd-tar-t'),function(t){return t.textContent}).join('+')}).join(' / ')})};
  r.igual(await carriles(),'Pendiente:V-001 / Pagada:V-002+V-003','tablero por Estado');
  await p.selectOption('.bd .bd-tarjeta select[data-f="'+ids['V-001']+'"]','Pagada');await p.waitForTimeout(250);
  r.igual(await carriles(),'Pendiente: / Pagada:V-001+V-002+V-003','mover una tarjeta de carril cambia su Estado');
  await revisar(p,r,'tablero en escritorio');
  /* Calendario por Fecha */
  await p.click('.bd [data-acc="nuevaVista"]');await p.waitForSelector('dialog.bd-vis[open]');
  await p.fill('dialog.bd-vis [name="nombre"]','Calendario');await p.selectOption('dialog.bd-vis [name="tipo"]','calendario');
  await p.click('dialog.bd-vis [type="submit"]');await p.waitForTimeout(250);
  /* Hasta noviembre de 2026 */
  for(let i=0;i<24;i++){const t=await p.textContent('.bd .bd-cal-h b');if(t==='noviembre de 2026')break;await p.click('.bd [data-acc="'+(t>'2026'&&!/2026$/.test(t)?'mesAnt':'mesAnt')+'"]');await p.waitForTimeout(80)}
  r.cumple(await p.evaluate(function(){var d=[].filter.call(document.querySelectorAll('.bd .bd-dia.con'),function(x){return true}).map(function(x){return x.querySelector('.bd-dia-n').firstChild.textContent+':'+[].map.call(x.querySelectorAll('.bd-ev'),function(b){return b.textContent}).join('+')});return d.join(' ')==='2:V-001 3:V-002 5:V-003'}),'el calendario pone cada venta en su día');
  await revisar(p,r,'calendario en escritorio');
  /* Galería */
  await p.click('.bd [data-vista]:has-text("Tabla")');await p.waitForTimeout(150);

  /* ---------- Ficha y relacionadas ---------- */
  await p.click('.bd [data-ficha="'+ids['V-001']+'"]');await p.waitForSelector('dialog.bd-ficha[open]');
  r.igual(await p.textContent('dialog.bd-ficha h2'),'V-001','la ficha de una fila');
  await p.fill('dialog.bd-ficha [data-c="'+C.cant+'"]','4');await p.press('dialog.bd-ficha [data-c="'+C.cant+'"]','Tab');await p.waitForTimeout(250);
  r.igual(await p.textContent('dialog.bd-ficha [data-calc="'+C.total+'"]'),'$74.00','en la ficha se edita y se recalcula');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(id){return document.activeElement.getAttribute('data-ficha')===id},ids['V-001']),'al cerrar la ficha, el foco vuelve a su fila');
  r.igual(await totales(p),'$319.00','la tabla se actualiza con lo de la ficha');
  /* Deshacer y rehacer */
  await p.keyboard.press('Control+z');await p.waitForTimeout(300);
  r.igual(await totales(p),'$300.50','Ctrl+Z deshace el último cambio');
  await p.keyboard.press('Control+y');await p.waitForTimeout(300);
  r.igual(await totales(p),'$319.00','Ctrl+Y lo rehace');
  /* Eliminar una fila con «Deshacer» */
  await p.click('.bd [data-ficha="'+ids['V-003']+'"]');await p.waitForSelector('dialog.bd-ficha[open]');
  await p.click('dialog.bd-ficha [data-borrar]');await p.waitForTimeout(300);
  r.cumple((await filasVisibles(p)).indexOf('V-003')<0&&/Se eliminó la fila «V-003»/.test(await p.textContent('#avisoApp')),'eliminar una fila desde su ficha, con aviso');
  await p.click('#avisoApp .btn');await p.waitForTimeout(300);
  r.cumple((await filasVisibles(p)).indexOf('V-003')>=0,'«Deshacer» la regresa');

  /* ---------- Exportar CSV ---------- */
  const [csv]=await Promise.all([p.waitForEvent('download'),(async function(){await p.click('.bd [data-acc="mas"]');await p.click('.menu-i:has-text("Exportar CSV")')})()]);
  const txt=require('fs').readFileSync(await csv.path(),'utf8');
  r.cumple(/^﻿Nombre,Notas,Cliente,Teléfono del cliente,Cantidad,Precio,Total,Fecha,Estado,Revisar\r\n/.test(txt)&&/V-001,,Abarrotes Lupita,55 1234 5678,4,18\.5,74,2026-11-02,Pagada,#REF/.test(txt)&&csv.suggestedFilename()==='ventas.csv',
    'exportar CSV: lo que se ve, con números sin formato y fechas AAAA-MM-DD',txt.slice(0,200));

  /* ---------- Clientes: suma de otra base, relacionadas e importar CSV ---------- */
  await p.goto(raiz+'documento.html?id='+docClientes);await listo(p,500);await esperarBd(p);
  await columna(p,{nombre:'Compras',tipo:'suma',sbase:ven,srel:C.cli,scampo:C.total,moneda:true,pie:'suma'});
  const compras=await colId(p,'Compras');
  r.cumple(await celdaTexto(p,compras,lupita)==='$119.00'&&await celdaTexto(p,compras,beto)==='$200.00'&&await totales(p)==='$319.00','suma de otra base: lo que compró cada cliente');
  await p.click('.bd [data-ficha="'+lupita+'"]');await p.waitForSelector('dialog.bd-ficha[open]');await p.waitForTimeout(300);
  r.cumple(/Relacionadas/.test(await p.textContent('dialog.bd-ficha'))&&/Ventas\s*2/.test(await p.textContent('dialog.bd-ficha .bd-rel'))&&/V-001/.test(await p.textContent('dialog.bd-ficha .bd-rel')),'la ficha del cliente muestra sus ventas relacionadas');
  await p.keyboard.press('Escape');
  await p.click('.bd [data-acc="mas"]');await p.click('.menu-i:has-text("Importar CSV")');await p.waitForSelector('dialog.bd-csv[open]');
  await p.fill('dialog.bd-csv [data-texto]','Nombre,Teléfono,Saldo,Alta\n"Papelería Central, S.A.",555 111 2222,"$1,250.50",01/11/2026\nTaller Ruiz,,$80,15/11/2026\n');
  await p.click('dialog.bd-csv [data-pegar]');await p.waitForTimeout(400);
  const imp=await p.evaluate(function(id){var b=AT.bases.base(id),s=AT.bases.colPorNombre(b,'Saldo'),a=AT.bases.colPorNombre(b,'Alta'),f=AT.bases.filas(id).filter(function(x){return /Papeler/.test(x.v['c-nombre'])})[0];
    return {saldo:s&&s.tipo,alta:a&&a.tipo,v:f&&f.v[s.id],fecha:f&&f.v[a.id],n:AT.bases.filas(id).length,msg:document.querySelector('.bd .bd-msg').textContent}},cli);
  r.cumple(imp.saldo==='moneda'&&imp.alta==='fecha'&&imp.v===1250.5&&imp.fecha==='2026-11-01'&&imp.n===4&&/Se importaron 2 filas y 2 columnas nuevas/.test(imp.msg),'importar CSV: columnas nuevas con su tipo ($1,250.50 y día/mes/año) y las filas',imp);

  /* ---------- Al leer también se usa ---------- */
  await p.click('#docModo');await p.waitForSelector('.page .bd [data-bd-nombre]');await p.waitForTimeout(200);
  await escribir(p,tel,beto,'55 0000 0000');
  r.igual(await p.evaluate(function(a){return AT.bases.fila(a[0],a[1]).v[a[2]]},[cli,beto,tel]),'55 0000 0000','al leer, la base también se edita y se guarda');
  await revisar(p,r,'base de datos al leer');
  await p.reload();await listo(p,600);await p.waitForSelector('.bd tbody tr');
  r.igual(await celdaTexto(p,tel,beto),'55 0000 0000','se guarda en este dispositivo');

  /* ---------- Imprimir ---------- */
  const docVentas=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return (d.contenido.content||[]).some(function(b){return b.type==='basedatos'})&&d.tipo==='notas'})[0].id})});
  await p.goto(raiz+'imprimir.html?id='+docVentas);await p.waitForSelector('body[data-listo]',{timeout:20000});
  const im=await p.evaluate(function(){var t=document.querySelector('.pagedjs_page .bd-papel table');return t?{filas:t.querySelectorAll('tbody tr').length,cab:t.querySelector('thead').textContent,total:(t.querySelector('tfoot')||{}).textContent,n:t.querySelectorAll('input,select').length}:null});
  r.cumple(im&&im.filas===3&&/Total/.test(im.cab)&&/\$319\.00/.test(im.total)&&im.n===0,'al imprimir sale la vista como tabla, con su total y sin campos',im);

  /* ---------- Duplicar, respaldo y papelera ---------- */
  await p.goto(raiz+'documento.html?id='+docVentas);await listo(p,500);await esperarBd(p);
  await p.click('#docMas');
  await Promise.all([p.waitForURL(function(u){return /documento\.html/.test(u.href)&&u.href.indexOf(docVentas)<0}),p.click('.menu-i:has-text("Duplicar")')]);await listo(p,600);await esperarBd(p);
  const copia=await base(p);
  r.cumple(copia!==ven&&await p.evaluate(function(id){return AT.bases.filas(id).length===3},copia),'duplicar la página copia la base con sus filas');
  await escribir(p,C.cant,await p.evaluate(function(id){return AT.bases.filas(id)[0].id},copia),'99');
  r.cumple(await p.evaluate(function(id){return AT.datos.filas.deBase(id).then(function(l){return l.every(function(f){return f.v[Object.keys(f.v).filter(function(k){return f.v[k]===99})[0]]===undefined})})},ven),'cambiar la copia no toca la original');
  const resp=await p.evaluate(function(){return AT.datos.exportar().then(function(d){return {bases:d.bases.length,filas:d.filas.length}})});
  r.cumple(resp.bases>=3&&resp.filas>=10,'las bases y sus filas entran en el respaldo',resp);
  const docCopia=await p.evaluate(function(){return AT.docActual.id});
  await p.evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){return AT.datos.papelera.mover(d)}).then(function(){return AT.datos.papelera.eliminar(id)})},docCopia);
  r.cumple(await p.evaluate(function(id){return Promise.all([AT.datos.bases.leer(id),AT.datos.filas.deBase(id)]).then(function(r){return !r[0]&&!r[1].length})},copia),'borrar la página para siempre borra también su base y sus filas');
  await cerrar(p);

  /* ---------- Bases unificadas ---------- */
  const q=await pagina(browser,{ancho:390,alto:844,reducir:true,ajustes:{tema:'dark'}});
  await q.goto(raiz+'inicio.html');await listo(q);
  const bu={app:'bases-unificadas',formato:1,creado:'2026-11-01T00:00:00.000Z',state:{books:[{id:'b1',name:'Mi tienda',tables:[
    {id:'t_cli',name:'Clientes',cols:[{id:'c_nom',name:'Nombre',type:'text'},{id:'c_ciu',name:'Ciudad',type:'text'}],
      rows:[{id:'rc0',c:{c_nom:'Abarrotes La Ceiba',c_ciu:'Puebla'}},{id:'rc1',c:{c_nom:'Ferretería del Sur',c_ciu:'Guadalajara'}}]},
    {id:'t_ven',name:'Ventas',cols:[{id:'v_fol',name:'Folio',type:'text'},{id:'v_fec',name:'Fecha',type:'date'},{id:'v_cli',name:'Cliente',type:'relation',table:'t_cli'},
      {id:'v_ciu',name:'Ciudad',type:'lookup',rel:'v_cli',target:'c_ciu'},{id:'v_can',name:'Cantidad',type:'number'},{id:'v_pre',name:'Precio',type:'number'},
      {id:'v_tot',name:'Total',type:'formula',expr:'{Cantidad} * {Precio}',pie:'sum'},{id:'v_ok',name:'Pagada',type:'check',oculta:true}],
      rows:[{id:'rv0',c:{v_fol:'V-001',v_fec:'2026-11-02',v_cli:'rc0',v_can:12,v_pre:85}},{id:'rv1',c:{v_fol:'V-002',v_fec:'2026-11-03',v_cli:'rc1',v_can:-1,v_pre:1250,v_ok:true}}],
      vistas:[{id:'vv1',name:'Grandes',q:'',f:{col:'v_can',op:'gt',val:'5'},s:{col:'v_fol',dir:-1},s2:{col:'',dir:1}}]}]}]}};
  const res=await q.evaluate(function(d){return AT.datos.importar(d)},bu);
  r.cumple(res.basesUnificadas&&res.documentos===1&&res.bases===2&&res.filas===4,'un respaldo de Bases unificadas se importa: un libro, dos bases y cuatro filas',res);
  await q.goto(raiz+'documento.html?id='+res.primero);await listo(q,800);await q.waitForSelector('.bd tbody tr');
  const bdu=await q.evaluate(function(){
    var bs=[].map.call(document.querySelectorAll('.bd'),function(x){return AT.bases.base(x.getAttribute('data-bd'))}),v=bs[1],f=AT.bases.filas(v.id);
    return {titulo:AT.docActual.titulo,nombres:bs.map(function(b){return b.nombre}).join(','),cli:AT.bases.texto(v,f[0],AT.bases.col(v,'v_cli')),ciu:AT.bases.texto(v,f[0],AT.bases.col(v,'v_ciu')),
      tot:AT.bases.texto(v,f[1],AT.bases.col(v,'v_tot')),vistas:v.vistas.map(function(x){return x.nombre}).join(','),oculta:v.vistas[0].ocultas.join(),filtro:JSON.stringify(v.vistas[1].f),pie:AT.bases.col(v,'v_tot').pie};
  });
  r.cumple(bdu.titulo==='Mi tienda'&&bdu.nombres==='Clientes,Ventas'&&bdu.cli==='Abarrotes La Ceiba'&&bdu.ciu==='Puebla'&&bdu.tot==='−1,250'&&bdu.vistas==='Tabla,Grandes'&&bdu.oculta==='v_ok'&&bdu.filtro==='{"col":"v_can","op":"mayor","val":"5"}'&&bdu.pie==='suma',
    'el libro se abre como página: relaciones, datos de la relación, fórmulas, totales, columnas ocultas y vistas guardadas',bdu);
  r.cumple(await q.evaluate(function(){return !!document.querySelector('.bd .bd-calc.neg')}),'los negativos en rojo y con signo');
  await revisar(q,r,'Bases unificadas en celular (oscuro)');
  await q.click('.bd >> nth=1 >> [data-vista]:has-text("Grandes")');await q.waitForTimeout(200);
  await revisar(q,r,'vista filtrada en celular (oscuro)');

  /* Inventario: la plantilla con sus vistas y fórmulas */
  await nuevoDoc(q,raiz,'inventario');await esperarBd(q);
  const inv=await q.evaluate(function(){var b=AT.bases.base(document.querySelector('.bd').getAttribute('data-bd'));return {vistas:b.vistas.map(function(v){return v.nombre}).join(','),cols:b.columnas.map(function(c){return c.nombre}).join(',')}});
  r.cumple(inv.vistas==='Productos,Por surtir,Por categoría,Lista de precios'&&/Existencias,Mínimo,Por surtir,Estado,Valor,Ganancia por pieza/.test(inv.cols),'la plantilla «Inventario» trae sus columnas y sus vistas',inv);
  await revisar(q,r,'inventario en celular (oscuro)');
  await cerrar(q);

  if(errores.length)r.cumple(false,'sin errores de JavaScript',errores);
});
