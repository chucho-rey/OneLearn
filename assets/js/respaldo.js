/* OneBook: ventana «Tus datos».
   Explica dónde se guarda lo que escribes, cuánto espacio ocupa, si el navegador lo protege,
   y permite descargar un respaldo e importarlo. Se abre desde «Tus datos» en la barra lateral.
   Usa AT.datos (datos.js). Expone AT.tusDatos.abrir(). */
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
    '<dl class="td-res" id="tdRes"></dl>'+
    '<div class="td-esp" id="tdEsp" hidden><div class="td-bar" aria-hidden="true"><i id="tdBar"></i></div>'+
      '<p class="td-p td-nota" id="tdNotaEsp"></p></div>'+
    '<div class="td-sec" id="tdProt"></div>'+
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
      var n=r.documentos+r.notas+r.marcadores;
      if(!n&&!r.avance)mensaje('No había nada nuevo: todo lo del respaldo ya estaba aquí.',false);
      else mensaje('Se recuperaron '+plural(r.documentos,'documento','documentos')+', '+plural(r.notas,'nota','notas')+' y '+plural(r.marcadores,'marcador','marcadores')+(r.avance?', y tu avance de lectura':'')+'. Lo que ya tenías y era más reciente se conservó.',false);
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
function pintar(){
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
})();
