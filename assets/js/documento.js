/* OneBook: página de un documento tuyo (documento.html?id=...).
   Dos modos: «Editar» (título, propiedades y el editor de bloques, con autoguardado) y «Leer» (la página
   dibujada para leer, con su índice y modo zen). Desde «⋯» se puede imprimir o exportar (PDF y Word),
   descargar como Markdown, duplicar o eliminar (con «Deshacer») y abrir el historial de versiones
   (versiones.js; cada guardado se lo cuenta a AT.datos.versiones, y AT.docVersiones restaura o recupera).
   Usa AT.datos (datos.js), AT.bloques (bloques.js) y AT.editor (editor.js). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
var page=$('#docPage'),topbar=$('#topbar');
var params=new URLSearchParams(location.search),ID=params.get('id')||'';
var CLAVE_MODOS='aprende-tecnologia:modos';
var doc=null,modo='editar',ed=null,guardando=0,pendiente=false,timer=null;

function lsJSON(k){try{return JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){return {}}}
function modoGuardado(){return lsJSON(CLAVE_MODOS)[ID]}
function recordarModo(m){var x=lsJSON(CLAVE_MODOS);x[ID]=m;try{localStorage.setItem(CLAVE_MODOS,JSON.stringify(x))}catch(e){}}
function tipo(){return AT.tiposDoc[doc&&doc.tipo]||{nombre:'Documento',icono:'page'}}

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
/* Favorita (fase F5): sale primero en la barra lateral y en el Inicio */
var favBtn=document.createElement('button');
favBtn.type='button';favBtn.className='icon-btn doc-fav';favBtn.id='docFav';
var ref=$('#zenBtn')||$('#aaBtn');
topbar.insertBefore(estado,ref);topbar.insertBefore(favBtn,ref);topbar.insertBefore(modoBtn,ref);topbar.insertBefore(masBtn,ref);
modoBtn.hidden=masBtn.hidden=favBtn.hidden=true;
function pintarFav(){
  var f=!!(doc&&doc.favorito);
  favBtn.innerHTML=ico(f?'estrella-llena':'estrella');
  favBtn.setAttribute('aria-pressed',String(f));
  favBtn.setAttribute('aria-label','Favorita');
  favBtn.title=f?'Quitar de favoritas':'Agregar a favoritas';
}
/* Se guarda sin cambiar la fecha de edición (no sube en «Recientes») */
function favorita(){
  if(!doc||bloqueado||sinPermiso)return;
  var f=!doc.favorito;
  (pendiente||timer?guardar():Promise.resolve()).then(function(){
    if(f)doc.favorito=true;else delete doc.favorito;
    pintarFav();
    return AT.datos.documentos.guardar(doc,{conservarFecha:true});
  }).then(function(){AT.aviso(f?'Agregada a favoritas.':'Ya no es favorita.')},function(){AT.aviso('No se pudo guardar. Inténtalo otra vez.')});
}
favBtn.addEventListener('click',favorita);
/* Ancho completo: la página usa todo el ancho de la pantalla (se guarda en el documento, como en Notion) */
function pintarAncho(){document.documentElement.classList.toggle('doc-completo',!!(doc&&doc.anchoCompleto))}
function anchoCompleto(){
  if(!doc||bloqueado||sinPermiso)return;
  var a=!doc.anchoCompleto;
  (pendiente||timer?guardar():Promise.resolve()).then(function(){
    if(a)doc.anchoCompleto=true;else delete doc.anchoCompleto;
    pintarAncho();
    return AT.datos.documentos.guardar(doc,{conservarFecha:true});
  }).then(null,function(){AT.aviso('No se pudo guardar. Inténtalo otra vez.')});
}

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
    /* El acceso lo pudo cambiar otra ventana: se queda el guardado (datos.js no lo pisa) */
    if(d.acceso)doc.acceso=d.acceso;if(d.editadoPor)doc.editadoPor=d.editadoPor;
    if(n===guardando&&!pendiente)ponerEstado('Guardado','ok');
    /* El historial decide si este guardado merece una versión (cada 5 minutos o antes de un borrado grande) */
    if(AT.datos.versiones&&!bloqueado&&!sinPermiso)AT.datos.versiones.observar(doc);
  },function(){
    ponerEstado('No se pudo guardar','err');
  });
}
function cambio(){
  pendiente=true;
  ponerEstado('Sin guardar');
  clearTimeout(timer);timer=setTimeout(guardar,600);
}
/* Al salir (o al cambiar de pestaña) se guarda lo pendiente y, si cambió algo desde la última versión, una nueva */
function alSalir(){
  if(!doc||bloqueado||sinPermiso)return;
  if(pendiente||timer){if(ed)doc.contenido=ed.json();guardar()}
  if(AT.datos.versiones)AT.datos.versiones.tomar(doc);
}
addEventListener('pagehide',alSalir);
/* Para el contenedor de pestañas: guarda ya lo pendiente (antes de cerrar o descargar la pestaña) */
AT.docGuardarYa=function(){return (pendiente||timer)?guardar():Promise.resolve()};
document.addEventListener('visibilitychange',function(){if(document.hidden)alSalir()});

/* ---------- Modo «Editar» ---------- */
function autoAlto(t){t.style.height='auto';t.style.height=t.scrollHeight+'px'}
function pintarEditar(){
  page.innerHTML='<div class="page-icon">'+ico(tipo().icono)+'</div>'+
    '<textarea class="doc-titulo" id="docTitulo" rows="1" aria-label="Título del documento" placeholder="Sin título" spellcheck="true"></textarea>'+
    '<div class="doc-props" id="docProps"></div>'+
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
  ed=AT.editor.crear({
    host:$('#docCuerpo'),barra:$('#docBarra'),contenido:doc.contenido,
    etiqueta:'Contenido de '+(doc.titulo||'el documento'),
    alCambiar:function(){guardar()},
    alEscribir:function(){pendiente=true;ponerEstado('Sin guardar')}
  });
  /* Esc dentro del editor (sin menús abiertos) suelta el foco: así el siguiente Esc sale del modo zen */
  /* (ProseMirror siempre marca Esc como atendido; por eso se mira si había un menú abierto al pulsarla) */
  var menuAlPulsar=false,vd=ed.tiptap.view.dom;
  vd.addEventListener('keydown',function(e){if(e.key==='Escape')menuAlPulsar=!!AT.menu.abierto()},true);
  vd.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!menuAlPulsar&&!AT.menu.abierto())vd.blur();
  });
}
/* «Imprimir o exportar»: formato del papel, PDF (imprimir.html) y Word */
function abrirExportar(){
  if(ed)doc.contenido=ed.json();
  AT.exportar.dialogo(doc,{
    alCambiar:function(){cambio()},
    alPdf:function(){
      if(ed)doc.contenido=ed.json();
      guardar().then(function(){location.href='imprimir.html?id='+encodeURIComponent(doc.id)});
    },
    alDocx:AT.exportarDocx?function(){
      if(ed)doc.contenido=ed.json();
      return (sinPermiso?Promise.resolve():guardar()).then(function(){return AT.exportarDocx.descargar(doc)});
    }:null
  });
}
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
  if(ed){doc.contenido=ed.json();if(pendiente||timer)guardar();ed.destruir();ed=null}
  modo=m;if(!sinRecordar)recordarModo(m);
  document.documentElement.classList.toggle('doc-editando',m==='editar');
  modoBtn.innerHTML=m==='editar'?ico('ojo')+'<span>Leer</span>':ico('note')+'<span>Editar</span>';
  modoBtn.setAttribute('aria-label',m==='editar'?'Ver como lectura':'Editar el documento');
  modoBtn.title=m==='editar'?'Ver como lectura':'Editar';
  if(m==='editar')pintarEditar();else pintarLeer();
  if(bloqueado)pintarBloqueo();
  if(sinPermiso)pintarPermiso();
  /* Quién tiene abierta esta página y si la edita o la lee (el explorador del Inicio lo muestra) */
  if(AT.datos.presencia&&doc){AT.datos.presencia.anunciar(ID,bloqueado||sinPermiso?'leer':m,tomaPendiente&&m==='editar');tomaPendiente=false}
  if(enfocar==='titulo'){var t=$('#docTitulo');if(t){t.focus();t.select()}}
  else if(enfocar==='cuerpo'&&ed)ed.enfocar('start');
  else if(enfocar)modoBtn.focus({preventScroll:true});
}
modoBtn.addEventListener('click',function(){ponerModo(modo==='editar'?'leer':'editar',true)});
/* E cambia a editar desde la lectura */
document.addEventListener('keydown',function(e){
  if(modo!=='leer'||bloqueado||sinPermiso||e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;
  var t=e.target;
  if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
  if(e.key==='e'||e.key==='E'){e.preventDefault();ponerModo('editar','cuerpo')}
});

function titulo(){
  var t=doc.titulo||'Sin título';
  document.title=t+' · OneBook';
  var c=$('.crumbs .cur');if(c)c.textContent=t;
}
/* ---------- Salas (E3): la sala de la página en la barra superior y «Mover a otra sala» ---------- */
function salaInfo(){
  var A=AT.datos.acceso,sa=A&&A.sala?A.sala(doc):'';
  if(!sa)return null;
  if(sa==='privado')return {id:'privado',nombre:'Privado'};
  var s=AT.empresa&&AT.empresa.sala(sa);
  return s?{id:sa,nombre:s.tipo==='general'?'General':s.nombre}:{id:sa,nombre:'Sala que ya no existe'};
}
function salaTexto(){var s=salaInfo();return s?'Ahora: '+s.nombre:''}
function pintarSala(){
  var s=salaInfo(),g=$('.crumbs>:first-child');
  if(!s||!g||g.classList.contains('cur'))return;
  var a=document.createElement('a');a.className='crumb-sala';a.href='sala.html?id='+encodeURIComponent(s.id);a.textContent=s.nombre;
  g.replaceWith(a);
  if(AT.pintarSalas)AT.pintarSalas();
}
function moverSala(){
  var E=AT.empresa,A=AT.datos.acceso,actual=A.sala(doc);
  var ls=E.salas().filter(function(x){return E.puedeSala(x.id,'editar')});
  var d=document.createElement('dialog');
  d.className='atajos doc-mover';d.setAttribute('aria-labelledby','docMovT');
  d.innerHTML='<div class="at-h"><h2 id="docMovT">Mover a otra sala</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<form novalidate><p class="td-p">La página la ven y la editan las personas de la sala. En Privado, solo tú y quien esté en su lista.</p>'+
    '<label class="campo-l"><span>Sala</span><select name="sala">'+ls.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===actual?' selected':'')+'>'+esc(x.tipo==='general'?'General (toda la empresa)':x.nombre)+'</option>'}).join('')+
    '<option value="privado"'+(actual==='privado'?' selected':'')+'>Privado (solo tú y su lista)</option></select></label>'+
    '<div class="td-bt"><button class="btn pri" type="submit">Mover</button><button class="btn" type="button" data-cerrar>Cancelar</button></div>'+
    '<p class="td-msg" role="status"></p></form>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){d.remove();masBtn.focus({preventScroll:true})});
  $('form',d).addEventListener('submit',function(e){
    e.preventDefault();var sa=e.target.elements.sala.value,m=$('.td-msg',d);
    if(sa===actual){d.close();return}
    A.mover(ID,sa).then(function(a){
      doc.acceso=a;d.close();pintarSala();
      var s=salaInfo();AT.aviso('La página está ahora en '+(s.id==='privado'?'Privado':'la sala «'+s.nombre+'»')+'.');
    },function(err){m.textContent=err&&err.message||'No se pudo mover.';m.classList.add('err')});
  });
  d.showModal();$('select',d).focus();
}
/* Quien no tiene acceso (una página de una sala donde no estás, o privada) no la ve: solo puede pedir acceso */
function sinAccesoVista(){
  var A=AT.datos.acceso,s=salaInfo(),pend=A.tuSolicitud(doc);
  modoBtn.hidden=favBtn.hidden=masBtn.hidden=true;
  page.innerHTML='<div class="page-icon">'+ico('candado')+'</div><h1>No tienes acceso a esta página</h1>'+
    '<p>'+(s&&s.id!=='privado'?'Está en la sala «'+esc(s.nombre)+'»: la ven las personas que la sala deja entrar.':'Es una página privada: solo la ven las personas de su lista.')+
    (pend?' Ya pediste «'+esc(A.nombreRol(pend.rol))+'»: está pendiente.':' Puedes pedirle acceso a quien la administra.')+'</p>'+
    '<p><button class="btn pri" type="button" id="docPedirAcceso">'+(pend?'Ver tu solicitud':'Pedir acceso')+'</button> <a class="btn" href="inicio.html">Ir al inicio</a></p>';
  document.title='Sin acceso · OneBook';
  var c=$('.crumbs .cur');if(c)c.textContent='Sin acceso';
  $('#docPedirAcceso').addEventListener('click',function(){if(AT.permisos)AT.permisos.abrir(ID,this,{pedir:'lector'})});
  ponerEstado('Sin acceso','');
}

/* ---------- Más opciones ---------- */
masBtn.addEventListener('click',function(){
  AT.menu.abrir(masBtn,(AT.exportar?[{t:'Imprimir o exportar',i:'page',d:'PDF con números de página o Word',f:abrirExportar}]:[]).concat([
    {t:'Descargar como Markdown',i:'descargar',d:'Un archivo .md con el texto',f:descargarMd}
  ],[
    {t:doc&&doc.favorito?'Quitar de favoritas':'Agregar a favoritas',i:'estrella',f:favorita},
    {t:doc&&doc.anchoCompleto?'Ancho normal':'Ancho completo',i:'ancho',d:doc&&doc.anchoCompleto?'Vuelve a la columna de siempre':'Usa todo el ancho de la pantalla',f:anchoCompleto},
    {t:'Personas y permisos',i:'users',d:permisoTexto(),f:function(){if(AT.permisos)AT.permisos.abrir(ID,masBtn)}},
  ],AT.datos.acceso&&AT.datos.acceso.sala&&AT.datos.acceso.sala(doc)&&AT.datos.acceso.puede(doc,'compartir')?[
    {t:'Mover a otra sala',i:'cambiar',d:salaTexto(),f:function(){setTimeout(moverSala,0)}}
  ]:[],[

    {t:'Historial de versiones',i:'historial',d:'Ver, comparar y recuperar lo de antes',f:function(){if(AT.versionesUI)AT.versionesUI.abrir(masBtn)}},
    {t:'Guardar como plantilla',i:'crear',d:'Para crear páginas iguales desde «Crear»',f:comoPlantilla},
    {t:'Duplicar documento',i:'copiar',f:duplicar},
  ],AT.datos.acceso&&!AT.datos.acceso.puede(doc,'compartir')?[]:[
    {sep:true},
    {t:'Mover a la papelera',i:'basura',peligro:true,f:eliminar}
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
    /* Las bases de datos se copian con sus filas: la copia se crea al abrir la página nueva (semilla) */
    var bloques=(c.contenido.content||[]).filter(function(b){return b.type==='basedatos'&&b.attrs&&b.attrs.base});
    return Promise.all(bloques.map(function(b){
      return AT.bases.semillaDe(b.attrs.base,true).then(function(s){if(s){b.attrs.semilla=s;b.attrs.base='';b.attrs.vista=''}});
    })).then(function(){return c});
  }).then(function(c){
    c.id='d-'+AT.bloques.nuevoId().slice(2)+AT.bloques.nuevoId().slice(4);
    c.titulo='Copia de '+(doc.titulo||'Sin título');
    delete c.creado;delete c.favorito;
    /* Con salas, la copia es de quien la hace, en la misma sala (si puede crear páginas ahí) */
    var na=AT.datos.acceso.nueva&&AT.datos.acceso.nueva(AT.datos.acceso.sala(doc));
    if(na){c.acceso=na;delete c.editadoPor}
    return AT.datos.documentos.guardar(c);
  }).then(function(c){location.href='documento.html?id='+encodeURIComponent(c.id)});
}
function eliminar(){
  var d=document.createElement('dialog');
  d.className='atajos';d.setAttribute('aria-labelledby','elT');
  d.innerHTML='<div class="at-h"><h2 id="elT">¿Mover a la papelera?</h2></div>'+
    '<p class="td-p">«'+esc(doc.titulo||'Sin título')+'» sale de tus páginas. Puedes recuperarla desde la papelera durante '+AT.datos.papelera.DIAS+' días; después se borra sola.</p>'+
    '<div class="td-bt"><button class="btn danger" type="button" data-el="si">Mover a la papelera</button><button class="btn" type="button" data-el="no">Cancelar</button></div>';
  document.body.appendChild(d);
  d.addEventListener('close',function(){d.remove();masBtn.focus({preventScroll:true})});
  d.addEventListener('click',function(e){
    var b=e.target.closest('[data-el]');
    if(e.target===d||b&&b.getAttribute('data-el')==='no'){d.close();return}
    if(!b)return;
    if(ed)doc.contenido=ed.json();
    clearTimeout(timer);timer=null;pendiente=false;
    try{sessionStorage.setItem('onelearn:eliminado',JSON.stringify({id:doc.id,titulo:doc.titulo}))}catch(x){}
    /* Sus ventas dejan de descontar del inventario antes de salir de la página */
    (AT.inventario?AT.inventario.quitarDoc(doc.id).catch(function(){}):Promise.resolve()).then(function(){return AT.datos.papelera.mover(doc)})
      .then(function(){location.href='inicio.html'},function(){AT.aviso('No se pudo mover a la papelera. Inténtalo otra vez.')});
  });
  d.showModal();
  $('[data-el="no"]',d).focus();
}

/* «Guardar como plantilla»: queda en «Crear», en «Mis plantillas» (crear.js) */
function comoPlantilla(){
  if(!AT.crear||!AT.crear.guardarPlantilla)return;
  var d=document.createElement('dialog');
  d.className='atajos';d.setAttribute('aria-labelledby','plT');
  d.innerHTML='<div class="at-h"><h2 id="plT">Guardar como plantilla</h2></div>'+
    '<p class="td-p">Después, en «Crear», la eliges en «Mis plantillas» para empezar una página igual.</p>'+
    '<form class="pl-form" method="dialog">'+
      '<label class="campo-l"><span>Nombre de la plantilla</span><input type="text" id="plNombre" maxlength="80" required></label>'+
      '<label class="campo-l"><span>Para qué sirve (opcional)</span><input type="text" id="plDesc" maxlength="160" placeholder="Ej. El corte de la sucursal centro"></label>'+
      '<label class="pl-op"><input type="checkbox" id="plVaciar" checked><span><b>Sin lo anotado</b><small>Quita ventas, abonos, gastos del mes, cuentas, pagos marcados y tareas hechas; se quedan los nombres, los gastos fijos y lo que escribiste.</small></span></label>'+
      '<p class="td-msg" id="plMsg" role="status"></p>'+
      '<div class="td-bt"><button class="btn pri" type="submit" id="plSi">Guardar plantilla</button><button class="btn" type="button" data-pl="no">Cancelar</button></div>'+
    '</form>';
  document.body.appendChild(d);
  $('#plNombre',d).value=doc.titulo||'';
  d.addEventListener('close',function(){d.remove();masBtn.focus({preventScroll:true})});
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-pl="no"]'))d.close()});
  $('form',d).addEventListener('submit',function(e){
    e.preventDefault();
    var nombre=$('#plNombre',d).value.trim();
    if(!nombre){$('#plMsg',d).textContent='Escribe un nombre para la plantilla.';$('#plNombre',d).focus();return}
    $('#plSi',d).setAttribute('aria-disabled','true');
    (pendiente||timer?guardar():Promise.resolve()).then(function(){
      if(ed)doc.contenido=ed.json();
      return AT.crear.guardarPlantilla(doc,{nombre:nombre,desc:$('#plDesc',d).value,vaciar:$('#plVaciar',d).checked});
    }).then(function(pl){
      d.close();
      AT.aviso('Se guardó la plantilla «'+pl.nombre+'». Está en «Crear», en «Mis plantillas».');
    },function(){$('#plSi',d).removeAttribute('aria-disabled');$('#plMsg',d).textContent='No se pudo guardar. Inténtalo otra vez.'});
  });
  d.showModal();
  $('#plNombre',d).select();
}

/* ---------- Markdown ---------- */
function mdTexto(lista){
  return (lista||[]).map(function(n){
    if(n.type==='hardBreak')return '  \n';
    if(n.type==='cita')return '['+((n.attrs||{}).texto||'cita')+']('+((n.attrs||{}).href||'')+')';
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
/* Imágenes, tablas numeradas y notas al pie (piezas.js): numeración y notas del documento */
var mdAyuda={bloques:function(l){return mdBloques(l)},notas:[],piezas:{lista:[],por:{}},doc:{}};
function aMarkdown(d){
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
  if(AT.datos.acceso&&!AT.datos.acceso.puede(doc,'ver')){sinAccesoVista();return}
  AT.docActual=doc;AT.docCambio=cambio;
  titulo();pintarSala();
  sinPermiso=!!(AT.datos.acceso&&!AT.datos.acceso.puede(doc,'editar'));
  /* Si te invitaron a esta página, al abrirla aceptas la invitación */
  if(AT.datos.acceso)AT.datos.acceso.aceptar(ID).catch(function(){});
  if(sinPermiso)AT.docCambio=null;
  else if(AT.datos.versiones)AT.datos.versiones.abrir(doc);
  modoBtn.hidden=sinPermiso;masBtn.hidden=false;favBtn.hidden=sinPermiso;
  pintarFav();pintarAncho();
  var nuevo=false;
  try{nuevo=sessionStorage.getItem('onelearn:recien-creado')===ID;if(nuevo)sessionStorage.removeItem('onelearn:recien-creado')}catch(e){}
  /* #agregar=<bloque> (acciones rápidas del Inicio): se abre para editar y negocio.js agrega el bloque */
  var agregar=sinPermiso?null:/^#agregar=(\w+)$/.exec(location.hash);
  /* #historial y #permisos (desde el explorador del Inicio) abren esa ventana */
  var ventana=/^#(historial|permisos)$/.exec(location.hash);
  if(agregar||ventana)try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  var conAncla=!agregar&&!ventana&&location.hash.length>1;
  /* Servidor de la oficina: si otra persona ya la edita en su dispositivo, aquí se abre para leer (salvo que vengas de
     «Editar aquí», que te la pasa) */
  try{tomaPendiente=sessionStorage.getItem('onebook-tomar')===ID;if(tomaPendiente)sessionStorage.removeItem('onebook-tomar')}catch(e){}
  var otro=!tomaPendiente&&!sinPermiso?editoresRemotos()[0]:null;
  if(otro){bloqueado=true;bloqueoRemoto=otro;AT.docCambio=null;modoBtn.hidden=favBtn.hidden=true}
  ponerModo(sinPermiso||otro?'leer':nuevo||agregar?'editar':conAncla?'leer':(modoGuardado()||'editar'),nuevo&&!sinPermiso&&!otro?'titulo':false,sinPermiso||!!otro);
  if(ventana)setTimeout(function(){if(ventana[1]==='historial'&&AT.versionesUI)AT.versionesUI.abrir(masBtn);else if(ventana[1]==='permisos'&&AT.permisos)AT.permisos.abrir(ID,masBtn)},0);
  if(agregar)document.dispatchEvent(new CustomEvent('onebook:agregar',{detail:{tipo:agregar[1]}}));
  ponerEstado(sinPermiso?'Solo lectura':'Guardado',sinPermiso?'':'ok');
  avisarAbierto();
  if(AT.refrescarPaginas)AT.refrescarPaginas();
  /* Si llegaste con #bloque (desde una cita o la búsqueda), se va a ese bloque en modo lectura */
  if(location.hash.length>1&&modo==='leer'){
    var b=document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if(b)b.scrollIntoView({block:'start'});
  }
},function(){noEncontrado()});

/* ---------- Historial de versiones: restaurar una versión o recuperar un bloque (versiones.js) ---------- */
/* Lo que una versión no cambia de la página: su id, su fecha de creación, si es favorita y el registro de autoría */
var CONSERVAR=['id','creado','favorito','anchoCompleto','acceso','editadoPor'];
function contenidoAhora(){if(ed)doc.contenido=ed.json();return doc}
/* Vuelve a pintar la página con lo que tiene doc (sin pasar el editor viejo encima) */
function repintar(){
  if(ed){ed.destruir();ed=null}
  AT.docActual=doc;pintarFav();pintarAncho();titulo();
  ponerModo(modo,false,true);
}
AT.docVersiones={
  doc:function(){return doc?contenidoAhora():null},
  puede:function(){return !!doc&&!bloqueado&&!sinPermiso},
  /* Restaura una versión completa; antes guarda la página como está (versión «Antes de restaurar») */
  restaurar:function(vdoc){
    if(!doc||bloqueado||sinPermiso)return Promise.reject(new Error(sinPermiso?'No tienes permiso para editar esta página':'Esta página está abierta en otra pestaña'));
    contenidoAhora();clearTimeout(timer);timer=null;pendiente=false;
    return AT.datos.versiones.tomar(doc,{motivo:'restaurar'}).then(function(antes){
      var nuevo={};
      CONSERVAR.forEach(function(k){if(doc[k]!==undefined)nuevo[k]=doc[k]});
      Object.keys(vdoc).forEach(function(k){if(CONSERVAR.indexOf(k)<0&&k!=='editado')nuevo[k]=JSON.parse(JSON.stringify(vdoc[k]))});
      if(!nuevo.props)nuevo.props=[];
      Object.keys(doc).forEach(function(k){delete doc[k]});
      Object.keys(nuevo).forEach(function(k){doc[k]=nuevo[k]});
      repintar();
      return guardar().then(function(){return antes});
    });
  },
  /* Recupera un bloque de una versión: si la página todavía lo tiene (reemplazar), vuelve a como estaba; si no,
     entra después del bloque que lo precedía (o al principio) */
  recuperarBloque:function(b,op){
    op=op||{};
    if(!doc||bloqueado||sinPermiso)return Promise.reject(new Error(sinPermiso?'No tienes permiso para editar esta página':'Esta página está abierta en otra pestaña'));
    contenidoAhora();
    var c=doc.contenido.content||(doc.contenido.content=[]),blk=JSON.parse(JSON.stringify(b));
    var id=blk.attrs&&blk.attrs.id,i=-1;
    c.forEach(function(x,k){if(id&&x.attrs&&x.attrs.id===id)i=k});
    if(i>=0&&op.reemplazar)c[i]=blk;
    else{
      if(i>=0&&blk.attrs)blk.attrs.id=AT.bloques.nuevoId();
      var j=-1;
      if(op.despuesDe)c.forEach(function(x,k){if(x.attrs&&x.attrs.id===op.despuesDe)j=k});
      c.splice(j>=0?j+1:(op.despuesDe?c.length:0),0,blk);
    }
    repintar();
    return guardar().then(function(){
      var el=document.getElementById(blk.attrs&&blk.attrs.id)||document.querySelector('[data-id="'+(blk.attrs&&blk.attrs.id)+'"]');
      if(el&&el.scrollIntoView)el.scrollIntoView({block:'center'});
      return blk;
    });
  }
};

/* ---------- La misma página en dos pestañas (de la app o del navegador) ----------
   Al abrir un documento se avisa a las demás. La que ya lo tenía guarda lo pendiente y queda solo para leer,
   con un aviso y «Editar aquí» (que la vuelve la pestaña activa y deja a la otra para leer). La que lo acaba de
   abrir, si todavía no cambió nada, vuelve a leerlo cuando llega ese último guardado: así nada se pisa. */
var YO=Math.random().toString(36).slice(2),bloqueado=false,abiertoEn=0,canalDoc=null,bloqueoRemoto=null,tomaPendiente=false;
/* ---------- La misma página en dos dispositivos (servidor de la oficina, sincro.js) ----------
   Gana quien la editaba primero; «Editar aquí» la toma (gana quien la tomó al último) y la otra persona queda para leer */
function editoresRemotos(){
  var P=AT.datos.presencia;if(!P||!P.remotas)return [];
  return P.remotas().filter(function(e){return e.doc===ID&&e.modo==='editar'});
}
function ganaOtro(){
  var otros=editoresRemotos();if(!otros.length)return null;
  var mias=AT.datos.presencia.propias().filter(function(e){return e.doc===ID&&e.modo==='editar'});
  if(!mias.length)return null;
  var todos=otros.concat([mias[0]]),tomaron=todos.filter(function(e){return e.tomo});
  var gana=tomaron.length?tomaron.sort(function(a,b){return b.desde-a.desde})[0]:todos.sort(function(a,b){return a.desde-b.desde})[0];
  return gana===mias[0]?null:gana;
}
function quienTexto(e){return (e.quien&&e.quien.nombre||'Otra persona')+(e.nombre?' («'+e.nombre+'»)':'')}
/* ---------- Permisos (datos.js: AT.datos.acceso; la ventana está en permisos.js) ----------
   Con «Solo puede ver» (o sin estar en la lista de una página de otra persona) la página se abre para leer, con un
   aviso y «Pedir permiso para editar». Si los permisos cambian en otra ventana, la página se ajusta. */
var sinPermiso=false;
function permisoTexto(){
  var A=AT.datos.acceso;if(!A||!doc)return '';
  var n=A.personas(doc).length,r=A.rol(doc);
  return A.nombreRol(r)+(n>1?' · '+n+' personas':' · solo tú');
}
function pintarPermiso(){
  var v=document.createElement('div');
  var A=AT.datos.acceso,r=A.rol(doc),s=A.tuSolicitud(doc);
  v.className='doc-bloqueo doc-permiso';v.setAttribute('role','status');
  v.innerHTML='<p><b>Solo puedes ver esta página.</b> '+(r==='ninguno'?'No estás en la lista de personas con acceso.':'Tu permiso: '+esc(A.nombreRol(r))+'.')+
    (s?' Ya pediste «'+esc(A.nombreRol(s.rol))+'»: está pendiente.':' Para editarla, pide permiso a quien la administra.')+'</p>'+
    '<button class="btn" type="button" id="docPedirPermiso">'+(s?'Ver tu solicitud':'Pedir permiso para editar')+'</button>';
  page.insertBefore(v,page.firstChild);
  $('#docPedirPermiso',v).addEventListener('click',function(){if(AT.permisos)AT.permisos.abrir(ID,this,{pedir:'editor'})});
}
/* Los permisos de esta página cambiaron (aquí o en otra pestaña): se vuelve a ver qué puedes hacer */
function revisarPermiso(){
  AT.datos.documentos.leer(ID).then(function(d){
    if(!d||!doc)return;
    doc.acceso=d.acceso;
    var antes=sinPermiso,ahora=!AT.datos.acceso.puede(doc,'editar');
    if(ahora===antes){if(sinPermiso)ponerModo('leer',false,true);return}
    if(ahora){
      (pendiente||timer?guardar():Promise.resolve()).then(function(){
        sinPermiso=true;AT.docCambio=null;modoBtn.hidden=favBtn.hidden=true;
        ponerModo('leer',false,true);ponerEstado('Solo lectura');
        AT.aviso('Ahora solo puedes ver esta página.');
      });
    }else{
      sinPermiso=false;
      if(!bloqueado){AT.docCambio=cambio;modoBtn.hidden=favBtn.hidden=false;ponerModo(modo,false,true);ponerEstado('Guardado','ok')}
      AT.aviso('Ya puedes editar esta página.',bloqueado?null:'Editar',bloqueado?null:function(){ponerModo('editar','cuerpo')});
    }
  });
}
try{if('BroadcastChannel' in window)canalDoc=new BroadcastChannel('onebook-documentos')}catch(e){}
function avisarAbierto(){
  abiertoEn=Date.now();
  if(canalDoc)try{canalDoc.postMessage({tipo:'abierto',id:ID,quien:YO})}catch(e){}
}
function pintarBloqueo(){
  var v=document.createElement('div');
  v.className='doc-bloqueo';v.setAttribute('role','status');
  var sigue=bloqueoRemoto&&editoresRemotos().length;
  v.innerHTML=bloqueoRemoto?(sigue?'<p><b>'+esc(quienTexto(bloqueoRemoto))+' está editando esta página.</b> Aquí queda solo para leer y se actualiza sola, para que no se pisen los cambios.</p>':
      '<p><b>Ya nadie más está editando esta página.</b> Puedes editarla aquí.</p>')+
      '<button class="btn" type="button" id="docEditarAqui">'+(sigue?'Editar aquí (pasa a solo leer allá)':'Editar aquí')+'</button>':
    '<p><b>Esta página también está abierta en otra pestaña.</b> Aquí queda solo para leer, para que no se pisen los cambios.</p>'+
    '<button class="btn" type="button" id="docEditarAqui">Editar aquí</button>';
  page.insertBefore(v,page.firstChild);
  $('#docEditarAqui',v).addEventListener('click',function(){try{sessionStorage.setItem('onebook-tomar',ID)}catch(e){}location.reload()});
}
/* Quién edita en los otros dispositivos cambió: si la tomó otra persona, aquí queda para leer */
AT.datos.on(function(c){
  if(c.almacen!=='presencia'||!doc||sinPermiso)return;
  if(bloqueoRemoto){var b=$('.doc-bloqueo:not(.doc-permiso)');if(b){var ahora=editoresRemotos().length>0;if(ahora!==(b.getAttribute('data-sigue')==='1')){b.remove();pintarBloqueo();var n=$('.doc-bloqueo:not(.doc-permiso)');if(n)n.setAttribute('data-sigue',ahora?'1':'0')}}return}
  if(bloqueado||modo!=='editar')return;
  var g=ganaOtro();
  if(g){bloqueoRemoto=g;bloquear();AT.aviso(quienTexto(g)+' abrió esta página para editarla. Aquí queda solo para leer.')}
});
function bloquear(){
  if(bloqueado||!doc)return;
  bloqueado=true;
  (pendiente||timer?guardar():Promise.resolve()).then(function(){
    /* Sin AT.docCambio, el plan de pagos y lo demás se ven pero no se marcan */
    AT.docCambio=null;
    modoBtn.hidden=favBtn.hidden=true;
    ponerModo('leer',false,true);
    ponerEstado('Solo lectura');
  });
}
if(canalDoc)canalDoc.onmessage=function(e){
  var m=e.data;
  if(m&&m.tipo==='abierto'&&m.id===ID&&m.quien!==YO)bloquear();
};
/* Vuelve a leer el documento (después del último guardado de la otra pestaña) */
function releer(aunBloqueada){
  AT.datos.documentos.leer(ID).then(function(d){
    if(!d||!d.contenido||pendiente||timer||(bloqueado&&!aunBloqueada))return;
    if(ed){ed.destruir();ed=null}
    var y=window.scrollY;
    doc=d;if(!doc.props)doc.props=[];
    AT.docActual=doc;pintarFav();pintarAncho();
    titulo();ponerModo(modo,false,true);if(!bloqueado)ponerEstado('Guardado','ok');
    window.scrollTo(0,y);
  });
}
/* Otra pestaña cambió este documento */
AT.datos.on(function(c,deOtra){
  /* Solo cambió quién tiene acceso: no es «otra versión» de la página. Un respaldo importado ('*') también
     pudo cambiarlo */
  if(doc&&((c.almacen==='documentos'&&c.id===ID&&c.acceso)||c.almacen==='*')){revisarPermiso();if(c.almacen!=='*')return}
  if(!deOtra||!doc||c.almacen!=='documentos'||c.id!==ID)return;
  if(c.borrado){AT.aviso(c.remoto?'Esta página se eliminó en otro dispositivo.':'Este documento se eliminó en otra pestaña.');return}
  /* Solo para leer (o bloqueada): se actualiza sola */
  if(bloqueado||(modo==='leer'&&!pendiente&&!timer)){releer(true);return}
  if(!pendiente&&!timer&&Date.now()-abiertoEn<(c.remoto?15000:5000)){releer();return}
  AT.aviso(c.remoto?'Esta página cambió en otro dispositivo.':'Este documento cambió en otra pestaña.','Ver la versión nueva',function(){location.reload()});
});
})();
