/* Barra compacta: al contraer la barra lateral en escritorio quedan los iconos (Inicio, Crear, Buscar y el pie);
   el nombre de cada uno sale en un globo al pasar el puntero o al llegar con Tab y sigue para lectores de pantalla;
   los iconos funcionan; el botón de la barra la vuelve a expandir; se recuerda; en celular no cambia nada;
   la Ayuda respeta el ancho de la barra; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const NEGOCIO={perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Abarrotes Ana',giro:'tienda',telefono:''},creado:'2026-01-01'};
const CAP=process.env.CAPTURAS||'';

prueba('Barra lateral compacta',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:860,reducir:true,perfil:NEGOCIO});
  await p.goto(base+'inicio.html');await listo(p,500);
  const ancho=function(){return p.evaluate(function(){return Math.round(document.getElementById('side').getBoundingClientRect().width)})};
  r.cumple(await ancho()>200,'la barra empieza abierta');
  r.igual(await p.getAttribute('#sideBtn','aria-label'),'Contraer barra lateral','el botón de la barra dice «Contraer»');
  await p.click('#sideBtn');await p.waitForTimeout(250);
  const a=await ancho();
  r.cumple(a>=48&&a<=64,'contraída, la barra queda angosta (solo iconos)',a);
  r.cumple(await p.isVisible('#sideCrear')&&await p.isVisible('#sideBuscar')&&await p.isVisible('#sideDatos'),'se ven los iconos de Crear, Buscar y Tus datos');
  r.cumple(await p.isHidden('#arbol'),'tus páginas se esconden en la barra compacta');
  const nombre=await p.evaluate(function(){var b=document.getElementById('sideCrear');var s=b.querySelector('span');return {w:s.getBoundingClientRect().width,t:b.textContent.trim()}});
  r.cumple(nombre.w<=1&&nombre.t==='Crear','el nombre no se ve pero sigue para lectores de pantalla',nombre);
  r.igual(await p.getAttribute('#sideBtn','aria-label'),'Expandir barra lateral','el botón dice «Expandir»');
  r.igual(await p.getAttribute('#sideBtn','aria-expanded'),'false','aria-expanded en falso');
  const sinBrinco=await p.evaluate(function(){var s=document.getElementById('side');return s.scrollWidth<=s.clientWidth});
  r.cumple(sinBrinco,'la barra compacta no se desborda a lo ancho');
  /* Globo con el nombre */
  await p.hover('#sideBuscar');await p.waitForTimeout(100);
  r.igual(await p.evaluate(function(){var g=document.querySelector('.side-tip');return g&&g.textContent}),'Buscar','al pasar el puntero sale el nombre en un globo');
  const pos=await p.evaluate(function(){var g=document.querySelector('.side-tip').getBoundingClientRect(),b=document.getElementById('sideBuscar').getBoundingClientRect();return g.left>b.right&&Math.abs((g.top+g.height/2)-(b.top+b.height/2))<3});
  r.cumple(pos,'el globo sale a la derecha del icono, a su altura');
  if(CAP)await p.screenshot({path:CAP+'/compacta-claro.png'});
  await p.mouse.move(700,400);await p.waitForTimeout(100);
  r.cumple(!(await p.$('.side-tip')),'al salir, el globo se va');
  await p.focus('#sideBtn');await p.keyboard.press('Tab');await p.waitForTimeout(100);
  r.igual(await p.evaluate(function(){var g=document.querySelector('.side-tip');return g&&g.textContent}),'Inicio','con Tab también sale el globo');
  await p.keyboard.press('Escape');
  r.cumple(!(await p.$('.side-tip')),'Esc quita el globo');
  /* Los iconos funcionan */
  await p.click('#sideCrear');await p.waitForTimeout(400);
  r.cumple(await p.evaluate(function(){var d=document.querySelector('dialog[open]');return !!d}),'el icono de Crear abre la ventana');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  await revisar(p,r,'Barra compacta (claro)');
  /* Se recuerda al recargar */
  await p.reload();await listo(p,400);
  const a2=await ancho();
  r.cumple(a2>=48&&a2<=64,'al recargar sigue compacta',a2);
  /* Oscuro, alto contraste y letra grande */
  await p.evaluate(function(){AT.ajustes.set('tema','dark');AT.ajustes.set('contraste','high');AT.ajustes.set('escala',1.3)});
  await p.waitForTimeout(300);
  await revisar(p,r,'Barra compacta (oscuro, alto contraste, letra grande)');
  if(CAP)await p.screenshot({path:CAP+'/compacta-oscuro.png'});
  await p.evaluate(function(){AT.ajustes.set('contraste','auto');AT.ajustes.set('escala',1);AT.ajustes.set('tema','light')});
  /* La Ayuda respeta la barra */
  await p.goto(base+'ayuda.html');await listo(p,400);
  const hueco=await p.evaluate(function(){var m=document.querySelector('.main').getBoundingClientRect(),b=document.getElementById('side').getBoundingClientRect();return Math.round(m.left-b.right)});
  r.cumple(Math.abs(hueco)<=1,'el contenido empieza donde termina la barra compacta',hueco);
  r.cumple(await p.isVisible('#sideZen'),'en la Ayuda, Modo zen sigue como icono');
  await revisar(p,r,'Ayuda con la barra compacta');
  /* Expandir */
  await p.click('#sideBtn');await p.waitForTimeout(250);
  r.cumple(await ancho()>200&&await p.isVisible('#arbol'),'«Expandir» la deja como estaba');
  r.igual(await p.evaluate(function(){return AT.ajustes.get('barra')}),'abierta','se guarda abierta');
  await cerrar(p);

  /* En celular, el menú sigue igual */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:NEGOCIO,local:{'aprende-tecnologia:ajustes':JSON.stringify({barra:'cerrada'})}});
  await c.goto(base+'inicio.html');await listo(c,400);
  r.cumple(await c.isHidden('#sideCrear'),'en celular la barra no se ve hasta abrir el menú');
  await c.click('#menuBtn');await c.waitForTimeout(350);
  r.cumple(await c.isVisible('#sideCrear')&&await c.isVisible('#arbol'),'al abrir el menú se ve completa, con tus páginas');
  r.cumple(!(await c.evaluate(function(){var s=document.querySelector('#sideCrear span');return s.getBoundingClientRect().width<=1})),'con sus nombres');
  await revisar(c,r,'Menú en celular');
  await cerrar(c);
});
