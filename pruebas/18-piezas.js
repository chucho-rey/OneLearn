/* Tesis: protección de datos y piezas académicas (T3).
   - «Respaldo» en la barra de la tesis: avisa si no hay copias, descarga una copia que se recupera con «Importar
     respaldo» y copia sola en un archivo de la computadora (File System Access, simulado aquí).
   - Figuras con imagen comprimida, título, texto alternativo y nota; tablas numeradas; ecuaciones y fórmulas con
     KaTeX; notas al pie; índices de figuras y tablas; referencias cruzadas que se renumeran solas.
   - La constancia de autoría lista las figuras con su origen y su huella cubre las imágenes. */
'use strict';
const fs=require('fs');
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperarGuardado(p){await p.waitForFunction(function(){return document.getElementById('docEstado').textContent==='Guardado'},null,{timeout:6000})}
/* File System Access simulado: el archivo elegido guarda lo que se escribe en window.__copias */
function simularArchivo(){
  window.__copias=[];window.__permiso='granted';
  window.showSaveFilePicker=function(o){
    window.__sugerido=o&&o.suggestedName;
    return Promise.resolve({name:'mi-tesis.onelearn.json',kind:'file',
      queryPermission:function(){return Promise.resolve(window.__permiso)},
      requestPermission:function(){window.__permiso='granted';return Promise.resolve('granted')},
      createWritable:function(){
        var partes=[];
        return Promise.resolve({write:function(b){partes.push(b);return Promise.resolve()},
          close:function(){return Promise.all(partes.map(function(b){return b.text?b.text():String(b)})).then(function(t){window.__copias.push(t.join(''))})}});
      }});
  };
}
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
function json(p){return p.evaluate(function(){return AT.editorActual.json()})}
function piezas(p){
  return p.evaluate(function(){
    var out=[];
    AT.editorActual.tiptap.state.doc.forEach(function(n,pos){if(/^(figura|tablaNumerada|ecuacion)$/.test(n.type.name))out.push({tipo:n.type.name,pos:pos,clave:n.attrs.clave,titulo:n.attrs.titulo,latex:n.attrs.latex})});
    return out;
  });
}
const TEXTO='La lectura en pantalla cambió la manera en que los estudiantes de bachillerato preparan sus exámenes. '+
  'En esta investigación se comparan dos grupos durante un semestre completo, con las mismas lecturas y las mismas evaluaciones, '+
  'para medir cuánto recuerdan y qué tan rápido encuentran la información que necesitan para resolver cada pregunta. ';

prueba('Tesis · Protección de datos y piezas académicas',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await p.context().addInitScript(simularArchivo);
  await p.goto(base+'inicio.html');await listo(p);
  await p.click('#sideCrear');await p.waitForTimeout(200);
  await Promise.all([p.waitForURL(/documento\.html\?id=d-/),p.click('[data-tipo="tesis"]')]);await listo(p,500);
  const tipos=await p.evaluate(function(){return AT.docActual.contenido.content.slice(0,4).map(function(b){return b.type+(b.attrs.clase?':'+b.attrs.clase:'')}).join(' ')});
  r.igual(tipos,'indice indicePiezas:figura indicePiezas:tabla declaracion','la tesis nueva trae índice general, de figuras y de tablas');

  /* ---------- Protección: «Respaldo» en la barra ---------- */
  r.cumple(await p.isVisible('[data-ts="respaldo"]')&&!await p.evaluate(function(){return document.querySelector('[data-ts="respaldo"]').classList.contains('ts-aviso')}),'la barra de la tesis tiene «Respaldo», sin aviso mientras está casi vacía');
  await p.locator('.ed-cuerpo h2',{hasText:'Introducción'}).click();
  await p.keyboard.press('End');await p.keyboard.press('ArrowDown');
  await p.keyboard.type(TEXTO);
  await esperarGuardado(p);await p.waitForTimeout(200);
  let rb=await p.evaluate(function(){var b=document.querySelector('[data-ts="respaldo"]');return {t:b.textContent,aviso:b.classList.contains('ts-aviso'),aria:b.getAttribute('aria-label')}});
  r.cumple(rb.t==='Sin respaldo'&&rb.aviso&&/Conviene hacer una copia/.test(rb.aria),'con texto y sin copias, avisa «Sin respaldo»',rb);
  await p.click('[data-ts="respaldo"]');await p.waitForSelector('dialog.pr-dlg');await p.waitForTimeout(200);
  let dl=(await p.textContent('.pr-dlg')).replace(/\s+/g,' ');
  r.cumple(/Proteger tu tesis/.test(dl)&&/Todavía no hay ninguna copia fuera del navegador/.test(dl)&&/Copia automática/.test(dl)&&/Importar respaldo/.test(dl),'la ventana explica el riesgo y ofrece copia automática, descarga y cómo recuperarla',dl.slice(0,200));
  await revisar(p,r,'ventana Proteger tu tesis');
  const [des]=await Promise.all([p.waitForEvent('download'),p.click('[data-pr="descargar"]')]);
  const copia=JSON.parse(fs.readFileSync(await des.path(),'utf8'));
  r.cumple(des.suggestedFilename()==='tesis-sin-titulo.onelearn.json'&&copia.app==='OneLearn'&&copia.documentos.length===1&&copia.documentos[0].tipo==='tesis'&&/bachillerato/.test(JSON.stringify(copia.documentos[0].contenido))&&!!copia.documentos[0].autoria,'«Descargar copia» guarda la tesis completa, con su registro de autoría, en el formato del respaldo',des.suggestedFilename());
  await p.waitForTimeout(200);
  r.cumple(/Última copia fuera del navegador: hace un momento/.test(await p.textContent('.pr-dlg'))&&/La última la descargaste hace un momento/.test(await p.textContent('.pr-dlg')),'la ventana anota la copia descargada');
  await p.click('[data-pr="elegir"]');await p.waitForFunction(function(){return window.__copias.length===1});await p.waitForTimeout(200);
  const c1=JSON.parse(await p.evaluate(function(){return window.__copias[0]}));
  r.cumple(c1.documentos[0].id===copia.documentos[0].id&&await p.evaluate(function(){return window.__sugerido})==='tesis-sin-titulo.onelearn.json','«Elegir dónde copiar» escribe la tesis en el archivo elegido');
  r.cumple(/Se copia en mi-tesis\.onelearn\.json cada vez que se guarda/.test((await p.textContent('.pr-dlg')).replace(/\s+/g,' '))&&await p.isVisible('[data-pr="soltar"]'),'y lo dice, con la opción de dejar de copiar');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  rb=await p.evaluate(function(){var b=document.querySelector('[data-ts="respaldo"]');return {t:b.textContent,aviso:b.classList.contains('ts-aviso')}});
  r.cumple(rb.t==='Copia automática'&&!rb.aviso,'la barra muestra «Copia automática»',rb);
  r.cumple(await p.evaluate(function(){return document.activeElement.getAttribute('data-ts')==='respaldo'}),'al cerrar, el foco vuelve a «Respaldo»');
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus()});
  await p.keyboard.type('Los resultados se discuten al final. ');
  await esperarGuardado(p);
  r.cumple(await p.waitForFunction(function(){var c=window.__copias;return c.length>=2&&/se discuten al final/.test(c[c.length-1])},null,{timeout:6000}).then(function(){return true},function(){return false}),'cada vez que se guarda, el archivo se actualiza solo');
  /* Recuperar la copia en otro navegador */
  const q=await pagina(browser,{ancho:1000,reducir:true});
  await q.goto(base+'inicio.html');await listo(q);
  const rec=await q.evaluate(function(c){return AT.datos.importar(c).then(function(res){return AT.datos.documentos.leer(c.documentos[0].id).then(function(d){return {n:res.documentos,tipo:d&&d.tipo,sesiones:d&&d.autoria.sesiones.length}})})},copia);
  r.cumple(rec.n===1&&rec.tipo==='tesis'&&rec.sesiones>=1,'la copia se recupera en otro navegador con «Importar respaldo»',rec);
  await cerrar(q);

  /* ---------- Figura: imagen comprimida, título, texto alternativo y nota ---------- */
  await p.keyboard.press('Enter');
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
  r.cumple(f1.num==='Figura 1'&&f1.foco==='titulo','aparece como «Figura 1», con el cursor en su título',f1);
  await p.keyboard.type('Comprensión lectora por grupo');await p.keyboard.press('Enter');
  r.igual(await p.evaluate(function(){return document.activeElement.getAttribute('data-c')}),'alt','Enter pasa al texto alternativo');
  await p.keyboard.type('Barras: el grupo en papel recuerda más');await p.keyboard.press('Enter');
  await p.keyboard.type('Elaboración propia.');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  let fs1=await piezas(p);
  r.cumple(fs1.length===1&&fs1[0].titulo==='Comprensión lectora por grupo'&&/^p-/.test(fs1[0].clave)&&await p.evaluate(function(){var s=AT.editorActual.tiptap.state.selection;return s.empty&&s.$from.parent.type.name==='paragraph'&&!s.$from.parent.content.size}),'y al terminar la nota, el cursor sigue en un párrafo nuevo',fs1);
  await revisar(p,r,'figura en el editor');
  /* Pegar una imagen */
  await p.keyboard.type('Como se ve en la ');
  await p.evaluate(function(){
    var c=document.createElement('canvas');c.width=300;c.height=200;var x=c.getContext('2d');x.fillStyle='#246';x.fillRect(0,0,300,200);
    return new Promise(function(ok){c.toBlob(function(b){
      var dt=new DataTransfer();dt.items.add(new File([b],'captura.png',{type:'image/png'}));
      document.querySelector('.ed-cuerpo').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));ok();
    },'image/png')});
  });
  await p.waitForFunction(function(){return document.querySelectorAll('.ed-fig').length===2});await p.waitForTimeout(200);
  r.igual(await p.evaluate(function(){return [].map.call(document.querySelectorAll('.ed-fig .ed-num'),function(x){return x.textContent}).join(', ')}),'Figura 1, Figura 2','pegar una imagen crea la «Figura 2»');
  await p.keyboard.type('Captura del examen');await p.keyboard.press('Escape');await p.waitForTimeout(100);
  /* Pegar texto que trae también una imagen (como desde Word): gana el texto */
  await p.evaluate(function(){
    var dt=new DataTransfer();dt.setData('text/plain','texto copiado');dt.items.add(new File(['x'],'vista.png',{type:'image/png'}));
    document.querySelector('.ed-cuerpo').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
  });
  await p.waitForTimeout(300);
  r.cumple(await p.locator('.ed-fig').count()===2&&/texto copiado/.test(await p.textContent('.ed-cuerpo')),'si lo pegado trae texto, se pega el texto (no su imagen)');

  /* ---------- Tabla numerada ---------- */
  await p.keyboard.press('Enter');
  await p.keyboard.type('/tabla');await p.waitForTimeout(200);
  const opT=await p.$$eval('.menu-barra .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(opT[0]==='Tabla'&&opT.indexOf('Tabla numerada')===1,'«/tabla» ofrece la tabla de siempre y la numerada',opT);
  await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await p.waitForTimeout(300);
  r.cumple(await p.textContent('.ed-tnum .ed-num')==='Tabla 1'&&await p.evaluate(function(){return document.activeElement.getAttribute('data-c')})==='titulo','la tabla numerada aparece como «Tabla 1», con el cursor en su título');
  await p.keyboard.type('Puntajes promedio');await p.keyboard.press('Enter');
  await p.keyboard.type('Grupo');await p.waitForTimeout(150);
  const tb=await p.evaluate(function(){var t=null;AT.editorActual.json().content.forEach(function(b){if(b.type==='tablaNumerada')t=b});return {titulo:t.attrs.titulo,celda:t.content[0].content[0].content[0].content[0].content[0].text}});
  r.cumple(tb.titulo==='Puntajes promedio'&&tb.celda==='Grupo','Enter en el título lleva a la primera celda',tb);
  await p.click('.tb-btn[data-k="tabla"]');await p.waitForTimeout(150);
  r.cumple(/Quitar número y título/.test(await p.textContent('.menu')),'el menú «Tabla» puede quitarle el número');
  await p.locator('.menu-i',{hasText:'Quitar número y título'}).click();await p.waitForTimeout(150);
  r.cumple(await p.locator('.ed-tnum').count()===0&&await p.locator('.ed-cuerpo table').count()===1,'sin número queda una tabla normal, con su contenido');
  await p.click('.ed-cuerpo td');await p.click('.tb-btn[data-k="tabla"]');await p.waitForTimeout(150);
  await p.locator('.menu-i',{hasText:'Numerar como'}).click();await p.waitForTimeout(250);
  await p.keyboard.type('Puntajes promedio');await p.keyboard.press('Escape');await p.waitForTimeout(150);
  r.cumple(await p.textContent('.ed-tnum .ed-num')==='Tabla 1'&&/Grupo/.test(await p.textContent('.ed-tnum')),'y una tabla normal se puede numerar después');

  /* ---------- Ecuaciones y fórmulas ---------- */
  await p.keyboard.type('$$');await p.waitForTimeout(300);
  r.cumple(await p.evaluate(function(){return document.activeElement.tagName==='TEXTAREA'&&!!document.activeElement.closest('.ed-ecu')}),'«$$» en una línea vacía crea una ecuación y abre su LaTeX');
  await p.keyboard.type('\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i');await p.keyboard.press('Enter');
  await p.waitForSelector('.ed-ecu .katex');await p.waitForTimeout(200);
  r.cumple(await p.textContent('.ed-ecu .ecu-n')==='(1)'&&await p.evaluate(function(){var s=AT.editorActual.tiptap.state.selection;return s.$from.parent.type.name==='paragraph'}),'se dibuja con KaTeX, numerada «(1)», y Enter vuelve al texto');
  await p.keyboard.type('donde la varianza es $s^2$ y el error');
  await p.waitForSelector('.ed-cuerpo .ed-formula .katex');
  r.igual(await p.evaluate(function(){var f=null;AT.editorActual.tiptap.state.doc.descendants(function(n){if(n.type.name==='formula')f=n.attrs.latex});return f}),'s^2','$s^2$ al escribir se vuelve una fórmula');
  await p.keyboard.type(' entre $5 y $10 pesos.');await p.waitForTimeout(100);
  r.cumple(/entre \$5 y \$10 pesos/.test(await p.textContent('.ed-cuerpo')),'«$5 y $10» se queda como texto');
  /* El aviso de «Imagen agregada» queda abajo, encima del texto: se cierra como lo haría una persona */
  if(await p.isVisible('#avisoApp'))await p.click('#avisoApp .aviso-x');
  await p.click('.ed-cuerpo .ed-formula .katex-html');await p.waitForSelector('.pz-form');
  r.cumple(await p.isVisible('.pz-form .pz-vista .katex'),'tocar una fórmula la abre, con vista previa');
  await p.fill('.pz-form textarea, .pz-form input','\\frac{');await p.waitForTimeout(400);
  r.cumple(await p.evaluate(function(){var v=document.querySelector('.pz-vista');return v.classList.contains('err')&&!!v.title}),'un LaTeX con error se marca, con el motivo');
  await p.fill('.pz-form textarea, .pz-form input','s^{2}');await p.keyboard.press('Enter');await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(){var f=null;AT.editorActual.tiptap.state.doc.descendants(function(n){if(n.type.name==='formula')f=n.attrs.latex});return f}),'s^{2}','y se puede cambiar');
  await p.evaluate(function(){AT.editorActual.tiptap.commands.focus('end')});

  /* ---------- Notas al pie ---------- */
  await p.locator('.ed-cuerpo h2',{hasText:'Conclusiones'}).click();await p.keyboard.press('End');await p.keyboard.press('ArrowDown');
  await p.keyboard.type('El efecto fue moderado');
  await p.keyboard.press('Control+Alt+f');await p.waitForSelector('.pz-form');
  await p.keyboard.type('Tamaño del efecto d = 0.4.');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  /* Una nota antes de la anterior, al principio del primer párrafo (el cursor se pone directo: con flechas,
     ProseMirror lee la selección hasta la siguiente tecla que escribe) */
  await p.evaluate(function(){
    var ed=AT.editorActual.tiptap,pos=null;
    ed.state.doc.forEach(function(n,o){if(pos==null&&n.type.name==='paragraph'&&/^La lectura en pantalla/.test(n.textContent))pos=o});
    ed.chain().focus().setTextSelection(pos+1).run();
  });
  await p.keyboard.press('Control+Alt+f');await p.waitForSelector('.pz-form');
  await p.keyboard.type('Datos del ciclo escolar 2025.');await p.keyboard.press('Enter');await p.waitForTimeout(250);
  const notas=await p.evaluate(function(){return {sup:[].map.call(document.querySelectorAll('.ed-cuerpo .ed-nota'),function(x){return x.textContent}).join(','),lista:[].map.call(document.querySelectorAll('.ed-notas li'),function(x){return x.textContent}).join(' | ')}});
  r.cumple(notas.sup==='1,2'&&notas.lista==='Datos del ciclo escolar 2025. | Tamaño del efecto d = 0.4.','las notas se numeran en el orden del texto y se listan al final',notas);
  await p.click('.ed-notas li >> nth=1 >> button');await p.waitForSelector('.pz-form');
  r.cumple(await p.inputValue('.pz-form textarea')==='Tamaño del efecto d = 0.4.'&&await p.isVisible('.pz-form [data-q]'),'tocar una nota la abre para cambiarla o quitarla');
  await p.keyboard.press('Escape');await p.waitForTimeout(100);

  /* ---------- Referencias cruzadas e índices ---------- */
  await p.evaluate(function(){
    var ed=AT.editorActual.tiptap,pos=null,tras=false;
    ed.state.doc.forEach(function(n,o){if(pos==null&&tras&&n.type.name==='paragraph')pos=o;if(n.type.name==='heading'&&n.textContent==='Capítulo 4. Resultados')tras=true});
    ed.chain().focus().setTextSelection(pos+1).run();
  });
  await p.keyboard.type('Como muestra la ');
  await p.keyboard.type('/cruzada');await p.waitForTimeout(200);
  r.igual(await p.textContent('.menu-barra .menu-i b'),'Referencia cruzada','«/cruzada» ofrece la referencia cruzada');
  await p.keyboard.press('Enter');await p.waitForSelector('.menu[aria-label="Referencia cruzada a…"]');
  const dest=await p.$$eval('.menu .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(dest[0]==='Figura 1. Comprensión lectora por grupo'&&dest.indexOf('Tabla 1. Puntajes promedio')>=0&&dest.indexOf('Ecuación (1)')>=0&&dest.indexOf('Introducción')>=0,'ofrece figuras, tablas, ecuaciones y secciones',dest.slice(0,5));
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  await p.keyboard.type('y la ');
  await p.evaluate(function(){AT.editorActual.insertar('refCruzada')});await p.waitForSelector('.menu[aria-label="Referencia cruzada a…"]');
  await p.locator('.menu-i',{hasText:'Figura 2'}).click();await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(){return [].map.call(document.querySelectorAll('.ed-cuerpo .xref'),function(x){return x.textContent}).join(', ')}),'Figura 1, Figura 2','la referencia dice el número de lo que cita');
  r.igual(await p.textContent('.ed-indice >> nth=1'),'Índice de figurasFigura 1. Comprensión lectora por grupoFigura 2. Captura del examen','el índice de figuras se arma solo');
  r.igual(await p.textContent('.ed-indice >> nth=2'),'Índice de tablasTabla 1. Puntajes promedio','y el de tablas');
  /* Mover la figura 2 arriba de la 1: números, referencias e índice se actualizan */
  await p.evaluate(function(){
    /* Alt+↑ las veces necesarias, hasta quedar arriba de la figura 1 */
    var ed=AT.editorActual.tiptap;
    function figs(){var l=[];ed.state.doc.forEach(function(n,o){if(n.type.name==='figura')l.push(o)});return l}
    for(var i=0;i<20&&figs()[1]>figs()[0]-1&&figs()[0]<figs()[1];i++){
      var f=figs();if(!AT.editor.moverBloque(ed,-1,f[1]))break;
      var g=figs();if(g.length===2&&ed.state.doc.nodeAt(g[0]).attrs.titulo==='Captura del examen')break;
    }
  });await p.waitForTimeout(150);
  const tras=await p.evaluate(function(){return {
    nums:[].map.call(document.querySelectorAll('.ed-fig'),function(f){return f.querySelector('.ed-num').textContent+' '+f.querySelector('[data-c="titulo"]').value}).join(' | '),
    xref:[].map.call(document.querySelectorAll('.ed-cuerpo .xref'),function(x){return x.textContent}).join(', '),
    ind:document.querySelectorAll('.ed-indice')[1].textContent}});
  r.cumple(tras.nums==='Figura 1 Captura del examen | Figura 2 Comprensión lectora por grupo'&&tras.xref==='Figura 2, Figura 1'&&/Figura 1\. Captura del examen/.test(tras.ind),'al mover una figura, su número, sus referencias y el índice se actualizan solos',tras);
  await p.click('.ed-cuerpo .xref >> nth=0');await p.waitForTimeout(150);
  r.cumple(/Ir a Figura 2/.test(await p.textContent('.menu')),'tocar una referencia ofrece ir a lo citado');
  await p.locator('.menu-i',{hasText:'Ir a Figura 2'}).click();await p.waitForTimeout(150);
  r.cumple(await p.evaluate(function(){var s=AT.editorActual.tiptap.state.selection;return !!s.node&&s.node.type.name==='figura'&&s.node.attrs.titulo==='Comprensión lectora por grupo'}),'y lleva hasta ella');
  await revisar(p,r,'tesis con piezas en el editor');

  /* ---------- Autoría: figuras sin nota y constancia ---------- */
  await esperarGuardado(p);
  await p.click('[data-ts="autoria"]');await p.waitForSelector('dialog.au-dlg');
  r.cumple(/1 figura no tiene nota de origen/.test(await p.textContent('.au-dlg')),'«Autoría» avisa de las figuras sin nota de origen');
  const [con]=await Promise.all([p.waitForEvent('download'),p.click('[data-au="constancia"]')]);
  const html=fs.readFileSync(await con.path(),'utf8');
  r.cumple(/<h2>Figuras y tablas<\/h2>/.test(html)&&/Comprensión lectora por grupo<\/td><td>Elaboración propia\./.test(html)&&/Captura del examen<\/td><td>Sin indicar/.test(html)&&/del texto del documento y de sus imágenes/.test(html),'la constancia lista figuras y tablas con su origen, y su huella cubre las imágenes');
  const h1=await p.evaluate(function(){return AT.autoria.huella(AT.autoria.contenidoHuella(Object.assign({},AT.docActual,{contenido:AT.editorActual.json()})))});
  const h2=await p.evaluate(function(){
    var c=AT.editorActual.json();c.content.forEach(function(b){if(b.type==='figura'&&b.attrs.titulo==='Captura del examen')b.attrs.src=b.attrs.src.slice(0,-8)+'AAAAAAA=';});
    return AT.autoria.huella(AT.autoria.contenidoHuella(Object.assign({},AT.docActual,{contenido:c})));
  });
  r.cumple(/^[0-9a-f]{64}$/.test(h1)&&h1!==h2,'cambiar una imagen cambia la huella');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);

  /* ---------- Markdown ---------- */
  const md=await p.evaluate(function(){AT.docActual.contenido=AT.editorActual.json();return AT.documentoMarkdown(AT.docActual)});
  r.cumple(/\*\*Figura 2\*\*\n\n\*Comprensión lectora por grupo\*\n\n!\[Barras: el grupo en papel recuerda más\]\(data:image\/webp;base64,/.test(md)&&/\*Nota\.\* Elaboración propia\./.test(md),'el Markdown lleva las figuras con número, título, imagen y nota');
  r.cumple(/\$\$\n\\bar\{x\} = .*\\tag\{1\}\n\$\$/.test(md)&&/\$s\^\{2\}\$/.test(md)&&/\*\*Tabla 1\*\*\n\n\*Puntajes promedio\*/.test(md),'las ecuaciones, fórmulas y tablas numeradas');
  r.cumple(/\[\^1\]La lectura en pantalla/.test(md)&&/\n\[\^1\]: Datos del ciclo escolar 2025\.\n\[\^2\]: Tamaño del efecto d = 0\.4\.\n$/.test(md)&&/Como muestra la Figura 2 y la Figura 1/.test(md)&&/## Índice de figuras\n\n- Figura 1\. Captura del examen/.test(md),'las notas al pie, las referencias cruzadas y los índices',md.slice(-200));

  /* ---------- Leer ---------- */
  await esperarGuardado(p);
  await p.reload();await listo(p,500);
  if(/Leer/.test(await p.textContent('#docModo')))await p.click('#docModo');
  await p.waitForSelector('.page figure.fig');await p.waitForSelector('.page .ecu .katex');
  const lec=await p.evaluate(function(){
    var f=document.querySelectorAll('.page figure.fig:not(.tabla-num)')[1];
    var t=document.querySelector('.page figure.tabla-num');
    return {
      fig:f.querySelector('.fig-n').textContent+' / '+f.querySelector('.fig-t').textContent+' / '+f.querySelector('img').alt+' / '+f.querySelector('.fig-nota').textContent,
      orden:[].indexOf.call(f.children,f.querySelector('figcaption'))<[].indexOf.call(f.children,f.querySelector('img')),
      tabla:t.querySelector('.fig-n').textContent+' / '+t.querySelector('.fig-t').textContent+' / '+!!t.querySelector('table'),
      ecu:document.querySelector('.page .ecu-n').textContent,formula:!!document.querySelector('.page .formula .katex'),
      notas:[].map.call(document.querySelectorAll('.page .nota-ref a'),function(a){return a.textContent+a.getAttribute('href')}).join(','),
      lista:[].map.call(document.querySelectorAll('.notas-pie li'),function(l){return l.id+':'+l.textContent.trim()}).join(' | '),
      vuelta:document.querySelector('.notas-pie .nota-vuelta').getAttribute('href'),
      xref:[].map.call(document.querySelectorAll('.page a.xref'),function(a){var d=document.getElementById(a.getAttribute('href').slice(1));return a.textContent+(d?' ✓':' ✗')}).join(', '),
      ind:[].map.call(document.querySelectorAll('.indice-piezas'),function(x){return x.querySelector('h2').textContent+': '+x.querySelectorAll('[data-go]').length}).join(', ')
    };
  });
  r.cumple(lec.fig==='Figura 2 / Comprensión lectora por grupo / Barras: el grupo en papel recuerda más / Nota. Elaboración propia.'&&lec.orden,'al leer, la figura va como pide APA: número, título en cursiva, imagen y nota',lec.fig);
  r.cumple(lec.tabla==='Tabla 1 / Puntajes promedio / true','la tabla numerada lleva número y título',lec.tabla);
  r.cumple(lec.ecu==='(1)'&&lec.formula,'ecuaciones y fórmulas se dibujan con KaTeX');
  r.cumple(lec.notas==='1#nota-1,2#nota-2'&&lec.lista==='nota-1:Datos del ciclo escolar 2025. | nota-2:Tamaño del efecto d = 0.4.'&&lec.vuelta==='#nota-ref-1','las notas al pie llevan a la lista del final, y de regreso',lec);
  r.cumple(lec.xref==='Figura 2 ✓, Figura 1 ✓'&&lec.ind==='Índice de figuras: 2, Índice de tablas: 1','las referencias cruzadas y los índices llevan a su pieza',lec);
  await revisar(p,r,'tesis con piezas al leer');
  const d=await p.evaluate(function(){return AT.datos.documentos.leer(AT.documentoAbierto)});
  await cerrar(p);

  /* ---------- Celular, oscuro, alto contraste ×1.5 y OpenDyslexic ---------- */
  const m=await pagina(browser,{ancho:390,ajustes:{tema:'dark',contraste:'high',escala:1.5,fuente:'opendyslexic'},reducir:true});
  await m.goto(base+'inicio.html');await listo(m);
  await m.evaluate(function(x){return AT.datos.documentos.guardar(x,{conservarFecha:true}).then(function(){return 1})},d);
  await m.goto(base+'documento.html?id='+d.id);await listo(m,500);
  if(/Editar/.test(await m.textContent('#docModo')))await m.click('#docModo');
  await m.waitForSelector('.ed-ecu .katex');await m.waitForTimeout(300);
  await revisar(m,r,'piezas al editar en celular, oscuro, alto contraste ×1.5 y OpenDyslexic');
  await m.click('[data-ts="respaldo"]');await m.waitForSelector('dialog.pr-dlg');await m.waitForTimeout(200);
  await revisar(m,r,'ventana Proteger en celular');
  await m.keyboard.press('Escape');await m.waitForTimeout(150);
  await m.click('.ed-cuerpo .ed-formula .katex-html');await m.waitForSelector('.pz-form .katex');
  await revisar(m,r,'formulario de fórmula en celular');
  await m.keyboard.press('Escape');
  await m.click('#docModo');await m.waitForSelector('.page .ecu .katex');await m.waitForTimeout(300);
  await revisar(m,r,'piezas al leer en celular, oscuro, alto contraste ×1.5 y OpenDyslexic');
  await cerrar(m);

  /* ---------- En otros documentos: imágenes, ecuaciones y notas sí; numeración de tesis, no ---------- */
  const n=await pagina(browser,{ancho:1280,reducir:true});
  await n.goto(base+'inicio.html');await listo(n);
  await Promise.all([n.waitForURL(/documento\.html/),n.evaluate(function(){AT.crear.nuevo('libreta');return 1}).catch(function(){return 1})]);await listo(n,400);
  await n.evaluate(function(){AT.editorActual.enfocar('end')});
  await n.keyboard.press('Enter');await n.keyboard.type('/tabla');await n.waitForTimeout(200);
  const opN=await n.$$eval('.menu-barra .menu-i b',function(e){return e.map(function(x){return x.textContent})});
  r.cumple(opN.indexOf('Tabla')>=0&&opN.indexOf('Tabla numerada')<0&&opN.indexOf('Índice de tablas')<0,'una libreta no ofrece tablas numeradas ni índices de tablas',opN);
  await n.keyboard.press('Escape');await n.keyboard.press('Control+a');await n.keyboard.press('Backspace');
  await n.keyboard.type('/imagen');await n.waitForTimeout(200);
  const [fc2]=await Promise.all([n.waitForEvent('filechooser'),n.keyboard.press('Enter')]);
  await fc2.setFiles({name:'a.png',mimeType:'image/png',buffer:await imagenGrande(n,400,300)});
  await n.waitForSelector('.ed-fig img');
  r.cumple(await n.textContent('.ed-fig .ed-num')==='Imagen'&&await n.locator('.ed-fig [data-c="nota"]').count()===0,'en una libreta la imagen no se numera ni pide nota');
  await n.keyboard.press('Escape');await n.keyboard.type('$$');await n.waitForTimeout(200);
  await n.keyboard.type('a^2+b^2=c^2');await n.keyboard.press('Enter');await n.waitForSelector('.ed-ecu .katex');
  r.cumple(await n.textContent('.ed-ecu .ecu-n')==='(1)','pero sí tiene ecuaciones');
  await cerrar(n);

  /* ---------- Seguridad: solo imágenes guardadas en el documento ---------- */
  const s=await pagina(browser,{ancho:1000,reducir:true});
  await s.goto(base+'inicio.html');await listo(s);
  await s.evaluate(function(){return AT.datos.documentos.guardar({id:'d-imagenes',formato:1,tipo:'tesis',titulo:'Prueba',props:[],fuentes:[],contenido:{type:'doc',content:[
    {type:'figura',attrs:{id:'b-aaaaaa',clave:'p-aaaaaa',src:'https://ejemplo.com/rastreo.png',titulo:'Externa'}},
    {type:'figura',attrs:{id:'b-bbbbbb',clave:'p-bbbbbb',src:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',titulo:'SVG'}},
    {type:'paragraph',content:[{type:'refCruzada',attrs:{destino:'p-zzzzzz'}},{type:'formula',attrs:{latex:'\\href{javascript:alert(1)}{x}'}}]}]}}).then(function(){return 1})});
  await s.goto(base+'documento.html?id=d-imagenes');await listo(s,500);
  if(/Leer/.test(await s.textContent('#docModo')))await s.click('#docModo');
  await s.waitForSelector('.page figure.fig');await s.waitForTimeout(500);
  const seg=await s.evaluate(function(){return {img:document.querySelectorAll('.page img').length,rota:(document.querySelector('.page .xref.rota')||{}).textContent,js:!!document.querySelector('.page a[href^="javascript"]')}});
  r.cumple(seg.img===0&&seg.rota==='(referencia rota)'&&!seg.js,'no se cargan imágenes externas ni SVG, una referencia sin destino se marca y KaTeX no crea enlaces',seg);
  await cerrar(s);
});
