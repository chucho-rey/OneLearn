/* Laboratorios de la lección «Subredes y CIDR»: calculadora, reparto con VLSM y ejercicios al azar.
   Usan AT.ip (assets/js/red.js). Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio». */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,fmt=AT.fmt,elegir=AT.elegir,IP=AT.ip;

/* ---------- Demo 1: calculadora ---------- */
AT.labs['sb-calc']=function(raiz){
  var inp=$('#scIn',raiz);
  function bits(bin,n){var k=0;return bin.split('').map(function(ch){if(ch==='.')return '<i>.</i>';k++;return '<span class="'+(k<=n?'r':'h')+'">'+ch+'</span>'}).join('')}
  function pintar(){
    var p=IP.parse(inp.value),st=$('#scStat',raiz);
    AT.setPressed($('#scEj',raiz),function(b){return b.getAttribute('data-v')===inp.value.trim()});
    if(!p){inp.setAttribute('aria-invalid','true');['#scRed','#scDif','#scPri','#scUlt','#scHosts','#scMasc'].forEach(function(s){$(s,raiz).textContent='—'});$('#scBin',raiz).textContent='';st.setAttribute('data-k','warn');$('#scMsg',raiz).textContent='Escribe una IP válida con su prefijo, por ejemplo 192.168.1.10/24.';return}
    inp.setAttribute('aria-invalid','false');
    var r=IP.calcular(p.ip,p.bits);
    $('#scRed',raiz).textContent=r.red+'/'+r.bits;$('#scDif',raiz).textContent=r.difusion;
    $('#scPri',raiz).textContent=r.primera;$('#scUlt',raiz).textContent=r.ultima;
    $('#scHosts',raiz).textContent=fmt(r.hosts);$('#scMasc',raiz).textContent=r.mascara;
    $('#scBin',raiz).innerHTML='<div><b>IP</b><code>'+bits(r.binIp,r.bits)+'</code></div><div><b>Máscara</b><code>'+bits(r.binMascara,r.bits)+'</code></div><div><b>Red</b><code>'+bits(IP.binario(r.red),r.bits)+'</code></div><p class="sc-leg"><span class="r">Bits de red ('+r.bits+')</span> <span class="h">Bits de equipo ('+(32-r.bits)+')</span></p>';
    st.setAttribute('data-k',/Privada/.test(r.tipo)?'good':'');
    $('#scMsg',raiz).textContent=r.tipo+'. '+(r.bits>=31?'Un /'+r.bits+' es un caso especial: sin dirección de red ni difusión.':'Del '+r.primera+' al '+r.ultima+' caben '+fmt(r.hosts)+' equipos. Comodín (para algunas reglas de firewall): '+r.comodin+'.');
  }
  inp.addEventListener('input',pintar);
  elegir('#scEj',function(v){inp.value=v;pintar()});
  pintar();
};

/* ---------- Demo 2: VLSM ---------- */
AT.labs['sb-vlsm']=function(raiz){
  var AREAS=[{n:'Ventas',h:50},{n:'Administración',h:20},{n:'Servidores',h:10},{n:'Invitados',h:25},{n:'Enlace con el otro router',h:2}];
  $('#svIn',raiz).innerHTML=AREAS.map(function(a,i){return '<label class="sv-a"><span>'+esc(a.n)+'</span><input class="campo mono num" type="number" min="1" max="250" value="'+a.h+'" data-i="'+i+'" aria-label="Equipos de '+esc(a.n)+'"></label>'}).join('');
  function pintar(){
    $$('#svIn input',raiz).forEach(function(e){var v=Math.max(1,Math.min(250,parseInt(e.value,10)||1));AREAS[+e.getAttribute('data-i')].h=v});
    var orden=AREAS.map(function(a,i){return {n:a.n,h:a.h,i:i,b:IP.bitsPara(a.h)}}).sort(function(x,y){return x.b-y.b||y.h-x.h});
    var base=IP.num('192.168.10.0'),pos=0,fila=[],cabe=true;
    orden.forEach(function(a){
      var t=IP.bloque(a.b);pos=Math.ceil(pos/t)*t;
      if(pos+t>256){cabe=false;a.fuera=true;return}
      a.r=IP.calcular(IP.texto(base+pos),a.b);a.ini=pos;a.t=t;pos+=t;fila.push(a);
    });
    $('#svTabla',raiz).innerHTML=orden.map(function(a){
      if(a.fuera)return '<tr class="sv-no"><td>'+esc(a.n)+'</td><td>'+a.h+'</td><td colspan="3">Ya no cabe en la /24</td></tr>';
      return '<tr><td>'+esc(a.n)+'</td><td>'+a.h+'</td><td class="mono">'+a.r.red+'/'+a.b+'</td><td class="mono">.'+a.r.primera.split('.')[3]+' – .'+a.r.ultima.split('.')[3]+'</td><td>'+(a.r.hosts-a.h)+'</td></tr>';
    }).join('');
    $('#svBarra',raiz).innerHTML=fila.map(function(a,k){return '<span class="c'+(k%5+1)+'" style="left:'+(a.ini/256*100)+'%;width:'+(a.t/256*100)+'%" title="'+esc(a.n)+'"></span>'}).join('');
    var usado=fila.reduce(function(s,a){return s+a.t},0),st=$('#svStat',raiz);
    st.setAttribute('data-k',cabe?'good':'bad');
    $('#svMsg',raiz).textContent=cabe?'Todo cabe: se usan '+usado+' de 256 direcciones y quedan '+(256-usado)+' libres para crecer. Cada área tiene su propia red y puede tener sus propias reglas.':
      'No alcanza la /24: las áreas piden más de 256 direcciones una vez redondeadas a potencias de 2. Habría que usar una red más grande, como una /23.';
  }
  $('#svIn',raiz).addEventListener('input',pintar);
  pintar();
};

/* ---------- Demo 3: ejercicios al azar ---------- */
AT.labs['sb-practica']=function(raiz){
  var actual=null,bien=0,total=0,CAMPOS=[['#spRed','red'],['#spDif','difusion'],['#spPri','primera'],['#spUlt','ultima'],['#spHosts','hosts']];
  function nuevo(){
    var redes=[[10,0,0,0],[172,16,0,0],[192,168,0,0]],b=redes[Math.floor(Math.random()*3)];
    var ip=[b[0],b[0]===10?Math.floor(Math.random()*256):b[0]===172?16+Math.floor(Math.random()*16):168,Math.floor(Math.random()*256),1+Math.floor(Math.random()*254)].join('.');
    var bits=[20,21,22,23,24,25,26,27,28,29,30][Math.floor(Math.random()*11)];
    actual=IP.calcular(ip,bits);
    $('#spIp',raiz).textContent=ip+'/'+bits;
    CAMPOS.forEach(function(c){var e=$(c[0],raiz);e.value='';e.removeAttribute('aria-invalid');e.parentNode.classList.remove('ok','mal')});
    $('#spStat',raiz).setAttribute('data-k','');$('#spMsg',raiz).textContent='Pista: primero calcula de cuánto en cuánto van las redes con /'+bits+'.';
  }
  function revisar(){
    var ok=0;
    CAMPOS.forEach(function(c){
      var e=$(c[0],raiz),v=e.value.trim().replace(/\s/g,''),esp=String(actual[c[1]]),bueno=c[1]==='hosts'?v.replace(/,/g,'')===esp:v===esp;
      e.setAttribute('aria-invalid',bueno?'false':'true');e.parentNode.classList.toggle('ok',bueno);e.parentNode.classList.toggle('mal',!bueno);
      if(bueno)ok++;
    });
    total++;if(ok===5)bien++;
    $('#spPunt',raiz).textContent=bien+' de '+total+' ejercicios completos';
    var st=$('#spStat',raiz);
    st.setAttribute('data-k',ok===5?'good':ok>=3?'warn':'bad');
    var t=IP.bloque(actual.bits);
    $('#spMsg',raiz).textContent=ok===5?'¡Todo correcto!':'Tienes '+ok+' de 5. Con /'+actual.bits+' cada red tiene '+fmt(t)+' direcciones'+(actual.bits>=24?'; en el último octeto empiezan en múltiplos de '+t+'.':'; mira el tercer octeto: las redes empiezan en múltiplos de '+(t/256)+'.');
  }
  $('#spRev',raiz).addEventListener('click',revisar);
  $('#spOtro',raiz).addEventListener('click',nuevo);
  $('#spVer',raiz).addEventListener('click',function(){
    CAMPOS.forEach(function(c){$(c[0],raiz).value=String(actual[c[1]])});
    $('#spStat',raiz).setAttribute('data-k','');
    $('#spMsg',raiz).textContent='Red '+actual.red+'/'+actual.bits+': '+fmt(IP.bloque(actual.bits))+' direcciones, de la '+actual.red+' a la '+actual.difusion+'. Pulsa «Otro ejercicio» para seguir practicando.';
  });
  raiz.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches('.sp-f input')){e.preventDefault();revisar()}});
  nuevo();
};
})();
