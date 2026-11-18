/* Comprobaciones propias de cada lección para 13-temas.js. Cada función recibe la página (con la lección ya
   cargada y movimiento reducido) y el registro r. Este archivo no es una prueba: no empieza con número,
   así que todas.js no lo corre solo. */
'use strict';
module.exports=function(txt,demo){
  function clic(p,n,sel){return demo(p,n).locator(sel).first().click()}
  async function rango(p,sel,v){await p.$eval(sel,function(x,v){x.value=v;x.dispatchEvent(new Event('input',{bubbles:true}))},v)}
  /* Terminal simulada: escribe una línea en la terminal del laboratorio n y contesta lo que pregunte (contraseñas, S/n).
     Espera a que vuelva a mostrar un prompt: el de la terminal o el de una pregunta. */
  async function esperar(d){await d.locator('.term-ps-v').evaluate(function(e){return new Promise(function(res){(function f(){if(e.textContent)res();else setTimeout(f,25)})()})})}
  async function teclear(p,n,linea,resp){
    const d=demo(p,n),inp=d.locator('.term-cmd');
    await inp.fill(linea);await inp.press('Enter');await esperar(d);
    for(const v of resp||[]){await inp.fill(v);await inp.press('Enter');await esperar(d)}
  }
  async function sesion(p,r,n,lineas,total,etiqueta){
    for(const l of lineas){if(Array.isArray(l))await teclear(p,n,l[0],l.slice(1));else await teclear(p,n,l)}
    const d=demo(p,n),hechas=(await d.locator('.term-ej-n').textContent()).trim();
    r.cumple(hechas===total+' de '+total&&await d.locator('.term-fin').isVisible(),etiqueta+': se completan los '+total+' ejercicios escribiendo los comandos',
      {hechas:hechas,pendiente:await d.locator('.term-ej-l li.act').textContent().catch(function(){return ''}),salida:(await d.locator('.term-log').textContent()).slice(-600)});
    return d;
  }
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
  },

  'contrasenas':async function(p,r){
    r.cumple(await txt(p,'#fzBits')==='35 bits'&&await p.getAttribute('#fzStat','data-k')==='bad'&&/palabra seguida de números/.test(await txt(p,'#fzMsg')),'«Mexico2024»: una palabra con números se adivina pronto');
    await p.fill('#fzIn','password');
    r.cumple(await txt(p,'#fzOff')==='Al instante'&&/más usadas/.test(await txt(p,'#fzMsg')),'«password» está entre las más usadas');
    await p.fill('#fzIn','tren-nube-limon-faro-cobre');
    r.cumple(await p.getAttribute('#fzStat','data-k')==='good'&&parseInt(await txt(p,'#fzBits'),10)>100,'una frase larga es muy fuerte');
    r.cumple((await txt(p,'#frOut')).split('-').length===6&&await txt(p,'#frBits')==='48 bits'&&await txt(p,'#frBits2')==='78 bits','6 palabras: 48 bits con esta lista, 78 con una de 7,776');
    await clic(p,1,'[data-v="4"]');
    r.cumple((await txt(p,'#frOut')).split('-').length===4&&await txt(p,'#frBits')==='32 bits','4 palabras: 32 bits');
    await p.waitForFunction(function(){return document.querySelectorAll('#hsOut dd').length===2});
    const sha=require('crypto').createHash('sha256').update('gato123').digest('hex');
    r.igual(await txt(p,'#hsOut div:first-child dd'),sha,'calcula el SHA-256 real de «gato123»');
    r.cumple(/gato124/.test(await txt(p,'#hsOut'))&&/de los 64 dígitos/.test(await txt(p,'#hsMsg')),'compara con «gato124» y cuenta cuántos dígitos cambian');
    await p.check('#hsSal');
    await p.waitForFunction(function(){return /Ana/.test(document.getElementById('hsOut').textContent)});
    const h=await p.$$eval('#hsOut dd',function(d){return d.map(function(x){return x.textContent})});
    r.cumple(h.length===2&&h[0]!==h[1]&&h[0]!==sha,'con sal, la misma contraseña da hashes distintos');
  },

  'cifrado':async function(p,r){
    r.igual(await txt(p,'#ceOut'),'DWDFDU DÑ DODPHFHU','«ATACAR AL AMANECER» con desplazamiento 3 (con Ñ)');
    await p.click('#ceRomper');
    r.cumple(await p.locator('#ceTodas li').count()===26&&await txt(p,'#ceTodas li.ok b')==='3','probando las 26 claves, solo la 3 da el mensaje');
    r.cumple(/«b»/.test(await txt(p,'#xoTab .xo-f.ci'))&&/«H»/.test(await txt(p,'#xoTab .xo-f.de')),'H XOR 00101010 = b, y otra vez XOR regresa a H');
    await clic(p,1,'#xoK [data-v="0"]');
    r.cumple(/«H»/.test(await txt(p,'#xoTab .xo-f.ci'))&&/no cambia nada/.test(await txt(p,'#xoMsg')),'con una clave de ceros no cambia nada');
    r.cumple(/misma clave secreta, 2,/.test(await txt(p,'#dhMsg')),'con a = 6 y b = 15, los dos llegan a la clave 2');
    await rango(p,'#dhA',11);await rango(p,'#dhB',7);
    const k=await p.$$eval('.dh-k',function(e){return e.map(function(x){return x.textContent})});
    r.cumple(k.length===2&&k[0]===k[1],'con otros secretos también coinciden',k);
  },

  'phishing':async function(p,r){
    const OK=[1,0,1,0,0,0,1];
    let homo='';
    for(let k=0;k<OK.length;k++){
      await p.click(OK[k]?'#peBien':'#peMal');
      if(k===5)homo=await txt(p,'#peMsg');
      if(k===1)r.cumple(/verificar-cuenta\.example/.test(await txt(p,'#peMsg')),'explica cuál es el dominio real de un subdominio engañoso');
      if(k<OK.length-1)await p.click('#peSig');
    }
    r.cumple(/aciertos: 7 de 7/.test(await txt(p,'#peCuenta')),'contestando bien, 7 de 7');
    r.cumple(/xn--/.test(homo),'la letra cirílica se delata como xn--…',homo);
    await p.click('#peSig');
    await p.click('#peBien');await p.click('#peSig');await p.click('#peBien');
    r.cumple(await p.getAttribute('#peStat','data-k')==='bad'&&/aciertos: 1 de 2/.test(await txt(p,'#peCuenta')),'si caes en la trampa, lo dice');
    await p.click('#pmMsg .pm-s >> nth=0');
    r.cumple(/Saludo genérico/.test(await txt(p,'#pmExp'))&&/1 de 6/.test(await txt(p,'#pmN')),'tocar una señal la explica');
    await p.click('#pmTodas');
    r.igual(await txt(p,'#pmN'),'Señales encontradas: 6 de 6','el SMS tiene 6 señales');
    await clic(p,1,'[data-v="1"]');
    r.igual(await txt(p,'#pmN'),'Señales encontradas: 0 de 6','el correo del banco también tiene 6');
  },

  'malware':async function(p,r){
    await rango(p,'#gsPct',0);await p.click('#gsTodo');
    r.igual(await txt(p,'#gsInf'),'100 de 100','sin parches, el gusano infecta toda la red');
    await rango(p,'#gsPct',70);await p.click('#gsTodo');
    const n=parseInt(await txt(p,'#gsInf'),10);
    r.cumple(n<30&&/a salvo/.test(await txt(p,'#gsMsg')),'con 70 % actualizados, el gusano se detiene pronto',n);
    await p.click('#rbAtaque');
    r.cumple(await p.getAttribute('#rbStat','data-k')==='bad'&&await p.locator('#rbCopias li.mal').count()===1,'sin respaldo, pierdes los archivos');
    await clic(p,1,'[data-v="1"]');await p.click('#rbAtaque');
    r.cumple(await p.getAttribute('#rbStat','data-k')==='bad'&&await p.locator('#rbCopias li.mal').count()===2,'la memoria USB conectada también se cifra');
    await clic(p,1,'[data-v="4"]');await p.click('#rbAtaque');
    r.cumple(await p.getAttribute('#rbStat','data-k')==='good'&&await p.locator('#rbCopias li.bien').count()===2,'con la regla 3-2-1 recuperas todo');
  },

  'como-funciona':async function(p,r){
    await p.click('#clTema [data-v="dark"]');
    r.cumple(await p.evaluate(function(){return document.documentElement.getAttribute('data-theme')==='dark'&&AT.ajustes.get('tema')==='dark'}),'el laboratorio cambia el tema real de OneLearn');
    await p.click('#clTam [data-v="1"]');
    r.igual(await txt(p,'#clTamV'),'115 %','A+ sube la letra al 115 %');
    await p.click('#clFue [data-v="opendyslexic"]');
    r.igual(await p.evaluate(function(){return AT.ajustes.get('fuente')}),'opendyslexic','y cambia la fuente');
    await p.click('#clReset');
    r.cumple(await txt(p,'#clTamV')==='100 %'&&await p.evaluate(function(){return AT.ajustes.esInicial()}),'«Volver a como estaba» restablece la lectura');
    await p.locator('body').press('j');await p.waitForTimeout(150);await p.locator('body').press('k');await p.waitForTimeout(150);
    r.igual(await p.locator('#caLista li.ok').count(),2,'presionar J y K los marca como probados');
    r.cumple(await p.locator('#cdKpis .kpi').count()===5&&await txt(p,'#cdKpis .kpi:first-child b')==='0','muestra lo que hay guardado en el navegador');
    await p.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-cf',titulo:'Prueba',contenido:{type:'doc',content:[]}})});
    await p.waitForFunction(function(){return document.querySelector('#cdKpis .kpi:first-child b').textContent==='1'});
    r.cumple(true,'al guardar un documento, el contador se actualiza solo');
    await p.click('#cdAbrir');
    r.cumple(await p.evaluate(function(){return document.querySelector('dialog.tus-datos').open}),'«Abrir Tus datos» abre la ventana real');
    await p.keyboard.press('Escape');
    await p.click('#ciDisp [data-v="ios"]');
    r.cumple(/Agregar a inicio/.test(await txt(p,'#ciPasos')),'para iPhone explica «Agregar a inicio»');
    await p.click('#ciDisp [data-v="android"]');
    r.cumple(/Instalar app/.test(await txt(p,'#ciPasos')),'para Android explica «Instalar app»');
  },

  'que-es-ia':async function(p,r){
    r.cumple(await txt(p,'#rgOk')==='7 de 12'&&await txt(p,'#rgFn')==='5','sin reglas, todo el spam se cuela');
    for(const k of [1,3,4])await p.check('#rgReglas input[data-r="'+k+'"]');
    r.cumple(await txt(p,'#rgOk')==='11 de 12'&&await txt(p,'#rgFp')==='1','con tres reglas a mano: 11 de 12, con un mensaje normal marcado como spam');
    await p.click('#rgAprender');
    r.cumple(await txt(p,'#rgOk')==='12 de 12'&&await p.isVisible('#rgPesos')&&await p.isDisabled('#rgReglas input[data-r="0"]'),'aprendiendo de los ejemplos, el perceptrón acierta los 12');
    await p.click('#rgManual');
    r.igual(await txt(p,'#rgOk'),'11 de 12','«Volver a mis reglas» regresa al filtro manual');
    const SI=[1,0,1,0,1,0,1,0];
    for(let k=0;k<SI.length;k++){await p.click(SI[k]?'#dnSi':'#dnNo');if(k<SI.length-1)await p.click('#dnSig')}
    r.cumple(/aciertos: 8/.test(await txt(p,'#dnCuenta')),'contestando bien, 8 de 8');
  },

  'aprendizaje-automatico':async function(p,r){
    r.igual(await txt(p,'#arErr'),'2.030','la recta inicial tiene un error de 2.03');
    await p.click('#arEntrenar');
    const e=parseFloat(await txt(p,'#arErr'));
    r.cumple(e<0.03&&await txt(p,'#arMv')==='0.49'&&/Muy buen ajuste/.test(await txt(p,'#arMsg')),'el descenso de gradiente llega a la mejor recta (pendiente 0.49)',e);
    r.cumple(/dice: perro/.test(await txt(p,'#vcMsg')),'un animal de 9 kg y 33 cm: sus 3 vecinos son perros');
    await rango(p,'#vcPeso',4);await rango(p,'#vcAlt',24);
    r.cumple(/dice: gato/.test(await txt(p,'#vcMsg')),'uno de 4 kg y 24 cm: gato');
    const prueba3=parseFloat(await txt(p,'#sjEp'));
    await clic(p,2,'[data-v="9"]');
    const ep9=await txt(p,'#sjEp');
    r.cumple(await txt(p,'#sjEe')==='0.000'&&(ep9==='más de 100'||parseFloat(ep9)>prueba3*3),'la curva muy flexible memoriza: error 0 en entrenamiento y mucho mayor en prueba',[prueba3,ep9]);
  },

  'redes-neuronales':async function(p,r){
    await clic(p,0,'[data-v="AND"]');
    r.cumple(/compuerta AND/.test(await txt(p,'#nnMsg'))&&await txt(p,'#nnTab tr:last-child td:last-child')==='1','con los pesos de AND, solo 1 y 1 dan 1');
    await rango(p,'#nnW1',6);await rango(p,'#nnW2',6);await rango(p,'#nnB',-3);
    r.cumple(/compuerta OR/.test(await txt(p,'#nnMsg')),'con pesos 6, 6 y sesgo −3 se vuelve OR');
    await p.click('#xrA');
    r.cumple(/→ 1$/.test(await txt(p,'#xrO')),'XOR con A = 1 y B = 0 da 1');
    await p.click('#xrB');
    r.cumple(/→ 0$/.test(await txt(p,'#xrO')),'XOR con las dos en 1 da 0');
    await p.click('#gdDiez');
    r.cumple(/Llegó al mínimo/.test(await txt(p,'#gdMsg')),'con tasa 0.6, en 10 pasos llega al mínimo');
    await clic(p,2,'[data-v="0.1"]');await p.click('#gdDiez');
    r.cumple(/muy despacio/.test(await txt(p,'#gdMsg')),'con 0.1 avanza muy despacio');
    await clic(p,2,'[data-v="2.2"]');await p.click('#gdDiez');
    r.cumple(/error crece/.test(await txt(p,'#gdMsg')),'con 2.2 el entrenamiento diverge');
  },

  'modelos-lenguaje':async function(p,r){
    r.cumple(/parque/.test(await txt(p,'#sgProb .br.on'))&&await txt(p,'#sgProb .br.on b')==='25 %','después de «el», lo más probable es «parque» (25 %)');
    await rango(p,'#sgT',0.1);
    r.cumple(parseInt(await txt(p,'#sgProb .br.on b'),10)>80,'con temperatura 0.1, «parque» se lleva casi toda la probabilidad (de 25 % a más de 80 %)');
    await p.click('#sgGreedy');
    r.cumple(await txt(p,'#sgFrase')==='el parque.'&&await p.getAttribute('#sgUna','aria-disabled')==='true','eligiendo siempre la más probable: «el parque.»');
    await clic(p,0,'[data-v="los"]');await p.click('#sgFin');
    const f=await txt(p,'#sgFrase');
    r.cumple(f.indexOf('los ')===0&&/\.$/.test(f),'genera una frase que empieza con «los» y termina en punto',f);
    await p.click('#veSel [data-v="rey"]');
    r.cumple(/príncipe, princesa, reina/.test(await txt(p,'#veMsg')),'las vecinas de «rey» son príncipe, princesa y reina');
    await p.click('#veAnalogia');
    r.cumple(/caes justo en «reina»/.test(await txt(p,'#veMsg')),'rey − hombre + mujer ≈ reina');
  },

  'terminal':async function(p,r){
    await clic(p,0,'[data-v="2"]');
    r.cumple(await p.locator('#tpLista li').count()===4&&/«error»/.test(await txt(p,'#tpMsg')),'grep -i error app.log tiene 4 partes y se explica');
    r.igual(await p.locator('#tpLinea .tp-o').count(),1,'-i se marca como opción');
    await sesion(p,r,1,['pwd','ls','cd Documentos','ls -l','cd escuela','cat tarea-redes.txt','cd /etc','ls','cd','ls -a'],7,'Tus primeros pasos');
    await sesion(p,r,2,['cd Descargas','ls','mkdir Fotos PDF','mv *.jpg Fotos/','mv *.pdf PDF/','cp notas-clase.txt ~/Documentos/','rm instalador-zoom.deb','mv captura.png pantalla.png','echo "Ordenado" > leeme.txt'],8,'Ordena tu carpeta');
    const d=await sesion(p,r,3,['cd registros','head -n 5 app.log','tail -n 3 app.log','grep ERROR app.log','grep ERROR app.log | wc -l','grep ERROR app.log > errores.txt','grep -c "login marta" app.log','find ~ -name "*.log"'],7,'Investiga un registro');
    r.cumple(/\n4\n/.test(await d.locator('.term-log').textContent()),'grep ERROR app.log | wc -l da 4');
  },

  'permisos':async function(p,r){
    await p.fill('#pcNum','750');
    r.igual(await txt(p,'#pcLetras'),'-rwxr-x---','750 son -rwxr-x---');
    r.igual(await txt(p,'#pcCmdL'),'chmod u=rwx,g=rx,o= archivo','y en letras, u=rwx,g=rx,o=');
    await p.check('[data-q="o"][data-p="r"]');
    r.igual(await p.inputValue('#pcNum'),'754','marcar «Otros: leer» suma 4: 754');
    await clic(p,0,'#pcPre [data-v="777"]');
    r.igual(await p.getAttribute('#pcStat','data-k'),'bad','777 es un riesgo');
    await clic(p,0,'#pcTipo [data-v="d"]');await p.fill('#pcNum','744');
    r.cumple(await p.getAttribute('#pcStat','data-k')==='warn'&&/sin x/.test(await txt(p,'#pcMsg')),'una carpeta 744 avisa que r sin x no deja entrar');
    await sesion(p,r,1,['ls -l','./respaldo.sh','chmod +x respaldo.sh','./respaldo.sh','chmod 600 diario.txt','chmod 770 compartido','cat /etc/shadow',['sudo cat /etc/shadow','clave'],'ls -l /etc/shadow'],8,'Permisos en la práctica');
    const d=await sesion(p,r,2,[['sudo adduser luis','clave','secreto123','secreto123','Luis',''],'sudo useradd -m marta','sudo groupadd contabilidad','sudo usermod -aG contabilidad luis','sudo usermod -aG contabilidad marta',
      'sudo mkdir /srv/contabilidad','sudo chown root:contabilidad /srv/contabilidad','sudo chmod 770 /srv/contabilidad','sudo -u marta touch /srv/contabilidad/prueba.txt','ls /srv/contabilidad'],8,'Carpeta de contabilidad');
    r.cumple(/'\/srv\/contabilidad': Permiso denegado/.test(await d.locator('.term-log').textContent()),'ana, que no es del grupo, no puede ver la carpeta');
  },

  'procesos':async function(p,r){
    await sesion(p,r,0,['uptime','top','kill 2290','ps aux | grep reporte','sleep 300 &','jobs','kill %1','free -h','df -h'],8,'La computadora va lenta');
    await p.click('#paReinicio');
    r.cumple(await p.getAttribute('#paStat','data-k')==='warn'&&/nginx estaba encendido pero no habilitado/.test(await txt(p,'#paMsg'))&&/cups estaba apagado pero habilitado/.test(await txt(p,'#paMsg')),
      'al reiniciar, nginx (no habilitado) se apaga y cups (habilitado) arranca');
    r.igual(await txt(p,'#paAct'),'3 de 4','quedan encendidos los 3 habilitados');
    await p.click('#paReinicio');
    r.igual(await p.getAttribute('#paStat','data-k'),'good','un segundo reinicio ya no cambia nada');
    await sesion(p,r,2,['systemctl status ssh','journalctl -u ssh',['sudo systemctl start ssh','clave'],'sudo systemctl enable ssh','ss -tln','grep systemctl /var/log/auth.log','sudo systemctl restart cron'],7,'Nadie se puede conectar');
  },

  'apt':async function(p,r){
    r.igual(await txt(p,'#adN'),'2','nginx en un Ubuntu normal: 2 paquetes nuevos');
    await p.check('#adMin');
    r.igual(await txt(p,'#adN'),'3','en un servidor mínimo también falta libssl3t64');
    await clic(p,0,'#adPq [data-v="git"]');
    r.igual(await txt(p,'#adN'),'6','git en un servidor mínimo: 6 paquetes');
    await sesion(p,r,1,['tree',['sudo apt install tree','clave'],'sudo apt update','sudo apt install tree','tree','apt search procesos','apt show htop',['sudo apt install htop',''],'htop',['sudo apt upgrade','']],8,'Instala tus herramientas');
    await sesion(p,r,2,[['sudo apt install nginx','clave',''],'systemctl status nginx','curl localhost','ss -tln','echo "<h1>Hola desde mi servidor</h1>" | sudo tee /var/www/html/index.html','curl localhost',['sudo apt remove nginx',''],['sudo apt autoremove','']],7,'Instala un servidor web');
    },
  'que-es-red':async function(p,r){
    await p.click('#qcFalla');
    r.cumple(await p.getAttribute('#qcStat','data-k')==='bad'&&/Sin internet: PC, Impresora, NAS, Celular, Laptop/.test(await txt(p,'#qcMsg')),'si falla el router, nadie tiene internet');
    await clic(p,0,'#qcEq [data-v="switch"]');await p.click('#qcFalla');
    r.cumple(/Sin internet: PC, Impresora, NAS\./.test(await txt(p,'#qcMsg')),'si falla el switch, solo los equipos con cable se quedan sin internet');
    await clic(p,1,'#qtArch [data-v="2000"]');
    r.cumple(/Fibra · 53\.3 s/.test(await txt(p,'#qtRapida')),'una película de 2 GB tarda 53.3 s por fibra de 300 Mbps');
    await sesion(p,r,2,['ip a','ip route','ping -c 3 192.168.1.1','ping -c 3 example.com','resolvectl status','hostname -I','ip neigh'],7,'Conoce tu red');
  },

  'modelo-osi':async function(p,r){
    for(let k=0;k<3;k++)await p.click('#oeSig');
    r.igual(await txt(p,'#oeTam'),'178 bytes','con HTTP, TCP, IP y Ethernet el paquete mide 178 bytes');
    r.cumple(await p.locator('#oePq .oe-c').count()===4,'se ven las cuatro capas encapsuladas');
    const resp=[1,2,3,2,3,4,4,7,1,3,7,6];
    for(let k=0;k<resp.length;k++)await p.click('#ocLista button[data-k="'+k+'"][data-v="'+resp[k]+'"]');
    r.cumple(/Resultado: 12 de 12/.test(await txt(p,'#ocPunt')),'con todas bien, 12 de 12');
  },

  'ethernet':async function(p,r){
    await p.fill('#emIn','b8:27:eb:12:9a:04');
    r.igual(await txt(p,'#emOui'),'Raspberry Pi Foundation','b8:27:eb es de Raspberry Pi');
    await p.fill('#emIn','ff:ff:ff:ff:ff:ff');
    r.igual(await txt(p,'#emDest'),'Todos (difusión)','ff:ff:ff:ff:ff:ff es la difusión');
    await p.fill('#emIn','3a:7f:c2:51:0e:aa');
    r.igual(await txt(p,'#emAsig'),'El sistema (local)','una MAC aleatoria tiene el bit de dirección local');
    await p.click('#esEnviar');
    r.cumple(await p.getAttribute('#esStat','data-k')==='warn'&&await p.locator('#esTabla tr').count()===1,'A → C con la tabla vacía: el switch inunda y aprende a A');
    await clic(p,1,'#esDe [data-v="2"]');await clic(p,1,'#esA [data-v="0"]');await p.click('#esEnviar');
    r.cumple(await p.getAttribute('#esStat','data-k')==='good'&&await p.locator('.es-pc.rec').count()===1,'C → A: ya conoce a A y se la entrega solo a ella');
    await p.check('#esHub');await p.click('#esEnviar');
    r.igual(await p.locator('.es-pc.rec').count(),3,'un hub la repite a todos');
    await sesion(p,r,2,['ip link','ethtool enp0s3','ip neigh','ping -c 2 192.168.1.30','ip neigh','ping -c 2 192.168.1.99'],6,'La MAC de tus vecinos');
  },

  'wifi':async function(p,r){
    r.igual(await p.getAttribute('#wcStat','data-k'),'bad','el canal 3 se encima con los vecinos');
    await rango(p,'#wcCan',11);
    r.igual(await p.getAttribute('#wcStat','data-k'),'good','el canal 11 es buena elección');
    r.cumple(/6 GHz/.test(await txt(p,'#wsBarras .br.on')),'cerca y sin muros, gana 6 GHz');
    await rango(p,'#wsDist',25);await rango(p,'#wsMuros',3);
    r.cumple(/2\.4 GHz/.test(await txt(p,'#wsBarras .br.on'))&&/única que aguanta/.test(await txt(p,'#wsMsg')),'a 25 m y con 3 muros, solo aguanta 2.4 GHz');
    r.igual(await p.getAttribute('#wqStat','data-k'),'bad','el router de fábrica es inseguro');
    await clic(p,2,'#wqCif [data-v="wpa3"]');await clic(p,2,'#wqClave [data-v="larga"]');
    await p.uncheck('#wqWps');await p.uncheck('#wqAdmin');await p.check('#wqInv');await p.check('#wqFw');
    r.cumple(await txt(p,'#wqPunt')==='100 de 100'&&await p.getAttribute('#wqStat','data-k')==='good','con todo corregido: 100 de 100');
  },

  'subredes':async function(p,r){
    await p.fill('#scIn','10.20.30.40/20');
    r.cumple(await txt(p,'#scRed')==='10.20.16.0/20'&&await txt(p,'#scDif')==='10.20.31.255'&&await txt(p,'#scHosts')==='4,094','10.20.30.40/20: red 10.20.16.0, difusión 10.20.31.255, 4,094 equipos');
    await p.fill('#scIn','10.1.2.3 255.255.240.0');
    r.igual(await txt(p,'#scRed'),'10.1.0.0/20','también entiende la máscara escrita completa');
    r.cumple(await p.getAttribute('#svStat','data-k')==='good'&&/192\.168\.10\.0\/26/.test(await txt(p,'#svTabla tr:first-child')),'VLSM: Ventas (50) recibe la primera /26');
    await p.fill('#svIn input[data-i="0"]','200');
    r.igual(await p.getAttribute('#svStat','data-k'),'bad','con 200 equipos en Ventas ya no cabe en la /24');
    const ip=await txt(p,'#spIp');
    const esp=await p.evaluate(function(t){const k=t.split('/');return AT.ip.calcular(k[0],+k[1])},ip);
    await p.fill('#spRed',esp.red);await p.fill('#spDif',esp.difusion);await p.fill('#spPri',esp.primera);await p.fill('#spUlt',esp.ultima);await p.fill('#spHosts',String(esp.hosts));
    await p.click('#spRev');
    r.cumple(await p.getAttribute('#spStat','data-k')==='good'&&await txt(p,'#spPunt')==='1 de 1 ejercicios completos','un ejercicio al azar se califica bien ('+ip+')');
    await p.click('#spOtro');await p.fill('#spRed','1.2.3.4');await p.click('#spRev');
    r.igual(await p.getAttribute('#spStat','data-k'),'bad','las respuestas en blanco o mal se marcan');
  },

  'dhcp-nat':async function(p,r){
    for(let k=0;k<4;k++)await p.click('#ddSig');
    r.cumple(await p.getAttribute('#ddStat','data-k')==='good'&&await p.isVisible('.dd-res.ok'),'DORA completo: la laptop tiene IP');
    await clic(p,0,'#ddEsc [data-v="apagado"]');
    for(let k=0;k<3;k++)await p.click('#ddSig');
    r.cumple(await p.getAttribute('#ddStat','data-k')==='bad'&&/169\.254/.test(await txt(p,'#ddCaja')),'sin servidor DHCP, se pone una 169.254');
    await clic(p,1,'#dnAcc [data-v="laptop"]');
    r.cumple(/192\.168\.1\.20/.test(await txt(p,'#dnTabla'))&&/198\.51\.100\.77:40001/.test(await txt(p,'#dnTabla')),'la laptop sale como 198.51.100.77:40001');
    await clic(p,1,'#dnAcc [data-v="respuesta"]');
    r.cumple(/Laptop/.test(await txt(p,'#dnMsg')),'la respuesta vuelve a la laptop');
    await clic(p,1,'#dnAcc [data-v="externo"]');
    r.igual(await p.getAttribute('#dnStat','data-k'),'bad','sin reenvío, una conexión de afuera se descarta');
    await p.check('#dnFwd');await clic(p,1,'#dnAcc [data-v="externo"]');
    r.igual(await p.getAttribute('#dnStat','data-k'),'good','con reenvío, llega a la NAS');
    const yaml='network:\\n  version: 2\\n  ethernets:\\n    enp0s3:\\n      dhcp4: false\\n      addresses: [192.168.1.60/24]\\n      routes:\\n        - to: default\\n          via: 192.168.1.1\\n      nameservers:\\n        addresses: [192.168.1.1]\\n';
    await sesion(p,r,2,['ip a','curl ifconfig.me',['sudo dhclient -v','x'],'sudo cat /etc/netplan/50-cloud-init.yaml','printf "'+yaml+'" | sudo tee /etc/netplan/50-cloud-init.yaml','sudo netplan apply','ip a','ping -c 2 example.com'],7,'IP fija para el servidor');
  },

  'ipv6':async function(p,r){
    await p.fill('#vaIn','2001:db8::1');
    r.cumple(await txt(p,'#vaComp')==='2001:0db8:0000:0000:0000:0000:0000:0001'&&/Documentación/.test(await txt(p,'#vaTipo')),'2001:db8::1 completa tiene 8 grupos y es de documentación');
    const q=await txt(p,'#vaQ');
    await p.fill('#vaResp',await p.evaluate(function(t){return AT.ip.comprimir6(t)},q));await p.click('#vaRev');
    r.igual(await p.getAttribute('#vaStat','data-k'),'good','la práctica de abreviar se califica bien ('+q+')');
    r.igual(await txt(p,'#vsDir'),'2001:db8:4a1:20:a00:27ff:fe3a:5c91','EUI-64 de 08:00:27:3a:5c:91');
    await p.check('#vsPriv');
    r.igual(await p.getAttribute('#vsStat','data-k'),'good','con privacidad, identificador aleatorio');
    await sesion(p,r,2,['ip -6 a','ip -br a','ping -c 2 ::1','dig AAAA example.com +short','ping -6 -c 2 example.com'],5,'IPv6 desde la terminal');
  }

  };
};
