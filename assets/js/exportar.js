/* OneBook: imprimir o exportar una página (PDF y Word).
   - formato(doc): el formato de la página (doc.formato), con lo que no venga puesto por omisión: papel carta o A4 y
     orientación vertical u horizontal (la horizontal sirve para tablas anchas y reportes). Lo usan el PDF
     (imprimir.js) y el Word (exportar-docx.js).
   - dialogo(doc, {alCambiar, alPdf, alDocx}): la ventana «Imprimir o exportar».
   Se carga en documento.html (antes de exportar-docx.js) y en imprimir.html. Expone AT.exportar. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico;

var DEF={papel:'carta',orientacion:'vertical'};
var OPCIONES={
  papel:[['carta','Carta'],['a4','A4']],
  orientacion:[['vertical','Vertical'],['horizontal','Horizontal']]
};
/* Solo entra lo que se conoce (el formato también llega de respaldos y de páginas de antes) */
function formato(doc){
  var f=Object.assign({},DEF),g=doc&&doc.formato||{};
  Object.keys(OPCIONES).forEach(function(k){if(OPCIONES[k].some(function(o){return o[0]===g[k]}))f[k]=g[k]});
  return f;
}

/* ---------- Ventana «Imprimir o exportar» ---------- */
function dialogo(doc,op){
  op=op||{};
  var d=document.createElement('dialog'),volver=document.activeElement;
  d.className='atajos en-dlg';d.setAttribute('aria-labelledby','exT');
  document.body.appendChild(d);
  function campo(k,titulo){
    var f=formato(doc);
    return '<div class="en-c"><span class="en-l" id="exL-'+k+'">'+titulo+'</span><div class="en-seg" role="radiogroup" aria-labelledby="exL-'+k+'">'+
      OPCIONES[k].map(function(o){return '<label class="en-o"><input type="radio" name="ex-'+k+'" value="'+o[0]+'"'+(f[k]===o[0]?' checked':'')+'><span>'+esc(o[1])+'</span></label>'}).join('')+'</div></div>';
  }
  d.innerHTML='<div class="at-h"><h2 id="exT">Imprimir o exportar</h2><button class="lec-x" type="button" data-ex="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<p class="td-p"><b>PDF:</b> una vista lista para imprimir, con números de página; en la ventana de impresión elige «Guardar como PDF». '+
    '<b>Word:</b> un archivo .docx para seguir editándolo o mandarlo.</p>'+
    '<fieldset class="en-f"><legend>Papel</legend>'+campo('papel','Tamaño')+campo('orientacion','Orientación (horizontal para tablas anchas y reportes)')+'</fieldset>'+
    '<div class="td-bt en-bt"><button class="btn pri" type="button" data-ex="pdf">'+ico('page')+'PDF: vista para imprimir</button>'+
    (op.alDocx?'<button class="btn" type="button" data-ex="docx">'+ico('descargar')+'Descargar Word (DOCX)</button>':'')+'</div>'+
    '<p class="td-msg" role="status"></p>';
  d.addEventListener('change',function(e){
    var r=e.target;if(!r.name||r.name.indexOf('ex-')!==0)return;
    var k=r.name.slice(3);
    doc.formato=Object.assign({},doc.formato||{},formato(doc));doc.formato[k]=r.value;
    if(op.alCambiar)op.alCambiar(k);
  });
  d.addEventListener('click',function(e){
    if(e.target===d){d.close();return}
    var b=e.target.closest('[data-ex]');if(!b)return;
    var a=b.getAttribute('data-ex');
    if(a==='cerrar'){d.close();return}
    if(a==='pdf'){if(op.alPdf)op.alPdf();return}
    if(a==='docx'&&op.alDocx&&b.getAttribute('aria-disabled')!=='true'){
      b.setAttribute('aria-disabled','true');
      var m=$('.td-msg',d);m.textContent='Preparando el archivo de Word…';m.classList.remove('err');
      op.alDocx().then(function(nombre){b.removeAttribute('aria-disabled');m.textContent='Listo: se descargó «'+nombre+'».'},
        function(err){b.removeAttribute('aria-disabled');m.textContent='No se pudo crear el archivo: '+(err&&err.message||'inténtalo otra vez')+'.';m.classList.add('err')});
    }
  });
  d.addEventListener('close',function(){d.remove();if(volver&&volver.focus)volver.focus({preventScroll:true})});
  d.showModal();
  var f=$('input[type="radio"]:checked',d)||$('[data-ex="pdf"]',d);if(f)f.focus();
  return d;
}

AT.exportar={DEF:DEF,OPCIONES:OPCIONES,formato:formato,dialogo:dialogo};
})();
