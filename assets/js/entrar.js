/* OneBook: «Crea tu espacio» (entrar.html), la etapa A de entrar: sin cuenta y sin servidor.
   Un asistente de tres pasos en una sola página:
     1. ¿Para qué usarás OneBook? Mi negocio, Mis finanzas y notas o Estudiar (Mi escuela, pronto).
     2. Tu negocio (nombre, giro y teléfono; en pesos mexicanos) o tu nombre, para saludarte.
     3. ¿Con qué empiezas? Las páginas sugeridas según el perfil y el giro (AT.crear.sugeridas), ya marcadas.
   «Crear mi espacio» guarda el perfil (AT.perfil.guardar), crea las páginas marcadas y abre inicio.html con lo que
   traiga la dirección (por ejemplo #guardar-pagos desde la bienvenida, o #crear).
   - ?perfil=negocio|personal|estudio elige el perfil y empieza en el paso 2.
   - ?editar (desde «Tus datos» › «Cambiar tu espacio») abre lo que ya tienes: en el paso 3 se encienden o apagan
     los módulos y las páginas sugeridas vienen sin marcar.
   - «Restáuralo» importa un respaldo; si trae perfil, va directo al Inicio; si no, sigue con el paso 1.
   perfil.js manda al Inicio a quien ya tiene espacio (salvo con ?editar). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,P=AT.perfil;
var EDITAR=/[?&]editar\b/.test(location.search),actual=P.actual();
var param=(/[?&]perfil=([a-z]+)/.exec(location.search)||[])[1];
var ICONOS={negocio:'pagos',personal:'notas',estudio:'libreta'};
var paso=1,form=$('#enForm');

/* ---------- Paso 1: los perfiles ---------- */
$('#enPerfiles').insertAdjacentHTML('beforeend',Object.keys(P.PERFILES).map(function(k){
  var p=P.PERFILES[k];
  return '<label class="en-op"><input type="radio" name="perfil" value="'+k+'">'+ico(ICONOS[k])+'<span><b>'+esc(p.nombre)+'</b><small>'+esc(p.desc)+'</small></span></label>';
}).join('')+
  '<div class="en-op en-pronto">'+ico('clase')+'<span><b>Mi escuela</b><small>Grupos, tareas y exámenes con tus alumnos. <a href="estudiantes.html?conoce#lpEscuelas">Lo estamos preparando</a>.</small></span></div>');
$('#enGiro').innerHTML=P.GIROS.map(function(g){return '<option value="'+g[0]+'">'+esc(g[1])+'</option>'}).join('');
function perfilElegido(){var r=$('input[name="perfil"]:checked',form);return r?r.value:''}
function elegirPerfil(k){var r=$('input[name="perfil"][value="'+k+'"]',form);if(r)r.checked=true}

/* Lo que ya tienes, al editar */
if(EDITAR&&actual){
  elegirPerfil(actual.perfil);
  if(actual.negocio){$('#enNegocio').value=actual.negocio.nombre;$('#enGiro').value=actual.negocio.giro;$('#enTel').value=actual.negocio.telefono}
  $('#enNombre').value=actual.nombre;
  document.title='Tu espacio · OneBook';
  $('#enT1').textContent='¿Para qué usas OneBook?';
  $('#enRestaurarP').hidden=true;
}else if(P.PERFILES[param])elegirPerfil(param);

/* ---------- Paso 3: páginas para empezar y, al editar, los módulos ---------- */
var pintado3='';
function pintarPaso3(){
  var k=perfilElegido(),giro=$('#enGiro').value,clave=k+'|'+giro;
  if(clave===pintado3)return;
  pintado3=clave;
  var sug=AT.crear.sugeridas(k,giro);
  $$('.en-op',$('#enPlantillas')).forEach(function(x){x.remove()});
  $('#enPlantillas').insertAdjacentHTML('beforeend',sug.map(function(s){
    var t=AT.tiposDoc[s.tipo];
    return '<label class="en-op en-pl"><input type="checkbox" name="plantilla" value="'+s.tipo+'"'+(s.marcado&&!EDITAR?' checked':'')+'>'+ico(t.icono)+
      '<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small></span></label>';
  }).join(''));
  $('#enT3Txt').textContent=EDITAR?'Si quieres, crea también algunas de estas páginas. Lo que ya tienes no cambia.':
    k==='estudio'?'Las lecciones, las rutas y los proyectos ya están en la barra lateral. Si quieres, empieza también con alguna de estas páginas.':
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
  var k=perfilElegido(),neg=k==='negocio';
  if(n===2){
    $('#enNegocioCampos').hidden=!neg;$('#enPersonaCampos').hidden=neg;
    $('#enT2').textContent=neg?'Tu negocio':'¿Cómo te llamas?';
  }
  if(n===3)pintarPaso3();
  $('#enPaso').textContent='Paso '+n+' de 3';
  $('#enAvance').style.width=Math.round(n/3*100)+'%';
  $('#enAtras').hidden=n===1;
  $('#enSig').textContent=n<3?'Siguiente':EDITAR?'Guardar cambios':'Crear mi espacio';
  mensaje('');
  if(foco!==false){var h=$('#enT'+n);h.focus({preventScroll:true});window.scrollTo(0,0)}
}
function mensaje(t,error){var m=$('#enMsg');m.textContent=t;m.classList.toggle('error',!!error)}

$('#enAtras').addEventListener('click',function(){if(paso>1)mostrar(paso-1)});
form.addEventListener('submit',function(e){
  e.preventDefault();
  if($('#enSig').getAttribute('aria-disabled')==='true')return;
  if(paso===1){
    if(!perfilElegido()){mensaje('Elige una opción para seguir.',true);var r=$('input[name="perfil"]',form);if(r)r.focus();return}
    mostrar(2);
  }else if(paso===2)mostrar(3);
  else terminar();
});
/* Cambiar de perfil en el paso 1 deja el paso 3 por rehacer */
form.addEventListener('change',function(e){if(e.target.name==='perfil'){mensaje('');pintado3=''}});

/* ---------- Crear (o guardar) el espacio ---------- */
function terminar(){
  var k=perfilElegido(),boton=$('#enSig');
  var modulos=EDITAR?$$('input[name="modulo"]:checked',form).map(function(x){return x.value}):P.PERFILES[k].modulos;
  var p=P.guardar({perfil:k,modulos:modulos,nombre:$('#enNombre').value,creado:actual&&actual.creado,
    negocio:k==='negocio'?{nombre:$('#enNegocio').value,giro:$('#enGiro').value,telefono:$('#enTel').value}:null});
  if(!p){mensaje('No se pudo guardar tu espacio en este navegador. Revisa que no esté en modo privado o sin espacio.',true);return}
  var tipos=$$('input[name="plantilla"]:checked',form).map(function(x){return x.value});
  boton.setAttribute('aria-disabled','true');
  mensaje(tipos.length?'Creando tus páginas…':'Guardando…');
  /* Se pide aquí, durante el clic: algunos navegadores solo lo permiten así */
  AT.datos.pedirPersistencia();
  tipos.reduce(function(pr,t){
    return pr.then(function(){var d=AT.crear.armar(t);return d?AT.datos.documentos.guardar(d,{conservarFecha:true}):null});
  },Promise.resolve()).then(function(){
    location.href='inicio.html'+location.hash;
  },function(err){
    boton.removeAttribute('aria-disabled');
    mensaje('Tu espacio se guardó, pero no se pudieron crear las páginas: '+(err&&err.message||'inténtalo otra vez')+'.',true);
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
    mostrar(1,false);
    mensaje('Listo: se restauraron '+n+'. Ahora elige para qué usarás OneBook.');
    var r=$('input[name="perfil"]',form);if(r)r.focus();
  }).catch(function(err){mensaje(err&&err.message||'No se pudo restaurar el respaldo.',true)});
});

mostrar(perfilElegido()&&!EDITAR?2:1,false);
})();
