/* OneBook: tus datos en este dispositivo.
   Documentos, notas rápidas y marcadores viven en IndexedDB (base «onelearn»), que aguanta mucho más que
   localStorage y después guardará imágenes y libros. El avance y los ajustes siguen en localStorage porque
   son pequeños y se leen antes de pintar la página.
   - Si IndexedDB no está disponible (algunos modos privados), se usa localStorage como respaldo.
   - Cada nota se escribe primero en localStorage (al instante, como diario) y después en IndexedDB; si la
     página se cierra a la mitad, la próxima carga termina de guardarla. Así se pasaron también las notas
     que ya existían: nada se pierde.
   - Otras pestañas se enteran de los cambios con BroadcastChannel.
   - Respaldo: exportar todo a un archivo JSON e importarlo después (combina; gana lo más reciente). Entran
     también tus plantillas; la papelera no.
   - Plantillas propias (fase F5, «Guardar como plantilla»): almacén «plantillas» ({id, nombre, desc, tipo,
     titulo, props, contenido, creado, editado}).
   - Papelera (fase F5): al eliminar una página pasa al almacén «papelera» con la fecha (eliminado); se
     restaura, se borra para siempre o se vacía, y lo que lleva más de 30 días se borra solo.
   Expone AT.datos. Se carga después de base.js. */
(function(){
'use strict';
var AT=window.AT;
/* Versión 2 (fase F5): agrega los almacenes de plantillas y de la papelera; lo demás no cambia */
var NOMBRE='onelearn',VERSION_DB=2,ALMACENES=['documentos','notas','marcadores','plantillas','papelera'];
var DIAS_PAPELERA=30;
var PREF='aprende-tecnologia:',CLAVE_NOTA=PREF+'apuntes:',CLAVE_RESPALDO=PREF+'ultimo-respaldo';

function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function ahora(){return new Date().toISOString()}

/* ---------- Avisos de cambios (esta pestaña y las demás) ---------- */
var oyentes=[],canal=null;
try{if('BroadcastChannel' in window)canal=new BroadcastChannel('onelearn-datos')}catch(e){}
function avisar(cambio,deOtra){
  oyentes.forEach(function(fn){try{fn(cambio,!!deOtra)}catch(e){if(window.console)console.error(e)}});
  if(!deOtra&&canal)try{canal.postMessage(cambio)}catch(e){}
}
if(canal)canal.onmessage=function(e){if(e.data&&e.data.almacen)avisar(e.data,true)};

/* ---------- Motores: IndexedDB o localStorage ---------- */
function abrirIDB(){
  return new Promise(function(ok,no){
    if(!window.indexedDB)return no(new Error('Este navegador no tiene IndexedDB'));
    var r;
    try{r=indexedDB.open(NOMBRE,VERSION_DB)}catch(e){return no(e)}
    r.onupgradeneeded=function(){
      var db=r.result;
      ALMACENES.forEach(function(a){if(!db.objectStoreNames.contains(a))db.createObjectStore(a,{keyPath:'id'})});
    };
    r.onsuccess=function(){
      var db=r.result;
      /* Otra pestaña con una versión nueva de OneBook necesita actualizar la base: se cede */
      db.onversionchange=function(){db.close()};
      ok(db);
    };
    r.onerror=function(){no(r.error)};
    r.onblocked=function(){no(new Error('La base de datos está bloqueada por otra pestaña'))};
  });
}
function motorIDB(db){
  function tx(a,modo,fn){
    return new Promise(function(ok,no){
      var t;
      try{t=db.transaction(a,modo)}catch(e){return no(e)}
      var res,req=fn(t.objectStore(a));
      if(req)req.onsuccess=function(){res=req.result};
      t.oncomplete=function(){ok(res)};
      t.onerror=function(){no(t.error)};
      t.onabort=function(){no(t.error||new Error('Se canceló la escritura'))};
    });
  }
  return {
    tipo:'indexeddb',
    leer:function(a,id){return tx(a,'readonly',function(s){return s.get(id)})},
    todos:function(a){return tx(a,'readonly',function(s){return s.getAll()})},
    poner:function(a,lista){return tx(a,'readwrite',function(s){lista.forEach(function(o){s.put(o)})})},
    borrar:function(a,id){return tx(a,'readwrite',function(s){return s.delete(id)})}
  };
}
function motorLocal(){
  function mapa(a){try{return JSON.parse(lsGet(PREF+'db:'+a)||'{}')||{}}catch(e){return {}}}
  function escribir(a,m){
    if(!lsSet(PREF+'db:'+a,JSON.stringify(m)))return Promise.reject(new Error('No queda espacio en este navegador'));
    return Promise.resolve();
  }
  return {
    tipo:'localstorage',
    leer:function(a,id){return Promise.resolve(mapa(a)[id])},
    todos:function(a){var m=mapa(a);return Promise.resolve(Object.keys(m).map(function(k){return m[k]}))},
    poner:function(a,lista){var m=mapa(a);lista.forEach(function(o){m[o.id]=o});return escribir(a,m)},
    borrar:function(a,id){var m=mapa(a);delete m[id];return escribir(a,m)}
  };
}

/* ---------- Notas: diario en localStorage ---------- */
/* Notas escritas en localStorage que aún no llegan a la base (o de antes de la fase 2) */
function notasEnDiario(){
  var out={};
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i),m=k&&k.indexOf(CLAVE_NOTA)===0&&k.slice(CLAVE_NOTA.length);
      if(!m||m.indexOf(':')>=0)continue;
      out[m]={id:m,texto:lsGet(k)||'',editado:lsGet(k+':editado')||''};
    }
  }catch(e){}
  return out;
}
function quitarDelDiario(n){
  var k=CLAVE_NOTA+n.id;
  /* Solo si no cambió mientras se guardaba */
  if((lsGet(k)||'')!==n.texto)return;
  lsDel(k);lsDel(k+':editado');lsDel(k+':pendiente');
}
/* La versión más nueva de dos notas (una sin fecha pierde contra una con fecha) */
function masNueva(a,b){
  if(!a)return b;if(!b)return a;
  return (b.editado||'')>(a.editado||'')?b:a;
}

/* ---------- Apertura ---------- */
var motor=null;
var listo=abrirIDB().then(motorIDB,function(e){
  if(window.console)console.warn('OneBook: IndexedDB no está disponible; se usa localStorage.',e&&e.message);
  return motorLocal();
}).then(function(m){
  motor=m;
  /* Pasa a la base las notas del diario */
  var diario=notasEnDiario(),ids=Object.keys(diario);
  if(!ids.length)return;
  return Promise.all(ids.map(function(id){return m.leer('notas',id)})).then(function(actuales){
    var poner=[];
    ids.forEach(function(id,i){
      var d=diario[id],a=actuales[i];
      if(!a||masNueva(a,d)===d)poner.push(d);
    });
    return (poner.length?m.poner('notas',poner):Promise.resolve()).then(function(){
      ids.forEach(function(id){quitarDelDiario(diario[id])});
    });
  });
}).then(function(){return motor},function(e){
  if(window.console)console.error('OneBook: no se pudieron preparar tus datos',e);
  motor=motor||motorLocal();
  return motor;
});

function conMotor(fn){return listo.then(fn)}

/* ---------- API ---------- */
var esperas={};
var notas={
  /* {id, texto, editado} o null */
  leer:function(id){
    return conMotor(function(m){return m.leer('notas',id)}).then(function(n){
      var d=notasEnDiario()[id];
      return masNueva(n||null,d||null);
    });
  },
  todas:function(){
    return conMotor(function(m){return m.todos('notas')}).then(function(lista){
      var porId={};
      lista.forEach(function(n){porId[n.id]=n});
      var d=notasEnDiario();
      Object.keys(d).forEach(function(id){porId[id]=masNueva(porId[id],d[id])});
      return Object.keys(porId).map(function(id){return porId[id]});
    });
  },
  /* Guarda al instante en el diario y, un momento después, en la base. Devuelve una promesa
     que se cumple cuando la nota llegó a la base. */
  guardar:function(id,texto){
    var n={id:id,texto:String(texto),editado:ahora()};
    lsSet(CLAVE_NOTA+id,n.texto);lsSet(CLAVE_NOTA+id+':editado',n.editado);
    avisar({almacen:'notas',id:id});
    clearTimeout(esperas[id]&&esperas[id].t);
    var e=esperas[id]={};
    e.p=new Promise(function(ok,no){
      e.t=setTimeout(function(){
        conMotor(function(m){return m.poner('notas',[n])}).then(function(){quitarDelDiario(n);ok(n)},no);
      },250);
    });
    return e.p;
  }
};
/* Al salir de la página, lo pendiente se intenta guardar ya (si no alcanza, queda en el diario) */
addEventListener('pagehide',function(){
  Object.keys(esperas).forEach(function(id){
    var d=notasEnDiario()[id];
    if(d&&motor)motor.poner('notas',[d]).then(function(){quitarDelDiario(d)},function(){});
  });
});

function coleccion(nombre){
  return {
    todos:function(){return conMotor(function(m){return m.todos(nombre)})},
    leer:function(id){return conMotor(function(m){return m.leer(nombre,id)})},
    /* Guarda una copia (sin referencias al objeto original) */
    guardar:function(obj,op){
      var o=JSON.parse(JSON.stringify(obj));
      if(!(op&&op.conservarFecha))o.editado=ahora();
      if(!o.creado)o.creado=o.editado||ahora();
      return conMotor(function(m){return m.poner(nombre,[o])}).then(function(){
        avisar({almacen:nombre,id:o.id});
        return o;
      });
    },
    borrar:function(id){
      return conMotor(function(m){return m.borrar(nombre,id)}).then(function(){avisar({almacen:nombre,id:id,borrado:true})});
    }
  };
}

/* ---------- Respaldo ---------- */
function leerJSON(k){try{return JSON.parse(lsGet(k)||'null')}catch(e){return null}}
function exportar(){
  return Promise.all([notas.todas(),conMotor(function(m){return m.todos('documentos')}),conMotor(function(m){return m.todos('marcadores')}),
    conMotor(function(m){return m.todos('plantillas')})]).then(function(r){
    return {
      app:'OneBook',formato:1,exportado:ahora(),
      documentos:r[1],notas:r[0].filter(function(n){return n.texto&&n.texto.trim()}),marcadores:r[2],plantillas:r[3],
      avance:leerJSON(PREF+'avance'),ajustes:leerJSON(PREF+'ajustes'),proyectos:leerJSON(PREF+'proyectos'),terminal:leerJSON(PREF+'terminal'),
      perfil:leerJSON(PREF+'perfil'),folios:leerJSON(PREF+'folios')
    };
  });
}
function nombreRespaldo(){
  var d=new Date(),z=function(n){return (n<10?'0':'')+n};
  return 'onebook-respaldo-'+d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+'.json';
}
function descargar(){
  return exportar().then(function(datos){
    var blob=new Blob([JSON.stringify(datos,null,1)],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=nombreRespaldo();
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
    lsSet(CLAVE_RESPALDO,datos.exportado);
    return datos;
  });
}
function esObjeto(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
function idValido(id){return typeof id==='string'&&/^[\w-]{1,80}$/.test(id)}
/* Combina un respaldo con lo que hay: entra lo que no existe y lo que es más nuevo.
   Devuelve {documentos, notas, marcadores, avance} con cuántas cosas entraron. */
function importar(datos){
  /* Los respaldos de antes del cambio de nombre dicen app:'OneLearn' y se siguen aceptando */
  if(!esObjeto(datos)||(datos.app!=='OneBook'&&datos.app!=='OneLearn')||typeof datos.formato!=='number')
    return Promise.reject(new Error('El archivo no es un respaldo de OneBook.'));
  if(datos.formato>1)return Promise.reject(new Error('Este respaldo es de una versión más nueva de OneBook. Actualiza la página e inténtalo otra vez.'));
  var res={documentos:0,notas:0,marcadores:0,plantillas:0,avance:false,proyectos:false,terminal:false,perfil:false};
  function lista(x){return Array.isArray(x)?x:[]}
  var docs=lista(datos.documentos).filter(function(d){
    return esObjeto(d)&&idValido(d.id)&&esObjeto(d.contenido)&&d.contenido.type==='doc'&&(d.contenido.content==null||Array.isArray(d.contenido.content));
  });
  var ns=lista(datos.notas).filter(function(n){return esObjeto(n)&&idValido(n.id)&&typeof n.texto==='string'})
    .map(function(n){return {id:n.id,texto:n.texto,editado:typeof n.editado==='string'?n.editado:''}});
  var ms=lista(datos.marcadores).filter(function(x){return esObjeto(x)&&idValido(x.id)});
  var pls=lista(datos.plantillas).filter(function(x){
    return esObjeto(x)&&idValido(x.id)&&typeof x.nombre==='string'&&esObjeto(x.contenido)&&x.contenido.type==='doc'&&(x.contenido.content==null||Array.isArray(x.contenido.content));
  });
  function combinar(almacen,entrantes,clave){
    return conMotor(function(m){return m.todos(almacen)}).then(function(actuales){
      var porId={};actuales.forEach(function(a){porId[a.id]=a});
      var poner=entrantes.filter(function(e){var a=porId[e.id];return !a||(e.editado||'')>(a.editado||'')});
      res[clave]=poner.length;
      return poner.length?motor.poner(almacen,poner):null;
    });
  }
  return combinar('documentos',docs,'documentos')
    .then(function(){return notas.todas()}).then(function(actuales){
      var porId={};actuales.forEach(function(a){porId[a.id]=a});
      var poner=ns.filter(function(e){var a=porId[e.id];return !a||(e.editado||'')>(a.editado||'')});
      res.notas=poner.length;
      return poner.length?motor.poner('notas',poner).then(function(){poner.forEach(function(n){if(lsGet(CLAVE_NOTA+n.id)!==null){lsDel(CLAVE_NOTA+n.id);lsDel(CLAVE_NOTA+n.id+':editado')}})}):null;
    })
    .then(function(){return combinar('marcadores',ms,'marcadores')})
    .then(function(){return combinar('plantillas',pls,'plantillas')})
    .then(function(){
      /* Avance: se suman las secciones leídas; el resto se toma del más reciente */
      var ent=datos.avance;
      if(esObjeto(ent)&&esObjeto(ent.lecciones)){
        var act=leerJSON(PREF+'avance')||{};
        if(!esObjeto(act.lecciones))act.lecciones={};
        Object.keys(ent.lecciones).forEach(function(id){
          var e=ent.lecciones[id],a=act.lecciones[id];
          if(!esObjeto(e)||!idValido(id))return;
          if(!a){act.lecciones[id]=e;res.avance=true;return}
          a.leidas=a.leidas||{};
          Object.keys(e.leidas||{}).forEach(function(s){if(!a.leidas[s]){a.leidas[s]=e.leidas[s];res.avance=true}});
          if(e.repaso&&(!a.repaso||(e.repaso.fecha||'')>(a.repaso.fecha||''))){a.repaso=e.repaso;res.avance=true}
          if((e.visto||'')>(a.visto||'')){a.visto=e.visto;a.seccion=e.seccion;a.seccionTitulo=e.seccionTitulo}
        });
        if(!act.ultima||(ent.ultima&&act.lecciones[ent.ultima]&&!act.lecciones[act.ultima]))act.ultima=ent.ultima;
        lsSet(PREF+'avance',JSON.stringify(act));
        if(AT.avance&&AT.avance.recargar)AT.avance.recargar();
      }
      /* Proyectos: se suman las tareas hechas; el enlace y la fase, si aquí no hay */
      if(esObjeto(datos.proyectos)){
        var pa=leerJSON(PREF+'proyectos')||{};
        Object.keys(datos.proyectos).forEach(function(id){
          var e=datos.proyectos[id];
          if(!idValido(id)||!esObjeto(e))return;
          var a=esObjeto(pa[id])?pa[id]:(pa[id]={tareas:{}});
          if(!esObjeto(a.tareas))a.tareas={};
          if(esObjeto(e.tareas))Object.keys(e.tareas).forEach(function(t){if(idValido(t)&&!a.tareas[t]){a.tareas[t]=String(e.tareas[t]).slice(0,40);res.proyectos=true}});
          if(!a.enlace&&typeof e.enlace==='string'&&/^https:\/\/\S+$/.test(e.enlace)){a.enlace=e.enlace.slice(0,300);res.proyectos=true}
          if(!a.fase&&typeof e.fase==='string'&&/^f\d{1,2}$/.test(e.fase))a.fase=e.fase;
        });
        lsSet(PREF+'proyectos',JSON.stringify(pa));
      }
      /* Ejercicios de la terminal simulada: se suman los terminados */
      if(esObjeto(datos.terminal)){
        var ta=leerJSON(PREF+'terminal')||{};
        Object.keys(datos.terminal).forEach(function(id){
          var e=datos.terminal[id];
          if(!idValido(id)||!esObjeto(e))return;
          var a=esObjeto(ta[id])?ta[id]:(ta[id]={});
          Object.keys(e).forEach(function(t){if(idValido(t)&&!a[t]){a[t]=String(e[t]).slice(0,40);res.terminal=true}});
        });
        lsSet(PREF+'terminal',JSON.stringify(ta));
      }
      /* El perfil del espacio: solo si aquí todavía no hay uno (por ejemplo, al restaurar en «Crea tu espacio»).
         AT.perfil.guardar lo limpia: solo entran campos conocidos */
      if(esObjeto(datos.perfil)&&AT.perfil&&!AT.perfil.actual())res.perfil=!!AT.perfil.guardar(datos.perfil);
      /* Folios de notas de venta y cotizaciones: se queda el número más alto de cada prefijo, para no repetir folios */
      if(esObjeto(datos.folios)){
        var fo=leerJSON(PREF+'folios');if(!esObjeto(fo))fo={};
        Object.keys(datos.folios).forEach(function(k){
          var n=parseInt(datos.folios[k],10);
          if(/^[A-Z]{1,4}$/.test(k)&&n>0&&n<1e6&&!(fo[k]>=n))fo[k]=n;
        });
        lsSet(PREF+'folios',JSON.stringify(fo));
      }
      /* Ajustes: solo si en este navegador no has cambiado ninguno */
      if(esObjeto(datos.ajustes)&&AT.ajustes&&AT.ajustes.esInicial()&&lsGet(PREF+'ajustes')===null){
        Object.keys(datos.ajustes).forEach(function(k){try{AT.ajustes.set(k,datos.ajustes[k])}catch(e){}});
      }
      avisar({almacen:'*'});
      return res;
    });
}

/* ---------- Espacio y protección ---------- */
var almacenamiento=navigator.storage||null;
function persistente(){
  if(!almacenamiento||!almacenamiento.persisted)return Promise.resolve(null);
  return almacenamiento.persisted().catch(function(){return null});
}
function pedirPersistencia(){
  if(!almacenamiento||!almacenamiento.persist)return Promise.resolve(null);
  return almacenamiento.persisted().then(function(ya){return ya||almacenamiento.persist()}).catch(function(){return null});
}
function espacio(){
  if(!almacenamiento||!almacenamiento.estimate)return Promise.resolve(null);
  return almacenamiento.estimate().then(function(e){return {usado:e.usage||0,cuota:e.quota||0}}).catch(function(){return null});
}

/* ---------- Papelera ---------- */
var docsCol=coleccion('documentos'),papCol=coleccion('papelera');
var papelera={
  /* Lo que hay en la papelera, lo más reciente primero (lo que lleva más de 30 días se borra solo) */
  todos:function(){
    return papCol.todos().then(function(l){
      var limite=new Date(Date.now()-DIAS_PAPELERA*864e5).toISOString(),viejos=l.filter(function(d){return (d.eliminado||'')<limite});
      return Promise.all(viejos.map(function(d){return papCol.borrar(d.id)})).then(function(){
        return l.filter(function(d){return viejos.indexOf(d)<0}).sort(function(a,b){return (b.eliminado||'')<(a.eliminado||'')?-1:1});
      });
    });
  },
  /* Manda un documento a la papelera (lo quita de tus páginas) */
  mover:function(doc){
    var d=JSON.parse(JSON.stringify(doc));d.eliminado=ahora();
    return papCol.guardar(d,{conservarFecha:true}).then(function(){return docsCol.borrar(d.id)}).then(function(){return d});
  },
  /* Lo regresa a tus páginas, tal como estaba */
  restaurar:function(id){
    return papCol.leer(id).then(function(d){
      if(!d)throw new Error('Esa página ya no está en la papelera');
      delete d.eliminado;
      return docsCol.guardar(d,{conservarFecha:true}).then(function(){return papCol.borrar(id)}).then(function(){return d});
    });
  },
  eliminar:function(id){return papCol.borrar(id)},
  vaciar:function(){return papCol.todos().then(function(l){return Promise.all(l.map(function(d){return papCol.borrar(d.id)}))})},
  DIAS:DIAS_PAPELERA
};

AT.datos={
  listo:listo,
  motor:function(){return motor&&motor.tipo},
  documentos:docsCol,
  marcadores:coleccion('marcadores'),
  plantillas:coleccion('plantillas'),
  papelera:papelera,
  notas:notas,
  exportar:exportar,
  descargar:descargar,
  importar:importar,
  ultimoRespaldo:function(){return lsGet(CLAVE_RESPALDO)||''},
  persistente:persistente,
  pedirPersistencia:pedirPersistencia,
  espacio:espacio,
  /* fn({almacen, id, borrado}, deOtraPestana) */
  on:function(fn){oyentes.push(fn)}
};
})();
