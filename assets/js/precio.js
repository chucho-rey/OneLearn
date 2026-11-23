/* OneBook: bloque «Precio de venta» (calculadora; fase F4, usa negocio.js). También está en la página de bienvenida.
   Con el costo y cuánto quieres ganar sobre él, dice el precio de venta; o con un precio que ya tienes, dice tu
   ganancia real. Toma en cuenta el IVA que cobras y pagas (16 %, incluido en el precio) y la comisión de la tarjeta
   o de la plataforma (un % del precio). Puede redondear el precio hacia arriba ($0.50, $1, $5 o $10).
   Precio P: lo que te queda es P / (1 + IVA) − comisión × P; la ganancia es eso menos el costo.
   attrs: {titulo, costo, modo:'ganancia'|'precio', ganancia (% sobre el costo), precio, iva:'no'|'si', comision (%),
           redondeo:'no'|'50'|'100'|'500'|'1000' (centavos)}. */
(function(){
'use strict';
var AT=window.AT,N=AT.negocio;if(!N)return;
var esc=N.esc,dinero=N.dinero,monto=N.monto,c=N.centavos,campo=N.campo;
var TASA=0.16;
var REDONDEO=[['no','No redondear'],['50','A $0.50'],['100','A $1'],['500','A $5'],['1000','A $10']];
var DEF={titulo:'',costo:'',modo:'ganancia',ganancia:'30',precio:'',iva:'no',comision:'',redondeo:'no'};

function calcular(x){
  var costo=c(x.costo),t=x.iva==='si'?TASA:0,k=Math.max(0,Math.min(100,N.num(x.comision)))/100;
  var factor=1/(1+t)-k,P=0,error='';
  if(x.modo==='precio')P=c(x.precio);
  else if(costo){
    if(factor<=0)error='Con esa comisión no hay precio que alcance.';
    else{
      var g=N.num(x.ganancia)/100;
      P=Math.ceil(costo*(1+g)/factor-1e-6);
      var paso=parseInt(x.redondeo,10)||0;
      if(paso>0)P=Math.ceil(P/paso)*paso;
    }
  }
  var iva=P-Math.round(P/(1+t)),com=Math.round(P*k),neto=P-iva-com,gan=neto-costo;
  var sinIva=P-iva;
  return {costo:costo,precio:P,iva:iva,comision:com,neto:neto,ganancia:gan,error:error,
    margen:sinIva?gan/sinIva*100:0,sobreCosto:costo?gan/costo*100:null};
}
function resultado(x){
  var r=calcular(x);
  if(r.error)return '<p class="nb-p"><span class="nb-d neg">'+esc(r.error)+'</span></p>';
  if(!r.precio||!r.costo&&x.modo!=='precio')return '<p class="hint">'+(x.modo==='precio'?'Escribe el precio y el costo.':'Escribe cuánto te cuesta el producto.')+'</p>';
  return N.resumen([
    ['Precio de venta',dinero(r.precio),'nb-acento'],
    ['Ganas por pieza',monto(r.ganancia,true),r.ganancia<0?'nb-mal':r.ganancia>0?'nb-bien':''],
    ['Margen sobre el precio',r.ganancia<0?'<span class="nb-d neg">'+N.pct(r.margen)+'</span>':N.pct(r.margen)],
    ['Ganancia sobre el costo',r.sobreCosto==null?'—':r.ganancia<0?'<span class="nb-d neg">'+N.pct(r.sobreCosto)+'</span>':N.pct(r.sobreCosto)]
  ])+
  '<table class="nb-tab nb-desglose"><tbody>'+
    '<tr><th scope="row">Precio al cliente</th><td class="num">'+dinero(r.precio)+'</td></tr>'+
    (r.iva?'<tr><th scope="row">IVA que pagas (16 %)</th><td class="num">'+monto(-r.iva)+'</td></tr>':'')+
    (r.comision?'<tr><th scope="row">Comisión ('+esc(N.pct(N.num(x.comision),2))+')</th><td class="num">'+monto(-r.comision)+'</td></tr>':'')+
    '<tr><th scope="row">Costo</th><td class="num">'+monto(-r.costo)+'</td></tr>'+
    '<tr class="nb-tot"><th scope="row">Te queda de ganancia</th><td class="num">'+monto(r.ganancia,true)+'</td></tr>'+
  '</tbody></table>'+
  (r.ganancia<0?'<p class="nb-p"><span class="nb-d neg">Con ese precio pierdes '+dinero(-r.ganancia)+' en cada pieza.</span></p>':'');
}
function titulo(x){return (x.titulo||'').trim()||'Precio de venta'}

/* ---------- El formulario (al editar y en la página de bienvenida) ---------- */
function editar(x,uid,op){
  return (op&&op.suelto?'':'<input type="text" class="ed-fig-tit pg-tit" data-k="titulo" value="'+esc(x.titulo)+'" placeholder="¿De qué producto? (ej. Refresco de 600 ml)" aria-label="Producto">')+
    '<div class="nb-form">'+campo('Te cuesta (costo por pieza)','costo',x.costo,{modo:'decimal',ph:'$10'})+
    '<div class="nb-modo nb-ancho" role="radiogroup" aria-label="¿Qué quieres calcular?">'+
      '<label class="nb-op"><input type="radio" name="'+uid+'-m" value="ganancia" data-k="modo"'+(x.modo!=='precio'?' checked':'')+'>Sé cuánto quiero ganar</label>'+
      '<label class="nb-op"><input type="radio" name="'+uid+'-m" value="precio" data-k="modo"'+(x.modo==='precio'?' checked':'')+'>Ya tengo un precio</label></div>'+
    (x.modo==='precio'?campo('Precio de venta','precio',x.precio,{modo:'decimal',ph:'$15'}):
      campo('Quiero ganar (% sobre el costo)','ganancia',x.ganancia,{modo:'decimal',ph:'30'})+
      '<label class="nb-c"><span>Redondear el precio</span><select data-k="redondeo">'+N.opciones(REDONDEO,x.redondeo)+'</select></label>')+
    '<label class="nb-c"><span>IVA</span><select data-k="iva">'+N.opciones([['no','No cobro IVA'],['si','Cobro IVA (16 %, incluido en el precio)']],x.iva)+'</select></label>'+
    campo('Comisión de tarjeta o plataforma (%)','comision',x.comision,{modo:'decimal',ph:'0'})+
    '</div><div class="nb-res"></div><p class="vh nb-voz" aria-live="polite"></p>';
}
/* Un resumen corto para lectores de pantalla, sin leer todo el resultado cada vez que teclean */
var vozT=null;
function refrescar(x,dom){
  clearTimeout(vozT);
  vozT=setTimeout(function(){
    var v=dom.querySelector('.nb-voz'),r=calcular(x);if(!v)return;
    v.textContent=r.error||(r.precio?'Precio de venta '+dinero(r.precio)+'. Ganas '+dinero(r.ganancia,true)+' por pieza.':'');
  },700);
}

/* ---------- Al leer y al imprimir ---------- */
function leer(x){
  var r=calcular(x);
  return '<h3 class="nb-t">'+esc(titulo(x))+'</h3>'+
    '<p class="nb-p">Costo '+dinero(r.costo)+(x.modo==='precio'?'':' · quieres ganar '+esc(N.pct(N.num(x.ganancia)))+' sobre el costo')+
    (x.iva==='si'?' · con IVA':'')+(N.num(x.comision)?' · comisión '+esc(N.pct(N.num(x.comision),2)):'')+'</p>'+resultado(x);
}
function texto(x){
  var r=calcular(x);
  return titulo(x)+'. Costo '+dinero(r.costo)+', precio '+dinero(r.precio)+', ganancia por pieza '+dinero(r.ganancia,true)+'.';
}
function md(x){
  var r=calcular(x);
  return '**'+titulo(x)+'**\n\n- Costo: '+dinero(r.costo)+'\n- Precio de venta: '+dinero(r.precio)+
    (r.iva?'\n- IVA (16 %): '+dinero(r.iva):'')+(r.comision?'\n- Comisión: '+dinero(r.comision):'')+
    '\n- Ganancia por pieza: '+dinero(r.ganancia,true)+'\n- Margen sobre el precio: '+N.pct(r.margen);
}

N.bloque('precio',{
  etiqueta:'Precio de venta',def:DEF,
  editar:editar,resultado:resultado,refrescar:refrescar,leer:leer,texto:texto,md:md,
  foco:'[data-k="costo"]',
  insertar:{t:'Precio de venta',d:'Calcula el precio con tu ganancia, IVA y comisión',i:'precio',
    p:'precio venta calculadora ganancia margen costo utilidad iva comision tarjeta cuanto cobrar'}
});
AT.precio={calcular:function(a){return calcular(N.completar('precio',a))}};
})();
