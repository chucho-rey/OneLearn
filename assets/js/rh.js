/* OneBook: calculadoras de recursos humanos (módulo rh; usan negocio.js y el motor nomina.js).
   Cinco bloques, cada uno con su formulario al editar y su hoja al leer e imprimir:
   - nomina: recibo de un periodo (semanal, catorcenal, quincenal o mensual): percepciones (sueldo, horas extra,
     descansos trabajados, prima dominical, otras), ISR con subsidio, IMSS, neto y, si quieres, lo que le cuesta al
     negocio (IMSS del patrón, INFONAVIT e impuesto estatal sobre nómina).
   - vacaciones: antigüedad, días que tocan (y la tabla de la ley), tomados, disponibles, pago y prima vacacional.
   - aguinaldo: completo o proporcional, exento, ISR y neto; fecha límite.
   - finiquito: renuncia, despido justificado o injustificado (liquidación): sueldo pendiente, aguinaldo y
     vacaciones proporcionales, prima vacacional, prima de antigüedad, tres meses y 20 días por año; ISR estimado.
   - ptu: reparto de utilidades entre tu equipo (mitad por días, mitad por salarios, con tope).
   El salario se escribe diario o mensual (mensual ÷ 30). Todo es estimado con las tablas de 2026 (nomina.js). */
(function(){
'use strict';
var AT=window.AT,N=AT.negocio,M=AT.nomina;if(!N||!M)return;
var esc=N.esc,campo=N.campo,num=N.num;
function c(p){return Math.round((p||0)*100)}
function $$(p){return N.dinero(c(p))}
function neg(p){return N.monto(-c(p))}
function sd(x){var v=num(x.salario);return x.tipoSalario==='mensual'?v/30:v}
function fecha(d){return d?N.fechaTexto(typeof d==='string'?d:N.iso(d)):''}
function plural(n,uno,varios){return n===1?uno:varios}
function diasTxt(n){var t=(Math.round(n*100)/100).toLocaleString('es-MX',{maximumFractionDigits:2});return t+' '+plural(n,'día','días')}
var TIPO_SAL=[['diario','Diario'],['mensual','Mensual']];
var ZONAS=[['general','General ($'+M.T.sm.general.toFixed(2)+' diarios)'],['frontera','Frontera norte ($'+M.T.sm.frontera.toFixed(2)+')']];
var NOTA='Cálculo estimado con las tablas de '+M.T.anio+' (ISR, subsidio, UMA $'+M.T.uma.toFixed(2)+' y salario mínimo). Tu contador timbra el recibo oficial.';
/* Salario y tipo, juntos */
function salarioHtml(x,et){
  return '<div class="nb-c rh-sal"><span aria-hidden="true">'+esc(et||'Salario')+'</span><div class="rh-sal-i">'+
    '<input type="text" inputmode="decimal" data-k="salario" value="'+esc(x.salario)+'" placeholder="$400" aria-label="'+esc(et||'Salario')+'">'+
    '<select data-k="tipoSalario" aria-label="¿Salario diario o mensual?">'+N.opciones(TIPO_SAL,x.tipoSalario)+'</select></div></div>';
}
function titulo(x,def){return (x.titulo||'').trim()||def}
function encabezado(x,def,sub){
  return '<h3 class="nb-t">'+esc(titulo(x,def))+(x.empleado?' <small>'+esc(x.empleado)+'</small>':'')+(sub?' <small>'+sub+'</small>':'')+'</h3>';
}
function tituloCampo(x,ph){
  return '<input type="text" class="ed-fig-tit pg-tit" data-k="titulo" value="'+esc(x.titulo)+'" placeholder="'+esc(ph)+'" aria-label="Título">';
}
function nota(t){return '<p class="rh-nota">'+esc(t||NOTA)+'</p>'}
function tabla(cap,filas,tot){
  return '<table class="nb-tab nb-desglose"><caption>'+esc(cap)+'</caption><tbody>'+filas.map(function(f){
    return '<tr><th scope="row">'+esc(f[0])+(f[2]?' <small class="rh-sm">'+esc(f[2])+'</small>':'')+'</th><td class="num">'+f[1]+'</td></tr>';
  }).join('')+(tot?'<tr class="nb-tot"><th scope="row">'+esc(tot[0])+'</th><td class="num">'+tot[1]+'</td></tr>':'')+'</tbody></table>';
}
function voz(dom,t){
  clearTimeout(voz.t);
  voz.t=setTimeout(function(){var v=dom.querySelector('.nb-voz');if(v)v.textContent=t()},700);
}

/* =================== Recibo de nómina =================== */
var DEF_NOM={titulo:'',empleado:'',salario:'',tipoSalario:'diario',periodo:'quincenal',ingreso:'',zona:'general',
  faltas:'',horasDobles:'',horasTriples:'',descansos:'',domingos:'',otras:'',
  mas:false,aguinaldo:'15',prima:'25',riesgo:'',isn:'',infonavit:'',costo:true};
var PERIODOS=Object.keys(M.PERIODOS).map(function(k){return [k,M.PERIODOS[k].nombre+' ('+M.PERIODOS[k].dias+' días)']});
function calcNom(x){
  return M.recibo({salario:sd(x),periodo:x.periodo,faltas:x.faltas,horasDobles:x.horasDobles,horasTriples:x.horasTriples,
    descansos:x.descansos,domingos:x.domingos,otras:x.otras,zona:x.zona,ingreso:x.ingreso,aguinaldo:x.aguinaldo,prima:x.prima,
    riesgo:x.riesgo,isn:x.isn,infonavit:x.infonavit});
}
function resNom(x){
  if(!(sd(x)>0))return '<p class="hint">Escribe el salario para ver el recibo.</p>';
  var r=calcNom(x);
  var h=N.resumen([
    ['Neto a pagar',$$(r.neto),'nb-acento'],
    ['Percepciones',$$(r.total)],
    ['Deducciones',r.totalDeducciones?neg(r.totalDeducciones):$$(0)],
    x.costo?['Le cuesta al negocio',$$(r.costo.total)]:['Salario diario integrado',$$(r.sdi)]
  ]);
  h+='<div class="nb-cols">'+
    tabla('Percepciones',r.percepciones.map(function(p){return [p[0],$$(p[1])]}),['Total',$$(r.total)])+
    tabla('Deducciones',[
      ['ISR',neg(r.isr),r.minimo?'salario mínimo: sin ISR del sueldo':r.subsidio?'tarifa '+$$(r.isrTarifa).replace('$','$')+' − subsidio '+$$(r.subsidio):''],
      ['IMSS (cuota del trabajador)',r.imss?neg(r.imss):$$(0),r.minimo?'con salario mínimo la paga el patrón':''],
    ].concat(num(x.infonavit)?[['Crédito INFONAVIT',neg(num(x.infonavit))]]:[]),['Total',r.totalDeducciones?neg(r.totalDeducciones):$$(0)])+
  '</div>';
  if(x.costo)h+=tabla('Lo que le cuesta al negocio',[
    ['Percepciones',$$(r.total)],
    ['IMSS (cuotas del patrón)',$$(r.costo.imss),'cesantía y vejez '+String(r.costo.tasaCesantia).replace('.',',')+' %'],
    ['INFONAVIT (5 %)',$$(r.costo.infonavit)],
    num(x.isn)?['Impuesto estatal sobre nómina ('+num(x.isn)+' %)',$$(r.costo.isn)]:null
  ].filter(Boolean),['Costo total del periodo',$$(r.costo.total)]);
  h+='<p class="nb-conteo">Salario diario '+$$(r.salario)+' · integrado '+$$(r.sdi)+' (factor '+String(r.factor).replace('.',',')+')'+
    (r.antiguedad.valido?' · '+r.antiguedad.anios+' '+plural(r.antiguedad.anios,'año','años')+' de antigüedad':'')+
    ' · exento '+$$(r.exento)+', gravado '+$$(r.gravado)+'</p>';
  if(sd(x)<r.sm-0.005)h+='<p class="nb-p"><span class="nb-d neg">El salario es menor al mínimo de '+esc(N.dinero(c(r.sm)))+' diarios: la ley no lo permite.</span></p>';
  return h+nota();
}
function edNom(x,uid){
  return tituloCampo(x,'Recibo de nómina (ej. 1.ª quincena de diciembre)')+
    '<div class="nb-form">'+campo('Trabajador','empleado',x.empleado,{ph:'Nombre'})+salarioHtml(x,'Salario')+
    '<label class="nb-c"><span>Periodo de pago</span><select data-k="periodo">'+N.opciones(PERIODOS,x.periodo)+'</select></label>'+
    campo('Fecha de ingreso (para la antigüedad)','ingreso',x.ingreso,{tipo:'date'})+
    '<label class="nb-c"><span>Zona del salario mínimo</span><select data-k="zona">'+N.opciones(ZONAS,x.zona)+'</select></label></div>'+
    '<fieldset class="nb-sec"><legend>En este periodo</legend><div class="nb-form rh-form3">'+
    campo('Faltas (días)','faltas',x.faltas,{modo:'numeric',ph:'0'})+
    campo('Horas extra dobles','horasDobles',x.horasDobles,{modo:'decimal',ph:'0'})+
    campo('Horas extra triples','horasTriples',x.horasTriples,{modo:'decimal',ph:'0'})+
    campo('Descansos o festivos trabajados','descansos',x.descansos,{modo:'numeric',ph:'0'})+
    campo('Domingos trabajados','domingos',x.domingos,{modo:'numeric',ph:'0'})+
    campo('Otras percepciones (bonos)','otras',x.otras,{modo:'decimal',ph:'$0'})+
    '</div></fieldset>'+
    '<label class="nb-op rh-chk"><input type="checkbox" data-k="costo"'+(x.costo?' checked':'')+'>Ver lo que le cuesta al negocio</label>'+
    '<label class="nb-op rh-chk"><input type="checkbox" data-k="mas"'+(x.mas?' checked':'')+'>Prestaciones, riesgo de trabajo e impuesto estatal</label>'+
    (x.mas?'<div class="nb-form rh-form3">'+campo('Días de aguinaldo','aguinaldo',x.aguinaldo,{modo:'numeric',ph:'15'})+
      campo('Prima vacacional (%)','prima',x.prima,{modo:'decimal',ph:'25'})+
      campo('Prima de riesgo de trabajo (%)','riesgo',x.riesgo,{modo:'decimal',ph:String(M.T.imss.riesgo)})+
      campo('Impuesto estatal sobre nómina (%)','isn',x.isn,{modo:'decimal',ph:'Ej. 3'})+
      campo('Descuento de crédito INFONAVIT','infonavit',x.infonavit,{modo:'decimal',ph:'$0'})+'</div>':'')+
    '<div class="nb-res"></div><p class="vh nb-voz" aria-live="polite"></p>';
}
N.bloque('nomina',{
  etiqueta:'Recibo de nómina',def:DEF_NOM,modulo:'rh',
  editar:edNom,resultado:resNom,
  refrescar:function(x,dom){voz(dom,function(){if(!(sd(x)>0))return '';var r=calcNom(x);return 'Neto a pagar '+$$(r.neto)+'.'})},
  leer:function(x){
    var r=calcNom(x);
    return encabezado(x,'Recibo de nómina',esc(M.PERIODOS[r.periodo].nombre))+resNom(x);
  },
  texto:function(x){var r=calcNom(x);return titulo(x,'Recibo de nómina')+(x.empleado?' de '+x.empleado:'')+'. Percepciones '+$$(r.total)+', deducciones '+$$(r.totalDeducciones)+', neto '+$$(r.neto)+'.'},
  md:function(x){
    var r=calcNom(x);
    return '**'+titulo(x,'Recibo de nómina')+'**'+(x.empleado?' · '+x.empleado:'')+'\n\n'+
      r.percepciones.map(function(p){return '- '+p[0]+': '+$$(p[1])}).join('\n')+
      '\n- ISR: −'+$$(r.isr)+'\n- IMSS: −'+$$(r.imss)+'\n- **Neto: '+$$(r.neto)+'**';
  },
  foco:'[data-k="empleado"]',
  insertar:{t:'Recibo de nómina',d:'Sueldo, horas extra, ISR, IMSS y neto del periodo',i:'recibo',
    p:'nomina nómina recibo sueldo salario isr imss subsidio neto quincena semana horas extra pago empleado trabajador costo patron'}
});

/* =================== Vacaciones =================== */
var DEF_VAC={titulo:'',empleado:'',ingreso:'',al:'',salario:'',tipoSalario:'diario',prima:'25',tomados:'',pendientes:'',tabla:false};
function calcVac(x){return M.vacaciones({ingreso:x.ingreso,al:x.al||N.hoy(),salario:sd(x),prima:x.prima,tomados:x.tomados,pendientes:x.pendientes})}
function resVac(x){
  if(!N.fechaDe(x.ingreso))return '<p class="hint">Escribe la fecha de ingreso para ver sus vacaciones.</p>';
  var r=calcVac(x),a=r.antiguedad;
  if(!a.valido)return '<p class="nb-p"><span class="nb-d neg">La fecha de ingreso es posterior a la del cálculo.</span></p>';
  var h=N.resumen([
    ['Días disponibles',String(r.disponibles),'nb-acento'],
    ['Le tocan este año',diasTxt(r.tocan)],
    ['Antigüedad',a.anios+' '+plural(a.anios,'año','años')],
    sd(x)>0?['Prima vacacional',$$(r.prima)]:['Próximo aniversario',esc(fecha(a.proximo))]
  ]);
  h+='<p class="nb-p">'+(a.anios<1?'Todavía no cumple su primer año: el '+esc(fecha(a.proximo))+' tendrá '+diasTxt(r.siguientes)+' de vacaciones.':
    'Por su '+(a.anios)+'.º año cumplido le tocan '+diasTxt(r.tocan)+'. El '+esc(fecha(a.proximo))+' cumple '+(a.anios+1)+' y tendrá '+diasTxt(r.siguientes)+'.')+
    ' Lleva '+diasTxt(r.proporcionales)+' ganados del año en curso.</p>';
  var filas=[['Le tocan (año cumplido)',diasTxt(r.tocan)]];
  if(r.pendientes)filas.push(['De años anteriores',diasTxt(r.pendientes)]);
  if(r.tomados)filas.push(['Ya tomados','−'+diasTxt(r.tomados)]);
  h+=tabla('Días',filas,['Disponibles',diasTxt(r.disponibles)]);
  if(sd(x)>0)h+=tabla('Pago de las vacaciones disponibles',[['Salario de '+diasTxt(r.disponibles),$$(r.pago)],['Prima vacacional ('+r.primaPct+' %)',$$(r.prima),'exenta de ISR hasta '+$$(15*M.T.uma)]],['Total',$$(r.pago+r.prima)]);
  if(x.tabla)h+='<table class="nb-tab rh-ley"><caption>Días de vacaciones por año (Ley Federal del Trabajo, art. 76)</caption><thead><tr><th scope="col">Años cumplidos</th><th scope="col" class="num">Días</th></tr></thead><tbody>'+
    r.tabla.map(function(t){return '<tr'+(a.anios>=t[0]&&(t[1]==null||a.anios<=t[1])?' class="rh-aqui"':'')+'><td>'+t[0]+(t[1]==null?' o más':t[1]>t[0]?' a '+t[1]:'')+'</td><td class="num">'+t[2]+'</td></tr>'}).join('')+'</tbody></table>';
  return h+nota('La prima vacacional es de al menos 25 % del salario de los días de vacaciones (art. 80). Las vacaciones se dan dentro de los seis meses siguientes al aniversario.');
}
function edVac(x){
  return tituloCampo(x,'Vacaciones (ej. de Laura)')+
    '<div class="nb-form">'+campo('Trabajador','empleado',x.empleado,{ph:'Nombre'})+campo('Fecha de ingreso','ingreso',x.ingreso,{tipo:'date'})+
    campo('Calcular al (si no, hoy)','al',x.al,{tipo:'date'})+salarioHtml(x,'Salario (para el pago)')+
    campo('Días ya tomados de este año','tomados',x.tomados,{modo:'decimal',ph:'0'})+
    campo('Días de años anteriores sin tomar','pendientes',x.pendientes,{modo:'decimal',ph:'0'})+
    campo('Prima vacacional (%)','prima',x.prima,{modo:'decimal',ph:'25'})+'</div>'+
    '<label class="nb-op rh-chk"><input type="checkbox" data-k="tabla"'+(x.tabla?' checked':'')+'>Mostrar la tabla de la ley</label>'+
    '<div class="nb-res"></div><p class="vh nb-voz" aria-live="polite"></p>';
}
N.bloque('vacaciones',{
  etiqueta:'Vacaciones',def:DEF_VAC,modulo:'rh',editar:edVac,resultado:resVac,
  refrescar:function(x,dom){voz(dom,function(){if(!N.fechaDe(x.ingreso))return '';var r=calcVac(x);return diasTxt(r.disponibles)+' disponibles.'})},
  leer:function(x){return encabezado(x,'Vacaciones')+resVac(x)},
  texto:function(x){if(!N.fechaDe(x.ingreso))return titulo(x,'Vacaciones')+'.';var r=calcVac(x);return titulo(x,'Vacaciones')+(x.empleado?' de '+x.empleado:'')+': le tocan '+diasTxt(r.tocan)+', disponibles '+diasTxt(r.disponibles)+'.'},
  md:function(x){if(!N.fechaDe(x.ingreso))return '**'+titulo(x,'Vacaciones')+'**';var r=calcVac(x);return '**'+titulo(x,'Vacaciones')+'**'+(x.empleado?' · '+x.empleado:'')+'\n\n- Antigüedad: '+r.antiguedad.anios+' años\n- Le tocan: '+diasTxt(r.tocan)+'\n- Disponibles: '+diasTxt(r.disponibles)+(sd(x)>0?'\n- Prima vacacional: '+$$(r.prima):'')},
  foco:'[data-k="empleado"]',
  insertar:{t:'Vacaciones',d:'Días que le tocan, disponibles y prima vacacional',i:'sol',
    p:'vacaciones dias descanso prima vacacional antiguedad aniversario ley federal del trabajo empleado vacaciones dignas'}
});

/* =================== Aguinaldo =================== */
var DEF_AG={titulo:'',empleado:'',salario:'',tipoSalario:'diario',ingreso:'',al:'',dias:'15',faltas:''};
function calcAg(x){return M.aguinaldo({salario:sd(x),ingreso:x.ingreso,al:x.al,dias:x.dias,faltas:x.faltas,mensual:x.tipoSalario==='mensual'?num(x.salario):0})}
function resAg(x){
  if(!(sd(x)>0))return '<p class="hint">Escribe el salario para calcular el aguinaldo.</p>';
  var r=calcAg(x);
  var h=N.resumen([
    ['Aguinaldo neto',$$(r.neto),'nb-acento'],
    ['Aguinaldo',$$(r.monto)],
    ['ISR',r.isr?neg(r.isr):$$(0)],
    ['Páguese antes del',esc(fecha(r.limite))]
  ]);
  h+='<p class="nb-p">'+(r.completo?r.dias+' días de salario por el año completo.':r.dias+' días × '+r.trabajados+' de 365 días trabajados en '+r.anio+' (desde el '+esc(fecha(r.desde))+').')+'</p>';
  h+=tabla('Desglose',[['Aguinaldo',$$(r.monto)],['Exento (hasta 30 UMA)',$$(r.exento)],['Gravado',$$(r.gravado)],['ISR estimado',r.isr?neg(r.isr):$$(0),'sobre el sueldo del mes']],['Neto',$$(r.neto)]);
  return h+nota('La ley pide al menos 15 días de salario, pagados antes del 20 de diciembre (art. 87); si no trabajó el año completo, la parte proporcional. El ISR se estima con la tarifa mensual de '+M.T.anio+' sumando lo gravado al sueldo del mes.');
}
function edAg(x){
  return tituloCampo(x,'Aguinaldo '+M.T.anio)+
    '<div class="nb-form">'+campo('Trabajador','empleado',x.empleado,{ph:'Nombre'})+salarioHtml(x,'Salario')+
    campo('Fecha de ingreso (si entró este año)','ingreso',x.ingreso,{tipo:'date'})+
    campo('Contar hasta (si no, 31 de diciembre)','al',x.al,{tipo:'date'})+
    campo('Días de aguinaldo','dias',x.dias,{modo:'numeric',ph:'15'})+
    campo('Faltas que no cuentan','faltas',x.faltas,{modo:'numeric',ph:'0'})+'</div>'+
    '<div class="nb-res"></div><p class="vh nb-voz" aria-live="polite"></p>';
}
N.bloque('aguinaldo',{
  etiqueta:'Aguinaldo',def:DEF_AG,modulo:'rh',editar:edAg,resultado:resAg,
  refrescar:function(x,dom){voz(dom,function(){if(!(sd(x)>0))return '';var r=calcAg(x);return 'Aguinaldo '+$$(r.monto)+', neto '+$$(r.neto)+'.'})},
  leer:function(x){return encabezado(x,'Aguinaldo')+resAg(x)},
  texto:function(x){var r=calcAg(x);return titulo(x,'Aguinaldo')+(x.empleado?' de '+x.empleado:'')+': '+$$(r.monto)+', neto '+$$(r.neto)+'.'},
  md:function(x){var r=calcAg(x);return '**'+titulo(x,'Aguinaldo')+'**'+(x.empleado?' · '+x.empleado:'')+'\n\n- Aguinaldo: '+$$(r.monto)+'\n- Exento: '+$$(r.exento)+'\n- ISR: −'+$$(r.isr)+'\n- **Neto: '+$$(r.neto)+'**'},
  foco:'[data-k="empleado"]',
  insertar:{t:'Aguinaldo',d:'Completo o proporcional, con ISR y fecha límite',i:'regalo',
    p:'aguinaldo diciembre navidad proporcional isr exento 15 dias prestacion empleado'}
});

/* =================== Finiquito y liquidación =================== */
var MOTIVOS=[['renuncia','Renuncia voluntaria'],['justificado','Despido justificado'],['injustificado','Despido injustificado (liquidación)']];
var DEF_FIN={titulo:'',empleado:'',salario:'',tipoSalario:'diario',ingreso:'',salida:'',motivo:'renuncia',zona:'general',
  pendientes:'',vacPendientes:'',vacTomadas:'',aguinaldo:'15',aguinaldoPagado:false,prima:'25',veinte:false};
function calcFin(x){
  return M.finiquito({salario:sd(x),ingreso:x.ingreso,salida:x.salida,motivo:x.motivo,zona:x.zona,pendientes:x.pendientes,
    vacPendientes:x.vacPendientes,vacTomadas:x.vacTomadas,aguinaldo:x.aguinaldo,aguinaldoPagado:x.aguinaldoPagado,prima:x.prima,veinte:x.veinte});
}
function resFin(x){
  if(!(sd(x)>0)||!N.fechaDe(x.ingreso)||!N.fechaDe(x.salida))return '<p class="hint">Escribe el salario, la fecha de ingreso y la de salida.</p>';
  var r=calcFin(x),a=r.antiguedad;
  if(!a.valido)return '<p class="nb-p"><span class="nb-d neg">La fecha de salida es anterior a la de ingreso.</span></p>';
  var liq=x.motivo==='injustificado';
  var h=N.resumen([
    [liq?'Liquidación neta':'Finiquito neto',$$(r.neto),'nb-acento'],
    ['Total bruto',$$(r.total)],
    ['ISR estimado',r.isr?neg(r.isr):$$(0)],
    ['Antigüedad',a.anios+' '+plural(a.anios,'año','años')+(a.dias?', '+a.dias+' '+plural(a.dias,'día','días'):'')]
  ]);
  h+=tabla('Finiquito (le corresponde siempre)',r.lineas.map(function(l){return [l[0],$$(l[1])]}),['Subtotal',$$(r.ordinario)]);
  if(r.separacion.length)h+=tabla(liq?'Indemnización por despido':'Por separación',r.separacion.map(function(l){return [l[0],$$(l[1])]}),['Subtotal',$$(r.indemnizacion)]);
  h+=tabla('Total',[['Total bruto',$$(r.total)],['Exento de ISR',$$(r.exento)],['ISR estimado',r.isr?neg(r.isr):$$(0)]],['Neto a pagar',$$(r.neto)]);
  var txt={renuncia:'Con renuncia se paga el finiquito; la prima de antigüedad, solo con 15 años o más.',
    justificado:'Con despido justificado se paga el finiquito y la prima de antigüedad (12 días por año con salario topado a dos mínimos).',
    injustificado:'Con despido injustificado se suma la indemnización: tres meses de salario integrado ('+$$(r.sdi)+' diarios) y la prima de antigüedad. Los 20 días por año aplican si el patrón no quiere reinstalarlo o si el trabajador termina la relación por culpa del patrón.'}[r.motivo]||'';
  return h+nota(txt+' Lo de separación está exento de ISR hasta 90 UMA por año; el resto se estima con la tasa del último sueldo.');
}
function edFin(x){
  return tituloCampo(x,'Finiquito (ej. de Pedro)')+
    '<div class="nb-form">'+campo('Trabajador','empleado',x.empleado,{ph:'Nombre'})+salarioHtml(x,'Salario')+
    campo('Fecha de ingreso','ingreso',x.ingreso,{tipo:'date'})+campo('Fecha de salida','salida',x.salida,{tipo:'date'})+
    '<label class="nb-c nb-ancho"><span>Motivo</span><select data-k="motivo">'+N.opciones(MOTIVOS,x.motivo)+'</select></label>'+
    campo('Días de sueldo sin pagar','pendientes',x.pendientes,{modo:'numeric',ph:'0'})+
    campo('Días de vacaciones de años anteriores sin tomar','vacPendientes',x.vacPendientes,{modo:'decimal',ph:'0'})+
    campo('Días de vacaciones tomados desde su último aniversario','vacTomadas',x.vacTomadas,{modo:'decimal',ph:'0'})+
    campo('Días de aguinaldo','aguinaldo',x.aguinaldo,{modo:'numeric',ph:'15'})+
    campo('Prima vacacional (%)','prima',x.prima,{modo:'decimal',ph:'25'})+
    '<label class="nb-c"><span>Zona del salario mínimo</span><select data-k="zona">'+N.opciones(ZONAS,x.zona)+'</select></label></div>'+
    '<label class="nb-op rh-chk"><input type="checkbox" data-k="aguinaldoPagado"'+(x.aguinaldoPagado?' checked':'')+'>Ya se le pagó el aguinaldo de este año</label>'+
    (x.motivo==='injustificado'?'<label class="nb-op rh-chk"><input type="checkbox" data-k="veinte"'+(x.veinte?' checked':'')+'>Incluir 20 días por año de servicio</label>':'')+
    '<div class="nb-res"></div><p class="vh nb-voz" aria-live="polite"></p>';
}
N.bloque('finiquito',{
  etiqueta:'Finiquito o liquidación',def:DEF_FIN,modulo:'rh',editar:edFin,resultado:resFin,
  refrescar:function(x,dom){voz(dom,function(){if(!(sd(x)>0)||!N.fechaDe(x.ingreso)||!N.fechaDe(x.salida))return '';var r=calcFin(x);return 'Neto a pagar '+$$(r.neto)+'.'})},
  leer:function(x){return encabezado(x,x.motivo==='injustificado'?'Liquidación':'Finiquito',esc((MOTIVOS.filter(function(m){return m[0]===x.motivo})[0]||MOTIVOS[0])[1]))+resFin(x)},
  texto:function(x){if(!(sd(x)>0)||!N.fechaDe(x.ingreso)||!N.fechaDe(x.salida))return titulo(x,'Finiquito')+'.';var r=calcFin(x);return titulo(x,'Finiquito')+(x.empleado?' de '+x.empleado:'')+': total '+$$(r.total)+', neto '+$$(r.neto)+'.'},
  md:function(x){
    if(!(sd(x)>0)||!N.fechaDe(x.ingreso)||!N.fechaDe(x.salida))return '**'+titulo(x,'Finiquito')+'**';
    var r=calcFin(x);
    return '**'+titulo(x,'Finiquito')+'**'+(x.empleado?' · '+x.empleado:'')+'\n\n'+r.lineas.concat(r.separacion).map(function(l){return '- '+l[0]+': '+$$(l[1])}).join('\n')+
      '\n- ISR estimado: −'+$$(r.isr)+'\n- **Neto: '+$$(r.neto)+'**';
  },
  foco:'[data-k="empleado"]',
  insertar:{t:'Finiquito o liquidación',d:'Renuncia o despido: lo que le corresponde',i:'salida',
    p:'finiquito liquidacion renuncia despido indemnizacion tres meses 20 dias prima de antiguedad baja separacion empleado'}
});

/* =================== PTU =================== */
var DEF_PTU={titulo:'',utilidad:'',monto:'',personas:[]};
function filaPtu(){return {nombre:'',dias:'365',salario:'',tope:''}}
function montoPtu(x){return num(x.monto)>0?num(x.monto):num(x.utilidad)*0.10}
function calcPtu(x){return M.ptu({monto:montoPtu(x),personas:x.personas})}
function resPtu(x){
  var total=montoPtu(x);
  if(!(total>0))return '<p class="hint">Escribe la utilidad fiscal del año (o el monto a repartir).</p>';
  var r=calcPtu(x);
  if(!r.personas.length)return '<p class="hint">Agrega a tu equipo con sus días trabajados y su salario diario.</p>';
  var h=N.resumen([['A repartir',$$(r.total),'nb-acento'],['Repartido',$$(r.repartido)],['Personas',String(r.personas.length)],
    r.sobrante>0.004?['No se reparte por el tope',$$(r.sobrante),'nb-ojo']:['Exento por persona','hasta '+$$(15*M.T.uma)]]);
  h+='<div class="nb-scroll"><table class="nb-tab rh-ptu"><thead><tr><th scope="col">Persona</th><th scope="col" class="num">Días</th><th scope="col" class="num">Por días</th><th scope="col" class="num">Por salario</th><th scope="col" class="num">Le toca</th></tr></thead><tbody>'+
    r.personas.map(function(p){return '<tr><td>'+esc(p.nombre||'Sin nombre')+(p.topada?' <small class="rh-sm">con tope de '+$$(p.tope)+'</small>':'')+'</td><td class="num">'+p.dias+'</td><td class="num">'+$$(p.porDias)+'</td><td class="num">'+$$(p.porSalario)+'</td><td class="num"><b>'+$$(p.monto)+'</b></td></tr>'}).join('')+
    '<tr class="nb-tot"><th scope="row" colspan="4">Total</th><td class="num">'+$$(r.repartido)+'</td></tr></tbody></table></div>';
  return h+nota('Se reparte el 10 % de la utilidad fiscal: la mitad según los días trabajados y la mitad según los salarios del año. Cada persona recibe como máximo tres meses de su salario o el promedio de lo que recibió en los últimos tres años, lo que le convenga más. Las empresas pagan a más tardar el 30 de mayo.');
}
function edPtu(x){
  return tituloCampo(x,'Reparto de utilidades (PTU) '+M.T.anio)+
    '<div class="nb-form">'+campo('Utilidad fiscal del año','utilidad',x.utilidad,{modo:'decimal',ph:'$500,000'})+
    campo('O el monto a repartir (si ya lo sabes)','monto',x.monto,{modo:'decimal',ph:'10 % de la utilidad'})+'</div>'+
    '<div class="rh-ptu-h" aria-hidden="true"><span>Nombre</span><span>Días trabajados</span><span>Salario diario</span><span>Promedio de PTU de 3 años (opcional)</span><span></span></div>'+
    '<div class="nb-filas">'+x.personas.map(function(p,i){
      var n='personas.'+i+'.',q=p.nombre||'persona '+(i+1);
      /* Cada campo lleva su etiqueta: en una pantalla angosta se ve (no hay encabezado de columnas) */
      function c(k,t,ph,modo,larga){
        return '<label class="rh-pl rh-pl-'+k+'"><span class="rh-pl-t">'+esc(t)+'</span><input type="text"'+(modo?' inputmode="'+modo+'" class="nb-num"':'')+
          ' data-k="'+n+k+'" value="'+esc(p[k])+'" placeholder="'+esc(ph)+'" aria-label="'+esc(larga)+'"></label>';
      }
      return '<div class="nb-fila rh-ptu-f" data-grupo>'+
        c('nombre','Nombre','Nombre','','Nombre de la persona '+(i+1))+
        c('dias','Días trabajados','365','numeric','Días trabajados de '+q)+
        c('salario','Salario diario','$400','decimal','Salario diario de '+q)+
        c('tope','Promedio de PTU de 3 años','$0','decimal','Promedio de PTU de 3 años de '+q)+
        N.quitar('personas',i,q)+'</div>';
    }).join('')+'</div>'+
    '<button type="button" class="btn nb-mas" data-acc="agregar" data-lista="personas" data-foco="nombre">+ Agregar persona</button>'+
    (AT.equipo?'<button type="button" class="btn nb-mas" data-acc="traerEquipo">Traer a tu equipo</button><button type="button" hidden data-acc="rhListo" tabindex="-1"></button>':'')+
    '<div class="nb-res"></div>';
}
N.bloque('ptu',{
  etiqueta:'Reparto de utilidades (PTU)',def:DEF_PTU,modulo:'rh',filas:{personas:filaPtu},editar:edPtu,resultado:resPtu,
  acciones:{
    /* Trae a tu equipo (equipo.js): nombre, días trabajados en el año pasado y salario diario; al llegar, repinta */
    traerEquipo:function(x,datos,b,raiz){
      if(!AT.equipo)return false;
      AT.equipo.personas(M.T.anio-1).then(function(l){
        l.forEach(function(p){if(!x.personas.some(function(q){return q.nombre===p.nombre}))x.personas.push({nombre:p.nombre,dias:String(p.dias),salario:String(p.salario),tope:''})});
        var k=raiz.querySelector('[data-acc="rhListo"]');if(k)k.click();
      });
      return false;
    },
    rhListo:function(){return {sel:'[data-acc="traerEquipo"]'}}
  },
  leer:function(x){return encabezado(x,'Reparto de utilidades (PTU)')+resPtu(x)},
  texto:function(x){var r=calcPtu(x);return titulo(x,'Reparto de utilidades')+': '+$$(r.total)+' entre '+r.personas.length+' personas. '+r.personas.map(function(p){return p.nombre+' '+$$(p.monto)}).join(', ')+'.'},
  md:function(x){var r=calcPtu(x);return '**'+titulo(x,'Reparto de utilidades (PTU)')+'**\n\n| Persona | Días | Le toca |\n|---|---:|---:|\n'+r.personas.map(function(p){return '| '+(p.nombre||'Sin nombre')+' | '+p.dias+' | '+$$(p.monto)+' |'}).join('\n')},
  foco:'[data-k="utilidad"]',
  insertar:{t:'Reparto de utilidades (PTU)',d:'El 10 % de la utilidad entre tu equipo',i:'reparto',
    p:'ptu reparto de utilidades utilidad fiscal 10 por ciento mayo empleados'}
});

AT.rh={nomina:calcNom,vacaciones:calcVac,aguinaldo:calcAg,finiquito:calcFin,ptu:calcPtu};
})();
