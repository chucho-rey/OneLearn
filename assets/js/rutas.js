/* OneBook: rutas de aprendizaje (rutas.html).
   Dibuja cada ruta de AT.caminos (catalogo.js) con su avance, el botón «Qué sigue» y sus módulos en orden:
   cada módulo con su meta, sus lecciones (con el porcentaje leído o «Pronto») y sus proyectos.
   El avance se calcula con AT.avance.camino (avance.js); al volver a la página o cambiar el avance, se redibuja. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico,LECC=AT.rutas.lecciones,RAIZ=AT.rutas.raiz;
var cont=$('#rutasLista');
if(!cont)return;

function href(it){return it.tipo==='proyecto'?RAIZ+'proyectos/'+it.archivo:LECC+it.archivo}
function estado(it){
  if(!it.archivo)return 'Pronto';
  if(it.hecho)return it.tipo==='proyecto'?'Terminado':'Terminada';
  return it.pct?it.pct+' %':'Sin empezar';
}
function item(it){
  var icono=ico(it.icono||'page');
  if(!it.archivo)return '<li><span class="exp-i soon">'+icono+'<span>'+esc(it.titulo)+'</span><em>Pronto</em></span></li>';
  return '<li><a class="exp-i'+(it.hecho?' hecho':'')+'" href="'+esc(href(it))+'">'+icono+'<span>'+esc(it.titulo)+(it.tipo==='proyecto'?'<small>Proyecto · '+esc(it.nivel||'')+'</small>':'')+'</span>'+
    '<span class="mini" aria-hidden="true"><i style="width:'+it.pct+'%"></i></span><em>'+estado(it)+'</em></a></li>';
}
function pintar(){
  cont.innerHTML=(AT.caminos||[]).map(function(c){
    var r=AT.avance.camino(c),pct=r.total?Math.round(r.terminadas/r.total*100):0,sig=r.sig;
    var pronto=r.total-r.publicadas;
    var sigue=sig?
      '<a class="btn pri" href="'+esc(href(sig))+'">'+(sig.pct?'Continuar':'Empezar')+': '+esc(sig.titulo)+'</a>'+
      '<p class="rt-sig-m">Módulo '+sig.modulo+' · '+esc(c.modulos[sig.modulo-1].titulo)+(sig.pct?' · llevas '+sig.pct+' %':'')+'</p>':
      '<p class="rt-sig-m">'+(pronto?'Terminaste todo lo publicado de esta ruta. Pronto llegan las lecciones que faltan.':'Terminaste la ruta completa. ¡Felicidades!')+'</p>';
    return '<section class="rt" id="'+esc(c.id)+'" aria-labelledby="rt-t-'+esc(c.id)+'">'+
      '<div class="rt-cab">'+ico(c.icono||'ruta','rt-ic')+'<div class="rt-cab-c">'+
        '<p class="pj-eyebrow">Ruta · '+esc(c.nivel)+'</p>'+
        '<h2 id="rt-t-'+esc(c.id)+'">'+esc(c.titulo)+'</h2>'+
        '<p>'+esc(c.descripcion)+'</p>'+
        '<p class="rt-para">'+esc(c.para)+'</p>'+
        '<p class="rt-dat">'+c.modulos.length+' módulos · '+r.total+' lecciones y proyectos · '+esc(c.duracion)+'</p>'+
        '<div class="rt-av"><div class="rt-av-t"><b>Tu avance: '+pct+' %</b><span>'+r.terminadas+' de '+r.total+' terminados'+(pronto?' · '+pronto+' por publicar':'')+'</span></div>'+
        '<div class="pj-bar" role="progressbar" aria-label="Avance en la ruta '+esc(c.titulo)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><i style="width:'+pct+'%"></i></div></div>'+
        '<div class="rt-sig"><p class="rt-sig-t">Qué sigue</p>'+sigue+'</div>'+
      '</div></div>'+
      '<ol class="rt-mods">'+r.modulos.map(function(m){
        var actual=sig&&sig.modulo===m.n;
        var tot=m.items.length,listas=m.publicadas;
        return '<li class="rt-m'+(m.completo?' hecho':'')+(actual?' actual':'')+'"'+(actual?' aria-current="step"':'')+'>'+
          '<span class="rt-m-n" aria-hidden="true">'+(m.completo?'✓':m.n)+'</span>'+
          '<div class="rt-m-c"><h3><span class="vh">Módulo '+m.n+': </span>'+esc(m.titulo)+(actual?' <span class="rt-aqui">Vas aquí</span>':'')+'</h3>'+
          '<p class="rt-m-meta">'+esc(m.meta)+'</p>'+
          '<p class="rt-m-est">'+m.hechas+' de '+tot+' terminados'+(listas<tot?' · '+(tot-listas)+' por publicar':'')+'</p>'+
          '<ul class="exp rt-l">'+m.items.map(item).join('')+'</ul></div></li>';
      }).join('')+'</ol></section>';
  }).join('');
}
pintar();
AT.avance.on(pintar);
/* Al volver con «atrás» desde una lección, el navegador puede mostrar una copia vieja: se actualiza */
window.addEventListener('pageshow',function(e){if(e.persisted)location.reload()});
/* Si se llega con #id de una ruta, se va a ella después de dibujar */
if(location.hash.length>1){var d=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(d)d.scrollIntoView({block:'start'})}
})();
