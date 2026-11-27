/* OneBook: sincronización con el servidor de la oficina (servidor/servidor.js). Solo actúa si la página viene de ese
   servidor (<meta name="onebook-servidor">); en GitHub Pages o con file:// no hace nada.
   - Conectar: la primera vez pide la clave de la oficina y el nombre de este dispositivo. Si el servidor está vacío,
     este dispositivo empieza la empresa (o sube lo que tiene); si ya tiene datos, este dispositivo los recibe (lo que
     tuviera aquí se reemplaza, con la opción de descargar antes un respaldo).
   - Cada dispositivo sigue guardando su copia (IndexedDB y localStorage). Lo que cambia aquí se anota en una cola
     (aprende-tecnologia:sincro-cola:<pestaña>) y se sube; lo que cambia en otros dispositivos llega por eventos del
     servidor y se escribe aquí. Sin conexión, la cola espera y se sube al volver. Si dos dispositivos cambian lo mismo,
     gana el cambio más reciente (en las bases, cada fila por separado; las páginas, completas).
   - Se comparten: páginas, plantillas, papelera, bases, filas, historial de las filas, la empresa, el perfil, los folios y
     el Cedis. No se comparten: quién eres en este dispositivo, tus ajustes de lectura ni el historial de versiones.
   - Presencia: este dispositivo anuncia qué páginas tiene abiertas y recibe las de los demás
     (aprende-tecnologia:presencia-remota, que lee AT.datos.presencia); documento.js la usa para que una página no se
     edite en dos dispositivos a la vez.
   - Una sola pestaña sincroniza (Web Locks); las demás anotan su cola y se enteran por el canal de datos.js.
   - Muestra el estado en la barra superior y en «Tus datos». Expone AT.sincro. Se carga después de datos.js. */
(function(){
'use strict';
var AT=window.AT,D=AT.datos,$=AT.$,esc=AT.esc,ico=AT.ico;
var HAY=!!document.querySelector('meta[name="onebook-servidor"]');
var PREF='aprende-tecnologia:',CFG=PREF+'servidor',ESTADO=PREF+'sincro-estado',REMOTA=PREF+'presencia-remota',COLA=PREF+'sincro-cola:';
var LS={empresa:1,perfil:1,folios:1,cedis:1};
var oyentes=[];
function leer(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
function cfg(){var c=leer(CFG);return c&&c.clave&&c.dispositivo?c:null}
function on(fn){oyentes.push(fn)}
function avisarEstado(){var e=estado();oyentes.forEach(function(f){try{f(e)}catch(x){}})}
function estado(){var e=leer(ESTADO)||{};var c=cfg();e.conectado=!!c;e.nombre=c&&c.oficina||'';e.dispositivo=c&&c.nombre||'';return e}
if(!HAY||!D||!D.sincro){AT.sincro={hay:false,conectado:function(){return false},estado:function(){return null},on:function(){}};return}

var setOrig=Storage.prototype.setItem,delOrig=Storage.prototype.removeItem;
function escribir(k,v){try{setOrig.call(localStorage,k,JSON.stringify(v))}catch(e){}}
function ahora(){return new Date().toISOString()}
var TAB=Math.random().toString(36).slice(2,10),aplicando=false;

/* ---------- La cola de cambios (una por pestaña, para no pisarse) ---------- */
function marcar(a,id){
  var k=COLA+TAB,c=leer(k)||{};c[a+'|'+id]=ahora();escribir(k,c);
}
function pendientes(){
  var m={};
  try{for(var i=0;i<localStorage.length;i++){var k=String(localStorage.key(i));if(k.indexOf(COLA)!==0)continue;var c=leer(k)||{};Object.keys(c).forEach(function(x){if(!m[x]||c[x]>m[x])m[x]=c[x]})}}catch(e){}
  return m;
}
function quitarDeCola(lote,p){
  try{
    var ks=[];for(var i=0;i<localStorage.length;i++){var k=String(localStorage.key(i));if(k.indexOf(COLA)===0)ks.push(k)}
    ks.forEach(function(k){var c=leer(k)||{},cambio=false;lote.forEach(function(x){if(c[x]&&c[x]<=p[x]){delete c[x];cambio=true}});if(cambio){if(Object.keys(c).length)escribir(k,c);else delOrig.call(localStorage,k)}});
  }catch(e){}
}
/* Lo que se escribe aquí: los almacenes (datos.js avisa) y las claves compartidas de localStorage */
D.sincro.alCambiar(function(a,ids){if(!cfg())return;ids.forEach(function(id){marcar(a,id)});programarSubida()});
function claveLS(k){return typeof k==='string'&&k.indexOf(PREF)===0&&LS[k.slice(PREF.length)]?k.slice(PREF.length):null}
Storage.prototype.setItem=function(k,v){
  var n=this===localStorage&&!aplicando?claveLS(k):null,antes=n?this.getItem(k):null;
  setOrig.call(this,k,v);
  if(n&&cfg()&&!D.sincro.pausado()&&antes!==String(v)){marcar('ls',n);programarSubida()}
};
Storage.prototype.removeItem=function(k){
  var n=this===localStorage&&!aplicando?claveLS(k):null,antes=n?this.getItem(k):null;
  delOrig.call(this,k);
  if(n&&cfg()&&!D.sincro.pausado()&&antes!==null){marcar('ls',n);programarSubida()}
};

/* ---------- Servidor ---------- */
function pedir(metodo,ruta,cuerpo,clave){
  var c=cfg(),h={'Content-Type':'application/json'};
  if(clave||c)h['X-OneBook-Clave']=clave||c.clave;
  return fetch(ruta,{method:metodo,headers:h,body:cuerpo?JSON.stringify(cuerpo):undefined,cache:'no-store'}).then(function(r){
    if(r.status===401){var e=new Error('La clave de la oficina ya no es válida. Vuelve a conectar este dispositivo.');e.clave=true;throw e}
    if(!r.ok)throw new Error('El servidor respondió '+r.status);
    return r.json();
  });
}
function ponerEstado(p){
  var e=leer(ESTADO)||{};Object.keys(p).forEach(function(k){e[k]=p[k]});
  e.pendientes=Object.keys(pendientes()).length;
  escribir(ESTADO,e);avisarEstado();
}

/* ---------- Subir ---------- */
var subiendo=false,otraVez=false,tSubir=null,lider=false;
function programarSubida(){if(!lider)return;ponerEstado({});clearTimeout(tSubir);tSubir=setTimeout(subir,300)}
function subir(){
  var c=cfg();if(!c||!lider)return Promise.resolve();
  if(subiendo){otraVez=true;return Promise.resolve()}
  var p=pendientes(),keys=Object.keys(p);
  if(!keys.length){ponerEstado({});return Promise.resolve()}
  subiendo=true;otraVez=false;
  var lote=keys.slice(0,400);
  return Promise.all(lote.map(function(k){
    var i=k.indexOf('|'),a=k.slice(0,i),id=k.slice(i+1);
    if(a==='ls'){var v=localStorage.getItem(PREF+id);return {a:a,id:id,d:v,t:p[k]}}
    return D.sincro.leer(a,id).then(function(o){return {a:a,id:id,d:o===undefined?null:o,t:p[k]}});
  })).then(function(cambios){
    return pedir('POST','api/cambios',{dispositivo:c.dispositivo,cambios:cambios});
  }).then(function(r){
    quitarDeCola(lote,p);
    return r.rechazados&&r.rechazados.length?aplicar(r.rechazados):null;
  }).then(function(){
    subiendo=false;ponerEstado({enLinea:true,ultima:ahora(),error:''});
    if(otraVez||keys.length>lote.length)return subir();
  },function(e){
    subiendo=false;ponerEstado({enLinea:false,error:e.message||'Sin conexión con el servidor'});
    if(e.clave)return;
    clearTimeout(tSubir);tSubir=setTimeout(subir,8000);
  });
}

/* ---------- Bajar ---------- */
var bajando=false,otraBajada=false;
function bajar(){
  var c=cfg();if(!c||!lider)return Promise.resolve();
  if(bajando){otraBajada=true;return Promise.resolve()}
  bajando=true;otraBajada=false;
  return pedir('GET','api/cambios?desde='+(c.seq||0)).then(function(r){
    var p=pendientes();
    /* Lo que tengo pendiente de subir no se pisa: al subirlo, el servidor decide quién gana */
    var lista=r.cambios.filter(function(x){return x.por!==c.dispositivo&&!p[x.a+'|'+x.id]});
    return aplicar(lista).then(function(){
      var cc=cfg();if(cc){cc.seq=r.seq;escribir(CFG,cc)}
      bajando=false;ponerEstado({enLinea:true,ultima:ahora(),error:''});
      if(r.mas||otraBajada)return bajar();
    });
  }).catch(function(e){bajando=false;ponerEstado({enLinea:false,error:e.message||'Sin conexión con el servidor'})});
}
/* Escribe lo que llegó: los almacenes con datos.js y las claves de localStorage (avisando a esta pestaña) */
function aplicar(lista){
  var por={};lista.forEach(function(x){(por[x.a]=por[x.a]||[]).push(x)});
  var p=Promise.resolve();
  Object.keys(por).forEach(function(a){
    if(a==='ls'){por[a].forEach(function(x){aplicarLS(x.id,x.d)});return}
    if(!D.sincro.almacenes[a])return;
    var ponen=por[a].filter(function(x){return x.d!=null}).map(function(x){return x.d}),quitan=por[a].filter(function(x){return x.d==null}).map(function(x){return x.id});
    p=p.then(function(){return D.sincro.aplicarRemoto(a,ponen,quitan)});
  });
  return p;
}
function aplicarLS(id,d){
  if(!LS[id])return;
  var k=PREF+id,antes=localStorage.getItem(k),v=d==null?null:String(d);
  /* Folios: se queda el número más alto de cada prefijo (para no repetir folios) */
  if(id==='folios'&&v!=null){
    var a={},b={};try{a=JSON.parse(antes||'{}')||{};b=JSON.parse(v)||{}}catch(e){}
    Object.keys(b).forEach(function(x){if(!(a[x]>=b[x]))a[x]=b[x]});v=JSON.stringify(a);
  }
  if(v===antes)return;
  aplicando=true;
  try{if(v==null)delOrig.call(localStorage,k);else setOrig.call(localStorage,k,v)}catch(e){}
  aplicando=false;
  if(id==='folios'&&d!=null&&v!==String(d))marcar('ls','folios');
  /* Las otras pestañas reciben el evento solas; esta, con uno igual */
  try{window.dispatchEvent(new StorageEvent('storage',{key:k,oldValue:antes,newValue:v,storageArea:localStorage}))}catch(e){}
  if(id==='perfil'&&!antes&&v&&document.body.getAttribute('data-pagina')==='entrar')location.replace('inicio.html');
}

/* ---------- Presencia ---------- */
var tPres=null;
function programarPresencia(){clearTimeout(tPres);tPres=setTimeout(presenciaYa,250)}
function presenciaYa(){
  var c=cfg();if(!c||!lider)return;
  var q=D.yo?D.yo():{};
  pedir('POST','api/presencia',{dispositivo:c.dispositivo,nombre:c.nombre||'',quien:{id:q.id||'',nombre:q.nombre||''},entradas:D.presencia.locales()})
    .then(function(r){guardarRemota(r.presencias)},function(){});
}
function guardarRemota(lista){
  var c=cfg();if(!c)return;
  escribir(REMOTA,{yo:c.dispositivo,lista:Array.isArray(lista)?lista:[],t:Date.now()});
  D.sincro.avisar({almacen:'presencia',remota:true});
}
D.on(function(c){if(c.almacen==='presencia'&&!c.remota&&lider)programarPresencia()});

/* ---------- Arrancar (solo la pestaña que sincroniza) ---------- */
var fuente=null;
function eventos(){
  var c=cfg();if(!c)return;
  if(fuente)try{fuente.close()}catch(e){}
  fuente=new EventSource('api/eventos?clave='+encodeURIComponent(c.clave)+'&dispositivo='+encodeURIComponent(c.dispositivo));
  fuente.addEventListener('hola',function(){ponerEstado({enLinea:true,error:''});bajar().then(subir);presenciaYa()});
  fuente.addEventListener('cambios',function(e){var x={};try{x=JSON.parse(e.data)}catch(er){}if(x.por!==c.dispositivo)bajar()});
  fuente.addEventListener('presencia',function(e){try{guardarRemota(JSON.parse(e.data))}catch(er){}});
  fuente.onerror=function(){
    ponerEstado({enLinea:false});
    /* Si el servidor rechazó la clave, el navegador no vuelve a intentar: se revisa con /api/conectar */
    if(fuente.readyState===2)setTimeout(function(){pedir('POST','api/conectar',{clave:c.clave}).then(function(r){if(!r.ok)ponerEstado({error:'La clave de la oficina cambió. Vuelve a conectar este dispositivo.'});else eventos()},function(){setTimeout(eventos,5000)})},3000);
  };
}
function arrancar(){
  lider=true;
  var c=cfg();
  if(c&&c.inicial){
    /* Recién conectado: trae todo lo del servidor y luego entra */
    pintarCargando();
    return traerTodo().then(function(){
      var cc=cfg();delete cc.inicial;escribir(CFG,cc);
      location.replace(leer(PREF+'perfil')?'inicio.html':'entrar.html');
    },function(e){pintarCargando(e.message)});
  }
  eventos();
  setInterval(function(){bajar().then(subir)},30e3);
  setInterval(presenciaYa,15e3);
  addEventListener('online',function(){ponerEstado({enLinea:true});eventos();bajar().then(subir)});
  addEventListener('offline',function(){ponerEstado({enLinea:false})});
  addEventListener('storage',function(e){if(e.key&&e.key.indexOf(COLA)===0)programarSubida()});
  subir();
}
function traerTodo(){
  var c=cfg();c.seq=0;escribir(CFG,c);
  function paso(){return pedir('GET','api/cambios?desde='+(cfg().seq||0)+'&limite=1000').then(function(r){
    return aplicar(r.cambios).then(function(){var cc=cfg();cc.seq=r.seq;escribir(CFG,cc);pintarCargando(null,r.seq);return r.mas?paso():null});
  })}
  return paso();
}
function comoLider(fn){
  if(navigator.locks&&navigator.locks.request)navigator.locks.request('onebook-sincro',function(){fn();return new Promise(function(){})}).catch(function(){});
  else fn();
}

/* ---------- Conectar este dispositivo ---------- */
function nombreSugerido(){var u=navigator.userAgent||'';return /Android|iPhone|iPad/i.test(u)?'Celular':/Mac/i.test(u)?'Mac':/Windows/i.test(u)?'Computadora':'Este dispositivo'}
function localVacio(){
  return D.documentos.todos().then(function(l){return !l.length&&!leer(PREF+'perfil')}).catch(function(){return true});
}
function guardarCfg(r,clave,nombre,extra){
  var c=Object.assign({clave:clave,dispositivo:'dv-'+Math.random().toString(36).slice(2,10),nombre:nombre,oficina:r.nombre,servidor:r.id,seq:0,conectado:ahora()},extra||{});
  escribir(CFG,c);return c;
}
function dialogo(html){
  var d=document.createElement('dialog');d.className='atajos sx-dlg';d.setAttribute('aria-labelledby','sxT');
  d.innerHTML=html;document.body.appendChild(d);
  d.addEventListener('close',function(){d.remove()});
  d.addEventListener('click',function(e){if(e.target.closest('[data-cerrar]'))d.close()});
  return d;
}
function abrirConectar(){
  if(document.querySelector('dialog.sx-dlg[open]'))return;
  var d=dialogo('<div class="at-h"><h2 id="sxT">Conectar con la oficina</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<form class="pl-form" id="sxForm"><p class="td-p">Este OneBook viene del servidor de tu oficina. Conecta este dispositivo para trabajar con los demás: lo que hagas se guarda en el servidor.</p>'+
    '<label class="campo-l"><span>Clave de la oficina</span><input type="text" name="clave" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-1234"></label>'+
    '<label class="campo-l"><span>Nombre de este dispositivo</span><input type="text" name="nombre" maxlength="40" value="'+esc(nombreSugerido())+'"></label>'+
    '<p class="hint">La clave la tiene quien instaló el servidor: aparece al arrancarlo.</p>'+
    '<p class="td-msg" id="sxMsg" role="status"></p>'+
    '<div class="td-bt"><button class="btn pri" type="submit">Conectar</button><button class="btn" type="button" data-solo>Usar solo en este dispositivo</button></div></form>');
  d.addEventListener('click',function(e){if(e.target.closest('[data-solo]')){try{sessionStorage.setItem('onebook-sin-oficina','1')}catch(x){}d.close();pintarIndicador()}});
  $('#sxForm',d).addEventListener('submit',function(e){
    e.preventDefault();
    var f=e.target,clave=f.clave.value.trim().toUpperCase(),nombre=f.nombre.value.trim()||nombreSugerido(),msg=$('#sxMsg',d),b=f.querySelector('[type="submit"]');
    if(b.getAttribute('aria-disabled')==='true')return;
    b.setAttribute('aria-disabled','true');msg.textContent='Conectando…';
    pedir('POST','api/conectar',{clave:clave},clave).then(function(r){
      b.removeAttribute('aria-disabled');
      if(!r.ok){msg.textContent='La clave no es correcta. Revísala con quien instaló el servidor.';f.clave.focus();return}
      return localVacio().then(function(vacio){elegir(d,r,clave,nombre,vacio)});
    }).catch(function(err){b.removeAttribute('aria-disabled');msg.textContent='No se pudo conectar con el servidor: '+(err&&err.message||'revisa el wifi')+'.'});
  });
  d.showModal();$('[name="clave"]',d).focus();
}
/* Qué hacer con lo de este dispositivo y lo del servidor */
function elegir(d,r,clave,nombre,vacio){
  var cuerpo=$('#sxForm',d);
  function opciones(texto,botones){
    cuerpo.innerHTML='<p class="td-p">'+texto+'</p><div class="td-bt">'+botones+'</div><p class="td-msg" id="sxMsg" role="status"></p>';
    var f=cuerpo.querySelector('button');if(f)f.focus();
  }
  if(r.vacio&&vacio){
    guardarCfg(r,clave,nombre);d.close();
    AT.aviso('Conectado a «'+r.nombre+'». Empieza tu empresa: todo se guardará en el servidor.');
    if(!lider)comoLider(arrancar);
    pintarIndicador();
    if(document.body.getAttribute('data-pagina')!=='entrar')location.replace('entrar.html');
    return;
  }
  if(r.vacio){
    opciones('El servidor de «'+esc(r.nombre)+'» está vacío y este dispositivo ya tiene datos. ¿Qué hacemos?',
      '<button class="btn pri" type="button" data-x="subir">Subir lo de este dispositivo</button><button class="btn danger" type="button" data-x="cero">Empezar de cero (borra lo de este dispositivo)</button><button class="btn" type="button" data-cerrar>Cancelar</button>');
  }else if(vacio){
    guardarCfg(r,clave,nombre,{inicial:true});d.close();location.reload();return;
  }else{
    opciones('El servidor de «'+esc(r.nombre)+'» ya tiene los datos de la oficina y este dispositivo tiene los suyos. Al conectarlo, lo de este dispositivo se reemplaza por lo de la oficina. Si quieres conservarlo, descarga antes un respaldo.',
      '<button class="btn" type="button" data-x="respaldo">Descargar respaldo</button><button class="btn danger" type="button" data-x="reemplazar">Reemplazar y conectar</button><button class="btn" type="button" data-cerrar>Cancelar</button>');
  }
  cuerpo.onclick=function(e){
    var b=e.target.closest('[data-x]');if(!b||b.getAttribute('aria-disabled')==='true')return;
    var x=b.getAttribute('data-x'),msg=$('#sxMsg',d);
    if(x==='respaldo'){D.descargar().then(function(){msg.textContent='Respaldo descargado.'});return}
    b.setAttribute('aria-disabled','true');
    if(x==='subir'){
      var c=guardarCfg(r,clave,nombre);msg.textContent='Subiendo…';
      marcarTodo().then(function(){lider=true;return subirTodo()}).then(function(){escribir(CFG,Object.assign(cfg()||c,{}));location.reload()},function(err){b.removeAttribute('aria-disabled');msg.textContent='No se pudo subir: '+err.message});
    }else{
      /* Empezar de cero o reemplazar: se vacía este dispositivo (sin tocar el servidor) y se vuelve a cargar */
      D.borrarTodo().then(function(){guardarCfg(r,clave,nombre,r.vacio?{}:{inicial:true});location.replace(r.vacio?'entrar.html':'inicio.html')});
    }
  };
}
function marcarTodo(){
  var p=Promise.resolve();
  Object.keys(D.sincro.almacenes).forEach(function(a){p=p.then(function(){return D.sincro.todos(a)}).then(function(l){(l||[]).forEach(function(o){if(o&&o.id)marcar(a,o.id)})})});
  return p.then(function(){Object.keys(LS).forEach(function(n){if(localStorage.getItem(PREF+n)!=null)marcar('ls',n)})});
}
function subirTodo(){return subir().then(function(){if(Object.keys(pendientes()).length)return subirTodo()})}
function desconectar(){
  [CFG,ESTADO,REMOTA].forEach(function(k){delOrig.call(localStorage,k)});
  try{var ks=[];for(var i=0;i<localStorage.length;i++){var k=String(localStorage.key(i));if(k.indexOf(COLA)===0)ks.push(k)}ks.forEach(function(k){delOrig.call(localStorage,k)})}catch(e){}
  location.reload();
}

/* ---------- En la pantalla: el estado en la barra superior y la pantalla de carga ---------- */
function textoEstado(){
  var e=estado();
  if(!e.conectado)return {t:'Sin conectar',c:'sin',l:'Este dispositivo no está conectado al servidor de la oficina. Toca para conectarlo.'};
  if(e.error&&/clave/i.test(e.error))return {t:'Reconectar',c:'mal',l:e.error};
  if(e.enLinea===false)return {t:e.pendientes?'Sin conexión · '+e.pendientes:'Sin conexión',c:'mal',l:'Sin conexión con el servidor de la oficina.'+(e.pendientes?' '+e.pendientes+(e.pendientes===1?' cambio espera':' cambios esperan')+' para subirse.':' Lo que hagas se guarda aquí y se sube al volver.')};
  if(e.pendientes)return {t:'Subiendo '+e.pendientes,c:'sub',l:'Subiendo '+e.pendientes+(e.pendientes===1?' cambio':' cambios')+' al servidor de la oficina.'};
  return {t:'Al día',c:'ok',l:'Conectado a «'+(e.nombre||'la oficina')+'»: todo está al día.'};
}
function pintarIndicador(){
  var bar=$('#topbar');if(!bar)return;
  var b=$('.sx-ind',bar);
  if(!b){
    b=document.createElement('button');b.type='button';b.className='sx-ind';
    var aa=$('#aaBtn',bar);bar.insertBefore(b,aa||null);
    b.addEventListener('click',function(){if(!cfg())abrirConectar();else if(AT.tusDatos)AT.tusDatos.abrir()});
  }
  var x=textoEstado();
  b.className='sx-ind sx-'+x.c;b.setAttribute('aria-label',x.l);b.title=x.l;
  b.innerHTML='<i aria-hidden="true"></i><span>'+esc(x.t)+'</span>';
}
function pintarCargando(error,seq){
  var v=$('#sxCarga');
  if(!v){v=document.createElement('div');v.id='sxCarga';v.className='sx-carga';v.setAttribute('role','status');document.body.appendChild(v)}
  v.innerHTML=error?'<p><b>No se pudieron traer los datos de la oficina.</b> '+esc(error)+'</p><button class="btn" type="button" onclick="location.reload()">Intentar otra vez</button>':
    '<p><b>Trayendo los datos de la oficina…</b>'+(seq?' ('+seq+')':'')+'</p>';
}
window.addEventListener('storage',function(e){if(e.key===ESTADO||e.key===CFG){pintarIndicador();avisarEstado()}});
on(function(){pintarIndicador()});

AT.sincro={hay:true,conectado:function(){return !!cfg()},estado:estado,on:on,conectar:abrirConectar,desconectar:desconectar,
  ahora:function(){return bajar().then(subir)},pendientes:function(){return Object.keys(pendientes()).length},
  presencias:function(){return D.presencia.remotas()},texto:textoEstado};

function iniciar(){
  pintarIndicador();
  if(cfg())comoLider(arrancar);
  else{var no=false;try{no=sessionStorage.getItem('onebook-sin-oficina')==='1'}catch(e){}if(!no)abrirConectar()}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
