/* Laboratorios de la lección «Wi-Fi». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en wifi.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,fmt=AT.fmt,elegir=AT.elegir;

/* ---------- Demo 1: elige el canal ---------- */
AT.labs['wf-canal']=function(raiz){
  /* Redes vecinas: [nombre, canal, señal en dBm] */
  var VEC=[['Casa-Lopez',1,-58],['INFINITUM_8F2A',1,-71],['Depa-302',6,-63],['Totalplay-55',6,-75],['Oficina-Contable',11,-68],['Familia R',4,-80]];
  var ent=$('#wcCan',raiz);
  function fuerza(dbm){return Math.pow(10,(dbm+100)/20)}
  function pintar(){
    var c=+ent.value,mismo=0,enc=0,inter=0;
    VEC.forEach(function(v){var d=Math.abs(v[1]-c);if(d===0){mismo++;inter+=fuerza(v[2])*0.6}else if(d<5){enc++;inter+=fuerza(v[2])*(1-d/5)*1.2}});
    var pct=Math.min(100,Math.round(inter/2.2));
    $('#wcCanV',raiz).textContent=String(c);
    $('#wcGraf',raiz).innerHTML='<div class="wc-ej">'+[1,2,3,4,5,6,7,8,9,10,11,12,13].map(function(n){return '<span'+(n===c?' class="on"':'')+'>'+n+'</span>'}).join('')+'</div>'+
      VEC.concat([['Tu red',c,-45,true]]).map(function(v){
        var izq=(Math.max(1,v[1]-2)-1)/13*100,der=(Math.min(13,v[1]+2))/13*100,alto=Math.round((v[2]+100)*1.4);
        return '<div class="wc-r'+(v[3]?' tuya':'')+'" style="left:'+izq+'%;width:'+(der-izq)+'%;height:'+alto+'%"><span>'+esc(v[0])+'</span></div>';
      }).join('');
    $('#wcMismo',raiz).textContent=String(mismo);
    $('#wcEnc',raiz).textContent=String(enc);
    $('#wcInt',raiz).textContent=pct<25?'Baja':pct<60?'Media':'Alta';
    $('#wcBar',raiz).style.width=pct+'%';
    var st=$('#wcStat',raiz),m;
    if([1,6,11].indexOf(c)<0){st.setAttribute('data-k','bad');m='El canal '+c+' se encima con '+enc+' redes: interfieren aunque no estén en tu canal. Usa 1, 6 u 11.'}
    else if(pct<35){st.setAttribute('data-k','good');m='Buena elección: el canal '+c+' no se encima con nadie'+(mismo?' y comparte el aire con '+mismo+' red'+(mismo>1?'es':'')+' débil'+(mismo>1?'es':''):'')+'.'}
    else{st.setAttribute('data-k','warn');m='En el canal '+c+' hay '+mismo+' red'+(mismo===1?'':'es')+' fuerte'+(mismo===1?'':'s')+': se turnarán el aire. Prueba otro de los canales 1, 6 u 11, o mejor aún, usa 5 GHz.'}
    $('#wcMsg',raiz).textContent=m;
  }
  ent.addEventListener('input',pintar);
  pintar();
};

/* ---------- Demo 2: señal y velocidad ---------- */
AT.labs['wf-senal']=function(raiz){
  var BANDAS=[{n:'2.4 GHz',f:2.4,muro:4,max:150},{n:'5 GHz',f:5,muro:8,max:800},{n:'6 GHz',f:6,muro:10,max:1200}];
  function calidad(d){return d>=-50?'Excelente':d>=-67?'Buena':d>=-75?'Regular':d>=-85?'Mala':'Sin conexión'}
  function pintar(){
    var dist=+$('#wsDist',raiz).value,mu=+$('#wsMuros',raiz).value,res=[];
    $('#wsDistV',raiz).textContent=dist+' m';$('#wsMurosV',raiz).textContent=String(mu);
    BANDAS.forEach(function(b){
      var perd=20*Math.log10(dist)+20*Math.log10(b.f*1000)-27.55+mu*b.muro,dbm=Math.round(20-perd);
      var frac=Math.max(0,Math.min(1,(dbm+88)/40)),vel=Math.round(b.max*frac*frac);
      res.push({b:b,dbm:dbm,vel:dbm<-88?0:vel});
    });
    var mejor=res.slice().sort(function(a,b){return b.vel-a.vel})[0];
    $('#wsBarras',raiz).innerHTML=res.map(function(r){return '<div class="br'+(r===mejor&&r.vel?' on':'')+'"><span class="br-l">'+r.b.n+' · '+r.dbm+' dBm · '+calidad(r.dbm)+'</span><span class="br-b" aria-hidden="true"><i style="width:'+Math.max(0.5,r.vel/12)+'%"></i></span><b>'+(r.vel?'~'+fmt(r.vel)+' Mbps':'Sin conexión')+'</b></div>'}).join('');
    var st=$('#wsStat',raiz);
    if(!mejor.vel){st.setAttribute('data-k','bad');$('#wsMsg',raiz).textContent='Demasiado lejos o demasiadas paredes: ninguna banda llega. Hace falta otro punto de acceso.'}
    else{st.setAttribute('data-k',mejor.dbm>=-67?'good':'warn');$('#wsMsg',raiz).textContent='Conviene '+mejor.b.n+'. '+(mejor.b.f===2.4?'A esta distancia o con estos muros, 2.4 GHz es la única que aguanta, aunque sea más lenta.':'Cerca y con pocos muros, las bandas altas son mucho más rápidas.')}
  }
  $('#wsDist',raiz).addEventListener('input',pintar);
  $('#wsMuros',raiz).addEventListener('input',pintar);
  pintar();
};

/* ---------- Demo 3: revisa este router ---------- */
AT.labs['wf-seguro']=function(raiz){
  var cif='wep',clave='corta';
  function pintar(){
    var wps=$('#wqWps',raiz).checked,adm=$('#wqAdmin',raiz).checked,inv=$('#wqInv',raiz).checked,fw=$('#wqFw',raiz).checked,ocu=$('#wqOculto',raiz).checked;
    var ITEMS=[
      [cif==='wpa3'?25:cif==='wpa2'?20:0,cif==='wep'?'WEP se rompe en minutos: cambia a WPA3 o WPA2-AES.':'Cifrado '+(cif==='wpa3'?'WPA3: lo mejor disponible.':'WPA2-AES: aceptable si algún equipo no soporta WPA3.'),cif!=='wep'],
      [clave==='larga'?25:0,clave==='larga'?'Contraseña larga: aguanta los intentos por fuerza bruta.':'«oficina1» se adivina con un diccionario en segundos.',clave==='larga'],
      [wps?0:15,wps?'WPS encendido: su PIN de 8 dígitos se adivina en horas.':'WPS apagado.',!wps],
      [adm?0:15,adm?'La contraseña del router sigue en «admin»: cualquiera conectado puede cambiar la configuración.':'Contraseña del router cambiada.',!adm],
      [inv?10:0,inv?'Visitas y cámaras en su propia red: no ven las computadoras.':'Sin red de invitados: las visitas y los aparatos inteligentes comparten red con tus computadoras.',inv],
      [fw?10:0,fw?'Firmware al día.':'Firmware sin actualizar: puede tener fallas conocidas.',fw]
    ];
    var p=ITEMS.reduce(function(a,i){return a+i[0]},0);
    $('#wqPunt',raiz).textContent=p+' de 100';
    $('#wqBar',raiz).style.width=p+'%';
    $('#wqLista',raiz).innerHTML=ITEMS.map(function(i){return '<li class="'+(i[2]?'ok':'mal')+'">'+esc(i[1])+'</li>'}).join('')+(ocu?'<li class="neutro">Ocultar el SSID no suma: las redes ocultas se ven con cualquier herramienta, y tus equipos lo andan buscando por todos lados.</li>':'');
    var st=$('#wqStat',raiz);
    st.setAttribute('data-k',p>=90?'good':p>=50?'warn':'bad');
    $('#wqMsg',raiz).textContent=p>=90?'El router quedó bien protegido.':p>=50?'Vas bien, pero todavía hay huecos.':'Así como está, cualquier vecino con ganas entra a la red.';
  }
  elegir('#wqCif',function(v){cif=v;pintar()});
  elegir('#wqClave',function(v){clave=v;pintar()});
  $$('input[type=checkbox]',raiz).forEach(function(c){c.addEventListener('change',pintar)});
  pintar();
};
})();
