/* Historial de las filas (bases.js lo anota, datos.js lo guarda en el almacén «historial», basedatos.js lo muestra).
   - Una fila nueva, sus cambios (valor de antes y de después, quién y cuándo; los seguidos de la misma persona se
     juntan) y en la ficha «Volver a…», que no se junta con lo anterior.
   - Otra persona: sus cambios llevan su nombre; «Actividad» de la base filtra por persona.
   - Eliminar una fila se anota con su copia y «Recuperar fila» la regresa con sus valores.
   - Depuración: lo de más de 90 días se borra, salvo los últimos 50 cambios de cada fila; borrar la base borra su
     historial; el respaldo no lo lleva; la base va en la versión 6.
   - Contraste y desbordes en escritorio y celular. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarBd(p){await p.waitForSelector('.bd [data-bd-nombre]',{timeout:8000});await p.waitForTimeout(200)}
function info(p){return p.evaluate(function(){var b=AT.bases.base(document.querySelector('.bd').getAttribute('data-bd'));return {base:b.id,c0:b.columnas[0].id,c1:b.columnas[1].id,n1:b.columnas[1].nombre}})}
function hist(p,fid){return p.evaluate(function(id){return AT.datos.historial.deFila(id)},fid)}
async function escribir(p,col,fid,valor){
  const s='.bd [data-c="'+col+'"][data-f="'+fid+'"]';
  await p.fill(s,valor);await p.press(s,'Tab');await p.waitForTimeout(300);
}

prueba('Historial de las filas',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(){AT.crear.nuevo('clientes');return 1}).catch(function(){return 1})]);await listo(p,600);
  await esperarBd(p);
  const b=await info(p);

  /* ---------- Una fila nueva y sus cambios ---------- */
  await p.click('.bd .bd-barra [data-acc="nuevaFila"]');await p.waitForTimeout(250);
  await p.keyboard.type('Abarrotes Lupita');await p.keyboard.press('Tab');await p.waitForTimeout(350);
  const fid=await p.evaluate(function(a){return AT.bases.filas(a.base).filter(function(f){return f.v[a.c0]==='Abarrotes Lupita'})[0].id},b);
  let h=await hist(p,fid);
  r.cumple(h.length>=1&&h[h.length-1].tipo==='nueva'&&h[h.length-1].quien.id===await p.evaluate(function(){return AT.datos.yoId()}),'una fila nueva queda anotada, con quién la creó',h);
  r.igual(h.length,1,'lo que se escribe enseguida en una fila nueva es parte de su creación (no un cambio aparte)');
  /* Ya pasó un rato (la ventana se acorta para la prueba): el siguiente cambio es aparte; el que sigue se junta con él */
  await p.evaluate(function(){AT.bases.HISTORIAL.juntar=0});
  await escribir(p,b.c1,fid,'55 1234 5678');
  await p.evaluate(function(){AT.bases.HISTORIAL.juntar=120000});
  await escribir(p,b.c0,fid,'Abarrotes Lupita Centro');
  h=await hist(p,fid);
  const cambio=h.filter(function(x){return x.tipo==='cambio'});
  r.cumple(cambio.length===1&&cambio[0].cambios[b.c0]&&cambio[0].cambios[b.c0].d==='Abarrotes Lupita Centro'&&cambio[0].cambios[b.c1]&&cambio[0].cambios[b.c1].d==='55 1234 5678',
    'dos cambios seguidos de la misma persona en la misma fila se juntan en uno, con el valor de antes y el de después',cambio);

  /* ---------- La ficha ---------- */
  await p.click('.bd [data-ficha="'+fid+'"]');await p.waitForSelector('dialog.bd-ficha[open] .bd-hl');
  const fh=await p.textContent('dialog.bd-ficha .bd-hist');
  r.cumple(/Historial/.test(fh)&&/Creó la fila/.test(fh)&&/Abarrotes Lupita Centro/.test(fh)&&/Hoy,/.test(fh),'la ficha muestra el historial: quién, cuándo y qué cambió',fh);
  await revisar(p,r,'ficha con historial');
  const volver=await p.$('dialog.bd-ficha [data-volver$="|'+b.c0+'"]');
  r.cumple(!!volver&&/Volver a «Abarrotes Lupita»/.test(await volver.textContent()),'cada cambio ofrece «Volver a» su valor de antes');
  await volver.click();await p.waitForTimeout(400);
  r.igual(await p.evaluate(function(a){return AT.bases.filas(a[0].base).filter(function(f){return f.id===a[1]})[0].v[a[0].c0]},[b,fid]),'Abarrotes Lupita','«Volver a» regresa el valor');
  h=await hist(p,fid);
  r.igual(h.filter(function(x){return x.tipo==='cambio'}).length,2,'y queda anotado como un cambio aparte (no se junta con el anterior)');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  /* ---------- Otra persona ---------- */
  const carlos=await p.evaluate(function(){return AT.empresa.agregarPersona({nombre:'Carlos Ruiz',rol:'admin'}).id});
  await p.evaluate(function(id){AT.empresa.entrarComo(id)},carlos);await p.reload();await listo(p,500);
  await esperarBd(p);
  await escribir(p,b.c1,fid,'55 8765 4321');
  h=await hist(p,fid);
  r.cumple(h[0].tipo==='cambio'&&h[0].quien.nombre==='Carlos Ruiz','los cambios de otra persona llevan su nombre',h[0]);

  /* ---------- Eliminar y recuperar desde «Actividad» ---------- */
  await p.click('.bd [data-ficha="'+fid+'"]');await p.waitForSelector('dialog.bd-ficha[open]');
  await p.click('dialog.bd-ficha [data-borrar]');await p.waitForTimeout(400);
  r.cumple(await p.evaluate(function(a){return !AT.bases.filas(a[0].base).some(function(f){return f.id===a[1]})},[b,fid]),'la fila se elimina');
  await p.click('.bd [data-acc="mas"]');await p.click('.menu-i:has-text("Actividad")');await p.waitForSelector('dialog.bd-act[open] .bd-hl');
  const act=await p.textContent('dialog.bd-act');
  r.cumple(/Eliminó la fila/.test(act)&&/Tú/.test(act)&&/Creó la fila/.test(act),'«Actividad» muestra lo último que cambió en la base y quién',act.slice(0,300));
  r.cumple(await p.evaluate(function(){return document.activeElement.hasAttribute('data-act-quien')}),'el foco empieza en el filtro de persona');
  await revisar(p,r,'Actividad de la base');
  await p.selectOption('dialog.bd-act [data-act-quien]',carlos);await p.waitForTimeout(250);
  const soloCarlos=await p.$$eval('dialog.bd-act .bd-he .bd-hq b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(soloCarlos.length>=2&&soloCarlos.every(function(n){return n==='Tú'}),'el filtro deja solo lo de esa persona (los tuyos dicen «Tú»)',soloCarlos);
  await p.click('dialog.bd-act [data-recuperar]');await p.waitForTimeout(500);
  const rec=await p.evaluate(function(a){return AT.bases.filas(a[0].base).filter(function(f){return f.id===a[1]})[0]},[b,fid]);
  r.cumple(rec&&rec.v[b.c0]==='Abarrotes Lupita'&&rec.v[b.c1]==='55 8765 4321','«Recuperar fila» la regresa con sus valores',rec);
  h=await hist(p,fid);
  r.cumple(h[0].tipo==='recuperada'&&!(await p.$('dialog.bd-act [data-recuperar]')),'y queda anotado; ya no ofrece recuperarla otra vez');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);

  /* ---------- Depuración, respaldo y versión de la base ---------- */
  const dep=await p.evaluate(function(a){
    var viejo=new Date(Date.now()-120*864e5).toISOString(),nuevo=new Date().toISOString(),l=[];
    for(var i=0;i<60;i++)l.push({id:'h-viejo'+i,base:a.base,fila:'f-mucha',t:new Date(Date.now()-(100+i)*864e5).toISOString(),quien:{id:'u-x',nombre:'X'},tipo:'cambio',cambios:{}});
    for(var j=0;j<5;j++)l.push({id:'h-nuevo'+j,base:a.base,fila:'f-mucha',t:nuevo,quien:{id:'u-x',nombre:'X'},tipo:'cambio',cambios:{}});
    for(var k=0;k<3;k++)l.push({id:'h-poca'+k,base:a.base,fila:'f-poca',t:viejo,quien:{id:'u-x',nombre:'X'},tipo:'cambio',cambios:{}});
    return AT.datos.historial.poner(l).then(function(){return AT.datos.historial.depurar()}).then(function(n){
      return Promise.all([AT.datos.historial.deFila('f-mucha'),AT.datos.historial.deFila('f-poca')]).then(function(x){return {quitadas:n,mucha:x[0].length,poca:x[1].length}});
    });
  },b);
  r.cumple(dep.quitadas===15&&dep.mucha===50&&dep.poca===3,'la depuración borra lo de más de 90 días, salvo los últimos 50 cambios de cada fila',dep);
  const resp=await p.evaluate(function(){return AT.datos.exportar()});
  r.cumple(!('historial' in resp),'el historial no va en el respaldo');
  const almacenes=await p.evaluate(function(){return new Promise(function(ok){var q=indexedDB.open('onelearn');q.onsuccess=function(){var db=q.result,x={v:db.version,h:db.objectStoreNames.contains('historial')};db.close();ok(x)}})});
  r.cumple(almacenes.v===6&&almacenes.h,'la base va en la versión 6, con el almacén del historial',almacenes);
  await p.evaluate(function(a){return AT.datos.bases.borrarConFilas(a.base)},b);
  r.igual((await p.evaluate(function(a){return AT.datos.historial.deBase(a.base)},b)).length,0,'borrar la base borra su historial');
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);

  /* ---------- Celular ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,ajustes:{tema:'dark',contraste:'high'}});
  await c.goto(base+'inicio.html');await listo(c);
  await Promise.all([c.waitForURL(/documento\.html/),c.evaluate(function(){AT.crear.nuevo('clientes');return 1}).catch(function(){return 1})]);await listo(c,600);
  await esperarBd(c);
  const bc=await info(c);
  await c.click('.bd .bd-barra [data-acc="nuevaFila"]');await c.waitForTimeout(250);
  await c.keyboard.type('Ferretería del Centro con un nombre muy largo para revisar');await c.keyboard.press('Tab');await c.waitForTimeout(350);
  const fc=await c.evaluate(function(a){return AT.bases.filas(a.base)[AT.bases.filas(a.base).length-1].id},bc);
  await escribir(c,bc.c1,fc,'33 1111 2222');
  await c.click('.bd [data-ficha="'+fc+'"]');await c.waitForSelector('dialog.bd-ficha[open] .bd-hl');
  await revisar(c,r,'ficha con historial (celular, oscuro y alto contraste)');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores);
  await cerrar(c);
});
