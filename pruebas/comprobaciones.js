/* Comprobaciones propias de cada lección para 13-temas.js. Cada función recibe la página (con la lección ya
   cargada y movimiento reducido) y el registro r. Este archivo no es una prueba: no empieza con número,
   así que todas.js no lo corre solo. */
'use strict';
module.exports=function(txt,demo){
  function clic(p,n,sel){return demo(p,n).locator(sel).first().click()}
  async function rango(p,sel,v){await p.$eval(sel,function(x,v){x.value=v;x.dispatchEvent(new Event('input',{bubbles:true}))},v)}
  return {

  'placa-base':async function(p,r){
    r.igual(await txt(p,'#pcBar .br.on b'),'7.88 GB/s','PCIe 4.0 ×4 da unos 7.9 GB/s');
    await clic(p,0,'[data-v="5"]');await clic(p,0,'[data-v="16"]');
    r.igual(await txt(p,'#pcBar .br.on b'),'63.0 GB/s','PCIe 5.0 ×16 da unos 63 GB/s');
    r.igual(await p.getAttribute('#cmStat','data-k'),'bad','un Core i5-14600K no entra en una placa AM5');
    await clic(p,1,'#cmPlaca [data-v="0"]');
    r.cumple(await p.getAttribute('#cmStat','data-k')==='good'&&/Compatibles/.test(await txt(p,'#cmMsg')),'con una Z790 y DDR5 sí es compatible');
    await clic(p,1,'#cmRam [data-v="4"]');
    r.cumple(/Casi/.test(await txt(p,'#cmMsg'))&&await p.locator('#cmRes li.no').count()===1,'con DDR4 falla solo la regla de la RAM');
    await p.check('#arFalla');
    for(let k=0;k<4;k++)await p.click('#arSig');
    r.cumple(await p.locator('#arPasos li.mal').count()===1&&await p.getAttribute('#arSig','aria-disabled')==='true'&&/pitidos/.test(await txt(p,'#arMsg')),'con la RAM mal puesta, el arranque se detiene en el POST');
  },

  'capacitores':async function(p,r){
    r.igual(await txt(p,'#ohI'),'5.00 mA','5 V con 1 kΩ: 5 mA');
    await rango(p,'#ohV',24);await clic(p,0,'[data-v="47"]');
    r.cumple(await p.getAttribute('#ohStat','data-k')==='bad'&&await txt(p,'#ohP')==='12.26 W','24 V en 47 Ω: 12.26 W, demasiado para 1/4 W');
    r.igual(await txt(p,'#srT'),'200 Ω','100 Ω + 100 Ω en serie: 200 Ω');
    await clic(p,1,'[data-v="p"]');
    r.igual(await txt(p,'#srT'),'50 Ω','en paralelo: 50 Ω');
    r.igual(await txt(p,'#rcTau'),'1.0 s','10 kΩ × 100 µF: τ = 1 s');
    await clic(p,2,'[data-v="100000"]');await clic(p,2,'[data-v="0.001"]');
    r.igual(await txt(p,'#rcTau'),'100 s','100 kΩ × 1,000 µF: τ = 100 s');
    await p.click('#rcCargar');
    r.igual(await txt(p,'#rcV'),'5.00 V','«Cargar» llena el capacitor');
  },

  'transistores':async function(p,r){
    r.igual(await txt(p,'#msEst'),'Apagado','sin voltaje en la compuerta, apagado');
    await rango(p,'#msV',1.9);
    r.igual(await txt(p,'#msEst'),'Apagado','por debajo del umbral sigue apagado');
    await rango(p,'#msV',5);
    r.cumple(/Encendido/.test(await txt(p,'#msEst'))&&await txt(p,'#msI')==='20.0 mA'&&await p.locator('#msSvg .ms-ch').count()===1,'con 5 V se forma el canal y pasan 20 mA');
    r.igual(await txt(p,'#cgOut'),'Salida = 0','AND con 0 y 0 da 0');
    await p.click('#cgA');await p.click('#cgB');
    r.igual(await txt(p,'#cgOut'),'Salida = 1','AND con 1 y 1 da 1');
    await clic(p,1,'[data-v="XOR"]');
    r.cumple(await txt(p,'#cgOut')==='Salida = 0'&&await p.locator('#cgTb tr.on').count()===1,'XOR con 1 y 1 da 0, y la tabla marca la fila');
    r.igual(await txt(p,'#smDec'),'5 + 3 = 8','el sumador empieza con 5 + 3 = 8');
    await p.click('#sm [data-f="A"][data-k="0"]');
    r.cumple(await txt(p,'#smDec')==='13 + 3 = 16'&&/no cabe en 4 bits/.test(await txt(p,'#smMsg')),'13 + 3 = 16 ya no cabe en 4 bits');
    r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('data-k')}),'0','el foco se queda en el bit que tocaste');
  },

  'diodos':async function(p,r){
    r.igual(await txt(p,'#poI'),'8.0 mA','1.5 V en directa con 100 Ω: 8 mA');
    await clic(p,0,'[data-v="0"]');
    r.igual(await txt(p,'#poI'),'0 mA','en inversa no pasa corriente');
    await clic(p,1,'[data-v="3"]');
    r.cumple(/rizado/.test(await txt(p,'#reMsg')),'el capacitor alisa la salida');
    r.cumple(await txt(p,'#ldR')==='150 Ω'&&await txt(p,'#ldRc')==='150 Ω','LED rojo a 5 V y 20 mA: 150 Ω');
    await clic(p,2,'#ldF [data-v="12"]');await clic(p,2,'#ldC [data-v="blanco"]');
    r.cumple(await txt(p,'#ldR')==='450 Ω'&&await txt(p,'#ldRc')==='470 Ω'&&await txt(p,'#ldP')==='172 mW','LED blanco a 12 V: 450 Ω exactos, se usa 470 Ω');
    await clic(p,2,'#ldF [data-v="3.3"]');await clic(p,2,'#ldC [data-v="azul"]');
    r.cumple(await txt(p,'#ldR')==='15 Ω'&&/15 Ω/.test(await txt(p,'#ldMsg')),'LED azul a 3.3 V: sobran solo 0.3 V, basta una resistencia de 15 Ω');
  }

  };
};
