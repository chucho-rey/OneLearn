/* OneBook: bloque «Corte de caja» (fase F4; usa negocio.js).
   El fondo con que abriste, las ventas del día por forma de pago, las entradas y salidas de efectivo, y el
   efectivo que contaste (el total o billete por billete). Calcula el efectivo que debería haber y la diferencia:
   sobrante (+) o faltante (−, en rojo). Con el fondo para mañana dice cuánto te llevas.
   attrs: {titulo, fecha, fondo, ventas:{efectivo, tarjeta, transferencia, otras}, movs:[{tipo:'entrada'|'salida',
           concepto, monto}], modo:'total'|'billetes', contado, billetes:{d1000…d050: cuántos}, manana, notas}. */
(function(){
'use strict';
var AT=window.AT,N=AT.negocio;if(!N)return;
var esc=N.esc,dinero=N.dinero,monto=N.monto,c=N.centavos,campo=N.campo;
var DEN=[['d1000',100000,'$1,000'],['d500',50000,'$500'],['d200',20000,'$200'],['d100',10000,'$100'],['d50',5000,'$50'],['d20',2000,'$20'],
  ['d10',1000,'$10'],['d5',500,'$5'],['d2',200,'$2'],['d1',100,'$1'],['d050',50,'50¢']];
var VENTAS=[['efectivo','En efectivo'],['tarjeta','Con tarjeta'],['transferencia','Por transferencia'],['otras','Otras (vales, apps)']];
var billetes={};DEN.forEach(function(d){billetes[d[0]]=''});
var DEF={titulo:'',fecha:'',fondo:'',ventas:{efectivo:'',tarjeta:'',transferencia:'',otras:''},movs:[],modo:'total',contado:'',billetes:billetes,manana:'',notas:''};

function piezas(v){var n=parseInt(v,10);return n>0?n:0}
function calcular(x){
  var v={};VENTAS.forEach(function(k){v[k[0]]=c(x.ventas[k[0]])});
  var ventas=v.efectivo+v.tarjeta+v.transferencia+v.otras;
  var entradas=0,salidas=0;
  x.movs.forEach(function(m){var k=c(m.monto);if(m.tipo==='entrada')entradas+=k;else salidas+=k});
  var fondo=c(x.fondo),esperado=fondo+v.efectivo+entradas-salidas;
  var contado,hay;
  if(x.modo==='billetes'){
    contado=DEN.reduce(function(s,d){return s+piezas(x.billetes[d[0]])*d[1]},0);
    hay=DEN.some(function(d){return piezas(x.billetes[d[0]])>0});
  }else{contado=c(x.contado);hay=String(x.contado).trim()!==''}
  var manana=String(x.manana).trim()!==''?c(x.manana):null;
  return {v:v,ventas:ventas,entradas:entradas,salidas:salidas,fondo:fondo,esperado:esperado,contado:contado,hay:hay,
    dif:contado-esperado,manana:manana,retiro:manana==null?null:contado-manana};
}
function nombreDif(r){return !r.hay?'Diferencia':r.dif>0?'Sobrante':r.dif<0?'Faltante':'Diferencia'}
function fraseDif(r){
  if(!r.hay)return 'Cuenta el efectivo para ver si la caja cuadra.';
  if(!r.dif)return 'La caja cuadra.';
  return (r.dif>0?'Sobran ':'Faltan ')+dinero(Math.abs(r.dif))+' en la caja.';
}
function titulo(x){return (x.titulo||'').trim()||'Corte de caja'}

/* El resumen: ventas, esperado, contado y diferencia */
function resultado(x){
  var r=calcular(x);
  var cuadra=r.hay&&!r.dif;
  return N.resumen([
    ['Ventas del día',monto(r.ventas)],
    ['Efectivo esperado',monto(r.esperado)],
    ['Efectivo contado',r.hay?monto(r.contado):'—'],
    [nombreDif(r),r.hay?monto(r.dif,true):'—',r.hay?(r.dif<0?'nb-mal':cuadra||r.dif>0?'nb-bien':''):'']
  ])+
  '<p class="nb-p" aria-live="polite"><b>'+esc(fraseDif(r))+'</b> '+
    'Fondo '+dinero(r.fondo)+' + ventas en efectivo '+dinero(r.v.efectivo)+(r.entradas?' + entradas '+dinero(r.entradas):'')+(r.salidas?' − salidas '+dinero(r.salidas):'')+
    ' = '+dinero(r.esperado)+' esperado.</p>'+
  (r.manana!=null&&r.hay?'<p class="nb-p">'+(r.retiro>=0?'Dejas '+dinero(r.manana)+' de fondo para mañana y te llevas <b>'+dinero(r.retiro)+'</b>.':
    '<span class="nb-d neg">No alcanza para dejar '+dinero(r.manana)+' de fondo: faltan '+dinero(-r.retiro)+'.</span>')+'</p>':'');
}

/* ---------- Al editar ---------- */
function editar(x,uid){
  var movs=x.movs.map(function(m,i){
    return '<div class="nb-fila nb-mov"><label class="vh" for="'+uid+'-t'+i+'">Tipo</label>'+
      '<select id="'+uid+'-t'+i+'" data-k="movs.'+i+'.tipo">'+N.opciones([['salida','Salida'],['entrada','Entrada']],m.tipo)+'</select>'+
      '<input type="text" data-k="movs.'+i+'.concepto" value="'+esc(m.concepto)+'" placeholder="Concepto (ej. pago al proveedor)" aria-label="Concepto">'+
      '<input type="text" inputmode="decimal" class="nb-num" data-k="movs.'+i+'.monto" value="'+esc(m.monto)+'" placeholder="$0" aria-label="Monto">'+
      N.quitar('movs',i,'movimiento')+'</div>';
  }).join('');
  return '<input type="text" class="ed-fig-tit pg-tit" data-k="titulo" value="'+esc(x.titulo)+'" placeholder="Corte de caja (ej. Caja del turno de la mañana)" aria-label="Nombre del corte">'+
    '<div class="nb-form">'+campo('Fecha','fecha',x.fecha,{tipo:'date'})+campo('Fondo inicial (con lo que abriste)','fondo',x.fondo,{modo:'decimal',ph:'$500'})+'</div>'+
    '<fieldset class="nb-sec"><legend>Ventas del día</legend><div class="nb-form">'+
      VENTAS.map(function(v){return campo(v[1],'ventas.'+v[0],x.ventas[v[0]],{modo:'decimal',ph:'$0'})}).join('')+'</div></fieldset>'+
    '<fieldset class="nb-sec"><legend>Entradas y salidas de efectivo</legend>'+
      (movs?'<div class="nb-filas">'+movs+'</div>':'<p class="hint">Retiros, pagos a proveedores o cambio que agregaste a la caja.</p>')+
      '<button type="button" class="btn nb-mas" data-acc="agregar" data-lista="movs" data-foco="concepto">+ Agregar entrada o salida</button></fieldset>'+
    '<fieldset class="nb-sec"><legend>Al cerrar</legend>'+
      '<div class="nb-modo" role="radiogroup" aria-label="¿Cómo cuentas el efectivo?">'+
        '<label class="nb-op"><input type="radio" name="'+uid+'-m" value="total" data-k="modo"'+(x.modo!=='billetes'?' checked':'')+'>Escribo el total</label>'+
        '<label class="nb-op"><input type="radio" name="'+uid+'-m" value="billetes" data-k="modo"'+(x.modo==='billetes'?' checked':'')+'>Cuento billetes y monedas</label></div>'+
      (x.modo==='billetes'?'<div class="nb-den">'+DEN.map(function(d){
        return '<label class="nb-den-i"><span>'+d[2]+'</span><input type="number" min="0" step="1" inputmode="numeric" data-k="billetes.'+d[0]+'" value="'+esc(x.billetes[d[0]])+'" placeholder="0" aria-label="Cuántos de '+d[2]+'">'+
          '<output data-sub="'+d[0]+'"></output></label>';
      }).join('')+'</div><p class="nb-p nb-cont">Contaste <b data-sub="total"></b>.</p>':
        '<div class="nb-form">'+campo('Efectivo contado','contado',x.contado,{modo:'decimal',ph:'$0'})+'</div>')+
      '<div class="nb-form">'+campo('Fondo para mañana (opcional)','manana',x.manana,{modo:'decimal',ph:'$500'})+campo('Notas','notas',x.notas,{ph:'Ej. el faltante es un billete roto'})+'</div>'+
    '</fieldset><div class="nb-res"></div>';
}
function refrescar(x,dom){
  if(x.modo!=='billetes')return;
  var r=calcular(x);
  DEN.forEach(function(d){var o=dom.querySelector('[data-sub="'+d[0]+'"]');if(o){var n=piezas(x.billetes[d[0]]);o.textContent=n?dinero(n*d[1]):''}});
  var t=dom.querySelector('[data-sub="total"]');if(t)t.textContent=dinero(r.contado);
}

/* ---------- Al leer y al imprimir ---------- */
function fila(t,m,cls){return '<tr'+(cls?' class="'+cls+'"':'')+'><th scope="row">'+t+'</th><td class="num">'+m+'</td></tr>'}
function leer(x){
  var r=calcular(x);
  var caja=fila('Fondo inicial',dinero(r.fondo))+fila('Ventas en efectivo','+'+dinero(r.v.efectivo))+
    x.movs.filter(function(m){return c(m.monto)}).map(function(m){
      var k=c(m.monto);
      return fila(esc((m.tipo==='entrada'?'Entrada':'Salida')+(m.concepto.trim()?': '+m.concepto.trim():'')),m.tipo==='entrada'?'+'+dinero(k):monto(-k));
    }).join('')+
    fila('Efectivo esperado','<b>'+dinero(r.esperado)+'</b>','nb-tot')+
    (r.hay?fila('Efectivo contado',dinero(r.contado))+fila(nombreDif(r),'<b>'+monto(r.dif,true)+'</b>','nb-tot'):'');
  var cuenta=x.modo==='billetes'&&r.hay?'<p class="nb-p nb-conteo">'+DEN.filter(function(d){return piezas(x.billetes[d[0]])}).map(function(d){
    var n=piezas(x.billetes[d[0]]);return n+' × '+d[2]+' = '+dinero(n*d[1]);
  }).join(' · ')+'</p>':'';
  return '<h3 class="nb-t">'+esc(titulo(x))+(x.fecha?'<small>'+esc(N.fechaLarga(x.fecha))+'</small>':'')+'</h3>'+
    resultado(x)+
    '<div class="nb-cols">'+
    '<div class="nb-scroll"><table class="nb-tab"><caption>Ventas</caption><tbody>'+VENTAS.map(function(v){return r.v[v[0]]?fila(v[1],dinero(r.v[v[0]])):''}).join('')+
      fila('Total de ventas','<b>'+dinero(r.ventas)+'</b>','nb-tot')+'</tbody></table></div>'+
    '<div class="nb-scroll"><table class="nb-tab"><caption>Efectivo en caja</caption><tbody>'+caja+'</tbody></table></div></div>'+
    cuenta+(x.notas.trim()?'<p class="nb-p"><b>Notas:</b> '+esc(x.notas.trim())+'</p>':'');
}
function texto(x){
  var r=calcular(x);
  return titulo(x)+(x.fecha?' del '+N.fechaTexto(x.fecha):'')+'. Ventas '+dinero(r.ventas)+'. Efectivo esperado '+dinero(r.esperado)+
    (r.hay?', contado '+dinero(r.contado)+'. '+fraseDif(r):'. '+fraseDif(r));
}
function md(x){
  var r=calcular(x);
  return '**'+titulo(x)+(x.fecha?' · '+N.fechaTexto(x.fecha):'')+'**\n\n'+
    VENTAS.filter(function(v){return r.v[v[0]]}).map(function(v){return '- Ventas '+v[1].toLowerCase()+': '+dinero(r.v[v[0]])}).join('\n')+(r.ventas?'\n':'')+
    '- Total de ventas: '+dinero(r.ventas)+'\n- Fondo inicial: '+dinero(r.fondo)+
    (r.entradas?'\n- Entradas: '+dinero(r.entradas):'')+(r.salidas?'\n- Salidas: −'+dinero(r.salidas):'')+
    '\n- Efectivo esperado: '+dinero(r.esperado)+(r.hay?'\n- Efectivo contado: '+dinero(r.contado)+'\n- '+nombreDif(r)+': '+dinero(r.dif,true):'')+
    '\n\n'+fraseDif(r)+(x.notas.trim()?'\n\nNotas: '+x.notas.trim():'');
}

N.bloque('corte',{
  etiqueta:'Corte de caja',def:DEF,
  filas:{movs:function(){return {tipo:'salida',concepto:'',monto:''}}},
  editar:editar,resultado:resultado,refrescar:refrescar,leer:leer,texto:texto,md:md,
  foco:'[data-k="fondo"]',
  insertar:{t:'Corte de caja',d:'Ventas, fondo y efectivo contado: ¿la caja cuadra?',i:'caja',
    p:'corte caja cierre arqueo efectivo ventas dia fondo faltante sobrante billetes monedas dinero',attrs:function(){return {fecha:N.hoy()}}}
});
AT.caja={calcular:function(a){return calcular(N.completar('corte',a))}};
})();
