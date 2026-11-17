/* Laboratorios de la lección «Qué es la inteligencia artificial». Cada uno se registra en AT.labs con el
   nombre de su bloque «laboratorio»; bloques.js lo llama después de copiar su plantilla. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc;

/* ---------- Demo 1: reglas contra ejemplos ---------- */
AT.labs['ia-reglas']=function(){
  var MSJ=[
    ['¡GANA un celular GRATIS! Entra ya: promo.example',1],
    ['Mañana hay examen de física, no lo olvides',0],
    ['URGENTE: tu cuenta será bloqueada, verifica en banco-seguro.example',1],
    ['Tu pedido: el envío es gratis si compras antes del viernes',0],
    ['Te paso el enlace de la clase: clase.example/fisica',0],
    ['Ganaste un premio, reclámalo hoy',1],
    ['¿Vamos al cine el sábado?',0],
    ['OFERTA ÚNICA: crédito aprobado sin revisar tu historial',1],
    ['Urgente: trae tu credencial mañana, la piden en la entrada',0],
    ['Descarga GRATIS el libro que pidió la maestra: libros.example',0],
    ['Felicidades, eres el visitante un millón. Gana tu premio: premio.example',1],
    ['Mamá dice que llegues temprano',0]
  ];
  var NOM=['«gratis»','«gana» o «premio»','enlace','MAYÚSCULAS','«urgente»'];
  var REGLAS=[
    function(t){return /gratis/i.test(t)},
    function(t){return /gan[ao]|premio/i.test(t)},
    function(t){return /[a-z0-9-]+\.example/i.test(t)},
    /* Palabras de 4 letras o más, todas en mayúsculas (\b no sirve con letras acentuadas) */
    function(t){return (t.match(/(?:^|[^A-Za-zÁÉÍÓÚÑáéíóúñ])[A-ZÁÉÍÓÚÑ]{4,}(?=$|[^A-Za-zÁÉÍÓÚÑáéíóúñ])/g)||[]).length>=2},
    function(t){return /urgente/i.test(t)}
  ];
  var X=MSJ.map(function(m){return REGLAS.map(function(f){return f(m[0])?1:0})});
  var pesos=null;   /* null: se usan las reglas manuales */
  /* Perceptrón: ajusta un peso por regla y un sesgo hasta clasificar bien los ejemplos */
  function entrenar(){
    var w=[0,0,0,0,0],b=0,vueltas=0;
    for(var e=0;e<50;e++){
      var errores=0;vueltas++;
      MSJ.forEach(function(m,k){
        var s=b+X[k].reduce(function(a,x,j){return a+x*w[j]},0),pred=s>0?1:0,err=m[1]-pred;
        if(err){errores++;b+=err;X[k].forEach(function(x,j){w[j]+=err*x})}
      });
      if(!errores)break;
    }
    return {w:w,b:b,vueltas:vueltas};
  }
  function predecir(k){
    if(pesos)return pesos.b+X[k].reduce(function(a,x,j){return a+x*pesos.w[j]},0)>0?1:0;
    var act=$$('#rgReglas input').filter(function(i){return i.checked}).map(function(i){return +i.getAttribute('data-r')});
    return act.some(function(j){return X[k][j]})?1:0;
  }
  function render(){
    var ok=0,fp=0,fn=0;
    $('#rgTab').innerHTML=MSJ.map(function(m,k){
      var p=predecir(k),bien=p===m[1];
      if(bien)ok++;else if(p)fp++;else fn++;
      return '<tr class="'+(bien?'':'mal')+'"><td>'+esc(m[0])+'</td><td>'+(m[1]?'Spam':'Normal')+'</td><td>'+(p?'Spam':'Normal')+(bien?'':' <b>✗</b>')+'</td></tr>';
    }).join('');
    $('#rgOk').textContent=ok+' de '+MSJ.length;$('#rgBar').style.width=(ok/MSJ.length*100)+'%';
    $('#rgFp').textContent=fp;$('#rgFn').textContent=fn;
    $$('#rgReglas input').forEach(function(i){i.disabled=!!pesos});
    $('#rgManual').hidden=!pesos;
    $('#rgPesos').hidden=!pesos;
    var m;
    if(pesos){
      var max=Math.max.apply(null,pesos.w.map(Math.abs).concat([1]));
      $('#rgPesos').innerHTML='<p class="lbl">Pesos aprendidos (positivo: empuja hacia spam; negativo: hacia normal)</p>'+pesos.w.map(function(w,j){
        return '<div class="br'+(w>0?' on':'')+'"><span class="br-l">'+NOM[j]+'</span><span class="br-b rg-b" aria-hidden="true"><i class="'+(w<0?'neg':'')+'" style="width:'+(Math.abs(w)/max*50)+'%;margin-left:'+(w<0?50-Math.abs(w)/max*50:50)+'%"></i></span><b>'+(w>0?'+':'')+w+'</b></div>';
      }).join('');
      m='Probando y corrigiendo '+pesos.vueltas+' veces, el programa encontró pesos que aciertan '+ok+' de '+MSJ.length+'. Fíjate en «gratis»: como también aparece en mensajes normales, terminó pesando poco o en contra.';
    }else if(!$$('#rgReglas input').some(function(i){return i.checked}))m='Sin reglas, todo pasa como normal: se cuelan los '+MSJ.filter(function(x){return x[1]}).length+' mensajes de spam.';
    else m=ok===MSJ.length?'¡Lo lograste a mano! Con más mensajes y más reglas, encontrar la combinación se vuelve imposible: por eso se aprende de ejemplos.':
      'Con reglas a mano es difícil acertar todo: cada regla atrapa spam, pero también marca mensajes normales. Prueba «Aprender de los ejemplos».';
    $('#rgMsg').textContent=m;
  }
  $('#rgReglas').addEventListener('change',render);
  $('#rgAprender').addEventListener('click',function(){pesos=entrenar();render()});
  $('#rgManual').addEventListener('click',function(){pesos=null;render();$('#rgAprender').focus()});
  render();
};

/* ---------- Demo 2: ¿es inteligencia artificial? ---------- */
AT.labs['ia-donde']=function(){
  var Q=[
    ['El filtro de spam de tu correo',1,'Aprendió de millones de correos marcados qué distingue al spam, y sigue aprendiendo cuando marcas uno.'],
    ['Una calculadora',0,'Sigue reglas fijas de aritmética: no aprende ni decide nada.'],
    ['Las recomendaciones de videos o canciones',1,'Un modelo predice qué te va a gustar a partir de lo que ves tú y millones de personas parecidas.'],
    ['Un semáforo que cambia cada 60 segundos',0,'Es un temporizador. Los semáforos que ajustan sus tiempos según el tráfico que ven las cámaras, en cambio, sí pueden usar IA.'],
    ['Desbloquear el celular con tu cara',1,'Una red neuronal compara los rasgos de tu cara con los que guardó, aunque cambie la luz o traigas lentes.'],
    ['Un termostato que enciende el clima a 25 °C',0,'Una regla fija: si la temperatura pasa de 25, enciende.'],
    ['Un traductor automático',1,'Los traductores actuales son redes neuronales entrenadas con millones de textos traducidos.'],
    ['Un buscador que encuentra una palabra exacta en un documento (Ctrl F)',0,'Compara letras, sin aprender ni interpretar nada.']
  ];
  var i=0,bien=0,resp=0;
  function render(){
    $('#dnQ').textContent=Q[i][0];
    $('#dnSi').setAttribute('aria-disabled','false');$('#dnNo').setAttribute('aria-disabled','false');
    $('#dnStat').setAttribute('data-k','');$('#dnMsg').textContent='¿Usa inteligencia artificial?';
    $('#dnCuenta').textContent=(i+1)+' de '+Q.length+(resp?' · aciertos: '+bien:'');
    $('#dnSig').hidden=true;
  }
  function contestar(si){
    if($('#dnSi').getAttribute('aria-disabled')==='true')return;
    var ok=(si?1:0)===Q[i][1];resp++;if(ok)bien++;
    $('#dnSi').setAttribute('aria-disabled','true');$('#dnNo').setAttribute('aria-disabled','true');
    $('#dnStat').setAttribute('data-k',ok?'good':'bad');
    $('#dnMsg').textContent=(ok?'Correcto. ':'No. ')+(Q[i][1]?'Sí es IA: ':'No es IA: ')+Q[i][2];
    $('#dnCuenta').textContent=(i+1)+' de '+Q.length+' · aciertos: '+bien;
    $('#dnSig').hidden=false;$('#dnSig').textContent=i<Q.length-1?'Siguiente':'Empezar de nuevo';
  }
  $('#dnSi').addEventListener('click',function(){contestar(true)});
  $('#dnNo').addEventListener('click',function(){contestar(false)});
  $('#dnSig').addEventListener('click',function(){if(i<Q.length-1)i++;else{i=0;bien=0;resp=0}render();$('#dnSi').focus()});
  render();
};
})();
