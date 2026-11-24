/* OneBook: «Crear» y las plantillas.
   Cada tipo de documento es una plantilla: empieza con su estructura y sus bloques. Es de un módulo (perfil.js) y
   solo se ofrece si ese módulo está encendido; además tiene una categoría para la galería:
     negocio   pendientes del día, cortes de caja, fiado, gastos (con «Generar mes»), nota de venta (con folio),
               precios de venta, lista para surtir, proveedores (con cuentas por pagar), plan de negocio, clientes
               y lista de precios
     finanzas  finanzas del mes, me deben y préstamo o crédito (plan de pagos)
     estudio   libreta de estudio, apuntes de clase y tesis (con fuentes, citas en APA 7 y registro de autoría)
     (las notas, del núcleo, van en la primera categoría)
   Los bloques de la tienda vienen de negocio.js y sus archivos, que en inicio.html no se cargan: las plantillas solo
   guardan sus datos iniciales. Los que no tienen «listo» se anuncian en «Llegan después».
   La ventana «¿Qué quieres crear?» es una galería (fase F5): categorías que se filtran, búsqueda, lo que trae cada
   plantilla, paquetes por giro (crean varias páginas de una vez) y «Mis plantillas» (las que guardas desde un
   documento con «Guardar como plantilla», en AT.datos.plantillas; al guardarla se puede quitar lo anotado y al
   usarla cada bloque se prepara: fecha de hoy, folio nuevo, el mes actual).
   Se abre desde «Crear» en la barra lateral y en el inicio. Expone AT.tiposDoc y AT.crear (abrir, cerrar, nuevo,
   armar, plantillasInicio, sugeridas, paquetes, crearPaquete, guardarPlantilla, desdePlantilla, nuevoDesde). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,RAIZ=AT.rutas.raiz;

var TIPOS=AT.tiposDoc={
  libreta:{nombre:'Libreta de estudio',icono:'libreta',desc:'Secciones, resumen y preguntas de repaso, como una lección.',listo:true,modulo:'estudio',cat:'estudio'},
  notas:{nombre:'Notas',icono:'notas',desc:'Una página en blanco para escribir rápido.',listo:true,modulo:'nucleo',cat:'general'},
  clase:{nombre:'Apuntes de clase',icono:'clase',desc:'Materia, profesor y fecha arriba; tareas al final.',listo:true,modulo:'estudio',cat:'estudio'},
  libro:{nombre:'Libro',icono:'libro',desc:'Portada, partes y capítulos.',modulo:'estudio',cat:'estudio'},
  investigacion:{nombre:'Documento de investigación',icono:'investigacion',desc:'Resumen, método, resultados y referencias.',modulo:'estudio',cat:'estudio'},
  tesis:{nombre:'Tesis',icono:'tesis',desc:'Capítulos, fuentes y citas en APA 7, y registro de autoría.',listo:true,academico:true,modulo:'estudio',cat:'estudio'},
  guia:{nombre:'Guía para examen',icono:'guia',desc:'Temas, preguntas y repaso hasta la fecha del examen.',modulo:'estudio',cat:'estudio'},
  bitacora:{nombre:'Bitácora de laboratorio',icono:'bitacora',desc:'Entradas con fecha, objetivo y resultados.',modulo:'estudio',cat:'estudio'},
  presentacion:{nombre:'Presentación',icono:'presentacion',desc:'Diapositivas hechas con los mismos bloques.',modulo:'estudio',cat:'estudio'},
  blanco:{nombre:'Documento en blanco',icono:'blanco',desc:'Solo las herramientas básicas.',modulo:'nucleo',cat:'general'},
  /* Negocio y dinero: plantillas hechas con los bloques de negocio («trae»: lo que se ve en la galería) */
  pendientes:{nombre:'Pendientes del día',icono:'tareas',desc:'Lo que hay que hacer al abrir, durante el día y al cerrar.',listo:true,modulo:'negocio',cat:'negocio',trae:['Listas de tareas']},
  corte:{nombre:'Corte de caja',icono:'caja',desc:'Fondo, ventas, retiros y efectivo contado: ¿la caja cuadra?',listo:true,modulo:'negocio',cat:'negocio',trae:['Corte de caja']},
  fiado:{nombre:'Fiado',icono:'fiado',desc:'Quién te debe, lo que se lleva, sus abonos y su saldo.',listo:true,modulo:'negocio',cat:'negocio',trae:['Fiado']},
  gastos:{nombre:'Gastos del mes',icono:'gastos',desc:'Lo que sale, por categoría; los gastos fijos se generan cada mes.',listo:true,modulo:'negocio',cat:'negocio',trae:['Gastos del mes']},
  venta:{nombre:'Nota de venta',icono:'venta',desc:'Recibo con folio, conceptos, IVA, total y cambio, para imprimir.',listo:true,modulo:'negocio',cat:'negocio',trae:['Nota de venta']},
  precio:{nombre:'Precios de venta',icono:'precio',desc:'A cuánto vender con tu ganancia, el IVA y la comisión de la tarjeta.',listo:true,modulo:'negocio',cat:'negocio',trae:['Precio de venta']},
  surtir:{nombre:'Lista para surtir',icono:'lista',desc:'Lo que se acaba, cuánto queda y a quién pedirlo.',listo:true,modulo:'negocio',cat:'negocio',trae:['Tabla']},
  proveedores:{nombre:'Proveedores',icono:'porpagar',desc:'Quién te surte, su día de visita y lo que le debes.',listo:true,modulo:'negocio',cat:'negocio',trae:['Tabla','Cuentas por pagar']},
  clientes:{nombre:'Clientes',icono:'users',desc:'Nombre, teléfono, qué compran y lo que hay que recordar.',listo:true,modulo:'negocio',cat:'negocio',trae:['Tabla']},
  lista:{nombre:'Lista de precios',icono:'tabla',desc:'Tus productos y servicios con su precio, para imprimir o compartir.',listo:true,modulo:'negocio',cat:'negocio',trae:['Tabla']},
  plan:{nombre:'Plan de negocio',icono:'idea',desc:'En una página: qué vendes, a quién, a cuánto, cuánto ganas y tus metas.',listo:true,modulo:'negocio',cat:'negocio',trae:['Precio de venta','Lista de tareas']},
  cotizacion:{nombre:'Cotización',icono:'notas',desc:'Conceptos, precios e IVA para enviar; después, nota de venta.',modulo:'negocio',cat:'negocio'},
  /* Tus finanzas (también del módulo de negocio y dinero) */
  finanzas:{nombre:'Finanzas del mes',icono:'gastos',desc:'Tus gastos, tus deudas y tus metas de ahorro en una página.',listo:true,modulo:'negocio',cat:'finanzas',trae:['Gastos del mes','Plan de pagos','Lista de tareas']},
  medeben:{nombre:'Me deben',icono:'fiado',desc:'A quién le prestaste, lo que te ha abonado y cuánto falta.',listo:true,modulo:'negocio',cat:'finanzas',trae:['Fiado']},
  prestamo:{nombre:'Préstamo o crédito',icono:'pagos',desc:'Una deuda en pagos: cuánto es cada uno y cuánto te falta.',listo:true,modulo:'negocio',cat:'finanzas',trae:['Plan de pagos']}
};
var ORDEN=['libreta','notas','clase','tesis','pendientes','corte','fiado','gastos','venta','precio','surtir','proveedores','clientes','lista','plan',
  'finanzas','medeben','prestamo','cotizacion','libro','investigacion','guia','bitacora','presentacion','blanco'];
var CATS={negocio:'Para tu negocio',finanzas:'Tus finanzas',paquetes:'Paquetes por giro',estudio:'Estudio',mis:'Mis plantillas'};
var CAT_MOD={negocio:'negocio',finanzas:'negocio',paquetes:'negocio',estudio:'estudio',mis:'nucleo'};
var PER=AT.perfil;
function tiene(m){return !PER||PER.tiene(m)}
function hoyISO(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function sinAcentos(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function clonar(o){return JSON.parse(JSON.stringify(o))}

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
  gastos:function(){return {titulo:'Gastos',props:[],contenido:[
    P('Anota lo que sale. Los gastos fijos (renta, luz, internet) se anotan una vez y «Generar mes» los agrega cada mes.'),
    {type:'gastos',attrs:{id:id(),titulo:'',mes:hoyISO().slice(0,7),filas:[],fijos:[]}},P()
  ]}},
  corte:function(){return {titulo:'Cortes de caja',props:[],contenido:[
    P('Un corte por día. Para el de mañana, escribe / y elige «Corte de caja».'),
    {type:'corte',attrs:{id:id(),fecha:hoyISO()}},P()
  ]}},
  fiado:function(){return {titulo:'Fiado',props:[],contenido:[
    {type:'fiado',attrs:{id:id(),titulo:'',clientes:[]}},P()
  ]}},
  venta:function(){
    var f=AT.folio('V');
    return {titulo:'Nota de venta '+f,props:[],contenido:[
      {type:'venta',attrs:{id:id(),folio:f,fecha:hoyISO(),conceptos:[{cant:'1',desc:'',precio:''}]}},P()
    ]};
  },
  precio:function(){return {titulo:'Precios de venta',props:[],contenido:[
    P('Una calculadora por producto. Para otro, escribe / y elige «Precio de venta».'),
    {type:'precio',attrs:{id:id()}},P()
  ]}},
  surtir:function(){return {titulo:'Lista para surtir',props:[],contenido:[
    P('Lo que se está acabando. Cuando lo pidas, bórralo de la lista o márcalo en «Pedido».'),
    tabla(['Producto','Quedan','Mínimo','Proveedor','Pedido'],4),P()
  ]}},
  proveedores:function(){return {titulo:'Proveedores',props:[],contenido:[
    tabla(['Proveedor','Qué te surte','Teléfono','Día de visita'],3),
    H('Lo que les debes'),{type:'porpagar',attrs:{id:id(),titulo:'',cuentas:[]}},P()
  ]}},
  clientes:function(){return {titulo:'Clientes',props:[],contenido:[
    P('Una fila por cliente. Agrega filas desde el menú de la tabla.'),
    tabla(['Nombre','Teléfono','Qué compra','Notas'],4),P()
  ]}},
  lista:function(){return {titulo:'Lista de precios',props:[],contenido:[
    {type:'callout',attrs:{id:id(),variante:'info'},content:[{type:'paragraph',content:[{type:'text',text:'Precios vigentes. Pregunta por mayoreo.'}]}]},
    tabla(['Producto o servicio','Presentación','Precio'],6),P()
  ]}},
  plan:function(){return {titulo:'Plan de negocio',props:[],contenido:[
    P('Contesta cada pregunta en pocas líneas. Vuelve a esta página cada mes.'),
    H('¿Qué vendes?'),P(),
    H('¿A quién le vendes?'),P(),
    H('¿A cuánto lo vendes?'),
    {type:'precio',attrs:{id:id(),titulo:'Mi producto principal'}},
    H('¿Cuánto quieres ganar al mes?'),P(),
    H('Metas de los próximos tres meses'),tareas(['','',''])
  ]}},
  finanzas:function(){return {titulo:'Finanzas del mes',props:[],contenido:[
    P('Lo que entra, lo que sale y lo que debes. Los gastos fijos se anotan una vez y «Generar mes» los agrega cada mes.'),
    H('Gastos'),{type:'gastos',attrs:{id:id(),titulo:'Mis gastos',mes:hoyISO().slice(0,7),filas:[],fijos:[]}},
    H('Deudas'),{type:'pagos',attrs:{id:id(),titulo:'',modo:'plazos',monto:'',pagos:'12',cuota:'',frecuencia:'mensual',inicio:hoyISO(),pagados:{}}},
    H('Metas de ahorro'),tareas(['Fondo para emergencias','']),P()
  ]}},
  medeben:function(){return {titulo:'Me deben',props:[],contenido:[
    {type:'fiado',attrs:{id:id(),titulo:'Me deben',clientes:[]}},P()
  ]}},
  clase:function(){return {titulo:'Clase del '+hoy(),props:[
      {nombre:'Materia',valor:'',estilo:'etiqueta'},{nombre:'Profesor',valor:'',estilo:'texto'},{nombre:'Fecha',valor:hoy(),estilo:'texto'}],contenido:[
    H(''),P(),
    H('Tareas'),
    {type:'taskList',attrs:{id:id()},content:[{type:'taskItem',attrs:{checked:false},content:[{type:'paragraph'}]}]}
  ]}}
};
/* Paquetes por giro: varias páginas de una vez */
var PAQUETES={
  tienda:{nombre:'Tienda o abarrotes',tipos:['corte','fiado','gastos','surtir','proveedores']},
  comida:{nombre:'Comida (cocina, cafetería, repostería)',tipos:['corte','gastos','precio','surtir','pendientes']},
  servicios:{nombre:'Servicios (estética, taller, consultorio)',tipos:['venta','clientes','gastos','pendientes']},
  catalogo:{nombre:'Ventas por catálogo o redes',tipos:['lista','clientes','venta','gastos']},
  freelance:{nombre:'Freelance o profesional independiente',tipos:['venta','clientes','precio','gastos']}
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
/* Guarda un documento nuevo y lo abre */
function guardarYAbrir(doc){
  /* Se pide aquí, durante el clic: algunos navegadores solo lo permiten así */
  AT.datos.pedirPersistencia();
  return AT.datos.documentos.guardar(doc,{conservarFecha:true}).then(function(d){
    try{sessionStorage.setItem('onelearn:recien-creado',d.id)}catch(e){}
    location.href=RAIZ+'documento.html?id='+encodeURIComponent(d.id);
    return d;
  });
}
/* Crea el documento, lo guarda y lo abre */
function nuevo(tipo,extra){
  var doc=armar(tipo,extra);
  if(!doc)return Promise.reject(new Error('Ese tipo todavía no está disponible'));
  return guardarYAbrir(doc);
}
/* Un paquete: crea todas sus páginas y vuelve al Inicio con el aviso */
function crearPaquete(giro){
  var pq=PAQUETES[giro];
  if(!pq)return Promise.reject(new Error('Ese paquete no existe'));
  AT.datos.pedirPersistencia();
  var hechas=[];
  return pq.tipos.reduce(function(pr,t){
    return pr.then(function(){var d=armar(t);return d?AT.datos.documentos.guardar(d,{conservarFecha:true}).then(function(x){hechas.push(x)}):null});
  },Promise.resolve()).then(function(){
    try{sessionStorage.setItem('onebook:aviso','Se crearon '+hechas.length+' páginas: '+hechas.map(function(d){return d.titulo}).join(', ')+'.')}catch(e){}
    location.href=RAIZ+'inicio.html';
    return hechas;
  });
}

/* ---------- Tus plantillas ---------- */
/* Lo anotado de cada bloque, que se quita al guardar una plantilla «sin lo anotado» */
var VACIAR={
  corte:function(a){a.fecha='';a.ventas={};a.movs=[];a.contado='';a.billetes={};a.notas=''},
  fiado:function(a){a.clientes=(a.clientes||[]).map(function(c){return {nombre:c.nombre||'',telefono:c.telefono||'',apunte:{monto:'',concepto:''},todos:false,movs:[]}})},
  gastos:function(a){a.filas=[];a.mes=''},
  venta:function(a){a.folio='';a.fecha='';a.cliente='';a.recibido=''},
  porpagar:function(a){a.cuentas=[]},
  pagos:function(a){a.pagados={}}
};
/* Lo que cada bloque necesita al usarse: la fecha de hoy, un folio nuevo, el mes actual */
var AL_CREAR={
  corte:function(a){a.fecha=hoyISO()},
  venta:function(a){a.folio=AT.folio('V');a.fecha=hoyISO()},
  gastos:function(a){a.mes=hoyISO().slice(0,7)}
};
function desmarcar(n){
  if(!n||typeof n!=='object')return;
  if(n.type==='taskItem'&&n.attrs)n.attrs.checked=false;
  (n.content||[]).forEach(desmarcar);
}
/* La plantilla de un documento: {id, nombre, desc, tipo, titulo, props, contenido[, fuentes]} */
function plantillaDe(doc,op){
  op=op||{};
  var c=clonar(doc.contenido&&doc.contenido.content||[]);
  if(op.vaciar)c.forEach(function(b){if(b.attrs&&VACIAR[b.type])VACIAR[b.type](b.attrs);desmarcar(b)});
  var pl={id:'p-'+idDoc().slice(2),nombre:String(op.nombre||doc.titulo||'Mi plantilla').replace(/\s+/g,' ').trim().slice(0,80)||'Mi plantilla',
    desc:String(op.desc||'').replace(/\s+/g,' ').trim().slice(0,160),tipo:TIPOS[doc.tipo]?doc.tipo:'notas',
    titulo:doc.titulo||'',props:clonar(doc.props||[]).map(function(p){return op.vaciar?Object.assign(p,{valor:''}):p}),contenido:{type:'doc',content:c}};
  if(Array.isArray(doc.fuentes)&&doc.fuentes.length)pl.fuentes=clonar(doc.fuentes);
  return pl;
}
function guardarPlantilla(doc,op){return AT.datos.plantillas.guardar(plantillaDe(doc,op))}
/* Un documento nuevo desde una de tus plantillas (cada bloque con id nuevo y listo para usarse) */
function desdePlantilla(pl){
  var tipo=TIPOS[pl.tipo]&&TIPOS[pl.tipo].listo?pl.tipo:'notas',ahora=new Date().toISOString(),folioViejo='',folioNuevo='';
  var c=clonar(pl.contenido&&pl.contenido.content||[]);
  c.forEach(function(b){
    if(!b.attrs||typeof b.attrs!=='object')return;
    if('id' in b.attrs||b.type)b.attrs.id=id();
    if(b.type==='venta'&&!folioViejo)folioViejo=b.attrs.folio||'';
    if(AL_CREAR[b.type])AL_CREAR[b.type](b.attrs);
    if(b.type==='venta'&&!folioNuevo)folioNuevo=b.attrs.folio;
  });
  var titulo=pl.titulo||pl.nombre||'Sin título';
  /* «Nota de venta V-007» pasa a llevar el folio nuevo */
  if(folioNuevo){titulo=folioViejo&&titulo.indexOf(folioViejo)>=0?titulo.replace(folioViejo,folioNuevo):/V-\d{3,}/.test(titulo)?titulo.replace(/V-\d{3,}/,folioNuevo):titulo}
  var doc={formato:1,tipo:tipo,id:idDoc(),titulo:titulo,props:clonar(pl.props||[]),creado:ahora,editado:ahora,contenido:{type:'doc',content:c.length?c:[P()]}};
  if(TIPOS[tipo].academico){doc.fuentes=clonar(pl.fuentes||[]);doc.autoria={v:1,sesiones:[],pegados:[]}}
  return doc;
}
function nuevoDesde(pl){return guardarYAbrir(desdePlantilla(pl))}

/* ---------- Qué se ofrece según el perfil ---------- */
/* Los módulos encendidos, el del perfil primero (sin perfil: estudio y negocio, como antes) */
function modulosVisibles(){
  var ms=PER&&PER.actual()?PER.actual().modulos.slice():['estudio','negocio'];
  return ms.filter(function(m){return tiene(m)});
}
/* Las categorías de la galería, en el orden del perfil; las notas van en la primera */
function categorias(){
  var tipo=PER&&PER.tipo(),orden=tipo==='personal'?['finanzas','negocio','paquetes','estudio']:tipo==='negocio'?['negocio','paquetes','finanzas','estudio']:
    modulosVisibles()[0]==='negocio'?['negocio','paquetes','finanzas','estudio']:['estudio','negocio','paquetes','finanzas'];
  return orden.filter(function(c){return tiene(CAT_MOD[c])});
}
function tiposDe(cat,primera){
  return ORDEN.filter(function(k){var t=TIPOS[k];return t.listo&&tiene(t.modulo)&&(t.cat===cat||(primera&&t.cat==='general'))});
}
/* Las páginas listas para usar del Inicio (sin el módulo de estudio), según el perfil */
var INICIO={negocio:['pendientes','corte','fiado','gastos','venta','precio','surtir','proveedores','clientes'],personal:['finanzas','gastos','prestamo','medeben','notas']};
function plantillasInicio(){
  var l=INICIO[PER&&PER.tipo()]||INICIO.negocio;
  return l.filter(function(k){return TIPOS[k]&&TIPOS[k].listo&&tiene(TIPOS[k].modulo)});
}
/* Lo que «Crea tu espacio» sugiere al empezar: [{tipo, marcado}] según el perfil y el giro */
function sugeridas(perfil,giro){
  if(perfil==='negocio'){
    var tienda=giro==='tienda',mercancia=['tienda','comida','catalogo'].indexOf(giro)>=0;
    return [['corte',mercancia],['fiado',tienda],['gastos',true],['surtir',mercancia],['venta',!mercancia],['pendientes',!mercancia],
      ['proveedores',false],['precio',false],['prestamo',false],['notas',false]]
      .map(function(x){return {tipo:x[0],marcado:x[1]}});
  }
  if(perfil==='personal')return [{tipo:'finanzas',marcado:true},{tipo:'prestamo',marcado:false},{tipo:'medeben',marcado:false},{tipo:'notas',marcado:false}];
  return [{tipo:'libreta',marcado:false},{tipo:'clase',marcado:false},{tipo:'notas',marcado:false}];
}

/* ---------- Ventana «¿Qué quieres crear?»: la galería ---------- */
var dlg=null,abridor=null,filtro='todas',mias=[];
function opcion(k){
  var t=TIPOS[k];
  return '<button type="button" class="crear-o" data-tipo="'+k+'" data-buscar="'+esc(sinAcentos(t.nombre+' '+t.desc+' '+(t.trae||[]).join(' ')))+'">'+ico(t.icono)+
    '<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small>'+(t.trae?'<em class="crear-trae">Trae: '+esc(t.trae.join(' · '))+'</em>':'')+'</span></button>';
}
function opcionPaquete(k){
  var pq=PAQUETES[k],nombres=pq.tipos.map(function(t){return TIPOS[t].nombre}),giro=PER&&PER.giro&&PER.giro();
  return '<button type="button" class="crear-o crear-pq" data-paquete="'+k+'" data-buscar="'+esc(sinAcentos('paquete '+pq.nombre+' '+nombres.join(' ')))+'">'+ico('crear')+
    '<span><b>'+esc(pq.nombre)+(giro===k?' <i class="crear-tuyo">Tu giro</i>':'')+'</b><small>Crea '+pq.tipos.length+' páginas de una vez.</small>'+
    '<em class="crear-trae">'+esc(nombres.join(' · '))+'</em></span></button>';
}
function opcionMia(pl){
  var t=TIPOS[pl.tipo]||TIPOS.notas;
  return '<div class="crear-mia"><button type="button" class="crear-o" data-plantilla="'+esc(pl.id)+'" data-buscar="'+esc(sinAcentos(pl.nombre+' '+(pl.desc||'')))+'">'+ico(t.icono)+
    '<span><b>'+esc(pl.nombre)+'</b><small>'+esc(pl.desc||'Tu plantilla, guardada el '+new Date(pl.creado||Date.now()).toLocaleDateString('es-MX',{day:'numeric',month:'short'})+'.')+'</small></span></button>'+
    '<button type="button" class="crear-x" data-quitar="'+esc(pl.id)+'" aria-label="Eliminar la plantilla «'+esc(pl.nombre)+'»" title="Eliminar plantilla">'+ico('basura')+'</button></div>';
}
function seccion(cat,html){
  return '<section class="crear-sec" data-cat="'+cat+'" aria-labelledby="crS-'+cat+'"><h3 class="crear-h" id="crS-'+cat+'">'+esc(CATS[cat])+'</h3>'+
    '<div class="crear-g" data-modulo="'+(CAT_MOD[cat]==='nucleo'?'mis':cat==='finanzas'||cat==='paquetes'?cat:CAT_MOD[cat])+'">'+html+'</div></section>';
}
function pintarGaleria(){
  var cats=categorias(),orden=[];
  var h=cats.map(function(c,i){
    var html=c==='paquetes'?Object.keys(PAQUETES).map(opcionPaquete).join(''):tiposDe(c,i===0).map(opcion).join('');
    if(html)orden.push(c);
    return html?seccion(c,html):'';
  }).join('');
  if(!cats.length)h=seccion('negocio',tiposDe('general',true).map(opcion).join('')).replace(esc(CATS.negocio),'Para empezar');
  /* Tus plantillas van primero (en un espacio de estudio, al final) */
  if(mias.length){
    var mis=seccion('mis',mias.map(opcionMia).join(''));
    if(PER&&PER.tipo()==='estudio'){h+=mis;orden.push('mis')}else{h=mis+h;orden.unshift('mis')}
  }
  $('#crSecs',dlg).innerHTML=h;
  if(filtro!=='todas'&&orden.indexOf(filtro)<0)filtro='todas';
  /* Las categorías, en el mismo orden que las secciones */
  $('#crChips',dlg).innerHTML=['todas'].concat(orden).map(function(c){
    return '<button type="button" class="crear-chip" data-filtro="'+c+'" aria-pressed="'+(c===filtro)+'">'+esc(c==='todas'?'Todas':CATS[c])+'</button>';
  }).join('');
  filtrar();
}
/* Lo que se ve: la categoría elegida y lo que coincide con la búsqueda */
function filtrar(){
  var q=sinAcentos($('#crBuscar',dlg).value.trim()),vistas=0;
  $$('.crear-chip',dlg).forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-filtro')===filtro))});
  $$('.crear-sec',dlg).forEach(function(s){
    var n=0;
    $$('[data-buscar]',s).forEach(function(o){var ve=!q||o.getAttribute('data-buscar').indexOf(q)>=0;(o.closest('.crear-mia')||o).hidden=!ve;if(ve)n++});
    s.hidden=!n||(filtro!=='todas'&&s.getAttribute('data-cat')!==filtro);
    if(!s.hidden)vistas+=n;
  });
  $('#crNada',dlg).hidden=!!vistas;
}
function cargarMias(){
  return AT.datos.plantillas.todos().then(function(l){
    mias=l.sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:1});
  },function(){mias=[]});
}
function ocupado(si,msg){
  $$('.crear-o',dlg).forEach(function(x){if(si)x.setAttribute('aria-disabled','true');else x.removeAttribute('aria-disabled')});
  $('#crMsg',dlg).textContent=msg||'';
}
function crearVentana(){
  dlg=document.createElement('dialog');
  dlg.className='atajos crear-dlg';
  dlg.setAttribute('aria-labelledby','crT');
  var pronto=ORDEN.filter(function(k){var t=TIPOS[k];return !t.listo&&tiene(t.modulo)&&(t.modulo!=='nucleo'||modulosVisibles().length)});
  dlg.innerHTML='<div class="at-h"><h2 id="crT">¿Qué quieres crear?</h2>'+
    '<button class="lec-x" type="button" data-cr="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<p class="td-p">Elige una plantilla: empieza con su estructura y sus bloques, y después la cambias a tu gusto. Se guarda solo en este dispositivo.</p>'+
    '<div class="crear-filtros"><label class="vh" for="crBuscar">Buscar plantilla</label><input type="search" id="crBuscar" class="crear-buscar" placeholder="Buscar plantilla" autocomplete="off">'+
    '<div class="crear-chips" id="crChips" role="group" aria-label="Categorías"></div></div>'+
    '<div id="crSecs"></div><p class="hint" id="crNada" hidden>Ninguna plantilla coincide. Prueba con otra palabra.</p>'+
    (pronto.length?'<h3 class="crear-h">Llegan después</h3>'+
    '<ul class="crear-p">'+pronto.map(function(k){
      var t=TIPOS[k];
      return '<li>'+ico(t.icono)+'<span>'+esc(t.nombre)+'</span></li>';
    }).join('')+'</ul>':'')+
    '<p class="td-msg" id="crMsg" role="status"></p>';
  document.body.appendChild(dlg);
  $('#crBuscar',dlg).addEventListener('input',filtrar);
  dlg.addEventListener('click',function(e){
    if(e.target===dlg||e.target.closest('[data-cr="cerrar"]')){cerrar();return}
    var ch=e.target.closest('[data-filtro]');
    if(ch){filtro=ch.getAttribute('data-filtro');filtrar();return}
    var x=e.target.closest('[data-quitar]');
    if(x){quitarMia(x.getAttribute('data-quitar'));return}
    var b=e.target.closest('.crear-o');
    if(!b||b.getAttribute('aria-disabled')==='true')return;
    ocupado(true,'Creando…');
    var pr=b.hasAttribute('data-paquete')?crearPaquete(b.getAttribute('data-paquete')):
      b.hasAttribute('data-plantilla')?nuevoDesde(mias.filter(function(m){return m.id===b.getAttribute('data-plantilla')})[0]||{}):
      nuevo(b.getAttribute('data-tipo'));
    pr.catch(function(err){ocupado(false,'No se pudo crear: '+(err&&err.message||'inténtalo otra vez'))});
  });
  dlg.addEventListener('close',function(){if(abridor&&document.contains(abridor))abridor.focus({preventScroll:true})});
}
/* Eliminar una de tus plantillas (con «Deshacer») */
function quitarMia(pid){
  var pl=mias.filter(function(m){return m.id===pid})[0];if(!pl)return;
  var tarjetas=$$('.crear-mia',dlg),i=tarjetas.indexOf($('[data-quitar="'+pid+'"]',dlg).closest('.crear-mia'));
  AT.datos.plantillas.borrar(pid).then(function(){
    mias=mias.filter(function(m){return m.id!==pid});
    pintarGaleria();
    var sig=$$('.crear-mia [data-plantilla]',dlg)[Math.max(0,i-1)]||$('.crear-o:not([hidden])',dlg)||$('#crBuscar',dlg);
    if(sig)sig.focus();
    $('#crMsg',dlg).textContent='Se eliminó la plantilla «'+pl.nombre+'».';
    if(AT.aviso)AT.aviso('Se eliminó la plantilla «'+pl.nombre+'».','Deshacer',function(){
      AT.datos.plantillas.guardar(pl,{conservarFecha:true}).then(function(){mias.push(pl);if(dlg)pintarGaleria()});
    });
  });
}
function abrir(cat){
  if(!dlg)crearVentana();
  abridor=document.activeElement;
  filtro=cat&&CATS[cat]?cat:'todas';
  $('#crBuscar',dlg).value='';
  ocupado(false);
  pintarGaleria();
  if(AT.setNav)AT.setNav(false);
  dlg.showModal();
  var p=$('.crear-sec:not([hidden]) .crear-o',dlg);if(p)p.focus();
  /* Tus plantillas llegan de la base: se agregan sin mover el foco */
  cargarMias().then(function(){if(dlg.open&&mias.length){var f=document.activeElement&&document.activeElement.getAttribute('data-tipo');pintarGaleria();if(f){var o=$('[data-tipo="'+f+'"]',dlg);if(o)o.focus()}}});
}
function cerrar(){if(dlg&&dlg.open)dlg.close()}
AT.crear={abrir:abrir,cerrar:cerrar,nuevo:nuevo,armar:armar,tipos:TIPOS,plantillasInicio:plantillasInicio,sugeridas:sugeridas,
  paquetes:PAQUETES,crearPaquete:crearPaquete,guardarPlantilla:guardarPlantilla,plantillaDe:plantillaDe,desdePlantilla:desdePlantilla,nuevoDesde:nuevoDesde};
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

/* ---------- Deshacer una eliminación (la página está en la papelera) y avisos de otra página ---------- */
var borrado=null;
try{borrado=JSON.parse(sessionStorage.getItem('onelearn:eliminado')||'null');sessionStorage.removeItem('onelearn:eliminado')}catch(e){}
if(borrado&&borrado.id&&AT.aviso){
  AT.aviso('«'+(borrado.titulo||'Sin título')+'» se movió a la papelera.','Deshacer',function(){
    AT.datos.papelera.restaurar(borrado.id).then(function(){
      location.href=RAIZ+'documento.html?id='+encodeURIComponent(borrado.id);
    },function(){AT.aviso('No se pudo recuperar. Búscala en la papelera.')});
  });
}
var avisoPendiente=null;
try{avisoPendiente=sessionStorage.getItem('onebook:aviso');sessionStorage.removeItem('onebook:aviso')}catch(e){}
if(avisoPendiente&&AT.aviso)AT.aviso(avisoPendiente);
})();
