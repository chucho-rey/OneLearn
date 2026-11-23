/* Fase de tesis (T1 y T2): la tesis en «Crear» con su estructura, el registro de autoría (sesiones, lo pegado y su
   origen, constancia con huella), la declaración de autoría y de uso de IA, y las fuentes: a mano, importadas de
   BibTeX y RIS o buscadas por DOI, citas en el texto y bibliografía automática en APA 7, en español. */
'use strict';
const fs=require('fs');
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}
function pegar(p,texto){
  return p.evaluate(function(t){
    var dt=new DataTransfer();dt.setData('text/plain',t);
    document.querySelector('.ed-cuerpo').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
  },texto);
}
const LARGO='Según varios metaanálisis, quienes leen en pantalla comprenden menos los textos informativos largos que quienes leen en papel, sobre todo con poco tiempo.';
const BIB=`@article{garcia2019,
  author = {Garc{\\'i}a, Mar{\\'i}a and Pe{\\~n}a, Jos{\\'e} Luis},
  title = {{Aprendizaje} en l{\\'i}nea},
  journal = {Perfiles Educativos}, year = 2019, volume = {41}, number = {164}, pages = {8--25},
  doi = {10.22201/iisue.24486167e.2019.164}
}
@book{unesco, author={{UNESCO}}, title={Educación 2030}, publisher={UNESCO}, year={2016}}`;
const RIS=`TY  - JOUR
AU  - Ruiz, Carlos
AU  - Vega, Lucía
PY  - 2021
TI  - Lectura digital
JO  - Revista Iberoamericana
VL  - 12
IS  - 2
SP  - 101
EP  - 120
ER  - `;

prueba('Fase de tesis · Autoría, fuentes y citas',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);

  /* ---------- Crear una tesis ---------- */
  await p.click('#sideCrear');await p.waitForTimeout(200);
  r.cumple(await p.isVisible('.crear-o[data-tipo="tesis"]'),'«Tesis» ya se puede crear');
  await Promise.all([p.waitForURL(/documento\.html\?id=d-/),p.click('[data-tipo="tesis"]')]);await listo(p,500);
  const est=await p.evaluate(function(){
    var d=AT.docActual,c=d.contenido.content;
    return {tipo:d.tipo,props:d.props.map(function(x){return x.nombre}).join('|'),
      tipos:c.map(function(b){return b.type}),
      secciones:c.filter(function(b){return b.type==='heading'}).map(function(b){return b.content?b.content[0].text:''}),
      barra:!!document.getElementById('tsBarra'),fuentes:Array.isArray(d.fuentes),autoria:!!d.autoria};
  });
  r.cumple(est.tipo==='tesis'&&est.barra&&est.fuentes&&est.autoria,'la tesis nueva trae su barra, sus fuentes y su registro de autoría',est);
  r.igual(est.props,'Autor(a)|Universidad|Programa|Asesor(a)|Año','los datos de la portada son propiedades');
  r.cumple(est.tipos.slice(0,4).join(' ')==='indice indicePiezas indicePiezas declaracion'&&est.tipos.indexOf('bibliografia')>0,'empieza con los índices y la declaración de autoría, y trae la bibliografía',est.tipos);
  r.igual(est.secciones.join(' | '),'Resumen | Introducción | Capítulo 1. Planteamiento del problema | Capítulo 2. Marco teórico | Capítulo 3. Metodología | Capítulo 4. Resultados | Capítulo 5. Discusión | Conclusiones | Referencias | Anexos','la estructura de una tesis, capítulo por capítulo');
  await revisar(p,r,'tesis nueva en escritorio');

  /* ---------- Escribir y pegar: el registro de autoría ---------- */
  await p.locator('.ed-cuerpo h2',{hasText:'Introducción'}).click();
  await p.keyboard.press('End');await p.keyboard.press('ArrowDown');
  await p.keyboard.type('La lectura digital cambió la forma de estudiar. ');
  let a=await p.evaluate(function(){return AT.docActual.autoria});
  r.cumple(a.sesiones.length===1&&a.sesiones[0].e===48&&a.sesiones[0].p===0,'lo tecleado se cuenta en la sesión (48 caracteres)',a.sesiones);
  await pegar(p,'corto');await p.waitForTimeout(150);
  a=await p.evaluate(function(){return AT.docActual.autoria});
  r.cumple(!await p.isVisible('.au-bar')&&a.pegados.length===0&&a.sesiones[0].p===5,'un pegado corto se cuenta, pero no pregunta ni se lista',a);
  await pegar(p,LARGO);await p.waitForTimeout(200);
  r.cumple(await p.isVisible('.au-bar')&&/Pegaste unas 2\d palabras/.test(await p.textContent('.au-bar p')),'al pegar un texto largo, pregunta de dónde viene');
  r.cumple(await p.evaluate(function(){return document.activeElement&&document.activeElement.closest('.ed-cuerpo')!==null}),'la pregunta no le quita el foco al editor');
  await p.click('.au-bar [data-o="propio"]');await p.waitForTimeout(100);
  a=await p.evaluate(function(){return AT.docActual.autoria});
  r.cumple(!await p.isVisible('.au-bar')&&a.pegados.length===1&&a.pegados[0].o==='propio'&&/^Según varios metaanálisis/.test(a.pegados[0].m)&&a.pegados[0].n===LARGO.length,'«Las escribí yo» queda anotado con una muestra del texto',a.pegados);
  await p.keyboard.press('Control+z');await p.waitForTimeout(100);
  const b=await p.evaluate(function(){return AT.docActual.autoria.sesiones[0].b});
  r.igual(b,0,'deshacer no cuenta como borrar');
  await p.keyboard.press('Control+Shift+z');await p.waitForTimeout(100);

  /* ---------- Fuentes: a mano ---------- */
  await p.click('[data-ts="fuentes"]');await p.waitForSelector('dialog.fu-dlg');
  r.cumple(/Todavía no hay fuentes/.test(await p.textContent('.fu-dlg')),'sin fuentes, la ventana invita a agregar la primera');
  await revisar(p,r,'ventana Fuentes vacía');
  await p.click('[data-fu="nueva"]');
  await p.selectOption('#fuTipo','articulo');
  await p.fill('#fuAut','Delgado, Pablo\nVargas, Cristina\nSalmerón, Ladislao');
  await p.fill('[data-c="anio"]','2018');
  await p.fill('[data-c="titulo"]','Don’t throw away your printed books: A meta-analysis on the effects of reading media on reading comprehension');
  await p.fill('[data-c="contenedor"]','Educational Research Review');
  await p.fill('[data-c="volumen"]','25');await p.fill('[data-c="paginas"]','23-38');await p.fill('[data-c="doi"]','10.1016/j.edurev.2018.09.003');
  r.igual(await p.textContent('.fu-prev'),'Delgado, P., Vargas, C., y Salmerón, L. (2018). Don’t throw away your printed books: A meta-analysis on the effects of reading media on reading comprehension. Educational Research Review, 25, 23–38. https://doi.org/10.1016/j.edurev.2018.09.003','la vista previa muestra la referencia en APA 7');
  r.cumple(await p.evaluate(function(){var i=document.querySelectorAll('.fu-prev i');return i.length===2&&i[0].textContent==='Educational Research Review'&&i[1].textContent==='25'}),'revista y volumen van en cursiva');
  await revisar(p,r,'formulario de fuente');
  await p.click('#fuForm [type=submit]');
  r.cumple(await p.locator('.fu-i').count()===1&&/sin citar/.test(await p.textContent('.fu-i')),'la fuente queda en la lista, sin citar');

  /* ---------- Importar BibTeX y RIS ---------- */
  await p.click('[data-fu="importar"]');
  await p.fill('#fuTxt',BIB);
  await p.click('#fuImp [type=submit]');await p.waitForTimeout(150);
  await p.click('[data-fu="importar"]');
  await p.fill('#fuTxt',RIS);
  await p.click('#fuImp [type=submit]');await p.waitForTimeout(150);
  const refs=await p.$$eval('.fu-ref',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(refs.length===4&&refs[1]==='García, M., y Peña, J. L. (2019). Aprendizaje en línea. Perfiles Educativos, 41(164), 8–25. https://doi.org/10.22201/iisue.24486167e.2019.164','BibTeX: acentos de LaTeX, dos autores con «y» y páginas con guion largo',refs);
  r.cumple(refs[2]==='UNESCO. (2016). Educación 2030. UNESCO.'&&refs[3]==='Ruiz, C., y Vega, L. (2021). Lectura digital. Revista Iberoamericana, 12(2), 101–120.','una institución como autora y un artículo importado de RIS',refs);

  /* ---------- Buscar por DOI (respuesta simulada de Crossref) ---------- */
  await p.route('https://api.crossref.org/**',function(ruta){
    ruta.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({message:{type:'book',title:['Cómo se hace una tesis'],author:[{family:'Eco',given:'Umberto'}],issued:{'date-parts':[[2001]]},publisher:'Gedisa',DOI:'10.9999/eco.2001'}})});
  });
  await p.click('[data-fu="buscar"]');
  await p.fill('#fuQ','10.9999/eco.2001');
  await p.click('#fuBuscar [type=submit]');
  await p.waitForSelector('#fuForm');
  r.cumple(await p.inputValue('[data-c="titulo"]')==='Cómo se hace una tesis'&&await p.inputValue('#fuAut')==='Eco, Umberto'&&await p.inputValue('#fuTipo')==='libro','el DOI llena el formulario para revisarlo');
  await p.click('#fuForm [type=submit]');
  await p.route('https://openlibrary.org/**',function(ruta){ruta.abort()});
  await p.click('[data-fu="buscar"]');await p.fill('#fuQ','978-607-00-0000-1');
  await p.click('#fuBuscar [type=submit]');
  await p.waitForFunction(function(){return /No se encontró o no hay conexión/.test(document.getElementById('fuMsg').textContent)});
  r.cumple(true,'sin conexión, el ISBN avisa y propone agregarla a mano');
  await p.keyboard.press('Escape');await p.waitForTimeout(100);
  r.cumple(await p.isVisible('[data-fu="nueva"]'),'Esc en un formulario regresa a la lista');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  r.cumple(await p.evaluate(function(){return !document.querySelector('dialog.fu-dlg')&&document.activeElement.getAttribute('data-ts')==='fuentes'}),'Esc cierra la ventana y el foco vuelve a «Fuentes»');
  r.igual(await p.textContent('#tsBarra .ts-n'),'5','la barra cuenta 5 fuentes');

  /* ---------- Citar ---------- */
  await p.locator('.ed-cuerpo h2',{hasText:'Capítulo 2. Marco teórico'}).click();
  await p.keyboard.press('End');await p.keyboard.press('ArrowDown');
  await p.keyboard.type('Leer en papel ayuda a comprender ');
  await p.click('[data-ts="citar"]');await p.waitForSelector('dialog.fu-dlg');
  await p.fill('#fuPag','30');
  await p.locator('.fu-i',{hasText:'Delgado'}).locator('[data-fu="citar"]').click();await p.waitForTimeout(200);
  await p.keyboard.type('y según ');
  await p.keyboard.type('/fuente');await p.waitForTimeout(150);
  r.igual(await p.textContent('.menu-barra .menu-i.activo b'),'Cita bibliográfica','«/fuente» ofrece la cita bibliográfica');
  await p.keyboard.press('Enter');
  await p.waitForSelector('dialog.fu-dlg');
  await p.check('#fuNarr');
  await p.locator('.fu-i',{hasText:'Eco'}).locator('[data-fu="citar"]').click();await p.waitForTimeout(200);
  const citas=await p.$$eval('.ed-cuerpo .ref',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(citas.indexOf('(Delgado et al., 2018, p. 30)')>=0&&citas.indexOf('Eco (2001)')>=0,'citas entre paréntesis con página, con «et al.», y narrativas desde el menú «/»',citas);
  r.cumple(await p.evaluate(function(){var s=window.getSelection();return !!(s.anchorNode&&s.anchorNode.parentElement&&s.anchorNode.parentElement.closest('.ed-cuerpo'))}),'después de citar, el cursor sigue en el texto');
  await p.waitForTimeout(400);
  const bib=await p.$$eval('.ed-biblio ul.biblio li',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(bib.length===2&&/^Delgado, P\./.test(bib[0])&&/^Eco, U\. \(2001\)\. Cómo se hace una tesis\. Gedisa\. https:\/\/doi\.org\/10\.9999\/eco\.2001$/.test(bib[1]),'la bibliografía tiene solo las citadas, en orden alfabético',bib);
  await p.check('.ed-biblio [data-todas]');await p.waitForTimeout(150);
  r.igual(await p.locator('.ed-biblio ul.biblio li').count(),5,'«Incluir las que no citaste» las muestra todas');
  await p.uncheck('.ed-biblio [data-todas]');await p.waitForTimeout(150);

  /* Clic en una cita: cambiar la página y el tipo de cita */
  await p.locator('.ed-cuerpo .ref',{hasText:'Delgado'}).click();await p.waitForSelector('.menu');
  await p.locator('.menu-i',{hasText:'Cambiar la página'}).click();
  await p.fill('#refPag','30-31');await p.keyboard.press('Enter');await p.waitForTimeout(150);
  r.cumple((await p.$$eval('.ed-cuerpo .ref',function(e){return e.map(function(x){return x.textContent})})).indexOf('(Delgado et al., 2018, pp. 30–31)')>=0,'la página se cambia desde la cita: «pp.» y guion largo');

  /* ---------- Declaración de autoría ---------- */
  await p.fill('.dp-fila[data-i="0"] .dp-v','Ana López');await p.waitForTimeout(150);
  r.cumple(/^Yo, Ana López, declaro que este trabajo es de mi autoría/.test(await p.textContent('.ed-decl-t')),'la declaración usa el nombre de la portada');
  await p.check('.ed-decl input[value="si"]');await p.waitForTimeout(100);
  await p.fill('.ed-uso [data-c="herramienta"]','ChatGPT');
  await p.fill('.ed-uso [data-c="uso"]','revisar la ortografía del capítulo 2');await p.waitForTimeout(150);
  r.cumple(/ChatGPT: revisar la ortografía del capítulo 2\./.test(await p.textContent('.ed-decl-t'))&&/asumo la responsabilidad/.test(await p.textContent('.ed-decl-t')),'al declarar IA, dice cuál, para qué y que revisaste lo producido');
  await p.click('.ed-decl [data-acc="agregar"]');
  r.igual(await p.locator('.ed-uso').count(),2,'se puede declarar más de una herramienta');
  await p.click('.ed-decl [data-acc="quitar"] >> nth=1');
  await esperarGuardado(p);

  /* ---------- Panel «Autoría» y constancia ---------- */
  await p.click('[data-ts="autoria"]');await p.waitForSelector('dialog.au-dlg');
  const pan=(await p.textContent('.au-dlg')).replace(/\s+/g,' ');
  r.cumple(/Sesiones ?1/.test(pan)&&/Lo que pegaste/.test(pan)&&/Declaraste que usaste IA: ChatGPT\./.test(pan),'el panel resume sesiones, lo pegado y la declaración',pan.slice(0,300));
  await revisar(p,r,'ventana Autoría');
  await p.selectOption('.au-dlg select[data-i="0"]','fuente');
  r.igual(await p.evaluate(function(){return AT.docActual.autoria.pegados[0].o}),'fuente','el origen se puede cambiar después');
  const [desc]=await Promise.all([p.waitForEvent('download'),p.click('[data-au="constancia"]')]);
  const html=fs.readFileSync(await desc.path(),'utf8');
  r.cumple(/^constancia-de-autoria-tesis-sin-titulo\.html$/.test(desc.suggestedFilename())&&/Constancia de autoría/.test(html)&&/<code>[0-9a-f]{64}<\/code>/.test(html)&&/De una fuente/.test(html)&&/Yo, Ana López, declaro/.test(html),'la constancia trae sesiones, origen de lo pegado, declaración y huella SHA-256',desc.suggestedFilename());
  await p.keyboard.press('Escape');await p.waitForTimeout(150);

  /* ---------- Markdown, leer y persistencia ---------- */
  const md=await p.evaluate(function(){return AT.documentoMarkdown(AT.docActual)});
  r.cumple(/ayuda a comprender \(Delgado et al\., 2018, pp\. 30–31\)/.test(md)&&/\*Educational Research Review\*, \*25\*/.test(md)&&/## Declaración de autoría/.test(md),'el Markdown lleva las citas, la bibliografía con cursivas y la declaración');
  await esperarGuardado(p);
  await p.reload();await listo(p,500);
  const d=await p.evaluate(function(){return AT.datos.documentos.leer(AT.documentoAbierto)});
  r.cumple(d.fuentes.length===5&&d.autoria.pegados.length===1&&d.autoria.sesiones.length>=1,'fuentes y autoría se guardan con el documento');
  if(await p.textContent('#docModo')!=='Editar')await p.click('#docModo');
  await p.waitForSelector('.page ul.biblio');
  const lec=await p.evaluate(function(){
    return {refs:[].map.call(document.querySelectorAll('.page .ref'),function(x){return x.textContent}),
      bib:document.querySelectorAll('.page ul.biblio li').length,cursiva:!!document.querySelector('.page ul.biblio li i'),
      decl:(document.querySelector('.page .declaracion')||{}).textContent||'',editor:!!document.querySelector('.ed-cuerpo')};
  });
  r.cumple(!lec.editor&&lec.refs.length===2&&lec.bib===2&&lec.cursiva&&/Declaración de autoría/.test(lec.decl),'al leer, las citas, la bibliografía y la declaración se ven como en un documento formal',lec);
  await revisar(p,r,'tesis en modo lectura');
  await cerrar(p);

  /* ---------- Variantes de lectura y celular ---------- */
  const m=await pagina(browser,{ancho:390,ajustes:{tema:'dark',contraste:'high',escala:1.5,fuente:'opendyslexic'},reducir:true});
  /* Cada página de prueba tiene su propio almacenamiento: se guarda ahí la misma tesis */
  await m.goto(base+'inicio.html');await listo(m);
  await m.evaluate(function(x){return AT.datos.documentos.guardar(x,{conservarFecha:true}).then(function(){return 1})},d);
  await m.goto(base+'documento.html?id='+d.id);await listo(m,500);
  await m.evaluate(function(){var b=document.getElementById('docModo');if(/Editar/.test(b.textContent))b.click()});await m.waitForTimeout(400);
  await revisar(m,r,'tesis al editar en celular, oscuro, alto contraste ×1.5 y OpenDyslexic');
  await m.click('#docMas');await m.waitForTimeout(150);
  r.cumple(/Fuentes/.test(await m.textContent('.menu'))&&/Autoría y constancia/.test(await m.textContent('.menu')),'«⋯» también abre Fuentes y Autoría');
  await m.locator('.menu-i',{hasText:'Fuentes'}).click();await m.waitForSelector('dialog.fu-dlg');
  await revisar(m,r,'ventana Fuentes en celular');
  await m.keyboard.press('Escape');await m.waitForTimeout(150);
  await m.click('[data-ts="autoria"]');await m.waitForSelector('dialog.au-dlg');
  await revisar(m,r,'ventana Autoría en celular');
  await m.keyboard.press('Escape');await m.waitForTimeout(150);
  await pegar(m,LARGO);await m.waitForTimeout(200);
  await revisar(m,r,'pregunta de lo pegado en celular');
  await m.click('#docModo');await m.waitForTimeout(400);
  await revisar(m,r,'tesis al leer en celular, oscuro, alto contraste ×1.5 y OpenDyslexic');
  await cerrar(m);

  /* ---------- Otros documentos no traen las herramientas de la tesis ---------- */
  const q=await pagina(browser,{ancho:1280,reducir:true});
  await q.goto(base+'inicio.html');await listo(q);
  await Promise.all([q.waitForURL(/documento\.html/),q.evaluate(function(){AT.crear.nuevo('notas');return 1}).catch(function(){return 1})]);await listo(q,400);
  await q.click('.ed-cuerpo');await q.keyboard.type('/cita');await q.waitForTimeout(200);
  const opc=await q.$$eval('.menu-barra .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(!await q.isVisible('#tsBarra')&&opc.indexOf('Cita bibliográfica')<0&&opc.indexOf('Cita textual')>=0,'unas notas no traen fuentes, citas bibliográficas ni registro de autoría',opc);
  r.cumple(await q.evaluate(function(){return !AT.docActual.autoria&&!AT.docActual.fuentes}),'ni guardan datos de autoría');
  await cerrar(q);
});
