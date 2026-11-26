/* OneBook: la empresa de ejemplo (etapa Empresas, E5; ejemplo.html).
   Arma en este navegador «Ferretería El Clavo» para explorar OneBook sin capturar nada: seis personas en cuatro
   departamentos (cada uno con su sala), páginas en cada sala, el inventario con dos meses de ventas, compras por
   pagar, gastos, el equipo con sus incidencias y los tableros (el Inicio y la portada de cada sala) ya armados.
   - Solo en un navegador sin espacio: si ya hay una empresa aquí, no toca nada y lo explica (si es el ejemplo,
     abre el Inicio).
   - El perfil queda con ejemplo:true: el Inicio lo dice y ofrece «Crear mi empresa», que borra todo
     (AT.datos.borrarTodo) y abre «Crea tu empresa».
   - Los datos salen de una semilla fija (las mismas cifras cada vez), con fechas relativas a hoy.
   Expone AT.ejemplo = {armar}. Se carga después de inventario.js. */
(function(){
'use strict';
var AT=window.AT,E=AT.empresa,B=AT.bases,D=AT.datos;
var NOMBRE='Ferretería El Clavo';

function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function dia(n){var d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d}
/* El mismo día y mes que dentro de n días, en otro año (cumpleaños y aniversarios cercanos) */
function enAnio(n,anio){var d=dia(n);return anio+iso(d).slice(4)}
/* Números «al azar» que salen iguales cada vez */
var semilla=20261125;
function azar(){semilla=semilla*16807%2147483647;return (semilla-1)/2147483646}
function entre(a,b){return a+Math.floor(azar()*(b-a+1))}
function bid(){return AT.bloques&&AT.bloques.nuevoId?AT.bloques.nuevoId():'b-'+Math.random().toString(36).slice(2,8)}

/* ---------- La gente ---------- */
var DEPTOS=['Ventas','Almacén','Administración','Recursos humanos'];
var PERSONAS=[
  {nombre:'Carlos Ruiz',deptos:{Ventas:'responsable'}},
  {nombre:'Jorge Díaz',deptos:{Ventas:'miembro'}},
  {nombre:'Rosa Lima',deptos:{'Almacén':'responsable'}},
  {nombre:'Mario Torres',deptos:{'Administración':'responsable',Ventas:'consulta'}},
  {nombre:'Ana Pérez',deptos:{'Recursos humanos':'responsable'}}
];

/* ---------- El inventario ---------- */
var CATS=['Herramienta','Tornillería','Eléctrico','Plomería','Pintura'];
/* [nombre, código, categoría, proveedor, costo, precio, al empezar, mínimo, existencias al final, cuántas se venden al día] */
var PRODUCTOS=[
  ['Martillo de uña 16 oz','HER-001','Herramienta','Distribuidora del Norte',95,159,18,6,14,[0,1]],
  ['Desarmador plano 1/4"','HER-002','Herramienta','Distribuidora del Norte',28,49,30,10,22,[0,2]],
  ['Pinzas de electricista 8"','HER-003','Herramienta','Distribuidora del Norte',110,189,12,5,9,[0,1]],
  ['Flexómetro 5 m','HER-004','Herramienta','Distribuidora del Norte',62,109,25,8,5,[0,2]],
  ['Tornillo para madera 1" (caja de 100)','TOR-001','Tornillería','Tornillos y Más',38,69,40,15,31,[0,3]],
  ['Taquete de plástico 1/4" (bolsa de 50)','TOR-002','Tornillería','Tornillos y Más',18,35,60,20,44,[1,4]],
  ['Clavo de 2 1/2" (kg)','TOR-003','Tornillería','Tornillos y Más',32,55,50,20,38,[1,3]],
  ['Cable calibre 12 (metro)','ELE-001','Eléctrico','Eléctrica Central',9.5,17,300,100,180,[5,30]],
  ['Apagador sencillo','ELE-002','Eléctrico','Eléctrica Central',22,45,35,12,26,[0,3]],
  ['Foco LED 9 W','ELE-003','Eléctrico','Eléctrica Central',24,49,48,20,0,[1,4]],
  ['Llave de paso 1/2"','PLO-001','Plomería','Distribuidora del Norte',85,145,10,4,7,[0,1]],
  ['Cinta teflón','PLO-002','Plomería','Distribuidora del Norte',6,15,80,30,12,[1,5]],
  ['Pintura vinílica blanca 4 L','PIN-001','Pintura','Pinturas del Bajío',290,459,14,6,3,[0,1]],
  ['Brocha de 3"','PIN-002','Pintura','Pinturas del Bajío',28,55,20,8,15,[0,2]]
];
var DIAS_VENTAS=60;

function filasInventario(ids){
  var prods=[],movs=[];
  PRODUCTOS.forEach(function(x){
    prods.push(B.nuevaFila(ids.productos,{'p-nombre':x[0],'p-codigo':x[1],'p-cat':x[2],'p-prov':x[3],'p-costo':x[4],'p-precio':x[5],'p-ini':x[6],'p-min':x[7]}));
  });
  var vendidas=prods.map(function(){return 0});
  /* Dos meses de ventas de mostrador (los domingos no se abre); este mes se vende un poco más */
  for(var n=-DIAS_VENTAS;n<=0;n++){
    var d=dia(n);if(d.getDay()===0)continue;
    var extra=n>-25?4:0;
    for(var k=entre(16,24)+extra;k>0;k--){
      var i=entre(0,PRODUCTOS.length-1),x=PRODUCTOS[i],c=entre(x[9][0],x[9][1]);
      if(!c)continue;
      vendidas[i]+=c;
      movs.push(B.nuevaFila(ids.movimientos,{'m-con':'Venta de mostrador','m-fecha':iso(d),'m-prod':prods[i].id,'m-tipo':'Venta','m-cant':c,'m-pu':x[5]}));
    }
  }
  /* Las entradas dejan cada producto con las existencias de la tabla (unos bajos y uno agotado) */
  PRODUCTOS.forEach(function(x,i){
    var falta=vendidas[i]+x[8]-x[6];if(falta<=0){if(falta<0)movs.push(B.nuevaFila(ids.movimientos,{'m-con':'Ajuste de inventario','m-fecha':iso(dia(-40)),'m-prod':prods[i].id,'m-tipo':'Salida','m-cant':-falta,'m-nota':'Conteo físico'}));return}
    var a=Math.ceil(falta*0.6),b=falta-a;
    movs.push(B.nuevaFila(ids.movimientos,{'m-con':'Compra a '+x[3],'m-fecha':iso(dia(-34)),'m-prod':prods[i].id,'m-tipo':'Entrada','m-cant':a,'m-pu':x[4]}));
    if(b>0)movs.push(B.nuevaFila(ids.movimientos,{'m-con':'Compra a '+x[3],'m-fecha':iso(dia(-12)),'m-prod':prods[i].id,'m-tipo':'Entrada','m-cant':b,'m-pu':x[4]}));
  });
  return prods.concat(movs);
}
function filasCompras(id){
  return [
    ['Distribuidora del Norte',-20,'A-1532',8450,'Pagada',-5],
    ['Eléctrica Central',-12,'F-2207',5200,'Por pagar',3],
    ['Pinturas del Bajío',-35,'PB-881',12300,'Por pagar',-2],
    ['Tornillos y Más',-6,'TM-410',3150,'Por pagar',24]
  ].map(function(c){
    var iva=Math.round(c[3]*16)/100;
    return B.nuevaFila(id,{'c-prov':c[0],'c-fecha':iso(dia(c[1])),'c-folio':c[2],'c-sub':c[3],'c-iva':iva,'c-total':Math.round((c[3]+iva)*100)/100,'c-estado':c[4],'c-vence':iso(dia(c[5]))});
  });
}
function filasGastos(id){
  var l=[],h=dia(0);
  [-1,0].forEach(function(m){
    function f(d,con,cat,monto,forma,nota){
      var x=new Date(h.getFullYear(),h.getMonth()+m,d,12);if(x>h)return;
      l.push(B.nuevaFila(id,{'g-con':con,'g-fecha':iso(x),'g-cat':cat,'g-monto':monto,'g-forma':forma,'g-nota':nota||''}));
    }
    f(1,'Renta del local','Renta',18000,'Transferencia');
    f(5,'Internet y teléfono','Internet y teléfono',799,'Tarjeta');
    f(8,'Luz','Luz',m?2180:2350,'Transferencia');
    f(10,'Agua','Agua',420,'Efectivo');
    [3,10,17,24].forEach(function(d){f(d,'Gasolina del reparto','Transporte',entre(380,520),'Efectivo')});
    if(m)f(14,'Reparación de la cortina','Mantenimiento',1500,'Efectivo','Cortina de la bodega');
    else f(12,'Volantes de temporada','Publicidad',650,'Transferencia');
  });
  return l;
}
var EMPLEADOS=[
  ['Carlos Ruiz','Encargado de mostrador','Ventas','2019-03-04',enAnio(3,1988),520,'Semanal'],
  ['Jorge Díaz','Vendedor','Ventas','2023-08-14','1999-02-11',340,'Semanal'],
  ['Rosa Lima','Almacenista','Almacén','2021-01-18','1992-07-23',420,'Semanal'],
  ['Luis Gómez','Repartidor','Almacén','2024-05-06','2001-10-02',330,'Semanal'],
  ['Mario Torres','Contador','Administración','2018-09-10','1980-12-05',780,'Quincenal'],
  ['Ana Pérez','Auxiliar de recursos humanos','Recursos humanos',enAnio(5,2022),'1995-04-17',480,'Quincenal']
];
function filasEquipo(ids){
  var em=EMPLEADOS.map(function(x){
    return B.nuevaFila(ids.empleados,{'em-nombre':x[0],'em-puesto':x[1],'em-depto':x[2],'em-ingreso':x[3],'em-nac':x[4],'em-salario':x[5],'em-periodo':x[6],'em-estado':'Activo'});
  });
  return em.concat([
    B.nuevaFila(ids.incidencias,{'in-con':'Falta','in-emp':em[1].id,'in-tipo':'Falta','in-desde':iso(dia(0)),'in-dias':1,'in-nota':'Avisó que está enfermo'}),
    B.nuevaFila(ids.incidencias,{'in-con':'Vacaciones','in-emp':em[2].id,'in-tipo':'Vacaciones','in-desde':iso(dia(7)),'in-dias':5}),
    B.nuevaFila(ids.incidencias,{'in-con':'Horas extra del inventario','in-emp':em[3].id,'in-tipo':'Horas extra','in-desde':iso(dia(-9)),'in-horas':4})
  ]);
}

/* ---------- Las páginas ---------- */
function P(t,neg){
  var c=[];String(t).split(/\*\*(.+?)\*\*/).forEach(function(x,i){if(x)c.push(i%2?{type:'text',text:x,marks:[{type:'bold'}]}:{type:'text',text:x})});
  return {type:'paragraph',attrs:{id:bid()},content:c};
}
function lista(items){return {type:'bulletList',attrs:{id:bid()},content:items.map(function(t){var p=P(t);delete p.attrs;return {type:'listItem',content:[p]}})}}
function empiezaAqui(){
  var c=P('Cuando quieras empezar la tuya, pulsa **Crear mi empresa** en el Inicio: se borra este ejemplo de este navegador y empiezas desde cero.');delete c.attrs;
  return [
    P('Esta es una empresa de ejemplo para que veas cómo se trabaja en OneBook: **seis personas, cuatro departamentos** y cada departamento con su sala. Todo vive en este navegador; cámbiale lo que quieras.'),
    {type:'heading',attrs:{id:bid(),level:2},content:[{type:'text',text:'Prueba esto'}]},
    lista(['**Cambia de persona**: abajo en la barra lateral está Lupita, la dueña. Entra como Carlos (Ventas) o como Ana (Recursos humanos) y mira qué salas y páginas ve cada quien.',
      'Abre la sala de **Almacén**: el inventario calcula solo las existencias y avisa lo que se acaba.',
      'En el Inicio, pulsa **Editar** y arma tu tablero: agrega una gráfica, un aviso o una página.',
      'En la sala de **Ventas**, haz una nota de venta: al guardarse, descuenta del inventario.',
      'En **Tu empresa** están la gente, sus departamentos y quién entra a cada sala.']),
    {type:'callout',attrs:{id:bid(),variante:'idea'},content:[c]}
  ];
}
/* [tipo, departamento (o '' para la General), título] */
var PAGINAS=[
  ['notas','','Empieza aquí',empiezaAqui],
  ['pendientes','','Pendientes de la semana'],
  ['corte','Ventas',''],['venta','Ventas',''],['clientes','Ventas',''],['lista','Ventas',''],
  ['inventario','Almacén',''],['surtir','Almacén',''],
  ['reporte','Administración',''],['presupuesto','Administración',''],['proveedores','Administración',''],
  ['nominas','Recursos humanos',''],['vacaciones','Recursos humanos','']
];

/* ---------- Armar todo ---------- */
function armar(){
  if(AT.perfil.actual())return Promise.reject(new Error('Ya hay una empresa en este navegador.'));
  var p=AT.perfil.guardar({perfil:'negocio',modulos:['negocio','rh'],nombre:'Lupita Hernández',negocio:{nombre:NOMBRE,giro:'tienda',telefono:''},ejemplo:true});
  if(!p)return Promise.reject(new Error('No se pudo guardar en este navegador. Revisa que no esté en modo privado o sin espacio.'));
  E.crear({nombre:NOMBRE,giro:'tienda',telefono:'',tuNombre:'Lupita Hernández',departamentos:DEPTOS});
  var dep={};E.departamentos().forEach(function(d){dep[d.nombre]=d.id});
  PERSONAS.forEach(function(x){
    var ds={};Object.keys(x.deptos).forEach(function(n){ds[dep[n]]=x.deptos[n]});
    E.agregarPersona({nombre:x.nombre,deptos:ds});
  });
  var sala=function(n){return n?E.salaDeDepto(dep[n]):E.GENERAL},ids=null,docs={};
  return AT.inventario.asegurar('',['productos','movimientos','compras','gastos','empleados','incidencias']).then(function(x){
    ids=x;
    return B.cargar(ids.productos);
  }).then(function(pb){
    var c=B.col(pb,'p-cat');if(c){c.opciones=CATS.slice();return B.guardarBase(pb)}
  }).then(function(){
    /* Sin historial: las filas del ejemplo no son cambios de nadie */
    return B.guardarFilas([].concat(filasInventario(ids),filasCompras(ids.compras),filasGastos(ids.gastos),filasEquipo(ids)),{historial:false});
  }).then(function(){
    return PAGINAS.reduce(function(pr,x){
      return pr.then(function(){
        var extra={sala:sala(x[1])};if(x[2])extra.titulo=x[2];if(x[3])extra.contenido=x[3]();
        var d=AT.crear.armar(x[0],extra);if(!d)return;
        if(x[0]==='notas')d.favorito=true;
        return D.documentos.guardar(d,{conservarFecha:true}).then(function(g){docs[x[0]]=g.id});
      });
    },Promise.resolve());
  }).then(function(){
    E.guardarTablero('empresa',[
      {id:'m-aviso',tipo:'avisos',tam:'l',cfg:{texto:'Bienvenido a '+NOMBRE+', una empresa de ejemplo. Empieza por la página «Empieza aquí» y cambia de persona (abajo en la barra lateral) para ver qué ve cada quien.'}},
      {id:'m-acciones',tipo:'acciones',tam:'l',cfg:{}},
      {id:'m-minegocio',tipo:'pagina',tam:'l',cfg:{doc:'d-minegocio',crear:'minegocio'}},
      {id:'m-miequipo',tipo:'pagina',tam:'m',cfg:{doc:'d-miequipo',crear:'miequipo'}},
      {id:'m-actividad',tipo:'actividad',tam:'s',cfg:{}}
    ]);
    E.guardarTablero('sala',[
      {id:'m-aviso',tipo:'avisos',tam:'l',cfg:{texto:'Meta del mes: 60 notas de venta. Cada nota descuenta del inventario al guardarse.'}},
      {id:'m-indicadores',tipo:'indicadores',tam:'l',cfg:{}}
    ],sala('Ventas'));
    E.guardarTablero('sala',[
      {id:'m-inventario',tipo:'inventario',tam:'m',cfg:{}},
      {id:'m-grafica',tipo:'grafica',tam:'m',cfg:{titulo:'Productos por categoría',base:ids.productos,filas:'p-cat',valor:'',periodo:'todo',fecha:''}}
    ],sala('Almacén'));
    E.guardarTablero('sala',[
      {id:'m-vencimientos',tipo:'vencimientos',tam:'m',cfg:{dias:30}},
      {id:'m-grafica',tipo:'grafica',tam:'m',cfg:{titulo:'Gastos del mes por categoría',base:ids.gastos,filas:'g-cat',valor:'g-monto',periodo:'mes',fecha:'g-fecha'}}
    ],sala('Administración'));
    E.guardarTablero('sala',[
      {id:'m-aviso',tipo:'avisos',tam:'l',cfg:{texto:'El aguinaldo se paga a más tardar el 20 de diciembre.'}},
      {id:'m-equipo',tipo:'equipo',tam:'l',cfg:{}}
    ],sala('Recursos humanos'));
    return {ids:ids,docs:docs};
  });
}
AT.ejemplo={armar:armar,NOMBRE:NOMBRE};

/* ---------- ejemplo.html ---------- */
var caja=document.getElementById('ejCaja');
if(!caja)return;
function mostrar(titulo,texto,botones){
  caja.innerHTML='<h1 id="ejT">'+AT.esc(titulo)+'</h1><p>'+texto+'</p>'+(botones?'<p class="ej-bt">'+botones+'</p>':'');
}
var actual=AT.perfil.actual();
if(actual&&actual.ejemplo){location.replace('inicio.html');return}
if(actual){
  mostrar('Ya tienes una empresa aquí','Este navegador ya tiene tu empresa, y la de ejemplo no la va a tocar. Para explorarla sin mezclar nada, abre esta página en una <b>ventana privada</b> (o de incógnito).',
    '<a class="btn pri" href="inicio.html">Ir a tu Inicio</a><a class="btn" href="index.html?conoce">Volver a la bienvenida</a>');
  return;
}
armar().then(function(){location.replace('inicio.html')},function(err){
  mostrar('No se pudo armar el ejemplo',AT.esc(err&&err.message||'Inténtalo otra vez.'),'<a class="btn pri" href="ejemplo.html">Intentar otra vez</a><a class="btn" href="index.html?conoce">Volver a la bienvenida</a>');
});
})();
