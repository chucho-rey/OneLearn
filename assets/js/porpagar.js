/* OneBook: bloque «Cuentas por pagar» (fase F4, usa negocio.js).
   Lo que debes a tus proveedores: proveedor, concepto (factura o nota), monto y fecha en que vence. Dice lo vencido
   (en rojo), lo que vence esta semana y el total por pagar, también por proveedor. Al marcar «Pagada» queda con la
   fecha del día; al leer, en tus documentos, también se marca.
   attrs: {titulo, cuentas:[{proveedor, concepto, monto, vence:'AAAA-MM-DD', pagada:'AAAA-MM-DD'|''}]}. */
(function(){
'use strict';
var AT=window.AT,N=AT.negocio;if(!N)return;
var esc=N.esc,dinero=N.dinero,monto=N.monto,c=N.centavos;
var DEF={titulo:'',cuentas:[]};
function cuenta(){return {proveedor:'',concepto:'',monto:'',vence:'',pagada:''}}

/* Días que faltan para que venza (negativo: ya venció); null sin fecha */
function faltan(cu,h){return /^\d{4}-\d{2}-\d{2}$/.test(cu.vence)?N.dias(h,cu.vence):null}
function estado(cu,h){
  if(cu.pagada)return {t:'Pagada'+(/^\d{4}-\d{2}-\d{2}$/.test(cu.pagada)?' el '+N.fechaTexto(cu.pagada):''),k:'ok'};
  var d=faltan(cu,h);
  if(d==null)return {t:'Sin fecha',k:''};
  if(d<0)return {t:'Vencida hace '+(-d)+(d===-1?' día':' días'),k:'mal'};
  if(d===0)return {t:'Vence hoy',k:'ojo'};
  if(d===1)return {t:'Vence mañana',k:'ojo'};
  return {t:'Vence en '+d+' días',k:d<=7?'ojo':''};
}
function calcular(x){
  var h=N.hoy(),r={porPagar:0,vencido:0,semana:0,pagado:0,pend:0,prov:{}};
  x.cuentas.forEach(function(cu){
    var k=c(cu.monto);if(!k)return;
    if(cu.pagada){r.pagado+=k;return}
    r.porPagar+=k;r.pend++;
    var d=faltan(cu,h);
    if(d!=null&&d<0)r.vencido+=k;else if(d!=null&&d<=7)r.semana+=k;
    var n=(cu.proveedor||'').trim()||'Sin proveedor',cl=n.toLowerCase();
    if(!r.prov[cl])r.prov[cl]={nombre:n,total:0};
    r.prov[cl].total+=k;
  });
  r.porProveedor=Object.keys(r.prov).map(function(k){return r.prov[k]}).sort(function(a,b){return b.total-a.total});
  return r;
}
function titulo(x){return (x.titulo||'').trim()||'Cuentas por pagar'}
function resultado(x){
  var r=calcular(x);
  return N.resumen([
    ['Por pagar',monto(r.porPagar),'nb-acento'],
    ['Vencido',r.vencido?'<span class="nb-d neg">'+dinero(r.vencido)+'</span>':dinero(0),r.vencido?'nb-mal':''],
    ['Vence esta semana',dinero(r.semana),r.semana?'nb-ojo':''],
    ['Pagado',dinero(r.pagado)]
  ])+
  (r.porProveedor.length>1?'<p class="nb-p nb-prov"><b>Por proveedor:</b> '+r.porProveedor.map(function(o){return esc(o.nombre)+' '+dinero(o.total)}).join(' · ')+'</p>':'');
}
/* Pendientes primero, de la que vence antes a la que vence después; las pagadas al final */
function ordenadas(x){
  return x.cuentas.map(function(cu,i){return {cu:cu,i:i}}).sort(function(a,b){
    if(!!a.cu.pagada!==!!b.cu.pagada)return a.cu.pagada?1:-1;
    return (a.cu.vence||'9').localeCompare(b.cu.vence||'9')||a.i-b.i;
  });
}

/* ---------- Al editar ---------- */
function editar(x,uid){
  var h=N.hoy(),provs={};
  x.cuentas.forEach(function(cu){var n=(cu.proveedor||'').trim();if(n)provs[n]=1});
  var filas=x.cuentas.map(function(cu,i){
    var b='cuentas.'+i+'.',e=estado(cu,h);
    return '<div class="nb-fila nb-cta">'+
      '<input type="text" data-k="'+b+'proveedor" value="'+esc(cu.proveedor)+'" placeholder="Proveedor" aria-label="Proveedor" list="'+uid+'-prov">'+
      '<input type="text" data-k="'+b+'concepto" value="'+esc(cu.concepto)+'" placeholder="Concepto (ej. factura 123)" aria-label="Concepto">'+
      '<input type="text" inputmode="decimal" class="nb-num" data-k="'+b+'monto" value="'+esc(cu.monto)+'" placeholder="$0" aria-label="Monto">'+
      '<input type="date" data-k="'+b+'vence" value="'+esc(cu.vence)+'" aria-label="Vence" data-repintar>'+
      '<label class="nb-op nb-pag"><input type="checkbox" data-k="'+b+'pagada" data-fecha'+(cu.pagada?' checked':'')+'>Pagada</label>'+
      N.quitar('cuentas',i,'la cuenta de '+(cu.proveedor||'proveedor'))+
      '<span class="nb-est'+(e.k?' '+e.k:'')+'">'+esc(e.t)+'</span></div>';
  }).join('');
  return '<input type="text" class="ed-fig-tit pg-tit" data-k="titulo" value="'+esc(x.titulo)+'" placeholder="Cuentas por pagar (ej. Proveedores de la tienda)" aria-label="Nombre de la lista">'+
    '<datalist id="'+uid+'-prov">'+Object.keys(provs).map(function(n){return '<option value="'+esc(n)+'">'}).join('')+'</datalist>'+
    '<div class="nb-res"></div>'+
    (filas?'<div class="nb-filas">'+filas+'</div>':'<p class="hint">Anota cada factura o nota que te dejaron a crédito y cuándo vence.</p>')+
    '<button type="button" class="btn nb-mas" data-acc="agregar" data-lista="cuentas" data-foco="proveedor">+ Agregar cuenta</button>';
}

/* ---------- Al leer y al imprimir ---------- */
function leer(x,uid,op){
  var h=N.hoy(),l=ordenadas(x).filter(function(o){return o.cu.proveedor.trim()||o.cu.concepto.trim()||c(o.cu.monto)});
  return '<h3 class="nb-t">'+esc(titulo(x))+'</h3>'+resultado(x)+
    (l.length?'<div class="nb-scroll"><table class="nb-tab nb-apilar"><thead><tr><th scope="col">Proveedor</th><th scope="col">Concepto</th><th scope="col">Vence</th><th scope="col" class="num">Monto</th><th scope="col">Pagada</th></tr></thead><tbody>'+
      l.map(function(o){
        var cu=o.cu,e=estado(cu,h);
        return '<tr class="'+(cu.pagada?'pagada':e.k)+'"><td class="nb-fuerte">'+esc(cu.proveedor)+'</td><td class="nb-chico">'+esc(cu.concepto)+'</td>'+
          '<td class="nb-chico">'+esc(N.fechaTexto(cu.vence))+(cu.pagada?'':'<span class="nb-est'+(e.k?' '+e.k:'')+'">'+esc(e.t)+'</span>')+'</td>'+
          '<td class="num d1">'+dinero(c(cu.monto))+'</td>'+
          '<td class="d2"><label class="nb-op nb-pag"><input type="checkbox" data-k="cuentas.'+o.i+'.pagada" data-fecha'+(cu.pagada?' checked':'')+(op.editable?'':' disabled')+'>'+
          (cu.pagada?esc(N.fechaTexto(cu.pagada)||'Sí'):'No')+'</label></td></tr>';
      }).join('')+'</tbody></table></div>':'<p class="hint">Sin cuentas por pagar.</p>');
}
function texto(x){
  var r=calcular(x);
  return titulo(x)+'. Por pagar '+dinero(r.porPagar)+', vencido '+dinero(r.vencido)+', vence esta semana '+dinero(r.semana)+'. '+
    x.cuentas.map(function(cu){return cu.proveedor+' '+cu.concepto+' '+dinero(c(cu.monto))}).join('; ');
}
function md(x){
  var r=calcular(x),h=N.hoy();
  return '**'+titulo(x)+'**\n\n'+ordenadas(x).map(function(o){
    var cu=o.cu;return '- ['+(cu.pagada?'x':' ')+'] '+(cu.proveedor||'Proveedor')+(cu.concepto?' · '+cu.concepto:'')+' · '+dinero(c(cu.monto))+' · '+estado(cu,h).t+(cu.vence&&!cu.pagada?' ('+N.fechaTexto(cu.vence)+')':'');
  }).join('\n')+'\n\nPor pagar '+dinero(r.porPagar)+' · vencido '+dinero(r.vencido)+' · vence esta semana '+dinero(r.semana);
}

N.bloque('porpagar',{
  etiqueta:'Cuentas por pagar',def:DEF,
  filas:{cuentas:cuenta},
  editar:editar,resultado:resultado,leer:leer,texto:texto,md:md,
  foco:'[data-acc="agregar"]',
  insertar:{t:'Cuentas por pagar',d:'Lo que debes a proveedores y lo que vence esta semana',i:'porpagar',
    p:'cuentas por pagar proveedores deudas facturas vencimientos credito vence pagar compras'}
});
AT.porpagar={calcular:function(a){return calcular(N.completar('porpagar',a))},estado:estado};
})();
