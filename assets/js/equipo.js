/* OneBook: tu equipo (módulo de recursos humanos). Usa las bases con rol «Empleados» e «Incidencias» (inventario.js
   las busca o las crea, una vez por espacio), el motor de nómina (nomina.js) y los bloques de negocio (negocio.js).
   Dos bloques:
   - equipo («Resumen de tu equipo»): personas activas, sueldos y costo al mes, vacaciones por tomar, quién falta o
     está de vacaciones hoy, cumpleaños y aniversarios de los próximos 30 días, el aguinaldo cuando se acerca diciembre
     y la PTU antes de mayo; la tabla de tu equipo. En tus páginas trae «Agregar persona» y «Anotar falta o
     vacaciones»; en el Inicio y al imprimir sale sin botones.
   - planilla («Nómina de tu equipo»): para todas las personas activas, la nómina de un periodo (descuenta las faltas
     e incapacidades y paga las horas extra anotadas en Incidencias), el aguinaldo del año o sus vacaciones.
   Las vacaciones disponibles son las del último aniversario menos las tomadas desde entonces (Incidencias de tipo
   Vacaciones). Expone AT.equipo (cargar, empleados, incidencias, personas para la PTU, agregar, anotar). */
(function(){
'use strict';
var AT=window.AT,B=AT.bases,I=AT.inventario,M=AT.nomina,N=AT.negocio,$=AT.$,esc=AT.esc;
if(!B||!I||!M||!AT.datos)return;
var DIA=864e5;

function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function hoy(){return iso(new Date())}
function fechaDe(t){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(t||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function corta(t){var d=typeof t==='string'?fechaDe(t):t;return d?d.toLocaleDateString('es-MX',{day:'numeric',month:'short'}):''}
function larga(t){var d=typeof t==='string'?fechaDe(t):t;return d?d.toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}):''}
function pesos(p){return B.dinero(Math.round((p||0)*100)/100)}
function n(x){var v=typeof x==='number'?x:parseFloat(x);return isFinite(v)?v:0}
function s(x){return x==null?'':String(x)}
function plural(k,uno,varios){return k===1?uno:varios}

/* ---------- Datos ---------- */
function ids(){return I.ids()||{}}
function eb(){var i=ids();return i.empleados?B.base(i.empleados):null}
function ib(){var i=ids();return i.incidencias?B.base(i.incidencias):null}
function val(b,f,id){var c=B.col(b,id);return c?B.valor(b,f,c):''}
var CARGA=null;
/* Lee lo que haya (sin crear nada) y repinta */
function cargar(){
  if(!CARGA)CARGA=I.buscar().then(function(o){
    return Promise.all(['empleados','incidencias'].filter(function(r){return o[r]}).map(function(r){return B.cargar(o[r]).catch(function(){return null})}));
  }).then(function(){pintarTodos()},function(){}).then(function(){CARGA=null});
  return CARGA;
}
/* Crea las bases si no hay y las deja en memoria */
function asegurar(){
  return I.asegurar(AT.docActual&&AT.docActual.id,['empleados','incidencias']).then(function(o){
    return Promise.all([B.cargar(o.empleados),B.cargar(o.incidencias)]).then(function(){return o});
  });
}
function empleados(todos){
  var b=eb();if(!b)return [];
  return B.filas(b.id).map(function(f){
    return {id:f.id,nombre:B.titulo(b,f)||'Sin nombre',puesto:s(val(b,f,'em-puesto')),tel:s(val(b,f,'em-tel')),
      ingreso:s(val(b,f,'em-ingreso')).slice(0,10),nac:s(val(b,f,'em-nac')).slice(0,10),salario:n(val(b,f,'em-salario')),
      periodo:s(val(b,f,'em-periodo'))||'Quincenal',estado:s(val(b,f,'em-estado'))||'Activo',baja:s(val(b,f,'em-baja')).slice(0,10)};
  }).filter(function(e){return todos||e.estado!=='Baja'}).sort(function(a,c){return a.nombre.localeCompare(c.nombre,'es')});
}
function incidencias(){
  var b=ib();if(!b)return [];
  return B.filas(b.id).map(function(f){
    var r=val(b,f,'in-emp');
    return {id:f.id,emp:Array.isArray(r)?r[0]:s(r),tipo:s(val(b,f,'in-tipo')),desde:s(val(b,f,'in-desde')).slice(0,10),
      dias:Math.max(0,n(val(b,f,'in-dias'))),horas:Math.max(0,n(val(b,f,'in-horas'))),nota:s(val(b,f,'in-nota'))};
  });
}
function de(emp,l){return l.filter(function(x){return x.emp===emp})}
/* Días de una incidencia que caen entre a y b (fechas) */
function diasEn(x,a,b){
  var d=fechaDe(x.desde);if(!d)return 0;
  var largo=Math.max(1,Math.round(x.dias)||1),fin=new Date(d.getTime()+(largo-1)*DIA);
  var i=d<a?a:d,f=fin>b?b:fin;
  return f<i?0:Math.round((f-i)/DIA)+1;
}
/* Vacaciones: las del último aniversario menos las tomadas desde entonces */
function vacacionesDe(e,inc,al){
  var a=M.antiguedad(e.ingreso,al||hoy());
  if(!a.valido||!e.ingreso)return {antiguedad:a,tocan:0,tomados:0,disponibles:0,siguientes:0};
  var tocan=M.diasVacaciones(a.anios),desde=a.ultimo,tomados=0;
  de(e.id,inc).forEach(function(x){if(x.tipo==='Vacaciones'){var d=fechaDe(x.desde);if(d&&d>=desde)tomados+=x.dias||1}});
  return {antiguedad:a,tocan:tocan,tomados:tomados,disponibles:Math.max(0,tocan-tomados),siguientes:M.diasVacaciones(a.anios+1)};
}
/* Para la PTU: días trabajados en el año y salario diario de cada quien (también quienes ya se fueron) */
function personas(anio){
  return cargar().then(function(){
    var inc=incidencias(),ini=new Date(anio,0,1),fin=new Date(anio,11,31);
    return empleados(true).map(function(e){
      var a=fechaDe(e.ingreso)||ini,z=fechaDe(e.baja)||fin;
      if(a<ini)a=ini;if(z>fin)z=fin;
      var dias=z<a?0:Math.round((z-a)/DIA)+1;
      de(e.id,inc).forEach(function(x){if(x.tipo==='Falta')dias-=diasEn(x,ini,fin)});
      return {nombre:e.nombre,dias:Math.max(0,dias),salario:e.salario};
    }).filter(function(p){return p.dias>0});
  });
}
var PERIODO_MOTOR={Semanal:'semanal',Catorcenal:'catorcenal',Quincenal:'quincenal',Mensual:'mensual'};

/* ---------- Resumen de tu equipo ---------- */
function resumenHTML(sinBotones){
  var botones=sinBotones?'':'<div class="inv-acc"><button type="button" class="btn" data-acc="persona">Agregar persona</button>'+
    '<button type="button" class="btn" data-acc="incidencia">Anotar falta o vacaciones</button></div>';
  var l=empleados();
  if(!eb()||!l.length)return '<p class="hint">Aquí verás a tu equipo: quién falta o está de vacaciones, cumpleaños y aniversarios, sueldos y lo que te cuesta cada mes. '+
    (sinBotones?'Agrega a tu equipo en la página «Mi equipo».':'Empieza con «Agregar persona».')+'</p>'+botones;
  var inc=incidencias(),hoyD=fechaDe(hoy()),sueldos=0,costo=0,porTomar=0;
  var filas=l.map(function(e){
    var v=vacacionesDe(e,inc);porTomar+=v.disponibles;
    if(e.salario>0){
      sueldos+=e.salario*30.4;
      costo+=M.recibo({salario:e.salario,periodo:'mensual',ingreso:e.ingreso}).costo.total;
    }
    return {e:e,v:v};
  });
  var k=N.resumen([['Personas',String(l.length)],['Sueldos al mes',pesos(sueldos)],['Te cuestan al mes',pesos(costo),'nb-acento'],
    ['Vacaciones por tomar',porTomar+' '+plural(porTomar,'día','días')]]);
  /* Hoy */
  var hoyL=[];
  inc.forEach(function(x){
    var e=l.filter(function(y){return y.id===x.emp})[0];if(!e||!diasEn(x,hoyD,hoyD))return;
    var d=fechaDe(x.desde),fin=new Date(d.getTime()+(Math.max(1,x.dias)-1)*DIA);
    var que={Falta:'falta',Vacaciones:'de vacaciones',Incapacidad:'con incapacidad',Permiso:'con permiso',Retardo:'llegó tarde','Horas extra':'hace horas extra'}[x.tipo]||x.tipo.toLowerCase();
    hoyL.push('<li><b>'+esc(e.nombre)+'</b> '+esc(que)+(x.dias>1&&x.tipo!=='Falta'?' hasta el '+esc(corta(fin)):'')+'</li>');
  });
  /* Próximos 30 días */
  var prox=[];
  function enDias(md,base){var d=new Date(hoyD.getFullYear(),md.getMonth(),md.getDate());if(d<hoyD)d=new Date(hoyD.getFullYear()+1,md.getMonth(),md.getDate());return {d:d,k:Math.round((d-hoyD)/DIA)}}
  l.forEach(function(e){
    var nac=fechaDe(e.nac),ing=fechaDe(e.ingreso);
    if(nac){var c=enDias(nac);if(c.k<=30)prox.push({k:c.k,h:'<b>'+esc(e.nombre)+'</b> cumple años'+cuando(c.k,c.d)})}
    if(ing){var a=enDias(ing),anios=a.d.getFullYear()-ing.getFullYear();
      if(anios>=1&&a.k<=30)prox.push({k:a.k,h:'<b>'+esc(e.nombre)+'</b> cumple '+anios+' '+plural(anios,'año','años')+' contigo'+cuando(a.k,a.d)+': le tocan '+M.diasVacaciones(anios)+' días de vacaciones'})}
  });
  prox.sort(function(a,b){return a.k-b.k});
  var mes=hoyD.getMonth(),dia=hoyD.getDate(),avisos=[];
  if(mes===10||(mes===11&&dia<=20)){
    var ag=l.reduce(function(t,e){return t+(e.salario>0?M.aguinaldo({salario:e.salario,ingreso:e.ingreso}).monto:0)},0);
    if(ag>0)avisos.push('Aguinaldo de tu equipo: <b>'+pesos(ag)+'</b>, a más tardar el 20 de diciembre.');
  }
  if(mes===3||(mes===4&&dia<=30))avisos.push('El reparto de utilidades (PTU) se paga a más tardar el 30 de mayo.');
  var h=k;
  if(avisos.length)h+=avisos.map(function(a){return '<p class="nb-aviso">'+a+'</p>'}).join('');
  h+='<div class="nb-cols eq-cols"><div><h3 class="inv-h">Hoy</h3>'+(hoyL.length?'<ul class="eq-l">'+hoyL.join('')+'</ul>':'<p class="inv-ok">Hoy viene todo tu equipo.</p>')+'</div>'+
    '<div><h3 class="inv-h">Próximos 30 días</h3>'+(prox.length?'<ul class="eq-l">'+prox.slice(0,8).map(function(p){return '<li>'+p.h+'</li>'}).join('')+'</ul>':'<p class="hint">Sin cumpleaños ni aniversarios.</p>')+'</div></div>';
  h+='<div class="nb-scroll"><table class="nb-tab eq-t"><caption>Tu equipo</caption><thead><tr><th scope="col">Nombre</th><th scope="col">Puesto</th><th scope="col" class="num">Antigüedad</th><th scope="col" class="num">Vacaciones disponibles</th><th scope="col" class="num">Salario diario</th></tr></thead><tbody>'+
    filas.map(function(f){var a=f.v.antiguedad;return '<tr><td>'+esc(f.e.nombre)+'</td><td>'+esc(f.e.puesto)+'</td><td class="num">'+(f.e.ingreso&&a.valido?a.anios+' '+plural(a.anios,'año','años'):'—')+'</td><td class="num">'+(f.e.ingreso?f.v.disponibles+' de '+f.v.tocan:'—')+'</td><td class="num">'+(f.e.salario?pesos(f.e.salario):'—')+'</td></tr>'}).join('')+
    '</tbody></table></div>';
  return h+botones;
}
function cuando(k,d){return k===0?' hoy':k===1?' mañana':' el '+esc(corta(d))}

/* ---------- Nómina de tu equipo ---------- */
var QUE=[['nomina','Nómina del periodo'],['aguinaldo','Aguinaldo del año'],['vacaciones','Vacaciones del equipo']];
var PERIODOS=[['Semanal','Semanal'],['Catorcenal','Catorcenal'],['Quincenal','Quincenal'],['Mensual','Mensual']];
/* El periodo que contiene la fecha (quincenas del 1 al 15 y del 16 al fin de mes; semanas de lunes a domingo) */
function periodoDe(tipo,desde){
  var d=fechaDe(desde)||fechaDe(hoy()),a,b;
  if(tipo==='Mensual'){a=new Date(d.getFullYear(),d.getMonth(),1);b=new Date(d.getFullYear(),d.getMonth()+1,0)}
  else if(tipo==='Quincenal'){
    a=fechaDe(desde)?d:new Date(d.getFullYear(),d.getMonth(),d.getDate()<=15?1:16);
    b=a.getDate()===1?new Date(a.getFullYear(),a.getMonth(),15):a.getDate()===16?new Date(a.getFullYear(),a.getMonth()+1,0):new Date(a.getTime()+14*DIA);
  }else{
    var largo=tipo==='Catorcenal'?14:7;
    if(fechaDe(desde))a=d;else{a=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7))}
    b=new Date(a.getTime()+(largo-1)*DIA);
  }
  return {a:a,b:b};
}
function planillaHTML(x){
  var l=empleados();
  if(!eb()||!l.length)return '<p class="hint">Agrega a tu equipo en la página «Mi equipo» (Crear → Recursos humanos) y aquí sale su '+(x.que==='aguinaldo'?'aguinaldo':x.que==='vacaciones'?'tabla de vacaciones':'nómina')+'.</p>';
  var inc=incidencias(),h='';
  if(x.que==='aguinaldo'){
    var anio=new Date().getFullYear(),tot={m:0,i:0,n:0};
    var rows=l.map(function(e){
      if(!(e.salario>0))return '<tr><td>'+esc(e.nombre)+'</td><td class="num" colspan="4">Falta su salario diario</td></tr>';
      var r=M.aguinaldo({salario:e.salario,ingreso:e.ingreso,al:anio+'-12-31'});
      tot.m+=r.monto;tot.i+=r.isr;tot.n+=r.neto;
      return '<tr><td>'+esc(e.nombre)+'</td><td class="num">'+r.trabajados+'</td><td class="num">'+pesos(r.monto)+'</td><td class="num">'+(r.isr?'−'+pesos(r.isr):pesos(0))+'</td><td class="num"><b>'+pesos(r.neto)+'</b></td></tr>';
    });
    h+=N.resumen([['Aguinaldo neto',pesos(tot.n),'nb-acento'],['Aguinaldo total',pesos(tot.m)],['ISR',tot.i?'−'+pesos(tot.i):pesos(0)],['Páguese antes del','20 de diciembre de '+anio]]);
    h+='<div class="nb-scroll"><table class="nb-tab eq-t"><thead><tr><th scope="col">Persona</th><th scope="col" class="num">Días trabajados en '+anio+'</th><th scope="col" class="num">Aguinaldo</th><th scope="col" class="num">ISR</th><th scope="col" class="num">Neto</th></tr></thead><tbody>'+rows.join('')+
      '<tr class="nb-tot"><th scope="row" colspan="2">Total</th><td class="num">'+pesos(tot.m)+'</td><td class="num">'+(tot.i?'−'+pesos(tot.i):pesos(0))+'</td><td class="num">'+pesos(tot.n)+'</td></tr></tbody></table></div>';
    return h+'<p class="rh-nota">15 días de salario por año completo; proporcional si entró este año. ISR estimado con la tarifa de '+M.T.anio+' (exento hasta 30 UMA).</p>';
  }
  if(x.que==='vacaciones'){
    h+='<div class="nb-scroll"><table class="nb-tab eq-t"><thead><tr><th scope="col">Persona</th><th scope="col" class="num">Antigüedad</th><th scope="col" class="num">Le tocan</th><th scope="col" class="num">Tomados</th><th scope="col" class="num">Disponibles</th><th scope="col">Próximo aniversario</th></tr></thead><tbody>'+
      l.map(function(e){
        if(!e.ingreso)return '<tr><td>'+esc(e.nombre)+'</td><td class="num" colspan="5">Falta su fecha de ingreso</td></tr>';
        var v=vacacionesDe(e,inc),a=v.antiguedad;
        return '<tr><td>'+esc(e.nombre)+'</td><td class="num">'+a.anios+' '+plural(a.anios,'año','años')+'</td><td class="num">'+v.tocan+'</td><td class="num">'+v.tomados+'</td><td class="num"><b>'+v.disponibles+'</b></td><td>'+esc(larga(a.proximo))+' ('+v.siguientes+' días)</td></tr>';
      }).join('')+'</tbody></table></div>';
    return h+'<p class="rh-nota">Le tocan los días de su último aniversario (art. 76 LFT); se restan las vacaciones anotadas en Incidencias desde entonces.</p>';
  }
  /* Nómina del periodo */
  var tipo=x.periodo||'Quincenal',p=periodoDe(tipo,x.desde),pm=PERIODO_MOTOR[tipo];
  var gente=l.filter(function(e){return (e.periodo||'Quincenal')===tipo});
  var T={p:0,i:0,s:0,n:0,c:0},sin=0;
  var rows=gente.map(function(e){
    if(!(e.salario>0)){sin++;return '<tr><td>'+esc(e.nombre)+'</td><td class="num" colspan="6">Falta su salario diario</td></tr>'}
    var faltas=0,horas=0;
    de(e.id,inc).forEach(function(z){
      if(z.tipo==='Falta'||z.tipo==='Incapacidad')faltas+=diasEn(z,p.a,p.b);
      if(z.tipo==='Horas extra'){var d=fechaDe(z.desde);if(d&&d>=p.a&&d<=p.b)horas+=z.horas}
    });
    var semanas=M.PERIODOS[pm].dias/7,dobles=Math.min(horas,9*semanas),triples=Math.max(0,horas-dobles);
    var r=M.recibo({salario:e.salario,periodo:pm,faltas:faltas,horasDobles:dobles,horasTriples:triples,ingreso:e.ingreso,al:iso(p.b)});
    T.p+=r.total;T.i+=r.isr;T.s+=r.imss;T.n+=r.neto;T.c+=r.costo.total;
    return '<tr><td>'+esc(e.nombre)+(faltas?' <small class="rh-sm">'+faltas+' '+plural(faltas,'falta','faltas')+'</small>':'')+(horas?' <small class="rh-sm">'+horas+' h extra</small>':'')+'</td>'+
      '<td class="num">'+r.pagados+'</td><td class="num">'+pesos(r.total)+'</td><td class="num">'+(r.isr?'−'+pesos(r.isr):pesos(0))+'</td><td class="num">'+(r.imss?'−'+pesos(r.imss):pesos(0))+'</td><td class="num"><b>'+pesos(r.neto)+'</b></td><td class="num">'+pesos(r.costo.total)+'</td></tr>';
  });
  h+='<p class="nb-p">'+esc(tipo)+' del '+esc(larga(p.a))+' al '+esc(larga(p.b))+' · '+gente.length+' '+plural(gente.length,'persona','personas')+' con pago '+esc(tipo.toLowerCase())+'</p>';
  if(!gente.length)return h+'<p class="hint">Nadie de tu equipo tiene pago '+esc(tipo.toLowerCase())+'. Cambia el periodo o la columna «Pago» en Empleados.</p>';
  h+=N.resumen([['Neto a pagar',pesos(T.n),'nb-acento'],['Percepciones',pesos(T.p)],['ISR e IMSS',T.i+T.s?'−'+pesos(T.i+T.s):pesos(0)],['Le cuesta al negocio',pesos(T.c)]]);
  h+='<div class="nb-scroll"><table class="nb-tab eq-t"><thead><tr><th scope="col">Persona</th><th scope="col" class="num">Días pagados</th><th scope="col" class="num">Percepciones</th><th scope="col" class="num">ISR</th><th scope="col" class="num">IMSS</th><th scope="col" class="num">Neto</th><th scope="col" class="num">Costo</th></tr></thead><tbody>'+rows.join('')+
    '<tr class="nb-tot"><th scope="row" colspan="2">Total</th><td class="num">'+pesos(T.p)+'</td><td class="num">'+(T.i?'−'+pesos(T.i):pesos(0))+'</td><td class="num">'+(T.s?'−'+pesos(T.s):pesos(0))+'</td><td class="num">'+pesos(T.n)+'</td><td class="num">'+pesos(T.c)+'</td></tr></tbody></table></div>';
  return h+'<p class="rh-nota">Descuenta las faltas e incapacidades y paga las horas extra anotadas en Incidencias (las primeras 9 por semana, dobles; las demás, triples). Costo: percepciones, IMSS del patrón e INFONAVIT. Estimado con las tablas de '+M.T.anio+'.</p>';
}

/* ---------- Repintar ---------- */
function pintarTodos(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-equipo]'),function(e){
    var sb=e.hasAttribute('data-sin-botones'),a=e.contains(document.activeElement)&&document.activeElement.getAttribute('data-acc');
    e.innerHTML=resumenHTML(sb);
    if(a){var x=e.querySelector('[data-acc="'+a+'"]');if(x)x.focus()}
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-planilla]'),function(e){
    var x={};try{x=JSON.parse(e.getAttribute('data-planilla'))}catch(z){}
    e.innerHTML=planillaHTML(x);
  });
}
var repintar=null;
B.on(function(c){
  var o=ids();
  if(c.base&&c.base!==o.empleados&&c.base!==o.incidencias)return;
  clearTimeout(repintar);repintar=setTimeout(pintarTodos,120);
});

/* ---------- Ventanas: agregar persona y anotar falta o vacaciones ---------- */
function ventana(id,titulo,cuerpo,alGuardar){
  var d=document.createElement('dialog');
  d.className='atajos bd-dlg inv-dlg';d.setAttribute('aria-labelledby',id);
  d.innerHTML='<div class="at-h"><h2 id="'+id+'">'+esc(titulo)+'</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+AT.ico('close')+'</button></div>'+
    '<form method="dialog" class="inv-f">'+cuerpo+'<p class="bd-msg" data-msg aria-live="polite"></p>'+
    '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>';
  document.body.appendChild(d);
  var f=$('form',d),msg=$('[data-msg]',d);
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){d.remove()});
  f.addEventListener('submit',function(e){e.preventDefault();alGuardar(f,function(t){msg.textContent=t},function(){d.close()})});
  d.showModal();
  var p=f.querySelector('input,select');if(p)p.focus();
  return d;
}
function agregarPersona(){
  return new Promise(function(listo){
    ventana('eqPerT','Agregar persona',
      '<label class="campo-l"><span>Nombre</span><input name="nombre" type="text" required autocomplete="off"></label>'+
      '<div class="inv-2"><label class="campo-l"><span>Puesto</span><input name="puesto" type="text" autocomplete="off" placeholder="Ej. cajera"></label>'+
      '<label class="campo-l"><span>Fecha de ingreso</span><input name="ingreso" type="date" value="'+hoy()+'"></label></div>'+
      '<div class="inv-2"><label class="campo-l"><span>Salario diario</span><input name="salario" type="text" inputmode="decimal" autocomplete="off" placeholder="$'+M.T.sm.general.toFixed(2)+'"></label>'+
      '<label class="campo-l"><span>Pago</span><select name="periodo">'+PERIODOS.map(function(p){return '<option'+(p[0]==='Quincenal'?' selected':'')+'>'+p[0]+'</option>'}).join('')+'</select></label></div>'+
      '<div class="inv-2"><label class="campo-l"><span>Cumpleaños (opcional)</span><input name="nac" type="date"></label>'+
      '<label class="campo-l"><span>Teléfono (opcional)</span><input name="tel" type="tel" autocomplete="off"></label></div>',
      function(f,decir,cerrar){
        var nom=f.elements.nombre.value.replace(/\s+/g,' ').trim();
        if(!nom){decir('Escribe el nombre.');f.elements.nombre.focus();return}
        var sal=parseFloat(String(f.elements.salario.value).replace(/[$,\s]/g,''));
        asegurar().then(function(o){
          var w={'em-nombre':nom,'em-puesto':f.elements.puesto.value.trim(),'em-periodo':f.elements.periodo.value,'em-estado':'Activo'};
          if(f.elements.ingreso.value)w['em-ingreso']=f.elements.ingreso.value;
          if(f.elements.nac.value)w['em-nac']=f.elements.nac.value;
          if(f.elements.tel.value.trim())w['em-tel']=f.elements.tel.value.trim();
          if(sal>0)w['em-salario']=Math.round(sal*100)/100;
          return B.guardarFila(B.nuevaFila(o.empleados,w));
        }).then(function(){cerrar();pintarTodos();AT.aviso(nom+' ya está en tu equipo.');listo(true)},function(){decir('No se pudo guardar. Inténtalo otra vez.')});
      });
  });
}
var TIPOS_INC=['Falta','Vacaciones','Incapacidad','Permiso','Horas extra','Retardo'];
function anotar(op){
  op=op||{};
  return asegurar().then(function(){
    var l=empleados();
    if(!l.length){AT.aviso('Primero agrega a tu equipo con «Agregar persona».');return false}
    return new Promise(function(listo){
      var d=ventana('eqIncT','Anotar falta o vacaciones',
        '<label class="campo-l"><span>Persona</span><select name="emp">'+l.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.nombre)+'</option>'}).join('')+'</select></label>'+
        '<div class="inv-2"><label class="campo-l"><span>Tipo</span><select name="tipo">'+TIPOS_INC.map(function(t){return '<option'+(t===(op.tipo||'Falta')?' selected':'')+'>'+t+'</option>'}).join('')+'</select></label>'+
        '<label class="campo-l"><span>Desde</span><input name="desde" type="date" value="'+hoy()+'"></label></div>'+
        '<div class="inv-2"><label class="campo-l"><span>Días</span><input name="dias" type="text" inputmode="decimal" value="1" autocomplete="off"></label>'+
        '<label class="campo-l"><span>Horas (horas extra o retardo)</span><input name="horas" type="text" inputmode="decimal" autocomplete="off"></label></div>'+
        '<label class="campo-l"><span>Nota (opcional)</span><input name="nota" type="text" autocomplete="off" placeholder="Ej. con permiso de la encargada"></label>',
        function(f,decir,cerrar){
          var dias=parseFloat(String(f.elements.dias.value).replace(',','.'))||0,horas=parseFloat(String(f.elements.horas.value).replace(',','.'))||0,tipo=f.elements.tipo.value;
          if(tipo==='Horas extra'&&!(horas>0)){decir('Escribe cuántas horas extra.');f.elements.horas.focus();return}
          if(tipo!=='Horas extra'&&tipo!=='Retardo'&&!(dias>0)){decir('Escribe cuántos días.');f.elements.dias.focus();return}
          var e=l.filter(function(y){return y.id===f.elements.emp.value})[0];
          asegurar().then(function(o){
            var w={'in-con':tipo+' de '+(e?e.nombre:''),'in-emp':f.elements.emp.value,'in-tipo':tipo,'in-desde':f.elements.desde.value||hoy()};
            if(tipo!=='Horas extra'&&tipo!=='Retardo')w['in-dias']=dias;else if(dias>0&&tipo!=='Horas extra')w['in-dias']=dias;
            if(horas>0)w['in-horas']=horas;
            if(f.elements.nota.value.trim())w['in-nota']=f.elements.nota.value.trim();
            return B.guardarFila(B.nuevaFila(o.incidencias,w));
          }).then(function(){cerrar();pintarTodos();AT.aviso('Anotado: '+tipo.toLowerCase()+(e?' de '+e.nombre:'')+'.');listo(true)},function(){decir('No se pudo guardar. Inténtalo otra vez.')});
        });
      d.addEventListener('close',function(){listo(false)});
    });
  });
}

/* ---------- Los bloques ---------- */
if(N){
  N.bloque('equipo',{
    etiqueta:'Resumen de tu equipo',def:{titulo:''},modulo:'rh',
    editar:function(){return '<div class="nb-res"></div>'},
    resultado:function(){return '<div data-equipo>'+resumenHTML()+'</div>'},
    leer:function(x,uid,op){var sb=!(op&&op.editable);return '<h3 class="nb-tit">Tu equipo</h3><div data-equipo'+(sb?' data-sin-botones':'')+'>'+resumenHTML(sb)+'</div>'},
    acciones:{
      persona:function(){setTimeout(agregarPersona,0);return false},
      incidencia:function(){setTimeout(anotar,0);return false}
    },
    texto:function(){var l=empleados();return 'Tu equipo: '+l.length+' '+plural(l.length,'persona','personas')+(l.length?' ('+l.map(function(e){return e.nombre}).join(', ')+')':'')+'.'},
    md:function(){var l=empleados(),inc=incidencias();return '**Tu equipo**\n\n'+l.map(function(e){var v=vacacionesDe(e,inc);return '- '+e.nombre+(e.puesto?' ('+e.puesto+')':'')+(e.ingreso?': '+v.disponibles+' días de vacaciones disponibles':'')}).join('\n')},
    insertar:{t:'Resumen de tu equipo',d:'Quién falta hoy, cumpleaños, vacaciones y costo al mes',i:'users',
      p:'equipo empleados personal trabajadores recursos humanos rh faltas vacaciones cumpleanos aniversario nomina'}
  });
  N.bloque('planilla',{
    etiqueta:'Nómina de tu equipo',def:{titulo:'',que:'nomina',periodo:'Quincenal',desde:''},modulo:'rh',
    editar:function(x){
      return '<div class="nb-form"><label class="nb-c"><span>¿Qué quieres ver?</span><select data-k="que">'+N.opciones(QUE,x.que)+'</select></label>'+
        (x.que==='nomina'?'<label class="nb-c"><span>Periodo</span><select data-k="periodo">'+N.opciones(PERIODOS,x.periodo)+'</select></label>'+
          N.campo('Empieza el (si no, el periodo actual)','desde',x.desde,{tipo:'date'}):'')+'</div><div class="nb-res"></div>';
    },
    resultado:function(x){return '<div data-planilla="'+esc(JSON.stringify({que:x.que,periodo:x.periodo,desde:x.desde}))+'">'+planillaHTML(x)+'</div>'},
    leer:function(x){
      var t=(x.titulo||'').trim()||(QUE.filter(function(q){return q[0]===x.que})[0]||QUE[0])[1];
      return '<h3 class="nb-tit">'+esc(t)+'</h3><div data-planilla="'+esc(JSON.stringify({que:x.que,periodo:x.periodo,desde:x.desde}))+'">'+planillaHTML(x)+'</div>';
    },
    texto:function(x){return (QUE.filter(function(q){return q[0]===x.que})[0]||QUE[0])[1]+' de tu equipo.'},
    md:function(x){return '**'+(QUE.filter(function(q){return q[0]===x.que})[0]||QUE[0])[1]+'**'},
    foco:'[data-k="que"]',
    insertar:{t:'Nómina de tu equipo',d:'Nómina, aguinaldo o vacaciones de todas tus personas',i:'recibo',
      p:'nomina de tu equipo planilla quincena semana aguinaldo vacaciones empleados todos rh'}
  });
}

/* Al imprimir, los bloques necesitan a tu equipo ya leído */
B.precargas.push(function(doc){
  var j=JSON.stringify(doc&&doc.contenido||{});
  return j.indexOf('"type":"equipo"')>=0||j.indexOf('"type":"planilla"')>=0?cargar():null;
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cargar);else cargar();

AT.equipo={cargar:cargar,asegurar:asegurar,empleados:empleados,incidencias:incidencias,vacacionesDe:vacacionesDe,personas:personas,
  agregar:agregarPersona,anotar:anotar,resumenHTML:resumenHTML,planillaHTML:planillaHTML,periodoDe:periodoDe};
})();
