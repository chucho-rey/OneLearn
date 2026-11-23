/* OneBook: pestañas dentro de la app (app.html), como en un navegador. Fase F3.
   Cada pestaña es un iframe con una página normal de la app (inicio.html, documento.html?id=…). Como todo es del
   mismo origen, el contenedor lee el título y la dirección de cada pestaña, y las páginas (base.js) le avisan sus
   cambios y le pasan los atajos y los enlaces que se abren en pestaña nueva.
   - Abrir: «+», Alt+T, clic central o Ctrl/Cmd+clic en un enlace, o el botón de pestaña nueva de «Tus páginas».
     Hasta 12 pestañas.
   - Cerrar: la «×», clic central sobre la pestaña, Supr con el foco en ella o Alt+W. Antes de cerrar o descargar
     una pestaña, se guarda lo que tenga pendiente (AT.docGuardarYa de documento.js).
   - Cambiar: clic, flechas en la barra de pestañas (patrón de pestañas de WAI-ARIA), Alt+1…8, Alt+9 (la última),
     Alt+AvPág y Alt+RePág. Los atajos se ignoran mientras escribes.
   - Se recuerdan en localStorage (aprende-tecnologia:pestanas): al volver se restauran y solo se carga la activa.
   - Las que llevan 10 minutos sin usarse se descargan (sin perder su lugar) y se recargan al volver a ellas.
   - En celular, la barra se vuelve un botón con el número de pestañas y la actual, que abre la lista.
   - app.html#abrir=<página> abre (o activa) esa página en una pestaña: así entra «Abrir en pestañas».
   Expone AT.pestanas. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico;
var CLAVE='aprende-tecnologia:pestanas',MAX=12,DESCARGAR_MS=10*60*1000;
var BASE=location.pathname.replace(/[^/]*$/,'');
var lista=$('#ptLista'),marcos=$('#ptMarcos'),nueva=$('#ptNueva');
var tabs=[],activa=null,sec=0;
nueva.innerHTML=ico('mas');

/* ---------- Direcciones: solo páginas de la app, relativas a la raíz ---------- */
function relativa(u){
  var x;
  try{x=new URL(u,location.href)}catch(e){return null}
  if(x.origin!==location.origin||x.pathname.indexOf(BASE)!==0)return null;
  var r=x.pathname.slice(BASE.length);
  if(!/^[\w-]+(\/[\w-]+)*\.html$/.test(r))return null;
  /* El contenedor y las bienvenidas no van dentro de una pestaña */
  if(r==='app.html'||r==='index.html'||r==='estudiantes.html')r='inicio.html';
  return r+x.search+x.hash;
}
function etiqueta(t){
  t=String(t||'').replace(/\s*·\s*OneBook$/,'').trim();
  return !t||t==='OneBook'?'Inicio':t;
}

/* ---------- Guardar y restaurar ---------- */
function guardar(){
  try{localStorage.setItem(CLAVE,JSON.stringify({v:1,activa:tabs.indexOf(activa),tabs:tabs.map(function(t){return {url:t.url,titulo:t.titulo}})}))}catch(e){}
}
function leer(){
  try{
    var g=JSON.parse(localStorage.getItem(CLAVE)||'null');
    if(!g||!Array.isArray(g.tabs))return null;
    var ts=g.tabs.map(function(t){var u=t&&relativa(t.url);return u?{url:u,titulo:String(t.titulo||'').slice(0,120)}:null}).filter(Boolean).slice(0,MAX);
    return ts.length?{tabs:ts,activa:Math.max(0,Math.min(ts.length-1,+g.activa||0))}:null;
  }catch(e){return null}
}

/* ---------- Dibujo ---------- */
function pintar(){
  /* Si el foco estaba en una pestaña, vuelve a ella después de redibujar */
  var enfocada=document.activeElement&&document.activeElement.getAttribute&&document.activeElement.getAttribute('data-pt');
  lista.innerHTML=tabs.map(function(t){
    var on=t===activa,tit=etiqueta(t.titulo);
    return '<div class="pt-t'+(on?' on':'')+'" role="presentation">'+
      '<button class="pt-tab" type="button" role="tab" id="pt-'+t.id+'" aria-selected="'+on+'" aria-controls="pm-'+t.id+'" tabindex="'+(on?0:-1)+'" data-pt="'+t.id+'" title="'+esc(tit)+'">'+
        '<span>'+esc(tit)+'</span></button>'+
      '<button class="pt-x" type="button" tabindex="-1" data-cerrar="'+t.id+'" aria-label="Cerrar «'+esc(tit)+'»" title="Cerrar (Alt+W)">'+ico('close')+'</button></div>';
  }).join('');
  var n=tabs.length,act=activa?etiqueta(activa.titulo):'';
  $('#ptN').textContent=n;
  $('#ptAct').textContent=act;
  $('#ptTodas').setAttribute('aria-label',(n===1?'1 pestaña':n+' pestañas')+'. Actual: '+act+'. Ver todas');
  nueva.setAttribute('aria-disabled',n>=MAX?'true':'false');
  document.title=activa?activa.titulo||'OneBook':'OneBook';
  tabs.forEach(function(t){if(t.marco)t.marco.title=etiqueta(t.titulo)});
  var b=activa&&document.getElementById('pt-'+activa.id);
  if(b&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'nearest'});
  if(enfocada){var f=document.getElementById('pt-'+enfocada);if(f)f.focus()}
}

/* ---------- Marcos ---------- */
function cargar(t){
  if(t.marco)return;
  var f=document.createElement('iframe');
  f.className='pt-marco';f.id='pm-'+t.id;
  f.setAttribute('role','tabpanel');f.setAttribute('aria-labelledby','pt-'+t.id);
  f.setAttribute('allow','fullscreen; clipboard-write');
  f.title=etiqueta(t.titulo);
  f.hidden=t!==activa;
  f.addEventListener('load',function(){leerMarco(t)});
  f.src=t.url;
  t.marco=f;
  marcos.appendChild(f);
}
/* Lee la dirección y el título de la página que tiene la pestaña */
function leerMarco(t){
  var w=t.marco&&t.marco.contentWindow;if(!w)return;
  try{
    var u=relativa(w.location.href);
    if(!u){w.location.replace(t.url);return}
    t.url=u;t.titulo=w.document.title||t.titulo;
  }catch(e){}
  pintar();guardar();
}
function porVentana(w){return tabs.filter(function(t){return t.marco&&t.marco.contentWindow===w})[0]||null}
/* Antes de cerrar o descargar: lo pendiente se guarda (con un límite de espera) */
function guardarPendiente(t){
  var w=t.marco&&t.marco.contentWindow,p=null;
  try{p=w&&w.AT&&w.AT.docGuardarYa&&w.AT.docGuardarYa()}catch(e){}
  return Promise.race([Promise.resolve(p).catch(function(){}),new Promise(function(r){setTimeout(r,1500)})]);
}
function quitarMarco(t){if(t.marco){t.marco.remove();t.marco=null}}

/* ---------- Acciones ---------- */
function activar(t,foco){
  if(!t)return;
  activa=t;t.usada=Date.now();
  cargar(t);
  tabs.forEach(function(x){if(x.marco)x.marco.hidden=x!==t});
  pintar();guardar();
  if(foco==='tab'){var b=document.getElementById('pt-'+t.id);if(b)b.focus()}
  else if(foco==='marco'){try{t.marco.contentWindow.focus()}catch(e){}}
}
function abrir(u,op){
  op=op||{};
  var r=relativa(u||'inicio.html');
  if(!r)return null;
  if(tabs.length>=MAX){
    if(AT.aviso)AT.aviso('Tienes '+MAX+' pestañas abiertas. Cierra alguna para abrir otra.');
    return null;
  }
  var t={id:'t'+(++sec),url:r,titulo:op.titulo||'',usada:Date.now(),marco:null};
  var i=activa?tabs.indexOf(activa)+1:tabs.length;
  tabs.splice(i,0,t);
  if(op.activar===false){pintar();guardar()}
  else activar(t,op.foco||'marco');
  return t;
}
function cerrar(t,foco){
  if(!t)return Promise.resolve();
  return guardarPendiente(t).then(function(){
    var i=tabs.indexOf(t);if(i<0)return;
    tabs.splice(i,1);quitarMarco(t);
    if(!tabs.length){abrir('inicio.html',{foco:foco});return}
    if(t===activa)activar(tabs[Math.min(i,tabs.length-1)],foco);
    else{pintar();guardar()}
  });
}
/* Descarga las pestañas que llevan un rato sin usarse (no la activa) */
function descargar(edad){
  var limite=Date.now()-(edad==null?DESCARGAR_MS:edad);
  return Promise.all(tabs.filter(function(t){return t!==activa&&t.marco&&t.usada<=limite}).map(function(t){
    return guardarPendiente(t).then(function(){if(t!==activa)quitarMarco(t)});
  }));
}
setInterval(function(){descargar()},60*1000);

/* ---------- Atajos (aquí y desde cada pestaña, por base.js) ---------- */
function escribiendo(el){return !!el&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))}
function atajo(e,w){
  if(!e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.defaultPrevented)return false;
  var doc=w&&w.document||document;
  if(escribiendo(doc.activeElement))return false;
  var c=e.code||'',foco=w?'marco':'tab',i=activa?tabs.indexOf(activa):0;
  if(c==='KeyT'){abrir('inicio.html',{foco:'marco'});return true}
  if(c==='KeyW'){cerrar(activa,foco);return true}
  var m=/^Digit([1-9])$/.exec(c);
  if(m){var n=+m[1];activar(n===9?tabs[tabs.length-1]:tabs[n-1]||null,foco);return true}
  if(c==='PageDown'){activar(tabs[(i+1)%tabs.length],foco);return true}
  if(c==='PageUp'){activar(tabs[(i-1+tabs.length)%tabs.length],foco);return true}
  return false;
}
document.addEventListener('keydown',function(e){if(atajo(e,null))e.preventDefault()});

/* ---------- Barra de pestañas ---------- */
function deBoton(el){var id=el&&el.getAttribute('data-pt')||el&&el.getAttribute('data-cerrar');return tabs.filter(function(t){return t.id===id})[0]||null}
lista.addEventListener('click',function(e){
  var x=e.target.closest('[data-cerrar]');
  if(x){cerrar(deBoton(x),'tab');return}
  var b=e.target.closest('[data-pt]');
  if(b)activar(deBoton(b),'tab');
});
/* Clic central sobre una pestaña: se cierra, como en el navegador */
lista.addEventListener('auxclick',function(e){
  if(e.button!==1)return;
  var b=e.target.closest('[data-pt],[data-cerrar]');
  if(b){e.preventDefault();cerrar(deBoton(b),'tab')}
});
lista.addEventListener('mousedown',function(e){if(e.button===1)e.preventDefault()});
lista.addEventListener('keydown',function(e){
  var b=e.target.closest('[data-pt]');if(!b)return;
  var t=deBoton(b),i=tabs.indexOf(t),j=-1;
  if(e.key==='ArrowRight')j=(i+1)%tabs.length;
  else if(e.key==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;
  else if(e.key==='Home')j=0;
  else if(e.key==='End')j=tabs.length-1;
  else if(e.key==='Delete'){e.preventDefault();cerrar(t,'tab');return}
  if(j<0)return;
  e.preventDefault();
  activar(tabs[j],'tab');
});
nueva.addEventListener('click',function(){if(nueva.getAttribute('aria-disabled')!=='true')abrir('inicio.html',{foco:'marco'})});

/* ---------- En celular: la lista de pestañas ---------- */
var vista=null;
function pintarVista(){
  $('#ptvLista',vista).innerHTML=tabs.map(function(t){
    var tit=etiqueta(t.titulo);
    return '<li class="ptv-i'+(t===activa?' on':'')+'"><button type="button" class="ptv-b" data-pt="'+t.id+'"'+(t===activa?' aria-current="true"':'')+'>'+ico('page')+'<span>'+esc(tit)+'</span></button>'+
      '<button type="button" class="ptv-x" data-cerrar="'+t.id+'" aria-label="Cerrar «'+esc(tit)+'»">'+ico('close')+'</button></li>';
  }).join('');
  $('#ptvT',vista).textContent=tabs.length===1?'1 pestaña':tabs.length+' pestañas';
}
function abrirVista(){
  if(!vista){
    vista=document.createElement('dialog');
    vista.className='atajos ptv';
    vista.setAttribute('aria-labelledby','ptvT');
    vista.innerHTML='<div class="at-h"><h2 id="ptvT"></h2><button class="lec-x" type="button" data-ptv="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
      '<ul class="ptv-l" id="ptvLista"></ul>'+
      '<button class="btn pri ptv-nueva" type="button" data-ptv="nueva">'+ico('mas')+'<span>Nueva pestaña</span></button>';
    document.body.appendChild(vista);
    vista.addEventListener('click',function(e){
      if(e.target===vista||e.target.closest('[data-ptv="cerrar"]')){vista.close();return}
      if(e.target.closest('[data-ptv="nueva"]')){vista.close();abrir('inicio.html',{foco:'marco'});return}
      var x=e.target.closest('[data-cerrar]');
      if(x){var t=deBoton(x);cerrar(t,false).then(function(){if(vista.open){pintarVista();var p=vista.querySelector('.ptv-b');if(p)p.focus()}});return}
      var b=e.target.closest('[data-pt]');
      if(b){vista.close();activar(deBoton(b),'marco')}
    });
  }
  pintarVista();
  vista.showModal();
  var on=vista.querySelector('.ptv-b[aria-current]');if(on)on.focus();
}
$('#ptTodas').addEventListener('click',abrirVista);

/* ---------- Lo que usan las páginas (base.js) ---------- */
AT.pestanas={
  abrir:function(u,op){return !!abrir(u,op)},
  abrible:function(u){return !!relativa(u)},
  atajo:atajo,
  /* Una página avisa que cambió su título o su dirección */
  cambio:function(w){var t=porVentana(w);if(t)leerMarco(t)},
  cerrar:function(){return cerrar(activa,'tab')},
  activar:function(n){activar(tabs[n],'tab')},
  descargar:descargar,
  lista:function(){return tabs.map(function(t){return {url:t.url,titulo:etiqueta(t.titulo),activa:t===activa,cargada:!!t.marco}})},
  MAX:MAX
};

/* ---------- Al abrir: lo que tenías y lo que pide la dirección ---------- */
var g=leer(),pide=(/^#abrir=(.+)$/.exec(location.hash)||[])[1];
if(g){
  g.tabs.forEach(function(x){tabs.push({id:'t'+(++sec),url:x.url,titulo:x.titulo,usada:Date.now(),marco:null})});
  activa=tabs[g.activa];
}
if(pide){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  var r=relativa(decodeURIComponent(pide)),ya=r&&tabs.filter(function(t){return t.url===r})[0];
  if(ya)activa=ya;
  /* Con todas las pestañas ocupadas, la página se abre en la que estaba activa */
  else if(r&&tabs.length>=MAX){activa.url=r;activa.titulo=''}
  else if(r){
    var t={id:'t'+(++sec),url:r,titulo:'',usada:Date.now(),marco:null};
    tabs.splice(activa?tabs.indexOf(activa)+1:tabs.length,0,t);activa=t;
  }
}
if(!tabs.length)abrir('inicio.html',{foco:false});
else activar(activa||tabs[0],false);
/* Antes de cerrar la app, lo pendiente de cada pestaña se guarda */
addEventListener('pagehide',function(){tabs.forEach(function(t){guardarPendiente(t)})});
})();
