/* OneLearn: el editor de documentos (Tiptap, en assets/vendor/tiptap.min.js como window.Tiptap).
   AT.editor.crear({host, barra, contenido, alCambiar}) monta un editor que escribe el mismo formato de
   bloques que dibuja bloques.js, así que lo que escribes se ve como una lección oficial.
   - Bloques propios: callout, columnas, desplegable, preguntas de repaso, resumen, índice y laboratorio.
   - Cada bloque de primer nivel recibe un identificador fijo (ancla de marcadores y citas).
   - Barra de herramientas (role=toolbar, con flechas), menú «/» para insertar, asa «+ ⋮⋮» para insertar,
     arrastrar y abrir las opciones de un bloque, y atajos: Alt+↑/↓ mueven el bloque, Ctrl+Mayús+D lo duplica.
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
  'callout','columnas','desplegable','laboratorio','repaso','indice','resumen','bibliografia','declaracion',
  'figura','tablaNumerada','ecuacion','indicePiezas','pagos'];
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
      /* Figuras, tablas y ecuaciones numeradas: una clave única en cualquier nivel (la usan las referencias cruzadas) */
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
var Laboratorio=atomo('laboratorio',function(p){
  var dom=el('div','demo ed-lab');dom.contentEditable='false';
  dom.innerHTML='<div class="demo-h"><b></b><span class="tag lab">Laboratorio</span></div><div class="demo-b"><p class="hint">Los laboratorios funcionan dentro de su lección; aquí se muestra solo su lugar.</p></div>';
  $('b',dom).textContent=p.node.attrs.titulo||'Laboratorio';
  return {dom:dom,ignoreMutation:function(){return true}};
},{addAttributes:function(){return {nombre:{default:''},titulo:{default:''}}}});

/* Preguntas de repaso: se editan con un formulario dentro del documento */
function preguntaVacia(){return {q:'',o:['',''],a:0,e:''}}
var Repaso=atomo('repaso',function(p){
  var dom=el('div','ed-repaso');dom.contentEditable='false';
  var datos=[],firma='';
  function leer(n){datos=JSON.parse(JSON.stringify(n.attrs.preguntas||[]));if(!datos.length)datos=[preguntaVacia()];firma=JSON.stringify(n.attrs.preguntas||[])}
  function guardar(){
    var pos=typeof p.getPos==='function'?p.getPos():null;
    if(pos==null)return;
    firma=JSON.stringify(datos);
    p.editor.view.dispatch(p.editor.state.tr.setNodeAttribute(pos,'preguntas',JSON.parse(firma)));
  }
  var uid=AT.bloques.nuevoId().slice(2);
  function pintar(){
    var h='<div class="ed-rep-h"><span class="ed-et">Preguntas de repaso</span><span class="ed-rep-n">'+datos.length+(datos.length===1?' pregunta':' preguntas')+'</span></div>';
    datos.forEach(function(q,i){
      h+='<fieldset class="ed-q" data-i="'+i+'"><legend>Pregunta '+(i+1)+'</legend>'+
        '<label class="ed-campo"><span>Pregunta</span><textarea rows="2" data-c="q" placeholder="Escribe la pregunta">'+esc(q.q)+'</textarea></label>'+
        '<div class="ed-ops" role="group" aria-label="Opciones de la pregunta '+(i+1)+'">'+
        q.o.map(function(o,j){
          return '<div class="ed-op"><input type="radio" name="c-'+uid+'-'+i+'" data-c="a" data-j="'+j+'"'+(q.a===j?' checked':'')+' aria-label="Opción '+(j+1)+' es la correcta">'+
            '<input type="text" data-c="o" data-j="'+j+'" value="'+esc(o)+'" placeholder="Opción '+(j+1)+'" aria-label="Opción '+(j+1)+'">'+
            (q.o.length>2?'<button type="button" class="ed-mini" data-acc="quitarOp" data-j="'+j+'" aria-label="Quitar la opción '+(j+1)+'">'+ico('close')+'</button>':'')+'</div>';
        }).join('')+
        (q.o.length<6?'<button type="button" class="ed-link" data-acc="op">+ Opción</button>':'')+
        '</div><p class="ed-ayuda">Marca la opción correcta con el círculo.</p>'+
        '<label class="ed-campo"><span>Explicación (se muestra al responder)</span><input type="text" data-c="e" value="'+esc(q.e)+'"></label>'+
        (datos.length>1?'<button type="button" class="ed-link ed-quitar" data-acc="quitar">Quitar esta pregunta</button>':'')+
        '</fieldset>';
    });
    h+='<button type="button" class="btn" data-acc="agregar">+ Agregar pregunta</button>';
    dom.innerHTML=h;
  }
  dom.addEventListener('input',function(e){
    var t=e.target,f=t.closest('.ed-q');
    if(!f)return;
    var q=datos[+f.getAttribute('data-i')],c=t.getAttribute('data-c');
    if(c==='q')q.q=t.value;
    else if(c==='e')q.e=t.value;
    else if(c==='o')q.o[+t.getAttribute('data-j')]=t.value;
    else if(c==='a')q.a=+t.getAttribute('data-j');
    guardar();
  });
  dom.addEventListener('change',function(e){if(e.target.getAttribute('data-c')==='a'){dom.dispatchEvent(new Event('input',{bubbles:true}))}});
  dom.addEventListener('click',function(e){
    var b=e.target.closest('[data-acc]');
    if(!b)return;
    var f=b.closest('.ed-q'),i=f?+f.getAttribute('data-i'):-1,acc=b.getAttribute('data-acc'),foco=null;
    if(acc==='agregar'){datos.push(preguntaVacia());foco='[data-i="'+(datos.length-1)+'"] textarea'}
    else if(acc==='quitar'){datos.splice(i,1);foco='[data-acc="agregar"]'}
    else if(acc==='op'){datos[i].o.push('');foco='[data-i="'+i+'"] [data-c="o"][data-j="'+(datos[i].o.length-1)+'"]'}
    else if(acc==='quitarOp'){
      var j=+b.getAttribute('data-j');datos[i].o.splice(j,1);
      if(datos[i].a===j)datos[i].a=0;else if(datos[i].a>j)datos[i].a--;
      foco='[data-i="'+i+'"] [data-c="o"]';
    }
    guardar();pintar();
    if(foco){var x=$(foco,dom);if(x)x.focus()}
  });
  leer(p.node);pintar();
  return {
    dom:dom,
    update:function(n){
      if(n.type.name!=='repaso')return false;
      if(JSON.stringify(n.attrs.preguntas||[])!==firma){leer(n);pintar()}
      return true;
    },
    stopEvent:function(e){return !!(e.target&&e.target.closest&&e.target.closest('input,textarea,button,label,fieldset'))},
    ignoreMutation:function(){return true}
  };
},{addAttributes:function(){return {preguntas:{default:[],
  parseHTML:function(e){try{return JSON.parse(e.getAttribute('data-preguntas')||'[]')}catch(x){return []}},
  renderHTML:function(a){return {'data-preguntas':JSON.stringify(a.preguntas||[])}}}}}});

/* Cita a un marcador, una sección o un documento: un enlace que no se edita letra por letra */
var Cita=T.Node.create({
  name:'cita',group:'inline',inline:true,atom:true,selectable:true,
  addAttributes:function(){return {
    href:{default:'',parseHTML:function(e){return e.getAttribute('href')||''},renderHTML:function(a){return {href:AT.bloques.hrefSeguro(a.href)||'#'}}},
    texto:{default:'',parseHTML:function(e){return e.textContent.trim()},renderHTML:function(){return {}}}
  }},
  parseHTML:function(){return [{tag:'a[data-cita]'}]},
  renderHTML:function(o){return ['a',T.mergeAttributes(o.HTMLAttributes,{'data-cita':'',class:'cita'}),svg('marcador'),['span',{},o.node.attrs.texto||'Cita']]},
  renderText:function(o){return o.node.attrs.texto||''}
});
/* Tocar una cita en el editor ofrece abrirla o quitarla */
var claveClicCita=new pm.PluginKey('clicCita');
var ClicCita=T.Extension.create({
  name:'clicCita',
  addProseMirrorPlugins:function(){
    var editor=this.editor;
    return [new pm.Plugin({key:claveClicCita,props:{
    /* La cita no es editable por dentro, así que el navegador la seguiría como enlace: se evita */
    handleDOMEvents:{click:function(view,e){if(e.target.closest&&e.target.closest('a.cita'))e.preventDefault();return false}},
    handleClickOn:function(view,pos,node,nodePos,event){
      if(node.type.name==='referencia'){
        var ar=event.target.closest('span.ref')||view.nodeDOM(nodePos);
        setTimeout(function(){menuReferencia(editor,view,node,nodePos,ar)},0);
        return true;
      }
      if(node.type.name!=='cita')return false;
      var a=event.target.closest('a.cita')||view.nodeDOM(nodePos);
      if(event.ctrlKey||event.metaKey){window.open(node.attrs.href,'_blank');return true}
      setTimeout(function(){
        abrirMenu(a,[
          {t:'Ir a «'+(node.attrs.texto.length>40?node.attrs.texto.slice(0,40)+'…':node.attrs.texto)+'»',i:'enlace',d:'Abre lo citado',f:function(){if(AT.editorActual)AT.editorActual.guardarYa();location.href=AT.bloques.hrefSeguro(node.attrs.href)||'#'}},
          {t:'Quitar la cita',i:'close',peligro:true,f:function(){
            var p=nodePos,n=editor.state.doc.nodeAt(p);
            if(n&&n.type.name==='cita')editor.chain().focus().deleteRange({from:p,to:p+n.nodeSize}).run();
          }}
        ],{etiqueta:'Cita',devolver:view.dom,alElegir:function(it){it.f()}});
      },0);
      return true;
    }}})];
  }
});

/* ---------- Tesis: citas a fuentes, bibliografía y declaración de autoría (fuentes.js) ---------- */
function docActual(){return AT.docActual||{fuentes:[],props:[]}}
function textoRef(a){var d=docActual();return AT.fuentes?AT.fuentes.cita(a,d.fuentes,d):'(cita)'}
/* Cita a una fuente del documento: (Pérez, 2020, p. 15) o Pérez (2020) */
var Referencia=T.Node.create({
  name:'referencia',group:'inline',inline:true,atom:true,selectable:true,
  addAttributes:function(){return {
    fuente:{default:'',parseHTML:function(e){return e.getAttribute('data-fuente')||''},renderHTML:function(a){return {'data-fuente':a.fuente}}},
    pagina:{default:'',parseHTML:function(e){return e.getAttribute('data-pagina')||''},renderHTML:function(a){return a.pagina?{'data-pagina':a.pagina}:{}}},
    narrativa:{default:false,parseHTML:function(e){return e.hasAttribute('data-narrativa')},renderHTML:function(a){return a.narrativa?{'data-narrativa':''}:{}}}
  }},
  parseHTML:function(){return [{tag:'span[data-referencia]'}]},
  renderHTML:function(o){return ['span',T.mergeAttributes(o.HTMLAttributes,{'data-referencia':'',class:'ref'}),textoRef(o.node.attrs)]},
  renderText:function(o){return textoRef(o.node.attrs)},
  addNodeView:function(){return function(p){
    var node=p.node,dom=el('span','ref');dom.contentEditable='false';dom.setAttribute('data-referencia','');
    function pintar(){dom.textContent=textoRef(node.attrs)}
    var soltar=AT.fuentes?AT.fuentes.vigilar(pintar):function(){};
    pintar();
    return {dom:dom,update:function(n){if(n.type.name!=='referencia')return false;node=n;pintar();return true},destroy:soltar,ignoreMutation:function(){return true}};
  }}
});
/* Fuentes citadas en el documento del editor (sin pasar por JSON) */
function citadasEn(estado){
  var out={};
  estado.doc.descendants(function(n){if(n.type.name==='referencia'&&n.attrs.fuente)out[n.attrs.fuente]=(out[n.attrs.fuente]||0)+1});
  return out;
}
var biblios=new Set();
var Bibliografia=atomo('bibliografia',function(p){
  var dom=el('div','ed-biblio');dom.contentEditable='false';
  var node=p.node;
  function pintar(){
    var d=docActual(),l=AT.fuentes?AT.fuentes.bibliografia(d,node.attrs.todas,citadasEn(p.editor.state)):[];
    dom.innerHTML='<div class="ed-rep-h"><span class="ed-et">Bibliografía · '+esc(AT.fuentes?AT.fuentes.nombreEstilo(d):'APA 7')+'</span><label class="chk"><input type="checkbox" data-todas'+(node.attrs.todas?' checked':'')+'>Incluir las que no citaste</label></div>';
    if(!l.length){var h=el('p','hint');h.textContent=(d.fuentes||[]).length?'Aquí aparecerán las fuentes que cites en el texto.':'Agrega tus fuentes en «Fuentes» y cítalas: la bibliografía se arma sola, en orden.';dom.appendChild(h);return}
    var ul=el('ul','biblio');
    l.forEach(function(r){ul.appendChild(AT.fuentes.pintarTrozos(r.trozos,el('li')))});
    dom.appendChild(ul);
  }
  dom.addEventListener('change',function(e){
    if(!e.target.hasAttribute('data-todas'))return;
    var pos=typeof p.getPos==='function'?p.getPos():null;
    if(pos!=null)p.editor.view.dispatch(p.editor.state.tr.setNodeAttribute(pos,'todas',e.target.checked));
  });
  var soltar=AT.fuentes?AT.fuentes.vigilar(pintar):function(){};
  var v={dom:dom,pintar:pintar,update:function(n){if(n.type.name!=='bibliografia')return false;node=n;pintar();return true},
    destroy:function(){biblios.delete(v);soltar()},stopEvent:function(e){return !!(e.target&&e.target.closest&&e.target.closest('input,label'))},ignoreMutation:function(){return true}};
  biblios.add(v);pintar();
  return v;
},{addAttributes:function(){return {todas:{default:false,parseHTML:function(e){return e.hasAttribute('data-todas')},renderHTML:function(a){return a.todas?{'data-todas':''}:{}}}}}});
/* Declaración de autoría y de uso de IA: un formulario que se lee como declaración formal */
var Declaracion=atomo('declaracion',function(p){
  var dom=el('div','ed-repaso ed-decl');dom.contentEditable='false';
  var datos={ia:'no',usos:[]},firma='',uid=AT.bloques.nuevoId().slice(2);
  function leer(n){datos={ia:n.attrs.ia==='si'?'si':'no',usos:JSON.parse(JSON.stringify(n.attrs.usos||[]))};firma=JSON.stringify(datos)}
  function guardar(){
    var pos=typeof p.getPos==='function'?p.getPos():null;if(pos==null)return;
    firma=JSON.stringify(datos);
    var tr=p.editor.state.tr.setNodeAttribute(pos,'ia',datos.ia).setNodeAttribute(pos,'usos',JSON.parse(JSON.stringify(datos.usos)));
    p.editor.view.dispatch(tr);
  }
  function texto(){
    var d=docActual(),par=AT.fuentes?AT.fuentes.declaracion(datos,AT.fuentes.autorDe(d)):[];
    return par.map(function(x){return Array.isArray(x)?'<ul>'+x.map(function(y){return '<li>'+esc(y)+'</li>'}).join('')+'</ul>':'<p>'+esc(x)+'</p>'}).join('');
  }
  function pintar(){
    var h='<div class="ed-rep-h"><span class="ed-et">Declaración de autoría</span></div><div class="ed-decl-t">'+texto()+'</div>'+
      '<fieldset class="ed-q"><legend>¿Usaste inteligencia artificial generativa?</legend>'+
      '<label class="chk"><input type="radio" name="ia-'+uid+'" value="no"'+(datos.ia!=='si'?' checked':'')+'>No la usé</label>'+
      '<label class="chk"><input type="radio" name="ia-'+uid+'" value="si"'+(datos.ia==='si'?' checked':'')+'>Sí, la usé</label>';
    if(datos.ia==='si'){
      if(!datos.usos.length)datos.usos.push({herramienta:'',uso:''});
      h+=datos.usos.map(function(u,i){
        return '<div class="ed-uso" data-i="'+i+'"><input type="text" data-c="herramienta" value="'+esc(u.herramienta)+'" placeholder="Herramienta (ej. ChatGPT)" aria-label="Herramienta '+(i+1)+'">'+
          '<input type="text" data-c="uso" value="'+esc(u.uso)+'" placeholder="Para qué (ej. revisar la ortografía del capítulo 2)" aria-label="Para qué usaste la herramienta '+(i+1)+'">'+
          (datos.usos.length>1?'<button type="button" class="ed-mini" data-acc="quitar" aria-label="Quitar la herramienta '+(i+1)+'">'+ico('close')+'</button>':'')+'</div>';
      }).join('')+'<button type="button" class="ed-link" data-acc="agregar">+ Otra herramienta</button>';
    }
    h+='</fieldset><p class="ed-ayuda">Si citas lo que respondió una IA, agrégala también en «Fuentes» como «Conversación con IA».</p>';
    dom.innerHTML=h;
  }
  function refrescarTexto(){var t=$('.ed-decl-t',dom);if(t)t.innerHTML=texto()}
  dom.addEventListener('input',function(e){
    var t=e.target,f=t.closest('.ed-uso');
    if(f){datos.usos[+f.getAttribute('data-i')][t.getAttribute('data-c')]=t.value;guardar();refrescarTexto()}
  });
  dom.addEventListener('change',function(e){
    if(e.target.type==='radio'){datos.ia=e.target.value;if(datos.ia==='no')datos.usos=datos.usos.filter(function(u){return u.herramienta||u.uso});guardar();pintar();var r=$('input[value="'+datos.ia+'"]',dom);if(r)r.focus()}
  });
  dom.addEventListener('click',function(e){
    var b=e.target.closest('[data-acc]');if(!b)return;
    if(b.getAttribute('data-acc')==='agregar'){datos.usos.push({herramienta:'',uso:''});guardar();pintar();var l=$$('[data-c="herramienta"]',dom);l[l.length-1].focus()}
    else{datos.usos.splice(+b.closest('.ed-uso').getAttribute('data-i'),1);guardar();pintar();$('[data-acc="agregar"]',dom).focus()}
  });
  var soltar=AT.fuentes?AT.fuentes.vigilar(refrescarTexto):function(){};
  leer(p.node);pintar();
  return {dom:dom,
    update:function(n){if(n.type.name!=='declaracion')return false;if(JSON.stringify({ia:n.attrs.ia==='si'?'si':'no',usos:n.attrs.usos||[]})!==firma){leer(n);pintar()}return true},
    destroy:soltar,
    stopEvent:function(e){return !!(e.target&&e.target.closest&&e.target.closest('input,textarea,button,label,fieldset'))},
    ignoreMutation:function(){return true}};
},{addAttributes:function(){return {
  ia:{default:'no',parseHTML:function(e){return e.getAttribute('data-ia')||'no'},renderHTML:function(a){return {'data-ia':a.ia}}},
  usos:{default:[],parseHTML:function(e){try{return JSON.parse(e.getAttribute('data-usos')||'[]')}catch(x){return []}},renderHTML:function(a){return {'data-usos':JSON.stringify(a.usos||[])}}}
}}});
/* Elegir una fuente y citarla donde está el cursor */
function citarFuente(editor){
  if(!AT.fuentes||!AT.docActual)return;
  AT.fuentes.dialogo({doc:AT.docActual,alCambiar:function(){if(AT.docCambio)AT.docCambio()},
    alElegir:function(f,pagina,narrativa){
      editor.chain().focus().insertContent([{type:'referencia',attrs:{fuente:f.id,pagina:pagina||'',narrativa:!!narrativa}},{type:'text',text:' '}]).run();
    }});
}
/* Página de una cita: un formulario corto, como el del enlace */
function pedirPagina(editor,pos,ancla){
  cerrarMenu();
  var n=editor.state.doc.nodeAt(pos);if(!n)return;
  var f=el('form','menu menu-enlace');
  f.setAttribute('role','dialog');f.setAttribute('aria-label','Página de la cita');
  f.innerHTML='<label for="refPag">Página o páginas</label><input id="refPag" type="text" autocomplete="off" placeholder="ej. 45 o 45-47" value="'+esc(n.attrs.pagina||'')+'">'+
    '<div class="menu-bt"><button class="btn pri" type="submit">Aplicar</button><button class="btn" type="button" data-x>Cancelar</button></div>';
  document.body.appendChild(f);
  var r=ancla.getBoundingClientRect();
  f.style.left=Math.max(8,Math.min(r.left,innerWidth-f.offsetWidth-8))+'px';f.style.top=(r.bottom+6)+'px';
  var inp=$('input',f);inp.focus();inp.select();
  function cerrar(){f.remove();document.removeEventListener('pointerdown',afuera,true);editor.commands.focus()}
  function afuera(e){if(!f.contains(e.target))cerrar()}
  setTimeout(function(){document.addEventListener('pointerdown',afuera,true)},0);
  f.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cerrar()}});
  f.addEventListener('click',function(e){if(e.target.closest('[data-x]'))cerrar()});
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var m=editor.state.doc.nodeAt(pos);
    if(m&&m.type.name==='referencia')editor.view.dispatch(editor.state.tr.setNodeAttribute(pos,'pagina',inp.value.trim()));
    cerrar();
  });
}
function menuReferencia(editor,view,node,nodePos,a){
  abrirMenu(a,[
    {t:node.attrs.pagina?'Cambiar la página ('+node.attrs.pagina+')':'Agregar la página',i:'note',f:function(){pedirPagina(editor,nodePos,a)}},
    {t:node.attrs.narrativa?'Cita entre paréntesis: (Autor, año)':'Cita narrativa: Autor (año)',i:'comillas',f:function(){
      editor.view.dispatch(editor.state.tr.setNodeAttribute(nodePos,'narrativa',!node.attrs.narrativa));editor.view.focus();
    }},
    {t:'Ver las fuentes',i:'libro',f:function(){AT.fuentes.dialogo({doc:AT.docActual,alCambiar:function(){if(AT.docCambio)AT.docCambio()}})}},
    {sep:true},
    {t:'Quitar la cita',i:'close',peligro:true,f:function(){
      var n=editor.state.doc.nodeAt(nodePos);
      if(n&&n.type.name==='referencia')editor.chain().focus().deleteRange({from:nodePos,to:nodePos+n.nodeSize}).run();
    }}
  ],{etiqueta:'Cita bibliográfica',devolver:view.dom,alElegir:function(it){it.f()}});
}

/* ---------- Bloques que se pueden insertar ---------- */
function P(texto){return texto?{type:'paragraph',content:[{type:'text',text:texto}]}:{type:'paragraph'}}
var INSERTAR=[
  {k:'texto',t:'Texto',d:'Un párrafo normal',i:'texto',p:'parrafo',f:function(c){return c.setParagraph()}},
  {k:'seccion',t:'Título de sección',d:'Aparece en el índice y en el mapa',i:'titulo',p:'titulo seccion h2',f:function(c){return c.setHeading({level:2})}},
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
  {k:'columnas3',t:'Tres columnas',d:'Como las tarjetas de una lección',i:'columnas',p:'columnas tarjetas',
    f:function(c){return c.insertContent({type:'columnas',content:[{type:'columna',content:[P()]},{type:'columna',content:[P()]},{type:'columna',content:[P()]}]})}},
  {k:'repaso',t:'Preguntas de repaso',d:'Opción múltiple, con explicación',i:'repaso',p:'quiz examen preguntas',f:function(c){return c.insertContent({type:'repaso',attrs:{preguntas:[preguntaVacia()]}})}},
  {k:'resumen',t:'Resumen',d:'Las ideas clave, al final',i:'resumen',p:'conclusion ideas clave',f:function(c){return c.insertContent({type:'resumen',content:[{type:'bulletList',content:[{type:'listItem',content:[P()]}]}]})}},
  {k:'indice',t:'Índice',d:'La lista de secciones, al día',i:'indice',p:'contenido toc',f:function(c){return c.insertContent({type:'indice'})}},
  {k:'cita',t:'Cita textual',d:'Palabras de otra persona',i:'comillas',p:'blockquote',f:function(c){return c.toggleBlockquote()}},
  {k:'codigo',t:'Bloque de código',d:'Texto con letra de ancho fijo',i:'codigo',p:'programa code',f:function(c){return c.toggleCodeBlock()}},
  {k:'separador',t:'Separador',d:'Una línea horizontal',i:'separador',p:'linea hr',f:function(c){return c.setHorizontalRule()}},
  {k:'citar',t:'Citar una lección o un marcador',d:'También escribiendo «@»',i:'marcador',p:'arroba marcador referencia enlace interno',f:function(c){return c.insertContent('@')}},
  {k:'referencia',t:'Cita bibliográfica',d:'Una fuente: (Autor, año, p. 12)',i:'comillas',p:'citar fuente apa autor bibliografia referencia',academico:true,f:function(c){var ed=c.editor||AT.editorActual&&AT.editorActual.tiptap;setTimeout(function(){citarFuente(ed)},0);return c}},
  {k:'bibliografia',t:'Bibliografía',d:'Las fuentes citadas, en APA 7',i:'libro',p:'referencias fuentes apa lista',academico:true,f:function(c){return c.insertContent({type:'bibliografia'})}},
  {k:'declaracion',t:'Declaración de autoría',d:'Tu autoría y el uso de IA',i:'tesis',p:'autoria ia originalidad etica',academico:true,f:function(c){return c.insertContent({type:'declaracion'})}}
];
AT.editorInsertar=INSERTAR;

/* ---------- Menú emergente reutilizable ---------- */
/* abrirMenu(ancla, opciones, {alElegir, etiqueta, foco:true|false}) → {cerrar, mover(d), elegir(), filtrar(lista)} */
var menuAbierto=null;
function abrirMenu(ancla,items,op){
  cerrarMenu();
  op=op||{};
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
  var m=menuAbierto;menuAbierto=null;
  document.removeEventListener('pointerdown',fuera,true);
  var tenia=m.el.contains(document.activeElement);
  m.el.remove();
  if(m.devolver&&tenia&&!sinDevolver)m.devolver.focus({preventScroll:true});
}
AT.menu={abrir:abrirMenu,cerrar:cerrarMenu,abierto:function(){return menuAbierto}};

/* ---------- Menú «/» ---------- */
/* Citas a fuentes, bibliografía y declaración: solo en documentos académicos (tesis) */
function insertables(){var t=AT.tiposDoc&&AT.docActual&&AT.tiposDoc[AT.docActual.tipo];return INSERTAR.filter(function(it){return !it.academico||!!(t&&t.academico)})}
function filtrarInsertar(q){
  q=sinAcentos(q);
  if(!q)return insertables();
  return insertables().filter(function(it){return sinAcentos(it.t+' '+it.p+' '+it.k).indexOf(q)>=0});
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

/* ---------- Menú «@»: citar marcadores, secciones de las lecciones y tus documentos ---------- */
var claveArroba=new pm.PluginKey('menuCita');
var CITABLES={marcador:1,seccion:1,leccion:1,documento:1,'seccion-doc':1};
function opcionesDeCita(q){
  if(!AT.indice)return Promise.resolve([]);
  return AT.indice.cargar().then(function(todas){
    var propias=todas.filter(function(e){return CITABLES[e.tipo]&&e.docId!==AT.documentoAbierto});
    /* Tus marcadores van primero: son lo que guardaste a propósito para citar */
    function marcadoresPrimero(l){return l.filter(function(e){return e.tipo==='marcador'}).concat(l.filter(function(e){return e.tipo!=='marcador'}))}
    var lista=q.trim()?marcadoresPrimero(AT.indice.buscar(q,propias,10)):
      marcadoresPrimero(propias.filter(function(e){return e.tipo==='marcador'||e.tipo==='leccion'||e.tipo==='documento'})).slice(0,10);
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
          return [{t:props.query.trim()?'Nada coincide con «'+props.query.trim()+'»':'Todavía no hay nada que citar',d:'Guarda marcadores en las lecciones o crea documentos',i:'marcador',desactivado:true}];
        }
        return {
          onStart:function(props){ultimas=props;menu=abrirMenu(rect(props),lista(props),{foco:false,etiqueta:'Citar',clase:'menu-barra menu-cita',alMarcar:aria,alElegir:elegir})},
          onUpdate:function(props){
            ultimas=props;
            if(!menu||menuAbierto!==menu)menu=abrirMenu(rect(props),lista(props),{foco:false,etiqueta:'Citar',clase:'menu-barra menu-cita',alMarcar:aria,alElegir:elegir});
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
/* Quita lo que el editor no conoce (tipos de bloque o de formato de otra versión, datos dañados)
   en vez de negarse a abrir el documento */
function limpiar(n,schema){
  if(!n||typeof n!=='object')return null;
  if(n.type==='text'){
    if(typeof n.text!=='string'||!n.text)return null;
    var t={type:'text',text:n.text},ms=(Array.isArray(n.marks)?n.marks:[]).filter(function(m){return m&&schema.marks[m.type]});
    if(ms.length)t.marks=ms;
    return t;
  }
  if(!schema.nodes[n.type])return null;
  var o={type:n.type};
  if(n.attrs&&typeof n.attrs==='object')o.attrs=n.attrs;
  if(Array.isArray(n.content))o.content=n.content.map(function(c){return limpiar(c,schema)}).filter(Boolean);
  return o;
}
function contenidoSeguro(json,schema){
  var bloques=(json&&json.type==='doc'&&Array.isArray(json.content)?json.content:[]).map(function(b){return limpiar(b,schema)}).filter(Boolean);
  bloques=bloques.filter(function(b){
    try{schema.nodeFromJSON(b).check();return true}
    catch(e){if(window.console)console.warn('OneLearn: se omitió un bloque dañado',b.type);return false}
  });
  if(!bloques.length)bloques=[{type:'paragraph'}];
  return {type:'doc',content:bloques};
}
function crear(o){
  var envoltura=el('div','editor');
  o.host.appendChild(envoltura);
  var cambio=null,repBib=null;
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
      Ids,Callout,Columnas,Columna,Desplegable,DesplegableTitulo,DesplegableCuerpo,Resumen,Indice,Laboratorio,Repaso,
      Cita,ClicCita,Referencia,Bibliografia,Declaracion,MenuBarra,MenuCita,Atajos
    ].concat(AT.editorExtensiones||[],o.extensiones||[]),
    onUpdate:function(){
      indices.forEach(function(v){v.pintar()});
      ordenCitasVivo();
      if(biblios.size){clearTimeout(repBib);repBib=setTimeout(function(){biblios.forEach(function(v){v.pintar()})},250)}
      clearTimeout(cambio);
      cambio=setTimeout(function(){if(o.alCambiar)o.alCambiar(editor.getJSON())},o.espera||500);
      if(o.alEscribir)o.alEscribir();
    }
  });
  /* El documento entra ya limpio, sin quedar en el historial de deshacer */
  editor.commands.setContent(contenidoSeguro(o.contenido,editor.schema),{emitUpdate:false});
  editor.view.dispatch(editor.state.tr.setMeta('addToHistory',false));
  /* Ids para lo que llegó sin ellos */
  editor.view.dispatch(editor.state.tr.setMeta(claveIds,true).setMeta('addToHistory',false));
  /* IEEE numera las citas por orden de aparición: el orden se toma del editor mientras escribes */
  function ordenCitasVivo(){
    if(!AT.fuentes||!AT.fuentes.ordenVivo)return;
    if(AT.fuentes.ordenVivo(Object.keys(citadasEn(editor.state)))&&AT.fuentes.estilo(docActual())==='ieee')AT.fuentes.refrescar();
  }
  ordenCitasVivo();
  var barra=o.barra?crearBarra(editor,o.barra):null;
  var asa=crearAsa(editor,envoltura);
  var api={
    tiptap:editor,
    json:function(){return editor.getJSON()},
    palabras:function(){return editor.storage.characterCount.words()},
    /* Pone el cursor ya (sin esperar un cuadro): al principio, en el primer lugar donde se puede escribir */
    enfocar:function(donde){
      var v=editor.view,doc=v.state.doc;
      var sel=donde==='end'?pm.Selection.findFrom(doc.resolve(doc.content.size),-1,true):pm.Selection.findFrom(doc.resolve(0),1,true);
      if(sel)v.dispatch(v.state.tr.setSelection(sel).scrollIntoView());
      v.focus();
    },
    guardarYa:function(){clearTimeout(cambio);if(o.alCambiar)o.alCambiar(editor.getJSON())},
    enlace:function(){if(barra)barra.enlace()},
    insertar:function(k){var it=INSERTAR.filter(function(x){return x.k===k})[0];if(it)it.f(editor.chain().focus()).run()},
    citarFuente:function(){citarFuente(editor)},
    destruir:function(){clearTimeout(cambio);cerrarMenu();if(AT.fuentes&&AT.fuentes.ordenVivo)AT.fuentes.ordenVivo(null);editor.destroy();envoltura.remove();if(barra)barra.el.remove()}
  };
  AT.editorActual=api;
  return api;
}
AT.editor={crear:crear,moverBloque:moverBloque,duplicarBloque:duplicarBloque,svg:svg,bloqueActual:bloqueActual};
})();
