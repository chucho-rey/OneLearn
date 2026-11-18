/* Laboratorios de la lección «Ethernet, MAC y switches». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en ethernet.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: lee una MAC ---------- */
AT.labs['et-mac']=function(raiz){
  var OUI={'08:00:27':'Oracle VirtualBox (máquina virtual)','b8:27:eb':'Raspberry Pi Foundation','dc:a6:32':'Raspberry Pi Trading','00:50:56':'VMware (máquina virtual)','52:54:00':'QEMU/KVM (máquina virtual)',
    '3c:52:82':'Hewlett Packard','f0:18:98':'Apple','00:1a:11':'Google','c8:3a:35':'Tenda (router)','00:0c:29':'VMware (máquina virtual)','01:00:5e':'Multicast de IPv4','ff:ff:ff':'Difusión'};
  var inp=$('#emIn',raiz);
  function pintar(){
    var v=inp.value.trim().toLowerCase().replace(/-/g,':'),ok=/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(v),st=$('#emStat',raiz);
    inp.setAttribute('aria-invalid',ok||v.length<17?'false':'true');
    AT.setPressed($('#emEj',raiz),function(b){return b.getAttribute('data-v')===v});
    if(!ok){['#emOui','#emBin','#emDest','#emAsig'].forEach(function(s){$(s,raiz).textContent='—'});st.setAttribute('data-k','warn');$('#emMsg',raiz).textContent='Una MAC son 6 pares de dígitos hexadecimales (0-9 y a-f) separados por dos puntos.';return}
    var b0=parseInt(v.slice(0,2),16),grupo=b0&1,local=b0&2,difu=v==='ff:ff:ff:ff:ff:ff';
    $('#emOui',raiz).textContent=OUI[v.slice(0,8)]||(local?'Ninguno: es una dirección local':'Desconocido en esta lista');
    $('#emBin',raiz).innerHTML=('00000000'+b0.toString(2)).slice(-8).split('').map(function(d,i){return i===6||i===7?'<u>'+d+'</u>':d}).join('');
    $('#emDest',raiz).textContent=difu?'Todos (difusión)':grupo?'Un grupo (multicast)':'Un solo equipo (unicast)';
    $('#emAsig',raiz).textContent=local?'El sistema (local)':'El fabricante (universal)';
    st.setAttribute('data-k',difu||grupo?'warn':'good');
    $('#emMsg',raiz).textContent=difu?'Una trama a ff:ff:ff:ff:ff:ff la reciben todos los equipos de la red local: así preguntan ARP y DHCP.':
      grupo?'El último bit del primer byte vale 1: es para un grupo de equipos. Los switches la reparten como si fuera difusión, salvo que sepan quién está en el grupo.':
      local?'El penúltimo bit vale 1: la MAC no viene de fábrica. Así se ven las MAC aleatorias de los celulares y las de algunas máquinas virtuales.':
      'Una MAC normal de fábrica: el fabricante la asigna y en teoría es única en el mundo.';
  }
  inp.addEventListener('input',pintar);
  elegir('#emEj',function(v){inp.value=v;pintar()});
  pintar();
};

/* ---------- Demo 2: la tabla del switch ---------- */
AT.labs['et-switch']=function(raiz){
  var PCS=[{n:'A',mac:'aa:aa:aa:00:00:0a'},{n:'B',mac:'bb:bb:bb:00:00:0b'},{n:'C',mac:'cc:cc:cc:00:00:0c'},{n:'D',mac:'dd:dd:dd:00:00:0d'}];
  var de=0,a='2',tabla=[],recibe=[];
  function pintarPcs(){
    $('#esPcs',raiz).innerHTML=PCS.map(function(p,i){
      var r=recibe.indexOf(i)>=0,esDestino=a==='todos'||+a===i;
      return '<div class="es-pc'+(i===de?' de':'')+(r?' rec':'')+'"><b>PC '+p.n+'</b><span class="mono">'+p.mac+'</span><span>Puerto '+(i+1)+'</span><em>'+(i===de?'Manda':r?(esDestino?'Recibe (es para ella)':'Recibe (la ignora)'):'—')+'</em></div>';
    }).join('');
    $('#esTabla',raiz).innerHTML=tabla.length?tabla.map(function(t){return '<tr><td class="mono">'+t.mac+'</td><td>'+t.p+'</td></tr>'}).join(''):'<tr><td colspan="2">Vacía: el switch todavía no sabe dónde está nadie.</td></tr>';
  }
  function enviar(){
    var hub=$('#esHub',raiz).checked,d=a==='todos'?null:+a,st=$('#esStat',raiz),m;
    if(d===de){st.setAttribute('data-k','warn');$('#esMsg',raiz).textContent='Elige un destino distinto de quien manda.';return}
    if(!hub&&!tabla.some(function(t){return t.mac===PCS[de].mac}))tabla.push({mac:PCS[de].mac,p:de+1});
    var conocida=d!==null&&tabla.filter(function(t){return t.mac===PCS[d].mac})[0];
    if(hub){recibe=[0,1,2,3].filter(function(i){return i!==de});m='Un hub repite todo por todos los puertos: las '+recibe.length+' computadoras reciben la trama, aunque solo era para '+(d===null?'todas':'PC '+PCS[d].n)+'. Por eso los hubs ya no se usan.';st.setAttribute('data-k','warn')}
    else if(d===null){recibe=[0,1,2,3].filter(function(i){return i!==de});m='Es una trama de difusión (ff:ff:ff:ff:ff:ff): el switch la manda por todos los puertos. El switch anotó que PC '+PCS[de].n+' está en el puerto '+(de+1)+'.';st.setAttribute('data-k','')}
    else if(conocida){recibe=[d];m='El switch ya sabía que PC '+PCS[d].n+' está en el puerto '+conocida.p+': la entrega solo ahí. Las demás ni se enteran.';st.setAttribute('data-k','good')}
    else{recibe=[0,1,2,3].filter(function(i){return i!==de});m='El switch no sabe dónde está PC '+PCS[d].n+': inunda la trama por todos los puertos. Anotó que PC '+PCS[de].n+' está en el puerto '+(de+1)+'. Cuando '+PCS[d].n+' conteste, también la aprenderá.';st.setAttribute('data-k','warn')}
    $('#esMsg',raiz).textContent=m;
    pintarPcs();
  }
  elegir('#esDe',function(v){de=+v;recibe=[];pintarPcs()});
  elegir('#esA',function(v){a=v;recibe=[];pintarPcs()});
  $('#esEnviar',raiz).addEventListener('click',enviar);
  $('#esBorrar',raiz).addEventListener('click',function(){tabla=[];recibe=[];pintarPcs();$('#esStat',raiz).setAttribute('data-k','');$('#esMsg',raiz).textContent='La tabla quedó vacía, como al encender el switch.'});
  $('#esHub',raiz).addEventListener('change',function(){recibe=[];pintarPcs();$('#esMsg',raiz).textContent=this.checked?'Ahora es un hub: no aprende nada, solo repite.':'De nuevo es un switch.'});
  pintarPcs();
  $('#esMsg',raiz).textContent='La tabla está vacía. Manda una trama de A a C y mira qué pasa.';
};

/* ---------- Demo 3: la MAC de tus vecinos ---------- */
AT.terminal.comando('ethtool',{d:'muestra la velocidad y el modo de una tarjeta de red',uso:'ethtool tarjeta',cat:'Red',sbin:true},function(x){
  var r=x.sis.red,n=x.args[1];
  if(!n){x.err('ethtool: bad command line argument(s)\nFor more information run ethtool -h\n');return 1}
  if(n!==r.iface){x.err('netlink error: no device matches name ('+n+')\n');return 1}
  x.out('Settings for '+n+':\n\tSupported ports: [ TP ]\n\tSupported link modes:   10baseT/Half 10baseT/Full\n\t                        100baseT/Half 100baseT/Full\n\t                        1000baseT/Full\n\tSpeed: '+(r.arriba?'1000Mb/s':'Unknown!')+'\n\tDuplex: '+(r.arriba?'Full':'Unknown! (255)')+'\n\tAuto-negotiation: on\n\tPort: Twisted Pair\n\tLink detected: '+(r.arriba?'yes':'no')+'\n');
});
AT.labs['et-arp']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'et-arp',
    red:{vecinos:{'192.168.1.1':'c8:3a:35:1b:92:e0','192.168.1.20':'3c:52:82:4f:aa:10','192.168.1.30':'b8:27:eb:12:9a:04'}},
    sugerencias:['ip link','ip neigh','ethtool enp0s3'],
    tareas:[
      {id:'mac',texto:'Averigua la MAC de la tarjeta `enp0s3` de esta computadora.',pista:'`ip link`. La MAC está en la línea `link/ether`.',
       ok:function(s,u){return u.uso('ip',/^(-br\s+)?(l|link)\b/)&&/08:00:27:3a:5c:91/.test(u.salida)}},
      {id:'velocidad',texto:'Revisa a qué velocidad está conectado el cable.',pista:'`ethtool enp0s3`. Fíjate en Speed y Duplex.',
       ok:function(s,u){return u.uso('ethtool')&&/1000Mb\/s/.test(u.salida)}},
      {id:'tabla',texto:'Mira la tabla ARP: ¿a quién conoce ya esta computadora?',pista:'`ip neigh`. Por ahora solo conoce al router.',
       ok:function(s,u){return u.uso('ip',/^(n|neigh)/)&&/c8:3a:35/.test(u.salida)}},
      {id:'ping',texto:'Habla con la Raspberry Pi de la red (192.168.1.30) con `ping`.',pista:'`ping -c 2 192.168.1.30`. Antes del primer ping, tu PC preguntó su MAC con ARP.',
       ok:function(s,u){return u.uso('ping',/192\.168\.1\.30/)&&u.codigo===0}},
      {id:'aprendio',texto:'Vuelve a mirar la tabla ARP: ahora debe aparecer la Raspberry Pi con su MAC.',pista:'`ip neigh` otra vez. Su MAC empieza con b8:27:eb, el OUI de Raspberry Pi.',
       ok:function(s,u){return u.uso('ip',/^(n|neigh)/)&&/b8:27:eb/.test(u.salida)}},
      {id:'inexistente',texto:'Haz ping a un equipo que no existe en tu red, como 192.168.1.99.',pista:'`ping -c 2 192.168.1.99`. Nadie contesta a la pregunta de ARP, así que tu PC dice «Destination Host Unreachable».',
       ok:function(s,u){return u.uso('ping',/192\.168\.1\.99/)&&/Unreachable/.test(u.salida)}}
    ]
  });
};
})();
