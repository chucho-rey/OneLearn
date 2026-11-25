/* La ayuda (ayuda.html): una sección por herramienta; se ven las de tu espacio y «Ver todas» muestra las de los
   módulos apagados con su aviso; el buscador filtra (sin acentos) y el índice lo sigue; un enlace directo a una
   herramienta apagada la muestra; «Crear …» abre su plantilla; está en la barra lateral (también compacta) y la
   búsqueda Ctrl K encuentra sus secciones en cualquier espacio; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const NEGOCIO={perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Abarrotes Ana',giro:'tienda',telefono:''},creado:'2026-01-01'};
const CAP=process.env.CAPTURAS||'';

prueba('Ayuda',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:NEGOCIO});
  await p.goto(base+'inicio.html');await listo(p,400);
  r.cumple(await p.isVisible('#sideAyuda'),'«Ayuda» está en la barra lateral');
  await Promise.all([p.waitForURL(/ayuda\.html/),p.click('#sideAyuda')]);await listo(p,500);
  r.igual(await p.textContent('h1'),'Ayuda: cómo usar OneBook','abre la ayuda');
  r.cumple(await p.getAttribute('#sideAyuda','aria-current')==='page','la barra marca la ayuda como página actual');
  const secs=await p.evaluate(function(){return AT.ayuda.secciones()});
  const ver=secs.filter(function(s){return s.visible}).map(function(s){return s.mod});
  r.cumple(secs.length>=35,'una sección por herramienta',secs.length);
  r.cumple(ver.indexOf('rh')<0&&ver.indexOf('estudio')<0&&ver.indexOf('negocio')>=0&&ver.indexOf('nucleo')>=0,'se ven las herramientas de tu espacio (núcleo y negocio)');
  r.cumple(/Ver todas \(\d+ más\)/.test(await p.textContent('#ayTodas')),'«Ver todas» dice cuántas más hay');
  /* Índice: solo lo visible */
  const toc=await p.evaluate(function(){return [].filter.call(document.querySelectorAll('.toc li'),function(l){return !l.hidden}).length});
  r.igual(toc,ver.length,'el índice sigue al filtro');
  /* Buscar */
  await p.fill('#ayQ','factura');await p.waitForTimeout(150);
  r.cumple(await p.isVisible('#ay-negocio-factura')&&!(await p.isVisible('#ay-negocio-corte')),'el buscador deja solo lo que coincide');
  await p.fill('#ayQ','finiquito');await p.waitForTimeout(150);
  r.cumple(/Nada coincide/.test(await p.textContent('#ayCuenta')),'sin el módulo, «finiquito» no está en tu espacio');
  await p.fill('#ayQ','nomina del periodo');await p.click('#ayTodas');await p.waitForTimeout(150);
  r.cumple(await p.isVisible('#ay-rh-nomina')&&/coincide/.test(await p.textContent('#ayCuenta')),'con «Ver todas» aparece la nómina (sin acentos)');
  r.cumple(/Necesita el módulo «Recursos humanos»/.test(await p.textContent('.ay-sec[data-mod="rh"]')),'y dice qué módulo encender');
  r.cumple(!(await p.$('.ay-sec[data-mod="rh"] [data-crear]')),'sin el módulo no ofrece crear su página');
  await p.fill('#ayQ','');await p.click('#ayTodas');await p.waitForTimeout(150);
  /* Crear desde la ayuda */
  r.cumple(await p.isVisible('#ay-negocio-corte ~ .ay-acc [data-crear="corte"]'),'cada herramienta con plantilla trae «Crear …»');
  await revisar(p,r,'Ayuda (escritorio)');
  if(CAP)await p.screenshot({path:CAP+'/ayuda.png'});
  await Promise.all([p.waitForURL(/documento\.html/),p.click('[data-crear="corte"]')]);await listo(p,700);
  r.igual(await p.evaluate(function(){return AT.docActual&&AT.docActual.tipo}),'corte','«Crear «Corte de caja»» abre la página nueva');
  /* Ctrl K encuentra la ayuda (y ya no hay lecciones que buscar) */
  await p.keyboard.press('Control+k');await p.waitForTimeout(300);
  await p.keyboard.type('aguinaldo');await p.waitForTimeout(900);
  const res=await p.evaluate(function(){var d=document.querySelector('dialog[open]');return d?d.textContent:''});
  r.cumple(/Aguinaldo/.test(res)&&/Ayuda/.test(res),'Ctrl K encuentra las secciones de la ayuda',res.slice(0,200));
  r.cumple(!/Memoria RAM/.test(res),'no salen lecciones (lo de estudio se separó)');
  await p.keyboard.press('Escape');
  /* Un enlace directo a una herramienta apagada */
  await p.goto(base+'ayuda.html#ay-rh-ptu');await listo(p,500);
  r.cumple(await p.isVisible('#ay-rh-ptu')&&(await p.getAttribute('#ayTodas','aria-pressed'))==='true','un enlace directo muestra la herramienta aunque su módulo esté apagado');
  /* Barra compacta */
  await p.evaluate(function(){AT.ajustes.set('barra','cerrada')});await p.waitForTimeout(200);
  await p.hover('#sideAyuda');await p.waitForTimeout(100);
  r.igual(await p.evaluate(function(){var g=document.querySelector('.side-tip');return g&&g.textContent}),'Ayuda','en la barra compacta, su globo dice «Ayuda»');
  await p.evaluate(function(){AT.ajustes.set('barra','abierta')});
  await cerrar(p);

  /* Celular oscuro, con todos los módulos (sin perfil) */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await c.goto(base+'ayuda.html');await listo(c,500);
  /* El tema se pone después de abrir: un ajuste guardado antes haría que el navegador cuente como de quien ya usaba OneLearn */
  await c.evaluate(function(){AT.ajustes.set('tema','dark')});await c.waitForTimeout(200);
  const todas=await c.evaluate(function(){return AT.ayuda.secciones().every(function(s){return s.visible})});
  r.cumple(todas&&!(await c.$('#ayTodas')),'con todos los módulos se ven todas, sin «Ver todas»');
  await revisar(c,r,'Ayuda en celular (oscuro)');
  await c.evaluate(function(){AT.ajustes.set('contraste','high');AT.ajustes.set('escala',1.3)});await c.waitForTimeout(300);
  await revisar(c,r,'Ayuda en celular (alto contraste, letra grande)');
  await cerrar(c);
});
