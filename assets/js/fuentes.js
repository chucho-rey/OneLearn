/* OneBook: fuentes, citas y bibliografía de un documento académico (por ahora, la tesis).
   Las fuentes viven en el propio documento: doc.fuentes = [{id, tipo, autores, anio, fecha, titulo, contenedor,
   editorial, volumen, numero, paginas, edicion, editores, grado, institucion, herramienta, doi, url}],
   donde autores es [{apellido, nombre}] o [{org}] para una institución o empresa.
   - Formato APA 7 en español: AT.fuentes.referencia(f) da trozos [{t, i}] (i = cursiva) y AT.fuentes.cita(...) el
     texto de una cita en el texto: (Pérez, 2020, p. 15) o Pérez (2020). Mismo autor y año: 2020a, 2020b.
   - Estilo IEEE (doc.formato.estilo === 'ieee'): citas numeradas por orden de aparición, [1] o [1, p. 15], y la
     bibliografía en ese orden. AT.fuentes.estilo(doc) dice cuál usa un documento.
   - Importar: AT.fuentes.bibtex(texto) y AT.fuentes.ris(texto) (Zotero, Mendeley); buscar: porDoi(doi) en Crossref y
     porIsbn(isbn) en Open Library.
   - AT.fuentes.dialogo({doc, alCambiar, alElegir}) abre la ventana «Fuentes»; con alElegir sirve para citar.
   Todo el texto de las fuentes se muestra con textContent. Se carga antes de bloques.js y editor.js. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico;

/* ---------- Utilidades ---------- */
function s(v){return v==null?'':String(v).trim()}
function sinAcentos(t){return s(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function nuevoId(){return 'f-'+AT.bloques.nuevoId().slice(2)}
function iniciales(nombre){
  return s(nombre).split(/\s+/).filter(Boolean).map(function(p){
    return p.split('-').map(function(q){return q.charAt(0).toUpperCase()+'.'}).join('-');
  }).join(' ');
}
function rango(p){return s(p).replace(/\s*-+\s*/g,'–')}
function doiUrl(d){d=s(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i,'').replace(/^doi:\s*/i,'');return d?'https://doi.org/'+d:''}
var TIPOS={
  articulo:'Artículo de revista',libro:'Libro',capitulo:'Capítulo de libro',web:'Página web',
  tesis:'Tesis',ia:'Conversación con IA',otro:'Otro'
};
var GRADOS={licenciatura:'Tesis de licenciatura',maestria:'Tesis de maestría',doctorado:'Tesis doctoral'};

/* ---------- APA 7 en español ---------- */
function autorRef(a){
  if(a.org)return s(a.org);
  var ini=iniciales(a.nombre);
  return s(a.apellido)+(ini?', '+ini:'');
}
function autoresRef(lista){
  var l=(lista||[]).filter(function(a){return s(a.org)||s(a.apellido)}).map(autorRef);
  if(!l.length)return '';
  if(l.length===1)return l[0];
  if(l.length>20)return l.slice(0,19).join(', ')+', . . . '+l[l.length-1];
  return l.slice(0,-1).join(', ')+', y '+l[l.length-1];
}
function apellido(a){return a.org?s(a.org):s(a.apellido)}
function autoresCita(lista){
  var l=(lista||[]).filter(function(a){return s(a.org)||s(a.apellido)});
  if(!l.length)return '';
  if(l.length===1)return apellido(l[0]);
  if(l.length===2)return apellido(l[0])+' y '+apellido(l[1]);
  return apellido(l[0])+' et al.';
}
/* Para ordenar y para distinguir mismo autor y año */
function claveAutor(f){return sinAcentos(autoresRef(f.autores)||f.titulo)}
function anio(f){return s(f.anio)||'s. f.'}
/* Sufijos a, b, c… cuando el mismo autor tiene varias obras del mismo año */
function sufijos(fuentes){
  var grupos={},out={};
  (fuentes||[]).forEach(function(f){var k=claveAutor(f)+'|'+anio(f);(grupos[k]=grupos[k]||[]).push(f)});
  Object.keys(grupos).forEach(function(k){
    var g=grupos[k];
    if(g.length<2)return;
    g.slice().sort(function(a,b){return sinAcentos(a.titulo).localeCompare(sinAcentos(b.titulo))}).forEach(function(f,i){out[f.id]=String.fromCharCode(97+i)});
  });
  return out;
}
function terminaPunto(t){return /[.?!]$/.test(t)?t:t+'.'}
/* Trozos de una referencia: [{t:'texto', i:true si va en cursiva}] */
function referencia(f,suf){
  var R=[];
  function add(t,i){if(t)R.push({t:t,i:!!i})}
  var au=autoresRef(f.autores),tit=s(f.titulo),fecha=anio(f)+(suf||'');
  if(s(f.fecha)&&s(f.anio))fecha=s(f.anio)+(suf||'')+', '+s(f.fecha);
  var cursivaTitulo=['articulo','capitulo'].indexOf(f.tipo)<0;
  function titulo(extra){
    if(!tit)return;
    if(cursivaTitulo){add(tit,true);add(extra?extra+'. ':/[?!]$/.test(tit)?' ':'. ')}
    else add(terminaPunto(tit)+' ');
  }
  if(au){add(terminaPunto(au)+' ');add('('+fecha+'). ');titulo(extraDe(f))}
  else{titulo(extraDe(f));add('('+fecha+'). ')}
  var t=f.tipo;
  if(t==='articulo'){
    if(s(f.contenedor)){
      add(s(f.contenedor),true);
      if(s(f.volumen)){add(', ');add(s(f.volumen),true)}
      if(s(f.numero))add('('+s(f.numero)+')');
      if(s(f.paginas))add(', '+rango(f.paginas));
      add('. ');
    }
  }else if(t==='libro'){
    if(s(f.editorial))add(terminaPunto(s(f.editorial))+' ');
  }else if(t==='capitulo'){
    var ed=s(f.editores);
    if(s(f.contenedor)){
      add('En '+(ed?ed+' (Ed'+(/ y |,/.test(ed)?'s':'')+'.), ':''));
      add(s(f.contenedor),true);
      add((s(f.paginas)?' (pp. '+rango(f.paginas)+')':'')+'. ');
    }
    if(s(f.editorial))add(terminaPunto(s(f.editorial))+' ');
  }else if(t==='tesis'){
    if(s(f.contenedor))add(terminaPunto(s(f.contenedor))+' ');
  }else if(t==='ia'){
    if(s(f.herramienta))add(terminaPunto(s(f.herramienta))+' ');
  }else{
    if(s(f.contenedor)&&s(f.contenedor)!==au)add(terminaPunto(s(f.contenedor))+' ');
    if(t==='otro'&&s(f.editorial))add(terminaPunto(s(f.editorial))+' ');
  }
  var enlace=doiUrl(f.doi)||s(f.url);
  if(enlace)add(enlace);
  if(R.length){var u=R[R.length-1];u.t=u.t.replace(/\s+$/,'')}
  return R;
}
/* Lo que va entre corchetes o paréntesis después del título */
function extraDe(f){
  if(f.tipo==='libro'&&s(f.edicion)&&!/^1(\.|ª|a)?$/.test(s(f.edicion)))return ' ('+s(f.edicion).replace(/\.?\s*(ed\.?|edición)?$/i,'')+'.ª ed.)';
  if(f.tipo==='tesis')return ' ['+(GRADOS[f.grado]||'Tesis')+(s(f.institucion)?', '+s(f.institucion):'')+']';
  if(f.tipo==='ia')return ' [Chat de IA generativa]';
  return '';
}
function referenciaTexto(f,suf){return referencia(f,suf).map(function(x){return x.t}).join('')}
function pagina(p){p=s(p);if(!p)return '';if(/^(p|pp|párr)\./.test(p))return p;return (/[-–,]/.test(p)?'pp. ':'p. ')+rango(p)}
/* ---------- IEEE, en español ---------- */
function estilo(doc){return doc&&doc.formato&&doc.formato.estilo==='ieee'?'ieee':'apa'}
var NOMBRE_ESTILO={apa:'APA 7',ieee:'IEEE'};
function autorIeee(a){
  if(a.org)return s(a.org);
  var ini=iniciales(a.nombre);
  return (ini?ini+' ':'')+s(a.apellido);
}
function autoresIeee(lista){
  var l=(lista||[]).filter(function(a){return s(a.org)||s(a.apellido)}).map(autorIeee);
  if(!l.length)return '';
  if(l.length>6)return l[0]+' et al.';
  if(l.length===1)return l[0];
  return l.slice(0,-1).join(', ')+' y '+l[l.length-1];
}
/* Trozos de una referencia IEEE (sin el número; bibliografia() lo agrega).
   Artículo: A. Autor y B. Autor, “Título,” *Revista*, vol. 4, no. 2, pp. 8–25, 2019, doi: 10.xxx.
   Libro: A. Autor, *Título*, 2.ª ed. Editorial, 2016. */
function referenciaIeee(f){
  var R=[],t=f.tipo,an=s(f.anio)||'s. f.',tit=s(f.titulo),au=autoresIeee(f.autores),resto=[],cont='',sep=', ';
  function add(x,i){if(x)R.push({t:x,i:!!i})}
  var enComillas=t!=='libro'&&t!=='ia';
  if(au)add(au+', ');
  if(tit){if(enComillas)add('“'+tit+',” ');else add(tit,true)}
  if(t==='articulo'){
    cont=s(f.contenedor);
    if(s(f.volumen))resto.push('vol. '+s(f.volumen));
    if(s(f.numero))resto.push('no. '+s(f.numero));
    if(s(f.paginas))resto.push((/[-–,]/.test(f.paginas)?'pp. ':'p. ')+rango(f.paginas));
    resto.push(an);
  }else if(t==='libro'){
    if(s(f.edicion)&&!/^1(\.|ª|a)?$/.test(s(f.edicion)))resto.push(s(f.edicion).replace(/\.?\s*(ed\.?|edición)?$/i,'')+'.ª ed.');
    if(s(f.editorial))resto.push(s(f.editorial));
    resto.push(an);
    if(resto.length>1&&/ed\.$/.test(resto[0])){resto[0]+=' '+resto[1];resto.splice(1,1)}
  }else if(t==='ia'){
    add(' [Chat de IA generativa]');
    if(s(f.herramienta))resto.push(s(f.herramienta));
    resto.push(an);
  }else if(t==='capitulo'){
    if(s(f.contenedor)){add('en ');cont=s(f.contenedor)}
    if(s(f.editores))resto.push(s(f.editores)+', Ed'+(/ y |,/.test(s(f.editores))?'s':'')+'.');
    if(s(f.editorial))resto.push(s(f.editorial));
    resto.push(an);
    if(s(f.paginas))resto.push('pp. '+rango(f.paginas));
  }else if(t==='tesis'){
    resto.push(GRADOS[f.grado]||'Tesis');
    if(s(f.institucion))resto.push(s(f.institucion));
    resto.push(an);
  }else{
    if(s(f.contenedor)&&s(f.contenedor)!==au)cont=s(f.contenedor);
    if(t==='otro'&&s(f.editorial))resto.push(s(f.editorial));
    resto.push(an);
  }
  if(cont)add(cont,true);
  /* Después de algo en cursiva va una coma; después de un título entre comillas, no (la coma va dentro) */
  var ultimo=R[R.length-1],coma=ultimo&&(ultimo.i||/\]$/.test(ultimo.t))?sep:'';
  add(coma+resto.join(', '));
  var doi=doiUrl(f.doi);
  if(doi)add(', doi: '+doi.replace('https://doi.org/','')+'.');
  else{R[R.length-1].t=terminaPunto(R[R.length-1].t);if(s(f.url))add(' [En línea]. Disponible en: '+s(f.url))}
  return R;
}
/* Números IEEE: orden de la primera cita en el documento (en el editor, el que tiene abierto ahora) */
var vivo=null,cacheOrden=typeof WeakMap==='function'?new WeakMap():null;
function ordenCitas(doc){
  if(vivo&&doc&&doc===AT.docActual)return vivo;
  var c=doc&&doc.contenido;
  if(!c)return [];
  if(cacheOrden&&cacheOrden.has(c))return cacheOrden.get(c);
  var o=Object.keys(citadas(c));
  if(cacheOrden)cacheOrden.set(c,o);
  return o;
}
function numeroIeee(doc,id){var i=ordenCitas(doc).indexOf(id);return i<0?0:i+1}
/* Texto de una cita en el texto, dados sus atributos y las fuentes del documento (doc: para el estilo y la numeración) */
function cita(a,fuentes,doc){
  if(!doc&&AT.docActual&&AT.docActual.fuentes===fuentes)doc=AT.docActual;
  var f=(fuentes||[]).filter(function(x){return x.id===a.fuente})[0];
  if(!f)return estilo(doc)==='ieee'?'[?]':'(fuente borrada)';
  var pg=pagina(a.pagina);
  if(estilo(doc)==='ieee'){
    var n=numeroIeee(doc,f.id)||'?',num='['+n+(pg?', '+pg:'')+']';
    return a.narrativa?(autoresCita(f.autores)||'«'+s(f.titulo)+'»')+' '+num:num;
  }
  var suf=sufijos(fuentes)[f.id]||'',quien=autoresCita(f.autores)||('«'+(s(f.titulo).length>40?s(f.titulo).slice(0,40)+'…':s(f.titulo))+'»');
  var cuando=anio(f)+suf;
  return a.narrativa?quien+' ('+cuando+(pg?', '+pg:'')+')':'('+quien+', '+cuando+(pg?', '+pg:'')+')';
}
/* Ids de las fuentes citadas en el contenido */
function citadas(contenido){
  var out={};
  (function rec(n){if(!n)return;if(n.type==='referencia'&&n.attrs&&n.attrs.fuente)out[n.attrs.fuente]=(out[n.attrs.fuente]||0)+1;(n.content||[]).forEach(rec)})(contenido);
  return out;
}
/* Lista ordenada para la bibliografía: APA por autor y año; IEEE por orden de cita (las no citadas, al final) */
function bibliografia(doc,todas,usadas){
  var fs=doc&&doc.fuentes||[],suf=sufijos(fs);
  usadas=usadas||citadas(doc&&doc.contenido);
  var alfa=function(a,b){return claveAutor(a).localeCompare(claveAutor(b))||anio(a).localeCompare(anio(b))||(suf[a.id]||'').localeCompare(suf[b.id]||'')};
  if(estilo(doc)==='ieee'){
    var orden=Object.keys(usadas),pos={};orden.forEach(function(id,i){pos[id]=i});
    var lista=fs.filter(function(f){return f.id in pos}).sort(function(a,b){return pos[a.id]-pos[b.id]})
      .concat(todas?fs.filter(function(f){return !(f.id in pos)}).sort(alfa):[]);
    return lista.map(function(f,i){return {fuente:f,numero:i+1,trozos:[{t:'['+(i+1)+'] ',i:false}].concat(referenciaIeee(f))}});
  }
  return fs.filter(function(f){return todas||usadas[f.id]}).sort(alfa).map(function(f){return {fuente:f,trozos:referencia(f,suf[f.id])}});
}
/* Dibuja trozos en un elemento (cursivas con <i>, enlaces seguros) */
function pintarTrozos(trozos,cont){
  trozos.forEach(function(x){
    var e;
    if(x.i){e=document.createElement('i');e.textContent=x.t}
    else if(/^https?:\/\/\S+$/.test(x.t)){e=document.createElement('a');e.href=x.t;e.textContent=x.t;e.target='_blank';e.rel='noopener noreferrer'}
    else e=document.createTextNode(x.t);
    cont.appendChild(e);
  });
  return cont;
}
function trozosMarkdown(trozos){return trozos.map(function(x){return x.i?'*'+x.t+'*':x.t}).join('')}

/* ---------- Importar ---------- */
var LATEX={"\\'a":'á',"\\'e":'é',"\\'i":'í',"\\'\\i":'í',"\\'o":'ó',"\\'u":'ú',"\\'A":'Á',"\\'E":'É',"\\'I":'Í',"\\'O":'Ó',"\\'U":'Ú',
  '\\~n':'ñ','\\~N':'Ñ','\\"u':'ü','\\"U':'Ü','\\"o':'ö','\\"a':'ä','\\c{c}':'ç','\\&':'&','\\%':'%','\\_':'_'};
function limpiarLatex(t){
  t=s(t).replace(/\\([`'"~^])\{\\?([a-zA-Z])\}/g,'\\$1$2').replace(/\{\\([`'"~^])([a-zA-Z])\}/g,'\\$1$2');
  Object.keys(LATEX).forEach(function(k){t=t.split(k).join(LATEX[k])});
  return t.replace(/[{}]/g,'').replace(/---?/g,function(m){return m.length===3?'—':'–'}).replace(/\s+/g,' ').trim();
}
function personas(texto,separador){
  return s(texto).split(separador).map(function(x){return x.trim()}).filter(Boolean).map(function(x){
    if(/^\{.*\}$/.test(x))return {org:limpiarLatex(x)};
    x=limpiarLatex(x);
    if(x.indexOf(',')>=0){var p=x.split(',');return {apellido:p[0].trim(),nombre:p.slice(1).join(',').trim()}}
    var w=x.split(/\s+/);
    if(w.length===1)return {org:x};
    var n=w.length>=4?2:1;
    return {apellido:w.slice(-n).join(' '),nombre:w.slice(0,-n).join(' ')};
  });
}
function bibtex(texto){
  var out=[],i=0,t=String(texto||'');
  while((i=t.indexOf('@',i))>=0){
    var m=/^@(\w+)\s*[{(]/.exec(t.slice(i));
    if(!m){i++;continue}
    var tipo=m[1].toLowerCase(),j=i+m[0].length,prof=1,k=j;
    while(k<t.length&&prof>0){var c=t[k];if(c==='{'||c==='(')prof++;else if(c==='}'||c===')')prof--;k++}
    var cuerpo=t.slice(j,k-1);i=k;
    if(tipo==='comment'||tipo==='string'||tipo==='preamble')continue;
    var campos={},partes=[],pr=0,ac='',enComillas=false;
    for(var x=0;x<cuerpo.length;x++){
      var ch=cuerpo[x];
      if(ch==='"'&&pr===0)enComillas=!enComillas;
      if(ch==='{')pr++;else if(ch==='}')pr--;
      if(ch===','&&pr===0&&!enComillas){partes.push(ac);ac=''}else ac+=ch;
    }
    partes.push(ac);
    partes.slice(1).forEach(function(p){
      var q=p.indexOf('=');if(q<0)return;
      var n=p.slice(0,q).trim().toLowerCase(),v=p.slice(q+1).trim();
      if(/^\{[\s\S]*\}$/.test(v)||/^"[\s\S]*"$/.test(v))v=v.slice(1,-1);
      campos[n]=v;
    });
    var T={article:'articulo',book:'libro',incollection:'capitulo',inbook:'capitulo',phdthesis:'tesis',mastersthesis:'tesis',online:'web',misc:'otro',techreport:'otro'};
    var f={id:nuevoId(),tipo:T[tipo]||'otro',autores:personas(campos.author,/\s+and\s+/i),anio:(s(campos.year).match(/\d{4}/)||[''])[0],
      titulo:limpiarLatex(campos.title),contenedor:limpiarLatex(campos.journal||campos.booktitle||campos.howpublished||''),
      editorial:limpiarLatex(campos.publisher||campos.institution||''),volumen:limpiarLatex(campos.volume),numero:limpiarLatex(campos.number),
      paginas:rango(limpiarLatex(campos.pages)),edicion:limpiarLatex(campos.edition),editores:personas(campos.editor,/\s+and\s+/i).map(function(a){return a.org||(iniciales(a.nombre)+' '+a.apellido).trim()}).join(', ').replace(/, ([^,]*)$/,' y $1'),
      doi:limpiarLatex(campos.doi),url:limpiarLatex(campos.url)};
    if(f.tipo==='tesis'){f.grado=tipo==='phdthesis'?'doctorado':'maestria';f.institucion=limpiarLatex(campos.school||'')}
    if(f.titulo)out.push(f);
  }
  return out;
}
function ris(texto){
  var out=[],f=null,sp='',ep='';
  var T={JOUR:'articulo',JFULL:'articulo',MGZN:'articulo',BOOK:'libro',CHAP:'capitulo',THES:'tesis',ELEC:'web',WEB:'web',BLOG:'web'};
  String(texto||'').split(/\r?\n/).forEach(function(l){
    var m=/^([A-Z][A-Z0-9])\s{1,2}-\s?(.*)$/.exec(l);if(!m)return;
    var k=m[1],v=m[2].trim();
    if(k==='TY'){f={id:nuevoId(),tipo:T[v]||'otro',autores:[],anio:'',titulo:''};sp=ep='';return}
    if(!f)return;
    if(k==='AU'||k==='A1')f.autores=f.autores.concat(personas(v,/;/));
    else if(k==='A2'||k==='ED')f.editores=(f.editores?f.editores+' y ':'')+v;
    else if(k==='PY'||k==='Y1'||(k==='DA'&&!f.anio))f.anio=(v.match(/\d{4}/)||[''])[0];
    else if(k==='TI'||k==='T1')f.titulo=v;
    else if(k==='T2'||k==='JO'||k==='JF'||k==='BT')f.contenedor=f.contenedor||v;
    else if(k==='VL')f.volumen=v;else if(k==='IS')f.numero=v;
    else if(k==='SP')sp=v;else if(k==='EP')ep=v;
    else if(k==='DO')f.doi=v;else if(k==='UR')f.url=f.url||v;
    else if(k==='PB')f.editorial=v;else if(k==='ET')f.edicion=v;
    else if(k==='ER'){if(sp)f.paginas=sp+(ep?'–'+ep:'');if(f.titulo)out.push(f);f=null}
  });
  return out;
}
/* Desde la respuesta de Crossref (el objeto message) */
function deCrossref(m){
  var T={'journal-article':'articulo','book':'libro','monograph':'libro','edited-book':'libro','book-chapter':'capitulo','dissertation':'tesis','posted-content':'otro'};
  var fecha=(m.issued&&m.issued['date-parts']||m.published&&m.published['date-parts']||[[]])[0]||[];
  return {id:nuevoId(),tipo:T[m.type]||'otro',
    autores:(m.author||[]).map(function(a){return a.family?{apellido:a.family,nombre:a.given||''}:{org:a.name||''}}),
    anio:fecha[0]?String(fecha[0]):'',titulo:s((m.title||[])[0]),contenedor:s((m['container-title']||[])[0]),
    volumen:s(m.volume),numero:s(m.issue),paginas:rango(m.page),editorial:s(m.publisher),doi:s(m.DOI),url:''};
}
function deOpenLibrary(d){
  return {id:nuevoId(),tipo:'libro',autores:(d.authors||[]).map(function(a){return personas(a.name,/;/)[0]}).filter(Boolean),
    anio:(s(d.publish_date).match(/\d{4}/)||[''])[0],titulo:s(d.title)+(d.subtitle?': '+s(d.subtitle):''),
    editorial:s(((d.publishers||[])[0]||{}).name),url:''};
}
function pedir(url){
  var ctl=window.AbortController?new AbortController():null,t=setTimeout(function(){if(ctl)ctl.abort()},10000);
  return fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){clearTimeout(t);if(!r.ok)throw new Error(String(r.status));return r.json()});
}
function porDoi(doi){
  doi=s(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i,'').replace(/^doi:\s*/i,'');
  return pedir('https://api.crossref.org/works/'+encodeURIComponent(doi)).then(function(j){return deCrossref(j.message||{})});
}
function porIsbn(isbn){
  isbn=s(isbn).replace(/[^0-9Xx]/g,'');
  return pedir('https://openlibrary.org/api/books?bibkeys=ISBN:'+isbn+'&format=json&jscmd=data').then(function(j){
    var d=j['ISBN:'+isbn];if(!d)throw new Error('sin datos');return deOpenLibrary(d);
  });
}

/* ---------- Ventana «Fuentes» ---------- */
/* Campos de cada tipo, además de tipo, autores, año y título */
var CAMPOS={
  articulo:[['contenedor','Revista'],['volumen','Volumen'],['numero','Número'],['paginas','Páginas (ej. 45-67)'],['doi','DOI'],['url','Enlace (si no tiene DOI)']],
  libro:[['edicion','Edición (solo si no es la primera, ej. 2)'],['editorial','Editorial'],['doi','DOI'],['url','Enlace (si es en línea)']],
  capitulo:[['editores','Editores del libro (ej. M. López y R. Díaz)'],['contenedor','Título del libro'],['paginas','Páginas del capítulo'],['editorial','Editorial'],['doi','DOI']],
  web:[['fecha','Día y mes de publicación (si lo tiene)'],['contenedor','Nombre del sitio'],['url','Enlace']],
  tesis:[['institucion','Universidad'],['contenedor','Repositorio (ej. Repositorio Institucional de la UNAM)'],['url','Enlace']],
  ia:[['fecha','Día y mes de la conversación'],['herramienta','Herramienta (ej. ChatGPT, Gemini, Claude)'],['url','Enlace compartido de la conversación']],
  otro:[['contenedor','Publicado en'],['editorial','Editorial o institución'],['url','Enlace']]
};
function autoresTexto(l){return (l||[]).map(function(a){return a.org?a.org:a.apellido+(a.nombre?', '+a.nombre:'')}).join('\n')}
function leerAutores(t){
  return s(t).split(/\n+/).map(function(x){return x.trim()}).filter(Boolean).map(function(x){
    if(x.indexOf(',')<0)return {org:x};
    var p=x.split(',');return {apellido:p[0].trim(),nombre:p.slice(1).join(',').trim()};
  });
}
var dlg=null;
function dialogo(op){
  op=op||{};
  var doc=op.doc;if(!doc)return;
  if(!doc.fuentes)doc.fuentes=[];
  if(dlg)dlg.remove();
  var d=dlg=document.createElement('dialog'),volver=document.activeElement,vista='lista',editando=null,elegir=!!op.alElegir;
  d.className='atajos fu-dlg';d.setAttribute('aria-labelledby','fuT');
  document.body.appendChild(d);
  function cambio(){if(op.alCambiar)op.alCambiar();AT.fuentes.refrescar()}
  function pintar(foco){
    var h='<div class="at-h"><h2 id="fuT">'+(elegir?'Citar una fuente':'Fuentes')+'</h2><button class="lec-x" type="button" data-fu="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>';
    if(vista==='lista'){
      var usadas=citadas(doc.contenido),suf=sufijos(doc.fuentes);
      h+='<p class="td-p">'+(elegir?'Elige la fuente. Si citas palabras textuales o un dato puntual, agrega la página.':'Las fuentes de este documento. Cítalas en el texto y la bibliografía se arma sola, en APA 7.')+'</p>';
      if(elegir)h+='<div class="fu-cita"><label class="ed-campo"><span>Página (opcional)</span><input type="text" id="fuPag" inputmode="text" autocomplete="off" placeholder="ej. 45 o 45-47"></label>'+
        '<label class="chk"><input type="checkbox" id="fuNarr">Cita narrativa: «Pérez (2020) explica…»</label></div>';
      h+='<div class="fu-acc"><button class="btn" type="button" data-fu="nueva">'+ico('mas')+'Agregar a mano</button><button class="btn" type="button" data-fu="buscar">Buscar por DOI o ISBN</button><button class="btn" type="button" data-fu="importar">Importar BibTeX o RIS</button></div>';
      if(!doc.fuentes.length)h+='<p class="hint fu-vacio">Todavía no hay fuentes. Agrega la primera: un libro, un artículo, una página web o una conversación con IA.</p>';
      else h+='<ol class="fu-l">'+doc.fuentes.map(function(f,i){
        var n=usadas[f.id]||0;
        return '<li class="fu-i" data-i="'+i+'"><p class="fu-ref"></p><div class="fu-pie"><span class="fu-meta">'+esc(TIPOS[f.tipo]||'Fuente')+' · '+(n?(n===1?'citada 1 vez':'citada '+n+' veces'):'sin citar')+'</span>'+
          (elegir?'<button class="btn pri" type="button" data-fu="citar">Citar</button>':'')+
          '<button class="ed-link" type="button" data-fu="editar">Editar</button><button class="ed-link ed-quitar" type="button" data-fu="quitar">Quitar</button></div></li>';
      }).join('')+'</ol>';
    }else if(vista==='form'){
      var f=editando,campos=CAMPOS[f.tipo]||CAMPOS.otro;
      h+='<form class="fu-form" id="fuForm"><label class="ed-campo"><span>Tipo</span><select id="fuTipo">'+Object.keys(TIPOS).map(function(k){return '<option value="'+k+'"'+(k===f.tipo?' selected':'')+'>'+TIPOS[k]+'</option>'}).join('')+'</select></label>'+
        '<label class="ed-campo"><span>'+(f.tipo==='ia'?'Empresa (ej. OpenAI, Google, Anthropic)':'Autores: uno por línea, «Apellido, Nombre». Una institución, tal cual')+'</span><textarea id="fuAut" rows="2">'+esc(autoresTexto(f.autores))+'</textarea></label>'+
        '<div class="fu-2"><label class="ed-campo"><span>Año</span><input type="text" data-c="anio" inputmode="numeric" value="'+esc(s(f.anio))+'" placeholder="s. f. si no tiene"></label>'+
        (f.tipo==='tesis'?'<label class="ed-campo"><span>Grado</span><select data-c="grado">'+Object.keys(GRADOS).map(function(k){return '<option value="'+k+'"'+(k===(f.grado||'licenciatura')?' selected':'')+'>'+GRADOS[k]+'</option>'}).join('')+'</select></label>':'')+'</div>'+
        '<label class="ed-campo"><span>'+(f.tipo==='ia'?'Título o tema de la conversación':f.tipo==='capitulo'?'Título del capítulo':f.tipo==='articulo'?'Título del artículo':'Título')+'</span><input type="text" data-c="titulo" required value="'+esc(s(f.titulo))+'"></label>'+
        campos.map(function(c){return '<label class="ed-campo"><span>'+esc(c[1])+'</span><input type="text" data-c="'+c[0]+'" value="'+esc(s(f[c[0]]))+'"'+(c[0]==='url'?' inputmode="url"':'')+'></label>'}).join('')+
        '<p class="fu-prev" aria-live="polite"></p>'+
        '<div class="td-bt"><button class="btn pri" type="submit">'+(doc.fuentes.indexOf(f)>=0?'Guardar':'Agregar')+'</button><button class="btn" type="button" data-fu="volver">Cancelar</button></div></form>';
    }else if(vista==='buscar'){
      h+='<form class="fu-form" id="fuBuscar"><p class="td-p">Escribe el DOI de un artículo o el ISBN de un libro. Se consulta en Crossref u Open Library; después puedes corregir los datos.</p>'+
        '<label class="ed-campo"><span>DOI o ISBN</span><input type="text" id="fuQ" autocomplete="off" placeholder="10.1037/0000165-000 o 978-607-…"></label>'+
        '<p class="fu-msg" id="fuMsg" role="status"></p>'+
        '<div class="td-bt"><button class="btn pri" type="submit">Buscar</button><button class="btn" type="button" data-fu="volver">Cancelar</button></div></form>';
    }else if(vista==='importar'){
      h+='<form class="fu-form" id="fuImp"><p class="td-p">En Zotero o Mendeley, exporta tus referencias como BibTeX (.bib) o RIS (.ris). Elige el archivo o pega su contenido.</p>'+
        '<label class="ed-campo"><span>Archivo</span><input type="file" id="fuArch" accept=".bib,.ris,.txt,text/plain"></label>'+
        '<label class="ed-campo"><span>O pega el texto</span><textarea id="fuTxt" rows="5" spellcheck="false"></textarea></label>'+
        '<p class="fu-msg" id="fuMsg" role="status"></p>'+
        '<div class="td-bt"><button class="btn pri" type="submit">Importar</button><button class="btn" type="button" data-fu="volver">Cancelar</button></div></form>';
    }
    d.innerHTML=h;
    if(vista==='lista')$$('.fu-i',d).forEach(function(li){
      var f=doc.fuentes[+li.getAttribute('data-i')];
      pintarTrozos(estilo(doc)==='ieee'?referenciaIeee(f):referencia(f,sufijos(doc.fuentes)[f.id]),$('.fu-ref',li));
    });
    if(vista==='form')previa();
    var x=foco?$(foco,d):null;
    if(!x)x=vista==='lista'?$(elegir?'#fuPag':'[data-fu="nueva"]',d):$('input:not([type=file]),select,textarea',d);
    if(x)x.focus();
  }
  function leerForm(){
    var f=editando;
    f.tipo=$('#fuTipo',d).value;f.autores=leerAutores($('#fuAut',d).value);
    $$('[data-c]',d).forEach(function(i){f[i.getAttribute('data-c')]=i.value.trim()});
    return f;
  }
  function previa(){var p=$('.fu-prev',d);if(!p)return;p.textContent='';var f=leerForm();if(s(f.titulo))pintarTrozos(referencia(f),p)}
  d.addEventListener('input',function(e){if(vista==='form'&&e.target.closest('#fuForm'))previa()});
  d.addEventListener('change',function(e){if(e.target.id==='fuTipo'){leerForm();pintar('#fuTipo')}});
  d.addEventListener('click',function(e){
    if(e.target===d){d.close();return}
    var b=e.target.closest('[data-fu]');if(!b)return;
    var acc=b.getAttribute('data-fu'),li=b.closest('.fu-i'),i=li?+li.getAttribute('data-i'):-1;
    if(acc==='cerrar')d.close();
    else if(acc==='volver'){vista='lista';editando=null;pintar()}
    else if(acc==='nueva'){editando={id:nuevoId(),tipo:'libro',autores:[],anio:'',titulo:''};vista='form';pintar()}
    else if(acc==='buscar'){vista='buscar';pintar()}
    else if(acc==='importar'){vista='importar';pintar()}
    else if(acc==='editar'){editando=JSON.parse(JSON.stringify(doc.fuentes[i]));vista='form';pintar()}
    else if(acc==='quitar'){
      var f=doc.fuentes[i],n=citadas(doc.contenido)[f.id]||0;
      if(n&&b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='¿Quitar? Está citada '+(n===1?'1 vez':n+' veces');return}
      doc.fuentes.splice(i,1);cambio();pintar('[data-fu="nueva"]');
    }else if(acc==='citar'){
      var pg=$('#fuPag',d).value.trim(),narr=$('#fuNarr',d).checked,fu=doc.fuentes[i];
      d.close();op.alElegir(fu,pg,narr);
    }
  });
  d.addEventListener('submit',function(e){
    e.preventDefault();
    if(e.target.id==='fuForm'){
      var f=leerForm();
      if(!s(f.titulo)){$('[data-c="titulo"]',d).focus();return}
      var k=-1;doc.fuentes.forEach(function(x,j){if(x.id===f.id)k=j});
      if(k>=0)doc.fuentes[k]=f;else doc.fuentes.push(f);
      cambio();vista='lista';editando=null;pintar();
      var nuevo=$$('.fu-i',d)[k>=0?k:doc.fuentes.length-1];if(nuevo)$('[data-fu="'+(elegir?'citar':'editar')+'"]',nuevo).focus();
    }else if(e.target.id==='fuBuscar'){
      var q=$('#fuQ',d).value.trim(),msg=$('#fuMsg',d);
      if(!q)return;
      var esIsbn=/^[0-9Xx\-\s]{10,17}$/.test(q)&&q.replace(/[^0-9Xx]/g,'').length>=10&&!/^10\./.test(q);
      msg.textContent='Buscando…';
      (esIsbn?porIsbn(q):porDoi(q)).then(function(f){editando=f;vista='form';pintar()},function(){
        msg.textContent='No se encontró o no hay conexión. Revisa el '+(esIsbn?'ISBN':'DOI')+' o agrega la fuente a mano.';
      });
    }else if(e.target.id==='fuImp'){
      var arch=$('#fuArch',d).files[0],m2=$('#fuMsg',d);
      (arch?arch.text():Promise.resolve($('#fuTxt',d).value)).then(function(t){
        var lista=/@\w+\s*[{(]/.test(t)?bibtex(t):ris(t);
        if(!lista.length){m2.textContent='No se encontraron referencias. Revisa que sea BibTeX o RIS.';return}
        lista.forEach(function(f){doc.fuentes.push(f)});
        cambio();vista='lista';pintar();
        AT.aviso('Se importaron '+lista.length+(lista.length===1?' fuente.':' fuentes.'));
      });
    }
  });
  d.addEventListener('close',function(){d.remove();if(dlg===d)dlg=null;if(volver&&volver.focus&&!op.alElegir)volver.focus({preventScroll:true})});
  d.addEventListener('keydown',function(e){if(e.key==='Escape'&&vista!=='lista'){e.preventDefault();vista='lista';editando=null;pintar()}});
  d.showModal();pintar();
  return d;
}

/* ---------- Declaración de autoría ---------- */
/* Párrafos de la declaración, a partir de sus atributos {ia:'no'|'si', usos:[{herramienta, uso}]} y del nombre */
function autorDe(doc){
  var p=(doc&&doc.props||[]).filter(function(x){return /^autor/i.test(s(x.nombre))&&s(x.valor)})[0];
  return p?s(p.valor):'';
}
function declaracion(a,autor){
  a=a||{};
  var usos=(a.usos||[]).filter(function(u){return s(u.herramienta)||s(u.uso)});
  var out=[(autor?'Yo, '+autor+', declaro':'Declaro')+' que este trabajo es de mi autoría: el planteamiento, el análisis y la redacción son míos. Las ideas, los datos y los textos de otras personas están citados en el texto y aparecen en las referencias.'];
  if(a.ia==='si'&&usos.length){
    out.push('Usé herramientas de inteligencia artificial generativa de esta forma:');
    out.push(usos.map(function(u){return (s(u.herramienta)||'Herramienta sin nombre')+(s(u.uso)?': '+terminaPunto(s(u.uso)):'.')}));
    out.push('Revisé lo que esas herramientas produjeron y asumo la responsabilidad de todo el contenido.');
  }else if(a.ia==='si')out.push('Usé herramientas de inteligencia artificial generativa. (Falta decir cuáles y para qué).');
  else out.push('No usé herramientas de inteligencia artificial generativa para escribir este trabajo.');
  return out;
}

/* Vistas que dependen de las fuentes (citas y bibliografías del editor) */
var vistas=new Set();
AT.fuentes={
  TIPOS:TIPOS,referencia:referencia,referenciaTexto:referenciaTexto,cita:cita,citadas:citadas,bibliografia:bibliografia,sufijos:sufijos,
  pintarTrozos:pintarTrozos,trozosMarkdown:trozosMarkdown,bibtex:bibtex,ris:ris,deCrossref:deCrossref,porDoi:porDoi,porIsbn:porIsbn,
  dialogo:dialogo,declaracion:declaracion,autorDe:autorDe,
  estilo:estilo,nombreEstilo:function(doc){return NOMBRE_ESTILO[estilo(doc)]},referenciaIeee:referenciaIeee,ordenCitas:ordenCitas,
  /* El editor avisa el orden de las citas mientras escribes (null al cerrarlo); true si cambió */
  ordenVivo:function(ids){var a=JSON.stringify(vivo),b=JSON.stringify(ids);vivo=ids;return a!==b},
  /* El documento abierto (lo pone documento.js) */
  doc:function(){return AT.docActual||null},
  vigilar:function(v){vistas.add(v);return function(){vistas.delete(v)}},
  refrescar:function(){vistas.forEach(function(v){try{v()}catch(e){}})}
};
})();
