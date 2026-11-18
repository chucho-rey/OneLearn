/* Laboratorios de la lección «Virtualización y contenedores». Agrega a la terminal simulada un comando docker
   (solo en esta página) con imágenes de ejemplo: hello-world, nginx y postgres. Cada laboratorio se registra
   en AT.labs con el nombre de su bloque «laboratorio». */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,fmt=AT.fmt;

/* ---------- Demo 1: máquinas virtuales contra contenedores ---------- */
AT.labs['ct-compara']=function(raiz){
  var sl=$('#cpN',raiz);
  function pila(n,vm){
    var apps='';for(var i=0;i<n;i++)apps+='<div class="cp-app">'+(vm?'<span class="cp-so">SO invitado</span>':'')+'<span>App '+String.fromCharCode(65+i)+'</span></div>';
    return '<div class="cp-apps">'+apps+'</div>'+(vm?'<div class="cp-capa">Hipervisor</div>':'<div class="cp-capa">Motor de contenedores</div><div class="cp-capa">Sistema operativo (un solo kernel)</div>')+'<div class="cp-capa cp-hw">Hardware</div>';
  }
  function barra(l,v,max,txt,on){return '<div class="br'+(on?' on':'')+'"><span class="br-l">'+esc(l)+'</span><span class="br-b" aria-hidden="true"><i style="width:'+Math.max(2,v/max*100)+'%"></i></span><b>'+txt+'</b></div>'}
  function pintar(){
    var n=+sl.value,ramVm=n*1.3,ramCt=0.6+n*0.35,discoVm=n*12,discoCt=3+n*0.4;
    $('#cpNV',raiz).textContent=n+(n===1?' aplicación':' aplicaciones');
    $('#cpVm',raiz).innerHTML=pila(n,true);$('#cpCt',raiz).innerHTML=pila(n,false);
    var mr=Math.max(ramVm,ramCt),md=Math.max(discoVm,discoCt);
    $('#cpRam',raiz).innerHTML=barra('Máquinas virtuales',ramVm,mr,fmt(ramVm,1)+' GB')+barra('Contenedores',ramCt,mr,fmt(ramCt,1)+' GB',true);
    $('#cpDisco',raiz).innerHTML=barra('Máquinas virtuales',discoVm,md,fmt(discoVm)+' GB')+barra('Contenedores',discoCt,md,fmt(discoCt,1)+' GB',true);
    $('#cpMsg',raiz).textContent='Con '+n+(n===1?' aplicación':' aplicaciones')+', las máquinas virtuales usan '+fmt(ramVm/ramCt,1)+' veces más memoria: cada una carga su propio sistema operativo. Una máquina virtual tarda unos 40 segundos en arrancar; un contenedor, menos de uno.';
  }
  sl.addEventListener('input',pintar);
  pintar();
};

/* ---------- El comando docker ---------- */
var BIENVENIDA='<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n</body>\n</html>\n';
var IMG={
  'hello-world':{id:'d2c94e258dcb',tam:'13.3kB',cmd:'"/hello"'},
  nginx:{id:'3b25b682ea82',tam:'192MB',cmd:'"/docker-entrypoint.…"',puerto:80},
  postgres:{id:'f23dc7cc8d1e',tam:'438MB',cmd:'"docker-entrypoint.s…"',puerto:5432}
};
var HOLA='\nHello from Docker!\nThis message shows that your installation appears to be working correctly.\n\nTo generate this message, Docker took the following steps:\n 1. The Docker client contacted the Docker daemon.\n 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.\n    (amd64)\n 3. The Docker daemon created a new container from that image which runs the\n    executable that produces the output you are currently reading.\n 4. The Docker daemon streamed that output to the Docker client, which sent it\n    to your terminal.\n\nTo try something more ambitious, you can run an Ubuntu container with:\n $ docker run -it ubuntu bash\n';
function hex(n){var s='',c='0123456789abcdef';for(var i=0;i<n;i++)s+=c[Math.floor(Math.random()*16)];return s}
var NOMBRES=['quirky_hopper','eager_lovelace','brave_turing','gifted_hamilton','sleepy_curie','jolly_noether'];
function estado(s){
  if(!s.docker)s.docker={imgs:{},cont:[],n:0};
  return s.docker;
}
function hace(f){var m=Math.round((Date.now()-f)/60000);return m<1?'Less than a second ago':m===1?'About a minute ago':m+' minutes ago'}
function buscar(d,ref){return d.cont.filter(function(c){return c.nombre===ref||c.id.indexOf(ref)===0})[0]}
function puertosDocker(s){
  var d=estado(s),v=s.servicio('docker');if(!v)return;
  v.puertos=[];d.cont.forEach(function(c){if(c.arriba)c.puertos.forEach(function(p){v.puertos.push(p.h)})});
}
function hora(){var d=new Date();return d.toISOString().replace('T',' ').slice(0,19)}
function arrancar(s,c){
  c.arriba=true;c.desde=Date.now();c.salida=null;
  if(c.img==='nginx')c.logs.push('/docker-entrypoint.sh: Configuration complete; ready for start up',hora()+' [notice] 1#1: nginx/1.27.3','2026/11/18 '+hora().slice(11)+' [notice] 1#1: start worker processes');
  if(c.img==='postgres'){
    if(!c.env.POSTGRES_PASSWORD){c.arriba=false;c.salida=1;c.logs.push('Error: Database is uninitialized and superuser password is not specified.','       You must specify POSTGRES_PASSWORD to a non-empty value for the','       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".')}
    else c.logs.push('PostgreSQL init process complete; ready for start up.','LOG:  database system is ready to accept connections');
  }
  puertosDocker(s);
}
/* Atiende HTTP en un puerto publicado: nginx con su página o la carpeta montada con -v */
function web(s,puerto){
  return function(req){
    var U=AT.terminal.util,c=estado(s).cont.filter(function(k){return k.arriba&&k.img==='nginx'&&k.puertos.some(function(p){return p.h===puerto})})[0];
    if(!c)return U.respuesta(502,'',{});
    var cuerpo=BIENVENIDA,vol=c.vols.filter(function(v){return v.dst==='/usr/share/nginx/html'})[0],cod=200;
    if(vol){
      var ruta=req.ruta.replace(/\?.*$/,''),arch=vol.src+(ruta==='/'?'/index.html':ruta),t=s.leer(arch);
      if(t==null){cod=404;cuerpo=U.paginaError(404)}else cuerpo=t;
    }
    c.logs.push('172.17.0.1 - - [18/Nov/2026:'+hora().slice(11)+' +0000] "'+req.metodo+' '+req.ruta+' HTTP/1.1" '+cod+' '+U.bytesDe(cuerpo)+' "-" "curl/8.5.0" "-"');
    return U.respuesta(cod,cuerpo,{'Server':'nginx/1.27.3','Content-Type':'text/html'});
  };
}
AT.terminal.comando('docker',{d:'crea y maneja contenedores',uso:'docker run|ps|logs|stop|rm|images ...',ops:[['run -d -p 8080:80 nginx','corre un contenedor en segundo plano, publicando un puerto'],['ps -a','los contenedores (también los detenidos)'],['logs nombre','lo que ha escrito un contenedor'],['stop / start / rm nombre','lo detiene, lo arranca o lo borra'],['images','las imágenes descargadas']],cat:'Procesos y servicios'},function(x){
  var s=x.sis,d=estado(s),a=x.args.slice(1),acc=a[0],U=AT.terminal.util;
  if(!s.servicio('docker')){x.err('Command \'docker\' not found\n');return 127}
  if(!acc||acc==='--help'){x.out('Usage:  docker [OPTIONS] COMMAND\n\nCommon Commands:\n  run         Create and run a new container from an image\n  ps          List containers\n  images      List images\n  pull        Download an image from a registry\n  logs        Fetch the logs of a container\n  start       Start one or more stopped containers\n  stop        Stop one or more running containers\n  rm          Remove one or more containers\n  volume      Manage volumes\n  version     Show the Docker version information\n');return 0}
  if(acc==='version'||acc==='-v'||acc==='--version'){x.out('Docker version 27.3.1, build ce12230\n');return 0}
  if(acc==='image'&&a[1]==='ls')acc='images';
  if(acc==='container'&&a[1]==='ls'){acc='ps';a=a.slice(1)}
  function nombreImg(t){var p=String(t).split(':');return {n:p[0],tag:p[1]||'latest'}}
  function bajar(im){
    x.out('Unable to find image \''+im.n+':'+im.tag+'\' locally\n'+im.tag+': Pulling from library/'+im.n+'\n');
    return x.esperar(500).then(function(){
      x.out((im.n==='hello-world'?'c1ec31eb5944: Pull complete\n':'2d429b9e73a6: Pull complete\n9b1039c85176: Pull complete\n4a9d8e1a2b6c: Pull complete\n')+'Digest: sha256:'+hex(64)+'\nStatus: Downloaded newer image for '+im.n+':'+im.tag+'\n');
      d.imgs[im.n+':'+im.tag]={f:Date.now()};
    });
  }
  if(acc==='pull'){
    var ip=nombreImg(a[1]||'');if(!IMG[ip.n]){x.err('Error response from daemon: pull access denied for '+ip.n+', repository does not exist or may require \'docker login\'\n');return 1}
    if(d.imgs[ip.n+':'+ip.tag]){x.out(ip.tag+': Pulling from library/'+ip.n+'\nDigest: sha256:'+hex(64)+'\nStatus: Image is up to date for '+ip.n+':'+ip.tag+'\n');return 0}
    return x.esperar(300).then(function(){x.out(ip.tag+': Pulling from library/'+ip.n+'\n2d429b9e73a6: Pull complete\nDigest: sha256:'+hex(64)+'\nStatus: Downloaded newer image for '+ip.n+':'+ip.tag+'\n');d.imgs[ip.n+':'+ip.tag]={f:Date.now()};return 0});
  }
  if(acc==='images'){
    x.out(U.tabla([['REPOSITORY','TAG','IMAGE ID','CREATED','SIZE']].concat(Object.keys(d.imgs).map(function(k){var p=k.split(':');return [p[0],p[1],IMG[p[0]].id,'3 weeks ago',IMG[p[0]].tam]}))));return 0;
  }
  if(acc==='ps'){
    var todos=a.indexOf('-a')>=0||a.indexOf('--all')>=0;
    x.out(U.tabla([['CONTAINER ID','IMAGE','COMMAND','CREATED','STATUS','PORTS','NAMES']].concat(d.cont.filter(function(c){return todos||c.arriba}).map(function(c){
      return [c.id.slice(0,12),c.img,IMG[c.img].cmd,hace(c.creado),c.arriba?'Up '+hace(c.desde).replace(' ago','').replace('Less than a second','Less than a second'):'Exited ('+c.salida+') '+hace(c.fin||c.creado),
        c.arriba?c.puertos.map(function(p){return '0.0.0.0:'+p.h+'->'+p.c+'/tcp'}).join(', '):'',c.nombre];
    }))));return 0;
  }
  if(acc==='logs'){var cl=buscar(d,a[a.length-1]||'');if(!cl){x.err('Error response from daemon: No such container: '+(a[1]||'')+'\n');return 1}x.out(cl.logs.map(function(l){return l+'\n'}).join(''));return 0}
  if(acc==='stop'||acc==='start'||acc==='rm'||acc==='restart'){
    var fuerza=a.indexOf('-f')>=0,refs=a.slice(1).filter(function(v){return v.charAt(0)!=='-'}),cod=0;
    if(!refs.length){x.err('"docker '+acc+'" requires at least 1 argument.\n');return 1}
    refs.forEach(function(ref){
      var c=buscar(d,ref);if(!c){x.err('Error response from daemon: No such container: '+ref+'\n');cod=1;return}
      if(acc==='rm'){
        if(c.arriba&&!fuerza){x.err('Error response from daemon: cannot remove container "/'+c.nombre+'": container is running: stop the container before removing or force remove\n');cod=1;return}
        d.cont.splice(d.cont.indexOf(c),1);
      }else if(acc==='stop'){if(c.arriba){c.arriba=false;c.salida=0;c.fin=Date.now()}}
      else{arrancar(s,c)}
      x.out(ref+'\n');
    });
    puertosDocker(s);return cod;
  }
  if(acc==='volume'){x.out(U.tabla([['DRIVER','VOLUME NAME']].concat(Object.keys(d.vols||{}).map(function(k){return ['local',k]}))));return 0}
  if(acc==='exec'){x.consejo('docker-exec','docker exec abre un comando dentro de un contenedor que corre, como docker exec -it web bash. En esta terminal simulada no está disponible.');return 1}
  if(acc!=='run'){x.err('docker: \''+acc+'\' is not a docker command.\nSee \'docker --help\'\n');return 1}
  /* docker run */
  var o={d:false,nombre:null,p:[],v:[],e:{}},img=null,i;
  for(i=1;i<a.length;i++){
    var v=a[i];
    if(v==='-d'||v==='--detach')o.d=true;
    else if(v==='-it'||v==='-i'||v==='-t'||v==='--rm')continue;
    else if(v==='--name')o.nombre=a[++i];
    else if(v==='-p'||v==='--publish')o.p.push(a[++i]);
    else if(v==='-v'||v==='--volume')o.v.push(a[++i]);
    else if(v==='-e'||v==='--env')o.e[(a[++i]||'').split('=')[0]]=(a[i]||'').split('=').slice(1).join('=');
    else if(v.charAt(0)==='-'){x.err('unknown flag: '+v+'\nSee \'docker run --help\'.\n');return 125}
    else{img=v;break}
  }
  if(!img){x.err('"docker run" requires at least 1 argument.\nSee \'docker run --help\'.\n');return 125}
  var im=nombreImg(img);
  if(!IMG[im.n]){x.err('Unable to find image \''+im.n+':'+im.tag+'\' locally\ndocker: Error response from daemon: pull access denied for '+im.n+', repository does not exist or may require \'docker login\'.\n');return 125}
  if(o.nombre&&d.cont.some(function(c){return c.nombre===o.nombre})){var ya=buscar(d,o.nombre);x.err('docker: Error response from daemon: Conflict. The container name "/'+o.nombre+'" is already in use by container "'+ya.id+'". You have to remove (or rename) that container to be able to reuse that name.\nSee \'docker run --help\'.\n');return 125}
  var puertos=[],mal=null;
  o.p.forEach(function(t){var m=String(t).match(/^(?:127\.0\.0\.1:)?(\d+):(\d+)$/);if(!m){mal=t;return}puertos.push({h:+m[1],c:+m[2]})});
  if(mal){x.err('docker: invalid publish opts format: '+mal+'\n');return 125}
  var vols=[];
  o.v.forEach(function(t){var p=String(t).split(':');if(p.length<2)return;var src=p[0];if(/^[\/.~]/.test(src))src=x.abs(src.replace(/^~/,s.home(x.u)));else{d.vols=d.vols||{};d.vols[src]=1}vols.push({src:src,dst:p[1]})});
  var ocupado=puertos.filter(function(p){return U.puertoEstado(s,p.h,'127.0.0.1')==='abierto'})[0];
  var paso=d.imgs[im.n+':'+im.tag]?Promise.resolve():bajar(im);
  return paso.then(function(){
    var c={id:hex(64),nombre:o.nombre||NOMBRES[d.n++%NOMBRES.length],img:im.n,puertos:puertos,vols:vols,env:o.e,logs:[],creado:Date.now(),arriba:false};
    if(ocupado){d.cont.push(c);c.salida=128;x.err('docker: Error response from daemon: driver failed programming external connectivity on endpoint '+c.nombre+' ('+c.id.slice(0,12)+'): Bind for 0.0.0.0:'+ocupado.h+' failed: port is already allocated.\n');return 125}
    d.cont.push(c);
    puertos.forEach(function(p){s.red.web[p.h]=web(s,p.h)});
    if(im.n==='hello-world'){c.salida=0;c.fin=Date.now();c.logs=HOLA.split('\n');x.out(HOLA);return 0}
    arrancar(s,c);
    if(o.d){x.out(c.id+'\n');return 0}
    x.out(c.logs.map(function(l){return l+'\n'}).join(''));
    x.consejo('docker-d','sin -d, docker se queda pegado mostrando lo que escribe el contenedor hasta que pulses Ctrl+C. Aquí lo dejamos corriendo en segundo plano, como si hubieras usado -d.');
    return c.arriba?0:c.salida;
  });
});

/* ---------- Demo 2: contenedores en la terminal ---------- */
AT.labs['ct-terminal']=function(raiz){
  function c(s,n){return (s.docker&&s.docker.cont||[]).filter(function(k){return k.nombre===n})[0]}
  AT.terminal($('.term-host',raiz),{
    clave:'ct-terminal',
    sugerencias:['docker run hello-world','docker ps -a','docker images'],
    preparar:function(s){
      s.servicio('docker',{desc:'Docker Application Container Engine',cmd:'/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock',nombreProc:'dockerd',activo:true,habilitado:true,puertos:[],mem:'84.6M'});
      s.poner('/home/ana/sitio/index.html','<h1>Mi sitio, servido desde un contenedor</h1>\n',{u:'ana',g:'ana',modo:0o644});
    },
    tareas:[
      {id:'hola',texto:'Corre tu primer contenedor: la imagen hello-world.',pista:'`docker run hello-world`. Docker baja la imagen, crea un contenedor, lo corre y el contenedor termina.',
       ok:function(s,u){return u.uso('docker',/run/)&&/Hello from Docker!/.test(u.salida)}},
      {id:'web',texto:'Corre nginx en segundo plano, con el nombre web, publicando su puerto 80 en el 8080 de tu PC.',pista:'`docker run -d --name web -p 8080:80 nginx`. Revisa con `docker ps`.',
       ok:function(s){var k=c(s,'web');return !!(k&&k.arriba&&k.img==='nginx'&&k.puertos.some(function(p){return p.h===8080&&p.c===80}))}},
      {id:'curl',texto:'Pide la página del contenedor desde tu PC.',pista:'`curl localhost:8080`.',
       ok:function(s,u){return u.uso('curl',/8080/)&&/Welcome to nginx/.test(u.salida)}},
      {id:'logs',texto:'Mira lo que ha escrito el contenedor web.',pista:'`docker logs web`. La última línea es tu petición.',
       ok:function(s,u){return u.uso('docker',/logs/)&&/"GET \/ HTTP\/1\.1" 200/.test(u.salida)}},
      {id:'quitar',texto:'Detén el contenedor web y bórralo.',pista:'`docker stop web` y luego `docker rm web`. Con `docker ps -a` compruebas que ya no está.',
       ok:function(s,u){return !c(s,'web')&&u.uso('docker',/rm/)}},
      {id:'vol',texto:'Corre nginx otra vez, pero sirviendo tu carpeta ~/sitio con un volumen.',pista:'`docker run -d --name sitio -p 8080:80 -v ~/sitio:/usr/share/nginx/html nginx` y luego `curl localhost:8080`.',
       ok:function(s,u){var t=(s.leer('/home/ana/sitio/index.html')||'').trim();return u.uso('curl',/8080/)&&!!t&&u.salida.indexOf(t)>=0}}
    ]
  });
};
})();
