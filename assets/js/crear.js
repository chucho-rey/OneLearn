/* OneBook: «Crear».
   Pregunta qué quieres crear y empieza el documento con la estructura de ese tipo. Cada tipo es de un módulo
   (perfil.js) y solo se ofrece si ese módulo está encendido:
     núcleo   notas
     negocio  pendientes del día, préstamo o crédito (plan de pagos), gastos del mes, lista para surtir y proveedores
     estudio  libreta de estudio, apuntes de clase y tesis (con fuentes, citas en APA 7 y registro de autoría)
   Los que no tienen «listo» se anuncian en «Llegan después».
   Todos los tipos usan el mismo formato de bloques (bloques.js), así que después se podrán convertir.
   Se abre desde «Crear» en la barra lateral y en el inicio. Expone AT.tiposDoc y AT.crear
   (abrir, cerrar, nuevo, armar, plantillasInicio, sugeridas). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,RAIZ=AT.rutas.raiz;

var TIPOS=AT.tiposDoc={
  libreta:{nombre:'Libreta de estudio',icono:'libreta',desc:'Secciones, resumen y preguntas de repaso, como una lección.',listo:true,modulo:'estudio'},
  notas:{nombre:'Notas',icono:'notas',desc:'Una página en blanco para escribir rápido.',listo:true,modulo:'nucleo'},
  clase:{nombre:'Apuntes de clase',icono:'clase',desc:'Materia, profesor y fecha arriba; tareas al final.',listo:true,modulo:'estudio'},
  libro:{nombre:'Libro',icono:'libro',desc:'Portada, partes y capítulos.',modulo:'estudio'},
  investigacion:{nombre:'Documento de investigación',icono:'investigacion',desc:'Resumen, método, resultados y referencias.',modulo:'estudio'},
  tesis:{nombre:'Tesis',icono:'tesis',desc:'Capítulos, fuentes y citas en APA 7, y registro de autoría.',listo:true,academico:true,modulo:'estudio'},
  guia:{nombre:'Guía para examen',icono:'guia',desc:'Temas, preguntas y repaso hasta la fecha del examen.',modulo:'estudio'},
  bitacora:{nombre:'Bitácora de laboratorio',icono:'bitacora',desc:'Entradas con fecha, objetivo y resultados.',modulo:'estudio'},
  presentacion:{nombre:'Presentación',icono:'presentacion',desc:'Diapositivas hechas con los mismos bloques.',modulo:'estudio'},
  blanco:{nombre:'Documento en blanco',icono:'blanco',desc:'Solo las herramientas básicas.',modulo:'nucleo'},
  /* Negocio y dinero: plantillas hechas con los bloques que ya hay */
  pendientes:{nombre:'Pendientes del día',icono:'tareas',desc:'Lo que hay que hacer al abrir, durante el día y al cerrar.',listo:true,modulo:'negocio'},
  prestamo:{nombre:'Préstamo o crédito',icono:'pagos',desc:'Una deuda en pagos: cuánto es cada uno y cuánto te falta.',listo:true,modulo:'negocio'},
  gastos:{nombre:'Gastos del mes',icono:'tabla',desc:'Fecha, concepto, categoría y monto de lo que sale.',listo:true,modulo:'negocio'},
  surtir:{nombre:'Lista para surtir',icono:'lista',desc:'Lo que se acaba, cuánto queda y a quién pedirlo.',listo:true,modulo:'negocio'},
  proveedores:{nombre:'Proveedores',icono:'tabla',desc:'Quién te surte, qué te vende, su teléfono y su día de visita.',listo:true,modulo:'negocio'},
  corte:{nombre:'Corte de caja',icono:'pagos',desc:'Fondo, ventas, retiros y lo que hay en la caja.',modulo:'negocio'},
  fiado:{nombre:'Fiado',icono:'notas',desc:'Quién te debe, sus abonos y cuánto le falta.',modulo:'negocio'},
  cotizacion:{nombre:'Cotización y nota de venta',icono:'notas',desc:'Conceptos, precios e IVA, en PDF.',modulo:'negocio'}
};
var ORDEN=['libreta','notas','clase','tesis','pendientes','prestamo','gastos','surtir','proveedores',
  'corte','fiado','cotizacion','libro','investigacion','guia','bitacora','presentacion','blanco'];
var PER=AT.perfil;
function tiene(m){return !PER||PER.tiene(m)}
function hoyISO(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}

/* ---------- Plantillas ---------- */
function id(){return AT.bloques?AT.bloques.nuevoId():'b-'+Math.random().toString(36).slice(2,8)}
function P(t){return t?{type:'paragraph',attrs:{id:id()},content:[{type:'text',text:t}]}:{type:'paragraph',attrs:{id:id()}}}
function H(t,nivel){var h={type:'heading',attrs:{id:id(),level:nivel||2}};if(t)h.content=[{type:'text',text:t}];return h}
function hoy(){return new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}
function tareas(lista){return {type:'taskList',attrs:{id:id()},content:lista.map(function(t){return {type:'taskItem',attrs:{checked:false},content:[t?{type:'paragraph',content:[{type:'text',text:t}]}:{type:'paragraph'}]}})}}
function celda(t,cab){return {type:cab?'tableHeader':'tableCell',content:[t?{type:'paragraph',content:[{type:'text',text:t}]}:{type:'paragraph'}]}}
/* Una tabla con su fila de títulos y filas vacías para llenar */
function tabla(titulos,filas){
  var rs=[{type:'tableRow',content:titulos.map(function(t){return celda(t,true)})}];
  for(var i=0;i<(filas||3);i++)rs.push({type:'tableRow',content:titulos.map(function(){return celda('')})});
  return {type:'table',attrs:{id:id()},content:rs};
}
function mes(){var t=new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'});return t.replace(/ de /,' ')}
var PLANTILLAS={
  libreta:function(){return {titulo:'Libreta sin título',props:[{nombre:'Materia',valor:'',estilo:'etiqueta'}],contenido:[
    {type:'indice',attrs:{id:id()}},
    H(''),P(),
    H('Repasa lo aprendido'),
    {type:'repaso',attrs:{id:id(),preguntas:[{q:'',o:['',''],a:0,e:''}]}},
    {type:'resumen',attrs:{id:id()},content:[{type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph'}]}]}]}
  ]}},
  notas:function(){return {titulo:'Notas sin título',props:[],contenido:[P()]}},
  tesis:function(){
    function cap(t){return [H(t),P()]}
    return {titulo:'Tesis sin título',props:[
      {nombre:'Autor(a)',valor:'',estilo:'texto'},{nombre:'Universidad',valor:'',estilo:'texto'},{nombre:'Programa',valor:'',estilo:'texto'},
      {nombre:'Asesor(a)',valor:'',estilo:'texto'},{nombre:'Año',valor:String(new Date().getFullYear()),estilo:'texto'}],
      fuentes:[],autoria:{v:1,sesiones:[],pegados:[]},
      contenido:[{type:'indice',attrs:{id:id()}},{type:'indicePiezas',attrs:{id:id(),clase:'figura'}},{type:'indicePiezas',attrs:{id:id(),clase:'tabla'}},
        {type:'declaracion',attrs:{id:id(),ia:'no',usos:[]}}]
        .concat(cap('Resumen'),cap('Introducción'),cap('Capítulo 1. Planteamiento del problema'),cap('Capítulo 2. Marco teórico'),
          cap('Capítulo 3. Metodología'),cap('Capítulo 4. Resultados'),cap('Capítulo 5. Discusión'),cap('Conclusiones'),
          [H('Referencias'),{type:'bibliografia',attrs:{id:id(),todas:false}}],cap('Anexos'))};
  },
  pendientes:function(){return {titulo:'Pendientes del día',props:[],contenido:[
    P('Marca cada pendiente al terminarlo. Agrega los tuyos con «/» y «Lista de tareas».'),
    H('Al abrir'),tareas(['Contar el fondo de caja','Revisar qué hace falta','']),
    H('Durante el día'),tareas(['']),
    H('Al cerrar'),tareas(['Hacer el corte del día','Anotar lo que hay que pedir mañana'])
  ]}},
  prestamo:function(){return {titulo:'Préstamo o crédito',props:[],contenido:[
    {type:'pagos',attrs:{id:id(),titulo:'',modo:'plazos',monto:'',pagos:'12',cuota:'',frecuencia:'mensual',inicio:hoyISO(),pagados:{}}},P()
  ]}},
  gastos:function(){return {titulo:'Gastos de '+mes(),props:[],contenido:[
    P('Anota cada gasto en una fila: renta, luz, mercancía, transporte… Agrega filas desde el menú de la tabla.'),
    tabla(['Fecha','Concepto','Categoría','Monto'],4),P()
  ]}},
  surtir:function(){return {titulo:'Lista para surtir',props:[],contenido:[
    P('Lo que se está acabando. Cuando lo pidas, bórralo de la lista o márcalo en «Pedido».'),
    tabla(['Producto','Quedan','Mínimo','Proveedor','Pedido'],4),P()
  ]}},
  proveedores:function(){return {titulo:'Proveedores',props:[],contenido:[
    tabla(['Proveedor','Qué te surte','Teléfono','Día de visita'],3),P()
  ]}},
  clase:function(){return {titulo:'Clase del '+hoy(),props:[
      {nombre:'Materia',valor:'',estilo:'etiqueta'},{nombre:'Profesor',valor:'',estilo:'texto'},{nombre:'Fecha',valor:hoy(),estilo:'texto'}],contenido:[
    H(''),P(),
    H('Tareas'),
    {type:'taskList',attrs:{id:id()},content:[{type:'taskItem',attrs:{checked:false},content:[{type:'paragraph'}]}]}
  ]}}
};
function idDoc(){
  var a=new Uint8Array(8),s='';
  crypto.getRandomValues(a);
  for(var i=0;i<8;i++)s+='abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i]%36);
  return 'd-'+s;
}
/* Arma el documento de un tipo (sin guardarlo). extra ({titulo, contenido}) reemplaza lo de la plantilla. */
function armar(tipo,extra){
  var t=TIPOS[tipo],pl=PLANTILLAS[tipo];
  if(!t||!pl)return null;
  var base=Object.assign(pl(),extra||{}),ahora=new Date().toISOString();
  var doc={formato:1,tipo:tipo,id:idDoc(),titulo:base.titulo,props:base.props,creado:ahora,editado:ahora,
    contenido:{type:'doc',content:base.contenido}};
  if(base.fuentes)doc.fuentes=base.fuentes;
  if(base.autoria)doc.autoria=base.autoria;
  return doc;
}
/* Crea el documento, lo guarda y lo abre */
function nuevo(tipo,extra){
  var doc=armar(tipo,extra);
  if(!doc)return Promise.reject(new Error('Ese tipo todavía no está disponible'));
  /* Se pide aquí, durante el clic: algunos navegadores solo lo permiten así */
  AT.datos.pedirPersistencia();
  return AT.datos.documentos.guardar(doc,{conservarFecha:true}).then(function(d){
    try{sessionStorage.setItem('onelearn:recien-creado',d.id)}catch(e){}
    location.href=RAIZ+'documento.html?id='+encodeURIComponent(d.id);
    return d;
  });
}

/* ---------- Qué se ofrece según el perfil ---------- */
/* Los módulos encendidos, el del perfil primero (sin perfil: estudio y negocio, como antes) */
function modulosVisibles(){
  var ms=PER&&PER.actual()?PER.actual().modulos.slice():['estudio','negocio'];
  return ms.filter(function(m){return tiene(m)});
}
/* Grupos de la ventana Crear: uno por módulo; las notas (núcleo) van en el primero */
function grupos(){
  var ms=modulosVisibles();
  if(!ms.length)return [{modulo:'nucleo',tipos:ORDEN.filter(function(k){return TIPOS[k].listo&&TIPOS[k].modulo==='nucleo'})}];
  return ms.map(function(m,i){
    return {modulo:m,tipos:ORDEN.filter(function(k){var t=TIPOS[k];return t.listo&&(t.modulo===m||(i===0&&t.modulo==='nucleo'))})};
  });
}
/* Las plantillas de negocio que Inicio ofrece como «Páginas listas para usar» */
function plantillasInicio(){return ORDEN.filter(function(k){return TIPOS[k].listo&&TIPOS[k].modulo==='negocio'&&tiene('negocio')})}
/* Lo que «Crea tu espacio» sugiere al empezar: [{tipo, marcado}] según el perfil y el giro */
function sugeridas(perfil,giro){
  if(perfil==='negocio'){
    var mercancia=['tienda','comida','catalogo'].indexOf(giro)>=0;
    return [['pendientes',true],['gastos',true],['surtir',mercancia],['proveedores',mercancia],['prestamo',false],['notas',false]]
      .map(function(x){return {tipo:x[0],marcado:x[1]}});
  }
  if(perfil==='personal')return [{tipo:'gastos',marcado:true},{tipo:'prestamo',marcado:true},{tipo:'notas',marcado:false}];
  return [{tipo:'libreta',marcado:false},{tipo:'clase',marcado:false},{tipo:'notas',marcado:false}];
}

/* ---------- Ventana «¿Qué quieres crear?» ---------- */
var dlg=null,abridor=null;
function opcion(k){
  var t=TIPOS[k];
  return '<button type="button" class="crear-o" data-tipo="'+k+'">'+ico(t.icono)+'<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small></span></button>';
}
function crearVentana(){
  dlg=document.createElement('dialog');
  dlg.className='atajos crear-dlg';
  dlg.setAttribute('aria-labelledby','crT');
  var gs=grupos(),pronto=ORDEN.filter(function(k){var t=TIPOS[k];return !t.listo&&tiene(t.modulo)&&(t.modulo!=='nucleo'||modulosVisibles().length)});
  var MOD=PER?PER.MODULOS:{};
  dlg.innerHTML='<div class="at-h"><h2 id="crT">¿Qué quieres crear?</h2>'+
    '<button class="lec-x" type="button" data-cr="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<p class="td-p">Cada tipo empieza con su estructura y trae las herramientas justas. Se guarda solo en este dispositivo.</p>'+
    gs.map(function(g){
      return (gs.length>1?'<h3 class="crear-h">'+esc(MOD[g.modulo]?MOD[g.modulo].nombre:'Para empezar')+'</h3>':'')+
        '<div class="crear-g" data-modulo="'+g.modulo+'">'+g.tipos.map(opcion).join('')+'</div>';
    }).join('')+
    (pronto.length?'<h3 class="crear-h">Llegan después</h3>'+
    '<ul class="crear-p">'+pronto.map(function(k){
      var t=TIPOS[k];
      return '<li>'+ico(t.icono)+'<span>'+esc(t.nombre)+'</span></li>';
    }).join('')+'</ul>':'')+
    '<p class="td-msg" id="crMsg" role="status"></p>';
  document.body.appendChild(dlg);
  dlg.addEventListener('click',function(e){
    if(e.target===dlg||e.target.closest('[data-cr="cerrar"]')){cerrar();return}
    var b=e.target.closest('[data-tipo]');
    if(!b||b.getAttribute('aria-disabled')==='true')return;
    $$('.crear-o',dlg).forEach(function(x){x.setAttribute('aria-disabled','true')});
    $('#crMsg',dlg).textContent='Creando…';
    nuevo(b.getAttribute('data-tipo')).catch(function(err){
      $$('.crear-o',dlg).forEach(function(x){x.removeAttribute('aria-disabled')});
      $('#crMsg',dlg).textContent='No se pudo crear: '+(err&&err.message||'inténtalo otra vez');
    });
  });
  dlg.addEventListener('close',function(){if(abridor&&document.contains(abridor))abridor.focus({preventScroll:true})});
}
function abrir(){
  if(!dlg)crearVentana();
  abridor=document.activeElement;
  $('#crMsg',dlg).textContent='';
  $$('.crear-o',dlg).forEach(function(x){x.removeAttribute('aria-disabled')});
  if(AT.setNav)AT.setNav(false);
  dlg.showModal();
  var p=$('.crear-o',dlg);if(p)p.focus();
}
function cerrar(){if(dlg&&dlg.open)dlg.close()}
AT.crear={abrir:abrir,cerrar:cerrar,nuevo:nuevo,armar:armar,tipos:TIPOS,plantillasInicio:plantillasInicio,sugeridas:sugeridas};
document.addEventListener('click',function(e){
  if(e.target.closest('#sideCrear,[data-crear]'))abrir();
});
/* inicio.html#crear (desde la página de bienvenida) abre la ventana al llegar */
if(AT.rutas&&AT.rutas.esInicio&&location.hash==='#crear'){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  setTimeout(abrir,0);
}
/* inicio.html#guardar-pagos: el plan de pagos que se probó en la página de bienvenida (landing.js lo deja en
   sessionStorage) se guarda como un documento de notas con ese bloque. Solo entran campos conocidos y con forma válida. */
function planDeBienvenida(a){
  if(!a||typeof a!=='object')return null;
  function texto(v,max){return typeof v==='string'?v.slice(0,max):''}
  var pagados={};
  if(a.pagados&&typeof a.pagados==='object')Object.keys(a.pagados).forEach(function(k){
    if(/^\d{1,3}$/.test(k)&&/^\d{4}-\d{2}-\d{2}$/.test(a.pagados[k]))pagados[k]=a.pagados[k];
  });
  return {titulo:texto(a.titulo,120)||'Mi plan de pagos',modo:'plazos',monto:texto(a.monto,20).replace(/[^\d.,$\s]/g,''),
    pagos:String(Math.max(1,Math.min(520,parseInt(a.pagos,10)||12))),cuota:'',
    frecuencia:['semanal','quincenal','mensual'].indexOf(a.frecuencia)>=0?a.frecuencia:'mensual',
    inicio:/^\d{4}-\d{2}-\d{2}$/.test(a.inicio)?a.inicio:'',pagados:pagados};
}
if(AT.rutas&&AT.rutas.esInicio&&location.hash==='#guardar-pagos'){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  var plan=null;
  try{plan=planDeBienvenida(JSON.parse(sessionStorage.getItem('onebook:pagos-bienvenida')||'null'));sessionStorage.removeItem('onebook:pagos-bienvenida')}catch(e){}
  if(plan)nuevo('notas',{titulo:plan.titulo,contenido:[{type:'pagos',attrs:Object.assign({id:id()},plan)},P()]}).catch(function(err){
    if(AT.aviso)AT.aviso('No se pudo guardar tu plan de pagos: '+(err&&err.message||'inténtalo otra vez'));
  });
}

/* ---------- Deshacer una eliminación (el documento se guardó en la sesión al borrarlo) ---------- */
var borrado=null;
try{borrado=JSON.parse(sessionStorage.getItem('onelearn:eliminado')||'null');sessionStorage.removeItem('onelearn:eliminado')}catch(e){}
if(borrado&&borrado.id&&AT.aviso){
  AT.aviso('Se eliminó «'+(borrado.titulo||'Sin título')+'».','Deshacer',function(){
    AT.datos.documentos.guardar(borrado,{conservarFecha:true}).then(function(){
      location.href=RAIZ+'documento.html?id='+encodeURIComponent(borrado.id);
    });
  });
}
})();
