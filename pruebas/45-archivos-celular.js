/* El Inicio en el celular como una app de archivos (archivos.js, archivos.css).
   - En escritorio no cambia: el explorador se ve y la vista de archivos, el «+» y la navegación inferior no.
   - En el celular abre en Páginas: búsqueda en píldora, las salas como carpetas (con su cuenta), Privado, Favoritas y
     Papelera, y las recientes. Una carpeta muestra sus páginas, la ruta en chips y el orden (fecha o nombre); Atrás
     sube a la raíz; el menú «⋯» de cada página es el del explorador; el «+» crea en la sala donde estás.
   - Buscar, la barra lateral (una ubicación abre su carpeta) y abrir una página (sin navegación inferior).
   - Inicio (los tableros) y Empresa (quién eres, Tu empresa, salas y ajustes); la sección se recuerda al recargar.
   - Contraste y desbordes: 390 px claro, oscuro con alto contraste, letra grande con OpenDyslexic y 320 px. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function vis(p,s){return p.isVisible(s)}
async function ejemplo(p,base){
  await p.goto(base+'ejemplo.html');
  await p.waitForURL(/inicio\.html$/,{timeout:20000});await listo(p,1000);
  await p.waitForSelector('.ca-cp');
}
/* Lo que debería tener cada sala (según el modelo de ubicaciones) */
function esperado(p,k){
  return p.evaluate(function(k){
    return AT.datos.documentos.todos().then(function(l){
      var u=AT.ubicaciones.de(k);
      return AT.ubicaciones.paginas(l).map(AT.ubicaciones.info).filter(u.f).map(function(x){return x.titulo}).sort();
    });
  },k);
}
function titulos(p){return p.$$eval('#caLista .ca-f .ca-tx b',function(e){return e.map(function(x){return x.childNodes[0].textContent.trim()})})}

prueba('Vista de archivos en el celular',async function({browser,base,r}){
  /* ---------- Escritorio: sin cambios ---------- */
  const d=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await d.goto(base+'inicio.html');await listo(d,500);
  r.cumple(await vis(d,'#xp')&&!(await vis(d,'#celArchivos'))&&!(await vis(d,'#celNav'))&&!(await vis(d,'#celNuevo'))&&await vis(d,'#iniTabEmp'),
    'en escritorio se ven el explorador y los tableros; la vista de archivos, el «+» y la navegación inferior no');
  r.cumple(d.errores.length===0,'escritorio sin errores',d.errores);
  await cerrar(d);

  /* ---------- Celular: Páginas ---------- */
  const p=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await ejemplo(p,base);
  r.cumple(await p.getAttribute('.cn-b[data-seccion="paginas"]','aria-current')==='page'&&await vis(p,'#celArchivos')&&!(await vis(p,'#xp'))&&!(await vis(p,'#iniTabEmp')),
    'en el celular abre en Páginas, sin el explorador de escritorio ni los tableros');
  r.cumple(await vis(p,'.ca-q input[type="search"]')&&await vis(p,'#celNuevo'),'arriba, la búsqueda en píldora; abajo, el botón «+»');
  const cps=await p.$$eval('.ca-cp',function(e){return e.map(function(x){return x.querySelector('.ca-cp-t').textContent+':'+x.querySelector('small').textContent})});
  r.cumple(['General:2 páginas','Ventas:','Almacén:','Administración:','Recursos humanos:','Privado:','Favoritas:','Papelera:'].every(function(t){return cps.some(function(c){return c.indexOf(t)===0})}),
    'las salas son carpetas, con Privado, Favoritas y Papelera, cada una con su cuenta',cps);
  const ventas=await p.getAttribute('.ca-cp[data-carpeta^="sala:"]:has-text("Ventas")','data-carpeta');
  r.cumple(/ca-c-/.test(await p.getAttribute('.ca-cp[data-carpeta="'+ventas+'"]','class')),'la carpeta de una sala lleva el color de su departamento');
  r.cumple((await p.$$('#caLista .ca-l .ca-f')).length>=1&&(await p.$$('#caLista .ca-l .ca-f')).length<=6,'en la raíz, las páginas recientes (hasta seis)');
  await revisar(p,r,'archivos: raíz (390, claro)');

  /* Entrar a una carpeta */
  await p.click('.ca-cp[data-carpeta="'+ventas+'"]');await p.waitForTimeout(300);
  r.cumple(/#carpeta=sala%3Asa-/.test(p.url()),'la carpeta queda en la dirección',p.url());
  r.cumple(await p.evaluate(function(){return document.activeElement.id==='caT'})&&/Ventas/.test(await p.textContent('#caT')),'el foco va al nombre de la carpeta');
  r.cumple(/Tus páginas/.test(await p.textContent('.ca-ruta'))&&(await p.textContent('.ca-chip.on'))==='Ventas','la ruta en chips: Tus páginas › Ventas');
  const exp=await esperado(p,ventas),hay=(await titulos(p)).slice().sort();
  r.igual(hay.join(' | '),exp.join(' | '),'la carpeta muestra las páginas de su sala');
  r.cumple(/Hoy|Ayer|\d/.test(await p.textContent('#caLista .ca-f small')),'cada página dice cuándo cambió');
  /* Orden */
  await p.click('#caLista [data-orden]');await p.waitForTimeout(200);
  const pn=await titulos(p);
  r.igual(pn.join(' | '),pn.slice().sort(function(a,b){return a.localeCompare(b,'es',{numeric:true,sensitivity:'base'})}).join(' | '),'«Por nombre» las ordena alfabéticamente');
  r.cumple(/Por nombre/.test(await p.textContent('#caLista [data-orden]')),'y el botón dice el orden');
  await p.click('#caLista [data-orden]');await p.waitForTimeout(150);
  /* El «+» crea en esta sala */
  r.cumple(/Crear una página en Ventas/.test(await p.getAttribute('#celNuevo','aria-label')),'el «+» dice dónde va a crear');
  await p.click('#celNuevo');await p.waitForSelector('dialog.crear-dlg[open]');
  r.igual(await p.evaluate(function(){return AT.salaActual}),ventas.slice(5),'y «Crear» se abre en esa sala');
  await p.keyboard.press('Escape');await p.waitForTimeout(250);
  /* El menú de cada página es el del explorador */
  await p.click('#caLista .ca-f [data-mas]');await p.waitForSelector('.xp-menu');
  const mi=await p.$$eval('.xp-menu .xp-mi span',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(mi.indexOf('Abrir')>=0&&mi.indexOf('Personas y permisos…')>=0&&mi.indexOf('Duplicar')>=0,'«⋯» abre el menú de la página',mi);
  await revisar(p,r,'archivos: menú de una página');
  await p.click('.xp-menu .xp-mi:has-text("Personas y permisos")');await p.waitForSelector('dialog.perm-dlg[open]');
  await p.keyboard.press('Escape');await p.waitForTimeout(250);
  r.cumple(await p.evaluate(function(){return document.activeElement.hasAttribute('data-mas')}),'al cerrar «Personas y permisos», el foco vuelve a «⋯»');
  await revisar(p,r,'archivos: carpeta (390, claro)');
  /* Atrás sube a la raíz */
  await p.goBack();await p.waitForTimeout(300);
  r.cumple(!/#carpeta=/.test(p.url())&&(await p.$$('.ca-cp')).length>=8&&!(await p.$('.ca-ruta')),'Atrás sube a la raíz',p.url());

  /* Buscar */
  await p.fill('#caQ','pendientes');await p.waitForTimeout(300);
  const res=await titulos(p);
  r.cumple(res.length>=1&&res.every(function(t){return /pendientes/i.test(t)})&&/resultado/.test(await p.textContent('#caT')),'buscar encuentra en todas las salas',res);
  r.cumple(/Buscar «pendientes»/.test(await p.textContent('.ca-ruta')),'y la ruta lo dice');
  await p.press('#caQ','Escape');await p.waitForTimeout(250);
  r.cumple((await p.$$('.ca-cp')).length>=8,'Esc vuelve a las carpetas');

  /* La barra lateral: una ubicación abre su carpeta */
  await p.click('#menuBtn');await p.waitForTimeout(350);
  await p.click('#arbol [data-ubic="favoritas"]');await p.waitForTimeout(400);
  r.cumple(!(await p.evaluate(function(){return document.body.classList.contains('nav-open')}))&&(await p.textContent('.ca-chip.on'))==='Favoritas'&&(await titulos(p)).length>=1,
    'en el celular, una ubicación de la barra lateral abre su carpeta');

  /* Abrir una página: sin navegación inferior; Atrás vuelve a la carpeta */
  await Promise.all([p.waitForURL(/documento\.html/),p.click('#caLista .ca-f .ca-a')]);await listo(p,500);
  r.cumple(!(await p.$('#celNav'))&&!(await p.$('#celNuevo')),'en una página no hay navegación inferior ni «+»');
  await p.goBack();await listo(p,600);await p.waitForSelector('.ca-f');
  r.cumple((await p.textContent('.ca-chip.on'))==='Favoritas','Atrás regresa a la carpeta donde estabas');

  /* ---------- Inicio y Empresa ---------- */
  await p.click('.cn-b[data-seccion="inicio"]');await p.waitForTimeout(500);
  r.cumple(await vis(p,'#iniTabEmp')&&!(await vis(p,'#celArchivos'))&&!(await vis(p,'#celNuevo'))&&await p.getAttribute('.cn-b[data-seccion="inicio"]','aria-current')==='page',
    'Inicio muestra los tableros (sin las carpetas ni el «+»)');
  await revisar(p,r,'archivos: sección Inicio');
  await p.reload();await listo(p,700);
  r.cumple(await vis(p,'#iniTabEmp')&&!(await vis(p,'#celArchivos')),'la sección se recuerda al recargar');
  await p.click('.cn-b[data-seccion="empresa"]');await p.waitForTimeout(300);
  const ce=await p.textContent('#celEmpresa');
  r.cumple(/Ferretería El Clavo/.test(ce)&&/Cambiar de persona/.test(ce)&&/Personas y departamentos/.test(ce)&&/Ventas/.test(ce)&&/Lectura/.test(ce)&&/Tus datos/.test(ce)&&/Ayuda/.test(ce),
    'Empresa: quién eres, Tu empresa, las salas y los ajustes',ce.slice(0,200));
  r.cumple(await p.evaluate(function(){return document.activeElement.id==='celEmpT'}),'el foco va a su título');
  await revisar(p,r,'archivos: sección Empresa');
  await p.click('#celEmpresa [data-ce="datos"]');await p.waitForSelector('dialog.tus-datos[open]');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.click('#celEmpresa [data-ce="persona"]');await p.waitForSelector('dialog.pe-dlg[open]');
  r.cumple(true,'desde Empresa se abren Tus datos y Cambiar de persona');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.click('.cn-b[data-seccion="paginas"]');await p.waitForTimeout(250);
  /* El chip «Tus páginas» sube a la raíz */
  await p.click('.ca-chip[data-ruta=""]');await p.waitForTimeout(300);
  r.cumple((await p.$$('.ca-cp')).length>=8&&!/#carpeta=/.test(p.url()),'el chip «Tus páginas» sube a la raíz');
  r.cumple(p.errores.length===0,'sin errores',p.errores);

  /* ---------- Variantes: oscuro con alto contraste, letra grande con OpenDyslexic y 320 px ---------- */
  for(const [et,aj,ancho] of [['oscuro y alto contraste',{tema:'dark',contraste:'high'},390],['×1.5 OpenDyslexic',{escala:1.5,fuente:'opendyslexic'},390],['320 px',{},320]]){
    await p.evaluate(function(a){AT.ajustes.set('tema',a.tema||'light');AT.ajustes.set('contraste',a.contraste||'normal');AT.ajustes.set('escala',a.escala||1);AT.ajustes.set('fuente',a.fuente||'normal')},aj);
    await p.setViewportSize({width:ancho,height:844});
    await p.reload();await listo(p,700);await p.waitForSelector('.ca-cp');
    await revisar(p,r,'archivos: raíz ('+et+')');
    await p.click('.ca-cp[data-carpeta="'+ventas+'"]');await p.waitForTimeout(300);
    await revisar(p,r,'archivos: carpeta ('+et+')');
    await p.click('.cn-b[data-seccion="empresa"]');await p.waitForTimeout(250);
    await revisar(p,r,'archivos: Empresa ('+et+')');
    await p.click('.cn-b[data-seccion="paginas"]');await p.waitForTimeout(150);
    await p.goBack();await p.waitForTimeout(250);
  }
  r.cumple(p.errores.length===0,'variantes sin errores',p.errores);
  await cerrar(p);
});
