/* Diagramas interactivos del proyecto «Seguridad para un pequeño negocio». Se registran en AT.labs como los
   laboratorios de las lecciones; proyecto.js los dibuja (con bloques.js) dentro de la fase que los usa. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Matriz de riesgos ---------- */
AT.labs['sg-riesgos']=function(){
  /* Calificaciones iniciales razonables: el estudiante las ajusta */
  var AM=[
    {n:'Phishing',p:3,i:3},
    {n:'Contraseña reutilizada',p:3,i:3},
    {n:'Ransomware',p:2,i:3},
    {n:'Robo de equipo',p:2,i:2},
    {n:'Intruso en el Wi-Fi',p:2,i:2},
    {n:'Exempleado con acceso',p:1,i:2}
  ];
  var sel=0,NIV=['','Baja','Media','Alta'];
  function prioridad(a){var s=a.p*a.i;return s>=6?['alta','Alta']:s>=3?['media','Media']:['baja','Baja']}
  function render(){
    var a=AM[sel];
    AT.setPressed($('#rgAm'),function(b){return +b.getAttribute('data-v')===sel});
    AT.setPressed($('#rgP'),function(b){return +b.getAttribute('data-v')===a.p});
    AT.setPressed($('#rgI'),function(b){return +b.getAttribute('data-v')===a.i});
    /* Matriz: filas de impacto (alto arriba), columnas de probabilidad */
    var h='<span class="mx-ej mx-ey">Impacto</span>';
    for(var i=3;i>=1;i--){
      h+='<span class="mx-eje">'+NIV[i]+'</span>';
      for(var p=1;p<=3;p++){
        var en=AM.map(function(x,k){return x.p===p&&x.i===i?k:-1}).filter(function(k){return k>=0});
        var s=p*i,c=s>=6?'alta':s>=3?'media':'baja';
        h+='<span class="mx-c '+c+'">'+en.map(function(k){return '<b'+(k===sel?' class="sel"':'')+'>'+(k+1)+'</b>'}).join('')+'</span>';
      }
    }
    h+='<span></span><span></span><span class="mx-eje">Baja</span><span class="mx-eje">Media</span><span class="mx-eje">Alta</span><span class="mx-ej mx-ex">Probabilidad</span>';
    $('#rgMx').innerHTML=h;
    var orden=AM.map(function(x,k){return {k:k,s:x.p*x.i}}).sort(function(x,y){return y.s-x.s||x.k-y.k});
    $('#rgLista').innerHTML=orden.map(function(o){
      var x=AM[o.k],pr=prioridad(x);
      return '<li class="'+pr[0]+'"><span class="mx-n">'+(o.k+1)+'</span><span class="mx-t">'+esc(x.n)+'</span><span class="mx-p">'+pr[1]+' · '+o.s+'</span></li>';
    }).join('');
    var pr=prioridad(a);
    $('#rgMsg').textContent=a.n+': probabilidad '+NIV[a.p].toLowerCase()+' × impacto '+NIV[a.i].toLowerCase()+' = '+(a.p*a.i)+', prioridad '+pr[1].toLowerCase()+'. '+
      (pr[0]==='alta'?'Atiéndela primero.':pr[0]==='media'?'Atiéndela después de las de prioridad alta.':'Vigílala, pero no es urgente.');
  }
  $('#rgAm').innerHTML=AM.map(function(a,k){return '<button class="chip" type="button" data-v="'+k+'" aria-pressed="false">'+(k+1)+'. '+esc(a.n)+'</button>'}).join('');
  elegir('#rgAm',function(v){sel=+v;render()});
  elegir('#rgP',function(v){AM[sel].p=+v;render()});
  elegir('#rgI',function(v){AM[sel].i=+v;render()});
  render();
};

/* ---------- El router de la panadería ---------- */
AT.labs['sg-router']=function(){
  /* Cada ajuste: opciones [valor, texto], el valor actual, el seguro y la explicación */
  var AJ=[
    {id:'panel',n:'Contraseña del panel de administración',o:[['fab','La de fábrica (admin / admin)'],['nueva','Una contraseña única y larga']],v:'fab',ok:'nueva',
     m:'La contraseña de fábrica está publicada en internet para cada modelo. Cualquiera conectado al Wi-Fi podría cambiar la configuración.'},
    {id:'cifrado',n:'Seguridad del Wi-Fi',o:[['abierta','Abierta'],['wep','WEP'],['wpa2','WPA2'],['wpa3','WPA3']],v:'wep',ok:['wpa2','wpa3'],
     m:'WEP se rompe en minutos con herramientas gratuitas, y una red abierta no cifra nada. Usa WPA2 o, si todos los equipos lo aceptan, WPA3.'},
    {id:'clave',n:'Contraseña del Wi-Fi',o:[['corta','espiga123'],['larga','Una frase larga al azar']],v:'corta',ok:'larga',
     m:'«espiga123» se adivina con un diccionario en segundos. Una frase larga al azar resiste mucho más.'},
    {id:'wps',n:'WPS (conectar con botón o PIN)',o:[['si','Activado'],['no','Desactivado']],v:'si',ok:'no',
     m:'El PIN de WPS tiene fallas conocidas que permiten descubrir la contraseña del Wi-Fi. Si no lo usas, apágalo.'},
    {id:'invitados',n:'Red para clientes',o:[['misma','Usan la misma red del negocio'],['aparte','Red de invitados aparte']],v:'misma',ok:'aparte',
     m:'En la misma red, el celular de un cliente puede ver la laptop de la caja. La red de invitados solo les da salida a internet.'},
    {id:'remota',n:'Administración remota (desde internet)',o:[['si','Activada'],['no','Desactivada']],v:'si',ok:'no',
     m:'Con la administración remota activada, el panel del router se puede atacar desde cualquier lugar del mundo.'},
    {id:'firmware',n:'Firmware del router',o:[['viejo','Versión de 2021'],['nuevo','Última versión']],v:'viejo',ok:'nuevo',
     m:'Un firmware viejo tiene fallas de seguridad ya conocidas y corregidas en versiones nuevas.'}
  ];
  function seguro(a){return Array.isArray(a.ok)?a.ok.indexOf(a.v)>=0:a.v===a.ok}
  function panel(){
    $('#rtPanel').innerHTML='<div class="rt-h1">Router · Panel de administración</div>'+AJ.map(function(a){
      return '<div class="rt-f"><span class="rt-n" id="rtN-'+a.id+'">'+esc(a.n)+'</span><div class="seg rt-s" id="rt-'+a.id+'" role="group" aria-labelledby="rtN-'+a.id+'">'+
        a.o.map(function(o){return '<button type="button" data-v="'+o[0]+'" aria-pressed="'+(o[0]===a.v)+'">'+esc(o[1])+'</button>'}).join('')+'</div></div>';
    }).join('');
    AJ.forEach(function(a){elegir('#rt-'+a.id,function(v){a.v=v;resultado()})});
  }
  function resultado(){
    var mal=AJ.filter(function(a){return !seguro(a)}),ok=AJ.length-mal.length;
    $('#rtOk').textContent=ok+' de '+AJ.length;$('#rtBar').style.width=(ok/AJ.length*100)+'%';
    $('#rtHall').innerHTML=mal.length?mal.map(function(a){return '<li><b>Falla: '+esc(a.n)+'.</b> '+esc(a.m)+'</li>'}).join(''):
      '<li class="ok"><b>Sin fallas.</b> El router quedó configurado de forma segura. Anota cada cambio para tu informe.</li>';
  }
  panel();resultado();
};
})();
