/* Avance de lectura de OneLearn.
   Guarda en este dispositivo qué secciones de cada lección leíste, dónde te quedaste y tu resultado del repaso.
   Expone AT.avance para el resto del sitio (la pantalla de inicio lo usa) y, en las lecciones:
   - registra la lectura de cada sección (h2 con id dentro de .page);
   - dibuja el «mapa del tema» en el margen derecho cuando hay espacio;
   - muestra el porcentaje de cada lección en la barra lateral.
   Una sección cuenta como leída cuando viste su final y pasaste en ella un tiempo mínimo
   proporcional a su largo, para que bajar de golpe hasta el final no la marque.
   Se carga después de base.js, barra.js y apuntes.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc;
var KEY='aprende-tecnologia:avance';

function leerTodo(){
  try{var d=JSON.parse(localStorage.getItem(KEY)||'{}');if(d&&typeof d==='object')return d}catch(e){}
  return {};
}
var datos=leerTodo();
if(!datos.lecciones)datos.lecciones={};
function guardar(){try{localStorage.setItem(KEY,JSON.stringify(datos))}catch(e){}}

var oyentes=[];
function avisar(){oyentes.forEach(function(fn){try{fn()}catch(e){}})}

AT.avance={
  /* {total, leidas:{id:fecha}, seccion, seccionTitulo, visto, repaso:{ok,total,fecha}} o null */
  de:function(id){return datos.lecciones[id]||null},
  porcentaje:function(id){
    var l=datos.lecciones[id];
    if(!l||!l.total)return 0;
    return Math.min(100,Math.round(Object.keys(l.leidas||{}).length/l.total*100));
  },
  /* La lección vista más recientemente: {id, ...} o null */
  ultima:function(){
    var id=datos.ultima;
    return id&&datos.lecciones[id]?Object.assign({id:id},datos.lecciones[id]):null;
  },
  hayDatos:function(){return Object.keys(datos.lecciones).length>0},
  on:function(fn){oyentes.push(fn)},
  /* Vuelve a leer lo guardado (después de importar un respaldo, por ejemplo) */
  recargar:recargar,
  /* Avance de una ruta de aprendizaje (AT.caminos): cada módulo con sus lecciones y proyectos,
     cuántos hay terminados y cuál sigue (el primero publicado que no has terminado) */
  camino:function(c){
    var porId={},proy={},res={modulos:[],total:0,publicadas:0,terminadas:0,sig:null};
    (AT.catalogo||[]).forEach(function(g){g.lecciones.forEach(function(l){porId[l.id]=l})});
    (AT.proyectos||[]).forEach(function(p){proy[p.id]=p});
    c.modulos.forEach(function(m,i){
      var mod={titulo:m.titulo,meta:m.meta||'',n:i+1,items:[],hechas:0,publicadas:0};
      (m.lecciones||[]).forEach(function(id){
        var l=porId[id];if(!l)return;
        var pct=l.archivo?AT.avance.porcentaje(id):0;
        mod.items.push({tipo:'leccion',id:id,titulo:l.titulo,icono:l.icono,archivo:l.archivo||'',pct:pct,hecho:pct>=100,modulo:i+1});
      });
      (m.proyectos||[]).forEach(function(id){
        var p=proy[id];if(!p)return;
        var h=AT.proyectosAvance?AT.proyectosAvance.hechas(id):0,pct=p.tareas?Math.round(h/p.tareas*100):0;
        mod.items.push({tipo:'proyecto',id:id,titulo:p.titulo,icono:p.icono||'proyecto',archivo:p.archivo,pct:pct,hecho:pct>=100,modulo:i+1,nivel:p.nivel,duracion:p.duracion});
      });
      mod.items.forEach(function(it){
        res.total++;
        if(it.archivo){res.publicadas++;mod.publicadas++}
        if(it.hecho){res.terminadas++;mod.hechas++}
        if(!res.sig&&it.archivo&&!it.hecho)res.sig=it;
      });
      mod.completo=mod.items.length>0&&mod.hechas===mod.items.length;
      res.modulos.push(mod);
    });
    return res;
  }
};
function recargar(){
  datos=leerTodo();if(!datos.lecciones)datos.lecciones={};
  avisar();
}
/* Otra pestaña del navegador cambió el avance */
window.addEventListener('storage',function(e){if(e.key===KEY)recargar()});

/* ---------- Porcentaje en la barra lateral ---------- */
function pintarBarra(){
  $$('#side .nv[data-id]').forEach(function(a){
    var p=AT.avance.porcentaje(a.getAttribute('data-id'));
    var em=$('em.pct',a);
    if(!p){if(em)em.remove();a.removeAttribute('data-p');a.style.removeProperty('--p');return}
    if(!em){em=document.createElement('em');em.className='pct';a.appendChild(em)}
    em.textContent=p+'%';
    a.setAttribute('data-p',p);
    a.style.setProperty('--p',p+'%');
  });
}
AT.avance.on(pintarBarra);
pintarBarra();

/* ---------- Seguimiento dentro de una lección ---------- */
var LID=document.body.getAttribute('data-leccion');
var page=$('.page');
if(!LID||!page)return;
var hs=$$('h2[id]',page);
if(!hs.length)return;
var todosH2=$$('h2',page);
var secs=hs.map(function(h){
  /* Palabras de la sección: del h2 hasta el siguiente h2 */
  var n=0,el=h.nextElementSibling;
  while(el&&el.tagName!=='H2'){n+=(el.textContent||'').trim().split(/\s+/).length;el=el.nextElementSibling}
  /* Tiempo mínimo: un cuarto de lo que tomaría leerla a 250 palabras por minuto, entre 3 y 15 s */
  var min=Math.max(3,Math.min(15,Math.round(n/250*60*0.25)));
  return {id:h.id,h:h,titulo:h.textContent.trim(),min:min,t:0,fin:false};
});
var yo=datos.lecciones[LID]||(datos.lecciones[LID]={leidas:{}});
if(!yo.leidas)yo.leidas={};
yo.total=secs.length;
/* Quita secciones que ya no existen en la lección (si cambió su contenido) */
Object.keys(yo.leidas).forEach(function(id){if(!document.getElementById(id))delete yo.leidas[id]});
datos.ultima=LID;
yo.visto=new Date().toISOString();
guardar();

function finDe(s){
  var i=todosH2.indexOf(s.h),sig=todosH2[i+1];
  if(sig)return sig.getBoundingClientRect().top;
  var ult=page.lastElementChild;
  return ult?ult.getBoundingClientRect().bottom:page.getBoundingClientRect().bottom;
}
var actualId=null;
function seccionActual(){
  var lim=innerHeight*0.35,cur=null;
  secs.forEach(function(s){if(s.h.getBoundingClientRect().top<=lim)cur=s});
  return cur;
}
function marcar(s){
  if(yo.leidas[s.id])return false;
  yo.leidas[s.id]=new Date().toISOString();
  return true;
}
var cambio=false;
function revisar(conTiempo){
  var vh=innerHeight;
  secs.forEach(function(s){
    var top=s.h.getBoundingClientRect().top,fin=finDe(s);
    if(conTiempo&&top<vh&&fin>0)s.t+=1;
    if(fin<=vh)s.fin=true;
    if(s.fin&&s.t>=s.min&&marcar(s))cambio=true;
  });
  var cur=seccionActual();
  var id=cur?cur.id:null;
  if(id!==actualId){
    actualId=id;
    yo.seccion=id;yo.seccionTitulo=cur?cur.titulo:'';
    cambio=true;
  }
  if(cambio){
    cambio=false;
    yo.visto=new Date().toISOString();
    datos.ultima=LID;
    guardar();avisar();
  }
}
/* Cada segundo con la página visible suma tiempo a las secciones en pantalla */
setInterval(function(){if(!document.hidden)revisar(true)},1000);
var pendiente=false;
addEventListener('scroll',function(){
  if(pendiente)return;
  pendiente=true;
  requestAnimationFrame(function(){pendiente=false;revisar(false)});
},{passive:true});
addEventListener('pagehide',guardar);

/* Terminar el repaso marca su sección como leída y guarda el resultado */
document.addEventListener('repaso-terminado',function(e){
  yo.repaso={ok:e.detail.ok,total:e.detail.total,fecha:new Date().toISOString()};
  var q=e.detail.host||$('#qz'),sec=null;
  if(q)secs.forEach(function(s){if(s.h.compareDocumentPosition(q)&Node.DOCUMENT_POSITION_FOLLOWING)sec=s});
  if(sec)marcar(sec);
  guardar();avisar();
});

/* ---------- Mapa del tema (margen derecho, solo si hay espacio) ---------- */
var lienzo=document.createElement('div'),dentro=document.createElement('div');
lienzo.className='lienzo';dentro.className='lienzo-in';
page.parentNode.insertBefore(lienzo,page);
lienzo.appendChild(dentro);
dentro.appendChild(page);
var mapa=document.createElement('nav');
mapa.className='mapa';mapa.setAttribute('aria-label','Mapa del tema');
dentro.appendChild(mapa);
mapa.innerHTML='<div class="mapa-h"><span class="mapa-l">Tu avance</span><b id="mapaPct"></b></div>'+
  '<div class="mapa-bar" aria-hidden="true"><i id="mapaBar"></i></div>'+
  '<ol>'+secs.map(function(s){
    return '<li data-id="'+esc(s.id)+'"><a href="#'+esc(s.id)+'"><span class="mk" aria-hidden="true"></span><span class="mt">'+esc(s.titulo)+'</span><span class="vh"></span></a></li>';
  }).join('')+'</ol>'+
  '<p class="mapa-nota">Una sección cuenta como leída cuando llegas a su final.</p>';
function pintarMapa(){
  var p=AT.avance.porcentaje(LID);
  $('#mapaPct').textContent=p+'%';
  $('#mapaBar').style.width=p+'%';
  $$('li',mapa).forEach(function(li){
    var id=li.getAttribute('data-id'),leida=!!yo.leidas[id],aqui=id===actualId,a=$('a',li);
    li.classList.toggle('leida',leida);
    li.classList.toggle('aqui',aqui);
    if(aqui)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
    $('.vh',li).textContent=leida?' (leída)':'';
  });
}
mapa.addEventListener('click',function(e){
  var a=e.target.closest('a');
  if(!a)return;
  e.preventDefault();
  var h=document.getElementById(a.getAttribute('href').slice(1));
  if(!h)return;
  h.scrollIntoView({behavior:AT.reduce?'auto':'smooth',block:'start'});
  /* El foco va al título, para que el teclado y los lectores de pantalla sigan desde ahí */
  h.setAttribute('tabindex','-1');
  h.focus({preventScroll:true});
});
/* Si otra pestaña cambió el avance, se combina con lo de esta y se sigue con el registro nuevo */
AT.avance.on(function(){
  var n=datos.lecciones[LID];
  if(!n||n===yo)return;
  if(!n.leidas)n.leidas={};
  Object.keys(yo.leidas).forEach(function(id){if(!n.leidas[id])n.leidas[id]=yo.leidas[id]});
  n.total=secs.length;
  yo=n;
});
AT.avance.on(pintarMapa);
pintarMapa();

/* Llegar con #seccion (desde «Continúa donde te quedaste») lleva a esa sección,
   también después de que carguen las fuentes y cambie la altura del texto */
var destino=location.hash.length>1&&document.getElementById(decodeURIComponent(location.hash.slice(1)));
if(destino&&(destino.tagName==='H2'||destino.hasAttribute('data-b'))){
  if(destino.tagName==='DETAILS')destino.open=true;
  var ir=function(){destino.scrollIntoView({block:'start'})};
  ir();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(ir);
}
revisar(false);
})();
