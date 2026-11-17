/* Laboratorios de la lección «Cifrado». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en cifrado.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: cifrado César ---------- */
AT.labs['ci-cesar']=function(){
  var ALF='ABCDEFGHIJKLMNÑOPQRSTUVWXYZ',N=ALF.length,inp=$('#ceIn'),k=$('#ceK');
  /* Quita acentos sin perder la Ñ */
  function limpio(t){return t.toUpperCase().replace(/Ñ/g,'\u0001').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\u0001/g,'Ñ')}
  function cesar(t,d){return limpio(t).split('').map(function(c){var i=ALF.indexOf(c);return i<0?c:ALF[(i+d+N)%N]}).join('')}
  function render(){
    var d=+k.value;
    $('#ceKv').textContent=d;k.setAttribute('aria-valuetext','Desplazamiento '+d);
    $('#ceAlf').innerHTML='<div>'+ALF.split('').map(function(c){return '<span>'+c+'</span>'}).join('')+'</div><div class="ce-b">'+ALF.split('').map(function(c,i){return '<span>'+ALF[(i+d)%N]+'</span>'}).join('')+'</div>';
    $('#ceOut').textContent=cesar(inp.value,d)||'—';
    $('#ceTodas').hidden=true;$('#ceMsg').textContent='Con desplazamiento '+d+', la A se vuelve '+ALF[d%N]+'. Para descifrar, se recorre '+d+' lugares hacia atrás.';
  }
  function romper(){
    var c=cesar(inp.value,+k.value),orig=limpio(inp.value),h='';
    for(var p=1;p<N;p++){var t=cesar(c,-p);h+='<li'+(t===orig?' class="ok"':'')+'><b>'+p+'</b> '+esc(t)+'</li>'}
    $('#ceTodas').innerHTML=h;$('#ceTodas').hidden=false;
    $('#ceMsg').textContent='Probando las '+(N-1)+' claves, solo una da un texto con sentido: la '+k.value+'. Una computadora lo hace en una fracción de segundo.';
  }
  inp.addEventListener('input',render);k.addEventListener('input',render);
  $('#ceRomper').addEventListener('click',romper);
  render();
};

/* ---------- Demo 2: XOR ---------- */
AT.labs['ci-xor']=function(){
  var letra=72,clave=42;
  function bits(n){var s=n.toString(2);while(s.length<8)s='0'+s;return s}
  function fila(nom,n,cls,car){
    return '<div class="xo-f'+(cls?' '+cls:'')+'"><span class="xo-n">'+nom+'</span>'+bits(n).split('').map(function(b){return '<i class="b'+b+'">'+b+'</i>'}).join('')+
      '<span class="xo-c">'+(car!==undefined?car:'')+'</span></div>';
  }
  function car(n){return n>=33&&n<127?'«'+esc(String.fromCharCode(n))+'»':'(sin letra)'}
  function render(){
    var c=letra^clave,d=c^clave;
    $('#xoTab').innerHTML=fila('Letra',letra,'',car(letra))+fila('XOR clave',clave,'cl')+fila('= Cifrado',c,'ci',car(c))+fila('XOR clave',clave,'cl')+fila('= Descifrado',d,'de',car(d));
    $('#xoMsg').textContent=clave===0?'Con una clave de puros ceros, el XOR no cambia nada: el «cifrado» es igual al mensaje. Una clave debe ser impredecible.':
      clave===255?'Con una clave de puros unos, el XOR invierte todos los bits. Es reversible, pero demasiado predecible para ser segura.':
      'Donde la clave tiene 1, el bit se invierte; donde tiene 0, se queda igual. Aplicar la misma clave otra vez regresa a la letra original.';
  }
  elegir('#xoL',function(v){letra=+v;render()});
  elegir('#xoK',function(v){clave=+v;render()});
  render();
};

/* ---------- Demo 3: Diffie-Hellman ---------- */
AT.labs['ci-dh']=function(){
  var P=23,G=5,a=$('#dhA'),b=$('#dhB');
  /* Potencia con residuo: base^exp mod m, paso a paso para no desbordar */
  function potmod(base,exp,m){var r=1;for(var k=0;k<exp;k++)r=r*base%m;return r}
  function render(){
    var x=+a.value,y=+b.value,A=potmod(G,x,P),B=potmod(G,y,P),kA=potmod(B,x,P),kB=potmod(A,y,P);
    $('#dhAv').textContent=x;$('#dhBv').textContent=y;
    a.setAttribute('aria-valuetext','a = '+x);b.setAttribute('aria-valuetext','b = '+y);
    $('#dhAna').innerHTML='Secreto: a = '+x+'<br>Envía A = 5^'+x+' mod 23 = <b>'+A+'</b><br>Calcula B^a mod 23 = '+B+'^'+x+' mod 23 = <b class="dh-k">'+kA+'</b>';
    $('#dhBeto').innerHTML='Secreto: b = '+y+'<br>Envía B = 5^'+y+' mod 23 = <b>'+B+'</b><br>Calcula A^b mod 23 = '+A+'^'+y+' mod 23 = <b class="dh-k">'+kB+'</b>';
    $('#dhPub').innerHTML='p = 23, g = 5<br>A = '+A+', B = '+B+'<br>El espía no ve a ni b.';
    $('#dhMsg').textContent='Los dos llegaron a la misma clave secreta, '+kA+', sin decirla nunca. Para encontrarla, el espía tendría que adivinar a o b a partir de A o B. Con números de 23 es fácil; con números de más de 600 dígitos, como en la vida real, no se conoce forma práctica.';
  }
  a.addEventListener('input',render);b.addEventListener('input',render);
  render();
};
})();
