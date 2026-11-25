/* Etapa Empresas, E2: empresa, personas y departamentos (empresa.js, tuempresa.js, persona.js).
   - Un espacio de antes recibe su empresa sola, con quien lo usa como propietario.
   - «Tu empresa»: tu nombre, departamentos (sin repetir nombres), personas con rol, departamentos y PIN (sin repetir
     correos; los dos PIN deben coincidir), el foco al cerrar cada ventana.
   - «Cambiar de persona»: sin PIN entra directo; con PIN lo pide (uno equivocado no entra); la página se vuelve a
     cargar como la persona nueva, también en otra pestaña; si la computadora no sabe quién eres, el Inicio lo pide.
   - Lo que puede cada quien: un miembro ve todo y solo cambia sus datos; el responsable administra su departamento.
   - Una página: «Alguien de tu empresa» da acceso directo; quien no está en la lista la abre solo para leer.
   - Recursos humanos: la columna Departamento de Empleados ofrece los departamentos (con su color) y se renombra.
   - Respaldo: un navegador nuevo recibe la empresa; dos respaldos de la misma empresa se juntan; lo quitado no revive.
   - Contraste y desbordes en escritorio, celular, oscuro y alto contraste. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

const PF={perfil:'negocio',modulos:['negocio','rh'],nombre:'',negocio:{nombre:'Ferretería El Clavo',giro:'tienda',telefono:'55 1111 2222'},creado:'2026-01-01',migrado:true};
const DLG='dialog.emp-dlg[open]';
function id(p,nombre){return p.evaluate(function(n){var x=AT.empresa.personas().filter(function(p){return p.nombre===n})[0];return x?x.id:''},nombre)}
function depId(p,nombre){return p.evaluate(function(n){var x=AT.empresa.departamentos().filter(function(d){return d.nombre===n})[0];return x?x.id:''},nombre)}
function activa(p){return p.evaluate(function(){var a=AT.empresa.activa();return a?a.nombre:null})}
/* Entra como otra persona desde la barra lateral (con su PIN, si tiene) y espera la recarga */
async function entrarComo(p,pid,pin){
  await p.click('#sidePersona');await p.waitForSelector('dialog.pe-dlg[open]');
  if(pin){
    await p.click('.pe-p[data-id="'+pid+'"]');await p.waitForSelector('#pePin');
    await p.fill('#pePin',pin);
    await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.keyboard.press('Enter')]);
  }else await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.click('.pe-p[data-id="'+pid+'"]')]);
  await listo(p,300);
}

prueba('Tu empresa: personas, departamentos y cambiar de persona',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:PF});
  await p.goto(base+'inicio.html');await listo(p);
  const auto=await p.evaluate(function(){var e=AT.empresa.leer(),a=AT.empresa.activa();
    return {nombre:e.nombre,auto:!!e.auto,personas:e.personas.length,rol:a&&a.rol,yo:!!a&&a.id===AT.datos.yoId(),deps:e.departamentos.length}});
  r.cumple(auto.nombre==='Ferretería El Clavo'&&auto.auto&&auto.personas===1&&auto.rol==='propietario'&&auto.yo&&auto.deps===0,'un espacio de antes recibe su empresa, con quien lo usa como propietario',auto);
  r.cumple(await p.isVisible('#sideEmpresa')&&/Cambiar de persona/.test(await p.textContent('#sidePersona')),'la barra lateral tiene «Tu empresa» y quién entra');

  /* ---------- «Tu empresa»: tu nombre ---------- */
  await Promise.all([p.waitForURL(/empresa\.html$/),p.click('#sideEmpresa')]);await listo(p);
  r.cumple(await p.textContent('h1')==='Ferretería El Clavo'&&/Tienda o comercio · Tel\. 55 1111 2222/.test(await p.textContent('#empSub'))&&await p.getAttribute('#sideEmpresa','aria-current')==='page',
    'la página muestra la empresa y la barra la marca');
  r.cumple(/todavía sin nombre/.test(await p.textContent('#empTu')),'si todavía no tienes nombre, te lo pide');
  await p.click('#empTu [data-emp="editar"]');await p.waitForSelector(DLG);
  r.cumple(await p.textContent('#empDlgT')==='Tus datos'&&await p.evaluate(function(){return document.activeElement.name==='nombre'}),'«Ponte tu nombre» abre tus datos, con el foco en el nombre');
  await p.fill(DLG+' input[name="nombre"]','Lupita Hernández');
  await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(200);
  r.cumple(/Entras como Lupita Hernández \(propietario\)/.test(await p.textContent('#empTu'))&&/Lupita Hernández/.test(await p.textContent('#sidePersona')),'tu nombre se guarda y la barra lo muestra');
  r.cumple(await p.evaluate(function(){return AT.datos.yo().nombre==='Lupita Hernández'&&!AT.empresa.leer().auto}),'también para tus páginas (AT.datos.yo), y la empresa deja de ser la automática');

  /* ---------- Departamentos ---------- */
  async function agregarDepto(nombre,color){
    await p.click('#empAgregarD');await p.waitForSelector(DLG);
    await p.fill(DLG+' input[name="nombre"]',nombre);
    if(color)await p.check(DLG+' input[name="color"][value="'+color+'"]');
    await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(150);
  }
  await agregarDepto('Ventas');await agregarDepto('Almacén','ambar');
  await p.click('#empAgregarD');await p.waitForSelector(DLG);
  await p.fill(DLG+' input[name="nombre"]','ventas');await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(100);
  r.cumple(/Ya hay un departamento con ese nombre/.test(await p.textContent('#empDlgMsg')),'no se repite el nombre de un departamento (sin importar mayúsculas)');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  r.cumple(await p.evaluate(function(){return document.activeElement.id})==='empAgregarD','al cerrar una ventana, el foco vuelve a su botón');
  r.igual(await p.$$eval('.emp-d h3',function(e){return e.map(function(x){return x.textContent}).join(', ')}),'Almacén, Ventas','los departamentos, en orden');

  /* ---------- Personas ---------- */
  async function agregarPersona(d){
    await p.click('#empAgregarP');await p.waitForSelector(DLG);
    await p.fill(DLG+' input[name="nombre"]',d.nombre);
    if(d.correo)await p.fill(DLG+' input[name="correo"]',d.correo);
    if(d.rol)await p.selectOption(DLG+' select[name="rol"]',d.rol);
    for(const k of Object.keys(d.deps||{}))await p.selectOption(DLG+' select[aria-label="Rol en '+k+'"]',d.deps[k]);
    if(d.pin){await p.fill(DLG+' input[name="pin"]',d.pin);await p.fill(DLG+' input[name="pin2"]',d.pin2||d.pin)}
    await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(150);
  }
  await agregarPersona({nombre:'Carlos Ruiz',correo:'carlos@ejemplo.com',deps:{'Ventas':'miembro'}});
  await agregarPersona({nombre:'Ana Gómez',correo:'ana@ejemplo.com',rol:'admin',deps:{'Almacén':'responsable'},pin:'2468',pin2:'2469'});
  r.cumple(/no son iguales/.test(await p.textContent('#empDlgMsg')),'los dos PIN deben ser iguales');
  await revisar(p,r,'agregar persona (escritorio)');
  await p.fill(DLG+' input[name="pin2"]','2468');await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(150);
  await agregarPersona({nombre:'Otro Carlos',correo:'CARLOS@ejemplo.com'});
  r.cumple(/Ya hay alguien con ese correo/.test(await p.textContent('#empDlgMsg')),'no se repite un correo');
  await p.keyboard.press('Escape');await p.waitForTimeout(100);
  await agregarPersona({nombre:'Mario Díaz',deps:{'Almacén':'consulta'},pin:'1357'});
  const lista=await p.$$eval('.emp-p',function(e){return e.map(function(x){return x.querySelector('.emp-q b').textContent+' ['+x.querySelector('.emp-rol').textContent+'] '+x.querySelector('.emp-chips').textContent+(x.querySelector('.emp-pin')?' PIN':'')})});
  r.igual(lista.join(' | '),'Lupita Hernández (tú) [Propietario] Sin departamento | Ana Gómez [Administrador] Almacén · responsable PIN | Carlos Ruiz [Miembro] Ventas · miembro | Mario Díaz [Miembro] Almacén · consulta PIN',
    'cada persona con su rol, sus departamentos y si tiene PIN, en orden');
  r.igual(await p.$$eval('.emp-d',function(e){return e.map(function(x){return x.querySelector('h3').textContent+': '+x.querySelector('.emp-d-n').textContent}).join(' | ')}),'Almacén: 1 responsable · 1 de consulta | Ventas: 1 miembro',
    'cada departamento dice quién está');
  const guardado=await p.evaluate(function(){return JSON.stringify(JSON.parse(localStorage.getItem('aprende-tecnologia:empresa')).personas.map(function(x){return x.pin}))});
  r.cumple(!/2468|1357/.test(guardado),'el PIN no se guarda a la vista (solo su huella)');
  await revisar(p,r,'Tu empresa (escritorio)');
  const ids={lupita:await id(p,'Lupita Hernández'),ana:await id(p,'Ana Gómez'),carlos:await id(p,'Carlos Ruiz'),mario:await id(p,'Mario Díaz'),ventas:await depId(p,'Ventas'),almacen:await depId(p,'Almacén')};

  /* ---------- Una página y «Alguien de tu empresa» ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  /* Una página privada (salas: solo su lista la ve) */
  await p.evaluate(function(){return AT.datos.documentos.guardar({formato:1,tipo:'notas',id:'d-precios',titulo:'Precios de mayoreo',props:[],acceso:AT.datos.acceso.nueva('privado'),
    contenido:{type:'doc',content:[{type:'paragraph',attrs:{id:'b-pre001'},content:[{type:'text',text:'Clavos a $40 el kilo.'}]}]}})});
  await p.goto(base+'documento.html?id=d-precios');await listo(p,500);
  await p.click('#docMas');await p.click('.menu-i:has-text("Personas y permisos")');await p.waitForSelector('dialog.perm-dlg[open]');
  r.igual(await p.$$eval('#permEmpP option',function(e){return e.map(function(x){return x.textContent}).join(', ')}),'Ana Gómez, Carlos Ruiz, Mario Díaz','«Alguien de tu empresa» ofrece a tu gente');
  await p.selectOption('#permEmpP',ids.carlos);await p.selectOption('#permEmp select[name="rol"]','editor');
  await p.click('#permEmp [type="submit"]');await p.waitForTimeout(250);
  r.cumple(/Carlos Ruiz/.test(await p.textContent('.perm-l'))&&!(await p.$$eval('#permEmpP option',function(e){return e.map(function(x){return x.value})})).includes(ids.carlos),'le da acceso directo a Carlos (y ya no se ofrece)');
  await revisar(p,r,'personas y permisos con tu empresa');
  await p.keyboard.press('Escape');

  /* ---------- Cambiar de persona: sin PIN ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  await p.click('#sidePersona');await p.waitForSelector('dialog.pe-dlg[open]');
  r.igual(await p.$$eval('.pe-p b',function(e){return e.map(function(x){return x.textContent}).join(' | ')}),'Lupita Hernández (ahora) | Ana Gómez | Carlos Ruiz | Mario Díaz','«¿Quién usa OneBook?» lista a la gente de la empresa');
  r.cumple(await p.evaluate(function(){return document.activeElement.getAttribute('data-id')})===ids.ana&&await p.getAttribute('.pe-p[aria-current="true"]','aria-disabled')==='true',
    'el foco va a la primera persona que se puede elegir; tú (ahora) no se elige');
  await revisar(p,r,'¿Quién usa OneBook? (escritorio)');
  await p.keyboard.press('Escape');await p.waitForTimeout(100);
  r.igual(await p.evaluate(function(){return document.activeElement.id}),'sidePersona','al cerrarla, el foco vuelve a tu nombre');
  /* Otra pestaña del mismo navegador también cambia de persona */
  const p2=await p.context().newPage();p2.setDefaultTimeout(8000);
  await p2.goto(base+'ayuda.html');await listo(p2);
  const recarga=p2.waitForEvent('load');
  await entrarComo(p,ids.carlos);
  r.cumple(/Carlos Ruiz/.test(await p.textContent('#sidePersona'))&&/, Carlos · /.test(await p.textContent('#iniSub')),'sin PIN entra directo: la barra y el saludo son de Carlos');
  await recarga;await listo(p2,300);
  r.cumple(/Carlos Ruiz/.test(await p2.textContent('#sidePersona')),'la otra pestaña se vuelve a cargar como Carlos');
  await p2.close();

  /* ---------- Un miembro ---------- */
  await p.goto(base+'documento.html?id=d-precios');await listo(p,500);
  r.cumple(await p.evaluate(function(){return document.getElementById('docEstado').textContent!=='Solo lectura'&&!!AT.docCambio}),'Carlos puede editar la página que le compartieron');
  await p.goto(base+'empresa.html');await listo(p);
  r.cumple(await p.isHidden('#empAgregarP')&&await p.isHidden('#empAgregarD')&&await p.isHidden('#empDatos')&&(await p.$$('[data-emp="editar"]')).length===1&&(await p.$$('[data-emp="depto"]')).length===0,
    'un miembro ve a todos, pero solo edita sus datos');
  const prot=await p.evaluate(function(){try{AT.empresa.agregarDepto({nombre:'X'});return 'pasó'}catch(e){return e.message}});
  r.cumple(/Solo quien administra/.test(prot),'el modelo tampoco deja a un miembro agregar departamentos',prot);
  await p.click('.emp-p [data-emp="editar"]');await p.waitForSelector(DLG);
  r.cumple(!(await p.$(DLG+' select[name="rol"]'))&&!(await p.$(DLG+' select[aria-label^="Rol en"]'))&&!!(await p.$(DLG+' input[name="pin"]')),'en sus datos no cambia su rol ni sus departamentos, sí su PIN');
  await p.fill(DLG+' input[name="pin"]','4321');await p.fill(DLG+' input[name="pin2"]','4321');
  await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(150);
  r.cumple(await p.evaluate(function(){return AT.empresa.tienePin(AT.datos.yoId())}),'cada quien se pone su PIN');
  await revisar(p,r,'Tu empresa como miembro');

  /* ---------- Con PIN ---------- */
  await p.click('#sidePersona');await p.waitForSelector('dialog.pe-dlg[open]');
  await p.click('.pe-p[data-id="'+ids.ana+'"]');await p.waitForSelector('#pePin');
  r.cumple(await p.evaluate(function(){return document.activeElement.id==='pePin'}),'a quien tiene PIN se lo pide');
  await p.fill('#pePin','0000');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  r.cumple(/Ese PIN no es/.test(await p.textContent('#peMsg'))&&await activa(p)==='Carlos Ruiz','con un PIN equivocado no entra');
  await revisar(p,r,'pedir el PIN');
  await p.fill('#pePin','2468');
  await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.keyboard.press('Enter')]);await listo(p,300);
  r.igual(await activa(p),'Ana Gómez','con el PIN correcto entra Ana');
  /* Ana (administradora) hace a Carlos responsable de Ventas */
  await p.goto(base+'empresa.html');await listo(p);
  await p.click('[data-emp="depto"][data-id="'+ids.ventas+'"]');await p.waitForSelector(DLG);
  await p.selectOption(DLG+' select[name="p-'+ids.carlos+'"]','responsable');
  await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(150);
  r.igual(await p.evaluate(function(i){return AT.empresa.rolEnDepto(i.v,i.c)},{v:ids.ventas,c:ids.carlos}),'responsable','Ana hace a Carlos responsable de Ventas');

  /* ---------- Recursos humanos: la columna Departamento ---------- */
  await p.goto(base+'inicio.html');await listo(p);
  const emp=await p.evaluate(function(){
    return AT.inventario.asegurar('',['empleados']).then(function(ids){
      return AT.datos.filas.guardar({id:'f-emp001',base:ids.empleados,v:{'em-nombre':'Carlos Ruiz','em-depto':'Ventas'},orden:1}).then(function(){return AT.bases.cargar(ids.empleados)});
    }).then(function(b){var c=AT.bases.col(b,'em-depto');return {id:b.id,col:c&&c.nombre+'/'+c.origen,ops:AT.bases.opciones(c).join(',')}});
  });
  r.cumple(emp.col==='Departamento/departamentos'&&emp.ops==='Almacén,Ventas','Empleados tiene la columna Departamento, con los departamentos de la empresa',emp);

  /* ---------- Responsable ---------- */
  await entrarComo(p,ids.carlos,'4321');
  await p.goto(base+'empresa.html');await listo(p);
  r.cumple((await p.$$('[data-emp="depto"][data-id="'+ids.ventas+'"]')).length===1&&(await p.$$('[data-emp="depto"][data-id="'+ids.almacen+'"]')).length===0&&await p.isHidden('#empAgregarD'),
    'el responsable administra su departamento y no los demás');
  await p.click('[data-emp="depto"][data-id="'+ids.ventas+'"]');await p.waitForSelector(DLG);
  r.cumple(!(await p.$(DLG+' [data-acc="quitar"]')),'pero no lo quita (eso es de quien administra la empresa)');
  await p.fill(DLG+' input[name="nombre"]','Ventas y mostrador');await p.check(DLG+' input[name="color"][value="verde"]');
  await revisar(p,r,'administrar un departamento');
  await p.click(DLG+' button[type="submit"]');await p.waitForTimeout(200);
  await p.evaluate(function(){return AT.empresa.esperar()});
  const ren=await p.evaluate(function(b){return AT.datos.filas.deBase(b).then(function(l){return l.filter(function(f){return f.id==='f-emp001'})[0].v['em-depto']})},emp.id);
  r.igual(ren,'Ventas y mostrador','renombrar el departamento cambia también a los empleados que lo tienen');
  /* La etiqueta del departamento, con su color, en la base de empleados */
  await p.goto(base+'inicio.html');await listo(p);
  await Promise.all([p.waitForURL(/documento\.html/),p.evaluate(function(){AT.crear.nuevo('equipo');return 1})]);await listo(p,900);
  await p.waitForSelector('select.bd-sel[data-c="em-depto"]',{state:'attached'});
  r.cumple(await p.evaluate(function(){var s=document.querySelector('select.bd-sel[data-c="em-depto"]');
    return s.value==='Ventas y mostrador'&&s.getAttribute('data-tono')==='bien'&&[].map.call(s.options,function(o){return o.value}).join()===',Almacén,Ventas y mostrador'}),
    'en «Mi equipo», el departamento sale como etiqueta con su color y sus opciones');
  await p.click('[data-equipo] [data-acc="persona"]');await p.waitForSelector('dialog[open] select[name="depto"]');
  r.igual(await p.$$eval('dialog[open] select[name="depto"] option',function(e){return e.map(function(x){return x.textContent}).join(', ')}),'Sin departamento, Almacén, Ventas y mostrador',
    '«Agregar persona» de Recursos humanos pregunta su departamento');
  await p.fill('dialog[open] [name="nombre"]','Rosa Pérez');await p.selectOption('dialog[open] select[name="depto"]','Almacén');
  await p.click('dialog[open] button[type="submit"]');await p.waitForFunction(function(){return !document.querySelector('dialog[open]')});
  r.igual(await p.evaluate(function(b){return AT.datos.filas.deBase(b).then(function(l){var f=l.filter(function(x){return x.v['em-nombre']==='Rosa Pérez'})[0];return f&&f.v['em-depto']})},emp.id),'Almacén','y lo guarda en su ficha');

  /* ---------- Quien no tiene acceso a una página ---------- */
  await entrarComo(p,ids.mario,'1357');
  await p.goto(base+'documento.html?id=d-precios');await listo(p,500);
  r.cumple(/No tienes acceso/.test(await p.textContent('#docPage'))&&!(await p.$('.ProseMirror'))&&/Clavos/.test(await p.textContent('#docPage'))===false,'Mario, que no está en la lista de esa página privada, no la ve: solo puede pedir acceso');

  /* ---------- La computadora no sabe quién eres ---------- */
  await p.evaluate(function(){localStorage.setItem('aprende-tecnologia:yo',JSON.stringify({id:'u-fantasma1',nombre:'',correo:'',creado:'2026-01-01T00:00:00.000Z'}))});
  await p.goto(base+'inicio.html');await listo(p);
  r.cumple(await p.isVisible('#iniQuien')&&/¿Quién eres\?/.test(await p.textContent('#sidePersona')),'si la computadora no sabe quién eres, el Inicio lo pregunta');
  await revisar(p,r,'Inicio: ¿quién eres?');
  await p.click('#iniQuienB');await p.waitForSelector('dialog.pe-dlg[open]');
  r.cumple(/no sabe quién eres/.test(await p.textContent('dialog.pe-dlg')),'y la ventana lo explica');
  await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.click('.pe-p[data-id="'+ids.lupita+'"]')]);await listo(p,300);
  r.cumple(await p.isHidden('#iniQuien')&&await activa(p)==='Lupita Hernández','al elegir tu nombre, se va el aviso');

  /* ---------- Respaldo ---------- */
  const resp=await p.evaluate(function(){return AT.datos.exportar()});
  r.cumple(resp.empresa&&resp.empresa.personas.length===4&&resp.empresa.departamentos.length===2,'el respaldo lleva la empresa');
  const q=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
  await q.goto(base+'entrar.html');await listo(q);
  await Promise.all([q.waitForURL(/inicio\.html$/),q.setInputFiles('#enArchivo',{name:'respaldo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(resp))})]);await listo(q,400);
  const nq=await q.evaluate(function(){var e=AT.empresa.leer();return {id:e.id,p:e.personas.length,d:e.departamentos.length,yo:AT.empresa.activa()&&AT.empresa.activa().nombre}});
  r.cumple(nq.id===resp.empresa.id&&nq.p===4&&nq.d===2&&nq.yo==='Lupita Hernández','un navegador nuevo recibe la empresa del respaldo, y entra quien lo hizo',nq);
  /* En el otro navegador se agrega a alguien; aquí se quita a Mario */
  await q.evaluate(function(){AT.empresa.agregarPersona({nombre:'Rosa Lima',rol:'miembro'})});
  const respQ=await q.evaluate(function(){return AT.datos.exportar()});
  await p.evaluate(function(m){AT.empresa.quitarPersona(m)},ids.mario);
  const junta=await p.evaluate(function(d){return AT.datos.importar(d).then(function(res){return {res:res.empresa,nombres:AT.empresa.personas().map(function(x){return x.nombre}).join(', ')}})},respQ);
  r.cumple(junta.res==='combinada'&&junta.nombres==='Lupita Hernández, Ana Gómez, Carlos Ruiz, Rosa Lima','dos respaldos de la misma empresa se juntan, y lo quitado no revive',junta);
  const viejo=await p.evaluate(function(d){return AT.datos.importar(d).then(function(){return AT.empresa.personas().length})},resp);
  r.igual(viejo,4,'un respaldo viejo tampoco revive a quien se quitó');
  /* Otra empresa no se junta */
  const otra=await p.evaluate(function(d){d=JSON.parse(JSON.stringify(d));d.empresa.id='e-otraempr';d.empresa.personas[0].nombre='Alguien más';return AT.datos.importar(d).then(function(res){return res.empresa+'|'+AT.empresa.leer().id})},resp);
  r.cumple(/^otra\|/.test(otra)&&otra.split('|')[1]===resp.empresa.id,'la empresa de otro respaldo no se junta con la tuya',otra);
  r.cumple(p.errores.length===0,'sin errores',p.errores);

  /* ---------- Celular y variantes ---------- */
  await q.goto(base+'empresa.html');await listo(q);
  await revisar(q,r,'Tu empresa (celular)');
  await q.click('.emp-p [data-emp="editar"] >> nth=1');await q.waitForSelector(DLG);
  await revisar(q,r,'editar persona (celular)');
  await q.keyboard.press('Escape');
  await q.evaluate(function(){AT.persona.abrir()});await q.waitForSelector('dialog.pe-dlg[open]');
  await revisar(q,r,'¿Quién usa OneBook? (celular)');
  r.cumple(q.errores.length===0,'sin errores en celular',q.errores);
  await cerrar(q);
  for(const [nombre,aj,ancho] of [['oscuro',{tema:'dark'},1280],['alto contraste',{contraste:'high'},900],['oscuro y alto contraste ×1.5',{tema:'dark',contraste:'high',escala:1.5},390]]){
    const x=await pagina(browser,{ancho:ancho,alto:900,ajustes:aj,reducir:true,perfil:PF});
    await x.goto(base+'inicio.html');await listo(x);
    await x.evaluate(function(d){return AT.datos.importar(d).then(function(){return 1})},resp);
    await x.goto(base+'empresa.html');await listo(x);
    await revisar(x,r,'Tu empresa, '+nombre);
    await x.click('[data-emp="depto"] >> nth=0');await x.waitForSelector(DLG);
    await revisar(x,r,'departamento, '+nombre);
    await cerrar(x);
  }
  await cerrar(p);
});
