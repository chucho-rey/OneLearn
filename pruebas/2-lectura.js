/* Hito 2: panel Lectura (tamaño, tema, contraste, fuente, espacios y ancho). */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Hito 2 · Panel Lectura',async function({browser,base,r}){
  const p=await pagina(browser);
  const fuentes=[];
  p.on('requestfinished',function(q){if(/atkinson|opendyslexic/.test(q.url()))fuentes.push(q.url().split('/').pop())});
  await p.goto(base+'ayuda.html');await listo(p);
  r.igual(fuentes.length,0,'las fuentes para dislexia no se descargan si nadie las elige');

  await p.click('#aaBtn');
  r.cumple(await p.isVisible('#lectura'),'«Aa» abre el panel');
  r.igual(await p.getAttribute('#aaBtn','aria-expanded'),'true','«Aa» indica que el panel está abierto');
  r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('aria-label')}),'Texto más pequeño','el foco entra al panel');

  for(let i=0;i<3;i++)await p.click('[data-paso="1"]');
  await p.click('[data-paso="1"]',{force:true});
  r.igual(await p.textContent('#lecEsc'),'150%','A+ llega al 150% y no pasa de ahí');
  r.igual(await p.getAttribute('[data-paso="1"]','aria-disabled'),'true','A+ se marca como no disponible en el máximo');
  r.cumple(await p.evaluate(function(){return document.getElementById('lectura').contains(document.activeElement)}),'el foco no se pierde al llegar al máximo');

  const opciones=[['tema','dark'],['contraste','high'],['fuente','opendyslexic'],['espaciado','amplio'],['interlineado','amplio'],['ancho','estrecho']];
  for(const o of opciones)await p.click('#lectura .seg[data-k="'+o[0]+'"] button[data-v="'+o[1]+'"]');
  await p.waitForTimeout(500);
  const a=await p.evaluate(function(){const d=document.documentElement.dataset;return {
    theme:d.theme,contrast:d.contrast,fuente:d.fuente,espaciado:d.espaciado,interlineado:d.interlineado,ancho:d.ancho,
    letra:getComputedStyle(document.body).fontFamily.split(',')[0].replace(/"/g,''),carga:document.fonts.check('16px "OpenDyslexic"')}});
  r.cumple(a.theme==='dark'&&a.contrast==='high'&&a.fuente==='opendyslexic'&&a.espaciado==='amplio'&&a.interlineado==='amplio'&&a.ancho==='estrecho','cada opción del panel se aplica a la página',a);
  r.cumple(a.letra==='OpenDyslexic'&&a.carga,'OpenDyslexic se descarga y se usa',a);
  r.cumple(fuentes.some(function(f){return /opendyslexic/.test(f)}),'la fuente se sirve desde el propio sitio',fuentes);

  await p.keyboard.press('Escape');
  r.cumple(await p.isHidden('#lectura'),'Esc cierra el panel');
  r.igual(await p.evaluate(function(){return document.activeElement.id}),'aaBtn','Esc devuelve el foco a «Aa»');

  await p.reload();await listo(p);
  const g=await p.evaluate(function(){return {tam:document.documentElement.style.fontSize,fuente:document.documentElement.dataset.fuente,ancho:document.documentElement.dataset.ancho}});
  r.cumple(g.tam==='150%'&&g.fuente==='opendyslexic'&&g.ancho==='estrecho','los ajustes se conservan al recargar',g);

  await p.click('#menuBtn');
  await p.click('#aaBtn');await p.click('#lecReset');
  const z=await p.evaluate(function(){return JSON.parse(localStorage.getItem('aprende-tecnologia:ajustes'))});
  r.cumple(z.tema==='auto'&&z.escala===1&&z.fuente==='normal'&&z.ancho==='normal','Restablecer vuelve a los valores iniciales',z);
  r.igual(z.barra,'cerrada','Restablecer no toca la barra lateral');
  r.igual(await p.getAttribute('#lecReset','aria-disabled'),'true','Restablecer queda no disponible cuando no hay nada que restablecer');

  await p.mouse.click(640,600);
  r.cumple(await p.isHidden('#lectura'),'un clic fuera cierra el panel');
  await p.click('#aaBtn');
  for(let i=0;i<40;i++)await p.keyboard.press('Tab');
  r.cumple(await p.isHidden('#lectura'),'el panel se cierra cuando el foco sale de él con Tab');
  r.cumple(p.errores.length===0,'sin errores al usar el panel',p.errores);
  await cerrar(p);

  /* Si el sistema pide más contraste, se activa solo y el panel lo dice */
  const q=await pagina(browser,{contraste:'more'});
  await q.goto(base+'ayuda.html');await listo(q);
  r.igual(await q.evaluate(function(){return document.documentElement.dataset.contrast}),'high','el alto contraste se activa si el sistema lo pide');
  await q.click('#aaBtn');
  r.cumple(/sistema pide más contraste/.test(await q.textContent('#lecCon')),'el panel avisa que el sistema pidió más contraste');
  await cerrar(q);

  /* Lo más exigente: 150%, espacios amplios y cada fuente, con el panel abierto */
  for(const pag of ['ayuda','inicio'])for(const ancho of [390,1280])for(const fuente of ['normal','atkinson','opendyslexic'])
  for(const [tema,contraste] of [['light','normal'],['dark','high']]){
    const s=await pagina(browser,{ancho:ancho,alto:844,ajustes:{tema:tema,contraste:contraste,fuente:fuente,escala:1.5,espaciado:'amplio',interlineado:'amplio',ancho:'amplio'}});
    await s.goto(base+pag+'.html');await listo(s);
    await s.evaluate(function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});
    await s.click('#aaBtn');await s.waitForTimeout(150);
    const et=pag+' '+ancho+'px '+fuente+' '+tema+'/'+contraste+' ×1.5 amplio, panel abierto';
    const v=await s.evaluate(function(){
      const l=document.getElementById('lectura'),rc=l.getBoundingClientRect();
      return {dentro:rc.left>=0&&rc.right<=innerWidth,interno:l.scrollWidth-l.clientWidth,abajo:rc.bottom<=innerHeight+1};
    });
    r.cumple(v.dentro&&v.interno<=0,et+': el panel cabe en la pantalla',v);
    r.cumple(v.abajo,et+': el panel termina dentro de la pantalla',v);
    await revisar(s,r,et);
    await cerrar(s);
  }
});
