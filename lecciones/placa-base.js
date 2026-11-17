/* Laboratorios de la lección «Placa base». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en placa-base.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: ancho de banda PCIe ---------- */
AT.labs['placa-pcie']=function(){
  var POR_CARRIL={3:0.985,4:1.969,5:3.938},gen=4,car=4;
  var OTROS=[['SATA III (SSD de 2.5″)',0.6],['USB 3.2 Gen 2',1.25],['Red de 10 Gb/s',1.25],['SSD NVMe rápido (lectura)',7]];
  function gb(x){return fmt(x,x<10?2:1)+' GB/s'}
  function render(){
    var bw=POR_CARRIL[gen]*car,max=3.938*16;
    var filas=[['PCIe '+gen+'.0 ×'+car,bw,1]].concat(OTROS);
    $('#pcBar').innerHTML=filas.map(function(f){
      return '<div class="br'+(f[2]?' on':'')+'"><span class="br-l">'+esc(f[0])+'</span><span class="br-b" aria-hidden="true"><i style="width:'+(f[1]/max*100)+'%"></i></span><b>'+gb(f[1])+'</b></div>';
    }).join('');
    var m='PCIe '+gen+'.0 ×'+car+' mueve unos '+gb(bw)+' en cada dirección.';
    if(bw<7)m+=' Un SSD de 7 GB/s conectado aquí quedaría limitado a '+gb(bw)+'.';
    else m+=' Alcanza para el SSD más rápido de la lista'+(car>=16?' y para una tarjeta gráfica de gama alta.':'.');
    if(gen<5)m+=' La misma conexión en PCIe '+(gen+1)+'.0 daría el doble.';
    $('#pcMsg').textContent=m;
  }
  elegir('#pcGen',function(v){gen=+v;render()});
  elegir('#pcLan',function(v){car=+v;render()});
  render();
};

/* ---------- Demo 2: ¿son compatibles? ---------- */
AT.labs['placa-compat']=function(){
  var CPU=[{n:'Core i5-14600K',s:'LGA1700',f:'Intel 12.ª a 14.ª generación'},{n:'Core Ultra 5 245K',s:'LGA1851',f:'Intel Core Ultra 200S'},
           {n:'Ryzen 5 9600X',s:'AM5',f:'AMD Ryzen 7000 a 9000',ram:5},{n:'Ryzen 5 5600',s:'AM4',f:'AMD Ryzen 1000 a 5000',ram:4}];
  var PLACA=[{n:'Z790',s:'LGA1700',ram:5},{n:'Z890',s:'LGA1851',ram:5},{n:'B650',s:'AM5',ram:5},{n:'B550',s:'AM4',ram:4}];
  var c=0,pl=2,ram=5;
  function render(){
    var C=CPU[c],P=PLACA[pl],ok=0,h='';
    var reglas=[
      [C.s===P.s,'Socket: el procesador usa '+C.s+' y la placa tiene '+P.s+'.'],
      [C.s===P.s,'Chipset: el '+P.n+' es para '+(P.s===C.s?C.f:'otra familia de procesadores')+'.'],
      [ram===P.ram,'RAM: la placa acepta DDR'+P.ram+' y elegiste DDR'+ram+'.']
    ];
    reglas.forEach(function(r){
      if(r[0])ok++;
      h+='<li class="'+(r[0]?'si':'no')+'"><b>'+(r[0]?'Cumple':'No cumple')+'</b><span>'+esc(r[1])+'</span></li>';
    });
    $('#cmRes').innerHTML=h;
    var todo=ok===3,m;
    if(todo)m='Compatibles: el '+C.n+', la placa '+P.n+' y la RAM DDR'+ram+' funcionan juntos.';
    else if(C.s!==P.s)m='No compatibles: el procesador no entra en el socket de esta placa. Busca una placa con socket '+C.s+'.';
    else m='Casi: el procesador y la placa coinciden, pero la RAM DDR'+ram+' no entra en esta placa. Necesitas DDR'+P.ram+'.';
    $('#cmStat').setAttribute('data-k',todo?'good':'bad');
    $('#cmMsg').textContent=m;
  }
  elegir('#cmCpu',function(v){c=+v;render()});
  elegir('#cmPlaca',function(v){pl=+v;render()});
  elegir('#cmRam',function(v){ram=+v;render()});
  render();
};

/* ---------- Demo 3: el arranque paso a paso ---------- */
AT.labs['placa-arranque']=function(){
  var PASOS=[
    ['Presionas el botón','La placa le avisa a la fuente de poder, que empieza a entregar energía.'],
    ['La fuente se estabiliza','Cuando los voltajes son estables, la fuente manda la señal «Power Good» y la placa deja arrancar al procesador.'],
    ['El procesador ejecuta la UEFI','Lo primero que lee es el firmware guardado en un chip de la placa.'],
    ['POST: revisión del hardware','La UEFI revisa el procesador, la RAM y la tarjeta gráfica, y prepara los dispositivos.'],
    ['Busca de dónde arrancar','Recorre el orden de arranque (SSD, USB, red) hasta encontrar un disco con un sistema operativo.'],
    ['Carga el gestor de arranque','Lee un programa pequeño del disco (por ejemplo, el de Windows o GRUB en Linux).'],
    ['Arranca el sistema operativo','El gestor carga el kernel del sistema operativo en la RAM y le pasa el control.']
  ];
  var i=0,falla=$('#arFalla'),detenido=false;
  function render(){
    $('#arPasos').innerHTML=PASOS.map(function(p,k){
      var cls=k<i?'ok':k===i&&!detenido?'on':k===i&&detenido?'mal':'';
      return '<li class="'+cls+'"><b>'+esc(p[0])+'</b>'+(k<i||(k===i&&detenido)?'<span>'+esc(k===i&&detenido?'Falla: la RAM no responde.':p[1])+'</span>':'')+'</li>';
    }).join('');
    var fin=i>=PASOS.length||detenido;
    $('#arSig').setAttribute('aria-disabled',fin?'true':'false');
  }
  function msg(t,k){$('#arStat').setAttribute('data-k',k||'');$('#arMsg').textContent=t}
  function siguiente(){
    if(i>=PASOS.length||detenido)return;
    if(i===3&&falla.checked){
      detenido=true;render();
      msg('El POST no encontró RAM que funcione, así que la placa se detiene antes de mostrar imagen: emite pitidos o enciende el LED de DRAM. La solución suele ser volver a colocar los módulos.','bad');
      return;
    }
    i++;render();
    if(i===PASOS.length)msg('Listo: el sistema operativo tomó el control. Todo esto suele tardar entre 5 y 20 segundos.','good');
    else msg('Paso '+i+' de '+PASOS.length+': '+PASOS[i-1][1]);
  }
  function reset(){i=0;detenido=false;render();msg('La computadora está apagada. Pulsa «Siguiente paso».')}
  $('#arSig').addEventListener('click',function(){if(this.getAttribute('aria-disabled')!=='true')siguiente()});
  $('#arReset').addEventListener('click',reset);
  falla.addEventListener('change',reset);
  reset();
};
})();
