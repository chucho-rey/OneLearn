/* Pantalla de inicio de OneBook (de una empresa):
   - El nombre del negocio y la fecha; un aviso, una vez, a quien venía de un espacio de estudio o de «Mis finanzas»
     (lo de estudio se separó de OneBook; sus datos siguen en este navegador y en el respaldo).
   - Fase F5: acciones rápidas (el corte de hoy, una venta, el fiado, un gasto; abren la página que ya tienes, con
     documento.html#agregar=<bloque>, o la crean), «Prepara tu negocio» (una lista que se marca sola al revisar tus
     páginas; se puede ocultar) y páginas listas para usar (AT.crear.plantillasInicio).
   - «Tus páginas» es un explorador (explorador.js): ubicaciones, columnas (modificado, tipo, quién la tiene abierta,
     permisos y tamaño), buscar, ordenar y el menú de cada página.
   - Fase F7e: «Mi negocio» arriba: una página de bloques (d-minegocio) que se crea sola con indicadores, próximos
     vencimientos y el resumen del inventario, y que se edita como cualquier página («Editar esta sección»); no sale
     entre tus páginas. Con recursos humanos, igual «Tu equipo» (d-miequipo, con el resumen de tu equipo) y dos
     acciones rápidas más: anotar falta o vacaciones y la nómina.
   Usa AT.datos (datos.js). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico;
var PER=AT.perfil;

function saludo(){
  var h=new Date().getHours();
  return h>=5&&h<12?'Buenos días':h>=12&&h<19?'Buenas tardes':'Buenas noches';
}
var docsCache=[];
function hayPaginas(){return docsCache.some(function(d){return d.id!==MI&&d.id!==EQ&&!(AT.datos.deEstudio&&AT.datos.deEstudio(d))})}

/* Aviso, una vez, para quien venía de un espacio de estudio o de «Mis finanzas» (perfil.js lo deja en aviso) */
function pintarAviso(){
  var caja=$('#iniAviso');if(!caja)return;
  var a=PER&&PER.aviso?PER.aviso():'';
  caja.hidden=!a;
  if(!a)return;
  $('#iniAvisoTxt').textContent=a==='estudio'?
    'Lo de estudio (lecciones, rutas, libretas, apuntes y tesis) se separó y ya no está aquí. Lo que guardaste no se borró: sigue en este navegador y entra en tus respaldos; tus páginas de estudio están en «De estudio», solo para leer. Descarga un respaldo para conservarlo.':
    'Las plantillas de finanzas personales se fueron, pero tus páginas siguen aquí tal como las dejaste. Descarga un respaldo de vez en cuando.';
}
$('#iniAvisoResp').addEventListener('click',function(){
  AT.datos.descargar().then(function(){AT.aviso('Respaldo descargado. Guárdalo en tu nube o en una memoria USB.')},function(){AT.aviso('No se pudo crear el respaldo. Inténtalo otra vez.')});
});
$('#iniAvisoOk').addEventListener('click',function(){if(PER&&PER.quitarAviso)PER.quitarAviso();pintarAviso();$('#t-docs').focus()});
var docsListos=false;
/* docsCache: las páginas que puedes ver (con salas); todosCache: todas, para no volver a crear las del Inicio */
var todosCache=[];
function cargarDocs(){return AT.datos.documentos.todos().then(function(l){todosCache=l;docsCache=l.filter(function(d){return !AT.datos.acceso||AT.datos.acceso.puede(d,'ver')});docsListos=true})}

/* ---------- Mi negocio (fase F7e): una página de bloques arriba del Inicio ---------- */
var MI='d-minegocio';
function esNegocio(){return !!(PER&&PER.tipo()==='negocio'&&PER.tiene('negocio')&&AT.bloques&&AT.bloques.dibujar)}
function miNegocioNuevo(){
  var n=function(){return AT.bloques.nuevoId()},ahora=new Date().toISOString();
  function P(t){return {type:'paragraph',attrs:{id:n()},content:[{type:'text',text:t}]}}
  function H(t){return {type:'heading',attrs:{id:n(),level:2},content:[{type:'text',text:t}]}}
  return {formato:1,tipo:'notas',id:MI,titulo:'Mi negocio',props:[],creado:ahora,editado:ahora,contenido:{type:'doc',content:[
    P('Tu negocio de un vistazo: esta página es tu Inicio. Agrégale con «/» lo que quieras ver al abrir OneBook (un reporte, tus pendientes) o quita lo que no uses.'),
    {type:'indicadores',attrs:{id:n(),cfg:null}},
    H('Próximos vencimientos'),{type:'vencimientos',attrs:{id:n(),cfg:{dias:30}}},
    H('Inventario'),{type:'inventario',attrs:{id:n(),titulo:''}}
  ]}};
}
/* Tu equipo (módulo de recursos humanos): otra página de bloques (d-miequipo), igual que «Mi negocio» */
var EQ='d-miequipo';
function esEquipo(){return !!(esNegocio()&&PER.tiene('rh')&&AT.equipo)}
/* «Tu equipo» trae sueldos: vive en la sala de Recursos humanos (si hay un departamento con ese nombre) o en
   Privado del propietario de la empresa */
function accesoEquipo(){
  var E=AT.empresa;if(!E||!E.existe())return null;
  var rh=E.departamentos().filter(function(d){return /^recursos humanos$|^rh$/i.test(d.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim())})[0];
  var pr=E.personas().filter(function(p){return p.rol==='propietario'})[0];
  return {dueno:pr?{id:pr.id,nombre:pr.nombre,correo:pr.correo}:AT.datos.yo(),personas:[],solicitudes:[],sala:rh?E.salaDeDepto(rh.id):'privado',empresa:E.id(),cambio:new Date().toISOString()};
}
function miEquipoNuevo(){
  var n=function(){return AT.bloques.nuevoId()},ahora=new Date().toISOString(),acc=accesoEquipo();
  return {formato:1,tipo:'notas',id:EQ,titulo:'Tu equipo',props:[],creado:ahora,editado:ahora,acceso:acc||undefined,contenido:{type:'doc',content:[
    {type:'paragraph',attrs:{id:n()},content:[{type:'text',text:'Quién falta hoy, cumpleaños, aniversarios, vacaciones y lo que te cuesta tu equipo. Agrega a tu equipo y anota sus faltas o vacaciones desde «Mi equipo» (Crear → Recursos humanos).'}]},
    {type:'equipo',attrs:{id:n(),titulo:''}}
  ]}};
}
/* Una página de bloques arriba del Inicio: se crea una sola vez y se dibuja viva */
var PAGINAS_INI=[
  {id:MI,sec:'#iniNegocio',caja:'#iniNegocioC',ver:esNegocio,nueva:miNegocioNuevo,pintado:'',creando:false},
  {id:EQ,sec:'#iniEquipo',caja:'#iniEquipoC',ver:esEquipo,nueva:miEquipoNuevo,pintado:'',creando:false}
];
function pintarPaginaIni(P){
  var sec=$(P.sec);if(!sec)return;
  var ver=P.ver();sec.hidden=!ver;if(!ver)return;
  var d=docsCache.filter(function(x){return x.id===P.id})[0];
  /* Existe, pero no la puedes ver (por ejemplo, «Tu equipo» en la sala de Recursos humanos) */
  if(!d&&todosCache.some(function(x){return x.id===P.id})){sec.hidden=true;return}
  /* «Tu equipo» de antes (sin lista de acceso, en la General) pasa una vez a su sala o a Privado */
  if(d&&d.id===EQ&&!d.acceso&&!P.ubicando){var acc=accesoEquipo();if(acc){P.ubicando=true;d.acceso=acc;AT.datos.documentos.guardar(d,{conservarFecha:true}).then(function(){P.ubicando=false;recargar()},function(){P.ubicando=false})}}
  if(!d){
    /* Solo si de verdad no existe (todavía no se leen tus páginas, o se creó en otra pestaña): nunca la pisa */
    if(P.creando||!docsListos)return;P.creando=true;
    AT.datos.documentos.leer(P.id).then(function(ya){return ya||AT.datos.documentos.guardar(P.nueva(),{conservarFecha:true})})
      .then(function(){P.creando=false;recargar()},function(){P.creando=false});
    return;
  }
  /* Se vuelve a dibujar solo si la página cambió (sus bloques se actualizan solos) */
  var clave=d.editado+'|'+JSON.stringify(d.contenido).length;
  if(clave===P.pintado)return;
  P.pintado=clave;
  var c=$(P.caja);c.innerHTML='';
  AT.bloques.dibujar(d,c,{encabezado:false});
}
function pintarMiNegocio(){PAGINAS_INI.forEach(pintarPaginaIni)}
/* Recordatorio de respaldo: si tienes páginas y no descargas un respaldo desde hace 14 días
   (o nunca), Inicio lo sugiere. «Recordármelo en una semana» lo pospone 7 días. Un espacio recién creado
   (menos de 3 días, perfil.js) todavía no lo pide: sus páginas acaban de salir de las plantillas. */
var CLAVE_POSPONER='aprende-tecnologia:recordar-respaldo',DIA=864e5;
function pintarRespaldo(){
  var caja=$('#iniRespaldo');if(!caja)return;
  var ult=AT.datos.ultimoRespaldo(),hasta=0;
  try{hasta=+localStorage.getItem(CLAVE_POSPONER)||0}catch(e){}
  var dias=ult?Math.floor((Date.now()-new Date(ult).getTime())/DIA):null;
  var pf=PER&&PER.actual(),nuevo=pf&&!pf.migrado&&(Date.now()-new Date(pf.creado+'T00:00:00').getTime())<3*DIA;
  var mostrar=hayPaginas()&&(dias===null||dias>=14)&&Date.now()>=hasta&&!(nuevo&&dias===null);
  caja.hidden=!mostrar;
  if(mostrar)$('#iniRespaldoTxt').textContent=(dias===null?'Todavía no has descargado ningún respaldo.':'Tu último respaldo es de hace '+dias+' días.')+
    ' Tus páginas solo viven en este navegador: si se borran sus datos, se pierden. Descarga un respaldo y guárdalo en otro lugar.';
}
$('#iniRespaldoSi').addEventListener('click',function(){
  AT.datos.descargar().then(function(){pintarRespaldo();AT.aviso('Respaldo descargado. Guárdalo en tu nube o en una memoria USB.')},function(){AT.aviso('No se pudo crear el respaldo. Inténtalo otra vez.')});
});
$('#iniRespaldoNo').addEventListener('click',function(){
  try{localStorage.setItem(CLAVE_POSPONER,String(Date.now()+7*DIA))}catch(e){}
  pintarRespaldo();$('#t-docs').focus();
});

/* Tus páginas: el explorador (explorador.js), sin «Mi negocio» ni «Tu equipo», que ya están arriba */
function pintarDocs(){
  if(!AT.explorador)return;
  var ocultos={};
  if(esNegocio())ocultos[MI]=1;
  if(esEquipo())ocultos[EQ]=1;
  AT.explorador.datos(docsCache.filter(function(d){return !ocultos[d.id]}),{vacio:'Todavía no tienes páginas. Crea la primera con «Nuevo» o con una de las que están aquí abajo. Se guardan en este dispositivo.'});
}

/* ---------- Acciones rápidas y «Prepara tu negocio» (fase F5) ---------- */
/* Los bloques de un tipo en tus páginas: [{doc, attrs}], de la página editada más recientemente a la más vieja */
function bloquesDe(tipo){
  var out=[];
  docsCache.slice().sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:1}).forEach(function(d){
    ((d.contenido||{}).content||[]).forEach(function(b){if(b&&b.type===tipo)out.push({doc:d,attrs:b.attrs||{}})});
  });
  return out;
}
/* Abre la página que ya tiene ese bloque (el corte agrega el de hoy si falta) o crea una con su plantilla */
function irA(bloque,plantilla){
  var b=bloquesDe(bloque)[0];
  if(b){location.href='documento.html?id='+encodeURIComponent(b.doc.id)+'#agregar='+bloque;return Promise.resolve()}
  return AT.crear.nuevo(plantilla||bloque);
}
var ACCIONES={
  negocio:[
    {k:'corte',t:'Corte de hoy',i:'caja',f:function(){return irA('corte')}},
    {k:'venta',t:'Nueva venta',i:'venta',f:function(){return AT.crear.nuevo('venta')}},
    {k:'fiado',t:'Anotar fiado',i:'fiado',f:function(){return irA('fiado')}},
    {k:'gasto',t:'Anotar un gasto',i:'gastos',f:function(){return irA('gastos')}}],
  /* Con recursos humanos (se agregan a las de negocio) */
  rh:[
    {k:'incidencia',t:'Anotar falta o vacaciones',i:'users',f:function(){return AT.equipo.anotar()}},
    {k:'nomina',t:'Nómina de la quincena',i:'recibo',f:function(){return AT.crear.nuevo('nominas')}}]
};
function acciones(){
  var l=ACCIONES[PER&&PER.tipo()];
  if(l&&PER.tipo()==='negocio'&&PER.tiene('rh')&&AT.equipo)l=l.concat(ACCIONES.rh);
  return l;
}
function pintarAcciones(){
  var l=acciones();
  $('#iniRapidas').hidden=!l||!AT.crear||!PER.tiene('negocio');
  if($('#iniRapidas').hidden)return;
  $('#iniAcciones').innerHTML=l.map(function(a){
    return '<button type="button" class="ini-acc-b" data-accion="'+a.k+'">'+ico(a.i)+'<span>'+esc(a.t)+'</span></button>';
  }).join('');
}
$('#iniAcciones').addEventListener('click',function(e){
  var b=e.target.closest('[data-accion]');if(!b||b.getAttribute('aria-disabled')==='true')return;
  var a=(acciones()||[]).filter(function(x){return x.k===b.getAttribute('data-accion')})[0];if(!a)return;
  b.setAttribute('aria-disabled','true');
  /* Las que abren una ventana aquí mismo vuelven a quedar listas al cerrarla */
  Promise.resolve(a.f()).then(function(){if(a.k==='incidencia')b.removeAttribute('aria-disabled')},
    function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo abrir. Inténtalo otra vez.')});
});
function cent(v){var n=parseFloat(String(v==null?'':v).replace(/[$,\s]/g,''));return isFinite(n)&&n>0?Math.round(n*100):0}
var CLAVE_PREPARA='aprende-tecnologia:prepara';
/* Cada paso se marca solo al revisar tus páginas */
var PASOS=[
  {k:'corte',t:'Haz tu primer corte de caja',d:'Anota las ventas del día y cuenta la caja.',hecho:function(){
    return bloquesDe('corte').some(function(b){var v=b.attrs.ventas||{};return cent(v.efectivo)+cent(v.tarjeta)+cent(v.transferencia)+cent(v.otras)>0||String(b.attrs.contado||'').trim()!==''})},
    f:function(){return irA('corte')},b:'Hacer el corte'},
  {k:'gastos',t:'Anota tus gastos fijos',d:'Renta, luz, internet: una vez, y «Generar mes» los agrega cada mes.',hecho:function(){
    return bloquesDe('gastos').some(function(b){return (b.attrs.fijos||[]).some(function(f){return f&&(String(f.concepto||'').trim()||cent(f.monto))})})},
    f:function(){return irA('gastos')},b:'Anotar gastos'},
  {k:'fiado',t:'Anota a quién le fías',d:'Cada cliente con lo que se lleva y sus abonos.',hecho:function(){
    return bloquesDe('fiado').some(function(b){return (b.attrs.clientes||[]).some(function(c){return c&&String(c.nombre||'').trim()})})},
    f:function(){return irA('fiado')},b:'Abrir el fiado'},
  {k:'venta',t:'Haz tu primera nota de venta',d:'Con folio, para imprimirla o mandarla en PDF.',hecho:function(){
    return bloquesDe('venta').some(function(b){return (b.attrs.conceptos||[]).some(function(c){return c&&(String(c.desc||'').trim()||cent(c.precio))})})},
    f:function(){return AT.crear.nuevo('venta')},b:'Nueva venta'},
  {k:'respaldo',t:'Descarga un respaldo',d:'Una copia de todo en un archivo, por si cambias de celular.',hecho:function(){return !!AT.datos.ultimoRespaldo()},
    f:function(){return AT.datos.descargar().then(function(){AT.aviso('Respaldo descargado. Guárdalo en tu nube o en una memoria USB.');pintar()})},b:'Descargar respaldo'}
];
function pintarPrepara(){
  var caja=$('#iniPrepara'),oculta=false;
  try{oculta=localStorage.getItem(CLAVE_PREPARA)==='oculta'}catch(e){}
  caja.hidden=oculta||!PER||PER.tipo()!=='negocio'||!PER.tiene('negocio');
  if(caja.hidden)return;
  var hechos=0;
  $('#iniPrepLista').innerHTML=PASOS.map(function(p){
    var h=false;try{h=p.hecho()}catch(e){}
    if(h)hechos++;
    return '<li class="ini-prep-i'+(h?' hecho':'')+'"><span class="ini-prep-c" aria-hidden="true">'+(h?ico('check'):'')+'</span>'+
      '<span class="ini-prep-t"><b>'+esc(p.t)+'</b><small>'+(h?'Hecho.':esc(p.d))+'</small></span>'+
      (h?'<span class="vh">Hecho</span>':'<button class="btn" type="button" data-paso="'+p.k+'">'+esc(p.b)+'</button>')+'</li>';
  }).join('');
  $('#iniPrepN').textContent=hechos===PASOS.length?'¡Listo!':hechos+' de '+PASOS.length;
  $('#iniPrepBar').style.width=Math.round(hechos/PASOS.length*100)+'%';
}
$('#iniPrepLista').addEventListener('click',function(e){
  var b=e.target.closest('[data-paso]');if(!b||b.getAttribute('aria-disabled')==='true')return;
  var p=PASOS.filter(function(x){return x.k===b.getAttribute('data-paso')})[0];if(!p)return;
  b.setAttribute('aria-disabled','true');
  p.f().then(function(){b.removeAttribute('aria-disabled')},function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo. Inténtalo otra vez.')});
});
$('#iniPrepOcultar').addEventListener('click',function(){
  try{localStorage.setItem(CLAVE_PREPARA,'oculta')}catch(e){}
  pintarPrepara();$('#t-docs').focus();
  AT.aviso('Lista oculta. Todo lo que tiene está en «Crear» y en tus páginas.');
});

function pintarInstalar(){
  var sec=$('#instalar'),btn=$('#instalarBtn'),txt=$('#instalarTxt');
  if(AT.app.instalada()){sec.hidden=true;return}
  if(AT.app.evento){
    sec.hidden=false;btn.hidden=false;
    txt.textContent='Ábrelo como una app, desde tu pantalla de inicio, y úsalo sin conexión.';
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

/* Páginas listas para usar: un botón por plantilla, que la crea y la abre */
function pintarPlantillas(){
  var c=$('#iniPlantillas');if(!c||!AT.crear||!AT.crear.plantillasInicio)return;
  c.innerHTML=AT.crear.plantillasInicio().map(function(k){
    var t=AT.tiposDoc[k];
    return '<button type="button" class="ini-pl" data-nuevo="'+esc(k)+'">'+ico(t.icono)+'<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small></span></button>';
  }).join('');
}
$('#iniPlantillas').addEventListener('click',function(e){
  var b=e.target.closest('[data-nuevo]');
  if(!b||b.getAttribute('aria-disabled')==='true')return;
  b.setAttribute('aria-disabled','true');
  AT.crear.nuevo(b.getAttribute('data-nuevo')).catch(function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo crear la página. Inténtalo otra vez.')});
});
/* Saludo: el nombre de la empresa, el saludo con el nombre de quien entra y la fecha; sin nombre de empresa,
   «Buenos días» y tu nombre */
function pintarSaludo(){
  var E=AT.empresa,emp=E&&E.leer(),yo=E&&E.activa(),fecha=new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
  var nombre=emp&&emp.nombre||(PER?PER.nombre():''),tu=yo&&yo.nombre?yo.nombre.split(' ')[0]:'';
  if(PER&&PER.tipo()==='negocio'&&nombre){
    $('#saludo').textContent=nombre;
    $('#iniSub').textContent=saludo()+(tu?', '+tu:'')+' · '+fecha;
  }else{
    $('#saludo').textContent=saludo()+(nombre?', '+nombre:'');
    $('#iniSub').textContent=fecha.charAt(0).toUpperCase()+fecha.slice(1);
  }
}
/* La computadora no sabe quién la usa (por ejemplo, después de que te quitaron de la empresa): que elijas quién eres */
function pintarQuien(){
  var c=$('#iniQuien'),E=AT.empresa;if(!c)return;
  c.hidden=!(E&&E.existe()&&!E.activa()&&AT.persona);
}
$('#iniQuienB').addEventListener('click',function(){if(AT.persona)AT.persona.abrir(this)});
function pintar(){pintarQuien();pintarMiNegocio();pintarAviso();pintarRespaldo();pintarDocs();pintarInstalar();pintarPrepara()}
function recargar(){cargarDocs().then(pintar)}
pintarSaludo();
pintarAcciones();
pintarPlantillas();
pintar();
recargar();
AT.datos.on(function(c){if(c.almacen==='documentos'||c.almacen==='*')recargar()});
if(AT.empresa)AT.empresa.on(function(){pintarSaludo();pintarQuien()});
/* Al volver con «atrás» desde una página, el navegador puede mostrar una copia vieja: se actualiza */
window.addEventListener('pageshow',function(e){if(e.persisted)location.reload()});
})();
