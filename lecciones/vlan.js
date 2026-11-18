/* Laboratorios de la lección «VLAN y segmentación». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en vlan.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: separa la red de la oficina ---------- */
AT.labs['vl-puertos']=function(raiz){
  var EQ=[{id:'conta',n:'PC de contabilidad'},{id:'ventas',n:'PC de ventas'},{id:'srv',n:'Servidor de archivos'},{id:'imp',n:'Impresora'},{id:'cam',n:'Cámara IP'},{id:'inv',n:'Laptop de invitado'}];
  var VL=[1,10,30,40],v={};EQ.forEach(function(e){v[e.id]=1});
  $('#vpEq',raiz).innerHTML=EQ.map(function(e,k){return '<div class="vp-f"><span class="vp-n">Puerto '+(k+1)+': '+esc(e.n)+'</span><div class="seg" role="group" aria-label="VLAN de '+esc(e.n)+'" data-eq="'+e.id+'">'+VL.map(function(n){return '<button type="button" data-v="'+n+'" aria-pressed="'+(n===1)+'">'+n+'</button>'}).join('')+'</div></div>'}).join('');
  function alcance(a,b){if(v[a]===v[b])return 'di';if(v[a]===30||v[b]===30)return 'bl';return 'ro'}
  function pintar(){
    var corto={conta:'Conta.',ventas:'Ventas',srv:'Servidor',imp:'Impresora',cam:'Cámara',inv:'Invitado'};
    var h='<thead><tr><th><span class="vh">Desde</span></th>'+EQ.map(function(e){return '<th>'+corto[e.id]+'</th>'}).join('')+'</tr></thead><tbody>';
    EQ.forEach(function(a){h+='<tr><th>'+corto[a.id]+' <span class="vp-v">VLAN '+v[a.id]+'</span></th>'+EQ.map(function(b){if(a===b)return '<td class="vp-yo">—</td>';var k=alcance(a.id,b.id);return '<td class="vp-'+k+'">'+(k==='di'?'Directo':k==='ro'?'Router':'No')+'</td>'}).join('')+'</tr>'});
    $('#vpM',raiz).innerHTML=h+'</tbody>';
    var prob=[],otros=EQ.filter(function(e){return e.id!=='inv'&&e.id!=='cam'});
    if(v.inv!==30)prob.push('el invitado debería estar en la VLAN 30, la que solo sale a internet');
    else if(EQ.some(function(e){return e.id!=='inv'&&v[e.id]===30}))prob.push('en la VLAN 30 de invitados hay equipos de la oficina');
    if(v.cam===v.conta||v.cam===v.srv||v.cam===1)prob.push('la cámara comparte VLAN con equipos de la oficina: ponla sola en la 40');
    if(otros.some(function(e){return v[e.id]===40})&&v.cam===40)prob.push('en la VLAN 40 de cámaras hay equipos de la oficina');
    if(otros.some(function(e){return v[e.id]===1})&&!prob.length)prob.push('quedan equipos en la VLAN 1; lo recomendable es no usarla');
    var st=$('#vpStat',raiz);
    st.setAttribute('data-k',prob.length?(v.inv===30&&v.cam===40?'warn':'bad'):'good');
    $('#vpMsg',raiz).textContent=prob.length?'Falta: '+prob[0]+'.':'Listo: la oficina en la 10, invitados aislados en la 30 y la cámara sola en la 40. Entre la oficina y la cámara solo se pasa por el router, que puede filtrar.';
  }
  $('#vpEq',raiz).addEventListener('click',function(e){
    var b=e.target.closest('button'),g=b&&b.closest('[data-eq]');if(!g)return;
    v[g.getAttribute('data-eq')]=+b.getAttribute('data-v');
    AT.setPressed(g,function(x){return x===b});pintar();
  });
  pintar();
};

/* ---------- Demo 2: la etiqueta 802.1Q ---------- */
AT.labs['vl-trama']=function(raiz){
  var vlan=10,tramo=0;
  function pintar(){
    var et=tramo===1,bin=('000000000000'+vlan.toString(2)).slice(-12);
    var C=[['MAC destino','6 bytes','52:54:00:7a:21:9c'],['MAC origen','6 bytes','08:00:27:3a:5c:91']];
    if(et)C.push(['Etiqueta 802.1Q','4 bytes','0x8100 · VLAN '+vlan,'tag']);
    C.push(['Tipo','2 bytes','0x0800 (IPv4)'],['Datos','46 a 1500 bytes','el paquete IP'],['FCS','4 bytes','revisión de errores']);
    $('#vtTrama',raiz).innerHTML=C.map(function(c){return '<div class="vt-c'+(c[3]?' vt-tag':'')+'"><b>'+esc(c[0])+'</b><span>'+esc(c[1])+'</span><code>'+esc(c[2])+'</code></div>'}).join('');
    $('#vtBits',raiz).textContent=et?'Los 12 bits del número de VLAN: '+bin+' = '+vlan+'.':'';
    var st=$('#vtStat',raiz),M=['La PC manda una trama normal, sin etiqueta: no sabe nada de VLAN. El switch 1 la recibe en un puerto de acceso de la VLAN '+vlan+' y anota que es de esa VLAN.',
      'Por el troncal viajan tramas de muchas VLAN, así que el switch 1 le agrega la etiqueta 802.1Q con el número '+vlan+'. La trama crece 4 bytes.',
      'El switch 2 lee la etiqueta, la quita y entrega la trama solo en los puertos de la VLAN '+vlan+'. El servidor la recibe normal, sin etiqueta.'];
    st.setAttribute('data-k',et?'good':'');
    $('#vtMsg',raiz).textContent=M[tramo];
  }
  elegir('#vtVlan',function(x){vlan=+x;pintar()});
  elegir('#vtTramo',function(x){tramo=+x;pintar()});
  pintar();
};
})();
