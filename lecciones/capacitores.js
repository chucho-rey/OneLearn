/* Laboratorios de la lección «Capacitores y resistencias». Cada uno se registra en AT.labs con el nombre de su
   bloque «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en capacitores.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,elegir=AT.elegir,reduce=AT.reduce;

function ohms(r){return r>=1000?fmt(r/1000,r%1000?1:0)+' kΩ':fmt(r,r%1?1:0)+' Ω'}
function amp(i){return i>=1?fmt(i,2)+' A':i>=0.001?fmt(i*1000,i<0.01?2:1)+' mA':fmt(i*1e6,0)+' µA'}
function watt(p){return p>=1?fmt(p,2)+' W':fmt(p*1000,p<0.01?2:0)+' mW'}
function seg(t){return t>=1?fmt(t,t<10?1:0)+' s':fmt(t*1000,0)+' ms'}

/* ---------- Demo 1: ley de Ohm ---------- */
AT.labs['cap-ohm']=function(){
  var v=$('#ohV'),r=1000;
  function render(){
    var V=+v.value,I=V/r,P=V*I;
    $('#ohVv').textContent=fmt(V,1)+' V';v.setAttribute('aria-valuetext',fmt(V,1)+' volts');
    $('#ohI').textContent=amp(I);
    $('#ohBar').style.width=Math.min(100,I/(24/47)*100)+'%';
    $('#ohP').textContent=watt(P);
    var k,m;
    if(P>0.25){k='bad';m='Cuidado: '+watt(P)+' es más de lo que aguanta una resistencia común de 1/4 W (250 mW). Se calentaría hasta quemarse; necesitarías una de mayor potencia.'}
    else if(P>0.125){k='warn';m='Dentro del límite de 1/4 W, pero la resistencia se notará tibia.'}
    else{k='good';m='Con '+fmt(V,1)+' V y '+ohms(r)+' pasan '+amp(I)+'. Si duplicas el voltaje, se duplica la corriente; si duplicas la resistencia, se reduce a la mitad.'}
    $('#ohStat').setAttribute('data-k',k);$('#ohMsg').textContent=m;
  }
  v.addEventListener('input',render);
  elegir('#ohR',function(x){r=+x;render()});
  render();
};

/* ---------- Demo 2: serie y paralelo ---------- */
AT.labs['cap-serie']=function(){
  var a=100,b=100,modo='s',svg=$('#srSvg');
  /* Una resistencia dibujada en zigzag entre (x1,y) y (x2,y) */
  function zig(x1,x2,y){
    var w=x2-x1,a=x1+w*0.2,b=x2-w*0.2,n=6,d=(b-a)/n,p='M'+x1+' '+y+' H'+a;
    for(var k=0;k<n;k++)p+=' L'+(a+d*(k+0.5)).toFixed(1)+' '+(y+(k%2?9:-9))+' L'+(a+d*(k+1)).toFixed(1)+' '+y;
    return '<path class="sr-r" d="'+p+' H'+x2+'"/>';
  }
  function txt(x,y,t){return '<text class="sr-t" x="'+x+'" y="'+y+'">'+t+'</text>'}
  function render(){
    var tot=modo==='s'?a+b:a*b/(a+b),I=9/tot,h='';
    /* Pila a la izquierda, cable de arriba (y=30) y de abajo (y=122) */
    h+='<path class="sr-c" d="M30 62 V30 H70 M30 92 V122 H290 V30 H250"/>';
    h+='<path class="sr-pila" d="M18 62 H42 M24 70 H36 M18 78 H42 M24 86 H36"/>'+txt(56,80,'9 V');
    if(modo==='s')h+=zig(70,160,30)+zig(160,250,30)+txt(115,14,'R1 · '+ohms(a))+txt(205,14,'R2 · '+ohms(b));
    else h+='<path class="sr-c" d="M70 30 V82 H100 M220 82 H250 V30 M70 30 H100 M220 30 H250"/>'+zig(100,220,30)+zig(100,220,82)+
      txt(160,56,'R1 · '+ohms(a))+txt(160,108,'R2 · '+ohms(b));
    svg.innerHTML=h;
    $('#srT').textContent=ohms(Math.round(tot*10)/10);
    $('#srI').textContent=amp(I);
    var men=Math.min(a,b);
    $('#srMsg').textContent=modo==='s'?
      'En serie, la corriente atraviesa las dos: '+ohms(a)+' + '+ohms(b)+' = '+ohms(a+b)+'. Pasa menos corriente que con cualquiera de las dos sola.':
      'En paralelo, la corriente se reparte entre dos caminos. El total, '+ohms(Math.round(tot*10)/10)+', es menor que la más pequeña ('+ohms(men)+').';
  }
  elegir('#srA',function(x){a=+x;render()});
  elegir('#srB',function(x){b=+x;render()});
  elegir('#srModo',function(x){modo=x;render()});
  render();
};

/* ---------- Demo 3: carga de un capacitor ---------- */
AT.labs['cap-rc']=function(){
  var R=10000,C=0.0001,V0=5,svg=$('#rcSvg'),v=0,raf=null;
  var X0=34,X1=312,Y0=150,Y1=14;
  function tau(){return R*C}
  function px(t){return X0+(X1-X0)*t/5}
  function py(x){return Y0-(Y0-Y1)*x/V0}
  function dibujar(){
    var h='<path class="rc-eje" d="M'+X0+' '+Y1+' V'+Y0+' H'+X1+'"/>';
    for(var k=1;k<=5;k++)h+='<path class="rc-g" d="M'+px(k)+' '+Y1+' V'+Y0+'"/><text class="rc-t" text-anchor="middle" x="'+px(k)+'" y="'+(Y0+14)+'">'+k+'τ</text>';
    h+='<text class="rc-t" x="'+(X0-6)+'" y="'+(Y1+4)+'" text-anchor="end">5 V</text><text class="rc-t" x="'+(X0-6)+'" y="'+(Y0+4)+'" text-anchor="end">0</text>';
    var d='M'+px(0)+' '+py(0);
    for(var i=1;i<=60;i++){var t=i/12;d+=' L'+px(t).toFixed(1)+' '+py(V0*(1-Math.exp(-t))).toFixed(1)}
    h+='<path class="rc-c" d="'+d+'"/>';
    h+='<path class="rc-63" d="M'+X0+' '+py(V0*0.632)+' H'+px(1)+' V'+Y0+'"/><text class="rc-t" x="'+(X0+4)+'" y="'+(py(V0*0.632)-5)+'" text-anchor="start">63 %</text>';
    h+='<circle class="rc-p" id="rcPunto" r="5"/>';
    svg.innerHTML=h;
  }
  function mostrar(){
    var t=v>=V0*0.9999?5:-Math.log(1-v/V0);
    var p=$('#rcPunto');p.setAttribute('cx',px(Math.min(t,5)));p.setAttribute('cy',py(v));
    $('#rcV').textContent=fmt(v,2)+' V';$('#rcBar').style.width=(v/V0*100)+'%';
  }
  function datos(){
    $('#rcTau').textContent=seg(tau());$('#rcCinco').textContent=seg(5*tau());
  }
  function parar(){if(raf){cancelAnimationFrame(raf);raf=null}}
  /* Anima la carga o descarga en tiempo real si dura poco; si dura mucho, la acelera para verla en unos 4 s */
  function animar(destino){
    parar();
    var inicio=v,T=tau(),vel=Math.max(1,5*T/4),t0=null;
    if(reduce){v=destino;mostrar();fin(destino,T);return}
    function cuadro(ts){
      if(t0===null)t0=ts;
      var t=(ts-t0)/1000*vel;
      v=destino+(inicio-destino)*Math.exp(-t/T);
      if(t>=5*T){v=destino;mostrar();fin(destino,T,vel);return}
      mostrar();raf=requestAnimationFrame(cuadro);
    }
    $('#rcMsg').textContent=destino?'Cargando…':'Descargando…';
    raf=requestAnimationFrame(cuadro);
  }
  function fin(destino,T,vel){
    $('#rcMsg').textContent=(destino?'Cargado: ':'Descargado: ')+'tardó unos '+seg(5*T)+' (5τ).'+(vel>1?' La animación va '+fmt(vel,0)+' veces más rápido que en la realidad.':'');
  }
  function cambiar(){parar();v=0;mostrar();datos();$('#rcMsg').textContent=''}
  elegir('#rcR',function(x){R=+x;cambiar()});
  elegir('#rcC',function(x){C=+x;cambiar()});
  $('#rcCargar').addEventListener('click',function(){animar(V0)});
  $('#rcDescargar').addEventListener('click',function(){animar(0)});
  dibujar();datos();mostrar();
};
})();
