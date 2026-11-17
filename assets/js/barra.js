/* OneLearn: barra lateral, barra superior y navegación.
   Arma la barra lateral (Inicio, pestañas Temas / Mis apuntes / Comunidad, Lectura y Modo zen),
   la barra superior y el enlace a la siguiente lección a partir de AT.catalogo; maneja el menú en celular
   (panel modal con trampa de foco), la barra contraída en escritorio y las pestañas.
   Expone AT.setNav, AT.esEscritorio y AT.refrescarNotas. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,reduce=AT.reduce;
var R=AT.rutas,RAIZ=R.raiz,LECC=R.lecciones,ES_INICIO=R.esInicio;
var catalogo=AT.catalogo||[],actual=AT.leccion;
var grupo=AT.grupoActual,orden=AT.orden;

/* ---------- Estructura: barra lateral, barra superior y siguiente lección ---------- */
(function(){
  var h='<div class="side-in"><div class="ws"><a class="brand" href="'+RAIZ+'index.html"><svg class="brand-mk" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14"/><path d="M20.5 22.5 30 16v32h14.5"/></svg><span>One<b>Learn</b></span></a>'+
    '<button class="side-btn" id="sideBtn" type="button" aria-label="Contraer barra lateral" title="Contraer barra lateral">'+ico('chev-l','side-ic-c')+ico('close','side-ic-x')+'</button></div>'+
    '<a class="nv'+(ES_INICIO?' on" aria-current="page':'')+'" href="'+RAIZ+'index.html">'+ico('home')+'<span>Inicio</span></a>'+
    '<button class="nv nv-crear" type="button" id="sideCrear" aria-haspopup="dialog">'+ico('crear')+'<span>Crear</span></button>'+
    '<div class="tabs" role="tablist" aria-label="Secciones">'+
      '<button class="tab" type="button" role="tab" id="tab-temas" aria-controls="pn-temas">Temas</button>'+
      '<button class="tab" type="button" role="tab" id="tab-apuntes" aria-controls="pn-apuntes">Mis apuntes</button>'+
      '<button class="tab" type="button" role="tab" id="tab-comunidad" aria-controls="pn-comunidad">Comunidad</button>'+
    '</div>'+
    '<div class="tabp" role="tabpanel" id="pn-temas" aria-labelledby="tab-temas"><nav aria-label="Temas">';
  catalogo.forEach(function(g){
    h+='<div class="grp">'+esc(g.grupo)+'</div>';
    g.lecciones.forEach(function(l){
      var inner=ico(l.icono||'page')+'<span>'+esc(l.titulo)+'</span>';
      if(l===actual)h+='<a class="nv on" href="'+esc(LECC+l.archivo)+'" aria-current="page" data-id="'+esc(l.id)+'">'+inner+'</a>';
      else if(l.archivo)h+='<a class="nv" href="'+esc(LECC+l.archivo)+'" data-id="'+esc(l.id)+'">'+inner+'</a>';
      else h+='<span class="nv soon" aria-disabled="true">'+inner+'<em>Pronto</em></span>';
    });
  });
  h+='</nav></div>'+
    '<div class="tabp" role="tabpanel" id="pn-apuntes" aria-labelledby="tab-apuntes" hidden>'+
      '<div class="grp">Documentos</div>'+
      '<ul class="docs" id="docsLista"></ul>'+
      '<div class="grp">Notas de las lecciones</div>'+
      '<ul class="notas" id="notasLista"></ul>'+
      '<p class="side-txt">Todo se guarda en este dispositivo.</p>'+
    '</div>'+
    '<div class="tabp" role="tabpanel" id="pn-comunidad" aria-labelledby="tab-comunidad" hidden>'+
      '<p class="side-txt">Aquí podrás publicar tus temas, explorar los de otros estudiantes y guardar una copia en tus apuntes para editarla.</p>'+
      '<p class="side-txt side-soon"><b>Pronto:</b> llega cuando OneLearn tenga cuentas.</p>'+
    '</div>'+
    '<div class="side-foot">'+
      '<button class="nv" type="button" id="sideLectura"><span class="ico-txt" aria-hidden="true">Aa</span><span>Lectura</span></button>'+
      '<button class="nv" type="button" id="sideDatos">'+ico('datos')+'<span>Tus datos</span></button>'+
      (ES_INICIO?'':
        '<button class="nv" type="button" id="sideZen">'+ico('zen')+'<span>Modo zen</span><kbd>Z</kbd></button>'+
        '<button class="nv solo-teclado" type="button" id="sideAtajos">'+ico('teclado')+'<span>Atajos de teclado</span><kbd>?</kbd></button>')+
    '</div>';
  $('#side').innerHTML=h+'</div>';

  $('#topbar').innerHTML=
    '<button class="icon-btn" id="menuBtn" type="button" aria-label="Abrir lecciones" aria-expanded="false" aria-controls="side">'+ico('menu')+'</button>'+
    '<nav class="crumbs" aria-label="Ruta">'+(grupo?'<span>'+esc(grupo)+'</span><span class="sep" aria-hidden="true">/</span>':'')+
    '<span class="cur" aria-current="page">'+esc(actual.titulo)+'</span></nav>'+
    (ES_INICIO?'':'<button class="icon-btn zen-btn" id="zenBtn" type="button" aria-label="Modo zen (Z)" title="Modo zen (Z)" aria-pressed="false">'+ico('zen')+'</button>')+
    '<button class="aa-btn" id="aaBtn" type="button" aria-label="Lectura: tamaño de texto, tema y contraste" title="Lectura" aria-expanded="false" aria-controls="lectura">Aa</button>';

  var nx=$('#siguiente');
  if(nx){
    var sig=orden[orden.indexOf(actual)+1];
    if(!sig)nx.remove();
    else if(sig.archivo)nx.outerHTML='<a class="next" href="'+esc(sig.archivo)+'">'+ico('page')+'<span>Siguiente lección: '+esc(sig.titulo)+'</span></a>';
    else nx.outerHTML='<div class="next">'+ico('page')+'<span>Siguiente lección: '+esc(sig.titulo)+'</span><em>Pronto</em></div>';
  }

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
  var lab=desk?(collapsed()?'Expandir barra lateral':'Contraer barra lateral'):'Abrir lecciones';
  var sideLab=desk?'Contraer barra lateral':'Cerrar lecciones';
  menuBtn.setAttribute('aria-expanded',exp?'true':'false');
  menuBtn.setAttribute('aria-label',lab);
  menuBtn.setAttribute('title',lab);
  sideBtn.setAttribute('aria-label',sideLab);
  sideBtn.setAttribute('title',sideLab);
}
/* En celular el menú es un panel modal: mientras está abierto, el resto de la página
   queda inerte (sin foco ni clics) y el foco se mueve al panel; al cerrar vuelve al botón. */
function setNav(open){
  var was=navOpen();
  document.body.classList.toggle('nav-open',open);
  var modal=open&&!isDesk();
  if(mainEl)mainEl.toggleAttribute('inert',modal);
  var sheetEl=$('#sheet');
  if(sheetEl)sheetEl.toggleAttribute('inert',modal);
  syncMenu();
  if(modal&&!was){
    var f=$('.tabp:not([hidden]) .nv.on',sideEl)||$('.tab[aria-selected="true"]',sideEl)||sideBtn;
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
  if(isDesk())setSide(false);
  else setNav(false);
});
$('#scrim').addEventListener('click',function(){setNav(false)});
sideEl.addEventListener('click',function(e){
  /* Tocar la lección actual solo cierra el menú, no recarga la página */
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

/* ---------- Pestañas de la barra lateral: Temas, Mis apuntes y Comunidad ---------- */
(function(){
  var aj=AT.ajustes,tabs=$$('.tab',sideEl),lista=$('#notasLista',sideEl);
  function elegir(nombre,foco){
    tabs.forEach(function(t){
      var on=t.id==='tab-'+nombre;
      t.setAttribute('aria-selected',on?'true':'false');
      t.tabIndex=on?0:-1;
      $('#'+t.getAttribute('aria-controls')).hidden=!on;
      if(on&&foco)t.focus();
    });
    if(nombre==='apuntes')pintarNotas();
  }
  tabs.forEach(function(t){
    t.addEventListener('click',function(){aj.set('pestana',t.id.slice(4));elegir(t.id.slice(4))});
  });
  /* Flechas, Inicio y Fin mueven entre pestañas (patrón de pestañas de WAI-ARIA) */
  $('.tabs',sideEl).addEventListener('keydown',function(e){
    var i=tabs.indexOf(document.activeElement),n=tabs.length,j=-1;
    if(i<0)return;
    if(e.key==='ArrowRight'||e.key==='ArrowDown')j=(i+1)%n;
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp')j=(i-1+n)%n;
    else if(e.key==='Home')j=0;
    else if(e.key==='End')j=n-1;
    if(j<0)return;
    e.preventDefault();
    var nombre=tabs[j].id.slice(4);
    aj.set('pestana',nombre);
    elegir(nombre,true);
  });

  /* Mis apuntes: una tarjeta por lección con nota (las notas vienen de AT.datos, en IndexedDB) */
  /* Se dibuja al instante con las notas ya cargadas y después se confirma con la base;
     si no cambió nada, no se toca la lista (así no se pierde el foco) */
  var pintando=0,cache=null,ultimo='',docsCache=null,ultimoDocs='',listaDocs=$('#docsLista',sideEl);
  function pintarNotas(){
    if(cache)pintarNotasCon(cache);
    if(docsCache)pintarDocsCon(docsCache);
    var n0=++pintando;
    Promise.all([AT.datos.notas.todas(),AT.datos.documentos.todos()]).then(function(r){
      cache=r[0];docsCache=r[1];
      if(n0===pintando&&!$('#pn-apuntes').hidden){pintarNotasCon(r[0]);pintarDocsCon(r[1])}
    });
  }
  Promise.all([AT.datos.notas.todas(),AT.datos.documentos.todos()]).then(function(r){if(!cache)cache=r[0];if(!docsCache)docsCache=r[1]});
  /* Documentos: los más recientes primero; el que está abierto, marcado */
  function pintarDocsCon(docs){
    var abierto=AT.documentoAbierto||'';
    docs=docs.slice().sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:(b.editado||'')>(a.editado||'')?1:0});
    var h=docs.map(function(d){
      var aqui=d.id===abierto,tipo=AT.tiposDoc&&AT.tiposDoc[d.tipo];
      return '<li><a class="nv doc'+(aqui?' on':'')+'" href="'+RAIZ+'documento.html?id='+encodeURIComponent(d.id)+'"'+(aqui?' aria-current="page"':'')+'>'+
        ico(tipo?tipo.icono:'page')+'<span>'+esc(d.titulo||'Sin título')+'</span></a></li>';
    }).join('');
    h=h||'<li class="side-txt">Todavía no creas documentos. Toca «Crear» para empezar una libreta o unas notas.</li>';
    if(h!==ultimoDocs){listaDocs.innerHTML=h;ultimoDocs=h}
  }
  function pintarNotasCon(notas){
    var h='',porId={};
    notas.forEach(function(x){porId[x.id]=x.texto||''});
    catalogo.forEach(function(g){
      g.lecciones.forEach(function(l){
        if(!l.archivo)return;
        var t=porId[l.id]||'';
        if(!t.trim())return;
        var linea=t.trim().split(/\n/)[0].trim(),n=AT.contarPalabras(t),aqui=l===actual;
        if(linea.length>90)linea=linea.slice(0,90)+'…';
        h+='<li><a class="nota'+(aqui?' on':'')+'" href="'+esc(LECC+l.archivo)+'#apuntes"'+(aqui?' data-aqui="1"':'')+'>'+
          '<b>'+esc(l.titulo)+'</b><span>'+esc(linea)+'</span><small>'+(n===1?'1 palabra':n+' palabras')+'</small></a></li>';
      });
    });
    h=h||'<li class="side-txt">Todavía no tienes apuntes. Abre una lección y toca «Apuntes», abajo, para escribir.</li>';
    if(h!==ultimo){lista.innerHTML=h;ultimo=h}
  }
  lista.addEventListener('click',function(e){
    var a=e.target.closest('a[data-aqui]');
    if(!a)return;
    /* La nota de esta misma lección: se abre sin recargar */
    e.preventDefault();
    setNav(false);
    if(AT.hoja)AT.hoja.abrir();
  });
  var espera=null;
  AT.refrescarNotas=function(){clearTimeout(espera);espera=setTimeout(function(){if(!$('#pn-apuntes').hidden)pintarNotas()},400)};
  AT.datos.on(function(c){if(c.almacen==='notas'||c.almacen==='documentos'||c.almacen==='*')AT.refrescarNotas()});

  $('#sideLectura').addEventListener('click',function(){setNav(false);AT.lectura.abrir()});
  elegir(aj.get('pestana'));
})();
})();
