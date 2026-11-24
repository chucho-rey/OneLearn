/* OneBook: importar la factura XML (CFDI 4.0 o 3.3) de un proveedor (fase F7b).
   Se lee en el navegador (DOMParser, sin enviar nada a ningún lado): emisor, folio, fecha, subtotal, IVA, total,
   método de pago, folio fiscal (UUID) y cada concepto (código, descripción, cantidad, valor unitario, importe,
   descuento). La ventana propone a qué producto va cada concepto (por código, por nombre o «Producto nuevo»; también
   «No es de inventario», como un flete) y al confirmar:
   - crea los productos nuevos (con su código, el proveedor y el costo),
   - registra una entrada por concepto en «Entradas y salidas» (origen cfdi:<UUID>:<concepto>),
   - deja el costo nuevo en cada producto,
   - y anota la compra en «Compras» (PUE: pagada; PPD: por pagar, con vencimiento por sus condiciones o a 30 días).
   Una factura con el mismo folio fiscal no se importa dos veces. Expone AT.factura (leer, abrir). Usa inventario.js. */
(function(){
'use strict';
var AT=window.AT,B=AT.bases,$=AT.$,esc=AT.esc;
if(!B||!AT.inventario)return;
var I=AT.inventario;

function n(v){var x=parseFloat(String(v==null?'':v).replace(/[,\s$]/g,''));return isFinite(x)?x:0}
function r2(x){return Math.round(x*100)/100}
function hoy(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function masDias(f,d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(f||'');if(!m)return '';var x=new Date(+m[1],+m[2]-1,+m[3]+d);return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2)}
/* Los nodos por su nombre local (cfdi:Concepto, tfd:TimbreFiscalDigital), sin importar el prefijo */
function hijos(raiz,nombre){return Array.prototype.filter.call(raiz.getElementsByTagName('*'),function(e){return e.localName===nombre})}
function attr(e,k){return e?(e.getAttribute(k)||'').trim():''}

/* Lee el texto de un XML: {proveedor, rfc, folio, fecha, subtotal, descuento, iva, total, moneda, metodo, condiciones, uuid, conceptos:[…]} */
function leer(texto){
  var doc=new DOMParser().parseFromString(String(texto||''),'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw new Error('El archivo no es un XML válido.');
  var c=doc.documentElement;
  if(!c||c.localName!=='Comprobante')throw new Error('El archivo no es una factura electrónica (CFDI).');
  var tipo=attr(c,'TipoDeComprobante');
  if(tipo&&tipo!=='I')throw new Error(tipo==='E'?'Es una nota de crédito (egreso), no una factura de compra.':tipo==='P'?'Es un complemento de pago, no una factura de compra.':'Este comprobante no es una factura de ingreso.');
  var em=hijos(c,'Emisor')[0],tfd=hijos(c,'TimbreFiscalDigital')[0];
  var imp=hijos(c,'Impuestos').filter(function(e){return e.parentNode===c})[0];
  var conceptos=hijos(c,'Concepto').map(function(e,i){
    var cant=n(attr(e,'Cantidad')),imp=n(attr(e,'Importe')),desc=n(attr(e,'Descuento'));
    return {i:i,codigo:attr(e,'NoIdentificacion'),clave:attr(e,'ClaveProdServ'),unidad:attr(e,'Unidad')||attr(e,'ClaveUnidad'),
      descripcion:attr(e,'Descripcion'),cantidad:cant,valor:n(attr(e,'ValorUnitario')),importe:imp,descuento:desc,
      costo:cant>0?r2((imp-desc)/cant):0};
  });
  var fecha=attr(c,'Fecha').slice(0,10),serie=attr(c,'Serie'),folio=attr(c,'Folio');
  var sub=n(attr(c,'SubTotal')),desc=n(attr(c,'Descuento')),total=n(attr(c,'Total'));
  var iva=imp?n(attr(imp,'TotalImpuestosTrasladados')):0;
  if(!imp)iva=r2(total-(sub-desc));
  return {proveedor:attr(em,'Nombre')||attr(em,'Rfc')||'Proveedor',rfc:attr(em,'Rfc'),folio:(serie&&folio?serie+'-'+folio:serie+folio)||'',
    fecha:/^\d{4}-\d{2}-\d{2}$/.test(fecha)?fecha:hoy(),subtotal:r2(sub-desc),descuento:desc,iva:r2(iva),total:total,moneda:attr(c,'Moneda')||'MXN',
    metodo:attr(c,'MetodoPago'),condiciones:attr(c,'CondicionesDePago'),uuid:attr(tfd,'UUID').toUpperCase(),conceptos:conceptos};
}
/* El producto que corresponde a un concepto: por código; si no, por descripción igual al nombre */
function proponer(cpt){
  var ps=I.productos(),q=B.sinAcentos(cpt.descripcion).replace(/\s+/g,' ').trim();
  var p=cpt.codigo&&ps.filter(function(x){return x.codigo&&B.sinAcentos(x.codigo)===B.sinAcentos(cpt.codigo)})[0];
  if(!p)p=ps.filter(function(x){return B.sinAcentos(x.nombre).replace(/\s+/g,' ').trim()===q})[0];
  return p?p.id:'nuevo';
}
/* Un nombre legible para un producto nuevo («COCA COLA 600ML» → «Coca Cola 600ml») */
function nombreBonito(t){
  t=String(t||'').trim();
  if(t&&t===t.toUpperCase())t=t.toLowerCase().replace(/(^|\s)(\S)/g,function(m,a,b){return a+b.toUpperCase()});
  return t||'Producto';
}
function vencimiento(f){
  if(f.metodo==='PUE')return '';
  var m=/(\d+)\s*d/i.exec(f.condiciones||'');
  return masDias(f.fecha,m?+m[1]:30);
}
/* ¿Ya se importó? (por folio fiscal, en Compras) */
function yaImportada(f,ids){
  if(!f.uuid||!ids.compras)return null;
  var b=B.base(ids.compras);if(!b)return null;
  return B.filas(b.id).filter(function(x){return String(x.v['c-uuid']||'').toUpperCase()===f.uuid})[0]||null;
}

/* Guarda: productos nuevos, entradas, costos y la compra. destinos: [{i, a:'nuevo'|'no'|idProducto}] */
function importar(f,destinos,doc){
  return I.asegurar(doc,['productos','movimientos','compras']).then(function(ids){
    return Promise.all([B.cargar(ids.productos),B.cargar(ids.movimientos),B.cargar(ids.compras)]).then(function(){
      if(yaImportada(f,ids))throw new Error('Esta factura ya se había importado.');
      var pb=B.base(ids.productos),mb=B.base(ids.movimientos),cb=B.base(ids.compras);
      var prods=[],movs=[],orden=B.filas(pb.id).reduce(function(x,r){return Math.max(x,r.orden||0)},0),ordenM=B.filas(mb.id).reduce(function(x,r){return Math.max(x,r.orden||0)},0);
      var etiqueta='Factura'+(f.folio?' '+f.folio:'');
      destinos.forEach(function(d){
        var cpt=f.conceptos[d.i];if(!cpt||d.a==='no'||!(cpt.cantidad>0))return;
        var fila;
        if(d.a==='nuevo'){
          fila=B.nuevaFila(pb.id,{'p-nombre':nombreBonito(cpt.descripcion),'p-prov':f.proveedor,'p-costo':cpt.costo,'p-ini':0});
          if(cpt.codigo)fila.v['p-codigo']=cpt.codigo;
          fila.orden=++orden;
        }else{
          var ya=B.fila(pb.id,d.a);if(!ya)return;
          fila=prods.filter(function(x){return x.id===ya.id})[0]||B.clonar(ya);
          fila.v['p-costo']=cpt.costo;
          if(!fila.v['p-prov'])fila.v['p-prov']=f.proveedor;
          if(!fila.v['p-codigo']&&cpt.codigo)fila.v['p-codigo']=cpt.codigo;
        }
        if(prods.indexOf(fila)<0)prods.push(fila);
        var m=B.nuevaFila(mb.id,{'m-con':etiqueta,'m-fecha':f.fecha,'m-prod':fila.id,'m-tipo':'Entrada','m-cant':cpt.cantidad,'m-pu':cpt.costo,
          'm-nota':f.proveedor,'m-origen':'cfdi:'+(f.uuid||f.folio||'')+':'+cpt.i});
        m.orden=++ordenM;movs.push(m);
      });
      var compra=B.nuevaFila(cb.id,{'c-prov':f.proveedor,'c-fecha':f.fecha,'c-sub':f.subtotal,'c-iva':f.iva,'c-total':f.total,
        'c-estado':f.metodo==='PUE'?'Pagada':'Por pagar'});
      if(f.folio)compra.v['c-folio']=f.folio;
      if(f.rfc)compra.v['c-rfc']=f.rfc;
      if(f.uuid)compra.v['c-uuid']=f.uuid;
      var vence=vencimiento(f);if(vence)compra.v['c-vence']=vence;
      return B.guardarFilas(prods).then(function(){return B.guardarFilas(movs)}).then(function(){return B.guardarFila(compra)})
        .then(function(){return {productos:prods.length,nuevos:destinos.filter(function(d){return d.a==='nuevo'}).length,entradas:movs.length}});
    });
  });
}

/* ---------- La ventana ---------- */
function abrir(){
  var d=document.createElement('dialog');
  d.className='atajos bd-dlg inv-dlg fac-dlg';d.setAttribute('aria-labelledby','facT');
  d.innerHTML='<div class="at-h"><h2 id="facT">Importar factura XML</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+AT.ico('close')+'</button></div>'+
    '<div class="fac-c"><p class="td-p">Elige el archivo XML de la factura de tu proveedor (el que te llega por correo junto con el PDF). Se lee aquí, en tu navegador.</p>'+
    '<label class="campo-l"><span>Archivo XML</span><input type="file" accept=".xml,text/xml,application/xml" data-archivo></label>'+
    '<p class="bd-msg" data-msg aria-live="polite"></p><div data-vista></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){d.remove()});
  var msg=$('[data-msg]',d),vista=$('[data-vista]',d),fac=null;
  $('[data-archivo]',d).addEventListener('change',function(){
    var a=this.files&&this.files[0];vista.innerHTML='';msg.textContent='';fac=null;
    if(!a)return;
    if(a.size>5*1024*1024){msg.textContent='El archivo es demasiado grande para ser una factura.';return}
    a.text().then(function(t){
      return I.cargar().then(function(ids){fac=leer(t);mostrar(ids||{})});
    }).catch(function(e){msg.textContent=e&&e.message||'No se pudo leer el archivo.'});
  });
  function mostrar(ids){
    var ya=yaImportada(fac,ids);
    var ps=I.productos().sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es')});
    var ops=function(sel){return '<option value="nuevo"'+(sel==='nuevo'?' selected':'')+'>Producto nuevo</option><option value="no"'+(sel==='no'?' selected':'')+'>No es de inventario</option>'+
      ps.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===sel?' selected':'')+'>'+esc(p.nombre)+(p.codigo?' ('+esc(p.codigo)+')':'')+'</option>'}).join('')};
    vista.innerHTML='<dl class="nb-k fac-k"><div><dt>Proveedor</dt><dd>'+esc(fac.proveedor)+'</dd></div><div><dt>Folio</dt><dd>'+esc(fac.folio||'—')+'</dd></div>'+
      '<div><dt>Fecha</dt><dd>'+esc(B.fechaTexto(fac.fecha))+'</dd></div><div><dt>Total</dt><dd>'+esc(B.dinero(fac.total))+'</dd></div></dl>'+
      (fac.moneda!=='MXN'?'<p class="fac-aviso">Esta factura está en '+esc(fac.moneda)+': los costos se anotan tal como vienen.</p>':'')+
      (ya?'<p class="fac-aviso">Esta factura ya se importó. Si la vuelves a importar se duplicarían las entradas.</p>':'')+
      '<div class="nb-scroll"><table class="nb-tab fac-t"><thead><tr><th scope="col">Concepto</th><th scope="col" class="num">Cant.</th><th scope="col" class="num">Costo</th><th scope="col">Va a</th></tr></thead><tbody>'+
      fac.conceptos.map(function(c){
        return '<tr><td>'+esc(c.descripcion)+(c.codigo?'<br><small>'+esc(c.codigo)+'</small>':'')+'</td><td class="num">'+esc(B.numero(c.cantidad))+'</td><td class="num">'+esc(B.dinero(c.costo))+'</td>'+
          '<td><select data-i="'+c.i+'" aria-label="Producto para '+esc(c.descripcion)+'">'+ops(proponer(c))+'</select></td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<p class="hint">Subtotal '+esc(B.dinero(fac.subtotal))+' · IVA '+esc(B.dinero(fac.iva))+' · '+(fac.metodo==='PUE'?'pagada al momento (PUE)':'a crédito (PPD): queda por pagar'+(vencimiento(fac)?', vence el '+esc(B.fechaTexto(vencimiento(fac))):''))+'.</p>'+
      '<div class="td-bt"><button class="btn pri" type="button" data-importar'+(ya?' aria-disabled="true"':'')+'>Registrar la compra</button><button class="btn" type="button" data-cerrar>Cancelar</button></div>';
    var bt=$('[data-importar]',vista);
    bt.addEventListener('click',function(){
      if(bt.getAttribute('aria-disabled')==='true')return;
      bt.setAttribute('aria-disabled','true');
      var destinos=Array.prototype.map.call(vista.querySelectorAll('select[data-i]'),function(s){return {i:+s.getAttribute('data-i'),a:s.value}});
      importar(fac,destinos,AT.docActual&&AT.docActual.id).then(function(r){
        d.close();
        AT.aviso('Factura'+(fac.folio?' '+fac.folio:'')+' de '+fac.proveedor+': '+r.entradas+(r.entradas===1?' entrada':' entradas')+(r.nuevos?', '+r.nuevos+(r.nuevos===1?' producto nuevo':' productos nuevos'):'')+'.');
      },function(e){bt.removeAttribute('aria-disabled');msg.textContent=e&&e.message||'No se pudo registrar. Inténtalo otra vez.'});
    });
  }
  d.showModal();
  $('[data-archivo]',d).focus();
}

AT.factura={leer:leer,proponer:proponer,importar:importar,abrir:abrir,nombreBonito:nombreBonito};
})();
