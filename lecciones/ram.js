/* Demos y repaso de la lección «Memoria RAM». Usa las utilidades de assets/js/base.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,setPressed=AT.setPressed,reduce=AT.reduce;

/* ---------- Demo 1: llena tu RAM ---------- */
(function(){
  var apps=[
    {id:'os',n:'Sistema operativo',gb:3,c:1,fixed:true},
    {id:'web',n:'Navegador con 10 pestañas',gb:2.5,c:2},
    {id:'call',n:'Videollamada',gb:1,c:3},
    {id:'sheet',n:'Hoja de cálculo grande',gb:1,c:4},
    {id:'photo',n:'Editor de fotos',gb:3,c:5},
    {id:'video',n:'Editor de video 4K',gb:6,c:6},
    {id:'game',n:'Videojuego reciente',gb:8,c:7}
  ];
  var cap=8, on={os:true,web:true,call:true};
  var list=$('#appList'),track=$('#mtrack'),over=$('#mover'),used=$('#mused'),pill=$('#mpill'),msg=$('#mmsg');
  list.innerHTML=apps.map(function(a){
    return '<label class="app-r"><input type="checkbox" data-id="'+a.id+'"'+(on[a.id]?' checked':'')+(a.fixed?' disabled':'')+'>'+
      '<span class="sw" style="background:var(--c'+a.c+')"></span><span class="app-n">'+esc(a.n)+'</span>'+
      '<span class="app-gb">'+fmt(a.gb,a.gb%1?1:0)+' GB</span></label>';
  }).join('');
  function render(){
    var total=0,html='';
    apps.forEach(function(a){if(on[a.id])total+=a.gb});
    var scale=Math.max(total,cap);
    apps.forEach(function(a){
      if(on[a.id])html+='<i class="ms" style="width:'+(a.gb/scale*100)+'%;background:var(--c'+a.c+')"></i>';
    });
    track.innerHTML=html;
    if(total>cap){over.hidden=false;over.style.left=(cap/scale*100)+'%';over.style.right='0'}else{over.hidden=true}
    var pct=Math.round(total/cap*100);
    used.innerHTML='<b>'+fmt(total,total%1?1:0)+' GB</b> de '+cap+' GB · '+pct+'%';
    if(pct<=70){
      pill.innerHTML='<span class="tag green">Con margen</span>';
      msg.textContent='Hay espacio de sobra. Abrir otro programa casi no se nota.';
    }else if(pct<=100){
      pill.innerHTML='<span class="tag yellow">Poco margen</span>';
      msg.textContent='Todo cabe, pero queda poco margen. Un programa más podría llenar la memoria.';
    }else{
      var miss=total-cap;
      pill.innerHTML='<span class="tag red">Falta memoria</span>';
      msg.textContent='Faltan '+fmt(miss,miss%1?1:0)+' GB. El sistema mueve datos al disco (memoria virtual) y todo se vuelve lento: acceder al disco tarda de 1,000 a más de 100,000 veces más que la RAM.';
    }
  }
  list.addEventListener('change',function(e){
    var id=e.target.getAttribute('data-id');
    if(id){on[id]=e.target.checked;render()}
  });
  $('#capSeg').addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    cap=+b.getAttribute('data-cap');
    setPressed(this,function(x){return x===b});
    render();
  });
  render();
})();

/* ---------- Demo 2: jerarquía de memoria ---------- */
(function(){
  var lv=[
    {n:'Registros del CPU',ns:0.3,cap:'menos de 1 KB',d:'Son las celdas más cercanas al cálculo, dentro del núcleo. El procesador opera directamente sobre ellos.'},
    {n:'Caché L1',ns:1,cap:'32 a 64 KB por núcleo',d:'Memoria SRAM dentro de cada núcleo. Guarda las instrucciones y los datos que se usan en este instante.'},
    {n:'Caché L2',ns:4,cap:'0.25 a 2 MB',d:'Más grande y un poco más lenta que la L1. Suele ser propia de cada núcleo.'},
    {n:'Caché L3',ns:12,cap:'8 a 64 MB',d:'Se comparte entre todos los núcleos del procesador y amortigua los accesos a la RAM.'},
    {n:'RAM',ns:80,cap:'8 a 64 GB',d:'Es el nivel principal de trabajo. Cuando un dato no está en la caché, el procesador espera unos 80 ns, alrededor de 300 ciclos de reloj a 4 GHz.'},
    {n:'SSD NVMe',ns:80000,cap:'0.25 a 4 TB',d:'Almacenamiento permanente sin partes móviles. Conserva los datos sin energía, pero es unas 1,000 veces más lento que la RAM.'},
    {n:'Disco duro (HDD)',ns:10000000,cap:'1 a 20 TB',d:'Platos magnéticos giratorios y un brazo que se mueve. Es barato por GB, pero cada acceso aleatorio espera un movimiento mecánico.'}
  ];
  var mode='log',sel=4;
  var host=$('#lvList'),note=$('#lvNote'),info=$('#lvInfo');
  function fmtT(ns){
    if(ns<1)return fmt(ns,1)+' ns';
    if(ns<1000)return fmt(ns,0)+' ns';
    if(ns<1e6)return fmt(ns/1000,0)+' µs';
    return fmt(ns/1e6,0)+' ms';
  }
  function ratio(ns){
    if(ns===80)return 'referencia';
    if(ns>80)return fmt(ns/80,0)+'× más lento';
    var f=80/ns;
    return fmt(f,f<10?1:0)+'× más rápido';
  }
  function width(ns){return mode==='log'?((Math.log(ns)/Math.LN10+1)/8*100):(ns/1e7*100)}
  function render(){
    host.innerHTML=lv.map(function(l,i){
      return '<button class="lv" type="button" data-i="'+i+'" aria-pressed="'+(i===sel?'true':'false')+'">'+
        '<span class="lv-top"><span class="lv-n">'+esc(l.n)+'</span><span class="lv-t">'+fmtT(l.ns)+'</span></span>'+
        '<span class="lv-bar"><i class="'+(i===4?'ram':'')+'" style="width:'+width(l.ns)+'%"></i></span>'+
        '<span class="lv-bot"><span>'+esc(l.cap)+'</span><span>'+ratio(l.ns)+'</span></span></button>';
    }).join('');
    info.textContent=lv[sel].n+': '+lv[sel].d;
    note.textContent=mode==='log'
      ?'Escala logarítmica: cada tramo de barra multiplica el tiempo por un mismo factor, así caben todos los niveles.'
      :'Escala lineal: junto al disco duro, la RAM y las cachés casi no se ven. Así de grande es la diferencia.';
  }
  host.addEventListener('click',function(e){
    var b=e.target.closest('.lv');
    if(!b)return;
    sel=+b.getAttribute('data-i');
    render();
    var nb=$('.lv[data-i="'+sel+'"]',host);
    if(nb)nb.focus({preventScroll:true});
  });
  $('#lvScale').addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    mode=b.getAttribute('data-mode');
    setPressed(this,function(x){return x===b});
    render();
  });
  render();
})();

/* ---------- Demo 3: celdas DRAM ---------- */
(function(){
  var ROWS=4,TXT='Hola';
  var host=$('#dram'),chk=$('#refreshChk'),pwrBtn=$('#pwrBtn'),writeBtn=$('#writeBtn'),stat=$('#dramStatus'),statMsg=$('#dramMsg');
  var ch=[],written=[],cellEls=[],rdEls=[],rowEls=[];
  var power=true,refreshOn=true,rowPtr=0,acc=0;
  function bitsOf(v){var a=[];for(var i=7;i>=0;i--)a.push((v>>i)&1);return a}
  function toVal(bits){return bits.reduce(function(a,x){return a*2+x},0)}
  function load(){
    for(var r=0;r<ROWS;r++){
      var code=TXT.charCodeAt(r);
      ch[r]=bitsOf(code);
      written[r]=code;
    }
  }
  var html='';
  for(var r=0;r<ROWS;r++){
    html+='<div class="byte" data-r="'+r+'"><span class="addr">0x0'+r+'</span><div class="bits">';
    for(var b=0;b<8;b++){
      html+='<button class="cell" type="button" data-r="'+r+'" data-b="'+b+'"><i class="fill"></i></button>';
    }
    html+='</div><span class="rd"></span></div>';
  }
  host.innerHTML=html;
  $$('.byte',host).forEach(function(row,i){
    rowEls[i]=row;
    rdEls[i]=$('.rd',row);
    cellEls[i]=$$('.cell',row);
  });
  load();
  function render(){
    var bad=0,allZero=true;
    for(var r=0;r<ROWS;r++){
      var wb=bitsOf(written[r]),val=0;
      for(var b=0;b<8;b++){
        var c=ch[r][b],el=cellEls[r][b];
        el.firstChild.style.height=(c*100)+'%';
        el.classList.toggle('hi',c>=0.5);
        el.classList.toggle('lo',c>0&&c<0.5);
        el.disabled=!power;
        var bit=c>=0.5?1:0;
        /* El lector de pantalla oye el valor que se lee en cada celda.
           Solo se actualiza cuando cambia, porque render() corre 10 veces por segundo. */
        var lab='Byte '+r+', bit '+(7-b)+': se lee '+bit;
        if(el._lab!==lab){el.setAttribute('aria-label',lab);el._lab=lab}
        val=val*2+bit;
        if(bit!==wb[b])bad++;
        if(c>0.01)allZero=false;
      }
      var bin=('00000000'+val.toString(2)).slice(-8);
      var chr=(val>=32&&val<=126)?String.fromCharCode(val):'·';
      rdEls[r].innerHTML='<span class="bin">'+bin+'</span><span aria-hidden="true">→</span><span class="chr">'+esc(chr)+'</span>';
      rdEls[r].classList.toggle('bad',val!==written[r]);
    }
    var k,m;
    if(!power){
      k='bad';
      m=allZero?'Sin energía: la memoria quedó vacía.':'Sin energía: la carga se está escapando.';
    }else if(bad>0){
      k='bad';
      m='Se perdieron '+bad+(bad===1?' bit':' bits')+'. Un 1 sin refrescar se confunde con un 0.';
    }else if(!refreshOn){
      k='warn';
      m='Sin refresco. La carga baja poco a poco; espera unos segundos.';
    }else{
      k='good';
      m='Todo en orden. En esta demo se refresca una fila cada 0.6 s.';
    }
    stat.setAttribute('data-k',k);
    if(statMsg.textContent!==m)statMsg.textContent=m;
  }
  function refreshRow(r){
    for(var b=0;b<8;b++)ch[r][b]=ch[r][b]>=0.5?1:0;
    rowEls[r].classList.add('refr');
    setTimeout(function(){rowEls[r].classList.remove('refr')},450);
  }
  function tick(){
    if(document.hidden)return;
    var tau=power?8:0.35,k=Math.exp(-0.1/tau);
    for(var r=0;r<ROWS;r++)for(var b=0;b<8;b++){
      if(ch[r][b]>0){ch[r][b]*=k;if(ch[r][b]<0.01)ch[r][b]=0}
    }
    if(power&&refreshOn){
      acc+=0.1;
      if(acc>=0.6-1e-9){acc=0;refreshRow(rowPtr);rowPtr=(rowPtr+1)%ROWS}
    }
    render();
  }
  host.addEventListener('click',function(e){
    var t=e.target.closest('.cell');
    if(!t||!power)return;
    var r=+t.getAttribute('data-r'),b=+t.getAttribute('data-b');
    var now=ch[r][b]>=0.5?1:0;
    ch[r][b]=now?0:1;
    var wb=bitsOf(written[r]);
    wb[b]=ch[r][b];
    written[r]=toVal(wb);
    render();
  });
  chk.addEventListener('change',function(){refreshOn=chk.checked;render()});
  function buttons(){
    pwrBtn.textContent=power?'Cortar energía':'Encender';
    writeBtn.disabled=!power;
    chk.disabled=!power;
  }
  pwrBtn.addEventListener('click',function(){
    if(power){power=false}
    else{
      power=true;rowPtr=0;acc=0;
      for(var r=0;r<ROWS;r++){ch[r]=[0,0,0,0,0,0,0,0];written[r]=0}
    }
    buttons();render();
  });
  writeBtn.addEventListener('click',function(){if(power){load();render()}});
  buttons();render();
  setInterval(tick,100);
})();

/* ---------- Demo 4: leer una dirección ---------- */
(function(){
  var N=8,seed=11,bits=[];
  function rnd(){seed=(Math.imul(seed,1103515245)+12345)&0x7fffffff;return (seed>>>8)&1}
  for(var r=0;r<N;r++){bits[r]=[];for(var c=0;c<N;c++)bits[r][c]=rnd()}
  var mat=$('#mat'),buf=$('#buf'),stepsEl=$('#steps'),outTxt=$('#outTxt'),slider=$('#addrSlider');
  var readBtn=$('#readBtn'),closeBtn=$('#closeBtn'),openTxt=$('#openTxt');
  /* closed: fila que se cerró (precarga, tRP) en la última lectura, para seguir explicándolo al terminar */
  var sel={r:2,c:6},openRow=null,rowOn=null,bufRow=null,bufCol=null,out=null,running=false,closed=null;
  var st=['','','',''];
  function bin3(n){return ('00'+n.toString(2)).slice(-3)}
  var mh='<span></span>';
  for(var c=0;c<N;c++)mh+='<span class="ax">'+c+'</span>';
  for(var r2=0;r2<N;r2++){
    mh+='<span class="ax">'+r2+'</span>';
    for(var c2=0;c2<N;c2++)mh+='<button class="mc" type="button" data-r="'+r2+'" data-c="'+c2+'" aria-label="Fila '+r2+', columna '+c2+'">'+bits[r2][c2]+'</button>';
  }
  mat.innerHTML=mh;
  var bh='<span></span>';
  for(var c3=0;c3<N;c3++)bh+='<span class="bc" data-c="'+c3+'"></span>';
  buf.innerHTML=bh;
  var mcs=$$('.mc',mat),bcs=$$('.bc',buf);
  var titles=['Activar la fila','Copiar al buffer','Elegir la columna','Entregar el dato'];
  stepsEl.innerHTML=titles.map(function(t,i){return '<li class="st" data-i="'+i+'"><b>'+(i+1)+'. '+t+'</b><span></span></li>'}).join('');
  var lis=$$('.st',stepsEl);
  function desc(i){
    var r=sel.r,c=sel.c;
    if(st[i]==='skip')return 'Omitido: la fila ya estaba abierta en el buffer.';
    if(i===0){
      /* Antes de leer se anticipa qué fila habría que cerrar; durante y después se usa la que se cerró. */
      var cierra=st[0]?closed:(openRow!==null&&openRow!==r?openRow:null);
      return (cierra!==null?'Primero se cierra la fila '+cierra+' (espera tRP). ':'')+'Llega la fila '+r+' ('+bin3(r)+') y se abre completa.';
    }
    if(i===1)return 'Las 8 celdas de la fila pasan al buffer. Leer altera la carga, así que luego se restaura.';
    if(i===2)return 'Llega la columna '+c+' ('+bin3(c)+') y el buffer entrega solo esa celda. Espera desde el paso 1: tRCD.';
    return 'El bit ('+bits[r][c]+') sale por el bus hacia el procesador. Espera desde el paso 3: CL.';
  }
  function paint(){
    mcs.forEach(function(el){
      var r=+el.getAttribute('data-r'),c=+el.getAttribute('data-c');
      el.classList.toggle('sel',r===sel.r&&c===sel.c);
      el.classList.toggle('ron',rowOn===r);
      el.disabled=running;
    });
    bcs.forEach(function(el){
      var c=+el.getAttribute('data-c');
      el.textContent=bufRow===null?'':bits[bufRow][c];
      el.classList.toggle('has',bufRow!==null);
      el.classList.toggle('sel',bufCol===c);
    });
    lis.forEach(function(li,i){
      li.className='st '+st[i];
      li.lastChild.textContent=desc(i);
    });
    $('#rBits').textContent=bin3(sel.r);
    $('#cBits').textContent=bin3(sel.c);
    $('#addrTxt').textContent='Dirección '+(sel.r*8+sel.c)+' · fila '+sel.r+', columna '+sel.c;
    outTxt.innerHTML=out===null?'':'Dato leído: <b>'+out+'</b>';
    openTxt.textContent=openRow===null?'Ninguna fila abierta':'Fila '+openRow+' abierta en el buffer';
    readBtn.disabled=running;
    closeBtn.disabled=running||openRow===null;
    slider.disabled=running;
  }
  function clearRun(){
    st=['','','',''];bufCol=null;out=null;closed=null;
    rowOn=openRow;bufRow=openRow;
  }
  function setSel(r,c){
    if(running)return;
    sel={r:r,c:c};
    slider.value=r*8+c;
    clearRun();
    paint();
  }
  mat.addEventListener('click',function(e){
    var t=e.target.closest('.mc');
    if(t)setSel(+t.getAttribute('data-r'),+t.getAttribute('data-c'));
  });
  slider.addEventListener('input',function(){
    var v=+slider.value;
    setSel(Math.floor(v/8),v%8);
  });
  closeBtn.addEventListener('click',function(){
    if(running)return;
    openRow=null;
    clearRun();
    paint();
  });
  readBtn.addEventListener('click',function(){
    if(running)return;
    running=true;
    var r=sel.r,c=sel.c,hit=(openRow===r);
    st=['','','',''];bufCol=null;out=null;
    closed=(!hit&&openRow!==null)?openRow:null;
    var seq=[1,2,3,4];
    if(hit){st[0]='skip';st[1]='skip';seq=[3,4];rowOn=r;bufRow=r}
    else{rowOn=null;bufRow=null}
    paint();
    var i=0;
    (function next(){
      if(i>=seq.length){
        for(var k=0;k<4;k++)if(st[k]==='act')st[k]='done';
        openRow=r;running=false;paint();return;
      }
      var n=seq[i++];
      for(var k2=0;k2<4;k2++)if(st[k2]==='act')st[k2]='done';
      st[n-1]='act';
      if(n===1)rowOn=r;
      if(n===2)bufRow=r;
      if(n===3)bufCol=c;
      if(n===4)out=bits[r][c];
      paint();
      setTimeout(next,reduce?250:1100);
    })();
  });
  paint();
})();

/* ---------- Demo 5: calculadora ---------- */
(function(){
  var mods=[
    {n:'DDR3-1600',mt:1600,cl:11},
    {n:'DDR4-2666',mt:2666,cl:19},
    {n:'DDR4-3200',mt:3200,cl:16},
    {n:'DDR5-4800',mt:4800,cl:40},
    {n:'DDR5-6000',mt:6000,cl:30},
    {n:'DDR5-6400',mt:6400,cl:32}
  ];
  var idx=2,chan=2;
  var chips=$('#modChips');
  function renderChips(){
    chips.innerHTML=mods.map(function(m,i){
      return '<button class="chip" type="button" data-i="'+i+'" aria-pressed="'+(i===idx?'true':'false')+'">'+m.n+' · CL'+m.cl+'</button>';
    }).join('');
  }
  function calc(){
    var m=mods[idx];
    var bw=m.mt*8*chan/1000,lat=2000*m.cl/m.mt;
    $('#cClk').textContent=fmt(m.mt/2,0)+' MHz';
    $('#cBw').textContent=fmt(bw,1)+' GB/s';
    $('#cBwBar').style.width=(bw/110*100)+'%';
    $('#cBwF').textContent=fmt(m.mt,0)+' × 8 bytes × '+chan+' = '+fmt(bw,1)+' GB/s';
    $('#cLat').textContent=fmt(lat,1)+' ns';
    $('#cLatBar').style.width=(lat/20*100)+'%';
    $('#cLatF').textContent='2000 × '+m.cl+' ÷ '+fmt(m.mt,0)+' = '+fmt(lat,1)+' ns';
  }
  chips.addEventListener('click',function(e){
    var b=e.target.closest('.chip');
    if(!b)return;
    idx=+b.getAttribute('data-i');
    renderChips();calc();
    var nb=$('.chip[data-i="'+idx+'"]',chips);
    if(nb)nb.focus({preventScroll:true});
  });
  $('#chanSeg').addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    chan=+b.getAttribute('data-ch');
    setPressed(this,function(x){return x===b});
    calc();
  });
  renderChips();calc();
})();

/* ---------- Repaso ---------- */
AT.repaso({host:'#qz',score:'#qzScore',reset:'#qzReset',preguntas:[
  {q:'¿Qué pasa con el contenido de la RAM cuando apagas el equipo?',
   o:['Se guarda automáticamente en el SSD','Se pierde, porque la RAM es volátil','Se conserva durante 24 horas'],a:1,
   e:'La RAM necesita energía para mantener la carga de sus capacitores. Sin corriente, el contenido desaparece. Por eso los archivos se guardan en el almacenamiento.'},
  {q:'¿Por qué la DRAM necesita refresco?',
   o:['Porque los capacitores pierden carga con el tiempo','Porque el procesador es más lento que ella','Porque los transistores se desgastan al leer'],a:0,
   e:'Cada capacitor se descarga solo. Si no se reescribe a tiempo, un 1 se confunde con un 0.'},
  {q:'Un módulo DDR4-3200 hace 3,200 millones de transferencias por segundo. ¿Cuál es su reloj?',
   o:['3,200 MHz','1,600 MHz','6,400 MHz'],a:1,
   e:'DDR transfiere en la subida y en la bajada del reloj, dos veces por ciclo. Por eso el reloj es la mitad: 1,600 MHz.'},
  {q:'Instalas dos módulos iguales y la placa los usa en doble canal. ¿Qué pasa con el ancho de banda máximo?',
   o:['Se duplica','Se mantiene igual','Baja a la mitad'],a:0,
   e:'Cada canal tiene su propio bus de 64 bits. Con dos canales el procesador mueve el doble de datos por ciclo. La latencia casi no cambia.'}
]});
})();
