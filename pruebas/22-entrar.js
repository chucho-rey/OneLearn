/* Fase F2 · Perfiles, módulos y «Crea tu espacio» (entrar.html, perfil.js).
   Un navegador sin espacio que abre Inicio va a «Crea tu espacio»; el asistente (dos pasos: tu negocio y con qué
   empiezas) guarda el perfil y crea las páginas sugeridas. Solo se ve el núcleo y los módulos de la empresa (barra,
   Inicio, Crear, «/» y búsqueda). «Tu espacio» se cambia desde «Tus datos» (entrar.html?editar). Los espacios de
   antes (estudio y «Mis finanzas») se convierten solos en negocio y el Inicio lo explica una vez; quien ya usaba
   OneLearn entra directo; un respaldo con perfil lleva directo al Inicio. Contraste y desbordes en celular,
   escritorio y variantes de lectura. */
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
  r.cumple(/entrar\.html$/.test(p.url())&&/Paso 1 de 2/.test(await p.textContent('#enPaso')),'sin espacio, Inicio manda a «Crea tu espacio», paso 1 de 2');
  r.cumple(await p.isVisible('#enNegocio')&&await p.isHidden('#enAtras')&&!await p.isVisible('.en-pronto'),'empieza en «Tu negocio»: ya no se elige entre negocio, finanzas o estudio');
  r.igual((await datosGuardados(p)).length,0,'abrir «Crea tu espacio» no guarda nada todavía');
  await p.fill('#enNegocio','Abarrotes Lupita');await p.selectOption('#enGiro','tienda');await p.fill('#enTel','55 1234 5678');
  await revisar(p,r,'Crea tu espacio, tu negocio, en celular');
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  r.cumple(/Paso 2 de 2/.test(await p.textContent('#enPaso'))&&await p.evaluate(function(){return document.activeElement.id==='enT3'}),'paso 2: con qué empiezas');
  const sug=await p.$$eval('input[name="plantilla"]',function(e){return e.map(function(x){return x.value+(x.checked?'+':'-')}).join(' ')});
  r.igual(sug,'corte+ fiado+ gastos+ surtir+ venta- pendientes- proveedores- precio- prestamo- notas-','para una tienda vienen marcados el corte de caja, el fiado, los gastos y la lista para surtir');
  await revisar(p,r,'Crea tu espacio, páginas, en celular');
  await p.click('#enAtras');await p.waitForTimeout(100);
  r.igual(await p.inputValue('#enNegocio'),'Abarrotes Lupita','«Atrás» conserva lo escrito');
  await p.click('#enSig');await p.waitForTimeout(100);
  await p.uncheck('input[name="plantilla"][value="fiado"]');await p.check('input[name="plantilla"][value="prestamo"]');
  await Promise.all([p.waitForURL(/inicio\.html$/),p.click('#enSig')]);await listo(p,500);
  const pf=await perfil(p);
  r.cumple(pf.perfil==='negocio'&&pf.modulos.join()==='negocio'&&pf.negocio.nombre==='Abarrotes Lupita'&&pf.negocio.giro==='tienda'&&pf.negocio.telefono==='55 1234 5678'&&!pf.migrado&&!pf.aviso,'«Crear mi espacio» guarda el perfil del negocio',pf);
  const docs=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return d.id!=='d-minegocio'}).map(function(d){return d.tipo}).sort().join(',')})});
  r.igual(docs,'corte,gastos,prestamo,surtir','y crea las páginas marcadas');
  const ini=await p.evaluate(function(){
    function ve(s){var e=document.querySelector(s);return !!e&&!!e.getClientRects().length}
    return {h1:document.getElementById('saludo').textContent,sub:document.getElementById('iniSub').textContent,docs:document.getElementById('t-docs').textContent,
      estudio:!!document.querySelector('#iniRutas,#explorar,#continuar,#t-hecho,#bienvenida,#recientes'),aviso:ve('#iniAviso'),listas:document.querySelectorAll('#iniPlantillas .ini-pl').length,
      respaldo:ve('#iniRespaldo'),clases:document.documentElement.className};
  });
  r.cumple(ini.h1==='Abarrotes Lupita'&&/^Buen(os|as) \w+ · /.test(ini.sub)&&ini.docs==='Tus páginas','Inicio saluda con el nombre del negocio y la fecha',ini);
  r.cumple(!ini.estudio&&!ini.aviso&&/con-negocio/.test(ini.clases)&&!/estudio/.test(ini.clases),'el Inicio ya no tiene rutas, temas ni lecciones, ni el aviso (es un espacio nuevo)',ini);
  r.cumple(ini.listas===9&&!ini.respaldo,'ofrece 9 páginas listas para usar y, recién creado, todavía no pide respaldo',ini);
  const barra=await p.evaluate(function(){var s=document.getElementById('side');
    return {rutas:!!s.querySelector('#sideRutas'),tabs:!!s.querySelector('.tabs'),temas:!!s.querySelector('.grp-btn'),acerca:!!s.querySelector('a[href$="acerca.html"]'),
      docs:s.querySelectorAll('#docsLista a.doc').length,etiqueta:s.getAttribute('aria-label'),menu:document.getElementById('menuBtn').getAttribute('aria-label')}});
  r.cumple(!barra.rutas&&!barra.tabs&&!barra.temas&&!barra.acerca&&barra.docs===4&&barra.etiqueta==='Navegación'&&barra.menu==='Abrir menú','la barra lateral deja Inicio, Crear, Buscar y tus páginas',barra);
  await revisar(p,r,'Inicio de negocio en celular');
  /* Crear: solo lo de la empresa */
  await p.click('.xp-nuevo');await p.waitForTimeout(300);
  r.igual(await opcionesCrear(p),'Notas | Pendientes del día | Corte de caja | Fiado | Gastos del mes | Nota de venta | Precios de venta | Lista para surtir | Inventario | Reporte del mes | Presupuesto del mes | Proveedores | Clientes | Lista de precios | Plan de negocio | Préstamo o crédito | '+
    'Tienda o abarrotes Tu giro | Comida (cocina, cafetería, repostería) | Servicios (estética, taller, consultorio) | Ventas por catálogo o redes',
    '«Crear» ofrece notas, las plantillas del negocio y los paquetes por giro (el suyo marcado), sin estudio, finanzas personales ni freelance');
  const pronto=await p.textContent('dialog.crear-dlg .crear-p');
  r.cumple(/Cotización/.test(pronto)&&!/Corte de caja|Fiado/.test(pronto)&&!/Libro|Bitácora/.test(pronto),'«Llegan después» anuncia lo que falta y nada de estudio',pronto);
  await revisar(p,r,'Crear de negocio en celular');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  /* Una página lista para usar se crea y se abre */
  await Promise.all([p.waitForURL(/documento\.html\?id=/),p.click('#iniPlantillas [data-nuevo="proveedores"]')]);await listo(p,500);
  const prov=await p.evaluate(function(){var d=AT.docActual;return {tipo:d.tipo,titulo:d.titulo,cols:d.contenido.content.filter(function(b){return b.type==='table'}).map(function(t){return t.content[0].content.length})[0],
    porPagar:d.contenido.content.some(function(b){return b.type==='porpagar'}),bloque:!!document.querySelector('.nb-porpagar')}});
  r.cumple(prov.tipo==='proveedores'&&prov.titulo==='Proveedores'&&prov.cols===4&&prov.porPagar&&prov.bloque,'«Proveedores» crea la página con su tabla y sus cuentas por pagar, y la abre',prov);
  r.igual(await p.textContent('.crumbs'),'Tus páginas/Proveedores','la barra superior dice «Tus páginas»');
  /* «/» en el editor */
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});await p.waitForTimeout(100);await p.keyboard.type('/');await p.waitForTimeout(250);
  const menu=await p.$$eval('.menu-barra .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(menu.indexOf('Plan de pagos')>=0&&menu.indexOf('Imagen')>=0&&menu.indexOf('Tabla')>=0&&menu.indexOf('Nota al pie')>=0&&menu.indexOf('Preguntas de repaso')<0&&menu.indexOf('Ecuación')<0&&menu.indexOf('Cita bibliográfica')<0,
    '«/» ofrece el plan de pagos, imágenes, tablas y notas al pie, sin repaso, ecuaciones ni citas bibliográficas',menu);
  await p.keyboard.press('Escape');await p.keyboard.press('Backspace');await p.waitForTimeout(100);
  /* Búsqueda: tus páginas y la Ayuda */
  await p.keyboard.press('Control+k');await p.waitForSelector('#busQ');
  r.igual(await p.getAttribute('#busQ','placeholder'),'Buscar en tus páginas y en la ayuda','la búsqueda dice dónde busca');
  await p.fill('#busQ','transistor');await p.waitForTimeout(500);
  const sinLecc=await p.$$eval('#busRes [role="option"]',function(e){return e.length});
  await p.fill('#busQ','surtir');await p.waitForTimeout(400);
  const surtir=await p.textContent('#busRes');
  r.cumple(sinLecc===0&&/Lista para surtir/.test(surtir),'no encuentra lecciones, sí tus páginas',{sinLecc:sinLecc});
  await p.keyboard.press('Escape');
  /* Con espacio: la bienvenida y «Crea tu espacio» llevan al Inicio */
  await p.goto(base);await p.waitForURL(/inicio\.html$/);
  await p.goto(base+'entrar.html');await p.waitForURL(/inicio\.html$/);await listo(p);
  r.cumple(/inicio\.html$/.test(p.url()),'con espacio, la bienvenida y «Crea tu espacio» pasan directo al Inicio');
  /* Las lecciones ya no existen */
  const lec=await p.goto(base+'lecciones/ram.html');
  r.igual(lec.status(),404,'las lecciones ya no se publican');
  p.errores.length=0;

  /* ---------- Cambiar tu espacio desde «Tus datos» ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  await p.evaluate(function(){document.getElementById('sideDatos').click()});await p.waitForSelector('#tdEspacio');await p.waitForTimeout(300);
  r.cumple(/Mi negocio/.test(await p.textContent('#tdEspacio'))&&/Abarrotes Lupita \(Tienda o comercio\)/.test(await p.textContent('#tdEspacio')),'«Tus datos» muestra tu espacio');
  await Promise.all([p.waitForURL(/entrar\.html\?editar/),p.click('#tdEspacio a')]);await listo(p);
  r.cumple(await p.inputValue('#enNegocio')==='Abarrotes Lupita'&&await p.isHidden('#enRestaurarP')&&/Paso 1 de 2/.test(await p.textContent('#enPaso')),'«Cambiar tu espacio» abre lo que ya tienes, en «Tu negocio»');
  await p.click('#enSig');await p.waitForTimeout(150);
  const ed=await p.evaluate(function(){return {mods:[].map.call(document.querySelectorAll('input[name="modulo"]'),function(x){return x.value+(x.checked?'+':'-')}).join(' '),
    pls:document.querySelectorAll('input[name="plantilla"]:checked').length,boton:document.getElementById('enSig').textContent}});
  r.cumple(ed.mods==='negocio+ rh-'&&ed.pls===0&&ed.boton==='Guardar cambios','al editar, se encienden o apagan módulos (negocio y recursos humanos) y las páginas vienen sin marcar',ed);
  await revisar(p,r,'Tu espacio al editar, en celular');
  await p.check('input[name="modulo"][value="rh"]');
  await Promise.all([p.waitForURL(/inicio\.html$/),p.click('#enSig')]);await listo(p,400);
  r.igual((await perfil(p)).modulos.join(),'negocio,rh','encender «Recursos humanos» se guarda');
  await p.click('.xp-nuevo');await p.waitForTimeout(300);
  r.igual(await p.evaluate(function(){return [].map.call(document.querySelectorAll('dialog.crear-dlg .crear-g'),function(x){return x.getAttribute('data-modulo')}).join()}),'negocio,rh,paquetes','y «Crear» suma las plantillas de recursos humanos');
  r.igual(await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return d.id!=='d-minegocio'&&d.id!=='d-miequipo'}).length})}),5,'cambiar el espacio no crea ni borra tus páginas');
  await cerrar(p);

  /* ---------- Un espacio de «Mis finanzas» (de antes) ---------- */
  const q=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'personal',modulos:['negocio'],nombre:'Ana',negocio:null,creado:'2026-01-01'}});
  await q.goto(base+'inicio.html');await listo(q,400);
  const qp=await perfil(q);
  r.cumple(qp.perfil==='negocio'&&qp.aviso==='personal'&&qp.nombre==='Ana'&&qp.modulos.join()==='negocio','un espacio de «Mis finanzas» se convierte solo en negocio, con su nombre',qp);
  r.cumple(await q.isVisible('#iniAviso')&&/finanzas personales/.test(await q.textContent('#iniAviso')),'el Inicio explica, una vez, que las plantillas de finanzas personales se fueron');
  r.igual(await q.textContent('#saludo'),'Ana','y saluda con su nombre');
  await revisar(q,r,'Inicio con el aviso, en escritorio');
  await q.click('#iniAvisoOk');await q.waitForTimeout(150);
  r.cumple(await q.isHidden('#iniAviso')&&await q.evaluate(function(){return document.activeElement.id})==='t-docs','«Entendido» lo esconde y el foco no se pierde');
  await q.reload();await listo(q,300);
  r.cumple(await q.isHidden('#iniAviso')&&!(await perfil(q)).aviso,'y no vuelve a salir');
  await cerrar(q);

  /* ---------- Un espacio de estudio (de antes) ---------- */
  const e=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'estudio',modulos:['estudio'],nombre:'Luis',negocio:null,creado:'2026-01-01'}});
  await e.goto(base+'inicio.html');await listo(e,400);
  const ep=await perfil(e);
  r.cumple(ep.perfil==='negocio'&&ep.aviso==='estudio'&&ep.modulos.join()==='negocio','un espacio de estudio se convierte en negocio',ep);
  r.cumple(/Lo de estudio \(lecciones, rutas, libretas, apuntes y tesis\) se separó/.test(await e.textContent('#iniAviso'))&&/no se borró/.test(await e.textContent('#iniAviso')),'el Inicio explica que lo de estudio se separó y que no se borró nada');
  const [res]=await Promise.all([e.waitForEvent('download'),e.click('#iniAvisoResp')]);
  r.cumple(/onebook-respaldo/.test(res.suggestedFilename()),'y ofrece descargar un respaldo',res.suggestedFilename());
  await e.click('.xp-nuevo');await e.waitForTimeout(300);
  r.cumple(!/Libreta|Tesis|Apuntes de clase/.test(await opcionesCrear(e)),'«Crear» ya no ofrece plantillas de estudio');
  await cerrar(e);

  /* ---------- Quien ya usaba OneLearn (con datos y sin espacio) ---------- */
  const v=await pagina(browser,{ancho:1280,perfil:false,local:{'aprende-tecnologia:avance':JSON.stringify({lecciones:{ram:{total:5,leidas:{a:'x'}}}})}});
  await v.goto(base+'inicio.html');await listo(v);
  const mig=await perfil(v);
  r.cumple(/inicio\.html$/.test(v.url())&&mig&&mig.perfil==='negocio'&&mig.modulos.join()==='negocio'&&mig.migrado&&mig.aviso==='estudio','quien ya usaba OneLearn entra directo, con el aviso de que lo de estudio se separó',mig);
  r.cumple(await v.evaluate(function(){return !!JSON.parse(localStorage.getItem('aprende-tecnologia:avance')).lecciones.ram}),'y su avance sigue guardado');
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
  r.cumple(/Cuentas de la semana/.test(await s.textContent('#xp')),'con sus páginas');
  await cerrar(s);
  const s2=await pagina(browser,{ancho:390,perfil:false});
  await s2.goto(base+'entrar.html');await listo(s2);
  await s2.setInputFiles('#enArchivo',{name:'viejo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'OneLearn',formato:1,documentos:[doc],notas:[],marcadores:[]}))});
  await s2.waitForFunction(function(){return /Ahora cuéntanos/.test(document.getElementById('enMsg').textContent)});
  r.cumple(/entrar\.html$/.test(s2.url())&&/se restauraron 1 documento/.test(await s2.textContent('#enMsg'))&&await s2.evaluate(function(){return document.activeElement.id==='enNegocio'}),'un respaldo de OneLearn (sin perfil) se restaura y sigue con «Tu negocio»');
  await s2.setInputFiles('#enArchivo',{name:'malo.json',mimeType:'application/json',buffer:Buffer.from('no es json')});
  await s2.waitForFunction(function(){return document.getElementById('enMsg').classList.contains('error')});
  r.cumple(/no es un respaldo/.test(await s2.textContent('#enMsg')),'un archivo que no es respaldo se explica');
  await cerrar(s2);

  /* ---------- Variantes de lectura (con espacio: «Cambiar tu espacio») ---------- */
  for(const [nombre,aj,ancho] of [['oscuro',{tema:'dark'},1280],['alto contraste ×1.5 y OpenDyslexic',{contraste:'high',escala:1.5,fuente:'opendyslexic'},390],['oscuro y alto contraste',{tema:'dark',contraste:'high'},900]]){
    const x=await pagina(browser,{ancho:ancho,ajustes:aj,reducir:true});
    await x.goto(base+'entrar.html?editar');await listo(x);
    await revisar(x,r,'Tu espacio, tu negocio, '+nombre);
    await x.click('#enSig');await x.waitForTimeout(150);
    await revisar(x,r,'Tu espacio, módulos y páginas, '+nombre);
    await cerrar(x);
  }
});
