/* Laboratorios de la lección «Diodos y LEDs». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en diodos.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,elegir=AT.elegir;

function ma(i){return i>=0.001?fmt(i*1000,1)+' mA':i>0?'menos de 1 µA':'0 mA'}

/* ---------- Demo 1: directa o inversa ---------- */
AT.labs['di-polaridad']=function(){
  var dir=1,v=$('#poV'),svg=$('#poSvg'),VD=0.7,R=100;
  function render(){
    var V=+v.value,I=dir&&V>VD?(V-VD)/R:0,Vd=dir?Math.min(V,VD):V;
    $('#poVv').textContent=fmt(V,1)+' V';v.setAttribute('aria-valuetext',fmt(V,1)+' volts');
    /* Circuito: pila a la izquierda, resistencia arriba, diodo a la derecha (flecha hacia abajo en directa) */
    var flecha=dir?'M250 42 L270 42 L260 62 Z M250 63 H270':'M250 62 L270 62 L260 42 Z M250 41 H270';
    var h='<path class="po-c'+(I>0?' on':'')+'" d="M40 45 V20 H110 M190 20 H260 V42 M260 62 V100 H40 V75"/>'+
      '<path class="po-pila" d="M28 45 H52 M34 53 H46 M28 61 H52 M34 69 H46"/>'+
      '<rect class="po-r" x="110" y="12" width="80" height="16" rx="3"/><text class="po-t" x="150" y="44">100 Ω</text>'+
      '<path class="po-d" d="'+flecha+'"/><text class="po-t" x="222" y="56">'+(dir?'directa':'inversa')+'</text>'+
      '<text class="po-t" x="70" y="62">'+fmt(V,1)+' V</text>';
    svg.innerHTML=h;
    $('#poI').textContent=ma(I);$('#poBar').style.width=Math.min(100,I/((5-VD)/R)*100)+'%';
    $('#poVd').textContent=fmt(Vd,1)+' V';
    var m;
    if(!dir)m='En inversa la barrera de la unión se ensancha: no pasa corriente (solo una fuga mínima), y todo el voltaje de la pila queda sobre el diodo.';
    else if(V<=VD)m='En directa, pero con '+fmt(V,1)+' V todavía no se supera la barrera de unos 0.7 V: casi no pasa corriente.';
    else m='Conduce: el diodo se queda con unos 0.7 V y la resistencia con el resto ('+fmt(V-VD,1)+' V), que fija la corriente en '+ma(I)+'.';
    $('#poMsg').textContent=m;
  }
  elegir('#poDir',function(x){dir=+x;render()});
  v.addEventListener('input',render);
  render();
};

/* ---------- Demo 2: de alterna a directa ---------- */
AT.labs['di-rectificar']=function(){
  var modo=0,svg=$('#reSvg'),X0=20,X1=310,YM=75,AMP=55,N=240;
  var MSG=[
    'Sin diodos, la salida es igual a la entrada: la corriente cambia de sentido 60 veces por segundo.',
    'Un diodo deja pasar solo la mitad positiva de la onda (rectificador de media onda). La otra mitad se pierde.',
    'El puente de 4 diodos voltea la mitad negativa: ahora la salida siempre va en el mismo sentido (onda completa), aunque sube y baja.',
    'El capacitor se carga en cada pico y entrega energía cuando el voltaje baja: la salida queda casi plana, con un pequeño rizado.'
  ];
  function x(t){return X0+(X1-X0)*t}
  function y(v){return YM-AMP*v}
  function render(){
    var ent='',sal='',prev=0;
    for(var i=0;i<=N;i++){
      var t=i/N,s=Math.sin(t*2*Math.PI*2),o;
      if(modo===0)o=s;else if(modo===1)o=Math.max(0,s);else if(modo===2)o=Math.abs(s);
      else{o=Math.max(Math.abs(s),prev*Math.exp(-1/(N*0.12)));prev=o}
      ent+=(i?' L':'M')+x(t).toFixed(1)+' '+y(s).toFixed(1);
      sal+=(i?' L':'M')+x(t).toFixed(1)+' '+y(o).toFixed(1);
    }
    svg.innerHTML='<path class="re-eje" d="M'+X0+' '+YM+' H'+X1+'"/><text class="re-t" x="'+(X0-4)+'" y="'+(YM+4)+'">0</text>'+
      '<path class="re-in" d="'+ent+'"/><path class="re-out" d="'+sal+'"/>';
    $('#reMsg').textContent=MSG[modo];
  }
  elegir('#reModo',function(v){modo=+v;render()});
  render();
};

/* ---------- Demo 3: la resistencia para un LED ---------- */
AT.labs['di-led']=function(){
  var VF={rojo:2.0,amarillo:2.1,verde:3.0,azul:3.0,blanco:3.0};
  var E12=[1,1.2,1.5,1.8,2.2,2.7,3.3,3.9,4.7,5.6,6.8,8.2];
  var fuente=5,color='rojo',I=0.02;
  /* El valor comercial (serie E12) igual o mayor, para no pasarse de corriente */
  function comercial(r){
    var d=Math.pow(10,Math.floor(Math.log10(r)));
    for(var k=0;k<E12.length;k++)if(E12[k]*d>=r-1e-9)return E12[k]*d;
    return 10*d;
  }
  function ohm(r){return r>=1000?fmt(r/1000,r%1000?1:0)+' kΩ':fmt(r,0)+' Ω'}
  function render(){
    var vf=VF[color],led=$('#ldLed');
    led.setAttribute('data-c',color);
    if(fuente<=vf){
      $('#ldR').textContent='—';$('#ldRc').textContent='—';$('#ldP').textContent='—';
      led.classList.remove('on');
      $('#ldMsg').textContent='Con '+fmt(fuente,1)+' V no alcanza: el LED '+color+' necesita unos '+fmt(vf,1)+' V solo para encender. Usa una fuente de más voltaje.';
      return;
    }
    var r=(fuente-vf)/I,rc=comercial(r),ir=(fuente-vf)/rc,p=ir*ir*rc;
    led.classList.add('on');
    $('#ldR').textContent=ohm(r);$('#ldRc').textContent=ohm(rc);
    $('#ldP').textContent=fmt(p*1000,0)+' mW';
    var m='R = ('+fmt(fuente,1)+' V − '+fmt(vf,1)+' V) ÷ '+fmt(I*1000,0)+' mA = '+ohm(r)+'. Se usa '+ohm(rc)+', el valor comercial siguiente, y pasan '+fmt(ir*1000,1)+' mA.';
    m+=p>0.25?' Ojo: la resistencia disipa más de 1/4 W; usa una de 1/2 W.':' Una resistencia común de 1/4 W basta.';
    $('#ldMsg').textContent=m;
  }
  elegir('#ldF',function(v){fuente=+v;render()});
  elegir('#ldC',function(v){color=v;render()});
  elegir('#ldI',function(v){I=+v;render()});
  render();
};
})();
