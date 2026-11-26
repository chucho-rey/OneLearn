/* El explorador de tus páginas (Inicio) y los permisos: columnas (nombre, modificado y por quién, tipo, trabajando
   ahora, permisos y tamaño), ordenar, ubicaciones, buscar, teclado, selección y acciones (favorita, papelera con
   «Deshacer»), menú de cada página (clic derecho y «⋯»), duplicar, columnas y tarjetas; quién tiene abierta una
   página; «Personas y permisos» (tu nombre, invitar, cambiar, quitar); una página de otra persona se abre solo para
   leer y se pide permiso; el recorrido entre dos personas con respaldos (pedir, aprobar y recibir el permiso);
   restaurar tu respaldo en otro navegador conserva tus páginas; celular, contraste y desbordes. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const NEG={perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Abarrotes Ana',giro:'tienda',telefono:''},creado:'2026-01-01'};
const CAP=process.env.CAPTURAS||'';
function filas(p){return p.evaluate(function(){return [].map.call(document.querySelectorAll('#xpLista [data-fila]'),function(f){var a=f.querySelector('.xp-a span');return a?a.textContent:''})})}
function guardado(p){return p.waitForFunction(function(){var e=document.querySelector('.doc-estado');return e&&e.getAttribute('data-k')==='ok'},null,{timeout:8000})}
/* Siembra páginas con fechas distintas (de la más nueva a la más vieja) */
function sembrar(p,tipos){
  return p.evaluate(function(tipos){
    return tipos.reduce(function(pr,t,i){return pr.then(function(){
      var d=AT.crear.armar(t[0]);d.titulo=t[1];d.editado=new Date(Date.now()-(i+1)*36e5).toISOString();if(t[2])d.favorito=true;
      return AT.datos.documentos.guardar(d,{conservarFecha:true});
    })},Promise.resolve());
  },tipos);
}

prueba('Explorador de páginas y permisos',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1600,alto:1000,reducir:true,perfil:NEG});
  await p.goto(base+'inicio.html');await listo(p,500);
  await sembrar(p,[['corte','Corte de caja'],['inventario','Inventario'],['venta','Nota de venta V-001',true],['fiado','Fiado de clientes'],['notas','Ideas para diciembre'],['gastos','Gastos de noviembre']]);
  await p.reload();await listo(p,800);
  await p.waitForSelector('#xpLista [data-fila]');

  /* ---------- Columnas y orden ---------- */
  const enc=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.xp-t thead th'),function(t){return t.textContent.trim()}).filter(Boolean)});
  r.cumple(['Nombre','Modificado','Tipo','Trabajando ahora','Permisos','Tamaño'].every(function(c){return enc.indexOf(c)>=0}),'columnas: nombre, modificado, tipo, trabajando ahora, permisos y tamaño',enc);
  r.igual((await filas(p)).join('|'),'Corte de caja|Inventario|Nota de venta V-001|Fiado de clientes|Ideas para diciembre|Gastos de noviembre','de lo más reciente a lo más viejo');
  r.igual(await p.getAttribute('.xp-t th:has([data-orden="modificado"])','aria-sort'),'descending','«Modificado» dice cómo está ordenado');
  await p.click('[data-orden="nombre"]');await p.waitForTimeout(100);
  r.igual((await filas(p))[0],'Corte de caja','al ordenar por nombre: A a Z');
  r.igual(await p.getAttribute('.xp-t th:has([data-orden="nombre"])','aria-sort'),'ascending','y lo dice el encabezado');
  await p.click('[data-orden="nombre"]');await p.waitForTimeout(100);
  r.igual((await filas(p))[0],'Nota de venta V-001','otro clic: Z a A');
  await p.reload();await listo(p,700);await p.waitForSelector('#xpLista [data-fila]');
  r.igual((await filas(p))[0],'Nota de venta V-001','el orden se recuerda');
  await p.click('[data-orden="modificado"]');await p.waitForTimeout(100);
  r.igual((await filas(p))[0],'Corte de caja','ordenar por modificado (lo más nuevo primero)');
  r.cumple(/Corte de caja/.test(await p.textContent('#xpLista [data-fila] .xp-c-tipo')),'el tipo de cada página');
  r.cumple(/\d+(\.\d)? KB|\d+ B/.test(await p.textContent('#xpLista [data-fila] .xp-c-tam')),'y su tamaño');

  /* ---------- Ubicaciones y buscar ---------- */
  r.igual(await p.textContent('[data-ubic="favoritas"] em'),'1','«Favoritas» cuenta las tuyas');
  await p.click('[data-ubic="favoritas"]');await p.waitForTimeout(100);
  r.igual((await filas(p)).join('|'),'Nota de venta V-001','«Favoritas» muestra solo esas');
  r.cumple(/Tus páginas.*Favoritas/.test(await p.textContent('#xpRuta')),'la ruta dice dónde estás');
  await p.click('[data-ubic="cat:negocio"]');await p.waitForTimeout(100);
  r.cumple((await filas(p)).indexOf('Ideas para diciembre')<0&&(await filas(p)).length===5,'«Por tipo: Negocio» deja fuera las notas');
  await p.click('[data-ubic="todas"]');await p.waitForTimeout(100);
  await p.fill('#xpQ','INVENTÁRIO');await p.waitForTimeout(300);
  r.igual((await filas(p)).join('|'),'Inventario','buscar sin importar mayúsculas ni acentos');
  r.cumple(/1 página · buscando «INVENTÁRIO»/.test(await p.textContent('#xpEstado')),'la barra de estado lo dice');
  await p.keyboard.press('Escape');await p.waitForTimeout(250);
  r.igual((await filas(p)).length,6,'Esc borra la búsqueda');

  /* ---------- Teclado y selección ---------- */
  await p.focus('#xpLista [data-fila] [data-k="abrir"]');
  await p.keyboard.press('ArrowDown');await p.waitForTimeout(50);
  r.cumple(/Inventario/.test(await p.evaluate(function(){return document.activeElement.textContent})),'flecha abajo: la siguiente página');
  r.cumple(await p.evaluate(function(){return [].filter.call(document.querySelectorAll('#xpLista [data-k="abrir"]'),function(a){return a.tabIndex===0}).length===1}),'solo una página a la vez entra con Tab (las flechas mueven)');
  await p.keyboard.press('Space');await p.waitForTimeout(50);
  r.cumple(/1 seleccionada/.test(await p.textContent('#xpEstado'))&&await p.isVisible('#xpSelAcc'),'espacio la selecciona y aparecen sus acciones');
  await p.keyboard.press('Control+a');await p.waitForTimeout(50);
  r.cumple(/6 seleccionadas/.test(await p.textContent('#xpEstado')),'Ctrl + A las selecciona todas');
  await p.keyboard.press('Escape');await p.waitForTimeout(50);
  r.cumple(!/seleccionada/.test(await p.textContent('#xpEstado')),'Esc quita la selección');
  /* Clic en la fila (no en el nombre) selecciona; con Ctrl suma */
  await p.click('#xpLista [data-fila]:nth-child(5) .xp-c-tipo');await p.click('#xpLista [data-fila]:nth-child(6) .xp-c-tipo',{modifiers:['Control']});
  r.cumple(/2 seleccionadas/.test(await p.textContent('#xpEstado')),'clic selecciona y Ctrl + clic suma');
  await p.click('[data-sel="papelera"]');await p.waitForSelector('dialog[open] [data-pap="si"]');
  r.cumple(/2 páginas salen de tus páginas/.test(await p.textContent('dialog[open]')),'mandar a la papelera pide confirmación');
  await p.click('dialog[open] [data-pap="si"]');await p.waitForTimeout(800);
  r.cumple((await filas(p)).length===4&&/2 páginas se movieron a la papelera/.test(await p.textContent('#avisoApp')),'se van a la papelera y se avisa');
  r.igual(await p.textContent('[data-papelera] em'),'2','la papelera las cuenta');
  await p.click('#avisoApp button:has-text("Deshacer")');await p.waitForTimeout(900);
  r.igual((await filas(p)).length,6,'«Deshacer» las regresa');

  /* ---------- Menú de una página ---------- */
  await p.click('#xpLista [data-fila]:has-text("Fiado de clientes") [data-k="mas"]');
  await p.waitForSelector('.xp-menu');
  const items=await p.evaluate(function(){return [].map.call(document.querySelectorAll('.xp-menu [role^="menuitem"]'),function(b){return b.textContent})});
  r.cumple(['Abrir','Abrir en otra pestaña','Agregar a favoritas','Personas y permisos…','Historial de versiones','Duplicar','Mover a la papelera'].every(function(t){return items.indexOf(t)>=0}),'el menú: abrir, otra pestaña, favorita, permisos, historial, duplicar y papelera',items);
  r.igual(await p.evaluate(function(){return document.activeElement.textContent}),'Abrir','el foco entra al menú');
  await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');
  r.igual(await p.evaluate(function(){return document.activeElement.textContent}),'Agregar a favoritas','las flechas recorren el menú');
  await p.keyboard.press('Escape');await p.waitForTimeout(100);
  r.cumple(!(await p.$('.xp-menu'))&&await p.evaluate(function(){return document.activeElement.getAttribute('data-k')==='mas'}),'Esc lo cierra y el foco vuelve a «⋯»');
  const antes=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return d.titulo==='Fiado de clientes'})[0].editado})});
  await p.click('#xpLista [data-fila]:has-text("Fiado de clientes") .xp-c-tipo',{button:'right'});
  await p.waitForSelector('.xp-menu');
  await p.click('.xp-menu [role="menuitem"]:has-text("Agregar a favoritas")');await p.waitForTimeout(600);
  const fav=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){var d=l.filter(function(d){return d.titulo==='Fiado de clientes'})[0];return [!!d.favorito,d.editado]})});
  r.cumple(fav[0]&&fav[1]===antes,'clic derecho: «Agregar a favoritas» (sin cambiar la fecha)',fav);
  r.igual(await p.textContent('[data-ubic="favoritas"] em'),'2','y la cuenta sube');
  await p.click('#xpLista [data-fila]:has-text("Ideas para diciembre") [data-k="mas"]');await p.waitForSelector('.xp-menu');
  await p.click('.xp-menu [role="menuitem"]:has-text("Duplicar")');await p.waitForTimeout(800);
  r.cumple((await filas(p)).indexOf('Copia de Ideas para diciembre')>=0,'«Duplicar» crea la copia');

  /* ---------- Columnas y tarjetas ---------- */
  await p.click('#xpCols');await p.waitForSelector('.xp-menu');
  await p.click('.xp-menu [role="menuitemcheckbox"]:has-text("Tamaño")');await p.waitForTimeout(150);
  r.cumple(!(await p.$('.xp-t th.xp-c-tam'))&&await p.getAttribute('.xp-menu [role="menuitemcheckbox"]:has-text("Tamaño")','aria-checked')==='false','«Columnas» esconde el tamaño');
  await p.keyboard.press('Escape');
  await p.click('[data-vista="tarjetas"]');await p.waitForTimeout(150);
  r.cumple(await p.isVisible('.xp-tjs')&&(await filas(p)).length===7,'vista de tarjetas');
  await revisar(p,r,'Explorador en tarjetas');
  await p.reload();await listo(p,700);await p.waitForSelector('#xpLista [data-fila]');
  r.cumple(await p.isVisible('.xp-tjs'),'la vista se recuerda');
  await p.click('[data-vista="detalles"]');await p.click('#xpCols');await p.click('.xp-menu [role="menuitemcheckbox"]:has-text("Tamaño")');await p.keyboard.press('Escape');

  /* ---------- Quién está trabajando ahora ---------- */
  const idInv=await p.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return l.filter(function(d){return d.titulo==='Inventario'})[0].id})});
  const otra=await p.context().newPage();
  await otra.goto(base+'documento.html?id='+idInv);await listo(otra,700);
  await p.waitForFunction(function(id){var c=document.querySelector('#xpLista [data-fila="'+id+'"] .xp-c-ahora');return c&&/Tú · editando/.test(c.textContent)},idInv,{timeout:8000});
  r.cumple(true,'«Trabajando ahora»: Tú · editando, mientras la tienes abierta en otra pestaña');
  /* Al editar ahí, «Modificado» dice quién */
  await otra.click('.ProseMirror');await otra.keyboard.type('Revisar existencias');await otra.waitForTimeout(800);await guardado(otra);
  await otra.close();
  await p.waitForFunction(function(id){var c=document.querySelector('#xpLista [data-fila="'+id+'"] .xp-c-ahora');return c&&!/Tú/.test(c.textContent)},idInv,{timeout:8000});
  r.cumple(true,'al cerrarla, ya nadie la tiene abierta');
  r.cumple(/por Ana/.test(await p.textContent('#xpLista [data-fila="'+idInv+'"] .xp-c-mod'))||/por Tú/.test(await p.textContent('#xpLista [data-fila="'+idInv+'"] .xp-c-mod')),'«Modificado» dice quién la editó');

  /* ---------- Personas y permisos (eres la propietaria) ---------- */
  await p.click('#xpLista [data-fila="'+idInv+'"] [data-k="perm"]');
  await p.waitForSelector('dialog.perm-dlg[open]');
  r.cumple(/Personas y permisos/.test(await p.textContent('dialog.perm-dlg'))&&/Propietario/.test(await p.textContent('.perm-l')),'«Permisos» abre la ventana con quién tiene acceso');
  await p.click('[data-perm="yo"]');await p.fill('#permYoNombre','Ana López');await p.fill('#permYo [name="correo"]','ana@ejemplo.com');await p.click('#permYo [type="submit"]');await p.waitForTimeout(200);
  r.cumple(/Ana López \(tú\)/.test(await p.textContent('.perm-l'))&&/ana@ejemplo\.com/.test(await p.textContent('.perm-l')),'pones tu nombre y correo');
  await p.fill('#permInvCorreo','no-es-correo');await p.click('#permInv [type="submit"]');await p.waitForTimeout(200);
  r.cumple(/Escribe un correo válido/.test(await p.textContent('#permMsg')),'un correo mal escrito se avisa');
  await p.fill('#permInv [name="nombre"]','Luis Gómez');await p.fill('#permInvCorreo','luis@ejemplo.com');await p.selectOption('#permInv [name="rol"]','editor');
  await p.click('#permInv [type="submit"]');await p.waitForTimeout(400);
  r.cumple(/Luis Gómez/.test(await p.textContent('.perm-l'))&&/Invitación pendiente/.test(await p.textContent('.perm-l')),'invitar a alguien: queda con su permiso y la invitación pendiente');
  await p.fill('#permInv [name="nombre"]','María');await p.fill('#permInvCorreo','maria@ejemplo.com');await p.selectOption('#permInv [name="rol"]','lector');await p.click('#permInv [type="submit"]');await p.waitForTimeout(400);
  const luis=await p.evaluate(function(){return [].filter.call(document.querySelectorAll('.perm-p'),function(li){return /Luis/.test(li.textContent)})[0].querySelector('select').id});
  await p.selectOption('#'+luis,'admin');await p.waitForTimeout(400);
  const roles=await p.evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){return d.acceso.personas.map(function(x){return x.nombre+':'+x.rol}).join(',')})},idInv);
  r.igual(roles,'Luis Gómez:admin,María:lector','cambiar el permiso de alguien se guarda');
  await p.click('.perm-p:has-text("María") [data-perm="quitar"]');await p.waitForTimeout(400);
  r.cumple(!/María/.test(await p.textContent('.perm-l')),'«Quitar» le quita el acceso');
  /* Escribir y cambiar permisos al mismo tiempo (como con la página abierta en otra pestaña) no pierde nada */
  const carrera=await p.evaluate(function(id){
    var A=AT.datos.acceso;
    return AT.datos.documentos.leer(id).then(function(d){
      d.contenido.content.push({type:'paragraph',attrs:{id:'b-carrera'},content:[{type:'text',text:'Escrito al mismo tiempo'}]});
      return Promise.all([AT.datos.documentos.guardar(d),A.invitar(id,{nombre:'Pepe',correo:'pepe@ejemplo.com',rol:'lector'})]);
    }).then(function(){return AT.datos.documentos.leer(id)}).then(function(d){
      var r=[JSON.stringify(d.contenido).indexOf('Escrito al mismo tiempo')>=0,d.acceso.personas.some(function(x){return x.correo==='pepe@ejemplo.com'})];
      var pepe=d.acceso.personas.filter(function(x){return x.correo==='pepe@ejemplo.com'})[0];
      return (pepe?A.quitar(id,pepe.id):Promise.resolve()).then(function(){return r});
    });
  },idInv);
  r.cumple(carrera[0]&&carrera[1],'escribir y cambiar permisos al mismo tiempo no pierde ninguno de los dos',carrera);
  await p.waitForTimeout(300);
  await revisar(p,r,'Personas y permisos');
  if(CAP)await p.locator('dialog.perm-dlg').screenshot({path:CAP+'/permisos.png'});
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  r.cumple(/2 personas|Propietario/.test(await p.getAttribute('#xpLista [data-fila="'+idInv+'"] [data-k="perm"]','aria-label'))&&/2 personas/.test(await p.getAttribute('#xpLista [data-fila="'+idInv+'"] [data-k="perm"]','aria-label')),'la columna «Permisos» se actualiza');
  r.igual(await p.textContent('[data-ubic="compartidas"] em'),'1','«Compartidas» la cuenta');
  r.cumple(await p.evaluate(function(){return document.activeElement&&document.activeElement.getAttribute('data-k')==='perm'}),'al cerrar, el foco vuelve a la columna de permisos');
  await revisar(p,r,'Explorador (escritorio)');
  if(CAP)await p.locator('#iniPaginas').screenshot({path:CAP+'/explorador.png'});
  const respaldoAna=await p.evaluate(function(){return AT.datos.exportar()});
  await cerrar(p);

  /* ---------- Otra persona: Luis recibe la página (por respaldo), la ve, pide permiso ---------- */
  const l=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:{perfil:'negocio',modulos:['negocio'],nombre:'Luis',negocio:{nombre:'Tienda Luis',giro:'tienda',telefono:''},creado:'2026-01-01'}});
  await l.goto(base+'inicio.html');await listo(l,500);
  await l.evaluate(function(){AT.datos.cambiarYo({nombre:'Luis Gómez',correo:'luis@ejemplo.com'})});
  /* Solo la página de inventario, con María otra vez como lectora y Luis como lector */
  const soloInv=JSON.parse(JSON.stringify(respaldoAna));
  soloInv.documentos=soloInv.documentos.filter(function(d){return d.id===idInv});
  soloInv.documentos[0].acceso.personas.forEach(function(x){if(x.correo==='luis@ejemplo.com')x.rol='lector'});
  soloInv.documentos[0].acceso.cambio=new Date(Date.now()+1000).toISOString();
  ['plantillas','bases','filas'].forEach(function(k){soloInv[k]=[]});
  await l.evaluate(function(d){return AT.datos.importar(d)},soloInv);
  r.cumple(await l.evaluate(function(){return AT.datos.yo().nombre==='Luis Gómez'}),'importar páginas de otra persona no te cambia quién eres');
  await l.reload();await listo(l,700);await l.waitForSelector('#xpLista [data-fila]');
  r.igual(await l.textContent('[data-ubic="contigo"] em'),'1','«Compartidas contigo» aparece');
  const fila='#xpLista [data-fila="'+idInv+'"]';
  r.cumple(/Solo puede ver/.test(await l.textContent(fila+' .xp-rol'))&&/Solo lectura/.test(await l.textContent(fila)),'la página dice tu permiso: solo puede ver');
  await l.click(fila+' [data-k="mas"]');await l.waitForSelector('.xp-menu');
  const itL=await l.evaluate(function(){return [].map.call(document.querySelectorAll('.xp-menu [role^="menuitem"]'),function(b){return b.textContent})});
  r.cumple(itL.indexOf('Mover a la papelera')<0&&itL.indexOf('Agregar a favoritas')<0,'sin permiso, el menú no ofrece papelera ni favorita',itL);
  await l.keyboard.press('Escape');
  /* La página se abre solo para leer */
  await l.goto(base+'documento.html?id='+idInv);await listo(l,800);
  r.cumple(!(await l.$('.ProseMirror'))&&/Solo puedes ver esta página/.test(await l.textContent('.doc-permiso'))&&await l.isHidden('#docModo'),'la página se abre solo para leer, con un aviso');
  r.igual(await l.textContent('#docEstado'),'Solo lectura','y lo dice arriba');
  await l.waitForTimeout(300);
  r.igual(await l.evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){return d.acceso.personas.filter(function(x){return x.correo==='luis@ejemplo.com'})[0].estado})},idInv),'activo','al abrirla, Luis acepta su invitación');
  await l.click('#docPedirPermiso');await l.waitForSelector('dialog.perm-dlg[open] #permPedirRol');
  r.igual(await l.inputValue('#permPedirRol'),'editor','«Pedir permiso para editar» propone «Puede editar»');
  r.cumple(!(await l.$('#permInv'))&&!(await l.$('select[data-rol]')),'sin administrar, no puedes invitar ni cambiar permisos');
  await l.fill('#permPedir [name="mensaje"]','Necesito actualizar las existencias');await l.click('#permPedir [type="submit"]');await l.waitForTimeout(400);
  r.cumple(/Pediste «Puede editar»/.test(await l.textContent('dialog.perm-dlg')),'la solicitud queda pendiente');
  await revisar(l,r,'Pedir permiso');
  if(CAP)await l.locator('dialog.perm-dlg').screenshot({path:CAP+'/pedir.png'});
  await l.keyboard.press('Escape');await l.waitForTimeout(300);
  r.cumple(/Ya pediste «Puede editar»: está pendiente/.test(await l.textContent('.doc-permiso')),'el aviso de la página lo recuerda');
  const respaldoLuis=await l.evaluate(function(){return AT.datos.exportar()});

  /* ---------- Ana recibe la solicitud (por respaldo) y la aprueba ---------- */
  const a=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:NEG});
  await a.goto(base+'inicio.html');await listo(a,400);
  await a.evaluate(function(d){return AT.datos.importar(d)},respaldoAna);
  r.cumple(await a.evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){return AT.datos.acceso.rol(d)})},idInv)==='dueno','al restaurar tu respaldo en otro navegador, tus páginas siguen siendo tuyas');
  await a.evaluate(function(d){return AT.datos.importar(d)},respaldoLuis);
  await a.reload();await listo(a,700);await a.waitForSelector('[data-ubic="solicitudes"]');
  r.igual(await a.textContent('[data-ubic="solicitudes"] em'),'1','las solicitudes llegan a «Solicitudes», para quien administra');
  r.cumple(/1 solicitud/.test(await a.textContent('#xpLista [data-fila="'+idInv+'"] .xp-sol')),'y la página lo marca');
  await a.click('#xpLista [data-fila="'+idInv+'"] [data-k="perm"]');await a.waitForSelector('dialog.perm-dlg[open] [data-perm="aprobar"]');
  r.cumple(/Luis Gómez pide «Puede editar»/.test(await a.textContent('.perm-sol'))&&/Necesito actualizar las existencias/.test(await a.textContent('.perm-sol')),'la ventana muestra quién pide qué y su mensaje');
  r.cumple(!/Invitación pendiente/.test(await a.textContent('.perm-p:has-text("Luis Gómez")')),'y que Luis ya aceptó la invitación');
  await a.click('[data-perm="aprobar"]');await a.waitForTimeout(400);
  const rolLuis=await a.evaluate(function(id){return AT.datos.documentos.leer(id).then(function(d){return d.acceso.personas.filter(function(x){return x.correo==='luis@ejemplo.com'})[0].rol})},idInv);
  r.igual(rolLuis,'editor','«Aprobar» le da el permiso');
  await a.keyboard.press('Escape');await a.waitForTimeout(300);
  r.cumple(!(await a.$('[data-ubic="solicitudes"]')),'y ya no hay solicitudes');
  const respaldoAna2=await a.evaluate(function(){return AT.datos.exportar()});
  await cerrar(a);

  /* ---------- Luis recibe el permiso ---------- */
  await l.evaluate(function(d){return AT.datos.importar(d)},{app:'OneBook',formato:1,documentos:respaldoAna2.documentos.filter(function(d){return d.id===idInv})});
  await l.waitForFunction(function(){var b=document.getElementById('docModo');return b&&!b.hidden&&!document.querySelector('.doc-permiso')},null,{timeout:8000});
  r.cumple(/Ya puedes editar esta página/.test(await l.textContent('#avisoApp')),'con el permiso nuevo, la página abierta lo avisa al momento');
  await l.click('#avisoApp button:has-text("Editar")');await l.waitForTimeout(400);
  r.cumple(!!(await l.$('.ProseMirror')),'y «Editar» la abre para editar');
  r.cumple(l.errores.length===0,'sin errores',l.errores.slice(0,3));
  await cerrar(l);

  /* ---------- Celular oscuro ---------- */
  const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:NEG});
  await c.goto(base+'inicio.html');await listo(c,400);
  await sembrar(c,[['corte','Corte de caja'],['inventario','Inventario'],['notas','Ideas']]);
  await c.evaluate(function(){AT.ajustes.set('tema','dark')});
  await c.reload();await listo(c,700);await c.waitForSelector('#xpLista [data-fila]');
  r.cumple(await c.isHidden('.xp-t th.xp-c-mod')&&await c.isVisible('.xp-nom-m'),'en celular, la fecha va debajo del nombre');
  r.cumple(await c.isVisible('#xpLista [data-fila] [data-k="mas"]'),'y el menú de cada página sigue a la mano');
  await revisar(c,r,'Explorador en celular (oscuro)');
  if(CAP)await c.screenshot({path:CAP+'/explorador-celular.png',fullPage:true});
  await c.click('#xpLista [data-fila] [data-k="perm"]');await c.waitForSelector('dialog.perm-dlg[open]');
  await revisar(c,r,'Permisos en celular (oscuro)');
  await c.keyboard.press('Escape');await c.waitForTimeout(200);
  /* En la página, «⋯» también abre «Personas y permisos» */
  await Promise.all([c.waitForURL(/documento\.html/),c.click('#xpLista [data-fila] [data-k="abrir"]')]);await listo(c,700);
  await c.click('#docMas');await c.waitForTimeout(200);
  await c.click('.menu [role="menuitem"]:has-text("Personas y permisos")');
  await c.waitForSelector('dialog.perm-dlg[open]');
  r.cumple(/Propietario/.test(await c.textContent('dialog.perm-dlg')),'en la página, «⋯» → «Personas y permisos»');
  r.cumple(c.errores.length===0,'sin errores en celular',c.errores.slice(0,3));
  await cerrar(c);
});
