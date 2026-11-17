/* Laboratorios de la lección «Redes neuronales». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en redes-neuronales.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,elegir=AT.elegir;
function sig(z){return 1/(1+Math.exp(-z))}

/* ---------- Demo 1: una neurona ---------- */
AT.labs['rn-neurona']=function(){
  var w1=$('#nnW1'),w2=$('#nnW2'),b=$('#nnB'),svg=$('#nnSvg');
  var PRE={AND:[4,4,-6],OR:[4,4,-2],NAND:[-4,-4,6]};
  var TABLAS={'0001':'AND','0111':'OR','1110':'NAND','1000':'NOR'};
  function linea(x1,y1,x2,y2,w){
    var g=Math.min(6,0.8+Math.abs(w)*0.8);
    return '<line class="nn-c '+(w<0?'neg':'pos')+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" style="stroke-width:'+g+'"/>';
  }
  function render(){
    var W1=+w1.value,W2=+w2.value,B=+b.value,bits='',h='';
    [[0,0],[0,1],[1,0],[1,1]].forEach(function(e){
      var s=sig(e[0]*W1+e[1]*W2+B),bit=s>0.5?1:0;bits+=bit;
      h+='<tr><td>'+e[0]+'</td><td>'+e[1]+'</td><td>'+fmt(s,2)+'</td><td><b>'+bit+'</b></td></tr>';
    });
    $('#nnTab').innerHTML=h;
    var s11=sig(W1+W2+B);
    svg.innerHTML=linea(40,35,160,65,W1)+linea(40,95,160,65,W2)+
      '<circle class="nn-n" cx="40" cy="35" r="15"/><text class="nn-t" x="40" y="39">x1</text>'+
      '<circle class="nn-n" cx="40" cy="95" r="15"/><text class="nn-t" x="40" y="99">x2</text>'+
      '<text class="nn-w" x="100" y="38">'+fmt(W1,1)+'</text><text class="nn-w" x="100" y="102">'+fmt(W2,1)+'</text>'+
      '<circle class="nn-o" cx="170" cy="65" r="22" style="fill-opacity:'+(0.15+s11*0.85).toFixed(2)+'"/><text class="nn-t" x="170" y="69">Σ</text>'+
      '<text class="nn-w" x="170" y="105">sesgo '+fmt(B,1)+'</text>';
    $('#nnW1v').textContent=fmt(W1,1);$('#nnW2v').textContent=fmt(W2,1);$('#nnBv').textContent=fmt(B,1);
    [[w1,'Peso 1'],[w2,'Peso 2'],[b,'Sesgo']].forEach(function(x){x[0].setAttribute('aria-valuetext',x[1]+' '+fmt(+x[0].value,1))});
    var nom=TABLAS[bits];
    AT.setPressed($('#nnPre'),function(x){return x.getAttribute('data-v')===nom});
    $('#nnMsg').textContent=nom?'¡La neurona se comporta como una compuerta '+nom+'! Las salidas son '+bits.split('').join(', ')+'.':
      'Las salidas son '+bits.split('').join(', ')+'. Prueba a conseguir AND (0, 0, 0, 1) u OR (0, 1, 1, 1); para XOR (0, 1, 1, 0) no hay pesos que funcionen.';
  }
  elegir('#nnPre',function(v){var p=PRE[v];w1.value=p[0];w2.value=p[1];b.value=p[2];render()});
  [w1,w2,b].forEach(function(x){x.addEventListener('input',render)});
  render();
};

/* ---------- Demo 2: una red resuelve XOR ---------- */
AT.labs['rn-xor']=function(){
  var a=0,c=0,svg=$('#xrSvg');
  /* Pesos de la red: h1 ≈ OR, h2 ≈ NAND, salida ≈ AND de las dos */
  var H1=[6,6,-3],H2=[-6,-6,9],O=[6,6,-9];
  function nodo(x,y,v,txt){return '<circle class="xr-n" cx="'+x+'" cy="'+y+'" r="18" style="fill-opacity:'+(0.12+v*0.88).toFixed(2)+'"/><text class="xr-t'+(v>0.5?' on':'')+'" x="'+x+'" y="'+(y+4)+'">'+txt+'</text>'}
  function arista(x1,y1,x2,y2,w){return '<line class="nn-c '+(w<0?'neg':'pos')+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" style="stroke-width:'+(1+Math.abs(w)/2.5)+'"/>'}
  function render(){
    var h1=sig(a*H1[0]+c*H1[1]+H1[2]),h2=sig(a*H2[0]+c*H2[1]+H2[2]),o=sig(h1*O[0]+h2*O[1]+O[2]);
    svg.innerHTML=arista(40,45,160,45,H1[0])+arista(40,125,160,45,H1[1])+arista(40,45,160,125,H2[0])+arista(40,125,160,125,H2[1])+
      arista(160,45,280,85,O[0])+arista(160,125,280,85,O[1])+
      nodo(40,45,a,'A')+nodo(40,125,c,'B')+nodo(160,45,h1,fmt(h1,2))+nodo(160,125,h2,fmt(h2,2))+nodo(280,85,o,fmt(o,2))+
      '<text class="xr-l" x="40" y="160">entradas</text><text class="xr-l" x="160" y="160">ocultas</text><text class="xr-l" x="280" y="160">salida</text>';
    $('#xrA').textContent='A = '+a;$('#xrA').setAttribute('aria-pressed',a?'true':'false');
    $('#xrB').textContent='B = '+c;$('#xrB').setAttribute('aria-pressed',c?'true':'false');
    $('#xrH1').textContent=fmt(h1,2);$('#xrH2').textContent=fmt(h2,2);$('#xrO').textContent=fmt(o,2)+' → '+(o>0.5?1:0);
    $('#xrMsg').textContent='A XOR B = '+(a^c)+', y la red responde '+(o>0.5?1:0)+'. '+(a&&c?'Las dos entradas encendidas apagan la oculta 2 («no las dos»), así que la salida se apaga.':
      a||c?'Con una sola entrada encendida, las dos ocultas se encienden y la salida también.':'Sin entradas, la oculta 1 («al menos una») se queda apagada y la salida también.');
  }
  $('#xrA').addEventListener('click',function(){a=a?0:1;render()});
  $('#xrB').addEventListener('click',function(){c=c?0:1;render()});
  render();
};

/* ---------- Demo 3: descenso de gradiente ---------- */
AT.labs['rn-gradiente']=function(){
  /* Error = (w − 3)² ÷ 2 + 0.5, con su mínimo en w = 3. Su pendiente es (w − 3). */
  var W0=-1,lr=0.6,w,n,camino,svg=$('#gdSvg'),X0=20,X1=330,Y0=170,Y1=10;
  function err(x){return (x-3)*(x-3)/2+0.5}
  function px(x){return X0+(x+2)/10*(X1-X0)}
  function py(e){return Y0-Math.min(e,13)/13*(Y0-Y1)}
  function render(){
    var d='';for(var k=0;k<=100;k++){var x=-2+k/10;d+=(k?' L':'M')+px(x).toFixed(1)+' '+py(err(x)).toFixed(1)}
    var h='<path class="gd-c" d="'+d+'"/><line class="gd-min" x1="'+px(3)+'" y1="'+Y1+'" x2="'+px(3)+'" y2="'+Y0+'"/>';
    for(var i=1;i<camino.length;i++){var a=camino[i-1],b=camino[i];if(Math.abs(a)<50&&Math.abs(b)<50)h+='<line class="gd-paso" x1="'+px(Math.max(-2,Math.min(8,a)))+'" y1="'+py(err(a))+'" x2="'+px(Math.max(-2,Math.min(8,b)))+'" y2="'+py(err(b))+'"/>'}
    var fuera=w<-2||w>8;
    if(!fuera)h+='<circle class="gd-b" cx="'+px(w)+'" cy="'+py(err(w))+'" r="7"/>';
    svg.innerHTML=h;
    $('#gdW').textContent=Math.abs(w)>1e6?'enorme':fmt(w,2);
    var e=err(w);$('#gdE').textContent=e>1e6?'enorme':fmt(e,2);$('#gdBar').style.width=Math.min(100,e/13*100)+'%';
    $('#gdN').textContent=n;
    var m;
    if(!n)m='Empieza en w = −1. El mínimo está en w = 3.';
    else if(Math.abs(w-3)<0.01)m='Llegó al mínimo en '+n+' pasos.';
    else if(e>err(W0))m='¡El error crece! Con una tasa tan grande, cada paso se pasa del mínimo más que el anterior: el entrenamiento diverge.';
    else if(lr>=1.5)m='Rebota de un lado al otro del mínimo: los pasos son tan grandes que se pasa, aunque poco a poco se acerca.';
    else if(lr<0.3)m='Avanza, pero muy despacio: con pasos tan pequeños, el entrenamiento tardaría muchísimo.';
    else m='Se acerca rápido y sin pasarse: cada paso es proporcional a la pendiente, así que frena al llegar.';
    $('#gdMsg').textContent=m;
  }
  function paso(k){for(var i=0;i<k;i++){w=w-lr*(w-3);n++;camino.push(w)}render()}
  function reset(){w=W0;n=0;camino=[w];render()}
  elegir('#gdLr',function(v){lr=+v;reset()});
  $('#gdUno').addEventListener('click',function(){paso(1)});
  $('#gdDiez').addEventListener('click',function(){paso(10)});
  $('#gdReset').addEventListener('click',reset);
  reset();
};
})();
