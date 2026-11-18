/* OneLearn: proteger una tesis (o cualquier documento largo) para no perderla.
   El documento vive solo en este navegador; aquí se ayuda a tener copias fuera de él:
   - «Respaldo» en la barra de la tesis dice cuándo fue la última copia y avisa si hace falta otra.
   - Copia automática en un archivo de tu computadora (File System Access, en Chrome y Edge de escritorio):
     eliges el archivo una vez y se actualiza cada vez que se guarda el documento.
   - Descargar una copia de este documento: el mismo formato que el respaldo de «Tus datos», así que se
     recupera con «Importar respaldo».
   - Pedir al navegador que no borre los datos (navigator.storage.persist).
   Las fechas de las copias van en localStorage (aprende-tecnologia:respaldos) y el enlace al archivo en
   IndexedDB (base onelearn-archivos), porque un archivo elegido no se puede guardar en texto.
   Expone AT.proteger. Se carga en documento.html, antes de documento.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico;
var CLAVE='aprende-tecnologia:respaldos',DIAS_AVISO=7,MIN_PALABRAS=50;
var puedeArchivo=typeof window.showSaveFilePicker==='function';
var enlaces={},permisos={},escribiendo={},otraVez={},esperas={},errores={};

/* ---------- Fechas de las copias, por documento ---------- */
function leer(){try{return JSON.parse(localStorage.getItem(CLAVE)||'{}')||{}}catch(e){return {}}}
function anotar(id,campo,valor){
  var x=leer();x[id]=x[id]||{};
  if(valor==null)delete x[id][campo];else x[id][campo]=valor;
  try{localStorage.setItem(CLAVE,JSON.stringify(x))}catch(e){}
}
function info(id){return leer()[id]||{}}
function hace(iso){
  if(!iso)return '';
  var s=(Date.now()-new Date(iso).getTime())/1000;
  if(s<60)return 'hace un momento';
  if(s<3600)return 'hace '+Math.floor(s/60)+' min';
  var hoy=new Date(),d=new Date(iso);
  if(d.toDateString()===hoy.toDateString())return 'hoy';
  var ayer=new Date(hoy);ayer.setDate(hoy.getDate()-1);
  if(d.toDateString()===ayer.toDateString())return 'ayer';
  return 'hace '+Math.max(2,Math.round(s/86400))+' días';
}
function dias(iso){return iso?(Date.now()-new Date(iso).getTime())/864e5:Infinity}
/* La copia más reciente: respaldo completo de «Tus datos», copia descargada o copia en archivo */
function ultima(doc){
  var i=info(doc.id),l=[AT.datos.ultimoRespaldo(),i.d,i.a].filter(Boolean).sort();
  return l.length?l[l.length-1]:'';
}

/* ---------- El archivo de respaldo de un documento ---------- */
function copia(doc){
  return JSON.stringify({app:'OneLearn',formato:1,exportado:new Date().toISOString(),documentos:[doc],notas:[],marcadores:[]},null,1);
}
function nombre(doc){
  var s=(doc.titulo||'documento').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return (s||'documento')+'.onelearn.json';
}
function descargar(doc){
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([copia(doc)],{type:'application/json'}));
  a.download=nombre(doc);
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
  anotar(doc.id,'d',new Date().toISOString());
  AT.datos.pedirPersistencia();
  avisar();
}

/* ---------- Enlace a un archivo de tu computadora ---------- */
/* El enlace (FileSystemFileHandle) se guarda en su propia base de IndexedDB; si no se puede, dura la sesión */
var base=null;
function bd(){
  if(base)return base;
  base=new Promise(function(ok,mal){
    if(!window.indexedDB){mal(new Error('sin IndexedDB'));return}
    var r=indexedDB.open('onelearn-archivos',1);
    r.onupgradeneeded=function(){r.result.createObjectStore('enlaces')};
    r.onsuccess=function(){ok(r.result)};
    r.onerror=function(){mal(r.error)};
  });
  return base;
}
function idb(modo,fn){
  return bd().then(function(db){return new Promise(function(ok,mal){
    var t=db.transaction('enlaces',modo),s=t.objectStore('enlaces'),r=fn(s);
    t.oncomplete=function(){ok(r&&r.result)};t.onerror=t.onabort=function(){mal(t.error)};
  })});
}
function cargarEnlace(id){
  if(id in enlaces)return Promise.resolve(enlaces[id]);
  if(!puedeArchivo)return Promise.resolve(null);
  return idb('readonly',function(s){return s.get(id)}).then(function(h){enlaces[id]=h||null;return enlaces[id]},function(){enlaces[id]=null;return null});
}
function permiso(h,pedir){
  if(!h)return Promise.resolve('');
  var op={mode:'readwrite'};
  try{
    var p=pedir&&h.requestPermission?h.requestPermission(op):h.queryPermission?h.queryPermission(op):Promise.resolve('granted');
    return Promise.resolve(p).then(function(x){return x},function(){return 'denied'});
  }catch(e){return Promise.resolve('denied')}
}
/* Estado del enlace: '' (sin archivo), 'activo', 'pausa' (el navegador pide permiso otra vez) */
function estadoArchivo(doc){
  return cargarEnlace(doc.id).then(function(h){
    if(!h)return {estado:'',nombre:''};
    if(permisos[doc.id]==='granted')return {estado:'activo',nombre:h.name};
    return permiso(h,false).then(function(p){permisos[doc.id]=p;return {estado:p==='granted'?'activo':'pausa',nombre:h.name}});
  });
}
function escribir(doc){
  var h=enlaces[doc.id];
  if(!h||permisos[doc.id]!=='granted')return Promise.resolve(false);
  if(escribiendo[doc.id]){otraVez[doc.id]=true;return escribiendo[doc.id]}
  var p=Promise.resolve().then(function(){return h.createWritable()}).then(function(w){
    return w.write(new Blob([copia(doc)],{type:'application/json'})).then(function(){return w.close()});
  }).then(function(){
    errores[doc.id]='';
    anotar(doc.id,'a',new Date().toISOString());anotar(doc.id,'n',h.name);
    return true;
  },function(e){
    /* Sin permiso (o el archivo ya no está): queda en pausa hasta que lo reanudes */
    errores[doc.id]=e&&e.name==='NotAllowedError'?'':'No se pudo escribir en «'+h.name+'».';
    permisos[doc.id]='prompt';
    return false;
  }).then(function(r){
    escribiendo[doc.id]=null;
    avisar();
    if(otraVez[doc.id]){otraVez[doc.id]=false;return escribir(doc)}
    return r;
  });
  escribiendo[doc.id]=p;
  return p;
}
/* Después de cada guardado: copia al archivo, sin más de una escritura cada 2 s */
function guardado(doc){
  if(!puedeArchivo||!enlaces[doc.id]||permisos[doc.id]!=='granted')return;
  clearTimeout(esperas[doc.id]);
  esperas[doc.id]=setTimeout(function(){escribir(doc)},2000);
}
function elegirArchivo(doc){
  return window.showSaveFilePicker({suggestedName:nombre(doc),
    types:[{description:'Respaldo de OneLearn',accept:{'application/json':['.json']}}]}).then(function(h){
    enlaces[doc.id]=h;permisos[doc.id]='granted';
    return idb('readwrite',function(s){return s.put(h,doc.id)}).catch(function(){}).then(function(){
      AT.datos.pedirPersistencia();
      return escribir(doc);
    });
  });
}
function reanudar(doc){
  return cargarEnlace(doc.id).then(function(h){return permiso(h,true)}).then(function(p){
    permisos[doc.id]=p;
    if(p==='granted')return escribir(doc);
    return false;
  });
}
function soltar(doc){
  delete enlaces[doc.id];delete permisos[doc.id];
  enlaces[doc.id]=null;
  anotar(doc.id,'n',null);
  return idb('readwrite',function(s){return s.delete(doc.id)}).catch(function(){}).then(avisar);
}

/* ---------- Avisos a quien muestra el estado (la barra de la tesis) ---------- */
var oyentes=[];
function avisar(){oyentes.slice().forEach(function(f){try{f()}catch(e){}})}
function vigilar(f){oyentes.push(f);return function(){oyentes=oyentes.filter(function(x){return x!==f})}}

/* Resumen corto para la barra: {texto, aviso, titulo} */
function resumen(doc,palabras){
  return estadoArchivo(doc).then(function(a){
    var u=ultima(doc),r;
    if(a.estado==='activo')r={texto:'Copia automática',aviso:false,titulo:'Se copia en «'+a.nombre+'» cada vez que se guarda'};
    else if(a.estado==='pausa')r={texto:'Copia en pausa',aviso:true,titulo:'El navegador pide permiso otra vez para copiar en «'+a.nombre+'»'};
    else if(u)r={texto:'Respaldo: '+hace(u),aviso:dias(u)>DIAS_AVISO&&palabras>=MIN_PALABRAS,titulo:'Última copia fuera de este navegador: '+hace(u)};
    else r={texto:palabras>=MIN_PALABRAS?'Sin respaldo':'Respaldo',aviso:palabras>=MIN_PALABRAS,titulo:'Todavía no hay copias fuera de este navegador'};
    return r;
  });
}

/* ---------- Ventana «Proteger tu tesis» ---------- */
function dialogo(doc,op){
  op=op||{};
  var d=document.createElement('dialog'),volver=document.activeElement;
  d.className='atajos pr-dlg';d.setAttribute('aria-labelledby','prT');
  document.body.appendChild(d);
  var tipo=(AT.tiposDoc&&AT.tiposDoc[doc.tipo]||{}).nombre||'documento';
  var cual=tipo==='Tesis'?'tu tesis':'este documento';
  function pintar(msg,error){
    Promise.all([AT.datos.persistente(),estadoArchivo(doc)]).then(function(r){
      var pers=r[0],a=r[1],i=info(doc.id),u=ultima(doc);
      var h='<div class="at-h"><h2 id="prT">Proteger '+cual+'</h2><button class="lec-x" type="button" data-pr="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
        '<p class="td-p">'+(cual==='tu tesis'?'Tu tesis vive':'Este documento vive')+' solo en este navegador. Si borras sus datos, cambias de equipo o lo pierdes, se pierde con él. Guarda copias fuera de aquí.</p>'+
        '<p class="td-p pr-ult" data-pr-ult>'+(u?'Última copia fuera del navegador: <b>'+esc(hace(u))+'</b>.':'<b>Todavía no hay ninguna copia fuera del navegador.</b>')+'</p>';
      if(puedeArchivo){
        h+='<div class="td-sec"><h3>Copia automática</h3>';
        if(a.estado==='activo')h+='<p class="td-p td-ok">'+ico('escudo')+'<span>Se copia en <b>'+esc(a.nombre)+'</b> cada vez que se guarda'+(i.a?' (la última, '+esc(hace(i.a))+')':'')+'.</span></p>'+
          '<div class="td-bt"><button class="btn" type="button" data-pr="soltar">Dejar de copiar</button></div>';
        else if(a.estado==='pausa')h+='<p class="td-p">La copia en <b>'+esc(a.nombre)+'</b> está en pausa: el navegador pide permiso otra vez cada vez que abres OneLearn.</p>'+
          '<div class="td-bt"><button class="btn pri" type="button" data-pr="reanudar">Reanudar la copia</button><button class="btn" type="button" data-pr="soltar">Dejar de copiar</button></div>';
        else h+='<p class="td-p">Elige un archivo en tu computadora (mejor si está en una carpeta que se sincroniza, como Google Drive, OneDrive o iCloud) y OneLearn lo actualizará cada vez que guardes.</p>'+
          '<div class="td-bt"><button class="btn pri" type="button" data-pr="elegir">Elegir dónde copiar</button></div>';
        h+='</div>';
      }
      h+='<div class="td-sec"><h3>Descargar una copia</h3><p class="td-p">Un archivo con '+(cual==='tu tesis'?'tu tesis completa':'el documento completo')+', con sus fuentes y su registro de autoría. '+
        (i.d?'La última la descargaste '+esc(hace(i.d))+'.':'')+'</p>'+
        '<div class="td-bt"><button class="btn'+(puedeArchivo?'':' pri')+'" type="button" data-pr="descargar">'+ico('descargar')+'Descargar copia</button></div></div>';
      h+='<div class="td-sec">'+(pers===true?'<p class="td-p td-ok">'+ico('escudo')+'<span><b>El navegador conserva tus datos:</b> no los borrará aunque le falte espacio.</span></p>':
        pers===false?'<p class="td-p">El navegador podría borrar los datos de OneLearn si el dispositivo se queda sin espacio.</p><div class="td-bt"><button class="btn" type="button" data-pr="conservar">Pedir que los conserve</button></div>':'')+
        '<p class="td-p pr-rec">Para recuperar '+(cual==='tu tesis'?'tu tesis':'el documento')+' en otro navegador o equipo: abre OneLearn, ve a «Tus datos» y elige «Importar respaldo».</p></div>'+
        '<p class="td-msg'+(error?' err':'')+'" role="status">'+esc(msg||'')+'</p>';
      var foco=document.activeElement&&d.contains(document.activeElement)?document.activeElement.getAttribute('data-pr'):'';
      d.innerHTML=h;
      var f=foco&&$('[data-pr="'+foco+'"]',d)||$('.td-sec .btn',d)||$('[data-pr="cerrar"]',d);
      if(f&&d.open)f.focus();
    });
  }
  d.addEventListener('click',function(e){
    if(e.target===d){d.close();return}
    var b=e.target.closest('[data-pr]');if(!b)return;
    var a=b.getAttribute('data-pr');
    if(a==='cerrar'){d.close();return}
    if(op.antes)op.antes();
    if(a==='descargar'){descargar(doc);pintar('Listo: se descargó «'+nombre(doc)+'».')}
    else if(a==='conservar')AT.datos.pedirPersistencia().then(function(ok){pintar(ok?'Listo: el navegador conservará tus datos.':'El navegador no lo permitió por ahora. Descarga copias seguido.',!ok)});
    else if(a==='elegir')elegirArchivo(doc).then(function(ok){pintar(ok?'Listo: se copió en «'+(enlaces[doc.id]||{}).name+'».':errores[doc.id]||'No se pudo copiar.',!ok)},function(e){
      if(e&&e.name==='AbortError')return;
      pintar('No se pudo elegir el archivo.',true);
    });
    else if(a==='reanudar')reanudar(doc).then(function(ok){pintar(ok?'Listo: la copia automática sigue.':'Sin permiso, la copia sigue en pausa.',!ok)});
    else if(a==='soltar')soltar(doc).then(function(){pintar('Ya no se copia en el archivo (el archivo sigue donde estaba).')});
  });
  d.addEventListener('close',function(){d.remove();if(volver&&volver.focus)volver.focus({preventScroll:true})});
  d.showModal();
  pintar();
  return d;
}

AT.proteger={resumen:resumen,dialogo:dialogo,descargar:descargar,guardado:guardado,vigilar:vigilar,ultima:ultima,puedeArchivo:function(){return puedeArchivo},
  /* Para las pruebas: vuelve a mirar si el navegador tiene File System Access (se puede simular) */
  revisar:function(){puedeArchivo=typeof window.showSaveFilePicker==='function'}};
})();
