/* Laboratorios de la lección «Enrutamiento». Usan AT.ip y AT.red (assets/js/red.js) y la terminal simulada.
   Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio». */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir,IP=AT.ip;

/* ---------- Demo 1: la coincidencia más larga ---------- */
AT.labs['en-tabla']=function(raiz){
  var T=[
    {destino:'0.0.0.0/0',via:'200.1.1.1',iface:'eth0',d:'el proveedor de internet'},
    {destino:'10.0.0.0/8',via:'10.255.0.2',iface:'eth2',d:'la red corporativa'},
    {destino:'10.20.0.0/16',via:'10.255.0.6',iface:'eth2',d:'la sucursal Monterrey'},
    {destino:'10.20.5.0/24',via:'10.255.0.10',iface:'eth3',d:'la bodega de Monterrey'},
    {destino:'192.168.1.0/24',via:null,iface:'eth1',d:'la red de la oficina'}
  ];
  var EJ=['10.20.5.33','10.20.9.1','10.3.0.7','192.168.1.40','8.8.8.8'],inp=$('#etIp',raiz);
  $('#etChips',raiz).innerHTML=EJ.map(function(ip){return '<button class="chip" type="button" data-v="'+ip+'" aria-pressed="'+(ip===inp.value)+'">'+ip+'</button>'}).join('');
  function pintar(){
    var ip=inp.value.trim(),ok=IP.num(ip)!==null,st=$('#etStat',raiz);
    inp.setAttribute('aria-invalid',ok?'false':'true');
    AT.setPressed($('#etChips',raiz),function(b){return b.getAttribute('data-v')===ip});
    var m=ok?AT.red.coincidencia(T,ip):null;
    $('#etFilas',raiz).innerHTML=T.map(function(r){
      var k=r.destino.split('/'),co=ok&&IP.enRed(ip,k[0],+k[1]);
      return '<tr class="'+(r===m?'usada':co?'coincide':'')+'"><td><code>'+r.destino+'</code></td><td>'+(r.via?'<code>'+r.via+'</code> por '+r.iface:'(conectada, '+r.iface+')')+'</td><td>'+(r===m?'Sí, la más larga: /'+k[1]:co?'Sí, /'+k[1]:'No')+'</td></tr>';
    }).join('');
    if(!ok){st.setAttribute('data-k','warn');$('#etMsg',raiz).textContent='Escribe una dirección IPv4, como 10.20.5.33.';return}
    var n=T.filter(function(r){var k=r.destino.split('/');return IP.enRed(ip,k[0],+k[1])}).length;
    st.setAttribute('data-k','good');
    $('#etMsg',raiz).textContent=(n>1?'Coinciden '+n+' filas; gana '+m.destino+' porque es la más específica. ':'Solo coincide '+m.destino+'. ')+
      (m.via?'El paquete va a '+m.via+', hacia '+m.d+'.':'Está en '+m.d+': se entrega directo por '+m.iface+'.')+
      (m.destino==='0.0.0.0/0'?' Es la ruta por defecto: ninguna otra coincidió.':'');
  }
  elegir('#etChips',function(v){inp.value=v;pintar()});
  inp.addEventListener('input',pintar);
  pintar();
};

/* ---------- Demo 2: tres sucursales, estáticas contra OSPF ---------- */
AT.labs['en-sim']=function(raiz){
  var topo={ancho:640,alto:320,nodos:[
    {id:'pcA',tipo:'pc',nombre:'PC Guadalajara',x:70,y:60,ifaces:[{n:'eth0',ip:'10.0.10.10',bits:24}],rutas:[{destino:'0.0.0.0/0',via:'10.0.10.1'}]},
    {id:'R1',tipo:'router',nombre:'R1 Guadalajara',x:200,y:60,ifaces:[{n:'g0',ip:'10.0.10.1',bits:24},{n:'g1',ip:'10.255.12.1',bits:30},{n:'g2',ip:'10.255.13.1',bits:30}],
      rutas:[{destino:'10.0.20.0/24',via:'10.255.12.2'},{destino:'10.0.30.0/24',via:'10.255.13.2'}]},
    {id:'R2',tipo:'router',nombre:'R2 CDMX',x:440,y:60,ifaces:[{n:'g0',ip:'10.0.20.1',bits:24},{n:'g1',ip:'10.255.12.2',bits:30},{n:'g2',ip:'10.255.23.1',bits:30}],
      rutas:[{destino:'10.0.10.0/24',via:'10.255.12.1'},{destino:'10.0.30.0/24',via:'10.255.23.2'}]},
    {id:'pcB',tipo:'pc',nombre:'PC CDMX',x:570,y:60,ifaces:[{n:'eth0',ip:'10.0.20.10',bits:24}],rutas:[{destino:'0.0.0.0/0',via:'10.0.20.1'}]},
    {id:'R3',tipo:'router',nombre:'R3 Monterrey',x:320,y:210,ifaces:[{n:'g0',ip:'10.0.30.1',bits:24},{n:'g1',ip:'10.255.13.2',bits:30},{n:'g2',ip:'10.255.23.2',bits:30}],
      rutas:[{destino:'10.0.10.0/24',via:'10.255.13.1'},{destino:'10.0.20.0/24',via:'10.255.23.1'}]},
    {id:'srv',tipo:'servidor',nombre:'Servidor Monterrey',x:500,y:240,ifaces:[{n:'eth0',ip:'10.0.30.5',bits:24}],rutas:[{destino:'0.0.0.0/0',via:'10.0.30.1'}]}
  ],enlaces:[
    {id:'a',a:'pcA',ai:'eth0',b:'R1',bi:'g0'},
    {id:'r12',a:'R1',ai:'g1',b:'R2',bi:'g1',etiqueta:'10.255.12.0/30'},
    {id:'r13',a:'R1',ai:'g2',b:'R3',bi:'g1',etiqueta:'10.255.13.0/30'},
    {id:'r23',a:'R2',ai:'g2',b:'R3',bi:'g2',etiqueta:'10.255.23.0/30'},
    {id:'b',a:'R2',ai:'g0',b:'pcB',bi:'eth0'},
    {id:'s',a:'R3',ai:'g0',b:'srv',bi:'eth0'}
  ]};
  var sim=AT.red.crear($('#esMapa',raiz),topo,{titulo:'Diagrama: tres sucursales, Guadalajara, CDMX y Monterrey, cada una con su router, unidos en triángulo'});
  var modo='estatico',dest='10.0.30.5';
  var TIPO={C:'Conectada',S:'Estática',O:'OSPF'};
  function tablaR1(){
    var t=sim.tabla(sim.porId.R1,modo==='ospf'),m=AT.red.coincidencia(t,dest);
    $('#esTabla',raiz).innerHTML=t.map(function(r){return '<tr class="'+(r===m?'usada':'')+'"><td><code>'+r.destino+'</code></td><td>'+(r.via?'<code>'+r.via+'</code>':'(conectada, '+r.iface+')')+'</td><td>'+TIPO[r.tipo]+(r.tipo==='O'?', costo '+r.costo:'')+'</td></tr>'}).join('');
  }
  function enviar(){
    var res=sim.camino('pcA',dest,modo==='ospf'),st=$('#esStat',raiz);
    $('#esPasos',raiz).innerHTML=res.saltos.map(function(s,i){return '<li'+(!res.ok&&i===res.saltos.length-1?' class="mal"':'')+'>'+esc(s.texto)+'</li>'}).join('');
    tablaR1();
    var n=res.saltos.filter(function(s){return s.nodo.tipo==='router'}).length,caido13=!$('#esE13',raiz).checked;
    var m;
    if(res.ok){st.setAttribute('data-k','good');m='El paquete llegó pasando por '+n+' router'+(n===1?'':'es')+'.'+(modo==='ospf'&&n>2?' OSPF encontró otro camino: es más largo, pero funciona.':'')}
    else if(modo==='estatico'&&res.fin==='host'){st.setAttribute('data-k','bad');m='Las rutas estáticas no se enteran de que el enlace se cayó: el router sigue mandando por ahí y el paquete se pierde. Cambia a OSPF.'}
    else{st.setAttribute('data-k','bad');m='No hay ningún camino: '+(modo==='ospf'?'ni OSPF puede llegar si todos los enlaces hacia allá están caídos.':'el paquete se pierde.')}
    if(res.ok&&modo==='estatico'&&caido13&&dest==='10.0.20.10')m+=' Hacia CDMX no hacía falta el enlace R1 – R3.';
    $('#esMsg',raiz).textContent=m;
    sim.mostrar(res);
  }
  elegir('#esModo',function(v){modo=v;enviar()});
  elegir('#esDest',function(v){dest=v;enviar()});
  raiz.querySelectorAll('.en-enl input').forEach(function(c){c.addEventListener('change',function(){sim.enlace(c.getAttribute('data-enlace'),c.checked);enviar()})});
  $('#esEnviar',raiz).addEventListener('click',enviar);
  enviar();
};

/* ---------- Demo 3: una ruta estática en Linux ---------- */
AT.labs['en-terminal']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'en-terminal',
    sugerencias:['ip route','ip route get 10.0.30.5','ping -c 2 10.0.30.5'],
    preparar:function(s){
      s.red.vecinos['192.168.1.254']='00:1b:21:3c:4d:5e';
      s.red.detras['192.168.1.254']=['10.0.30.0/24'];
      AT.terminal.util.instalar(s,'traceroute');
    },
    tareas:[
      {id:'tabla',texto:'Mira la tabla de rutas de tu PC.',pista:'`ip route`. Hay dos filas: la ruta por defecto (hacia 192.168.1.1) y tu red conectada.',
       ok:function(s,u){return u.uso('ip',/^(r|ro|route)\b/)&&/default via 192\.168\.1\.1/.test(u.salida)}},
      {id:'falla',texto:'Intenta llegar al servidor de la oficina, 10.0.30.5.',pista:'`ping -c 2 10.0.30.5`. Se pierden todos los paquetes.',
       ok:function(s,u){return u.uso('ping',/10\.0\.30\.5/)&&u.codigo!==0}},
      {id:'get',texto:'Averigua qué ruta usa tu PC para llegar a 10.0.30.5.',pista:'`ip route get 10.0.30.5`. Va por 192.168.1.1, el router de internet, que no conoce esa red privada.',
       ok:function(s,u){return u.uso('ip',/get/)&&/10\.0\.30\.5 via 192\.168\.1\.1/.test(u.salida)}},
      {id:'add',texto:'Agrega una ruta: la red 10.0.30.0/24 se alcanza por 192.168.1.254.',pista:'`sudo ip route add 10.0.30.0/24 via 192.168.1.254`.',
       ok:function(s){return s.red.rutas.some(function(r){return r.destino==='10.0.30.0/24'&&r.via==='192.168.1.254'})}},
      {id:'ok',texto:'Vuelve a probar la conexión con el servidor.',pista:'`ping -c 2 10.0.30.5`. Ahora sí responde. Comprueba con `ip route get 10.0.30.5` que va por 192.168.1.254.',
       ok:function(s,u){return u.uso('ping',/10\.0\.30\.5/)&&u.codigo===0}},
      {id:'traza',texto:'Mira los routers del camino hacia el servidor.',pista:'`traceroute 10.0.30.5` (o `tracepath`). El primer salto es 192.168.1.254 y el segundo, el servidor.',
       ok:function(s,u){return (u.uso('traceroute')||u.uso('tracepath'))&&/192\.168\.1\.254/.test(u.salida)}}
    ]
  });
};
})();
