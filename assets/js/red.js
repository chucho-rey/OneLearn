/* OneLearn: herramientas de red para los laboratorios.
   AT.ip   Direcciones IPv4 e IPv6: validar, máscaras, subredes, binario, tipos, abreviar IPv6 y EUI-64.
   AT.red  Simulador de red: dibuja una topología (computadoras, switches y routers) en SVG y calcula,
           salto por salto, el camino de un paquete con las tablas de rutas (estáticas o calculadas como OSPF).
   Lo usan las lecciones de subredes, IPv6, enrutamiento y VLAN. Todo el texto se escribe con textContent. */
(function(){
'use strict';
var AT=window.AT;
var NS='http://www.w3.org/2000/svg';

/* ---------- IPv4 ---------- */
var P32=4294967296;
function num(ip){var p=String(ip).trim().split('.');if(p.length!==4)return null;var n=0;for(var i=0;i<4;i++){if(!/^\d{1,3}$/.test(p[i])||+p[i]>255)return null;n=n*256+(+p[i])}return n}
function txt(n){n=((n%P32)+P32)%P32;return [Math.floor(n/16777216)%256,Math.floor(n/65536)%256,Math.floor(n/256)%256,n%256].join('.')}
function bloque(bits){return Math.pow(2,32-bits)}
function mascara(bits){return txt(P32-bloque(bits))}
function bitsDe(m){var n=num(m);if(n===null)return null;for(var b=0;b<=32;b++)if(P32-bloque(b)===n||(b===0&&n===0))return b;return null}
function red(ip,bits){var t=bloque(bits);return txt(Math.floor(num(ip)/t)*t)}
function difusion(ip,bits){var t=bloque(bits);return txt(Math.floor(num(ip)/t)*t+t-1)}
function enRed(ip,r,bits){var a=num(ip),b=num(r);if(a===null||b===null)return false;var t=bloque(bits);return Math.floor(a/t)===Math.floor(b/t)}
function hosts(bits){return bits>=32?1:bits===31?2:bloque(bits)-2}
function binario(ip){return String(ip).split('.').map(function(o){return ('00000000'+(+o).toString(2)).slice(-8)}).join('.')}
function parseCidr(t){
  var m=String(t).trim().match(/^(\d+\.\d+\.\d+\.\d+)\s*(?:\/\s*(\d{1,2})|\s+(\d+\.\d+\.\d+\.\d+))?$/);
  if(!m||num(m[1])===null)return null;
  var b=m[2]!=null?+m[2]:m[3]?bitsDe(m[3]):null;
  if(b===null||b>32)return null;
  return {ip:m[1],bits:b};
}
function tipo(ip){
  var T=[['0.0.0.0',8,'Esta red (no se usa como dirección)'],['127.0.0.0',8,'Loopback: la propia computadora'],['10.0.0.0',8,'Privada (RFC 1918)'],['172.16.0.0',12,'Privada (RFC 1918)'],['192.168.0.0',16,'Privada (RFC 1918)'],
    ['100.64.0.0',10,'Compartida del proveedor (CGNAT)'],['169.254.0.0',16,'Enlace local: no se obtuvo IP por DHCP'],['192.0.2.0',24,'Documentación (para ejemplos)'],['198.51.100.0',24,'Documentación (para ejemplos)'],['203.0.113.0',24,'Documentación (para ejemplos)'],
    ['224.0.0.0',4,'Multidifusión (multicast)'],['240.0.0.0',4,'Reservada']];
  if(ip==='255.255.255.255')return 'Difusión limitada';
  for(var i=0;i<T.length;i++)if(enRed(ip,T[i][0],T[i][1]))return T[i][2];
  return 'Pública';
}
function calcular(ip,bits){
  var r=red(ip,bits),d=difusion(ip,bits),t=bloque(bits);
  var primera=bits>=31?r:txt(num(r)+1),ultima=bits>=31?d:txt(num(d)-1);
  return {ip:ip,bits:bits,mascara:mascara(bits),comodin:txt(t-1),red:r,difusion:d,primera:primera,ultima:ultima,hosts:hosts(bits),total:t,tipo:tipo(ip),binIp:binario(ip),binMascara:binario(mascara(bits))};
}
/* Divide una red en subredes del tamaño pedido */
function dividir(r,bits,nuevos){var out=[],t=bloque(nuevos),n0=num(red(r,bits));for(var k=0;k<Math.pow(2,nuevos-bits)&&k<256;k++)out.push(calcular(txt(n0+k*t),nuevos));return out}
/* El prefijo más pequeño que alcanza para n equipos */
function bitsPara(n){for(var b=30;b>=1;b--)if(hosts(b)>=n)return b;return 1}

/* ---------- IPv6 ---------- */
function expandir6(t){
  t=String(t).trim().toLowerCase().replace(/%.*$/,'').replace(/\/\d+$/,'');
  if(!/^[0-9a-f:]+$/.test(t)||(t.match(/::/g)||[]).length>1||/:::/.test(t))return null;
  var partes;
  if(t.indexOf('::')>=0){
    var a=t.split('::'),izq=a[0]?a[0].split(':'):[],der=a[1]?a[1].split(':'):[];
    if(izq.length+der.length>7)return null;
    partes=izq.concat(new Array(8-izq.length-der.length+1).join('0').split('').map(function(){return '0'}),der);
  }else partes=t.split(':');
  if(partes.length!==8||!partes.every(function(g){return /^[0-9a-f]{1,4}$/.test(g)}))return null;
  return partes.map(function(g){return ('0000'+g).slice(-4)});
}
function comprimir6(t){
  var g=Array.isArray(t)?t:expandir6(t);if(!g)return null;
  var c=g.map(function(x){return x.replace(/^0+(?=.)/,'')});
  var mejor=-1,largo=0;
  for(var i=0;i<8;i++){if(c[i]!=='0')continue;var j=i;while(j<8&&c[j]==='0')j++;if(j-i>largo&&j-i>1){mejor=i;largo=j-i}i=j}
  if(mejor<0)return c.join(':');
  var s=c.slice(0,mejor).join(':')+'::'+c.slice(mejor+largo).join(':');
  return s;
}
function tipo6(t){
  var g=expandir6(t);if(!g)return null;
  var a=parseInt(g[0],16);
  if(g.every(function(x){return x==='0000'}))return 'Sin especificar (::)';
  if(g.slice(0,7).every(function(x){return x==='0000'})&&g[7]==='0001')return 'Loopback (::1): la propia computadora';
  if(g[0]==='2001'&&g[1]==='0db8')return 'Documentación (2001:db8::/32, para ejemplos)';
  if((a&0xffc0)===0xfe80)return 'Enlace local (fe80::/10): solo dentro de la misma red';
  if((a&0xfe00)===0xfc00)return 'Local única (ULA, fc00::/7): privada, como 192.168';
  if((a&0xff00)===0xff00)return 'Multidifusión (ff00::/8)';
  if((a&0xe000)===0x2000)return 'Global (2000::/3): pública, se ve desde internet';
  return 'Reservada';
}
/* Identificador de interfaz EUI-64 a partir de la MAC */
function eui64(mac){
  var b=String(mac).toLowerCase().split(/[:-]/);
  if(b.length!==6||!b.every(function(x){return /^[0-9a-f]{2}$/.test(x)}))return null;
  var p=(parseInt(b[0],16)^2).toString(16);p=('0'+p).slice(-2);
  var g=[p+b[1],b[2]+'ff','fe'+b[3],b[4]+b[5]];
  return {grupos:g,invertido:p,texto:g.map(function(x){return x.replace(/^0+(?=.)/,'')}).join(':')};
}
AT.ip={num:num,texto:txt,mascara:mascara,bitsDe:bitsDe,red:red,difusion:difusion,enRed:enRed,hosts:hosts,binario:binario,parse:parseCidr,tipo:tipo,
  calcular:calcular,dividir:dividir,bitsPara:bitsPara,bloque:bloque,expandir6:expandir6,comprimir6:comprimir6,tipo6:tipo6,eui64:eui64};

/* ---------- Simulador de red ----------
   topo = {nodos:[{id, tipo:'pc'|'router'|'switch'|'servidor'|'nube', nombre, x, y, ifaces:[{n:'eth0', ip, bits}], rutas:[{destino:'10.0.0.0/24', via:'ip'}]}],
           enlaces:[{id, a:'R1', ai:'eth0', b:'SW1'}]}  (ai/bi: la interfaz de cada lado; los switches no tienen IP) */
function Sim(cont,topo,op){
  this.cont=cont;this.topo=topo;this.op=op||{};this.porId={};
  var s=this;topo.nodos.forEach(function(n){s.porId[n.id]=n;n.ifaces=n.ifaces||[];n.rutas=n.rutas||[]});
  topo.enlaces.forEach(function(e){if(e.arriba==null)e.arriba=true});
  this.dibujar();
}
var SP=Sim.prototype;
SP.el=function(tag,at,padre){var e=document.createElementNS(NS,tag);for(var k in at)e.setAttribute(k,at[k]);if(padre)padre.appendChild(e);return e};
SP.dibujar=function(){
  var s=this,t=s.topo,w=t.ancho||640,h=t.alto||300;
  s.cont.textContent='';
  var svg=s.el('svg',{viewBox:'0 0 '+w+' '+h,'class':'rd-svg',role:'img','aria-label':s.op.titulo||'Diagrama de la red'},s.cont);
  s.svg=svg;s.lineas={};s.grupos={};
  t.enlaces.forEach(function(e){
    var A=s.porId[e.a],B=s.porId[e.b];
    var g=s.el('g',{'class':'rd-enl'+(e.arriba?'':' caido'),'data-enlace':e.id},svg);
    s.el('line',{x1:A.x,y1:A.y,x2:B.x,y2:B.y},g);
    if(e.etiqueta){var tx=s.el('text',{x:(A.x+B.x)/2,y:(A.y+B.y)/2-6,'class':'rd-et','text-anchor':'middle'},g);tx.textContent=e.etiqueta}
    s.lineas[e.id]=g;
  });
  t.nodos.forEach(function(n){
    var g=s.el('g',{'class':'rd-nodo rd-'+n.tipo,'data-nodo':n.id,transform:'translate('+n.x+','+n.y+')'},svg);
    if(n.tipo==='router'){s.el('circle',{r:17},g);s.el('path',{d:'M-8 -3h16M4 -7l4 4-4 4M8 3h-16M-4 -1l-4 4 4 4','class':'rd-ic'},g)}
    else if(n.tipo==='switch'){s.el('rect',{x:-20,y:-11,width:40,height:22,rx:4},g);s.el('path',{d:'M-12 -4h24M-12 4h24','class':'rd-ic'},g)}
    else if(n.tipo==='nube'){s.el('path',{d:'M-22 8a10 10 0 0 1 2-19 13 13 0 0 1 24-3 9 9 0 0 1 16 8 8 8 0 0 1-2 14z'},g)}
    else if(n.tipo==='servidor'){s.el('rect',{x:-13,y:-17,width:26,height:34,rx:3},g);s.el('path',{d:'M-8 -8h16M-8 0h16M-8 8h16','class':'rd-ic'},g)}
    else{s.el('rect',{x:-16,y:-12,width:32,height:21,rx:3},g);s.el('path',{d:'M-6 14h12M0 9v5','class':'rd-ic'},g)}
    var lab=s.el('text',{y:(n.tipo==='nube'?22:30),'class':'rd-nom','text-anchor':'middle'},g);lab.textContent=n.nombre||n.id;
    var ips=n.ifaces.filter(function(i){return i.ip&&i.mostrar!==false});
    if(ips.length&&n.tipo!=='router'){var it=s.el('text',{y:(n.tipo==='nube'?36:44),'class':'rd-ip','text-anchor':'middle'},g);it.textContent=ips[0].ip}
    s.grupos[n.id]=g;
  });
};
SP.enlace=function(id,arriba){
  var e=this.topo.enlaces.filter(function(x){return x.id===id})[0];if(!e)return;
  e.arriba=arriba;this.lineas[id].setAttribute('class','rd-enl'+(arriba?'':' caido'));
};
/* Interfaces alcanzables desde una interfaz: recorre enlaces activos y atraviesa switches */
SP.segmento=function(nodo,iface){
  var s=this,vistos={},out=[];
  function vecinos(id,ifn){
    return s.topo.enlaces.filter(function(e){return e.arriba&&(e.a===id&&(!ifn||!e.ai||e.ai===ifn)||e.b===id&&(!ifn||!e.bi||e.bi===ifn))}).map(function(e){return e.a===id?{n:e.b,i:e.bi}:{n:e.a,i:e.ai}});
  }
  (function rec(id,ifn){
    vecinos(id,ifn).forEach(function(v){
      var k=v.n+'/'+(v.i||'');if(vistos[k])return;vistos[k]=1;
      var n=s.porId[v.n];
      if(n.tipo==='switch'){rec(v.n,null);return}
      var ifs=v.i?n.ifaces.filter(function(f){return f.n===v.i}):n.ifaces;
      ifs.forEach(function(f){out.push({nodo:n,iface:f})});
    });
  })(nodo.id,iface.n);
  return out.filter(function(x){return x.nodo!==nodo});
};
SP.vecinoConIp=function(nodo,ip){
  var s=this,res=null;
  nodo.ifaces.some(function(f){if(!f.ip||!enRed(ip,f.ip,f.bits))return false;var seg=s.segmento(nodo,f);var v=seg.filter(function(x){return x.iface.ip===ip})[0];if(v){res={nodo:v.nodo,iface:f,via:v.iface};return true}});
  return res;
};
/* Tabla de rutas de un nodo: conectadas + estáticas, o calculadas por el camino más corto (como OSPF) */
SP.tabla=function(nodo,dinamico){
  var s=this,t=[];
  nodo.ifaces.forEach(function(f){if(f.ip)t.push({destino:red(f.ip,f.bits)+'/'+f.bits,via:null,iface:f.n,tipo:'C'})});
  if(!dinamico){nodo.rutas.forEach(function(r){t.push({destino:r.destino,via:r.via,iface:null,tipo:'S'})});return t}
  var redes={};
  s.topo.nodos.forEach(function(n){n.ifaces.forEach(function(f){if(f.ip&&n.tipo==='router'||f.ip&&n.anunciar)redes[red(f.ip,f.bits)+'/'+f.bits]={bits:f.bits}})});
  var dist={},prev={},cola=[nodo.id];dist[nodo.id]=0;
  while(cola.length){
    var id=cola.shift(),n=s.porId[id];
    if(n.tipo!=='router'&&id!==nodo.id)continue;
    n.ifaces.forEach(function(f){s.segmento(n,f).forEach(function(v){if(v.nodo.tipo!=='router'||dist[v.nodo.id]!=null)return;dist[v.nodo.id]=dist[id]+1;prev[v.nodo.id]={de:id,ip:v.iface.ip};cola.push(v.nodo.id)})});
  }
  Object.keys(redes).forEach(function(rd){
    if(t.some(function(x){return x.destino===rd}))return;
    var mejor=null;
    s.topo.nodos.forEach(function(n){if(n.tipo!=='router'||dist[n.id]==null||n===nodo)return;if(n.ifaces.some(function(f){return f.ip&&red(f.ip,f.bits)+'/'+f.bits===rd})&&(!mejor||dist[n.id]<dist[mejor.id]))mejor=n});
    if(!mejor)return;
    var id=mejor.id;while(prev[id]&&prev[id].de!==nodo.id)id=prev[id].de;
    t.push({destino:rd,via:prev[id].ip,iface:null,tipo:'O',costo:dist[mejor.id]});
  });
  nodo.rutas.filter(function(r){return r.destino==='0.0.0.0/0'}).forEach(function(r){t.push({destino:r.destino,via:r.via,iface:null,tipo:'S'})});
  return t;
};
/* La entrada que se usa para un destino: la coincidencia más larga */
function coincidencia(tabla,ip){
  var mejor=null;
  tabla.forEach(function(r){var k=r.destino.split('/'),b=+k[1];if(enRed(ip,k[0],b)&&(!mejor||b>+mejor.destino.split('/')[1]))mejor=r});
  return mejor;
}
/* Camino de un paquete: [{nodo, texto, entrada}] y cómo terminó */
SP.camino=function(origenId,ip,dinamico){
  var s=this,n=s.porId[origenId],saltos=[],ttl=64,enlaces=[];
  for(var paso=0;paso<16;paso++){
    if(n.ifaces.some(function(f){return f.ip===ip})){saltos.push({nodo:n,texto:n.nombre+' recibe el paquete: es para su dirección '+ip+'.'});return {ok:true,saltos:saltos,enlaces:enlaces,ttl:ttl}}
    var tb=s.tabla(n,dinamico&&n.tipo==='router'),e=coincidencia(tb,ip);
    if(!e){saltos.push({nodo:n,texto:n.nombre+' no tiene una ruta hacia '+ip+' ni ruta por defecto: descarta el paquete y responde «Network unreachable».'});return {ok:false,fin:'sin-ruta',saltos:saltos,enlaces:enlaces}}
    var siguiente=e.via?e.via:ip,v=s.vecinoConIp(n,siguiente);
    var desc=e.destino==='0.0.0.0/0'?'la ruta por defecto (0.0.0.0/0)':e.destino+(e.tipo==='C'?' (red conectada)':e.tipo==='O'?' (aprendida por OSPF)':' (ruta estática)');
    if(!v){
      saltos.push({nodo:n,entrada:e,texto:n.nombre+' usa '+desc+(e.via?', hacia '+e.via:'')+', pero '+(e.via?'ese router':'el equipo '+ip)+' no responde por esa red (¿enlace caído o equipo apagado?).'});
      return {ok:false,fin:'host',saltos:saltos,enlaces:enlaces};
    }
    ttl--;
    if(ttl<=0){saltos.push({nodo:n,texto:'El TTL llegó a 0: el paquete daba vueltas y se descarta.'});return {ok:false,fin:'ttl',saltos:saltos,enlaces:enlaces}}
    saltos.push({nodo:n,entrada:e,texto:n.nombre+' busca '+ip+' en su tabla: coincide con '+desc+'. Lo manda '+(e.via?'al router '+e.via:'directo a '+ip)+' por '+(v.iface.n||'su tarjeta')+'.'});
    enlaces=enlaces.concat(s.enlacesEntre(n,v.nodo));
    if(saltos.length>12){saltos.push({nodo:n,texto:'El paquete da vueltas entre los mismos routers (un bucle de rutas). Al final el TTL se acaba y se descarta.'});return {ok:false,fin:'ttl',saltos:saltos,enlaces:enlaces}}
    n=v.nodo;
  }
  return {ok:false,fin:'ttl',saltos:saltos,enlaces:enlaces};
};
SP.enlacesEntre=function(a,b){
  var s=this,res=[];
  (function buscar(id,meta,vistos,ruta){
    if(id===meta.id){res=ruta;return true}
    return s.topo.enlaces.some(function(e){
      if(!e.arriba)return false;
      var otro=e.a===id?e.b:e.b===id?e.a:null;if(!otro||vistos[otro])return false;
      var n=s.porId[otro];if(n.tipo!=='switch'&&otro!==meta.id)return false;
      vistos[otro]=1;return buscar(otro,meta,vistos,ruta.concat([e.id]));
    });
  })(a.id,b,{},[]);
  return res;
};
/* Ilumina el camino poco a poco. Devuelve una promesa. */
SP.mostrar=function(res){
  var s=this;
  Object.keys(s.lineas).forEach(function(k){s.lineas[k].classList.remove('activo','fallo')});
  Object.keys(s.grupos).forEach(function(k){s.grupos[k].classList.remove('activo','fallo')});
  var ms=AT.reduce?0:350,i=0,tok=s.turno=(s.turno||0)+1;
  return new Promise(function(fin){
    (function sig(){
      if(tok!==s.turno)return fin();
      if(i<res.saltos.length){var sa=res.saltos[i];s.grupos[sa.nodo.id].classList.add(i===res.saltos.length-1&&!res.ok?'fallo':'activo');}
      if(i<res.enlaces.length)s.lineas[res.enlaces[i]].classList.add('activo');
      i++;
      if(i<Math.max(res.saltos.length,res.enlaces.length+1))setTimeout(sig,ms);else fin();
    })();
  });
};
AT.red={crear:function(cont,topo,op){return new Sim(cont,topo,op)},coincidencia:coincidencia};
})();
