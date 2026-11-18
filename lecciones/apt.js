/* Laboratorios de la lección «Instalar software con apt». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en apt.html).
   Los de práctica usan la terminal simulada (assets/js/terminal.js): cada ejercicio se califica solo. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: qué instala apt de verdad ---------- */
AT.labs['ap-deps']=function(raiz){
  /* Dependencias: [nombre, descarga kB, ocupa kB, ¿instalado? (siempre | normal | no), para qué] */
  var C6=['libc6',3200,13000,'siempre','la biblioteca básica de C: la usan casi todos los programas'];
  var Z=['zlib1g',62,170,'siempre','compresión de datos'];
  var PQ={
    nginx:{d:'servidor web',tam:520,ocupa:1497,deps:[['nginx-common',43.4,184,'no','archivos comunes de nginx'],['libssl3t64',1940,4600,'normal','cifrado TLS, para HTTPS'],['libpcre2-8-0',253,680,'siempre','expresiones regulares'],Z,C6]},
    git:{d:'control de versiones',tam:3679,ocupa:21900,deps:[['git-man',1100,2531,'no','los manuales de git'],['liberror-perl',25.6,79,'no','manejo de errores para Perl'],['libcurl3t64-gnutls',333,946,'normal','descargas por HTTPS'],['perl',232,690,'normal','el lenguaje Perl, que usan algunas partes de git'],['libexpat1',59,250,'normal','leer XML'],Z,C6]},
    htop:{d:'visor de procesos',tam:171,ocupa:434,deps:[['libnl-3-200',60.4,207,'no','hablar con el kernel por netlink'],['libnl-genl-3-200',12.2,62,'no','netlink genérico'],['libncursesw6',134,400,'siempre','dibujar interfaces dentro de la terminal'],C6]},
    vlc:{d:'reproductor de video',tam:3.7,ocupa:22,deps:[['vlc-bin',12,80,'no','el programa vlc'],['vlc-plugin-base',2900,12500,'no','formatos de audio y video'],['vlc-plugin-qt',1300,4000,'no','las ventanas de VLC'],['libvlccore9',600,2100,'no','el motor de VLC'],['libavcodec60',6000,15000,'no','decodificar video (viene de FFmpeg)'],['libqt5widgets5t64',2600,7600,'normal','botones y ventanas'],['libpulse0',290,1100,'normal','sonido'],C6]}
  };
  var pq='nginx',min=false;
  function kb(n){return n>=1000?(n/1000).toFixed(1).replace('.',',')+' MB':String(Math.round(n*10)/10).replace('.',',')+' kB'}
  function falta(d,minimo){return d[3]==='no'||(minimo&&d[3]==='normal')}
  function pintar(){
    var P=PQ[pq],nuevos=P.deps.filter(function(d){return falta(d,min)});
    var des=P.tam+nuevos.reduce(function(a,d){return a+d[1]},0),dis=P.ocupa+nuevos.reduce(function(a,d){return a+d[2]},0);
    $('#adArbol',raiz).innerHTML='<li class="ad-r"><code>'+pq+'</code><span>'+esc(P.d)+'</span><em>'+kb(P.tam)+'</em><b class="ad-tag nuevo">Lo pediste</b></li>'+
      P.deps.map(function(d,i){var f=falta(d,min);return '<li class="ad-d'+(f?'':' ya')+'"><span class="ad-rama" aria-hidden="true">'+(i===P.deps.length-1?'└─':'├─')+'</span><code>'+d[0]+'</code><span>'+esc(d[4])+'</span><em>'+(f?kb(d[1]):'')+'</em><b class="ad-tag'+(f?' nuevo':'')+'">'+(f?'Se instala':'Ya instalado')+'</b></li>'}).join('');
    $('#adN',raiz).textContent=String(nuevos.length+1);
    $('#adDes',raiz).textContent=kb(des);
    $('#adDisco',raiz).textContent=kb(dis);
    var extra=nuevos.map(function(d){return d[0]}),todos=extra.concat([pq]).sort();
    $('#adSal',raiz).textContent=(extra.length?'Se instalarán los siguientes paquetes adicionales:\n  '+extra.join(' ')+'\n':'')+
      'Se instalarán los siguientes paquetes NUEVOS:\n  '+todos.join(' ')+'\n0 actualizados, '+todos.length+' nuevos se instalarán, 0 para eliminar y 0 no actualizados.\n'+
      'Se necesita descargar '+kb(des)+' de archivos.\nSe utilizarán '+kb(dis)+' de espacio de disco adicional después de esta operación.'+(extra.length?'\n¿Desea continuar? [S/n]':'');
    var otro=P.deps.filter(function(d){return falta(d,!min)}).length;
    $('#adMsg',raiz).textContent=min?
      'En un servidor mínimo faltan más bibliotecas: '+pq+' necesita '+nuevos.length+' paquetes extra, contra '+otro+' en un Ubuntu normal. Por eso los servidores pequeños descargan más la primera vez.':
      'Pediste un paquete y apt instala '+(nuevos.length+1)+'. Las bibliotecas que ya tienes (como libc6) no se descargan otra vez: las comparten todos los programas.'+(extra.length?' Como hay paquetes adicionales, apt pregunta antes de seguir.':'');
  }
  elegir('#adPq',function(v){pq=v;pintar()});
  $('#adMin',raiz).addEventListener('change',function(e){min=e.target.checked;pintar()});
  pintar();
};

/* ---------- Demo 2: instala tus herramientas ---------- */
AT.labs['ap-herramientas']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'ap-herramientas',
    host:'servidor',
    listas:false,
    sugerencias:['tree','apt list --installed'],
    tareas:[
      {id:'falta',texto:'Intenta usar el comando `tree`. Todavía no está instalado.',pista:'Escribe `tree`. La terminal te dice qué paquete lo trae.',
       ok:function(s,u){return u.uso('tree')&&u.codigo===127}},
      {id:'intento',texto:'Intenta instalarlo con `sudo apt install tree`.',pista:'`sudo apt install tree`. En un servidor nuevo, apt todavía no conoce ningún paquete.',
       ok:function(s,u){return u.uso('apt',/install\b.*\btree\b/)}},
      {id:'update',texto:'Descarga la lista de paquetes.',pista:'`sudo apt update`. Fíjate en el aviso del final: hay paquetes que se pueden actualizar.',
       ok:function(s){return s.listas}},
      {id:'tree',texto:'Ahora sí: instala `tree` y úsalo para ver tu carpeta.',pista:'`sudo apt install tree` y luego `tree`.',
       ok:function(s,u){return s.instalado('tree')&&u.uso('tree')&&u.codigo===0}},
      {id:'buscar',texto:'Busca un visor de procesos con `apt search`.',pista:'`apt search procesos` (buscar no necesita sudo).',
       ok:function(s,u){return u.uso('apt',/search/)}},
      {id:'show',texto:'Mira los detalles de `htop`: ¿cuánto ocupa y qué necesita?',pista:'`apt show htop`. Busca las líneas Installed-Size y Depends.',
       ok:function(s,u){return u.uso('apt',/show\s+htop/)}},
      {id:'htop',texto:'Instala `htop` y ejecútalo.',pista:'`sudo apt install htop` (pulsa Enter cuando pregunte si deseas continuar) y luego `htop`.',
       ok:function(s,u){return s.instalado('htop')&&u.uso('htop')}},
      {id:'upgrade',texto:'Instala las versiones nuevas de los paquetes que ya tenías.',pista:'`sudo apt upgrade`. Antes puedes ver cuáles son con `apt list --upgradable`.',
       ok:function(s,u){return u.uso('apt',/upgrade/)&&u.codigo===0&&/Configurando/.test(u.salida)}}
    ]
  });
};

/* ---------- Demo 3: instala un servidor web ---------- */
AT.labs['ap-nginx']=function(raiz){
  var IDX='/var/www/html/index.html';
  AT.terminal($('.term-host',raiz),{
    clave:'ap-nginx',
    host:'servidor',
    sugerencias:['curl localhost','ss -tln','ls /var/www/html'],
    tareas:[
      {id:'instalar',texto:'Instala `nginx`. Fíjate en el paquete adicional que agrega apt.',pista:'`sudo apt install nginx` y pulsa Enter cuando pregunte «¿Desea continuar?».',
       ok:function(s){return s.instalado('nginx')}},
      {id:'status',texto:'Revisa que el servicio quedó encendido.',pista:'`systemctl status nginx`. Debe decir active (running).',
       ok:function(s,u){var v=s.servicio('nginx');return u.uso('systemctl',/status\s+nginx/)&&!!v&&v.activo}},
      {id:'curl',texto:'Pide la página a tu propio servidor con `curl localhost`.',pista:'`curl localhost`. Verás el HTML de la página de bienvenida de nginx.',
       ok:function(s,u){return u.uso('curl')&&/Welcome to nginx/.test(u.salida)}},
      {id:'puerto',texto:'Comprueba que espera visitas en el puerto 80.',pista:'`ss -tln` y busca `:80`.',
       ok:function(s,u){return u.uso('ss')&&/:80\b/.test(u.salida)}},
      {id:'pagina',texto:'Escribe tu propia página en `/var/www/html/index.html`.',pista:'La carpeta es de root. Opción 1: `sudo nano /var/www/html/index.html`, escribe y guarda con Ctrl+O. Opción 2: `echo "<h1>Hola desde mi servidor</h1>" | sudo tee /var/www/html/index.html`.',
       ok:function(s){return (s.leer(IDX)||'').trim().length>0}},
      {id:'ver',texto:'Pide la página otra vez: ahora debe salir la tuya.',pista:'`curl localhost`. nginx busca primero index.html, así que ya no sale la de bienvenida.',
       ok:function(s,u){var t=(s.leer(IDX)||'').trim().split('\n')[0];return u.uso('curl')&&!!t&&u.salida.indexOf(t)>=0}},
      {id:'quitar',texto:'Desinstala nginx y quita también lo que ya no se usa.',pista:'`sudo apt remove nginx` y después `sudo apt autoremove` (se lleva nginx-common).',
       ok:function(s){return !s.instalado('nginx')&&!s.instalado('nginx-common')}}
    ]
  });
};
})();
