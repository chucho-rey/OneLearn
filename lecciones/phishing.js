/* Laboratorios de la lección «Phishing e ingeniería social». Todas las marcas y dominios son inventados
   (los .example están reservados para ejemplos). Cada laboratorio se registra en AT.labs. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: ¿a dónde lleva el enlace? ---------- */
AT.labs['ph-enlace']=function(){
  var ENL=[
    {u:'https://www.banconube.example/ayuda',ok:1,e:'Legítimo: el dominio, justo antes de la primera diagonal, es banconube.example.'},
    {u:'https://banconube.example.verificar-cuenta.example/ingresar',ok:0,e:'Trampa: el dominio real es verificar-cuenta.example. «banconube.example» es solo un subdominio que el atacante inventó.'},
    {u:'https://app.banconube.example/ingresar',ok:1,e:'Legítimo: app. es un subdominio, pero el dominio sigue siendo banconube.example.'},
    {u:'https://www.banconube-seguridad.example/login',ok:0,e:'Trampa: banconube-seguridad.example es otro dominio, aunque contenga el nombre del banco.'},
    {u:'https://www.banconube.example@acceso-rapido.example/login',ok:0,e:'Trampa: todo lo que va antes de @ se ignora. El navegador iría a acceso-rapido.example.'},
    {u:'https://www.bancоnube.example/ingresar',ok:0,e:'Trampa: la segunda «о» es una letra cirílica que se ve igual. Es otro dominio; el navegador lo mostraría como xn--…'},
    {u:'http://banconube.example/ingresar',ok:1,e:'Es el dominio correcto, pero sin https: la conexión no va cifrada. Un banco real te redirige a https; nunca escribas tu contraseña sin el candado.'}
  ];
  var i=0,bien=0,resp=0;
  /* Dominio real que ve el navegador (para los nombres con letras de otros alfabetos, en Punycode) */
  function dominio(u){try{var h=new URL(u).hostname.split('.');return h.slice(-2).join('.')}catch(e){return '?'}}
  function render(){
    var E=ENL[i];
    $('#peUrl').textContent=E.u;
    $('#peCuenta').textContent='Enlace '+(i+1)+' de '+ENL.length+(resp?' · aciertos: '+bien+' de '+resp:'');
    $('#peBien').setAttribute('aria-disabled','false');$('#peMal').setAttribute('aria-disabled','false');
    $('#peStat').setAttribute('data-k','');$('#peMsg').textContent='¿A dónde lleva?';
    $('#peSig').hidden=true;
  }
  function contestar(dijoBien){
    if($('#peBien').getAttribute('aria-disabled')==='true')return;
    var E=ENL[i],acierto=(dijoBien?1:0)===E.ok;
    resp++;if(acierto)bien++;
    $('#peBien').setAttribute('aria-disabled','true');$('#peMal').setAttribute('aria-disabled','true');
    $('#peStat').setAttribute('data-k',acierto?'good':'bad');
    $('#peMsg').textContent=(acierto?'Correcto. ':'No. ')+E.e+' Dominio que usa el navegador: '+dominio(E.u)+'.';
    $('#peCuenta').textContent='Enlace '+(i+1)+' de '+ENL.length+' · aciertos: '+bien+' de '+resp;
    $('#peSig').hidden=false;
    $('#peSig').textContent=i<ENL.length-1?'Siguiente enlace':'Empezar de nuevo';
  }
  $('#peBien').addEventListener('click',function(){contestar(true)});
  $('#peMal').addEventListener('click',function(){contestar(false)});
  $('#peSig').addEventListener('click',function(){
    if(i<ENL.length-1)i++;else{i=0;bien=0;resp=0}
    render();$('#peBien').focus();
  });
  render();
};

/* ---------- Demo 2: encuentra las señales ---------- */
AT.labs['ph-mensaje']=function(){
  /* Partes del mensaje: texto normal o [texto, explicación] para las señales */
  var MSJ=[
    {de:'SMS de +52 55 0000 0000',partes:[
      ['Estimado cliente','Saludo genérico: si fuera tu paquetería, sabría tu nombre.'],', su paquete de ',
      ['PAQUETERIA VELOZ','Una marca en mayúsculas y sin acentos, desde un número personal: las empresas usan remitentes cortos registrados.'],
      ' no pudo ser entregado por falta de pago de ',['$25.00 MXN de reenvío','Un cobro pequeño e inesperado: quieren tus datos de tarjeta, no los $25.'],
      '. ',['Pague en las próximas 24 horas','Urgencia: buscan que actúes sin pensar.'],' o ',['su paquete sera devuelto','Amenaza y falta de ortografía («sera» sin acento).'],
      ': ',['https://veloz-entregas.example/pago','Un dominio que no es el de la paquetería. Si esperas un paquete, rastréalo tú desde el sitio oficial.']]},
    {de:'Correo de soporte@banconube-alertas.example',partes:[
      ['De: soporte@banconube-alertas.example','El correo viene de otro dominio, no de banconube.example.'],
      '. Asunto: ',['ÚLTIMO AVISO: cuenta bloqueada','Mayúsculas y amenaza para asustar.'],'. Detectamos un acceso inusual. Para desbloquear su cuenta, ',
      ['confirme su usuario, contraseña y NIP','Ningún banco te pide tu contraseña ni tu NIP por correo.'],' en el siguiente enlace. ',
      ['Si no lo hace hoy, su cuenta se cancelará','Urgencia y amenaza.'],'. ',['Haga clic aquí','El enlace esconde a dónde lleva: pasa el ratón por encima (o mantén presionado en el celular) para ver el dominio antes de tocarlo.'],
      '. Atentamente, ',['Departamento de Seguridad','Firma genérica, sin nombre ni forma de verificar.']]}
  ];
  var cual=0,vistas={};
  function render(){
    var M=MSJ[cual],h='<p class="pm-de">'+esc(M.de)+'</p><p class="pm-t">',n=0;
    M.partes.forEach(function(p,k){
      if(typeof p==='string')h+=esc(p);
      else{n++;h+='<button type="button" class="pm-s" data-k="'+k+'" aria-pressed="'+(vistas[k]?'true':'false')+'">'+esc(p[0])+'</button>'}
    });
    $('#pmMsg').innerHTML=h+'</p>';
    var v=Object.keys(vistas).length;
    $('#pmN').textContent='Señales encontradas: '+v+' de '+n;
  }
  $('#pmMsg').addEventListener('click',function(e){
    var b=e.target.closest('.pm-s');if(!b)return;
    var k=+b.getAttribute('data-k');vistas[k]=true;
    render();
    $('#pmExp').textContent=MSJ[cual].partes[k][1];
    var f=$('#pmMsg .pm-s[data-k="'+k+'"]');if(f)f.focus();
  });
  $('#pmTodas').addEventListener('click',function(){
    MSJ[cual].partes.forEach(function(p,k){if(typeof p!=='string')vistas[k]=true});
    render();$('#pmExp').textContent='Todas las señales están marcadas. Toca cualquiera para ver por qué es sospechosa.';
  });
  elegir('#pmCual',function(v){cual=+v;vistas={};$('#pmExp').textContent='';render()});
  render();
};
})();
