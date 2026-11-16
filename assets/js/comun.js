/* OneLearn: lógica compartida por todas las lecciones.
   Arma la barra lateral, la barra superior y la hoja de apuntes a partir de AT.catalogo
   y del atributo data-leccion del <body>; maneja el tema y la navegación; y expone
   utilidades (AT.$, AT.fmt, AT.repaso, ...) para el script propio de cada lección.
   Se usan scripts clásicos con un espacio de nombres global (no módulos ES) para que
   las páginas también funcionen abiertas directamente desde el disco (file://). */
(function(){
'use strict';
var AT=window.AT=window.AT||{};

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
'</svg>');

/* ---------- Lección actual ---------- */
var catalogo=AT.catalogo||[];
var LID=document.body.getAttribute('data-leccion')||'';
var actual=null,grupo='',orden=[];
catalogo.forEach(function(g){
  g.lecciones.forEach(function(l){
    orden.push(l);
    if(l.id===LID){actual=l;grupo=g.grupo}
  });
});
if(!actual)actual={id:LID||'leccion',titulo:document.title};
AT.leccion=actual;

/* ---------- Estructura: barra lateral, barra superior, siguiente lección y apuntes ---------- */
(function(){
  var h='<div class="side-in"><div class="ws"><a class="brand" href="../index.html">One<b>Learn</b></a>'+
    '<button class="side-btn" id="sideBtn" type="button" aria-label="Contraer barra lateral" title="Contraer barra lateral">'+ico('chev-l','side-ic-c')+ico('close','side-ic-x')+'</button></div><nav>';
  catalogo.forEach(function(g){
    h+='<div class="grp">'+esc(g.grupo)+'</div>';
    g.lecciones.forEach(function(l){
      var inner=ico(l.icono||'page')+'<span>'+esc(l.titulo)+'</span>';
      if(l===actual)h+='<a class="nv on" href="'+esc(l.archivo)+'" aria-current="page">'+inner+'</a>';
      else if(l.archivo)h+='<a class="nv" href="'+esc(l.archivo)+'">'+inner+'</a>';
      else h+='<span class="nv soon" aria-disabled="true">'+inner+'<em>Pronto</em></span>';
    });
  });
  $('#side').innerHTML=h+'</nav></div>';

  $('#topbar').innerHTML=
    '<button class="icon-btn" id="menuBtn" type="button" aria-label="Abrir lecciones" aria-expanded="false" aria-controls="side">'+ico('menu')+'</button>'+
    '<nav class="crumbs" aria-label="Ruta">'+(grupo?'<span>'+esc(grupo)+'</span><span class="sep" aria-hidden="true">/</span>':'')+
    '<span class="cur" aria-current="page">'+esc(actual.titulo)+'</span></nav>'+
    '<button class="aa-btn" id="aaBtn" type="button" aria-label="Lectura: tamaño de texto, tema y contraste" title="Lectura" aria-expanded="false" aria-controls="lectura">Aa</button>';

  var nx=$('#siguiente');
  if(nx){
    var sig=orden[orden.indexOf(actual)+1];
    if(!sig)nx.remove();
    else if(sig.archivo)nx.outerHTML='<a class="next" href="'+esc(sig.archivo)+'">'+ico('page')+'<span>Siguiente lección: '+esc(sig.titulo)+'</span></a>';
    else nx.outerHTML='<div class="next">'+ico('page')+'<span>Siguiente lección: '+esc(sig.titulo)+'</span><em>Pronto</em></div>';
  }

  var t=esc(actual.titulo);
  document.body.insertAdjacentHTML('beforeend',
    '<div class="scrim" id="scrim"></div>'+
    '<section class="sheet" id="sheet" data-state="closed" aria-label="Apuntes de la lección">'+
      '<div class="sh-grab" id="shGrab"><div class="sh-in">'+
        '<span class="sh-handle" aria-hidden="true"></span>'+
        '<div class="sh-row">'+ico('note','sh-ic')+'<span class="sh-title">Apuntes</span><span class="tag sh-lesson">'+t+'</span>'+
          '<span class="sh-hint" id="shHint"></span><span class="sh-sp"></span>'+
          '<button class="sh-btn" id="shMain" type="button" aria-label="Abrir apuntes">'+ico('up','','shMainUse')+'</button>'+
          '<button class="sh-btn" id="shHide" type="button" aria-label="Ocultar apuntes" hidden>'+ico('down')+'</button>'+
        '</div>'+
      '</div></div>'+
      '<div class="sh-body"><div class="sh-in">'+
        '<textarea class="sh-ta" id="notes" lang="es" aria-label="Apuntes de '+t+'" placeholder="Escribe aquí tus apuntes de esta lección. Se guardan solos."></textarea>'+
      '</div></div>'+
      '<div class="sh-foot"><div class="sh-in">'+
        '<div class="sh-meta"><span class="sh-cnt" id="nCnt"></span><span class="sh-stat" id="nStat" aria-live="polite"></span></div>'+
        '<button class="btn" id="nCopy" type="button">Copiar</button>'+
        '<button class="btn" id="nClear" type="button">Borrar</button>'+
      '</div></div>'+
    '</section>');
})();

/* ---------- Panel Lectura: tamaño de texto, tema, contraste, fuente y espacios ----------
   Los valores viven en AT.ajustes (assets/js/ajustes.js); este panel solo los muestra y los cambia. */
(function(){
  var aj=AT.ajustes,btn=$('#aaBtn'),ESC=aj.opciones.escala;
  var GRUPOS=[
    {k:'tema',t:'Tema',o:[['auto','Automático'],['light','Claro'],['dark','Oscuro']]},
    {k:'contraste',t:'Contraste',o:[['auto','Según el sistema'],['normal','Normal'],['high','Alto']]},
    {k:'fuente',t:'Fuente',o:[['normal','IBM Plex',"'IBM Plex Sans'"],['atkinson','Atkinson',"'Atkinson Hyperlegible'"],['opendyslexic','OpenDyslexic',"'OpenDyslexic'"]]},
    {k:'espaciado',t:'Espacio entre letras',o:[['normal','Normal'],['amplio','Amplio']]},
    {k:'interlineado',t:'Interlineado',o:[['normal','Normal'],['amplio','Amplio']]},
    {k:'ancho',t:'Ancho de columna',o:[['estrecho','Estrecho'],['normal','Normal'],['amplio','Amplio']]}
  ];
  var h='<div class="lec-h"><h2 id="lecT">Lectura</h2><button class="lec-x" type="button" id="lecX" aria-label="Cerrar Lectura">'+ico('close')+'</button></div>'+
    '<div class="lec-g"><span class="lec-l" id="lec-escala">Tamaño de texto</span>'+
    '<div class="lec-size" role="group" aria-labelledby="lec-escala">'+
      '<button type="button" data-paso="-1" aria-label="Texto más pequeño">A−</button>'+
      '<output id="lecEsc" aria-live="polite"></output>'+
      '<button type="button" data-paso="1" aria-label="Texto más grande">A+</button>'+
    '</div></div>';
  GRUPOS.forEach(function(g){
    h+='<div class="lec-g"><span class="lec-l" id="lec-'+g.k+'">'+g.t+'</span>'+
      '<div class="seg" role="group" aria-labelledby="lec-'+g.k+'" data-k="'+g.k+'">'+
      g.o.map(function(o){
        /* Cada botón de fuente se dibuja con su propia fuente, como muestra */
        return '<button type="button" data-v="'+o[0]+'" aria-pressed="false"'+(o[2]?' style="font-family:'+o[2]+',sans-serif"':'')+'>'+o[1]+'</button>';
      }).join('')+'</div>'+
      (g.k==='contraste'?'<p class="lec-nota" id="lecCon"></p>':'')+
      '</div>';
  });
  h+='<div class="lec-f"><p class="lec-nota">Se guarda en este dispositivo.</p><button class="btn" type="button" id="lecReset">Restablecer</button></div>';
  var panel=document.createElement('div');
  panel.className='lec';panel.id='lectura';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','lecT');
  panel.innerHTML=h;
  /* Justo después de la barra superior: con Tab, se llega al panel desde «Aa» */
  $('#topbar').after(panel);
  var menos=$('[data-paso="-1"]',panel),mas=$('[data-paso="1"]',panel),reset=$('#lecReset',panel),con=$('#lecCon',panel);

  /* Los botones que no aplican se marcan con aria-disabled, no con disabled,
     para que el foco no se pierda al llegar al límite */
  function dis(b,v){b.setAttribute('aria-disabled',v?'true':'false')}
  function pintar(){
    var e=aj.get('escala'),i=ESC.indexOf(e);
    $('#lecEsc',panel).textContent=Math.round(e*100)+'%';
    dis(menos,i<=0);dis(mas,i>=ESC.length-1);
    $$('.seg',panel).forEach(function(sg){
      var v=aj.get(sg.getAttribute('data-k'));
      $$('button',sg).forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-v')===v?'true':'false')});
    });
    con.hidden=aj.get('contraste')!=='auto';
    con.textContent=aj.sistemaPideContraste()?'Tu sistema pide más contraste, así que el alto contraste está activo.':'El alto contraste se activa solo si tu sistema lo pide.';
    dis(reset,aj.esInicial());
  }
  panel.addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    if(b.id==='lecX'){cerrar(true);return}
    if(b.getAttribute('aria-disabled')==='true')return;
    if(b===reset){aj.restablecer();return}
    var paso=b.getAttribute('data-paso');
    if(paso){aj.set('escala',ESC[ESC.indexOf(aj.get('escala'))+(+paso)]);return}
    var sg=b.closest('.seg');
    if(sg)aj.set(sg.getAttribute('data-k'),b.getAttribute('data-v'));
  });
  function abrir(){
    setNav(false);
    pintar();
    panel.hidden=false;
    btn.setAttribute('aria-expanded','true');
    menos.focus({preventScroll:true});
  }
  function cerrar(devolverFoco){
    if(panel.hidden)return;
    panel.hidden=true;
    btn.setAttribute('aria-expanded','false');
    if(devolverFoco)btn.focus({preventScroll:true});
  }
  btn.addEventListener('click',function(){if(panel.hidden)abrir();else cerrar(false)});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!panel.hidden){cerrar(panel.contains(document.activeElement));e.stopPropagation()}
  });
  document.addEventListener('pointerdown',function(e){
    if(!panel.hidden&&!panel.contains(e.target)&&!btn.contains(e.target))cerrar(false);
  });
  /* Es un panel no modal: si el foco llega a cualquier otra parte de la página, se cierra */
  document.addEventListener('focusin',function(e){
    if(!panel.hidden&&!panel.contains(e.target)&&e.target!==btn)cerrar(false);
  });
  aj.on(pintar);
  AT.lectura={abrir:abrir,cerrar:cerrar};
})();

/* ---------- Navegación y barra lateral ---------- */
var menuBtn=$('#menuBtn'),sideBtn=$('#sideBtn'),sideEl=$('#side'),mainEl=$('.main'),sheetEl=$('#sheet');
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
  if(sheetEl)sheetEl.toggleAttribute('inert',modal);
  syncMenu();
  if(modal&&!was){
    var f=$('.nv.on',sideEl)||sideBtn;
    f.focus({preventScroll:true});
  }else if(!open&&was&&sideEl.contains(document.activeElement)){
    menuBtn.focus({preventScroll:true});
  }
}
AT.setNav=setNav;
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
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&navOpen())setNav(false)});
function syncViewport(){setNav(false);syncMenu()}
if(deskMq.addEventListener)deskMq.addEventListener('change',syncViewport);
else if(deskMq.addListener)deskMq.addListener(syncViewport);
syncMenu();
$$('[data-go]').forEach(function(b){
  b.addEventListener('click',function(){
    var t=document.getElementById(b.getAttribute('data-go'));
    if(t)t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  });
});

/* ---------- Repaso: AT.repaso({host, score, reset, preguntas}) ----------
   Cada pregunta: {q:'texto', o:['opción',...], a:índiceCorrecto, e:'explicación'} */
AT.repaso=function(opt){
  var qs=opt.preguntas,host=$(opt.host),score=$(opt.score),done=0,ok=0;
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
  });
  if(opt.reset)$(opt.reset).addEventListener('click',build);
  build();
};

/* ---------- Hoja de apuntes ---------- */
(function(){
  var LS_KEY='aprende-tecnologia:apuntes:'+actual.id;
  var LS_PEND=LS_KEY+':pendiente';
  var sheet=sheetEl,grab=$('#shGrab'),mainBtn=$('#shMain'),mainUse=$('#shMainUse'),hideBtn=$('#shHide'),hint=$('#shHint');
  var ta=$('#notes'),cnt=$('#nCnt'),stat=$('#nStat'),copyBtn=$('#nCopy'),clrBtn=$('#nClear');
  var STATES=['closed','half','full'];
  var LABELS={closed:'Abrir apuntes',half:'Ver apuntes en pantalla completa',full:'Reducir apuntes a media página'};
  var ICONS={closed:'#i-up',half:'#i-expand',full:'#i-compress'};
  var st='closed',layH=0,visH=0,kb=0,peek=57,drag=null;

  function lsGet(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}

  /* ----- Altura de la hoja ----- */
  var probe=document.createElement('div');
  probe.style.cssText='position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  function measure(){
    var vv=window.visualViewport;
    layH=window.innerHeight||document.documentElement.clientHeight;
    visH=layH;kb=0;
    if(vv&&vv.scale<=1.01){
      visH=Math.min(layH,Math.round(vv.height));
      kb=Math.max(0,Math.round(layH-vv.height-vv.offsetTop));
      if(kb>layH*0.75){kb=0;visH=layH}
    }
    peek=grab.offsetHeight+1+(parseFloat(getComputedStyle(probe).paddingBottom)||0);
  }
  function target(s){
    if(s==='closed')return peek;
    var full=Math.max(visH,peek+160);
    return s==='full'?full:Math.min(Math.round(layH*0.5),full);
  }
  function apply(s,anim){
    st=s;
    sheet.classList.toggle('anim',!!anim&&!reduce);
    sheet.setAttribute('data-state',s);
    sheet.style.bottom=kb+'px';
    sheet.style.height=target(s)+'px';
    mainBtn.setAttribute('aria-label',LABELS[s]);
    mainUse.setAttribute('href',ICONS[s]);
    hideBtn.hidden=(s==='closed');
  }
  function go(s,anim){
    var was=st;
    if(s!=='closed')setNav(false);
    apply(s,anim!==false);
    if(s==='closed'&&was!=='closed'){
      if(sheet.contains(document.activeElement))mainBtn.focus({preventScroll:true});
      flush();
    }
  }

  /* ----- Arrastre ----- */
  grab.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.target.closest('button'))return;
    measure();
    drag={id:e.pointerId,y0:e.clientY,h0:sheet.getBoundingClientRect().height,from:st,moved:false,pts:[{y:e.clientY,t:e.timeStamp}]};
    try{grab.setPointerCapture(e.pointerId)}catch(x){}
    sheet.classList.remove('anim');
    sheet.classList.add('drag');
  });
  grab.addEventListener('pointermove',function(e){
    if(!drag||e.pointerId!==drag.id)return;
    var dy=drag.y0-e.clientY;
    if(!drag.moved){if(Math.abs(dy)<6)return;drag.moved=true}
    var h=Math.max(peek,Math.min(target('full'),drag.h0+dy));
    sheet.style.height=h+'px';
    drag.pts.push({y:e.clientY,t:e.timeStamp});
    if(drag.pts.length>6)drag.pts.shift();
  });
  function endDrag(e,cancel){
    if(!drag||e.pointerId!==drag.id)return;
    var d=drag;drag=null;
    sheet.classList.remove('drag');
    try{grab.releasePointerCapture(e.pointerId)}catch(x){}
    if(!d.moved){
      if(!cancel)go(st==='half'?'closed':'half');
      return;
    }
    var cur=sheet.getBoundingClientRect().height;
    var hs=[target('closed'),target('half'),target('full')];
    var a=d.pts[0],b=d.pts[d.pts.length-1];
    var v=b.t>a.t?(a.y-b.y)/(b.t-a.t):0;
    var ni=0,best=1e9,k;
    for(k=0;k<3;k++){var dd=Math.abs(hs[k]-cur);if(dd<best){best=dd;ni=k}}
    var from=STATES.indexOf(d.from),i=ni;
    /* Un empujón rápido avanza al menos un nivel en esa dirección */
    if(v>0.4)i=Math.max(ni,Math.min(2,from+1));
    else if(v<-0.4)i=Math.min(ni,Math.max(0,from-1));
    go(STATES[i]);
  }
  grab.addEventListener('pointerup',function(e){endDrag(e,false)});
  grab.addEventListener('pointercancel',function(e){endDrag(e,true)});

  mainBtn.addEventListener('click',function(){go(st==='closed'?'half':(st==='half'?'full':'half'))});
  hideBtn.addEventListener('click',function(){go('closed')});
  sheet.addEventListener('keydown',function(e){if(e.key==='Escape')go(st==='full'?'half':'closed')});

  function relayout(){if(drag)return;measure();apply(st,false)}
  window.addEventListener('resize',relayout);
  AT.ajustes.on(function(){requestAnimationFrame(relayout)});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',relayout);
    window.visualViewport.addEventListener('scroll',relayout);
  }

  /* ----- Texto y estado ----- */
  function words(s){var t=s.trim();return t?t.split(/\s+/).length:0}
  function wlabel(n){return n===1?'1 palabra':n+' palabras'}
  function updateCount(){
    var n=words(ta.value);
    cnt.textContent=wlabel(n);
    hint.textContent=n?wlabel(n):'Desliza hacia arriba para escribir';
  }
  var cur0={k:'',t:''},flashT=null;
  function setStat(k,t){cur0={k:k,t:t};clearTimeout(flashT);stat.setAttribute('data-k',k);stat.textContent=t}
  function flash(t){
    clearTimeout(flashT);
    stat.setAttribute('data-k','');
    stat.textContent=t;
    flashT=setTimeout(function(){stat.setAttribute('data-k',cur0.k);stat.textContent=cur0.t},1800);
  }

  /* ----- Guardado: cuenta del visor (db) y copia en este dispositivo ----- */
  var ref=null,unsub=null,dirty=false,saving=false,queued=false,timer=null,retryT=null,fails=0,synced=false;
  /* Deja de usar la cuenta: cancela la escucha para que una copia remota vieja
     no vuelva a sobrescribir el texto local. */
  function soltar(){
    if(typeof unsub==='function'){try{unsub()}catch(e){}}
    unsub=null;ref=null;
  }
  function flush(){
    clearTimeout(timer);timer=null;
    if(!dirty)return;
    if(!ref){dirty=false;setStat('','Guardado local');return}
    if(saving){queued=true;return}
    var v=ta.value;
    saving=true;
    setStat('','Guardando…');
    ref.set({text:v}).then(function(){
      saving=false;fails=0;
      if(queued||ta.value!==v){queued=false;flush();return}
      dirty=false;lsDel(LS_PEND);
      setStat('ok','Guardado');
    },function(err){
      saving=false;queued=false;
      var code=err&&err.code;
      if(code==='invalid_argument'||code==='not_granted'||code==='revoked'||code==='capability_disabled'){
        soltar();dirty=false;setStat('','Guardado local');return;
      }
      fails++;
      if(fails>3){setStat('err','Solo guardado local');return}
      setStat('err','Error. Reintentando…');
      clearTimeout(retryT);retryT=setTimeout(flush,5000);
    });
  }
  ta.addEventListener('input',function(){
    dirty=true;fails=0;
    lsSet(LS_KEY,ta.value);lsSet(LS_PEND,'1');
    updateCount();
    setStat('','Escribiendo…');
    clearTimeout(timer);timer=setTimeout(flush,900);
  });
  ta.addEventListener('blur',flush);
  document.addEventListener('visibilitychange',function(){if(document.hidden)flush()});
  window.addEventListener('pagehide',flush);

  function startDb(){
    if(!window.claude||typeof window.claude.use!=='function')return;
    Promise.all([window.claude.use('db'),window.claude.use('user')]).then(function(r){
      var db=r[0],user=r[1];
      if(!db||!user)return;
      return user.id().then(function(id){
        if(!id)return;
        ref=db.collection('data/users/'+id).doc('apuntes-'+actual.id);
        var wait=setTimeout(function(){
          if(!synced&&!dirty)setStat('','Sin conexión: local');
        },10000);
        unsub=ref.onSnapshot(function(snap){
          if(!ref)return;
          if(snap.metadata.hasPendingWrites)return;
          if(snap.metadata.fromCache&&!snap.exists)return;
          if(!snap.metadata.fromCache){synced=true;clearTimeout(wait)}
          if(saving)return;
          /* Hay cambios locales que no llegaron a la cuenta (incluido borrar todo):
             se suben antes de aceptar la copia remota, para no perderlos. */
          if(!snap.metadata.fromCache&&lsGet(LS_PEND)==='1'){dirty=true;flush();return}
          if(dirty||document.activeElement===ta)return;
          if(!snap.exists){
            if(!ta.value)setStat('ok','Se guarda solo');
            return;
          }
          var remote=String((snap.data()||{}).text||'');
          if(remote!==ta.value){ta.value=remote;lsSet(LS_KEY,remote);updateCount()}
          setStat('ok','Guardado');
        },function(){
          soltar();
          setStat('','Guardado local');
        });
      });
    }).catch(function(){});
  }

  /* ----- Copiar y borrar ----- */
  copyBtn.addEventListener('click',function(){
    var txt=ta.value;
    if(!txt){flash('No hay nada que copiar');return}
    function ok(){flash('Copiado')}
    function fallback(){ta.focus();ta.select();flash('Selecciona y copia el texto')}
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fallback);
      else fallback();
    }catch(e){fallback()}
  });
  var armed=false,armT=null;
  function disarm(){armed=false;clearTimeout(armT);clrBtn.textContent='Borrar';clrBtn.classList.remove('danger')}
  clrBtn.addEventListener('click',function(){
    if(!ta.value)return;
    if(!armed){
      armed=true;clrBtn.textContent='¿Seguro?';clrBtn.classList.add('danger');
      armT=setTimeout(disarm,4000);
      return;
    }
    disarm();
    ta.value='';dirty=true;
    lsSet(LS_KEY,'');lsSet(LS_PEND,'1');
    updateCount();
    flush();
  });

  /* ----- Inicio ----- */
  ta.value=lsGet(LS_KEY);
  updateCount();
  setStat('',ta.value?'Guardado local':'Se guarda solo');
  measure();
  apply('closed',false);
  startDb();
})();
})();
