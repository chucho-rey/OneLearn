/* Lecciones «Almacenamiento» y «Tarjeta gráfica»: se ven bien en todas las variantes y sus laboratorios calculan bien. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function demo(p,n){return p.locator('.demo').nth(n)}
function txt(p,sel){return p.textContent(sel).then(function(t){return t.trim()})}

prueba('Almacenamiento y Tarjeta gráfica',async function({browser,base,r}){
  /* Se ven bien en celular y escritorio, en los cuatro temas, con letra grande y con OpenDyslexic */
  for(const lec of ['almacenamiento','gpu'])
  for(const [ancho,tema,contraste,escala,fuente] of [[390,'light','normal',1,'normal'],[390,'dark','high',1.5,'opendyslexic'],[1280,'dark','normal',1,'normal'],[1280,'light','high',1.3,'atkinson']]){
    const p=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala,fuente:fuente}});
    await p.goto(base+'lecciones/'+lec+'.html');await listo(p);
    await revisar(p,r,lec+' '+ancho+'px '+tema+'/'+contraste+' ×'+escala+' '+fuente);
    await cerrar(p);
  }

  /* ---------- Almacenamiento ---------- */
  const a=await pagina(browser,{reducir:true});
  await a.goto(base+'lecciones/almacenamiento.html');await listo(a);
  r.igual(await txt(a,'.crumbs'),'Hardware/Almacenamiento','la lección aparece dentro de Hardware');
  r.cumple(await a.isVisible('#side .nv.on[data-id="almacenamiento"] svg use[href="#i-disco"]'),'la barra lateral la marca con su ícono');

  await demo(a,0).locator('[data-v="3"]').click();
  const filas=await a.$$eval('#cpRows .cp-t',function(b){return b.map(function(x){return x.textContent})});
  r.cumple(filas.length===4&&/min/.test(filas[0])&&/s$/.test(filas[3]),'copiar 40,000 archivos: el disco duro tarda minutos y el NVMe segundos',filas);
  r.cumple(/preparando archivos/.test(await txt(a,'#cpMsg')),'explica que con muchos archivos pesa preparar cada uno');

  await demo(a,1).locator('#dkTodo').click();
  r.igual(await txt(a,'#dkT'),'12.5 ms','leer un archivo en orden: solo la primera lectura espera');
  r.cumple(/0\.7 ms/.test(await txt(a,'#dkLista li:nth-child(2)')),'las lecturas seguidas no esperan a que gire el plato');
  r.igual(await a.getAttribute('#dkPaso','aria-disabled'),'true','al terminar, «Siguiente lectura» queda desactivado sin perder el foco');
  await demo(a,1).locator('[data-v="1"]').click();
  await demo(a,1).locator('#dkTodo').click();
  const disperso=parseFloat((await txt(a,'#dkT')).replace(',',''));
  r.cumple(disperso>25,'leer archivos dispersos tarda mucho más',disperso);
  r.cumple(/veces menos/.test(await txt(a,'#dkMsg')),'y compara con un SSD');

  await demo(a,2).locator('[data-v="4"]').click();
  r.cumple(await txt(a,'#ceN')==='16'&&await txt(a,'#ceCap')==='256 GB'&&await a.locator('#ceNiv .ce-n').count()===16,'QLC: 16 niveles y 256 GB por chip');
  await a.click('#ceLeer');
  r.cumple(/lo lee como [01]{4}/.test(await txt(a,'#ceMsg'))&&await a.locator('#ceNiv .ce-n.on').count()===1,'leer una celda traduce su nivel a 4 bits');

  r.igual(await txt(a,'#caWin'),'931 GB','1 TB se ve como 931 GB en Windows');
  await demo(a,3).locator('[data-v="4e12"]').click();
  r.igual(await txt(a,'#caWin'),'3.64 TB','4 TB se ven como 3.64 TB');
  r.cumple(a.errores.length===0,'almacenamiento: sin errores',a.errores);
  /* «Siguiente lección» lleva a Tarjeta gráfica */
  r.igual(await a.getAttribute('a.next','href'),'gpu.html','la siguiente lección es Tarjeta gráfica');
  await cerrar(a);

  /* ---------- Tarjeta gráfica ---------- */
  const g=await pagina(browser,{reducir:true});
  await g.goto(base+'lecciones/gpu.html');await listo(g);
  await g.click('#ptGo');
  r.cumple(await txt(g,'#ptTc')==='48 µs'&&await txt(g,'#ptTg')==='12 µs'&&await g.locator('#ptGpu i.on').count()===384,'con trabajo repartido, la GPU pinta todo 4 veces antes');
  await demo(g,0).locator('[data-v="1"]').click();
  await g.click('#ptGo');
  r.cumple(await txt(g,'#ptTc')==='384 µs'&&await txt(g,'#ptTg')==='1,536 µs'&&/más lenta/.test(await txt(g,'#ptMsg')),'si cada píxel depende del anterior, la GPU pierde');

  await demo(g,1).locator('[data-v="32"]').click();
  r.igual(await txt(g,'#rsTot'),'1,024','32 × 32 son 1,024 píxeles');
  const dentro=await g.locator('#rsSvg .rs-p.in').count();
  r.cumple(dentro>200&&dentro<600&&(await txt(g,'#rsIn')).startsWith(String(dentro)),'rasteriza los píxeles cuyo centro cae dentro del triángulo',dentro);
  await g.check('#rsSom');
  r.cumple(await g.$eval('#rsSvg .rs-p.in',function(e){return /rgb/.test(e.getAttribute('style')||'')}),'sombrear mezcla los colores de las esquinas');

  await demo(g,2).locator('[data-v="3"]').click();
  await demo(g,2).locator('[data-v="144"]').click();
  r.cumple(await txt(g,'#fpPx')==='8,294,400'&&await txt(g,'#fpMs')==='6.9 ms'&&await txt(g,'#fpX')==='43 ×','4K a 144 FPS: 8.3 millones de píxeles, 6.9 ms por cuadro, 43 veces 720p a 30');

  await demo(g,3).locator('[data-v="384"]').click();
  await demo(g,3).locator('[data-v="28"]').click();
  r.igual(await txt(g,'#vrBw'),'1,344 GB/s','384 bits a 28 Gbps dan 1,344 GB/s');
  r.cumple(g.errores.length===0,'gpu: sin errores',g.errores);
  await cerrar(g);

  /* La búsqueda encuentra las lecciones nuevas */
  const b=await pagina(browser,{});
  await b.goto(base+'index.html');await listo(b);
  await b.keyboard.press('Control+k');await b.waitForTimeout(200);
  await b.keyboard.type('nvme');await b.waitForTimeout(800);
  r.cumple((await b.locator('[role=option]').allTextContents()).some(function(t){return /Almacenamiento/.test(t)}),'Ctrl K encuentra «NVMe» en Almacenamiento');
  await cerrar(b);
});
