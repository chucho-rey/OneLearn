/* Laboratorios de la lección «Modelo OSI y TCP/IP». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en modelo-osi.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,fmt=AT.fmt;

/* ---------- Demo 1: encapsulamiento paso a paso ---------- */
AT.labs['os-encap']=function(raiz){
  /* Capas del paquete, de afuera hacia adentro: [clase, título, detalle, bytes] */
  var DATOS=['ap','HTTP','GET /index.html · Host: example.com',120];
  var TCP=['tr','TCP','puerto 51514 → 80 · secuencia 1',20];
  function ip(ttl){return ['rd','IP','192.168.1.50 → 203.0.113.10 · TTL '+ttl,20]}
  function eth(o,d){return ['en','Ethernet',o+' → '+d,18]}
  var PC='MAC de tu PC',RT='MAC del router',RT2='MAC de salida del router',SIG='MAC del siguiente router';
  var PASOS=[
    {d:'Tu PC',c:[DATOS],m:'Capa 7, aplicación: el navegador escribe la petición HTTP. Por ahora son solo datos.'},
    {d:'Tu PC',c:[TCP,DATOS],m:'Capa 4, transporte: TCP agrega los puertos. El 80 dice que va al servidor web; el 51514 lo eligió tu PC para recibir la respuesta.'},
    {d:'Tu PC',c:[ip(64),TCP,DATOS],m:'Capa 3, red: IP agrega quién lo manda y a quién va. Estas direcciones no cambiarán en todo el viaje.'},
    {d:'Tu PC',c:[eth(PC,RT),ip(64),TCP,DATOS],m:'Capa 2, enlace: Ethernet agrega las MAC. El destino no es el servidor, sino el router: es el primer salto dentro de tu red local.'},
    {d:'Por el cable',c:[['fi','Bits','01000101 00000000 01011010…',0],eth(PC,RT),ip(64),TCP,DATOS],m:'Capa 1, física: todo se convierte en señales eléctricas (o de radio, si usas Wi-Fi) y sale por la tarjeta de red.'},
    {d:'En el router',c:[ip(64),TCP,DATOS],m:'El router quita la trama Ethernet (era solo para tu red local), lee la IP de destino y busca en su tabla por dónde mandarlo.'},
    {d:'Saliendo del router',c:[eth(RT2,SIG),ip(63),TCP,DATOS],m:'El router baja el TTL de 64 a 63 y pone una trama nueva con otras MAC: las de su enlace con el siguiente router. La IP sigue igual.'},
    {d:'En el servidor',c:[ip(57),TCP,DATOS],m:'Tras varios saltos llega al servidor. Su tarjeta lee y quita la trama: la MAC de destino era la suya.'},
    {d:'En el servidor',c:[TCP,DATOS],m:'Capa 3: la IP de destino es la del servidor, así que entrega el contenido a la capa de transporte.'},
    {d:'En el servidor',c:[DATOS],m:'Capa 4: TCP ve el puerto 80 y entrega los datos al programa que escucha ahí: el servidor web.'},
    {d:'En el servidor',c:[DATOS],m:'Capa 7: el servidor web lee «GET /index.html» y prepara la respuesta, que hará el mismo viaje de regreso.',fin:true}
  ];
  var i=0;
  function pintar(){
    var p=PASOS[i],tot=p.c.reduce(function(a,c){return a+c[3]},0),extra=tot-120;
    $('#oePq',raiz).innerHTML=p.c.map(function(c){return '<div class="oe-c oe-'+c[0]+'"><b>'+esc(c[1])+'</b><span>'+esc(c[2])+'</span></div>'}).join('');
    $('#oeMsg',raiz).textContent=p.m;
    $('#oeStat',raiz).setAttribute('data-k',p.fin?'good':'');
    $('#oeDonde',raiz).textContent=p.d;
    $('#oeTam',raiz).textContent=p.c[0][0]==='fi'?fmt(tot*8)+' bits':tot+' bytes';
    $('#oeExtra',raiz).textContent=extra?'+'+extra+' bytes ('+fmt(extra/tot*100)+' %)':'Ninguno';
    $('#oePaso',raiz).textContent='Paso '+(i+1)+' de '+PASOS.length;
    $('#oeAnt',raiz).setAttribute('aria-disabled',i===0?'true':'false');
    $('#oeSig',raiz).setAttribute('aria-disabled',i===PASOS.length-1?'true':'false');
  }
  $('#oeSig',raiz).addEventListener('click',function(){if(i<PASOS.length-1){i++;pintar()}});
  $('#oeAnt',raiz).addEventListener('click',function(){if(i>0){i--;pintar()}});
  pintar();
};

/* ---------- Demo 2: ¿en qué capa está? ---------- */
AT.labs['os-capa']=function(raiz){
  var ITEMS=[['El cable de red',1,'Lleva señales eléctricas: capa física.'],['Una dirección MAC',2,'Identifica la tarjeta dentro de la red local: capa de enlace.'],
    ['Una dirección IP',3,'Sirve para llegar de una red a otra: capa de red.'],['Un switch',2,'Reparte por MAC dentro de la red local.'],['Un router',3,'Elige el camino entre redes leyendo la IP.'],
    ['El puerto 443',4,'Los puertos son de la capa de transporte.'],['TCP',4,'Transporte confiable: confirma y reenvía lo perdido.'],['HTTP',7,'El idioma del navegador y el servidor web: aplicación.'],
    ['La señal Wi-Fi',1,'La onda de radio es capa física; las reglas de Wi-Fi para entregar tramas son capa 2.'],['ping (ICMP)',3,'ICMP viaja directo sobre IP, sin puertos.'],
    ['DNS',7,'Un servicio de aplicación que traduce nombres a direcciones.'],['Comprimir una foto en JPEG',6,'Formato y compresión: capa de presentación.']];
  var resp={};
  function pintar(){
    $('#ocLista',raiz).innerHTML=ITEMS.map(function(it,k){
      var r=resp[k];
      return '<li class="oc-i'+(r==null?'':r===it[1]?' ok':' mal')+'"><span class="oc-t">'+esc(it[0])+'</span><div class="seg oc-s" role="group" aria-label="Capa de '+esc(it[0])+'">'+
        [1,2,3,4,5,6,7].map(function(n){return '<button type="button" data-k="'+k+'" data-v="'+n+'" aria-pressed="'+(r===n)+'"'+(r!=null?' aria-disabled="true"':'')+'>'+n+'</button>'}).join('')+'</div>'+
        (r!=null?'<p class="oc-e">'+(r===it[1]?'Correcto. ':'Es la capa '+it[1]+'. ')+esc(it[2])+'</p>':'')+'</li>';
    }).join('');
    var n=Object.keys(resp).length,ok=Object.keys(resp).filter(function(k){return resp[k]===ITEMS[k][1]}).length;
    $('#ocPunt',raiz).textContent=n<ITEMS.length?'Llevas '+ok+' de '+n+' bien.':'Resultado: '+ok+' de '+ITEMS.length+'. '+(ok>=10?'¡Muy bien!':'Revisa la tabla de las capas y vuelve a intentarlo.');
  }
  $('#ocLista',raiz).addEventListener('click',function(e){
    var b=e.target.closest('button[data-k]');if(!b||b.getAttribute('aria-disabled')==='true')return;
    var k=+b.getAttribute('data-k');resp[k]=+b.getAttribute('data-v');pintar();
    var sig=$('#ocLista button[data-k="'+(k+1)+'"]',raiz)||$('#ocOtra',raiz);sig.focus();
  });
  $('#ocOtra',raiz).addEventListener('click',function(){resp={};pintar()});
  pintar();
};
})();
