/* Laboratorios de la lección «Introducción a la nube». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en nube.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,fmt=AT.fmt,elegir=AT.elegir;

/* ---------- Demo 1: la responsabilidad compartida ---------- */
AT.labs['nb-resp']=function(raiz){
  /* Para cada capa, desde qué modelo la maneja el proveedor (0 propio, 1 IaaS, 2 PaaS, 3 SaaS; 9 nunca) */
  var CAPAS=[['Datos y quién entra con tu cuenta',9],['Aplicación',3],['Entorno de ejecución (Node, Python, la base de datos)',2],['Sistema operativo y sus parches',2],['Red virtual y firewall',2],['Virtualización',1],['Servidores, discos y red física',1],['Centro de datos: luz, aire, vigilancia',1]];
  var MOD={propio:{n:0,ej:'Un servidor en tu oficina',m:'Todo es tuyo: desde cambiar un disco dañado hasta que no se vaya la luz.'},
    iaas:{n:1,ej:'Una máquina virtual en EC2 o Compute Engine',m:'El proveedor cuida el hardware y la virtualización; el sistema operativo, sus parches y el firewall son tuyos.'},
    paas:{n:2,ej:'Una app en Render o App Engine, una base de datos administrada',m:'Solo subes tu código: el proveedor actualiza el sistema y el entorno. La aplicación y sus datos siguen siendo tuyos.'},
    saas:{n:3,ej:'Gmail, Microsoft 365',m:'El proveedor hace casi todo. Pero quién entra con tu cuenta y qué datos compartes sigue siendo tu responsabilidad.'}};
  var mod='propio';
  function pintar(){
    var M=MOD[mod];
    $('#nrCapas',raiz).innerHTML=CAPAS.map(function(c){var pr=M.n>=c[1];return '<li class="'+(pr?'nr-pr':'nr-tu')+'"><span>'+esc(c[0])+'</span><b>'+(pr?'Proveedor':'Tú')+'</b></li>'}).join('');
    var tuyas=CAPAS.filter(function(c){return M.n<c[1]}).length;
    $('#nrStat',raiz).setAttribute('data-k',mod==='propio'?'warn':'good');
    $('#nrMsg',raiz).textContent=M.ej+'. Te encargas de '+tuyas+' de '+CAPAS.length+' capas. '+M.m;
  }
  elegir('#nrMod',function(v){mod=v;pintar()});
  pintar();
};

/* ---------- Demo 2: calcula una factura ---------- */
AT.labs['nb-costos']=function(raiz){
  var TAM=[{n:'Chica: 2 vCPU, 4 GB',h:0.042},{n:'Mediana: 4 vCPU, 16 GB',h:0.17},{n:'Grande: 16 vCPU, 64 GB',h:0.68}],tam=1,horas=730;
  function usd(v){return 'US$ '+fmt(v,2)}
  function pintar(){
    var res=$('#ncRes',raiz).checked,disco=+$('#ncDisco',raiz).value,sal=+$('#ncSal',raiz).value;
    var maq=TAM[tam].h*horas*(res?0.65:1),cd=disco*0.08,cs=Math.max(0,sal-100)*0.09,tot=maq+cd+cs,max=Math.max(maq,cd,cs,1);
    $('#ncDiscoV',raiz).textContent=disco+' GB';$('#ncSalV',raiz).textContent=sal+' GB';
    function br(l,v,on){return '<div class="br'+(on?' on':'')+'"><span class="br-l">'+esc(l)+'</span><span class="br-b" aria-hidden="true"><i style="width:'+Math.max(1,v/max*100)+'%"></i></span><b>'+usd(v)+'</b></div>'}
    $('#ncBar',raiz).innerHTML=br('Máquina ('+TAM[tam].n+', '+horas+' h)',maq,maq>=cd&&maq>=cs)+br('Disco ('+disco+' GB)',cd,cd>maq&&cd>=cs)+br('Datos que salen (los primeros 100 GB, gratis)',cs,cs>maq&&cs>cd);
    $('#ncTot',raiz).textContent=usd(tot);$('#ncMaq',raiz).textContent=usd(maq);
    var st=$('#ncStat',raiz),m;
    if(horas===730&&!res){st.setAttribute('data-k','warn');m='Encendida todo el mes y sin compromiso es lo más caro. Si la tienda la necesitas siempre, el compromiso de un año ahorra '+usd(TAM[tam].h*730*0.35)+' al mes.'}
    else if(horas===220&&res){st.setAttribute('data-k','warn');m='Ojo: el compromiso se paga aunque la máquina esté apagada. Si solo la usas en horario laboral, conviene más pagar por hora.'}
    else{st.setAttribute('data-k','good');m=horas===220?'Apagarla fuera del horario laboral ahorra '+usd(TAM[tam].h*510)+' al mes. Sirve para pruebas u oficinas, no para una tienda que vende de noche.':'Con el compromiso de un año, la máquina cuesta 35 % menos.'}
    $('#ncMsg',raiz).textContent=m;
  }
  elegir('#ncTam',function(v){tam=+v;pintar()});
  elegir('#ncHoras',function(v){horas=+v;pintar()});
  $('#ncRes',raiz).addEventListener('change',pintar);
  $('#ncDisco',raiz).addEventListener('input',pintar);
  $('#ncSal',raiz).addEventListener('input',pintar);
  pintar();
};
})();
