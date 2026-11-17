/* Laboratorios de la lección «Procesador (CPU)».
   Cada uno se registra en AT.labs con el nombre de su bloque «laboratorio»; bloques.js lo llama después de
   dibujar el bloque con su plantilla (<template data-lab="..."> en cpu.html). Las preguntas de repaso
   viven en el documento de la lección, no aquí. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,setPressed=AT.setPressed,reduce=AT.reduce;

/* Botones de un grupo .seg que eligen un valor numérico (data-v) */
function segValue(sel,fn){
  $(sel).addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    setPressed(this,function(x){return x===b});
    fn(+b.getAttribute('data-v'));
  });
}

/* ---------- Demo 1: CPU de juguete ---------- */
AT.labs['cpu-juguete']=function(){
  /* Programa: r = x × y sumando x, y veces. Datos en las direcciones 8 (x), 9 (y) y 10 (r). */
  var PROG=[
    {op:'CARGA',k:0,txt:'CARGA A, 0',com:'A = 0'},
    {op:'CARGAM',d:9,txt:'CARGA B, [9]',com:'B = y'},
    {op:'SUMAM',d:8,txt:'SUMA A, [8]',com:'A = A + x'},
    {op:'RESTA',k:1,txt:'RESTA B, 1',com:'B = B − 1'},
    {op:'SALTA',to:2,txt:'SALTA 2 SI Z=0',com:'si B ≠ 0, volver a 2'},
    {op:'GUARDA',d:10,txt:'GUARDA A, [10]',com:'r = A'},
    {op:'ALTO',txt:'ALTO',com:'fin'}
  ];
  var DATOS={8:'x',9:'y',10:'r (resultado)'};
  var DEC={
    CARGA:'la instrucción pide poner un número fijo en A. No hace falta leer la memoria ni usar la ALU.',
    CARGAM:'la instrucción pide leer la dirección 9 de la memoria y guardar su valor en B.',
    SUMAM:'la instrucción pide leer la dirección 8 y sumarla a A. Trabajará la ALU.',
    RESTA:'la instrucción pide restar 1 a B con la ALU. Si el resultado es 0, se enciende la bandera Z.',
    SALTA:'es un salto condicional. Si Z está apagada, el PC cambiará a 2.',
    GUARDA:'la instrucción pide escribir el valor de A en la dirección 10.',
    ALTO:'la instrucción pide detener el programa.'
  };
  var PH={buscar:'Buscar',decod:'Decodificar',ejec:'Ejecutar'};
  var X=3,Y=4,pc,ir,A,B,Z,mem,next,halted,nI,nC,last,timer=null;
  var memEl=$('#cpuMem'),msgEl=$('#cpuMsg'),cntEl=$('#cpuCnt');
  var stepBtn=$('#cpuStep'),instBtn=$('#cpuInst'),runBtn=$('#cpuRun');

  function fresh(msgs){return {ph:null,read:{},write:{},chg:{},alu:'',msgs:msgs||[]}}
  function reset(){
    stop();
    pc=0;ir=null;A=0;B=0;Z=0;mem={8:X,9:Y,10:0};next='buscar';halted=false;nI=0;nC=0;
    last=fresh(['El PC vale 0, así que la primera instrucción está en la dirección 0. Pulsa «Siguiente paso».']);
    render();
  }
  function step(){
    if(halted)return;
    nC++;
    var ph=next;last.ph=ph;
    if(ph==='buscar'){
      var a=pc;ir=a;pc=a+1;
      last.read[a]=1;last.chg.PC=1;last.chg.IR=1;
      last.msgs.push('Buscar: el PC vale '+a+'. Se lee la dirección '+a+' («'+PROG[a].txt+'») y se copia en el registro de instrucción (IR). El PC avanza a '+pc+'.');
      next='decod';
      return;
    }
    if(ph==='decod'){
      last.msgs.push('Decodificar: '+DEC[PROG[ir].op]);
      next='ejec';
      return;
    }
    var I=PROG[ir],v;
    switch(I.op){
      case 'CARGA':
        A=I.k;last.chg.A=1;
        last.msgs.push('Ejecutar: A toma el valor '+I.k+'.');
        break;
      case 'CARGAM':
        B=mem[I.d];last.read[I.d]=1;last.chg.B=1;
        last.msgs.push('Ejecutar: se lee la dirección '+I.d+' (vale '+B+') y se guarda en B.');
        break;
      case 'SUMAM':
        v=mem[I.d];last.read[I.d]=1;
        last.alu=A+' + '+v+' = '+(A+v);
        A+=v;last.chg.A=1;last.chg.ALU=1;
        last.msgs.push('Ejecutar: se lee la dirección '+I.d+' y la ALU calcula '+last.alu+'. El resultado queda en A.');
        break;
      case 'RESTA':
        last.alu=B+' − '+I.k+' = '+(B-I.k);
        B-=I.k;Z=B===0?1:0;last.chg.B=1;last.chg.Z=1;last.chg.ALU=1;
        last.msgs.push('Ejecutar: la ALU calcula '+last.alu+'. '+(Z?'B llegó a 0: Z se enciende.':'B no es 0: Z queda apagada.'));
        break;
      case 'SALTA':
        if(!Z){pc=I.to;last.chg.PC=1;last.msgs.push('Ejecutar: Z está apagada, así que el PC cambia a '+I.to+' y el ciclo se repite.')}
        else last.msgs.push('Ejecutar: Z está encendida. No hay salto y el programa sigue en la dirección '+pc+'.');
        break;
      case 'GUARDA':
        mem[I.d]=A;last.write[I.d]=1;
        last.msgs.push('Ejecutar: se escribe '+A+' en la dirección '+I.d+'.');
        break;
      case 'ALTO':
        halted=true;
        last.msgs.push('Ejecutar: el procesador se detiene.');
        break;
    }
    nI++;
    next='buscar';
    if(halted)last.msgs.push('Programa terminado: r = '+mem[10]+', que es '+X+' × '+Y+'. Tomó '+nI+' instrucciones y '+nC+' ciclos.');
  }
  function action(fn){last=fresh();fn();render()}
  function memText(a){
    if(a<PROG.length)return PROG[a].txt;
    if(a in mem)return String(mem[a]);
    return '—';
  }
  function render(){
    $$('.phz',$('#cpuPh')).forEach(function(el){el.classList.toggle('on',el.getAttribute('data-ph')===last.ph)});
    $('#rPC').textContent=pc;
    $('#rA').textContent=A;
    $('#rB').textContent=B;
    $('#rZ').textContent=Z;
    $('#rIR').textContent=ir===null?'—':PROG[ir].txt;
    $('#rALU').textContent=last.alu||'—';
    $$('.reg').forEach(function(el){el.classList.toggle('chg',!!last.chg[el.getAttribute('data-r')])});
    var h='';
    for(var a=0;a<=10;a++){
      var cls=(last.write[a]?'wr':(last.read[a]?'rd':''))+(ir===a?' cur':'');
      var com=a<PROG.length?PROG[a].com:(DATOS[a]||'');
      h+='<tr class="'+cls+'"><td>'+a+'</td><td>'+esc(memText(a))+'</td><td>'+esc(com)+'</td><td>'+(!halted&&a===pc?'<span class="tag blue">PC</span>':'')+'</td></tr>';
    }
    memEl.innerHTML=h;
    msgEl.innerHTML=last.msgs.map(function(m){return '<p>'+esc(m)+'</p>'}).join('');
    cntEl.textContent='Instrucciones: '+nI+' · Ciclos: '+nC;
    stepBtn.textContent=halted?'Programa terminado':'Siguiente paso: '+PH[next];
    stepBtn.disabled=instBtn.disabled=runBtn.disabled=halted;
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null}
    runBtn.textContent='Correr';
  }
  stepBtn.addEventListener('click',function(){stop();action(step)});
  instBtn.addEventListener('click',function(){
    stop();
    action(function(){do{step()}while(next!=='buscar'&&!halted)});
  });
  runBtn.addEventListener('click',function(){
    if(timer){stop();return}
    runBtn.textContent='Pausar';
    timer=setInterval(function(){
      action(step);
      if(halted)stop();
    },reduce?450:650);
  });
  $('#cpuReset').addEventListener('click',reset);
  segValue('#cpuX',function(v){X=v;reset()});
  segValue('#cpuY',function(v){Y=v;reset()});
  reset();
};

/* ---------- Demo 2: el reloj ---------- */
AT.labs['cpu-reloj']=function(){
  var fq=$('#fq'),ipc=2;
  function render(){
    var f=+fq.value/10;
    var txt=fmt(f,1)+' GHz';
    $('#fqVal').textContent=txt;
    fq.setAttribute('aria-valuetext',txt);
    var n=Math.round(10*f),h='';
    for(var i=0;i<n;i++)h+='<i></i>';
    $('#ticks').innerHTML=h;
    $('#tkN').textContent=fmt(n,0)+' ciclos';
    $('#kCyc').textContent=fmt(1/f,2)+' ns';
    $('#kLuz').textContent=fmt(30/f,1)+' cm';
    $('#kRam').textContent=fmt(Math.round(80*f),0)+' ciclos';
    $('#kIps').textContent=fmt(f*ipc*1000,0)+' millones';
  }
  fq.addEventListener('input',render);
  segValue('#ipcSeg',function(v){ipc=v;render()});
  render();
};

/* ---------- Demo 3: segmentación ---------- */
AT.labs['cpu-segmentacion']=function(){
  var N=6,ST=['B','D','E','G'],NAMES={B:'buscar',D:'decodificar',E:'ejecutar',G:'guardar'};
  var seg=true,miss=false,cur=Infinity,T=0,timer=null;
  var host=$('#pipe'),out=$('#pipeOut'),note=$('#pipeNote'),chk=$('#pipeMiss'),play=$('#pipePlay');
  function plan(){
    var rows=[];
    function add(name,start,stages,wrong){
      rows.push({n:name,w:!!wrong,c:stages.map(function(s,k){return {t:start+k,s:s}})});
    }
    for(var i=0;i<N;i++){
      var name='I'+(i+1)+(i===2?' · salto':'');
      if(!seg)add(name,4*i+1,ST);
      else if(!miss)add(name,i+1,ST);
      else{
        /* El salto (I3) se resuelve al ejecutarse, en el ciclo 5. Las dos instrucciones que se
           buscaron en los ciclos 4 y 5 eran del camino equivocado y se descartan. */
        if(i<3)add(name,i+1,ST);
        if(i===2){add('Equivocada',4,['B','D'],true);add('Equivocada',5,['B'],true)}
        if(i>=3)add(name,i+3,ST);
      }
    }
    return rows;
  }
  function render(){
    var rows=plan(),t;
    T=0;
    rows.forEach(function(r){r.c.forEach(function(c){if(c.t>T)T=c.t})});
    var h='<div class="pp" style="grid-template-columns:5.25rem repeat('+T+',1.5rem)"><span class="pp-l pp-h">Ciclo</span>';
    for(t=1;t<=T;t++)h+='<span class="pp-h'+(t===cur?' now':'')+'">'+t+'</span>';
    rows.forEach(function(r){
      var map={};
      r.c.forEach(function(c){map[c.t]=c.s});
      h+='<span class="pp-l'+(r.w?' wrong':'')+'">'+esc(r.n)+'</span>';
      for(t=1;t<=T;t++){
        var s=map[t];
        if(!s||t>cur)h+='<span class="pp-c"></span>';
        else h+='<span class="pp-c s-'+(r.w?'X':s)+'" title="'+NAMES[s]+'">'+s+'</span>';
      }
    });
    host.innerHTML=h+'</div>';
    var ipc=N/T,txt;
    if(!seg)txt='Cada instrucción pasa por las cuatro etapas antes de que empiece la siguiente. En todo momento, tres de las cuatro etapas están paradas.';
    else if(!miss)txt='Una vez llena, la línea termina una instrucción en cada ciclo. Con muchas instrucciones se acerca a 1 instrucción por ciclo: cuatro veces más que sin segmentación.';
    else txt='El salto se resuelve al ejecutarse, en el ciclo 5. Las dos instrucciones que se habían adelantado eran las equivocadas y se descartan: se pierden 2 ciclos.';
    out.innerHTML='<b>'+T+' ciclos</b> para '+N+' instrucciones · '+fmt(ipc,2)+' instrucciones por ciclo';
    note.textContent=txt;
    host.setAttribute('aria-label','Diagrama de '+N+' instrucciones en '+T+' ciclos. '+txt);
    chk.disabled=!seg;
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null}
    play.textContent='Reproducir';
  }
  segValue('#pipeSeg',function(v){seg=!!v;stop();cur=Infinity;render()});
  chk.addEventListener('change',function(){miss=chk.checked;stop();cur=Infinity;render()});
  play.addEventListener('click',function(){
    if(timer){stop();cur=Infinity;render();return}
    play.textContent='Detener';
    cur=1;render();
    timer=setInterval(function(){
      cur++;
      if(cur>T){stop();cur=Infinity}
      render();
    },reduce?300:500);
  });
  render();
};

/* ---------- Demo 4: caché ---------- */
AT.labs['cpu-cache']=function(){
  var BS=4,LINES=4,PEN=80,HIT=1;
  var PATS=[
    {k:'orden',n:'Recorrer en orden',fin:'Cada fallo trae 4 direcciones y las 3 siguientes ya son aciertos. Eso es localidad espacial.'},
    {k:'repetir',n:'Repetir algo pequeño',fin:'Los dos bloques caben en la caché y se quedan ahí: después de los primeros fallos, todo son aciertos. Eso es localidad temporal.'},
    {k:'choque',n:'Saltos que chocan',fin:'Los bloques de 0 y de 16 van a la misma línea y se expulsan uno al otro. Las cachés reales dejan que un bloque vaya en varias líneas para evitarlo.'},
    {k:'azar',n:'Al azar',fin:'Sin orden ni repetición, la caché casi no ayuda.'}
  ];
  var pat=0,seq,idx,res,lines,lastLn,timer=null;
  var chips=$('#cPat'),strip=$('#cStrip'),tab=$('#cTab'),stat=$('#cStat'),msg=$('#cMsg');
  var stepBtn=$('#cStep'),runBtn=$('#cRun');
  function gen(k){
    var a=[],i;
    if(k==='orden')for(i=0;i<32;i++)a.push(i);
    else if(k==='repetir')for(i=0;i<32;i++)a.push(i%8);
    else if(k==='choque')for(i=0;i<16;i++){a.push(i);a.push(16+i)}
    else for(i=0;i<32;i++)a.push(Math.floor(Math.random()*64));
    return a;
  }
  function rango(b){return (b*BS)+'–'+(b*BS+BS-1)}
  function reset(){
    stop();
    seq=gen(PATS[pat].k);idx=0;res=[];lines=[null,null,null,null];lastLn=null;
    stat.setAttribute('data-k','');
    msg.textContent='La caché empieza vacía. Pulsa «Paso».';
    render();
  }
  function step(){
    if(idx>=seq.length)return;
    var a=seq[idx],blk=Math.floor(a/BS),ln=blk%LINES,old=lines[ln],hit=old===blk;
    if(!hit)lines[ln]=blk;
    res.push(hit);idx++;lastLn=ln;
    var m='Dirección '+a+' → bloque '+blk+' → línea '+ln+'. ';
    if(hit)m+='Acierto: el bloque ya estaba en la caché.';
    else m+='Fallo: se trae de la RAM el bloque completo (direcciones '+rango(blk)+')'+(old!==null?' y sale el bloque '+old+'.':'.');
    if(idx>=seq.length)m+=' '+PATS[pat].fin;
    stat.setAttribute('data-k',hit?'good':'bad');
    msg.textContent=m;
    render();
  }
  function render(){
    var h='',i;
    for(i=0;i<seq.length;i++){
      var c=i<res.length?(res[i]?' hit':' miss'):(i===idx?' cur':'');
      h+='<span class="acc'+c+'">'+seq[i]+'</span>';
    }
    strip.innerHTML=h;
    h='';
    for(i=0;i<LINES;i++){
      var b=lines[i],cls=i===lastLn?(res[res.length-1]?'hit':'miss'):'';
      h+='<tr class="'+cls+'"><td>Línea '+i+'</td>'+(b===null?'<td class="empty">vacía</td><td class="empty">—</td>':'<td>'+b+'</td><td>'+rango(b)+'</td>')+'</tr>';
    }
    tab.innerHTML=h;
    var n=res.length,hits=res.filter(Boolean).length;
    if(n){
      var avg=(hits*HIT+(n-hits)*PEN)/n;
      $('#cHits').textContent=hits+' de '+n+' ('+Math.round(hits/n*100)+'%)';
      $('#cAvg').textContent=fmt(avg,1)+' ns';
      $('#cAvgBar').style.width=(avg/PEN*100)+'%';
    }else{
      $('#cHits').textContent='—';
      $('#cAvg').textContent='—';
      $('#cAvgBar').style.width='0';
    }
    var done=idx>=seq.length;
    stepBtn.disabled=runBtn.disabled=done;
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null}
    runBtn.textContent='Correr todo';
  }
  chips.innerHTML=PATS.map(function(p,i){
    return '<button class="chip" type="button" data-i="'+i+'" aria-pressed="'+(i===pat?'true':'false')+'">'+esc(p.n)+'</button>';
  }).join('');
  chips.addEventListener('click',function(e){
    var b=e.target.closest('.chip');
    if(!b)return;
    pat=+b.getAttribute('data-i');
    setPressed(chips,function(x){return x===b});
    reset();
  });
  stepBtn.addEventListener('click',function(){stop();step()});
  runBtn.addEventListener('click',function(){
    if(timer){stop();return}
    runBtn.textContent='Pausar';
    timer=setInterval(function(){
      step();
      if(idx>=seq.length)stop();
    },reduce?120:220);
  });
  $('#cReset').addEventListener('click',reset);
  reset();
};

/* ---------- Demo 5: núcleos (ley de Amdahl) ---------- */
AT.labs['cpu-nucleos']=function(){
  var n=4,pIn=$('#amP');
  function pct(x){return (x*100)+'%'}
  function render(){
    var p=+pIn.value/100,t=(1-p)+p/n,s=1/t;
    $('#amPVal').textContent=fmt(p*100,0)+'%';
    pIn.setAttribute('aria-valuetext',fmt(p*100,0)+'%');
    $('#am1s').style.width=pct(1-p);
    $('#am1p').style.width=pct(p);
    $('#amNs').style.width=pct(1-p);
    $('#amNp').style.width=pct(p/n);
    $('#amNl').textContent='Con '+n+(n===1?' núcleo':' núcleos');
    $('#amT').textContent=fmt(t*100,0)+'%';
    $('#amS').textContent=fmt(s,1)+'×';
    $('#amL').textContent=p>=1?'sin límite':fmt(1/(1-p),1)+'×';
    var m;
    if(n===1)m='Con un solo núcleo, todo el trabajo va en fila. Elige más núcleos para repartirlo.';
    else if(p===0)m='Nada se puede repartir: los núcleos extra no ayudan en absoluto.';
    else if(s/n>=0.8)m='Casi todo se reparte, así que los núcleos se aprovechan bien.';
    else if(p<1&&s>=0.75/(1-p))m='Ya estás cerca del límite: la parte que no se reparte domina el tiempo, y más núcleos apenas ayudarían.';
    else m='Los núcleos ayudan, pero la parte que no se reparte empieza a pesar.';
    $('#amMsg').textContent=m;
  }
  pIn.addEventListener('input',render);
  segValue('#amN',function(v){n=v;render()});
  render();
};
})();
