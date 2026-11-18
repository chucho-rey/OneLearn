/* Laboratorios de la lección «IPv6 en la práctica». Usan AT.ip (assets/js/red.js) y la terminal simulada.
   Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio». */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir,IP=AT.ip;

/* ---------- Demo 1: abrevia y expande ---------- */
AT.labs['v6-abrevia']=function(raiz){
  var inp=$('#vaIn',raiz),preg=null;
  function pintar(){
    var g=IP.expandir6(inp.value);
    inp.setAttribute('aria-invalid',g?'false':'true');
    $('#vaComp',raiz).textContent=g?g.join(':'):'—';
    $('#vaAbr',raiz).textContent=g?IP.comprimir6(g):'—';
    $('#vaTipo',raiz).textContent=g?IP.tipo6(g.join(':')):'Escribe una dirección IPv6 válida';
  }
  function nueva(){
    var h=function(){return Math.random()<0.5?'0000':('000'+Math.floor(Math.random()*65536).toString(16)).slice(-4)};
    var g=['2001','0db8'].concat([0,0,0,0,0,0].map(h));
    if(Math.random()<0.7){var k=2+Math.floor(Math.random()*3);for(var j=k;j<k+2+Math.floor(Math.random()*2)&&j<7;j++)g[j]='0000'}
    preg=g;$('#vaQ',raiz).textContent=g.join(':');$('#vaResp',raiz).value='';
    $('#vaStat',raiz).setAttribute('data-k','');$('#vaMsg',raiz).textContent='Quita los ceros a la izquierda y cambia por :: la serie de ceros más larga.';
  }
  function revisar(){
    var r=$('#vaResp',raiz).value.trim().toLowerCase(),bien=IP.comprimir6(preg),st=$('#vaStat',raiz);
    if(r===bien){st.setAttribute('data-k','good');$('#vaMsg',raiz).textContent='¡Correcto! '+bien;return}
    var mismo=IP.expandir6(r);
    if(mismo&&mismo.join(':')===preg.join(':')){st.setAttribute('data-k','warn');$('#vaMsg',raiz).textContent='Es la misma dirección, pero no la forma más corta. La correcta es '+bien+'.';return}
    st.setAttribute('data-k','bad');$('#vaMsg',raiz).textContent='No es la misma dirección. La forma abreviada es '+bien+'.';
  }
  inp.addEventListener('input',pintar);
  $('#vaRev',raiz).addEventListener('click',revisar);
  $('#vaOtra',raiz).addEventListener('click',nueva);
  $('#vaResp',raiz).addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();revisar()}});
  pintar();nueva();
};

/* ---------- Demo 2: arma tu dirección (SLAAC) ---------- */
AT.labs['v6-slaac']=function(raiz){
  var pre='2001:db8:4a1:20',mac=$('#vsMac',raiz),aleat='3f9a:1c72:b0e4:58d1';
  function pintar(){
    var priv=$('#vsPriv',raiz).checked,e=IP.eui64(mac.value),st=$('#vsStat',raiz);
    mac.setAttribute('aria-invalid',e||priv?'false':'true');
    if(!e&&!priv){$('#vsPasos',raiz).innerHTML='';$('#vsDir',raiz).textContent='—';st.setAttribute('data-k','warn');$('#vsMsg',raiz).textContent='Escribe una MAC válida, como 08:00:27:3a:5c:91.';return}
    var id=priv?aleat:e.texto,dir=IP.comprimir6(pre+':'+(priv?aleat:e.grupos.join(':')));
    var b=mac.value.toLowerCase().split(/[:-]/);
    $('#vsPasos',raiz).innerHTML=priv?
      '<li>El sistema elige 64 bits al azar: <code>'+aleat+'</code>.</li><li>Los junta con el prefijo del router: <code>'+esc(pre)+'</code>.</li><li>La cambia cada cierto tiempo: así ningún sitio puede seguirte por tu dirección.</li>':
      '<li>La MAC se parte a la mitad: <code>'+esc(b.slice(0,3).join(':'))+'</code> y <code>'+esc(b.slice(3).join(':'))+'</code>.</li>'+
      '<li>En medio se pone <code>ff:fe</code>: <code>'+esc(b.slice(0,3).join(':'))+':ff:fe:'+esc(b.slice(3).join(':'))+'</code>.</li>'+
      '<li>Se invierte el séptimo bit del primer byte: <code>'+esc(b[0])+'</code> se vuelve <code>'+e.invertido+'</code>.</li>'+
      '<li>Se agrupa de 4 en 4 y se pega al prefijo: <code>'+esc(pre)+'</code> + <code>'+e.texto+'</code>.</li>';
    $('#vsDir',raiz).textContent=dir;
    st.setAttribute('data-k',priv?'good':'warn');
    $('#vsMsg',raiz).textContent=(IP.tipo6(dir)||'')+'. '+(priv?'Esta es la que se usa para salir a internet en los sistemas actuales.':'Con EUI-64, los últimos 64 bits delatan tu MAC: cualquiera puede reconocer tu equipo en cualquier red.');
  }
  elegir('#vsPre',function(v){pre=v;pintar()});
  mac.addEventListener('input',pintar);
  $('#vsPriv',raiz).addEventListener('change',pintar);
  pintar();
};

/* ---------- Demo 3: IPv6 desde la terminal ---------- */
AT.labs['v6-terminal']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'v6-terminal',
    sugerencias:['ip -6 a','ip -br a','ping -6 -c 2 ::1'],
    tareas:[
      {id:'dirs',texto:'Mira las direcciones IPv6 de la computadora.',pista:'`ip -6 a`. Verás `::1` (loopback), una global (`2001:db8:…`) y una de enlace local (`fe80::…`).',
       ok:function(s,u){return u.uso('ip',/-6/)&&/fe80::/.test(u.salida)}},
      {id:'resumen',texto:'Muestra todas las direcciones en forma resumida.',pista:'`ip -br a`. En una línea por tarjeta, IPv4 e IPv6 juntas: eso es doble pila.',
       ok:function(s,u){return u.uso('ip',/-br/)&&/2001:db8/.test(u.salida)}},
      {id:'loop',texto:'Haz ping a la propia computadora por IPv6.',pista:'`ping -c 2 ::1`. `::1` es el equivalente de 127.0.0.1.',
       ok:function(s,u){return u.uso('ping',/::1/)&&u.codigo===0}},
      {id:'aaaa',texto:'Pregunta al DNS la dirección IPv6 de example.com.',pista:'`dig AAAA example.com +short`. El registro AAAA guarda direcciones IPv6.',
       ok:function(s,u){return u.uso('dig',/AAAA/i)&&/2001:db8/.test(u.salida)}},
      {id:'ping6',texto:'Haz ping a example.com por IPv6.',pista:'`ping -6 -c 2 example.com`.',
       ok:function(s,u){return u.uso('ping',/-6/)&&u.codigo===0}}
    ]
  });
};
})();
