/* OneBook: barra lateral, barra superior y navegación.
   Arma la barra lateral (Inicio, Crear, Buscar, Tu empresa, «Tus páginas» y el pie: quién usa OneBook ahora, con
   «Cambiar de persona» (persona.js), Lectura, Tus datos, pestañas, Ayuda y modo zen)
   y la barra superior; maneja el menú en celular (panel modal con trampa de foco), la barra compacta en escritorio
   (solo iconos, con su nombre en un globo) y la lista de tus páginas (favoritas primero; sin «Mi negocio», «Tu
   equipo» ni las páginas de estudio, que se separaron de OneBook).
   Expone AT.setNav, AT.esEscritorio y AT.refrescarPaginas. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,reduce=AT.reduce;
var R=AT.rutas,RAIZ=R.raiz,ES_INICIO=R.esInicio;
var actual=AT.paginaActual,grupo=AT.grupoActual;
var MENU='menú';

/* ---------- Estructura: barra lateral y barra superior ---------- */
var EMP=!!(AT.empresa&&AT.empresa.existe());
/* Quién usa OneBook ahora: su avatar y su nombre; abre «Cambiar de persona» (persona.js) */
function botonPersona(){
  var p=AT.empresa.activa(),n=p?p.nombre||'Sin nombre':'¿Quién eres?';
  return '<button class="nv nv-yo" type="button" id="sidePersona" aria-haspopup="dialog" data-globo="'+esc(p?n+': cambiar de persona':'Elige quién eres')+'">'+
    (p?AT.avatar(p):'<i class="av t4" aria-hidden="true">?</i>')+
    '<span><b>'+esc(n)+'</b><small>'+(p?'Cambiar de persona':'Elige quién eres')+'</small></span></button>';
}
(function(){
  var h='<div class="side-in"><div class="ws"><a class="brand" href="'+RAIZ+'inicio.html"><svg class="brand-mk" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14"/><path d="M18.5 22.5 27.5 16v32M27.5 16h8a7.5 7.5 0 0 1 0 15h-8M27.5 31h9.5a8.5 8.5 0 0 1 0 17h-9.5"/></svg><span>One<b>Book</b></span></a>'+
    '<button class="side-btn" id="sideBtn" type="button" aria-label="Contraer barra lateral" title="Contraer barra lateral">'+ico('chev-l','side-ic-c')+ico('close','side-ic-x')+'</button></div>'+
    '<a class="nv'+(ES_INICIO?' on" aria-current="page':'')+'" href="'+RAIZ+'inicio.html">'+ico('home')+'<span>Inicio</span></a>'+
    '<button class="nv nv-crear" type="button" id="sideCrear" aria-haspopup="dialog">'+ico('crear')+'<span>Crear</span></button>'+
    '<button class="nv" type="button" id="sideBuscar" aria-haspopup="dialog">'+ico('investigacion')+'<span>Buscar</span><kbd class="solo-teclado">Ctrl K</kbd></button>'+
    (EMP?'<a class="nv'+(R.pagina==='empresa'?' on" aria-current="page':'')+'" href="'+RAIZ+'empresa.html" id="sideEmpresa">'+ico('empresa')+'<span>Tu empresa</span></a>':'');
  h+='<div class="tabp" id="pn-apuntes"><div class="grp">Tus páginas</div><ul class="docs" id="docsLista"></ul>'+
      '<p class="side-txt">Todo se guarda en este dispositivo.</p></div>';
  h+='<div class="side-foot">'+
      (EMP?botonPersona():'')+
      '<button class="nv" type="button" id="sideLectura"><span class="ico-txt" aria-hidden="true">Aa</span><span>Lectura</span></button>'+
      '<button class="nv" type="button" id="sideDatos">'+ico('datos')+'<span>Tus datos</span></button>'+
      /* Fuera de las pestañas de la app: entrar a ellas con esta página abierta */
      (AT.enPestana?'':'<a class="nv" id="sidePestanas" href="'+RAIZ+'app.html#abrir='+encodeURIComponent(location.pathname.split('/').slice(RAIZ==='../'?-2:-1).join('/')+location.search)+'">'+ico('pestanas')+'<span>Abrir en pestañas</span></a>')+
      '<a class="nv'+(R.pagina==='ayuda'?' on" aria-current="page':'')+'" href="'+RAIZ+'ayuda.html" id="sideAyuda">'+ico('ayuda')+'<span>Ayuda</span></a>'+
      (ES_INICIO?'':
        '<button class="nv" type="button" id="sideZen">'+ico('zen')+'<span>Modo zen</span><kbd>Z</kbd></button>'+
        '<button class="nv solo-teclado" type="button" id="sideAtajos">'+ico('teclado')+'<span>Atajos de teclado</span><kbd>?</kbd></button>')+
    '</div>';
  $('#side').innerHTML=h+'</div>';
  $('#side').setAttribute('aria-label','Navegación');

  $('#topbar').innerHTML=
    '<button class="icon-btn" id="menuBtn" type="button" aria-label="Abrir '+MENU+'" aria-expanded="false" aria-controls="side">'+ico('menu')+'</button>'+
    '<nav class="crumbs" aria-label="Ruta">'+(grupo?'<span>'+esc(grupo)+'</span><span class="sep" aria-hidden="true">/</span>':'')+
    '<span class="cur" aria-current="page">'+esc(actual.titulo)+'</span></nav>'+
    (ES_INICIO?'':'<button class="icon-btn zen-btn" id="zenBtn" type="button" aria-label="Modo zen (Z)" title="Modo zen (Z)" aria-pressed="false">'+ico('zen')+'</button>')+
    '<button class="aa-btn" id="aaBtn" type="button" aria-label="Lectura: tamaño de texto, tema y contraste" title="Lectura" aria-expanded="false" aria-controls="lectura">Aa</button>';

  document.body.insertAdjacentHTML('beforeend','<div class="scrim" id="scrim"></div>');
})();

/* ---------- Navegación y barra lateral ---------- */
var menuBtn=$('#menuBtn'),sideBtn=$('#sideBtn'),sideEl=$('#side'),mainEl=$('.main');
var deskMq=window.matchMedia('(min-width:900px)');
function isDesk(){return deskMq.matches}
function collapsed(){return document.documentElement.classList.contains('side-collapsed')}
function navOpen(){return document.body.classList.contains('nav-open')}
function syncMenu(){
  var desk=isDesk();
  var exp=desk?!collapsed():navOpen();
  var lab=desk?(collapsed()?'Expandir barra lateral':'Contraer barra lateral'):'Abrir '+MENU;
  var sideLab=desk?(collapsed()?'Expandir barra lateral':'Contraer barra lateral'):'Cerrar '+MENU;
  menuBtn.setAttribute('aria-expanded',exp?'true':'false');
  if(desk)sideBtn.setAttribute('aria-expanded',exp?'true':'false');else sideBtn.removeAttribute('aria-expanded');
  if(!desk||!collapsed())quitarGlobo();
  menuBtn.setAttribute('aria-label',lab);
  menuBtn.setAttribute('title',lab);
  sideBtn.setAttribute('aria-label',sideLab);
  sideBtn.setAttribute('title',sideLab);
}
/* En celular el menú es un panel modal: mientras está abierto, el resto de la página
   queda inerte (sin foco ni clics) y el foco se mueve al panel; al cerrar vuelve al botón. */
/* En celular, el botón Atrás (CloseWatcher, base.js) cierra el menú abierto */
var soltarAtras=function(){};
function setNav(open){
  var was=navOpen();
  document.body.classList.toggle('nav-open',open);
  var modal=open&&!isDesk();
  if(mainEl)mainEl.toggleAttribute('inert',modal);
  syncMenu();
  if(modal&&!was)soltarAtras=AT.alAtras(function(){setNav(false)});
  else if(!open&&was){soltarAtras();soltarAtras=function(){}}
  if(modal&&!was){
    /* El foco va a la página actual (el Inicio, o la página abierta en «Tus páginas») */
    var f=$('.nv.on',sideEl)||sideBtn;
    f.focus({preventScroll:true});
  }else if(!open&&was&&sideEl.contains(document.activeElement)){
    menuBtn.focus({preventScroll:true});
  }
}
AT.setNav=setNav;
AT.esEscritorio=isDesk;
/* Trampa de foco del menú en celular: Tab no sale de la barra mientras está abierta */
sideEl.addEventListener('keydown',function(e){
  if(e.key!=='Tab'||!navOpen()||isDesk())return;
  var f=$$('a[href],button,[tabindex="0"]',sideEl).filter(function(x){return !x.disabled&&x.tabIndex>=0&&x.getClientRects().length});
  if(!f.length)return;
  var first=f[0],last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
function setSide(open){
  AT.ajustes.set('barra',open?'abierta':'cerrada');
  syncMenu();
}
AT.ajustes.on(syncMenu);
menuBtn.addEventListener('click',function(){
  if(isDesk())setSide(collapsed());
  else setNav(!navOpen());
});
sideBtn.addEventListener('click',function(){
  if(isDesk())setSide(collapsed());
  else setNav(false);
});
/* Barra compacta: el nombre de cada icono sale en un globo al pasar el puntero o al llegar con Tab */
var globo=null;
function quitarGlobo(){if(globo){globo.remove();globo=null}}
function ponerGlobo(el){
  quitarGlobo();
  var t=el.querySelector('span:not(.ico-txt)');
  var txt=el.getAttribute('data-globo')||(t?t.textContent.trim():(el.getAttribute('aria-label')||''));
  if(!txt)return;
  globo=document.createElement('div');globo.className='side-tip';globo.setAttribute('aria-hidden','true');globo.textContent=txt;
  document.body.appendChild(globo);
  var r=el.getBoundingClientRect(),g=globo.getBoundingClientRect();
  globo.style.left=(r.right+8)+'px';
  globo.style.top=Math.max(4,Math.min(window.innerHeight-g.height-4,r.top+(r.height-g.height)/2))+'px';
}
function enCompacta(e){
  if(!isDesk()||!collapsed())return null;
  return e.target.closest&&e.target.closest('.nv');
}
sideEl.addEventListener('mouseover',function(e){var n=enCompacta(e);if(n)ponerGlobo(n)});
sideEl.addEventListener('mouseout',function(e){if(globo&&!(e.relatedTarget&&e.target.closest('.nv')&&e.target.closest('.nv').contains(e.relatedTarget)))quitarGlobo()});
sideEl.addEventListener('focusin',function(e){var n=enCompacta(e);if(n&&n.matches(':focus-visible'))ponerGlobo(n)});
sideEl.addEventListener('focusout',quitarGlobo);
sideEl.addEventListener('scroll',quitarGlobo,{passive:true});
document.addEventListener('keydown',function(e){if(e.key==='Escape')quitarGlobo()});
$('#scrim').addEventListener('click',function(){setNav(false)});
sideEl.addEventListener('click',function(e){
  /* Tocar la página actual solo cierra el menú, no la recarga */
  if(e.target.closest('.nv.on')){e.preventDefault();setNav(false)}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&navOpen()){setNav(false);e.preventDefault()}});
function syncViewport(){setNav(false);syncMenu()}
if(deskMq.addEventListener)deskMq.addEventListener('change',syncViewport);
else if(deskMq.addListener)deskMq.addListener(syncViewport);
syncMenu();
/* Botones del índice: llevan a su sección (delegado, porque el contenido puede dibujarse después) */
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-go]');
  if(!b)return;
  var t=document.getElementById(b.getAttribute('data-go'));
  if(t)t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
});

/* ---------- Tus páginas ---------- */
(function(){
  /* Se dibuja al instante con lo ya leído y después se confirma con la base; si no cambió nada, no se toca la lista
     (así no se pierde el foco) */
  var pintando=0,docsCache=null,ultimoDocs='',listaDocs=$('#docsLista',sideEl),enPapelera=0;
  function leer(){return Promise.all([AT.datos.documentos.todos(),AT.datos.papelera?AT.datos.papelera.todos():[]])}
  function pintarDocs(){
    if(docsCache)pintarDocsCon(docsCache);
    var n0=++pintando;
    leer().then(function(r){
      docsCache=r[0];enPapelera=r[1].length;
      if(n0===pintando)pintarDocsCon(r[0]);
    });
  }
  /* Dentro de las pestañas de la app: el botón junto a cada documento lo abre en una pestaña nueva */
  listaDocs.addEventListener('click',function(e){
    var b=e.target.closest('[data-pt-url]');
    if(b&&AT.pestanas){setNav(false);AT.pestanas.abrir(new URL(RAIZ+b.getAttribute('data-pt-url'),location.href).href)}
  });
  /* Documentos: las favoritas primero (con su estrella) y después los más recientes; el que está abierto, marcado.
     Al final, «Papelera» si hay algo en ella (respaldo.js abre la ventana) */
  function pintarDocsCon(docs){
    var abierto=AT.documentoAbierto||'';
    /* «Mi negocio» (fase F7e) es el Inicio de un negocio: no se repite entre tus páginas (salvo si estás en ella) */
    /* Las páginas de estudio (que se separaron de OneBook) tampoco: se abren solo desde una dirección guardada */
    docs=docs.filter(function(d){return ((d.id!=='d-minegocio'&&d.id!=='d-miequipo')||abierto===d.id)&&!(AT.datos.deEstudio&&AT.datos.deEstudio(d)&&abierto!==d.id)}).sort(function(a,b){return (!!b.favorito-!!a.favorito)||((b.editado||'')<(a.editado||'')?-1:(b.editado||'')>(a.editado||'')?1:0)});
    var h=docs.map(function(d){
      var aqui=d.id===abierto,tipo=AT.tiposDoc&&AT.tiposDoc[d.tipo];
      var u='documento.html?id='+encodeURIComponent(d.id);
      return '<li'+(AT.enPestana?' class="doc-li"':'')+'><a class="nv doc'+(aqui?' on':'')+'" href="'+RAIZ+u+'"'+(aqui?' aria-current="page"':'')+'>'+
        ico(tipo?tipo.icono:'page')+'<span>'+esc(d.titulo||'Sin título')+'</span>'+(d.favorito?'<i class="doc-est" title="Favorita">'+ico('estrella-llena')+'<span class="vh"> (favorita)</span></i>':'')+'</a>'+
        (AT.enPestana?'<button class="doc-pt" type="button" data-pt-url="'+esc(u)+'" aria-label="Abrir «'+esc(d.titulo||'Sin título')+'» en una pestaña nueva" title="Abrir en una pestaña nueva">'+ico('pestanas')+'</button>':'')+'</li>';
    }).join('');
    h=h||'<li class="side-txt">Todavía no tienes páginas. Toca «Crear» para empezar.</li>';
    if(enPapelera)h+='<li><button class="nv doc-pap" type="button" data-papelera>'+ico('basura')+'<span>Papelera</span><em>'+enPapelera+'</em></button></li>';
    if(h!==ultimoDocs){listaDocs.innerHTML=h;ultimoDocs=h}
  }
  var espera=null;
  AT.refrescarPaginas=function(){clearTimeout(espera);espera=setTimeout(pintarDocs,400)};
  AT.datos.on(function(c){if(c.almacen==='documentos'||c.almacen==='papelera'||c.almacen==='*')AT.refrescarPaginas()});

  $('#sideLectura').addEventListener('click',function(){setNav(false);AT.lectura.abrir()});
  /* Quién usa OneBook: «Cambiar de persona» (persona.js); el botón se vuelve a pintar si cambia tu nombre */
  function enlazarPersona(b){b.addEventListener('click',function(){setNav(false);if(AT.persona)AT.persona.abrir(b)})}
  if($('#sidePersona')){
    enlazarPersona($('#sidePersona'));
    AT.empresa.on(function(){
      var n=$('#sidePersona');if(!n)return;
      var t=document.createElement('div');t.innerHTML=botonPersona();
      if(t.firstChild.outerHTML===n.outerHTML)return;
      var foco=document.activeElement===n;
      n.replaceWith(t.firstChild);enlazarPersona($('#sidePersona'));
      if(foco)$('#sidePersona').focus();
    });
  }
  pintarDocs();
})();
})();
