/* Etapa Empresas, E1: lo de estudio se separó de OneBook sin que nadie pierda nada.
   - Los bloques que ya no existen (preguntas de repaso, laboratorio, citas, bibliografía, ecuaciones…) y cualquier
     tipo desconocido se conservan tal cual: el editor los muestra como «legado» y al guardar vuelven idénticos.
   - Un bloque que no cuadra con el esquema tampoco se pierde.
   - Las páginas de estudio (libreta, tesis…) no salen en la barra, el explorador ni la búsqueda; están en «De estudio»
     y se abren solo para leer (con aviso), exportar o descargar.
   - Las páginas de estudio y sus archivos ya no se publican. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}
const T=function(t){return {type:'text',text:t}};
const VIEJOS=[
  {type:'repaso',attrs:{id:'b-rep001',preguntas:[{q:'¿Cuánto es 2+2?',o:['4','5'],a:0,e:'Suma.'}]}},
  {type:'laboratorio',attrs:{id:'b-lab001',nombre:'llena-ram',titulo:'Llena tu RAM'}},
  {type:'paragraph',attrs:{id:'b-par001'},content:[T('Según '),{type:'referencia',attrs:{fuente:'f-1',pagina:'12',narrativa:false}},T(' y la fórmula '),{type:'formula',attrs:{latex:'x^2+y^2'}},T(' con '),{type:'chip-raro',attrs:{v:7}},T('.')]},
  {type:'bibliografia',attrs:{id:'b-bib001',todas:true}},
  {type:'ecuacion',attrs:{id:'b-ecu001',clave:'p-ecu001',latex:'E=mc^2'}},
  {type:'bloque-raro',attrs:{id:'b-raro01',dato:'x'},content:[{type:'paragraph',content:[T('dentro de lo raro')]}]},
  /* Un tipo conocido que no cuadra con el esquema (una tabla con un párrafo directo) */
  {type:'table',attrs:{id:'b-mala01'},content:[{type:'paragraph',content:[T('celda mal puesta')]}]}
];
function docViejo(){
  return {formato:1,tipo:'notas',id:'d-viejo',titulo:'Página con cosas de antes',props:[],creado:'2026-10-01T10:00:00.000Z',editado:'2026-10-01T10:00:00.000Z',
    contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-ini001'},content:[T('Inicio')]}].concat(JSON.parse(JSON.stringify(VIEJOS)),[{type:'paragraph',attrs:{id:'b-fin001'},content:[T('Fin')]}])}};
}
function tesis(){
  return {formato:1,tipo:'tesis',id:'d-tesis',titulo:'Mi tesis de antes',props:[{nombre:'Universidad',valor:'UNAM',estilo:'texto'}],creado:'2026-09-01T10:00:00.000Z',editado:'2026-09-01T10:00:00.000Z',
    fuentes:[{id:'f-1',tipo:'libro',autores:[{org:'UNESCO'}],anio:'2016',titulo:'Educación 2030'}],autoria:{v:1,sesiones:[],pegados:[]},
    contenido:{type:'doc',content:[{type:'heading',attrs:{id:'b-t1',level:2},content:[T('Introducción')]},{type:'paragraph',attrs:{id:'b-t2'},content:[T('La lectura en pantalla y la comprensión.')]},
      {type:'declaracion',attrs:{id:'b-t3',ia:'no',usos:[]}}]}};
}

prueba('Sin estudio: nada se pierde',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  await p.evaluate(function(l){return Promise.all(l.map(function(d){return AT.datos.documentos.guardar(d,{conservarFecha:true})}))},[docViejo(),tesis()]);

  /* ---------- El editor conserva lo que ya no existe ---------- */
  await p.goto(base+'documento.html?id=d-viejo');await listo(p,500);
  if(/Editar/.test(await p.textContent('#docModo')))await p.click('#docModo');
  await p.waitForSelector('.ed-legado');
  const vista=await p.evaluate(function(){return {
    bloques:[].map.call(document.querySelectorAll('.ed-cuerpo .ed-legado .legado-t'),function(x){return x.textContent.split(':')[0].split('.')[0]}),
    enLinea:[].map.call(document.querySelectorAll('.ed-cuerpo .legado-l'),function(x){return x.textContent}),
    texto:document.querySelector('.ed-cuerpo').textContent}});
  r.igual(vista.bloques.join(' | '),'Preguntas de repaso | Laboratorio | Bibliografía | Ecuación | Un bloque que esta versión de OneBook no conoce | Un bloque que no se pudo abrir',
    'los bloques que ya no existen se ven como legado, con su nombre (y lo desconocido o dañado, con su aviso)');
  r.cumple(vista.enLinea.join(' | ')==='Cita bibliográfica | x^2+y^2 | …','dentro del texto, la cita y la fórmula se ven en línea',vista.enLinea);
  r.cumple(/Cuánto es 2\+2/.test(vista.texto)&&/E=mc\^2/.test(vista.texto)&&/dentro de lo raro/.test(vista.texto),'se ve su texto',vista.texto.slice(0,200));
  await revisar(p,r,'página con legado en el editor');
  /* Se edita algo de la página y se guarda */
  await p.click('.ed-cuerpo p >> nth=0');await p.keyboard.press('End');await p.keyboard.type(' y más');
  await esperarGuardado(p);
  const g=await p.evaluate(function(){return AT.datos.documentos.leer('d-viejo')});
  const c=g.contenido.content;
  r.igual(c[0].content[0].text,'Inicio y más','lo que escribes se guarda');
  r.igual(JSON.stringify(c.slice(1,8)),JSON.stringify(VIEJOS),'y lo que ya no existe se guarda idéntico, en su lugar (también lo desconocido, lo dañado y lo de dentro del texto)');
  r.cumple(!/"legado/.test(JSON.stringify(g)),'la envoltura «legado» nunca llega a lo guardado');
  r.igual(c[8].content[0].text,'Fin','el resto de la página sigue igual');
  /* Mover un bloque de legado con el teclado: se mueve entero */
  await p.click('.ed-legado >> nth=0');await p.waitForTimeout(80);
  await p.keyboard.press('Alt+ArrowUp');await p.waitForTimeout(150);
  await esperarGuardado(p);
  const m=await p.evaluate(function(){return AT.datos.documentos.leer('d-viejo').then(function(d){return d.contenido.content.map(function(b){return b.type})})});
  r.igual(m.slice(0,3).join(','),'repaso,paragraph,laboratorio','un bloque de legado se mueve como cualquier otro, sin perder nada');
  /* Al leer */
  await p.click('#docModo');await p.waitForSelector('.page .legado');
  r.cumple(await p.evaluate(function(){return document.querySelectorAll('.page .legado').length>=3&&!document.querySelector('.page .demo,.page #qz')}),'al leer también se ven como legado (sin laboratorios ni repasos que no funcionarían)');
  await revisar(p,r,'página con legado al leer');

  /* ---------- Las páginas de estudio ---------- */
  await p.goto(base+'inicio.html');await listo(p,600);
  r.cumple(!/Mi tesis de antes/.test(await p.textContent('#docsLista')),'la tesis no sale en la barra lateral');
  r.cumple(!/Mi tesis de antes/.test(await p.textContent('#xpLista')),'ni en «Todas tus páginas»');
  r.cumple(await p.isVisible('[data-ubic="cat:estudio"]'),'el explorador ofrece «De estudio (solo lectura)»');
  await p.click('[data-ubic="cat:estudio"]');await p.waitForTimeout(200);
  r.cumple(/Mi tesis de antes/.test(await p.textContent('#xpLista'))&&/Página de estudio/.test(await p.textContent('#xpLista')),'ahí está, como página de estudio');
  await p.click('[data-ubic="todas"]');
  await p.keyboard.press('Control+k');await p.waitForSelector('#busQ');
  await p.fill('#busQ','tesis');await p.waitForTimeout(500);
  r.cumple(!/Mi tesis de antes/.test(await p.textContent('#busRes')),'la búsqueda no la encuentra');
  await p.keyboard.press('Escape');
  /* Se abre solo para leer */
  await p.goto(base+'documento.html?id=d-tesis');await listo(p,500);
  const t=await p.evaluate(function(){return {aviso:(document.querySelector('.doc-estudio')||{}).textContent||'',modo:document.getElementById('docModo').hidden,
    editor:!!document.querySelector('.ProseMirror'),estado:document.getElementById('docEstado').textContent,cambio:!!AT.docCambio,texto:document.getElementById('docPage').textContent}});
  r.cumple(/Esta página es de estudio/.test(t.aviso)&&/sigue guardada/.test(t.aviso),'una página de estudio avisa que lo de estudio se separó y que sigue guardada',t.aviso);
  r.cumple(t.modo&&!t.editor&&t.estado==='Solo lectura'&&!t.cambio,'y se abre solo para leer',t);
  r.cumple(/La lectura en pantalla/.test(t.texto)&&/Declaración de autoría/.test(t.texto),'se ve su contenido (la declaración, como legado)');
  await p.click('#docMas');await p.waitForTimeout(150);
  r.igual(await p.$$eval('.menu .menu-i b',function(e){return e.map(function(x){return x.textContent}).join(' | ')}),'Imprimir o exportar | Descargar como Markdown','su menú solo exporta o descarga');
  const [md]=await Promise.all([p.waitForEvent('download'),p.click('.menu-i:has-text("Markdown")')]);
  r.cumple(/^mi-tesis-de-antes\.md$/.test(md.suggestedFilename()),'y se descarga como Markdown',md.suggestedFilename());
  await revisar(p,r,'página de estudio, solo lectura');
  const intacta=await p.evaluate(function(){return AT.datos.documentos.leer('d-tesis').then(function(d){return d.fuentes.length===1&&d.autoria.v===1&&d.editado==='2026-09-01T10:00:00.000Z'})});
  r.cumple(intacta,'abrirla no la cambia: sus fuentes y su registro de autoría siguen ahí');
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);

  /* ---------- «/» sin lo de estudio ---------- */
  const q=await pagina(browser,{ancho:1280,reducir:true});
  await q.goto(base+'inicio.html');await listo(q);
  await Promise.all([q.waitForURL(/documento\.html/),q.evaluate(function(){AT.crear.nuevo('notas');return 1}).catch(function(){return 1})]);await listo(q,400);
  const ks=await q.evaluate(function(){return AT.editorInsertar.map(function(x){return x.k})});
  r.cumple(['repaso','referencia','bibliografia','declaracion','ecuacion','formula','indiceFiguras','indiceTablas'].every(function(k){return ks.indexOf(k)<0})&&['resumen','tablaNumerada','notaPie','refCruzada','citar'].every(function(k){return ks.indexOf(k)>=0}),
    'el editor ya no ofrece lo de estudio y conserva lo útil para la empresa',ks);
  await cerrar(q);

  /* ---------- Lo de estudio ya no se publica ---------- */
  const s=await pagina(browser,{perfil:false});
  for(const ruta of ['lecciones/ram.html','lecciones/como-funciona.html','rutas.html','proyectos/index.html','acerca.html','estudiantes.html','assets/js/catalogo.js','assets/js/terminal.js','assets/js/fuentes.js','assets/vendor/katex/katex.min.js']){
    const res=await s.request.get(base+ruta);
    r.igual(res.status(),404,ruta+' ya no se publica');
  }
  await cerrar(s);
});
