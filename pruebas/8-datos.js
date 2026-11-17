/* Hito 2.2: tus datos en IndexedDB, las notas de antes pasadas sin perder nada, y el respaldo:
   exportas, borras los datos del navegador, importas y recuperas todo. */
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
  /* ---------- Las notas de antes pasan a IndexedDB ---------- */
  const p=await pagina(browser,{local:{
    'aprende-tecnologia:apuntes:ram':'Nota vieja de RAM','aprende-tecnologia:apuntes:ram:editado':'2026-10-01T10:00:00.000Z',
    'aprende-tecnologia:apuntes:cpu':'Nota de CPU sin fecha','aprende-tecnologia:apuntes:cpu:pendiente':'1'}});
  await p.goto(base+'lecciones/ram.html');await listo(p,500);
  r.igual(await p.inputValue('#notes'),'Nota vieja de RAM','la nota de antes se muestra en su lección');
  let idb=await leerIDB(p,'notas');
  const porId={};(idb||[]).forEach(function(n){porId[n.id]=n});
  r.cumple(porId.ram&&porId.ram.texto==='Nota vieja de RAM'&&porId.ram.editado==='2026-10-01T10:00:00.000Z','la nota pasa a IndexedDB con su fecha',porId.ram);
  r.cumple(porId.cpu&&porId.cpu.texto==='Nota de CPU sin fecha'&&porId.cpu.editado==='','una nota sin fecha también pasa',porId.cpu);
  r.igual((await claves(p)).length,0,'después de pasarlas, se quitan de localStorage');
  r.igual(await p.evaluate(function(){return AT.datos.motor()}),'indexeddb','se usa IndexedDB');

  /* Escribir y recargar */
  await p.click('#shMain');await p.fill('#notes','');await p.type('#notes','Nota nueva en IndexedDB');
  await p.waitForFunction(function(){return document.getElementById('nStat').textContent==='Guardado'});
  idb=await leerIDB(p,'notas');
  r.cumple(idb.some(function(n){return n.id==='ram'&&n.texto==='Nota nueva en IndexedDB'&&n.editado>'2026-11'}),'lo que escribes llega a IndexedDB');
  r.igual((await claves(p)).length,0,'y no queda copia en localStorage cuando ya se guardó');
  await p.reload();await listo(p,400);
  r.igual(await p.inputValue('#notes'),'Nota nueva en IndexedDB','al recargar, la nota sigue ahí');

  /* Si la página se cierra antes de llegar a la base, la próxima carga termina el trabajo */
  await p.evaluate(function(){
    localStorage.setItem('aprende-tecnologia:apuntes:ram','Escrito justo antes de cerrar');
    localStorage.setItem('aprende-tecnologia:apuntes:ram:editado',new Date(Date.now()+1000).toISOString());
  });
  await p.reload();await listo(p,400);
  r.igual(await p.inputValue('#notes'),'Escrito justo antes de cerrar','una nota que no alcanzó a guardarse no se pierde');
  idb=await leerIDB(p,'notas');
  r.cumple(idb.some(function(n){return n.id==='ram'&&n.texto==='Escrito justo antes de cerrar'}),'y se termina de guardar en IndexedDB');

  /* Otra pestaña se entera */
  const p2=await p.context().newPage();
  await p2.goto(base+'lecciones/cpu.html');await listo(p2,400);
  await p2.click('#tab-apuntes');
  await p.bringToFront();await p.click('#shMain');await p.fill('#notes','Cambio desde otra pestaña');await p.waitForTimeout(900);
  r.cumple(/Cambio desde otra pestaña/.test(await p2.textContent('#notasLista')),'otra pestaña abierta ve el cambio en Mis apuntes');
  await p2.close();

  /* ---------- Tus datos y respaldo ---------- */
  await p.evaluate(function(){
    return Promise.all([
      AT.datos.documentos.guardar({formato:1,tipo:'libreta',id:'d-respaldo',titulo:'Libreta de prueba',contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-1'},content:[{type:'text',text:'Hola'}]}]}}),
      AT.datos.marcadores.guardar({id:'m-1',doc:'ram',bloque:'s-celda',texto:'Cómo guarda un bit la RAM'})
    ]);
  });
  await p.evaluate(function(){localStorage.setItem('aprende-tecnologia:avance',JSON.stringify({ultima:'ram',lecciones:{ram:{total:9,leidas:{'s-que':'2026-11-01T00:00:00.000Z'}}}}))});
  await p.click('#sideDatos');await p.waitForTimeout(400);
  r.cumple(await p.evaluate(function(){return document.querySelector('dialog.tus-datos').open}),'«Tus datos» abre su ventana');
  const res=await p.textContent('#tdRes');
  r.cumple(/Documentos\s*1/.test(res)&&/Notas\s*2/.test(res)&&/Marcadores\s*1/.test(res)&&/Espacio usado/.test(res)&&/Disponible/.test(res),'muestra cuántos documentos, notas y marcadores hay, el espacio usado y el disponible',res);
  r.cumple(/Usas .+ de los .+ que el navegador le reserva/.test(await p.textContent('#tdNotaEsp'))&&await p.isVisible('#tdBar'),'explica qué parte del espacio reservado se usa, con una barra');
  r.cumple(/Todavía no has descargado/.test(await p.textContent('#tdUlt')),'avisa que aún no hay respaldo');
  r.cumple((await p.textContent('#tdProt')).length>10,'explica si el navegador protege los datos');
  await revisar(p,r,'ventana Tus datos en escritorio');
  const [descarga]=await Promise.all([p.waitForEvent('download'),p.click('[data-td="descargar"]')]);
  r.cumple(/^onelearn-respaldo-\d{4}-\d\d-\d\d\.json$/.test(descarga.suggestedFilename()),'el respaldo se descarga con nombre y fecha',descarga.suggestedFilename());
  const archivo=path.join(os.tmpdir(),'onelearn-prueba-respaldo.json');
  await descarga.saveAs(archivo);
  const datos=JSON.parse(fs.readFileSync(archivo,'utf8'));
  r.cumple(datos.app==='OneLearn'&&datos.formato===1&&datos.documentos.length===1&&datos.notas.length===2&&datos.marcadores.length===1&&datos.avance.lecciones.ram,
    'el respaldo trae documentos, notas, marcadores y avance',{docs:datos.documentos.length,notas:datos.notas.length});
  await p.waitForTimeout(200);
  r.cumple(/Listo/.test(await p.textContent('#tdMsg'))&&/hoy/.test(await p.textContent('#tdUlt')),'confirma la descarga y recuerda la fecha');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){return !document.querySelector('dialog.tus-datos').open&&document.activeElement.id==='sideDatos'}),'Esc cierra la ventana y el foco vuelve a «Tus datos»');
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);

  /* Navegador limpio: importar recupera todo */
  const n=await pagina(browser,{ancho:390,alto:844,movil:true});
  await n.goto(base+'index.html');await listo(n);
  await n.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-local',titulo:'Ya estaba aquí',contenido:{type:'doc',content:[]}})});
  await n.tap('#menuBtn');await n.waitForTimeout(300);await n.tap('#sideDatos');await n.waitForTimeout(300);
  await revisar(n,r,'ventana Tus datos en celular');
  await n.setInputFiles('#tdArchivo',archivo);
  await n.waitForFunction(function(){return /Se recuperaron|No había/.test(document.getElementById('tdMsg').textContent)});
  r.cumple(/1 documento, 2 notas y 1 marcador, y tu avance de lectura/.test(await n.textContent('#tdMsg')),'importar cuenta lo recuperado',await n.textContent('#tdMsg'));
  const rec=await n.evaluate(function(){
    return Promise.all([AT.datos.documentos.todos(),AT.datos.notas.todas(),AT.datos.marcadores.todos()]).then(function(x){
      return {docs:x[0].map(function(d){return d.id}).sort(),notas:x[1].map(function(d){return d.id+':'+d.texto}).sort(),marc:x[2].length,avance:AT.avance.porcentaje('ram')};
    });
  });
  r.cumple(rec.docs.join()==='d-local,d-respaldo'&&rec.notas.join('|')==='cpu:Nota de CPU sin fecha|ram:Cambio desde otra pestaña'&&rec.marc===1&&rec.avance>0,
    'se recuperan documentos, notas, marcadores y avance, y se conserva lo que ya había',rec);
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
  r.cumple(raro.documentos===1&&raro.notas===0&&raro.marcadores===0,'solo entra lo que tiene forma válida',raro);
  const futuro=await n.evaluate(function(){return AT.datos.importar({app:'OneLearn',formato:9}).then(function(){return 'aceptado'},function(e){return e.message})});
  r.cumple(/más nueva/.test(futuro),'un respaldo de una versión más nueva se rechaza con una explicación',futuro);
  r.cumple(n.errores.length===0,'sin errores en celular',n.errores);
  await cerrar(n);

  /* ---------- Sin IndexedDB, se usa localStorage ---------- */
  const s=await pagina(browser);
  await s.context().addInitScript(function(){try{Object.defineProperty(window,'indexedDB',{value:undefined})}catch(e){}});
  await s.goto(base+'lecciones/ram.html');await listo(s,400);
  r.igual(await s.evaluate(function(){return AT.datos.motor()}),'localstorage','sin IndexedDB se usa localStorage');
  await s.click('#shMain');await s.type('#notes','Sin IndexedDB');
  await s.waitForFunction(function(){return document.getElementById('nStat').textContent==='Guardado'});
  await s.reload();await listo(s,400);
  r.igual(await s.inputValue('#notes'),'Sin IndexedDB','y las notas se guardan igual');
  r.cumple(s.errores.length===0,'sin errores sin IndexedDB',s.errores);
  await cerrar(s);

  /* La ventana en alto contraste oscuro y letra grande */
  const h=await pagina(browser,{ancho:1280,ajustes:{tema:'dark',contraste:'high',escala:1.5,fuente:'opendyslexic'}});
  await h.goto(base+'index.html');await listo(h);
  await h.click('#sideDatos');await h.waitForTimeout(400);
  await revisar(h,r,'Tus datos ×1.5 OpenDyslexic oscuro/alto');
  await cerrar(h);
  fs.rmSync(archivo,{force:true});fs.rmSync(malo,{force:true});
});
