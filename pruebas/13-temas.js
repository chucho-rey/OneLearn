/* Todas las lecciones del temario (salvo RAM, CPU, Almacenamiento y Tarjeta gráfica, que tienen sus propias pruebas):
   se ven bien en celular y escritorio, cada control de cada laboratorio funciona sin errores ni desbordes,
   y los cálculos clave de cada laboratorio dan lo que deben. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const {prueba,pagina,cerrar,listo,revisar,RAIZ}=require('./lib');

/* El temario se lee de assets/js/catalogo.js, así una lección nueva entra sola a esta prueba */
function catalogo(){
  const ctx={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ,'assets/js/catalogo.js'),'utf8'),ctx);
  return ctx.window.AT.catalogo;
}
const PROPIAS=['ram','cpu','almacenamiento','gpu'];
const SOLO=(process.env.LECCIONES||'').split(',').filter(Boolean);

function txt(p,sel){return p.textContent(sel).then(function(t){return t.trim()})}
function demo(p,n){return p.locator('.demo').nth(n)}

/* Comprobaciones propias de cada lección: reciben la página ya cargada (movimiento reducido) */
const COMPROBAR=require('./comprobaciones')(txt,demo);

prueba('Todos los temas',async function({browser,base,r}){
  const lecciones=[];
  catalogo().forEach(function(g){g.lecciones.forEach(function(l){if(l.archivo&&PROPIAS.indexOf(l.id)<0&&(!SOLO.length||SOLO.indexOf(l.id)>=0))lecciones.push(l)})});
  r.cumple(lecciones.length>0,'hay lecciones que revisar');
  for(const l of lecciones){
    const url=base+'lecciones/'+l.archivo;
    /* Variantes de lectura: celular con todo al máximo y escritorio normal */
    for(const [ancho,tema,contraste,escala,fuente] of [[390,'dark','high',1.5,'opendyslexic'],[1280,'light','normal',1,'normal']]){
      const p=await pagina(browser,{ancho:ancho,ajustes:{tema:tema,contraste:contraste,escala:escala,fuente:fuente}});
      await p.goto(url);await listo(p);
      await revisar(p,r,l.id+' '+ancho+'px '+tema+'/'+contraste+' ×'+escala+' '+fuente);
      await cerrar(p);
    }
    /* Cada control de cada laboratorio, en celular */
    const m=await pagina(browser,{ancho:390,reducir:true});
    await m.goto(url);await listo(m);
    const n=await m.locator('.demo').count();
    let pulsados=0;
    for(let k=0;k<n;k++){
      const ctl=demo(m,k).locator('button:not([aria-disabled="true"]),input[type=checkbox],input[type=range],select');
      const c=await ctl.count();
      for(let j=0;j<c;j++){
        const e=ctl.nth(j);
        if(!await e.isVisible()||await e.getAttribute('aria-disabled')==='true')continue;
        const tipo=await e.evaluate(function(x){return x.tagName==='INPUT'?x.type:x.tagName.toLowerCase()});
        if(tipo==='range')await e.evaluate(function(x){x.value=x.max;x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))});
        else if(tipo==='select')await e.evaluate(function(x){x.selectedIndex=x.options.length-1;x.dispatchEvent(new Event('change',{bubbles:true}))});
        else await e.click();
        pulsados++;
      }
    }
    await m.waitForTimeout(300);
    const ov=await m.evaluate(function(){return document.documentElement.scrollWidth-document.documentElement.clientWidth});
    r.cumple(n>=2&&pulsados>=n&&ov<=0&&m.errores.length===0,l.id+': se usan los '+n+' laboratorios ('+pulsados+' controles) sin errores ni desbordes',{ov:ov,errores:m.errores.slice(0,2)});
    await cerrar(m);
    /* Cálculos clave */
    const f=COMPROBAR[l.id];
    r.cumple(!!f,l.id+': tiene comprobaciones propias');
    if(f){
      const p=await pagina(browser,{reducir:true});
      await p.goto(url);await listo(p);
      await f(p,r);
      r.cumple(p.errores.length===0,l.id+': sin errores',p.errores.slice(0,2));
      await cerrar(p);
    }
  }
});
