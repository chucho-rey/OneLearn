/* OneBook: la página de ayuda (ayuda.html). bloques.js dibuja la guía (formato de bloques); aquí:
   - Cada herramienta (título de nivel 2 con id ay-<módulo>-<nombre>) se agrupa con sus bloques en una sección.
   - Se ven las herramientas de tu espacio (núcleo y tus módulos, perfil.js); «Ver todas» muestra también las de los
     módulos apagados, con un aviso de cómo encenderlos. Un enlace directo (ayuda.html#ay-rh-ptu) siempre se ve.
   - «Busca en la ayuda» filtra las secciones mientras escribes (sin acentos); el índice sigue al filtro.
   - «Crear esta página» abre la plantilla de esa herramienta (crear.js), si está en tu espacio. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
var page=$('.page');if(!page)return;
var PER=AT.perfil;
var MODULOS={nucleo:'',negocio:'Negocio y dinero',rh:'Recursos humanos',estudio:'Estudio'};
/* La plantilla de cada herramienta */
var PLANTILLA={'ay-nucleo-bases':'clientes','ay-negocio-corte':'corte','ay-negocio-fiado':'fiado','ay-negocio-gastos':'gastos',
  'ay-negocio-venta':'venta','ay-negocio-precio':'precio','ay-negocio-porpagar':'proveedores','ay-negocio-pagos':'prestamo',
  'ay-negocio-inventario':'inventario','ay-negocio-reporte':'reporte','ay-negocio-presupuesto':'presupuesto','ay-negocio-finanzas':'finanzas',
  'ay-rh-equipo':'equipo','ay-rh-nomina':'nominas','ay-rh-recibo':'calculadoras','ay-rh-vacaciones':'vacaciones','ay-rh-aguinaldo':'aguinaldos',
  'ay-rh-finiquito':'finiquito','ay-rh-ptu':'ptu','ay-estudio-apuntes':'libreta','ay-estudio-tesis':'tesis'};
function tiene(m){return m==='nucleo'||!PER||PER.tiene(m)}
function sinAcentos(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}

/* ---------- Secciones ---------- */
var secs=[];
$$('h2[id^="ay-"]',page).forEach(function(h){
  var m=/^ay-([a-z]+)-/.exec(h.id),mod=m&&MODULOS.hasOwnProperty(m[1])?m[1]:'nucleo';
  var sec=document.createElement('section');
  sec.className='ay-sec';sec.setAttribute('data-mod',mod);sec.setAttribute('aria-labelledby',h.id);
  h.parentNode.insertBefore(sec,h);
  var x=h;
  while(x){var sig=x.nextElementSibling;sec.appendChild(x);x=sig&&!(sig.tagName==='H2'&&/^ay-/.test(sig.id))&&sig.className.indexOf('next')<0?sig:null}
  if(!tiene(mod))sec.insertBefore(Object.assign(document.createElement('p'),{className:'ay-apagado',textContent:'Necesita el módulo «'+MODULOS[mod]+'»: enciéndelo en Tus datos → «Cambiar tu espacio».'}),h.nextSibling);
  var t=PLANTILLA[h.id],tipo=t&&AT.tiposDoc&&AT.tiposDoc[t];
  if(tipo&&tipo.listo&&AT.crear&&tiene(mod)){
    var d=document.createElement('div');d.className='ay-acc';
    d.innerHTML='<button type="button" class="btn" data-crear="'+esc(t)+'">'+ico(tipo.icono||'crear')+'Crear «'+esc(tipo.nombre)+'»</button>';
    sec.appendChild(d);
  }
  secs.push({el:sec,id:h.id,mod:mod,texto:sinAcentos(sec.textContent)});
});
var apagadas=secs.filter(function(s){return !tiene(s.mod)}).length;

/* ---------- Buscador y «Ver todas» ---------- */
var toc=$('.toc',page),primero=toc||(secs[0]&&secs[0].el);
var barra=document.createElement('div');
barra.className='ay-barra';
barra.innerHTML='<label class="ay-q"><span class="vh">Busca en la ayuda</span>'+ico('investigacion')+'<input type="search" id="ayQ" placeholder="Busca una herramienta (ej. aguinaldo, corte, factura)" autocomplete="off"></label>'+
  (apagadas?'<button type="button" class="btn" id="ayTodas" aria-pressed="false">Ver todas ('+apagadas+' más)</button>':'')+
  '<p class="ay-cuenta" id="ayCuenta" role="status"></p>';
if(primero)primero.parentNode.insertBefore(barra,primero);
var todas=false,q=$('#ayQ',barra),bTodas=$('#ayTodas',barra);
/* Si la dirección pide una herramienta de un módulo apagado, se muestran todas */
var pedida=location.hash&&secs.filter(function(s){return '#'+s.id===decodeURIComponent(location.hash)})[0];
if(pedida&&!tiene(pedida.mod))todas=true;
function filtrar(){
  var t=sinAcentos(q.value).trim(),palabras=t?t.split(/\s+/):[],n=0;
  secs.forEach(function(s){
    var ver=(todas||tiene(s.mod))&&palabras.every(function(p){return s.texto.indexOf(p)>=0});
    s.el.hidden=!ver;if(ver)n++;
    if(toc){var b=toc.querySelector('[data-go="'+s.id+'"]');if(b)b.parentNode.hidden=!ver}
  });
  if(bTodas){bTodas.setAttribute('aria-pressed',todas?'true':'false');bTodas.textContent=todas?'Solo las de tu espacio':'Ver todas ('+apagadas+' más)'}
  $('#ayCuenta',barra).textContent=t?(n?n+(n===1?' herramienta coincide.':' herramientas coinciden.'):'Nada coincide. Prueba con otra palabra o busca en todo OneBook con Ctrl K.'):'';
}
q.addEventListener('input',filtrar);
if(bTodas)bTodas.addEventListener('click',function(){todas=!todas;filtrar()});
filtrar();
if(pedida){var h=document.getElementById(pedida.id);if(h)setTimeout(function(){h.scrollIntoView({block:'start'})},0)}

/* ---------- Crear la página de una herramienta ---------- */
page.addEventListener('click',function(e){
  var b=e.target.closest('[data-crear]');if(!b||b.getAttribute('aria-disabled')==='true')return;
  b.setAttribute('aria-disabled','true');
  AT.crear.nuevo(b.getAttribute('data-crear')).catch(function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo crear la página. Inténtalo otra vez.')});
});
AT.ayuda={secciones:function(){return secs.map(function(s){return {id:s.id,mod:s.mod,visible:!s.el.hidden}})},filtrar:function(t){q.value=t;filtrar()}};
})();
