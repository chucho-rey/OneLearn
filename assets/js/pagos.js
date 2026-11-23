/* OneLearn: bloque «Plan de pagos» (en cualquier documento).
   Para llevar una deuda: el monto total y, o el número de pagos (OneLearn calcula cuánto es cada uno), o cuánto
   pagas cada vez (calcula cuántos pagos son). Con la frecuencia (semanal, quincenal o mensual) y la fecha del
   primer pago arma el calendario. Cada pago se marca como pagado (también al leer) y se descuenta de lo que debes.
   attrs: {titulo, modo:'plazos'|'cuota', monto, pagos, cuota, frecuencia:'semanal'|'quincenal'|'mensual', inicio:'AAAA-MM-DD',
           pagados:{<número de pago>: 'AAAA-MM-DD'}}. Los montos se guardan como texto y se calculan en centavos.
   Registra el nodo en el editor (AT.editorExtensiones, AT.editorInsertar), su dibujo al leer (AT.bloques.registrar)
   y su Markdown (AT.piezas.md). Se carga después de piezas.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc;
var FRECUENCIAS=[['semanal','Semanal'],['quincenal','Quincenal'],['mensual','Mensual']];
var DEF={titulo:'',modo:'plazos',monto:'',pagos:'12',cuota:'',frecuencia:'mensual',inicio:'',pagados:{}};

/* ---------- Cálculo ---------- */
function centavos(v){var n=parseFloat(String(v==null?'':v).replace(/[$,\s]/g,''));return isFinite(n)&&n>0?Math.round(n*100):0}
function dinero(c){return (c/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}
function fechaDe(t){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function sumarMeses(d,m){var r=new Date(d.getFullYear(),d.getMonth()+m,1),fin=new Date(r.getFullYear(),r.getMonth()+1,0).getDate();r.setDate(Math.min(d.getDate(),fin));return r}
/* Fecha del pago k (0 = el primero) */
function fecha(inicio,frecuencia,k){
  var d=fechaDe(inicio);if(!d)return null;
  if(frecuencia==='semanal'){d.setDate(d.getDate()+7*k);return d}
  if(frecuencia==='quincenal'){var r=sumarMeses(d,Math.floor(k/2));if(k%2)r.setDate(r.getDate()+15);return r}
  return sumarMeses(d,k);
}
function fechaTexto(d){return d?d.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'}):''}
/* El calendario: [{n, monto (centavos), fecha, pagado}] y los totales */
function calcular(a){
  a=Object.assign({},DEF,a||{});
  var total=centavos(a.monto),lista=[],cuota,n;
  if(total){
    if(a.modo==='cuota'){
      cuota=centavos(a.cuota);
      n=cuota?Math.min(520,Math.ceil(total/cuota)):0;
    }else{
      n=Math.max(0,Math.min(520,parseInt(a.pagos,10)||0));
      cuota=n?Math.round(total/n):0;
    }
    for(var k=0;k<n;k++){
      /* El último pago absorbe el redondeo, así la suma da exactamente el total */
      var m=k===n-1?total-cuota*(n-1):cuota;
      lista.push({n:k+1,monto:m,fecha:fecha(a.inicio,a.frecuencia,k),pagado:a.pagados&&a.pagados[k+1]||''});
    }
  }
  var pagado=lista.filter(function(x){return x.pagado}).reduce(function(s,x){return s+x.monto},0);
  var sig=lista.filter(function(x){return !x.pagado})[0]||null;
  return {total:total,lista:lista,cuota:cuota||0,n:lista.length,pagado:pagado,resta:total-pagado,hechos:lista.filter(function(x){return x.pagado}).length,siguiente:sig};
}
function nombreFrecuencia(f){var x=FRECUENCIAS.filter(function(y){return y[0]===f})[0];return x?x[1].toLowerCase():'mensual'}
function resumenTexto(a,c){
  if(!c.total)return 'Plan de pagos sin monto.';
  return 'Total '+dinero(c.total)+' en '+c.n+(c.n===1?' pago ':' pagos ')+nombreFrecuencia(a.frecuencia)+(c.n===1?'':'es')+'. Pagado '+dinero(c.pagado)+'; faltan '+dinero(c.resta)+'.';
}

/* ---------- Lo que se ve: resumen y calendario (al editar y al leer) ---------- */
function htmlResumen(c){
  var pct=c.total?Math.round(c.pagado/c.total*100):0;
  return '<dl class="pg-k">'+
    '<div><dt>Total</dt><dd>'+dinero(c.total)+'</dd></div>'+
    '<div><dt>Pagado</dt><dd>'+dinero(c.pagado)+'</dd></div>'+
    '<div class="pg-resta"><dt>Te falta</dt><dd>'+dinero(c.resta)+'</dd></div>'+
    '<div><dt>Pagos</dt><dd>'+c.hechos+' de '+c.n+'</dd></div></dl>'+
    '<div class="pg-barra" role="progressbar" aria-label="Avance del pago" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><i style="width:'+pct+'%"></i></div>'+
    '<p class="pg-sig">'+(c.n&&!c.siguiente?'Terminaste de pagar.':c.siguiente?'Siguiente pago: <b>'+dinero(c.siguiente.monto)+'</b>'+(c.siguiente.fecha?' el '+esc(fechaTexto(c.siguiente.fecha)):'')+'.':'')+'</p>';
}
function htmlLista(c,uid,editable){
  if(!c.n)return '';
  return '<ol class="pg-l" aria-label="Pagos">'+c.lista.map(function(x){
    var id=uid+'-'+x.n;
    return '<li class="pg-i'+(x.pagado?' pagado':'')+'"><input type="checkbox" id="'+id+'" data-pago="'+x.n+'"'+(x.pagado?' checked':'')+(editable?'':' disabled')+'>'+
      '<label for="'+id+'"><span class="pg-n">Pago '+x.n+'</span><span class="pg-f">'+(x.fecha?esc(fechaTexto(x.fecha)):'')+'</span><span class="pg-m">'+dinero(x.monto)+'</span>'+
      (x.pagado?'<span class="pg-ok">Pagado'+(/^\d{4}-\d{2}-\d{2}$/.test(x.pagado)?' el '+esc(fechaTexto(fechaDe(x.pagado))):'')+'</span>':'')+'</label></li>';
  }).join('')+'</ol>';
}
function hoy(){return iso(new Date())}

/* ---------- Al leer: se dibuja y, en tus documentos, se puede marcar como pagado ---------- */
if(AT.bloques&&AT.bloques.registrar){
  AT.bloques.registrar('pagos',{
    dibujar:function(n,c,h){
      var a=Object.assign({},DEF,h.attrs(n)),id=h.attrs(n).id,d=h.el('section','pg pg-leer',{'aria-label':a.titulo||'Plan de pagos'});
      var uid='pg'+AT.bloques.nuevoId().slice(2);
      /* Solo en documento.html y en tu propio documento se puede marcar (no al imprimir) */
      var editable=!!(AT.docActual&&AT.docCambio&&id&&document.body.getAttribute('data-pagina')==='documento');
      function pintar(){
        var cal=calcular(a);
        d.innerHTML='<h3 class="pg-t">'+esc(a.titulo||'Plan de pagos')+'</h3>'+
          (cal.total?htmlResumen(cal)+htmlLista(cal,uid,editable):'<p class="hint">Este plan de pagos todavía no tiene monto.</p>');
      }
      d.addEventListener('change',function(e){
        var k=e.target.getAttribute('data-pago');if(!k||!editable)return;
        var blk=(AT.docActual.contenido.content||[]).filter(function(b){return b.attrs&&b.attrs.id===id})[0];
        if(!blk)return;
        var p=Object.assign({},blk.attrs.pagados||{});
        if(e.target.checked)p[k]=hoy();else delete p[k];
        blk.attrs.pagados=p;a.pagados=p;
        AT.docCambio();
        pintar();
        var x=d.querySelector('[data-pago="'+k+'"]');if(x)x.focus();
      });
      pintar();
      return d;
    },
    texto:function(n){var a=Object.assign({},DEF,n.attrs||{});return (a.titulo?a.titulo+'\n':'')+resumenTexto(a,calcular(a))+'\n'}
  });
}
/* Markdown (documento.js lo busca en AT.piezas.md) */
if(AT.piezas&&AT.piezas.md){
  AT.piezas.md.pagos=function(n){
    var a=Object.assign({},DEF,n.attrs||{}),c=calcular(a);
    return '**'+(a.titulo||'Plan de pagos')+'**\n\n'+resumenTexto(a,c)+(c.n?'\n\n'+c.lista.map(function(x){
      return '- ['+(x.pagado?'x':' ')+'] Pago '+x.n+(x.fecha?' · '+fechaTexto(x.fecha):'')+' · '+dinero(x.monto);
    }).join('\n'):'');
  };
}
AT.pagos={calcular:calcular,dinero:dinero,centavos:centavos};

/* =====================================================================================
   Editor
   ===================================================================================== */
var T=window.Tiptap;
if(!T||!AT.editor)return;
var abrirNuevo=false;
function vista(p){
  var node=p.node,dom=document.createElement('div');
  dom.className='pg pg-ed';dom.contentEditable='false';
  var uid='pg'+AT.bloques.nuevoId().slice(2);
  dom.innerHTML='<div class="ed-rep-h"><span class="ed-et">Plan de pagos</span></div>'+
    '<input type="text" class="ed-fig-tit pg-tit" data-c="titulo" placeholder="¿Qué estás pagando? (ej. Préstamo de la moto)" aria-label="Nombre del plan de pagos">'+
    '<div class="pg-form">'+
      '<label class="ed-campo"><span>Monto total de la deuda</span><input type="text" inputmode="decimal" data-c="monto" placeholder="$20,000"></label>'+
      '<fieldset class="pg-modo"><legend>¿Cómo vas a pagar?</legend>'+
        '<label class="pg-op"><input type="radio" name="'+uid+'-m" value="plazos" data-c="modo">En un número de pagos</label>'+
        '<label class="pg-op"><input type="radio" name="'+uid+'-m" value="cuota" data-c="modo">Con un pago fijo</label></fieldset>'+
      '<label class="ed-campo pg-plazos"><span>Número de pagos</span><input type="number" min="1" max="520" step="1" inputmode="numeric" data-c="pagos"></label>'+
      '<label class="ed-campo pg-cuota"><span>Pago cada vez</span><input type="text" inputmode="decimal" data-c="cuota" placeholder="$1,500"></label>'+
      '<label class="ed-campo"><span>Cada cuánto</span><select data-c="frecuencia">'+FRECUENCIAS.map(function(f){return '<option value="'+f[0]+'">'+f[1]+'</option>'}).join('')+'</select></label>'+
      '<label class="ed-campo"><span>Primer pago (opcional)</span><input type="date" data-c="inicio"></label>'+
    '</div><div class="pg-res" aria-live="polite"></div><div class="pg-lista"></div>';
  function a(){return Object.assign({},DEF,node.attrs)}
  function campos(){
    var x=a();
    $$('[data-c]',dom).forEach(function(c){
      var k=c.getAttribute('data-c');
      if(c.type==='radio'){c.checked=c.value===x.modo;return}
      if(document.activeElement!==c&&c.value!==String(x[k]||''))c.value=x[k]||'';
    });
    dom.classList.toggle('modo-cuota',x.modo==='cuota');
  }
  function pintar(){
    var x=a(),c=calcular(x);
    $('.pg-res',dom).innerHTML=c.total?htmlResumen(c)+(x.modo==='plazos'&&c.n?'<p class="pg-calc">'+c.n+(c.n===1?' pago de ':' pagos de ')+dinero(c.cuota)+(c.lista[c.n-1].monto!==c.cuota?' (el último, '+dinero(c.lista[c.n-1].monto)+')':'')+'.</p>':
      x.modo==='cuota'&&c.n?'<p class="pg-calc">'+c.n+(c.n===1?' pago':' pagos')+(c.n>1&&c.lista[c.n-1].monto!==c.cuota?' (el último, de '+dinero(c.lista[c.n-1].monto)+')':'')+'.</p>':''):
      '<p class="hint">Escribe el monto total para ver los pagos.</p>';
    $('.pg-lista',dom).innerHTML=htmlLista(c,uid,true);
  }
  function poner(k,v){
    var pos=typeof p.getPos==='function'?p.getPos():null;if(pos==null)return;
    p.editor.view.dispatch(p.editor.state.tr.setNodeAttribute(pos,k,v));
  }
  dom.addEventListener('input',function(e){
    var k=e.target.getAttribute('data-c');if(!k||e.target.type==='radio')return;
    poner(k,e.target.value);
  });
  dom.addEventListener('change',function(e){
    var t=e.target,k=t.getAttribute('data-c');
    if(k==='modo'||k==='frecuencia'||k==='inicio'){poner(k,t.value);return}
    var n=t.getAttribute('data-pago');
    if(n){var pg=Object.assign({},node.attrs.pagados||{});if(t.checked)pg[n]=hoy();else delete pg[n];poner('pagados',pg);var f=$('[data-pago="'+n+'"]',dom);if(f)f.focus()}
  });
  campos();pintar();
  if(abrirNuevo){abrirNuevo=false;setTimeout(function(){var t=$('[data-c="monto"]',dom);if(t&&dom.isConnected)t.focus()},0)}
  return {dom:dom,
    update:function(n){if(n.type.name!=='pagos')return false;node=n;campos();pintar();return true},
    stopEvent:function(e){return !!(e.target&&e.target.closest&&e.target.closest('input,select,textarea,button,label,fieldset'))},
    ignoreMutation:function(){return true}};
}
function attrJSON(nombre,def){
  return {default:def,parseHTML:function(e){try{var v=e.getAttribute('data-'+nombre);return v==null?def:JSON.parse(v)}catch(x){return def}},
    renderHTML:function(a){var o={};o['data-'+nombre]=JSON.stringify(a[nombre]);return o}};
}
var Pagos=T.Node.create({
  name:'pagos',group:'block',atom:true,selectable:true,draggable:false,
  addAttributes:function(){var o={};Object.keys(DEF).forEach(function(k){o[k]=attrJSON(k,DEF[k])});return o},
  parseHTML:function(){return [{tag:'div[data-pagos]'}]},
  renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-pagos':''})]},
  addNodeView:function(){return vista}
});
AT.editorExtensiones=(AT.editorExtensiones||[]).concat([Pagos]);
if(AT.editorInsertar)AT.editorInsertar.push({k:'pagos',t:'Plan de pagos',d:'Una deuda en pagos: cuánto pagas y cuánto te falta',i:'pagos',
  p:'deuda prestamo credito abonos mensualidades quincenas dinero cuotas',f:function(c){abrirNuevo=true;return c.insertContent({type:'pagos',attrs:{pagados:{}}})}});
})();
