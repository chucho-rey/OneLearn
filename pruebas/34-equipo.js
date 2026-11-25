/* Recursos humanos (RH2): el módulo «Recursos humanos» de un negocio. «Tengo empleados» en «Crea tu espacio» lo
   enciende y sugiere «Mi equipo» y la nómina; Empleados e Incidencias (bases con rol, una vez por espacio; antigüedad
   y vacaciones calculadas); «Agregar persona» y «Anotar falta o vacaciones»; el resumen (quién falta hoy,
   cumpleaños y aniversarios, sueldos y costo al mes); la nómina del equipo (faltas y horas extra de Incidencias),
   el aguinaldo y las vacaciones de todos; «Traer a tu equipo» en la PTU; «Tu equipo» en el Inicio con sus acciones
   rápidas; sin el módulo no aparece; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const RH={perfil:'negocio',modulos:['negocio','rh'],nombre:'Ana',negocio:{nombre:'Cocina Ana',giro:'comida',telefono:''},creado:'2026-01-01'};
const CAP=process.env.CAPTURAS||'';
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function enDias(n){var d=new Date();d.setDate(d.getDate()+n);return iso(d)}
function haceAnios(a,dias){var d=new Date();d.setFullYear(d.getFullYear()-a);d.setDate(d.getDate()+(dias||0));return iso(d)}
function guardado(p){return p.waitForFunction(function(){var e=document.querySelector('.doc-estado');return e&&e.getAttribute('data-k')==='ok'},null,{timeout:8000})}

prueba('Recursos humanos: tu equipo',async function({browser,base,r}){
  /* ---------- «Crea tu espacio» con «Tengo empleados» ---------- */
  const e=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
  await e.goto(base+'entrar.html?perfil=negocio');await listo(e,400);
  await e.fill('#enNegocio','Fonda Lupita');await e.selectOption('#enGiro','comida');
  r.cumple(await e.isVisible('#enRh'),'el paso del negocio pregunta «Tengo empleados»');
  await e.check('#enRh');
  await e.click('#enSig');await e.waitForTimeout(300);
  const sug=await e.evaluate(function(){return [].map.call(document.querySelectorAll('input[name="plantilla"]:checked'),function(x){return x.value}).slice(0,2).join(',')});
  r.igual(sug,'equipo,nominas','con empleados sugiere «Mi equipo» y la nómina, ya marcadas');
  await Promise.all([e.waitForURL(/inicio\.html/),e.click('#enSig')]);await listo(e,800);
  r.igual(await e.evaluate(function(){return AT.perfil.actual().modulos.join(',')}),'negocio,rh','el espacio queda con el módulo de recursos humanos');
  await e.waitForSelector('#iniEquipo:not([hidden])',{timeout:10000});
  r.cumple(await e.isVisible('#iniEquipo h2:has-text("Tu equipo")'),'el Inicio muestra «Tu equipo»');
  const acc=await e.evaluate(function(){return [].map.call(document.querySelectorAll('#iniAcciones [data-accion]'),function(b){return b.getAttribute('data-accion')}).join(',')});
  r.cumple(/incidencia/.test(acc)&&/nomina/.test(acc),'acciones rápidas: anotar falta o vacaciones y la nómina',acc);
  r.cumple(/Empieza con|Agrega a tu equipo/.test(await e.textContent('#iniEquipoC')),'sin personas, el resumen dice cómo empezar');
  await cerrar(e);

  /* ---------- Mi equipo: agregar personas y anotar ---------- */
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:RH});
  await p.goto(base+'inicio.html');await listo(p,500);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(){AT.crear.nuevo('equipo')})]);await listo(p,900);
  await p.waitForSelector('.nb-leer [data-equipo], [data-equipo]',{timeout:10000});
  const bases=await p.evaluate(function(){var o=AT.inventario.ids()||{};return [!!o.empleados,!!o.incidencias]});
  r.cumple(bases[0]&&bases[1],'la plantilla crea Empleados e Incidencias',bases);
  /* Agregar persona con la ventana */
  await p.click('[data-equipo] [data-acc="persona"]');
  await p.waitForSelector('dialog[open] [name="nombre"]');
  await p.fill('dialog[open] [name="nombre"]','Laura Pérez');await p.fill('dialog[open] [name="puesto"]','Cocinera');
  await p.fill('dialog[open] [name="ingreso"]',haceAnios(3,10));await p.fill('dialog[open] [name="salario"]','400');
  await p.fill('dialog[open] [name="nac"]',haceAnios(30,5));
  await p.click('dialog[open] button[type="submit"]');
  await p.waitForFunction(function(){return !document.querySelector('dialog[open]')});
  r.cumple(/Laura Pérez/.test(await p.textContent('[data-equipo]')),'«Agregar persona» la pone en tu equipo');
  /* Otras dos personas directo en la base */
  await p.evaluate(function(f){
    var o=AT.inventario.ids(),B=AT.bases;
    return B.guardarFilas([
      B.nuevaFila(o.empleados,{'em-nombre':'Pedro Gómez','em-puesto':'Mesero','em-ingreso':f.pedro,'em-salario':350,'em-periodo':'Quincenal','em-estado':'Activo'}),
      B.nuevaFila(o.empleados,{'em-nombre':'Rosa Díaz','em-puesto':'Cajera','em-ingreso':f.rosa,'em-salario':500,'em-periodo':'Semanal','em-estado':'Activo'}),
      B.nuevaFila(o.empleados,{'em-nombre':'Juan Baja','em-ingreso':'2020-01-01','em-salario':300,'em-estado':'Baja','em-baja':'2026-03-31'})
    ]);
  },{pedro:haceAnios(1,-2),rosa:haceAnios(6,20)});
  await p.waitForTimeout(400);
  const fila=await p.evaluate(function(){
    var B=AT.bases,o=AT.inventario.ids(),b=B.base(o.empleados);
    return B.filas(b.id).map(function(f){return [B.titulo(b,f),B.texto(b,f,B.col(b,'em-anios')),B.texto(b,f,B.col(b,'em-vac'))]});
  });
  const laura=fila.filter(function(x){return x[0]==='Laura Pérez'})[0],rosa=fila.filter(function(x){return x[0]==='Rosa Díaz'})[0];
  r.cumple(laura&&laura[1]==='2'&&laura[2]==='14','la base calcula antigüedad y vacaciones al año (2 años → 14 días)',laura);
  r.cumple(rosa&&rosa[1]==='5'&&rosa[2]==='20','5 años → 20 días',rosa);
  /* Anotar: Pedro falta hoy; Laura de vacaciones 3 días desde hoy; Pedro 4 horas extra */
  await p.click('[data-equipo] [data-acc="incidencia"]');
  await p.waitForSelector('dialog[open] [name="emp"]');
  await p.selectOption('dialog[open] [name="emp"]',{label:'Pedro Gómez'});await p.selectOption('dialog[open] [name="tipo"]','Falta');
  await p.click('dialog[open] button[type="submit"]');await p.waitForFunction(function(){return !document.querySelector('dialog[open]')});
  await p.evaluate(function(f){
    var o=AT.inventario.ids(),B=AT.bases,e=B.filas(o.empleados);
    function id(n){return e.filter(function(x){return x.v['em-nombre']===n})[0].id}
    return B.guardarFilas([
      B.nuevaFila(o.incidencias,{'in-con':'Vacaciones','in-emp':id('Laura Pérez'),'in-tipo':'Vacaciones','in-desde':f.hoy,'in-dias':3}),
      B.nuevaFila(o.incidencias,{'in-con':'Horas extra','in-emp':id('Pedro Gómez'),'in-tipo':'Horas extra','in-desde':f.hoy,'in-horas':4})
    ]);
  },{hoy:enDias(0)});
  await p.waitForTimeout(500);
  const res=await p.textContent('[data-equipo]');
  r.cumple(/Pedro Gómez falta/.test(res)&&/Laura Pérez de vacaciones hasta/.test(res),'«Hoy»: quién falta y quién está de vacaciones',res.slice(0,300));
  r.cumple(/Laura Pérez cumple años el/.test(res),'los cumpleaños de los próximos 30 días');
  r.cumple(/Rosa Díaz cumple 6 años contigo/.test(res)&&/le tocan 22 días/.test(res),'los aniversarios con los días de vacaciones que le tocarán');
  r.cumple(!/Juan Baja/.test(res),'quien está de baja no sale en el resumen');
  const k=await p.evaluate(function(){return [].map.call(document.querySelectorAll('[data-equipo] .nb-k dd'),function(d){return d.textContent})});
  r.igual(k[0],'3','tres personas activas');
  r.igual(k[1],'$38,000.00','sueldos al mes: (400 + 350 + 500) × 30.4');
  r.cumple(/días$/.test(k[3]),'vacaciones por tomar',k[3]);
  r.cumple(/11 de 14/.test(await p.textContent('[data-equipo] .eq-t')),'Laura: 11 de 14 días de vacaciones disponibles (tomó 3)');
  if(CAP)await p.locator('.nb-equipo').screenshot({path:CAP+'/rh-equipo.png'});
  await revisar(p,r,'Mi equipo (escritorio)');
  await guardado(p);

  /* ---------- Nómina del periodo (en el mismo navegador: ahí está tu equipo) ---------- */
  const n=p;
  await n.goto(base+'inicio.html');await listo(n,500);
  await Promise.all([n.waitForURL(/documento\.html/),n.evaluate(function(){AT.crear.nuevo('nominas')})]);await listo(n,900);
  await n.waitForSelector('[data-planilla] .eq-t',{timeout:10000});
  const pl=await n.textContent('[data-planilla]');
  r.cumple(/Quincenal del/.test(pl)&&/2 personas con pago quincenal/.test(pl),'la nómina de la quincena toma a quien cobra por quincena',pl.slice(0,160));
  r.cumple(/Pedro Gómez1 falta4 h extra/.test(pl.replace(/\s+/g,'')?pl.replace(/\s/g,''):'')||(/1 falta/.test(pl)&&/4 h extra/.test(pl)),'descuenta la falta y paga las horas extra anotadas');
  const pedro=await n.evaluate(function(){var tr=[].filter.call(document.querySelectorAll('[data-planilla] tbody tr'),function(t){return /Pedro/.test(t.textContent)})[0];return tr?[].map.call(tr.querySelectorAll('td'),function(t){return t.textContent}):[]});
  r.igual(pedro[1],'14','Pedro: 14 días pagados (15 menos la falta)');
  /* Cambiar a semanal */
  await n.selectOption('.nb-ed.nb-planilla [data-k="periodo"]','Semanal');await n.waitForTimeout(400);
  r.cumple(/1 persona con pago semanal/.test(await n.textContent('.nb-ed.nb-planilla')),'semanal: solo Rosa');
  /* Aguinaldo y vacaciones del equipo */
  await n.selectOption('.nb-ed.nb-planilla [data-k="que"]','aguinaldo');await n.waitForTimeout(400);
  const ag=await n.textContent('.nb-ed.nb-planilla');
  r.cumple(/Aguinaldo neto/.test(ag)&&/Laura Pérez/.test(ag)&&/20 de diciembre/.test(ag),'el aguinaldo de todo tu equipo, con la fecha límite');
  await n.selectOption('.nb-ed.nb-planilla [data-k="que"]','vacaciones');await n.waitForTimeout(400);
  r.cumple(/Próximo aniversario/.test(await n.textContent('.nb-ed.nb-planilla')),'las vacaciones de todo tu equipo');
  await guardado(n);
  await revisar(n,r,'Nómina del periodo');
  /* PTU: «Traer a tu equipo» */
  await n.goto(base+'inicio.html');await listo(n,500);
  await Promise.all([n.waitForURL(/documento\.html/),n.evaluate(function(){AT.crear.nuevo('ptu')})]);await listo(n,900);
  await n.click('.nb-ed.nb-ptu [data-acc="traerEquipo"]');
  await n.waitForSelector('.nb-ed.nb-ptu [data-k="personas.0.nombre"]',{timeout:8000});
  const nombres=await n.evaluate(function(){return [].map.call(document.querySelectorAll('.nb-ed.nb-ptu [data-k$=".nombre"]'),function(i){return i.value}).join(',')});
  r.cumple(/Laura Pérez/.test(nombres)&&/Juan Baja/.test(nombres),'«Traer a tu equipo» llena la PTU (también quien se fue en el año)',nombres);
  r.cumple(await n.evaluate(function(){return document.activeElement&&document.activeElement.getAttribute('data-acc')==='traerEquipo'}),'el foco vuelve al botón');
  await guardado(n);

  /* ---------- El Inicio con tu equipo ---------- */
  const i=p;
  await i.goto(base+'inicio.html');await listo(i,900);
  await i.waitForFunction(function(){return /Laura Pérez/.test((document.querySelector('#iniEquipoC')||{}).textContent||'')},null,{timeout:10000});
  r.cumple(!(await i.$('#iniEquipoC [data-acc]')),'en el Inicio, el resumen sale sin botones');
  r.cumple(!(await i.evaluate(function(){return [].some.call(document.querySelectorAll('#xpLista a'),function(a){return /d-miequipo/.test(a.getAttribute('href')||'')})})),'«Tu equipo» no sale entre tus páginas recientes');
  /* Acción rápida: anotar falta */
  await i.click('#iniAcciones [data-accion="incidencia"]');
  await i.waitForSelector('dialog[open] [name="tipo"]');
  await i.selectOption('dialog[open] [name="tipo"]','Incapacidad');await i.fill('dialog[open] [name="dias"]','2');
  await i.click('dialog[open] button[type="submit"]');await i.waitForFunction(function(){return !document.querySelector('dialog[open]')});
  await i.waitForFunction(function(){return /con incapacidad/.test((document.querySelector('#iniEquipoC')||{}).textContent||'')},null,{timeout:8000});
  r.cumple(true,'la acción rápida anota la incapacidad y el Inicio la muestra');
  r.cumple(await i.getAttribute('#iniAcciones [data-accion="incidencia"]','aria-disabled')===null,'el botón vuelve a quedar listo');
  await revisar(i,r,'Inicio con tu equipo');
  await i.click('#sideCrear');await i.waitForSelector('[data-cat="rh"] [data-tipo="calculadoras"]');
  r.cumple(/Recursos humanos/.test(await i.textContent('[data-cat="rh"] h3')),'«Crear» trae la sección Recursos humanos');
  await revisar(i,r,'Crear con Recursos humanos');
  await i.keyboard.press('Escape');await i.waitForTimeout(300);
  await i.setViewportSize({width:390,height:844});
  await i.evaluate(function(){AT.ajustes.set('tema','dark')});await i.reload();await listo(i,900);
  await i.waitForFunction(function(){return /Laura Pérez/.test((document.querySelector('#iniEquipoC')||{}).textContent||'')},null,{timeout:10000});
  await revisar(i,r,'Inicio con tu equipo en celular (oscuro)');
  if(CAP)await i.screenshot({path:CAP+'/rh-inicio.png',fullPage:true});
  await cerrar(i);

  /* ---------- Sin el módulo ---------- */
  const s=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'negocio',modulos:['negocio'],nombre:'',negocio:{nombre:'Tienda',giro:'tienda',telefono:''},creado:'2026-01-01'}});
  await s.goto(base+'inicio.html');await listo(s,600);
  r.cumple(await s.isHidden('#iniEquipo'),'sin recursos humanos no hay «Tu equipo» en el Inicio');
  r.cumple(!(await s.$('#iniAcciones [data-accion="incidencia"]')),'ni sus acciones rápidas');
  await s.click('#sideCrear');await s.waitForSelector('[data-tipo="inventario"]');
  r.cumple(!(await s.$('[data-tipo="calculadoras"]'))&&!(await s.$('[data-cat="rh"]')),'ni sus plantillas en «Crear»');
  await s.keyboard.press('Escape');
  r.cumple(!(await s.evaluate(function(){return AT.datos.documentos.leer('d-miequipo')})),'ni se crea su página');
  r.cumple(s.errores.length===0,'sin errores',s.errores.slice(0,3));
  await cerrar(s);
});
