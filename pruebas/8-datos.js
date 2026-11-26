/* Hito 2.2: tus datos en IndexedDB y el respaldo: exportas, borras los datos del navegador, importas y recuperas
   todo. Lo que guardaban las lecciones de antes (almacenes notas y marcadores, avance) se borra al cargar. */
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

/* Lee directamente de IndexedDB, sin pasar por el código del sitio */
function leerIDB(p,almacen){
  return p.evaluate(function(a){
    return new Promise(function(ok){
      const r=indexedDB.open('onelearn');
      r.onsuccess=function(){
        const db=r.result;
        if(!db.objectStoreNames.contains(a)){ok([]);return}
        const q=db.transaction(a).objectStore(a).getAll();
        q.onsuccess=function(){db.close();ok(q.result)};
      };
      r.onerror=function(){ok(null)};
    });
  },almacen);
}
function claves(p){return p.evaluate(function(){return Object.keys(localStorage).filter(function(k){return k.indexOf('apuntes:')>0}).sort()})}

prueba('Hito 2.2 · Guardado en tu dispositivo',async function({browser,base,r}){
  /* ---------- Lo de las lecciones de antes se borra: almacenes notas y marcadores, avance y apuntes ---------- */
  const p=await pagina(browser,{local:{'aprende-tecnologia:apuntes:ram':'Nota vieja de RAM','aprende-tecnologia:avance':'{"lecciones":{}}'}});
  /* Una base de la versión 4 con las notas y los marcadores de antes */
  /* (en un archivo sin código del sitio, para que nadie abra antes la versión 5) */
  await p.goto(base+'manifest.webmanifest');
  await p.evaluate(function(){return new Promise(function(ok,no){
    const r=indexedDB.open('onelearn',4);
    r.onupgradeneeded=function(){var db=r.result;['documentos','notas','marcadores','plantillas','papelera','bases','filas','versiones','trozos'].forEach(function(a){db.createObjectStore(a,{keyPath:'id'})});
      db.createObjectStore('x-tmp');db.deleteObjectStore('x-tmp');
      r.transaction.objectStore('filas').createIndex('base','base');r.transaction.objectStore('versiones').createIndex('doc','doc');
      r.transaction.objectStore('notas').put({id:'ram',texto:'Nota vieja'})};
    r.onsuccess=function(){r.result.close();ok()};r.onerror=function(){no(r.error)};
  })});
  await p.goto(base+'ayuda.html');await listo(p,500);
  r.igual(await p.evaluate(function(){return AT.datos.motor()}),'indexeddb','se usa IndexedDB');
  const almacenes=await p.evaluate(function(){return new Promise(function(ok){var r=indexedDB.open('onelearn');r.onsuccess=function(){var n=[].slice.call(r.result.objectStoreNames);r.result.close();ok(n)}})});
  r.cumple(almacenes.indexOf('notas')<0&&almacenes.indexOf('marcadores')<0&&almacenes.indexOf('documentos')>=0,'la base pasa a la versión 5 sin los almacenes de las lecciones',almacenes);
  r.igual((await claves(p)).length+(await p.evaluate(function(){return localStorage.getItem('aprende-tecnologia:avance')===null?0:1})),0,'y se borran sus claves en localStorage (apuntes y avance)');

  /* Una página llega a IndexedDB y otra pestaña se entera */
  const p2=await p.context().newPage();
  await p2.goto(base+'ayuda.html');await listo(p2,400);
  await p.bringToFront();
  await p.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-otra',titulo:'Cambio desde otra pestaña',contenido:{type:'doc',content:[]}})});
  const idb=await leerIDB(p,'documentos');
  r.cumple(idb.some(function(d){return d.id==='d-otra'&&d.editado>'2026-11'}),'una página llega a IndexedDB con su fecha');
  await p2.waitForTimeout(900);
  r.cumple(/Cambio desde otra pestaña/.test(await p2.textContent('#arbol .arb-pags')),'otra pestaña abierta ve la página nueva en su barra lateral');
  await p2.close();

  /* ---------- Tus datos y respaldo ---------- */
  await p.evaluate(function(){
    return Promise.all([
      AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-respaldo',titulo:'Página de prueba',contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-1'},content:[{type:'text',text:'Hola'}]}]}})
    ]);
  });
  await p.click('#sideDatos');await p.waitForTimeout(400);
  r.cumple(await p.evaluate(function(){return document.querySelector('dialog.tus-datos').open}),'«Tus datos» abre su ventana');
  const res=await p.textContent('#tdRes');
  r.cumple(/Páginas\s*2/.test(res)&&/Bases de datos\s*0/.test(res)&&!/estudio/.test(res)&&/Espacio usado/.test(res)&&/Disponible/.test(res),'muestra cuántas páginas y bases hay, el espacio usado y el disponible',res);
  r.cumple(/Usas .+ de los .+ que el navegador le reserva/.test(await p.textContent('#tdNotaEsp'))&&await p.isVisible('#tdBar'),'explica qué parte del espacio reservado se usa, con una barra');
  r.cumple(/Todavía no has descargado/.test(await p.textContent('#tdUlt')),'avisa que aún no hay respaldo');
  r.cumple((await p.textContent('#tdProt')).length>10,'explica si el navegador protege los datos');
  await revisar(p,r,'ventana Tus datos en escritorio');
  const [descarga]=await Promise.all([p.waitForEvent('download'),p.click('[data-td="descargar"]')]);
  r.cumple(/^onebook-respaldo-\d{4}-\d\d-\d\d\.json$/.test(descarga.suggestedFilename()),'el respaldo se descarga con nombre y fecha',descarga.suggestedFilename());
  const archivo=path.join(os.tmpdir(),'onelearn-prueba-respaldo.json');
  await descarga.saveAs(archivo);
  const datos=JSON.parse(fs.readFileSync(archivo,'utf8'));
  r.cumple(datos.app==='OneBook'&&datos.formato===1&&datos.documentos.length===2&&!('notas' in datos)&&!('marcadores' in datos)&&!('avance' in datos),
    'el respaldo trae las páginas (y ya nada de las lecciones)',{docs:datos.documentos.length,claves:Object.keys(datos)});
  await p.waitForTimeout(200);
  r.cumple(/Listo/.test(await p.textContent('#tdMsg'))&&/hoy/.test(await p.textContent('#tdUlt')),'confirma la descarga y recuerda la fecha');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){return !document.querySelector('dialog.tus-datos').open&&document.activeElement.id==='sideDatos'}),'Esc cierra la ventana y el foco vuelve a «Tus datos»');
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);

  /* Navegador limpio: importar recupera todo */
  const n=await pagina(browser,{ancho:390,alto:844,movil:true});
  await n.goto(base+'ayuda.html');await listo(n);
  await n.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-local',titulo:'Ya estaba aquí',contenido:{type:'doc',content:[]}})});
  await n.tap('#menuBtn');await n.waitForTimeout(300);await n.tap('#sideDatos');await n.waitForTimeout(300);
  await revisar(n,r,'ventana Tus datos en celular');
  await n.setInputFiles('#tdArchivo',archivo);
  await n.waitForFunction(function(){return /Se recuperaron|No había/.test(document.getElementById('tdMsg').textContent)});
  r.cumple(/Se recuperaron 2 páginas\./.test(await n.textContent('#tdMsg')),'importar cuenta lo recuperado',await n.textContent('#tdMsg'));
  const rec=await n.evaluate(function(){return AT.datos.documentos.todos().then(function(x){return {docs:x.map(function(d){return d.id}).sort()}})});
  r.cumple(rec.docs.join()==='d-local,d-otra,d-respaldo','se recuperan las páginas y se conserva lo que ya había',rec);
  /* Importar dos veces no duplica ni pisa */
  await n.setInputFiles('#tdArchivo',archivo);
  await n.waitForFunction(function(){return /No había/.test(document.getElementById('tdMsg').textContent)});
  r.cumple(true,'importar otra vez avisa que no había nada nuevo');
  /* Un archivo que no es respaldo */
  const malo=path.join(os.tmpdir(),'onelearn-prueba-malo.json');
  fs.writeFileSync(malo,'{"hola":1}');
  await n.setInputFiles('#tdArchivo',malo);
  await n.waitForFunction(function(){return /no es un respaldo/.test(document.getElementById('tdMsg').textContent)});
  r.cumple(await n.evaluate(function(){return document.getElementById('tdMsg').classList.contains('err')}),'un archivo que no es respaldo muestra un error');
  fs.writeFileSync(malo,'esto no es json');
  await n.setInputFiles('#tdArchivo',malo);
  await n.waitForFunction(function(){return /no es un respaldo/.test(document.getElementById('tdMsg').textContent)});
  r.cumple(true,'un archivo dañado también');
  /* Un respaldo con datos peligrosos o mal formados */
  const raro=await n.evaluate(function(){
    return AT.datos.importar({app:'OneLearn',formato:1,documentos:[{id:'../x',contenido:{type:'doc'}},{id:'d-ok',titulo:'ok',contenido:{type:'doc',content:[]}},{id:'d-sin'}],notas:[{id:'ram',texto:5},{id:'x y',texto:'a'}],marcadores:'no'});
  });
  r.cumple(raro.documentos===1&&!('notas' in raro),'solo entra lo que tiene forma válida (y nada de las lecciones)',raro);
  const futuro=await n.evaluate(function(){return AT.datos.importar({app:'OneLearn',formato:9}).then(function(){return 'aceptado'},function(e){return e.message})});
  r.cumple(/más nueva/.test(futuro),'un respaldo de una versión más nueva se rechaza con una explicación',futuro);
  r.cumple(n.errores.length===0,'sin errores en celular',n.errores);
  await cerrar(n);

  /* ---------- Sin IndexedDB, se usa localStorage ---------- */
  const s=await pagina(browser);
  await s.context().addInitScript(function(){try{Object.defineProperty(window,'indexedDB',{value:undefined})}catch(e){}});
  await s.goto(base+'ayuda.html');await listo(s,400);
  r.igual(await s.evaluate(function(){return AT.datos.motor()}),'localstorage','sin IndexedDB se usa localStorage');
  await s.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-ls',titulo:'Sin IndexedDB',contenido:{type:'doc',content:[]}})});
  await s.reload();await listo(s,400);
  r.igual(await s.evaluate(function(){return AT.datos.documentos.leer('d-ls').then(function(d){return d&&d.titulo})}),'Sin IndexedDB','y las páginas se guardan igual');
  r.cumple(s.errores.length===0,'sin errores sin IndexedDB',s.errores);
  await cerrar(s);

  /* La ventana en alto contraste oscuro y letra grande */
  const h=await pagina(browser,{ancho:1280,ajustes:{tema:'dark',contraste:'high',escala:1.5,fuente:'opendyslexic'}});
  await h.goto(base+'inicio.html');await listo(h);
  await h.click('#sideDatos');await h.waitForTimeout(400);
  await revisar(h,r,'Tus datos ×1.5 OpenDyslexic oscuro/alto');
  await cerrar(h);
  fs.rmSync(archivo,{force:true});fs.rmSync(malo,{force:true});

  /* Recordatorio de respaldo en Inicio */
  const rr=await pagina(browser,{ancho:1280});
  await rr.goto(base+'inicio.html');await listo(rr);
  r.cumple(await rr.isHidden('#iniRespaldo'),'sin páginas, Inicio no pide respaldo');
  await rr.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-rec',titulo:'Algo',contenido:{type:'doc',content:[]}})});
  await rr.reload();await listo(rr);
  r.cumple(await rr.isVisible('#iniRespaldo')&&/Todavía no has descargado/.test(await rr.textContent('#iniRespaldoTxt')),'con una página y sin respaldo, Inicio lo recuerda');
  await revisar(rr,r,'Inicio con recordatorio de respaldo');
  await rr.click('#iniRespaldoNo');
  r.cumple(await rr.isHidden('#iniRespaldo')&&await rr.evaluate(function(){return document.activeElement.id})==='t-docs','«Recordármelo en una semana» lo esconde y el foco no se pierde');
  await rr.reload();await listo(rr);
  r.cumple(await rr.isHidden('#iniRespaldo'),'pospuesto, no vuelve a salir al recargar');
  await rr.evaluate(function(){localStorage.removeItem('aprende-tecnologia:recordar-respaldo');localStorage.setItem('aprende-tecnologia:ultimo-respaldo',new Date(Date.now()-20*864e5).toISOString())});
  await rr.reload();await listo(rr);
  r.cumple(/hace 20 días/.test(await rr.textContent('#iniRespaldoTxt')),'si el último respaldo es de hace 20 días, lo dice');
  const [bajada]=await Promise.all([rr.waitForEvent('download'),rr.click('#iniRespaldoSi')]);
  await rr.waitForTimeout(200);
  r.cumple(/onebook-respaldo/.test(bajada.suggestedFilename())&&await rr.isHidden('#iniRespaldo'),'«Descargar respaldo» lo descarga y el recordatorio desaparece',bajada.suggestedFilename());
  r.cumple(rr.errores.length===0,'recordatorio sin errores',rr.errores);
  await cerrar(rr);
});
