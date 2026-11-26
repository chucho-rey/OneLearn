/* Imprimir o exportar una página (exportar.js, imprimir.js y exportar-docx.js): la ventana «Imprimir o exportar»
   (papel carta o A4, vertical u horizontal), el PDF paginado con Paged.js (título y propiedades arriba, número de
   página abajo, índice con páginas, notas al pie al pie de su página) y el Word (DOCX) de documento de trabajo: Arial,
   títulos de Word, tabla numerada, imagen, notas al pie, número de página y orientación. El DOCX se revisa abriendo el ZIP con zlib de Node. */
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
/* Un informe con todo: propiedades, índice, secciones, callout, tabla numerada, imagen, notas al pie y referencia
   cruzada */
function informe(png){
  let k=0;
  function id(){return 'b-x'+(++k).toString(36).padStart(4,'0')}
  function P(t,extra){return {type:'paragraph',attrs:{id:id()},content:[{type:'text',text:t}].concat(extra||[])}}
  function H(t,n){return {type:'heading',attrs:{id:id(),level:n||2},content:[{type:'text',text:t}]}}
  const largo='Las ventas de la sucursal crecieron durante el trimestre gracias a la nueva línea de café y a los pedidos de las tiendas. ';
  const relleno=[];for(let i=0;i<6;i++)relleno.push(P(largo+largo+largo));
  return {id:'d-exportar',formato:1,tipo:'notas',titulo:'Informe de ventas',
    props:[{nombre:'Área',valor:'Ventas',estilo:'etiqueta'},{nombre:'Responsable',valor:'Ana López',estilo:'texto'}],
    contenido:{type:'doc',content:[
      {type:'indice',attrs:{id:'b-indice'}},
      H('Resumen'),P('Este informe resume las ventas del trimestre.',[{type:'notaPie',attrs:{texto:'Datos del punto de venta.'}},{type:'text',text:' Ver la '},{type:'refCruzada',attrs:{destino:'p-tab1'}},{type:'text',text:'.'}]),
      {type:'callout',attrs:{id:id(),variante:'aviso'},content:[{type:'paragraph',content:[{type:'text',text:'Revisa el inventario antes de prometer entregas.'}]}]},
      H('Detalle')
    ].concat(relleno,[
      {type:'figura',attrs:{id:'b-fig',clave:'p-fig1',src:'data:image/webp;base64,'+png,alt:'Gráfica de barras',titulo:'Ventas por semana'}},
      {type:'tablaNumerada',attrs:{id:'b-tab',clave:'p-tab1',titulo:'Ventas por producto',nota:'Cifras en pesos.'},content:[{type:'table',content:[
        {type:'tableRow',content:[{type:'tableHeader',content:[P('Producto')]},{type:'tableHeader',content:[P('Ventas')]}]},
        {type:'tableRow',content:[{type:'tableCell',content:[P('Café de olla')]},{type:'tableCell',content:[P('$12,400')]}]}]}]},
      H('Pendientes'),P('Revisar los precios de octubre con el proveedor.'),
      H('Conclusiones'),P('El trimestre cerró bien.',[{type:'notaPie',attrs:{texto:'Una segunda aclaración.'}}])
    ])}};
}
async function abrirExportar(p){
  await p.click('#docMas');await p.locator('.menu-i',{hasText:'Imprimir o exportar'}).click();
  await p.waitForSelector('dialog.en-dlg');await p.waitForTimeout(100);
}

prueba('Imprimir o exportar: PDF y Word',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  const png=await p.evaluate(function(){var c=document.createElement('canvas');c.width=600;c.height=300;var x=c.getContext('2d');x.fillStyle='#ddd';x.fillRect(0,0,600,300);x.fillStyle='#285';x.fillRect(50,100,100,180);return c.toDataURL('image/png').split(',')[1]});
  await p.evaluate(function(d){return AT.datos.documentos.guardar(d).then(function(){return 1})},informe(png));
  await p.goto(base+'documento.html?id=d-exportar');await listo(p,500);

  /* ---------- La ventana ---------- */
  r.cumple(!await p.$('#tsBarra'),'una página ya no tiene la barra de la tesis');
  await abrirExportar(p);
  const v=await p.evaluate(function(){var d=document.querySelector('dialog.en-dlg');return {
    titulo:d.querySelector('h2').textContent,marcados:[].map.call(d.querySelectorAll('input:checked'),function(x){return x.name.slice(3)+'='+x.value}).join(' '),
    campos:[].map.call(d.querySelectorAll('input[type="radio"]'),function(x){return x.name}).filter(function(x,i,a){return a.indexOf(x)===i}).join(' '),
    botones:[].map.call(d.querySelectorAll('[data-ex]'),function(b){return b.getAttribute('data-ex')}).join(' ')}});
  r.cumple(v.titulo==='Imprimir o exportar'&&v.marcados==='papel=carta orientacion=vertical','la ventana abre con papel carta, vertical',v);
  r.cumple(v.campos==='ex-papel ex-orientacion'&&/pdf/.test(v.botones)&&/docx/.test(v.botones),'solo pide el papel y ofrece PDF y Word (sin estilo de citas, letra de tesis ni márgenes de encuadernar)',v);
  await revisar(p,r,'ventana Imprimir o exportar');
  await p.check('input[name="ex-orientacion"][value="horizontal"]');await p.waitForTimeout(800);
  r.igual(await p.evaluate(function(){return AT.datos.documentos.leer('d-exportar').then(function(d){return d.formato&&d.formato.orientacion})}),'horizontal','elegir la orientación se guarda en la página');

  /* ---------- Word (DOCX) ---------- */
  const [des]=await Promise.all([p.waitForEvent('download'),p.click('[data-ex="docx"]')]);
  const zip=unzip(fs.readFileSync(await des.path()));
  await p.waitForFunction(function(){return /Listo: se descargó «informe-de-ventas\.docx»/.test(document.querySelector('.en-dlg .td-msg').textContent)});
  const docx=zip['word/document.xml'].toString(),texto=docx.replace(/<w:tab\/>/g,' ').replace(/<[^>]+>/g,''),estilos=zip['word/styles.xml'].toString(),notasX=(zip['word/footnotes.xml']||'').toString();
  const pies=Object.keys(zip).filter(function(n){return /^word\/footer\d*\.xml$/.test(n)}).map(function(n){return zip[n].toString()}).join('');
  const secc=docx.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)||[];
  r.cumple(des.suggestedFilename()==='informe-de-ventas.docx'&&secc.length===1,'el Word se llama como la página y tiene una sola sección',secc.length);
  r.cumple(/w:orient="landscape"/.test(secc[0]||'')&&/w:w="15840"/.test(secc[0]||'')&&/w:h="12240"/.test(secc[0]||''),'carta horizontal, como se eligió',secc[0]);
  r.cumple(/Arial/.test(estilos)&&/w:sz w:val="22"/.test(estilos)&&/w:line="276"/.test(estilos)&&!/w:firstLine="720"/.test(estilos),'Arial de 11 puntos e interlineado 1.15, sin sangría de tesis');
  r.cumple(/w:val="Title"/.test(docx)&&/Informe de ventas/.test(texto)&&/Área: Ventas/.test(texto)&&/w:val="Heading1"/.test(docx),'título, propiedades y títulos de Word');
  r.cumple(/TOC [^<]*\\o &quot;1-2&quot;/.test(docx),'el índice es un campo de Word que se actualiza');
  r.cumple(/<w:t[^>]*>Tabla 1<\/w:t>/.test(docx)&&/Ventas por producto/.test(texto)&&/Café de olla/.test(texto)&&/Ver la Tabla 1/.test(texto),'la tabla numerada lleva su leyenda y la referencia cruzada su número');
  r.cumple(/<w:drawing>/.test(docx)&&Object.keys(zip).some(function(n){return /^word\/media\/.+\.png$/.test(n)})&&/Ventas por semana/.test(texto),'la imagen (WebP convertida a PNG) y su pie');
  r.cumple(/Datos del punto de venta\./.test(notasX)&&/Una segunda aclaración\./.test(notasX)&&(docx.match(/w:footnoteReference/g)||[]).length===2,'las notas al pie son notas al pie de Word');
  r.cumple(/PAGE/.test(pies),'el número de página va al pie');
  r.cumple(/Revisar los precios de octubre/.test(texto),'el texto de cada sección');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);

  /* ---------- PDF ---------- */
  await abrirExportar(p);
  await Promise.all([p.waitForURL(/imprimir\.html\?id=d-exportar/),p.click('[data-ex="pdf"]')]);
  await p.waitForSelector('body[data-listo]',{timeout:20000});
  const pg=await p.evaluate(function(){
    var paginas=[].slice.call(document.querySelectorAll('.pagedjs_page'));
    var reglas=(document.getElementById('imNumeros')||{}).textContent||'';
    var c=paginas[0].getBoundingClientRect();
    return {n:paginas.length,estado:document.getElementById('imEstado').textContent,
      reglas:(reglas.match(/counter-reset:page \d+/g)||[]).map(function(x){return x.replace('counter-reset:page ','')}).join(','),
      h1:(paginas[0].querySelector('h1')||{}).textContent,props:!!paginas[0].querySelector('dl.props'),
      notas:[].map.call(document.querySelectorAll('.pagedjs_footnote_area'),function(a){return a.textContent.trim()}).filter(Boolean).join(' | '),
      toc:[].map.call(document.querySelectorAll('.im-toc a'),function(a){return a.textContent+(document.getElementById(a.getAttribute('href').slice(1))?'✓':'✗')}).join(' | '),
      fig:!!document.querySelector('.pagedjs_page figure.fig img'),tabla:(document.querySelector('.pagedjs_page figure.tabla-num .fig-n')||{}).textContent,
      portada:!!document.querySelector('.pagedjs_portada_page,.portada'),ancho:Math.round(c.width),alto:Math.round(c.height)};
  });
  r.cumple(pg.n>=2&&pg.estado===pg.n+' páginas','el PDF se pagina y dice cuántas páginas tiene',pg.estado);
  r.igual(pg.reglas,Array.from({length:pg.n},function(_,i){return String(i+1)}).join(','),'las páginas se numeran desde 1');
  r.cumple(pg.h1==='Informe de ventas'&&pg.props&&!pg.portada,'el título y las propiedades van arriba, sin portada',pg);
  r.cumple(pg.ancho>pg.alto,'la hoja sale horizontal, como se eligió',pg);
  r.cumple(pg.notas==='Datos del punto de venta. | Una segunda aclaración.','las notas al pie quedan al pie de su página',pg.notas);
  r.cumple(/^Resumen✓ \| Detalle✓ \| Pendientes✓ \| Conclusiones✓$/.test(pg.toc),'el índice enlaza a cada sección, con su página',pg.toc);
  r.cumple(pg.fig&&pg.tabla==='Tabla 1','la imagen y la tabla numerada',pg);
  const pdf=await p.pdf({preferCSSPageSize:true});
  r.igual((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length,pg.n,'al guardar como PDF salen las mismas páginas');
  await revisar(p,r,'vista para imprimir');
  await p.evaluate(function(){window.print=function(){window.__imprimio=(window.__imprimio||0)+1}});
  await p.click('#imImprimir');await p.waitForFunction(function(){return window.__imprimio===1});
  r.cumple(true,'«Imprimir» abre la impresión');
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  const d=await p.evaluate(function(){return AT.datos.documentos.leer('d-exportar')});
  await cerrar(p);

  /* ---------- En celular, oscuro y alto contraste ---------- */
  const m=await pagina(browser,{ancho:390,alto:844,ajustes:{tema:'dark',contraste:'high'},reducir:true});
  await m.goto(base+'inicio.html');await listo(m);
  await m.evaluate(function(x){return AT.datos.documentos.guardar(x,{conservarFecha:true}).then(function(){return 1})},d);
  await m.goto(base+'imprimir.html?id=d-exportar');await m.waitForSelector('body[data-listo]',{timeout:20000});
  await revisar(m,r,'vista para imprimir en celular, oscuro y alto contraste');
  await m.goto(base+'documento.html?id=d-exportar');await listo(m,500);
  await abrirExportar(m);
  await revisar(m,r,'ventana Imprimir o exportar en celular, oscuro y alto contraste');
  await cerrar(m);
});
