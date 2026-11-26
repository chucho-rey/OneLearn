/* OneBook: el Inicio en el celular (por debajo de 900 px) como una app de archivos. En escritorio no cambia nada.
   - Navegación inferior con tres secciones: Páginas (abre aquí), Inicio (los tableros, «Prepara tu negocio», las
     páginas listas para usar) y Empresa (quién eres, Tu empresa, las salas y los ajustes). Se recuerda en esta pestaña.
   - Páginas: búsqueda en píldora, ruta en chips, las salas como carpetas (con la pestaña del color de su departamento),
     Privado, Favoritas, Compartidas y Papelera; adentro de una carpeta, sus páginas en lista con la fecha y quién las
     cambió, ordenadas por fecha o por nombre, y el menú de cada una (el mismo del explorador). En la raíz, las
     recientes. Atrás sube de carpeta (inicio.html#carpeta=<ubicación>, con el historial del navegador).
   - El botón flotante «+» abre «Crear» en la carpeta donde estás (crear.js lee AT.salaActual).
   Las carpetas son las ubicaciones de AT.ubicaciones (barra.js). inicio.js le pasa las páginas con AT.archivos.datos;
   la barra lateral, en el celular, abre una ubicación con AT.archivos.ir. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,D=AT.datos,U=AT.ubicaciones;
var raiz=$('#celArchivos'),nav=$('#celNav'),emp=$('#celEmpresa');
if(!raiz||!nav||!D||!U)return;
var CLAVE='onebook-cel-seccion',DIA=864e5;
var mq=window.matchMedia('(max-width:899.98px)');
function enCelular(){return mq.matches}
function sinAcentos(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
var docs=[],enPapelera=0,carpeta='',q='',orden='fecha';
try{orden=localStorage.getItem('aprende-tecnologia:archivos-orden')==='nombre'?'nombre':'fecha'}catch(e){}

/* ---------- Formatos ---------- */
function fecha(t){
  if(!t)return '';
  var d=new Date(t),h=new Date();h.setHours(0,0,0,0);
  var x=new Date(d);x.setHours(0,0,0,0);
  var n=Math.round((h-x)/DIA),hora=d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'});
  return n===0?'Hoy, '+hora:n===1?'Ayer, '+hora:d.toLocaleDateString('es-MX',d.getFullYear()===h.getFullYear()?{day:'numeric',month:'short'}:{day:'numeric',month:'short',year:'numeric'});
}
function porQuien(d){var p=d.editadoPor;if(!p||!p.id)return '';return p.id===D.yo().id?'Tú':p.nombre||'Alguien'}
function plural(n,uno,varios){return n+' '+(n===1?uno:varios)}
function nombreSala(id){
  if(id==='privado')return 'Privado';
  var s=AT.empresa&&AT.empresa.existe()&&AT.empresa.sala(id);
  return s?(s.tipo==='general'?'General':s.nombre):'';
}

/* ---------- Secciones (navegación inferior) ---------- */
var SECCIONES=[['paginas','Páginas','notas'],['inicio','Inicio','home'],['empresa','Empresa','empresa']];
var seccion='paginas';
try{var s0=sessionStorage.getItem(CLAVE);if(SECCIONES.some(function(s){return s[0]===s0}))seccion=s0}catch(e){}
nav.innerHTML=SECCIONES.map(function(s){
  return '<button type="button" class="cn-b" data-seccion="'+s[0]+'">'+ico(s[2])+'<span>'+s[1]+'</span></button>';
}).join('');
function ponerSeccion(s,foco){
  seccion=s;
  try{sessionStorage.setItem(CLAVE,s)}catch(e){}
  document.body.setAttribute('data-cel',s);
  $$('[data-seccion]',nav).forEach(function(b){var on=b.getAttribute('data-seccion')===s;if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(s==='empresa')pintarEmpresa();
  /* Los tableros se dibujan a su ancho: al aparecer, que se acomoden */
  if(s==='inicio')setTimeout(function(){window.dispatchEvent(new Event('resize'))},0);
  if(foco&&enCelular()){
    var h=s==='paginas'?$('#t-docs'):s==='empresa'?$('#celEmpT'):$('#saludo');
    if(h){if(!h.hasAttribute('tabindex'))h.setAttribute('tabindex','-1');h.focus({preventScroll:true});window.scrollTo(0,0)}
  }
}
nav.addEventListener('click',function(e){
  var b=e.target.closest('[data-seccion]');if(!b)return;
  ponerSeccion(b.getAttribute('data-seccion'),true);
});
ponerSeccion(seccion);

/* ---------- Las páginas: qué hay en cada carpeta ---------- */
function infos(){return U.paginas(docs).map(U.info)}
function ordenar(l){
  return l.sort(orden==='nombre'?function(a,b){return a.titulo.localeCompare(b.titulo,'es',{numeric:true,sensitivity:'base'})}:
    function(a,b){return a.editado<b.editado?1:a.editado>b.editado?-1:0});
}
/* Las carpetas de la raíz: las salas (General, departamentos, entre departamentos) y Privado; sin empresa, los tipos.
   Después, Favoritas, Compartidas (si hay) y la Papelera */
function carpetas(xs){
  var l=[];
  if(AT.empresa&&AT.empresa.existe()){
    AT.empresa.salas().forEach(function(s){l.push({k:'sala:'+s.id,t:s.tipo==='general'?'General':s.nombre,color:s.color||'acento',sala:s.id})});
    l.push({k:'sala:privado',t:'Privado',i:'candado',sala:'privado'});
  }else U.CATS.forEach(function(c){l.push({k:'cat:'+c[0],t:c[1],i:c[2]})});
  l.forEach(function(c){var u=U.de(c.k);c.n=xs.filter(u.f).length});
  var extra=[{k:'favoritas',t:'Favoritas',i:'estrella'},{k:'compartidas',t:'Compartidas',i:'users'},{k:'contigo',t:'Compartidas contigo',i:'enlace'},{k:'solicitudes',t:'Solicitudes',i:'aviso'}];
  extra.forEach(function(c){var u=U.de(c.k);c.n=xs.filter(u.f).length;c.especial=true;if(c.n||c.k==='favoritas')l.push(c)});
  l.push({k:'papelera',t:'Papelera',i:'basura',n:enPapelera,especial:true,papelera:true});
  return l;
}
function carpetaHTML(c){
  var sub=c.papelera?(c.n?plural(c.n,'página','páginas'):'Vacía'):c.n?plural(c.n,'página','páginas'):'Sin páginas';
  return '<li><button type="button" class="ca-cp'+(c.especial?' ca-esp':'')+(c.color?' ca-c-'+esc(c.color):'')+'" '+(c.papelera?'data-papelera':'data-carpeta="'+esc(c.k)+'"')+'>'+
    '<span class="ca-cp-f" aria-hidden="true">'+(c.i?ico(c.i):'')+'</span>'+
    '<span class="ca-cp-t">'+esc(c.t)+'</span><small>'+sub+'</small></button></li>';
}
function filaHTML(x,conSala){
  var f=fecha(x.editado),pq=porQuien(x.d),sn=conSala&&x.sala?nombreSala(x.sala):'';
  var meta=[f,pq?'por '+pq:'',sn].filter(Boolean).join(' · ');
  return '<li class="ca-f" data-fila="'+esc(x.id)+'">'+
    '<a class="ca-a" href="documento.html?id='+encodeURIComponent(x.id)+'">'+
      '<span class="ca-ic" aria-hidden="true">'+ico(x.tipo.icono||'page')+'</span>'+
      '<span class="ca-tx"><b>'+esc(x.titulo)+(x.d.favorito?'<i class="ca-fav" title="Favorita">'+ico('estrella-llena')+'<span class="vh"> (favorita)</span></i>':'')+'</b>'+
      '<small>'+esc(meta)+'</small></span></a>'+
    '<button type="button" class="icon-btn ca-mas" data-mas="'+esc(x.id)+'" aria-haspopup="menu" aria-label="Más opciones de «'+esc(x.titulo)+'»">'+ico('puntos')+'</button></li>';
}
function rutaHTML(){
  var partes=[['','Tus páginas']];
  if(q)partes.push(['?','Buscar «'+q+'»']);
  else if(carpeta)partes.push([carpeta,U.de(carpeta).t]);
  return '<ol class="ca-ruta">'+partes.map(function(p,i){
    var ultima=i===partes.length-1;
    return '<li>'+(i?ico('chev-l','ca-sep'):'')+(ultima?'<span class="ca-chip on" aria-current="location">'+esc(p[1])+'</span>':
      '<button type="button" class="ca-chip" data-ruta="'+esc(p[0])+'">'+(i===0?ico('home'):'')+esc(p[1])+'</button>')+'</li>';
  }).join('')+'</ol>';
}
function vacioHTML(t,crear){
  return '<div class="ca-vacio"><p>'+esc(t)+'</p>'+(crear?'<button type="button" class="btn pri" data-crear data-nueva-aqui>'+ico('crear')+'Crear una página aquí</button>':'')+'</div>';
}
function ordenHTML(){
  return '<button type="button" class="ca-orden" data-orden aria-label="Ordenar: '+(orden==='nombre'?'por nombre':'más recientes primero')+'. Cambiar el orden">'+
    ico(orden==='nombre'?'lista':'historial')+'<span>'+(orden==='nombre'?'Por nombre':'Más recientes')+'</span></button>';
}
raiz.innerHTML='<form class="ca-q" id="caForm" role="search" aria-label="Buscar en tus páginas">'+ico('investigacion')+
    '<label class="vh" for="caQ">Buscar en tus páginas</label><input type="search" id="caQ" placeholder="Buscar en tus páginas" autocomplete="off" enterkeyhint="search"></form>'+
  '<nav id="caRuta" aria-label="Ruta de carpetas"></nav><div id="caLista"></div>';
/* El «+» va dentro de .main: con el menú abierto queda inerte, como el resto */
($('.main')||document.body).insertAdjacentHTML('beforeend','<button type="button" class="ca-fab" id="celNuevo" data-crear>'+ico('crear')+'</button>');
var lista=$('#caLista',raiz),ruta=$('#caRuta',raiz),inQ=$('#caQ',raiz);
function pintar(){
  var xs=infos(),h='';
  ruta.innerHTML=(q||carpeta)?rutaHTML():'';
  if(q){
    var p=sinAcentos(q).split(/\s+/).filter(Boolean);
    var r=ordenar(xs.filter(function(x){var t=sinAcentos(x.titulo+' '+x.tipo.nombre);return p.every(function(w){return t.indexOf(w)>=0})}));
    h='<div class="ca-h"><h3 id="caT" tabindex="-1">'+plural(r.length,'resultado','resultados')+'</h3>'+ordenHTML()+'</div>'+
      (r.length?'<ul class="ca-l">'+r.map(function(x){return filaHTML(x,true)}).join('')+'</ul>':vacioHTML('Nada coincide con «'+q+'».'));
  }else if(carpeta){
    var u=U.de(carpeta),l=ordenar(xs.filter(u.f)),enSala=!!u.sala;
    h='<div class="ca-h"><h3 id="caT" tabindex="-1">'+esc(u.t)+' <small>'+plural(l.length,'página','páginas')+'</small></h3>'+ordenHTML()+'</div>'+
      (enSala&&u.sala!=='privado'?'<p class="ca-sala"><a href="sala.html?id='+encodeURIComponent(u.sala)+'">'+ico('deptos')+'Ver la sala: portada y quién entra</a></p>':'')+
      (l.length?'<ul class="ca-l">'+l.map(function(x){return filaHTML(x,!enSala)}).join('')+'</ul>':
        vacioHTML(enSala?(u.sala==='privado'?'Aquí van las páginas que solo ves tú.':'Esta sala todavía no tiene páginas.'):
          carpeta==='favoritas'?'Todavía no tienes favoritas: márcalas con la estrella de la página.':'No hay páginas aquí.',enSala));
  }else{
    /* Las recientes siempre van de la más nueva a la más vieja */
    var rec=xs.slice().sort(function(a,b){return a.editado<b.editado?1:a.editado>b.editado?-1:0}).slice(0,6);
    h='<ul class="ca-cps" aria-label="Carpetas">'+carpetas(xs).map(carpetaHTML).join('')+'</ul>'+
      '<div class="ca-h"><h3 id="caRecT">Recientes</h3>'+(xs.length?'<button type="button" class="ca-orden" data-carpeta="todas">'+ico('notas')+'<span>Ver todas ('+xs.length+')</span></button>':'')+'</div>'+
      (rec.length?'<ul class="ca-l" aria-labelledby="caRecT">'+rec.map(function(x){return filaHTML(x,true)}).join('')+'</ul>':
        vacioHTML('Todavía no tienes páginas. Crea la primera con «+».'));
  }
  lista.innerHTML=h;
  pintarFab();
}

/* ---------- Ir a una carpeta (con el historial: Atrás sube) ---------- */
function hashDe(k){return k?'#carpeta='+encodeURIComponent(k):''}
function leerHash(){var m=/^#carpeta=(.+)$/.exec(location.hash);if(!m)return '';try{return U.de(decodeURIComponent(m[1])).k}catch(e){return ''}}
function salaActual(){var u=carpeta?U.de(carpeta):null;return u&&u.sala||''}
function abrirCarpeta(k,op){
  op=op||{};
  k=k?U.de(k).k:'';
  var antes=carpeta,buscaba=!!q;
  q='';inQ.value='';
  if(k!==antes||buscaba){
    carpeta=k;
    try{
      var url=location.pathname+location.search+hashDe(k);
      /* De la raíz a una carpeta: una entrada nueva (Atrás sube); entre carpetas o a la raíz, se reemplaza */
      if(k&&!antes)history.pushState({ca:k},'',url);else history.replaceState(k?{ca:k}:null,'',url);
    }catch(e){}
  }
  pintar();
  if(op.foco)enfocar();
}
function enfocar(){var t=$('#caT',raiz)||$('#t-docs');if(t){t.focus({preventScroll:true});var s=$('#iniPaginas');if(s&&s.getBoundingClientRect().top<0)s.scrollIntoView({block:'start'})}}
window.addEventListener('popstate',function(){
  var k=leerHash();
  if(k!==carpeta){carpeta=k;q='';inQ.value='';pintar();if(enCelular()&&seccion==='paginas')enfocar()}
});

/* ---------- Eventos ---------- */
raiz.addEventListener('click',function(e){
  var t=e.target;
  var c=t.closest('[data-carpeta]');
  if(c){abrirCarpeta(c.getAttribute('data-carpeta'),{foco:true});return}
  var r=t.closest('[data-ruta]');
  if(r){
    var k=r.getAttribute('data-ruta');
    /* Subir a la raíz: si llegaste desde ella, es «Atrás» */
    if(!k&&!q&&history.state&&history.state.ca){history.back();return}
    abrirCarpeta(k,{foco:true});return;
  }
  if(t.closest('[data-orden]')){
    orden=orden==='fecha'?'nombre':'fecha';
    try{localStorage.setItem('aprende-tecnologia:archivos-orden',orden)}catch(x){}
    pintar();var o=$('[data-orden]',raiz);if(o)o.focus();
    return;
  }
  var m=t.closest('[data-mas]');
  if(m&&AT.explorador&&AT.explorador.menu){AT.explorador.menu(m,m.getAttribute('data-mas'));return}
  /* «Crear una página aquí»: crear.js abre «Crear» en esta sala */
  if(t.closest('[data-nueva-aqui]'))AT.salaActual=salaActual();
});
var tq=null;
inQ.addEventListener('input',function(){clearTimeout(tq);tq=setTimeout(function(){q=inQ.value.trim();pintar()},120)});
inQ.addEventListener('keydown',function(e){if(e.key==='Escape'&&inQ.value){e.preventDefault();inQ.value='';q='';pintar()}});
$('#caForm',raiz).addEventListener('submit',function(e){e.preventDefault();var t=$('#caT',raiz);if(t)t.focus()});

/* El botón flotante «+»: crea en la carpeta donde estás */
var fab=$('#celNuevo');
function pintarFab(){
  if(!fab)return;
  var s=salaActual(),n=s?nombreSala(s):'';
  fab.setAttribute('aria-label',n?'Crear una página en '+n:'Crear una página');
  fab.title=fab.getAttribute('aria-label');
}
if(fab)fab.addEventListener('click',function(){AT.salaActual=salaActual()});

/* ---------- Empresa: quién eres, Tu empresa, las salas y los ajustes ---------- */
function filaEmp(attr,icono,t,sub){
  return '<li><'+(attr.indexOf('href=')===0?'a '+attr:'button type="button" '+attr)+' class="ce-i">'+icono+'<span><b>'+esc(t)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>'+ico('chev-l','ce-chev')+'</'+(attr.indexOf('href=')===0?'a':'button')+'></li>';
}
function pintarEmpresa(){
  if(!emp)return;
  var E=AT.empresa,e=E&&E.existe()?E.leer():null,yo=E&&E.activa(),h='';
  h+='<h2 id="celEmpT" tabindex="-1">'+esc(e&&e.nombre||'Tu espacio')+'</h2>';
  if(e){
    h+='<ul class="ce-l" aria-label="Quién eres">'+filaEmp('data-ce="persona"',yo?AT.avatar(yo):'<i class="av t4" aria-hidden="true">?</i>',yo?yo.nombre||'Sin nombre':'¿Quién eres?',yo?'Cambiar de persona':'Elige quién eres')+'</ul>';
    h+='<h3 class="ce-h">Tu empresa</h3><ul class="ce-l">'+
      filaEmp('href="empresa.html"',ico('empresa'),'Personas y departamentos',plural(E.personas().length,'persona','personas')+' · '+plural(E.departamentos().length,'departamento','departamentos'))+'</ul>';
    h+='<h3 class="ce-h">Salas</h3><ul class="ce-l">'+E.salas().map(function(s){
      return filaEmp('href="sala.html?id='+encodeURIComponent(s.id)+'"','<i class="emp-dot c-'+esc(s.color||'acento')+'" aria-hidden="true"></i>',s.tipo==='general'?'General':s.nombre,'');
    }).join('')+filaEmp('href="sala.html?id=privado"',ico('candado'),'Privado','Lo que solo ves tú')+'</ul>';
  }
  h+='<h3 class="ce-h">Ajustes</h3><ul class="ce-l">'+
    filaEmp('data-ce="lectura"','<span class="ico-txt" aria-hidden="true">Aa</span>','Lectura','Tamaño de letra, tema y contraste')+
    filaEmp('data-ce="datos"',ico('datos'),'Tus datos','Respaldo, espacio y empezar de cero')+
    filaEmp('href="ayuda.html"',ico('ayuda'),'Ayuda','Cada herramienta, paso a paso')+'</ul>';
  emp.innerHTML=h;
}
if(emp)emp.addEventListener('click',function(e){
  var b=e.target.closest('[data-ce]');if(!b)return;
  var a=b.getAttribute('data-ce');
  if(a==='persona'&&AT.persona)AT.persona.abrir(b);
  else if(a==='lectura'&&AT.lectura)AT.lectura.abrir();
  else if(a==='datos'&&AT.tusDatos)AT.tusDatos.abrir();
});
if(AT.empresa&&AT.empresa.on)AT.empresa.on(function(){if(seccion==='empresa')pintarEmpresa();pintar()});

/* ---------- Datos ---------- */
function leerPapelera(){if(D.papelera)D.papelera.todos().then(function(l){if(l.length!==enPapelera){enPapelera=l.length;pintar()}})}
D.on(function(c){if(c.almacen==='papelera'||c.almacen==='*')leerPapelera();else if(c.almacen==='yo')pintar()});
carpeta=leerHash();
AT.archivos={
  datos:function(l){docs=l||[];pintar()},
  /* La barra lateral en el celular: abre esa ubicación en Páginas */
  ir:function(k){ponerSeccion('paginas');abrirCarpeta(k,{foco:true})},
  seccion:function(s){if(s)ponerSeccion(s,true);return seccion},
  carpeta:function(){return carpeta},
  enCelular:enCelular
};
leerPapelera();
pintar();
})();
