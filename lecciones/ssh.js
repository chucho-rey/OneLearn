/* Laboratorios de la lección «SSH y acceso remoto». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en ssh.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: ¿quién puede entrar? ---------- */
AT.labs['sh-llaves']=function(raiz){
  var quien='tu';
  function pintar(){
    var ak=$('#slAk',raiz).checked,pw=$('#slPw',raiz).checked,P=[],ok=false,st=$('#slStat',raiz),m;
    P.push(['El cliente se conecta al puerto 22 y comprueba la huella del servidor.',0]);
    if(quien==='tu'){
      if(ak){P.push(['El servidor encuentra tu llave pública en authorized_keys y te manda un reto.',0]);P.push(['Tu computadora firma el reto con tu llave privada, que nunca sale de ella.',0]);P.push(['El servidor comprueba la firma con la llave pública: coincide. Entras sin escribir contraseña.',0]);ok=true;m='Entraste con tu llave.'}
      else if(pw){P.push(['Tu llave pública no está en el servidor: la autenticación con llave falla.',1]);P.push(['El servidor permite contraseñas: te pide la tuya y entras.',0]);ok=true;m='Entraste, pero con contraseña. Copia tu llave con ssh-copy-id.'}
      else{P.push(['Tu llave pública no está en el servidor: la autenticación con llave falla.',1]);P.push(['El servidor no acepta contraseñas: «Permission denied (publickey)».',1]);m='Te quedaste fuera: apagaste las contraseñas antes de instalar tu llave. Por eso se instala la llave primero.'}
    }else if(quien==='copia'){
      P.push(['Tiene tu llave pública, pero no la privada: no puede firmar el reto.',1]);
      if(pw){P.push(['Como el servidor acepta contraseñas, puede intentar adivinar la tuya.',1]);m='La llave pública no le sirve para entrar. Pero mientras haya contraseñas, puede intentar adivinarla.'}
      else{P.push(['El servidor no acepta contraseñas: «Permission denied (publickey)».',0]);m='No entra. La llave pública es pública: con ella no se puede entrar.'}
      if(!pw)ok=null;
    }else{
      if(pw){P.push(['El bot prueba usuarios comunes (root, admin, ubuntu) con miles de contraseñas.',1]);P.push(['Si alguna cuenta tiene una contraseña débil, tarde o temprano entra.',1]);m='Mientras haya contraseñas, el servidor está expuesto a que alguien adivine una.'}
      else{P.push(['El bot intenta con una contraseña, pero el servidor solo acepta llaves.',0]);P.push(['«Permission denied (publickey)»: no hay nada que adivinar.',0]);m='Sin contraseñas, los bots no tienen nada que adivinar.';ok=null}
    }
    $('#slPasos',raiz).innerHTML=P.map(function(p){return '<li'+(p[1]?' class="mal"':'')+'>'+esc(p[0])+'</li>'}).join('');
    st.setAttribute('data-k',quien==='tu'?(ok?(ak?'good':'warn'):'bad'):(ok===null?'good':'bad'));
    $('#slMsg',raiz).textContent=m;
  }
  elegir('#slQuien',function(v){quien=v;pintar()});
  $('#slAk',raiz).addEventListener('change',pintar);
  $('#slPw',raiz).addEventListener('change',pintar);
  pintar();
};

/* ---------- Demo 2: entra a un servidor y asegúralo ---------- */
AT.labs['sh-terminal']=function(raiz){
  function srv(s){return s.mundo.porIp('192.168.1.10')}
  function pc(s){return s.mundo.porIp('192.168.1.50')}
  AT.terminal($('.term-host',raiz),{
    clave:'sh-terminal',
    sugerencias:['ssh ana@servidor','ssh-keygen -t ed25519','ssh-copy-id ana@servidor'],
    preparar:function(s){s.poner('/home/ana/reporte.txt','Reporte de ventas de noviembre\nTotal: 48 300\n',{u:'ana',g:'ana',modo:0o644})},
    remotos:[{op:{host:'servidor',usuario:'ana',contrasena:'servidor123',red:{ip:'192.168.1.10',mac:'52:54:00:12:34:56'}}}],
    tareas:[
      {id:'entrar',texto:'Entra al servidor con tu contraseña.',pista:'`ssh ana@servidor`. Acepta la huella con `yes` y escribe servidor123. Para salir: `exit`.',
       ok:function(s,u,t){return t.sis.host==='servidor'}},
      {id:'keygen',texto:'Sal del servidor y crea tu par de llaves en tu PC.',pista:'`exit` y luego `ssh-keygen -t ed25519`. Pulsa Enter en las tres preguntas (sin frase, para la práctica).',
       ok:function(s){var p=pc(s);return !!(p&&p.nodo('/home/ana/.ssh/id_ed25519.pub'))}},
      {id:'copiar',texto:'Copia tu llave pública al servidor.',pista:'`ssh-copy-id ana@servidor`. Pide tu contraseña por última vez.',
       ok:function(s){var r=srv(s);return /ssh-ed25519/.test(r&&r.leer('/home/ana/.ssh/authorized_keys')||'')}},
      {id:'llave',texto:'Entra otra vez: ahora sin contraseña.',pista:'`ssh ana@servidor`. Entra directo, con tu llave.',
       ok:function(s,u,t){var r=srv(s);return t.sis.host==='servidor'&&/Accepted publickey for ana/.test(r.leer('/var/log/auth.log')||'')}},
      {id:'cerrar',texto:'Dentro del servidor, apaga las contraseñas de SSH y reinicia el servicio.',pista:'`echo "PasswordAuthentication no" | sudo tee /etc/ssh/sshd_config.d/seguro.conf` y luego `sudo systemctl restart ssh`. La contraseña de sudo es servidor123.',
       ok:function(s){var r=srv(s),v=r&&r.servicio('ssh');return !!(v&&v.activo&&v.conf&&v.conf.password===false)}},
      {id:'scp',texto:'Sal del servidor y copia reporte.txt a tu carpeta del servidor.',pista:'`exit` y luego `scp reporte.txt ana@servidor:`. Ya no pide contraseña.',
       ok:function(s){var r=srv(s);return !!(r&&r.leer('/home/ana/reporte.txt'))}}
    ]
  });
};
})();
