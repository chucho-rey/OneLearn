/* OneLearn: página de bienvenida (index.html, la raíz del sitio).
   - Quien ya usa OneLearn en este navegador (hay datos con el prefijo aprende-tecnologia:) va directo a su Inicio
     (inicio.html), antes de pintar nada. Con ?conoce se queda aquí, por ejemplo para compartir esta página.
   - Las cifras (lecciones, ruta y proyectos) se cuentan del temario (catalogo.js), así no se quedan viejas.
   Se carga en el <head> de index.html, antes de ajustes.js; catalogo.js va al final del <body>. */
(function(){
'use strict';
function usaLaApp(){
  try{
    for(var i=0;i<localStorage.length;i++){
      if(String(localStorage.key(i)).indexOf('aprende-tecnologia:')===0)return true;
    }
  }catch(e){}
  return false;
}
if(!/[?&]conoce\b/.test(location.search)&&usaLaApp()){
  location.replace('inicio.html'+location.hash);
  return;
}
function contar(){
  var AT=window.AT||{},n=0,ruta=0;
  (AT.catalogo||[]).forEach(function(g){(g.lecciones||[]).forEach(function(l){if(l.archivo)n++})});
  var c=(AT.caminos||[])[0];
  if(c)(c.modulos||[]).forEach(function(m){(m.lecciones||[]).forEach(function(){ruta++})});
  function poner(id,v){var e=document.getElementById(id);if(e&&v)e.textContent=String(v)}
  poner('lpLecciones',n);
  poner('lpRuta',ruta);
  poner('lpProyectos',(AT.proyectos||[]).length);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',contar);else contar();
})();
