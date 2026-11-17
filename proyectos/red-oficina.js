/* Diagramas interactivos del proyecto «La red de una oficina». Se registran en AT.labs como los laboratorios
   de las lecciones; proyecto.js los dibuja (con bloques.js) dentro de la fase que los usa. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Topología de la red ---------- */
AT.labs['ro-topologia']=function(){
  var N={
    internet:{x:300,y:34,t:'Internet',d:'La red pública. Todo lo que llega de aquí pasa primero por el router.'},
    router:{x:300,y:104,t:'Router',ip:'192.168.10.1',d:'Conecta la oficina a internet, reparte direcciones (DHCP) y su firewall bloquea lo que viene de fuera.'},
    sw:{x:300,y:180,t:'Switch',d:'Conecta por cable todos los equipos de la oficina.'},
    ap:{x:470,y:180,t:'Wi-Fi',ip:'192.168.10.2',d:'Punto de acceso con dos redes: la del despacho y una de visitas (192.168.20.0/24) que solo tiene salida a internet.'},
    srv:{x:70,y:280,t:'Servidor',ip:'192.168.10.10',d:'Ubuntu Server con Nextcloud: archivos compartidos, edición en colaboración y respaldos. Recibe a las laptops por la VPN.'},
    laura:{x:185,y:280,t:'Laura',ip:'192.168.10.101',d:'PC de escritorio, por cable. Reserva DHCP: siempre la misma dirección.'},
    miguel:{x:300,y:280,t:'Miguel',ip:'192.168.10.102',d:'PC de escritorio, por cable.'},
    sofia:{x:415,y:280,t:'Sofía',ip:'192.168.10.103',d:'PC de recepción, por cable. Solo ve las carpetas de facturación.'},
    impresora:{x:530,y:280,t:'Impresora',ip:'192.168.10.20',d:'Dirección fija para que todas las PC la encuentren siempre.'},
    ana:{x:555,y:110,t:'Ana',ip:'DHCP (.100 a .199)',d:'Laptop. En la oficina usa el Wi-Fi del despacho; fuera, la VPN.'},
    visita:{x:555,y:40,t:'Visita',ip:'192.168.20.x',d:'Celular de un cliente en el Wi-Fi de visitas: tiene internet, pero no ve los equipos del despacho.'},
    carlos:{x:70,y:110,t:'Carlos',ip:'VPN (100.x.y.z)',d:'Laptop en su casa. Entra por un túnel cifrado (VPN) hasta el servidor; no hay puertos abiertos en el router.'}
  };
  /* Enlaces: [a, b, tipo] */
  var E=[['internet','router','cable'],['router','sw','cable'],['sw','ap','cable'],['sw','srv','cable'],['sw','laura','cable'],['sw','miguel','cable'],
         ['sw','sofia','cable'],['sw','impresora','cable'],['ap','ana','wifi'],['ap','visita','wifi'],['carlos','internet','cable']];
  var RUTAS={
    oficina:{n:['laura','sw','srv'],k:'good',m:'Laura guarda un documento: viaja por cable de su PC al switch y de ahí al servidor. Nunca sale a internet, así que es rápido aunque falle la conexión del despacho.'},
    casa:{n:['carlos','internet','router','sw','srv'],vpn:true,k:'good',m:'Carlos abre un archivo desde su casa: sus datos van cifrados por el túnel VPN a través de internet y del router hasta el servidor. Quien los intercepte en el camino solo ve datos cifrados.'},
    visita:{n:['visita','ap','sw'],corte:'sw',k:'bad',m:'Una visita conectada al Wi-Fi de invitados intenta llegar al servidor: el punto de acceso pone esa red aparte y solo la deja salir a internet. El servidor ni siquiera es visible.'}
  };
  var svg=$('#toSvg'),ruta=null,sel=null;
  function enRuta(a,b){if(!ruta)return false;var n=RUTAS[ruta].n;for(var i=0;i<n.length-1;i++)if((n[i]===a&&n[i+1]===b)||(n[i]===b&&n[i+1]===a))return true;return false}
  function render(){
    var h='',R=ruta&&RUTAS[ruta];
    E.forEach(function(e){
      var a=N[e[0]],b=N[e[1]],on=enRuta(e[0],e[1]);
      if(R&&R.corte&&on&&(e[0]===R.corte||e[1]===R.corte))on=false;
      h+='<line class="to-e '+e[2]+(on?' on':'')+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>';
    });
    /* El túnel VPN: de la laptop de Carlos al servidor */
    h+='<path class="to-vpn'+(ruta==='casa'?' on':'')+'" d="M'+(N.carlos.x-6)+' '+(N.carlos.y+16)+' C 20 180, 20 220, '+(N.srv.x-16)+' '+(N.srv.y-10)+'"/>';
    h+='<text class="to-tl" x="52" y="196">VPN</text>';
    if(R&&R.corte){var c=N.ap;h+='<g class="to-x"><line x1="'+(c.x-58)+'" y1="'+(c.y-10)+'" x2="'+(c.x-42)+'" y2="'+(c.y+6)+'"/><line x1="'+(c.x-58)+'" y1="'+(c.y+6)+'" x2="'+(c.x-42)+'" y2="'+(c.y-10)+'"/></g>'}
    Object.keys(N).forEach(function(k){
      var n=N[k],act=(R&&R.n.indexOf(k)>=0&&!(R.corte===k))||sel===k;
      h+='<g class="to-n'+(act?' on':'')+(k==='srv'?' srv':'')+'"><rect x="'+(n.x-44)+'" y="'+(n.y-15)+'" width="88" height="30" rx="6"/><text x="'+n.x+'" y="'+(n.y+5)+'">'+esc(n.t)+'</text></g>';
    });
    svg.innerHTML=h;
    if(sel){var s=N[sel];$('#toStat').setAttribute('data-k','');$('#toMsg').textContent=s.t+(s.ip?' · '+s.ip:'')+': '+s.d}
    else if(R){$('#toStat').setAttribute('data-k',R.k);$('#toMsg').textContent=R.m}
    else{$('#toStat').setAttribute('data-k','');$('#toMsg').textContent='Elige una situación o un equipo.'}
    AT.setPressed($('#toEq'),function(b){return b.getAttribute('data-v')===sel});
  }
  $('#toEq').innerHTML=Object.keys(N).map(function(k){return '<button class="chip" type="button" data-v="'+k+'" aria-pressed="false">'+esc(N[k].t)+'</button>'}).join('');
  elegir('#toRuta',function(v){ruta=v;sel=null;render()});
  elegir('#toEq',function(v){sel=v;ruta=null;AT.setPressed($('#toRuta'),function(){return false});render()});
  render();
};

/* ---------- ¿Cabe este equipo en el plan? ---------- */
AT.labs['ro-ip']=function(){
  var FIJAS={1:'el router',2:'el punto de acceso Wi-Fi',10:'el servidor',20:'la impresora',101:'la PC de Laura',102:'la PC de Miguel',103:'la PC de Sofía'};
  var inp=$('#ipNueva');
  function revisar(t){
    var m=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(t.trim());
    if(!m)return {k:'bad',m:'No es una dirección IPv4: deben ser cuatro números separados por puntos.'};
    var o=m.slice(1).map(Number);
    if(o.some(function(n){return n>255}))return {k:'bad',m:'Cada número va del 0 al 255.'};
    if(o[0]!==192||o[1]!==168||o[2]!==10)return {k:'bad',m:'Está fuera de la red del despacho (192.168.10.x). El equipo no podría hablar con los demás sin pasar por un router.'};
    var h=o[3];
    if(h===0)return {k:'bad',h:h,m:'192.168.10.0 es la dirección de la red misma; no se le da a ningún equipo.'};
    if(h===255)return {k:'bad',h:h,m:'192.168.10.255 es la dirección de difusión (broadcast): un mensaje a ella llega a todos. No se le da a ningún equipo.'};
    if(FIJAS[h])return {k:'bad',h:h,m:'Ya la usa '+FIJAS[h]+'. Dos equipos con la misma dirección se estorban y ninguno funciona bien.'};
    if(h>=100&&h<=199)return {k:'warn',h:h,m:'Está dentro del rango DHCP (.100 a .199). Tarde o temprano el router se la dará a otra laptop y chocarán. Usa una de .3 a .99.'};
    return {k:'good',h:h,m:'Buena elección: está en la red del despacho, fuera del rango DHCP y nadie más la usa. Anótala en tu plan de direcciones.'};
  }
  function render(){
    var r=revisar(inp.value),hm='';
    for(var i=0;i<256;i++){
      var c=i===0||i===255?'esp':FIJAS[i]?'fija':i>=100&&i<=199?'dhcp':'libre';
      if(r.h===i)c+=' tu';
      hm+='<i class="'+c+'"></i>';
    }
    $('#ipMapa').innerHTML=hm;
    $('#ipStat').setAttribute('data-k',r.k);$('#ipMsg').textContent=r.m;
    inp.setAttribute('aria-invalid',r.k==='bad'?'true':'false');
    AT.setPressed($('#ipEj'),function(b){return b.getAttribute('data-v')===inp.value.trim()});
  }
  inp.addEventListener('input',render);
  elegir('#ipEj',function(v){inp.value=v;render()});
  render();
};

/* ---------- ¿Cómo entran las laptops desde fuera? ---------- */
AT.labs['ro-remoto']=function(){
  var OP=[
    {f:[['Seguridad','Baja: el servidor queda expuesto a todo internet; lo prueban bots las 24 horas'],['Dificultad','Baja'],['Costo','$0'],['¿Funciona con CGNAT?','No'],['Si se pierde una laptop','Hay que cambiar todas las contraseñas']],
     k:'bad',m:'Abrir un puerto del router hacia el servidor es lo más fácil y lo más peligroso: cualquier falla de Nextcloud o una contraseña débil queda al alcance de todo el mundo. No se recomienda.'},
    {f:[['Seguridad','Alta: solo entran los dispositivos con su llave, y todo va cifrado'],['Dificultad','Media: configurar el router y las llaves de cada laptop'],['Costo','$0'],['¿Funciona con CGNAT?','No, necesita una IP pública en la oficina'],['Si se pierde una laptop','Se borra su llave del servidor VPN']],
     k:'good',m:'WireGuard propio es la opción profesional cuando la oficina tiene una IP pública: control total y sin depender de nadie. Solo se abre el puerto de la VPN, que no responde a quien no tenga una llave.'},
    {f:[['Seguridad','Alta: usa WireGuard por dentro, con inicio de sesión y llaves por dispositivo'],['Dificultad','Baja: instalar una app y entrar con una cuenta'],['Costo','Gratis para uso personal; de pago para empresas'],['¿Funciona con CGNAT?','Sí, no abre puertos en el router'],['Si se pierde una laptop','Se quita desde el panel con un clic']],
     k:'good',m:'Tailscale es ideal para practicar y para oficinas pequeñas: es WireGuard sin la parte difícil. El costo es depender de un servicio externo y, en una empresa, pagar su plan.'}
  ];
  function render(i){
    var o=OP[i];
    $('#reTab').innerHTML=o.f.map(function(x){return '<tr><th scope="row">'+esc(x[0])+'</th><td>'+esc(x[1])+'</td></tr>'}).join('');
    $('#reStat').setAttribute('data-k',o.k);$('#reMsg').textContent=o.m;
  }
  elegir('#reOp',function(v){render(+v)});
  render(2);
};
})();
