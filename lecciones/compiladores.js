/* Laboratorios de la lección «Compiladores»: un compilador pequeño, pero completo, para expresiones con
   + - * / y paréntesis, con asignación opcional (nombre = expresión). Todo el texto que escribe el estudiante
   se muestra con textContent o esc(), nunca como HTML. Cada laboratorio se registra en AT.labs. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;
var VARS={precio:40,cantidad:3,descuento:10,x:5,y:2};
var LETRA='A-Za-zÁÉÍÓÚÜÑáéíóúüñ_';

/* ---------- Análisis léxico ---------- */
function lexico(src){
  var re=new RegExp('\\s+|(\\d+(?:\\.\\d+)?)|(['+LETRA+']['+LETRA+'0-9]*)|([+\\-*/])|([=()])','y'),out=[],i=0,m;
  while(i<src.length){
    re.lastIndex=i;m=re.exec(src);
    if(!m)return {tokens:out,error:{pos:i,txt:'El símbolo «'+src[i]+'» (posición '+(i+1)+') no es parte del lenguaje.'}};
    if(m[1])out.push({t:'num',v:m[1],pos:i});
    else if(m[2])out.push({t:'id',v:m[2],pos:i});
    else if(m[3])out.push({t:'op',v:m[3],pos:i});
    else if(m[4])out.push({t:'sig',v:m[4],pos:i});
    i=re.lastIndex;
  }
  return {tokens:out};
}

/* ---------- Análisis sintáctico (descenso recursivo) ---------- */
function sintactico(tokens){
  var k=0;
  function ver(){return tokens[k]}
  function err(t){throw new Error(t)}
  function factor(){
    var t=ver();
    if(!t)err('Falta un número, una variable o un paréntesis al final.');
    if(t.t==='num'){k++;return {t:'num',v:+t.v}}
    if(t.t==='id'){k++;return {t:'var',n:t.v}}
    if(t.v==='('){k++;var e=expr();if(!ver()||ver().v!==')')err('Falta cerrar un paréntesis.');k++;return e}
    if(t.v==='-'){k++;return {t:'neg',a:factor()}}
    err('No se esperaba «'+t.v+'» en la posición '+(t.pos+1)+'.');
  }
  function termino(){
    var a=factor();
    while(ver()&&(ver().v==='*'||ver().v==='/')){var o=tokens[k++].v;a={t:'op',o:o,a:a,b:factor()}}
    return a;
  }
  function expr(){
    var a=termino();
    while(ver()&&(ver().v==='+'||ver().v==='-')){var o=tokens[k++].v;a={t:'op',o:o,a:a,b:termino()}}
    return a;
  }
  var raiz;
  if(tokens.length>1&&tokens[0].t==='id'&&tokens[1].v==='='){k=2;raiz={t:'asig',n:tokens[0].v,e:expr()}}
  else raiz=expr();
  if(k<tokens.length)err('Sobra «'+tokens[k].v+'» en la posición '+(tokens[k].pos+1)+'.');
  return raiz;
}
function compilar(src){
  var lx=lexico(src);
  if(lx.error)return {error:'Error léxico: '+lx.error.txt};
  if(!lx.tokens.length)return {error:'Escribe algo para compilar.'};
  try{return {arbol:sintactico(lx.tokens)}}catch(e){return {error:'Error de sintaxis: '+e.message}}
}
/* ---------- Análisis semántico ---------- */
function semantico(n){
  if(!n)return null;
  if(n.t==='var'&&!(n.n in VARS))return 'La variable «'+n.n+'» no existe. Usa precio, cantidad, descuento, x o y.';
  return semantico(n.a)||semantico(n.b)||semantico(n.e);
}
var SIM={'+':'+','-':'−','*':'×','/':'÷'};
function evaluar(n){
  switch(n.t){
    case 'num':return n.v;
    case 'var':return VARS[n.n];
    case 'neg':return -evaluar(n.a);
    case 'asig':return evaluar(n.e);
    default:var a=evaluar(n.a),b=evaluar(n.b);return n.o==='+'?a+b:n.o==='-'?a-b:n.o==='*'?a*b:a/b;
  }
}
function num(v){return isFinite(v)?fmt(v,Math.round(v)===v?0:2):'∞'}

/* ---------- Demo 1: separa en tokens ---------- */
AT.labs['co-lexico']=function(){
  var inp=$('#lxIn');
  var NOM={id:'identificador',num:'número',op:'operador',sig:'signo'};
  function render(){
    var r=lexico(inp.value),h='';
    r.tokens.forEach(function(t){h+='<span class="tk tk-'+t.t+'"><b>'+esc(t.v)+'</b><small>'+NOM[t.t]+'</small></span>'});
    $('#lxTok').innerHTML=h;
    if(r.error){$('#lxStat').setAttribute('data-k','bad');$('#lxMsg').textContent='Error léxico: '+r.error.txt}
    else{$('#lxStat').setAttribute('data-k',r.tokens.length?'good':'');$('#lxMsg').textContent=r.tokens.length+(r.tokens.length===1?' token. ':' tokens. ')+'Los espacios no cuentan: «precio*2» y «precio * 2» dan los mismos tokens.'}
  }
  inp.addEventListener('input',render);
  render();
};

/* ---------- Demo 2: árbol de sintaxis ---------- */
AT.labs['co-arbol']=function(){
  var inp=$('#asIn'),svg=$('#asSvg');
  /* Coloca cada nodo: x según su orden de izquierda a derecha, y según su profundidad */
  function colocar(n,d,lista){
    if(n.t==='op'){colocar(n.a,d+1,lista);n.x=lista.length;lista.push(n);colocar(n.b,d+1,lista)}
    else if(n.t==='neg'){n.x=lista.length;lista.push(n);colocar(n.a,d+1,lista)}
    else{n.x=lista.length;lista.push(n)}
    n.d=d;return lista;
  }
  function etiqueta(n){return n.t==='num'?num(n.v):n.t==='var'?n.n:n.t==='neg'?'−':SIM[n.o]}
  function render(){
    var r=compilar(inp.value);
    if(r.error){svg.innerHTML='';svg.setAttribute('viewBox','0 0 10 10');$('#asStat').setAttribute('data-k','bad');$('#asMsg').textContent=r.error;return}
    var a=r.arbol.t==='asig'?r.arbol.e:r.arbol,lista=colocar(a,0,[]),prof=0;
    lista.forEach(function(n){if(n.d>prof)prof=n.d});
    var W=Math.max(lista.length*46,140),H=(prof+1)*56+10,h='';
    function px(n){return 23+n.x*46+(W-lista.length*46)/2}
    function py(n){return 26+n.d*56}
    (function aristas(n){
      [n.a,n.b].forEach(function(c){if(c&&n.t!=='num'&&n.t!=='var'){h+='<line class="as-e" x1="'+px(n)+'" y1="'+py(n)+'" x2="'+px(c)+'" y2="'+py(c)+'"/>';aristas(c)}});
    })(a);
    lista.forEach(function(n){
      var hoja=n.t==='num'||n.t==='var';
      h+='<g class="as-n'+(hoja?' hoja':'')+'"><circle cx="'+px(n)+'" cy="'+py(n)+'" r="18"/><text x="'+px(n)+'" y="'+(py(n)+4)+'">'+esc(etiqueta(n)).slice(0,8)+'</text></g>';
    });
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    svg.style.maxWidth=(W/16)+'rem';
    svg.innerHTML=h;
    var sem=semantico(a);
    if(sem){$('#asStat').setAttribute('data-k','warn');$('#asMsg').textContent='El árbol está bien formado, pero hay un error semántico: '+sem;return}
    var m='Resultado: '+num(evaluar(a))+'. ';
    if(a.t==='op'&&(a.o==='+'||a.o==='-')&&a.b.t==='op'&&(a.b.o==='*'||a.b.o==='/'))m+='La multiplicación queda más abajo: se calcula antes que la suma, aunque esté a la derecha.';
    else if(a.t==='op'&&(a.o==='*'||a.o==='/')&&a.a.t==='op'&&(a.a.o==='+'||a.a.o==='-'))m+='Los paréntesis bajaron la suma en el árbol: ahora se calcula primero.';
    else if(a.t==='op'&&a.o==='-'&&a.a.t==='op'&&a.a.o==='-')m+='Las restas se agrupan de izquierda a derecha: (10 − 4) − 3, no 10 − (4 − 3).';
    else m+='Para calcular, se resuelve primero lo de abajo y se sube hasta la raíz.';
    $('#asStat').setAttribute('data-k','good');$('#asMsg').textContent=m;
  }
  inp.addEventListener('input',function(){AT.setPressed($('#asPre'),function(b){return b.getAttribute('data-v')===inp.value});render()});
  elegir('#asPre',function(v){inp.value=v;render()});
  render();
};

/* ---------- Demo 3: de árbol a instrucciones ---------- */
AT.labs['co-codigo']=function(){
  var inp=$('#cdIn'),opt=$('#cdOpt'),prog=[],pc=0,pila=[],guardado=null;
  var OPS={'+':'SUMA','-':'RESTA','*':'MULT','/':'DIV'};
  /* Plegado de constantes: si los dos lados son números, se calcula al compilar */
  function plegar(n){
    if(n.t==='op'){var a=plegar(n.a),b=plegar(n.b);if(a.t==='num'&&b.t==='num')return {t:'num',v:evaluar({t:'op',o:n.o,a:a,b:b})};return {t:'op',o:n.o,a:a,b:b}}
    if(n.t==='neg'){var x=plegar(n.a);return x.t==='num'?{t:'num',v:-x.v}:{t:'neg',a:x}}
    if(n.t==='asig')return {t:'asig',n:n.n,e:plegar(n.e)};
    return n;
  }
  function generar(n,out){
    if(n.t==='num')out.push(['PON',num(n.v),n.v]);
    else if(n.t==='var')out.push(['CARGA',n.n]);
    else if(n.t==='neg'){generar(n.a,out);out.push(['NEG'])}
    else if(n.t==='asig'){generar(n.e,out);out.push(['GUARDA',n.n])}
    else{generar(n.a,out);generar(n.b,out);out.push([OPS[n.o]])}
    return out;
  }
  function compilarTodo(){
    var r=compilar(inp.value);pc=0;pila=[];guardado=null;prog=[];
    if(r.error)return r.error;
    var sem=semantico(r.arbol);if(sem)return 'Error semántico: '+sem;
    var arbol=opt.checked?plegar(r.arbol):r.arbol;
    prog=generar(arbol,[]);
    return '';
  }
  function render(error){
    $('#cdIns').innerHTML=prog.map(function(i,k){
      return '<li class="'+(k<pc?'hecha':k===pc?'sig':'')+'"><b>'+i[0]+'</b>'+(i[1]!==undefined?' '+esc(i[1]):'')+'</li>';
    }).join('');
    $('#cdPila').innerHTML=pila.length?pila.slice().reverse().map(function(v,k){return '<span'+(k===0?' class="tope"':'')+'>'+num(v)+'</span>'}).join(''):'<em>vacía</em>';
    $('#cdVars').textContent=guardado?guardado[0]+' = '+num(guardado[1]):'precio = 40, cantidad = 3, descuento = 10, x = 5, y = 2';
    var fin=!prog.length||pc>=prog.length;
    $('#cdSig').setAttribute('aria-disabled',fin?'true':'false');
    if(error){$('#cdStat').setAttribute('data-k','bad');$('#cdMsg').textContent=error;return}
    if(!pc){$('#cdStat').setAttribute('data-k','');$('#cdMsg').textContent=prog.length+' instrucciones'+(opt.checked?' con la optimización':'')+'. Pulsa «Siguiente instrucción».'}
  }
  function paso(){
    if(pc>=prog.length)return;
    var i=prog[pc],m;
    if(i[0]==='PON'){pila.push(i[2]);m='PON '+i[1]+': pone el número en la pila.'}
    else if(i[0]==='CARGA'){pila.push(VARS[i[1]]);m='CARGA '+i[1]+': lee la variable (vale '+num(VARS[i[1]])+') y la pone en la pila.'}
    else if(i[0]==='NEG'){pila.push(-pila.pop());m='NEG: cambia el signo del valor de arriba.'}
    else if(i[0]==='GUARDA'){guardado=[i[1],pila.pop()];m='GUARDA '+i[1]+': saca el resultado de la pila y lo guarda en la variable.'}
    else{var b=pila.pop(),a=pila.pop(),v=i[0]==='SUMA'?a+b:i[0]==='RESTA'?a-b:i[0]==='MULT'?a*b:a/b;pila.push(v);
      m=i[0]+': saca '+num(a)+' y '+num(b)+', calcula '+num(a)+' '+{SUMA:'+',RESTA:'−',MULT:'×',DIV:'÷'}[i[0]]+' '+num(b)+' = '+num(v)+' y pone el resultado.'}
    pc++;render();
    if(pc>=prog.length)m+=' Fin del programa.';
    $('#cdStat').setAttribute('data-k',pc>=prog.length?'good':'');$('#cdMsg').textContent=m;
  }
  function todo(){render(compilarTodo())}
  inp.addEventListener('input',function(){AT.setPressed($('#cdPre'),function(b){return b.getAttribute('data-v')===inp.value});todo()});
  opt.addEventListener('change',todo);
  elegir('#cdPre',function(v){inp.value=v;todo()});
  $('#cdSig').addEventListener('click',function(){if(this.getAttribute('aria-disabled')!=='true')paso()});
  $('#cdReset').addEventListener('click',todo);
  todo();
};
})();
