/* OneBook: recibir.html, la página que abre los enlaces entre un Cedis y sus sucursales (fase F8; cedis.js).
   recibir.html#<tipo>.<datos>.<firma>, o sin nada: «Pega el enlace» o abre el archivo .onebook.
   - inv (en la sucursal): revisa la invitación; si el navegador no tiene espacio, lo crea (un negocio de comida con
     el nombre de la sucursal); guarda la conexión y crea la página «Pedido a <Cedis>» (o reusa la que ya había).
   - ped (en el Cedis): revisa la firma con la clave de esa sucursal y la versión; muestra lo que pidió (y qué cambió
     si reemplaza otra versión) y, al aceptar, lo agrega a los pedidos.
   - con y fmt (en la sucursal): la confirmación del Cedis (lo que surte) y el formato actualizado.
   Al terminar, la dirección se limpia (lo que iba después de # no se queda en el historial). */
(function(){
'use strict';
var AT=window.AT,C=AT.cedis,$=AT.$,esc=AT.esc,ico=AT.ico,P=AT.perfil;
var cuerpo=$('#rcCuerpo'),titulo=$('#rcT');
if(!cuerpo)return;
if(!C){cuerpo.innerHTML='<p>No se pudo preparar esta página.</p>';return}
function cant(n){return Number(n).toLocaleString('es-MX',{maximumFractionDigits:3})}
function poner(t,html,foco){
  titulo.textContent=t;document.title=t+' · OneBook';
  cuerpo.innerHTML=html;
  var f=foco&&$(foco,cuerpo);(f||titulo).focus({preventScroll:true});
}
function error(t,msg){poner(t||'No se pudo abrir el enlace','<p class="rc-err">'+esc(msg)+'</p>'+pegarHTML(),'#rcTexto')}
function limpiar(){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
function rutaDoc(id){return 'documento.html?id='+encodeURIComponent(id)}

/* ---------- Sin enlace: pegarlo o abrir el archivo ---------- */
function pegarHTML(){
  return '<form class="pl-form rc-pegar" id="rcPegar"><label class="campo-l"><span>Pega aquí el enlace que te mandaron</span><textarea id="rcTexto" rows="3" spellcheck="false" autocomplete="off"></textarea></label>'+
    '<div class="td-bt"><button class="btn pri" type="submit">Abrir</button><button class="btn" type="button" id="rcArchivoB">'+ico('descargar')+'Abrir un archivo .onebook</button>'+
    '<input type="file" id="rcArchivo" accept=".onebook,text/plain" hidden></div></form>';
}
cuerpo.addEventListener('submit',function(e){
  if(e.target.id!=='rcPegar')return;
  e.preventDefault();
  var t=$('#rcTexto').value.trim();if(!t){$('#rcTexto').focus();return}
  procesar(t);
});
cuerpo.addEventListener('click',function(e){if(e.target.closest('#rcArchivoB'))$('#rcArchivo').click()});
cuerpo.addEventListener('change',function(e){
  if(e.target.id!=='rcArchivo')return;
  var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  if(f.size>200000){error('','El archivo es demasiado grande para ser de OneBook.');return}
  f.text().then(procesar);
});

/* ---------- Invitación (en la sucursal) ---------- */
function invitacion(p){
  return C.revisarInvitacion(p).then(function(r){
    if(!r.ok){error('No se pudo abrir la invitación',r.motivo);return}
    var o=r.inv;
    var hay=P&&P.actual&&P.actual();
    var aviso=r.otraSucursal?'<p class="rc-aviso">Este navegador ya pide a '+esc(o.c.n)+' como <b>'+esc(r.ya.suc.n)+'</b>. Si sigues, pedirá como <b>'+esc(o.s.n)+'</b> (los pedidos anteriores se quedan en su página).</p>':'';
    poner('Invitación de '+o.c.n,
      '<p class="rc-p"><b>'+esc(o.c.n)+'</b> te invita a mandarle tus pedidos como <b>'+esc(o.s.n)+'</b>. Trae su formato con '+o.f.l.length+(o.f.l.length===1?' insumo':' insumos')+
        '. Entregas: '+esc(C.diasTexto(o.c.d))+'; el corte es a las '+esc(o.c.co||'18:00')+' del día anterior.</p>'+aviso+
      (hay?'':'<form class="pl-form rc-esp" id="rcEspacio"><p class="rc-p">Este navegador todavía no tiene OneBook. Se crea tu espacio con lo mínimo (lo completas después en «Tu empresa»):</p>'+
        '<label class="campo-l"><span>Nombre de tu negocio</span><input type="text" name="negocio" maxlength="80" required value="'+esc(o.s.n)+'"></label>'+
        '<label class="campo-l"><span>Tu nombre</span><input type="text" name="nombre" maxlength="60" autocomplete="name"></label></form>')+
      '<p class="rc-p hint">Solo recibes el nombre de tu sucursal, tu clave y el formato: no ves nada de otras sucursales. Tus pedidos se firman con tu clave para que el Cedis sepa que son tuyos.</p>'+
      '<div class="td-bt"><button class="btn pri" type="button" id="rcConectar">'+(hay?'Conectar':'Crear mi espacio y conectar')+'</button><a class="btn" href="inicio.html">Cancelar</a></div><p class="td-msg" id="rcMsg" role="status"></p>',
      hay?'#rcConectar':'[name="negocio"]');
    $('#rcConectar').addEventListener('click',function(){
      var b=this;if(b.getAttribute('aria-disabled')==='true')return;
      if(!hay){
        var f=$('#rcEspacio'),neg=f.negocio.value.trim();
        if(!neg){$('#rcMsg').textContent='Escribe el nombre de tu negocio.';f.negocio.focus();return}
        var pf=P.guardar({perfil:'negocio',modulos:['negocio'],nombre:f.nombre.value.trim(),negocio:{nombre:neg,giro:'comida',telefono:''}});
        if(!pf){$('#rcMsg').textContent='No se pudo guardar en este navegador. Revisa que no esté en modo privado.';return}
        try{if(AT.empresa&&(!AT.empresa.existe()||AT.empresa.automatica()))AT.empresa.crear({nombre:neg,giro:'comida',telefono:'',tuNombre:f.nombre.value.trim()})}catch(e){}
      }
      b.setAttribute('aria-disabled','true');
      conectar(o).catch(function(e){b.removeAttribute('aria-disabled');$('#rcMsg').textContent=e&&e.message||'No se pudo conectar.'});
    });
  });
}
function conectar(o){
  var cx=C.conectar(o);
  /* La página del pedido: la que ya había (si sigue existiendo) o una nueva */
  return (cx.doc?AT.datos.documentos.leer(cx.doc):Promise.resolve(null)).then(function(d){
    if(d)return d;
    var nd=AT.crear.armar('pedidocedis',{cedis:o.c.i,nombreCedis:o.c.n,sala:AT.empresa&&AT.empresa.GENERAL});
    return AT.datos.documentos.guardar(nd,{conservarFecha:true}).then(function(){return nd});
  }).then(function(d){
    C.cambiar(function(x){if(x.conexiones[o.c.i])x.conexiones[o.c.i].doc=d.id});
    limpiar();
    poner('Listo: ya pides a '+o.c.n,'<p class="rc-p">Este navegador manda los pedidos de <b>'+esc(o.s.n)+'</b> a <b>'+esc(o.c.n)+'</b>. Tu página «'+esc(d.titulo)+'» tiene el formato: escribe las cantidades y toca «Enviar al Cedis».</p>'+
      '<div class="td-bt"><a class="btn pri" id="rcIr" href="'+rutaDoc(d.id)+'">Abrir mi pedido</a><a class="btn" href="inicio.html">Ir al Inicio</a></div>','#rcIr');
  });
}

/* ---------- Pedido (en el Cedis) ---------- */
function pedido(p){
  return C.revisarPedido(p).then(function(r){
    if(!r.ok){error(r.viejo?'Este pedido ya está':'No se pudo agregar el pedido',r.motivo);if(r.viejo)irPedidos();return}
    var o=r.pedido,y=C.yo();
    var avisos=[];
    if(r.tarde)avisos.push('Llegó tarde: se mandó después de las '+esc(y.corte)+' del día anterior a la entrega.');
    if(r.formatoViejo)avisos.push('La sucursal tiene un formato viejo. Mándale el nuevo desde «Pedidos de sucursales».');
    if(r.desconocidos.length)avisos.push('Trae '+r.desconocidos.length+(r.desconocidos.length===1?' código que ya no está':' códigos que ya no están')+' en tu formato: '+esc(r.desconocidos.join(', '))+'.');
    var reng=(o.r||[]).map(function(x){var i=r.insumos[x[0]];return '<tr><th scope="row">'+esc(i?i.nombre:'Código '+x[0])+'</th><td>'+esc(i?i.pres:'')+'</td><td class="num">'+cant(x[1])+'</td></tr>'}).join('');
    poner('¿Agregar el pedido de '+r.sucursal.nombre+'?',
      '<p class="rc-p">Para entregar el <b>'+esc(C.fechaTexto(o.e))+'</b> · Folio '+esc(o.o)+' · versión '+o.v+' · mandado '+esc(C.cuandoTexto(o.t))+'.</p>'+
      (r.anterior?'<p class="rc-aviso">Reemplaza la versión '+C.num(r.anterior.v['e-ver'])+' que ya tenías.'+(r.cambios.length?' Cambió: '+r.cambios.map(function(c){return esc(c.insumo)+' ('+cant(c.antes)+' → '+cant(c.ahora)+')'}).join(', ')+'.':' No cambió ninguna cantidad.')+'</p>':'')+
      avisos.map(function(a){return '<p class="rc-aviso">'+a+'</p>'}).join('')+
      (o.n?'<p class="rc-p"><b>Notas:</b> '+esc(o.n)+'</p>':'')+
      '<div class="cd-tw"><table class="cd-t"><caption class="vh">Lo que pide</caption><thead><tr><th scope="col">Insumo</th><th scope="col">Presentación</th><th scope="col" class="num">Cantidad</th></tr></thead><tbody>'+reng+'</tbody></table></div>'+
      '<div class="td-bt"><button class="btn pri" type="button" id="rcAgregar">'+(r.anterior?'Reemplazar el pedido':'Agregar a los pedidos')+'</button><a class="btn" href="'+(y.doc?rutaDoc(y.doc):'inicio.html')+'">Cancelar</a></div><p class="td-msg" id="rcMsg" role="status"></p>',
      '#rcAgregar');
    $('#rcAgregar').addEventListener('click',function(){
      var b=this;if(b.getAttribute('aria-disabled')==='true')return;b.setAttribute('aria-disabled','true');
      C.aceptarPedido(r).then(function(){
        limpiar();
        poner('Pedido agregado','<p class="rc-p">El pedido de <b>'+esc(r.sucursal.nombre)+'</b> para el '+esc(C.fechaTexto(o.e))+' ya está en tu consolidado.</p>'+
          '<div class="td-bt"><a class="btn pri" id="rcIr" href="'+(y.doc?rutaDoc(y.doc):'inicio.html')+'">Ver los pedidos</a></div>','#rcIr');
      },function(e){b.removeAttribute('aria-disabled');$('#rcMsg').textContent=e&&e.message||'No se pudo guardar.'});
    });
  });
}
function irPedidos(){var y=C.yo();if(y&&y.doc)cuerpo.insertAdjacentHTML('beforeend','<div class="td-bt"><a class="btn pri" href="'+rutaDoc(y.doc)+'">Ver los pedidos</a></div>')}

/* ---------- Confirmación y formato (en la sucursal) ---------- */
function deCedis(p){
  return C.revisarDeCedis(p).then(function(r){
    if(!r.ok){error('No se pudo abrir el enlace',r.motivo);return}
    var cx=r.cx,o=r.obj,ir='<div class="td-bt"><a class="btn pri" id="rcIr" href="'+(cx.doc?rutaDoc(cx.doc):'inicio.html')+'">Abrir mi pedido</a></div>';
    if(p.tipo==='fmt'){
      var c=C.aplicarFormato(o);limpiar();
      poner('Formato actualizado','<p class="rc-p">Tu formato de <b>'+esc(c.cedis.n)+'</b> ya está al día: '+o.f.l.length+(o.f.l.length===1?' insumo':' insumos')+'.</p>'+ir,'#rcIr');
      return;
    }
    var a=C.aplicarConfirmacion(cx.cedis.i,o);
    if(!a.ok){error(a.viejo?'Ya tienes esta confirmación':'No se pudo aplicar la confirmación',a.motivo);if(cx.doc)cuerpo.insertAdjacentHTML('beforeend',ir);return}
    limpiar();
    var q=a.pedido.q||{},falt=o.r.filter(function(x){return C.num(x[1])<C.num(q[x[0]]||0)}),nom={};cx.formato.l.forEach(function(i){nom[i[0]]=i[1]});
    poner(cx.cedis.n+' confirmó tu pedido','<p class="rc-p">Pedido '+esc(o.o)+': '+(falt.length?'<span class="neg">'+falt.length+(falt.length===1?' insumo con faltante':' insumos con faltante')+'</span>: '+
      falt.map(function(x){return esc(nom[x[0]]||x[0])+' ('+cant(x[1])+' de '+cant(q[x[0]])+(x[2]?', '+esc(x[2]):'')+')'}).join(', '):'surte todo lo que pediste')+'.</p>'+ir,'#rcIr');
  });
}

function procesar(t){
  poner('Recibir un enlace','<p class="hint">Revisando el enlace…</p>');
  return C.abrir(t).then(function(p){
    if(p.tipo==='inv')return invitacion(p);
    if(p.tipo==='ped')return pedido(p);
    return deCedis(p);
  }).catch(function(e){error('',e&&e.message||'No se pudo abrir el enlace.')});
}
/* Otro enlace en la misma pestaña (solo cambia lo que va después de #): también se lee */
addEventListener('hashchange',function(){if(location.hash.length>1)procesar(location.hash)});
if(location.hash.length>1)procesar(location.hash);
else poner('Recibir un enlace','<p class="rc-p">Abre aquí una invitación, un pedido o una confirmación de OneBook que te mandaron por WhatsApp o correo.</p>'+pegarHTML(),'#rcTexto');
})();
