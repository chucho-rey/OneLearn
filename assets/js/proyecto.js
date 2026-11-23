/* OneBook: proyectos guiados por fases.
   - En proyectos/index.html (data-pagina="proyectos") lista los proyectos de AT.proyectos con su avance.
   - En proyectos/<id>.html (data-pagina="proyecto") dibuja el proyecto de <script id="proyecto">: introducción,
     la lista de fases y una fase a la vez (#f1, #f2…), con su contenido en el formato de bloques, sus tareas
     (que se marcan y se guardan en AT.proyectosAvance) y su entregable. La última fase guarda la dirección
     del sitio publicado (solo https). Todo el texto se pone con textContent: nada del proyecto se interpreta como HTML. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,ico=AT.ico,PA=AT.proyectosAvance;
var PAGINA=AT.rutas.pagina;

function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function ahora(){return new Date().toISOString()}

/* ---------- Lista de proyectos ---------- */
if(PAGINA==='proyectos'){
  var cont=$('#pjLista');
  (AT.proyectos||[]).forEach(function(p){
    var hechas=PA.hechas(p.id),pct=p.tareas?Math.round(hechas/p.tareas*100):0,av=PA.leer(p.id);
    var a=el('a','pj-card');a.href=p.archivo;
    a.innerHTML=ico(p.icono||'proyecto','pj-card-ic');
    var c=el('div','pj-card-c');
    c.appendChild(el('h2',null,p.titulo));
    c.appendChild(el('p',null,p.descripcion));
    var m=el('p','pj-card-m',p.nivel+' · '+p.duracion+' · '+p.fases+' fases');
    c.appendChild(m);
    var bar=el('div','pj-bar');bar.setAttribute('aria-hidden','true');var i=el('i');i.style.width=pct+'%';bar.appendChild(i);
    c.appendChild(bar);
    c.appendChild(el('p','pj-card-e',hechas===p.tareas&&p.tareas?'Terminado':hechas?'Llevas '+pct+' % ('+hechas+' de '+p.tareas+' tareas)':'Sin empezar'));
    a.appendChild(c);
    var li=el('li');li.appendChild(a);cont.appendChild(li);
  });
  return;
}
if(PAGINA!=='proyecto')return;

/* ---------- Un proyecto ---------- */
var fuente=document.getElementById('proyecto'),page=$('#pjPage');
var P;
try{P=JSON.parse(fuente.textContent)}catch(e){page.appendChild(el('p',null,'No se pudo mostrar este proyecto.'));return}
var ID=P.id,FASES=P.fases||[];
var TOTAL=FASES.reduce(function(s,f){return s+(f.tareas||[]).length},0);
AT.proyecto=P;

function estado(){var a=PA.leer(ID);if(!a.tareas||typeof a.tareas!=='object')a.tareas={};return a}
function hechasFase(f,a){return (f.tareas||[]).filter(function(t){return a.tareas[t.id]}).length}
function faseCompleta(f,a){return (f.tareas||[]).length>0&&hechasFase(f,a)===f.tareas.length}

/* Encabezado: ícono, título, ficha e introducción (con el mismo dibujo de bloques que las lecciones) */
AT.bloques.dibujar({titulo:P.titulo,icono:P.icono,props:P.props,contenido:P.intro||{type:'doc',content:[]}},page);
var resumen=el('div','pj-res');
resumen.innerHTML='<div class="pj-res-t"><b id="pjPct"></b><span id="pjCuenta"></span></div><div class="pj-bar" aria-hidden="true"><i id="pjBar"></i></div>';
page.appendChild(resumen);

var nav=el('nav','pj-nav');nav.setAttribute('aria-label','Fases del proyecto');
var ol=el('ol','pj-fases');nav.appendChild(ol);page.appendChild(nav);
var panel=el('section','pj-fase');panel.id='pjFase';panel.setAttribute('aria-labelledby','pjFaseT');
page.appendChild(panel);

function pintarAvance(){
  var a=estado(),n=Object.keys(a.tareas).filter(function(k){return FASES.some(function(f){return (f.tareas||[]).some(function(t){return t.id===k})})}).length;
  var pct=TOTAL?Math.round(n/TOTAL*100):0;
  $('#pjPct').textContent=n===TOTAL?'¡Proyecto terminado!':pct+' % del proyecto';
  $('#pjCuenta').textContent=n+' de '+TOTAL+' tareas';
  $('#pjBar').style.width=pct+'%';
  resumen.classList.toggle('fin',n===TOTAL);
  ol.innerHTML='';
  FASES.forEach(function(f,k){
    var li=el('li'),lnk=el('a','pj-f');lnk.href='#'+f.id;
    var h=hechasFase(f,a),comp=faseCompleta(f,a);
    lnk.classList.toggle('hecha',comp);
    if(f.id===actual)lnk.setAttribute('aria-current','step');
    var num=el('span','pj-n',comp?'✓':String(k+1));num.setAttribute('aria-hidden','true');
    lnk.appendChild(num);
    var t=el('span','pj-ft');t.appendChild(el('b',null,f.titulo));
    t.appendChild(el('small',null,comp?'Completa':h?h+' de '+f.tareas.length+' tareas':f.duracion));
    lnk.appendChild(t);
    var vh=el('span','vh',comp?' (completa)':'');lnk.appendChild(vh);
    li.appendChild(lnk);ol.appendChild(li);
  });
}

var actual=null;
function faseDe(id){for(var k=0;k<FASES.length;k++)if(FASES[k].id===id)return k;return -1}

function pintarFase(enfocar){
  var k=faseDe(actual),f=FASES[k],a=estado();
  panel.innerHTML='';
  var cab=el('div','pj-cab');
  cab.appendChild(el('p','pj-eyebrow','Fase '+(k+1)+' de '+FASES.length+' · '+f.duracion));
  var h=el('h2',null,f.titulo);h.id='pjFaseT';h.tabIndex=-1;cab.appendChild(h);
  cab.appendChild(el('p','pj-obj',f.objetivo));
  panel.appendChild(cab);
  /* Qué aprenderás y para qué sirve en el trabajo */
  var info=el('div','pj-info');
  var ap=el('div','pj-ap');ap.appendChild(el('h3',null,'Aprenderás'));
  var ul=el('ul');(f.aprenderas||[]).forEach(function(x){ul.appendChild(el('li',null,x))});ap.appendChild(ul);
  var tr=el('div','pj-tr');tr.appendChild(el('h3',null,'En el trabajo'));tr.appendChild(el('p',null,f.trabajo));
  info.appendChild(ap);info.appendChild(tr);panel.appendChild(info);
  /* Contenido de la fase */
  var cuerpo=el('div','pj-cuerpo');panel.appendChild(cuerpo);
  AT.bloques.dibujar({contenido:f.contenido},cuerpo,{encabezado:false});
  /* Tareas */
  var ta=el('div','pj-tareas');
  ta.appendChild(el('h3',null,'Tareas de esta fase'));
  var lista=el('ul','pj-tl');
  (f.tareas||[]).forEach(function(t){
    var li=el('li'),lab=el('label','chk pj-t'),cb=document.createElement('input');
    cb.type='checkbox';cb.setAttribute('data-t',t.id);cb.checked=!!a.tareas[t.id];
    lab.appendChild(cb);lab.appendChild(el('span',null,t.texto));
    li.appendChild(lab);lista.appendChild(li);
  });
  ta.appendChild(lista);
  var est=el('p','pj-est');est.id='pjEst';est.setAttribute('aria-live','polite');ta.appendChild(est);
  panel.appendChild(ta);
  /* Entregable */
  var en=el('div','callout pj-ent');
  en.innerHTML=ico('crear');
  var ed=el('div');ed.appendChild(el('b',null,'Entregable: '));ed.appendChild(document.createTextNode(f.entregable));
  en.appendChild(ed);panel.appendChild(en);
  if(f.enlace)panel.appendChild(cajaEnlace());
  /* Navegación entre fases */
  var nv=el('div','pj-nv');
  if(k>0){var ant=el('a','btn','← '+FASES[k-1].titulo);ant.href='#'+FASES[k-1].id;nv.appendChild(ant)}
  if(k<FASES.length-1){var sig=el('a','btn pri','Siguiente: '+FASES[k+1].titulo+' →');sig.href='#'+FASES[k+1].id;nv.appendChild(sig)}
  panel.appendChild(nv);
  pintarEstadoFase();
  if(enfocar){h.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:AT.reduce?'auto':'smooth'})}
}

function pintarEstadoFase(){
  var f=FASES[faseDe(actual)],a=estado(),h=hechasFase(f,a),n=f.tareas.length,e=$('#pjEst');
  if(!e)return;
  e.textContent=h===n?(faseDe(actual)<FASES.length-1?'¡Fase completa! Sigue con la siguiente cuando quieras.':'¡Fase completa!'):h+' de '+n+' tareas hechas.';
  e.classList.toggle('ok',h===n);
}

/* La dirección del portafolio publicado: solo https, y se muestra como enlace seguro */
function cajaEnlace(){
  var a=estado(),caja=el('div','pj-link');
  var lab=el('label','lbl','La dirección de tu portafolio publicado');lab.setAttribute('for','pjUrl');
  var fila=el('div','pj-link-f');
  var inp=document.createElement('input');inp.type='url';inp.id='pjUrl';inp.className='campo mono';inp.placeholder='https://tu-usuario.github.io/portafolio/';inp.autocomplete='off';inp.spellcheck=false;
  inp.value=a.enlace||'';
  var b=el('button','btn pri','Guardar');b.type='button';b.id='pjGuardar';
  fila.appendChild(inp);fila.appendChild(b);
  var msg=el('p','pj-link-m');msg.id='pjUrlMsg';msg.setAttribute('aria-live','polite');
  caja.appendChild(lab);caja.appendChild(fila);caja.appendChild(msg);
  function mostrar(){
    var s=estado();msg.textContent='';
    if(s.enlace){
      msg.appendChild(document.createTextNode('Guardado. '));
      var l=el('a',null,'Abrir mi portafolio');var h=AT.bloques.hrefSeguro(s.enlace);
      if(h){l.href=h;l.target='_blank';l.rel='noopener noreferrer';msg.appendChild(l)}
    }
  }
  b.addEventListener('click',function(){
    var v=inp.value.trim(),s=estado();
    if(!v){delete s.enlace;PA.guardar(ID,s);msg.textContent='Se borró la dirección.';return}
    if(!/^https:\/\/[^\s<>"']+\.[^\s<>"']+$/.test(v)){
      inp.setAttribute('aria-invalid','true');
      msg.textContent='Escribe la dirección completa, que empiece con https:// (por ejemplo, https://tu-usuario.github.io/portafolio/).';
      return;
    }
    inp.setAttribute('aria-invalid','false');
    s.enlace=v.slice(0,300);PA.guardar(ID,s);mostrar();
  });
  mostrar();
  return caja;
}

panel.addEventListener('change',function(e){
  var cb=e.target.closest('input[data-t]');if(!cb)return;
  var s=estado(),t=cb.getAttribute('data-t');
  if(cb.checked)s.tareas[t]=ahora();else delete s.tareas[t];
  s.fase=actual;s.visto=ahora();
  PA.guardar(ID,s);
  pintarAvance();pintarEstadoFase();
});

/* Fase según el #: si no hay, la que dejaste abierta o la primera sin terminar */
function desdeHash(enfocar){
  var h=location.hash.slice(1),k=faseDe(h);
  if(k<0){
    var s=estado();
    k=faseDe(s.fase);
    if(k<0){k=0;for(var i=0;i<FASES.length;i++)if(!faseCompleta(FASES[i],s)){k=i;break}}
    enfocar=false;
  }
  actual=FASES[k].id;
  var s2=estado();if(s2.fase!==actual&&h){s2.fase=actual;PA.guardar(ID,s2)}
  pintarAvance();pintarFase(enfocar);
}
window.addEventListener('hashchange',function(){desdeHash(true)});
/* Si otra pestaña cambia el avance, se refleja aquí */
window.addEventListener('storage',function(e){if(e.key==='aprende-tecnologia:proyectos'){pintarAvance();pintarFase(false)}});
desdeHash(false);
})();
