/* Laboratorios de la lección «Servidor web con Nginx». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en servidor-web.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: ¿qué bloque responde? ---------- */
AT.labs['sw-bloques']=function(raiz){
  /* En el orden en que nginx los lee: por nombre de archivo */
  var B=[
    {n:'blog',nombres:['blog.local','*.blog.local'],root:'/var/www/blog'},
    {n:'default',nombres:['_'],root:'/var/www/html',def:true},
    {n:'tienda',nombres:['tienda.local','www.tienda.local'],root:'/var/www/tienda'}
  ];
  var H=['tienda.local','www.tienda.local','blog.local','fotos.blog.local','192.168.1.10','otra.local'],host=H[0];
  $('#sbHost',raiz).innerHTML=H.map(function(h){return '<button class="chip" type="button" data-v="'+h+'" aria-pressed="'+(h===host)+'">'+h+'</button>'}).join('');
  function elegido(def){
    var ex=B.filter(function(b){return b.nombres.indexOf(host)>=0})[0];if(ex)return {b:ex,por:'su server_name tiene el nombre exacto '+host};
    var co=B.filter(function(b){return b.nombres.some(function(n){return n.indexOf('*.')===0&&host.slice(-n.length+1)===n.slice(1)})})[0];
    if(co)return {b:co,por:'coincide con el comodín *.'+co.nombres.filter(function(n){return n.indexOf('*.')===0})[0].slice(2)};
    var d=def?B.filter(function(b){return b.def})[0]:null;
    if(d)return {b:d,por:'ningún server_name coincide, así que responde el default_server',def:true};
    return {b:B[0],por:'ningún server_name coincide y no hay default_server: nginx usa el primer bloque que leyó, el del blog',def:true,sorpresa:true};
  }
  function pintar(){
    var def=$('#sbDef',raiz).checked,r=elegido(def),st=$('#sbStat',raiz);
    $('#sbG',raiz).innerHTML=B.map(function(b){
      return '<div class="sb-b'+(b===r.b?' on':'')+'"><p class="sb-t">sites-enabled/'+b.n+(b===r.b?' <b>responde</b>':'')+'</p><pre>server {\n    listen 80'+(b.def&&def?' default_server':'')+';\n    server_name '+esc(b.nombres.join(' '))+';\n    root '+b.root+';\n}</pre></div>';
    }).join('');
    st.setAttribute('data-k',r.sorpresa?'warn':'good');
    $('#sbMsg',raiz).textContent='Host: '+host+'. Responde el bloque '+r.b.n+' porque '+r.por+'. Entrega '+r.b.root+'/index.html.'+(r.sorpresa?' Por eso siempre conviene marcar un default_server.':'');
  }
  elegir('#sbHost',function(v){host=v;pintar()});
  $('#sbDef',raiz).addEventListener('change',pintar);
  pintar();
};

/* ---------- Demo 2: tu primer sitio con nginx ---------- */
var PRODUCTOS=[{id:5,nombre:'Teclado mecánico',precio:899},{id:7,nombre:'Mouse inalámbrico',precio:289}];
AT.labs['sw-terminal']=function(raiz){
  var U=AT.terminal.util;
  function pagina(s){var t=s.leer('/var/www/tienda/index.html');return t?t.trim():''}
  AT.terminal($('.term-host',raiz),{
    clave:'sw-terminal',
    sugerencias:['curl localhost','cat /etc/nginx/sites-available/tienda','sudo nginx -t'],
    preparar:function(s){
      U.instalar(s,'nginx');
      s.poner('/etc/nginx/sites-available/tienda','server {\n\tlisten 80;\n\tserver_name tienda.local;\n\n\troot /var/www/tienda\n\tindex index.html;\n\n\tlocation / {\n\t\ttry_files $uri $uri/ =404;\n\t}\n}\n');
      s.poner('/opt/tienda/server.js','// API de la tienda: escucha solo en 127.0.0.1:3000\nconst http = require("http");\n// ...\n',{u:'www-data',g:'www-data',modo:0o644});
      s.servicio('tienda-api',{desc:'API de la tienda (Node.js)',cmd:'node /opt/tienda/server.js',nombreProc:'node',u:'www-data',activo:true,habilitado:true,puertos:[3000],local:true,mem:'38.2M'});
      s.red.web[3000]=function(req){
        var r=req.ruta.replace(/\?.*$/,'').replace(/^\/api/,'');
        if(r==='/productos'||r==='/productos/')return U.respuesta(200,JSON.stringify(PRODUCTOS,null,2)+'\n',{'Content-Type':'application/json','X-Powered-By':'Express'});
        return U.respuesta(404,JSON.stringify({error:'No existe '+r})+'\n',{'Content-Type':'application/json','X-Powered-By':'Express'});
      };
    },
    tareas:[
      {id:'default',texto:'Comprueba que nginx responde en esta computadora.',pista:'`curl localhost`. Responde la página de bienvenida de nginx: es el sitio default.',
       ok:function(s,u){return u.uso('curl',/localhost|127\.0\.0\.1/)&&/Welcome to nginx/.test(u.salida)}},
      {id:'pagina',texto:'Crea la carpeta /var/www/tienda con un index.html.',pista:'`sudo mkdir -p /var/www/tienda` y luego `echo "<h1>Tienda de Ana</h1>" | sudo tee /var/www/tienda/index.html`.',
       ok:function(s){return !!pagina(s)}},
      {id:'activar',texto:'Activa el sitio de la tienda.',pista:'`sudo ln -s /etc/nginx/sites-available/tienda /etc/nginx/sites-enabled/`.',
       ok:function(s){return !!s.nodo('/etc/nginx/sites-enabled/tienda')}},
      {id:'probar',texto:'Revisa la configuración, encuentra el error y corrígelo.',pista:'`sudo nginx -t` dice en qué archivo y línea. Ábrelo con `sudo nano /etc/nginx/sites-available/tienda`: a la línea de root le falta el `;`. Vuelve a correr `sudo nginx -t`.',
       ok:function(s,u){return u.uso('nginx',/-t/)&&/test is successful/.test(u.salida)&&!!s.nodo('/etc/nginx/sites-enabled/tienda')}},
      {id:'ver',texto:'Recarga nginx y pide la página de la tienda.',pista:'`sudo systemctl reload nginx` y luego `curl -H "Host: tienda.local" http://localhost`.',
       ok:function(s,u){var t=pagina(s);return u.uso('curl',/tienda\.local/)&&!!t&&u.salida.indexOf(t)>=0}},
      {id:'proxy',texto:'Haz que /api/ llegue a la aplicación del puerto 3000, y pide /api/productos.',pista:'Dentro del bloque server agrega `location /api/ { proxy_pass http://127.0.0.1:3000/; }`. Luego `sudo nginx -t`, `sudo systemctl reload nginx` y `curl -H "Host: tienda.local" http://localhost/api/productos`.',
       ok:function(s,u){return u.uso('curl',/\/api\//)&&/Mouse inalámbrico/.test(u.salida)}}
    ]
  });
};
})();
