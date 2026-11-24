/* Pantalla de inicio de OneBook. Cambia según el perfil del espacio (perfil.js):
   - Con el módulo de estudio: continúa donde te quedaste, tus documentos, notas recientes, rutas, proyectos y
     explorar temas; la primera visita (sin avance ni notas) sugiere empezar por Memoria RAM.
   - Sin él (negocio o personal): el nombre del negocio (o tu nombre) y la fecha, tus páginas y páginas listas
     para usar (las plantillas de los módulos encendidos, AT.crear.plantillasInicio).
   - Fase F5: acciones rápidas (negocio y personal: el corte de hoy, una venta, el fiado, un gasto; abren la página
     que ya tienes, con documento.html#agregar=<bloque>, o la crean), «Prepara tu negocio» (una lista que se marca
     sola al revisar tus páginas; se puede ocultar) y, en tus páginas, las favoritas primero y después las recientes.
   Las secciones de un módulo apagado llevan .m-estudio y base.css las oculta.
   Usa AT.avance (avance.js) y AT.datos (datos.js). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico,LECC=AT.rutas.lecciones;
var lecciones=[],porId={};
AT.catalogo.forEach(function(g){g.lecciones.forEach(function(l){lecciones.push(l);porId[l.id]=l})});
var disponibles=lecciones.filter(function(l){return l.archivo});
var PER=AT.perfil,EST=!PER||PER.tiene('estudio');

function saludo(){
  var h=new Date().getHours();
  return h>=5&&h<12?'Buenos días':h>=12&&h<19?'Buenas tardes':'Buenas noches';
}
function url(l,hash){return esc(LECC+l.archivo+(hash?'#'+hash:''))}
var notasCache=[];
function hayNotas(){return docsCache.length>0||notasCache.some(function(n){return n.t.trim()})}

function pintarContinuar(){
  var cont=$('#continuar'),bienv=$('#bienvenida');
  var u=AT.avance.ultima(),l=u&&porId[u.id];
  if(!l||!l.archivo){
    cont.hidden=true;
    bienv.hidden=hayNotas();
    return;
  }
  bienv.hidden=true;cont.hidden=false;
  var p=AT.avance.porcentaje(l.id),h;
  var sig=disponibles[disponibles.indexOf(l)+1];
  if(p>=100&&sig&&AT.avance.porcentaje(sig.id)<100){
    /* Terminaste esta lección: se sugiere la siguiente */
    var ps=AT.avance.porcentaje(sig.id);
    h='<a class="cont" href="'+url(sig)+'"><span class="cont-l">Terminaste '+esc(l.titulo)+'. Sigue con</span>'+
      '<b>'+esc(sig.titulo)+'</b>'+
      '<span class="cont-bar" aria-hidden="true"><i style="width:'+ps+'%"></i></span>'+
      '<span class="cont-p">'+(ps?ps+'% leído':'Sin empezar')+'</span></a>';
  }else{
    var r=u.repaso;
    h='<a class="cont" href="'+url(l,p>=100?'':u.seccion)+'"><span class="cont-l">Continúa donde te quedaste</span>'+
      '<b>'+esc(l.titulo)+'</b>'+
      (u.seccionTitulo&&p<100?'<span class="cont-s">'+esc(u.seccionTitulo)+'</span>':'')+
      '<span class="cont-bar" aria-hidden="true"><i style="width:'+p+'%"></i></span>'+
      '<span class="cont-p">'+p+'% leído'+(r?' · repaso: '+r.ok+' de '+r.total:'')+'</span></a>';
  }
  cont.innerHTML=h;
}

function cargarNotas(){
  return AT.datos.notas.todas().then(function(lista){
    notasCache=lista.filter(function(n){return porId[n.id]&&porId[n.id].archivo}).map(function(n){return {l:porId[n.id],t:n.texto||'',f:n.editado||''}});
  });
}
function pintarNotas(){
  var notas=notasCache
    .filter(function(n){return n.t.trim()})
    .sort(function(a,b){return a.f===b.f?0:a.f<b.f?1:-1})
    .slice(0,3);
  var ul=$('#recientes');
  if(!notas.length){
    ul.innerHTML='<li class="ini-vacio">Aún no tienes apuntes. Se escriben desde cada lección, en «Apuntes», abajo.</li>';
    return;
  }
  ul.innerHTML=notas.map(function(n){
    var linea=n.t.trim().split(/\n/)[0].trim();
    if(linea.length>120)linea=linea.slice(0,120)+'…';
    var w=n.t.trim().split(/\s+/).length;
    return '<li><a class="nota" href="'+url(n.l,'apuntes')+'"><b>'+esc(n.l.titulo)+'</b><span>'+esc(linea)+'</span><small>'+(w===1?'1 palabra':w+' palabras')+'</small></a></li>';
  }).join('');
}

/* Tus documentos: los 6 más recientes */
var docsCache=[];
function cargarDocs(){return AT.datos.documentos.todos().then(function(l){docsCache=l})}
function cuando(iso){
  if(!iso)return '';
  var d=new Date(iso),min=(Date.now()-d.getTime())/6e4;
  if(min<1)return 'Hace un momento';
  if(min<60)return 'Hace '+Math.round(min)+' min';
  if(min<60*24&&d.getDate()===new Date().getDate())return 'Hoy, '+d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'});
  return d.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'});
}
/* Recordatorio de respaldo: si tienes documentos o notas y no descargas un respaldo desde hace 14 días
   (o nunca), Inicio lo sugiere. «Recordármelo en una semana» lo pospone 7 días. Un espacio recién creado
   (menos de 3 días, perfil.js) todavía no lo pide: sus páginas acaban de salir de las plantillas. */
var CLAVE_POSPONER='aprende-tecnologia:recordar-respaldo',DIA=864e5;
function pintarRespaldo(){
  var caja=$('#iniRespaldo');if(!caja)return;
  var ult=AT.datos.ultimoRespaldo(),hasta=0;
  try{hasta=+localStorage.getItem(CLAVE_POSPONER)||0}catch(e){}
  var dias=ult?Math.floor((Date.now()-new Date(ult).getTime())/DIA):null;
  var pf=PER&&PER.actual(),nuevo=pf&&!pf.migrado&&(Date.now()-new Date(pf.creado+'T00:00:00').getTime())<3*DIA;
  var mostrar=hayNotas()&&(dias===null||dias>=14)&&Date.now()>=hasta&&!(nuevo&&dias===null);
  caja.hidden=!mostrar;
  if(mostrar)$('#iniRespaldoTxt').textContent=(dias===null?'Todavía no has descargado ningún respaldo.':'Tu último respaldo es de hace '+dias+' días.')+
    (EST?' Tus documentos y notas solo viven en este navegador':' Tus páginas solo viven en este navegador')+': si se borran sus datos, se pierden. Descarga un respaldo y guárdalo en otro lugar.';
}
$('#iniRespaldoSi').addEventListener('click',function(){
  AT.datos.descargar().then(function(){pintarRespaldo();AT.aviso('Respaldo descargado. Guárdalo en tu nube o en una memoria USB.')},function(){AT.aviso('No se pudo crear el respaldo. Inténtalo otra vez.')});
});
$('#iniRespaldoNo').addEventListener('click',function(){
  try{localStorage.setItem(CLAVE_POSPONER,String(Date.now()+7*DIA))}catch(e){}
  pintarRespaldo();$('#t-docs').focus();
});

function tarjeta(d){
  var t=AT.tiposDoc&&AT.tiposDoc[d.tipo],w=AT.bloques?AT.bloques.palabras(d):0;
  return '<li><a class="nota" href="documento.html?id='+encodeURIComponent(d.id)+'"><b class="doc-t">'+ico(t?t.icono:'page')+'<span>'+esc(d.titulo||'Sin título')+'</span>'+
    (d.favorito?'<i class="doc-est" title="Favorita">'+ico('estrella-llena')+'<span class="vh"> (favorita)</span></i>':'')+'</b>'+
    '<span>'+esc(t?t.nombre:'Documento')+(AT.bloques?' · '+(w===1?'1 palabra':w+' palabras'):'')+'</span><small>'+esc(cuando(d.editado))+'</small></a></li>';
}
/* Tus páginas: las favoritas (todas) y las 6 más recientes que no son favoritas */
function pintarDocs(){
  var ul=$('#iniDocs');
  if(!ul)return;
  var orden=docsCache.slice().sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:(b.editado||'')>(a.editado||'')?1:0});
  var favs=orden.filter(function(d){return d.favorito}),docs=orden.filter(function(d){return !d.favorito}).slice(0,6);
  $('#iniFavs').hidden=$('#iniFavsT').hidden=$('#iniRecT').hidden=!favs.length;
  $('#iniFavs').innerHTML=favs.map(tarjeta).join('');
  if(!docs.length){
    ul.innerHTML=favs.length?'<li class="ini-vacio">Tus demás páginas aparecerán aquí.</li>':'<li class="ini-vacio">'+(EST?'Crea una libreta de estudio, unas notas o tus apuntes de clase. Se guardan en este dispositivo.':
      'Todavía no tienes páginas. Crea la primera con «Crear» o con una de las que están aquí abajo. Se guardan en este dispositivo.')+'</li>';
    return;
  }
  ul.innerHTML=docs.map(tarjeta).join('');
}

/* ---------- Acciones rápidas y «Prepara tu negocio» (fase F5) ---------- */
/* Los bloques de un tipo en tus páginas: [{doc, attrs}], de la página editada más recientemente a la más vieja */
function bloquesDe(tipo){
  var out=[];
  docsCache.slice().sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:1}).forEach(function(d){
    ((d.contenido||{}).content||[]).forEach(function(b){if(b&&b.type===tipo)out.push({doc:d,attrs:b.attrs||{}})});
  });
  return out;
}
/* Abre la página que ya tiene ese bloque (el corte agrega el de hoy si falta) o crea una con su plantilla */
function irA(bloque,plantilla){
  var b=bloquesDe(bloque)[0];
  if(b){location.href='documento.html?id='+encodeURIComponent(b.doc.id)+'#agregar='+bloque;return Promise.resolve()}
  return AT.crear.nuevo(plantilla||bloque);
}
var ACCIONES={
  negocio:[
    {k:'corte',t:'Corte de hoy',i:'caja',f:function(){return irA('corte')}},
    {k:'venta',t:'Nueva venta',i:'venta',f:function(){return AT.crear.nuevo('venta')}},
    {k:'fiado',t:'Anotar fiado',i:'fiado',f:function(){return irA('fiado')}},
    {k:'gasto',t:'Anotar un gasto',i:'gastos',f:function(){return irA('gastos')}}],
  personal:[
    {k:'gasto',t:'Anotar un gasto',i:'gastos',f:function(){return irA('gastos','finanzas')}},
    {k:'medeben',t:'Me deben',i:'fiado',f:function(){return irA('fiado','medeben')}},
    {k:'deuda',t:'Una deuda',i:'pagos',f:function(){return AT.crear.nuevo('prestamo')}}]
};
function pintarAcciones(){
  var l=ACCIONES[PER&&PER.tipo()];
  $('#iniRapidas').hidden=!l||!AT.crear||!PER.tiene('negocio');
  if($('#iniRapidas').hidden)return;
  $('#iniAcciones').innerHTML=l.map(function(a){
    return '<button type="button" class="ini-acc-b" data-accion="'+a.k+'">'+ico(a.i)+'<span>'+esc(a.t)+'</span></button>';
  }).join('');
}
$('#iniAcciones').addEventListener('click',function(e){
  var b=e.target.closest('[data-accion]');if(!b||b.getAttribute('aria-disabled')==='true')return;
  var a=(ACCIONES[PER.tipo()]||[]).filter(function(x){return x.k===b.getAttribute('data-accion')})[0];if(!a)return;
  b.setAttribute('aria-disabled','true');
  a.f().catch(function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo abrir. Inténtalo otra vez.')});
});
function cent(v){var n=parseFloat(String(v==null?'':v).replace(/[$,\s]/g,''));return isFinite(n)&&n>0?Math.round(n*100):0}
var CLAVE_PREPARA='aprende-tecnologia:prepara';
/* Cada paso se marca solo al revisar tus páginas */
var PASOS=[
  {k:'corte',t:'Haz tu primer corte de caja',d:'Anota las ventas del día y cuenta la caja.',hecho:function(){
    return bloquesDe('corte').some(function(b){var v=b.attrs.ventas||{};return cent(v.efectivo)+cent(v.tarjeta)+cent(v.transferencia)+cent(v.otras)>0||String(b.attrs.contado||'').trim()!==''})},
    f:function(){return irA('corte')},b:'Hacer el corte'},
  {k:'gastos',t:'Anota tus gastos fijos',d:'Renta, luz, internet: una vez, y «Generar mes» los agrega cada mes.',hecho:function(){
    return bloquesDe('gastos').some(function(b){return (b.attrs.fijos||[]).some(function(f){return f&&(String(f.concepto||'').trim()||cent(f.monto))})})},
    f:function(){return irA('gastos')},b:'Anotar gastos'},
  {k:'fiado',t:'Anota a quién le fías',d:'Cada cliente con lo que se lleva y sus abonos.',hecho:function(){
    return bloquesDe('fiado').some(function(b){return (b.attrs.clientes||[]).some(function(c){return c&&String(c.nombre||'').trim()})})},
    f:function(){return irA('fiado')},b:'Abrir el fiado'},
  {k:'venta',t:'Haz tu primera nota de venta',d:'Con folio, para imprimirla o mandarla en PDF.',hecho:function(){
    return bloquesDe('venta').some(function(b){return (b.attrs.conceptos||[]).some(function(c){return c&&(String(c.desc||'').trim()||cent(c.precio))})})},
    f:function(){return AT.crear.nuevo('venta')},b:'Nueva venta'},
  {k:'respaldo',t:'Descarga un respaldo',d:'Una copia de todo en un archivo, por si cambias de celular.',hecho:function(){return !!AT.datos.ultimoRespaldo()},
    f:function(){return AT.datos.descargar().then(function(){AT.aviso('Respaldo descargado. Guárdalo en tu nube o en una memoria USB.');pintar()})},b:'Descargar respaldo'}
];
function pintarPrepara(){
  var caja=$('#iniPrepara'),oculta=false;
  try{oculta=localStorage.getItem(CLAVE_PREPARA)==='oculta'}catch(e){}
  caja.hidden=oculta||!PER||PER.tipo()!=='negocio'||!PER.tiene('negocio');
  if(caja.hidden)return;
  var hechos=0;
  $('#iniPrepLista').innerHTML=PASOS.map(function(p){
    var h=false;try{h=p.hecho()}catch(e){}
    if(h)hechos++;
    return '<li class="ini-prep-i'+(h?' hecho':'')+'"><span class="ini-prep-c" aria-hidden="true">'+(h?ico('check'):'')+'</span>'+
      '<span class="ini-prep-t"><b>'+esc(p.t)+'</b><small>'+(h?'Hecho.':esc(p.d))+'</small></span>'+
      (h?'<span class="vh">Hecho</span>':'<button class="btn" type="button" data-paso="'+p.k+'">'+esc(p.b)+'</button>')+'</li>';
  }).join('');
  $('#iniPrepN').textContent=hechos===PASOS.length?'¡Listo!':hechos+' de '+PASOS.length;
  $('#iniPrepBar').style.width=Math.round(hechos/PASOS.length*100)+'%';
}
$('#iniPrepLista').addEventListener('click',function(e){
  var b=e.target.closest('[data-paso]');if(!b||b.getAttribute('aria-disabled')==='true')return;
  var p=PASOS.filter(function(x){return x.k===b.getAttribute('data-paso')})[0];if(!p)return;
  b.setAttribute('aria-disabled','true');
  p.f().then(function(){b.removeAttribute('aria-disabled')},function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo. Inténtalo otra vez.')});
});
$('#iniPrepOcultar').addEventListener('click',function(){
  try{localStorage.setItem(CLAVE_PREPARA,'oculta')}catch(e){}
  pintarPrepara();$('#t-docs').focus();
  AT.aviso('Lista oculta. Todo lo que tiene está en «Crear» y en tus páginas.');
});

/* Cada grupo se pliega. Abiertos: los que tienen alguna lección empezada (o el primero, si no hay ninguna),
   hasta que abras o cierres uno: desde ahí se respeta lo que elegiste mientras sigas en la página. */
var expAbiertos=null;
function pintarExplorar(){
  var pronto=AT.catalogo.filter(function(g){return !g.lecciones.some(function(l){return l.archivo})});
  var grupos=AT.catalogo.filter(function(g){return pronto.indexOf(g)<0});
  function empezadas(g){return g.lecciones.filter(function(l){return l.archivo&&AT.avance.porcentaje(l.id)>0}).length}
  var alguna=grupos.some(function(g){return empezadas(g)>0});
  $('#explorar').innerHTML=grupos.map(function(g,i){
    var emp=empezadas(g),listas=g.lecciones.filter(function(l){return l.archivo}).length;
    var abierto=expAbiertos?expAbiertos.indexOf(g.grupo)>=0:emp>0||(!alguna&&i===0);
    return '<details class="exp-g" data-g="'+esc(g.grupo)+'"'+(abierto?' open':'')+'><summary class="exp-s">'+ico('chev-l','exp-ic')+
      '<h3 class="exp-t">'+esc(g.grupo)+'</h3><span class="exp-c">'+listas+(listas===1?' lección':' lecciones')+(emp?' · '+emp+(emp===1?' empezada':' empezadas'):'')+'</span></summary><ul class="exp">'+g.lecciones.map(function(l){
      var icono=ico(l.icono||'page');
      if(!l.archivo)return '<li><span class="exp-i soon">'+icono+'<span>'+esc(l.titulo)+'</span><em>Pronto</em></span></li>';
      var p=AT.avance.porcentaje(l.id);
      return '<li><a class="exp-i" href="'+url(l)+'">'+icono+'<span>'+esc(l.titulo)+'</span>'+
        '<span class="mini" aria-hidden="true"><i style="width:'+p+'%"></i></span><em>'+(p?p+'%':'Sin empezar')+'</em></a></li>';
    }).join('')+'</ul></details>';
  }).join('')+(pronto.length?
    '<div class="exp-g"><h3 class="exp-t">Próximos temas</h3><ul class="exp-pronto">'+pronto.map(function(g){
      return '<li><b>'+esc(g.grupo)+'</b><span>'+g.lecciones.length+(g.lecciones.length===1?' lección':' lecciones')+'</span></li>';
    }).join('')+'</ul></div>':'');
}

/* Instalar: el botón aparece si el navegador lo permite; en iPhone y iPad se explica cómo hacerlo */
function pintarInstalar(){
  var sec=$('#instalar'),btn=$('#instalarBtn'),txt=$('#instalarTxt');
  if(AT.app.instalada()){sec.hidden=true;return}
  if(AT.app.evento){
    sec.hidden=false;btn.hidden=false;
    txt.textContent='Ábrelo como una app, desde tu pantalla de inicio, y úsalo sin conexión.';
  }else if(AT.app.esIOS()){
    sec.hidden=false;btn.hidden=true;
    txt.textContent='En iPhone o iPad: toca Compartir y luego «Agregar a inicio». Así lo abres como una app y funciona sin conexión.';
  }else sec.hidden=true;
}
$('#instalarBtn').addEventListener('click',function(){
  AT.app.instalar().then(function(ok){if(ok)$('#instalar').hidden=true;else pintarInstalar()});
});
document.addEventListener('app-instalable',pintarInstalar);
document.addEventListener('app-instalada',function(){$('#instalar').hidden=true});

/* «toggle» no burbujea: se escucha en la fase de captura */
$('#explorar').addEventListener('toggle',function(){
  expAbiertos=Array.prototype.filter.call(document.querySelectorAll('#explorar details.exp-g'),function(d){return d.open}).map(function(d){return d.getAttribute('data-g')});
},true);
/* Proyectos: el primero, con su avance y un botón para empezar o seguir */
function pintarProyectos(){
  var c=$('#iniProyectos');if(!c)return;
  c.innerHTML=(AT.proyectos||[]).slice(0,1).map(function(p){
    var h=AT.proyectosAvance.hechas(p.id),pct=p.tareas?Math.round(h/p.tareas*100):0,fin=p.tareas&&h===p.tareas;
    return '<div class="ini-pj">'+ico(p.icono||'proyecto','pj-card-ic')+'<div class="pj-card-c"><h3>'+esc(p.titulo)+'</h3><p>'+esc(p.descripcion)+'</p>'+
      '<div class="pj-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></div>'+
      '<p class="pj-card-e">'+(fin?'Terminado':h?'Llevas '+pct+' %':p.nivel+' · '+p.duracion)+'</p>'+
      '<a class="btn pri" href="proyectos/'+esc(p.archivo)+'">'+(fin?'Ver el proyecto':h?'Continuar':'Empezar el proyecto')+'</a></div></div>';
  }).join('');
}
/* Rutas: la primera, con su avance y qué sigue */
function pintarRutas(){
  var c=$('#iniRutas');if(!c)return;
  c.innerHTML=(AT.caminos||[]).slice(0,1).map(function(r){
    var a=AT.avance.camino(r),pct=a.total?Math.round(a.terminadas/a.total*100):0,s=a.sig;
    var dest=s?(s.tipo==='proyecto'?'proyectos/'+s.archivo:LECC+s.archivo):'rutas.html#'+r.id;
    return '<div class="ini-rt">'+ico(r.icono||'ruta','pj-card-ic')+'<div class="pj-card-c"><h3>'+esc(r.titulo)+'</h3><p>'+esc(r.descripcion)+'</p>'+
      '<div class="pj-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></div>'+
      '<p class="pj-card-e">'+(a.terminadas?'Llevas '+pct+' % · '+a.terminadas+' de '+a.total+' terminados':esc(r.nivel)+' · '+r.modulos.length+' módulos')+'</p>'+
      '<div class="ini-rt-b">'+(s?'<a class="btn pri" href="'+esc(dest)+'">'+(s.pct||a.terminadas?'Sigue con':'Empieza por')+': '+esc(s.titulo)+'</a>':'')+
      '<a class="btn" href="rutas.html#'+esc(r.id)+'">Ver los módulos</a></div></div></div>';
  }).join('');
}
/* Páginas listas para usar (sin el módulo de estudio): un botón por plantilla, que la crea y la abre */
function pintarPlantillas(){
  var c=$('#iniPlantillas');if(!c||EST||!AT.crear||!AT.crear.plantillasInicio)return;
  c.innerHTML=AT.crear.plantillasInicio().map(function(k){
    var t=AT.tiposDoc[k];
    return '<button type="button" class="ini-pl" data-nuevo="'+esc(k)+'">'+ico(t.icono)+'<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small></span></button>';
  }).join('');
}
$('#iniPlantillas').addEventListener('click',function(e){
  var b=e.target.closest('[data-nuevo]');
  if(!b||b.getAttribute('aria-disabled')==='true')return;
  b.setAttribute('aria-disabled','true');
  AT.crear.nuevo(b.getAttribute('data-nuevo')).catch(function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo crear la página. Inténtalo otra vez.')});
});
/* Saludo: con negocio, su nombre y la fecha; si no, «Buenos días» y tu nombre */
function pintarSaludo(){
  var nombre=PER?PER.nombre():'',fecha=new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
  if(PER&&PER.tipo()==='negocio'&&nombre){
    $('#saludo').textContent=nombre;
    $('#iniSub').textContent=saludo()+' · '+fecha;
  }else{
    $('#saludo').textContent=saludo()+(nombre?', '+nombre:'');
    $('#iniSub').textContent=EST?'Qué quieres aprender hoy.':fecha.charAt(0).toUpperCase()+fecha.slice(1);
  }
  if(!EST)$('#t-docs').textContent='Tus páginas';
}
function pintar(){pintarContinuar();pintarRutas();pintarProyectos();pintarRespaldo();pintarDocs();pintarNotas();pintarExplorar();pintarInstalar();pintarPrepara()}
function recargar(){Promise.all([cargarNotas(),cargarDocs()]).then(pintar)}
pintarSaludo();
pintarAcciones();
pintarPlantillas();
pintar();
recargar();
AT.avance.on(pintar);
AT.datos.on(function(c){if(c.almacen==='notas'||c.almacen==='documentos'||c.almacen==='*')recargar()});
/* Al volver con «atrás» desde una lección, el navegador puede mostrar una copia vieja: se actualiza */
window.addEventListener('pageshow',function(e){if(e.persisted)location.reload()});
})();
