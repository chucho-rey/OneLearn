/* Fase F7e: el Inicio de un negocio es la página de bloques «Mi negocio»: se crea sola una vez (indicadores, próximos
   vencimientos y el resumen del inventario), sus bloques se ven vivos en el Inicio, se edita como cualquier página
   («Editar esta sección») y lo que agregas sale en el Inicio; no sale entre tus páginas recientes; en un espacio de
   estudio no aparece; el paquete de tienda trae el inventario y el reporte; contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const NEGOCIO={perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Abarrotes Ana',giro:'tienda',telefono:''},creado:'2026-01-01'};
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function enDias(n){var d=new Date();d.setDate(d.getDate()+n);return iso(d)}

prueba('Mi negocio en el Inicio',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:NEGOCIO});
  await p.goto(base+'inicio.html');await listo(p,600);
  await p.waitForSelector('#iniNegocio:not([hidden]) .ind .ind-t',{timeout:10000});
  r.cumple(await p.isVisible('#iniNegocio h2:has-text("Mi negocio")'),'el Inicio de un negocio muestra «Mi negocio»');
  const mi=await p.evaluate(function(){return AT.datos.documentos.leer('d-minegocio').then(function(d){return d&&d.contenido.content.map(function(b){return b.type}).join(',')})});
  r.igual(mi,'paragraph,indicadores,heading,vencimientos,heading,inventario','la página «Mi negocio» se crea con indicadores, vencimientos e inventario');
  r.cumple(/Necesita tu Inventario/.test(await p.textContent('#iniNegocio .ind')),'sin inventario, los indicadores dicen qué falta');
  r.cumple(!(await p.evaluate(function(){return [].some.call(document.querySelectorAll('#iniDocs .nota, #iniFavs .nota'),function(a){return /d-minegocio/.test(a.getAttribute('href')||'')})})),'«Mi negocio» no sale entre tus páginas recientes');

  /* Con inventario y una compra por pagar, los bloques se llenan */
  await p.evaluate(function(f){
    var I=AT.inventario,B=AT.bases;
    return I.asegurar('',['productos','movimientos','compras']).then(function(ids){
      return Promise.all([B.cargar(ids.productos),B.cargar(ids.compras)]).then(function(){
        return B.guardarFilas([B.nuevaFila(ids.productos,{'p-nombre':'Refresco','p-costo':10,'p-precio':20,'p-ini':3,'p-min':10})]).then(function(){
          return B.guardarFila(B.nuevaFila(ids.compras,{'c-prov':'Gepp','c-fecha':f.hoy,'c-total':500,'c-estado':'Por pagar','c-vence':f.d2}));
        });
      });
    });
  },{hoy:enDias(0),d2:enDias(2)});
  await p.reload();await listo(p,800);
  await p.waitForFunction(function(){var t=document.querySelector('#iniNegocio .ind');return t&&/\$30\.00/.test(t.textContent)},null,{timeout:10000});
  const ind=await p.evaluate(function(){return [].map.call(document.querySelectorAll('#iniNegocio .ind-t'),function(t){return t.querySelector('dt').textContent+': '+t.querySelector('.ind-v').textContent})});
  r.cumple(ind.indexOf('Valor del inventario: $30.00')>=0&&ind.indexOf('Compras por pagar: $500.00')>=0&&ind.indexOf('Productos por surtir: 1')>=0,'los indicadores del negocio, vivos en el Inicio',ind);
  await p.waitForFunction(function(){return /Gepp/.test((document.querySelector('#iniNegocio .ven-b')||{}).textContent||'')},null,{timeout:8000});
  r.cumple(/En 2 días/.test(await p.textContent('#iniNegocio .ven-b')),'los próximos vencimientos');
  r.cumple(/Bajo el mínimo/.test(await p.textContent('#iniNegocio [data-inv-resumen]'))&&!(await p.$('#iniNegocio [data-inv-resumen] button')),'el resumen del inventario, sin botones');
  r.igual(await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return d.id==='d-minegocio'}).length})}),1,'se crea una sola vez');
  await revisar(p,r,'Mi negocio (escritorio)');

  /* Editar: lo que agregas sale en el Inicio */
  await Promise.all([p.waitForURL(/documento\.html\?id=d-minegocio/),p.click('#iniNegEditar')]);await listo(p,700);
  r.cumple(await p.evaluate(function(){return AT.docActual&&AT.docActual.titulo==='Mi negocio'}),'«Editar esta sección» abre la página «Mi negocio»');
  /* Agrega un párrafo al final (como si lo escribieras) */
  await p.evaluate(function(){var t=AT.editorActual.tiptap;t.chain().insertContentAt(t.state.doc.content.size,{type:'paragraph',content:[{type:'text',text:'Revisar el refrigerador'}]}).run()});
  await p.waitForTimeout(900);await p.waitForFunction(function(){var e=document.querySelector('.doc-estado');return e&&e.getAttribute('data-k')==='ok'});
  await p.goto(base+'inicio.html');await listo(p,700);
  await p.waitForFunction(function(){return /Revisar el refrigerador/.test((document.querySelector('#iniNegocioC')||{}).textContent||'')},null,{timeout:8000});
  r.cumple(true,'lo que escribes en «Mi negocio» sale en el Inicio');

  /* Celular oscuro */
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(function(){AT.ajustes.set('tema','dark')});
  await p.reload();await listo(p,900);await p.waitForSelector('#iniNegocio .ind .ind-t');await p.waitForTimeout(500);
  await revisar(p,r,'Mi negocio en celular (oscuro)');
  await cerrar(p);

  /* En un espacio de estudio no aparece */
  const q=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await q.goto(base+'inicio.html');await listo(q,600);
  r.cumple(await q.isHidden('#iniNegocio')&&!(await q.evaluate(function(){return AT.datos.documentos.leer('d-minegocio')})),'en un espacio de estudio no hay «Mi negocio»');
  r.cumple(q.errores.length===0,'el Inicio de estudio sin errores',q.errores);
  /* El paquete de tienda trae el inventario y el reporte */
  const paq=await q.evaluate(function(){return AT.crear.paquetes.tienda.tipos.join(',')});
  r.igual(paq,'corte,inventario,reporte,fiado,proveedores','el paquete de tienda trae el inventario y el reporte del mes');
  await cerrar(q);
});
