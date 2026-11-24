/* OneBook: bloque «Reporte» (fase F7c, con las ideas de Bases unificadas).
   Desglosa una base de datos por uno o dos campos (filas y columnas) y suma, cuenta o promedia un campo numérico,
   en un periodo (este mes, el mes pasado, este año, un rango o todo) según una columna de fecha, con un filtro
   opcional (por ejemplo, Tipo es Venta). Puede comparar contra el periodo anterior (qué subió y qué bajó, con signo,
   flecha y porcentaje) y dibujar una gráfica de barras. Una columna de fecha como desglose agrupa por mes.
   Se ajusta desde «Ajustar reporte» (al editar); al leer se ve y se presenta («Presentar»: diapositivas con el
   total, la gráfica y la tabla, a pantalla completa, con las flechas); al imprimir sale como tabla.
   El bloque guarda attrs.cfg = {titulo, base, fecha, periodo, desde, hasta, filas, columnas, valor, calculo,
   comparar, grafica, fcol, fop, fval, rol}. Con rol (productos, movimientos o compras) y sin base, usa la base de
   ese rol del inventario (inventario.js): así la plantilla «Reporte del mes» funciona en cualquier espacio.
   Presupuesto (pbase o prol, y pvalor): otra base cuya primera columna son los mismos grupos (por ejemplo,
   Categoría) y pvalor lo de cada mes; el reporte muestra lo real, el presupuesto del periodo (por los meses que
   abarca) y lo disponible, en rojo si te pasaste.
   Expone AT.reporte (calcular, rango, html). Se carga después de bases.js. */
(function(){
'use strict';
var AT=window.AT,B=AT.bases,$=AT.$,esc=AT.esc,ico=AT.ico;
if(!B)return;
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var DEF={titulo:'',base:'',rol:'',pbase:'',prol:'',pvalor:'',fecha:'',periodo:'mes',desde:'',hasta:'',filas:'',columnas:'',valor:'',calculo:'suma',comparar:false,grafica:true,fcol:'',fop:'igual',fval:''};
var PERIODOS=[['mes','Este mes'],['anterior','El mes pasado'],['anio','Este año'],['rango','Entre dos fechas'],['todo','Todo']];
var CALCULOS=[['suma','Sumar'],['conteo','Contar filas'],['promedio','Promedio']];
var FOPS=[['igual','es'],['distinto','no es'],['contiene','contiene'],['mayor','es mayor que'],['menor','es menor que']];

function cfgDe(a){
  var c=Object.assign({},DEF);
  if(a&&typeof a==='object')Object.keys(DEF).forEach(function(k){if(a[k]!=null)c[k]=typeof DEF[k]==='boolean'?!!a[k]:String(a[k])});
  if(!PERIODOS.some(function(p){return p[0]===c.periodo}))c.periodo='mes';
  if(!CALCULOS.some(function(p){return p[0]===c.calculo}))c.calculo='suma';
  return c;
}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function fechaDe(t){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(t||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function mesTexto(y,m){return MESES[m]+' '+y}

/* ---------- Periodos ---------- */
/* El periodo del reporte; atras=1 da el anterior equivalente (para comparar). null = sin periodo */
function rango(c,atras,hoy){
  atras=atras||0;hoy=hoy||new Date();
  var y=hoy.getFullYear(),m=hoy.getMonth();
  if(c.periodo==='todo'||!c.fecha)return null;
  if(c.periodo==='mes'||c.periodo==='anterior'){
    var k=m-(c.periodo==='anterior'?1:0)-atras,d1=new Date(y,k,1),d2=new Date(y,k+1,0);
    return {desde:iso(d1),hasta:iso(d2),texto:mesTexto(d1.getFullYear(),d1.getMonth())};
  }
  if(c.periodo==='anio')return {desde:(y-atras)+'-01-01',hasta:(y-atras)+'-12-31',texto:String(y-atras)};
  var a=fechaDe(c.desde),b=fechaDe(c.hasta);
  if(!a||!b)return null;
  if(b<a){var t=a;a=b;b=t}
  var dias=Math.round((b-a)/864e5)+1;
  /* Meses completos (del día 1 al último): el anterior son los mismos meses de antes */
  var meses=a.getDate()===1&&new Date(b.getFullYear(),b.getMonth(),b.getDate()+1).getDate()===1?(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth()+1:0;
  if(atras&&meses){a=new Date(a.getFullYear(),a.getMonth()-meses,1);b=new Date(a.getFullYear(),a.getMonth()+meses,0)}
  else if(atras){b=new Date(a.getFullYear(),a.getMonth(),a.getDate()-1);a=new Date(b.getFullYear(),b.getMonth(),b.getDate()-dias+1)}
  if(meses===1)return {desde:iso(a),hasta:iso(b),texto:mesTexto(a.getFullYear(),a.getMonth())};
  return {desde:iso(a),hasta:iso(b),texto:B.fechaTexto(iso(a))+' – '+B.fechaTexto(iso(b))};
}

/* ---------- Calcular ---------- */
function claveDe(b,f,col){
  if(!col)return '';
  if(col.tipo==='fecha'){var v=B.valor(b,f,col);return v?String(v).slice(0,7):''}
  return B.texto(b,f,col);
}
function etiqueta(col,k){
  if(!col)return 'Total';
  if(col.tipo==='fecha'&&/^\d{4}-\d{2}$/.test(k))return mesTexto(+k.slice(0,4),+k.slice(5)-1);
  return k||'Sin '+col.nombre.toLowerCase();
}
function agregar(l,calc){
  if(calc==='conteo')return l.length;
  var ns=l.filter(function(x){return typeof x==='number'&&isFinite(x)});
  var s=ns.reduce(function(a,x){return a+x},0);
  return Math.round((calc==='promedio'?(ns.length?s/ns.length:0):s)*100)/100;
}
/* La base del presupuesto (la suya o la de su rol) */
function presDe(c){
  if(c.pbase)return B.base(c.pbase);
  var ids=c.prol&&AT.inventario&&AT.inventario.ids();
  return ids&&ids[c.prol]?B.base(ids[c.prol]):null;
}
/* Cuántos meses abarca un periodo (para el presupuesto mensual) */
function mesesDe(r){
  if(!r)return 1;
  var a=/^(\d{4})-(\d{2})-(\d{2})/.exec(r.desde),b=/^(\d{4})-(\d{2})-(\d{2})/.exec(r.hasta);
  if(!a||!b)return 1;
  var d1=new Date(+a[1],+a[2]-1,+a[3]),d2=new Date(+b[1],+b[2]-1,+b[3]);
  if(+a[3]===1&&new Date(+b[1],+b[2]-1,+b[3]+1).getDate()===1)return (d2.getFullYear()-d1.getFullYear())*12+d2.getMonth()-d1.getMonth()+1;
  return Math.max(0.1,Math.round((d2-d1)/864e5+1)/30.4);
}
/* {grupos:[{clave, texto, v, ant, pres, c:{clave2: v}}], cols:[{clave, texto}], total, totalAnt, totalPres, filas, r, ra} o null si falta la base */
/* La base de un reporte: la suya o, si trae rol, la de ese rol del inventario */
function baseDe(c){
  if(c.base)return B.base(c.base);
  var ids=c.rol&&AT.inventario&&AT.inventario.ids();
  return ids&&ids[c.rol]?B.base(ids[c.rol]):null;
}
function calcular(cfg,hoy){
  var c=cfgDe(cfg),b=baseDe(c);
  if(!b)return null;
  var cf=B.col(b,c.fecha),c1=B.col(b,c.filas),c2=B.col(b,c.columnas),cv=B.col(b,c.valor);
  if(cf&&cf.tipo!=='fecha')cf=null;
  var calc=c.calculo==='conteo'||!cv?'conteo':c.calculo;
  var r=cf?rango(c,0,hoy):null,ra=c.comparar&&r?rango(c,1,hoy):null;
  var filtro=c.fcol?{col:c.fcol,op:c.fop||'igual',val:c.fval}:null;
  var todas=B.filas(b.id).filter(function(f){return !filtro||B.cumpleFiltro(b,f,filtro)});
  function en(rg){return function(f){if(!rg)return true;var v=B.valor(b,f,cf);return typeof v==='string'&&v>=rg.desde&&v<=rg.hasta}}
  var act=todas.filter(en(r)),ant=ra?todas.filter(en(ra)):[];
  function val(f){return calc==='conteo'?1:B.valor(b,f,cv)}
  var g={},orden=[],cols={},ordenC=[];
  function grupo(k){if(!g[k]){g[k]={clave:k,texto:etiqueta(c1,k),act:[],ant:[],c:{}};orden.push(k)}return g[k]}
  act.forEach(function(f){
    var x=grupo(c1?claveDe(b,f,c1):'');x.act.push(val(f));
    if(c2){var k2=claveDe(b,f,c2);if(!cols[k2]){cols[k2]={clave:k2,texto:etiqueta(c2,k2)};ordenC.push(k2)}(x.c[k2]=x.c[k2]||[]).push(val(f))}
  });
  ant.forEach(function(f){grupo(c1?claveDe(b,f,c1):'').ant.push(val(f))});
  /* Presupuesto: por el texto del grupo (sin importar mayúsculas ni acentos) */
  var pb=c1&&!c2?presDe(c):null,pc=pb&&B.col(pb,c.pvalor),pres=null;
  if(pb&&pc){
    pres={};var factor=mesesDe(r);
    B.filas(pb.id).forEach(function(f){
      var k=B.sinAcentos(B.titulo(pb,f)).trim(),v=B.valor(pb,f,pc);if(!k)return;
      pres[k]=(pres[k]||{texto:B.titulo(pb,f),v:0});if(typeof v==='number')pres[k].v+=v*factor;
    });
    Object.keys(pres).forEach(function(k){if(pres[k].v&&!orden.some(function(o){return B.sinAcentos(etiqueta(c1,o)).trim()===k})){var x=grupo(pres[k].texto);x.texto=pres[k].texto}});
  }
  var grupos=orden.map(function(k){
    var x=g[k],o={clave:k,texto:x.texto,v:agregar(x.act,calc),ant:ra?agregar(x.ant,calc):null,c:{}};
    if(pres){var pk=pres[B.sinAcentos(x.texto).trim()];o.pres=pk?Math.round(pk.v*100)/100:0}
    Object.keys(x.c).forEach(function(k2){o.c[k2]=agregar(x.c[k2],calc)});
    return o;
  });
  var fechaDesglose=c1&&c1.tipo==='fecha';
  grupos.sort(function(a,z){
    if(a.clave===''&&z.clave!=='')return 1;if(z.clave===''&&a.clave!=='')return -1;
    return fechaDesglose?(a.clave<z.clave?-1:1):(z.v-a.v)||a.texto.localeCompare(z.texto,'es');
  });
  var cs=ordenC.map(function(k){return cols[k]}).sort(function(a,z){return c2&&c2.tipo==='fecha'?(a.clave<z.clave?-1:1):a.texto.localeCompare(z.texto,'es')});
  return {base:b,cfg:c,calc:calc,moneda:calc!=='conteo'&&cv&&B.tipoVisto(b,cv)==='moneda',grupos:grupos,cols:cs,
    total:agregar(act.map(val),calc),totalAnt:ra?agregar(ant.map(val),calc):null,filas:act.length,r:r,ra:ra,c1:c1,c2:c2,cv:cv,cf:cf,
    pres:!!pres,totalPres:pres?Math.round(grupos.reduce(function(s,x){return s+(x.pres||0)},0)*100)/100:null};
}

/* ---------- Pintar ---------- */
function fmt(R,n){return n==null||n===''?'':R.moneda?B.dinero(n):B.numero(n)}
function dif(R,a,b){
  if(b==null)return '';
  var d=Math.round((a-b)*100)/100,cls=d>0?'rep-sube':d<0?'rep-baja':'rep-igual',fl=d>0?'▲':d<0?'▼':'=';
  var pct=b?Math.round(d/Math.abs(b)*1000)/10:null;
  var txt=(d>0?'+':d<0?'−':'')+fmt(R,Math.abs(d)).replace(/^−/,'');
  return '<span class="rep-dif '+cls+'"><span aria-hidden="true">'+fl+'</span> '+txt+(pct!=null&&d?' <small>('+(d>0?'+':'−')+B.numero(Math.abs(pct))+' %)</small>':'')+
    '<span class="vh">'+(d>0?' (subió)':d<0?' (bajó)':' (igual)')+'</span></span>';
}
function tituloDe(R){
  var c=R.cfg;if(c.titulo.trim())return c.titulo.trim();
  var q=R.calc==='conteo'?'Cuántas':(R.calc==='promedio'?'Promedio de ':'')+(R.cv?R.cv.nombre:'');
  return (q||'Reporte')+(R.c1?' por '+R.c1.nombre.toLowerCase():'')+(R.c2?' y '+R.c2.nombre.toLowerCase():'');
}
function periodoTexto(R){return R.r?R.r.texto.charAt(0).toUpperCase()+R.r.texto.slice(1):R.cfg.periodo==='todo'||!R.cf?'Todo':'Sin fechas'}
/* Disponible: presupuesto menos lo real (en rojo si te pasaste) */
function disp(R,real,pres){var d=Math.round((pres-real)*100)/100;return '<span class="rep-disp'+(d<0?' rep-baja':'')+'">'+(d<0?'−':'')+fmt(R,Math.abs(d))+(d<0?'<span class="vh"> (te pasaste)</span>':'')+'</span>'}
function kpis(R){
  if(R.pres)return '<dl class="nb-k rep-k"><div><dt>Real · '+esc(periodoTexto(R))+'</dt><dd>'+fmt(R,R.total)+'</dd></div><div><dt>Presupuesto</dt><dd>'+fmt(R,R.totalPres)+'</dd></div>'+
    '<div'+(R.totalPres-R.total<0?' class="nb-mal"':'')+'><dt>Disponible</dt><dd>'+disp(R,R.total,R.totalPres)+'</dd></div></dl>';
  return '<dl class="nb-k rep-k"><div><dt>'+esc(R.calc==='conteo'?'Filas':R.calc==='promedio'?'Promedio':'Total')+' · '+esc(periodoTexto(R))+'</dt><dd>'+fmt(R,R.total)+'</dd></div>'+
    (R.ra?'<div><dt>'+esc(R.ra.texto.charAt(0).toUpperCase()+R.ra.texto.slice(1))+'</dt><dd>'+fmt(R,R.totalAnt)+'</dd></div><div><dt>Diferencia</dt><dd>'+dif(R,R.total,R.totalAnt)+'</dd></div>':'')+'</dl>';
}
function grafica(R){
  if(!R.cfg.grafica||R.c2||R.grupos.length<2)return '';
  if(R.pres)R=Object.assign({},R,{r:{texto:'Real'},ra:{texto:'Presupuesto'},grupos:R.grupos.map(function(g){return Object.assign({},g,{ant:g.pres})})});
  var max=R.grupos.reduce(function(m,g){return Math.max(m,Math.abs(g.v),R.ra?Math.abs(g.ant||0):0)},0)||1;
  return '<div class="rep-graf" aria-hidden="true">'+R.grupos.slice(0,24).map(function(g){
    return '<div class="rep-gf"><span class="rep-gt">'+esc(g.texto)+'</span><span class="rep-gb"><i class="rep-act" style="width:'+Math.max(0.5,Math.abs(g.v)/max*100)+'%"></i>'+
      (R.ra?'<i class="rep-ant" style="width:'+Math.max(0.5,Math.abs(g.ant||0)/max*100)+'%"></i>':'')+'</span><span class="rep-gv">'+fmt(R,g.v)+'</span></div>';
  }).join('')+(R.ra?'<p class="rep-ley"><i class="rep-act"></i> '+esc(R.r.texto)+' <i class="rep-ant"></i> '+esc(R.ra.texto)+'</p>':'')+'</div>';
}
function tabla(R){
  if(!R.grupos.length)return '<p class="hint">No hay filas en este periodo'+(R.cfg.fcol?' con ese filtro':'')+'.</p>';
  var h1=R.c1?R.c1.nombre:'';
  if(R.c2){
    var tot={};R.cols.forEach(function(c){tot[c.clave]=0});
    return '<div class="nb-scroll"><table class="nb-tab rep-t"><thead><tr><th scope="col">'+esc(h1)+'</th>'+R.cols.map(function(c){return '<th scope="col" class="num">'+esc(c.texto)+'</th>'}).join('')+'<th scope="col" class="num">Total</th></tr></thead><tbody>'+
      R.grupos.map(function(g){return '<tr><th scope="row">'+esc(g.texto)+'</th>'+R.cols.map(function(c){var x=g.c[c.clave];if(x!=null)tot[c.clave]+=x;return '<td class="num">'+(x!=null?fmt(R,x):'')+'</td>'}).join('')+'<td class="num"><b>'+fmt(R,g.v)+'</b></td></tr>'}).join('')+
      '</tbody>'+(R.calc==='promedio'?'':'<tfoot><tr class="nb-tot"><th scope="row">Total</th>'+R.cols.map(function(c){return '<td class="num">'+fmt(R,Math.round(tot[c.clave]*100)/100)+'</td>'}).join('')+'<td class="num"><b>'+fmt(R,R.total)+'</b></td></tr></tfoot>')+'</table></div>';
  }
  if(R.pres)return '<div class="nb-scroll"><table class="nb-tab rep-t"><thead><tr><th scope="col">'+esc(h1)+'</th><th scope="col" class="num">Real</th><th scope="col" class="num">Presupuesto</th><th scope="col" class="num">Disponible</th><th scope="col" class="num">Usado</th></tr></thead><tbody>'+
    R.grupos.map(function(g){return '<tr><th scope="row">'+esc(g.texto)+'</th><td class="num">'+fmt(R,g.v)+'</td><td class="num">'+fmt(R,g.pres)+'</td><td class="num">'+disp(R,g.v,g.pres)+'</td><td class="num">'+(g.pres?B.numero(Math.round(g.v/g.pres*100))+' %':'')+'</td></tr>'}).join('')+
    '</tbody><tfoot><tr class="nb-tot"><th scope="row">Total</th><td class="num"><b>'+fmt(R,R.total)+'</b></td><td class="num">'+fmt(R,R.totalPres)+'</td><td class="num">'+disp(R,R.total,R.totalPres)+'</td><td class="num">'+(R.totalPres?B.numero(Math.round(R.total/R.totalPres*100))+' %':'')+'</td></tr></tfoot></table></div>';
  return '<div class="nb-scroll"><table class="nb-tab rep-t"><thead><tr><th scope="col">'+esc(h1||'')+'</th><th scope="col" class="num">'+esc(R.r?R.r.texto:'Valor')+'</th>'+
    (R.ra?'<th scope="col" class="num">'+esc(R.ra.texto)+'</th><th scope="col" class="num">Diferencia</th>':'')+'</tr></thead><tbody>'+
    R.grupos.map(function(g){return '<tr><th scope="row">'+esc(g.texto)+'</th><td class="num">'+fmt(R,g.v)+'</td>'+(R.ra?'<td class="num">'+fmt(R,g.ant)+'</td><td class="num">'+dif(R,g.v,g.ant)+'</td>':'')+'</tr>'}).join('')+
    '</tbody>'+(R.c1&&R.calc!=='promedio'?'<tfoot><tr class="nb-tot"><th scope="row">Total</th><td class="num"><b>'+fmt(R,R.total)+'</b></td>'+(R.ra?'<td class="num">'+fmt(R,R.totalAnt)+'</td><td class="num">'+dif(R,R.total,R.totalAnt)+'</td>':'')+'</tr></tfoot>':'')+'</table></div>';
}
function html(cfg,op){
  op=op||{};
  var c=cfgDe(cfg),R=calcular(c);
  if(!c.base&&c.rol&&!R)return '<p class="hint">Este reporte usa tu Inventario. Crea la página «Inventario» desde «Crear» y anota tus ventas y compras.</p>';
  if(!c.base&&!c.rol)return '<p class="hint">Elige una base de datos en «Ajustar reporte».</p>';
  if(!R)return '<p class="hint">No se encontró la base de este reporte en este dispositivo.</p>';
  return '<div class="rep-cab"><h3 class="rep-tit">'+esc(tituloDe(R))+'</h3><p class="rep-sub">'+esc(R.base.nombre)+' · '+esc(periodoTexto(R))+
    (c.fcol&&B.col(R.base,c.fcol)?' · '+esc(B.col(R.base,c.fcol).nombre+' '+(FOPS.filter(function(o){return o[0]===c.fop})[0]||FOPS[0])[1]+' '+c.fval):'')+'</p></div>'+
    kpis(R)+(op.sinGrafica?'':grafica(R))+tabla(R);
}

/* ---------- Ajustar ---------- */
var LISTA=[];
function cargarBases(){return AT.datos.bases.todos().then(function(l){LISTA=l.slice().sort(function(a,b){return String(a.nombre).localeCompare(String(b.nombre),'es')});return Promise.all(l.map(function(b){return B.cargar(b.id).catch(function(){return null})}))})}
function ops(l,v,vacia){return (vacia!=null?'<option value="">'+esc(vacia)+'</option>':'')+l.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(v)?' selected':'')+'>'+esc(o[1])+'</option>'}).join('')}
function panel(c,uid){
  var b=c.base&&B.base(c.base),cols=b?b.columnas:[];
  var fechas=cols.filter(function(x){return x.tipo==='fecha'}),nums=b?cols.filter(function(x){return B.esNumerica(b,x)}):[];
  var grupo=cols.filter(function(x){return x.tipo!=='casilla'});
  function campo(et,html,cls){return '<label class="campo-l'+(cls?' '+cls:'')+'"><span>'+esc(et)+'</span>'+html+'</label>'}
  function sel(k,l,vacia){return '<select data-rk="'+k+'">'+ops(l,c[k],vacia)+'</select>'}
  return '<fieldset class="rep-panel" id="'+uid+'-p"><legend>Ajustar reporte</legend><div class="rep-pg">'+
    campo('Título (opcional)','<input type="text" data-rk="titulo" value="'+esc(c.titulo)+'" placeholder="Se arma solo" autocomplete="off">','rep-ancho')+
    campo('Base de datos',sel('base',LISTA.map(function(x){return [x.id,x.nombre]}),'Elige una base'))+
    (b?campo('Agrupar por',sel('filas',grupo.map(function(x){return [x.id,x.nombre]}),'Sin agrupar (solo el total)'))+
      campo('Y luego por (columnas)',sel('columnas',grupo.filter(function(x){return x.id!==c.filas}).map(function(x){return [x.id,x.nombre]}),'Nada'))+
      campo('Calcular',sel('calculo',CALCULOS))+
      (c.calculo!=='conteo'?campo('De la columna',sel('valor',nums.map(function(x){return [x.id,x.nombre]}),nums.length?'Elige una columna':'No hay columnas de números')):'')+
      campo('Fecha de cada fila',sel('fecha',fechas.map(function(x){return [x.id,x.nombre]}),fechas.length?'Sin fecha (todo)':'No hay columnas de fecha'))+
      (c.fecha?campo('Periodo',sel('periodo',PERIODOS)):'')+
      (c.fecha&&c.periodo==='rango'?campo('Desde','<input type="date" data-rk="desde" value="'+esc(c.desde)+'">')+campo('Hasta','<input type="date" data-rk="hasta" value="'+esc(c.hasta)+'">'):'')+
      campo('Solo las filas donde',sel('fcol',cols.map(function(x){return [x.id,x.nombre]}),'Todas las filas'))+
      (c.fcol?campo('Condición',sel('fop',FOPS))+campo('Valor','<input type="text" data-rk="fval" value="'+esc(c.fval)+'" autocomplete="off">'):'')+
      '<label class="rep-cas"><input type="checkbox" data-rk="comparar"'+(c.comparar?' checked':'')+(c.fecha&&c.periodo!=='todo'?'':' disabled')+'> Comparar con el periodo anterior</label>'+
      (c.filas&&!c.columnas?campo('Contra un presupuesto (base)',sel('pbase',LISTA.filter(function(x){return x.id!==c.base}).map(function(x){return [x.id,x.nombre]}),'Sin presupuesto'))+
        (c.pbase&&B.base(c.pbase)?campo('Lo de cada mes está en',sel('pvalor',B.base(c.pbase).columnas.filter(function(x){return B.esNumerica(B.base(c.pbase),x)}).map(function(x){return [x.id,x.nombre]}),'Elige una columna')):''):'')+
      '<label class="rep-cas"><input type="checkbox" data-rk="grafica"'+(c.grafica?' checked':'')+'> Gráfica de barras</label>':'')+
    '</div></fieldset>';
}

/* ---------- Presentar: diapositivas a pantalla completa ---------- */
function presentar(cfg){
  var R=calcular(cfg);if(!R)return;
  var lam=[
    '<h2>'+esc(tituloDe(R))+'</h2><p class="rep-pres-sub">'+esc(R.base.nombre)+' · '+esc(periodoTexto(R))+'</p>'+kpis(R),
    grafica(Object.assign({},R,{cfg:Object.assign({},R.cfg,{grafica:true})}))||'',
    tabla(R)
  ].filter(Boolean);
  var d=document.createElement('dialog'),i=0,volver=document.activeElement;
  d.className='rep-pres';d.setAttribute('aria-label','Presentación: '+tituloDe(R));
  document.body.appendChild(d);
  function pintar(){
    d.innerHTML='<div class="rep-pres-l" role="region" aria-roledescription="diapositiva" aria-label="'+(i+1)+' de '+lam.length+'">'+lam[i]+'</div>'+
      '<div class="rep-pres-b"><button type="button" class="btn" data-p="-1"'+(i?'':' aria-disabled="true"')+'>Anterior</button><span aria-live="polite">'+(i+1)+' / '+lam.length+'</span>'+
      '<button type="button" class="btn" data-p="1"'+(i<lam.length-1?'':' aria-disabled="true"')+'>Siguiente</button><button type="button" class="btn" data-p="x">Salir</button></div>';
  }
  function ir(k){var n=Math.max(0,Math.min(lam.length-1,i+k));if(n!==i){i=n;pintar();var b=d.querySelector('[data-p="'+(k>0?1:-1)+'"]');if(b&&b.getAttribute('aria-disabled')!=='true')b.focus();else d.querySelector('[data-p="x"]').focus()}}
  d.addEventListener('click',function(e){var b=e.target.closest('[data-p]');if(!b||b.getAttribute('aria-disabled')==='true')return;var p=b.getAttribute('data-p');if(p==='x')d.close();else ir(+p)});
  d.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '&&!e.target.closest('button')){e.preventDefault();ir(1)}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();ir(-1)}});
  d.addEventListener('close',function(){if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){});d.remove();if(volver&&volver.focus)volver.focus()});
  pintar();d.showModal();
  if(d.requestFullscreen)d.requestFullscreen().catch(function(){});
  var s=d.querySelector('[data-p="1"]');if(s&&s.getAttribute('aria-disabled')!=='true')s.focus();else d.querySelector('[data-p="x"]').focus();
}

/* ---------- Montar el bloque: {cfg, editable, ajustar, alCambiar(cfg)} ---------- */
var cuenta=0;
function montar(raiz,op){
  var c=cfgDe(op.cfg),uid='rep'+(++cuenta),abierto=!!op.ajustar&&(!!op.abierto||!c.base&&!c.rol),vivo=true;
  raiz.classList.add('rep');
  raiz.innerHTML='<p class="hint">Cargando el reporte…</p>';
  function pintar(foco){
    if(!vivo)return;
    raiz.innerHTML=(op.ajustar||op.editable?'<div class="rep-bar">'+
        (op.ajustar?'<button type="button" class="btn" data-r="ajustar" aria-expanded="'+abierto+'" aria-controls="'+uid+'-p">'+ico('columnas')+'Ajustar reporte</button>':'')+
        (c.base?'<button type="button" class="btn" data-r="presentar">'+ico('presentacion')+'Presentar</button>':'')+'</div>':'')+
      (abierto?panel(c,uid):'')+'<div class="rep-res" aria-live="polite">'+html(c)+'</div>';
    if(foco){var e=raiz.querySelector(foco);if(e)e.focus()}
  }
  function cambiar(k,v){
    c[k]=v;
    if(k==='base'){c.fecha='';c.filas='';c.columnas='';c.valor='';c.fcol='';c.fval='';var b=B.base(v);if(b){var f=b.columnas.filter(function(x){return x.tipo==='fecha'})[0];if(f)c.fecha=f.id;var nv=b.columnas.filter(function(x){return B.esNumerica(b,x)});if(nv.length)c.valor=nv[nv.length-1].id;else c.calculo='conteo'}}
    if(k==='fecha'&&!v)c.comparar=false;
    if(k==='periodo'&&v==='todo')c.comparar=false;
    if(k==='filas'&&v===c.columnas)c.columnas='';
    if(k==='pbase'){c.prol='';c.pvalor='';var pb=B.base(v);if(pb){var pn=pb.columnas.filter(function(x){return B.esNumerica(pb,x)});if(pn.length)c.pvalor=pn[0].id}}
    if(op.alCambiar)op.alCambiar(cfgDe(c));
    var conFoco=raiz.contains(document.activeElement);
    pintar(conFoco?'[data-rk="'+k+'"]':null);
  }
  /* Los textos ya se aplicaron al escribir: al salir del campo no se repinta (movería lo que se iba a tocar) */
  raiz.addEventListener('change',function(e){var t=e.target,k=t.getAttribute&&t.getAttribute('data-rk');if(!k||k==='titulo'||k==='fval')return;cambiar(k,t.type==='checkbox'?t.checked:t.value)});
  raiz.addEventListener('input',function(e){var t=e.target,k=t.getAttribute&&t.getAttribute('data-rk');if(k==='titulo'||k==='fval'){c[k]=t.value;if(op.alCambiar)op.alCambiar(cfgDe(c));var r=raiz.querySelector('.rep-res');if(r)r.innerHTML=html(c)}});
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('[data-r]');if(!b)return;
    if(b.getAttribute('data-r')==='ajustar'){abierto=!abierto;pintar('[data-r="ajustar"]')}
    /* Después del clic: si se abre durante el mismo clic, quien cierra ventanas al hacer clic fuera la cerraría */
    else setTimeout(function(){presentar(c)},0);
  });
  var quitar=null;
  /* Con rol y sin base: la base de ese rol del inventario (y queda guardada en el bloque) */
  var rolListo=(!c.base&&c.rol||!c.pbase&&c.prol)&&AT.inventario?AT.inventario.buscar().then(function(ids){
    var cambio=false;
    if(!c.base&&c.rol&&ids[c.rol]){c.base=ids[c.rol];cambio=true}
    if(!c.pbase&&c.prol&&ids[c.prol]){c.pbase=ids[c.prol];cambio=true}
    if(cambio&&op.alCambiar)op.alCambiar(cfgDe(c));
  }):Promise.resolve();
  /* Si la base del rol todavía no existe (la crea la misma página, con su bloque), se liga cuando aparezca */
  function ligarRol(){
    if(!vivo||!(!c.base&&c.rol||!c.pbase&&c.prol)||!AT.inventario)return;
    AT.inventario.buscar().then(function(ids){
      var nuevo=false;
      if(!c.base&&c.rol&&ids[c.rol]){c.base=ids[c.rol];nuevo=true}
      if(!c.pbase&&c.prol&&ids[c.prol]){c.pbase=ids[c.prol];nuevo=true}
      if(nuevo&&vivo){if(op.alCambiar)op.alCambiar(cfgDe(c));cargarBases().then(function(){if(vivo)pintar()})}
    });
  }
  if(AT.datos&&AT.datos.on)AT.datos.on(function(ch){if(ch&&(ch.almacen==='bases'||ch.almacen==='filas'))ligarRol()});
  rolListo.then(cargarBases).then(function(){
    pintar(op.enfocar&&abierto?'[data-rk="base"]':null);
    quitar=B.on(function(x){
      if(!vivo)return;
      /* La base del rol se creó después (al abrir la página que la trae): se liga y se dibuja */
      var ids=(!c.base&&c.rol||!c.pbase&&c.prol)&&AT.inventario&&AT.inventario.ids();
      if(ids){var nuevo=false;if(!c.base&&c.rol&&ids[c.rol]){c.base=ids[c.rol];nuevo=true}if(!c.pbase&&c.prol&&ids[c.prol]){c.pbase=ids[c.prol];nuevo=true}
        if(nuevo){if(op.alCambiar)op.alCambiar(cfgDe(c));cargarBases().then(function(){if(vivo)pintar()});return}}
      if(!c.base)return;var b=B.base(c.base);if(x.base===c.base||b&&b.columnas.some(function(k){return k.base===x.base})){var r=raiz.querySelector('.rep-res');if(r)r.innerHTML=html(c)}});
  },function(){raiz.innerHTML='<p class="hint">No se pudieron leer las bases de datos.</p>'});
  return {destruir:function(){vivo=false;if(quitar)quitar()},cfg:function(){return c}};
}

/* ---------- Al leer y al imprimir ---------- */
/* Al imprimir: las bases por rol se buscan antes de dibujar */
if(B.precargas)B.precargas.push(function(doc){
  var t=JSON.stringify(doc&&doc.contenido||{});
  return t.indexOf('"type":"reporte"')>=0&&/"rol":"[a-z]+"/.test(t)&&AT.inventario?AT.inventario.cargar():null;
});
if(AT.bloques&&AT.bloques.registrar){
  AT.bloques.registrar('reporte',{
    dibujar:function(n,ctx,h){
      var a=h.attrs(n),s=document.createElement('section');
      s.setAttribute('aria-label','Reporte');
      if(document.body.getAttribute('data-pagina')!=='documento'){s.className='rep rep-papel';s.innerHTML=html(a.cfg,{sinGrafica:!(a.cfg&&a.cfg.grafica)});return s}
      montar(s,{cfg:a.cfg,editable:true});
      return s;
    },
    texto:function(n){var R=calcular(n.attrs&&n.attrs.cfg);return R?tituloDe(R)+': '+fmt(R,R.total)+' ('+periodoTexto(R)+')\n':'Reporte\n'}
  });
}
if(AT.piezas&&AT.piezas.md)AT.piezas.md.reporte=function(n){
  var R=calcular(n.attrs&&n.attrs.cfg);if(!R)return '**Reporte**';
  return '**'+tituloDe(R)+'** · '+periodoTexto(R)+'\n\n| '+(R.c1?R.c1.nombre:'')+' | '+(R.r?R.r.texto:'Valor')+(R.ra?' | '+R.ra.texto+' | Diferencia':'')+' |\n| --- | ---:'+(R.ra?' | ---: | ---:':'')+' |\n'+
    R.grupos.map(function(g){return '| '+g.texto.replace(/\|/g,'\\|')+' | '+fmt(R,g.v)+(R.ra?' | '+fmt(R,g.ant)+' | '+fmt(R,Math.round((g.v-g.ant)*100)/100):'')+' |'}).join('\n')+
    '\n| **Total** | **'+fmt(R,R.total)+'**'+(R.ra?' | '+fmt(R,R.totalAnt)+' |':'')+' |';
};

/* ---------- Editor ---------- */
var T=window.Tiptap;
if(T&&AT.editor){
  var nueva=false;
  var Nodo=T.Node.create({
    name:'reporte',group:'block',atom:true,selectable:true,draggable:false,
    addAttributes:function(){return {cfg:{default:null,parseHTML:function(e){try{return JSON.parse(e.getAttribute('data-cfg')||'null')}catch(x){return null}},
      renderHTML:function(a){return a.cfg?{'data-cfg':JSON.stringify(a.cfg)}:{}}}}},
    parseHTML:function(){return [{tag:'div[data-reporte]'}]},
    renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-reporte':''})]},
    addNodeView:function(){
      return function(p){
        var dom=document.createElement('section');dom.contentEditable='false';dom.className='rep-ed';
        var ctl=montar(dom,{cfg:p.node.attrs.cfg,editable:true,ajustar:true,enfocar:nueva,alCambiar:function(c){
          var pos=typeof p.getPos==='function'?p.getPos():null;if(pos==null)return;
          p.editor.view.dispatch(p.editor.state.tr.setNodeAttribute(pos,'cfg',c));
        }});
        nueva=false;
        return {dom:dom,update:function(n){return n.type.name==='reporte'},destroy:function(){ctl.destruir()},stopEvent:function(){return true},ignoreMutation:function(){return true}};
      };
    }
  });
  AT.editorExtensiones=(AT.editorExtensiones||[]).concat([Nodo]);
  if(AT.editorConId)AT.editorConId.push('reporte');
  if(AT.editorInsertar)AT.editorInsertar.push({k:'reporte',t:'Reporte',d:'Totales de una base por mes, proveedor o categoría; compara periodos y presenta',i:'grafica',
    p:'reporte resumen totales desglose comparar mes anterior grafica barras ventas gastos compras presentar diapositivas',
    f:function(c){nueva=true;return c.insertContent({type:'reporte',attrs:{cfg:cfgDe({})}})}});
}

AT.reporte={DEF:DEF,cfg:cfgDe,rango:rango,calcular:calcular,html:html,montar:montar,presentar:presentar,cargarBases:cargarBases,
  titulo:tituloDe,fmt:fmt,dif:dif,periodo:periodoTexto,baseDe:baseDe};
})();
