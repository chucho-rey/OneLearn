/* OneBook: base compartida por todas las páginas.
   Utilidades (AT.$, AT.fmt, AT.esc, AT.ico...), los íconos y la página actual (AT.paginaActual, AT.rutas).
   Se usan scripts clásicos con un espacio de nombres global (no módulos ES) para que
   las páginas también funcionen abiertas directamente desde el disco (file://).
   Orden de carga: ajustes.js y perfil.js (en <head>), base.js, datos.js, barra.js, lectura.js, app.js
   y después los scripts propios de cada página. */
(function(){
'use strict';
var AT=window.AT=window.AT||{};

/* ---------- Utilidades ---------- */
var $=AT.$=function(s,r){return (r||document).querySelector(s)};
var $$=AT.$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var reduce=AT.reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
var fmt=AT.fmt=function(n,d){return n.toLocaleString('es-MX',{minimumFractionDigits:d||0,maximumFractionDigits:d||0})};
var esc=AT.esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
/* Folios consecutivos por prefijo (V-001, V-002…) para notas de venta y cotizaciones: el último número de cada
   prefijo se guarda en aprende-tecnologia:folios (entra en el respaldo) */
AT.folio=function(pref){
  var o={};
  try{o=JSON.parse(localStorage.getItem('aprende-tecnologia:folios')||'{}')||{}}catch(e){}
  if(typeof o!=='object'||Array.isArray(o))o={};
  var n=(parseInt(o[pref],10)||0)+1;o[pref]=n;
  try{localStorage.setItem('aprende-tecnologia:folios',JSON.stringify(o))}catch(e){}
  return pref+'-'+(n<1000?('00'+n).slice(-3):String(n));
};
/* Avatares de las personas: sus iniciales con un color del sitio (siempre el mismo para la misma persona) */
AT.iniciales=function(p){
  var t=String(p&&(p.nombre||p.correo)||'?').replace(/@.*/,'').trim().split(/[\s._-]+/).filter(Boolean);
  return ((t[0]||'?').charAt(0)+(t[1]?t[1].charAt(0):'')).toUpperCase();
};
AT.tonoPersona=function(p){var s=String(p&&(p.id||p.correo)||''),h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h%5};
AT.avatar=function(p,clase){return '<i class="av t'+AT.tonoPersona(p)+(clase?' '+clase:'')+'" aria-hidden="true">'+esc(AT.iniciales(p))+'</i>'};
AT.setPressed=function(group,test){$$('button',group).forEach(function(b){b.setAttribute('aria-pressed',test(b)?'true':'false')})};
var ico=AT.ico=function(id,cls,useId){
  return '<svg class="ico'+(cls?' '+cls:'')+'" aria-hidden="true" focusable="false"><use'+(useId?' id="'+useId+'"':'')+' href="#i-'+id+'"/></svg>';
};

/* ---------- Íconos ---------- */
document.body.insertAdjacentHTML('afterbegin',
'<svg class="sprite" aria-hidden="true" focusable="false">'+
'<symbol id="i-terminal" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15H17"/></symbol>'+
'<symbol id="i-permisos" viewBox="0 0 24 24"><path d="M11.5 20.5H6V3.5h7l4 4V10"/><path d="M13 3.5v4h4"/><rect x="13" y="14.5" width="8" height="6" rx="1"/><path d="M14.8 14.5v-1.7a2.2 2.2 0 0 1 4.4 0v1.7"/></symbol>'+
'<symbol id="i-ruta" viewBox="0 0 24 24"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/></symbol>'+
'<symbol id="i-script" viewBox="0 0 24 24"><path d="M6 3.5h9.5l3.5 3.5v13.5H6z"/><path d="M15.5 3.5V7H19M9 12l2 2-2 2M13 16h3"/></symbol>'+
'<symbol id="i-so" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M3 8h18M8 21h8M12 17v4"/></symbol>'+
'<symbol id="i-grafica" viewBox="0 0 24 24"><path d="M3 3v18h18"/><circle cx="8" cy="15" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="16.5" cy="8.5" r="1.3"/><path d="M6 18L20 5.5"/></symbol>'+
'<symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5M10 20v-6h4v6"/></symbol>'+
'<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15.5 4.8a3.2 3.2 0 0 1 0 6.4M17.5 14.3c2.1.7 3.5 2.8 3.5 5.7"/></symbol>'+
'<symbol id="i-zen" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path d="M9 12h6"/></symbol>'+
'<symbol id="i-ancho" viewBox="0 0 24 24"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></symbol>'+
'<symbol id="i-teclado" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/></symbol>'+
'<symbol id="i-page" viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></symbol>'+
'<symbol id="i-mas" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>'+
'<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>'+
'<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/></symbol>'+
'<symbol id="i-up" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></symbol>'+
'<symbol id="i-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>'+
'<symbol id="i-expand" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></symbol>'+
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
'<symbol id="i-notas" viewBox="0 0 24 24"><path d="M5 3.5h10l4 4v13H5z"/><path d="M15 3.5v4h4M8.5 12h7M8.5 15.5h7"/></symbol>'+
'<symbol id="i-libro" viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5V20"/></symbol>'+
'<symbol id="i-investigacion" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5M8 10.5h5M10.5 8v5"/></symbol>'+
'<symbol id="i-pagos" viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 9.5h19M6.5 14.5h4"/></symbol>'+
'<symbol id="i-caja" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M6.5 11V4.5h8V11M9 7.5h3M3 15h18M10.5 17.5h3"/></symbol>'+
'<symbol id="i-fiado" viewBox="0 0 24 24"><path d="M5 3.5h14v17H5z"/><circle cx="12" cy="9.5" r="2.5"/><path d="M8 17c.6-2.2 2.1-3.3 4-3.3s3.4 1.1 4 3.3"/></symbol>'+
'<symbol id="i-gastos" viewBox="0 0 24 24"><path d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M9 8.5h6M9 12h6M9 15.5h3"/></symbol>'+
'<symbol id="i-venta" viewBox="0 0 24 24"><path d="M4 6.5h16v3a2.5 2.5 0 0 0 0 5v3H4v-3a2.5 2.5 0 0 0 0-5z"/><path d="M14.5 6.5v2M14.5 11v2M14.5 15.5v2"/></symbol>'+
'<symbol id="i-precio" viewBox="0 0 24 24"><path d="M3.5 12.5v-8a1 1 0 0 1 1-1h8l8.5 8.5-9 9z"/><circle cx="8" cy="8" r="1.5"/></symbol>'+
'<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>'+
'<symbol id="i-estrella" viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></symbol>'+
'<symbol id="i-estrella-llena" viewBox="0 0 24 24"><path fill="currentColor" d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></symbol>'+
'<symbol id="i-porpagar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M8 13.5h3M8 16.5h5"/></symbol>'+
'<symbol id="i-imagen" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 15.5-4.5-4.5L7 19.5"/></symbol>'+
'<symbol id="i-presentacion" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.2"/><path d="M12 16v4M8.5 20.5h7M7.5 12.5l3-3 2.5 2 3.5-4"/></symbol>'+
'<symbol id="i-blanco" viewBox="0 0 24 24"><path d="M6 3.5h8.5l4 4v13H6z"/><path d="M14.5 3.5v4h4"/></symbol>'+
'<symbol id="i-pestanas" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></symbol>'+
'<symbol id="i-marcador" viewBox="0 0 24 24"><path d="M6 3.5h12V21l-6-4.2L6 21z"/></symbol>'+
/* Recursos humanos y ayuda */
'<symbol id="i-recibo" viewBox="0 0 24 24"><path d="M5.5 3h13v18l-2.2-1.5L14 21l-2-1.5L10 21l-2.3-1.5L5.5 21z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/></symbol>'+
'<symbol id="i-sol" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></symbol>'+
'<symbol id="i-regalo" viewBox="0 0 24 24"><rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8C10.5 4 7 4 7 6s3 2 5 2c2 0 5 0 5-2s-3.5-2-5 2"/></symbol>'+
'<symbol id="i-salida" viewBox="0 0 24 24"><path d="M13.5 4H6.5a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6.5 20h7"/><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5"/></symbol>'+
'<symbol id="i-reparto" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12l6 6M12 12l-6 6"/></symbol>'+
'<symbol id="i-historial" viewBox="0 0 24 24"><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 3.5V8H8M12 7.5V12l3 2"/></symbol>'+
'<symbol id="i-ayuda" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17.2v.1"/></symbol>'+
/* Empresa: la empresa, sus departamentos, el PIN y cambiar de persona */
'<symbol id="i-empresa" viewBox="0 0 24 24"><path d="M3.5 20.5h17M6 20.5V5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v15.5M14.5 9.5H17a1 1 0 0 1 1 1v10M8.5 7.5h3M8.5 11h3M8.5 14.5h3M10 20.5v-2.5"/></symbol>'+
'<symbol id="i-deptos" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/></symbol>'+
'<symbol id="i-candado" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/></symbol>'+
'<symbol id="i-cambiar" viewBox="0 0 24 24"><path d="M4 8.5h14.5M15 5l3.5 3.5L15 12M20 15.5H5.5M9 12l-3.5 3.5L9 19"/></symbol>'+
'</svg>');

/* ---------- Página actual ---------- */
/* Todas las páginas viven en la raíz del sitio: inicio, documento, ayuda, imprimir, entrar, el contenedor de pestañas
   (app.html) y la bienvenida (index.html) */
var PAGINA=document.body.getAttribute('data-pagina')||'';
var ES_INICIO=PAGINA==='inicio',RAIZ='';
AT.rutas={raiz:RAIZ,esInicio:ES_INICIO,pagina:PAGINA};
/* Marca que este navegador ya usa OneBook: la página de bienvenida (index.html) lo manda directo a su Inicio.
   La bienvenida también carga base.js (para dibujar bloques de ejemplo), pero verla no cuenta como usar la app;
   tampoco «Crea tu empresa» (entrar.html) hasta que el espacio existe: si lo dejas a medias, vuelve a preguntar.
   El contenedor de pestañas (app.html) tampoco: la página que abre dentro ya lo marca. */
if(PAGINA!=='bienvenida'&&PAGINA!=='entrar'&&PAGINA!=='pestanas'&&PAGINA!=='ejemplo'){try{localStorage.setItem('aprende-tecnologia:visita',new Date().toISOString().slice(0,10))}catch(e){}}
var TITULOS={inicio:'Inicio',documento:'Documento',ayuda:'Ayuda',empresa:'Tu empresa',sala:'Sala',recibir:'Recibir un enlace'};
/* {id, titulo} de la página y el grupo que va antes en la barra superior («Tus páginas / …») */
AT.paginaActual={id:PAGINA||'pagina',titulo:TITULOS[PAGINA]||document.title};
AT.grupoActual=PAGINA==='documento'?'Tus páginas':PAGINA==='ayuda'?'OneBook':PAGINA==='sala'?'Salas':'';

/* ---------- El botón Atrás (o Esc) cierra primero lo que está abierto ----------
   Las ventanas (<dialog> con showModal) ya responden solas. Para los paneles que no son ventanas (el menú
   lateral en celular, Lectura, los menús del editor) se usa CloseWatcher donde existe (Chrome y Edge;
   en Android, el botón y el gesto de Atrás). AT.alAtras(fn) devuelve una función que lo suelta. */
AT.alAtras=function(fn){
  if(typeof window.CloseWatcher!=='function')return function(){};
  var w=null;
  try{w=new CloseWatcher();w.onclose=function(){w=null;fn()}}catch(e){return function(){}}
  return function(){if(w){var x=w;w=null;try{x.destroy()}catch(e){}}};
};

/* ---------- Dentro de una pestaña de la app (app.html) ----------
   Si esta página vive en un iframe del contenedor de pestañas, se le avisan los cambios de título y de
   dirección, y le pasa los atajos (Alt+T, Alt+W, Alt+1…9) y los enlaces que se abren con clic central o
   Ctrl/Cmd+clic, para abrirlos en una pestaña nueva. Expone AT.enPestana y AT.pestanas (las del contenedor). */
(function(){
  var P=null;
  try{if(window.parent!==window&&window.parent.AT&&window.parent.AT.pestanas)P=window.parent.AT.pestanas}catch(e){}
  AT.enPestana=!!P;
  if(!P)return;
  AT.pestanas=P;
  document.documentElement.classList.add('en-pestanas');
  function avisar(){try{P.cambio(window)}catch(e){}}
  function nueva(e){
    var a=e.target.closest&&e.target.closest('a[href]');
    if(!a||a.hasAttribute('download')||!P.abrible(a.href))return;
    e.preventDefault();e.stopPropagation();
    P.abrir(a.href);
  }
  document.addEventListener('click',function(e){if(e.button===0&&(e.ctrlKey||e.metaKey))nueva(e)},true);
  document.addEventListener('auxclick',function(e){if(e.button===1)nueva(e)},true);
  document.addEventListener('keydown',function(e){if(P.atajo(e,window))e.preventDefault()},true);
  new MutationObserver(avisar).observe(document.head,{subtree:true,childList:true,characterData:true});
  addEventListener('hashchange',avisar);addEventListener('popstate',avisar);
})();

function contarPalabras(t){t=t.trim();return t?t.split(/\s+/).length:0}
AT.contarPalabras=contarPalabras;

})();
