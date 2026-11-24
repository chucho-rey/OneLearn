/* OneBook: ventana «Tus datos».
   Explica dónde se guarda lo que escribes, cuánto espacio ocupa, si el navegador lo protege,
   y permite descargar un respaldo e importarlo. Se abre desde «Tus datos» en la barra lateral.
   También la ventana «Papelera» (fase F5): las páginas que eliminaste, para recuperarlas o borrarlas para siempre
   (se abre desde «Tus datos», desde «Papelera» al final de tus páginas o con cualquier [data-papelera]).
   Usa AT.datos (datos.js). Expone AT.tusDatos.abrir() y AT.papelera.abrir(). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico;
var dlg=null,abridor=null;

function mb(b){
  if(b<1024*1024)return AT.fmt(Math.max(1,Math.round(b/1024)))+' KB';
  if(b<1024*1024*1024)return AT.fmt(b/1024/1024,b<10*1024*1024?1:0)+' MB';
  return AT.fmt(b/1024/1024/1024,b<10*1024*1024*1024?1:0)+' GB';
}
/* Porcentaje legible: «menos de 0.1 %» en lugar de «0 %» cuando casi no se usa nada */
function pct(x){
  if(x<0.1)return 'menos de 0.1 %';
  return AT.fmt(x,x<10?1:0)+' %';
}
function hace(iso){
  if(!iso)return '';
  var d=(Date.now()-new Date(iso).getTime())/864e5;
  if(d<1)return 'hoy';
  if(d<2)return 'ayer';
  return 'hace '+Math.floor(d)+' días';
}
function plural(n,uno,varios){return n===1?'1 '+uno:AT.fmt(n)+' '+varios}

function crear(){
  dlg=document.createElement('dialog');
  dlg.className='atajos tus-datos';
  dlg.setAttribute('aria-labelledby','tdT');
  dlg.innerHTML='<div class="at-h"><h2 id="tdT">Tus datos</h2>'+
    '<button class="lec-x" type="button" data-td="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<p class="td-p">Lo que escribes en OneBook se guarda solo en este navegador, en este dispositivo. No se sube a ningún servidor.</p>'+
    '<div class="td-sec td-espacio" id="tdEspacio"></div>'+
    '<dl class="td-res" id="tdRes"></dl>'+
    '<div class="td-esp" id="tdEsp" hidden><div class="td-bar" aria-hidden="true"><i id="tdBar"></i></div>'+
      '<p class="td-p td-nota" id="tdNotaEsp"></p></div>'+
    '<div class="td-sec" id="tdProt"></div>'+
    '<div class="td-sec" id="tdPap"></div>'+
    '<div class="td-sec"><h3>Respaldo</h3>'+
      '<p class="td-p">Descarga una copia de todo en un archivo y guárdala en otro lugar, como tu nube o una memoria USB. Con ella recuperas tus datos en otro navegador o si borras los de este.</p>'+
      '<p class="td-p td-ult" id="tdUlt"></p>'+
      '<div class="td-bt"><button class="btn pri" type="button" data-td="descargar">Descargar respaldo</button>'+
      '<button class="btn" type="button" data-td="importar">Importar respaldo</button>'+
      '<input type="file" accept=".json,application/json" id="tdArchivo" hidden></div>'+
      '<p class="td-msg" id="tdMsg" role="status"></p>'+
    '</div>';
  document.body.appendChild(dlg);
  dlg.addEventListener('click',function(e){
    if(e.target===dlg){cerrar();return}
    var b=e.target.closest('[data-td]');
    if(!b)return;
    var a=b.getAttribute('data-td');
    if(a==='cerrar')cerrar();
    else if(a==='descargar'){
      AT.datos.pedirPersistencia();
      AT.datos.descargar().then(function(d){
        mensaje('Listo: se descargó '+plural(d.documentos.length,'documento','documentos')+', '+plural(d.notas.length,'nota','notas')+' y '+plural(d.marcadores.length,'marcador','marcadores')+'.',false);
        pintar();
      },function(){mensaje('No se pudo crear el respaldo. Inténtalo otra vez.',true)});
    }else if(a==='importar')$('#tdArchivo',dlg).click();
    else if(a==='proteger')AT.datos.pedirPersistencia().then(pintar);
    else if(a==='papelera'){cerrar();abrirPapelera()}
  });
  $('#tdArchivo',dlg).addEventListener('change',function(){
    var f=this.files&&this.files[0];
    this.value='';
    if(!f)return;
    if(f.size>50*1024*1024){mensaje('El archivo es demasiado grande para ser un respaldo de OneBook.',true);return}
    mensaje('Importando…',false);
    f.text().then(function(t){
      var datos;
      try{datos=JSON.parse(t)}catch(e){throw new Error('El archivo no es un respaldo de OneBook.')}
      return AT.datos.importar(datos);
    }).then(function(r){
      var n=r.documentos+r.notas+r.marcadores+(r.plantillas||0);
      if(!n&&!r.avance)mensaje('No había nada nuevo: todo lo del respaldo ya estaba aquí.',false);
      else mensaje('Se recuperaron '+plural(r.documentos,'documento','documentos')+', '+plural(r.notas,'nota','notas')+' y '+plural(r.marcadores,'marcador','marcadores')+(r.plantillas?', '+plural(r.plantillas,'plantilla','plantillas'):'')+(r.avance?', y tu avance de lectura':'')+'. Lo que ya tenías y era más reciente se conservó.',false);
      pintar();
    }).catch(function(e){mensaje(e&&e.message||'No se pudo importar el archivo.',true)});
  });
  dlg.addEventListener('close',function(){
    if(abridor&&document.contains(abridor))abridor.focus({preventScroll:true});
  });
}
function mensaje(t,error){
  var m=$('#tdMsg',dlg);
  m.textContent=t;
  m.classList.toggle('err',!!error);
}
/* Tu espacio: el perfil, el negocio y los módulos encendidos, con el enlace para cambiarlos (entrar.html?editar) */
function pintarEspacio(){
  var caja=$('#tdEspacio',dlg),P=AT.perfil,p=P&&P.actual();
  if(!p){caja.hidden=true;return}
  var mods=p.modulos.map(function(m){return P.MODULOS[m].nombre}).join(', ')||'Solo lo básico';
  var neg=p.negocio&&p.negocio.nombre?' · '+esc(p.negocio.nombre)+' ('+esc(P.nombreGiro(p.negocio.giro))+')':'';
  caja.hidden=false;
  caja.innerHTML='<h3>Tu espacio</h3><p class="td-p"><b>'+esc(P.PERFILES[p.perfil].nombre)+'</b>'+neg+'. Herramientas: '+esc(mods)+'.</p>'+
    '<div class="td-bt"><a class="btn" href="'+AT.rutas.raiz+'entrar.html?editar">Cambiar tu espacio</a></div>';
}
function pintar(){
  pintarEspacio();
  AT.datos.papelera.todos().then(function(l){
    $('#tdPap',dlg).innerHTML='<h3>Papelera</h3><p class="td-p">'+(l.length?plural(l.length,'página','páginas')+' en la papelera. Se borran solas a los '+AT.datos.papelera.DIAS+' días.':'La papelera está vacía.')+'</p>'+
      (l.length?'<div class="td-bt"><button class="btn" type="button" data-td="papelera">Ver la papelera</button></div>':'');
  });
  Promise.all([AT.datos.documentos.todos(),AT.datos.notas.todas(),AT.datos.marcadores.todos(),AT.datos.espacio(),AT.datos.persistente()]).then(function(r){
    var notas=r[1].filter(function(n){return n.texto&&n.texto.trim()}).length,esp=r[3],pers=r[4];
    $('#tdRes',dlg).innerHTML=
      '<div><dt>Documentos</dt><dd>'+AT.fmt(r[0].length)+'</dd></div>'+
      '<div><dt>Notas</dt><dd>'+AT.fmt(notas)+'</dd></div>'+
      '<div><dt>Marcadores</dt><dd>'+AT.fmt(r[2].length)+'</dd></div>'+
      (esp?'<div><dt>Espacio usado</dt><dd>'+mb(esp.usado)+'</dd></div>':'')+
      (esp&&esp.cuota?'<div><dt>Disponible</dt><dd>'+mb(Math.max(0,esp.cuota-esp.usado))+'</dd></div>':'');
    /* La cuota es lo que el navegador le reserva a OneBook; depende del espacio libre del dispositivo */
    $('#tdEsp',dlg).hidden=!esp;
    if(esp){
      var uso=esp.cuota?Math.min(100,esp.usado/esp.cuota*100):0;
      var bar=$('#tdBar',dlg);
      bar.style.width=esp.cuota?Math.max(uso,1)+'%':'0';
      bar.classList.toggle('lleno',uso>=80);
      $('#tdEsp .td-bar',dlg).hidden=!esp.cuota;
      $('#tdNotaEsp',dlg).textContent=(esp.cuota?'Usas '+pct(uso)+' de los '+mb(esp.cuota)+' que el navegador le reserva a OneBook en este dispositivo (cambia según el espacio libre). ':'')+
        'Incluye la copia de OneBook que permite usarlo sin conexión.';
    }
    var prot=$('#tdProt',dlg);
    if(pers===true)prot.innerHTML='<p class="td-p td-ok">'+ico('marcador')+'<span><b>Protegidos.</b> El navegador no los borrará aunque se quede sin espacio.</span></p>';
    else if(pers===false)prot.innerHTML='<p class="td-p"><b>Sin proteger.</b> Si el dispositivo se queda sin espacio, el navegador podría borrarlos. Puedes pedirle que los conserve (algunos navegadores lo deciden solos, según cuánto usas OneBook).</p>'+
      '<button class="btn" type="button" data-td="proteger">Pedir que los conserve</button>';
    else prot.innerHTML='';
    var u=AT.datos.ultimoRespaldo();
    $('#tdUlt',dlg).textContent=u?'Último respaldo: '+hace(u)+'.':'Todavía no has descargado ningún respaldo.';
  });
}
function abrir(){
  if(!dlg)crear();
  abridor=document.activeElement;
  mensaje('',false);
  pintar();
  if(AT.setNav)AT.setNav(false);
  dlg.showModal();
}
function cerrar(){if(dlg&&dlg.open)dlg.close()}
AT.tusDatos={abrir:abrir,cerrar:cerrar};
var b=$('#sideDatos');
if(b)b.addEventListener('click',abrir);

/* ---------- Papelera ---------- */
var $$=AT.$$,pap=null,papAbridor=null,papLista=[];
function diasQuedan(d){return Math.max(1,AT.datos.papelera.DIAS-Math.floor((Date.now()-new Date(d.eliminado).getTime())/864e5))}
function crearPapelera(){
  pap=document.createElement('dialog');
  pap.className='atajos pap-dlg';
  pap.setAttribute('aria-labelledby','papT');
  pap.innerHTML='<div class="at-h"><h2 id="papT">Papelera</h2>'+
    '<button class="lec-x" type="button" data-pap="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<p class="td-p">Las páginas que eliminaste. Recupéralas o bórralas para siempre; las que llevan '+AT.datos.papelera.DIAS+' días aquí se borran solas.</p>'+
    '<ul class="pap-l" id="papL"></ul>'+
    '<div class="td-bt" id="papBt"></div>'+
    '<p class="td-msg" id="papMsg" role="status"></p>';
  document.body.appendChild(pap);
  pap.addEventListener('click',function(e){
    if(e.target===pap){pap.close();return}
    var b=e.target.closest('[data-pap]');if(!b)return;
    var a=b.getAttribute('data-pap'),id=b.getAttribute('data-id'),d=papLista.filter(function(x){return x.id===id})[0];
    if(a==='cerrar')pap.close();
    else if(a==='restaurar'&&d)AT.datos.papelera.restaurar(id).then(function(){
      papMsg('Se recuperó «'+(d.titulo||'Sin título')+'». Ya está en tus páginas.');pintarPapelera(id);
    },function(){papMsg('No se pudo recuperar. Inténtalo otra vez.')});
    else if(a==='borrar'&&d){
      /* Borrar para siempre pide confirmar ahí mismo */
      var fila=b.closest('li');
      $('.pap-b',fila).innerHTML='<span class="pap-seguro">¿Borrarla para siempre?</span>'+
        '<button class="btn danger" type="button" data-pap="si-borrar" data-id="'+esc(id)+'">Borrar</button><button class="btn" type="button" data-pap="no" data-id="'+esc(id)+'">Cancelar</button>';
      $('[data-pap="no"]',fila).focus();
    }
    else if(a==='no')pintarPapelera(id,'borrar');
    else if(a==='si-borrar'&&d)AT.datos.papelera.eliminar(id).then(function(){papMsg('Se borró «'+(d.titulo||'Sin título')+'» para siempre.');pintarPapelera(id)});
    else if(a==='vaciar'){
      $('#papBt',pap).innerHTML='<span class="pap-seguro">¿Borrar todo para siempre?</span><button class="btn danger" type="button" data-pap="si-vaciar">Vaciar</button><button class="btn" type="button" data-pap="no-vaciar">Cancelar</button>';
      $('[data-pap="no-vaciar"]',pap).focus();
    }
    else if(a==='no-vaciar')pintarPapelera(null).then(function(){var v=$('[data-pap="vaciar"]',pap);if(v)v.focus()});
    else if(a==='si-vaciar')AT.datos.papelera.vaciar().then(function(){papMsg('La papelera quedó vacía.');pintarPapelera('*')});
  });
  pap.addEventListener('close',function(){if(papAbridor&&document.contains(papAbridor))papAbridor.focus({preventScroll:true})});
}
function papMsg(t){$('#papMsg',pap).textContent=t}
/* Pinta la lista; el foco va a la fila vecina de la que cambió (o al botón que se indique) */
function pintarPapelera(cambio,boton){
  var antes=papLista.map(function(d){return d.id}).indexOf(cambio);
  return AT.datos.papelera.todos().then(function(l){
    papLista=l;
    var tipos=AT.tiposDoc||{};
    $('#papL',pap).innerHTML=l.length?l.map(function(d){
      var t=tipos[d.tipo],q=diasQuedan(d);
      return '<li>'+ico(t?t.icono:'page')+'<span class="pap-t"><b>'+esc(d.titulo||'Sin título')+'</b>'+
        '<small>Eliminada el '+esc(new Date(d.eliminado).toLocaleDateString('es-MX',{day:'numeric',month:'short'}))+' · se borra en '+q+(q===1?' día':' días')+'</small></span>'+
        '<span class="pap-b"><button class="btn" type="button" data-pap="restaurar" data-id="'+esc(d.id)+'">Recuperar</button>'+
        '<button class="btn" type="button" data-pap="borrar" data-id="'+esc(d.id)+'">Borrar para siempre</button></span></li>';
    }).join(''):'<li class="pap-vacia">La papelera está vacía.</li>';
    $('#papBt',pap).innerHTML=l.length?'<button class="btn danger" type="button" data-pap="vaciar">Vaciar la papelera</button>':'';
    var f=null;
    if(boton&&cambio)f=$('[data-pap="'+boton+'"][data-id="'+cambio+'"]',pap);
    else if(cambio&&antes>=0){var filas=$$('#papL [data-pap="restaurar"]',pap);f=filas[Math.min(antes,filas.length-1)]||null}
    if(!f&&cambio)f=$('[data-pap="cerrar"]',pap);
    if(f)f.focus();
  });
}
function abrirPapelera(){
  if(!pap)crearPapelera();
  papAbridor=document.activeElement;
  papMsg('');
  if(AT.setNav)AT.setNav(false);
  return pintarPapelera(null).then(function(){
    pap.showModal();
    var f=$('[data-pap="restaurar"]',pap)||$('[data-pap="cerrar"]',pap);if(f)f.focus();
  });
}
AT.papelera={abrir:abrirPapelera};
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-papelera]'))abrirPapelera()});
})();
