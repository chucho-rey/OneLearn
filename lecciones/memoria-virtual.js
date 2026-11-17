/* Laboratorios de la lección «Memoria virtual». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en memoria-virtual.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,elegir=AT.elegir;

/* ---------- Demo 1: traduce una dirección ---------- */
AT.labs['mv-traducir']=function(){
  /* Tabla de páginas del proceso: número de marco, 'disco' si está fuera de la RAM, o null si no es del proceso */
  var TABLA=[5,2,'disco',7,0,'disco',3,1,null,null,null,null,null,null,null,null];
  function bin(n,b){var s=n.toString(2);while(s.length<b)s='0'+s;return s}
  function render(dir){
    var pag=dir>>12,des=dir&4095,e=TABLA[pag];
    var b=bin(dir,16);
    $('#trBits').innerHTML='<span class="tr-p">'+b.slice(0,4)+'</span><span class="tr-d">'+b.slice(4)+'</span>'+
      '<span class="tr-lp">página</span><span class="tr-ld">desplazamiento</span>';
    $('#trTab').innerHTML=TABLA.map(function(x,k){
      var t=x===null?'No es del proceso':x==='disco'?'En el disco':'Marco '+x;
      return '<tr class="'+(k===pag?'on ':'')+(x===null?'nulo':x==='disco'?'disco':'')+'"><td>'+k+'</td><td>'+t+'</td></tr>';
    }).join('');
    $('#trPag').textContent=pag+' ('+b.slice(0,4)+')';
    $('#trDes').textContent=fmt(des,0);
    var k,m;
    if(e===null){$('#trFis').textContent='—';k='bad';m='La página '+pag+' no pertenece al proceso: violación de segmento. El sistema operativo cierra el programa (segmentation fault).'}
    else if(e==='disco'){$('#trFis').textContent='Todavía no';k='warn';m='Fallo de página: la página '+pag+' está en el disco. El sistema la trae a un marco libre, actualiza la tabla y repite el acceso.'}
    else{var f=e*4096+des;$('#trFis').textContent=fmt(f,0);k='good';m='La página '+pag+' está en el marco '+e+': dirección física = '+e+' × 4,096 + '+fmt(des,0)+' = '+fmt(f,0)+'.'}
    $('#trStat').setAttribute('data-k',k);$('#trMsg').textContent=m;
  }
  elegir('#trDir',function(v){render(+v)});
  render(1234);
};

/* ---------- Demo 2: ¿qué página sale? ---------- */
AT.labs['mv-reemplazo']=function(){
  var REF=[7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1],M=3,alg='fifo',hechos=0;
  /* Simula todo y guarda, para cada acceso, los marcos y si hubo fallo */
  function simular(){
    var marcos=[],llegada=[],uso=[],pasos=[];
    REF.forEach(function(p,t){
      var k=marcos.indexOf(p),fallo=k<0;
      if(fallo){
        if(marcos.length<M){marcos.push(p);llegada.push(t);uso.push(t)}
        else{
          var v=0;
          if(alg==='fifo'){for(var j=1;j<M;j++)if(llegada[j]<llegada[v])v=j}
          else if(alg==='lru'){for(j=1;j<M;j++)if(uso[j]<uso[v])v=j}
          else{
            var lejos=-1;
            for(j=0;j<M;j++){var prox=REF.indexOf(marcos[j],t+1);if(prox<0)prox=Infinity;if(prox>lejos){lejos=prox;v=j}}
          }
          marcos[v]=p;llegada[v]=t;uso[v]=t;
        }
      }else uso[k]=t;
      pasos.push({m:marcos.slice(),f:fallo});
    });
    return pasos;
  }
  function render(){
    var P=simular(),h='<thead><tr><th>Pide</th>';
    REF.forEach(function(p,t){h+='<th class="'+(t<hechos?'':'fut')+'">'+p+'</th>'});
    h+='</tr></thead><tbody>';
    for(var f=0;f<M;f++){
      h+='<tr><th scope="row">Marco '+(f+1)+'</th>';
      P.forEach(function(s,t){
        var v=t<hechos&&s.m[f]!==undefined?s.m[f]:'';
        h+='<td'+(t<hechos&&s.f?' class="fallo"':'')+'>'+v+'</td>';
      });
      h+='</tr>';
    }
    $('#rpTab').innerHTML=h+'</tbody>';
    var fal=P.slice(0,hechos).filter(function(s){return s.f}).length;
    $('#rpFal').textContent=fal;$('#rpBar').style.width=(fal/REF.length*100)+'%';
    $('#rpN').textContent=hechos+' de '+REF.length;
    var fin=hechos>=REF.length;
    $('#rpSig').setAttribute('aria-disabled',fin?'true':'false');
    $('#rpTodo').setAttribute('aria-disabled',fin?'true':'false');
    var m='';
    if(fin){
      if(alg==='fifo')m='FIFO: '+fal+' fallos. Es fácil de hacer, pero saca páginas aunque se estén usando mucho (como la 0).';
      else if(alg==='lru')m='LRU: '+fal+' fallos. Recordar qué se usó hace poco funciona bien porque los programas repiten lo que acaban de usar.';
      else m='Óptima: '+fal+' fallos, el mínimo posible. Pero necesita saber el futuro, así que solo sirve para comparar.';
    }else if(hechos){var s=P[hechos-1];m='Pide la página '+REF[hechos-1]+': '+(s.f?'no estaba en la RAM, fallo de página.':'ya estaba en un marco, acierto.')}
    $('#rpMsg').textContent=m;
  }
  $('#rpSig').addEventListener('click',function(){if(hechos<REF.length){hechos++;render()}});
  $('#rpTodo').addEventListener('click',function(){hechos=REF.length;render()});
  $('#rpReset').addEventListener('click',function(){hechos=0;render()});
  elegir('#rpAlg',function(v){alg=v;hechos=0;render()});
  render();
};
})();
