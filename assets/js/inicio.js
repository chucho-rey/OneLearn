/* Pantalla de inicio de OneLearn: continúa donde te quedaste, tus notas recientes y explorar temas.
   La primera visita (sin avance ni notas) muestra una bienvenida que sugiere empezar por Memoria RAM.
   Usa AT.avance (avance.js) y AT.datos (datos.js). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico,LECC=AT.rutas.lecciones;
var lecciones=[],porId={};
AT.catalogo.forEach(function(g){g.lecciones.forEach(function(l){lecciones.push(l);porId[l.id]=l})});
var disponibles=lecciones.filter(function(l){return l.archivo});

function saludo(){
  var h=new Date().getHours();
  return h>=5&&h<12?'Buenos días':h>=12&&h<19?'Buenas tardes':'Buenas noches';
}
function url(l,hash){return esc(LECC+l.archivo+(hash?'#'+hash:''))}
var notasCache=[];
function hayNotas(){return notasCache.some(function(n){return n.t.trim()})}

function pintarContinuar(){
  var cont=$('#continuar'),bienv=$('#bienvenida');
  var u=AT.avance.ultima(),l=u&&porId[u.id];
  if(!l||!l.archivo){
    cont.hidden=true;
    bienv.hidden=hayNotas();
    return;
  }
  bienv.hidden=true;cont.hidden=false;
  var p=AT.avance.porcentaje(l.id),h;
  var sig=disponibles[disponibles.indexOf(l)+1];
  if(p>=100&&sig&&AT.avance.porcentaje(sig.id)<100){
    /* Terminaste esta lección: se sugiere la siguiente */
    var ps=AT.avance.porcentaje(sig.id);
    h='<a class="cont" href="'+url(sig)+'"><span class="cont-l">Terminaste '+esc(l.titulo)+'. Sigue con</span>'+
      '<b>'+esc(sig.titulo)+'</b>'+
      '<span class="cont-bar" aria-hidden="true"><i style="width:'+ps+'%"></i></span>'+
      '<span class="cont-p">'+(ps?ps+'% leído':'Sin empezar')+'</span></a>';
  }else{
    var r=u.repaso;
    h='<a class="cont" href="'+url(l,p>=100?'':u.seccion)+'"><span class="cont-l">Continúa donde te quedaste</span>'+
      '<b>'+esc(l.titulo)+'</b>'+
      (u.seccionTitulo&&p<100?'<span class="cont-s">'+esc(u.seccionTitulo)+'</span>':'')+
      '<span class="cont-bar" aria-hidden="true"><i style="width:'+p+'%"></i></span>'+
      '<span class="cont-p">'+p+'% leído'+(r?' · repaso: '+r.ok+' de '+r.total:'')+'</span></a>';
  }
  cont.innerHTML=h;
}

function cargarNotas(){
  return AT.datos.notas.todas().then(function(lista){
    notasCache=lista.filter(function(n){return porId[n.id]&&porId[n.id].archivo}).map(function(n){return {l:porId[n.id],t:n.texto||'',f:n.editado||''}});
  });
}
function pintarNotas(){
  var notas=notasCache
    .filter(function(n){return n.t.trim()})
    .sort(function(a,b){return a.f===b.f?0:a.f<b.f?1:-1})
    .slice(0,3);
  var ul=$('#recientes');
  if(!notas.length){
    ul.innerHTML='<li class="ini-vacio">Aún no tienes apuntes. Se escriben desde cada lección, en «Apuntes», abajo.</li>';
    return;
  }
  ul.innerHTML=notas.map(function(n){
    var linea=n.t.trim().split(/\n/)[0].trim();
    if(linea.length>120)linea=linea.slice(0,120)+'…';
    var w=n.t.trim().split(/\s+/).length;
    return '<li><a class="nota" href="'+url(n.l,'apuntes')+'"><b>'+esc(n.l.titulo)+'</b><span>'+esc(linea)+'</span><small>'+(w===1?'1 palabra':w+' palabras')+'</small></a></li>';
  }).join('');
}

function pintarExplorar(){
  $('#explorar').innerHTML=AT.catalogo.map(function(g){
    return '<div class="exp-g"><h3 class="exp-t">'+esc(g.grupo)+'</h3><ul class="exp">'+g.lecciones.map(function(l){
      var icono=ico(l.icono||'page');
      if(!l.archivo)return '<li><span class="exp-i soon">'+icono+'<span>'+esc(l.titulo)+'</span><em>Pronto</em></span></li>';
      var p=AT.avance.porcentaje(l.id);
      return '<li><a class="exp-i" href="'+url(l)+'">'+icono+'<span>'+esc(l.titulo)+'</span>'+
        '<span class="mini" aria-hidden="true"><i style="width:'+p+'%"></i></span><em>'+(p?p+'%':'Sin empezar')+'</em></a></li>';
    }).join('')+'</ul></div>';
  }).join('');
}

/* Instalar: el botón aparece si el navegador lo permite; en iPhone y iPad se explica cómo hacerlo */
function pintarInstalar(){
  var sec=$('#instalar'),btn=$('#instalarBtn'),txt=$('#instalarTxt');
  if(AT.app.instalada()){sec.hidden=true;return}
  if(AT.app.evento){
    sec.hidden=false;btn.hidden=false;
    txt.textContent='Ábrelo como una app, desde tu pantalla de inicio, y estudia sin conexión.';
  }else if(AT.app.esIOS()){
    sec.hidden=false;btn.hidden=true;
    txt.textContent='En iPhone o iPad: toca Compartir y luego «Agregar a inicio». Así lo abres como una app y funciona sin conexión.';
  }else sec.hidden=true;
}
$('#instalarBtn').addEventListener('click',function(){
  AT.app.instalar().then(function(ok){if(ok)$('#instalar').hidden=true;else pintarInstalar()});
});
document.addEventListener('app-instalable',pintarInstalar);
document.addEventListener('app-instalada',function(){$('#instalar').hidden=true});

function pintar(){pintarContinuar();pintarNotas();pintarExplorar();pintarInstalar()}
function recargar(){cargarNotas().then(pintar)}
$('#saludo').textContent=saludo();
pintar();
recargar();
AT.avance.on(pintar);
AT.datos.on(function(c){if(c.almacen==='notas'||c.almacen==='*')recargar()});
/* Al volver con «atrás» desde una lección, el navegador puede mostrar una copia vieja: se actualiza */
window.addEventListener('pageshow',function(e){if(e.persisted)location.reload()});
})();
