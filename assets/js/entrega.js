/* OneBook: entregar un documento (fase de tesis, hito T4).
   - Formato de entrega (doc.formato): estilo de citas (APA 7 o IEEE), papel, letra, interlineado y margen izquierdo.
     La plantilla es la genérica de APA: márgenes de 2.54 cm, letra de 12 puntos, interlineado doble, sangría en
     la primera línea de cada párrafo, número de página arriba a la derecha y cada capítulo en una página nueva.
   - partes(doc): portada (de las propiedades), preliminares (índices, declaración, resumen…; números romanos)
     y cuerpo (desde la introducción o el primer capítulo; números arábigos). Lo usan el PDF y el DOCX.
   - revisar(doc): lo que conviene arreglar antes de entregar (sin declaración, pegados sin origen, figuras sin nota,
     citas rotas, capítulos vacíos, datos de la portada…).
   - registrar(doc, formato): anota la entrega en el registro de autoría con la huella del texto, para que la
     constancia diga qué versión entregaste.
   - dialogo(doc, op): la ventana «Entregar».
   Se carga en documento.html (después de autoria.js) y en imprimir.html. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;

var DEF={estilo:'apa',papel:'carta',letra:'times',interlineado:'2',margen:'normal'};
var OPCIONES={
  estilo:[['apa','APA 7'],['ieee','IEEE']],
  papel:[['carta','Carta'],['a4','A4']],
  letra:[['times','Times New Roman'],['arial','Arial']],
  interlineado:[['2','Doble (APA)'],['1.5','1.5']],
  margen:[['normal','2.54 cm'],['encuadernar','4 cm (para encuadernar)']]
};
function academico(doc){var t=AT.tiposDoc&&doc&&AT.tiposDoc[doc.tipo];return !!(t&&t.academico)}
function formato(doc){
  var f=Object.assign({},DEF,doc&&doc.formato||{});
  Object.keys(OPCIONES).forEach(function(k){if(!OPCIONES[k].some(function(o){return o[0]===f[k]}))f[k]=DEF[k]});
  return f;
}
function sinAcentos(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()}
function textoDe(n){return AT.bloques.textoDe(n).replace(/\s+/g,' ').trim()}

/* ---------- Portada: de las propiedades del documento ---------- */
var CAMPOS={autor:/^autor|^autora|^sustentante|^presenta/,universidad:/^universidad|^institucion/,facultad:/^facultad|^escuela|^division/,
  programa:/^programa|^grado|^carrera|^titulo a obtener/,asesor:/^asesor|^director|^directora/,lugar:/^lugar|^ciudad/,anio:/^ano$|^anio$|^fecha/};
function portada(doc){
  var p={titulo:String(doc.titulo||'Sin título').trim()};
  (doc.props||[]).forEach(function(x){
    var n=sinAcentos(x.nombre).replace(/\(a\)$/,''),v=String(x.valor||'').trim();
    if(!v)return;
    Object.keys(CAMPOS).forEach(function(k){if(!p[k]&&CAMPOS[k].test(n))p[k]=v});
  });
  return p;
}

/* ---------- Preliminares y cuerpo ---------- */
var PRELIM=/^(resumen|abstract|agradecimiento|dedicatoria|prologo|prefacio|indice|lista de|declaracion|glosario|abreviatura|siglas|acronimos|epigrafe)/;
function partes(doc){
  var b=(doc.contenido&&doc.contenido.content)||[],aca=academico(doc),inicio=0;
  if(aca){
    inicio=-1;
    for(var i=0;i<b.length;i++){
      if(b[i].type==='heading'&&(b[i].attrs||{}).level===2&&!PRELIM.test(sinAcentos(textoDe(b[i])))){inicio=i;break}
    }
    if(inicio<0){
      /* Sin capítulos: solo los índices y la declaración del principio son preliminares */
      inicio=0;
      while(inicio<b.length&&/^(indice|indicePiezas|declaracion)$/.test(b[inicio].type))inicio++;
    }
  }
  return {academico:aca,portada:aca?portada(doc):null,preliminares:b.slice(0,inicio),cuerpo:b.slice(inicio),formato:formato(doc)};
}

/* ---------- Antes de entregar ---------- */
function revisar(doc){
  var av=[],c=doc.contenido||{},b=c.content||[],fuentes=doc.fuentes||[];
  if(!academico(doc))return av;
  var hay={declaracion:false,bibliografia:false},rotas=0,citas=0;
  var ids={};fuentes.forEach(function(f){ids[f.id]=true});
  (function rec(n){
    if(!n||typeof n!=='object')return;
    if(n.type==='declaracion')hay.declaracion=true;
    if(n.type==='bibliografia')hay.bibliografia=true;
    if(n.type==='referencia'){citas++;if(!ids[(n.attrs||{}).fuente])rotas++}
    (n.content||[]).forEach(rec);
  })(c);
  if(!hay.declaracion)av.push('Falta la «Declaración de autoría». Insértala con «/declaración».');
  if(AT.autoria){
    var r=AT.autoria.resumen(doc);
    if(r.sinOrigen)av.push(r.sinOrigen===1?'Un texto pegado no tiene origen. Indícalo en «Autoría».':r.sinOrigen+' textos pegados no tienen origen. Indícalos en «Autoría».');
  }
  if(AT.piezas){
    var pz=AT.piezas.numerar(c),sinNota=pz.lista.filter(function(x){return x.clase==='figura'&&!x.nota}).length;
    if(sinNota)av.push(sinNota===1?'Una figura no tiene nota de origen.':sinNota+' figuras no tienen nota de origen.');
    var rotasX=0;
    (function rec(n){if(!n||typeof n!=='object')return;if(n.type==='refCruzada'&&!pz.por[(n.attrs||{}).destino])rotasX++;(n.content||[]).forEach(rec)})(c);
    if(rotasX)av.push(rotasX===1?'Una referencia cruzada apunta a algo que ya no existe.':rotasX+' referencias cruzadas apuntan a algo que ya no existe.');
  }
  if(rotas)av.push(rotas===1?'Una cita es de una fuente que borraste.':rotas+' citas son de fuentes que borraste.');
  if(citas&&!hay.bibliografia)av.push('Hay citas pero falta el bloque «Bibliografía».');
  /* Capítulos sin texto (por ejemplo, los de la plantilla que no se usaron) */
  var vacias=[];
  b.forEach(function(n,i){
    if(n.type!=='heading'||(n.attrs||{}).level!==2)return;
    var j=i+1,algo=false;
    while(j<b.length&&!(b[j].type==='heading'&&(b[j].attrs||{}).level===2)){if(b[j].type!=='paragraph'||textoDe(b[j]))algo=true;j++}
    if(!algo)vacias.push(textoDe(n)||'Sin título');
  });
  if(vacias.length)av.push((vacias.length===1?'Una sección está vacía: ':vacias.length+' secciones están vacías: ')+vacias.slice(0,4).map(function(t){return '«'+t+'»'}).join(', ')+(vacias.length>4?' y '+(vacias.length-4)+' más.':'.'));
  var p=portada(doc),faltan=[['autor','Autor(a)'],['universidad','Universidad'],['programa','Programa'],['asesor','Asesor(a)']].filter(function(x){return !p[x[0]]}).map(function(x){return x[1]});
  if(faltan.length)av.push('La portada no tiene: '+faltan.join(', ')+'. Llena esas propiedades arriba del documento.');
  return av;
}

/* ---------- La entrega queda en el registro de autoría ---------- */
function registrar(doc,cual){
  if(!AT.autoria||!academico(doc))return Promise.resolve(null);
  return AT.autoria.huella(AT.autoria.contenidoHuella(doc)).then(function(h){
    var a=doc.autoria||(doc.autoria={v:1,sesiones:[],pegados:[]});
    if(!Array.isArray(a.entregas))a.entregas=[];
    var e={t:Date.now(),f:cual,h:h,w:AT.bloques.palabras(doc)};
    a.entregas.push(e);
    return e;
  });
}

/* ---------- Ventana «Entregar» ---------- */
function dialogo(doc,op){
  op=op||{};
  var d=document.createElement('dialog'),volver=document.activeElement,aca=academico(doc);
  d.className='atajos en-dlg';d.setAttribute('aria-labelledby','enT');
  document.body.appendChild(d);
  function campo(k,titulo){
    var f=formato(doc);
    return '<div class="en-c"><span class="en-l" id="enL-'+k+'">'+titulo+'</span><div class="en-seg" role="radiogroup" aria-labelledby="enL-'+k+'">'+
      OPCIONES[k].map(function(o){return '<label class="en-o"><input type="radio" name="en-'+k+'" value="'+o[0]+'"'+(f[k]===o[0]?' checked':'')+'><span>'+esc(o[1])+'</span></label>'}).join('')+'</div></div>';
  }
  function pintar(msg){
    var av=revisar(doc);
    d.innerHTML='<div class="at-h"><h2 id="enT">'+(aca?'Entregar tu tesis':'Imprimir o guardar como PDF')+'</h2><button class="lec-x" type="button" data-en="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
      (aca?'<p class="td-p">Plantilla genérica en APA: portada, preliminares con números romanos, capítulos con números arábigos y cada capítulo en una página nueva.</p>'+
        '<fieldset class="en-f"><legend>Formato</legend>'+campo('estilo','Citas')+campo('papel','Papel')+campo('letra','Letra (12 puntos)')+campo('interlineado','Interlineado')+campo('margen','Margen izquierdo')+'</fieldset>'+
        '<div class="en-rev" role="region" aria-labelledby="enRevT"><h3 id="enRevT">Antes de entregar</h3>'+
          (av.length?'<ul class="en-av">'+av.map(function(x){return '<li>'+ico('aviso')+'<span>'+esc(x)+'</span></li>'}).join('')+'</ul>':
            '<p class="td-p td-ok">'+ico('escudo')+'<span>Todo en orden: declaración, orígenes, citas y portada.</span></p>')+'</div>'
        :'<p class="td-p">Una vista lista para imprimir, con números de página. En la ventana de impresión elige «Guardar como PDF».</p>')+
      '<div class="td-bt en-bt"><button class="btn pri" type="button" data-en="pdf">'+ico('page')+'PDF: vista para imprimir</button>'+
      (aca?'<button class="btn" type="button" data-en="docx">'+ico('descargar')+'Descargar Word (DOCX)</button>':'')+'</div>'+
      (aca?'<p class="td-p en-nota">Cada vez que exportas, tu registro de autoría anota la fecha y la huella del texto: la constancia dirá qué versión entregaste.</p>':'')+
      '<p class="td-msg" role="status">'+esc(msg||'')+'</p>';
  }
  d.addEventListener('change',function(e){
    var r=e.target;if(!r.name||r.name.indexOf('en-')!==0)return;
    var k=r.name.slice(3);
    doc.formato=Object.assign(formato(doc),doc.formato||{});doc.formato[k]=r.value;
    if(op.alCambiar)op.alCambiar(k);
  });
  d.addEventListener('click',function(e){
    if(e.target===d){d.close();return}
    var b=e.target.closest('[data-en]');if(!b)return;
    var a=b.getAttribute('data-en');
    if(a==='cerrar'){d.close();return}
    if(a==='pdf'){if(op.alPdf)op.alPdf();return}
    if(a==='docx'&&op.alDocx){
      b.setAttribute('aria-disabled','true');
      var m=$('.td-msg',d);m.textContent='Preparando el archivo de Word…';m.classList.remove('err');
      op.alDocx().then(function(nombre){b.removeAttribute('aria-disabled');m.textContent='Listo: se descargó «'+nombre+'». Al abrirlo, Word te pedirá actualizar los índices: acepta.'},
        function(err){b.removeAttribute('aria-disabled');m.textContent='No se pudo crear el archivo: '+(err&&err.message||'inténtalo otra vez')+'.';m.classList.add('err')});
    }
  });
  d.addEventListener('close',function(){d.remove();if(volver&&volver.focus)volver.focus({preventScroll:true})});
  pintar();d.showModal();
  var f=$('input[type="radio"]:checked',d)||$('[data-en="pdf"]',d);if(f)f.focus();
  return d;
}

AT.entrega={DEF:DEF,OPCIONES:OPCIONES,formato:formato,portada:portada,partes:partes,revisar:revisar,registrar:registrar,dialogo:dialogo,academico:academico};
})();
