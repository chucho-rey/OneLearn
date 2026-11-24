/* Fase F7d: formato condicional (reglas de color por columna; «Estado» del inventario ya pintado), bloque
   «Indicadores» (los del negocio, ajustar en su ventana, agregar y quitar), «Próximos vencimientos» (bases, plan de
   pagos y cuentas por pagar, lo vencido primero y con su enlace) y «Presupuesto del mes» (real contra presupuesto,
   disponible en rojo si te pasas); al leer y al imprimir; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function nuevoDoc(p,base,tipo){
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(t){AT.crear.nuevo(t);return 1},tipo).catch(function(){return 1})]);await listo(p,700);
}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function enDias(n){var d=new Date();d.setDate(d.getDate()+n);return iso(d)}
const HOY=iso(new Date());
async function filasT(p,sel){return p.locator(sel).evaluateAll(function(l){return l.map(function(tr){return [].map.call(tr.children,function(c){return c.textContent.replace(/\s+/g,' ').trim()}).join(' · ')})})}

prueba('Indicadores, vencimientos y presupuesto',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  await p.evaluate(function(f){
    var I=AT.inventario,B=AT.bases;
    return I.asegurar('',['productos','movimientos','compras']).then(function(ids){
      return Promise.all([B.cargar(ids.productos),B.cargar(ids.movimientos),B.cargar(ids.compras)]).then(function(){
        var ps=[['Refresco',10,20,30,10],['Papas',8,15,4,10],['Jabón',5,12,0,2]].map(function(x,i){var r=B.nuevaFila(ids.productos,{'p-nombre':x[0],'p-costo':x[1],'p-precio':x[2],'p-ini':x[3],'p-min':x[4]});r.orden=i+1;return r});
        var m=[B.nuevaFila(ids.movimientos,{'m-con':'Venta','m-fecha':f.hoy,'m-prod':ps[0].id,'m-tipo':'Venta','m-cant':5,'m-pu':20})];
        var c=[['Gepp',1160,'Por pagar',f.d3],['Sabritas',580,'Por pagar',f.dm2],['Lala',300,'Pagada',f.d1]].map(function(x,i){var r=B.nuevaFila(ids.compras,{'c-prov':x[0],'c-fecha':f.hoy,'c-total':x[1],'c-estado':x[2],'c-vence':x[3]});r.orden=i+1;return r});
        return B.guardarFilas(ps).then(function(){return B.guardarFilas(m)}).then(function(){return B.guardarFilas(c)});
      });
    });
  },{hoy:HOY,d3:enDias(3),dm2:enDias(-2),d1:enDias(1)});

  /* Formato condicional: el Estado del inventario ya viene pintado */
  await nuevoDoc(p,base,'inventario');
  await p.waitForFunction(function(){return document.querySelectorAll('.bd[data-bd]').length===3},null,{timeout:8000});
  const tonos=await p.evaluate(function(){var o={};document.querySelectorAll('.bd td[data-tc="p-estado"]').forEach(function(td){o[td.textContent.trim()]=td.className.replace(/.*bd-t-(\w+).*/,'$1')});return o});
  r.cumple(tonos.Bien==='bien'&&tonos.Bajo==='aviso'&&tonos.Agotado==='mal','«Estado» en verde, amarillo y rojo',tonos);
  const dias=await p.evaluate(function(){var o={};document.querySelectorAll('.bd td[data-tc="c-dias"]').forEach(function(td){o[td.textContent.trim()]=(td.className.match(/bd-t-(\w+)/)||[])[1]||''});return o});
  r.cumple(dias['−2']==='mal'&&dias['3']==='aviso'&&dias['']==='','«Días para pagar»: vencido en rojo, pronto en amarillo, pagada sin color',dias);
  /* Una regla nueva desde la ventana de la columna */
  await p.click('.bd >> nth=0 >> [data-col="p-precio"]');await p.waitForSelector('dialog.bd-col[open]');
  await p.selectOption('dialog.bd-col [name="cop0"]','mayor');await p.fill('dialog.bd-col [name="cval0"]','14');await p.selectOption('dialog.bd-col [name="cton0"]','info');
  await p.click('dialog.bd-col [type="submit"]');await p.waitForTimeout(400);
  const precios=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.bd td[data-tc="p-precio"]'),function(td){return /bd-t-info/.test(td.className)})});
  r.cumple(precios.filter(Boolean).length===2&&precios.length===3,'la regla «es mayor que 14 → Azul» pinta dos precios',precios);
  await p.fill('.bd [data-c="p-precio"] >> nth=2','9');await p.press('.bd [data-c="p-precio"] >> nth=2','Tab');await p.waitForTimeout(400);
  r.igual(await p.evaluate(function(){return document.querySelectorAll('.bd td[data-tc="p-precio"].bd-t-info').length}),1,'al cambiar el valor, el color se revisa solo');
  await revisar(p,r,'formato condicional (escritorio)');

  /* Indicadores del negocio */
  await nuevoDoc(p,base,'notas');
  await p.click('.ed-cuerpo');await p.keyboard.type('/indicadores');await p.waitForTimeout(300);await p.keyboard.press('Enter');
  await p.waitForSelector('.ind .ind-t');await p.waitForTimeout(300);
  const ind=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.ind .ind-t'),function(t){return t.querySelector('dt').textContent+': '+t.querySelector('.ind-v').textContent})});
  r.cumple(ind[0]==='Ventas del mes: $100.00'&&ind[1]==='Valor del inventario: $282.00'&&ind[2]==='Compras por pagar: $1,740.00'&&ind[3]==='Productos por surtir: 2','trae los indicadores del negocio',ind);
  r.cumple(/▲/.test(await p.textContent('.ind .ind-t >> nth=0')),'las ventas del mes se comparan con el mes pasado');
  await p.click('.ind [data-ind="ajustar"][data-i="3"]');await p.waitForSelector('dialog.ind-dlg[open]');
  r.cumple(await p.isVisible('dialog.ind-dlg .rep-panel')&&!(await p.$('dialog.ind-dlg [data-rk="filas"]')&&await p.isVisible('dialog.ind-dlg [data-rk="filas"]')&&false),'«Ajustar» abre la ventana del reporte');
  await p.fill('dialog.ind-dlg [data-rk="titulo"]','Por surtir');await p.waitForTimeout(300);
  await p.click('dialog.ind-dlg .td-bt [data-cerrar]');await p.waitForTimeout(300);
  r.cumple(/^Por surtir/.test(await p.textContent('.ind .ind-t >> nth=3 >> dt'))&&await p.evaluate(function(){return document.activeElement.getAttribute('data-ind')==='ajustar'}),'el título cambia y el foco vuelve a «Ajustar»');
  await p.click('.ind [data-ind="quitar"][data-i="1"]');await p.waitForTimeout(200);
  r.igual(await p.locator('.ind .ind-t').count(),3,'«Quitar» quita una tarjeta');
  await p.waitForTimeout(900);
  const cfgInd=await p.evaluate(function(){return AT.docActual.contenido.content.filter(function(b){return b.type==='indicadores'})[0].attrs.cfg.items.map(function(x){return x.titulo})});
  r.igual(cfgInd.join(' | '),'Ventas del mes | Compras por pagar | Por surtir','los indicadores quedan guardados en el bloque');

  /* Próximos vencimientos */
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});
  await p.waitForFunction(function(){var a=document.activeElement;return !!a&&a.classList.contains('ProseMirror')});
  await p.keyboard.press('Enter');await p.keyboard.type('/vencimientos');await p.waitForTimeout(300);await p.keyboard.press('Enter');
  await p.waitForFunction(function(){return document.querySelector('.ven-b .ven, .ven-b .ven-nada')},null,{timeout:10000});await p.waitForTimeout(300);
  const docPagos=await p.evaluate(function(f){var d={formato:1,tipo:'notas',id:'d-pagosv1',titulo:'Deudas',props:[],contenido:{type:'doc',content:[
    {type:'pagos',attrs:{id:'b-pg1',titulo:'Préstamo de la camioneta',modo:'plazos',monto:'12000',pagos:'12',cuota:'',frecuencia:'mensual',inicio:f.d5,pagados:{}}},
    {type:'porpagar',attrs:{id:'b-pp1',titulo:'',cuentas:[{proveedor:'Bimbo',concepto:'Factura 88',monto:'900',vence:f.d10,pagada:''},{proveedor:'Coca',concepto:'',monto:'100',vence:f.d2,pagada:f.hoy}]}}]}};
    return AT.datos.documentos.guardar(d).then(function(){return d.id})},{d5:enDias(5),d10:enDias(10),d2:enDias(2),hoy:HOY});
  await p.waitForTimeout(800);await p.waitForFunction(function(){var e=document.querySelector('.doc-estado');return e&&e.getAttribute('data-k')==='ok'});
  await p.reload();await listo(p,900);await p.waitForSelector('.ven-b .ven');await p.waitForTimeout(300);
  const ven=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.ven-i'),function(li){return li.querySelector('.ven-c').textContent+' | '+li.querySelector('.ven-q a,.ven-q').firstChild.textContent+' | '+(li.className.match(/ven-(mal|aviso)/)||[''])[0]})});
  r.cumple(/^Vencido hace 2 días \| Sabritas · Vence \| ven-mal/.test(ven[0]),'lo vencido va primero y en rojo',ven);
  r.cumple(ven.some(function(t){return /^En 3 días \| Gepp · Vence \| ven-aviso/.test(t)})&&!ven.some(function(t){return /Lala/.test(t)}),'las compras por pagar, sin las pagadas',ven);
  r.cumple(ven.some(function(t){return /^En 5 días \| Préstamo de la camioneta · pago 1 de 12/.test(t)})&&ven.some(function(t){return /^En 10 días \| Bimbo · Factura 88/.test(t)})&&!ven.some(function(t){return /Coca/.test(t)}),'el siguiente pago de un plan y las cuentas por pagar sin pagar',ven);
  r.cumple(await p.evaluate(function(id){return [].some.call(document.querySelectorAll('.ven-q a'),function(a){return a.getAttribute('href').indexOf(id)>=0})},docPagos),'cada aviso lleva a su página');
  await p.selectOption('.ven-b [data-ven="dias"]','7');await p.waitForTimeout(300);
  r.cumple(!(await p.textContent('.ven-b')).includes('Bimbo'),'con 7 días, lo de dentro de 10 ya no sale');
  await revisar(p,r,'indicadores y vencimientos (escritorio)');
  const docInd=await p.evaluate(function(){return AT.docActual.id});

  /* Presupuesto del mes */
  await nuevoDoc(p,base,'presupuesto');
  await p.waitForFunction(function(){return document.querySelectorAll('.bd[data-bd]').length===2&&document.querySelector('.rep .rep-k')},null,{timeout:8000});
  await p.evaluate(function(f){
    var ids=AT.inventario.ids(),B=AT.bases,pb=B.base(ids.presupuesto);
    var pres=B.filas(pb.id),set=function(cat,m){var x=B.clonar(pres.filter(function(r){return r.v['r-cat']===cat})[0]);x.v['r-monto']=m;return x};
    return B.guardarFilas([set('Renta',5000),set('Luz',800),set('Publicidad',500)]).then(function(){
      return B.guardarFilas([['Renta de noviembre','Renta',5000],['Recibo de luz','Luz',950],['Volantes','Publicidad',200],['Gasolina','Transporte',300]].map(function(x,i){var r=B.nuevaFila(ids.gastos,{'g-con':x[0],'g-fecha':f.hoy,'g-cat':x[1],'g-monto':x[2]});r.orden=i+1;return r}));
    });
  },{hoy:HOY});
  await p.waitForTimeout(500);
  const pres=await filasT(p,'.rep .rep-t tbody tr');
  r.cumple(pres.some(function(t){return /^Luz · \$950\.00 · \$800\.00 · −\$150\.00 \(te pasaste\) · 119 %/.test(t)})&&pres.some(function(t){return /^Publicidad · \$200\.00 · \$500\.00 · \$300\.00 · 40 %/.test(t)}),'real contra presupuesto, con lo disponible y lo usado',pres);
  r.cumple(pres.some(function(t){return /^Transporte · \$300\.00 · \$0\.00 · −\$300\.00/.test(t)}),'lo que no tenía presupuesto también sale',pres);
  r.cumple(await p.evaluate(function(){return document.querySelectorAll('.rep .rep-t tbody .rep-disp.rep-baja').length===2}),'lo que se pasó, en rojo');
  const kp=await p.locator('.rep .rep-k dd').allTextContents();
  r.cumple(kp[0]==='$6,450.00'&&kp[1]==='$6,300.00'&&/−\$150\.00/.test(kp[2]),'real, presupuesto y disponible del mes',kp);
  await revisar(p,r,'presupuesto (escritorio)');

  /* Al imprimir */
  await p.goto(base+'imprimir.html?id='+docInd);await p.waitForSelector('.pagedjs_page',{timeout:15000});await p.waitForTimeout(800);
  const imp=await p.evaluate(function(){return {ind:document.querySelectorAll('.ind-papel .ind-t').length,ven:document.querySelectorAll('.ven-papel .ven-i').length,botones:document.querySelectorAll('.pagedjs_page button').length}});
  r.cumple(imp.ind===3&&imp.ven>=3&&imp.botones===0,'al imprimir salen los indicadores y los vencimientos, sin botones',imp);
  r.cumple(p.errores.length===0,'imprimir sin errores',p.errores);

  /* Celular oscuro */
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(function(){AT.ajustes.set('tema','dark')});
  await p.goto(base+'documento.html?id='+docInd);await listo(p,900);await p.waitForSelector('.ind .ind-t');await p.waitForTimeout(400);
  await revisar(p,r,'indicadores y vencimientos en celular (oscuro)');
  await cerrar(p);
});
