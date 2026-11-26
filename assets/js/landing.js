/* OneBook: página de bienvenida para empresas (index.html, etapa E5).
   - Quien ya usa OneBook en este navegador (hay datos con el prefijo aprende-tecnologia:) va directo a su Inicio
     (inicio.html), antes de pintar nada. Con ?conoce se queda aquí, por ejemplo para compartir la página.
   - «Explora una empresa de ejemplo» abre ejemplo.html, que la arma en un navegador sin espacio. Si este navegador ya
     tiene una empresa (se llegó con ?conoce), la nota lo dice: el ejemplo no la toca y conviene una ventana privada.
   - La calculadora de precio de venta (negocio.js y precio.js, AT.negocio.formulario). Ver esta página no guarda nada.
   Se carga en el <head>, antes de ajustes.js; lo demás corre al terminar de cargar la página. */
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
var usa=usaLaApp();
if(!/[?&]conoce\b/.test(location.search)&&usa){
  location.replace('inicio.html'+location.hash);
  return;
}
function $(id){return document.getElementById(id)}

/* ---------- La empresa de ejemplo con un espacio ya creado ---------- */
function ejemplo(){
  var nota=$('lpEjNota');
  if(!usa||!nota)return;
  var p=null;try{p=JSON.parse(localStorage.getItem('aprende-tecnologia:perfil')||'null')}catch(e){}
  if(p&&p.ejemplo){nota.textContent='Ya la tienes abierta en este navegador: «Abrir la empresa de ejemplo» te lleva a su Inicio.';return}
  nota.textContent='Este navegador ya tiene tu empresa y el ejemplo no la va a tocar: para explorarlo, abre esta página en una ventana privada (o de incógnito).';
}

/* ---------- La calculadora de precio de venta (el formulario del bloque, de negocio.js y precio.js) ---------- */
function calculadora(){
  var AT=window.AT,cont=$('lpPrecio');
  if(!cont||!AT||!AT.negocio)return;
  cont.replaceChildren(AT.negocio.formulario('precio',{costo:'10',ganancia:'30'}));
}

function listo(){
  ejemplo();
  calculadora();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',listo);else listo();
})();
