/* OneBook: panel Lectura (tamaño de texto, tema, contraste, fuente y espacios).
   Los valores viven en AT.ajustes (assets/js/ajustes.js); este panel solo los muestra y los cambia.
   Se abre con «Aa» de la barra superior o «Lectura» de la barra lateral. Expone AT.lectura. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,reduce=AT.reduce;
var setNav=function(v){AT.setNav(v)};
var R=AT.rutas,RAIZ=R.raiz,ES_INICIO=R.esInicio;

(function(){
  var aj=AT.ajustes,btn=$('#aaBtn'),ESC=aj.opciones.escala;
  var GRUPOS=[
    {k:'tema',t:'Tema',o:[['auto','Automático'],['light','Claro'],['dark','Oscuro']]},
    {k:'contraste',t:'Contraste',o:[['auto','Según el sistema'],['normal','Normal'],['high','Alto']]},
    {k:'fuente',t:'Fuente',o:[['normal','IBM Plex',"'IBM Plex Sans'"],['atkinson','Atkinson',"'Atkinson Hyperlegible'"],['opendyslexic','OpenDyslexic',"'OpenDyslexic'"]]},
    {k:'espaciado',t:'Espacio entre letras',o:[['normal','Normal'],['amplio','Amplio']]},
    {k:'interlineado',t:'Interlineado',o:[['normal','Normal'],['amplio','Amplio']]},
    {k:'ancho',t:'Ancho de columna',o:[['estrecho','Estrecho'],['normal','Normal'],['amplio','Amplio'],['completo','Toda la pantalla']]}
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
  var soltarAtras=function(){};
  function abrir(){
    setNav(false);
    pintar();
    panel.hidden=false;
    /* El botón Atrás del celular lo cierra (CloseWatcher, base.js) */
    soltarAtras=AT.alAtras(function(){cerrar(false)});
    btn.setAttribute('aria-expanded','true');
    menos.focus({preventScroll:true});
  }
  function cerrar(devolverFoco){
    if(panel.hidden)return;
    panel.hidden=true;
    soltarAtras();soltarAtras=function(){};
    btn.setAttribute('aria-expanded','false');
    if(devolverFoco)btn.focus({preventScroll:true});
  }
  btn.addEventListener('click',function(){if(panel.hidden)abrir();else cerrar(false)});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!panel.hidden){cerrar(panel.contains(document.activeElement));e.preventDefault();e.stopPropagation()}
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
})();
