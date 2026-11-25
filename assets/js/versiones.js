/* OneBook: la ventana «Historial de versiones» de una página (documento.html; desde «⋯»). El motor está en
   datos.js (AT.datos.versiones) y lo que cambia la página, en documento.js (AT.docVersiones).
   - A la izquierda, las versiones por día: hora, por qué se guardó (automática, antes de un borrado grande, antes
     de restaurar, antes de importar o con nombre) y qué cambió contra la anterior. Arriba, «Guardar una versión»
     con nombre (esas no se borran solas).
   - A la derecha, la página como estaba, solo para leer, con lo que cambió desde entonces marcado: «Ya no está» y
     «Cambió» (con las palabras que se quitaron y se agregaron). Cada bloque marcado se recupera solo
     («Recuperar este bloque» o «Volver a como estaba»).
   - «Restaurar esta versión» (antes guarda la página como está, así que se puede deshacer), «Copiar como página
     nueva» y ponerle o quitarle el nombre.
   En celular la lista y la vista previa van una tras otra. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,V=AT.datos&&AT.datos.versiones;
if(!V)return;
var MOTIVO={auto:'Guardado automático',borrado:'Antes de un borrado grande',restaurar:'Antes de restaurar otra versión',
  importar:'Antes de importar un respaldo',nombre:'Versión con nombre'};
function hora(t){return new Date(t).toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'})}
function diaDe(t){
  var d=new Date(t),h=new Date();h.setHours(0,0,0,0);
  var x=new Date(d);x.setHours(0,0,0,0);
  var n=Math.round((h-x)/864e5);
  if(n===0)return 'Hoy';if(n===1)return 'Ayer';
  return d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:d.getFullYear()===h.getFullYear()?undefined:'numeric'}).replace(/^./,function(c){return c.toUpperCase()});
}
function cuando(t){return diaDe(t).toLowerCase().replace(/^(hoy|ayer)$/,'$1')+' a las '+hora(t)}
function plural(n,uno,varios){return n+' '+(n===1?uno:varios)}
/* «2 nuevos · 1 quitado · 3 cambiaron · título» */
function resumen(c,primera){
  if(primera)return 'Primera versión';
  if(!c)return '';
  var p=[];
  if(c.nuevos)p.push('+'+plural(c.nuevos,'bloque','bloques'));
  if(c.quitados)p.push('−'+plural(c.quitados,'bloque','bloques'));
  if(c.cambiados)p.push(plural(c.cambiados,'cambió','cambiaron'));
  if(c.titulo)p.push('título');
  return p.join(' · ')||'Sin cambios en el texto';
}

/* ---------- Diferencias por palabras (para leer qué cambió en un bloque) ---------- */
function palabras(t){return String(t||'').split(/(\s+)/).filter(function(x){return x!==''})}
function diferencia(a,b){
  var x=palabras(a),y=palabras(b),n=x.length,m=y.length;
  if(n*m>250000)return '<del>'+esc(a)+'</del> <ins>'+esc(b)+'</ins>';
  /* Subsecuencia común más larga, de atrás hacia adelante */
  var L=[],i,j;
  for(i=0;i<=n;i++){L.push(new Uint16Array(m+1))}
  for(i=n-1;i>=0;i--)for(j=m-1;j>=0;j--)L[i][j]=x[i]===y[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  var out='',del='',ins='';
  function vaciar(){if(del)out+='<del>'+esc(del)+'</del>';if(ins)out+='<ins>'+esc(ins)+'</ins>';del='';ins=''}
  i=0;j=0;
  while(i<n||j<m){
    if(i<n&&j<m&&x[i]===y[j]){vaciar();out+=esc(x[i]);i++;j++}
    else if(j<m&&(i>=n||L[i][j+1]>=L[i+1][j])){ins+=y[j];j++}
    else{del+=x[i];i++}
  }
  vaciar();
  return out;
}

/* ---------- La ventana ---------- */
var dlg=null,lista=[],sel=null,marcar=true,abridor=null,vista=null;
function crear(){
  dlg=document.createElement('dialog');
  dlg.className='ver-dlg';dlg.setAttribute('aria-labelledby','verT');
  dlg.innerHTML='<div class="ver-h"><h2 id="verT">'+ico('historial')+'Historial de versiones</h2>'+
    '<button class="lec-x" type="button" data-ver="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<div class="ver-c">'+
      '<nav class="ver-l" aria-label="Versiones">'+
        '<form class="ver-nueva" id="verNueva"><label class="vh" for="verNombre">Nombre de la versión</label>'+
        '<input type="text" id="verNombre" maxlength="80" placeholder="Nombre (ej. Antes de cambiar precios)" autocomplete="off">'+
        '<button class="btn" type="submit">Guardar versión</button></form>'+
        '<div id="verLista"></div>'+
        '<p class="ver-nota">Se guardan solas mientras escribes (cada 5 minutos), antes de borrar mucho y al salir. Las de más de un día se van resumiendo: una por día y, después de un mes, una por semana. Las que tienen nombre se quedan.</p>'+
      '</nav>'+
      '<section class="ver-p" id="verP" aria-label="Vista previa de la versión" tabindex="-1"></section>'+
    '</div>';
  document.body.appendChild(dlg);
  dlg.addEventListener('close',function(){document.documentElement.classList.remove('ver-abierto');if(abridor&&abridor.focus)abridor.focus({preventScroll:true})});
  dlg.addEventListener('click',function(e){
    if(e.target===dlg){dlg.close();return}
    var b=e.target.closest('[data-ver]');if(!b||b.getAttribute('aria-disabled')==='true')return;
    var a=b.getAttribute('data-ver');
    if(a==='cerrar')dlg.close();
    else if(a==='elegir')elegir(b.getAttribute('data-id'),true);
    else if(a==='volver')mostrarLista();
    else if(a==='restaurar')restaurar(b);
    else if(a==='copiar')copiar(b);
    else if(a==='nombrar')nombrar();
    else if(a==='recuperar')recuperar(b,false);
    else if(a==='devolver')recuperar(b,true);
  });
  dlg.addEventListener('change',function(e){if(e.target.id==='verMarcar'){marcar=e.target.checked;pintarVista()}});
  $('#verNueva',dlg).addEventListener('submit',function(e){
    e.preventDefault();
    var doc=AT.docVersiones.doc(),inp=$('#verNombre',dlg),n=inp.value.replace(/\s+/g,' ').trim();
    if(!n){inp.focus();AT.aviso('Escribe un nombre para la versión.');return}
    V.tomar(doc,{nombre:n}).then(function(v){inp.value='';return cargar(v&&v.id)}).then(function(){AT.aviso('Se guardó la versión «'+n+'».')});
  });
  /* Flechas arriba y abajo entre las versiones */
  $('#verLista',dlg).addEventListener('keydown',function(e){
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
    var bs=$$('[data-ver="elegir"]',dlg),i=bs.indexOf(document.activeElement);if(i<0)return;
    e.preventDefault();var b=bs[Math.max(0,Math.min(bs.length-1,i+(e.key==='ArrowDown'?1:-1)))];b.focus();elegir(b.getAttribute('data-id'),false);
  });
}
function pintarLista(){
  var doc=AT.docVersiones.doc(),h='',dia='';
  if(!lista.length){$('#verLista',dlg).innerHTML='<p class="hint">Todavía no hay versiones de esta página. La primera se guarda en un momento.</p>';return}
  lista.forEach(function(v,i){
    var d=diaDe(v.fecha);
    if(d!==dia){if(dia)h+='</ul>';h+='<h3 class="ver-dia">'+esc(d)+'</h3><ul class="ver-ul">';dia=d}
    var igual=V.igualQue(v,doc);
    h+='<li><button type="button" class="ver-i'+(v.nombre?' ver-con-nombre':'')+'" data-ver="elegir" data-id="'+esc(v.id)+'" aria-pressed="'+(sel&&sel.id===v.id)+'">'+
      '<span class="ver-hora">'+esc(hora(v.fecha))+(igual?' <em class="ver-igual">Igual que ahora</em>':'')+'</span>'+
      (v.nombre?'<b class="ver-nom">'+esc(v.nombre)+'</b>':'<span class="ver-mot">'+esc(MOTIVO[v.motivo]||MOTIVO.auto)+'</span>')+
      '<small>'+esc(resumen(v.cambios,i===lista.length-1))+'</small></button></li>';
  });
  $('#verLista',dlg).innerHTML=h+'</ul>';
}
function cargar(id){
  var doc=AT.docVersiones.doc();
  return V.listar(doc.id).then(function(l){
    lista=l;
    var v=(id&&l.filter(function(x){return x.id===id})[0])||(sel&&l.filter(function(x){return x.id===sel.id})[0])||l[0]||null;
    sel=null;pintarLista();
    if(v)return elegir(v.id,false);
    $('#verP',dlg).innerHTML='';
  });
}
function mostrarLista(){
  dlg.classList.remove('ver-viendo');
  var b=sel&&dlg.querySelector('[data-ver="elegir"][data-id="'+sel.id+'"]');if(b)b.focus();
}
function elegir(id,enfocar){
  var v=lista.filter(function(x){return x.id===id})[0];if(!v)return Promise.resolve();
  sel=v;
  $$('[data-ver="elegir"]',dlg).forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-id')===id))});
  return V.leer(v).then(function(r){
    if(sel!==v)return;
    vista=r;pintarVista();
    if(enfocar){dlg.classList.add('ver-viendo');$('#verP',dlg).focus({preventScroll:true})}
  });
}
function bloquesPorId(doc){
  var m={};((doc.contenido||{}).content||[]).forEach(function(b,i){var id=b&&b.attrs&&b.attrs.id;if(id)m[id]={b:b,i:i,h:V.huella(JSON.stringify(b))}});
  return m;
}
function pintarVista(){
  var v=sel,r=vista,doc=AT.docVersiones.doc(),p=$('#verP',dlg);
  if(!v||!r)return;
  var ahora=bloquesPorId(doc),antes=(r.doc.contenido.content||[]);
  var c=V.cambios(v,doc),igual=V.igualQue(v,doc),puede=AT.docVersiones.puede();
  var dec=[];
  if(c.cambiados)dec.push(plural(c.cambiados,'bloque cambió','bloques cambiaron'));
  if(c.quitados)dec.push(plural(c.quitados,'bloque de esta versión ya no está','bloques de esta versión ya no están'));
  if(c.nuevos)dec.push(plural(c.nuevos,'bloque se agregó después','bloques se agregaron después'));
  if(c.titulo)dec.push('el título cambió');
  var tieneBase=antes.some(function(b){return b.type==='basedatos'});
  p.innerHTML='<div class="ver-p-h"><button type="button" class="btn ver-atras" data-ver="volver">'+ico('chev-l')+'Versiones</button>'+
    '<div class="ver-p-t"><h3>'+esc(v.nombre||MOTIVO[v.motivo]||MOTIVO.auto)+'</h3><p>'+esc(cuando(v.fecha).replace(/^./,function(x){return x.toUpperCase()}))+'</p></div>'+
    '<div class="ver-acc">'+
      '<button type="button" class="btn pri" data-ver="restaurar"'+(igual||!puede?' aria-disabled="true"':'')+'>'+ico('historial')+'Restaurar esta versión</button>'+
      '<button type="button" class="btn" data-ver="copiar">'+ico('copiar')+'Copiar como página nueva</button>'+
      '<button type="button" class="btn" data-ver="nombrar">'+ico('marcador')+(v.nombre?'Cambiar o quitar el nombre':'Ponerle nombre')+'</button>'+
    '</div></div>'+
    (r.incompleta?'<p class="ver-aviso">Algunos bloques de esta versión no se pudieron recuperar; salen marcados.</p>':'')+
    '<p class="ver-res">'+(igual?'Esta versión es igual a la página de ahora.':dec.length?'Desde esta versión: '+esc(dec.join(', '))+'.':'Desde esta versión solo cambiaron detalles de formato.')+'</p>'+
    (igual?'':'<label class="ver-marcar"><input type="checkbox" id="verMarcar"'+(marcar?' checked':'')+'>Marcar lo que cambió desde entonces</label>')+
    (tieneBase?'<p class="ver-nota">Las bases de datos muestran sus datos de ahora: sus filas no entran en el historial (tienen su propio deshacer).</p>':'')+
    '<div class="ver-doc"><h1 class="ver-tit">'+esc(r.doc.titulo||'Sin título')+'</h1><div class="ver-bloques" id="verBloques"></div></div>';
  /* La versión se dibuja solo para leer: sin AT.docCambio, los bloques de negocio no se pueden marcar */
  var cont=$('#verBloques',p),dc=AT.docCambio;AT.docCambio=null;
  try{AT.bloques.dibujar(r.doc,cont,{encabezado:false})}catch(e){cont.innerHTML='<p class="ver-aviso">No se pudo mostrar esta versión.</p>'}
  AT.docCambio=dc;
  /* Sin ids repetidos en la página y nada que se pueda usar dentro de la vista previa */
  $$('[id]',cont).forEach(function(e){e.setAttribute('data-vid',e.id);e.removeAttribute('id')});
  var previo='';
  Array.prototype.slice.call(cont.children).forEach(function(e){
    if(!e.hasAttribute('data-b'))return;
    var id=e.getAttribute('data-vid'),b=null,k=-1;
    antes.forEach(function(x,i){if(x.attrs&&x.attrs.id===id){b=x;k=i}});
    var w=document.createElement('div');w.className='ver-b';
    e.parentNode.insertBefore(w,e);w.appendChild(e);e.setAttribute('inert','');
    var vacio=b&&b.type==='paragraph'&&!(b.content&&b.content.length);
    if(b&&marcar&&!igual&&!vacio){
      var a=ahora[id],estado=!a?'quitado':a.h!==V.huella(JSON.stringify(b))?'cambio':'';
      if(estado){
        w.classList.add('ver-'+estado);
        var bar=document.createElement('div');bar.className='ver-b-bar';
        var tb=AT.bloques.textoDe(b),ta=a?AT.bloques.textoDe(a.b):'';
        bar.innerHTML='<span class="ver-et">'+(estado==='quitado'?'Ya no está en la página':'Cambió desde entonces')+'</span>'+
          (puede?'<button type="button" class="btn" data-ver="'+(estado==='quitado'?'recuperar':'devolver')+'" data-i="'+k+'" data-despues="'+esc(previo)+'">'+
            (estado==='quitado'?'Recuperar este bloque':'Volver a como estaba')+'</button>':'')+
          (estado==='cambio'&&(tb||ta)&&tb!==ta?'<details class="ver-dif"><summary>Ver qué cambió</summary><p>'+diferencia(tb,ta)+'</p>'+
            '<p class="ver-nota"><del>Tachado</del>: estaba en esta versión. <ins>Subrayado</ins>: lo que dice ahora.</p></details>':'');
        w.insertBefore(bar,e);
      }
    }
    if(id)previo=id;
  });
}
function restaurar(b){
  var v=sel;if(!v||!vista)return;
  b.setAttribute('aria-disabled','true');
  AT.docVersiones.restaurar(vista.doc).then(function(antes){
    dlg.close();
    AT.aviso('Se restauró la versión de '+cuando(v.fecha)+'.',antes?'Deshacer':null,antes?function(){
      V.leer(antes).then(function(r){return AT.docVersiones.restaurar(r.doc)}).then(function(){AT.aviso('Se deshizo: la página volvió a como estaba.')});
    }:null);
  },function(e){b.removeAttribute('aria-disabled');AT.aviso(e&&e.message||'No se pudo restaurar. Inténtalo otra vez.')});
}
function copiar(b){
  var v=sel;if(!v||!vista)return;
  b.setAttribute('aria-disabled','true');
  var c=JSON.parse(JSON.stringify(vista.doc)),ahoraT=new Date().toISOString();
  /* Las bases de datos se copian con sus filas de ahora (como «Duplicar») */
  var bds=(c.contenido.content||[]).filter(function(x){return x.type==='basedatos'&&x.attrs&&x.attrs.base});
  Promise.all(bds.map(function(x){
    return AT.bases?AT.bases.semillaDe(x.attrs.base,true).then(function(s){if(s){x.attrs.semilla=s;x.attrs.base='';x.attrs.vista=''}}):null;
  })).then(function(){
    c.id='d-'+AT.bloques.nuevoId().slice(2)+AT.bloques.nuevoId().slice(4);
    c.titulo=(c.titulo||'Sin título')+' (versión del '+new Date(v.fecha).toLocaleDateString('es-MX',{day:'numeric',month:'short'})+', '+hora(v.fecha)+')';
    c.creado=ahoraT;delete c.favorito;
    var d=AT.docVersiones.doc();if(d&&d.tipo)c.tipo=d.tipo;c.formato=c.formato||1;if(!c.props)c.props=[];
    return AT.datos.documentos.guardar(c);
  }).then(function(c){location.href='documento.html?id='+encodeURIComponent(c.id)},function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo copiar. Inténtalo otra vez.')});
}
function nombrar(){
  var v=sel;if(!v)return;
  var p=$('#verP',dlg),f=p.querySelector('.ver-nom-f');
  if(f){f.querySelector('input').focus();return}
  f=document.createElement('form');f.className='ver-nom-f';
  f.innerHTML='<label class="campo-l"><span>Nombre de esta versión (vacío para quitarlo)</span><input type="text" maxlength="80" value="'+esc(v.nombre)+'" autocomplete="off"></label>'+
    '<div class="td-bt"><button class="btn pri" type="submit">Guardar nombre</button><button class="btn" type="button" data-ver-x>Cancelar</button></div>';
  p.querySelector('.ver-p-h').appendChild(f);
  var inp=f.querySelector('input');inp.focus();inp.select();
  f.querySelector('[data-ver-x]').addEventListener('click',function(){f.remove();var b=p.querySelector('[data-ver="nombrar"]');if(b)b.focus()});
  f.addEventListener('submit',function(e){
    e.preventDefault();
    V.nombrar(v.id,v.doc,inp.value).then(function(x){AT.aviso(x.nombre?'La versión se llama «'+x.nombre+'»: no se borrará sola.':'Se quitó el nombre de la versión.');return cargar(v.id)});
  });
}
function recuperar(b,reemplazar){
  var i=+b.getAttribute('data-i'),blk=vista&&vista.doc.contenido.content[i];if(!blk)return;
  b.setAttribute('aria-disabled','true');
  AT.docVersiones.recuperarBloque(blk,{reemplazar:reemplazar,despuesDe:b.getAttribute('data-despues')}).then(function(){
    AT.aviso(reemplazar?'El bloque volvió a como estaba.':'Se recuperó el bloque en la página.');
    pintarLista();pintarVista();
  },function(e){b.removeAttribute('aria-disabled');AT.aviso(e&&e.message||'No se pudo recuperar. Inténtalo otra vez.')});
}
function abrir(desde){
  if(!AT.docVersiones||!AT.docVersiones.doc())return;
  abridor=desde||document.activeElement;
  V.disponible().then(function(ok){
    if(!ok){AT.aviso('El historial de versiones necesita que este navegador guarde en IndexedDB (no está disponible en este modo).');return}
    if(!dlg)crear();
    sel=null;vista=null;dlg.classList.remove('ver-viendo');
    /* Lo que está escrito ahora entra como versión si cambió (y se ve arriba) */
    var doc=AT.docVersiones.doc();
    return V.tomar(doc).then(function(){
      dlg.showModal();document.documentElement.classList.add('ver-abierto');
      return cargar();
    }).then(function(){var b=dlg.querySelector('[data-ver="elegir"][aria-pressed="true"]')||dlg.querySelector('#verNombre');if(b)b.focus()});
  });
}
AT.versionesUI={abrir:abrir,diferencia:diferencia};
})();
