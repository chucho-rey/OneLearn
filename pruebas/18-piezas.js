/* Piezas de una página (piezas.js): imágenes que se comprimen (con pie y texto alternativo), tablas numeradas, notas al
   pie y referencias cruzadas que se renumeran solas; al leer, en Markdown y en celular. Las ecuaciones, las fórmulas y
   los índices de figuras o tablas se fueron con lo de estudio. Solo se cargan imágenes guardadas en la página. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}
/* Una imagen PNG grande hecha con canvas (para ver que se achica y se comprime) */
function imagenGrande(p,ancho,alto){
  return p.evaluate(function(t){
    var c=document.createElement('canvas');c.width=t[0];c.height=t[1];
    var x=c.getContext('2d'),g=x.createLinearGradient(0,0,t[0],t[1]);
    g.addColorStop(0,'#1d6f5f');g.addColorStop(1,'#f0c040');x.fillStyle=g;x.fillRect(0,0,t[0],t[1]);
    for(var i=0;i<400;i++){x.fillStyle='hsl('+(i*37%360)+',60%,50%)';x.fillRect((i*97)%t[0],(i*53)%t[1],40,40)}
    return c.toDataURL('image/png').split(',')[1];
  },[ancho,alto]).then(function(b){return Buffer.from(b,'base64')});
}
function menuBarra(p){return p.$$eval('.menu-barra .menu-i b',function(e){return e.map(function(x){return x.textContent})})}
async function borrar(p,n){for(let i=0;i<n;i++)await p.keyboard.press('Backspace')}

prueba('Piezas · Imágenes, tablas numeradas, notas al pie y referencias',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html\?id=d-/),p.evaluate(function(){AT.crear.nuevo('notas');return 1}).catch(function(){return 1})]);await listo(p,500);
  await p.keyboard.type('Reporte de la sucursal');await p.keyboard.press('Enter');
  await p.keyboard.type('/seccion');await p.waitForTimeout(250);await p.keyboard.press('Enter');await p.waitForTimeout(100);
  await p.keyboard.type('Resumen del mes');await p.keyboard.press('Enter');
  await p.keyboard.type('Las ventas de noviembre subieron con la nueva línea de café.');await p.keyboard.press('Enter');

  /* ---------- Imagen: se comprime; pie y texto alternativo ---------- */
  await p.keyboard.type('/imagen');await p.waitForTimeout(200);
  r.igual(await p.textContent('.menu-barra .menu-i b'),'Imagen','«/imagen» ofrece insertar una imagen');
  const grande=await imagenGrande(p,3000,2000);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.keyboard.press('Enter')]);
  await fc.setFiles({name:'grafica.png',mimeType:'image/png',buffer:grande});
  await p.waitForSelector('.ed-fig img');await p.waitForTimeout(300);
  const f1=await p.evaluate(function(){
    var i=document.querySelector('.ed-fig img');
    return {ancho:i.naturalWidth,alto:i.naturalHeight,tipo:i.src.slice(0,15),largo:i.src.length,num:document.querySelector('.ed-fig .ed-num').textContent,foco:document.activeElement.getAttribute('data-c')};
  });
  r.cumple(f1.ancho===1600&&f1.alto===1067&&f1.tipo==='data:image/webp'&&f1.largo<grande.length*1.37,'la imagen se achica a 1600 px y se guarda en WebP, más ligera',f1);
  r.cumple(f1.num==='Imagen'&&f1.foco==='titulo','aparece como «Imagen», con el cursor en su pie',f1);
  r.igual(await p.locator('.ed-fig [data-c="nota"]').count(),0,'ya no pide la nota de origen (era de la tesis)');
  await p.keyboard.type('Ventas por semana');await p.keyboard.press('Enter');
  r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('data-c')}),'alt','Enter pasa al texto alternativo');
  await p.keyboard.type('Barras: la última semana es la más alta');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  r.cumple(await p.evaluate(function(){var s=AT.editorActual.tiptap.state.selection;return s.empty&&s.$from.parent.type.name==='paragraph'}),'Enter en el último campo regresa al texto, debajo de la imagen');
  await revisar(p,r,'imagen en el editor');
  /* Pegar una imagen */
  await p.evaluate(function(){
    var c=document.createElement('canvas');c.width=300;c.height=200;var x=c.getContext('2d');x.fillStyle='#246';x.fillRect(0,0,300,200);
    return new Promise(function(ok){c.toBlob(function(b){
      var dt=new DataTransfer();dt.items.add(new File([b],'captura.png',{type:'image/png'}));
      document.querySelector('.ed-cuerpo').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));ok();
    },'image/png')});
  });
  await p.waitForFunction(function(){return document.querySelectorAll('.ed-fig').length===2});await p.waitForTimeout(200);
  r.cumple(true,'pegar una imagen agrega otra');
  await p.keyboard.type('Foto del anaquel');await p.keyboard.press('Escape');await p.waitForTimeout(100);
  /* Pegar texto que trae también una imagen (como desde Word): gana el texto */
  await p.evaluate(function(){
    var dt=new DataTransfer();dt.setData('text/plain','texto copiado');dt.items.add(new File(['x'],'vista.png',{type:'image/png'}));
    document.querySelector('.ed-cuerpo').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
  });
  await p.waitForTimeout(300);
  r.cumple(await p.locator('.ed-fig').count()===2&&/texto copiado/.test(await p.textContent('.ed-cuerpo')),'si lo pegado trae texto, se pega el texto (no su imagen)');

  /* ---------- Tabla numerada, en cualquier página ---------- */
  await p.keyboard.press('Enter');
  await p.keyboard.type('/tabla');await p.waitForTimeout(200);
  const opT=await menuBarra(p);
  r.cumple(opT[0]==='Tabla'&&opT.indexOf('Tabla numerada')===1,'«/tabla» ofrece la tabla de siempre y la numerada',opT);
  await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await p.waitForTimeout(300);
  r.cumple(await p.textContent('.ed-tnum .ed-num')==='Tabla 1'&&await p.evaluate(function(){return document.activeElement.getAttribute('data-c')})==='titulo','la tabla numerada aparece como «Tabla 1», con el cursor en su título');
  await p.keyboard.type('Ventas por producto');await p.keyboard.press('Enter');
  await p.keyboard.type('Producto');await p.waitForTimeout(150);
  const tb=await p.evaluate(function(){var t=null;AT.editorActual.json().content.forEach(function(b){if(b.type==='tablaNumerada')t=b});return {titulo:t.attrs.titulo,celda:t.content[0].content[0].content[0].content[0].content[0].text}});
  r.cumple(tb.titulo==='Ventas por producto'&&tb.celda==='Producto','Enter en el título lleva a la primera celda',tb);
  await p.click('.tb-btn[data-k="tabla"]');await p.waitForTimeout(150);
  await p.locator('.menu-i',{hasText:'Quitar número y título'}).click();await p.waitForTimeout(150);
  r.cumple(await p.locator('.ed-tnum').count()===0&&await p.locator('.ed-cuerpo table').count()===1,'sin número queda una tabla normal, con su contenido');
  await p.click('.ed-cuerpo td');await p.click('.tb-btn[data-k="tabla"]');await p.waitForTimeout(150);
  r.cumple(/Numerar como/.test(await p.textContent('.menu')),'cualquier tabla se puede numerar (ya no solo en una tesis)');
  await p.locator('.menu-i',{hasText:'Numerar como'}).click();await p.waitForTimeout(250);
  await p.keyboard.type('Ventas por producto');await p.keyboard.press('Escape');await p.waitForTimeout(150);
  r.cumple(await p.textContent('.ed-tnum .ed-num')==='Tabla 1'&&/Producto/.test(await p.textContent('.ed-tnum')),'y la tabla queda numerada con su contenido');

  /* ---------- Lo de estudio ya no se ofrece ---------- */
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});
  await p.keyboard.press('Enter');await p.keyboard.type('/ecuacion');await p.waitForTimeout(200);
  r.cumple(!(await menuBarra(p)).some(function(t){return /Ecuación|Fórmula/.test(t)}),'«/» ya no ofrece ecuaciones ni fórmulas');
  await p.keyboard.press('Escape');await borrar(p,9);
  await p.keyboard.type('/indice');await p.waitForTimeout(200);
  const opI=await menuBarra(p);
  r.cumple(opI.indexOf('Índice')>=0&&!opI.some(function(t){return /Índice de (figuras|tablas)/.test(t)}),'el índice de secciones sigue; los de figuras y tablas, no',opI);
  await p.keyboard.press('Escape');await borrar(p,7);
  r.cumple(await p.evaluate(function(){var s=AT.editorActual.tiptap.schema.nodes;return !s.ecuacion&&!s.formula&&!s.indicePiezas&&!s.repaso&&!s.referencia&&!!s.legado}),'el editor ya no tiene esos bloques (y sí sabe conservarlos como legado)');

  /* ---------- Notas al pie ---------- */
  await p.keyboard.type('El crecimiento fue de 12 %');
  await p.keyboard.press('Control+Alt+f');await p.waitForSelector('.pz-form');
  await p.keyboard.type('Contra noviembre de 2025.');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  /* Otra nota antes, al principio del primer párrafo (el cursor se pone directo: con flechas, ProseMirror lee la
     selección hasta la siguiente tecla que escribe) */
  await p.evaluate(function(){
    var ed=AT.editorActual.tiptap,pos=null;
    ed.state.doc.forEach(function(n,o){if(pos==null&&n.type.name==='paragraph'&&/^Las ventas de noviembre/.test(n.textContent))pos=o});
    ed.chain().focus().setTextSelection(pos+1).run();
  });
  await p.keyboard.press('Control+Alt+f');await p.waitForSelector('.pz-form');
  await p.keyboard.type('Datos del punto de venta.');await p.keyboard.press('Enter');await p.waitForTimeout(250);
  const notas=await p.evaluate(function(){return {sup:[].map.call(document.querySelectorAll('.ed-cuerpo .ed-nota'),function(x){return x.textContent}).join(','),lista:[].map.call(document.querySelectorAll('.ed-notas li'),function(x){return x.querySelector('span,button').textContent}).join(' | ')}});
  r.cumple(notas.sup==='1,2'&&/^Datos del punto de venta\. \| Contra noviembre de 2025\.$/.test(notas.lista),'las notas se numeran en el orden del texto y se listan al final',notas);
  await p.click('.ed-notas li >> nth=1 >> button');await p.waitForSelector('.pz-form');
  r.cumple(await p.inputValue('.pz-form textarea')==='Contra noviembre de 2025.'&&await p.isVisible('.pz-form [data-q]'),'tocar una nota la abre para cambiarla o quitarla');
  await p.keyboard.press('Escape');await p.waitForTimeout(100);

  /* ---------- Referencias cruzadas ---------- */
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});
  await p.keyboard.press('Enter');await p.keyboard.type('Como muestra la ');
  await p.keyboard.type('/cruzada');await p.waitForTimeout(200);
  r.igual(await p.textContent('.menu-barra .menu-i b'),'Referencia cruzada','«/cruzada» ofrece la referencia cruzada');
  await p.keyboard.press('Enter');await p.waitForSelector('.menu[aria-label="Referencia cruzada a…"]');
  const dest=await p.$$eval('.menu .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(dest[0]==='Tabla 1. Ventas por producto'&&dest.indexOf('Resumen del mes')>=0&&!dest.some(function(t){return /Figura/.test(t)}),'ofrece las tablas numeradas y las secciones (las imágenes no llevan número)',dest);
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  r.igual(await p.textContent('.ed-cuerpo .xref'),'Tabla 1','la referencia dice el número de lo que cita');
  /* Otra tabla numerada antes de la primera: la referencia se renumera sola */
  await p.evaluate(function(){
    var ed=AT.editorActual.tiptap,pos=null;
    ed.state.doc.forEach(function(n,o){if(pos==null&&n.type.name==='tablaNumerada')pos=o});
    var t=ed.schema.nodes.tablaNumerada.create({clave:'p-nueva1',titulo:'Gastos del mes'},ed.schema.nodes.table.create(null,[ed.schema.nodes.tableRow.create(null,[ed.schema.nodes.tableCell.create(null,ed.schema.nodes.paragraph.create())])]));
    ed.view.dispatch(ed.state.tr.insert(pos,t));
  });await p.waitForTimeout(200);
  r.igual(await p.textContent('.ed-cuerpo .xref'),'Tabla 2','al agregar otra tabla numerada antes, la referencia se renumera');
  await p.click('.ed-cuerpo .xref');await p.waitForTimeout(150);
  r.cumple(/Ir a Tabla 2/.test(await p.textContent('.menu')),'tocar una referencia ofrece ir a lo citado');
  await p.locator('.menu-i',{hasText:'Ir a Tabla 2'}).click();await p.waitForTimeout(150);
  r.cumple(await p.evaluate(function(){var s=AT.editorActual.tiptap.state.selection;return !!s.node&&s.node.type.name==='tablaNumerada'&&s.node.attrs.titulo==='Ventas por producto'}),'y lleva hasta ella');
  await revisar(p,r,'página con piezas en el editor');

  /* ---------- Markdown ---------- */
  const md=await p.evaluate(function(){AT.docActual.contenido=AT.editorActual.json();return AT.documentoMarkdown(AT.docActual)});
  r.cumple(/\*Ventas por semana\*\n\n!\[Barras: la última semana es la más alta\]\(data:image\/webp;base64,/.test(md),'el Markdown lleva la imagen con su pie',md.slice(0,200));
  r.cumple(/\*\*Tabla 2\*\*\n\n\*Ventas por producto\*/.test(md)&&/Como muestra la Tabla 2/.test(md),'y las tablas numeradas y sus referencias');
  r.cumple(/\[\^1\]Las ventas de noviembre/.test(md)&&/\n\[\^1\]: Datos del punto de venta\.\n\[\^2\]: Contra noviembre de 2025\.\n$/.test(md),'y las notas al pie al final');

  /* ---------- Leer ---------- */
  await esperarGuardado(p);
  await p.reload();await listo(p,500);
  if(/Leer/.test(await p.textContent('#docModo')))await p.click('#docModo');
  await p.waitForSelector('.page figure.fig');
  const lec=await p.evaluate(function(){
    var f=document.querySelector('.page figure.fig:not(.tabla-num)');
    var t=document.querySelectorAll('.page figure.tabla-num')[1];
    return {
      fig:(f.querySelector('.fig-n')?'número / ':'')+f.querySelector('.fig-t').textContent+' / '+f.querySelector('img').alt,
      tabla:t.querySelector('.fig-n').textContent+' / '+t.querySelector('.fig-t').textContent+' / '+!!t.querySelector('table'),
      notas:[].map.call(document.querySelectorAll('.page .nota-ref a'),function(a){return a.textContent+a.getAttribute('href')}).join(','),
      lista:[].map.call(document.querySelectorAll('.notas-pie li'),function(l){return l.id+':'+l.textContent.trim()}).join(' | '),
      vuelta:document.querySelector('.notas-pie .nota-vuelta').getAttribute('href'),
      xref:[].map.call(document.querySelectorAll('.page a.xref'),function(a){var d=document.getElementById(a.getAttribute('href').slice(1));return a.textContent+(d?' ✓':' ✗')}).join(', ')
    };
  });
  r.igual(lec.fig,'Ventas por semana / Barras: la última semana es la más alta','al leer, la imagen lleva su pie (sin número) y su texto alternativo');
  r.igual(lec.tabla,'Tabla 2 / Ventas por producto / true','la tabla numerada lleva número y título');
  r.cumple(lec.notas==='1#nota-1,2#nota-2'&&lec.lista==='nota-1:Datos del punto de venta. | nota-2:Contra noviembre de 2025.'&&lec.vuelta==='#nota-ref-1','las notas al pie llevan a la lista del final, y de regreso',lec);
  r.igual(lec.xref,'Tabla 2 ✓','la referencia cruzada lleva a su tabla');
  await revisar(p,r,'página con piezas al leer');
  const d=await p.evaluate(function(){return AT.datos.documentos.leer(AT.documentoAbierto)});
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);

  /* ---------- Celular, oscuro, alto contraste ×1.5 y OpenDyslexic ---------- */
  const m=await pagina(browser,{ancho:390,ajustes:{tema:'dark',contraste:'high',escala:1.5,fuente:'opendyslexic'},reducir:true});
  await m.goto(base+'inicio.html');await listo(m);
  await m.evaluate(function(x){return AT.datos.documentos.guardar(x,{conservarFecha:true}).then(function(){return 1})},d);
  await m.goto(base+'documento.html?id='+d.id);await listo(m,500);
  if(/Editar/.test(await m.textContent('#docModo')))await m.click('#docModo');
  await m.waitForSelector('.ed-fig img');await m.waitForTimeout(300);
  await revisar(m,r,'piezas al editar en celular, oscuro, alto contraste ×1.5 y OpenDyslexic');
  await m.click('.ed-cuerpo .ed-nota >> nth=0');await m.waitForSelector('.pz-form');
  await revisar(m,r,'formulario de nota al pie en celular');
  await m.keyboard.press('Escape');
  await m.click('#docModo');await m.waitForSelector('.page figure.fig');await m.waitForTimeout(300);
  await revisar(m,r,'piezas al leer en celular, oscuro, alto contraste ×1.5 y OpenDyslexic');
  await cerrar(m);

  /* ---------- Seguridad: solo imágenes guardadas en la página ---------- */
  const s=await pagina(browser,{ancho:1000,reducir:true});
  await s.goto(base+'inicio.html');await listo(s);
  await s.evaluate(function(){return AT.datos.documentos.guardar({id:'d-imagenes',formato:1,tipo:'notas',titulo:'Prueba',props:[],contenido:{type:'doc',content:[
    {type:'figura',attrs:{id:'b-aaaaaa',clave:'p-aaaaaa',src:'https://ejemplo.com/rastreo.png',titulo:'Externa'}},
    {type:'figura',attrs:{id:'b-bbbbbb',clave:'p-bbbbbb',src:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',titulo:'SVG'}},
    {type:'paragraph',content:[{type:'refCruzada',attrs:{destino:'p-zzzzzz'}},{type:'formula',attrs:{latex:'\\href{javascript:alert(1)}{x}'}}]}]}}).then(function(){return 1})});
  await s.goto(base+'documento.html?id=d-imagenes');await listo(s,500);
  if(/Leer/.test(await s.textContent('#docModo')))await s.click('#docModo');
  await s.waitForSelector('.page figure.fig');await s.waitForTimeout(300);
  const seg=await s.evaluate(function(){return {img:document.querySelectorAll('.page img').length,rota:(document.querySelector('.page .xref.rota')||{}).textContent,js:!!document.querySelector('.page a[href^="javascript"]'),
    formula:(document.querySelector('.page .legado-l')||{}).textContent}});
  r.cumple(seg.img===0&&seg.rota==='(referencia rota)'&&!seg.js,'no se cargan imágenes externas ni SVG, una referencia sin destino se marca y nada crea enlaces javascript:',seg);
  r.cumple(/href\{javascript/.test(seg.formula||''),'una fórmula de antes se ve como texto (legado), sin ejecutarse',seg);
  await cerrar(s);
});
