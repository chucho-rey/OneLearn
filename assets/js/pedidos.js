/* OneBook: los bloques de los pedidos al Cedis (fase F8; el modelo y los enlaces están en cedis.js).
   - «Pedidos de sucursales» (cedis), en la página del Cedis: ajustes (nombre, hora de corte y días de entrega), la
     fecha de entrega, cada sucursal con su estado (Falta, Recibido con su hora y versión, Llegó tarde, Confirmado,
     Surtido) y sus acciones (Invitar, Cambiar clave, Mandar formato, Recordar, Confirmar con lo que surte, Enviar
     confirmación, Marcar surtido, Hoja de surtido), el consolidado (un renglón por insumo y una columna por sucursal,
     con el total), «Pegar enlace», hojas de surtido, lista de compra y CSV.
   - «Pedido al Cedis» (pedidocedis), en la página de la sucursal: los insumos de su formato por categoría con su
     cantidad (mínimo y múltiplo), la fecha de entrega y la hora de corte, notas, «Repetir el último pedido», «Solo lo
     pedido», «Enviar al Cedis» (enlace firmado; avisa los cambios sin enviar), lo que surte el Cedis con los
     faltantes y los pedidos anteriores.
   Lo de los bloques no va en la página: el bloque solo guarda {cedis} (el pedido) o nada (el Cedis); lo demás vive
   en las bases del Cedis y en aprende-tecnologia:cedis. AT.pedidos.compartir abre la ventana para mandar un enlace
   (WhatsApp, correo, compartir, copiar o archivo) y AT.pedidos.imprimir imprime hojas sin el resto de la página.
   Expone AT.pedidos. Se carga después de cedis.js. */
(function(){
'use strict';
var AT=window.AT,C=AT.cedis,B=AT.bases,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
if(!C||!B)return;
var num=C.num;
function cant(n){return Number(n).toLocaleString('es-MX',{maximumFractionDigits:3})}
function dialogo(clase,titulo,html){
  var d=document.createElement('dialog');
  d.className='atajos cd-dlg '+clase;d.setAttribute('aria-labelledby','cdT-'+clase);
  d.innerHTML='<div class="at-h"><h2 id="cdT-'+clase+'">'+esc(titulo)+'</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+html;
  document.body.appendChild(d);
  var volver=document.activeElement;
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){d.remove();if(volver&&volver.isConnected)volver.focus({preventScroll:true})});
  return d;
}

/* ---------- Mandar un enlace: WhatsApp, correo, compartir, copiar o archivo ---------- */
/* o: {titulo, mensaje, url, texto (lo que va después de #, para el archivo), largo, tel, correo, asunto, archivo (nombre)} */
function compartir(o){
  var tel=String(o.tel||'').replace(/\D/g,'');if(tel.length===10)tel='52'+tel;
  var msg=o.mensaje+(o.url?'\n'+o.url:'');
  var wa='https://wa.me/'+tel+'?text='+encodeURIComponent(msg);
  var mail='mailto:'+encodeURIComponent(o.correo||'')+'?subject='+encodeURIComponent(o.asunto||o.titulo)+'&body='+encodeURIComponent(msg);
  var d=dialogo('cd-comp',o.titulo,
    (o.url?'<label class="campo-l"><span>Enlace</span><input type="text" readonly class="cd-enlace" value="'+esc(o.url)+'"></label>':'<p class="td-p cd-msg-txt">'+esc(o.mensaje)+'</p>')+
    (o.largo?'<p class="td-p cd-aviso">Este enlace es muy largo y WhatsApp podría cortarlo. Mejor mándalo como archivo.</p>':'')+
    '<div class="cd-comp-b">'+
      '<a class="btn pri" href="'+esc(wa)+'" target="_blank" rel="noopener" data-cmp="wa">'+ico('enlace')+'WhatsApp'+(tel?'':' (eliges el contacto)')+'</a>'+
      '<a class="btn" href="'+esc(mail)+'" data-cmp="correo">'+ico('notas')+'Correo</a>'+
      (navigator.share?'<button class="btn" type="button" data-cmp="compartir">'+ico('pestanas')+'Compartir</button>':'')+
      (o.url?'<button class="btn" type="button" data-cmp="copiar">'+ico('copiar')+'Copiar enlace</button>':'<button class="btn" type="button" data-cmp="copiar">'+ico('copiar')+'Copiar mensaje</button>')+
      (o.texto?'<button class="btn" type="button" data-cmp="archivo">'+ico('descargar')+'Descargar archivo</button>':'')+
    '</div><p class="td-msg" data-msg role="status"></p>');
  d.addEventListener('click',function(e){
    var b=e.target.closest('[data-cmp]');if(!b)return;
    var a=b.getAttribute('data-cmp'),m=$('[data-msg]',d);
    if(a==='compartir'){navigator.share({title:o.titulo,text:o.mensaje,url:o.url||undefined}).catch(function(){})}
    else if(a==='copiar'){
      var t=o.url||o.mensaje;
      (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(function(){m.textContent='Copiado.'},function(){
        var i=$('.cd-enlace',d);if(i){i.select();try{document.execCommand('copy');m.textContent='Copiado.'}catch(x){m.textContent='Selecciona el enlace y cópialo.'}}
      });
    }else if(a==='archivo'){C.archivo(o.texto,o.archivo||'onebook.onebook');m.textContent='Descargado: mándalo como archivo; quien lo reciba lo abre en «Pegar enlace» de OneBook.'}
  });
  d.showModal();
  var f=$('.cd-enlace',d);if(f){f.focus();f.select()}else $('[data-cmp]',d).focus();
  return d;
}

/* ---------- Imprimir sin el resto de la página ---------- */
function imprimir(html,titulo){
  var v=$('#cdImprimir');if(v)v.remove();
  v=document.createElement('div');v.id='cdImprimir';v.className='cd-imp';v.innerHTML=html;
  document.body.appendChild(v);
  document.documentElement.classList.add('cd-imprimiendo');
  var t=document.title;if(titulo)document.title=titulo;
  function fin(){document.documentElement.classList.remove('cd-imprimiendo');document.title=t;removeEventListener('afterprint',fin)}
  addEventListener('afterprint',fin);
  setTimeout(function(){try{window.print()}catch(e){}},0);
  return v;
}
function descargarCSV(filas,nombre){
  var t='﻿'+filas.map(function(f){return f.map(function(c){c=c==null?'':String(c);return /[",\n;]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')}).join('\r\n')+'\r\n';
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=nombre;
  document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
  return t;
}

/* =====================================================================================
   El Cedis
   ===================================================================================== */
/* El consolidado de una fecha: {sucs:[{s, p}], filas:[{ins, por:{sid: n}, total}], cats} */
function consolidado(fecha,solo){
  var sucs=C.sucursales(),peds=C.pedidosDe(fecha),ins=C.insumos(true),por={};
  ins.forEach(function(i){por[i.codigo]={ins:i,por:{},total:0,surte:0}});
  sucs.forEach(function(s){var p=peds[s.id];if(!p)return;p.renglones.forEach(function(r){
    if(!por[r.cod])por[r.cod]={ins:{codigo:r.cod,nombre:r.insumo,pres:'',cat:'Otros'},por:{},total:0,surte:0};
    var x=por[r.cod];x.por[s.id]=(x.por[s.id]||0)+r.pide;x.total+=r.pide;x.surte+=r.surte==null?r.pide:r.surte;
  })});
  var filas=Object.keys(por).map(function(k){return por[k]}).filter(function(x){return !solo||x.total>0}).filter(function(x){return x.total>0||x.ins.activo});
  filas.sort(function(a,b){return C.CATS.indexOf(a.ins.cat)-C.CATS.indexOf(b.ins.cat)||a.ins.nombre.localeCompare(b.ins.nombre,'es')});
  return {sucs:sucs.map(function(s){return {s:s,p:peds[s.id]||null}}),filas:filas};
}
function estadoHTML(p,y){
  if(!p)return '<span class="cd-chip falta">Falta</span>';
  var t=p.estado==='Surtido'?'Surtido':p.estado==='Confirmado'?'Confirmado':'Recibido '+C.horaTexto(p.envt)+' (v'+p.version+')';
  return '<span class="cd-chip '+(p.estado==='Surtido'?'surtido':p.estado==='Confirmado'?'conf':'rec')+'">'+esc(t)+'</span>'+(p.tarde?'<span class="cd-chip tarde">Llegó tarde</span>':'');
}
function tablaConsolidado(c,op){
  op=op||{};
  if(!c.filas.length)return '<p class="cd-vacio">'+(c.sucs.some(function(x){return x.p})?'Los pedidos de esta fecha no traen insumos.':'Todavía no llega ningún pedido para esta fecha.')+'</p>';
  var cols=c.sucs.filter(function(x){return x.p||!op.soloCon});
  var h='<div class="cd-tw"><table class="cd-t"><caption class="vh">Consolidado: total por insumo y por sucursal</caption><thead><tr><th scope="col">Insumo</th><th scope="col">Presentación</th>'+
    cols.map(function(x){return '<th scope="col" class="num">'+esc(x.s.nombre)+'</th>'}).join('')+'<th scope="col" class="num">Total</th></tr></thead><tbody>';
  var cat='';
  c.filas.forEach(function(f){
    if(f.ins.cat!==cat){cat=f.ins.cat;h+='<tr class="cd-cat"><th scope="rowgroup" colspan="'+(cols.length+3)+'">'+esc(cat)+'</th></tr>'}
    h+='<tr><th scope="row">'+esc(f.ins.nombre)+'</th><td>'+esc(f.ins.pres||'')+'</td>'+cols.map(function(x){var n=f.por[x.s.id];return '<td class="num">'+(n?cant(n):'<span class="cd-0">—</span>')+'</td>'}).join('')+
      '<td class="num"><b>'+cant(f.total)+'</b></td></tr>';
  });
  return h+'</tbody></table></div>';
}
function hojaHTML(y,s,p){
  return '<section class="cd-hoja"><header><h1>Hoja de surtido</h1><p><b>'+esc(y.nombre)+'</b> → <b>'+esc(s.nombre)+'</b></p>'+
    '<p>Entrega: '+esc(C.fechaTexto(p.fecha))+' · Folio '+esc(p.folio)+' (versión '+p.version+')'+(p.estado!=='Recibido'?' · '+esc(p.estado):'')+'</p></header>'+
    '<table class="cd-t"><thead><tr><th scope="col">Insumo</th><th scope="col">Presentación</th><th scope="col" class="num">Pidió</th><th scope="col" class="num">Surte</th><th scope="col">Nota</th><th scope="col">Revisado</th></tr></thead><tbody>'+
    p.renglones.map(function(r){var ins=C.insumos(true).filter(function(i){return i.codigo===r.cod})[0],s2=r.surte==null?r.pide:r.surte;
      return '<tr><th scope="row">'+esc(r.insumo)+'</th><td>'+esc(ins?ins.pres:'')+'</td><td class="num">'+cant(r.pide)+'</td><td class="num'+(s2<r.pide?' neg':'')+'">'+cant(s2)+'</td><td>'+esc(r.nota)+'</td><td class="cd-rev">☐</td></tr>'}).join('')+
    '</tbody></table>'+(p.notas?'<p class="cd-notas"><b>Notas de la sucursal:</b> '+esc(p.notas)+'</p>':'')+
    '<div class="cd-firmas"><p>Entrega: ______________________</p><p>Recibe: ______________________</p></div></section>';
}
function listaCompraHTML(y,fecha,c){
  var h='<section class="cd-hoja"><header><h1>Lista de compra y preparación</h1><p><b>'+esc(y.nombre)+'</b> · Entrega: '+esc(C.fechaTexto(fecha))+'</p>'+
    '<p>'+c.sucs.filter(function(x){return x.p}).map(function(x){return esc(x.s.nombre)}).join(', ')+'</p></header>';
  return h+tablaConsolidado(c,{soloCon:true})+'</section>';
}
function csvConsolidado(fecha,c){
  var cols=c.sucs.filter(function(x){return x.p});
  var f=[['Código','Insumo','Presentación','Categoría'].concat(cols.map(function(x){return x.s.nombre}),['Total'])];
  c.filas.forEach(function(x){f.push([x.ins.codigo,x.ins.nombre,x.ins.pres||'',x.ins.cat].concat(cols.map(function(s){return x.por[s.s.id]||0}),[x.total]))});
  return descargarCSV(f,'consolidado-'+fecha+'.csv');
}

function montarCedis(raiz,op){
  var vivo=true,fecha='',solo=true,docId=AT.docActual&&AT.docActual.id||'';
  raiz.classList.add('cd');
  raiz.innerHTML='<p class="hint">Cargando los pedidos…</p>';
  function y(){return C.yo()}
  function pintar(){
    if(!vivo)return;
    var yy=y();if(!yy){raiz.innerHTML='<p class="hint">Preparando el Cedis…</p>';return}
    var fs=C.fechas();if(!fecha||fs.indexOf(fecha)<0)fecha=fs.filter(function(f){return f>=C.hoy()}).slice(-1)[0]||fs[0];
    var c=consolidado(fecha,solo),con=c.sucs.filter(function(x){return x.p}),faltan=c.sucs.filter(function(x){return !x.p}),ed=!!op.editable;
    var fmt=C.formato().h,claves=C.leer().claves;
    var limite=C.limite(fecha,yy.corte),paso=limite&&new Date()>limite;
    raiz.innerHTML=
      '<div class="cd-cab"><div><b class="cd-nom">'+esc(yy.nombre)+'</b><small>Corte: '+esc(yy.corte)+' del día anterior · entrega '+esc(C.diasTexto(yy.dias))+'</small></div>'+
        (ed?'<button type="button" class="btn" data-cd="ajustes">'+ico('cambiar')+'Ajustes</button>':'')+'</div>'+
      '<div class="cd-barra"><label class="cd-fecha"><span>Pedidos para entregar el</span><select data-cd="fecha">'+fs.map(function(f){return '<option value="'+f+'"'+(f===fecha?' selected':'')+'>'+esc(C.fechaTexto(f))+'</option>'}).join('')+'</select></label>'+
        (ed?'<button type="button" class="btn" data-cd="pegar">'+ico('enlace')+'Pegar enlace</button>':'')+'</div>'+
      '<p class="cd-res" role="status">'+(c.sucs.length?con.length+' de '+c.sucs.length+' sucursales mandaron su pedido'+(faltan.length?'. Faltan: '+faltan.map(function(x){return esc(x.s.nombre)}).join(', ')+(paso?' (ya pasó la hora de corte)':''):'.'):'Agrega tus sucursales en la tabla «Sucursales» de esta página.')+'</p>'+
      '<ul class="cd-sucs">'+c.sucs.map(function(x){
        var s=x.s,p=x.p,k=claves[s.id],viejo=k&&k.fmt&&k.fmt!==fmt;
        return '<li class="cd-suc" data-suc="'+esc(s.id)+'"><div class="cd-suc-n"><b>'+esc(s.nombre)+'</b>'+estadoHTML(p,yy)+
          (!k?'<span class="cd-chip sin">Sin invitar</span>':viejo?'<span class="cd-chip viejo">Formato viejo</span>':'')+'</div>'+
          (ed?'<div class="cd-suc-b">'+
            (p&&p.estado==='Recibido'?'<button type="button" class="btn pri" data-cd="confirmar">Confirmar</button>':'')+
            (p&&p.estado!=='Recibido'?'<button type="button" class="btn" data-cd="enviarconf">Enviar confirmación</button>':'')+
            (p&&p.estado==='Confirmado'?'<button type="button" class="btn" data-cd="surtido">Marcar surtido</button>':'')+
            (p?'<button type="button" class="btn" data-cd="hoja">'+ico('descargar')+'Hoja</button>':'')+
            (!p&&k?'<button type="button" class="btn" data-cd="recordar">Recordar</button>':'')+
            (viejo?'<button type="button" class="btn" data-cd="formato">Mandar formato</button>':'')+
            '<button type="button" class="btn'+(k?'':' pri')+'" data-cd="invitar">'+(k?'Invitación':'Invitar')+'</button>'+
          '</div>':'')+'</li>';
      }).join('')+'</ul>'+
      '<div class="cd-con-h"><h4>Consolidado</h4><label class="pl-op"><input type="checkbox" data-cd="solo"'+(solo?' checked':'')+'><span>Solo lo pedido</span></label></div>'+
      tablaConsolidado(c)+
      (ed&&con.length?'<div class="cd-salidas"><button type="button" class="btn" data-cd="hojas">'+ico('descargar')+'Hojas de surtido</button>'+
        '<button type="button" class="btn" data-cd="compra">'+ico('lista')+'Lista de compra</button>'+
        '<button type="button" class="btn" data-cd="csv">'+ico('tabla')+'Descargar CSV</button></div>':'')+
      '<p class="cd-msg" role="status"></p>';
  }
  function decir(t){var m=$('.cd-msg',raiz);if(m)m.textContent=t}
  /* Vuelve a pintar y deja el foco donde estaba (el mismo botón de la misma sucursal) */
  function repintar(){
    var e=document.activeElement,sel=null;
    if(e&&raiz.contains(e)&&e.getAttribute('data-cd')){var li=e.closest('[data-suc]');sel=(li?'[data-suc="'+li.getAttribute('data-suc')+'"] ':'')+'[data-cd="'+e.getAttribute('data-cd')+'"]'}
    pintar();
    if(sel){var f=raiz.querySelector(sel);if(f)f.focus({preventScroll:true})}
  }
  function suc(id){return C.sucursales(true).filter(function(s){return s.id===id})[0]}
  function invitar(sid,b,nueva){
    var s=suc(sid);
    (nueva?C.cambiarClave(sid):C.invitacion(sid)).then(function(r){
      pintar();
      compartir({titulo:'Invitación para '+s.nombre,mensaje:'Hola. Este es el formato de pedidos de '+y().nombre+' para '+s.nombre+'. Ábrelo en el celular o la computadora donde harán los pedidos:',
        url:r.url,texto:r.texto,largo:r.largo,tel:s.tel,correo:s.correo,asunto:'Formato de pedidos de '+y().nombre,archivo:'invitacion-'+C.sinAcentos(s.nombre).replace(/\W+/g,'-')+'.onebook'});
    },function(e){decir(e.message)});
  }
  function menuInvitar(sid,b){
    var k=C.claveDe(sid),s=suc(sid);
    if(!k){invitar(sid,b);return}
    var d=dialogo('cd-inv','Invitación de '+s.nombre,'<p class="td-p">'+esc(s.nombre)+' ya tiene su invitación. Puedes mandarla otra vez, o cambiar su clave si alguien que no debe la tiene: la anterior deja de servir y hay que mandar la nueva.</p>'+
      '<div class="td-bt"><button class="btn pri" type="button" data-x="otra">Mandar la invitación otra vez</button><button class="btn danger" type="button" data-x="clave">Cambiar clave</button><button class="btn" type="button" data-cerrar>Cancelar</button></div>');
    d.addEventListener('click',function(e){var x=e.target.closest('[data-x]');if(!x)return;var n=x.getAttribute('data-x')==='clave';d.close();invitar(sid,b,n)});
    d.showModal();$('[data-x="otra"]',d).focus();
  }
  function ajustes(b){
    var yy=y();
    var d=dialogo('cd-aj','Ajustes del Cedis','<form class="pl-form" method="dialog">'+
      '<label class="campo-l"><span>Nombre del Cedis</span><input type="text" name="nombre" maxlength="60" required value="'+esc(yy.nombre)+'"></label>'+
      '<label class="campo-l"><span>Hora de corte (el día anterior a la entrega)</span><input type="time" name="corte" value="'+esc(yy.corte)+'" required></label>'+
      '<fieldset class="bd-fs"><legend>Días de entrega</legend><div class="cd-dias">'+[1,2,3,4,5,6,0].map(function(i){return '<label class="pl-op"><input type="checkbox" name="dia" value="'+i+'"'+(yy.dias.indexOf(i)>=0?' checked':'')+'><span>'+C.DIAS[i]+'</span></label>'}).join('')+'</div></fieldset>'+
      '<p class="hint">Las sucursales ven estos datos cuando les mandas su invitación o su formato.</p>'+
      '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>');
    $('form',d).addEventListener('submit',function(e){
      e.preventDefault();var f=e.target;
      var dias=$$('input[name="dia"]:checked',f).map(function(x){return +x.value});
      if(!dias.length){alert('Elige al menos un día de entrega.');return}
      C.ajustarYo({nombre:f.nombre.value,corte:f.corte.value,dias:dias});d.close();pintar();decir('Ajustes guardados.');
    });
    d.showModal();$('[name="nombre"]',d).focus();
  }
  function confirmar(sid){
    var p=C.pedidosDe(fecha)[sid],s=suc(sid);if(!p)return;
    var d=dialogo('cd-conf','Confirmar el pedido de '+s.nombre,'<form class="pl-form" method="dialog"><p class="td-p">Entrega: '+esc(C.fechaTexto(p.fecha))+' · Folio '+esc(p.folio)+(p.notas?'<br><b>Notas:</b> '+esc(p.notas):'')+'</p>'+
      '<div class="cd-tw"><table class="cd-t cd-tconf"><thead><tr><th scope="col">Insumo</th><th scope="col" class="num">Pidió</th><th scope="col">Surte</th><th scope="col">Nota</th></tr></thead><tbody>'+
      p.renglones.map(function(r,i){var sv=r.surte==null?r.pide:r.surte;
        return '<tr><th scope="row" id="cdr'+i+'">'+esc(r.insumo)+'</th><td class="num">'+cant(r.pide)+'</td>'+
          '<td><input type="number" min="0" step="any" inputmode="decimal" data-surte="'+esc(r.cod)+'" value="'+esc(String(sv))+'" aria-labelledby="cdr'+i+'" aria-label="Surte '+esc(r.insumo)+'"></td>'+
          '<td><input type="text" maxlength="120" data-nota="'+esc(r.cod)+'" value="'+esc(r.nota)+'" placeholder="Sin existencia, llega mañana…" aria-label="Nota de '+esc(r.insumo)+'"></td></tr>'}).join('')+
      '</tbody></table></div><p class="td-msg" data-msg role="status"></p>'+
      '<div class="td-bt"><button class="btn pri" type="submit">Confirmar y enviar</button><button class="btn" type="button" data-todo>Todo completo</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>');
    d.addEventListener('click',function(e){if(e.target.closest('[data-todo]')){p.renglones.forEach(function(r){var i=d.querySelector('[data-surte="'+r.cod+'"]');if(i)i.value=r.pide});$('[data-msg]',d).textContent='Todo completo: surte lo que pidió.'}});
    $('form',d).addEventListener('submit',function(e){
      e.preventDefault();var su={},no={};
      $$('[data-surte]',d).forEach(function(i){su[i.getAttribute('data-surte')]=i.value===''?0:num(i.value)});
      $$('[data-nota]',d).forEach(function(i){no[i.getAttribute('data-nota')]=i.value});
      C.confirmar(p.id,su,no).then(function(){d.close();pintar();enviarConf(sid)},function(er){$('[data-msg]',d).textContent=er.message});
    });
    d.showModal();var f=$('[data-surte]',d);if(f)f.focus();
  }
  function enviarConf(sid){
    var p=C.pedidosDe(fecha)[sid],s=suc(sid);if(!p)return;
    C.enlaceConfirmacion(p.id).then(function(r){
      var falt=p.renglones.filter(function(x){return (x.surte==null?x.pide:x.surte)<x.pide}).length;
      compartir({titulo:'Confirmación para '+s.nombre,mensaje:y().nombre+' confirmó tu pedido '+p.folio+' para el '+C.fechaTexto(p.fecha)+(falt?' ('+falt+(falt===1?' insumo con faltante':' insumos con faltante')+')':' (completo)')+'. Ábrelo para ver lo que te surte:',
        url:r.url,texto:r.texto,largo:r.largo,tel:s.tel,correo:s.correo,asunto:'Confirmación del pedido '+p.folio,archivo:'confirmacion-'+p.folio+'.onebook'});
    },function(e){decir(e.message)});
  }
  raiz.addEventListener('change',function(e){
    var t=e.target;
    if(t.matches('[data-cd="fecha"]')){fecha=t.value;pintar();var x=$('[data-cd="fecha"]',raiz);if(x)x.focus()}
    else if(t.matches('[data-cd="solo"]')){solo=t.checked;pintar();var z=$('[data-cd="solo"]',raiz);if(z)z.focus()}
  });
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('[data-cd]');if(!b||b.tagName==='SELECT'||b.type==='checkbox')return;
    var a=b.getAttribute('data-cd'),li=b.closest('[data-suc]'),sid=li&&li.getAttribute('data-suc'),yy=y();
    if(a==='ajustes')ajustes(b);
    else if(a==='pegar')location.href=(AT.rutas&&AT.rutas.raiz||'')+'recibir.html';
    else if(a==='invitar')menuInvitar(sid,b);
    else if(a==='formato'){var s=suc(sid);C.enlaceFormato(sid).then(function(r){pintar();compartir({titulo:'Formato nuevo para '+s.nombre,mensaje:'Hola. '+yy.nombre+' actualizó su formato de pedidos. Ábrelo para tenerlo al día:',url:r.url,texto:r.texto,largo:r.largo,tel:s.tel,correo:s.correo,asunto:'Formato de pedidos actualizado',archivo:'formato.onebook'})},function(er){decir(er.message)})}
    else if(a==='recordar'){var s2=suc(sid);compartir({titulo:'Recordar a '+s2.nombre,mensaje:'Hola, '+s2.nombre+': todavía no llega su pedido para el '+C.fechaTexto(fecha)+'. El corte es a las '+yy.corte+' del día anterior.',tel:s2.tel,correo:s2.correo,asunto:'Falta su pedido'})}
    else if(a==='confirmar')confirmar(sid);
    else if(a==='enviarconf')enviarConf(sid);
    else if(a==='surtido'){var p=C.pedidosDe(fecha)[sid];if(p)C.marcarSurtido(p.id).then(function(){pintar();decir('Marcado como surtido.')})}
    else if(a==='hoja'){var p2=C.pedidosDe(fecha)[sid];if(p2)imprimir(hojaHTML(yy,suc(sid),p2),'Hoja de surtido '+suc(sid).nombre)}
    else if(a==='hojas'){var c=consolidado(fecha,true);imprimir(c.sucs.filter(function(x){return x.p}).map(function(x){return hojaHTML(yy,x.s,x.p)}).join(''),'Hojas de surtido '+fecha)}
    else if(a==='compra')imprimir(listaCompraHTML(yy,fecha,consolidado(fecha,true)),'Lista de compra '+fecha);
    else if(a==='csv'){csvConsolidado(fecha,consolidado(fecha,true));decir('Se descargó el consolidado en CSV.')}
  });
  var quitar=[];
  C.asegurarYo(docId);
  C.asegurar(docId).then(function(){
    pintar();
    quitar.push(C.on(function(){if(vivo&&!enDialogo())repintar()}));
    quitar.push(B.on(function(){if(vivo&&!enDialogo()){clearTimeout(raiz._t);raiz._t=setTimeout(repintar,200)}}));
  },function(){raiz.innerHTML='<p class="hint">No se pudieron leer los pedidos.</p>'});
  function enDialogo(){return !!document.querySelector('dialog.cd-dlg[open]')}
  return {destruir:function(){vivo=false;quitar.forEach(function(f){f()})}};
}

/* =====================================================================================
   La sucursal
   ===================================================================================== */
function montarPedido(raiz,op){
  var vivo=true,cid=op.cedis||'',soloPedido=false;
  raiz.classList.add('pc');
  function errores(cx,a){
    var e={};
    cx.formato.l.forEach(function(i){
      var q=num(a.q[i[0]]),min=num(i[4]),mult=num(i[5])||1;
      if(q<0)e[i[0]]='No puede ser negativo.';
      else if(q>0&&min&&q<min)e[i[0]]='El mínimo es '+cant(min)+'.';
      else if(q>0&&mult>1&&Math.abs(q/mult-Math.round(q/mult))>1e-9)e[i[0]]='Va de '+cant(mult)+' en '+cant(mult)+'.';
    });
    return e;
  }
  function estado(cx,a){
    var n=cx.formato.l.filter(function(i){return num(a.q[i[0]])>0}).length,err=Object.keys(errores(cx,a)).length;
    var lim=C.limite(a.fecha,cx.cedis.co),paso=lim&&new Date()>lim;
    var env=a.enviado,cambios=env&&env.huella!==C.huellaPedido(a);
    return '<p class="pc-n">'+(n?'Llevas '+n+(n===1?' insumo':' insumos'):'Todavía no pides nada')+(err?' · <span class="neg">Revisa '+err+(err===1?' cantidad':' cantidades')+'</span>':'')+'</p>'+
      '<p class="pc-est'+(cambios?' aviso':env?' ok':'')+'">'+(env?(cambios?'Tienes cambios sin enviar. ':'')+'Enviado (versión '+env.v+'), '+esc(C.cuandoTexto(env.t))+'.':'No enviado.')+'</p>'+
      (paso&&!env?'<p class="pc-est aviso">Ya pasó la hora de corte ('+esc(cx.cedis.co)+' del día anterior): tu pedido llegará tarde.</p>':'');
  }
  function confHTML(cx,a){
    if(!a.conf)return '';
    var nom={};cx.formato.l.forEach(function(i){nom[i[0]]=i[1]});
    var falt=a.conf.r.filter(function(r){return num(r[1])<num(a.q[r[0]]||0)});
    return '<section class="pc-conf" aria-labelledby="pcConfT"><h4 id="pcConfT">Lo que surte el Cedis</h4><p class="'+(falt.length?'neg':'pc-ok')+'">'+
      (falt.length?falt.length+(falt.length===1?' insumo con faltante':' insumos con faltante'):'Surte todo lo que pediste')+' · confirmado '+esc(C.cuandoTexto(a.conf.t))+(a.conf.pv&&a.enviado&&a.conf.pv<a.enviado.v?' (sobre tu versión '+a.conf.pv+'; después mandaste otra)':'')+'</p>'+
      '<div class="cd-tw"><table class="cd-t"><thead><tr><th scope="col">Insumo</th><th scope="col" class="num">Pediste</th><th scope="col" class="num">Surte</th><th scope="col">Nota</th></tr></thead><tbody>'+
      a.conf.r.map(function(r){var p=num(a.q[r[0]]||0),s=num(r[1]);return '<tr'+(s<p?' class="pc-falta"':'')+'><th scope="row">'+esc(nom[r[0]]||r[0])+'</th><td class="num">'+cant(p)+'</td><td class="num'+(s<p?' neg':'')+'">'+cant(s)+'</td><td>'+esc(r[2]||'')+'</td></tr>'}).join('')+
      '</tbody></table></div></section>';
  }
  function pintar(foco){
    if(!vivo)return;
    var cx=C.conexion(cid);
    if(!cx){raiz.innerHTML='<p class="hint">Esta página es para pedir a un Cedis. Abre la invitación que te mandó tu Cedis en este navegador.</p>';return}
    var a=cx.actual||C.pedidoActual(cid),ed=!!op.editable,errs=errores(cx,a);
    var lim=C.limite(a.fecha,cx.cedis.co),cat='',h='';
    var lista=cx.formato.l.filter(function(i){return !soloPedido||num(a.q[i[0]])>0});
    lista.forEach(function(i,n){
      if(i[3]!==cat){if(cat)h+='</ul>';cat=i[3];h+='<h4 class="pc-cat">'+esc(cat)+'</h4><ul class="pc-l">'}
      var q=a.q[i[0]],id='pcq-'+i[0].replace(/\W/g,'_'),e=errs[i[0]];
      h+='<li class="pc-i'+(num(q)>0?' con':'')+'"><label for="'+id+'"><b>'+esc(i[1])+'</b><small>'+esc(i[2])+(num(i[4])>1?' · mínimo '+cant(i[4]):'')+(num(i[5])>1?' · de '+cant(i[5])+' en '+cant(i[5]):'')+'</small></label>'+
        (ed?'<input type="number" id="'+id+'" min="0" step="'+(num(i[5])>1?num(i[5]):'any')+'" inputmode="decimal" data-q="'+esc(i[0])+'" value="'+(q==null||q===''?'':esc(String(q)))+'"'+(e?' aria-invalid="true" aria-describedby="'+id+'-e"':'')+'>':
          '<span class="pc-v">'+(num(q)>0?cant(num(q)):'—')+'</span>')+
        (e?'<span class="pc-err" id="'+id+'-e">'+esc(e)+'</span>':'')+'</li>';
    });
    if(cat)h+='</ul>';
    if(!lista.length)h='<p class="cd-vacio">'+(soloPedido?'Todavía no pides nada.':'Tu formato no trae insumos.')+'</p>';
    var antes=(cx.historial||[]).filter(function(x){return x.enviado}).length;
    raiz.innerHTML=
      '<div class="cd-cab"><div><b class="cd-nom">Pedido a '+esc(cx.cedis.n)+'</b><small>'+esc(cx.suc.n)+' · Folio '+esc(a.folio)+'</small></div></div>'+
      '<div class="pc-datos">'+(ed?'<label class="campo-l"><span>Entrega</span><input type="date" data-pc="fecha" value="'+esc(a.fecha)+'"></label>':'<p><b>Entrega:</b> '+esc(C.fechaTexto(a.fecha))+'</p>')+
        '<p class="hint">'+(lim?'Mándalo antes de las '+esc(cx.cedis.co)+' del '+esc(lim.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}))+'. ':'')+'Entregas: '+esc(C.diasTexto(cx.cedis.d))+'.</p></div>'+
      (ed?'<div class="pc-barra">'+(antes?'<button type="button" class="btn" data-pc="repetir">'+ico('historial')+'Repetir el último pedido</button>':'')+
        '<label class="pl-op"><input type="checkbox" data-pc="solo"'+(soloPedido?' checked':'')+'><span>Solo lo pedido</span></label></div>':'')+
      h+
      (ed?'<label class="campo-l pc-notas"><span>Notas para el Cedis</span><textarea data-pc="notas" rows="2" maxlength="500">'+esc(a.notas||'')+'</textarea></label>':(a.notas?'<p><b>Notas:</b> '+esc(a.notas)+'</p>':''))+
      '<div class="pc-res" aria-live="polite">'+estado(cx,a)+'</div>'+
      (ed?'<div class="pc-bt"><button type="button" class="btn pri" data-pc="enviar">'+ico('enlace')+(a.enviado?'Enviar otra vez al Cedis':'Enviar al Cedis')+'</button>'+
        (a.enviado?'<button type="button" class="btn" data-pc="nuevo">'+ico('crear')+'Empezar el siguiente pedido</button>':'')+'</div>':'')+
      confHTML(cx,a)+
      ((cx.historial||[]).length?'<details class="pc-hist"><summary>Pedidos anteriores ('+cx.historial.length+')</summary><ul>'+cx.historial.map(function(x){
        var n=Object.keys(x.q||{}).filter(function(k){return num(x.q[k])>0}).length;
        return '<li><b>'+esc(x.folio)+'</b> · '+esc(C.fechaTexto(x.fecha))+' · '+n+(n===1?' insumo':' insumos')+' · '+(x.conf?'Confirmado':x.enviado?'Enviado':'Sin enviar')+'</li>'}).join('')+'</ul></details>':'')+
      '<p class="cd-msg" role="status"></p>';
    if(foco){var f=raiz.querySelector(foco);if(f){f.focus({preventScroll:true});if(f.type==='number'||f.tagName==='TEXTAREA')try{var l=f.value.length;f.setSelectionRange&&f.type!=='number'&&f.setSelectionRange(l,l)}catch(x){}}}
  }
  function refrescarEstado(){var cx=C.conexion(cid);if(!cx||!cx.actual)return;var r=$('.pc-res',raiz);if(r)r.innerHTML=estado(cx,cx.actual)}
  function decir(t){var m=$('.cd-msg',raiz);if(m)m.textContent=t}
  var escribiendo=false;
  raiz.addEventListener('input',function(e){
    var t=e.target,k=t.getAttribute('data-q');
    escribiendo=true;
    if(k)C.cambiarPedido(cid,function(a){if(t.value==='')delete a.q[k];else a.q[k]=num(t.value)});
    else if(t.matches('[data-pc="notas"]'))C.cambiarPedido(cid,function(a){a.notas=t.value.slice(0,500)});
    escribiendo=false;
    refrescarEstado();
  });
  raiz.addEventListener('change',function(e){
    var t=e.target,k=t.getAttribute('data-q');
    if(t.matches('[data-pc="fecha"]')){if(/^\d{4}-\d{2}-\d{2}$/.test(t.value))C.cambiarPedido(cid,function(a){a.fecha=t.value});pintar('[data-pc="fecha"]')}
    else if(t.matches('[data-pc="solo"]')){soloPedido=t.checked;pintar('[data-pc="solo"]')}
    else if(k){pintar(document.activeElement&&document.activeElement.getAttribute('data-q')?'[data-q="'+document.activeElement.getAttribute('data-q')+'"]':null)}
  });
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('[data-pc]');if(!b||b.tagName==='INPUT'||b.tagName==='TEXTAREA'||b.getAttribute('aria-disabled')==='true')return;
    var a=b.getAttribute('data-pc'),cx=C.conexion(cid);
    if(a==='repetir'){
      var ult=(cx.historial||[]).filter(function(x){return x.enviado})[0];if(!ult)return;
      C.cambiarPedido(cid,function(p){p.q=JSON.parse(JSON.stringify(ult.q||{}))});pintar('[data-pc="repetir"]');decir('Se copiaron las cantidades del pedido '+ult.folio+'.');
    }else if(a==='nuevo'){
      C.nuevoPedido(cid);pintar('[data-pc="enviar"]');decir('Pedido nuevo para el '+C.fechaTexto(C.conexion(cid).actual.fecha)+'.');
    }else if(a==='enviar'){
      var p=cx.actual,n=Object.keys(errores(cx,p)).length,lleva=cx.formato.l.filter(function(i){return num(p.q[i[0]])>0}).length;
      if(n){decir('Revisa las cantidades marcadas antes de enviar.');var f=raiz.querySelector('[aria-invalid="true"]');if(f)f.focus();return}
      if(!lleva){decir('Escribe la cantidad de al menos un insumo.');return}
      b.setAttribute('aria-disabled','true');
      C.enlacePedido(cid).then(function(r){
        pintar('[data-pc="enviar"]');
        var pp=C.conexion(cid).actual;
        compartir({titulo:'Enviar al Cedis',mensaje:'Pedido de '+cx.suc.n+' para el '+C.fechaTexto(pp.fecha)+' ('+lleva+(lleva===1?' insumo':' insumos')+', versión '+pp.enviado.v+'). Folio '+pp.folio+':',
          url:r.url,texto:r.texto,largo:r.largo,asunto:'Pedido '+pp.folio+' de '+cx.suc.n,archivo:'pedido-'+pp.folio+'.onebook'});
      },function(er){b.removeAttribute('aria-disabled');decir(er.message)});
    }
  });
  var quitar=C.on(function(c){if(vivo&&!escribiendo&&!document.querySelector('dialog.cd-dlg[open]'))pintar(document.activeElement&&raiz.contains(document.activeElement)&&document.activeElement.getAttribute('data-q')?'[data-q="'+document.activeElement.getAttribute('data-q')+'"]':null)});
  pintar();
  return {destruir:function(){vivo=false;quitar()}};
}
/* En papel: lo pedido (sin los ceros) */
function papelPedido(a){
  var cx=C.conexion(a.cedis);if(!cx)return '<p>Pedido a un Cedis.</p>';
  var p=cx.actual;if(!p)return '<p>Sin pedido.</p>';
  var l=cx.formato.l.filter(function(i){return num(p.q[i[0]])>0});
  return '<p><b>Pedido a '+esc(cx.cedis.n)+'</b> · '+esc(cx.suc.n)+' · Folio '+esc(p.folio)+' · Entrega: '+esc(C.fechaTexto(p.fecha))+'</p>'+
    '<table class="cd-t"><thead><tr><th>Insumo</th><th>Presentación</th><th class="num">Cantidad</th></tr></thead><tbody>'+
    l.map(function(i){return '<tr><td>'+esc(i[1])+'</td><td>'+esc(i[2])+'</td><td class="num">'+cant(num(p.q[i[0]]))+'</td></tr>'}).join('')+'</tbody></table>'+(p.notas?'<p><b>Notas:</b> '+esc(p.notas)+'</p>':'');
}
function papelCedis(){
  var y=C.yo();if(!y)return '<p>Pedidos de sucursales.</p>';
  var f=C.fechas().filter(function(x){return x>=C.hoy()}).slice(-1)[0]||C.fechas()[0];
  return '<p><b>'+esc(y.nombre)+'</b> · Pedidos para el '+esc(C.fechaTexto(f))+'</p>'+tablaConsolidado(consolidado(f,true));
}

/* ---------- Registrar: leer, imprimir y editor ---------- */
var BLOQUES={
  cedis:{montar:function(r,o){return montarCedis(r,o)},etiqueta:'Pedidos de sucursales',def:{},papel:papelCedis,
    texto:function(){var y=C.yo();return 'Pedidos de sucursales'+(y?' de '+y.nombre:'')},
    insertar:{t:'Pedidos de sucursales',d:'El Cedis: recibe los pedidos de tus sucursales, el consolidado y las hojas de surtido',i:'caja',p:'cedis pedidos sucursales consolidado surtido insumos almacen central'}},
  pedidocedis:{montar:function(r,o){return montarPedido(r,o)},etiqueta:'Pedido al Cedis',def:{cedis:''},papel:papelPedido,
    texto:function(a){var cx=C.conexion(a.cedis);return 'Pedido a '+(cx?cx.cedis.n:'un Cedis')}}
};
Object.keys(BLOQUES).forEach(function(nombre){
  var D=BLOQUES[nombre];
  function editableAlLeer(){return !!(AT.docActual&&AT.docCambio&&document.body.getAttribute('data-pagina')==='documento')}
  if(AT.bloques&&AT.bloques.registrar)AT.bloques.registrar(nombre,{
    dibujar:function(n,ctx,h){
      var a=h.attrs(n),s=document.createElement('section');s.setAttribute('aria-label',D.etiqueta);
      var pag=document.body.getAttribute('data-pagina');
      if(pag!=='documento'){s.className='cd-papel';s.innerHTML=D.papel(a);return s}
      D.montar(s,{editable:editableAlLeer(),cedis:a.cedis});
      return s;
    },
    texto:function(n){return D.texto(n.attrs||{})+'\n'}
  });
  if(AT.piezas&&AT.piezas.md)AT.piezas.md[nombre]=function(n){return '**'+D.etiqueta+'**\n\n'+D.texto(n.attrs||{})};
  var T=window.Tiptap;
  if(!T||!AT.editor)return;
  var attrs={};Object.keys(D.def).forEach(function(k){attrs[k]={default:D.def[k],parseHTML:function(e){return e.getAttribute('data-'+k)||D.def[k]},renderHTML:function(a){var o={};o['data-'+k]=a[k];return o}}});
  var Nodo=T.Node.create({
    name:nombre,group:'block',atom:true,selectable:true,draggable:false,
    addAttributes:function(){return attrs},
    parseHTML:function(){return [{tag:'div[data-'+nombre+']'}]},
    renderHTML:function(o){var x={};x['data-'+nombre]='';return ['div',T.mergeAttributes(o.HTMLAttributes,x)]},
    addNodeView:function(){
      return function(p){
        var dom=document.createElement('section');dom.contentEditable='false';dom.className='nb nb-ed cd-ed';
        var cab=document.createElement('div');cab.className='ed-rep-h';cab.innerHTML='<span class="ed-et">'+esc(D.etiqueta)+'</span>';
        var cuerpo=document.createElement('div');dom.appendChild(cab);dom.appendChild(cuerpo);
        var ctl=D.montar(cuerpo,{editable:true,cedis:p.node.attrs.cedis});
        return {dom:dom,update:function(n){return n.type.name===nombre},destroy:function(){ctl.destruir()},stopEvent:function(){return true},ignoreMutation:function(){return true}};
      };
    }
  });
  AT.editorExtensiones=(AT.editorExtensiones||[]).concat([Nodo]);
  if(AT.editorConId)AT.editorConId.push(nombre);
  if(D.insertar&&AT.editorInsertar)AT.editorInsertar.push({k:nombre,t:D.insertar.t,d:D.insertar.d,i:D.insertar.i,p:D.insertar.p,modulo:'negocio',
    f:function(c){return c.insertContent({type:nombre,attrs:{}})}});
});
/* Al imprimir la página: las bases del Cedis ya leídas */
if(B.precargas)B.precargas.push(function(doc){
  var t=JSON.stringify(doc&&doc.contenido||{});
  if(t.indexOf('"type":"cedis"')<0)return null;
  return C.cargar();
});

AT.pedidos={compartir:compartir,imprimir:imprimir,descargarCSV:descargarCSV,consolidado:consolidado,hojaHTML:hojaHTML,montarCedis:montarCedis,montarPedido:montarPedido};
})();
