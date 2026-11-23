/* OneBook: barra lateral, barra superior y navegación.
   Arma la barra lateral (Inicio, pestañas Temas / Mis apuntes / Comunidad, Lectura y Modo zen),
   la barra superior y el enlace a la siguiente lección a partir de AT.catalogo; maneja el menú en celular
   (panel modal con trampa de foco), la barra contraída en escritorio y las pestañas.
   Los grupos del temario se pliegan; se recuerda cuáles dejaste abiertos (aprende-tecnologia:grupos).
   Sin el módulo de estudio (perfil.js), la barra deja solo Inicio, Crear, Buscar y «Tus páginas», sin pestañas,
   temario, rutas ni proyectos.
   Expone AT.setNav, AT.esEscritorio y AT.refrescarNotas. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,reduce=AT.reduce;
var R=AT.rutas,RAIZ=R.raiz,LECC=R.lecciones,ES_INICIO=R.esInicio;
var catalogo=AT.catalogo||[],actual=AT.leccion;
var grupo=AT.grupoActual,orden=AT.orden;
/* ¿Se ve lo de estudio? (lecciones, rutas, proyectos, notas y marcadores) */
var EST=!AT.perfil||AT.perfil.tiene('estudio');
var MENU=EST?'lecciones':'menú';

/* ---------- Grupos plegables del temario ---------- */
var CLAVE_GRUPOS='aprende-tecnologia:grupos';
function slugGrupo(n){return String(n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
/* null si nunca has abierto o cerrado un grupo */
function gruposAbiertos(){
  try{var v=JSON.parse(localStorage.getItem(CLAVE_GRUPOS));return Array.isArray(v)?v:null}catch(e){return null}
}
function guardarGrupos(){
  var v=$$('.grp-btn',$('#side')).filter(function(b){return b.getAttribute('aria-expanded')==='true'}).map(function(b){return b.getAttribute('data-grupo')});
  try{localStorage.setItem(CLAVE_GRUPOS,JSON.stringify(v))}catch(e){}
}

/* ---------- Estructura: barra lateral, barra superior y siguiente lección ---------- */
(function(){
  var h='<div class="side-in"><div class="ws"><a class="brand" href="'+RAIZ+'inicio.html"><svg class="brand-mk" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14"/><path d="M18.5 22.5 27.5 16v32M27.5 16h8a7.5 7.5 0 0 1 0 15h-8M27.5 31h9.5a8.5 8.5 0 0 1 0 17h-9.5"/></svg><span>One<b>Book</b></span></a>'+
    '<button class="side-btn" id="sideBtn" type="button" aria-label="Contraer barra lateral" title="Contraer barra lateral">'+ico('chev-l','side-ic-c')+ico('close','side-ic-x')+'</button></div>'+
    '<a class="nv'+(ES_INICIO?' on" aria-current="page':'')+'" href="'+RAIZ+'inicio.html">'+ico('home')+'<span>Inicio</span></a>'+
    '<button class="nv nv-crear" type="button" id="sideCrear" aria-haspopup="dialog">'+ico('crear')+'<span>Crear</span></button>'+
    '<button class="nv" type="button" id="sideBuscar" aria-haspopup="dialog">'+ico('investigacion')+'<span>Buscar</span><kbd class="solo-teclado">Ctrl K</kbd></button>'+
    '';
  if(EST)h+='<a class="nv'+(R.pagina==='rutas'?' on" aria-current="page':'')+'" href="'+RAIZ+'rutas.html" id="sideRutas">'+ico('ruta')+'<span>Rutas</span></a>'+
    '<a class="nv'+(R.pagina==='proyectos'||R.pagina==='proyecto'?' on" aria-current="page':'')+'" href="'+RAIZ+'proyectos/index.html" id="sideProyectos">'+ico('proyecto')+'<span>Proyectos</span></a>'+
    '<div class="tabs" role="tablist" aria-label="Secciones">'+
      '<button class="tab" type="button" role="tab" id="tab-temas" aria-controls="pn-temas">Temas</button>'+
      '<button class="tab" type="button" role="tab" id="tab-apuntes" aria-controls="pn-apuntes">Mis apuntes</button>'+
      '<button class="tab" type="button" role="tab" id="tab-comunidad" aria-controls="pn-comunidad">Comunidad</button>'+
    '</div>'+
    '<div class="tabp" role="tabpanel" id="pn-temas" aria-labelledby="tab-temas"><nav aria-label="Temas">';
  /* Cada grupo se pliega para que la barra no crezca sin fin al agregar temas.
     Abiertos: el grupo de la página actual y los que dejaste abiertos. La primera vez, fuera de una lección,
     solo el primer grupo con lecciones publicadas. */
  var abiertos=gruposAbiertos(),primero=null;
  if(EST)catalogo.some(function(g){if(g.lecciones.some(function(l){return l.archivo})){primero=g;return true}});
  if(EST)catalogo.forEach(function(g){
    var id=slugGrupo(g.grupo),listas=g.lecciones.filter(function(l){return l.archivo}).length;
    var abierto=g.grupo===grupo||(abiertos?abiertos.indexOf(id)>=0:!grupo&&g===primero);
    var cuenta=listas?'<em aria-hidden="true">'+listas+'/'+g.lecciones.length+'</em><span class="vh">, '+listas+' de '+g.lecciones.length+' lecciones disponibles</span>':
      '<em>Pronto</em>';
    h+='<div class="grp-s"><button class="grp grp-btn" type="button" id="grpb-'+id+'" data-grupo="'+id+'" aria-expanded="'+abierto+'" aria-controls="grp-'+id+'">'+
      ico('chev-l','grp-ic')+'<span>'+esc(g.grupo)+'</span>'+cuenta+'</button>'+
      '<div class="grp-l" id="grp-'+id+'" role="group" aria-labelledby="grpb-'+id+'"'+(abierto?'':' hidden')+'>';
    g.lecciones.forEach(function(l){
      var inner=ico(l.icono||'page')+'<span>'+esc(l.titulo)+'</span>';
      if(l===actual)h+='<a class="nv on" href="'+esc(LECC+l.archivo)+'" aria-current="page" data-id="'+esc(l.id)+'">'+inner+'</a>';
      else if(l.archivo)h+='<a class="nv" href="'+esc(LECC+l.archivo)+'" data-id="'+esc(l.id)+'">'+inner+'</a>';
      else h+='<span class="nv soon" aria-disabled="true">'+inner+'<em>Pronto</em></span>';
    });
    h+='</div></div>';
  });
  if(EST)h+='</nav></div>'+
    '<div class="tabp" role="tabpanel" id="pn-apuntes" aria-labelledby="tab-apuntes" hidden>'+
      '<div class="grp">Documentos</div>'+
      '<ul class="docs" id="docsLista"></ul>'+
      '<div class="grp">Notas de las lecciones</div>'+
      '<ul class="notas" id="notasLista"></ul>'+
      '<div class="grp">Marcadores</div>'+
      '<ul class="docs marcs" id="marcLista"></ul>'+
      '<p class="side-txt">Todo se guarda en este dispositivo.</p>'+
    '</div>'+
    '<div class="tabp" role="tabpanel" id="pn-comunidad" aria-labelledby="tab-comunidad" hidden>'+
      '<p class="side-txt">Aquí podrás publicar tus temas, explorar los de otros estudiantes y guardar una copia en tus apuntes para editarla.</p>'+
      '<p class="side-txt side-soon"><b>Pronto:</b> llega cuando OneBook tenga cuentas.</p>'+
    '</div>';
  /* Sin estudio: solo tus páginas, sin pestañas */
  else h+='<div class="tabp" id="pn-apuntes"><div class="grp">Tus páginas</div><ul class="docs" id="docsLista"></ul>'+
      '<p class="side-txt">Todo se guarda en este dispositivo.</p></div>';
  h+='<div class="side-foot">'+
      '<button class="nv" type="button" id="sideLectura"><span class="ico-txt" aria-hidden="true">Aa</span><span>Lectura</span></button>'+
      '<button class="nv" type="button" id="sideDatos">'+ico('datos')+'<span>Tus datos</span></button>'+
      (EST?'<a class="nv'+(R.pagina==='acerca'?' on" aria-current="page':'')+'" href="'+RAIZ+'acerca.html">'+ico('codigo')+'<span>Cómo está hecho</span></a>':'')+
      (ES_INICIO?'':
        '<button class="nv" type="button" id="sideZen">'+ico('zen')+'<span>Modo zen</span><kbd>Z</kbd></button>'+
        '<button class="nv solo-teclado" type="button" id="sideAtajos">'+ico('teclado')+'<span>Atajos de teclado</span><kbd>?</kbd></button>')+
    '</div>';
  $('#side').innerHTML=h+'</div>';
  if(!EST)$('#side').setAttribute('aria-label','Navegación');

  $('#topbar').innerHTML=
    '<button class="icon-btn" id="menuBtn" type="button" aria-label="Abrir '+MENU+'" aria-expanded="false" aria-controls="side">'+ico('menu')+'</button>'+
    '<nav class="crumbs" aria-label="Ruta">'+(grupo?'<span>'+esc(grupo)+'</span><span class="sep" aria-hidden="true">/</span>':'')+
    '<span class="cur" aria-current="page">'+esc(actual.titulo)+'</span></nav>'+
    (ES_INICIO?'':'<button class="icon-btn zen-btn" id="zenBtn" type="button" aria-label="Modo zen (Z)" title="Modo zen (Z)" aria-pressed="false">'+ico('zen')+'</button>')+
    '<button class="aa-btn" id="aaBtn" type="button" aria-label="Lectura: tamaño de texto, tema y contraste" title="Lectura" aria-expanded="false" aria-controls="lectura">Aa</button>';

  var nx=$('#siguiente');
  if(nx){
    var sig=orden[orden.indexOf(actual)+1];
    /* Al final del temario, en lugar de «Siguiente lección», un cierre que regresa al inicio */
    if(!sig)nx.outerHTML='<a class="next" href="'+RAIZ+'inicio.html">'+ico('home')+'<span>Terminaste todo el temario. Volver al inicio</span></a>';
    else if(sig.archivo)nx.outerHTML='<a class="next" href="'+esc(sig.archivo)+'">'+ico('page')+'<span>Siguiente lección: '+esc(sig.titulo)+'</span></a>';
    else nx.outerHTML='<div class="next">'+ico('page')+'<span>Siguiente lección: '+esc(sig.titulo)+'</span><em>Pronto</em></div>';
    /* Si la lección es parte de una ruta, se dice en qué módulo está y cuál sigue en la ruta (si no es la misma) */
    var cm=AT.caminoDe(actual.id);
    if(cm){
      var lista=[];cm.camino.modulos.forEach(function(m){(m.lecciones||[]).forEach(function(id){lista.push(id)})});
      var porId={};orden.forEach(function(l){porId[l.id]=l});
      var sigR=porId[lista[lista.indexOf(actual.id)+1]];
      var h='<div class="ruta-nota">'+ico('ruta','ruta-nota-ic')+'<div><p>Parte de la ruta <a href="'+RAIZ+'rutas.html#'+esc(cm.camino.id)+'">'+esc(cm.camino.titulo)+'</a> · Módulo '+cm.n+': '+esc(cm.modulo.titulo)+'</p>';
      if(sigR&&sigR!==sig)h+=sigR.archivo?'<p><a href="'+esc(sigR.archivo)+'">Siguiente en la ruta: '+esc(sigR.titulo)+'</a></p>':'<p>Siguiente en la ruta: '+esc(sigR.titulo)+' <em>(pronto)</em></p>';
      /* Va antes del enlace a la siguiente lección, que siempre queda al final de la página */
      var fin=$('.page > .next');
      if(fin)fin.insertAdjacentHTML('beforebegin',h+'</div></div>');else $('.page').insertAdjacentHTML('beforeend',h+'</div></div>');
    }
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
  var lab=desk?(collapsed()?'Expandir barra lateral':'Contraer barra lateral'):'Abrir '+MENU;
  var sideLab=desk?'Contraer barra lateral':'Cerrar '+MENU;
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
  var g=e.target.closest('.grp-btn');
  if(g){
    var abrir=g.getAttribute('aria-expanded')!=='true';
    g.setAttribute('aria-expanded',abrir?'true':'false');
    $('#'+g.getAttribute('aria-controls'),sideEl).hidden=!abrir;
    guardarGrupos();
    return;
  }
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
  if(tabs.length)$('.tabs',sideEl).addEventListener('keydown',function(e){
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
  var marcCache=null,ultimoMarc='',listaMarc=$('#marcLista',sideEl);
  function pintarNotas(){
    if(cache)pintarNotasCon(cache);
    if(docsCache)pintarDocsCon(docsCache);
    if(marcCache)pintarMarcCon(marcCache);
    var n0=++pintando;
    Promise.all([AT.datos.notas.todas(),AT.datos.documentos.todos(),AT.datos.marcadores.todos()]).then(function(r){
      cache=r[0];docsCache=r[1];marcCache=r[2];
      if(n0===pintando&&!$('#pn-apuntes').hidden){pintarNotasCon(r[0]);pintarDocsCon(r[1]);pintarMarcCon(r[2])}
    });
  }
  Promise.all([AT.datos.notas.todas(),AT.datos.documentos.todos(),AT.datos.marcadores.todos()]).then(function(r){if(!cache)cache=r[0];if(!docsCache)docsCache=r[1];if(!marcCache)marcCache=r[2]});
  /* Marcadores: los más nuevos primero, con un botón para quitarlos */
  function pintarMarcCon(ms){
    if(!listaMarc)return;
    var h=htmlMarc(ms);
    if(h!==ultimoMarc){listaMarc.innerHTML=h;ultimoMarc=h}
  }
  function htmlMarc(ms){
    ms=ms.slice().sort(function(a,b){return (b.creado||'')<(a.creado||'')?-1:(b.creado||'')>(a.creado||'')?1:0});
    var h=ms.map(function(m){
      return '<li class="marc-li"><a class="nv marc" href="'+esc(RAIZ+m.url+'#'+m.bloque)+'">'+ico('marcador')+'<span><b>'+esc(m.texto)+'</b><small>'+esc(m.docTitulo)+'</small></span></a>'+
        '<button type="button" class="marc-x" data-marc="'+esc(m.id)+'" aria-label="Quitar el marcador «'+esc(m.texto.slice(0,60))+'»" title="Quitar marcador">'+ico('close')+'</button></li>';
    }).join('');
    return h||'<li class="side-txt">Guarda bloques de las lecciones con el botón de marcador que aparece a su lado, o con la tecla M.</li>';
  }
  if(listaMarc)listaMarc.addEventListener('click',function(e){
    var x=e.target.closest('.marc-x');
    if(x){
      var li=x.closest('li'),sig=li.nextElementSibling||li.previousElementSibling,mid=x.getAttribute('data-marc');
      AT.datos.marcadores.borrar(mid).then(function(){
        /* Se quita de la lista aquí mismo, para que el foco pase al vecino sin redibujar todo */
        marcCache=(marcCache||[]).filter(function(m){return m.id!==mid});
        li.remove();
        if(!marcCache.length){pintarMarcCon(marcCache);$('#tab-apuntes').focus();return}
        ultimoMarc=htmlMarc(marcCache);
        var f=sig&&$('.marc',sig);
        if(f)f.focus();
      });
      return;
    }
    var a=e.target.closest('a.marc');
    if(!a)return;
    /* Un marcador de esta misma página: solo se va al bloque */
    var u=new URL(a.href,location.href);
    if(u.pathname===location.pathname&&u.hash){
      var b=document.getElementById(decodeURIComponent(u.hash.slice(1)));
      if(b){
        e.preventDefault();setNav(false);
        history.replaceState(null,'',u.hash);
        if(b.tagName==='DETAILS')b.open=true;
        b.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
        b.classList.remove('llegada');void b.offsetWidth;b.classList.add('llegada');
      }
    }
  });
  /* Documentos: los más recientes primero; el que está abierto, marcado */
  function pintarDocsCon(docs){
    var abierto=AT.documentoAbierto||'';
    docs=docs.slice().sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:(b.editado||'')>(a.editado||'')?1:0});
    var h=docs.map(function(d){
      var aqui=d.id===abierto,tipo=AT.tiposDoc&&AT.tiposDoc[d.tipo];
      return '<li><a class="nv doc'+(aqui?' on':'')+'" href="'+RAIZ+'documento.html?id='+encodeURIComponent(d.id)+'"'+(aqui?' aria-current="page"':'')+'>'+
        ico(tipo?tipo.icono:'page')+'<span>'+esc(d.titulo||'Sin título')+'</span></a></li>';
    }).join('');
    h=h||'<li class="side-txt">'+(EST?'Todavía no creas documentos. Toca «Crear» para empezar una libreta o unas notas.':'Todavía no tienes páginas. Toca «Crear» para empezar.')+'</li>';
    if(h!==ultimoDocs){listaDocs.innerHTML=h;ultimoDocs=h}
  }
  function pintarNotasCon(notas){
    if(!lista)return;
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
  if(lista)lista.addEventListener('click',function(e){
    var a=e.target.closest('a[data-aqui]');
    if(!a)return;
    /* La nota de esta misma lección: se abre sin recargar */
    e.preventDefault();
    setNav(false);
    if(AT.hoja)AT.hoja.abrir();
  });
  var espera=null;
  AT.refrescarNotas=function(){clearTimeout(espera);espera=setTimeout(function(){if(!$('#pn-apuntes').hidden)pintarNotas()},400)};
  AT.datos.on(function(c){if(c.almacen==='notas'||c.almacen==='documentos'||c.almacen==='marcadores'||c.almacen==='*')AT.refrescarNotas()});

  $('#sideLectura').addEventListener('click',function(){setNav(false);AT.lectura.abrir()});
  /* Sin pestañas (sin el módulo de estudio), la lista de páginas siempre está a la vista */
  if(tabs.length)elegir(aj.get('pestana'));else pintarNotas();
})();
})();
