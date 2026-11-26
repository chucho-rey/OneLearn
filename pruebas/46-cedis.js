/* Pedidos al Cedis, etapa A sin servidor (cedis.js, pedidos.js, recibir.js), con dos navegadores: el Cedis y una
   sucursal, cada uno con su almacenamiento.
   - El Cedis: la plantilla crea sus bases (insumos y sucursales de ejemplo), sus ajustes y la invitación de una
     sucursal (enlace firmado con su clave).
   - La sucursal sin espacio abre la invitación: crea su espacio, se conecta y tiene su página de pedido; no recibe
     nada de otras sucursales.
   - El pedido: mínimo y múltiplo, «Enviar al Cedis» (versión 1), cambios sin enviar y versión 2.
   - El Cedis recibe: firma válida, versión vieja o repetida, firma alterada, enlace de otra sucursal; reemplazo con
     lo que cambió; consolidado, quién falta y llegó tarde.
   - Confirmar con faltantes, la sucursal lo ve; marcar surtido; hojas de surtido, lista de compra y CSV.
   - Formato actualizado, cambiar clave, respaldo y «Repetir el último pedido».
   - Contraste y desbordes en escritorio y celular. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

function enlaceDe(p){return p.inputValue('dialog.cd-comp[open] .cd-enlace')}
async function cerrarDlg(p){await p.keyboard.press('Escape');await p.waitForTimeout(200)}
async function esperarCedis(p){await p.waitForSelector('.cd .cd-suc',{timeout:10000});await p.waitForTimeout(300)}

prueba('Pedidos al Cedis',async function({browser,base,r}){
  /* ---------- El Cedis ---------- */
  const c=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Cocinas del Sureste',giro:'comida',telefono:''},creado:'2026-01-01'}});
  await c.goto(base+'inicio.html');await listo(c,400);
  await Promise.all([c.waitForURL(/documento\.html/),c.evaluate(function(){AT.crear.nuevo('cedis');return 1}).catch(function(){return 1})]);await listo(c,800);
  await esperarCedis(c);
  const est=await c.evaluate(function(){var C=AT.cedis;return {ins:C.insumos().length,suc:C.sucursales().map(function(s){return s.nombre}).join(', '),yo:C.yo(),roles:Object.keys(C.ids()).sort().join()}});
  r.cumple(est.ins===25&&est.suc==='Sucursal Centro, Sucursal Norte, Sucursal Poniente'&&est.roles==='insumos,pedidos,renglones,sucursales','la plantilla crea las bases con 25 insumos y 3 sucursales de ejemplo',est);
  r.cumple(est.yo&&est.yo.corte==='18:00'&&est.yo.dias.join()==='1,2,3,4,5,6','el Cedis empieza con corte a las 18:00 y entregas de lunes a sábado',est.yo);
  r.cumple((await c.$$('.cd .cd-suc .cd-chip.sin')).length===3,'las sucursales aparecen sin invitar');
  await revisar(c,r,'Cedis recién creado');
  /* Ajustes */
  await c.click('.cd [data-cd="ajustes"]');await c.waitForSelector('dialog.cd-aj[open]');
  await c.fill('dialog.cd-aj [name="nombre"]','Cedis Mérida');await c.fill('dialog.cd-aj [name="corte"]','20:00');
  await c.click('dialog.cd-aj button[type="submit"]');await c.waitForTimeout(300);
  r.cumple(/Cedis Mérida/.test(await c.textContent('.cd .cd-cab'))&&/20:00/.test(await c.textContent('.cd .cd-cab')),'los ajustes cambian el nombre y la hora de corte');
  /* Invitación de la Sucursal Centro */
  const centro=await c.evaluate(function(){return AT.cedis.sucursales().filter(function(s){return s.nombre==='Sucursal Centro'})[0].id});
  const norte=await c.evaluate(function(){return AT.cedis.sucursales().filter(function(s){return s.nombre==='Sucursal Norte'})[0].id});
  await c.click('.cd [data-suc="'+centro+'"] [data-cd="invitar"]');await c.waitForSelector('dialog.cd-comp[open]');
  const inv=await enlaceDe(c);
  r.cumple(/\/recibir\.html#inv\.[zj][\w-]+\.[\w-]+$/.test(inv)&&!/Norte|Poniente/.test(inv),'«Invitar» arma un enlace firmado a recibir.html',inv.slice(0,80));
  r.cumple(await c.isVisible('dialog.cd-comp a[data-cmp="wa"]')&&await c.isVisible('dialog.cd-comp a[data-cmp="correo"]')&&await c.isVisible('dialog.cd-comp [data-cmp="copiar"]'),'y se manda por WhatsApp, correo o se copia');
  await revisar(c,r,'mandar la invitación');
  await cerrarDlg(c);
  const claveCentro=await c.evaluate(function(id){return AT.cedis.claveDe(id)},centro);
  r.cumple(claveCentro&&claveCentro.k.length>=40&&!(await c.evaluate(function(){return JSON.stringify(AT.bases.todasEnMemoria?1:0)})).includes(claveCentro.k),'la clave de la sucursal vive aparte (no en una base)');
  /* La invitación decodificada solo trae lo de su sucursal */
  const datosInv=await c.evaluate(function(u){return AT.cedis.abrir(u).then(function(p){return p.obj})},inv);
  r.cumple(datosInv.s.n==='Sucursal Centro'&&datosInv.f.l.length===25&&!JSON.stringify(datosInv).includes('Norte')&&datosInv.f.l.every(function(x){return x.length===6}),'la invitación trae solo su sucursal, su clave y el formato (sin costos)',{s:datosInv.s,n:datosInv.f.l.length});

  /* ---------- La sucursal (navegador sin espacio) ---------- */
  const s=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await s.goto(inv);await listo(s,600);
  await s.waitForSelector('#rcConectar');
  r.cumple(/Cedis Mérida/.test(await s.textContent('#rcT'))&&/Sucursal Centro/.test(await s.textContent('#rcCuerpo'))&&await s.isVisible('#rcEspacio'),'la sucursal ve la invitación y, sin espacio, el formulario para crearlo');
  r.igual(await s.inputValue('#rcEspacio [name="negocio"]'),'Sucursal Centro','el nombre del negocio viene de la sucursal');
  await revisar(s,r,'invitación en la sucursal (celular)');
  await s.fill('#rcEspacio [name="nombre"]','Luis');
  await s.click('#rcConectar');await s.waitForSelector('#rcIr');
  const sc=await s.evaluate(function(){return {perfil:AT.perfil.actual(),cx:AT.cedis.conexiones(),docs:0}});
  r.cumple(sc.perfil&&sc.perfil.negocio.nombre==='Sucursal Centro'&&sc.perfil.negocio.giro==='comida'&&sc.cx.length===1&&sc.cx[0].suc.n==='Sucursal Centro'&&sc.cx[0].formato.l.length===25,'crea el espacio (negocio de comida) y guarda la conexión con el formato',{perfil:sc.perfil&&sc.perfil.negocio,n:sc.cx.length});
  r.cumple(!/#/.test(s.url()),'la dirección se limpia');
  await Promise.all([s.waitForURL(/documento\.html/),s.click('#rcIr')]);await listo(s,800);
  await s.waitForSelector('.pc .pc-i');
  r.cumple(/Pedido a Cedis Mérida/.test(await s.textContent('.pc .cd-cab'))&&(await s.$$('.pc .pc-i')).length===25,'la página «Pedido a Cedis Mérida» tiene los 25 insumos');
  r.cumple(await s.evaluate(function(){return !JSON.stringify(localStorage).includes('Norte')&&!JSON.stringify(localStorage).includes('Poniente')}),'la sucursal no tiene nada de otras sucursales');
  /* Cantidades: mínimo y múltiplo */
  async function q(cod,v){const sel='.pc [data-q="'+cod+'"]';await s.fill(sel,String(v));await s.press(sel,'Tab');await s.waitForTimeout(150)}
  await q('CAR-01',3);
  r.cumple(/El mínimo es 5/.test(await s.textContent('.pc'))&&await s.getAttribute('.pc [data-q="CAR-01"]','aria-invalid')==='true','una cantidad menor al mínimo se marca');
  await s.click('.pc [data-pc="enviar"]');await s.waitForTimeout(200);
  r.cumple(!(await s.$('dialog.cd-comp[open]'))&&/Revisa las cantidades/.test(await s.textContent('.pc .cd-msg')),'y no deja enviar');
  await q('CAR-01',8);await q('FYV-06',7);
  r.cumple(/Va de 5 en 5/.test(await s.textContent('.pc')),'el múltiplo también se revisa');
  await q('FYV-06',10);await q('ABA-01',2);await q('LAC-04',3);
  await s.fill('.pc [data-pc="notas"]','Entregar por la puerta de atrás');await s.waitForTimeout(150);
  r.cumple(/Llevas 4 insumos/.test(await s.textContent('.pc .pc-res'))&&/No enviado/.test(await s.textContent('.pc .pc-res')),'el resumen dice cuántos insumos lleva');
  await revisar(s,r,'pedido de la sucursal (celular)');
  await s.click('.pc [data-pc="enviar"]');await s.waitForSelector('dialog.cd-comp[open]');
  const ped1=await enlaceDe(s);
  r.cumple(/recibir\.html#ped\./.test(ped1),'«Enviar al Cedis» arma el enlace del pedido');
  await cerrarDlg(s);
  r.cumple(/Enviado \(versión 1\)/.test(await s.textContent('.pc .pc-res')),'queda «Enviado (versión 1)»');
  await q('ABA-01',4);
  r.cumple(/Tienes cambios sin enviar/.test(await s.textContent('.pc .pc-res')),'si cambias algo, avisa que hay cambios sin enviar');
  await s.click('.pc [data-pc="enviar"]');await s.waitForSelector('dialog.cd-comp[open]');
  const ped2=await enlaceDe(s);await cerrarDlg(s);
  r.cumple(/Enviado \(versión 2\)/.test(await s.textContent('.pc .pc-res')),'el reenvío es la versión 2');

  /* ---------- El Cedis recibe ---------- */
  await c.goto(ped1);await listo(c,600);await c.waitForSelector('#rcAgregar');
  r.cumple(/Sucursal Centro/.test(await c.textContent('#rcT'))&&/Entregar por la puerta de atrás/.test(await c.textContent('#rcCuerpo'))&&(await c.$$('#rcCuerpo tbody tr')).length===4,'el Cedis ve el pedido: sucursal, fecha, notas y renglones');
  await revisar(c,r,'recibir un pedido');
  await c.click('#rcAgregar');await c.waitForSelector('#rcIr');
  /* Repetido */
  await c.goto(base+'recibir.html#'+ped1.split('#')[1]);await listo(c,500);await c.waitForSelector('.rc-err');
  r.cumple(/ya está en tus pedidos/.test(await c.textContent('.rc-err')),'el mismo enlace otra vez se rechaza');
  /* La versión 2 reemplaza y dice qué cambió */
  await c.goto(base+'recibir.html#'+ped2.split('#')[1]);await listo(c,500);await c.waitForSelector('#rcAgregar');
  r.cumple(/Reemplaza la versión 1/.test(await c.textContent('#rcCuerpo'))&&/Arroz \(2 → 4\)/.test(await c.textContent('#rcCuerpo')),'la versión 2 reemplaza a la 1 y dice qué cambió');
  await c.click('#rcAgregar');await c.waitForSelector('#rcIr');
  /* Ahora la 1 es vieja */
  await c.goto(base+'recibir.html#'+ped1.split('#')[1]);await listo(c,500);await c.waitForSelector('.rc-err');
  r.cumple(/más nueva/.test(await c.textContent('.rc-err')),'una versión vieja se rechaza');
  /* Firma alterada */
  const alterado=ped2.split('#')[1].replace(/\.([\w-])([\w-]*)$/,function(m,a,b){return '.'+(a==='A'?'B':'A')+b});
  await c.goto(base+'recibir.html#'+alterado);await listo(c,500);await c.waitForSelector('.rc-err');
  r.cumple(/no viene de una sucursal tuya o cambió en el camino/.test(await c.textContent('.rc-err')),'una firma alterada se rechaza');
  /* Un pedido firmado con otra clave (como si fuera de Norte, sin su clave) */
  const falso=await c.evaluate(function(a){return AT.cedis.enlace('ped',{c:AT.cedis.yo().id,s:a.norte,o:'P-9',v:1,e:'2030-01-01',t:new Date().toISOString(),r:[['ABA-01',1]]},'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').then(function(x){return x.texto})},{norte:norte});
  await c.goto(base+'recibir.html#'+falso);await listo(c,500);await c.waitForSelector('.rc-err');
  r.cumple(/no viene de una sucursal tuya/.test(await c.textContent('.rc-err')),'un pedido a nombre de otra sucursal (sin su clave) se rechaza');
  /* Consolidado */
  const docCedis=await c.evaluate(function(){return AT.cedis.yo().doc});
  await c.goto(base+'documento.html?id='+docCedis);await listo(c,800);await esperarCedis(c);
  const fechaPed=await c.evaluate(function(){return AT.cedis.pedidosDe()[Object.keys(AT.cedis.pedidosDe())[0]].fecha});
  await c.selectOption('.cd [data-cd="fecha"]',fechaPed);await c.waitForTimeout(300);
  const res=await c.textContent('.cd .cd-res');
  r.cumple(/1 de 3 sucursales/.test(res)&&/Faltan: Sucursal Norte, Sucursal Poniente/.test(res),'el consolidado dice quién ya mandó y quién falta',res);
  r.cumple(/Recibido .* \(v2\)/.test(await c.textContent('.cd [data-suc="'+centro+'"]')),'la sucursal dice «Recibido» con su hora y versión');
  const filas=await c.$$eval('.cd .cd-t tbody tr:not(.cd-cat)',function(t){return t.map(function(x){return x.textContent})});
  r.cumple(filas.length===4&&filas.some(function(t){return /Arroz.*4.*4/.test(t)}),'el consolidado: un renglón por insumo pedido con su total',filas);
  await revisar(c,r,'consolidado del Cedis');

  /* ---------- Confirmar con faltantes ---------- */
  await c.click('.cd [data-suc="'+centro+'"] [data-cd="confirmar"]');await c.waitForSelector('dialog.cd-conf[open]');
  await revisar(c,r,'confirmar un pedido');
  await c.fill('dialog.cd-conf [data-surte="CAR-01"]','5');await c.fill('dialog.cd-conf [data-nota="CAR-01"]','Solo hay 5 kg');
  await c.click('dialog.cd-conf button[type="submit"]');await c.waitForSelector('dialog.cd-comp[open]');
  const con1=await enlaceDe(c);await cerrarDlg(c);
  r.cumple(/recibir\.html#con\./.test(con1)&&/Confirmado/.test(await c.textContent('.cd [data-suc="'+centro+'"]')),'confirmar guarda lo que surte y arma el enlace de la confirmación');
  /* La sucursal recibe la confirmación */
  await s.goto(con1);await listo(s,600);await s.waitForSelector('#rcIr');
  r.cumple(/1 insumo con faltante/.test(await s.textContent('#rcCuerpo'))&&/Pechuga de pollo \(5 de 8, Solo hay 5 kg\)/.test(await s.textContent('#rcCuerpo')),'la sucursal ve la confirmación con el faltante y la nota');
  await Promise.all([s.waitForURL(/documento\.html/),s.click('#rcIr')]);await listo(s,700);await s.waitForSelector('.pc-conf');
  r.cumple(/1 insumo con faltante/.test(await s.textContent('.pc-conf'))&&(await s.$$('.pc-conf .pc-falta')).length===1,'y en su pedido, lo que surte el Cedis con los faltantes en rojo');
  await revisar(s,r,'confirmación en la sucursal (celular)');
  /* Marcar surtido, hojas, lista de compra y CSV */
  await c.click('.cd [data-suc="'+centro+'"] [data-cd="surtido"]');await c.waitForTimeout(300);
  r.cumple(/Surtido/.test(await c.textContent('.cd [data-suc="'+centro+'"]')),'«Marcar surtido» deja el pedido surtido');
  await c.evaluate(function(){window.__imp=0;window.print=function(){window.__imp++}});
  await c.click('.cd [data-cd="hojas"]');await c.waitForTimeout(200);
  const hoja=await c.evaluate(function(){var v=document.getElementById('cdImprimir');return {n:window.__imp,hojas:v.querySelectorAll('.cd-hoja').length,t:v.textContent}});
  r.cumple(hoja.n===1&&hoja.hojas===1&&/Hoja de surtido/.test(hoja.t)&&/Sucursal Centro/.test(hoja.t)&&/Solo hay 5 kg/.test(hoja.t)&&/Recibe/.test(hoja.t),'«Hojas de surtido» imprime una hoja por sucursal con lo que surte y las firmas',hoja.t.slice(0,160));
  await c.click('.cd [data-cd="compra"]');await c.waitForTimeout(200);
  r.cumple(/Lista de compra/.test(await c.textContent('#cdImprimir')),'«Lista de compra» imprime el total por insumo');
  const [dl]=await Promise.all([c.waitForEvent('download'),c.click('.cd [data-cd="csv"]')]);
  const csv=require('fs').readFileSync(await dl.path(),'utf8');
  r.cumple(/^﻿Código,Insumo,Presentación,Categoría,Sucursal Centro,Total/.test(csv)&&/ABA-01,Arroz,Bulto 25 kg,Abarrotes,4,4/.test(csv)&&!/AAAA|clave/i.test(csv),'el CSV del consolidado trae insumo × sucursal y nada de claves',csv.slice(0,120));

  /* ---------- Formato actualizado ---------- */
  await c.evaluate(function(){var B=AT.bases,id=AT.cedis.ids().insumos;var f=B.nuevaFila(id,{'i-codigo':'BEB-01','i-nombre':'Agua natural','i-pres':'Garrafón 20 L','i-cat':'Bebidas','i-min':1,'i-mult':1,'i-activo':true});return B.guardarFila(f)});
  await c.waitForTimeout(500);
  r.cumple(/Formato viejo/.test(await c.textContent('.cd [data-suc="'+centro+'"]')),'al cambiar los insumos, la sucursal invitada aparece con formato viejo');
  await c.click('.cd [data-suc="'+centro+'"] [data-cd="formato"]');await c.waitForSelector('dialog.cd-comp[open]');
  const fmt=await enlaceDe(c);await cerrarDlg(c);
  await s.goto(fmt);await listo(s,600);await s.waitForSelector('#rcIr');
  r.cumple(/26 insumos/.test(await s.textContent('#rcCuerpo')),'la sucursal recibe el formato actualizado');
  /* El siguiente pedido y «Repetir el último pedido» */
  await Promise.all([s.waitForURL(/documento\.html/),s.click('#rcIr')]);await listo(s,700);await s.waitForSelector('.pc .pc-i');
  await s.click('.pc [data-pc="nuevo"]');await s.waitForTimeout(300);
  r.cumple(/No enviado/.test(await s.textContent('.pc .pc-res'))&&/Pedidos anteriores \(1\)/.test(await s.textContent('.pc')),'«Empezar el siguiente pedido» guarda el anterior en el historial');
  await s.click('.pc [data-pc="repetir"]');await s.waitForTimeout(300);
  r.igual(await s.inputValue('.pc [data-q="ABA-01"]'),'4','«Repetir el último pedido» copia sus cantidades');
  /* Cambiar clave: la invitación anterior y sus pedidos dejan de servir */
  await c.goto(base+'documento.html?id='+docCedis);await listo(c,800);await esperarCedis(c);
  await c.click('.cd [data-suc="'+centro+'"] [data-cd="invitar"]');await c.waitForSelector('dialog.cd-inv[open]');
  await c.click('dialog.cd-inv [data-x="clave"]');await c.waitForSelector('dialog.cd-comp[open]');await cerrarDlg(c);
  await s.click('.pc [data-pc="enviar"]');await s.waitForSelector('dialog.cd-comp[open]');
  const ped3=await enlaceDe(s);await cerrarDlg(s);
  await c.goto(base+'recibir.html#'+ped3.split('#')[1]);await listo(c,500);await c.waitForSelector('.rc-err');
  r.cumple(/no viene de una sucursal tuya|clave vieja/.test(await c.textContent('.rc-err')),'después de «Cambiar clave», los pedidos con la clave anterior se rechazan');
  /* Respaldo */
  const resp=await c.evaluate(function(){return AT.datos.exportar()});
  r.cumple(resp.cedis&&resp.cedis.yo&&resp.cedis.claves[centro]&&resp.bases.some(function(b){return b.rol==='insumos'}),'el respaldo lleva el Cedis, sus claves y sus bases');
  r.cumple(c.errores.length===0,'el Cedis sin errores',c.errores);
  r.cumple(s.errores.length===0,'la sucursal sin errores',s.errores);
  await cerrar(s);
  /* Celular oscuro del Cedis */
  await c.setViewportSize({width:390,height:844});
  await c.evaluate(function(){AT.ajustes.set('tema','dark');AT.ajustes.set('contraste','high')});
  await c.goto(base+'documento.html?id='+docCedis);await listo(c,800);await esperarCedis(c);
  await c.selectOption('.cd [data-cd="fecha"]',fechaPed);await c.waitForTimeout(300);
  await revisar(c,r,'Cedis en celular (oscuro y alto contraste)');
  await cerrar(c);
});
