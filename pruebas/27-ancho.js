/* Ancho y detalles visuales: las páginas de trabajo (documentos e Inicio) usan más ancho en escritorio que las
   lecciones; «Ancho completo» por documento y «Toda la pantalla» en Lectura; la pista del editor no se encima en las
   celdas de una tabla; los enlaces con forma de botón no se ven como enlaces; las selecciones de una base son
   etiquetas de color (pagado en verde, pendiente en amarillo, vencido en rojo); contraste y desbordes. */
'use strict';
const {prueba,pagina,listo,revisar}=require('./lib');

const AHORA=Date.now();
const RESPALDO={app:'OneBook',formato:1,documentos:[{formato:1,tipo:'notas',id:'d-ancho01',titulo:'Pagos del mes',props:[],creado:AHORA,editado:AHORA,
  contenido:{type:'doc',content:[
    {type:'paragraph',attrs:{id:'b-an01'},content:[{type:'text',text:'Los pagos de este mes, con su estatus.'}]},
    {type:'basedatos',attrs:{id:'b-an02',base:'bd-ancho01',vista:''}},
    {type:'table',attrs:{id:'b-an03'},content:[
      {type:'tableRow',content:[{type:'tableHeader',content:[{type:'paragraph',content:[{type:'text',text:'Producto'}]}]},{type:'tableHeader',content:[{type:'paragraph',content:[{type:'text',text:'Quedan'}]}]}]},
      {type:'tableRow',content:[{type:'tableCell',content:[{type:'paragraph'}]},{type:'tableCell',content:[{type:'paragraph'}]}]}]}]}}],
  bases:[{id:'bd-ancho01',nombre:'Pagos',doc:'d-ancho01',creado:AHORA,editado:AHORA,
    columnas:[{id:'c1',nombre:'Concepto',tipo:'texto'},{id:'c2',nombre:'Estatus',tipo:'seleccion',opciones:['Pendiente','Programado','Pagado','Vencido']},
      {id:'c3',nombre:'Fecha',tipo:'fecha'},{id:'c4',nombre:'Monto',tipo:'moneda',pie:'suma'}],
    vistas:[{id:'v1',nombre:'Tabla',tipo:'tabla',q:'',f:{col:'',op:'contiene',val:''},s:{col:'',dir:1},s2:{col:'',dir:1},ocultas:[]}]}],
  filas:[['Renta','Pagado','2026-11-01',12000],['Luz','Pendiente','2026-11-12',850.5],['Internet','Vencido','2026-11-05',650],['Software','Programado','2026-11-20',499],['Agua','','2026-11-25',210]]
    .map(function(x,i){return {id:'f-an'+i,base:'bd-ancho01',orden:i,creado:AHORA,editado:AHORA,v:{c1:x[0],c2:x[1]||undefined,c3:x[2],c4:x[3]}}})};

function ancho(p,sel){return p.evaluate(function(s){var e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().width):0},sel)}

prueba('Ancho y detalles visuales',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1920,alto:1000,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  await p.evaluate(function(d){return AT.datos.importar(d)},RESPALDO);

  /* Lección: su columna de lectura no cambia; documento e Inicio: más ancho */
  await p.goto(base+'lecciones/ram.html');await listo(p);
  const wLec=await ancho(p,'.page');
  r.cumple(wLec<=840,'la lección conserva su columna de lectura',wLec);
  await p.goto(base+'inicio.html');await listo(p);
  const wIni=await ancho(p,'.page');
  r.cumple(wIni>1000,'el Inicio usa más ancho en escritorio',wIni);
  const btn=await p.evaluate(function(){var a=document.querySelector('.ini-sec-h a.btn');if(!a)return null;var cs=getComputedStyle(a);return {deco:cs.textDecorationLine,color:cs.color,fg:getComputedStyle(document.body).color}});
  r.cumple(btn&&btn.deco==='none'&&btn.color===btn.fg,'un enlace con forma de botón no se ve como enlace',btn);

  await p.goto(base+'documento.html?id=d-ancho01');await listo(p,800);
  await p.waitForSelector('.bd [data-bd-nombre]');
  const wDoc=await ancho(p,'.page');
  r.cumple(wDoc>1000,'el documento usa más ancho en escritorio',wDoc);
  const wP=await ancho(p,'.ed-cuerpo p');
  r.cumple(wP>900,'los párrafos de un documento usan el ancho de la página',wP);

  /* Selección como etiqueta de color según lo que dice */
  const tonos=await p.evaluate(function(){var o={};document.querySelectorAll('.bd select.bd-sel').forEach(function(s){o[s.value||'(vacía)']=s.getAttribute('data-tono')});return o});
  r.cumple(tonos.Pagado==='bien'&&tonos.Pendiente==='aviso'&&tonos.Vencido==='mal'&&/^[abc]$/.test(tonos.Programado)&&tonos['(vacía)']==='','las selecciones se pintan como etiquetas: pagado, pendiente, vencido y las demás',tonos);
  const pill=await p.evaluate(function(){var s=[...document.querySelectorAll('.bd select.bd-sel')].find(function(x){return x.value==='Pagado'});var cs=getComputedStyle(s);return {radio:parseFloat(cs.borderTopLeftRadius),fondo:cs.backgroundColor}});
  r.cumple(pill.radio>=8&&pill.fondo!=='rgba(0, 0, 0, 0)','la etiqueta es redonda y con fondo',pill);
  const luz=p.locator('.bd select.bd-sel').nth(1);
  const antes=await luz.inputValue();
  await luz.selectOption('Pagado');await p.waitForTimeout(400);
  const tLuz=await p.evaluate(function(){return [...document.querySelectorAll('.bd tbody tr')].map(function(tr){var t=tr.querySelector('.bd-tit');var s=tr.querySelector('select.bd-sel');return t&&t.value==='Luz'?s.getAttribute('data-tono'):null}).filter(Boolean)[0]});
  r.cumple(antes==='Pendiente'&&tLuz==='bien','al cambiar la selección cambia su color',{antes,tLuz});

  /* La pista del editor no aparece en las celdas vacías de una tabla */
  await p.click('.ed-cuerpo td p');await p.waitForTimeout(250);
  const pista=await p.evaluate(function(){var c=document.querySelector('.ed-cuerpo td p.is-empty');return c?getComputedStyle(c,'::before').content:'sin celda vacía'});
  r.cumple(pista==='none','la pista no se encima en una celda vacía de la tabla',pista);

  /* La barra de herramientas no esconde botones tras una barra de desplazamiento en escritorio */
  const tb=await p.evaluate(function(){var t=document.querySelector('.doc-barra .tb');return {sw:t.scrollWidth,cw:t.clientWidth}});
  r.cumple(tb.sw<=tb.cw+1,'la barra de herramientas cabe completa',tb);

  await revisar(p,r,'documento ancho 1920');

  /* «Ancho completo» en el documento: se guarda y vuelve al recargar */
  await p.click('#docMas');await p.click('.menu-i:has-text("Ancho completo")');await p.waitForTimeout(400);
  const comp=await p.evaluate(function(){return document.documentElement.classList.contains('doc-completo')});
  const wComp=await ancho(p,'.page'),wMain=await ancho(p,'main')||await ancho(p,'#main');
  r.cumple(comp&&wComp>wDoc,'«Ancho completo» usa todo el ancho',{comp,wComp,wDoc,wMain});
  await p.reload();await listo(p,700);
  const guardado=await p.evaluate(function(){return AT.datos.documentos.leer('d-ancho01').then(function(d){return {c:document.documentElement.classList.contains('doc-completo'),a:!!d.anchoCompleto,ed:d.editado}})});
  r.cumple(guardado.c&&guardado.a&&guardado.ed===AHORA,'el ancho completo se conserva al recargar sin cambiar la fecha de edición',guardado);
  await p.click('#docMas');
  r.cumple(await p.locator('.menu-i:has-text("Ancho normal")').count()===1,'el menú ofrece volver al ancho normal');
  await p.click('.menu-i:has-text("Ancho normal")');await p.waitForTimeout(300);
  r.cumple(!await p.evaluate(function(){return document.documentElement.classList.contains('doc-completo')}),'«Ancho normal» regresa a la columna');

  /* Lectura: «Toda la pantalla» y «Estrecho» */
  await p.evaluate(function(){AT.ajustes.set('ancho','completo')});await p.waitForTimeout(150);
  const wTodo=await ancho(p,'.page');
  r.cumple(wTodo>wDoc,'«Toda la pantalla» en Lectura ensancha el documento',{wTodo,wDoc});
  await p.evaluate(function(){AT.ajustes.set('ancho','estrecho')});await p.waitForTimeout(150);
  const wEst=await ancho(p,'.page');
  r.cumple(wEst<wDoc&&wEst<=840,'«Estrecho» también estrecha los documentos',wEst);
  await p.evaluate(function(){AT.ajustes.set('ancho','normal')});
  await p.close();

  /* Celular oscuro y escritorio grande: sin desbordes y con contraste */
  for(const [w,aj] of [[390,{tema:'dark'}],[1440,{}],[1280,{contraste:'high'}]]){
    const q=await pagina(browser,{ancho:w,alto:900,reducir:true,ajustes:aj});
    await q.goto(base+'inicio.html');await listo(q);
    await q.evaluate(function(d){return AT.datos.importar(d)},RESPALDO);
    await q.goto(base+'documento.html?id=d-ancho01');await listo(q,800);
    await q.waitForSelector('.bd [data-bd-nombre]');
    await revisar(q,r,'documento '+w+' '+JSON.stringify(aj));
    await q.goto(base+'inicio.html');await listo(q,500);
    await revisar(q,r,'Inicio '+w+' '+JSON.stringify(aj));
    await q.close();
  }
});
