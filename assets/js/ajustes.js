/* Ajustes de lectura de OneBook.
   Se carga en el <head>, antes de pintar, para que el tema, el contraste, el tamaño de texto y la barra lateral
   se apliquen sin parpadeo. Guarda las preferencias en este dispositivo (localStorage) y las expone como
   AT.ajustes para el resto del sitio:
     AT.ajustes.get('tema')            -> 'auto' | 'light' | 'dark'
     AT.ajustes.set('escala', 1.15)    -> guarda, aplica y avisa a quien escuche
     AT.ajustes.on(function(todos){})  -> se llama tras cada cambio
   Cada ajuste se refleja en un atributo de <html> que usa base.css:
     data-theme, data-contrast, data-fuente, data-interlineado, data-espaciado, data-ancho, la clase side-collapsed
     y el tamaño de letra raíz (todo el CSS está en rem). */
(function(){
  'use strict';
  var AT=window.AT=window.AT||{};
  var KEY='aprende-tecnologia:ajustes';
  var root=document.documentElement;
  var DEF={tema:'auto',contraste:'auto',escala:1,fuente:'normal',interlineado:'normal',espaciado:'normal',ancho:'normal',barra:'abierta',pestana:'temas',nota:'abajo'};
  /* Los que se restablecen desde el panel Lectura (la barra lateral, su pestaña y la posición de la nota no son de lectura) */
  var LECTURA=['tema','contraste','escala','fuente','interlineado','espaciado','ancho'];
  var OK={
    tema:['auto','light','dark'],
    contraste:['auto','normal','high'],
    escala:[0.9,1,1.15,1.3,1.5],
    fuente:['normal','atkinson','opendyslexic'],
    interlineado:['normal','amplio'],
    espaciado:['normal','amplio'],
    ancho:['estrecho','normal','amplio','completo'],
    barra:['abierta','cerrada'],
    pestana:['temas','apuntes','comunidad'],
    nota:['abajo','derecha']
  };

  function leer(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function escribir(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function borrar(k){try{localStorage.removeItem(k)}catch(e){}}

  var a={};
  for(var k in DEF)a[k]=DEF[k];
  var raw=leer(KEY);
  if(raw){
    try{
      var g=JSON.parse(raw);
      for(var k2 in DEF)if(g&&OK[k2].indexOf(g[k2])>=0)a[k2]=g[k2];
    }catch(e){}
  }else{
    /* Migra las claves sueltas de la versión anterior */
    var t=leer('aprende-tecnologia:tema'),s=leer('aprende-tecnologia:barra');
    if(t==='light'||t==='dark')a.tema=t;
    if(s==='cerrada')a.barra='cerrada';
    if(t||s){
      escribir(KEY,JSON.stringify(a));
      borrar('aprende-tecnologia:tema');borrar('aprende-tecnologia:barra');
    }
  }

  var mqContraste=window.matchMedia?window.matchMedia('(prefers-contrast: more)'):null;
  function contrasteAlto(){
    if(a.contraste==='high')return true;
    if(a.contraste==='normal')return false;
    return !!(mqContraste&&mqContraste.matches);
  }
  function attr(n,v){if(v===null)root.removeAttribute(n);else root.setAttribute(n,v)}
  function aplicar(){
    attr('data-theme',a.tema==='auto'?null:a.tema);
    attr('data-contrast',contrasteAlto()?'high':null);
    attr('data-fuente',a.fuente==='normal'?null:a.fuente);
    attr('data-interlineado',a.interlineado==='normal'?null:a.interlineado);
    attr('data-espaciado',a.espaciado==='normal'?null:a.espaciado);
    attr('data-ancho',a.ancho==='normal'?null:a.ancho);
    root.style.fontSize=a.escala===1?'':(a.escala*100)+'%';
    root.classList.toggle('side-collapsed',a.barra==='cerrada');
  }

  var oyentes=[];
  function avisar(){
    var copia={};
    for(var k in a)copia[k]=a[k];
    oyentes.forEach(function(fn){try{fn(copia)}catch(e){}});
  }
  AT.ajustes={
    opciones:OK,
    get:function(k){return a[k]},
    todos:function(){var c={};for(var k in a)c[k]=a[k];return c},
    set:function(k,v){
      if(!OK[k]||OK[k].indexOf(v)<0||a[k]===v)return;
      a[k]=v;
      escribir(KEY,JSON.stringify(a));
      aplicar();avisar();
    },
    /* Vuelve los ajustes de lectura a sus valores iniciales, en un solo cambio */
    restablecer:function(){
      var cambio=false;
      LECTURA.forEach(function(k){if(a[k]!==DEF[k]){a[k]=DEF[k];cambio=true}});
      if(!cambio)return;
      escribir(KEY,JSON.stringify(a));
      aplicar();avisar();
    },
    esInicial:function(){return LECTURA.every(function(k){return a[k]===DEF[k]})},
    contrasteAlto:contrasteAlto,
    sistemaPideContraste:function(){return !!(mqContraste&&mqContraste.matches)},
    on:function(fn){oyentes.push(fn)}
  };

  if(mqContraste){
    var cambio=function(){if(a.contraste==='auto'){aplicar();avisar()}};
    if(mqContraste.addEventListener)mqContraste.addEventListener('change',cambio);
    else if(mqContraste.addListener)mqContraste.addListener(cambio);
  }
  /* Otra pestaña cambió los ajustes */
  window.addEventListener('storage',function(e){
    if(e.key!==KEY||!e.newValue)return;
    try{
      var g=JSON.parse(e.newValue);
      for(var k in DEF)if(OK[k].indexOf(g[k])>=0)a[k]=g[k];
      aplicar();avisar();
    }catch(x){}
  });

  aplicar();
})();
