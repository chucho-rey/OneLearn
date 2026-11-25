/* OneBook: la empresa (etapa Empresas, E2). Personas, roles y departamentos, guardados en este navegador.
   aprende-tecnologia:empresa = {formato:1, id:'e-…', nombre, giro, telefono, rfc, creado, cambio, auto,
     personas:[{id:'u-…', nombre, correo, rol, deptos:{'dp-…': rol}, pin, creado, cambio, borrado}],
     departamentos:[{id:'dp-…', nombre, color, creado, cambio, borrado}]}
   - Roles de la empresa (ROLES): propietario (uno; quien la creó: hace todo), admin (agrega y quita personas y
     departamentos y da permisos) y miembro. En cada departamento (ROLES_DEP): responsable (administra el departamento
     y a su gente; con las salas, también sus salas), miembro (entra y edita) y consulta (solo ve). Una persona puede
     estar en varios departamentos; la pertenencia vive en la persona (deptos), con su fecha de cambio.
   - Quien usa OneBook ahora es la persona de AT.datos.yo: entrarComo la cambia (pide su PIN si tiene) y lo demás
     (permisos de las páginas, presencia, «modificado por») ya la usa. Si otra pestaña cambia de persona, esta página
     guarda lo pendiente y se vuelve a cargar.
   - Lo que se quita se queda marcado (borrado) para que un respaldo viejo no lo reviva; combinar() junta el respaldo
     de la misma empresa persona por persona y departamento por departamento (gana el cambio más reciente).
   - Un espacio que ya existía (perfil de negocio sin empresa) recibe su empresa sola, con quien usa este navegador
     como propietario (auto: mientras nadie la toque, un respaldo con empresa la reemplaza).
   No es seguridad: sin servidor, quien tiene el navegador tiene los datos; el PIN solo ordena quién entra como quién.
   Con la nube (F9), las cuentas y los permisos por fila harán cumplir esto mismo.
   Expone AT.empresa. */
(function(){
'use strict';
var AT=window.AT;
var PREF='aprende-tecnologia:',CLAVE=PREF+'empresa',CLAVE_YO=PREF+'yo';

var ROLES={
  propietario:{n:3,nombre:'Propietario',desc:'Hace todo. Es quien creó la empresa en OneBook.'},
  admin:{n:2,nombre:'Administrador',desc:'Agrega personas y departamentos y les da permisos.'},
  miembro:{n:1,nombre:'Miembro',desc:'Usa OneBook con los permisos de sus departamentos.'}};
var ROLES_DEP={
  responsable:{n:3,nombre:'Responsable',desc:'Administra el departamento y a su gente.'},
  miembro:{n:2,nombre:'Miembro',desc:'Entra y edita lo del departamento.'},
  consulta:{n:1,nombre:'Consulta',desc:'Solo ve lo del departamento.'}};
var COLORES=[['acento','Verde azulado'],['verde','Verde'],['morado','Morado'],['ambar','Ámbar'],['rojo','Rojo'],['gris','Gris']];
var COLOR={};COLORES.forEach(function(c){COLOR[c[0]]=c[1]});
/* Departamentos que se sugieren al crear la empresa, según el giro */
var SUGERIDOS={
  tienda:['Ventas','Almacén','Compras','Administración'],
  comida:['Cocina','Servicio','Compras','Administración'],
  servicios:['Atención a clientes','Operación','Administración'],
  catalogo:['Ventas','Pedidos y envíos','Compras','Administración'],
  distribucion:['Ventas','Almacén','Reparto','Compras','Administración'],
  otro:['Ventas','Operación','Administración']};
var MAX_PERSONAS=500,MAX_DEPTOS=60;

function ahora(){return new Date().toISOString()}
function idNuevo(p){return p+'-'+Math.random().toString(36).slice(2,10)}
function limpio(v,max){return typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):''}
function esObjeto(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
function correoValido(c){return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(c)}
function fecha(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v)?v:''}
function norma(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()}
function copia(x){return x==null?null:JSON.parse(JSON.stringify(x))}
function idPersona(v){return typeof v==='string'&&/^u-[\w-]{4,40}$/.test(v)}
function idDepto(v){return typeof v==='string'&&/^dp-[\w-]{4,40}$/.test(v)}
/* Huella del PIN (cyrb53 con el id de la persona). No es cifrado: solo evita guardar el PIN a la vista */
function huellaPin(pid,pin){
  var s='onebook-pin:'+pid+':'+pin,h1=0xdeadbeef,h2=0x41c6ce57;
  for(var i=0,ch;i<s.length;i++){ch=s.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909);
  return ('0000000000000'+(4294967296*(2097151&h2)+(h1>>>0)).toString(16)).slice(-14);
}
function pinValido(pin){return /^\d{4,8}$/.test(String(pin||''))}

/* ---------- Forma de los datos (también llegan de respaldos) ---------- */
function limpiarPersona(p){
  if(!esObjeto(p)||!idPersona(p.id))return null;
  var x={id:p.id,nombre:limpio(p.nombre,60),correo:'',rol:ROLES[p.rol]?p.rol:'miembro',deptos:{},
    pin:typeof p.pin==='string'&&/^[0-9a-f]{14}$/.test(p.pin)?p.pin:'',creado:fecha(p.creado)||ahora(),cambio:fecha(p.cambio)||fecha(p.creado)||ahora()};
  var c=limpio(p.correo,254).toLowerCase();if(c&&correoValido(c))x.correo=c;
  if(x.rol==='propietario'&&fecha(p.desde))x.desde=p.desde;
  if(esObjeto(p.deptos))Object.keys(p.deptos).forEach(function(d){if(idDepto(d)&&ROLES_DEP[p.deptos[d]])x.deptos[d]=p.deptos[d]});
  if(p.borrado){x.borrado=true;x.deptos={};x.pin='';if(x.rol==='propietario')x.rol='miembro'}
  return x;
}
function limpiarDepto(d){
  if(!esObjeto(d)||!idDepto(d.id))return null;
  var x={id:d.id,nombre:limpio(d.nombre,40),color:COLOR[d.color]?d.color:'acento',creado:fecha(d.creado)||ahora(),cambio:fecha(d.cambio)||fecha(d.creado)||ahora()};
  if(d.borrado)x.borrado=true;
  else if(!x.nombre)return null;
  return x;
}
function porId(lista,fn){
  var vistos={},r=[];
  (Array.isArray(lista)?lista:[]).forEach(function(x){var l=fn(x);if(l&&!vistos[l.id]){vistos[l.id]=1;r.push(l)}});
  return r;
}
function limpiarEmpresa(e){
  if(!esObjeto(e)||typeof e.id!=='string'||!/^e-[\w-]{4,40}$/.test(e.id))return null;
  var x={formato:1,id:e.id,nombre:limpio(e.nombre,80),giro:limpio(e.giro,20),telefono:limpio(e.telefono,30),
    rfc:limpio(e.rfc,13).toUpperCase().replace(/[^A-ZÑ&0-9]/g,''),creado:fecha(e.creado)||ahora(),cambio:fecha(e.cambio)||fecha(e.creado)||ahora(),
    personas:porId(e.personas,limpiarPersona).slice(0,MAX_PERSONAS*2),departamentos:porId(e.departamentos,limpiarDepto).slice(0,MAX_DEPTOS*2)};
  if(e.auto)x.auto=true;
  /* Nadie pertenece a un departamento que ya no existe */
  var vivos={};x.departamentos.forEach(function(d){if(!d.borrado)vivos[d.id]=1});
  x.personas.forEach(function(p){Object.keys(p.deptos).forEach(function(d){if(!vivos[d])delete p.deptos[d]})});
  /* Exactamente un propietario entre las personas activas: si hay dos (un respaldo con un traspaso), el traspaso más
     reciente (desde); si no hay ninguno, el administrador más antiguo */
  var activas=x.personas.filter(function(p){return !p.borrado}).sort(function(a,b){return a.creado<b.creado?-1:a.creado>b.creado?1:0});
  var props=activas.filter(function(p){return p.rol==='propietario'}).sort(function(a,b){
    var da=a.desde||'',db=b.desde||'';return da>db?-1:da<db?1:a.creado<b.creado?-1:a.creado>b.creado?1:0;
  });
  props.slice(1).forEach(function(p){p.rol='admin';delete p.desde});
  if(!props.length&&activas.length){(activas.filter(function(p){return p.rol==='admin'})[0]||activas[0]).rol='propietario'}
  return x;
}

/* ---------- Leer y guardar ---------- */
var guardada;  // undefined: sin leer; null: no hay empresa
function leerAlmacen(){var e=null;try{e=JSON.parse(localStorage.getItem(CLAVE)||'null')}catch(err){}return limpiarEmpresa(e)}
function leerGuardada(){if(guardada===undefined)guardada=leerAlmacen();return guardada}
function escribir(e){
  try{localStorage.setItem(CLAVE,JSON.stringify(e))}catch(err){return false}
  guardada=e;return true;
}
var oyentes=[];
function avisar(c,deOtra){oyentes.forEach(function(fn){try{fn(c||{},!!deOtra)}catch(err){}})}
/* Cambia la empresa sobre lo último guardado (otra pestaña pudo cambiarla); fn puede lanzar un Error con el motivo */
function cambiar(fn,aviso){
  var e=leerAlmacen();
  if(!e)throw new Error('Todavía no hay una empresa en este navegador.');
  var r=fn(e);
  delete e.auto;
  var l=limpiarEmpresa(e);
  if(!l||!escribir(l))throw new Error('No se pudo guardar en este navegador. Revisa que no esté en modo privado o sin espacio.');
  avisar(aviso||{tipo:'empresa'});
  return r===undefined?null:copia(r);
}

/* ---------- Quién eres ---------- */
function yoId(){return AT.datos&&AT.datos.yoId?AT.datos.yoId():''}
function buscar(e,pid){return e&&pid?e.personas.filter(function(p){return p.id===pid&&!p.borrado})[0]||null:null}
function buscarDepto(e,did){return e&&did?e.departamentos.filter(function(d){return d.id===did&&!d.borrado})[0]||null:null}
function rolDe(pid){var p=buscar(leerGuardada(),pid);return p?p.rol:''}
function esAdmin(pid){var r=rolDe(pid===undefined?yoId():pid);return r==='propietario'||r==='admin'}
function rolEnDepto(did,pid){var p=buscar(leerGuardada(),pid===undefined?yoId():pid);return p&&p.deptos[did]||''}
/* administrar: la empresa (propietario o administrador) o el departamento (además, su responsable);
   editar: miembro o más; ver: cualquier rol en el departamento (o administrar la empresa) */
function puedeDepto(did,que,pid){
  if(pid===undefined)pid=yoId();
  if(!buscarDepto(leerGuardada(),did))return false;
  if(esAdmin(pid))return true;
  var n=(ROLES_DEP[rolEnDepto(did,pid)]||{n:0}).n;
  return que==='administrar'?n>=3:que==='editar'?n>=2:n>=1;
}
function exigirAdmin(){if(!esAdmin())throw new Error('Solo quien administra la empresa puede hacer eso.')}
function exigirDepto(did){
  if(!buscarDepto(leerGuardada(),did))throw new Error('Ese departamento ya no existe.');
  if(!puedeDepto(did,'administrar'))throw new Error('Solo quien administra la empresa o es responsable del departamento puede hacer eso.');
}
function ordenPersonas(a,b){
  var r=ROLES[b.rol].n-ROLES[a.rol].n;if(r)return r;
  return (a.nombre||'').localeCompare(b.nombre||'','es',{sensitivity:'base'});
}
function nombreLibre(e,nombre,salvo){
  var n=norma(nombre);
  return !e.departamentos.some(function(d){return !d.borrado&&d.id!==salvo&&norma(d.nombre)===n});
}
function validarNombre(nombre,que){
  var n=limpio(nombre,que==='depto'?40:60);
  if(!n)throw new Error(que==='depto'?'Escribe el nombre del departamento.':'Escribe el nombre de la persona.');
  return n;
}
function validarCorreo(c){
  var k=limpio(String(c||''),254).toLowerCase();
  if(k&&!correoValido(k))throw new Error('Ese correo no parece válido.');
  return k;
}

/* ---------- Crear ---------- */
/* d = {nombre, giro, telefono, tuNombre, tuCorreo, departamentos:[nombres]}. Quien usa este navegador es el propietario. */
function crear(d,op){
  d=d||{};
  var y=AT.datos&&AT.datos.yo?AT.datos.yo():{id:idNuevo('u'),nombre:'',correo:''},t=ahora();
  var e={formato:1,id:idNuevo('e'),nombre:limpio(d.nombre,80),giro:limpio(d.giro,20),telefono:limpio(d.telefono,30),rfc:'',creado:t,cambio:t,
    personas:[{id:y.id,nombre:limpio(d.tuNombre,60)||y.nombre||'',correo:validarCorreo(d.tuCorreo==null?y.correo:d.tuCorreo),rol:'propietario',deptos:{},pin:'',creado:t,cambio:t}],
    departamentos:[]};
  var vistos={};
  (Array.isArray(d.departamentos)?d.departamentos:[]).forEach(function(n){
    n=limpio(n,40);if(!n||vistos[norma(n)]||e.departamentos.length>=MAX_DEPTOS)return;
    vistos[norma(n)]=1;
    e.departamentos.push({id:idNuevo('dp'),nombre:n,color:COLORES[e.departamentos.length%COLORES.length][0],creado:t,cambio:t});
  });
  /* Quien crea la empresa es responsable de sus departamentos */
  e.departamentos.forEach(function(x){e.personas[0].deptos[x.id]='responsable'});
  if(op&&op.auto)e.auto=true;
  var l=limpiarEmpresa(e);
  if(!escribir(l))throw new Error('No se pudo guardar tu empresa en este navegador. Revisa que no esté en modo privado o sin espacio.');
  avisar({tipo:'empresa',creada:true});
  return copia(l);
}
/* Un espacio de negocio que ya existía recibe su empresa (una sola vez) */
function asegurar(){
  if(leerGuardada())return;
  var p=AT.perfil&&AT.perfil.actual&&AT.perfil.actual();
  if(!p||!AT.datos||!AT.datos.yo)return;
  var n=p.negocio||{};
  try{crear({nombre:n.nombre||'',giro:n.giro||'',telefono:n.telefono||'',tuNombre:p.nombre||''},{auto:true})}catch(err){}
}
/* Mientras nadie toque la empresa automática (una sola persona, sin departamentos), un respaldo puede reemplazarla */
function sinTocar(e){return !!e&&e.auto&&e.departamentos.length===0&&e.personas.length===1}

/* Los datos de la empresa también son los del espacio (perfil.negocio): se guardan en los dos */
function cambiarDatos(c){
  exigirAdmin();
  var r=cambiar(function(e){
    if(c.nombre!=null){var n=limpio(c.nombre,80);if(!n)throw new Error('Escribe el nombre de la empresa.');e.nombre=n}
    if(c.giro!=null)e.giro=limpio(c.giro,20);
    if(c.telefono!=null)e.telefono=limpio(c.telefono,30);
    if(c.rfc!=null){var rfc=limpio(c.rfc,13).toUpperCase();if(rfc&&!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc))throw new Error('Ese RFC no parece válido (12 o 13 letras y números).');e.rfc=rfc}
    e.cambio=ahora();
    return e;
  });
  var P=AT.perfil,p=P&&P.actual&&P.actual();
  if(p&&p.negocio)P.guardar(Object.assign({},p,{negocio:{nombre:r.nombre,giro:r.giro||p.negocio.giro,telefono:r.telefono}}));
  return r;
}

/* ---------- Personas ---------- */
function agregarPersona(d){
  exigirAdmin();
  d=d||{};
  var nombre=validarNombre(d.nombre),correo=validarCorreo(d.correo),rol=d.rol==='admin'?'admin':'miembro';
  if(d.pin&&!pinValido(d.pin))throw new Error('El PIN lleva de 4 a 8 números.');
  return cambiar(function(e){
    var activas=e.personas.filter(function(p){return !p.borrado});
    if(activas.length>=MAX_PERSONAS)throw new Error('Una empresa puede tener hasta '+MAX_PERSONAS+' personas.');
    if(correo&&activas.some(function(p){return p.correo===correo}))throw new Error('Ya hay alguien con ese correo en la empresa.');
    var t=ahora(),p={id:idNuevo('u'),nombre:nombre,correo:correo,rol:rol,deptos:{},pin:'',creado:t,cambio:t};
    if(d.pin)p.pin=huellaPin(p.id,String(d.pin));
    if(esObjeto(d.deptos))Object.keys(d.deptos).forEach(function(k){if(buscarDepto(e,k)&&ROLES_DEP[d.deptos[k]])p.deptos[k]=d.deptos[k]});
    e.personas.push(p);
    return p;
  },{tipo:'persona',accion:'agregar'});
}
/* c = {nombre, correo, rol}. Tu nombre y tu correo los cambias tú; lo demás, quien administra */
function cambiarPersona(pid,c){
  c=c||{};
  var propia=pid===yoId();
  if(!propia||c.rol!=null)exigirAdmin();
  var nombre=c.nombre!=null?validarNombre(c.nombre):null,correo=c.correo!=null?validarCorreo(c.correo):null;
  return cambiar(function(e){
    var p=buscar(e,pid);
    if(!p)throw new Error('Esa persona ya no está en la empresa.');
    if(nombre!=null)p.nombre=nombre;
    if(correo!=null){
      if(correo&&e.personas.some(function(x){return !x.borrado&&x.id!==pid&&x.correo===correo}))throw new Error('Ya hay alguien con ese correo en la empresa.');
      p.correo=correo;
    }
    if(c.rol!=null){
      if(p.rol==='propietario')throw new Error('El rol del propietario no se cambia; primero haz propietario a otra persona.');
      if(c.rol!=='admin'&&c.rol!=='miembro')throw new Error('Ese rol no existe.');
      p.rol=c.rol;
    }
    p.cambio=ahora();
    return p;
  },{tipo:'persona',accion:'cambiar',id:pid});
}
function quitarPersona(pid){
  exigirAdmin();
  if(pid===yoId())throw new Error('No puedes quitarte a ti. Pídeselo a otra persona que administre la empresa.');
  return cambiar(function(e){
    var p=buscar(e,pid);
    if(!p)throw new Error('Esa persona ya no está en la empresa.');
    if(p.rol==='propietario')throw new Error('Al propietario no se le puede quitar.');
    p.borrado=true;p.deptos={};p.pin='';p.cambio=ahora();
    return p;
  },{tipo:'persona',accion:'quitar',id:pid});
}
/* Solo el propietario: la otra persona pasa a ser propietaria y él, administrador */
function hacerPropietario(pid){
  if(rolDe(yoId())!=='propietario')throw new Error('Solo el propietario puede pasar la empresa a otra persona.');
  return cambiar(function(e){
    var p=buscar(e,pid),yo=buscar(e,yoId());
    if(!p||!yo)throw new Error('Esa persona ya no está en la empresa.');
    if(p===yo)return p;
    var t=ahora();
    yo.rol='admin';yo.cambio=t;delete yo.desde;p.rol='propietario';p.cambio=t;p.desde=t;
    return p;
  },{tipo:'persona',accion:'propietario',id:pid});
}
/* Tu PIN lo pones o lo quitas tú; quien administra también puede poner o quitar el de otra persona (no el del propietario) */
function exigirPin(pid){
  if(pid===yoId())return;
  exigirAdmin();
  if(rolDe(pid)==='propietario')throw new Error('Solo el propietario cambia su PIN.');
}
function ponerPin(pid,pin){
  exigirPin(pid);
  if(!pinValido(pin))throw new Error('El PIN lleva de 4 a 8 números.');
  return cambiar(function(e){
    var p=buscar(e,pid);if(!p)throw new Error('Esa persona ya no está en la empresa.');
    p.pin=huellaPin(p.id,String(pin));p.cambio=ahora();return p;
  },{tipo:'persona',accion:'pin',id:pid});
}
function quitarPin(pid){
  exigirPin(pid);
  return cambiar(function(e){
    var p=buscar(e,pid);if(!p)throw new Error('Esa persona ya no está en la empresa.');
    p.pin='';p.cambio=ahora();return p;
  },{tipo:'persona',accion:'pin',id:pid});
}
function tienePin(pid){var p=buscar(leerGuardada(),pid);return !!(p&&p.pin)}
/* Entrar como otra persona en este navegador. Devuelve false si el PIN no coincide */
function entrarComo(pid,pin){
  var e=leerAlmacen(),p=buscar(e,pid);
  if(!p)throw new Error('Esa persona ya no está en la empresa.');
  if(p.pin&&huellaPin(p.id,String(pin||''))!==p.pin)return false;
  if(!AT.datos||!AT.datos.ponerYo)throw new Error('No se pudo cambiar de persona en esta página.');
  AT.datos.ponerYo({id:p.id,nombre:p.nombre,correo:p.correo});
  avisar({tipo:'persona',accion:'entrar',id:p.id});
  return true;
}

/* ---------- Departamentos ---------- */
function agregarDepto(d){
  exigirAdmin();
  d=d||{};
  var nombre=validarNombre(d.nombre,'depto');
  return cambiar(function(e){
    if(e.departamentos.filter(function(x){return !x.borrado}).length>=MAX_DEPTOS)throw new Error('Una empresa puede tener hasta '+MAX_DEPTOS+' departamentos.');
    if(!nombreLibre(e,nombre))throw new Error('Ya hay un departamento con ese nombre.');
    var t=ahora(),usados=e.departamentos.filter(function(x){return !x.borrado}).length;
    var x={id:idNuevo('dp'),nombre:nombre,color:COLOR[d.color]?d.color:COLORES[usados%COLORES.length][0],creado:t,cambio:t};
    e.departamentos.push(x);
    if(esObjeto(d.personas))Object.keys(d.personas).forEach(function(pid){
      var p=buscar(e,pid);if(p&&ROLES_DEP[d.personas[pid]]){p.deptos[x.id]=d.personas[pid];p.cambio=t}
    });
    return x;
  },{tipo:'depto',accion:'agregar'});
}
/* Renombrar un departamento cambia su nombre en las bases que lo usan (la columna Departamento de Empleados) */
var trabajo=Promise.resolve();
function renombrarEnBases(antes,nombre){
  if(!AT.datos||!AT.datos.bases||!AT.datos.filas)return Promise.resolve(0);
  return AT.datos.bases.todos().then(function(bs){
    var n=0;
    return Promise.all(bs.map(function(b){
      var cols=(b.columnas||[]).filter(function(c){return c.origen==='departamentos'}).map(function(c){return c.id});
      if(!cols.length)return null;
      return AT.datos.filas.deBase(b.id).then(function(fs){
        var l=fs.filter(function(f){return f.v&&cols.some(function(c){return f.v[c]===antes})});
        l.forEach(function(f){cols.forEach(function(c){if(f.v[c]===antes)f.v[c]=nombre})});
        n+=l.length;
        return l.length?AT.datos.filas.guardarVarias(l):null;
      });
    })).then(function(){return n});
  });
}
/* c = {nombre, color}. Devuelve el departamento; si cambió de nombre, el aviso lleva el de antes */
function cambiarDepto(did,c){
  exigirDepto(did);
  c=c||{};
  var nombre=c.nombre!=null?validarNombre(c.nombre,'depto'):null,antes='';
  var r=cambiar(function(e){
    var x=buscarDepto(e,did);
    if(nombre!=null&&nombre!==x.nombre){
      if(!nombreLibre(e,nombre,did))throw new Error('Ya hay un departamento con ese nombre.');
      antes=x.nombre;x.nombre=nombre;
    }
    if(c.color!=null&&COLOR[c.color])x.color=c.color;
    x.cambio=ahora();
    return x;
  },{tipo:'depto',accion:'cambiar',id:did});
  if(antes){
    trabajo=trabajo.then(function(){return renombrarEnBases(antes,r.nombre)}).catch(function(){});
    avisar({tipo:'depto',accion:'renombrar',id:did,antes:antes,nombre:r.nombre});
  }
  return r;
}
function quitarDepto(did){
  exigirAdmin();
  return cambiar(function(e){
    var x=buscarDepto(e,did);
    if(!x)throw new Error('Ese departamento ya no existe.');
    var t=ahora();
    x.borrado=true;x.cambio=t;
    e.personas.forEach(function(p){if(p.deptos[did]){delete p.deptos[did];p.cambio=t}});
    return x;
  },{tipo:'depto',accion:'quitar',id:did});
}
/* rol: responsable, miembro o consulta; '' lo saca del departamento */
function ponerEnDepto(did,pid,rol){
  exigirDepto(did);
  if(rol&&!ROLES_DEP[rol])throw new Error('Ese rol no existe.');
  return cambiar(function(e){
    var p=buscar(e,pid);
    if(!p)throw new Error('Esa persona ya no está en la empresa.');
    if(rol)p.deptos[did]=rol;else delete p.deptos[did];
    p.cambio=ahora();
    return p;
  },{tipo:'depto',accion:'personas',id:did});
}

/* ---------- Leer ---------- */
function personas(op){
  var e=leerGuardada();if(!e)return [];
  return copia(e.personas.filter(function(p){return op&&op.todas||!p.borrado}).sort(ordenPersonas));
}
function departamentos(){
  var e=leerGuardada();if(!e)return [];
  return copia(e.departamentos.filter(function(d){return !d.borrado}).sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'})}));
}
function miembros(did){
  var e=leerGuardada();if(!e)return [];
  return copia(e.personas.filter(function(p){return !p.borrado&&p.deptos[did]}).sort(function(a,b){
    var r=ROLES_DEP[b.deptos[did]].n-ROLES_DEP[a.deptos[did]].n;return r||ordenPersonas(a,b);
  })).map(function(p){return {persona:p,rol:p.deptos[did]}});
}
function deptosDe(pid){
  var e=leerGuardada(),p=buscar(e,pid===undefined?yoId():pid);if(!p)return [];
  return departamentos().filter(function(d){return p.deptos[d.id]}).map(function(d){return {depto:d,rol:p.deptos[d.id]}});
}

/* ---------- Respaldos ---------- */
/* Junta la empresa de un respaldo con la de aquí. op.yoAntes: el id de quien usaba este navegador antes de
   importar (si el respaldo cambió quién eres). Devuelve 'nueva', 'combinada', 'otra' (de otra empresa: no se junta)
   o '' (nada que hacer). */
function combinar(entrante,op){
  op=op||{};
  var ent=limpiarEmpresa(entrante),loc=leerAlmacen(),y=yoId();
  if(!ent){
    /* Sin empresa en el respaldo: si cambió quién eres y la empresa de aquí es la automática, es tuya */
    if(loc&&sinTocar(loc)&&op.yoAntes&&y&&op.yoAntes!==y&&loc.personas[0].id===op.yoAntes){
      loc.personas[0].id=y;escribir(limpiarEmpresa(loc));avisar({tipo:'empresa'},false);
    }
    return '';
  }
  /* La empresa del respaldo entra si aquí no hay, o si la de aquí es la automática y tú estás en la del respaldo;
     otra empresa no se junta con la tuya */
  if(!loc||(loc.id!==ent.id&&sinTocar(loc)&&buscar(ent,y))){
    escribir(ent);avisar({tipo:'empresa',creada:true});
    return 'nueva';
  }
  if(loc.id!==ent.id)return 'otra';
  function juntar(a,b){
    var m={},orden=[];
    a.forEach(function(x){m[x.id]=x;orden.push(x.id)});
    b.forEach(function(x){if(!m[x.id]){orden.push(x.id);m[x.id]=x}else if(x.cambio>m[x.id].cambio)m[x.id]=x});
    return orden.map(function(k){return m[k]});
  }
  var r=JSON.parse(JSON.stringify(loc));
  if(ent.cambio>loc.cambio)['nombre','giro','telefono','rfc','cambio'].forEach(function(k){r[k]=ent[k]});
  r.personas=juntar(loc.personas,ent.personas);
  r.departamentos=juntar(loc.departamentos,ent.departamentos);
  var l=limpiarEmpresa(r);
  if(JSON.stringify(l)===JSON.stringify(loc))return '';
  escribir(l);avisar({tipo:'empresa'});
  return 'combinada';
}

/* ---------- Otras pestañas ---------- */
var recargando=false;
window.addEventListener('storage',function(ev){
  if(ev.key===CLAVE){guardada=undefined;avisar({tipo:'empresa'},true)}
  else if(ev.key===CLAVE_YO){
    /* Otra pestaña cambió de persona: esta guarda lo pendiente y se vuelve a cargar con la persona nueva */
    var antes=null,despues=null;
    try{antes=JSON.parse(ev.oldValue||'null');despues=JSON.parse(ev.newValue||'null')}catch(err){}
    if(!antes||!despues||antes.id===despues.id||recargando)return;
    recargando=true;
    var g=AT.docGuardarYa?Promise.resolve().then(function(){return AT.docGuardarYa()}).catch(function(){}):Promise.resolve();
    g.then(function(){location.reload()});
  }
});

AT.empresa={
  ROLES:ROLES,ROLES_DEP:ROLES_DEP,COLORES:COLORES,
  existe:function(){return !!leerGuardada()},
  /* La empresa que se creó sola para un espacio de antes, mientras nadie la toque */
  automatica:function(){return sinTocar(leerGuardada())},
  leer:function(){return copia(leerGuardada())},
  /* La persona que usa OneBook ahora (null si no está en la empresa) */
  activa:function(){return copia(buscar(leerGuardada(),yoId()))},
  persona:function(pid){return copia(buscar(leerGuardada(),pid))},
  personas:personas,
  rol:function(pid){return rolDe(pid===undefined?yoId():pid)},
  esAdmin:esAdmin,
  departamentos:departamentos,
  departamento:function(did){return copia(buscarDepto(leerGuardada(),did))},
  miembros:miembros,
  deptosDe:deptosDe,
  rolEnDepto:rolEnDepto,
  puedeDepto:puedeDepto,
  sugeridos:function(giro,conRh){
    var l=(SUGERIDOS[giro]||SUGERIDOS.otro).slice();
    if(conRh&&l.indexOf('Recursos humanos')<0)l.splice(Math.max(0,l.length-1),0,'Recursos humanos');
    return l;
  },
  nombreColor:function(c){return COLOR[c]||''},
  crear:crear,
  asegurar:asegurar,
  cambiarDatos:cambiarDatos,
  agregarPersona:agregarPersona,
  cambiarPersona:cambiarPersona,
  quitarPersona:quitarPersona,
  hacerPropietario:hacerPropietario,
  ponerPin:ponerPin,
  quitarPin:quitarPin,
  tienePin:tienePin,
  entrarComo:entrarComo,
  agregarDepto:agregarDepto,
  cambiarDepto:cambiarDepto,
  quitarDepto:quitarDepto,
  ponerEnDepto:ponerEnDepto,
  combinar:combinar,
  /* Termina lo que quedó en curso (renombrar un departamento en las bases) */
  esperar:function(){return trabajo},
  /* fn({tipo:'empresa'|'persona'|'depto', accion, id, antes, nombre}, deOtraPestana) */
  on:function(fn){oyentes.push(fn)}
};
asegurar();
})();
