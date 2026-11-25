/* OneBook: motor de recursos humanos (cálculos de nómina en México, sin interfaz). Lo usan los bloques de rh.js y el
   resumen de tu equipo (equipo.js).
   Cifras de 2026 (AT.nomina.T):
   - UMA: $117.31 diaria, $3,566.22 mensual (INEGI, DOF 9 de enero de 2026; rige desde el 1 de febrero).
   - Salario mínimo: $315.04 diario (general) y $440.87 (Zona Libre de la Frontera Norte), desde el 1 de enero.
   - ISR: tarifa mensual del artículo 96 de la LISR (Anexo 8 de la RMF 2026, DOF 28 de diciembre de 2025). Para otros
     periodos se usa la misma tarifa dividida entre 30.4 y multiplicada por los días (como las tablas del Anexo 8).
   - Subsidio para el empleo 2026: 15.02 % de la UMA mensual ($535.65) a quien gane hasta $11,492.66 al mes; solo
     reduce el ISR, nunca se paga en efectivo.
   - IMSS (Ley del Seguro Social) y cesantía y vejez patronal de 2026 por rango de salario; INFONAVIT 5 %.
   - Ley Federal del Trabajo: vacaciones (art. 76, «vacaciones dignas»), prima vacacional (art. 80, 25 % mínimo),
     aguinaldo (art. 87, 15 días mínimo), horas extra (arts. 67 y 68), prima dominical (art. 71), prima de antigüedad
     (art. 162, 12 días por año con salario topado al doble del mínimo), indemnización (arts. 48, 50 y 89) y PTU
     (arts. 117 a 131: 10 %, mitad por días y mitad por salarios, tope de tres meses o el promedio de tres años).
   - Exentos de ISR (art. 93 LISR): aguinaldo 30 UMA, prima vacacional 15 UMA, prima dominical 1 UMA por domingo,
     PTU 15 UMA, la mitad de las horas extra dobles y descansos trabajados hasta 5 UMA por semana, y lo que se paga por
     separación hasta 90 UMA por año de servicio.
   Todo regresa pesos con dos decimales. Son estimaciones para planear: el recibo oficial lo timbra tu contador. */
(function(){
'use strict';
var AT=window.AT=window.AT||{};

var T={
  anio:2026,
  uma:117.31,umaMes:3566.22,
  sm:{general:315.04,frontera:440.87},
  /* [límite inferior, cuota fija, % sobre el excedente] */
  isr:[[0.01,0,1.92],[844.60,16.22,6.40],[7168.52,420.95,10.88],[12598.03,1011.68,16.00],[14644.65,1339.14,17.92],
    [17533.65,1856.84,21.36],[35362.84,5665.16,23.52],[55736.69,10457.09,30.00],[106410.51,25659.23,32.00],
    [141880.67,37009.69,34.00],[425642.00,133488.54,35.00]],
  subsidio:{pct:15.02,tope:11492.66},
  /* Cuotas del IMSS (% del salario base de cotización, SBC), del trabajador y del patrón */
  imss:{
    fija:20.40,                         /* patrón: enfermedad y maternidad, % de la UMA por día */
    excedente:{obrero:0.40,patron:1.10}, /* sobre lo que pase de 3 UMA */
    dinero:{obrero:0.25,patron:0.70},
    pensionados:{obrero:0.375,patron:1.05},
    invalidez:{obrero:0.625,patron:1.75},
    guarderias:1.00,retiro:2.00,
    cesantiaObrero:1.125,
    /* Cesantía y vejez del patrón en 2026: hasta 1 salario mínimo, y después por veces la UMA */
    cesantia:[[1.50,3.676],[2.00,4.851],[2.50,5.556],[3.00,6.026],[3.50,6.361],[4.00,6.613],[Infinity,7.513]],
    cesantiaSM:3.150,
    riesgo:0.54355,                     /* prima mínima de riesgo de trabajo (clase I); la tuya puede ser otra */
    tope:25,                            /* el SBC se topa en 25 UMA */
    infonavit:5.00
  }
};
var PERIODOS={semanal:{dias:7,nombre:'Semanal'},catorcenal:{dias:14,nombre:'Catorcenal'},quincenal:{dias:15,nombre:'Quincenal'},
  mensual:{dias:30,nombre:'Mensual'}};

function r2(n){return Math.round((n+1e-9)*100)/100}
function num(v){var n=parseFloat(String(v==null?'':v).replace(/[$,\s%]/g,''));return isFinite(n)?n:0}
function fechaDe(t){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function diasEntre(a,b){return Math.round((b-a)/864e5)}

/* ---------- Ley Federal del Trabajo ---------- */
/* Días de vacaciones al cumplir n años (art. 76): 12, 14, 16, 18, 20; luego +2 cada cinco años */
function diasVacaciones(n){
  n=Math.floor(n);
  if(n<1)return 0;
  if(n<=5)return 10+2*n;
  return 22+2*Math.floor((n-6)/5);
}
/* Antigüedad de una fecha de ingreso a otra: años cumplidos, días desde el último aniversario, próximo aniversario */
function antiguedad(ingreso,al){
  var a=typeof ingreso==='string'?fechaDe(ingreso):ingreso,b=al?(typeof al==='string'?fechaDe(al):al):new Date();
  if(!a||!b||b<a)return {anios:0,dias:0,total:0,ultimo:a,proximo:a,valido:!!(a&&b)&&b>=a};
  b=new Date(b.getFullYear(),b.getMonth(),b.getDate());
  var n=b.getFullYear()-a.getFullYear();
  var aniv=function(k){var d=new Date(a.getFullYear()+k,a.getMonth(),a.getDate());if(d.getMonth()!==a.getMonth())d=new Date(a.getFullYear()+k,a.getMonth()+1,0);return d};
  if(aniv(n)>b)n--;
  var ult=aniv(n),prox=aniv(n+1);
  return {anios:n,dias:diasEntre(ult,b),total:diasEntre(a,b)+1,ultimo:ult,proximo:prox,
    /* Años de servicio con fracción (para la prima de antigüedad y la indemnización) */
    exacto:n+diasEntre(ult,b)/Math.max(1,diasEntre(ult,prox)),valido:true};
}
/* Factor de integración y salario diario integrado (SDI): sueldo + aguinaldo + prima vacacional repartidos en el año */
function integracion(sd,anios,o){
  o=o||{};
  var ag=o.aguinaldo==null?15:num(o.aguinaldo),pv=o.prima==null?25:num(o.prima);
  var vac=diasVacaciones(Math.max(1,Math.floor(anios)+1));
  var factor=1+ag/365+vac*(pv/100)/365;
  return {factor:Math.round(factor*10000)/10000,sdi:r2(sd*factor),vacaciones:vac};
}

/* ---------- ISR (art. 96) ---------- */
/* ISR de la tarifa para un ingreso gravado en un periodo de «dias» días (mensual: la tarifa tal cual) */
function isrTarifa(base,dias,mensual){
  if(!(base>0))return 0;
  var f=mensual?1:dias/30.4,fila=T.isr[0];
  for(var i=0;i<T.isr.length;i++){if(base>=T.isr[i][0]*f-1e-9)fila=T.isr[i]}
  return r2(fila[1]*f+(base-fila[0]*f)*fila[2]/100);
}
/* Subsidio para el empleo del periodo: si el ingreso (llevado a un mes) no pasa del tope */
function subsidio(base,dias,mensual){
  var alMes=mensual?base:base/dias*30.4,mes=r2(T.umaMes*T.subsidio.pct/100);
  if(!(base>0)||alMes>T.subsidio.tope+1e-9)return 0;
  return mensual?mes:r2(mes/30.4*dias);
}

/* ---------- IMSS ---------- */
function sbcTopado(sbc){return Math.min(sbc,T.uma*T.imss.tope)}
function cesantiaPatron(sbc,sm){
  if(sbc<=sm+1e-9)return T.imss.cesantiaSM;
  var v=Math.round(sbc/T.uma*100)/100;
  for(var i=0;i<T.imss.cesantia.length;i++)if(v<=T.imss.cesantia[i][0])return T.imss.cesantia[i][1];
  return T.imss.cesantia[T.imss.cesantia.length-1][1];
}
/* Cuotas de un periodo: {obrero, patron, infonavit, detalle:[[nombre, obrero, patrón]]}. o: {sm, riesgo} */
function imss(sbc,dias,o){
  o=o||{};
  var I=T.imss,s=sbcTopado(sbc),exc=Math.max(0,s-3*T.uma),sm=o.sm||T.sm.general;
  var riesgo=o.riesgo==null||o.riesgo===''?I.riesgo:num(o.riesgo);
  var ces=cesantiaPatron(s,sm);
  var d=[
    ['Enfermedad y maternidad (cuota fija)',0,r2(T.uma*dias*I.fija/100)],
    ['Enfermedad y maternidad (excedente de 3 UMA)',r2(exc*dias*I.excedente.obrero/100),r2(exc*dias*I.excedente.patron/100)],
    ['Prestaciones en dinero',r2(s*dias*I.dinero.obrero/100),r2(s*dias*I.dinero.patron/100)],
    ['Gastos médicos de pensionados',r2(s*dias*I.pensionados.obrero/100),r2(s*dias*I.pensionados.patron/100)],
    ['Invalidez y vida',r2(s*dias*I.invalidez.obrero/100),r2(s*dias*I.invalidez.patron/100)],
    ['Riesgo de trabajo',0,r2(s*dias*riesgo/100)],
    ['Guarderías y prestaciones sociales',0,r2(s*dias*I.guarderias/100)],
    ['Retiro',0,r2(s*dias*I.retiro/100)],
    ['Cesantía en edad avanzada y vejez',r2(s*dias*I.cesantiaObrero/100),r2(s*dias*ces/100)]
  ];
  var ob=0,pa=0;d.forEach(function(x){ob+=x[1];pa+=x[2]});
  return {sbc:r2(s),tasaCesantia:ces,obrero:r2(ob),patron:r2(pa),infonavit:r2(s*dias*I.infonavit/100),detalle:d};
}

/* ---------- Recibo de nómina de un periodo ----------
   o: {salario (diario), periodo:'semanal'|'catorcenal'|'quincenal'|'mensual', faltas, horasDobles, horasTriples,
       domingos (prima dominical), descansos (días de descanso o festivos trabajados), otras (percepción gravada),
       zona:'general'|'frontera', ingreso (fecha, para la antigüedad y el SDI), al (fecha del cálculo),
       aguinaldo (días), prima (%), riesgo (%), isn (% estatal sobre nómina), infonavit (descuento del crédito)} */
function recibo(o){
  var P=PERIODOS[o.periodo]||PERIODOS.quincenal,dias=P.dias,mensual=o.periodo==='mensual';
  var sd=num(o.salario),sm=T.sm[o.zona==='frontera'?'frontera':'general'];
  var faltas=Math.min(dias,Math.max(0,Math.floor(num(o.faltas)))),pagados=dias-faltas;
  var semanas=dias/7,hora=sd/8;
  var ant=o.ingreso?antiguedad(o.ingreso,o.al):{anios:0,valido:false};
  var integ=integracion(sd,ant.anios,o);
  var minimo=sd>0&&sd<=sm+1e-9;
  /* Percepciones */
  var sueldo=r2(sd*pagados);
  var dobles=r2(hora*2*Math.max(0,num(o.horasDobles)));
  var triples=r2(hora*3*Math.max(0,num(o.horasTriples)));
  var descansos=r2(sd*2*Math.max(0,num(o.descansos)));
  var dom=Math.max(0,Math.floor(num(o.domingos))),primaDom=r2(sd*0.25*dom);
  var otras=r2(Math.max(0,num(o.otras)));
  var percepciones=[
    ['Sueldo ('+pagados+(pagados===1?' día':' días')+')',sueldo],
    dobles?['Horas extra dobles ('+num(o.horasDobles)+' h)',dobles]:null,
    triples?['Horas extra triples ('+num(o.horasTriples)+' h)',triples]:null,
    descansos?['Descanso o festivo trabajado ('+num(o.descansos)+')',descansos]:null,
    primaDom?['Prima dominical ('+dom+')',primaDom]:null,
    otras?['Otras percepciones',otras]:null
  ].filter(Boolean);
  var total=r2(sueldo+dobles+triples+descansos+primaDom+otras);
  /* Exentos (art. 93): con salario mínimo, el tiempo extra y los descansos están exentos por completo */
  var extra=dobles+descansos;
  var exExtra=minimo?extra+triples:Math.min(extra/2,5*T.uma*semanas);
  var exDom=Math.min(primaDom,T.uma*dom);
  var exento=r2(exExtra+exDom);
  /* Con un salario mínimo no se retiene ISR del sueldo (art. 96) */
  var gravado=r2(Math.max(0,total-exento-(minimo?sueldo:0)));
  var isr=isrTarifa(gravado,dias,mensual),sub=subsidio(gravado,dias,mensual);
  var isrRet=r2(Math.max(0,isr-sub));
  /* IMSS: el tiempo extra dentro de la ley no integra al SBC (art. 27 LSS); con salario mínimo, el patrón paga
     también la cuota del trabajador (art. 36 LSS) */
  var sbc=Math.max(integ.sdi,sm);
  var im=imss(sbc,pagados,{sm:sm,riesgo:o.riesgo});
  var imssObrero=minimo?0:im.obrero;
  var credito=r2(Math.max(0,num(o.infonavit)));
  var deducciones=[
    ['ISR',isrRet],
    ['IMSS',imssObrero],
    credito?['Crédito INFONAVIT',credito]:null
  ].filter(Boolean);
  var totalDed=r2(isrRet+imssObrero+credito);
  var neto=r2(total-totalDed);
  var isn=r2(total*Math.max(0,num(o.isn))/100);
  var patronImss=r2(im.patron+(minimo?im.obrero:0));
  return {periodo:o.periodo in PERIODOS?o.periodo:'quincenal',dias:dias,pagados:pagados,salario:sd,minimo:minimo,sm:sm,
    antiguedad:ant,factor:integ.factor,sdi:integ.sdi,sbc:im.sbc,
    percepciones:percepciones,total:total,exento:Math.min(exento,total),gravado:gravado,
    isrTarifa:isr,subsidio:sub,isr:isrRet,imss:imssObrero,imssDetalle:im.detalle,
    deducciones:deducciones,totalDeducciones:totalDed,neto:neto,
    costo:{imss:patronImss,infonavit:im.infonavit,isn:isn,total:r2(total+patronImss+im.infonavit+isn),tasaCesantia:im.tasaCesantia}};
}

/* ---------- Vacaciones ----------
   o: {ingreso, al, salario, prima (%), tomados (días ya tomados del año que te tocan), pendientes (de años
   anteriores)}. Te tocan los días del último aniversario; los del año en curso se ganan al cumplirlo. */
function vacaciones(o){
  var a=antiguedad(o.ingreso,o.al),sd=num(o.salario),pv=o.prima==null||o.prima===''?25:num(o.prima);
  var tocan=diasVacaciones(a.anios),siguientes=diasVacaciones(a.anios+1);
  var tomados=Math.max(0,num(o.tomados)),pend=Math.max(0,num(o.pendientes));
  var disponibles=Math.max(0,tocan+pend-tomados);
  var proporcion=a.valido?Math.round(siguientes*a.dias/Math.max(1,diasEntre(a.ultimo,a.proximo))*100)/100:0;
  var pago=r2(disponibles*sd),prima=r2(pago*pv/100);
  return {antiguedad:a,tocan:tocan,siguientes:siguientes,tomados:tomados,pendientes:pend,disponibles:disponibles,
    proporcionales:proporcion,pago:pago,prima:prima,primaPct:pv,exentoPrima:r2(Math.min(prima,15*T.uma)),
    tabla:[1,2,3,4,5,6,11,16,21,26,31].map(function(n,i,l){return [n,l[i+1]?l[i+1]-1:null,diasVacaciones(n)]})};
}

/* ---------- Aguinaldo ----------
   o: {salario, ingreso, al (fecha hasta la que se cuenta; si no, el 31 de diciembre), dias (15), mensual (sueldo del
   mes, para el ISR; si no, salario × 30.4), faltas (días no trabajados del año que no cuentan)} */
function aguinaldo(o){
  var sd=num(o.salario),dias=o.dias==null||o.dias===''?15:Math.max(15,num(o.dias));
  var al=o.al?fechaDe(o.al):null,hoy=new Date();
  var anio=(al||hoy).getFullYear();
  if(!al)al=new Date(anio,11,31);
  var ini=new Date(anio,0,1),ing=fechaDe(o.ingreso);
  if(ing&&ing>ini)ini=ing;
  var largo=(new Date(anio,11,31)-new Date(anio,0,1))/864e5+1;
  var trabajados=Math.max(0,Math.min(largo,diasEntre(ini,al)+1)-Math.max(0,num(o.faltas)));
  var completo=trabajados>=largo;
  var monto=r2(sd*dias*(completo?1:trabajados/365));
  var exento=r2(Math.min(monto,30*T.uma)),gravado=r2(monto-exento);
  var mes=num(o.mensual)||r2(sd*30.4);
  var isr=gravado>0?r2(isrTarifa(mes+gravado,30,true)-isrTarifa(mes,30,true)):0;
  return {dias:dias,trabajados:trabajados,completo:completo,anio:anio,desde:iso(ini),hasta:iso(al),monto:monto,exento:exento,
    gravado:gravado,isr:isr,neto:r2(monto-isr),limite:anio+'-12-20'};
}

/* ---------- Finiquito y liquidación ----------
   o: {ingreso, salida, salario, motivo:'renuncia'|'justificado'|'injustificado', pendientes (días de sueldo sin pagar),
       vacPendientes (días de años anteriores sin tomar), vacTomadas (días tomados del año en curso),
       aguinaldo (días, 15), aguinaldoPagado (sí/no), prima (%), zona, veinte (incluir 20 días por año)} */
function finiquito(o){
  var sd=num(o.salario),zona=o.zona==='frontera'?'frontera':'general',sm=T.sm[zona];
  var a=antiguedad(o.ingreso,o.salida),pv=o.prima==null||o.prima===''?25:num(o.prima);
  var integ=integracion(sd,a.anios,o);
  var lineas=[],sep=[];
  var sueldo=r2(sd*Math.max(0,num(o.pendientes)));
  if(sueldo)lineas.push(['Sueldo pendiente ('+num(o.pendientes)+' días)',sueldo,'sueldo']);
  /* Aguinaldo proporcional del año de la salida */
  var ag=o.aguinaldoPagado?null:aguinaldo({salario:sd,ingreso:o.ingreso,al:o.salida,dias:o.aguinaldo});
  if(ag&&ag.monto)lineas.push(['Aguinaldo proporcional ('+ag.trabajados+' días trabajados en '+ag.anio+')',ag.monto,'aguinaldo']);
  /* Vacaciones: las de años anteriores sin tomar y la parte del año en curso, menos lo que ya tomó */
  var prop=a.valido?diasVacaciones(a.anios+1)*a.dias/Math.max(1,diasEntre(a.ultimo,a.proximo)):0;
  var vacDias=Math.max(0,Math.round((num(o.vacPendientes)+prop-num(o.vacTomadas))*100)/100);
  var vac=r2(vacDias*sd),prima=r2(vac*pv/100);
  if(vac)lineas.push(['Vacaciones ('+String(vacDias).replace('.',',')+' días)',vac,'vacaciones']);
  if(prima)lineas.push(['Prima vacacional ('+pv+' %)',prima,'prima']);
  /* Prima de antigüedad: en un despido siempre; si renuncia, solo con 15 años o más */
  var tope=2*sm,base=Math.min(sd,tope);
  if(o.motivo!=='renuncia'||a.anios>=15){
    var pa=r2(12*base*a.exacto);
    if(pa)sep.push(['Prima de antigüedad (12 días por año'+(sd>tope?', con salario topado a dos mínimos':'')+')',pa,'antiguedad']);
  }
  /* Despido injustificado: tres meses de salario integrado (y, si aplica, 20 días por año) */
  if(o.motivo==='injustificado'){
    sep.push(['Indemnización de tres meses (90 días de salario integrado)',r2(90*integ.sdi),'tres']);
    if(o.veinte)sep.push(['20 días de salario integrado por año de servicio',r2(20*integ.sdi*a.exacto),'veinte']);
  }
  var suma=function(l){return r2(l.reduce(function(s,x){return s+x[1]},0))};
  var ordinario=suma(lineas),separacion=suma(sep),total=r2(ordinario+separacion);
  /* ISR estimado: lo ordinario con la tarifa sobre el sueldo del mes; lo de separación, exento hasta 90 UMA por año
     y el resto con la tasa efectiva del último sueldo mensual (art. 95) */
  var mes=r2(sd*30.4);
  var exAg=ag?Math.min(ag.monto,30*T.uma):0,exPv=Math.min(prima,15*T.uma);
  var gravOrd=Math.max(0,ordinario-exAg-exPv);
  var isrOrd=gravOrd>0?r2(isrTarifa(mes+gravOrd,30,true)-isrTarifa(mes,30,true)):0;
  var aniosEx=Math.max(1,Math.round(a.exacto));
  var exSep=Math.min(separacion,90*T.uma*aniosEx),gravSep=Math.max(0,separacion-exSep);
  var tasa=mes>0?isrTarifa(mes,30,true)/mes:0;
  var isrSep=r2(gravSep*tasa);
  var isr=r2(isrOrd+isrSep);
  return {antiguedad:a,salario:sd,sdi:integ.sdi,factor:integ.factor,motivo:o.motivo||'renuncia',
    lineas:lineas,separacion:sep,ordinario:ordinario,indemnizacion:separacion,total:total,
    exento:r2(exAg+exPv+exSep),isr:isr,neto:r2(total-isr),vacDias:vacDias,topePrima:tope};
}

/* ---------- PTU ----------
   o: {monto (lo que se reparte: 10 % de la utilidad fiscal), personas:[{nombre, dias, salario (diario), tope (lo
   recibido en promedio los tres años anteriores, opcional)}]}. Mitad por días trabajados y mitad por salarios; cada
   quien recibe como máximo tres meses de salario o su promedio de tres años, lo que le convenga más (art. 127 VIII).
   Lo que sobra por el tope no se vuelve a repartir (así lo resolvió la autoridad en 2021). */
function ptu(o){
  var total=Math.max(0,num(o.monto)),ps=(o.personas||[]).map(function(p){
    return {nombre:p.nombre||'',dias:Math.max(0,Math.min(366,num(p.dias))),salario:Math.max(0,num(p.salario)),prom:Math.max(0,num(p.tope))};
  }).filter(function(p){return p.dias>0});
  var sumD=0,sumS=0;
  ps.forEach(function(p){p.anual=p.salario*p.dias;sumD+=p.dias;sumS+=p.anual});
  var mitad=total/2,repartido=0;
  ps.forEach(function(p){
    p.porDias=sumD?r2(mitad*p.dias/sumD):0;
    p.porSalario=sumS?r2(mitad*p.anual/sumS):0;
    p.calculada=r2(p.porDias+p.porSalario);
    p.tope=r2(Math.max(p.salario*90,p.prom));
    p.monto=Math.min(p.calculada,p.tope);
    p.topada=p.calculada>p.tope+0.005;
    p.exento=r2(Math.min(p.monto,15*T.uma));
    repartido+=p.monto;
  });
  /* Los centavos del redondeo van a quien más recibe (si nadie llegó a su tope) */
  var dif=r2(total-repartido);
  if(ps.length&&dif&&Math.abs(dif)<0.05*ps.length&&!ps.some(function(p){return p.topada})){
    var m=ps.reduce(function(a,b){return b.monto>a.monto?b:a});m.monto=r2(m.monto+dif);m.calculada=m.monto;repartido=total;
  }
  return {total:r2(total),personas:ps,repartido:r2(repartido),sobrante:r2(total-repartido)};
}

AT.nomina={T:T,PERIODOS:PERIODOS,diasVacaciones:diasVacaciones,antiguedad:antiguedad,integracion:integracion,
  isrTarifa:isrTarifa,subsidio:subsidio,imss:imss,recibo:recibo,vacaciones:vacaciones,aguinaldo:aguinaldo,
  finiquito:finiquito,ptu:ptu,r2:r2};
})();
