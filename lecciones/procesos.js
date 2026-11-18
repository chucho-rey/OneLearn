/* Laboratorios de la lección «Procesos y servicios». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en procesos.html).
   Los de práctica usan la terminal simulada (assets/js/terminal.js): cada ejercicio se califica solo. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc;

/* ---------- Demo 1: la computadora va lenta ---------- */
AT.labs['pr-lenta']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'pr-lenta',
    sugerencias:['uptime','top','ps aux'],
    archivos:{'~/reporte.py':'# Junta las ventas de todo el año y genera un reporte\nfor dia in range(365):\n    for venta in leer_ventas(dia):\n        procesar(venta)\n'},
    preparar:function(s){
      s.proc({pid:1987,cmd:'node servidor.js',nombre:'node',u:'ana',cpu:0.7,mem:1.4,stat:'Sl',inicio:new Date(Date.now()-3*3600e3)});
      s.proc({pid:2290,cmd:'python3 reporte.py --todo-el-año',nombre:'python3',u:'ana',cpu:97.8,mem:2.1,stat:'R',inicio:new Date(Date.now()-42*60e3)});
    },
    tareas:[
      {id:'uptime',texto:'Revisa la carga del sistema con `uptime`.',pista:'`uptime`. Los tres números de «carga media» son el promedio de 1, 5 y 15 minutos. Esta computadora tiene 2 núcleos.',
       ok:function(s,u){return u.uso('uptime')}},
      {id:'culpable',texto:'Descubre con `top` (o con `ps aux`) qué proceso usa casi todo el procesador.',pista:'`top` ordena por uso de procesador: el primero de la lista es el culpable. También: `ps aux --sort=-%cpu | head -5`.',
       ok:function(s,u){return (u.uso('top')||u.uso('htop')||u.uso('ps'))&&/python3|reporte\.py/.test(u.salida)}},
      {id:'kill',texto:'Termina ese proceso con `kill` y su PID.',pista:'Su PID es el número de la primera columna de top (o la segunda de ps aux): `kill 2290`.',
       ok:function(s){return !s.proceso('reporte.py')}},
      {id:'comprobar',texto:'Comprueba que ya no está, con `ps aux` y `grep`.',pista:'`ps aux | grep reporte`. Si no sale nada, ya no existe.',
       ok:function(s,u){return u.uso('ps')&&u.uso('grep',/reporte|python/)&&!s.proceso('reporte.py')}},
      {id:'fondo',texto:'Deja una tarea en segundo plano con `sleep 300 &` y mírala con `jobs`.',pista:'`sleep 300 &` (la & la manda al fondo) y después `jobs`.',
       ok:function(s,u){return u.uso('jobs')&&s.trabajos.some(function(j){return !j.hecho})}},
      {id:'killjob',texto:'Termina esa tarea con `kill %1`.',pista:'`kill %1`: el % indica número de tarea, no de proceso.',
       ok:function(s,u){return u.uso('kill',/%\d/)&&!s.procesos.some(function(p){return p.nombre==='sleep'})}},
      {id:'free',texto:'Revisa cuánta memoria hay disponible.',pista:'`free -h`. Fíjate en la columna «disponible».',
       ok:function(s,u){return u.uso('free')}},
      {id:'df',texto:'Revisa cuánto espacio queda en el disco.',pista:'`df -h`. La línea que termina en `/` es el disco principal.',
       ok:function(s,u){return u.uso('df')}}
    ]
  });
};

/* ---------- Demo 2: encendido y habilitado ---------- */
AT.labs['pr-arranque']=function(raiz){
  var BASE=[
    {n:'ssh',d:'Acceso remoto',act:true,hab:true},
    {n:'nginx',d:'Servidor web',act:true,hab:false},
    {n:'cron',d:'Tareas programadas',act:true,hab:true},
    {n:'cups',d:'Impresión',act:false,hab:true}
  ];
  var sv,reinicios,lista=$('#paLista',raiz);
  function copiar(){sv=BASE.map(function(x){return {n:x.n,d:x.d,act:x.act,hab:x.hab}});reinicios=0}
  function pintar(){
    lista.innerHTML=sv.map(function(s,i){
      var est=s.act?(s.hab?'Encendido y habilitado':'Encendido, pero no arranca solo'):(s.hab?'Apagado, pero arranca solo':'Apagado y deshabilitado');
      return '<li class="pa-s'+(s.act?' on':'')+'"><div class="pa-n"><b class="mono">'+esc(s.n)+'</b><span>'+esc(s.d)+'</span><small>'+est+'</small></div>'+
        '<button type="button" class="pa-t" data-i="'+i+'" data-k="act" aria-pressed="'+s.act+'"><span class="pa-sw" aria-hidden="true"></span><span>Encendido ahora</span><span class="vh"> ('+esc(s.n)+')</span></button>'+
        '<button type="button" class="pa-t" data-i="'+i+'" data-k="hab" aria-pressed="'+s.hab+'"><span class="pa-sw" aria-hidden="true"></span><span>Arranca al encender</span><span class="vh"> ('+esc(s.n)+')</span></button></li>';
    }).join('');
    $('#paAct',raiz).textContent=sv.filter(function(s){return s.act}).length+' de '+sv.length;
    $('#paHab',raiz).textContent=sv.filter(function(s){return s.hab}).length+' de '+sv.length;
    $('#paRei',raiz).textContent=String(reinicios);
  }
  function msg(k,t){$('#paStat',raiz).setAttribute('data-k',k);$('#paMsg',raiz).textContent=t}
  lista.addEventListener('click',function(e){
    var b=e.target.closest('.pa-t');if(!b)return;
    var s=sv[+b.getAttribute('data-i')],k=b.getAttribute('data-k');
    s[k]=!s[k];
    var c=k==='act'?(s.act?'start':'stop'):(s.hab?'enable':'disable');
    $('#paCmd',raiz).innerHTML='Comando: <code>sudo systemctl '+c+' '+esc(s.n)+'</code>';
    pintar();
    var f=lista.querySelector('.pa-t[data-i="'+b.getAttribute('data-i')+'"][data-k="'+k+'"]');if(f)f.focus();
    msg('',k==='act'?(s.act?s.n+' quedó encendido ahora.':s.n+' quedó apagado ahora.')+(s.act!==s.hab?' Ojo: al reiniciar, '+(s.hab?'volverá a arrancar.':'no arrancará.'):' Al reiniciar quedará igual.'):
      (s.hab?s.n+' arrancará solo en el siguiente encendido.':s.n+' ya no arrancará solo al encender.')+(s.act?' Ahora sigue encendido.':' Ahora sigue apagado.'));
  });
  $('#paReinicio',raiz).addEventListener('click',function(){
    var apagados=[],encendidos=[];
    sv.forEach(function(s){if(s.act&&!s.hab)apagados.push(s.n);if(!s.act&&s.hab)encendidos.push(s.n);s.act=s.hab});
    reinicios++;
    $('#paCmd',raiz).innerHTML='Comando: <code>sudo reboot</code>';
    pintar();
    if(!apagados.length&&!encendidos.length)msg('good','Reiniciaste y nada cambió: todo lo encendido también estaba habilitado. Así debe quedar un servidor.');
    else msg('warn',(apagados.length?apagados.join(' y ')+(apagados.length>1?' estaban encendidos':' estaba encendido')+' pero no habilitado'+(apagados.length>1?'s':'')+': al reiniciar se quedó apagado. ':'')+
      (encendidos.length?encendidos.join(' y ')+(encendidos.length>1?' estaban apagados':' estaba apagado')+' pero habilitado'+(encendidos.length>1?'s':'')+': arrancó solo.':''));
  });
  $('#paReset',raiz).addEventListener('click',function(){copiar();pintar();$('#paCmd',raiz).textContent='';msg('','nginx está encendido, pero nadie lo habilitó. ¿Qué crees que pasará al reiniciar?')});
  copiar();pintar();
  msg('','nginx está encendido, pero nadie lo habilitó. ¿Qué crees que pasará al reiniciar?');
};

/* ---------- Demo 3: nadie se puede conectar ---------- */
AT.labs['pr-servicio']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'pr-servicio',
    host:'servidor',
    sugerencias:['systemctl status ssh','journalctl -u ssh','ss -tln'],
    preparar:function(s){
      var hace=new Date(Date.now()-62*3600e3);
      s.usuarioNuevo('luis',{grupos:['sudo']});s.crearCasa('luis');
      var v=s.servicio('ssh');
      s.log('ssh','sshd[611]: Received signal 15; terminating.',hace);
      s.detener(v);v.habilitado=false;v.desde=hace;
      s.diario.forEach(function(e){if(e.u==='ssh'&&Date.now()-e.f<60000)e.f=hace});
      var a=s.nodo('/var/log/auth.log'),l=function(d,t){return 'nov '+('0'+d.getDate()).slice(-2)+' '+d.toTimeString().slice(0,8)+' servidor '+t+'\n'};
      a.c+=l(new Date(hace-60e3),'sudo:     luis : TTY=pts/1 ; PWD=/home/luis ; USER=root ; COMMAND=/usr/bin/systemctl stop ssh')+
        l(hace,'sudo:     luis : TTY=pts/1 ; PWD=/home/luis ; USER=root ; COMMAND=/usr/bin/systemctl disable ssh');
    },
    tareas:[
      {id:'status',texto:'Revisa el estado del servicio `ssh`.',pista:'`systemctl status ssh`. Fíjate en las líneas Loaded y Active.',
       ok:function(s,u){return u.uso('systemctl',/status\s+(ssh|sshd)/)}},
      {id:'journal',texto:'Lee sus registros para ver cuándo se detuvo.',pista:'`journalctl -u ssh`. La línea «Received signal 15» dice que alguien le pidió terminar.',
       ok:function(s,u){return u.uso('journalctl',/-u\s*(ssh|sshd)/)}},
      {id:'start',texto:'Enciéndelo.',pista:'`sudo systemctl start ssh`.',
       ok:function(s){return s.servicio('ssh').activo}},
      {id:'enable',texto:'Haz que arranque solo cada vez que se encienda el servidor.',pista:'`sudo systemctl enable ssh`. Revisa que en Loaded ahora diga enabled.',
       ok:function(s){return s.servicio('ssh').habilitado}},
      {id:'puerto',texto:'Comprueba que ya espera conexiones en el puerto 22.',pista:'`ss -tln` lista los puertos que esperan conexiones. Busca `:22`.',
       ok:function(s,u){return u.uso('ss')&&/:22\b/.test(u.salida)}},
      {id:'quien',texto:'Averigua en `/var/log/auth.log` quién lo apagó.',pista:'`grep systemctl /var/log/auth.log`. El nombre que aparece después de «sudo:» es quien lo hizo.',
       ok:function(s,u){return /auth\.log/.test(u.linea)&&/stop ssh/.test(u.salida)}},
      {id:'cron',texto:'Por si acaso, reinicia también el servicio `cron`.',pista:'`sudo systemctl restart cron` y luego `systemctl status cron`.',
       ok:function(s,u){return u.uso('systemctl',/restart\s+cron/)&&s.servicio('cron').activo}}
    ]
  });
};
})();
