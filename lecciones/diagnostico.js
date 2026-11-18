/* Laboratorios de la lección «Diagnóstico de red». El segundo usa la terminal simulada: cada escenario la vuelve
   a crear con una falla distinta. Cada laboratorio se registra en AT.labs con el nombre de su bloque. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: ¿dónde está la falla? ---------- */
AT.labs['dg-pistas']=function(raiz){
  var OPS=[['cable','Cable o tarjeta'],['dhcp','Dirección IP (DHCP)'],['ruta','Puerta de enlace o ruta'],['dns','DNS'],['servicio','El servicio o el firewall']];
  var Q=[
    ['La laptop dice «Sin conexión».','$ ip link show enp0s3\n2: enp0s3: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500\n    state DOWN mode DEFAULT','cable','NO-CARRIER y state DOWN: no hay señal en el cable. Revisa que esté conectado, o prueba otro cable o puerto.'],
    ['Nada abre, ni por nombre ni por IP.','$ ip -br a\nlo        UNKNOWN   127.0.0.1/8\nenp0s3    UP        169.254.71.20/16','dhcp','El enlace está arriba, pero la dirección es 169.254: el DHCP no respondió. Revisa el router.'],
    ['Las páginas no abren.','$ ping -c 2 1.1.1.1\nping: connect: Network is unreachable\n$ ip route\n192.168.1.0/24 dev enp0s3 proto kernel scope link src 192.168.1.50','ruta','No hay ruta por defecto: la computadora no sabe a dónde mandar lo que no es de su red.'],
    ['Las páginas no abren, pero WhatsApp sí funciona.','$ ping -c 1 1.1.1.1\n64 bytes from 1.1.1.1: icmp_seq=1 ttl=56 time=18.9 ms\n$ ping -c 1 example.com\nping: example.com: Temporary failure in name resolution','dns','Por IP sí hay internet; lo que falla es traducir nombres. Revisa el DNS.'],
    ['La página de la intranet no abre.','$ ping -c 1 intranet\n64 bytes from intranet (192.168.1.10): icmp_seq=1 ttl=64 time=0.8 ms\n$ curl http://intranet\ncurl: (7) Failed to connect to intranet port 80: Couldn\'t connect to server','servicio','El servidor responde al ping, pero nadie escucha en el puerto 80: el servidor web está apagado.'],
    ['No hay internet desde que alguien «configuró» la IP fija.','$ ip route\ndefault via 192.168.1.100 dev enp0s3 proto static\n$ ping -c 1 192.168.1.100\nFrom 192.168.1.50 icmp_seq=1 Destination Host Unreachable','ruta','La puerta de enlace es 192.168.1.100, pero ahí no hay nadie. Debería ser la IP del router.'],
    ['La aplicación no se conecta a la base de datos.','$ ping -c 1 db\n64 bytes from db (10.0.2.15): icmp_seq=1 ttl=64 time=0.6 ms\n$ nc -zv db 5432\nnc: connect to db port 5432 (tcp) failed: Connection timed out','servicio','El servidor responde, pero el puerto no contesta nada (timeout): un firewall descarta esas conexiones.'],
    ['La tienda en línea muestra un error.','$ curl -I https://tienda.example\nHTTP/2 502\nserver: nginx','servicio','nginx funciona, pero la aplicación a la que le pasa las peticiones no contesta.']
  ];
  var i=0,resp=null,bien=0;
  function pintar(){
    var q=Q[i],st=$('#dpStat',raiz);
    $('#dpQ',raiz).textContent=(i+1)+' de '+Q.length+'. '+q[0];
    $('#dpPre',raiz).textContent=q[1];
    $('#dpOps',raiz).innerHTML=OPS.map(function(o){return '<button class="chip" type="button" data-v="'+o[0]+'" aria-pressed="'+(resp===o[0])+'"'+(resp!=null?' aria-disabled="true"':'')+'>'+esc(o[1])+'</button>'}).join('');
    var nom=OPS.filter(function(o){return o[0]===q[2]})[0][1];
    if(resp==null){st.setAttribute('data-k','');$('#dpMsg',raiz).textContent='Elige una opción.'}
    else{st.setAttribute('data-k',resp===q[2]?'good':'bad');$('#dpMsg',raiz).textContent=(resp===q[2]?'¡Correcto! ':'No: es «'+nom+'». ')+q[3]}
    $('#dpPunt',raiz).textContent=bien+' de '+(i+(resp!=null?1:0))+' bien';
    $('#dpSig',raiz).textContent=i===Q.length-1&&resp!=null?'Empezar de nuevo':'Siguiente caso';
    $('#dpSig',raiz).setAttribute('aria-disabled',resp==null?'true':'false');
  }
  $('#dpOps',raiz).addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b||resp!=null)return;
    resp=b.getAttribute('data-v');if(resp===Q[i][2])bien++;pintar();$('#dpSig',raiz).focus();
  });
  $('#dpSig',raiz).addEventListener('click',function(){
    if(resp==null)return;
    if(i===Q.length-1){i=0;bien=0}else i++;
    resp=null;pintar();
  });
  pintar();
};

/* ---------- Demo 2: cinco fallas en la terminal ---------- */
AT.labs['dg-terminal']=function(raiz){
  var U=AT.terminal.util;
  /* Detiene un servicio como si se hubiera caído hace 47 minutos */
  function caido(s,v){s.detener(v);var f=new Date(Date.now()-47*60e3);v.desde=f;s.diario.slice(-3).forEach(function(l){l.f=f})}
  function hayWeb(s){var w=s.mundo.porIp('192.168.1.10');return !!(w&&w.servicios.nginx&&w.servicios.nginx.activo)}
  var E={
    cable:{n:'Sin conexión',d:'La computadora no tiene internet ni red local. Empieza por la capa más baja.',
      preparar:function(s){s.red.arriba=false},
      tareas:[
        {id:'link',texto:'Revisa el estado de la tarjeta de red.',pista:'`ip link`. Dice `state DOWN`: la tarjeta está apagada.',
         ok:function(s,u){return u.uso('ip',/^(l|link)\b/)&&/state DOWN/.test(u.salida)}},
        {id:'up',texto:'Enciende la tarjeta de red.',pista:'`sudo ip link set enp0s3 up`.',ok:function(s){return s.red.arriba}},
        {id:'ping',texto:'Comprueba que ya hay internet.',pista:'`ping -c 2 example.com`.',ok:function(s,u){return u.uso('ping',/example\.com/)&&u.codigo===0}}
      ]},
    ruta:{n:'Sin ruta',d:'ping 1.1.1.1 responde «La red es inaccesible» (Network is unreachable), aunque la tarjeta está bien y tiene IP.',
      preparar:function(s){s.red.puerta=null},
      tareas:[
        {id:'ver',texto:'Mira la tabla de rutas. ¿Qué falta?',pista:'`ip route`. Solo está la red local: falta la ruta por defecto.',
         ok:function(s,u){return u.uso('ip',/^(r|ro|route)$/)&&u.codigo===0&&!/default/.test(u.salida)}},
        {id:'add',texto:'Agrega la ruta por defecto hacia el router, 192.168.1.1.',pista:'`sudo ip route add default via 192.168.1.1`.',ok:function(s){return s.red.puerta==='192.168.1.1'}},
        {id:'ping',texto:'Comprueba que ya hay internet.',pista:'`ping -c 2 example.com`.',ok:function(s,u){return u.uso('ping',/example\.com/)&&u.codigo===0}}
      ]},
    gw:{n:'Puerta de enlace equivocada',d:'Alguien configuró la red a mano y desde entonces no hay internet.',
      preparar:function(s){s.red.puerta='192.168.1.100';s.red.dhcp=false},
      tareas:[
        {id:'ver',texto:'Mira a qué router apunta la ruta por defecto y prueba si responde.',pista:'`ip route` y luego `ping -c 2 192.168.1.100`: «Destination Host Unreachable», ahí no hay nadie.',
         ok:function(s,u){return u.uso('ping',/192\.168\.1\.100/)&&/Destination Host Unreachable/.test(u.salida)}},
        {id:'fix',texto:'Cambia la ruta por defecto para que apunte al router real, 192.168.1.1.',pista:'`sudo ip route replace default via 192.168.1.1`.',ok:function(s){return s.red.puerta==='192.168.1.1'}},
        {id:'ping',texto:'Comprueba que ya hay internet.',pista:'`ping -c 2 example.com`.',ok:function(s,u){return u.uso('ping',/example\.com/)&&u.codigo===0}}
      ]},
    dns:{n:'Los nombres no funcionan',d:'ping example.com dice «Fallo temporal en la resolución del nombre» (Temporary failure in name resolution).',
      preparar:function(s){caido(s,s.servicio('systemd-resolved'))},
      tareas:[
        {id:'ip',texto:'Comprueba si hay internet usando una IP, sin nombres.',pista:'`ping -c 2 1.1.1.1`. Funciona: la red está bien, el problema es el DNS.',
         ok:function(s,u){return u.uso('ping',/1\.1\.1\.1/)&&u.codigo===0}},
        {id:'start',texto:'Revisa el servicio que resuelve los nombres y arráncalo.',pista:'`systemctl status systemd-resolved` dice inactive. Arráncalo con `sudo systemctl start systemd-resolved`.',
         ok:function(s){return s.servicio('systemd-resolved').activo}},
        {id:'ping',texto:'Comprueba que ya funcionan los nombres.',pista:'`ping -c 2 example.com`.',ok:function(s,u){return u.uso('ping',/example\.com/)&&u.codigo===0}}
      ]},
    web:{n:'La página no abre',d:'La página del servidor «web» (192.168.1.10) no abre. La contraseña de ana en el servidor es servidor123.',
      remotos:[{op:{host:'web',usuario:'ana',contrasena:'servidor123',red:{ip:'192.168.1.10',mac:'52:54:00:7a:21:9c'}},
        preparar:function(rs){U.instalar(rs,'nginx');caido(rs,rs.servicios.nginx)}}],
      tareas:[
        {id:'nc',texto:'Comprueba si el puerto 80 del servidor acepta conexiones.',pista:'`nc -zv web 80`. «Connection refused»: el equipo responde, pero el servidor web no.',
         ok:function(s,u){return u.uso('nc',/web/)&&/Connection refused/.test(u.salida)}},
        {id:'start',texto:'Entra al servidor y arranca nginx.',pista:'`ssh web`, luego `systemctl status nginx` (inactive) y `sudo systemctl start nginx`.',ok:function(s){return hayWeb(s)}},
        {id:'curl',texto:'Sal del servidor y comprueba desde tu PC que la página ya abre.',pista:'`exit` y luego `curl http://web`.',
         ok:function(s,u,t){return t.sis.host==='ubuntu'&&u.uso('curl',/web/)&&/Welcome to nginx/.test(u.salida)}}
      ]}
  };
  var esc0='cable';
  $('#dgEsc',raiz).innerHTML=Object.keys(E).map(function(k){return '<button class="chip" type="button" data-v="'+k+'" aria-pressed="'+(k===esc0)+'">'+esc(E[k].n)+'</button>'}).join('');
  function abrir(k){
    var e=E[k];
    $('#dgDesc',raiz).textContent=e.d;
    AT.terminal($('.term-host',raiz),{clave:'dg-'+k,preparar:e.preparar,remotos:e.remotos,tareas:e.tareas,
      sugerencias:k==='web'?['nc -zv web 80','ssh web']:['ip link','ip route','ping -c 2 example.com']});
  }
  elegir('#dgEsc',function(v){abrir(v)});
  abrir(esc0);
};
})();
