/* OneBook: vista para imprimir o guardar como PDF (imprimir.html?id=...).
   Dibuja la página con bloques.js (título, propiedades y contenido), la ordena para papel y la pagina con Paged.js
   (assets/vendor/paged.min.js, window.PagedModule): número de página abajo, notas al pie al pie de su página, el
   índice con el número de página de cada sección y el papel de doc.formato (carta o A4, vertical u horizontal;
   ver exportar.js). La hoja de estilo del papel se arma aquí y se le pasa a Paged.js como texto, así que no se
   descarga nada más. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$;
var ID=new URLSearchParams(location.search).get('id')||'';
var estado=$('#imEstado'),btn=$('#imImprimir'),volver=$('#imVolver'),destino=$('#paginas');
var doc=null;
if(ID)volver.href='documento.html?id='+encodeURIComponent(ID);
function poner(t,err){estado.textContent=t;estado.classList.toggle('err',!!err)}

/* ---------- La hoja de estilo del papel ---------- */
var LETRA='"IBM Plex Sans",Arial,sans-serif',LH=1.45;
function hoja(f){
  var tam=f.papel==='a4'?'A4':'letter';
  return [
    '@page{size:'+tam+(f.orientacion==='horizontal'?' landscape':'')+';margin:2cm;@bottom-center{content:counter(page);font-family:'+LETRA+';font-size:10pt;color:#444}}',
    '.papel{font-family:'+LETRA+';font-size:11pt;line-height:'+LH+';color:#000;background:#fff;text-align:left;hyphens:auto}',
    '.papel *{color:inherit;max-width:none}',
    /* Lo que Paged.js saca de .papel (notas al pie, números de página) usa la misma letra */
    '.pagedjs_page{font-family:'+LETRA+';color:#000;background:#fff}',
    '.pagedjs_footnote_area{font-size:10pt;line-height:1.3}',
    '.papel h1,.papel h2,.papel h3,.papel th,.papel td,.papel figcaption,.papel dt,.papel dd{font-family:inherit;letter-spacing:normal;text-transform:none}',
    '.papel h1{font-size:20pt;font-weight:700;margin:0 0 12pt;line-height:1.25}',
    '.papel h2{font-size:14pt;font-weight:700;margin:18pt 0 12pt;line-height:'+LH+';break-after:avoid}',
    '.papel h3{font-size:12pt;font-weight:700;margin:12pt 0 0;line-height:'+LH+';break-after:avoid}',
    '.papel p{margin:0;orphans:2;widows:2}',
    '.papel p+p{margin-top:6pt}',
    '.papel blockquote{margin:0 0 0 1.27cm;padding:0;border:0}',
    '.papel ul,.papel ol{margin:0;padding-left:1.27cm}',
    '.papel a{color:inherit;text-decoration:none}',
    '.papel code,.papel pre{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10pt;line-height:1.35}',
    '.papel pre{margin:6pt 0;padding:6pt;border:0.5pt solid #999;white-space:pre-wrap;break-inside:avoid}',
    '.papel hr{border:0;border-top:0.5pt solid #999;margin:12pt 0}',
    /* Imágenes y tablas numeradas: leyenda, contenido y nota */
    '.papel figure{margin:12pt 0;padding:0;break-inside:avoid}',
    '.papel .fig-cap{margin:0 0 6pt;line-height:'+LH+'}',
    '.papel .fig-n{display:block;font-weight:700}',
    '.papel .fig-t{display:block;font-style:italic}',
    '.papel figure img{display:block;max-width:100%;max-height:18cm;height:auto;margin:0 auto}',
    '.papel .fig-nota{margin:6pt 0 0;font-size:10pt;line-height:1.4}',
    '.papel .tbl-wrap{overflow:visible;border:0;margin:0}',
    '.papel table{border-collapse:collapse;width:100%;font-size:10pt;line-height:1.35;break-inside:auto}',
    '.papel th,.papel td{padding:3pt 6pt;text-align:left;vertical-align:top;border:0;font-size:inherit;font-weight:400;background:none}',
    '.papel thead th{border-top:1pt solid #000;border-bottom:0.75pt solid #000;font-weight:700}',
    '.papel tbody tr:last-child td{border-bottom:1pt solid #000}',
    '.papel table:not(:has(thead)) tbody tr:first-child td{border-top:1pt solid #000}',
    '.papel .ancla{display:block;height:0}',
    '.papel .callout{margin:9pt 0;padding:6pt 9pt;border:0;border-left:2pt solid #666;background:none;break-inside:avoid}',
    /* El papel siempre es blanco con letra negra, aunque la app esté en el tema oscuro */
    '.papel dl.props dt,.papel dl.props dd,.papel .callout p,.papel figcaption,.papel .fig-nota{color:#000}',
    '.papel .callout>svg,.papel .tg summary svg,.papel .cita svg,.papel .page-icon{display:none}',
    '.papel details>summary{list-style:none;font-weight:700}',
    '.papel .cols{display:block}',
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
    '.papel .bd-papel{margin:9pt 0 12pt}.papel .bd-papel h3{font-size:12pt;margin:0 0 4pt}.papel .bd-papel h3 small{font-weight:400;font-size:10pt}.papel .bd-papel .bd-n{font-size:9pt;margin:2pt 0 0}.papel .bd-papel .neg{color:#a00}.papel .ind{display:flex;flex-wrap:wrap;gap:6pt 18pt;margin:4pt 0 8pt}.papel .ind-t{margin:0;break-inside:avoid}.papel .ind-t dt{font-size:9pt;color:#444}.papel .ind-t dd{margin:0}.papel .ind-v{font-size:14pt;font-weight:700}.papel .ind-s{font-size:8.5pt;color:#444}.papel .ven{list-style:none;margin:4pt 0;padding:0}.papel .ven-i{display:flex;gap:10pt;padding:2pt 0;border-bottom:0.5pt solid #bbb;break-inside:avoid}.papel .ven-c{min-width:90pt;font-weight:700}.papel .ven-q small{display:block;font-size:8.5pt;color:#444}.papel .ven-q a{color:#000;text-decoration:none}.papel .bd-papel .bd-t-mal{color:#a00;font-weight:700}.papel .bd-papel .bd-t-aviso{color:#7a4f00;font-weight:700}.papel .bd-papel .bd-t-bien{color:#060}.papel .bd-papel .bd-t-info{color:#045}.papel .rep-papel{margin:9pt 0 12pt;break-inside:avoid}.papel .rep-tit{font-size:12pt;margin:0}.papel .rep-sub{font-size:9pt;margin:0 0 4pt;color:#444}.papel .rep-sube{color:#060}.papel .rep-baja{color:#a00}.papel .rep-graf{display:flex;flex-direction:column;gap:2pt;margin:4pt 0 8pt}.papel .rep-gf{display:grid;grid-template-columns:30% 1fr auto;gap:6pt;align-items:center;font-size:9pt}.papel .rep-gb i{display:block;height:6pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}.papel i.rep-act{background:#333}.papel i.rep-ant{background:#bbb}.papel .rep-ley{font-size:8pt}.papel .rep-ley i{display:inline-block;width:6pt;height:6pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}.papel .rep-t th[scope=row]{font-weight:400;text-align:left}.papel .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.papel .bd-papel .bd-p-varias{font-size:8.5pt}.papel .bd-papel .bd-p-muchas{font-size:7pt}.papel .bd-papel .bd-p-varias th,.papel .bd-papel .bd-p-muchas th,.papel .bd-papel .bd-p-varias td,.papel .bd-papel .bd-p-muchas td{padding:2pt 3pt;hyphens:auto;overflow-wrap:break-word}.papel .bd-papel .bd-neg{font-weight:700}',
    '.papel dl.props{display:grid;grid-template-columns:auto 1fr;gap:2pt 12pt;margin:0 0 12pt;font-size:10pt}',
    '.papel dl.props div{display:contents}.papel dl.props dt{font-weight:700}.papel dl.props dd{margin:0}',
    '.papel .tag{border:0;padding:0;background:none;font:inherit}',
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
    /* Lo que ya no está en OneBook (legado): su texto, discreto */
    '.papel .legado{margin:6pt 0;padding:3pt 0 3pt 9pt;border:0;border-left:1.5pt solid #999;font-size:10pt;color:#000;background:none}.papel .legado p{color:#000}.papel .legado-t{font-style:italic;margin:0}.papel .legado-l{font-style:italic;color:#000;background:none;padding:0}'
  ].join('\n');
}

/* ---------- El documento, ordenado para papel ---------- */
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
/* Índices: los botones del modo lectura se vuelven enlaces con número de página */
function indices(cont){
  $$('ul.toc',cont).forEach(function(ul){
    ul.className='im-toc';
    $$('button[data-go]',ul).forEach(function(b){
      var id=b.getAttribute('data-go'),a=el('a');
      a.href='#'+id;
      a.appendChild(el('span','t',b.textContent));a.appendChild(el('span','p'));
      b.replaceWith(a);
    });
  });
}
function construir(d){
  var copia=JSON.parse(JSON.stringify(d)),papel=el('div','papel');
  copia.props=(copia.props||[]).filter(function(x){return x.nombre&&String(x.valor||'').trim()});
  var ctx=AT.bloques.dibujar(copia,papel);
  $$('.page-icon',papel).forEach(function(x){x.remove()});
  notas(papel,ctx);
  indices(papel);
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
  /* Fuera de la pantalla, una imagen «lazy» nunca carga: en papel se cargan todas */
  $$('img',cont).forEach(function(i){i.loading='eager';if(i.decode)pr.push(i.decode().catch(function(){}))});
  if(document.fonts&&document.fonts.ready)pr.push(document.fonts.ready);
  /* Si algo no termina, se pagina igual a los 8 s */
  return Promise.race([Promise.all(pr),new Promise(function(ok){setTimeout(ok,8000)})]);
}

/* Números de página desde 1. Se ponen página por página (los contadores de CSS entre hermanos no se heredan igual
   en todos los navegadores) */
function numerarPaginas(){
  var n=0,reglas=[];
  $$('.pagedjs_page',destino).forEach(function(pg){
    var v=++n;
    reglas.push('.pagedjs_page[data-page-number="'+pg.getAttribute('data-page-number')+'"]{counter-reset:page '+v+';counter-increment:none}');
  });
  var st=document.createElement('style');st.id='imNumeros';st.textContent=reglas.join('\n');
  document.head.appendChild(st);
}

/* ---------- Paginar ---------- */
function paginar(d){
  var contenido=construir(d);
  /* Se monta oculto para que las imágenes y las letras terminen de cargarse antes de paginar */
  var espera=el('div','im-espera');espera.setAttribute('aria-hidden','true');espera.appendChild(contenido);document.body.appendChild(espera);
  return esperarRecursos(contenido).then(function(){
    espera.remove();
    var frag=document.createDocumentFragment();frag.appendChild(contenido);
    var css={};css[location.href.replace(/[?#].*$/,'')+'#papel']=hoja(AT.exportar.formato(d));
    return new window.PagedModule.Previewer().preview(frag,[css],destino);
  });
}

if(!ID){poner('No se indicó qué documento imprimir.',true);return}
if(!window.PagedModule){poner('No se pudo cargar el paginador. Recarga la página.',true);return}
AT.datos.documentos.leer(ID).then(function(d){
  if(!d||!d.contenido){poner('No encontramos este documento en este navegador.',true);return}
  doc=d;
  /* Las referencias cruzadas leen el documento abierto */
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
  window.print();
});
})();
