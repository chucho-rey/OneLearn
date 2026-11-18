/* Laboratorios de la lección «TCP, UDP y puertos». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en tcp-udp.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,fmt=AT.fmt,elegir=AT.elegir;

/* ---------- Demo 1: la conexión TCP paso a paso ---------- */
AT.labs['tu-saludo']=function(raiz){
  var P=[
    {de:'c',f:'SYN',det:'seq=1000',cli:'SYN-SENT',srv:'LISTEN',m:'Paso 1 del saludo. El navegador pide abrir la conexión y anuncia su número de secuencia inicial, 1000.'},
    {de:'s',f:'SYN, ACK',det:'seq=5000, ack=1001',cli:'SYN-SENT',srv:'SYN-RECEIVED',m:'Paso 2. El servidor acepta, confirma lo recibido (espera el byte 1001) y anuncia su propio número inicial, 5000.'},
    {de:'c',f:'ACK',det:'ack=5001',cli:'ESTABLISHED',srv:'ESTABLISHED',m:'Paso 3. El navegador confirma. La conexión está abierta: ya se pueden mandar datos. Llevó una ida y vuelta completa antes de empezar.'},
    {de:'c',f:'Datos (HTTP)',det:'seq=1001, 78 bytes: GET / HTTP/1.1',cli:'ESTABLISHED',srv:'ESTABLISHED',m:'El navegador manda la petición. Sus bytes van del 1001 al 1078.'},
    {de:'s',f:'ACK + Datos',det:'ack=1079, seq=5001, 1460 bytes de la página',cli:'ESTABLISHED',srv:'ESTABLISHED',m:'El servidor confirma que recibió hasta el byte 1078 (espera el 1079) y en el mismo paquete manda la primera parte de la página.'},
    {de:'c',f:'ACK',det:'ack=6461',cli:'ESTABLISHED',srv:'ESTABLISHED',m:'El navegador confirma. Si esta confirmación no llegara a tiempo, el servidor volvería a mandar esos 1460 bytes.'},
    {de:'c',f:'FIN',det:'seq=1079',cli:'FIN-WAIT',srv:'CLOSE-WAIT',m:'El navegador ya no va a mandar nada más y pide cerrar.'},
    {de:'s',f:'FIN, ACK',det:'ack=1080',cli:'TIME-WAIT',srv:'LAST-ACK',m:'El servidor confirma y también cierra su lado.'},
    {de:'c',f:'ACK',det:'ack=6462',cli:'TIME-WAIT',srv:'CLOSED',m:'Última confirmación. El navegador espera un momento (TIME-WAIT) por si llega algún paquete atrasado, y luego la conexión desaparece.',fin:true}
  ];
  var i=0;
  function pintar(){
    $('#tsCaja',raiz).innerHTML=P.slice(0,i).map(function(p,k){return '<div class="ts-m '+(p.de==='c'?'cli':'srv')+(k===i-1?' ult':'')+'"><b>'+esc(p.f)+'</b><span>'+(p.de==='c'?'Navegador → Servidor':'Servidor → Navegador')+'</span><code>'+esc(p.det)+'</code></div>'}).join('')||'<p class="ts-v">El servidor está escuchando en el puerto 80 (LISTEN). El navegador todavía no se conecta.</p>';
    var p=P[i-1]||{cli:'CLOSED',srv:'LISTEN',m:'Pulsa «Siguiente paso».'};
    $('#tsCli',raiz).textContent=p.cli;$('#tsSrv',raiz).textContent=p.srv;
    $('#tsMsg',raiz).textContent=p.m;$('#tsStat',raiz).setAttribute('data-k',p.fin?'good':p.cli==='ESTABLISHED'&&i===3?'good':'');
    $('#tsPaso',raiz).textContent=i?'Paso '+i+' de '+P.length:'';
    $('#tsSig',raiz).setAttribute('aria-disabled',i>=P.length?'true':'false');
  }
  $('#tsSig',raiz).addEventListener('click',function(){if(i<P.length){i++;pintar()}});
  $('#tsReset',raiz).addEventListener('click',function(){i=0;pintar()});
  pintar();
};

/* ---------- Demo 2: TCP contra UDP con pérdidas ---------- */
AT.labs['tu-perdida']=function(raiz){
  var que='archivo',N=12,RTO=4;
  function perdidos(pct){var out=[];for(var k=1;k<=N;k++)if(((k*37+11)%100)<pct*2.4)out.push(k);return out.slice(0,Math.round(N*pct/100))}
  function pintar(){
    var pct=+$('#tpPerd',raiz).value,pe=perdidos(pct),fila=function(cls){return '<div class="tp-c">'+Array.apply(null,{length:N}).map(function(x,k){var lost=pe.indexOf(k+1)>=0;return '<span class="'+(lost?cls:'tp-ok')+'">'+(k+1)+'</span>'}).join('')+'</div>'};
    $('#tpPerdV',raiz).textContent=pct+' %';
    $('#tpFilas',raiz).innerHTML='<div class="tp-f"><b>TCP</b>'+fila('tp-re')+'</div><div class="tp-f"><b>UDP</b>'+fila('tp-pe')+'</div>';
    var tTcp=N*20+pe.length*RTO*20,tUdp=N*20;
    $('#tpTcp',raiz).textContent=tTcp+' ms';$('#tpUdp',raiz).textContent=tUdp+' ms';
    $('#tpPerdidos',raiz).textContent=pe.length+' de '+N;
    var st=$('#tpStat',raiz),m;
    if(!pe.length){st.setAttribute('data-k','good');m='Sin pérdidas, los dos tardan lo mismo. La diferencia aparece cuando la red falla.'}
    else if(que==='archivo'){st.setAttribute('data-k','good');m='Para un archivo, TCP es lo correcto: tarda '+(tTcp-tUdp)+' ms más por los reenvíos, pero llega completo. Con UDP faltarían '+pe.length+' pedazos y el archivo estaría dañado.'}
    else{st.setAttribute('data-k','warn');m='En una videollamada, los '+pe.length+' pedazos que TCP reenvía llegan '+RTO*20+' ms tarde: la imagen se congelaría esperándolos. Con UDP se pierde un instante de audio o video y la llamada sigue. Por eso las llamadas usan UDP.'}
    $('#tpMsg',raiz).textContent=m;
  }
  elegir('#tpQue',function(v){que=v;pintar()});
  $('#tpPerd',raiz).addEventListener('input',pintar);
  pintar();
};

/* ---------- Demo 3: puertos de un servidor ---------- */
AT.labs['tu-puertos']=function(raiz){
  var U=AT.terminal.util;
  AT.terminal($('.term-host',raiz),{
    clave:'tu-puertos',
    sugerencias:['ss -tln','nc -zv servidor 22','ssh servidor'],
    remotos:[{op:{host:'servidor',usuario:'ana',contrasena:'servidor123',red:{ip:'192.168.1.10',mac:'52:54:00:12:34:56'}},
      preparar:function(rs){
        U.instalar(rs,'nginx');
        rs.servicio('postgresql',{desc:'PostgreSQL RDBMS',cmd:'/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main',nombreProc:'postgres',u:'postgres',activo:true,habilitado:true,puertos:[5432],local:true});
      }}],
    tareas:[
      {id:'ss',texto:'Mira en qué puertos TCP espera conexiones esta computadora.',pista:'`ss -tln`. -t es TCP, -l los que escuchan y -n números en lugar de nombres.',
       ok:function(s,u,t){return t.sis.host==='ubuntu'&&u.uso('ss')&&/:22\b/.test(u.salida)}},
      {id:'ssh',texto:'Comprueba con `nc` que el servidor acepta conexiones SSH.',pista:'`nc -zv servidor 22`.',
       ok:function(s,u){return u.uso('nc',/servidor\s+22|22/)&&/22 port \[tcp\/ssh\] succeeded/.test(u.salida)}},
      {id:'web',texto:'Prueba los puertos 80 y 443 del servidor en un solo comando.',pista:'`nc -zv servidor 80 443`. El 80 responde; en el 443 nadie escucha (no tiene HTTPS).',
       ok:function(s,u){return u.uso('nc')&&/80 port \[tcp\/http\] succeeded/.test(u.salida)&&/port 443 \(tcp\) failed: Connection refused/.test(u.salida)}},
      {id:'pg',texto:'Prueba el puerto de PostgreSQL (5432). ¿Por qué no responde?',pista:'`nc -zv servidor 5432`. Dice «refused»: nadie escucha en esa puerta para otras computadoras.',
       ok:function(s,u){return u.uso('nc',/5432/)&&/5432 \(tcp\) failed: Connection refused/.test(u.salida)}},
      {id:'local',texto:'Entra al servidor y mira en qué dirección escucha PostgreSQL.',pista:'`ssh servidor` (contraseña servidor123) y luego `ss -tln`. Escucha en 127.0.0.1:5432: solo acepta conexiones del propio servidor.',
       ok:function(s,u,t){return t.sis.host==='servidor'&&u.uso('ss')&&/127\.0\.0\.1:5432/.test(u.salida)}},
      {id:'curl',texto:'Sal del servidor y mira con `curl -v` cómo se conecta tu PC al puerto 80.',pista:'`exit` y luego `curl -v http://servidor`. Las líneas con `*` son la conexión TCP; las de `>` y `<`, el HTTP.',
       ok:function(s,u,t){return t.sis.host==='ubuntu'&&u.uso('curl',/-v/)&&/Connected to servidor/.test(u.salida)}}
    ]
  });
};
})();
