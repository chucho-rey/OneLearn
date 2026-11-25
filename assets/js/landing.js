/* OneBook: página de bienvenida (index.html).
   - Quien ya usa OneBook en este navegador (hay datos con el prefijo aprende-tecnologia:) va directo a su Inicio
     (inicio.html), antes de pintar nada. Con ?conoce se queda aquí, por ejemplo para compartir la página.
   - index.html: dibuja con bloques reales (bloques.js y pagos.js) la página de ejemplo y el plan de pagos para
     probar. «Guárdalo en tu espacio» deja el plan en sessionStorage y abre entrar.html?perfil=negocio#guardar-pagos:
     al crear el espacio se abre inicio.html#guardar-pagos, donde crear.js lo convierte en un documento (si ya hay
     espacio, entrar.html pasa directo al Inicio). También la calculadora de precio de venta (negocio.js y precio.js,
     AT.negocio.formulario). Ver esta página no guarda nada en localStorage.
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
if(!/[?&]conoce\b/.test(location.search)&&usaLaApp()){
  location.replace('inicio.html'+location.hash);
  return;
}
function $(id){return document.getElementById(id)}

/* ---------- index.html: bloques de ejemplo ---------- */
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function txt(t,marcas){var x={type:'text',text:t};if(marcas)x.marks=marcas.map(function(m){return {type:m}});return x}
function P(){return {type:'paragraph',content:[].slice.call(arguments)}}
function tarea(t,hecha){return {type:'taskItem',attrs:{checked:!!hecha},content:[P(txt(t))]}}
function celda(t,cab){return {type:cab?'tableHeader':'tableCell',content:[P(txt(t))]}}
function fila(cs,cab){return {type:'tableRow',content:cs.map(function(c){return celda(c,cab)})}}
/* El refrigerador se empezó a pagar hace tres meses, así el ejemplo nunca se ve viejo */
function planEjemplo(){
  var h=new Date(),ini=new Date(h.getFullYear(),h.getMonth()-3,15),pagados={1:iso(ini)};
  for(var k=2;k<=3;k++)pagados[k]=iso(new Date(h.getFullYear(),h.getMonth()-4+k,15));
  if(h.getDate()>=15)pagados[4]=iso(new Date(h.getFullYear(),h.getMonth(),15));
  return {titulo:'Refrigerador nuevo',modo:'plazos',monto:'18000',pagos:'12',frecuencia:'mensual',inicio:iso(ini),pagados:pagados};
}
function hojaEjemplo(){
  var cont=$('lpHoja'),AT=window.AT;
  if(!cont||!AT||!AT.bloques)return;
  var doc={formato:1,tipo:'notas',id:'d-ejemplo',titulo:'Abarrotes Lupita',contenido:{type:'doc',content:[
    {type:'callout',attrs:{variante:'aviso'},content:[P(txt('Hoy: '),txt('pagarle al proveedor de refrescos',['bold']),txt(' antes de las 2.'))]},
    P(txt('Apertura',['bold'])),
    {type:'taskList',content:[tarea('Abrir caja con $500 de fondo',true),tarea('Revisar los refrigeradores',true),tarea('Pedir 20 garrafones')]},
    {type:'pagos',attrs:planEjemplo()},
    P(txt('Por surtir',['bold'])),
    {type:'table',content:[fila(['Producto','Quedan','Mínimo'],true),fila(['Refresco 600 ml','8','24']),fila(['Garrafón 20 L','2','10']),fila(['Pan de caja','3','6'])]}
  ]}};
  AT.bloques.dibujar(doc,cont,{encabezado:false});
}

/* ---------- index.html: el plan de pagos para probar ---------- */
var CLAVE_GUARDAR='onebook:pagos-bienvenida';
function prueba(){
  var AT=window.AT,form=$('lpForm'),cont=$('lpPlan');
  if(!form||!cont||!AT||!AT.pagos)return;
  if(!$('lpInicio').value)$('lpInicio').value=iso(new Date());
  var pagados={},voz=null;
  function attrs(){
    return {titulo:'Mi plan de pagos',modo:'plazos',monto:$('lpMonto').value.trim(),pagos:String($('lpPagos').value||''),
      frecuencia:$('lpFrec').value,inicio:$('lpInicio').value,pagados:pagados};
  }
  function pintar(){
    var a=attrs(),c=AT.pagos.calcular(a);
    /* Lo marcado de más (si bajas el número de pagos) se olvida */
    Object.keys(pagados).forEach(function(k){if(+k>c.n)delete pagados[k]});
    var v=AT.pagos.vista(a,{editable:true,marcar:function(k,marcado){
      if(marcado)pagados[k]=AT.pagos.hoy();else delete pagados[k];
      decir();
      return Object.assign({},pagados);
    }});
    cont.replaceChildren(v);
    decir();
  }
  /* Un resumen corto para lectores de pantalla, sin leer toda la lista cada vez que teclean */
  function decir(){
    clearTimeout(voz);
    voz=setTimeout(function(){
      var c=AT.pagos.calcular(attrs());
      $('lpVoz').textContent=c.total?c.n+(c.n===1?' pago':' pagos')+' de '+AT.pagos.dinero(c.cuota)+'. Te faltan '+AT.pagos.dinero(c.resta)+'.':'Escribe cuánto debes.';
    },700);
  }
  form.addEventListener('input',pintar);
  form.addEventListener('submit',function(e){e.preventDefault()});
  $('lpGuardar').addEventListener('click',function(){
    try{sessionStorage.setItem(CLAVE_GUARDAR,JSON.stringify(attrs()))}catch(e){}
    location.href='entrar.html?perfil=negocio#guardar-pagos';
  });
  pintar();
}

/* ---------- index.html: la calculadora de precio de venta (el formulario del bloque, de negocio.js y precio.js) ---------- */
function calculadora(){
  var AT=window.AT,cont=$('lpPrecio');
  if(!cont||!AT||!AT.negocio)return;
  cont.replaceChildren(AT.negocio.formulario('precio',{costo:'10',ganancia:'30'}));
}

function listo(){
  hojaEjemplo();
  prueba();
  calculadora();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',listo);else listo();
})();
