/* Recursos humanos (RH1): el motor de nómina con las tablas de 2026 (ISR, subsidio, IMSS, salario mínimo,
   vacaciones, aguinaldo, finiquito, liquidación y PTU) y sus cinco calculadoras (recibo de nómina, vacaciones,
   aguinaldo, finiquito y PTU): en «/» solo con el módulo, al escribir, al leer, al imprimir; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const CAP=process.env.CAPTURAS||'';
function mismo(r,a,b,msg){return r.cumple(JSON.stringify(a)===JSON.stringify(b),msg,{obtenido:a,esperado:b})}
const RH={perfil:'negocio',modulos:['negocio','rh'],nombre:'Ana',negocio:{nombre:'Cocina Ana',giro:'comida',telefono:''},creado:'2026-01-01'};
const SIN_RH={perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Cocina Ana',giro:'comida',telefono:''},creado:'2026-01-01'};

prueba('Recursos humanos: calculadoras de nómina',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:RH});
  await p.goto(base+'inicio.html');await listo(p,500);

  /* ---------- El motor ---------- */
  const m=await p.evaluate(function(){
    var M=AT.nomina,o={};
    o.isr10000=M.isrTarifa(10000,30,true);o.sub10000=M.subsidio(10000,30,true);
    o.isr5000q=M.isrTarifa(5000,15,false);o.sub5000q=M.subsidio(5000,15,false);
    o.sub12000=M.subsidio(12000,30,true);
    o.isrAlto=M.isrTarifa(500000,30,true);
    o.vac=[0,1,2,3,4,5,6,10,11,15,16,21,26,31].map(M.diasVacaciones).join(',');
    var r=M.recibo({salario:400,periodo:'quincenal',ingreso:'2023-03-01',al:'2026-11-25',horasDobles:6});
    o.rec=[r.total,r.exento,r.gravado,r.isr,r.imss,r.neto,r.sdi,r.factor];
    var sm=M.recibo({salario:315.04,periodo:'semanal'});
    o.sm=[sm.minimo,sm.isr,sm.imss,sm.neto,sm.costo.imss>0];
    var f=M.recibo({salario:400,periodo:'quincenal',faltas:2});o.faltas=[f.pagados,f.percepciones[0][1]];
    var a=M.aguinaldo({salario:500,ingreso:'2026-07-01',al:'2026-12-31'});o.ag=[a.trabajados,a.monto,a.exento,a.gravado];
    var a2=M.aguinaldo({salario:1000,ingreso:'2019-01-01',al:'2026-12-31'});o.ag2=[a2.completo,a2.monto,a2.isr,a2.neto];
    var v=M.vacaciones({ingreso:'2020-06-15',al:'2026-11-25',salario:500,tomados:4});o.vacR=[v.antiguedad.anios,v.tocan,v.disponibles,v.pago,v.prima];
    var fr=M.finiquito({ingreso:'2021-02-10',salida:'2026-11-25',salario:500,motivo:'renuncia',pendientes:5});
    var fi=M.finiquito({ingreso:'2021-02-10',salida:'2026-11-25',salario:500,motivo:'injustificado',pendientes:5,veinte:true});
    o.fin=[fr.separacion.length,fr.ordinario,fi.separacion.map(function(x){return x[2]}).join(','),fi.indemnizacion,fi.total>fr.total,fi.isr>0];
    var fj=M.finiquito({ingreso:'2005-01-01',salida:'2026-11-25',salario:2000,motivo:'justificado'});
    o.tope=[fj.separacion[0][1],Math.round(12*2*315.04*fj.antiguedad.exacto*100)/100];
    var pt=M.ptu({monto:100000,personas:[{nombre:'A',dias:365,salario:300},{nombre:'B',dias:200,salario:600},{nombre:'C',dias:365,salario:2000}]});
    o.ptu=[pt.repartido,pt.sobrante,pt.personas.map(function(x){return x.monto}).join('|')];
    var pt2=M.ptu({monto:1000000,personas:[{nombre:'A',dias:365,salario:300}]});
    o.ptuTope=[pt2.personas[0].topada,pt2.personas[0].monto,pt2.sobrante];
    return o;
  });
  r.igual(m.isr10000,729.02,'ISR mensual de $10,000 con la tarifa 2026');
  r.igual(m.sub10000,535.65,'subsidio para el empleo 2026: 15.02 % de la UMA mensual');
  r.igual(m.isr5000q,366.87,'ISR de una quincena de $5,000 (tarifa entre 30.4 por 15 días)');
  r.igual(m.sub5000q,264.3,'subsidio de la quincena');
  r.igual(m.sub12000,0,'arriba de $11,492.66 al mes no hay subsidio');
  r.igual(m.isrAlto,133488.54+(500000-425642)*0.35,'el último renglón de la tarifa (35 %)');
  r.igual(m.vac,'0,12,14,16,18,20,22,22,24,24,26,28,30,32','vacaciones dignas: 12, 14, 16, 18, 20 y luego +2 cada cinco años');
  mismo(r,m.rec,[6600,300,6300,512.6,154.28,5933.12,421.37,1.0534],'recibo quincenal con horas extra: exento, gravado, ISR, IMSS, neto y salario integrado');
  mismo(r,m.sm,[true,0,0,2205.28,true],'con salario mínimo no se retiene ISR ni IMSS (el patrón paga la cuota)');
  mismo(r,m.faltas,[13,5200],'las faltas se descuentan del sueldo');
  mismo(r,m.ag,[184,3780.82,3519.3,261.52],'aguinaldo proporcional: 184 días, exento hasta 30 UMA');
  mismo(r,m.ag2,[true,15000,2593.07,12406.93],'aguinaldo completo con ISR');
  mismo(r,m.vacR,[6,22,18,9000,2250],'vacaciones: 6 años, 22 días, 4 tomados, pago y prima');
  r.cumple(m.fin[0]===0&&m.fin[2]==='antiguedad,tres,veinte'&&m.fin[4]&&m.fin[5],'renuncia sin prima de antigüedad; despido injustificado con prima, tres meses y 20 días',m.fin);
  r.igual(m.tope[0],m.tope[1],'la prima de antigüedad topa el salario al doble del mínimo');
  r.igual(m.ptu[0],100000,'la PTU reparte todo (los centavos del redondeo no se pierden)');
  r.cumple(m.ptuTope[0]&&m.ptuTope[1]===27000&&m.ptuTope[2]===973000,'la PTU respeta el tope de tres meses de salario',m.ptuTope);

  /* ---------- Las calculadoras en una página ---------- */
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(t){AT.crear.nuevo(t)},'calculadoras')]);
  await listo(p,700);
  r.igual(await p.evaluate(function(){return AT.docActual.contenido.content.filter(function(b){return ['nomina','vacaciones','aguinaldo','finiquito'].indexOf(b.type)>=0}).length}),4,'la plantilla «Calculadoras de nómina» trae los cuatro bloques');
  /* Recibo de nómina */
  const nom='.nb-ed.nb-nomina';
  await p.fill(nom+' [data-k="empleado"]','Laura');
  await p.fill(nom+' [data-k="salario"]','400');
  await p.fill(nom+' [data-k="horasDobles"]','6');
  await p.fill(nom+' [data-k="ingreso"]','2023-03-01');
  await p.waitForTimeout(300);
  const neto=await p.textContent(nom+' .nb-k .nb-acento dd');
  r.cumple(/\$5,9\d\d\.\d\d/.test(neto),'el recibo dice el neto a pagar mientras escribes',neto);
  r.cumple(/Le cuesta al negocio/.test(await p.textContent(nom+' .nb-res')),'y lo que le cuesta al negocio');
  await p.selectOption(nom+' [data-k="tipoSalario"]','mensual');await p.waitForTimeout(250);
  await p.fill(nom+' [data-k="salario"]','12000');await p.waitForTimeout(300);
  r.cumple(/Salario diario \$400\.00/.test(await p.textContent(nom+' .nb-res')),'un salario mensual se divide entre 30');
  await p.check(nom+' [data-k="mas"]');await p.waitForTimeout(250);
  r.cumple(await p.isVisible(nom+' [data-k="isn"]'),'«Prestaciones, riesgo de trabajo e impuesto estatal» abre más campos');
  await p.fill(nom+' [data-k="isn"]','3');await p.waitForTimeout(300);
  r.cumple(/Impuesto estatal sobre nómina \(3 %\)/.test(await p.textContent(nom+' .nb-res')),'el impuesto estatal sobre nómina entra al costo');
  await p.fill(nom+' [data-k="salario"]','200');await p.selectOption(nom+' [data-k="tipoSalario"]','diario');await p.waitForTimeout(300);
  r.cumple(/menor al mínimo/.test(await p.textContent(nom+' .nb-res')),'avisa si el salario es menor al mínimo');
  await p.fill(nom+' [data-k="salario"]','400');await p.waitForTimeout(200);
  /* Vacaciones */
  const vac='.nb-ed.nb-vacaciones';
  await p.fill(vac+' [data-k="ingreso"]','2020-06-15');await p.fill(vac+' [data-k="al"]','2026-11-25');
  await p.fill(vac+' [data-k="salario"]','500');await p.fill(vac+' [data-k="tomados"]','4');await p.waitForTimeout(300);
  r.igual(await p.textContent(vac+' .nb-k .nb-acento dd'),'18','vacaciones disponibles: 22 menos 4');
  await p.check(vac+' [data-k="tabla"]');await p.waitForTimeout(250);
  r.cumple(/6 a 10/.test(await p.textContent(vac+' .rh-ley'))&&(await p.textContent(vac+' .rh-aqui'))!=='','la tabla de la ley marca su renglón');
  /* Aguinaldo */
  const ag='.nb-ed.nb-aguinaldo';
  await p.fill(ag+' [data-k="salario"]','500');await p.fill(ag+' [data-k="ingreso"]','2026-07-01');await p.fill(ag+' [data-k="al"]','2026-12-31');await p.waitForTimeout(300);
  r.cumple(/184 de 365/.test(await p.textContent(ag+' .nb-res'))&&/\$3,780\.82/.test(await p.textContent(ag+' .nb-res')),'aguinaldo proporcional en el bloque');
  /* Finiquito y liquidación */
  const fin='.nb-ed.nb-finiquito';
  await p.fill(fin+' [data-k="salario"]','500');await p.fill(fin+' [data-k="ingreso"]','2021-02-10');await p.fill(fin+' [data-k="salida"]','2026-11-25');await p.waitForTimeout(300);
  const t1=await p.textContent(fin+' .nb-res');
  r.cumple(/Finiquito neto/.test(t1)&&!/Prima de antigüedad/.test(t1),'renuncia: finiquito sin prima de antigüedad');
  await p.selectOption(fin+' [data-k="motivo"]','injustificado');await p.waitForTimeout(300);
  const t2=await p.textContent(fin+' .nb-res');
  r.cumple(/Liquidación neta/.test(t2)&&/Prima de antigüedad/.test(t2)&&/tres meses/.test(t2),'despido injustificado: liquidación con prima de antigüedad y tres meses');
  r.cumple(await p.isVisible(fin+' [data-k="veinte"]'),'y la opción de los 20 días por año');
  await p.check(fin+' [data-k="veinte"]');await p.waitForTimeout(300);
  r.cumple(/20 días de salario integrado/.test(await p.textContent(fin+' .nb-res')),'los 20 días por año se suman');
  await revisar(p,r,'Calculadoras de nómina (escritorio)');
  if(CAP){await p.locator(nom).screenshot({path:CAP+'/rh-recibo.png'});await p.locator(fin).screenshot({path:CAP+'/rh-finiquito.png'})}

  /* Se guarda y se lee */
  await p.waitForFunction(function(){var e=document.querySelector('.doc-estado');return e&&e.getAttribute('data-k')==='ok'},null,{timeout:8000});
  const at=await p.evaluate(function(){var b=AT.docActual.contenido.content.filter(function(x){return x.type==='nomina'})[0];return [b.attrs.empleado,b.attrs.salario,b.attrs.isn]});
  mismo(r,at,['Laura','400','3'],'lo escrito queda guardado en la página');
  /* «/» ofrece las calculadoras */
  const ofrece=await p.evaluate(function(){return (AT.editorInsertar||[]).filter(function(i){return i.modulo==='rh'}).map(function(i){return i.k}).sort().join(',')});
  r.igual(ofrece,'aguinaldo,equipo,finiquito,nomina,planilla,ptu,vacaciones','los bloques de RH están en «/» con el módulo rh');

  /* Al imprimir */
  const idDoc=await p.evaluate(function(){return AT.docActual.id});
  await p.goto(base+'imprimir.html?id='+encodeURIComponent(idDoc));
  await p.waitForSelector('.pagedjs_page,.imp-hoja,.nb-leer',{timeout:20000}).catch(function(){});
  await p.waitForTimeout(1500);
  const imp=await p.evaluate(function(){return document.body.textContent});
  r.cumple(/Recibo de nómina/.test(imp)&&/Laura/.test(imp)&&/Liquidación/.test(imp)&&/Neto a pagar/.test(imp),'al imprimir salen los recibos y la liquidación');
  r.cumple(p.errores.length===0,'imprimir sin errores',p.errores.slice(0,3));
  await cerrar(p);

  /* ---------- PTU en celular oscuro ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:RH,ajustes:{tema:'dark'}});
  await c.goto(base+'inicio.html');await listo(c,400);
  await Promise.all([c.waitForURL(/documento\.html/),c.evaluate(function(t){AT.crear.nuevo(t)},'ptu')]);
  await c.waitForURL(/documento\.html/);await listo(c,700);
  const pt='.nb-ed.nb-ptu';
  await c.fill(pt+' [data-k="utilidad"]','1000000');
  for(let i=0;i<2;i++){await c.click(pt+' [data-acc="agregar"]');await c.waitForTimeout(200)}
  await c.fill(pt+' [data-k="personas.0.nombre"]','Laura');await c.fill(pt+' [data-k="personas.0.salario"]','400');
  await c.fill(pt+' [data-k="personas.1.nombre"]','Pedro');await c.fill(pt+' [data-k="personas.1.dias"]','200');await c.fill(pt+' [data-k="personas.1.salario"]','350');
  await c.waitForTimeout(400);
  const ptu=await c.textContent(pt+' .nb-res');
  r.cumple(/\$100,000\.00/.test(ptu)&&/Laura/.test(ptu)&&/Pedro/.test(ptu),'la PTU reparte el 10 % de la utilidad entre las personas',ptu.slice(0,200));
  await revisar(c,r,'PTU en celular (oscuro)');
  if(CAP)await c.screenshot({path:CAP+'/rh-ptu.png',fullPage:true});
  await cerrar(c);

  /* ---------- Sin el módulo, no se ofrece ---------- */
  const q=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:SIN_RH});
  await q.goto(base+'inicio.html');await listo(q,400);
  await Promise.all([q.waitForURL(/documento\.html/),q.evaluate(function(t){AT.crear.nuevo(t)},'notas')]);
  await q.waitForURL(/documento\.html/);await listo(q,600);
  await q.click('.ProseMirror');await q.keyboard.type('/nomina');await q.waitForTimeout(400);
  const menu=await q.evaluate(function(){var m=document.querySelector('.menu[role="listbox"]');return m?m.textContent:null});
  r.cumple(menu!==null&&!/Recibo de nómina/.test(menu),'sin recursos humanos, «/» no ofrece la nómina',menu&&menu.slice(0,120));
  r.cumple(q.errores.length===0,'sin errores',q.errores.slice(0,3));
  await cerrar(q);
});
