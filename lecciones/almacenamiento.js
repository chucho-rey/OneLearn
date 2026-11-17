/* Laboratorios de la lección «Almacenamiento».
   Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio»; bloques.js lo llama después de
   dibujar el bloque con su plantilla (<template data-lab="..."> en almacenamiento.html). Las preguntas de
   repaso viven en el documento de la lección, no aquí. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,setPressed=AT.setPressed,reduce=AT.reduce;

/* Botones de un grupo (.seg o .chips) que eligen un valor (data-v) */
function elegir(sel,fn){
  $(sel).addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    setPressed(this,function(x){return x===b});
    fn(b.getAttribute('data-v'));
  });
}
function tiempo(s){
  if(s<1)return fmt(s*1000,0)+' ms';
  if(s<60)return fmt(s,s<10?1:0)+' s';
  var m=Math.floor(s/60),r=Math.round(s%60);
  if(r===60){m++;r=0}
  if(m<60)return m+' min'+(r?' '+r+' s':'');
  return Math.floor(m/60)+' h '+(m%60)+' min';
}

/* ---------- Demo 1: cuánto tarda en copiarse ---------- */
AT.labs['alm-copiar']=function(){
  /* Velocidad de escritura en orden (MB/s) y trabajo extra por archivo (s). Valores típicos, redondeados. */
  var DISCOS=[
    {n:'Disco duro (HDD)',v:180,f:0.008},
    {n:'Memoria USB 3',v:150,f:0.002},
    {n:'SSD SATA',v:520,f:0.00015},
    {n:'SSD NVMe',v:5000,f:0.00005}
  ];
  var COSAS=[
    {mb:4000,n:1,txt:'1 archivo de 4 GB'},
    {mb:10000,n:3000,txt:'3,000 archivos de unos 3 MB'},
    {mb:60000,n:20000,txt:'20,000 archivos de tamaños muy distintos'},
    {mb:500,n:40000,txt:'40,000 archivos pequeños'}
  ];
  var cosa=COSAS[0];
  function render(){
    var ts=DISCOS.map(function(d){return {d:d,datos:cosa.mb/d.v,extra:cosa.n*d.f}});
    var max=Math.max.apply(null,ts.map(function(t){return t.datos+t.extra}));
    $('#cpN').textContent=cosa.txt+'.';
    $('#cpRows').innerHTML=ts.map(function(t){
      var tot=t.datos+t.extra;
      return '<div class="cp-r"><span class="cp-l">'+esc(t.d.n)+'</span>'+
        '<span class="cp-b" aria-hidden="true"><i class="cp-d" style="width:'+(t.datos/max*100)+'%"></i><i class="cp-x" style="width:'+(t.extra/max*100)+'%"></i></span>'+
        '<b class="cp-t">'+tiempo(tot)+'</b></div>';
    }).join('')+'<div class="leg"><span><i class="cp-d"></i>Escribir los datos</span><span><i class="cp-x"></i>Preparar cada archivo</span></div>';
    var hdd=ts[0],nvme=ts[3],m;
    var veces=(hdd.datos+hdd.extra)/(nvme.datos+nvme.extra);
    if(cosa.n===1)m='Con un solo archivo grande, todo depende de la velocidad en orden. El SSD NVMe es unas '+fmt(veces,0)+' veces más rápido que el disco duro.';
    else m='Con '+fmt(cosa.n,0)+' archivos, el disco duro pasa '+fmt(hdd.extra/(hdd.datos+hdd.extra)*100,0)+' % del tiempo preparando archivos, no copiando datos. El SSD NVMe termina unas '+fmt(veces,0)+' veces antes.';
    $('#cpMsg').textContent=m;
  }
  elegir('#cpQue',function(v){cosa=COSAS[+v];render()});
  render();
};

/* ---------- Demo 2: busca en el disco ---------- */
AT.labs['alm-disco']=function(){
  var PISTAS=6,SECT=12,VUELTA=60000/7200,T_SECT=VUELTA/SECT,SSD=0.1;
  var R0=34,DR=12;
  var PATRONES=[
    [[3,0],[3,1],[3,2],[3,3],[3,4],[3,5]],
    [[4,7],[0,2],[5,10],[1,4],[3,0],[5,6]]
  ];
  var svg=$('#dkSvg'),lista=$('#dkLista'),pat=PATRONES[0],i,t,cab,detalle,timer=null;
  var NS='http://www.w3.org/2000/svg';
  function nodo(tag,at){var e=document.createElementNS(NS,tag);for(var k in at)e.setAttribute(k,at[k]);return e}
  /* Una pista (anillo) dividida en sectores. El sector s ocupa de s·30° a (s+1)·30°. El plato gira en sentido
     antihorario, así que bajo el cabezal (a 0°) pasan los sectores 0, 1, 2… uno tras otro. */
  function cuña(p,s){
    var r1=R0+p*DR,r2=r1+DR-1.5,a1=s*30*Math.PI/180,a2=(s+1)*30*Math.PI/180;
    function pt(r,a){return (r*Math.cos(a)).toFixed(2)+' '+(r*Math.sin(a)).toFixed(2)}
    return 'M'+pt(r1,a1)+' L'+pt(r2,a1)+' A'+r2+' '+r2+' 0 0 1 '+pt(r2,a2)+' L'+pt(r1,a2)+' A'+r1+' '+r1+' 0 0 0 '+pt(r1,a1)+'Z';
  }
  var plato=nodo('g',{'class':'dk-plato'}),sect={};
  plato.appendChild(nodo('circle',{r:R0+PISTAS*DR+3,'class':'dk-borde'}));
  for(var p=0;p<PISTAS;p++)for(var s=0;s<SECT;s++){
    var c=nodo('path',{d:cuña(p,s),'class':'dk-s'});
    sect[p+'-'+s]=c;plato.appendChild(c);
  }
  plato.appendChild(nodo('circle',{r:R0-6,'class':'dk-eje'}));
  svg.appendChild(plato);
  var brazo=nodo('line',{x1:128,y1:96,'class':'dk-brazo'}),punta=nodo('rect',{width:9,height:5,'class':'dk-cab'});
  svg.appendChild(brazo);svg.appendChild(punta);
  svg.appendChild(nodo('circle',{cx:128,cy:96,r:6,'class':'dk-piv'}));

  function rot(){return (t/VUELTA*360)%360}
  function dibujar(){
    plato.setAttribute('transform','rotate('+(-rot()).toFixed(1)+')');
    var r=R0+cab*DR+DR/2;
    brazo.setAttribute('x2',r);brazo.setAttribute('y2',0);
    punta.setAttribute('x',r-4.5);punta.setAttribute('y',-2.5);
    Object.keys(sect).forEach(function(k){sect[k].setAttribute('class','dk-s')});
    pat.forEach(function(q,k){
      var e=sect[q[0]+'-'+q[1]];
      if(k<i)e.setAttribute('class','dk-s ok');
      else if(k===i)e.setAttribute('class','dk-s on');
    });
    lista.innerHTML=pat.map(function(q,k){
      return '<li class="'+(k<i?'ok':k===i?'on':'')+'">Pista '+(q[0]+1)+', sector '+(q[1]+1)+(k<i&&detalle[k]?'<span>'+fmt(detalle[k],1)+' ms</span>':'')+'</li>';
    }).join('');
    $('#dkT').textContent=fmt(t,1)+' ms';
    $('#dkProm').textContent=i?fmt(t/i,1)+' ms':'—';
    $('#dkSsd').textContent=fmt(Math.max(i,0)*SSD,1)+' ms';
    var fin=i>=pat.length;
    $('#dkPaso').setAttribute('aria-disabled',fin?'true':'false');
    $('#dkTodo').setAttribute('aria-disabled',fin?'true':'false');
  }
  function msg(txt,k){$('#dkStat').setAttribute('data-k',k||'');$('#dkMsg').textContent=txt}
  function paso(){
    if(i>=pat.length)return false;
    var q=pat[i],dist=Math.abs(q[0]-cab),busca=dist?1+0.6*dist:0;
    t+=busca;cab=q[0];
    var objetivo=q[1]*30,giro=((objetivo-rot())%360+360)%360;
    if(giro>359.5)giro=0;
    var espera=giro/360*VUELTA;
    t+=espera+T_SECT;
    detalle[i]=busca+espera+T_SECT;
    i++;
    var partes=[];
    partes.push(dist?'mover el cabezal '+dist+(dist===1?' pista':' pistas')+' ('+fmt(busca,1)+' ms)':'el cabezal ya está en la pista');
    partes.push(espera>0.05?'esperar a que gire el plato ('+fmt(espera,1)+' ms)':'el sector llega justo debajo, sin esperar');
    partes.push('leer el sector ('+fmt(T_SECT,1)+' ms)');
    var txt='Lectura '+i+': '+partes.join(', ')+'.';
    if(i===pat.length)txt+=' Total: '+fmt(t,1)+' ms. Un SSD haría lo mismo en unos '+fmt(i*SSD,1)+' ms, unas '+fmt(t/(i*SSD),0)+' veces menos.';
    msg(txt,i===pat.length?(t/i>3?'warn':'good'):'');
    dibujar();
    return true;
  }
  function parar(){if(timer){clearInterval(timer);timer=null}}
  function reset(){
    parar();i=0;t=0;cab=0;detalle=[];
    msg('El cabezal está en la pista 1 (la de adentro). Pulsa «Siguiente lectura».');
    dibujar();
  }
  $('#dkPaso').addEventListener('click',function(){if(this.getAttribute('aria-disabled')!=='true'){parar();paso()}});
  $('#dkTodo').addEventListener('click',function(){
    if(this.getAttribute('aria-disabled')==='true')return;
    parar();
    if(reduce){while(paso());return}
    timer=setInterval(function(){if(!paso())parar()},450);
  });
  $('#dkReset').addEventListener('click',reset);
  elegir('#dkPat',function(v){pat=PATRONES[+v];reset()});
  reset();
};

/* ---------- Demo 3: bits por celda ---------- */
AT.labs['alm-celdas']=function(){
  var CIC={1:'100,000',2:'10,000',3:'3,000',4:'1,000'},NOM={1:'SLC',2:'MLC',3:'TLC',4:'QLC'};
  var bits=3,leida=-1;
  function patron(k){var s=k.toString(2);while(s.length<bits)s='0'+s;return s}
  function render(){
    var n=1<<bits,h='';
    for(var k=n-1;k>=0;k--)h+='<span class="ce-n'+(k===leida?' on':'')+'" style="height:'+(100/n)+'%">'+(bits<4||k===leida?'<b>'+patron(k)+'</b>':'')+'</span>';
    $('#ceNiv').innerHTML=h;
    $('#ceNiv').setAttribute('data-bits',bits);
    $('#ceN').textContent=fmt(n,0);
    $('#ceCap').textContent=fmt(512*bits/8,0)+' GB';
    $('#ceCic').textContent=CIC[bits];
    var mar=100/(n-1);
    $('#ceMar').textContent=fmt(mar,mar<10?1:0)+' % del rango';
    $('#ceMarBar').style.width=mar+'%';
    var m;
    if(leida>=0)m='La celda tiene el nivel '+(leida+1)+' de '+n+': el SSD lo lee como '+patron(leida)+'. '+(bits>2?'Con niveles tan juntos, el controlador corrige errores todo el tiempo.':'Con pocos niveles, es fácil distinguir uno de otro.');
    else if(bits===1)m='SLC: dos niveles, muy separados. Es la más rápida y duradera, pero guarda menos por chip. Se usa en equipos industriales y como caché.';
    else if(bits===4)m='QLC: 16 niveles en el mismo rango de voltaje. Guarda 4 veces más que SLC, pero escribe más lento y se desgasta antes.';
    else m=NOM[bits]+': '+n+' niveles. '+(bits===3?'Es el tipo más común en los SSD actuales: buen equilibrio entre precio, velocidad y duración.':'Fue común en los primeros SSD de consumo.');
    $('#ceMsg').textContent=m;
  }
  elegir('#ceTipo',function(v){bits=+v;leida=-1;render()});
  $('#ceLeer').addEventListener('click',function(){
    var n=1<<bits,k;
    do{k=Math.floor(Math.random()*n)}while(n>1&&k===leida);
    leida=k;render();
  });
  render();
};

/* ---------- Demo 4: de TB a lo que cabe ---------- */
AT.labs['alm-capacidad']=function(){
  var COSAS=[['Fotos del celular','4 MB',4e6],['Canciones (MP3, 4 minutos)','8 MB',8e6],['Películas en alta definición','4 GB',4e9],['Horas de video 4K del celular','10 GB',10e9],['Juegos grandes','100 GB',100e9]];
  function cap(b){return b>=1e12?fmt(b/1e12,0)+' TB':fmt(b/1e9,0)+' GB'}
  function render(b){
    $('#caBytes').textContent=fmt(b,0);
    var gib=b/Math.pow(1024,3);
    $('#caWin').textContent=gib>=1024?fmt(gib/1024,2)+' TB':fmt(gib,0)+' GB';
    $('#caMac').textContent=cap(b);
    $('#caCabe').innerHTML=COSAS.map(function(c){
      var n=Math.floor(b/c[2]);
      return '<tr><td>'+esc(c[0])+' <span class="ca-tam">'+c[1]+'</span></td><td class="mono">'+(n?fmt(n,0):'Ni uno')+'</td></tr>';
    }).join('');
  }
  elegir('#caTam',function(v){render(+v)});
  render(1e12);
};
})();
