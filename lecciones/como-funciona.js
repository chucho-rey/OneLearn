/* Laboratorios de la lección «Cómo funciona OneLearn». Usan los controles reales de OneLearn: AT.ajustes
   (Lectura), los atajos de zen.js, AT.datos y «Tus datos», y la instalación de app.js. Lo que el estudiante
   cambie aquí queda cambiado en todo el sitio. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir,aj=AT.ajustes;

/* ---------- Ajusta la lectura ---------- */
AT.labs['cf-lectura']=function(){
  var ESC=aj.opciones.escala;
  var NOM={tema:{auto:'como tu dispositivo',light:'claro',dark:'oscuro'},contraste:{auto:'como tu dispositivo',normal:'normal',high:'alto'},fuente:{normal:'normal',atkinson:'Atkinson Hyperlegible',opendyslexic:'OpenDyslexic'}};
  function sincronizar(){
    var e=aj.get('escala'),i=ESC.indexOf(e);
    $('#clTamV').textContent=fmt(e*100,0)+' %';
    $('#clTam [data-v="-1"]').setAttribute('aria-disabled',i<=0?'true':'false');
    $('#clTam [data-v="1"]').setAttribute('aria-disabled',i>=ESC.length-1?'true':'false');
    AT.setPressed($('#clTema'),function(b){return b.getAttribute('data-v')===aj.get('tema')});
    AT.setPressed($('#clCon'),function(b){return b.getAttribute('data-v')===aj.get('contraste')});
    AT.setPressed($('#clFue'),function(b){return b.getAttribute('data-v')===aj.get('fuente')});
    $('#clTam').querySelectorAll('button').forEach(function(b){b.removeAttribute('aria-pressed')});
  }
  function msg(t){$('#clMsg').textContent=t}
  $('#clTam').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b||b.getAttribute('aria-disabled')==='true')return;
    var i=ESC.indexOf(aj.get('escala'))+(+b.getAttribute('data-v'));
    if(i>=0&&i<ESC.length){aj.set('escala',ESC[i]);msg('La letra quedó al '+fmt(ESC[i]*100,0)+' %. Todo crece en proporción: márgenes, botones e íconos.')}
  });
  [['#clTema','tema'],['#clCon','contraste'],['#clFue','fuente']].forEach(function(x){
    $(x[0]).addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;
      aj.set(x[1],b.getAttribute('data-v'));
      msg('Listo: '+x[1]+' '+NOM[x[1]][b.getAttribute('data-v')]+'. Se aplica en todo OneLearn y se recuerda en este dispositivo.');
    });
  });
  $('#clReset').addEventListener('click',function(){aj.restablecer();msg('Los ajustes de lectura volvieron a sus valores iniciales.')});
  aj.on(sincronizar);
  sincronizar();
};

/* ---------- Prueba los atajos ---------- */
AT.labs['cf-atajos']=function(){
  var AT_=[['z','Z','Modo zen'],['j','J','Sección siguiente'],['k','K','Sección anterior'],['n','N','Nota rápida'],['m','M','Marcador'],['ctrlk','Ctrl K','Buscar'],['?','?','Lista de atajos']];
  var probados={};
  function render(){
    $('#caLista').innerHTML=AT_.map(function(a){
      var ok=probados[a[0]];
      return '<li class="'+(ok?'ok':'')+'"><kbd>'+esc(a[1])+'</kbd><span>'+esc(a[2])+'</span><b>'+(ok?'Probado':'')+'</b></li>';
    }).join('');
    var n=Object.keys(probados).length;
    $('#caMsg').textContent=n===AT_.length?'¡Probaste todos los atajos! Ya puedes estudiar sin ratón.':n?'Llevas '+n+' de '+AT_.length+'.':'Todavía no pruebas ninguno.';
  }
  document.addEventListener('keydown',function(e){
    var t=e.target;
    if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    var k=(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'?'ctrlk':e.ctrlKey||e.metaKey||e.altKey?null:e.key.toLowerCase();
    if(k&&AT_.some(function(a){return a[0]===k})&&!probados[k]){probados[k]=true;render()}
  },true);
  render();
};

/* ---------- Tus datos en este navegador ---------- */
AT.labs['cf-datos']=function(){
  function hace(iso){
    if(!iso)return 'Nunca';
    var d=Math.floor((Date.now()-new Date(iso).getTime())/864e5);
    return d<=0?'Hoy':d===1?'Ayer':'Hace '+d+' días';
  }
  function kpi(t,v){return '<div class="kpi"><span>'+t+'</span><b>'+esc(String(v))+'</b></div>'}
  function render(){
    Promise.all([AT.datos.documentos.todos(),AT.datos.notas.todas(),AT.datos.marcadores.todos(),AT.datos.persistente()]).then(function(r){
      var notas=r[1].filter(function(n){return n.texto&&n.texto.trim()}).length;
      var tareas=(AT.proyectos||[]).reduce(function(s,p){return s+AT.proyectosAvance.hechas(p.id)},0);
      $('#cdKpis').innerHTML=kpi('Documentos',r[0].length)+kpi('Notas de lecciones',notas)+kpi('Marcadores',r[2].length)+kpi('Tareas de proyectos',tareas)+kpi('Último respaldo',hace(AT.datos.ultimoRespaldo()));
      var p=r[3];
      $('#cdStat').setAttribute('data-k',p===true?'good':'warn');
      $('#cdMsg').textContent=p===true?'Protegidos: el navegador no los borrará aunque le falte espacio.':
        p===false?'Sin proteger: si el dispositivo se queda sin espacio, el navegador podría borrarlos. Pide que los conserve (algunos navegadores lo deciden solos, según cuánto usas OneLearn).':
        'Este navegador no dice si protege los datos. Descarga respaldos de vez en cuando.';
      $('#cdPedir').hidden=p!==false;
    });
  }
  $('#cdPedir').addEventListener('click',function(){AT.datos.pedirPersistencia().then(render)});
  $('#cdAbrir').addEventListener('click',function(){AT.tusDatos.abrir()});
  AT.datos.on(render);
  render();
};

/* ---------- Instala OneLearn ---------- */
AT.labs['cf-instalar']=function(){
  var PASOS={
    android:['Abre OneLearn en Chrome.','Toca el menú ⋮ (arriba a la derecha).','Elige «Instalar app» o «Agregar a la pantalla principal».','Confirma. OneLearn aparecerá entre tus apps.'],
    ios:['Abre OneLearn en Safari.','Toca el botón Compartir (el cuadro con una flecha hacia arriba).','Elige «Agregar a inicio».','Toca «Agregar». OneLearn aparecerá en tu pantalla de inicio.'],
    pc:['Abre OneLearn en Chrome o Edge.','En la barra de direcciones, a la derecha, haz clic en el ícono de instalar (una pantalla con una flecha).','Haz clic en «Instalar».','OneLearn se abrirá en su propia ventana y quedará en tu menú de aplicaciones.']
  };
  function estado(){
    var inst=AT.app.instalada(),sw=!!(navigator.serviceWorker&&navigator.serviceWorker.controller);
    $('#ciEstado').setAttribute('data-k',inst?'good':'');
    $('#ciEstadoTxt').textContent=inst?'Ya estás usando OneLearn instalado como app.':
      (sw?'Este navegador ya guardó una copia de OneLearn: funciona sin conexión. ':'')+'Todavía no lo instalas como app.';
    $('#ciInstalar').hidden=inst||!AT.app.evento;
  }
  function pasos(d){$('#ciPasos').innerHTML=PASOS[d].map(function(t){return '<li>'+esc(t)+'</li>'}).join('')}
  var d=AT.app.esIOS()?'ios':/Android/i.test(navigator.userAgent)?'android':'pc';
  AT.setPressed($('#ciDisp'),function(b){return b.getAttribute('data-v')===d});
  elegir('#ciDisp',pasos);
  $('#ciInstalar').addEventListener('click',function(){AT.app.instalar().then(estado)});
  document.addEventListener('app-instalable',estado);
  document.addEventListener('app-instalada',estado);
  pasos(d);estado();
};
})();
