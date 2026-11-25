/* OneBook: app instalable y sin conexión.
   Registra el service worker (sw.js), avisa cuando OneBook se actualiza y guarda el evento del navegador
   que permite instalar la app, para que la pantalla de inicio ofrezca el botón «Instalar».
   Expone AT.aviso y AT.app. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,reduce=AT.reduce;
var R=AT.rutas,RAIZ=R.raiz,ES_INICIO=R.esInicio;

AT.aviso=function(texto,accion,fn){
  var v=document.getElementById('avisoApp');
  if(!v){
    v=document.createElement('div');v.id='avisoApp';v.className='aviso-app';v.setAttribute('role','status');
    document.body.appendChild(v);
  }
  v.innerHTML='<span>'+esc(texto)+'</span>'+(accion?'<button class="btn" type="button">'+esc(accion)+'</button>':'')+
    '<button class="aviso-x" type="button" aria-label="Cerrar aviso">'+ico('close')+'</button>';
  v.hidden=false;
  var b=$('.btn',v);
  if(b)b.addEventListener('click',function(){v.hidden=true;fn()});
  $('.aviso-x',v).addEventListener('click',function(){v.hidden=true});
};
AT.app={
  evento:null,
  instalada:function(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true},
  esIOS:function(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)},
  instalar:function(){
    var e=AT.app.evento;
    if(!e)return Promise.resolve(false);
    AT.app.evento=null;
    e.prompt();
    return e.userChoice.then(function(c){return c.outcome==='accepted'});
  }
};
window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();
  AT.app.evento=e;
  document.dispatchEvent(new CustomEvent('app-instalable'));
});
window.addEventListener('appinstalled',function(){
  AT.app.evento=null;
  document.dispatchEvent(new CustomEvent('app-instalada'));
});
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  var controlada=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register(RAIZ+'sw.js').catch(function(){});
  /* La primera instalación no avisa; una versión nueva, sí */
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(controlada)AT.aviso('OneBook se actualizó.','Recargar',function(){location.reload()});
    controlada=true;
  });
}
})();
