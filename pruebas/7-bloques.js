/* Hito 2.1: formato de bloques. Las lecciones se dibujan desde su JSON con el mismo código que dibujará
   los documentos propios; los laboratorios son bloques especiales y el dibujo no ejecuta código del documento. */
'use strict';
const {prueba,pagina,cerrar,listo,revisar}=require('./lib');

prueba('Hito 2.1 · Formato de bloques',async function({browser,base,r}){
  for(const lid of ['ram','cpu','almacenamiento','gpu']){
    const p=await pagina(browser);
    await p.goto(base+'lecciones/'+lid+'.html');await listo(p);
    const d=await p.evaluate(function(){
      const doc=AT.documento,page=document.querySelector('.page');
      const ids=doc.contenido.content.map(function(b){return b.attrs&&b.attrs.id});
      const unicos=new Set(ids);
      return {
        formato:doc.formato,tipo:doc.tipo,id:doc.id,
        todosConId:ids.every(Boolean),unicos:unicos.size===ids.length,
        enPagina:ids.filter(function(id){const e=document.getElementById(id);return e&&e.hasAttribute('data-b')&&page.contains(e)}).length,total:ids.length,
        h1:page.querySelector('h1').textContent,props:page.querySelectorAll('.props>div').length,
        toc:Array.from(page.querySelectorAll('.toc [data-go]')).map(function(b){return b.dataset.go}),
        secciones:AT.bloques.secciones(doc).map(function(s){return s.id}),
        labsDoc:doc.contenido.content.filter(function(b){return b.type==='laboratorio'}).length,
        preguntasDoc:(doc.contenido.content.filter(function(b){return b.type==='repaso'})[0]||{attrs:{preguntas:[]}}).attrs.preguntas.length,
        labs:page.querySelectorAll('.demo').length,labsVivos:Array.from(page.querySelectorAll('.demo-b')).filter(function(b){return b.children.length>1}).length,
        preguntas:page.querySelectorAll('#qz .q').length,
        resumen:!!page.querySelector('.resumen h2:not([id])'),
        siguiente:page.lastElementChild.className
      };
    });
    r.cumple(d.formato===1&&d.tipo==='leccion'&&d.id===lid,lid+': el documento declara formato, tipo e id',d);
    r.cumple(d.todosConId&&d.unicos,lid+': cada bloque tiene un identificador propio');
    r.igual(d.enPagina,d.total,lid+': cada bloque se dibuja con su identificador como ancla');
    r.cumple(d.props===4&&d.h1.length>3,lid+': título y ficha de la lección',d);
    r.igual(d.toc.join(','),d.secciones.join(','),lid+': el índice lista las secciones del documento');
    r.cumple(d.labsDoc>=4&&d.labs===d.labsDoc&&d.labsVivos===d.labsDoc,lid+': los '+d.labsDoc+' laboratorios se dibujan y arrancan',d);
    r.cumple(d.preguntasDoc>=4&&d.preguntas===d.preguntasDoc,lid+': el repaso tiene sus '+d.preguntasDoc+' preguntas',d);
    r.cumple(d.resumen,lid+': el resumen no cuenta como sección');
    r.igual(d.siguiente,'next',lid+': el enlace a la siguiente lección queda al final');
    /* El índice lleva a su sección */
    await p.click('.toc [data-go="'+d.secciones[2]+'"]');await p.waitForTimeout(900);
    const top=await p.evaluate(function(id){return Math.round(document.getElementById(id).getBoundingClientRect().top)},d.secciones[2]);
    r.cumple(top>=0&&top<120,lid+': el índice lleva a la sección',top);
    /* El repaso responde y avisa al avance */
    await p.click('#qz .q:nth-child(1) .qo:nth-child(2)');
    r.cumple(await p.evaluate(function(){return document.querySelector('#qz .q .expl').hidden===false}),lid+': responder muestra la explicación');
    r.cumple(p.errores.length===0,lid+': sin errores',p.errores);
    await cerrar(p);
  }

  /* Un laboratorio por dentro: el de RAM responde a los clics como antes */
  const p=await pagina(browser);
  await p.goto(base+'lecciones/ram.html');await listo(p);
  await p.click('#capSeg [data-cap="4"]');
  r.cumple(/Falta memoria/.test(await p.textContent('#mpill')),'el laboratorio «Llena tu RAM» reacciona');
  await p.click('#readBtn');await p.waitForTimeout(200);
  r.cumple((await p.textContent('#steps')).length>10,'el laboratorio «Leer una dirección» reacciona');

  /* Dibujar un documento con todos los tipos de bloque, y con datos peligrosos */
  const res=await p.evaluate(function(){
    const T=function(t,m){const o={type:'text',text:t};if(m)o.marks=m;return o};
    const P=function(){return {type:'paragraph',content:[].slice.call(arguments)}};
    window.__hackeado=false;
    const doc={formato:1,tipo:'libreta',id:'d-prueba',titulo:'Prueba <img src=x onerror="__hackeado=true">',icono:'page',
      props:[{nombre:'Materia',valor:'Física',estilo:'azul'},{nombre:'Fecha',valor:'hoy',estilo:'texto'}],
      contenido:{type:'doc',content:[
        {type:'heading',attrs:{id:'b-uno',level:2},content:[T('Primera')]},
        {type:'paragraph',attrs:{id:'b-p'},content:[T('negrita',[{type:'bold'}]),T(' '),T('enlace',[{type:'link',attrs:{href:'javascript:__hackeado=true'}}]),T(' '),T('web',[{type:'link',attrs:{href:'https://example.com'}}]),{type:'hardBreak'},T('<b>no es html</b>')]},
        {type:'callout',attrs:{id:'b-c',variante:'aviso'},content:[P(T('Cuidado'))]},
        {type:'taskList',attrs:{id:'b-t'},content:[{type:'taskItem',attrs:{checked:true},content:[P(T('hecha'))]},{type:'taskItem',attrs:{checked:false},content:[P(T('pendiente'))]}]},
        {type:'codeBlock',attrs:{id:'b-code'},content:[T('<script>__hackeado=true</script>')]},
        {type:'blockquote',attrs:{id:'b-q'},content:[P(T('cita'))]},
        {type:'table',attrs:{id:'b-tab'},content:[{type:'tableRow',content:[{type:'tableHeader',content:[P(T('A'))]},{type:'tableHeader',content:[P(T('B'))]}]},{type:'tableRow',content:[{type:'tableCell',content:[P(T('1'))]},{type:'tableCell',attrs:{colspan:1},content:[P(T('2'))]}]}]},
        {type:'desplegable',attrs:{id:'b-d'},content:[{type:'desplegableTitulo',content:[T('¿Pregunta?')]},{type:'desplegableCuerpo',content:[P(T('Respuesta'))]}]},
        {type:'columnas',attrs:{id:'b-col'},content:[{type:'columna',content:[P(T('Uno',[{type:'bold'}])),P(T('texto'))]},{type:'columna',content:[P(T('Dos'))]}]},
        {type:'laboratorio',attrs:{id:'b-lab',nombre:'no-existe',titulo:'Lab ajeno'}},
        {type:'repaso',attrs:{id:'b-rep',preguntas:[{q:'¿2+2?',o:['4','5'],a:0,e:'Suma.'}]}},
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
      lab:q('#b-lab .demo-b').textContent,rep:host.querySelectorAll('#b-rep .q').length,
      desconocido:!!q('#b-x'),props:q('.props').textContent,idRaro:!!host.querySelector('[id^="javascript"]'),
      palabras:AT.bloques.palabras(doc),valido:AT.bloques.valido(doc),invalido:AT.bloques.valido({id:'x'}),
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
  r.cumple(res.det==='¿Pregunta?'&&res.cols===2&&res.rep===1,'desplegables, columnas y repaso se dibujan',res);
  r.cumple(/solo funciona dentro de su lección/.test(res.lab),'un laboratorio que no está en la página muestra un aviso');
  r.cumple(!res.desconocido,'un tipo de bloque desconocido se ignora sin romper la página');
  r.cumple(!res.idRaro,'un identificador con caracteres raros no se usa como ancla');
  r.cumple(/Materia/.test(res.props)&&/Física/.test(res.props),'las propiedades del documento se muestran');
  r.cumple(res.palabras>15&&res.valido&&!res.invalido,'conteo de palabras y validación del formato',res);
  r.cumple(p.errores.length===0,'sin errores al dibujar el documento de prueba',p.errores);
  await cerrar(p);

  /* Las lecciones nuevas en varios tamaños y modos */
  for(const lid of ['ram','cpu'])for(const [ancho,escala,fuente,tema,contraste] of [[390,1.5,'opendyslexic','dark','high'],[1280,1,'normal','light','normal'],[1600,1.3,'atkinson','light','high']]){
    const s=await pagina(browser,{ancho:ancho,ajustes:{escala:escala,fuente:fuente,tema:tema,contraste:contraste}});
    await s.goto(base+'lecciones/'+lid+'.html');await listo(s);
    await s.evaluate(function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});
    await revisar(s,r,lid+' '+ancho+'px ×'+escala+' '+fuente+' '+tema+'/'+contraste);
    await cerrar(s);
  }
});
