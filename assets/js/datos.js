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
     restaura, se borra para siempre o se vacía, y lo que lleva más de 30 días se borra solo. Al borrarla para
     siempre se borran también las bases de datos que eran suyas.
   - Bases de datos (fase F6): almacén «bases» ({id, nombre, doc, columnas, vistas}) y «filas» ({id, base, v,
     orden}), aparte de las páginas, para que las relaciones y los reportes las lean sin abrirlas. Las filas
     tienen un índice por base (AT.datos.filas.deBase). Entran en el respaldo.
   - Historial de versiones de las páginas: almacenes «versiones» (índice por página) y «trozos» (los bloques,
     una sola vez cada uno); ver «Historial de versiones» más abajo. AT.datos.versiones.
   - Quién eres (AT.datos.yo), los permisos de cada página (doc.acceso, AT.datos.acceso) y quién tiene abierta
     cada página (AT.datos.presencia); ver «Quién eres, permisos…» más abajo.
   - Lo de estudio que se separó de OneBook (notas de las lecciones, marcadores, avance, proyectos, ejercicios de
     la terminal y las páginas de estudio) se sigue guardando y entra en el respaldo: nadie pierde nada.
     AT.datos.deEstudio(doc) dice si una página es de estudio (las listas la esconden y se abre solo para leer).
   Expone AT.datos. Se carga después de base.js. */
(function(){
'use strict';
var AT=window.AT;
/* Versión 2 (fase F5): almacenes de plantillas y de la papelera. Versión 3 (fase F6): bases y filas (con índice
   por base). Versión 4: historial de versiones (versiones con índice por página, y trozos). Lo demás no cambia */
var NOMBRE='onelearn',VERSION_DB=4,ALMACENES=['documentos','notas','marcadores','plantillas','papelera','bases','filas','versiones','trozos'];
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
      var f=r.transaction.objectStore('filas');
      if(!f.indexNames.contains('base'))f.createIndex('base','base',{unique:false});
      var v=r.transaction.objectStore('versiones');
      if(!v.indexNames.contains('doc'))v.createIndex('doc','doc',{unique:false});
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
    /* Los registros con ese valor en un índice (las filas de una base) */
    porIndice:function(a,ind,v){return tx(a,'readonly',function(s){return s.index(ind).getAll(v)})},
    poner:function(a,lista){return tx(a,'readwrite',function(s){lista.forEach(function(o){s.put(o)})})},
    borrar:function(a,id){return tx(a,'readwrite',function(s){return s.delete(id)})},
    borrarVarios:function(a,ids){return tx(a,'readwrite',function(s){ids.forEach(function(id){s.delete(id)})})},
    claves:function(a){return tx(a,'readonly',function(s){return s.getAllKeys()})},
    /* Lee un registro, lo cambia con fn (síncrona) y lo escribe, todo en una transacción: nadie escribe en medio.
       Si fn devuelve null, no se escribe nada. Devuelve lo que se escribió */
    actualizar:function(a,id,fn){
      return new Promise(function(ok,no){
        var t,res=null,fallo=null;
        try{t=db.transaction(a,'readwrite')}catch(e){return no(e)}
        var s=t.objectStore(a),r=s.get(id);
        r.onsuccess=function(){
          try{res=fn(r.result)}catch(e){fallo=e;try{t.abort()}catch(x){}return}
          if(res)s.put(res);
        };
        t.oncomplete=function(){ok(res)};
        t.onerror=function(){no(fallo||t.error)};
        t.onabort=function(){no(fallo||t.error||new Error('Se canceló la escritura'))};
      });
    },
    /* Varios registros por id en una lectura (los que no existen salen undefined) */
    leerVarios:function(a,ids){
      return new Promise(function(ok,no){
        var t,out=new Array(ids.length);
        try{t=db.transaction(a,'readonly')}catch(e){return no(e)}
        var s=t.objectStore(a);
        ids.forEach(function(id,i){var r=s.get(id);r.onsuccess=function(){out[i]=r.result}});
        t.oncomplete=function(){ok(out)};t.onerror=function(){no(t.error)};
      });
    },
    /* Escribe en varios almacenes en una sola transacción ({almacén: [registros]}): todo o nada */
    ponerVarios:function(mapa){
      return new Promise(function(ok,no){
        var t,ns=Object.keys(mapa);
        try{t=db.transaction(ns,'readwrite')}catch(e){return no(e)}
        ns.forEach(function(a){var s=t.objectStore(a);mapa[a].forEach(function(o){s.put(o)})});
        t.oncomplete=function(){ok()};t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error||new Error('Se canceló la escritura'))};
      });
    },
    /* Una versión con sus trozos, en una sola transacción: solo se escriben los trozos que todavía no están */
    ponerVersion:function(trozos,v){
      return new Promise(function(ok,no){
        var t;
        try{t=db.transaction(['trozos','versiones'],'readwrite')}catch(e){return no(e)}
        var ts=t.objectStore('trozos');
        trozos.forEach(function(o){
          var r=ts.getKey?ts.getKey(o.id):ts.count(o.id);
          r.onsuccess=function(){if(r.result===undefined||r.result===0)ts.put(o)};
        });
        t.objectStore('versiones').put(v);
        t.oncomplete=function(){ok()};t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error||new Error('Se canceló la escritura'))};
      });
    },
    /* Borra los trozos que ninguna versión usa; revisa y borra en la misma transacción */
    limpiarTrozos:function(){
      return new Promise(function(ok,no){
        var t,n=0;
        try{t=db.transaction(['versiones','trozos'],'readwrite')}catch(e){return no(e)}
        var ts=t.objectStore('trozos'),rv=t.objectStore('versiones').getAll();
        rv.onsuccess=function(){
          var usados=new Set();
          rv.result.forEach(function(v){usados.add(v.meta);(v.bloques||[]).forEach(function(h){usados.add(h)})});
          var rk=ts.getAllKeys();
          rk.onsuccess=function(){rk.result.forEach(function(k){if(!usados.has(k)){ts.delete(k);n++}})};
        };
        t.oncomplete=function(){ok(n)};t.onerror=function(){no(t.error)};
      });
    }
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
    porIndice:function(a,ind,v){var m=mapa(a);return Promise.resolve(Object.keys(m).map(function(k){return m[k]}).filter(function(o){return o[ind]===v}))},
    poner:function(a,lista){var m=mapa(a);lista.forEach(function(o){m[o.id]=o});return escribir(a,m)},
    borrar:function(a,id){var m=mapa(a);delete m[id];return escribir(a,m)},
    borrarVarios:function(a,ids){var m=mapa(a);ids.forEach(function(id){delete m[id]});return escribir(a,m)},
    claves:function(a){return Promise.resolve(Object.keys(mapa(a)))},
    actualizar:function(a,id,fn){
      var m=mapa(a),x;
      try{x=fn(m[id])}catch(e){return Promise.reject(e)}
      if(!x)return Promise.resolve(null);
      m[id]=x;return escribir(a,m).then(function(){return x});
    }
    /* Sin IndexedDB no hay historial de versiones (no cabría en localStorage) */
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
    conMotor(function(m){return m.todos('plantillas')}),conMotor(function(m){return m.todos('bases')}),conMotor(function(m){return m.todos('filas')})]).then(function(r){
    return {
      app:'OneBook',formato:1,exportado:ahora(),
      documentos:r[1],notas:r[0].filter(function(n){return n.texto&&n.texto.trim()}),marcadores:r[2],plantillas:r[3],bases:r[4],filas:r[5],
      avance:leerJSON(PREF+'avance'),ajustes:leerJSON(PREF+'ajustes'),proyectos:leerJSON(PREF+'proyectos'),terminal:leerJSON(PREF+'terminal'),
      perfil:leerJSON(PREF+'perfil'),folios:leerJSON(PREF+'folios'),yo:leerJSON(CLAVE_YO),empresa:leerJSON(PREF+'empresa')
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
/* ---------- Bases unificadas (el proyecto anterior) ----------
   Su respaldo ({app:'bases-unificadas', state:{books:[{id, name, tables:[{id, name, cols, rows, vistas}]}]}}) se abre
   sin recapturar: cada libro es una página con una base de datos por tabla; las columnas conservan su id (las
   fórmulas, los datos de la relación y las sumas las siguen encontrando) y las filas reciben ids nuevos (las
   relaciones se traducen). Sus vistas guardadas pasan como vistas de tabla. */
var TIPO_BU={text:'texto',number:'numero',date:'fecha',select:'seleccion',multi:'multiple',check:'casilla',relation:'relacion',lookup:'referencia',formula:'formula',sum:'suma'};
var OP_BU={has:'contiene',eq:'igual',gt:'mayor',lt:'menor'},PIE_BU={sum:'suma',avg:'promedio',count:'conteo'};
function idNuevo(pref){return pref+'-'+Math.random().toString(36).slice(2,10)}
function deBasesUnificadas(d){
  var st=d.state,bases={},filasDe={},docs=[],bs=[],fs=[];
  var libros=(Array.isArray(st.books)?st.books:[]).filter(function(b){return esObjeto(b)&&Array.isArray(b.tables)});
  /* Primero los ids nuevos de bases y filas (las relaciones pueden ir a cualquier tabla) */
  libros.forEach(function(l){l.tables.forEach(function(t){
    if(!esObjeto(t)||!idValido(t.id))return;
    bases[t.id]=idNuevo('bd');filasDe[t.id]={};
    (Array.isArray(t.rows)?t.rows:[]).forEach(function(r){if(esObjeto(r)&&idValido(r.id))filasDe[t.id][r.id]=idNuevo('f')});
  })});
  var ahoraT=ahora();
  libros.forEach(function(l){
    var docId='d-'+Math.random().toString(36).slice(2,10),bloques=[{type:'paragraph',attrs:{id:idNuevo('b')},content:[{type:'text',text:'Importado de Bases unificadas el '+new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})+'.'}]}];
    l.tables.forEach(function(t){
      if(!bases[t&&t.id])return;
      var cols=(Array.isArray(t.cols)?t.cols:[]).filter(function(c){return esObjeto(c)&&idValido(c.id)}).map(function(c){
        var x={id:c.id,nombre:String(c.name==null?'':c.name).slice(0,80),tipo:TIPO_BU[c.type]||'texto'};
        if(Array.isArray(c.options))x.opciones=c.options.map(String);
        if(x.tipo==='formula')x.expr=String(c.expr||'');
        if(x.tipo==='relacion')x.base=bases[c.table]||'';
        if(x.tipo==='referencia'){x.rel=String(c.rel||'');x.campo=String(c.target||'')}
        if(x.tipo==='suma'){x.base=bases[c.table]||'';x.rel=String(c.rel||'');x.campo=String(c.target||'')}
        if(PIE_BU[c.pie])x.pie=PIE_BU[c.pie];
        return x;
      });
      if(!cols.length)cols=[{id:'c-nombre',nombre:'Nombre',tipo:'texto'}];
      var ocultas=(Array.isArray(t.cols)?t.cols:[]).filter(function(c){return esObjeto(c)&&c.oculta}).map(function(c){return c.id});
      function orden(o){return esObjeto(o)&&o.col?{col:String(o.col),dir:o.dir===-1?-1:1}:{col:'',dir:1}}
      var vistas=[{id:idNuevo('v'),nombre:'Tabla',tipo:'tabla',q:'',f:{col:'',op:'contiene',val:''},s:{col:'',dir:1},s2:{col:'',dir:1},ocultas:ocultas}]
        .concat((Array.isArray(t.vistas)?t.vistas:[]).filter(esObjeto).map(function(v){
          var f=esObjeto(v.f)&&v.f.col?{col:String(v.f.col),op:OP_BU[v.f.op]||'contiene',val:String(v.f.val==null?'':v.f.val)}:{col:'',op:'contiene',val:''};
          return {id:idNuevo('v'),nombre:String(v.name||'Vista').slice(0,60),tipo:'tabla',q:String(v.q||''),f:f,s:orden(v.s),s2:orden(v.s2),ocultas:ocultas.slice()};
        }));
      var bid=bases[t.id];
      bs.push({id:bid,nombre:String(t.name||'Tabla').slice(0,80),doc:docId,columnas:cols,vistas:vistas,creado:ahoraT,editado:ahoraT});
      (Array.isArray(t.rows)?t.rows:[]).forEach(function(r,i){
        if(!esObjeto(r)||!filasDe[t.id][r.id])return;
        var c=esObjeto(r.c)?r.c:{},v={};
        cols.forEach(function(col){
          var x=c[col.id];
          if(x==null||x==='')return;
          if(col.tipo==='relacion'){var orig=(Array.isArray(t.cols)?t.cols:[]).filter(function(k){return k&&k.id===col.id})[0];var m=orig&&filasDe[orig.table];if(m&&m[x])v[col.id]=m[x];return}
          if(col.tipo==='numero'){var n=Number(x);if(isFinite(n))v[col.id]=n;return}
          if(col.tipo==='casilla'){v[col.id]=!!x;return}
          if(col.tipo==='multiple'){v[col.id]=(Array.isArray(x)?x:[x]).map(String);return}
          if(col.tipo==='referencia'||col.tipo==='formula'||col.tipo==='suma')return;
          v[col.id]=String(x);
        });
        fs.push({id:filasDe[t.id][r.id],base:bid,v:v,orden:i+1,creado:ahoraT,editado:ahoraT});
      });
      bloques.push({type:'basedatos',attrs:{id:idNuevo('b'),base:bid,vista:''}});
    });
    bloques.push({type:'paragraph',attrs:{id:idNuevo('b')}});
    docs.push({formato:1,tipo:'notas',id:docId,titulo:String(l.name||'Libro').slice(0,120),props:[],creado:ahoraT,editado:ahoraT,contenido:{type:'doc',content:bloques}});
  });
  return {documentos:docs,bases:bs,filas:fs};
}
function importarBasesUnificadas(d){
  if(!esObjeto(d.state)||!Array.isArray(d.state.books))return Promise.reject(new Error('Este archivo no es un respaldo de Bases unificadas.'));
  var x=deBasesUnificadas(d);
  if(!x.documentos.length)return Promise.reject(new Error('El respaldo de Bases unificadas no tiene libros.'));
  return conMotor(function(m){return m.poner('bases',x.bases)}).then(function(){return x.filas.length?motor.poner('filas',x.filas):null})
    .then(function(){return motor.poner('documentos',x.documentos)}).then(function(){
      avisar({almacen:'*'});
      return {documentos:x.documentos.length,bases:x.bases.length,filas:x.filas.length,notas:0,marcadores:0,plantillas:0,basesUnificadas:true,
        primero:x.documentos[0].id};
    });
}
function importar(datos){
  if(esObjeto(datos)&&datos.app==='bases-unificadas')return importarBasesUnificadas(datos);
  /* Los respaldos de antes del cambio de nombre dicen app:'OneLearn' y se siguen aceptando */
  if(!esObjeto(datos)||(datos.app!=='OneBook'&&datos.app!=='OneLearn')||typeof datos.formato!=='number')
    return Promise.reject(new Error('El archivo no es un respaldo de OneBook.'));
  if(datos.formato>1)return Promise.reject(new Error('Este respaldo es de una versión más nueva de OneBook. Actualiza la página e inténtalo otra vez.'));
  var res={documentos:0,notas:0,marcadores:0,plantillas:0,bases:0,filas:0,avance:false,proyectos:false,terminal:false,perfil:false};
  function lista(x){return Array.isArray(x)?x:[]}
  var docs=lista(datos.documentos).filter(function(d){
    return esObjeto(d)&&idValido(d.id)&&esObjeto(d.contenido)&&d.contenido.type==='doc'&&(d.contenido.content==null||Array.isArray(d.contenido.content));
  });
  var ns=lista(datos.notas).filter(function(n){return esObjeto(n)&&idValido(n.id)&&typeof n.texto==='string'})
    .map(function(n){return {id:n.id,texto:n.texto,editado:typeof n.editado==='string'?n.editado:''}});
  var ms=lista(datos.marcadores).filter(function(x){return esObjeto(x)&&idValido(x.id)});
  var bss=lista(datos.bases).filter(function(x){return esObjeto(x)&&idValido(x.id)&&typeof x.nombre==='string'&&Array.isArray(x.columnas)&&x.columnas.length&&x.columnas.every(esObjeto)});
  var fls=lista(datos.filas).filter(function(x){return esObjeto(x)&&idValido(x.id)&&idValido(x.base)&&esObjeto(x.v)});
  var pls=lista(datos.plantillas).filter(function(x){
    return esObjeto(x)&&idValido(x.id)&&typeof x.nombre==='string'&&esObjeto(x.contenido)&&x.contenido.type==='doc'&&(x.contenido.content==null||Array.isArray(x.contenido.content));
  });
  function combinar(almacen,entrantes,clave){
    return conMotor(function(m){return m.todos(almacen)}).then(function(actuales){
      var porId={};actuales.forEach(function(a){porId[a.id]=a});
      var poner=entrantes.filter(function(e){var a=porId[e.id];return !a||(e.editado||'')>(a.editado||'')});
      if(almacen==='documentos'){
        /* El acceso (permisos y solicitudes) tiene su propia fecha: gana el más nuevo, cambie o no el contenido */
        var cambio=function(d){return esObjeto(d&&d.acceso)?String(d.acceso.cambio||''):''};
        poner=poner.map(function(e){var a=porId[e.id];return a&&cambio(a)>cambio(e)?Object.assign({},e,{acceso:a.acceso}):e});
        entrantes.forEach(function(e){
          var a=porId[e.id];
          if(a&&poner.indexOf(e)<0&&!poner.some(function(x){return x.id===e.id})&&cambio(e)>cambio(a)){poner.push(Object.assign({},a,{acceso:e.acceso}));res.accesos=(res.accesos||0)+1}
        });
      }
      res[clave]=poner.length-(almacen==='documentos'?res.accesos||0:0);
      /* Una página que el respaldo reemplaza guarda antes su versión (se recupera desde su historial) */
      var antes=almacen==='documentos'?poner.filter(function(e){var a=porId[e.id];return a&&(e.editado||'')>(a.editado||'')}).map(function(e){return versiones.tomar(porId[e.id],{motivo:'importar'})}):[];
      return Promise.all(antes).then(function(){return poner.length?motor.poner(almacen,poner):null});
    });
  }
  /* Quién eres: si en este navegador todavía no le pusiste nombre ni correo, ni eres propietario o persona con
     acceso de ninguna página, se adopta el del respaldo (así, al restaurar el tuyo en otro dispositivo, tus páginas
     siguen siendo tuyas; si importas las de otra persona después de poner tu nombre, sigues siendo tú) */
  var yoAntes=yo().id;
  return conMotor(function(m){return m.todos('documentos')}).then(function(locales){
    var r=datos.yo,y=yo();
    if(!esObjeto(r)||!/^u-[\w-]{4,40}$/.test(String(r.id))||r.id===y.id||y.nombre||y.correo)return;
    /* Las páginas que el Inicio crea solo («Mi negocio», «Tu equipo») no cuentan como usar este navegador */
    var usado=locales.some(function(d){var a=d.acceso;return d.id!=='d-minegocio'&&d.id!=='d-miequipo'&&esObjeto(a)&&(mismaPersona(a.dueno,y)||(a.personas||[]).some(function(p){return mismaPersona(p,y)}))});
    if(usado)return;
    lsSet(CLAVE_YO,JSON.stringify({id:r.id,nombre:limpio(r.nombre,60)||y.nombre,correo:correoValido(String(r.correo||''))?String(r.correo).toLowerCase():y.correo,creado:y.creado}));
    res.yo=true;
  }).then(function(){return combinar('documentos',docs,'documentos')})
    .then(function(){return notas.todas()}).then(function(actuales){
      var porId={};actuales.forEach(function(a){porId[a.id]=a});
      var poner=ns.filter(function(e){var a=porId[e.id];return !a||(e.editado||'')>(a.editado||'')});
      res.notas=poner.length;
      return poner.length?motor.poner('notas',poner).then(function(){poner.forEach(function(n){if(lsGet(CLAVE_NOTA+n.id)!==null){lsDel(CLAVE_NOTA+n.id);lsDel(CLAVE_NOTA+n.id+':editado')}})}):null;
    })
    .then(function(){return combinar('marcadores',ms,'marcadores')})
    .then(function(){return combinar('plantillas',pls,'plantillas')})
    .then(function(){return combinar('bases',bss,'bases')})
    .then(function(){return combinar('filas',fls,'filas')})
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
      /* El perfil del espacio: solo si aquí todavía no hay uno (por ejemplo, al restaurar en «Crea tu empresa»).
         AT.perfil.guardar lo limpia: solo entran campos conocidos */
      if(esObjeto(datos.perfil)&&AT.perfil&&!AT.perfil.actual())res.perfil=!!AT.perfil.guardar(datos.perfil);
      /* La empresa: entra si aquí no hay (o solo la automática y tú estás en la del respaldo); si es la misma, se
         junta persona por persona y departamento por departamento; la de otra empresa no se junta (empresa.js) */
      if(AT.empresa)res.empresa=AT.empresa.combinar(datos.empresa,{yoAntes:yoAntes});
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

/* ---------- Historial de versiones de las páginas ----------
   Una versión guarda la lista de sus bloques como huellas (un hash de su JSON) y cada bloque va aparte, una sola
   vez, en el almacén «trozos» ({id: huella, t: JSON del bloque}): dos versiones, o dos páginas duplicadas,
   comparten lo que tienen igual, así que una versión nueva solo agrega lo que cambió. Cada versión se lee directo,
   sin cadena de cambios: si faltara un trozo, solo ese bloque sale con un aviso.
   Versión: {id, doc, fecha, motivo, nombre, titulo, meta (huella de lo que no es contenido: título, ícono,
   propiedades, fuentes), bloques:[huellas], ids:[id de cada bloque], letras, cambios:{nuevos, quitados,
   cambiados, titulo} contra la anterior}. Motivos: auto, borrado (lo de antes de un borrado grande), restaurar
   (lo de antes de restaurar otra), importar (lo de antes de que un respaldo la reemplace) y nombre.
   Cuándo se guarda: al abrir una página que no tiene ninguna; mientras escribes, a lo más una cada 5 minutos;
   antes de un borrado grande (3 bloques o 300 letras); al salir de la página; al restaurar; antes de importar; y
   cuando le pones nombre (esas no se borran solas).
   Depuración: todas las de las últimas 24 horas; luego la última de cada día hasta 30 días y de cada semana hasta
   6 meses; a lo más 100 automáticas por página. Los trozos que ya nadie usa se borran en la misma transacción que
   los revisa. Solo con IndexedDB; el respaldo no las lleva. */
var VER={ventana:5*60e3,grandeBloques:3,grandeLetras:300,max:100};
var FUERA_META=['id','contenido','editado','creado','favorito','anchoCompleto','autoria','eliminado','acceso','editadoPor'];
/* Huella de un texto: dos hashes de 32 bits (cyrb53) y su largo */
function huella(s){
  var h1=0xdeadbeef^s.length,h2=0x41c6ce57^s.length;
  for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909);
  return 't'+(h1>>>0).toString(36)+'-'+(h2>>>0).toString(36)+'-'+s.length.toString(36);
}
function letrasDe(n){
  if(!n||typeof n!=='object')return 0;
  var k=typeof n.text==='string'?n.text.length:0;
  if(Array.isArray(n.content))n.content.forEach(function(c){k+=letrasDe(c)});
  return k;
}
/* El estado de una página, listo para compararse o guardarse */
function foto(doc){
  var m={},bl=(doc.contenido&&Array.isArray(doc.contenido.content))?doc.contenido.content:[];
  Object.keys(doc).forEach(function(k){if(FUERA_META.indexOf(k)<0)m[k]=doc[k]});
  var meta=JSON.stringify(m),ss=bl.map(function(b){return JSON.stringify(b)});
  return {titulo:String(doc.titulo||''),meta:meta,hm:huella(meta),ss:ss,h:ss.map(huella),
    ids:bl.map(function(b){return b&&b.attrs&&typeof b.attrs.id==='string'?b.attrs.id:''}),l:bl.map(letrasDe),
    /* Los párrafos vacíos (el que deja un Enter) no cuentan como bloques nuevos ni quitados */
    vacios:bl.map(function(b,i){return b&&b.type==='paragraph'&&!(b.content&&b.content.length)?i:-1}).filter(function(i){return i>=0})};
}
function igual(v,f){return !!v&&v.meta===f.hm&&v.bloques.length===f.h.length&&v.bloques.every(function(h,i){return h===f.h[i]})}
/* Qué cambió de a (versión o foto) a b (foto) */
function cambiosEntre(a,b){
  var r={nuevos:0,quitados:0,cambiados:0,titulo:false,letrasQuitadas:0};
  if(!a)return r;
  var ah=a.bloques||a.h,al=a.l||[],porId={},usadas={},av=a.vacios||[],bv=b.vacios||[];
  a.ids.forEach(function(id,i){if(id)porId[id]=i});
  b.ids.forEach(function(id,i){
    var j=id&&porId.hasOwnProperty(id)?porId[id]:-1;
    if(j<0){if(ah.indexOf(b.h[i])<0&&bv.indexOf(i)<0)r.nuevos++;return}
    usadas[j]=1;
    if(ah[j]!==b.h[i]){r.cambiados++;r.letrasQuitadas+=Math.max(0,(al[j]||0)-(b.l[i]||0))}
  });
  a.ids.forEach(function(id,j){if(!usadas[j]&&b.h.indexOf(ah[j])<0&&av.indexOf(j)<0){r.quitados++;r.letrasQuitadas+=al[j]||0}});
  r.titulo=(a.titulo||'')!==(b.titulo||'');
  return r;
}
function versionesOk(){return !!motor&&motor.tipo==='indexeddb'}
var VCACHE={},VCOLA={},SOMBRA={};
/* Las versiones de una página (lo más nuevo primero), una sola lectura por página */
function versionesDe(id){
  if(!VCACHE[id])VCACHE[id]=conMotor(function(m){return m.porIndice('versiones','doc',id)}).then(function(l){
    return (l||[]).sort(function(a,b){return a.fecha<b.fecha?1:-1});
  },function(){return []});
  return VCACHE[id];
}
/* Una cosa a la vez por página */
function enCola(id,fn){var p=(VCOLA[id]||Promise.resolve()).then(fn,fn);VCOLA[id]=p.catch(function(){});return p}
function guardarVersion(id,f,op,lista){
  var t=op.fecha||ahora(),ant=lista[0]||null;
  var v={id:'v-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),doc:id,fecha:t,motivo:op.motivo||'auto',nombre:String(op.nombre||'').slice(0,80),
    titulo:f.titulo,meta:f.hm,bloques:f.h,ids:f.ids,l:f.l,vacios:f.vacios,letras:f.l.reduce(function(s,x){return s+x},0),cambios:cambiosEntre(ant,f)};
  delete v.cambios.letrasQuitadas;
  /* Los trozos y la versión van en la misma transacción: nunca hay una versión sin sus bloques */
  var trozos=[{id:f.hm,t:f.meta}],vistos={};vistos[f.hm]=1;
  f.h.forEach(function(h,i){if(!vistos[h]){vistos[h]=1;trozos.push({id:h,t:f.ss[i]})}});
  return motor.ponerVersion(trozos,v).then(function(){
    lista.unshift(v);
    avisar({almacen:'versiones',doc:id});
    return depurar(id,lista).then(function(){return v});
  });
}
function semana(t){var d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toISOString().slice(0,10)}
/* Deja las que valen la pena y borra los trozos que ya nadie usa */
function depurar(id,lista,ahoraMs){
  var t0=ahoraMs||Date.now(),dia={},sem={},auto=0,fuera=[];
  var quedan=lista.filter(function(v){
    if(v.nombre)return true;
    var edad=t0-Date.parse(v.fecha),k,si;
    if(edad<864e5)si=true;
    else if(edad<30*864e5){k=v.fecha.slice(0,10);si=!dia[k];dia[k]=1}
    else if(edad<183*864e5){k=semana(v.fecha);si=!sem[k];sem[k]=1}
    else si=false;
    if(si&&++auto>VER.max)si=false;
    if(!si)fuera.push(v.id);
    return si;
  });
  if(!fuera.length)return Promise.resolve(0);
  lista.length=0;quedan.forEach(function(v){lista.push(v)});
  return motor.borrarVarios('versiones',fuera).then(function(){return motor.limpiarTrozos()}).then(function(){avisar({almacen:'versiones',doc:id});return fuera.length});
}
var versiones={
  config:VER,huella:huella,
  disponible:function(){return listo.then(versionesOk)},
  /* Al abrir una página: la recuerda y, si no tiene versiones, guarda la primera */
  abrir:function(doc){
    return listo.then(function(){
      if(!versionesOk()||!doc||!doc.id)return null;
      var f=foto(doc);SOMBRA[doc.id]=f;
      return enCola(doc.id,function(){return versionesDe(doc.id).then(function(l){return l.length?null:guardarVersion(doc.id,f,{motivo:'auto'},l)})});
    }).catch(function(){return null});
  },
  /* Después de cada guardado: una versión cada 5 minutos y la de antes de un borrado grande */
  observar:function(doc){
    return listo.then(function(){
      if(!versionesOk()||!doc||!doc.id)return null;
      var f=foto(doc),prev=SOMBRA[doc.id];SOMBRA[doc.id]=f;
      return enCola(doc.id,function(){
        return versionesDe(doc.id).then(function(l){
          var ult=l[0];
          if(!ult)return guardarVersion(doc.id,f,{motivo:'auto'},l);
          var c=prev&&cambiosEntre(prev,f);
          var paso=Promise.resolve(null);
          if(c&&(c.quitados>=VER.grandeBloques||c.letrasQuitadas>=VER.grandeLetras)&&!igual(ult,prev))
            paso=guardarVersion(doc.id,prev,{motivo:'borrado'},l);
          return paso.then(function(v){
            if(v)return v;
            if(Date.now()-Date.parse(l[0].fecha)>=VER.ventana&&!igual(l[0],f))return guardarVersion(doc.id,f,{motivo:'auto'},l);
            return null;
          });
        });
      });
    }).catch(function(){return null});
  },
  /* Ahora mismo (al salir, antes de restaurar o de importar, o con nombre). Si nada cambió desde la última, no
     se repite: se le pone el nombre o el motivo a la última */
  tomar:function(doc,op){
    op=op||{};
    return listo.then(function(){
      if(!versionesOk()||!doc||!doc.id)return null;
      var f=foto(doc);
      if(op.motivo!=='importar')SOMBRA[doc.id]=f;
      return enCola(doc.id,function(){
        return versionesDe(doc.id).then(function(l){
          var ult=l[0];
          if(igual(ult,f)){
            /* Igual a la última: con nombre, se lo pone; antes de restaurar o importar, se dice así (es más claro) */
            if(op.nombre){ult.nombre=String(op.nombre).slice(0,80);ult.motivo='nombre'}
            else if(/^(restaurar|importar|borrado)$/.test(op.motivo||'')&&ult.motivo==='auto')ult.motivo=op.motivo;
            else return ult;
            return motor.poner('versiones',[ult]).then(function(){avisar({almacen:'versiones',doc:doc.id});return ult});
          }
          return guardarVersion(doc.id,f,{motivo:op.nombre?'nombre':op.motivo||'auto',nombre:op.nombre,fecha:op.fecha},l);
        });
      });
    }).catch(function(){return null});
  },
  /* Las versiones de una página, lo más nuevo primero (copias: cambiarlas no cambia las guardadas) */
  listar:function(id){
    return listo.then(function(){return versionesOk()?versionesDe(id):[]}).then(function(l){return JSON.parse(JSON.stringify(l))});
  },
  /* La página como estaba: {doc, incompleta} */
  leer:function(v){
    return conMotor(function(m){return m.leerVarios('trozos',[v.meta].concat(v.bloques))}).then(function(ts){
      var falta=false,meta={};
      try{meta=ts[0]?JSON.parse(ts[0].t):{}}catch(e){meta={}}
      if(!ts[0]){falta=true;meta={titulo:v.titulo}}
      var bl=v.bloques.map(function(h,i){
        var t=ts[i+1];
        if(t)try{return JSON.parse(t.t)}catch(e){}
        falta=true;
        return {type:'callout',attrs:{id:v.ids[i]||'b-falta'+i,variante:'aviso'},content:[{type:'paragraph',content:[{type:'text',text:'Este bloque no se pudo recuperar de esta versión.'}]}]};
      });
      var d=Object.assign({},meta,{id:v.doc,contenido:{type:'doc',content:bl}});
      return {doc:d,incompleta:falta};
    });
  },
  /* Le pone (o le quita, con '') un nombre a una versión: con nombre no se borra sola */
  nombrar:function(vid,docId,nombre){
    return versionesDe(docId).then(function(l){
      var v=l.filter(function(x){return x.id===vid})[0];if(!v)throw new Error('Esa versión ya no existe');
      v.nombre=String(nombre||'').replace(/\s+/g,' ').trim().slice(0,80);
      if(v.nombre)v.motivo='nombre';else if(v.motivo==='nombre')v.motivo='auto';
      return motor.poner('versiones',[v]).then(function(){avisar({almacen:'versiones',doc:docId});return v});
    });
  },
  /* Qué cambió de una versión a la página como está ahora */
  cambios:function(v,doc){var r=cambiosEntre(v,foto(doc));delete r.letrasQuitadas;return r},
  igualQue:function(v,doc){return igual(v,foto(doc))},
  /* Al borrar una página para siempre */
  borrarDe:function(id){
    return listo.then(function(){
      if(!versionesOk())return 0;
      return versionesDe(id).then(function(l){
        delete VCACHE[id];delete SOMBRA[id];
        return l.length?motor.borrarVarios('versiones',l.map(function(v){return v.id})).then(function(){return motor.limpiarTrozos()}):0;
      });
    });
  },
  depurar:function(id,ahoraMs){return versionesDe(id).then(function(l){return depurar(id,l,ahoraMs)})},
  limpiar:function(){return listo.then(function(){return versionesOk()?motor.limpiarTrozos():0})},
  /* Cuántas versiones y trozos hay (para «Tus datos» y las pruebas) */
  cuenta:function(){
    return listo.then(function(){
      if(!versionesOk())return {versiones:0,trozos:0};
      return Promise.all([motor.claves('versiones'),motor.claves('trozos')]).then(function(r){return {versiones:r[0].length,trozos:r[1].length}});
    });
  }
};
/* Otra pestaña guardó o borró versiones: se vuelven a leer */
oyentes.push(function(c,deOtra){if(deOtra&&c.almacen==='versiones'&&c.doc)delete VCACHE[c.doc];if(deOtra&&c.almacen==='*')VCACHE={}});

/* ---------- Quién eres, permisos de cada página y quién la tiene abierta ----------
   Quien usa este navegador es una persona de la empresa (empresa.js); «Cambiar de persona» la cambia. Cada página
   lleva su lista de personas con acceso, para compartirla entre personas y, con las cuentas y la nube (F9), entre
   dispositivos:
   - AT.datos.yo(): {id, nombre, correo}; se crea una vez (aprende-tecnologia:yo) y entra en el respaldo (al
     restaurar en otro navegador, se adopta si aquí todavía no se usó). El nombre y el correo salen de tu ficha en
     la empresa; AT.datos.ponerYo cambia de persona (lo usa AT.empresa.entrarComo) y AT.datos.yoId da solo el id.
   - doc.acceso = {dueno:{id, nombre, correo}, personas:[{id, nombre, correo, rol, estado, desde, por}],
     solicitudes:[{id, de:{id, nombre, correo}, rol, mensaje, fecha, estado, resuelta, por}], cambio}. Una página sin
     acceso es tuya. Roles: dueno (Propietario), admin (Administrador: edita y cambia permisos), editor (Puede
     editar) y lector (Solo puede ver); quien no está en la lista no puede editar y puede pedir acceso. Una persona
     invitada queda «invitado» hasta que existan las cuentas.
   - AT.datos.acceso: rol, puede, personas, pendientes, invitar, cambiarRol, quitar, solicitar y responder (siempre
     sobre lo último guardado). documentos.guardar no pisa un acceso más nuevo y anota quién editó (editadoPor).
   - AT.datos.presencia: cada página abierta se anuncia (cada 15 s, entre pestañas) y dice si se edita o se lee.
     Con la nube, será también la de las demás personas.
   No es seguridad todavía: sin servidor, quien tiene el navegador tiene los datos. */
var CLAVE_YO=PREF+'yo';
function limpio(v,max){return typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):''}
function correoValido(c){return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(c)}
function yo(){
  var y=leerJSON(CLAVE_YO);
  if(!esObjeto(y)||!/^u-[\w-]{4,40}$/.test(String(y.id))){y={id:idNuevo('u'),nombre:'',correo:'',creado:ahora()};lsSet(CLAVE_YO,JSON.stringify(y))}
  return y;
}
/* Tu nombre: el de tu ficha en la empresa, el que pusiste aquí o el de tu espacio */
function quienSoy(){
  var y=yo(),p=AT.perfil&&AT.perfil.actual&&AT.perfil.actual(),e=AT.empresa&&AT.empresa.persona(y.id);
  return {id:y.id,nombre:limpio(e&&e.nombre,60)||limpio(y.nombre,60)||limpio(p&&p.nombre,60),correo:(e&&e.correo)||limpio(y.correo,254)};
}
/* Tu nombre y tu correo: aquí y en tu ficha de la empresa */
function cambiarYo(c){
  var y=yo();
  if(c&&c.nombre!=null)y.nombre=limpio(String(c.nombre),60);
  if(c&&c.correo!=null){var k=limpio(String(c.correo),254).toLowerCase();if(k&&!correoValido(k))throw new Error('Ese correo no parece válido.');y.correo=k}
  if(AT.empresa&&AT.empresa.persona(y.id)){
    var ce={};if(c&&c.nombre!=null&&y.nombre)ce.nombre=y.nombre;if(c&&c.correo!=null)ce.correo=y.correo;
    if(ce.nombre!=null||ce.correo!=null)AT.empresa.cambiarPersona(y.id,ce);
  }
  lsSet(CLAVE_YO,JSON.stringify(y));
  avisar({almacen:'yo'});
  return quienSoy();
}
/* «Cambiar de persona» (empresa.js): quien usa este navegador pasa a ser p */
function ponerYo(p){
  var y=yo();
  lsSet(CLAVE_YO,JSON.stringify({id:p.id,nombre:limpio(p.nombre,60),correo:limpio(p.correo,254),creado:y.creado||ahora()}));
  avisar({almacen:'yo'});
}
var ROLES_ACC={dueno:{n:4,nombre:'Propietario',desc:'Hace todo y no se le puede quitar el acceso.'},
  admin:{n:3,nombre:'Administrador',desc:'Edita y decide quién más entra y con qué permiso.'},
  editor:{n:2,nombre:'Puede editar',desc:'Cambia el contenido de la página.'},
  lector:{n:1,nombre:'Solo puede ver',desc:'La lee, sin cambiarla.'}};
function mismaPersona(a,b){
  if(!a||!b)return false;
  if(a.id&&b.id&&a.id===b.id)return true;
  return !!a.correo&&!!b.correo&&String(a.correo).toLowerCase()===String(b.correo).toLowerCase();
}
function rolAcceso(a,p){
  if(!a||!a.dueno)return 'dueno';
  if(mismaPersona(a.dueno,p))return 'dueno';
  var m=(a.personas||[]).filter(function(x){return mismaPersona(x,p)})[0];
  return m&&m.rol!=='dueno'&&ROLES_ACC[m.rol]?m.rol:'ninguno';
}
function nivelDe(rol){return ROLES_ACC[rol]?ROLES_ACC[rol].n:0}
/* Salas (E3, empresa.js): cada página vive en una sala (doc.acceso.sala) o en Privado. Las de antes sin lista de
   acceso están en la General; las que ya tenían lista, sin sala, en Privado (como estaban: solo su lista) */
var GENERAL='sa-general';
function conSalas(){return !!(AT.empresa&&AT.empresa.existe()&&AT.empresa.rolEnSala)}
function salaDe(d){
  var a=d&&d.acceso;
  if(!esObjeto(a)||!a.dueno)return GENERAL;
  return typeof a.sala==='string'&&/^(sa-[\w-]{4,40}|privado)$/.test(a.sala)?a.sala:'privado';
}
/* El rol en una página: el mayor entre su lista (propietario, admin, editor, lector) y su sala (admin, editor,
   lector). La sala solo cuenta si la página es de esta empresa (acceso.empresa; una página que llega del respaldo
   de otra empresa solo tiene su lista). Sin empresa, solo la lista (una página sin lista es de quien la abre) */
function rolPagina(d,p){
  var a=d&&d.acceso;
  if(!conSalas())return rolAcceso(a,p);
  var r=esObjeto(a)&&a.dueno?rolAcceso(a,p):'ninguno',sa=salaDe(d);
  var deAqui=!esObjeto(a)||!a.empresa||a.empresa===AT.empresa.id();
  if(sa!=='privado'&&deAqui){var rs=AT.empresa.rolEnSala(sa,p&&p.id);if(rs&&nivelDe(rs)>nivelDe(r))r=rs}
  return r;
}
function puedeDoc(d,que,p){var n=nivelDe(rolPagina(d,p||quienSoy()));return que==='compartir'?n>=3:que==='editar'?n>=2:n>=1}
/* El acceso de una página que recién tiene lista (una de antes): sigue en su sala y su propietario es quien la
   cambia si la administra; si no (por ejemplo, alguien que pide permiso), el propietario de la empresa */
function accesoNuevo(d){
  var dueno=quienSoy();
  if(conSalas()&&!puedeDoc(d,'compartir')){
    var pr=AT.empresa.personas().filter(function(x){return x.rol==='propietario'})[0];
    if(pr)dueno={id:pr.id,nombre:pr.nombre,correo:pr.correo};
  }
  var a={dueno:dueno,personas:[],solicitudes:[]};if(conSalas()){a.sala=salaDe(d);a.empresa=AT.empresa.id()}return a;
}
/* Cambia el acceso de una página sobre lo último guardado, leyendo y escribiendo en la misma transacción (así no
   pisa lo que el autoguardado escriba al mismo tiempo) y sin cambiar la fecha de edición */
function cambiarAcceso(id,fn){
  var r,a;
  return conMotor(function(m){
    return m.actualizar('documentos',id,function(d){
      if(!d)throw new Error('Esa página ya no existe.');
      a=esObjeto(d.acceso)&&d.acceso.dueno?JSON.parse(JSON.stringify(d.acceso)):accesoNuevo(d);
      if(!Array.isArray(a.personas))a.personas=[];
      if(!Array.isArray(a.solicitudes))a.solicitudes=[];
      r=fn(a,d);
      a.cambio=ahora();
      d.acceso=a;
      return d;
    });
  }).then(function(){avisar({almacen:'documentos',id:id,acceso:true});return r===undefined?a:r});
}
/* Los permisos se revisan contra la página guardada (d), con su lista y su sala de antes del cambio */
function exigir(d,que){if(!puedeDoc(d,que))throw new Error(que==='compartir'?'Solo quien administra la página puede cambiar los permisos.':'No tienes permiso para eso.')}
var acceso={
  ROLES:ROLES_ACC,
  rol:function(doc,p){return rolPagina(doc,p||quienSoy())},
  nombreRol:function(r){return r==='ninguno'?'Sin acceso':(ROLES_ACC[r]||{}).nombre||''},
  puede:function(doc,que){return puedeDoc(doc,que)},
  /* La sala de la página ('sa-…' o 'privado'); sin empresa, '' */
  sala:function(doc){return conSalas()?salaDe(doc):''},
  /* El acceso de una página nueva: quien la crea es su propietario, en la sala que elige (o la General) */
  nueva:function(sala){
    if(!conSalas())return null;
    var s=sala==='privado'||(typeof sala==='string'&&AT.empresa.puedeSala(sala,'editar'))?sala:GENERAL;
    if(s!=='privado'&&!AT.empresa.puedeSala(s,'editar'))s='privado';
    return {dueno:quienSoy(),personas:[],solicitudes:[],sala:s,empresa:AT.empresa.id(),cambio:ahora()};
  },
  /* Mover una página a otra sala (o a Privado): quien la administra, si puede crear páginas en esa sala */
  mover:function(id,sala){
    return cambiarAcceso(id,function(a,d){
      exigir(d,'compartir');
      if(sala!=='privado'&&!(conSalas()&&AT.empresa.sala(sala)))throw new Error('Esa sala ya no existe.');
      if(sala!=='privado'&&!AT.empresa.puedeSala(sala,'editar'))throw new Error('No puedes poner páginas en esa sala.');
      a.sala=sala;a.empresa=AT.empresa.id();
      return a;
    });
  },
  /* Quién tiene acceso por la lista de la página, el propietario primero: [{id, nombre, correo, rol, estado, tu}]
     (con salas, una página sin lista no tiene a nadie: la sala decide) */
  personas:function(doc){
    var a=doc&&doc.acceso,y=quienSoy();
    if(!a||!a.dueno)return conSalas()?[]:[{id:y.id,nombre:y.nombre,correo:y.correo,rol:'dueno',estado:'activo',tu:true}];
    /* El nombre y el correo de hoy si la persona es de la empresa (la lista guarda los de cuando entró) */
    function vivo(x){var e=AT.empresa&&x&&x.id?AT.empresa.persona(x.id):null;return e?{nombre:e.nombre||x.nombre||'',correo:e.correo||x.correo||''}:{nombre:x.nombre||'',correo:x.correo||''}}
    var vd=vivo(a.dueno),l=[{id:a.dueno.id,nombre:vd.nombre,correo:vd.correo,rol:'dueno',estado:'activo',tu:mismaPersona(a.dueno,y)}];
    (a.personas||[]).forEach(function(p){if(ROLES_ACC[p.rol]&&p.rol!=='dueno'){var v=vivo(p);l.push({id:p.id,nombre:v.nombre,correo:v.correo,rol:p.rol,estado:p.estado||'activo',desde:p.desde,tu:mismaPersona(p,y)})}});
    return l;
  },
  pendientes:function(doc){var a=doc&&doc.acceso;return a&&Array.isArray(a.solicitudes)?a.solicitudes.filter(function(s){return s.estado==='pendiente'}):[]},
  tuSolicitud:function(doc){var y=quienSoy();return acceso.pendientes(doc).filter(function(s){return mismaPersona(s.de,y)})[0]||null},
  /* Alguien de tu empresa (empresa.js) entra directo, sin invitación: usa este mismo navegador */
  dar:function(id,p,rol){
    return cambiarAcceso(id,function(a,d){
      exigir(d,'compartir');
      if(!p||!/^u-[\w-]{4,40}$/.test(String(p.id)))throw new Error('Elige a una persona de tu empresa.');
      if(!ROLES_ACC[rol]||rol==='dueno')throw new Error('Elige un permiso.');
      if(mismaPersona(a.dueno,p))throw new Error('Esa persona es la propietaria de la página.');
      var ya=a.personas.filter(function(x){return mismaPersona(x,p)})[0];
      if(ya){ya.rol=rol;ya.id=p.id;ya.estado='aceptado';if(p.nombre)ya.nombre=limpio(p.nombre,60);return ya}
      var n={id:p.id,nombre:limpio(p.nombre,60),correo:limpio(String(p.correo||''),254).toLowerCase(),rol:rol,estado:'aceptado',desde:ahora(),por:quienSoy().id};
      a.personas.push(n);
      return n;
    });
  },
  invitar:function(id,p){
    return cambiarAcceso(id,function(a,d){
      exigir(d,'compartir');
      var correo=limpio(String(p&&p.correo||''),254).toLowerCase(),nombre=limpio(String(p&&p.nombre||''),60),rol=p&&p.rol;
      if(!correoValido(correo))throw new Error('Escribe un correo válido.');
      if(!ROLES_ACC[rol]||rol==='dueno')throw new Error('Elige un permiso.');
      if(mismaPersona(a.dueno,{correo:correo}))throw new Error('Esa persona es la propietaria.');
      var ya=a.personas.filter(function(x){return mismaPersona(x,{correo:correo})})[0];
      if(ya){ya.rol=rol;if(nombre)ya.nombre=nombre;return ya}
      var n={id:idNuevo('p'),nombre:nombre,correo:correo,rol:rol,estado:'invitado',desde:ahora(),por:quienSoy().id};
      a.personas.push(n);
      return n;
    });
  },
  cambiarRol:function(id,pid,rol){
    return cambiarAcceso(id,function(a,d){
      exigir(d,'compartir');
      if(!ROLES_ACC[rol]||rol==='dueno')throw new Error('Elige un permiso.');
      var p=a.personas.filter(function(x){return x.id===pid})[0];if(!p)throw new Error('Esa persona ya no tiene acceso.');
      p.rol=rol;return p;
    });
  },
  quitar:function(id,pid){
    return cambiarAcceso(id,function(a,d){
      exigir(d,'compartir');
      var n=a.personas.length;a.personas=a.personas.filter(function(x){return x.id!==pid});
      if(a.personas.length===n)throw new Error('Esa persona ya no tiene acceso.');
    });
  },
  /* Abrir una página a la que te invitaron acepta la invitación (queda «activo», ligado a quien eres) */
  aceptar:function(id){
    return docsCol.leer(id).then(function(d){
      var y=quienSoy(),a=d&&d.acceso,m=a&&(a.personas||[]).filter(function(p){return mismaPersona(p,y)})[0];
      if(!m||m.estado!=='invitado')return null;
      return cambiarAcceso(id,function(a2){
        var p=a2.personas.filter(function(x){return mismaPersona(x,y)})[0];
        if(p){p.estado='activo';p.acepto=ahora();p.id=y.id;if(!p.nombre)p.nombre=y.nombre}
        return p;
      });
    });
  },
  /* Pedir un permiso (quien no administra la página): queda pendiente para los administradores */
  solicitar:function(id,p){
    return cambiarAcceso(id,function(a,d){
      var y=quienSoy(),rol=p&&p.rol;
      if(!ROLES_ACC[rol]||rol==='dueno')throw new Error('Elige qué permiso pides.');
      if(nivelDe(rolPagina(d,y))>=nivelDe(rol))throw new Error('Ya tienes ese permiso.');
      var s=a.solicitudes.filter(function(x){return x.estado==='pendiente'&&mismaPersona(x.de,y)})[0];
      if(!s){s={id:idNuevo('s'),de:{id:y.id,nombre:y.nombre,correo:y.correo},estado:'pendiente'};a.solicitudes.push(s)}
      s.rol=rol;s.mensaje=limpio(String(p&&p.mensaje||''),300);s.fecha=ahora();
      return s;
    });
  },
  responder:function(id,sid,aprobar){
    return cambiarAcceso(id,function(a,d){
      exigir(d,'compartir');
      var s=a.solicitudes.filter(function(x){return x.id===sid})[0];
      if(!s||s.estado!=='pendiente')throw new Error('Esa solicitud ya se respondió.');
      s.estado=aprobar?'aprobada':'rechazada';s.resuelta=ahora();s.por=quienSoy().id;
      if(aprobar&&!mismaPersona(a.dueno,s.de)){
        var p=a.personas.filter(function(x){return mismaPersona(x,s.de)})[0];
        if(!p){p={id:s.de.id||idNuevo('p'),nombre:s.de.nombre||'',correo:s.de.correo||'',desde:ahora(),por:quienSoy().id};a.personas.push(p)}
        p.rol=s.rol;p.estado='activo';
      }
      return s;
    });
  }
};

/* ---------- Presencia: quién tiene abierta cada página (entre pestañas de este navegador) ---------- */
var CLAVE_PRES=PREF+'presencia',PESTANA=idNuevo('t'),presAnuncio=null,presUltimo=null,presTimer=null,VIDA_PRES=45e3;
function presLeer(){var m=leerJSON(CLAVE_PRES);return esObjeto(m)?m:{}}
function presVivas(m){var t=Date.now();Object.keys(m).forEach(function(k){if(!esObjeto(m[k])||!(t-m[k].t<VIDA_PRES))delete m[k]});return m}
function presLatido(){
  if(!presAnuncio)return;
  var m=presVivas(presLeer()),q=quienSoy();
  m[PESTANA]={doc:presAnuncio.doc,modo:presAnuncio.modo,t:Date.now(),quien:{id:q.id,nombre:q.nombre}};
  lsSet(CLAVE_PRES,JSON.stringify(m));
  avisar({almacen:'presencia',doc:presAnuncio.doc});
}
var presencia={
  pestana:PESTANA,VIDA:VIDA_PRES,
  /* Esta pestaña tiene abierta la página doc, para editar o para leer */
  anunciar:function(doc,modo){
    presAnuncio=presUltimo={doc:doc,modo:modo==='editar'?'editar':'leer'};
    presLatido();
    if(!presTimer)presTimer=setInterval(presLatido,15e3);
  },
  dejar:function(){
    if(!presAnuncio)return;
    var d=presAnuncio.doc;presAnuncio=null;clearInterval(presTimer);presTimer=null;
    var m=presLeer();delete m[PESTANA];lsSet(CLAVE_PRES,JSON.stringify(m));
    avisar({almacen:'presencia',doc:d});
  },
  /* Quién tiene abierta cada página: {doc: [{quien, modo, pestanas, aqui}]} (editar gana a leer) */
  todas:function(){
    var m=presVivas(presLeer()),out={};
    Object.keys(m).forEach(function(k){
      var e=m[k],l=out[e.doc]||(out[e.doc]=[]),q=e.quien||{},p=l.filter(function(x){return x.quien.id===q.id})[0];
      if(!p){p={quien:{id:q.id||'',nombre:q.nombre||''},modo:'leer',pestanas:0,aqui:false};l.push(p)}
      p.pestanas++;if(e.modo==='editar')p.modo='editar';if(k===PESTANA)p.aqui=true;
    });
    return out;
  },
  de:function(doc){return presencia.todas()[doc]||[]}
};
addEventListener('pagehide',function(){presencia.dejar()});
addEventListener('pageshow',function(e){if(e.persisted&&presUltimo)presencia.anunciar(presUltimo.doc,presUltimo.modo)});

/* ---------- Bases de datos ---------- */
var basesCol=coleccion('bases'),filasCol=coleccion('filas');
filasCol.deBase=function(id){return conMotor(function(m){return m.porIndice('filas','base',id)})};
/* Varias filas de una vez (importar, pegar, deshacer) */
filasCol.guardarVarias=function(lista){
  var t=ahora(),l=lista.map(function(o){o=JSON.parse(JSON.stringify(o));o.editado=t;if(!o.creado)o.creado=t;return o});
  return conMotor(function(m){return m.poner('filas',l)}).then(function(){avisar({almacen:'filas',base:l[0]&&l[0].base,varias:true});return l});
};
/* Una base con todas sus filas */
function borrarBase(id){
  return filasCol.deBase(id).then(function(fs){
    return Promise.all(fs.map(function(f){return conMotor(function(m){return m.borrar('filas',f.id)})}));
  }).then(function(){return basesCol.borrar(id)}).then(function(){avisar({almacen:'filas',base:id,varias:true})});
}
basesCol.borrarConFilas=borrarBase;

/* ---------- Papelera ---------- */
var docsCol=coleccion('documentos'),papCol=coleccion('papelera');
/* Guardar una página: en una sola transacción lee lo guardado para no pisar un acceso (permisos) más nuevo que el
   que trae, y anota quién la editó */
docsCol.guardar=function(obj,op){
  var o=JSON.parse(JSON.stringify(obj)),fecha=!(op&&op.conservarFecha);
  if(fecha)o.editado=ahora();
  if(!o.creado)o.creado=o.editado||ahora();
  if(fecha){var q=quienSoy();o.editadoPor={id:q.id,nombre:q.nombre}}
  return conMotor(function(m){
    return m.actualizar('documentos',o.id,function(ant){
      if(ant&&esObjeto(ant.acceso)&&(!esObjeto(o.acceso)||String(o.acceso.cambio||'')<String(ant.acceso.cambio||'')))o.acceso=ant.acceso;
      return o;
    });
  }).then(function(){avisar({almacen:'documentos',id:o.id});return o});
};
/* Borrar para siempre: la página y las bases de datos que eran suyas */
function borrarDeVerdad(id){
  return papCol.borrar(id).then(function(){return basesCol.todos()}).then(function(bs){
    return Promise.all(bs.filter(function(b){return b.doc===id}).map(function(b){return borrarBase(b.id)}));
  }).then(function(){return versiones.borrarDe(id).catch(function(){})});
}
var papelera={
  /* Lo que hay en la papelera, lo más reciente primero (lo que lleva más de 30 días se borra solo) */
  todos:function(){
    return papCol.todos().then(function(l){
      var limite=new Date(Date.now()-DIAS_PAPELERA*864e5).toISOString(),viejos=l.filter(function(d){return (d.eliminado||'')<limite});
      return Promise.all(viejos.map(function(d){return borrarDeVerdad(d.id)})).then(function(){
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
  eliminar:function(id){return borrarDeVerdad(id)},
  vaciar:function(){return papCol.todos().then(function(l){return Promise.all(l.map(function(d){return borrarDeVerdad(d.id)}))})},
  DIAS:DIAS_PAPELERA
};

/* Páginas de estudio (de cuando OneBook tenía libretas, apuntes de clase y tesis) */
var TIPOS_ESTUDIO={libreta:1,clase:1,libro:1,investigacion:1,tesis:1,guia:1,bitacora:1};
function deEstudio(d){return !!(d&&TIPOS_ESTUDIO[d.tipo])}

AT.datos={
  listo:listo,
  deEstudio:deEstudio,
  motor:function(){return motor&&motor.tipo},
  documentos:docsCol,
  marcadores:coleccion('marcadores'),
  plantillas:coleccion('plantillas'),
  papelera:papelera,
  bases:basesCol,
  filas:filasCol,
  versiones:versiones,
  yo:quienSoy,
  yoId:function(){return yo().id},
  cambiarYo:cambiarYo,
  ponerYo:ponerYo,
  acceso:acceso,
  presencia:presencia,
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
