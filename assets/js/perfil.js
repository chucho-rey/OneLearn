/* OneBook: el perfil de tu espacio y sus módulos (fase F2).
   Un espacio tiene un perfil y los módulos que ese perfil enciende. El núcleo (páginas, notas, tablas, imágenes,
   imprimir, respaldo, búsqueda y ajustes) está siempre; lo demás se ve solo si su módulo está encendido:
     negocio  bloques y plantillas de negocio y dinero (plan de pagos y los bloques de la tienda, con sus plantillas)
     estudio  lecciones, rutas, proyectos, libretas, apuntes de clase, tesis y las herramientas académicas
   Perfiles: negocio (negocio), personal (negocio, para tus finanzas) y estudio (estudio). Desde «Tu espacio»
   (entrar.html?editar) se puede cambiar el perfil y encender o apagar módulos.
   Se guarda en localStorage (aprende-tecnologia:perfil):
     {perfil, modulos:[...], nombre, negocio:{nombre, giro, telefono} o null, creado:'AAAA-MM-DD', migrado}
   - Quien ya usaba OneLearn (hay datos con el prefijo aprende-tecnologia: y no hay perfil) queda con el perfil
     estudio y los módulos estudio y negocio: no pierde nada de lo que tenía.
   - Sin perfil, inicio.html manda a entrar.html («Crea tu espacio») antes de pintar, con lo que traiga la dirección;
     con perfil, entrar.html manda a inicio.html (salvo con ?editar, para cambiar el espacio).
   - En <html> pone las clases con-<módulo> o sin-<módulo> (base.css oculta .m-estudio, .m-negocio, .m-rh y .m-sin-estudio).
   - Módulos: negocio, estudio y rh (recursos humanos: tu equipo y las calculadoras de nómina; se enciende en un
     negocio con «Tengo empleados» o al editar tu espacio).
     Sin perfil (alguien que llega directo a una lección) se ve todo, como antes.
   Se carga en el <head> de todas las páginas, después de ajustes.js. Expone AT.perfil. */
(function(){
'use strict';
var AT=window.AT=window.AT||{};
var CLAVE='aprende-tecnologia:perfil',PREF='aprende-tecnologia:';
var MODULOS={
  negocio:{nombre:'Negocio y dinero',desc:'Corte de caja, fiado, gastos, notas de venta, precios y plan de pagos.'},
  estudio:{nombre:'Estudio',desc:'Lecciones de tecnología, rutas, proyectos, libretas, apuntes de clase y tesis.'},
  rh:{nombre:'Recursos humanos',desc:'Tu equipo, nómina, vacaciones, aguinaldo, finiquito y reparto de utilidades.'}
};
var PERFILES={
  negocio:{nombre:'Mi negocio',desc:'Corte de caja, fiado, gastos, notas de venta y surtido.',modulos:['negocio']},
  personal:{nombre:'Mis finanzas y notas',desc:'Deudas, gastos del mes y tus notas.',modulos:['negocio']},
  estudio:{nombre:'Estudiar',desc:'Lecciones con laboratorios, rutas, apuntes y tu tesis.',modulos:['estudio']}
};
var GIROS=[['tienda','Tienda o comercio'],['comida','Comida'],['servicios','Servicios'],['catalogo','Ventas por catálogo o redes'],
  ['freelance','Freelance o profesional independiente'],['otro','Otro']];

function texto(v,max){return typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):''}
function hoy(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
/* Solo entran campos conocidos y con forma válida (el perfil también llega de respaldos) */
function limpiar(p){
  if(!p||typeof p!=='object'||!PERFILES[p.perfil])return null;
  var mods=(Array.isArray(p.modulos)?p.modulos:PERFILES[p.perfil].modulos).filter(function(m,i,a){return MODULOS[m]&&a.indexOf(m)===i});
  var n=p.negocio&&typeof p.negocio==='object'?p.negocio:null,giros=GIROS.map(function(g){return g[0]});
  return {perfil:p.perfil,modulos:mods,nombre:texto(p.nombre,60),
    negocio:p.perfil==='negocio'?{nombre:texto(n&&n.nombre,80),giro:n&&giros.indexOf(n.giro)>=0?n.giro:'otro',telefono:texto(n&&n.telefono,30).replace(/[^\d+()\s-]/g,'')}:null,
    creado:/^\d{4}-\d{2}-\d{2}$/.test(p.creado)?p.creado:hoy(),migrado:!!p.migrado};
}
function leer(){try{return limpiar(JSON.parse(localStorage.getItem(CLAVE)||'null'))}catch(e){return null}}
function escribir(p){try{localStorage.setItem(CLAVE,JSON.stringify(p));return true}catch(e){return false}}
/* ¿Este navegador ya usaba OneLearn? (cualquier dato con el prefijo, salvo el perfil y las pestañas abiertas,
   que el contenedor guarda antes de que exista el espacio) */
function hayDatos(){
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=String(localStorage.key(i));
      if(k.indexOf(PREF)===0&&k!==CLAVE&&k!==PREF+'pestanas')return true;
    }
  }catch(e){}
  return false;
}

var perfil=leer();
if(!perfil&&hayDatos()){
  perfil={perfil:'estudio',modulos:['estudio','negocio'],nombre:'',negocio:null,creado:hoy(),migrado:true};
  escribir(perfil);
}
function clases(){
  var h=document.documentElement;
  Object.keys(MODULOS).forEach(function(m){
    var on=!perfil||perfil.modulos.indexOf(m)>=0;
    h.classList.toggle('con-'+m,on);h.classList.toggle('sin-'+m,!on);
  });
  if(perfil)h.setAttribute('data-perfil',perfil.perfil);else h.removeAttribute('data-perfil');
}
clases();

AT.perfil={
  MODULOS:MODULOS,PERFILES:PERFILES,GIROS:GIROS,
  actual:function(){return perfil},
  tipo:function(){return perfil?perfil.perfil:''},
  /* ¿Se ve este módulo? Sin perfil, todo (como antes de los perfiles) */
  tiene:function(m){return !m||m==='nucleo'||!perfil||perfil.modulos.indexOf(m)>=0},
  /* El nombre para el saludo: el del negocio o el de la persona */
  nombre:function(){return perfil?(perfil.negocio&&perfil.negocio.nombre)||perfil.nombre:''},
  giro:function(){return perfil&&perfil.negocio?perfil.negocio.giro:''},
  nombreGiro:function(g){var x=GIROS.filter(function(y){return y[0]===g})[0];return x?x[1]:''},
  limpiar:limpiar,
  /* Guarda el perfil (limpio). Devuelve el perfil guardado o null si no era válido */
  guardar:function(p){
    var l=limpiar(p);
    if(!l||!escribir(l))return null;
    perfil=l;clases();
    return l;
  }
};

/* Inicio sin perfil: primero «Crea tu espacio» (lo que traiga la dirección sigue en entrar.html) */
if(!perfil&&/\/inicio\.html$/.test(location.pathname)){
  location.replace('entrar.html'+location.search+location.hash);
}
/* «Crea tu espacio» con un espacio ya creado: al Inicio, salvo para cambiarlo (?editar) */
else if(perfil&&/\/entrar\.html$/.test(location.pathname)&&!/[?&]editar\b/.test(location.search)){
  location.replace('inicio.html'+location.hash);
}
})();
