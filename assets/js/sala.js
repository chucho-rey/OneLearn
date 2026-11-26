/* OneBook: la página de una sala (sala.html?id=sa-… o ?id=privado; ?nueva crea una sala), etapa Empresas, E3.
   Una sala es un espacio de trabajo con sus páginas (empresa.js: AT.empresa.salas; la sala de cada página está en
   su acceso, datos.js). Aquí se ve quién entra, sus páginas, las herramientas que se sugieren para su departamento
   y «Nueva página aquí» (crear.js crea en AT.salaActual). Quien la administra cambia quién entra (departamentos que
   editan o solo ven y personas sueltas) y, en una sala entre departamentos, su nombre y su color; la quita si ya no
   tiene páginas. Privado: tus páginas privadas (solo tú y su lista). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,E=AT.empresa,D=AT.datos;
var raiz=$('#sala');
if(!raiz)return;
var q=new URLSearchParams(location.search),ID=q.get('id')||'',NUEVA=q.has('nueva');
var ACC={admin:'administra',edita:'edita',ve:'solo ve'},ROL={admin:'la administras',editor:'creas y editas sus páginas',lector:'solo ves sus páginas'};
/* Herramientas que se sugieren según el nombre del departamento (tipos de crear.js) */
var HERR=[
  [/venta|mostrador|caja|tienda/,['venta','corte','fiado','clientes']],
  [/almacen|inventario|bodega/,['inventario','surtir','proveedores']],
  [/compra/,['proveedores','surtir','inventario']],
  [/administracion|finanza|contab|tesoreria/,['gastos','presupuesto','reporte','prestamo']],
  [/recursos humanos|^rh$|personal|nomina/,['equipo','nominas','vacaciones','aguinaldos']],
  [/cocina|restaurante|comida|servicio$/,['surtir','precio','pendientes']],
  [/reparto|envio|pedido|logistica|entrega/,['venta','clientes','pendientes']],
  [/atencion|cliente/,['clientes','venta','pendientes']],
  [/operacion|produccion|taller|mantenimiento/,['pendientes','surtir','notas']]
];
function norma(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()}
function herramientas(s){
  var n=norma(s.nombre),l=s.tipo==='general'?['pendientes','reporte','notas']:[];
  HERR.forEach(function(h){if(h[0].test(n))h[1].forEach(function(t){if(l.indexOf(t)<0)l.push(t)})});
  if(!l.length)l=['pendientes','notas'];
  return l.filter(function(t){var x=AT.tiposDoc&&AT.tiposDoc[t];return x&&x.listo&&(!AT.perfil||AT.perfil.tiene(x.modulo))}).slice(0,4);
}
function plural(n,uno,varios){return n+' '+(n===1?uno:varios)}
function fecha(t){var d=new Date(t);return isNaN(d)?'':d.toLocaleDateString('es-MX',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'})}
function opcion(v,t,sel){return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(t)+'</option>'}

if(!E||!E.existe()){
  raiz.innerHTML='<h1>Salas</h1><p>Todavía no hay una empresa en este navegador.</p><p><a class="btn pri" href="entrar.html">Crear tu empresa</a></p>';
  return;
}
AT.salaActual=ID==='privado'||E.sala(ID)?ID:'';

/* ---------- La sala ---------- */
var paginas=[];
/* La portada (tablero.js): la arma quien administra la sala; se monta una vez y se mueve a su lugar al repintar */
var portada=null,tabB=null;
function ponerPortada(s){
  if(!AT.tablero||s.tipo==='privado')return;
  if(!portada){
    portada=document.createElement('section');portada.className='tab sala-tab';portada.setAttribute('aria-labelledby','tabSalaT');
    tabB=AT.tablero.montar(portada,{capa:'sala',sala:ID,id:'tabSala',titulo:'Portada',ocultarVacio:true,
      vacio:'Arma la portada de la sala: avisos, indicadores, una página o una gráfica. Usa «Agregar».'});
  }
  var cab=$('.emp-cab',raiz);if(cab)cab.insertAdjacentElement('afterend',portada);
}
function sala(){return ID==='privado'?{id:'privado',tipo:'privado',nombre:'Privado',color:'gris'}:E.sala(ID)}
function quienEntra(s){
  var h=[],todas=E.personas();
  var admins=todas.filter(function(p){return p.rol==='propietario'||p.rol==='admin'});
  if(s.tipo==='general')h.push('<li><b>Toda la empresa</b><span>edita</span></li>');
  if(s.tipo==='depto'){
    var d=E.departamento(s.depto),ms=E.miembros(s.depto);
    h.push('<li><b>Departamento '+esc(d?d.nombre:'')+'</b><span>su responsable la administra, sus miembros editan y los de consulta solo ven</span>'+
      (ms.length?'<span class="sala-gente">'+ms.map(function(m){return '<span class="sala-p">'+AT.avatar(m.persona)+esc(m.persona.nombre||'Sin nombre')+' <small>('+esc(E.ROLES_DEP[m.rol].nombre.toLowerCase())+')</small></span>'}).join('')+'</span>':'')+'</li>');
  }
  Object.keys(s.acceso.deptos).forEach(function(did){
    var d=E.departamento(did);if(d)h.push('<li><b><i class="emp-dot c-'+esc(d.color)+'" aria-hidden="true"></i> '+esc(d.nombre)+'</b><span>'+esc(ACC[s.acceso.deptos[did]])+'</span></li>');
  });
  Object.keys(s.acceso.personas).forEach(function(pid){
    var p=E.persona(pid);if(p)h.push('<li><b>'+AT.avatar(p)+esc(p.nombre||'Sin nombre')+'</b><span>'+esc(ACC[s.acceso.personas[pid]])+'</span></li>');
  });
  if(admins.length)h.push('<li><b>Quien administra la empresa</b><span>la administra: '+esc(admins.map(function(p){return p.nombre||'Sin nombre'}).join(', '))+'</span></li>');
  return h.join('');
}
function pintar(){
  var s=sala(),rol=s&&s.tipo!=='privado'?E.rolEnSala(ID):'',puede=s&&(s.tipo==='privado'||E.puedeSala(ID,'ver'));
  if(!s||!puede){
    raiz.innerHTML='<div class="page-icon">'+ico('candado')+'</div><h1>'+(s?'No tienes acceso a esta sala':'Esta sala no existe')+'</h1>'+
      '<p>'+(s?'Entran las personas de sus departamentos y las que la sala agrega. Pídele acceso a quien la administra.':'Quizá se quitó o es de otra empresa.')+'</p>'+
      '<p><a class="btn pri" href="inicio.html">Ir al inicio</a></p>';
    document.title=(s?'Sin acceso':'Sala no encontrada')+' · OneBook';
    return;
  }
  var nombre=s.tipo==='general'?'General':s.nombre,editar=s.tipo==='privado'||E.puedeSala(ID,'editar'),admin=s.tipo!=='privado'&&s.tipo!=='general'&&E.puedeSala(ID,'administrar');
  document.title=nombre+' · OneBook';
  var c=$('.crumbs .cur');if(c)c.textContent=nombre;
  var sub=s.tipo==='privado'?'Tus páginas privadas: solo las ven tú y las personas de su lista.':
    (s.tipo==='general'?'La sala de toda la empresa':s.tipo==='depto'?'La sala del departamento '+nombre:'Una sala entre departamentos')+' · Tú '+ROL[rol];
  var h='<div class="emp-cab"><div class="emp-cab-t"><h1>'+(s.tipo==='privado'?ico('candado','sala-ic'):'<span class="emp-dot sala-dot c-'+esc(s.color)+'" aria-hidden="true"></span>')+esc(nombre)+'</h1>'+
    '<p class="emp-sub">'+esc(sub)+'</p></div><div class="sala-bt">'+
    (editar?'<button class="btn pri" type="button" data-sala="nueva">'+ico('crear')+'Nueva página aquí</button>':'')+
    (admin?'<button class="btn" type="button" data-sala="admin">Administrar sala</button>':'')+'</div></div>';
  if(s.tipo!=='privado')h+='<section class="emp-sec" aria-labelledby="salaQT"><h2 id="salaQT">Quién entra</h2><ul class="sala-quien">'+quienEntra(s)+'</ul></section>';
  if(editar&&s.tipo!=='privado'){
    var hs=herramientas({nombre:nombre,tipo:s.tipo});
    if(hs.length)h+='<section class="emp-sec" aria-labelledby="salaHT"><h2 id="salaHT">Para empezar</h2><p class="emp-txt">Herramientas que suelen servir en esta sala. Se crean aquí, como cualquier página.</p>'+
      '<div class="sala-herr">'+hs.map(function(t){var x=AT.tiposDoc[t];return '<button class="btn" type="button" data-tipo="'+esc(t)+'">'+ico(x.icono)+esc(x.nombre)+'</button>'}).join('')+'</div></section>';
  }
  h+='<section class="emp-sec" aria-labelledby="salaPT"><h2 id="salaPT">Páginas <small>('+paginas.length+')</small></h2>'+
    (paginas.length?'<ul class="sala-pags">'+paginas.map(function(d){
      var t=AT.tiposDoc&&AT.tiposDoc[d.tipo],por=d.editadoPor&&d.editadoPor.nombre;
      return '<li><a href="documento.html?id='+encodeURIComponent(d.id)+'">'+ico(t?t.icono:'page')+'<span>'+esc(d.titulo||'Sin título')+'</span></a>'+
        '<small>'+esc(t?t.nombre:'Documento')+' · '+esc(fecha(d.editado||d.creado))+(por?' · por '+esc(por):'')+'</small></li>';
    }).join('')+'</ul>':'<p class="emp-vacio">Todavía no hay páginas en esta sala.'+(editar?' Crea la primera con «Nueva página aquí».':'')+'</p>')+'</section>';
  raiz.innerHTML=h;
  ponerPortada(s);
}
function cargar(){
  return D.documentos.todos().then(function(l){
    paginas=l.filter(function(d){return D.acceso.sala(d)===ID&&D.acceso.puede(d,'ver')})
      .sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:(b.editado||'')>(a.editado||'')?1:0});
    pintar();
  });
}

/* ---------- Crear o administrar una sala ---------- */
var dlg=null,abridor=null;
function ventana(s){
  var nueva=!s,libre=nueva||s.tipo==='libre';
  var deps=E.departamentos().filter(function(d){return !s||d.id!==s.depto}),ps=E.personas();
  var acc=s?s.acceso:{deptos:{},personas:{}},color=s?s.color:E.COLORES[E.salas({todas:true}).length%E.COLORES.length][0];
  if(dlg&&dlg.open)dlg.close();
  dlg=document.createElement('dialog');dlg.className='atajos emp-dlg';dlg.setAttribute('aria-labelledby','salaDlgT');
  dlg.innerHTML='<div class="at-h"><h2 id="salaDlgT">'+(nueva?'Nueva sala':'Administrar «'+esc(s.nombre)+'»')+'</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<form class="emp-f" novalidate>'+
    (libre?'<label class="campo-l"><span>Nombre</span><input name="nombre" maxlength="40" required autocomplete="off" value="'+esc(s?s.nombre:'')+'" placeholder="Por ejemplo, Proyecto de la sucursal"></label>'+
      '<fieldset class="emp-fs"><legend>Color</legend><div class="emp-colores">'+E.COLORES.map(function(c){
        return '<label class="emp-color"><input type="radio" name="color" value="'+c[0]+'"'+(c[0]===color?' checked':'')+'><span class="emp-dot c-'+c[0]+'" aria-hidden="true"></span><span>'+esc(c[1])+'</span></label>';
      }).join('')+'</div></fieldset>':'<p class="emp-txt">Es la sala del departamento '+esc(s.nombre)+': su gente entra según su rol en el departamento. Aquí agregas a otros departamentos o personas.</p>')+
    (deps.length?'<fieldset class="emp-fs"><legend>Departamentos que entran</legend><div class="emp-deps-f">'+deps.map(function(d){
      var v=acc.deptos[d.id]||'';
      return '<label class="emp-dep-f"><span><i class="emp-dot c-'+esc(d.color)+'" aria-hidden="true"></i>'+esc(d.nombre)+'</span><select name="d-'+esc(d.id)+'" aria-label="Acceso de '+esc(d.nombre)+'">'+
        opcion('','No entra',v)+opcion('edita','Edita',v)+opcion('ve','Solo ve',v)+'</select></label>';
    }).join('')+'</div></fieldset>':'')+
    '<fieldset class="emp-fs"><legend>Personas sueltas</legend><p class="emp-txt">Además de sus departamentos. Quien administra la empresa entra siempre.</p><div class="emp-deps-f">'+ps.filter(function(p){return p.rol!=='propietario'&&p.rol!=='admin'}).map(function(p){
      var v=acc.personas[p.id]||'';
      return '<label class="emp-dep-f"><span>'+AT.avatar(p)+esc(p.nombre||'Sin nombre')+'</span><select name="p-'+esc(p.id)+'" aria-label="Acceso de '+esc(p.nombre||'esta persona')+'">'+
        opcion('','Por su departamento',v)+opcion('admin','Administra',v)+opcion('edita','Edita',v)+opcion('ve','Solo ve',v)+'</select></label>';
    }).join('')+'</div></fieldset>'+
    '<div class="td-bt"><button class="btn pri" type="submit">'+(nueva?'Crear sala':'Guardar')+'</button><button class="btn" type="button" data-cerrar>Cancelar</button></div>'+
    (!nueva&&libre?'<div class="td-bt emp-peligro"><button class="btn emp-quitar" type="button" data-acc="quitar">Quitar la sala</button></div>':'')+
    '<p class="td-msg" id="salaDlgMsg" role="status"></p></form>';
  document.body.appendChild(dlg);
  var d=dlg,form=$('form',d);
  function error(t){var m=$('#salaDlgMsg',d);m.textContent=t;m.classList.add('err')}
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){d.remove();if(abridor&&abridor.isConnected)abridor.focus({preventScroll:true})});
  form.addEventListener('click',function(e){
    var b=e.target.closest('[data-acc="quitar"]');if(!b)return;
    if(paginas.length){error('Esta sala todavía tiene '+plural(paginas.length,'página','páginas')+': muévelas a otra sala o bórralas primero.');return}
    if(b.getAttribute('data-seguro')!=='1'){b.setAttribute('data-seguro','1');b.textContent='Sí, quitar la sala «'+s.nombre+'»';var m=$('#salaDlgMsg',d);m.classList.remove('err');m.textContent='Toca otra vez para confirmar.';return}
    try{E.quitarSala(s.id);location.href='inicio.html'}catch(err){error(err.message)}
  });
  form.addEventListener('submit',function(e){
    e.preventDefault();var f=form.elements,dd={},pp={};
    deps.forEach(function(x){var v=f['d-'+x.id]&&f['d-'+x.id].value;if(v)dd[x.id]=v});
    ps.forEach(function(x){var v=f['p-'+x.id]&&f['p-'+x.id].value;if(v)pp[x.id]=v});
    var col=(form.querySelector('input[name="color"]:checked')||{}).value;
    try{
      if(nueva){var n=E.agregarSala({nombre:f.nombre.value,color:col,deptos:dd,personas:pp});location.href='sala.html?id='+encodeURIComponent(n.id);return}
      E.cambiarSala(s.id,libre?{nombre:f.nombre.value,color:col,deptos:dd,personas:pp}:{deptos:dd,personas:pp});
      d.close();pintar();AT.aviso('Sala guardada.');
    }catch(err){error(err.message)}
  });
  d.showModal();
  var fo=$('input:not([type="radio"]),select',d);if(fo)fo.focus();
}

/* ---------- Eventos ---------- */
raiz.addEventListener('click',function(e){
  var b=e.target.closest('[data-sala],[data-tipo]');if(!b)return;
  abridor=b;
  if(b.hasAttribute('data-tipo')){
    b.setAttribute('aria-disabled','true');
    AT.crear.nuevo(b.getAttribute('data-tipo'),{sala:ID}).catch(function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo crear la página. Inténtalo otra vez.')});
    return;
  }
  var a=b.getAttribute('data-sala');
  if(a==='nueva')AT.crear.abrir(null,{sala:ID});
  else if(a==='admin')ventana(sala());
});
D.on(function(c){if(c.almacen==='documentos'||c.almacen==='*')cargar()});
E.on(function(){cargar()});
if(NUEVA&&E.puedeCrearSalas()){
  raiz.innerHTML='<h1>Nueva sala</h1><p class="emp-txt">Una sala entre departamentos: sus páginas las ven y las editan los departamentos y las personas que elijas.</p>'+
    '<p><a class="btn" href="empresa.html">Volver a «Tu empresa»</a></p>';
  document.title='Nueva sala · OneBook';
  var c0=$('.crumbs .cur');if(c0)c0.textContent='Nueva sala';
  abridor=$('.btn',raiz);ventana(null);
}else cargar();
})();
