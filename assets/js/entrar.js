/* OneBook: «Crea tu empresa» (entrar.html), la etapa A de entrar: sin cuenta y sin servidor.
   Un asistente en una sola página (el paso de elegir perfil se salta mientras haya uno solo):
     1. ¿Para qué usarás OneBook? (solo si hay más de un perfil)
     2. Tu empresa: nombre, giro, teléfono, tu nombre (quedas como propietario) y «Tengo empleados».
     3. Departamentos: los sugeridos según el giro (AT.empresa.sugeridos), ya marcados, y los que agregues.
     4. ¿Con qué empiezas? Las páginas sugeridas según el giro (AT.crear.sugeridas), ya marcadas.
   «Crear mi empresa» guarda el perfil (AT.perfil.guardar) y la empresa (AT.empresa.crear: tú como propietario y
   responsable de cada departamento), crea las páginas marcadas y abre inicio.html con lo que traiga la dirección
   (por ejemplo #guardar-pagos desde la bienvenida, o #crear).
   - ?perfil=negocio elige el perfil y empieza en el paso 2.
   - ?editar (desde «Tus datos» › «Cambiar tu espacio», solo para quien administra la empresa) abre lo que ya tienes:
     sin el paso de departamentos (se cambian en «Tu empresa»); en el último paso se encienden o apagan los módulos
     y las páginas sugeridas vienen sin marcar.
   - «Restáuralo» importa un respaldo; si trae perfil, va directo al Inicio; si no, sigue con el asistente.
   perfil.js manda al Inicio a quien ya tiene espacio (salvo con ?editar). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,P=AT.perfil,E=AT.empresa;
var EDITAR=/[?&]editar\b/.test(location.search),actual=P.actual();
var param=(/[?&]perfil=([a-z]+)/.exec(location.search)||[])[1];
var ICONOS={negocio:'pagos'};
/* Con un solo perfil no se pregunta: se empieza en «Tu empresa». Al editar no hay paso de departamentos */
var UNO=Object.keys(P.PERFILES).length===1;
var PASOS=[1,2,3,4].filter(function(n){return !(n===1&&UNO)&&!(n===3&&EDITAR)});
var paso=PASOS[0],form=$('#enForm');

/* Cambiar el espacio es cosa de quien administra la empresa */
if(EDITAR&&E&&E.existe()&&!E.esAdmin()){
  form.hidden=true;
  form.insertAdjacentHTML('afterend','<div class="en-caja"><h1>Tu espacio</h1><p class="en-txt">Solo quien administra la empresa puede cambiar el espacio y sus herramientas.</p>'+
    '<p><a class="btn pri" href="inicio.html">Volver al Inicio</a></p></div>');
  return;
}

/* ---------- Paso 1: los perfiles ---------- */
$('#enPerfiles').insertAdjacentHTML('beforeend',Object.keys(P.PERFILES).map(function(k){
  var p=P.PERFILES[k];
  return '<label class="en-op"><input type="radio" name="perfil" value="'+k+'">'+ico(ICONOS[k])+'<span><b>'+esc(p.nombre)+'</b><small>'+esc(p.desc)+'</small></span></label>';
}).join(''));
$('#enGiro').innerHTML=P.GIROS.map(function(g){return '<option value="'+g[0]+'">'+esc(g[1])+'</option>'}).join('');
function perfilElegido(){var r=$('input[name="perfil"]:checked',form);return r?r.value:''}
function elegirPerfil(k){var r=$('input[name="perfil"][value="'+k+'"]',form);if(r)r.checked=true}

/* Lo que ya tienes, al editar */
if(EDITAR&&actual){
  elegirPerfil(actual.perfil);
  /* Al editar, los módulos (también recursos humanos) se eligen en el último paso */
  $('.en-rh').hidden=true;
  var emp=E&&E.leer(),yo=E&&E.activa();
  if(actual.negocio){$('#enNegocio').value=emp&&emp.nombre||actual.negocio.nombre;$('#enGiro').value=actual.negocio.giro;$('#enTel').value=emp?emp.telefono:actual.negocio.telefono}
  $('#enNombre').value=yo&&yo.nombre||AT.datos.yo().nombre||actual.nombre;
  document.title='Tu espacio · OneBook';
  $('#enT1').textContent='¿Para qué usas OneBook?';
  $('#enRestaurarP').hidden=true;
}else if(P.PERFILES[param])elegirPerfil(param);
if(UNO&&!perfilElegido())elegirPerfil(Object.keys(P.PERFILES)[0]);

/* ---------- Paso 3: departamentos ---------- */
var pintadoDeps='';
function opcionDepto(nombre,marcado){
  return '<label class="en-op en-dep"><input type="checkbox" name="depto" value="'+esc(nombre)+'"'+(marcado?' checked':'')+'>'+ico('deptos')+'<span><b>'+esc(nombre)+'</b></span></label>';
}
function norma(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()}
function pintarDeptos(){
  var giro=$('#enGiro').value,rh=$('#enRh').checked,clave=giro+'|'+rh;
  if(clave===pintadoDeps)return;
  pintadoDeps=clave;
  /* Se conservan los que agregaste a mano (y lo que desmarcaste de los sugeridos) */
  var antes={};$$('input[name="depto"]',form).forEach(function(x){antes[norma(x.value)]={v:x.value,c:x.checked,mano:x.hasAttribute('data-mano')}});
  var sug=E.sugeridos(giro,rh),h=sug.map(function(n){var a=antes[norma(n)];return opcionDepto(n,a?a.c:true)});
  Object.keys(antes).forEach(function(k){if(antes[k].mano&&!sug.some(function(n){return norma(n)===k}))h.push(opcionDepto(antes[k].v,antes[k].c).replace('name="depto"','name="depto" data-mano'))});
  $$('.en-op',$('#enDeptos')).forEach(function(x){x.remove()});
  $('#enDeptos').insertAdjacentHTML('beforeend',h.join(''));
}
function agregarDepto(){
  var i=$('#enDepNuevo'),n=i.value.replace(/\s+/g,' ').trim();
  if(!n){mensaje('Escribe el nombre del departamento.',true);i.focus();return}
  var ya=$$('input[name="depto"]',form).filter(function(x){return norma(x.value)===norma(n)})[0];
  if(ya){ya.checked=true;mensaje('Ese departamento ya está en la lista.');i.value='';i.focus();return}
  if($$('input[name="depto"]',form).length>=30){mensaje('Por ahora, hasta 30 departamentos; agrega más en «Tu empresa».',true);return}
  $('#enDeptos').insertAdjacentHTML('beforeend',opcionDepto(n,true).replace('name="depto"','name="depto" data-mano'));
  i.value='';i.focus();
  mensaje('Departamento '+n+' agregado.');
}
$('#enDepAgregar').addEventListener('click',agregarDepto);
$('#enDepNuevo').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();agregarDepto()}});

/* ---------- Paso 4: páginas para empezar y, al editar, los módulos ---------- */
var pintado4='';
function pintarPaso4(){
  var k=perfilElegido(),giro=$('#enGiro').value,rh=k==='negocio'&&!EDITAR&&$('#enRh').checked,clave=k+'|'+giro+'|'+rh;
  if(clave===pintado4)return;
  pintado4=clave;
  var sug=AT.crear.sugeridas(k,giro,rh);
  $$('.en-op',$('#enPlantillas')).forEach(function(x){x.remove()});
  $('#enPlantillas').insertAdjacentHTML('beforeend',sug.map(function(s){
    var t=AT.tiposDoc[s.tipo];
    return '<label class="en-op en-pl"><input type="checkbox" name="plantilla" value="'+s.tipo+'"'+(s.marcado&&!EDITAR?' checked':'')+'>'+ico(t.icono)+
      '<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small></span></label>';
  }).join(''));
  $('#enT4Txt').textContent=EDITAR?'Si quieres, crea también algunas de estas páginas. Lo que ya tienes no cambia.':
    'Te creamos estas páginas para empezar. Quita las que no quieras; después puedes crear más con «Crear».';
  if(EDITAR){
    var mods=actual&&actual.perfil===k?actual.modulos:P.PERFILES[k].modulos;
    $$('.en-op',$('#enModulos')).forEach(function(x){x.remove()});
    $('#enModulos').insertAdjacentHTML('beforeend',Object.keys(P.MODULOS).map(function(m){
      var md=P.MODULOS[m];
      return '<label class="en-op en-mod"><input type="checkbox" name="modulo" value="'+m+'"'+(mods.indexOf(m)>=0?' checked':'')+'>'+
        '<span><b>'+esc(md.nombre)+'</b><small>'+esc(md.desc)+'</small></span></label>';
    }).join(''));
    $('#enModulos').hidden=false;
  }
}

/* ---------- Pasos ---------- */
function mostrar(n,foco){
  paso=n;
  $$('.en-sec',form).forEach(function(s){s.hidden=+s.getAttribute('data-paso')!==n});
  if(n===3)pintarDeptos();
  if(n===4)pintarPaso4();
  var i=PASOS.indexOf(n);
  $('#enPaso').textContent='Paso '+(i+1)+' de '+PASOS.length;
  $('#enAvance').style.width=Math.round((i+1)/PASOS.length*100)+'%';
  $('#enAtras').hidden=i===0;
  $('#enSig').textContent=i<PASOS.length-1?'Siguiente':EDITAR?'Guardar cambios':'Crear mi empresa';
  mensaje('');
  if(foco!==false){var h=$('#enT'+n);h.focus({preventScroll:true});window.scrollTo(0,0)}
}
function siguiente(){return PASOS[PASOS.indexOf(paso)+1]}
function mensaje(t,error){var m=$('#enMsg');m.textContent=t;m.classList.toggle('error',!!error)}

$('#enAtras').addEventListener('click',function(){var i=PASOS.indexOf(paso);if(i>0)mostrar(PASOS[i-1])});
form.addEventListener('submit',function(e){
  e.preventDefault();
  if($('#enSig').getAttribute('aria-disabled')==='true')return;
  if(paso===1){
    if(!perfilElegido()){mensaje('Elige una opción para seguir.',true);var r=$('input[name="perfil"]',form);if(r)r.focus();return}
  }else if(paso===2){
    if(!$('#enNegocio').value.trim()){mensaje('Escribe el nombre de tu empresa.',true);$('#enNegocio').focus();return}
    if(!$('#enNombre').value.trim()){mensaje('Escribe tu nombre: así te verá tu equipo.',true);$('#enNombre').focus();return}
  }
  if(siguiente())mostrar(siguiente());
  else terminar();
});
/* Cambiar de perfil en el paso 1 deja el último paso por rehacer */
form.addEventListener('change',function(e){if(e.target.name==='perfil'){mensaje('');pintado4=''}});

/* ---------- Crear (o guardar) la empresa ---------- */
function guardarEmpresa(nombre,giro,tel,tuNombre){
  if(EDITAR){
    if(E.existe())E.cambiarDatos({nombre:nombre,giro:giro,telefono:tel});
    AT.datos.cambiarYo({nombre:tuNombre});
    return;
  }
  var deps=$$('input[name="depto"]:checked',form).map(function(x){return x.value});
  if(!E.existe()||E.automatica()){E.crear({nombre:nombre,giro:giro,telefono:tel,tuNombre:tuNombre,departamentos:deps});return}
  /* Ya había una empresa (por ejemplo, de un respaldo): se le agregan los datos y los departamentos que falten */
  if(!E.esAdmin())return;
  E.cambiarDatos({nombre:nombre,giro:giro,telefono:tel});
  var ya=E.departamentos().map(function(d){return norma(d.nombre)});
  deps.forEach(function(n){if(ya.indexOf(norma(n))<0)E.agregarDepto({nombre:n})});
}
function terminar(){
  var k=perfilElegido(),boton=$('#enSig');
  var modulos=EDITAR?$$('input[name="modulo"]:checked',form).map(function(x){return x.value}):
    P.PERFILES[k].modulos.concat(k==='negocio'&&$('#enRh').checked?['rh']:[]);
  var nombre=$('#enNegocio').value,giro=$('#enGiro').value,tel=$('#enTel').value,tuNombre=$('#enNombre').value;
  var p=P.guardar({perfil:k,modulos:modulos,nombre:tuNombre,creado:actual&&actual.creado,
    negocio:k==='negocio'?{nombre:nombre,giro:giro,telefono:tel}:null});
  if(!p){mensaje('No se pudo guardar tu empresa en este navegador. Revisa que no esté en modo privado o sin espacio.',true);return}
  try{guardarEmpresa(nombre,giro,tel,tuNombre)}
  catch(err){mensaje(err&&err.message||'No se pudo guardar tu empresa.',true);return}
  var tipos=$$('input[name="plantilla"]:checked',form).map(function(x){return x.value});
  boton.setAttribute('aria-disabled','true');
  mensaje(tipos.length?'Creando tus páginas…':'Guardando…');
  /* Se pide aquí, durante el clic: algunos navegadores solo lo permiten así */
  AT.datos.pedirPersistencia();
  tipos.reduce(function(pr,t){
    return pr.then(function(){var d=AT.crear.armar(t,{sala:AT.empresa&&AT.empresa.GENERAL});return d?AT.datos.documentos.guardar(d,{conservarFecha:true}):null});
  },Promise.resolve()).then(function(){
    location.href='inicio.html'+location.hash;
  },function(err){
    boton.removeAttribute('aria-disabled');
    mensaje('Tu empresa se guardó, pero no se pudieron crear las páginas: '+(err&&err.message||'inténtalo otra vez')+'.',true);
  });
}

/* ---------- Restaurar un respaldo ---------- */
$('#enRestaurar').addEventListener('click',function(){$('#enArchivo').click()});
$('#enArchivo').addEventListener('change',function(){
  var f=this.files&&this.files[0];this.value='';
  if(!f)return;
  if(f.size>50*1024*1024){mensaje('El archivo es demasiado grande para ser un respaldo de OneBook.',true);return}
  mensaje('Restaurando…');
  f.text().then(function(t){
    var datos;
    try{datos=JSON.parse(t)}catch(e){throw new Error('El archivo no es un respaldo de OneBook.')}
    return AT.datos.importar(datos);
  }).then(function(res){
    var n=res.documentos===1?'1 documento':res.documentos+' documentos';
    if(res.perfil){mensaje('Listo: se restauraron '+n+' y tu espacio. Abriendo tu Inicio…');location.href='inicio.html'+location.hash;return}
    mostrar(PASOS[0],false);
    var e=E&&E.leer();
    if(e){$('#enNegocio').value=e.nombre;if(e.giro)$('#enGiro').value=e.giro;$('#enTel').value=e.telefono;var y=E.activa();if(y)$('#enNombre').value=y.nombre}
    mensaje('Listo: se restauraron '+n+'. '+(UNO?'Ahora cuéntanos de tu empresa.':'Ahora elige para qué usarás OneBook.'));
    var r=UNO?$('#enNegocio'):$('input[name="perfil"]',form);if(r)r.focus();
  }).catch(function(err){mensaje(err&&err.message||'No se pudo restaurar el respaldo.',true)});
});

/* Con un solo perfil (o ya elegido al crear) se empieza en «Tu empresa» */
mostrar(PASOS[0]===1&&(!perfilElegido()||EDITAR)?1:2,false);
})();
