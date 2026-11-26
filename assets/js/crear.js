/* OneBook: «Crear» y las plantillas.
   Cada tipo de documento es una plantilla: empieza con su estructura y sus bloques. Es de un módulo (perfil.js) y
   solo se ofrece si ese módulo está encendido; además tiene una categoría para la galería:
     negocio   pendientes del día, cortes de caja, fiado, gastos (con «Generar mes»), nota de venta (con folio),
               precios de venta, lista para surtir, inventario, reportes, presupuesto, proveedores (con cuentas por
               pagar), clientes, lista de precios, plan de negocio y préstamo o crédito (plan de pagos)
     rh        tu equipo y las calculadoras de nómina
     (las notas y el documento en blanco, del núcleo, van en la primera categoría)
   Los bloques de la tienda vienen de negocio.js y sus archivos, que en inicio.html no se cargan: las plantillas solo
   guardan sus datos iniciales. Los que no tienen «listo» se anuncian en «Llegan después».
   La ventana «¿Qué quieres crear?» es una galería (fase F5): categorías que se filtran, búsqueda, lo que trae cada
   plantilla, paquetes por giro (crean varias páginas de una vez) y «Mis plantillas» (las que guardas desde un
   documento con «Guardar como plantilla», en AT.datos.plantillas; al guardarla se puede quitar lo anotado y al
   usarla cada bloque se prepara: fecha de hoy, folio nuevo, el mes actual).
   Se abre desde «Crear» en la barra lateral y en el inicio. Expone AT.tiposDoc y AT.crear (abrir, cerrar, nuevo,
   armar, plantillasInicio, sugeridas, paquetes, crearPaquete, guardarPlantilla, desdePlantilla, nuevoDesde). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,RAIZ=AT.rutas.raiz;

var TIPOS=AT.tiposDoc={
  notas:{nombre:'Notas',icono:'notas',desc:'Una página en blanco para escribir rápido.',listo:true,modulo:'nucleo',cat:'general'},
  presentacion:{nombre:'Presentación',icono:'presentacion',desc:'Diapositivas hechas con los mismos bloques.',modulo:'nucleo',cat:'general'},
  blanco:{nombre:'Documento en blanco',icono:'blanco',desc:'Solo las herramientas básicas.',modulo:'nucleo',cat:'general'},
  /* Negocio y dinero: plantillas hechas con los bloques de negocio («trae»: lo que se ve en la galería) */
  pendientes:{nombre:'Pendientes del día',icono:'tareas',desc:'Lo que hay que hacer al abrir, durante el día y al cerrar.',listo:true,modulo:'negocio',cat:'negocio',trae:['Listas de tareas']},
  corte:{nombre:'Corte de caja',icono:'caja',desc:'Fondo, ventas, retiros y efectivo contado: ¿la caja cuadra?',listo:true,modulo:'negocio',cat:'negocio',trae:['Corte de caja']},
  fiado:{nombre:'Fiado',icono:'fiado',desc:'Quién te debe, lo que se lleva, sus abonos y su saldo.',listo:true,modulo:'negocio',cat:'negocio',trae:['Fiado']},
  gastos:{nombre:'Gastos del mes',icono:'gastos',desc:'Lo que sale, por categoría; los gastos fijos se generan cada mes.',listo:true,modulo:'negocio',cat:'negocio',trae:['Gastos del mes']},
  venta:{nombre:'Nota de venta',icono:'venta',desc:'Recibo con folio, conceptos, IVA, total y cambio, para imprimir.',listo:true,modulo:'negocio',cat:'negocio',trae:['Nota de venta']},
  precio:{nombre:'Precios de venta',icono:'precio',desc:'A cuánto vender con tu ganancia, el IVA y la comisión de la tarjeta.',listo:true,modulo:'negocio',cat:'negocio',trae:['Precio de venta']},
  surtir:{nombre:'Lista para surtir',icono:'lista',desc:'Lo que se acaba, cuánto queda y a quién pedirlo.',listo:true,modulo:'negocio',cat:'negocio',trae:['Tabla']},
  proveedores:{nombre:'Proveedores',icono:'porpagar',desc:'Quién te surte, su día de visita y lo que le debes.',listo:true,modulo:'negocio',cat:'negocio',trae:['Tabla','Cuentas por pagar']},
  presupuesto:{nombre:'Presupuesto del mes',icono:'gastos',desc:'Cuánto quieres gastar por categoría y cuánto llevas: lo disponible en rojo si te pasas.',listo:true,modulo:'negocio',cat:'negocio',trae:['Reporte','Gastos','Presupuesto']},
  reporte:{nombre:'Reporte del mes',icono:'grafica',desc:'Ventas por producto y compras por proveedor del mes, contra el mes pasado, con gráficas. Crea uno cada mes.',listo:true,modulo:'negocio',cat:'negocio',trae:['Reportes']},
  inventario:{nombre:'Inventario',icono:'datos',desc:'Productos, entradas y salidas; las existencias se calculan solas, las ventas las descuentan y armas el pedido al proveedor.',listo:true,modulo:'negocio',cat:'negocio',trae:['Resumen del inventario','Productos','Entradas y salidas','Compras']},
  cajachica:{nombre:'Caja chica',icono:'caja',desc:'El efectivo que entra y los pagos que salen, con su saldo después de cada movimiento. Una por mes: empieza con el saldo del mes anterior.',listo:true,modulo:'negocio',cat:'negocio',trae:['Base de datos con saldo']},
  cedis:{nombre:'Cedis: pedidos de sucursales',icono:'empresa',desc:'Tus sucursales te mandan su pedido con un enlace; ves el total por insumo, confirmas lo que surtes e imprimes las hojas de surtido.',listo:true,modulo:'negocio',cat:'negocio',trae:['Pedidos de sucursales','Insumos','Sucursales','Pedidos recibidos']},
  /* La página del pedido de una sucursal: la crea la invitación de su Cedis (recibir.js); no sale en la galería */
  pedidocedis:{nombre:'Pedido al Cedis',icono:'lista',desc:'El pedido de esta sucursal a su Cedis.',listo:true,modulo:'negocio',cat:'negocio',oculta:true},
  clientes:{nombre:'Clientes',icono:'users',desc:'Nombre, teléfono, qué compran y lo que hay que recordar; en tabla o en tarjetas.',listo:true,modulo:'negocio',cat:'negocio',trae:['Base de datos']},
  lista:{nombre:'Lista de precios',icono:'tabla',desc:'Tus productos y servicios con su precio, para imprimir o compartir.',listo:true,modulo:'negocio',cat:'negocio',trae:['Tabla']},
  plan:{nombre:'Plan de negocio',icono:'idea',desc:'En una página: qué vendes, a quién, a cuánto, cuánto ganas y tus metas.',listo:true,modulo:'negocio',cat:'negocio',trae:['Precio de venta','Lista de tareas']},
  cotizacion:{nombre:'Cotización',icono:'notas',desc:'Conceptos, precios e IVA para enviar; después, nota de venta.',modulo:'negocio',cat:'negocio'},
  prestamo:{nombre:'Préstamo o crédito',icono:'pagos',desc:'Un crédito del negocio en pagos: cuánto es cada uno y cuánto falta.',listo:true,modulo:'negocio',cat:'negocio',trae:['Plan de pagos']},
  /* Recursos humanos (módulo rh): tu equipo y las calculadoras de nómina (rh.js y equipo.js) */
  equipo:{nombre:'Mi equipo',icono:'users',desc:'Tus empleados, sus faltas y vacaciones; quién falta hoy, cumpleaños y lo que te cuestan al mes.',listo:true,modulo:'rh',cat:'rh',trae:['Resumen de tu equipo','Empleados','Incidencias']},
  nominas:{nombre:'Nómina del periodo',icono:'recibo',desc:'La nómina de todo tu equipo (con faltas y horas extra) y un recibo por persona.',listo:true,modulo:'rh',cat:'rh',trae:['Nómina de tu equipo','Recibo de nómina']},
  vacaciones:{nombre:'Vacaciones',icono:'sol',desc:'Cuántos días le tocan a cada quien por ley, cuántos ha tomado y su prima vacacional.',listo:true,modulo:'rh',cat:'rh',trae:['Nómina de tu equipo','Vacaciones']},
  aguinaldos:{nombre:'Aguinaldo',icono:'regalo',desc:'El aguinaldo de cada persona y de todo tu equipo, con ISR y la fecha límite.',listo:true,modulo:'rh',cat:'rh',trae:['Nómina de tu equipo','Aguinaldo']},
  finiquito:{nombre:'Finiquito o liquidación',icono:'salida',desc:'Lo que le corresponde a quien se va, por renuncia o despido, con ISR estimado.',listo:true,modulo:'rh',cat:'rh',trae:['Finiquito o liquidación']},
  ptu:{nombre:'Reparto de utilidades (PTU)',icono:'reparto',desc:'El 10 % de la utilidad entre tu equipo: por días y por salario, con sus topes.',listo:true,modulo:'rh',cat:'rh',trae:['Reparto de utilidades']},
  calculadoras:{nombre:'Calculadoras de nómina',icono:'recibo',desc:'Recibo de nómina, vacaciones, aguinaldo y finiquito en una página, para hacer cuentas rápidas.',listo:true,modulo:'rh',cat:'rh',trae:['Recibo de nómina','Vacaciones','Aguinaldo','Finiquito']}
};
var ORDEN=['notas','pendientes','corte','fiado','gastos','venta','precio','surtir','inventario','reporte','presupuesto','proveedores','cajachica','cedis','clientes','lista','plan','prestamo',
  'equipo','nominas','vacaciones','aguinaldos','finiquito','ptu','calculadoras','cotizacion','presentacion','blanco'];
var CATS={negocio:'Para tu negocio',rh:'Recursos humanos',paquetes:'Paquetes por giro',mis:'Mis plantillas'};
var CAT_MOD={negocio:'negocio',rh:'rh',paquetes:'negocio',mis:'nucleo'};
var PER=AT.perfil;
function tiene(m){return !PER||PER.tiene(m)}
function hoyISO(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
/* El día en que empieza la quincena de hoy (1 o 16) y el de un periodo de pago */
function inicioQuincena(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()<=15?1:16)}
function inicioPeriodo(tipo){
  var d=new Date();
  if(tipo==='Mensual')return new Date(d.getFullYear(),d.getMonth(),1);
  if(tipo==='Semanal'||tipo==='Catorcenal')return new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7));
  return inicioQuincena();
}
function isoDe(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function sinAcentos(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function clonar(o){return JSON.parse(JSON.stringify(o))}

/* ---------- Plantillas ---------- */
function id(){return AT.bloques?AT.bloques.nuevoId():'b-'+Math.random().toString(36).slice(2,8)}
function P(t){return t?{type:'paragraph',attrs:{id:id()},content:[{type:'text',text:t}]}:{type:'paragraph',attrs:{id:id()}}}
function H(t,nivel){var h={type:'heading',attrs:{id:id(),level:nivel||2}};if(t)h.content=[{type:'text',text:t}];return h}
function hoy(){return new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}
function tareas(lista){return {type:'taskList',attrs:{id:id()},content:lista.map(function(t){return {type:'taskItem',attrs:{checked:false},content:[t?{type:'paragraph',content:[{type:'text',text:t}]}:{type:'paragraph'}]}})}}
function celda(t,cab){return {type:cab?'tableHeader':'tableCell',content:[t?{type:'paragraph',content:[{type:'text',text:t}]}:{type:'paragraph'}]}}
/* Una tabla con su fila de títulos y filas vacías para llenar */
function tabla(titulos,filas){
  var rs=[{type:'tableRow',content:titulos.map(function(t){return celda(t,true)})}];
  for(var i=0;i<(filas||3);i++)rs.push({type:'tableRow',content:titulos.map(function(){return celda('')})});
  return {type:'table',attrs:{id:id()},content:rs};
}
/* Bases de datos de las plantillas (fase F6): el bloque lleva su semilla y la base se crea al abrir la página */
function vista(id,nombre,tipo,extra){return Object.assign({id:id,nombre:nombre,tipo:tipo,q:'',f:{col:'',op:'contiene',val:''},s:{col:'',dir:1},s2:{col:'',dir:1},ocultas:[]},extra||{})}
function baseDatos(semilla){return {type:'basedatos',attrs:{id:id(),base:'',vista:'',semilla:semilla}}}
var SEMILLAS={
  /* El inventario (fase F7) usa las bases con rol del espacio: la página las busca o las crea (inventario.js) */
  productos:function(vista){return {rol:'productos',nombre:'Productos',vista:vista||''}},
  movimientos:function(){return {rol:'movimientos',nombre:'Entradas y salidas'}},
  compras:function(){return {rol:'compras',nombre:'Compras'}},
  gastos:function(){return {rol:'gastos',nombre:'Gastos'}},
  presupuesto:function(){return {rol:'presupuesto',nombre:'Presupuesto'}},
  /* Caja chica: un movimiento por fila; el saldo se calcula en el orden del número de movimiento */
  cajachica:function(mes){return {nombre:'Caja chica de '+mes,arrastre:'caja-chica',columnas:[
    {id:'k-concepto',nombre:'Concepto',tipo:'texto'},
    {id:'k-num',nombre:'Número de movimiento',tipo:'consecutivo'},
    {id:'k-fecha',nombre:'Fecha',tipo:'fecha'},
    {id:'k-suc',nombre:'Sucursal',tipo:'seleccion',opciones:['HM Montejo']},
    {id:'k-prov',nombre:'Proveedor',tipo:'texto'},
    {id:'k-tipo',nombre:'Ingreso/Egreso',tipo:'seleccion',opciones:['Ingreso','Egreso'],colores:[{op:'igual',val:'Ingreso',tono:'bien'},{op:'igual',val:'Egreso',tono:'mal'}]},
    {id:'k-monto',nombre:'Monto',tipo:'moneda',pie:'suma'},
    {id:'k-saldo',nombre:'Saldo',tipo:'saldo',inicial:0,monto:'k-monto',signo:'k-tipo',resta:'Egreso',por:'k-num'}],
    vistas:[vista('v-tabla','Movimientos','tabla',{s:{col:'k-num',dir:1},s2:{col:'',dir:1}}),vista('v-suc','Por sucursal','tabla',{s:{col:'k-num',dir:1},s2:{col:'',dir:1},agrupar:'k-suc'})],filas:[]}},
  /* El Cedis (fase F8): sus bases con rol las crea cedis.js (las mismas en todas sus páginas) */
  insumos:function(){return {rol:'insumos',nombre:'Insumos'}},
  sucursales:function(){return {rol:'sucursales',nombre:'Sucursales'}},
  pedidosCedis:function(){return {rol:'pedidos',nombre:'Pedidos recibidos'}},
  clientes:function(){return {nombre:'Clientes',columnas:[
    {id:'c-nombre',nombre:'Nombre',tipo:'texto'},
    {id:'c-tel',nombre:'Teléfono',tipo:'telefono'},
    {id:'c-compra',nombre:'Qué compra',tipo:'texto'},
    {id:'c-cumple',nombre:'Cumpleaños',tipo:'fecha'},
    {id:'c-notas',nombre:'Notas',tipo:'texto'}],
    vistas:[vista('v-tabla','Tabla','tabla',{s:{col:'c-nombre',dir:1},s2:{col:'',dir:1}}),vista('v-tarjetas','Tarjetas','galeria')],filas:[]}}
};
var PLANTILLAS={
  notas:function(){return {titulo:'Notas sin título',props:[],contenido:[P()]}},
  pendientes:function(){return {titulo:'Pendientes del día',props:[],contenido:[
    P('Marca cada pendiente al terminarlo. Agrega los tuyos con «/» y «Lista de tareas».'),
    H('Al abrir'),tareas(['Contar el fondo de caja','Revisar qué hace falta','']),
    H('Durante el día'),tareas(['']),
    H('Al cerrar'),tareas(['Hacer el corte del día','Anotar lo que hay que pedir mañana'])
  ]}},
  prestamo:function(){return {titulo:'Préstamo o crédito',props:[],contenido:[
    {type:'pagos',attrs:{id:id(),titulo:'',modo:'plazos',monto:'',pagos:'12',cuota:'',frecuencia:'mensual',inicio:hoyISO(),pagados:{}}},P()
  ]}},
  gastos:function(){return {titulo:'Gastos',props:[],contenido:[
    P('Anota lo que sale. Los gastos fijos (renta, luz, internet) se anotan una vez y «Generar mes» los agrega cada mes.'),
    {type:'gastos',attrs:{id:id(),titulo:'',mes:hoyISO().slice(0,7),filas:[],fijos:[]}},P()
  ]}},
  corte:function(){return {titulo:'Cortes de caja',props:[],contenido:[
    P('Un corte por día. Para el de mañana, escribe / y elige «Corte de caja».'),
    {type:'corte',attrs:{id:id(),fecha:hoyISO()}},P()
  ]}},
  fiado:function(){return {titulo:'Fiado',props:[],contenido:[
    {type:'fiado',attrs:{id:id(),titulo:'',clientes:[]}},P()
  ]}},
  venta:function(){
    var f=AT.folio('V');
    return {titulo:'Nota de venta '+f,props:[],contenido:[
      {type:'venta',attrs:{id:id(),folio:f,fecha:hoyISO(),conceptos:[{cant:'1',desc:'',precio:''}]}},P()
    ]};
  },
  precio:function(){return {titulo:'Precios de venta',props:[],contenido:[
    P('Una calculadora por producto. Para otro, escribe / y elige «Precio de venta».'),
    {type:'precio',attrs:{id:id()}},P()
  ]}},
  surtir:function(){return {titulo:'Lista para surtir',props:[],contenido:[
    P('Lo que se está acabando. Cuando lo pidas, bórralo de la lista o márcalo en «Pedido».'),
    tabla(['Producto','Quedan','Mínimo','Proveedor','Pedido'],4),P()
  ]}},
  proveedores:function(){return {titulo:'Proveedores',props:[],contenido:[
    tabla(['Proveedor','Qué te surte','Teléfono','Día de visita'],3),
    H('Lo que les debes'),{type:'porpagar',attrs:{id:id(),titulo:'',cuentas:[]}},P()
  ]}},
  cedis:function(){return {titulo:'Pedidos de sucursales',props:[],contenido:[
    P('Cada sucursal recibe su invitación (con su clave), llena su pedido y te lo manda con un enlace por WhatsApp o correo. Ábrelo y se suma aquí. Los insumos y las sucursales son de ejemplo: cámbialos por los tuyos.'),
    {type:'cedis',attrs:{id:id()}},
    H('Insumos'),P('Tu formato de pedido. Solo los activos llegan a las sucursales; el costo no.'),baseDatos(SEMILLAS.insumos()),
    H('Sucursales'),baseDatos(SEMILLAS.sucursales()),
    H('Pedidos recibidos'),baseDatos(SEMILLAS.pedidosCedis()),P()
  ]}},
  pedidocedis:function(x){x=x||{};return {titulo:'Pedido a '+(x.nombreCedis||'tu Cedis'),props:[],contenido:[
    P('Escribe la cantidad de cada insumo y toca «Enviar al Cedis»: se arma un enlace firmado para mandarlo por WhatsApp o correo. Si cambias algo, vuelve a enviarlo: reemplaza al anterior.'),
    {type:'pedidocedis',attrs:{id:id(),cedis:x.cedis||''}},P()
  ]}},
  cajachica:function(){
    var mes=new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'});
    return {titulo:'Caja chica de '+mes,props:[],contenido:[
      P('Anota cada entrega de efectivo de los restaurantes como «Ingreso» y cada pago o compra como «Egreso», con su monto en positivo. El saldo de cada fila es el de la anterior más el ingreso o menos el egreso. El saldo inicial viene del final de la caja chica anterior; puedes cambiarlo arriba de la tabla.'),
      baseDatos(SEMILLAS.cajachica(mes)),P()
    ]};
  },
  clientes:function(){return {titulo:'Clientes',props:[],contenido:[
    P('Una fila por cliente. Toca el cuadrito de la izquierda para ver su ficha.'),
    baseDatos(SEMILLAS.clientes()),P()
  ]}},
  presupuesto:function(){
    var d=new Date(),i=new Date(d.getFullYear(),d.getMonth(),1),f=new Date(d.getFullYear(),d.getMonth()+1,0);
    var mes=i.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
    return {titulo:'Presupuesto de '+mes,props:[],contenido:[
      P('Anota en «Presupuesto» cuánto quieres gastar al mes en cada categoría y en «Gastos» lo que vas gastando. El reporte compara lo real contra lo presupuestado.'),
      {type:'reporte',attrs:{id:id(),cfg:{titulo:'Gastos contra presupuesto',rol:'gastos',fecha:'g-fecha',periodo:'rango',desde:isoDe(i),hasta:isoDe(f),filas:'g-cat',valor:'g-monto',calculo:'suma',grafica:true,prol:'presupuesto',pvalor:'r-monto'}}},
      baseDatos(SEMILLAS.gastos()),
      baseDatos(SEMILLAS.presupuesto()),P()
    ]};
  },
  reporte:function(){
    var d=new Date(),i=new Date(d.getFullYear(),d.getMonth(),1),f=new Date(d.getFullYear(),d.getMonth()+1,0);
    var mes=i.toLocaleDateString('es-MX',{month:'long',year:'numeric'}),desde=isoDe(i),hasta=isoDe(f);
    function rep(cfg){return {type:'reporte',attrs:{id:id(),cfg:Object.assign({periodo:'rango',desde:desde,hasta:hasta,calculo:'suma',comparar:true,grafica:true},cfg)}}}
    return {titulo:'Reporte de '+mes,props:[],contenido:[
      P('Lo que vendiste y lo que compraste en '+mes+', contra el mes anterior. Sale de tu Inventario: las notas de venta y las facturas de tus proveedores.'),
      rep({titulo:'Ventas por producto',rol:'movimientos',fecha:'m-fecha',filas:'m-prod',valor:'m-importe',fcol:'m-tipo',fop:'igual',fval:'Venta'}),
      rep({titulo:'Compras por proveedor',rol:'compras',fecha:'c-fecha',filas:'c-prov',valor:'c-total'}),
      rep({titulo:'Piezas que entraron y salieron',rol:'movimientos',fecha:'m-fecha',filas:'m-tipo',valor:'m-cant',grafica:false}),
      H('Notas del mes'),P()
    ]};
  },
  inventario:function(){return {titulo:'Inventario',props:[],contenido:[
    P('Anota cada producto con su costo, su precio, cuántos tenías al empezar y el mínimo. Las existencias se calculan solas: lo que tenías más lo que entra menos lo que sale. Las notas de venta descuentan lo que vendes.'),
    {type:'inventario',attrs:{id:id(),titulo:''}},
    baseDatos(SEMILLAS.productos()),
    P('Cada vez que llega mercancía, anótala abajo, en «Entradas y salidas» (o con «Registrar entrada»). Las ventas aparecen solas.'),
    baseDatos(SEMILLAS.movimientos()),
    P('Las facturas de tus proveedores: «Importar factura XML» anota la compra, las entradas y el costo nuevo de cada producto.'),
    baseDatos(SEMILLAS.compras()),P()
  ]}},
  lista:function(){return {titulo:'Lista de precios',props:[],contenido:[
    {type:'callout',attrs:{id:id(),variante:'info'},content:[{type:'paragraph',content:[{type:'text',text:'Precios vigentes. Pregunta por mayoreo.'}]}]},
    tabla(['Producto o servicio','Presentación','Precio'],6),P()
  ]}},
  plan:function(){return {titulo:'Plan de negocio',props:[],contenido:[
    P('Contesta cada pregunta en pocas líneas. Vuelve a esta página cada mes.'),
    H('¿Qué vendes?'),P(),
    H('¿A quién le vendes?'),P(),
    H('¿A cuánto lo vendes?'),
    {type:'precio',attrs:{id:id(),titulo:'Mi producto principal'}},
    H('¿Cuánto quieres ganar al mes?'),P(),
    H('Metas de los próximos tres meses'),tareas(['','',''])
  ]}},
  /* Recursos humanos */
  equipo:function(){return {titulo:'Mi equipo',props:[],contenido:[
    P('Tu equipo de un vistazo. Agrega a cada persona con su fecha de ingreso y su salario diario; anota sus faltas, vacaciones, incapacidades y horas extra en «Incidencias». La antigüedad y los días de vacaciones se calculan solos.'),
    {type:'equipo',attrs:{id:id(),titulo:''}},
    H('Empleados'),
    baseDatos({rol:'empleados',nombre:'Empleados'}),
    H('Faltas, vacaciones e incidencias'),
    baseDatos({rol:'incidencias',nombre:'Incidencias'}),P()
  ]}},
  nominas:function(){
    var p=inicioQuincena(),txt=p.toLocaleDateString('es-MX',{day:'numeric',month:'long'});
    return {titulo:'Nómina de la quincena del '+txt,props:[],contenido:[
      P('La nómina de tu equipo para este periodo: descuenta las faltas y paga las horas extra que anotes en «Mi equipo». Cambia el periodo en el bloque si pagas por semana o por mes.'),
      {type:'planilla',attrs:{id:id(),titulo:'',que:'nomina',periodo:'Quincenal',desde:isoDe(p)}},
      H('Recibo de una persona'),
      P('Para el detalle de una persona (horas extra, domingos, bonos, lo que le cuesta al negocio), usa el recibo. Para otro, escribe / y elige «Recibo de nómina».'),
      {type:'nomina',attrs:{id:id(),periodo:'quincenal'}},P()
    ]};
  },
  vacaciones:function(){return {titulo:'Vacaciones',props:[],contenido:[
    {type:'planilla',attrs:{id:id(),titulo:'',que:'vacaciones',periodo:'Quincenal',desde:''}},
    H('Calcular las de una persona'),
    {type:'vacaciones',attrs:{id:id(),tabla:true}},P()
  ]}},
  aguinaldos:function(){return {titulo:'Aguinaldo '+new Date().getFullYear(),props:[],contenido:[
    P('Se paga a más tardar el 20 de diciembre: al menos 15 días de salario, o la parte proporcional si la persona entró este año.'),
    {type:'planilla',attrs:{id:id(),titulo:'',que:'aguinaldo',periodo:'Quincenal',desde:''}},
    H('Calcular el de una persona'),
    {type:'aguinaldo',attrs:{id:id()}},P()
  ]}},
  finiquito:function(){return {titulo:'Finiquito',props:[],contenido:[
    P('Escribe el salario, la fecha de ingreso, la de salida y el motivo. Revisa el resultado con tu contador antes de pagar.'),
    {type:'finiquito',attrs:{id:id(),salida:hoyISO()}},P()
  ]}},
  ptu:function(){return {titulo:'Reparto de utilidades '+new Date().getFullYear(),props:[],contenido:[
    P('Se reparte el 10 % de la utilidad fiscal del año anterior entre tu equipo, a más tardar el 30 de mayo. «Traer a tu equipo» llena los días y salarios desde «Mi equipo».'),
    {type:'ptu',attrs:{id:id()}},P()
  ]}},
  calculadoras:function(){return {titulo:'Calculadoras de nómina',props:[],contenido:[
    H('Recibo de nómina'),{type:'nomina',attrs:{id:id()}},
    H('Vacaciones'),{type:'vacaciones',attrs:{id:id()}},
    H('Aguinaldo'),{type:'aguinaldo',attrs:{id:id()}},
    H('Finiquito o liquidación'),{type:'finiquito',attrs:{id:id(),salida:hoyISO()}},P()
  ]}}
};
/* Paquetes por giro: varias páginas de una vez */
var PAQUETES={
  tienda:{nombre:'Tienda o abarrotes',tipos:['corte','inventario','reporte','fiado','proveedores']},
  comida:{nombre:'Comida (cocina, cafetería, repostería)',tipos:['corte','inventario','presupuesto','precio','pendientes']},
  servicios:{nombre:'Servicios (estética, taller, consultorio)',tipos:['venta','clientes','gastos','pendientes']},
  catalogo:{nombre:'Ventas por catálogo o redes',tipos:['lista','clientes','venta','gastos']}
};
function idDoc(){
  var a=new Uint8Array(8),s='';
  crypto.getRandomValues(a);
  for(var i=0;i<8;i++)s+='abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i]%36);
  return 'd-'+s;
}
/* Salas (E3): una página nueva nace en la sala elegida en «¿Dónde?», en la sala donde estás (AT.salaActual: la
   página de una sala o esa ubicación del explorador) o en la General; quien la crea es su propietario */
var donde='';
function salaNueva(){return donde||AT.salaActual||(AT.empresa&&AT.empresa.GENERAL)||''}
function conAcceso(doc,sala){
  if(doc&&!doc.acceso&&AT.datos.acceso&&AT.datos.acceso.nueva){var a=AT.datos.acceso.nueva(sala||salaNueva());if(a)doc.acceso=a}
  return doc;
}
/* Arma el documento de un tipo (sin guardarlo). extra ({titulo, contenido}) reemplaza lo de la plantilla; extra.sala
   dice en qué sala nace */
function armar(tipo,extra){
  var t=TIPOS[tipo],pl=PLANTILLAS[tipo];
  if(!t||!pl)return null;
  var base=Object.assign(pl(extra),extra||{}),ahora=new Date().toISOString();
  var doc={formato:1,tipo:tipo,id:idDoc(),titulo:base.titulo,props:base.props,creado:ahora,editado:ahora,
    contenido:{type:'doc',content:base.contenido}};
  return conAcceso(doc,extra&&extra.sala);
}
/* Guarda un documento nuevo y lo abre */
function guardarYAbrir(doc){
  conAcceso(doc);
  /* Se pide aquí, durante el clic: algunos navegadores solo lo permiten así */
  AT.datos.pedirPersistencia();
  return AT.datos.documentos.guardar(doc,{conservarFecha:true}).then(function(d){
    try{sessionStorage.setItem('onelearn:recien-creado',d.id)}catch(e){}
    location.href=RAIZ+'documento.html?id='+encodeURIComponent(d.id);
    return d;
  });
}
/* Crea el documento, lo guarda y lo abre */
function nuevo(tipo,extra){
  var doc=armar(tipo,extra);
  if(!doc)return Promise.reject(new Error('Ese tipo todavía no está disponible'));
  return guardarYAbrir(doc);
}
/* Un paquete: crea todas sus páginas y vuelve al Inicio con el aviso */
function crearPaquete(giro){
  var pq=PAQUETES[giro];
  if(!pq)return Promise.reject(new Error('Ese paquete no existe'));
  AT.datos.pedirPersistencia();
  var hechas=[];
  return pq.tipos.reduce(function(pr,t){
    return pr.then(function(){var d=armar(t);return d?AT.datos.documentos.guardar(d,{conservarFecha:true}).then(function(x){hechas.push(x)}):null});
  },Promise.resolve()).then(function(){
    try{sessionStorage.setItem('onebook:aviso','Se crearon '+hechas.length+' páginas: '+hechas.map(function(d){return d.titulo}).join(', ')+'.')}catch(e){}
    location.href=RAIZ+'inicio.html';
    return hechas;
  });
}

/* ---------- Tus plantillas ---------- */
/* Lo anotado de cada bloque, que se quita al guardar una plantilla «sin lo anotado» */
var VACIAR={
  corte:function(a){a.fecha='';a.ventas={};a.movs=[];a.contado='';a.billetes={};a.notas=''},
  fiado:function(a){a.clientes=(a.clientes||[]).map(function(c){return {nombre:c.nombre||'',telefono:c.telefono||'',apunte:{monto:'',concepto:''},todos:false,movs:[]}})},
  gastos:function(a){a.filas=[];a.mes=''},
  venta:function(a){a.folio='';a.fecha='';a.cliente='';a.recibido=''},
  porpagar:function(a){a.cuentas=[]},
  pagos:function(a){a.pagados={}},
  nomina:function(a){a.faltas='';a.horasDobles='';a.horasTriples='';a.descansos='';a.domingos='';a.otras=''},
  finiquito:function(a){a.salida='';a.pendientes='';a.vacPendientes='';a.vacTomadas=''}
};
/* Lo que cada bloque necesita al usarse: la fecha de hoy, un folio nuevo, el mes actual */
var AL_CREAR={
  corte:function(a){a.fecha=hoyISO()},
  venta:function(a){a.folio=AT.folio('V');a.fecha=hoyISO()},
  gastos:function(a){a.mes=hoyISO().slice(0,7)},
  /* La nómina de tu equipo pasa al periodo en curso */
  planilla:function(a){if(a.que==='nomina'&&a.desde)a.desde=isoDe(inicioPeriodo(a.periodo))},
  /* Un reporte de un mes completo pasa al mes en curso */
  reporte:function(a){
    var c=a.cfg;if(!c||c.periodo!=='rango'||!/^\d{4}-\d{2}-01$/.test(c.desde||''))return;
    var h=c.hasta||'',y=+c.desde.slice(0,4),m=+c.desde.slice(5,7);
    if(h!==isoDe(new Date(y,m,0)))return;
    var d=new Date();c.desde=isoDe(new Date(d.getFullYear(),d.getMonth(),1));c.hasta=isoDe(new Date(d.getFullYear(),d.getMonth()+1,0));
  }
};
function desmarcar(n){
  if(!n||typeof n!=='object')return;
  if(n.type==='taskItem'&&n.attrs)n.attrs.checked=false;
  (n.content||[]).forEach(desmarcar);
}
/* La plantilla de un documento: {id, nombre, desc, tipo, titulo, props, contenido} */
function plantillaDe(doc,op){
  op=op||{};
  var c=clonar(doc.contenido&&doc.contenido.content||[]);
  if(op.vaciar)c.forEach(function(b){if(b.attrs&&VACIAR[b.type])VACIAR[b.type](b.attrs);desmarcar(b)});
  var pl={id:'p-'+idDoc().slice(2),nombre:String(op.nombre||doc.titulo||'Mi plantilla').replace(/\s+/g,' ').trim().slice(0,80)||'Mi plantilla',
    desc:String(op.desc||'').replace(/\s+/g,' ').trim().slice(0,160),tipo:TIPOS[doc.tipo]?doc.tipo:'notas',
    titulo:doc.titulo||'',props:clonar(doc.props||[]).map(function(p){return op.vaciar?Object.assign(p,{valor:''}):p}),contenido:{type:'doc',content:c}};
  return pl;
}
/* Las bases de datos van como semilla: su estructura y, si no se quita lo anotado, sus filas */
function guardarPlantilla(doc,op){
  op=op||{};
  var pl=plantillaDe(doc,op),bds=(pl.contenido.content||[]).filter(function(b){return b.type==='basedatos'&&b.attrs&&b.attrs.base});
  return Promise.all(bds.map(function(b){
    return AT.bases?AT.bases.semillaDe(b.attrs.base,!op.vaciar).then(function(s){if(s){b.attrs.semilla=s;b.attrs.base='';b.attrs.vista=''}}):null;
  })).then(function(){return AT.datos.plantillas.guardar(pl)});
}
/* Un documento nuevo desde una de tus plantillas (cada bloque con id nuevo y listo para usarse) */
function desdePlantilla(pl){
  var tipo=TIPOS[pl.tipo]&&TIPOS[pl.tipo].listo?pl.tipo:'notas',ahora=new Date().toISOString(),folioViejo='',folioNuevo='';
  var c=clonar(pl.contenido&&pl.contenido.content||[]);
  c.forEach(function(b){
    if(!b.attrs||typeof b.attrs!=='object')return;
    if('id' in b.attrs||b.type)b.attrs.id=id();
    if(b.type==='venta'&&!folioViejo)folioViejo=b.attrs.folio||'';
    if(AL_CREAR[b.type])AL_CREAR[b.type](b.attrs);
    if(b.type==='venta'&&!folioNuevo)folioNuevo=b.attrs.folio;
  });
  var titulo=pl.titulo||pl.nombre||'Sin título';
  /* «Nota de venta V-007» pasa a llevar el folio nuevo */
  if(folioNuevo){titulo=folioViejo&&titulo.indexOf(folioViejo)>=0?titulo.replace(folioViejo,folioNuevo):/V-\d{3,}/.test(titulo)?titulo.replace(/V-\d{3,}/,folioNuevo):titulo}
  var doc={formato:1,tipo:tipo,id:idDoc(),titulo:titulo,props:clonar(pl.props||[]),creado:ahora,editado:ahora,contenido:{type:'doc',content:c.length?c:[P()]}};
  return doc;
}
function nuevoDesde(pl){return guardarYAbrir(desdePlantilla(pl))}

/* ---------- Qué se ofrece según el perfil ---------- */
/* Las categorías de la galería; las notas y el documento en blanco van en la primera */
function categorias(){
  return ['negocio','rh','paquetes'].filter(function(c){return tiene(CAT_MOD[c])});
}
function tiposDe(cat,primera){
  return ORDEN.filter(function(k){var t=TIPOS[k];return t.listo&&tiene(t.modulo)&&(t.cat===cat||(primera&&t.cat==='general'))});
}
/* Las páginas listas para usar del Inicio */
var INICIO=['pendientes','corte','fiado','gastos','venta','precio','surtir','proveedores','clientes','equipo','nominas'];
function plantillasInicio(){
  return INICIO.filter(function(k){return TIPOS[k]&&TIPOS[k].listo&&tiene(TIPOS[k].modulo)});
}
/* Lo que «Crea tu empresa» sugiere al empezar: [{tipo, marcado}] según el giro */
function sugeridas(perfil,giro,rh){
  var tienda=giro==='tienda',mercancia=['tienda','comida','catalogo','distribucion'].indexOf(giro)>=0;
  /* Con «Tengo empleados», primero tu equipo y su nómina */
  return (rh?[['equipo',true],['nominas',true]]:[]).concat([['corte',mercancia],['fiado',tienda],['gastos',true],['surtir',mercancia],['venta',!mercancia],['pendientes',!mercancia],
    ['proveedores',false],['precio',false],['prestamo',false],['notas',false]])
    .map(function(x){return {tipo:x[0],marcado:x[1]}});
}

/* ---------- Ventana «¿Qué quieres crear?»: la galería ---------- */
var dlg=null,abridor=null,filtro='todas',mias=[];
function opcion(k){
  var t=TIPOS[k];
  return '<button type="button" class="crear-o" data-tipo="'+k+'" data-buscar="'+esc(sinAcentos(t.nombre+' '+t.desc+' '+(t.trae||[]).join(' ')))+'">'+ico(t.icono)+
    '<span><b>'+esc(t.nombre)+'</b><small>'+esc(t.desc)+'</small>'+(t.trae?'<em class="crear-trae">Trae: '+esc(t.trae.join(' · '))+'</em>':'')+'</span></button>';
}
function opcionPaquete(k){
  var pq=PAQUETES[k],nombres=pq.tipos.map(function(t){return TIPOS[t].nombre}),giro=PER&&PER.giro&&PER.giro();
  return '<button type="button" class="crear-o crear-pq" data-paquete="'+k+'" data-buscar="'+esc(sinAcentos('paquete '+pq.nombre+' '+nombres.join(' ')))+'">'+ico('crear')+
    '<span><b>'+esc(pq.nombre)+(giro===k?' <i class="crear-tuyo">Tu giro</i>':'')+'</b><small>Crea '+pq.tipos.length+' páginas de una vez.</small>'+
    '<em class="crear-trae">'+esc(nombres.join(' · '))+'</em></span></button>';
}
function opcionMia(pl){
  var t=TIPOS[pl.tipo]||TIPOS.notas;
  return '<div class="crear-mia"><button type="button" class="crear-o" data-plantilla="'+esc(pl.id)+'" data-buscar="'+esc(sinAcentos(pl.nombre+' '+(pl.desc||'')))+'">'+ico(t.icono)+
    '<span><b>'+esc(pl.nombre)+'</b><small>'+esc(pl.desc||'Tu plantilla, guardada el '+new Date(pl.creado||Date.now()).toLocaleDateString('es-MX',{day:'numeric',month:'short'})+'.')+'</small></span></button>'+
    '<button type="button" class="crear-x" data-quitar="'+esc(pl.id)+'" aria-label="Eliminar la plantilla «'+esc(pl.nombre)+'»" title="Eliminar plantilla">'+ico('basura')+'</button></div>';
}
function seccion(cat,html){
  return '<section class="crear-sec" data-cat="'+cat+'" aria-labelledby="crS-'+cat+'"><h3 class="crear-h" id="crS-'+cat+'">'+esc(CATS[cat])+'</h3>'+
    '<div class="crear-g" data-modulo="'+(CAT_MOD[cat]==='nucleo'?'mis':cat==='paquetes'?cat:CAT_MOD[cat])+'">'+html+'</div></section>';
}
function pintarGaleria(){
  var cats=categorias(),orden=[];
  var h=cats.map(function(c,i){
    var html=c==='paquetes'?Object.keys(PAQUETES).map(opcionPaquete).join(''):tiposDe(c,i===0).map(opcion).join('');
    if(html)orden.push(c);
    return html?seccion(c,html):'';
  }).join('');
  if(!cats.length)h=seccion('negocio',tiposDe('general',true).map(opcion).join('')).replace(esc(CATS.negocio),'Para empezar');
  /* Tus plantillas van primero */
  if(mias.length){h=seccion('mis',mias.map(opcionMia).join(''))+h;orden.unshift('mis')}
  $('#crSecs',dlg).innerHTML=h;
  if(filtro!=='todas'&&orden.indexOf(filtro)<0)filtro='todas';
  /* Las categorías, en el mismo orden que las secciones */
  $('#crChips',dlg).innerHTML=['todas'].concat(orden).map(function(c){
    return '<button type="button" class="crear-chip" data-filtro="'+c+'" aria-pressed="'+(c===filtro)+'">'+esc(c==='todas'?'Todas':CATS[c])+'</button>';
  }).join('');
  filtrar();
}
/* Lo que se ve: la categoría elegida y lo que coincide con la búsqueda */
function filtrar(){
  var q=sinAcentos($('#crBuscar',dlg).value.trim()),vistas=0;
  $$('.crear-chip',dlg).forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-filtro')===filtro))});
  $$('.crear-sec',dlg).forEach(function(s){
    var n=0;
    $$('[data-buscar]',s).forEach(function(o){var ve=!q||o.getAttribute('data-buscar').indexOf(q)>=0;(o.closest('.crear-mia')||o).hidden=!ve;if(ve)n++});
    s.hidden=!n||(filtro!=='todas'&&s.getAttribute('data-cat')!==filtro);
    if(!s.hidden)vistas+=n;
  });
  $('#crNada',dlg).hidden=!!vistas;
}
function cargarMias(){
  return AT.datos.plantillas.todos().then(function(l){
    mias=l.slice().sort(function(a,b){return (b.editado||'')<(a.editado||'')?-1:1});
  },function(){mias=[]});
}
function ocupado(si,msg){
  $$('.crear-o',dlg).forEach(function(x){if(si)x.setAttribute('aria-disabled','true');else x.removeAttribute('aria-disabled')});
  $('#crMsg',dlg).textContent=msg||'';
}
function crearVentana(){
  dlg=document.createElement('dialog');
  dlg.className='atajos crear-dlg';
  dlg.setAttribute('aria-labelledby','crT');
  var pronto=ORDEN.filter(function(k){var t=TIPOS[k];return !t.listo&&tiene(t.modulo)});
  dlg.innerHTML='<div class="at-h"><h2 id="crT">¿Qué quieres crear?</h2>'+
    '<button class="lec-x" type="button" data-cr="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
    '<p class="td-p">Elige una plantilla: empieza con su estructura y sus bloques, y después la cambias a tu gusto. Se guarda solo en este dispositivo.</p>'+
    (AT.empresa&&AT.empresa.existe()?'<label class="crear-donde"><span>¿Dónde?</span><select id="crDonde"></select></label>':'')+
    '<div class="crear-filtros"><label class="vh" for="crBuscar">Buscar plantilla</label><input type="search" id="crBuscar" class="crear-buscar" placeholder="Buscar plantilla" autocomplete="off">'+
    '<div class="crear-chips" id="crChips" role="group" aria-label="Categorías"></div></div>'+
    '<div id="crSecs"></div><p class="hint" id="crNada" hidden>Ninguna plantilla coincide. Prueba con otra palabra.</p>'+
    (pronto.length?'<h3 class="crear-h">Llegan después</h3>'+
    '<ul class="crear-p">'+pronto.map(function(k){
      var t=TIPOS[k];
      return '<li>'+ico(t.icono)+'<span>'+esc(t.nombre)+'</span></li>';
    }).join('')+'</ul>':'')+
    '<p class="td-msg" id="crMsg" role="status"></p>';
  document.body.appendChild(dlg);
  $('#crBuscar',dlg).addEventListener('input',filtrar);
  if($('#crDonde',dlg))$('#crDonde',dlg).addEventListener('change',function(){donde=this.value});
  dlg.addEventListener('click',function(e){
    if(e.target===dlg||e.target.closest('[data-cr="cerrar"]')){cerrar();return}
    var ch=e.target.closest('[data-filtro]');
    if(ch){filtro=ch.getAttribute('data-filtro');filtrar();return}
    var x=e.target.closest('[data-quitar]');
    if(x){quitarMia(x.getAttribute('data-quitar'));return}
    var b=e.target.closest('.crear-o');
    if(!b||b.getAttribute('aria-disabled')==='true')return;
    ocupado(true,'Creando…');
    var pr=b.hasAttribute('data-paquete')?crearPaquete(b.getAttribute('data-paquete')):
      b.hasAttribute('data-plantilla')?nuevoDesde(mias.filter(function(m){return m.id===b.getAttribute('data-plantilla')})[0]||{}):
      nuevo(b.getAttribute('data-tipo'));
    pr.catch(function(err){ocupado(false,'No se pudo crear: '+(err&&err.message||'inténtalo otra vez'))});
  });
  dlg.addEventListener('close',function(){if(abridor&&document.contains(abridor))abridor.focus({preventScroll:true})});
}
/* Eliminar una de tus plantillas (con «Deshacer») */
function quitarMia(pid){
  var pl=mias.filter(function(m){return m.id===pid})[0];if(!pl)return;
  var tarjetas=$$('.crear-mia',dlg),i=tarjetas.indexOf($('[data-quitar="'+pid+'"]',dlg).closest('.crear-mia'));
  AT.datos.plantillas.borrar(pid).then(function(){
    mias=mias.filter(function(m){return m.id!==pid});
    pintarGaleria();
    var sig=$$('.crear-mia [data-plantilla]',dlg)[Math.max(0,i-1)]||$('.crear-o:not([hidden])',dlg)||$('#crBuscar',dlg);
    if(sig)sig.focus();
    $('#crMsg',dlg).textContent='Se eliminó la plantilla «'+pl.nombre+'».';
    if(AT.aviso)AT.aviso('Se eliminó la plantilla «'+pl.nombre+'».','Deshacer',function(){
      AT.datos.plantillas.guardar(pl,{conservarFecha:true}).then(function(){mias.push(pl);if(dlg)pintarGaleria()});
    });
  });
}
/* «¿Dónde?»: las salas donde puedes crear páginas y Privado (solo tú) */
function pintarDonde(sala){
  var sel=$('#crDonde',dlg);if(!sel)return;
  var ls=AT.empresa.salas().filter(function(x){return AT.empresa.puedeSala(x.id,'editar')});
  donde=sala&&(sala==='privado'||ls.some(function(x){return x.id===sala}))?sala:'';
  var actual=donde||salaNueva();
  if(actual!=='privado'&&!ls.some(function(x){return x.id===actual}))actual=ls.length?ls[0].id:'privado';
  donde=actual;
  sel.innerHTML=ls.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===actual?' selected':'')+'>'+esc(x.tipo==='general'?'General (toda la empresa)':x.nombre)+'</option>'}).join('')+
    '<option value="privado"'+(actual==='privado'?' selected':'')+'>Privado (solo tú)</option>';
}
/* op.sala: la sala en la que se crea (la página de una sala) */
function abrir(cat,op){
  if(!dlg)crearVentana();
  abridor=document.activeElement;
  pintarDonde(op&&op.sala);
  filtro=cat&&CATS[cat]?cat:'todas';
  $('#crBuscar',dlg).value='';
  ocupado(false);
  pintarGaleria();
  if(AT.setNav)AT.setNav(false);
  dlg.showModal();
  var p=$('.crear-sec:not([hidden]) .crear-o',dlg);if(p)p.focus();
  /* Tus plantillas llegan de la base: se agregan sin mover el foco */
  cargarMias().then(function(){if(dlg.open&&mias.length){var f=document.activeElement&&document.activeElement.getAttribute('data-tipo');pintarGaleria();if(f){var o=$('[data-tipo="'+f+'"]',dlg);if(o)o.focus()}}});
}
function cerrar(){if(dlg&&dlg.open)dlg.close()}
AT.crear={abrir:abrir,cerrar:cerrar,nuevo:nuevo,armar:armar,tipos:TIPOS,plantillasInicio:plantillasInicio,sugeridas:sugeridas,
  paquetes:PAQUETES,crearPaquete:crearPaquete,guardarPlantilla:guardarPlantilla,plantillaDe:plantillaDe,desdePlantilla:desdePlantilla,nuevoDesde:nuevoDesde};
document.addEventListener('click',function(e){
  if(e.target.closest('#sideCrear,[data-crear]'))abrir();
});
/* Al cerrar la ventana, la próxima vez vuelve a empezar en la sala donde estás */
document.addEventListener('close',function(e){if(e.target===dlg)donde=''},true);
/* inicio.html#crear (desde la página de bienvenida) abre la ventana al llegar */
if(AT.rutas&&AT.rutas.esInicio&&location.hash==='#crear'){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  setTimeout(abrir,0);
}
/* ---------- Deshacer una eliminación (la página está en la papelera) y avisos de otra página ---------- */
var borrado=null;
try{borrado=JSON.parse(sessionStorage.getItem('onelearn:eliminado')||'null');sessionStorage.removeItem('onelearn:eliminado')}catch(e){}
if(borrado&&borrado.id&&AT.aviso){
  AT.aviso('«'+(borrado.titulo||'Sin título')+'» se movió a la papelera.','Deshacer',function(){
    AT.datos.papelera.restaurar(borrado.id).then(function(){
      location.href=RAIZ+'documento.html?id='+encodeURIComponent(borrado.id);
    },function(){AT.aviso('No se pudo recuperar. Búscala en la papelera.')});
  });
}
var avisoPendiente=null;
try{avisoPendiente=sessionStorage.getItem('onebook:aviso');sessionStorage.removeItem('onebook:aviso')}catch(e){}
if(avisoPendiente&&AT.aviso)AT.aviso(avisoPendiente);
})();
