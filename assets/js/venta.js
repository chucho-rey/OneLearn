/* OneBook: bloque «Nota de venta» (fase F4, usa negocio.js).
   Un recibo con folio consecutivo (V-001, de AT.folio), fecha, cliente, conceptos (cantidad × precio), descuento,
   IVA (sin IVA, incluido en los precios o aparte, 16 %), forma de pago y, en efectivo, lo recibido y el cambio.
   Al leer y al imprimir sale como recibo con el nombre y el teléfono del negocio (de «Tu espacio»). No es una
   factura (CFDI): lo dice al pie.
   attrs: {folio, fecha, cliente, conceptos:[{cant, desc, precio}], descuento, iva:'no'|'incluido'|'aparte',
           pago:'efectivo'|'tarjeta'|'transferencia'|'otro', recibido, notas}. */
(function(){
'use strict';
var AT=window.AT,N=AT.negocio;if(!N)return;
var esc=N.esc,dinero=N.dinero,monto=N.monto,c=N.centavos,campo=N.campo;
var TASA=0.16;
var IVA=[['no','Sin IVA'],['incluido','IVA incluido en los precios (16 %)'],['aparte','Más IVA (16 %)']];
var PAGO=[['efectivo','Efectivo'],['tarjeta','Tarjeta'],['transferencia','Transferencia'],['otro','Otro']];
var DEF={folio:'',fecha:'',cliente:'',conceptos:[],descuento:'',iva:'no',pago:'efectivo',recibido:'',notas:''};
function concepto(){return {cant:'1',desc:'',precio:''}}

function cant(v){var t=String(v==null?'':v).trim();if(!t)return 1;var n=N.num(t);return n>0?n:0}
function importe(f){return Math.round(cant(f.cant)*c(f.precio))}
function usados(x){return x.conceptos.filter(function(f){return f.desc.trim()||c(f.precio)})}
function calcular(x){
  var sub=x.conceptos.reduce(function(s,f){return s+importe(f)},0);
  var desc=Math.min(c(x.descuento),sub),base=sub-desc,iva=0,total=base;
  if(x.iva==='aparte'){iva=Math.round(base*TASA);total=base+iva}
  else if(x.iva==='incluido'){iva=total-Math.round(total/(1+TASA))}
  var hayRecibido=x.pago==='efectivo'&&String(x.recibido).trim()!=='';
  var rec=c(x.recibido);
  return {sub:sub,desc:desc,iva:iva,total:total,hayRecibido:hayRecibido,recibido:rec,cambio:rec-total};
}
function nombreDe(lista,v){var o=lista.filter(function(x){return x[0]===v})[0];return o?o[1]:''}
function totales(x){
  var r=calcular(x);
  function f(t,m,cls){return '<tr'+(cls?' class="'+cls+'"':'')+'><th scope="row">'+t+'</th><td class="num">'+m+'</td></tr>'}
  return '<table class="nb-tab nb-totales"><tbody>'+
    f('Subtotal',dinero(r.sub))+
    (r.desc?f('Descuento',monto(-r.desc)):'')+
    (x.iva==='aparte'?f('IVA (16 %)',dinero(r.iva)):'')+
    f('Total','<b>'+dinero(r.total)+'</b>','nb-tot')+
    (x.iva==='incluido'&&r.total?f('IVA incluido (16 %)',dinero(r.iva),'nb-iva'):'')+
    (r.hayRecibido?f('Recibido',dinero(r.recibido))+f(r.cambio<0?'Falta':'Cambio',r.cambio<0?monto(r.cambio):'<b>'+dinero(r.cambio)+'</b>',r.cambio<0?'nb-falta':'nb-tot'):'')+
    '</tbody></table>';
}
function resultado(x){return '<div aria-live="polite">'+totales(x)+'</div>'}
function titulo(x){return 'Nota de venta'+(x.folio.trim()?' '+x.folio.trim():'')}

/* ---------- Al editar ---------- */
function editar(x,uid){
  var filas=x.conceptos.map(function(f,i){
    var b='conceptos.'+i+'.';
    return '<div class="nb-fila nb-con">'+
      '<input type="text" inputmode="decimal" class="nb-num" data-k="'+b+'cant" value="'+esc(f.cant)+'" aria-label="Cantidad" placeholder="1">'+
      '<input type="text" data-k="'+b+'desc" value="'+esc(f.desc)+'" placeholder="Descripción" aria-label="Descripción">'+
      '<input type="text" inputmode="decimal" class="nb-num" data-k="'+b+'precio" value="'+esc(f.precio)+'" placeholder="$0" aria-label="Precio unitario" data-enter="agregar">'+
      '<output class="nb-imp" data-imp="'+i+'">'+dinero(importe(f))+'</output>'+
      N.quitar('conceptos',i,'el concepto '+(f.desc||''))+'</div>';
  }).join('');
  return '<div class="nb-form nb-form3">'+campo('Folio','folio',x.folio,{ph:'V-001'})+campo('Fecha','fecha',x.fecha,{tipo:'date'})+campo('Cliente (opcional)','cliente',x.cliente,{ph:'Nombre'})+'</div>'+
    '<div class="nb-con-h" aria-hidden="true"><span>Cant.</span><span>Descripción</span><span>Precio</span><span>Importe</span></div>'+
    (filas?'<div class="nb-filas">'+filas+'</div>':'')+
    '<button type="button" class="btn nb-mas" data-acc="agregar" data-lista="conceptos" data-foco="desc">+ Agregar concepto</button>'+
    '<div class="nb-form">'+campo('Descuento ($)','descuento',x.descuento,{modo:'decimal',ph:'$0'})+
      '<label class="nb-c"><span>IVA</span><select data-k="iva">'+N.opciones(IVA,x.iva)+'</select></label>'+
      '<label class="nb-c"><span>Forma de pago</span><select data-k="pago">'+N.opciones(PAGO,x.pago)+'</select></label>'+
      (x.pago==='efectivo'?campo('Recibido (efectivo)','recibido',x.recibido,{modo:'decimal',ph:'$0'}):'')+
      campo('Notas','notas',x.notas,{ph:'Ej. garantía de 30 días',clase:'nb-ancho'})+'</div>'+
    '<div class="nb-res"></div>';
}
function refrescar(x,dom){
  x.conceptos.forEach(function(f,i){var o=dom.querySelector('[data-imp="'+i+'"]');if(o)o.textContent=dinero(importe(f))});
}

/* ---------- Al leer y al imprimir: el recibo ---------- */
function leer(x){
  var neg=N.negocio(),lista=usados(x);
  return '<header class="nv-h"><div class="nv-neg">'+(neg.nombre?'<b>'+esc(neg.nombre)+'</b>':'')+(neg.telefono?'<span>Tel. '+esc(neg.telefono)+'</span>':'')+'</div>'+
    '<div class="nv-folio"><span>Nota de venta</span>'+(x.folio.trim()?'<b>'+esc(x.folio.trim())+'</b>':'')+(x.fecha?'<span>'+esc(N.fechaTexto(x.fecha))+'</span>':'')+'</div></header>'+
    (x.cliente.trim()?'<p class="nb-p"><b>Cliente:</b> '+esc(x.cliente.trim())+'</p>':'')+
    (lista.length?'<div class="nb-scroll"><table class="nb-tab"><thead><tr><th scope="col" class="num">Cant.</th><th scope="col">Descripción</th><th scope="col" class="num">P. unitario</th><th scope="col" class="num">Importe</th></tr></thead><tbody>'+
      lista.map(function(f){return '<tr><td class="num">'+esc(N.cantidad(cant(f.cant)))+'</td><td>'+esc(f.desc)+'</td><td class="num">'+dinero(c(f.precio))+'</td><td class="num">'+dinero(importe(f))+'</td></tr>'}).join('')+
      '</tbody></table></div>':'<p class="hint">Esta nota todavía no tiene conceptos.</p>')+
    totales(x)+
    '<p class="nb-p"><b>Forma de pago:</b> '+esc(nombreDe(PAGO,x.pago)||'Efectivo')+'</p>'+
    (x.notas.trim()?'<p class="nb-p">'+esc(x.notas.trim())+'</p>':'')+
    '<p class="nv-legal">Este documento no es un comprobante fiscal.</p>';
}
function texto(x){
  var r=calcular(x);
  return titulo(x)+(x.fecha?' del '+N.fechaTexto(x.fecha):'')+(x.cliente.trim()?' para '+x.cliente.trim():'')+'. '+
    usados(x).map(function(f){return N.cantidad(cant(f.cant))+' × '+f.desc+' '+dinero(importe(f))}).join('; ')+'. Total '+dinero(r.total)+'.';
}
function md(x){
  var r=calcular(x),neg=N.negocio();
  return '**'+titulo(x)+'**'+(x.fecha?' · '+N.fechaTexto(x.fecha):'')+(neg.nombre?'\n\n'+neg.nombre:'')+(x.cliente.trim()?'\n\nCliente: '+x.cliente.trim():'')+'\n\n'+
    '| Cant. | Descripción | P. unitario | Importe |\n| ---: | --- | ---: | ---: |\n'+
    usados(x).map(function(f){return '| '+N.cantidad(cant(f.cant))+' | '+f.desc.replace(/\|/g,'\\|')+' | '+dinero(c(f.precio))+' | '+dinero(importe(f))+' |'}).join('\n')+
    '\n\nSubtotal '+dinero(r.sub)+(r.desc?' · descuento '+dinero(-r.desc):'')+(x.iva==='aparte'?' · IVA '+dinero(r.iva):'')+' · **Total '+dinero(r.total)+'**'+
    (x.iva==='incluido'?' (IVA incluido '+dinero(r.iva)+')':'')+
    '\n\nForma de pago: '+(nombreDe(PAGO,x.pago)||'Efectivo')+(r.hayRecibido?' · recibido '+dinero(r.recibido)+' · '+(r.cambio<0?'falta '+dinero(-r.cambio):'cambio '+dinero(r.cambio)):'')+
    (x.notas.trim()?'\n\n'+x.notas.trim():'')+'\n\nEste documento no es un comprobante fiscal.';
}

N.bloque('venta',{
  etiqueta:'Nota de venta',def:DEF,
  filas:{conceptos:concepto},
  editar:editar,resultado:resultado,refrescar:refrescar,leer:leer,texto:texto,md:md,
  foco:'[data-k="conceptos.0.desc"]',
  insertar:{t:'Nota de venta',d:'Recibo con folio, conceptos, IVA, total y cambio',i:'venta',
    p:'nota venta recibo ticket folio cobro cliente total iva cambio vender',
    attrs:function(){return {folio:N.folio('V'),fecha:N.hoy(),conceptos:[concepto()]}}}
});
AT.venta={calcular:function(a){return calcular(N.completar('venta',a))}};
})();
