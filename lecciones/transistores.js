/* Laboratorios de la lección «Transistores». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en transistores.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: el transistor como interruptor ---------- */
AT.labs['tr-mosfet']=function(){
  var v=$('#msV'),UMBRAL=2,svg=$('#msSvg');
  function render(){
    var V=+v.value,on=V>UMBRAL,I=on?Math.min(20,8*Math.pow(V-UMBRAL,2)):0,g=on?Math.min(1,(V-UMBRAL)/1.6):0;
    $('#msVv').textContent=fmt(V,1)+' V';v.setAttribute('aria-valuetext',fmt(V,1)+' volts');
    /* Corte del transistor: silicio tipo P abajo, zonas N de fuente y drenador, aislante y compuerta arriba */
    var h='<rect class="ms-p" x="20" y="80" width="280" height="80" rx="4"/>'+
      '<rect class="ms-n" x="40" y="80" width="70" height="34" rx="3"/><rect class="ms-n" x="210" y="80" width="70" height="34" rx="3"/>'+
      '<rect class="ms-ox" x="100" y="70" width="120" height="10"/>'+
      '<rect class="ms-g'+(V>0?' on':'')+'" x="100" y="46" width="120" height="24" rx="3"/>'+
      (on?'<rect class="ms-ch" x="110" y="80" width="100" height="'+(3+g*9).toFixed(1)+'" style="opacity:'+(0.45+g*0.55).toFixed(2)+'"/>':'')+
      '<text class="ms-t" x="75" y="95">Fuente</text><text class="ms-t" x="75" y="108">(N)</text><text class="ms-t" x="245" y="95">Drenador</text><text class="ms-t" x="245" y="108">(N)</text><text class="ms-t" x="160" y="140">Silicio tipo P</text>'+
      '<text class="ms-t" x="160" y="62">Compuerta</text><text class="ms-t" x="112" y="26">LED</text>'+
      '<path class="ms-c" d="M75 80 V22 H232 M245 80 V31 M160 46 V36"/>'+
      '<circle class="ms-led'+(I>0?' on':'')+'" cx="245" cy="22" r="9" style="opacity:'+(I>0?(0.35+I/20*0.65).toFixed(2):1)+'"/>';
    svg.innerHTML=h;
    $('#msEst').textContent=on?'Encendido (conduce)':'Apagado';
    $('#msI').textContent=fmt(I,1)+' mA';$('#msBar').style.width=(I/20*100)+'%';
    var m;
    if(V===0)m='Sin voltaje en la compuerta no hay canal: entre las dos zonas N hay silicio tipo P, y la corriente no puede cruzar.';
    else if(!on)m='Todavía por debajo del umbral (2 V): el canal no se forma y el LED sigue apagado.';
    else if(I<20)m='Pasaste el umbral: la compuerta atrae electrones y forma un canal tipo N que une la fuente con el drenador. Más voltaje, canal más ancho.';
    else m='Encendido por completo: el canal está abierto y el LED recibe toda la corriente que permite su resistencia (20 mA).';
    $('#msMsg').textContent=m;
  }
  v.addEventListener('input',render);
  render();
};

/* ---------- Demo 2: compuertas lógicas ---------- */
AT.labs['tr-compuertas']=function(){
  var F={NOT:function(a){return a?0:1},AND:function(a,b){return a&b},OR:function(a,b){return a|b},NAND:function(a,b){return (a&b)?0:1},XOR:function(a,b){return a^b}};
  var EXP={NOT:'NOT invierte: da lo contrario de su única entrada.',AND:'AND da 1 solo si A y B son 1.',OR:'OR da 1 si A o B (o las dos) son 1.',
           NAND:'NAND es AND invertida: da 0 solo si las dos son 1. Con ella sola se puede construir cualquier otra compuerta.',XOR:'XOR da 1 cuando A y B son distintas. Es la suma de dos bits sin el acarreo.'};
  var tipo='AND',a=0,b=0;
  function render(){
    var una=tipo==='NOT',out=F[tipo](a,b);
    $('#cgA').textContent='A = '+a;$('#cgA').setAttribute('aria-pressed',a?'true':'false');
    $('#cgB').textContent='B = '+b;$('#cgB').setAttribute('aria-pressed',b?'true':'false');
    $('#cgB').hidden=una;
    $('#cgNom').textContent=tipo;
    $('#cgOut').textContent='Salida = '+out;$('#cgOut').className='cg-out'+(out?' uno':'');
    $('#cgTh').innerHTML='<tr><th>A</th>'+(una?'':'<th>B</th>')+'<th>Salida</th></tr>';
    var filas=una?[[0],[1]]:[[0,0],[0,1],[1,0],[1,1]];
    $('#cgTb').innerHTML=filas.map(function(f){
      var act=f[0]===a&&(una||f[1]===b);
      return '<tr'+(act?' class="on"':'')+'><td>'+f[0]+'</td>'+(una?'':'<td>'+f[1]+'</td>')+'<td><b>'+F[tipo](f[0],f[1])+'</b></td></tr>';
    }).join('');
    $('#cgMsg').textContent=EXP[tipo];
  }
  elegir('#cgTipo',function(x){tipo=x;render()});
  $('#cgA').addEventListener('click',function(){a=a?0:1;render()});
  $('#cgB').addEventListener('click',function(){b=b?0:1;render()});
  render();
};

/* ---------- Demo 3: sumador de 4 bits ---------- */
AT.labs['tr-sumador']=function(){
  var A=[0,1,0,1],B=[0,0,1,1];   /* del bit más significativo al menos significativo: 5 + 3 */
  function val(x){return x.reduce(function(s,b){return s*2+b},0)}
  function render(){
    var car=[0,0,0,0,0],S=[0,0,0,0],n=0;
    for(var k=3;k>=0;k--){
      var t=A[k]+B[k]+car[k+1];
      S[k]=t%2;car[k]=t>1?1:0;if(car[k])n++;
    }
    var h='<div class="sm-f sm-c"><span class="sm-l">Acarreo</span>'+[0,1,2,3].map(function(k){return '<span class="sm-x'+(car[k+1]?' si':'')+'">'+(car[k+1]?'1':'')+'</span>'}).join('')+'</div>';
    h+='<div class="sm-f"><span class="sm-l">A</span>'+A.map(function(b,k){return '<button type="button" class="sm-b" data-f="A" data-k="'+k+'" aria-pressed="'+(b?'true':'false')+'" aria-label="Bit '+(3-k)+' de A: '+b+'">'+b+'</button>'}).join('')+'</div>';
    h+='<div class="sm-f"><span class="sm-l">+ B</span>'+B.map(function(b,k){return '<button type="button" class="sm-b" data-f="B" data-k="'+k+'" aria-pressed="'+(b?'true':'false')+'" aria-label="Bit '+(3-k)+' de B: '+b+'">'+b+'</button>'}).join('')+'</div>';
    h+='<div class="sm-f sm-s"><span class="sm-l">= </span><span class="sm-r'+(car[0]?' si':'')+'">'+car[0]+'</span>'+S.map(function(b){return '<span class="sm-r">'+b+'</span>'}).join('')+'</div>';
    var foco=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.sm')?[document.activeElement.getAttribute('data-f'),document.activeElement.getAttribute('data-k')]:null;
    $('#sm').innerHTML=h;
    if(foco){var f=$('#sm [data-f="'+foco[0]+'"][data-k="'+foco[1]+'"]');if(f)f.focus()}
    var a=val(A),b=val(B),s=a+b;
    $('#smDec').textContent=a+' + '+b+' = '+s;
    $('#smCar').textContent=n?n+(n===1?' columna se lleva 1':' columnas se llevan 1'):'ninguno';
    $('#smMsg').textContent=s>15?'El resultado no cabe en 4 bits: el último acarreo se convierte en un quinto bit. Si el circuito solo guardara 4 bits, sería un desbordamiento (overflow).':
      'Igual que al sumar a mano: 1 + 1 = 10 en binario, se escribe 0 y se lleva 1 a la siguiente columna.';
  }
  $('#sm').addEventListener('click',function(e){
    var b=e.target.closest('.sm-b');if(!b)return;
    var arr=b.getAttribute('data-f')==='A'?A:B,k=+b.getAttribute('data-k');
    arr[k]=arr[k]?0:1;render();
  });
  render();
};
})();
