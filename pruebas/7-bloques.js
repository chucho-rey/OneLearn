/* Hito 2.1: formato de bloques. La Ayuda y tus páginas se dibujan desde su JSON con el mismo código (bloques.js);
   el dibujo no ejecuta código del documento, y un tipo de bloque desconocido se ignora sin romper la página. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Hito 2.1 · Formato de bloques',async function({browser,base,r}){
  /* La Ayuda: un documento en el formato de bloques */
  const p=await pagina(browser);
  await p.goto(base+'ayuda.html');await listo(p);
  const d=await p.evaluate(function(){
    const doc=AT.documento,page=document.querySelector('.page');
    const ids=doc.contenido.content.map(function(b){return b.attrs&&b.attrs.id});
    return {
      formato:doc.formato,tipo:doc.tipo,id:doc.id,
      todosConId:ids.every(Boolean),unicos:new Set(ids).size===ids.length,
      enPagina:ids.filter(function(id){const e=document.getElementById(id);return e&&e.hasAttribute('data-b')&&page.contains(e)}).length,total:ids.length,
      h1:page.querySelector('h1').textContent,
      toc:Array.from(page.querySelectorAll('.toc [data-go]')).map(function(b){return b.dataset.go}),
      secciones:AT.bloques.secciones(doc).map(function(s){return s.id})
    };
  });
  r.cumple(d.formato===1&&d.tipo==='pagina'&&d.id==='ayuda','la Ayuda declara formato, tipo e id',d);
  r.cumple(d.todosConId&&d.unicos,'cada bloque de la Ayuda tiene un identificador propio');
  r.igual(d.enPagina,d.total,'cada bloque se dibuja con su identificador como ancla');
  r.igual(d.h1,'Ayuda: cómo usar OneBook','el título se dibuja');
  r.igual(d.toc.join(','),d.secciones.join(','),'el índice lista las secciones del documento');
  await p.click('.toc [data-go="'+d.secciones[2]+'"]');await p.waitForTimeout(900);
  const top=await p.evaluate(function(id){return Math.round(document.getElementById(id).getBoundingClientRect().top)},d.secciones[2]);
  r.cumple(top>=0&&top<120,'el índice lleva a la sección',top);
  r.cumple(p.errores.length===0,'la Ayuda, sin errores',p.errores);

  /* Dibujar un documento con todos los tipos de bloque, con datos peligrosos y con un tipo desconocido */
  const res=await p.evaluate(function(){
    const T=function(t,m){const o={type:'text',text:t};if(m)o.marks=m;return o};
    const P=function(){return {type:'paragraph',content:[].slice.call(arguments)}};
    window.__hackeado=false;
    const doc={formato:1,tipo:'notas',id:'d-prueba',titulo:'Prueba <img src=x onerror="__hackeado=true">',icono:'page',
      props:[{nombre:'Área',valor:'Ventas',estilo:'azul'},{nombre:'Fecha',valor:'hoy',estilo:'texto'}],
      contenido:{type:'doc',content:[
        {type:'heading',attrs:{id:'b-uno',level:2},content:[T('Primera')]},
        {type:'paragraph',attrs:{id:'b-p'},content:[T('negrita',[{type:'bold'}]),T(' '),T('enlace',[{type:'link',attrs:{href:'javascript:__hackeado=true'}}]),T(' '),T('web',[{type:'link',attrs:{href:'https://example.com'}}]),
          {type:'hardBreak'},T('<b>no es html</b>'),T(' '),{type:'cita',attrs:{href:'documento.html?id=d-otra',texto:'Otra página'}}]},
        {type:'callout',attrs:{id:'b-c',variante:'aviso'},content:[P(T('Cuidado'))]},
        {type:'taskList',attrs:{id:'b-t'},content:[{type:'taskItem',attrs:{checked:true},content:[P(T('hecha'))]},{type:'taskItem',attrs:{checked:false},content:[P(T('pendiente'))]}]},
        {type:'codeBlock',attrs:{id:'b-code'},content:[T('<script>__hackeado=true</script>')]},
        {type:'blockquote',attrs:{id:'b-q'},content:[P(T('cita'))]},
        {type:'table',attrs:{id:'b-tab'},content:[{type:'tableRow',content:[{type:'tableHeader',content:[P(T('A'))]},{type:'tableHeader',content:[P(T('B'))]}]},{type:'tableRow',content:[{type:'tableCell',content:[P(T('1'))]},{type:'tableCell',content:[P(T('2'))]}]}]},
        {type:'desplegable',attrs:{id:'b-d'},content:[{type:'desplegableTitulo',content:[T('¿Pregunta?')]},{type:'desplegableCuerpo',content:[P(T('Respuesta'))]}]},
        {type:'columnas',attrs:{id:'b-col'},content:[{type:'columna',content:[P(T('Uno',[{type:'bold'}])),P(T('texto'))]},{type:'columna',content:[P(T('Dos'))]}]},
        {type:'bloque-desconocido',attrs:{id:'b-x'}},
        {type:'resumen',attrs:{id:'b-res'},content:[{type:'bulletList',content:[{type:'listItem',content:[P(T('idea'))]}]}]},
        {type:'paragraph',attrs:{id:'javascript:mal'},content:[T('id raro')]}
      ]}};
    const host=document.createElement('div');host.className='page prueba';document.body.appendChild(host);
    AT.bloques.dibujar(doc,host);
    const q=function(s){return host.querySelector(s)};
    return {
      titulo:q('h1').textContent,img:!!host.querySelector('img'),
      enlaces:Array.from(host.querySelectorAll('a')).map(function(a){return a.getAttribute('href')}),
      externo:q('a[href^="https"]').target,
      textoHtml:!!q('#b-p b b'),texto:q('#b-p').textContent,br:!!q('#b-p br'),
      aviso:q('#b-c').className,tareas:host.querySelectorAll('li.tarea.hecha').length+'/'+host.querySelectorAll('li.tarea').length,
      codigo:q('#b-code code').textContent,scripts:host.querySelectorAll('script').length,
      thead:host.querySelectorAll('#b-tab thead th').length,tbody:host.querySelectorAll('#b-tab tbody td').length,
      det:q('#b-d summary span').textContent,cols:host.querySelectorAll('#b-col>div').length,
      citaRam:q('#b-p .cita')&&q('#b-p .cita').tagName,
      desconocido:!!q('#b-x'),props:q('.props').textContent,idRaro:!!host.querySelector('[id^="javascript"]'),
      palabras:AT.bloques.palabras(doc),texto2:AT.bloques.texto(doc),valido:AT.bloques.valido(doc),invalido:AT.bloques.valido({id:'x'}),
      hackeado:window.__hackeado
    };
  });
  await p.waitForTimeout(200);
  r.cumple(!res.img&&res.titulo.indexOf('<img')>0,'el título se muestra como texto, no como HTML',res.titulo);
  r.cumple(res.enlaces.indexOf('javascript:__hackeado=true')<0&&res.enlaces.indexOf('https://example.com')>=0,'los enlaces javascript: se descartan y los web se conservan',res.enlaces);
  r.igual(res.externo,'_blank','los enlaces web se abren en otra pestaña');
  r.cumple(!res.textoHtml&&res.texto.indexOf('<b>no es html</b>')>0&&res.br,'el texto nunca se interpreta como HTML',res.texto);
  r.cumple(res.scripts===0&&!(await p.evaluate(function(){return window.__hackeado})),'el documento no puede ejecutar código');
  r.igual(res.aviso,'callout aviso','los callouts tienen variantes');
  r.igual(res.tareas,'1/2','las listas de tareas marcan las hechas');
  r.cumple(res.thead===2&&res.tbody===2,'la primera fila de títulos va en el encabezado de la tabla',res);
  r.cumple(res.det==='¿Pregunta?'&&res.cols===2,'desplegables y columnas se dibujan',res);
  r.igual(res.citaRam,'A','una cita a otra página es un enlace');
  r.cumple(!res.desconocido,'un tipo de bloque desconocido se ignora sin romper la página');
  r.cumple(!res.idRaro,'un identificador con caracteres raros no se usa como ancla');
  r.cumple(/Área/.test(res.props)&&/Ventas/.test(res.props),'las propiedades del documento se muestran');
  r.cumple(res.palabras>15&&res.valido&&!res.invalido,'conteo de palabras y validación del formato',res);
  r.cumple(p.errores.length===0,'sin errores al dibujar el documento de prueba',p.errores);
  await cerrar(p);

  /* La Ayuda en varios tamaños y modos */
  for(const [ancho,escala,fuente,tema,contraste] of [[390,1.5,'opendyslexic','dark','high'],[1280,1,'normal','light','normal'],[1600,1.3,'atkinson','light','high']]){
    const s=await pagina(browser,{ancho:ancho,ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste}});
    await s.goto(base+'ayuda.html');await listo(s);
    await s.evaluate(function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});
    await revisar(s,r,'ayuda '+ancho+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste);
    await cerrar(s);
  }
});
