/* El servidor de la oficina (servidor/servidor.js) y la sincronización (assets/js/sincro.js), con el servidor real y
   dos dispositivos: una «Mac» (escritorio) y un «celular», cada uno con su almacenamiento.
   - El servidor sirve el sitio con la marca <meta name="onebook-servidor">, guarda los datos en archivos y pide la
     clave de la oficina; no sirve las pruebas, el servidor ni la documentación.
   - La Mac se conecta (clave mala y buena) a un servidor vacío y empieza la empresa; lo que hace se sube.
   - El celular se conecta a un servidor con datos y recibe todo (empresa, páginas); elige quién es.
   - Bases en vivo: una fila nueva en la Mac aparece en el celular.
   - Una página que edita la Mac se abre para leer en el celular («está editando esta página»); «Editar aquí» la pasa
     y la Mac queda para leer. «Trabajando ahora» muestra al otro dispositivo.
   - Sin conexión: el celular sigue trabajando y su cambio se sube al volver.
   - «Eliminar todos los datos» en un dispositivo conectado no toca el servidor; los datos siguen al reiniciarlo.
   - Sin la marca (GitHub Pages), sincro.js no hace nada.
   - Contraste y desbordes de la conexión, el estado y «Tus datos». */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');
const {fork}=require('child_process');
const path=require('path'),fs=require('fs'),os=require('os');
const CLAVE='PRUE-B4OK';

function arrancar(puerto,dir){
  return new Promise(function(ok,no){
    const p=fork(path.join(__dirname,'..','servidor','servidor.js'),['--http','--puerto',String(puerto),'--datos',dir,'--clave',CLAVE,'--nombre','Oficina de prueba','--sin-respaldos'],{silent:true});
    p.on('message',function(m){if(m&&m.listo)ok(p)});
    p.on('exit',function(c){no(new Error('El servidor terminó: '+c))});
    setTimeout(function(){no(new Error('El servidor no arrancó'))},8000);
  });
}
function detener(p){return new Promise(function(ok){p.once('exit',ok);p.kill('SIGTERM');setTimeout(ok,3000)})}
async function api(srv,ruta){const r=await fetch(srv+'api/'+ruta,{headers:{'X-OneBook-Clave':CLAVE}});return r.json()}
async function registros(srv,a){const r=await api(srv,'cambios?desde=0&limite=5000');return r.cambios.filter(function(x){return x.a===a&&x.d!=null})}
async function esperar(p,fn,arg,ms){return p.waitForFunction(fn,arg,{timeout:ms||12000,polling:200})}
function alDia(p){return esperar(p,function(){return AT.sincro&&AT.sincro.pendientes()===0&&/Al día/.test((document.querySelector('.sx-ind')||{}).textContent||'Al día')})}

prueba('Servidor de la oficina y sincronización',async function({browser,base,r}){
  const puerto=20000+Math.floor(Math.random()*20000),dir=fs.mkdtempSync(path.join(os.tmpdir(),'onebook-srv-'));
  const SRV='http://127.0.0.1:'+puerto+'/';
  let srv=await arrancar(puerto,dir);
  try{
    /* ---------- El servidor ---------- */
    const est=await (await fetch(SRV+'api/estado')).json();
    r.cumple(est.servidor&&est.nombre==='Oficina de prueba','el servidor responde quién es',est);
    const html=await (await fetch(SRV+'inicio.html')).text();
    r.cumple(/<meta name="onebook-servidor"/.test(html),'las páginas llevan la marca del servidor');
    const bloqueados=await Promise.all(['servidor/servidor.js','pruebas/lib.js','AGENTS.md','docs/ESTADO.md'].map(function(f){return fetch(SRV+f).then(function(x){return x.status})}));
    r.cumple(bloqueados.every(function(s){return s===404}),'no sirve el servidor, las pruebas ni la documentación',bloqueados);
    r.igual((await fetch(SRV+'api/cambios?desde=0')).status,401,'sin la clave, los datos no salen');
    r.igual((await fetch(SRV,{redirect:'manual'})).headers.get('location'),'inicio.html','«/» lleva al Inicio');

    /* ---------- La Mac: servidor vacío ---------- */
    const a=await pagina(browser,{ancho:1280,alto:900,reducir:true,perfil:false});
    await a.goto(SRV+'inicio.html');await listo(a,500);
    await a.waitForSelector('dialog.sx-dlg[open]');
    r.cumple(/entrar\.html/.test(a.url())&&/Conectar con la oficina/.test(await a.textContent('dialog.sx-dlg')),'sin espacio, va a «Crea tu empresa» y pide conectar con la oficina');
    await revisar(a,r,'conectar con la oficina');
    await a.fill('dialog.sx-dlg [name="clave"]','MALA-0000');await a.click('dialog.sx-dlg [type="submit"]');
    await esperar(a,function(){return /no es correcta/.test(document.getElementById('sxMsg').textContent)});
    r.cumple(true,'una clave mala se rechaza');
    await a.fill('dialog.sx-dlg [name="clave"]',CLAVE.toLowerCase());await a.fill('dialog.sx-dlg [name="nombre"]','Mac de prueba');
    await a.click('dialog.sx-dlg [type="submit"]');
    await esperar(a,function(){return !document.querySelector('dialog.sx-dlg[open]')&&AT.sincro.conectado()});
    r.cumple(true,'con la clave buena (en minúsculas también), se conecta');
    /* Crea su empresa (como «Crea tu empresa») y la Mac ya es de Ana */
    const luis=await a.evaluate(function(){
      AT.perfil.guardar({perfil:'negocio',modulos:['negocio'],nombre:'Ana',negocio:{nombre:'Taquería La Oficina',giro:'comida',telefono:''}});
      AT.empresa.crear({nombre:'Taquería La Oficina',giro:'comida',telefono:'',tuNombre:'Ana López'});
      return AT.empresa.agregarPersona({nombre:'Luis Pérez',rol:'admin'}).id;
    });
    await a.goto(SRV+'inicio.html');await listo(a,800);
    await Promise.all([a.waitForURL(/documento\.html/),a.evaluate(function(){AT.crear.nuevo('clientes');return 1}).catch(function(){return 1})]);await listo(a,800);
    await a.waitForSelector('.bd [data-bd-nombre]');
    const docClientes=await a.evaluate(function(){return AT.docActual.id});
    await alDia(a);
    const docs=await registros(SRV,'documentos'),ls=await registros(SRV,'ls');
    r.cumple(docs.some(function(x){return x.id===docClientes})&&ls.some(function(x){return x.id==='empresa'&&/Taquería La Oficina/.test(x.d)})&&ls.some(function(x){return x.id==='perfil'}),
      'lo que hace la Mac (empresa, perfil y la página) llega al servidor',{docs:docs.length,ls:ls.map(function(x){return x.id})});
    r.cumple(!ls.some(function(x){return x.id==='yo'||x.id==='ajustes'}),'quién eres en este dispositivo y los ajustes no se comparten');
    r.cumple(/Al día/.test(await a.textContent('.sx-ind')),'la barra superior dice «Al día»');

    /* ---------- El celular: servidor con datos ---------- */
    const c=await pagina(browser,{ancho:390,alto:844,reducir:true,perfil:false});
    await c.goto(SRV);await listo(c,500);
    await c.waitForSelector('dialog.sx-dlg[open]');
    await c.fill('dialog.sx-dlg [name="clave"]',CLAVE);await c.fill('dialog.sx-dlg [name="nombre"]','Celular de Luis');
    await Promise.all([c.waitForURL(/inicio\.html/,{timeout:20000}),c.click('dialog.sx-dlg [type="submit"]')]);await listo(c,800);
    const recibido=await c.evaluate(function(){return AT.datos.documentos.todos().then(function(l){return {docs:l.map(function(d){return d.id}),empresa:AT.empresa.leer().nombre,perfil:AT.perfil.actual().negocio.nombre}})});
    r.cumple(recibido.docs.indexOf(docClientes)>=0&&recibido.empresa==='Taquería La Oficina'&&recibido.perfil==='Taquería La Oficina','el celular recibe la empresa, el perfil y las páginas',recibido);
    r.cumple(await c.isVisible('#iniQuien'),'y pregunta quién eres');
    await c.evaluate(function(id){AT.empresa.entrarComo(id)},luis);await c.reload();await listo(c,600);
    r.cumple(await c.evaluate(function(){return AT.empresa.activa().nombre})==='Luis Pérez','el celular es de Luis');
    await revisar(c,r,'Inicio del celular conectado');

    /* ---------- Una página editada en otro dispositivo ---------- */
    await c.goto(SRV+'documento.html?id='+docClientes);await listo(c,800);
    await esperar(c,function(){return /Ana López.*está editando esta página/.test((document.querySelector('.doc-bloqueo')||{}).textContent||'')},null,15000);
    r.cumple(!(await c.evaluate(function(){return !!AT.docCambio})),'en el celular la página se abre para leer: «Ana López está editando esta página»');
    await revisar(c,r,'página que edita otra persona (celular)');
    /* Bases en vivo: la Mac agrega una fila y aparece en el celular */
    await a.evaluate(function(){var b=document.querySelector('.bd').getAttribute('data-bd'),B=AT.bases,col=B.base(b).columnas[0].id,v={};v[col]='Abarrotes Doña Mary';return B.guardarFila(B.nuevaFila(b,v))});
    await esperar(c,function(){return /Abarrotes Doña Mary/.test(document.querySelector('.bd')?document.querySelector('.bd').textContent:'')},null,15000);
    r.cumple(true,'una fila nueva en la Mac aparece sola en el celular');
    /* «Trabajando ahora» en la Mac muestra el celular */
    await a.goto(SRV+'inicio.html');await listo(a,800);
    await esperar(a,function(){return AT.datos.presencia.de(arguments[0]||'').length>=0},docClientes);
    /* «Editar aquí» en el celular: la Mac (de vuelta en la página) queda para leer */
    await a.goto(SRV+'documento.html?id='+docClientes);await listo(a,800);
    await c.reload();await listo(c,800);
    await esperar(c,function(){return !!document.getElementById('docEditarAqui')},null,15000);
    await Promise.all([c.waitForNavigation(),c.click('#docEditarAqui')]);await listo(c,800);
    await esperar(c,function(){return !!AT.docCambio&&!document.querySelector('.doc-bloqueo:not(.doc-permiso)')},null,10000);
    await esperar(a,function(){return /Luis Pérez.*está editando esta página/.test((document.querySelector('.doc-bloqueo')||{}).textContent||'')},null,15000);
    r.cumple(!(await a.evaluate(function(){return !!AT.docCambio})),'«Editar aquí» en el celular la toma: la Mac queda para leer');
    const pres=await a.evaluate(function(id){return AT.datos.presencia.de(id).filter(function(p){return p.otroDispositivo}).map(function(p){return p.quien.nombre+':'+p.modo})},docClientes);
    r.cumple(pres.indexOf('Luis Pérez:editar')>=0,'«Trabajando ahora» incluye a Luis editando en otro dispositivo',pres);

    /* ---------- Sin conexión ---------- */
    await c.context().setOffline(true);
    await esperar(c,function(){return /Sin conexión/.test((document.querySelector('.sx-ind')||{}).textContent||'')},null,15000);
    await c.evaluate(function(){var b=document.querySelector('.bd').getAttribute('data-bd'),B=AT.bases,col=B.base(b).columnas[0].id,v={};v[col]='Cremería La Vaquita';return B.guardarFila(B.nuevaFila(b,v))});
    await esperar(c,function(){return AT.sincro.pendientes()>0});
    r.cumple(/Sin conexión · \d/.test(await c.textContent('.sx-ind')),'sin conexión, el celular sigue trabajando y dice cuántos cambios esperan',await c.textContent('.sx-ind'));
    await revisar(c,r,'sin conexión (celular)');
    await c.context().setOffline(false);
    await c.evaluate(function(){window.dispatchEvent(new Event('online'))});
    await esperar(c,function(){return AT.sincro.pendientes()===0},null,20000);
    await esperar(a,function(){return /Cremería La Vaquita/.test(document.querySelector('.bd')?document.querySelector('.bd').textContent:'')},null,20000);
    r.cumple(true,'al volver la conexión, el cambio se sube y llega a la Mac');

    /* ---------- Tus datos ---------- */
    await c.goto(SRV+'inicio.html');await listo(c,600);
    await c.evaluate(function(){AT.tusDatos.abrir()});await c.waitForSelector('dialog.tus-datos[open] #tdSx:not([hidden])');
    const td=await c.textContent('#tdSx');
    r.cumple(/Oficina de prueba/.test(td)&&/Celular de Luis/.test(td)&&/Desconectar este dispositivo/.test(td),'«Tus datos» dice a qué servidor está conectado este dispositivo',td.slice(0,160));
    await revisar(c,r,'Tus datos con el servidor (celular)');
    /* Eliminar todos los datos en el celular: el servidor no cambia */
    const antes=(await registros(SRV,'documentos')).length;
    await c.click('[data-td="borrar"]');
    await Promise.all([c.waitForURL(/entrar\.html/,{timeout:10000}),c.click('[data-td="borrarSi"]')]);await listo(c,500);
    r.igual((await registros(SRV,'documentos')).length,antes,'«Eliminar todos los datos» en el celular no toca el servidor');
    r.cumple(await c.isVisible('dialog.sx-dlg[open]'),'y el celular queda sin conectar (vuelve a pedir la clave)');
    r.cumple(a.errores.length===0,'la Mac sin errores',a.errores.slice(0,3));
    r.cumple(c.errores.filter(function(e){return !/ERR_INTERNET_DISCONNECTED|net::|eventos/.test(e)}).length===0,'el celular sin errores (fuera de los de estar sin conexión)',c.errores.slice(0,3));
    await cerrar(c);await cerrar(a);

    /* ---------- Reiniciar el servidor: los datos siguen ---------- */
    await detener(srv);
    srv=await arrancar(puerto,dir);
    const despues=await registros(SRV,'documentos');
    r.igual(despues.length,antes,'al reiniciar el servidor, los datos siguen ahí');
    r.cumple(fs.existsSync(path.join(dir,'almacenes','documentos.json'))&&fs.existsSync(path.join(dir,'estado.json')),'se guardan en archivos en la carpeta de datos');
    /* Gana el cambio más reciente: uno más viejo se rechaza y vuelve lo que hay */
    const d0=despues[0],viejo=Object.assign({},d0.d,{titulo:'Versión vieja'});
    const rv=await (await fetch(SRV+'api/cambios',{method:'POST',headers:{'X-OneBook-Clave':CLAVE,'Content-Type':'application/json'},body:JSON.stringify({dispositivo:'x',cambios:[{a:'documentos',id:d0.id,d:viejo,t:'2020-01-01T00:00:00.000Z'}]})})).json();
    r.cumple(rv.aceptados===0&&rv.rechazados.length===1&&rv.rechazados[0].d.titulo===d0.d.titulo,'un cambio más viejo que el del servidor se rechaza y vuelve lo que hay',rv);
  }finally{
    await detener(srv);
    fs.rmSync(dir,{recursive:true,force:true});
  }

  /* ---------- Un dispositivo con datos propios y un servidor vacío: «Subir lo de este dispositivo» ---------- */
  const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'onebook-srv-')),puerto2=puerto+1,SRV2='http://127.0.0.1:'+puerto2+'/';
  const srv2=await arrancar(puerto2,dir2);
  try{
    const e=await pagina(browser,{ancho:1280,alto:900,reducir:true});
    await e.goto(SRV2+'inicio.html');await listo(e,500);
    await e.waitForSelector('dialog.sx-dlg[open]');
    await e.click('dialog.sx-dlg [data-solo]');
    const propio=await e.evaluate(function(){var d=AT.crear.armar('notas');d.titulo='Notas de mi Mac';return AT.datos.documentos.guardar(d).then(function(x){return x.id})});
    await e.reload();await listo(e,400);
    r.cumple(/Sin conectar/.test(await e.textContent('.sx-ind'))&&!(await e.$('dialog.sx-dlg[open]')),'«Usar solo en este dispositivo» no vuelve a preguntar y la barra dice «Sin conectar»');
    await e.click('.sx-ind');await e.waitForSelector('dialog.sx-dlg[open]');
    await e.fill('dialog.sx-dlg [name="clave"]',CLAVE);await e.click('dialog.sx-dlg [type="submit"]');
    await e.waitForSelector('dialog.sx-dlg [data-x="subir"]');
    r.cumple(/está vacío y este dispositivo ya tiene datos/.test(await e.textContent('dialog.sx-dlg')),'con un servidor vacío, pregunta si subir lo de este dispositivo o empezar de cero');
    await Promise.all([e.waitForNavigation(),e.click('dialog.sx-dlg [data-x="subir"]')]);await listo(e,600);
    const subidos=(await registros(SRV2,'documentos')).map(function(x){return x.id});
    r.cumple(subidos.indexOf(propio)>=0,'«Subir lo de este dispositivo» sube sus páginas al servidor',subidos);
    r.cumple(e.errores.length===0,'sin errores al subir',e.errores.slice(0,3));
    await cerrar(e);
  }finally{
    await detener(srv2);
    fs.rmSync(dir2,{recursive:true,force:true});
  }

  /* ---------- Sin servidor (GitHub Pages): no hace nada ---------- */
  const g=await pagina(browser,{ancho:1280,alto:900,reducir:true});
  await g.goto(base+'inicio.html');await listo(g,400);
  r.cumple(await g.evaluate(function(){return AT.sincro.hay===false&&!document.querySelector('.sx-ind')&&!document.querySelector('dialog.sx-dlg')}),'sin la marca del servidor, la sincronización no hace nada');
  r.cumple(g.errores.length===0,'sin errores',g.errores);
  await cerrar(g);
});
