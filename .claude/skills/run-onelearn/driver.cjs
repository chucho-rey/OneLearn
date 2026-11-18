/* Driver de OneLearn para agentes: sirve el repositorio como GitHub Pages (http://127.0.0.1:<puerto>/OneLearn/),
   abre Chromium sin ventana y ejecuta comandos leídos de stdin, uno por línea:
     goto <ruta>              abre una página del sitio (index.html, rutas.html, lecciones/terminal.html…)
     size <ancho> <alto>      cambia el tamaño de la ventana (390 844 = celular)
     click <selector>         clic
     fill <selector> <texto>  escribe en un campo
     press <tecla>            pulsa una tecla (Enter, Control+k…)
     term <n> <línea>         escribe una línea en la terminal simulada del laboratorio n (0, 1, 2…) y espera
     text <selector>          imprime el texto del elemento
     eval <expresión>         evalúa JavaScript en la página e imprime el resultado (ej. AT.leccion.id)
     shot <nombre>            captura de lo que se ve en la ventana: <salida>/<nombre>.png
     shotel <nombre> <sel>    captura de un solo elemento (ej. .demo >> nth=1)
     shotfull <nombre>        captura de la página completa (en celular, una lección mide más de 15 000 px)
     wait <ms>                espera
     errors                   imprime los errores de la consola acumulados
   Uso: node driver.cjs [carpeta-de-capturas] < comandos.txt   (con NODE_PATH apuntando a playwright) */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),readline=require('readline');
const {chromium}=require('playwright');
const RAIZ=path.resolve(__dirname,'../../..'),SAL=path.resolve(process.argv[2]||'/tmp/onelearn-capturas');
const TIPOS={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
fs.mkdirSync(SAL,{recursive:true});
const srv=http.createServer(function(q,r){
  let u=decodeURIComponent(q.url.split('?')[0]);
  if(!u.startsWith('/OneLearn/')){r.writeHead(404);return r.end()}
  let f=path.join(RAIZ,u.slice(10)||'index.html');
  if(f.endsWith(path.sep))f+='index.html';
  if(!f.startsWith(RAIZ)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':TIPOS[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);
});
srv.listen(0,'127.0.0.1',async function(){
  const base='http://127.0.0.1:'+srv.address().port+'/OneLearn/';
  console.log('sirviendo '+base);
  const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1280,height:900}}),p=await ctx.newPage();
  const errores=[];p.on('pageerror',e=>errores.push(e.message));p.on('console',m=>{if(m.type()==='error')errores.push(m.text())});
  const rl=readline.createInterface({input:process.stdin});
  for await (const linea of rl){
    const l=linea.trim();if(!l||l[0]==='#')continue;
    const [c,...a]=l.split(' '),resto=a.join(' ');
    try{
      if(c==='goto'){await p.goto(base+resto);await p.waitForLoadState('load');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300)}
      else if(c==='size')await p.setViewportSize({width:+a[0],height:+a[1]});
      else if(c==='click')await p.click(resto);
      else if(c==='fill')await p.fill(a[0],a.slice(1).join(' '));
      else if(c==='press')await p.keyboard.press(resto);
      else if(c==='term'){
        const d=p.locator('.demo').nth(+a[0]),inp=d.locator('.term-cmd');
        await inp.fill(a.slice(1).join(' '));await inp.press('Enter');
        await d.locator('.term-ps-v').evaluate(e=>new Promise(res=>{(function f(){e.textContent?res():setTimeout(f,25)})()}));
        console.log((await d.locator('.term-log').textContent()).split('\n').slice(-8).join('\n'));
      }
      else if(c==='text')console.log((await p.textContent(resto)||'').trim());
      else if(c==='eval')console.log(JSON.stringify(await p.evaluate(resto)));
      else if(c==='shot'||c==='shotfull'){const f=path.join(SAL,resto+'.png');await p.screenshot({path:f,fullPage:c==='shotfull'});console.log('captura '+f)}
      else if(c==='shotel'){const f=path.join(SAL,a[0]+'.png'),el=p.locator(a.slice(1).join(' ')).first();await el.scrollIntoViewIfNeeded();await el.screenshot({path:f});console.log('captura '+f)}
      else if(c==='wait')await p.waitForTimeout(+resto);
      else if(c==='errors')console.log(errores.length?errores.join('\n'):'sin errores');
      else console.log('comando desconocido: '+c);
    }catch(e){console.log('ERROR en «'+l+'»: '+String(e.message).split('\n')[0])}
  }
  await b.close();srv.close();
});
