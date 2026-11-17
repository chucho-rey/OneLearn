/* Hito 5: modo zen, atajos de teclado y nota acoplada a la derecha. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function estado(p){return p.evaluate(function(){return {
  zen:document.documentElement.classList.contains('zen'),
  hoja:document.getElementById('sheet').dataset.state,
  foco:document.activeElement.id||document.activeElement.tagName}})}
function ancho(p){return p.evaluate(function(){return Math.round(document.getElementById('sheet').getBoundingClientRect().width)})}

prueba('Hito 5 · Modo zen, atajos y nota acoplada',async function({browser,base,r}){
  const p=await pagina(browser,{reducir:true});
  await p.goto(base+'lecciones/ram.html');await listo(p);

  /* Una lección completa sin ratón: el criterio del hito */
  await p.keyboard.press('z');await p.waitForTimeout(300);
  let e=await estado(p);
  r.cumple(e.zen&&!await p.isVisible('#side')&&!await p.isVisible('#topbar'),'Z entra al modo zen y oculta las barras',e);
  r.cumple(!await p.isVisible('#sheet'),'en el modo zen no se ve la barra de apuntes');
  const pasos=[];
  for(let i=0;i<3;i++){await p.keyboard.press('j');await p.waitForTimeout(150);pasos.push(await p.evaluate(function(){return document.activeElement.id}))}
  r.igual(pasos.join(' '),'s-que s-escritorio s-jerarquia','J avanza de sección en sección');
  await p.keyboard.press('k');await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(){return document.activeElement.id}),'s-escritorio','K regresa a la sección anterior');
  await p.keyboard.press('n');await p.waitForTimeout(300);
  await p.keyboard.type('Zeta y jota no activan nada aquí');
  e=await estado(p);
  r.cumple(e.zen&&e.hoja==='half'&&e.foco==='notes','N abre la nota dentro del modo zen',e);
  r.igual(await p.inputValue('#notes'),'Zeta y jota no activan nada aquí','los atajos no se activan mientras escribes');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  e=await estado(p);
  r.cumple(e.zen&&e.hoja==='closed'&&e.foco!=='notes','Esc cierra la nota, sigue en zen y el foco no queda atrapado',e);
  await p.keyboard.press('j');await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(){return document.activeElement.id}),'s-jerarquia','después de cerrar la nota, los atajos siguen funcionando');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  e=await estado(p);
  r.cumple(!e.zen&&e.foco==='zenBtn','otro Esc sale del modo zen y el foco vuelve al botón',e);

  /* Dos Esc seguidos, sin pausa: el foco no debe quedar atrapado en el cuadro de texto oculto */
  await p.keyboard.press('z');await p.keyboard.press('n');await p.waitForTimeout(300);
  await p.keyboard.type('x');
  await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.waitForTimeout(300);
  e=await estado(p);
  r.cumple(!e.zen&&e.hoja==='closed','dos Esc seguidos cierran la nota y salen del modo zen',e);

  /* Barra del modo zen */
  await p.focus('#zenBtn');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  await p.keyboard.press('Tab');
  r.cumple(await p.evaluate(function(){return !!document.activeElement.closest('.zen-bar')}),'el primer Tab en el modo zen llega a su barra');
  r.igual(await p.evaluate(function(){return getComputedStyle(document.querySelector('.zen-bar')).visibility}),'visible','la barra aparece al llegar con Tab');
  await p.click('.zen-bar [data-z="mas"]');await p.click('.zen-bar [data-z="ancho"]');
  const aj=await p.evaluate(function(){return {tam:document.documentElement.style.fontSize,ancho:document.documentElement.dataset.ancho}});
  r.cumple(aj.tam==='115%'&&aj.ancho==='amplio','la barra cambia el tamaño de letra y el ancho',aj);
  await p.keyboard.press('?');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){return document.querySelector('dialog.atajos').open}),'? abre la lista de atajos');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(!await p.evaluate(function(){return document.querySelector('dialog.atajos').open})&&(await estado(p)).zen,'Esc cierra la lista sin salir del modo zen');
  await p.click('.zen-bar [data-z="salir"]');
  r.cumple(!(await estado(p)).zen,'«Salir» sale del modo zen');
  await p.evaluate(function(){AT.ajustes.restablecer()});

  await p.click('#aaBtn');await p.keyboard.press('Escape');
  r.cumple(await p.isHidden('#lectura')&&(await estado(p)).foco==='aaBtn','Esc en Lectura solo cierra el panel');

  /* Nota acoplada a la derecha */
  await p.click('#shMain');await p.waitForTimeout(300);
  r.cumple(await p.isVisible('#shDock'),'en escritorio, la nota abierta ofrece acoplarse a la derecha');
  await p.click('#shDock');await p.waitForTimeout(300);
  const d=await p.evaluate(function(){const s=document.getElementById('sheet').getBoundingClientRect();return {
    estado:document.getElementById('sheet').dataset.state,der:Math.round(s.right),alto:Math.round(s.height),
    pad:getComputedStyle(document.querySelector('.app')).paddingRight,pref:AT.ajustes.get('nota')}});
  r.cumple(d.estado==='right'&&d.der===1280&&d.alto===900&&d.pad==='384px'&&d.pref==='derecha','la nota se acopla a la derecha, a toda altura, y el texto le deja espacio',d);
  await p.focus('#shResize');for(let i=0;i<3;i++)await p.keyboard.press('ArrowLeft');
  r.igual(await ancho(p),432,'las flechas en el borde cambian el ancho');
  const caja=await p.locator('#shResize').boundingBox();
  await p.mouse.move(caja.x+2,caja.y+300);await p.mouse.down();await p.mouse.move(700,400,{steps:5});await p.mouse.up();
  r.igual(await ancho(p),580,'arrastrar el borde cambia el ancho');
  await p.keyboard.press('Escape');await p.reload();await listo(p);
  await p.keyboard.press('n');await p.waitForTimeout(300);
  r.cumple((await estado(p)).hoja==='right'&&await ancho(p)===580,'al recargar, la nota se abre a la derecha con el mismo ancho');
  await p.keyboard.press('Escape');await p.keyboard.press('z');await p.keyboard.press('n');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return document.querySelector('.zen-bar').getBoundingClientRect().right<=document.getElementById('sheet').getBoundingClientRect().left}),'en el modo zen, la barra queda a la izquierda de la nota acoplada');
  await p.keyboard.press('Escape');await p.keyboard.press('Escape');
  await p.click('#shMain');await p.click('#shDock');
  r.cumple((await estado(p)).hoja==='half'&&await p.evaluate(function(){return AT.ajustes.get('nota')})==='abajo','se puede volver a acoplar abajo');
  await p.keyboard.press('Escape');
  await p.click('#sideZen');r.cumple((await estado(p)).zen,'«Modo zen» de la barra lateral entra al modo zen');await p.keyboard.press('Escape');
  await p.click('#sideAtajos');r.cumple(await p.evaluate(function(){return document.querySelector('dialog.atajos').open}),'«Atajos de teclado» abre la lista');await p.keyboard.press('Escape');
  r.cumple(p.errores.length===0,'sin errores en escritorio',p.errores);
  await cerrar(p);

  /* Celular: sin acoplar a la derecha y sin «Atajos» */
  const c=await pagina(browser,{ancho:390,alto:844,movil:true,ajustes:{nota:'derecha'}});
  await c.goto(base+'lecciones/cpu.html');await listo(c);
  await c.tap('#zenBtn');await c.waitForTimeout(300);
  r.cumple((await estado(c)).zen&&!await c.isVisible('#shDock'),'en celular, el modo zen funciona y no se ofrece acoplar a la derecha');
  await c.tap('body',{position:{x:200,y:400}});await c.waitForTimeout(100);await c.tap('.zen-bar [data-z="nota"]');await c.waitForTimeout(400);
  r.igual((await estado(c)).hoja,'half','en celular, la nota se abre abajo aunque la preferencia sea «derecha»');
  r.cumple(!await c.isVisible('#sideAtajos'),'en pantallas táctiles no se ofrece la lista de atajos');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);

  /* Modo zen y nota acoplada en varios tamaños y modos */
  for(const ancho2 of [390,1280,1600])for(const [escala,fuente] of [[1,'normal'],[1.5,'opendyslexic']])
  for(const [tema,contraste] of [['light','normal'],['dark','high']])for(const modo of ['zen','derecha']){
    if(modo==='derecha'&&ancho2<900)continue;
    const s=await pagina(browser,{ancho:ancho2,ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste,nota:'derecha'},local:{'aprende-tecnologia:apuntes:ram':'nota'}});
    await s.goto(base+'lecciones/ram.html');await listo(s);
    await s.evaluate(function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});
    if(modo==='zen'){await s.keyboard.press('z');await s.mouse.move(100,100);await s.mouse.move(120,120)}
    else{await s.keyboard.press('n');await s.keyboard.press('Tab')}
    await s.waitForTimeout(300);
    await revisar(s,r,modo+' '+ancho2+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste);
    await cerrar(s);
  }
});
