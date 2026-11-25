/* OneBook: «Cambiar de persona» (etapa Empresas, E2). La ventana «¿Quién usa OneBook?» lista a las personas de la
   empresa (empresa.js); al elegir una, pide su PIN si tiene, guarda lo pendiente de la página (como la persona de
   antes) y vuelve a cargar la página como la persona nueva. Con varios intentos fallidos de PIN, espera un momento.
   No es seguridad: ordena quién entra como quién en una computadora compartida. Se abre desde el pie de la barra
   lateral (#sidePersona) y desde el aviso «¿Quién eres?» del Inicio. Expone AT.persona.abrir(abridor). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,ico=AT.ico,E=AT.empresa;
if(!E)return;

var dlg=null,abridor=null,elegida=null,fallos=0,esperaHasta=0;
function rolTexto(p){
  var d=E.deptosDe(p.id).map(function(x){return x.depto.nombre});
  return E.ROLES[p.rol].nombre+(d.length?' · '+d.join(', '):'');
}
function crear(){
  dlg=document.createElement('dialog');
  dlg.className='atajos pe-dlg';dlg.setAttribute('aria-labelledby','peT');
  document.body.appendChild(dlg);
  dlg.addEventListener('close',function(){
    elegida=null;
    if(abridor&&abridor.isConnected&&abridor.focus)abridor.focus({preventScroll:true});
  });
  dlg.addEventListener('click',function(e){
    if(e.target===dlg){dlg.close();return}
    var b=e.target.closest('[data-pe]');if(!b||b.getAttribute('aria-disabled')==='true')return;
    var a=b.getAttribute('data-pe');
    if(a==='cerrar')dlg.close();
    else if(a==='atras'){var id=elegida;elegida=null;pintar('[data-id="'+id+'"]')}
    else if(a==='persona')elegir(b.getAttribute('data-id'));
  });
  dlg.addEventListener('submit',function(e){
    e.preventDefault();
    if(elegida)entrar(elegida,$('#pePin',dlg).value);
  });
}
function msg(t,err){var m=$('#peMsg',dlg);if(m){m.textContent=t||'';m.classList.toggle('err',!!err)}}
function pintar(foco){
  var yo=E.activa(),ps=E.personas(),p=elegida&&E.persona(elegida);
  var h='<div class="at-h"><h2 id="peT">¿Quién usa OneBook?</h2><button class="lec-x" type="button" data-pe="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>';
  if(p){
    h+='<form class="pe-f" novalidate><p class="td-p">'+AT.avatar(p)+' Para entrar como <b>'+esc(p.nombre||'Sin nombre')+'</b>, escribe su PIN.</p>'+
      '<label class="campo-l"><span>PIN</span><input type="password" id="pePin" inputmode="numeric" autocomplete="off" maxlength="8" pattern="[0-9]*" required></label>'+
      '<div class="td-bt"><button class="btn pri" type="submit">'+ico('candado')+'Entrar</button><button class="btn" type="button" data-pe="atras">Atrás</button></div></form>';
  }else{
    h+='<p class="td-p">'+(yo?'Ahora entra <b>'+esc(yo.nombre||'Sin nombre')+'</b>. Elige quién va a usar OneBook en esta computadora.':
      'Esta computadora no sabe quién eres. Elige tu nombre para seguir.')+'</p>'+
      '<ul class="pe-l">'+ps.map(function(x){
        var ahora=yo&&x.id===yo.id;
        return '<li><button class="pe-p" type="button" data-pe="persona" data-id="'+esc(x.id)+'"'+(ahora?' aria-disabled="true" aria-current="true"':'')+'>'+AT.avatar(x)+
          '<span class="pe-q"><b>'+esc(x.nombre||'Sin nombre')+(ahora?' <em>(ahora)</em>':'')+'</b><small>'+esc(rolTexto(x))+'</small></span>'+
          (x.pin?'<span class="pe-pin" title="Pide PIN">'+ico('candado')+'<span class="vh">Pide PIN</span></span>':'')+'</button></li>';
      }).join('')+'</ul>';
    if(ps.length<2)h+='<p class="pe-nota">Por ahora eres la única persona de tu empresa. Agrega a tu equipo en <a href="'+AT.rutas.raiz+'empresa.html">Tu empresa</a>.</p>';
    else if(yo&&!yo.pin)h+='<p class="pe-nota">Para que nadie más entre como tú, ponte un PIN en <a href="'+AT.rutas.raiz+'empresa.html#yo">Tu empresa</a>.</p>';
    h+='<p class="pe-nota">Ordena quién entra como quién en esta computadora; no es una contraseña: quien tiene el navegador tiene los datos.</p>';
  }
  h+='<p class="td-msg" id="peMsg" role="status"></p>';
  dlg.innerHTML=h;
  var f=foco&&$(foco,dlg)||$('#pePin',dlg)||$('.pe-p:not([aria-disabled="true"])',dlg)||$('.lec-x',dlg);
  if(f)f.focus();
}
function elegir(id){
  var p=E.persona(id);
  if(!p){pintar();msg('Esa persona ya no está en la empresa.',true);return}
  if(p.pin){elegida=id;pintar('#pePin');return}
  entrar(id,'');
}
/* Guarda lo pendiente de la página (como la persona de antes) y entra como la nueva */
function entrar(id,pin){
  if(Date.now()<esperaHasta){msg('Espera unos segundos antes de volver a intentarlo.',true);return}
  var g=AT.docGuardarYa?Promise.resolve().then(function(){return AT.docGuardarYa()}).catch(function(){}):Promise.resolve();
  g.then(function(){
    var ok;
    try{ok=E.entrarComo(id,pin)}catch(err){msg(err.message,true);return}
    if(!ok){
      fallos++;
      if(fallos>=5){fallos=0;esperaHasta=Date.now()+30e3;msg('Ese PIN no es. Espera 30 segundos para volver a intentarlo.',true)}
      else msg('Ese PIN no es. Inténtalo otra vez.',true);
      var i=$('#pePin',dlg);if(i){i.select();i.focus()}
      return;
    }
    var p=E.persona(id);
    msg('Listo: ahora entra '+(p&&p.nombre||'esa persona')+'.');
    location.reload();
  });
}
AT.persona={
  abrir:function(b){
    if(!dlg)crear();
    abridor=b||document.activeElement;elegida=null;
    if(!dlg.open)dlg.showModal();
    pintar();
  }
};
})();
