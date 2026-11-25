/* OneBook: bloques «Indicadores» y «Próximos vencimientos» (fase F7d).
   - Indicadores: tarjetas con una cifra cada una (un reporte sin desglose de reporte.js: sumar, contar o promediar
     una base, con periodo, filtro y comparación contra el periodo anterior, con flecha). attrs.cfg = {items:[cfg de
     reporte]}. Al editar, cada tarjeta se ajusta en una ventana (la misma de los reportes), se agrega o se quita.
     Sin ajustar, trae las del negocio: ventas del mes, valor del inventario, compras por pagar y productos por surtir
     (por rol: funcionan con la página Inventario).
   - Próximos vencimientos: lo que vence en los próximos días (y lo vencido) de tus bases (columnas de fecha como
     Vence, Vigencia, Fecha límite o Entrega; sin las filas pagadas, hechas o canceladas), de tus planes de pago (el
     siguiente pago) y de tus cuentas por pagar. attrs.cfg = {dias}. Cada aviso lleva a su página.
   Expone AT.indicadores. Se carga después de reporte.js. */
(function(){
'use strict';
/* Con salas, los vencimientos solo salen de las páginas que puedes ver */
function visible(d){return !AT.datos.acceso||AT.datos.acceso.puede(d,'ver')}
var AT=window.AT,B=AT.bases,R=AT.reporte,$=AT.$,esc=AT.esc,ico=AT.ico;
if(!B||!R)return;
var MAX=6;

function hoy(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function dias(a,b){var x=/^(\d{4})-(\d{2})-(\d{2})/.exec(a||''),y=/^(\d{4})-(\d{2})-(\d{2})/.exec(b||'');return x&&y?Math.round((new Date(+y[1],+y[2]-1,+y[3])-new Date(+x[1],+x[2]-1,+x[3]))/864e5):0}
function rutaDoc(id){return (AT.rutas&&AT.rutas.raiz||'')+'documento.html?id='+encodeURIComponent(id)}

/* ---------- Indicadores ---------- */
/* Los del negocio, por rol (si no hay inventario, dicen cómo empezar) */
function delNegocio(){
  return [
    {titulo:'Ventas del mes',rol:'movimientos',fecha:'m-fecha',periodo:'mes',valor:'m-importe',calculo:'suma',comparar:true,fcol:'m-tipo',fop:'igual',fval:'Venta'},
    {titulo:'Valor del inventario',rol:'productos',periodo:'todo',valor:'p-valor',calculo:'suma'},
    {titulo:'Compras por pagar',rol:'compras',periodo:'todo',valor:'c-total',calculo:'suma',fcol:'c-estado',fop:'igual',fval:'Por pagar'},
    {titulo:'Productos por surtir',rol:'productos',periodo:'todo',calculo:'conteo',fcol:'p-falta',fop:'mayor',fval:'0'}
  ].map(R.cfg);
}
function items(cfg){var l=cfg&&Array.isArray(cfg.items)?cfg.items:null;return (l&&l.length?l:delNegocio()).slice(0,MAX).map(R.cfg)}
function tarjeta(c,i,editable){
  var x=R.calcular(c);
  var tit=c.titulo.trim()||(x?R.titulo(x):'Indicador');
  var cuerpo=!x?'<dd class="ind-v ind-sin">—</dd><dd class="ind-s">'+esc(c.rol?'Necesita tu Inventario':'Elige una base')+'</dd>':
    '<dd class="ind-v">'+R.fmt(x,x.total)+'</dd><dd class="ind-s">'+esc(R.periodo(x))+(x.ra?' · '+R.dif(x,x.total,x.totalAnt):'')+'</dd>';
  return '<div class="ind-t"><dt>'+esc(tit)+'</dt>'+cuerpo+
    (editable?'<dd class="ind-acc"><button type="button" class="ed-link" data-ind="ajustar" data-i="'+i+'" aria-label="Ajustar «'+esc(tit)+'»">Ajustar</button>'+
      '<button type="button" class="ed-link" data-ind="quitar" data-i="'+i+'" aria-label="Quitar «'+esc(tit)+'»">Quitar</button></dd>':'')+'</div>';
}
function htmlInd(cfg,editable){
  var l=items(cfg);
  return '<dl class="ind">'+l.map(function(c,i){return tarjeta(c,i,editable)}).join('')+'</dl>'+
    (editable&&l.length<MAX?'<button type="button" class="btn ind-mas" data-ind="agregar">+ Indicador</button>':'');
}
/* Monta el bloque: {cfg, editable, alCambiar(cfg)} */
function montarInd(raiz,op){
  var cfg={items:items(op.cfg)},vivo=true;
  raiz.classList.add('ind-b');
  function pintar(foco){if(!vivo)return;raiz.innerHTML=htmlInd(cfg,op.editable);if(foco){var e=raiz.querySelector(foco);if(e)e.focus()}}
  function guardar(){if(op.alCambiar)op.alCambiar({items:cfg.items.map(R.cfg)})}
  function ajustar(i){
    var d=document.createElement('dialog');
    d.className='atajos bd-dlg ind-dlg';d.setAttribute('aria-labelledby','indT');
    d.innerHTML='<div class="at-h"><h2 id="indT">Ajustar indicador</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div><section class="ind-rep"></section>'+
      '<div class="td-bt"><button class="btn pri" type="button" data-cerrar>Listo</button></div>';
    document.body.appendChild(d);
    var c=R.cfg(Object.assign({},cfg.items[i],{filas:'',columnas:'',grafica:false}));
    var ctl=R.montar($('.ind-rep',d),{cfg:c,editable:true,ajustar:true,abierto:true,alCambiar:function(n){n.filas='';n.columnas='';cfg.items[i]=n;guardar();pintar()}});
    d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
    d.addEventListener('close',function(){ctl.destruir();d.remove();pintar('[data-ind="ajustar"][data-i="'+i+'"]')});
    d.showModal();
    setTimeout(function(){var s=d.querySelector('[data-rk="titulo"]');if(s)s.focus()},50);
  }
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('[data-ind]');if(!b||!op.editable)return;
    var a=b.getAttribute('data-ind'),i=+b.getAttribute('data-i');
    if(a==='agregar'){cfg.items.push(R.cfg({titulo:'',periodo:'mes',calculo:'suma',comparar:true}));guardar();pintar();setTimeout(function(){ajustar(cfg.items.length-1)},0)}
    else if(a==='quitar'){cfg.items.splice(i,1);guardar();pintar(cfg.items.length?'[data-ind="ajustar"][data-i="'+Math.min(i,cfg.items.length-1)+'"]':'[data-ind="agregar"]')}
    else if(a==='ajustar')setTimeout(function(){ajustar(i)},0);
  });
  var quitar=null;
  var listo=AT.inventario?AT.inventario.cargar():Promise.resolve();
  listo.then(R.cargarBases).then(function(){
    pintar();
    quitar=B.on(function(){if(!vivo)return;clearTimeout(raiz._t);raiz._t=setTimeout(function(){if(!raiz.contains(document.activeElement))pintar()},120)});
  },function(){pintar()});
  return {destruir:function(){vivo=false;if(quitar)quitar()}};
}

/* ---------- Próximos vencimientos ---------- */
var COL_VENCE=/venc|vigen|l[ií]mite|caduc|entrega|renov|pagar el|fecha de pago/i;
var HECHO=/^(pagad|hech|complet|cancel|entregad|recibid|cerrad|listo)/i;
/* [{fecha, que, donde, doc}] de lo que vence entre hace 60 días y dentro de «dias» */
function vencimientos(cuantos,docs){
  var h=hoy(),lim=cuantos||30,out=[];
  function entra(f){if(!/^\d{4}-\d{2}-\d{2}/.test(f||''))return false;var n=diasA(f);return n>=-60&&n<=lim}
  function diasA(f){return dias(h,f)}
  BASES().forEach(function(b){
    var cs=b.columnas.filter(function(c){return c.tipo==='fecha'&&COL_VENCE.test(c.nombre)});
    if(!cs.length)return;
    var hechas=b.columnas.filter(function(c){return c.tipo==='seleccion'||c.tipo==='casilla'});
    B.filas(b.id).forEach(function(f){
      if(hechas.some(function(c){var v=B.valor(b,f,c);return c.tipo==='casilla'?(v===true&&/pagad|hech|listo|entregad/i.test(c.nombre)):HECHO.test(String(v||''))}))return;
      cs.forEach(function(c){
        var v=B.valor(b,f,c);if(!entra(v))return;
        out.push({fecha:v,que:(B.titulo(b,f)||'Sin nombre')+' · '+c.nombre,donde:b.nombre,doc:b.doc||''});
      });
    });
  });
  (docs||[]).forEach(function(d){
    (d.contenido&&d.contenido.content||[]).forEach(function(n){
      if(!n||!n.attrs)return;
      if(n.type==='pagos'&&AT.pagos){
        var c=AT.pagos.calcular(n.attrs),s=c.siguiente,sf=s&&(s.fecha instanceof Date?s.fecha.getFullYear()+'-'+('0'+(s.fecha.getMonth()+1)).slice(-2)+'-'+('0'+s.fecha.getDate()).slice(-2):s.fecha);
        if(s&&entra(sf))out.push({fecha:sf,que:(n.attrs.titulo||'Plan de pagos')+' · pago '+s.n+' de '+c.n+' ('+AT.pagos.dinero(s.monto)+')',donde:d.titulo||'Sin título',doc:d.id});
      }
      if(n.type==='porpagar')(n.attrs.cuentas||[]).forEach(function(k){
        if(!k||k.pagada||!entra(k.vence))return;
        out.push({fecha:k.vence,que:[k.proveedor,k.concepto].filter(Boolean).join(' · ')||'Cuenta por pagar',donde:d.titulo||'Sin título',doc:d.id});
      });
    });
  });
  return out.sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:a.que.localeCompare(b.que,'es')});
}
var LISTA=[],DOCS=[];
function BASES(){return LISTA.map(function(b){return B.base(b.id)}).filter(Boolean)}
function cuando(f){
  var n=dias(hoy(),f);
  if(n<0)return ['Vencido hace '+(-n)+(n===-1?' día':' días'),'mal'];
  if(n===0)return ['Hoy','mal'];
  if(n===1)return ['Mañana','aviso'];
  return ['En '+n+' días',n<=7?'aviso':''];
}
function htmlVen(l,n){
  if(!l.length)return '<p class="ven-nada">Nada vence en los próximos '+n+' días.</p>';
  return '<ul class="ven">'+l.map(function(x){
    var c=cuando(x.fecha);
    return '<li class="ven-i'+(c[1]?' ven-'+c[1]:'')+'"><span class="ven-c">'+esc(c[0])+'</span><span class="ven-q">'+
      (x.doc?'<a href="'+esc(rutaDoc(x.doc))+'">'+esc(x.que)+'</a>':esc(x.que))+'<small>'+esc(x.donde)+' · '+esc(B.fechaTexto(x.fecha))+'</small></span></li>';
  }).join('')+'</ul>';
}
function montarVen(raiz,op){
  var n=Math.max(1,Math.min(365,parseInt(op.cfg&&op.cfg.dias,10)||30)),vivo=true,docs=[];
  raiz.classList.add('ven-b');
  raiz.innerHTML='<p class="hint">Buscando lo que vence…</p>';
  function pintar(){
    if(!vivo)return;
    raiz.innerHTML=(op.editable?'<label class="ven-d"><span>Mostrar lo que vence en los próximos</span> <select data-ven="dias">'+[7,15,30,60,90].map(function(k){return '<option value="'+k+'"'+(k===n?' selected':'')+'>'+k+' días</option>'}).join('')+'</select></label>':'')+
      htmlVen(vencimientos(n,docs),n);
  }
  function leer(){
    return Promise.all([R.cargarBases(),AT.datos.bases.todos(),AT.datos.documentos.todos()]).then(function(r){LISTA=r[1];docs=r[2].filter(visible)});
  }
  raiz.addEventListener('change',function(e){var s=e.target.closest('[data-ven="dias"]');if(!s)return;n=+s.value;if(op.alCambiar)op.alCambiar({dias:n});pintar();var x=raiz.querySelector('[data-ven="dias"]');if(x)x.focus()});
  var quitar=null;
  leer().then(function(){pintar();quitar=B.on(function(){if(vivo&&!raiz.contains(document.activeElement)){clearTimeout(raiz._t);raiz._t=setTimeout(pintar,150)}})},function(){raiz.innerHTML='<p class="hint">No se pudo leer lo que vence.</p>'});
  return {destruir:function(){vivo=false;if(quitar)quitar()}};
}

/* ---------- Registrar: leer, imprimir y editor ---------- */
var BLOQUES={
  indicadores:{montar:montarInd,etiqueta:'Indicadores',
    papel:function(a){return htmlInd(a.cfg,false)},
    texto:function(a){return items(a.cfg).map(function(c){var x=R.calcular(c);return (c.titulo||'Indicador')+': '+(x?R.fmt(x,x.total):'—')}).join(' · ')},
    insertar:{k:'indicadores',t:'Indicadores',d:'Cifras clave: ventas del mes, inventario, por pagar; con flecha contra el mes pasado',i:'grafica',p:'indicadores kpi cifras tablero ventas mes inventario por pagar resumen negocio'}},
  vencimientos:{montar:montarVen,etiqueta:'Próximos vencimientos',
    papel:function(a){var n=parseInt(a.cfg&&a.cfg.dias,10)||30;return htmlVen(vencimientos(n,DOCS),n)},
    texto:function(){return 'Próximos vencimientos'},
    insertar:{k:'vencimientos',t:'Próximos vencimientos',d:'Lo que vence pronto: pagos, cuentas por pagar, vigencias y fechas límite',i:'aviso',p:'vencimientos vence pagos pendientes fechas limite vigencia por pagar agenda proximos'}}
};
Object.keys(BLOQUES).forEach(function(nombre){
  var D=BLOQUES[nombre];
  if(AT.bloques&&AT.bloques.registrar)AT.bloques.registrar(nombre,{
    dibujar:function(n,ctx,h){
      var a=h.attrs(n),s=document.createElement('section');s.setAttribute('aria-label',D.etiqueta);
      var pag=document.body.getAttribute('data-pagina');
      if(pag!=='documento'&&pag!=='inicio'){s.className=nombre==='indicadores'?'ind-b ind-papel':'ven-b ven-papel';s.innerHTML=D.papel(a);return s}
      D.montar(s,{cfg:a.cfg,editable:false});
      return s;
    },
    texto:function(n){return D.texto(n.attrs||{})+'\n'}
  });
  if(AT.piezas&&AT.piezas.md)AT.piezas.md[nombre]=function(n){return '**'+D.etiqueta+'**\n\n'+D.texto(n.attrs||{})};
  var T=window.Tiptap;
  if(!T||!AT.editor)return;
  var Nodo=T.Node.create({
    name:nombre,group:'block',atom:true,selectable:true,draggable:false,
    addAttributes:function(){return {cfg:{default:null,parseHTML:function(e){try{return JSON.parse(e.getAttribute('data-cfg')||'null')}catch(x){return null}},
      renderHTML:function(a){return a.cfg?{'data-cfg':JSON.stringify(a.cfg)}:{}}}}},
    parseHTML:function(){return [{tag:'div[data-'+nombre+']'}]},
    renderHTML:function(o){var x={};x['data-'+nombre]='';return ['div',T.mergeAttributes(o.HTMLAttributes,x)]},
    addNodeView:function(){
      return function(p){
        var dom=document.createElement('section');dom.contentEditable='false';
        dom.innerHTML='';
        var cab=document.createElement('div');cab.className='ed-rep-h';cab.innerHTML='<span class="ed-et">'+esc(D.etiqueta)+'</span>';
        var cuerpo=document.createElement('div');
        dom.appendChild(cab);dom.appendChild(cuerpo);dom.className='nb nb-ed ind-ed';
        var ctl=D.montar(cuerpo,{cfg:p.node.attrs.cfg,editable:true,alCambiar:function(c){
          var pos=typeof p.getPos==='function'?p.getPos():null;if(pos==null)return;
          p.editor.view.dispatch(p.editor.state.tr.setNodeAttribute(pos,'cfg',c));
        }});
        return {dom:dom,update:function(n){return n.type.name===nombre},destroy:function(){ctl.destruir()},stopEvent:function(){return true},ignoreMutation:function(){return true}};
      };
    }
  });
  AT.editorExtensiones=(AT.editorExtensiones||[]).concat([Nodo]);
  if(AT.editorConId)AT.editorConId.push(nombre);
  if(AT.editorInsertar)AT.editorInsertar.push({k:D.insertar.k,t:D.insertar.t,d:D.insertar.d,i:D.insertar.i,p:D.insertar.p,modulo:'negocio',
    f:function(c){return c.insertContent({type:nombre,attrs:{cfg:null}})}});
});
/* Al imprimir: el inventario y las bases ya leídos */
if(B.precargas)B.precargas.push(function(doc){
  var t=JSON.stringify(doc&&doc.contenido||{});
  if(t.indexOf('"type":"indicadores"')<0&&t.indexOf('"type":"vencimientos"')<0)return null;
  return (AT.inventario?AT.inventario.cargar():Promise.resolve()).then(R.cargarBases).then(function(){return Promise.all([AT.datos.bases.todos(),AT.datos.documentos.todos()])}).then(function(r){LISTA=r[0];DOCS=r[1].filter(visible)});
});

AT.indicadores={delNegocio:delNegocio,montarIndicadores:montarInd,montarVencimientos:montarVen,vencimientos:vencimientos,htmlIndicadores:htmlInd};
})();
