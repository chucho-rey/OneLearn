/* Fase F7a: inventario conectado. Fórmulas con comparaciones y SI; la plantilla Inventario con su resumen y las
   bases de Productos y de Entradas y salidas (una sola vez por espacio: otra página habla de las mismas); existencias,
   por surtir, estado y valor que se calculan solos; «Registrar entrada» (actualiza el costo); la nota de venta que
   sugiere productos, toma el precio, dice cuántos quedan y descuenta al guardarse (cambiar, quitar, papelera y
   recuperar); «Hacer pedido» por proveedor; lista de precios; leer e imprimir; respaldo; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function nuevoDoc(p,base,tipo){
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(t){AT.crear.nuevo(t);return 1},tipo).catch(function(){return 1})]);await listo(p,600);
}
function ids(p){return p.evaluate(function(){return AT.inventario.buscar()})}
function prods(p){return p.evaluate(function(){return AT.inventario.cargar().then(function(){var o={};AT.inventario.productos().forEach(function(x){o[x.nombre]=x});return o})})}
function movs(p){return p.evaluate(function(){return AT.inventario.buscar().then(function(ids){return AT.bases.cargar(ids.movimientos).then(function(b){return AT.bases.filas(b.id).map(function(f){return f.v})})})})}
/* Una factura de ejemplo (CFDI 4.0): un producto que ya existe (por código), uno nuevo y un flete */
const XML='<?xml version="1.0" encoding="UTF-8"?>'+
  '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="4.0" Serie="A" Folio="7781" Fecha="2026-11-20T10:15:00" '+
  'SubTotal="900.00" Descuento="10.00" Total="1032.40" Moneda="MXN" TipoDeComprobante="I" MetodoPago="PPD" CondicionesDePago="15 días" Exportacion="01" LugarExpedicion="97000">'+
  '<cfdi:Emisor Rfc="GDI010101AB1" Nombre="Gepp Distribuidora" RegimenFiscal="601"/>'+
  '<cfdi:Receptor Rfc="XAXX010101000" Nombre="Mi tienda" DomicilioFiscalReceptor="97000" RegimenFiscalReceptor="612" UsoCFDI="G01"/>'+
  '<cfdi:Conceptos>'+
  '<cfdi:Concepto ClaveProdServ="50192100" NoIdentificacion="750200" Cantidad="24" ClaveUnidad="H87" Unidad="Pieza" Descripcion="SABRITAS SAL 45G" ValorUnitario="10.00" Importe="240.00" Descuento="12.00" ObjetoImp="02"/>'+
  '<cfdi:Concepto ClaveProdServ="50202301" NoIdentificacion="750900" Cantidad="48" ClaveUnidad="H87" Unidad="Pieza" Descripcion="AGUA NATURAL 1L" ValorUnitario="6.00" Importe="288.00" ObjetoImp="02"/>'+
  '<cfdi:Concepto ClaveProdServ="78101800" Cantidad="1" ClaveUnidad="E48" Descripcion="FLETE" ValorUnitario="372.00" Importe="372.00" ObjetoImp="02"/>'+
  '</cfdi:Conceptos><cfdi:Impuestos TotalImpuestosTrasladados="142.40"/>'+
  '<cfdi:Complemento><tfd:TimbreFiscalDigital Version="1.1" UUID="aaaa1111-2222-3333-4444-555566667777" FechaTimbrado="2026-11-20T10:16:00"/></cfdi:Complemento>'+
  '</cfdi:Comprobante>';
async function esperar(p,fn,arg,ms){
  const fin=Date.now()+(ms||4000);
  for(;;){const v=await p.evaluate(fn,arg);if(v||Date.now()>fin)return v;await p.waitForTimeout(100)}
}

prueba('Inventario conectado',async function({browser,base,r}){
  /* Motor de fórmulas: comparaciones, texto y funciones */
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  const fx=await p.evaluate(function(){
    var B=AT.bases,b={id:'x',columnas:[{id:'n',nombre:'Nombre',tipo:'texto'},{id:'t',nombre:'Tipo',tipo:'seleccion'},{id:'c',nombre:'Cantidad',tipo:'numero'},{id:'v',nombre:'Vence',tipo:'fecha'}]};
    var f={id:'f',v:{n:'Agua',t:'Salida',c:5,v:'2000-01-01'}},o={};
    ['{Cantidad} + {Cantidad} + {Cantidad}','SI({Tipo} = "entrada"; {Cantidad}; -{Cantidad})','SI({Cantidad} >= 5; "Mucho"; "Poco")','MAX(2 - {Cantidad}; 0)','REDONDEAR(10 / 3; 2)',
     'DIAS({Vence}) < 0','{Nombre} & " x" & {Cantidad}','Y({Cantidad} > 1; {Tipo} <> "Venta")','SI(1;2','{Nombre} * 2'].forEach(function(ex){
      var fn=B.compilar(ex);o[ex]=fn?B.valor(b,f,{id:'z',nombre:'Z',tipo:'formula',expr:ex}):'sintaxis';
    });
    o.tipoTexto=B.tipoVisto(b,{tipo:'formula',expr:'SI({Cantidad} > 1; "a"; "b")'});
    return o;
  });
  r.cumple(fx['{Cantidad} + {Cantidad} + {Cantidad}']===15,'tres términos seguidos se suman (antes se ciclaba)',fx);
  r.cumple(fx['SI({Tipo} = "entrada"; {Cantidad}; -{Cantidad})']===-5&&fx['SI({Cantidad} >= 5; "Mucho"; "Poco")']==='Mucho','SI compara sin importar mayúsculas y da números o texto',fx);
  r.cumple(fx['MAX(2 - {Cantidad}; 0)']===0&&fx['REDONDEAR(10 / 3; 2)']===3.33&&fx['DIAS({Vence}) < 0']===true,'MAX, REDONDEAR y DIAS',fx);
  r.cumple(fx['{Nombre} & " x" & {Cantidad}']==='Agua x5'&&fx['Y({Cantidad} > 1; {Tipo} <> "Venta")']===true,'& une textos; Y y <> funcionan',fx);
  r.cumple(fx['SI(1;2']==='sintaxis'&&fx['{Nombre} * 2']==='#ERROR'&&fx.tipoTexto==='texto','errores de sintaxis y de tipo; una fórmula de texto se ve como texto',fx);

  /* La plantilla Inventario crea sus bases una sola vez */
  await nuevoDoc(p,base,'inventario');
  await p.waitForFunction(function(){return document.querySelectorAll('.bd[data-bd]').length===3},null,{timeout:8000});
  const id1=await ids(p);
  r.cumple(id1.productos&&id1.movimientos&&id1.compras,'la plantilla crea Productos, Entradas y salidas y Compras',id1);
  const nombres=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.bd .bd-nombre'),function(e){return e.value}).join(' | ')});
  r.igual(nombres,'Productos | Entradas y salidas | Compras','la página muestra las tres bases');
  r.cumple(await p.isVisible('.nb-inventario [data-inv-resumen]'),'trae el resumen del inventario');
  const docInv=await p.evaluate(function(){return AT.docActual.id});

  /* Productos */
  await p.evaluate(function(){
    var ids=AT.inventario.ids(),B=AT.bases,b=B.base(ids.productos);
    var l=[['Coca-Cola 600 ml','750105','Bebidas','Gepp',12,18,24,12],['Sabritas sal','750200','Botanas','Sabritas',10,17,5,10],['Jabón en barra','','Limpieza','',8,14,0,3]];
    return B.guardarFilas(l.map(function(x,i){var f=B.nuevaFila(b.id,{'p-nombre':x[0],'p-codigo':x[1]||undefined,'p-cat':x[2],'p-prov':x[3]||undefined,'p-costo':x[4],'p-precio':x[5],'p-ini':x[6],'p-min':x[7]});f.orden=i+1;return f}));
  });
  await p.waitForTimeout(400);
  let pr=await prods(p);
  r.cumple(pr['Coca-Cola 600 ml'].existencias===24&&pr['Coca-Cola 600 ml'].estado==='Bien'&&pr['Coca-Cola 600 ml'].valor===288,'existencias, estado y valor se calculan solos',pr['Coca-Cola 600 ml']);
  r.cumple(pr['Sabritas sal'].estado==='Bajo'&&pr['Sabritas sal'].falta===5&&pr['Jabón en barra'].estado==='Agotado'&&pr['Jabón en barra'].falta===3,'«Bajo», «Agotado» y «Por surtir»',[pr['Sabritas sal'],pr['Jabón en barra']]);
  const res=await p.evaluate(function(){var e=document.querySelector('[data-inv-resumen]');return {k:[].map.call(e.querySelectorAll('.inv-k > div'),function(d){return d.querySelector('dt').textContent+': '+d.querySelector('dd').textContent}).join(' | '),
    grupos:[].map.call(e.querySelectorAll('.inv-gh b'),function(b){return b.textContent}).join(','),botones:e.querySelectorAll('[data-acc="pedido"]').length}});
  r.cumple(/Productos: 3/.test(res.k)&&/Valor del inventario: \$338\.00/.test(res.k)&&/Bajo el mínimo: 1/.test(res.k)&&/Agotados: 1/.test(res.k),'el resumen da productos, valor, bajos y agotados',res);
  r.cumple(res.grupos==='Sabritas,Sin proveedor'&&res.botones===2,'lo que hay que surtir, por proveedor, con «Hacer pedido»',res);
  const estadoCelda=await p.evaluate(function(){var o=document.querySelector('.bd [data-calc="p-estado"]');return o&&!o.classList.contains('bd-num')});
  r.cumple(estadoCelda,'la columna «Estado» (fórmula de texto) no se alinea como número');

  /* Registrar entrada: suma existencias y actualiza el costo */
  await p.click('[data-inv-resumen] [data-acc="entrada"]');await p.waitForSelector('dialog.inv-dlg[open]');
  await p.selectOption('dialog.inv-dlg [name="prod"]',{label:'Sabritas sal (quedan 5)'});
  r.igual(await p.inputValue('dialog.inv-dlg [name="costo"]'),'10','el costo del producto se propone');
  await p.fill('dialog.inv-dlg [name="cant"]','10');await p.fill('dialog.inv-dlg [name="costo"]','11');
  await p.click('dialog.inv-dlg [type="submit"]');await p.waitForTimeout(500);
  pr=await prods(p);
  r.cumple(pr['Sabritas sal'].existencias===15&&pr['Sabritas sal'].costo===11&&pr['Sabritas sal'].estado==='Bien','«Registrar entrada» suma las piezas y deja el costo nuevo',pr['Sabritas sal']);
  const ent=(await movs(p)).filter(function(m){return m['m-tipo']==='Entrada'});
  r.cumple(ent.length===1&&ent[0]['m-cant']===10&&ent[0]['m-pu']===11,'la entrada queda en «Entradas y salidas»',ent);
  r.cumple(!await p.$('dialog.inv-dlg'),'la ventana se cierra');

  /* Otra página Inventario muestra las mismas bases */
  await nuevoDoc(p,base,'inventario');
  await p.waitForFunction(function(){return document.querySelectorAll('.bd[data-bd]').length===3},null,{timeout:8000});
  const otra=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.bd[data-bd]'),function(e){return e.getAttribute('data-bd')})});
  r.cumple(otra[0]===id1.productos&&otra[1]===id1.movimientos&&otra[2]===id1.compras,'otra página Inventario habla de las mismas bases',otra);
  r.cumple((await p.evaluate(function(){return AT.datos.bases.todos().then(function(l){return l.filter(function(b){return b.rol}).length})}))===3,'no se duplican las bases');

  /* Nota de venta: sugiere productos, toma el precio y descuenta */
  await nuevoDoc(p,base,'venta');
  await p.waitForSelector('[data-k="conceptos.0.desc"]');
  r.cumple(await p.evaluate(function(){var e=document.querySelector('[data-k="conceptos.0.desc"]');return e.getAttribute('list')==='invProductos'&&document.querySelectorAll('#invProductos option').length===3}),'la descripción sugiere tus productos');
  await p.fill('[data-k="conceptos.0.desc"]','coca-cola 600 ML');await p.waitForTimeout(150);
  r.igual(await p.inputValue('[data-k="conceptos.0.precio"]'),'18','al escribir un producto toma su precio');
  r.cumple(/Quedan 24/.test(await p.textContent('[data-stock="0"]')),'dice cuántos quedan',await p.textContent('[data-stock="0"]'));
  await p.fill('[data-k="conceptos.0.cant"]','3');await p.press('[data-k="conceptos.0.cant"]','Tab');
  const docVenta=await p.evaluate(function(){return AT.docActual.id});
  let ok=await esperar(p,function(){return AT.inventario.cargar().then(function(){var x=AT.inventario.productos().filter(function(q){return q.nombre==='Coca-Cola 600 ml'})[0];return x.existencias===21})});
  r.cumple(ok,'al guardarse la nota, las existencias bajan');
  let v=(await movs(p)).filter(function(m){return m['m-tipo']==='Venta'});
  r.cumple(v.length===1&&v[0]['m-cant']===3&&/^Venta V-/.test(v[0]['m-con'])&&v[0]['m-pu']===18&&v[0]['m-origen'].indexOf('venta:'+docVenta+':')===0,'la venta queda como movimiento con su folio y su origen',v);
  await p.fill('[data-k="conceptos.0.cant"]','5');await p.press('[data-k="conceptos.0.cant"]','Tab');
  ok=await esperar(p,function(){return AT.inventario.cargar().then(function(){return AT.inventario.productos().filter(function(q){return q.nombre==='Coca-Cola 600 ml'})[0].existencias===19})});
  r.cumple(ok,'cambiar la cantidad cambia el movimiento (no se duplica)');
  r.igual((await movs(p)).filter(function(m){return m['m-tipo']==='Venta'}).length,1,'sigue habiendo un solo movimiento de esa venta');
  await p.click('.nb-venta [data-acc="agregar"]');await p.waitForTimeout(200);
  await p.fill('[data-k="conceptos.1.desc"]','750200');await p.waitForTimeout(100);
  await p.fill('[data-k="conceptos.1.cant"]','2');await p.press('[data-k="conceptos.1.cant"]','Tab');
  ok=await esperar(p,function(){return AT.inventario.cargar().then(function(){return AT.inventario.productos().filter(function(q){return q.nombre==='Sabritas sal'})[0].existencias===13})});
  r.cumple(ok,'el código del producto también lo encuentra');
  await p.fill('[data-k="conceptos.1.desc"]','Bolsa de regalo');await p.press('[data-k="conceptos.1.desc"]','Tab');
  ok=await esperar(p,function(){return AT.inventario.cargar().then(function(){return AT.inventario.productos().filter(function(q){return q.nombre==='Sabritas sal'})[0].existencias===15})});
  r.cumple(ok,'si el concepto ya no es un producto, su movimiento se quita');
  r.cumple(!(await p.textContent('[data-stock="1"]')).trim(),'un concepto que no es producto no dice existencias');
  await revisar(p,r,'nota de venta con inventario (escritorio)');

  /* Papelera: se quitan sus movimientos; al recuperarla, vuelven */
  await p.click('#docMas');await p.click('.menu-i:has-text("Mover a la papelera")');await p.waitForSelector('dialog [data-el="si"]');
  await Promise.all([p.waitForURL(/inicio\.html/),p.click('[data-el="si"]')]);await listo(p,300);
  ok=await esperar(p,function(){return AT.inventario.cargar().then(function(){return AT.inventario.productos().filter(function(q){return q.nombre==='Coca-Cola 600 ml'})[0].existencias===24})},null,5000);
  r.cumple(ok,'la nota en la papelera ya no descuenta');
  await p.evaluate(function(id){return AT.datos.papelera.restaurar(id)},docVenta);
  ok=await esperar(p,function(){return AT.inventario.cargar().then(function(){return AT.inventario.productos().filter(function(q){return q.nombre==='Coca-Cola 600 ml'})[0].existencias===19})},null,5000);
  r.cumple(ok,'al recuperarla, vuelve a descontar');

  /* Pedido al proveedor */
  await p.goto(base+'documento.html?id='+docInv);await listo(p,800);
  await p.waitForSelector('[data-inv-resumen] [data-acc="pedido"]');
  const grupos=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.inv-gh b'),function(b){return b.textContent}).join(',')});
  r.igual(grupos,'Sin proveedor','ya solo falta surtir lo que no tiene proveedor');
  await Promise.all([p.waitForURL(/documento\.html\?id=(?!d-)?/),p.click('[data-inv-resumen] [data-acc="pedido"]')]);
  await p.waitForFunction(function(id){return AT.docActual&&AT.docActual.id!==id},docInv,{timeout:8000});await listo(p,500);
  const ped=await p.evaluate(function(){var d=AT.docActual;var t=d.contenido.content.filter(function(b){return b.type==='table'})[0];
    return {titulo:d.titulo,filas:t.content.map(function(f){return f.content.map(function(c){return c.content[0].content?c.content[0].content[0].text:''}).join(' | ')})}});
  r.cumple(/^Pedido a proveedor · /.test(ped.titulo)&&ped.filas[0]==='Producto | Código | Pedir | Costo | Importe'&&ped.filas[1]==='Jabón en barra |  | 3 | $8.00 | $24.00'&&ped.filas.length===2,'«Hacer pedido» crea la página del pedido con lo que falta',ped);

  /* Factura XML del proveedor (CFDI 4.0) */
  await p.goto(base+'documento.html?id='+docInv);await listo(p,800);
  await p.waitForSelector('[data-inv-resumen] [data-acc="factura"]');
  await p.click('[data-inv-resumen] [data-acc="factura"]');await p.waitForSelector('dialog.fac-dlg[open]');
  await p.setInputFiles('dialog.fac-dlg [data-archivo]',{name:'factura.xml',mimeType:'text/xml',buffer:Buffer.from(XML)});
  await p.waitForSelector('dialog.fac-dlg select[data-i]');
  const prop=await p.evaluate(function(){return [].map.call(document.querySelectorAll('dialog.fac-dlg select[data-i]'),function(s){return s.options[s.selectedIndex].text}).join(' | ')});
  r.igual(prop,'Sabritas sal (750200) | Producto nuevo | Producto nuevo','propone el producto por código y «Producto nuevo» para lo demás');
  r.cumple(/Gepp Distribuidora/.test(await p.textContent('dialog.fac-dlg .fac-k'))&&/A-7781/.test(await p.textContent('dialog.fac-dlg .fac-k'))&&/\$1,032\.40/.test(await p.textContent('dialog.fac-dlg .fac-k')),'muestra proveedor, folio y total');
  r.cumple(/a crédito \(PPD\): queda por pagar, vence el/.test(await p.textContent('dialog.fac-dlg')),'dice que es a crédito y cuándo vence');
  await p.selectOption('dialog.fac-dlg select[data-i="2"]','no');
  await p.click('dialog.fac-dlg [data-importar]');await p.waitForTimeout(700);
  r.cumple(!await p.$('dialog.fac-dlg'),'al registrar, la ventana se cierra');
  pr=await prods(p);
  r.cumple(pr['Sabritas sal'].existencias===39&&pr['Sabritas sal'].costo===9.5,'el concepto del producto que ya existía entra y deja su costo nuevo (con descuento)',pr['Sabritas sal']);
  r.cumple(pr['Agua Natural 1l']&&pr['Agua Natural 1l'].existencias===48&&pr['Agua Natural 1l'].codigo==='750900'&&pr['Agua Natural 1l'].proveedor==='Gepp Distribuidora'&&pr['Agua Natural 1l'].costo===6,'el producto nuevo se crea con nombre legible, código, proveedor, costo y existencias',pr['Agua Natural 1l']);
  r.cumple(!pr['Flete'],'lo que no es de inventario no se vuelve producto');
  const compra=await p.evaluate(function(){return AT.inventario.buscar().then(function(ids){return AT.bases.cargar(ids.compras).then(function(b){return AT.bases.filas(b.id).map(function(f){return f.v})})})});
  r.cumple(compra.length===1&&compra[0]['c-prov']==='Gepp Distribuidora'&&compra[0]['c-total']===1032.4&&compra[0]['c-iva']===142.4&&compra[0]['c-sub']===890&&compra[0]['c-estado']==='Por pagar'&&compra[0]['c-vence']==='2026-12-05'&&compra[0]['c-uuid']==='AAAA1111-2222-3333-4444-555566667777','la compra queda en «Compras», por pagar, con su vencimiento a 15 días y su folio fiscal',compra);
  await p.click('[data-inv-resumen] [data-acc="factura"]');await p.waitForSelector('dialog.fac-dlg[open]');
  await p.setInputFiles('dialog.fac-dlg [data-archivo]',{name:'factura.xml',mimeType:'text/xml',buffer:Buffer.from(XML)});
  await p.waitForSelector('dialog.fac-dlg .fac-aviso');
  r.cumple(/ya se importó/.test(await p.textContent('dialog.fac-dlg'))&&await p.getAttribute('dialog.fac-dlg [data-importar]','aria-disabled')==='true','la misma factura no se importa dos veces');
  await p.setInputFiles('dialog.fac-dlg [data-archivo]',{name:'otro.xml',mimeType:'text/xml',buffer:Buffer.from('<html><body>hola</body></html>')});
  await p.waitForTimeout(300);
  r.cumple(/no es una factura electrónica/.test(await p.textContent('dialog.fac-dlg [data-msg]')),'un XML que no es factura se explica',await p.textContent('dialog.fac-dlg [data-msg]'));
  await revisar(p,r,'importar factura (escritorio)');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);

  /* Lista de precios y vistas */
  await p.goto(base+'documento.html?id='+docInv);await listo(p,800);
  await p.waitForSelector('.bd[data-bd] .bd-vt');
  const vistas=await p.evaluate(function(){return [].map.call(document.querySelector('.bd[data-bd]').querySelectorAll('.bd-vt[data-vista]'),function(b){return b.textContent}).join(',')});
  r.igual(vistas,'Productos,Por surtir,Por categoría,Lista de precios','Productos trae sus vistas');
  await p.click('.bd >> nth=0 >> [data-vista]:has-text("Lista de precios")');await p.waitForTimeout(250);
  const lista=await p.evaluate(function(){return [].map.call(document.querySelector('.bd').querySelectorAll('thead .bd-th'),function(t){return t.textContent.trim()}).filter(Boolean).join(',')});
  r.cumple(/Producto/.test(lista)&&/Precio/.test(lista)&&!/Costo|Existencias/.test(lista),'la lista de precios solo muestra lo que ve el cliente',lista);
  await revisar(p,r,'inventario en escritorio');

  /* Al leer y al imprimir */
  await p.click('#docModo');await p.waitForTimeout(400);
  r.cumple(await p.isVisible('.nb-inventario [data-inv-resumen] .inv-k'),'al leer se ve el resumen');
  /* Celular oscuro (el mismo navegador: los datos viven en él) */
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(function(){AT.ajustes.set('tema','dark')});
  await p.goto(base+'documento.html?id='+docInv);await listo(p,900);
  await p.waitForSelector('.bd[data-bd] .bd-vt');
  await revisar(p,r,'inventario en celular (oscuro)');
  await p.goto(base+'documento.html?id='+docVenta);await listo(p,700);
  await revisar(p,r,'nota de venta en celular (oscuro)');
  /* Respaldo: las bases conservan su rol */
  const resp=await p.evaluate(function(){return AT.datos.exportar().then(function(d){return (d.bases||[]).map(function(b){return b.rol||''}).sort().join(',')})});
  r.igual(resp,'compras,movimientos,productos','el respaldo conserva el rol de las bases');
  await cerrar(p);
});
