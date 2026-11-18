/* Laboratorios de la lección «Firewalls». Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio»;
   bloques.js lo llama después de copiar su plantilla (<template data-lab> en firewalls.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: ordena las reglas ---------- */
AT.labs['fw-reglas']=function(raiz){
  var R=[
    {id:'d22',acc:'deny',puertos:[22],desde:null,txt:'DENY 22 desde cualquier lado'},
    {id:'a22',acc:'allow',puertos:[22],desde:'192.168.1.0/24',txt:'ALLOW 22 desde 192.168.1.0/24 (la oficina)'},
    {id:'web',acc:'allow',puertos:[80,443],desde:null,txt:'ALLOW 80 y 443 desde cualquier lado'},
    {id:'db',acc:'allow',puertos:[5432],desde:'10.0.5.0/24',txt:'ALLOW 5432 desde 10.0.5.0/24 (servidores de la app)'}
  ];
  var PAQ=[
    {n:'Admin en la oficina → SSH',ip:'192.168.1.30',p:22,quiere:true},
    {n:'Bot de internet → SSH',ip:'45.9.20.11',p:22,quiere:false},
    {n:'Visitante → sitio web (443)',ip:'187.190.4.7',p:443,quiere:true},
    {n:'Servidor de la app → PostgreSQL',ip:'10.0.5.20',p:5432,quiere:true},
    {n:'Visitante → PostgreSQL',ip:'187.190.4.7',p:5432,quiere:false},
    {n:'Escaneo → puerto 3389',ip:'45.9.20.11',p:3389,quiere:false}
  ];
  var pol='deny';
  function decide(pq){
    for(var i=0;i<R.length;i++){var r=R[i];if(r.puertos.indexOf(pq.p)<0)continue;if(r.desde){var k=r.desde.split('/');if(!AT.terminal.util.enRed(pq.ip,k[0],+k[1]))continue}return {pasa:r.acc==='allow',regla:i}}
    return {pasa:pol==='allow',regla:-1};
  }
  function pintar(foco){
    $('#frReglas',raiz).innerHTML=R.map(function(r,i){
      return '<li class="fr-r '+r.acc+'"><span class="fr-n">'+(i+1)+'</span><span class="fr-x">'+esc(r.txt)+'</span>'+
        '<span class="fr-b"><button class="btn" type="button" data-i="'+i+'" data-d="-1" aria-label="Subir la regla '+(i+1)+'"'+(i===0?' aria-disabled="true"':'')+'>↑</button>'+
        '<button class="btn" type="button" data-i="'+i+'" data-d="1" aria-label="Bajar la regla '+(i+1)+'"'+(i===R.length-1?' aria-disabled="true"':'')+'>↓</button></span></li>';
    }).join('');
    var mal=0;
    $('#frPaq',raiz).innerHTML=PAQ.map(function(pq){
      var d=decide(pq),bien=d.pasa===pq.quiere;if(!bien)mal++;
      return '<tr class="'+(bien?'':'fr-mal')+'"><td>'+esc(pq.n)+'<br><code>'+pq.ip+'</code></td><td>'+(d.pasa?'Pasa':'Bloqueado')+' · '+(d.regla>=0?'regla '+(d.regla+1):'política por defecto')+(bien?'':' · <b>no debería</b>')+'</td></tr>';
    }).join('');
    var st=$('#frStat',raiz);
    st.setAttribute('data-k',mal?'bad':'good');
    $('#frMsg',raiz).textContent=mal?mal+' paquete'+(mal===1?'':'s')+' con el resultado equivocado. '+(R[0].id==='d22'&&decide(PAQ[0]).regla===0?'El bloqueo del 22 está antes que el permiso de la oficina: la oficina no entra. ':'')+(pol==='allow'?'Con «permitir» por defecto, pasa todo lo que ninguna regla menciona.':''):'Todo correcto: entra solo lo necesario, desde donde debe.';
    if(foco!=null){var b=raiz.querySelector('#frReglas button[data-i="'+foco.i+'"][data-d="'+foco.d+'"]');if(b&&b.getAttribute('aria-disabled')==='true')b=raiz.querySelector('#frReglas button[data-i="'+foco.i+'"]:not([aria-disabled="true"])');if(b)b.focus()}
  }
  $('#frReglas',raiz).addEventListener('click',function(e){
    var b=e.target.closest('button[data-i]');if(!b||b.getAttribute('aria-disabled')==='true')return;
    var i=+b.getAttribute('data-i'),d=+b.getAttribute('data-d'),j=i+d,x=R[i];R[i]=R[j];R[j]=x;
    pintar({i:j,d:d});
  });
  elegir('#frPol',function(v){pol=v;pintar()});
  pintar();
};

/* ---------- Demo 2: protege la base de datos ---------- */
AT.labs['fw-terminal']=function(raiz){
  var U=AT.terminal.util;
  function srv(s){return s.mundo.porIp('192.168.1.10')}
  AT.terminal($('.term-host',raiz),{
    clave:'fw-terminal',
    sugerencias:['nc -zv servidor 22 80 5432','ssh servidor','sudo ufw status'],
    remotos:[{op:{host:'servidor',usuario:'ana',contrasena:'servidor123',red:{ip:'192.168.1.10',mac:'52:54:00:12:34:56'}},
      preparar:function(rs){
        U.instalar(rs,'nginx');
        rs.servicio('postgresql',{desc:'PostgreSQL RDBMS',cmd:'/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main',nombreProc:'postgres',u:'postgres',activo:true,habilitado:true,puertos:[5432]});
      }}],
    tareas:[
      {id:'abierto',texto:'Desde tu PC, revisa qué puertos del servidor están abiertos: 22, 80 y 5432.',pista:'`nc -zv servidor 22 80 5432`. Los tres responden: la base de datos está abierta a toda la red.',
       ok:function(s,u){return u.uso('nc')&&/5432 port \[tcp\/postgresql\] succeeded/.test(u.salida)}},
      {id:'ssh',texto:'Entra al servidor y permite SSH en el firewall (todavía sin encenderlo).',pista:'`ssh servidor` y luego `sudo ufw allow OpenSSH`. La contraseña es servidor123.',
       ok:function(s){var r=srv(s);return r.ufw.reglas.some(function(g){return g.acc==='allow'&&g.puertos&&g.puertos.some(function(p){return p.de<=22&&22<=p.a})})}},
      {id:'web',texto:'Permite también el sitio web (puerto 80).',pista:'`sudo ufw allow 80/tcp` (o `sudo ufw allow "Nginx HTTP"`).',
       ok:function(s){var r=srv(s);return r.ufw.reglas.some(function(g){return g.acc==='allow'&&g.desde==='any'&&g.puertos&&g.puertos.some(function(p){return p.de<=80&&80<=p.a})})}},
      {id:'enable',texto:'Enciende el firewall y revisa las reglas.',pista:'`sudo ufw enable` (contesta y) y luego `sudo ufw status`.',
       ok:function(s,u){return srv(s).ufw.activo&&u.uso('ufw',/status/)}},
      {id:'cerrado',texto:'Sal del servidor y prueba otra vez el puerto 5432 desde tu PC.',pista:'`exit` y `nc -zv servidor 5432`. Ahora tarda y dice «timed out»: el firewall descarta los paquetes.',
       ok:function(s,u,t){return t.sis.host==='ubuntu'&&u.uso('nc',/5432/)&&/5432 \(tcp\) failed: Connection timed out/.test(u.salida)}},
      {id:'pc',texto:'Permite el 5432 solo desde tu PC (192.168.1.50) y comprueba que ya llegas.',pista:'En el servidor: `sudo ufw allow from 192.168.1.50 to any port 5432`. Sal y prueba `nc -zv servidor 5432`.',
       ok:function(s,u,t){var r=srv(s);return t.sis.host==='ubuntu'&&u.uso('nc',/5432/)&&/5432 port \[tcp\/postgresql\] succeeded/.test(u.salida)&&r.ufw.activo&&!r.ufw.reglas.some(function(g){return g.acc==='allow'&&g.desde==='any'&&g.puertos&&g.puertos.some(function(p){return p.de<=5432&&5432<=p.a})})}}
    ]
  });
};
})();
