/* OneBook: el explorador de tus páginas, en el Inicio (sección «Tus páginas»). Como un explorador de archivos, con
   el estilo de OneBook:
   - Ubicaciones a la izquierda: todas tus páginas, favoritas, recientes (7 días), compartidas, compartidas contigo y
     solicitudes (las dos últimas solo si hay), por tipo (negocio, recursos humanos y otras) y la papelera. Las páginas
     de estudio (que se separaron de OneBook) no salen en ninguna, solo en «De estudio», si quedan. En una pantalla
     angosta van en una fila que se desliza.
   - Columnas: nombre, modificado (y por quién), tipo, trabajando ahora (quién la tiene abierta y si edita o lee),
     permisos (tu permiso, quiénes tienen acceso y las solicitudes; abre «Personas y permisos») y tamaño. Se ordenan
     con su encabezado y se esconden con «Columnas». Vista de detalles o de tarjetas.
   - Buscar, seleccionar (casilla, clic, Ctrl o Mayús + clic, espacio, Ctrl + A) y, con algo seleccionado, abrir,
     favorita o mandar a la papelera. Menú de cada página («⋯», clic derecho o Mayús + F10): abrir, abrir en otra
     pestaña, favorita, personas y permisos, historial de versiones, duplicar y papelera.
   - Teclado: flechas arriba y abajo entre páginas (el foco se queda en la misma columna), Inicio y Fin, Enter abre.
   inicio.js le pasa las páginas con AT.explorador.datos(docs, {vacio}); lo demás lo lee de AT.datos (permisos y
   presencia). Lo que eliges (ubicación, orden, vista y columnas) se recuerda en aprende-tecnologia:explorador. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,D=AT.datos,A=D&&D.acceso;
var raiz=$('#xp');if(!raiz||!D)return;
var CLAVE='aprende-tecnologia:explorador';
var COLS=[{k:'mod',t:'Modificado',orden:'modificado'},{k:'tipo',t:'Tipo',orden:'tipo'},{k:'ahora',t:'Trabajando ahora'},
  {k:'perm',t:'Permisos',orden:'permisos'},{k:'tam',t:'Tamaño',orden:'tamano'}];
var CATS=[['negocio','Negocio','caja'],['rh','Recursos humanos','users'],['general','Otras','notas'],['estudio','De estudio (solo lectura)','libreta']];
var DIA=864e5;
function sinAcentos(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function leerEst(){
  var x={};try{x=JSON.parse(localStorage.getItem(CLAVE)||'{}')||{}}catch(e){}
  return {ubic:typeof x.ubic==='string'?x.ubic:'todas',orden:x.orden&&typeof x.orden.col==='string'?{col:x.orden.col,dir:x.orden.dir===1?1:-1}:{col:'modificado',dir:-1},
    vista:x.vista==='tarjetas'?'tarjetas':'detalles',ocultas:Array.isArray(x.ocultas)?x.ocultas.filter(function(k){return typeof k==='string'}):[]};
}
var est=leerEst(),docs=[],lista=[],sel={},q='',activo='',vacio='',enPapelera=0;
function guardarEst(){try{localStorage.setItem(CLAVE,JSON.stringify(est))}catch(e){}}
function visible(k){return est.ocultas.indexOf(k)<0}

/* ---------- Lo que se sabe de cada página ---------- */
function info(d){
  var deEstudio=!!(D.deEstudio&&D.deEstudio(d));
  var t=deEstudio?{nombre:'Página de estudio',icono:'libreta',cat:'estudio'}:AT.tiposDoc&&AT.tiposDoc[d.tipo]||{nombre:'Documento',icono:'page',cat:'general'};
  var tam=0;try{tam=JSON.stringify(d).length}catch(e){}
  var admin=A?A.puede(d,'compartir'):true;
  return {d:d,id:d.id,titulo:d.titulo||'Sin título',tipo:t,cat:CATS.some(function(c){return c[0]===t.cat})?t.cat:'general',
    rol:A?A.rol(d):'dueno',gente:A?A.personas(d):[],pend:admin&&A?A.pendientes(d):[],admin:admin,editar:A?A.puede(d,'editar'):true,
    tam:tam,editado:d.editado||d.creado||''};
}
/* Las páginas de estudio solo salen en «De estudio» */
var UBIC=[
  {k:'todas',t:'Todas tus páginas',i:'notas',f:function(x){return x.cat!=='estudio'}},
  {k:'favoritas',t:'Favoritas',i:'estrella',f:function(x){return x.cat!=='estudio'&&!!x.d.favorito}},
  {k:'recientes',t:'Recientes',i:'historial',f:function(x){return x.cat!=='estudio'&&Date.now()-Date.parse(x.editado)<7*DIA}},
  {k:'compartidas',t:'Compartidas',i:'users',f:function(x){return x.cat!=='estudio'&&x.gente.length>1}},
  {k:'contigo',t:'Compartidas contigo',i:'enlace',f:function(x){return x.cat!=='estudio'&&x.rol!=='dueno'},siHay:true},
  {k:'solicitudes',t:'Solicitudes',i:'aviso',f:function(x){return x.cat!=='estudio'&&x.pend.length>0},siHay:true}
];
function ubicDe(k){
  var u=UBIC.filter(function(x){return x.k===k})[0];
  if(u)return u;
  var c=/^cat:(\w+)$/.exec(k),cc=c&&CATS.filter(function(x){return x[0]===c[1]})[0];
  return cc?{k:k,t:cc[1],i:cc[2],f:function(x){return x.cat===cc[0]}}:UBIC[0];
}

/* ---------- Formatos ---------- */
function fecha(t){
  if(!t)return {corto:'—',largo:''};
  var d=new Date(t),h=new Date();h.setHours(0,0,0,0);
  var x=new Date(d);x.setHours(0,0,0,0);
  var n=Math.round((h-x)/DIA),hora=d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'});
  var corto=n===0?'Hoy, '+hora:n===1?'Ayer, '+hora:d.getFullYear()===h.getFullYear()?d.toLocaleDateString('es-MX',{day:'numeric',month:'short'})+', '+hora:
    d.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
  return {corto:corto,largo:d.toLocaleString('es-MX',{dateStyle:'full',timeStyle:'short'})};
}
function tamano(n){return n<1024?n+' B':(n/1024).toLocaleString('es-MX',{maximumFractionDigits:n<10240?1:0})+' KB'}
function yoId(){return D.yo().id}
function porQuien(d){
  var p=d.editadoPor;if(!p||!p.id)return '';
  return p.id===yoId()?'Tú':p.nombre||'Alguien';
}
function avatar(p,clase){return AT.permisos?AT.permisos.avatar(p,clase):''}

/* ---------- Ordenar y filtrar ---------- */
var ORDEN={
  nombre:function(a,b){return a.titulo.localeCompare(b.titulo,'es',{numeric:true,sensitivity:'base'})},
  modificado:function(a,b){return a.editado<b.editado?-1:a.editado>b.editado?1:0},
  tipo:function(a,b){return a.tipo.nombre.localeCompare(b.tipo.nombre,'es')||ORDEN.nombre(a,b)},
  permisos:function(a,b){return (a.gente.length-b.gente.length)||(A?A.ROLES[a.rol==='ninguno'?'lector':a.rol].n-A.ROLES[b.rol==='ninguno'?'lector':b.rol].n:0)||ORDEN.nombre(a,b)},
  tamano:function(a,b){return a.tam-b.tam}
};
function filtrar(){
  var u=ubicDe(est.ubic),palabras=sinAcentos(q).trim().split(/\s+/).filter(Boolean);
  var l=docs.filter(function(x){
    if(!u.f(x))return false;
    if(!palabras.length)return true;
    var t=sinAcentos(x.titulo+' '+x.tipo.nombre);
    return palabras.every(function(p){return t.indexOf(p)>=0});
  });
  var f=ORDEN[est.orden.col]||ORDEN.modificado,dir=est.orden.dir;
  l.sort(function(a,b){return f(a,b)*dir||ORDEN.nombre(a,b)});
  return l;
}

/* ---------- La estructura ---------- */
raiz.innerHTML='<div class="xp-barra" role="toolbar" aria-label="Tus páginas" aria-controls="xpLista">'+
    '<button type="button" class="btn pri xp-nuevo" data-crear>'+ico('crear')+'Nuevo</button>'+
    '<div class="xp-selacc" id="xpSelAcc" hidden><span id="xpSelN"></span>'+
      '<button type="button" class="btn" data-sel="abrir">'+ico('page')+'Abrir</button>'+
      '<button type="button" class="btn" data-sel="fav">'+ico('estrella')+'Favorita</button>'+
      '<button type="button" class="btn" data-sel="papelera">'+ico('basura')+'Papelera</button>'+
      '<button type="button" class="btn" data-sel="ninguna">Quitar selección</button></div>'+
    '<label class="xp-q">'+ico('investigacion')+'<span class="vh">Buscar en tus páginas</span><input type="search" id="xpQ" placeholder="Buscar en tus páginas" autocomplete="off"></label>'+
    '<div class="xp-vista" role="group" aria-label="Ver como">'+
      '<button type="button" class="icon-btn" data-vista="detalles" aria-label="Detalles" title="Detalles">'+ico('lista')+'</button>'+
      '<button type="button" class="icon-btn" data-vista="tarjetas" aria-label="Tarjetas" title="Tarjetas">'+ico('columnas')+'</button></div>'+
    '<button type="button" class="btn xp-cols" id="xpCols" aria-haspopup="true" aria-expanded="false">'+ico('tabla')+'Columnas</button>'+
  '</div>'+
  '<div class="xp-cuerpo">'+
    '<nav class="xp-nav" id="xpNav" aria-label="Ubicaciones de tus páginas"></nav>'+
    '<div class="xp-main">'+
      '<p class="xp-ruta" id="xpRuta"></p>'+
      '<div class="xp-lista" id="xpLista"></div>'+
      '<p class="xp-estado" id="xpEstado" role="status"></p>'+
    '</div>'+
  '</div>';
var lst=$('#xpLista',raiz),inQ=$('#xpQ',raiz);

/* ---------- Ubicaciones ---------- */
function cuenta(f){return docs.filter(f).length}
function pintarNav(){
  var h='<ul class="xp-ul">'+UBIC.map(function(u){
    var n=cuenta(u.f);
    if(u.siHay&&!n&&est.ubic!==u.k)return '';
    return '<li><button type="button" class="xp-u'+(u.k==='solicitudes'&&n?' xp-u-aviso':'')+'" data-ubic="'+u.k+'"'+(est.ubic===u.k?' aria-current="true"':'')+'>'+ico(u.i)+'<span>'+esc(u.t)+'</span><em>'+n+'</em></button></li>';
  }).join('')+'</ul>';
  var cats=CATS.filter(function(c){return cuenta(function(x){return x.cat===c[0]})||est.ubic==='cat:'+c[0]});
  if(cats.length>1)h+='<p class="xp-nav-h">Por tipo</p><ul class="xp-ul">'+cats.map(function(c){
    var k='cat:'+c[0];
    return '<li><button type="button" class="xp-u" data-ubic="'+k+'"'+(est.ubic===k?' aria-current="true"':'')+'>'+ico(c[2])+'<span>'+esc(c[1])+'</span><em>'+cuenta(function(x){return x.cat===c[0]})+'</em></button></li>';
  }).join('')+'</ul>';
  h+='<ul class="xp-ul xp-ul-pie"><li><button type="button" class="xp-u" data-papelera>'+ico('basura')+'<span>Papelera</span><em>'+enPapelera+'</em></button></li></ul>';
  $('#xpNav',raiz).innerHTML=h;
}

/* ---------- La lista ---------- */
function ahoraHTML(id){
  var l=D.presencia?D.presencia.de(id):[],y=D.yo();
  if(!l.length)return '<span class="xp-nadie" aria-label="Nadie">—</span>';
  return '<span class="xp-ahora">'+l.map(function(p){
    var tu=p.quien.id===y.id;
    return avatar({id:p.quien.id,nombre:tu?(y.nombre||'Tú'):p.quien.nombre},p.modo==='editar'?'edita':'');
  }).join('')+'<span>'+l.map(function(p){
    var tu=p.quien.id===y.id;
    return (tu?'Tú':esc(p.quien.nombre||'Alguien'))+' · '+(p.modo==='editar'?'editando':'leyendo')+(p.pestanas>1?' ('+p.pestanas+' pestañas)':'');
  }).join(', ')+'</span></span>';
}
function permHTML(x,clase){
  var n=x.gente.length,av=x.gente.slice(0,3).map(function(p){return avatar(p)}).join('')+(n>3?'<span class="perm-av mas" aria-hidden="true">+'+(n-3)+'</span>':'');
  var rol=A?A.nombreRol(x.rol):'Propietario',txt=n<=1?'Solo tú':n+' personas';
  return '<button type="button" class="xp-perm'+(clase?' '+clase:'')+'" data-k="perm" aria-haspopup="dialog" aria-label="Permisos de «'+esc(x.titulo)+'»: '+esc(rol)+', '+txt+(x.pend.length?', '+x.pend.length+' por responder':'')+'">'+
    '<span class="xp-rol r-'+x.rol+'">'+esc(rol)+'</span><span class="xp-avs">'+av+'</span><small>'+txt+'</small>'+
    (x.pend.length?'<em class="xp-sol">'+x.pend.length+(x.pend.length===1?' solicitud':' solicitudes')+'</em>':'')+'</button>';
}
function nombreHTML(x){
  return '<a class="xp-a" data-k="abrir" href="documento.html?id='+encodeURIComponent(x.id)+'">'+ico(x.tipo.icono||'page')+'<span>'+esc(x.titulo)+'</span></a>'+
    (x.d.favorito?'<i class="xp-fav" title="Favorita">'+ico('estrella-llena')+'<span class="vh"> (favorita)</span></i>':'')+
    (!x.editar?'<span class="xp-chip">Solo lectura</span>':'')+
    /* En una pantalla angosta, el tipo y la fecha van debajo del nombre (la columna «Modificado» se esconde) */
    '<small class="xp-nom-m" aria-hidden="true">'+esc(x.tipo.nombre)+' · '+esc(fecha(x.editado).corto)+'</small>';
}
function masHTML(x){return '<button type="button" class="icon-btn xp-mas" data-k="mas" aria-haspopup="menu" aria-label="Más opciones de «'+esc(x.titulo)+'»" title="Más opciones">'+ico('puntos')+'</button>'}
function selHTML(x){return '<input type="checkbox" data-k="sel" aria-label="Seleccionar «'+esc(x.titulo)+'»"'+(sel[x.id]?' checked':'')+'>'}
function encabezado(col,t){
  var s=est.orden.col===col?(est.orden.dir===1?'ascending':'descending'):'none';
  return '<th scope="col" aria-sort="'+s+'"><button type="button" class="xp-th" data-orden="'+col+'">'+esc(t)+(s!=='none'?ico(s==='ascending'?'up':'down','xp-dir'):'')+'</button></th>';
}
function pintarLista(){
  var marca=focoMarca();
  lista=filtrar();
  var u=ubicDe(est.ubic);
  $('#xpRuta',raiz).innerHTML='<span>Tus páginas</span>'+ico('chev-l','xp-sep')+'<b>'+esc(u.t)+'</b>'+(q?ico('chev-l','xp-sep')+'<span>«'+esc(q)+'»</span>':'');
  if(!lista.length){
    lst.innerHTML='<div class="xp-vacio">'+(!docs.length?'<p>'+esc(vacio)+'</p><button type="button" class="btn pri" data-crear>'+ico('crear')+'Crear una página</button>':
      q?'<p>Nada coincide con «'+esc(q)+'».</p>':est.ubic==='favoritas'?'<p>Todavía no tienes favoritas: márcalas con la estrella de la página o con «Favorita».</p>':
      est.ubic==='compartidas'?'<p>Todavía no compartes ninguna página. Ábrela con «Permisos» para invitar a alguien.</p>':'<p>No hay páginas aquí.</p>')+'</div>';
    pintarEstado();return;
  }
  var cols=COLS.filter(function(c){return visible(c.k)});
  if(est.vista==='tarjetas'){
    lst.innerHTML='<ul class="xp-tjs" aria-label="'+esc(u.t)+'">'+lista.map(function(x){
      var f=fecha(x.editado);
      return '<li class="xp-tj'+(sel[x.id]?' sel':'')+'" data-fila="'+esc(x.id)+'">'+
        '<div class="xp-tj-h">'+selHTML(x)+'<span class="xp-tj-ic">'+ico(x.tipo.icono||'page')+'</span>'+masHTML(x)+'</div>'+
        '<div class="xp-nom">'+nombreHTML(x)+'</div>'+
        '<p class="xp-tj-m">'+esc(x.tipo.nombre)+' · <time datetime="'+esc(x.editado)+'" title="'+esc(f.largo)+'">'+esc(f.corto)+'</time></p>'+
        '<div class="xp-tj-p" data-ahora="'+esc(x.id)+'">'+ahoraHTML(x.id)+'</div>'+permHTML(x)+'</li>';
    }).join('')+'</ul>';
  }else{
    lst.innerHTML='<table class="xp-t"><caption class="vh">'+esc(u.t)+': '+lista.length+(lista.length===1?' página':' páginas')+'</caption><thead><tr>'+
      '<th scope="col" class="xp-c-sel"><input type="checkbox" data-k="todas" aria-label="Seleccionar todas"'+(lista.length&&lista.every(function(x){return sel[x.id]})?' checked':'')+'></th>'+
      encabezado('nombre','Nombre')+
      cols.map(function(c){return c.orden?encabezado(c.orden,c.t).replace('<th ','<th class="xp-c-'+c.k+'" '):'<th scope="col" class="xp-c-'+c.k+'">'+esc(c.t)+'</th>'}).join('')+
      '<th scope="col" class="xp-c-mas"><span class="vh">Más opciones</span></th></tr></thead><tbody>'+
      lista.map(function(x){
        var f=fecha(x.editado),pq=porQuien(x.d);
        var celdas={
          mod:'<td class="xp-c-mod"><time datetime="'+esc(x.editado)+'" title="'+esc(f.largo)+'">'+esc(f.corto)+'</time>'+(pq?'<small>por '+esc(pq)+'</small>':'')+'</td>',
          tipo:'<td class="xp-c-tipo">'+esc(x.tipo.nombre)+'</td>',
          ahora:'<td class="xp-c-ahora" data-ahora="'+esc(x.id)+'">'+ahoraHTML(x.id)+'</td>',
          perm:'<td class="xp-c-perm">'+permHTML(x)+'</td>',
          tam:'<td class="xp-c-tam">'+esc(tamano(x.tam))+'</td>'
        };
        return '<tr class="xp-f'+(sel[x.id]?' sel':'')+'" data-fila="'+esc(x.id)+'"'+(sel[x.id]?' aria-selected="true"':'')+'>'+
          '<td class="xp-c-sel">'+selHTML(x)+'</td><td class="xp-nom">'+nombreHTML(x)+'</td>'+
          cols.map(function(c){return celdas[c.k]}).join('')+'<td class="xp-c-mas">'+masHTML(x)+'</td></tr>';
      }).join('')+'</tbody></table>';
  }
  if(!activo||!lista.some(function(x){return x.id===activo}))activo=lista[0].id;
  roving();
  restaurarFoco(marca);
  pintarEstado();
}
function pintarEstado(){
  var n=lista.length,s=Object.keys(sel).length;
  $('#xpEstado',raiz).textContent=n+(n===1?' página':' páginas')+(s?' · '+s+(s===1?' seleccionada':' seleccionadas'):'')+(q?' · buscando «'+q+'»':'');
  var b=$('#xpSelAcc',raiz);b.hidden=!s;
  if(s)$('#xpSelN',raiz).textContent=s+(s===1?' seleccionada':' seleccionadas');
  $$('[data-vista]',raiz).forEach(function(v){v.setAttribute('aria-pressed',String(v.getAttribute('data-vista')===est.vista))});
}
function pintar(){pintarNav();pintarLista()}
/* Solo la columna «Trabajando ahora» (cambia cada pocos segundos) */
function pintarAhora(){$$('[data-ahora]',lst).forEach(function(c){c.innerHTML=ahoraHTML(c.getAttribute('data-ahora'))})}

/* ---------- Foco: uno por página (fila), y las flechas mueven entre páginas ---------- */
function filas(){return $$('[data-fila]',lst)}
function roving(){
  filas().forEach(function(f){
    var on=f.getAttribute('data-fila')===activo;
    $$('[data-k="abrir"],[data-k="perm"],[data-k="mas"]',f).forEach(function(c){c.tabIndex=on?0:-1});
    $$('[data-k="sel"]',f).forEach(function(c){c.tabIndex=-1});
  });
}
function focoMarca(){
  var e=document.activeElement;
  if(!e||!lst.contains(e))return null;
  var f=e.closest('[data-fila]');
  return f?{id:f.getAttribute('data-fila'),k:e.getAttribute('data-k')}:e.getAttribute('data-orden')?{orden:e.getAttribute('data-orden')}:null;
}
function restaurarFoco(m){
  if(!m)return;
  var e=m.orden?lst.querySelector('[data-orden="'+m.orden+'"]'):lst.querySelector('[data-fila="'+cssId(m.id)+'"] [data-k="'+(m.k||'abrir')+'"]');
  if(e)e.focus({preventScroll:true});
}
function cssId(s){return window.CSS&&CSS.escape?CSS.escape(s):String(s).replace(/"/g,'\\"')}
function ir(id,k){
  activo=id;roving();
  var e=lst.querySelector('[data-fila="'+cssId(id)+'"] [data-k="'+(k||'abrir')+'"]')||lst.querySelector('[data-fila="'+cssId(id)+'"] [data-k="abrir"]');
  if(e){e.focus();e.scrollIntoView({block:'nearest'})}
}

/* ---------- Selección ---------- */
var ancla='';
function alternar(id,si){if(si==null)si=!sel[id];if(si)sel[id]=1;else delete sel[id]}
function seleccionarRango(a,b){
  var ids=lista.map(function(x){return x.id}),i=ids.indexOf(a),j=ids.indexOf(b);
  if(i<0||j<0)return;
  if(i>j){var t=i;i=j;j=t}
  for(var k=i;k<=j;k++)sel[ids[k]]=1;
}
function marcarSel(){
  filas().forEach(function(f){
    var id=f.getAttribute('data-fila'),on=!!sel[id];
    f.classList.toggle('sel',on);
    if(f.tagName==='TR'){if(on)f.setAttribute('aria-selected','true');else f.removeAttribute('aria-selected')}
    var c=$('[data-k="sel"]',f);if(c)c.checked=on;
  });
  var t=$('[data-k="todas"]',lst);if(t)t.checked=lista.length>0&&lista.every(function(x){return sel[x.id]});
  pintarEstado();
}
function seleccionadas(){return docs.filter(function(x){return sel[x.id]})}

/* ---------- Menú de una página (y de «Columnas») ---------- */
var menuEl=null,menuDe=null;
function cerrarMenu(volver){
  if(!menuEl)return;
  menuEl.remove();menuEl=null;
  var c=$('#xpCols',raiz);c.setAttribute('aria-expanded','false');
  if(volver&&menuDe&&menuDe.isConnected)menuDe.focus({preventScroll:true});
  menuDe=null;
}
function abrirMenu(desde,items,x,y){
  cerrarMenu();
  menuDe=desde;
  menuEl=document.createElement('div');
  menuEl.className='xp-menu';menuEl.setAttribute('role','menu');
  menuEl.innerHTML=items.map(function(it,i){
    if(it.sep)return '<div class="xp-menu-sep" role="separator"></div>';
    return '<button type="button" role="'+(it.marcado!=null?'menuitemcheckbox':'menuitem')+'"'+(it.marcado!=null?' aria-checked="'+!!it.marcado+'"':'')+' tabindex="-1" data-i="'+i+'" class="xp-mi'+(it.peligro?' peligro':'')+'">'+
      (it.marcado!=null?ico(it.marcado?'check':'blanco','xp-mi-c'):ico(it.i||'page'))+'<span>'+esc(it.t)+'</span></button>';
  }).join('');
  document.body.appendChild(menuEl);
  var r=desde.getBoundingClientRect(),w=menuEl.offsetWidth,h=menuEl.offsetHeight;
  var left=x!=null?x:r.right-w,top=y!=null?y:r.bottom+4;
  left=Math.max(8,Math.min(left,innerWidth-w-8));
  if(top+h>innerHeight-8)top=Math.max(8,(y!=null?y:r.top-4)-h);
  menuEl.style.left=left+'px';menuEl.style.top=top+'px';
  var bs=$$('[role^="menuitem"]',menuEl);
  menuEl.addEventListener('click',function(e){
    var b=e.target.closest('[data-i]');if(!b)return;
    var it=items[+b.getAttribute('data-i')];
    if(it.marcado!=null){it.f();return}
    cerrarMenu(true);it.f();
  });
  menuEl.addEventListener('keydown',function(e){
    var i=bs.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus()}
    else if(e.key==='Home'){e.preventDefault();bs[0].focus()}
    else if(e.key==='End'){e.preventDefault();bs[bs.length-1].focus()}
    else if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();cerrarMenu(true)}
  });
  if(bs[0])bs[0].focus();
  return menuEl;
}
document.addEventListener('pointerdown',function(e){if(menuEl&&!menuEl.contains(e.target)&&!(menuDe&&menuDe.contains(e.target)))cerrarMenu()},true);
addEventListener('resize',function(){cerrarMenu()});
addEventListener('scroll',function(){cerrarMenu()},true);

function urlDe(id,h){return 'documento.html?id='+encodeURIComponent(id)+(h||'')}
function abrirEnPestana(id){
  var u=urlDe(id);
  if(AT.pestanas&&AT.pestanas.abrible&&AT.pestanas.abrible(new URL(u,location.href).href)&&AT.pestanas.abrir(new URL(u,location.href).href))return;
  window.open(u,'_blank','noopener');
}
function itemsDe(x){
  var it=[{t:'Abrir',i:'page',f:function(){location.href=urlDe(x.id)}},
    {t:'Abrir en otra pestaña',i:'pestanas',f:function(){abrirEnPestana(x.id)}}];
  if(x.editar)it.push({t:x.d.favorito?'Quitar de favoritas':'Agregar a favoritas',i:'estrella',f:function(){favoritas([x])}});
  it.push({sep:true},
    {t:'Personas y permisos…',i:'users',f:function(){permisos(x.id)}},
    {t:'Historial de versiones',i:'historial',f:function(){location.href=urlDe(x.id,'#historial')}},
    {t:'Duplicar',i:'copiar',f:function(){duplicar(x)}});
  if(x.admin)it.push({sep:true},{t:'Mover a la papelera',i:'basura',peligro:true,f:function(){papelera([x])}});
  return it;
}
function menuColumnas(b){
  var items=COLS.map(function(c){
    var it={t:c.t,marcado:visible(c.k)};
    it.f=function(){
      if(visible(c.k))est.ocultas.push(c.k);else est.ocultas=est.ocultas.filter(function(k){return k!==c.k});
      guardarEst();pintarLista();
      var m=menuEl&&menuEl.querySelector('[data-i="'+COLS.indexOf(c)+'"]');
      if(m){m.setAttribute('aria-checked',String(visible(c.k)));m.querySelector('.ico').outerHTML=ico(visible(c.k)?'check':'blanco','xp-mi-c');m.focus()}
    };
    return it;
  });
  abrirMenu(b,items);
  b.setAttribute('aria-expanded','true');
}

/* ---------- Acciones ---------- */
function permisos(id){
  var b=lst.querySelector('[data-fila="'+cssId(id)+'"] [data-k="perm"]')||lst.querySelector('[data-fila="'+cssId(id)+'"] [data-k="abrir"]');
  if(AT.permisos)AT.permisos.abrir(id,b);
}
function favoritas(l){
  l=l.filter(function(x){return x.editar});
  if(!l.length){AT.aviso('No tienes permiso para cambiar esas páginas.');return}
  var poner=!l.every(function(x){return x.d.favorito});
  Promise.all(l.map(function(x){
    var c=JSON.parse(JSON.stringify(x.d));
    if(poner)c.favorito=true;else delete c.favorito;
    return D.documentos.guardar(c,{conservarFecha:true});
  })).then(function(){AT.aviso(poner?(l.length===1?'Agregada a favoritas.':l.length+' páginas agregadas a favoritas.'):(l.length===1?'Ya no es favorita.':l.length+' páginas ya no son favoritas.'))},
    function(){AT.aviso('No se pudo guardar. Inténtalo otra vez.')});
}
function duplicar(x){
  var c=JSON.parse(JSON.stringify(x.d));
  var bds=((c.contenido||{}).content||[]).filter(function(b){return b.type==='basedatos'&&b.attrs&&b.attrs.base});
  Promise.all(bds.map(function(b){
    return AT.bases&&AT.bases.semillaDe?AT.bases.semillaDe(b.attrs.base,true).then(function(s){if(s){b.attrs.semilla=s;b.attrs.base='';b.attrs.vista=''}}):null;
  })).then(function(){
    c.id='d-'+AT.bloques.nuevoId().slice(2)+AT.bloques.nuevoId().slice(4);
    c.titulo='Copia de '+(x.d.titulo||'Sin título');
    /* La copia es tuya: sin la lista de personas ni favorita */
    delete c.creado;delete c.favorito;delete c.acceso;delete c.editadoPor;
    return D.documentos.guardar(c);
  }).then(function(c){
    activo=c.id;
    AT.aviso('Se creó «'+c.titulo+'».','Abrir',function(){location.href=urlDe(c.id)});
  },function(){AT.aviso('No se pudo duplicar. Inténtalo otra vez.')});
}
/* Mandar a la papelera, con confirmación y «Deshacer» */
function papelera(l){
  var puedo=l.filter(function(x){return x.admin}),no=l.length-puedo.length;
  if(!puedo.length){AT.aviso('Solo quien administra una página puede mandarla a la papelera.');return}
  var d=document.createElement('dialog');
  d.className='atajos';d.setAttribute('aria-labelledby','xpPapT');
  d.innerHTML='<div class="at-h"><h2 id="xpPapT">¿Mover a la papelera?</h2></div>'+
    '<p class="td-p">'+(puedo.length===1?'«'+esc(puedo[0].titulo)+'» sale de tus páginas.':puedo.length+' páginas salen de tus páginas.')+
    ' Puedes recuperarlas desde la papelera durante '+D.papelera.DIAS+' días.'+(no?' '+no+(no===1?' página no se mueve':' páginas no se mueven')+': no las administras.':'')+'</p>'+
    '<div class="td-bt"><button class="btn danger" type="button" data-pap="si">Mover a la papelera</button><button class="btn" type="button" data-pap="no">Cancelar</button></div>';
  document.body.appendChild(d);
  var volver=document.activeElement;
  d.addEventListener('close',function(){d.remove();if(volver&&volver.isConnected)volver.focus({preventScroll:true})});
  d.addEventListener('click',function(e){
    var b=e.target.closest('[data-pap]');
    if(e.target===d||b&&b.getAttribute('data-pap')==='no'){d.close();return}
    if(!b)return;
    b.setAttribute('aria-disabled','true');
    puedo.reduce(function(p,x){
      return p.then(function(){return AT.inventario&&AT.inventario.quitarDoc?AT.inventario.quitarDoc(x.id).catch(function(){}):null}).then(function(){return D.papelera.mover(x.d)});
    },Promise.resolve()).then(function(){
      puedo.forEach(function(x){delete sel[x.id]});
      d.close();
      AT.aviso(puedo.length===1?'«'+puedo[0].titulo+'» se movió a la papelera.':puedo.length+' páginas se movieron a la papelera.','Deshacer',function(){
        Promise.all(puedo.map(function(x){return D.papelera.restaurar(x.id)})).then(function(){AT.aviso('Listo: volvieron a tus páginas.')});
      });
    },function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo mover a la papelera. Inténtalo otra vez.')});
  });
  d.showModal();
  $('[data-pap="no"]',d).focus();
}

/* ---------- Eventos ---------- */
raiz.addEventListener('click',function(e){
  var t=e.target;
  var u=t.closest('[data-ubic]');
  if(u){est.ubic=u.getAttribute('data-ubic');guardarEst();sel={};activo='';pintar();var b=$('[data-ubic="'+u.getAttribute('data-ubic')+'"]',raiz);if(b)b.focus();return}
  var o=t.closest('[data-orden]');
  if(o){var c=o.getAttribute('data-orden');est.orden=est.orden.col===c?{col:c,dir:-est.orden.dir}:{col:c,dir:c==='modificado'||c==='tamano'?-1:1};guardarEst();pintarLista();return}
  var v=t.closest('[data-vista]');
  if(v){est.vista=v.getAttribute('data-vista');guardarEst();pintarLista();return}
  if(t.closest('#xpCols')){if(menuEl)cerrarMenu();else menuColumnas($('#xpCols',raiz));return}
  var s=t.closest('[data-sel]');
  if(s){
    var a=s.getAttribute('data-sel'),l=seleccionadas();
    if(a==='ninguna'){sel={};marcarSel();return}
    if(a==='fav')favoritas(l);
    else if(a==='papelera')papelera(l);
    else if(a==='abrir'){
      if(l.length===1){location.href=urlDe(l[0].id);return}
      l.slice(1).forEach(function(x){abrirEnPestana(x.id)});location.href=urlDe(l[0].id);
    }
    return;
  }
  if(t.closest('[data-k="todas"]')){var todas=t.closest('[data-k="todas"]').checked;lista.forEach(function(x){alternar(x.id,todas)});marcarSel();return}
  var f=t.closest('[data-fila]');if(!f)return;
  var id=f.getAttribute('data-fila'),x=docs.filter(function(y){return y.id===id})[0];if(!x)return;
  activo=id;roving();
  if(t.closest('[data-k="sel"]')){alternar(id,t.closest('[data-k="sel"]').checked);ancla=id;marcarSel();return}
  if(t.closest('[data-k="perm"]')){permisos(id);return}
  if(t.closest('[data-k="mas"]')){abrirMenu(t.closest('[data-k="mas"]'),itemsDe(x));return}
  if(t.closest('a,button,input'))return;
  /* Clic en la fila: la selecciona (Ctrl o Cmd suma, Mayús hace un rango); doble clic la abre */
  if(e.shiftKey&&ancla)seleccionarRango(ancla,id);
  else if(e.ctrlKey||e.metaKey){alternar(id);ancla=id}
  else{sel={};sel[id]=1;ancla=id}
  marcarSel();
  var a=$('[data-k="abrir"]',f);if(a)a.focus({preventScroll:true});
});
lst.addEventListener('dblclick',function(e){
  var f=e.target.closest('[data-fila]');if(!f||e.target.closest('a,button,input'))return;
  location.href=urlDe(f.getAttribute('data-fila'));
});
lst.addEventListener('contextmenu',function(e){
  var f=e.target.closest('[data-fila]');if(!f)return;
  var id=f.getAttribute('data-fila'),x=docs.filter(function(y){return y.id===id})[0];if(!x)return;
  e.preventDefault();
  activo=id;roving();
  if(!sel[id]){sel={};sel[id]=1;marcarSel()}
  abrirMenu($('[data-k="mas"]',f),itemsDe(x),e.clientX,e.clientY);
});
lst.addEventListener('focusin',function(e){var f=e.target.closest('[data-fila]');if(f&&f.getAttribute('data-fila')!==activo){activo=f.getAttribute('data-fila');roving()}});
lst.addEventListener('keydown',function(e){
  var f=e.target.closest('[data-fila]');
  if((e.ctrlKey||e.metaKey)&&(e.key==='a'||e.key==='A')&&!/^(INPUT|TEXTAREA)$/.test(e.target.tagName)||((e.ctrlKey||e.metaKey)&&(e.key==='a'||e.key==='A')&&e.target.type==='checkbox')){
    e.preventDefault();lista.forEach(function(x){sel[x.id]=1});marcarSel();return;
  }
  if(!f)return;
  var ids=lista.map(function(x){return x.id}),i=ids.indexOf(f.getAttribute('data-fila')),k=e.target.getAttribute('data-k')||'abrir';
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();var j=Math.max(0,Math.min(ids.length-1,i+(e.key==='ArrowDown'?1:-1)));
    if(e.shiftKey){sel[ids[i]]=1;sel[ids[j]]=1;marcarSel()}ir(ids[j],k);return}
  if(e.key==='Home'||e.key==='End'){e.preventDefault();ir(ids[e.key==='Home'?0:ids.length-1],k);return}
  if(e.key===' '&&k==='abrir'){e.preventDefault();alternar(ids[i]);ancla=ids[i];marcarSel();return}
  if(e.key==='Escape'&&Object.keys(sel).length){e.preventDefault();sel={};marcarSel();return}
  if(e.key==='ContextMenu'||(e.key==='F10'&&e.shiftKey)){
    e.preventDefault();var x=docs.filter(function(y){return y.id===ids[i]})[0];if(x)abrirMenu($('[data-k="mas"]',f),itemsDe(x));
  }
});
var tq=null;
inQ.addEventListener('input',function(){clearTimeout(tq);tq=setTimeout(function(){q=inQ.value.trim();sel={};pintarLista()},120)});
inQ.addEventListener('keydown',function(e){
  if(e.key==='ArrowDown'&&lista.length){e.preventDefault();ir(lista[0].id)}
  if(e.key==='Escape'&&inQ.value){e.preventDefault();inQ.value='';q='';pintarLista()}
});

/* ---------- Datos que cambian ---------- */
function contarPapelera(){
  if(!D.papelera)return;
  D.papelera.todos().then(function(l){if(l.length!==enPapelera){enPapelera=l.length;pintarNav()}},function(){});
}
D.on(function(c){
  if(c.almacen==='presencia')pintarAhora();
  else if(c.almacen==='papelera'||c.almacen==='*')contarPapelera();
  else if(c.almacen==='yo')pintarLista();
});
/* La presencia se vence sola: se revisa cada 20 segundos */
setInterval(pintarAhora,20e3);

AT.explorador={
  /* inicio.js le pasa tus páginas (sin las de «Mi negocio» y «Tu equipo») y el texto para cuando no hay ninguna */
  datos:function(l,op){
    docs=(l||[]).map(info);vacio=op&&op.vacio||'Todavía no tienes páginas.';
    var ids={};docs.forEach(function(x){ids[x.id]=1});
    Object.keys(sel).forEach(function(id){if(!ids[id])delete sel[id]});
    pintar();contarPapelera();
  },
  estado:function(){return JSON.parse(JSON.stringify(est))},
  lista:function(){return lista.map(function(x){return x.id})}
};
})();
