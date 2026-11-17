/* Laboratorios de la lección «Contraseñas y autenticación». Lo que el estudiante escribe se procesa solo en
   este navegador: no se guarda ni se envía. Cada laboratorio se registra en AT.labs. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

/* Tiempo legible para una cantidad de segundos */
function duracion(s){
  if(s<1)return 'Al instante';
  var U=[[60,'segundo','segundos'],[60,'minuto','minutos'],[24,'hora','horas'],[365.25,'día','días'],[1e3,'año','años']];
  var v=s,k=0;
  while(k<U.length-1&&v>=U[k][0]){v/=U[k][0];k++}
  if(k===U.length-1&&v>=1e3){
    var a=v;
    if(a>=1e12)return 'Más de un billón de años';
    if(a>=1e9)return fmt(a/1e9,0)+' mil millones de años';
    if(a>=1e6)return fmt(a/1e6,0)+' millones de años';
    return fmt(a,0)+' años';
  }
  v=Math.round(v);
  return fmt(v,0)+' '+(v===1?U[k][1]:U[k][2]);
}
/* Tiempo promedio para adivinar: la mitad de las combinaciones */
function tiempo(bits,porSeg){return Math.pow(2,bits-1)/porSeg}

/* ---------- Demo 1: ¿cuánto tarda en adivinarse? ---------- */
AT.labs['pw-fuerza']=function(){
  var inp=$('#fzIn');
  var COMUNES=['123456','password','12345678','qwerty','123456789','12345','1234','111111','1234567','123123','abc123','000000','654321','iloveyou',
    'contraseña','contrasena','admin','password1','qwerty123','1q2w3e4r','tequiero','teamo','hola123','futbol','mexico','america','superman','dragon','pokemon','12345678910'];
  var SEC=['abcdefghijklmnopqrstuvwxyz','0123456789','qwertyuiopasdfghjklzxcvbnm','1qaz2wsx3edc'];
  function analizar(pw){
    var p=0,l=pw.toLowerCase();
    var may=/[A-Z]/.test(pw),min=/[a-z]/.test(pw),num=/[0-9]/.test(pw),sim=/[^A-Za-z0-9]/.test(pw);
    if(min)p+=26;if(may)p+=26;if(num)p+=10;if(sim)p+=33;
    var bits=pw.length?pw.length*Math.log2(Math.max(p,2)):0,avisos=[];
    if(COMUNES.indexOf(l)>=0){bits=Math.min(bits,5);avisos.push('Está entre las contraseñas más usadas: es lo primero que se prueba.')}
    /* Palabra de diccionario seguida de números (Mexico2024): el atacante prueba eso primero */
    var m=/^([a-zñáéíóú]+)(\d{1,4})[^a-z0-9]?$/i.exec(pw);
    if(m&&m[1].length>=3){bits=Math.min(bits,22+m[2].length*3.3);avisos.push('Es una palabra seguida de números: un patrón que se prueba muy pronto.')}
    if(/^(.)\1+$/.test(pw)){bits=Math.min(bits,Math.log2(p*pw.length));avisos.push('Repite el mismo carácter.')}
    SEC.forEach(function(s){for(var i=0;i+4<=l.length;i++)if(s.indexOf(l.slice(i,i+4))>=0){avisos.push('Tiene una secuencia («'+l.slice(i,i+4)+'»).');bits=Math.min(bits,bits*0.6);return}});
    if(/(19|20)\d\d/.test(pw)&&!m)avisos.push('Parece tener un año: los atacantes prueban fechas.');
    return {bits:bits,largo:pw.length>=12,may:may,num:num,sim:sim,avisos:avisos};
  }
  function render(){
    var pw=inp.value,a=analizar(pw);
    $('#fzList').innerHTML=[[a.largo,'12 caracteres o más ('+pw.length+')'],[a.may,'Mayúsculas'],[a.num,'Números'],[a.sim,'Símbolos'],[!a.avisos.length&&pw.length>0,'Sin patrones predecibles']]
      .map(function(x){return '<li class="'+(x[0]?'si':'no')+'"><span class="vh">'+(x[0]?'Cumple: ':'No cumple: ')+'</span>'+esc(x[1])+'</li>'}).join('');
    $('#fzBits').textContent=fmt(a.bits,0)+' bits';
    $('#fzBar').style.width=Math.min(100,a.bits/100*100)+'%';
    $('#fzOn').textContent=duracion(tiempo(a.bits,10));
    $('#fzOff').textContent=duracion(tiempo(a.bits,1e10));
    var k=a.bits<40?'bad':a.bits<70?'warn':'good';
    var m=!pw?'Escribe algo para medirlo.':a.avisos.length?a.avisos.join(' '):
      a.bits>=70?'Muy buena: aun con la base de datos robada, adivinarla tomaría muchísimo tiempo.':
      a.bits>=40?'Aceptable para un sitio que bloquea intentos, débil si roban la base de datos. Hazla más larga.':'Débil: hazla mucho más larga.';
    $('#fzStat').setAttribute('data-k',pw?k:'');$('#fzMsg').textContent=m;
  }
  inp.addEventListener('input',render);
  render();
};

/* ---------- Demo 2: frase de contraseña ---------- */
AT.labs['pw-frase']=function(){
  var PAL=('agua aire alba alce algo alma ancla anillo arco arena arpa astro avena azul baile balsa banco barco barro bote brisa broma bruja '+
    'cabra cacao cadena cafe caja calma cama campo canal canoa caracol carta casa cebra cedro cena cerro cielo cinta circo cisne clavo cobre '+
    'codo cofre cohete coral corona coyote cubo cuento cuerda dado dedo delfin diente disco dragon duende duna eco elote enano escoba espejo '+
    'faro feria fideo flauta flor foca foco fresa fruta fuego gallo ganso gato gema globo gorra gota grillo grulla guante guitarra hada '+
    'hielo hierro higo hilo hoja horno hueso huevo humo iglu imán isla jabon jade jaguar jarra jirafa joya juego jugo junco lago lana '+
    'lapiz lava leche lemur leon libro lima limon lince lirio llave lluvia lobo loro luna lupa madera maiz mango mapa mar marco mesa miel '+
    'mono monte mora mosca muro nabo nave nido niebla nieve noche nopal nube nuez ola olivo onda oro oruga oso ostra pala paloma pan '+
    'papel pasto pato pera perla pez piano piedra pino pinza pipa pista playa pluma polvo pozo prisma puente pulpo queso radio rama rana '+
    'rayo red reloj remo rio roble roca rosa rueda sal salto selva seta silla sol sombra sopa tabla taco tambor taza tejon tela tigre '+
    'tinta tomate toro torre trigo tren trompo tuna tunel uva vaca vapor vela velero verso vidrio viento violin volcan yate yegua yeso '+
    'yoyo zafiro zanja zorro zumo abeja ajo arbol barca bola brujula burro cactus canela cereza chile cometa conejo cuarzo dunas eje '+
    'faisan fresno gaviota girasol granizo helado hormiga iman jazmin kiwi lechuga manzana marea nutria orquidea pajaro panda pepino').split(' ');
  var n=6,palabras=[];
  function azar(max){var u=new Uint32Array(1),lim=Math.floor(4294967296/max)*max;do{crypto.getRandomValues(u)}while(u[0]>=lim);return u[0]%max}
  function render(){
    var lista=PAL.slice(0,256),b=n*Math.log2(lista.length),b2=n*Math.log2(7776);
    $('#frOut').textContent=palabras.join('-');
    $('#frBits').textContent=fmt(b,0)+' bits';
    $('#frBits2').textContent=fmt(b2,0)+' bits';
    $('#frT').textContent=duracion(tiempo(b2,1e10))+' (lista grande)';
    $('#frMsg').textContent='Cada palabra de esta lista suma 8 bits. Los generadores reales usan listas de 7,776 palabras: 12.9 bits por palabra, así que '+n+' palabras dan '+fmt(b2,0)+' bits.';
  }
  function generar(){var lista=PAL.slice(0,256);palabras=[];for(var k=0;k<n;k++)palabras.push(lista[azar(lista.length)]);render()}
  elegir('#frN',function(v){n=+v;generar()});
  $('#frGen').addEventListener('click',generar);
  generar();
};

/* ---------- Demo 3: hash y sal ---------- */
AT.labs['pw-hash']=function(){
  var inp=$('#hsIn'),sal=$('#hsSal'),sales=null,turno=0;
  var sutil=window.crypto&&crypto.subtle&&crypto.subtle.digest;
  function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}
  function sha(t){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)).then(hex)}
  function nuevaSal(){var u=new Uint8Array(4);crypto.getRandomValues(u);return hex(u.buffer)}
  /* Cambia la última letra o número por la siguiente: gato123 → gato124 */
  function vecina(t){
    if(!t)return 'a';
    var c=t[t.length-1],s=c==='9'?'0':c==='z'?'a':c==='Z'?'A':String.fromCharCode(c.charCodeAt(0)+1);
    return t.slice(0,-1)+s;
  }
  function distintos(a,b){var n=0;for(var k=0;k<a.length;k++)if(a[k]!==b[k])n++;return n}
  function fila(dt,dd,cls){return '<div'+(cls?' class="'+cls+'"':'')+'><dt>'+dt+'</dt><dd class="mono">'+dd+'</dd></div>'}
  function render(){
    if(!sutil){$('#hsMsg').textContent='Tu navegador no permite calcular hashes en esta página (necesita una conexión segura, https).';return}
    var pw=inp.value,mio=++turno;
    if(sal.checked){
      if(!sales)sales=[nuevaSal(),nuevaSal()];
      Promise.all([sha(sales[0]+pw),sha(sales[1]+pw)]).then(function(h){
        if(mio!==turno)return;
        $('#hsOut').innerHTML=fila('Ana · sal '+sales[0],h[0])+fila('Beto · sal '+sales[1]+' (misma contraseña)',h[1]);
        $('#hsMsg').textContent='Ana y Beto usan «'+pw+'», pero con sales distintas sus hashes no se parecen en nada. El sitio guarda la sal junto al hash; no es secreta, solo única.';
      });
    }else{
      var v=vecina(pw);
      Promise.all([sha(pw),sha(v)]).then(function(h){
        if(mio!==turno)return;
        var d=distintos(h[0],h[1]);
        $('#hsOut').innerHTML=fila(esc(pw||'(vacía)'),h[0])+fila(esc(v)+' (cambia el último carácter)',h[1]);
        $('#hsMsg').textContent='Cambiar un solo carácter cambia '+d+' de los 64 dígitos del hash. Por eso no se puede «acercar» poco a poco a la contraseña: o es exacta o no se parece en nada.';
      });
    }
  }
  inp.addEventListener('input',render);
  sal.addEventListener('change',function(){sales=null;render()});
  render();
};
})();
