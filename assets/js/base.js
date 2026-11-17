/* OneLearn: base compartida por todas las páginas.
   Utilidades (AT.$, AT.fmt, AT.esc, AT.ico...), los íconos, la página actual (AT.leccion, AT.rutas),
   la lectura de los apuntes guardados y el repaso de preguntas (AT.repaso).
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
'<symbol id="i-marcador" viewBox="0 0 24 24"><path d="M6 3.5h12V21l-6-4.2L6 21z"/></symbol>'+
'</svg>');

/* ---------- Lección actual ---------- */
var catalogo=AT.catalogo||[];
var LID=document.body.getAttribute('data-leccion')||'';
/* La página de inicio vive en la raíz del sitio; las lecciones, en lecciones/ */
var ES_INICIO=document.body.getAttribute('data-pagina')==='inicio';
var RAIZ=ES_INICIO?'':'../',LECC=ES_INICIO?'lecciones/':'';
AT.rutas={raiz:RAIZ,lecciones:LECC,esInicio:ES_INICIO};
var actual=null,grupo='',orden=[];
catalogo.forEach(function(g){
  g.lecciones.forEach(function(l){
    orden.push(l);
    if(l.id===LID){actual=l;grupo=g.grupo}
  });
});
if(!actual)actual=ES_INICIO?{id:'inicio',titulo:'Inicio'}:{id:LID||'leccion',titulo:document.title};
AT.leccion=actual;
AT.orden=orden;AT.grupoActual=grupo;

/* ---------- Apuntes guardados en este dispositivo ---------- */
var CLAVE_APUNTES='aprende-tecnologia:apuntes:';
AT.apuntes={
  CLAVE:CLAVE_APUNTES,
  leer:function(id){try{return localStorage.getItem(CLAVE_APUNTES+id)||''}catch(e){return ''}},
  /* Fecha ISO de la última edición, o '' si no se sabe (notas anteriores al hito 4) */
  editado:function(id){try{return localStorage.getItem(CLAVE_APUNTES+id+':editado')||''}catch(e){return ''}}
};
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
