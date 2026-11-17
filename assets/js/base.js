/* OneLearn: base compartida por todas las páginas.
   Utilidades (AT.$, AT.fmt, AT.esc, AT.ico...), los íconos, la página actual (AT.leccion, AT.rutas)
   y el repaso de preguntas (AT.repaso).
   Se usan scripts clásicos con un espacio de nombres global (no módulos ES) para que
   las páginas también funcionen abiertas directamente desde el disco (file://).
   Orden de carga: ajustes.js (en <head>), catalogo.js, base.js, barra.js, lectura.js, apuntes.js, app.js
   y después los scripts propios de cada página. */
(function(){
'use strict';
var AT=window.AT=window.AT||{};
AT.labs=AT.labs||{};

/* ---------- Utilidades ---------- */
var $=AT.$=function(s,r){return (r||document).querySelector(s)};
var $$=AT.$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var reduce=AT.reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
var fmt=AT.fmt=function(n,d){return n.toLocaleString('es-MX',{minimumFractionDigits:d||0,maximumFractionDigits:d||0})};
var esc=AT.esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
AT.setPressed=function(group,test){$$('button',group).forEach(function(b){b.setAttribute('aria-pressed',test(b)?'true':'false')})};
var ico=AT.ico=function(id,cls,useId){
  return '<svg class="ico'+(cls?' '+cls:'')+'" aria-hidden="true" focusable="false"><use'+(useId?' id="'+useId+'"':'')+' href="#i-'+id+'"/></svg>';
};

/* ---------- Íconos ---------- */
document.body.insertAdjacentHTML('afterbegin',
'<svg class="sprite" aria-hidden="true" focusable="false">'+
'<symbol id="i-ram" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="11" rx="1.5"/><rect x="5" y="8" width="3.2" height="5" rx=".5" fill="currentColor" stroke="none"/><rect x="10.4" y="8" width="3.2" height="5" rx=".5" fill="currentColor" stroke="none"/><rect x="15.8" y="8" width="3.2" height="5" rx=".5" fill="currentColor" stroke="none"/><path d="M5 16v3M8 16v3M11 16v3M14 16v3M17 16v3M20 16v3"/></symbol>'+
'<symbol id="i-cpu" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5" fill="currentColor" stroke="none"/><path d="M9 2v4M12 2v4M15 2v4M9 18v4M12 18v4M15 18v4M2 9h4M2 12h4M2 15h4M18 9h4M18 12h4M18 15h4"/></symbol>'+
'<symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5M10 20v-6h4v6"/></symbol>'+
'<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15.5 4.8a3.2 3.2 0 0 1 0 6.4M17.5 14.3c2.1.7 3.5 2.8 3.5 5.7"/></symbol>'+
'<symbol id="i-zen" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path d="M9 12h6"/></symbol>'+
'<symbol id="i-ancho" viewBox="0 0 24 24"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></symbol>'+
'<symbol id="i-teclado" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/></symbol>'+
'<symbol id="i-dock-r" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/></symbol>'+
'<symbol id="i-dock-b" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h18"/></symbol>'+
'<symbol id="i-page" viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></symbol>'+
'<symbol id="i-mas" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>'+
'<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>'+
'<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/></symbol>'+
'<symbol id="i-up" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></symbol>'+
'<symbol id="i-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>'+
'<symbol id="i-expand" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></symbol>'+
'<symbol id="i-compress" viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></symbol>'+
'<symbol id="i-note" viewBox="0 0 24 24"><path d="M4 20l4-1L19.5 7.5a2.1 2.1 0 0 0-3-3L5 16z"/><path d="M14.5 6.5l3 3"/></symbol>'+
'<symbol id="i-chev-l" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></symbol>'+
'<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>'+
'<symbol id="i-aviso" viewBox="0 0 24 24"><path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2h.01"/></symbol>'+
'<symbol id="i-idea" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></symbol>'+
'<symbol id="i-datos" viewBox="0 0 24 24"><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/></symbol>'+
'<symbol id="i-deshacer" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></symbol>'+
'<symbol id="i-rehacer" viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></symbol>'+
'<symbol id="i-enlace" viewBox="0 0 24 24"><path d="M10 13.5a4 4 0 0 0 6 .4l2.6-2.6a4 4 0 0 0-5.7-5.7L11.5 7"/><path d="M14 10.5a4 4 0 0 0-6-.4l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.4-1.4"/></symbol>'+
'<symbol id="i-lista" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/></symbol>'+
'<symbol id="i-lista-num" viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4.5h1.5V9M4 9h3M4 14.5c.5-.7 1.2-1 1.9-.8.8.2 1.2 1.1.6 1.8L4 18.5h3"/></symbol>'+
'<symbol id="i-tareas" viewBox="0 0 24 24"><rect x="3.5" y="4" width="6" height="6" rx="1"/><path d="m4.8 15.8 1.6 1.6 3-3.2M13 7h7.5M13 16h7.5"/></symbol>'+
'<symbol id="i-resaltar" viewBox="0 0 24 24"><path d="m9 11-5 5v3h3l5-5"/><path d="m9 11 6.5-6.5a2.1 2.1 0 0 1 3 3L12 14z"/><path d="M14 21h7"/></symbol>'+
'<symbol id="i-codigo" viewBox="0 0 24 24"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></symbol>'+
'<symbol id="i-arrastre" viewBox="0 0 24 24"><path d="M9 5.5h.01M15 5.5h.01M9 12h.01M15 12h.01M9 18.5h.01M15 18.5h.01" stroke-width="3"/></symbol>'+
'<symbol id="i-tabla" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="1.5"/><path d="M3 9.5h18M3 14.5h18M9.5 4.5v15"/></symbol>'+
'<symbol id="i-columnas" viewBox="0 0 24 24"><rect x="3" y="4.5" width="7.5" height="15" rx="1.2"/><rect x="13.5" y="4.5" width="7.5" height="15" rx="1.2"/></symbol>'+
'<symbol id="i-desplegable" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h10"/><path d="M17.5 13v6M14.5 16h6"/></symbol>'+
'<symbol id="i-repaso" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17h.01"/></symbol>'+
'<symbol id="i-resumen" viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/></symbol>'+
'<symbol id="i-indice" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h1.5M4 12h1.5M4 18h1.5"/></symbol>'+
'<symbol id="i-separador" viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M8 6h8M8 18h8" opacity=".45"/></symbol>'+
'<symbol id="i-comillas" viewBox="0 0 24 24"><path d="M7 7.5c-2 1-3 2.8-3 5V17h5v-4.5H6.5M17 7.5c-2 1-3 2.8-3 5V17h5v-4.5h-2.5"/></symbol>'+
'<symbol id="i-texto" viewBox="0 0 24 24"><path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/></symbol>'+
'<symbol id="i-titulo" viewBox="0 0 24 24"><path d="M5 5v14M14 5v14M5 12h9"/><path d="M17.5 13.5c.4-1 1.3-1.5 2.2-1.3 1 .3 1.3 1.4.6 2.3L17.5 19h3.5"/></symbol>'+
'<symbol id="i-subtitulo" viewBox="0 0 24 24"><path d="M5 5v14M14 5v14M5 12h9"/><path d="M17.5 12.5h3l-1.8 2.3c1.3 0 2 .9 1.8 2-.3 1.3-2 1.8-3 .9"/></symbol>'+
'<symbol id="i-ojo" viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></symbol>'+
'<symbol id="i-puntos" viewBox="0 0 24 24"><path d="M5.5 12h.01M12 12h.01M18.5 12h.01" stroke-width="3"/></symbol>'+
'<symbol id="i-copiar" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="12" height="12" rx="1.5"/><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5"/></symbol>'+
'<symbol id="i-basura" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 13h11l1-13M9 7V4h6v3"/></symbol>'+
'<symbol id="i-descargar" viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/></symbol>'+
'<symbol id="i-crear" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 8v8M8 12h8"/></symbol>'+
'<symbol id="i-libreta" viewBox="0 0 24 24"><path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6z"/><path d="M6 3.5v17M3.5 7.5H6M3.5 12H6M3.5 16.5H6M10 8h5.5M10 11.5h5.5"/></symbol>'+
'<symbol id="i-notas" viewBox="0 0 24 24"><path d="M5 3.5h10l4 4v13H5z"/><path d="M15 3.5v4h4M8.5 12h7M8.5 15.5h7"/></symbol>'+
'<symbol id="i-clase" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="11" rx="1.2"/><path d="M8 20h8M12 15.5V20M7 8.5h6M7 11.5h4"/></symbol>'+
'<symbol id="i-libro" viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5V20"/></symbol>'+
'<symbol id="i-investigacion" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5M8 10.5h5M10.5 8v5"/></symbol>'+
'<symbol id="i-tesis" viewBox="0 0 24 24"><path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2V11M21.5 9v5.5"/></symbol>'+
'<symbol id="i-guia" viewBox="0 0 24 24"><path d="M9 11.5 11 13.5l4-4.5"/><path d="M5 3.5h14v17H5z"/><path d="M9 3.5v2h6v-2"/></symbol>'+
'<symbol id="i-bitacora" viewBox="0 0 24 24"><path d="M9.5 3.5v6.2L4.5 18a1.8 1.8 0 0 0 1.6 2.5h11.8a1.8 1.8 0 0 0 1.6-2.5l-5-8.3V3.5M8 3.5h8M7.5 14h9"/></symbol>'+
'<symbol id="i-presentacion" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.2"/><path d="M12 16v4M8.5 20.5h7M7.5 12.5l3-3 2.5 2 3.5-4"/></symbol>'+
'<symbol id="i-blanco" viewBox="0 0 24 24"><path d="M6 3.5h8.5l4 4v13H6z"/><path d="M14.5 3.5v4h4"/></symbol>'+
'<symbol id="i-marcador" viewBox="0 0 24 24"><path d="M6 3.5h12V21l-6-4.2L6 21z"/></symbol>'+
'</svg>');

/* ---------- Lección actual ---------- */
var catalogo=AT.catalogo||[];
var LID=document.body.getAttribute('data-leccion')||'';
/* Páginas: inicio y documento viven en la raíz del sitio; las lecciones, en lecciones/ */
var PAGINA=document.body.getAttribute('data-pagina')||(LID?'leccion':'');
var ES_INICIO=PAGINA==='inicio',EN_RAIZ=ES_INICIO||PAGINA==='documento';
var RAIZ=EN_RAIZ?'':'../',LECC=EN_RAIZ?'lecciones/':'';
AT.rutas={raiz:RAIZ,lecciones:LECC,esInicio:ES_INICIO,pagina:PAGINA};
var actual=null,grupo='',orden=[];
catalogo.forEach(function(g){
  g.lecciones.forEach(function(l){
    orden.push(l);
    if(l.id===LID){actual=l;grupo=g.grupo}
  });
});
if(!actual)actual=ES_INICIO?{id:'inicio',titulo:'Inicio'}:PAGINA==='documento'?{id:'documento',titulo:'Documento'}:{id:LID||'leccion',titulo:document.title};
if(PAGINA==='documento')grupo='Mis apuntes';
AT.leccion=actual;
AT.orden=orden;AT.grupoActual=grupo;

function contarPalabras(t){t=t.trim();return t?t.split(/\s+/).length:0}
AT.contarPalabras=contarPalabras;

/* ---------- Repaso: AT.repaso({host, score, reset, preguntas}) ----------
   Cada pregunta: {q:'texto', o:['opción',...], a:índiceCorrecto, e:'explicación'} */
AT.repaso=function(opt){
  function nodo(x){return typeof x==='string'?$(x):x}
  var qs=opt.preguntas,host=nodo(opt.host),score=nodo(opt.score),done=0,ok=0;
  var inicio='Responde las '+qs.length+' preguntas.';
  function build(){
    done=0;ok=0;
    host.innerHTML=qs.map(function(q,i){
      return '<div class="q" data-q="'+i+'"><p>'+esc(q.q)+'</p>'+
        q.o.map(function(o,j){return '<button class="qo" type="button" data-j="'+j+'">'+esc(o)+'</button>'}).join('')+
        '<p class="expl" hidden></p></div>';
    }).join('');
    score.textContent=inicio;
  }
  host.addEventListener('click',function(e){
    var b=e.target.closest('.qo');
    if(!b||b.disabled)return;
    var box=b.closest('.q'),qi=+box.getAttribute('data-q'),j=+b.getAttribute('data-j'),q=qs[qi];
    $$('.qo',box).forEach(function(x,k){
      x.disabled=true;
      if(k===q.a)x.classList.add('ok');
    });
    if(j===q.a)ok++;else b.classList.add('no');
    done++;
    var ex=$('.expl',box);
    ex.hidden=false;
    ex.textContent=(j===q.a?'Correcto. ':'No exactamente. ')+q.e;
    score.textContent=done<qs.length?'Aciertos: '+ok+' de '+done+' respondidas.':'Resultado final: '+ok+' de '+qs.length+'.';
    if(done===qs.length)document.dispatchEvent(new CustomEvent('repaso-terminado',{detail:{ok:ok,total:qs.length,host:host}}));
  });
  if(opt.reset)nodo(opt.reset).addEventListener('click',build);
  build();
};
})();
