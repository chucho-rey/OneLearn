/* OneBook: formato de bloques y su dibujo.
   Un documento (una lección oficial o un documento tuyo) es un objeto JSON:
     {formato:1, tipo:'leccion'|'libreta'|'notas'|..., id, titulo, icono, props:[{nombre, valor, estilo}],
      creado, editado, contenido:{type:'doc', content:[bloques]}}
   `contenido` usa el mismo esquema que el editor (Tiptap/ProseMirror): cada bloque es
   {type, attrs, content} y el texto es {type:'text', text, marks:[{type, attrs}]}.
   Los bloques de primer nivel llevan attrs.id, un identificador fijo: es el ancla de los marcadores.
   Este archivo dibuja ese JSON como HTML (sin usar innerHTML con datos del documento, así que un
   documento importado no puede inyectar código) y lo hace igual para lecciones y documentos.
   Si la página trae <script type="application/json" id="documento">, lo dibuja al cargar dentro de .page.
   Expone AT.bloques. Se carga después de los laboratorios de la lección (AT.labs). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,ico=AT.ico;
AT.labs=AT.labs||{};

/* ---------- Utilidades ---------- */
function el(tag,cls,attrs){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(attrs)for(var k in attrs)if(attrs[k]!=null&&attrs[k]!==false)e.setAttribute(k,attrs[k]===true?'':attrs[k]);
  return e;
}
function icono(id,cls){
  var t=document.createElement('template');
  t.innerHTML=ico(id,cls);
  return t.content.firstChild;
}
/* Identificador nuevo para un bloque: b- y 6 caracteres */
function nuevoId(){
  var s='';
  var a=new Uint8Array(6);
  (window.crypto||window.msCrypto).getRandomValues(a);
  for(var i=0;i<6;i++)s+='abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i]%36);
  return 'b-'+s;
}
/* Enlaces: solo web, correo, rutas relativas y anclas (nada de javascript: ni data:) */
function hrefSeguro(h){
  h=String(h||'').trim();
  if(!h)return null;
  if(/^(https?:|mailto:)/i.test(h))return h;
  if(/^[a-z][a-z0-9+.-]*:/i.test(h))return null;
  return h;
}
function hijos(n){return Array.isArray(n&&n.content)?n.content:[]}
function attrs(n){return (n&&n.attrs)||{}}

/* ---------- Texto con formato ---------- */
var MARCAS={bold:'b',italic:'i',underline:'u',strike:'s',code:'code',highlight:'mark',subscript:'sub',superscript:'sup'};
function texto(n){
  var nodo=document.createTextNode(String(n.text||''));
  (n.marks||[]).slice().reverse().forEach(function(m){
    var w;
    if(m.type==='link'){
      var h=hrefSeguro(attrs(m).href);
      if(!h)return;
      w=el('a',null,{href:h});
      if(/^https?:/i.test(h)){w.target='_blank';w.rel='noopener noreferrer'}
    }else if(MARCAS[m.type])w=el(MARCAS[m.type]);
    else return;
    w.appendChild(nodo);
    nodo=w;
  });
  return nodo;
}
function enLinea(lista,padre,ctx){
  lista.forEach(function(n){
    if(n.type==='text')padre.appendChild(texto(n));
    else if(n.type==='hardBreak')padre.appendChild(el('br'));
    else if(TIPOS[n.type])padre.appendChild(TIPOS[n.type](n,ctx));
  });
  return padre;
}
function bloques(lista,padre,ctx){
  lista.forEach(function(n){
    var f=TIPOS[n.type];
    if(!f)return;
    var e=f(n,ctx);
    if(e)padre.appendChild(e);
  });
  return padre;
}
/* Texto plano de un nodo (para índices, búsqueda y conteo de palabras) */
function textoPlano(n){
  if(!n)return '';
  if(n.type==='text')return n.text||'';
  if(n.type==='hardBreak')return '\n';
  if(n.type==='repaso')return (attrs(n).preguntas||[]).map(function(q){return [q.q].concat(q.o||[],[q.e||'']).join(' ')}).join(' ');
  if(n.type==='cita')return attrs(n).texto||'';
  if(n.type==='referencia')return AT.fuentes&&AT.docActual?AT.fuentes.cita(attrs(n),AT.docActual.fuentes,AT.docActual):'';
  if(n.type==='declaracion')return AT.fuentes?[].concat.apply([],AT.fuentes.declaracion(attrs(n),'')).join(' '):'';
  if(TEXTO[n.type])return TEXTO[n.type](n,textoPlano);
  var sep=/^(paragraph|heading|listItem|taskItem|tableCell|tableHeader|codeBlock|desplegableTitulo)$/.test(n.type)?'\n':'';
  return hijos(n).map(textoPlano).join(n.type==='tableRow'?' ':'')+sep;
}

/* ---------- Bloques ---------- */
/* Tipos que agregan otros archivos (piezas.js: figuras, ecuaciones, notas al pie…) con AT.bloques.registrar */
var TEXTO={};
var CALLOUT={info:'info',aviso:'aviso',idea:'idea'};
var TIPOS={
  paragraph:function(n,c){return enLinea(hijos(n),el('p'),c)},
  heading:function(n,c){
    var a=attrs(n),nivel=a.level===3?3:2;
    return enLinea(hijos(n),el('h'+nivel),c);
  },
  bulletList:function(n,c){return bloques(hijos(n),el('ul'),c)},
  orderedList:function(n,c){
    var s=+attrs(n).start;
    return bloques(hijos(n),el('ol',null,{start:s>1?s:null}),c);
  },
  listItem:function(n,c){return bloques(hijos(n),el('li'),c)},
  taskList:function(n,c){return bloques(hijos(n),el('ul','tareas'),c)},
  taskItem:function(n,c){
    var hecha=!!attrs(n).checked,li=el('li','tarea'+(hecha?' hecha':''));
    var caja=el('span','tarea-c',{'aria-hidden':'true'});
    li.appendChild(caja);
    var cuerpo=bloques(hijos(n),el('div','tarea-t'),c);
    var vh=el('span','vh');vh.textContent=hecha?'Hecho: ':'Pendiente: ';
    cuerpo.insertBefore(vh,cuerpo.firstChild);
    li.appendChild(cuerpo);
    return li;
  },
  blockquote:function(n,c){return bloques(hijos(n),el('blockquote'),c)},
  codeBlock:function(n){
    var pre=el('pre','codigo'),code=el('code');
    code.textContent=hijos(n).map(textoPlano).join('');
    pre.appendChild(code);
    return pre;
  },
  horizontalRule:function(){return el('hr')},
  table:function(n,c){
    var w=el('div','tbl-wrap'),t=el('table'),filas=hijos(n),cab=null,cuerpo=el('tbody');
    filas.forEach(function(f,i){
      var tr=TIPOS.tableRow(f,c);
      var todasCab=hijos(f).length&&hijos(f).every(function(x){return x.type==='tableHeader'});
      if(i===0&&todasCab){cab=el('thead');cab.appendChild(tr)}
      else cuerpo.appendChild(tr);
    });
    if(cab)t.appendChild(cab);
    t.appendChild(cuerpo);
    w.appendChild(t);
    return w;
  },
  tableRow:function(n,c){return bloques(hijos(n),el('tr'),c)},
  tableHeader:function(n,c){return celda('th',n,c)},
  tableCell:function(n,c){return celda('td',n,c)},
  callout:function(n,c){
    var v=CALLOUT[attrs(n).variante]||'';
    var d=el('div','callout'+(v?' '+v:''));
    d.appendChild(icono(v==='aviso'?'aviso':v==='idea'?'idea':'info'));
    d.appendChild(bloques(hijos(n),el('div'),c));
    return d;
  },
  columnas:function(n,c){return bloques(hijos(n),el('div','cols'),c)},
  columna:function(n,c){return bloques(hijos(n),el('div'),c)},
  desplegable:function(n,c){
    var d=el('details','tg'),s=el('summary'),t=hijos(n)[0],b=hijos(n)[1];
    s.appendChild(icono('mas'));
    s.appendChild(enLinea(hijos(t),el('span'),c));
    d.appendChild(s);
    d.appendChild(bloques(hijos(b),el('div','tg-b'),c));
    return d;
  },
  laboratorio:function(n,c){
    var a=attrs(n),d=el('div','demo'),h=el('div','demo-h'),b=el('div','demo-b');
    var tit=el('b');tit.textContent=a.titulo||'Laboratorio';
    var tag=el('span','tag lab');tag.textContent='Laboratorio';
    h.appendChild(tit);h.appendChild(tag);
    d.appendChild(h);d.appendChild(b);
    var tpl=a.nombre&&document.querySelector('template[data-lab="'+String(a.nombre).replace(/["\\]/g,'')+'"]');
    if(tpl&&typeof AT.labs[a.nombre]==='function'){
      b.appendChild(tpl.content.cloneNode(true));
      c.labs.push({nombre:a.nombre,raiz:b});
    }else{
      var p=el('p','hint');p.textContent='Este laboratorio solo funciona dentro de su lección.';
      b.appendChild(p);
    }
    return d;
  },
  repaso:function(n,c){
    var qs=(attrs(n).preguntas||[]).filter(function(q){return q&&q.q&&Array.isArray(q.o)&&q.o.length>1});
    var primero=!c.hayRepaso;c.hayRepaso=true;
    var d=el('div','repaso');
    var host=el('div','repaso-q',primero?{id:'qz'}:null);
    var ctl=el('div','ctl');
    var score=el('span','lbl',{id:primero?'qzScore':null,'aria-live':'polite'});
    var reset=el('button','btn',{type:'button',id:primero?'qzReset':null});
    reset.textContent='Reiniciar';
    ctl.appendChild(score);ctl.appendChild(reset);
    d.appendChild(host);d.appendChild(ctl);
    if(!qs.length){score.textContent='Este repaso todavía no tiene preguntas.';reset.hidden=true}
    else c.repasos.push({host:host,score:score,reset:reset,preguntas:qs});
    return d;
  },
  indice:function(n,c){
    var ul=el('ul','toc',{'aria-label':'Contenido'});
    c.indices.push(ul);
    return ul;
  },
  resumen:function(n,c){
    var d=el('div','resumen'),h=el('h2');
    h.textContent=attrs(n).titulo||'Resumen';
    var cal=el('div','callout');
    cal.appendChild(icono('info'));
    cal.appendChild(bloques(hijos(n),el('div'),c));
    d.appendChild(h);d.appendChild(cal);
    return d;
  },
  referencia:function(n,c){
    var e=el('span','ref');
    e.textContent=AT.fuentes?AT.fuentes.cita(attrs(n),(c.doc||{}).fuentes,c.doc):'';
    return e;
  },
  bibliografia:function(n,c){
    var l=AT.fuentes?AT.fuentes.bibliografia(c.doc||{},attrs(n).todas):[];
    if(!l.length)return null;
    var ul=el('ul','biblio');
    l.forEach(function(r){ul.appendChild(AT.fuentes.pintarTrozos(r.trozos,el('li')))});
    return ul;
  },
  declaracion:function(n,c){
    if(!AT.fuentes)return null;
    var d=el('div','declaracion'),h=el('h2');
    h.textContent='Declaración de autoría';d.appendChild(h);
    AT.fuentes.declaracion(attrs(n),AT.fuentes.autorDe(c.doc)).forEach(function(x){
      if(Array.isArray(x)){var ul=el('ul');x.forEach(function(y){var li=el('li');li.textContent=y;ul.appendChild(li)});d.appendChild(ul)}
      else{var p=el('p');p.textContent=x;d.appendChild(p)}
    });
    return d;
  },
  cita:function(n){
    var a=attrs(n),h=hrefSeguro(a.href);
    var e=el(h?'a':'span','cita',h?{href:h}:null);
    e.appendChild(icono('marcador'));
    var t=el('span');t.textContent=a.texto||'Cita';
    e.appendChild(t);
    return e;
  }
};
function celda(tag,n,c){
  var a=attrs(n),td=el(tag,null,{colspan:a.colspan>1?a.colspan:null,rowspan:a.rowspan>1?a.rowspan:null});
  var hs=hijos(n);
  /* Una celda con un solo párrafo se dibuja sin <p>, como en una tabla normal */
  if(hs.length===1&&hs[0].type==='paragraph')enLinea(hijos(hs[0]),td,c);
  else bloques(hs,td,c);
  return td;
}

/* Secciones del documento: los títulos de nivel 2 con id, en orden */
function secciones(doc){
  return hijos(doc&&doc.contenido).filter(function(n){return n.type==='heading'&&attrs(n).level===2&&attrs(n).id}).map(function(n){
    return {id:attrs(n).id,titulo:textoPlano(n).trim()};
  });
}

var ESTILOS={etiqueta:'tag',verde:'tag green',amarillo:'tag yellow',rojo:'tag red',azul:'tag blue'};
/* Dibuja un documento completo: ícono, título, propiedades y bloques.
   opciones: {antes: nodo antes del cual insertar (por omisión, al principio del contenedor),
              encabezado: false para omitir ícono, título y propiedades} */
function dibujar(doc,cont,op){
  op=op||{};
  var ctx={labs:[],repasos:[],indices:[],hayRepaso:false,doc:doc,alFinal:[]};
  var frag=document.createDocumentFragment();
  if(op.encabezado!==false){
    if(doc.icono){
      var pi=el('div','page-icon');
      pi.appendChild(icono(doc.icono));
      frag.appendChild(pi);
    }
    var h1=el('h1');h1.textContent=doc.titulo||'Sin título';
    frag.appendChild(h1);
    var props=(doc.props||[]).filter(function(p){return p&&p.nombre});
    if(props.length){
      var dl=el('dl','props');
      props.forEach(function(p){
        var fila=el('div'),dt=el('dt'),dd=el('dd');
        dt.textContent=p.nombre;
        if(ESTILOS[p.estilo]){var s=el('span',ESTILOS[p.estilo]);s.textContent=p.valor||'';dd.appendChild(s)}
        else dd.textContent=p.valor||'';
        fila.appendChild(dt);fila.appendChild(dd);dl.appendChild(fila);
      });
      frag.appendChild(dl);
    }
  }
  hijos(doc.contenido).forEach(function(n){
    var f=TIPOS[n.type];
    if(!f)return;
    var e=f(n,ctx);
    if(!e)return;
    var id=attrs(n).id;
    if(id&&/^[A-Za-z][\w-]{0,63}$/.test(id))e.id=id;
    e.setAttribute('data-b','');
    frag.appendChild(e);
  });
  /* Lo que va al final del documento (por ejemplo, las notas al pie) */
  ctx.alFinal.forEach(function(f){f(frag,ctx)});
  /* Índices: una entrada por sección */
  var secs=secciones(doc);
  ctx.indices.forEach(function(ul){
    secs.forEach(function(s){
      var li=el('li'),b=el('button','link',{type:'button','data-go':s.id});
      b.textContent=s.titulo;
      li.appendChild(b);ul.appendChild(li);
    });
  });
  cont.insertBefore(frag,op.antes||cont.firstChild);
  ctx.repasos.forEach(function(r){AT.repaso(r)});
  ctx.labs.forEach(function(l){
    try{AT.labs[l.nombre](l.raiz)}catch(e){if(window.console)console.error('Laboratorio '+l.nombre,e)}
  });
  return ctx;
}

/* Revisa que un objeto tenga forma de documento (al importar un respaldo, por ejemplo) */
function valido(doc){
  return !!(doc&&typeof doc==='object'&&typeof doc.id==='string'&&doc.id&&
    doc.contenido&&doc.contenido.type==='doc'&&(doc.contenido.content==null||Array.isArray(doc.contenido.content)));
}
function palabras(doc){
  var t=hijos(doc&&doc.contenido).map(textoPlano).join(' ').trim();
  return t?t.split(/\s+/).length:0;
}

AT.bloques={
  FORMATO:1,
  dibujar:dibujar,
  secciones:secciones,
  texto:function(doc){return hijos(doc&&doc.contenido).map(textoPlano).join('\n')},
  textoDe:textoPlano,
  palabras:palabras,
  valido:valido,
  nuevoId:nuevoId,
  hrefSeguro:hrefSeguro,
  /* registrar(tipo, {dibujar(n, ctx, ayuda), texto(n, textoPlano)}): un tipo de bloque o de nodo en línea nuevo */
  registrar:function(tipo,o){
    if(o.dibujar)TIPOS[tipo]=function(n,c){return o.dibujar(n,c,{el:el,icono:icono,bloques:bloques,enLinea:enLinea,attrs:attrs,hijos:hijos})};
    if(o.texto)TEXTO[tipo]=o.texto;
  }
};

/* ---------- Documento de la página ---------- */
var fuente=document.getElementById('documento');
if(fuente&&fuente.type==='application/json'){
  var page=$('.page');
  try{
    var doc=JSON.parse(fuente.textContent);
    AT.documento=doc;
    if(page)dibujar(doc,page);
  }catch(e){
    if(window.console)console.error('No se pudo leer el documento de la página',e);
    if(page){var p=el('p');p.textContent='No se pudo mostrar esta lección.';page.insertBefore(p,page.firstChild)}
  }
}
})();
