/* Laboratorios de la lección «Cómo viaja un paquete». Cada uno se registra en AT.labs con el nombre de su
   bloque «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en paquetes.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: divide un archivo en paquetes ---------- */
AT.labs['pq-dividir']=function(){
  var DATOS=1460,ENC=40,VER=120;
  function bytes(b){return b>=1e6?fmt(b/1e6,1)+' MB':b>=1e3?fmt(b/1e3,1)+' KB':fmt(b,0)+' bytes'}
  function render(tam){
    var n=Math.ceil(tam/DATOS),enc=n*ENC,pct=enc/tam*100,h='';
    for(var k=0;k<Math.min(n,VER);k++){
      var ult=k===n-1,lleno=ult?(tam-DATOS*(n-1))/DATOS:1;
      h+='<span class="dv-p"><i style="width:'+(lleno*100).toFixed(0)+'%"></i></span>';
    }
    $('#dvPaq').innerHTML=h;
    $('#dvMas').textContent=n>VER?'Se muestran '+VER+' de '+fmt(n,0)+' paquetes.':'';
    $('#dvN').textContent=fmt(n,0);
    $('#dvEnc').textContent=bytes(enc);
    $('#dvPct').textContent=fmt(pct,1)+' %';
    $('#dvMsg').textContent=n===1?'Un mensaje corto cabe en un solo paquete, pero los 40 bytes de encabezado son el '+fmt(pct,0)+' % de lo que mandas.':
      'Se necesitan '+fmt(n,0)+' paquetes. Viajan por separado, incluso por caminos distintos, y el receptor los vuelve a armar en orden con su número.';
  }
  elegir('#dvQue',function(v){render(+v)});
  render(200);
};

/* ---------- Demo 2: la ruta de un paquete ---------- */
AT.labs['pq-ruta']=function(){
  var N={casa:{x:30,y:100,t:'Tu casa'},isp:{x:100,y:100,t:'Proveedor'},A:{x:170,y:40,t:'A'},B:{x:170,y:160,t:'B'},C:{x:250,y:40,t:'C'},D:{x:250,y:160,t:'D'},srv:{x:330,y:100,t:'Servidor'}};
  var E=[['casa','isp',3],['isp','A',8],['isp','B',5],['A','C',12],['B','D',6],['A','D',9,0.28],['C','srv',4],['D','srv',5],['B','C',14,0.28]];
  var svg=$('#ruSvg'),corte=$('#ruCorte'),ruta=[],i=0,TTL0=64;
  function enlaces(){return E.filter(function(e){return !(corte.checked&&((e[0]==='B'&&e[1]==='D')||(e[0]==='D'&&e[1]==='B')))})}
  /* Dijkstra: el camino de menor latencia */
  function camino(){
    var L=enlaces(),dist={},prev={},pend=Object.keys(N);
    pend.forEach(function(k){dist[k]=Infinity});dist.casa=0;
    while(pend.length){
      pend.sort(function(a,b){return dist[a]-dist[b]});
      var u=pend.shift();
      L.forEach(function(e){
        var v=e[0]===u?e[1]:e[1]===u?e[0]:null;
        if(v&&pend.indexOf(v)>=0&&dist[u]+e[2]<dist[v]){dist[v]=dist[u]+e[2];prev[v]=u}
      });
    }
    var c=['srv'];while(c[0]!=='casa')c.unshift(prev[c[0]]);
    return c;
  }
  function lat(a,b){var e=E.filter(function(x){return (x[0]===a&&x[1]===b)||(x[0]===b&&x[1]===a)})[0];return e[2]}
  function render(){
    var L=enlaces(),h='',recorrido=ruta.slice(0,i+1);
    E.forEach(function(e){
      var a=N[e[0]],b=N[e[1]],cortado=L.indexOf(e)<0;
      var usado=false;for(var k=0;k<recorrido.length-1;k++)if((recorrido[k]===e[0]&&recorrido[k+1]===e[1])||(recorrido[k]===e[1]&&recorrido[k+1]===e[0]))usado=true;
      h+='<line class="ru-e'+(cortado?' cortado':usado?' usado':'')+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>';
      /* Las dos diagonales se cruzan en el centro: su número va más cerca de A y de B */
      var f=e[3]||0.5;
      h+='<text class="ru-ms" x="'+(a.x+(b.x-a.x)*f+(e[3]?10:0))+'" y="'+(a.y+(b.y-a.y)*f-5)+'">'+(cortado?'✕':e[2])+'</text>';
    });
    Object.keys(N).forEach(function(k){
      var n=N[k],aqui=ruta[i]===k,router=k.length===1;
      h+='<g class="ru-n'+(aqui?' aqui':'')+(recorrido.indexOf(k)>=0?' paso':'')+'"><circle cx="'+n.x+'" cy="'+n.y+'" r="'+(router?13:16)+'"/>'+
        '<text x="'+n.x+'" y="'+(router?n.y+4:n.y+31)+'">'+n.t+'</text></g>';
    });
    svg.innerHTML=h;
    var ms=0;for(var k=0;k<i;k++)ms+=lat(ruta[k],ruta[k+1]);
    $('#ruSal').textContent=i+' de '+(ruta.length-1);
    $('#ruMs').textContent=ms+' ms';
    $('#ruTtl').textContent=TTL0-Math.max(0,i-1);
    var fin=i>=ruta.length-1;
    $('#ruSig').setAttribute('aria-disabled',fin?'true':'false');
    var m;
    if(!i)m='Ruta elegida: '+ruta.map(function(k){return N[k].t}).join(' → ')+'. Pulsa «Siguiente salto».';
    else if(fin)m='Llegó en '+ms+' ms y '+(ruta.length-1)+' saltos.'+(corte.checked?' Con el enlace cortado, los routers encontraron otro camino: más lento, pero llegó.':' Si cortas el enlace B–D, los routers buscarán otro camino.');
    else m='El router '+N[ruta[i]].t+' recibió el paquete, le restó 1 al TTL y lo manda a '+N[ruta[i+1]].t+'.';
    $('#ruStat').setAttribute('data-k',fin?'good':'');$('#ruMsg').textContent=m;
  }
  function reset(){ruta=camino();i=0;render()}
  $('#ruSig').addEventListener('click',function(){if(i<ruta.length-1){i++;render()}});
  $('#ruReset').addEventListener('click',reset);
  corte.addEventListener('change',reset);
  reset();
};

/* ---------- Demo 3: TCP contra UDP ---------- */
AT.labs['pq-tcp']=function(){
  var per=$('#tcPer'),envio=0;
  /* Generador pseudoaleatorio con semilla fija: el mismo envío da siempre el mismo resultado */
  function azar(semilla){
    var s=semilla>>>0;
    return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
  }
  function mostrarPer(){var v=+per.value;$('#tcPerV').textContent=v+' %';per.setAttribute('aria-valuetext',v+' por ciento')}
  function enviar(tcp){
    envio++;
    var p=+per.value/100,r=azar(7919*envio+(tcp?1:2)+Math.round(p*100)),res=[],env=0;
    for(var k=0;k<10;k++){
      var intentos=0,llego=false;
      do{intentos++;env++;llego=r()>=p}while(tcp&&!llego&&intentos<10);
      res.push(llego?(intentos>1?'re':'ok'):'no');
    }
    $('#tcRes').innerHTML=res.map(function(x,k){
      var t=x==='ok'?'llegó':x==='re'?'llegó al reenviarse':'se perdió';
      return '<li class="tc-'+x+'" title="Paquete '+(k+1)+': '+t+'"><span class="vh">Paquete '+(k+1)+': '+t+'</span><b aria-hidden="true">'+(k+1)+'</b></li>';
    }).join('');
    var ok=res.filter(function(x){return x!=='no'}).length,re=res.filter(function(x){return x==='re'}).length;
    $('#tcOk').textContent=ok+' de 10';$('#tcEnv').textContent=env;
    $('#tcMsg').textContent=tcp?
      (re?'TCP notó que faltaban '+re+(re===1?' paquete':' paquetes')+' (no llegó la confirmación) y '+(re===1?'lo reenvió':'los reenvió')+'. Llegó todo, a cambio de '+(env-10)+' envíos extra y algo de espera.':'Ningún paquete se perdió: TCP solo confirmó cada uno.'):
      (ok<10?'UDP no confirma ni reenvía: se perdieron '+(10-ok)+' de 10. En una videollamada sería un pequeño corte de audio; en un archivo, un archivo dañado.':'Con suerte, no se perdió ninguno. UDP no lo habría notado si faltara alguno.');
  }
  per.addEventListener('input',mostrarPer);
  $('#tcTcp').addEventListener('click',function(){enviar(true)});
  $('#tcUdp').addEventListener('click',function(){enviar(false)});
  mostrarPer();enviar(true);
};
})();
