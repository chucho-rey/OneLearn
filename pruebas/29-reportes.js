/* Fase F7c: reportes. La plantilla «Reporte del mes» (ventas por producto, compras por proveedor y piezas, de tu
   Inventario, contra el mes anterior: signo, flecha y porcentaje, y gráfica); ajustar un reporte (agrupar por uno o
   dos campos, contar, promedio, periodos, filtro); «/reporte» en otra página; presentar en diapositivas; al leer y
   al imprimir (carta horizontal); repetir el mes con tus plantillas; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function nuevoDoc(p,base,tipo){
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(t){AT.crear.nuevo(t);return 1},tipo).catch(function(){return 1})]);await listo(p,700);
}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
const H=new Date(),ESTE=iso(new Date(H.getFullYear(),H.getMonth(),3)),PASADO=iso(new Date(H.getFullYear(),H.getMonth()-1,10)),VIEJO=iso(new Date(H.getFullYear()-1,H.getMonth(),10));
async function filasT(p,sel){return p.locator(sel).evaluateAll(function(l){return l.map(function(tr){return [].map.call(tr.children,function(c){return c.textContent.replace(/\s+/g,' ').trim()}).join(' · ')})})}
async function textos(p,sel){return (await p.locator(sel).allTextContents()).map(function(t){return t.replace(/\s+/g,' ').trim()})}

prueba('Reportes',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  /* Inventario con ventas y compras de este mes, del pasado y de hace un año */
  await p.evaluate(function(f){
    var I=AT.inventario,B=AT.bases;
    return I.asegurar('',['productos','movimientos','compras']).then(function(ids){
      return Promise.all([B.cargar(ids.productos),B.cargar(ids.movimientos),B.cargar(ids.compras)]).then(function(){
        var ps=[['Refresco','Bebidas'],['Papas','Botanas'],['Jabón','Limpieza']].map(function(x,i){var r=B.nuevaFila(ids.productos,{'p-nombre':x[0],'p-cat':x[1],'p-costo':10,'p-precio':20,'p-ini':50});r.orden=i+1;return r});
        var m=[[f.este,0,'Venta',10,20],[f.este,1,'Venta',4,15],[f.este,0,'Entrada',24,10],[f.pasado,0,'Venta',5,20],[f.pasado,1,'Venta',6,15],[f.pasado,2,'Venta',2,30],[f.viejo,0,'Venta',100,20]]
          .map(function(x,i){var r=B.nuevaFila(ids.movimientos,{'m-con':x[2],'m-fecha':x[0],'m-prod':ps[x[1]].id,'m-tipo':x[2],'m-cant':x[3],'m-pu':x[4]});r.orden=i+1;return r});
        var c=[[f.este,'Gepp',1160],[f.este,'Sabritas',580],[f.pasado,'Gepp',1000]].map(function(x,i){var r=B.nuevaFila(ids.compras,{'c-prov':x[1],'c-fecha':x[0],'c-total':x[2],'c-estado':'Pagada'});r.orden=i+1;return r});
        return B.guardarFilas(ps).then(function(){return B.guardarFilas(m)}).then(function(){return B.guardarFilas(c)});
      });
    });
  },{este:ESTE,pasado:PASADO,viejo:VIEJO});

  /* La plantilla «Reporte del mes» */
  await nuevoDoc(p,base,'reporte');
  await p.waitForFunction(function(){return document.querySelectorAll('.rep .rep-tit').length===3},null,{timeout:8000});
  const titulo=await p.evaluate(function(){return AT.docActual.titulo});
  const mes=new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  r.igual(titulo,'Reporte de '+mes,'la plantilla lleva el mes en el título');
  r.igual((await textos(p,'.rep .rep-tit')).join(' | '),'Ventas por producto | Compras por proveedor | Piezas que entraron y salieron','trae tres reportes');
  const filas=await p.evaluate(function(){var t=document.querySelector('.rep .rep-t');return [].map.call(t.querySelectorAll('tbody tr, tfoot tr'),function(tr){return [].map.call(tr.children,function(c){return c.textContent.replace(/\s+/g,' ').trim()}).join(' · ')})});
  r.cumple(/^Refresco · \$200\.00 · \$100\.00 · ▲ \+\$100\.00 \(\+100 %\)/.test(filas[0])&&/^Papas · \$60\.00 · \$90\.00 · ▼ −\$30\.00 \(−33\.3 %\)/.test(filas[1])&&/^Jabón · \$0\.00 · \$60\.00 · ▼ −\$60\.00/.test(filas[2]),
    'ventas por producto contra el mes pasado: qué subió y qué bajó, con signo, flecha y porcentaje',filas);
  r.cumple(/^Total · \$260\.00 · \$250\.00 · ▲ \+\$10\.00/.test(filas[3]),'el total también se compara',filas[3]);
  r.cumple(await p.evaluate(function(){var s=document.querySelector('.rep .rep-sube .vh');return s&&s.textContent.trim()==='(subió)'}),'quien no ve la flecha escucha «subió» o «bajó»');
  r.cumple((await p.$$('.rep >> nth=0 >> .rep-gf')).length===3,'la gráfica tiene una barra por producto');
  const compras=await filasT(p,'.rep >> nth=1 >> .rep-t tbody tr');
  r.cumple(/^Gepp · \$1,160\.00 · \$1,000\.00 · ▲ \+\$160\.00/.test(compras[0])&&/^Sabritas · \$580\.00 · \$0\.00 · ▲ \+\$580\.00/.test(compras[1]),'compras por proveedor',compras);
  const piezas=await filasT(p,'.rep >> nth=2 >> .rep-t tbody tr');
  r.cumple(piezas.some(function(t){return /^Entrada · 24 · 0/.test(t)})&&piezas.some(function(t){return /^Venta · 14 · 13/.test(t)})&&!(await p.$('.rep >> nth=2 >> .rep-graf')),'piezas por tipo, sin gráfica',piezas);
  const guardado=await p.evaluate(function(){return AT.inventario.ids().movimientos===AT.docActual.contenido.content.filter(function(b){return b.type==='reporte'})[0].attrs.cfg.base});
  r.cumple(guardado,'el reporte por rol queda ligado a la base del inventario');

  /* Ajustar: dos campos, contar, periodo, filtro */
  await p.click('.rep >> nth=0 >> [data-r="ajustar"]');
  r.cumple(await p.isVisible('.rep >> nth=0 >> .rep-panel')&&await p.getAttribute('.rep >> nth=0 >> [data-r="ajustar"]','aria-expanded')==='true','«Ajustar reporte» abre el panel');
  await p.selectOption('.rep >> nth=0 >> [data-rk="periodo"]','anio');await p.waitForTimeout(200);
  r.cumple(/Total · \d{4}/.test((await textos(p,'.rep >> nth=0 >> .rep-k dt'))[0])||new RegExp(String(new Date().getFullYear())).test((await textos(p,'.rep >> nth=0 >> .rep-k dt'))[0]),'el periodo cambia a «este año»',await textos(p,'.rep >> nth=0 >> .rep-k dt'));
  await p.selectOption('.rep >> nth=0 >> [data-rk="periodo"]','todo');await p.waitForTimeout(200);
  r.cumple(await p.isDisabled('.rep >> nth=0 >> [data-rk="comparar"]')&&!(await p.$('.rep >> nth=0 >> .rep-dif')),'«Todo» no se compara');
  r.cumple(/^Refresco · \$2,300\.00/.test((await filasT(p,'.rep >> nth=0 >> .rep-t tbody tr'))[0]),'con «Todo» entran todas las ventas');
  await p.selectOption('.rep >> nth=0 >> [data-rk="filas"]',{label:'Fecha'});await p.waitForTimeout(200);
  const porMes=await textos(p,'.rep >> nth=0 >> .rep-t tbody th');
  r.cumple(porMes.length===3&&porMes.every(function(t){return /^[a-z]+ \d{4}$/.test(t)}),'agrupar por una fecha agrupa por mes, en orden',porMes);
  await p.selectOption('.rep >> nth=0 >> [data-rk="columnas"]',{label:'Producto'});await p.waitForTimeout(200);
  const cab=await textos(p,'.rep >> nth=0 >> .rep-t thead th');
  r.cumple(cab.indexOf('Refresco')>0&&cab[cab.length-1]==='Total','agrupar por un segundo campo da columnas con su total',cab);
  await p.selectOption('.rep >> nth=0 >> [data-rk="columnas"]','');
  await p.selectOption('.rep >> nth=0 >> [data-rk="filas"]',{label:'Producto'});
  await p.selectOption('.rep >> nth=0 >> [data-rk="calculo"]','conteo');await p.waitForTimeout(200);
  r.cumple(/^Refresco · 3/.test((await filasT(p,'.rep >> nth=0 >> .rep-t tbody tr'))[0]),'contar filas',await filasT(p,'.rep >> nth=0 >> .rep-t tbody tr'));
  await p.selectOption('.rep >> nth=0 >> [data-rk="fop"]','distinto');await p.waitForTimeout(200);
  r.cumple(/^Refresco · 1$/.test((await filasT(p,'.rep >> nth=0 >> .rep-t tbody tr'))[0]),'el filtro «no es Venta» deja las entradas',await filasT(p,'.rep >> nth=0 >> .rep-t tbody tr'));
  await p.fill('.rep >> nth=0 >> [data-rk="titulo"]','Entradas por producto');await p.waitForTimeout(700);
  r.igual((await textos(p,'.rep >> nth=0 >> .rep-tit'))[0],'Entradas por producto','el título se cambia al escribir');
  const cfg=await p.evaluate(function(){return AT.docActual.contenido.content.filter(function(b){return b.type==='reporte'})[0].attrs.cfg});
  r.cumple(cfg.titulo==='Entradas por producto'&&cfg.calculo==='conteo'&&cfg.fop==='distinto'&&cfg.periodo==='todo','lo ajustado se guarda en el bloque',cfg);
  await revisar(p,r,'reporte con panel (escritorio)');
  const docRep=await p.evaluate(function(){return AT.docActual.id});

  /* Presentar */
  await p.click('.rep >> nth=1 >> [data-r="presentar"]');await p.waitForSelector('dialog.rep-pres[open]');
  r.cumple(/Compras por proveedor/.test(await p.textContent('dialog.rep-pres'))&&/1 \/ 3/.test(await p.textContent('dialog.rep-pres .rep-pres-b')),'«Presentar» abre la primera de tres diapositivas');
  await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);
  r.cumple(/2 \/ 3/.test(await p.textContent('dialog.rep-pres .rep-pres-b'))&&!!(await p.$('dialog.rep-pres .rep-graf')),'con la flecha pasa a la gráfica');
  await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);
  r.cumple(!!(await p.$('dialog.rep-pres .rep-t')),'y después a la tabla');
  await revisar(p,r,'presentación');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(!(await p.$('dialog.rep-pres'))&&await p.evaluate(function(){return document.activeElement.getAttribute('data-r')==='presentar'}),'Esc sale y el foco vuelve a «Presentar»');

  /* «/reporte» en otra página, sobre cualquier base */
  await nuevoDoc(p,base,'notas');
  await p.click('.ed-cuerpo');await p.keyboard.type('/reporte');await p.waitForTimeout(300);await p.keyboard.press('Enter');
  await p.waitForSelector('.rep [data-rk="base"]');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){return document.activeElement.getAttribute('data-rk')==='base'}),'«/reporte» abre con el foco en la base');
  await p.selectOption('.rep [data-rk="base"]',{label:'Productos'});await p.waitForTimeout(200);
  await p.selectOption('.rep [data-rk="filas"]',{label:'Categoría'});
  await p.selectOption('.rep [data-rk="calculo"]','conteo');await p.waitForTimeout(200);
  r.igual((await filasT(p,'.rep .rep-t tbody tr')).join(' | '),'Bebidas · 1 | Botanas · 1 | Limpieza · 1','cuenta productos por categoría');
  await p.selectOption('.rep [data-rk="calculo"]','promedio');await p.selectOption('.rep [data-rk="valor"]',{label:'Precio'});await p.waitForTimeout(200);
  r.cumple(/Promedio/.test((await textos(p,'.rep .rep-k dt'))[0])&&(await textos(p,'.rep .rep-k dd'))[0]==='$20.00','promedio de una columna en pesos',await textos(p,'.rep .rep-k'));

  /* Al leer y al imprimir (carta horizontal) */
  await p.goto(base+'documento.html?id='+docRep);await listo(p,900);
  await p.click('#docModo');await p.waitForTimeout(500);
  r.cumple((await p.$$('.rep .rep-t')).length===3&&!(await p.$('.rep [data-r="ajustar"]'))&&!!(await p.$('.rep [data-r="presentar"]')),'al leer se ven los reportes, con «Presentar» y sin «Ajustar»');
  await p.click('#docMas');await p.click('.menu-i:has-text("Imprimir o exportar")');await p.waitForSelector('dialog.en-dlg[open]');
  await p.check('dialog.en-dlg input[name="ex-orientacion"][value="horizontal"]',{force:true});await p.waitForTimeout(700);
  r.igual(await p.evaluate(function(){return AT.docActual.formato&&AT.docActual.formato.orientacion}),'horizontal','se puede elegir la hoja horizontal');
  await Promise.all([p.waitForURL(/imprimir\.html/),p.click('dialog.en-dlg [data-ex="pdf"]')]);
  await p.waitForSelector('.pagedjs_page',{timeout:15000});await p.waitForTimeout(800);
  const imp=await p.evaluate(function(){return {reps:document.querySelectorAll('.rep-papel .rep-t').length,land:[].some.call(document.querySelectorAll('style'),function(s){return /size:letter landscape/.test(s.textContent)}),
    ancho:document.querySelector('.pagedjs_page').getBoundingClientRect().width,alto:document.querySelector('.pagedjs_page').getBoundingClientRect().height}});
  r.cumple(imp.reps===3&&imp.land&&imp.ancho>imp.alto,'al imprimir salen los reportes en hoja horizontal',imp);
  r.cumple(p.errores.length===0,'imprimir sin errores',p.errores);

  /* Tus plantillas: un reporte de un mes completo pasa al mes en curso */
  const mov=await p.evaluate(function(){
    var pl={tipo:'notas',titulo:'Mi reporte',contenido:{type:'doc',content:[{type:'reporte',attrs:{id:'b-x',cfg:{base:'x',periodo:'rango',desde:'2025-02-01',hasta:'2025-02-28'}}},{type:'reporte',attrs:{id:'b-y',cfg:{base:'x',periodo:'rango',desde:'2025-02-03',hasta:'2025-02-20'}}}]}};
    var d=AT.crear.desdePlantilla(pl);return d.contenido.content.map(function(b){return b.attrs.cfg.desde+'/'+b.attrs.cfg.hasta});
  });
  const d1=new Date(),ini=iso(new Date(d1.getFullYear(),d1.getMonth(),1)),fin=iso(new Date(d1.getFullYear(),d1.getMonth()+1,0));
  r.cumple(mov[0]===ini+'/'+fin&&mov[1]==='2025-02-03/2025-02-20','al crear desde tu plantilla, un mes completo pasa al mes en curso (un rango cualquiera se queda)',mov);
  await cerrar(p);

  /* Celular oscuro */
  const q=await pagina(browser,{ancho:390,alto:844,reducir:true,ajustes:{tema:'dark'}});
  await q.goto(base+'inicio.html');await listo(q);
  await q.evaluate(function(f){
    var I=AT.inventario,B=AT.bases;
    return I.asegurar('',['productos','movimientos','compras']).then(function(ids){
      return Promise.all([B.cargar(ids.productos),B.cargar(ids.movimientos)]).then(function(){
        var p1=B.nuevaFila(ids.productos,{'p-nombre':'Refresco de cola de dos litros retornable','p-precio':40});
        return B.guardarFila(p1).then(function(){return B.guardarFilas([B.nuevaFila(ids.movimientos,{'m-con':'Venta','m-fecha':f.este,'m-prod':p1.id,'m-tipo':'Venta','m-cant':3,'m-pu':40}),B.nuevaFila(ids.movimientos,{'m-con':'Venta','m-fecha':f.pasado,'m-prod':p1.id,'m-tipo':'Venta','m-cant':5,'m-pu':40})])});
      });
    });
  },{este:ESTE,pasado:PASADO});
  await nuevoDoc(q,base,'reporte');
  await q.waitForFunction(function(){return document.querySelectorAll('.rep .rep-tit').length===3},null,{timeout:8000});
  await q.click('.rep >> nth=0 >> [data-r="ajustar"]');await q.waitForTimeout(200);
  await revisar(q,r,'reporte en celular (oscuro)');
  await cerrar(q);
});
