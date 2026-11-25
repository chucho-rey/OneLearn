/* OneBook: inventario conectado (fase F7).
   El inventario de un negocio vive en bases de datos con rol (bases.js), una sola vez por espacio:
   - Productos (rol productos): producto, código, categoría, proveedor, costo, precio, existencias al empezar, mínimo;
     calcula «Entradas y salidas» (suma de Movimientos), Existencias, Por surtir, Estado (Bien, Bajo, Agotado),
     Valor y Ganancia por pieza. Vistas: productos, por surtir (por proveedor), por categoría y lista de precios.
   - Movimientos (rol movimientos): cada entrada, salida, venta o ajuste, con su producto (relación) y su cantidad;
     «Cambio» le pone el signo (las entradas y los ajustes suman; las salidas y las ventas restan).
   - Compras (rol compras): las facturas de los proveedores (la llena la importación del XML, fase F7b).
   - Gastos (rol gastos) y Presupuesto (rol presupuesto, cuánto quieres gastar al mes por categoría): los usa la
     plantilla «Presupuesto del mes», con un reporte de lo gastado contra lo presupuestado (fase F7d).
   - Empleados (rol empleados) e Incidencias (rol incidencias: faltas, vacaciones, incapacidades, permisos y horas
     extra de cada persona): las usa el módulo de recursos humanos (equipo.js); ids de columna em-* e in-*.
   Las páginas las muestran con un bloque «Base de datos» cuya semilla lleva el rol ({rol:'productos'}): al abrir la
   página, AT.inventario.base(rol) la busca o la crea, así que la plantilla Inventario, sus duplicados y tus
   plantillas hablan de la misma base. Las notas de venta (venta.js) eligen el producto y, al guardarse la página,
   cada concepto con producto se vuelve un movimiento «Venta» (origen venta:<página>:<bloque>:<concepto>): si cambias
   la nota cambia el movimiento, y si la página va a la papelera se quitan.
   El bloque «Resumen del inventario» muestra valor, productos bajo el mínimo y agotados, lo que hay que surtir por
   proveedor con «Hacer pedido» (crea la página del pedido), «Registrar entrada» e «Importar factura XML» (factura.js).
   Expone AT.inventario. Se carga después de bases.js (y de negocio.js y venta.js, si están). */
(function(){
'use strict';
var AT=window.AT,B=AT.bases,$=AT.$,esc=AT.esc;
if(!B||!AT.datos)return;
var ROLES=['productos','movimientos','compras','gastos','presupuesto','empleados','incidencias'];
var NOMBRES={productos:'Productos',movimientos:'Entradas y salidas',compras:'Compras',gastos:'Gastos',presupuesto:'Presupuesto',
  empleados:'Empleados',incidencias:'Incidencias'};
var TIPOS_INC=['Falta','Vacaciones','Incapacidad','Permiso','Horas extra','Retardo'];
var PERIODOS_PAGO=['Semanal','Catorcenal','Quincenal','Mensual'];
var CATS_GASTO=['Renta','Luz','Agua','Internet y teléfono','Sueldos','Mercancía','Transporte','Impuestos','Mantenimiento','Publicidad','Otros'];
var CATS=['Abarrotes','Bebidas','Botanas','Lácteos','Limpieza','Higiene','Otros'];
var TIPOS_MOV=['Entrada','Salida','Venta','Ajuste'];

function hoy(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function vista(id,nombre,tipo,extra){return Object.assign({id:id,nombre:nombre,tipo:tipo,q:'',f:{col:'',op:'contiene',val:''},s:{col:'',dir:1},s2:{col:'',dir:1},ocultas:[]},extra||{})}
/* La forma de cada base (las ids de columna son fijas: el resto del código las usa) */
function semilla(rol,ids){
  ids=ids||{};
  if(rol==='productos')return {nombre:NOMBRES.productos,rol:rol,columnas:[
    {id:'p-nombre',nombre:'Producto',tipo:'texto'},
    {id:'p-codigo',nombre:'Código',tipo:'texto'},
    {id:'p-cat',nombre:'Categoría',tipo:'seleccion',opciones:CATS.slice()},
    {id:'p-prov',nombre:'Proveedor',tipo:'texto'},
    {id:'p-costo',nombre:'Costo',tipo:'moneda'},
    {id:'p-precio',nombre:'Precio',tipo:'moneda'},
    {id:'p-ini',nombre:'Al empezar',tipo:'numero'},
    {id:'p-mov',nombre:'Entradas y salidas',tipo:'suma',base:ids.movimientos||'',rel:'m-prod',campo:'m-cambio'},
    {id:'p-exist',nombre:'Existencias',tipo:'formula',expr:'{Al empezar} + {Entradas y salidas}',pie:'suma',negritas:true},
    {id:'p-min',nombre:'Mínimo',tipo:'numero'},
    {id:'p-falta',nombre:'Por surtir',tipo:'formula',expr:'MAX({Mínimo} - {Existencias}; 0)'},
    {id:'p-estado',nombre:'Estado',tipo:'formula',expr:'SI({Existencias} <= 0; "Agotado"; SI({Existencias} < {Mínimo}; "Bajo"; "Bien"))',
      colores:[{op:'igual',val:'Agotado',tono:'mal'},{op:'igual',val:'Bajo',tono:'aviso'},{op:'igual',val:'Bien',tono:'bien'}]},
    {id:'p-valor',nombre:'Valor',tipo:'formula',expr:'{Costo} * MAX({Existencias}; 0)',moneda:true,pie:'suma'},
    {id:'p-gan',nombre:'Ganancia por pieza',tipo:'formula',expr:'{Precio} - {Costo}',moneda:true}],
    vistas:[vista('v-productos','Productos','tabla',{s:{col:'p-nombre',dir:1},ocultas:['p-mov']}),
      vista('v-surtir','Por surtir','tabla',{f:{col:'p-falta',op:'mayor',val:'0'},agrupar:'p-prov',s:{col:'p-nombre',dir:1},
        ocultas:['p-cat','p-precio','p-ini','p-mov','p-valor','p-gan']}),
      vista('v-cat','Por categoría','tablero',{agrupar:'p-cat'}),
      vista('v-precios','Lista de precios','tabla',{s:{col:'p-cat',dir:1},s2:{col:'p-nombre',dir:1},
        ocultas:['p-prov','p-costo','p-ini','p-mov','p-exist','p-min','p-falta','p-estado','p-valor','p-gan']})],filas:[]};
  if(rol==='movimientos')return {nombre:NOMBRES.movimientos,rol:rol,columnas:[
    {id:'m-con',nombre:'Concepto',tipo:'texto'},
    {id:'m-fecha',nombre:'Fecha',tipo:'fecha'},
    {id:'m-prod',nombre:'Producto',tipo:'relacion',base:ids.productos||''},
    {id:'m-tipo',nombre:'Tipo',tipo:'seleccion',opciones:TIPOS_MOV.slice()},
    {id:'m-cant',nombre:'Cantidad',tipo:'numero'},
    {id:'m-cambio',nombre:'Cambio',tipo:'formula',expr:'SI(O({Tipo} = "Entrada"; {Tipo} = "Ajuste"); {Cantidad}; -{Cantidad})'},
    {id:'m-pu',nombre:'Precio unitario',tipo:'moneda'},
    {id:'m-importe',nombre:'Importe',tipo:'formula',expr:'{Cantidad} * {Precio unitario}',moneda:true,pie:'suma'},
    {id:'m-nota',nombre:'Nota',tipo:'texto'},
    {id:'m-origen',nombre:'Origen',tipo:'texto'}],
    vistas:[vista('v-movs','Movimientos','tabla',{s:{col:'m-fecha',dir:-1},ocultas:['m-origen']}),
      vista('v-tipo','Por tipo','tablero',{agrupar:'m-tipo'}),
      vista('v-cal','Calendario','calendario',{fecha:'m-fecha'})],filas:[]};
  if(rol==='compras')return {nombre:NOMBRES.compras,rol:rol,columnas:[
    {id:'c-prov',nombre:'Proveedor',tipo:'texto'},
    {id:'c-fecha',nombre:'Fecha',tipo:'fecha'},
    {id:'c-folio',nombre:'Folio',tipo:'texto'},
    {id:'c-rfc',nombre:'RFC',tipo:'texto'},
    {id:'c-sub',nombre:'Subtotal',tipo:'moneda',pie:'suma'},
    {id:'c-iva',nombre:'IVA',tipo:'moneda',pie:'suma'},
    {id:'c-total',nombre:'Total',tipo:'moneda',pie:'suma',negritas:true},
    {id:'c-estado',nombre:'Estado',tipo:'seleccion',opciones:['Por pagar','Pagada']},
    {id:'c-vence',nombre:'Vence',tipo:'fecha'},
    {id:'c-dias',nombre:'Días para pagar',tipo:'formula',expr:'SI({Estado} = "Pagada"; ""; DIAS({Vence}))',
      colores:[{op:'menor',val:'0',tono:'mal'},{op:'menor',val:'4',tono:'aviso'}]},
    {id:'c-uuid',nombre:'Folio fiscal (UUID)',tipo:'texto'}],
    vistas:[vista('v-compras','Compras','tabla',{s:{col:'c-fecha',dir:-1},ocultas:['c-uuid']}),
      vista('v-porpagar','Por pagar','tabla',{f:{col:'c-estado',op:'igual',val:'Por pagar'},s:{col:'c-vence',dir:1},ocultas:['c-uuid','c-rfc']}),
      vista('v-cal','Vencimientos','calendario',{fecha:'c-vence'})],filas:[]};
  if(rol==='gastos')return {nombre:NOMBRES.gastos,rol:rol,columnas:[
    {id:'g-con',nombre:'Concepto',tipo:'texto'},
    {id:'g-fecha',nombre:'Fecha',tipo:'fecha'},
    {id:'g-cat',nombre:'Categoría',tipo:'seleccion',opciones:CATS_GASTO.slice()},
    {id:'g-monto',nombre:'Monto',tipo:'moneda',pie:'suma',negritas:true},
    {id:'g-forma',nombre:'Forma de pago',tipo:'seleccion',opciones:['Efectivo','Tarjeta','Transferencia']},
    {id:'g-nota',nombre:'Nota',tipo:'texto'}],
    vistas:[vista('v-gastos','Gastos','tabla',{s:{col:'g-fecha',dir:-1}}),
      vista('v-cat','Por categoría','tabla',{agrupar:'g-cat',s:{col:'g-fecha',dir:-1}}),
      vista('v-cal','Calendario','calendario',{fecha:'g-fecha'})],filas:[]};
  if(rol==='presupuesto')return {nombre:NOMBRES.presupuesto,rol:rol,columnas:[
    {id:'r-cat',nombre:'Categoría',tipo:'texto'},
    {id:'r-monto',nombre:'Al mes',tipo:'moneda',pie:'suma',negritas:true},
    {id:'r-nota',nombre:'Nota',tipo:'texto'}],
    vistas:[vista('v-pres','Presupuesto','tabla')],
    filas:CATS_GASTO.map(function(c){return {v:{'r-cat':c}}})};
  /* Recursos humanos: la antigüedad y los días de vacaciones (art. 76 LFT) se calculan solos */
  if(rol==='empleados')return {nombre:NOMBRES.empleados,rol:rol,columnas:[
    {id:'em-nombre',nombre:'Nombre',tipo:'texto'},
    {id:'em-puesto',nombre:'Puesto',tipo:'texto'},
    {id:'em-depto',nombre:'Departamento',tipo:'seleccion',origen:'departamentos'},
    {id:'em-tel',nombre:'Teléfono',tipo:'telefono'},
    {id:'em-ingreso',nombre:'Fecha de ingreso',tipo:'fecha'},
    {id:'em-nac',nombre:'Cumpleaños',tipo:'fecha'},
    {id:'em-salario',nombre:'Salario diario',tipo:'moneda'},
    {id:'em-periodo',nombre:'Pago',tipo:'seleccion',opciones:PERIODOS_PAGO.slice()},
    {id:'em-estado',nombre:'Estado',tipo:'seleccion',opciones:['Activo','Baja'],colores:[{op:'igual',val:'Baja',tono:'mal'}]},
    {id:'em-anios',nombre:'Antigüedad (años)',tipo:'formula',expr:'SI({Fecha de ingreso} = ""; ""; ENTERO(-DIAS({Fecha de ingreso}) / 365.25))'},
    {id:'em-vac',nombre:'Vacaciones al año',tipo:'formula',expr:'SI({Antigüedad (años)} = ""; ""; SI({Antigüedad (años)} < 1; 0; SI({Antigüedad (años)} <= 5; 10 + 2 * {Antigüedad (años)}; 22 + 2 * ENTERO(({Antigüedad (años)} - 6) / 5))))'},
    {id:'em-baja',nombre:'Fecha de baja',tipo:'fecha'},
    {id:'em-rfc',nombre:'RFC',tipo:'texto'},
    {id:'em-nss',nombre:'NSS',tipo:'texto'},
    {id:'em-nota',nombre:'Notas',tipo:'texto'}],
    vistas:[vista('v-equipo','Equipo','tabla',{f:{col:'em-estado',op:'distinto',val:'Baja'},s:{col:'em-nombre',dir:1},ocultas:['em-baja','em-rfc','em-nss']}),
      vista('v-todos','Todos','tabla',{s:{col:'em-nombre',dir:1}}),
      vista('v-tarjetas','Tarjetas','galeria'),
      vista('v-cumple','Cumpleaños','calendario',{fecha:'em-nac'})],filas:[]};
  if(rol==='incidencias')return {nombre:NOMBRES.incidencias,rol:rol,columnas:[
    {id:'in-con',nombre:'Concepto',tipo:'texto'},
    {id:'in-emp',nombre:'Persona',tipo:'relacion',base:ids.empleados||''},
    {id:'in-tipo',nombre:'Tipo',tipo:'seleccion',opciones:TIPOS_INC.slice(),
      colores:[{op:'igual',val:'Falta',tono:'mal'},{op:'igual',val:'Vacaciones',tono:'bien'},{op:'igual',val:'Incapacidad',tono:'aviso'}]},
    {id:'in-desde',nombre:'Desde',tipo:'fecha'},
    {id:'in-dias',nombre:'Días',tipo:'numero',pie:'suma'},
    {id:'in-horas',nombre:'Horas',tipo:'numero',pie:'suma'},
    {id:'in-nota',nombre:'Nota',tipo:'texto'}],
    vistas:[vista('v-inc','Incidencias','tabla',{s:{col:'in-desde',dir:-1}}),
      vista('v-tipo','Por tipo','tablero',{agrupar:'in-tipo'}),
      vista('v-cal','Calendario','calendario',{fecha:'in-desde'})],filas:[]};
  return null;
}

/* ---------- Encontrar o crear las bases ---------- */
var IDS=null,cola=Promise.resolve();
function enCola(fn){var p=cola.then(fn);cola=p.catch(function(){});return p}
/* Las bases con rol que ya hay ({productos: id, …}); si hay varias con el mismo rol, la más antigua */
function buscar(){
  return AT.datos.bases.todos().then(function(bs){
    var o={};
    bs.slice().sort(function(a,b){return String(a.creado||'')<String(b.creado||'')?-1:1}).forEach(function(b){if(b.rol&&ROLES.indexOf(b.rol)>=0&&!o[b.rol])o[b.rol]=b.id});
    IDS=o;return o;
  });
}
/* Crea lo que falte (productos y movimientos siempre van juntos) y deja las relaciones y la suma bien puestas */
function asegurar(doc,roles){
  roles=roles||['productos','movimientos'];
  if(roles.indexOf('productos')>=0||roles.indexOf('movimientos')>=0)roles=roles.concat(['productos','movimientos']);
  /* Las incidencias se relacionan con los empleados: van juntas */
  if(roles.indexOf('incidencias')>=0)roles=roles.concat(['empleados']);
  return enCola(function(){
    return buscar().then(function(ids){
      var p=Promise.resolve();
      /* En el orden de ROLES: productos antes que movimientos y empleados antes que incidencias (la relación necesita su id) */
      ROLES.forEach(function(rol){
        if(roles.indexOf(rol)<0||ids[rol])return;
        p=p.then(function(){return B.crear(semilla(rol,ids),doc)}).then(function(b){ids[rol]=b.id});
      });
      return p.then(function(){
        if(!ids.productos)return;
        /* La suma de los productos apunta a los movimientos (si se crearon después) */
        return B.cargar(ids.productos).then(function(pb){
          var c=pb&&B.col(pb,'p-mov');
          if(c&&ids.movimientos&&c.base!==ids.movimientos){c.base=ids.movimientos;return B.guardarBase(pb)}
        });
      }).then(function(){
        /* Etapa Empresas: los empleados de antes reciben la columna Departamento (si no tienen ya una con ese nombre) */
        if(!ids.empleados||roles.indexOf('empleados')<0)return;
        return B.cargar(ids.empleados).then(function(eb){
          if(!eb||B.col(eb,'em-depto')||eb.columnas.some(function(k){return B.sinAcentos(k.nombre)==='departamento'}))return;
          var i=eb.columnas.map(function(k){return k.id}).indexOf('em-puesto');
          eb.columnas.splice(i>=0?i+1:1,0,{id:'em-depto',nombre:'Departamento',tipo:'seleccion',origen:'departamentos'});
          return B.guardarBase(eb);
        });
      }).then(function(){IDS=ids;return ids});
    });
  });
}
/* La base de un rol para mostrarla en una página (la crea si no hay) */
function base(rol,doc){
  return asegurar(doc,[rol]).then(function(ids){return ids[rol]?B.cargar(ids[rol]):null}).then(function(b){listaLista();pintarResumenes();return b});
}
/* Lee lo que haya (sin crear nada) */
function cargar(){
  return buscar().then(function(ids){
    var l=ROLES.filter(function(r){return ids[r]}).map(function(r){return B.cargar(ids[r]).catch(function(){return null})});
    return Promise.all(l);
  }).then(function(){listaLista();pintarResumenes();if(IDS&&IDS.movimientos)conciliar();return IDS});
}

/* ---------- Productos en memoria ---------- */
function pb(){return IDS&&IDS.productos?B.base(IDS.productos):null}
function mb(){return IDS&&IDS.movimientos?B.base(IDS.movimientos):null}
function v(b,f,id){var c=B.col(b,id);return c?B.valor(b,f,c):''}
function num(x){return typeof x==='number'&&isFinite(x)?x:0}
function productos(){
  var b=pb();if(!b)return [];
  return B.filas(b.id).map(function(f){
    return {id:f.id,nombre:B.titulo(b,f),codigo:String(v(b,f,'p-codigo')||''),categoria:String(v(b,f,'p-cat')||''),proveedor:String(v(b,f,'p-prov')||'').trim(),
      costo:num(v(b,f,'p-costo')),precio:num(v(b,f,'p-precio')),existencias:num(v(b,f,'p-exist')),minimo:num(v(b,f,'p-min')),
      falta:num(v(b,f,'p-falta')),estado:String(v(b,f,'p-estado')||''),valor:num(v(b,f,'p-valor'))};
  }).filter(function(p){return p.nombre});
}
function producto(id){return productos().filter(function(p){return p.id===id})[0]||null}
/* El producto que corresponde a lo que se escribió: por nombre o por código, sin importar mayúsculas ni acentos */
function porTexto(t){
  var q=B.sinAcentos(String(t||'').trim());if(!q)return null;
  return productos().filter(function(p){return B.sinAcentos(p.nombre)===q||(p.codigo&&B.sinAcentos(p.codigo)===q)})[0]||null;
}
/* Una sola lista de sugerencias para los conceptos de las notas de venta */
function listaLista(){
  if(!document.body)return;
  var dl=document.getElementById('invProductos');
  if(!dl){dl=document.createElement('datalist');dl.id='invProductos';document.body.appendChild(dl)}
  dl.innerHTML=productos().sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es')}).map(function(p){
    return '<option value="'+esc(p.nombre)+'" label="'+esc((p.codigo?p.codigo+' · ':'')+B.dinero(p.precio)+' · quedan '+B.numero(p.existencias))+'"></option>';
  }).join('');
}

/* ---------- Ventas → movimientos ---------- */
function cantDe(t){t=String(t==null?'':t).trim();if(!t)return 1;var n=parseFloat(t.replace(/[,\s]/g,''));return isFinite(n)&&n>0?n:0}
function precioDe(t){var n=parseFloat(String(t==null?'':t).replace(/[$,\s]/g,''));return isFinite(n)&&n>0?Math.round(n*100)/100:''}
function ventasDe(doc){
  var out=[];
  (doc&&doc.contenido&&doc.contenido.content||[]).forEach(function(b){
    if(!b||b.type!=='venta'||!b.attrs)return;
    var a=b.attrs,folio=String(a.folio||'').trim();
    (a.conceptos||[]).forEach(function(c,i){
      if(!c||!c.prod)return;
      var n=cantDe(c.cant);if(!(n>0))return;
      var w={'m-con':'Venta'+(folio?' '+folio:''),'m-fecha':a.fecha||hoy(),'m-prod':c.prod,'m-tipo':'Venta','m-cant':n,'m-origen':'venta:'+doc.id+':'+(a.id||'')+':'+i};
      var pu=precioDe(c.precio);if(pu!=='')w['m-pu']=pu;
      out.push(w);
    });
  });
  return out;
}
/* Deja los movimientos de esa página igual que sus notas de venta (lista vacía: los quita) */
function sincronizar(docId,deseados){
  var m=mb();if(!m)return Promise.resolve();
  var pref='venta:'+docId+':',ya={};
  B.filas(m.id).forEach(function(f){var o=String(f.v['m-origen']||'');if(o.indexOf(pref)===0)ya[o]=f});
  var guardar=[],borrar=[];
  deseados.forEach(function(w){
    var f=ya[w['m-origen']];delete ya[w['m-origen']];
    if(f){
      var igual=Object.keys(w).every(function(k){return f.v[k]===w[k]})&&!(f.v['m-pu']!==undefined&&w['m-pu']===undefined);
      if(!igual){var n=B.clonar(f);Object.keys(w).forEach(function(k){n.v[k]=w[k]});if(w['m-pu']===undefined)delete n.v['m-pu'];guardar.push(n)}
    }else guardar.push(B.nuevaFila(m.id,w));
  });
  Object.keys(ya).forEach(function(k){borrar.push(ya[k])});
  /* Las filas nuevas llevan orden consecutivo */
  var orden=B.filas(m.id).reduce(function(x,f){return Math.max(x,f.orden||0)},0);
  guardar.forEach(function(f){if(!B.fila(m.id,f.id))f.orden=++orden});
  return B.guardarFilas(guardar).then(function(){return Promise.all(borrar.map(function(f){return B.borrarFila(f)}))});
}
function sincronizarDoc(doc){
  return enCola(function(){
    return (IDS?Promise.resolve(IDS):buscar()).then(function(ids){
      if(!ids.movimientos)return;
      return B.cargar(ids.movimientos).then(function(){return sincronizar(doc.id,ventasDe(doc))});
    });
  });
}
function quitarDoc(id){
  return enCola(function(){
    return (IDS?Promise.resolve(IDS):buscar()).then(function(ids){
      if(!ids.movimientos)return;
      return B.cargar(ids.movimientos).then(function(){return sincronizar(id,[])});
    });
  });
}
/* Concilia todo: las notas de venta de todas tus páginas contra los movimientos de venta (al abrir una página con
   inventario; arregla lo que quedó a medias si se cerró la página justo al guardar) */
function conciliar(){
  return enCola(function(){
    return (IDS?Promise.resolve(IDS):buscar()).then(function(ids){
      if(!ids.movimientos)return;
      return Promise.all([AT.datos.documentos.todos(),B.cargar(ids.movimientos)]).then(function(r){
        var docs={};r[0].forEach(function(d){docs[d.id]=d});
        var con=Object.keys(docs).filter(function(id){return ventasDe(docs[id]).length});
        B.filas(ids.movimientos).forEach(function(f){var m=/^venta:([^:]+):/.exec(String(f.v['m-origen']||''));if(m&&con.indexOf(m[1])<0)con.push(m[1])});
        return con.reduce(function(p,id){return p.then(function(){return sincronizar(id,docs[id]?ventasDe(docs[id]):[])})},Promise.resolve());
      });
    });
  });
}
/* Al guardar una página (en esta pestaña) se revisan sus notas de venta; al irse a la papelera, se quitan */
AT.datos.on(function(c,deOtra){
  if(deOtra)return;
  if(c.almacen==='bases'||c.almacen==='*'){IDS=null;return}
  if(c.almacen!=='documentos'||!c.id)return;
  if(c.borrado){quitarDoc(c.id);return}
  AT.datos.documentos.leer(c.id).then(function(d){if(d)return sincronizarDoc(d)}).catch(function(){});
});

/* ---------- Pedido al proveedor ---------- */
function nid(){return AT.bloques.nuevoId()}
function P(t){return t?{type:'paragraph',attrs:{id:nid()},content:[{type:'text',text:t}]}:{type:'paragraph',attrs:{id:nid()}}}
function celda(t,cab){return {type:cab?'tableHeader':'tableCell',content:[t===''||t==null?{type:'paragraph'}:{type:'paragraph',content:[{type:'text',text:String(t)}]}]}}
function pedidoDoc(prov){
  var l=productos().filter(function(p){return p.falta>0&&p.proveedor===prov}).sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es')});
  var total=l.reduce(function(s,p){return s+p.falta*p.costo},0);
  var filas=[{type:'tableRow',content:['Producto','Código','Pedir','Costo','Importe'].map(function(t){return celda(t,true)})}].concat(l.map(function(p){
    return {type:'tableRow',content:[celda(p.nombre),celda(p.codigo),celda(B.numero(p.falta)),celda(p.costo?B.dinero(p.costo):''),celda(p.costo?B.dinero(p.falta*p.costo):'')]};
  }));
  var neg=AT.perfil&&AT.perfil.actual&&AT.perfil.actual(),nombreNeg=neg&&neg.negocio&&neg.negocio.nombre||'';
  return {titulo:'Pedido a '+(prov||'proveedor')+' · '+B.fechaTexto(hoy()),
    contenido:[P('Pedido'+(nombreNeg?' de '+nombreNeg:'')+(prov?' a '+prov:'')+' del '+B.fechaTexto(hoy())+'. Lo que está bajo el mínimo, para llegar al mínimo.'),
      {type:'table',attrs:{id:nid()},content:filas},
      P('Total estimado: '+B.dinero(total)+'.'),P()]};
}
function hacerPedido(prov){
  if(!AT.crear)return Promise.resolve();
  var d=pedidoDoc(prov);
  return AT.crear.nuevo('notas',{titulo:d.titulo,contenido:d.contenido,props:[]});
}

/* ---------- Registrar una entrada de mercancía ---------- */
function registrarEntrada(op){
  op=op||{};
  var lp=productos().sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es')});
  if(!lp.length){AT.aviso('Primero agrega tus productos en la tabla «Productos» (o importa la factura XML de tu proveedor).');return}
  var d=document.createElement('dialog');
  d.className='atajos bd-dlg inv-dlg';d.setAttribute('aria-labelledby','invEntT');
  d.innerHTML='<div class="at-h"><h2 id="invEntT">Registrar entrada</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+AT.ico('close')+'</button></div>'+
    '<form method="dialog" class="inv-f">'+
    '<label class="campo-l"><span>Producto</span><select name="prod">'+lp.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===op.producto?' selected':'')+'>'+esc(p.nombre)+' (quedan '+esc(B.numero(p.existencias))+')</option>'}).join('')+'</select></label>'+
    '<div class="inv-2"><label class="campo-l"><span>Cantidad que llegó</span><input name="cant" type="text" inputmode="decimal" required autocomplete="off"></label>'+
    '<label class="campo-l"><span>Costo por pieza</span><input name="costo" type="text" inputmode="decimal" autocomplete="off"></label></div>'+
    '<div class="inv-2"><label class="campo-l"><span>Fecha</span><input name="fecha" type="date" value="'+hoy()+'"></label>'+
    '<label class="campo-l"><span>Nota (opcional)</span><input name="nota" type="text" autocomplete="off" placeholder="Ej. factura A-123"></label></div>'+
    '<p class="bd-msg" data-msg aria-live="polite"></p>'+
    '<div class="td-bt"><button class="btn pri" type="submit">Registrar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>';
  document.body.appendChild(d);
  var f=$('form',d),sel=f.elements.prod;
  function costo(){var p=producto(sel.value);f.elements.costo.value=p&&p.costo?String(p.costo):''}
  sel.addEventListener('change',costo);costo();
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){d.remove()});
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var n=parseFloat(String(f.elements.cant.value).replace(/[,\s]/g,''));
    if(!(n>0)){$('[data-msg]',d).textContent='Escribe cuántas piezas llegaron.';f.elements.cant.focus();return}
    var c=precioDe(f.elements.costo.value),p=producto(sel.value);
    asegurar(AT.docActual&&AT.docActual.id).then(function(ids){
      var m=B.base(ids.movimientos);
      var w={'m-con':'Entrada','m-fecha':f.elements.fecha.value||hoy(),'m-prod':sel.value,'m-tipo':'Entrada','m-cant':n};
      if(c!=='')w['m-pu']=c;
      if(f.elements.nota.value.trim())w['m-nota']=f.elements.nota.value.trim();
      var fila=B.nuevaFila(m.id,w);
      return B.guardarFila(fila).then(function(){
        /* El costo nuevo queda en el producto */
        var b=pb(),pf=b&&B.fila(b.id,sel.value);
        if(pf&&c!==''&&pf.v['p-costo']!==c){var x=B.clonar(pf);x.v['p-costo']=c;return B.guardarFila(x)}
      });
    }).then(function(){d.close();AT.aviso('Entrada registrada: '+B.numero(n)+' de '+(p?p.nombre:'producto')+'.')},
      function(){$('[data-msg]',d).textContent='No se pudo guardar. Inténtalo otra vez.'});
  });
  d.showModal();f.elements.cant.focus();
}

/* ---------- Resumen del inventario ---------- */
function resumenHTML(sinBotones){
  if(!IDS||!IDS.productos)return '<p class="hint">Aquí verás el valor de tu inventario y lo que hay que surtir. Agrega tus productos en la tabla «Productos» de la página Inventario.</p>'+
    (!sinBotones&&AT.factura?'<div class="inv-acc"><button type="button" class="btn" data-acc="factura">Importar factura XML</button></div>':'');
  var l=productos();
  var valor=l.reduce(function(s,p){return s+p.valor},0),bajos=l.filter(function(p){return p.estado==='Bajo'}),agot=l.filter(function(p){return p.estado==='Agotado'});
  var k='<dl class="nb-k inv-k">'+[['Productos',B.numero(l.length),''],['Valor del inventario',B.dinero(valor),''],
    ['Bajo el mínimo',B.numero(bajos.length),bajos.length?'nb-ojo':''],['Agotados',B.numero(agot.length),agot.length?'nb-mal':'']]
    .map(function(i){return '<div'+(i[2]?' class="'+i[2]+'"':'')+'><dt>'+esc(i[0])+'</dt><dd>'+i[1]+'</dd></div>'}).join('')+'</dl>';
  var surtir=l.filter(function(p){return p.falta>0}),grupos={},orden=[];
  surtir.forEach(function(p){var g=p.proveedor;if(!grupos[g]){grupos[g]=[];orden.push(g)}grupos[g].push(p)});
  orden.sort(function(a,b){return a===''?1:b===''?-1:a.localeCompare(b,'es')});
  var h=k;
  if(!l.length)h+='<p class="hint">Todavía no hay productos. Agrégalos en la tabla «Productos».</p>';
  else if(!surtir.length)h+='<p class="inv-ok">Nada que surtir: todo está arriba del mínimo.</p>';
  else h+='<h3 class="inv-h">Por surtir</h3>'+orden.map(function(g){
    var ps=grupos[g].sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es')});
    return '<div class="inv-g"><div class="inv-gh"><b>'+esc(g||'Sin proveedor')+'</b>'+
      (sinBotones?'':'<button type="button" class="btn" data-acc="pedido" data-prov="'+esc(g)+'">Hacer pedido'+(g?' a '+esc(g):'')+'</button>')+'</div>'+
      '<div class="nb-scroll"><table class="nb-tab"><thead><tr><th scope="col">Producto</th><th scope="col" class="num">Quedan</th><th scope="col" class="num">Mínimo</th><th scope="col" class="num">Pedir</th></tr></thead><tbody>'+
      ps.map(function(p){return '<tr><td>'+esc(p.nombre)+(p.estado==='Agotado'?' <span class="inv-et inv-mal">Agotado</span>':'')+'</td><td class="num'+(p.existencias<0?' neg':'')+'">'+B.numero(p.existencias)+'</td><td class="num">'+B.numero(p.minimo)+'</td><td class="num"><b>'+B.numero(p.falta)+'</b></td></tr>'}).join('')+
      '</tbody></table></div></div>';
  }).join('');
  if(!sinBotones)h+='<div class="inv-acc"><button type="button" class="btn" data-acc="entrada">Registrar entrada</button>'+
    (AT.factura?'<button type="button" class="btn" data-acc="factura">Importar factura XML</button>':'')+'</div>';
  return h;
}
var repintar=null;
function pintarResumenes(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-inv-resumen]'),function(e){
    var sb=e.hasAttribute('data-sin-botones');
    if(e.contains(document.activeElement)&&document.activeElement!==document.body){var a=document.activeElement.getAttribute('data-acc'),pr=document.activeElement.getAttribute('data-prov');e.innerHTML=resumenHTML(sb);var x=a&&e.querySelector('[data-acc="'+a+'"]'+(pr!=null?'[data-prov="'+CSS.escape(pr)+'"]':''));if(x)x.focus()}
    else e.innerHTML=resumenHTML(sb);
  });
}
B.on(function(c){
  if(!IDS)return;
  if(c.base&&c.base!==IDS.productos&&c.base!==IDS.movimientos)return;
  clearTimeout(repintar);repintar=setTimeout(function(){listaLista();pintarResumenes()},120);
});

if(AT.negocio){
  var N=AT.negocio;
  N.bloque('inventario',{
    etiqueta:'Resumen del inventario',def:{titulo:''},
    editar:function(){return '<div class="nb-res"></div>'},
    resultado:function(){return '<div data-inv-resumen>'+resumenHTML()+'</div>'},
    /* Al leer tu documento los botones funcionan; al imprimir no salen */
    leer:function(x,uid,op){var sb=!(op&&op.editable);return '<h3 class="nb-tit">Resumen del inventario</h3><div data-inv-resumen'+(sb?' data-sin-botones':'')+'>'+resumenHTML(sb)+'</div>'},
    acciones:{
      pedido:function(x,datos){hacerPedido(datos.prov||'');return false},
      entrada:function(){registrarEntrada();return false},
      factura:function(){if(AT.factura)AT.factura.abrir();return false}
    },
    texto:function(){var l=productos();return 'Resumen del inventario: '+l.length+' productos, valor '+B.dinero(l.reduce(function(s,p){return s+p.valor},0))+', '+l.filter(function(p){return p.falta>0}).length+' por surtir.'},
    md:function(){
      var l=productos();
      return '**Resumen del inventario**\n\n'+l.length+' productos · valor '+B.dinero(l.reduce(function(s,p){return s+p.valor},0))+'\n\n'+
        l.filter(function(p){return p.falta>0}).map(function(p){return '- '+p.nombre+': quedan '+B.numero(p.existencias)+', pedir '+B.numero(p.falta)+(p.proveedor?' ('+p.proveedor+')':'')}).join('\n');
    },
    insertar:{t:'Resumen del inventario',d:'Valor, lo que hay que surtir y pedido al proveedor',i:'datos',
      p:'inventario existencias surtir pedido proveedor valor almacen mercancia entrada'}
  });
}

/* Al imprimir, el resumen necesita el inventario ya leído */
B.precargas.push(function(doc){
  var hay=JSON.stringify(doc&&doc.contenido||{}).indexOf('"type":"inventario"')>=0;
  return hay?cargar():null;
});
/* Lee el inventario al abrir la página (si hay) */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cargar);else cargar();

AT.inventario={ROLES:ROLES,semilla:semilla,buscar:buscar,asegurar:asegurar,base:base,cargar:cargar,ids:function(){return IDS},
  productos:productos,producto:producto,porTexto:porTexto,ventasDe:ventasDe,sincronizarDoc:sincronizarDoc,quitarDoc:quitarDoc,conciliar:conciliar,
  pedidoDoc:pedidoDoc,hacerPedido:hacerPedido,registrarEntrada:registrarEntrada,resumenHTML:resumenHTML};
})();
