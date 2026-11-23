/* OneBook: bloque «Gastos del mes» (fase F4, usa negocio.js).
   Lo que sale del negocio, mes por mes: fecha, concepto, categoría, monto y si ya se pagó. Los gastos fijos (renta,
   luz, internet…) se anotan una vez con su recurrencia (cada mes, cada año o una sola vez) y «Generar mes» crea sus
   filas del mes como pendientes, sin repetir las que ya estén (idea de Bases unificadas). Totales del mes, lo
   pagado, lo pendiente y el gasto por categoría. Al leer, en tus documentos, se cambia de mes y se marca lo pagado.
   attrs: {titulo, mes:'AAAA-MM', filas:[{fecha, concepto, categoria, monto, pagado:'AAAA-MM-DD'|'', fijo}],
           fijos:[{id, concepto, categoria, monto, cada:'mensual'|'anual'|'unica', dia, mesAnual, fecha}]}. */
(function(){
'use strict';
var AT=window.AT,N=AT.negocio;if(!N)return;
var esc=N.esc,dinero=N.dinero,monto=N.monto,c=N.centavos,campo=N.campo;
var CATEGORIAS=['Renta','Luz','Agua','Gas','Internet y teléfono','Mercancía','Sueldos','Transporte','Mantenimiento','Impuestos','Comisiones','Otros'];
var CADA=[['mensual','Cada mes'],['anual','Cada año'],['unica','Una sola vez']];
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var DEF={titulo:'',mes:'',filas:[],fijos:[]};
function fila(){return {fecha:'',concepto:'',categoria:'',monto:'',pagado:'',fijo:''}}
function fijo(){return {id:'',concepto:'',categoria:'',monto:'',cada:'mensual',dia:'1',mesAnual:'1',fecha:''}}

function mesValido(m){return /^\d{4}-(0[1-9]|1[0-2])$/.test(m)?m:N.hoy().slice(0,7)}
function mesTexto(m){m=mesValido(m);return MESES[+m.slice(5,7)-1]+' de '+m.slice(0,4)}
function mover(m,d){m=mesValido(m);var f=new Date(+m.slice(0,4),+m.slice(5,7)-1+d,1);return N.iso(f).slice(0,7)}
function delMes(x){var m=mesValido(x.mes);return x.filas.map(function(f,i){return {f:f,i:i}}).filter(function(o){return !o.f.fecha||o.f.fecha.slice(0,7)===m})}
function ordenar(l){return l.slice().sort(function(a,b){return (a.f.fecha||'9').localeCompare(b.f.fecha||'9')||a.i-b.i})}

function calcular(x){
  var l=delMes(x),total=0,pagado=0,pend=0,cats={};
  l.forEach(function(o){
    var k=c(o.f.monto);total+=k;
    if(o.f.pagado)pagado+=k;else if(k)pend++;
    var nom=(o.f.categoria||'').trim()||'Sin categoría',clave=nom.toLowerCase();
    if(!cats[clave])cats[clave]={nombre:nom,total:0};
    cats[clave].total+=k;
  });
  var porCat=Object.keys(cats).map(function(k){return cats[k]}).filter(function(o){return o.total}).sort(function(a,b){return b.total-a.total});
  return {total:total,pagado:pagado,pendiente:total-pagado,pend:pend,n:l.length,cats:porCat};
}
/* ¿Qué día del mes toca este gasto fijo? (AAAA-MM-DD o null si no toca ese mes) */
function fechaFijo(f,mes){
  var y=+mes.slice(0,4),m=+mes.slice(5,7);
  if(f.cada==='unica')return /^\d{4}-\d{2}-\d{2}$/.test(f.fecha)&&f.fecha.slice(0,7)===mes?f.fecha:null;
  if(f.cada==='anual'&&(parseInt(f.mesAnual,10)||1)!==m)return null;
  var dia=Math.min(Math.max(1,parseInt(f.dia,10)||1),new Date(y,m,0).getDate());
  return mes+'-'+('0'+dia).slice(-2);
}
/* «Generar mes»: una fila pendiente por cada gasto fijo que toca en el mes y que todavía no está */
function generar(x){
  var mes=mesValido(x.mes),n=0,tocan=0;
  x.fijos.forEach(function(f){
    if(!f.concepto.trim()&&!c(f.monto))return;
    if(!f.id)f.id=N.nuevoId().replace(/^b-/,'f-');
    var fecha=fechaFijo(f,mes);if(!fecha)return;
    tocan++;
    if(x.filas.some(function(r){return r.fijo===f.id&&(r.fecha||'').slice(0,7)===mes}))return;
    x.filas.push({fecha:fecha,concepto:f.concepto.trim(),categoria:f.categoria.trim(),monto:f.monto.trim(),pagado:'',fijo:f.id});
    n++;
  });
  return {nuevos:n,tocan:tocan};
}
function titulo(x){return (x.titulo||'').trim()||'Gastos de '+mesTexto(x.mes)}

function resultado(x){
  var r=calcular(x),max=r.cats.length?r.cats[0].total:0;
  return N.resumen([
    ['Gastos del mes',monto(r.total),'nb-acento'],
    ['Pagado',monto(r.pagado)],
    ['Pendiente',monto(r.pendiente),r.pendiente?'nb-ojo':''],
    ['Gastos',String(r.n)+(r.pend?' ('+r.pend+(r.pend===1?' pendiente)':' pendientes)'):'')]
  ])+
  (r.cats.length?'<h4 class="nb-sub">Por categoría</h4><ul class="nb-cats">'+r.cats.map(function(o){
    var p=max?Math.max(2,Math.round(o.total/max*100)):0;
    return '<li><span class="nb-cat-n">'+esc(o.nombre)+'</span><span class="nb-cat-b" aria-hidden="true"><i style="width:'+p+'%"></i></span><span class="nb-cat-m">'+dinero(o.total)+'</span></li>';
  }).join('')+'</ul>':'');
}
function navMes(x){
  return '<div class="nb-mes"><button type="button" class="nb-x" data-acc="mesAnt" aria-label="Mes anterior" title="Mes anterior">‹</button>'+
    '<b class="nb-mes-t">'+esc(mesTexto(x.mes))+'</b>'+
    '<button type="button" class="nb-x" data-acc="mesSig" aria-label="Mes siguiente" title="Mes siguiente">›</button></div>';
}

/* ---------- Al editar ---------- */
function editar(x,uid){
  var lista=ordenar(delMes(x));
  var dl='<datalist id="'+uid+'-cat">'+CATEGORIAS.map(function(t){return '<option value="'+esc(t)+'">'}).join('')+'</datalist>';
  var filas=lista.map(function(o){
    var f=o.f,i=o.i,b='filas.'+i+'.';
    return '<div class="nb-fila nb-gasto'+(f.pagado?'':' pend')+'">'+
      '<input type="date" data-k="'+b+'fecha" value="'+esc(f.fecha)+'" aria-label="Fecha" data-repintar>'+
      '<input type="text" data-k="'+b+'concepto" value="'+esc(f.concepto)+'" placeholder="Concepto" aria-label="Concepto">'+
      '<input type="text" data-k="'+b+'categoria" value="'+esc(f.categoria)+'" placeholder="Categoría" aria-label="Categoría" list="'+uid+'-cat">'+
      '<input type="text" inputmode="decimal" class="nb-num" data-k="'+b+'monto" value="'+esc(f.monto)+'" placeholder="$0" aria-label="Monto">'+
      '<label class="nb-op nb-pag"><input type="checkbox" data-k="'+b+'pagado" data-fecha'+(f.pagado?' checked':'')+'>Pagado</label>'+
      N.quitar('filas',i,'el gasto '+(f.concepto||''))+'</div>';
  }).join('');
  var fijos=x.fijos.map(function(f,i){
    var b='fijos.'+i+'.';
    return '<div class="nb-fila nb-fijo">'+
      '<input type="text" data-k="'+b+'concepto" value="'+esc(f.concepto)+'" placeholder="Concepto (ej. Renta del local)" aria-label="Concepto del gasto fijo">'+
      '<input type="text" data-k="'+b+'categoria" value="'+esc(f.categoria)+'" placeholder="Categoría" aria-label="Categoría" list="'+uid+'-cat">'+
      '<input type="text" inputmode="decimal" class="nb-num" data-k="'+b+'monto" value="'+esc(f.monto)+'" placeholder="$0" aria-label="Monto">'+
      '<select data-k="'+b+'cada" aria-label="Cada cuánto">'+N.opciones(CADA,f.cada)+'</select>'+
      (f.cada==='unica'?'<input type="date" data-k="'+b+'fecha" value="'+esc(f.fecha)+'" aria-label="Fecha">':
        '<span class="nb-dia">'+(f.cada==='anual'?'<select data-k="'+b+'mesAnual" aria-label="Mes">'+N.opciones(MESES.map(function(m,j){return [String(j+1),m]}),String(parseInt(f.mesAnual,10)||1))+'</select>':'')+
        '<input type="number" min="1" max="31" step="1" inputmode="numeric" data-k="'+b+'dia" value="'+esc(f.dia)+'" aria-label="Día del mes" title="Día del mes"></span>')+
      N.quitar('fijos',i,'el gasto fijo '+(f.concepto||''))+'</div>';
  }).join('');
  return '<input type="text" class="ed-fig-tit pg-tit" data-k="titulo" value="'+esc(x.titulo)+'" placeholder="Gastos (ej. Gastos de la tienda)" aria-label="Nombre de la lista de gastos">'+dl+
    '<div class="nb-barra">'+navMes(x)+
      '<button type="button" class="btn" data-acc="generar"'+(x.fijos.length?'':' aria-disabled="true" title="Primero agrega tus gastos fijos"')+'>Generar mes</button></div>'+
    '<p class="nb-aviso" role="status"></p>'+
    (filas?'<div class="nb-filas">'+filas+'</div>':'<p class="hint">Sin gastos en '+esc(mesTexto(x.mes))+'.</p>')+
    '<button type="button" class="btn nb-mas" data-acc="nuevo">+ Agregar gasto</button>'+
    '<div class="nb-res"></div>'+
    '<fieldset class="nb-sec"><legend>Gastos fijos</legend>'+
      '<p class="hint">Los que se repiten. «Generar mes» los agrega al mes que estás viendo como pendientes.</p>'+
      (fijos?'<div class="nb-filas">'+fijos+'</div>':'')+
      '<button type="button" class="btn nb-mas" data-acc="nuevoFijo">+ Agregar gasto fijo</button></fieldset>';
}
function avisar(raiz,t){setTimeout(function(){var a=raiz.querySelector('.nb-aviso');if(a)a.textContent=t},0)}
var acciones={
  mesAnt:function(x){x.mes=mover(x.mes,-1);return {sel:'[data-acc="mesAnt"]'}},
  mesSig:function(x){x.mes=mover(x.mes,1);return {sel:'[data-acc="mesSig"]'}},
  nuevo:function(x){
    var m=mesValido(x.mes),h=N.hoy(),f=fila();
    f.fecha=h.slice(0,7)===m?h:m+'-01';f.pagado=h;
    x.filas.push(f);x.mes=m;
    return 'filas.'+(x.filas.length-1)+'.concepto';
  },
  nuevoFijo:function(x){
    var f=fijo();f.id=N.nuevoId().replace(/^b-/,'f-');
    x.fijos.push(f);
    return 'fijos.'+(x.fijos.length-1)+'.concepto';
  },
  generar:function(x,ds,b,raiz){
    x.mes=mesValido(x.mes);
    var r=generar(x),t=mesTexto(x.mes);
    avisar(raiz,r.nuevos?'Se agregaron '+r.nuevos+(r.nuevos===1?' gasto fijo':' gastos fijos')+' de '+t+' como pendientes.':
      r.tocan?'Los gastos fijos de '+t+' ya están en la lista.':'Ningún gasto fijo toca en '+t+'.');
    return {sel:'[data-acc="generar"]'};
  }
};

/* ---------- Al leer y al imprimir ---------- */
function leer(x,uid,op){
  var lista=ordenar(delMes(x));
  return '<h3 class="nb-t">'+esc(titulo(x))+((x.titulo||'').trim()?'<small>'+esc(mesTexto(x.mes))+'</small>':'')+'</h3>'+
    (op.editable?'<div class="nb-barra">'+navMes(x)+(x.fijos.length?'<button type="button" class="btn" data-acc="generar">Generar mes</button>':'')+'</div><p class="nb-aviso" role="status"></p>':'')+
    resultado(x)+
    (lista.length?'<div class="nb-scroll"><table class="nb-tab nb-apilar"><thead><tr><th scope="col">Fecha</th><th scope="col">Concepto</th><th scope="col">Categoría</th><th scope="col" class="num">Monto</th><th scope="col">Pagado</th></tr></thead><tbody>'+
      lista.map(function(o){
        var f=o.f;
        return '<tr'+(f.pagado?'':' class="pend"')+'><td class="nb-chico">'+esc(N.fechaTexto(f.fecha))+'</td><td class="nb-fuerte">'+esc(f.concepto)+'</td><td class="nb-chico">'+esc(f.categoria)+'</td><td class="num d1">'+dinero(c(f.monto))+'</td>'+
          '<td class="d2"><label class="nb-op nb-pag"><input type="checkbox" data-k="filas.'+o.i+'.pagado" data-fecha'+(f.pagado?' checked':'')+(op.editable?'':' disabled')+'>'+
          (f.pagado?'Sí':'Pendiente')+'</label></td></tr>';
      }).join('')+
      '</tbody><tfoot><tr class="nb-tot"><th scope="row" colspan="3">Total</th><td class="num d1">'+dinero(calcular(x).total)+'</td><td></td></tr></tfoot></table></div>':
      '<p class="hint">Sin gastos en '+esc(mesTexto(x.mes))+'.</p>');
}
function texto(x){
  var r=calcular(x);
  return titulo(x)+'. Total '+dinero(r.total)+', pagado '+dinero(r.pagado)+', pendiente '+dinero(r.pendiente)+'. '+
    delMes(x).map(function(o){return o.f.concepto+' '+dinero(c(o.f.monto))}).join('; ');
}
function md(x){
  var r=calcular(x);
  return '**'+titulo(x)+'**\n\n'+ordenar(delMes(x)).map(function(o){
    var f=o.f;return '- ['+(f.pagado?'x':' ')+'] '+(f.fecha?N.fechaTexto(f.fecha)+' · ':'')+(f.concepto||'Gasto')+(f.categoria?' ('+f.categoria+')':'')+' · '+dinero(c(f.monto));
  }).join('\n')+'\n\nTotal '+dinero(r.total)+' · pagado '+dinero(r.pagado)+' · pendiente '+dinero(r.pendiente)+
  (r.cats.length?'\n\n'+r.cats.map(function(o){return '- '+o.nombre+': '+dinero(o.total)}).join('\n'):'');
}

N.bloque('gastos',{
  etiqueta:'Gastos del mes',def:DEF,
  filas:{filas:fila,fijos:fijo},
  editar:editar,resultado:resultado,leer:leer,texto:texto,md:md,acciones:acciones,
  foco:'[data-acc="nuevo"]',
  insertar:{t:'Gastos del mes',d:'Lo que sale, por categoría, y tus gastos fijos con «Generar mes»',i:'gastos',
    p:'gastos egresos renta luz agua mes fijos recurrentes categorias salidas dinero presupuesto',attrs:function(){return {mes:N.hoy().slice(0,7)}}}
});
AT.gastos={calcular:function(a){return calcular(N.completar('gastos',a))},generar:generar,fechaFijo:fechaFijo};
})();
