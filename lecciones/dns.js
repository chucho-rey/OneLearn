/* Laboratorios de la lección «DNS y direcciones IP». Cada uno se registra en AT.labs con el nombre de su
   bloque «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en dns.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

function bin8(n){var s=n.toString(2);while(s.length<8)s='0'+s;return s}
function aNum(o){return ((o[0]<<24)>>>0)+(o[1]<<16)+(o[2]<<8)+o[3]}
function aOct(n){return [n>>>24,(n>>>16)&255,(n>>>8)&255,n&255]}
function txt(o){return o.join('.')}

/* ---------- Demo 1: una dirección IPv4 por dentro ---------- */
AT.labs['dn-ip']=function(){
  var ins=[0,1,2,3].map(function(k){return $('#ip'+k)});
  function tipo(o){
    if(o[0]===10)return ['privada','Privada (10.x.x.x): solo vale dentro de una red, como la de una empresa.','good'];
    if(o[0]===172&&o[1]>=16&&o[1]<=31)return ['privada','Privada (172.16 a 172.31): solo vale dentro de una red.','good'];
    if(o[0]===192&&o[1]===168)return ['privada','Privada (192.168.x.x): la típica de las redes de casa. Tu módem la cambia por la pública con NAT.','good'];
    if(o[0]===127)return ['local','De retorno (127.x.x.x): siempre apunta a tu propio equipo, «localhost».','good'];
    if(o[0]===169&&o[1]===254)return ['enlace','De enlace local (169.254.x.x): la que se pone un equipo cuando no encontró quién le diera una IP con DHCP.','warn'];
    if((o[0]===192&&o[1]===0&&o[2]===2)||(o[0]===198&&o[1]===51&&o[2]===100)||(o[0]===203&&o[1]===0&&o[2]===113))return ['doc','Reservada para documentación y ejemplos: no existe en internet.','good'];
    if(o[0]===0||o[0]>=224)return ['especial','Reservada para usos especiales (multidifusión o pruebas): no se le asigna a un equipo normal.','warn'];
    return ['publica','Pública: es única en todo internet y se puede alcanzar desde cualquier lugar.','good'];
  }
  function render(){
    var o=ins.map(function(i){return i.value===''?NaN:Number(i.value)}),ok=o.every(function(n){return Number.isInteger(n)&&n>=0&&n<=255});
    ins.forEach(function(i,k){i.setAttribute('aria-invalid',Number.isInteger(o[k])&&o[k]>=0&&o[k]<=255?'false':'true')});
    if(!ok){
      $('#ipBits').innerHTML='';$('#ipStat').setAttribute('data-k','bad');
      $('#ipMsg').textContent='Cada número debe ir del 0 al 255: con 8 bits no se puede escribir más (11111111 = 255).';return;
    }
    $('#ipBits').innerHTML=o.map(function(n){return '<div class="ip-o"><b>'+n+'</b><span>'+bin8(n)+'</span></div>'}).join('');
    var t=tipo(o);
    $('#ipStat').setAttribute('data-k',t[2]);$('#ipMsg').textContent=t[1];
    AT.setPressed($('#ipEj'),function(b){return b.getAttribute('data-v')===txt(o)});
  }
  ins.forEach(function(i){i.addEventListener('input',render)});
  elegir('#ipEj',function(v){v.split('.').forEach(function(n,k){ins[k].value=n});render()});
  render();
};

/* ---------- Demo 2: la máscara de red ---------- */
AT.labs['dn-mascara']=function(){
  var YO=[192,168,1,10],pre=24,otra=[192,168,1,200];
  function render(){
    var mask=pre?(0xFFFFFFFF<<(32-pre))>>>0:0,red=(aNum(YO)&mask)>>>0,red2=(aNum(otra)&mask)>>>0,hosts=Math.pow(2,32-pre)-2;
    $('#msMas').textContent=txt(aOct(mask));
    $('#msRed').textContent=txt(aOct(red))+'/'+pre;
    $('#msHost').textContent=fmt(hosts,0);
    var misma=red===red2;
    $('#msStat').setAttribute('data-k',misma?'good':'warn');
    $('#msMsg').textContent=txt(otra)+(misma?' está en la misma red ('+txt(aOct(red))+'/'+pre+'): los equipos se hablan directamente.':
      ' está en otra red ('+txt(aOct(red2))+'/'+pre+'): el paquete va a la puerta de enlace, el router, para que lo saque de la red.');
  }
  elegir('#msPre',function(v){pre=+v;render()});
  elegir('#msOtra',function(v){otra=v.split('.').map(Number);render()});
  render();
};

/* ---------- Demo 3: resuelve un nombre ---------- */
AT.labs['dn-resolver']=function(){
  var NOMBRES=[
    {n:'es.wikipedia.org',tld:'.org',dom:'wikipedia.org',ip:'198.51.100.24'},
    {n:'www.unam.mx',tld:'.mx',dom:'unam.mx',ip:'203.0.113.80'}
  ];
  var cache={},cual=0,i=0,pasos=[];
  function plan(){
    var N=NOMBRES[cual];
    if(cache[N.n])return [['Caché del navegador','¡Ya lo sabía! Lo resolvió hace poco y la respuesta sigue vigente (TTL). No hace falta preguntar a nadie.',0,true]];
    return [
      ['Caché del navegador y del sistema','No está guardado: hay que preguntar.',0],
      ['Resolvedor (tu proveedor o 1.1.1.1)','Tu equipo le pregunta por '+N.n+'. Tampoco lo tiene en caché, así que empieza a buscar por ti.',4],
      ['Servidor raíz','«No sé la IP de '+N.n+', pero los servidores de '+N.tld+' están aquí».',20],
      ['Servidor de '+N.tld,'«Pregúntale al servidor autoritativo de '+N.dom+'».',18],
      ['Servidor autoritativo de '+N.dom,'«'+N.n+' está en '+N.ip+'». El resolvedor guarda la respuesta y te la entrega.',22,true]
    ];
  }
  function render(){
    var N=NOMBRES[cual],ms=0;
    $('#rsPasos').innerHTML=pasos.map(function(p,k){
      if(k<i)ms+=p[2];
      return '<li class="'+(k<i?'ok':k===i?'sig':'')+'"><b>'+esc(p[0])+'</b>'+(k<i?'<span>'+esc(p[1])+'</span><em>+'+p[2]+' ms</em>':'')+'</li>';
    }).join('');
    var fin=i>=pasos.length;
    $('#rsMs').textContent=ms+' ms';
    $('#rsIp').textContent=fin?N.ip:'…';
    $('#rsSig').setAttribute('aria-disabled',fin?'true':'false');
    $('#rsOtra').setAttribute('aria-disabled',fin?'false':'true');
    if(!i){$('#rsStat').setAttribute('data-k','');$('#rsMsg').textContent='Escribiste '+N.n+' en el navegador. Pulsa «Siguiente paso».'}
    else if(fin){
      cache[N.n]=true;
      $('#rsStat').setAttribute('data-k','good');
      $('#rsMsg').textContent=pasos.length===1?'Desde la caché: 0 ms.':'Resuelto en '+ms+' ms. Ahora la respuesta queda en caché: visítalo otra vez.';
    }else{$('#rsStat').setAttribute('data-k','');$('#rsMsg').textContent=pasos[i-1][1]}
  }
  function iniciar(){pasos=plan();i=0;render()}
  $('#rsSig').addEventListener('click',function(){if(i<pasos.length){i++;render()}});
  $('#rsOtra').addEventListener('click',function(){if(this.getAttribute('aria-disabled')!=='true')iniciar()});
  $('#rsVaciar').addEventListener('click',function(){cache={};iniciar();$('#rsMsg').textContent='Caché vacía: la próxima resolución empieza desde cero.'});
  elegir('#rsNom',function(v){cual=+v;iniciar()});
  iniciar();
};
})();
