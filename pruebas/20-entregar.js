/* Tesis: entregar (hito T4). La ventana «Entregar» (formato, revisión previa), el estilo IEEE, el PDF paginado con
   Paged.js (portada sin número, preliminares en romanos, cuerpo desde 1, índice con páginas, notas al pie al pie de la
   página) y el DOCX (secciones con su numeración, márgenes, interlineado, estilos, índices, notas al pie, imagen,
   ecuaciones de Word y la huella en las propiedades). Cada entrega queda en el registro y en la constancia de autoría.
   El DOCX se revisa abriendo el ZIP con zlib de Node, sin herramientas externas. */
'use strict';
const fs=require('fs'),zlib=require('zlib');
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

/* Lee un .docx (ZIP) y devuelve {nombre: Buffer} */
function unzip(buf){
  const out={},fin=buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  let p=buf.readUInt32LE(fin+16);
  for(let k=0,n=buf.readUInt16LE(fin+10);k<n;k++){
    const met=buf.readUInt16LE(p+10),tam=buf.readUInt32LE(p+20),nl=buf.readUInt16LE(p+28),el=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lo=buf.readUInt32LE(p+42);
    const nombre=buf.slice(p+46,p+46+nl).toString(),ini=lo+30+buf.readUInt16LE(lo+26)+buf.readUInt16LE(lo+28),datos=buf.slice(ini,ini+tam);
    out[nombre]=met===8?zlib.inflateRawSync(datos):datos;
    p+=46+nl+el+cl;
  }
  return out;
}
/* Una tesis con todo: portada, índices, declaración, citas, nota al pie, figura, ecuación, tabla y bibliografía */
function tesis(png){
  let k=0;
  function id(){return 'b-t'+(++k).toString(36).padStart(4,'0')}
  function P(t,extra){return {type:'paragraph',attrs:{id:id()},content:[{type:'text',text:t}].concat(extra||[])}}
  function H(t,n){return {type:'heading',attrs:{id:id(),level:n||2},content:[{type:'text',text:t}]}}
  const largo='La lectura en pantalla cambió la manera en que los estudiantes preparan sus exámenes. Este trabajo compara dos grupos durante un semestre, con las mismas lecturas y evaluaciones. ';
  const relleno=[];for(let i=0;i<5;i++)relleno.push(P(largo+largo+largo));
  return {id:'d-entrega',formato:1,tipo:'tesis',titulo:'Lectura digital y comprensión',
    props:[{nombre:'Autor(a)',valor:'Ana López Ruiz',estilo:'texto'},{nombre:'Universidad',valor:'Universidad Nacional',estilo:'texto'},
      {nombre:'Programa',valor:'Licenciada en Pedagogía',estilo:'texto'},{nombre:'Asesor(a)',valor:'Dra. Marta Peña',estilo:'texto'},{nombre:'Año',valor:'2026',estilo:'texto'},{nombre:'Lugar',valor:'Ciudad de México',estilo:'texto'}],
    fuentes:[{id:'f-a',tipo:'articulo',autores:[{apellido:'García',nombre:'María'},{apellido:'Peña',nombre:'José Luis'}],anio:'2019',titulo:'Aprendizaje en línea',contenedor:'Perfiles Educativos',volumen:'41',numero:'164',paginas:'8-25',doi:'10.22201/iisue.24486167e.2019.164'},
      {id:'f-b',tipo:'libro',autores:[{org:'UNESCO'}],anio:'2016',titulo:'Educación 2030',editorial:'UNESCO'}],
    autoria:{v:1,sesiones:[{i:Date.now()-3600e3,f:Date.now()-1800e3,e:4000,b:200,p:0}],pegados:[]},
    contenido:{type:'doc',content:[
      {type:'indice',attrs:{id:'b-indice'}},{type:'indicePiezas',attrs:{id:'b-ifig',clase:'figura'}},{type:'indicePiezas',attrs:{id:'b-itab',clase:'tabla'}},
      {type:'declaracion',attrs:{id:'b-decl',ia:'no',usos:[]}},
      H('Resumen'),P('Este estudio compara la comprensión lectora en pantalla y en papel.'),
      H('Introducción'),P('Como muestran estudios previos ',[{type:'referencia',attrs:{fuente:'f-b'}},{type:'text',text:' y '},{type:'referencia',attrs:{fuente:'f-a',pagina:'12'}},
        {type:'text',text:', la pantalla afecta la comprensión'},{type:'notaPie',attrs:{texto:'Datos del ciclo escolar 2025.'}},{type:'text',text:'. Ver la '},{type:'refCruzada',attrs:{destino:'p-fig1'}},{type:'text',text:'.'}])
    ].concat(relleno,[
      {type:'figura',attrs:{id:'b-fig',clave:'p-fig1',src:'data:image/webp;base64,'+png,alt:'Gráfica de barras',titulo:'Horas de lectura por semana',nota:'Elaboración propia.'}},
      H('Capítulo 1. Marco teórico'),P('La fórmula ',[{type:'formula',attrs:{latex:'x^2+y^2=r^2'}},{type:'text',text:' se usa así.'}]),
      {type:'ecuacion',attrs:{id:'b-ecu',clave:'p-ecu1',latex:'\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i'}},
      {type:'tablaNumerada',attrs:{id:'b-tab',clave:'p-tab1',titulo:'Puntajes promedio',nota:'Datos de la encuesta.'},content:[{type:'table',content:[
        {type:'tableRow',content:[{type:'tableHeader',content:[P('Grupo')]},{type:'tableHeader',content:[P('Puntaje')]}]},
        {type:'tableRow',content:[{type:'tableCell',content:[P('Papel')]},{type:'tableCell',content:[P('8.2')]}]}]}]},
      H('Conclusiones'),P('La pantalla no es peor si se enseña a leer en ella.',[{type:'notaPie',attrs:{texto:'Una segunda aclaración.'}}]),
      H('Referencias'),{type:'bibliografia',attrs:{id:'b-bib',todas:false}}
    ])}};
}
async function abrirEntregar(p){await p.click('[data-ts="entregar"]');await p.waitForSelector('dialog.en-dlg');await p.waitForTimeout(100)}

prueba('Tesis · Entregar: PDF, Word e IEEE',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  const png=await p.evaluate(function(){var c=document.createElement('canvas');c.width=600;c.height=300;var x=c.getContext('2d');x.fillStyle='#ddd';x.fillRect(0,0,600,300);x.fillStyle='#285';x.fillRect(50,100,100,180);return c.toDataURL('image/webp').split(',')[1]});
  await p.evaluate(function(d){return AT.datos.documentos.guardar(d).then(function(){return 1})},tesis(png));
  await p.goto(base+'documento.html?id=d-entrega');await listo(p,500);
  if(/Editar/.test(await p.textContent('#docModo')))await p.click('#docModo');
  await p.waitForSelector('#tsBarra [data-ts="entregar"]');

  /* ---------- La ventana «Entregar» ---------- */
  await abrirEntregar(p);
  const v=await p.evaluate(function(){var d=document.querySelector('dialog.en-dlg');return {
    titulo:d.querySelector('h2').textContent,marcados:[].map.call(d.querySelectorAll('input:checked'),function(x){return x.name.slice(3)+'='+x.value}).join(' '),
    todo:/Todo en orden/.test(d.textContent),botones:[].map.call(d.querySelectorAll('[data-en]'),function(b){return b.getAttribute('data-en')}).join(' ')}});
  r.cumple(v.titulo==='Entregar tu tesis'&&v.marcados==='estilo=apa papel=carta letra=times interlineado=2 margen=normal','la ventana abre con la plantilla genérica en APA: carta, Times, interlineado doble, márgenes de 2.54 cm',v);
  r.cumple(v.todo&&/pdf/.test(v.botones)&&/docx/.test(v.botones),'con una tesis completa, «Antes de entregar» dice que todo está en orden y ofrece PDF y Word',v);
  await revisar(p,r,'ventana Entregar');

  /* ---------- IEEE ---------- */
  await p.check('input[name="en-estilo"][value="ieee"]');await p.waitForTimeout(300);
  const ieee=await p.evaluate(function(){return {refs:[].map.call(document.querySelectorAll('.ed-cuerpo .ref'),function(x){return x.textContent}).join(' '),
    bib:document.querySelector('.ed-biblio').textContent,estilo:AT.docActual.formato.estilo}});
  r.cumple(ieee.estilo==='ieee'&&ieee.refs==='[1] [2, p. 12]','con IEEE, las citas se numeran por orden de aparición',ieee.refs);
  r.cumple(/Bibliografía · IEEE/.test(ieee.bib)&&/\[1\] UNESCO, Educación 2030, UNESCO, 2016\./.test(ieee.bib)&&/\[2\] M\. García y J\. L\. Peña, “Aprendizaje en línea,” Perfiles Educativos, vol\. 41, no\. 164, pp\. 8–25, 2019, doi: 10\.22201/.test(ieee.bib),'y la bibliografía va en ese orden, con el formato IEEE',ieee.bib.slice(0,300));
  await p.check('input[name="en-estilo"][value="apa"]');await p.waitForTimeout(300);
  r.igual(await p.evaluate(function(){return [].map.call(document.querySelectorAll('.ed-cuerpo .ref'),function(x){return x.textContent}).join(' ')}),'(UNESCO, 2016) (García y Peña, 2019, p. 12)','de vuelta en APA 7, autor y año');

  /* ---------- Word (DOCX) ---------- */
  await p.check('input[name="en-margen"][value="encuadernar"]');
  const [des]=await Promise.all([p.waitForEvent('download'),p.click('[data-en="docx"]')]);
  const zip=unzip(fs.readFileSync(await des.path()));
  await p.waitForFunction(function(){return /Listo: se descargó/.test(document.querySelector('.en-dlg .td-msg').textContent)});
  const docx=zip['word/document.xml'].toString(),texto=docx.replace(/<w:tab\/>/g,' ').replace(/<[^>]+>/g,''),estilos=zip['word/styles.xml'].toString(),notasX=(zip['word/footnotes.xml']||'').toString(),core=(zip['docProps/core.xml']||'').toString();
  const secc=docx.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)||[];
  r.cumple(des.suggestedFilename()==='lectura-digital-y-comprension.docx'&&secc.length===3,'el DOCX trae tres secciones: portada, preliminares y cuerpo',secc.length);
  r.cumple(/w:fmt="lowerRoman"/.test(secc[1]||'')&&/w:start="1"/.test(secc[1]||'')&&/w:fmt="decimal"/.test(secc[2]||'')&&/w:start="1"/.test(secc[2]||'')&&!/headerReference/.test(secc[0]||''),'portada sin número; preliminares en romanos y cuerpo desde 1');
  r.cumple(/w:left="2268"/.test(secc[2]||'')&&/w:right="1440"/.test(secc[2]||'')&&/w:w="12240"/.test(secc[2]||''),'tamaño carta, 2.54 cm de margen y 4 cm a la izquierda para encuadernar');
  r.cumple(/w:line="480"/.test(estilos)&&/Times New Roman/.test(estilos)&&/w:sz w:val="24"/.test(estilos)&&/w:firstLine="720"/.test(estilos)&&/w:hanging="720"/.test(estilos),'Times New Roman de 12 puntos, interlineado doble, sangría de primera línea y bibliografía con sangría francesa');
  r.cumple(/TOC [^<]*\\o &quot;1-2&quot;/.test(docx)&&/TOC [^<]*\\t &quot;LeyendaFigura,1&quot;/.test(docx)&&/TOC [^<]*\\t &quot;LeyendaTabla,1&quot;/.test(docx)&&/w:val="Heading1"/.test(docx),'el índice es un campo de Word con los títulos, y los de figuras y tablas salen de sus leyendas');
  r.cumple(/<w:t[^>]*>Figura 1<\/w:t>/.test(docx)&&/Horas de lectura por semana/.test(docx)&&/<w:drawing>/.test(docx)&&Object.keys(zip).some(function(n){return /^word\/media\/.+\.png$/.test(n)}),'la figura lleva «Figura 1», su título y la imagen (en PNG)');
  r.cumple((docx.match(/<m:oMath>/g)||[]).length>=2&&/<m:f>/.test(docx)&&/<m:nary>/.test(docx),'la fórmula y la ecuación son ecuaciones nativas de Word');
  r.cumple(/Datos del ciclo escolar 2025\./.test(notasX)&&/Una segunda aclaración\./.test(notasX)&&(docx.match(/w:footnoteReference/g)||[]).length===2,'las notas al pie son notas al pie de Word');
  r.cumple(/\(UNESCO, 2016\)/.test(texto)&&/García, M\., y Peña, J\. L\. \(2019\)/.test(texto)&&/UNIVERSIDAD NACIONAL/.test(texto)&&/Yo, Ana López Ruiz, declaro/.test(texto),'citas, bibliografía, portada y declaración van en el archivo');
  r.cumple(/Huella SHA-256 del texto \(OneLearn\): [0-9a-f]{64}/.test(core)&&/Ana López Ruiz/.test(core),'la huella del texto y la autora van en las propiedades del archivo');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  let ent=await p.evaluate(function(){return AT.docActual.autoria.entregas});
  r.cumple(ent.length===1&&ent[0].f==='docx'&&/^[0-9a-f]{64}$/.test(ent[0].h)&&ent[0].w>100,'la entrega en Word queda en el registro de autoría, con su huella',ent);

  /* ---------- PDF ---------- */
  await abrirEntregar(p);
  await Promise.all([p.waitForURL(/imprimir\.html\?id=d-entrega/),p.click('[data-en="pdf"]')]);
  await p.waitForSelector('body[data-listo]',{timeout:20000});
  const pg=await p.evaluate(function(){
    var paginas=[].slice.call(document.querySelectorAll('.pagedjs_page'));
    var reglas=(document.getElementById('imNumeros')||{}).textContent||'';
    return {n:paginas.length,estado:document.getElementById('imEstado').textContent,
      tipos:paginas.map(function(x){return x.classList.contains('pagedjs_portada_page')?'P':x.classList.contains('pagedjs_preliminares_page')?'r':'a'}).join(''),
      reglas:(reglas.match(/counter-reset:page \d+/g)||[]).map(function(x){return x.replace('counter-reset:page ','')}).join(','),
      portada:[].map.call(paginas[0].querySelectorAll('.portada p'),function(x){return x.textContent}).join(' | '),
      notas:[].map.call(document.querySelectorAll('.pagedjs_footnote_area'),function(a){return a.textContent.trim()}).filter(Boolean).join(' | '),
      toc:[].map.call(document.querySelectorAll('.im-toc a'),function(a){return a.textContent+(document.getElementById(a.getAttribute('href').slice(1))?'✓':'✗')+(a.classList.contains('rom')?'(i)':'')}).join(' | '),
      fig:!!document.querySelector('.pagedjs_page figure.fig img'),ecu:!!document.querySelector('.pagedjs_page .ecu .katex'),
      letra:getComputedStyle(document.querySelector('.pagedjs_page .papel p')||document.body).fontFamily,
      tam:getComputedStyle(document.querySelector('.pagedjs_page')).width};
  });
  r.cumple(pg.n>=9&&/^Pr{5}a+$/.test(pg.tipos)&&pg.estado===pg.n+' páginas','el PDF tiene portada, cinco páginas preliminares y el cuerpo',pg.tipos);
  const aes=pg.tipos.replace(/[^a]/g,'').length;
  r.igual(pg.reglas,['1','2','3','4','5'].concat(Array.from({length:aes},function(_,i){return String(i+1)})).join(','),'los preliminares van de i a v y el cuerpo empieza en 1');
  r.cumple(pg.portada==='Universidad Nacional | Lectura digital y comprensión | Tesis | que para obtener el grado de | Licenciada en Pedagogía | Presenta | Ana López Ruiz | Asesor(a) | Dra. Marta Peña | Ciudad de México, 2026','la portada sale de las propiedades',pg.portada.slice(0,200));
  r.cumple(pg.notas==='Datos del ciclo escolar 2025. | Una segunda aclaración.','las notas al pie quedan al pie de su página',pg.notas);
  r.cumple(/^Resumen✓\(i\) \| Introducción✓ \| Capítulo 1\. Marco teórico✓ \| Conclusiones✓ \| Referencias✓ \| Figura 1\. Horas de lectura por semana✓ \| Tabla 1\. Puntajes promedio✓$/.test(pg.toc),'los índices enlazan a cada sección y pieza (los preliminares, en romanos)',pg.toc);
  r.cumple(pg.fig&&pg.ecu&&/Times New Roman/.test(pg.letra)&&pg.tam==='816px','figura, ecuación con KaTeX, Times New Roman y tamaño carta',pg);
  const pdf=await p.pdf({preferCSSPageSize:true});
  r.igual((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length,pg.n,'al guardar como PDF salen las mismas páginas');
  await revisar(p,r,'vista para imprimir');
  await p.evaluate(function(){window.print=function(){window.__imprimio=(window.__imprimio||0)+1}});
  await p.click('#imImprimir');await p.waitForFunction(function(){return window.__imprimio===1});
  await p.waitForTimeout(300);
  ent=await p.evaluate(function(){return AT.datos.documentos.leer('d-entrega').then(function(d){return d.autoria.entregas})});
  r.cumple(ent.length===2&&ent[1].f==='pdf'&&ent[1].h===ent[0].h,'«Imprimir» abre la impresión y anota la entrega en PDF, con la misma huella',ent);
  const m=await pagina(browser,{ancho:390,alto:844,ajustes:{tema:'dark',contraste:'high'},reducir:true});
  await m.goto(base+'inicio.html');await listo(m);
  const d=await p.evaluate(function(){return AT.datos.documentos.leer('d-entrega')});
  await m.evaluate(function(x){return AT.datos.documentos.guardar(x,{conservarFecha:true}).then(function(){return 1})},d);
  await m.goto(base+'imprimir.html?id=d-entrega');await m.waitForSelector('body[data-listo]',{timeout:20000});
  await revisar(m,r,'vista para imprimir en celular, oscuro y alto contraste');
  /* La constancia lista las entregas */
  await m.goto(base+'documento.html?id=d-entrega');await listo(m,500);
  if(/Editar/.test(await m.textContent('#docModo')))await m.click('#docModo');
  await m.click('[data-ts="entregar"]');await m.waitForSelector('dialog.en-dlg');
  await revisar(m,r,'ventana Entregar en celular, oscuro y alto contraste');
  await m.keyboard.press('Escape');await m.waitForTimeout(150);
  await m.click('[data-ts="autoria"]');await m.waitForSelector('dialog.au-dlg');
  r.cumple(/Exportaste 2 veces; la última, en PDF/.test(await m.textContent('.au-dlg')),'«Autoría» dice cuántas veces exportaste');
  const [con]=await Promise.all([m.waitForEvent('download'),m.click('[data-au="constancia"]')]);
  const html=fs.readFileSync(await con.path(),'utf8');
  r.cumple(/<h2>Entregas<\/h2>/.test(html)&&/Word \(DOCX\)/.test(html)&&/<td>PDF<\/td>/.test(html)&&(html.match(/<code>[0-9a-f]{64}<\/code>/g)||[]).length>=3,'la constancia lista cada entrega con su huella');
  await cerrar(m);
  await cerrar(p);

  /* ---------- Una tesis recién creada: lo que falta antes de entregar ---------- */
  const n=await pagina(browser,{ancho:1280,reducir:true});
  await n.goto(base+'inicio.html');await listo(n);
  await n.click('#sideCrear');await n.waitForTimeout(200);
  await Promise.all([n.waitForURL(/documento\.html\?id=d-/),n.click('[data-tipo="tesis"]')]);await listo(n,500);
  await abrirEntregar(n);
  const av=await n.$$eval('.en-av li',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(av.some(function(x){return /secciones están vacías: «Resumen», «Introducción»/.test(x)})&&av.some(function(x){return /La portada no tiene: Autor\(a\), Universidad, Programa, Asesor\(a\)/.test(x)}),'en una tesis recién creada avisa de las secciones vacías y de los datos de la portada',av);
  await n.keyboard.press('Escape');await n.waitForTimeout(100);
  /* Una libreta: solo imprimir, sin portada ni Word */
  const antes=n.url();
  await Promise.all([n.waitForURL(function(u){return /documento\.html/.test(u.href)&&u.href!==antes}),n.evaluate(function(){AT.crear.nuevo('libreta');return 1}).catch(function(){return 1})]);await listo(n,400);
  r.cumple(!await n.isVisible('[data-ts="entregar"]'),'una libreta no tiene la barra de la tesis');
  await n.click('#docMas');await n.locator('.menu-i',{hasText:'Imprimir o guardar como PDF'}).click();await n.waitForSelector('dialog.en-dlg');
  r.cumple(await n.textContent('.en-dlg h2')==='Imprimir o guardar como PDF'&&await n.locator('.en-dlg [data-en="docx"]').count()===0&&await n.locator('.en-dlg .en-f').count()===0,'desde «⋯», una libreta se imprime sin formato de tesis ni Word');
  await Promise.all([n.waitForURL(/imprimir\.html/),n.click('[data-en="pdf"]')]);
  await n.waitForSelector('body[data-listo]',{timeout:20000});
  const lib=await n.evaluate(function(){var pg=document.querySelectorAll('.pagedjs_page');return {n:pg.length,h1:(pg[0].querySelector('h1')||{}).textContent,portada:!!document.querySelector('.pagedjs_portada_page')}});
  r.cumple(lib.n>=1&&!lib.portada&&/^Libreta/.test(lib.h1||''),'la libreta sale con su título arriba y sin portada',lib);
  await cerrar(n);
});
