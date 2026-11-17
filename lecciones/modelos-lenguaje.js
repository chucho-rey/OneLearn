/* Laboratorios de la lección «Modelos de lenguaje (LLM)». El primero es un modelo de lenguaje real, aunque
   diminuto: cuenta qué palabra sigue a cada palabra en un corpus de frases (un modelo de bigramas).
   Cada laboratorio se registra en AT.labs. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: predice la siguiente palabra ---------- */
AT.labs['ml-siguiente']=function(){
  var CORPUS=[
    'el gato duerme en la cama .','el gato come pescado .','el gato juega con una pelota .','el perro juega en el parque .',
    'el perro come croquetas .','el perro duerme en el sol .','el procesador ejecuta instrucciones .','el procesador es muy rápido .',
    'el modelo predice la siguiente palabra .','el modelo aprende de los datos .','el modelo lee mucho texto .',
    'la computadora tiene memoria ram .','la computadora procesa los datos muy rápido .','la memoria guarda los datos .',
    'la niña lee un libro .','la niña juega en el parque .','la red conecta las computadoras .','la red neuronal aprende de los datos .',
    'mi gato duerme en la cama .','mi perro juega con una pelota .','mi computadora tiene un procesador rápido .','mi computadora es muy lenta .',
    'los estudiantes leen un libro .','los estudiantes aprenden programación .','los datos viajan por la red .','los datos son muy importantes .',
    'los perros juegan en el parque .','un libro tiene muchas palabras .','una pelota es muy divertida .','el parque es muy grande .'
  ];
  /* Conteo: siguiente[palabra][otra] = cuántas veces «otra» vino después de «palabra» */
  var SIG={};
  CORPUS.forEach(function(f){var p=f.split(' ');for(var i=0;i<p.length-1;i++){var a=p[i],b=p[i+1];SIG[a]=SIG[a]||{};SIG[a][b]=(SIG[a][b]||0)+1}});
  var T=$('#sgT'),frase=['el'];
  function opciones(pal){
    var c=SIG[pal]||{},tot=0,t=+T.value,l=Object.keys(c).map(function(k){tot+=c[k];return {w:k,n:c[k]}});
    /* Temperatura: probabilidad ∝ conteo^(1/T) */
    var z=0;l.forEach(function(o){o.p0=o.n/tot;o.q=Math.pow(o.n,1/t);z+=o.q});
    l.forEach(function(o){o.p=o.q/z});
    return l.sort(function(a,b){return b.p-a.p||a.w.localeCompare(b.w)});
  }
  function render(){
    var ult=frase[frase.length-1],l=opciones(ult),fin=ult==='.'||!l.length;
    $('#sgFrase').textContent=frase.join(' ').replace(' .','.');
    $('#sgUlt').textContent=ult;
    $('#sgProb').innerHTML=fin?'<p class="lbl">La frase terminó.</p>':l.slice(0,6).map(function(o,k){
      return '<div class="br'+(k===0?' on':'')+'"><span class="br-l">'+(o.w==='.'?'(punto final)':esc(o.w))+'</span><span class="br-b" aria-hidden="true"><i style="width:'+(o.p*100)+'%"></i></span><b>'+fmt(o.p*100,0)+' %</b></div>';
    }).join('');
    $('#sgTv').textContent=fmt(+T.value,1);T.setAttribute('aria-valuetext','Temperatura '+fmt(+T.value,1));
    ['#sgUna','#sgFin','#sgGreedy'].forEach(function(s){$(s).setAttribute('aria-disabled',fin?'true':'false')});
    var t=+T.value;
    $('#sgMsg').textContent=t<0.5?'Temperatura baja: casi siempre gana la palabra más probable. Frases seguras y repetitivas.':
      t>1.4?'Temperatura alta: las palabras raras tienen casi la misma oportunidad que las comunes. Más variedad, y más frases sin sentido.':
      'Temperatura media: suele elegir lo probable, pero a veces se arriesga.';
  }
  function elegirPalabra(greedy){
    var l=opciones(frase[frase.length-1]);if(!l.length)return false;
    var w=l[0].w;
    if(!greedy){var r=Math.random(),acc=0;for(var k=0;k<l.length;k++){acc+=l[k].p;if(r<=acc){w=l[k].w;break}}}
    frase.push(w);return w!=='.'&&frase.length<16;
  }
  function activo(s){return $(s).getAttribute('aria-disabled')!=='true'}
  $('#sgUna').addEventListener('click',function(){if(activo('#sgUna')){elegirPalabra(false);render()}});
  $('#sgFin').addEventListener('click',function(){if(activo('#sgFin')){while(elegirPalabra(false));if(frase[frase.length-1]!=='.')frase.push('.');render()}});
  $('#sgGreedy').addEventListener('click',function(){if(activo('#sgGreedy')){while(elegirPalabra(true));if(frase[frase.length-1]!=='.')frase.push('.');render()}});
  $('#sgReset').addEventListener('click',function(){frase=[frase[0]];render()});
  T.addEventListener('input',render);
  elegir('#sgIni',function(v){frase=[v];render()});
  render();
};

/* ---------- Demo 2: palabras como puntos ---------- */
AT.labs['ml-vectores']=function(){
  /* Coordenadas hechas a mano para ilustrar: grupos por tema, y la dirección hombre → mujer igual a rey → reina */
  var P={
    'hombre':[40,150],'mujer':[40,200],'rey':[120,150],'reina':[120,200],'príncipe':[100,130],'princesa':[100,180],
    'perro':[230,40],'gato':[255,55],'lobo':[210,25],'tigre':[275,30],
    'manzana':[230,170],'pera':[250,185],'plátano':[270,165],'uva':[245,205],
    'procesador':[60,40],'memoria':[85,55],'disco':[45,70]
  };
  var svg=$('#veSvg'),sel='gato',analogia=false;
  function d(a,b){var x=P[a][0]-P[b][0],y=P[a][1]-P[b][1];return Math.sqrt(x*x+y*y)}
  function vecinas(w){return Object.keys(P).filter(function(k){return k!==w}).sort(function(a,b){return d(w,a)-d(w,b)}).slice(0,3)}
  function render(){
    var v=vecinas(sel),h='';
    if(!analogia)v.forEach(function(k){h+='<line class="ve-v" x1="'+P[sel][0]+'" y1="'+P[sel][1]+'" x2="'+P[k][0]+'" y2="'+P[k][1]+'"/>'});
    else{
      var dx=P.mujer[0]-P.hombre[0],dy=P.mujer[1]-P.hombre[1];
      h+='<line class="ve-a" x1="'+P.hombre[0]+'" y1="'+P.hombre[1]+'" x2="'+P.mujer[0]+'" y2="'+(P.mujer[1]-8)+'"/>';
      h+='<line class="ve-a" x1="'+P.rey[0]+'" y1="'+P.rey[1]+'" x2="'+(P.rey[0]+dx)+'" y2="'+(P.rey[1]+dy-8)+'"/>';
    }
    Object.keys(P).forEach(function(k){
      var cls=k===sel&&!analogia?' sel':(!analogia&&v.indexOf(k)>=0)||(analogia&&/^(hombre|mujer|rey|reina)$/.test(k))?' cerca':'';
      h+='<g class="ve-p'+cls+'"><circle cx="'+P[k][0]+'" cy="'+P[k][1]+'" r="4"/><text x="'+(P[k][0]+7)+'" y="'+(P[k][1]+4)+'">'+esc(k)+'</text></g>';
    });
    svg.innerHTML=h;
    AT.setPressed($('#veSel'),function(b){return !analogia&&b.getAttribute('data-v')===sel});
    $('#veMsg').textContent=analogia?'Ir de «hombre» a «mujer» es el mismo desplazamiento que ir de «rey» a «reina». Si al vector de «rey» le restas «hombre» y le sumas «mujer», caes justo en «reina».':
      'Las palabras más cercanas a «'+sel+'» son: '+v.join(', ')+'. Las de un mismo tema forman grupos, porque aparecen en contextos parecidos.';
  }
  $('#veSel').innerHTML=Object.keys(P).map(function(k){return '<button class="chip" type="button" data-v="'+esc(k)+'" aria-pressed="false">'+esc(k)+'</button>'}).join('');
  elegir('#veSel',function(v){sel=v;analogia=false;render()});
  $('#veAnalogia').addEventListener('click',function(){analogia=true;render()});
  render();
};
})();
