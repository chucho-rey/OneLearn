/* Laboratorios de la lección «Monitoreo y registros». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en monitoreo.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;
var NS='http://www.w3.org/2000/svg';

/* ---------- Demo 1: ajusta una alerta ---------- */
/* CPU minuto a minuto: base entre 30 y 40 %, picos normales en los minutos 8, 21-22 y 33, y el problema real del 40 al 52 */
var CPU=[];
for(var i=0;i<60;i++){
  var v=30+(i*37)%11;
  if(i===8)v=96;if(i===21)v=91;if(i===22)v=93;if(i===33)v=85;
  if(i>=40&&i<=52)v=88+(i*13)%9;
  CPU.push(v);
}
AT.labs['mo-alerta']=function(raiz){
  var dur=1,W=600,H=200,PX=36,PY=12;
  function x(i){return PX+i*(W-PX-8)/59}
  function y(v){return PY+(100-v)*(H-PY-24)/100}
  function el(t,a,p){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
  function pintar(){
    var u=+$('#maU',raiz).value,alertas=[],seg=null;
    $('#maUV',raiz).textContent=u+' %';
    /* Una alerta por cada tramo que pasa del umbral durante al menos «dur» minutos seguidos; se dispara al cumplirlos */
    CPU.forEach(function(v,i){
      if(v>u){if(!seg)seg={de:i,n:0};seg.n++;if(seg.n===dur)alertas.push({min:i,de:seg.de})}else seg=null;
    });
    var reales=alertas.filter(function(a){return a.de>=40&&a.de<=52}),falsas=alertas.length-reales.length;
    var g=$('#maG',raiz);g.textContent='';
    var svg=el('svg',{viewBox:'0 0 '+W+' '+H,'class':'ma-svg',role:'img','aria-label':'Gráfica de CPU durante 60 minutos con el umbral en '+u+' % y '+alertas.length+' alertas'},g);
    el('rect',{x:x(40),y:PY,width:x(52)-x(40),height:H-PY-24,'class':'ma-inc'},svg);
    [0,50,100].forEach(function(t){el('line',{x1:PX,x2:W-8,y1:y(t),y2:y(t),'class':'ma-eje'},svg);var tx=el('text',{x:PX-6,y:y(t)+4,'text-anchor':'end','class':'ma-tx'},svg);tx.textContent=t+'%'});
    [0,15,30,45,59].forEach(function(m){var tx=el('text',{x:x(m),y:H-6,'text-anchor':'middle','class':'ma-tx'},svg);tx.textContent=m+' min'});
    el('polyline',{points:CPU.map(function(v,i){return x(i)+','+y(v)}).join(' '),'class':'ma-linea'},svg);
    el('line',{x1:PX,x2:W-8,y1:y(u),y2:y(u),'class':'ma-umbral'},svg);
    alertas.forEach(function(a){el('circle',{cx:x(a.min),cy:y(CPU[a.min]),r:6,'class':a.de>=40&&a.de<=52?'ma-ok':'ma-falsa'},svg)});
    $('#maN',raiz).textContent=alertas.length;
    $('#maF',raiz).textContent=falsas;
    $('#maR',raiz).textContent=reales.length?'minuto '+reales[0].min+' (a los '+(reales[0].min-40+1)+' min)':'nunca';
    var st=$('#maStat',raiz),m;
    if(!reales.length){st.setAttribute('data-k','bad');m='La alerta no avisó del problema real: el umbral es muy alto o pide demasiada duración, y la CPU baja de vez en cuando del umbral, lo que reinicia la cuenta.'}
    else if(falsas){st.setAttribute('data-k','warn');m='Avisa del problema, pero también manda '+falsas+' falsa'+(falsas===1?'':'s')+' alarma'+(falsas===1?'':'s')+'. Con tantas, la gente deja de hacer caso. Pide que dure más.'}
    else{st.setAttribute('data-k','good');m='Una sola alerta, justo del problema real. Esperar unos minutos retrasa un poco el aviso, pero filtra los picos normales.'}
    $('#maMsg',raiz).textContent=m;
  }
  $('#maU',raiz).addEventListener('input',pintar);
  elegir('#maD',function(v){dur=+v;pintar()});
  pintar();
};

/* ---------- Demo 2: investiga el registro de acceso ---------- */
function registro(){
  var UA='"-" "Mozilla/5.0 (X11; Linux x86_64)"',BOT='"-" "python-requests/2.31"',L=[];
  function linea(ip,ruta,cod,bytes,ua){L.push({ip:ip,ruta:ruta,cod:cod,bytes:bytes,ua:ua})}
  var PAG=[['/',200,5120],['/productos',200,8344],['/css/estilo.css',200,2210],['/img/logo.png',200,14020],['/productos/7',200,3010],['/carrito',200,2875]];
  [['187.190.4.7',24],['201.141.22.9',18],['189.203.11.40',15],['148.240.7.3',9]].forEach(function(v){for(var k=0;k<v[1];k++){var p=PAG[(k*5+v[1])%PAG.length];linea(v[0],p[0],k%7===6?304:p[1],k%7===6?0:p[2],UA)}});
  for(var k=0;k<3;k++){linea('177.228.60.2',PAG[k][0],200,PAG[k][2],UA);linea('177.228.60.2','/favicon.ico',404,162,UA)}
  for(k=0;k<30;k++)linea('45.9.20.11','/wp-login.php',404,162,BOT);
  for(k=0;k<8;k++)linea('45.9.20.11','/xmlrpc.php',404,162,BOT);
  /* Revuelve en un orden fijo y pone la hora */
  L=L.map(function(l,i){return {l:l,o:(i*53)%L.length+i/1000}}).sort(function(a,b){return a.o-b.o}).map(function(x){return x.l});
  return L.map(function(l,i){var s=600+i*17,h=10+Math.floor(s/3600),m=Math.floor(s%3600/60),sg=s%60;function d(n){return (n<10?'0':'')+n}
    return l.ip+' - - [18/Nov/2026:'+d(h)+':'+d(m)+':'+d(sg)+' -0600] "GET '+l.ruta+' HTTP/1.1" '+l.cod+' '+l.bytes+' '+l.ua}).join('\n')+'\n';
}
AT.labs['mo-terminal']=function(raiz){
  var U=AT.terminal.util,LOG='/var/log/nginx/access.log';
  function plano(t){return t.replace(/\s+/g,' ')}
  AT.terminal($('.term-host',raiz),{
    clave:'mo-terminal',
    sugerencias:['tail -n 5 '+LOG,'wc -l '+LOG,"awk '{print $1}' "+LOG+' | sort | uniq -c | sort -rn | head'],
    preparar:function(s){
      U.instalar(s,'nginx');
      s.poner(LOG,registro(),{u:'www-data',g:'adm',modo:0o644});
    },
    tareas:[
      {id:'ver',texto:'Mira las últimas líneas del registro de acceso.',pista:'`tail -n 5 /var/log/nginx/access.log`.',
       ok:function(s,u){return u.uso('tail',/access\.log/)}},
      {id:'contar',texto:'Cuenta cuántas peticiones hay en el registro.',pista:'`wc -l /var/log/nginx/access.log`. Cada línea es una petición.',
       ok:function(s,u){return u.uso('wc')&&/(^|\s)110(\s|$)/.test(u.salida)}},
      {id:'ips',texto:'Averigua qué IP hace más peticiones.',pista:"`awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head`. La primera columna es cuántas veces aparece cada IP.",
       ok:function(s,u){return u.uso('awk')&&u.uso('uniq')&&/^\s*38 45\.9\.20\.11\s*$/m.test(u.salida)}},
      {id:'errores',texto:'Cuenta cuántas peticiones recibieron un 404.',pista:"`awk '$9 == 404' /var/log/nginx/access.log | wc -l`. La columna 9 es el código de estado.",
       ok:function(s,u){return u.uso('wc')&&/^\s*41\s*$/.test(u.salida)}},
      {id:'rutas',texto:'Descubre qué rutas dan 404. ¿Qué está buscando esa IP?',pista:"`awk '$9 == 404 {print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn`. Busca /wp-login.php: un bot probando contraseñas de WordPress, que esta tienda ni siquiera usa.",
       ok:function(s,u){return u.uso('awk')&&/30 \/wp-login\.php/.test(plano(u.salida))}},
      {id:'bloquear',texto:'Bloquea esa IP en el firewall.',pista:'`sudo ufw deny from 45.9.20.11`. (En un servidor real, enciéndelo con `sudo ufw enable` después de permitir SSH.)',
       ok:function(s){return s.ufw.reglas.some(function(r){return r.acc==='deny'&&r.desde==='45.9.20.11'})}}
    ]
  });
};
})();
