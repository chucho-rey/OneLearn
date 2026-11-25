/* OneBook: bloque «Base de datos» (fase F6; el motor está en bases.js).
   El bloque guarda solo {base, vista}: la base vive aparte (AT.datos.bases y AT.datos.filas). Si llega con
   {semilla} y sin base (una plantilla, un duplicado), la base se crea al abrir la página y el bloque se queda con
   su id. Se usa igual al editar y al leer (en tus documentos): los datos se guardan al momento, sin tocar el texto
   de la página. Al imprimir se dibuja la vista elegida como tabla (imprimir.js lee antes las bases).
   - Vistas guardadas (pestañas): tabla, tablero (por una columna de selección), galería y calendario (por una
     fecha); cada una con su búsqueda, filtro, orden en dos niveles, agrupar (con subtotales) y columnas ocultas.
   - Columnas: nombre, tipo, opciones, relación, dato de la relación, suma de otra base, fórmula, en pesos, total al
     pie (suma, promedio o conteo, de lo que se ve), negritas, resaltado, mover y eliminar.
   - Ficha de cada fila, con las filas de otras bases que se relacionan con ella.
   - Deshacer y rehacer (Ctrl+Z, Ctrl+Y o Ctrl+Mayús+Z dentro de la base), importar y exportar CSV.
   Registra el nodo del editor, su dibujo al leer, su texto y su Markdown, y «/base». Expone AT.basedatos. */
(function(){
'use strict';
var AT=window.AT,B=AT.bases;
if(!B)return;
var $=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;
var ICONO_TIPO={texto:'Aa',numero:'#',moneda:'$',fecha:'📅',seleccion:'▾',multiple:'☰',casilla:'☑',telefono:'☎',relacion:'↗',referencia:'↳',formula:'ƒ',suma:'Σ'};
var NOMBRE_TIPO={};B.TIPOS.forEach(function(t){NOMBRE_TIPO[t[0]]=t[1]});
var VISTAS=[['tabla','Tabla'],['tablero','Tablero'],['galeria','Galería'],['calendario','Calendario']];
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function opciones(l,v){return l.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(v)?' selected':'')+'>'+esc(o[1])+'</option>'}).join('')}
function hoy(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function dialogo(clase,titulo,html){
  var d=document.createElement('dialog');
  d.className='atajos bd-dlg '+clase;d.setAttribute('aria-labelledby','bdT'+clase);
  d.innerHTML='<div class="at-h"><h2 id="bdT'+clase+'">'+esc(titulo)+'</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+html;
  document.body.appendChild(d);
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  return d;
}

/* =====================================================================================
   La base en una página: montar(raiz, op)
   op: {base, vista, semilla, editable, alCambiar({base, vista}) para guardar el bloque}
   ===================================================================================== */
/* Las bases que se están creando desde su semilla, por bloque (si el editor arma el bloque dos veces, se crea una sola) */
var CREANDO={};
function montar(raiz,op){
  var b=null,vistaId=op.vista||'',busca='',deshacer=[],rehacer=[],quitar=null,vivo=true,esperaTexto={},antesTexto={};
  var ed=!!op.editable;
  raiz.classList.add('bd');
  raiz.innerHTML='<p class="hint bd-cargando">Cargando la base de datos…</p>';
  function vista(){return b.vistas.filter(function(v){return v.id===vistaId})[0]||b.vistas[0]}
  function visibles(v){return b.columnas.filter(function(c,i){return i===0||v.ocultas.indexOf(c.id)<0})}
  function fila(id){return B.fila(b.id,id)}
  /* ---------- Cargar (o crear desde la semilla) ---------- */
  var arranque;
  if(op.base)arranque=B.cargar(op.base);
  else if(op.semilla&&ed){
    var clave=op.clave||JSON.stringify(op.semilla).length+'|'+(op.semilla.nombre||'');
    /* Con rol (el inventario, fase F7): la base de ese rol del espacio, la misma en todas las páginas */
    var rol=op.semilla.rol&&AT.inventario&&AT.inventario.ROLES.indexOf(op.semilla.rol)>=0;
    if(!CREANDO[clave])CREANDO[clave]=rol?AT.inventario.base(op.semilla.rol,AT.docActual&&AT.docActual.id):B.crear(op.semilla,AT.docActual&&AT.docActual.id);
    arranque=CREANDO[clave].then(function(x){
      var vi=x&&op.semilla.vista&&x.vistas.some(function(w){return w.id===op.semilla.vista})?op.semilla.vista:x&&x.vistas[0].id;
      if(x){vistaId=vi;if(op.alCambiar)op.alCambiar({base:x.id,vista:vi,semilla:null})}
      return x;
    });
  }else arranque=Promise.resolve(null);
  arranque.then(function(x){
    if(!vivo)return;
    if(!x){raiz.innerHTML='<p class="hint">'+(op.semilla?'Abre esta página para preparar su base de datos.':'No se encontró esta base de datos en este dispositivo.')+'</p>';return}
    b=x;if(!b.vistas.some(function(v){return v.id===vistaId}))vistaId=b.vistas[0].id;
    pintar();
    if(op.enfocar){var t=$('.bd-nombre',raiz);if(t){t.focus();t.select()}}
    quitar=B.on(function(c){if(!vivo||!b)return;if(c.base===b.id||b.columnas.some(function(k){return k.base===c.base})){b=B.base(b.id)||b;if(!raiz.contains(document.activeElement)||c.tipo==='base'&&!enDialogo())pintar(marca())}});
  },function(){raiz.innerHTML='<p class="hint">No se pudo leer la base de datos.</p>'});
  function enDialogo(){return !!document.querySelector('dialog.bd-dlg[open]')}

  /* ---------- Pintar ---------- */
  function pintar(foco){
    if(!b)return;
    var v=vista(),fs=B.filasVista(b,v,busca),total=B.filas(b.id).length;
    raiz.setAttribute('data-bd',b.id);
    raiz.innerHTML=
      '<div class="bd-cab">'+(ed?'<input class="bd-nombre" type="text" data-bd-nombre value="'+esc(b.nombre)+'" aria-label="Nombre de la base de datos">':'<h3 class="bd-nombre-t">'+esc(b.nombre)+'</h3>')+
        '<span class="bd-n">'+(fs.length===total?total+(total===1?' fila':' filas'):fs.length+' de '+total+' filas')+'</span></div>'+
      '<div class="bd-vistas" role="tablist" aria-label="Vistas de '+esc(b.nombre)+'">'+b.vistas.map(function(x){
        return '<button type="button" role="tab" class="bd-vt" data-vista="'+esc(x.id)+'" aria-selected="'+(x.id===v.id)+'" tabindex="'+(x.id===v.id?0:-1)+'">'+esc(x.nombre)+'</button>';
      }).join('')+(ed?'<button type="button" class="bd-vt bd-vmas" data-acc="nuevaVista" aria-label="Nueva vista" title="Nueva vista">+</button>':'')+'</div>'+
      (ed?'<div class="bd-barra"><label class="vh" for="'+raiz.id+'-q">Buscar en '+esc(b.nombre)+'</label>'+
        '<input type="search" class="bd-buscar" id="'+raiz.id+'-q" placeholder="Buscar" value="'+esc(busca)+'" data-bd-buscar>'+
        '<button type="button" class="btn" data-acc="vista">Ajustar vista</button>'+
        '<button type="button" class="btn bd-mas" data-acc="mas" aria-label="Más opciones de la base" aria-haspopup="menu">'+ico('puntos')+'</button>'+
        '<button type="button" class="btn pri" data-acc="nuevaFila">+ Nueva</button></div>':'')+
      resumenVista(v)+
      '<div class="bd-cuerpo">'+(v.tipo==='tablero'?tablero(v,fs):v.tipo==='galeria'?galeria(v,fs):v.tipo==='calendario'?calendario(v,fs):tabla(v,fs))+'</div>'+
      '<p class="bd-msg" role="status"></p>';
    enfocar(foco);
  }
  function resumenVista(v){
    var p=[];
    if(v.q)p.push('Busca «'+esc(v.q)+'»');
    var fc=v.f&&B.col(b,v.f.col);
    if(fc)p.push('Filtro: '+esc(fc.nombre)+' '+esc((B.OPS.filter(function(o){return o[0]===v.f.op})[0]||B.OPS[0])[1])+(v.f.op==='vacio'||v.f.op==='novacio'?'':' «'+esc(v.f.val)+'»'));
    var sc=v.s&&B.col(b,v.s.col),sc2=v.s2&&B.col(b,v.s2.col);
    if(sc)p.push('Orden: '+esc(sc.nombre)+(v.s.dir===-1?' (de mayor a menor)':'')+(sc2?', luego '+esc(sc2.nombre)+(v.s2.dir===-1?' (de mayor a menor)':''):''));
    var gc=v.tipo==='tabla'&&v.agrupar&&B.col(b,v.agrupar);
    if(gc)p.push('Agrupada por '+esc(gc.nombre));
    return p.length?'<p class="bd-res">'+p.join(' · ')+'</p>':'';
  }
  /* El editor de una celda (o su texto, si no se puede editar) */
  function celda(c,f,extra){
    var v=B.valor(b,f,c),t=B.texto(b,f,c),et=esc(c.nombre+' de '+(B.titulo(b,f)||'la fila nueva')),a=' data-c="'+esc(c.id)+'" data-f="'+esc(f.id)+'" aria-label="'+et+'"'+(extra||'');
    if(B.CALCULADO[c.tipo]||!ed){
      var neg=typeof v==='number'&&v<0,err=typeof v==='string'&&v.charAt(0)==='#';
      return '<output class="bd-calc'+(neg?' neg':'')+(err?' err':'')+(B.esNumerica(b,c)?' bd-num':'')+'" data-calc="'+esc(c.id)+'" data-f="'+esc(f.id)+'"'+(err?' title="'+esc(errorTexto(t))+'"':'')+'>'+esc(t)+'</output>';
    }
    switch(c.tipo){
      case 'numero':return '<input type="text" inputmode="decimal" class="bd-in bd-num"'+a+' value="'+esc(v===''?'':String(v))+'">';
      case 'moneda':return '<input type="text" inputmode="decimal" class="bd-in bd-num"'+a+' value="'+esc(v===''?'':B.dinero(v))+'">';
      case 'fecha':return '<input type="date" class="bd-in"'+a+' value="'+esc(v)+'">';
      case 'casilla':return '<input type="checkbox" class="bd-cas"'+a+(v?' checked':'')+'>';
      case 'seleccion':{
        var ops=(c.opciones||[]).slice();if(v&&ops.indexOf(v)<0)ops.push(v);
        return '<select class="bd-in bd-sel" data-tono="'+tono(v,ops.indexOf(v))+'"'+a+'><option value=""></option>'+ops.map(function(o){return '<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>'}).join('')+'</select>';
      }
      case 'multiple':return '<button type="button" class="bd-in bd-multi" data-multi'+a+'>'+(t?esc(t):'<span class="bd-vacio">—</span>')+'</button>';
      case 'relacion':{
        var tb=B.base(c.base);
        if(!tb)return '<span class="bd-calc err" title="La base relacionada no está en este dispositivo">#REF</span>';
        var rs=B.filas(tb.id).map(function(x){return [x.id,B.titulo(tb,x)||'Sin nombre']}).sort(function(x,y){return x[1].localeCompare(y[1],'es')});
        return '<select class="bd-in bd-rel"'+a+'><option value=""></option>'+opciones(rs,v)+'</select>';
      }
      case 'telefono':return '<input type="tel" class="bd-in"'+a+' value="'+esc(v)+'">';
      default:return '<input type="text" class="bd-in'+(c===b.columnas[0]?' bd-tit':'')+'"'+a+' value="'+esc(v)+'">';
    }
  }
  /* El color de una opción de selección: por lo que dice (pagado, pendiente, vencido) o, si no, por su lugar */
  function tono(o,i){
    var s=String(o||'').toLowerCase();if(!s)return '';
    if(/^(sin|no) |pendiente|por (pagar|cobrar|surtir)|falta/.test(s))return 'aviso';
    if(/pagad|recibid|hech|complet|terminad|entregad|activ|^s[ií]$/.test(s))return 'bien';
    if(/vencid|cancelad|urgente|atrasad|^baja/.test(s))return 'mal';
    return ['a','b','c'][Math.max(0,i)%3];
  }
  function errorTexto(t){return t==='#REF'?'Una columna o una base que usa ya no existe':t==='#CICLO'?'Se usa a sí misma':t==='#ERROR'?'La fórmula está mal escrita o divide entre cero':''}
  function claseCol(c){return (c.negritas?' bd-neg':'')+(c.resaltado?' bd-res-c':'')+(B.esNumerica(b,c)?' bd-num-c':'')}
  /* Formato condicional: la celda lleva el tono de su regla (y se vuelve a revisar al cambiar los valores) */
  function tonoTd(c,f){if(!c.colores||!c.colores.length)return '';var t=B.tonoCelda(b,f,c);return (t?' bd-t-'+t:'')+'" data-tc="'+esc(c.id)+'" data-tf="'+esc(f.id)}
  /* ---------- Tabla ---------- */
  function tabla(v,fs){
    var cols=visibles(v),gc=v.agrupar&&B.col(b,v.agrupar);
    var cab='<thead><tr><th class="bd-abrir"><span class="vh">Abrir</span></th>'+cols.map(function(c){
      return '<th scope="col" class="'+claseCol(c)+'">'+(ed?'<button type="button" class="bd-th" data-col="'+esc(c.id)+'" title="'+esc(NOMBRE_TIPO[c.tipo])+'">':'<span class="bd-th">')+
        '<span class="bd-tipo" aria-hidden="true">'+ICONO_TIPO[c.tipo]+'</span>'+esc(c.nombre||'Sin nombre')+(ed?'<span class="vh"> ('+esc(NOMBRE_TIPO[c.tipo])+'). Opciones de la columna</span></button>':'</span>')+'</th>';
    }).join('')+(ed?'<th class="bd-nc"><button type="button" class="bd-th" data-acc="nuevaCol" aria-label="Nueva columna" title="Nueva columna">+</button></th>':'')+'</tr></thead>';
    function filaHtml(f){
      return '<tr data-fila="'+esc(f.id)+'"><td class="bd-abrir"><button type="button" class="bd-ab" data-ficha="'+esc(f.id)+'" aria-label="Abrir la ficha de «'+esc(B.titulo(b,f)||'Sin nombre')+'»" title="Abrir ficha">'+ico('expand')+'</button></td>'+
        cols.map(function(c){return '<td class="'+claseCol(c)+tonoTd(c,f)+'">'+celda(c,f)+'</td>'}).join('')+(ed?'<td></td>':'')+'</tr>';
    }
    function pie(filas,clase,etiqueta){
      if(!cols.some(function(c){return c.pie}))return '';
      return '<tr class="'+clase+'"><td class="bd-abrir">'+(etiqueta||'')+'</td>'+cols.map(function(c){
        var t=B.total(b,filas,c);
        return '<td class="'+claseCol(c)+'">'+(t?'<span class="bd-pie-e">'+esc(B.PIES.filter(function(p){return p[0]===c.pie})[0][1])+'</span> <b class="'+(t.v<0?'neg':'')+'" data-total="'+esc(c.id)+'">'+esc(B.totalTexto(t))+'</b>':'')+'</td>';
      }).join('')+(ed?'<td></td>':'')+'</tr>';
    }
    var cuerpo;
    if(gc){
      cuerpo=B.agrupar(b,fs,gc.id).map(function(g){
        return '<tbody class="bd-g"><tr class="bd-grupo"><th colspan="'+(cols.length+(ed?2:1))+'" scope="rowgroup">'+esc(g.clave||'Sin '+gc.nombre.toLowerCase())+' <span class="bd-gn">'+g.filas.length+'</span></th></tr>'+
          g.filas.map(filaHtml).join('')+pie(g.filas,'bd-sub','<span class="vh">Subtotal</span>')+'</tbody>';
      }).join('');
    }else cuerpo='<tbody>'+fs.map(filaHtml).join('')+'</tbody>';
    var vacio=!fs.length?'<p class="hint bd-vacia">'+(B.filas(b.id).length?'Ninguna fila coincide con la búsqueda o el filtro.':'Todavía no hay filas. '+(ed?'Toca «+ Nueva» para agregar la primera.':''))+'</p>':'';
    return '<div class="bd-scroll"><table class="bd-tabla"><caption class="vh">'+esc(b.nombre)+'</caption>'+cab+cuerpo+
      (fs.length?'<tfoot>'+pie(fs,'bd-pie','<span class="vh">Total</span>')+'</tfoot>':'')+'</table></div>'+vacio+
      (ed?'<button type="button" class="bd-agregar" data-acc="nuevaFila">+ Nueva fila</button>':'');
  }
  /* Los campos de una tarjeta (tablero y galería): hasta cuatro columnas visibles, sin la primera */
  function campos(v,f,sin){
    return '<dl class="bd-campos">'+visibles(v).slice(1).filter(function(c){return c.id!==sin}).slice(0,4).map(function(c){
      var t=B.texto(b,f,c),n=B.valor(b,f,c);
      return t?'<div><dt>'+esc(c.nombre)+'</dt><dd class="'+(typeof n==='number'&&n<0?'neg':'')+'">'+esc(t)+'</dd></div>':'';
    }).join('')+'</dl>';
  }
  function tarjeta(v,f,gc){
    return '<li class="bd-tarjeta"><button type="button" class="bd-tar-t" data-ficha="'+esc(f.id)+'">'+esc(B.titulo(b,f)||'Sin nombre')+'</button>'+campos(v,f,gc&&gc.id)+
      (gc&&ed?'<label class="bd-mover"><span>'+esc(gc.nombre)+'</span>'+celda(gc,f)+'</label>':'')+'</li>';
  }
  function tablero(v,fs){
    var gc=B.col(b,v.agrupar);
    if(!gc||gc.tipo!=='seleccion')gc=b.columnas.filter(function(c){return c.tipo==='seleccion'})[0];
    if(!gc)return '<p class="hint">El tablero ordena las filas por una columna de selección (por ejemplo, Estado). '+(ed?'Agrega una con «+» en la tabla o en «Ajustar vista».':'')+'</p>';
    var grupos={};fs.forEach(function(f){var k=B.valor(b,f,gc)||'';(grupos[k]=grupos[k]||[]).push(f)});
    var claves=(gc.opciones||[]).slice();Object.keys(grupos).forEach(function(k){if(k&&claves.indexOf(k)<0)claves.push(k)});claves.push('');
    return '<div class="bd-tablero">'+claves.filter(function(k){return k||grupos['']}).map(function(k){
      var l=grupos[k]||[];
      return '<section class="bd-carril" aria-label="'+esc((k||'Sin '+gc.nombre.toLowerCase())+' ('+l.length+')')+'"><h4 class="bd-carril-t">'+esc(k||'Sin '+gc.nombre.toLowerCase())+' <span class="bd-gn">'+l.length+'</span></h4>'+
        '<ul class="bd-tarjetas">'+l.map(function(f){return tarjeta(v,f,gc)}).join('')+'</ul>'+
        (ed?'<button type="button" class="bd-agregar" data-acc="nuevaFila" data-col="'+esc(gc.id)+'" data-valor="'+esc(k)+'">+ Nueva</button>':'')+'</section>';
    }).join('')+'</div>';
  }
  function galeria(v,fs){
    return fs.length?'<ul class="bd-galeria">'+fs.map(function(f){return tarjeta(v,f,null)}).join('')+'</ul>':'<p class="hint">No hay filas que mostrar.</p>';
  }
  function calendario(v,fs){
    var fc=B.col(b,v.fecha);if(!fc||fc.tipo!=='fecha')fc=b.columnas.filter(function(c){return c.tipo==='fecha'})[0];
    if(!fc)return '<p class="hint">El calendario acomoda las filas por una columna de fecha. '+(ed?'Agrega una en la tabla.':'')+'</p>';
    var mes=/^\d{4}-\d{2}$/.test(v.mes||'')?v.mes:hoy().slice(0,7),y=+mes.slice(0,4),m=+mes.slice(5,7)-1;
    var primero=new Date(y,m,1),dias=new Date(y,m+1,0).getDate(),inicio=(primero.getDay()+6)%7,porDia={};
    fs.forEach(function(f){var d=B.valor(b,f,fc);if(d&&d.slice(0,7)===mes)(porDia[+d.slice(8,10)]=porDia[+d.slice(8,10)]||[]).push(f)});
    var celdas='';
    for(var i=0;i<inicio;i++)celdas+='<li class="bd-dia fuera" aria-hidden="true"></li>';
    for(var dd=1;dd<=dias;dd++){
      var l=porDia[dd]||[],es=mes+'-'+('0'+dd).slice(-2)===hoy();
      celdas+='<li class="bd-dia'+(l.length?' con':'')+(es?' hoy':'')+'"><span class="bd-dia-n">'+dd+'<span class="vh"> de '+MESES[m]+'</span></span>'+
        l.map(function(f){return '<button type="button" class="bd-ev" data-ficha="'+esc(f.id)+'">'+esc(B.titulo(b,f)||'Sin nombre')+'</button>'}).join('')+'</li>';
    }
    return '<div class="bd-cal"><div class="bd-cal-h"><button type="button" class="btn" data-acc="mesAnt" aria-label="Mes anterior">‹</button>'+
      '<b>'+MESES[m]+' de '+y+'</b><button type="button" class="btn" data-acc="mesSig" aria-label="Mes siguiente">›</button><span class="bd-n">por '+esc(fc.nombre)+'</span></div>'+
      '<ol class="bd-semana" aria-hidden="true">'+['lun','mar','mié','jue','vie','sáb','dom'].map(function(x){return '<li>'+x+'</li>'}).join('')+'</ol>'+
      '<ol class="bd-mes">'+celdas+'</ol></div>';
  }

  /* ---------- Foco ---------- */
  function marca(){
    var e=document.activeElement;if(!e||!raiz.contains(e))return null;
    if(e.getAttribute('data-c'))return {sel:'[data-c="'+e.getAttribute('data-c')+'"][data-f="'+e.getAttribute('data-f')+'"]',ini:typeof e.selectionStart==='number'?e.selectionStart:null};
    if(e.getAttribute('data-acc'))return {sel:'[data-acc="'+e.getAttribute('data-acc')+'"]'};
    if(e.getAttribute('data-vista'))return {sel:'[data-vista="'+e.getAttribute('data-vista')+'"]'};
    if(e.hasAttribute('data-bd-buscar'))return {sel:'[data-bd-buscar]',ini:e.selectionStart};
    if(e.hasAttribute('data-bd-nombre'))return {sel:'[data-bd-nombre]',ini:e.selectionStart};
    if(e.getAttribute('data-ficha'))return {sel:'[data-ficha="'+e.getAttribute('data-ficha')+'"]'};
    if(e.getAttribute('data-col'))return {sel:'[data-col="'+e.getAttribute('data-col')+'"]'};
    return null;
  }
  function enfocar(m){
    if(!m)return;
    var e=null;try{e=raiz.querySelector(m.sel)}catch(x){}
    if(!e)return;
    e.focus({preventScroll:true});
    if(m.ini!=null&&e.setSelectionRange)try{e.setSelectionRange(m.ini,m.ini)}catch(x){}
  }
  function decir(t){var p=$('.bd-msg',raiz);if(p)p.textContent=t}

  /* ---------- Cambiar datos (con deshacer) ---------- */
  function registrar(cambio){deshacer.push(cambio);if(deshacer.length>100)deshacer.shift();rehacer=[]}
  function aplicar(c,hacia){
    var x=hacia==='antes'?c.antes:c.despues;
    if(c.tipo==='base'){b=x?B.clonar(x):b;return B.guardarBase(B.clonar(x))}
    if(c.tipo==='filas'){
      var pr=[];
      var lista=hacia==='antes'?c.antes:c.despues,otra=hacia==='antes'?c.despues:c.antes;
      /* Las que no están en el destino se borran */
      (otra||[]).forEach(function(f){if(!(lista||[]).some(function(g){return g.id===f.id}))pr.push(B.borrarFila(f))});
      if(lista&&lista.length)pr.push(B.guardarFilas(B.clonar(lista)));
      return Promise.all(pr);
    }
  }
  function deshacerUno(){var c=deshacer.pop();if(!c){decir('No hay nada que deshacer.');return}rehacer.push(c);aplicar(c,'antes').then(function(){b=B.base(b.id)||b;pintar(marca());decir('Se deshizo: '+c.que+'.')})}
  function rehacerUno(){var c=rehacer.pop();if(!c){decir('No hay nada que rehacer.');return}deshacer.push(c);aplicar(c,'despues').then(function(){b=B.base(b.id)||b;pintar(marca());decir('Se rehízo: '+c.que+'.')})}
  /* Un cambio de la estructura (columnas, vistas, nombre) */
  function cambiarBase(fn,que,foco){
    var antes=B.clonar(b),nueva=B.clonar(b);
    fn(nueva);
    registrar({tipo:'base',antes:antes,despues:B.clonar(nueva),que:que});
    b=nueva;
    return B.guardarBase(nueva).then(function(){pintar(foco===undefined?marca():foco)});
  }
  /* Guardar el valor de una celda */
  function ponerValor(f,c,val,reg){
    var antes=B.clonar(f),nf=B.clonar(f);
    if(val===''||val==null||(Array.isArray(val)&&!val.length)||val===false&&c.tipo!=='casilla')delete nf.v[c.id];else nf.v[c.id]=val;
    if(JSON.stringify(antes.v)===JSON.stringify(nf.v))return Promise.resolve(false);
    if(reg!==false)registrar({tipo:'filas',antes:[antes],despues:[B.clonar(nf)],que:'el cambio en '+c.nombre});
    return B.guardarFila(nf).then(function(){return true});
  }
  /* Lo calculado de la vista (sin volver a dibujar los campos donde escribes) */
  function refrescarCalculos(){
    var v=vista();
    $$('output[data-calc]',raiz).forEach(function(o){
      var f=fila(o.getAttribute('data-f')),c=B.col(b,o.getAttribute('data-calc'));if(!f||!c)return;
      var t=B.texto(b,f,c),n=B.valor(b,f,c);o.textContent=t;o.classList.toggle('neg',typeof n==='number'&&n<0);o.classList.toggle('err',typeof n==='string'&&n.charAt(0)==='#');
    });
    $$('td[data-tc]',raiz).forEach(function(td){
      var f=fila(td.getAttribute('data-tf')),c=B.col(b,td.getAttribute('data-tc'));if(!f||!c)return;
      var t=B.tonoCelda(b,f,c);['bien','aviso','mal','info'].forEach(function(k){td.classList.toggle('bd-t-'+k,t===k)});
    });
    var fs=B.filasVista(b,v,busca);
    $$('tfoot [data-total]',raiz).forEach(function(x){var c=B.col(b,x.getAttribute('data-total')),t=c&&B.total(b,fs,c);if(t){x.textContent=B.totalTexto(t);x.classList.toggle('neg',t.v<0)}});
  }

  /* ---------- Eventos ---------- */
  raiz.addEventListener('input',function(e){
    var t=e.target;
    if(t.hasAttribute('data-bd-buscar')){busca=t.value;pintar({sel:'[data-bd-buscar]',ini:t.selectionStart});return}
    if(t.hasAttribute('data-bd-nombre'))return;
    var fid=t.getAttribute('data-f'),cid=t.getAttribute('data-c');
    if(!fid||!cid||t.type==='checkbox'||t.tagName==='SELECT'||t.type==='date')return;
    var k=fid+'|'+cid,f=fila(fid),c=B.col(b,cid);if(!f||!c)return;
    if(!antesTexto[k])antesTexto[k]=B.clonar(f);
    clearTimeout(esperaTexto[k]);
    esperaTexto[k]=setTimeout(function(){
      var ff=fila(fid);if(!ff)return;
      ponerValor(ff,c,B.capturar(c,t.value),false).then(function(si){if(si)refrescarCalculos()});
    },350);
  });
  raiz.addEventListener('change',function(e){
    var t=e.target;
    if(t.hasAttribute('data-bd-nombre')){var n=t.value.trim()||'Base de datos';if(n!==b.nombre)cambiarBase(function(x){x.nombre=n},'el nombre de la base');return}
    var fid=t.getAttribute('data-f'),cid=t.getAttribute('data-c');if(!fid||!cid)return;
    if(t.classList.contains('bd-sel'))t.setAttribute('data-tono',tono(t.value,t.selectedIndex-1));
    var f=fila(fid),c=B.col(b,cid),k=fid+'|'+cid;if(!f||!c)return;
    clearTimeout(esperaTexto[k]);
    var antes=antesTexto[k]||B.clonar(f);delete antesTexto[k];
    var val=t.type==='checkbox'?t.checked:B.capturar(c,t.value);
    ponerValor(f,c,val,false).then(function(){
      var nf=fila(fid);
      if(nf&&JSON.stringify(nf.v)!==JSON.stringify(antes.v))registrar({tipo:'filas',antes:[antes],despues:[B.clonar(nf)],que:'el cambio en '+c.nombre});
      /* El foco ya pudo pasar a otra celda (con Tab): se queda ahí */
      pintar(marca());
    });
  });
  raiz.addEventListener('keydown',function(e){
    var mod=e.ctrlKey||e.metaKey;
    if(mod&&!e.altKey&&(e.key==='z'||e.key==='Z')&&!e.shiftKey){if(e.target.matches('input[type="text"],input[type="search"],input:not([type])')&&e.target.value!==e.target.defaultValue)return;e.preventDefault();e.stopPropagation();deshacerUno();return}
    if(mod&&!e.altKey&&(e.key==='y'||e.key==='Y'||(e.key==='z'||e.key==='Z')&&e.shiftKey)){e.preventDefault();e.stopPropagation();rehacerUno();return}
    /* Pestañas de vistas con flechas */
    if(e.target.getAttribute&&e.target.getAttribute('role')==='tab'&&(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='Home'||e.key==='End')){
      var tabs=$$('[role="tab"]',raiz),i=tabs.indexOf(e.target);
      var j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      e.preventDefault();tabs[j].focus();
    }
    /* Enter en una celda de texto baja a la misma columna de la fila siguiente */
    if(e.key==='Enter'&&e.target.matches('.bd-tabla input[type="text"],.bd-tabla input[type="tel"]')){
      e.preventDefault();
      var tr=e.target.closest('tr'),sig=tr&&tr.nextElementSibling,c=e.target.getAttribute('data-c');
      e.target.blur();
      setTimeout(function(){var s=sig&&sig.querySelector('[data-c="'+c+'"]');if(s)s.focus();else{var n=raiz.querySelector('tr[data-fila="'+tr.getAttribute('data-fila')+'"]');n=n&&n.nextElementSibling&&n.nextElementSibling.querySelector('[data-c="'+c+'"]');if(n)n.focus()}},0);
    }
  });
  raiz.addEventListener('click',function(e){
    var t=e.target.closest('button');if(!t||!raiz.contains(t))return;
    if(t.hasAttribute('data-vista')){vistaId=t.getAttribute('data-vista');if(op.alCambiar)op.alCambiar({vista:vistaId});pintar({sel:'[data-vista="'+vistaId+'"]'});return}
    if(t.hasAttribute('data-ficha')){ficha(t.getAttribute('data-ficha'),t);return}
    if(t.hasAttribute('data-multi')){multiple(fila(t.getAttribute('data-f')),B.col(b,t.getAttribute('data-c')),t);return}
    if(t.hasAttribute('data-col')&&!t.hasAttribute('data-acc')){columna(t.getAttribute('data-col'),t);return}
    var a=t.getAttribute('data-acc');
    if(a==='nuevaFila')nuevaFila(t.getAttribute('data-col'),t.getAttribute('data-valor'));
    else if(a==='nuevaCol')columna(null,t);
    else if(a==='vista')ajustarVista(t);
    else if(a==='nuevaVista'){var nv=B.vistaNueva('Vista '+(b.vistas.length+1),'tabla');cambiarBase(function(x){x.vistas.push(nv)},'la vista nueva',null).then(function(){vistaId=nv.id;if(op.alCambiar)op.alCambiar({vista:nv.id});pintar();ajustarVista($('[data-acc="vista"]',raiz))})}
    else if(a==='mas')menuMas(t);
    else if(a==='mesAnt'||a==='mesSig'){
      var v=vista(),mes=/^\d{4}-\d{2}$/.test(v.mes||'')?v.mes:hoy().slice(0,7),d=new Date(+mes.slice(0,4),+mes.slice(5,7)-1+(a==='mesSig'?1:-1),1);
      var nm=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
      b.vistas.forEach(function(x){if(x.id===v.id)x.mes=nm});B.guardarBase(b).then(function(){pintar({sel:'[data-acc="'+a+'"]'})});
    }
  });
  /* Una fila nueva: con el valor del filtro o del grupo, para que se vea donde la creaste */
  function nuevaFila(colId,valorGrupo){
    var v=vista(),val={},gc=colId&&B.col(b,colId);
    if(gc&&valorGrupo)val[gc.id]=B.capturar(gc,valorGrupo);
    var fc=v.f&&B.col(b,v.f.col);
    if(fc&&!B.CALCULADO[fc.tipo]&&fc.tipo!=='relacion'&&(v.f.op==='igual'||v.f.op==='contiene')&&v.f.val!=='')val[fc.id]=B.capturar(fc,v.f.val);
    if(v.tipo==='calendario'){var dc=B.col(b,v.fecha)||b.columnas.filter(function(c){return c.tipo==='fecha'})[0];if(dc)val[dc.id]=hoy()}
    var f=B.nuevaFila(b.id,val);
    registrar({tipo:'filas',antes:[],despues:[B.clonar(f)],que:'la fila nueva'});
    B.guardarFila(f).then(function(){
      busca='';
      pintar({sel:'[data-c="'+b.columnas[0].id+'"][data-f="'+f.id+'"]'});
      if(v.tipo!=='tabla')ficha(f.id,null,true);
      decir('Fila nueva.');
    });
  }
  function menuMas(boton){
    if(!AT.menu)return;
    AT.menu.abrir(boton,[
      {t:'Nueva columna',i:'mas',f:function(){columna(null,boton)}},
      {t:'Deshacer',i:'deshacer',d:'Ctrl+Z',f:deshacerUno},
      {t:'Rehacer',i:'rehacer',d:'Ctrl+Y',f:rehacerUno},
      {sep:true},
      {t:'Importar CSV',i:'datos',d:'De Excel o de otra app',f:function(){importarCSV(boton)}},
      {t:'Exportar CSV',i:'descargar',d:'Lo que se ve en esta vista',f:exportarCSV}
    ],{etiqueta:'Más opciones de la base',devolver:boton,alElegir:function(it){it.f()}});
  }
  function exportarCSV(){
    var v=vista(),txt=B.escribirCSV(b,B.filasVista(b,v,busca),visibles(v));
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));
    a.download=(B.sinAcentos(b.nombre).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'base')+'.csv';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
    decir('Se descargó el CSV.');
  }

  /* ---------- Ventanas ---------- */
  function abrirDlg(d,devolver,primero){
    d.addEventListener('close',function(){
      d.remove();
      if(devolver&&document.contains(devolver))devolver.focus({preventScroll:true});
      else if(!raiz.contains(document.activeElement)){var x=raiz.querySelector('[data-acc="nuevaFila"]');if(x)x.focus({preventScroll:true})}
    });
    if(AT.setNav)AT.setNav(false);
    d.showModal();
    var p=primero&&$(primero,d);if(p)p.focus();
  }
  /* Selección múltiple: casillas con las opciones */
  function multiple(f,c,boton){
    if(!f||!c)return;
    var act=B.valor(b,f,c),ops=(c.opciones||[]).slice();act.forEach(function(o){if(ops.indexOf(o)<0)ops.push(o)});
    var d=dialogo('bd-mult',c.nombre,'<fieldset class="bd-ops"><legend class="vh">'+esc(c.nombre)+'</legend>'+
      (ops.length?ops.map(function(o,i){return '<label class="pl-op"><input type="checkbox" value="'+esc(o)+'"'+(act.indexOf(o)>=0?' checked':'')+'><span>'+esc(o)+'</span></label>'}).join(''):'<p class="hint">Esta columna no tiene opciones todavía. Agrégalas en sus opciones.</p>')+
      '</fieldset><div class="td-bt"><button class="btn pri" type="button" data-ok>Listo</button></div>');
    $('[data-ok]',d).addEventListener('click',function(){
      var l=$$('input:checked',d).map(function(x){return x.value});
      ponerValor(f,c,l).then(function(){d.close();pintar({sel:'[data-c="'+c.id+'"][data-f="'+f.id+'"]'})});
    });
    abrirDlg(d,boton,'input');
  }
  /* La ficha de una fila: todos sus campos y lo que se relaciona con ella */
  function ficha(fid,boton,nueva){
    var f=fila(fid);if(!f)return;
    var d=dialogo('bd-ficha',B.titulo(b,f)||'Fila nueva','<div class="bd-ficha-c"></div>'+
      '<div class="bd-rel"></div>'+
      (ed?'<div class="td-bt bd-ficha-b"><button class="btn danger" type="button" data-borrar>Eliminar fila</button><button class="btn pri" type="button" data-cerrar>Listo</button></div>':''));
    function pintarFicha(){
      var ff=fila(fid);if(!ff){d.close();return}
      $('.bd-ficha-c',d).innerHTML='<dl class="bd-fcampos">'+b.columnas.map(function(c){
        return '<div><dt>'+(B.CALCULADO[c.tipo]||!ed?esc(c.nombre):'<label for="bdF-'+esc(c.id)+'">'+esc(c.nombre)+'</label>')+'</dt><dd>'+celda(c,ff,' id="bdF-'+esc(c.id)+'"')+'</dd></div>';
      }).join('')+'</dl>';
      $('h2',d).textContent=B.titulo(b,ff)||'Sin nombre';
    }
    pintarFicha();
    /* Filas de otras bases que apuntan a esta */
    B.todas().then(function(bs){
      var pr=bs.filter(function(x){return x.columnas.some(function(c){return c.tipo==='relacion'&&c.base===b.id})}).map(function(x){return B.cargar(x.id)});
      return Promise.all(pr);
    }).then(function(bs){
      var html=bs.filter(Boolean).map(function(ob){
        return ob.columnas.filter(function(c){return c.tipo==='relacion'&&c.base===b.id}).map(function(c){
          var l=B.filas(ob.id).filter(function(x){return x.v[c.id]===fid});
          return l.length?'<section><h3>'+esc(ob.nombre)+' <span class="bd-gn">'+l.length+'</span></h3><ul>'+l.map(function(x){return '<li>'+esc(B.titulo(ob,x)||'Sin nombre')+'</li>'}).join('')+'</ul></section>':'';
        }).join('');
      }).join('');
      $('.bd-rel',d).innerHTML=html?'<h3 class="bd-rel-t">Relacionadas</h3>'+html:'';
    });
    /* Lo que se cambia en la ficha se guarda igual que en la tabla */
    d.addEventListener('change',function(e){
      var t=e.target,c=B.col(b,t.getAttribute('data-c'));if(!c)return;
      var ff=fila(fid),val=t.type==='checkbox'?t.checked:B.capturar(c,t.value),m=t.id;
      ponerValor(ff,c,val).then(function(){pintarFicha();pintar();var x=document.getElementById(m);if(x)x.focus()});
    });
    d.addEventListener('click',function(e){
      var t=e.target.closest('[data-multi]');if(t){multiple(fila(fid),B.col(b,t.getAttribute('data-c')),t);return}
      if(e.target.closest('[data-borrar]')){
        var ff=fila(fid);
        registrar({tipo:'filas',antes:[B.clonar(ff)],despues:[],que:'la fila eliminada'});
        B.borrarFila(ff).then(function(){
          d.close();pintar();
          decir('Se eliminó «'+(B.titulo(b,ff)||'la fila')+'». Ctrl+Z la regresa.');
          if(AT.aviso)AT.aviso('Se eliminó la fila «'+(B.titulo(b,ff)||'Sin nombre')+'».','Deshacer',deshacerUno);
        });
      }
    });
    d.addEventListener('close',function(){pintar({sel:'[data-ficha="'+fid+'"]'})});
    abrirDlg(d,null,nueva?'[data-c="'+b.columnas[0].id+'"]':'input,select,button.bd-multi,[data-cerrar]');
  }
  /* Las opciones de una columna (o una columna nueva) */
  function columna(cid,boton){
    var c=cid?B.clonar(B.col(b,cid)):{id:B.nuevoId('c'),nombre:'',tipo:'texto'},nueva=!cid,primera=cid&&b.columnas[0].id===cid,v=vista();
    B.todas().then(function(bs){
      bs.forEach(function(x){if(x.id!==b.id)B.cargar(x.id)});
      var rels=b.columnas.filter(function(k){return k.tipo==='relacion'});
      var d=dialogo('bd-col',nueva?'Columna nueva':'Columna «'+c.nombre+'»',
        '<form class="pl-form" method="dialog">'+
        '<label class="campo-l"><span>Nombre</span><input type="text" name="nombre" maxlength="60" value="'+esc(c.nombre)+'" required></label>'+
        '<label class="campo-l"><span>Tipo</span><select name="tipo"'+(primera?' disabled':'')+'>'+opciones(B.TIPOS,c.tipo)+'</select></label>'+
        (primera?'<p class="hint">La primera columna es el nombre de cada fila: siempre es de texto.</p>':'')+
        '<label class="campo-l" data-si="seleccion multiple"><span>Opciones (una por renglón)</span><textarea name="opciones" rows="4">'+esc((c.opciones||[]).join('\n'))+'</textarea></label>'+
        '<label class="campo-l" data-si="relacion"><span>Con la base</span><select name="base">'+opciones(bs.map(function(x){return [x.id,x.id===b.id?x.nombre+' (esta misma)':x.nombre]}),c.base||'')+'</select></label>'+
        '<label class="campo-l" data-si="referencia"><span>De la relación</span><select name="rel"><option value=""></option>'+opciones(rels.map(function(k){return [k.id,k.nombre]}),c.rel||'')+'</select></label>'+
        '<label class="campo-l" data-si="referencia"><span>Trae el dato</span><select name="campo"></select></label>'+
        '<label class="campo-l" data-si="suma"><span>Suma de la base</span><select name="sbase"><option value=""></option>'+opciones(bs.filter(function(x){return x.columnas.some(function(k){return k.tipo==='relacion'&&k.base===b.id})}).map(function(x){return [x.id,x.nombre]}),c.tipo==='suma'?c.base:'')+'</select></label>'+
        '<label class="campo-l" data-si="suma"><span>Las filas que se relacionan por</span><select name="srel"></select></label>'+
        '<label class="campo-l" data-si="suma"><span>Suma el campo</span><select name="scampo"></select></label>'+
        '<label class="campo-l" data-si="formula"><span>Fórmula</span><input type="text" name="expr" value="'+esc(c.expr||'')+'" placeholder="{Cantidad} * {Precio}" autocomplete="off" spellcheck="false"></label>'+
        '<p class="hint" data-si="formula">Usa el nombre de otras columnas entre llaves, + − × ÷ y paréntesis. También compara y decide: SI({Existencias} &lt; {Mínimo}; "Bajo"; "Bien"), MAX, MIN, ENTERO, REDONDEAR y DIAS({Vence}) (días que faltan). <span class="bd-prev" aria-live="polite"></span></p>'+
        '<label class="pl-op" data-si="formula suma"><input type="checkbox" name="moneda"'+(c.moneda?' checked':'')+'><span>Mostrar en pesos</span></label>'+
        '<label class="campo-l"><span>Total al pie</span><select name="pie">'+opciones(B.PIES,c.pie||'')+'</select></label>'+
        '<div class="bd-col-ops"><label class="pl-op"><input type="checkbox" name="negritas"'+(c.negritas?' checked':'')+'><span>Negritas</span></label>'+
        '<label class="pl-op"><input type="checkbox" name="resaltado"'+(c.resaltado?' checked':'')+'><span>Resaltado</span></label>'+
        (primera?'':'<label class="pl-op"><input type="checkbox" name="oculta"'+(v.ocultas.indexOf(c.id)>=0?' checked':'')+'><span>Ocultar en esta vista</span></label>')+'</div>'+
        '<fieldset class="bd-colores"><legend>Color según el valor</legend>'+[0,1,2].map(function(i){var r=(c.colores||[])[i]||{};
          return '<div class="bd-regla"><select name="cop'+i+'" aria-label="Regla '+(i+1)+': condición">'+opciones([['igual','es'],['distinto','no es'],['contiene','contiene'],['mayor','es mayor que'],['menor','es menor que'],['vacio','está vacío']],r.op||'igual')+'</select>'+
            '<input type="text" name="cval'+i+'" value="'+esc(r.val==null?'':r.val)+'" aria-label="Regla '+(i+1)+': valor" autocomplete="off">'+
            '<select name="cton'+i+'" aria-label="Regla '+(i+1)+': color">'+opciones(B.TONOS,r.tono||'')+'</select></div>'}).join('')+
          '<p class="hint">La primera regla que se cumple pinta la celda. Ejemplo: es «Agotado» → Rojo.</p></fieldset>'+
        (nueva||primera?'':'<div class="td-bt bd-mover-c"><button class="btn" type="button" data-mover="-1">← Mover a la izquierda</button><button class="btn" type="button" data-mover="1">Mover a la derecha →</button></div>')+
        '<p class="td-msg" data-msg role="status"></p>'+
        '<div class="td-bt"><button class="btn pri" type="submit">'+(nueva?'Agregar columna':'Guardar')+'</button>'+(nueva||primera?'':'<button class="btn danger" type="button" data-eliminar>Eliminar columna</button>')+'</div></form>');
      var form=$('form',d);
      function sel(n){return form.elements[n]}
      function llenar(s,cols,v0){s.innerHTML='<option value=""></option>'+opciones(cols.map(function(k){return [k.id,k.nombre]}),v0||'')}
      function campoRef(){var rc=B.col(b,sel('rel').value),tb=rc&&B.base(rc.base);llenar(sel('campo'),tb?tb.columnas:[],c.campo)}
      function camposSuma(){var sb=B.base(sel('sbase').value);llenar(sel('srel'),sb?sb.columnas.filter(function(k){return k.tipo==='relacion'&&k.base===b.id}):[],c.rel);
        llenar(sel('scampo'),sb?sb.columnas.filter(function(k){return B.esNumerica(sb,k)}):[],c.campo)}
      function mostrar(){
        var t=sel('tipo').value;
        $$('[data-si]',d).forEach(function(x){x.hidden=x.getAttribute('data-si').split(' ').indexOf(t)<0});
        vista_previa();
      }
      function vista_previa(){
        var p=$('.bd-prev',d),f0=B.filas(b.id)[0];if(!p)return;
        if(sel('tipo').value!=='formula'){p.textContent='';return}
        var ex=sel('expr').value.trim();
        if(!ex){p.textContent='';return}
        if(!B.compilar(ex)){p.textContent='Así como está, la fórmula tiene un error.';return}
        var faltan=B.referencias(ex).filter(function(n){return !B.colPorNombre(b,n)});
        if(faltan.length){p.textContent='No hay columna «'+faltan[0]+'».';return}
        if(f0){var t=B.texto(b,f0,{id:c.id,tipo:'formula',expr:ex,moneda:sel('moneda').checked});p.textContent='En la primera fila da: '+t+'.'}
      }
      sel('rel').addEventListener('change',function(){c.campo='';campoRef()});
      sel('sbase').addEventListener('change',function(){c.rel='';c.campo='';camposSuma()});
      sel('tipo').addEventListener('change',mostrar);
      sel('expr').addEventListener('input',vista_previa);
      Promise.all(bs.map(function(x){return B.cargar(x.id)})).then(function(){campoRef();camposSuma()});
      mostrar();
      d.addEventListener('click',function(e){
        var mv=e.target.closest('[data-mover]');
        if(mv){
          var dir=+mv.getAttribute('data-mover'),i=b.columnas.map(function(k){return k.id}).indexOf(c.id),j=i+dir;
          if(j<1||j>=b.columnas.length){$('[data-msg]',d).textContent=dir<0?'Ya está junto al nombre.':'Ya es la última.';return}
          cambiarBase(function(x){var k=x.columnas.splice(i,1)[0];x.columnas.splice(j,0,k)},'mover la columna').then(function(){$('[data-msg]',d).textContent='Columna movida.'});
          return;
        }
        var el=e.target.closest('[data-eliminar]');
        if(el){
          if(el.getAttribute('data-seguro')!=='1'){el.setAttribute('data-seguro','1');el.textContent='¿Seguro? Toca otra vez para eliminarla';return}
          var filasAntes=B.clonar(B.filas(b.id));
          cambiarBase(function(x){x.columnas=x.columnas.filter(function(k){return k.id!==c.id});x.vistas.forEach(function(w){w.ocultas=w.ocultas.filter(function(o){return o!==c.id});if(w.agrupar===c.id)delete w.agrupar})},'eliminar la columna «'+c.nombre+'»',null)
            .then(function(){d.close();decir('Se eliminó la columna «'+c.nombre+'». Ctrl+Z la regresa.');void filasAntes});
        }
      });
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var nombre=sel('nombre').value.replace(/\s+/g,' ').trim(),tipo=primera?'texto':sel('tipo').value,msg=$('[data-msg]',d);
        if(!nombre){msg.textContent='Escribe el nombre de la columna.';sel('nombre').focus();return}
        if(b.columnas.some(function(k){return k.id!==c.id&&B.sinAcentos(k.nombre)===B.sinAcentos(nombre)})){msg.textContent='Ya hay una columna con ese nombre.';sel('nombre').focus();return}
        var x={id:c.id,nombre:nombre,tipo:tipo};
        if(tipo==='seleccion'||tipo==='multiple')x.opciones=sel('opciones').value.split(/\n/).map(function(s){return s.trim()}).filter(function(s,i,a){return s&&a.indexOf(s)===i});
        if(tipo==='relacion'){x.base=sel('base').value;if(!x.base){msg.textContent='Elige con qué base se relaciona.';return}}
        if(tipo==='referencia'){x.rel=sel('rel').value;x.campo=sel('campo').value;if(!x.rel||!x.campo){msg.textContent='Elige la relación y el dato que trae.';return}}
        if(tipo==='suma'){x.base=sel('sbase').value;x.rel=sel('srel').value;x.campo=sel('scampo').value;if(!x.base||!x.rel||!x.campo){msg.textContent='Elige la base, la relación y el campo que se suma.';return}}
        if(tipo==='formula'){x.expr=sel('expr').value.trim();if(!B.compilar(x.expr)){msg.textContent='La fórmula tiene un error. Ejemplo: {Cantidad} * {Precio}';sel('expr').focus();return}}
        if((tipo==='formula'||tipo==='suma')&&sel('moneda').checked)x.moneda=true;
        if(sel('pie').value)x.pie=sel('pie').value;
        if(sel('negritas').checked)x.negritas=true;
        if(sel('resaltado').checked)x.resaltado=true;
        var colores=[0,1,2].map(function(i){return {op:sel('cop'+i).value,val:sel('cval'+i).value.trim(),tono:sel('cton'+i).value}}).filter(function(r){return r.tono&&(r.val!==''||r.op==='vacio')});
        if(colores.length)x.colores=colores;
        var oculta=!primera&&sel('oculta').checked,viejo=nueva?null:B.col(b,c.id);
        /* Cambiar de tipo convierte lo escrito; renombrar actualiza las fórmulas que la usan */
        var convertir=viejo&&viejo.tipo!==tipo&&!B.CALCULADO[tipo]&&!B.CALCULADO[viejo.tipo]&&tipo!=='relacion'&&viejo.tipo!=='relacion';
        var antesFilas=convertir?B.clonar(B.filas(b.id)):null;
        cambiarBase(function(base){
          if(nueva)base.columnas.push(x);else base.columnas=base.columnas.map(function(k){return k.id===x.id?x:k});
          if(viejo&&viejo.nombre!==nombre)base.columnas.forEach(function(k){if(k.tipo==='formula'&&k.expr)k.expr=k.expr.replace(/\{([^}]*)\}/g,function(m0,n){return B.sinAcentos(n.trim())===B.sinAcentos(viejo.nombre)?'{'+nombre+'}':m0})});
          base.vistas.forEach(function(w){if(w.id===v.id){w.ocultas=w.ocultas.filter(function(o){return o!==x.id});if(oculta)w.ocultas.push(x.id)}});
        },nueva?'la columna nueva':'el cambio en la columna «'+nombre+'»',null).then(function(){
          if(convertir){
            var conv=antesFilas.map(function(f){
              var nf=B.clonar(f),r=f.v[x.id];
              if(r==null||r==='')return nf;
              var val=B.capturar(x,typeof r==='number'||typeof r==='boolean'?r:Array.isArray(r)?r.join(', '):String(r));
              if(val===''||Array.isArray(val)&&!val.length)delete nf.v[x.id];else nf.v[x.id]=val;
              return nf;
            });
            registrar({tipo:'filas',antes:antesFilas,despues:B.clonar(conv),que:'los valores convertidos'});
            return B.guardarFilas(conv);
          }
        }).then(function(){d.close();pintar({sel:'[data-col="'+x.id+'"]'});decir(nueva?'Columna «'+nombre+'» agregada.':'Columna guardada.')});
      });
      abrirDlg(d,boton,'[name="nombre"]');
    });
  }
  /* Ajustar la vista: nombre, tipo, búsqueda, filtro, orden, agrupar, fecha y columnas visibles */
  function ajustarVista(boton){
    var v=B.clonar(vista()),cols=b.columnas.map(function(c){return [c.id,c.nombre]}),sinCol=[['','—']];
    var d=dialogo('bd-vis','Ajustar la vista «'+v.nombre+'»','<form class="pl-form" method="dialog">'+
      '<div class="bd-2"><label class="campo-l"><span>Nombre de la vista</span><input type="text" name="nombre" maxlength="40" value="'+esc(v.nombre)+'" required></label>'+
      '<label class="campo-l"><span>Se ve como</span><select name="tipo">'+opciones(VISTAS,v.tipo)+'</select></label></div>'+
      '<label class="campo-l"><span>Buscar siempre</span><input type="text" name="q" value="'+esc(v.q)+'" placeholder="Palabras que deben aparecer"></label>'+
      '<fieldset class="bd-fs"><legend>Filtro</legend><div class="bd-3"><label class="campo-l"><span>Columna</span><select name="fcol">'+opciones(sinCol.concat(cols),v.f.col)+'</select></label>'+
        '<label class="campo-l"><span>Condición</span><select name="fop">'+opciones(B.OPS,v.f.op)+'</select></label>'+
        '<label class="campo-l"><span>Valor</span><input type="text" name="fval" value="'+esc(v.f.val)+'"></label></div></fieldset>'+
      '<fieldset class="bd-fs"><legend>Orden</legend><div class="bd-2"><label class="campo-l"><span>Primero por</span><select name="scol">'+opciones(sinCol.concat(cols),v.s.col)+'</select></label>'+
        '<label class="campo-l"><span>Dirección</span><select name="sdir">'+opciones([['1','De menor a mayor (A→Z)'],['-1','De mayor a menor (Z→A)']],String(v.s.dir))+'</select></label>'+
        '<label class="campo-l"><span>Luego por</span><select name="s2col">'+opciones(sinCol.concat(cols),v.s2.col)+'</select></label>'+
        '<label class="campo-l"><span>Dirección</span><select name="s2dir">'+opciones([['1','De menor a mayor (A→Z)'],['-1','De mayor a menor (Z→A)']],String(v.s2.dir))+'</select></label></div></fieldset>'+
      '<label class="campo-l" data-vt="tabla tablero"><span>Agrupar por</span><select name="agrupar">'+opciones(sinCol.concat(b.columnas.filter(function(c){return ['seleccion','texto','casilla','relacion','fecha','telefono'].indexOf(c.tipo)>=0}).map(function(c){return [c.id,c.nombre]})),v.agrupar||'')+'</select></label>'+
      '<label class="campo-l" data-vt="calendario"><span>Fecha del calendario</span><select name="fecha">'+opciones(sinCol.concat(b.columnas.filter(function(c){return c.tipo==='fecha'}).map(function(c){return [c.id,c.nombre]})),v.fecha||'')+'</select></label>'+
      '<fieldset class="bd-fs"><legend>Columnas que se ven</legend><div class="bd-col-ops">'+b.columnas.map(function(c,i){
        return '<label class="pl-op"><input type="checkbox" name="ver" value="'+esc(c.id)+'"'+(i===0||v.ocultas.indexOf(c.id)<0?' checked':'')+(i===0?' disabled':'')+'><span>'+esc(c.nombre)+'</span></label>';
      }).join('')+'</div></fieldset>'+
      '<p class="td-msg" data-msg role="status"></p>'+
      '<div class="td-bt"><button class="btn pri" type="submit">Guardar vista</button>'+(b.vistas.length>1?'<button class="btn danger" type="button" data-eliminar>Eliminar vista</button>':'')+'</div></form>');
    var form=$('form',d);
    function tipoVista(){var t=form.elements.tipo.value;$$('[data-vt]',d).forEach(function(x){x.hidden=x.getAttribute('data-vt').split(' ').indexOf(t)<0})}
    form.elements.tipo.addEventListener('change',tipoVista);tipoVista();
    d.addEventListener('click',function(e){
      var el=e.target.closest('[data-eliminar]');if(!el)return;
      if(el.getAttribute('data-seguro')!=='1'){el.setAttribute('data-seguro','1');el.textContent='¿Seguro? Toca otra vez';return}
      cambiarBase(function(x){x.vistas=x.vistas.filter(function(w){return w.id!==v.id})},'eliminar la vista',null).then(function(){
        vistaId=b.vistas[0].id;if(op.alCambiar)op.alCambiar({vista:vistaId});d.close();pintar({sel:'[data-vista="'+vistaId+'"]'});decir('Vista eliminada.');
      });
    });
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var E=form.elements,nombre=E.nombre.value.trim();
      if(!nombre){$('[data-msg]',d).textContent='Escribe el nombre de la vista.';E.nombre.focus();return}
      var nv={id:v.id,nombre:nombre,tipo:E.tipo.value,q:E.q.value.trim(),f:{col:E.fcol.value,op:E.fop.value,val:E.fval.value.trim()},
        s:{col:E.scol.value,dir:+E.sdir.value===-1?-1:1},s2:{col:E.s2col.value,dir:+E.s2dir.value===-1?-1:1},
        ocultas:b.columnas.slice(1).map(function(c){return c.id}).filter(function(id){return !$$('input[name="ver"]',d).some(function(x){return x.value===id&&x.checked})})};
      if(E.agrupar.value)nv.agrupar=E.agrupar.value;
      if(E.fecha.value)nv.fecha=E.fecha.value;
      if(v.mes)nv.mes=v.mes;
      cambiarBase(function(x){x.vistas=x.vistas.map(function(w){return w.id===v.id?nv:w})},'el ajuste de la vista',null).then(function(){d.close();pintar({sel:'[data-vista="'+v.id+'"]'});decir('Vista guardada.')});
    });
    abrirDlg(d,boton,'[name="nombre"]');
  }
  /* Importar CSV a esta base: las columnas que ya están, por nombre; las demás, nuevas */
  function importarCSV(boton){
    var d=dialogo('bd-csv','Importar CSV a «'+b.nombre+'»','<p class="td-p">Un archivo CSV de Excel, Hojas de cálculo u otra app. La primera fila son los nombres de las columnas: las que ya están aquí se llenan; las demás se agregan con su tipo (números, pesos como $1,250.50, fechas día/mes/año, sí o no).</p>'+
      '<div class="td-bt"><button class="btn pri" type="button" data-archivo>Elegir archivo</button><input type="file" accept=".csv,text/csv,text/plain" hidden></div>'+
      '<label class="campo-l"><span>O pega aquí el contenido</span><textarea rows="5" data-texto></textarea></label>'+
      '<p class="td-msg" data-msg role="status"></p><div class="td-bt"><button class="btn" type="button" data-pegar>Importar lo pegado</button></div>');
    var inp=$('input[type="file"]',d);
    function importarTexto(txt){
      var r=B.deCSV(b,txt),msg=$('[data-msg]',d);
      if(r.error){msg.textContent=r.error;return}
      var antesBase=B.clonar(b),nuevasFilas=r.filas.map(function(v,i){var f=B.nuevaFila(b.id,v);f.orden+=i;return f});
      var nb=B.clonar(b);r.nuevas.forEach(function(c){nb.columnas.push(c)});
      b=nb;
      B.guardarBase(nb).then(function(){return B.guardarFilas(nuevasFilas)}).then(function(){
        registrar({tipo:'base',antes:antesBase,despues:B.clonar(nb),que:'las columnas importadas'});
        registrar({tipo:'filas',antes:[],despues:B.clonar(nuevasFilas),que:'las filas importadas'});
        d.close();pintar();
        decir('Se importaron '+nuevasFilas.length+(nuevasFilas.length===1?' fila':' filas')+(r.nuevas.length?' y '+r.nuevas.length+(r.nuevas.length===1?' columna nueva':' columnas nuevas'):'')+'.');
      });
    }
    $('[data-archivo]',d).addEventListener('click',function(){inp.click()});
    inp.addEventListener('change',function(){var f=inp.files&&inp.files[0];if(!f)return;if(f.size>10*1024*1024){$('[data-msg]',d).textContent='El archivo es demasiado grande.';return}f.text().then(importarTexto)});
    $('[data-pegar]',d).addEventListener('click',function(){var t=$('[data-texto]',d).value;if(!t.trim()){$('[data-msg]',d).textContent='Pega primero el contenido del CSV.';return}importarTexto(t)});
    abrirDlg(d,boton,'[data-archivo]');
  }

  return {destruir:function(){vivo=false;if(quitar)quitar();Object.keys(esperaTexto).forEach(function(k){clearTimeout(esperaTexto[k])})},
    base:function(){return b},vista:function(){return vistaId}};
}

/* ---------- Al imprimir: la vista elegida como tabla (sin campos) ---------- */
function tablaPapel(a){
  var s=document.createElement('section');s.className='bd bd-papel';
  var b=B.base(a.base);
  if(!b){s.innerHTML='<p class="hint">Base de datos.</p>';return s}
  var v=b.vistas.filter(function(x){return x.id===a.vista})[0]||b.vistas[0],cols=b.columnas.filter(function(c,i){return i===0||v.ocultas.indexOf(c.id)<0}),fs=B.filasVista(b,v);
  var pie=cols.some(function(c){return c.pie});
  s.innerHTML='<h3 class="bd-nombre-t">'+esc(b.nombre)+(v.nombre&&b.vistas.length>1&&v.nombre!==b.nombre?' <small>'+esc(v.nombre)+'</small>':'')+'</h3>'+
    '<table class="nb-tab bd-tabla-p'+(cols.length>10?' bd-p-muchas':cols.length>6?' bd-p-varias':'')+'"><thead><tr>'+cols.map(function(c){return '<th scope="col"'+(B.esNumerica(b,c)?' class="num"':'')+'>'+esc(c.nombre)+'</th>'}).join('')+'</tr></thead><tbody>'+
    fs.map(function(f){return '<tr>'+cols.map(function(c){var n=B.valor(b,f,c),t=B.tonoCelda(b,f,c);return '<td class="'+(B.esNumerica(b,c)?'num':'')+(typeof n==='number'&&n<0?' neg':'')+(c.negritas?' bd-neg':'')+(t?' bd-t-'+t:'')+'">'+esc(B.texto(b,f,c))+'</td>'}).join('')+'</tr>'}).join('')+'</tbody>'+
    (pie&&fs.length?'<tfoot><tr class="nb-tot">'+cols.map(function(c){var t=B.total(b,fs,c);return '<td'+(B.esNumerica(b,c)?' class="num"':'')+'>'+(t?esc(B.totalTexto(t)):'')+'</td>'}).join('')+'</tr></tfoot>':'')+'</table>'+
    '<p class="bd-n">'+fs.length+(fs.length===1?' fila':' filas')+'</p>';
  return s;
}

/* ---------- Al leer y al imprimir ---------- */
var montajes=0;
function contenedor(){var d=document.createElement('section');d.id='bdm'+(++montajes);return d}
if(AT.bloques&&AT.bloques.registrar){
  AT.bloques.registrar('basedatos',{
    dibujar:function(n,c,h){
      var a=h.attrs(n),pag=document.body.getAttribute('data-pagina');
      if(pag!=='documento')return tablaPapel(a);
      var d=contenedor(),id=a.id;
      d.setAttribute('aria-label','Base de datos');
      /* En tus documentos se usa igual que al editar; lo que cambia el bloque (vista, base nueva) se guarda en la página */
      var editable=!!(AT.docActual&&AT.docCambio);
      montar(d,{base:a.base,vista:a.vista,semilla:a.semilla,clave:id,editable:editable,alCambiar:function(x){
        var blk=(AT.docActual&&AT.docActual.contenido.content||[]).filter(function(bq){return bq.type==='basedatos'&&bq.attrs&&bq.attrs.id===id})[0];
        if(!blk||!AT.docCambio)return;
        if(x.base){blk.attrs.base=x.base;delete blk.attrs.semilla}
        if(x.vista)blk.attrs.vista=x.vista;
        AT.docCambio();
      }});
      return d;
    },
    texto:function(n){var a=n.attrs||{};return a.base?B.textoPlano(a.base)+'\n':'Base de datos\n'}
  });
}
if(AT.piezas&&AT.piezas.md)AT.piezas.md.basedatos=function(n){var a=n.attrs||{};return (a.base&&B.tablaMd(a.base,a.vista))||'**Base de datos**'};

/* ---------- Editor ---------- */
var T=window.Tiptap;
if(T&&AT.editor){
  var abrirNueva=false;
  var Nodo=T.Node.create({
    name:'basedatos',group:'block',atom:true,selectable:true,draggable:false,
    addAttributes:function(){
      function attr(k,def,json){return {default:def,parseHTML:function(e){var v=e.getAttribute('data-'+k);if(v==null)return def;if(!json)return v;try{return JSON.parse(v)}catch(x){return def}},
        renderHTML:function(a){var o={};if(a[k]!=null&&a[k]!=='')o['data-'+k]=json?JSON.stringify(a[k]):a[k];return o}}}
      return {base:attr('base',''),vista:attr('vista',''),semilla:attr('semilla',null,true)};
    },
    parseHTML:function(){return [{tag:'div[data-basedatos]'}]},
    renderHTML:function(o){return ['div',T.mergeAttributes(o.HTMLAttributes,{'data-basedatos':''})]},
    addNodeView:function(){
      return function(p){
        var dom=contenedor(),node=p.node,ctl;
        dom.contentEditable='false';dom.className='bd-ed';
        function poner(x){
          var pos=typeof p.getPos==='function'?p.getPos():null;if(pos==null)return;
          var tr=p.editor.state.tr;
          if(x.base){tr.setNodeAttribute(pos,'base',x.base);tr.setNodeAttribute(pos,'semilla',null)}
          if(x.vista)tr.setNodeAttribute(pos,'vista',x.vista);
          p.editor.view.dispatch(tr);
        }
        ctl=montar(dom,{base:node.attrs.base,vista:node.attrs.vista,semilla:node.attrs.semilla,clave:node.attrs.id,editable:true,alCambiar:poner,enfocar:abrirNueva});
        abrirNueva=false;
        return {dom:dom,
          update:function(n){if(n.type.name!=='basedatos')return false;var cambio=n.attrs.base!==node.attrs.base&&!!node.attrs.base;node=n;if(cambio){ctl.destruir();ctl=montar(dom,{base:n.attrs.base,vista:n.attrs.vista,editable:true,alCambiar:poner})}return true},
          destroy:function(){ctl.destruir()},
          stopEvent:function(){return true},
          ignoreMutation:function(){return true}};
      };
    }
  });
  AT.editorExtensiones=(AT.editorExtensiones||[]).concat([Nodo]);
  if(AT.editorConId)AT.editorConId.push('basedatos');
  if(AT.editorInsertar)AT.editorInsertar.push({k:'base',t:'Base de datos',d:'Filas y columnas con tipos, fórmulas, relaciones y vistas',i:'datos',
    p:'base datos tabla inventario clientes productos columnas filas vistas tablero galeria calendario formula relacion csv',
    f:function(c){abrirNueva=true;return c.insertContent({type:'basedatos',attrs:{semilla:SEMILLA()}})}});
}
/* La base vacía de «/base»: el nombre y una vista de tabla */
function SEMILLA(){return {nombre:'Base de datos',columnas:[{id:'c-nombre',nombre:'Nombre',tipo:'texto'},{id:B.nuevoId('c'),nombre:'Notas',tipo:'texto'}],vistas:[B.vistaNueva('Tabla','tabla')],filas:[]}}

AT.basedatos={montar:montar,tablaPapel:tablaPapel,semillaVacia:SEMILLA};
})();
