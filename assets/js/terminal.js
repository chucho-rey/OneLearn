/* OneLearn: terminal Linux simulada para los laboratorios.
   AT.terminal(contenedor, opciones) dibuja una terminal con su propio sistema en memoria: archivos y carpetas
   con dueño, grupo y permisos; usuarios, grupos y sudo; procesos y señales; servicios (systemctl y journalctl);
   paquetes (apt); el editor nano; tuberías (|), redirecciones (>, >>, <, 2>), variables, $(...), alias,
   historial (flechas), Tab para completar y Ctrl+C para interrumpir. Nada sale del navegador.
   Al recargar la página el sistema vuelve a empezar; solo se guardan los ejercicios terminados
   (localStorage, aprende-tecnologia:terminal), que entran en el respaldo.
   opciones:
     clave        nombre de la práctica (para guardar sus ejercicios)
     usuario      usuario con el que se empieza ('ana'); host: nombre del equipo ('ubuntu')
     archivos     {ruta: contenido} archivos extra; una ruta que termina en / es una carpeta
     listas       false si apt nunca ha descargado la lista de paquetes (hay que correr apt update)
     red          {ip, puerta, hosts:{nombre: ip}} para ip, ping y curl
     preparar     function(sis, t) para ajustar el escenario (procesos, servicios, paquetes...)
     tareas       [{id, texto, pista, ok: function(sis, ultimo, t)}] ejercicios que se califican solos
     sugerencias  ['ls -l', ...] comandos que se escriben con un toque
   AT.terminal.comando(nombres, meta, fn) agrega comandos (otras lecciones, como el simulador de red, lo usan).
   Todo lo que escribe el estudiante se muestra con textContent. */
(function(){
'use strict';
var AT=window.AT,esc=AT.esc;
var CLAVE='aprende-tecnologia:terminal';
var MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var DIAS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],DIAS_ES=['dom','lun','mar','mié','jue','vie','sáb'];
var ANTES=new Date(2024,3,22,9,15);

/* ---------- Texto con colores ----------
   La salida lleva marcas \x01<letra>texto\x02. d carpeta, x ejecutable, l enlace, e error, g verde,
   w aviso, m coincidencia, b negritas, h consejo de OneLearn. Al pasar por una tubería o a un archivo se quitan. */
var A='\u0001',Z='\u0002';
function c(k,t){return A+k+t+Z}
function plano(s){return String(s).replace(/\u0001[a-z]/g,'').replace(/\u0002/g,'')}
function pad(s,n,der){s=String(s);var l=plano(s).length;if(l>=n)return s;var r=new Array(n-l+1).join(' ');return der?r+s:s+r}
function dos(n){return (n<10?'0':'')+n}
function bytesDe(s){try{return new TextEncoder().encode(s).length}catch(e){return s.length}}
function coma(n,d){return n.toFixed(d==null?1:d).replace('.',',')}
function humano(n){
  if(n<1024)return String(n);
  var u=['K','M','G','T'],i=-1;
  do{n/=1024;i++}while(n>=1024&&i<u.length-1);
  return (n<10?coma(Math.ceil(n*10)/10):String(Math.ceil(n)))+u[i];
}
function hora(d){return dos(d.getHours())+':'+dos(d.getMinutes())+':'+dos(d.getSeconds())}
function fechaLs(d){
  var vieja=Date.now()-d.getTime()>182*864e5;
  return pad(d.getDate(),2,true)+' '+MESES[d.getMonth()]+' '+(vieja?' '+d.getFullYear():dos(d.getHours())+':'+dos(d.getMinutes()));
}
function fechaLog(d){return MESES[d.getMonth()]+' '+dos(d.getDate())+' '+hora(d)}
function fechaSd(d){return DIAS[d.getDay()]+' '+d.getFullYear()+'-'+dos(d.getMonth()+1)+'-'+dos(d.getDate())+' '+hora(d)+' CST'}
function hace(d){
  var s=Math.max(1,Math.round((Date.now()-d.getTime())/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),dd=Math.floor(h/24);
  if(dd)return dd+' day'+(dd>1?'s':'')+' '+(h%24)+'h ago';
  if(h)return h+'h '+m+'min ago';
  if(m)return m+'min '+(s%60)+'s ago';
  return s+'s ago';
}
function dirname(ab){var i=ab.lastIndexOf('/');return i<=0?'/':ab.slice(0,i)}
function basename(ab){return ab.split('/').filter(Boolean).pop()||'/'}
function unir(a,b){return a===''?b:a==='/'?'/'+b:a+'/'+b}
function ordenar(a,b){
  var x=a.replace(/^\.+/,''),y=b.replace(/^\.+/,'');
  return x.localeCompare(y,'es',{sensitivity:'base'})||a.localeCompare(b);
}
/* Patrón con * y ? (como en el shell) a expresión regular; \ escapa */
function patronRe(p,i){
  var r='';
  for(var k=0;k<p.length;k++){
    var ch=p[k];
    if(ch==='\\'&&k+1<p.length){r+=p[++k].replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&');continue}
    r+=ch==='*'?'.*':ch==='?'?'.':ch.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&');
  }
  return new RegExp('^'+r+'$',i?'i':'');
}
/* Opciones de un comando: -la, -n 5, --sort=x, -- */
function opts(args,conValor){
  var f={},pos=[],val={},largo={};
  for(var i=1;i<args.length;i++){
    var a=args[i];
    if(a==='--'){pos=pos.concat(args.slice(i+1));break}
    if(/^--./.test(a)){var k=a.slice(2).split('=');largo[k[0]]=k.length>1?k.slice(1).join('='):true;continue}
    if(/^-[^-]/.test(a)&&!/^-\d/.test(a)){
      for(var j=1;j<a.length;j++){
        var ch=a[j];
        if(conValor&&conValor.indexOf(ch)>=0){val[ch]=a.slice(j+1)||args[++i]||'';break}
        f[ch]=true;
      }
      continue;
    }
    pos.push(a);
  }
  return {f:f,pos:pos,val:val,largo:largo};
}
function nodoD(u,g,m,f){return {t:'d',u:u,g:g,modo:m,h:{},m:f||new Date()}}
function nodoF(u,g,m,txt,f){return {t:'f',u:u,g:g,modo:m,c:txt||'',m:f||new Date()}}

/* ---------- Paquetes que conoce apt ---------- */
var PAQ={
  tree:{v:'2.1.1-2ubuntu3',sec:'universe/utils',tam:47.7,ocupa:116,desc:'muestra el contenido de las carpetas como un árbol',cmds:['tree']},
  htop:{v:'3.3.0-4build1',sec:'main/utils',tam:171,ocupa:434,desc:'visor interactivo de procesos, con colores y barras',cmds:['htop'],deps:['libnl-3-200','libnl-genl-3-200']},
  'libnl-3-200':{v:'3.7.0-0.3build1.1',sec:'main/libs',tam:60.4,ocupa:207,desc:'biblioteca para hablar con el kernel por netlink',dep:true},
  'libnl-genl-3-200':{v:'3.7.0-0.3build1.1',sec:'main/libs',tam:12.2,ocupa:62,desc:'biblioteca netlink genérica',dep:true},
  cowsay:{v:'3.03+dfsg2-8',sec:'universe/games',tam:18.6,ocupa:93,desc:'una vaca que dice lo que le escribas',cmds:['cowsay']},
  git:{v:'1:2.43.0-1ubuntu7.1',sec:'main/vcs',tam:3679,ocupa:21900,desc:'sistema de control de versiones distribuido',cmds:['git'],deps:['git-man','liberror-perl']},
  'git-man':{v:'1:2.43.0-1ubuntu7.1',sec:'main/doc',tam:1100,ocupa:2531,desc:'manuales de git',dep:true},
  'liberror-perl':{v:'0.17029-2',sec:'main/perl',tam:25.6,ocupa:79,desc:'manejo de errores para Perl',dep:true},
  nginx:{v:'1.24.0-2ubuntu7.1',sec:'main/httpd',tam:520,ocupa:1497,desc:'servidor web pequeño, potente y escalable',cmds:['nginx'],deps:['nginx-common'],servicio:'nginx'},
  'nginx-common':{v:'1.24.0-2ubuntu7.1',sec:'main/httpd',tam:43.4,ocupa:184,desc:'archivos comunes de nginx',dep:true},
  traceroute:{v:'1:2.1.5-1',sec:'universe/net',tam:45.6,ocupa:154,desc:'muestra el camino que siguen los paquetes por la red',cmds:['traceroute']},
  'net-tools':{v:'2.10-0.1ubuntu4',sec:'main/net',tam:204,ocupa:812,desc:'herramientas de red antiguas: ifconfig, netstat y route',cmds:['ifconfig']},
  curl:{v:'8.5.0-2ubuntu10.4',nueva:'8.5.0-2ubuntu10.5',sec:'main/web',tam:226,ocupa:534,desc:'descarga y envía datos por HTTP y otros protocolos',cmds:['curl'],base:true},
  openssl:{v:'3.0.13-0ubuntu3.4',nueva:'3.0.13-0ubuntu3.5',sec:'main/utils',tam:1003,ocupa:2177,desc:'herramientas de cifrado TLS',base:true},
  tzdata:{v:'2024a-3ubuntu1.1',nueva:'2024b-0ubuntu0.24.04',sec:'main/localization',tam:274,ocupa:1400,desc:'zonas horarias del mundo',base:true},
  python3:{v:'3.12.3-0ubuntu2',sec:'main/python',tam:23.9,ocupa:89,desc:'el lenguaje Python 3',cmds:['python3'],base:true},
  'openssh-server':{v:'1:9.6p1-3ubuntu13.5',sec:'main/net',tam:509,ocupa:2011,desc:'servidor de SSH para entrar a esta computadora desde otra',servicio:'ssh',base:true},
  ufw:{v:'0.36.2-6',sec:'main/admin',tam:169,ocupa:880,desc:'firewall sencillo',base:true},
  nano:{v:'7.2-2build1',sec:'main/editors',tam:280,ocupa:881,desc:'editor de texto pequeño y fácil de usar',cmds:['nano'],base:true}
};

/* ---------- El sistema: archivos, usuarios, procesos, servicios y paquetes ---------- */
function Sistema(op){
  var s=this;
  s.host=op.host||'ubuntu';
  s.red={iface:'enp0s3',ip:'192.168.1.50',bits:24,puerta:'192.168.1.1',mac:'08:00:27:3a:5c:91',hosts:{},arriba:true,internet:true,dhcp:true,
    vecinos:{'192.168.1.1':'c8:3a:35:1b:92:e0','192.168.1.20':'3c:52:82:4f:aa:10'},rutas:[],detras:{},dns:{},web:{},tls:{},ip6:'2001:db8:4a1:20::50',conocidos:{}};
  if(op.red)Object.keys(op.red).forEach(function(k){s.red[k]=op.red[k]});
  if(!op.red||!('salida' in op.red))s.red.salida=s.red.puerta;
  s.red.ipDhcp=s.red.ip;
  if(s.red.vecinos[s.red.puerta])s.red.conocidos[s.red.puerta]=s.red.vecinos[s.red.puerta];
  s.mundo={sistemas:[s],porIp:function(ip){for(var i=0;i<this.sistemas.length;i++){var o=this.sistemas[i];if(o.red.ip===ip&&o.red.arriba)return o}return null}};
  s.ufw={activo:false,entrada:'deny',reglas:[]};s.crontabs={};s.sudoHasta=0;
  s.usuarios={};s.grupos={};s.procesos=[];s.servicios={};s.paquetes={};s.diario=[];s.trabajos=[];
  s.sigPid=2301;s.listas=op.listas!==false;
  s.arranque=Date.now()-(3*86400+2*3600+14*60)*1000;
  s.alias={ll:'ls -alF',la:'ls -A',l:'ls -CF'};
  [['root',0],['daemon',1],['adm',4],['sudo',27],['www-data',33],['shadow',42],['users',100],['syslog',106],['systemd-journal',999]].forEach(function(g){s.grupos[g[0]]={gid:g[1]}});
  s.usuarios.root={uid:0,home:'/root',shell:'/bin/bash',grupos:['root'],nombre:'root',clave:null};
  s.usuarios.daemon={uid:1,home:'/usr/sbin',shell:'/usr/sbin/nologin',grupos:['daemon'],nombre:'daemon',sistema:true};
  s.usuarios['www-data']={uid:33,home:'/var/www',shell:'/usr/sbin/nologin',grupos:['www-data'],nombre:'www-data',sistema:true};
  s.usuarios.syslog={uid:104,home:'/nonexistent',shell:'/usr/sbin/nologin',grupos:['syslog','adm'],nombre:'',sistema:true};
  s.raiz=nodoD('root','root',0o755,ANTES);
  var yo=op.usuario||'ana';
  s.yo=yo;

  /* Carpetas del sistema */
  ['boot','etc','home','media','mnt','opt','proc','run','srv','sys','usr/bin','usr/lib','usr/sbin','usr/share','var/lib','var/log','var/cache','var/backups'].forEach(function(d){s.poner('/'+d+'/')});
  s.poner('/root/',null,{modo:0o700});
  s.poner('/tmp/',null,{modo:0o1777,f:new Date()});
  s.poner('/var/tmp/',null,{modo:0o1777});
  [['bin','usr/bin'],['lib','usr/lib'],['sbin','usr/sbin']].forEach(function(l){s.raiz.h[l[0]]={t:'l',u:'root',g:'root',modo:0o777,dest:'/'+l[1],txt:l[1],m:ANTES}});
  s.poner('/dev/');
  s.buscar('/dev','root').n.h['null']={t:'c',u:'root',g:'root',modo:0o666,m:ANTES,num:'1, 3'};
  s.poner('/etc/hostname',s.host+'\n');
  s.poner('/etc/hosts','127.0.0.1 localhost\n127.0.1.1 '+s.host+'\n\n# Las siguientes líneas son para equipos con IPv6\n::1     ip6-localhost ip6-loopback\n');
  s.poner('/etc/os-release','PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04.1 LTS (Noble Numbat)"\nVERSION_CODENAME=noble\nID=ubuntu\nID_LIKE=debian\nHOME_URL="https://www.ubuntu.com/"\n');
  s.poner('/etc/passwd',null,{gen:function(){return Object.keys(s.usuarios).map(function(n){var u=s.usuarios[n];return n+':x:'+u.uid+':'+s.grupos[u.grupos[0]].gid+':'+(u.nombre||'')+(u.uid>=1000&&u.uid<65534?',,,':'')+':'+u.home+':'+u.shell}).join('\n')+'\n'}});
  s.poner('/etc/group',null,{gen:function(){return Object.keys(s.grupos).map(function(g){return g+':x:'+s.grupos[g].gid+':'+s.miembros(g).join(',')}).join('\n')+'\n'}});
  s.poner('/etc/shadow',null,{g:'shadow',modo:0o640,gen:function(){return Object.keys(s.usuarios).map(function(n){var u=s.usuarios[n];return n+':'+(u.uid>=1000?'$y$j9T$Lq0f6w3mFQ5i8r1b$k3Z.Wm7dTq9Xv2NpYc1Hs8Ej4Ra6Uo0Gl5Bf2Ki9Dx7':u.uid===0?'*':'!*')+':20000:0:99999:7:::'}).join('\n')+'\n'}});
  s.poner('/etc/sudoers','# Lo que puede hacer cada quien con sudo. Edítalo solo con: sudo visudo\nroot    ALL=(ALL:ALL) ALL\n\n# Los miembros del grupo sudo pueden ejecutar cualquier comando\n%sudo   ALL=(ALL:ALL) ALL\n',{modo:0o440});
  s.poner('/etc/ssh/sshd_config','# Configuración del servidor SSH. Cambios: sudo nano /etc/ssh/sshd_config\nInclude /etc/ssh/sshd_config.d/*.conf\n\n#Port 22\n#PermitRootLogin prohibit-password\nPasswordAuthentication yes\nKbdInteractiveAuthentication no\nUsePAM yes\nX11Forwarding yes\nPrintMotd no\nSubsystem\tsftp\t/usr/lib/openssh/sftp-server\n');
  s.poner('/etc/crontab','# /etc/crontab: tareas programadas del sistema\nSHELL=/bin/sh\n# m h dom mon dow user\tcommand\n17 *\t* * *\troot\tcd / && run-parts --report /etc/cron.hourly\n25 6\t* * *\troot\ttest -x /usr/sbin/anacron || run-parts --report /etc/cron.daily\n');
  s.poner('/etc/apt/sources.list.d/ubuntu.sources','Types: deb\nURIs: http://mx.archive.ubuntu.com/ubuntu/\nSuites: noble noble-updates noble-backports\nComponents: main restricted universe multiverse\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n\nTypes: deb\nURIs: http://security.ubuntu.com/ubuntu/\nSuites: noble-security\nComponents: main restricted universe multiverse\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n');
  s.poner('/etc/resolv.conf','# Lo administra systemd-resolved: los programas preguntan a 127.0.0.53, que reenvía\n# las consultas a los servidores DNS de la red. Para ver cuáles: resolvectl status\nnameserver 127.0.0.53\noptions edns0 trust-ad\nsearch .\n');
  s.poner('/etc/netplan/50-cloud-init.yaml','network:\n  version: 2\n  ethernets:\n    '+s.red.iface+':\n      dhcp4: true\n',{modo:0o600});
  s.poner('/etc/fstab','# <file system> <mount point> <type> <options> <dump> <pass>\n/dev/disk/by-uuid/5b1e2c1a-7f3d-4c8e-9a1b-2d6e8f0a4c11 / ext4 defaults 0 1\n/dev/disk/by-uuid/9C3A-1F2B /boot/efi vfat defaults 0 1\n/swap.img\tnone\tswap\tsw\t0\t0\n');
  s.poner('/root/.bashrc','# ~/.bashrc del administrador\nalias ll=\'ls -alF\'\n',{modo:0o644});
  var ahora=Date.now(),hh=function(h,m){return new Date(ahora-((h*60+(m||0))*60e3))};
  s.poner('/var/log/syslog',[
    [hh(2,20),'systemd[1]: Started cron.service - Regular background program processing daemon.'],
    [hh(2,20),'systemd[1]: Started ssh.service - OpenBSD Secure Shell server.'],
    [hh(1,5),'CRON[1874]: (root) CMD (cd / && run-parts --report /etc/cron.hourly)'],
    [hh(0,40),'kernel: [ 9120.551220] enp0s3: Link is Up - 1000Mbps/Full - flow control rx/tx'],
    [hh(0,5),'CRON[2210]: (root) CMD (cd / && run-parts --report /etc/cron.hourly)']].map(function(l){return fechaLog(l[0])+' '+s.host+' '+l[1]}).join('\n')+'\n',{u:'syslog',g:'adm',modo:0o640});
  s.poner('/var/log/auth.log',[
    [hh(2,10),'sshd[1102]: Accepted password for '+yo+' from 192.168.1.20 port 51234 ssh2'],
    [hh(1,30),'sudo:      '+yo+' : TTY=pts/0 ; PWD=/home/'+yo+' ; USER=root ; COMMAND=/usr/bin/apt update'],
    [hh(0,50),'sshd[1990]: Failed password for invalid user admin from 203.0.113.77 port 40112 ssh2'],
    [hh(0,49),'sshd[1990]: Failed password for invalid user admin from 203.0.113.77 port 40118 ssh2'],
    [hh(0,49),'sshd[1993]: Failed password for root from 203.0.113.77 port 40130 ssh2']].map(function(l){return fechaLog(l[0])+' '+s.host+' '+l[1]}).join('\n')+'\n',{u:'syslog',g:'adm',modo:0o640});

  /* Usuario del estudiante y su carpeta personal */
  s.usuarioNuevo(yo,{uid:1000,grupos:['adm','sudo','users'],nombre:op.nombre||(yo.charAt(0).toUpperCase()+yo.slice(1)),clave:op.contrasena||null});
  s.crearCasa(yo,hh(72));
  ['Documentos','Descargas','Escritorio'].forEach(function(d){s.poner('/home/'+yo+'/'+d+'/',null,{u:yo,g:yo,modo:0o755,f:hh(70)})});
  s.poner('/home/'+yo+'/notas.txt','Pendientes de esta semana:\n- Repasar la lección de redes\n- Comprar café\n- Llamar a soporte por la impresora\n',{u:yo,g:yo,modo:0o664,f:hh(5,12)});

  /* Paquetes instalados de fábrica */
  Object.keys(PAQ).forEach(function(n){if(PAQ[n].base)s.paquetes[n]={v:PAQ[n].v,manual:true}});

  /* Procesos y servicios de fábrica */
  s.proc({pid:1,cmd:'/sbin/init splash',nombre:'systemd',stat:'Ss',mem:0.3,ppid:0});
  s.proc({pid:2,cmd:'[kthreadd]',stat:'S',mem:0,ppid:0});
  s.proc({pid:318,cmd:'/usr/lib/systemd/systemd-journald',stat:'Ss',mem:0.4});
  s.proc({pid:352,cmd:'/usr/lib/systemd/systemd-udevd',stat:'Ss',mem:0.2});
  s.proc({pid:590,cmd:'/usr/lib/systemd/systemd-resolved',u:'systemd-resolve',stat:'Ss',mem:0.3});
  s.servicio('cron',{desc:'Regular background program processing daemon',cmd:'/usr/sbin/cron -f -P',activo:true,habilitado:true,pid:603,mem:'0.4M'});
  s.servicio('ssh',{validar:function(s2){return {conf:sshdConf(s2)}},desc:'OpenBSD Secure Shell server',cmd:'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups',nombreProc:'sshd',activo:true,habilitado:true,pid:611,puertos:[22],alias:['sshd'],mem:'2.3M',paquete:'openssh-server'});
  s.servicio('rsyslog',{desc:'System Logging Service',cmd:'/usr/sbin/rsyslogd -n -iNONE',nombreProc:'rsyslogd',u:'syslog',activo:true,habilitado:true,pid:702,mem:'1.1M',alias:['syslog']});
  s.servicio('systemd-resolved',{desc:'Network Name Resolution',cmd:'/usr/lib/systemd/systemd-resolved',activo:true,habilitado:true,sinProc:true,mem:'5.6M',puertos:[]});
  s.servicio('ufw',{desc:'Uncomplicated firewall',tipo:'oneshot',activo:true,habilitado:true,sinProc:true,paquete:'ufw'});
  s.shellPid=1120;
  s.proc({pid:1120,cmd:'-bash',nombre:'bash',u:yo,stat:'Ss',mem:0.1,ppid:1102,inicio:hh(2,10)});

  /* Archivos y carpetas extra de la práctica */
  var ex=op.archivos||{};
  Object.keys(ex).forEach(function(r){
    var v=ex[r],o={};
    if(v&&typeof v==='object'&&!Array.isArray(v)){o=v;v=v.c}
    var ru=r.replace(/^~/,'/home/'+yo);
    var enCasa=ru.indexOf('/home/'+yo+'/')===0;
    s.poner(ru,/\/$/.test(ru)?null:(v||''),{pu:enCasa?yo:'root',u:o.u||(enCasa?yo:'root'),g:o.g||(enCasa?yo:'root'),modo:o.modo!=null?o.modo:/\/$/.test(ru)?0o755:(enCasa?0o664:0o644),f:o.f||hh(o.horas||3)});
  });
  s.binarios();
}
var S=Sistema.prototype;
/* Crea una ruta sin revisar permisos (para preparar el escenario). Las carpetas intermedias son de root. */
S.poner=function(ruta,txt,o){
  o=o||{};
  var partes=ruta.split('/').filter(Boolean),n=this.raiz,dir=/\/$/.test(ruta)||txt===null&&!o.gen;
  for(var i=0;i<partes.length;i++){
    var ult=i===partes.length-1,nom=partes[i];
    if(ult&&!dir){
      var f=nodoF(o.u||'root',o.g||o.u||'root',o.modo!=null?o.modo:0o644,txt||'',o.f||ANTES);
      if(o.gen)f.gen=o.gen;
      n.h[nom]=f;return f;
    }
    if(!n.h[nom])n.h[nom]=ult?nodoD(o.u||'root',o.g||o.u||'root',o.modo!=null?o.modo:0o755,o.f||ANTES):nodoD(o.pu||'root',o.pu||'root',0o755,o.f||ANTES);
    n=n.h[nom];
    if(n.t==='l')n=this.destino(n);
  }
  return n;
};
S.binarios=function(){
  var s=this;
  Object.keys(CMD).forEach(function(n){
    var m=CMD[n];
    if(m.interna||n.indexOf('.')>=0)return;
    if(m.paquete&&!s.paquetes[m.paquete])return;
    s.poner((m.sbin?'/usr/sbin/':'/usr/bin/')+n,'\u007fELF\u0002\u0001\u0001 (programa compilado: no es texto)\n',{modo:0o755});
  });
};
S.home=function(u){var x=this.usuarios[u];return x?x.home:'/'};
S.grupoPrin=function(u){var x=this.usuarios[u];return x?x.grupos[0]:u};
S.enGrupo=function(u,g){var x=this.usuarios[u];return !!x&&x.grupos.indexOf(g)>=0};
S.miembros=function(g){var s=this;return Object.keys(s.usuarios).filter(function(n){var u=s.usuarios[n];return u.grupos.indexOf(g)>0})};
S.sigId=function(m){var max=999;for(var k in m)if((m[k].uid!=null?m[k].uid:m[k].gid)<60000)max=Math.max(max,m[k].uid!=null?m[k].uid:m[k].gid);return max+1};
S.usuarioNuevo=function(n,o){
  o=o||{};
  var uid=o.uid!=null?o.uid:this.sigId(this.usuarios);
  if(!this.grupos[n])this.grupos[n]={gid:uid};
  var g=[n];(o.grupos||[]).forEach(function(x){if(g.indexOf(x)<0)g.push(x)});
  this.usuarios[n]={uid:uid,home:o.home||'/home/'+n,shell:o.shell||'/bin/bash',grupos:g,nombre:o.nombre||'',clave:o.clave||null};
  return this.usuarios[n];
};
S.crearCasa=function(n,f){
  var h=this.usuarios[n].home;
  this.poner(h+'/',null,{u:n,g:n,modo:0o750,f:f});
  this.poner(h+'/.bashrc','# ~/.bashrc: se lee cada vez que abres una terminal\nHISTSIZE=1000\nalias ll=\'ls -alF\'\nalias la=\'ls -A\'\nalias l=\'ls -CF\'\n',{u:n,g:n,modo:0o644,f:f});
  this.poner(h+'/.profile','# ~/.profile: se lee al iniciar sesión\nif [ -d "$HOME/bin" ] ; then\n    PATH="$HOME/bin:$PATH"\nfi\n',{u:n,g:n,modo:0o644,f:f});
  this.poner(h+'/.bash_logout','# ~/.bash_logout: se lee al cerrar sesión\n',{u:n,g:n,modo:0o644,f:f});
};
/* Ruta absoluta y normalizada a partir de la carpeta actual */
S.abs=function(p,cwd,home){
  var s=this;
  if(p==='~'||p.indexOf('~/')===0)p=home+p.slice(1);
  else{var m=p.match(/^~([a-z_][a-z0-9_-]*)(\/.*)?$/);if(m&&s.usuarios[m[1]])p=s.usuarios[m[1]].home+(m[2]||'')}
  if(p.charAt(0)!=='/')p=cwd+'/'+p;
  var out=[];
  p.split('/').forEach(function(x){if(!x||x==='.')return;if(x==='..')out.pop();else out.push(x)});
  return '/'+out.join('/');
};
/* Busca una ruta absoluta revisando el permiso de paso (x) en cada carpeta.
   {n, padre, nombre} o {err:'noexiste'|'permiso'|'nodir'}; si falta solo el último nombre, trae padre. */
S.buscar=function(ab,u,noSeguir){
  var s=this,partes=ab.split('/').filter(Boolean),n=s.raiz,padre=null;
  for(var i=0;i<partes.length;i++){
    if(n&&n.t==='l')n=s.destino(n);
    if(!n)return {err:'noexiste'};
    if(n.t!=='d')return {err:'nodir'};
    if(!s.puede(n,u,'x'))return {err:'permiso'};
    padre=n;
    var sig=n.h[partes[i]];
    if(!sig)return {n:null,padre:i===partes.length-1?padre:null,nombre:partes[i],err:'noexiste'};
    n=sig;
  }
  if(n.t==='l'&&!noSeguir){var d=s.destino(n);if(d)return {n:d,padre:padre,nombre:partes[partes.length-1],enlace:n}}
  return {n:n,padre:padre,nombre:partes.length?partes[partes.length-1]:'/'};
};
S.destino=function(l){var r=this.buscar(l.dest,'root');return r.n||null};
S.puede=function(n,u,q){
  var bit=q==='r'?4:q==='w'?2:1;
  if(u==='root')return q!=='x'||n.t==='d'||(n.modo&0o111)!==0;
  var m=n.modo;
  if(n.u===u)return !!((m>>6)&bit);
  if(this.enGrupo(u,n.g))return !!((m>>3)&bit);
  return !!(m&bit);
};
S.contenido=function(n){return n.gen?n.gen(this):n.t==='c'?'':n.c||''};
S.tam=function(n){return n.t==='d'?4096:n.t==='l'?(n.txt||n.dest).length:bytesDe(this.contenido(n))};
S.modoTexto=function(n){
  var t=n.t==='d'?'d':n.t==='l'?'l':n.t==='c'?'c':'-',m=n.modo,r='';
  for(var k=2;k>=0;k--){var b=(m>>(k*3))&7;r+=(b&4?'r':'-')+(b&2?'w':'-')+(b&1?'x':'-')}
  if(m&0o1000)r=r.slice(0,8)+(m&1?'t':'T');
  return t+r;
};
S.umask=function(u){return u==='root'?0o022:0o002};
/* Crea una carpeta revisando permisos; devuelve el mensaje de error o null */
S.mkdir=function(ab,u,padres){
  var s=this;
  if(ab==='/')return padres?null:'El archivo ya existe';
  var r=s.buscar(ab,u);
  if(r.n)return padres&&r.n.t==='d'?null:'El archivo ya existe';
  if(r.err==='permiso')return 'Permiso denegado';
  if(r.err==='nodir')return 'No es un directorio';
  if(!r.padre){
    if(!padres)return 'No existe el archivo o el directorio';
    var e=s.mkdir(dirname(ab),u,true);if(e)return e;
    r=s.buscar(ab,u);
  }
  if(!s.puede(r.padre,u,'w'))return 'Permiso denegado';
  r.padre.h[r.nombre]=nodoD(u,s.grupoPrin(u),0o777&~s.umask(u));
  r.padre.m=new Date();
  return null;
};
/* Escribe un archivo (lo crea si hace falta) revisando permisos; devuelve el error o null */
S.escribir=function(ab,txt,u,anexar){
  var s=this,r=s.buscar(ab,u);
  if(r.err==='permiso')return 'Permiso denegado';
  if(r.err==='nodir')return 'No es un directorio';
  if(r.n){
    if(r.n.t==='d')return 'Es un directorio';
    if(r.n.t==='c')return null;
    if(!s.puede(r.n,u,'w'))return 'Permiso denegado';
    if(r.n.gen){r.n.c=r.n.gen(s);delete r.n.gen}
    r.n.c=anexar?r.n.c+txt:txt;r.n.m=new Date();
    return null;
  }
  if(!r.padre)return 'No existe el archivo o el directorio';
  if(!s.puede(r.padre,u,'w'))return 'Permiso denegado';
  r.padre.h[r.nombre]=nodoF(u,s.grupoPrin(u),0o666&~s.umask(u),txt);
  r.padre.m=new Date();
  return null;
};
/* Ayudas para las comprobaciones de los ejercicios (sin revisar permisos) */
S.nodo=function(ruta){var r=this.buscar(ruta.replace(/^~/,'/home/'+this.yo),'root');return r.n||null};
S.existe=function(ruta,tipo){var n=this.nodo(ruta);return !!n&&(!tipo||n.t===tipo)};
S.leer=function(ruta){var n=this.nodo(ruta);return n&&n.t==='f'?this.contenido(n):null};
S.permisos=function(ruta){var n=this.nodo(ruta);return n?(n.modo&0o777).toString(8):null};
S.dueno=function(ruta){var n=this.nodo(ruta);return n?n.u+':'+n.g:null};
S.instalado=function(p){return !!this.paquetes[p]};
S.servicio=function(n,o){
  if(!o){var v=this.servicios[n];if(v)return v;for(var k in this.servicios)if(this.servicios[k].alias.indexOf(n)>=0)return this.servicios[k];return null}
  var x={nombre:n,desc:'',activo:false,habilitado:false,fallo:'',cmd:'',u:'root',pid:0,puertos:[],alias:[],mem:'1.2M',tipo:'simple'};
  Object.keys(o).forEach(function(k){x[k]=o[k]});
  var pid=x.pid;x.pid=0;
  this.servicios[n]=x;
  if(x.activo){x.activo=false;this.arrancar(x,true,pid)}
  return x;
};
S.log=function(unidad,txt,f){this.diario.push({f:f||new Date(),u:unidad,txt:txt})};
S.arrancar=function(v,silencio,pid){
  var s=this,f=silencio?new Date(s.arranque+40e3):new Date();
  if(v.validar){
    var rv=v.validar(s);
    if(rv.err){
      v.activo=false;v.fallo='exit-code';v.desde=f;v.pid=0;
      s.log(v.nombre,'systemd[1]: Starting '+v.nombre+'.service - '+v.desc+'...',f);
      s.log(v.nombre,(v.nombreProc||v.nombre)+'[2410]: '+(v.nombreProc||v.nombre)+': [emerg] '+rv.err,f);
      s.log(v.nombre,'systemd[1]: '+v.nombre+'.service: Control process exited, code=exited, status=1/FAILURE',f);
      s.log(v.nombre,'systemd[1]: '+v.nombre+'.service: Failed with result \'exit-code\'.',f);
      s.log(v.nombre,'systemd[1]: Failed to start '+v.nombre+'.service - '+v.desc+'.',f);
      return false;
    }
    v.conf=rv.conf;
  }
  v.activo=true;v.fallo='';v.desde=f;
  if(!v.sinProc&&v.tipo!=='oneshot'){
    var p=s.proc({pid:pid,cmd:v.cmd,nombre:v.nombreProc||v.nombre,u:v.u,serv:v.nombre,stat:'Ss',mem:0.2,inicio:f});
    v.pid=p.pid;
    (v.hijos||[]).forEach(function(h){s.proc({cmd:h.cmd,nombre:h.nombre,u:h.u,serv:v.nombre,stat:'S',mem:0.1,ppid:p.pid,inicio:f})});
  }
  s.log(v.nombre,'systemd[1]: Starting '+v.nombre+'.service - '+v.desc+'...',f);
  (v.alArrancar||[]).forEach(function(l){s.log(v.nombre,l.replace('PID',v.pid),f)});
  s.log(v.nombre,'systemd[1]: Started '+v.nombre+'.service - '+v.desc+'.',f);
  return true;
};
S.detener=function(v,senal){
  var s=this;
  s.procesos=s.procesos.filter(function(p){return p.serv!==v.nombre});
  var f=new Date();
  if(senal==='KILL'){
    s.log(v.nombre,'systemd[1]: '+v.nombre+'.service: Main process exited, code=killed, status=9/KILL',f);
    s.log(v.nombre,'systemd[1]: '+v.nombre+'.service: Failed with result \'signal\'.',f);
    v.fallo='signal';
  }else{
    if(senal!=='TERM')s.log(v.nombre,'systemd[1]: Stopping '+v.nombre+'.service - '+v.desc+'...',f);
    else if(v.alDetener)s.log(v.nombre,v.alDetener.replace('PID',v.pid),f);
    s.log(v.nombre,'systemd[1]: '+v.nombre+'.service: Deactivated successfully.',f);
    if(senal!=='TERM')s.log(v.nombre,'systemd[1]: Stopped '+v.nombre+'.service - '+v.desc+'.',f);
    v.fallo='';
  }
  v.activo=false;v.pid=0;v.desde=f;
};
S.proc=function(o){
  var p={pid:o.pid||this.sigPid++,ppid:o.ppid==null?1:o.ppid,u:o.u||'root',cpu:o.cpu||0,mem:o.mem||0.1,stat:o.stat||'S',
    inicio:o.inicio||new Date(this.arranque+30e3),cmd:o.cmd,nombre:o.nombre||o.cmd.split(' ')[0].split('/').pop().replace(/[\[\]:]/g,''),serv:o.serv||''};
  this.procesos.push(p);
  this.procesos.sort(function(a,b){return a.pid-b.pid});
  return p;
};
S.proceso=function(fn){return this.procesos.filter(typeof fn==='function'?fn:function(p){return p.nombre===fn||p.cmd.indexOf(fn)>=0})[0]||null};

/* ---------- Lectura de la línea de comandos ---------- */
var OPS=['2>&1','2>>','&&','||','>>','2>','|','&',';','>','<'];
function lex(s){
  var toks=[],w=null,i=0,n=s.length;
  function seg(txt,q,sub,ar){if(!w)w={segs:[]};var l=w.segs[w.segs.length-1];if(!sub&&l&&!l.sub&&l.q===q)l.t+=txt;else w.segs.push({t:txt,q:q,sub:!!sub,ar:!!ar})}
  function aritFin(j){var prof=0;for(var k=j+1;k<n;k++){if(s[k]==='(')prof++;else if(s[k]===')'){prof--;if(!prof)return k}}throw 'se encontró EOF inesperado mientras se buscaba un «))» coincidente'}
  function fin(){if(w){toks.push({tipo:'p',segs:w.segs});w=null}}
  function cierre(j){
    var prof=0;
    for(var k=j+1;k<n;k++){
      var ch=s[k];
      if(ch==='(')prof++;
      else if(ch===')'){prof--;if(!prof)return k}
      else if(ch==="'"){k=s.indexOf("'",k+1);if(k<0)break}
    }
    throw 'se encontró EOF inesperado mientras se buscaba un «)» coincidente';
  }
  while(i<n){
    var ch=s[i];
    if(ch==="'"){var j=s.indexOf("'",i+1);if(j<0)throw 'se encontró EOF inesperado mientras se buscaba un «\'» coincidente';seg(s.slice(i+1,j),1);i=j+1;continue}
    if(ch==='"'){
      var k=i+1,b='';if(!w)w={segs:[]};
      while(k<n&&s[k]!=='"'){
        if(s[k]==='\\'&&k+1<n&&'"\\$`'.indexOf(s[k+1])>=0){b+=s[k+1]==='$'?'\u0003':s[k+1];k+=2;continue}
        if(s.substr(k,3)==='$(('){if(b){seg(b,2);b=''}var fa=aritFin(k);seg(s.slice(k+3,fa-1),2,true,true);k=fa+1;continue}
        if(s[k]==='$'&&s[k+1]==='('){if(b){seg(b,2);b=''}var e=cierre(k);seg(s.slice(k+2,e),2,true);k=e+1;continue}
        b+=s[k];k++;
      }
      if(k>=n)throw 'se encontró EOF inesperado mientras se buscaba un «"» coincidente';
      seg(b,2);i=k+1;continue;
    }
    if(ch==='\\'){if(i+1<n){seg(s[i+1]==='$'?'\u0003':s[i+1],1);i+=2}else i++;continue}
    if(s.substr(i,3)==='$(('){var fa2=aritFin(i);seg(s.slice(i+3,fa2-1),0,true,true);i=fa2+1;continue}
    if(ch==='$'&&s[i+1]==='('){var e2=cierre(i);seg(s.slice(i+2,e2),0,true);i=e2+1;continue}
    if(ch===' '||ch==='\t'){fin();i++;continue}
    if(ch==='#'&&!w)break;
    var op=null;
    for(var o=0;o<OPS.length;o++)if(s.substr(i,OPS[o].length)===OPS[o]){op=OPS[o];break}
    if(op&&op.charAt(0)==='2'&&w)op=null;
    if(op){fin();toks.push({tipo:'op',v:op});i+=op.length;continue}
    seg(ch,0);i++;
  }
  fin();
  return toks;
}
function parsear(toks){
  var lista=[],pipe=[],cmd={pal:[],red:[]},ultOp='';
  function cerrar(){if(cmd.pal.length||cmd.red.length){pipe.push(cmd);cmd={pal:[],red:[]};return true}return false}
  for(var i=0;i<toks.length;i++){
    var t=toks[i];
    if(t.tipo==='p'){cmd.pal.push(t);ultOp='';continue}
    var v=t.v;ultOp=v;
    if(v==='>'||v==='>>'||v==='2>'||v==='2>>'||v==='<'){
      var d=toks[i+1];
      if(!d||d.tipo!=='p')throw 'error de sintaxis cerca del elemento inesperado «'+(d?d.v:'nueva línea')+'»';
      cmd.red.push({op:v,a:d});i++;ultOp='';continue;
    }
    if(v==='2>&1'){cmd.red.push({op:v});ultOp='';continue}
    if(v==='|'){if(!cerrar())throw 'error de sintaxis cerca del elemento inesperado «|»';continue}
    if(!cerrar()&&!pipe.length)throw 'error de sintaxis cerca del elemento inesperado «'+v+'»';
    lista.push({pipe:pipe,sep:v});pipe=[];
  }
  if(ultOp==='|'||ultOp==='&&'||ultOp==='||')throw 'error de sintaxis: la línea no puede terminar en «'+ultOp+'»';
  if(cerrar()||pipe.length)lista.push({pipe:pipe,sep:';'});
  return lista;
}
/* Divide un texto en palabras (para alias) */
function partir(t){return lex(t).filter(function(x){return x.tipo==='p'}).map(function(x){return x.segs.map(function(s){return s.t}).join('')})}

/* ---------- Registro de comandos ---------- */
var CMD={};
var CATS=['Archivos y carpetas','Ver y buscar texto','Usuarios y permisos','Procesos y servicios','Paquetes','Red','Sistema','La terminal'];
function cmd(nombres,meta,fn){nombres.split(' ').forEach(function(n){CMD[n]={fn:fn,d:meta.d||'',uso:meta.uso||n,ops:meta.ops||[],cat:meta.cat||'Sistema',paquete:meta.paq||'',interna:!!meta.interna,sbin:!!meta.sbin}})}
function paqueteDe(n){for(var p in PAQ)if((PAQ[p].cmds||[]).indexOf(n)>=0)return p;return ''}

/* ---------- La terminal ---------- */
var cuenta=0;
function guardados(){try{var v=JSON.parse(localStorage.getItem(CLAVE));return v&&typeof v==='object'?v:{}}catch(e){return {}}}
function Terminal(cont,op){
  var t=this;
  t.op=op||{};t.cont=cont;t.n=++cuenta;
  t.historial=[];t.pos=0;t.salida='';t.ocupada=false;t.esperando=null;t.pendiente=null;t.cancelado=false;t.dichos={};
  t.armar();
  t.reiniciar();
}
var T=Terminal.prototype;
T.armar=function(){
  var t=this,n=t.n,op=t.op;
  t.cont.innerHTML=
    '<div class="term" data-term>'+
      '<div class="term-bar"><span class="term-pts" aria-hidden="true"><i></i><i></i><i></i></span><span class="term-tit"></span></div>'+
      '<div class="term-scroll">'+
        '<div class="term-log" role="log" aria-live="polite" aria-label="Salida de la terminal"></div>'+
        '<form class="term-in" autocomplete="off"><label class="term-ps" for="tc'+n+'"><span class="term-ps-v" aria-hidden="true"></span><span class="vh term-ps-l">Comando</span></label>'+
        '<input class="term-cmd" id="tc'+n+'" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-describedby="ta'+n+'"></form>'+
      '</div>'+
      '<div class="term-nano" hidden>'+
        '<div class="nano-h"><span>GNU nano 7.2</span><b class="nano-f"></b><span class="nano-m"></span></div>'+
        '<label class="vh" for="tn'+n+'">Contenido del archivo</label>'+
        '<textarea class="nano-t" id="tn'+n+'" spellcheck="false" autocapitalize="none" autocorrect="off"></textarea>'+
        '<p class="nano-s" aria-live="polite"></p>'+
        '<div class="nano-k"><button type="button" class="nano-b" data-n="guardar"><kbd>^O</kbd> Guardar</button><button type="button" class="nano-b" data-n="salir"><kbd>^X</kbd> Salir</button></div>'+
        '<div class="nano-q" hidden><span>¿Guardar los cambios?</span><button type="button" class="nano-b" data-n="si"><kbd>S</kbd> Sí</button><button type="button" class="nano-b" data-n="no"><kbd>N</kbd> No</button><button type="button" class="nano-b" data-n="cancelar"><kbd>^C</kbd> Cancelar</button></div>'+
      '</div>'+
      '<div class="term-teclas" role="group" aria-label="Teclas de la terminal">'+
        '<button type="button" class="term-k" data-k="Tab" aria-label="Completar (Tab)">Tab</button>'+
        '<button type="button" class="term-k" data-k="ArrowUp" aria-label="Comando anterior">↑</button>'+
        '<button type="button" class="term-k" data-k="ArrowDown" aria-label="Comando siguiente">↓</button>'+
        '<button type="button" class="term-k" data-k="c" aria-label="Interrumpir (Ctrl+C)">Ctrl C</button>'+
      '</div>'+
    '</div>'+
    '<p class="term-ayuda" id="ta'+n+'">Escribe un comando y pulsa Enter. <kbd>↑</kbd> repite los anteriores, <kbd>Tab</kbd> completa nombres y <kbd>Ctrl</kbd> <kbd>C</kbd> interrumpe. Escribe <code>help</code> para ver los comandos.</p>'+
    (op.sugerencias&&op.sugerencias.length?'<div class="chips term-sug" role="group" aria-label="Comandos para probar">'+op.sugerencias.map(function(s){return '<button type="button" class="chip" data-cmd="'+esc(s)+'">'+esc(s)+'</button>'}).join('')+'</div>':'')+
    (op.tareas&&op.tareas.length?'<div class="term-ej"><div class="term-ej-h"><b>Ejercicios</b><span class="term-ej-n"></span></div><ol class="term-ej-l"></ol>'+
      '<p class="term-pista" aria-live="polite" hidden></p><p class="term-fin" hidden></p>'+
      '<div class="ctl"><button class="btn" type="button" data-t="pista">Ver una pista</button><button class="btn" type="button" data-t="reiniciar">Empezar de nuevo</button></div>'+
      '<p class="vh term-aviso" aria-live="polite"></p></div>':
      '<div class="ctl"><button class="btn" type="button" data-t="reiniciar">Reiniciar la terminal</button></div>');
  var q=function(s){return t.cont.querySelector(s)};
  t.el=q('.term');t.log=q('.term-log');t.scroll=q('.term-scroll');t.input=q('.term-cmd');t.form=q('.term-in');
  t.psV=q('.term-ps-v');t.psL=q('.term-ps-l');t.tit=q('.term-tit');
  t.nano=q('.term-nano');
  t.form.addEventListener('submit',function(e){e.preventDefault();t.enviar()});
  t.input.addEventListener('keydown',function(e){t.tecla(e)});
  t.scroll.addEventListener('click',function(){
    var sel=window.getSelection&&window.getSelection();
    if(!sel||sel.isCollapsed)t.input.focus({preventScroll:true});
  });
  /* Las teclas en pantalla (celular) no le quitan el foco al campo, para que no se cierre el teclado */
  var tk=q('.term-teclas');
  tk.addEventListener('mousedown',function(e){if(e.target.closest('.term-k'))e.preventDefault()});
  tk.addEventListener('click',function(e){
    var b=e.target.closest('.term-k');if(!b)return;
    var k=b.getAttribute('data-k');
    t.tecla({key:k,ctrlKey:k==='c',preventDefault:function(){},sintetica:true});
    t.input.focus({preventScroll:true});
  });
  t.cont.addEventListener('click',function(e){
    var s=e.target.closest('[data-cmd]');
    if(s){t.input.value=s.getAttribute('data-cmd');t.input.focus();return}
    var b=e.target.closest('[data-t]');if(!b)return;
    if(b.getAttribute('data-t')==='pista')t.pista();
    else{t.reiniciar(true);t.input.focus({preventScroll:true})}
  });
  t.armarNano();
};
T.frame=function(){return this.pila[this.pila.length-1]};
T.u=function(){return this.frame().u};
T.cwd=function(){return this.frame().cwd};
T.reiniciar=function(borrar){
  var t=this,op=t.op;
  t.cancelar(true);
  t.sis=new Sistema(op);
  t.sis.t=t;
  t.pila=[{u:t.sis.yo,cwd:t.sis.home(t.sis.yo),vars:{},pid:t.sis.shellPid}];
  /* Otras computadoras de la red, para entrar con ssh: {op: opciones de Sistema, preparar(sis, t)} */
  t.remotos={};
  (op.remotos||[]).forEach(function(r){
    var rs=new Sistema(r.op),loc=t.sis;
    rs.mundo=loc.mundo;loc.mundo.sistemas.push(rs);
    loc.red.hosts[rs.host]=rs.red.ip;rs.red.hosts[loc.host]=loc.red.ip;
    rs.red.vecinos[loc.red.ip]=loc.red.mac;
    t.remotos[rs.host]=rs;
  });
  t.codigo=0;t.sudoHasta=0;t.dichos={};t.historial=[];t.pos=0;
  t.log.textContent='';
  if(op.preparar)op.preparar(t.sis,t);
  (op.remotos||[]).forEach(function(r){if(r.preparar)r.preparar(t.remotos[r.op.host],t)});
  t.escribir(c('h',op.bienvenida||'Terminal simulada de OneLearn: Ubuntu 24.04 LTS. Escribe help para ver los comandos.')+'\n');
  var g=guardados();
  if(borrar&&op.clave){delete g[op.clave];try{localStorage.setItem(CLAVE,JSON.stringify(g))}catch(e){}}
  t.hechas=op.clave&&g[op.clave]&&typeof g[op.clave]==='object'?g[op.clave]:{};
  t.ultimo=null;
  t.pintarTareas();
  t.prompt();
};

/* ---------- Salida ---------- */
T.escribir=function(txt){
  var t=this,f=document.createDocumentFragment();
  String(txt).split(/(\u0001[a-z][^\u0002]*\u0002)/).forEach(function(p){
    if(!p)return;
    if(p.charAt(0)===A){var sp=document.createElement('span');sp.className='tc-'+p.charAt(1);sp.textContent=p.slice(2,-1);f.appendChild(sp)}
    else f.appendChild(document.createTextNode(p));
  });
  t.log.appendChild(f);
  t.salida+=plano(txt);
  /* No se guarda sin límite: se quitan las líneas más viejas */
  if(t.log.childNodes.length>1500)while(t.log.childNodes.length>1200)t.log.removeChild(t.log.firstChild);
  t.alFinal();
};
T.alFinal=function(){var s=this.scroll;s.scrollTop=s.scrollHeight};
T.limpiar=function(){this.log.textContent=''};
T.rutaCorta=function(){var cwd=this.cwd(),h=this.sis.home(this.u());return cwd===h?'~':cwd.indexOf(h+'/')===0?'~'+cwd.slice(h.length):cwd};
T.textoPrompt=function(){return this.u()+'@'+this.sis.host+':'+this.rutaCorta()+(this.u()==='root'?'#':'$')+' '};
T.prompt=function(){
  var t=this;
  t.psV.textContent=t.textoPrompt();
  t.psL.textContent='Comando, en '+t.rutaCorta()+(t.u()==='root'?' como root':'');
  t.tit.textContent=t.u()+'@'+t.sis.host+': '+t.rutaCorta();
  t.alFinal();
};
T.eco=function(linea){
  var t=this;
  t.escribir(c('p',t.u()+'@'+t.sis.host)+':'+c('r',t.rutaCorta())+(t.u()==='root'?'#':'$')+' '+linea.replace(/[\u0001\u0002]/g,'')+'\n');
};
T.consejo=function(clave,txt){
  if(this.dichos[clave])return;
  this.dichos[clave]=1;
  this.escribir(c('h','(OneLearn: '+txt+')')+'\n');
};

/* ---------- Teclado ---------- */
T.tecla=function(e){
  var t=this,inp=t.input;
  if(e.key==='Enter'&&e.sintetica){t.enviar();return}
  if((e.ctrlKey||e.metaKey)&&(e.key==='c'||e.key==='C')){
    if(!e.sintetica&&inp.selectionStart!==inp.selectionEnd)return;
    e.preventDefault();
    if(t.ocupada||t.esperando)t.cancelar();
    else{t.eco(inp.value+'^C');inp.value='';t.prompt()}
    return;
  }
  if(e.ctrlKey&&(e.key==='l'||e.key==='L')){e.preventDefault();t.limpiar();return}
  if(t.esperando)return;
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    if(t.ocupada)return;
    e.preventDefault();
    var h=t.historial;
    if(!h.length)return;
    if(e.key==='ArrowUp')t.pos=Math.max(0,t.pos-1);else t.pos=Math.min(h.length,t.pos+1);
    inp.value=t.pos<h.length?h[t.pos]:'';
    var l=inp.value.length;
    try{inp.setSelectionRange(l,l)}catch(err){}
    return;
  }
  if(e.key==='Tab'&&!e.shiftKey&&!e.altKey&&!e.ctrlKey){
    /* Con la línea vacía, Tab sale de la terminal (para no atrapar el foco del teclado) */
    if(!inp.value.trim()&&!e.sintetica)return;
    e.preventDefault();
    if(!t.ocupada)t.completar();
    return;
  }
  if(e.key==='Escape'&&inp.value){e.preventDefault();inp.value=''}
};
T.completar=function(){
  var t=this,inp=t.input,v=inp.value,pos=inp.selectionStart==null?v.length:inp.selectionStart,antes=v.slice(0,pos),despues=v.slice(pos);
  var m=antes.match(/((?:\\ |[^\s])*)$/),palabra=m[1],ini=antes.slice(0,antes.length-palabra.length);
  var esCmd=/^\s*((sudo|sudo\s+-u\s+\S+|time|which|man|type)\s+)?$/.test(ini)||/[|;&]\s*$/.test(ini);
  var crudo=palabra.replace(/\\ /g,' '),ops=[],base='';
  if(esCmd&&crudo.indexOf('/')<0){
    var nombres=Object.keys(CMD).filter(function(n){return n!=='.'&&(!CMD[n].paquete||t.sis.instalado(CMD[n].paquete))}).concat(Object.keys(t.sis.alias));
    ops=nombres.filter(function(n,i){return n.indexOf(crudo)===0&&nombres.indexOf(n)===i}).sort().map(function(n){return {n:n,f:' '}});
  }else{
    var k=crudo.lastIndexOf('/');base=k>=0?crudo.slice(0,k+1):'';var pref=crudo.slice(k+1);
    var r=t.sis.buscar(t.sis.abs(base||'.',t.cwd(),t.sis.home(t.u())),t.u());
    if(r.n&&r.n.t==='d'&&t.sis.puede(r.n,t.u(),'r'))
      ops=Object.keys(r.n.h).filter(function(n){return n.indexOf(pref)===0&&(pref.charAt(0)==='.'||n.charAt(0)!=='.')}).sort(ordenar).map(function(n){
        var x=r.n.h[n],d=x.t==='d'||(x.t==='l'&&(t.sis.destino(x)||{}).t==='d');return {n:n,f:d?'/':' '}});
  }
  if(!ops.length)return;
  var escapar=function(s){return s.replace(/ /g,'\\ ')};
  if(ops.length===1){inp.value=ini+escapar(base+ops[0].n)+ops[0].f+despues;return}
  var com=ops[0].n;ops.forEach(function(o){while(o.n.indexOf(com)!==0)com=com.slice(0,-1)});
  var actual=esCmd&&crudo.indexOf('/')<0?crudo:crudo.slice(crudo.lastIndexOf('/')+1);
  if(com.length>actual.length){inp.value=ini+escapar(base+com)+despues;return}
  t.eco(v);
  t.escribir(ops.map(function(o){return o.f==='/'?c('d',o.n+'/'):o.n}).join('  ')+'\n');
  t.prompt();
};

/* ---------- Ejecutar ---------- */
T.enviar=function(){
  var t=this,v=t.input.value;
  if(t.esperando){
    var e=t.esperando;t.esperando=null;
    t.input.value='';
    t.escribir(e.texto+(e.oculto?'':v.replace(/[\u0001\u0002]/g,''))+'\n');
    t.input.type='text';t.el.classList.remove('term-oculto');
    t.psV.textContent='';t.psL.textContent='Comando en curso';
    e.res(v);
    return;
  }
  if(t.ocupada)return;
  t.input.value='';
  t.ejecutar(v);
};
/* Ejecuta una línea como si la hubieras escrito. Devuelve una promesa con el código de salida. */
T.ejecutar=function(linea){
  var t=this;
  t.eco(linea);
  var ex=linea;
  if(/!!/.test(linea)&&t.historial.length){ex=linea.replace(/!!/g,t.historial[t.historial.length-1]);t.escribir(ex+'\n')}
  if(ex.trim()&&t.historial[t.historial.length-1]!==ex)t.historial.push(ex);
  if(t.historial.length>200)t.historial.shift();
  t.pos=t.historial.length;
  if(!ex.trim()){t.prompt();return Promise.resolve(0)}
  t.ocupada=true;t.cancelado=false;
  t.el.setAttribute('data-ocupada','1');t.log.setAttribute('aria-busy','true');
  t.psV.textContent='';t.psL.textContent='Comando en curso';
  t.salida='';
  t.ultimo={linea:ex,cmds:[],codigo:0,salida:'',uso:function(n,re){return this.cmds.some(function(a){return a[0]===n&&(!re||re.test(a.slice(1).join(' ')))})}};
  return t.correrTexto(ex).catch(function(e){
    if(e==='cancelado')return 130;
    if(window.console)console.error('Terminal:',e);
    t.escribir(c('e','bash: error interno de la terminal simulada')+'\n');
    return 1;
  }).then(function(cod){
    t.codigo=cod;
    t.ultimo.codigo=cod;t.ultimo.salida=t.salida;
    t.ocupada=false;t.cancelado=false;
    t.el.removeAttribute('data-ocupada');t.log.removeAttribute('aria-busy');
    t.trabajosTerminados();
    t.revisar();
    t.prompt();
    return cod;
  });
};
T.correrLinea=function(texto,captura){
  var t=this,lista;
  try{lista=parsear(lex(texto))}catch(e){t.escribir(c('e','bash: '+e)+'\n');return Promise.resolve(2)}
  var cod=0,prev=';';
  return lista.reduce(function(p,item){
    return p.then(function(){
      var sep=prev;prev=item.sep;
      if(t.cancelado)throw 'cancelado';
      if(sep==='&&'&&cod!==0)return;
      if(sep==='||'&&cod===0)return;
      return t.correrTuberia(item.pipe,captura,item.sep==='&').then(function(x){cod=x;t.codigo=x});
    });
  },Promise.resolve()).then(function(){return cod});
};
T.correrTuberia=function(pipe,captura,fondo){
  var t=this,entrada=null,cod=0;
  return pipe.reduce(function(p,cmd,k){
    return p.then(function(){
      if(t.cancelado)throw 'cancelado';
      var ult=k===pipe.length-1,dest=ult?captura||null:{buf:''};
      return t.correrComando(cmd,entrada,dest,fondo,!ult||!!captura).then(function(x){cod=x;entrada=dest&&!ult?dest.buf:null});
    });
  },Promise.resolve()).then(function(){return cod});
};
T.expandir=function(palabras){
  var t=this;
  return Promise.all(palabras.map(function(w){return t.expandirPalabra(w)})).then(function(ls){return [].concat.apply([],ls)});
};
var VAR=/\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*|[0-9?#@$]))/g;
T.expandirPalabra=function(w){
  var t=this;
  return Promise.all(w.segs.map(function(sg){
    if(!sg.sub)return sg;
    if(sg.ar)return {t:aritmetica(sg.t,t),q:sg.q,lit:true};
    var cap={buf:''};
    return t.correrLinea(sg.t,cap).then(function(){return {t:cap.buf.replace(/\n+$/,''),q:sg.q,lit:true}});
  })).then(function(segs){
    var texto='',patron='',glob=false,todoSinComillas=true;
    segs.forEach(function(sg,k){
      var v=sg.t;
      if(sg.q!==0)todoSinComillas=false;
      if(!sg.lit){
        if(sg.q===0&&k===0&&/^~([a-z_][a-z0-9_-]*)?(\/|$)/.test(v)){var m=v.match(/^~([^\/]*)/);var u=m[1]?t.sis.usuarios[m[1]]:{home:t.sis.home(t.u())};if(u)v=u.home+v.slice(m[0].length)}
        if(sg.q!==1)v=v.replace(VAR,function(x,a,b){return t.variable(a||b)});
      }
      v=v.replace(/\u0003/g,'$');
      texto+=v;
      if(sg.q===0&&!sg.lit&&/[*?]/.test(v)){glob=true;patron+=v}else patron+=v.replace(/[*?\\]/g,'\\$&');
    });
    if(glob){var g=t.glob(patron);if(g.length)return g}
    if(texto===''&&todoSinComillas)return [];
    return [texto];
  });
};
T.variable=function(n){
  var t=this,fr=t.frame();
  if(n==='?')return String(t.codigo);
  if(n==='$')return String(fr.pid||t.sis.shellPid);
  if(fr.vars[n]!=null)return fr.vars[n];
  var env=t.entorno();
  return env[n]!=null?env[n]:'';
};
T.entorno=function(){
  var t=this,fr=t.frame(),u=fr.u;
  return {HOME:t.sis.home(u),USER:u,LOGNAME:u,PWD:fr.cwd,OLDPWD:fr.viejo||'',SHELL:'/bin/bash',PATH:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    LANG:'es_MX.UTF-8',HOSTNAME:t.sis.host,TERM:'xterm-256color',EDITOR:'nano'};
};
T.glob=function(pat){
  var t=this,abs=pat.charAt(0)==='/',partes=pat.split('/'),caminos=[abs?'/':''];
  partes.forEach(function(p,i){
    if(!p)return;
    var nuevos=[];
    var tieneComodin=/(^|[^\\])[*?]/.test(p);
    caminos.forEach(function(cm){
      if(!tieneComodin){nuevos.push(unir(cm,p.replace(/\\(.)/g,'$1')));return}
      var r=t.sis.buscar(t.sis.abs(cm||'.',t.cwd(),t.sis.home(t.u())),t.u());
      if(!r.n||r.n.t!=='d'||!t.sis.puede(r.n,t.u(),'r'))return;
      var re=patronRe(p);
      Object.keys(r.n.h).sort(ordenar).forEach(function(nom){
        if(nom.charAt(0)==='.'&&p.charAt(0)!=='.')return;
        if(re.test(nom))nuevos.push(unir(cm,nom));
      });
    });
    caminos=nuevos;
  });
  return caminos.filter(function(cm){return cm&&!!t.sis.buscar(t.sis.abs(cm,t.cwd(),t.sis.home(t.u())),'root').n});
};
T.correrComando=function(cmd,entrada,captura,fondo,enTuberia){
  var t=this;
  return Promise.all([t.expandir(cmd.pal),Promise.all(cmd.red.map(function(r){return r.a?t.expandirPalabra(r.a):Promise.resolve([''])}))]).then(function(res){
    var args=res[0],fr=t.frame(),asig=[];
    while(args.length&&/^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0]))asig.push(args.shift());
    if(!args.length){asig.forEach(function(a){var i=a.indexOf('=');fr.vars[a.slice(0,i)]=a.slice(i+1)});if(!cmd.red.length)return 0}
    var al=args.length&&t.sis.alias[args[0]];
    if(al&&cmd.pal[0].segs.length===1&&cmd.pal[0].segs[0].q===0)args=partir(al).concat(args.slice(1));
    /* Redirecciones: las abre el shell, con el usuario de la terminal (no el de sudo) */
    var salida=captura,errS=null,alCerrar=[],ent=entrada,dosUno=false;
    for(var i=0;i<cmd.red.length;i++){
      var r=cmd.red[i],dest=(res[1][i]||[''])[0];
      if(r.op==='2>&1'){dosUno=true;continue}
      if(res[1][i].length!==1){t.escribir(c('e','bash: '+plano(r.a.segs.map(function(s){return s.t}).join(''))+': redirección ambigua')+'\n');return 1}
      var ab=t.sis.abs(dest,fr.cwd,t.sis.home(fr.u));
      if(r.op==='<'){
        var rr=t.sis.buscar(ab,fr.u);
        if(rr.err==='permiso'||rr.n&&rr.n.t!=='d'&&!t.sis.puede(rr.n,fr.u,'r')){t.escribir(c('e','bash: '+dest+': Permiso denegado')+'\n');return 1}
        if(!rr.n){t.escribir(c('e','bash: '+dest+': No existe el archivo o el directorio')+'\n');return 1}
        if(rr.n.t==='d'){t.escribir(c('e','bash: '+dest+': Es un directorio')+'\n');return 1}
        ent=t.sis.contenido(rr.n);continue;
      }
      var anexar=r.op==='>>'||r.op==='2>>';
      var e=t.sis.escribir(ab,'',fr.u,true);
      if(e){t.escribir(c('e','bash: '+dest+': '+e)+'\n');return 1}
      if(!anexar)t.sis.escribir(ab,'',fr.u,false);
      var buf={buf:''};
      (function(ab,buf){alCerrar.push(function(){if(buf.buf)t.sis.escribir(ab,buf.buf,'root',true)})})(ab,buf);
      if(r.op.charAt(0)==='2')errS=buf;else salida=buf;
    }
    if(!args.length)return 0;
    var x=t.ctx(args,ent,salida,errS,dosUno,fondo,enTuberia||!!salida);
    return t.despachar(args,x).then(function(cod){alCerrar.forEach(function(f){f()});return cod});
  });
};
T.ctx=function(args,entrada,salida,errS,dosUno,fondo,redirigido){
  var t=this,fr=t.frame();
  var x={t:t,sis:t.sis,args:args,entrada:entrada,u:fr.u,cwd:fr.cwd,fondo:!!fondo,tty:!redirigido};
  x.home=t.sis.home(fr.u);
  x.out=function(s){if(salida)salida.buf+=plano(s);else t.escribir(s)};
  x.err=function(s){if(dosUno)x.out(s);else if(errS)errS.buf+=plano(s);else t.escribir(c('e',s))};
  x.abs=function(p){return t.sis.abs(p,fr.cwd,t.sis.home(fr.u))};
  x.buscar=function(p,noSeguir){return t.sis.buscar(x.abs(p),x.u,noSeguir)};
  x.esperar=function(ms){return t.esperar(ms)};
  x.pedir=function(txt,oc){return t.pedir(txt,oc)};
  x.consejo=function(k,txt){if(x.tty)t.consejo(k,txt)};
  return x;
};
T.despachar=function(args,x){
  var t=this,n=args[0];
  if(t.ultimo)t.ultimo.cmds.push(args.slice());
  if(n.indexOf('/')>=0)return t.correrRuta(args,x);
  var m=CMD[n];
  if(!m||m.paquete&&!t.sis.instalado(m.paquete)){
    var pq=m&&m.paquete||paqueteDe(n);
    if(pq&&!t.sis.instalado(pq))x.err('No se encontró el comando «'+n+'», pero se puede instalar con:\n  sudo apt install '+pq+'\n');
    else x.err(n+': comando no encontrado\n');
    return Promise.resolve(127);
  }
  if(args[1]==='--help'&&m.d&&n!=='ls'){x.out(ayudaDe(n));return Promise.resolve(0)}
  var r;
  try{r=m.fn(x)}catch(e){if(e==='cancelado')return Promise.reject(e);if(window.console)console.error('Terminal: '+n,e);x.err(n+': error interno de la terminal simulada\n');return Promise.resolve(1)}
  return Promise.resolve(r).then(function(v){return v|0});
};
/* ./script.sh o /usr/bin/ls */
T.correrRuta=function(args,x){
  var t=this,p=args[0],r=x.buscar(p);
  if(r.err==='permiso'){x.err('bash: '+p+': Permiso denegado\n');return Promise.resolve(126)}
  if(!r.n){x.err('bash: '+p+': No existe el archivo o el directorio\n');return Promise.resolve(127)}
  if(r.n.t==='d'){x.err('bash: '+p+': Es un directorio\n');return Promise.resolve(126)}
  if(!t.sis.puede(r.n,x.u,'x')){x.err('bash: '+p+': Permiso denegado\n');return Promise.resolve(126)}
  var ab=x.abs(p),nom=basename(ab);
  if(/^\/usr\/s?bin\//.test(ab)&&CMD[nom])return t.despachar([nom].concat(args.slice(1)),x);
  if(!t.sis.puede(r.n,x.u,'r')){x.err('bash: '+p+': Permiso denegado\n');return Promise.resolve(126)}
  return t.correrScript(t.sis.contenido(r.n),args,x);
};
T.correrScript=function(txt,args,x,mismo){
  var t=this,fr=t.frame();
  if(!mismo){
    var nuevo={u:x.u,cwd:fr.cwd,vars:{},pid:t.sis.sigPid++,script:true};
    Object.keys(fr.vars).forEach(function(k){nuevo.vars[k]=fr.vars[k]});
    args.forEach(function(a,i){nuevo.vars[String(i)]=a});
    nuevo.vars['#']=String(args.length-1);nuevo.vars['@']=args.slice(1).join(' ');
    t.pila.push(nuevo);
  }
  var cap=x.tty?null:{buf:''};
  function fin(){if(!mismo)t.pila.pop();if(cap)x.out(cap.buf)}
  return t.correrTexto(txt,cap).then(function(cod){fin();return cod},function(e){
    if(e&&e.salir!=null){fin();return e.salir}
    fin();throw e;
  });
};
T.esperar=function(ms){
  var t=this;
  return new Promise(function(res,rej){
    if(t.cancelado)return rej('cancelado');
    var h=setTimeout(function(){t.pendiente=null;res()},AT.reduce?0:ms);
    t.pendiente={h:h,rej:rej};
  });
};
T.pedir=function(texto,oculto){
  var t=this;
  return new Promise(function(res,rej){
    t.esperando={texto:texto,oculto:!!oculto,res:res,rej:rej};
    t.psV.textContent=texto;t.psL.textContent=texto.replace(/[:\s]+$/,'');
    if(oculto){t.input.type='password';t.el.classList.add('term-oculto')}
    t.alFinal();
    if(document.activeElement!==t.input&&t.cont.contains(document.activeElement))t.input.focus({preventScroll:true});
  });
};
T.cancelar=function(silencio){
  var t=this;
  if(!t.ocupada&&!t.esperando)return;
  t.cancelado=true;
  if(!silencio)t.escribir('^C\n');
  if(t.esperando){var e=t.esperando;t.esperando=null;t.input.type='text';t.el.classList.remove('term-oculto');t.input.value='';e.rej('cancelado')}
  if(t.pendiente){clearTimeout(t.pendiente.h);var p=t.pendiente;t.pendiente=null;p.rej('cancelado')}
};
T.entrar=function(u,cwd){this.pila.push({u:u,cwd:cwd||this.sis.home(u),vars:{},pid:this.sis.proc({cmd:'-bash',nombre:'bash',u:u,stat:'S',ppid:this.frame().pid}).pid})};
T.trabajosTerminados=function(){
  var t=this,s=t.sis,fin=s.trabajos.filter(function(j){return j.hecho});
  fin.forEach(function(j){t.escribir('['+j.n+']+  Hecho                   '+j.cmd+'\n')});
  s.trabajos=s.trabajos.filter(function(j){return !j.hecho});
};
T.autenticar=function(x){
  var t=this,u=x.sis.usuarios[x.u];
  if(x.u==='root'||Date.now()<x.sis.sudoHasta)return Promise.resolve(true);
  var intentos=0;
  function pedir(){
    return t.pedir('[sudo] contraseña para '+x.u+': ',true).then(function(v){
      if(v&&(!u||!u.clave||u.clave===v)){x.sis.sudoHasta=Date.now()+15*60e3;return true}
      intentos++;
      if(intentos>=3){x.err('sudo: 3 intentos de contraseña incorrectos\n');return false}
      t.escribir('Lo siento, pruebe otra vez.\n');
      return pedir();
    });
  }
  t.consejo('sudo-clave',u&&u.clave?'al escribir la contraseña no se ve nada en pantalla: es normal.':'al escribir la contraseña no se ve nada en pantalla: es normal. Aquí sirve cualquier contraseña, salvo que le pongas una nueva con passwd.');
  return pedir();
};

/* ---------- nano ---------- */
T.armarNano=function(){
  var t=this,q=function(s){return t.nano.querySelector(s)};
  t.nanoT=q('.nano-t');t.nanoS=q('.nano-s');t.nanoQ=q('.nano-q');
  t.nanoT.addEventListener('input',function(){if(t.ed){t.ed.cambio=true;q('.nano-m').textContent='Modificado'}});
  t.nanoT.addEventListener('keydown',function(e){
    if(!t.ed)return;
    var k=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&(k==='o'||k==='s')){e.preventDefault();t.nanoAccion('guardar')}
    else if((e.ctrlKey||e.metaKey)&&k==='x'){e.preventDefault();t.nanoAccion('salir')}
    else if(e.key==='Escape'){e.preventDefault();t.nanoAccion('salir')}
  });
  t.nanoQ.addEventListener('keydown',function(e){
    var k=e.key.toLowerCase();
    if(k==='s'||k==='y'){e.preventDefault();t.nanoAccion('si')}
    else if(k==='n'){e.preventDefault();t.nanoAccion('no')}
    else if(k==='escape'||(e.ctrlKey&&k==='c')){e.preventDefault();t.nanoAccion('cancelar')}
  });
  t.nano.addEventListener('click',function(e){var b=e.target.closest('[data-n]');if(b)t.nanoAccion(b.getAttribute('data-n'))});
};
T.editor=function(nombre,txt,soloLectura,guardar){
  var t=this,q=function(s){return t.nano.querySelector(s)};
  return new Promise(function(res){
    t.ed={guardar:guardar,cambio:false,res:res,soloLectura:soloLectura};
    q('.nano-f').textContent=nombre||'Búfer nuevo';q('.nano-m').textContent='';
    t.nanoT.value=txt;t.nanoQ.hidden=true;
    t.nanoS.textContent=soloLectura?'[ No tienes permiso para escribir en este archivo ]':'[ '+txt.split('\n').length+' líneas leídas ]';
    t.scroll.hidden=true;t.nano.hidden=false;
    t.nanoT.focus();
    try{t.nanoT.setSelectionRange(0,0)}catch(e){}
  });
};
T.nanoAccion=function(a){
  var t=this,ed=t.ed;if(!ed)return;
  function cerrar(){t.ed=null;t.nano.hidden=true;t.scroll.hidden=false;t.input.focus({preventScroll:true});ed.res()}
  function guardar(){
    var e=ed.guardar(t.nanoT.value);
    if(e){t.nanoS.textContent='[ Error al escribir: '+e+' ]';return false}
    ed.cambio=false;t.nano.querySelector('.nano-m').textContent='';
    t.nanoS.textContent='[ '+t.nanoT.value.split('\n').length+' líneas escritas ]';
    return true;
  }
  if(a==='guardar'){guardar();t.nanoT.focus()}
  else if(a==='salir'){
    if(!ed.cambio)return cerrar();
    t.nanoQ.hidden=false;t.nanoQ.querySelector('[data-n="si"]').focus();
  }
  else if(a==='si'){if(guardar())cerrar();else{t.nanoQ.hidden=true;t.nanoT.focus()}}
  else if(a==='no')cerrar();
  else if(a==='cancelar'){t.nanoQ.hidden=true;t.nanoT.focus()}
};

/* ---------- Ejercicios ---------- */
function enLinea(s){return esc(s).replace(/`([^`]+)`/g,'<code>$1</code>')}
T.pintarTareas=function(){
  var t=this,ts=t.op.tareas||[],ol=t.cont.querySelector('.term-ej-l');
  if(!ol)return;
  var hechas=ts.filter(function(x){return t.hechas[x.id]}).length,act=ts.filter(function(x){return !t.hechas[x.id]})[0];
  ol.innerHTML=ts.map(function(x){
    var ok=!!t.hechas[x.id];
    return '<li class="'+(ok?'ok':x===act?'act':'')+'" data-tarea="'+esc(x.id)+'"><span class="term-ej-m" aria-hidden="true">'+(ok?'✓':'')+'</span><span>'+enLinea(x.texto)+'</span>'+(ok?'<span class="vh"> (hecho)</span>':'')+'</li>';
  }).join('');
  t.cont.querySelector('.term-ej-n').textContent=hechas+' de '+ts.length;
  var fin=t.cont.querySelector('.term-fin');
  fin.hidden=!!act;
  fin.textContent=act?'':'Terminaste todos los ejercicios de esta práctica. Puedes seguir probando comandos.';
  t.cont.querySelector('[data-t="pista"]').setAttribute('aria-disabled',act?'false':'true');
  var pi=t.cont.querySelector('.term-pista');
  if(!act||pi.getAttribute('data-de')!==act.id){pi.hidden=true;pi.removeAttribute('data-de')}
};
T.pista=function(){
  var t=this,act=(t.op.tareas||[]).filter(function(x){return !t.hechas[x.id]})[0],pi=t.cont.querySelector('.term-pista');
  if(!act)return;
  pi.innerHTML='<b>Pista:</b> '+enLinea(act.pista||'Revisa la lección: ahí está el comando que necesitas.');
  pi.hidden=false;pi.setAttribute('data-de',act.id);
};
T.revisar=function(){
  var t=this,ts=t.op.tareas||[],nuevas=[];
  ts.forEach(function(x){
    if(t.hechas[x.id])return;
    var ok=false;
    try{ok=!!x.ok(t.sis,t.ultimo,t)}catch(e){if(window.console)console.error('Ejercicio '+x.id,e)}
    if(ok){t.hechas[x.id]=new Date().toISOString();nuevas.push(x)}
  });
  if(!nuevas.length)return;
  if(t.op.clave){var g=guardados();g[t.op.clave]=t.hechas;try{localStorage.setItem(CLAVE,JSON.stringify(g))}catch(e){}}
  t.pintarTareas();
  var total=ts.length,hechas=ts.filter(function(x){return t.hechas[x.id]}).length;
  t.cont.querySelector('.term-aviso').textContent='Ejercicio completado: '+plano(nuevas.map(function(x){return x.texto.replace(/`/g,'')}).join('. '))+'. Llevas '+hechas+' de '+total+'.';
  nuevas.forEach(function(x){var li=t.cont.querySelector('[data-tarea="'+x.id+'"]');if(li)li.classList.add('nuevo')});
};

/* ---------- Ayuda de cada comando ---------- */
function ayudaDe(n){
  var m=CMD[n];
  return 'Uso: '+m.uso+'\n'+m.d.charAt(0).toUpperCase()+m.d.slice(1)+'.\n'+(m.ops.length?'\n'+m.ops.map(function(o){return '  '+pad(o[0],12)+' '+o[1]}).join('\n')+'\n':'');
}

/* =====================================================================
   Comandos
   ===================================================================== */
function leer(x,p,nom){
  var r=x.buscar(p);
  if(r.err==='permiso')return {e:nom+': '+p+': Permiso denegado'};
  if(r.err==='nodir')return {e:nom+': '+p+': No es un directorio'};
  if(!r.n)return {e:nom+': '+p+': No existe el archivo o el directorio'};
  if(r.n.t==='d')return {e:nom+': '+p+': Es un directorio'};
  if(!x.sis.puede(r.n,x.u,'r'))return {e:nom+': '+p+': Permiso denegado'};
  return {t:x.sis.contenido(r.n),n:r.n};
}
/* Textos de entrada: los archivos que se nombran o, si no hay, la entrada estándar */
function fuentes(x,pos,nom){
  if(!pos.length)return [{nombre:'',t:x.entrada==null?'':x.entrada}];
  return pos.map(function(p){var r=leer(x,p,nom);return r.e?{nombre:p,e:r.e}:{nombre:p,t:r.t}});
}
function lineasDe(t){var l=t.split('\n');if(l.length&&l[l.length-1]==='')l.pop();return l}
function nombreColor(sis,n,nom,tty,F){
  var d=n.t==='d',l=n.t==='l',x=!d&&!l&&n.t==='f'&&(n.modo&0o111),suf=F?(d?'/':l?'@':x?'*':''):'';
  if(!tty)return nom+suf;
  return (d?c('d',nom):l?c('l',nom):x?c('x',nom):nom)+suf;
}

/* --- La terminal --- */
cmd('help',{d:'muestra los comandos de esta terminal',cat:'La terminal',interna:true},function(x){
  var porCat={};
  Object.keys(CMD).sort().forEach(function(n){var m=CMD[n];if(m.d&&n.indexOf('.')<0&&(!m.paquete||x.sis.instalado(m.paquete))&&!m.oculto)(porCat[m.cat]=porCat[m.cat]||[]).push(n)});
  var o='Comandos de esta terminal (prueba también: comando --help y man comando):\n';
  CATS.forEach(function(k){if(!porCat[k])return;o+='\n'+c('b',k)+'\n'+porCat[k].map(function(n){return '  '+pad(n,11)+' '+CMD[n].d}).join('\n')+'\n'});
  x.out(o);
});
cmd('man',{d:'muestra el manual de un comando',uso:'man comando',cat:'La terminal'},function(x){
  var n=x.args[1];
  if(!n){x.err('¿Qué página del manual desea?\nPor ejemplo, pruebe «man man».\n');return 1}
  var m=CMD[n];
  if(!m||!m.d||m.paquete&&!x.sis.instalado(m.paquete)){x.err('No hay ninguna entrada de manual para '+n+'\n');return 16}
  var N=n.toUpperCase();
  x.out(c('b',N+'(1)')+'\n\n'+c('b','NOMBRE')+'\n       '+n+' - '+m.d+'\n\n'+c('b','SINOPSIS')+'\n       '+m.uso+'\n'+
    (m.ops.length?'\n'+c('b','OPCIONES MÁS USADAS')+'\n'+m.ops.map(function(o){return '       '+pad(o[0],10)+' '+o[1]}).join('\n')+'\n':''));
  x.consejo('man','en una terminal real, man abre un visor: bajas con las flechas o Espacio y sales con q.');
});
cmd('clear',{d:'limpia la pantalla (también Ctrl+L)',cat:'La terminal'},function(x){if(x.tty)x.t.limpiar()});
cmd('history',{d:'muestra los comandos que has escrito',uso:'history [-c]',ops:[['-c','borra el historial']],cat:'La terminal',interna:true},function(x){
  if(x.args[1]==='-c'){x.t.historial=[];x.t.pos=0;return}
  x.out(x.t.historial.map(function(h,i){return pad(i+1,5,true)+'  '+h}).join('\n')+'\n');
});
cmd('echo',{d:'escribe un texto',uso:'echo [-n] texto...',ops:[['-n','sin salto de línea al final'],['-e','interpreta \\n y \\t']],cat:'Ver y buscar texto'},function(x){
  var a=x.args.slice(1),n=false,e=false;
  while(a.length&&/^-[ne]+$/.test(a[0])){if(a[0].indexOf('n')>=0)n=true;if(a[0].indexOf('e')>=0)e=true;a.shift()}
  var s=a.join(' ');
  if(e)s=s.replace(/\\n/g,'\n').replace(/\\t/g,'\t');
  x.out(s+(n?'':'\n'));
});
cmd('exit logout',{d:'cierra la sesión actual (después de sudo -i o su)',cat:'La terminal',interna:true},function(x){
  var t=x.t;
  if(t.pila.length>1){
    var fr=t.pila.pop();x.sis.procesos=x.sis.procesos.filter(function(p){return p.pid!==fr.pid});
    x.out('logout\n');
    if(fr.sisPrevio){t.sis=fr.sisPrevio;x.out('Connection to '+fr.host+' closed.\n')}
    return 0;
  }
  x.consejo('exit','esta terminal es parte de la lección y no se cierra. Para limpiarla usa clear.');
});
cmd('alias',{d:'crea atajos para comandos',uso:"alias nombre='comando'",cat:'La terminal',interna:true},function(x){
  var a=x.args.slice(1);
  if(!a.length){x.out(Object.keys(x.sis.alias).sort().map(function(k){return "alias "+k+"='"+x.sis.alias[k]+"'"}).join('\n')+'\n');return}
  var cod=0;
  a.forEach(function(d){var i=d.indexOf('=');if(i<0){if(x.sis.alias[d])x.out("alias "+d+"='"+x.sis.alias[d]+"'\n");else{x.err('bash: alias: '+d+': no se encontró\n');cod=1}}else x.sis.alias[d.slice(0,i)]=d.slice(i+1)});
  return cod;
});
cmd('export',{d:'define una variable de entorno',uso:'export NOMBRE=valor',cat:'La terminal',interna:true},function(x){
  var fr=x.t.frame();
  if(x.args.length<2){var env=x.t.entorno();Object.keys(fr.vars).forEach(function(k){env[k]=fr.vars[k]});x.out(Object.keys(env).sort().map(function(k){return 'declare -x '+k+'="'+env[k]+'"'}).join('\n')+'\n');return}
  x.args.slice(1).forEach(function(d){var i=d.indexOf('=');if(i>0)fr.vars[d.slice(0,i)]=d.slice(i+1)});
});
cmd('unset',{d:'borra una variable',uso:'unset NOMBRE',cat:'La terminal',interna:true},function(x){x.args.slice(1).forEach(function(k){delete x.t.frame().vars[k]})});
cmd('env printenv',{d:'muestra las variables de entorno',uso:'printenv [NOMBRE]',cat:'La terminal'},function(x){
  var env=x.t.entorno(),fr=x.t.frame();Object.keys(fr.vars).forEach(function(k){if(!/^[0-9#@]$/.test(k))env[k]=fr.vars[k]});
  if(x.args[1]){if(env[x.args[1]]==null)return 1;x.out(env[x.args[1]]+'\n');return}
  x.out(Object.keys(env).sort().map(function(k){return k+'='+env[k]}).join('\n')+'\n');
});
cmd('type',{d:'dice qué es un comando: interno, alias o programa',uso:'type comando',cat:'La terminal',interna:true},function(x){
  var cod=0;
  x.args.slice(1).forEach(function(n){
    if(x.sis.alias[n])x.out(n+" es un alias de «"+x.sis.alias[n]+"»\n");
    else if(CMD[n]&&CMD[n].interna)x.out(n+' es una orden interna del shell\n');
    else if(CMD[n]&&(!CMD[n].paquete||x.sis.instalado(CMD[n].paquete)))x.out(n+' es '+(CMD[n].sbin?'/usr/sbin/':'/usr/bin/')+n+'\n');
    else{x.err('bash: type: '+n+': no se encontró\n');cod=1}
  });
  return cod;
});
cmd('which',{d:'dice dónde está el programa de un comando',uso:'which comando',cat:'La terminal'},function(x){
  var cod=0;
  x.args.slice(1).forEach(function(n){var m=CMD[n];if(m&&!m.interna&&(!m.paquete||x.sis.instalado(m.paquete)))x.out((m.sbin?'/usr/sbin/':'/usr/bin/')+n+'\n');else cod=1});
  return cod;
});
cmd('source .',{d:'ejecuta un archivo de comandos en esta misma terminal',uso:'source archivo',cat:'La terminal',interna:true},function(x){
  var p=x.args[1];if(!p){x.err('bash: source: se requiere un argumento con el nombre de archivo\n');return 2}
  var r=leer(x,p,'bash');if(r.e){x.err(r.e+'\n');return 1}
  return x.t.correrScript(r.t,x.args.slice(1),x,true);
});
cmd('bash sh',{d:'ejecuta un script de comandos',uso:'bash script.sh',cat:'La terminal'},function(x){
  var p=x.args[1];
  if(!p){x.consejo('bash','ya estás en bash. Para correr un script escribe bash script.sh o ./script.sh.');return 0}
  if(p==='-c'){var cap=x.tty?null:{buf:''};return x.t.correrLinea(x.args[2]||'',cap).then(function(r){if(cap)x.out(cap.buf);return r})}
  var r=leer(x,p,x.args[0]);if(r.e){x.err(r.e+'\n');return 127}
  return x.t.correrScript(r.t,x.args.slice(1),x);
});

/* --- Archivos y carpetas --- */
cmd('pwd',{d:'muestra en qué carpeta estás',cat:'Archivos y carpetas'},function(x){x.out(x.cwd+'\n')});
cmd('cd',{d:'cambia de carpeta',uso:'cd [carpeta]',ops:[['cd ..','sube a la carpeta de arriba'],['cd ~','va a tu carpeta personal (también cd solo)'],['cd -','regresa a la carpeta anterior']],cat:'Archivos y carpetas',interna:true},function(x){
  var a=x.args.slice(1),fr=x.t.frame();
  if(a.length>1){x.err('bash: cd: demasiados argumentos\n');return 1}
  var p=a[0];
  if(p==null||p==='')p=x.sis.home(fr.u);
  if(p==='-'){if(!fr.viejo){x.err('bash: cd: «OLDPWD» no está establecido\n');return 1}p=fr.viejo;x.out(p+'\n')}
  var ab=x.abs(p),r=x.sis.buscar(ab,x.u),mostrar=a[0]||p;
  if(r.err==='permiso'){x.err('bash: cd: '+mostrar+': Permiso denegado\n');return 1}
  if(r.err==='nodir'||r.n&&r.n.t!=='d'){x.err('bash: cd: '+mostrar+': No es un directorio\n');return 1}
  if(!r.n){x.err('bash: cd: '+mostrar+': No existe el archivo o el directorio\n');return 1}
  if(!x.sis.puede(r.n,x.u,'x')){x.err('bash: cd: '+mostrar+': Permiso denegado\n');return 1}
  fr.viejo=fr.cwd;fr.cwd=ab;
});
cmd('ls',{d:'lista lo que hay en una carpeta',uso:'ls [opciones] [carpeta...]',ops:[['-l','formato largo: permisos, dueño, tamaño y fecha'],['-a','muestra también los ocultos (empiezan con punto)'],['-h','tamaños fáciles de leer (con -l)'],['-t','ordena por fecha, lo más nuevo primero'],['-r','invierte el orden'],['-d','muestra la carpeta, no su contenido']],cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),f=o.f,objs=o.pos.length?o.pos:['.'],cod=0,s=x.sis;
  if(o.largo.help){x.out(ayudaDe('ls'));return 0}
  if(o.largo.all)f.a=true;
  var largo=f.l,uno=f['1']||!x.tty,F=f.F;
  function lista(ents){
    if(f.t)ents.sort(function(a,b){return b.n.m-a.n.m});
    if(f.r)ents.reverse();
    if(!largo)return ents.length?ents.map(function(e){return nombreColor(s,e.n,e.nombre,x.tty,F)}).join(uno?'\n':'  ')+'\n':'';
    var w={k:1,u:1,g:1,t:1};
    var filas=ents.map(function(e){
      var n=e.n,k=n.t==='d'?2+Object.keys(n.h).filter(function(h){return n.h[h].t==='d'}).length:1;
      var tam=n.t==='c'?n.num:f.h?humano(s.tam(n)):String(s.tam(n));
      var r={m:s.modoTexto(n),k:String(k),u:n.u,g:n.g,t:tam,f:fechaLs(n.m),nom:nombreColor(s,n,e.nombre,x.tty,F)+(n.t==='l'?' -> '+(n.txt||n.dest):'')};
      w.k=Math.max(w.k,r.k.length);w.u=Math.max(w.u,r.u.length);w.g=Math.max(w.g,r.g.length);w.t=Math.max(w.t,r.t.length);
      return r;
    });
    return filas.map(function(r){return r.m+' '+pad(r.k,w.k,true)+' '+pad(r.u,w.u)+' '+pad(r.g,w.g)+' '+pad(r.t,w.t,true)+' '+r.f+' '+r.nom}).join('\n')+(filas.length?'\n':'');
  }
  var archivos=[],dirs=[];
  objs.forEach(function(p){
    var r=x.buscar(p,largo||f.d);
    if(r.err==='permiso'){x.err("ls: no se puede acceder a '"+p+"': Permiso denegado\n");cod=2;return}
    if(!r.n){x.err("ls: no se puede acceder a '"+p+"': No existe el archivo o el directorio\n");cod=2;return}
    var n=r.n;
    if(n.t==='l'&&largo&&!f.d&&/\/$/.test(p))n=s.destino(n)||n;
    if(n.t==='d'&&!f.d)dirs.push({p:p,n:n,ab:x.abs(p)});else archivos.push({nombre:p,n:n});
  });
  var out='';
  if(archivos.length)out+=lista(archivos);
  dirs.forEach(function(d,i){
    if(!s.puede(d.n,x.u,'r')){x.err("ls: no se puede abrir el directorio '"+d.p+"': Permiso denegado\n");cod=2;return}
    var ents=Object.keys(d.n.h).filter(function(k){return f.a||f.A||k.charAt(0)!=='.'}).sort(ordenar).map(function(k){return {nombre:k,n:d.n.h[k]}});
    if(f.a){var pa=s.buscar(dirname(d.ab),'root').n||d.n;ents.unshift({nombre:'..',n:pa});ents.unshift({nombre:'.',n:d.n})}
    if(objs.length>1||archivos.length)out+=(out?'\n':'')+d.p+':\n';
    if(largo){var tot=0;ents.forEach(function(e){if(e.nombre!=='.'&&e.nombre!=='..'||f.a)tot+=e.n.t==='d'?4:Math.ceil(s.tam(e.n)/4096)*4});out+='total '+tot+'\n'}
    out+=lista(ents);
  });
  x.out(out);
  return cod;
});
cmd('mkdir',{d:'crea carpetas',uso:'mkdir [-p] carpeta...',ops:[['-p','crea también las carpetas de arriba que falten'],['-v','dice qué creó']],cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),cod=0;
  if(!o.pos.length){x.err("mkdir: falta un operando\nPruebe 'mkdir --help' para más información.\n");return 1}
  o.pos.forEach(function(p){
    var e=x.sis.mkdir(x.abs(p),x.u,o.f.p);
    if(e){x.err('mkdir: no se puede crear el directorio «'+p+'»: '+e+'\n');cod=1}
    else if(o.f.v)x.out("mkdir: se ha creado el directorio '"+p+"'\n");
  });
  return cod;
});
cmd('rmdir',{d:'borra carpetas vacías',uso:'rmdir carpeta...',cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),cod=0;
  if(!o.pos.length){x.err('rmdir: falta un operando\n');return 1}
  o.pos.forEach(function(p){
    var r=x.buscar(p,true),e=null;
    if(r.err==='permiso')e='Permiso denegado';
    else if(!r.n)e='No existe el archivo o el directorio';
    else if(r.n.t!=='d')e='No es un directorio';
    else if(Object.keys(r.n.h).length)e='El directorio no está vacío';
    else if(!x.sis.puede(r.padre,x.u,'w'))e='Permiso denegado';
    if(e){x.err("rmdir: no se pudo borrar '"+p+"': "+e+'\n');cod=1;return}
    delete r.padre.h[r.nombre];
  });
  return cod;
});
cmd('touch',{d:'crea un archivo vacío o actualiza su fecha',uso:'touch archivo...',cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),cod=0;
  if(!o.pos.length){x.err('touch: falta un operando de archivo\n');return 1}
  o.pos.forEach(function(p){
    var r=x.buscar(p),e=null;
    if(r.n){if(r.n.u===x.u||x.u==='root'||x.sis.puede(r.n,x.u,'w'))r.n.m=new Date();else e='Permiso denegado'}
    else e=x.sis.escribir(x.abs(p),'',x.u,true);
    if(e){x.err("touch: no se puede efectuar `touch' sobre '"+p+"': "+e+'\n');cod=1}
  });
  return cod;
});
cmd('cat',{d:'muestra el contenido de archivos de texto',uso:'cat [-n] archivo...',ops:[['-n','numera las líneas']],cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args),cod=0,out='',num=0;
  fuentes(x,o.pos,'cat').forEach(function(s){
    if(s.e){x.out(out);out='';x.err(s.e+'\n');cod=1;return}
    out+=o.f.n?lineasDe(s.t).map(function(l){return pad(++num,6,true)+'\t'+l}).join('\n')+(s.t?'\n':''):s.t;
  });
  x.out(out);
  return cod;
});
cmd('less more',{d:'muestra un archivo largo por páginas',uso:'less archivo',cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args),cod=0;
  fuentes(x,o.pos,x.args[0]).forEach(function(s){if(s.e){x.err(s.e+'\n');cod=1}else x.out(s.t)});
  x.consejo('less','en una terminal real, less muestra el archivo por páginas: bajas con Espacio o las flechas y sales con q. Aquí se muestra completo.');
  return cod;
});
function cabezaCola(x,cola){
  var a=x.args.slice(1),n=10,pos=[],seguir=false;
  for(var i=0;i<a.length;i++){
    var v=a[i],m;
    if(v==='-n'){n=parseInt(a[++i],10);continue}
    if((m=v.match(/^-n(\d+)$/))||(m=v.match(/^-(\d+)$/))||(m=v.match(/^--lines=(\d+)$/))){n=+m[1];continue}
    if(v==='-f'){seguir=true;continue}
    pos.push(v);
  }
  if(isNaN(n)){x.err(x.args[0]+': número de líneas no válido\n');return 1}
  var src=fuentes(x,pos,x.args[0]),cod=0,out='';
  src.forEach(function(s,k){
    if(s.e){x.err(s.e+'\n');cod=1;return}
    if(src.length>1)out+=(k?'\n':'')+'==> '+s.nombre+' <==\n';
    var l=lineasDe(s.t);
    l=cola?l.slice(Math.max(0,l.length-n)):l.slice(0,n);
    out+=l.join('\n')+(l.length?'\n':'');
  });
  x.out(out);
  if(seguir)x.consejo('tail-f','en una terminal real, tail -f se queda esperando líneas nuevas hasta que pulses Ctrl+C. Es la forma de ver un registro en vivo.');
  return cod;
}
cmd('head',{d:'muestra las primeras líneas',uso:'head [-n N] archivo',ops:[['-n N','cuántas líneas (10 si no dices)']],cat:'Ver y buscar texto'},function(x){return cabezaCola(x,false)});
cmd('tail',{d:'muestra las últimas líneas',uso:'tail [-n N] [-f] archivo',ops:[['-n N','cuántas líneas (10 si no dices)'],['-f','sigue mostrando lo que se agregue']],cat:'Ver y buscar texto'},function(x){return cabezaCola(x,true)});
cmd('wc',{d:'cuenta líneas, palabras y bytes',uso:'wc [-l] [-w] [-c] [archivo...]',ops:[['-l','solo líneas'],['-w','solo palabras'],['-c','solo bytes']],cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args),f=o.f,todos=!f.l&&!f.w&&!f.c&&!f.m,cod=0,filas=[],tot=[0,0,0];
  fuentes(x,o.pos,'wc').forEach(function(s){
    if(s.e){x.err(s.e+'\n');cod=1;return}
    var v=[(s.t.match(/\n/g)||[]).length,(s.t.match(/\S+/g)||[]).length,bytesDe(s.t)];
    tot=tot.map(function(a,i){return a+v[i]});
    filas.push({v:v,n:s.nombre});
  });
  if(filas.length>1)filas.push({v:tot,n:'total'});
  var sel=function(v){return todos?v:[f.l?v[0]:null,f.w?v[1]:null,f.c||f.m?v[2]:null].filter(function(z){return z!==null})};
  var ancho=1;filas.forEach(function(r){sel(r.v).forEach(function(z){ancho=Math.max(ancho,String(z).length)})});
  var solo=sel([0,0,0]).length===1&&filas.length===1;
  x.out(filas.map(function(r){return sel(r.v).map(function(z){return solo?String(z):pad(z,ancho,true)}).join(' ')+(r.n?' '+r.n:'')}).join('\n')+(filas.length?'\n':''));
  return cod;
});
cmd('grep',{d:'busca líneas que contengan un texto',uso:'grep [opciones] texto [archivo...]',ops:[['-i','sin distinguir mayúsculas'],['-n','muestra el número de línea'],['-v','las líneas que NO lo tienen'],['-c','solo cuenta cuántas'],['-r','busca en todas las carpetas de adentro'],['-l','solo los nombres de archivo'],['-w','solo palabras completas']],cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args,'e'),f=o.f,pat=o.val.e!=null?o.val.e:o.pos.shift();
  if(pat==null){x.err('Modo de empleo: grep [OPCIÓN]... PATRONES [ARCHIVO]...\n');return 2}
  var fuente=f.F?pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):pat.replace(/\\([|()+?{}])/g,'$1');
  if(f.w)fuente='\\b(?:'+fuente+')\\b';
  var re;try{re=new RegExp(fuente,f.i?'gi':'g')}catch(e){re=new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),f.i?'gi':'g')}
  var rec=f.r||f.R,src=[],cod=2,hubo=false,errores=false;
  if(rec&&!o.pos.length)o.pos=['.'];
  if(rec){
    o.pos.forEach(function(p){
      (function rec2(ruta,n){
        if(n.t==='d'){
          if(!x.sis.puede(n,x.u,'r')||!x.sis.puede(n,x.u,'x')){x.err('grep: '+ruta+': Permiso denegado\n');errores=true;return}
          Object.keys(n.h).sort(ordenar).forEach(function(k){if(n.h[k].t!=='l')rec2(ruta.replace(/\/$/,'')+'/'+k,n.h[k])});
        }else if(n.t==='f'){
          if(!x.sis.puede(n,x.u,'r')){x.err('grep: '+ruta+': Permiso denegado\n');errores=true;return}
          src.push({nombre:ruta,t:x.sis.contenido(n)});
        }
      })(p,(x.buscar(p).n)||{t:'x'});
      if(!x.buscar(p).n){x.err('grep: '+p+': No existe el archivo o el directorio\n');errores=true}
    });
  }else src=fuentes(x,o.pos,'grep');
  var varios=src.length>1||rec,out='';
  src.forEach(function(s){
    if(s.e){x.err(s.e.replace(/Es un directorio$/,'Es un directorio')+'\n');errores=true;return}
    var n=0;
    lineasDe(s.t).forEach(function(l,i){
      re.lastIndex=0;
      var si=re.test(l)!==!!f.v;
      if(!si)return;
      n++;hubo=true;
      if(f.c||f.l)return;
      re.lastIndex=0;
      var txt=x.tty&&!f.v?l.replace(re,function(m){return m?c('m',m):m}):l;
      out+=(varios?(x.tty?c('l',s.nombre):s.nombre)+':':'')+(f.n?(x.tty?c('g',String(i+1)):i+1)+':':'')+txt+'\n';
    });
    if(f.c)out+=(varios?s.nombre+':':'')+n+'\n';
    if(f.l&&n)out+=s.nombre+'\n';
  });
  x.out(out);
  return errores&&!hubo?2:hubo?0:1;
});
cmd('sort',{d:'ordena líneas',uso:'sort [-r] [-n] [-u] [archivo]',ops:[['-r','orden inverso'],['-n','como números'],['-u','sin repetidos'],['-k N','ordena por la columna N']],cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args,'kt'),f=o.f,cod=0,l=[];
  fuentes(x,o.pos,'sort').forEach(function(s){if(s.e){x.err(s.e+'\n');cod=2}else l=l.concat(lineasDe(s.t))});
  var k=o.val.k?parseInt(o.val.k,10):0,num=f.n||/n/.test(o.val.k||''),inv=f.r||/r/.test(o.val.k||'');
  var clave=function(s){if(!k)return s;var p=o.val.t?s.split(o.val.t):s.trim().split(/\s+/);return p[k-1]||''};
  l.sort(function(a,b){var A2=clave(a),B=clave(b);return num?(parseFloat(A2)||0)-(parseFloat(B)||0)||ordenar(a,b):ordenar(A2,B)});
  if(inv)l.reverse();
  if(f.u)l=l.filter(function(v,i){return !i||v!==l[i-1]});
  x.out(l.join('\n')+(l.length?'\n':''));
  return cod;
});
cmd('uniq',{d:'quita líneas repetidas seguidas',uso:'uniq [-c] [archivo]',ops:[['-c','cuenta cuántas veces se repite cada una']],cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args),s=fuentes(x,o.pos,'uniq')[0];
  if(s.e){x.err(s.e+'\n');return 1}
  var out=[],prev=null,n=0;
  lineasDe(s.t).concat([null]).forEach(function(l){
    if(l===prev){n++;return}
    if(prev!==null)out.push(o.f.c?pad(n,7,true)+' '+prev:prev);
    prev=l;n=1;
  });
  x.out(out.join('\n')+(out.length?'\n':''));
});
cmd('tee',{d:'copia la entrada a la pantalla y a un archivo',uso:'tee [-a] archivo',ops:[['-a','agrega al final en lugar de reemplazar']],cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args),txt=x.entrada||'',cod=0;
  o.pos.forEach(function(p){var e=x.sis.escribir(x.abs(p),txt,x.u,!!o.f.a);if(e){x.err('tee: '+p+': '+e+'\n');cod=1}});
  x.out(txt);
  return cod;
});
cmd('cp',{d:'copia archivos y carpetas',uso:'cp [-r] origen... destino',ops:[['-r','copia carpetas con todo lo que tienen'],['-v','dice qué copió']],cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),s=x.sis,cod=0;
  if(o.pos.length<2){x.err(o.pos.length?"cp: falta el archivo de destino después de '"+o.pos[0]+"'\n":'cp: falta un archivo como operando\n');return 1}
  var dest=o.pos.pop(),rd=x.buscar(dest),destDir=rd.n&&rd.n.t==='d';
  if(o.pos.length>1&&!destDir){x.err("cp: el destino '"+dest+"' no es un directorio\n");return 1}
  function clonar(n){
    var k={t:n.t,u:x.u,g:s.grupoPrin(x.u),modo:n.modo&~s.umask(x.u)&0o7777,m:new Date()};
    if(n.t==='d'){k.h={};Object.keys(n.h).forEach(function(h){k.h[h]=clonar(n.h[h])})}else{k.c=s.contenido(n);if(n.dest)k.dest=n.dest}
    return k;
  }
  function legible(n){if(!s.puede(n,x.u,'r'))return false;if(n.t==='d'){if(!s.puede(n,x.u,'x'))return false;for(var h in n.h)if(!legible(n.h[h]))return false}return true}
  o.pos.forEach(function(p){
    var r=x.buscar(p);
    if(r.err==='permiso'){x.err("cp: no se puede efectuar `stat' sobre '"+p+"': Permiso denegado\n");cod=1;return}
    if(!r.n){x.err("cp: no se puede efectuar `stat' sobre '"+p+"': No existe el archivo o el directorio\n");cod=1;return}
    if(r.n.t==='d'&&!o.f.r&&!o.f.R&&!o.f.a){x.err("cp: -r no especificado; se omite el directorio '"+p+"'\n");cod=1;return}
    if(!legible(r.n)){x.err("cp: no se puede abrir '"+p+"' para lectura: Permiso denegado\n");cod=1;return}
    var abD=destDir?unir(x.abs(dest),basename(x.abs(p))):x.abs(dest);
    if(r.n.t==='d'&&(abD+'/').indexOf(x.abs(p)+'/')===0){x.err("cp: no se puede copiar un directorio, '"+p+"', en sí mismo, '"+dest+"'\n");cod=1;return}
    var rt=s.buscar(abD,x.u);
    if(rt.err==='permiso'||rt.err==='nodir'||!rt.n&&!rt.padre){x.err("cp: no se puede crear el archivo regular '"+dest+"': "+(rt.err==='permiso'?'Permiso denegado':'No existe el archivo o el directorio')+'\n');cod=1;return}
    if(rt.n&&rt.n.t==='d'&&r.n.t!=='d'){x.err("cp: no se puede sobrescribir el directorio '"+dest+"' con un no directorio\n");cod=1;return}
    if(rt.n&&r.n.t==='f'){var e=s.escribir(abD,s.contenido(r.n),x.u,false);if(e){x.err("cp: no se puede crear el archivo regular '"+dest+"': "+e+'\n');cod=1}return}
    if(!s.puede(rt.padre,x.u,'w')){x.err("cp: no se puede crear el archivo regular '"+dest+"': Permiso denegado\n");cod=1;return}
    rt.padre.h[basename(abD)]=clonar(r.n);rt.padre.m=new Date();
    if(o.f.v)x.out("'"+p+"' -> '"+(destDir?unir(dest.replace(/\/$/,''),basename(x.abs(p))):dest)+"'\n");
  });
  return cod;
});
cmd('mv',{d:'mueve o cambia el nombre de archivos y carpetas',uso:'mv origen... destino',ops:[['-v','dice qué movió'],['-i','pregunta antes de reemplazar']],cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),s=x.sis,cod=0;
  if(o.pos.length<2){x.err(o.pos.length?"mv: falta el archivo de destino después de '"+o.pos[0]+"'\n":'mv: falta un archivo como operando\n');return 1}
  var dest=o.pos.pop(),rd=x.buscar(dest),destDir=rd.n&&rd.n.t==='d';
  if(o.pos.length>1&&!destDir){x.err("mv: el destino '"+dest+"' no es un directorio\n");return 1}
  o.pos.forEach(function(p){
    var r=x.buscar(p,true),abO=x.abs(p);
    if(r.err==='permiso'){x.err("mv: no se puede efectuar `stat' sobre '"+p+"': Permiso denegado\n");cod=1;return}
    if(!r.n){x.err("mv: no se puede efectuar `stat' sobre '"+p+"': No existe el archivo o el directorio\n");cod=1;return}
    var abD=destDir?unir(x.abs(dest),basename(abO)):x.abs(dest);
    if(abD===abO){x.err("mv: '"+p+"' y '"+dest+"' son el mismo archivo\n");cod=1;return}
    if(r.n.t==='d'&&(abD+'/').indexOf(abO+'/')===0){x.err("mv: no se puede mover '"+p+"' a un subdirectorio de sí mismo, '"+dest+'/'+basename(abO)+"'\n");cod=1;return}
    if(!r.padre){x.err("mv: no se puede mover '"+p+"': Dispositivo o recurso ocupado\n");cod=1;return}
    var pegajoso=r.padre.modo&0o1000&&x.u!=='root'&&r.n.u!==x.u&&r.padre.u!==x.u;
    if(!s.puede(r.padre,x.u,'w')||pegajoso){x.err("mv: no se puede mover '"+p+"' a '"+dest+"': Permiso denegado\n");cod=1;return}
    var rt=s.buscar(abD,x.u);
    if(rt.err==='permiso'||rt.err==='nodir'||!rt.n&&!rt.padre){x.err("mv: no se puede mover '"+p+"' a '"+dest+"': "+(rt.err==='permiso'?'Permiso denegado':'No existe el archivo o el directorio')+'\n');cod=1;return}
    if(!s.puede(rt.padre,x.u,'w')){x.err("mv: no se puede mover '"+p+"' a '"+dest+"': Permiso denegado\n");cod=1;return}
    if(rt.n&&rt.n.t==='d'&&r.n.t!=='d'){x.err("mv: no se puede sobrescribir el directorio '"+dest+"' con un no directorio\n");cod=1;return}
    delete r.padre.h[r.nombre];r.padre.m=new Date();
    rt.padre.h[basename(abD)]=r.n;rt.padre.m=new Date();
    if(o.f.v)x.out("renombrado '"+p+"' -> '"+(destDir?unir(dest.replace(/\/$/,''),basename(abO)):dest)+"'\n");
  });
  return cod;
});
cmd('rm',{d:'borra archivos (y carpetas con -r). No hay papelera',uso:'rm [-r] [-f] [-i] archivo...',ops:[['-r','borra carpetas con todo lo que tienen'],['-f','no pregunta ni avisa si no existe'],['-i','pregunta antes de borrar cada uno'],['-v','dice qué borró']],cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),f=o.f,s=x.sis,cod=0,rec=f.r||f.R;
  if(!o.pos.length){if(!f.f){x.err("rm: falta un operando\nPruebe 'rm --help' para más información.\n");return 1}return 0}
  return o.pos.reduce(function(pr,p){
    return pr.then(function(){
      var ab=x.abs(p);
      if(ab==='/'&&rec){x.err("rm: es peligroso operar recursivamente sobre '/'\nrm: use --no-preserve-root para anular esta medida de seguridad\n");cod=1;return}
      if(/(^|\/)\.\.?$/.test(p)){x.err("rm: no se permite borrar los directorios '.' o '..': se omite '"+p+"'\n");cod=1;return}
      var r=x.buscar(p,true);
      if(r.err==='permiso'){x.err("rm: no se puede borrar '"+p+"': Permiso denegado\n");cod=1;return}
      if(!r.n){if(!f.f){x.err("rm: no se puede borrar '"+p+"': No existe el archivo o el directorio\n");cod=1}return}
      if(r.n.t==='d'&&!rec){x.err("rm: no se puede borrar '"+p+"': Es un directorio\n");cod=1;return}
      if(!r.padre){x.err("rm: no se puede borrar '"+p+"': Dispositivo o recurso ocupado\n");cod=1;return}
      var pegajoso=r.padre.modo&0o1000&&x.u!=='root'&&r.n.u!==x.u&&r.padre.u!==x.u;
      if(!s.puede(r.padre,x.u,'w')||pegajoso||r.n.t==='d'&&Object.keys(r.n.h).length&&!s.puede(r.n,x.u,'w')){x.err("rm: no se puede borrar '"+p+"': Permiso denegado\n");cod=1;return}
      var q=f.i?x.pedir("rm: ¿borrar "+(r.n.t==='d'?'el directorio':'el archivo regular')+" '"+p+"'? "):Promise.resolve('s');
      return q.then(function(v){
        if(!/^[sSyY]/.test(v))return;
        delete r.padre.h[r.nombre];r.padre.m=new Date();
        if(f.v)x.out((r.n.t==='d'?"se ha borrado el directorio '":"se ha borrado '")+p+"'\n");
      });
    });
  },Promise.resolve()).then(function(){
    if(rec&&f.f)x.consejo('rm-rf','rm -rf borra sin preguntar y sin papelera. Revisa dos veces la ruta antes de usarlo en una computadora real.');
    return cod;
  });
});
cmd('find',{d:'busca archivos por nombre o tipo',uso:'find [carpeta] [-name patrón] [-type f|d]',ops:[['-name "*.txt"','por nombre (con comodines)'],['-iname','igual, sin distinguir mayúsculas'],['-type f','solo archivos (d: solo carpetas)'],['-user nombre','de un dueño'],['-maxdepth N','hasta N niveles']],cat:'Archivos y carpetas'},function(x){
  var a=x.args.slice(1),inicios=[],i=0;
  while(i<a.length&&a[i].charAt(0)!=='-'){inicios.push(a[i]);i++}
  if(!inicios.length)inicios=['.'];
  var nombre=null,tipo=null,usuario=null,max=Infinity;
  for(;i<a.length;i++){
    if(a[i]==='-name')nombre=patronRe(a[++i]||'');
    else if(a[i]==='-iname')nombre=patronRe(a[++i]||'',true);
    else if(a[i]==='-type')tipo=a[++i];
    else if(a[i]==='-user')usuario=a[++i];
    else if(a[i]==='-maxdepth')max=parseInt(a[++i],10);
    else{x.err("find: predicado desconocido '"+a[i]+"'\n");return 1}
  }
  var out='',cod=0;
  inicios.forEach(function(p){
    var r=x.buscar(p);
    if(!r.n){x.err("find: '"+p+"': "+(r.err==='permiso'?'Permiso denegado':'No existe el archivo o el directorio')+'\n');cod=1;return}
    (function rec(ruta,n,prof,nom){
      var ok=(!nombre||nombre.test(nom))&&(!tipo||(tipo==='d'?n.t==='d':tipo==='f'?n.t==='f':tipo==='l'?n.t==='l':false))&&(!usuario||n.u===usuario);
      if(ok)out+=ruta+'\n';
      if(n.t!=='d'||prof>=max)return;
      if(!x.sis.puede(n,x.u,'r')||!x.sis.puede(n,x.u,'x')){x.out(out);out='';x.err("find: '"+ruta+"': Permiso denegado\n");cod=1;return}
      Object.keys(n.h).sort(ordenar).forEach(function(k){rec(ruta.replace(/\/$/,'')+'/'+k,n.h[k],prof+1,k)});
    })(p,r.n,0,basename(x.abs(p)));
  });
  x.out(out);
  return cod;
});
cmd('tree',{d:'muestra carpetas y archivos como un árbol',uso:'tree [-a] [-d] [-L N] [carpeta]',ops:[['-a','incluye los ocultos'],['-d','solo carpetas'],['-L N','hasta N niveles']],cat:'Archivos y carpetas',paq:'tree'},function(x){
  var o=opts(x.args,'L'),p=o.pos[0]||'.',r=x.buscar(p),max=o.val.L?parseInt(o.val.L,10):Infinity,nd=0,nf=0;
  if(!r.n||r.n.t!=='d'){x.out(p+'  [error opening dir]\n\n0 directories, 0 files\n');return 2}
  var out=(x.tty?c('d',p):p)+'\n';
  (function rec(n,pre,prof){
    if(prof>max)return;
    if(!x.sis.puede(n,x.u,'r')){out+=pre+'[error opening dir]\n';return}
    var ks=Object.keys(n.h).filter(function(k){return (o.f.a||k.charAt(0)!=='.')&&(!o.f.d||n.h[k].t==='d')}).sort(ordenar);
    ks.forEach(function(k,i){
      var h=n.h[k],ult=i===ks.length-1;
      out+=pre+(ult?'└── ':'├── ')+nombreColor(x.sis,h,k,x.tty)+'\n';
      if(h.t==='d'){nd++;rec(h,pre+(ult?'    ':'│   '),prof+1)}else nf++;
    });
  })(r.n,'',1);
  out+='\n'+nd+' director'+(nd===1?'y':'ies')+(o.f.d?'':', '+nf+' file'+(nf===1?'':'s'))+'\n';
  x.out(out);
});
cmd('file',{d:'dice qué tipo de archivo es',uso:'file archivo...',cat:'Archivos y carpetas'},function(x){
  x.args.slice(1).forEach(function(p){
    var r=x.buscar(p,true),n=r.n,t;
    if(!n)t="cannot open `"+p+"' (No such file or directory)";
    else if(n.t==='d')t='directory';
    else if(n.t==='l')t='symbolic link to '+(n.txt||n.dest);
    else if(n.t==='c')t='character special (1/3)';
    else{var tx=x.sis.contenido(n);t=!tx?'empty':tx.indexOf(MARCA_TAR)===0?(JSON.parse(tx.slice(MARCA_TAR.length)).z?'gzip compressed data, from Unix, original size modulo 2^32 10240':'POSIX tar archive (GNU)'):tx.charAt(0)==='\u007f'?'ELF 64-bit LSB pie executable, x86-64':/^#!.*bash/.test(tx)?'Bourne-Again shell script, '+(/[^\x00-\x7f]/.test(tx)?'Unicode text, UTF-8 text':'ASCII text')+' executable':/^</.test(tx.trim())?'HTML document, ASCII text':/[^\x00-\x7f]/.test(tx)?'Unicode text, UTF-8 text':'ASCII text'}
    x.out(p+': '+t+'\n');
  });
});
cmd('stat',{d:'muestra los datos de un archivo: permisos, dueño y fechas',uso:'stat archivo',cat:'Archivos y carpetas'},function(x){
  var cod=0;
  x.args.slice(1).forEach(function(p){
    var r=x.buscar(p,true),n=r.n,s=x.sis;
    if(!n){x.err("stat: no se puede efectuar `stat' sobre '"+p+"': "+(r.err==='permiso'?'Permiso denegado':'No existe el archivo o el directorio')+'\n');cod=1;return}
    var u=s.usuarios[n.u],g=s.grupos[n.g],m=n.modo&0o7777,d=n.m;
    x.out('  Archivo: '+p+'\n  Tamaño: '+s.tam(n)+'\tTipo: '+(n.t==='d'?'directorio':n.t==='l'?'enlace simbólico':n.t==='c'?'dispositivo de caracteres':s.tam(n)?'archivo regular':'archivo regular vacío')+'\n'+
      'Acceso: ('+pad(m.toString(8),4,true).replace(/ /g,'0')+'/'+s.modoTexto(n)+')  Uid: ('+pad(u?u.uid:'?',5,true)+'/'+pad(n.u,8,true)+')   Gid: ('+pad(g?g.gid:'?',5,true)+'/'+pad(n.g,8,true)+')\n'+
      'Modificación: '+d.getFullYear()+'-'+dos(d.getMonth()+1)+'-'+dos(d.getDate())+' '+hora(d)+' -0600\n');
  });
  return cod;
});

/* --- Usuarios y permisos --- */
cmd('whoami',{d:'dice con qué usuario estás trabajando',cat:'Usuarios y permisos'},function(x){x.out(x.u+'\n')});
cmd('id',{d:'muestra tu usuario, tu grupo y tus grupos',uso:'id [usuario]',cat:'Usuarios y permisos'},function(x){
  var n=x.args[1]||x.u,u=x.sis.usuarios[n],s=x.sis;
  if(!u){x.err("id: '"+n+"': no existe ese usuario\n");return 1}
  var g=function(k){return s.grupos[k].gid+'('+k+')'};
  x.out('uid='+u.uid+'('+n+') gid='+g(u.grupos[0])+' grupos='+u.grupos.map(g).join(',')+'\n');
});
cmd('groups',{d:'muestra los grupos de un usuario',uso:'groups [usuario]',cat:'Usuarios y permisos'},function(x){
  var cod=0,ns=x.args.slice(1);
  if(!ns.length){x.out(x.sis.usuarios[x.u].grupos.join(' ')+'\n');return}
  ns.forEach(function(n){var u=x.sis.usuarios[n];if(!u){x.err("groups: '"+n+"': no existe ese usuario\n");cod=1}else x.out(n+' : '+u.grupos.join(' ')+'\n')});
  return cod;
});
cmd('sudo',{d:'ejecuta un comando como administrador (root)',uso:'sudo [-u usuario] comando',ops:[['-u usuario','como otro usuario en lugar de root'],['-i','abre una terminal de root (sal con exit)']],cat:'Usuarios y permisos'},function(x){
  var a=x.args.slice(1),como='root',t=x.t;
  if(a[0]==='-u'){como=a[1];a=a.slice(2);if(!x.sis.usuarios[como]){x.err('sudo: usuario desconocido '+como+'\n');return 1}}
  if(!a.length){x.err('uso: sudo [-u usuario] comando\n');return 1}
  if(x.u!=='root'&&!x.sis.enGrupo(x.u,'sudo')){
    return t.autenticar(x).then(function(ok){if(ok)x.err(x.u+' no está en el archivo sudoers.\n');return 1});
  }
  return t.autenticar(x).then(function(ok){
    if(!ok)return 1;
    if(a[0]==='-i'||a[0]==='-s'){t.entrar('root',a[0]==='-i'?'/root':x.cwd);return 0}
    var m=CMD[a[0]];
    if(m&&m.interna){x.err('sudo: '+a[0]+': comando no encontrado\n');if(a[0]==='cd')x.consejo('sudo-cd','cd es parte del shell, no un programa, así que sudo no puede correrlo. Para entrar a una carpeta de root, abre una terminal de root con sudo -i.');return 1}
    var y={};Object.keys(x).forEach(function(k){y[k]=x[k]});
    y.u=como;y.args=a;
    return t.despachar(a,y);
  });
});
cmd('su',{d:'cambia de usuario (sal con exit)',uso:'su [-] [usuario]',cat:'Usuarios y permisos'},function(x){
  var a=x.args.slice(1).filter(function(v){return v!=='-'&&v!=='-l'}),n=a[0]||'root',u=x.sis.usuarios[n],t=x.t;
  if(!u){x.err('su: el usuario '+n+' no existe o el usuario no tiene ninguna entrada en passwd\n');return 1}
  if(u.shell.indexOf('nologin')>=0){x.out('This account is currently not available.\n');return 1}
  var login=x.args.indexOf('-')>0||x.args.indexOf('-l')>0;
  if(x.u==='root'){t.entrar(n,login?u.home:x.cwd);return 0}
  return t.pedir('Contraseña: ',true).then(function(v){
    if(!u.clave||u.clave!==v){
      x.err('su: Fallo de autenticación\n');
      if(n==='root')x.consejo('su-root','en Ubuntu, root no tiene contraseña. Para trabajar como root usa sudo -i (o sudo antes de cada comando).');
      return 1;
    }
    t.entrar(n,login?u.home:x.cwd);
    return 0;
  });
});
function soloRoot(x,nom){if(x.u==='root')return true;x.err(nom+': Permiso denegado.\n'+nom+': no se pudo bloquear /etc/passwd; inténtelo de nuevo más tarde.\n');x.consejo('root-'+nom,'administrar usuarios necesita sudo.');return false}
function claveNueva(x,n,pedirActual){
  var u=x.sis.usuarios[n],t=x.t;
  var paso=pedirActual?t.pedir('Contraseña actual: ',true).then(function(v){if(u.clave&&u.clave!==v){x.err('passwd: Fallo de autenticación\npasswd: no se ha cambiado la contraseña\n');throw 'mal'}}):Promise.resolve();
  return paso.then(function(){return t.pedir('Nueva contraseña: ',true)}).then(function(a){
    return t.pedir('Vuelva a escribir la nueva contraseña: ',true).then(function(b){
      if(a!==b){x.err('Las contraseñas no coinciden.\npasswd: Error de manipulación del testigo de autenticación\npasswd: no se ha cambiado la contraseña\n');return 10}
      if(a.length<8&&x.u!=='root'){x.err('CONTRASEÑA INCORRECTA: La contraseña tiene menos de 8 caracteres\npasswd: no se ha cambiado la contraseña\n');return 10}
      if(a.length<8)x.out('CONTRASEÑA INCORRECTA: La contraseña tiene menos de 8 caracteres\n');
      u.clave=a;x.out('passwd: contraseña actualizada correctamente\n');return 0;
    });
  }).catch(function(e){if(e==='mal')return 10;throw e});
}
cmd('passwd',{d:'cambia una contraseña',uso:'passwd [usuario]',cat:'Usuarios y permisos'},function(x){
  var n=x.args[1]||x.u;
  if(!x.sis.usuarios[n]){x.err("passwd: el usuario '"+n+"' no existe\n");return 1}
  if(n!==x.u&&x.u!=='root'){x.err('passwd: No puede ver o cambiar la información de la contraseña de '+n+'.\n');return 1}
  if(n===x.u&&x.u!=='root')x.out('Cambiando la contraseña de '+n+'.\n');
  return claveNueva(x,n,x.u!=='root');
});
cmd('useradd',{d:'crea un usuario (sin carpeta personal si no usas -m)',uso:'useradd [-m] [-s shell] [-G grupos] usuario',ops:[['-m','crea su carpeta personal en /home'],['-s /bin/bash','el shell que usará'],['-G g1,g2','grupos extra']],cat:'Usuarios y permisos',sbin:true},function(x){
  if(!soloRoot(x,'useradd'))return 1;
  var o=opts(x.args,'sGcdg'),n=o.pos[0];
  if(!n){x.err('Uso: useradd [opciones] USUARIO\n');return 2}
  if(!/^[a-z_][a-z0-9_-]*$/.test(n)){x.err("useradd: '"+n+"' no es un nombre de usuario válido\n");return 3}
  if(x.sis.usuarios[n]){x.err('useradd: el usuario «'+n+'» ya existe\n');return 9}
  var gs=o.val.G?o.val.G.split(','):[];
  for(var i=0;i<gs.length;i++)if(!x.sis.grupos[gs[i]]){x.err("useradd: el grupo '"+gs[i]+"' no existe\n");return 6}
  x.sis.usuarioNuevo(n,{grupos:gs,shell:o.val.s||'/bin/sh',nombre:o.val.c||''});
  if(o.f.m)x.sis.crearCasa(n);
  else x.consejo('useradd-m','sin -m, useradd no crea la carpeta personal. Por eso en Ubuntu se suele usar adduser, que hace todo y pregunta lo necesario.');
});
cmd('adduser',{d:'crea un usuario con su carpeta y contraseña (pregunta lo necesario)',uso:'adduser usuario',cat:'Usuarios y permisos',sbin:true},function(x){
  if(!soloRoot(x,'adduser'))return 1;
  var a=x.args.slice(1),s=x.sis,t=x.t;
  if(a.length===2&&s.usuarios[a[0]]){
    if(!s.grupos[a[1]]){x.err("fatal: El grupo '"+a[1]+"' no existe.\n");return 1}
    if(s.enGrupo(a[0],a[1])){x.out("info: El usuario '"+a[0]+"' ya es miembro de '"+a[1]+"'.\n");return 0}
    x.out("info: Añadiendo al usuario '"+a[0]+"' al grupo '"+a[1]+"' ...\n");s.usuarios[a[0]].grupos.push(a[1]);return 0;
  }
  var n=a[0];
  if(!n){x.err('fatal: Solo se permite un nombre.\n');return 1}
  if(!/^[a-z_][a-z0-9_-]*$/.test(n)){x.err("fatal: '"+n+"' no es un nombre de usuario válido.\n");return 1}
  if(s.usuarios[n]){x.err("fatal: El usuario '"+n+"' ya existe.\n");return 1}
  var u=s.usuarioNuevo(n,{grupos:['users']});
  x.out("info: Añadiendo el usuario '"+n+"' ...\ninfo: Seleccionando un UID/GID del rango 1000 a 59999 ...\ninfo: Añadiendo el nuevo grupo '"+n+"' ("+u.uid+") ...\ninfo: Añadiendo el nuevo usuario '"+n+"' ("+u.uid+") con grupo '"+n+" ("+u.uid+")' ...\ninfo: Creando el directorio personal '/home/"+n+"' ...\ninfo: Copiando los archivos desde '/etc/skel' ...\n");
  s.crearCasa(n);
  return claveNueva(x,n,false).then(function(){
    x.out('Cambiando la información de usuario para '+n+'\nIntroduzca el nuevo valor, o pulse INTRO para usar el valor predeterminado\n');
    return t.pedir('\tNombre completo []: ');
  }).then(function(nom){
    u.nombre=nom;
    return t.pedir('¿Es correcta la información? [S/n] ');
  }).then(function(){x.out("info: Añadiendo al nuevo usuario '"+n+"' a los grupos adicionales ...\ninfo: Añadiendo al usuario '"+n+"' al grupo 'users' ...\n");return 0});
});
cmd('usermod',{d:'cambia un usuario, por ejemplo sus grupos',uso:'usermod -aG grupo usuario',ops:[['-aG grupo','agrega a un grupo (sin -a, reemplaza todos sus grupos)'],['-s shell','cambia su shell'],['-L / -U','bloquea o desbloquea la cuenta']],cat:'Usuarios y permisos',sbin:true},function(x){
  if(!soloRoot(x,'usermod'))return 1;
  var o=opts(x.args,'Gsgcd'),n=o.pos[0],u=x.sis.usuarios[n];
  if(!n){x.err('Uso: usermod [opciones] USUARIO\n');return 2}
  if(!u){x.err("usermod: el usuario '"+n+"' no existe\n");return 6}
  if(o.val.G!=null){
    var gs=o.val.G.split(',').filter(Boolean);
    for(var i=0;i<gs.length;i++)if(!x.sis.grupos[gs[i]]){x.err("usermod: el grupo '"+gs[i]+"' no existe\n");return 6}
    if(o.f.a)gs.forEach(function(g){if(u.grupos.indexOf(g)<0)u.grupos.push(g)});
    else{
      var perdidos=u.grupos.slice(1).filter(function(g){return gs.indexOf(g)<0});
      u.grupos=[u.grupos[0]].concat(gs);
      if(perdidos.length)x.consejo('usermod-a','sin -a, usermod -G reemplaza los grupos: '+n+' ya no está en '+perdidos.join(', ')+'. Para agregar sin quitar, usa usermod -aG.');
    }
  }
  if(o.val.s)u.shell=o.val.s;
  if(o.f.L)u.bloqueado=true;
  if(o.f.U)u.bloqueado=false;
});
cmd('userdel deluser',{d:'borra un usuario',uso:'userdel [-r] usuario',ops:[['-r','borra también su carpeta personal']],cat:'Usuarios y permisos',sbin:true},function(x){
  var nom=x.args[0];
  if(!soloRoot(x,nom))return 1;
  var o=opts(x.args),n=o.pos[0],s=x.sis,u=s.usuarios[n];
  if(!u){x.err(nom+": el usuario '"+n+"' no existe\n");return 6}
  if(n==='root'||n===s.yo){x.err(nom+': no se puede borrar a '+n+' (OneLearn no te deja borrar tu propio usuario ni root).\n');return 8}
  delete s.usuarios[n];
  if(s.grupos[n]&&!s.miembros(n).length)delete s.grupos[n];
  if(o.f.r||o.f['remove-home']||o.largo['remove-home']){var r=s.buscar(dirname(u.home),'root');if(r.n&&r.n.h[basename(u.home)])delete r.n.h[basename(u.home)]}
  if(nom==='deluser')x.out("info: Eliminando el usuario '"+n+"' ...\ninfo: Hecho.\n");
});
cmd('groupadd addgroup',{d:'crea un grupo',uso:'groupadd grupo',cat:'Usuarios y permisos',sbin:true},function(x){
  if(!soloRoot(x,x.args[0]))return 1;
  var n=opts(x.args).pos[0];
  if(!n){x.err('Uso: groupadd [opciones] GRUPO\n');return 2}
  if(x.sis.grupos[n]){x.err("groupadd: el grupo '"+n+"' ya existe\n");return 9}
  x.sis.grupos[n]={gid:x.sis.sigId(x.sis.grupos)};
  if(x.args[0]==='addgroup')x.out("info: Añadiendo el grupo '"+n+"' (GID "+x.sis.grupos[n].gid+") ...\n");
});
cmd('groupdel',{d:'borra un grupo',uso:'groupdel grupo',cat:'Usuarios y permisos',sbin:true},function(x){
  if(!soloRoot(x,'groupdel'))return 1;
  var n=x.args[1],s=x.sis;
  if(!s.grupos[n]){x.err("groupdel: el grupo '"+n+"' no existe\n");return 6}
  delete s.grupos[n];
  Object.keys(s.usuarios).forEach(function(k){var u=s.usuarios[k];u.grupos=u.grupos.filter(function(g,i){return !i||g!==n})});
});
/* chmod: 755 o u+x,g-w,o=r */
function aplicarModo(m,esp,dir,u){
  if(/^[0-7]{1,4}$/.test(esp))return parseInt(esp,8);
  var partes=esp.split(','),r=m;
  for(var i=0;i<partes.length;i++){
    var p=partes[i].match(/^([ugoa]*)([+\-=])([rwxXt]*)$/);
    if(!p)return null;
    var quien=p[1]||'a',bits=0;
    p[3].split('').forEach(function(ch){
      var b=ch==='r'?4:ch==='w'?2:ch==='x'||ch==='X'&&(dir||m&0o111)?1:0;
      if(ch==='t'){bits|=0o1000;return}
      if(quien.indexOf('u')>=0||quien.indexOf('a')>=0)bits|=b<<6;
      if(quien.indexOf('g')>=0||quien.indexOf('a')>=0)bits|=b<<3;
      if(quien.indexOf('o')>=0||quien.indexOf('a')>=0)bits|=b;
    });
    if(!p[1]&&p[2]!=='-')bits&=~(u==='root'?0o022:0o002)|0o1000;
    var mask=0;
    if(quien.indexOf('u')>=0||quien.indexOf('a')>=0)mask|=0o700;
    if(quien.indexOf('g')>=0||quien.indexOf('a')>=0)mask|=0o070;
    if(quien.indexOf('o')>=0||quien.indexOf('a')>=0)mask|=0o007;
    if(p[2]==='+')r|=bits;else if(p[2]==='-')r&=~bits;else r=(r&~mask)|bits;
  }
  return r;
}
function recorrer(n,fn){fn(n);if(n.t==='d')Object.keys(n.h).forEach(function(k){recorrer(n.h[k],fn)})}
cmd('chmod',{d:'cambia los permisos de archivos y carpetas',uso:'chmod modo archivo...',ops:[['755','números: dueño, grupo y otros (r=4, w=2, x=1)'],['u+x','letras: u dueño, g grupo, o otros, a todos'],['-R','también todo lo de adentro']],cat:'Usuarios y permisos'},function(x){
  var a=x.args.slice(1),R=false;
  while(a.length&&/^-[Rv]+$/.test(a[0])){if(a[0].indexOf('R')>=0)R=true;a.shift()}
  if(a.length<2){x.err(a.length?"chmod: falta un operando después de '"+a[0]+"'\n":'chmod: falta un operando\n');return 1}
  var modo=a.shift(),cod=0;
  if(aplicarModo(0,modo,false,x.u)===null){x.err("chmod: modo inválido: '"+modo+"'\n");return 1}
  a.forEach(function(p){
    var r=x.buscar(p);
    if(!r.n){x.err("chmod: no se puede acceder a '"+p+"': "+(r.err==='permiso'?'Permiso denegado':'No existe el archivo o el directorio')+'\n');cod=1;return}
    (R?function(n,fn){recorrer(n,fn)}:function(n,fn){fn(n)})(r.n,function(n){
      if(x.u!=='root'&&n.u!==x.u){x.err("chmod: cambiando los permisos de '"+p+"': Operación no permitida\n");cod=1;return}
      n.modo=aplicarModo(n.modo,modo,n.t==='d',x.u);
    });
  });
  return cod;
});
cmd('chown',{d:'cambia el dueño (y el grupo) de archivos',uso:'chown usuario[:grupo] archivo...',ops:[['-R','también todo lo de adentro']],cat:'Usuarios y permisos'},function(x){
  var a=x.args.slice(1),R=false,s=x.sis;
  while(a.length&&/^-[Rv]+$/.test(a[0])){if(a[0].indexOf('R')>=0)R=true;a.shift()}
  if(a.length<2){x.err('chown: falta un operando\n');return 1}
  var esp=a.shift(),pp=esp.split(/[:.]/),u=pp[0],g=pp.length>1?pp[1]:null,cod=0;
  if(u&&!s.usuarios[u]){x.err("chown: usuario inválido: «"+esp+"»\n");return 1}
  if(g===''&&u)g=s.grupoPrin(u);
  if(g&&!s.grupos[g]){x.err("chown: grupo inválido: «"+esp+"»\n");return 1}
  a.forEach(function(p){
    var r=x.buscar(p);
    if(!r.n){x.err("chown: no se puede acceder a '"+p+"': "+(r.err==='permiso'?'Permiso denegado':'No existe el archivo o el directorio')+'\n');cod=1;return}
    if(x.u!=='root'){x.err("chown: cambiando el propietario de '"+p+"': Operación no permitida\n");x.consejo('chown','solo root puede regalar archivos a otro usuario: usa sudo chown.');cod=1;return}
    (R?function(n,fn){recorrer(n,fn)}:function(n,fn){fn(n)})(r.n,function(n){if(u)n.u=u;if(g)n.g=g});
  });
  return cod;
});
cmd('chgrp',{d:'cambia el grupo de archivos',uso:'chgrp grupo archivo...',ops:[['-R','también todo lo de adentro']],cat:'Usuarios y permisos'},function(x){
  var a=x.args.slice(1),R=false,s=x.sis;
  while(a.length&&/^-[Rv]+$/.test(a[0])){if(a[0].indexOf('R')>=0)R=true;a.shift()}
  if(a.length<2){x.err('chgrp: falta un operando\n');return 1}
  var g=a.shift(),cod=0;
  if(!s.grupos[g]){x.err("chgrp: grupo inválido: «"+g+"»\n");return 1}
  a.forEach(function(p){
    var r=x.buscar(p);
    if(!r.n){x.err("chgrp: no se puede acceder a '"+p+"': No existe el archivo o el directorio\n");cod=1;return}
    (R?function(n,fn){recorrer(n,fn)}:function(n,fn){fn(n)})(r.n,function(n){
      if(x.u!=='root'&&(n.u!==x.u||!s.enGrupo(x.u,g))){x.err("chgrp: cambiando el grupo de '"+p+"': Operación no permitida\n");cod=1;return}
      n.g=g;
    });
  });
  return cod;
});
cmd('umask',{d:'muestra qué permisos se quitan a lo que creas',cat:'Usuarios y permisos',interna:true},function(x){x.out(x.u==='root'?'0022\n':'0002\n')});

/* --- Procesos y servicios --- */
function tabla(filas){
  var w=[];filas.forEach(function(f){f.forEach(function(v,i){w[i]=Math.max(w[i]||0,plano(v).length)})});
  return filas.map(function(f){return f.map(function(v,i){return i===f.length-1?v:pad(v,w[i],typeof v==='number'||/^[\d.,]+[KMGTiB%]*$/.test(v))}).join(' ')}).join('\n')+'\n';
}
function horaCorta(d){return dos(d.getHours())+':'+dos(d.getMinutes())}
cmd('ps',{d:'lista los procesos',uso:'ps [aux]',ops:[['aux','todos los procesos de todos los usuarios'],['-ef','igual, en otro formato'],['-u usuario','los de un usuario'],['--sort=-%cpu','ordena por uso del procesador']],cat:'Procesos y servicios'},function(x){
  var a=x.args.slice(1).join(' '),s=x.sis,ps=s.procesos.slice();
  var todos=/(^|\s)-?a?ux|(^|\s)-e|(^|\s)-A|(^|\s)aux/.test(a);
  var m=a.match(/--sort[= ]([+-]?)(%?\w+)/);
  var mu=a.match(/-u\s+(\S+)/);if(mu)ps=ps.filter(function(p){return p.u===mu[1]});
  var mp=a.match(/-p\s+(\d+)/);if(mp)ps=ps.filter(function(p){return p.pid===+mp[1]});
  if(m){var k=/cpu/.test(m[2])?'cpu':/mem/.test(m[2])?'mem':'pid';ps.sort(function(p,q){return (m[1]==='-'?-1:1)*(p[k]-q[k])})}
  if(!todos&&!mu&&!mp){
    var fr=x.t.frame();
    x.out('    PID TTY          TIME CMD\n'+pad(fr.pid,7,true)+' pts/0    00:00:00 bash\n'+pad(s.sigPid,7,true)+' pts/0    00:00:00 ps\n');
    return;
  }
  if(/-ef|-e\b|-A/.test(a)&&!/aux/.test(a)){
    x.out(tabla([['UID','    PID','   PPID','C','STIME','CMD']].concat(ps.map(function(p){return [pad(p.u.length>8?p.u.slice(0,7)+'+':p.u,8),pad(p.pid,7,true),pad(p.ppid,7,true),String(Math.round(p.cpu)),horaCorta(p.inicio),p.cmd]}))));
    return;
  }
  x.out(tabla([['USER','    PID','%CPU','%MEM','STAT','START','COMMAND']].concat(ps.map(function(p){return [pad(p.u.length>8?p.u.slice(0,7)+'+':p.u,8),pad(p.pid,7,true),pad(p.cpu.toFixed(1),4,true),pad(p.mem.toFixed(1),4,true),pad(p.stat,4),horaCorta(p.inicio),p.cmd]}))));
});
function carga(s){var t=s.procesos.reduce(function(a,p){return a+p.cpu},0)/100;return [t+0.04,t*0.85+0.03,t*0.55+0.01]}
function memoria(s){var usado=1520+s.procesos.reduce(function(a,p){return a+p.mem},0)*20;return {total:3936,usado:usado,libre:3936-usado-1205,cache:1205,disp:3936-usado}}
function arriba(s){var m=Math.floor((Date.now()-s.arranque)/6e4),d=Math.floor(m/1440);return (d?d+(d===1?' día':' días')+', ':'')+pad(Math.floor(m%1440/60),2,true)+':'+dos(m%60)}
function topTxt(x,barras){
  var s=x.sis,ps=s.procesos.slice().sort(function(a,b){return b.cpu-a.cpu||b.mem-a.mem}),l=carga(s),me=memoria(s),cpu=Math.min(99.9,s.procesos.reduce(function(a,p){return a+p.cpu},0)/2+0.6);
  var enUso=s.procesos.filter(function(p){return p.stat.charAt(0)==='R'}).length;
  var o=barras?
    '  CPU['+new Array(Math.round(cpu/5)+1).join('|')+new Array(21-Math.round(cpu/5)).join(' ')+coma(cpu)+'%]   Tareas: '+s.procesos.length+', '+enUso+' en ejecución\n'+
    '  Mem['+new Array(Math.round(me.usado/me.total*20)+1).join('|')+new Array(21-Math.round(me.usado/me.total*20)).join(' ')+coma(me.usado/1024,2)+'G/3,84G]   Carga media: '+l.map(function(v){return coma(v,2)}).join(' ')+'\n\n':
    'top - '+hora(new Date())+' up '+arriba(s)+',  1 usuario,  carga media: '+l.map(function(v){return coma(v,2)}).join(', ')+'\n'+
    'Tareas: '+s.procesos.length+' total, '+enUso+' ejecutar, '+(s.procesos.length-enUso)+' hibernar, 0 detener, '+s.procesos.filter(function(p){return p.stat.charAt(0)==='Z'}).length+' zombie\n'+
    '%Cpu(s): '+coma(cpu)+' us,  0,8 sy,  0,0 ni, '+coma(Math.max(0,99.2-cpu))+' id\n'+
    'MiB Mem :   '+coma(me.total)+' total,   '+coma(me.libre)+' libre,   '+coma(me.usado)+' usado,   '+coma(me.cache)+' búf/caché\n\n';
  o+=tabla([['    PID','USUARIO','S','%CPU','%MEM','ORDEN']].concat(ps.slice(0,12).map(function(p){return [pad(p.pid,7,true),p.u.length>8?p.u.slice(0,7)+'+':p.u,p.stat.charAt(0),coma(p.cpu),coma(p.mem),p.nombre]})));
  return o;
}
cmd('top',{d:'muestra los procesos que más recursos usan',cat:'Procesos y servicios'},function(x){
  x.out(topTxt(x,false));
  x.consejo('top','en una terminal real, top se actualiza cada 3 segundos hasta que salgas con q. Aquí ves una foto del momento.');
});
cmd('htop',{d:'como top, pero con colores y barras',cat:'Procesos y servicios',paq:'htop'},function(x){
  x.out(topTxt(x,true));
  x.consejo('htop','en una terminal real, htop es interactivo: F9 termina un proceso y q sale.');
});
var SENALES={1:'HUP',2:'INT',9:'KILL',15:'TERM',18:'CONT',19:'STOP'};
function senal(v){
  v=String(v).toUpperCase().replace(/^SIG/,'');
  if(/^\d+$/.test(v))return SENALES[v]||null;
  for(var k in SENALES)if(SENALES[k]===v)return v;
  return null;
}
function matar(x,p,sg){
  var s=x.sis;
  if(x.u!=='root'&&p.u!==x.u)return 'Operación no permitida';
  if(p.pid===1||p.cmd.charAt(0)==='[')return null;
  if(sg==='STOP'){p.stat='T';return null}
  if(sg==='CONT'){p.stat=p.cpu>20?'R':'S';return null}
  if(sg==='HUP'&&p.serv){s.log(p.serv,'systemd[1]: Reloading '+p.serv+'.service...');return null}
  if(p.nombre==='bash'&&x.t.pila.some(function(f){return f.pid===p.pid})){
    if(sg==='KILL')x.consejo('kill-bash','con -9 cerrarías tu propia terminal. Aquí la dejamos abierta.');
    return null;
  }
  if(p.serv&&s.servicios[p.serv]&&s.servicios[p.serv].pid===p.pid)s.detener(s.servicios[p.serv],sg==='KILL'?'KILL':'TERM');
  else s.procesos=s.procesos.filter(function(q){return q!==p&&q.ppid!==p.pid});
  s.trabajos.forEach(function(j){if(j.pid===p.pid)j.hecho=true});
  return null;
}
cmd('kill',{d:'envía una señal a un proceso (por defecto, que termine)',uso:'kill [-9] PID...',ops:[['-15','TERM: pide que termine (la de siempre)'],['-9','KILL: lo termina a la fuerza'],['-l','lista las señales']],cat:'Procesos y servicios'},function(x){
  var a=x.args.slice(1),sg='TERM',cod=0,s=x.sis;
  if(a[0]==='-l'){x.out(' 1) SIGHUP\t 2) SIGINT\t 9) SIGKILL\t15) SIGTERM\t18) SIGCONT\t19) SIGSTOP\n');return}
  if(a[0]==='-s'){sg=senal(a[1]);a=a.slice(2)}
  else if(a[0]&&a[0].charAt(0)==='-'){sg=senal(a[0].slice(1));a=a.slice(1)}
  if(!sg){x.err('bash: kill: '+x.args[1]+': especificación de señal inválida\n');return 1}
  if(!a.length){x.err('kill: uso: kill [-s señal | -n númseñal | -señal] pid | idtrabajo ... o kill -l [señal]\n');return 2}
  a.forEach(function(v){
    if(/^%\d+$/.test(v)){var j=s.trabajos.filter(function(j){return j.n===+v.slice(1)})[0];if(!j){x.err('bash: kill: '+v+': no existe ese trabajo\n');cod=1;return}v=String(j.pid)}
    if(!/^\d+$/.test(v)){x.err('bash: kill: '+v+': los argumentos deben ser IDs de proceso o de trabajo\n');cod=1;return}
    var p=s.procesos.filter(function(q){return q.pid===+v})[0];
    if(!p){x.err('bash: kill: ('+v+') - No existe el proceso\n');cod=1;return}
    var e=matar(x,p,sg);
    if(e){x.err('bash: kill: ('+v+') - '+e+'\n');cod=1;x.consejo('kill-root','ese proceso es de otro usuario: para terminarlo necesitas sudo.')}
  });
  return cod;
});
cmd('killall pkill',{d:'termina procesos por su nombre',uso:'killall nombre',ops:[['-9','a la fuerza']],cat:'Procesos y servicios'},function(x){
  var a=x.args.slice(1),sg='TERM',s=x.sis,nom=x.args[0];
  if(a[0]&&a[0].charAt(0)==='-'){sg=senal(a[0].slice(1))||'TERM';a=a.slice(1)}
  if(!a.length){x.err('Uso: '+nom+' [-señal] nombre\n');return 1}
  var cod=0;
  a.forEach(function(n){
    var ps=s.procesos.filter(function(p){return nom==='killall'?p.nombre===n:p.nombre.indexOf(n)>=0||p.cmd.indexOf(n)>=0});
    ps=ps.filter(function(p){return p.pid!==1&&p.cmd.charAt(0)!=='['});
    if(!ps.length){if(nom==='killall')x.err(n+': no se encontró ningún proceso\n');cod=1;return}
    ps.forEach(function(p){var e=matar(x,p,sg);if(e){if(nom==='killall')x.err(n+'('+p.pid+'): '+e+'\n');cod=1}});
  });
  return cod;
});
cmd('sleep',{d:'espera unos segundos (prueba Ctrl+C para cortarlo)',uso:'sleep segundos',cat:'Procesos y servicios'},function(x){
  var n=parseFloat(x.args[1]),s=x.sis;
  if(isNaN(n)){x.err('sleep: falta un operando\n');return 1}
  if(x.fondo){
    var p=s.proc({cmd:'sleep '+x.args[1],nombre:'sleep',u:x.u,stat:'S',ppid:x.t.frame().pid,inicio:new Date()});
    var j={n:(s.trabajos.length?s.trabajos[s.trabajos.length-1].n:0)+1,pid:p.pid,cmd:'sleep '+x.args[1]};
    s.trabajos.push(j);
    x.out('['+j.n+'] '+p.pid+'\n');
    setTimeout(function(){
      if(!s.procesos.some(function(q){return q.pid===p.pid}))return;
      s.procesos=s.procesos.filter(function(q){return q.pid!==p.pid});j.hecho=true;
      if(!x.t.ocupada&&x.t.sis===s){x.t.trabajosTerminados();x.t.prompt()}
    },Math.min(n,600)*1000);
    return 0;
  }
  var p2=s.proc({cmd:'sleep '+x.args[1],nombre:'sleep',u:x.u,stat:'S',ppid:x.t.frame().pid,inicio:new Date()});
  x.consejo('sleep','la terminal queda ocupada mientras espera. Para cortarlo, pulsa Ctrl+C.');
  var fin=function(){s.procesos=s.procesos.filter(function(q){return q!==p2})};
  return new Promise(function(res,rej){
    var h=setTimeout(function(){x.t.pendiente=null;fin();res(0)},Math.min(n,120)*1000);
    x.t.pendiente={h:h,rej:function(e){fin();rej(e)}};
  });
});
cmd('jobs',{d:'lista lo que corre en segundo plano (con &)',cat:'Procesos y servicios',interna:true},function(x){
  var s=x.sis;
  s.trabajos.filter(function(j){return !j.hecho}).forEach(function(j,i,l){x.out('['+j.n+']'+(i===l.length-1?'+':'-')+'  Ejecutando              '+j.cmd+' &\n')});
});
cmd('free',{d:'muestra cuánta memoria RAM hay libre',uso:'free [-h]',ops:[['-h','en unidades fáciles de leer']],cat:'Procesos y servicios'},function(x){
  var m=memoria(x.sis),h=/-h/.test(x.args.join(' ')),f=function(mb){return pad(h?(mb>=1024?coma(mb/1024)+'Gi':Math.round(mb)+'Mi'):String(Math.round(mb*1024)),12,true)};
  x.out(pad('',7)+['total','usado','libre','compartido','búf/caché','disponible'].map(function(k){return pad(k,12,true)}).join('')+'\n'+
    pad('Mem:',7)+[m.total,m.usado,m.libre,28,m.cache,m.disp].map(f).join('')+'\n'+
    pad('Inter:',7)+f(2048)+pad(h?'0B':'0',12,true)+f(2048)+'\n');
});
cmd('df',{d:'muestra el espacio libre en disco',uso:'df [-h]',ops:[['-h','en unidades fáciles de leer']],cat:'Procesos y servicios'},function(x){
  var h=/-h/.test(x.args.join(' '));
  var filas=h?[['S.archivos','Tamaño','Usados','Disp','Uso%','Montado en'],['tmpfs','392M','1,4M','391M','1%','/run'],['/dev/sda2','49G','12G','35G','26%','/'],['tmpfs','2,0G','0','2,0G','0%','/dev/shm'],['/dev/sda1','1,1G','6,1M','1,1G','1%','/boot/efi']]:
    [['S.archivos','1K-bloques','Usados','Disponibles','Uso%','Montado en'],['tmpfs','401128','1432','399696','1%','/run'],['/dev/sda2','51290592','12583904','36069232','26%','/'],['tmpfs','2005636','0','2005636','0%','/dev/shm'],['/dev/sda1','1098632','6228','1092404','1%','/boot/efi']];
  x.out(tabla(filas));
});
cmd('du',{d:'muestra cuánto ocupa una carpeta',uso:'du [-sh] [carpeta]',ops:[['-s','solo el total'],['-h','en unidades fáciles de leer']],cat:'Procesos y servicios'},function(x){
  var o=opts(x.args),ps=o.pos.length?o.pos:['.'],out='',cod=0,s=x.sis;
  var f=function(k){return o.f.h?(k>=1024?coma(k/1024)+'M':k+'K'):String(k)};
  ps.forEach(function(p){
    var r=x.buscar(p);
    if(!r.n){x.err("du: no se puede acceder a '"+p+"': No existe el archivo o el directorio\n");cod=1;return}
    (function rec(n,ruta){
      if(n.t!=='d')return Math.ceil(s.tam(n)/4096)*4;
      if(!s.puede(n,x.u,'r')){x.err("du: no se puede leer el directorio '"+ruta+"': Permiso denegado\n");cod=1;return 4}
      var tot=4;Object.keys(n.h).sort(ordenar).forEach(function(k){if(n.h[k].t!=='l')tot+=rec(n.h[k],ruta.replace(/\/$/,'')+'/'+k)});
      if(!o.f.s||ruta===p)out+=f(tot)+'\t'+ruta+'\n';
      return tot;
    })(r.n,p);
  });
  x.out(out);
  return cod;
});
cmd('uptime',{d:'muestra cuánto tiempo lleva encendida la computadora',cat:'Procesos y servicios'},function(x){
  var l=carga(x.sis);
  if(x.args[1]==='-p'){var m=Math.floor((Date.now()-x.sis.arranque)/6e4);x.out('up '+Math.floor(m/1440)+' días, '+Math.floor(m%1440/60)+' horas, '+(m%60)+' minutos\n');return}
  x.out(' '+hora(new Date())+' up '+arriba(x.sis)+',  1 usuario,  carga media: '+l.map(function(v){return coma(v,2)}).join(', ')+'\n');
});
cmd('nproc',{d:'dice cuántos núcleos de procesador hay',cat:'Procesos y servicios'},function(x){x.out('2\n')});
/* systemctl */
function unidad(s,n){return s.servicio(String(n||'').replace(/\.service$/,''))}
function estadoSd(v){return v.activo?(v.tipo==='oneshot'?'active (exited)':'active (running)'):v.fallo?'failed (Result: '+v.fallo+')':'inactive (dead)'}
function statusTxt(x,v){
  var s=x.sis,punto=v.activo?c('g','●'):v.fallo?c('e','×'):'○';
  var o=punto+' '+v.nombre+'.service - '+v.desc+'\n'+
    '     Loaded: loaded (/usr/lib/systemd/system/'+v.nombre+'.service; '+(v.habilitado?'enabled':'disabled')+'; preset: enabled)\n'+
    '     Active: '+(v.activo?c('g',estadoSd(v)):v.fallo?c('e',estadoSd(v)):estadoSd(v))+(v.desde?' since '+fechaSd(v.desde)+'; '+hace(v.desde):'')+'\n';
  if(v.activo&&v.pid){
    var hijos=s.procesos.filter(function(p){return p.serv===v.nombre});
    o+='   Main PID: '+v.pid+' ('+(v.nombreProc||v.nombre)+')\n      Tasks: '+hijos.length+' (limit: 4558)\n     Memory: '+v.mem+'\n        CPU: 41ms\n     CGroup: /system.slice/'+v.nombre+'.service\n'+
      hijos.map(function(p,i){return '             '+(i===hijos.length-1?'└─':'├─')+p.pid+' "'+p.cmd+'"'}).join('\n')+'\n';
  }
  var lg=s.diario.filter(function(e){return e.u===v.nombre}).slice(-6);
  if(lg.length)o+='\n'+lg.map(function(e){return fechaLog(e.f)+' '+s.host+' '+e.txt}).join('\n')+'\n';
  return o;
}
function sinPermiso(x,accion,v){
  x.err('Failed to '+accion+' '+v.nombre+'.service: Interactive authentication required.\nSee system logs and \'systemctl status '+v.nombre+'.service\' for details.\n');
  x.consejo('systemctl-sudo','encender, apagar o habilitar servicios necesita sudo: sudo systemctl '+accion+' '+v.nombre);
  return 1;
}
cmd('systemctl',{d:'controla los servicios (programas que corren en segundo plano)',uso:'systemctl acción servicio',ops:[['status ssh','cómo está el servicio'],['start / stop','lo enciende o lo apaga ahora'],['restart','lo apaga y lo vuelve a encender'],['enable / disable','que arranque (o no) al encender la computadora'],['enable --now','lo habilita y lo enciende de una vez'],['list-units','lista los servicios']],cat:'Procesos y servicios'},function(x){
  var o=opts(x.args),s=x.sis,acc=o.pos[0]||'list-units',ns=o.pos.slice(1),cod=0;
  if(acc==='list-units'||o.largo.failed||acc==='--failed'){
    var vs=Object.keys(s.servicios).sort().map(function(k){return s.servicios[k]}).filter(function(v){return o.largo.failed?v.fallo:o.largo.all||v.activo||v.fallo});
    x.out(tabla([['  UNIT','LOAD','ACTIVE','SUB','DESCRIPTION']].concat(vs.map(function(v){return [(v.fallo?c('e','●'):' ')+' '+v.nombre+'.service','loaded',v.activo?'active':v.fallo?'failed':'inactive',v.activo?(v.tipo==='oneshot'?'exited':'running'):v.fallo?'failed':'dead',v.desc]})))+'\n'+vs.length+' loaded units listed.\n');
    return;
  }
  if(acc==='daemon-reload'){if(x.u!=='root'){x.err('Failed to reload daemon: Interactive authentication required.\n');return 1}return}
  if(!ns.length){x.err('Too few arguments.\n');return 1}
  return ns.reduce(function(pr,n){
    return pr.then(function(){
      var v=unidad(s,n);
      if(!v||v.paquete&&!s.instalado(v.paquete)){
        if(acc==='status'){x.err('Unit '+n.replace(/\.service$/,'')+'.service could not be found.\n');cod=4}
        else if(acc==='is-active'){x.out('inactive\n');cod=3}
        else{x.err('Failed to '+acc+' '+n.replace(/\.service$/,'')+'.service: Unit '+n.replace(/\.service$/,'')+'.service not found.\n');cod=5}
        return;
      }
      if(acc==='status'){x.out(statusTxt(x,v));if(!v.activo)cod=3;return}
      if(acc==='is-active'){x.out((v.activo?'active':v.fallo?'failed':'inactive')+'\n');if(!v.activo)cod=3;return}
      if(acc==='is-enabled'){x.out((v.habilitado?'enabled':'disabled')+'\n');if(!v.habilitado)cod=1;return}
      if(['start','stop','restart','reload','enable','disable','mask'].indexOf(acc)<0){x.err('Unknown command verb \''+acc+'\'.\n');cod=1;return}
      if(x.u!=='root'){cod=sinPermiso(x,acc,v);return}
      return (acc==='start'||acc==='restart'||acc==='reload'?x.esperar(250):Promise.resolve()).then(function(){
        if(acc==='start'){if(!v.activo&&!s.arrancar(v)){x.err('Job for '+v.nombre+'.service failed because the control process exited with error code.\nSee "systemctl status '+v.nombre+'.service" and "journalctl -xeu '+v.nombre+'.service" for details.\n');cod=1;}}
        else if(acc==='stop'){if(v.activo)s.detener(v)}
        else if(acc==='restart'){if(v.activo)s.detener(v);if(!s.arrancar(v)){x.err('Job for '+v.nombre+'.service failed because the control process exited with error code.\nSee "systemctl status '+v.nombre+'.service" and "journalctl -xeu '+v.nombre+'.service" for details.\n');cod=1;}}
        else if(acc==='reload'){
          if(!v.activo){x.err('Job for '+v.nombre+'.service failed: the service is not active.\n');cod=1}
          else{var rv=v.validar?v.validar(s):{};
            if(rv.err){s.log(v.nombre,(v.nombreProc||v.nombre)+'[2415]: '+(v.nombreProc||v.nombre)+': [emerg] '+rv.err);s.log(v.nombre,'systemd[1]: '+v.nombre+'.service: Control process exited, code=exited, status=1/FAILURE');s.log(v.nombre,'systemd[1]: Reload failed for '+v.nombre+'.service - '+v.desc+'.');x.err('Job for '+v.nombre+'.service failed because the control process exited with error code.\nSee "systemctl status '+v.nombre+'.service" and "journalctl -xeu '+v.nombre+'.service" for details.\n');cod=1}
            else{if(rv.conf)v.conf=rv.conf;s.log(v.nombre,'systemd[1]: Reloading '+v.nombre+'.service - '+v.desc+'...');s.log(v.nombre,'systemd[1]: Reloaded '+v.nombre+'.service - '+v.desc+'.')}}}
        else if(acc==='enable'){
          if(!v.habilitado)x.out('Synchronizing state of '+v.nombre+'.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.\nExecuting: /usr/lib/systemd/systemd-sysv-install enable '+v.nombre+'\nCreated symlink /etc/systemd/system/multi-user.target.wants/'+v.nombre+'.service → /usr/lib/systemd/system/'+v.nombre+'.service.\n');
          v.habilitado=true;if(o.largo.now&&!v.activo&&!s.arrancar(v)){x.err('Job for '+v.nombre+'.service failed because the control process exited with error code.\nSee "systemctl status '+v.nombre+'.service" and "journalctl -xeu '+v.nombre+'.service" for details.\n');cod=1;}
        }
        else if(acc==='disable'){
          if(v.habilitado)x.out('Synchronizing state of '+v.nombre+'.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.\nExecuting: /usr/lib/systemd/systemd-sysv-install disable '+v.nombre+'\nRemoved "/etc/systemd/system/multi-user.target.wants/'+v.nombre+'.service".\n');
          v.habilitado=false;if(o.largo.now&&v.activo)s.detener(v);
        }
      });
    });
  },Promise.resolve()).then(function(){return cod});
});
cmd('service',{d:'controla un servicio (forma antigua de systemctl)',uso:'service nombre start|stop|restart|status',cat:'Procesos y servicios',sbin:true},function(x){
  var a=x.args.slice(1),s=x.sis;
  if(a[0]==='--status-all'){x.out(Object.keys(s.servicios).sort().map(function(k){return ' [ '+(s.servicios[k].activo?'+':'-')+' ]  '+k}).join('\n')+'\n');return}
  if(a.length<2){x.err('Usage: service < option > | --status-all | [ service_name [ command | --full-restart ] ]\n');return 1}
  return CMD.systemctl.fn(Object.assign({},x,{args:['systemctl',a[1],a[0]]}));
});
cmd('journalctl',{d:'muestra los registros (logs) del sistema',uso:'journalctl [-u servicio] [-n N]',ops:[['-u ssh','solo los de un servicio'],['-n 20','las últimas 20 líneas'],['-f','sigue mostrando lo nuevo'],['-p err','solo errores']],cat:'Procesos y servicios'},function(x){
  var o=opts(x.args,'unp'),s=x.sis,ls=s.diario.slice();
  if(x.u!=='root'&&!s.enGrupo(x.u,'adm')&&!s.enGrupo(x.u,'systemd-journal')){x.out('Hint: You are currently not seeing messages from other users and the system.\n      Users in groups \'adm\', \'systemd-journal\' can see all messages.\n-- No entries --\n');return}
  if(o.val.u){var v=unidad(s,o.val.u);ls=ls.filter(function(e){return v?e.u===v.nombre:false})}
  if(o.val.p)ls=ls.filter(function(e){return /fail|error|denied|invalid/i.test(e.txt)});
  ls.sort(function(a,b){return a.f-b.f});
  if(o.val.n)ls=ls.slice(-parseInt(o.val.n,10));
  if(!ls.length){x.out('-- No entries --\n');return}
  x.out(ls.map(function(e){return fechaLog(e.f)+' '+s.host+' '+(/fail|error/i.test(e.txt)&&x.tty?c('e',e.txt):e.txt)}).join('\n')+'\n');
  if(o.f.f)x.consejo('journalctl-f','en una terminal real, journalctl -f se queda mostrando los registros nuevos hasta que pulses Ctrl+C.');
});

/* --- Paquetes --- */
function kb(n){return n>=1000?coma(n/1000,1)+' MB':coma(n,1)+' kB'}
function cerrojo(x,actualizar){
  if(x.u==='root')return true;
  if(actualizar)x.err('Leyendo lista de paquetes... Hecho\nE: No se pudo abrir el archivo de bloqueo «/var/lib/apt/lists/lock» - open (13: Permiso denegado)\nE: No se pudo bloquear el directorio /var/lib/apt/lists/\n');
  else x.err('E: No se pudo abrir el archivo de bloqueo «/var/lib/dpkg/lock-frontend» - open (13: Permiso denegado)\nE: No se pudo obtener el bloqueo del administrador de paquetes (dpkg) (/var/lib/dpkg/lock-frontend). ¿Es usted superusuario?\n');
  x.consejo('apt-sudo','instalar, quitar o actualizar programas cambia el sistema, así que necesita sudo. Prueba: sudo !! (repite tu último comando con sudo).');
  return false;
}
function lineas(x,ls,ms){
  return ls.reduce(function(p,l){return p.then(function(){x.out(l+'\n');return x.esperar(ms||40)})},Promise.resolve());
}
function actualizables(s){return Object.keys(s.paquetes).filter(function(n){return s.listas&&PAQ[n]&&PAQ[n].nueva&&s.paquetes[n].v!==PAQ[n].nueva})}
function instalarEfectos(s,n){
  var p=PAQ[n];
  s.paquetes[n]={v:p.nueva||p.v,manual:false};
  (p.cmds||[]).forEach(function(cm){var m=CMD[cm];s.poner((m&&m.sbin?'/usr/sbin/':'/usr/bin/')+cm,'\u007fELF\u0002\u0001\u0001 (programa compilado: no es texto)\n',{modo:0o755})});
  if(n==='nginx'){
    s.poner('/etc/nginx/nginx.conf','user www-data;\nworker_processes auto;\npid /run/nginx.pid;\n\nevents {\n\tworker_connections 768;\n}\n\nhttp {\n\tsendfile on;\n\tinclude /etc/nginx/mime.types;\n\taccess_log /var/log/nginx/access.log;\n\terror_log /var/log/nginx/error.log;\n\tinclude /etc/nginx/sites-enabled/*;\n}\n');
    s.poner('/etc/nginx/sites-available/default','server {\n\tlisten 80 default_server;\n\tlisten [::]:80 default_server;\n\n\troot /var/www/html;\n\tindex index.html index.htm index.nginx-debian.html;\n\n\tserver_name _;\n\n\tlocation / {\n\t\ttry_files $uri $uri/ =404;\n\t}\n}\n');
    s.poner('/etc/nginx/sites-enabled/');
    s.buscar('/etc/nginx/sites-enabled','root').n.h['default']={t:'l',u:'root',g:'root',modo:0o777,dest:'/etc/nginx/sites-available/default',txt:'/etc/nginx/sites-available/default',m:new Date()};
    s.poner('/var/www/html/index.nginx-debian.html',PAGINA_NGINX);
    s.poner('/var/log/nginx/access.log','',{u:'www-data',g:'adm',modo:0o640});
    s.poner('/var/log/nginx/error.log','',{u:'www-data',g:'adm',modo:0o640});
    var v=s.servicios.nginx||s.servicio('nginx',{validar:nginxConfig,desc:'A high performance web server and a reverse proxy server',cmd:'nginx: master process /usr/sbin/nginx -g daemon on; master_process on;',nombreProc:'nginx',puertos:[80],mem:'2.9M',paquete:'nginx',
      hijos:[{cmd:'nginx: worker process',nombre:'nginx',u:'www-data'},{cmd:'nginx: worker process',nombre:'nginx',u:'www-data'}]});
    v.habilitado=true;if(!v.activo)s.arrancar(v);
  }
}
var PAGINA_NGINX='<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n\n<p><em>Thank you for using nginx.</em></p>\n</body>\n</html>\n';
function apt(x){
  var s=x.sis,o=opts(x.args),acc=o.pos[0],ps=o.pos.slice(1),si=o.f.y||o.largo.yes||o.largo['assume-yes'];
  var LEER=['Leyendo lista de paquetes... Hecho','Creando árbol de dependencias... Hecho','Leyendo la información de estado... Hecho'];
  if(!acc){x.out('apt 2.7.14 (amd64)\nUso: apt [opciones] orden\n\nÓrdenes más usadas:\n  update - actualiza la lista de paquetes disponibles\n  upgrade - actualiza los paquetes instalados\n  install - instala paquetes\n  remove - desinstala paquetes\n  purge - desinstala paquetes y borra su configuración\n  autoremove - quita dependencias que ya nadie usa\n  search - busca paquetes\n  show - muestra los detalles de un paquete\n  list - lista paquetes\n');return 0}
  if(acc==='update'){
    if(!cerrojo(x,true))return 100;
    var nuevo=!s.listas;s.listas=true;
    return lineas(x,['Obj:1 http://mx.archive.ubuntu.com/ubuntu noble InRelease','Des:2 http://mx.archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]','Des:3 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]','Des:4 http://mx.archive.ubuntu.com/ubuntu noble-backports InRelease [126 kB]']
      .concat(nuevo?['Des:5 http://mx.archive.ubuntu.com/ubuntu noble/main amd64 Packages [1.401 kB]','Des:6 http://mx.archive.ubuntu.com/ubuntu noble/universe amd64 Packages [15,0 MB]']:[])
      .concat(['Descargados '+(nuevo?'16,8 MB en 4s (4.120 kB/s)':'378 kB en 1s (412 kB/s)')]).concat(LEER),70).then(function(){
      var n=actualizables(s).length;
      x.out(n?'Se pueden actualizar '+n+' paquetes. Ejecute «apt list --upgradable» para verlos.\n':'Todos los paquetes están actualizados.\n');
    });
  }
  if(acc==='upgrade'||acc==='full-upgrade'||acc==='dist-upgrade'){
    if(!cerrojo(x))return 100;
    var up=actualizables(s);
    return lineas(x,LEER.concat(['Calculando la actualización... Hecho'])).then(function(){
      if(!up.length){x.out('0 actualizados, 0 nuevos se instalarán, 0 para eliminar y 0 no actualizados.\n');if(!s.listas)x.consejo('apt-update','apt todavía no sabe que hay versiones nuevas: primero corre sudo apt update.');return 0}
      x.out('Se actualizarán los siguientes paquetes:\n  '+up.join(' ')+'\n'+up.length+' actualizados, 0 nuevos se instalarán, 0 para eliminar y 0 no actualizados.\nSe necesita descargar '+kb(up.reduce(function(a,n){return a+PAQ[n].tam},0))+' de archivos.\n');
      return (si?Promise.resolve('s'):x.pedir('¿Desea continuar? [S/n] ')).then(function(r){
        if(r&&!/^[sSyY]/.test(r)){x.out('Cancelado.\n');return 1}
        var ls=[];up.forEach(function(n,i){ls.push('Des:'+(i+1)+' http://mx.archive.ubuntu.com/ubuntu noble-updates/main amd64 '+n+' amd64 '+PAQ[n].nueva+' ['+kb(PAQ[n].tam)+']')});
        up.forEach(function(n){ls.push('Preparando para desempaquetar .../'+n+'_'+PAQ[n].nueva.replace(/^\d+:/,'')+'_amd64.deb ...','Desempaquetando '+n+' ('+PAQ[n].nueva+') sobre ('+s.paquetes[n].v+') ...')});
        up.forEach(function(n){ls.push('Configurando '+n+' ('+PAQ[n].nueva+') ...')});
        return lineas(x,ls,60).then(function(){up.forEach(function(n){s.paquetes[n].v=PAQ[n].nueva});return 0});
      });
    });
  }
  if(acc==='install'||acc==='reinstall'){
    if(!ps.length){x.out(LEER.join('\n')+'\n0 actualizados, 0 nuevos se instalarán, 0 para eliminar y 0 no actualizados.\n');return 0}
    if(!cerrojo(x))return 100;
    var faltan=ps.filter(function(n){return !PAQ[n]||!s.listas&&!s.paquetes[n]});
    if(faltan.length){
      return lineas(x,LEER).then(function(){
        x.err(faltan.map(function(n){return 'E: No se ha podido localizar el paquete '+n}).join('\n')+'\n');
        if(!s.listas)x.consejo('apt-update','esta computadora nunca ha descargado la lista de paquetes. Corre primero sudo apt update.');
        return 100;
      });
    }
    var ya=ps.filter(function(n){return s.paquetes[n]}),nuevos=[];
    ps.forEach(function(n){if(!s.paquetes[n]){(PAQ[n].deps||[]).forEach(function(d){if(!s.paquetes[d]&&nuevos.indexOf(d)<0)nuevos.push(d)});if(nuevos.indexOf(n)<0)nuevos.push(n)}});
    var extra=nuevos.filter(function(n){return ps.indexOf(n)<0});
    var pend=actualizables(s).length;
    return lineas(x,LEER).then(function(){
      ya.forEach(function(n){x.out(n+' ya está en su versión más reciente ('+s.paquetes[n].v+').\n')});
      if(!nuevos.length){x.out('0 actualizados, 0 nuevos se instalarán, 0 para eliminar y '+pend+' no actualizados.\n');return 0}
      var o2='';
      if(extra.length)o2+='Se instalarán los siguientes paquetes adicionales:\n  '+extra.join(' ')+'\n';
      o2+='Se instalarán los siguientes paquetes NUEVOS:\n  '+nuevos.join(' ')+'\n0 actualizados, '+nuevos.length+' nuevos se instalarán, 0 para eliminar y '+pend+' no actualizados.\n'+
        'Se necesita descargar '+kb(nuevos.reduce(function(a,n){return a+PAQ[n].tam},0))+' de archivos.\nSe utilizarán '+kb(nuevos.reduce(function(a,n){return a+PAQ[n].ocupa},0))+' de espacio de disco adicional después de esta operación.\n';
      x.out(o2);
      return (extra.length&&!si?x.pedir('¿Desea continuar? [S/n] '):Promise.resolve('s')).then(function(r){
        if(r&&!/^[sSyY]/.test(r)){x.out('Cancelado.\n');return 1}
        var ls=[];
        nuevos.forEach(function(n,i){var p=PAQ[n];ls.push('Des:'+(i+1)+' http://mx.archive.ubuntu.com/ubuntu noble/'+p.sec.split('/')[0]+' amd64 '+n+' amd64 '+p.v+' ['+kb(p.tam)+']')});
        ls.push('Descargados '+kb(nuevos.reduce(function(a,n){return a+PAQ[n].tam},0))+' en 1s ('+kb(nuevos.reduce(function(a,n){return a+PAQ[n].tam},0)*0.9)+'/s)');
        nuevos.forEach(function(n){var p=PAQ[n];ls.push('Seleccionando el paquete '+n+' previamente no seleccionado.','(Leyendo la base de datos ... 74312 archivos o directorios instalados actualmente.)','Preparando para desempaquetar .../'+n+'_'+p.v.replace(/^\d+:/,'')+'_amd64.deb ...','Desempaquetando '+n+' ('+p.v+') ...')});
        nuevos.forEach(function(n){ls.push('Configurando '+n+' ('+PAQ[n].v+') ...');if(PAQ[n].servicio)ls.push('Created symlink /etc/systemd/system/multi-user.target.wants/'+PAQ[n].servicio+'.service → /usr/lib/systemd/system/'+PAQ[n].servicio+'.service.')});
        ls.push('Procesando disparadores para man-db (2.12.0-4build2) ...');
        return lineas(x,ls,55).then(function(){
          nuevos.forEach(function(n){instalarEfectos(s,n);if(ps.indexOf(n)>=0)s.paquetes[n].manual=true});
          return 0;
        });
      });
    });
  }
  if(acc==='remove'||acc==='purge'){
    if(!cerrojo(x))return 100;
    var quitar=ps.filter(function(n){return s.paquetes[n]}),no=ps.filter(function(n){return !s.paquetes[n]});
    return lineas(x,LEER).then(function(){
      no.forEach(function(n){x.out(PAQ[n]?'El paquete «'+n+'» no está instalado, no se eliminará\n':'');if(!PAQ[n])x.err('E: No se ha podido localizar el paquete '+n+'\n')});
      if(!quitar.length){x.out('0 actualizados, 0 nuevos se instalarán, 0 para eliminar y 0 no actualizados.\n');return no.some(function(n){return !PAQ[n]})?100:0}
      var huerf=huerfanos(s,quitar);
      x.out((huerf.length?'Los siguientes paquetes se instalaron de forma automática y ya no son necesarios:\n  '+huerf.join(' ')+'\nUtilice «sudo apt autoremove» para eliminarlos.\n':'')+
        'Los siguientes paquetes se ELIMINARÁN:\n  '+quitar.map(function(n){return n+(acc==='purge'?'*':'')}).join(' ')+'\n0 actualizados, 0 nuevos se instalarán, '+quitar.length+' para eliminar y 0 no actualizados.\n'+
        'Se liberarán '+kb(quitar.reduce(function(a,n){return a+(PAQ[n]?PAQ[n].ocupa:0)},0))+' después de esta operación.\n');
      return (si?Promise.resolve('s'):x.pedir('¿Desea continuar? [S/n] ')).then(function(r){
        if(r&&!/^[sSyY]/.test(r)){x.out('Cancelado.\n');return 1}
        var ls=['(Leyendo la base de datos ... 74390 archivos o directorios instalados actualmente.)'];
        quitar.forEach(function(n){ls.push('Desinstalando '+n+' ('+s.paquetes[n].v+') ...');if(acc==='purge')ls.push('Purgando archivos de configuración de '+n+' ('+s.paquetes[n].v+') ...')});
        ls.push('Procesando disparadores para man-db (2.12.0-4build2) ...');
        return lineas(x,ls,55).then(function(){quitar.forEach(function(n){desinstalar(s,n,acc==='purge')});return 0});
      });
    });
  }
  if(acc==='autoremove'){
    if(!cerrojo(x))return 100;
    var hs=huerfanos(s,[]);
    return lineas(x,LEER).then(function(){
      if(!hs.length){x.out('0 actualizados, 0 nuevos se instalarán, 0 para eliminar y 0 no actualizados.\n');return 0}
      x.out('Los siguientes paquetes se ELIMINARÁN:\n  '+hs.join(' ')+'\n0 actualizados, 0 nuevos se instalarán, '+hs.length+' para eliminar y 0 no actualizados.\n');
      return (si?Promise.resolve('s'):x.pedir('¿Desea continuar? [S/n] ')).then(function(r){
        if(r&&!/^[sSyY]/.test(r)){x.out('Cancelado.\n');return 1}
        return lineas(x,hs.map(function(n){return 'Desinstalando '+n+' ('+s.paquetes[n].v+') ...'}),55).then(function(){hs.forEach(function(n){desinstalar(s,n,false)});return 0});
      });
    });
  }
  if(acc==='search'){
    var t=(ps.join(' ')||'').toLowerCase();
    if(!t){x.err('E: Necesita darle exactamente un patrón\n');return 100}
    var r=Object.keys(PAQ).sort().filter(function(n){return n.indexOf(t)>=0||PAQ[n].desc.toLowerCase().indexOf(t)>=0});
    x.out('Ordenando... Hecho\nBúsqueda en todo el texto... Hecho\n'+r.map(function(n){var p=PAQ[n];return (x.tty?c('g',n):n)+'/noble'+(p.nueva?'-updates':'')+' '+(s.paquetes[n]?s.paquetes[n].v:p.nueva||p.v)+' amd64'+(s.paquetes[n]?' [instalado'+(s.paquetes[n].manual?'':', automático')+']':'')+'\n  '+p.desc+'\n'}).join('\n'));
    return 0;
  }
  if(acc==='show'){
    var cod=0;
    ps.forEach(function(n){
      var p=PAQ[n];if(!p){x.err('E: No se ha podido localizar el paquete '+n+'\n');cod=100;return}
      x.out('Package: '+n+'\nVersion: '+(p.nueva||p.v)+'\nPriority: optional\nSection: '+p.sec+'\nMaintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\nInstalled-Size: '+kb(p.ocupa)+'\n'+(p.deps?'Depends: '+p.deps.join(', ')+'\n':'')+'Download-Size: '+kb(p.tam)+'\nAPT-Manual-Installed: '+(s.paquetes[n]&&s.paquetes[n].manual?'yes':'no')+'\nAPT-Sources: http://mx.archive.ubuntu.com/ubuntu noble/'+p.sec.split('/')[0]+' amd64 Packages\nDescription: '+p.desc+'\n\n');
    });
    return cod;
  }
  if(acc==='list'){
    var lst=Object.keys(PAQ).sort();
    if(o.largo.installed)lst=lst.filter(function(n){return s.paquetes[n]});
    if(o.largo.upgradable)lst=actualizables(s);
    if(ps.length)lst=lst.filter(function(n){return ps.some(function(q){return patronRe(q).test(n)})});
    x.out('Listando... Hecho\n'+lst.map(function(n){var p=PAQ[n],i=s.paquetes[n];return (x.tty?c('g',n):n)+'/noble'+(p.nueva?'-updates':'')+(i?',now ':' ')+(o.largo.upgradable?p.nueva:i?i.v:p.v)+' amd64'+(o.largo.upgradable?' [actualizable desde: '+i.v+']':i?' [instalado'+(i.manual?'':', automático')+']':'')}).join('\n')+(lst.length?'\n':''));
    return 0;
  }
  x.err('E: Operación no válida '+acc+'\n');
  return 100;
}
function huerfanos(s,quitando){
  var quedan=Object.keys(s.paquetes).filter(function(n){return quitando.indexOf(n)<0});
  return quedan.filter(function(n){
    if(!PAQ[n]||!PAQ[n].dep||s.paquetes[n].manual)return false;
    return !quedan.some(function(m){return (PAQ[m]&&PAQ[m].deps||[]).indexOf(n)>=0});
  });
}
function desinstalar(s,n,purgar){
  var p=PAQ[n];
  delete s.paquetes[n];
  (p&&p.cmds||[]).forEach(function(cm){var m=CMD[cm];var r=s.buscar((m&&m.sbin?'/usr/sbin':'/usr/bin'),'root');if(r.n)delete r.n.h[cm]});
  if(p&&p.servicio&&s.servicios[p.servicio]){var v=s.servicios[p.servicio];if(v.activo)s.detener(v);v.habilitado=false}
  if(n==='nginx'&&purgar){var e=s.buscar('/etc','root').n;delete e.h.nginx}
  if(n==='nginx-common'&&purgar){var e2=s.buscar('/etc','root').n;delete e2.h.nginx}
}
cmd('apt apt-get',{d:'instala, actualiza y quita programas',uso:'sudo apt acción [paquete...]',ops:[['update','descarga la lista de versiones nuevas'],['upgrade','instala las versiones nuevas'],['install nombre','instala un programa'],['remove nombre','lo desinstala'],['search texto','busca programas'],['show nombre','muestra los detalles']],cat:'Paquetes'},apt);
cmd('dpkg',{d:'administra paquetes uno por uno (apt lo usa por debajo)',uso:'dpkg -l [patrón]',cat:'Paquetes'},function(x){
  var s=x.sis,a=x.args.slice(1);
  if(a[0]==='-l'){
    var ls=Object.keys(s.paquetes).sort();
    if(a[1])ls=ls.filter(function(n){return patronRe(a[1]).test(n)});
    if(!ls.length){x.err('dpkg-query: no se encontró ningún paquete que corresponda con '+a[1]+'\n');return 1}
    x.out('Deseado=desconocido(U)/Instalar(I)/eliminaR/Purgar/retener(H)\n| Estado=No/Inst/ficheros-Conf/desempaqUetado/medio-conF/medio-inst(H)\n||/ Nombre        Versión               Arquitectura Descripción\n+++-=============-=====================-============-================================\n'+
      ls.map(function(n){return 'ii  '+pad(n,13)+' '+pad(s.paquetes[n].v,21)+' amd64        '+(PAQ[n]?PAQ[n].desc:'')}).join('\n')+'\n');
    return 0;
  }
  if(a[0]==='-i'){x.consejo('dpkg-i','dpkg -i instala un archivo .deb descargado. Esta terminal no instala archivos .deb: usa apt install.');return 1}
  x.err('dpkg: error: necesita una opción que indique qué hacer\n');return 2;
});

/* --- Red: direcciones, alcance, DNS --- */
function ipNum(ip){var p=String(ip).split('.');if(p.length!==4)return null;var n=0;for(var i=0;i<4;i++){if(!/^\d{1,3}$/.test(p[i])||+p[i]>255)return null;n=n*256+(+p[i])}return n}
function numIp(n){return [Math.floor(n/16777216)%256,Math.floor(n/65536)%256,Math.floor(n/256)%256,n%256].join('.')}
function esIp(t){return ipNum(t)!==null}
function enRed(ip,red,bits){var a=ipNum(ip),b=ipNum(red);if(a===null||b===null)return false;var t=Math.pow(2,32-bits);return Math.floor(a/t)===Math.floor(b/t)}
function cidr(t){var p=String(t).split('/');return {red:p[0],bits:p.length>1?+p[1]:32}}
function redDe(ip,bits){var t=Math.pow(2,32-bits);return numIp(Math.floor(ipNum(ip)/t)*t)}
function difusion(ip,bits){var t=Math.pow(2,32-bits);return numIp(Math.floor(ipNum(ip)/t)*t+t-1)}
function privada(ip){return enRed(ip,'10.0.0.0',8)||enRed(ip,'172.16.0.0',12)||enRed(ip,'192.168.0.0',16)||enRed(ip,'100.64.0.0',10)}
function dentro(ip,lista){return (lista||[]).some(function(c2){var k=cidr(c2);return enRed(ip,k.red,k.bits)})}
var PUERTOS={20:'ftp-data',21:'ftp',22:'ssh',23:'telnet',25:'smtp',53:'domain',67:'bootps',80:'http',110:'pop3',123:'ntp',143:'imap',443:'https',465:'submissions',587:'submission',993:'imaps',3306:'mysql',3389:'ms-wbt-server',5432:'postgresql',8080:'http-alt'};
var NOMBRES_PUERTO={ssh:22,http:80,https:443,domain:53,dns:53,smtp:25,ftp:21,mysql:3306,postgresql:5432,ntp:123};
var DNS_BASE={
  'example.com':{A:['203.0.113.10'],AAAA:['2001:db8::10'],MX:['10 mail.example.com.'],NS:['a.iana-servers.net.','b.iana-servers.net.'],TXT:['"v=spf1 -all"']},
  'www.example.com':{CNAME:['example.com.']},
  'mail.example.com':{A:['203.0.113.11']},
  'ubuntu.com':{A:['203.0.113.30'],AAAA:['2001:db8::30']},
  'mx.archive.ubuntu.com':{A:['203.0.113.31']},
  'security.ubuntu.com':{A:['203.0.113.32']}
};
function sintetica(h){var n=0;for(var i=0;i<h.length;i++)n=(n*31+h.charCodeAt(i))%250;return '203.0.113.'+(n+2)}
/* Ruta para una IP: la red conectada, la ruta más específica o la ruta por defecto */
S.rutaPara=function(ip){
  var r=this.red,mejor=null;
  if(r.ip&&r.arriba&&enRed(ip,r.ip,r.bits))mejor={bits:r.bits,directa:true};
  r.rutas.forEach(function(rt){var k=cidr(rt.destino);if(enRed(ip,k.red,k.bits)&&(!mejor||k.bits>mejor.bits))mejor={bits:k.bits,via:rt.via}});
  if(!mejor&&r.puerta)mejor={bits:0,via:r.puerta};
  return mejor;
};
S.vecino=function(ip){var r=this.red;return !!(r.vecinos[ip]||this.mundo.porIp(ip))};
/* ¿Llega un paquete a ip? {ok, rtt, saltos:[{ip, nombre}], ttl, sis} o {err:'red'|'host'|'timeout', saltos} */
S.alcance=function(ip){
  var s=this,r=s.red;
  if(/^127\./.test(ip)||ip===r.ip&&r.ip)return {ok:true,rtt:0.04,saltos:[],ttl:64,sis:s};
  if(!r.arriba||!r.ip)return {err:'red'};
  var ruta=s.rutaPara(ip);
  if(!ruta)return {err:'red'};
  if(ruta.directa){
    if(!s.vecino(ip))return {err:'host'};
    r.conocidos[ip]=r.vecinos[ip]||s.mundo.porIp(ip).red.mac;
    return {ok:true,rtt:1.1,saltos:[],ttl:64,sis:s.mundo.porIp(ip)};
  }
  var gw=ruta.via;
  if(!enRed(gw,r.ip,r.bits)||!s.vecino(gw))return {err:'host'};
  r.conocidos[gw]=r.vecinos[gw]||s.mundo.porIp(gw).red.mac;
  if(dentro(ip,r.detras[gw]))return {ok:true,rtt:2.6,saltos:[{ip:gw}],ttl:63,sis:s.mundo.porIp(ip)};
  if(gw===r.salida&&!privada(ip)&&r.internet!==false)
    return {ok:true,rtt:19,saltos:[{ip:gw,nombre:'_gateway'},{ip:'10.20.0.1'},{ip:null},{ip:'198.51.100.9'}],ttl:56,sis:s.mundo.porIp(ip)};
  return {err:'timeout',saltos:[{ip:gw,nombre:gw===r.salida?'_gateway':gw}]};
};
S.dnsServidor=function(){var n=this.nodo('/etc/resolv.conf'),m=n?this.contenido(n).match(/^\s*nameserver\s+(\S+)/m):null;return m?m[1]:null};
/* Consulta DNS: {ok:[valores], srv} o {err:'nx'|'sin', srv} */
S.dns=function(nombre,tipo,servidor){
  var s=this,ns=servidor||s.dnsServidor();
  nombre=String(nombre).replace(/\.$/,'').toLowerCase();tipo=tipo||'A';
  if(!ns)return {err:'sin',srv:null};
  if(ns==='127.0.0.53'&&!servidor){
    var v=s.servicio('systemd-resolved');
    if(!v||!v.activo)return {err:'sin',srv:ns};
    var up=s.red.dnsSup||s.red.salida;
    if(!up||!s.alcance(up).ok)return {err:'sin',srv:ns};
  }else if(!s.alcance(ns).ok)return {err:'sin',srv:ns};
  var reg=s.red.dns[nombre]||DNS_BASE[nombre];
  if(!reg&&!privada(ns)&&s.red.internet===false)return {err:'sin',srv:ns};
  if(!reg&&s.red.internet===false&&!s.red.dns[nombre])return {err:'sin',srv:ns};
  if(reg){
    if(reg.CNAME&&tipo!=='CNAME'){var dest=s.dns(reg.CNAME[0],tipo,servidor);return {ok:dest.ok||[],cname:reg.CNAME[0],srv:ns}}
    return {ok:reg[tipo]||[],srv:ns};
  }
  if(/\.(example|test|invalid|local)$/.test(nombre)||!/\.[a-z]{2,}$/.test(nombre))return {err:'nx',srv:ns};
  if(tipo==='A')return {ok:[sintetica(nombre)],srv:ns};
  if(tipo==='AAAA')return {ok:['2001:db8:'+sintetica(nombre).split('.')[3]+'::1'],srv:ns};
  return {ok:[],srv:ns};
};
/* Nombre a IP como lo hace un programa: IP escrita, /etc/hosts, nombres de la red local y DNS */
S.resolver=function(h){
  var s=this;
  if(esIp(h))return {ip:h};
  if(h==='localhost')return {ip:'127.0.0.1'};
  var hosts=s.nodo('/etc/hosts'),t=hosts?s.contenido(hosts):'',enc=null;
  t.split('\n').some(function(l){l=l.replace(/#.*/,'').trim();if(!l)return;var p=l.split(/\s+/);if(p.slice(1).indexOf(h)>=0&&esIp(p[0])){enc=p[0];return true}});
  if(enc)return {ip:enc};
  if(s.red.hosts[h])return {ip:s.red.hosts[h]};
  var r=s.dns(h,'A');
  if(r.err)return {err:r.err};
  return r.ok.length?{ip:r.ok[0]}:{err:'nx'};
};
/* Puerto de un sistema visto desde otra IP: 'abierto', 'cerrado' (nadie escucha) o 'filtrado' (firewall) */
function puertoEstado(dest,puerto,origen){
  var propio=/^127\./.test(origen)||origen===dest.red.ip;
  if(!propio&&dest.ufw.activo&&!ufwPermite(dest,puerto,origen))return 'filtrado';
  var escucha=Object.keys(dest.servicios).some(function(k){var v=dest.servicios[k];return v.activo&&v.puertos.indexOf(puerto)>=0&&(!v.paquete||dest.instalado(v.paquete))});
  return escucha?'abierto':'cerrado';
}
function nombreIp(s,ip){
  if(ip===s.red.salida||ip===s.red.puerta)return '_gateway';
  var d=s.mundo.porIp(ip);if(d)return d.host;
  for(var k in s.red.hosts)if(s.red.hosts[k]===ip)return k;
  return ip;
}

cmd('ping',{d:'comprueba si otra computadora responde',uso:'ping [-c N] equipo',ops:[['-c 4','envía solo 4 paquetes']],cat:'Red'},function(x){
  var seis=x.args.indexOf('-6')>0,o=opts(x.args.filter(function(v){return v!=='-6'&&v!=='-4'}),'cWi'),h=o.pos[0],s=x.sis;
  if(!h){x.err('ping: usage error: Destination address required\n');return 1}
  if(seis||h.indexOf(':')>=0)return ping6(x,h,o);
  var rs=s.resolver(h);
  if(rs.err==='sin'){x.err('ping: '+h+': Fallo temporal en la resolución del nombre\n');x.consejo('ping-dns','el nombre no se pudo traducir a una IP: revisa el DNS (resolvectl status, /etc/resolv.conf) o prueba con una IP, como ping 1.1.1.1.');return 2}
  if(rs.err){x.err('ping: '+h+': Nombre o servicio desconocido\n');return 2}
  var ip=rs.ip,al=s.alcance(ip);
  if(al.err==='red'){x.err('ping: connect: La red es inaccesible\n');return 2}
  var n=o.val.c?parseInt(o.val.c,10):AT.reduce?4:100,i=0,ok=0,tiempos=[];
  x.out('PING '+h+' ('+ip+') 56(84) bytes of data.\n');
  if(/^203\.0\.113\./.test(ip)&&!s.red.dns[h])x.consejo('ping-sim','esta terminal simula internet: la dirección de cada sitio es un ejemplo.');
  if(!o.val.c&&!AT.reduce)x.consejo('ping-c','ping sigue enviando hasta que pulses Ctrl+C. Con -c 4 envía solo 4.');
  function fin(){
    var perd=Math.round((i-ok)/Math.max(1,i)*100),errs=al.err==='host'?i-ok:0;
    x.out('\n--- '+h+' ping statistics ---\n'+i+' packets transmitted, '+ok+' received, '+(errs?'+'+errs+' errors, ':'')+perd+'% packet loss, time '+(i?(i-1)*1001:0)+'ms\n'+
      (ok?'rtt min/avg/max/mdev = '+Math.min.apply(null,tiempos).toFixed(3)+'/'+(tiempos.reduce(function(a,b){return a+b},0)/ok).toFixed(3)+'/'+Math.max.apply(null,tiempos).toFixed(3)+'/0.412 ms\n':''));
    return ok?0:1;
  }
  function uno(){
    if(i>=n)return Promise.resolve(fin());
    i++;
    var t=al.ok?al.rtt*(1+((i*7)%5)*0.08):null;
    return x.esperar(i===1?150:900).then(function(){
      if(al.err==='host')x.out('From '+s.red.ip+' icmp_seq='+i+' Destination Host Unreachable\n');
      else if(al.ok){ok++;tiempos.push(t);x.out('64 bytes from '+(h===ip?ip:h+' ('+ip+')')+': icmp_seq='+i+' ttl='+al.ttl+' time='+(t<1?t.toFixed(3):t.toFixed(1))+' ms\n')}
      return uno();
    },function(e){if(e==='cancelado')fin();throw e});
  }
  return uno();
});
/* ping por IPv6: la propia computadora, el router (fe80::1) o internet si hay dirección global */
function ping6(x,h,o){
  var s=x.sis,r=s.red,ip=h,n=o.val.c?parseInt(o.val.c,10):4;
  if(h.indexOf(':')<0){var d=s.dns(h,'AAAA');if(d.err||!d.ok.length){x.err('ping: '+h+': '+(d.err==='sin'?'Fallo temporal en la resolución del nombre':'La dirección no está asociada al nombre')+'\n');return 2}ip=d.ok[0]}
  var local=ip==='::1'||r.ip6&&ip===r.ip6,enlace=/^fe80:/i.test(ip),ok=local||r.arriba&&(enlace?/^fe80::1(%|$)/i.test(ip):!!r.ip6&&r.internet!==false&&!!r.puerta);
  if(!local&&!r.arriba){x.err('ping: connect: La red es inaccesible\n');return 2}
  if(!local&&!enlace&&!r.ip6){x.err('ping: connect: La red es inaccesible\n');x.consejo('ping6','esta computadora no tiene dirección IPv6 global: tu red o tu proveedor no dan IPv6.');return 2}
  x.out('PING '+h+'('+(h===ip?ip:ip)+') 56 data bytes\n');
  var i=0,t=local?0.04:enlace?0.9:21;
  function uno(){
    if(i>=n){x.out('\n--- '+h+' ping statistics ---\n'+n+' packets transmitted, '+(ok?n:0)+' received, '+(ok?0:100)+'% packet loss, time '+(n-1)*1001+'ms\n'+(ok?'rtt min/avg/max/mdev = '+t.toFixed(3)+'/'+(t*1.05).toFixed(3)+'/'+(t*1.1).toFixed(3)+'/0.210 ms\n':''));return Promise.resolve(ok?0:1)}
    i++;
    return x.esperar(i===1?150:900).then(function(){if(ok)x.out('64 bytes from '+ip+': icmp_seq='+i+' ttl='+(local||enlace?64:57)+' time='+(t<1?t.toFixed(3):(t*(1+i*0.03)).toFixed(1))+' ms\n');return uno()});
  }
  return uno();
}
function lineaSalto(k,ip,nombre,base){
  if(!ip)return pad(k,2,true)+'  * * *\n';
  var ms=[0,1,2].map(function(j){return (base*(1+j*0.04)).toFixed(3)+' ms'}).join('  ');
  return pad(k,2,true)+'  '+(nombre||ip)+' ('+ip+')  '+ms+'\n';
}
function traza(x,nombreCmd){
  var o=opts(x.args,'mqw'),h=o.pos[0],s=x.sis;
  if(!h){x.err('Usage: '+nombreCmd+' [OPTION...] HOST\n');return 2}
  var rs=s.resolver(h);
  if(rs.err){x.err(h+': '+(rs.err==='sin'?'Fallo temporal en la resolución del nombre':'Nombre o servicio desconocido')+'\nCannot handle "host" cmdline arg `'+h+"' on position 1 (argc 1)\n");return 2}
  var ip=rs.ip,al=s.alcance(ip);
  x.out('traceroute to '+h+' ('+ip+'), 30 hops max, 60 byte packets\n');
  if(al.err==='red'){x.err('connect: La red es inaccesible\n');return 1}
  var saltos=(al.saltos||[]).slice(),lineas=[];
  saltos.forEach(function(sa,k){lineas.push(lineaSalto(k+1,sa.ip,sa.nombre||(sa.ip&&nombreIp(s,sa.ip)!==sa.ip?nombreIp(s,sa.ip):null),1.4+k*4.5))});
  if(al.ok)lineas.push(lineaSalto(saltos.length+1,ip,h!==ip?h:nombreIp(s,ip)!==ip?nombreIp(s,ip):null,al.rtt));
  else if(al.err==='host')lineas.push(pad(saltos.length+1,2,true)+'  '+s.host+' ('+s.red.ip+')  3069.611 ms !H  3069.580 ms !H  3069.556 ms !H\n');
  else for(var k=saltos.length+1;k<=saltos.length+6;k++)lineas.push(pad(k,2,true)+'  * * *\n');
  return lineas.reduce(function(p,l){return p.then(function(){x.out(l);return x.esperar(120)})},Promise.resolve()).then(function(){
    if(al.err==='timeout')x.consejo('traceroute','traceroute sigue hasta 30 saltos; aquí cortamos antes. Los asteriscos son saltos que no contestan: el problema está después del último que sí respondió.');
    if(al.ok&&saltos.some(function(sa){return !sa.ip}))x.consejo('traceroute-estrella','un salto con * * * en medio de un camino que llega no es una falla: muchos routers no contestan a traceroute.');
    return al.ok?0:1;
  });
}
cmd('traceroute',{d:'muestra los routers por los que pasan tus paquetes hasta un destino',uso:'traceroute equipo',cat:'Red',paq:'traceroute'},function(x){return traza(x,'traceroute')});
cmd('tracepath',{d:'como traceroute, sin instalar nada',uso:'tracepath equipo',cat:'Red'},function(x){return traza(x,'tracepath')});
function digTxt(x,nombre,tipo,srv,r){
  var d=new Date(),ok=!r.err;
  var o='\n; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> '+nombre+(tipo!=='A'?' '+tipo:'')+'\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: '+(r.err==='nx'?'NXDOMAIN':'NOERROR')+', id: 41236\n;; flags: qr rd ra; QUERY: 1, ANSWER: '+(ok?r.ok.length+(r.cname?1:0):0)+', AUTHORITY: '+(r.err==='nx'?1:0)+', ADDITIONAL: 1\n\n;; QUESTION SECTION:\n;'+nombre+'.\t\t\tIN\t'+tipo+'\n';
  if(ok&&(r.ok.length||r.cname)){
    o+='\n;; ANSWER SECTION:\n';
    if(r.cname)o+=nombre+'.\t\t3600\tIN\tCNAME\t'+r.cname+'\n';
    r.ok.forEach(function(v){o+=(r.cname||nombre+'.').replace(/\.?$/,'.')+'\t\t3600\tIN\t'+tipo+'\t'+v+'\n'});
  }
  if(r.err==='nx')o+='\n;; AUTHORITY SECTION:\n'+nombre.split('.').slice(-1)[0]+'.\t\t86400\tIN\tSOA\ta.root-servers.net. nstld.verisign-grs.com. 2026111800 1800 900 604800 86400\n';
  o+='\n;; Query time: '+(ok?23:41)+' msec\n;; SERVER: '+srv+'#53('+srv+') (UDP)\n;; WHEN: '+DIAS_ES[d.getDay()]+' '+MESES[d.getMonth()]+' '+dos(d.getDate())+' '+hora(d)+' CST '+d.getFullYear()+'\n;; MSG SIZE  rcvd: 56\n\n';
  return o;
}
cmd('dig',{d:'pregunta al DNS (con todos los detalles)',uso:'dig nombre [A|AAAA|MX|NS|TXT] [@servidor] [+short]',ops:[['+short','solo la respuesta'],['MX','el tipo de registro'],['@1.1.1.1','pregunta a otro servidor DNS']],cat:'Red'},function(x){
  var s=x.sis,nombre=null,tipo='A',srv=null,corto=false;
  x.args.slice(1).forEach(function(a){if(a==='+short')corto=true;else if(a.charAt(0)==='@')srv=a.slice(1);else if(/^(A|AAAA|MX|NS|TXT|CNAME|ANY|SOA)$/i.test(a))tipo=a.toUpperCase();else if(a.charAt(0)!=='+'&&a.charAt(0)!=='-')nombre=a});
  if(!nombre){nombre='.';tipo='NS'}
  var r=s.dns(nombre,tipo==='ANY'?'A':tipo,srv),usado=srv||r.srv||s.dnsServidor()||'127.0.0.53';
  if(r.err==='sin'){x.out(';; communications error to '+usado+'#53: timed out\n;; communications error to '+usado+'#53: timed out\n;; communications error to '+usado+'#53: timed out\n\n; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> '+nombre+'\n;; global options: +cmd\n;; no servers could be reached\n');return x.esperar(400).then(function(){return 9})}
  if(corto){x.out((r.cname?r.cname+'\n':'')+(r.ok||[]).map(function(v){return v+'\n'}).join(''));return 0}
  x.out(digTxt(x,nombre,tipo,usado,r));
  return 0;
});
cmd('nslookup',{d:'pregunta al DNS la dirección de un nombre',uso:'nslookup nombre [servidor]',cat:'Red'},function(x){
  var s=x.sis,a=x.args.slice(1).filter(function(v){return v.charAt(0)!=='-'}),tipo=(x.args.join(' ').match(/-(?:type|query)=(\w+)/)||[])[1],nombre=a[0],srv=a[1]||null;
  if(!nombre){x.consejo('nslookup','escribe el nombre a buscar: nslookup example.com');return 1}
  tipo=(tipo||'A').toUpperCase();
  var r=s.dns(nombre,tipo,srv),usado=srv||s.dnsServidor()||'127.0.0.53';
  if(r.err==='sin'){x.out(';; communications error to '+usado+'#53: timed out\n;; communications error to '+usado+'#53: timed out\n;; no servers could be reached\n\n');return 1}
  var o='Server:\t\t'+usado+'\nAddress:\t'+usado+'#53\n\n';
  if(r.err==='nx'){x.out(o+"** server can't find "+nombre+': NXDOMAIN\n\n');return 1}
  o+='Non-authoritative answer:\n';
  if(r.cname)o+=nombre+'\tcanonical name = '+r.cname+'\n';
  if(tipo==='MX')o+=r.ok.map(function(v){return nombre+'\tmail exchanger = '+v+'\n'}).join('');
  else o+=r.ok.map(function(v){return 'Name:\t'+(r.cname?r.cname.replace(/\.$/,''):nombre)+'\nAddress: '+v+'\n'}).join('');
  x.out(o+'\n');
});
cmd('host',{d:'pregunta al DNS de forma breve',uso:'host nombre',cat:'Red'},function(x){
  var s=x.sis,n=x.args[1];
  if(!n){x.err('Usage: host [-t type] hostname [server]\n');return 1}
  var r=s.dns(n,'A');
  if(r.err==='sin'){x.out(';; communications error to '+(s.dnsServidor()||'127.0.0.53')+'#53: timed out\n;; no servers could be reached\n');return 1}
  if(r.err==='nx'){x.out('Host '+n+' not found: 3(NXDOMAIN)\n');return 1}
  var o=r.cname?n+' is an alias for '+r.cname+'\n':'';
  o+=r.ok.map(function(v){return (r.cname?r.cname.replace(/\.$/,''):n)+' has address '+v+'\n'}).join('');
  (s.dns(n,'MX').ok||[]).forEach(function(v){o+=n+' mail is handled by '+v+'\n'});
  x.out(o);
});
cmd('resolvectl',{d:'muestra qué servidores DNS usa la computadora',uso:'resolvectl status',cat:'Red'},function(x){
  var s=x.sis,v=s.servicio('systemd-resolved');
  if(!v||!v.activo){x.err("Failed to get global data: Unit dbus-org.freedesktop.resolve1.service not found.\n");x.consejo('resolved','el servicio systemd-resolved está apagado, así que nadie atiende las consultas DNS en 127.0.0.53. Enciéndelo con sudo systemctl start systemd-resolved.');return 1}
  var up=s.red.dnsSup||s.red.salida||'—';
  x.out('Global\n         Protocols: -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported\n  resolv.conf mode: stub\n\nLink 2 ('+s.red.iface+')\n    Current Scopes: DNS\n         Protocols: +DefaultRoute -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported\nCurrent DNS Server: '+up+'\n       DNS Servers: '+up+'\n');
});
cmd('ip',{d:'muestra y cambia las direcciones, rutas y tarjetas de red',uso:'ip a | ip route | ip link | ip neigh',ops:[['a','direcciones de cada tarjeta de red'],['-br a','lo mismo, resumido'],['route','la tabla de rutas'],['neigh','las MAC de los vecinos (ARP)'],['link set X up','enciende una tarjeta (con sudo)'],['route add default via IP','pone la puerta de enlace (con sudo)']],cat:'Red'},function(x){
  var a=x.args.slice(1).filter(function(v){return v!=='-c'&&v!=='-color'}),s=x.sis,r=s.red,br=false,fam=0;
  while(a.length&&/^-(br|brief|4|6)$/.test(a[0])){if(a[0]==='-4')fam=4;else if(a[0]==='-6')fam=6;else br=true;a.shift()}
  var obj=a[0]||'',acc=a[1]||'show';
  function soloRootIp(){if(x.u!=='root'){x.err('RTNETLINK answers: Operation not permitted\n');x.consejo('ip-sudo','cambiar la configuración de red necesita sudo.');return false}return true}
  var estado=r.arriba?c('g','UP'):'DOWN',flags=r.arriba?'<BROADCAST,MULTICAST,UP,LOWER_UP>':'<BROADCAST,MULTICAST>';
  if(/^(a|ad|addr|address)$/.test(obj)&&(acc==='show'||acc==='list'||acc==='s'||acc==='dev')){
    var v6=r.arriba&&r.ip6;
    if(br){x.out(pad('lo',16)+' UNKNOWN        '+(fam!==6?'127.0.0.1/8 ':'')+(fam!==4?'::1/128':'')+'\n'+pad(r.iface,16)+' '+pad(estado,15)+(fam!==6&&r.ip?r.ip+'/'+r.bits+' ':'')+(fam!==4&&r.arriba?(r.ip6?r.ip6+'/64 ':'')+'fe80::a00:27ff:fe3a:5c91/64':'')+'\n');return}
    var o='1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n'+(fam!==6?'    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever\n':'')+(fam!==4?'    inet6 ::1/128 scope host noprefixroute\n       valid_lft forever preferred_lft forever\n':'');
    o+='2: '+r.iface+': '+flags+' mtu 1500 qdisc fq_codel state '+estado+' group default qlen 1000\n    link/ether '+r.mac+' brd ff:ff:ff:ff:ff:ff\n';
    if(fam!==6&&r.ip)o+='    inet '+c('b',r.ip+'/'+r.bits)+' brd '+difusion(r.ip,r.bits)+' scope global '+(r.dhcp?'dynamic ':'')+r.iface+'\n       valid_lft '+(r.dhcp?'85912sec preferred_lft 85912sec':'forever preferred_lft forever')+'\n';
    if(fam!==4&&v6)o+='    inet6 '+c('b',r.ip6+'/64')+' scope global dynamic mngtmpaddr noprefixroute\n       valid_lft 86172sec preferred_lft 14172sec\n';
    if(fam!==4&&r.arriba)o+='    inet6 fe80::a00:27ff:fe3a:5c91/64 scope link\n       valid_lft forever preferred_lft forever\n';
    x.out(o);return;
  }
  if(/^(a|ad|addr|address)$/.test(obj)&&(acc==='add'||acc==='del'||acc==='flush')){
    if(!soloRootIp())return 2;
    if(acc==='flush'){r.ip=null;return}
    var k=cidr(a[2]||'');
    if(!esIp(k.red)){x.err('Error: any valid prefix is expected rather than "'+(a[2]||'')+'".\n');return 1}
    if(acc==='add'){if(r.ip&&r.ip===k.red){x.err('RTNETLINK answers: File exists\n');return 2}r.ip=k.red;r.bits=k.bits||24;r.dhcp=false}
    else{if(r.ip!==k.red){x.err('RTNETLINK answers: Cannot assign requested address\n');return 2}r.ip=null}
    return;
  }
  if(/^(l|link)$/.test(obj)&&acc==='set'){
    if(!soloRootIp())return 2;
    var dev=a[2]==='dev'?a[3]:a[2],st=a[a.length-1];
    if(dev!==r.iface&&dev!=='lo'){x.err('Cannot find device "'+dev+'"\n');return 1}
    if(dev===r.iface&&(st==='up'||st==='down'))r.arriba=st==='up';
    return;
  }
  if(/^(l|link)$/.test(obj)){
    if(br){x.out(pad('lo',16)+' UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>\n'+pad(r.iface,16)+' '+pad(estado,15)+r.mac+' '+flags+'\n');return}
    x.out('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n2: '+r.iface+': '+flags+' mtu 1500 qdisc fq_codel state '+estado+' mode DEFAULT group default qlen 1000\n    link/ether '+c('b',r.mac)+' brd ff:ff:ff:ff:ff:ff\n');return;
  }
  if(/^(r|ro|route)$/.test(obj)&&(acc==='add'||acc==='del'||acc==='replace')){
    if(!soloRootIp())return 2;
    var dest=a[2],via=a[a.indexOf('via')+1];
    if(!dest){x.err('Command line is not complete. Try option "help"\n');return 255}
    if(acc==='del'){
      if(dest==='default'){if(!r.puerta){x.err('RTNETLINK answers: No such process\n');return 2}r.puerta=null;return}
      var antes=r.rutas.length;r.rutas=r.rutas.filter(function(rt){return rt.destino!==dest});
      if(antes===r.rutas.length){x.err('RTNETLINK answers: No such process\n');return 2}return;
    }
    if(a.indexOf('via')<0||!esIp(via)){x.err('Error: inet prefix is expected rather than "'+(via||'')+'".\n');return 1}
    if(!r.ip||!r.arriba||!enRed(via,r.ip,r.bits)){x.err('Error: Nexthop has invalid gateway.\n');return 2}
    if(dest==='default'){if(r.puerta&&acc==='add'){x.err('RTNETLINK answers: File exists\n');return 2}r.puerta=via;return}
    var kd=cidr(dest);
    if(!esIp(kd.red)){x.err('Error: any valid prefix is expected rather than "'+dest+'".\n');return 1}
    if(r.rutas.some(function(rt){return rt.destino===dest})&&acc==='add'){x.err('RTNETLINK answers: File exists\n');return 2}
    r.rutas=r.rutas.filter(function(rt){return rt.destino!==dest});
    r.rutas.push({destino:redDe(kd.red,kd.bits)+'/'+kd.bits,via:via});
    return;
  }
  if(/^(r|ro|route)$/.test(obj)){
    var t='';
    if(r.puerta)t+='default via '+r.puerta+' dev '+r.iface+' proto '+(r.dhcp?'dhcp':'static')+(r.dhcp?' src '+r.ip:'')+' metric 100\n';
    r.rutas.forEach(function(rt){t+=rt.destino+' via '+rt.via+' dev '+r.iface+' proto static\n'});
    if(r.ip&&r.arriba)t+=redDe(r.ip,r.bits)+'/'+r.bits+' dev '+r.iface+' proto kernel scope link src '+r.ip+' metric 100\n';
    x.out(t);return;
  }
  if(/^(n|ne|neigh|neighbor|neighbour)$/.test(obj)){
    x.out(Object.keys(r.conocidos).sort(function(p,q){return ipNum(p)-ipNum(q)}).map(function(ip){return ip+' dev '+r.iface+' lladdr '+r.conocidos[ip]+' '+(ip===r.puerta?'REACHABLE':'STALE')}).join('\n')+(Object.keys(r.conocidos).length?'\n':''));return;
  }
  x.err('Object "'+obj+'" is unknown, try "ip help".\n');
  return 255;
});
cmd('ifconfig',{d:'muestra las tarjetas de red (forma antigua de ip a)',cat:'Red',paq:'net-tools',sbin:true},function(x){
  var r=x.sis.red,mask=numIp(Math.pow(2,32)-Math.pow(2,32-r.bits));
  x.out(r.iface+': flags='+(r.arriba?'4163<UP,BROADCAST,RUNNING,MULTICAST>':'4098<BROADCAST,MULTICAST>')+'  mtu 1500\n'+(r.ip?'        inet '+r.ip+'  netmask '+mask+'  broadcast '+difusion(r.ip,r.bits)+'\n':'')+'        ether '+r.mac+'  txqueuelen 1000  (Ethernet)\n\nlo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n        loop  txqueuelen 1000  (Local Loopback)\n');
});
cmd('hostname',{d:'muestra el nombre de esta computadora',uso:'hostname [-I]',ops:[['-I','muestra sus direcciones IP']],cat:'Red'},function(x){var r=x.sis.red;x.out(x.args[1]==='-I'?(r.arriba&&r.ip?r.ip+' '+(r.ip6?r.ip6+' ':''):'')+'\n':x.sis.host+'\n')});
cmd('ss',{d:'muestra las conexiones y los puertos abiertos',uso:'ss -tulpn',ops:[['-t / -u','TCP / UDP'],['-l','solo los que esperan conexiones'],['-n','números en lugar de nombres'],['-p','qué programa (con sudo)']],cat:'Red'},function(x){
  var s=x.sis,f=(x.args.slice(1).join('')).replace(/-/g,''),conP=f.indexOf('p')>=0&&x.u==='root';
  var filas=[['Netid','State','Recv-Q','Send-Q','Local Address:Port','Peer Address:Port','Process']];
  var res=s.servicio('systemd-resolved');
  if(res&&res.activo)filas.push(['udp','UNCONN','0','0','127.0.0.53%lo:53','0.0.0.0:*',conP?'users:(("systemd-resolve",pid=590,fd=13))':'']);
  Object.keys(s.servicios).sort().forEach(function(k){
    var v=s.servicios[k];if(!v.activo)return;
    v.puertos.forEach(function(p){filas.push(['tcp','LISTEN','0',p===22?'4096':'511',(v.local?'127.0.0.1:':'0.0.0.0:')+p,'0.0.0.0:*',conP?'users:(("'+(v.nombreProc||k)+'",pid='+v.pid+',fd=3))':''])});
  });
  if(f.indexOf('t')>=0&&f.indexOf('u')<0)filas=filas.filter(function(r,i){return !i||r[0]==='tcp'});
  if(f.indexOf('u')>=0&&f.indexOf('t')<0)filas=filas.filter(function(r,i){return !i||r[0]==='udp'});
  x.out(tabla(filas));
  if(f.indexOf('p')>=0&&x.u!=='root')x.consejo('ss-p','para ver qué programa abrió cada puerto, usa sudo ss -tulpn.');
});
cmd('nc netcat',{d:'prueba si un puerto de otra computadora acepta conexiones',uso:'nc -zv equipo puerto',ops:[['-z','solo prueba, sin mandar datos'],['-v','dice qué pasó'],['-u','UDP en lugar de TCP']],cat:'Red'},function(x){
  var o=opts(x.args,'w'),s=x.sis,h=o.pos[0],ps=o.pos.slice(1);
  if(!h||!ps.length){x.err('usage: nc [-46CDdFhklNnrStUuvZz] [-I length] [-i interval] [-M ttl]\n\t  [-m minttl] [-O length] [-P proxy_username] [-p source_port]\n\t  [destination] [port]\n');return 1}
  var rs=s.resolver(h);
  if(rs.err){x.err('nc: getaddrinfo for host "'+h+'" port '+ps[0]+': '+(rs.err==='sin'?'Temporary failure in name resolution':'Name or service not known')+'\n');return 1}
  var ip=rs.ip,al=s.alcance(ip),cod=0;
  return ps.reduce(function(p,pt){return p.then(function(){
    var n=+pt,srv=PUERTOS[n]||'*',proto=o.f.u?'udp':'tcp';
    var est=!al.ok?(al.err==='timeout'?'filtrado':al.err==='red'?'red':'host'):al.sis?(o.f.u?'abierto':puertoEstado(al.sis,n,s.red.ip)):([80,443].indexOf(n)>=0?'abierto':'filtrado');
    var nom=h===ip?ip:h+' ('+ip+')';
    if(est==='abierto'){x.err('Connection to '+nom+' '+n+' port ['+proto+'/'+srv+'] succeeded!\n');return}
    cod=1;
    if(est==='cerrado'){x.err('nc: connect to '+nom+' port '+n+' ('+proto+') failed: Connection refused\n');return}
    if(est==='red'){x.err('nc: connect to '+nom+' port '+n+' ('+proto+') failed: Network is unreachable\n');return}
    if(est==='host'){x.err('nc: connect to '+nom+' port '+n+' ('+proto+') failed: No route to host\n');return}
    return x.esperar(1200).then(function(){x.err('nc: connect to '+nom+' port '+n+' ('+proto+') failed: Connection timed out\n')});
  })},Promise.resolve()).then(function(){return cod});
});

/* --- curl y los servidores web --- */
var HTTP_TXT={200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',405:'Method Not Allowed',409:'Conflict',418:"I'm a teapot",429:'Too Many Requests',500:'Internal Server Error',502:'Bad Gateway',503:'Service Unavailable',504:'Gateway Timeout'};
function paginaError(n,servidor){return '<html>\n<head><title>'+n+' '+HTTP_TXT[n]+'</title></head>\n<body>\n<center><h1>'+n+' '+HTTP_TXT[n]+'</h1></center>\n<hr><center>'+(servidor||'nginx/1.24.0 (Ubuntu)')+'</center>\n</body>\n</html>\n'}
function respuesta(estado,cuerpo,cab){var c2={};Object.keys(cab||{}).forEach(function(k){c2[k]=cab[k]});return {estado:estado,cab:c2,cuerpo:cuerpo==null?'':cuerpo}}
/* nginx: lee la configuración de /etc/nginx/sites-enabled y la revisa como nginx -t */
var NGINX_DIR=['server','listen','server_name','root','index','location','try_files','return','proxy_pass','proxy_set_header','include','error_page','access_log','error_log','add_header','ssl_certificate','ssl_certificate_key','client_max_body_size','rewrite','autoindex','gzip','charset','alias','deny','allow','expires','user','worker_processes','pid','events','worker_connections','http','sendfile','keepalive_timeout','types_hash_max_size','default_type','ssl_protocols','gzip_types','limit_req','tcp_nopush','proxy_http_version','proxy_read_timeout'];
var NGINX_BLOQUES=['server','location','http','events'];
var NGINX_ARGS={root:[1,1],alias:[1,1],listen:[1,9],server_name:[1,99],index:[1,99],try_files:[2,99],'return':[1,2],proxy_pass:[1,1],location:[1,2],server:[0,0],autoindex:[1,1],include:[1,1],access_log:[1,3],error_log:[1,2],client_max_body_size:[1,1]};
function nginxLeer(txt,archivo){
  var toks=[],ln=1,i=0,n=txt.length;
  while(i<n){
    var ch=txt[i];
    if(ch==='\n'){ln++;i++;continue}
    if(/\s/.test(ch)){i++;continue}
    if(ch==='#'){while(i<n&&txt[i]!=='\n')i++;continue}
    if(ch==='{'||ch==='}'||ch===';'){toks.push({v:ch,l:ln});i++;continue}
    if(ch==='"'||ch==="'"){var j=txt.indexOf(ch,i+1);if(j<0)j=n;toks.push({v:txt.slice(i+1,j),l:ln,q:true});i=j+1;continue}
    var w='';while(i<n&&!/[\s{};]/.test(txt[i]))w+=txt[i++];toks.push({v:w,l:ln});
  }
  var pila=[{hijos:[]}],cur=null;
  for(var k=0;k<toks.length;k++){
    var t=toks[k];
    if(!t.q&&t.v==='}'){
      if(cur)return {err:'directive "'+cur.nombre+'" is not terminated by ";" in '+archivo+':'+cur.l};
      if(pila.length<2)return {err:'unexpected "}" in '+archivo+':'+t.l};
      pila.pop();continue;
    }
    if(!t.q&&(t.v===';'||t.v==='{')){
      if(!cur)return {err:'unexpected "'+t.v+'" in '+archivo+':'+t.l};
      if(NGINX_DIR.indexOf(cur.nombre)<0)return {err:'unknown directive "'+cur.nombre+'" in '+archivo+':'+cur.l};
      var bloque=NGINX_BLOQUES.indexOf(cur.nombre)>=0;
      if(bloque&&t.v===';')return {err:'directive "'+cur.nombre+'" has no opening "{" in '+archivo+':'+t.l};
      if(!bloque&&t.v==='{')return {err:'directive "'+cur.nombre+'" is not terminated by ";" in '+archivo+':'+t.l};
      var na=NGINX_ARGS[cur.nombre];
      if(na&&(cur.args.length<na[0]||cur.args.length>na[1]))return {err:'invalid number of arguments in "'+cur.nombre+'" directive in '+archivo+':'+t.l};
      pila[pila.length-1].hijos.push(cur);
      if(t.v==='{'){cur.hijos=[];pila.push(cur)}
      cur=null;continue;
    }
    if(!cur)cur={nombre:t.v,args:[],l:t.l};else cur.args.push(t.v);
  }
  if(cur)return {err:'unexpected end of file, expecting ";" or "}" in '+archivo+':'+cur.l};
  if(pila.length>1)return {err:'unexpected end of file, expecting "}" in '+archivo+':'+ln};
  return {arbol:pila[0].hijos};
}
function nginxConfig(s){
  var dir=s.nodo('/etc/nginx/sites-enabled'),servidores=[],avisos=[];
  if(!dir||dir.t!=='d')return {conf:{servidores:[]}};
  var nombres=Object.keys(dir.h).sort();
  for(var i=0;i<nombres.length;i++){
    var ruta='/etc/nginx/sites-enabled/'+nombres[i],n=s.nodo(ruta);
    if(!n)return {err:'open() "'+ruta+'" failed (2: No such file or directory) in /etc/nginx/nginx.conf:60'};
    if(n.t!=='f')continue;
    var r=nginxLeer(s.contenido(n),ruta);
    if(r.err)return {err:r.err};
    for(var j=0;j<r.arbol.length;j++){
      var b=r.arbol[j];
      if(b.nombre!=='server'||!b.hijos)return {err:'"'+b.nombre+'" directive is not allowed here in '+ruta+':'+b.l};
      var sv={archivo:ruta,puertos:[],defecto:false,nombres:[],root:'/var/www/html',index:['index.html'],ubic:[],ret:null,l:b.l,dirs:b.hijos};
      b.hijos.forEach(function(d){
        if(d.nombre==='listen'){var p=parseInt(String(d.args[0]).replace(/^\[::\]:/,'').replace(/.*:/,''),10);if(!/\[::\]/.test(d.args[0])){sv.puertos.push(p);if(d.args.indexOf('default_server')>=0)sv.defecto=true}}
        else if(d.nombre==='server_name')sv.nombres=d.args;
        else if(d.nombre==='root')sv.root=d.args[0];
        else if(d.nombre==='index')sv.index=d.args;
        else if(d.nombre==='return')sv.ret=d.args;
        else if(d.nombre==='location'){var ex=d.args[0]==='=';sv.ubic.push({ruta:ex?d.args[1]:d.args[0],exacta:ex,dirs:d.hijos||[]})}
      });
      if(!sv.puertos.length)sv.puertos=[80];
      for(var k=0;k<servidores.length;k++){
        var o=servidores[k];
        if(sv.defecto&&o.defecto&&o.puertos.some(function(p){return sv.puertos.indexOf(p)>=0}))return {err:'a duplicate default server for 0.0.0.0:'+sv.puertos[0]+' in '+ruta+':'+b.l};
        sv.nombres.forEach(function(nm){if(nm!=='_'&&o.nombres.indexOf(nm)>=0)avisos.push('conflicting server name "'+nm+'" on 0.0.0.0:'+sv.puertos[0]+', ignored')});
      }
      servidores.push(sv);
    }
  }
  return {conf:{servidores:servidores},avisos:avisos};
}
function dirDe(dirs,nombre){for(var i=0;i<dirs.length;i++)if(dirs[i].nombre===nombre)return dirs[i];return null}
function logNginx(s,req,estado,tam){
  var d=new Date(),ac=s.nodo('/var/log/nginx/access.log');
  if(ac)ac.c+=(req.desde||'127.0.0.1')+' - - ['+dos(d.getDate())+'/'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+'/'+d.getFullYear()+':'+hora(d)+' -0600] "'+req.metodo+' '+req.ruta+' HTTP/1.1" '+estado+' '+tam+' "-" "curl/8.5.0"\n';
}
function nginxServir(s,v,req,puerto){
  var conf=v.conf||{servidores:[]},host=(req.cab.Host||'').replace(/:\d+$/,'');
  var cand=conf.servidores.filter(function(sv){return sv.puertos.indexOf(puerto)>=0});
  if(!cand.length)return null;
  var sv=cand.filter(function(c2){return c2.nombres.indexOf(host)>=0})[0]||cand.filter(function(c2){return c2.defecto})[0]||cand[0];
  var H={'Server':'nginx/1.24.0 (Ubuntu)'},ruta=req.ruta.replace(/\?.*$/,'');
  function fin(r){logNginx(s,req,r.estado,bytesDe(r.cuerpo));return r}
  function devolver(args){
    var n=+args[0],u=(args[1]||'').replace(/\$host/g,host).replace(/\$request_uri/g,req.ruta).replace(/\$uri/g,ruta);
    if(n>=300&&n<400){H.Location=u;H['Content-Type']='text/html';return fin(respuesta(n,paginaError(n),H))}
    H['Content-Type']='text/plain';return fin(respuesta(n,u?u+'\n':paginaError(n),H));
  }
  if(sv.ret)return devolver(sv.ret);
  var ub=null;
  sv.ubic.forEach(function(u){if(u.exacta?ruta===u.ruta:ruta.indexOf(u.ruta)===0){if(!ub||u.ruta.length>ub.ruta.length||u.exacta)ub=u}});
  var dirs=ub?ub.dirs:[],ret=dirDe(dirs,'return'),proxy=dirDe(dirs,'proxy_pass');
  if(ret)return devolver(ret.args);
  if(proxy){
    var m=String(proxy.args[0]).match(/^https?:\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/),pp=m?+(m[2]||80):0;
    var hecho=m&&s.red.web[pp]&&puertoEstado(s,pp,'127.0.0.1')==='abierto'?s.red.web[pp]({metodo:req.metodo,ruta:m[3]?ruta.replace(ub.ruta,m[3]):ruta,cab:req.cab,cuerpo:req.cuerpo},s):null;
    if(!hecho){var el=s.nodo('/var/log/nginx/error.log');if(el)el.c+=hora(new Date())+' [error] connect() failed (111: Connection refused) while connecting to upstream, upstream: "'+proxy.args[0]+'"\n';H['Content-Type']='text/html';return fin(respuesta(502,paginaError(502),H))}
    Object.keys(hecho.cab).forEach(function(k){if(k!=='Server')H[k]=hecho.cab[k]});
    return fin(respuesta(hecho.estado,hecho.cuerpo,H));
  }
  var root=(dirDe(dirs,'root')||{args:[sv.root]}).args[0].replace(/\/$/,''),index=(dirDe(dirs,'index')||{args:sv.index}).args;
  var archivo=null,prueba=root+ruta;
  var nodo=s.buscar(prueba,'www-data');
  if(nodo.err==='permiso'){H['Content-Type']='text/html';return fin(respuesta(403,paginaError(403),H))}
  if(nodo.n&&nodo.n.t==='d'){
    var base=prueba.replace(/\/$/,'');
    index.some(function(ix){var r2=s.buscar(base+'/'+ix,'www-data');if(r2.n&&r2.n.t==='f'){archivo=r2.n;return true}if(r2.err==='permiso'){archivo='403';return true}});
    if(!archivo)archivo='403';
  }else if(nodo.n&&nodo.n.t==='f')archivo=nodo.n;
  if(archivo==='403'||archivo&&!s.puede(archivo,'www-data','r')){H['Content-Type']='text/html';return fin(respuesta(403,paginaError(403),H))}
  if(!archivo){
    var el2=s.nodo('/var/log/nginx/error.log');if(el2)el2.c+=hora(new Date())+' [error] open() "'+prueba+'" failed (2: No such file or directory)\n';
    H['Content-Type']='text/html';return fin(respuesta(404,paginaError(404),H));
  }
  var cuerpo=s.contenido(archivo),ext=(ruta.match(/\.(\w+)$/)||[])[1];
  H['Content-Type']={css:'text/css',js:'application/javascript',json:'application/json',txt:'text/plain',png:'image/png',jpg:'image/jpeg'}[ext]||'text/html';
  H['Content-Length']=String(bytesDe(cuerpo));
  return fin(respuesta(200,cuerpo,H));
}
/* Atiende una petición HTTP en un sistema: nginx o un programa propio (s.red.web[puerto]) */
function servirHttp(dest,req,puerto){
  var v=dest.servicio('nginx');
  if(v&&v.activo&&dest.instalado('nginx')){var r=nginxServir(dest,v,req,puerto);if(r)return r}
  if(dest.red.web[puerto])return dest.red.web[puerto](req,dest);
  return null;
}
function paginaInternet(h){
  var cuerpo='<!doctype html>\n<html>\n<head><title>'+h+'</title></head>\n<body>\n<h1>'+h+'</h1>\n<p>Página de ejemplo de la terminal simulada de OneLearn.</p>\n</body>\n</html>\n';
  return respuesta(200,cuerpo,{'content-type':'text/html; charset=UTF-8','content-length':String(bytesDe(cuerpo))});
}
cmd('curl',{d:'hace peticiones a servidores web y muestra la respuesta',uso:'curl [opciones] dirección',ops:[['-I','solo los encabezados de la respuesta'],['-v','muestra la petición y la respuesta completas'],['-X POST','el método HTTP'],['-d datos','manda datos (y usa POST)'],['-H "Nombre: valor"','agrega un encabezado'],['-L','sigue las redirecciones'],['-o archivo','guarda lo que descargó']],cat:'Red'},function(x){
  var a=x.args.slice(1),o={v:false,I:false,s:false,L:false,i:false,X:null,d:null,H:[],out:null},url=null;
  for(var i=0;i<a.length;i++){
    var v=a[i];
    if(v==='-X'||v==='--request')o.X=a[++i];
    else if(v==='-d'||v==='--data'||v==='--data-raw')o.d=a[++i];
    else if(v==='-H'||v==='--header')o.H.push(a[++i]);
    else if(v==='-o'||v==='--output')o.out=a[++i];
    else if(v==='--head')o.I=true;else if(v==='--verbose')o.v=true;else if(v==='--silent')o.s=true;else if(v==='--location')o.L=true;else if(v==='--include')o.i=true;
    else if(v==='-4'||v==='-6')continue;
    else if(/^-[a-zA-Z]+$/.test(v))v.slice(1).split('').forEach(function(ch){if(ch==='v')o.v=true;else if(ch==='I')o.I=true;else if(ch==='s')o.s=true;else if(ch==='L')o.L=true;else if(ch==='i')o.i=true;else if(ch==='k')o.k=true});
    else url=v;
  }
  if(!url){x.err("curl: try 'curl --help' or 'curl --manual' for more information\n");return 2}
  var cab={};o.H.forEach(function(h){var k=h.indexOf(':');if(k>0)cab[h.slice(0,k).trim()]=h.slice(k+1).trim()});
  var metodo=o.X||(o.I?'HEAD':o.d!=null?'POST':'GET');
  if(o.d!=null&&!cab['Content-Type'])cab['Content-Type']='application/x-www-form-urlencoded';
  return pedirHttp(x,url,{metodo:metodo,cab:cab,cuerpo:o.d||''},o,0);
});
function pedirHttp(x,url,req,o,saltos){
  var s=x.sis,m=String(url).match(/^(?:(https?):\/\/)?([^\/:?#]+)(?::(\d+))?([^#]*)$/);
  if(!m){x.err('curl: (3) URL rejected: Bad hostname\n');return 3}
  var esq=m[1]||'http',h=m[2],puerto=+(m[3]||(esq==='https'?443:80)),ruta=m[4]||'/';
  if(ruta.charAt(0)!=='/')ruta='/'+ruta;
  var rs=s.resolver(h);
  if(rs.err){x.err('curl: (6) Could not resolve host: '+h+'\n');return 6}
  var ip=rs.ip,al=s.alcance(ip);
  if(o.v)x.err('*   Trying '+ip+':'+puerto+'...\n');
  if(al.err==='red'||al.err==='host'){x.err('curl: (7) Failed to connect to '+h+' port '+puerto+' after 3 ms: Couldn\'t connect to server\n');return 7}
  var hdr={};Object.keys(req.cab).forEach(function(k){hdr[k]=req.cab[k]});
  if(!hdr.Host)hdr.Host=h+(m[3]?':'+m[3]:'');
  var pet={metodo:req.metodo,ruta:ruta,cab:hdr,cuerpo:req.cuerpo,desde:s.red.ip,esquema:esq,host:h};
  var resp=null,dest=al.ok?al.sis:null;
  if(al.err==='timeout')return x.esperar(1500).then(function(){x.err('curl: (28) Failed to connect to '+h+' port '+puerto+' after 130005 ms: Timeout was reached\n');return 28});
  if(dest){
    var est=puertoEstado(dest,puerto,dest===s?'127.0.0.1':s.red.ip);
    if(est==='filtrado')return x.esperar(1500).then(function(){x.err('curl: (28) Failed to connect to '+h+' port '+puerto+' after 130005 ms: Timeout was reached\n');return 28});
    if(est==='cerrado'){x.err('curl: (7) Failed to connect to '+h+' port '+puerto+' after 0 ms: Couldn\'t connect to server\n');return 7}
    if(esq==='https'&&!(dest.red.tls&&dest.red.tls[puerto])){x.err('curl: (35) OpenSSL/3.0.13: error:0A00010B:SSL routines::wrong version number\n');return 35}
    resp=servirHttp(dest,pet,puerto);
    if(!resp){x.err('curl: (52) Empty reply from server\n');return 52}
  }else if(s.red.web[ip])resp=s.red.web[ip](pet,s);
  else{resp=paginaInternet(h);if(!s.red.dns[h])x.consejo('curl-sim','esta terminal simula internet: las páginas de otros sitios son de ejemplo.')}
  var lineaEst='HTTP/'+(dest?'1.1':'2')+' '+resp.estado+(dest?' '+(HTTP_TXT[resp.estado]||''):'');
  var cabTxt=Object.keys(resp.cab).map(function(k){return k+': '+resp.cab[k]}).join('\n');
  if(o.v){
    x.err('* Connected to '+h+' ('+ip+') port '+puerto+'\n> '+pet.metodo+' '+ruta+' HTTP/1.1\n> Host: '+hdr.Host+'\n> User-Agent: curl/8.5.0\n> Accept: */*\n'+
      Object.keys(req.cab).filter(function(k){return k!=='Host'}).map(function(k){return '> '+k+': '+req.cab[k]+'\n'}).join('')+(req.cuerpo?'> Content-Length: '+bytesDe(req.cuerpo)+'\n':'')+'>\n< '+lineaEst+'\n'+(cabTxt?cabTxt.split('\n').map(function(l){return '< '+l}).join('\n')+'\n':'')+'<\n');
  }
  if(o.L&&resp.estado>=300&&resp.estado<400&&(resp.cab.Location||resp.cab.location)&&saltos<5){
    var loc=resp.cab.Location||resp.cab.location;
    if(loc.charAt(0)==='/')loc=esq+'://'+h+(m[3]?':'+m[3]:'')+loc;
    return pedirHttp(x,loc,{metodo:pet.metodo==='POST'?'GET':pet.metodo,cab:req.cab,cuerpo:''},o,saltos+1);
  }
  if(o.I){x.out(lineaEst+'\n'+(cabTxt?cabTxt+'\n':'')+'\n');return 0}
  var cuerpo=pet.metodo==='HEAD'?'':resp.cuerpo;
  if(o.out){
    var e=s.escribir(x.abs(o.out),cuerpo,x.u,false);
    if(e){x.err('curl: (23) Failure writing output to destination\n');return 23}
    if(!o.s)x.err('  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n100   '+pad(bytesDe(cuerpo),4,true)+'  100   '+pad(bytesDe(cuerpo),4,true)+'    0     0   612k      0 --:--:-- --:--:-- --:--:--  612k\n');
    return 0;
  }
  x.out((o.i?lineaEst+'\n'+(cabTxt?cabTxt+'\n':'')+'\n':'')+cuerpo+(cuerpo&&!/\n$/.test(cuerpo)&&x.tty?'\n':''));
  return 0;
}
cmd('wget',{d:'descarga un archivo de internet',uso:'wget dirección',cat:'Red'},function(x){
  var url=x.args.filter(function(v,i){return i&&v.charAt(0)!=='-'})[0];
  if(!url){x.err('wget: falta el URL\n');return 1}
  var nombre=(url.replace(/[?#].*$/,'').split('/').slice(3).pop())||'index.html';
  return pedirHttp(x,url,{metodo:'GET',cab:{},cuerpo:''},{s:true,out:nombre},0).then(function(r){if(!r)x.err('Guardando en: «'+nombre+'»\n\n'+nombre+'           100%[===================>]       en 0s\n\n«'+nombre+'» guardado\n');return r?4:0});
});

/* --- Firewall (ufw) --- */
var UFW_APPS={'OpenSSH':[22],'Nginx HTTP':[80],'Nginx HTTPS':[443],'Nginx Full':[80,443]};
function ufwPuertos(spec){
  if(UFW_APPS[spec])return {p:UFW_APPS[spec].map(function(n){return {de:n,a:n}}),proto:'tcp',txt:spec};
  var m=String(spec).match(/^([\w:,]+)(?:\/(tcp|udp))?$/);if(!m)return null;
  var lista=[];
  if(!m[1].split(',').every(function(pt){
    if(NOMBRES_PUERTO[pt]!=null){lista.push({de:NOMBRES_PUERTO[pt],a:NOMBRES_PUERTO[pt]});return true}
    var r=pt.match(/^(\d+)(?::(\d+))?$/);if(!r)return false;lista.push({de:+r[1],a:+(r[2]||r[1])});return true;
  }))return null;
  return {p:lista,proto:m[2]||'',txt:spec};
}
function ufwPermite(s,puerto,origen){
  var u=s.ufw;if(!u.activo)return true;
  for(var i=0;i<u.reglas.length;i++){
    var r=u.reglas[i];
    if(r.desde!=='any'&&!dentro(origen,[r.desde]))continue;
    if(r.puertos&&!r.puertos.some(function(p){return puerto>=p.de&&puerto<=p.a}))continue;
    return r.acc!=='deny'&&r.acc!=='reject';
  }
  return u.entrada==='allow';
}
function ufwTo(r){return r.puertos?r.txt+(r.proto&&!UFW_APPS[r.txt]&&r.txt.indexOf('/')<0?'/'+r.proto:''):'Anywhere'}
cmd('ufw',{d:'el firewall de Ubuntu: decide qué conexiones entran',uso:'sudo ufw allow|deny|status|enable ...',ops:[['status','las reglas y si está activo'],['allow 22/tcp','deja entrar a un puerto'],['deny 80','bloquea un puerto'],['allow from 192.168.1.0/24','deja entrar a una red'],['enable / disable','enciende o apaga el firewall'],['delete 2','borra la regla número 2']],cat:'Red',sbin:true,paq:'ufw'},function(x){
  var s=x.sis,u=s.ufw,a=x.args.slice(1);
  if(x.u!=='root'){x.err('ERROR: You need to be root to run this script\n');x.consejo('ufw-sudo','el firewall se administra con sudo: sudo ufw status.');return 1}
  var acc=a[0];
  if(!acc||acc==='help'){x.out('Usage: ufw COMMAND\n\nCommands:\n enable\t\t\t\tenables the firewall\n disable\t\t\tdisables the firewall\n default ARG\t\t\tset default policy\n allow ARGS\t\t\tadd allow rule\n deny ARGS\t\t\tadd deny rule\n delete RULE|NUM\t\tdelete RULE\n status\t\t\t\tshow firewall status\n status numbered\t\tshow firewall status as numbered list of RULES\n status verbose\t\tshow verbose firewall status\n app list\t\t\tlist application profiles\n reset\t\t\t\treset firewall\n');return 0}
  if(acc==='status'){
    if(!u.activo){x.out('Status: inactive\n');return 0}
    var num=a[1]==='numbered',o='Status: active\n';
    if(a[1]==='verbose')o+='Logging: on (low)\nDefault: '+u.entrada+' (incoming), allow (outgoing), disabled (routed)\nNew profiles: skip\n';
    if(u.reglas.length){
      var w=26;
      o+='\n'+(num?'     ':'')+pad('To',w)+' '+pad(a[1]==='verbose'?'Action':'Action',11)+' From\n'+(num?'     ':'')+pad('--',w)+' '+pad('------',11)+' ----\n';
      u.reglas.forEach(function(r,i){o+=(num?'['+pad(i+1,2,true)+'] ':'')+pad(ufwTo(r),w)+' '+pad(r.acc.toUpperCase()+(num||a[1]==='verbose'?' IN':''),11)+' '+(r.desde==='any'?'Anywhere':r.desde)+'\n'});
      if(!num)u.reglas.filter(function(r){return r.desde==='any'}).forEach(function(r){o+=pad(ufwTo(r)+' (v6)',w)+' '+pad(r.acc.toUpperCase()+(a[1]==='verbose'?' IN':''),11)+' Anywhere (v6)\n'});
    }
    x.out(o+'\n');return 0;
  }
  if(acc==='enable'){
    if(u.activo){x.out('Firewall is active and enabled on system startup\n');return 0}
    return x.pedir('Command may disrupt existing ssh connections. Proceed with operation (y|n)? ').then(function(r){
      if(!/^[yYsS]/.test(r)){x.out('Aborted\n');return 1}
      u.activo=true;x.out('Firewall is active and enabled on system startup\n');
      if(!u.reglas.some(function(rg){return rg.acc!=='deny'&&rg.puertos&&rg.puertos.some(function(p){return 22>=p.de&&22<=p.a})}))x.consejo('ufw-ssh','activaste el firewall sin una regla para SSH (puerto 22). Si administras este servidor a distancia, ya nadie podrá entrar por SSH. Agrega sudo ufw allow OpenSSH.');
      return 0;
    });
  }
  if(acc==='disable'){u.activo=false;x.out('Firewall stopped and disabled on system startup\n');return 0}
  if(acc==='reset'){return x.pedir('Resetting all rules to installed defaults. Proceed with operation (y|n)? ').then(function(r){if(!/^[yYsS]/.test(r)){x.out('Aborted\n');return 1}u.activo=false;u.reglas=[];u.entrada='deny';x.out('Backing up \'user.rules\' to \'/etc/ufw/user.rules.20261118_103000\'\n');return 0})}
  if(acc==='default'){
    var pol=a[1],dir=a[2]||'incoming';
    if(['allow','deny','reject'].indexOf(pol)<0){x.err('ERROR: Unsupported default policy\n');return 1}
    if(dir==='incoming')u.entrada=pol==='allow'?'allow':'deny';
    x.out('Default '+dir+' policy changed to \''+pol+'\'\n(be sure to update your rules accordingly)\n');return 0;
  }
  if(acc==='app'&&a[1]==='list'){x.out('Available applications:\n'+Object.keys(UFW_APPS).filter(function(k){return k==='OpenSSH'||s.instalado('nginx')}).map(function(k){return '  '+k}).join('\n')+'\n');return 0}
  if(acc==='delete'){
    if(/^\d+$/.test(a[1]||'')){
      var k=+a[1]-1,rg=u.reglas[k];
      if(!rg){x.err('ERROR: Could not find rule \''+a[1]+'\'\n');return 1}
      return x.pedir('Deleting:\n '+rg.acc+' '+ufwTo(rg)+'\nProceed with operation (y|n)? ').then(function(r){if(!/^[yYsS]/.test(r)){x.out('Aborted\n');return 1}u.reglas.splice(k,1);x.out('Rule deleted\n');return 0});
    }
    var txt=a.slice(1).join(' '),antes=u.reglas.length;
    u.reglas=u.reglas.filter(function(r){return r.orig!==txt});
    if(antes===u.reglas.length){x.err('Could not delete non-existent rule\n');return 1}
    x.out('Rule deleted\nRule deleted (v6)\n');return 0;
  }
  var ins=null;
  if(acc==='insert'){ins=+a[1]-1;a=a.slice(2);acc=a[0]}
  if(['allow','deny','reject','limit'].indexOf(acc)<0){x.err('ERROR: Invalid syntax\n');return 1}
  var resto=a.slice(1).filter(function(v){return v!=='in'}),regla={acc:acc,desde:'any',puertos:null,proto:'',txt:'',orig:a.join(' ')};
  if(resto[0]==='from'||resto[0]==='proto'||resto[0]==='to'){
    for(var i=0;i<resto.length;i++){
      if(resto[i]==='from'){var d=resto[++i];regla.desde=d==='any'?'any':d}
      else if(resto[i]==='port'){var pp=ufwPuertos(resto[++i]);if(!pp){x.err('ERROR: Bad port\n');return 1}regla.puertos=pp.p;regla.txt=pp.txt}
      else if(resto[i]==='proto')regla.proto=resto[++i];
      else if(resto[i]==='to')i++;
    }
    if(regla.desde!=='any'&&!esIp(cidr(regla.desde).red)){x.err('ERROR: Bad source address\n');return 1}
    if(regla.puertos&&!regla.proto)regla.proto='';
  }else{
    var sp=ufwPuertos(resto[0]||'');
    if(!sp){x.err(resto[0]&&/^[A-Z]/.test(resto[0])?'ERROR: Could not find a profile matching \''+resto.join(' ')+'\'\n':'ERROR: Bad port\n');return 1}
    regla.puertos=sp.p;regla.proto=sp.proto;regla.txt=sp.txt;
  }
  if(!regla.txt&&regla.puertos)regla.txt=regla.puertos.map(function(p){return p.de===p.a?p.de:p.de+':'+p.a}).join(',');
  if(u.reglas.some(function(r){return r.orig===regla.orig||ufwTo(r)===ufwTo(regla)&&r.acc===regla.acc&&r.desde===regla.desde})){x.out('Skipping adding existing rule\n'+(regla.desde==='any'?'Skipping adding existing rule (v6)\n':''));return 0}
  if(ins!=null)u.reglas.splice(ins,0,regla);else u.reglas.push(regla);
  x.out(ins!=null?'Rule inserted\n':'Rule added\n'+(regla.desde==='any'?'Rule added (v6)\n':''));
  return 0;
});

/* --- SSH: llaves, conexión a otras computadoras y copia de archivos --- */
function azar(n,alf){alf=alf||'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';var o='';for(var i=0;i<n;i++)o+=alf.charAt(Math.floor(Math.random()*alf.length));return o}
function huella(pub){var h=2166136261;for(var i=0;i<pub.length;i++){h^=pub.charCodeAt(i);h=Math.imul(h,16777619)}var o='';for(var k=0;k<43;k++){h^=h<<13;h^=h>>>17;h^=h<<5;o+='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charAt((h>>>0)%64)}return 'SHA256:'+o}
function sshdConf(s){
  var n=s.nodo('/etc/ssh/sshd_config'),t=n?s.contenido(n):'',c2={password:true,root:'prohibit-password',puerto:22,pubkey:true};
  var dd=s.nodo('/etc/ssh/sshd_config.d');
  if(dd&&dd.t==='d')Object.keys(dd.h).sort().forEach(function(k){if(dd.h[k].t==='f')t=s.contenido(dd.h[k])+'\n'+t});
  var vistos={};
  t.split('\n').forEach(function(l){
    l=l.replace(/#.*/,'').trim();if(!l)return;var p=l.split(/\s+/),k=p[0].toLowerCase(),v=(p[1]||'').toLowerCase();
    if(vistos[k])return;vistos[k]=1;
    if(k==='passwordauthentication')c2.password=v==='yes';
    else if(k==='permitrootlogin')c2.root=v;
    else if(k==='port')c2.puerto=+v||22;
    else if(k==='pubkeyauthentication')c2.pubkey=v!=='no';
  });
  return c2;
}
function llavesDe(s,u){
  var home=s.home(u),out=[];
  ['id_ed25519','id_rsa','id_ecdsa'].forEach(function(n){var priv=s.nodo(home+'/.ssh/'+n);if(priv&&priv.t==='f'){var pub=priv.llave?priv.llave.pub:(s.leer(home+'/.ssh/'+n+'.pub')||'').trim();out.push({ruta:home+'/.ssh/'+n,pub:pub,frase:priv.llave?priv.llave.frase:'',nodo:priv})}});
  return out;
}
function conectarSsh(x,destTxt,opciones){
  /* Resuelve, revisa el camino, el puerto, la huella del servidor y la autenticación. Promesa de {dest, usuario} o un código de error */
  var s=x.sis,t=x.t,m=String(destTxt).match(/^(?:([^@]+)@)?(.+)$/),usuario=m[1]||x.u,h=m[2],puerto=opciones.puerto||22;
  var rs=s.resolver(h);
  if(rs.err){x.err('ssh: Could not resolve hostname '+h+': '+(rs.err==='sin'?'Temporary failure in name resolution':'Name or service not known')+'\n');return Promise.resolve(255)}
  var ip=rs.ip,al=s.alcance(ip);
  if(al.err==='red'){x.err('ssh: connect to host '+h+' port '+puerto+': Network is unreachable\n');return Promise.resolve(255)}
  if(al.err==='host'){x.err('ssh: connect to host '+h+' port '+puerto+': No route to host\n');return Promise.resolve(255)}
  var dest=al.ok?al.sis:null;
  if(!dest||al.err)return x.esperar(1500).then(function(){x.err('ssh: connect to host '+h+' port '+puerto+': Connection timed out\n');return 255});
  var v=dest.servicio('ssh'),conf=v&&v.conf||sshdConf(dest);
  var est=puertoEstado(dest,puerto,s.red.ip);
  if(est==='abierto'&&conf.puerto!==puerto)est='cerrado';
  if(est==='filtrado')return x.esperar(1500).then(function(){x.err('ssh: connect to host '+h+' port '+puerto+': Connection timed out\n');x.consejo('ssh-timeout','el servidor no contesta en ese puerto: un firewall lo está bloqueando, o el servidor está apagado.');return 255});
  if(est!=='abierto'){x.err('ssh: connect to host '+h+' port '+puerto+': Connection refused\n');return Promise.resolve(255)}
  var home=s.home(x.u),kh=s.leer(home+'/.ssh/known_hosts')||'',fp=huella(dest.host+dest.red.ip);
  var paso=Promise.resolve();
  if(kh.indexOf(h+' ')<0&&kh.indexOf(ip+' ')<0){
    paso=t.pedir("The authenticity of host '"+h+' ('+ip+")' can't be established.\nED25519 key fingerprint is "+fp+".\nThis key is not known by any other names.\nAre you sure you want to continue connecting (yes/no/[fingerprint])? ").then(function(r){
      if(r!=='yes'&&r!==fp){if(/^(y|s)/i.test(r))x.err('Please type \'yes\', \'no\' or the fingerprint: \n');x.err('Host key verification failed.\n');throw 255}
      if(!s.nodo(home+'/.ssh'))s.poner(home+'/.ssh/',null,{u:x.u,g:s.grupoPrin(x.u),modo:0o700,f:new Date()});
      s.escribir(home+'/.ssh/known_hosts',h+' ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI'+azar(43)+'\n',x.u,true);
      x.err("Warning: Permanently added '"+h+"' (ED25519) to the list of known hosts.\n");
    });
  }
  var udest=dest.usuarios[usuario],auth=dest.nodo('/var/log/auth.log'),ahora=new Date();
  function logAuth(txt){if(auth)auth.c+=fechaLog(ahora)+' '+dest.host+' sshd[2420]: '+txt+'\n'}
  return paso.then(function(){
    /* Llave pública: tiene que estar en authorized_keys, y la carpeta y el archivo no pueden ser escribibles por otros */
    if(conf.pubkey&&udest&&!(usuario==='root'&&conf.root==='no')){
      var ak=dest.nodo(udest.home+'/.ssh/authorized_keys'),sshd=dest.nodo(udest.home+'/.ssh'),seguro=ak&&sshd&&!(ak.modo&0o022)&&!(sshd.modo&0o022);
      var txtAk=ak?dest.contenido(ak):'',ll=llavesDe(s,x.u).filter(function(k){return k.pub&&txtAk.indexOf(k.pub.split(' ').slice(0,2).join(' '))>=0});
      if(ll.length&&!seguro)logAuth('Authentication refused: bad ownership or modes for file '+udest.home+'/.ssh/authorized_keys');
      if(ll.length&&seguro){
        var k=ll[0];
        var frase=k.frase?t.pedir("Enter passphrase for key '"+k.ruta+"': ",true).then(function(f){if(f!==k.frase){throw 'mal'}}):Promise.resolve();
        return frase.then(function(){logAuth('Accepted publickey for '+usuario+' from '+s.red.ip+' port 52311 ssh2: ED25519 '+huella(k.pub));return {dest:dest,usuario:usuario,llave:true}},function(e){if(e==='cancelado')throw e;x.err('Load key "'+k.ruta+'": incorrect passphrase supplied to decrypt private key\n');return intentarClave()});
      }
    }
    return intentarClave();
  }).catch(function(e){if(e===255)return 255;throw e});
  function intentarClave(){
    var permitida=conf.password&&!(usuario==='root'&&conf.root!=='yes');
    if(!permitida){logAuth('Connection closed by authenticating user '+usuario+' '+s.red.ip+' port 52311 [preauth]');x.err(usuario+'@'+h+': Permission denied (publickey).\n');if(!llavesDe(s,x.u).length)x.consejo('ssh-llave','el servidor solo acepta llaves. Crea la tuya con ssh-keygen y pide a quien administra el servidor que la agregue (o cópiala con ssh-copy-id mientras las contraseñas sigan permitidas).');return 255}
    var n=0;
    function una(){
      return t.pedir(usuario+'@'+h+"'s password: ",true).then(function(v2){
        if(udest&&udest.clave&&v2===udest.clave){logAuth('Accepted password for '+usuario+' from '+s.red.ip+' port 52311 ssh2');return {dest:dest,usuario:usuario}}
        logAuth('Failed password for '+(udest?'':'invalid user ')+usuario+' from '+s.red.ip+' port 52311 ssh2');
        n++;
        if(n>=3){x.err(usuario+'@'+h+': Permission denied (publickey,password).\n');return 255}
        x.err('Permission denied, please try again.\n');return una();
      });
    }
    return una();
  }
}
cmd('ssh',{d:'entra a otra computadora por la red, de forma cifrada',uso:'ssh usuario@equipo [comando]',ops:[['-p 2222','otro puerto'],['-i llave','usa una llave en particular']],cat:'Red'},function(x){
  var o=opts(x.args,'pil'),destTxt=o.pos[0],t=x.t;
  if(!destTxt){x.err('usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface] [-b bind_address]\n           [-c cipher_spec] [-D [bind_address:]port] [-E log_file]\n           destination [command [argument ...]]\n');return 255}
  if(o.val.l&&destTxt.indexOf('@')<0)destTxt=o.val.l+'@'+destTxt;
  return conectarSsh(x,destTxt,{puerto:o.val.p?+o.val.p:22}).then(function(r){
    if(typeof r==='number')return r;
    var d=r.dest,u=d.usuarios[r.usuario],cmdRemoto=o.pos.slice(1).join(' ');
    if(cmdRemoto){
      var previo=t.sis;t.sis=d;t.pila.push({u:r.usuario,cwd:u.home,vars:{},pid:d.sigPid++,sisPrevio:previo,remoto:true});
      var cap=x.tty?null:{buf:''};
      return t.correrTexto(cmdRemoto,cap).then(function(c2){t.pila.pop();t.sis=previo;if(cap)x.out(cap.buf);return c2},function(e){t.pila.pop();t.sis=previo;throw e});
    }
    var ult=d.ultimoLogin;
    x.out('Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-49-generic x86_64)\n\n * Documentation:  https://help.ubuntu.com\n * Management:     https://landscape.canonical.com\n\n'+(ult?'Last login: '+DIAS[ult.getDay()]+' '+MESES[ult.getMonth()]+' '+dos(ult.getDate())+' '+hora(ult)+' 2026 from '+x.sis.red.ip+'\n':''));
    d.ultimoLogin=new Date();
    var previo2=t.sis;
    t.pila.push({u:r.usuario,cwd:u.home,vars:{},pid:d.proc({cmd:'-bash',nombre:'bash',u:r.usuario,stat:'Ss'}).pid,sisPrevio:previo2,remoto:true,host:d.host});
    t.sis=d;
    return 0;
  });
});
cmd('ssh-keygen',{d:'crea un par de llaves para SSH (pública y privada)',uso:'ssh-keygen [-t ed25519] [-C comentario]',ops:[['-t ed25519','el tipo de llave (la recomendada)'],['-C "texto"','un comentario, como tu correo'],['-f archivo','dónde guardarla']],cat:'Red'},function(x){
  var o=opts(x.args,'tCfNb'),s=x.sis,t=x.t,tipo=(o.val.t||'ed25519').toLowerCase(),home=s.home(x.u);
  if(['ed25519','rsa','ecdsa'].indexOf(tipo)<0){x.err('unknown key type '+tipo+'\n');return 1}
  var def=home+'/.ssh/id_'+tipo,ruta=null,frase='';
  x.out('Generating public/private '+tipo+' key pair.\n');
  var paso=o.val.f?Promise.resolve(o.val.f):t.pedir('Enter file in which to save the key ('+def+'): ');
  return paso.then(function(f){
    ruta=x.abs(f||def);
    if(s.nodo(ruta))return t.pedir(ruta+' already exists.\nOverwrite (y/n)? ').then(function(r){if(!/^[yYsS]/.test(r))throw 1});
  }).then(function(){
    if(o.val.N!=null)return o.val.N;
    return t.pedir('Enter passphrase for "'+ruta+'" (empty for no passphrase): ',true).then(function(a){return t.pedir('Enter same passphrase again: ',true).then(function(b){if(a!==b){x.err('Passphrases do not match.  Try again.\n');throw 1}return a})});
  }).then(function(f){
    frase=f;
    var dir=dirname(ruta);
    if(!s.nodo(dir)){var e0=s.mkdir(dir,x.u,true);if(e0){x.err('Saving key "'+ruta+'" failed: '+e0+'\n');return 1}if(dir===home+'/.ssh'){s.nodo(dir).modo=0o700;x.out('Created directory \''+dir+'\'.\n')}}
    var com=o.val.C!=null?o.val.C:x.u+'@'+s.host;
    var pub=(tipo==='ed25519'?'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI':tipo==='rsa'?'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ':'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAI')+azar(tipo==='rsa'?120:43)+(com?' '+com:'');
    var e=s.escribir(ruta,'-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA'+azar(46)+'\n'+azar(70)+'\n'+azar(70)+'\n'+azar(36)+'\n-----END OPENSSH PRIVATE KEY-----\n',x.u,false);
    if(e){x.err('Saving key "'+ruta+'" failed: '+e+'\n');return 1}
    var priv=s.nodo(ruta);priv.modo=0o600;priv.llave={pub:pub,frase:frase};
    s.escribir(ruta+'.pub',pub+'\n',x.u,false);s.nodo(ruta+'.pub').modo=0o644;
    var fp=huella(pub),arte=['|      .o+*=.     |','|     . =+B..     |','|      +.O.+ .    |','|     . * O.o     |','|      . S =      |','|       o = .     |','|      . + o      |','|       E.o .     |','|        oo.      |'];
    x.out('Your identification has been saved in '+ruta+'\nYour public key has been saved in '+ruta+'.pub\nThe key fingerprint is:\n'+fp+(com?' '+com:'')+"\nThe key's randomart image is:\n+--["+tipo.toUpperCase()+' '+(tipo==='rsa'?3072:256)+']'+(tipo==='rsa'?'----':'--')+'+\n'+arte.join('\n')+'\n+----[SHA256]-----+\n');
    x.consejo('ssh-keygen','tienes dos archivos: la llave privada ('+basename(ruta)+'), que nunca se comparte, y la pública ('+basename(ruta)+'.pub), que se copia a los servidores.');
    return 0;
  }).catch(function(e){if(e===1)return 1;throw e});
});
cmd('ssh-copy-id',{d:'copia tu llave pública a un servidor para entrar sin contraseña',uso:'ssh-copy-id usuario@equipo',cat:'Red'},function(x){
  var o=opts(x.args,'ip'),s=x.sis,dt=o.pos[0];
  if(!dt){x.err('Usage: /usr/bin/ssh-copy-id [-h|-?|-f|-n|-s|-x] [-i [identity_file]] [-p port] [-F alternative ssh_config file] [-t target_path] [[-o <ssh -o options>] ...] [user@]hostname\n');return 1}
  var ll=o.val.i?[{pub:(s.leer(x.abs(o.val.i.replace(/\.pub$/,'')+'.pub'))||'').trim(),ruta:x.abs(o.val.i)}]:llavesDe(s,x.u);
  if(!ll.length||!ll[0].pub){x.err('/usr/bin/ssh-copy-id: ERROR: No identities found\n');x.consejo('ssh-copy-id','primero crea tu par de llaves con ssh-keygen.');return 1}
  var k=ll[0];
  x.err('/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "'+k.ruta.replace(/(\.pub)?$/,'.pub')+'"\n/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed\n');
  return conectarSsh(x,dt,{puerto:o.val.p?+o.val.p:22}).then(function(r){
    if(typeof r==='number')return r;
    if(r.llave){x.err('\n/usr/bin/ssh-copy-id: WARNING: All keys were skipped because they already exist on the remote system.\n\t\t(if you think this is a mistake, you may want to use -f option)\n\n');return 0}
    var d=r.dest,u=d.usuarios[r.usuario],dir=u.home+'/.ssh';
    if(!d.nodo(dir))d.poner(dir+'/',null,{u:r.usuario,g:d.grupoPrin(r.usuario),modo:0o700,f:new Date()});
    if(!d.nodo(dir+'/authorized_keys'))d.poner(dir+'/authorized_keys','',{u:r.usuario,g:d.grupoPrin(r.usuario),modo:0o600,f:new Date()});
    d.nodo(dir+'/authorized_keys').c+=k.pub+'\n';
    x.out('\nNumber of key(s) added: 1\n\nNow try logging into the machine, with:   "ssh \''+dt+'\'"\nand check to make sure that only the key(s) you wanted were added.\n\n');
    return 0;
  });
});
cmd('scp',{d:'copia archivos a otra computadora (o desde ella) por SSH',uso:'scp archivo usuario@equipo:carpeta',cat:'Red'},function(x){
  var o=opts(x.args,'Pi'),s=x.sis,ps=o.pos;
  if(ps.length<2){x.err('usage: scp [-346ABCOpqRrsTv] [-c cipher] [-D sftp_server_path] [-F ssh_config]\n           [-i identity_file] [-J destination] [-l limit] [-o ssh_option]\n           [-P port] [-S program] [-X sftp_option] source ... target\n');return 1}
  var dest=ps[ps.length-1],orig=ps[0],remD=dest.match(/^([^:]+):(.*)$/),remO=orig.match(/^([^:]+):(.*)$/);
  if(!remD&&!remO){return CMD.cp.fn(x)}
  var rem=remD||remO;
  return conectarSsh(x,rem[1],{puerto:o.val.P?+o.val.P:22}).then(function(r){
    if(typeof r==='number')return r;
    var d=r.dest,home=d.usuarios[r.usuario].home;
    function absR(p){return d.abs(p||'.',home,home)}
    if(remD){
      var lr=leer(x,orig,'scp');if(lr.e){x.err(lr.e.replace(/^scp: /,'scp: ')+'\n');return 1}
      var ab=absR(remD[2]),tn=d.buscar(ab,r.usuario);if(tn.n&&tn.n.t==='d')ab=unir(ab,basename(x.abs(orig)));
      var e=d.escribir(ab,lr.t,r.usuario,false);if(e){x.err('scp: dest open "'+ab+'": '+(e==='Permiso denegado'?'Permission denied':e)+'\nscp: failed to upload file '+orig+' to '+remD[2]+'\n');return 1}
      x.out(pad(basename(x.abs(orig)),40)+' 100%  '+pad(bytesDe(lr.t),5,true)+'    85.2KB/s   00:00\n');return 0;
    }
    var abO=absR(remO[2]),nd=d.buscar(abO,r.usuario);
    if(!nd.n||nd.n.t!=='f'||!d.puede(nd.n,r.usuario,'r')){x.err('scp: '+abO+': '+(nd.n?'Permission denied':'No such file or directory')+'\n');return 1}
    var abL=x.abs(dest),tl=s.buscar(abL,x.u);if(tl.n&&tl.n.t==='d')abL=unir(abL,basename(abO));
    var e2=s.escribir(abL,d.contenido(nd.n),x.u,false);if(e2){x.err('scp: '+dest+': '+e2+'\n');return 1}
    x.out(pad(basename(abO),40)+' 100%  '+pad(bytesDe(d.contenido(nd.n)),5,true)+'    85.2KB/s   00:00\n');return 0;
  });
});

/* --- Scripts: sentencias, if, for, while --- */
/* Divide un texto en sentencias: por líneas y por «;», sin partir dentro de comillas ni de $(...) */
function sentencias(texto){
  var out=[],cur='',q=null,prof=0;
  function push(s2){
    s2=s2.trim();if(!s2)return;
    var m=s2.match(/^(then|do|else)\s+([\s\S]+)$/);
    if(m){out.push(m[1]);push(m[2])}else out.push(s2);
  }
  for(var i=0;i<texto.length;i++){
    var ch=texto[i];
    if(q){cur+=ch;if(ch==='\\'&&q==='"'&&i+1<texto.length){cur+=texto[++i];continue}if(ch===q)q=null;continue}
    if(ch==='\\'&&i+1<texto.length){if(texto[i+1]==='\n'){i++;continue}cur+=ch+texto[++i];continue}
    if(ch==="'"||ch==='"'){q=ch;cur+=ch;continue}
    if(ch==='$'&&texto[i+1]==='('){prof++;cur+='$(';i++;continue}
    if(prof&&ch==='('){prof++;cur+=ch;continue}
    if(prof&&ch===')'){prof--;cur+=ch;continue}
    if(ch==='#'&&!prof&&(cur===''||/\s$/.test(cur))){while(i<texto.length&&texto[i]!=='\n')i++;i--;continue}
    if(!prof&&(ch==='\n'||ch===';'&&texto[i+1]!==';')){push(cur);cur='';continue}
    cur+=ch;
  }
  push(cur);
  return out;
}
var CLAVES=['then','fi','do','done','else','elif'];
function arbol(st,i,fin){
  var nodos=[];
  function hasta(palabra){var c2=[];while(i<st.length&&st[i]!==palabra){c2.push(st[i]);i++}if(i>=st.length)throw 'error de sintaxis: falta «'+palabra+'»';i++;return c2}
  while(i<st.length){
    var s2=st[i],k=s2.split(/\s+/)[0];
    if(fin&&fin.indexOf(k)>=0&&(k===s2||k==='elif'))return {nodos:nodos,i:i};
    if(!fin&&CLAVES.indexOf(k)>=0&&(k===s2||k==='elif'))throw 'error de sintaxis cerca del elemento inesperado «'+k+'»';
    if(k==='if'){
      var n={tipo:'if',ramas:[],sino:null},cond=[s2.replace(/^if\s+/,'')];i++;
      cond=cond.concat(hasta('then'));
      var r=arbol(st,i,['elif','else','fi']);n.ramas.push({cond:cond,cuerpo:r.nodos});i=r.i;
      while(i<st.length&&/^elif\b/.test(st[i])){cond=[st[i].replace(/^elif\s+/,'')];i++;cond=cond.concat(hasta('then'));r=arbol(st,i,['elif','else','fi']);n.ramas.push({cond:cond,cuerpo:r.nodos});i=r.i}
      if(st[i]==='else'){i++;r=arbol(st,i,['fi']);n.sino=r.nodos;i=r.i}
      if(st[i]!=='fi')throw 'error de sintaxis: falta «fi»';
      i++;nodos.push(n);continue;
    }
    if(k==='for'){
      var m=s2.match(/^for\s+([A-Za-z_]\w*)(?:\s+in\s+([\s\S]*))?$/);
      if(!m)throw 'error de sintaxis cerca de «'+s2+'»';
      i++;if(st[i]!=='do')throw 'error de sintaxis: falta «do»';i++;
      var r2=arbol(st,i,['done']);if(st[r2.i]!=='done')throw 'error de sintaxis: falta «done»';
      nodos.push({tipo:'for',v:m[1],lista:m[2]==null?'"$@"':m[2],cuerpo:r2.nodos});i=r2.i+1;continue;
    }
    if(k==='while'||k==='until'){
      var c3=[s2.replace(/^(while|until)\s+/,'')];i++;c3=c3.concat(hasta('do'));
      var r3=arbol(st,i,['done']);if(st[r3.i]!=='done')throw 'error de sintaxis: falta «done»';
      nodos.push({tipo:'while',hasta:k==='until',cond:c3,cuerpo:r3.nodos});i=r3.i+1;continue;
    }
    nodos.push(s2);i++;
  }
  if(fin)throw 'error de sintaxis: falta «'+fin[fin.length-1]+'»';
  return {nodos:nodos,i:i};
}
T.correrTexto=function(texto,captura){
  var t=this,a;
  try{a=arbol(sentencias(texto),0)}catch(e){t.escribir(c('e','bash: '+e)+'\n');return Promise.resolve(2)}
  return t.correrNodos(a.nodos,captura);
};
T.correrNodos=function(nodos,captura){
  var t=this,cod=0;
  function lista(ls){return ls.reduce(function(p,l){return p.then(function(){return t.correrLinea(l,captura).then(function(c2){cod=c2;return c2})})},Promise.resolve(0))}
  return nodos.reduce(function(p,n){return p.then(function(){
    if(t.cancelado)throw 'cancelado';
    if(typeof n==='string'){
      var m=n.match(/^exit(?:\s+(\d+))?\s*$/);
      if(m&&t.frame().script)throw {salir:+(m[1]==null?t.codigo:m[1])};
      return t.correrLinea(n,captura).then(function(c2){cod=c2});
    }
    if(n.tipo==='if'){
      var k=0;
      function rama(){
        if(k>=n.ramas.length)return n.sino?t.correrNodos(n.sino,captura).then(function(c2){cod=c2}):(cod=0,undefined);
        var rm=n.ramas[k++];
        return lista(rm.cond).then(function(c2){if(c2===0)return t.correrNodos(rm.cuerpo,captura).then(function(c3){cod=c3});return rama()});
      }
      return rama();
    }
    if(n.tipo==='for'){
      var toks=lex(n.lista).filter(function(x2){return x2.tipo==='p'});
      return t.expandir(toks).then(function(items){
        return items.reduce(function(p2,it){return p2.then(function(){if(t.cancelado)throw 'cancelado';t.frame().vars[n.v]=it;return t.correrNodos(n.cuerpo,captura).then(function(c2){cod=c2})})},Promise.resolve());
      });
    }
    if(n.tipo==='while'){
      var vueltas=0;
      function otra(){
        if(++vueltas>500){t.escribir(c('h','(OneLearn: el ciclo dio más de 500 vueltas y se detuvo.)')+'\n');return}
        return lista(n.cond).then(function(c2){if((c2===0)!==n.hasta)return t.correrNodos(n.cuerpo,captura).then(function(c3){cod=c3;return otra()})});
      }
      return otra();
    }
  })},Promise.resolve()).then(function(){return cod});
};
/* Aritmética de bash: $(( a + 1 )) */
function aritmetica(expr,t){
  var e=String(expr).replace(/\$?\{?([A-Za-z_]\w*)\}?/g,function(m,n){var v=t.variable(n);return String(parseInt(v,10)||0)});
  if(!/^[\d\s+\-*\/%()<>=!&|]*$/.test(e))return '0';
  try{return String(Math.trunc(Function('"use strict";return ('+(e.trim()||'0')+')')())|0)}catch(err){return '0'}
}

cmd('test [',{d:'compara valores o revisa archivos (se usa en if)',uso:'[ -f archivo ] · [ "$a" = "b" ] · [ $n -gt 5 ]',ops:[['-f / -d / -e','existe como archivo, carpeta o lo que sea'],['-z texto','el texto está vacío'],['= y !=','textos iguales o distintos'],['-eq -ne -lt -le -gt -ge','comparan números']],cat:'La terminal'},function(x){
  var a=x.args.slice(1);
  if(x.args[0]==='['){if(a[a.length-1]!==']'){x.err('bash: [: falta «]»\n');return 2}a=a.slice(0,-1)}
  function evaluar(a2){
    if(!a2.length)return false;
    if(a2[0]==='!')return !evaluar(a2.slice(1));
    var o=a2.indexOf('-a');if(o>0)return evaluar(a2.slice(0,o))&&evaluar(a2.slice(o+1));
    o=a2.indexOf('-o');if(o>0)return evaluar(a2.slice(0,o))||evaluar(a2.slice(o+1));
    if(a2.length===1)return a2[0]!=='';
    if(a2.length===2){
      var op=a2[0],v=a2[1],r=x.buscar(v);
      if(op==='-z')return v==='';
      if(op==='-n')return v!=='';
      if(op==='-e')return !!r.n;
      if(op==='-f')return !!r.n&&r.n.t==='f';
      if(op==='-d')return !!r.n&&r.n.t==='d';
      if(op==='-s')return !!r.n&&x.sis.tam(r.n)>0&&r.n.t==='f';
      if(op==='-r'||op==='-w'||op==='-x')return !!r.n&&x.sis.puede(r.n,x.u,op.charAt(1));
      if(op==='-L'||op==='-h'){var r2=x.buscar(v,true);return !!r2.n&&r2.n.t==='l'}
      throw 'se esperaba un operador unario';
    }
    var A2=a2[0],op2=a2[1],B=a2[2];
    if(op2==='='||op2==='==')return A2===B;
    if(op2==='!=')return A2!==B;
    var NUM={'-eq':function(p,q){return p===q},'-ne':function(p,q){return p!==q},'-lt':function(p,q){return p<q},'-le':function(p,q){return p<=q},'-gt':function(p,q){return p>q},'-ge':function(p,q){return p>=q}};
    if(NUM[op2]){
      if(!/^-?\d+$/.test(A2)||!/^-?\d+$/.test(B))throw (/^-?\d+$/.test(A2)?B:A2)+': se esperaba una expresión entera';
      return NUM[op2](+A2,+B);
    }
    throw 'se esperaba un operador binario';
  }
  try{return evaluar(a)?0:1}catch(e){x.err('bash: '+x.args[0]+': '+e+'\n');return 2}
});
cmd('true',{d:'no hace nada y termina bien',cat:'La terminal'},function(){return 0});
cmd('false',{d:'no hace nada y termina con error',cat:'La terminal'},function(){return 1});
cmd('read',{d:'lee lo que escribes y lo guarda en una variable',uso:'read [-p "Pregunta: "] variable',cat:'La terminal',interna:true},function(x){
  var o=opts(x.args,'p'),vars=o.pos.length?o.pos:['REPLY'],fr=x.t.frame();
  if(x.entrada!=null){var l=x.entrada.split('\n')[0].split(/\s+/);vars.forEach(function(v,i){fr.vars[v]=i===vars.length-1?l.slice(i).join(' '):l[i]||''});return 0}
  return x.pedir(o.val.p||'',o.f.s).then(function(r){var p=r.trim().split(/\s+/);vars.forEach(function(v,i){fr.vars[v]=i===vars.length-1?p.slice(i).join(' '):p[i]||''});return 0});
});
cmd('seq',{d:'escribe una serie de números',uso:'seq [inicio] fin',cat:'Ver y buscar texto'},function(x){
  var a=x.args.slice(1).map(Number),ini=a.length>1?a[0]:1,fin=a[a.length-1],paso=a.length>2?a[1]:1,o=[];
  if(a.some(isNaN)||!a.length){x.err('seq: falta un operando\n');return 1}
  if(a.length>2){fin=a[2]}
  for(var v=ini;paso>0?v<=fin:v>=fin;v+=paso){o.push(v);if(o.length>1000)break}
  x.out(o.join('\n')+(o.length?'\n':''));
});
cmd('printf',{d:'escribe un texto con formato',uso:'printf "%s: %d\\n" nombre 5',cat:'Ver y buscar texto'},function(x){
  var f=x.args[1]||'',args=x.args.slice(2),i=0,out='';
  do{out+=f.replace(/%([-0-9.]*)([sdif%])/g,function(m,w,t2){if(t2==='%')return '%';var v=args[i++];if(v==null)v=t2==='s'?'':'0';if(t2==='d'||t2==='i')v=String(parseInt(v,10)||0);if(t2==='f')v=(parseFloat(v)||0).toFixed(/\.(\d+)/.test(w)?+w.split('.')[1]:6);var n=parseInt(w,10);return n?pad(v,Math.abs(n),n>0):v}).replace(/\\n/g,'\n').replace(/\\t/g,'\t')}while(i<args.length&&/%[sdif]/.test(f));
  x.out(out);
});
cmd('basename',{d:'el nombre de un archivo sin su carpeta',uso:'basename ruta [extensión]',cat:'Archivos y carpetas'},function(x){var b=basename(x.args[1]||'');if(x.args[2]&&b.slice(-x.args[2].length)===x.args[2])b=b.slice(0,-x.args[2].length);x.out(b+'\n')});
cmd('dirname',{d:'la carpeta de una ruta',uso:'dirname ruta',cat:'Archivos y carpetas'},function(x){var p=x.args[1]||'.';x.out((p.indexOf('/')<0?'.':dirname(p.replace(/\/+$/,''))||'/')+'\n')});
cmd('ln',{d:'crea enlaces (accesos directos) a archivos y carpetas',uso:'ln -s destino nombre',ops:[['-s','enlace simbólico (el que casi siempre quieres)'],['-f','reemplaza si ya existe']],cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),s=x.sis,ps=o.pos;
  if(!o.f.s){x.consejo('ln-s','OneLearn solo simula enlaces simbólicos: usa ln -s destino nombre.');return 1}
  if(!ps.length){x.err('ln: falta un operando de archivo\n');return 1}
  var objetivo=ps[0],nombre=ps[1]||basename(objetivo),ab=x.abs(nombre),r=s.buscar(ab,x.u,true);
  if(r.n&&r.n.t==='d'){ab=unir(ab,basename(objetivo));r=s.buscar(ab,x.u,true)}
  if(r.n){if(!o.f.f){x.err("ln: no se pudo crear el enlace simbólico '"+nombre+"': El archivo ya existe\n");return 1}delete r.padre.h[r.nombre];r=s.buscar(ab,x.u,true)}
  if(!r.padre){x.err("ln: no se pudo crear el enlace simbólico '"+nombre+"': No existe el archivo o el directorio\n");return 1}
  if(!s.puede(r.padre,x.u,'w')){x.err("ln: no se pudo crear el enlace simbólico '"+nombre+"': Permiso denegado\n");return 1}
  var dest=objetivo.charAt(0)==='/'?s.abs(objetivo,'/','/'):s.abs(objetivo,dirname(ab),x.home);
  r.padre.h[r.nombre]={t:'l',u:x.u,g:s.grupoPrin(x.u),modo:0o777,dest:dest,txt:objetivo,m:new Date()};
  if(o.f.v)x.out("'"+nombre+"' -> '"+objetivo+"'\n");
});
cmd('readlink',{d:'dice a dónde apunta un enlace',uso:'readlink enlace',cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),r=x.buscar(o.pos[0]||'',true);
  if(!r.n||r.n.t!=='l')return 1;
  x.out((o.f.f?r.n.dest:r.n.txt||r.n.dest)+'\n');
});
/* tar: el archivo guarda el árbol de archivos como JSON, detrás de una marca */
var MARCA_TAR='\u001f\u008bONELEARN-TAR\n';
function empacar(s,n,nombre,u){
  if(n.t==='d')return {n:nombre,t:'d',m:n.modo,h:Object.keys(n.h).sort(ordenar).filter(function(k){return s.puede(n.h[k],u,'r')||n.h[k].t!=='f'}).map(function(k){return empacar(s,n.h[k],nombre+'/'+k,u)})};
  if(n.t==='l')return {n:nombre,t:'l',d:n.txt||n.dest};
  return {n:nombre,t:'f',m:n.modo,c:s.contenido(n)};
}
function listaTar(e,out){out.push(e);(e.h||[]).forEach(function(h){listaTar(h,out)});return out}
cmd('tar',{d:'junta archivos y carpetas en un solo archivo (para respaldos)',uso:'tar -czf respaldo.tar.gz carpeta',ops:[['-c','crea un archivo tar'],['-x','extrae'],['-t','lista lo que tiene'],['-z','comprimido con gzip (.tar.gz)'],['-f archivo','el nombre del archivo tar'],['-v','dice qué va haciendo'],['-C carpeta','extrae en otra carpeta']],cat:'Archivos y carpetas'},function(x){
  var a=x.args.slice(1),f={},arch=null,dirC=null,pos=[];
  for(var i=0;i<a.length;i++){
    var v=a[i];
    if(v==='-C'){dirC=a[++i];continue}
    if(/^-?[cxtzvfjp]+$/.test(v)&&(i===0||v.charAt(0)==='-')){var letras=v.replace(/^-/,'').split('');letras.forEach(function(ch){f[ch]=true});if(f.f&&letras[letras.length-1]==='f'&&arch===null){arch=a[++i]}continue}
    pos.push(v);
  }
  var s=x.sis,modos=(f.c?1:0)+(f.x?1:0)+(f.t?1:0);
  if(modos!==1){x.err("tar: Debe especificar una de las opciones '-Acdtrux', '--delete' o '--test-label'\nPruebe 'tar --help' o 'tar --usage' para más información.\n");return 2}
  if(!arch){x.err('tar: Se rehúsa a escribir datos de archivo en una terminal.\n');return 2}
  if(f.c){
    if(!pos.length){x.err('tar: Cowardly refusing to create an empty archive\n');return 2}
    var ent=[],cod=0,lst=[];
    pos.forEach(function(p){
      var r=x.buscar(p);
      if(!r.n){x.err('tar: '+p+': No se puede efectuar stat: No existe el archivo o el directorio\n');cod=2;return}
      if(r.n.t==='f'&&!s.puede(r.n,x.u,'r')){x.err('tar: '+p+': No se puede abrir: Permiso denegado\n');cod=2;return}
      var e=empacar(s,r.n,p.replace(/^\/+/,'').replace(/\/$/,''),x.u);ent.push(e);listaTar(e,lst);
    });
    if(p0abs(pos))x.err('tar: Se eliminan las «/» iniciales de los nombres de los miembros\n');
    var cont=MARCA_TAR+JSON.stringify({z:!!f.z,e:ent});
    var e2=s.escribir(x.abs(arch),cont,x.u,false);
    if(e2){x.err('tar: '+arch+': No se puede open: '+e2+'\n');return 2}
    if(f.v)x.out(lst.map(function(e){return e.n+(e.t==='d'?'/':'')}).join('\n')+'\n');
    return cod;
  }
  var lr=leer(x,arch,'tar');
  if(lr.e){x.err(lr.e.replace(/^tar: (.*): No existe el archivo o el directorio$/,'tar: $1: No se puede open: No existe el archivo o el directorio')+'\ntar: Error is not recoverable: exiting now\n');return 2}
  if(lr.t.indexOf(MARCA_TAR)!==0){x.err('tar: Esto no parece un archivo tar\ntar: Saliendo con fallos debido a errores anteriores\n');return 2}
  var dat=JSON.parse(lr.t.slice(MARCA_TAR.length)),todos=[];
  dat.e.forEach(function(e){listaTar(e,todos)});
  if(f.t){x.out(todos.map(function(e){return (f.v?(e.t==='d'?'drwxrwxr-x':'-rw-rw-r--')+' '+x.u+'/'+x.u+' '+pad(e.c?bytesDe(e.c):0,6,true)+' '+fechaLs(new Date())+' ':'')+e.n+(e.t==='d'?'/':'')}).join('\n')+'\n');return 0}
  var base=dirC?x.abs(dirC):x.cwd,cod2=0;
  if(dirC&&!s.nodo(base)){x.err('tar: '+dirC+': No se puede open: No existe el archivo o el directorio\ntar: Error is not recoverable: exiting now\n');return 2}
  todos.forEach(function(e){
    var ab=unir(base,e.n);
    if(e.t==='d'){var er=s.mkdir(ab,x.u,true);if(er){x.err('tar: '+e.n+': No se puede crear el directorio: '+er+'\n');cod2=2}}
    else if(e.t==='f'){var er2=s.escribir(ab,e.c,x.u,false);if(er2){x.err('tar: '+e.n+': No se puede open: '+er2+'\n');cod2=2}}
    if(f.v)x.out(e.n+(e.t==='d'?'/':'')+'\n');
  });
  return cod2;
  function p0abs(ps){return ps.some(function(p){return p.charAt(0)==='/'})}
});
cmd('rsync',{d:'copia y sincroniza carpetas (solo copia lo que cambió)',uso:'rsync -av origen/ destino/',ops:[['-a','conserva permisos y fechas, y copia todo lo de adentro'],['-v','dice qué copió'],['--delete','borra en el destino lo que ya no está en el origen']],cat:'Archivos y carpetas'},function(x){
  var o=opts(x.args),s=x.sis,ps=o.pos;
  if(ps.length<2){x.err('rsync: falta el destino\n');return 1}
  var org=ps[0],dst=ps[1],r=x.buscar(org);
  if(!r.n){x.err('rsync: link_stat "'+x.abs(org)+'" failed: No such file or directory (2)\nrsync error: some files/attrs were not transferred (see previous errors) (code 23)\n');return 23}
  var dentroDe=/\/$/.test(org)&&r.n.t==='d',baseD=x.abs(dst);
  if(!dentroDe&&r.n.t==='d')baseD=unir(baseD,basename(x.abs(org)));
  var lista=[],nuevos=0,tam=0;
  function sync(n,ab,rel){
    if(n.t==='d'){if(!s.nodo(ab)){var e=s.mkdir(ab,x.u,true);if(e)return}lista.push(rel+'/');Object.keys(n.h).sort(ordenar).forEach(function(k){sync(n.h[k],ab+'/'+k,rel?rel+'/'+k:k)});return}
    if(n.t!=='f'||!s.puede(n,x.u,'r'))return;
    var txt=s.contenido(n),act=s.leer(ab);
    if(act===txt)return;
    if(!s.escribir(ab,txt,x.u,false)){nuevos++;tam+=bytesDe(txt);lista.push(rel);var nn=s.nodo(ab);if(nn&&o.f.a)nn.modo=n.modo}
  }
  if(r.n.t==='f'){var nd=s.nodo(baseD);sync(r.n,nd&&nd.t==='d'?unir(baseD,basename(x.abs(org))):baseD,basename(x.abs(org)))}
  else{if(!s.nodo(baseD))s.mkdir(baseD,x.u,true);Object.keys(r.n.h).sort(ordenar).forEach(function(k){sync(r.n.h[k],baseD+'/'+k,k)})}
  var borrados=[];
  if(o.largo['delete']&&r.n.t==='d'){
    var dn=s.nodo(baseD);
    (function lim(d,orig,rel){Object.keys(d.h).forEach(function(k){if(!orig||!orig.h[k]){borrados.push('deleting '+(rel?rel+'/':'')+k);delete d.h[k]}else if(d.h[k].t==='d'&&orig.h[k].t==='d')lim(d.h[k],orig.h[k],(rel?rel+'/':'')+k)})})(dn,r.n,'');
  }
  if(o.f.v)x.out('sending incremental file list\n'+borrados.concat(lista.filter(function(l){return l!=='/'})).join('\n')+(lista.length>1||borrados.length?'\n':'')+'\nsent '+(tam+120)+' bytes  received 35 bytes  '+(tam+155)+'.00 bytes/sec\ntotal size is '+tam+'  speedup is 1.00\n');
});
/* cron */
function revisarCron(txt){
  var errores=[];
  txt.split('\n').forEach(function(l,i){
    l=l.trim();if(!l||l.charAt(0)==='#'||/^[A-Z_]+=/.test(l))return;
    if(/^@(reboot|yearly|annually|monthly|weekly|daily|midnight|hourly)\s+\S/.test(l))return;
    var p=l.split(/\s+/);
    if(p.length<6){errores.push(i+1);return}
    var lim=[[0,59],[0,23],[1,31],[1,12],[0,7]];
    for(var k=0;k<5;k++){
      var ok=p[k].split(',').every(function(parte){var m=parte.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);if(!m)return false;if(m[1]==='*')return true;return m[1].split('-').every(function(n){return +n>=lim[k][0]&&+n<=lim[k][1]})});
      if(!ok){errores.push(i+1);return}
    }
  });
  return errores;
}
cmd('crontab',{d:'programa comandos para que se corran solos a ciertas horas',uso:'crontab -e | -l | -r',ops:[['-e','edita tus tareas programadas'],['-l','las muestra'],['-r','las borra todas'],['-u usuario','las de otro usuario (con sudo)']],cat:'Procesos y servicios'},function(x){
  var o=opts(x.args,'u'),s=x.sis,u=o.val.u||x.u;
  if(o.val.u&&x.u!=='root'){x.err('must be privileged to use -u\n');return 1}
  if(!s.usuarios[u]){x.err('crontab: user \''+u+'\' unknown\n');return 1}
  if(o.f.l){if(!s.crontabs[u]){x.err('no crontab for '+u+'\n');return 1}x.out(s.crontabs[u]);return 0}
  if(o.f.r){if(!s.crontabs[u]){x.err('no crontab for '+u+'\n');return 1}delete s.crontabs[u];return 0}
  if(o.f.e){
    if(!x.tty){x.err('crontab: no se puede editar sin una terminal\n');return 1}
    var plantilla=s.crontabs[u]||'# Edita este archivo para presentar tareas que cron ejecutará.\n#\n# Cada tarea va en una línea, con cinco campos de tiempo y el comando:\n# m h  dom mon dow   comando\n#\n# Por ejemplo, un respaldo a las 2:30 de cada noche:\n# 30 2 * * * tar -czf /home/'+u+'/respaldo.tar.gz /home/'+u+'/Documentos\n';
    if(!s.crontabs[u])x.out('no crontab for '+u+' - using an empty one\n');
    var guardado=null;
    return x.t.editor('/tmp/crontab.'+azar(6,'abcdefghijklmnopqrstuvwxyz0123456789')+'/crontab',plantilla,false,function(txt){var e=revisarCron(txt);if(e.length)return 'error en la línea '+e[0]+': revisa los cinco campos de tiempo';guardado=txt;return null}).then(function(){
      if(guardado==null){x.out('crontab: no changes made to crontab\n');return 0}
      s.crontabs[u]=guardado.replace(/\n*$/,'\n');x.out('crontab: installing new crontab\n');return 0;
    });
  }
  if(o.pos[0]){var lr=leer(x,o.pos[0],'crontab');if(lr.e){x.err(lr.e+'\n');return 1}var e=revisarCron(lr.t);if(e.length){x.err('"'+o.pos[0]+'":'+e[0]+': bad minute\nerrors in crontab file, can\'t install.\n');return 1}s.crontabs[u]=lr.t;return 0}
  x.err('usage:\tcrontab [-u user] file\n\tcrontab [ -u user ] [ -i ] { -e | -l | -r }\n');return 1;
});
/* awk: un subconjunto útil para registros */
function awkLex(t){
  var toks=[],i=0;
  while(i<t.length){
    var ch=t[i];
    if(/\s/.test(ch)){i++;continue}
    if(ch==='"'){var j=i+1,v='';while(j<t.length&&t[j]!=='"'){if(t[j]==='\\'&&t[j+1]){v+={n:'\n',t:'\t'}[t[j+1]]||t[j+1];j+=2;continue}v+=t[j++]}toks.push({t:'s',v:v});i=j+1;continue}
    if(ch==='/'&&(!toks.length||/^(op|\(|,|\{|;|&&|\|\|)$/.test(toks[toks.length-1].t)||toks[toks.length-1].v==='~'||toks[toks.length-1].v==='!~')){var k=t.indexOf('/',i+1);if(k<0)k=t.length;toks.push({t:'re',v:t.slice(i+1,k)});i=k+1;continue}
    var m=t.slice(i).match(/^(\d+(?:\.\d+)?|[A-Za-z_]\w*|\$|==|!=|<=|>=|\+=|-=|\+\+|&&|\|\||!~|[~<>+\-*\/%=(){},;!])/);
    if(!m)throw 'awk: error de sintaxis cerca de «'+t.slice(i,i+10)+'»';
    var v2=m[1];
    toks.push({t:/^\d/.test(v2)?'n':/^[A-Za-z_]/.test(v2)?'id':/^[(){},;]$/.test(v2)?v2:v2==='$'?'$':'op',v:v2});
    i+=v2.length;
  }
  return toks;
}
function awkProg(texto){
  var tk=awkLex(texto),i=0,reglas=[];
  function ver(t,v){return tk[i]&&tk[i].t===t&&(v==null||tk[i].v===v)}
  function come(t,v){if(!ver(t,v))throw 'awk: error de sintaxis cerca de «'+(tk[i]?tk[i].v:'el final')+'»';return tk[i++]}
  function primario(){
    if(ver('$')){i++;var e=primario();return {k:'campo',e:e}}
    if(ver('n'))return {k:'num',v:+tk[i++].v};
    if(ver('s'))return {k:'str',v:tk[i++].v};
    if(ver('re'))return {k:'re',v:tk[i++].v};
    if(ver('(')){i++;var e2=expr();come(')');return e2}
    if(ver('op','-')){i++;return {k:'bin',o:'-',a:{k:'num',v:0},b:primario()}}
    if(ver('op','!')){i++;return {k:'no',a:primario()}}
    if(ver('id')){var n=tk[i++].v;if(ver('op','++')){i++;return {k:'inc',n:n}}if(ver('(')){i++;var args=[];while(!ver(')')){args.push(expr());if(ver(','))i++}i++;return {k:'fn',n:n,args:args}}return {k:'var',n:n}}
    throw 'awk: error de sintaxis cerca de «'+(tk[i]?tk[i].v:'el final')+'»';
  }
  function mul(){var a=primario();while(ver('op','*')||ver('op','/')||ver('op','%')){var o=tk[i++].v;a={k:'bin',o:o,a:a,b:primario()}}return a}
  function suma(){var a=mul();while(ver('op','+')||ver('op','-')){var o=tk[i++].v;a={k:'bin',o:o,a:a,b:mul()}}return a}
  function concat(){var a=suma();while(tk[i]&&(ver('$')||ver('n')||ver('s')||ver('id')||ver('('))&&!ver('id','in')){a={k:'cat',a:a,b:suma()}}return a}
  function comp(){var a=concat();if(ver('op')&&/^(==|!=|<|>|<=|>=|~|!~)$/.test(tk[i].v)){var o=tk[i++].v;return {k:'cmp',o:o,a:a,b:concat()}}return a}
  function y(){var a=comp();while(ver('op','&&')){i++;a={k:'y',a:a,b:comp()}}return a}
  function expr(){var a=y();while(ver('op','||')){i++;a={k:'o',a:a,b:y()}}return a}
  function sentencia(){
    if(ver('id','print')){i++;var args=[];if(!ver(';')&&!ver('}')){args.push(expr());while(ver(',')){i++;args.push(expr())}}return {k:'print',args:args}}
    if(ver('id','for')){i++;come('(');var v=come('id').v;come('id','in');var arr=come('id').v;come(')');var cuerpo=ver('{')?bloque():[sentencia()];return {k:'forin',v:v,arr:arr,cuerpo:cuerpo}}
    if(ver('id')&&tk[i+1]&&(tk[i+1].v==='+='||tk[i+1].v==='-='||tk[i+1].v==='=')){var n=tk[i++].v,o=tk[i++].v;return {k:'asig',n:n,o:o,e:expr()}}
    if(ver('id')&&tk[i+1]&&tk[i+1].v==='++'){var n2=tk[i].v;i+=2;return {k:'asig',n:n2,o:'+=',e:{k:'num',v:1}}}
    if(ver('id')&&tk[i+1]&&tk[i+1].v==='['){throw 'awk: arreglos no disponibles en esta terminal'}
    return {k:'expr',e:expr()};
  }
  function bloque(){come('{');var ss=[];while(!ver('}')){if(ver(';')){i++;continue}ss.push(sentencia())}come('}');return ss}
  while(i<tk.length){
    var r={};
    if(ver('id','BEGIN')){i++;r.especial='BEGIN'}
    else if(ver('id','END')){i++;r.especial='END'}
    else if(!ver('{'))r.patron=expr();
    r.acc=ver('{')?bloque():null;
    reglas.push(r);
    while(ver(';'))i++;
  }
  return reglas;
}
function awkCorrer(reglas,lineas,sep){
  var V={NR:0,NF:0},out='',campos=[];
  function num(v){var n=parseFloat(v);return isNaN(n)?0:n}
  function esNum(v){return typeof v==='number'||/^\s*-?\d+(\.\d+)?\s*$/.test(String(v))}
  function str(v){return typeof v==='number'?(Math.round(v)===v?String(v):String(+v.toFixed(6))):String(v==null?'':v)}
  function ev(e){
    switch(e.k){
      case 'num':return e.v;case 'str':return e.v;
      case 're':return new RegExp(e.v).test(campos[0])?1:0;
      case 'campo':var n=Math.floor(num(ev(e.e)));return n===0?campos[0]:campos[n]==null?'':campos[n];
      case 'var':return e.n==='NR'?V.NR:e.n==='NF'?campos.length-1:V[e.n]==null?'':V[e.n];
      case 'inc':var a=num(V[e.n]);V[e.n]=a+1;return a;
      case 'bin':var x2=num(ev(e.a)),y2=num(ev(e.b));return e.o==='+'?x2+y2:e.o==='-'?x2-y2:e.o==='*'?x2*y2:e.o==='/'?(y2?x2/y2:0):x2%y2;
      case 'cat':return str(ev(e.a))+str(ev(e.b));
      case 'no':return ev(e.a)?0:1;
      case 'y':return ev(e.a)&&ev(e.b)?1:0;
      case 'o':return ev(e.a)||ev(e.b)?1:0;
      case 'fn':var v=e.args.length?ev(e.args[0]):campos[0];if(e.n==='length')return str(v).length;if(e.n==='toupper')return str(v).toUpperCase();if(e.n==='tolower')return str(v).toLowerCase();if(e.n==='int')return Math.trunc(num(v));throw 'awk: función desconocida '+e.n;
      case 'cmp':
        if(e.o==='~'||e.o==='!~'){var re=e.b.k==='re'?e.b.v:str(ev(e.b));var t2=new RegExp(re).test(str(ev(e.a)));return (e.o==='~')===t2?1:0}
        var A2=ev(e.a),B=ev(e.b),r;
        if(esNum(A2)&&esNum(B)){A2=num(A2);B=num(B)}else{A2=str(A2);B=str(B)}
        r=e.o==='=='?A2===B:e.o==='!='?A2!==B:e.o==='<'?A2<B:e.o==='>'?A2>B:e.o==='<='?A2<=B:A2>=B;return r?1:0;
    }
  }
  function correr(ss){
    ss.forEach(function(s2){
      if(s2.k==='print')out+=(s2.args.length?s2.args.map(function(a){return str(ev(a))}).join(' '):campos[0])+'\n';
      else if(s2.k==='asig'){var v=ev(s2.e);V[s2.n]=s2.o==='='?v:num(V[s2.n])+(s2.o==='+='?num(v):-num(v))}
      else if(s2.k==='expr')ev(s2.e);
    });
  }
  function cierto(p){var v=ev(p);return p.k==='re'?!!v:typeof v==='number'?v!==0:v!==''}
  campos=[''];
  reglas.filter(function(r){return r.especial==='BEGIN'}).forEach(function(r){correr(r.acc||[])});
  lineas.forEach(function(l){
    V.NR++;
    campos=[l].concat(sep?l.split(sep):l.trim().split(/\s+/).filter(Boolean));
    reglas.forEach(function(r){if(r.especial)return;if(r.patron&&!cierto(r.patron))return;if(r.acc)correr(r.acc);else out+=l+'\n'});
  });
  campos=[''];
  reglas.filter(function(r){return r.especial==='END'}).forEach(function(r){correr(r.acc||[])});
  return out;
}
cmd('awk',{d:'separa cada línea en columnas y hace cálculos con ellas',uso:"awk '{print $1}' archivo",ops:[["'{print $1, $3}'",'muestra las columnas 1 y 3'],["-F ','",'usa la coma para separar columnas'],["'$9 == 404'",'solo las líneas donde la columna 9 vale 404'],["'{s+=$10} END {print s}'",'suma una columna']],cat:'Ver y buscar texto'},function(x){
  var a=x.args.slice(1),sep=null;
  if(a[0]&&/^-F/.test(a[0])){sep=a[0].length>2?a[0].slice(2):a[1];a=a.slice(a[0].length>2?1:2)}
  var prog=a[0];
  if(prog==null){x.err('uso: awk [-F sep] \'programa\' [archivo ...]\n');return 2}
  var reglas;
  try{reglas=awkProg(prog)}catch(e){x.err(String(e)+'\n');return 2}
  var src=fuentes(x,a.slice(1),'awk'),cod=0,ls=[];
  src.forEach(function(s2){if(s2.e){x.err(s2.e.replace(/^awk: /,'awk: no se puede abrir el archivo ')+'\n');cod=2}else ls=ls.concat(lineasDe(s2.t))});
  try{x.out(awkCorrer(reglas,ls,sep==='\\t'?'\t':sep))}catch(e){x.err(String(e)+'\n');return 2}
  return cod;
});
cmd('cut',{d:'corta columnas de cada línea',uso:'cut -d "," -f 1,3 archivo',ops:[['-d ","','el separador de columnas'],['-f 1,3','qué columnas'],['-c 1-5','qué caracteres']],cat:'Ver y buscar texto'},function(x){
  var o=opts(x.args,'dfc'),sep=o.val.d==null?'\t':o.val.d,lista=o.val.f||o.val.c;
  if(!lista){x.err('cut: debe especificar una lista de bytes, caracteres o campos\n');return 1}
  function sel(n){return lista.split(',').some(function(p){var m=p.match(/^(\d*)(-?)(\d*)$/);if(!m)return false;var a2=m[1]?+m[1]:1,b=m[2]?(m[3]?+m[3]:1e9):a2;return n>=a2&&n<=b})}
  var out='',cod=0;
  fuentes(x,o.pos,'cut').forEach(function(s2){
    if(s2.e){x.err(s2.e+'\n');cod=1;return}
    lineasDe(s2.t).forEach(function(l){
      if(o.val.c)out+=l.split('').filter(function(ch,i){return sel(i+1)}).join('')+'\n';
      else{var p=l.split(sep);out+=(p.length===1?l:p.filter(function(v,i){return sel(i+1)}).join(sep))+'\n'}
    });
  });
  x.out(out);return cod;
});
cmd('netplan',{d:'aplica la configuración de red de /etc/netplan',uso:'sudo netplan apply',cat:'Red',sbin:true},function(x){
  var s=x.sis,r=s.red;
  if(x.args[1]!=='apply'&&x.args[1]!=='try'){x.err('You need to specify a command\n');return 1}
  if(x.u!=='root'){x.err('Permission denied (try with sudo)\n');return 1}
  var dir=s.nodo('/etc/netplan'),txt='';
  if(dir)Object.keys(dir.h).sort().forEach(function(k){if(/\.ya?ml$/.test(k)&&dir.h[k].t==='f')txt+=s.contenido(dir.h[k])+'\n'});
  if(/\t/.test(txt)){x.err('Error in network definition: found character that cannot start any token (tabs no están permitidos en YAML)\n');return 1}
  var bloque=txt.slice(Math.max(0,txt.indexOf(r.iface+':')));
  if(txt.indexOf(r.iface+':')<0){x.err('Error: no se encontró la configuración de '+r.iface+'\n');return 1}
  if(/dhcp4:\s*(true|yes)/.test(bloque)){r.dhcp=true;r.ip=r.ipDhcp||r.ip||'192.168.1.50';r.bits=24;r.puerta=r.salida;r.dnsSup=null;r.arriba=true;return 0}
  var dir2=bloque.match(/addresses:\s*\[?\s*-?\s*"?(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
  if(!dir2){x.err('Error in network definition: '+r.iface+': no tiene addresses ni dhcp4\n');return 1}
  var gw=(bloque.match(/via:\s*"?(\d+\.\d+\.\d+\.\d+)/)||bloque.match(/gateway4:\s*"?(\d+\.\d+\.\d+\.\d+)/)||[])[1];
  var dns=(bloque.match(/nameservers:[\s\S]*?addresses:\s*\[?\s*-?\s*"?(\d+\.\d+\.\d+\.\d+)/)||[])[1];
  r.dhcp=false;r.ip=dir2[1];r.bits=+dir2[2];r.puerta=gw||null;r.arriba=true;if(dns)r.dnsSup=dns;
  if(/gateway4/.test(bloque))x.err('\n** (generate:2201): WARNING **: `gateway4` has been deprecated, use default routes instead.\nSee the \'Default routes\' section of the documentation for more details.\n');
  return 0;
});

/* --- Sistema --- */
cmd('uname',{d:'muestra el sistema operativo y el kernel',uso:'uname [-a]',ops:[['-a','todo'],['-r','versión del kernel']],cat:'Sistema'},function(x){
  var f=opts(x.args).f,s=x.sis;
  if(f.a){x.out('Linux '+s.host+' 6.8.0-49-generic #49-Ubuntu SMP PREEMPT_DYNAMIC Mon Nov  4 02:06:24 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux\n');return}
  var p=[];if(f.s||!Object.keys(f).length)p.push('Linux');if(f.n)p.push(s.host);if(f.r)p.push('6.8.0-49-generic');if(f.m)p.push('x86_64');if(f.o)p.push('GNU/Linux');
  x.out(p.join(' ')+'\n');
});
cmd('lsb_release',{d:'muestra la versión de la distribución',uso:'lsb_release -a',cat:'Sistema'},function(x){x.out('No LSB modules are available.\nDistributor ID:\tUbuntu\nDescription:\tUbuntu 24.04.1 LTS\nRelease:\t24.04\nCodename:\tnoble\n')});
cmd('date',{d:'muestra la fecha y la hora',uso:'date [+formato]',ops:[['+%F','fecha como 2026-11-18'],['+%T','hora como 10:30:00']],cat:'Sistema'},function(x){
  var d=new Date(),f=x.args[1];
  if(f&&f.charAt(0)==='+'){
    var M={Y:d.getFullYear(),m:dos(d.getMonth()+1),d:dos(d.getDate()),H:dos(d.getHours()),M:dos(d.getMinutes()),S:dos(d.getSeconds()),F:d.getFullYear()+'-'+dos(d.getMonth()+1)+'-'+dos(d.getDate()),T:hora(d),s:Math.floor(d/1000),A:DIAS_ES[d.getDay()],b:MESES[d.getMonth()]};
    x.out(f.slice(1).replace(/%([a-zA-Z%])/g,function(m,k){return k==='%'?'%':M[k]!=null?M[k]:m})+'\n');return;
  }
  x.out(DIAS_ES[d.getDay()]+' '+d.getDate()+' '+MESES[d.getMonth()]+' '+d.getFullYear()+' '+hora(d)+' CST\n');
});
cmd('nano',{d:'editor de texto sencillo',uso:'nano archivo',ops:[['Ctrl+O','guarda'],['Ctrl+X','sale']],cat:'Archivos y carpetas',paq:'nano'},function(x){
  var p=opts(x.args).pos[0],s=x.sis;
  if(!x.tty){x.err('Too many errors from stdin\n');return 1}
  if(!p){x.consejo('nano-sin','escribe el nombre del archivo: nano notas.txt (si no existe, se crea al guardar).');return 1}
  var ab=x.abs(p),r=s.buscar(ab,x.u);
  if(r.err==='permiso'){x.err('nano: '+p+': Permiso denegado\n');return 1}
  if(r.n&&r.n.t==='d'){x.err('nano: «'+p+'» es un directorio\n');return 1}
  if(r.n&&!s.puede(r.n,x.u,'r')){x.err('[ Error al leer '+p+': Permiso denegado ]\n');x.consejo('nano-r','ese archivo no lo puedes leer con tu usuario. Si es de configuración del sistema, ábrelo con sudo nano.');return 1}
  if(!r.n&&!r.padre){x.err('[ La carpeta «'+dirname(p)+'» no existe ]\n');return 1}
  var soloL=r.n?!s.puede(r.n,x.u,'w'):!s.puede(r.padre,x.u,'w');
  return x.t.editor(p,r.n?s.contenido(r.n):'',soloL,function(txt){return s.escribir(ab,txt,x.u,false)}).then(function(){
    if(soloL)x.consejo('nano-w','ese archivo es de otro usuario: para cambiarlo necesitas abrirlo con sudo nano.');
    return 0;
  });
});
cmd('cowsay',{d:'una vaca que dice lo que escribas',uso:'cowsay texto',cat:'Sistema',paq:'cowsay'},function(x){
  var t=x.args.slice(1).join(' ')||(x.entrada||'').trim()||'muu';
  if(t.length>38)t=t.slice(0,38)+'…';
  x.out(' '+new Array(t.length+3).join('_')+'\n< '+t+' >\n '+new Array(t.length+3).join('-')+'\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||\n');
});
cmd('python3',{d:'el lenguaje Python',uso:'python3 [--version] [script.py]',cat:'Sistema',paq:'python3'},function(x){
  var a=x.args[1];
  if(a==='--version'||a==='-V'){x.out('Python 3.12.3\n');return}
  if(a&&a.charAt(0)!=='-'){var r=x.buscar(a);if(!r.n){x.err("python3: can't open file '"+x.abs(a)+"': [Errno 2] No such file or directory\n");return 2}}
  x.consejo('python','esta terminal no ejecuta Python. En tu computadora, python3 abre el intérprete (sales con exit()).');
});
cmd('git',{d:'control de versiones',uso:'git orden',cat:'Sistema',paq:'git'},function(x){
  if(x.args[1]==='--version'){x.out('git version 2.43.0\n');return}
  x.consejo('git','git ya está instalado. Lo usas a fondo en el proyecto «Tu portafolio web».');
});
cmd('nginx',{d:'el servidor web nginx',uso:'sudo nginx -t',ops:[['-t','revisa que la configuración no tenga errores'],['-s reload','vuelve a leer la configuración'],['-v','la versión']],cat:'Red',paq:'nginx',sbin:true},function(x){
  var a=x.args[1],s=x.sis;
  if(a==='-v'){x.err('nginx version: nginx/1.24.0 (Ubuntu)\n');return}
  if(a==='-t'||a==='-T'){
    if(x.u!=='root'){x.err('nginx: [alert] could not open error log file: open() "/var/log/nginx/error.log" failed (13: Permission denied)\n2026/11/18 10:30:00 [warn] 2412#2412: the "user" directive makes sense only if the master process runs with super-user privileges, ignored in /etc/nginx/nginx.conf:1\nnginx: [emerg] open() "/run/nginx.pid" failed (13: Permission denied)\nnginx: configuration file /etc/nginx/nginx.conf test failed\n');x.consejo('nginx-t','revisar la configuración de nginx necesita sudo: sudo nginx -t.');return 1}
    var r=nginxConfig(s);
    if(r.err){x.err('nginx: [emerg] '+r.err+'\nnginx: configuration file /etc/nginx/nginx.conf test failed\n');return 1}
    (r.avisos||[]).forEach(function(w){x.err('nginx: [warn] '+w+'\n')});
    x.err('nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n');return 0;
  }
  if(a==='-s'&&x.args[2]==='reload'){return CMD.systemctl.fn(Object.assign({},x,{args:['systemctl','reload','nginx']}))}
  x.consejo('nginx','nginx se controla con systemctl: sudo systemctl status nginx, sudo systemctl reload nginx.');
});

/* ---------- API pública ---------- */
AT.terminal=function(cont,op){return new Terminal(cont,op)};
AT.terminal.comando=function(nombres,meta,fn){cmd(nombres,meta,fn)};
AT.terminal.color=c;
/* Piezas para que las lecciones agreguen comandos con el mismo estilo */
AT.terminal.util={opts:opts,pad:pad,tabla:tabla,plano:plano,leer:leer,fuentes:fuentes,lineasDe:lineasDe,ordenar:ordenar,
  ipNum:ipNum,numIp:numIp,esIp:esIp,enRed:enRed,cidr:cidr,redDe:redDe,difusion:difusion,privada:privada,
  respuesta:respuesta,paginaError:paginaError,HTTP_TXT:HTTP_TXT,PUERTOS:PUERTOS,puertoEstado:puertoEstado,bytesDe:bytesDe,
  comando:function(n){return CMD[n]||null},paquete:function(n,def){PAQ[n]=def}};
})();
