/* OneLearn: registro de autoría de un documento académico (por ahora, la tesis).
   Mientras escribes, anota en doc.autoria cómo se hizo el texto, sin guardar nunca las teclas:
     {v:1, sesiones:[{i, f, e, b, p}], pegados:[{t, n, m, o, f}]}
   Una sesión (i y f en milisegundos) junta lo tecleado (e), borrado (b) y pegado (p), en caracteres; se abre otra
   después de 20 minutos sin escribir. Cada texto pegado de 40 caracteres o más queda en «pegados», con una muestra
   (m) y su origen (o: 'propio', 'fuente' o 'ia'; vacío si no se ha dicho). Al pegar un texto largo, una barra
   pregunta de dónde viene y, si es de una fuente, ayuda a citarla.
   - AT.autoria.extension(doc, op) → {extension, activar}: la extensión de Tiptap que lleva el registro.
   - AT.autoria.panel(doc, op): la ventana «Autoría», con el resumen y la constancia descargable.
   Se carga en documento.html, después de editor.js y fuentes.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,fmt=AT.fmt;
var PAUSA=20*60*1000,MIN_LISTA=40,MIN_PREGUNTA=150;
var ORIGEN={'':'Sin indicar',propio:'Lo escribí yo',fuente:'De una fuente',ia:'De una IA'};

function datos(doc){
  var a=doc.autoria;
  if(!a||typeof a!=='object')a=doc.autoria={v:1,sesiones:[],pegados:[]};
  if(!Array.isArray(a.sesiones))a.sesiones=[];
  if(!Array.isArray(a.pegados))a.pegados=[];
  return a;
}
function registrar(doc,e,b,p){
  if(!e&&!b&&!p)return;
  var a=datos(doc),ahora=Date.now(),u=a.sesiones[a.sesiones.length-1];
  if(!u||ahora-u.f>PAUSA){u={i:ahora,f:ahora,e:0,b:0,p:0};a.sesiones.push(u)}
  u.f=ahora;u.e+=e;u.b+=b;u.p+=p;
}
function palabras(c){return Math.round((c||0)/6)}
function aprox(c){var w=palabras(c);return w===1?'1 palabra':'unas '+fmt(w)+' palabras'}

/* ---------- La extensión del editor ---------- */
function extension(doc,op){
  op=op||{};
  var T=window.Tiptap,pm=T.pm,ctl={activo:false};
  var ext=T.Extension.create({
    name:'autoria',
    addProseMirrorPlugins:function(){
      return [new pm.Plugin({key:new pm.PluginKey('autoria'),appendTransaction:function(trs){
        if(!ctl.activo)return null;
        trs.forEach(function(tr){
          /* Lo que no es escribir: cargar el documento, deshacer y rehacer */
          if(!tr.docChanged||tr.getMeta('addToHistory')===false||tr.getMeta('history$'))return;
          var ui=tr.getMeta('uiEvent'),pegar=ui==='paste'||ui==='drop',ins=0,del=0,desde=null,hasta=null;
          tr.steps.forEach(function(st,i){
            var antes=tr.docs[i],despues=i+1<tr.docs.length?tr.docs[i+1]:tr.doc;
            st.getMap().forEach(function(oS,oE,nS,nE){
              if(oE>oS)del+=antes.textBetween(oS,oE,'\n','\n').length;
              if(nE>nS){ins+=despues.textBetween(nS,nE,'\n','\n').length;if(desde==null)desde=nS;hasta=nE}
            });
          });
          if(!pegar){registrar(doc,ins,del,0);return}
          registrar(doc,0,del,ins);
          if(ins<MIN_LISTA)return;
          var fin=Math.min(hasta,tr.doc.content.size),muestra=tr.doc.textBetween(Math.min(desde,fin),fin,' ',' ').replace(/\s+/g,' ').trim();
          var p={t:Date.now(),n:ins,m:muestra.length>80?muestra.slice(0,80)+'…':muestra,o:''};
          datos(doc).pegados.push(p);
          if(ins>=MIN_PREGUNTA&&op.preguntar!==false)setTimeout(function(){preguntar(doc,p,op)},0);
        });
        return null;
      }})];
    }
  });
  return {extension:ext,activar:function(){ctl.activo=true},desactivar:function(){ctl.activo=false;quitarBarra()}};
}

/* ---------- «¿De dónde viene lo que pegaste?» ---------- */
var barra=null;
function quitarBarra(){if(barra){barra.remove();barra=null}}
function preguntar(doc,p,op){
  quitarBarra();
  var b=barra=document.createElement('div');
  b.className='au-bar';b.setAttribute('role','region');b.setAttribute('aria-label','Origen del texto pegado');
  b.innerHTML='<p role="status">Pegaste '+aprox(p.n)+'. ¿De dónde vienen?</p>'+
    '<div class="au-ops"><button class="btn" type="button" data-o="propio">Las escribí yo</button>'+
    '<button class="btn" type="button" data-o="fuente">De una fuente: citarla</button>'+
    '<button class="btn" type="button" data-o="ia">De una IA</button>'+
    '<button class="aviso-x" type="button" data-o="" aria-label="Contestar después (queda en Autoría)" title="Contestar después">'+ico('close')+'</button></div>';
  document.body.appendChild(b);
  b.addEventListener('click',function(e){
    var x=e.target.closest('[data-o]');if(!x)return;
    var o=x.getAttribute('data-o'),ed=op.editor&&op.editor();
    quitarBarra();
    if(!o){if(ed)ed.commands.focus();return}
    p.o=o;
    if(op.alCambiar)op.alCambiar();
    if(o==='fuente'&&AT.fuentes){
      AT.fuentes.dialogo({doc:doc,alCambiar:op.alCambiar,alElegir:function(f,pagina,narrativa){
        p.f=f.id;
        if(ed)ed.chain().focus().insertContent([{type:'text',text:' '},{type:'referencia',attrs:{fuente:f.id,pagina:pagina||'',narrativa:!!narrativa}}]).run();
        if(op.alCambiar)op.alCambiar();
      }});
      return;
    }
    if(o==='ia')AT.aviso('Anotado. Decláralo en la «Declaración de autoría» y, si lo citas, agrega la conversación en «Fuentes».');
    if(ed)ed.commands.focus();
  });
}

/* ---------- Resumen ---------- */
function resumen(doc){
  var a=datos(doc),r={segundos:0,sesiones:a.sesiones.length,e:0,b:0,p:0,dias:[],pegados:a.pegados,sinOrigen:0};
  var dias={};
  a.sesiones.forEach(function(s){
    r.segundos+=Math.max(60,(s.f-s.i)/1000);r.e+=s.e;r.b+=s.b;r.p+=s.p;
    var d=new Date(s.i),k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    if(!dias[k]){dias[k]={fecha:d,e:0,p:0,segundos:0};r.dias.push(dias[k])}
    dias[k].e+=s.e;dias[k].p+=s.p;dias[k].segundos+=Math.max(60,(s.f-s.i)/1000);
  });
  r.sinOrigen=a.pegados.filter(function(p){return !p.o}).length;
  r.pct=r.e+r.p?Math.round(r.p/(r.e+r.p)*100):0;
  return r;
}
function duracion(seg){
  var m=Math.round(seg/60);
  if(m<60)return m+' min';
  return Math.floor(m/60)+' h '+(m%60?m%60+' min':'');
}
function fechaCorta(d){return d.toLocaleDateString('es-MX',{day:'numeric',month:'short'})}
function fechaHora(t){return new Date(t).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function declaraciones(doc){
  var out=[];
  (function rec(n){if(!n)return;if(n.type==='declaracion')out.push(n.attrs||{});(n.content||[]).forEach(rec)})(doc.contenido);
  return out;
}
function estadoDeclaracion(doc){
  var d=declaraciones(doc)[0];
  if(!d)return 'Falta la «Declaración de autoría». Insértala con «/» o con el menú «Insertar».';
  if(d.ia==='si'){
    var u=(d.usos||[]).filter(function(x){return x.herramienta});
    return u.length?'Declaraste que usaste IA: '+u.map(function(x){return x.herramienta}).join(', ')+'.':'Declaraste que usaste IA, pero falta decir cuál y para qué.';
  }
  return 'Declaraste que no usaste IA generativa.';
}

/* ---------- Ventana «Autoría» ---------- */
function panel(doc,op){
  op=op||{};
  var d=document.createElement('dialog'),volver=document.activeElement;
  d.className='atajos au-dlg';d.setAttribute('aria-labelledby','auT');
  document.body.appendChild(d);
  function pintar(){
    var r=resumen(doc),max=Math.max.apply(null,r.dias.map(function(x){return x.e+x.p}).concat([1]));
    var h='<div class="at-h"><h2 id="auT">Autoría</h2><button class="lec-x" type="button" data-au="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
      '<p class="td-p">Cómo escribiste este documento. Se guardan solo números y fechas (nunca tus teclas), en este dispositivo y en tu respaldo.</p>';
    if(!r.sesiones){h+='<p class="hint">Todavía no hay registro: empieza en cuanto escribas.</p>'}
    else{
      h+='<div class="kpis au-k">'+
        '<div class="kpi"><span>Tiempo escribiendo</span><b>'+duracion(r.segundos)+'</b></div>'+
        '<div class="kpi"><span>Sesiones</span><b>'+fmt(r.sesiones)+'</b></div>'+
        '<div class="kpi"><span>Tecleado</span><b>'+fmt(palabras(r.e))+' palabras</b></div>'+
        '<div class="kpi"><span>Pegado</span><b>'+r.pct+' %</b></div></div>';
      h+='<h3 class="au-h3">Por día</h3><div class="barras">'+r.dias.slice(-10).map(function(x){
        return '<div class="br"><span class="br-l">'+fechaCorta(x.fecha)+' · '+duracion(x.segundos)+'</span><span class="br-b" aria-hidden="true"><i style="width:'+Math.max(2,(x.e+x.p)/max*100)+'%"></i></span><b>'+fmt(palabras(x.e+x.p))+' palabras</b></div>';
      }).join('')+'</div>';
    }
    if(r.pegados.length){
      h+='<h3 class="au-h3">Lo que pegaste</h3>'+(r.sinOrigen?'<p class="hint">'+r.sinOrigen+(r.sinOrigen===1?' texto pegado no tiene':' textos pegados no tienen')+' origen. Indícalo: queda en tu constancia.</p>':'')+
        '<ul class="au-l">'+r.pegados.map(function(p,i){
          return '<li class="au-i"><div class="au-t"><span class="au-meta">'+fechaHora(p.t)+' · '+aprox(p.n)+'</span><span class="au-m">«'+esc(p.m||'')+'»</span></div>'+
            '<label class="au-o"><span class="vh">Origen del texto pegado el '+fechaHora(p.t)+'</span><select data-i="'+i+'">'+Object.keys(ORIGEN).map(function(k){return '<option value="'+k+'"'+((p.o||'')===k?' selected':'')+'>'+ORIGEN[k]+'</option>'}).join('')+'</select></label></li>';
        }).join('')+'</ul>';
    }
    h+='<p class="au-decl">'+esc(estadoDeclaracion(doc))+'</p>'+
      '<div class="td-bt"><button class="btn pri" type="button" data-au="constancia">'+ico('descargar')+'Descargar constancia</button><button class="btn" type="button" data-au="cerrar">Cerrar</button></div>';
    d.innerHTML=h;
  }
  d.addEventListener('change',function(e){
    var s=e.target.closest('select[data-i]');if(!s)return;
    var p=datos(doc).pegados[+s.getAttribute('data-i')];p.o=s.value;
    if(op.alCambiar)op.alCambiar();
  });
  d.addEventListener('click',function(e){
    if(e.target===d){d.close();return}
    var b=e.target.closest('[data-au]');if(!b)return;
    if(b.getAttribute('data-au')==='cerrar')d.close();
    else constancia(doc).then(function(){AT.aviso('Constancia descargada.')});
  });
  d.addEventListener('close',function(){d.remove();if(volver&&volver.focus)volver.focus({preventScroll:true})});
  pintar();d.showModal();
  var x=$('[data-au="constancia"]',d);if(x)x.focus();
  return d;
}

/* ---------- Constancia de autoría ---------- */
function huella(texto){
  if(!window.crypto||!crypto.subtle||!window.TextEncoder)return Promise.resolve('');
  return crypto.subtle.digest('SHA-256',new TextEncoder().encode(texto)).then(function(b){
    return Array.prototype.map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2)}).join('');
  },function(){return ''});
}
function constancia(doc){
  var texto=AT.bloques.texto(doc);
  return huella(texto).then(function(h){
    var r=resumen(doc),ahora=new Date(),props=(doc.props||[]).filter(function(p){return p.nombre&&String(p.valor||'').trim()});
    var dec=declaraciones(doc)[0],decTxt=dec&&AT.fuentes?AT.fuentes.declaracion(dec,AT.fuentes.autorDe(doc)):null;
    var html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>Constancia de autoría · '+esc(doc.titulo||'Sin título')+'</title><style>'+
      'body{font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#16201e;background:#fff;max-width:46rem;margin:2rem auto;padding:0 1rem}'+
      'h1{font-size:1.6rem;margin:0 0 .25rem}h2{font-size:1.15rem;margin:2rem 0 .5rem}small,.m{color:#4b5855}'+
      'table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;padding:.35rem .5rem;border-bottom:1px solid #d5dedc}'+
      '.k{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.5rem}.k div{border:1px solid #d5dedc;border-radius:.5rem;padding:.5rem .75rem}.k b{display:block;font-size:1.2rem}'+
      'code{font-size:.8rem;word-break:break-all}@media print{body{margin:0}}</style></head><body>'+
      '<p class="m">OneLearn · Constancia de autoría</p><h1>'+esc(doc.titulo||'Sin título')+'</h1>'+
      (props.length?'<p>'+props.map(function(p){return '<b>'+esc(p.nombre)+':</b> '+esc(p.valor)}).join(' · ')+'</p>':'')+
      '<p class="m">Emitida el '+esc(ahora.toLocaleString('es-MX',{dateStyle:'long',timeStyle:'short'}))+'.</p>'+
      '<h2>Resumen</h2><div class="k">'+
      '<div><small>Tiempo escribiendo</small><b>'+duracion(r.segundos)+'</b></div><div><small>Sesiones</small><b>'+fmt(r.sesiones)+'</b></div>'+
      '<div><small>Tecleado</small><b>'+aprox(r.e)+'</b></div><div><small>Pegado</small><b>'+r.pct+' % del texto</b></div>'+
      '<div><small>Texto actual</small><b>'+fmt(AT.bloques.palabras(doc))+' palabras</b></div></div>'+
      '<h2>Sesiones</h2>'+(r.sesiones?'<table><thead><tr><th>Fecha</th><th>Horario</th><th>Duración</th><th>Tecleado</th><th>Pegado</th></tr></thead><tbody>'+
      datos(doc).sesiones.map(function(s){
        var i=new Date(s.i),f=new Date(s.f);
        return '<tr><td>'+esc(i.toLocaleDateString('es-MX',{dateStyle:'medium'}))+'</td><td>'+esc(i.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})+'–'+f.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}))+'</td>'+
          '<td>'+duracion(Math.max(60,(s.f-s.i)/1000))+'</td><td>'+fmt(palabras(s.e))+' palabras</td><td>'+fmt(palabras(s.p))+' palabras</td></tr>';
      }).join('')+'</tbody></table>':'<p>Sin sesiones registradas.</p>')+
      '<h2>Textos pegados y su origen</h2>'+(r.pegados.length?'<table><thead><tr><th>Cuándo</th><th>Tamaño</th><th>Origen</th><th>Inicio del texto</th></tr></thead><tbody>'+
      r.pegados.map(function(p){
        var fu=p.f&&(doc.fuentes||[]).filter(function(x){return x.id===p.f})[0];
        return '<tr><td>'+esc(fechaHora(p.t))+'</td><td>'+aprox(p.n)+'</td><td>'+esc(ORIGEN[p.o||''])+(fu&&AT.fuentes?': '+esc(AT.fuentes.referenciaTexto(fu)):'')+'</td><td>«'+esc(p.m||'')+'»</td></tr>';
      }).join('')+'</tbody></table>':'<p>No se pegaron textos largos.</p>')+
      '<h2>Declaración de autoría</h2>'+(decTxt?decTxt.map(function(x){return Array.isArray(x)?'<ul>'+x.map(function(y){return '<li>'+esc(y)+'</li>'}).join('')+'</ul>':'<p>'+esc(x)+'</p>'}).join(''):'<p>El documento no tiene declaración de autoría.</p>')+
      '<h2>Huella del texto</h2><p>SHA-256 del texto del documento al emitir esta constancia:</p><p><code>'+(h||'No disponible en este navegador')+'</code></p>'+
      '<p class="m">Si el texto cambia, aunque sea una letra, la huella cambia. Sirve para comprobar que esta constancia corresponde a la versión que entregaste.</p>'+
      '<h2>Qué demuestra y qué no</h2><p class="m">El registro muestra cómo se escribió el documento dentro de OneLearn, en este dispositivo: cuándo, cuánto se tecleó y cuánto se pegó, y el origen que la autora o el autor indicó para lo pegado. No registra lo que pasa en otros programas ni en otros dispositivos. Es evidencia del proceso de escritura, no un detector.</p>'+
      '</body></html>';
    var a=document.createElement('a');
    var nombre=(doc.titulo||'documento').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'documento';
    a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    a.download='constancia-de-autoria-'+nombre+'.html';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
  });
}

AT.autoria={extension:extension,panel:panel,resumen:resumen,constancia:constancia,huella:huella,estadoDeclaracion:estadoDeclaracion,ORIGEN:ORIGEN};
})();
