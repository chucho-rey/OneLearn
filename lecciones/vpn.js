/* Laboratorios de la lección «VPN». Usan AT.ip (assets/js/red.js) para ver qué destinos van por el túnel.
   Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio». */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir,IP=AT.ip;

/* ---------- Demo 1: ¿quién ve qué? ---------- */
AT.labs['vp-ve']=function(raiz){
  var vpn='no',web='https';
  function pintar(){
    var Q=[
      {n:'El Wi-Fi del café',sitio:vpn==='no',cont:vpn==='no'&&web==='http',ip:true},
      {n:'Tu proveedor de internet',sitio:vpn==='no',cont:vpn==='no'&&web==='http',ip:true},
      {n:'El proveedor de la VPN',sitio:vpn==='si',cont:vpn==='si'&&web==='http',ip:vpn==='si',na:vpn==='no'},
      {n:'El sitio que visitas',sitio:true,cont:true,ip:vpn==='no'}
    ];
    function c(v,na){return na?'<td class="vv-na">—</td>':'<td class="'+(v?'vv-si':'vv-no')+'">'+(v?'Sí':'No')+'</td>'}
    $('#vvT',raiz).innerHTML=Q.map(function(q){return '<tr><td>'+esc(q.n)+'</td>'+c(q.sitio,q.na)+c(q.cont,q.na)+c(q.ip,q.na)+'</tr>'}).join('');
    var st=$('#vvStat',raiz),m;
    if(web==='http'){st.setAttribute('data-k','bad');m=vpn==='no'?'Con HTTP, el Wi-Fi y tu proveedor pueden leer todo: contraseñas incluidas.':'La VPN protege el tramo del café, pero del servidor de la VPN al sitio el HTTP viaja sin cifrar: el proveedor de la VPN puede leerlo.'}
    else if(vpn==='no'){st.setAttribute('data-k','warn');m='Con HTTPS nadie ve el contenido, pero el Wi-Fi y tu proveedor saben a qué sitios entras.'}
    else{st.setAttribute('data-k','good');m='El Wi-Fi y tu proveedor solo ven tráfico cifrado hacia la VPN. Ahora es el proveedor de la VPN quien sabe a qué sitios vas: la confianza se movió, no desapareció.'}
    $('#vvMsg',raiz).textContent=m;
  }
  elegir('#vvVpn',function(v){vpn=v;pintar()});
  elegir('#vvWeb',function(v){web=v;pintar()});
  pintar();
};

/* ---------- Demo 2: túnel completo o dividido ---------- */
AT.labs['vp-rutas']=function(raiz){
  var D=[
    {n:'La intranet de la empresa',ip:'10.20.3.15'},
    {n:'La impresora de la oficina',ip:'192.168.50.10'},
    {n:'Un sitio público',ip:'203.0.113.10'},
    {n:'El router de tu casa',ip:'192.168.1.1'}
  ];
  var allow='0.0.0.0/0';
  function pintar(){
    var redes=allow.split(','),tabla=redes.map(function(r){return {destino:r,via:'túnel'}}).concat([{destino:'192.168.1.0/24',via:'casa'},{destino:'0.0.0.0/0',via:'internet'}]);
    $('#vrConf',raiz).textContent='[Peer]\nEndpoint = vpn.empresa.example:51820\nAllowedIPs = '+redes.join(', ');
    var tunel=0;
    $('#vrDest',raiz).innerHTML=D.map(function(d){
      var m=AT.red.coincidencia(tabla,d.ip),t=m.via==='túnel';if(t)tunel++;
      return '<li class="'+(t?'vr-tun':'vr-dir')+'"><b>'+esc(d.n)+'</b> <code>'+d.ip+'</code><span>'+(t?'Por el túnel (coincide con '+m.destino+')':m.via==='casa'?'Directo: tu red de casa (192.168.1.0/24) es más específica':'Directo por tu internet')+'</span></li>';
    }).join('');
    var st=$('#vrStat',raiz),imp=allow.indexOf('192.168.50')>=0||allow==='0.0.0.0/0';
    st.setAttribute('data-k',imp?'good':'warn');
    $('#vrMsg',raiz).textContent=allow==='0.0.0.0/0'?'Túnel completo: todo lo de internet da el rodeo por la empresa. Tu red de casa sigue directa porque su ruta /24 es más larga que /0.':
      imp?'Túnel dividido: solo las redes de la empresa van por el túnel; lo demás sale directo, más rápido.':'Túnel dividido, pero falta la red de la oficina (192.168.50.0/24): la impresora queda fuera de alcance.';
  }
  elegir('#vrAllow',function(v){allow=v;pintar()});
  pintar();
};
})();
