#!/usr/bin/env node
/* OneBook: servidor local para una oficina. Sirve el sitio y guarda los datos de todos los dispositivos de la red
   (sin internet y sin servicios de terceros). Solo usa Node (18 o más nuevo), sin paquetes que instalar.

   node servidor/servidor.js                         https en el puerto 8443 con el certificado de servidor/certificado/
   node servidor/servidor.js --http --puerto 8080    sin certificado (solo para probar: sin app instalable ni Cedis)
   Opciones: --puerto N, --datos carpeta, --cert archivo.pem, --llave archivo-key.pem, --http, --clave ABCD-EFGH,
             --nombre "Oficina", --sin-respaldos.

   - Datos: servidor/datos/ (o --datos): almacenes/<almacén>.json = {id: {d, t, seq, por}} (d null = borrado) y
     estado.json = {id, nombre, clave, seq, creado}. Se escriben de forma atómica (archivo temporal y renombrar).
     Respaldos: una copia al arrancar y cada 24 horas en datos/respaldos/ (se quedan las últimas 14).
   - Clave de la oficina: cada dispositivo la escribe una vez para conectarse (se genera la primera vez y se muestra
     al arrancar). Va en la cabecera X-OneBook-Clave (o en ?clave= para los eventos).
   - API (todo JSON):
       GET  /api/estado                 {app, servidor, nombre}: sin clave, para saber que hay servidor
       POST /api/conectar {clave}       {ok, nombre, vacio, seq}
       GET  /api/cambios?desde=N        {seq, cambios:[{a, id, d, t, seq, por}], mas}
       POST /api/cambios {dispositivo, cambios:[{a, id, d, t}]}
                                        gana el cambio más reciente (t); los rechazados vuelven con lo que hay
       POST /api/presencia {dispositivo, nombre, quien, entradas:[{doc, modo, toma}]}
                                        quién tiene abierta cada página en cada dispositivo (vence a los 45 s)
       GET  /api/eventos                eventos del servidor: «cambios» {seq, por} y «presencia» [entradas]
   - Las páginas HTML llevan <meta name="onebook-servidor">: así assets/js/sincro.js sabe que hay servidor. «/» va
     a inicio.html. Solo se sirve el sitio (no las pruebas, ni este servidor, ni la documentación). */
'use strict';
const http=require('http'),https=require('https'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');

/* ---------- Opciones ---------- */
function opcion(nombre,def){const i=process.argv.indexOf('--'+nombre);if(i<0)return def;const v=process.argv[i+1];return v&&!v.startsWith('--')?v:true}
const RAIZ=path.resolve(__dirname,'..');
const DATOS=path.resolve(String(opcion('datos',path.join(__dirname,'datos'))));
const CERT=String(opcion('cert',path.join(__dirname,'certificado','onebook.pem')));
const LLAVE=String(opcion('llave',path.join(__dirname,'certificado','onebook-key.pem')));
const HAY_CERT=!opcion('http',false)&&fs.existsSync(CERT)&&fs.existsSync(LLAVE);
const PUERTO=parseInt(opcion('puerto',HAY_CERT?8443:8080),10);
const RESPALDOS=!opcion('sin-respaldos',false);
const ALMACENES=['documentos','plantillas','papelera','bases','filas','historial','ls'];
const LS_PERMITIDAS=['empresa','perfil','folios','cedis'];
const VIDA_PRESENCIA=45e3,MAX_CUERPO=60*1024*1024;

/* ---------- Datos ---------- */
fs.mkdirSync(path.join(DATOS,'almacenes'),{recursive:true});
function leerJSON(f,def){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return def}}
function escribirJSON(f,o){const tmp=f+'.tmp';fs.writeFileSync(tmp,JSON.stringify(o));fs.renameSync(tmp,f)}
function claveNueva(){const L='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const b=crypto.randomBytes(8);let s='';for(let i=0;i<8;i++){s+=L[b[i]%L.length];if(i===3)s+='-'}return s}
const FEST=path.join(DATOS,'estado.json');
const estado=leerJSON(FEST,null)||{id:'srv-'+crypto.randomBytes(6).toString('hex'),nombre:'OneBook de la oficina',clave:claveNueva(),seq:0,creado:new Date().toISOString()};
if(typeof opcion('clave',null)==='string')estado.clave=String(opcion('clave'));
if(typeof opcion('nombre',null)==='string')estado.nombre=String(opcion('nombre'));
escribirJSON(FEST,estado);
const datos={};
ALMACENES.forEach(function(a){datos[a]=leerJSON(path.join(DATOS,'almacenes',a+'.json'),{})});
/* Escritura diferida: los almacenes que cambiaron se guardan juntos poco después */
const sucios=new Set();let tGuardar=null;
function guardarPronto(a){sucios.add(a);clearTimeout(tGuardar);tGuardar=setTimeout(guardarYa,250)}
function guardarYa(){
  clearTimeout(tGuardar);tGuardar=null;
  sucios.forEach(function(a){escribirJSON(path.join(DATOS,'almacenes',a+'.json'),datos[a])});
  sucios.clear();escribirJSON(FEST,estado);
}
function vacio(){return ALMACENES.every(function(a){return !Object.keys(datos[a]).some(function(id){return datos[a][id].d!=null})})}

/* ---------- Respaldos ---------- */
function respaldar(){
  if(!RESPALDOS)return;
  try{
    guardarYa();
    const d=new Date(),z=function(n){return (n<10?'0':'')+n};
    const nombre=d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes());
    const dir=path.join(DATOS,'respaldos',nombre);
    fs.mkdirSync(dir,{recursive:true});
    ALMACENES.concat(['../estado']).forEach(function(a){const f=path.join(DATOS,'almacenes',a+'.json');if(fs.existsSync(f))fs.copyFileSync(f,path.join(dir,path.basename(f)))});
    const todos=fs.readdirSync(path.join(DATOS,'respaldos')).sort();
    todos.slice(0,Math.max(0,todos.length-14)).forEach(function(x){fs.rmSync(path.join(DATOS,'respaldos',x),{recursive:true,force:true})});
  }catch(e){console.error('No se pudo hacer el respaldo:',e.message)}
}

/* ---------- Eventos (Server-Sent Events) y presencia ---------- */
const clientes=new Set();
function emitir(evento,obj){const t='event: '+evento+'\ndata: '+JSON.stringify(obj)+'\n\n';clientes.forEach(function(r){try{r.write(t)}catch(e){}})}
setInterval(function(){clientes.forEach(function(r){try{r.write(': latido\n\n')}catch(e){}})},25e3);
const presencias=new Map();
function listaPresencia(){
  const ahora=Date.now(),l=[];
  presencias.forEach(function(p,disp){if(ahora-p.t>VIDA_PRESENCIA){presencias.delete(disp);return}p.entradas.forEach(function(e){l.push({dispositivo:disp,nombre:p.nombre,quien:p.quien,doc:e.doc,modo:e.modo,desde:e.desde,tomo:e.tomo,t:p.t})})});
  return l;
}
let presFirma='';
function emitirPresencia(){const l=listaPresencia(),f=JSON.stringify(l.map(function(x){return [x.dispositivo,x.doc,x.modo,x.desde,x.quien&&x.quien.id]}));if(f!==presFirma){presFirma=f;emitir('presencia',l)}}
setInterval(emitirPresencia,10e3);

/* ---------- HTTP ---------- */
const TIPOS={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
function responder(res,codigo,obj){const b=JSON.stringify(obj);res.writeHead(codigo,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(b)}
function cuerpo(req){
  return new Promise(function(ok,no){
    let n=0;const partes=[];
    req.on('data',function(c){n+=c.length;if(n>MAX_CUERPO){no(new Error('Demasiado grande'));req.destroy();return}partes.push(c)});
    req.on('end',function(){try{ok(JSON.parse(Buffer.concat(partes).toString('utf8')||'{}'))}catch(e){no(e)}});
    req.on('error',no);
  });
}
function igual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function autorizado(req,url){return igual(req.headers['x-onebook-clave']||url.searchParams.get('clave'),estado.clave)}
function idValido(id){return typeof id==='string'&&id.length>0&&id.length<=120&&/^[\w.:-]+$/.test(id)}

async function api(req,res,url){
  const ruta=url.pathname.replace(/^\/api\//,'');
  if(ruta==='estado'&&req.method==='GET')return responder(res,200,{app:'OneBook',servidor:true,nombre:estado.nombre});
  if(ruta==='conectar'&&req.method==='POST'){
    const b=await cuerpo(req);
    if(!igual(b.clave,estado.clave))return responder(res,200,{ok:false});
    return responder(res,200,{ok:true,id:estado.id,nombre:estado.nombre,vacio:vacio(),seq:estado.seq});
  }
  if(!autorizado(req,url))return responder(res,401,{error:'Falta la clave de la oficina o no es correcta.'});
  if(ruta==='cambios'&&req.method==='GET'){
    const desde=parseInt(url.searchParams.get('desde')||'0',10)||0,limite=Math.min(5000,parseInt(url.searchParams.get('limite')||'2000',10)||2000);
    const l=[];
    ALMACENES.forEach(function(a){Object.keys(datos[a]).forEach(function(id){const r=datos[a][id];if(r.seq>desde)l.push({a:a,id:id,d:r.d,t:r.t,seq:r.seq,por:r.por||''})})});
    l.sort(function(x,y){return x.seq-y.seq});
    const parte=l.slice(0,limite);
    return responder(res,200,{seq:parte.length<l.length?parte[parte.length-1].seq:estado.seq,cambios:parte,mas:parte.length<l.length,id:estado.id});
  }
  if(ruta==='cambios'&&req.method==='POST'){
    const b=await cuerpo(req),disp=String(b.dispositivo||'').slice(0,60),rechazados=[];let n=0;
    (Array.isArray(b.cambios)?b.cambios:[]).forEach(function(c){
      if(!c||ALMACENES.indexOf(c.a)<0||!idValido(c.id))return;
      if(c.a==='ls'&&LS_PERMITIDAS.indexOf(c.id)<0)return;
      const t=typeof c.t==='string'?c.t:new Date().toISOString(),ant=datos[c.a][c.id];
      /* Gana el cambio más reciente: uno más viejo que lo que hay se rechaza y se devuelve lo que hay */
      if(ant&&ant.t>t){rechazados.push({a:c.a,id:c.id,d:ant.d,t:ant.t,seq:ant.seq});return}
      if(ant&&JSON.stringify(ant.d)===JSON.stringify(c.d===undefined?null:c.d))return;
      datos[c.a][c.id]={d:c.d===undefined?null:c.d,t:t,seq:++estado.seq,por:disp};
      guardarPronto(c.a);n++;
    });
    if(n)emitir('cambios',{seq:estado.seq,por:disp});
    return responder(res,200,{seq:estado.seq,aceptados:n,rechazados:rechazados});
  }
  if(ruta==='presencia'&&req.method==='POST'){
    const b=await cuerpo(req),disp=String(b.dispositivo||'').slice(0,60);
    if(disp){
      const ant=presencias.get(disp),ahora=Date.now();
      const entradas=(Array.isArray(b.entradas)?b.entradas:[]).filter(function(e){return e&&idValido(e.doc)}).slice(0,20).map(function(e){
        const modo=e.modo==='editar'?'editar':'leer',viejo=ant&&ant.entradas.filter(function(x){return x.doc===e.doc&&x.modo===modo})[0];
        return {doc:e.doc,modo:modo,desde:viejo&&!e.toma?viejo.desde:ahora,tomo:e.toma?true:viejo?!!viejo.tomo:false};
      });
      presencias.set(disp,{t:ahora,nombre:String(b.nombre||'').slice(0,60),quien:b.quien&&typeof b.quien==='object'?{id:String(b.quien.id||'').slice(0,60),nombre:String(b.quien.nombre||'').slice(0,80)}:null,entradas:entradas});
      emitirPresencia();
    }
    return responder(res,200,{presencias:listaPresencia()});
  }
  if(ruta==='eventos'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write('retry: 3000\n\n');
    res.write('event: hola\ndata: '+JSON.stringify({seq:estado.seq,id:estado.id})+'\n\n');
    res.write('event: presencia\ndata: '+JSON.stringify(listaPresencia())+'\n\n');
    clientes.add(res);
    req.on('close',function(){clientes.delete(res)});
    return;
  }
  return responder(res,404,{error:'No existe.'});
}

/* Solo se sirve el sitio: las páginas de la raíz, assets/, el manifiesto y el service worker */
function archivoPermitido(rel){
  if(rel.split('/').some(function(p){return p.startsWith('.')}))return false;
  if(rel.startsWith('assets/'))return true;
  return /^[\w-]+\.(html|webmanifest)$/.test(rel)||rel==='sw.js';
}
function estatico(req,res,url){
  let rel=decodeURIComponent(url.pathname).replace(/^\/+/,'');
  if(rel===''){res.writeHead(302,{Location:'inicio.html'});res.end();return}
  rel=path.posix.normalize(rel);
  const f=path.join(RAIZ,rel);
  if(!f.startsWith(RAIZ+path.sep)||!archivoPermitido(rel)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('No existe.');return}
  const ext=path.extname(f).toLowerCase(),cab={'Content-Type':TIPOS[ext]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
  if(ext==='.html'){
    /* La marca para sincro.js: esta copia de OneBook viene del servidor de la oficina */
    const t=fs.readFileSync(f,'utf8').replace(/<head>/i,'<head>\n<meta name="onebook-servidor" content="1">');
    res.writeHead(200,cab);res.end(req.method==='HEAD'?'':t);return;
  }
  res.writeHead(200,cab);
  if(req.method==='HEAD'){res.end();return}
  fs.createReadStream(f).pipe(res);
}
async function atender(req,res){
  const url=new URL(req.url,'http://local');
  try{
    if(url.pathname.startsWith('/api/'))return await api(req,res,url);
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
    estatico(req,res,url);
  }catch(e){
    if(!res.headersSent)responder(res,400,{error:e&&e.message||'No se pudo.'});
    else try{res.end()}catch(x){}
  }
}
const servidor=HAY_CERT?https.createServer({cert:fs.readFileSync(CERT),key:fs.readFileSync(LLAVE)},atender):http.createServer(atender);
servidor.listen(PUERTO,'0.0.0.0',function(){
  const ips=[];Object.values(os.networkInterfaces()).forEach(function(l){(l||[]).forEach(function(i){if(i.family==='IPv4'&&!i.internal)ips.push(i.address)})});
  const prot=HAY_CERT?'https':'http';
  console.log('OneBook: servidor de la oficina «'+estado.nombre+'»');
  console.log('  Ábrelo en los dispositivos de la red: '+(ips.length?ips.map(function(ip){return prot+'://'+ip+':'+PUERTO+'/'}).join('  '):prot+'://<ip-de-este-equipo>:'+PUERTO+'/'));
  console.log('  Clave de la oficina: '+estado.clave);
  console.log('  Datos: '+DATOS);
  if(!HAY_CERT)console.log('  Sin certificado (http): sirve para probar, pero no se puede instalar como app ni firmar los pedidos al Cedis. Ver docs/servidor-local.md');
  if(process.send)process.send({listo:true,puerto:PUERTO,clave:estado.clave});
  respaldar();
  setInterval(respaldar,24*3600e3);
});
function salir(){try{guardarYa()}catch(e){}process.exit(0)}
process.on('SIGINT',salir);process.on('SIGTERM',salir);
