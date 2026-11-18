/* Laboratorios de la lección «Archivos, permisos y usuarios». Cada uno se registra en AT.labs con el nombre
   de su bloque «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en permisos.html).
   Los de práctica usan la terminal simulada (assets/js/terminal.js): cada ejercicio se califica solo. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: calculadora de permisos ---------- */
AT.labs['pm-calc']=function(raiz){
  var Q=[['u','Dueño','El dueño'],['g','Grupo','El grupo'],['o','Otros','Los demás']],P=[['r',4,'leer'],['w',2,'escribir'],['x',1,'ejecutar']];
  var QUE={f:{r:'leer su contenido',w:'modificarlo',x:'ejecutarlo como programa'},d:{r:'ver la lista de lo que tiene',w:'crear y borrar cosas adentro',x:'entrar a ella'}};
  var USOS={'644':'Lo normal para documentos: tú los cambias y los demás solo los leen.','600':'Privado: solo tú puedes leerlo y cambiarlo. Ideal para claves y llaves.',
    '755':'Lo normal para programas, scripts y carpetas públicas.','700':'Solo tuyo: nadie más puede ni asomarse.','770':'De equipo: tú y tu grupo pueden todo; los demás, nada.',
    '750':'Tu grupo puede usarlo pero no cambiarlo; los demás, nada.','640':'Configuración con datos delicados: tú la cambias y tu grupo la lee.','444':'Solo lectura para todos, incluso para ti.','400':'Solo tú puedes leerlo, y nadie puede cambiarlo.'};
  var modo=0o644,tipo='f',cuerpo=$('#pcCuerpo',raiz),num=$('#pcNum',raiz);
  cuerpo.innerHTML=Q.map(function(q){
    return '<tr><th scope="row">'+q[1]+'</th>'+P.map(function(p){
      return '<td><input type="checkbox" class="pc-c" data-q="'+q[0]+'" data-p="'+p[0]+'" aria-label="'+q[1]+': '+p[2]+'"></td>';
    }).join('')+'<td class="pc-s" data-s="'+q[0]+'"></td></tr>';
  }).join('');
  function bits(q){return (modo>>({u:6,g:3,o:0}[q]))&7}
  function letras(){var s=tipo==='d'?'d':'-';Q.forEach(function(q){var b=bits(q[0]);s+=(b&4?'r':'-')+(b&2?'w':'-')+(b&1?'x':'-')});return s}
  function simbolico(){return Q.map(function(q){var b=bits(q[0]);return q[0]+'='+(b&4?'r':'')+(b&2?'w':'')+(b&1?'x':'')}).join(',')}
  function frase(q){
    var b=bits(q[0]),cosas=P.filter(function(p){return b&p[1]}).map(function(p){return QUE[tipo][p[0]]});
    var pl=q[0]==='o';
    if(!cosas.length)return q[2]+(pl?' no pueden hacer nada.':' no puede hacer nada.');
    return q[2]+(pl?' pueden ':' puede ')+(cosas.length>1?cosas.slice(0,-1).join(', ')+' y '+cosas[cosas.length-1]:cosas[0])+'.';
  }
  function pintar(deNumero){
    var n=('00'+modo.toString(8)).slice(-3),nom=tipo==='d'?'carpeta':'archivo';
    $$('.pc-c',raiz).forEach(function(c){c.checked=!!(bits(c.getAttribute('data-q'))&{r:4,w:2,x:1}[c.getAttribute('data-p')])});
    $$('.pc-s',raiz).forEach(function(td){td.textContent=String(bits(td.getAttribute('data-s')))});
    if(!deNumero){num.value=n;num.removeAttribute('aria-invalid')}
    $('#pcLetras',raiz).textContent=letras();
    $('#pcCmdN',raiz).textContent='chmod '+n+' '+nom;
    $('#pcCmdL',raiz).textContent='chmod '+simbolico()+' '+nom;
    $('#pcQue',raiz).innerHTML=Q.map(function(q){return '<li>'+esc(frase(q))+'</li>'}).join('');
    AT.setPressed($('#pcPre',raiz),function(b){return b.getAttribute('data-v')===n});
    var k='good',m=USOS[n]||'Una combinación poco común: revisa que sea lo que necesitas.';
    var u=bits('u'),g=bits('g'),o=bits('o');
    if(o&2){k='bad';m=n==='777'?'El permiso más abierto: cualquier usuario y cualquier programa de la computadora puede cambiarlo o borrar lo que tiene. Casi nunca es la solución correcta.':
      'Cualquier usuario de la computadora puede '+(tipo==='d'?'crear y borrar archivos en ella':'cambiarlo')+'. Es un riesgo de seguridad.'}
    else if(tipo==='d'&&[u,g,o].some(function(b){return (b&4)&&!(b&1)})){k='warn';m='Con r pero sin x se pueden ver los nombres de lo que hay, pero no entrar ni abrir nada. A una carpeta casi siempre se le da r junto con x.'}
    else if(tipo==='d'&&[u,g,o].some(function(b){return (b&2)&&!(b&1)})){k='warn';m='w sin x no sirve en una carpeta: para crear o borrar algo adentro también hay que poder entrar.'}
    else if(!(u&4)){k='warn';m='Ni el dueño puede leerlo. Sirve de poco: el dueño siempre puede cambiar los permisos para recuperar el acceso.'}
    else if(tipo==='f'&&(u&1)&&n==='644')m=USOS[n];
    $('#pcStat',raiz).setAttribute('data-k',k);
    $('#pcMsg',raiz).textContent=m;
  }
  cuerpo.addEventListener('change',function(e){
    var c=e.target.closest('.pc-c');if(!c)return;
    var v={r:4,w:2,x:1}[c.getAttribute('data-p')]<<({u:6,g:3,o:0}[c.getAttribute('data-q')]);
    modo=c.checked?modo|v:modo&~v;
    pintar();
  });
  num.addEventListener('input',function(){
    var v=num.value.trim();
    if(/^[0-7]{3}$/.test(v)){modo=parseInt(v,8);num.removeAttribute('aria-invalid');pintar(true)}
    else num.setAttribute('aria-invalid',v.length>=3?'true':'false');
  });
  num.addEventListener('blur',function(){pintar()});
  elegir('#pcPre',function(v){modo=parseInt(v,8);pintar()});
  elegir('#pcTipo',function(v){tipo=v;pintar()});
  pintar();
};

/* ---------- Demo 2: permisos en la práctica ---------- */
AT.labs['pm-practica']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'pm-practica',
    sugerencias:['ls -l','./respaldo.sh','id'],
    archivos:{
      '~/respaldo.sh':{c:'#!/bin/bash\n# Copia tus documentos a la carpeta respaldo\necho "Respaldando Documentos..."\nmkdir -p ~/respaldo\ncp -r ~/Documentos ~/respaldo/\necho "Listo: copia guardada en ~/respaldo"\n',modo:0o644},
      '~/diario.txt':{c:'Querido diario: hoy aprendí a usar la terminal y ya entiendo los permisos.\n',modo:0o664},
      '~/compartido/':{modo:0o755}
    },
    tareas:[
      {id:'ver',texto:'Mira los permisos de los archivos de tu carpeta con `ls -l`.',pista:'`ls -l`. Fíjate en la primera columna: `-rw-r--r--`.',
       ok:function(s,u){return u.uso('ls',/(^|\s)-\w*l/)&&/respaldo\.sh/.test(u.salida)}},
      {id:'negado',texto:'Intenta correr el script con `./respaldo.sh`. ¿Qué pasa?',pista:'Escribe `./respaldo.sh`. Como no tiene la x de ejecutar, el shell se niega.',
       ok:function(s,u){return /respaldo\.sh/.test(u.linea)&&u.codigo===126}},
      {id:'ejecutar',texto:'Dale permiso de ejecución al script y córrelo.',pista:'`chmod +x respaldo.sh` y luego `./respaldo.sh`. Revisa con `ls -l` que ahora tiene x.',
       ok:function(s,u){var n=s.nodo('~/respaldo.sh');return !!n&&!!(n.modo&0o100)&&/Listo/.test(u.salida)}},
      {id:'privado',texto:'Haz que `diario.txt` sea privado: solo tú puedes leerlo y escribirlo.',pista:'`chmod 600 diario.txt` (6 = leer + escribir para ti; 0 para el grupo y los demás).',
       ok:function(s){return s.permisos('~/diario.txt')==='600'}},
      {id:'equipo',texto:'Haz que `compartido` sea una carpeta de equipo: tú y tu grupo pueden todo; los demás, nada.',pista:'`chmod 770 compartido`. 7 = rwx para ti y para tu grupo; 0 para los demás.',
       ok:function(s){return s.permisos('~/compartido')==='770'}},
      {id:'shadow',texto:'Intenta leer `/etc/shadow`, donde están las contraseñas cifradas.',pista:'`cat /etc/shadow`. Con tu usuario normal no se puede: es de root.',
       ok:function(s,u){return /\/etc\/shadow/.test(u.linea)&&u.codigo!==0&&!u.uso('sudo')}},
      {id:'sudo',texto:'Ahora léelo como administrador con `sudo`.',pista:'`sudo cat /etc/shadow` (o `sudo !!` justo después del intento fallido). Escribe cualquier contraseña: no se verá.',
       ok:function(s,u){return u.uso('sudo')&&/shadow/.test(u.linea)&&u.codigo===0&&/root:/.test(u.salida)}},
      {id:'dueno',texto:'Mira de quién es `/etc/shadow` y qué permisos tiene.',pista:'`ls -l /etc/shadow`. Su dueño es root y su grupo es shadow.',
       ok:function(s,u){return u.uso('ls',/shadow/)&&/root shadow/.test(u.salida)}}
    ]
  });
};

/* ---------- Demo 3: una carpeta para el equipo de contabilidad ---------- */
AT.labs['pm-equipo']=function(raiz){
  var C='/srv/contabilidad';
  AT.terminal($('.term-host',raiz),{
    clave:'pm-equipo',
    sugerencias:['id','ls -l /srv','cat /etc/group'],
    tareas:[
      {id:'luis',texto:'Crea el usuario `luis` con `adduser` (te preguntará su contraseña y su nombre).',pista:'`sudo adduser luis`. En «¿Es correcta la información?» solo pulsa Enter.',
       ok:function(s){return !!s.usuarios.luis&&s.existe('/home/luis','d')}},
      {id:'marta',texto:'Crea a `marta` con `useradd`, sin preguntas, pero con su carpeta personal.',pista:'`sudo useradd -m marta`. La `-m` crea /home/marta.',
       ok:function(s){return !!s.usuarios.marta&&s.existe('/home/marta','d')}},
      {id:'grupo',texto:'Crea el grupo `contabilidad`.',pista:'`sudo groupadd contabilidad`.',
       ok:function(s){return !!s.grupos.contabilidad}},
      {id:'miembros',texto:'Agrega a luis y a marta al grupo.',pista:'`sudo usermod -aG contabilidad luis` y lo mismo para marta. Compruébalo con `groups luis`.',
       ok:function(s){return s.enGrupo('luis','contabilidad')&&s.enGrupo('marta','contabilidad')}},
      {id:'carpeta',texto:'Crea la carpeta `/srv/contabilidad`.',pista:'`/srv` es de root: `sudo mkdir /srv/contabilidad`.',
       ok:function(s){return s.existe(C,'d')}},
      {id:'chgrp',texto:'Haz que la carpeta sea del grupo `contabilidad` (el dueño puede seguir siendo root).',pista:'`sudo chown root:contabilidad /srv/contabilidad` o `sudo chgrp contabilidad /srv/contabilidad`.',
       ok:function(s){var n=s.nodo(C);return !!n&&n.g==='contabilidad'}},
      {id:'770',texto:'Dale permisos 770: el dueño y el grupo pueden todo; los demás no pueden ni entrar.',pista:'`sudo chmod 770 /srv/contabilidad`. Revisa con `ls -ld /srv/contabilidad`.',
       ok:function(s){return s.permisos(C)==='770'}},
      {id:'prueba',texto:'Comprueba que marta puede crear un archivo ahí: crea `prueba.txt` como marta.',pista:'`sudo -u marta touch /srv/contabilidad/prueba.txt` y luego `sudo ls -l /srv/contabilidad`. Si después intentas `ls /srv/contabilidad` como ana, verás «Permiso denegado»: ana no es del grupo.',
       ok:function(s){var d=s.nodo(C);if(!d||d.t!=='d')return false;return Object.keys(d.h).some(function(k){return d.h[k].u==='marta'||d.h[k].u==='luis'})}}
    ]
  });
};
})();
