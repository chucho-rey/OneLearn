/* OneLearn: «Crear».
   Pregunta qué quieres crear y empieza el documento con la estructura de ese tipo. Hoy: libreta de estudio,
   notas, apuntes de clase y tesis (con fuentes, citas en APA 7 y registro de autoría); libro, investigación
   y los demás llegan después.
   Todos los tipos usan el mismo formato de bloques (bloques.js), así que después se podrán convertir.
   Se abre desde «Crear» en la barra lateral y en el inicio. Expone AT.tiposDoc y AT.crear. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,RAIZ=AT.rutas.raiz;

var TIPOS=AT.tiposDoc={
  libreta:{nombre:'Libreta de estudio',icono:'libreta',desc:'Secciones, resumen y preguntas de repaso, como una lección.',listo:true},
  notas:{nombre:'Notas',icono:'notas',desc:'Una página en blanco para escribir rápido.',listo:true},
  clase:{nombre:'Apuntes de clase',icono:'clase',desc:'Materia, profesor y fecha arriba; tareas al final.',listo:true},
  libro:{nombre:'Libro',icono:'libro',desc:'Portada, partes y capítulos.'},
  investigacion:{nombre:'Documento de investigación',icono:'investigacion',desc:'Resumen, método, resultados y referencias.'},
  tesis:{nombre:'Tesis',icono:'tesis',desc:'Capítulos, fuentes y citas en APA 7, y registro de autoría.',listo:true,academico:true},
  guia:{nombre:'Guía para examen',icono:'guia',desc:'Temas, preguntas y repaso hasta la fecha del examen.'},
  bitacora:{nombre:'Bitácora de laboratorio',icono:'bitacora',desc:'Entradas con fecha, objetivo y resultados.'},
  presentacion:{nombre:'Presentación',icono:'presentacion',desc:'Diapositivas hechas con los mismos bloques.'},
  blanco:{nombre:'Documento en blanco',icono:'blanco',desc:'Solo las herramientas básicas.'}
};
var ORDEN=['libreta','notas','clase','libro','investigacion','tesis','guia','bitacora','presentacion','blanco'];

/* ---------- Plantillas ---------- */
function id(){return AT.bloques?AT.bloques.nuevoId():'b-'+Math.random().toString(36).slice(2,8)}
function P(t){return t?{type:'paragraph',attrs:{id:id()},content:[{type:'text',text:t}]}:{type:'paragraph',attrs:{id:id()}}}
function H(t,nivel){var h={type:'heading',attrs:{id:id(),level:nivel||2}};if(t)h.content=[{type:'text',text:t}];return h}
function hoy(){return new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}
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
/* Crea el documento, lo guarda y lo abre */
function nuevo(tipo){
  var t=TIPOS[tipo],pl=PLANTILLAS[tipo];
  if(!t||!pl)return Promise.reject(new Error('Ese tipo todavía no está disponible'));
  /* Se pide aquí, durante el clic: algunos navegadores solo lo permiten así */
  AT.datos.pedirPersistencia();
  var base=pl(),ahora=new Date().toISOString();
  var doc={formato:1,tipo:tipo,id:idDoc(),titulo:base.titulo,props:base.props,creado:ahora,editado:ahora,
    contenido:{type:'doc',content:base.contenido}};
  if(base.fuentes)doc.fuentes=base.fuentes;
  if(base.autoria)doc.autoria=base.autoria;
  return AT.datos.documentos.guardar(doc,{conservarFecha:true}).then(function(d){
    try{sessionStorage.setItem('onelearn:recien-creado',d.id)}catch(e){}
    location.href=RAIZ+'documento.html?id='+encodeURIComponent(d.id);
    return d;
  });
}

/* ---------- Ventana «¿Qué quieres crear?» ---------- */
var dlg=null,abridor=null;
function crearVentana(){
  dlg=document.createElement('dialog');
  dlg.className='atajos crear-dlg';
  dlg.setAttribute('aria-labelledby','crT');
  var listos=ORDEN.filter(function(k){return TIPOS[k].listo}),pronto=ORDEN.filter(function(k){return !TIPOS[k].listo});
  dlg.innerHTML='<div class="at-h"><h2 id="crT">¿Qué quieres crear?</h2>'+
    '<button class="lec-x" type="button" data-cr="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<p class="td-p">Cada tipo empieza con su estructura y trae las herramientas justas. Se guarda solo en este dispositivo.</p>'+
    '<div class="crear-g">'+listos.map(function(k){
      var t=TIPOS[k];
      return '<button type="button" class="crear-o" data-tipo="'+k+'">'+ico(t.icono)+'<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small></span></button>';
    }).join('')+'</div>'+
    '<h3 class="crear-h">Llegan después</h3>'+
    '<ul class="crear-p">'+pronto.map(function(k){
      var t=TIPOS[k];
      return '<li>'+ico(t.icono)+'<span>'+esc(t.nombre)+'</span></li>';
    }).join('')+'</ul>'+
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
AT.crear={abrir:abrir,cerrar:cerrar,nuevo:nuevo,tipos:TIPOS};
document.addEventListener('click',function(e){
  if(e.target.closest('#sideCrear,[data-crear]'))abrir();
});

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
