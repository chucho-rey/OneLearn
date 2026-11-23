/* Bloque «Plan de pagos»: con el monto y el número de pagos calcula cada pago (el último absorbe el redondeo);
   con un pago fijo calcula cuántos pagos son; arma las fechas (semanal, quincenal, mensual); marcar un pago lo
   descuenta de lo que falta, al editar y al leer, y se guarda. Markdown, celular y variantes de lectura. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}
function datos(p){
  return p.evaluate(function(){
    var b=document.querySelector('.pg');
    return {calc:(b.querySelector('.pg-calc')||{}).textContent||'',k:[].map.call(b.querySelectorAll('.pg-k dd'),function(x){return x.textContent}).join(' | '),
      sig:(b.querySelector('.pg-sig')||{}).textContent||'',n:b.querySelectorAll('.pg-i').length,
      pagos:[].map.call(b.querySelectorAll('.pg-i'),function(x){return x.querySelector('.pg-f').textContent+' '+x.querySelector('.pg-m').textContent}).slice(0,4).join(' / '),
      ultimo:(b.querySelector('.pg-i:last-child .pg-m')||{}).textContent||''};
  });
}

prueba('Plan de pagos',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:390,alto:844,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(){AT.crear.nuevo('notas');return 1}).catch(function(){return 1})]);await listo(p,400);
  await p.click('.ed-cuerpo');
  await p.keyboard.type('/pagos');await p.waitForTimeout(200);
  r.igual(await p.textContent('.menu-barra .menu-i b'),'Plan de pagos','«/pagos» ofrece el plan de pagos (en cualquier documento)');
  await p.keyboard.press('Enter');await p.waitForSelector('.pg-ed');await p.waitForTimeout(100);
  r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('data-c')}),'monto','el cursor queda en el monto total');
  r.cumple(/Escribe el monto total/.test(await p.textContent('.pg-ed')),'sin monto, pide escribirlo');

  /* $20,000 en 12 pagos mensuales */
  await p.fill('.pg-ed [data-c="titulo"]','Préstamo de la moto');
  await p.fill('.pg-ed [data-c="monto"]','20000');
  await p.fill('.pg-ed [data-c="inicio"]','2026-01-15');await p.waitForTimeout(150);
  let d=await datos(p);
  r.cumple(d.calc==='12 pagos de $1,666.67 (el último, $1,666.63).'&&d.n===12&&d.ultimo==='$1,666.63','$20,000 en 12 pagos: 11 de $1,666.67 y el último de $1,666.63, que suman exacto',d);
  r.cumple(/^15 ene\.? 2026 \$1,666\.67 \/ 15 feb\.? 2026 \$1,666\.67 \/ 15 mar\.? 2026/.test(d.pagos),'cada pago lleva su fecha, mes con mes',d.pagos);
  r.igual(d.k,'$20,000.00 | $0.00 | $20,000.00 | 0 de 12','el resumen: total, pagado, lo que falta y pagos hechos');
  await revisar(p,r,'plan de pagos en celular');

  /* Marcar pagos */
  await p.check('.pg-ed [data-pago="1"]');await p.check('.pg-ed [data-pago="2"]');await p.waitForTimeout(150);
  d=await datos(p);
  r.cumple(d.k==='$20,000.00 | $3,333.34 | $16,666.66 | 2 de 12'&&/Siguiente pago: \$1,666\.67 el 15 mar\.? 2026\./.test(d.sig),'marcar dos pagos los descuenta de lo que falta y dice el siguiente',d);
  r.cumple(await p.evaluate(function(){return document.querySelectorAll('.pg-ed .pg-i.pagado').length===2&&/Pagado el/.test(document.querySelector('.pg-ed .pg-ok').textContent)}),'los pagos hechos se marcan con la fecha en que los marcaste');

  /* Con un pago fijo, quincenal */
  await p.check('.pg-ed [data-c="modo"][value="cuota"]');
  await p.fill('.pg-ed [data-c="cuota"]','3000');
  await p.selectOption('.pg-ed [data-c="frecuencia"]','quincenal');await p.waitForTimeout(150);
  d=await datos(p);
  r.cumple(d.calc==='7 pagos (el último, de $2,000.00).'&&d.n===7&&d.ultimo==='$2,000.00','con un pago fijo de $3,000, son 7 pagos y el último de $2,000',d);
  r.cumple(/^15 ene\.? 2026 \$3,000\.00 \/ 30 ene\.? 2026 \$3,000\.00 \/ 15 feb\.? 2026/.test(d.pagos)&&d.k==='$20,000.00 | $6,000.00 | $14,000.00 | 2 de 7','quincenal: dos pagos al mes; los ya pagados se conservan',d);
  await esperarGuardado(p);

  /* Al leer también se marca, y se guarda */
  await p.click('#docModo');await p.waitForSelector('.pg-leer');
  await p.check('.pg-leer [data-pago="3"]');await p.waitForTimeout(150);
  r.cumple(/\$9,000\.00/.test(await p.textContent('.pg-leer .pg-k'))&&/3 de 7/.test(await p.textContent('.pg-leer .pg-k')),'en modo lectura también se marca como pagado');
  await esperarGuardado(p);
  await revisar(p,r,'plan de pagos al leer en celular');
  await p.reload();await listo(p,500);
  const g=await p.evaluate(function(){var b=null;AT.docActual.contenido.content.forEach(function(x){if(x.type==='pagos')b=x});return {pagados:Object.keys(b.attrs.pagados).sort().join(','),modo:b.attrs.modo,titulo:b.attrs.titulo}});
  r.cumple(g.pagados==='1,2,3'&&g.modo==='cuota'&&g.titulo==='Préstamo de la moto','se guarda: pagos marcados, modo y nombre',g);
  const md=await p.evaluate(function(){return AT.documentoMarkdown(AT.docActual)});
  r.cumple(/\*\*Préstamo de la moto\*\*/.test(md)&&/- \[x\] Pago 3 · 15 feb\.? 2026 · \$3,000\.00/.test(md)&&/- \[ \] Pago 7 · .* · \$2,000\.00/.test(md),'el Markdown lleva el plan con sus pagos marcados',md.slice(0,400));
  const doc=await p.evaluate(function(){return AT.docActual});
  await cerrar(p);

  /* Variantes de lectura y escritorio */
  for(const [ancho,aj] of [[390,{tema:'dark',contraste:'high',escala:1.5,fuente:'opendyslexic'}],[1280,{tema:'dark'}]]){
    const q=await pagina(browser,{ancho:ancho,ajustes:aj,reducir:true});
    await q.goto(base+'inicio.html');await listo(q);
    await q.evaluate(function(x){return AT.datos.documentos.guardar(x,{conservarFecha:true}).then(function(){return 1})},doc);
    await q.goto(base+'documento.html?id='+doc.id);await listo(q,500);
    const modo=await q.textContent('#docModo');
    await revisar(q,r,'plan de pagos '+ancho+'px ('+(/Editar/.test(modo)?'leer':'editar')+')');
    await q.click('#docModo');await q.waitForSelector('.pg');await q.waitForTimeout(200);
    await revisar(q,r,'plan de pagos '+ancho+'px ('+(/Editar/.test(modo)?'editar':'leer')+')');
    await cerrar(q);
  }
});
