/* OneLearn: piezas académicas de un documento (fase de tesis, hito T3).
   - figura: imagen comprimida en el dispositivo (WebP, máximo 1600 px) con número, título, texto alternativo y nota de origen.
   - tablaNumerada: una tabla con «Tabla N», título y nota, como pide APA.
   - ecuacion (bloque numerado) y formula (dentro del texto), escritas en LaTeX y dibujadas con KaTeX,
     que se carga solo cuando hay alguna (assets/vendor/katex).
   - notaPie: nota al pie numerada; al leer, las notas van al final con enlaces de ida y vuelta.
   - indicePiezas: índice de figuras o de tablas, al día.
   - refCruzada: «Figura 3», «Tabla 2», «Ecuación (4)» o el título de una sección; el número se actualiza solo.
   Figuras, tablas y ecuaciones llevan attrs.clave, única en todo el documento (la cuida el plugin de ids de
   editor.js): es el destino de las referencias cruzadas y el ancla al leer.
   Agrega los nodos al editor (AT.editorExtensiones, AT.editorInsertar), su dibujo a bloques.js
   (AT.bloques.registrar) y su Markdown (AT.piezas.md). Se carga en documento.html después de editor.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
var CLASES={figura:'figura',tablaNumerada:'tabla',ecuacion:'ecuacion'};
var NOMBRES={figura:'Figura',tabla:'Tabla',ecuacion:'Ecuación'};
var CLAVE_OK=/^[A-Za-z][\w-]{0,63}$/;

function academico(doc){var t=AT.tiposDoc&&doc&&AT.tiposDoc[doc.tipo];return !!(t&&t.academico)}
function academicoActual(){return academico(AT.docActual)}

/* ---------- Numeración: sirve para el JSON y para el documento del editor ---------- */
function numerar(raiz){
  var r={lista:[],por:{},secciones:[],notas:[]},c={figura:0,tabla:0,ecuacion:0};
  function ver(tipo,a,texto,pos){
    var cl=CLASES[tipo];
    if(cl){
      var x={clave:a.clave||'',clase:cl,n:++c[cl],titulo:cl==='ecuacion'?String(a.latex||'').trim():String(a.titulo||'').trim(),nota:String(a.nota||'').trim(),pos:pos};
      r.lista.push(x);
      if(x.clave&&!r.por[x.clave])r.por[x.clave]=x;
    }else if(tipo==='heading'&&a.id){
      var s={clave:a.id,clase:'seccion',titulo:texto().trim(),nivel:a.level,pos:pos};
      r.secciones.push(s);r.por[a.id]=s;
    }else if(tipo==='notaPie')r.notas.push({texto:String(a.texto||''),pos:pos});
  }
  if(raiz&&typeof raiz.descendants==='function')raiz.descendants(function(n,pos){ver(n.type.name,n.attrs||{},function(){return n.textContent},pos)});
  else (function rec(n){
    if(!n||typeof n!=='object')return;
    if(n.type&&n.type!=='doc')ver(n.type,n.attrs||{},function(){return AT.bloques.textoDe(n)});
    (Array.isArray(n.content)?n.content:[]).forEach(rec);
  })(raiz);
  return r;
}
function etiqueta(x){
  if(!x)return '(referencia rota)';
  if(x.clase==='seccion')return '«'+(x.titulo||'Sección sin título')+'»';
  if(x.clase==='ecuacion')return 'Ecuación ('+x.n+')';
  return NOMBRES[x.clase]+' '+x.n;
}
/* Numeración de un documento en JSON, guardada mientras no cambie */
var cacheJSON={raiz:null,r:null};
function deJSON(contenido){
  if(cacheJSON.raiz!==contenido||!cacheJSON.r)cacheJSON={raiz:contenido,r:numerar(contenido)};
  return cacheJSON.r;
}
function piezasDe(ctx){return ctx.piezas||(ctx.piezas=numerar(ctx.doc&&ctx.doc.contenido))}

/* ---------- KaTeX, solo cuando hace falta ---------- */
var katexProm=null;
function katex(){
  if(window.katex)return Promise.resolve(window.katex);
  if(katexProm)return katexProm;
  var base=((AT.rutas&&AT.rutas.raiz)||'')+'assets/vendor/katex/';
  katexProm=new Promise(function(ok,mal){
    var l=document.createElement('link');l.rel='stylesheet';l.href=base+'katex.min.css';document.head.appendChild(l);
    var s=document.createElement('script');s.src=base+'katex.min.js';
    s.onload=function(){if(window.katex)ok(window.katex);else mal(new Error('KaTeX'))};
    s.onerror=function(){katexProm=null;s.remove();mal(new Error('No se pudo cargar KaTeX'))};
    document.head.appendChild(s);
  });
  return katexProm;
}
/* Dibuja LaTeX en el elemento; si tiene un error, deja el código a la vista (con su motivo en title) */
function pintarFormula(e,latex,bloque){
  latex=String(latex||'').trim();
  e.classList.remove('err');e.removeAttribute('title');
  if(!latex){e.textContent=bloque?'Ecuación vacía: escribe en LaTeX':'fórmula';e.classList.add('vacia');return Promise.resolve(false)}
  e.classList.remove('vacia');
  if(!window.katex)e.textContent=latex;
  return katex().then(function(k){
    try{k.render(latex,e,{displayMode:!!bloque,throwOnError:true,strict:'ignore',trust:false,maxSize:20,maxExpand:500,output:'htmlAndMathml'});return true}
    catch(x){e.textContent=latex;e.classList.add('err');e.title=String(x&&x.message||'Error').replace(/^KaTeX parse error: /,'');return false}
  },function(){e.textContent=latex;return false});
}

/* ---------- Imágenes: se comprimen en el dispositivo antes de guardarse ---------- */
var MAX_LADO=1600,MAX_BYTES=30*1024*1024;
function comprimir(file){
  return new Promise(function(ok,mal){
    if(!file||!/^image\//.test(file.type||'')){mal(new Error('Ese archivo no es una imagen.'));return}
    if(file.size>MAX_BYTES){mal(new Error('La imagen pesa más de 30 MB.'));return}
    var url=URL.createObjectURL(file),img=new Image();
    img.onload=function(){
      var w=img.naturalWidth||800,h=img.naturalHeight||600,f=Math.min(1,MAX_LADO/Math.max(w,h));
      var cw=Math.max(1,Math.round(w*f)),ch=Math.max(1,Math.round(h*f));
      var cv=document.createElement('canvas');cv.width=cw;cv.height=ch;
      cv.getContext('2d').drawImage(img,0,0,cw,ch);
      URL.revokeObjectURL(url);
      function fin(b){
        /* Si el original ya pesa menos y no hubo que achicarlo, se queda tal cual */
        var usar=f===1&&/^image\/(png|jpeg|webp)$/.test(file.type)&&file.size<=b.size?file:b;
        var r=new FileReader();
        r.onload=function(){ok({src:r.result,ancho:cw,alto:ch,bytes:usar.size,original:file.size})};
        r.onerror=function(){mal(new Error('No se pudo leer la imagen.'))};
        r.readAsDataURL(usar);
      }
      cv.toBlob(function(b){
        if(b&&b.type==='image/webp'){fin(b);return}
        /* Sin WebP: JPEG sobre fondo blanco (JPEG no tiene transparencia) */
        var c2=document.createElement('canvas');c2.width=cw;c2.height=ch;
        var x=c2.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cw,ch);x.drawImage(cv,0,0);
        c2.toBlob(function(b2){if(b2)fin(b2);else mal(new Error('No se pudo procesar la imagen.'))},'image/jpeg',0.85);
      },'image/webp',0.82);
    };
    img.onerror=function(){URL.revokeObjectURL(url);mal(new Error('No se pudo abrir la imagen. Prueba con PNG, JPG o WebP.'))};
    img.src=url;
  });
}
/* Solo imágenes guardadas dentro del documento (nada de direcciones externas ni SVG) */
function srcSeguro(s){s=String(s||'');return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)?s:''}
function kb(bytes){return AT.fmt(Math.max(1,Math.round(bytes/1024)))+' KB'}

/* ---------- Dibujo al leer (bloques.js) ---------- */
function ancla(h,clave){return CLAVE_OK.test(clave||'')?h.el('span','ancla',{id:clave}):null}
function leyenda(h,cl,info,titulo,conNumero){
  var cap=h.el('figcaption','fig-cap');
  if(conNumero){var b=h.el('b','fig-n');b.textContent=NOMBRES[cl]+' '+(info?info.n:'');cap.appendChild(b)}
  if(titulo){var t=h.el('span','fig-t');t.textContent=titulo;cap.appendChild(t)}
  return cap;
}
function notaDe(h,nota){
  var p=h.el('p','fig-nota'),i=h.el('i');i.textContent='Nota.';
  p.appendChild(i);p.appendChild(document.createTextNode(' '+nota));
  return p;
}
if(AT.bloques&&AT.bloques.registrar){
  AT.bloques.registrar('figura',{
    dibujar:function(n,c,h){
      var a=h.attrs(n),info=piezasDe(c).por[a.clave],aca=academico(c.doc),fig=h.el('figure','fig');
      var an=ancla(h,a.clave);if(an)fig.appendChild(an);
      if(aca||a.titulo)fig.appendChild(leyenda(h,'figura',info,a.titulo,aca));
      var src=srcSeguro(a.src);
      if(src)fig.appendChild(h.el('img',null,{src:src,alt:a.alt||a.titulo||'',loading:'lazy',decoding:'async'}));
      else{var v=h.el('p','hint');v.textContent='(Figura sin imagen)';fig.appendChild(v)}
      if(a.nota)fig.appendChild(notaDe(h,a.nota));
      return fig;
    },
    texto:function(n){var a=n.attrs||{};return [a.titulo,a.nota].filter(Boolean).join('\n')+'\n'}
  });
  AT.bloques.registrar('tablaNumerada',{
    dibujar:function(n,c,h){
      var a=h.attrs(n),info=piezasDe(c).por[a.clave],fig=h.el('figure','fig tabla-num');
      var an=ancla(h,a.clave);if(an)fig.appendChild(an);
      fig.appendChild(leyenda(h,'tabla',info,a.titulo,true));
      h.bloques(h.hijos(n),fig,c);
      if(a.nota)fig.appendChild(notaDe(h,a.nota));
      return fig;
    },
    texto:function(n,tp){var a=n.attrs||{};return [a.titulo].concat((n.content||[]).map(tp),[a.nota]).filter(Boolean).join('\n')+'\n'}
  });
  AT.bloques.registrar('ecuacion',{
    dibujar:function(n,c,h){
      var a=h.attrs(n),info=piezasDe(c).por[a.clave],d=h.el('div','ecu');
      var an=ancla(h,a.clave);if(an)d.appendChild(an);
      var f=h.el('div','ecu-f');pintarFormula(f,a.latex,true);
      var num=h.el('span','ecu-n');num.textContent='('+(info?info.n:'')+')';
      d.appendChild(f);d.appendChild(num);
      return d;
    },
    texto:function(n){return String((n.attrs||{}).latex||'')+'\n'}
  });
  AT.bloques.registrar('formula',{
    dibujar:function(n,c,h){var s=h.el('span','formula');pintarFormula(s,h.attrs(n).latex,false);return s},
    texto:function(n){return String((n.attrs||{}).latex||'')}
  });
  AT.bloques.registrar('notaPie',{
    dibujar:function(n,c,h){
      var l=c.notasPie||(c.notasPie=[]),k=l.length+1;
      l.push(String(h.attrs(n).texto||''));
      if(k===1)c.alFinal.push(function(frag){
        var s=h.el('section','notas-pie',{'aria-labelledby':'notasPieT'}),t=h.el('h2',null,{id:'notasPieT'}),ol=h.el('ol');
        t.textContent='Notas';s.appendChild(t);
        l.forEach(function(x,i){
          var li=h.el('li',null,{id:'nota-'+(i+1)}),sp=h.el('span');sp.textContent=x;li.appendChild(sp);
          var v=h.el('a','nota-vuelta',{href:'#nota-ref-'+(i+1),'aria-label':'Volver a la nota '+(i+1)+' en el texto',title:'Volver al texto'});
          v.appendChild(h.icono('up'));li.appendChild(document.createTextNode(' '));li.appendChild(v);
          ol.appendChild(li);
        });
        s.appendChild(ol);frag.appendChild(s);
      });
      var sup=h.el('sup','nota-ref'),a=h.el('a',null,{href:'#nota-'+k,id:'nota-ref-'+k,'aria-label':'Nota '+k});
      a.textContent=String(k);sup.appendChild(a);
      return sup;
    },
    texto:function(){return ''}
  });
  AT.bloques.registrar('refCruzada',{
    dibujar:function(n,c,h){
      var d=h.attrs(n).destino,x=CLAVE_OK.test(d||'')&&piezasDe(c).por[d];
      if(!x){var s=h.el('span','xref rota');s.textContent='(referencia rota)';return s}
      var a=h.el('a','xref',{href:'#'+d});a.textContent=etiqueta(x);
      return a;
    },
    texto:function(n){var d=AT.docActual;return d?etiqueta(deJSON(d.contenido).por[(n.attrs||{}).destino]):''}
  });
  AT.bloques.registrar('indicePiezas',{
    dibujar:function(n,c,h){
      var cl=h.attrs(n).clase==='tabla'?'tabla':'figura',l=piezasDe(c).lista.filter(function(x){return x.clase===cl});
      if(!l.length)return null;
      var d=h.el('div','indice-piezas'),t=h.el('h2');
      t.textContent=cl==='tabla'?'Índice de tablas':'Índice de figuras';d.appendChild(t);
      var ul=h.el('ul','toc',{'aria-label':t.textContent});
      l.forEach(function(x){
        var li=h.el('li'),b=h.el('button','link',{type:'button','data-go':CLAVE_OK.test(x.clave)?x.clave:null});
        b.textContent=etiqueta(x)+(x.titulo?'. '+x.titulo:'');li.appendChild(b);ul.appendChild(li);
      });
      d.appendChild(ul);
      return d;
    },
    texto:function(){return ''}
  });
}

/* ---------- Markdown (documento.js) ---------- */
var md={
  figura:function(n,m){
    var a=n.attrs||{},x=m.piezas.por[a.clave],aca=academico(m.doc),out=[];
    if(aca)out.push('**Figura '+(x?x.n:'')+'**');
    if(a.titulo)out.push('*'+a.titulo+'*');
    var src=srcSeguro(a.src);if(src)out.push('!['+(a.alt||a.titulo||'').replace(/[\[\]]/g,'')+']('+src+')');
    if(a.nota)out.push('*Nota.* '+a.nota);
    return out.join('\n\n');
  },
  tablaNumerada:function(n,m){
    var a=n.attrs||{},x=m.piezas.por[a.clave];
    return ['**Tabla '+(x?x.n:'')+'**',a.titulo?'*'+a.titulo+'*':'',m.bloques(n.content),a.nota?'*Nota.* '+a.nota:''].filter(Boolean).join('\n\n');
  },
  ecuacion:function(n,m){var a=n.attrs||{},x=m.piezas.por[a.clave];return '$$\n'+String(a.latex||'').trim()+(x?' \\tag{'+x.n+'}':'')+'\n$$'},
  indicePiezas:function(n,m){
    var cl=(n.attrs||{}).clase==='tabla'?'tabla':'figura',l=m.piezas.lista.filter(function(x){return x.clase===cl});
    if(!l.length)return '';
    return '## '+(cl==='tabla'?'Índice de tablas':'Índice de figuras')+'\n\n'+l.map(function(x){return '- '+etiqueta(x)+(x.titulo?'. '+x.titulo:'')}).join('\n');
  },
  /* En línea */
  formula:function(n){return '$'+String((n.attrs||{}).latex||'').trim()+'$'},
  refCruzada:function(n,m){return etiqueta(m.piezas.por[(n.attrs||{}).destino])},
  notaPie:function(n,m){m.notas.push(String((n.attrs||{}).texto||''));return '[^'+m.notas.length+']'}
};

/* Para la constancia de autoría: figuras y tablas con su nota de origen */
function inventario(doc){
  var r=numerar(doc&&doc.contenido);
  return r.lista.filter(function(x){return x.clase!=='ecuacion'});
}
/* Las imágenes también entran en la huella de la constancia */
function imagenes(doc){
  var out=[];
  (function rec(n){if(!n||typeof n!=='object')return;if(n.type==='figura'&&n.attrs&&n.attrs.src)out.push(String(n.attrs.src));(n.content||[]).forEach(rec)})(doc&&doc.contenido);
  return out;
}

AT.piezas={numerar:numerar,etiqueta:etiqueta,katex:katex,pintarFormula:pintarFormula,comprimir:comprimir,srcSeguro:srcSeguro,
  md:md,inventario:inventario,imagenes:imagenes,academico:academico};

/* =====================================================================================
   Editor: nodos de Tiptap. Solo si el editor está cargado (documento.html).
   ===================================================================================== */
var T=window.Tiptap;
if(!T||!AT.editor)return;
var pm=T.pm,svg=AT.editor.svg;
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function attr(nombre,def){
  return {default:def,
    parseHTML:function(e){var v=e.getAttribute('data-'+nombre);return v==null?def:v},
    renderHTML:function(a){var x={};if(a[nombre]!=null&&a[nombre]!=='')x['data-'+nombre]=a[nombre];return x}};
}
function posDe(p){return typeof p.getPos==='function'?p.getPos():null}
function poner(p,k,v){
  var pos=posDe(p);if(pos==null)return;
  var n=p.editor.state.doc.nodeAt(pos);if(!n||n.attrs[k]===v)return;
  p.editor.view.dispatch(p.editor.state.tr.setNodeAttribute(pos,k,v));
}
/* Numeración del documento del editor (se recalcula solo cuando cambia el documento) */
var cacheEd={doc:null,r:null};
function numeros(editor){
  var d=editor.state.doc;
  if(cacheEd.doc!==d)cacheEd={doc:d,r:numerar(d)};
  return cacheEd.r;
}
function infoEn(p){
  var pos=posDe(p);if(pos==null)return null;
  return numeros(p.editor).lista.filter(function(x){return x.pos===pos})[0]||null;
}
var vistas=new Set();
/* Deja el cursor justo después de una pieza: en el párrafo vacío que sigue o en uno nuevo */
function salirDespues(p){
  var pos=posDe(p),ed=p.editor;if(pos==null)return;
  var n=ed.state.doc.nodeAt(pos);if(!n)return;
  var fin=pos+n.nodeSize,sig=ed.state.doc.nodeAt(fin),tr=ed.state.tr;
  if(!(sig&&sig.type.name==='paragraph'&&!sig.content.size))tr.insert(fin,ed.schema.nodes.paragraph.create());
  /* El foco se mueve ya (no en el siguiente cuadro): así no se pierde lo que se teclea justo después */
  ed.view.dispatch(tr.setSelection(pm.TextSelection.create(tr.doc,fin+1)).scrollIntoView());
  ed.view.focus();
}
/* En los campos de una pieza: Enter pasa al siguiente y, en el último, sale; Esc sale */
function teclasCampos(dom,p){
  dom.addEventListener('keydown',function(e){
    var t=e.target;if(!t.matches||!t.matches('input[data-c]'))return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();salirDespues(p);return}
    if(e.key!=='Enter')return;
    e.preventDefault();
    var l=$$('input[data-c]',dom),i=l.indexOf(t);
    if(i>=0&&i<l.length-1)l[i+1].focus();else salirDespues(p);
  });
}
/* Al insertar una pieza nueva, su vista abre el campo correspondiente */
var abrirNueva=null;

/* Formulario pequeño junto al texto (fórmula, nota al pie) */
function formulario(editor,ancla,o){
  AT.menu.cerrar();
  var f=el('form','menu menu-enlace pz-form');
  f.setAttribute('role','dialog');f.setAttribute('aria-label',o.titulo);
  var uid='pz'+AT.bloques.nuevoId().slice(2);
  f.innerHTML='<label for="'+uid+'">'+esc(o.titulo)+'</label>'+
    (o.lineas?'<textarea id="'+uid+'" rows="'+o.lineas+'" spellcheck="'+(o.latex?'false':'true')+'"'+(o.latex?' autocapitalize="off" autocomplete="off"':'')+' placeholder="'+esc(o.pista||'')+'"></textarea>':
      '<input id="'+uid+'" type="text" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="'+esc(o.pista||'')+'">')+
    (o.vista?'<div class="pz-vista" aria-live="polite"></div>':'')+
    (o.ayuda?'<p class="ed-ayuda">'+o.ayuda+'</p>':'')+
    '<div class="menu-bt"><button class="btn pri" type="submit">'+esc(o.boton||'Aplicar')+'</button>'+
    (o.quitar?'<button class="btn" type="button" data-q>'+esc(o.quitar)+'</button>':'')+'<button class="btn" type="button" data-x>Cancelar</button></div>';
  document.body.appendChild(f);
  var r=typeof ancla==='function'?ancla():ancla.getBoundingClientRect();
  f.style.left=Math.max(8,Math.min(r.left,innerWidth-f.offsetWidth-8))+'px';
  var y=r.bottom+6;if(y+f.offsetHeight>innerHeight-8&&r.top-f.offsetHeight-6>8)y=r.top-f.offsetHeight-6;
  f.style.top=Math.max(8,y)+'px';
  var inp=$('#'+uid,f),vista=$('.pz-vista',f),t=null;
  inp.value=o.valor||'';
  function previa(){if(vista)pintarFormula(vista,inp.value,false)}
  if(vista){previa();inp.addEventListener('input',function(){clearTimeout(t);t=setTimeout(previa,150)})}
  inp.focus();if(inp.select)inp.select();
  function cerrar(){f.remove();document.removeEventListener('pointerdown',afuera,true);editor.commands.focus()}
  function afuera(e){if(!f.contains(e.target))cerrar()}
  setTimeout(function(){document.addEventListener('pointerdown',afuera,true)},0);
  f.addEventListener('keydown',function(e){
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cerrar()}
    /* Enter aplica (también en el cuadro de varias líneas); Mayús+Enter hace un salto de línea */
    else if(e.key==='Enter'&&o.lineas&&!e.shiftKey){e.preventDefault();f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true}))}
  });
  f.addEventListener('click',function(e){
    if(e.target.closest('[data-x]'))cerrar();
    else if(e.target.closest('[data-q]')){cerrar();o.alQuitar()}
  });
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var v=inp.value.trim();
    cerrar();
    o.alAplicar(v);
  });
  return f;
}
function rectCursor(editor){
  return function(){
    var c=editor.view.coordsAtPos(editor.state.selection.from);
    return {left:c.left,top:c.top,bottom:c.bottom};
  };
}

/* ---------- Figura ---------- */
var entradaImagen=null;
function elegirArchivo(){
  return new Promise(function(ok){
    if(!entradaImagen){
      entradaImagen=document.createElement('input');
      entradaImagen.type='file';entradaImagen.accept='image/*';entradaImagen.hidden=true;entradaImagen.id='pzImagen';
      document.body.appendChild(entradaImagen);
    }
    entradaImagen.value='';
    entradaImagen.onchange=function(){ok(entradaImagen.files&&entradaImagen.files[0]||null)};
    entradaImagen.click();
  });
}
function insertarImagen(editor,archivo,pos){
  return comprimir(archivo).then(function(r){
    var clave=AT.bloques.nuevoId().replace(/^b-/,'p-');
    abrirNueva=clave;
    var nodo={type:'figura',attrs:{clave:clave,src:r.src,alt:'',titulo:'',nota:''}};
    if(pos!=null)editor.chain().focus().insertContentAt(pos,nodo).run();
    else editor.chain().focus().insertContent(nodo).run();
    if(r.original>r.bytes*1.5)AT.aviso('Imagen agregada: '+kb(r.bytes)+' (era de '+kb(r.original)+').');
  },function(e){AT.aviso(e.message||'No se pudo agregar la imagen.')});
}
function vistaFigura(p){
  var node=p.node,dom=el('div','ed-fig');dom.contentEditable='false';
  var aca=academicoActual();
  dom.innerHTML='<div class="ed-fig-h"><span class="ed-et ed-num">'+(aca?'Figura':'Imagen')+'</span></div>'+
    '<input type="text" class="ed-fig-tit" data-c="titulo" placeholder="'+(aca?'Título de la figura':'Pie de la imagen (opcional)')+'">'+
    '<div class="ed-fig-img"></div>'+
    '<div class="ed-fig-c"><label class="ed-campo"><span>Texto alternativo: qué muestra, para quien no la ve</span><input type="text" data-c="alt"></label>'+
    (aca?'<label class="ed-campo"><span>Nota: de dónde viene (ej. Elaboración propia, o Adaptado de Pérez, 2020)</span><input type="text" data-c="nota"></label>':'')+
    '</div><div class="ed-fig-bt"><button type="button" class="ed-link" data-acc="cambiar">Cambiar imagen</button></div>';
  var imgCaja=$('.ed-fig-img',dom),lab=$('.ed-num',dom);
  function pintarImg(){
    var src=srcSeguro(node.attrs.src);
    imgCaja.innerHTML='';
    if(src){var i=document.createElement('img');i.src=src;i.alt=node.attrs.alt||'';imgCaja.appendChild(i)}
    else imgCaja.innerHTML='<button type="button" class="btn" data-acc="cambiar">'+ico('imagen')+'Elegir imagen</button>';
  }
  function campos(){
    $$('[data-c]',dom).forEach(function(c){
      var v=node.attrs[c.getAttribute('data-c')]||'';
      if(c.value!==v&&document.activeElement!==c)c.value=v;
    });
  }
  function numerarV(){
    var x=infoEn(p);
    lab.textContent=aca?'Figura '+(x?x.n:''):'Imagen';
    var n=aca?'figura '+(x?x.n:''):'imagen';
    $('[data-c="titulo"]',dom).setAttribute('aria-label',aca?'Título de la '+n:'Pie de la imagen');
  }
  dom.addEventListener('input',function(e){var c=e.target.getAttribute('data-c');if(c)poner(p,c,e.target.value)});
  teclasCampos(dom,p);
  dom.addEventListener('click',function(e){
    if(!e.target.closest('[data-acc="cambiar"]'))return;
    elegirArchivo().then(function(f){
      if(!f)return;
      comprimir(f).then(function(r){poner(p,'src',r.src)},function(x){AT.aviso(x.message)});
    });
  });
  var v={dom:dom,numerar:numerarV,
    update:function(n){if(n.type.name!=='figura')return false;var otra=n.attrs.src!==node.attrs.src;node=n;if(otra)pintarImg();else{var i=$('img',imgCaja);if(i)i.alt=n.attrs.alt||''}campos();numerarV();return true},
    stopEvent:function(e){return !!(e.target&&e.target.closest&&e.target.closest('input,textarea,button,label'))},
    ignoreMutation:function(){return true},
    destroy:function(){vistas.delete(v)}};
  vistas.add(v);
  pintarImg();campos();numerarV();
  if(abrirNueva&&abrirNueva===node.attrs.clave){abrirNueva=null;setTimeout(function(){var t=$('[data-c="titulo"]',dom);if(t&&dom.isConnected)t.focus()},0)}
  return v;
}
function atomo(nombre,vista,extra){
  return T.Node.create(Object.assign({
    name:nombre,group:'block',atom:true,selectable:true,draggable:false,
    parseHTML:function(){return [{tag:'div[data-'+nombre+']'}]},
    renderHTML:function(o){var x={};x['data-'+nombre]='';return ['div',T.mergeAttributes(o.HTMLAttributes,x)]},
    addNodeView:function(){return vista}
  },extra||{}));
}
var Figura=atomo('figura',vistaFigura,{
  addAttributes:function(){return {
    clave:attr('clave',''),alt:attr('alt',''),titulo:attr('titulo',''),nota:attr('nota',''),
    src:{default:'',parseHTML:function(e){var i=e.querySelector('img');return srcSeguro(i&&i.getAttribute('src'))},renderHTML:function(){return {}}}
  }},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-figura':''}),['img',{src:srcSeguro(o.node.attrs.src),alt:o.node.attrs.alt||''}]]}
});

/* ---------- Tabla numerada: la tabla de siempre, con número, título y nota ---------- */
var TablaNumerada=T.Node.create({
  name:'tablaNumerada',group:'block',content:'table',defining:true,isolating:true,
  addAttributes:function(){return {clave:attr('clave',''),titulo:attr('titulo',''),nota:attr('nota','')}},
  parseHTML:function(){return [{tag:'div[data-tabla-numerada]'}]},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-tabla-numerada':''}),0]},
  addNodeView:function(){return function(p){
    var node=p.node,dom=el('div','ed-tnum');
    var cab=el('div','ed-tnum-h','<span class="ed-et ed-num">Tabla</span><input type="text" class="ed-fig-tit" data-c="titulo" placeholder="Título de la tabla">');
    var cont=el('div','ed-tnum-c');
    var pie=el('div','ed-tnum-p','<label class="ed-campo"><span>Nota (opcional): aclaraciones o de dónde vienen los datos</span><input type="text" data-c="nota"></label>');
    cab.contentEditable='false';pie.contentEditable='false';
    dom.appendChild(cab);dom.appendChild(cont);dom.appendChild(pie);
    function campos(){$$('[data-c]',dom).forEach(function(c){if(c.closest('.ed-tnum-c'))return;var v=node.attrs[c.getAttribute('data-c')]||'';if(c.value!==v&&document.activeElement!==c)c.value=v})}
    function numerarV(){var x=infoEn(p);$('.ed-num',cab).textContent='Tabla '+(x?x.n:'');$('[data-c="titulo"]',cab).setAttribute('aria-label','Título de la tabla '+(x?x.n:''))}
    function entrada(e){var c=e.target.getAttribute('data-c');if(c&&!cont.contains(e.target))poner(p,c,e.target.value)}
    cab.addEventListener('input',entrada);pie.addEventListener('input',entrada);
    /* Enter en el título lleva a la primera celda; en la nota (o Esc), sale de la tabla */
    dom.addEventListener('keydown',function(e){
      var t=e.target;if(!t.matches||!t.matches('input[data-c]')||cont.contains(t))return;
      if(e.key==='Escape'||(e.key==='Enter'&&t.getAttribute('data-c')==='nota')){e.preventDefault();e.stopPropagation();salirDespues(p);return}
      if(e.key==='Enter'){
        e.preventDefault();var pos=posDe(p),ed=p.editor;if(pos==null)return;
        ed.view.dispatch(ed.state.tr.setSelection(pm.Selection.near(ed.state.doc.resolve(pos+2))));ed.view.focus();
      }
    });
    var v={dom:dom,contentDOM:cont,numerar:numerarV,
      update:function(n){if(n.type.name!=='tablaNumerada')return false;node=n;campos();numerarV();return true},
      stopEvent:function(e){return !!(e.target&&!cont.contains(e.target)&&e.target.closest&&e.target.closest('input,label'))},
      ignoreMutation:function(m){return !cont.contains(m.target)},
      destroy:function(){vistas.delete(v)}};
    vistas.add(v);campos();numerarV();
    if(abrirNueva&&abrirNueva===node.attrs.clave){abrirNueva=null;setTimeout(function(){var t=$('[data-c="titulo"]',cab);if(t&&dom.isConnected)t.focus()},0)}
    return v;
  }}
});
function tablaVacia(){
  function celda(t){return {type:t,content:[{type:'paragraph'}]}}
  function fila(t){return {type:'tableRow',content:[celda(t),celda(t),celda(t)]}}
  return {type:'table',content:[fila('tableHeader'),fila('tableCell'),fila('tableCell')]};
}
/* Opciones del menú «Tabla» de la barra: numerar una tabla o quitarle el número */
AT.editorMenuTabla=function(editor,items){
  var $f=editor.state.selection.$from,tablaPos=null,env=null;
  for(var i=$f.depth;i>0;i--){
    if($f.node(i).type.name==='table'){
      tablaPos=$f.before(i);
      if(i>1&&$f.node(i-1).type.name==='tablaNumerada')env={pos:$f.before(i-1),node:$f.node(i-1)};
      break;
    }
  }
  if(tablaPos==null)return items;
  if(env){
    items=items.map(function(it){
      return it.t==='Quitar tabla'?Object.assign({},it,{f:function(){editor.chain().focus().deleteRange({from:env.pos,to:env.pos+env.node.nodeSize}).run()}}):it;
    });
    items.push({sep:true},{t:'Quitar número y título',i:'close',f:function(){
      var n=editor.state.doc.nodeAt(env.pos);if(!n)return;
      editor.view.dispatch(editor.state.tr.replaceWith(env.pos,env.pos+n.nodeSize,n.firstChild));editor.view.focus();
    }});
  }else if(academicoActual()){
    items.push({sep:true},{t:'Numerar como «Tabla N», con título',i:'tabla',f:function(){
      var t=editor.state.doc.nodeAt(tablaPos);if(!t)return;
      var clave=AT.bloques.nuevoId().replace(/^b-/,'p-');abrirNueva=clave;
      editor.view.dispatch(editor.state.tr.replaceWith(tablaPos,tablaPos+t.nodeSize,editor.schema.nodes.tablaNumerada.create({clave:clave},t)));
    }});
  }
  return items;
};

/* ---------- Ecuación numerada ---------- */
function vistaEcuacion(p){
  var node=p.node,dom=el('div','ed-ecu');dom.contentEditable='false';
  var uid='ecu'+AT.bloques.nuevoId().slice(2);
  dom.innerHTML='<button type="button" class="ed-ecu-v" data-acc="editar"><span class="ecu-f"></span><span class="ecu-n"></span></button>'+
    '<div class="ed-ecu-e" hidden><label class="ed-campo" for="'+uid+'"><span>Ecuación en LaTeX</span></label>'+
    '<textarea id="'+uid+'" rows="2" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"></textarea>'+
    '<p class="ed-ayuda">Ejemplos: <code>E = mc^2</code>, <code>\\frac{a}{b}</code>, <code>\\sum_{i=1}^{n} x_i</code>. Enter para terminar. <button type="button" class="ed-link" data-acc="listo">Listo</button></p></div>';
  var f=$('.ecu-f',dom),num=$('.ecu-n',dom),caja=$('.ed-ecu-e',dom),ta=$('textarea',dom),btn=$('.ed-ecu-v',dom),t=null;
  function pintar(){pintarFormula(f,node.attrs.latex,true)}
  function numerarV(){var x=infoEn(p);num.textContent='('+(x?x.n:'')+')';btn.setAttribute('aria-label','Ecuación ('+(x?x.n:'')+'): '+(node.attrs.latex||'vacía')+'. Editar')}
  function abrir(){caja.hidden=false;dom.classList.add('editando');ta.value=node.attrs.latex||'';ta.focus()}
  function cerrar(){
    caja.hidden=true;dom.classList.remove('editando');
    salirDespues(p);
  }
  dom.addEventListener('click',function(e){
    var b=e.target.closest('[data-acc]');if(!b)return;
    if(b.getAttribute('data-acc')==='editar'){if(caja.hidden)abrir();else ta.focus()}
    else cerrar();
  });
  ta.addEventListener('input',function(){clearTimeout(t);var v=ta.value;t=setTimeout(function(){poner(p,'latex',v)},120)});
  ta.addEventListener('keydown',function(e){
    if(e.key==='Escape'||(e.key==='Enter'&&!e.shiftKey)){e.preventDefault();e.stopPropagation();clearTimeout(t);poner(p,'latex',ta.value);cerrar()}
  });
  var v={dom:dom,numerar:numerarV,abrir:abrir,
    update:function(n){if(n.type.name!=='ecuacion')return false;var otra=n.attrs.latex!==node.attrs.latex;node=n;if(otra)pintar();numerarV();return true},
    stopEvent:function(e){return !!(e.target&&e.target.closest&&e.target.closest('textarea,button,label'))},
    ignoreMutation:function(){return true},
    destroy:function(){clearTimeout(t);vistas.delete(v)}};
  vistas.add(v);pintar();numerarV();
  if(abrirNueva&&abrirNueva===node.attrs.clave){abrirNueva=null;setTimeout(function(){if(dom.isConnected)abrir()},0)}
  return v;
}
var Ecuacion=atomo('ecuacion',vistaEcuacion,{
  addAttributes:function(){return {clave:attr('clave',''),latex:attr('latex','')}}
});
function nuevaEcuacion(c,latex){
  var clave=AT.bloques.nuevoId().replace(/^b-/,'p-');abrirNueva=latex?null:clave;
  return c.insertContent({type:'ecuacion',attrs:{clave:clave,latex:latex||''}});
}

/* ---------- Fórmula dentro del texto ---------- */
function pedirFormula(editor,valor,ancla,alAplicar,alQuitar){
  formulario(editor,ancla,{titulo:'Fórmula en LaTeX',valor:valor,latex:true,vista:true,pista:'x^2 + y^2 = r^2',
    ayuda:'También puedes escribirla entre signos de dólar: <code>$x^2$</code>.',quitar:alQuitar?'Quitar fórmula':'',alAplicar:alAplicar,alQuitar:alQuitar});
}
var Formula=T.Node.create({
  name:'formula',group:'inline',inline:true,atom:true,selectable:true,
  addAttributes:function(){return {latex:attr('latex','')}},
  parseHTML:function(){return [{tag:'span[data-formula]'}]},
  renderHTML:function(o){return ['span',T.mergeAttributes(o.HTMLAttributes,{'data-formula':'',class:'formula'}),o.node.attrs.latex||'']},
  renderText:function(o){return '$'+(o.node.attrs.latex||'')+'$'},
  addNodeView:function(){return function(p){
    var node=p.node,dom=el('span','formula ed-formula');dom.contentEditable='false';
    pintarFormula(dom,node.attrs.latex,false);
    return {dom:dom,update:function(n){if(n.type.name!=='formula')return false;if(n.attrs.latex!==node.attrs.latex){node=n;pintarFormula(dom,n.attrs.latex,false)}node=n;return true},ignoreMutation:function(){return true}};
  }},
  addInputRules:function(){
    var tipo=this.type;
    /* $x^2$ al escribir: sin espacios junto a los signos (así «$5 y $10» no se convierte) */
    return [new T.InputRule({find:/(?:^|[\s(])\$([^$\s](?:[^$]*[^$\s\\])?)\$$/,handler:function(o){
      var m=o.match,ini=o.range.from+m[0].indexOf('$');
      o.state.tr.replaceWith(ini,o.range.to,tipo.create({latex:m[1]}));
    }})];
  }
});

/* ---------- Nota al pie ---------- */
function pedirNota(editor,valor,ancla,alAplicar,alQuitar){
  formulario(editor,ancla,{titulo:'Nota al pie',valor:valor,lineas:3,pista:'Una aclaración o un dato que no va en el texto',boton:alQuitar?'Aplicar':'Agregar nota',
    quitar:alQuitar?'Quitar nota':'',alAplicar:alAplicar,alQuitar:alQuitar});
}
function nuevaNota(editor){
  var pos=editor.state.selection.to;
  pedirNota(editor,'',rectCursor(editor),function(v){
    if(!v)return;
    editor.chain().focus().insertContentAt(Math.min(pos,editor.state.doc.content.size),{type:'notaPie',attrs:{texto:v}}).run();
  });
}
var NotaPie=T.Node.create({
  name:'notaPie',group:'inline',inline:true,atom:true,selectable:true,
  addAttributes:function(){return {texto:attr('texto','')}},
  parseHTML:function(){return [{tag:'sup[data-nota-pie]'}]},
  renderHTML:function(o){return ['sup',T.mergeAttributes(o.HTMLAttributes,{'data-nota-pie':'',class:'nota-ref'}),'*']},
  renderText:function(){return ''},
  addNodeView:function(){return function(p){
    var node=p.node,dom=el('sup','nota-ref ed-nota');dom.contentEditable='false';
    function numerarV(){
      var pos=posDe(p),l=numeros(p.editor).notas,k=0;
      l.forEach(function(x,i){if(x.pos===pos)k=i+1});
      dom.textContent=String(k||'*');
      dom.title='Nota '+(k||'')+': '+node.attrs.texto;
      dom.setAttribute('aria-label','Nota al pie '+(k||'')+': '+node.attrs.texto);
    }
    var v={dom:dom,numerar:numerarV,update:function(n){if(n.type.name!=='notaPie')return false;node=n;numerarV();return true},
      ignoreMutation:function(){return true},destroy:function(){vistas.delete(v)}};
    vistas.add(v);numerarV();
    return v;
  }}
});

/* ---------- Referencia cruzada ---------- */
function destinos(editor){
  var r=numeros(editor),aca=academicoActual();
  return r.lista.filter(function(x){return x.clave}).map(function(x){
    return {t:etiqueta(x)+(x.titulo&&x.clase!=='ecuacion'?'. '+x.titulo:''),d:x.clase==='ecuacion'?x.titulo:'',i:x.clase==='figura'?'imagen':x.clase==='tabla'?'tabla':'ecuacion',clave:x.clave};
  }).concat(r.secciones.filter(function(s){return s.titulo}).map(function(s){
    return {t:s.titulo,d:s.nivel===3?'Subtítulo':'Sección',i:s.nivel===3?'subtitulo':'titulo',clave:s.clave};
  }));
}
function elegirDestino(editor,ancla,alElegir){
  var l=destinos(editor);
  if(!l.length)l=[{t:'Todavía no hay a qué referirse',d:'Agrega figuras, tablas, ecuaciones o títulos de sección',i:'enlace',desactivado:true}];
  AT.menu.abrir(ancla,l,{etiqueta:'Referencia cruzada a…',devolver:editor.view.dom,alElegir:function(it){alElegir(it.clave)}});
}
function irA(editor,clave){
  var hecho=false;
  editor.state.doc.descendants(function(n,pos){
    if(hecho)return false;
    if((n.attrs&&n.attrs.clave===clave)||(n.type.name==='heading'&&n.attrs.id===clave)){
      hecho=true;
      var sel=n.isAtom||n.type.name==='tablaNumerada'?pm.NodeSelection.create(editor.state.doc,pos):pm.TextSelection.create(editor.state.doc,pos+1);
      editor.view.dispatch(editor.state.tr.setSelection(sel).scrollIntoView());
      editor.view.focus();
      var d=editor.view.nodeDOM(pos);if(d&&d.scrollIntoView)d.scrollIntoView({block:'center'});
      return false;
    }
  });
}
var RefCruzada=T.Node.create({
  name:'refCruzada',group:'inline',inline:true,atom:true,selectable:true,
  addAttributes:function(){return {destino:attr('destino','')}},
  parseHTML:function(){return [{tag:'span[data-ref-cruzada]'}]},
  renderHTML:function(o){return ['span',T.mergeAttributes(o.HTMLAttributes,{'data-ref-cruzada':'',class:'xref'}),'ref.']},
  renderText:function(o){var d=AT.docActual;return d?etiqueta(deJSON(d.contenido).por[o.node.attrs.destino]):''},
  addNodeView:function(){return function(p){
    var node=p.node,dom=el('span','xref');dom.contentEditable='false';
    function numerarV(){
      var x=numeros(p.editor).por[node.attrs.destino];
      dom.textContent=etiqueta(x);dom.classList.toggle('rota',!x);
      dom.title=x?'Referencia cruzada: se actualiza sola':'Lo que citabas ya no está en el documento';
    }
    var v={dom:dom,numerar:numerarV,update:function(n){if(n.type.name!=='refCruzada')return false;node=n;numerarV();return true},
      ignoreMutation:function(){return true},destroy:function(){vistas.delete(v)}};
    vistas.add(v);numerarV();
    return v;
  }}
});

/* ---------- Índice de figuras o de tablas ---------- */
var IndicePiezas=atomo('indicePiezas',function(p){
  var node=p.node,dom=el('div','ed-indice');dom.contentEditable='false';
  function pintar(){
    var cl=node.attrs.clase==='tabla'?'tabla':'figura',l=numeros(p.editor).lista.filter(function(x){return x.clase===cl});
    dom.innerHTML='<span class="ed-et">'+(cl==='tabla'?'Índice de tablas':'Índice de figuras')+'</span>'+(l.length?'<ul class="toc">'+l.map(function(x){
      return '<li><span class="link">'+esc(etiqueta(x)+(x.titulo?'. '+x.titulo:''))+'</span></li>';
    }).join('')+'</ul>':'<p class="hint">Aquí aparecerán tus '+(cl==='tabla'?'tablas numeradas':'figuras')+'. Si no hay, al leer no se muestra.</p>');
  }
  var v={dom:dom,numerar:pintar,update:function(n){if(n.type.name!=='indicePiezas')return false;node=n;pintar();return true},
    ignoreMutation:function(){return true},destroy:function(){vistas.delete(v)}};
  vistas.add(v);pintar();
  return v;
},{addAttributes:function(){return {clase:attr('clase','figura')}}});

/* ---------- Extensión: repintar números, notas al pie, pegar imágenes, clics y atajos ---------- */
var notasEd=null;
function pintarNotas(editor){
  if(!notasEd||!notasEd.isConnected){
    var env=editor.view.dom.parentNode;if(!env)return;
    notasEd=el('div','ed-notas');notasEd.setAttribute('aria-label','Notas al pie');notasEd.setAttribute('role','region');
    env.appendChild(notasEd);
    notasEd.addEventListener('click',function(e){
      var b=e.target.closest('[data-pos]');if(!b)return;
      var pos=+b.getAttribute('data-pos'),n=editor.state.doc.nodeAt(pos);
      if(!n||n.type.name!=='notaPie')return;
      editor.view.dispatch(editor.state.tr.setSelection(pm.NodeSelection.create(editor.state.doc,pos)).scrollIntoView());
      menuNota(editor,pos,editor.view.nodeDOM(pos)||b);
    });
  }
  var l=numeros(editor).notas;
  notasEd.hidden=!l.length;
  notasEd.innerHTML=l.length?'<span class="ed-et">Notas al pie</span><ol>'+l.map(function(x){
    return '<li><button type="button" class="ed-nota-i" data-pos="'+x.pos+'">'+esc(x.texto)+'</button></li>';
  }).join('')+'</ol>':'';
}
function menuNota(editor,pos,ancla){
  var n=editor.state.doc.nodeAt(pos);if(!n)return;
  pedirNota(editor,n.attrs.texto,ancla,function(v){
    var m=editor.state.doc.nodeAt(pos);if(!m||m.type.name!=='notaPie')return;
    if(!v)editor.chain().focus().deleteRange({from:pos,to:pos+m.nodeSize}).run();
    else editor.view.dispatch(editor.state.tr.setNodeAttribute(pos,'texto',v));
  },function(){
    var m=editor.state.doc.nodeAt(pos);if(m&&m.type.name==='notaPie')editor.chain().focus().deleteRange({from:pos,to:pos+m.nodeSize}).run();
  });
}
function imagenesDe(dt){
  if(!dt)return [];
  var txt='';try{txt=dt.getData('text/plain')}catch(e){}
  /* Al copiar texto de Word o de una página, a veces viene también su imagen: ahí gana el texto */
  if(txt&&txt.trim())return [];
  return Array.prototype.filter.call(dt.files||[],function(f){return /^image\//.test(f.type)});
}
var Piezas=T.Extension.create({
  name:'piezas',
  onTransaction:function(o){
    if(!o.transaction.docChanged&&notasEd)return;
    vistas.forEach(function(v){v.numerar()});
    pintarNotas(this.editor);
  },
  onDestroy:function(){if(notasEd){notasEd.remove();notasEd=null}vistas.clear();cacheEd={doc:null,r:null}},
  addKeyboardShortcuts:function(){
    var ed=this.editor;
    return {
      'Mod-Alt-f':function(){nuevaNota(ed);return true},
      /* Enter sobre una ecuación seleccionada la abre para editarla */
      'Enter':function(){
        var s=ed.state.selection;
        if(!(s instanceof pm.NodeSelection)||s.node.type.name!=='ecuacion')return false;
        var d=ed.view.nodeDOM(s.from),hecho=false;
        vistas.forEach(function(v){if(!hecho&&v.dom===d&&v.abrir){v.abrir();hecho=true}});
        return hecho;
      }
    };
  },
  addInputRules:function(){
    var ed=this.editor;
    /* «$$» al empezar un párrafo vacío crea una ecuación numerada */
    return [new T.InputRule({find:/^\$\$$/,handler:function(o){
      var $f=o.state.doc.resolve(o.range.from);
      var tx=$f.parent.textContent;if($f.parent.type.name!=='paragraph'||$f.depth!==1||(tx!=='$'&&tx!=='$$'))return null;
      var ini=$f.before(1),fin=$f.after(1),clave=AT.bloques.nuevoId().replace(/^b-/,'p-');
      abrirNueva=clave;
      o.state.tr.replaceWith(ini,fin,ed.schema.nodes.ecuacion.create({clave:clave,latex:''}));
    }})];
  },
  addProseMirrorPlugins:function(){
    var editor=this.editor;
    return [new pm.Plugin({key:new pm.PluginKey('piezas'),props:{
      handlePaste:function(view,e){
        var f=imagenesDe(e.clipboardData);if(!f.length)return false;
        e.preventDefault();
        f.reduce(function(pr,x){return pr.then(function(){return insertarImagen(editor,x)})},Promise.resolve());
        return true;
      },
      handleDrop:function(view,e,slice,movido){
        if(movido)return false;
        var f=imagenesDe(e.dataTransfer);if(!f.length)return false;
        e.preventDefault();
        var c=view.posAtCoords({left:e.clientX,top:e.clientY}),pos=c?c.pos:null;
        if(pos!=null){var $p=view.state.doc.resolve(pos);pos=$p.depth?$p.after(1):pos}
        f.reduce(function(pr,x){return pr.then(function(){return insertarImagen(editor,x,pos)})},Promise.resolve());
        return true;
      },
      handleClickOn:function(view,pos,node,nodePos,ev){
        var t=node.type.name,dom=view.nodeDOM(nodePos);
        if(t==='notaPie'){setTimeout(function(){menuNota(editor,nodePos,dom)},0);return true}
        if(t==='formula'){
          setTimeout(function(){
            pedirFormula(editor,node.attrs.latex,dom,function(v){
              var m=editor.state.doc.nodeAt(nodePos);if(!m||m.type.name!=='formula')return;
              if(!v)editor.chain().focus().deleteRange({from:nodePos,to:nodePos+m.nodeSize}).run();
              else editor.view.dispatch(editor.state.tr.setNodeAttribute(nodePos,'latex',v));
            },function(){var m=editor.state.doc.nodeAt(nodePos);if(m&&m.type.name==='formula')editor.chain().focus().deleteRange({from:nodePos,to:nodePos+m.nodeSize}).run()});
          },0);
          return true;
        }
        if(t==='refCruzada'){
          var x=numeros(editor).por[node.attrs.destino];
          setTimeout(function(){
            AT.menu.abrir(dom,(x?[{t:'Ir a '+etiqueta(x),i:'enlace',f:function(){irA(editor,node.attrs.destino)}}]:[]).concat([
              {t:'Cambiar a qué se refiere',i:'note',f:function(){elegirDestino(editor,dom,function(c){
                var m=editor.state.doc.nodeAt(nodePos);if(m&&m.type.name==='refCruzada')editor.view.dispatch(editor.state.tr.setNodeAttribute(nodePos,'destino',c));editor.view.focus();
              })}},
              {sep:true},
              {t:'Quitar la referencia',i:'close',peligro:true,f:function(){
                var m=editor.state.doc.nodeAt(nodePos);if(m&&m.type.name==='refCruzada')editor.chain().focus().deleteRange({from:nodePos,to:nodePos+m.nodeSize}).run();
              }}
            ]),{etiqueta:'Referencia cruzada',devolver:view.dom,alElegir:function(it){it.f()}});
          },0);
          return true;
        }
        return false;
      }
    }})];
  }
});
AT.editorExtensiones=(AT.editorExtensiones||[]).concat([Figura,TablaNumerada,Ecuacion,Formula,NotaPie,RefCruzada,IndicePiezas,Piezas]);

/* ---------- Lo que se puede insertar con «/» o con «Insertar» ---------- */
function edDe(c){return c.editor||AT.editorActual&&AT.editorActual.tiptap}
var nuevos=[
  {k:'imagen',t:'Imagen',d:'Con título y nota; se comprime sola',i:'imagen',p:'figura foto grafica dibujo png jpg captura',
    f:function(c){var ed=edDe(c);setTimeout(function(){elegirArchivo().then(function(f){if(f)insertarImagen(ed,f)})},0);return c}},
  {k:'tablaNumerada',t:'Tabla numerada',d:'«Tabla N» con título y nota, como pide APA',i:'tabla',p:'cuadro apa titulo numero',academico:true,
    f:function(c){var clave=AT.bloques.nuevoId().replace(/^b-/,'p-');abrirNueva=clave;return c.insertContent({type:'tablaNumerada',attrs:{clave:clave},content:[tablaVacia()]})}},
  {k:'ecuacion',t:'Ecuación',d:'Numerada, en LaTeX; también con «$$»',i:'ecuacion',p:'formula matematicas latex katex numerada',f:function(c){return nuevaEcuacion(c)}},
  {k:'formula',t:'Fórmula en el texto',d:'Dentro del párrafo; también con $x^2$',i:'ecuacion',p:'matematicas latex katex inline',
    f:function(c){var ed=edDe(c);setTimeout(function(){pedirFormula(ed,'',rectCursor(ed),function(v){if(v)ed.chain().focus().insertContent({type:'formula',attrs:{latex:v}}).run()})},0);return c}},
  {k:'notaPie',t:'Nota al pie',d:'Ctrl+Alt+F',i:'note',p:'pie footnote aclaracion',f:function(c){var ed=edDe(c);setTimeout(function(){nuevaNota(ed)},0);return c}},
  {k:'refCruzada',t:'Referencia cruzada',d:'«ver Figura 2»: el número se actualiza solo',i:'enlace',p:'ver figura tabla ecuacion seccion xref remitir',academico:true,
    f:function(c){var ed=edDe(c);setTimeout(function(){elegirDestino(ed,rectCursor(ed),function(clave){ed.chain().focus().insertContent([{type:'refCruzada',attrs:{destino:clave}},{type:'text',text:' '}]).run()})},0);return c}},
  {k:'indiceFiguras',t:'Índice de figuras',d:'La lista de figuras, al día',i:'indice',p:'lista figuras imagenes',academico:true,f:function(c){return c.insertContent({type:'indicePiezas',attrs:{clase:'figura'}})}},
  {k:'indiceTablas',t:'Índice de tablas',d:'La lista de tablas numeradas, al día',i:'indice',p:'lista tablas cuadros',academico:true,f:function(c){return c.insertContent({type:'indicePiezas',attrs:{clase:'tabla'}})}}
];
var lista=AT.editorInsertar;
if(lista){
  var trasTabla=lista.map(function(x){return x.k}).indexOf('tabla');
  lista.splice(trasTabla<0?lista.length:trasTabla+1,0,nuevos[0],nuevos[1]);
  nuevos.slice(2).forEach(function(x){lista.push(x)});
}
})();
