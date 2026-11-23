/* OneBook: marcadores a bloques de las lecciones.
   En una lección, cada bloque (párrafo, tabla, laboratorio, sección...) se puede guardar como marcador:
   con el ratón aparece un botón al lado del bloque; en pantallas táctiles, al tocar el bloque; con el teclado,
   M guarda la sección actual. Los marcadores viven en AT.datos (IndexedDB), se listan en «Mis apuntes»
   y se citan en tus documentos escribiendo «@». Expone AT.marcadores. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
var RAIZ=AT.rutas.raiz,LID=document.body.getAttribute('data-leccion')||'';

function idNuevo(){return 'm-'+AT.bloques.nuevoId().slice(2)+AT.bloques.nuevoId().slice(4)}
function textoDe(el){
  var t=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
  return t.length>140?t.slice(0,140).replace(/\s+\S*$/,'')+'…':t;
}
var cache=[];
function cargar(){return AT.datos.marcadores.todos().then(function(l){cache=l;return l})}
function de(doc,bloque){return cache.filter(function(m){return m.doc===doc&&m.bloque===bloque})[0]||null}

AT.marcadores={
  todos:function(){return cargar()},
  /* Para los documentos: {href, texto, sub} de cada marcador, los más nuevos primero */
  paraCitar:function(){
    return cargar().then(function(l){
      return l.slice().sort(function(a,b){return (b.creado||'')<(a.creado||'')?-1:1}).map(function(m){
        return {href:m.url+'#'+m.bloque,texto:m.texto,sub:m.docTitulo+(m.seccion&&m.seccion!==m.texto?' · '+m.seccion:''),doc:m.doc,bloque:m.bloque};
      });
    });
  },
  quitar:function(id){return AT.datos.marcadores.borrar(id)}
};

if(!LID||!AT.documento)return;
var page=$('.page'),doc=AT.documento;
var URL_LECCION='lecciones/'+((AT.leccion&&AT.leccion.archivo)||LID+'.html');

/* Sección a la que pertenece un bloque: el h2 anterior */
function seccionDe(el){
  var e=el;
  while(e){if(e.tagName==='H2'&&e.id)return e.textContent.trim();e=e.previousElementSibling}
  return '';
}
function bloques(){return $$('[data-b]',page).filter(function(b){return b.id&&!b.classList.contains('toc')})}
function pintarMarcas(){
  bloques().forEach(function(b){
    var m=de(doc.id,b.id);
    b.classList.toggle('marcado',!!m);
  });
  if(actual)sincronizarBoton();
}

function guardar(el){
  var m=de(doc.id,el.id);
  if(m){
    return AT.datos.marcadores.borrar(m.id).then(cargar).then(function(){
      pintarMarcas();AT.aviso('Se quitó el marcador.');
    });
  }
  var nuevo={id:idNuevo(),doc:doc.id,docTitulo:doc.titulo,url:URL_LECCION,bloque:el.id,
    texto:el.tagName==='H2'||el.tagName==='H3'?el.textContent.trim():textoDe(el.classList.contains('demo')?$('.demo-h b',el)||el:el),
    seccion:seccionDe(el),tipo:el.tagName==='H2'?'seccion':'bloque'};
  if(!nuevo.texto)nuevo.texto=nuevo.seccion||doc.titulo;
  return AT.datos.marcadores.guardar(nuevo).then(cargar).then(function(){
    pintarMarcas();
    AT.aviso('Marcador guardado. Cítalo en tus documentos escribiendo «@».');
  });
}

/* ---------- Botón junto al bloque ---------- */
var boton=document.createElement('button');
boton.type='button';boton.className='marc-btn';boton.hidden=true;
boton.innerHTML=ico('marcador');
/* Va en <body> (no dentro de la lección, para no cambiar su estructura) y se coloca en el margen */
document.body.appendChild(boton);
var actual=null;
function sincronizarBoton(){
  var m=actual&&de(doc.id,actual.id);
  var et=m?'Quitar el marcador de este bloque':'Guardar este bloque como marcador';
  boton.setAttribute('aria-label',et);boton.title=et;
  boton.setAttribute('aria-pressed',m?'true':'false');
}
function mostrar(b){
  actual=b;
  var r=b.getBoundingClientRect(),cs=getComputedStyle(b),lh=parseFloat(cs.lineHeight)||24;
  var pc=getComputedStyle(page),izq=page.getBoundingClientRect().left+parseFloat(pc.paddingLeft);
  boton.hidden=false;
  var w=boton.offsetWidth||28;
  /* Con margen amplio, a la izquierda del bloque; en celular, en su esquina derecha */
  var x=parseFloat(pc.paddingLeft)>=w+12?izq-w-8:Math.min(r.right,innerWidth-8)-w;
  var y=parseFloat(pc.paddingLeft)>=w+12?r.top+Math.max(0,(Math.min(lh,r.height)-w)/2):r.top-w*0.6;
  boton.style.left=(x+scrollX)+'px';boton.style.top=(y+scrollY)+'px';
  sincronizarBoton();
}
function bloqueEn(t){
  var b=t&&t.closest&&t.closest('[data-b]');
  return b&&page.contains(b)&&b.id&&!b.classList.contains('toc')?b:null;
}
page.addEventListener('mousemove',function(e){
  if(e.target===boton||boton.contains(e.target))return;
  var b=bloqueEn(e.target);
  if(b&&(b!==actual||boton.hidden))mostrar(b);
});
/* Solo el ratón lo esconde al salir (un toque también genera estos eventos) */
page.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'&&e.relatedTarget!==boton&&!boton.contains(e.relatedTarget))boton.hidden=true});
boton.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'&&!page.contains(e.relatedTarget))boton.hidden=true});
addEventListener('resize',function(){if(!boton.hidden&&actual)mostrar(actual)});
AT.ajustes.on(function(){boton.hidden=true});
/* Tocar un bloque (fuera de sus controles) también muestra el botón: así funciona en pantallas táctiles */
page.addEventListener('click',function(e){
  if(e.target.closest('button,a,input,label,summary,select,textarea,.marc-btn'))return;
  var b=bloqueEn(e.target);
  if(b)mostrar(b);
});
/* Con el teclado: al enfocar una sección (J/K, el mapa o el índice) */
page.addEventListener('focusin',function(e){if(e.target.tagName==='H2'&&e.target.id)mostrar(e.target)});
boton.addEventListener('click',function(){if(actual)guardar(actual).then(function(){boton.focus({preventScroll:true})})});

/* M guarda (o quita) el marcador de la sección que estás leyendo */
function seccionVisible(){
  var hs=$$('h2[id]',page),cur=null,lim=innerHeight*0.35;
  hs.forEach(function(h){if(h.getBoundingClientRect().top<=lim)cur=h});
  return cur||hs[0];
}
document.addEventListener('keydown',function(e){
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey)return;
  var t=e.target;
  if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))&&t.getClientRects().length)return;
  if(document.querySelector('dialog[open]'))return;
  if(e.key!=='m'&&e.key!=='M')return;
  var a=document.activeElement,b=a&&a.tagName==='H2'&&a.id?a:seccionVisible();
  if(!b)return;
  e.preventDefault();
  mostrar(b);guardar(b);
});

cargar().then(pintarMarcas);
AT.datos.on(function(c){if(c.almacen==='marcadores'||c.almacen==='*')cargar().then(pintarMarcas)});
})();
