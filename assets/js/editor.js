/* OneBook: el editor de documentos (Tiptap, en assets/vendor/tiptap.min.js como window.Tiptap).
   AT.editor.crear({host, barra, contenido, alCambiar}) monta un editor que escribe el mismo formato de
   bloques que dibuja bloques.js, así que lo que escribes se ve igual al leerlo.
   - Bloques propios: callout, columnas, desplegable, resumen e índice.
   - Cada bloque de primer nivel recibe un identificador fijo (ancla de los enlaces y de la búsqueda).
   - Barra de herramientas (role=toolbar, con flechas), menú «/» para insertar, «@» para enlazar otra página,
     asa «+ ⋮⋮» para insertar, arrastrar y abrir las opciones de un bloque, y atajos: Alt+↑/↓ mueven el bloque,
     Ctrl+Mayús+D lo duplica.
   - Lo que el editor no conoce (por ejemplo, de un respaldo de otra versión) no se pierde: entra
     envuelto en «legado» (o «legadoLinea» dentro del texto) con su JSON original, se ve sin poder editarse y al
     guardar vuelve tal cual (desenvolver).
   Se carga solo en documento.html, después de bloques.js. */
(function(){
'use strict';
var AT=window.AT,T=window.Tiptap,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
if(!T){AT.editor=null;return}
var pm=T.pm,SVG='http://www.w3.org/2000/svg';
function svg(id){return [SVG+' svg',{class:'ico','aria-hidden':'true',focusable:'false'},[SVG+' use',{href:'#i-'+id}]]}
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function sinAcentos(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}

/* ---------- Identificadores de bloque ---------- */
var CON_ID=['paragraph','heading','bulletList','orderedList','taskList','blockquote','codeBlock','horizontalRule','table',
  'callout','columnas','desplegable','indice','resumen','figura','tablaNumerada','pagos','legado'];
/* Los bloques que se registran después (negocio.js) agregan aquí su tipo: los ids se piden al crear el editor */
AT.editorConId=CON_ID;
var claveIds=new pm.PluginKey('idsDeBloque');
var Ids=T.Extension.create({
  name:'idsDeBloque',
  addGlobalAttributes:function(){
    return [{types:CON_ID,attributes:{id:{default:null,keepOnSplit:false,
      parseHTML:function(e){return e.getAttribute('data-id')||null},
      renderHTML:function(a){return a.id?{'data-id':a.id}:{}}}}}];
  },
  addProseMirrorPlugins:function(){
    return [new pm.Plugin({key:claveIds,appendTransaction:function(trs,viejo,nuevo){
      if(!trs.some(function(t){return t.docChanged||t.getMeta(claveIds)}))return null;
      var tr=nuevo.tr,vistos={},cambio=false;
      /* Primer nivel: todos con id y sin repetir (al pegar o duplicar, la copia recibe uno nuevo) */
      nuevo.doc.forEach(function(n,pos){
        if(!('id' in n.attrs))return;
        var id=n.attrs.id;
        if(!id||vistos[id]){id=AT.bloques.nuevoId();tr.setNodeAttribute(pos,'id',id);cambio=true}
        vistos[id]=true;
      });
      /* Dentro de otros bloques no se guardan ids */
      nuevo.doc.forEach(function(n,pos){
        n.descendants(function(h,p){
          if(h.attrs&&h.attrs.id){tr.setNodeAttribute(pos+1+p,'id',null);cambio=true}
        });
      });
      /* Figuras y tablas numeradas: una clave única en cualquier nivel (la usan las referencias cruzadas) */
      var claves={};
      nuevo.doc.descendants(function(n,pos){
        if(!n.attrs||!('clave' in n.attrs))return;
        var c=n.attrs.clave;
        if(!c||claves[c]){c=AT.bloques.nuevoId().replace(/^b-/,'p-');tr.setNodeAttribute(pos,'clave',c);cambio=true}
        claves[c]=true;
      });
      return cambio?tr:null;
    }})];
  }
});

/* ---------- Bloques propios ---------- */
var VARIANTES=[['info','Información','info'],['aviso','Aviso','aviso'],['idea','Idea','idea'],['','Neutro','info']];
var Callout=T.Node.create({
  name:'callout',group:'block',content:'block+',defining:true,
  addAttributes:function(){return {variante:{default:'info',
    parseHTML:function(e){return e.getAttribute('data-variante')||''},
    renderHTML:function(a){return {'data-variante':a.variante||''}}}}},
  parseHTML:function(){return [{tag:'div[data-callout]'}]},
  renderHTML:function(o){
    var v=o.node.attrs.variante||'',icono=(VARIANTES.filter(function(x){return x[0]===v})[0]||VARIANTES[0])[2];
    return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-callout':'',class:'callout'+(v?' '+v:'')}),
      ['span',{class:'callout-ic',contenteditable:'false'},svg(icono)],['div',{class:'callout-c'},0]];
  }
});
var Columnas=T.Node.create({
  name:'columnas',group:'block',content:'columna{2,3}',defining:true,isolating:true,
  parseHTML:function(){return [{tag:'div[data-columnas]'}]},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-columnas':'',class:'cols'}),0]}
});
var Columna=T.Node.create({
  name:'columna',content:'block+',isolating:true,
  parseHTML:function(){return [{tag:'div[data-columna]'}]},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-columna':''}),0]}
});
var Desplegable=T.Node.create({
  name:'desplegable',group:'block',content:'desplegableTitulo desplegableCuerpo',defining:true,isolating:true,
  parseHTML:function(){return [{tag:'div[data-desplegable]'}]},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-desplegable':'',class:'tg tg-ed'}),0]}
});
var DesplegableTitulo=T.Node.create({
  name:'desplegableTitulo',content:'inline*',defining:true,
  parseHTML:function(){return [{tag:'div[data-desplegable-titulo]'}]},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-desplegable-titulo':'',class:'tg-s'}),['span',{class:'tg-ic',contenteditable:'false'},svg('mas')],['span',{class:'tg-st'},0]]}
});
var DesplegableCuerpo=T.Node.create({
  name:'desplegableCuerpo',content:'block+',defining:true,
  parseHTML:function(){return [{tag:'div[data-desplegable-cuerpo]'}]},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-desplegable-cuerpo':'',class:'tg-b'}),0]}
});
var Resumen=T.Node.create({
  name:'resumen',group:'block',content:'block+',defining:true,isolating:true,
  parseHTML:function(){return [{tag:'div[data-resumen]'}]},
  renderHTML:function(o){
    return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-resumen':'',class:'resumen'}),
      ['h2',{contenteditable:'false'},'Resumen'],['div',{class:'callout'},['span',{class:'callout-ic',contenteditable:'false'},svg('info')],['div',{class:'callout-c'},0]]];
  }
});
function atomo(nombre,dibujar,extra){
  return T.Node.create(Object.assign({
    name:nombre,group:'block',atom:true,selectable:true,draggable:false,
    parseHTML:function(){return [{tag:'div[data-'+nombre+']'}]},
    renderHTML:function(o){var x={};x['data-'+nombre]='';return ['div',T.mergeAttributes(o.HTMLAttributes,x)]},
    addNodeView:function(){return dibujar}
  },extra||{}));
}
/* Índice: muestra en vivo las secciones del documento */
var indices=new Set();
var Indice=atomo('indice',function(p){
  var dom=el('div','ed-indice');dom.contentEditable='false';
  function pintar(){
    var h=[];
    p.editor.state.doc.forEach(function(n){if(n.type.name==='heading'&&n.attrs.level===2)h.push(n.textContent.trim()||'Sección sin título')});
    dom.innerHTML='<span class="ed-et">Índice</span>'+(h.length?'<ol class="toc">'+h.map(function(t){return '<li><span class="link">'+esc(t)+'</span></li>'}).join('')+'</ol>':
      '<p class="hint">Aquí aparecerán tus secciones (los «Títulos de sección»).</p>');
  }
  var v={dom:dom,pintar:pintar,update:function(n){return n.type.name==='indice'},destroy:function(){indices.delete(v)},ignoreMutation:function(){return true}};
  indices.add(v);pintar();
  return v;
});
/* Legado: un bloque que este editor no conoce (por ejemplo, de un respaldo de otra versión). Guarda el JSON original en
   attrs.json; se ve con su texto, no se edita y al guardar vuelve tal cual (desenvolver): nada se pierde */
function originalDe(n){try{var o=JSON.parse(n.attrs.json||'null');return o&&typeof o==='object'?o:null}catch(e){return null}}
function textoDeOriginal(o){return o&&o.type?AT.bloques.textoDe(o).replace(/\s+/g,' ').trim():''}
var Legado=atomo('legado',function(p){
  var dom=el('div','ed-legado legado');dom.contentEditable='false';
  var o=originalDe(p.node)||{},t=textoDeOriginal(o),b=el('p','legado-t');
  b.textContent=(p.editor.schema.nodes[o.type]?'Un bloque que no se pudo abrir':'Un bloque que esta versión de OneBook no conoce')+
    '. Se conserva en la página tal como estaba.';
  dom.appendChild(b);
  if(t){var x=el('p');x.textContent=t.length>600?t.slice(0,600)+'…':t;dom.appendChild(x)}
  return {dom:dom,ignoreMutation:function(){return true}};
},{addAttributes:function(){return {json:{default:'{}',parseHTML:function(e){return e.getAttribute('data-json')||'{}'},renderHTML:function(a){return {'data-json':a.json}}}}}});
var LegadoLinea=T.Node.create({
  name:'legadoLinea',group:'inline',inline:true,atom:true,selectable:true,
  addAttributes:function(){return {json:{default:'{}',parseHTML:function(e){return e.getAttribute('data-json')||'{}'},renderHTML:function(a){return {'data-json':a.json}}}}},
  parseHTML:function(){return [{tag:'span[data-legado]'}]},
  renderHTML:function(o){
    var x=originalDe(o.node)||{};
    return ['span',T.mergeAttributes(o.HTMLAttributes,{'data-legado':'',class:'legado-l',title:'Contenido que esta versión de OneBook no conoce'}),textoDeOriginal(x)||'…'];
  },
  renderText:function(o){return textoDeOriginal(originalDe(o.node))}
});

/* Enlace a otra página o a una de sus secciones («@»): no se edita letra por letra */
var Cita=T.Node.create({
  name:'cita',group:'inline',inline:true,atom:true,selectable:true,
  addAttributes:function(){return {
    href:{default:'',parseHTML:function(e){return e.getAttribute('href')||''},renderHTML:function(a){return {href:AT.bloques.hrefSeguro(a.href)||'#'}}},
    texto:{default:'',parseHTML:function(e){return e.textContent.trim()},renderHTML:function(){return {}}}
  }},
  parseHTML:function(){return [{tag:'a[data-cita]'}]},
  renderHTML:function(o){return ['a',T.mergeAttributes(o.HTMLAttributes,{'data-cita':'',class:'cita'}),svg('enlace'),['span',{},o.node.attrs.texto||'Cita']]},
  renderText:function(o){return o.node.attrs.texto||''}
});
/* Tocar un enlace «@» en el editor ofrece abrirlo o quitarlo */
var claveClicCita=new pm.PluginKey('clicCita');
var ClicCita=T.Extension.create({
  name:'clicCita',
  addProseMirrorPlugins:function(){
    var editor=this.editor;
    return [new pm.Plugin({key:claveClicCita,props:{
    /* La cita no es editable por dentro, así que el navegador la seguiría como enlace: se evita */
    handleDOMEvents:{click:function(view,e){if(e.target.closest&&e.target.closest('a.cita'))e.preventDefault();return false}},
    handleClickOn:function(view,pos,node,nodePos,event){
      if(node.type.name!=='cita')return false;
      var a=event.target.closest('a.cita')||view.nodeDOM(nodePos);
      if(event.ctrlKey||event.metaKey){window.open(node.attrs.href,'_blank');return true}
      setTimeout(function(){
        abrirMenu(a,[
          {t:'Ir a «'+(node.attrs.texto.length>40?node.attrs.texto.slice(0,40)+'…':node.attrs.texto)+'»',i:'enlace',d:'Abre la página',f:function(){if(AT.editorActual)AT.editorActual.guardarYa();location.href=AT.bloques.hrefSeguro(node.attrs.href)||'#'}},
          {t:'Quitar el enlace',i:'close',peligro:true,f:function(){
            var p=nodePos,n=editor.state.doc.nodeAt(p);
            if(n&&n.type.name==='cita')editor.chain().focus().deleteRange({from:p,to:p+n.nodeSize}).run();
          }}
        ],{etiqueta:'Enlace',devolver:view.dom,alElegir:function(it){it.f()}});
      },0);
      return true;
    }}})];
  }
});

/* ---------- Bloques que se pueden insertar ---------- */
function P(texto){return texto?{type:'paragraph',content:[{type:'text',text:texto}]}:{type:'paragraph'}}
var INSERTAR=[
  {k:'texto',t:'Texto',d:'Un párrafo normal',i:'texto',p:'parrafo',f:function(c){return c.setParagraph()}},
  {k:'seccion',t:'Título de sección',d:'Aparece en el índice',i:'titulo',p:'titulo seccion h2',f:function(c){return c.setHeading({level:2})}},
  {k:'subtitulo',t:'Subtítulo',d:'Un título dentro de una sección',i:'subtitulo',p:'h3',f:function(c){return c.setHeading({level:3})}},
  {k:'lista',t:'Lista con viñetas',d:'Escribe «- » al empezar una línea',i:'lista',p:'vinetas',f:function(c){return c.toggleBulletList()}},
  {k:'numerada',t:'Lista numerada',d:'Escribe «1. » al empezar una línea',i:'lista-num',p:'numeros',f:function(c){return c.toggleOrderedList()}},
  {k:'tareas',t:'Lista de tareas',d:'Con casillas para marcar',i:'tareas',p:'pendientes checklist',f:function(c){return c.toggleTaskList()}},
  {k:'info',t:'Callout de información',d:'Un recuadro para destacar algo',i:'info',p:'nota recuadro destacado',f:function(c){return c.insertContent({type:'callout',attrs:{variante:'info'},content:[P()]})}},
  {k:'aviso',t:'Callout de aviso',d:'Para advertencias y errores comunes',i:'aviso',p:'cuidado advertencia',f:function(c){return c.insertContent({type:'callout',attrs:{variante:'aviso'},content:[P()]})}},
  {k:'idea',t:'Callout de idea',d:'Un consejo o una conexión',i:'idea',p:'consejo tip',f:function(c){return c.insertContent({type:'callout',attrs:{variante:'idea'},content:[P()]})}},
  {k:'tabla',t:'Tabla',d:'3 × 3, con fila de títulos',i:'tabla',p:'cuadro',f:function(c){return c.insertTable({rows:3,cols:3,withHeaderRow:true})}},
  {k:'desplegable',t:'Desplegable',d:'Una pregunta que se abre para ver la respuesta',i:'desplegable',p:'pregunta respuesta acordeon details',
    f:function(c){return c.insertContent({type:'desplegable',content:[{type:'desplegableTitulo'},{type:'desplegableCuerpo',content:[P()]}]})}},
  {k:'columnas',t:'Dos columnas',d:'La primera línea de cada una es su título',i:'columnas',p:'columnas tarjetas',
    f:function(c){return c.insertContent({type:'columnas',content:[{type:'columna',content:[P()]},{type:'columna',content:[P()]}]})}},
  {k:'columnas3',t:'Tres columnas',d:'Como tres tarjetas',i:'columnas',p:'columnas tarjetas',
    f:function(c){return c.insertContent({type:'columnas',content:[{type:'columna',content:[P()]},{type:'columna',content:[P()]},{type:'columna',content:[P()]}]})}},
  {k:'resumen',t:'Resumen',d:'Lo más importante, en un recuadro',i:'resumen',p:'conclusion ideas clave resumen ejecutivo',f:function(c){return c.insertContent({type:'resumen',content:[{type:'bulletList',content:[{type:'listItem',content:[P()]}]}]})}},
  {k:'indice',t:'Índice',d:'La lista de secciones, al día',i:'indice',p:'contenido toc',f:function(c){return c.insertContent({type:'indice'})}},
  {k:'cita',t:'Cita textual',d:'Palabras de otra persona',i:'comillas',p:'blockquote',f:function(c){return c.toggleBlockquote()}},
  {k:'codigo',t:'Bloque de código',d:'Texto con letra de ancho fijo',i:'codigo',p:'programa code',f:function(c){return c.toggleCodeBlock()}},
  {k:'separador',t:'Separador',d:'Una línea horizontal',i:'separador',p:'linea hr',f:function(c){return c.setHorizontalRule()}},
  {k:'citar',t:'Enlace a una página',d:'También escribiendo «@»',i:'enlace',p:'arroba enlace interno pagina seccion vincular',f:function(c){return c.insertContent('@')}}
];
AT.editorInsertar=INSERTAR;

/* ---------- Menú emergente reutilizable ---------- */
/* abrirMenu(ancla, opciones, {alElegir, etiqueta, foco:true|false}) → {cerrar, mover(d), elegir(), filtrar(lista)} */
var menuAbierto=null;
var soltarAtrasMenu=function(){};
function abrirMenu(ancla,items,op){
  cerrarMenu();
  op=op||{};
  /* El botón Atrás del celular cierra el menú (CloseWatcher, base.js) */
  soltarAtrasMenu=AT.alAtras?AT.alAtras(function(){cerrarMenu()}):function(){};
  var conFoco=op.foco!==false,m=el('div','menu'+(op.clase?' '+op.clase:''));
  m.setAttribute('role',conFoco?'menu':'listbox');
  if(op.etiqueta)m.setAttribute('aria-label',op.etiqueta);
  m.id='menu-'+AT.bloques.nuevoId().slice(2);
  var lista=items,i=0;
  function pintar(){
    if(!lista.length){m.innerHTML='<div class="menu-vacio">Nada coincide</div>';return}
    m.innerHTML=lista.map(function(it,k){
      if(it.sep)return '<div class="menu-sep" role="separator"></div>';
      return '<button type="button" class="menu-i'+(it.peligro?' peligro':'')+'" role="'+(conFoco?'menuitem':'option')+'" id="'+m.id+'-'+k+'" data-k="'+k+'" tabindex="-1"'+
        (conFoco?'':' aria-selected="'+(k===i)+'"')+(it.desactivado?' aria-disabled="true"':'')+'>'+
        (it.i?ico(it.i):'')+'<span class="menu-t"><b>'+esc(it.t)+'</b>'+(it.d?'<small>'+esc(it.d)+'</small>':'')+'</span>'+(it.atajo?'<kbd>'+esc(it.atajo)+'</kbd>':'')+'</button>';
    }).join('');
    marcar();
  }
  function botones(){return $$('.menu-i',m)}
  function marcar(){
    var bs=botones();
    bs.forEach(function(b){var on=+b.getAttribute('data-k')===i;b.classList.toggle('activo',on);if(!conFoco)b.setAttribute('aria-selected',on)});
    var b=$('[data-k="'+i+'"]',m);
    if(b){if(conFoco)b.focus({preventScroll:true});b.scrollIntoView({block:'nearest'})}
    if(op.alMarcar)op.alMarcar(b?b.id:'');
  }
  function mover(d){
    if(!lista.length)return;
    var n=lista.length,k=i;
    do{k=(k+d+n)%n}while(lista[k].sep&&k!==i);
    i=k;marcar();
  }
  function elegir(k){
    var it=lista[k==null?i:k];
    if(!it||it.sep||it.desactivado)return;
    cerrarMenu(true);
    op.alElegir(it);
  }
  m.addEventListener('mousedown',function(e){if(!conFoco)e.preventDefault()});
  m.addEventListener('click',function(e){var b=e.target.closest('.menu-i');if(b)elegir(+b.getAttribute('data-k'))});
  m.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();mover(1)}
    else if(e.key==='ArrowUp'){e.preventDefault();mover(-1)}
    else if(e.key==='Home'){e.preventDefault();i=0;marcar()}
    else if(e.key==='End'){e.preventDefault();i=lista.length-1;marcar()}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cerrarMenu()}
    else if(e.key==='Tab'){cerrarMenu()}
  });
  document.body.appendChild(m);
  function colocar(){
    var a=api?api.ancla:ancla,r=typeof a==='function'?a():a.getBoundingClientRect();
    if(!r)return;
    var w=m.offsetWidth,h=m.offsetHeight,vw=innerWidth,vh=(window.visualViewport?visualViewport.height:innerHeight);
    var x=Math.min(Math.max(8,r.left),vw-w-8),y=r.bottom+6;
    if(y+h>vh-8&&r.top-h-6>8)y=r.top-h-6;
    m.style.left=x+'px';m.style.top=Math.max(8,Math.min(y,vh-h-8))+'px';
  }
  var api=null;
  pintar();colocar();
  api={el:m,cerrar:cerrarMenu,mover:mover,elegir:elegir,colocar:colocar,ancla:ancla,devolver:op.devolver,
    filtrar:function(l){lista=l;i=0;pintar();colocar()},
    vacio:function(){return !lista.length}};
  menuAbierto=api;
  setTimeout(function(){document.addEventListener('pointerdown',fuera,true)},0);
  return api;
}
function fuera(e){if(menuAbierto&&!menuAbierto.el.contains(e.target))cerrarMenu()}
function cerrarMenu(sinDevolver){
  if(!menuAbierto)return;
  soltarAtrasMenu();soltarAtrasMenu=function(){};
  var m=menuAbierto;menuAbierto=null;
  document.removeEventListener('pointerdown',fuera,true);
  var tenia=m.el.contains(document.activeElement);
  m.el.remove();
  if(m.devolver&&tenia&&!sinDevolver)m.devolver.focus({preventScroll:true});
}
AT.menu={abrir:abrirMenu,cerrar:cerrarMenu,abierto:function(){return menuAbierto}};

/* ---------- Menú «/» ---------- */
/* Lo que ofrece «/»: cada bloque de un módulo (it.modulo) solo si está encendido (perfil.js) */
function insertables(){return INSERTAR.filter(function(it){return !it.modulo||!AT.perfil||AT.perfil.tiene(it.modulo)})}
function filtrarInsertar(q){
  q=sinAcentos(q);
  if(!q)return insertables();
  /* Primero los que se llaman así (clave o título que empieza con lo escrito), después los que lo mencionan */
  function rango(it){var k=sinAcentos(it.k),t=sinAcentos(it.t);return k===q?0:k.indexOf(q)===0||t.indexOf(q)===0?1:t.indexOf(q)>=0?2:3}
  return insertables().map(function(it,i){return {it:it,i:i}})
    .filter(function(o){return sinAcentos(o.it.t+' '+o.it.p+' '+o.it.k).indexOf(q)>=0})
    .sort(function(a,b){return rango(a.it)-rango(b.it)||a.i-b.i}).map(function(o){return o.it});
}
var claveBarra=new pm.PluginKey('menuBarra');
var MenuBarra=T.Extension.create({
  name:'menuBarra',
  addProseMirrorPlugins:function(){
    var editor=this.editor;
    return [T.Suggestion({
      editor:editor,char:'/',pluginKey:claveBarra,startOfLine:false,allowSpaces:false,
      allow:function(o){var $f=o.state.doc.resolve(o.range.from);return $f.parent.type.name==='paragraph'||$f.parent.type.name==='heading'},
      items:function(o){return filtrarInsertar(o.query)},
      command:function(o){
        o.editor.chain().focus().deleteRange(o.range).run();
        o.props.f(o.editor.chain().focus()).run();
      },
      render:function(){
        var menu=null,ultimas=null;
        function rect(props){return function(){return props.clientRect&&props.clientRect()}}
        /* Se usa siempre lo último que escribiste después de «/» (para borrar justo eso al elegir) */
        function elegir(it){if(ultimas)ultimas.command(it)}
        function aria(id){
          var d=editor.view.dom;
          if(id)d.setAttribute('aria-activedescendant',id);else d.removeAttribute('aria-activedescendant');
        }
        return {
          onStart:function(props){
            ultimas=props;
            menu=abrirMenu(rect(props),props.items,{foco:false,etiqueta:'Insertar bloque',clase:'menu-barra',alMarcar:aria,alElegir:elegir});
            editor.view.dom.setAttribute('aria-controls',menu.el.id);
          },
          onUpdate:function(props){
            ultimas=props;
            if(!menu||menuAbierto!==menu)menu=abrirMenu(rect(props),props.items,{foco:false,etiqueta:'Insertar bloque',clase:'menu-barra',alMarcar:aria,alElegir:elegir});
            else{menu.ancla=rect(props);menu.filtrar(props.items)}
          },
          onKeyDown:function(props){
            if(!menu||menuAbierto!==menu)return false;
            var e=props.event;
            if(e.key==='ArrowDown'){menu.mover(1);return true}
            if(e.key==='ArrowUp'){menu.mover(-1);return true}
            if(e.key==='Enter'){if(menu.vacio())return false;menu.elegir();return true}
            if(e.key==='Escape'){cerrarMenu();return true}
            return false;
          },
          onExit:function(){if(menu&&menuAbierto===menu)cerrarMenu();menu=null;ultimas=null;aria('');editor.view.dom.removeAttribute('aria-controls')}
        };
      }
    })];
  }
});

/* ---------- Menú «@»: enlazar otra de tus páginas o una de sus secciones ---------- */
var claveArroba=new pm.PluginKey('menuCita');
var CITABLES={documento:1,'seccion-doc':1};
function opcionesDeCita(q){
  if(!AT.indice)return Promise.resolve([]);
  return AT.indice.cargar().then(function(todas){
    var propias=todas.filter(function(e){return CITABLES[e.tipo]&&e.docId!==AT.documentoAbierto});
    var lista=q.trim()?AT.indice.buscar(q,propias,10):propias.filter(function(e){return e.tipo==='documento'}).slice(0,10);
    return lista.map(function(e){
      var tx=e.titulo.length>70?e.titulo.slice(0,70).replace(/\s+\S*$/,'')+'…':e.titulo;
      return {t:e.titulo,d:e.sub,i:e.icono,href:e.href,texto:tx};
    });
  });
}
var MenuCita=T.Extension.create({
  name:'menuCita',
  addProseMirrorPlugins:function(){
    var editor=this.editor;
    return [T.Suggestion({
      editor:editor,char:'@',pluginKey:claveArroba,allowSpaces:true,startOfLine:false,
      items:function(o){return opcionesDeCita(o.query)},
      command:function(o){
        o.editor.chain().focus().insertContentAt(o.range,[{type:'cita',attrs:{href:o.props.href,texto:o.props.texto}},{type:'text',text:' '}]).run();
      },
      render:function(){
        var menu=null,ultimas=null;
        function rect(props){return function(){return props.clientRect&&props.clientRect()}}
        function elegir(it){if(ultimas)ultimas.command(it)}
        function aria(id){var d=editor.view.dom;if(id)d.setAttribute('aria-activedescendant',id);else d.removeAttribute('aria-activedescendant')}
        function lista(props){
          if(props.items.length)return props.items;
          return [{t:props.query.trim()?'Nada coincide con «'+props.query.trim()+'»':'Todavía no hay páginas que enlazar',d:'Crea más páginas o títulos de sección',i:'enlace',desactivado:true}];
        }
        return {
          onStart:function(props){ultimas=props;menu=abrirMenu(rect(props),lista(props),{foco:false,etiqueta:'Enlazar',clase:'menu-barra menu-cita',alMarcar:aria,alElegir:elegir})},
          onUpdate:function(props){
            ultimas=props;
            if(!menu||menuAbierto!==menu)menu=abrirMenu(rect(props),lista(props),{foco:false,etiqueta:'Enlazar',clase:'menu-barra menu-cita',alMarcar:aria,alElegir:elegir});
            else{menu.ancla=rect(props);menu.filtrar(lista(props))}
          },
          onKeyDown:function(props){
            if(!menu||menuAbierto!==menu)return false;
            var e=props.event;
            if(e.key==='ArrowDown'){menu.mover(1);return true}
            if(e.key==='ArrowUp'){menu.mover(-1);return true}
            if(e.key==='Enter'){if(!ultimas||!ultimas.items.length)return false;menu.elegir();return true}
            if(e.key==='Escape'){cerrarMenu();return true}
            return false;
          },
          onExit:function(){if(menu&&menuAbierto===menu)cerrarMenu();menu=null;ultimas=null;aria('')}
        };
      }
    })];
  }
});

/* ---------- Mover, duplicar y borrar el bloque actual ---------- */
function bloqueActual(state){
  var $f=state.selection.$from;
  if(state.selection instanceof pm.NodeSelection&&state.selection.$from.depth===0)return {pos:state.selection.from,node:state.selection.node};
  if($f.depth<1)return null;
  return {pos:$f.before(1),node:$f.node(1)};
}
function moverBloque(editor,d,pos){
  var s=editor.state,b=pos!=null?{pos:pos,node:s.doc.nodeAt(pos)}:bloqueActual(s);
  if(!b||!b.node)return false;
  var $p=s.doc.resolve(b.pos),i=$p.index(0);
  if(d<0&&i===0||d>0&&i>=s.doc.childCount-1)return false;
  var otro=s.doc.child(i+d),tr=s.tr,offset=s.selection.from-b.pos;
  if(d<0){
    var destino=b.pos-otro.nodeSize;
    tr.delete(b.pos,b.pos+b.node.nodeSize).insert(destino,b.node);
    tr.setSelection(pm.Selection.near(tr.doc.resolve(Math.min(destino+offset,tr.doc.content.size))));
  }else{
    tr.delete(b.pos,b.pos+b.node.nodeSize);
    var dest=b.pos+otro.nodeSize;
    tr.insert(dest,b.node);
    tr.setSelection(pm.Selection.near(tr.doc.resolve(Math.min(dest+offset,tr.doc.content.size))));
  }
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}
function duplicarBloque(editor,pos){
  var s=editor.state,b=pos!=null?{pos:pos,node:s.doc.nodeAt(pos)}:bloqueActual(s);
  if(!b||!b.node)return false;
  var copia=b.node.type.create(Object.assign({},b.node.attrs,'id' in b.node.attrs?{id:null}:{}),b.node.content,b.node.marks);
  var tr=s.tr.insert(b.pos+b.node.nodeSize,copia);
  editor.view.dispatch(tr.scrollIntoView());editor.view.focus();
  return true;
}
function borrarBloque(editor,pos){
  var s=editor.state,b=pos!=null?{pos:pos,node:s.doc.nodeAt(pos)}:bloqueActual(s);
  if(!b||!b.node)return false;
  var tr=s.tr.delete(b.pos,b.pos+b.node.nodeSize);
  if(!tr.doc.childCount)tr.insert(0,s.schema.nodes.paragraph.create());
  tr.setSelection(pm.Selection.near(tr.doc.resolve(Math.min(b.pos,tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView());editor.view.focus();
  return true;
}
var Atajos=T.Extension.create({
  name:'atajosDeBloque',
  addKeyboardShortcuts:function(){
    var ed=this.editor;
    return {
      'Alt-ArrowUp':function(){return moverBloque(ed,-1)},
      'Alt-ArrowDown':function(){return moverBloque(ed,1)},
      'Mod-Shift-d':function(){return duplicarBloque(ed)},
      /* Ctrl K con texto seleccionado crea un enlace; sin selección, deja pasar la tecla a la búsqueda */
      'Mod-k':function(){if(ed.state.selection.empty&&!ed.isActive('link'))return false;if(AT.editorActual)AT.editorActual.enlace();return true}
    };
  }
});
/* Opciones de un bloque (desde el asa ⋮⋮ o desde la barra) */
function opcionesDeBloque(editor,pos){
  var n=editor.state.doc.nodeAt(pos);
  if(!n)return [];
  var items=[
    {t:'Mover arriba',i:'up',atajo:'Alt+↑',f:function(){moverBloque(editor,-1,pos)}},
    {t:'Mover abajo',i:'down',atajo:'Alt+↓',f:function(){moverBloque(editor,1,pos)}},
    {t:'Duplicar',i:'copiar',atajo:'Ctrl+Mayús+D',f:function(){duplicarBloque(editor,pos)}}
  ];
  if(n.type.name==='callout'){
    items.push({sep:true});
    VARIANTES.forEach(function(v){
      items.push({t:'Callout: '+v[1],i:v[2],desactivado:(n.attrs.variante||'')===v[0],f:function(){
        editor.view.dispatch(editor.state.tr.setNodeAttribute(pos,'variante',v[0]));editor.view.focus();
      }});
    });
  }
  if(/^(paragraph|heading)$/.test(n.type.name)){
    items.push({sep:true});
    [['Texto','texto',function(c){return c.setParagraph()}],['Título de sección','titulo',function(c){return c.setHeading({level:2})}],['Subtítulo','subtitulo',function(c){return c.setHeading({level:3})}]].forEach(function(x){
      items.push({t:'Convertir en '+x[0].toLowerCase(),i:x[1],f:function(){x[2](editor.chain().focus().setTextSelection(pos+1)).run()}});
    });
  }
  items.push({sep:true},{t:'Eliminar bloque',i:'basura',peligro:true,f:function(){borrarBloque(editor,pos)}});
  return items;
}

/* ---------- Asa de bloque: «+» inserta debajo, «⋮⋮» arrastra o abre opciones ---------- */
function crearAsa(editor,envoltura){
  var view=editor.view,asa=el('div','asa');
  asa.innerHTML='<button type="button" class="asa-b" data-a="mas" tabindex="-1" aria-label="Insertar un bloque debajo" title="Insertar un bloque debajo">'+ico('mas')+'</button>'+
    /* Un div y no un botón: algunos navegadores no dejan arrastrar botones. Con teclado, las mismas
       opciones están en la barra («Opciones del bloque») y en Alt+↑/↓ */
    '<div class="asa-b" data-a="menu" role="button" tabindex="-1" draggable="true" aria-label="Opciones del bloque (arrastra para moverlo)" title="Arrastra para mover · clic para opciones">'+ico('arrastre')+'</div>';
  asa.hidden=true;
  envoltura.appendChild(asa);
  var pos=null,dom=null;
  function bloques(){
    var out=[],p=0;
    view.state.doc.forEach(function(n,o){out.push({pos:o,dom:view.nodeDOM(o)})});
    return out.filter(function(b){return b.dom&&b.dom.nodeType===1});
  }
  function mostrar(b){
    pos=b.pos;dom=b.dom;
    var r=dom.getBoundingClientRect(),re=envoltura.getBoundingClientRect();
    var cs=getComputedStyle(dom),lh=parseFloat(cs.lineHeight)||24,mt=0;
    if(/^H[23]$/.test(dom.tagName))mt=parseFloat(cs.marginTop)>0?0:0;
    asa.style.top=(r.top-re.top+Math.max(0,(Math.min(lh,r.height)-28)/2))+'px';
    asa.hidden=false;
  }
  function ocultar(){if(!arrastrando)asa.hidden=true}
  envoltura.addEventListener('mousemove',function(e){
    if(e.target.closest&&e.target.closest('.asa'))return;
    var y=e.clientY,best=null;
    bloques().forEach(function(b){var r=b.dom.getBoundingClientRect();if(y>=r.top-8&&y<=r.bottom+8)best=b});
    if(best)mostrar(best);
  });
  envoltura.addEventListener('mouseleave',function(e){if(!asa.contains(e.relatedTarget))ocultar()});
  asa.addEventListener('mousedown',function(e){if(e.target.closest('[data-a="mas"]'))e.preventDefault()});
  asa.addEventListener('click',function(e){
    var b=e.target.closest('.asa-b');
    if(!b||pos==null)return;
    var n=view.state.doc.nodeAt(pos);
    if(!n)return;
    if(b.getAttribute('data-a')==='mas'){
      var fin=pos+n.nodeSize;
      /* Un párrafo vacío se reutiliza; si no, se crea uno debajo */
      if(n.type.name==='paragraph'&&!n.content.size)editor.chain().focus().setTextSelection(pos+1).insertContent('/').run();
      else editor.chain().focus().insertContentAt(fin,{type:'paragraph'}).setTextSelection(fin+1).insertContent('/').run();
    }else{
      var p0=pos;
      abrirMenu(b,opcionesDeBloque(editor,p0),{etiqueta:'Opciones del bloque',devolver:view.dom,alElegir:function(it){it.f()}});
    }
  });
  var arrastrando=false;
  asa.addEventListener('dragstart',function(e){
    if(pos==null||!dom)return;
    var sel=pm.NodeSelection.create(view.state.doc,pos);
    view.dispatch(view.state.tr.setSelection(sel));
    var slice=sel.content();
    try{
      e.dataTransfer.clearData();
      e.dataTransfer.setData('text/plain',slice.content.textBetween(0,slice.content.size,'\n'));
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setDragImage(dom,0,0);
    }catch(x){}
    view.dragging={slice:slice,move:true};
    arrastrando=true;envoltura.classList.add('arrastrando');
  });
  asa.addEventListener('dragend',function(){arrastrando=false;envoltura.classList.remove('arrastrando');asa.hidden=true});
  /* En pantallas táctiles, el asa acompaña al bloque donde está el cursor */
  editor.on('selectionUpdate',function(){
    if(!matchMedia('(hover: none)').matches)return;
    var b=bloqueActual(editor.state);
    if(!b)return;
    var d=view.nodeDOM(b.pos);
    if(d&&d.nodeType===1)mostrar({pos:b.pos,dom:d});
  });
  editor.on('update',function(){if(!asa.hidden&&dom&&!dom.isConnected)asa.hidden=true});
  return asa;
}

/* ---------- Barra de herramientas ---------- */
var BOTONES=[
  {k:'deshacer',t:'Deshacer',i:'deshacer',atajo:'Ctrl+Z',f:function(c){return c.undo()},puede:function(e){return e.can().undo()}},
  {k:'rehacer',t:'Rehacer',i:'rehacer',atajo:'Ctrl+Mayús+Z',f:function(c){return c.redo()},puede:function(e){return e.can().redo()}},
  {sep:true},
  {k:'bloque',t:'Tipo de bloque',menu:'bloque',texto:true},
  {sep:true},
  {k:'bold',t:'Negrita',txt:'B',cls:'tb-b',atajo:'Ctrl+B',f:function(c){return c.toggleBold()},on:'bold'},
  {k:'italic',t:'Cursiva',txt:'I',cls:'tb-i',atajo:'Ctrl+I',f:function(c){return c.toggleItalic()},on:'italic'},
  {k:'underline',t:'Subrayado',txt:'U',cls:'tb-u',atajo:'Ctrl+U',f:function(c){return c.toggleUnderline()},on:'underline'},
  {k:'strike',t:'Tachado',txt:'S',cls:'tb-s',atajo:'Ctrl+Mayús+S',f:function(c){return c.toggleStrike()},on:'strike'},
  {k:'highlight',t:'Resaltar',i:'resaltar',atajo:'Ctrl+Mayús+H',f:function(c){return c.toggleHighlight()},on:'highlight'},
  {k:'code',t:'Código',i:'codigo',atajo:'Ctrl+E',f:function(c){return c.toggleCode()},on:'code'},
  {k:'link',t:'Enlace',i:'enlace',atajo:'Ctrl+K',enlace:true,on:'link'},
  {sep:true},
  {k:'bullet',t:'Lista con viñetas',i:'lista',f:function(c){return c.toggleBulletList()},on:'bulletList'},
  {k:'ordered',t:'Lista numerada',i:'lista-num',f:function(c){return c.toggleOrderedList()},on:'orderedList'},
  {k:'task',t:'Lista de tareas',i:'tareas',f:function(c){return c.toggleTaskList()},on:'taskList'},
  {sep:true},
  {k:'insertar',t:'Insertar',i:'mas',menu:'insertar',etiqueta:'Insertar'},
  {k:'opciones',t:'Opciones del bloque',i:'arrastre',menu:'opciones'},
  {k:'tabla',t:'Tabla',i:'tabla',menu:'tabla',solo:'table'}
];
function crearBarra(editor,host){
  var b=el('div','tb');
  b.setAttribute('role','toolbar');b.setAttribute('aria-label','Herramientas de edición');
  b.innerHTML=BOTONES.map(function(x){
    if(x.sep)return '<span class="tb-sep" aria-hidden="true"></span>';
    var tit=x.t+(x.atajo?' ('+x.atajo+')':'');
    return '<button type="button" class="tb-btn'+(x.cls?' '+x.cls:'')+(x.texto?' tb-tipo':'')+'" data-k="'+x.k+'" tabindex="-1" title="'+esc(tit)+'" aria-label="'+esc(x.t)+'"'+
      (x.on?' aria-pressed="false"':'')+(x.menu?' aria-haspopup="menu"':'')+(x.solo?' hidden':'')+'>'+
      (x.i?ico(x.i):'')+(x.txt?'<span aria-hidden="true">'+x.txt+'</span>':'')+(x.texto?'<span class="tb-tipo-t">Texto</span>'+ico('down','tb-car'):'')+(x.etiqueta?'<span class="tb-et">'+x.etiqueta+'</span>':'')+'</button>';
  }).join('');
  host.appendChild(b);
  var btns=function(){return $$('.tb-btn',b).filter(function(x){return !x.hidden})};
  /* Patrón de barra de herramientas: un solo botón en el orden de Tab; las flechas mueven entre ellos */
  var activo=0;
  function rovin(){btns().forEach(function(x,k){x.tabIndex=k===activo?0:-1})}
  b.addEventListener('keydown',function(e){
    var bs=btns(),i=bs.indexOf(document.activeElement);
    if(i<0)return;
    var j=-1;
    if(e.key==='ArrowRight')j=(i+1)%bs.length;
    else if(e.key==='ArrowLeft')j=(i-1+bs.length)%bs.length;
    else if(e.key==='Home')j=0;else if(e.key==='End')j=bs.length-1;
    if(j<0)return;
    e.preventDefault();activo=j;rovin();bs[j].focus();
  });
  b.addEventListener('focusin',function(e){var i=btns().indexOf(e.target);if(i>=0){activo=i;rovin()}});
  b.addEventListener('mousedown',function(e){if(e.target.closest('.tb-btn'))e.preventDefault()});
  b.addEventListener('click',function(e){
    var t=e.target.closest('.tb-btn');
    if(!t||t.getAttribute('aria-disabled')==='true')return;
    var x=BOTONES.filter(function(y){return y.k===t.getAttribute('data-k')})[0];
    if(!x)return;
    var deTeclado=e.detail===0;
    if(x.enlace){api.enlace(t);return}
    if(x.menu){abrirMenuBarra(x.menu,t,deTeclado);return}
    x.f(editor.chain().focus()).run();
  });
  function abrirMenuBarra(cual,t,deTeclado){
    var items;
    if(cual==='insertar')items=insertables().map(function(it){return {t:it.t,d:it.d,i:it.i,f:function(){it.f(editor.chain().focus()).run()}}});
    else if(cual==='bloque')items=INSERTAR.slice(0,3).concat(INSERTAR.slice(3,6)).map(function(it){return {t:it.t,i:it.i,f:function(){it.f(editor.chain().focus()).run()}}});
    else if(cual==='opciones'){var bq=bloqueActual(editor.state);items=bq?opcionesDeBloque(editor,bq.pos):[]}
    else if(cual==='tabla')items=[
      {t:'Fila arriba',i:'mas',f:function(){editor.chain().focus().addRowBefore().run()}},
      {t:'Fila abajo',i:'mas',f:function(){editor.chain().focus().addRowAfter().run()}},
      {t:'Columna a la izquierda',i:'mas',f:function(){editor.chain().focus().addColumnBefore().run()}},
      {t:'Columna a la derecha',i:'mas',f:function(){editor.chain().focus().addColumnAfter().run()}},
      {sep:true},
      {t:'Fila de títulos',i:'tabla',f:function(){editor.chain().focus().toggleHeaderRow().run()}},
      {sep:true},
      {t:'Quitar fila',i:'close',peligro:true,f:function(){editor.chain().focus().deleteRow().run()}},
      {t:'Quitar columna',i:'close',peligro:true,f:function(){editor.chain().focus().deleteColumn().run()}},
      {t:'Quitar tabla',i:'basura',peligro:true,f:function(){editor.chain().focus().deleteTable().run()}}
    ];
    if(cual==='tabla'&&AT.editorMenuTabla)items=AT.editorMenuTabla(editor,items);
    if(!items.length)return;
    t.setAttribute('aria-expanded','true');
    var m=abrirMenu(t,items,{etiqueta:t.getAttribute('aria-label'),devolver:t,alElegir:function(it){it.f()}});
    var obs=new MutationObserver(function(){if(!m.el.isConnected){t.setAttribute('aria-expanded','false');obs.disconnect()}});
    obs.observe(document.body,{childList:true});
    if(!deTeclado){/* con ratón, el foco queda en el menú igual: así funcionan las flechas */}
  }
  function pintar(){
    BOTONES.forEach(function(x){
      if(x.sep)return;
      var t=$('[data-k="'+x.k+'"]',b);
      if(x.on)t.setAttribute('aria-pressed',editor.isActive(x.on)?'true':'false');
      if(x.puede)t.setAttribute('aria-disabled',x.puede(editor)?'false':'true');
      if(x.solo)t.hidden=!editor.isActive(x.solo);
    });
    var tipo='Texto';
    if(editor.isActive('heading',{level:2}))tipo='Título de sección';
    else if(editor.isActive('heading',{level:3}))tipo='Subtítulo';
    else if(editor.isActive('bulletList'))tipo='Viñetas';
    else if(editor.isActive('orderedList'))tipo='Numerada';
    else if(editor.isActive('taskList'))tipo='Tareas';
    else if(editor.isActive('codeBlock'))tipo='Código';
    $('.tb-tipo-t',b).textContent=tipo;
    $('[data-k="bloque"]',b).setAttribute('aria-label','Tipo de bloque: '+tipo);
    var bs=btns();if(activo>=bs.length)activo=0;rovin();
  }
  editor.on('transaction',pintar);
  pintar();
  var api={el:b,pintar:pintar,enlace:function(ancla){pedirEnlace(editor,ancla||$('[data-k="link"]',b))}};
  return api;
}

/* Enlace: un pequeño formulario junto a la barra */
function pedirEnlace(editor,ancla){
  cerrarMenu();
  var previo=editor.getAttributes('link').href||'';
  var f=el('form','menu menu-enlace');
  f.setAttribute('role','dialog');f.setAttribute('aria-label','Enlace');
  f.innerHTML='<label for="enlUrl">Dirección del enlace</label><input id="enlUrl" type="url" inputmode="url" placeholder="https://…" value="'+esc(previo)+'">'+
    '<div class="menu-bt"><button class="btn pri" type="submit">Aplicar</button>'+(previo?'<button class="btn" type="button" data-q>Quitar enlace</button>':'')+'<button class="btn" type="button" data-x>Cancelar</button></div>';
  document.body.appendChild(f);
  var r=ancla.getBoundingClientRect();
  f.style.left=Math.max(8,Math.min(r.left,innerWidth-f.offsetWidth-8))+'px';f.style.top=(r.bottom+6)+'px';
  var inp=$('input',f);inp.focus();inp.select();
  function cerrar(){f.remove();document.removeEventListener('pointerdown',afuera,true);editor.commands.focus()}
  function afuera(e){if(!f.contains(e.target))cerrar()}
  setTimeout(function(){document.addEventListener('pointerdown',afuera,true)},0);
  f.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cerrar()}});
  f.addEventListener('click',function(e){
    if(e.target.closest('[data-x]'))cerrar();
    else if(e.target.closest('[data-q]')){editor.chain().focus().extendMarkRange('link').unsetLink().run();cerrar()}
  });
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var u=inp.value.trim();
    if(u&&!/^[a-z][a-z0-9+.-]*:/i.test(u)&&!/^[#/.]/.test(u))u='https://'+u;
    var seguro=AT.bloques.hrefSeguro(u);
    if(!u)editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else if(!seguro){inp.setCustomValidity('Esa dirección no está permitida');inp.reportValidity();return}
    else if(editor.state.selection.empty&&!editor.isActive('link'))editor.chain().focus().insertContent({type:'text',text:u,marks:[{type:'link',attrs:{href:seguro}}]}).run();
    else editor.chain().focus().extendMarkRange('link').setLink({href:seguro}).run();
    cerrar();
  });
}

/* ---------- Crear un editor ---------- */
var PISTAS={heading:function(n){return n.attrs.level===2?'Título de sección':'Subtítulo'},desplegableTitulo:function(){return 'Escribe la pregunta o el título'},
  codeBlock:function(){return 'Código'}};
/* Prepara el documento para el editor sin negarse a abrirlo: quita lo dañado (texto vacío, formatos desconocidos)
   y envuelve en «legado» lo que no conoce, para no perderlo (enLin: dentro de un párrafo o un título) */
function legadoDe(n,enLin){
  var a={json:JSON.stringify(n)};
  if(!enLin&&n.attrs&&typeof n.attrs.id==='string')a.id=n.attrs.id;
  return {type:enLin?'legadoLinea':'legado',attrs:a};
}
function limpiar(n,schema,enLin){
  if(!n||typeof n!=='object')return null;
  if(n.type==='text'){
    if(typeof n.text!=='string'||!n.text)return null;
    var t={type:'text',text:n.text},ms=(Array.isArray(n.marks)?n.marks:[]).filter(function(m){return m&&schema.marks[m.type]});
    if(ms.length)t.marks=ms;
    return t;
  }
  if(typeof n.type!=='string'||!n.type)return null;
  var tipo=schema.nodes[n.type];
  if(!tipo)return legadoDe(n,enLin);
  var o={type:n.type};
  if(n.attrs&&typeof n.attrs==='object')o.attrs=n.attrs;
  if(Array.isArray(n.content))o.content=n.content.map(function(c){return limpiar(c,schema,tipo.inlineContent)}).filter(Boolean);
  return o;
}
function contenidoSeguro(json,schema){
  var originales=json&&json.type==='doc'&&Array.isArray(json.content)?json.content:[];
  var bloques=originales.map(function(b){
    var l=limpiar(b,schema,false);
    if(!l)return null;
    try{schema.nodeFromJSON(l).check();return l}
    catch(e){
      /* Un bloque que no cuadra con el esquema tampoco se pierde: entra entero como legado */
      if(window.console)console.warn('OneBook: un bloque no se pudo abrir y se conserva tal cual',b&&b.type);
      return b&&typeof b==='object'?legadoDe(b,false):null;
    }
  }).filter(Boolean);
  if(!bloques.length)bloques=[{type:'paragraph'}];
  return {type:'doc',content:bloques};
}
/* Lo que sale del editor: los bloques envueltos vuelven a ser los originales (con el id que tengan ahora) */
function desenvolver(n){
  if(!n||typeof n!=='object')return n;
  if(n.type==='legado'||n.type==='legadoLinea'){
    var o=null;
    try{o=JSON.parse((n.attrs&&n.attrs.json)||'null')}catch(e){}
    if(!o||typeof o!=='object')return null;
    if(n.type==='legado'&&n.attrs.id)o=Object.assign({},o,{attrs:Object.assign({},o.attrs||{},{id:n.attrs.id})});
    return o;
  }
  if(!Array.isArray(n.content))return n;
  return Object.assign({},n,{content:n.content.map(desenvolver).filter(Boolean)});
}
function crear(o){
  var envoltura=el('div','editor');
  o.host.appendChild(envoltura);
  var cambio=null;
  var editor=new T.Editor({
    element:envoltura,
    content:{type:'doc',content:[{type:'paragraph'}]},
    editorProps:{attributes:{class:'ed-cuerpo','aria-label':o.etiqueta||'Contenido del documento',lang:'es','aria-multiline':'true',role:'textbox'}},
    extensions:[
      T.StarterKit.configure({
        heading:{levels:[2,3]},
        dropcursor:{color:'var(--accent)',width:2},
        link:{openOnClick:false,autolink:true,linkOnPaste:true,defaultProtocol:'https',
          isAllowedUri:function(url,ctx){return !!AT.bloques.hrefSeguro(url)&&ctx.defaultValidate(url)},
          HTMLAttributes:{rel:'noopener noreferrer',target:'_blank'}}
      }),
      T.Highlight,T.Subscript,T.Superscript,
      T.TaskList.configure({HTMLAttributes:{class:'tareas'}}),T.TaskItem.configure({nested:true}),
      T.Table.configure({resizable:false,HTMLAttributes:{class:'ed-tabla'}}),T.TableRow,T.TableHeader,T.TableCell,
      /* Los títulos vacíos siempre muestran qué va ahí; los párrafos, solo donde está el cursor */
      T.Placeholder.configure({includeChildren:true,showOnlyCurrent:false,placeholder:function(x){
        var f=PISTAS[x.node.type.name];
        if(f)return f(x.node);
        if(!x.hasAnchor)return '';
        return x.editor.state.doc.childCount===1?'Empieza a escribir, o pulsa / para insertar un bloque':'Escribe, o pulsa / para insertar un bloque';
      }}),
      T.CharacterCount,
      Ids,Callout,Columnas,Columna,Desplegable,DesplegableTitulo,DesplegableCuerpo,Resumen,Indice,Legado,LegadoLinea,
      Cita,ClicCita,MenuBarra,MenuCita,Atajos
    ].concat(AT.editorExtensiones||[],o.extensiones||[]),
    onUpdate:function(){
      indices.forEach(function(v){v.pintar()});
      clearTimeout(cambio);
      cambio=setTimeout(function(){if(o.alCambiar)o.alCambiar(desenvolver(editor.getJSON()))},o.espera||500);
      if(o.alEscribir)o.alEscribir();
    }
  });
  /* El documento entra ya limpio, sin quedar en el historial de deshacer */
  editor.commands.setContent(contenidoSeguro(o.contenido,editor.schema),{emitUpdate:false});
  editor.view.dispatch(editor.state.tr.setMeta('addToHistory',false));
  /* Ids para lo que llegó sin ellos */
  editor.view.dispatch(editor.state.tr.setMeta(claveIds,true).setMeta('addToHistory',false));
  var barra=o.barra?crearBarra(editor,o.barra):null;
  var asa=crearAsa(editor,envoltura);
  var api={
    tiptap:editor,
    json:function(){return desenvolver(editor.getJSON())},
    palabras:function(){return editor.storage.characterCount.words()},
    /* Pone el cursor ya (sin esperar un cuadro): al principio, en el primer lugar donde se puede escribir */
    enfocar:function(donde){
      var v=editor.view,doc=v.state.doc;
      var sel=donde==='end'?pm.Selection.findFrom(doc.resolve(doc.content.size),-1,true):pm.Selection.findFrom(doc.resolve(0),1,true);
      if(sel)v.dispatch(v.state.tr.setSelection(sel).scrollIntoView());
      v.focus();
    },
    guardarYa:function(){clearTimeout(cambio);if(o.alCambiar)o.alCambiar(desenvolver(editor.getJSON()))},
    enlace:function(){if(barra)barra.enlace()},
    insertar:function(k){var it=INSERTAR.filter(function(x){return x.k===k})[0];if(it)it.f(editor.chain().focus()).run()},
    destruir:function(){clearTimeout(cambio);cerrarMenu();editor.destroy();envoltura.remove();if(barra)barra.el.remove()}
  };
  AT.editorActual=api;
  return api;
}
AT.editor={crear:crear,moverBloque:moverBloque,duplicarBloque:duplicarBloque,svg:svg,bloqueActual:bloqueActual};
})();
