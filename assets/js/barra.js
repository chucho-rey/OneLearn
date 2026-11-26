/* OneBook: barra lateral, barra superior y navegación.
   Arma la barra lateral (Inicio, Crear, Buscar, Tu empresa, «Tus páginas» como un explorador y el pie: quién usa
   OneBook ahora, con «Cambiar de persona» (persona.js), Lectura, Tus datos, pestañas, Ayuda y modo zen) y la barra
   superior; maneja el menú en celular (panel modal con trampa de foco) y la barra compacta en escritorio (solo iconos,
   con su nombre en un globo).
   «Tus páginas»: las ubicaciones con su cuenta (todas, favoritas, recientes, compartidas…), las salas como carpetas con
   sus páginas, por tipo y la papelera. AT.ubicaciones (el modelo de las ubicaciones) lo usa también el explorador del
   Inicio, que ya no tiene su propia columna: en el Inicio, una ubicación cambia el explorador.
   Expone AT.setNav, AT.esEscritorio, AT.ubicaciones, AT.refrescarPaginas, AT.pintarSalas y AT.barraUbicacion. */
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
  /* Tus páginas como un explorador: ubicaciones, salas con sus páginas, por tipo y papelera (se dibuja abajo) */
  h+='<nav class="tabp arb" id="arbol" aria-label="Tus páginas"></nav>';
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

/* ---------- Ubicaciones de tus páginas: las comparten la barra lateral y el explorador del Inicio ---------- */
/* «Mi negocio» y «Tu equipo» viven en el tablero del Inicio: no salen entre tus páginas (salvo la que tienes abierta) */
var SISTEMA={'d-minegocio':1,'d-miequipo':1};
var CATS=[['negocio','Negocio','caja'],['rh','Recursos humanos','users'],['general','Otras','notas'],['estudio','De estudio (solo lectura)','libreta']];
var DIA=864e5;
/* Lo que una ubicación necesita saber de cada página */
function infoPagina(d){
  var D=AT.datos,A=D.acceso,deEstudio=!!(D.deEstudio&&D.deEstudio(d));
  var t=deEstudio?{nombre:'Página de estudio',icono:'libreta',cat:'estudio'}:AT.tiposDoc&&AT.tiposDoc[d.tipo]||{nombre:'Documento',icono:'page',cat:'general'};
  var gente=A?A.personas(d):[],admin=A?A.puede(d,'compartir'):true;
  return {d:d,id:d.id,titulo:d.titulo||'Sin título',tipo:t,cat:CATS.some(function(c){return c[0]===t.cat})?t.cat:'general',
    gente:gente,admin:admin,pend:admin&&A?A.pendientes(d):[],contigo:gente.some(function(p){return p.tu&&p.rol!=='dueno'}),
    sala:A&&A.sala?A.sala(d):'',editado:d.editado||d.creado||''};
}
/* Las páginas de estudio (que se separaron de OneBook) solo salen en «De estudio» */
var UBIC=[
  {k:'todas',t:'Todas tus páginas',i:'notas',f:function(x){return x.cat!=='estudio'}},
  {k:'favoritas',t:'Favoritas',i:'estrella',f:function(x){return x.cat!=='estudio'&&!!x.d.favorito}},
  {k:'recientes',t:'Recientes',i:'historial',f:function(x){return x.cat!=='estudio'&&Date.now()-Date.parse(x.editado)<7*DIA}},
  {k:'compartidas',t:'Compartidas',i:'users',f:function(x){return x.cat!=='estudio'&&x.gente.length>1}},
  {k:'contigo',t:'Compartidas contigo',i:'enlace',f:function(x){return x.cat!=='estudio'&&x.contigo},siHay:true},
  {k:'solicitudes',t:'Solicitudes',i:'aviso',f:function(x){return x.cat!=='estudio'&&x.pend.length>0},siHay:true}
];
/* Una ubicación por su clave: las de arriba, una sala ('sala:sa-…' o 'sala:privado') o un tipo ('cat:negocio') */
function ubicDe(k){
  var u=UBIC.filter(function(x){return x.k===k})[0];
  if(u)return u;
  var sm=/^sala:(sa-[\w-]+|privado)$/.exec(k||'');
  if(sm){var so=sm[1]==='privado'?{nombre:'Privado'}:AT.empresa&&AT.empresa.existe()&&AT.empresa.sala(sm[1]);
    if(so)return {k:k,t:sm[1]==='privado'?'Privado':so.tipo==='general'?'General':so.nombre,i:sm[1]==='privado'?'candado':'deptos',sala:sm[1],
      f:function(x){return x.cat!=='estudio'&&x.sala===sm[1]}}}
  var c=/^cat:(\w+)$/.exec(k||''),cc=c&&CATS.filter(function(x){return x[0]===c[1]})[0];
  return cc?{k:k,t:cc[1],i:cc[2],f:function(x){return x.cat===cc[0]}}:UBIC[0];
}
/* Las páginas que cuentan: las que puedes ver, sin las del sistema (la abierta, sí) */
function paginasVisibles(docs){
  var A=AT.datos.acceso,abierto=AT.documentoAbierto||'';
  return (docs||[]).filter(function(d){return (!SISTEMA[d.id]||d.id===abierto)&&(!A||A.puede(d,'ver'))});
}
AT.ubicaciones={SISTEMA:SISTEMA,CATS:CATS,UBIC:UBIC,info:infoPagina,de:ubicDe,paginas:paginasVisibles};

/* ---------- Tus páginas: el árbol de la barra lateral ---------- */
/* Arriba, las ubicaciones (en el Inicio cambian el explorador; en otra página abren el Inicio en esa ubicación); luego las
   salas como carpetas que se abren para mostrar sus páginas (la sala lleva a su página); por tipo y la papelera.
   Las salas abiertas se recuerdan en aprende-tecnologia:arbol; la de la página abierta se abre sola. */
(function(){
  var CLAVE='aprende-tecnologia:arbol',MAX=30;
  var arbol=$('#arbol',sideEl);if(!arbol)return;
  var pintando=0,docsCache=null,ultimo='',enPapelera=0;
  var abiertas={};
  try{(JSON.parse(localStorage.getItem(CLAVE)||'null')||['sa-general']).forEach(function(k){if(typeof k==='string')abiertas[k]=1})}catch(e){abiertas={'sa-general':1}}
  function guardarAbiertas(){try{localStorage.setItem(CLAVE,JSON.stringify(Object.keys(abiertas)))}catch(e){}}
  function leer(){return Promise.all([AT.datos.documentos.todos(),AT.datos.papelera?AT.datos.papelera.todos():[]])}
  function pintarDocs(){
    if(docsCache)pintar(docsCache);
    var n0=++pintando;
    leer().then(function(r){
      docsCache=r[0];enPapelera=r[1].length;
      if(n0===pintando)pintar(r[0]);
    });
  }
  /* La ubicación del explorador (solo en el Inicio) */
  function ubicActual(){return ES_INICIO&&AT.explorador&&AT.explorador.ubicacion?AT.explorador.ubicacion():''}
  /* La sala donde estás: la de la página de sala o la de la página abierta */
  function salaAqui(){
    if(R.pagina==='sala')return new URLSearchParams(location.search).get('id')||'';
    return AT.datos.acceso&&AT.docActual?AT.datos.acceso.sala(AT.docActual)||'':'';
  }
  function cuenta(xs,f){var n=0;xs.forEach(function(x){if(f(x))n++});return n}
  function ubicHTML(k,i,t,n,extra){
    var on=ubicActual()===k;
    return '<li><a class="nv arb-u'+(extra||'')+(on?' on':'')+'" data-ubic="'+esc(k)+'" href="'+RAIZ+'inicio.html#ubic='+encodeURIComponent(k)+'"'+(on?' aria-current="true"':'')+'>'+
      ico(i)+'<span>'+esc(t)+'</span><em>'+n+'</em></a></li>';
  }
  function paginaHTML(x){
    var d=x.d,aqui=d.id===(AT.documentoAbierto||''),u='documento.html?id='+encodeURIComponent(d.id);
    return '<li'+(AT.enPestana?' class="doc-li"':'')+'><a class="nv doc'+(aqui?' on':'')+'" href="'+RAIZ+u+'"'+(aqui?' aria-current="page"':'')+'>'+
      ico(x.tipo.icono||'page')+'<span>'+esc(x.titulo)+'</span>'+(d.favorito?'<i class="doc-est" title="Favorita">'+ico('estrella-llena')+'<span class="vh"> (favorita)</span></i>':'')+'</a>'+
      (AT.enPestana?'<button class="doc-pt" type="button" data-pt-url="'+esc(u)+'" aria-label="Abrir «'+esc(x.titulo)+'» en una pestaña nueva" title="Abrir en una pestaña nueva">'+ico('pestanas')+'</button>':'')+'</li>';
  }
  /* Una sala: la flecha que muestra sus páginas, el enlace a la sala y sus páginas (favoritas primero, luego recientes) */
  function salaHTML(id,nombre,marca,color,xs,aqui){
    var ps=xs.filter(function(x){return x.cat!=='estudio'&&x.sala===id}).sort(function(a,b){return (!!b.d.favorito-!!a.d.favorito)||(b.editado<a.editado?-1:b.editado>a.editado?1:0)});
    var abierta=!!abiertas[id]||id===aqui,on=R.pagina==='sala'&&id===aqui,lid='arb-'+id.replace(/[^\w-]/g,'');
    var h='<li class="arb-sala" data-sala="'+esc(id)+'"><div class="arb-fila">'+
      '<button type="button" class="arb-tg" aria-expanded="'+abierta+'" aria-controls="'+lid+'" aria-label="'+(abierta?'Esconder':'Mostrar')+' las páginas de '+esc(nombre)+'" title="'+(abierta?'Esconder':'Mostrar')+' sus páginas">'+ico('chev-l')+'</button>'+
      '<a class="nv sala-nv'+(id===aqui?' on':'')+'" href="'+RAIZ+'sala.html?id='+encodeURIComponent(id)+'"'+(on?' aria-current="page"':'')+'>'+marca+'<span>'+esc(nombre)+'</span><em>'+ps.length+'</em></a></div>'+
      '<ul class="arb-pags'+(color?' arb-c-'+esc(color):'')+'" id="'+lid+'"'+(abierta?'':' hidden')+'>';
    if(!ps.length)h+='<li class="arb-nada">Sin páginas todavía.</li>';
    h+=ps.slice(0,MAX).map(paginaHTML).join('');
    if(ps.length>MAX)h+='<li><a class="nv arb-mas" href="'+RAIZ+'sala.html?id='+encodeURIComponent(id)+'"><span>Ver las '+ps.length+' páginas</span></a></li>';
    return h+'</ul></li>';
  }
  function pintar(docs){
    var xs=paginasVisibles(docs).map(infoPagina),aqui=salaAqui();
    var h='<h2 class="arb-h">Tus páginas</h2><ul class="arb-ul">'+UBIC.map(function(u){
      var n=cuenta(xs,u.f);
      if(u.siHay&&!n)return '';
      return ubicHTML(u.k,u.i,u.t,n,u.k==='solicitudes'?' arb-aviso':'');
    }).join('')+'</ul>';
    if(!xs.length)h+='<p class="side-txt">Todavía no tienes páginas. Toca «Crear» para empezar.</p>';
    if(EMP){
      h+='<h2 class="arb-h">Salas</h2><ul class="arb-ul" id="salasLista">'+AT.empresa.salas().map(function(s){
        return salaHTML(s.id,s.tipo==='general'?'General':s.nombre,'<i class="emp-dot c-'+esc(s.color)+'" aria-hidden="true"></i>',s.color,xs,aqui);
      }).join('')+salaHTML('privado','Privado',ico('candado'),'',xs,aqui)+'</ul>';
    }
    var cats=CATS.filter(function(c){return cuenta(xs,function(x){return x.cat===c[0]})});
    if(cats.length>1)h+='<h2 class="arb-h">Por tipo</h2><ul class="arb-ul">'+cats.map(function(c){
      return ubicHTML('cat:'+c[0],c[2],c[1],cuenta(xs,function(x){return x.cat===c[0]}));
    }).join('')+'</ul>';
    h+='<ul class="arb-ul arb-pie"><li><button class="nv doc-pap" type="button" data-papelera>'+ico('basura')+'<span>Papelera</span><em>'+enPapelera+'</em></button></li></ul>'+
      '<p class="side-txt">Todo se guarda en este dispositivo.</p>';
    if(h===ultimo)return;
    /* Al volver a dibujar, el foco se queda en el mismo elemento */
    var f=document.activeElement,clave=f&&arbol.contains(f)?(f.getAttribute('href')||f.getAttribute('aria-controls')||(f.hasAttribute('data-papelera')?'pap':'')):'';
    arbol.innerHTML=h;ultimo=h;
    if(clave){var g=clave==='pap'?$('[data-papelera]',arbol):arbol.querySelector('[href="'+CSS.escape(clave)+'"],[aria-controls="'+CSS.escape(clave)+'"]');if(g)g.focus()}
  }
  /* Abrir o cerrar una sala (sin volver a dibujar todo) */
  function alternar(li,abrir){
    var tg=$('.arb-tg',li),ul=$('.arb-pags',li),id=li.getAttribute('data-sala'),nombre=$('.sala-nv>span',li).textContent;
    if(abrir===undefined)abrir=tg.getAttribute('aria-expanded')!=='true';
    tg.setAttribute('aria-expanded',String(abrir));ul.hidden=!abrir;
    tg.setAttribute('aria-label',(abrir?'Esconder':'Mostrar')+' las páginas de '+nombre);tg.title=(abrir?'Esconder':'Mostrar')+' sus páginas';
    if(abrir)abiertas[id]=1;else delete abiertas[id];
    guardarAbiertas();ultimo=arbol.innerHTML;
  }
  arbol.addEventListener('click',function(e){
    var tg=e.target.closest('.arb-tg');
    if(tg){alternar(tg.closest('.arb-sala'));return}
    /* Dentro de las pestañas de la app: el botón junto a cada página la abre en una pestaña nueva */
    var pt=e.target.closest('[data-pt-url]');
    if(pt&&AT.pestanas){setNav(false);AT.pestanas.abrir(new URL(RAIZ+pt.getAttribute('data-pt-url'),location.href).href);return}
    /* En el Inicio, una ubicación cambia el explorador sin recargar */
    var u=e.target.closest('[data-ubic]');
    if(u&&ES_INICIO&&AT.explorador&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){
      e.preventDefault();
      AT.explorador.ir(u.getAttribute('data-ubic'));
      if(!isDesk()){setNav(false);var t=$('#t-docs');if(t)t.focus()}
      else{var s=$('#iniPaginas');if(s&&s.getBoundingClientRect().top<0)s.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})}
    }
  });
  /* Teclado, como un árbol: flechas arriba y abajo entre lo que se ve; derecha abre una sala (o entra a sus páginas);
     izquierda la cierra (o sube a su sala); Inicio y Fin */
  arbol.addEventListener('keydown',function(e){
    var k=e.key;if(['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].indexOf(k)<0||e.altKey||e.ctrlKey||e.metaKey)return;
    var items=$$('a.nv,button.nv',arbol).filter(function(x){return x.offsetParent!==null});
    var cur=document.activeElement,i=items.indexOf(cur.classList.contains('arb-tg')?$('.sala-nv',cur.closest('.arb-sala')):cur);
    if(i<0)return;
    var li=cur.closest('.arb-sala'),esSala=!!li&&!cur.closest('.arb-pags');
    var ir=function(x){if(x){x.focus();e.preventDefault()}};
    if(k==='ArrowDown')ir(items[i+1]);
    else if(k==='ArrowUp')ir(items[i-1]);
    else if(k==='Home')ir(items[0]);
    else if(k==='End')ir(items[items.length-1]);
    else if(k==='ArrowRight'&&esSala){
      if($('.arb-tg',li).getAttribute('aria-expanded')!=='true'){alternar(li,true);e.preventDefault()}
      else ir($('.arb-pags a.nv',li));
    }else if(k==='ArrowLeft'&&li){
      if(esSala){if($('.arb-tg',li).getAttribute('aria-expanded')==='true'){alternar(li,false);ir($('.sala-nv',li))}}
      else ir($('.sala-nv',li));
    }
  });
  var espera=null;
  AT.refrescarPaginas=function(){clearTimeout(espera);espera=setTimeout(pintarDocs,400)};
  AT.datos.on(function(c){if(c.almacen==='documentos'||c.almacen==='papelera'||c.almacen==='*'||c.almacen==='todo')AT.refrescarPaginas()});
  if(EMP)AT.empresa.on(function(){if(docsCache)pintar(docsCache)});
  /* La sala de la página abierta puede cambiar (documento.js la avisa al moverla) */
  AT.pintarSalas=function(){if(docsCache)pintar(docsCache)};
  /* El explorador avisa cuando cambia de ubicación */
  AT.barraUbicacion=function(k){
    $$('[data-ubic]',arbol).forEach(function(a){var on=a.getAttribute('data-ubic')===k;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')});
    ultimo=arbol.innerHTML;
  };
  /* Se dibuja cuando ya cargaron todos los scripts (los tipos de página de crear.js y el explorador del Inicio) */
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pintarDocs);else pintarDocs();
})();

/* ---------- Pie: Lectura y quién usa OneBook ---------- */
(function(){
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
})();
})();
