/* Página de bienvenida para empresas (etapa E5). La ve quien llega por primera vez; quien ya usa OneBook va directo a su
   Inicio (inicio.html), salvo con ?conoce. Portada para pymes con un Inicio de ejemplo dibujado, la empresa de ejemplo
   para explorar (ejemplo.html; con una empresa ya creada, la nota lo dice), cómo se organiza, herramientas por área, la
   calculadora de precio, precios (local gratis y la nube «Próximamente» sin cifra) y preguntas. Ver la página no guarda
   nada. Ya no hay plan de pagos para probar ni bienvenida para estudiantes. Contraste y desbordes en celular,
   escritorio y las variantes de lectura. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function nadaGuardado(p){
  return p.evaluate(function(){return !Object.keys(localStorage).some(function(k){return k.indexOf('aprende-tecnologia:')===0})});
}

prueba('Página de bienvenida para empresas',async function({browser,base,r}){
  /* ---------- Primera visita ---------- */
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  await p.goto(base);await listo(p,300);
  const v=await p.evaluate(function(){
    return {url:location.pathname+location.search,h1:document.querySelectorAll('h1').length,titulo:document.querySelector('h1').textContent,
      doc:document.title,app:!!document.querySelector('.side,.topbar'),desc:document.querySelector('meta[name="description"]').content,
      marca:document.querySelector('.lp-cab .brand').textContent};
  });
  r.cumple(/\/$/.test(v.url)&&v.h1===1&&v.titulo==='Tu empresa, en bloques.'&&/^OneBook/.test(v.doc)&&v.marca==='OneBook'&&/empresa/.test(v.desc),'quien llega por primera vez ve la bienvenida de OneBook para empresas',v);
  r.cumple(!v.app&&v.desc.length>80,'es una página propia, sin la barra de la app, con descripción para buscadores');
  r.igual(p.externos.length,0,'no pide nada a otros servidores');
  await p.keyboard.press('Tab');
  r.cumple(await p.evaluate(function(){var a=document.activeElement;return a.classList.contains('lp-saltar')&&a.getBoundingClientRect().top>=0}),'la primera tecla Tab muestra «Ir al contenido»');
  r.cumple(/5 a 100 personas/.test(await p.textContent('.lp-eti'))&&(await p.$$('.lp-mini-salas li')).length===5&&(await p.$$('.lp-mini-k > div')).length===3,'la portada es para pymes y dibuja un Inicio con salas e indicadores');

  /* La empresa de ejemplo, cómo se organiza y las herramientas por área */
  const s=await p.evaluate(function(){
    return {ej:[].map.call(document.querySelectorAll('a[data-ejemplo]'),function(a){return a.getAttribute('href')}),
      nota:document.getElementById('lpEjNota').textContent,
      pasos:[].map.call(document.querySelectorAll('#como .lp-pasos h3'),function(h){return h.textContent}).join(' | '),
      areas:[].map.call(document.querySelectorAll('#areas h3'),function(h){return h.textContent}).join(' | ')};
  });
  r.cumple(s.ej.length===3&&s.ej.every(function(h){return h==='ejemplo.html'})&&/Crear mi empresa/.test(s.nota),'«Explora una empresa de ejemplo» abre ejemplo.html (tres veces) y dice cómo dejarla',s);
  r.igual(s.pasos,'Crea tu empresa | Agrega a tu gente | Trabaja en salas | Arma tu Inicio','cómo se organiza: empresa, gente, salas e Inicio');
  r.cumple(/Ventas/.test(s.areas)&&/Almacén/.test(s.areas)&&/Administración/.test(s.areas)&&/Recursos humanos/.test(s.areas),'herramientas por área',s.areas);

  /* ---------- ¿A cuánto lo vendo? (el bloque «Precio de venta») ---------- */
  function precio(){return p.evaluate(function(){return [].map.call(document.querySelectorAll('#lpPrecio .nb-k > div'),function(d){return d.querySelector('dt').textContent+': '+d.querySelector('dd').textContent}).join(' | ')})}
  r.igual(await precio(),'Precio de venta: $13.00 | Ganas por pieza: +$3.00 | Margen sobre el precio: 23.1 % | Ganancia sobre el costo: 30 %','la calculadora de precio llega lista: costo $10 y 30 % de ganancia');
  await p.fill('#lpPrecio [data-k="costo"]','20');await p.selectOption('#lpPrecio [data-k="iva"]','si');await p.fill('#lpPrecio [data-k="comision"]','3.5');
  await p.waitForTimeout(100);
  r.cumple(/^Precio de venta: \$31\.44 \| Ganas por pieza: \+\$6\.00/.test(await precio()),'con IVA y comisión de la tarjeta, sube el precio para que te queden $6',await precio());
  await p.check('#lpPrecio [data-k="modo"][value="precio"]');await p.fill('#lpPrecio [data-k="precio"]','22');await p.waitForTimeout(100);
  r.cumple(/Ganas por pieza: −\$1\.80/.test(await precio())&&await p.evaluate(function(){return !!document.querySelector('#lpPrecio .nb-mal .nb-d.neg')}),'con un precio que ya tienes dice la ganancia real; si pierdes, en rojo y con signo',await precio());
  r.cumple(await nadaGuardado(p),'ver la página y usar la calculadora no guarda nada en el navegador');
  await revisar(p,r,'bienvenida en escritorio');

  /* Navegación, precios y preguntas */
  const enl=await p.evaluate(function(){
    return {nav:[].map.call(document.querySelectorAll('.lp-nav a'),function(a){return a.textContent+'→'+a.getAttribute('href')}).join(', '),
      crea:[].filter.call(document.querySelectorAll('a.btn'),function(a){return a.textContent==='Crea tu empresa'}).map(function(a){return a.getAttribute('href')}),
      planes:[].map.call(document.querySelectorAll('.lp-planes>li'),function(li){return li.querySelector('h3').firstChild.textContent.trim()+' '+li.querySelector('.lp-precio b').textContent}).join(' / '),
      cifra:/\$\d/.test(document.querySelector('#precios').textContent),
      faq:[].map.call(document.querySelectorAll('.lp-faq summary'),function(x){return x.textContent}).join(' | '),
      pagos:!!document.querySelector('#lpForm,#lpPlan,#lpGuardar,#prueba'),contacto:/contacto|freelance/i.test(document.body.textContent)};
  });
  r.igual(enl.nav,'Cómo funciona→#como, Herramientas→#areas, Precios→#precios, Entrar→inicio.html','la cabecera lleva a cómo funciona, herramientas, precios y la app');
  r.cumple(await p.evaluate(function(){return !document.querySelector('a[href*="estudiantes"],a[href*="lecciones/"],a[href*="acerca"],#lpTambien')}),'ninguna parte de la bienvenida lleva a lo de estudio');
  r.cumple(enl.crea.length===3&&enl.crea.every(function(h){return h==='entrar.html'}),'«Crea tu empresa» abre «Crea tu empresa»',enl.crea);
  r.cumple(enl.planes==='Local Gratis / Nube Por anunciar'&&!enl.cifra,'precios: local gratis y la nube «Próximamente», sin cifra',enl);
  r.cumple(/varias personas/.test(enl.faq)&&/seguros/.test(enl.faq)&&/CFDI/.test(enl.faq)&&/nómina/.test(enl.faq)&&/Excel/.test(enl.faq),'preguntas de una empresa: varias personas, permisos, facturas, nómina y Excel',enl.faq);
  r.cumple(!enl.pagos&&!enl.contacto,'sin el plan de pagos para probar, sin contacto ni freelance');
  await p.click('.lp-faq summary:has-text("¿Los permisos son seguros?")');
  r.cumple(/no son una protección/.test(await p.textContent('.lp-faq details[open] p')),'una pregunta se abre al tocarla y no promete de más');

  /* ---------- Crea tu empresa ---------- */
  await Promise.all([p.waitForURL(/entrar\.html$/),p.click('.lp-hero a.btn.pri')]);await listo(p);
  r.cumple(/Paso 1 de 3/.test(await p.textContent('#enPaso'))&&await p.isVisible('#enNegocio'),'«Crea tu empresa» empieza con los datos de la empresa');
  await p.fill('#enNegocio','Mi tiendita');await p.fill('#enNombre','Rosa');await p.click('#enSig');await p.waitForTimeout(150);
  await p.click('#enSig');await p.waitForTimeout(150);
  await Promise.all([p.waitForURL(/inicio\.html$/,{timeout:10000}),p.click('#enSig')]);await listo(p,300);
  await p.goto(base);await p.waitForURL(/inicio\.html$/);await listo(p);
  r.cumple(/inicio\.html$/.test(p.url())&&!!await p.$('#saludo'),'después, la raíz lleva directo al Inicio');
  await p.goto(base+'index.html?conoce');await listo(p);
  r.cumple(/index\.html\?conoce$/.test(p.url())&&!!await p.$('#lpTitulo'),'con ?conoce se puede volver a ver la bienvenida');
  r.cumple(/ventana privada/.test(await p.textContent('#lpEjNota')),'con una empresa ya creada, la nota dice que el ejemplo no la toca y sugiere una ventana privada');
  await cerrar(p);

  /* ---------- La página de estudiantes ya no existe ---------- */
  const e=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  const res=await e.goto(base+'estudiantes.html');
  r.igual(res.status(),404,'estudiantes.html ya no se publica');
  await cerrar(e);

  /* ---------- Celular y variantes de lectura ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await c.goto(base);await listo(c,300);
  await revisar(c,r,'bienvenida en celular');
  r.cumple(await c.evaluate(function(){var n=document.querySelector('.lp-nav'),b=n.querySelector('.btn');return getComputedStyle(n.querySelector('a:not(.btn)')).display==='none'&&b.getBoundingClientRect().height>=34}),'en celular la cabecera deja solo «Entrar», con buen tamaño para el dedo');
  r.cumple(await c.evaluate(function(){var k=document.querySelector('.lp-mini-k');return getComputedStyle(k).gridTemplateColumns.split(' ').length===1}),'en celular las cifras del Inicio de ejemplo van una debajo de otra');
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
