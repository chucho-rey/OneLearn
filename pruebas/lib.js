/* Utilidades compartidas por las pruebas de OneBook.
   - servidor(): sirve el repositorio en http://127.0.0.1:<puerto>/OneLearn/, igual que GitHub Pages
     (así se detectan rutas absolutas y funciona el service worker, que no corre con file://).
   - prueba(nombre, fn): arranca servidor y navegador, ejecuta fn({browser, base, r}) y sale con código 1
     si alguna comprobación falló.
   - pagina(browser, opciones): abre una página nueva con tamaño, ajustes de lectura y datos guardados.
   - revisar(p, r, etiqueta): comprueba que la página no se desborde, no tenga errores y cumpla el contraste.
   Variables de entorno: DETALLE=1 muestra también las comprobaciones que pasan. */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');

const RAIZ=path.resolve(__dirname,'..');
const PREFIJO='/OneLearn/';
const TIPOS={
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml',
  '.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8'
};

function servidor(){
  return new Promise(function(listo){
    const s=http.createServer(function(req,res){
      let u;
      try{u=decodeURIComponent(req.url.split('?')[0])}catch(e){res.writeHead(400);return res.end()}
      if(!u.startsWith(PREFIJO)){res.writeHead(404);return res.end('fuera del sitio')}
      let rel=u.slice(PREFIJO.length)||'index.html';
      if(rel.endsWith('/'))rel+='index.html';
      const f=path.join(RAIZ,rel);
      if(!f.startsWith(RAIZ+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('no existe')}
      res.writeHead(200,{'Content-Type':TIPOS[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0,'127.0.0.1',function(){listo(s)});
  });
}

class Registro{
  constructor(nombre){this.nombre=nombre;this.pasan=0;this.fallan=0}
  cumple(cond,msg,detalle){
    if(cond){this.pasan++;if(process.env.DETALLE)console.log('  ✓ '+msg)}
    else{this.fallan++;console.log('  ✗ '+msg+(detalle!==undefined?' → '+JSON.stringify(detalle):''))}
    return !!cond;
  }
  igual(valor,esperado,msg){return this.cumple(valor===esperado,msg,{obtenido:valor,esperado:esperado})}
}

async function prueba(nombre,fn){
  const srv=await servidor();
  const base='http://127.0.0.1:'+srv.address().port+PREFIJO;
  const browser=await chromium.launch();
  const r=new Registro(nombre);
  const t0=Date.now();
  console.log('■ '+nombre);
  try{await fn({browser:browser,base:base,r:r})}
  catch(e){r.cumple(false,'la prueba terminó con una excepción',String(e&&e.message||e).split('\n')[0])}
  finally{await browser.close();srv.close()}
  console.log((r.fallan?'✗ ':'✓ ')+nombre+': '+r.pasan+' comprobaciones bien, '+r.fallan+' mal ('+Math.round((Date.now()-t0)/1000)+' s)');
  process.exitCode=r.fallan?1:0;
}

/* Abre una página nueva.
   opciones: ancho, alto, ajustes (se fijan en cada carga), local (claves de localStorage, solo la primera
   carga), movil, reducir (movimiento reducido), contraste ('more' simula que el sistema pide contraste). */
async function pagina(browser,o){
  o=o||{};
  const ctx=await browser.newContext(Object.assign({
    viewport:{width:o.ancho||1280,height:o.alto||900},
    reducedMotion:o.reducir?'reduce':'no-preference'
  },o.contraste?{contrast:o.contraste}:{},o.movil?{isMobile:true,hasTouch:true}:{}));
  if(o.ajustes)await ctx.addInitScript(function(a){try{localStorage.setItem('aprende-tecnologia:ajustes',JSON.stringify(a))}catch(e){}},o.ajustes);
  const p=await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.errores=[];
  p.on('pageerror',function(e){p.errores.push(e.message)});
  p.on('console',function(m){if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))p.errores.push(m.text())});
  /* Solo cuentan las cargas fallidas del propio sitio */
  p.on('requestfailed',function(q){if(q.url().indexOf('127.0.0.1')>=0&&!/ERR_ABORTED/.test(q.failure()&&q.failure().errorText))p.errores.push('no cargó '+q.url())});
  /* Un archivo del sitio que no existe también es un error; y el sitio no debe depender de otros servidores */
  p.on('response',function(res){if(res.url().indexOf('127.0.0.1')>=0&&res.status()>=400)p.errores.push(res.status()+' '+res.url())});
  p.externos=[];
  p.on('request',function(q){if(/^https?:/.test(q.url())&&q.url().indexOf('127.0.0.1')<0)p.externos.push(q.url())});
  if(o.local){
    await ctx.addInitScript(function(l){
      try{if(!localStorage.getItem('__sembrado')){localStorage.setItem('__sembrado','1');for(const k in l)localStorage.setItem(k,l[k])}}catch(e){}
    },o.local);
  }
  return p;
}
async function cerrar(p){await p.context().close()}

/* Espera a que la página termine de cargar, incluidas las fuentes */
async function listo(p,extra){
  await p.waitForLoadState('load');
  await p.evaluate(function(){return document.fonts.ready.then(function(){})});
  await p.waitForTimeout(extra||250);
}

/* Auditoría de contraste: revisa todo el texto visible contra su fondo real (incluye transparencias).
   Exige 4.5:1 (3:1 en texto grande) y, con alto contraste, 7:1 (4.5:1 en texto grande). */
function auditoria(){
  const P=function(s){const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return {r:0,g:0,b:0,a:0};const v=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
  const sobre=function(t,b){return {r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1}};
  const L=function(c){const f=function(x){x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  function fondo(el){
    const capas=[];let e=el;
    while(e&&e.nodeType===1){const cs=getComputedStyle(e);if(cs.backgroundImage!=='none')return null;const c=P(cs.backgroundColor);if(c.a>0)capas.push(c);if(c.a>=1)break;e=e.parentElement}
    let base={r:255,g:255,b:255,a:1};
    if(!capas.length||capas[capas.length-1].a<1){base=P(getComputedStyle(document.documentElement).backgroundColor);if(base.a<1)base={r:255,g:255,b:255,a:1}}
    for(let i=capas.length-1;i>=0;i--)base=sobre(capas[i],base);
    return base;
  }
  const alto=document.documentElement.getAttribute('data-contrast')==='high';
  const fallos={};let n=0;
  document.querySelectorAll('body *').forEach(function(el){
    if(el.closest('svg,script,style,[hidden]'))return;
    if(![].some.call(el.childNodes,function(t){return t.nodeType===3&&t.textContent.trim()}))return;
    const cs=getComputedStyle(el);if(cs.visibility!=='visible'||cs.display==='none')return;
    const rc=el.getBoundingClientRect();if(!rc.width||!rc.height)return;
    if(el.closest(':disabled,[aria-disabled="true"]'))return;
    let o=1,e=el;while(e){o*=parseFloat(getComputedStyle(e).opacity);e=e.parentElement}
    const b=fondo(el);if(!b)return;
    let c=P(cs.color);c=sobre({r:c.r,g:c.g,b:c.b,a:c.a*o},b);
    const ratio=(Math.max(L(c),L(b))+.05)/(Math.min(L(c),L(b))+.05);
    const t=parseFloat(cs.fontSize),grande=t>=24||(t>=18.66&&+cs.fontWeight>=700);
    const minimo=alto?(grande?4.5:7):(grande?3:4.5);
    n++;
    if(ratio<minimo-0.01){
      const k=(typeof el.className==='string'&&el.className?'.'+el.className.split(' ')[0]:el.tagName.toLowerCase())+' '+cs.color;
      fallos[k]={contraste:+ratio.toFixed(2),minimo:minimo,texto:el.textContent.trim().slice(0,30)};
    }
  });
  return {textos:n,fallos:fallos};
}

/* Revisión estándar de una página: sin desborde horizontal, sin errores y sin fallos de contraste */
async function revisar(p,r,etiqueta){
  const ov=await p.evaluate(function(){const d=document.documentElement;return d.scrollWidth-d.clientWidth});
  r.cumple(ov<=0,etiqueta+': sin desborde horizontal',ov);
  const a=await p.evaluate(auditoria);
  r.cumple(Object.keys(a.fallos).length===0,etiqueta+': contraste suficiente en '+a.textos+' textos',a.fallos);
  r.cumple(p.errores.length===0,etiqueta+': sin errores',p.errores.slice(0,3));
}

module.exports={prueba:prueba,pagina:pagina,cerrar:cerrar,listo:listo,revisar:revisar,auditoria:auditoria,RAIZ:RAIZ};
