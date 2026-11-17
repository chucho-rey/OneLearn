/* OneLearn: hoja de apuntes de cada lección (nota rápida).
   Abajo a media página o en pantalla completa; en escritorio también acoplada a la derecha, con ancho ajustable.
   Se guarda sola en este dispositivo. Expone AT.hoja. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,reduce=AT.reduce;
var R=AT.rutas,RAIZ=R.raiz,LECC=R.lecciones,ES_INICIO=R.esInicio;
var catalogo=AT.catalogo||[],actual=AT.leccion;
if(ES_INICIO||!document.body.hasAttribute('data-leccion'))return;
var setNav=AT.setNav,isDesk=AT.esEscritorio,CLAVE_APUNTES='aprende-tecnologia:apuntes:';

(function(){
  var t=esc(actual.titulo);
  document.body.insertAdjacentHTML('beforeend',
    '<section class="sheet" id="sheet" data-state="closed" aria-label="Apuntes de la lección">'+
      '<div class="sh-resize" id="shResize" role="separator" aria-orientation="vertical" aria-label="Ancho de la nota" tabindex="0"></div>'+
      '<div class="sh-grab" id="shGrab"><div class="sh-in">'+
        '<span class="sh-handle" aria-hidden="true"></span>'+
        '<div class="sh-row">'+ico('note','sh-ic')+'<span class="sh-title">Apuntes</span><span class="tag sh-lesson">'+t+'</span>'+
          '<span class="sh-hint" id="shHint"></span><span class="sh-sp"></span>'+
          '<button class="sh-btn sh-dock" id="shDock" type="button" aria-label="Acoplar a la derecha" title="Acoplar a la derecha">'+ico('dock-r','','shDockUse')+'</button>'+
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

(function(){
  var LS_KEY=CLAVE_APUNTES+actual.id;
  var sheet=$('#sheet'),grab=$('#shGrab'),mainBtn=$('#shMain'),mainUse=$('#shMainUse'),hideBtn=$('#shHide'),hint=$('#shHint');
  var dockBtn=$('#shDock'),dockUse=$('#shDockUse'),resizer=$('#shResize'),root=document.documentElement;
  var KEY_ANCHO='aprende-tecnologia:nota-ancho';
  var ta=$('#notes'),cnt=$('#nCnt'),stat=$('#nStat'),copyBtn=$('#nCopy'),clrBtn=$('#nClear');
  var STATES=['closed','half','full'];
  var LABELS={closed:'Abrir apuntes',half:'Ver apuntes en pantalla completa',full:'Reducir apuntes a media página'};
  var ICONS={closed:'#i-up',half:'#i-expand',full:'#i-compress'};
  var st='closed',layH=0,visH=0,kb=0,peek=57,drag=null;

  function lsGet(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}

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
  /* Al abrir: a la derecha si así lo prefieres y hay espacio (escritorio); si no, abajo a media página */
  function abierta(){return AT.ajustes.get('nota')==='derecha'&&isDesk()?'right':'half'}
  function apply(s,anim){
    st=s;
    var der=s==='right';
    sheet.classList.toggle('anim',!!anim&&!reduce&&!der);
    sheet.setAttribute('data-state',s);
    root.classList.toggle('nota-derecha',der);
    sheet.style.bottom=der?'':kb+'px';
    sheet.style.height=der?'':target(s)+'px';
    mainBtn.hidden=der;
    if(!der){mainBtn.setAttribute('aria-label',LABELS[s]);mainUse.setAttribute('href',ICONS[s])}
    hideBtn.hidden=(s==='closed');
    hideBtn.setAttribute('aria-label',der?'Cerrar apuntes':'Ocultar apuntes');
    var lab=der?'Acoplar abajo':'Acoplar a la derecha';
    dockBtn.setAttribute('aria-label',lab);dockBtn.setAttribute('title',lab);
    dockUse.setAttribute('href',der?'#i-dock-b':'#i-dock-r');
    dockBtn.hidden=(s==='closed');
  }
  function go(s,anim){
    var was=st;
    if(s!=='closed')setNav(false);
    apply(s,anim!==false);
    if(s==='closed'&&was!=='closed'){
      if(sheet.contains(document.activeElement)){
        /* El foco vuelve al botón de apuntes; si no se ve (modo zen), vuelve a la página,
           para que el foco no quede atrapado en el cuadro de texto oculto */
        if(mainBtn.getClientRects().length)mainBtn.focus({preventScroll:true});
        else document.activeElement.blur();
      }
    }
  }

  /* ----- Arrastre ----- */
  grab.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(st==='right')return;
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
      if(!cancel)go(st==='closed'?abierta():'closed');
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

  mainBtn.addEventListener('click',function(){go(st==='closed'?abierta():(st==='half'?'full':'half'))});
  hideBtn.addEventListener('click',function(){go('closed')});
  dockBtn.addEventListener('click',function(){
    var aDerecha=st!=='right';
    AT.ajustes.set('nota',aDerecha?'derecha':'abajo');
    go(aDerecha?'right':'half');
    dockBtn.focus({preventScroll:true});
  });
  sheet.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||st==='closed')return;
    e.preventDefault();
    go(st==='full'?'half':'closed');
  });

  /* ----- Ancho de la nota acoplada: se arrastra el borde izquierdo o se usan las flechas ----- */
  function limites(){return {min:256,max:Math.max(256,Math.min(Math.round(innerWidth*0.6),720))}}
  function ancho(px,guardar){
    var l=limites();
    px=Math.round(Math.max(l.min,Math.min(l.max,px)));
    root.style.setProperty('--nota-w',px+'px');
    resizer.setAttribute('aria-valuemin',l.min);resizer.setAttribute('aria-valuemax',l.max);resizer.setAttribute('aria-valuenow',px);
    if(guardar)lsSet(KEY_ANCHO,String(px));
    return px;
  }
  var anchoActual=ancho(parseInt(lsGet(KEY_ANCHO),10)||384,false);
  resizer.addEventListener('pointerdown',function(e){
    if(st!=='right')return;
    e.preventDefault();
    try{resizer.setPointerCapture(e.pointerId)}catch(x){}
    root.classList.add('nota-ajustando');
    function mover(ev){anchoActual=ancho(innerWidth-ev.clientX,false)}
    function soltar(){
      resizer.removeEventListener('pointermove',mover);
      root.classList.remove('nota-ajustando');
      ancho(anchoActual,true);
    }
    resizer.addEventListener('pointermove',mover);
    resizer.addEventListener('pointerup',soltar,{once:true});
    resizer.addEventListener('pointercancel',soltar,{once:true});
  });
  resizer.addEventListener('keydown',function(e){
    var d=e.key==='ArrowLeft'?16:e.key==='ArrowRight'?-16:0;
    if(!d)return;
    e.preventDefault();
    anchoActual=ancho(anchoActual+d,true);
  });

  function relayout(){
    if(drag)return;
    measure();
    if(st==='right'&&!isDesk())st='half';
    ancho(anchoActual,false);
    apply(st,false);
  }
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

  /* ----- Guardado en este dispositivo ----- */
  var timer=null;
  ta.addEventListener('input',function(){
    lsSet(LS_KEY,ta.value);lsSet(LS_KEY+':editado',new Date().toISOString());
    updateCount();
    AT.refrescarNotas();
    setStat('','Escribiendo…');
    clearTimeout(timer);timer=setTimeout(function(){setStat('ok','Guardado')},700);
  });

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
    ta.value='';
    lsSet(LS_KEY,'');lsSet(LS_KEY+':editado',new Date().toISOString());
    updateCount();
    AT.refrescarNotas();
    setStat('ok','Guardado');
  });

  /* ----- Inicio ----- */
  ta.value=lsGet(LS_KEY);
  updateCount();
  setStat('',ta.value?'Guardado':'Se guarda solo');
  measure();
  apply('closed',false);
  AT.hoja={
    abrir:function(){if(st==='closed')go(abierta());ta.focus({preventScroll:true})},
    cerrar:function(){go('closed')},
    abierta:function(){return st!=='closed'}
  };
  /* Llegar desde «Mis apuntes» de otra lección abre la nota de inmediato */
  if(location.hash==='#apuntes'){
    try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
    AT.hoja.abrir();
  }
})();
})();
