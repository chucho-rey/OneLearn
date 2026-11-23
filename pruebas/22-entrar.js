/* Fase F2 · Perfiles, módulos y «Crea tu espacio» (entrar.html, perfil.js).
   Un navegador sin espacio que abre Inicio va a «Crea tu espacio»; el asistente de tres pasos guarda el perfil y crea
   las páginas sugeridas. Con el perfil de negocio solo se ve el núcleo y el módulo de negocio (barra, Inicio, Crear,
   «/» y búsqueda); con personal, tu nombre; con estudio, lo de OneLearn. «Tu espacio» se cambia desde «Tus datos»
   (entrar.html?editar), quien ya usaba OneLearn queda con estudio sin pasar por el asistente, y un respaldo con
   perfil lleva directo al Inicio. Contraste y desbordes en celular, escritorio y variantes de lectura. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function datosGuardados(p){
  return p.evaluate(function(){return Object.keys(localStorage).filter(function(k){return k.indexOf('aprende-tecnologia:')===0})});
}
function perfil(p){return p.evaluate(function(){return JSON.parse(localStorage.getItem('aprende-tecnologia:perfil')||'null')})}
function opcionesCrear(p){return p.$$eval('dialog.crear-dlg .crear-o b',function(e){return e.map(function(x){return x.textContent}).join(' | ')})}

prueba('Perfiles y «Crea tu espacio»',async function({browser,base,r}){
  /* ---------- Un negocio nuevo, en celular ---------- */
  const p=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await p.goto(base+'inicio.html');await p.waitForURL(/entrar\.html$/);await listo(p);
  r.cumple(/entrar\.html$/.test(p.url())&&/Paso 1 de 3/.test(await p.textContent('#enPaso')),'sin espacio, Inicio manda a «Crea tu espacio», paso 1');
  r.igual((await datosGuardados(p)).length,0,'abrir «Crea tu espacio» no guarda nada todavía');
  await revisar(p,r,'Crea tu espacio, paso 1, en celular');
  await p.click('#enSig');await p.waitForTimeout(100);
  r.cumple(/Elige una opción/.test(await p.textContent('#enMsg'))&&await p.evaluate(function(){return document.activeElement.name==='perfil'}),'sin elegir, pide una opción y lleva el foco a las opciones');
  r.cumple(await p.evaluate(function(){var e=document.querySelector('.en-pronto');return !!e&&!e.querySelector('input')&&/Mi escuela/.test(e.textContent)}),'«Mi escuela» se anuncia, sin poder elegirse todavía');
  await p.check('input[name="perfil"][value="negocio"]');
  await p.click('#enSig');await p.waitForTimeout(150);
  r.cumple(await p.evaluate(function(){return document.activeElement.id==='enT2'&&document.getElementById('enT2').textContent==='Tu negocio'&&!document.getElementById('enNegocioCampos').hidden}),'paso 2: los datos del negocio, con el foco en el título');
  await p.fill('#enNegocio','Abarrotes Lupita');await p.selectOption('#enGiro','tienda');await p.fill('#enTel','55 1234 5678');
  await revisar(p,r,'Crea tu espacio, paso 2, en celular');
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  const sug=await p.$$eval('input[name="plantilla"]',function(e){return e.map(function(x){return x.value+(x.checked?'+':'-')}).join(' ')});
  r.igual(sug,'pendientes+ gastos+ surtir+ proveedores+ prestamo- notas-','paso 3: para una tienda vienen marcados pendientes, gastos, surtir y proveedores');
  await revisar(p,r,'Crea tu espacio, paso 3, en celular');
  await p.click('#enAtras');await p.waitForTimeout(100);
  r.igual(await p.inputValue('#enNegocio'),'Abarrotes Lupita','«Atrás» conserva lo escrito');
  await p.click('#enSig');await p.waitForTimeout(100);
  await p.uncheck('input[name="plantilla"][value="proveedores"]');await p.check('input[name="plantilla"][value="prestamo"]');
  await Promise.all([p.waitForURL(/inicio\.html$/),p.click('#enSig')]);await listo(p,500);
  const pf=await perfil(p);
  r.cumple(pf.perfil==='negocio'&&pf.modulos.join()==='negocio'&&pf.negocio.nombre==='Abarrotes Lupita'&&pf.negocio.giro==='tienda'&&pf.negocio.telefono==='55 1234 5678'&&!pf.migrado,'«Crear mi espacio» guarda el perfil de negocio',pf);
  const docs=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.map(function(d){return d.tipo}).sort().join(',')})});
  r.igual(docs,'gastos,pendientes,prestamo,surtir','y crea las páginas marcadas');
  const ini=await p.evaluate(function(){
    function ve(s){var e=document.querySelector(s);return !!e&&!!e.getClientRects().length}
    return {h1:document.getElementById('saludo').textContent,sub:document.getElementById('iniSub').textContent,docs:document.getElementById('t-docs').textContent,
      rutas:ve('#iniRutas'),explorar:ve('#explorar'),continuar:ve('#continuar'),hecho:ve('#t-hecho'),listas:document.querySelectorAll('#iniPlantillas .ini-pl').length,
      respaldo:ve('#iniRespaldo'),clases:document.documentElement.className};
  });
  r.cumple(ini.h1==='Abarrotes Lupita'&&/^Buen(os|as) \w+ · /.test(ini.sub)&&ini.docs==='Tus páginas','Inicio saluda con el nombre del negocio y la fecha',ini);
  r.cumple(!ini.rutas&&!ini.explorar&&!ini.continuar&&!ini.hecho&&/sin-estudio/.test(ini.clases)&&/con-negocio/.test(ini.clases),'sin el módulo de estudio, Inicio no muestra rutas, temas ni lecciones',ini);
  r.cumple(ini.listas===5&&!ini.respaldo,'ofrece 5 páginas listas para usar y, recién creado, todavía no pide respaldo',ini);
  const barra=await p.evaluate(function(){var s=document.getElementById('side');
    return {rutas:!!s.querySelector('#sideRutas'),tabs:!!s.querySelector('.tabs'),temas:!!s.querySelector('.grp-btn'),acerca:!!s.querySelector('a[href$="acerca.html"]'),
      docs:s.querySelectorAll('#docsLista a.doc').length,etiqueta:s.getAttribute('aria-label'),menu:document.getElementById('menuBtn').getAttribute('aria-label')}});
  r.cumple(!barra.rutas&&!barra.tabs&&!barra.temas&&!barra.acerca&&barra.docs===4&&barra.etiqueta==='Navegación'&&barra.menu==='Abrir menú','la barra lateral deja solo Inicio, Crear, Buscar y tus páginas',barra);
  await revisar(p,r,'Inicio de negocio en celular');
  /* Crear: solo lo del negocio */
  await p.click('.ini-sec-h [data-crear]');await p.waitForTimeout(300);
  r.igual(await opcionesCrear(p),'Notas | Pendientes del día | Préstamo o crédito | Gastos del mes | Lista para surtir | Proveedores','«Crear» ofrece notas y las plantillas de negocio, sin libreta ni tesis');
  const pronto=await p.textContent('dialog.crear-dlg .crear-p');
  r.cumple(/Corte de caja/.test(pronto)&&/Fiado/.test(pronto)&&!/Libro|Bitácora/.test(pronto),'«Llegan después» anuncia lo de negocio y no lo académico',pronto);
  await revisar(p,r,'Crear de negocio en celular');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  /* Una página lista para usar se crea y se abre */
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('#iniPlantillas [data-nuevo="proveedores"]')]);await listo(p,500);
  const prov=await p.evaluate(function(){var d=AT.docActual;return {tipo:d.tipo,titulo:d.titulo,cols:d.contenido.content.filter(function(b){return b.type==='table'}).map(function(t){return t.content[0].content.length})[0]}});
  r.cumple(prov.tipo==='proveedores'&&prov.titulo==='Proveedores'&&prov.cols===4,'«Proveedores» crea la página con su tabla y la abre',prov);
  r.igual(await p.textContent('.crumbs'),'Tus páginas/Proveedores','la barra superior dice «Tus páginas»');
  /* «/» en el editor: sin lo académico */
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});await p.waitForTimeout(100);await p.keyboard.type('/');await p.waitForTimeout(250);
  const menu=await p.$$eval('.menu-barra .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(menu.indexOf('Plan de pagos')>=0&&menu.indexOf('Imagen')>=0&&menu.indexOf('Tabla')>=0&&menu.indexOf('Preguntas de repaso')<0&&menu.indexOf('Ecuación')<0&&menu.indexOf('Nota al pie')<0,
    '«/» ofrece el plan de pagos, imágenes y tablas, pero no repaso, ecuaciones ni notas al pie',menu);
  await p.keyboard.press('Escape');await p.keyboard.press('Backspace');await p.waitForTimeout(100);
  /* Búsqueda: solo tus páginas */
  await p.keyboard.press('Control+k');await p.waitForSelector('#busQ');
  r.igual(await p.getAttribute('#busQ','placeholder'),'Buscar en tus páginas','la búsqueda dice que busca en tus páginas');
  await p.fill('#busQ','memoria');await p.waitForTimeout(500);
  const sinLecc=await p.$$eval('#busRes [role="option"]',function(e){return e.length});
  await p.fill('#busQ','surtir');await p.waitForTimeout(400);
  const surtir=await p.textContent('#busRes');
  r.cumple(sinLecc===0&&/Lista para surtir/.test(surtir),'no encuentra lecciones, sí tus páginas',{sinLecc:sinLecc});
  await p.keyboard.press('Escape');
  /* Con espacio: la bienvenida y «Crea tu espacio» llevan al Inicio */
  await p.goto(base);await p.waitForURL(/inicio\.html$/);
  await p.goto(base+'entrar.html');await p.waitForURL(/inicio\.html$/);await listo(p);
  r.cumple(/inicio\.html$/.test(p.url()),'con espacio, la bienvenida y «Crea tu espacio» pasan directo al Inicio');
  /* Una lección se puede abrir por su dirección, aunque no esté en la barra */
  await p.goto(base+'lecciones/ram.html');await listo(p);
  r.cumple(!await p.$('#side .grp-btn')&&p.errores.length===0,'una lección abierta por su dirección funciona, sin el temario en la barra',p.errores);

  /* ---------- Cambiar tu espacio desde «Tus datos» ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  await p.evaluate(function(){document.getElementById('sideDatos').click()});await p.waitForSelector('#tdEspacio');await p.waitForTimeout(300);
  r.cumple(/Mi negocio/.test(await p.textContent('#tdEspacio'))&&/Abarrotes Lupita \(Tienda o comercio\)/.test(await p.textContent('#tdEspacio')),'«Tus datos» muestra tu espacio');
  await Promise.all([p.waitForURL(/entrar\.html\?editar/),p.click('#tdEspacio a')]);await listo(p);
  r.cumple(await p.isChecked('input[name="perfil"][value="negocio"]')&&await p.isHidden('#enRestaurarP'),'«Cambiar tu espacio» abre lo que ya tienes');
  await p.click('#enSig');await p.waitForTimeout(100);
  r.igual(await p.inputValue('#enNegocio'),'Abarrotes Lupita','con sus datos');
  await p.click('#enSig');await p.waitForTimeout(150);
  const ed=await p.evaluate(function(){return {mods:[].map.call(document.querySelectorAll('input[name="modulo"]'),function(x){return x.value+(x.checked?'+':'-')}).join(' '),
    pls:document.querySelectorAll('input[name="plantilla"]:checked').length,boton:document.getElementById('enSig').textContent}});
  r.cumple(ed.mods==='negocio+ estudio-'&&ed.pls===0&&ed.boton==='Guardar cambios','al editar, se encienden o apagan módulos y las páginas vienen sin marcar',ed);
  await revisar(p,r,'Tu espacio al editar, en celular');
  await p.check('input[name="modulo"][value="estudio"]');
  await Promise.all([p.waitForURL(/inicio\.html$/),p.click('#enSig')]);await listo(p,400);
  const con=await p.evaluate(function(){var s=document.getElementById('side');return {mods:JSON.parse(localStorage.getItem('aprende-tecnologia:perfil')).modulos.join(),
    tabs:!!s.querySelector('.tabs'),rutas:!!document.querySelector('#iniRutas').getClientRects().length}});
  r.cumple(con.mods==='negocio,estudio'&&con.tabs&&con.rutas,'encender «Estudio» trae las lecciones a la barra y al Inicio',con);
  await p.click('.ini-sec-h [data-crear]');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){var g=[].map.call(document.querySelectorAll('dialog.crear-dlg .crear-g'),function(x){return x.getAttribute('data-modulo')});return g.join()==='negocio,estudio'}),
    '«Crear» muestra primero lo del negocio y después lo de estudio');
  r.igual(await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.length})}),5,'cambiar el espacio no crea ni borra páginas');
  await cerrar(p);

  /* ---------- Personal, en escritorio ---------- */
  const q=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  await q.goto(base+'entrar.html?perfil=personal');await listo(q);
  r.cumple(/Paso 2 de 3/.test(await q.textContent('#enPaso'))&&await q.textContent('#enT2')==='¿Cómo te llamas?'&&await q.isHidden('#enNegocioCampos'),'?perfil=personal empieza en el paso 2 y pide tu nombre');
  await revisar(q,r,'Crea tu espacio en escritorio');
  await q.fill('#enNombre','Ana');await q.click('#enSig');await q.waitForTimeout(150);
  r.igual(await q.$$eval('input[name="plantilla"]',function(e){return e.map(function(x){return x.value+(x.checked?'+':'-')}).join(' ')}),'gastos+ prestamo+ notas-','para tus finanzas vienen gastos del mes y préstamo');
  await Promise.all([q.waitForURL(/inicio\.html$/),q.click('#enSig')]);await listo(q,400);
  r.cumple(/^Buen(os|as) \w+, Ana$/.test(await q.textContent('#saludo'))&&!/aprender/.test(await q.textContent('#iniSub')),'Inicio saluda con tu nombre y la fecha');
  await revisar(q,r,'Inicio personal en escritorio');
  await cerrar(q);

  /* ---------- Estudiar, desde la bienvenida de estudiantes ---------- */
  const e=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  await e.goto(base+'estudiantes.html');await listo(e);
  await Promise.all([e.waitForURL(/entrar\.html\?perfil=estudio/),e.click('.lp-hero a.btn.pri')]);await listo(e);
  await e.click('#enSig');await e.waitForTimeout(150);
  r.cumple(/lecciones, las rutas y los proyectos/.test(await e.textContent('#enT3Txt'))&&await e.$$eval('input[name="plantilla"]:checked',function(x){return x.length})===0,'para estudiar no se marca nada: las lecciones ya están en la barra');
  await Promise.all([e.waitForURL(/inicio\.html$/),e.click('#enSig')]);await listo(e,400);
  const es=await e.evaluate(function(){return {sub:document.getElementById('iniSub').textContent,rutas:!!document.querySelector('#iniRutas').getClientRects().length,
    mods:JSON.parse(localStorage.getItem('aprende-tecnologia:perfil')).modulos.join(),pagos:AT.perfil.tiene('negocio')}});
  r.cumple(es.sub==='Qué quieres aprender hoy.'&&es.rutas&&es.mods==='estudio'&&!es.pagos,'con estudio, Inicio es el de OneLearn y el negocio queda apagado',es);
  await e.click('.ini-sec-h [data-crear]');await e.waitForTimeout(300);
  r.igual(await opcionesCrear(e),'Libreta de estudio | Notas | Apuntes de clase | Tesis','«Crear» ofrece libreta, notas, apuntes de clase y tesis');
  await cerrar(e);

  /* ---------- Quien ya usaba OneLearn ---------- */
  const v=await pagina(browser,{ancho:1280,perfil:false,local:{'aprende-tecnologia:avance':JSON.stringify({lecciones:{ram:{total:5,leidas:{a:'x'}}}})}});
  await v.goto(base+'inicio.html');await listo(v);
  const mig=await perfil(v);
  r.cumple(/inicio\.html$/.test(v.url())&&mig&&mig.perfil==='estudio'&&mig.modulos.join()==='estudio,negocio'&&mig.migrado,'quien ya usaba OneLearn entra directo, con estudio y negocio encendidos',mig);
  await cerrar(v);

  /* ---------- Restaurar un respaldo ---------- */
  const doc={formato:1,tipo:'notas',id:'d-respaldo1',titulo:'Cuentas de la semana',creado:'2026-11-01T10:00:00.000Z',editado:'2026-11-01T10:00:00.000Z',
    contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-aaa111'},content:[{type:'text',text:'hola'}]}]}};
  const conPerfil={app:'OneBook',formato:1,documentos:[doc],notas:[],marcadores:[],
    perfil:{perfil:'negocio',modulos:['negocio','raro'],negocio:{nombre:'Papelería Sol',giro:'tienda',telefono:'<b>55</b>'},creado:'2026-10-01',extra:'no'}};
  const s=await pagina(browser,{ancho:390,perfil:false});
  await s.goto(base+'entrar.html');await listo(s);
  await Promise.all([s.waitForURL(/inicio\.html$/),s.setInputFiles('#enArchivo',{name:'respaldo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(conPerfil))})]);await listo(s,400);
  const rp=await perfil(s);
  r.cumple(await s.textContent('#saludo')==='Papelería Sol'&&rp.modulos.join()==='negocio'&&rp.negocio.telefono==='55'&&!('extra' in rp),'un respaldo con perfil restaura el espacio (limpio) y abre el Inicio',rp);
  r.cumple(/Cuentas de la semana/.test(await s.textContent('#iniDocs')),'con sus documentos');
  await cerrar(s);
  const s2=await pagina(browser,{ancho:390,perfil:false});
  await s2.goto(base+'entrar.html');await listo(s2);
  await s2.setInputFiles('#enArchivo',{name:'viejo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'OneLearn',formato:1,documentos:[doc],notas:[],marcadores:[]}))});
  await s2.waitForFunction(function(){return /Ahora elige/.test(document.getElementById('enMsg').textContent)});
  r.cumple(/entrar\.html$/.test(s2.url())&&/se restauraron 1 documento/.test(await s2.textContent('#enMsg'))&&await s2.evaluate(function(){return document.activeElement.name==='perfil'}),'un respaldo de OneLearn (sin perfil) se restaura y pide elegir para qué usarás OneBook');
  await s2.setInputFiles('#enArchivo',{name:'malo.json',mimeType:'application/json',buffer:Buffer.from('no es json')});
  await s2.waitForFunction(function(){return document.getElementById('enMsg').classList.contains('error')});
  r.cumple(/no es un respaldo/.test(await s2.textContent('#enMsg')),'un archivo que no es respaldo se explica');
  await cerrar(s2);

  /* ---------- Variantes de lectura (con espacio: «Cambiar tu espacio») ---------- */
  for(const [nombre,aj,ancho] of [['oscuro',{tema:'dark'},1280],['alto contraste ×1.5 y OpenDyslexic',{contraste:'high',escala:1.5,fuente:'opendyslexic'},390],['oscuro y alto contraste',{tema:'dark',contraste:'high'},900]]){
    const x=await pagina(browser,{ancho:ancho,ajustes:aj,reducir:true});
    await x.goto(base+'entrar.html?editar');await listo(x);
    await revisar(x,r,'Tu espacio, paso 1, '+nombre);
    await x.click('#enSig');await x.click('#enSig');await x.waitForTimeout(150);
    await revisar(x,r,'Tu espacio, paso 3, '+nombre);
    await cerrar(x);
  }
});
