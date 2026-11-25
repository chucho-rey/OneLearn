/* Bloques de la tienda (fase F4, negocio.js): corte de caja, fiado, gastos del mes con «Generar mes», nota de
   venta con folio, calculadora de precio de venta y cuentas por pagar. Cada uno se inserta con «/», calcula en
   centavos, se guarda, se ve al leer (ahí también se marcan las casillas y se anota el fiado), va al Markdown y
   se imprime. También: las plantillas de Crear, los folios en el respaldo y el color con significado. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}
async function nuevoDoc(p,base,tipo){
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(t){AT.crear.nuevo(t);return 1},tipo||'notas').catch(function(){return 1})]);await listo(p,400);
}
/* Escribe «/algo» al final del documento, revisa la primera opción y la elige */
async function insertar(p,r,orden,nombre,sel){
  /* Tiptap mueve el foco en el siguiente cuadro: hasta entonces, Enter caería en el botón que tenía el foco */
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});
  await p.waitForFunction(function(){var a=document.activeElement;return !!a&&a.classList.contains('ProseMirror')});
  await p.keyboard.press('Enter');
  await p.keyboard.type('/'+orden);await p.waitForTimeout(200);
  r.igual(await p.textContent('.menu-barra .menu-i b'),nombre,'«/'+orden+'» ofrece '+nombre);
  await p.keyboard.press('Enter');await p.waitForSelector(sel);await p.waitForTimeout(150);
}
function k(p,sel){return p.evaluate(function(s){return [].map.call(document.querySelectorAll(s+' .nb-k > div'),function(d){return d.querySelector('dt').textContent+': '+d.querySelector('dd').textContent}).join(' | ')},sel)}
function foco(p){return p.evaluate(function(){var a=document.activeElement;return a.getAttribute('data-k')||a.getAttribute('data-acc')||''})}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function dias(n){var d=new Date();d.setDate(d.getDate()+n);return iso(d)}
const HOY=iso(new Date()),MES=HOY.slice(0,7);
function mesSig(){var d=new Date();return iso(new Date(d.getFullYear(),d.getMonth()+1,1)).slice(0,7)}
function ultimoDia(m){return new Date(+m.slice(0,4),+m.slice(5,7),0).getDate()}
/* Los atributos del bloque: del editor si se está editando, si no del documento */
function bloque(p,tipo){return p.evaluate(function(t){
  var b=null,ed=AT.editorActual&&AT.editorActual.tiptap;
  if(ed&&!ed.isDestroyed)ed.state.doc.forEach(function(n){if(n.type.name===t)b=n.attrs});
  else (AT.docActual.contenido.content||[]).forEach(function(x){if(x.type===t)b=x.attrs});
  return b?JSON.parse(JSON.stringify(b)):null;
},tipo)}

prueba('Bloques de la tienda',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:390,alto:844,reducir:true});
  const errores=[];p.on('pageerror',function(e){errores.push(e.message)});
  await nuevoDoc(p,base);

  /* ---------- Corte de caja ---------- */
  await insertar(p,r,'corte','Corte de caja','.nb-ed.nb-corte');
  r.igual(await foco(p),'fondo','el cursor queda en el fondo inicial');
  const C='.nb-ed.nb-corte ';
  r.igual(await p.inputValue(C+'[data-k="fecha"]'),HOY,'el corte lleva la fecha de hoy');
  await p.fill(C+'[data-k="fondo"]','500');
  await p.fill(C+'[data-k="ventas.efectivo"]','3250.50');
  await p.fill(C+'[data-k="ventas.tarjeta"]','1,200');
  await p.click(C+'[data-acc="agregar"][data-lista="movs"]');
  r.igual(await foco(p),'movs.0.concepto','agregar una salida pone el cursor en su concepto');
  await p.keyboard.type('Pago al refresquero');
  await p.fill(C+'[data-k="movs.0.monto"]','$800');
  await p.fill(C+'[data-k="contado"]','2900');await p.waitForTimeout(150);
  let t=await k(p,'.nb-corte');
  r.igual(t,'Ventas del día: $4,450.50 | Efectivo esperado: $2,950.50 | Efectivo contado: $2,900.00 | Faltante: −$50.50','corte: ventas, esperado (fondo + efectivo − salidas), contado y faltante con signo');
  r.cumple(await p.evaluate(function(){var d=document.querySelector('.nb-corte .nb-mal .nb-d');return !!d&&d.classList.contains('neg')}),'el faltante va en rojo');
  /* Contar billetes y monedas */
  await p.check(C+'[data-k="modo"][value="billetes"]');await p.waitForSelector(C+'.nb-den');
  r.igual(await foco(p),'modo','al cambiar a billetes el foco se queda en la opción');
  await p.fill(C+'[data-k="billetes.d500"]','5');
  await p.fill(C+'[data-k="billetes.d200"]','2');
  await p.fill(C+'[data-k="billetes.d20"]','2');
  await p.fill(C+'[data-k="billetes.d050"]','3');await p.waitForTimeout(150);
  t=await k(p,'.nb-corte');
  r.cumple(/Efectivo contado: \$2,941\.50 \| Faltante: −\$9\.00/.test(t)&&(await p.textContent(C+'[data-sub="total"]'))==='$2,941.50'&&(await p.textContent(C+'[data-sub="d500"]'))==='$2,500.00',
    'contando billetes: 5 de $500, 2 de $200, 2 de $20 y 3 de 50¢ = $2,941.50',t);
  await p.fill(C+'[data-k="billetes.d10"]','1');await p.waitForTimeout(150);
  t=await k(p,'.nb-corte');
  r.cumple(/Sobrante: \+\$1\.00/.test(t)&&await p.evaluate(function(){return !!document.querySelector('.nb-corte .nb-bien .nb-d.pos')}),'un sobrante va con + y en verde',t);
  await p.fill(C+'[data-k="manana"]','500');await p.waitForTimeout(150);
  r.cumple(/te llevas \$2,451\.50/.test(await p.textContent(C+'.nb-res')),'con el fondo para mañana dice cuánto te llevas');
  await revisar(p,r,'corte de caja al editar en celular');

  /* ---------- Fiado ---------- */
  await insertar(p,r,'fiado','Fiado','.nb-ed.nb-fiado');
  const F='.nb-ed.nb-fiado ';
  r.igual(await foco(p),'agregar','el cursor queda en «Agregar cliente»');
  await p.keyboard.press('Enter');await p.waitForTimeout(100);
  r.igual(await foco(p),'clientes.0.nombre','Enter agrega un cliente y pone el cursor en su nombre');
  await p.keyboard.type('Doña Mary');
  await p.fill(F+'[data-k="clientes.0.telefono"]','55 1111 2222');
  await p.click(F+'[data-acc="cargo"][data-i="0"]');await p.waitForTimeout(100);
  r.cumple(await foco(p)==='clientes.0.apunte.monto'&&(await bloque(p,'fiado')).clientes[0].movs.length===0,'sin monto, «Se llevó» no anota nada y pide el monto');
  await p.fill(F+'[data-k="clientes.0.apunte.monto"]','350');await p.fill(F+'[data-k="clientes.0.apunte.concepto"]','Despensa');
  await p.click(F+'[data-acc="cargo"][data-i="0"]');await p.waitForTimeout(100);
  r.cumple(await foco(p)==='clientes.0.apunte.monto'&&await p.inputValue(F+'[data-k="clientes.0.apunte.monto"]')==='','al anotar, el monto se limpia y queda listo para el siguiente');
  await p.fill(F+'[data-k="clientes.0.apunte.monto"]','100');await p.click(F+'[data-acc="abono"][data-i="0"]');await p.waitForTimeout(100);
  await p.click(F+'[data-acc="agregar"][data-lista="clientes"]');await p.keyboard.type('Don Beto');
  await p.fill(F+'[data-k="clientes.1.apunte.monto"]','80.50');await p.click(F+'[data-acc="cargo"][data-i="1"]');await p.waitForTimeout(150);
  t=await k(p,'.nb-fiado');
  r.igual(t,'Te deben: $330.50 | Clientes con saldo: 2 | Fiado este mes: $430.50 | Abonado este mes: $100.00','fiado: lo que te deben, clientes con saldo y lo fiado y abonado este mes');
  r.igual(await p.textContent(F+'[data-saldo="0"]'),'$250.00','el saldo de cada cliente: lo fiado menos lo abonado');
  r.cumple(/23|\d/.test(await p.textContent(F+'.nb-movs li'))&&/Abonó/.test(await p.textContent(F+'.nb-movs li')),'los movimientos van del más nuevo al más viejo, con fecha');
  await revisar(p,r,'fiado al editar en celular');

  /* ---------- Gastos del mes ---------- */
  await insertar(p,r,'gastos','Gastos del mes','.nb-ed.nb-gastos');
  const G='.nb-ed.nb-gastos ';
  r.cumple(await p.evaluate(function(){var b=document.querySelector('.nb-gastos [data-acc="generar"]');return b.getAttribute('aria-disabled')==='true'}),'sin gastos fijos, «Generar mes» está desactivado');
  await p.click(G+'[data-acc="nuevoFijo"]');r.igual(await foco(p),'fijos.0.concepto','«Agregar gasto fijo» pone el cursor en su concepto');
  await p.keyboard.type('Renta del local');await p.fill(G+'[data-k="fijos.0.categoria"]','Renta');await p.fill(G+'[data-k="fijos.0.monto"]','6000');
  await p.fill(G+'[data-k="fijos.0.dia"]','31');
  await p.click(G+'[data-acc="nuevoFijo"]');await p.keyboard.type('Refrendo');await p.fill(G+'[data-k="fijos.1.monto"]','1200');
  await p.selectOption(G+'[data-k="fijos.1.cada"]','anual');await p.waitForSelector(G+'[data-k="fijos.1.mesAnual"]');
  await p.selectOption(G+'[data-k="fijos.1.mesAnual"]',String(+MES.slice(5,7)));await p.fill(G+'[data-k="fijos.1.dia"]','10');
  await p.click(G+'[data-acc="nuevoFijo"]');await p.keyboard.type('Pintar el local');await p.fill(G+'[data-k="fijos.2.monto"]','2500');
  await p.selectOption(G+'[data-k="fijos.2.cada"]','unica');await p.waitForSelector(G+'[data-k="fijos.2.fecha"]');
  await p.fill(G+'[data-k="fijos.2.fecha"]',mesSig()+'-15');
  await p.click(G+'[data-acc="generar"]');await p.waitForTimeout(150);
  let gs=await bloque(p,'gastos');
  r.cumple(/Se agregaron 2 gastos fijos/.test(await p.textContent(G+'.nb-aviso'))&&gs.filas.length===2&&gs.filas.every(function(f){return !f.pagado&&f.fijo}),
    '«Generar mes» agrega como pendientes los fijos que tocan este mes (la renta y el refrendo anual)',gs.filas);
  r.cumple(gs.filas.some(function(f){return f.concepto==='Renta del local'&&f.fecha===MES+'-'+ultimoDia(MES)&&f.monto==='6000'&&f.categoria==='Renta'}),'el día 31 se ajusta al último día del mes',gs.filas);
  await p.click(G+'[data-acc="generar"]');await p.waitForTimeout(150);
  r.cumple(/ya están en la lista/.test(await p.textContent(G+'.nb-aviso'))&&(await bloque(p,'gastos')).filas.length===2,'generar otra vez no repite los gastos del mes');
  await p.click(G+'[data-acc="nuevo"]');r.igual(await foco(p),'filas.2.concepto','«Agregar gasto» pone el cursor en su concepto');
  await p.keyboard.type('Luz');await p.fill(G+'[data-k="filas.2.categoria"]','Luz');await p.fill(G+'[data-k="filas.2.monto"]','850');await p.waitForTimeout(150);
  t=await k(p,'.nb-gastos');
  r.igual(t,'Gastos del mes: $8,050.00 | Pagado: $850.00 | Pendiente: $7,200.00 | Gastos: 3 (2 pendientes)','gastos: total del mes, pagado (lo que agregas a mano ya va pagado) y pendiente');
  r.igual(await p.$$eval(G+'.nb-cats li',function(l){return l.map(function(x){return x.querySelector('.nb-cat-n').textContent+' '+x.querySelector('.nb-cat-m').textContent}).join(' / ')}),
    'Renta $6,000.00 / Sin categoría $1,200.00 / Luz $850.00','y por categoría, de la mayor a la menor');
  await p.check(G+'[data-k="filas.0.pagado"]');await p.waitForTimeout(100);
  r.cumple(/Pagado: \$6,850\.00/.test(await k(p,'.nb-gastos'))&&/^\d{4}-\d{2}-\d{2}$/.test((await bloque(p,'gastos')).filas[0].pagado),'marcar un gasto como pagado guarda la fecha');
  /* El mes siguiente */
  await p.click(G+'[data-acc="mesSig"]');await p.waitForTimeout(100);
  r.cumple(/Sin gastos/.test(await p.textContent(G))&&(await bloque(p,'gastos')).mes===mesSig(),'«›» pasa al mes siguiente, todavía sin gastos');
  await p.click(G+'[data-acc="generar"]');await p.waitForTimeout(150);
  gs=await bloque(p,'gastos');
  const sig=gs.filas.filter(function(f){return f.fecha.slice(0,7)===mesSig()}).map(function(f){return f.concepto}).sort().join(',');
  r.igual(sig,'Pintar el local,Renta del local','el mes siguiente genera la renta y el gasto de una sola vez, no el anual');
  await p.click(G+'[data-acc="mesAnt"]');await p.waitForTimeout(100);
  await revisar(p,r,'gastos del mes al editar en celular');

  /* ---------- Nota de venta ---------- */
  await insertar(p,r,'venta','Nota de venta','.nb-ed.nb-venta');
  const V='.nb-ed.nb-venta ';
  r.cumple(await p.inputValue(V+'[data-k="folio"]')==='V-001'&&await p.inputValue(V+'[data-k="fecha"]')===HOY,'la nota lleva el folio V-001 y la fecha de hoy');
  r.igual(await foco(p),'conceptos.0.desc','el cursor queda en la descripción');
  await p.keyboard.type('Refresco 600 ml');
  await p.fill(V+'[data-k="conceptos.0.cant"]','3');await p.fill(V+'[data-k="conceptos.0.precio"]','18');
  await p.press(V+'[data-k="conceptos.0.precio"]','Enter');await p.waitForTimeout(100);
  r.igual(await foco(p),'conceptos.1.desc','Enter en el precio agrega otro concepto');
  await p.keyboard.type('Jamón (kg)');await p.fill(V+'[data-k="conceptos.1.cant"]','0.5');await p.fill(V+'[data-k="conceptos.1.precio"]','189.90');await p.waitForTimeout(100);
  r.igual(await p.textContent(V+'[data-imp="1"]'),'$94.95','cada concepto calcula su importe (medio kilo)');
  await p.fill(V+'[data-k="recibido"]','200');await p.waitForTimeout(100);
  const totales=function(){return p.$$eval(V+'.nb-totales tr',function(l){return l.map(function(x){return x.querySelector('th').textContent+' '+x.querySelector('td').textContent}).join(' | ')})};
  r.igual(await totales(),'Subtotal $148.95 | Total $148.95 | Recibido $200.00 | Cambio $51.05','sin IVA: subtotal, total y el cambio de lo recibido');
  await p.fill(V+'[data-k="descuento"]','8.95');await p.selectOption(V+'[data-k="iva"]','aparte');await p.waitForTimeout(100);
  r.igual(await totales(),'Subtotal $148.95 | Descuento −$8.95 | IVA (16 %) $22.40 | Total $162.40 | Recibido $200.00 | Cambio $37.60','con descuento y más IVA');
  await p.selectOption(V+'[data-k="iva"]','incluido');await p.fill(V+'[data-k="recibido"]','100');await p.waitForTimeout(100);
  r.igual(await totales(),'Subtotal $148.95 | Descuento −$8.95 | Total $140.00 | IVA incluido (16 %) $19.31 | Recibido $100.00 | Falta −$40.00','con IVA incluido lo desglosa; si no alcanza lo recibido, dice cuánto falta en rojo');
  await p.selectOption(V+'[data-k="pago"]','tarjeta');await p.waitForTimeout(100);
  r.cumple(!await p.$(V+'[data-k="recibido"]')&&!/Recibido/.test(await totales()),'con tarjeta no se pide lo recibido');
  await revisar(p,r,'nota de venta al editar en celular');

  /* ---------- Precio de venta ---------- */
  await insertar(p,r,'precio','Precio de venta','.nb-ed.nb-precio');
  const PR='.nb-ed.nb-precio ';
  r.igual(await foco(p),'costo','el cursor queda en el costo');
  r.cumple(/Escribe cuánto te cuesta/.test(await p.textContent(PR+'.nb-res')),'sin costo, lo pide');
  await p.keyboard.type('12.50');await p.fill(PR+'[data-k="titulo"]','Refresco 600 ml');await p.waitForTimeout(100);
  r.igual(await k(p,'.nb-precio'),'Precio de venta: $16.25 | Ganas por pieza: +$3.75 | Margen sobre el precio: 23.1 % | Ganancia sobre el costo: 30 %','con 30 % sobre el costo de $12.50, el precio es $16.25');
  await p.selectOption(PR+'[data-k="redondeo"]','100');await p.waitForTimeout(100);
  r.cumple(/^Precio de venta: \$17\.00 \| Ganas por pieza: \+\$4\.50/.test(await k(p,'.nb-precio')),'redondear a $1 sube el precio a $17 y la ganancia a $4.50',await k(p,'.nb-precio'));
  await p.fill(PR+'[data-k="comision"]','120');await p.waitForTimeout(100);
  r.cumple(/no hay precio que alcance/.test(await p.textContent(PR+'.nb-res')),'una comisión imposible se avisa');
  await p.fill(PR+'[data-k="comision"]','');await p.waitForTimeout(100);
  await revisar(p,r,'precio de venta al editar en celular');

  /* ---------- Cuentas por pagar ---------- */
  await insertar(p,r,'porpagar','Cuentas por pagar','.nb-ed.nb-porpagar');
  const PP='.nb-ed.nb-porpagar ';
  const cuentas=[['Bimbo','Nota 881','1200',dias(-3)],['Coca-Cola','Factura A-55','2,450.50',dias(2)],['Sabritas','Pedido semanal','900',dias(20)],['Bimbo','Nota 870','300',dias(-10)]];
  for(let i=0;i<cuentas.length;i++){
    await p.click(PP+'[data-acc="agregar"][data-lista="cuentas"]');
    if(i===0)r.igual(await foco(p),'cuentas.0.proveedor','«Agregar cuenta» pone el cursor en el proveedor');
    await p.keyboard.type(cuentas[i][0]);
    await p.fill(PP+'[data-k="cuentas.'+i+'.concepto"]',cuentas[i][1]);await p.fill(PP+'[data-k="cuentas.'+i+'.monto"]',cuentas[i][2]);
    await p.fill(PP+'[data-k="cuentas.'+i+'.vence"]',cuentas[i][3]);
  }
  await p.check(PP+'[data-k="cuentas.3.pagada"]');await p.waitForTimeout(150);
  r.igual(await k(p,'.nb-porpagar'),'Por pagar: $4,550.50 | Vencido: $1,200.00 | Vence esta semana: $2,450.50 | Pagado: $300.00','cuentas por pagar: el total, lo vencido, lo que vence esta semana y lo pagado');
  r.cumple(await p.evaluate(function(){var e=document.querySelectorAll('.nb-porpagar .nb-est');return /Vencida hace 3 días/.test(e[0].textContent)&&e[0].classList.contains('mal')&&/Vence en 2 días/.test(e[1].textContent)&&/Pagada el/.test(e[3].textContent)}),
    'cada cuenta dice si ya venció (en rojo), cuándo vence o cuándo se pagó');
  r.cumple(/Por proveedor: Coca-Cola \$2,450\.50 · Bimbo \$1,200\.00 · Sabritas \$900\.00/.test(await p.textContent(PP+'.nb-res')),'y lo que se debe a cada proveedor');
  await revisar(p,r,'cuentas por pagar al editar en celular');

  /* ---------- Se guarda; al leer también se anota y se marca ---------- */
  await esperarGuardado(p);
  await p.click('#docModo');await p.waitForSelector('.nb-leer.nb-porpagar');
  r.cumple(await p.evaluate(function(){return ['corte','fiado','gastos','venta','precio','porpagar'].every(function(t){return !!document.querySelector('.nb-leer.nb-'+t)})}),'al leer se ven los seis bloques');
  r.igual(await p.$$eval('.nb-leer.nb-fiado .nb-cli-t > span',function(l){return l.map(function(x){return x.firstChild.textContent}).join(',')}),'Doña Mary,Don Beto','al leer, el fiado va de quien más debe a quien menos');
  await p.fill('.nb-leer.nb-fiado [data-k="clientes.0.apunte.monto"]','50');await p.click('.nb-leer.nb-fiado [data-acc="abono"][data-i="0"]');await p.waitForTimeout(150);
  r.cumple(/Debe \$200\.00/.test(await p.textContent('.nb-leer.nb-fiado'))&&/Te deben: \$280\.50/.test(await k(p,'.nb-leer.nb-fiado')),'al leer también se anota un abono');
  r.igual(await foco(p),'clientes.0.apunte.monto','y el foco vuelve al monto');
  await p.check('.nb-leer.nb-gastos [data-k="filas.1.pagado"]');await p.waitForTimeout(100);
  r.cumple(/Pendiente: \$0\.00/.test(await k(p,'.nb-leer.nb-gastos')),'al leer se marca un gasto como pagado',await k(p,'.nb-leer.nb-gastos'));
  await p.check('.nb-leer.nb-porpagar [data-k="cuentas.0.pagada"]');await p.waitForTimeout(100);
  r.cumple(/Vencido: \$0\.00/.test(await k(p,'.nb-leer.nb-porpagar')),'al leer se marca una cuenta como pagada');
  const recibo=await p.evaluate(function(){var v=document.querySelector('.nb-leer.nb-venta');return {folio:v.querySelector('.nv-folio b').textContent,filas:v.querySelectorAll('tbody tr').length-v.querySelectorAll('.nb-totales tr').length,legal:/no es un comprobante fiscal/.test(v.textContent),pago:/Forma de pago: Tarjeta/.test(v.textContent)}});
  r.cumple(recibo.folio==='V-001'&&recibo.filas===2&&recibo.legal&&recibo.pago,'la nota de venta se lee como recibo: folio, conceptos, forma de pago y que no es factura',recibo);
  await esperarGuardado(p);
  await revisar(p,r,'bloques de la tienda al leer en celular');
  await p.reload();await listo(p,500);
  const g=await p.evaluate(function(){var o={};AT.docActual.contenido.content.forEach(function(b){if(b.attrs&&b.type!=='paragraph')o[b.type]=b.attrs});return o});
  r.cumple(g.corte.modo==='billetes'&&g.corte.billetes.d500==='5'&&g.fiado.clientes[0].movs.length===3&&g.gastos.filas.length===5&&g.gastos.filas[1].pagado&&g.venta.conceptos.length===2&&
    g.precio.titulo==='Refresco 600 ml'&&g.porpagar.cuentas[0].pagada===HOY,'todo se guarda: lo escrito al editar y lo anotado al leer',{fiado:g.fiado&&g.fiado.clientes[0].movs.length,gastos:g.gastos&&g.gastos.filas.length});
  const md=await p.evaluate(function(){return AT.documentoMarkdown(AT.docActual)});
  r.cumple(/\*\*Corte de caja · /.test(md)&&/Sobrante: \+\$1\.00/.test(md)&&/- Doña Mary \(55 1111 2222\): Debe \$200\.00/.test(md)&&/- \[x\] .*Renta del local \(Renta\) · \$6,000\.00/.test(md)&&
    /\*\*Nota de venta V-001\*\*/.test(md)&&/\| 0\.5 \| Jamón \(kg\) \| \$189\.90 \| \$94\.95 \|/.test(md)&&/Ganancia por pieza: \+\$4\.50/.test(md)&&/- \[x\] Bimbo · Nota 881/.test(md),
    'el Markdown lleva los seis bloques',md.slice(0,600));
  const busca=await p.evaluate(function(){return AT.bloques.texto(AT.docActual)});
  r.cumple(/Doña Mary/.test(busca)&&/Refresco 600 ml/.test(busca)&&/Coca-Cola/.test(busca),'su texto entra en la búsqueda');
  const doc=await p.evaluate(function(){return AT.docActual});

  /* ---------- Imprimir ---------- */
  await p.goto(base+'imprimir.html?id='+doc.id);await p.waitForSelector('body[data-listo]',{timeout:20000});
  const im=await p.evaluate(function(){
    var q=function(s){return document.querySelector('.pagedjs_page '+s)};
    return {bloques:['corte','fiado','gastos','venta','precio','porpagar'].filter(function(t){return !!q('.nb-'+t)}).length,
      neg:getComputedStyle(q('.nb-d.neg')||document.body).color,editable:!!q('.nb-apunte'),marcables:[].some.call(document.querySelectorAll('.pagedjs_page .nb input[type="checkbox"]'),function(x){return !x.disabled})};
  });
  r.cumple(im.bloques===6&&!im.editable&&!im.marcables&&/rgb\(170, 0, 0\)/.test(im.neg),'al imprimir salen los seis bloques, sin campos para anotar y lo negativo en rojo',im);
  await cerrar(p);

  /* ---------- Variantes de lectura y escritorio ---------- */
  for(const [ancho,aj] of [[390,{tema:'dark',contraste:'high',escala:1.5,fuente:'opendyslexic'}],[1280,{tema:'dark'}],[1280,{contraste:'high'}]]){
    const q=await pagina(browser,{ancho:ancho,ajustes:aj,reducir:true});
    await q.goto(base+'inicio.html');await listo(q);
    await q.evaluate(function(x){x=JSON.parse(JSON.stringify(x));delete x.acceso;return AT.datos.documentos.guardar(x,{conservarFecha:true}).then(function(){return 1})},doc);
    await q.goto(base+'documento.html?id='+doc.id);await listo(q,500);
    const modo=await q.textContent('#docModo');
    await revisar(q,r,'tienda '+ancho+'px '+JSON.stringify(aj)+' ('+(/Editar/.test(modo)?'leer':'editar')+')');
    await q.click('#docModo');await q.waitForSelector('.nb');await q.waitForTimeout(200);
    await revisar(q,r,'tienda '+ancho+'px '+JSON.stringify(aj)+' ('+(/Editar/.test(modo)?'editar':'leer')+')');
    await cerrar(q);
  }

  /* ---------- Plantillas, folios en el respaldo y el nombre del negocio en la nota ---------- */
  const n=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'negocio',modulos:['negocio'],nombre:'',negocio:{nombre:'Abarrotes Lupita',giro:'tienda',telefono:'55 1234 5678'},creado:'2026-01-01'}});
  await n.goto(base+'inicio.html');await listo(n);
  const pl=await n.evaluate(function(){
    var o={};
    ['corte','fiado','gastos','venta','precio','proveedores'].forEach(function(t){var d=AT.crear.armar(t);o[t]={titulo:d.titulo,bloques:d.contenido.content.map(function(b){return b.type}).filter(function(x){return x!=='paragraph'}).join(',')}});
    o.folio=AT.crear.armar('venta').contenido.content[0].attrs.folio;
    return o;
  });
  r.cumple(pl.corte.bloques==='corte'&&pl.fiado.bloques==='fiado'&&pl.gastos.bloques==='gastos'&&pl.venta.bloques==='venta'&&pl.precio.bloques==='precio'&&pl.proveedores.bloques==='table,heading,porpagar'&&
    pl.venta.titulo==='Nota de venta V-001'&&pl.folio==='V-002','las plantillas de Crear traen sus bloques; cada nota de venta lleva su folio',pl);
  const resp=await n.evaluate(function(){return AT.datos.exportar().then(function(d){return d.folios})});
  r.cumple(resp&&resp.V===2,'los folios entran en el respaldo',resp);
  r.cumple(await n.evaluate(function(){return AT.datos.importar({app:'OneBook',formato:1,folios:{V:40,X:'nada',v:3}}).then(function(){return JSON.parse(localStorage.getItem('aprende-tecnologia:folios'))})}).then(function(f){return f.V===40&&!('v' in f)&&!('X' in f)}),
    'al restaurar un respaldo se queda el folio más alto (y solo prefijos válidos)');
  await Promise.all([n.waitForURL(/documento\.html/),n.evaluate(function(){AT.crear.nuevo('venta');return 1}).catch(function(){return 1})]);await listo(n,500);
  r.cumple(await n.inputValue('.nb-venta [data-k="folio"]')==='V-041','después de restaurar, la siguiente nota sigue desde el folio más alto');
  await n.fill('.nb-venta [data-k="conceptos.0.desc"]','Garrafón');await n.fill('.nb-venta [data-k="conceptos.0.precio"]','45');await esperarGuardado(n);
  await n.click('#docModo');await n.waitForSelector('.nb-leer.nb-venta');
  r.cumple(/Abarrotes Lupita/.test(await n.textContent('.nv-neg'))&&/Tel\. 55 1234 5678/.test(await n.textContent('.nv-neg')),'el recibo lleva el nombre y el teléfono del negocio');
  await revisar(n,r,'nota de venta al leer en escritorio');
  await n.click('#docModo');await n.waitForSelector('.nb-ed.nb-venta');
  await insertar(n,r,'venta','Nota de venta','.nb-ed.nb-venta >> nth=1');
  r.igual(await n.inputValue('.nb-ed.nb-venta >> nth=1 >> [data-k="folio"]'),'V-042','una nota insertada con «/» lleva el folio que sigue');
  await cerrar(n);

  /* Sin el módulo de negocio, «/» no ofrece los bloques de la tienda */
  const e=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'negocio',modulos:[],nombre:'',negocio:{nombre:'',giro:'otro',telefono:''},creado:'2026-01-01'}});
  await nuevoDoc(e,base);
  await e.click('.ed-cuerpo');await e.keyboard.type('/corte');await e.waitForTimeout(200);
  r.cumple(!/Corte de caja/.test(await e.evaluate(function(){var m=document.querySelector('.menu-barra');return m?m.textContent:''})),'sin el módulo de negocio, «/corte» no ofrece el corte de caja');
  await cerrar(e);

  if(errores.length)r.cumple(false,'sin errores de JavaScript',errores);
});
