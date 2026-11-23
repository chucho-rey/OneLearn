/* OneBook: bloque «Fiado» (cuentas por cobrar; fase F4, usa negocio.js).
   Quién te debe: cada cliente con lo que se llevó fiado y sus abonos; el saldo es lo fiado menos lo abonado.
   Para anotar: el monto (y qué fue, si quieres) y «Se llevó» o «Abonó»; queda con la fecha del día. También se
   anota al leer, en tus documentos. Al leer y al imprimir, cada cliente sale con su estado de cuenta.
   attrs: {titulo, clientes:[{nombre, telefono, apunte:{monto, concepto}, todos,
           movs:[{fecha, tipo:'cargo'|'abono', concepto, monto}]}]}. */
(function(){
'use strict';
var AT=window.AT,N=AT.negocio;if(!N)return;
var esc=N.esc,dinero=N.dinero,monto=N.monto,c=N.centavos;
var VISIBLES=5;
var DEF={titulo:'',clientes:[]};
function cliente(){return {nombre:'',telefono:'',apunte:{monto:'',concepto:''},todos:false,movs:[]}}

function saldo(cl){return cl.movs.reduce(function(s,m){var k=c(m.monto);return s+(m.tipo==='abono'?-k:k)},0)}
function calcular(x){
  var mes=N.hoy().slice(0,7),deben=0,con=0,fiadoMes=0,abonadoMes=0;
  x.clientes.forEach(function(cl){
    var s=saldo(cl);if(s>0){deben+=s;con++}
    cl.movs.forEach(function(m){if((m.fecha||'').slice(0,7)!==mes)return;if(m.tipo==='abono')abonadoMes+=c(m.monto);else fiadoMes+=c(m.monto)});
  });
  return {deben:deben,con:con,fiadoMes:fiadoMes,abonadoMes:abonadoMes};
}
function titulo(x){return (x.titulo||'').trim()||'Fiado'}
function nombre(cl,i){return (cl.nombre||'').trim()||'Cliente '+(i+1)}
function estado(s){return s>0?'Debe '+dinero(s):s<0?'Saldo a favor '+dinero(-s):'Al corriente'}
function resultado(x){
  var r=calcular(x);
  return N.resumen([
    ['Te deben',monto(r.deben),r.deben?'nb-acento':''],
    ['Clientes con saldo',String(r.con)],
    ['Fiado este mes',monto(r.fiadoMes)],
    ['Abonado este mes',monto(r.abonadoMes)]
  ]);
}

/* Para anotar: monto, concepto, «Se llevó» y «Abonó» */
function apunte(cl,i,uid){
  var b='clientes.'+i+'.apunte.';
  return '<div class="nb-apunte" data-grupo>'+
    '<label class="vh" for="'+uid+'-am'+i+'">Monto para '+esc(nombre(cl,i))+'</label>'+
    '<input type="text" inputmode="decimal" class="nb-num" id="'+uid+'-am'+i+'" data-k="'+b+'monto" value="'+esc(cl.apunte.monto)+'" placeholder="$0">'+
    '<label class="vh" for="'+uid+'-ac'+i+'">Qué fue (opcional)</label>'+
    '<input type="text" id="'+uid+'-ac'+i+'" data-k="'+b+'concepto" value="'+esc(cl.apunte.concepto)+'" placeholder="Qué fue (opcional)">'+
    '<button type="button" class="btn" data-acc="cargo" data-i="'+i+'">Se llevó</button>'+
    '<button type="button" class="btn" data-acc="abono" data-i="'+i+'">Abonó</button></div>';
}
/* Los movimientos, del más nuevo al más viejo (al editar, con botón para quitar) */
function movimientos(cl,i,editar){
  if(!cl.movs.length)return '<p class="hint">Sin movimientos todavía.</p>';
  var orden=cl.movs.map(function(m,j){return j}).reverse(),ver=cl.todos?orden:orden.slice(0,VISIBLES);
  return '<ul class="nb-movs">'+ver.map(function(j){
    var m=cl.movs[j];
    return '<li><span class="nb-mf">'+esc(N.fechaTexto(m.fecha))+'</span><span class="nb-mc">'+(m.tipo==='abono'?'Abonó':'Se llevó')+(m.concepto?': '+esc(m.concepto):'')+'</span>'+
      '<span class="nb-mm">'+dinero(c(m.monto))+'</span>'+(editar?N.quitar('clientes.'+i+'.movs',j,'el movimiento del '+N.fechaTexto(m.fecha)):'')+'</li>';
  }).join('')+'</ul>'+
  (orden.length>VISIBLES?'<button type="button" class="btn nb-mas" data-acc="todos" data-i="'+i+'">'+(cl.todos?'Ver solo los últimos':'Ver los '+orden.length+' movimientos')+'</button>':'');
}

/* ---------- Al editar ---------- */
function editar(x,uid){
  return '<input type="text" class="ed-fig-tit pg-tit" data-k="titulo" value="'+esc(x.titulo)+'" placeholder="Fiado (ej. Cuentas de los vecinos)" aria-label="Nombre de la lista de fiado">'+
    '<div class="nb-res"></div>'+
    (x.clientes.length?'<div class="nb-clis">'+x.clientes.map(function(cl,i){
      var s=saldo(cl),b='clientes.'+i+'.';
      return '<section class="nb-cli" aria-label="'+esc(nombre(cl,i))+'"><div class="nb-cli-h">'+
        '<input type="text" class="nb-cli-n" data-k="'+b+'nombre" value="'+esc(cl.nombre)+'" placeholder="Nombre del cliente" aria-label="Nombre del cliente">'+
        '<input type="text" inputmode="tel" class="nb-cli-tel" data-k="'+b+'telefono" value="'+esc(cl.telefono)+'" placeholder="Teléfono" aria-label="Teléfono de '+esc(nombre(cl,i))+'">'+
        '<b class="nb-saldo" data-saldo="'+i+'">'+monto(s)+'</b>'+
        N.quitar('clientes',i,'a '+nombre(cl,i))+'</div>'+
        apunte(cl,i,uid)+movimientos(cl,i,true)+'</section>';
    }).join('')+'</div>':'<p class="hint">Agrega a cada cliente que te debe. Después anota lo que se lleva y lo que abona.</p>')+
    '<button type="button" class="btn nb-mas" data-acc="agregar" data-lista="clientes" data-foco="nombre">+ Agregar cliente</button>';
}
/* Al escribir el monto o el concepto no se repinta (solo el resumen) */
function refrescar(){}

function anotar(tipo){
  return function(x,ds){
    var i=+ds.i,cl=x.clientes[i];if(!cl)return false;
    if(!c(cl.apunte.monto))return {sel:'[data-k="clientes.'+i+'.apunte.monto"]'};
    cl.movs.push({fecha:N.hoy(),tipo:tipo,concepto:cl.apunte.concepto.replace(/\s+/g,' ').trim().slice(0,120),monto:cl.apunte.monto.trim()});
    cl.apunte={monto:'',concepto:''};
    return 'clientes.'+i+'.apunte.monto';
  };
}

/* ---------- Al leer y al imprimir ---------- */
function estadoCuenta(cl){
  var s=0;
  return '<div class="nb-scroll"><table class="nb-tab nb-apilar"><thead><tr><th scope="col">Fecha</th><th scope="col">Concepto</th><th scope="col" class="num">Fiado</th><th scope="col" class="num">Abono</th><th scope="col" class="num">Saldo</th></tr></thead><tbody>'+
    cl.movs.map(function(m){
      var k=c(m.monto),ab=m.tipo==='abono';s+=ab?-k:k;
      return '<tr><td class="nb-chico">'+esc(N.fechaTexto(m.fecha))+'</td><td class="nb-fuerte">'+esc(m.concepto||(ab?'Abono':'Fiado'))+'</td><td class="num d1" data-et="Fiado">'+(ab?'':dinero(k))+'</td><td class="num d1" data-et="Abono">'+(ab?dinero(k):'')+'</td><td class="num d2" data-et="Saldo">'+monto(s)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function leer(x,uid,op){
  /* Primero quien más debe; al final, quien está al corriente */
  var orden=x.clientes.map(function(cl,i){return {cl:cl,i:i,s:saldo(cl)}}).sort(function(a,b){return b.s-a.s});
  return '<h3 class="nb-t">'+esc(titulo(x))+'</h3>'+resultado(x)+
    (orden.length?orden.map(function(o){
      return '<section class="nb-cli" aria-label="'+esc(nombre(o.cl,o.i))+'"><h4 class="nb-cli-t"><span>'+esc(nombre(o.cl,o.i))+
        (o.cl.telefono?'<small>'+esc(o.cl.telefono)+'</small>':'')+'</span><b class="nb-saldo'+(o.s>0?' debe':'')+'">'+esc(estado(o.s))+'</b></h4>'+
        (op.editable?apunte(o.cl,o.i,uid):'')+
        (o.cl.movs.length?estadoCuenta(o.cl):'<p class="hint">Sin movimientos.</p>')+'</section>';
    }).join(''):'<p class="hint">Todavía no hay clientes en esta lista.</p>');
}
function texto(x){
  var r=calcular(x);
  return titulo(x)+'. Te deben '+dinero(r.deben)+' ('+r.con+(r.con===1?' cliente':' clientes')+'). '+
    x.clientes.map(function(cl,i){return nombre(cl,i)+': '+estado(saldo(cl))}).join('; ')+'.';
}
function md(x){
  var r=calcular(x);
  return '**'+titulo(x)+'**\n\nTe deben '+dinero(r.deben)+'.'+(x.clientes.length?'\n\n'+x.clientes.map(function(cl,i){
    return '- '+nombre(cl,i)+(cl.telefono?' ('+cl.telefono+')':'')+': '+estado(saldo(cl))+
      cl.movs.map(function(m){return '\n  - '+N.fechaTexto(m.fecha)+' · '+(m.tipo==='abono'?'Abonó':'Se llevó')+(m.concepto?' ('+m.concepto+')':'')+' · '+dinero(c(m.monto))}).join('');
  }).join('\n'):'');
}

N.bloque('fiado',{
  etiqueta:'Fiado',def:DEF,
  filas:{clientes:cliente,movs:function(){return {fecha:'',tipo:'cargo',concepto:'',monto:''}}},
  editar:editar,resultado:resultado,refrescar:refrescar,leer:leer,texto:texto,md:md,
  acciones:{cargo:anotar('cargo'),abono:anotar('abono'),
    todos:function(x,ds){var cl=x.clientes[+ds.i];if(!cl)return false;cl.todos=!cl.todos;return {sel:'[data-acc="todos"][data-i="'+ds.i+'"]'}}},
  foco:'[data-acc="agregar"]',
  insertar:{t:'Fiado',d:'Quién te debe, sus abonos y cuánto le falta',i:'fiado',
    p:'fiado cuentas por cobrar clientes deben abonos saldo credito libreta deudores'}
});
AT.fiado={saldo:saldo};
})();
