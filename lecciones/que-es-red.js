/* Laboratorios de la lección «Qué es una red». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en que-es-red.html).
   El diagrama usa el simulador de red (assets/js/red.js) y la práctica, la terminal simulada (assets/js/terminal.js). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,fmt=AT.fmt,elegir=AT.elegir;

/* ---------- Demo 1: la red de una casa ---------- */
AT.labs['qr-casa']=function(raiz){
  var EQ={
    internet:{n:'Internet',tipo:'nube',x:60,y:60,d:'La red de redes. Llega a tu casa por el cable del proveedor.',f:''},
    ont:{n:'Módem / ONT',tipo:'switch',x:180,y:60,d:'Traduce la señal de la fibra (o del cable) a una red Ethernet que entiende el router.',f:'Toda la casa se queda sin internet, pero la red local sigue funcionando: todavía puedes imprimir.'},
    router:{n:'Router',tipo:'router',x:310,y:60,d:'Une tu red con internet, reparte las direcciones IP (DHCP) y protege la entrada con su firewall.',f:'Nadie tiene internet y los equipos dejan de recibir IP. Como el router suele traer el Wi-Fi y el switch, casi todo se cae.'},
    switch:{n:'Switch',tipo:'switch',x:200,y:170,d:'Conecta por cable los equipos de escritorio y entrega cada paquete solo al puerto de su destinatario.',f:'La PC, la impresora y el NAS quedan aislados, del router y entre sí. El Wi-Fi sigue funcionando.'},
    ap:{n:'Punto de acceso',tipo:'router',x:430,y:170,d:'Da la señal Wi-Fi. Une los equipos inalámbricos con la red de cable.',f:'Celulares y laptop pierden la conexión. Los equipos con cable siguen bien.'},
    pc:{n:'PC',tipo:'pc',x:90,y:260,d:'Una computadora de escritorio conectada por cable al switch.',f:'Solo esa computadora queda fuera.'},
    impresora:{n:'Impresora',tipo:'pc',x:200,y:260,d:'Comparte la impresión con todos los equipos de la casa.',f:'Nadie puede imprimir, pero todo lo demás funciona.'},
    nas:{n:'NAS',tipo:'servidor',x:310,y:260,d:'Un pequeño servidor de archivos: guarda fotos y respaldos de toda la familia.',f:'Los archivos compartidos y los respaldos no están disponibles hasta repararlo.'},
    celular:{n:'Celular',tipo:'pc',x:410,y:260,d:'Se conecta por Wi-Fi al punto de acceso.',f:'Solo el celular queda fuera.'},
    laptop:{n:'Laptop',tipo:'pc',x:520,y:260,d:'Se conecta por Wi-Fi al punto de acceso.',f:'Solo la laptop queda fuera.'}
  };
  var LIGAS=[['internet','ont'],['ont','router'],['router','switch'],['router','ap'],['switch','pc'],['switch','impresora'],['switch','nas'],['ap','celular'],['ap','laptop']];
  var FINALES=['pc','impresora','nas','celular','laptop'];
  var topo={ancho:600,alto:300,nodos:Object.keys(EQ).map(function(k){return {id:k,tipo:EQ[k].tipo,nombre:EQ[k].n,x:EQ[k].x,y:EQ[k].y}}),
    enlaces:LIGAS.map(function(l,i){return {id:'e'+i,a:l[0],b:l[1]}})};
  var sim=AT.red.crear($('#qcMapa',raiz),topo,{titulo:'Diagrama de la red de una casa: internet, módem, router, switch, punto de acceso y equipos'});
  var sel='router',falla=false;
  $('#qcEq',raiz).innerHTML=Object.keys(EQ).filter(function(k){return k!=='internet'}).map(function(k){return '<button class="chip" type="button" data-v="'+k+'" aria-pressed="'+(k===sel)+'">'+esc(EQ[k].n)+'</button>'}).join('');
  function conectados(desde,sin){
    var vistos={},cola=[desde];vistos[desde]=1;
    while(cola.length){var n=cola.shift();LIGAS.forEach(function(l){var o=l[0]===n?l[1]:l[1]===n?l[0]:null;if(o&&!vistos[o]&&o!==sin){vistos[o]=1;cola.push(o)}})}
    return vistos;
  }
  function pintar(){
    var e=EQ[sel];
    Object.keys(sim.grupos).forEach(function(k){sim.grupos[k].classList.toggle('activo',k===sel&&!falla);sim.grupos[k].classList.toggle('fallo',k===sel&&falla)});
    $('#qcInfo',raiz).innerHTML='<b>'+esc(e.n)+'</b><p>'+esc(e.d)+'</p>';
    $('#qcFalla',raiz).setAttribute('aria-pressed',falla?'true':'false');
    $('#qcFalla',raiz).textContent=falla?'Repararlo':'Simular que se descompone';
    if(!falla){$('#qcStat',raiz).setAttribute('data-k','');$('#qcMsg',raiz).textContent='Todos los equipos tienen internet.';return}
    var conInternet=conectados('internet',sel);
    var sinInternet=FINALES.filter(function(k){return k!==sel&&!conInternet[k]}),imprimen=conectados('impresora',sel);
    var sinImpresora=FINALES.filter(function(k){return k!==sel&&k!=='impresora'&&!imprimen[k]});
    $('#qcStat',raiz).setAttribute('data-k',sinInternet.length>2?'bad':'warn');
    $('#qcMsg',raiz).textContent=e.f+' Sin internet: '+(sinInternet.length?sinInternet.map(function(k){return EQ[k].n}).join(', '):'nadie más')+'. '+(sel==='impresora'?'':'Sin impresora: '+(sinImpresora.length?sinImpresora.map(function(k){return EQ[k].n}).join(', '):'nadie')+'.');
  }
  elegir('#qcEq',function(v){sel=v;falla=false;pintar()});
  $('#qcFalla',raiz).addEventListener('click',function(){falla=!falla;pintar()});
  pintar();
};

/* ---------- Demo 2: ¿cuánto tarda? ---------- */
AT.labs['qr-tiempo']=function(raiz){
  var CON=[{n:'ADSL',mbps:10,ms:40},{n:'Datos 4G',mbps:40,ms:45},{n:'Fibra',mbps:300,ms:8},{n:'Satélite en órbita baja',mbps:150,ms:35},{n:'Satélite geoestacionario',mbps:50,ms:600}];
  var mb=4;
  function dur(s){return s<1?fmt(s*1000)+' ms':s<120?fmt(s,1)+' s':s<7200?fmt(s/60,1)+' min':fmt(s/3600,1)+' h'}
  /* Una página con 40 archivos: el navegador pide 6 a la vez, así que son unas 7 idas y vueltas, más la conexión inicial */
  function pagina(c){return (c.ms*(3+Math.ceil(40/6)))/1000+(3/(c.mbps/8))}
  function pintar(){
    var t=CON.map(function(c){return mb/(c.mbps/8)}),max=Math.max.apply(null,t);
    $('#qtBarras',raiz).innerHTML=CON.map(function(c,i){return '<div class="br'+(t[i]===Math.min.apply(null,t)?' on':'')+'"><span class="br-l">'+esc(c.n)+' · '+c.mbps+' Mbps</span><span class="br-b" aria-hidden="true"><i style="width:'+Math.max(1,t[i]/max*100)+'%"></i></span><b>'+dur(t[i])+'</b></div>'}).join('');
    $('#qtRapida',raiz).textContent='Fibra · '+dur(t[2]);
    $('#qtFibra',raiz).textContent=dur(pagina(CON[2]));
    $('#qtSat',raiz).textContent=dur(pagina(CON[4]));
    $('#qtMsg',raiz).textContent=mb>=1000?'Para un archivo grande manda el ancho de banda: la fibra lo baja '+fmt(t[0]/t[2])+' veces más rápido que el ADSL.':
      'Con archivos chicos y muchas idas y vueltas manda la latencia: el satélite geoestacionario tiene buen ancho de banda, pero cada pedido viaja 72 000 km de ida y vuelta.';
  }
  elegir('#qtArch',function(v){mb=+v;pintar()});
  pintar();
};

/* ---------- Demo 3: conoce tu red ---------- */
AT.labs['qr-mired']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'qr-mired',
    sugerencias:['ip a','ip route','ping -c 3 192.168.1.1'],
    tareas:[
      {id:'ip',texto:'Averigua la dirección IP de esta computadora.',pista:'`ip a`. Busca la línea `inet` de la tarjeta `enp0s3` (la de `lo` es la propia computadora).',
       ok:function(s,u){return u.uso('ip',/^(-br\s+)?(a|addr|address)\b/)&&/192\.168\.1\.50/.test(u.salida)}},
      {id:'ruta',texto:'Descubre cuál es la puerta de enlace (el router).',pista:'`ip route`. La línea `default via` dice la IP del router.',
       ok:function(s,u){return u.uso('ip',/^(r|route)\b/)&&/default via/.test(u.salida)}},
      {id:'router',texto:'Comprueba que llegas al router con `ping`.',pista:'`ping -c 3 192.168.1.1`. Con -c 3 manda solo tres paquetes.',
       ok:function(s,u){return u.uso('ping',/192\.168\.1\.1(\s|$)/)&&u.codigo===0}},
      {id:'internet',texto:'Comprueba que llegas a internet usando un nombre, no una IP.',pista:'`ping -c 3 example.com`. Si responde, funcionan el router, la salida a internet y el DNS.',
       ok:function(s,u){return u.uso('ping',/[a-z]\.[a-z]/)&&u.codigo===0}},
      {id:'dns',texto:'Averigua qué servidor DNS usa la computadora.',pista:'`resolvectl status`. «Current DNS Server» es a quién le pregunta los nombres.',
       ok:function(s,u){return u.uso('resolvectl')&&/DNS Server/.test(u.salida)}},
      {id:'nombre',texto:'Muestra el nombre del equipo y sus direcciones con `hostname`.',pista:'`hostname` da el nombre; `hostname -I`, las direcciones IP.',
       ok:function(s,u){return u.uso('hostname',/-I/)}},
      {id:'vecinos',texto:'Mira qué equipos conoce en su red y la MAC del router.',pista:'`ip neigh`. Es la tabla ARP: la IP y la dirección física (MAC) de cada vecino con el que ya habló.',
       ok:function(s,u){return u.uso('ip',/^(n|neigh)/)&&/c8:3a:35/.test(u.salida)}}
    ]
  });
};
})();
