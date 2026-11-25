/* Páginas de bienvenida. index.html (negocios): la ve quien llega por primera vez; quien ya usa OneBook va directo a
   su Inicio (inicio.html), salvo con ?conoce. Dibuja con bloques reales una página de ejemplo y un plan de pagos para
   probar; verla y usarla no guarda nada, y «Guárdalo en tu espacio» lo convierte en un documento (con los datos
   revisados). Precios: local gratis y la nube con precio estimado. Ya no hay bienvenida para estudiantes (lo de estudio
   se separó de OneBook). Contraste y desbordes en celular, escritorio y las variantes de lectura. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function nadaGuardado(p){
  return p.evaluate(function(){return !Object.keys(localStorage).some(function(k){return k.indexOf('aprende-tecnologia:')===0})});
}
function plan(p,sel){
  return p.evaluate(function(s){
    var b=document.querySelector(s);
    return {k:[].map.call(b.querySelectorAll('.pg-k dd'),function(x){return x.textContent}).join(' | '),n:b.querySelectorAll('.pg-i').length,
      primero:(b.querySelector('.pg-i .pg-m')||{}).textContent||'',ultimo:(b.querySelector('.pg-i:last-child .pg-m')||{}).textContent||'',
      fechas:[].slice.call(b.querySelectorAll('.pg-i .pg-f'),0,3).map(function(x){return x.textContent}).join(' / '),
      bloqueadas:b.querySelectorAll('.pg-i input:disabled').length};
  },sel);
}

prueba('Páginas de bienvenida',async function({browser,base,r}){
  /* ---------- Negocios: primera visita ---------- */
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  await p.goto(base);await listo(p,300);
  const v=await p.evaluate(function(){
    return {url:location.pathname+location.search,h1:document.querySelectorAll('h1').length,titulo:document.querySelector('h1').textContent,
      doc:document.title,app:!!document.querySelector('.side,.topbar'),desc:document.querySelector('meta[name="description"]').content,
      marca:document.querySelector('.lp-cab .brand').textContent};
  });
  r.cumple(/\/$/.test(v.url)&&v.h1===1&&v.titulo==='Tu negocio, en bloques.'&&/^OneBook/.test(v.doc)&&v.marca==='OneBook','quien llega por primera vez ve la bienvenida de OneBook para negocios',v);
  r.cumple(!v.app&&v.desc.length>80,'es una página propia, sin la barra de la app, con descripción para buscadores');
  r.igual(p.externos.length,0,'no pide nada a otros servidores');
  await p.keyboard.press('Tab');
  r.cumple(await p.evaluate(function(){var a=document.activeElement;return a.classList.contains('lp-saltar')&&a.getBoundingClientRect().top>=0}),'la primera tecla Tab muestra «Ir al contenido»');

  /* La página de ejemplo está hecha con bloques reales */
  const hoja=await p.evaluate(function(){
    var h=document.getElementById('lpHoja');
    return {aviso:!!h.querySelector('.callout.aviso'),tareas:h.querySelectorAll('ul.tareas li.tarea').length,hechas:h.querySelectorAll('li.tarea.hecha').length,
      tabla:h.querySelectorAll('tbody tr').length,pg:!!h.querySelector('section.pg.pg-leer')};
  });
  r.cumple(hoja.aviso&&hoja.tareas===3&&hoja.hechas===2&&hoja.tabla===3&&hoja.pg,'la página de ejemplo dibuja un aviso, una lista de tareas, un plan de pagos y una tabla',hoja);
  const ej=await plan(p,'#lpHoja .pg');
  const pagadosEj=new Date().getDate()>=15?4:3;
  r.cumple(ej.k==='$18,000.00 | $'+(pagadosEj*1500).toLocaleString('en-US')+'.00 | $'+((12-pagadosEj)*1500).toLocaleString('en-US')+'.00 | '+pagadosEj+' de 12'&&ej.bloqueadas===12,
    'el plan de ejemplo va al corriente (empezó hace tres meses) y no se puede marcar',ej);

  /* ---------- Pruébalo aquí ---------- */
  let d=await plan(p,'#lpPlan .pg');
  r.cumple(d.k==='$20,000.00 | $0.00 | $20,000.00 | 0 de 12'&&d.n===12&&d.primero==='$1,666.67'&&d.ultimo==='$1,666.63'&&d.bloqueadas===0,'al llegar ya muestra $20,000 en 12 pagos, y se pueden marcar',d);
  await p.fill('#lpMonto','6000');await p.fill('#lpPagos','3');await p.selectOption('#lpFrec','quincenal');await p.fill('#lpInicio','2026-01-15');
  await p.waitForTimeout(100);
  d=await plan(p,'#lpPlan .pg');
  r.cumple(d.n===3&&d.primero==='$2,000.00'&&/^15 ene\.? 2026 \/ 30 ene\.? 2026 \/ 15 feb\.? 2026$/.test(d.fechas),'al cambiar los datos se recalcula: 3 pagos quincenales de $2,000',d);
  await p.check('#lpPlan [data-pago="1"]');await p.waitForTimeout(100);
  d=await plan(p,'#lpPlan .pg');
  r.cumple(d.k==='$6,000.00 | $2,000.00 | $4,000.00 | 1 de 3','marcar un pago lo descuenta de lo que falta',d);
  r.cumple(await p.evaluate(function(){return document.activeElement&&document.activeElement.getAttribute('data-pago')==='1'}),'el foco se queda en la casilla que marcaste');
  await p.waitForTimeout(900);
  r.igual(await p.textContent('#lpVoz'),'3 pagos de $2,000.00. Te faltan $4,000.00.','un resumen corto se anuncia a los lectores de pantalla');
  /* ---------- ¿A cuánto lo vendo? (el bloque «Precio de venta») ---------- */
  function precio(){return p.evaluate(function(){return [].map.call(document.querySelectorAll('#lpPrecio .nb-k > div'),function(d){return d.querySelector('dt').textContent+': '+d.querySelector('dd').textContent}).join(' | ')})}
  r.igual(await precio(),'Precio de venta: $13.00 | Ganas por pieza: +$3.00 | Margen sobre el precio: 23.1 % | Ganancia sobre el costo: 30 %','la calculadora de precio llega lista: costo $10 y 30 % de ganancia');
  await p.fill('#lpPrecio [data-k="costo"]','20');await p.selectOption('#lpPrecio [data-k="iva"]','si');await p.fill('#lpPrecio [data-k="comision"]','3.5');
  await p.waitForTimeout(100);
  r.cumple(/^Precio de venta: \$31\.44 \| Ganas por pieza: \+\$6\.00/.test(await precio()),'con IVA y comisión de la tarjeta, sube el precio para que te queden $6',await precio());
  await p.check('#lpPrecio [data-k="modo"][value="precio"]');await p.fill('#lpPrecio [data-k="precio"]','22');await p.waitForTimeout(100);
  r.cumple(/Ganas por pieza: −\$1\.80/.test(await precio())&&await p.evaluate(function(){return !!document.querySelector('#lpPrecio .nb-mal .nb-d.neg')}),'con un precio que ya tienes dice la ganancia real; si pierdes, en rojo y con signo',await precio());
  r.cumple(await nadaGuardado(p),'ver la página y probar el plan no guarda nada en el navegador');
  await revisar(p,r,'bienvenida de negocios en escritorio');

  /* Navegación, precios y preguntas */
  const enl=await p.evaluate(function(){
    return {nav:[].map.call(document.querySelectorAll('.lp-nav a'),function(a){return a.textContent+'→'+a.getAttribute('href')}).join(', '),
      empieza:[].filter.call(document.querySelectorAll('a.btn'),function(a){return a.textContent==='Empieza gratis'}).every(function(a){return a.getAttribute('href')==='entrar.html?perfil=negocio'}),
      planes:[].map.call(document.querySelectorAll('.lp-planes>li'),function(li){return li.querySelector('h3').firstChild.textContent.trim()+' '+li.querySelector('.lp-precio b').textContent}).join(' / '),
      nota:/estimados/.test(document.querySelector('#precios').textContent),
      faq:document.querySelectorAll('.lp-faq details').length,cfdi:/CFDI/.test(document.querySelector('.lp-faq').textContent)};
  });
  r.igual(enl.nav,'Cómo funciona→#como, Precios→#precios, Entrar→inicio.html','la cabecera lleva a cómo funciona, precios y la app (ya no a estudiantes)');
  r.cumple(await p.evaluate(function(){return !document.querySelector('a[href*="estudiantes"],a[href*="lecciones/"],a[href*="acerca"],#lpTambien')}),'ninguna parte de la bienvenida lleva a lo de estudio');
  r.cumple(enl.empieza,'«Empieza gratis» abre «Crea tu espacio» con el perfil de negocio');
  r.cumple(enl.planes==='Local Gratis / Nube $99 / Equipo $199'&&enl.nota,'precios: local gratis y la nube con precio estimado',enl);
  r.cumple(enl.faq>=5&&enl.cfdi,'preguntas frecuentes, incluida la factura (CFDI)');
  await p.click('.lp-faq summary:has-text("¿Es gratis?")');
  r.cumple(await p.isVisible('.lp-faq details[open] p'),'una pregunta se abre al tocarla');

  /* ---------- Guárdalo en tu espacio ---------- */
  await Promise.all([p.waitForURL(/entrar\.html\?perfil=negocio#guardar-pagos$/),p.click('#lpGuardar')]);await listo(p);
  r.cumple(/Paso 1 de 3/.test(await p.textContent('#enPaso'))&&await p.isVisible('#enNegocio'),'primero se crea la empresa: empieza en «Tu empresa»');
  await p.fill('#enNegocio','Mi tiendita');await p.fill('#enNombre','Rosa');await p.click('#enSig');await p.waitForTimeout(150);
  await p.click('#enSig');await p.waitForTimeout(150);
  await Promise.all([p.waitForURL(/documento\.html\?id=/,{timeout:10000}),p.click('#enSig')]);await listo(p,500);
  const g=await p.evaluate(function(){
    var d=AT.docActual,b=d.contenido.content[0];
    return {titulo:d.titulo,tipo:d.tipo,bloque:b.type,monto:b.attrs.monto,pagos:b.attrs.pagos,frec:b.attrs.frecuencia,inicio:b.attrs.inicio,
      pagados:Object.keys(b.attrs.pagados).join(','),id:/^b-/.test(b.attrs.id),url:location.hash,
      quedo:sessionStorage.getItem('onebook:pagos-bienvenida')};
  });
  r.cumple(g.titulo==='Mi plan de pagos'&&g.tipo==='notas'&&g.bloque==='pagos'&&g.monto==='6000'&&g.pagos==='3'&&g.frec==='quincenal'&&g.inicio==='2026-01-15'&&g.pagados==='1'&&g.id&&g.quedo===null,
    '«Guárdalo en tu espacio»: al crear la empresa, se crea un documento con ese plan de pagos (y lo marcado) y se abre',g);
  r.igual(await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.length})}),5,'junto con las páginas sugeridas para empezar');
  await p.goto(base);await p.waitForURL(/inicio\.html$/);await listo(p);
  r.cumple(/inicio\.html$/.test(p.url())&&!!await p.$('#saludo'),'después, la raíz lleva directo al Inicio');
  await p.goto(base+'index.html?conoce');await listo(p);
  r.cumple(/index\.html\?conoce$/.test(p.url())&&!!await p.$('#lpTitulo'),'con ?conoce se puede volver a ver la bienvenida');
  /* Lo que llega por sessionStorage se revisa: nada raro entra al documento */
  await p.evaluate(function(){sessionStorage.setItem('onebook:pagos-bienvenida',JSON.stringify({titulo:'<img src=x onerror=alert(1)>',monto:'abc<script>',pagos:'99999',
    frecuencia:'diaria',inicio:'ayer',modo:'raro',extra:'no',pagados:{'1':'2026-01-01','2':'<b>','x':'2026-01-01'}}))});
  await Promise.all([p.waitForURL(/documento\.html\?id=/,{timeout:10000}),p.goto(base+'inicio.html#guardar-pagos')]);await listo(p,500);
  const m=await p.evaluate(function(){
    var a=AT.docActual.contenido.content[0].attrs;
    return {a:Object.keys(a).sort().join(','),monto:a.monto,pagos:a.pagos,frec:a.frecuencia,inicio:a.inicio,modo:a.modo,pagados:JSON.stringify(a.pagados),img:!!document.querySelector('main img')};
  });
  r.cumple(m.monto===''&&m.pagos==='520'&&m.frec==='mensual'&&m.inicio===''&&m.modo==='plazos'&&m.pagados==='{"1":"2026-01-01"}'&&!/extra/.test(m.a)&&!m.img,
    'un plan alterado en sessionStorage se limpia antes de guardarse',m);
  await cerrar(p);

  /* ---------- La página de estudiantes ya no existe ---------- */
  const e=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  const res=await e.goto(base+'estudiantes.html');
  r.igual(res.status(),404,'estudiantes.html ya no se publica');
  await cerrar(e);

  /* ---------- Celular y variantes de lectura ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await c.goto(base);await listo(c,300);
  await revisar(c,r,'bienvenida de negocios en celular');
  r.cumple(await c.evaluate(function(){var n=document.querySelector('.lp-nav'),b=n.querySelector('.btn');return getComputedStyle(n.querySelector('a:not(.btn)')).display==='none'&&b.getBoundingClientRect().height>=34}),'en celular la cabecera deja solo «Entrar», con buen tamaño para el dedo');
  r.cumple(await c.evaluate(function(){var k=document.querySelector('#lpHoja .pg-k');return getComputedStyle(k).gridTemplateColumns.split(' ').length===2}),'en celular el resumen del plan va en dos columnas');
  await cerrar(c);
  for(const [nombre,aj,ancho,ruta] of [['oscuro',{tema:'dark'},1280,'index.html'],['alto contraste ×1.5 y OpenDyslexic',{contraste:'high',escala:1.5,fuente:'opendyslexic'},390,'index.html'],
    ['oscuro y alto contraste',{tema:'dark',contraste:'high'},900,'index.html']]){
    const q=await pagina(browser,{ancho:ancho,ajustes:aj,reducir:true});
    /* Con ajustes guardados el navegador ya «usa» OneBook: se pide la bienvenida con ?conoce */
    await q.goto(base+ruta+'?conoce');await listo(q,300);
    await revisar(q,r,'bienvenida ('+ruta+') en '+nombre);
    await cerrar(q);
  }
});
