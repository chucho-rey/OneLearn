/* Laboratorios de la lección «DHCP y NAT». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en dhcp-nat.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: DORA paso a paso ---------- */
AT.labs['dn-dora']=function(raiz){
  var DISC={n:'DHCPDISCOVER',de:'Laptop',a:'Todos (difusión)',o:'0.0.0.0:68',d:'255.255.255.255:67',mac:'ff:ff:ff:ff:ff:ff',t:'«¿Hay algún servidor DHCP? Mi MAC es 3c:52:82:4f:aa:10.»'};
  var ESC={
    normal:[DISC,
      {n:'DHCPOFFER',de:'Router',a:'Laptop',o:'192.168.1.1:67',d:'255.255.255.255:68',mac:'3c:52:82:4f:aa:10',t:'«Te ofrezco 192.168.1.35, máscara 255.255.255.0, puerta de enlace y DNS 192.168.1.1, por 24 horas.»'},
      {n:'DHCPREQUEST',de:'Laptop',a:'Todos (difusión)',o:'0.0.0.0:68',d:'255.255.255.255:67',mac:'ff:ff:ff:ff:ff:ff',t:'«Acepto la 192.168.1.35 que me ofreció 192.168.1.1.» Va a todos, para que cualquier otro servidor sepa que no eligió su oferta.'},
      {n:'DHCPACK',de:'Router',a:'Laptop',o:'192.168.1.1:67',d:'255.255.255.255:68',mac:'3c:52:82:4f:aa:10',t:'«Confirmado: la 192.168.1.35 es tuya por 24 horas.»'}],
    apagado:[DISC,{n:'DHCPDISCOVER',de:'Laptop',a:'Todos (difusión)',o:'0.0.0.0:68',d:'255.255.255.255:67',mac:'ff:ff:ff:ff:ff:ff',t:'Nadie contestó. La laptop vuelve a preguntar, esperando cada vez un poco más.'},
      {n:'DHCPDISCOVER',de:'Laptop',a:'Todos (difusión)',o:'0.0.0.0:68',d:'255.255.255.255:67',mac:'ff:ff:ff:ff:ff:ff',t:'Tercer intento sin respuesta.'}],
    lleno:[DISC,{n:'(sin respuesta)',de:'Router',a:'—',o:'—',d:'—',mac:'—',t:'El router recibió la pregunta, pero ya prestó todas las direcciones de su rango: no tiene nada que ofrecer.'},
      {n:'DHCPDISCOVER',de:'Laptop',a:'Todos (difusión)',o:'0.0.0.0:68',d:'255.255.255.255:67',mac:'ff:ff:ff:ff:ff:ff',t:'La laptop insiste, sin suerte.'}]
  };
  var esc2='normal',i=0;
  function pintar(){
    var ms=ESC[esc2],fin=i>=ms.length,st=$('#ddStat',raiz);
    var vis=ms.slice(0,i);
    $('#ddCaja',raiz).innerHTML=(vis.length?vis.map(function(m,k){return '<div class="dd-m'+(k===vis.length-1?' ult':'')+' '+(m.de==='Router'?'srv':'cli')+'"><b>'+esc(m.n)+'</b><span>'+esc(m.de)+' → '+esc(m.a)+'</span><dl><dt>IP origen → destino</dt><dd class="mono">'+esc(m.o)+' → '+esc(m.d)+'</dd><dt>MAC de destino</dt><dd class="mono">'+esc(m.mac)+'</dd></dl><p>'+esc(m.t)+'</p></div>'}).join(''):'<p class="dd-v">La laptop acaba de conectarse. Todavía no tiene IP: 0.0.0.0.</p>')+
      (fin?'<div class="dd-res'+(esc2==='normal'?' ok':' mal')+'"><b>Configuración de la laptop</b><dl>'+(esc2==='normal'?
        '<dt>IP</dt><dd class="mono">192.168.1.35/24</dd><dt>Puerta de enlace</dt><dd class="mono">192.168.1.1</dd><dt>DNS</dt><dd class="mono">192.168.1.1</dd><dt>Préstamo</dt><dd>24 horas; renueva a las 12</dd>':
        '<dt>IP</dt><dd class="mono">169.254.71.18/16</dd><dt>Puerta de enlace</dt><dd>Ninguna</dd><dt>DNS</dt><dd>Ninguno</dd>')+'</dl></div>':'');
    st.setAttribute('data-k',fin?(esc2==='normal'?'good':'bad'):'');
    $('#ddMsg',raiz).textContent=!i?'Pulsa «Siguiente mensaje».':fin?(esc2==='normal'?'Listo: la laptop tiene todo lo que necesita para salir a internet.':'Sin respuesta, la laptop se puso una dirección 169.254.x.x. Puede hablar con equipos en la misma situación, pero no tiene puerta de enlace: no hay internet.'):ms[i-1].t;
    $('#ddPaso',raiz).textContent=i?'Mensaje '+Math.min(i,ms.length)+' de '+ms.length:'';
    $('#ddSig',raiz).setAttribute('aria-disabled',fin?'true':'false');
  }
  $('#ddSig',raiz).addEventListener('click',function(){if(i<ESC[esc2].length){i++;pintar()}});
  $('#ddReset',raiz).addEventListener('click',function(){i=0;pintar()});
  elegir('#ddEsc',function(v){esc2=v;i=0;pintar()});
  pintar();
};

/* ---------- Demo 2: la tabla NAT ---------- */
AT.labs['dn-nat']=function(raiz){
  var EQ={laptop:['Laptop','192.168.1.20','example.com (203.0.113.10:443)'],celular:['Celular','192.168.1.35','example.com (203.0.113.10:443)'],tv:['TV','192.168.1.50','servidor de películas (203.0.113.40:443)']};
  var tabla=[],sigPub=40001;
  function pintar(){
    $('#dnTabla',raiz).innerHTML=tabla.length?tabla.map(function(f){return '<tr><td class="mono">'+esc(f.priv)+'</td><td class="mono">'+esc(f.pub)+'</td><td>'+esc(f.dest)+'</td></tr>'}).join(''):'<tr><td colspan="3">Vacía: nadie ha abierto conexiones.</td></tr>';
  }
  function msg(k,t){$('#dnStat',raiz).setAttribute('data-k',k);$('#dnMsg',raiz).textContent=t}
  $('#dnAcc',raiz).addEventListener('click',function(e){
    var b=e.target.closest('button[data-v]');if(!b)return;
    var v=b.getAttribute('data-v');
    if(EQ[v]){
      var pp=50000+Math.floor(Math.random()*10000),f={priv:EQ[v][1]+':'+pp,pub:'198.51.100.77:'+(sigPub++),dest:EQ[v][2],eq:EQ[v][0]};
      tabla.push(f);pintar();
      msg('','El router cambió el origen '+f.priv+' por '+f.pub+' y lo anotó. Para el servidor, la conexión viene del router.');
    }else if(v==='respuesta'){
      if(!tabla.length){msg('warn','Todavía no hay conexiones abiertas: primero abre una página desde algún equipo.');return}
      var u=tabla[tabla.length-1];
      msg('good','Llega una respuesta a '+u.pub+'. El router lo busca en su tabla: era de la '+u.eq+'. Cambia el destino a '+u.priv+' y se la entrega.');
    }else{
      if($('#dnFwd',raiz).checked)msg('good','Llega una conexión a 198.51.100.77:8080. Hay una regla de reenvío: el router la manda a la NAS, 192.168.1.10:8080. Ojo: ahora la NAS está expuesta a todo internet.');
      else msg('bad','Llega una conexión a 198.51.100.77:8080, pero nadie de la casa la pidió y no hay regla de reenvío: el router no sabe a quién dársela y la descarta.');
    }
  });
  $('#dnFwd',raiz).addEventListener('change',function(){msg('',this.checked?'Regla agregada: lo que llegue al puerto 8080 va a la NAS.':'Regla quitada.')});
  $('#dnReset',raiz).addEventListener('click',function(){tabla=[];sigPub=40001;pintar();msg('','La tabla quedó vacía. Las conexiones viejas se borran solas después de un tiempo sin uso.')});
  pintar();
  msg('','Elige qué pasa en la casa.');
};

/* ---------- Demo 3: IP fija para el servidor ---------- */
AT.terminal.comando('dhclient',{d:'pide una dirección por DHCP (o la suelta con -r)',uso:'sudo dhclient -v [-r] [tarjeta]',cat:'Red',sbin:true},function(x){
  var o=AT.terminal.util.opts(x.args),r=x.sis.red,v=o.f.v,ifc=o.pos[0]||r.iface;
  if(x.u!=='root'){x.err("Can't create /var/lib/dhcp/dhclient.leases: Permission denied\n");return 1}
  var cab=v?'Internet Systems Consortium DHCP Client 4.4.3-P1\nCopyright 2004-2022 Internet Systems Consortium.\nAll rights reserved.\nFor info, please visit https://www.isc.org/software/dhcp/\n\nListening on LPF/'+ifc+'/'+r.mac+'\nSending on   LPF/'+ifc+'/'+r.mac+'\nSending on   Socket/fallback\n':'';
  if(o.f.r){x.out(cab+(v&&r.ip?'DHCPRELEASE of '+r.ip+' on '+ifc+' to 192.168.1.1 port 67 (xid=0x3a1f5c2e)\n':''));r.ip=null;r.puerta=null;return 0}
  return x.esperar(400).then(function(){
    r.ip=r.ipDhcp;r.bits=24;r.puerta=r.salida;r.dhcp=true;r.arriba=true;r.dnsSup=null;
    if(v)x.out(cab+'DHCPDISCOVER on '+ifc+' to 255.255.255.255 port 67 interval 3 (xid=0x5be2a91c)\nDHCPOFFER of '+r.ip+' from 192.168.1.1\nDHCPREQUEST for '+r.ip+' on '+ifc+' to 255.255.255.255 port 67 (xid=0x1ca9e25b)\nDHCPACK of '+r.ip+' from 192.168.1.1 (xid=0x5be2a91c)\nbound to '+r.ip+' -- renewal in 41870 seconds.\n');
    return 0;
  });
});
AT.labs['dn-fija']=function(raiz){
  var U=AT.terminal.util,NP='/etc/netplan/50-cloud-init.yaml';
  AT.terminal($('.term-host',raiz),{
    clave:'dn-fija',
    host:'servidor',
    red:{ip:'192.168.1.57'},
    sugerencias:['ip a','curl ifconfig.me','sudo cat '+NP],
    preparar:function(s){
      s.red.dns['ifconfig.me']={A:['203.0.113.80']};
      s.red.web['203.0.113.80']=function(){return U.respuesta(200,'198.51.100.77\n',{'content-type':'text/plain'})};
    },
    tareas:[
      {id:'ip',texto:'Mira qué IP tiene ahora y fíjate en la palabra `dynamic`.',pista:'`ip a`. «dynamic» quiere decir que la dio un servidor DHCP.',
       ok:function(s,u){return u.uso('ip',/^(-br\s+)?(a|addr)/)&&/dynamic/.test(u.salida)}},
      {id:'publica',texto:'Averigua con qué IP pública sale a internet.',pista:'`curl ifconfig.me` pregunta a un sitio qué IP ve llegar. Es la del router, no la tuya: eso es NAT.',
       ok:function(s,u){return u.uso('curl')&&/198\.51\.100\.77/.test(u.salida)}},
      {id:'dora',texto:'Pide la dirección otra vez por DHCP y mira los cuatro mensajes.',pista:'`sudo dhclient -v`. Busca DHCPDISCOVER, DHCPOFFER, DHCPREQUEST y DHCPACK.',
       ok:function(s,u){return u.uso('dhclient')&&/DHCPACK/.test(u.salida)}},
      {id:'ver',texto:'Mira la configuración de red de netplan. Es de root.',pista:'`sudo cat /etc/netplan/50-cloud-init.yaml`. Dice `dhcp4: true`.',
       ok:function(s,u){return /50-cloud-init/.test(u.linea)&&/dhcp4/.test(u.salida)}},
      {id:'editar',texto:'Edita el archivo para la IP fija 192.168.1.60/24, puerta de enlace y DNS 192.168.1.1.',pista:'`sudo nano /etc/netplan/50-cloud-init.yaml` y escribe el ejemplo de la lección (con espacios, sin tabuladores). Guarda con Ctrl+O y sal con Ctrl+X.',
       ok:function(s){var t=s.leer(NP)||'';return /dhcp4:\s*(false|no)/.test(t)&&/192\.168\.1\.60\/24/.test(t)&&/192\.168\.1\.1/.test(t)}},
      {id:'aplicar',texto:'Aplica la configuración.',pista:'`sudo netplan apply`. Si hay un error de sangría, te lo dirá.',
       ok:function(s){return s.red.ip==='192.168.1.60'&&!s.red.dhcp}},
      {id:'probar',texto:'Comprueba que tiene la nueva IP y que llega a internet por nombre.',pista:'`ip a` para ver la .60 y `ping -c 2 example.com` para probar la puerta de enlace y el DNS.',
       ok:function(s,u){return s.red.ip==='192.168.1.60'&&u.uso('ping',/[a-z]\.[a-z]/)&&u.codigo===0}}
    ]
  });
};
})();
