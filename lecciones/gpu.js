/* Laboratorios de la lección «Tarjeta gráfica».
   Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio»; bloques.js lo llama después de
   dibujar el bloque con su plantilla (<template data-lab="..."> en gpu.html). Las preguntas de repaso
   viven en el documento de la lección, no aquí. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,setPressed=AT.setPressed,reduce=AT.reduce;

/* Botones de un grupo (.seg o .chips) que eligen un valor (data-v) */
function elegir(sel,fn){
  $(sel).addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    setPressed(this,function(x){return x===b});
    fn(b.getAttribute('data-v'));
  });
}
function millones(n){
  if(n>=1e9)return fmt(n/1e9,1)+' mil millones';
  return fmt(n/1e6,n<1e7?1:0)+' millones';
}

/* ---------- Demo 1: pinta una imagen ---------- */
AT.labs['gpu-pintar']=function(){
  var W=24,H=16,N=W*H;
  var EQ=[{n:8,t:1},{n:128,t:4}];   /* núcleos y µs por píxel: CPU y GPU */
  /* Un paisaje sencillo: cielo, sol, montañas y suelo. Cada píxel guarda su clase de color. */
  var img=[];
  for(var y=0;y<H;y++)for(var x=0;x<W;x++){
    var c='cielo';
    if(Math.pow(x-17,2)+Math.pow(y-4,2)<=7)c='sol';
    var m=Math.min(Math.abs(x-7)*0.9,Math.abs(x-15)*1.1);
    if(y>=6+m)c='monte';
    if(y>=12)c='suelo';
    img.push(c);
  }
  function lienzo(el){
    var h='';
    for(var i=0;i<N;i++)h+='<i data-c="'+img[i]+'"></i>';
    el.innerHTML=h;
    return $$('i',el);
  }
  var pix=[lienzo($('#ptCpu')),lienzo($('#ptGpu'))],hechos=[0,0];
  var serie=false,raf=null;
  function total(k){return serie?N*EQ[k].t:Math.ceil(N/EQ[k].n)*EQ[k].t}
  function pintados(k,t){
    var e=EQ[k],pasos=Math.floor(t/e.t);
    return Math.min(N,serie?pasos:pasos*e.n);
  }
  function pintar(k,n){
    for(var i=hechos[k];i<n;i++)pix[k][i].className='on';
    for(i=n;i<hechos[k];i++)pix[k][i].className='';
    hechos[k]=n;
  }
  function mostrar(t){
    pintar(0,pintados(0,t));pintar(1,pintados(1,t));
    $('#ptTc').textContent=fmt(Math.min(t,total(0)),0)+' µs';
    $('#ptTg').textContent=fmt(Math.min(t,total(1)),0)+' µs';
  }
  function resultado(){
    var c=total(0),g=total(1),m;
    if(!serie)m='La GPU terminó en '+fmt(g,0)+' µs y la CPU en '+fmt(c,0)+' µs: '+fmt(c/g,0)+' veces más rápida, aunque cada núcleo suyo es 4 veces más lento. Cuando el trabajo se reparte, ganan los muchos núcleos.';
    else m='Ahora cada píxel espera al anterior, así que solo trabaja un núcleo a la vez. La CPU terminó en '+fmt(c,0)+' µs y la GPU en '+fmt(g,0)+' µs: '+fmt(g/c,0)+' veces más lenta. Para tareas en fila, gana el núcleo más rápido.';
    $('#ptMsg').textContent=m;
  }
  function reset(){
    if(raf){cancelAnimationFrame(raf);raf=null}
    mostrar(0);
    $('#ptMsg').textContent='';
  }
  $('#ptGo').addEventListener('click',function(){
    reset();
    var fin=Math.max(total(0),total(1));
    if(reduce){mostrar(fin);resultado();return}
    /* La tarea más lenta se ve en unos 3 segundos */
    var escala=fin/3000,t0=null;
    function cuadro(ts){
      if(t0===null)t0=ts;
      var t=(ts-t0)*escala;
      mostrar(Math.min(t,fin));
      if(t<fin)raf=requestAnimationFrame(cuadro);
      else{raf=null;resultado()}
    }
    raf=requestAnimationFrame(cuadro);
  });
  elegir('#ptTarea',function(v){serie=v==='1';reset()});
  reset();
};

/* ---------- Demo 2: del triángulo a los píxeles ---------- */
AT.labs['gpu-raster']=function(){
  var TRI=[[0.1,0.86],[0.48,0.08],[0.93,0.68]];
  var res=8,svg=$('#rsSvg'),tri=$('#rsTri'),som=$('#rsSom');
  /* Lado del punto p respecto a la recta a→b: el signo dice de qué lado está */
  function lado(a,b,p){return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])}
  function dentro(p){
    var d1=lado(TRI[0],TRI[1],p),d2=lado(TRI[1],TRI[2],p),d3=lado(TRI[2],TRI[0],p);
    return (d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0);
  }
  /* Pesos de cada esquina en el punto p, para mezclar sus colores */
  function pesos(p){
    var a=TRI[0],b=TRI[1],c=TRI[2],tot=lado(a,b,c);
    return [lado(b,c,p)/tot,lado(c,a,p)/tot,lado(a,b,p)/tot];
  }
  function rgb(v){
    var h=getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    var m=/^#([0-9a-f]{6})$/i.exec(h);
    return m?[parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4),16)]:[128,128,128];
  }
  function render(){
    var L=320,s=L/res,n=0,h='',cols=[rgb('--c2'),rgb('--c4'),rgb('--c6')];
    for(var y=0;y<res;y++)for(var x=0;x<res;x++){
      var p=[(x+0.5)/res,(y+0.5)/res],en=dentro(p),st='';
      if(en){
        n++;
        if(som.checked){
          var w=pesos(p),c=[0,1,2].map(function(k){return Math.round(cols[0][k]*w[0]+cols[1][k]*w[1]+cols[2][k]*w[2])});
          st=' style="fill:rgb('+c.join(',')+')"';
        }
      }
      h+='<rect x="'+(x*s)+'" y="'+(y*s)+'" width="'+s+'" height="'+s+'" class="rs-p'+(en?' in':'')+'"'+st+'/>';
    }
    if(tri.checked)h+='<polygon class="rs-tri" points="'+TRI.map(function(q){return q[0]*L+','+q[1]*L}).join(' ')+'"/>';
    if(tri.checked)h+=TRI.map(function(q){return '<circle class="rs-v" cx="'+q[0]*L+'" cy="'+q[1]*L+'" r="5"/>'}).join('');
    svg.innerHTML=h;
    $('#rsTot').textContent=fmt(res*res,0);
    $('#rsIn').textContent=fmt(n,0)+' ('+fmt(n/(res*res)*100,0)+' %)';
    $('#rsChk').textContent=fmt(res*res,0);
    var m;
    if(res===8)m='Con 8 × 8 píxeles el triángulo se ve como una escalera. Sube la resolución.';
    else if(res===16)m='Con 16 × 16 ya se reconoce la forma. La GPU revisó 4 veces más píxeles que con 8 × 8.';
    else m='Con 32 × 32 el borde se ve más suave, pero son 16 veces más píxeles que con 8 × 8. Una pantalla Full HD tiene más de 2 millones.';
    if(som.checked)m+=' Al sombrear, cada píxel mezcla los colores de las tres esquinas según qué tan cerca está de cada una: eso hace un shader, píxel por píxel.';
    $('#rsMsg').textContent=m;
  }
  elegir('#rsRes',function(v){res=+v;render()});
  tri.addEventListener('change',render);
  som.addEventListener('change',render);
  AT.ajustes.on(render);
  render();
};

/* ---------- Demo 3: cuánto trabajo por segundo ---------- */
AT.labs['gpu-fps']=function(){
  var RES=[[1280,720,'720p'],[1920,1080,'1080p'],[2560,1440,'1440p'],[3840,2160,'4K']];
  var r=1,f=60,BASE=1280*720*30,MAX=3840*2160*144;
  function render(){
    var px=RES[r][0]*RES[r][1],ps=px*f,ms=1000/f,x=ps/BASE;
    $('#fpPx').textContent=fmt(px,0);
    $('#fpPs').textContent=millones(ps);
    $('#fpMs').textContent=fmt(ms,1)+' ms';
    $('#fpX').textContent=fmt(x,x<10?1:0)+' ×';
    $('#fpBar').style.width=(ps/MAX*100)+'%';
    var m='En '+RES[r][2]+' a '+f+' FPS, la GPU tiene '+fmt(ms,1)+' ms para dibujar cada cuadro completo';
    if(r===3&&f===144)m+='. Es el caso más exigente: más de mil millones de píxeles por segundo. Pocas tarjetas lo logran sin ayuda del escalado con IA.';
    else if(f===144)m+='. Con 144 FPS el movimiento se ve muy fluido, pero cada cuadro debe estar listo en menos de 7 ms.';
    else if(f===30)m+='. 30 FPS se siente jugable, aunque se nota menos fluido en movimientos rápidos.';
    else m+='. 60 FPS es la meta más común para que un juego se sienta fluido.';
    $('#fpMsg').textContent=m;
  }
  elegir('#fpRes',function(v){r=+v;render()});
  elegir('#fpFps',function(v){f=+v;render()});
  render();
};

/* ---------- Demo 4: ancho de banda de la VRAM ---------- */
AT.labs['gpu-vram']=function(){
  var bus=256,vel=20;
  var OTROS=[['RAM DDR5-5600, dos canales',89.6],['PCIe 4.0 ×16 (de la RAM a la tarjeta)',31.5],['SSD NVMe PCIe 4.0',7]];
  function gb(x){return fmt(x,x<100?1:0)+' GB/s'}
  function render(){
    var bw=bus*vel/8,max=384*28/8;
    $('#vrBw').textContent=gb(bw);
    $('#vrT').textContent=fmt(8/bw*1000,1)+' ms';
    var filas=[['Esta VRAM ('+bus+' bits × '+vel+' Gbps)',bw,true]].concat(OTROS);
    $('#vrComp').innerHTML=filas.map(function(o){
      return '<div class="vr-r'+(o[2]?' on':'')+'"><span class="vr-l">'+esc(o[0])+'</span>'+
        '<span class="vr-b" aria-hidden="true"><i style="width:'+Math.max(o[1]/max*100,0.6)+'%"></i></span><b>'+gb(o[1])+'</b></div>';
    }).join('');
    $('#vrMsg').textContent='La VRAM mueve datos '+fmt(bw/89.6,1)+' veces más rápido que la RAM de la computadora y '+fmt(bw/31.5,0)+' veces más rápido que la conexión PCIe. '+
      'Por eso, cuando las texturas no caben en la VRAM y hay que traerlas por PCIe, el juego da tirones.';
  }
  elegir('#vrBus',function(v){bus=+v;render()});
  elegir('#vrVel',function(v){vel=+v;render()});
  render();
};
})();
