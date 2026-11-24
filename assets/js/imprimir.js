/* OneBook: vista para imprimir o guardar como PDF (imprimir.html?id=...). Hito T4.
   Dibuja el documento con bloques.js, lo ordena para papel y lo pagina con Paged.js (assets/vendor/paged.min.js,
   window.PagedModule), que da en cualquier navegador lo que pide una tesis:
   - Tesis: portada sin número; preliminares (índices, declaración, resumen) con números romanos; desde la
     introducción o el primer capítulo, números arábigos desde 1; cada capítulo en una página nueva; índice con el
     número de página de cada sección; notas al pie al pie de su página; formato de entrega de doc.formato (entrega.js).
   - Otros documentos: título, propiedades y contenido, con el número de página abajo.
   La hoja de estilo del papel se arma aquí (depende del formato) y se le pasa a Paged.js como texto, así que no se
   descarga nada más. Al pulsar «Imprimir», una tesis anota la entrega en su registro de autoría. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$;
var ID=new URLSearchParams(location.search).get('id')||'';
var estado=$('#imEstado'),btn=$('#imImprimir'),volver=$('#imVolver'),destino=$('#paginas');
var doc=null;
if(ID)volver.href='documento.html?id='+encodeURIComponent(ID);
function poner(t,err){estado.textContent=t;estado.classList.toggle('err',!!err)}

/* ---------- La hoja de estilo del papel ---------- */
var LETRAS={times:'"Times New Roman",Times,"Liberation Serif","Nimbus Roman",serif',arial:'Arial,"Liberation Sans",Helvetica,sans-serif',
  plex:'"IBM Plex Sans",Arial,sans-serif'};
function hoja(p){
  var f=p.formato,aca=p.academico,letra=LETRAS[aca?f.letra:'plex'],lh=aca?(f.interlineado==='1.5'?1.5:2):1.45;
  var tam=f.papel==='a4'?'A4':'letter',izq=aca&&f.margen==='encuadernar'?'4cm':(aca?'2.54cm':'2cm'),m=aca?'2.54cm':'2cm';
  var num=aca?'@top-right{content:counter(page);font-family:'+letra+';font-size:12pt;color:#000}':'@bottom-center{content:counter(page);font-family:'+letra+';font-size:10pt;color:#444}';
  return [
    '@page{size:'+tam+';margin:'+m+' '+m+' '+m+' '+izq+';'+num+'}',
    '@page portada{@top-right{content:none}@bottom-center{content:none}}',
    '@page preliminares{@top-right{content:counter(page,lower-roman)}}',
    '.papel{font-family:'+letra+';font-size:'+(aca?'12pt':'11pt')+';line-height:'+lh+';color:#000;background:#fff;text-align:left;hyphens:auto}',
    '.papel *{color:inherit;max-width:none}',
    /* Lo que Paged.js saca de .papel (notas al pie, números de página) usa la misma letra */
    '.pagedjs_page{font-family:'+letra+';color:#000;background:#fff}',
    '.pagedjs_footnote_area{font-size:10pt;line-height:1.3}',
    '.papel h1,.papel h2,.papel h3,.papel th,.papel td,.papel figcaption,.papel dt,.papel dd{font-family:inherit;letter-spacing:normal;text-transform:none}',
    '.papel .portada{page:portada;display:flex;flex-direction:column;align-items:center;text-align:center;line-height:1.5}',
    '.papel .preliminares{page:preliminares;counter-reset:page 1;break-before:page}',
    '.papel .cuerpo{counter-reset:page 1;break-before:page}',
    '.papel h1{font-size:'+(aca?'14pt':'20pt')+';font-weight:700;margin:0 0 12pt;line-height:1.25;text-align:'+(aca?'center':'left')+'}',
    '.papel h2{font-size:12pt;font-weight:700;margin:0 0 12pt;line-height:'+lh+';text-align:'+(aca?'center':'left')+';break-after:avoid}',
    aca?'.papel .cuerpo h2,.papel .preliminares h2,.papel .preliminares .declaracion,.papel .preliminares .indice-piezas,.papel .preliminares .im-indice{break-before:page}':'.papel h2{margin-top:18pt;font-size:14pt}',
    aca?'.papel .cuerpo>h2:first-child,.papel .preliminares>:first-child{break-before:auto}':'',
    '.papel h3{font-size:12pt;font-weight:700;margin:12pt 0 0;line-height:'+lh+';break-after:avoid}',
    '.papel p{margin:0;orphans:2;widows:2}',
    aca?'.papel .cuerpo>p,.papel .preliminares>p,.papel blockquote p{text-indent:1.27cm}':'.papel p+p{margin-top:6pt}',
    '.papel blockquote{margin:0 0 0 1.27cm;padding:0;border:0}',
    '.papel ul,.papel ol{margin:0;padding-left:1.27cm}',
    '.papel a{color:inherit;text-decoration:none}',
    '.papel code,.papel pre{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10pt;line-height:1.35}',
    '.papel pre{margin:6pt 0;padding:6pt;border:0.5pt solid #999;white-space:pre-wrap;break-inside:avoid}',
    '.papel hr{border:0;border-top:0.5pt solid #999;margin:12pt 0}',
    /* Figuras y tablas como pide APA: número en negritas, título en cursiva, nota abajo */
    '.papel figure{margin:12pt 0;padding:0;break-inside:avoid}',
    '.papel .fig-cap{margin:0 0 6pt;line-height:'+lh+'}',
    '.papel .fig-n{display:block;font-weight:700}',
    '.papel .fig-t{display:block;font-style:italic}',
    '.papel figure img{display:block;max-width:100%;max-height:18cm;height:auto;margin:0 auto}',
    '.papel .fig-nota{margin:6pt 0 0;font-size:'+(aca?'11pt':'10pt')+';line-height:1.4}',
    '.papel .tbl-wrap{overflow:visible;border:0;margin:0}',
    '.papel table{border-collapse:collapse;width:100%;font-size:'+(aca?'11pt':'10pt')+';line-height:1.35;break-inside:auto}',
    '.papel th,.papel td{padding:3pt 6pt;text-align:left;vertical-align:top;border:0;font-size:inherit;font-weight:400;background:none}',
    '.papel thead th{border-top:1pt solid #000;border-bottom:0.75pt solid #000;font-weight:700}',
    '.papel tbody tr:last-child td{border-bottom:1pt solid #000}',
    '.papel table:not(:has(thead)) tbody tr:first-child td{border-top:1pt solid #000}',
    '.papel .ancla{display:block;height:0}',
    '.papel .ecu{display:flex;align-items:center;gap:12pt;margin:12pt 0;break-inside:avoid}',
    '.papel .ecu-f{flex:1;text-align:center}',
    '.papel .ecu-n{flex:none}',
    '.papel .katex{font-size:1.05em}',
    '.papel .callout{margin:9pt 0;padding:6pt 9pt;border-left:2pt solid #666;break-inside:avoid}',
    '.papel .callout>svg,.papel .tg summary svg,.papel .cita svg,.papel .page-icon{display:none}',
    '.papel details>summary{list-style:none;font-weight:700}',
    '.papel .cols{display:block}',
    '.papel .repaso .ctl,.papel .demo{display:none}',
    '.papel .qo{display:block;border:0;background:none;padding:0 0 0 12pt;font:inherit;text-align:left}',
    '.papel .resumen h2{text-align:left}',
    /* Plan de pagos */
    '.papel .pg{margin:9pt 0;break-inside:avoid}.papel .pg-t{margin:0 0 4pt;font-size:12pt}',
    '.papel .pg-k{display:flex;flex-wrap:wrap;gap:4pt 18pt;margin:0 0 4pt}.papel .pg-k div{display:flex;gap:4pt}.papel .pg-k dt{font-weight:700}.papel .pg-k dd{margin:0}',
    '.papel .pg-barra{display:none}.papel .pg-sig{margin:0 0 4pt}',
    '.papel .pg-l{list-style:none;padding:0;margin:0;font-size:10pt;line-height:1.4}.papel .pg-i label{display:flex;gap:12pt}.papel .pg-i input{margin:0 6pt 0 0}',
    /* Bloques de la tienda (negocio.js) */
    '.papel .nb{margin:9pt 0 12pt}.papel .nb-t{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 9pt;margin:0 0 4pt;font-size:12pt;break-after:avoid}.papel .nb-t small{font-size:10pt;font-weight:400}',
    '.papel .nb-k{display:flex;flex-wrap:wrap;gap:2pt 18pt;margin:0 0 6pt;break-inside:avoid}.papel .nb-k div{display:flex;gap:4pt}.papel .nb-k dt{font-weight:700}.papel .nb-k dt::after{content:":"}.papel .nb-k dd{margin:0}',
    '.papel .nb-p{margin:0 0 6pt;text-indent:0}.papel .hint{font-style:italic}',
    '.papel .nb-d.neg{color:#a00}.papel .nb-scroll{overflow:visible}',
    '.papel .nb-tab{margin:0 0 9pt;font-size:10pt}.papel .nb-tab caption{text-align:left;font-weight:700;padding:0 0 3pt}.papel .nb-tab .num{text-align:right;white-space:nowrap}',
    '.papel .nb-tab tbody th{font-weight:400}.papel .nb-tab .nb-tot th,.papel .nb-tab .nb-tot td{font-weight:700;border-top:0.75pt solid #000}.papel .nb-tab tfoot td,.papel .nb-tab tfoot th{border-top:0.75pt solid #000}',
    '.papel .nb-cols{display:block}.papel .nb-sub{font-size:10pt;margin:6pt 0 3pt}',
    /* Las tablas sin encabezado (totales, desglose) solo llevan la línea del total */
    '.papel .nb-tab:not(:has(thead)) td,.papel .nb-tab:not(:has(thead)) th{border-top:0;border-bottom:0}',
    '.papel .nb-tab:not(:has(thead)) .nb-tot td,.papel .nb-tab:not(:has(thead)) .nb-tot th{border-top:0.75pt solid #000}',
    '.papel .nb-tab thead+tbody tr:last-child th{border-bottom:1pt solid #000}',
    '.papel .nb-corte,.papel .nb-venta,.papel .nb-precio{break-inside:avoid}',
    '.papel .nb-cats{list-style:none;padding:0;margin:0 0 9pt;font-size:10pt}.papel .nb-cats li{display:flex;gap:12pt;margin:0}.papel .nb-cats li::before{display:none}.papel .nb-cat-n{min-width:4cm}.papel .nb-cat-b{display:none}',
    '.papel .nb-cli{margin:0 0 9pt;break-inside:avoid}.papel .nb-cli-t{display:flex;justify-content:space-between;gap:12pt;margin:6pt 0 3pt;font-size:11pt}.papel .nb-cli-t small{font-weight:400;margin-left:6pt}',
    '.papel .nb-est{display:block;font-size:9pt}.papel .nb-pag input,.papel .nb-op input{margin:0 4pt 0 0;vertical-align:middle}',
    '.papel .nv-h{display:flex;justify-content:space-between;gap:12pt;margin:0 0 9pt;padding-bottom:6pt;border-bottom:1pt solid #000}.papel .nv-neg,.papel .nv-folio{display:flex;flex-direction:column}.papel .nv-neg b{font-size:13pt}',
    '.papel .nv-folio{align-items:flex-end;text-align:right;margin-left:auto}.papel .nv-folio b{font-size:13pt}.papel .nb-totales{width:auto;min-width:6cm;margin-left:auto}.papel .nv-legal{font-size:8pt;margin-top:9pt}',
    '.papel .nb-desglose{width:auto;min-width:8cm}',
    '.papel .bd-papel{margin:9pt 0 12pt}.papel .bd-papel h3{font-size:12pt;margin:0 0 4pt}.papel .bd-papel h3 small{font-weight:400;font-size:10pt}.papel .bd-papel .bd-n{font-size:9pt;margin:2pt 0 0}.papel .bd-papel .neg{color:#a00}.papel .bd-papel .bd-neg{font-weight:700}',
    '.papel dl.props{display:grid;grid-template-columns:auto 1fr;gap:2pt 12pt;margin:0 0 12pt;font-size:10pt}',
    '.papel dl.props div{display:contents}.papel dl.props dt{font-weight:700}.papel dl.props dd{margin:0}',
    '.papel .tag{border:0;padding:0;background:none;font:inherit}',
    /* Bibliografía con sangría francesa */
    '.papel ul.biblio{list-style:none;padding:0;margin:0}',
    '.papel ul.biblio li{padding-left:1.27cm;text-indent:-1.27cm;margin:0}',
    '.papel .declaracion p{text-indent:0;margin:0 0 6pt}',
    /* Notas al pie */
    '.papel .fn{float:footnote;font-size:10pt;line-height:1.3;text-indent:0;text-align:left}',
    '.papel ::footnote-call{content:counter(footnote);font-size:0.7em;vertical-align:super;line-height:0}',
    '.papel ::footnote-marker{content:counter(footnote) ". "}',
    '@page{@footnote{border-top:0.5pt solid #000;padding-top:4pt;margin-top:8pt}}',
    /* Índices con número de página */
    '.papel .im-toc{list-style:none;padding:0;margin:0}',
    '.papel .im-toc li{display:flex;align-items:baseline;gap:4pt;margin:0}',
    '.papel .im-toc li::before{display:none}',
    '.papel .im-toc a{display:flex;flex:1;align-items:baseline;gap:4pt}',
    '.papel .im-toc a .t{flex:none;max-width:85%}',
    '.papel .im-toc a .p{flex:1;border-bottom:1pt dotted #000;transform:translateY(-3pt)}',
    '.papel .im-toc a::after{content:target-counter(attr(href),page);flex:none}',
    '.papel .im-toc a.rom::after{content:target-counter(attr(href),page,lower-roman)}',
    '.papel .indice-piezas h2{text-align:center}',
    /* Portada */
    '.papel .po-u{font-weight:700;text-transform:uppercase;margin-top:0}',
    '.papel .po-t{font-weight:700;font-size:14pt;margin-top:3.2cm;line-height:1.4}',
    '.papel .po-g{margin-top:2.4cm}',
    '.papel .po-a{margin-top:1.6cm}',
    '.papel .po-l{margin-top:auto;padding-top:2.4cm}'
  ].join('\n');
}

/* ---------- El documento, ordenado para papel ---------- */
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function portada(p){
  var s=el('section','portada'),q=p.portada;
  function lin(c,t){if(t)s.appendChild(el('p',c,t))}
  lin('po-u',q.universidad);lin('po-f',q.facultad);
  lin('po-t',q.titulo);
  var g=el('div','po-g');
  g.appendChild(el('p','','Tesis'));
  if(q.programa){g.appendChild(el('p','','que para obtener el grado de'));g.appendChild(el('p','po-gr',q.programa))}
  s.appendChild(g);
  if(q.autor){var a=el('div','po-a');a.appendChild(el('p','','Presenta'));a.appendChild(el('p','',q.autor));s.appendChild(a)}
  if(q.asesor){var b=el('div','po-a');b.appendChild(el('p','','Asesor(a)'));b.appendChild(el('p','',q.asesor));s.appendChild(b)}
  lin('po-l',[q.lugar,q.anio].filter(Boolean).join(', '));
  return s;
}
/* Índices: los botones del modo lectura se vuelven enlaces con número de página */
function indices(cont,prelimIds){
  $$('ul.toc',cont).forEach(function(ul){
    ul.className='im-toc';
    $$('button[data-go]',ul).forEach(function(b){
      var id=b.getAttribute('data-go'),a=el('a',prelimIds[id]?'rom':'');
      a.href='#'+id;
      a.appendChild(el('span','t',b.textContent));a.appendChild(el('span','p'));
      b.replaceWith(a);
    });
  });
}
function construir(d){
  var p=AT.entrega.partes(d),copia=JSON.parse(JSON.stringify(d));
  var tmp=el('div','papel');
  if(!p.academico){
    copia.props=(copia.props||[]).filter(function(x){return x.nombre&&String(x.valor||'').trim()});
    var ctx0=AT.bloques.dibujar(copia,tmp);
    $$('.page-icon',tmp).forEach(function(x){x.remove()});
    notas(tmp,ctx0);
    indices(tmp,{});
    return tmp;
  }
  var ctx=AT.bloques.dibujar(copia,tmp,{encabezado:false});
  notas(tmp,ctx);
  /* Cada bloque de primer nivel lleva su id: así se reparte entre preliminares y cuerpo */
  var prelimIds={};p.preliminares.forEach(function(b){if(b.attrs&&b.attrs.id)prelimIds[b.attrs.id]=true});
  var papel=el('div','papel'),pre=el('section','preliminares'),cue=el('section','cuerpo');
  papel.appendChild(portada(p));
  Array.prototype.slice.call(tmp.children).forEach(function(e){
    var dest=prelimIds[e.id]?pre:cue;
    /* El índice general lleva su título en papel */
    if(e.matches('ul.toc')){var w=el('div','im-indice');w.appendChild(el('h2','','Índice'));w.appendChild(e);e=w}
    dest.appendChild(e);
  });
  if(pre.children.length)papel.appendChild(pre);
  papel.appendChild(cue);
  indices(papel,prelimIds);
  return papel;
}
/* Notas al pie: del modo lectura (al final) a Paged.js (al pie de su página) */
function notas(cont,ctx){
  var l=(ctx&&ctx.notasPie)||[];
  $$('sup.nota-ref',cont).forEach(function(s,i){var f=el('span','fn',l[i]||'');s.replaceWith(f)});
  $$('section.notas-pie',cont).forEach(function(s){s.remove()});
}
function esperarRecursos(cont){
  var pr=[];
  if(cont.querySelector('.ecu-f,.formula')&&AT.piezas)pr.push(AT.piezas.katex().then(function(){return new Promise(function(ok){setTimeout(ok,30)})},function(){}));
  /* Fuera de la pantalla, una imagen «lazy» nunca carga: en papel se cargan todas */
  $$('img',cont).forEach(function(i){i.loading='eager';if(i.decode)pr.push(i.decode().catch(function(){}))});
  if(document.fonts&&document.fonts.ready)pr.push(document.fonts.ready);
  /* Si algo no termina, se pagina igual a los 8 s */
  return Promise.race([Promise.all(pr),new Promise(function(ok){setTimeout(ok,8000)})]);
}

/* Números de página: la portada no lleva; los preliminares van de i en adelante y el cuerpo desde 1.
   Se ponen página por página (los contadores de CSS entre hermanos no se heredan igual en todos los navegadores) */
function numerarPaginas(){
  var pre=0,cue=0,reglas=[];
  $$('.pagedjs_page',destino).forEach(function(pg){
    if(pg.classList.contains('pagedjs_portada_page'))return;
    var v=pg.classList.contains('pagedjs_preliminares_page')?++pre:++cue;
    reglas.push('.pagedjs_page[data-page-number="'+pg.getAttribute('data-page-number')+'"]{counter-reset:page '+v+';counter-increment:none}');
  });
  var st=document.createElement('style');st.id='imNumeros';st.textContent=reglas.join('\n');
  document.head.appendChild(st);
}

/* ---------- Paginar ---------- */
function paginar(d){
  var p=AT.entrega.partes(d),contenido=construir(d);
  /* Se monta oculto para que KaTeX y las imágenes terminen de dibujarse antes de paginar */
  var espera=el('div','im-espera');espera.setAttribute('aria-hidden','true');espera.appendChild(contenido);document.body.appendChild(espera);
  return esperarRecursos(contenido).then(function(){
    espera.remove();
    var frag=document.createDocumentFragment();frag.appendChild(contenido);
    var css={};css[location.href.replace(/[?#].*$/,'')+'#papel']=hoja(p);
    return new window.PagedModule.Previewer().preview(frag,[css],destino);
  });
}

if(!ID){poner('No se indicó qué documento imprimir.',true);return}
if(!window.PagedModule){poner('No se pudo cargar el paginador. Recarga la página.',true);return}
AT.datos.documentos.leer(ID).then(function(d){
  if(!d||!d.contenido){poner('No encontramos este documento en este navegador.',true);return}
  doc=d;
  /* Las citas y las referencias cruzadas leen el documento abierto (también para la huella) */
  AT.docActual=d;
  document.title=(d.titulo||'Sin título')+' · Vista para imprimir';
  /* Las bases de datos viven aparte: se leen antes de dibujar */
  return (AT.bases?AT.bases.precargar(d):Promise.resolve()).then(function(){return paginar(d)}).then(function(flow){
    numerarPaginas();
    var n=flow&&flow.total||$$('.pagedjs_page',destino).length;
    poner(n===1?'1 página':n+' páginas');
    btn.removeAttribute('aria-disabled');
    document.body.setAttribute('data-listo','');
  });
}).catch(function(e){
  if(window.console)console.error(e);
  poner('No se pudo preparar la vista para imprimir.',true);
});

btn.addEventListener('click',function(){
  if(btn.getAttribute('aria-disabled')==='true'||!doc)return;
  /* Una tesis anota la entrega (con la huella del texto) en su registro de autoría */
  AT.entrega.registrar(doc,'pdf').then(function(e){
    if(e)return AT.datos.documentos.guardar(doc,{conservarFecha:true});
  }).catch(function(){}).then(function(){window.print()});
});
})();
