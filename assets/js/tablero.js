/* OneBook: el tablero (etapa Empresas, E4). Una cuadrícula de módulos que cada quien arma. El Inicio tiene el de la
   empresa («De tu empresa», lo arma quien la administra) y el tuyo («Lo tuyo»); cada sala tiene su portada (la arma
   quien administra la sala). Se guardan en la empresa (empresa.js: tablero y guardarTablero) y viajan en el respaldo;
   mientras nadie los arma, se ven los módulos de siempre (op.defecto).
   - Módulos (MODS): accesos rápidos, una página (así se ven «Mi negocio» y «Tu equipo»), indicadores, próximos
     vencimientos, inventario, gráfica de una base, tu equipo, avisos, actividad reciente, tus salas, favoritas y
     recientes, y nota. Los que son bloques (indicadores, vencimientos, inventario, reporte, equipo) se dibujan con
     bloques.js, igual que en una página; los de páginas solo usan lo que puedes ver.
   - Tres tamaños: chico (un tercio), mediano (dos tercios) y grande (todo el ancho); en pantallas angostas, menos
     columnas, y en el celular una.
   - «Editar»: arrastrar para mover (o «Antes» y «Después»), tamaño, configurar y quitar; «Agregar» abre el catálogo.
     Todo se guarda al momento. La nota se escribe directo y se guarda sola.
   Expone AT.tablero.montar(contenedor, op) y AT.tablero.MODS. inicio.js le da sus accesos rápidos (AT.tablero.acciones)
   y cómo crear «Mi negocio» y «Tu equipo» (AT.tablero.creadores). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,D=AT.datos;
var TAMS=[['s','Chico'],['m','Mediano'],['l','Grande']];
function nuevoId(){return 'm-'+Math.random().toString(36).slice(2,10)}
function tiene(m){return !m||!AT.perfil||AT.perfil.tiene(m)}
function visible(d){return (!D.acceso||D.acceso.puede(d,'ver'))&&!(D.deEstudio&&D.deEstudio(d))}
function porFecha(a,b){return (b.editado||'')<(a.editado||'')?-1:(b.editado||'')>(a.editado||'')?1:0}
function cuando(t){
  var d=new Date(t),min=(Date.now()-d)/6e4;
  if(isNaN(min))return '';
  if(min<1)return 'ahora';
  if(min<60)return 'hace '+Math.round(min)+' min';
  if(min<60*24&&new Date().getDate()===d.getDate())return 'hoy, '+d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'});
  return 'el '+d.toLocaleDateString('es-MX',{day:'numeric',month:'short'});
}
function enlace(d){
  var t=AT.tiposDoc&&AT.tiposDoc[d.tipo];
  return '<a href="'+AT.rutas.raiz+'documento.html?id='+encodeURIComponent(d.id)+'">'+ico(t?t.icono:'page')+'<span>'+esc(d.titulo||'Sin título')+'</span></a>';
}

/* Las páginas que el Inicio crea solo («Mi negocio» y «Tu equipo») no cuentan en las listas */
var SISTEMA={'d-minegocio':1,'d-miequipo':1};
/* Las páginas que ves (se leen una vez; si cambian, se vuelven a leer) */
var DOCS=null,TODAS=null,leyendo=null;
function docs(){
  if(DOCS)return Promise.resolve(DOCS);
  if(!leyendo)leyendo=D.documentos.todos().then(function(l){TODAS=l;DOCS=l.filter(visible);leyendo=null;return DOCS});
  return leyendo;
}
/* Un bloque de bloques.js dentro de un módulo */
var nb=0;
function bloque(el,tipo,attrs){
  var doc={formato:1,tipo:'notas',id:'d-tablero',titulo:'',props:[],contenido:{type:'doc',content:[{type:tipo,attrs:Object.assign({id:'b-tab'+(++nb)},attrs||{})}]}};
  el.innerHTML='';
  if(AT.bloques&&AT.bloques.dibujar)AT.bloques.dibujar(doc,el,{encabezado:false});
}
function vacio(el,t){el.innerHTML='<p class="tab-nada">'+esc(t)+'</p>'}

/* ---------- Los módulos ---------- */
var MODS={
  acciones:{nombre:'Accesos rápidos',desc:'Corte de hoy, nueva venta, fiado o un gasto, a un toque.',i:'crear',tam:'l',modulo:'negocio',capas:['empresa','persona'],
    pintar:function(el){
      var l=AT.tablero.acciones?AT.tablero.acciones():[];
      if(!l||!l.length){vacio(el,'No hay accesos rápidos para tu espacio.');return}
      el.innerHTML='<div class="ini-acc" data-acciones>'+l.map(function(a){return '<button type="button" class="ini-acc-b" data-accion="'+esc(a.k)+'">'+ico(a.i)+'<span>'+esc(a.t)+'</span></button>'}).join('')+'</div>';
    }},
  pagina:{nombre:'Una página',desc:'Los bloques de una de tus páginas, vivos (así se ven «Mi negocio» y «Tu equipo»).',i:'page',tam:'l',config:true,
    titulo:function(cfg){var d=TODAS&&TODAS.filter(function(x){return x.id===cfg.doc})[0];return d?d.titulo:'Una página'},
    pintar:function(el,cfg,ctx){
      if(!cfg.doc){vacio(el,'Elige qué página se ve aquí con «Configurar».');return}
      docs().then(function(l){
        var d=l.filter(function(x){return x.id===cfg.doc})[0];
        if(!d){
          var existe=TODAS.some(function(x){return x.id===cfg.doc}),crear=cfg.crear&&AT.tablero.creadores&&AT.tablero.creadores[cfg.crear];
          /* Existe pero no la ves: el módulo no se muestra (salvo al editar) */
          if(existe){ctx.ocultar(true);vacio(el,'No tienes acceso a esta página.');return}
          if(crear&&!ctx.creando[cfg.doc]){
            ctx.creando[cfg.doc]=true;
            D.documentos.leer(cfg.doc).then(function(ya){return ya||D.documentos.guardar(crear(),{conservarFecha:true})}).catch(function(){});
          }
          vacio(el,crear?'Preparando…':'Esa página ya no existe.');
          return;
        }
        ctx.ocultar(false);
        ctx.titulo(d.titulo||'Sin título');
        /* Solo se vuelve a dibujar si la página cambió (sus bloques se actualizan solos) */
        var clave=d.editado+'|'+JSON.stringify(d.contenido).length;
        if(el.getAttribute('data-clave')===clave)return;
        el.setAttribute('data-clave',clave);
        var c=document.createElement('div');c.className='tab-pag';
        el.innerHTML='';el.appendChild(c);
        AT.bloques.dibujar(d,c,{encabezado:false});
        if(D.acceso.puede(d,'editar'))el.insertAdjacentHTML('beforeend','<p class="tab-pie"><a class="btn" href="'+AT.rutas.raiz+'documento.html?id='+encodeURIComponent(d.id)+'">Editar esta página</a></p>');
      });
    }},
  indicadores:{nombre:'Indicadores',desc:'Ventas, gastos y lo que te deben, con su flecha contra el mes pasado.',i:'grafica',tam:'l',modulo:'negocio',
    pintar:function(el,cfg){bloque(el,'indicadores',{cfg:cfg.cfg||null})}},
  vencimientos:{nombre:'Próximos vencimientos',desc:'Pagos, cuentas por pagar y fechas límite de los próximos días.',i:'aviso',tam:'m',modulo:'negocio',config:true,
    pintar:function(el,cfg){bloque(el,'vencimientos',{cfg:{dias:cfg.dias||30}})}},
  inventario:{nombre:'Inventario',desc:'Lo que vale tu inventario y los productos que se están acabando.',i:'datos',tam:'m',modulo:'negocio',
    pintar:function(el){bloque(el,'inventario',{titulo:''})}},
  grafica:{nombre:'Gráfica de una base',desc:'Una de tus bases de datos agrupada por una columna, con su gráfica.',i:'grafica',tam:'m',config:true,
    pintar:function(el,cfg){
      if(!cfg.base){vacio(el,'Elige la base y cómo agruparla con «Configurar».');return}
      bloque(el,'reporte',{cfg:{titulo:cfg.titulo||'',base:cfg.base,filas:cfg.filas||'',valor:cfg.valor||'',calculo:cfg.valor?'suma':'conteo',
        periodo:cfg.periodo||'mes',fecha:cfg.fecha||'',grafica:true}});
    }},
  equipo:{nombre:'Tu equipo',desc:'Quién falta hoy, cumpleaños, aniversarios y lo que cuesta tu equipo.',i:'users',tam:'m',modulo:'rh',
    pintar:function(el){bloque(el,'equipo',{titulo:''})}},
  avisos:{nombre:'Avisos',desc:'Un mensaje para todos los que ven este tablero.',i:'info',tam:'l',config:true,capas:['empresa','sala'],
    pintar:function(el,cfg){
      if(!String(cfg.texto||'').trim()){vacio(el,'Escribe el aviso con «Configurar».');return}
      el.innerHTML='<div class="tab-aviso">'+esc(cfg.texto).replace(/\n/g,'<br>')+'</div>';
    }},
  actividad:{nombre:'Actividad reciente',desc:'Lo último que se editó, quién y cuándo.',i:'historial',tam:'m',
    pintar:function(el,cfg,ctx){
      docs().then(function(l){
        l=l.filter(function(d){return !SISTEMA[d.id]&&(!ctx.sala||D.acceso.sala(d)===ctx.sala)}).slice().sort(porFecha).slice(0,6);
        if(!l.length){vacio(el,'Todavía no hay páginas.');return}
        el.innerHTML='<ul class="tab-l">'+l.map(function(d){
          var por=d.editadoPor&&d.editadoPor.nombre;
          return '<li>'+enlace(d)+'<small>'+esc(cuando(d.editado||d.creado))+(por?' · '+esc(por):'')+'</small></li>';
        }).join('')+'</ul>';
      });
    }},
  salas:{nombre:'Tus salas',desc:'Las salas donde estás, con cuántas páginas tienen.',i:'deptos',tam:'s',capas:['empresa','persona'],
    pintar:function(el){
      var E=AT.empresa,ss=E&&E.existe()?E.salas():[];
      if(!ss.length){vacio(el,'Todavía no hay salas.');return}
      docs().then(function(l){
        el.innerHTML='<ul class="tab-l">'+ss.map(function(s){
          var n=l.filter(function(d){return !SISTEMA[d.id]&&D.acceso.sala(d)===s.id}).length;
          return '<li><a href="'+AT.rutas.raiz+'sala.html?id='+encodeURIComponent(s.id)+'"><i class="emp-dot c-'+esc(s.color)+'" aria-hidden="true"></i><span>'+esc(s.tipo==='general'?'General':s.nombre)+'</span></a><small>'+n+(n===1?' página':' páginas')+'</small></li>';
        }).join('')+'</ul>';
      });
    }},
  recientes:{nombre:'Favoritas y recientes',desc:'Tus páginas favoritas y las últimas que se editaron.',i:'estrella',tam:'s',
    pintar:function(el,cfg,ctx){
      docs().then(function(l){
        l=l.filter(function(d){return !SISTEMA[d.id]&&(!ctx.sala||D.acceso.sala(d)===ctx.sala)});
        var fav=l.filter(function(d){return d.favorito}).sort(porFecha),rec=l.filter(function(d){return !d.favorito}).sort(porFecha).slice(0,Math.max(0,6-fav.length));
        if(!fav.length&&!rec.length){vacio(el,'Todavía no hay páginas.');return}
        el.innerHTML='<ul class="tab-l">'+fav.concat(rec).map(function(d){
          return '<li>'+enlace(d)+(d.favorito?'<small>'+ico('estrella-llena')+'<span class="vh">Favorita</span></small>':'<small>'+esc(cuando(d.editado||d.creado))+'</small>')+'</li>';
        }).join('')+'</ul>';
      });
    }},
  nota:{nombre:'Nota',desc:'Una nota rápida para ti que se guarda sola.',i:'notas',tam:'s',capas:['persona'],
    pintar:function(el,cfg,ctx){
      el.innerHTML='<label class="vh" for="tabNota-'+esc(ctx.id)+'">Nota</label><textarea class="tab-nota" id="tabNota-'+esc(ctx.id)+'" rows="5" maxlength="2000" placeholder="Escribe aquí lo que no quieres olvidar">'+esc(cfg.texto||'')+'</textarea>';
      var t=$('textarea',el),espera=null;
      t.addEventListener('input',function(){clearTimeout(espera);espera=setTimeout(function(){ctx.cambiarCfg({texto:t.value})},600)});
      t.addEventListener('blur',function(){clearTimeout(espera);if(t.value!==(cfg.texto||''))ctx.cambiarCfg({texto:t.value})});
    }}
};
function disponibles(capa){
  return Object.keys(MODS).filter(function(k){var m=MODS[k];return tiene(m.modulo)&&(!m.capas||m.capas.indexOf(capa)>=0)&&(k!=='equipo'||AT.equipo)&&(k!=='inventario'||AT.inventario)});
}

/* ---------- Un tablero ---------- */
var montados=[];
function montar(cont,op){
  var B={cont:cont,op:op,editando:false,mods:[],creando:{},id:op.id||('tab'+montados.length)};
  montados.push(B);
  function puede(){return !!(AT.empresa&&AT.empresa.puedeTablero(op.capa,op.sala))}
  function leer(){
    var m=AT.empresa&&AT.empresa.tablero(op.capa,op.sala);
    B.guardado=m!==null&&m!==undefined;
    B.mods=(B.guardado?m:(op.defecto?op.defecto():[])).filter(function(x){return MODS[x.tipo]});
  }
  function guardar(foco){
    try{B.mods=AT.empresa.guardarTablero(op.capa,B.mods,op.sala);B.guardado=true}
    catch(err){AT.aviso(err.message);leer()}
    pintar(foco);
  }
  function pintar(foco){
    var editable=puede(),mods=B.mods;
    var h='<div class="tab-h"><h2 id="'+B.id+'T"'+(op.tituloOculto?' class="vh"':'')+'>'+esc(op.titulo)+'</h2>'+
      (editable?'<div class="tab-bt">'+(B.editando?'<button class="btn" type="button" data-tab="agregar">'+ico('crear')+'Agregar</button><button class="btn pri" type="button" data-tab="listo">Listo</button>':
        '<button class="btn" type="button" data-tab="editar" aria-label="Editar '+esc(op.titulo)+'">Editar</button>')+'</div>':'')+'</div>';
    if(B.editando)h+='<p class="tab-ayuda">Arrastra un módulo para moverlo, o usa sus botones. Los cambios se guardan solos.</p>';
    if(!mods.length)h+='<p class="tab-nada tab-vacio">'+esc(editable?op.vacio||'Todavía no hay nada aquí. Usa «Editar» y «Agregar».':'Todavía no hay nada aquí.')+'</p>';
    h+='<div class="tab-grid">'+mods.map(function(m,i){
      var M=MODS[m.tipo];
      return '<article class="tab-m tam-'+m.tam+'" data-m="'+esc(m.id)+'" data-modulo="'+esc(m.tipo)+'"'+(B.editando?' draggable="true"':'')+' aria-labelledby="'+esc(m.id)+'-t">'+
        '<div class="tab-mh"><h3 id="'+esc(m.id)+'-t">'+esc(M.titulo?M.titulo(m.cfg):M.nombre)+'</h3>'+
        (B.editando?'<span class="tab-ctl">'+
          '<button type="button" class="tab-ico" data-t="antes"'+(i===0?' aria-disabled="true"':'')+' aria-label="Mover antes" title="Mover antes">'+ico('up')+'</button>'+
          '<button type="button" class="tab-ico" data-t="despues"'+(i===mods.length-1?' aria-disabled="true"':'')+' aria-label="Mover después" title="Mover después">'+ico('down')+'</button>'+
          '<label class="vh" for="'+esc(m.id)+'-tam">Tamaño</label><select class="tab-tam" id="'+esc(m.id)+'-tam" data-t="tam">'+TAMS.map(function(t){return '<option value="'+t[0]+'"'+(t[0]===m.tam?' selected':'')+'>'+t[1]+'</option>'}).join('')+'</select>'+
          (M.config?'<button type="button" class="tab-ico" data-t="config" aria-label="Configurar" title="Configurar">'+ico('puntos')+'</button>':'')+
          '<button type="button" class="tab-ico tab-quitar" data-t="quitar" aria-label="Quitar" title="Quitar">'+ico('close')+'</button></span>':'')+
        '</div><div class="tab-mc"></div></article>';
    }).join('')+'</div>';
    cont.innerHTML=h;
    cont.classList.toggle('editando',B.editando);
    /* Un tablero vacío que no puedes armar no se muestra */
    cont.hidden=!!(op.ocultarVacio&&!mods.length&&!editable);
    mods.forEach(function(m){pintarModulo(m)});
    var f=foco&&cont.querySelector(foco);if(f)f.focus();
  }
  function pintarModulo(m){
    var art=cont.querySelector('[data-m="'+m.id+'"]');if(!art)return;
    var el=$('.tab-mc',art),M=MODS[m.tipo];
    var ctx={id:m.id,sala:op.sala||'',creando:B.creando,
      ocultar:function(si){art.classList.toggle('tab-oculto',!!si&&!B.editando)},
      titulo:function(t){var h=$('h3',art);if(h)h.textContent=t},
      cambiarCfg:function(c){var x=B.mods.filter(function(y){return y.id===m.id})[0];if(!x)return;x.cfg=Object.assign({},x.cfg,c);try{B.mods=AT.empresa.guardarTablero(op.capa,B.mods,op.sala);B.guardado=true}catch(err){AT.aviso(err.message)}}};
    try{M.pintar(el,m.cfg||{},ctx)}catch(err){vacio(el,'No se pudo mostrar este módulo.')}
  }
  function mover(i,j){
    if(j<0||j>=B.mods.length||i===j)return;
    var m=B.mods.splice(i,1)[0];B.mods.splice(j,0,m);
  }
  /* ---------- Eventos ---------- */
  cont.addEventListener('click',function(e){
    var b=e.target.closest('[data-tab],[data-t],[data-accion]');if(!b||b.getAttribute('aria-disabled')==='true')return;
    if(b.hasAttribute('data-accion')){accion(b);return}
    var a=b.getAttribute('data-tab');
    if(a==='editar'){B.editando=true;pintar('[data-tab="listo"]');return}
    if(a==='listo'){B.editando=false;pintar('[data-tab="editar"]');return}
    if(a==='agregar'){catalogo(B,b);return}
    var t=b.getAttribute('data-t'),art=b.closest('[data-m]');if(!t||!art)return;
    var id=art.getAttribute('data-m'),i=B.mods.map(function(x){return x.id}).indexOf(id);if(i<0)return;
    if(t==='antes'){mover(i,i-1);guardar('[data-m="'+id+'"] [data-t="antes"]:not([aria-disabled]), [data-m="'+id+'"] [data-t="despues"]')}
    else if(t==='despues'){mover(i,i+1);guardar('[data-m="'+id+'"] [data-t="despues"]:not([aria-disabled]), [data-m="'+id+'"] [data-t="antes"]')}
    else if(t==='quitar'){var nom=$('h3',art).textContent;B.mods.splice(i,1);guardar('[data-tab="agregar"]');AT.aviso('Se quitó «'+nom+'».')}
    else if(t==='config')setTimeout(function(){configurar(B,B.mods[i],b)},0);
  });
  cont.addEventListener('change',function(e){
    var s=e.target.closest('[data-t="tam"]');if(!s)return;
    var id=s.closest('[data-m]').getAttribute('data-m'),m=B.mods.filter(function(x){return x.id===id})[0];if(!m)return;
    m.tam=s.value;guardar('#'+CSS.escape(id)+'-tam');
  });
  /* Arrastrar para mover (al editar) */
  var arrastrando=null;
  cont.addEventListener('dragstart',function(e){
    var art=e.target.closest&&e.target.closest('[data-m]');if(!B.editando||!art)return;
    arrastrando=art.getAttribute('data-m');art.classList.add('arrastrando');
    try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',arrastrando)}catch(err){}
  });
  cont.addEventListener('dragover',function(e){
    if(!arrastrando)return;var art=e.target.closest('[data-m]');if(!art)return;
    e.preventDefault();$$('.tab-m.sobre',cont).forEach(function(x){if(x!==art)x.classList.remove('sobre')});if(art.getAttribute('data-m')!==arrastrando)art.classList.add('sobre');
  });
  cont.addEventListener('drop',function(e){
    if(!arrastrando)return;var art=e.target.closest('[data-m]');e.preventDefault();
    var ids=B.mods.map(function(x){return x.id}),i=ids.indexOf(arrastrando),j=art?ids.indexOf(art.getAttribute('data-m')):-1;
    var id=arrastrando;arrastrando=null;
    if(i>=0&&j>=0&&i!==j){mover(i,j);guardar('[data-m="'+id+'"] .tab-tam')}else pintar();
  });
  cont.addEventListener('dragend',function(){if(arrastrando){arrastrando=null;pintar()}});
  function accion(b){
    var a=(AT.tablero.acciones?AT.tablero.acciones():[]).filter(function(x){return x.k===b.getAttribute('data-accion')})[0];if(!a)return;
    b.setAttribute('aria-disabled','true');
    Promise.resolve(a.f()).then(function(){if(a.k==='incidencia')b.removeAttribute('aria-disabled')},
      function(){b.removeAttribute('aria-disabled');AT.aviso('No se pudo abrir. Inténtalo otra vez.')});
  }
  B.pintar=pintar;B.leer=leer;B.guardar=guardar;
  B.refrescar=function(tipos){
    if(B.editando)return;
    B.mods.forEach(function(m){if(!tipos||tipos.indexOf(m.tipo)>=0){var a=document.activeElement;if(a&&a.closest&&a.closest('[data-m="'+m.id+'"]')&&m.tipo==='nota')return;pintarModulo(m)}});
  };
  leer();pintar();
  return B;
}

/* ---------- Agregar: el catálogo ---------- */
function ventana(titulo,html,abridor){
  var d=document.createElement('dialog');
  d.className='atajos tab-dlg';d.setAttribute('aria-labelledby','tabDlgT');
  d.innerHTML='<div class="at-h"><h2 id="tabDlgT">'+esc(titulo)+'</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+html;
  document.body.appendChild(d);
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){d.remove();if(abridor&&abridor.isConnected)abridor.focus({preventScroll:true})});
  d.showModal();
  return d;
}
function catalogo(B,abridor){
  var ks=disponibles(B.op.capa);
  var d=ventana('Agregar al tablero','<p class="td-p">Elige qué quieres ver. Después lo mueves, le cambias el tamaño o lo quitas.</p><div class="tab-cat">'+ks.map(function(k){
    var M=MODS[k];return '<button type="button" class="tab-o" data-tipo="'+k+'">'+ico(M.i)+'<span><b>'+esc(M.nombre)+'</b><small>'+esc(M.desc)+'</small></span></button>';
  }).join('')+'</div>',abridor);
  var p=$('.tab-o',d);if(p)p.focus();
  d.addEventListener('click',function(e){
    var b=e.target.closest('[data-tipo]');if(!b)return;
    var k=b.getAttribute('data-tipo'),m={id:nuevoId(),tipo:k,tam:MODS[k].tam,cfg:{}};
    B.mods.push(m);d.close();B.guardar('[data-m="'+m.id+'"] .tab-tam');
    AT.aviso('Se agregó «'+MODS[k].nombre+'».');
    if(MODS[k].config)setTimeout(function(){var bt=B.cont.querySelector('[data-m="'+m.id+'"] [data-t="config"]');configurar(B,B.mods.filter(function(x){return x.id===m.id})[0],bt)},0);
  });
}

/* ---------- Configurar un módulo ---------- */
function opcion(v,t,sel){return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(t)+'</option>'}
function configurar(B,m,abridor){
  if(!m)return;
  var cfg=m.cfg||{},M=MODS[m.tipo];
  function listo(c){m.cfg=Object.assign({},cfg,c);d.close();B.guardar('[data-m="'+m.id+'"] [data-t="config"]');AT.aviso('«'+M.nombre+'» listo.')}
  var d;
  if(m.tipo==='avisos'){
    d=ventana('Avisos','<form class="tab-f" novalidate><label class="campo-l"><span>El aviso</span><textarea name="texto" rows="5" maxlength="1000">'+esc(cfg.texto||'')+'</textarea></label>'+
      '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>',abridor);
    $('form',d).addEventListener('submit',function(e){e.preventDefault();listo({texto:e.target.elements.texto.value.trim()})});
  }else if(m.tipo==='vencimientos'){
    d=ventana('Próximos vencimientos','<form class="tab-f" novalidate><label class="campo-l"><span>Mostrar lo que vence en</span><select name="dias">'+[7,15,30,60].map(function(n){return opcion(String(n),n+' días',String(cfg.dias||30))}).join('')+'</select></label>'+
      '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>',abridor);
    $('form',d).addEventListener('submit',function(e){e.preventDefault();listo({dias:+e.target.elements.dias.value})});
  }else if(m.tipo==='pagina'){
    docs().then(function(l){
      l=l.slice().sort(function(a,b){return (a.titulo||'').localeCompare(b.titulo||'','es')});
      d=ventana('Una página','<form class="tab-f" novalidate><label class="campo-l"><span>Página</span><select name="doc">'+opcion('','Elige una página',cfg.doc||'')+
        l.map(function(x){return opcion(x.id,x.titulo||'Sin título',cfg.doc||'')}).join('')+'</select></label>'+
        '<p class="tab-nota-f">Se ven sus bloques, vivos. Quien no puede ver esa página no ve este módulo.</p>'+
        '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div><p class="td-msg" role="status"></p></form>',abridor);
      $('form',d).addEventListener('submit',function(e){e.preventDefault();var v=e.target.elements.doc.value;if(!v){$('.td-msg',d).textContent='Elige una página.';return}listo({doc:v,crear:''})});
      $('select',d).focus();
    });
    return;
  }else if(m.tipo==='grafica'){
    D.bases.todos().then(function(bs){
      bs=bs.filter(function(b){return b.columnas&&b.columnas.length}).sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es')});
      function cols(bid,f){var b=bs.filter(function(x){return x.id===bid})[0];return b?b.columnas.filter(f):[]}
      function form(bid){
        var agr=cols(bid,function(c){return ['texto','seleccion','multiple','relacion','casilla','fecha'].indexOf(c.tipo)>=0}),num=cols(bid,function(c){return ['numero','moneda','formula','suma'].indexOf(c.tipo)>=0});
        return '<label class="campo-l"><span>Base de datos</span><select name="base">'+opcion('','Elige una base',bid)+bs.map(function(b){return opcion(b.id,b.nombre,bid)}).join('')+'</select></label>'+
          (bid?'<label class="campo-l"><span>Agrupar por</span><select name="filas">'+agr.map(function(c){return opcion(c.id,c.nombre,cfg.filas||'')}).join('')+'</select></label>'+
            '<label class="campo-l"><span>Calcular</span><select name="valor">'+opcion('','Contar filas',cfg.valor||'')+num.map(function(c){return opcion(c.id,'Sumar '+c.nombre,cfg.valor||'')}).join('')+'</select></label>'+
            '<label class="campo-l"><span>Periodo</span><select name="periodo">'+[['mes','Este mes'],['anio','Este año'],['todo','Todo']].map(function(p){return opcion(p[0],p[1],cfg.periodo||'mes')}).join('')+'</select></label>':'');
      }
      d=ventana('Gráfica de una base','<form class="tab-f" novalidate><div class="tab-campos">'+form(cfg.base||'')+'</div>'+
        (bs.length?'':'<p class="tab-nota-f">Todavía no tienes bases de datos: crea una con «/base» en cualquier página.</p>')+
        '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div><p class="td-msg" role="status"></p></form>',abridor);
      var f=$('form',d);
      f.addEventListener('change',function(e){if(e.target.name==='base'){$('.tab-campos',d).innerHTML=form(e.target.value);var s=$('select[name="base"]',d);if(s)s.focus()}});
      f.addEventListener('submit',function(e){
        e.preventDefault();var el=f.elements,bid=el.base.value;
        if(!bid){$('.td-msg',d).textContent='Elige una base.';return}
        var fecha=cols(bid,function(c){return c.tipo==='fecha'})[0];
        listo({base:bid,filas:el.filas?el.filas.value:'',valor:el.valor?el.valor.value:'',periodo:el.periodo?el.periodo.value:'todo',fecha:fecha?fecha.id:''});
      });
      $('select',d).focus();
    });
    return;
  }
  if(d){var x=$('textarea,select,input',d);if(x)x.focus()}
}

/* Lo que cambia en tus páginas o en la empresa (también en otra pestaña) se vuelve a pintar */
var espera=null;
D.on(function(c){
  if(c.almacen!=='documentos'&&c.almacen!=='*'&&c.almacen!=='yo')return;
  DOCS=null;clearTimeout(espera);
  espera=setTimeout(function(){montados.forEach(function(B){B.refrescar(['pagina','actividad','recientes','salas'])})},300);
});
if(AT.empresa)AT.empresa.on(function(c,deOtra){
  if(!deOtra&&c.tipo==='tablero')return;
  montados.forEach(function(B){if(!B.editando){B.leer();B.pintar()}});
});

AT.tablero={montar:montar,MODS:MODS,disponibles:disponibles};
})();
