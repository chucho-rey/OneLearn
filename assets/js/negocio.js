/* OneBook: base de los bloques de negocio (fase F4).
   Lo que comparten el corte de caja, el fiado, los gastos, la nota de venta, la calculadora de precio y las cuentas
   por pagar (cada uno en su archivo, cargado después de este):
   - Dinero en centavos y en pesos mexicanos: AT.negocio.dinero(c, signo) y monto(c, signo) para pintar; los
     negativos siempre van con signo (−) y en rojo (.neg); con signo=true, los positivos llevan + (y van en verde).
   - Fechas (AAAA-MM-DD). Los folios consecutivos (V-001) los da AT.folio (base.js).
   - AT.negocio.bloque(nombre, definición): registra el nodo del editor (atributos JSON, uno por clave de def), su
     formulario, su dibujo al leer (AT.bloques.registrar), su texto y su Markdown (AT.piezas.md) y su entrada en «/».
     Definición: {etiqueta, def, filas:{lista: () => fila nueva (sin datos al azar: también completa lo guardado)}, editar(x, uid), resultado(x, uid), leer(x, uid, op),
       refrescar(x, dom), acciones:{nombre(x, datos, boton) → ruta a enfocar}, texto(x), md(x), clases(x),
       alCambiar(x, ruta, campo, raiz) (al escribir o elegir, antes de guardar: puede completar otros campos),
       insertar:{t, d, i, p, attrs()}, foco}.
     Los campos se enlazan con data-k="ruta" (por ejemplo filas.2.monto); las casillas con data-fecha guardan la
     fecha del día en lugar de true; los botones con data-acc="acción" (agregar y quitar ya existen: data-lista y
     data-i). Al escribir solo se repinta el resultado; al elegir o al usar un botón se repinta todo y el foco vuelve
     al mismo campo.
   - AT.negocio.formulario(nombre, attrs, {cambio(x)}): el mismo formulario fuera del editor (la calculadora de
     precio en la página de bienvenida). Los estilos del formulario (.nb-f) están en negocio.css.
   - Al leer, en tus documentos, las casillas y botones que pinte leer() también cambian el bloque y se guardan
     (como marcar un pago en el plan de pagos). Al imprimir no.
   Se carga después de piezas.js (y de editor.js en documento.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc;

/* ---------- Números y dinero ---------- */
function num(v){var n=parseFloat(String(v==null?'':v).replace(/[$,\s%]/g,''));return isFinite(n)?n:0}
/* Centavos de un texto («$1,500.50» → 150050). Sin signo: los montos que se escriben son positivos */
function centavos(v){var n=num(v);return n>0?Math.round(n*100):0}
function dinero(c,signo){
  var t=(Math.abs(c)/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  return c<0?'−'+t:(signo&&c>0?'+'+t:t);
}
function monto(c,signo){return '<span class="nb-d'+(c<0?' neg':signo&&c>0?' pos':'')+'">'+dinero(c,signo)+'</span>'}
function pct(n,dec){return (n<0?'−':'')+Math.abs(n).toLocaleString('es-MX',{maximumFractionDigits:dec==null?1:dec})+' %'}
function cantidad(n){return n.toLocaleString('es-MX',{maximumFractionDigits:3})}

/* ---------- Fechas ---------- */
function fechaDe(t){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function hoy(){return iso(new Date())}
function fechaTexto(t){var d=typeof t==='string'?fechaDe(t):t;return d?d.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'}):''}
function fechaLarga(t){var d=typeof t==='string'?fechaDe(t):t;return d?d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):''}
/* Días de a a b (fechas AAAA-MM-DD) */
function dias(a,b){var x=fechaDe(a),y=fechaDe(b);return x&&y?Math.round((y-x)/864e5):0}

/* ---------- Datos del bloque ---------- */
function clonar(o){return JSON.parse(JSON.stringify(o))}
/* Completa un objeto con la forma de base (los bloques también llegan de respaldos o de versiones viejas) */
function completarObj(base,v,protos){
  v=v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  Object.keys(base).forEach(function(k){
    var b=base[k],w=v[k];
    if(w==null)return;
    if(Array.isArray(b))base[k]=Array.isArray(w)?w.filter(function(f){return f&&typeof f==='object'}).map(function(f){return protos&&protos[k]?completarObj(protos[k](),f,protos):f}):b;
    else if(b&&typeof b==='object')base[k]=completarObj(b,w,protos);
    else base[k]=typeof b==='string'?String(w):typeof b==='boolean'?!!w:w;
  });
  return base;
}
function completar(d,a){
  a=a&&typeof a==='object'?a:{};
  var x={};
  Object.keys(d.def).forEach(function(k){
    var df=d.def[k],v=a[k];
    if(Array.isArray(df)){
      var proto=d.filas&&d.filas[k];
      x[k]=(Array.isArray(v)?v:clonar(df)).filter(function(f){return f&&typeof f==='object'}).map(function(f){return proto?completarObj(proto(),f,d.filas):f});
    }else if(df&&typeof df==='object')x[k]=completarObj(clonar(df),v,d.filas);
    else x[k]=v==null?df:typeof df==='string'?String(v):typeof df==='boolean'?!!v:v;
  });
  if(a.id)x.id=a.id;
  return x;
}
/* Ruta «filas.2.monto» */
function poner(x,ruta,v){
  var p=ruta.split('.'),o=x;
  for(var i=0;i<p.length-1;i++){o=o[p[i]];if(o==null||typeof o!=='object')return}
  o[p[p.length-1]]=v;
}
function leer(x,ruta){
  var p=ruta.split('.'),o=x;
  for(var i=0;i<p.length;i++){if(o==null)return undefined;o=o[p[i]]}
  return o;
}

/* ---------- La vista: enlaza los campos (al editar y al leer) ---------- */
/* Lo que identifica al elemento enfocado para volver a él después de repintar */
function marca(e){
  if(!e||!e.getAttribute)return null;
  var k=e.getAttribute('data-k');
  if(k)return {sel:'[data-k="'+k+'"]'+(e.type==='radio'?'[value="'+e.value+'"]':''),ini:typeof e.selectionStart==='number'?e.selectionStart:null};
  var a=e.getAttribute('data-acc');
  if(a)return {sel:'[data-acc="'+a+'"]'+(e.getAttribute('data-i')!=null?'[data-i="'+e.getAttribute('data-i')+'"]':'')+(e.getAttribute('data-lista')?'[data-lista="'+e.getAttribute('data-lista')+'"]':'')};
  return null;
}
function enfocar(raiz,m){
  if(!m)return;
  var e=null;try{e=raiz.querySelector(m.sel)}catch(x){}
  if(!e)return;
  e.focus({preventScroll:true});
  if(m.ini!=null&&typeof e.setSelectionRange==='function')try{e.setSelectionRange(m.ini,m.ini)}catch(x){}
}
/* Enlaza los eventos de una vista. o: {x(), cambio(repintarTodo, foco), d} */
function enlazar(raiz,d,o){
  function valor(t){
    if(t.type==='checkbox')return t.hasAttribute('data-fecha')?(t.checked?hoy():''):t.checked;
    return t.value;
  }
  raiz.addEventListener('input',function(e){
    var t=e.target,k=t.getAttribute&&t.getAttribute('data-k');
    if(!k||t.type==='checkbox'||t.type==='radio'||t.tagName==='SELECT')return;
    poner(o.x(),k,valor(t));
    if(d.alCambiar)d.alCambiar(o.x(),k,t,raiz);
    o.cambio(false);
  });
  raiz.addEventListener('change',function(e){
    var t=e.target,k=t.getAttribute&&t.getAttribute('data-k');
    if(!k)return;
    poner(o.x(),k,valor(t));
    if(d.alCambiar)d.alCambiar(o.x(),k,t,raiz);
    var todo=t.type==='checkbox'||t.type==='radio'||t.tagName==='SELECT'||t.hasAttribute('data-repintar');
    o.cambio(todo,todo?marca(t):null);
  });
  function accion(b){
    var nombre=b.getAttribute('data-acc'),x=o.x(),foco;
    if(b.getAttribute('aria-disabled')==='true')return;
    if(d.acciones&&d.acciones[nombre])foco=d.acciones[nombre](x,b.dataset,b,raiz);
    else if(nombre==='agregar'){
      var l=b.getAttribute('data-lista'),lista=leer(x,l),proto=d.filas&&d.filas[l.split('.').pop()];
      if(!Array.isArray(lista))return;
      lista.push(proto?proto():{});
      foco=b.getAttribute('data-foco')?l+'.'+(lista.length-1)+'.'+b.getAttribute('data-foco'):null;
    }else if(nombre==='quitar'){
      var lq=leer(x,b.getAttribute('data-lista')),i=+b.getAttribute('data-i');
      if(!Array.isArray(lq)||!(i>=0&&i<lq.length))return;
      lq.splice(i,1);
      foco=lq.length?{sel:'[data-acc="quitar"][data-lista="'+b.getAttribute('data-lista')+'"][data-i="'+Math.min(i,lq.length-1)+'"]'}:
        {sel:'[data-acc="agregar"][data-lista="'+b.getAttribute('data-lista')+'"]'};
    }else return;
    if(foco===false)return;
    o.cambio(true,typeof foco==='string'?{sel:'[data-k="'+foco+'"]'}:foco||marca(b));
  }
  raiz.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-acc]');
    if(b&&raiz.contains(b)){e.preventDefault();accion(b)}
  });
  /* Enter en un campo con data-enter hace esa acción (por ejemplo, anotar un abono) */
  raiz.addEventListener('keydown',function(e){
    if(e.key!=='Enter'||e.isComposing)return;
    var t=e.target,a=t.getAttribute&&t.getAttribute('data-enter');
    if(!a)return;
    e.preventDefault();
    var b=t.closest('[data-grupo]');
    b=b?b.querySelector('[data-acc="'+a+'"]'):raiz.querySelector('[data-acc="'+a+'"]');
    if(b){if(t.getAttribute('data-k'))poner(o.x(),t.getAttribute('data-k'),valor(t));accion(b)}
  });
}

/* Vista de lectura: lo que dibuja leer(); en tus documentos, sus casillas y botones cambian el bloque.
   op: {editable, guardar(x) → true si se guardó}. También la usa la página de bienvenida. */
function vistaLeer(nombre,a,op){
  var d=BLOQUES[nombre];op=op||{};
  var x=completar(d,a),uid='nb'+AT.bloques.nuevoId().slice(2);
  var sec=document.createElement('section');
  sec.className='nb nb-leer nb-'+nombre;
  function pintar(m){
    sec.setAttribute('aria-label',(x.titulo||'').trim()||d.etiqueta);
    sec.className='nb nb-leer nb-'+nombre+(d.clases?' '+d.clases(x):'');
    sec.innerHTML=d.leer(x,uid,{editable:!!op.editable});
    enfocar(sec,m);
  }
  if(op.editable)enlazar(sec,d,{x:function(){return x},cambio:function(todo,m){
    if(op.guardar&&op.guardar(x)===false)return;
    if(todo||!d.refrescar)pintar(m||marca(document.activeElement));else d.refrescar(x,sec);
  }});
  pintar();
  return sec;
}

/* El formulario fuera del editor (sin Tiptap). op: {cambio(x)} */
function formulario(nombre,a,op){
  var d=BLOQUES[nombre];op=op||{};
  var x=completar(d,a),uid='nb'+AT.bloques.nuevoId().slice(2),dom=document.createElement('div');
  function ligero(){
    var r=dom.querySelector('.nb-res');if(r)r.innerHTML=d.resultado(x,uid);
    if(d.refrescar)d.refrescar(x,dom);
  }
  function pintar(m){
    dom.className='nb nb-f nb-suelto nb-'+nombre+(d.clases?' '+d.clases(x):'');
    var cuerpo=d.editar(x,uid,{suelto:true});
    if(cuerpo.indexOf('class="nb-res"')<0)cuerpo+='<div class="nb-res"></div>';
    dom.innerHTML=cuerpo;ligero();enfocar(dom,m);
  }
  enlazar(dom,d,{x:function(){return x},cambio:function(todo,m){
    if(op.cambio)op.cambio(x);
    if(todo)pintar(m||marca(document.activeElement));else ligero();
  }});
  pintar();
  return dom;
}

var BLOQUES={};
function bloque(nombre,d){
  d.nombre=nombre;BLOQUES[nombre]=d;
  /* Al leer y al imprimir */
  if(AT.bloques&&AT.bloques.registrar){
    AT.bloques.registrar(nombre,{
      dibujar:function(n,c,h){
        var a=h.attrs(n),id=a.id;
        /* Solo en documento.html y en tu propio documento se puede cambiar (no al imprimir) */
        var editable=!!(AT.docActual&&AT.docCambio&&id&&document.body.getAttribute('data-pagina')==='documento');
        return vistaLeer(nombre,a,{editable:editable,guardar:function(x){
          var blk=(AT.docActual&&AT.docActual.contenido.content||[]).filter(function(b){return b.type===nombre&&b.attrs&&b.attrs.id===id})[0];
          if(!blk||!AT.docCambio)return false;
          Object.keys(d.def).forEach(function(k){blk.attrs[k]=clonar(x[k])});
          AT.docCambio();
          return true;
        }});
      },
      texto:function(n){return d.texto(completar(d,n.attrs))+'\n'}
    });
  }
  if(AT.piezas&&AT.piezas.md)AT.piezas.md[nombre]=function(n){return d.md(completar(d,n.attrs))};
  editor(nombre,d);
}

/* ---------- Editor ---------- */
var T=window.Tiptap,abrirNuevo='';
function editor(nombre,d){
  if(!T||!AT.editor)return;
  function vista(p){
    var node=p.node,x=completar(d,node.attrs),uid='nb'+AT.bloques.nuevoId().slice(2);
    var dom=document.createElement('div');
    dom.contentEditable='false';
    function pintar(m){
      dom.className='nb nb-ed nb-f nb-'+nombre+(d.clases?' '+d.clases(x):'');
      var cuerpo=d.editar(x,uid,{});
      if(cuerpo.indexOf('class="nb-res"')<0)cuerpo+='<div class="nb-res"></div>';
      dom.innerHTML='<div class="ed-rep-h"><span class="ed-et">'+esc(d.etiqueta)+'</span></div>'+cuerpo;
      ligero();
      enfocar(dom,m);
    }
    function ligero(){
      var r=$('.nb-res',dom);if(r)r.innerHTML=d.resultado(x,uid);
      if(d.refrescar)d.refrescar(x,dom);
    }
    function guardar(){
      var pos=typeof p.getPos==='function'?p.getPos():null;if(pos==null)return;
      var tr=p.editor.state.tr,hay=false;
      Object.keys(d.def).forEach(function(k){
        if(JSON.stringify(node.attrs[k])!==JSON.stringify(x[k])){tr.setNodeAttribute(pos,k,clonar(x[k]));hay=true}
      });
      if(hay)p.editor.view.dispatch(tr);
    }
    enlazar(dom,d,{x:function(){return x},cambio:function(todo,m){
      guardar();
      if(todo)pintar(m||marca(document.activeElement));else ligero();
    }});
    pintar();
    if(abrirNuevo===nombre){abrirNuevo='';setTimeout(function(){var t=d.foco&&$(d.foco,dom);if(t&&dom.isConnected)t.focus()},0)}
    return {dom:dom,
      update:function(n){
        if(n.type.name!==nombre)return false;
        node=n;
        var nx=completar(d,n.attrs);
        /* Si el cambio vino de este formulario ya está pintado; si no (deshacer, por ejemplo), se repinta */
        if(JSON.stringify(nx)!==JSON.stringify(x)){x=nx;pintar(marca(document.activeElement))}
        return true;
      },
      stopEvent:function(e){return !!(e.target&&e.target.closest&&e.target.closest('input,select,textarea,button,label,fieldset,details,summary,a'))},
      ignoreMutation:function(){return true}};
  }
  function attrJSON(k,def){
    return {default:def,parseHTML:function(e){try{var v=e.getAttribute('data-'+k);return v==null?def:JSON.parse(v)}catch(x){return def}},
      renderHTML:function(a){var o={};o['data-'+k]=JSON.stringify(a[k]);return o}};
  }
  var Nodo=T.Node.create({
    name:nombre,group:'block',atom:true,selectable:true,draggable:false,
    addAttributes:function(){var o={};Object.keys(d.def).forEach(function(k){o[k]=attrJSON(k,d.def[k])});return o},
    parseHTML:function(){return [{tag:'div[data-nb="'+nombre+'"]'}]},
    renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-nb':nombre})]},
    addNodeView:function(){return vista}
  });
  AT.editorExtensiones=(AT.editorExtensiones||[]).concat([Nodo]);
  if(AT.editorConId)AT.editorConId.push(nombre);
  var ins=d.insertar;
  if(ins&&AT.editorInsertar)AT.editorInsertar.push({k:nombre,modulo:'negocio',t:ins.t,d:ins.d,i:ins.i,p:ins.p,f:function(c){
    abrirNuevo=nombre;
    return c.insertContent({type:nombre,attrs:Object.assign(clonar(d.def),ins.attrs?ins.attrs():{})});
  }});
}

/* documento.html#agregar=<bloque> (acciones rápidas del Inicio): si la página ya tiene ese bloque se va a él; si no
   (o, en el corte de caja, si no hay uno de hoy), lo agrega al final, listo para escribir */
document.addEventListener('onebook:agregar',function(e){
  var tipo=e.detail&&e.detail.tipo,d=BLOQUES[tipo],ed=AT.editorActual&&AT.editorActual.tiptap;
  if(!d||!ed||!d.insertar)return;
  var pos=null,h=hoy();
  ed.state.doc.forEach(function(n,o){if(n.type.name===tipo&&(tipo!=='corte'||n.attrs.fecha===h))pos=o});
  if(pos!=null){
    var dom=ed.view.nodeDOM(pos);
    if(dom&&dom.scrollIntoView)dom.scrollIntoView({block:'start'});
    var f=dom&&d.foco&&dom.querySelector(d.foco);if(f)f.focus({preventScroll:true});
    return;
  }
  abrirNuevo=tipo;
  ed.chain().insertContentAt(ed.state.doc.content.size,{type:tipo,attrs:Object.assign(clonar(d.def),d.insertar.attrs?d.insertar.attrs():{})}).run();
});

/* ---------- Piezas de HTML que repiten los bloques ---------- */
/* Un campo con etiqueta: campo(etiqueta, ruta, valor, {tipo, ph, modo:'decimal'|'numeric', clase, extra}) */
function campo(et,k,v,o){
  o=o||{};
  var tipo=o.tipo||'text';
  return '<label class="nb-c'+(o.clase?' '+o.clase:'')+'"><span>'+esc(et)+'</span><input type="'+tipo+'"'+
    (o.modo?' inputmode="'+o.modo+'"':'')+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+' data-k="'+k+'" value="'+esc(v==null?'':String(v))+'"'+(o.extra||'')+'></label>';
}
function opciones(lista,v){return lista.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>'}).join('')}
/* Resumen: [[etiqueta, html, clase]] */
function resumen(items){
  return '<dl class="nb-k">'+items.filter(Boolean).map(function(i){return '<div'+(i[2]?' class="'+i[2]+'"':'')+'><dt>'+esc(i[0])+'</dt><dd>'+i[1]+'</dd></div>'}).join('')+'</dl>';
}
function quitar(lista,i,que){return '<button type="button" class="nb-x" data-acc="quitar" data-lista="'+lista+'" data-i="'+i+'" aria-label="Quitar '+esc(que)+'" title="Quitar">×</button>'}
/* El encabezado del negocio (de «Tu espacio») para la nota de venta y lo que se imprime */
function negocioActual(){
  var p=AT.perfil&&AT.perfil.actual&&AT.perfil.actual();
  return p&&p.negocio?{nombre:p.negocio.nombre||'',telefono:p.negocio.telefono||''}:{nombre:p&&p.nombre||'',telefono:''};
}

AT.negocio={num:num,centavos:centavos,dinero:dinero,monto:monto,pct:pct,cantidad:cantidad,
  fechaDe:fechaDe,iso:iso,hoy:hoy,fechaTexto:fechaTexto,fechaLarga:fechaLarga,dias:dias,
  folio:AT.folio,bloque:bloque,vista:vistaLeer,formulario:formulario,completar:function(n,a){return completar(BLOQUES[n],a)},
  campo:campo,opciones:opciones,resumen:resumen,quitar:quitar,negocio:negocioActual,esc:esc,nuevoId:function(){return AT.bloques.nuevoId()}};
})();
