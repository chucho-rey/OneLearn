/* Terminal simulada (assets/js/terminal.js), probada dentro de la lección «La terminal»: teclado (Tab, flechas,
   Ctrl+C, Escape), contraseñas que no se ven, nano, permisos y redirecciones, ejercicios que se guardan y entran
   en el respaldo, teclas en pantalla para celular, contraste de los colores de la salida y foco. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

async function esperar(d){await d.locator('.term-ps-v').evaluate(function(e){return new Promise(function(res){(function f(){if(e.textContent)res();else setTimeout(f,25)})()})})}
async function teclear(d,linea,resp){
  const inp=d.locator('.term-cmd');
  await inp.fill(linea);await inp.press('Enter');await esperar(d);
  for(const v of resp||[]){await inp.fill(v);await inp.press('Enter');await esperar(d)}
}
function salida(d){return d.locator('.term-log').textContent()}

prueba('Terminal simulada',async function({browser,base,r}){
  const p=await pagina(browser,{ancho:1280,reducir:true});
  await p.goto(base+'lecciones/terminal.html');await listo(p);
  const d=p.locator('.demo').nth(1),inp=d.locator('.term-cmd');
  r.cumple(await d.locator('.term-log[role="log"]').count()===1&&await inp.evaluate(function(e){return !!(e.labels&&e.labels[0]&&/Comando/.test(e.labels[0].textContent))}),
    'la salida es un registro (role=log) y el campo tiene etiqueta');
  r.igual(await d.locator('.term-ps-v').textContent(),'ana@ubuntu:~$ ','el prompt muestra usuario, equipo y carpeta');

  /* Tab completa */
  await inp.fill('cd Doc');await inp.press('Tab');
  r.igual(await inp.inputValue(),'cd Documentos/','Tab completa el nombre de la carpeta');
  await inp.press('Enter');await esperar(d);
  r.igual(await d.locator('.term-ps-v').textContent(),'ana@ubuntu:~/Documentos$ ','el prompt cambia de carpeta');
  await inp.fill('ca');await inp.press('Tab');
  r.igual(await inp.inputValue(),'cat ','Tab completa comandos');
  await inp.fill('c');await inp.press('Tab');
  r.cumple(/cat {2}cd {2}chgrp/.test(await salida(d)),'con varias opciones, Tab las muestra');
  await inp.fill('');await inp.press('Tab');
  r.cumple(await p.evaluate(function(){return !document.activeElement.classList.contains('term-cmd')}),'con la línea vacía, Tab sale de la terminal (no atrapa el foco)');

  /* Historial y Escape */
  await teclear(d,'pwd');await teclear(d,'whoami');
  await inp.focus();await inp.press('ArrowUp');
  r.igual(await inp.inputValue(),'whoami','↑ trae el último comando');
  await inp.press('ArrowUp');
  r.igual(await inp.inputValue(),'pwd','↑ otra vez trae el anterior');
  await inp.press('ArrowDown');
  r.igual(await inp.inputValue(),'whoami','↓ regresa');
  await inp.press('Escape');
  r.igual(await inp.inputValue(),'','Escape borra la línea');

  /* Ctrl+C interrumpe */
  await inp.fill('sleep 20');await inp.press('Enter');await p.waitForTimeout(200);
  r.cumple(await d.locator('.term').getAttribute('data-ocupada')==='1','sleep deja la terminal ocupada');
  const t0=Date.now();
  await inp.press('Control+c');await esperar(d);
  r.cumple(Date.now()-t0<2000&&/\^C\n/.test(await salida(d))&&!await d.locator('.term[data-ocupada]').count(),'Ctrl+C lo interrumpe al momento');
  await teclear(d,'echo $?');
  r.cumple(/\n130\n$/.test(await salida(d)),'y el código de salida es 130');

  /* Errores, tuberías y redirecciones */
  await teclear(d,'cat noexiste.txt');
  r.cumple(/cat: noexiste\.txt: No existe el archivo o el directorio/.test(await d.locator('.term-log .tc-e').last().textContent()),'los errores salen en su color');
  await teclear(d,'echo uno > a.txt; echo dos >> a.txt; cat a.txt | wc -l');
  r.cumple(/\n2\n$/.test(await salida(d)),'> crea, >> agrega y | pasa la salida: 2 líneas');
  await teclear(d,'echo hola > /etc/prueba');
  r.cumple(/bash: \/etc\/prueba: Permiso denegado/.test(await salida(d)),'la redirección a /etc la hace tu usuario: permiso denegado');

  /* sudo: la contraseña no se ve */
  await inp.fill('echo hola | sudo tee /etc/prueba');await inp.press('Enter');await esperar(d);
  r.cumple(await inp.getAttribute('type')==='password'&&await d.locator('.term.term-oculto').count()===1&&/\[sudo\] contraseña para ana/.test(await d.locator('.term-ps-v').textContent()),
    'sudo pide la contraseña en un campo oculto');
  await inp.fill('secretísima');await inp.press('Enter');await esperar(d);
  const s1=await salida(d);
  r.cumple(!/secretísima/.test(s1)&&/\[sudo\] contraseña para ana: \nhola\n/.test(s1),'la contraseña no aparece en la salida y tee escribe como root');
  r.igual(await inp.getAttribute('type'),'text','el campo vuelve a ser de texto');
  await teclear(d,'sudo cd /root');
  r.cumple(/sudo: cd: comando no encontrado/.test(await salida(d)),'sudo no puede correr cd (es parte del shell) y no vuelve a pedir contraseña');
  await teclear(d,'apt install tree');
  r.cumple(/¿Es usted superusuario\?/.test(await salida(d)),'apt sin sudo explica que hace falta ser administrador');
  await teclear(d,'sudo !!');
  r.cumple(/sudo apt install tree\n/.test(await salida(d))&&/Configurando tree/.test(await salida(d)),'sudo !! repite el último comando con sudo');
  await teclear(d,'tree -L 1 ~');
  r.cumple(/3 directories, 1 file\n/.test(await salida(d)),'tree ya funciona (y cuenta en singular: 1 file)',(await salida(d)).slice(-300));

  /* nano */
  await teclear(d,'cd');
  await inp.fill('nano nota.txt');await inp.press('Enter');
  await d.locator('.term-nano:not([hidden])').waitFor();
  r.cumple(await p.evaluate(function(){return document.activeElement.classList.contains('nano-t')}),'nano abre el editor con el foco en el texto');
  await p.keyboard.type('hola desde nano');
  await p.keyboard.press('Control+o');
  r.cumple(/1 líneas escritas/.test(await d.locator('.nano-s').textContent()),'Ctrl+O guarda');
  await p.keyboard.type('!');await p.keyboard.press('Control+x');
  r.cumple(await d.locator('.nano-q').isVisible(),'Ctrl+X con cambios sin guardar pregunta');
  await p.keyboard.press('n');await esperar(d);
  r.cumple(await d.locator('.term-nano').isHidden()&&await p.evaluate(function(){return document.activeElement.classList.contains('term-cmd')}),'«N» sale sin guardar y el foco vuelve a la terminal');
  await teclear(d,'cat nota.txt');
  r.cumple(/\nhola desde nano$/.test((await salida(d)).replace(/\n?$/,'')),'el archivo tiene lo guardado (sin el cambio descartado)');
  await inp.fill('nano /etc/hosts');await inp.press('Enter');
  await d.locator('.term-nano:not([hidden])').waitFor();
  r.cumple(/No tienes permiso/.test(await d.locator('.nano-s').textContent()),'nano avisa si no puedes escribir el archivo');
  await p.keyboard.type('x');await p.keyboard.press('Control+o');
  r.cumple(/Permiso denegado/.test(await d.locator('.nano-s').textContent()),'y no lo deja guardar');
  await d.locator('[data-n="salir"]').click();await d.locator('[data-n="no"]').click();await esperar(d);

  /* Ejercicios: se marcan, se guardan y entran en el respaldo */
  r.cumple(await d.locator('.term-ej-l li.ok').count()>=2,'los ejercicios que ya cumpliste se marcan solos (pwd, ls…)');
  const n0=await d.locator('.term-ej-l li.ok').count();
  await p.reload();await listo(p);
  const d2=p.locator('.demo').nth(1);
  r.igual(await d2.locator('.term-ej-l li.ok').count(),n0,'al recargar, los ejercicios terminados siguen marcados');
  const resp=await p.evaluate(function(){return AT.datos.exportar().then(function(x){return x.terminal})});
  r.cumple(!!resp&&!!resp['tm-pasos']&&!!resp['tm-pasos'].pwd,'el respaldo incluye los ejercicios de la terminal',resp);
  await d2.locator('[data-t="pista"]').click();
  r.cumple(await d2.locator('.term-pista').isVisible()&&/Pista:/.test(await d2.locator('.term-pista').textContent()),'«Ver una pista» explica el ejercicio actual');
  await d2.locator('[data-t="reiniciar"]').click();
  r.cumple(await d2.locator('.term-ej-l li.ok').count()===0&&!/tm-pasos/.test(await p.evaluate(function(){return localStorage.getItem('aprende-tecnologia:terminal')||''})),
    '«Empezar de nuevo» reinicia la terminal y los ejercicios');
  /* Importar un respaldo con ejercicios los vuelve a marcar */
  await p.evaluate(function(r){return AT.datos.importar({app:'OneLearn',formato:1,terminal:r})},resp);
  await p.reload();await listo(p);
  r.igual(await p.locator('.demo').nth(1).locator('.term-ej-l li.ok').count(),n0,'importar un respaldo devuelve los ejercicios terminados');
  r.cumple(p.errores.length===0,'sin errores',p.errores);
  await cerrar(p);

  /* Celular con pantalla táctil: teclas en pantalla */
  const m=await pagina(browser,{ancho:390,alto:844,movil:true,reducir:true});
  await m.goto(base+'lecciones/terminal.html');await listo(m);
  const dm=m.locator('.demo').nth(1),im=dm.locator('.term-cmd');
  r.cumple(await dm.locator('.term-teclas').isVisible(),'en pantallas táctiles aparecen las teclas Tab, ↑, ↓ y Ctrl C');
  r.cumple(parseFloat(await im.evaluate(function(e){return getComputedStyle(e).fontSize}))>=16,'el campo usa letra de 16 px o más (el iPhone no acerca la página)');
  await teclear(dm,'whoami');
  await im.focus();await dm.locator('.term-k[data-k="ArrowUp"]').click();
  r.igual(await im.inputValue(),'whoami','la tecla ↑ en pantalla trae el comando anterior');
  await im.fill('cd Esc');await dm.locator('.term-k[data-k="Tab"]').click();
  r.igual(await im.inputValue(),'cd Escritorio/','la tecla Tab en pantalla completa');
  await im.fill('sleep 20');await im.press('Enter');await m.waitForTimeout(150);
  await dm.locator('.term-k[data-k="c"]').click();await esperar(dm);
  r.cumple(!await dm.locator('.term[data-ocupada]').count(),'la tecla Ctrl C en pantalla interrumpe');
  r.cumple(m.errores.length===0,'sin errores en celular',m.errores);
  await cerrar(m);

  /* Contraste de los colores de la salida (carpetas, ejecutables, errores, coincidencias, consejos) */
  for(const [ancho,tema,contraste,escala,fuente] of [[390,'dark','high',1.5,'opendyslexic'],[1280,'light','normal',1,'normal'],[1280,'dark','normal',1,'normal'],[390,'light','high',1,'normal']]){
    const c=await pagina(browser,{ancho:ancho,reducir:true,ajustes:{tema:tema,contraste:contraste,escala:escala,fuente:fuente}});
    await c.goto(base+'lecciones/terminal.html');await listo(c);
    const dc=c.locator('.demo').nth(3);
    for(const l of ['cd registros','ls -la ~','grep -n ERROR app.log','cat nada','ls /usr/bin | head -3','tail -f app.log','help'])await teclear(dc,l);
    await dc.locator('.term-scroll').evaluate(function(e){e.scrollTop=0});
    await dc.locator('.term-scroll').evaluate(function(e){e.style.height='auto'});
    await revisar(c,r,'salida con colores '+ancho+'px '+tema+'/'+contraste+' ×'+escala+' '+fuente);
    await cerrar(c);
  }
});
