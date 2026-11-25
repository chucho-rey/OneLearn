/* Modo zen y atajos de teclado (en tus páginas y en la Ayuda): Z entra y sale, J y K saltan de sección, la barra del
   modo zen cambia el tamaño de letra y el ancho, ? muestra los atajos, Esc cierra lo que esté abierto y, en una
   página, E pasa de leer a editar; nada se activa mientras escribes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function estado(p){return p.evaluate(function(){return {zen:document.documentElement.classList.contains('zen'),foco:document.activeElement.id||document.activeElement.tagName}})}

prueba('Hito 5 · Modo zen y atajos',async function({browser,base,r}){
  const p=await pagina(browser,{reducir:true});
  await p.goto(base+'ayuda.html');await listo(p);
  const ids=await p.$$eval('.page h2[id]',function(h){return h.filter(function(x){return x.offsetParent}).slice(0,3).map(function(x){return x.id})});

  /* Una página completa sin ratón */
  await p.keyboard.press('z');await p.waitForTimeout(300);
  let e=await estado(p);
  r.cumple(e.zen&&!await p.isVisible('#side')&&!await p.isVisible('#topbar'),'Z entra al modo zen y oculta las barras',e);
  const pasos=[];
  for(let i=0;i<3;i++){await p.keyboard.press('j');await p.waitForTimeout(150);pasos.push(await p.evaluate(function(){return document.activeElement.id}))}
  r.igual(pasos.join(' '),ids.join(' '),'J avanza de sección en sección');
  await p.keyboard.press('k');await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(){return document.activeElement.id}),ids[1],'K regresa a la sección anterior');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  e=await estado(p);
  r.cumple(!e.zen&&e.foco==='zenBtn','Esc sale del modo zen y el foco vuelve al botón',e);

  /* Barra del modo zen */
  await p.focus('#zenBtn');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  await p.keyboard.press('Tab');
  r.cumple(await p.evaluate(function(){return !!document.activeElement.closest('.zen-bar')}),'el primer Tab en el modo zen llega a su barra');
  r.igual(await p.evaluate(function(){return getComputedStyle(document.querySelector('.zen-bar')).visibility}),'visible','la barra aparece al llegar con Tab');
  r.igual(await p.$$eval('.zen-bar button',function(b){return b.map(function(x){return x.getAttribute('data-z')}).join(' ')}),'menos mas ancho salir','la barra tiene letra, ancho y salir (ya sin nota rápida)');
  await p.click('.zen-bar [data-z="mas"]');await p.click('.zen-bar [data-z="ancho"]');
  const aj=await p.evaluate(function(){return {tam:document.documentElement.style.fontSize,ancho:document.documentElement.dataset.ancho}});
  r.cumple(aj.tam==='115%'&&aj.ancho==='amplio','la barra cambia el tamaño de letra y el ancho',aj);
  await p.keyboard.press('?');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){return document.querySelector('dialog.atajos').open}),'? abre la lista de atajos');
  r.cumple(!/nota rápida|marcador/i.test(await p.textContent('dialog.atajos')),'la lista ya no habla de notas rápidas ni de marcadores');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  r.cumple(!await p.evaluate(function(){return document.querySelector('dialog.atajos').open})&&(await estado(p)).zen,'Esc cierra la lista sin salir del modo zen');
  await p.click('.zen-bar [data-z="salir"]');
  r.cumple(!(await estado(p)).zen,'«Salir» sale del modo zen');
  await p.evaluate(function(){AT.ajustes.restablecer()});
  await p.click('#aaBtn');await p.keyboard.press('Escape');
  r.cumple(await p.isHidden('#lectura')&&(await estado(p)).foco==='aaBtn','Esc en Lectura solo cierra el panel');
  await p.click('#sideZen');r.cumple((await estado(p)).zen,'«Modo zen» de la barra lateral entra al modo zen');await p.keyboard.press('Escape');
  await p.click('#sideAtajos');r.cumple(await p.evaluate(function(){return document.querySelector('dialog.atajos').open}),'«Atajos de teclado» abre la lista');await p.keyboard.press('Escape');
  r.cumple(p.errores.length===0,'sin errores en la Ayuda',p.errores);
  await cerrar(p);

  /* En una página: nada se activa mientras escribes; al leer, Z entra al modo zen y E pasa a editar */
  const d=await pagina(browser,{reducir:true});
  await d.goto(base+'inicio.html');await listo(d);
  await d.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-zen',titulo:'Zen',props:[],contenido:{type:'doc',content:[
    {type:'heading',attrs:{id:'b-uno',level:2},content:[{type:'text',text:'Uno'}]},{type:'paragraph',attrs:{id:'b-p1'},content:[{type:'text',text:'Texto'}]},
    {type:'heading',attrs:{id:'b-dos',level:2},content:[{type:'text',text:'Dos'}]}]}})});
  await d.goto(base+'documento.html?id=d-zen');await listo(d,400);
  await d.click('.ed-cuerpo p');await d.waitForFunction(function(){return document.activeElement&&document.activeElement.classList.contains('ProseMirror')});
  await d.keyboard.press('End');await d.keyboard.type(' zj');await d.waitForTimeout(200);
  r.cumple(!(await estado(d)).zen,'mientras escribes en la página, Z no entra al modo zen');
  await d.click('#docModo');await d.waitForTimeout(300);
  await d.keyboard.press('z');await d.waitForTimeout(300);
  r.cumple((await estado(d)).zen,'al leer una página, Z entra al modo zen');
  await d.keyboard.press('Escape');await d.waitForTimeout(200);
  await d.keyboard.press('e');await d.waitForTimeout(400);
  r.cumple(await d.evaluate(function(){return document.documentElement.classList.contains('doc-editando')}),'E pasa de leer a editar');
  r.cumple(d.errores.length===0,'sin errores en una página',d.errores);
  await cerrar(d);

  /* Celular: el modo zen funciona y no se ofrece «Atajos» */
  const c=await pagina(browser,{ancho:390,alto:844,movil:true});
  await c.goto(base+'ayuda.html');await listo(c);
  await c.tap('#zenBtn');await c.waitForTimeout(300);
  r.cumple((await estado(c)).zen,'en celular, el modo zen funciona');
  r.cumple(!await c.isVisible('#sideAtajos'),'en pantallas táctiles no se ofrece la lista de atajos');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);

  /* Modo zen en varios tamaños y modos */
  for(const ancho2 of [390,1280,1600])for(const [escala,fuente] of [[1,'normal'],[1.5,'opendyslexic']])
  for(const [tema,contraste] of [['light','normal'],['dark','high']]){
    const s=await pagina(browser,{ancho:ancho2,ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste}});
    await s.goto(base+'ayuda.html');await listo(s);
    await s.keyboard.press('z');await s.mouse.move(100,100);await s.mouse.move(120,120);
    await s.waitForTimeout(300);
    await revisar(s,r,'zen '+ancho2+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste);
    await cerrar(s);
  }
});
