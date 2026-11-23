/* OneBook: búsqueda (Ctrl K o «Buscar» en la barra lateral).
   Busca en las lecciones (títulos, secciones y texto), en tus documentos, en las notas rápidas y en los
   marcadores. Todo pasa en tu navegador: las lecciones se leen de sus propios archivos (que el service worker
   guarda para usarlas sin conexión) y lo tuyo, de AT.datos.
   AT.indice.cargar() devuelve las entradas y AT.indice.buscar(texto) las ordena por relevancia;
   el editor las usa también para citar con «@». */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,RAIZ=AT.rutas.raiz;

function norma(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function recorte(t,n){t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':t}

/* ---------- Índice ---------- */
var lecciones=null;
/* Páginas del sitio que también se buscan, además de las lecciones del catálogo */
var PAGINAS=[{id:'acerca',titulo:'Cómo está hecho OneBook',ruta:'acerca.html',icono:'codigo',sub:'Sobre OneBook'}];
/* Entradas de una lección (o página): la lección, cada sección (con su texto) y cada bloque */
function entradasDeLeccion(l,doc){
  var url=l.ruta,out=[{tipo:'leccion',titulo:doc.titulo||l.titulo,texto:'',href:url,sub:l.sub,icono:l.icono||'page',doc:l.id}];
  var sec=null;
  (doc.contenido&&doc.contenido.content||[]).forEach(function(b){
    var id=b.attrs&&b.attrs.id,t=AT.bloques.textoDe(b).replace(/\s+/g,' ').trim();
    if(b.type==='heading'&&b.attrs.level===2&&id){
      sec={tipo:'seccion',titulo:t,texto:'',href:url+'#'+id,sub:l.titulo,icono:'indice',doc:l.id,bloque:id};
      out.push(sec);return;
    }
    if(!t||b.type==='indice')return;
    if(sec)sec.texto+=' '+t;
    out.push({tipo:'bloque',titulo:recorte(t,90),texto:t,href:url+'#'+id,sub:l.titulo+(sec?' · '+sec.titulo:''),icono:'texto',doc:l.id,bloque:id,oculto:true});
  });
  return out;
}
function cargarLecciones(){
  if(lecciones)return lecciones;
  var lista=[];
  AT.catalogo.forEach(function(g){g.lecciones.forEach(function(l){
    if(l.archivo)lista.push({id:l.id,titulo:l.titulo,icono:l.icono,ruta:'lecciones/'+l.archivo,sub:'Lección'});
  })});
  lista=lista.concat(PAGINAS);
  /* Proyectos: se buscan por su título y descripción (sin abrir su archivo) */
  var proy=(AT.proyectos||[]).map(function(p){return {tipo:'leccion',titulo:p.titulo,texto:p.descripcion||'',href:'proyectos/'+p.archivo,sub:'Proyecto',icono:p.icono||'proyecto',doc:'proyecto-'+p.id}});
  /* Rutas de aprendizaje: por su título, su descripción y los nombres de sus módulos */
  proy=proy.concat((AT.caminos||[]).map(function(c){return {tipo:'leccion',titulo:'Ruta: '+c.titulo,texto:c.descripcion+' '+c.modulos.map(function(m){return m.titulo}).join(', '),href:'rutas.html#'+c.id,sub:'Ruta',icono:c.icono||'ruta',doc:'ruta-'+c.id}}));
  lecciones=Promise.all(lista.map(function(l){
    /* La lección abierta ya está en memoria */
    if(AT.documento&&AT.documento.id===l.id)return Promise.resolve(entradasDeLeccion(l,AT.documento));
    var sola=[{tipo:'leccion',titulo:l.titulo,texto:'',href:l.ruta,sub:l.sub,icono:l.icono||'page'}];
    return fetch(RAIZ+l.ruta).then(function(r){return r.text()}).then(function(html){
      var d=new DOMParser().parseFromString(html,'text/html'),s=d.getElementById('documento');
      if(!s)return sola;
      return entradasDeLeccion(l,JSON.parse(s.textContent));
    }).catch(function(){return sola});
  })).then(function(r){return [].concat.apply(proy,r)});
  return lecciones;
}
function cargarTuyo(){
  return Promise.all([AT.datos.documentos.todos(),AT.datos.notas.todas(),AT.datos.marcadores.todos()]).then(function(r){
    var out=[],porId={};
    AT.catalogo.forEach(function(g){g.lecciones.forEach(function(l){porId[l.id]=l})});
    r[0].forEach(function(d){
      var tipo=AT.tiposDoc&&AT.tiposDoc[d.tipo],href='documento.html?id='+encodeURIComponent(d.id);
      out.push({tipo:'documento',titulo:d.titulo||'Sin título',texto:AT.bloques.texto(d),href:href,sub:tipo?tipo.nombre:'Documento',icono:tipo?tipo.icono:'page',docId:d.id,editado:d.editado});
      var sec=null;
      (d.contenido.content||[]).forEach(function(b){
        var id=b.attrs&&b.attrs.id;
        if(b.type==='heading'&&b.attrs&&b.attrs.level===2&&id){
          sec={tipo:'seccion-doc',titulo:AT.bloques.textoDe(b).trim()||'Sección sin título',texto:'',href:href+'#'+id,sub:d.titulo||'Sin título',icono:'indice',docId:d.id,bloque:id,oculto:true};
          out.push(sec);
        }else if(sec)sec.texto+=' '+AT.bloques.textoDe(b);
      });
    });
    r[1].forEach(function(n){
      var l=porId[n.id];
      if(!l||!l.archivo||!n.texto||!n.texto.trim())return;
      out.push({tipo:'nota',titulo:'Nota de '+l.titulo,texto:n.texto,href:'lecciones/'+l.archivo+'#apuntes',sub:'Nota rápida',icono:'note'});
    });
    r[2].forEach(function(m){
      out.push({tipo:'marcador',titulo:m.texto,texto:m.seccion||'',href:m.url+'#'+m.bloque,sub:'Marcador · '+m.docTitulo,icono:'marcador',doc:m.doc,bloque:m.bloque});
    });
    return out;
  });
}
function cargar(){
  return Promise.all([cargarLecciones(),cargarTuyo()]).then(function(r){return r[1].concat(r[0])});
}
/* Puntaje: todas las palabras deben aparecer; pesa más el título */
var PESO={marcador:6,documento:5,leccion:5,seccion:4,'seccion-doc':4,nota:2,bloque:1};
function buscar(q,entradas,max){
  var ps=norma(q).split(/\s+/).filter(Boolean);
  if(!ps.length)return [];
  var res=[];
  entradas.forEach(function(e){
    /* En un bloque suelto, el «título» es su propio texto: cuenta como texto */
    var t=e.tipo==='bloque'?'':norma(e.titulo),x=norma(e.texto),s=0,ok=true;
    ps.forEach(function(p){
      if(t.indexOf(p)===0)s+=12;
      else if(t.indexOf(' '+p)>=0)s+=9;
      else if(t.indexOf(p)>=0)s+=6;
      else if(x.indexOf(p)>=0)s+=2;
      else ok=false;
    });
    if(!ok)return;
    s+=PESO[e.tipo]||0;
    res.push({e:e,s:s});
  });
  res.sort(function(a,b){return b.s-a.s});
  /* A lo mucho 4 bloques sueltos: las secciones y los documentos van primero */
  var bloques=0;
  res=res.filter(function(r){return r.e.tipo!=='bloque'||++bloques<=4});
  return res.slice(0,max||30).map(function(r){return r.e});
}
/* Fragmento del texto alrededor de la primera palabra encontrada */
function fragmento(e,q){
  var ps=norma(q).split(/\s+/).filter(Boolean),t=String(e.texto||'').replace(/\s+/g,' ').trim(),nt=norma(t);
  if(!t||!ps.length)return '';
  var i=-1;ps.some(function(p){i=nt.indexOf(p);return i>=0});
  if(i<0)return '';
  var ini=Math.max(0,i-50),fin=Math.min(t.length,i+90);
  /* Sin cortar palabras */
  if(ini){var sp=t.indexOf(' ',ini);if(sp>0&&sp<i)ini=sp+1}
  if(fin<t.length){var sf=t.lastIndexOf(' ',fin);if(sf>i)fin=sf}
  return (ini?'…':'')+t.slice(ini,fin).trim()+(fin<t.length?'…':'');
}
AT.indice={cargar:cargar,buscar:buscar,fragmento:fragmento,norma:norma,olvidarTuyo:function(){}};

/* ---------- Ventana de búsqueda ---------- */
var dlg=null,abridor=null,entradas=[],resultados=[],activo=0,ultimaQ='';
var GRUPOS=[['leccion','Lecciones'],['documento','Tus documentos'],['marcador','Marcadores'],['nota','Notas rápidas']];
function grupoDe(e){return e.tipo==='seccion'||e.tipo==='bloque'?'leccion':e.tipo==='seccion-doc'?'documento':e.tipo}
function crear(){
  dlg=document.createElement('dialog');
  dlg.className='atajos buscar-dlg';
  dlg.setAttribute('aria-label','Buscar en OneBook');
  dlg.innerHTML='<div class="bus-campo">'+ico('investigacion')+
    '<input id="busQ" type="text" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Buscar en lecciones, documentos, notas y marcadores" '+
      'role="combobox" aria-expanded="false" aria-controls="busRes" aria-autocomplete="list" aria-label="Buscar">'+
    '<kbd class="bus-esc">Esc</kbd></div>'+
    '<div class="bus-res" id="busRes" role="listbox" aria-label="Resultados"></div>'+
    '<p class="bus-pie" id="busPie" role="status"></p>';
  document.body.appendChild(dlg);
  var q=$('#busQ',dlg);
  q.addEventListener('input',function(){pintar(q.value)});
  q.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();mover(1)}
    else if(e.key==='ArrowUp'){e.preventDefault();mover(-1)}
    else if(e.key==='Enter'){e.preventDefault();ir(resultados[activo])}
  });
  dlg.addEventListener('click',function(e){
    if(e.target===dlg){cerrar();return}
    var o=e.target.closest('.bus-o');
    if(o){e.preventDefault();ir(resultados[+o.getAttribute('data-i')])}
  });
  dlg.addEventListener('close',function(){if(abridor&&document.contains(abridor)&&abridor!==document.body)abridor.focus({preventScroll:true})});
}
function pintar(texto){
  ultimaQ=texto;
  var cont=$('#busRes',dlg),pie=$('#busPie',dlg),q=$('#busQ',dlg);
  if(!texto.trim()){
    resultados=[];cont.innerHTML='';
    pie.textContent='Escribe para buscar. Usa ↑ y ↓ para elegir y Enter para abrir.';
    q.setAttribute('aria-expanded','false');q.removeAttribute('aria-activedescendant');
    return;
  }
  var lista=buscar(texto,entradas,40);
  /* Se agrupan y se muestran a lo mucho 8 por grupo */
  resultados=[];var h='';
  GRUPOS.forEach(function(g){
    var de=lista.filter(function(e){return grupoDe(e)===g[0]}).slice(0,8);
    if(!de.length)return;
    h+='<div class="bus-g" role="group" aria-label="'+g[1]+'"><div class="bus-gt" aria-hidden="true">'+g[1]+'</div>';
    de.forEach(function(e){
      var i=resultados.length,frag=e.tipo==='marcador'||e.tipo==='leccion'?'':fragmento(e,texto);
      resultados.push(e);
      h+='<a class="bus-o" role="option" id="bus-o-'+i+'" data-i="'+i+'" href="'+esc(RAIZ+e.href)+'" tabindex="-1" aria-selected="false">'+ico(e.icono)+
        '<span class="bus-t"><b>'+esc(e.titulo)+'</b><small>'+esc(e.sub)+'</small>'+(frag?'<span class="bus-f">'+esc(frag)+'</span>':'')+'</span></a>';
    });
    h+='</div>';
  });
  cont.innerHTML=h;
  activo=0;
  q.setAttribute('aria-expanded',resultados.length?'true':'false');
  pie.textContent=resultados.length?(resultados.length===1?'1 resultado':resultados.length+' resultados'):'Nada coincide con «'+texto.trim()+'».';
  marcar();
}
function marcar(){
  var q=$('#busQ',dlg);
  $$('.bus-o',dlg).forEach(function(o,i){o.setAttribute('aria-selected',i===activo?'true':'false')});
  var o=$('#bus-o-'+activo,dlg);
  if(o){q.setAttribute('aria-activedescendant',o.id);o.scrollIntoView({block:'nearest'})}
  else q.removeAttribute('aria-activedescendant');
}
function mover(d){if(!resultados.length)return;activo=(activo+d+resultados.length)%resultados.length;marcar()}
function ir(e){
  if(!e)return;
  var destino=new URL(RAIZ+e.href,location.href);
  cerrar(true);
  /* Misma página: solo se va al bloque */
  if(destino.pathname===location.pathname&&destino.search===location.search&&destino.hash){
    var idb=decodeURIComponent(destino.hash.slice(1));
    /* En el editor, los bloques llevan su id en data-id */
    var b=document.getElementById(idb)||document.querySelector('[data-id="'+(window.CSS&&CSS.escape?CSS.escape(idb):idb)+'"]');
    if(destino.hash==='#apuntes'&&AT.hoja){AT.hoja.abrir();return}
    if(b){
      history.replaceState(null,'',destino.hash);
      if(b.tagName==='DETAILS')b.open=true;
      b.scrollIntoView({behavior:AT.reduce?'auto':'smooth',block:'start'});
      b.classList.remove('llegada');void b.offsetWidth;b.classList.add('llegada');
      b.setAttribute('tabindex','-1');b.focus({preventScroll:true});
      return;
    }
  }
  location.href=destino.href;
}
function abrir(){
  if(!dlg)crear();
  abridor=document.activeElement;
  if(AT.setNav)AT.setNav(false);
  if(AT.menu)AT.menu.cerrar();
  dlg.showModal();
  var q=$('#busQ',dlg);
  q.value=ultimaQ;q.select();
  $('#busPie',dlg).textContent='Cargando…';
  cargar().then(function(l){entradas=l;if(dlg.open)pintar(q.value)});
}
function cerrar(){if(dlg&&dlg.open)dlg.close()}
AT.buscar={abrir:abrir,cerrar:cerrar};

/* Ctrl K (⌘K en Mac). En el editor, con texto seleccionado, Ctrl K crea un enlace (lo atiende el editor) */
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&(e.key==='k'||e.key==='K')){
    if(e.defaultPrevented)return;
    e.preventDefault();
    if(dlg&&dlg.open)cerrar();else abrir();
  }
});
document.addEventListener('click',function(e){if(e.target.closest('#sideBuscar'))abrir()});
})();
