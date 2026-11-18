/* Laboratorios de la lección «HTTP y HTTPS». La API de la tienda (tienda) la usan tanto el laboratorio visual
   como la terminal simulada, que la sirve en api.tienda.example. Cada laboratorio se registra en AT.labs. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

var PRODUCTOS=[{id:5,nombre:'Teclado mecánico',precio:899},{id:6,nombre:'Monitor 24"',precio:2799},{id:7,nombre:'Mouse inalámbrico',precio:289}];
var FRASE={200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',405:'Method Not Allowed'};
function json(o){return JSON.stringify(o,null,2)+'\n'}
function cab(req,n){n=n.toLowerCase();for(var k in req.cab)if(k.toLowerCase()===n)return req.cab[k];return null}
/* La API: recibe {metodo, ruta, cab, cuerpo, esquema} y devuelve {estado, cab, cuerpo} */
function tienda(req){
  var J={'Content-Type':'application/json'};
  function r(e,o,c){var h={};for(var k in J)h[k]=J[k];for(var k2 in c||{})h[k2]=c[k2];return {estado:e,cab:h,cuerpo:o==null?'':json(o)}}
  if(req.esquema==='http')return {estado:301,cab:{Location:'https://api.tienda.example'+req.ruta,'Content-Type':'text/html'},cuerpo:'<html><body>301 Moved Permanently</body></html>\n'};
  var ruta=req.ruta.replace(/\?.*$/,'').replace(/\/$/,'')||'/',m=ruta.match(/^\/productos(?:\/(\d+))?$/),tok=cab(req,'Authorization');
  if(ruta==='/'&&req.metodo==='GET')return r(200,{api:'Tienda de ejemplo',rutas:['/productos','/productos/{id}']});
  if(!m)return r(404,{error:'No existe la ruta '+ruta});
  var id=m[1]?+m[1]:null,p=PRODUCTOS.filter(function(x){return x.id===id})[0];
  var permite=id==null?'GET, POST':'GET, DELETE';
  if(permite.indexOf(req.metodo)<0&&req.metodo!=='HEAD')return r(405,{error:'Esta ruta no acepta '+req.metodo},{Allow:permite});
  if(req.metodo==='GET'||req.metodo==='HEAD'){
    if(id==null)return r(200,PRODUCTOS);
    return p?r(200,p):r(404,{error:'No existe el producto '+id});
  }
  if(!tok)return r(401,{error:'Falta el token. Agrega el encabezado Authorization: Bearer <token>'},{'WWW-Authenticate':'Bearer'});
  if(tok!=='Bearer demo123')return r(401,{error:'Token inválido'},{'WWW-Authenticate':'Bearer error="invalid_token"'});
  if(req.metodo==='DELETE')return p?r(403,{error:'Tu token puede leer y crear productos, pero no borrarlos'}):r(404,{error:'No existe el producto '+id});
  var d=null;try{d=JSON.parse(req.cuerpo||'')}catch(e){}
  if(!d||typeof d.nombre!=='string'||typeof d.precio!=='number')return r(400,{error:'El cuerpo debe ser JSON con nombre (texto) y precio (número)'});
  return r(201,{id:8,nombre:d.nombre,precio:d.precio},{Location:'/productos/8'});
}

/* ---------- Demo 1: ¿qué código responde? ---------- */
AT.labs['ht-codigos']=function(raiz){
  var Q=[
    ['Pides la página de inicio de un sitio y todo sale bien.',200,'200 OK: la petición funcionó y la respuesta trae la página.'],
    ['Mandas un formulario de registro y el servidor crea tu cuenta.',201,'201 Created: se creó algo nuevo. Suele traer un Location con la dirección de lo creado.'],
    ['Escribes mal la dirección: /prodcutos en lugar de /productos.',404,'404 Not Found: no hay nada en esa ruta.'],
    ['Entras a http://banco.example y el servidor te manda a la versión https:// para siempre.',301,'301 Moved Permanently: «ahora vive en otra dirección». El navegador la recuerda.'],
    ['Pides tus pedidos en una API, pero olvidaste mandar el token.',401,'401 Unauthorized: el servidor no sabe quién eres.'],
    ['Ya iniciaste sesión como estudiante e intentas entrar al panel de administración.',403,'403 Forbidden: sabe quién eres, pero no tienes permiso.'],
    ['Tu programa hace 500 peticiones por segundo y el servidor te frena.',429,'429 Too Many Requests: rebasaste el límite. Espera y vuelve a intentar más despacio.'],
    ['El programa del servidor tiene un error y truena al procesar tu petición.',500,'500 Internal Server Error: el problema está del lado del servidor.'],
    ['nginx funciona, pero la aplicación a la que le pasa las peticiones está apagada.',502,'502 Bad Gateway: el intermediario (proxy) no pudo hablar con el servidor de atrás.'],
    ['El navegador ya tiene una copia de un logo y pregunta si cambió. No cambió.',304,'304 Not Modified: usa tu copia; no hace falta bajarlo otra vez.']
  ];
  var OPS=[200,201,301,304,401,403,404,429,500,502],i=0,bien=0,resp=null;
  function pintar(){
    var q=Q[i],st=$('#hcStat',raiz);
    $('#hcQ',raiz).textContent=(i+1)+'. '+q[0];
    $('#hcOps',raiz).innerHTML=OPS.map(function(c){return '<button class="chip" type="button" data-v="'+c+'" aria-pressed="'+(resp===c)+'"'+(resp!=null?' aria-disabled="true"':'')+'>'+c+'</button>'}).join('');
    if(resp==null){st.setAttribute('data-k','');$('#hcMsg',raiz).textContent='Elige un código.'}
    else{st.setAttribute('data-k',resp===q[1]?'good':'bad');$('#hcMsg',raiz).textContent=(resp===q[1]?'¡Correcto! ':'No: es '+q[1]+'. ')+q[2]}
    $('#hcPunt',raiz).textContent=bien+' de '+(i+(resp!=null?1:0))+' bien';
    $('#hcSig',raiz).textContent=i===Q.length-1&&resp!=null?'Empezar de nuevo':'Siguiente situación';
    $('#hcSig',raiz).setAttribute('aria-disabled',resp==null?'true':'false');
  }
  $('#hcOps',raiz).addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b||resp!=null)return;
    resp=+b.getAttribute('data-v');if(resp===Q[i][1])bien++;pintar();$('#hcSig',raiz).focus();
  });
  $('#hcSig',raiz).addEventListener('click',function(){
    if(resp==null)return;
    if(i===Q.length-1){i=0;bien=0}else i++;
    resp=null;pintar();
  });
  pintar();
};

/* ---------- Demo 2: arma una petición ---------- */
AT.labs['ht-arma']=function(raiz){
  var met='GET',ruta='/productos',CUERPO='{"nombre": "Audífonos", "precio": 649}';
  var EXPL={200:'Todo bien: la respuesta trae los datos en JSON.',201:'Se creó el producto. El encabezado Location dice dónde quedó.',
    401:'Sin token, el servidor no sabe quién eres. Marca «Mandar mi token».',403:'Ya sabe quién eres, pero tu token no tiene permiso para borrar.',
    404:'No hay ningún producto con ese número.',405:'Esa ruta no acepta ese método: el encabezado Allow dice cuáles sí.',400:'Faltan datos en el cuerpo.'};
  function pintar(){
    var tok=$('#haTok',raiz).checked,req={metodo:met,ruta:ruta,cab:{},cuerpo:met==='POST'||met==='PUT'?CUERPO:'',esquema:'https'};
    if(tok)req.cab.Authorization='Bearer demo123';
    var pet=met+' '+ruta+' HTTP/1.1\nHost: api.tienda.example\nAccept: application/json\n'+(tok?'Authorization: Bearer demo123\n':'')+(req.cuerpo?'Content-Type: application/json\n\n'+req.cuerpo:'');
    var r=tienda(req),k=Object.keys(r.cab);
    $('#haPet',raiz).textContent=pet;
    $('#haRes',raiz).textContent='HTTP/1.1 '+r.estado+' '+FRASE[r.estado]+'\n'+k.map(function(h){return h+': '+r.cab[h]}).join('\n')+'\n\n'+r.cuerpo;
    var st=$('#haStat',raiz);st.setAttribute('data-k',r.estado<300?'good':r.estado<500?'bad':'warn');
    $('#haMsg',raiz).textContent=r.estado+' '+FRASE[r.estado]+'. '+(EXPL[r.estado]||'');
  }
  elegir('#haMet',function(v){met=v;pintar()});
  elegir('#haRuta',function(v){ruta=v;pintar()});
  $('#haTok',raiz).addEventListener('change',pintar);
  pintar();
};

/* ---------- Demo 3: la API con curl ---------- */
AT.labs['ht-curl']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'ht-curl',
    sugerencias:['curl https://api.tienda.example/productos','curl -i http://api.tienda.example/productos'],
    preparar:function(s){
      s.red.dns['api.tienda.example']={A:['203.0.113.80']};
      s.red.web['203.0.113.80']=tienda;
    },
    tareas:[
      {id:'get',texto:'Pide la lista de productos de la API.',pista:'`curl https://api.tienda.example/productos`. La respuesta es JSON.',
       ok:function(s,u){return u.uso('curl',/api\.tienda\.example\/productos/)&&/Mouse inalámbrico/.test(u.salida)}},
      {id:'r301',texto:'Pide lo mismo con http:// y mira la línea de estado y los encabezados.',pista:'`curl -i http://api.tienda.example/productos`. Responde 301 y el encabezado Location dice a dónde ir. Con `-L`, curl lo sigue solo.',
       ok:function(s,u){return u.uso('curl',/http:\/\//)&&/HTTP\/2 301/.test(u.salida)}},
      {id:'r404',texto:'Pide el producto 99 y mira el código de estado.',pista:'`curl -i https://api.tienda.example/productos/99`. Ese producto no existe: 404.',
       ok:function(s,u){return u.uso('curl',/productos\/99/)&&/HTTP\/2 404/.test(u.salida)}},
      {id:'r401',texto:'Intenta crear un producto con POST, sin token.',pista:'`curl -i -X POST https://api.tienda.example/productos -d \'{"nombre":"Tapete","precio":150}\'`. Responde 401.',
       ok:function(s,u){return u.uso('curl')&&/HTTP\/2 401/.test(u.salida)}},
      {id:'r201',texto:'Créalo ahora con tu token en el encabezado Authorization.',pista:'Agrega `-H "Authorization: Bearer demo123"` al comando anterior. Responde 201 Created.',
       ok:function(s,u){return u.uso('curl',/Authorization/i)&&/HTTP\/2 201/.test(u.salida)}},
      {id:'r405',texto:'Prueba el método PUT sobre /productos/7. ¿Qué métodos acepta esa ruta?',pista:'`curl -i -X PUT https://api.tienda.example/productos/7`. El encabezado Allow los dice.',
       ok:function(s,u){return u.uso('curl',/PUT/)&&/HTTP\/2 405/.test(u.salida)}}
    ]
  });
};
})();
