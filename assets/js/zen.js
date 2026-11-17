/* Modo zen y atajos de teclado de OneLearn (en las lecciones y en tus documentos).
   Modo zen: oculta la barra lateral, la barra superior, el mapa y la barra de apuntes; deja el texto y una línea
   fina de avance arriba, y usa la pantalla completa del navegador donde se puede. Una barra discreta (que aparece
   al mover el ratón o con Tab) cambia el tamaño de letra y el ancho, abre la nota rápida y sale.
   Atajos (ninguno se activa mientras escribes):
     Z  modo zen        N  nota rápida        J / K  sección siguiente / anterior
     ?  lista de atajos  Esc  cierra lo que esté abierto; si no hay nada, sale del modo zen
   Se carga después de los scripts comunes y de avance.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,ico=AT.ico,aj=AT.ajustes,root=document.documentElement;
var page=$('.page');
var conNota=!!document.body.getAttribute('data-leccion');
if(!page||!(conNota||AT.rutas.pagina==='documento'))return;

/* Avisos para lectores de pantalla */
var aviso=document.createElement('div');
aviso.className='vh';aviso.setAttribute('aria-live','polite');
document.body.appendChild(aviso);
function anunciar(t){aviso.textContent='';setTimeout(function(){aviso.textContent=t},50)}

/* ---------- Línea de avance y barra de controles ---------- */
var prog=document.createElement('div');
prog.className='zen-prog';prog.setAttribute('aria-hidden','true');prog.innerHTML='<i></i>';
document.body.appendChild(prog);
var barra=document.createElement('div');
barra.className='zen-bar';barra.hidden=true;
barra.setAttribute('role','toolbar');barra.setAttribute('aria-label','Modo zen');
barra.innerHTML=
  '<button type="button" data-z="menos" aria-label="Texto más pequeño">A−</button>'+
  '<button type="button" data-z="mas" aria-label="Texto más grande">A+</button>'+
  '<button type="button" data-z="ancho" aria-label="Ancho de columna">'+ico('ancho')+'</button>'+
  (conNota?'<button type="button" data-z="nota" aria-label="Nota rápida (N)">'+ico('note')+'</button>':'')+
  '<button type="button" data-z="salir">Salir <kbd>Esc</kbd></button>';
/* Al principio de la página: con Tab es lo primero a lo que se llega en el modo zen */
document.body.insertBefore(barra,document.body.firstChild);

function activo(){return root.classList.contains('zen')}
var dormir=null;
function despertar(){
  root.classList.add('zen-vivo');
  clearTimeout(dormir);
  dormir=setTimeout(function(){if(!barra.contains(document.activeElement))root.classList.remove('zen-vivo')},2500);
}
['mousemove','touchstart'].forEach(function(ev){addEventListener(ev,function(){if(activo())despertar()},{passive:true})});
barra.addEventListener('focusin',despertar);
barra.addEventListener('focusout',despertar);

var ESC=aj.opciones.escala,ANCHOS=aj.opciones.ancho;
var NOMBRES={estrecho:'estrecha',normal:'normal',amplio:'amplia'};
barra.addEventListener('click',function(e){
  var b=e.target.closest('button');
  if(!b)return;
  var z=b.getAttribute('data-z'),i;
  if(z==='menos'||z==='mas'){
    i=ESC.indexOf(aj.get('escala'))+(z==='mas'?1:-1);
    if(i>=0&&i<ESC.length){aj.set('escala',ESC[i]);anunciar('Texto al '+Math.round(ESC[i]*100)+'%')}
  }else if(z==='ancho'){
    var a=ANCHOS[(ANCHOS.indexOf(aj.get('ancho'))+1)%ANCHOS.length];
    aj.set('ancho',a);anunciar('Columna '+NOMBRES[a]);
  }else if(z==='nota'){if(AT.hoja)AT.hoja.abrir()}
  else if(z==='salir')salir();
});

function progreso(){
  var ult=page.lastElementChild,fin=ult?ult.getBoundingClientRect().bottom+scrollY:document.body.scrollHeight;
  var total=Math.max(1,fin-innerHeight);
  prog.firstChild.style.width=Math.max(0,Math.min(100,scrollY/total*100))+'%';
}
addEventListener('scroll',function(){if(activo())progreso()},{passive:true});

/* ---------- Entrar y salir ---------- */
var zenBtn=$('#zenBtn'),pantalla=false;
function sync(){
  var on=activo();
  if(zenBtn)zenBtn.setAttribute('aria-pressed',on?'true':'false');
}
function entrar(){
  if(activo())return;
  if(AT.setNav)AT.setNav(false);
  if(AT.lectura)AT.lectura.cerrar(false);
  /* Si el foco estaba en algo que el modo zen oculta, vuelve al inicio de la página:
     así el siguiente Tab llega a la barra del modo zen */
  var a=document.activeElement;
  if(a&&a.closest&&a.closest('.topbar,.side')){
    document.body.setAttribute('tabindex','-1');
    document.body.focus({preventScroll:true});
    document.body.removeAttribute('tabindex');
  }
  root.classList.add('zen');
  barra.hidden=false;
  despertar();progreso();sync();
  var el=document.documentElement;
  if(el.requestFullscreen&&!document.fullscreenElement){
    try{
      el.requestFullscreen({navigationUI:'hide'}).then(function(){pantalla=true}).catch(function(){});
    }catch(e){}
  }
  anunciar('Modo zen. Pulsa Esc para salir.');
}
function salir(){
  if(!activo())return;
  root.classList.remove('zen','zen-vivo');
  barra.hidden=true;
  var habia=pantalla;pantalla=false;
  if(habia&&document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){});
  sync();
  if(zenBtn)zenBtn.focus({preventScroll:true});
  anunciar('Saliste del modo zen.');
}
/* En pantalla completa, Esc la cierra el propio navegador: entonces también se sale del modo zen */
document.addEventListener('fullscreenchange',function(){
  if(!document.fullscreenElement&&pantalla){pantalla=false;salir()}
});
if(zenBtn)zenBtn.addEventListener('click',function(){activo()?salir():entrar()});
var sideZen=$('#sideZen');
if(sideZen)sideZen.addEventListener('click',entrar);

/* ---------- Saltar entre secciones ---------- */
function saltar(dir){
  var hs=$$('h2[id]',page),off=activo()?24:64,dest=null;
  if(dir>0){for(var i=0;i<hs.length;i++){if(hs[i].getBoundingClientRect().top>off+4){dest=hs[i];break}}}
  else{for(var j=hs.length-1;j>=0;j--){if(hs[j].getBoundingClientRect().top<off-4){dest=hs[j];break}}}
  if(!dest)return;
  dest.scrollIntoView({behavior:AT.reduce?'auto':'smooth',block:'start'});
  dest.setAttribute('tabindex','-1');
  dest.focus({preventScroll:true});
}

/* ---------- Lista de atajos ---------- */
var dlg=document.createElement('dialog');
dlg.className='atajos';dlg.setAttribute('aria-labelledby','atajosT');
dlg.innerHTML='<div class="at-h"><h2 id="atajosT">Atajos de teclado</h2>'+
  '<button type="button" class="lec-x" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+
  '<dl>'+
    '<div><dt><kbd>Z</kbd></dt><dd>Entrar o salir del modo zen</dd></div>'+
    (conNota?'<div><dt><kbd>N</kbd></dt><dd>Abrir la nota rápida</dd></div>':'')+
    '<div><dt><kbd>J</kbd> <kbd>K</kbd></dt><dd>Sección siguiente y anterior</dd></div>'+
    (conNota?'<div><dt><kbd>M</kbd></dt><dd>Guardar la sección como marcador</dd></div>':'<div><dt><kbd>E</kbd></dt><dd>Pasar de leer a editar</dd></div>')+
    '<div><dt><kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Buscar en todo OneLearn</dd></div>'+
    '<div><dt><kbd>Esc</kbd></dt><dd>Cerrar lo que esté abierto, o salir del modo zen</dd></div>'+
    '<div><dt><kbd>?</kbd></dt><dd>Ver esta lista</dd></div>'+
  '</dl><p class="lec-nota">Los atajos no se activan mientras escribes.</p>';
document.body.appendChild(dlg);
dlg.addEventListener('click',function(e){
  /* Un clic en el fondo, fuera del cuadro, también cierra */
  if(e.target.closest('[data-cerrar]')||e.target===dlg)dlg.close();
});
function ayuda(){if(!dlg.open)dlg.showModal()}
var sideAtajos=$('#sideAtajos');
if(sideAtajos)sideAtajos.addEventListener('click',function(){if(AT.setNav)AT.setNav(false);ayuda()});

/* ---------- Teclado ---------- */
/* Un campo oculto no cuenta como «escribiendo» */
function escribiendo(t){return !!t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))&&t.getClientRects().length>0}
document.addEventListener('keydown',function(e){
  /* Con Tab, la barra del modo zen aparece para poder llegar a ella sin ratón */
  if(e.key==='Tab'&&activo())despertar();
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||dlg.open||escribiendo(e.target))return;
  var k=e.key;
  if(k==='z'||k==='Z'){e.preventDefault();activo()?salir():entrar()}
  else if(k==='n'||k==='N'){e.preventDefault();if(AT.hoja)AT.hoja.abrir()}
  else if(k==='j'||k==='J'){e.preventDefault();saltar(1)}
  else if(k==='k'||k==='K'){e.preventDefault();saltar(-1)}
  else if(k==='?'){e.preventDefault();ayuda()}
  else if(k==='Escape'&&activo()){e.preventDefault();salir()}
});
AT.zen={entrar:entrar,salir:salir,activo:activo};
})();
