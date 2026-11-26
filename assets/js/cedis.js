/* OneBook: pedidos de las sucursales a su Cedis, sin servidor (fase F8, etapa A). El modelo y los enlaces firmados;
   los bloques están en pedidos.js y la página que abre los enlaces en recibir.html (recibir.js).
   - El Cedis tiene cuatro bases con rol, una por espacio (ids de columna fijas): insumos (i-*: el formato de pedido),
     sucursales (s-*), pedidos (e-*: uno por sucursal y folio, con su versión, fecha de entrega y estado) y
     renglones (l-*: lo que pidió cada pedido y lo que el Cedis surte). Las crea asegurar(); las páginas las muestran
     con bloques «Base de datos» cuya semilla lleva el rol (AT.bases.porRol).
   - Las claves y las conexiones no van en ninguna base ni en el CSV: viven en aprende-tecnologia:cedis
     {yo: este espacio como Cedis {id, nombre, corte, dias, doc}, claves: {fila de la sucursal: {k, kv, fmt}},
      conexiones: {id del Cedis: este espacio como sucursal {cedis, suc, k, kv, formato, doc, actual, historial}}}
     y entran en el respaldo.
   - Enlaces: recibir.html#<tipo>.<datos>.<firma>. Lo que va después de # no llega a ningún servidor. Los datos son
     JSON corto comprimido (deflate-raw, «z») o sin comprimir («j»), en base64url; la firma es HMAC-SHA256 (WebCrypto)
     con la clave de 32 bytes de la sucursal y cubre el tipo y los datos. Tipos: inv (invitación), ped (pedido),
     con (confirmación del Cedis) y fmt (formato actualizado).
   - Ninguna sucursal recibe nada de otra: la invitación lleva solo su nombre, su clave y el formato.
   Expone AT.cedis. Se carga después de bases.js. */
(function(){
'use strict';
var AT=window.AT,B=AT.bases,D=AT.datos;
if(!B||!D)return;
var CLAVE='aprende-tecnologia:cedis',PUBLICA='https://chucho-rey.github.io/OneLearn/',LARGO=6000;
var ROLES=['insumos','sucursales','pedidos','renglones'];
var NOMBRES={insumos:'Insumos',sucursales:'Sucursales',pedidos:'Pedidos recibidos',renglones:'Renglones de los pedidos'};
var CATS=['Abarrotes','Carnes','Lácteos','Frutas y verduras','Desechables','Limpieza','Bebidas','Otros'];
var ESTADOS=['Recibido','Confirmado','Surtido'];
var DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
/* Insumos de ejemplo (no hay una cadena real: se pueden borrar) */
var EJEMPLO_INSUMOS=[
  ['ABA-01','Arroz','Bulto 25 kg','Abarrotes',1,1],['ABA-02','Frijol negro','Bulto 25 kg','Abarrotes',1,1],
  ['ABA-03','Aceite vegetal','Garrafa 20 L','Abarrotes',1,1],['ABA-04','Azúcar','Bulto 25 kg','Abarrotes',1,1],
  ['ABA-05','Harina de maíz','Bulto 20 kg','Abarrotes',1,1],['ABA-06','Chile chipotle','Lata 2.8 kg','Abarrotes',1,1],
  ['CAR-01','Pechuga de pollo','Kg','Carnes',5,1],['CAR-02','Carne molida de res','Kg','Carnes',5,1],
  ['CAR-03','Pierna de cerdo','Kg','Carnes',5,1],['CAR-04','Bistec de res','Kg','Carnes',5,1],
  ['LAC-01','Queso Oaxaca','Kg','Lácteos',1,1],['LAC-02','Crema','Cubeta 4 L','Lácteos',1,1],
  ['LAC-03','Leche entera','Caja 12 L','Lácteos',1,1],['LAC-04','Huevo','Caja 30 piezas','Lácteos',1,1],
  ['FYV-01','Jitomate','Kg','Frutas y verduras',5,1],['FYV-02','Cebolla blanca','Kg','Frutas y verduras',5,1],
  ['FYV-03','Aguacate','Kg','Frutas y verduras',2,1],['FYV-04','Limón','Kg','Frutas y verduras',2,1],
  ['FYV-05','Chile habanero','Kg','Frutas y verduras',1,1],['FYV-06','Cilantro','Manojo','Frutas y verduras',5,5],
  ['DES-01','Vaso desechable 1 L','Paquete 50','Desechables',1,1],['DES-02','Contenedor para llevar','Paquete 50','Desechables',1,1],
  ['DES-03','Servilletas','Paquete 500','Desechables',1,1],['LIM-01','Cloro','Garrafa 5 L','Limpieza',1,1],
  ['LIM-02','Detergente para trastes','Garrafa 5 L','Limpieza',1,1]];
var EJEMPLO_SUCURSALES=['Sucursal Centro','Sucursal Norte','Sucursal Poniente'];

/* ---------- Lo guardado aparte (claves, conexiones) ---------- */
var oyentes=[];
function leer(){
  var x=null;try{x=JSON.parse(localStorage.getItem(CLAVE)||'null')}catch(e){}
  if(!x||typeof x!=='object')x={};
  if(!x.claves||typeof x.claves!=='object')x.claves={};
  if(!x.conexiones||typeof x.conexiones!=='object')x.conexiones={};
  return x;
}
function avisar(c){oyentes.forEach(function(f){try{f(c||{})}catch(e){if(window.console)console.error(e)}})}
/* Cambia lo guardado con fn(x) y avisa (en esta pestaña; las demás se enteran por el evento storage) */
function cambiar(fn,c){
  var x=leer(),r=fn(x);
  try{localStorage.setItem(CLAVE,JSON.stringify(x))}catch(e){throw new Error('No se pudo guardar en este navegador. Revisa que no esté en modo privado o sin espacio.')}
  avisar(c);
  return r===undefined?x:r;
}
addEventListener('storage',function(e){if(e.key===CLAVE)avisar({otra:true})});
function on(f){oyentes.push(f);return function(){oyentes=oyentes.filter(function(x){return x!==f})}}

/* ---------- Utilidades ---------- */
function hoyISO(){return iso(new Date())}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function fechaDe(t){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function fechaTexto(t){var d=fechaDe(t);return d?d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}):''}
function horaTexto(t){var d=new Date(t);return isNaN(d)?'':d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'})}
function cuandoTexto(t){var d=new Date(t);return isNaN(d)?'':d.toLocaleDateString('es-MX',{day:'numeric',month:'short'})+', '+horaTexto(t)}
function nuevoId(p){var a=new Uint8Array(6),s='';crypto.getRandomValues(a);for(var i=0;i<a.length;i++)s+='abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i]%36);return p+'-'+s}
function num(v){var n=typeof v==='number'?v:parseFloat(String(v==null?'':v).replace(/[,\s]/g,''));return isFinite(n)?n:0}
function sinAcentos(t){return B.sinAcentos?B.sinAcentos(t):String(t||'').toLowerCase()}
/* Una huella corta de un texto (para saber si el formato cambió) */
function huella(t){
  var h1=0xdeadbeef,h2=0x41c6ce57;t=String(t);
  for(var i=0;i<t.length;i++){var c=t.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0)).toString(36);
}
/* Días de entrega [0-6] → «lunes a sábado», «lunes, miércoles y viernes» */
function diasTexto(d){
  d=(d||[]).slice().sort();
  if(!d.length)return 'sin días de entrega';
  if(d.length===7)return 'todos los días';
  var seg=true;for(var i=1;i<d.length;i++)if(d[i]!==d[i-1]+1)seg=false;
  if(seg&&d.length>2)return DIAS[d[0]]+' a '+DIAS[d[d.length-1]];
  var n=d.map(function(x){return DIAS[x]});
  return n.length===1?n[0]:n.slice(0,-1).join(', ')+' y '+n[n.length-1];
}
/* La siguiente fecha de entrega después de hoy (según los días de entrega) */
function siguienteEntrega(dias,desde){
  var d=desde?fechaDe(desde)||new Date():new Date();d=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  dias=Array.isArray(dias)&&dias.length?dias:[0,1,2,3,4,5,6];
  for(var i=1;i<=7;i++){var x=new Date(d);x.setDate(d.getDate()+i);if(dias.indexOf(x.getDay())>=0)return iso(x)}
  var y=new Date(d);y.setDate(d.getDate()+1);return iso(y);
}
/* Hasta cuándo se recibe el pedido de una fecha: el día anterior a la hora de corte */
function limite(fecha,corte){
  var d=fechaDe(fecha);if(!d)return null;
  var m=/^(\d{1,2}):(\d{2})$/.exec(corte||'18:00')||[0,18,0];
  d.setDate(d.getDate()-1);d.setHours(+m[1],+m[2],0,0);return d;
}
function tarde(fecha,corte,cuando){var l=limite(fecha,corte),t=new Date(cuando);return !!l&&!isNaN(t)&&t>l}

/* ---------- Codificar, comprimir y firmar ---------- */
function b64url(bytes){var s='';for(var i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function deB64url(t){
  t=String(t||'').replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';
  var s=atob(t),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;
}
function flujo(bytes,Clase,modo){
  var s=new Blob([bytes]).stream().pipeThrough(new Clase(modo));
  return new Response(s).arrayBuffer().then(function(b){return new Uint8Array(b)});
}
function codificar(obj){
  var bytes=new TextEncoder().encode(JSON.stringify(obj));
  if(typeof CompressionStream==='function')return flujo(bytes,CompressionStream,'deflate-raw').then(function(z){return 'z'+b64url(z)},function(){return 'j'+b64url(bytes)});
  return Promise.resolve('j'+b64url(bytes));
}
function decodificar(t){
  return Promise.resolve().then(function(){
    var modo=t.charAt(0),b=deB64url(t.slice(1));
    if(modo==='j')return b;
    if(modo==='z'){if(typeof DecompressionStream!=='function')throw new Error('Este navegador no puede abrir enlaces comprimidos. Pide que te lo manden como archivo.');return flujo(b,DecompressionStream,'deflate-raw')}
    throw new Error('El enlace no es de OneBook.');
  }).then(function(b){return JSON.parse(new TextDecoder().decode(b))});
}
function claveNueva(){var a=new Uint8Array(32);crypto.getRandomValues(a);return b64url(a)}
function llave(k){
  if(!window.crypto||!crypto.subtle)return Promise.reject(new Error('Este navegador no puede firmar ni revisar enlaces (abre OneBook con https).'));
  return crypto.subtle.importKey('raw',deB64url(k),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
function firmar(k,texto){return llave(k).then(function(c){return crypto.subtle.sign('HMAC',c,new TextEncoder().encode(texto))}).then(function(s){return b64url(new Uint8Array(s))})}
function verificar(k,texto,firma){
  return llave(k).then(function(c){var f;try{f=deB64url(firma)}catch(e){return false}return crypto.subtle.verify('HMAC',c,f,new TextEncoder().encode(texto))}).catch(function(){return false});
}
/* La dirección de recibir.html (desde file:// va a la pública) */
function baseURL(){return location.protocol==='file:'?PUBLICA:new URL('./',location.href).href}
/* Un enlace firmado: {url, largo, texto (lo que va después de #)} */
function enlace(tipo,obj,k){
  return codificar(obj).then(function(datos){
    var cuerpo=tipo+'.'+datos;
    return firmar(k,cuerpo).then(function(f){var t=cuerpo+'.'+f,u=baseURL()+'recibir.html#'+t;return {url:u,texto:t,largo:u.length>LARGO}});
  });
}
/* Lee lo que viene en un enlace (la dirección completa, lo que va después de #, o el contenido de un archivo .onebook) */
function partes(t){
  t=String(t||'').trim();
  var i=t.indexOf('#');if(i>=0)t=t.slice(i+1);
  var m=/^(inv|ped|con|fmt)\.([zj][\w-]+)\.([\w-]+)$/.exec(t);
  if(!m)return null;
  return {tipo:m[1],datos:m[2],firma:m[3],cuerpo:m[1]+'.'+m[2]};
}
function abrir(t){
  var p=partes(t);
  if(!p)return Promise.reject(new Error('Este enlace no es de OneBook o llegó incompleto. Pide que te lo vuelvan a mandar, o que te lo manden como archivo.'));
  return decodificar(p.datos).then(function(o){p.obj=o;return p});
}
/* Un archivo .onebook (cuando el enlace es muy largo para un mensaje) */
function archivo(texto,nombre){
  var blob=new Blob([texto],{type:'text/plain'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=nombre;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
}

/* ---------- Bases del Cedis ---------- */
function vista(id,nombre,tipo,extra){return Object.assign({id:id,nombre:nombre,tipo:tipo,q:'',f:{col:'',op:'contiene',val:''},s:{col:'',dir:1},s2:{col:'',dir:1},ocultas:[]},extra||{})}
function semilla(rol,ids,ejemplo){
  ids=ids||{};
  if(rol==='insumos')return {nombre:NOMBRES.insumos,rol:rol,columnas:[
    {id:'i-nombre',nombre:'Insumo',tipo:'texto'},
    {id:'i-codigo',nombre:'Código',tipo:'texto'},
    {id:'i-pres',nombre:'Presentación',tipo:'texto'},
    {id:'i-cat',nombre:'Categoría',tipo:'seleccion',opciones:CATS.slice()},
    {id:'i-min',nombre:'Mínimo',tipo:'numero'},
    {id:'i-mult',nombre:'Múltiplo',tipo:'numero'},
    {id:'i-activo',nombre:'Activo',tipo:'casilla'},
    {id:'i-costo',nombre:'Costo',tipo:'moneda'}],
    vistas:[vista('v-ins','Insumos','tabla',{s:{col:'i-cat',dir:1},s2:{col:'i-nombre',dir:1},agrupar:'i-cat'})],
    filas:ejemplo?EJEMPLO_INSUMOS.map(function(x){return {v:{'i-codigo':x[0],'i-nombre':x[1],'i-pres':x[2],'i-cat':x[3],'i-min':x[4],'i-mult':x[5],'i-activo':true}}}):[]};
  if(rol==='sucursales')return {nombre:NOMBRES.sucursales,rol:rol,columnas:[
    {id:'s-nombre',nombre:'Sucursal',tipo:'texto'},
    {id:'s-enc',nombre:'Encargado',tipo:'texto'},
    {id:'s-tel',nombre:'Teléfono',tipo:'telefono'},
    {id:'s-correo',nombre:'Correo',tipo:'texto'},
    {id:'s-activa',nombre:'Activa',tipo:'casilla'},
    {id:'s-ult',nombre:'Último pedido',tipo:'texto'}],
    vistas:[vista('v-suc','Sucursales','tabla',{s:{col:'s-nombre',dir:1},s2:{col:'',dir:1}})],
    filas:ejemplo?EJEMPLO_SUCURSALES.map(function(n){return {v:{'s-nombre':n,'s-activa':true}}}):[]};
  if(rol==='pedidos')return {nombre:NOMBRES.pedidos,rol:rol,columnas:[
    {id:'e-folio',nombre:'Folio',tipo:'texto'},
    {id:'e-suc',nombre:'Sucursal',tipo:'relacion',base:ids.sucursales||''},
    {id:'e-fecha',nombre:'Entrega',tipo:'fecha'},
    {id:'e-ver',nombre:'Versión',tipo:'numero'},
    {id:'e-env',nombre:'Enviado',tipo:'texto'},
    {id:'e-estado',nombre:'Estado',tipo:'seleccion',opciones:ESTADOS.slice(),colores:[{op:'igual',val:'Recibido',tono:'aviso'},{op:'igual',val:'Confirmado',tono:'info'},{op:'igual',val:'Surtido',tono:'bien'}]},
    {id:'e-tarde',nombre:'Llegó tarde',tipo:'casilla'},
    {id:'e-notas',nombre:'Notas',tipo:'texto'},
    {id:'e-envt',nombre:'Enviado (ISO)',tipo:'texto'},
    {id:'e-conf',nombre:'Confirmación',tipo:'numero'}],
    vistas:[vista('v-ped','Pedidos','tabla',{s:{col:'e-fecha',dir:-1},s2:{col:'e-folio',dir:1},ocultas:['e-envt','e-conf']})],filas:[]};
  if(rol==='renglones')return {nombre:NOMBRES.renglones,rol:rol,columnas:[
    {id:'l-insumo',nombre:'Insumo',tipo:'texto'},
    {id:'l-ped',nombre:'Pedido',tipo:'relacion',base:ids.pedidos||''},
    {id:'l-cod',nombre:'Código',tipo:'texto'},
    {id:'l-pide',nombre:'Pidió',tipo:'numero'},
    {id:'l-surte',nombre:'Surte',tipo:'numero'},
    {id:'l-nota',nombre:'Nota',tipo:'texto'}],
    vistas:[vista('v-ren','Renglones','tabla',{agrupar:'l-ped'})],filas:[]};
  return null;
}
var IDS=null,cola=Promise.resolve();
function enCola(fn){var p=cola.then(fn);cola=p.catch(function(){});return p}
function buscar(){
  return D.bases.todos().then(function(bs){
    var o={};
    bs.slice().sort(function(a,b){return String(a.creado||'')<String(b.creado||'')?-1:1}).forEach(function(b){if(b.rol&&ROLES.indexOf(b.rol)>=0&&!o[b.rol])o[b.rol]=b.id});
    IDS=o;return o;
  });
}
/* Crea las cuatro bases si faltan (las primeras traen los insumos y las sucursales de ejemplo) */
function asegurar(doc,op){
  return enCola(function(){
    return buscar().then(function(ids){
      var p=Promise.resolve(),nuevas=!ids.insumos&&!ids.sucursales;
      ROLES.forEach(function(rol){
        if(ids[rol])return;
        p=p.then(function(){return B.crear(semilla(rol,ids,nuevas&&!(op&&op.vacio)),doc)}).then(function(b){ids[rol]=b.id});
      });
      return p.then(function(){return Promise.all(ROLES.map(function(r){return B.cargar(ids[r])}))}).then(function(){IDS=ids;return ids});
    });
  });
}
/* Lee las bases que haya (sin crear nada) */
function cargar(){return buscar().then(function(ids){return Promise.all(ROLES.filter(function(r){return ids[r]}).map(function(r){return B.cargar(ids[r]).catch(function(){return null})})).then(function(){return ids})})}
B.porRol=B.porRol||{};
ROLES.forEach(function(rol){B.porRol[rol]=function(doc){return asegurar(doc).then(function(ids){return B.cargar(ids[rol])})}});
function bd(rol){return IDS&&IDS[rol]?B.base(IDS[rol]):null}
function val(b,f,id){var c=B.col(b,id);return c?B.valor(b,f,c):''}
function insumos(todos){
  var b=bd('insumos');if(!b)return [];
  return B.filas(b.id).map(function(f){
    return {id:f.id,codigo:String(val(b,f,'i-codigo')||'').trim(),nombre:String(val(b,f,'i-nombre')||'').trim(),pres:String(val(b,f,'i-pres')||''),
      cat:String(val(b,f,'i-cat')||'')||'Otros',min:num(val(b,f,'i-min')),mult:num(val(b,f,'i-mult'))||1,activo:!!f.v['i-activo'],costo:num(val(b,f,'i-costo'))};
  }).filter(function(x){return x.nombre&&x.codigo&&(todos||x.activo)}).sort(function(a,b){return CATS.indexOf(a.cat)-CATS.indexOf(b.cat)||a.nombre.localeCompare(b.nombre,'es')});
}
function sucursales(todas){
  var b=bd('sucursales');if(!b)return [];
  return B.filas(b.id).map(function(f){
    return {id:f.id,nombre:String(val(b,f,'s-nombre')||'').trim(),enc:String(val(b,f,'s-enc')||''),tel:String(f.v['s-tel']||''),correo:String(val(b,f,'s-correo')||'').trim(),activa:!!f.v['s-activa']};
  }).filter(function(s){return s.nombre&&(todas||s.activa)}).sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es',{numeric:true})});
}
/* El formato que reciben las sucursales: los insumos activos, sin costos ni nada interno */
function formato(){
  var l=insumos().map(function(x){return [x.codigo,x.nombre,x.pres,x.cat,x.min,x.mult]});
  return {h:huella(JSON.stringify(l)),l:l};
}

/* ---------- El Cedis ---------- */
function yo(){return leer().yo||null}
/* Este espacio como Cedis (lo crea la primera vez) */
function asegurarYo(doc){
  var y=yo();
  if(y){if(doc&&y.doc!==doc)cambiar(function(x){x.yo.doc=doc});return yo()}
  var e=AT.empresa&&AT.empresa.existe&&AT.empresa.existe()?AT.empresa.leer():null;
  return cambiar(function(x){x.yo={id:nuevoId('cd'),nombre:e&&e.nombre?e.nombre:'Cedis',corte:'18:00',dias:[1,2,3,4,5,6],doc:doc||''};return x.yo},{tipo:'yo'});
}
function ajustarYo(a){
  return cambiar(function(x){
    if(!x.yo)return;
    if(typeof a.nombre==='string'&&a.nombre.trim())x.yo.nombre=a.nombre.trim().slice(0,60);
    if(/^\d{1,2}:\d{2}$/.test(a.corte||''))x.yo.corte=a.corte;
    if(Array.isArray(a.dias))x.yo.dias=a.dias.filter(function(d){return d>=0&&d<=6}).filter(function(d,i,l){return l.indexOf(d)===i}).sort();
    return x.yo;
  },{tipo:'yo'});
}
function claveDe(sid){return leer().claves[sid]||null}
/* La invitación de una sucursal (con su clave; la crea si no tiene) */
function invitacion(sid){
  var y=yo(),s=sucursales(true).filter(function(x){return x.id===sid})[0];
  if(!y||!s)return Promise.reject(new Error('No se encontró la sucursal.'));
  var c=claveDe(sid);
  if(!c)c=cambiar(function(x){x.claves[sid]={k:claveNueva(),kv:1,fmt:''};return x.claves[sid]},{tipo:'claves'});
  var f=formato();
  return enlace('inv',{c:{i:y.id,n:y.nombre,co:y.corte,d:y.dias},s:{i:sid,n:s.nombre},k:c.k,kv:c.kv,f:f},c.k).then(function(r){
    cambiar(function(x){if(x.claves[sid])x.claves[sid].fmt=f.h},{tipo:'claves'});
    r.sucursal=s;return r;
  });
}
/* Cambiar la clave: la invitación anterior ya no sirve (hay que mandar la nueva) */
function cambiarClave(sid){
  cambiar(function(x){var kv=(x.claves[sid]&&x.claves[sid].kv||0)+1;x.claves[sid]={k:claveNueva(),kv:kv,fmt:''}},{tipo:'claves'});
  return invitacion(sid);
}
/* El formato actualizado para una sucursal ya conectada */
function enlaceFormato(sid){
  var y=yo(),c=claveDe(sid);
  if(!y||!c)return Promise.reject(new Error('Esa sucursal todavía no tiene invitación.'));
  var f=formato();
  return enlace('fmt',{c:{i:y.id,n:y.nombre,co:y.corte,d:y.dias},s:{i:sid},f:f},c.k).then(function(r){cambiar(function(x){if(x.claves[sid])x.claves[sid].fmt=f.h},{tipo:'claves'});return r});
}
/* Los pedidos de una fecha de entrega: {sucursal id: {fila, folio, version, env, envt, estado, tarde, notas, renglones:[{fila, cod, insumo, pide, surte, nota}]}} */
function pedidosDe(fecha){
  var pb=bd('pedidos'),rb=bd('renglones'),o={};if(!pb)return o;
  B.filas(pb.id).forEach(function(f){
    if(fecha&&f.v['e-fecha']!==fecha)return;
    var sid=f.v['e-suc'];if(!sid)return;
    var p={fila:f,id:f.id,folio:String(f.v['e-folio']||''),fecha:f.v['e-fecha']||'',version:num(f.v['e-ver']),env:String(f.v['e-env']||''),envt:String(f.v['e-envt']||''),
      estado:String(f.v['e-estado']||'Recibido'),tarde:!!f.v['e-tarde'],notas:String(f.v['e-notas']||''),conf:num(f.v['e-conf']),renglones:[]};
    if(rb)B.filas(rb.id).forEach(function(r){if(r.v['l-ped']===f.id)p.renglones.push({fila:r,cod:String(r.v['l-cod']||''),insumo:String(r.v['l-insumo']||''),
      pide:num(r.v['l-pide']),surte:typeof r.v['l-surte']==='number'?r.v['l-surte']:null,nota:String(r.v['l-nota']||'')})});
    /* Si hay dos pedidos de la misma sucursal para la misma fecha, cuenta el más reciente */
    if(!o[sid]||o[sid].envt<p.envt)o[sid]=p;
  });
  return o;
}
function pedidoPorId(id){var pb=bd('pedidos');if(!pb)return null;var f=B.filas(pb.id).filter(function(x){return x.id===id})[0];if(!f)return null;var l=pedidosDe(f.v['e-fecha']);return l[f.v['e-suc']]&&l[f.v['e-suc']].id===id?l[f.v['e-suc']]:null}
/* Las fechas que tienen pedidos (más la siguiente de entrega), de la más nueva a la más vieja */
function fechas(){
  var pb=bd('pedidos'),s={},y=yo();
  if(pb)B.filas(pb.id).forEach(function(f){if(f.v['e-fecha'])s[f.v['e-fecha']]=1});
  s[siguienteEntrega(y&&y.dias)]=1;
  return Object.keys(s).sort().reverse();
}
/* Revisa un pedido que llegó: {ok, motivo, aviso, sucursal, pedido (lo que llegó), anterior, cambios, desconocidos} */
function revisarPedido(p){
  var y=yo(),o=p.obj||{};
  return cargar().then(function(){
    if(!y)return {ok:false,motivo:'Este navegador no es el de un Cedis. Abre el enlace en el dispositivo del Cedis.'};
    if(o.c!==y.id)return {ok:false,motivo:'Este pedido es para otro Cedis.'};
    var c=claveDe(o.s),s=sucursales(true).filter(function(x){return x.id===o.s})[0];
    if(!c||!s)return {ok:false,motivo:'Este pedido no viene de una sucursal tuya o cambió en el camino.'};
    return verificar(c.k,p.cuerpo,p.firma).then(function(ok){
      if(!ok)return {ok:false,motivo:'Este pedido no viene de una sucursal tuya o cambió en el camino.'};
      if(o.kv&&o.kv!==c.kv)return {ok:false,motivo:'Este pedido se firmó con una clave vieja de '+s.nombre+'. Mándale su invitación nueva.'};
      var ant=null,pb=bd('pedidos');
      if(pb)B.filas(pb.id).forEach(function(f){if(f.v['e-suc']===o.s&&f.v['e-folio']===o.o)ant=f});
      var vAnt=ant?num(ant.v['e-ver']):0;
      if(ant&&o.v<=vAnt)return {ok:false,viejo:true,motivo:o.v===vAnt?'Este pedido ya está en tus pedidos (versión '+o.v+').':'Ya tienes una versión más nueva de este pedido (la '+vAnt+'). Este enlace es la versión '+o.v+'.'};
      var ins={};insumos(true).forEach(function(x){ins[x.codigo]=x});
      var desconocidos=(o.r||[]).filter(function(r){return !ins[r[0]]}).map(function(r){return r[0]});
      var cambios=[];
      if(ant){
        var antes={};B.filas(bd('renglones').id).forEach(function(r){if(r.v['l-ped']===ant.id)antes[r.v['l-cod']]=num(r.v['l-pide'])});
        var ahora={};(o.r||[]).forEach(function(r){ahora[r[0]]=num(r[1])});
        Object.keys(Object.assign({},antes,ahora)).forEach(function(k){if((antes[k]||0)!==(ahora[k]||0))cambios.push({cod:k,insumo:ins[k]?ins[k].nombre:k,antes:antes[k]||0,ahora:ahora[k]||0})});
      }
      return {ok:true,sucursal:s,pedido:o,anterior:ant,cambios:cambios,desconocidos:desconocidos,tarde:tarde(o.e,y.corte,o.t),
        formatoViejo:!!o.h&&o.h!==formato().h,insumos:ins};
    });
  });
}
/* Agrega (o reemplaza) el pedido revisado en las bases */
function aceptarPedido(r){
  var o=r.pedido,pb=bd('pedidos'),rb=bd('renglones'),ins=r.insumos;
  var fila=r.anterior?B.clonar(r.anterior):B.nuevaFila(pb.id,{});
  fila.v['e-folio']=o.o;fila.v['e-suc']=o.s;fila.v['e-fecha']=o.e;fila.v['e-ver']=o.v;fila.v['e-env']=cuandoTexto(o.t);fila.v['e-envt']=o.t;
  fila.v['e-estado']='Recibido';fila.v['e-tarde']=!!r.tarde;if(o.n)fila.v['e-notas']=String(o.n).slice(0,500);else delete fila.v['e-notas'];
  delete fila.v['e-conf'];
  var quitar=r.anterior?B.filas(rb.id).filter(function(x){return x.v['l-ped']===fila.id}):[];
  return B.guardarFila(fila).then(function(){
    return quitar.reduce(function(p,x){return p.then(function(){return B.borrarFila(x,{historial:false})})},Promise.resolve());
  }).then(function(){
    var l=(o.r||[]).filter(function(x){return num(x[1])>0}).map(function(x,i){
      var f=B.nuevaFila(rb.id,{'l-ped':fila.id,'l-cod':String(x[0]),'l-insumo':ins[x[0]]?ins[x[0]].nombre:'Código '+x[0]+' (ya no está en el formato)','l-pide':num(x[1])});
      f.orden+=i;return f;
    });
    return l.length?B.guardarFilas(l,{historial:false}):null;
  }).then(function(){
    /* La sucursal: su último pedido */
    var sb=bd('sucursales'),sf=sb&&B.filas(sb.id).filter(function(x){return x.id===o.s})[0];
    if(sf){var c=B.clonar(sf);c.v['s-ult']=cuandoTexto(o.t);return B.guardarFila(c,{historial:false})}
  }).then(function(){avisar({tipo:'pedidos'});return fila});
}
/* Confirma lo que surte: surte = {código: cantidad}, notas = {código: texto} */
function confirmar(pid,surte,notas){
  var p=pedidoPorId(pid);if(!p)return Promise.reject(new Error('No se encontró el pedido.'));
  var l=p.renglones.map(function(r){
    var c=B.clonar(r.fila),s=surte&&r.cod in surte?num(surte[r.cod]):r.pide;
    c.v['l-surte']=Math.max(0,s);var n=notas&&notas[r.cod]?String(notas[r.cod]).trim().slice(0,120):'';
    if(n)c.v['l-nota']=n;else delete c.v['l-nota'];return c;
  });
  var f=B.clonar(p.fila);f.v['e-estado']='Confirmado';f.v['e-conf']=(p.conf||0)+1;
  return B.guardarFilas(l).then(function(){return B.guardarFila(f)}).then(function(){avisar({tipo:'pedidos'});return pedidoPorId(pid)});
}
function enlaceConfirmacion(pid){
  var p=pedidoPorId(pid),y=yo();if(!p||!y)return Promise.reject(new Error('No se encontró el pedido.'));
  var sid=p.fila.v['e-suc'],c=claveDe(sid);if(!c)return Promise.reject(new Error('Esa sucursal no tiene clave.'));
  return enlace('con',{c:y.id,s:sid,o:p.folio,v:p.conf||1,pv:p.version,t:new Date().toISOString(),
    r:p.renglones.map(function(r){return [r.cod,r.surte==null?r.pide:r.surte,r.nota||'']})},c.k);
}
function marcarSurtido(pid){
  var p=pedidoPorId(pid);if(!p)return Promise.reject(new Error('No se encontró el pedido.'));
  var f=B.clonar(p.fila);f.v['e-estado']='Surtido';
  return B.guardarFila(f).then(function(){avisar({tipo:'pedidos'})});
}

/* ---------- La sucursal ---------- */
function conexiones(){var c=leer().conexiones;return Object.keys(c).map(function(k){return c[k]})}
function conexion(cid){return leer().conexiones[cid]||null}
/* Una invitación: revisa su firma (con la clave que trae) y la guarda */
function revisarInvitacion(p){
  var o=p.obj||{};
  if(!o.c||!o.s||!o.k||!o.f||!Array.isArray(o.f.l))return Promise.resolve({ok:false,motivo:'La invitación llegó incompleta. Pide que te la vuelvan a mandar.'});
  if(yo()&&yo().id===o.c.i)return Promise.resolve({ok:false,motivo:'Esta invitación es de tu propio Cedis: ábrela en el dispositivo de la sucursal.'});
  return verificar(o.k,p.cuerpo,p.firma).then(function(ok){
    if(!ok)return {ok:false,motivo:'La invitación cambió en el camino. Pide que te la vuelvan a mandar.'};
    var ya=conexion(o.c.i);
    return {ok:true,inv:o,ya:ya,otraSucursal:!!ya&&ya.suc.i!==o.s.i};
  });
}
function conectar(o,doc){
  return cambiar(function(x){
    var ya=x.conexiones[o.c.i]||{};
    var mismo=ya.suc&&ya.suc.i===o.s.i;
    x.conexiones[o.c.i]={cedis:{i:o.c.i,n:String(o.c.n||'Cedis').slice(0,60),co:o.c.co||'18:00',d:Array.isArray(o.c.d)?o.c.d:[1,2,3,4,5,6]},
      suc:{i:o.s.i,n:String(o.s.n||'Sucursal').slice(0,60)},k:o.k,kv:o.kv||1,formato:{h:o.f.h,l:o.f.l},doc:doc||ya.doc||'',
      actual:mismo&&ya.actual?ya.actual:null,historial:mismo&&ya.historial?ya.historial:[],conectada:new Date().toISOString()};
    return x.conexiones[o.c.i];
  },{tipo:'conexion'});
}
function revisarDeCedis(p){
  var o=p.obj||{},cid=typeof o.c==='object'?o.c.i:o.c,cx=conexion(cid);
  if(!cx)return Promise.resolve({ok:false,motivo:'Este navegador no está conectado a ese Cedis. Abre primero su invitación.'});
  if(o.s!==cx.suc.i&&!(o.s&&o.s.i===cx.suc.i))return Promise.resolve({ok:false,motivo:'Este enlace es para otra sucursal.'});
  return verificar(cx.k,p.cuerpo,p.firma).then(function(ok){return ok?{ok:true,cx:cx,obj:o}:{ok:false,motivo:'Este enlace no viene de tu Cedis o cambió en el camino.'}});
}
function aplicarFormato(o){
  return cambiar(function(x){var c=x.conexiones[o.c.i];if(!c)return;c.formato={h:o.f.h,l:o.f.l};c.cedis.n=String(o.c.n||c.cedis.n).slice(0,60);c.cedis.co=o.c.co||c.cedis.co;if(Array.isArray(o.c.d))c.cedis.d=o.c.d;return c},{tipo:'formato'});
}
/* La confirmación del Cedis: va al pedido actual o al del historial con ese folio */
function aplicarConfirmacion(cid,o){
  return cambiar(function(x){
    var c=x.conexiones[cid];if(!c)return {ok:false};
    var p=c.actual&&c.actual.folio===o.o?c.actual:(c.historial||[]).filter(function(h){return h.folio===o.o})[0];
    if(!p)return {ok:false,motivo:'No encuentro el pedido '+o.o+' en este navegador.'};
    if(p.conf&&p.conf.v>=o.v)return {ok:false,viejo:true,motivo:'Ya tienes esta confirmación (o una más nueva).'};
    p.conf={v:o.v,pv:o.pv,t:o.t,r:o.r};
    return {ok:true,pedido:p};
  },{tipo:'confirmacion'});
}
/* El pedido en curso de una conexión (lo crea con el folio que sigue y la siguiente fecha de entrega) */
function pedidoActual(cid){
  var c=conexion(cid);if(!c)return null;
  if(c.actual)return c.actual;
  return cambiar(function(x){
    var cc=x.conexiones[cid];
    cc.actual={folio:AT.folio?AT.folio('P'):'P-'+Date.now().toString(36),fecha:siguienteEntrega(cc.cedis.d),q:{},notas:'',enviado:null,conf:null};
    return cc.actual;
  },{tipo:'pedido'});
}
function cambiarPedido(cid,fn){
  return cambiar(function(x){var c=x.conexiones[cid];if(!c||!c.actual)return null;fn(c.actual,c);return c.actual},{tipo:'pedido'});
}
/* Lo que importa de un pedido para saber si cambió desde que se envió */
function huellaPedido(a){var q={};Object.keys(a.q||{}).sort().forEach(function(k){if(num(a.q[k])>0)q[k]=num(a.q[k])});return huella(JSON.stringify([a.fecha,a.notas||'',q]))}
/* Firma el pedido (con la versión que sigue) */
function enlacePedido(cid){
  var c=conexion(cid),a=c&&c.actual;if(!a)return Promise.reject(new Error('No hay pedido.'));
  var v=(a.enviado&&a.enviado.v||0)+1,t=new Date().toISOString();
  var r=c.formato.l.filter(function(i){return num(a.q[i[0]])>0}).map(function(i){return [i[0],num(a.q[i[0]])]});
  return enlace('ped',{c:c.cedis.i,s:c.suc.i,kv:c.kv,o:a.folio,v:v,e:a.fecha,n:a.notas||'',h:c.formato.h,t:t,r:r},c.k).then(function(res){
    cambiarPedido(cid,function(p){p.enviado={v:v,t:t,huella:huellaPedido(p),n:r.length}});
    return res;
  });
}
/* Empieza un pedido nuevo: el actual pasa al historial (los últimos 30) */
function nuevoPedido(cid){
  return cambiar(function(x){
    var c=x.conexiones[cid];if(!c)return;
    if(c.actual)c.historial=[c.actual].concat(c.historial||[]).slice(0,30);
    c.actual={folio:AT.folio?AT.folio('P'):'P-'+Date.now().toString(36),fecha:siguienteEntrega(c.cedis.d),q:{},notas:'',enviado:null,conf:null};
    return c.actual;
  },{tipo:'pedido'});
}
function desconectar(cid){return cambiar(function(x){delete x.conexiones[cid]},{tipo:'conexion'})}

AT.cedis={ROLES:ROLES,CATS:CATS,ESTADOS:ESTADOS,EJEMPLO_INSUMOS:EJEMPLO_INSUMOS,leer:leer,cambiar:cambiar,on:on,
  semilla:semilla,asegurar:asegurar,cargar:cargar,ids:function(){return IDS},insumos:insumos,sucursales:sucursales,formato:formato,
  yo:yo,asegurarYo:asegurarYo,ajustarYo:ajustarYo,claveDe:claveDe,invitacion:invitacion,cambiarClave:cambiarClave,enlaceFormato:enlaceFormato,
  pedidosDe:pedidosDe,pedidoPorId:pedidoPorId,fechas:fechas,revisarPedido:revisarPedido,aceptarPedido:aceptarPedido,
  confirmar:confirmar,enlaceConfirmacion:enlaceConfirmacion,marcarSurtido:marcarSurtido,
  conexiones:conexiones,conexion:conexion,revisarInvitacion:revisarInvitacion,conectar:conectar,revisarDeCedis:revisarDeCedis,
  aplicarFormato:aplicarFormato,aplicarConfirmacion:aplicarConfirmacion,pedidoActual:pedidoActual,cambiarPedido:cambiarPedido,
  huellaPedido:huellaPedido,enlacePedido:enlacePedido,nuevoPedido:nuevoPedido,desconectar:desconectar,
  abrir:abrir,partes:partes,enlace:enlace,archivo:archivo,verificar:verificar,firmar:firmar,codificar:codificar,decodificar:decodificar,
  siguienteEntrega:siguienteEntrega,limite:limite,tarde:tarde,diasTexto:diasTexto,fechaTexto:fechaTexto,horaTexto:horaTexto,cuandoTexto:cuandoTexto,
  DIAS:DIAS,hoy:hoyISO,num:num,sinAcentos:sinAcentos};
})();
