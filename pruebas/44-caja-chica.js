/* Caja chica y lo que la hace posible (bases.js, basedatos.js, crear.js) y «Eliminar todos los datos» (respaldo.js).
   - «Color según el valor»: una celda vacía no cumple «es mayor que» ni «es menor que».
   - Plantilla «Caja chica»: nombre con el mes, columnas (número consecutivo, fecha, sucursal, proveedor,
     ingreso/egreso con color, monto y saldo acumulado) y franja con saldo inicial, ingresos, egresos y saldo final.
   - Número consecutivo: se pone solo, no se escribe, no se reusa al eliminar; al agregarlo numera lo que hay.
   - Saldo acumulado: el de la fila anterior más el ingreso o menos el egreso, en el orden del número (no de la vista);
     el saldo inicial se cambia en la franja; la caja chica siguiente empieza con el saldo final de la anterior.
   - Tus datos → «Eliminar todos los datos» con confirmación: borra todo y lleva a «Crea tu empresa».
   - Contraste y desbordes en escritorio y celular. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarBd(p){await p.waitForSelector('.bd [data-bd-nombre]',{timeout:8000});await p.waitForTimeout(200)}
function baseId(p){return p.evaluate(function(){return document.querySelector('.bd').getAttribute('data-bd')})}
async function nuevaCaja(p){
  const antes=p.url();
  await Promise.all([p.waitForURL(function(u){return /documento\.html/.test(String(u))&&String(u)!==antes}),p.evaluate(function(){AT.crear.nuevo('cajachica');return 1}).catch(function(){return 1})]);
  await listo(p,600);await esperarBd(p);
  return baseId(p);
}
/* Un movimiento desde la tabla: concepto, tipo y monto */
async function movimiento(p,bid,concepto,tipo,monto){
  await p.click('.bd .bd-barra [data-acc="nuevaFila"]');await p.waitForTimeout(250);
  await p.keyboard.type(concepto);await p.keyboard.press('Tab');await p.waitForTimeout(300);
  const fid=await p.evaluate(function(a){return AT.bases.filas(a[0]).filter(function(f){return f.v['k-concepto']===a[1]})[0].id},[bid,concepto]);
  await p.selectOption('.bd [data-c="k-tipo"][data-f="'+fid+'"]',tipo);await p.waitForTimeout(300);
  const m='.bd [data-c="k-monto"][data-f="'+fid+'"]';
  await p.fill(m,String(monto));await p.press(m,'Tab');await p.waitForTimeout(300);
  return fid;
}
function saldos(p,bid){
  return p.evaluate(function(id){
    var b=AT.bases.base(id),c=b.columnas.filter(function(x){return x.tipo==='saldo'})[0];
    return AT.bases.filas(id).slice().sort(function(x,y){return x.v['k-num']-y.v['k-num']}).map(function(f){return {n:f.v['k-num'],c:f.v['k-concepto'],s:AT.bases.valor(b,f,c)}});
  },bid);
}

prueba('Caja chica, número consecutivo, saldo acumulado y eliminar todos los datos',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);

  /* ---------- Color según el valor con una celda vacía ---------- */
  const tonos=await p.evaluate(function(){
    var B=AT.bases,b={id:'bd-x',columnas:[{id:'c1',nombre:'Nombre',tipo:'texto'},{id:'c2',nombre:'Total',tipo:'moneda',colores:[{op:'mayor',val:'0',tono:'bien'},{op:'menor',val:'0',tono:'mal'}]},
      {id:'c3',nombre:'Nota',tipo:'texto',colores:[{op:'mayor',val:'b',tono:'bien'}]}],vistas:[]};
    function f(v){return {id:'f-x',base:'bd-x',v:v}}
    return {vacio:B.tonoCelda(b,f({}),b.columnas[1]),pos:B.tonoCelda(b,f({c2:5}),b.columnas[1]),neg:B.tonoCelda(b,f({c2:-3}),b.columnas[1]),cero:B.tonoCelda(b,f({c2:0}),b.columnas[1]),
      textoVacio:B.tonoCelda(b,f({}),b.columnas[2]),texto:B.tonoCelda(b,f({c3:'c'}),b.columnas[2])};
  });
  r.cumple(tonos.vacio===''&&tonos.textoVacio==='','una celda vacía no es «mayor que» ni «menor que» (no se pinta)',tonos);
  r.cumple(tonos.pos==='bien'&&tonos.neg==='mal'&&tonos.cero===''&&tonos.texto==='bien','las celdas con valor se siguen pintando',tonos);

  /* ---------- La plantilla ---------- */
  const bid=await nuevaCaja(p);
  const mes=await p.evaluate(function(){return new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'})});
  const est=await p.evaluate(function(id){var b=AT.bases.base(id);return {nombre:b.nombre,arrastre:b.arrastre,cols:b.columnas.map(function(c){return c.nombre+':'+c.tipo}),titulo:document.title}},bid);
  r.igual(est.nombre,'Caja chica de '+mes,'la base se llama con el mes');
  r.cumple(est.titulo.indexOf('Caja chica de '+mes)>=0,'la página también',est.titulo);
  r.igual(est.cols.join(', '),'Concepto:texto, Número de movimiento:consecutivo, Fecha:fecha, Sucursal:seleccion, Proveedor:texto, Ingreso/Egreso:seleccion, Monto:moneda, Saldo:saldo','las columnas de la caja chica');
  r.cumple(await p.evaluate(function(id){return AT.bases.base(id).columnas[3].opciones.join()==='HM Montejo'},bid),'la sucursal trae «HM Montejo»');
  r.cumple(!!(await p.$('.bd .bd-saldo [data-saldo-ini]')),'la franja del saldo muestra el saldo inicial para escribirlo');

  /* ---------- Saldo inicial y movimientos ---------- */
  await p.fill('.bd [data-saldo-ini]','1000');await p.press('.bd [data-saldo-ini]','Tab');await p.waitForTimeout(400);
  r.igual(await p.evaluate(function(id){return AT.bases.base(id).columnas[7].inicial},bid),1000,'el saldo inicial se guarda desde la franja');
  const f1=await movimiento(p,bid,'Entrega HM Montejo','Ingreso',500);
  const f2=await movimiento(p,bid,'Compra de gas','Egreso',200);
  const f3=await movimiento(p,bid,'Garrafones','Egreso',90.5);
  let s=await saldos(p,bid);
  r.igual(s.map(function(x){return x.n}).join(','),'1,2,3','el número de movimiento se pone solo: 1, 2, 3');
  r.igual(s.map(function(x){return x.s}).join(','),'1500,1300,1209.5','el saldo de cada fila es el anterior más el ingreso o menos el egreso');
  r.cumple(!(await p.$('.bd input[data-c="k-num"]'))&&!!(await p.$('.bd output[data-calc="k-num"]')),'el número de movimiento no se escribe a mano');
  const celdaSaldo=await p.textContent('.bd output[data-calc="k-saldo"][data-f="'+f3+'"]');
  r.cumple(/\$1,209\.50/.test(celdaSaldo),'el saldo se ve en pesos',celdaSaldo);
  const franja=await p.textContent('.bd .bd-saldo');
  r.cumple(/Ingresos\s*\+ \$500\.00/.test(franja)&&/Egresos\s*− \$290\.50/.test(franja)&&/Saldo final\s*\$1,209\.50/.test(franja),'la franja suma ingresos y egresos y da el saldo final',franja);
  const tonoTipo=await p.getAttribute('.bd [data-c="k-tipo"][data-f="'+f2+'"]','data-tono');
  const tonoCelda=await p.evaluate(function(a){var td=document.querySelector('.bd [data-c="k-tipo"][data-f="'+a+'"]').closest('td');return td.className},f2);
  r.cumple(/mal/.test(tonoCelda)||/mal|rojo/.test(String(tonoTipo)),'«Egreso» se pinta de rojo',{tonoCelda:tonoCelda,tonoTipo:tonoTipo});
  await revisar(p,r,'caja chica con movimientos');

  /* El orden de la vista no cambia el saldo */
  await p.evaluate(function(id){var b=AT.bases.base(id);b.vistas[0].s={col:'k-monto',dir:1};return AT.bases.guardarBase(b)},bid);
  await p.waitForTimeout(300);
  s=await saldos(p,bid);
  r.igual(s.map(function(x){return x.s}).join(','),'1500,1300,1209.5','ordenar la vista por monto no cambia los saldos (siguen el número de movimiento)');
  const enPantalla=await p.$$eval('.bd output[data-calc="k-saldo"]',function(e){return e.map(function(x){return x.textContent})});
  r.igual(enPantalla.join(' | '),'$1,209.50 | $1,300.00 | $1,500.00','la tabla, ordenada de menor a mayor monto, muestra el saldo de cada movimiento')

  /* Eliminar no reusa el número; cambiar el saldo inicial recalcula */
  await p.click('.bd [data-ficha="'+f3+'"]');await p.waitForSelector('dialog.bd-ficha[open]');
  await p.click('dialog.bd-ficha [data-borrar]');await p.waitForTimeout(400);
  const f4=await movimiento(p,bid,'Entrega de la tarde','Ingreso',300);
  s=await saldos(p,bid);
  r.igual(s.map(function(x){return x.n}).join(','),'1,2,4','al eliminar una fila su número no se vuelve a usar');
  await p.fill('.bd [data-saldo-ini]','$2,000');await p.press('.bd [data-saldo-ini]','Tab');await p.waitForTimeout(400);
  s=await saldos(p,bid);
  r.igual(s.map(function(x){return x.s}).join(','),'2500,2300,2600','cambiar el saldo inicial recalcula todos los saldos');
  void f1;void f4;

  /* ---------- El diálogo de la columna de saldo ---------- */
  await p.click('.bd [data-col="k-saldo"]');await p.waitForSelector('dialog.bd-col[open]');
  const visibles=await p.$$eval('dialog.bd-col [data-si="saldo"]',function(e){return e.filter(function(x){return !x.hidden}).length});
  r.cumple(visibles>=5,'la columna de saldo muestra sus opciones: saldo inicial, monto, ingreso o egreso, qué resta y el orden',visibles);
  r.igual(await p.inputValue('dialog.bd-col [name="smonto"]'),'k-monto','el monto es la columna «Monto»');
  r.igual(await p.inputValue('dialog.bd-col [name="spor"]'),'k-num','y el orden es el número de movimiento');
  await revisar(p,r,'opciones de la columna de saldo');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  /* ---------- La siguiente caja chica arrastra el saldo ---------- */
  const bid2=await nuevaCaja(p);
  r.cumple(bid2!==bid,'se crea otra base');
  r.igual(await p.evaluate(function(id){return AT.bases.base(id).columnas.filter(function(c){return c.tipo==='saldo'})[0].inicial},bid2),2600,'la caja chica nueva empieza con el saldo final de la anterior');
  r.cumple(/\$2,600\.00/.test(await p.inputValue('.bd [data-saldo-ini]')),'y se ve en la franja');
  const g1=await movimiento(p,bid2,'Primera entrega','Ingreso',100);
  r.igual((await saldos(p,bid2)).map(function(x){return x.n+':'+x.s}).join(','),'1:2700','su numeración empieza en 1');
  void g1;

  /* ---------- Número consecutivo agregado a una base con filas ---------- */
  const urlCaja=p.url();
  await Promise.all([p.waitForURL(function(u){return /documento\.html/.test(String(u))&&String(u)!==urlCaja}),p.evaluate(function(){AT.crear.nuevo('clientes');return 1}).catch(function(){return 1})]);await listo(p,600);
  await esperarBd(p);
  const cb=await baseId(p);
  await p.evaluate(function(id){var B=AT.bases,l=['Ana','Beto','Caro'].map(function(n,i){var f=B.nuevaFila(id,{'c-nombre':n});f.orden=i+1;return f});return B.guardarFilas(l)},cb);
  await p.waitForTimeout(300);
  await p.click('.bd [data-acc="nuevaCol"]');await p.waitForSelector('dialog.bd-col[open]');
  await p.fill('dialog.bd-col [name="nombre"]','Folio');await p.selectOption('dialog.bd-col [name="tipo"]','consecutivo');
  r.cumple(await p.isVisible('dialog.bd-col p[data-si="consecutivo"]'),'el número consecutivo explica cómo se numera');
  await p.click('dialog.bd-col button[type="submit"]');await p.waitForTimeout(500);
  const folios=await p.evaluate(function(id){var b=AT.bases.base(id),c=b.columnas.filter(function(x){return x.tipo==='consecutivo'})[0];
    return AT.bases.filas(id).slice().sort(function(x,y){return x.orden-y.orden}).map(function(f){return f.v['c-nombre']+':'+f.v[c.id]})},cb);
  r.igual(folios.join(','),'Ana:1,Beto:2,Caro:3','al agregar la columna numera las filas que ya había, en su orden');
  await p.click('.bd .bd-barra [data-acc="nuevaFila"]');await p.waitForTimeout(300);
  r.igual(await p.evaluate(function(id){var b=AT.bases.base(id),c=b.columnas.filter(function(x){return x.tipo==='consecutivo'})[0],l=AT.bases.filas(id);return l.reduce(function(m,f){return Math.max(m,f.v[c.id]||0)},0)},cb),4,'la fila nueva recibe el que sigue');
  r.cumple(p.errores.length===0,'sin errores',p.errores);

  /* ---------- Eliminar todos los datos ---------- */
  await p.goto(base+'inicio.html');await listo(p,400);
  await p.evaluate(function(){AT.tusDatos.abrir()});await p.waitForSelector('dialog.tus-datos[open]');
  r.cumple(await p.isHidden('#tdConf'),'la confirmación empieza escondida');
  await p.click('[data-td="borrar"]');
  r.cumple(await p.isVisible('#tdConf')&&await p.evaluate(function(){return document.activeElement.getAttribute('data-td')==='borrarSi'}),'«Eliminar todos los datos» pide confirmar y lleva el foco a «Sí, eliminar todo»');
  r.cumple(await p.isVisible('#tdConf [data-td="descargar"]'),'y ofrece descargar un respaldo primero');
  await revisar(p,r,'Tus datos: confirmar eliminar todo');
  await p.click('[data-td="borrarNo"]');
  r.cumple(await p.isHidden('#tdConf')&&(await p.evaluate(function(){return AT.datos.bases.todos()})).length>=3,'«Cancelar» no borra nada');
  const antes=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.map(function(d){return d.id})})});
  /* La prueba vuelve a sembrar el espacio en cada carga: después de eliminar se quita, como quedaría de verdad */
  await p.context().addInitScript(function(){try{if(sessionStorage.getItem('prueba-sin-espacio'))localStorage.removeItem('aprende-tecnologia:perfil')}catch(e){}});
  await p.evaluate(function(){sessionStorage.setItem('prueba-sin-espacio','1')});
  await p.click('[data-td="borrar"]');
  await Promise.all([p.waitForURL(/entrar\.html/,{timeout:8000}),p.click('[data-td="borrarSi"]')]);
  await listo(p,600);
  r.cumple(/Para qué usarás OneBook/.test(await p.textContent('h1')),'abre el primer paso para crear el espacio, como la primera vez',p.url())
  const queda=await p.evaluate(function(ids){return Promise.all([AT.datos.documentos.todos(),AT.datos.bases.todos()]).then(function(x){
    return {ids:x[0].map(function(d){return d.id}),docs:x[0].length,bases:x[1].length,antes:ids.length}})},antes);
  r.cumple(/entrar\.html/.test(p.url())&&queda.antes>=3&&queda.docs===0&&queda.bases===0,'se borraron todas las páginas y bases y abre «Crea tu empresa»',queda);
  r.cumple(p.errores.length===0,'sin errores al eliminar todo',p.errores);
  await cerrar(p);

  /* ---------- Celular ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,ajustes:{tema:'dark',contraste:'high'}});
  await c.goto(base+'inicio.html');await listo(c);
  const cbid=await nuevaCaja(c);
  await c.fill('.bd [data-saldo-ini]','15000');await c.press('.bd [data-saldo-ini]','Tab');await c.waitForTimeout(400);
  await movimiento(c,cbid,'Entrega de la sucursal con un concepto largo','Ingreso',123456.78);
  await movimiento(c,cbid,'Pago al proveedor de verduras','Egreso',4321);
  await revisar(c,r,'caja chica (celular, oscuro y alto contraste)');
  await c.evaluate(function(){AT.tusDatos.abrir()});await c.waitForSelector('dialog.tus-datos[open]');
  await c.click('[data-td="borrar"]');
  await revisar(c,r,'Tus datos: confirmar eliminar todo (celular)');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);
});
