/* Laboratorios de la lección «Aprendizaje automático». Cada uno se registra en AT.labs con el nombre de su
   bloque «laboratorio»; bloques.js lo llama después de copiar su plantilla. Los modelos son de verdad,
   aunque pequeños: regresión con descenso de gradiente, k vecinos y polinomios por mínimos cuadrados. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,elegir=AT.elegir,reduce=AT.reduce;

/* ---------- Demo 1: ajusta una recta ---------- */
AT.labs['aa-recta']=function(){
  var X=[1,2,3,4,5,6,7,8,9,10],Y=[5.2,5.9,6.1,6.8,7.0,7.9,8.1,8.6,9.4,9.6];
  var m=$('#arM'),b=$('#arB'),svg=$('#arSvg'),pasos=0,raf=null,M=+m.value,B=+b.value;
  var X0=40,X1=325,Y0=195,Y1=12;
  function px(x){return X0+(x/12)*(X1-X0)}
  function py(y){return Y0-((y-4)/7)*(Y0-Y1)}
  function error(M,B){var s=0;X.forEach(function(x,k){var e=Y[k]-(M*x+B);s+=e*e});return s/X.length}
  function render(){
    var h='<path class="ar-eje" d="M'+X0+' '+Y1+' V'+Y0+' H'+X1+'"/>';
    for(var t=2;t<=12;t+=2)h+='<text class="ar-t" x="'+px(t)+'" y="'+(Y0+14)+'">'+t+'</text>';
    for(var c=4;c<=10;c+=2)h+='<text class="ar-t ar-ty" x="'+(X0-6)+'" y="'+(py(c)+4)+'">'+c+'</text>';
    h+='<text class="ar-t" x="'+((X0+X1)/2)+'" y="'+(Y0+26)+'">horas de estudio</text>';
    X.forEach(function(x,k){h+='<line class="ar-r" x1="'+px(x)+'" y1="'+py(Y[k])+'" x2="'+px(x)+'" y2="'+py(M*x+B)+'"/>'});
    h+='<line class="ar-l" x1="'+px(0)+'" y1="'+py(B)+'" x2="'+px(12)+'" y2="'+py(M*12+B)+'"/>';
    X.forEach(function(x,k){h+='<circle class="ar-p" cx="'+px(x)+'" cy="'+py(Y[k])+'" r="4.5"/>'});
    svg.innerHTML=h;
    var e=error(M,B);
    $('#arMv').textContent=fmt(M,2);$('#arBv').textContent=fmt(B,1);
    m.setAttribute('aria-valuetext','Pendiente '+fmt(M,2));b.setAttribute('aria-valuetext','Valor inicial '+fmt(B,1));
    $('#arErr').textContent=fmt(e,3);$('#arBar').style.width=Math.min(100,e/4*100)+'%';
    $('#arPred').textContent=fmt(M*12+B,1);
    $('#arPasos').textContent=pasos?pasos+' pasos de entrenamiento':'';
    $('#arMsg').textContent=e<0.06?'Muy buen ajuste: cada hora de estudio suma unos '+fmt(M,2)+' puntos. El modelo predice '+fmt(M*12+B,1)+' para 12 horas, aunque ningún estudiante estudió tanto.':
      'Las líneas punteadas son el error de cada punto. Busca la recta que las haga lo más cortas posible.';
  }
  /* Un paso de descenso de gradiente sobre la pendiente y el valor inicial */
  function paso(M,B){
    var gm=0,gb=0,n=X.length,lr=0.015;
    X.forEach(function(x,k){var e=(M*x+B)-Y[k];gm+=2*e*x/n;gb+=2*e/n});
    return [M-lr*gm,B-lr*gb*4];
  }
  function entrenar(){
    if(raf)return;
    var meta=pasos+3000,porCuadro=reduce?3000:60;
    function cuadro(){
      for(var k=0;k<porCuadro&&pasos<meta;k++){var r=paso(M,B);M=r[0];B=r[1];pasos++}
      /* Los controles redondean a su paso; el modelo guarda el valor exacto */
      m.value=M;b.value=B;render();
      if(pasos<meta&&!reduce)raf=requestAnimationFrame(cuadro);else raf=null;
    }
    cuadro();
  }
  m.addEventListener('input',function(){M=+m.value;pasos=0;render()});
  b.addEventListener('input',function(){B=+b.value;pasos=0;render()});
  $('#arEntrenar').addEventListener('click',entrenar);
  render();
};

/* ---------- Demo 2: clasifica por vecinos ---------- */
AT.labs['aa-vecinos']=function(){
  /* [peso kg, altura cm, 0 gato / 1 perro] */
  var D=[[3,23,0],[4,25,0],[4.5,24,0],[5,28,0],[6,27,0],[3.5,22,0],[5.5,30,0],[7,29,0],
         [8,33,1],[10,35,1],[12,42,1],[20,55,1],[25,58,1],[30,62,1],[35,68,1],[15,48,1],[6.5,31,1]];
  var NOM=['gato','perro'],svg=$('#vcSvg'),peso=$('#vcPeso'),alt=$('#vcAlt'),k=3;
  var X0=38,X1=328,Y0=200,Y1=10;
  function px(p){return X0+(p/40)*(X1-X0)}
  function py(a){return Y0-((a-15)/60)*(Y0-Y1)}
  /* Distancia con cada eje escalado a su rango, para que kilos y centímetros pesen parecido */
  function dist(a,b){var dp=(a[0]-b[0])/40,da=(a[1]-b[1])/60;return Math.sqrt(dp*dp+da*da)}
  function render(){
    var n=[+peso.value,+alt.value],orden=D.map(function(d,i){return {i:i,d:dist(n,d)}}).sort(function(a,b){return a.d-b.d}).slice(0,k);
    var votos=[0,0];orden.forEach(function(o){votos[D[o.i][2]]++});
    var clase=votos[1]>votos[0]?1:0;
    var h='<path class="vc-eje" d="M'+X0+' '+Y1+' V'+Y0+' H'+X1+'"/><text class="vc-t" x="'+((X0+X1)/2)+'" y="'+(Y0+24)+'">peso (kg)</text>';
    for(var t=0;t<=40;t+=10)h+='<text class="vc-t" x="'+px(t)+'" y="'+(Y0+13)+'">'+t+'</text>';
    h+='<text class="vc-t vc-ty" x="'+(X0-5)+'" y="'+(py(20)+4)+'">20</text><text class="vc-t vc-ty" x="'+(X0-5)+'" y="'+(py(70)+4)+'">70 cm</text>';
    orden.forEach(function(o){h+='<line class="vc-v" x1="'+px(n[0])+'" y1="'+py(n[1])+'" x2="'+px(D[o.i][0])+'" y2="'+py(D[o.i][1])+'"/>'});
    D.forEach(function(d,i){
      var x=px(d[0]),y=py(d[1]),cerca=orden.some(function(o){return o.i===i});
      h+=d[2]?'<rect class="vc-p'+(cerca?' cerca':'')+'" x="'+(x-4.5)+'" y="'+(y-4.5)+'" width="9" height="9"/>':'<circle class="vc-g'+(cerca?' cerca':'')+'" cx="'+x+'" cy="'+y+'" r="5"/>';
    });
    var cx=px(n[0]),cy=py(n[1]);
    h+='<path class="vc-n '+(clase?'p':'g')+'" d="M'+cx+' '+(cy-8)+' L'+(cx+8)+' '+cy+' L'+cx+' '+(cy+8)+' L'+(cx-8)+' '+cy+'Z"/>';
    svg.innerHTML=h;
    $('#vcPesoV').textContent=fmt(n[0],1)+' kg';$('#vcAltV').textContent=n[1]+' cm';
    peso.setAttribute('aria-valuetext',fmt(n[0],1)+' kilos');alt.setAttribute('aria-valuetext',n[1]+' centímetros');
    var empate=votos[0]===votos[1];
    $('#vcStat').setAttribute('data-k',votos[0]&&votos[1]?'warn':'good');
    $('#vcMsg').textContent='De sus '+k+(k===1?' vecino más cercano':' vecinos más cercanos')+', '+votos[0]+(votos[0]===1?' es gato':' son gatos')+' y '+votos[1]+(votos[1]===1?' es perro':' son perros')+
      '. El modelo dice: '+NOM[clase]+'.'+(votos[0]&&votos[1]?' Está en la frontera: con otro k podría cambiar de opinión.':'');
  }
  /* Tocar la gráfica mueve el animal nuevo */
  svg.addEventListener('click',function(e){
    var r=svg.getBoundingClientRect(),vx=(e.clientX-r.left)/r.width*340,vy=(e.clientY-r.top)/r.height*230;
    var p=Math.max(1,Math.min(40,(vx-X0)/(X1-X0)*40)),a=Math.max(15,Math.min(75,15+(Y0-vy)/(Y0-Y1)*60));
    peso.value=Math.round(p*2)/2;alt.value=Math.round(a);render();
  });
  peso.addEventListener('input',render);alt.addEventListener('input',render);
  elegir('#vcK',function(v){k=+v;render()});
  render();
};

/* ---------- Demo 3: memorizar no es aprender ---------- */
AT.labs['aa-sobreajuste']=function(){
  /* Datos de una curva suave con algo de ruido. Entrenamiento y prueba se intercalan. */
  function verdad(x){return Math.sin(x*2.6)*0.8+x*0.3}
  var RUIDO=[0.18,-0.22,0.1,0.25,-0.15,-0.05,0.2,-0.25,0.12,-0.1,0.05,-0.2,0.22,-0.12,0.15,-0.18,0.08,0.24,-0.08,0.1];
  var E=[],P=[];
  for(var i=0;i<20;i++){var x=-1+i*(2/19),pt=[x,verdad(x)+RUIDO[i]];(i%2?P:E).push(pt)}
  var g=3,svg=$('#sjSvg'),X0=20,X1=330,YM=100,ESC=60;
  /* Mínimos cuadrados: resuelve (AᵀA)c = Aᵀy con eliminación de Gauss */
  function ajustar(gr){
    var n=gr+1,M=[],v=[];
    for(var r=0;r<n;r++){M.push([]);for(var c=0;c<n;c++){var s=0;E.forEach(function(p){s+=Math.pow(p[0],r+c)});M[r].push(s)}var t=0;E.forEach(function(p){t+=Math.pow(p[0],r)*p[1]});v.push(t)}
    for(var k=0;k<n;k++){
      var piv=k;for(r=k+1;r<n;r++)if(Math.abs(M[r][k])>Math.abs(M[piv][k]))piv=r;
      var tm=M[k];M[k]=M[piv];M[piv]=tm;var tv=v[k];v[k]=v[piv];v[piv]=tv;
      for(r=k+1;r<n;r++){var f=M[r][k]/M[k][k];for(c=k;c<n;c++)M[r][c]-=f*M[k][c];v[r]-=f*v[k]}
    }
    var co=new Array(n);
    for(k=n-1;k>=0;k--){var s2=v[k];for(c=k+1;c<n;c++)s2-=M[k][c]*co[c];co[k]=s2/M[k][k]}
    return co;
  }
  function evaluar(co,x){return co.reduce(function(s,c,k){return s+c*Math.pow(x,k)},0)}
  function ecm(co,datos){return datos.reduce(function(s,p){var e=evaluar(co,p[0])-p[1];return s+e*e},0)/datos.length}
  function px(x){return X0+(x+1)/2*(X1-X0)}
  function py(y){return Math.max(-50,Math.min(250,YM-y*ESC))}
  function render(){
    var co=ajustar(g),d='',h='<line class="sj-eje" x1="'+X0+'" y1="'+YM+'" x2="'+X1+'" y2="'+YM+'"/>';
    for(var k=0;k<=200;k++){var x=-1+k/100;d+=(k?' L':'M')+px(x).toFixed(1)+' '+py(evaluar(co,x)).toFixed(1)}
    h+='<path class="sj-c" d="'+d+'"/>';
    E.forEach(function(p){h+='<circle class="sj-e" cx="'+px(p[0])+'" cy="'+py(p[1])+'" r="4.5"/>'});
    P.forEach(function(p){h+='<circle class="sj-p" cx="'+px(p[0])+'" cy="'+py(p[1])+'" r="4.5"/>'});
    svg.innerHTML=h;
    var ee=ecm(co,E),ep=ecm(co,P);
    $('#sjEe').textContent=fmt(ee,3);$('#sjEp').textContent=ep>100?'más de 100':fmt(ep,3);
    $('#sjMsg').textContent=g===1?'Una recta es demasiado rígida: no alcanza a seguir la forma de los datos. Falla en entrenamiento y en prueba (subajuste).':
      g===3?'La curva suave sigue la tendencia sin perseguir cada punto: error bajo en los dos grupos. Esto es aprender.':
      'La curva muy flexible pasa por todos los puntos de entrenamiento (error casi 0), pero entre ellos se dispara y falla con los de prueba. Memorizó.';
  }
  elegir('#sjG',function(v){g=+v;render()});
  render();
};
})();
