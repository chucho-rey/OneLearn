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
  },

  'sistema-operativo':async function(p,r){
    for(let k=0;k<3;k++)await p.click('#llSig');
    r.cumple(await p.getAttribute('.ll-c.on','data-c')==='1'&&/modo kernel/.test(await txt(p,'#llMsg')),'al abrir un archivo, el tercer paso ocurre en el kernel');
    for(let k=0;k<3;k++)await p.click('#llSig');
    r.igual(await p.getAttribute('#llSig','aria-disabled'),'true','al terminar la llamada no hay más pasos');
    r.cumple(await txt(p,'#plEsp')==='5.0 ms'&&await txt(p,'#plCam')==='3','en orden de llegada: 5 ms de espera promedio y 3 cambios');
    await clic(p,1,'[data-v="sjf"]');
    r.igual(await txt(p,'#plEsp'),'4.0 ms','el más corto primero: 4 ms de espera promedio');
    await clic(p,1,'[data-v="rr"]');
    r.cumple(await txt(p,'#plEsp')==='4.5 ms'&&await txt(p,'#plRes')==='2.0 ms'&&await txt(p,'#plCam')==='6'&&await p.locator('#plTab td.run').count()===13,'por turnos: primer turno a los 2 ms en promedio, con 6 cambios de contexto');
  },

  'memoria-virtual':async function(p,r){
    r.igual(await txt(p,'#trFis'),'21,714','la dirección 1,234 está en el marco 5: 21,714');
    await clic(p,0,'[data-v="13000"]');
    r.igual(await txt(p,'#trFis'),'29,384','13,000 = página 3 (marco 7), desplazamiento 712: 29,384');
    await clic(p,0,'[data-v="9000"]');
    r.cumple(await p.getAttribute('#trStat','data-k')==='warn'&&/Fallo de página/.test(await txt(p,'#trMsg')),'9,000 cae en una página que está en el disco');
    await clic(p,0,'[data-v="50000"]');
    r.cumple(await p.getAttribute('#trStat','data-k')==='bad'&&/segmentation fault/.test(await txt(p,'#trMsg')),'50,000 no es del proceso: violación de segmento');
    await p.click('#rpTodo');
    r.igual(await txt(p,'#rpFal'),'15','FIFO: 15 fallos');
    await clic(p,1,'[data-v="lru"]');await p.click('#rpTodo');
    r.igual(await txt(p,'#rpFal'),'12','LRU: 12 fallos');
    await clic(p,1,'[data-v="opt"]');await p.click('#rpTodo');
    r.igual(await txt(p,'#rpFal'),'9','la regla óptima: 9 fallos');
  },

  'compiladores':async function(p,r){
    r.igual(await p.locator('#lxTok .tk').count(),7,'«total = precio * cantidad - descuento» tiene 7 tokens');
    await p.fill('#lxIn','precio @ 2');
    r.cumple(await p.getAttribute('#lxStat','data-k')==='bad'&&/«@»/.test(await txt(p,'#lxMsg')),'un símbolo desconocido es un error léxico');
    await p.fill('#lxIn','<img src=x onerror=alert(1)>');
    r.igual(await p.locator('#lxTok img').count(),0,'lo que escribes nunca se interpreta como HTML');
    r.cumple(/Resultado: 14/.test(await txt(p,'#asMsg')),'2 + 3 * 4 = 14');
    await clic(p,1,'[data-v="(2 + 3) * 4"]');
    r.cumple(/Resultado: 20/.test(await txt(p,'#asMsg'))&&await p.locator('#asSvg .as-n').count()===5,'(2 + 3) * 4 = 20, con 5 nodos');
    await clic(p,1,'[data-v="10 - 4 - 3"]');
    r.cumple(/Resultado: 3\./.test(await txt(p,'#asMsg')),'10 - 4 - 3 = 3: se agrupa de izquierda a derecha');
    await p.fill('#asIn','2 + * 3');
    r.cumple(await p.getAttribute('#asStat','data-k')==='bad'&&/sintaxis/.test(await txt(p,'#asMsg')),'dos operadores seguidos: error de sintaxis');
    await p.fill('#asIn','z + 1');
    r.cumple(await p.getAttribute('#asStat','data-k')==='warn'&&/no existe/.test(await txt(p,'#asMsg')),'una variable que no existe: error semántico');
    r.igual(await p.locator('#cdIns li').count(),6,'el precio total compila a 6 instrucciones');
    for(let k=0;k<6;k++)await p.click('#cdSig');
    r.igual(await txt(p,'#cdVars'),'total = 110','al ejecutarlas, total = 40 × 3 − 10 = 110');
    await clic(p,2,'#cdPre [data-v="segundos = 60 * 60 * 24"]');
    r.igual(await p.locator('#cdIns li').count(),6,'sin optimizar, los segundos de un día son 6 instrucciones');
    await p.check('#cdOpt');
    r.cumple(await p.locator('#cdIns li').count()===2&&/86,400/.test(await txt(p,'#cdIns')),'con plegado de constantes quedan 2: PON 86,400 y GUARDA');
  },

  'paquetes':async function(p,r){
    r.cumple(await txt(p,'#dvN')==='1'&&await txt(p,'#dvPct')==='20.0 %','un mensaje de 200 bytes va en 1 paquete; el encabezado es un 20 % extra');
    await clic(p,0,'[data-v="3000000"]');
    r.cumple(await txt(p,'#dvN')==='2,055'&&await txt(p,'#dvEnc')==='82.2 KB','una foto de 3 MB son 2,055 paquetes');
    for(let k=0;k<4;k++)await p.click('#ruSig');
    r.cumple(await txt(p,'#ruMs')==='19 ms'&&await txt(p,'#ruSal')==='4 de 4'&&await p.getAttribute('#ruSig','aria-disabled')==='true','el paquete llega por el camino más rápido: 19 ms en 4 saltos');
    await p.check('#ruCorte');
    for(let k=0;k<4;k++)await p.click('#ruSig');
    r.cumple(await txt(p,'#ruMs')==='25 ms'&&/otro camino/.test(await txt(p,'#ruMsg')),'con el enlace B–D cortado, toma otro camino de 25 ms');
    r.igual(await txt(p,'#tcOk'),'10 de 10','con TCP llegan los 10 paquetes');
    await rango(p,'#tcPer',40);await p.click('#tcTcp');
    const tcp=await txt(p,'#tcEnv');
    r.cumple(await txt(p,'#tcOk')==='10 de 10'&&+tcp>10,'con 40 % de pérdida, TCP reenvía hasta que llega todo',tcp);
    await p.click('#tcUdp');
    r.cumple(await txt(p,'#tcOk')!=='10 de 10'&&await txt(p,'#tcEnv')==='10'&&await p.locator('#tcRes .tc-no').count()>0,'con UDP se pierden paquetes y no se reenvían');
    await rango(p,'#tcPer',0);await p.click('#tcUdp');
    r.igual(await txt(p,'#tcOk'),'10 de 10','sin pérdida, UDP también entrega todo');
  },

  'dns':async function(p,r){
    r.cumple(/Privada/.test(await txt(p,'#ipMsg'))&&await txt(p,'#ipBits .ip-o:first-child span')==='11000000','192.168.1.10 es privada; 192 = 11000000');
    await p.fill('#ip0','300');
    r.cumple(await p.getAttribute('#ipStat','data-k')==='bad'&&await p.getAttribute('#ip0','aria-invalid')==='true','300 no cabe en un octeto');
    await clic(p,0,'[data-v="8.8.8.8"]');
    r.cumple(/Pública/.test(await txt(p,'#ipMsg'))&&await p.inputValue('#ip0')==='8','8.8.8.8 es pública');
    r.cumple(await p.getAttribute('#msStat','data-k')==='good'&&await txt(p,'#msRed')==='192.168.1.0/24'&&await txt(p,'#msHost')==='254','con /24, 192.168.1.200 está en la misma red (254 equipos)');
    await clic(p,1,'[data-v="28"]');
    r.cumple(await p.getAttribute('#msStat','data-k')==='warn'&&await txt(p,'#msHost')==='14','con /28 ya son redes distintas (14 equipos por red)');
    await clic(p,1,'[data-v="16"]');await clic(p,1,'[data-v="192.168.2.5"]');
    r.igual(await p.getAttribute('#msStat','data-k'),'good','con /16, 192.168.2.5 sí está en la misma red');
    for(let k=0;k<5;k++)await p.click('#rsSig');
    r.cumple(await txt(p,'#rsMs')==='64 ms'&&await txt(p,'#rsIp')==='198.51.100.24','la primera resolución recorre raíz, TLD y autoritativo: 64 ms');
    await p.click('#rsOtra');await p.click('#rsSig');
    r.cumple(await txt(p,'#rsMs')==='0 ms'&&await p.locator('#rsPasos li').count()===1,'la segunda vez sale de la caché: 0 ms');
  }

  };
};
