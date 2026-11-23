/* OneBook: página de un documento tuyo (documento.html?id=...).
   Dos modos: «Editar» (título, propiedades y el editor de bloques, con autoguardado) y «Leer» (el documento
   dibujado igual que una lección, con su índice, repaso interactivo y modo zen). Desde «⋯» se puede
   descargar como Markdown, duplicar o eliminar (con «Deshacer»).
   Usa AT.datos (datos.js), AT.bloques (bloques.js) y AT.editor (editor.js). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
var page=$('#docPage'),topbar=$('#topbar');
var params=new URLSearchParams(location.search),ID=params.get('id')||'';
var CLAVE_MODOS='aprende-tecnologia:modos';
var doc=null,modo='editar',ed=null,guardando=0,pendiente=false,timer=null,registro=null;

function lsJSON(k){try{return JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){return {}}}
function modoGuardado(){return lsJSON(CLAVE_MODOS)[ID]}
function recordarModo(m){var x=lsJSON(CLAVE_MODOS);x[ID]=m;try{localStorage.setItem(CLAVE_MODOS,JSON.stringify(x))}catch(e){}}
function tipo(){return AT.tiposDoc[doc&&doc.tipo]||{nombre:'Documento',icono:'page'}}
/* Tesis (y después investigación): fuentes, citas, bibliografía y registro de autoría */
function academico(){return !!tipo().academico&&!!AT.fuentes&&!!AT.autoria}

/* ---------- Barra superior: modo, estado y más opciones ---------- */
var estado=document.createElement('span');
estado.className='doc-estado';estado.setAttribute('role','status');
estado.innerHTML='<i class="doc-punto" aria-hidden="true"></i><span class="doc-estado-t" id="docEstado"></span>';
var estadoT=estado.lastChild;
var modoBtn=document.createElement('button');
modoBtn.type='button';modoBtn.className='tb-modo';modoBtn.id='docModo';
var masBtn=document.createElement('button');
masBtn.type='button';masBtn.className='icon-btn';masBtn.id='docMas';
masBtn.setAttribute('aria-label','Más opciones del documento');masBtn.title='Más opciones';masBtn.setAttribute('aria-haspopup','menu');
masBtn.innerHTML=ico('puntos');
var ref=$('#zenBtn')||$('#aaBtn');
topbar.insertBefore(estado,ref);topbar.insertBefore(modoBtn,ref);topbar.insertBefore(masBtn,ref);
modoBtn.hidden=masBtn.hidden=true;

function ponerEstado(t,k){estadoT.textContent=t;estado.setAttribute('data-k',k||'')}

/* ---------- Guardar ---------- */
function guardar(){
  clearTimeout(timer);timer=null;
  if(!doc)return Promise.resolve();
  if(ed)doc.contenido=ed.json();
  var n=++guardando;
  pendiente=false;
  ponerEstado('Guardando…');
  return AT.datos.documentos.guardar(doc).then(function(d){
    doc.editado=d.editado;doc.creado=d.creado;
    if(n===guardando&&!pendiente)ponerEstado('Guardado','ok');
    if(AT.proteger&&academico())AT.proteger.guardado(doc);
  },function(){
    ponerEstado('No se pudo guardar','err');
  });
}
function cambio(){
  pendiente=true;
  ponerEstado('Sin guardar');
  clearTimeout(timer);timer=setTimeout(guardar,600);
}
addEventListener('pagehide',function(){if(pendiente||timer){if(ed)doc.contenido=ed.json();guardar()}});
/* Para el contenedor de pestañas: guarda ya lo pendiente (antes de cerrar o descargar la pestaña) */
AT.docGuardarYa=function(){return (pendiente||timer)?guardar():Promise.resolve()};
document.addEventListener('visibilitychange',function(){if(document.hidden&&(pendiente||timer))guardar()});

/* ---------- Modo «Editar» ---------- */
function autoAlto(t){t.style.height='auto';t.style.height=t.scrollHeight+'px'}
function pintarEditar(){
  page.innerHTML='<div class="page-icon">'+ico(tipo().icono)+'</div>'+
    '<textarea class="doc-titulo" id="docTitulo" rows="1" aria-label="Título del documento" placeholder="Sin título" spellcheck="true"></textarea>'+
    '<div class="doc-props" id="docProps"></div>'+
    (academico()?'<div class="ts-barra" id="tsBarra" role="group" aria-label="Herramientas de la tesis"></div>':'')+
    '<div class="doc-barra" id="docBarra"></div>'+
    '<div class="doc-cuerpo" id="docCuerpo"></div>';
  var tit=$('#docTitulo');
  tit.value=doc.titulo||'';
  requestAnimationFrame(function(){autoAlto(tit)});
  tit.addEventListener('input',function(){
    doc.titulo=tit.value.replace(/\s*\n\s*/g,' ');
    autoAlto(tit);titulo();cambio();
  });
  tit.addEventListener('keydown',function(e){
    if(e.key==='Enter'||(e.key==='ArrowDown'&&tit.selectionStart===tit.value.length)){e.preventDefault();ed.enfocar('start')}
  });
  pintarProps();
  registro=academico()?AT.autoria.extension(doc,{alCambiar:cambio,editor:function(){return ed&&ed.tiptap}}):null;
  ed=AT.editor.crear({
    host:$('#docCuerpo'),barra:$('#docBarra'),contenido:doc.contenido,
    etiqueta:'Contenido de '+(doc.titulo||'el documento'),
    extensiones:registro?[registro.extension]:[],
    alCambiar:function(){guardar();pintarTesis()},
    alEscribir:function(){pendiente=true;ponerEstado('Sin guardar')}
  });
  if(registro)registro.activar();
  pintarTesis();
  /* Esc dentro del editor (sin menús abiertos) suelta el foco: así el siguiente Esc sale del modo zen */
  /* (ProseMirror siempre marca Esc como atendido; por eso se mira si había un menú abierto al pulsarla) */
  var menuAlPulsar=false,vd=ed.tiptap.view.dom;
  vd.addEventListener('keydown',function(e){if(e.key==='Escape')menuAlPulsar=!!AT.menu.abierto()},true);
  vd.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!menuAlPulsar&&!AT.menu.abierto())vd.blur();
  });
}
/* Barra de la tesis: fuentes, citar, autoría y palabras */
function pintarTesis(){
  var b=$('#tsBarra');if(!b)return;
  var n=(doc.fuentes||[]).length,w=ed?ed.palabras():AT.bloques.palabras(doc);
  if(!b.firstChild)b.innerHTML='<button class="btn" type="button" data-ts="fuentes">'+ico('libro')+'<span>Fuentes</span><span class="ts-n"></span></button>'+
    '<button class="btn" type="button" data-ts="citar">'+ico('comillas')+'<span>Citar</span></button>'+
    '<button class="btn" type="button" data-ts="autoria">'+ico('tesis')+'<span>Autoría</span></button>'+
    (AT.proteger?'<button class="btn ts-resp" type="button" data-ts="respaldo">'+ico('escudo')+'<span class="ts-resp-t">Respaldo</span></button>':'')+
    (AT.entrega?'<button class="btn" type="button" data-ts="entregar">'+ico('descargar')+'<span>Entregar</span></button>':'')+
    '<span class="ts-palabras" aria-live="off"></span>';
  $('.ts-n',b).textContent=n?String(n):'';
  $('[data-ts="fuentes"]',b).setAttribute('aria-label','Fuentes: '+n);
  $('.ts-palabras',b).textContent=AT.fmt(w)+(w===1?' palabra':' palabras');
  pintarRespaldo(w);
}
/* «Respaldo»: cuándo fue la última copia fuera del navegador; se marca si hace falta otra */
var palabrasTesis=0;
function pintarRespaldo(w){
  var r=$('[data-ts="respaldo"]',page);if(!r||!AT.proteger)return;
  if(w!=null)palabrasTesis=w;
  AT.proteger.resumen(doc,palabrasTesis).then(function(x){
    $('.ts-resp-t',r).textContent=x.texto;
    r.classList.toggle('ts-aviso',!!x.aviso);
    r.title=x.titulo;
    r.setAttribute('aria-label',x.texto+(x.aviso?'. Conviene hacer una copia':'')+'. Proteger '+(tipo().nombre==='Tesis'?'tu tesis':'el documento'));
  });
}
if(AT.proteger)AT.proteger.vigilar(function(){pintarRespaldo()});
/* «Entregar»: formato, revisión previa, PDF (imprimir.html) y Word */
function abrirEntregar(){
  if(ed)doc.contenido=ed.json();
  AT.entrega.dialogo(doc,{
    alCambiar:function(k){
      cambio();
      if(k==='estilo'&&AT.fuentes)AT.fuentes.refrescar();
    },
    alPdf:function(){
      if(ed)doc.contenido=ed.json();
      guardar().then(function(){location.href='imprimir.html?id='+encodeURIComponent(doc.id)});
    },
    alDocx:function(){
      if(ed)doc.contenido=ed.json();
      return guardar().then(function(){return AT.exportarDocx.descargar(doc)}).then(function(n){cambio();return n});
    }
  });
}
function abrirProteger(){if(ed)doc.contenido=ed.json();AT.proteger.dialogo(doc,{antes:function(){if(ed)doc.contenido=ed.json()}})}
function abrirFuentes(){AT.fuentes.dialogo({doc:doc,alCambiar:function(){cambio();pintarTesis()}})}
function abrirAutoria(){if(ed)doc.contenido=ed.json();AT.autoria.panel(doc,{alCambiar:cambio})}
page.addEventListener('click',function(e){
  var b=e.target.closest('[data-ts]');if(!b)return;
  var k=b.getAttribute('data-ts');
  if(k==='fuentes')abrirFuentes();
  else if(k==='autoria')abrirAutoria();
  else if(k==='respaldo')abrirProteger();
  else if(k==='entregar')abrirEntregar();
  else if(ed)ed.citarFuente();
});
function pintarProps(){
  var cont=$('#docProps');
  var props=doc.props||(doc.props=[]);
  cont.innerHTML=props.map(function(p,i){
    return '<div class="dp-fila" data-i="'+i+'">'+
      '<input class="dp-n" type="text" value="'+esc(p.nombre)+'" aria-label="Nombre de la propiedad '+(i+1)+'" placeholder="Propiedad">'+
      '<input class="dp-v" type="text" value="'+esc(p.valor)+'" aria-label="'+esc(p.nombre||'Valor')+'" placeholder="Vacío">'+
      '<button type="button" class="ed-mini" data-dp="quitar" aria-label="Quitar la propiedad '+esc(p.nombre||(i+1))+'">'+ico('close')+'</button></div>';
  }).join('')+'<button type="button" class="ed-link" data-dp="agregar">+ Propiedad</button>';
}
page.addEventListener('input',function(e){
  var f=e.target.closest('.dp-fila');
  if(!f)return;
  var p=doc.props[+f.getAttribute('data-i')];
  if(e.target.classList.contains('dp-n')){p.nombre=e.target.value;$('.dp-v',f).setAttribute('aria-label',p.nombre||'Valor')}
  else p.valor=e.target.value;
  cambio();
  if(AT.fuentes)AT.fuentes.refrescar();
});
page.addEventListener('click',function(e){
  var b=e.target.closest('[data-dp]');
  if(!b)return;
  if(b.getAttribute('data-dp')==='agregar'){
    doc.props.push({nombre:'',valor:'',estilo:'texto'});
    pintarProps();cambio();
    var filas=$$('.dp-fila .dp-n',page);filas[filas.length-1].focus();
  }else{
    var i=+b.closest('.dp-fila').getAttribute('data-i');
    doc.props.splice(i,1);pintarProps();cambio();
    var sig=$$('.dp-fila .dp-n',page)[i]||$('[data-dp="agregar"]',page);sig.focus();
  }
});

/* ---------- Modo «Leer» ---------- */
function pintarLeer(){
  page.innerHTML='';
  var copia=JSON.parse(JSON.stringify(doc));
  copia.icono=tipo().icono;
  copia.props=(copia.props||[]).filter(function(p){return p.nombre&&String(p.valor||'').trim()});
  AT.bloques.dibujar(copia,page);
  if(!AT.bloques.palabras(doc)){
    var v=document.createElement('p');v.className='hint doc-vacio';
    v.textContent='Este documento todavía está vacío. Toca «Editar» para escribir.';
    page.appendChild(v);
  }
}

/* ---------- Cambiar de modo ---------- */
function ponerModo(m,enfocar,sinRecordar){
  if(ed){doc.contenido=ed.json();if(pendiente||timer)guardar();if(registro){registro.desactivar();registro=null}ed.destruir();ed=null}
  modo=m;if(!sinRecordar)recordarModo(m);
  document.documentElement.classList.toggle('doc-editando',m==='editar');
  modoBtn.innerHTML=m==='editar'?ico('ojo')+'<span>Leer</span>':ico('note')+'<span>Editar</span>';
  modoBtn.setAttribute('aria-label',m==='editar'?'Ver como lectura':'Editar el documento');
  modoBtn.title=m==='editar'?'Ver como lectura (se ve como una lección)':'Editar';
  if(m==='editar')pintarEditar();else pintarLeer();
  if(bloqueado)pintarBloqueo();
  if(enfocar==='titulo'){var t=$('#docTitulo');if(t){t.focus();t.select()}}
  else if(enfocar==='cuerpo'&&ed)ed.enfocar('start');
  else if(enfocar)modoBtn.focus({preventScroll:true});
}
modoBtn.addEventListener('click',function(){ponerModo(modo==='editar'?'leer':'editar',true)});
/* E cambia a editar desde la lectura */
document.addEventListener('keydown',function(e){
  if(modo!=='leer'||bloqueado||e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;
  var t=e.target;
  if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
  if(e.key==='e'||e.key==='E'){e.preventDefault();ponerModo('editar','cuerpo')}
});

function titulo(){
  var t=doc.titulo||'Sin título';
  document.title=t+' · OneBook';
  var c=$('.crumbs .cur');if(c)c.textContent=t;
}

/* ---------- Más opciones ---------- */
masBtn.addEventListener('click',function(){
  AT.menu.abrir(masBtn,(academico()?[
    {t:'Fuentes',i:'libro',d:'Agregar, importar y editar',f:abrirFuentes},
    {t:'Autoría y constancia',i:'tesis',d:'Cómo escribiste este documento',f:abrirAutoria},
    {t:'Proteger y respaldar',i:'escudo',d:'Copias fuera de este navegador',f:abrirProteger},
    {t:'Entregar: PDF y Word',i:'descargar',d:'Formato, revisión y exportar',f:abrirEntregar},
    {sep:true}]:[]).concat([
    {t:'Descargar como Markdown',i:'descargar',d:'Un archivo .md con el texto',f:descargarMd}
  ],academico()||!AT.entrega?[]:[{t:'Imprimir o guardar como PDF',i:'page',d:'Con números de página',f:abrirEntregar}],[
    {t:'Duplicar documento',i:'copiar',f:duplicar},
    {sep:true},
    {t:'Eliminar documento',i:'basura',peligro:true,f:eliminar}
  ]),{etiqueta:'Más opciones del documento',devolver:masBtn,alElegir:function(it){it.f()}});
});
function nombreArchivo(ext){
  var s=(doc.titulo||'documento').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return (s||'documento')+ext;
}
function descargarMd(){
  var md=aMarkdown(doc);
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([md],{type:'text/markdown;charset=utf-8'}));
  a.download=nombreArchivo('.md');
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
}
function duplicar(){
  guardar().then(function(){
    var c=JSON.parse(JSON.stringify(doc));
    c.id='d-'+AT.bloques.nuevoId().slice(2)+AT.bloques.nuevoId().slice(4);
    c.titulo='Copia de '+(doc.titulo||'Sin título');
    delete c.creado;
    return AT.datos.documentos.guardar(c);
  }).then(function(c){location.href='documento.html?id='+encodeURIComponent(c.id)});
}
function eliminar(){
  var d=document.createElement('dialog');
  d.className='atajos';d.setAttribute('aria-labelledby','elT');
  d.innerHTML='<div class="at-h"><h2 id="elT">¿Eliminar este documento?</h2></div>'+
    '<p class="td-p">«'+esc(doc.titulo||'Sin título')+'» se borrará de este dispositivo. Podrás deshacerlo justo después.</p>'+
    '<div class="td-bt"><button class="btn danger" type="button" data-el="si">Eliminar</button><button class="btn" type="button" data-el="no">Cancelar</button></div>';
  document.body.appendChild(d);
  d.addEventListener('close',function(){d.remove();masBtn.focus({preventScroll:true})});
  d.addEventListener('click',function(e){
    var b=e.target.closest('[data-el]');
    if(e.target===d||b&&b.getAttribute('data-el')==='no'){d.close();return}
    if(!b)return;
    if(ed)doc.contenido=ed.json();
    clearTimeout(timer);timer=null;pendiente=false;
    try{sessionStorage.setItem('onelearn:eliminado',JSON.stringify(doc))}catch(x){}
    AT.datos.documentos.borrar(doc.id).then(function(){location.href='inicio.html'});
  });
  d.showModal();
  $('[data-el="no"]',d).focus();
}

/* ---------- Markdown ---------- */
function mdTexto(lista){
  return (lista||[]).map(function(n){
    if(n.type==='hardBreak')return '  \n';
    if(n.type==='cita')return '['+((n.attrs||{}).texto||'cita')+']('+((n.attrs||{}).href||'')+')';
    if(n.type==='referencia')return AT.fuentes?AT.fuentes.cita(n.attrs||{},mdDoc.fuentes,mdDoc):'';
    if(AT.piezas&&AT.piezas.md[n.type])return AT.piezas.md[n.type](n,mdAyuda);
    if(n.type!=='text')return '';
    var t=n.text||'',ms=(n.marks||[]).map(function(m){return m.type});
    if(ms.indexOf('code')>=0)t='`'+t+'`';
    else t=t.replace(/([*_`\[\]#\\])/g,'\\$1');
    if(ms.indexOf('bold')>=0)t='**'+t+'**';
    if(ms.indexOf('italic')>=0)t='*'+t+'*';
    if(ms.indexOf('strike')>=0)t='~~'+t+'~~';
    var l=(n.marks||[]).filter(function(m){return m.type==='link'})[0];
    if(l&&AT.bloques.hrefSeguro(l.attrs&&l.attrs.href))t='['+t+']('+l.attrs.href+')';
    return t;
  }).join('');
}
function mdBloques(lista,prefijo){
  prefijo=prefijo||'';
  return (lista||[]).map(function(n){return mdBloque(n,prefijo)}).filter(function(x){return x!==''}).join('\n\n');
}
function conPrefijo(texto,pre){return texto.split('\n').map(function(l){return pre+l}).join('\n')}
function mdBloque(n,pre){
  var a=n.attrs||{},c=n.content||[];
  switch(n.type){
    case 'paragraph':return mdTexto(c);
    case 'heading':return (a.level===3?'### ':'## ')+mdTexto(c);
    case 'bulletList':case 'orderedList':case 'taskList':
      return c.map(function(li,i){
        var marca=n.type==='orderedList'?(i+1)+'. ':n.type==='taskList'?'- ['+((li.attrs||{}).checked?'x':' ')+'] ':'- ';
        var cuerpo=mdBloques(li.content);
        return marca+conPrefijo(cuerpo,'   ').replace(/^ {3}/,'');
      }).join('\n');
    case 'blockquote':return conPrefijo(mdBloques(c),'> ');
    case 'codeBlock':return '```\n'+c.map(function(x){return x.text||''}).join('')+'\n```';
    case 'horizontalRule':return '---';
    case 'callout':
      var nom={info:'Nota',aviso:'Aviso',idea:'Idea'}[a.variante]||'Nota';
      return conPrefijo('**'+nom+':** '+mdBloques(c),'> ');
    case 'columnas':return c.map(function(col){return mdBloques(col.content)}).join('\n\n');
    case 'desplegable':return '**'+mdTexto((c[0]||{}).content)+'**\n\n'+mdBloques((c[1]||{}).content);
    case 'resumen':return '## Resumen\n\n'+mdBloques(c);
    case 'indice':return '';
    case 'bibliografia':return AT.fuentes?AT.fuentes.bibliografia(mdDoc,a.todas).map(function(r){return AT.fuentes.trozosMarkdown(r.trozos)}).join('\n\n'):'';
    case 'declaracion':return AT.fuentes?'## Declaración de autoría\n\n'+AT.fuentes.declaracion(a,AT.fuentes.autorDe(mdDoc)).map(function(x){return Array.isArray(x)?x.map(function(y){return '- '+y}).join('\n'):x}).join('\n\n'):'';
    case 'laboratorio':return '*Laboratorio: '+(a.titulo||'')+'*';
    case 'repaso':
      return (a.preguntas||[]).filter(function(q){return q.q}).map(function(q,i){
        return (i+1)+'. '+q.q+'\n'+(q.o||[]).map(function(o,j){return '   - '+(j===q.a?'**'+o+'** (correcta)':o)}).join('\n')+(q.e?'\n\n   '+q.e:'');
      }).join('\n\n');
    case 'table':
      var filas=c.map(function(f){return (f.content||[]).map(function(x){return mdBloques(x.content).replace(/\n+/g,' ').replace(/\|/g,'\\|')})});
      if(!filas.length)return '';
      var cab=filas[0],sep=cab.map(function(){return '---'});
      return ['| '+cab.join(' | ')+' |','| '+sep.join(' | ')+' |'].concat(filas.slice(1).map(function(f){return '| '+f.join(' | ')+' |'})).join('\n');
    default:
      if(AT.piezas&&AT.piezas.md[n.type])return AT.piezas.md[n.type](n,mdAyuda);
      return mdBloques(c);
  }
}
/* Figuras, tablas numeradas, ecuaciones y notas al pie (piezas.js): numeración y notas del documento */
var mdDoc={},mdAyuda={bloques:function(l){return mdBloques(l)},notas:[],piezas:{lista:[],por:{}},doc:{}};
function aMarkdown(d){
  mdDoc=d;
  mdAyuda.notas=[];mdAyuda.doc=d;
  mdAyuda.piezas=AT.piezas?AT.piezas.numerar(d.contenido):{lista:[],por:{}};
  var props=(d.props||[]).filter(function(p){return p.nombre&&p.valor}).map(function(p){return '- **'+p.nombre+':** '+p.valor}).join('\n');
  var cuerpo=mdBloques((d.contenido||{}).content);
  var notas=mdAyuda.notas.map(function(t,i){return '[^'+(i+1)+']: '+t.replace(/\n+/g,' ')}).join('\n');
  return '# '+(d.titulo||'Sin título')+'\n\n'+(props?props+'\n\n':'')+cuerpo+'\n'+(notas?'\n'+notas+'\n':'');
}
AT.documentoMarkdown=aMarkdown;

/* ---------- Cargar ---------- */
function noEncontrado(){
  page.innerHTML='<div class="page-icon">'+ico('notas')+'</div><h1>No encontramos este documento</h1>'+
    '<p>No está guardado en este navegador. Si lo creaste en otro dispositivo o navegador, descarga ahí un respaldo desde «Tus datos» e impórtalo aquí.</p>'+
    '<p><a class="btn pri" href="inicio.html">Ir al inicio</a> <button class="btn" type="button" data-crear>Crear algo nuevo</button></p>';
  document.title='Documento no encontrado · OneBook';
}
AT.documentoAbierto=ID;
if(!ID||!AT.editor){noEncontrado();return}
AT.datos.documentos.leer(ID).then(function(d){
  if(!d||!d.contenido){noEncontrado();return}
  doc=d;
  if(!doc.props)doc.props=[];
  if(tipo().academico&&!Array.isArray(doc.fuentes))doc.fuentes=[];
  AT.docActual=doc;AT.docCambio=cambio;
  titulo();
  modoBtn.hidden=masBtn.hidden=false;
  var nuevo=false;
  try{nuevo=sessionStorage.getItem('onelearn:recien-creado')===ID;if(nuevo)sessionStorage.removeItem('onelearn:recien-creado')}catch(e){}
  var conAncla=location.hash.length>1;
  ponerModo(nuevo?'editar':conAncla?'leer':(modoGuardado()||'editar'),nuevo?'titulo':false);
  ponerEstado('Guardado','ok');
  avisarAbierto();
  if(AT.refrescarNotas)AT.refrescarNotas();
  /* Si llegaste con #bloque (desde una cita o la búsqueda), se va a ese bloque en modo lectura */
  if(location.hash.length>1&&modo==='leer'){
    var b=document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if(b)b.scrollIntoView({block:'start'});
  }
},function(){noEncontrado()});

/* ---------- La misma página en dos pestañas (de la app o del navegador) ----------
   Al abrir un documento se avisa a las demás. La que ya lo tenía guarda lo pendiente y queda solo para leer,
   con un aviso y «Editar aquí» (que la vuelve la pestaña activa y deja a la otra para leer). La que lo acaba de
   abrir, si todavía no cambió nada, vuelve a leerlo cuando llega ese último guardado: así nada se pisa. */
var YO=Math.random().toString(36).slice(2),bloqueado=false,abiertoEn=0,canalDoc=null;
try{if('BroadcastChannel' in window)canalDoc=new BroadcastChannel('onebook-documentos')}catch(e){}
function avisarAbierto(){
  abiertoEn=Date.now();
  if(canalDoc)try{canalDoc.postMessage({tipo:'abierto',id:ID,quien:YO})}catch(e){}
}
function pintarBloqueo(){
  var v=document.createElement('div');
  v.className='doc-bloqueo';v.setAttribute('role','status');
  v.innerHTML='<p><b>Esta página también está abierta en otra pestaña.</b> Aquí queda solo para leer, para que no se pisen los cambios.</p>'+
    '<button class="btn" type="button" id="docEditarAqui">Editar aquí</button>';
  page.insertBefore(v,page.firstChild);
  $('#docEditarAqui',v).addEventListener('click',function(){location.reload()});
}
function bloquear(){
  if(bloqueado||!doc)return;
  bloqueado=true;
  (pendiente||timer?guardar():Promise.resolve()).then(function(){
    /* Sin AT.docCambio, el plan de pagos y lo demás se ven pero no se marcan */
    AT.docCambio=null;
    modoBtn.hidden=true;
    ponerModo('leer',false,true);
    ponerEstado('Solo lectura');
  });
}
if(canalDoc)canalDoc.onmessage=function(e){
  var m=e.data;
  if(m&&m.tipo==='abierto'&&m.id===ID&&m.quien!==YO)bloquear();
};
/* Vuelve a leer el documento (después del último guardado de la otra pestaña) */
function releer(){
  AT.datos.documentos.leer(ID).then(function(d){
    if(!d||!d.contenido||pendiente||timer||bloqueado)return;
    if(ed){if(registro){registro.desactivar();registro=null}ed.destruir();ed=null}
    doc=d;if(!doc.props)doc.props=[];
    if(tipo().academico&&!Array.isArray(doc.fuentes))doc.fuentes=[];
    AT.docActual=doc;
    titulo();ponerModo(modo,false,true);ponerEstado('Guardado','ok');
  });
}
/* Otra pestaña cambió este documento */
AT.datos.on(function(c,deOtra){
  if(!deOtra||!doc||c.almacen!=='documentos'||c.id!==ID)return;
  if(c.borrado){AT.aviso('Este documento se eliminó en otra pestaña.');return}
  if(bloqueado)return;
  if(!pendiente&&!timer&&Date.now()-abiertoEn<5000){releer();return}
  AT.aviso('Este documento cambió en otra pestaña.','Ver la versión nueva',function(){location.reload()});
});
})();
