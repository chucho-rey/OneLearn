/* OneBook: motor de las bases de datos (fase F6). Sin interfaz: la pinta basedatos.js.
   Una base vive aparte de las páginas (AT.datos.bases y AT.datos.filas):
     base  {id, nombre, doc (la página que la creó), columnas:[col], vistas:[vista]}
     fila  {id, base, v:{idColumna: valor}, orden}
     col   {id, nombre, tipo, opciones (selección), base y rel/campo (relación, dato de la relación, suma), expr (fórmula),
            moneda (mostrar en pesos un cálculo), pie (suma|promedio|conteo), negritas, resaltado,
            colores:[{op, val, tono}] (formato condicional: la primera regla que se cumple pinta la celda; tono
            bien|aviso|mal|info)}
     vista {id, nombre, tipo (tabla|tablero|galeria|calendario), q (búsqueda), f:{col, op, val} (filtro),
            s y s2:{col, dir} (orden en dos niveles), agrupar (columna), fecha (columna del calendario),
            ocultas:[idColumna], mes (AAAA-MM del calendario)}
   La primera columna es el nombre de la fila (texto): es lo que muestran las relaciones.
   Tipos: texto, número, moneda, fecha, selección, selección múltiple, casilla, teléfono, relación (con una fila de
   cualquier base del espacio), dato de la relación (trae un campo de la fila relacionada), fórmula ({Cantidad} *
   {Precio}, con + − × ÷ y paréntesis; analizador propio, sin eval; errores #REF, #ERROR y #CICLO) y suma de otra base
   (suma un campo de las filas de otra base que se relacionan con esta fila), como en Bases unificadas. Las fórmulas
   también comparan y deciden: SI({Existencias} < {Mínimo}; "Bajo"; "Bien"), MAX, MIN, DIAS({Vence}) y más.
   Una base puede tener un rol (rol: productos, movimientos o compras; lo usa inventario.js) que se conserva en su
   semilla, para que las páginas que la muestran hablen de la misma base.
   Valores guardados: texto y teléfono como texto, número y moneda como número, fecha AAAA-MM-DD, selección texto,
   múltiple lista, casilla verdadero o falso, relación el id de la fila. Los cálculos no se guardan.
   Además: filtrar, buscar, ordenar, agrupar, totales al pie, CSV (leer con tipos detectados, $1,250.50 y día/mes/año;
   escribir) y la semilla de una base (para plantillas, duplicar y crearla al abrir la página).
   Las bases se leen una vez y quedan en memoria; los cambios se guardan al momento y se avisan con AT.bases.on (y
   entre pestañas con AT.datos). Expone AT.bases. Se carga después de datos.js. */
(function(){
'use strict';
var AT=window.AT;
var TIPOS=[['texto','Texto'],['numero','Número'],['moneda','Moneda (pesos)'],['fecha','Fecha'],['seleccion','Selección'],['multiple','Selección múltiple'],
  ['casilla','Casilla'],['telefono','Teléfono'],['relacion','Relación con otra base'],['referencia','Dato de la relación'],['formula','Fórmula'],['suma','Suma de otra base']];
var CALCULADO={referencia:1,formula:1,suma:1};
var OPS=[['contiene','contiene'],['igual','es igual a'],['distinto','no es'],['mayor','es mayor que'],['menor','es menor que'],['vacio','está vacío'],['novacio','no está vacío']];
var PIES=[['','Sin total'],['suma','Suma'],['promedio','Promedio'],['conteo','Conteo']];

function nuevoId(pref){
  var a=new Uint8Array(8),s='';
  (window.crypto||{getRandomValues:function(x){for(var i=0;i<x.length;i++)x[i]=Math.random()*256|0;return x}}).getRandomValues(a);
  for(var i=0;i<8;i++)s+='abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i]%36);
  return pref+'-'+s;
}
function clonar(o){return JSON.parse(JSON.stringify(o))}
function sinAcentos(t){return String(t==null?'':t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}

/* ---------- En memoria ---------- */
var BASES={},FILAS={},CARGAS={},oyentes=[],version=0;
function avisar(c){version++;oyentes.forEach(function(fn){try{fn(c||{})}catch(e){if(window.console)console.error(e)}})}
function on(fn){oyentes.push(fn);return function(){oyentes=oyentes.filter(function(x){return x!==fn})}}
function base(id){return BASES[id]||null}
function filasDe(id){return FILAS[id]||[]}
function colPorId(b,id){return b&&b.columnas.filter(function(c){return c.id===id})[0]||null}
function colPorNombre(b,n){n=sinAcentos(String(n).trim());return b&&b.columnas.filter(function(c){return sinAcentos(c.nombre.trim())===n})[0]||null}
function filaPorId(bid,id){return id?filasDe(bid).filter(function(f){return f.id===id})[0]||null:null}
function ordenar(l){return l.sort(function(a,b){return (a.orden||0)-(b.orden||0)})}
/* Las bases que una base necesita para sus cálculos (relaciones y sumas) */
function vecinas(b){
  var l=[];
  b.columnas.forEach(function(c){if((c.tipo==='relacion'||c.tipo==='suma')&&c.base&&l.indexOf(c.base)<0&&c.base!==b.id)l.push(c.base)});
  return l;
}
/* Lee una base con sus filas (y las que necesita para calcular). Devuelve la base o null */
function cargar(id,prof){
  if(!id)return Promise.resolve(null);
  if(BASES[id])return Promise.all(vecinas(BASES[id]).map(function(v){return (prof||0)<4?cargar(v,(prof||0)+1):null})).then(function(){return BASES[id]});
  if(CARGAS[id])return CARGAS[id];
  CARGAS[id]=Promise.all([AT.datos.bases.leer(id),AT.datos.filas.deBase(id)]).then(function(r){
    delete CARGAS[id];
    if(!r[0])return null;
    BASES[id]=normal(r[0]);FILAS[id]=ordenar(r[1]||[]);
    return Promise.all(vecinas(BASES[id]).map(function(v){return (prof||0)<4?cargar(v,(prof||0)+1):null})).then(function(){return BASES[id]});
  },function(e){delete CARGAS[id];throw e});
  return CARGAS[id];
}
/* Vuelve a leer (por ejemplo, si cambió en otra pestaña) */
function recargar(id){delete BASES[id];delete FILAS[id];return cargar(id).then(function(b){avisar({base:id});return b})}
/* Todas las bases del espacio (para elegir una relación) */
function todas(){return AT.datos.bases.todos().then(function(l){return l.map(normal).sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es')})})}
/* Lo que puede faltar o venir mal de un respaldo */
function normal(b){
  b.nombre=String(b.nombre||'Base de datos');
  b.columnas=(Array.isArray(b.columnas)?b.columnas:[]).filter(function(c){return c&&typeof c==='object'&&c.id});
  if(!b.columnas.length)b.columnas=[{id:'c-nombre',nombre:'Nombre',tipo:'texto'}];
  b.columnas.forEach(function(c){c.nombre=String(c.nombre||'');if(!TIPOS.some(function(t){return t[0]===c.tipo}))c.tipo='texto'});
  b.columnas[0].tipo='texto';
  b.vistas=(Array.isArray(b.vistas)?b.vistas:[]).filter(function(v){return v&&typeof v==='object'&&v.id});
  if(!b.vistas.length)b.vistas=[vistaNueva('Tabla','tabla')];
  b.vistas.forEach(function(v){
    v.nombre=String(v.nombre||'Vista');if(['tabla','tablero','galeria','calendario'].indexOf(v.tipo)<0)v.tipo='tabla';
    v.q=String(v.q||'');v.f=v.f&&typeof v.f==='object'?v.f:{col:'',op:'contiene',val:''};
    v.s=v.s&&typeof v.s==='object'?v.s:{col:'',dir:1};v.s2=v.s2&&typeof v.s2==='object'?v.s2:{col:'',dir:1};
    v.ocultas=Array.isArray(v.ocultas)?v.ocultas:[];
  });
  return b;
}
function vistaNueva(nombre,tipo){return {id:nuevoId('v'),nombre:nombre||'Tabla',tipo:tipo||'tabla',q:'',f:{col:'',op:'contiene',val:''},s:{col:'',dir:1},s2:{col:'',dir:1},ocultas:[]}}

/* ---------- Guardar ---------- */
function guardarBase(b){
  BASES[b.id]=b;
  return AT.datos.bases.guardar(b).then(function(x){avisar({base:b.id,tipo:'base'});return x});
}
function guardarFila(f){
  var l=FILAS[f.base]||(FILAS[f.base]=[]),i=l.map(function(x){return x.id}).indexOf(f.id);
  if(i<0)l.push(f);else l[i]=f;
  version++;
  return AT.datos.filas.guardar(f).then(function(x){avisar({base:f.base,tipo:'fila',id:f.id});return x});
}
function nuevaFila(bid,v){
  var l=filasDe(bid),orden=l.reduce(function(m,f){return Math.max(m,f.orden||0)},0)+1;
  return {id:nuevoId('f'),base:bid,v:v||{},orden:orden};
}
function borrarFila(f){
  FILAS[f.base]=filasDe(f.base).filter(function(x){return x.id!==f.id});
  version++;
  return AT.datos.filas.borrar(f.id).then(function(){avisar({base:f.base,tipo:'fila',id:f.id,borrada:true})});
}
function guardarFilas(lista){
  if(!lista.length)return Promise.resolve([]);
  lista.forEach(function(f){var l=FILAS[f.base]||(FILAS[f.base]=[]),i=l.map(function(x){return x.id}).indexOf(f.id);if(i<0)l.push(f);else l[i]=f});
  version++;
  return AT.datos.filas.guardarVarias(lista).then(function(x){avisar({base:lista[0].base,tipo:'filas'});return x});
}
/* Crea una base a partir de su semilla {nombre, columnas, vistas, filas:[{v}]} (de una plantilla o de duplicar) */
function crear(semilla,doc){
  var s=clonar(semilla||{}),b=normal({id:nuevoId('bd'),nombre:s.nombre||'Base de datos',doc:doc||'',columnas:s.columnas,vistas:s.vistas});
  if(s.rol)b.rol=String(s.rol);
  var mapa={},fs=(s.filas||[]).map(function(x,i){var id=nuevoId('f');if(x.id)mapa[x.id]=id;return {id:id,base:b.id,v:clonar(x.v||{}),orden:i+1}});
  /* Las relaciones con filas de la misma base siguen apuntando a sus copias */
  b.columnas.forEach(function(c){if(c.tipo==='relacion'&&(!c.base||c.base===s.id||c.base==='propia'))c.base=b.id});
  fs.forEach(function(f){b.columnas.forEach(function(c){if(c.tipo==='relacion'&&c.base===b.id&&mapa[f.v[c.id]])f.v[c.id]=mapa[f.v[c.id]]})});
  BASES[b.id]=b;FILAS[b.id]=fs;
  return AT.datos.bases.guardar(b).then(function(){return fs.length?AT.datos.filas.guardarVarias(fs):null}).then(function(){return cargar(b.id)});
}
/* La semilla de una base: su estructura y, si se pide, sus filas (sin lo calculado) */
function semillaDe(id,conFilas){
  return cargar(id).then(function(b){
    if(!b)return null;
    return {id:b.id,nombre:b.nombre,rol:b.rol||undefined,columnas:clonar(b.columnas),vistas:clonar(b.vistas),
      filas:conFilas?filasDe(id).map(function(f){return {id:f.id,v:clonar(f.v)}}):[]};
  });
}

/* ---------- Fórmulas (sin eval) ----------
   {Columna}, números, "texto", + − * / y paréntesis, menos unario, & (une textos), comparaciones (= <> < > <= >=) y
   funciones: SI(condición; sí; no), Y(…), O(…), NO(x), MIN(…), MAX(…), ABS(x), REDONDEAR(x; decimales), DIAS(fecha)
   (días de hoy a esa fecha; negativos si ya pasó) y HOY(). Los argumentos se separan con ; o con ,. Se compila una
   vez a una función; fn.tipo dice qué da: 'numero', 'texto' o 'logico' (para alinear y totalizar). */
var COMPILADAS={};
function aNum(v){
  if(typeof v==='number')return v;
  if(typeof v==='boolean')return v?1:0;
  if(v===''||v==null)return 0;
  var n=Number(String(v).replace(/[$,\s]/g,''));
  return String(v).trim()&&isFinite(n)?n:NaN;
}
function cierto(v){return typeof v==='number'?v!==0&&!isNaN(v):typeof v==='boolean'?v:!!String(v==null?'':v).trim()}
function compararF(a,b){
  var na=typeof a==='number'||typeof a==='boolean',nb=typeof b==='number'||typeof b==='boolean';
  if((na||nb)&&isFinite(aNum(a))&&isFinite(aNum(b)))return aNum(a)-aNum(b);
  return sinAcentos(a).localeCompare(sinAcentos(b),'es',{numeric:true});
}
function hoyISO(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function diasA(t){
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(t||''));if(!m)return '';
  var h=new Date();h=new Date(h.getFullYear(),h.getMonth(),h.getDate());
  return Math.round((new Date(+m[1],+m[2]-1,+m[3])-h)/864e5);
}
/* Cada función: [mínimo de argumentos, máximo, tipo, (args evaluados con g) → valor]; SI, Y y O evalúan solo lo que hace falta */
var FUNCIONES={
  min:[1,99,'numero',function(a){var n=a.map(aNum);return n.length?Math.min.apply(null,n):0}],
  max:[1,99,'numero',function(a){var n=a.map(aNum);return n.length?Math.max.apply(null,n):0}],
  abs:[1,1,'numero',function(a){return Math.abs(aNum(a[0]))}],
  redondear:[1,2,'numero',function(a){var d=a.length>1?Math.max(0,Math.min(6,Math.round(aNum(a[1])))):0,k=Math.pow(10,d);return Math.round(aNum(a[0])*k)/k}],
  dias:[1,1,'numero',function(a){return diasA(a[0])}],
  hoy:[0,0,'texto',function(){return hoyISO()}],
  no:[1,1,'logico',function(a){return !cierto(a[0])}]
};
function compilar(expr){
  if(Object.prototype.hasOwnProperty.call(COMPILADAS,expr))return COMPILADAS[expr];
  var fn=null;
  try{
    var toks=[],re=/\s*(?:(\{[^}]*\})|(\d+(?:\.\d+)?)|["“”]([^"“”]*)["“”]|([A-Za-zÁÉÍÓÚÜÑáéíóúüñ_][A-Za-zÁÉÍÓÚÜÑáéíóúüñ_0-9]*)|(<=|>=|<>|!=|[-+*\/()×÷=<>;,&]))/y,i=0;
    while(i<expr.length){
      if(!expr.slice(i).trim())break;
      re.lastIndex=i;
      var m=re.exec(expr);
      if(!m)throw 0;
      toks.push(m[1]?{r:m[1].slice(1,-1).trim()}:m[2]?{n:+m[2]}:m[3]!==undefined?{s:m[3]}:m[4]?{id:sinAcentos(m[4])}:
        {o:m[5]==='×'?'*':m[5]==='÷'?'/':m[5]==='!='?'<>':m[5]===','?';':m[5]});
      i=re.lastIndex;
    }
    if(!toks.length)throw 0;
    var p=0;
    var mira=function(){return toks[p]&&toks[p].o};
    var con=function(f,t){f.tipo=t;return f};
    var num=function(f){return function(g){return aNum(f(g))}};
    var args=function(){
      if(!toks[p]||toks[p++].o!=='(')throw 0;
      var l=[];
      if(mira()===')'){p++;return l}
      for(;;){l.push(expr0());var o=toks[p++];if(!o)throw 0;if(o.o===')')return l;if(o.o!==';')throw 0}
    };
    var prim=function(){
      var t=toks[p++];
      if(!t)throw 0;
      if(t.n!==undefined){var v=t.n;return con(function(){return v},'numero')}
      if(t.s!==undefined){var s=t.s;return con(function(){return s},'texto')}
      if(t.r!==undefined){var n=t.r;return con(function(g){return g(n)},'dato')}
      if(t.o==='('){var e=expr0();if(!toks[p]||toks[p++].o!==')')throw 0;return e}
      if(t.o==='-'){var u=prim();return con(function(g){return -aNum(u(g))},'numero')}
      if(t.id==='verdadero')return con(function(){return true},'logico');
      if(t.id==='falso')return con(function(){return false},'logico');
      if(t.id==='si'){
        var a=args();if(a.length<2||a.length>3)throw 0;
        var c=a[0],s1=a[1],s2=a[2];
        var tipo=s1.tipo===(s2?s2.tipo:'texto')?s1.tipo:(s1.tipo==='texto'||(s2&&s2.tipo==='texto'))?'texto':s1.tipo==='dato'?(s2?s2.tipo:'dato'):s1.tipo;
        return con(function(g){return cierto(c(g))?s1(g):s2?s2(g):''},tipo);
      }
      if(t.id==='y'||t.id==='o'){
        var l=args(),y=t.id==='y';if(!l.length)throw 0;
        return con(function(g){for(var k=0;k<l.length;k++){var v=cierto(l[k](g));if(y&&!v)return false;if(!y&&v)return true}return y},'logico');
      }
      var F=t.id&&FUNCIONES[t.id];
      if(F){
        var la=args();if(la.length<F[0]||la.length>F[1])throw 0;
        return con(function(g){return F[3](la.map(function(f){return f(g)}))},F[2]);
      }
      throw 0;
    };
    /* Cada operación guarda sus dos lados en su propio cierre (con var en el ciclo, {A} + {B} + {C} se llamaba a sí misma) */
    var dos=function(o,l,b){
      if(o==='&')return con(function(g){var x=l(g),y=b(g);return (x==null?'':String(x))+(y==null?'':String(y))},'texto');
      var x=num(l),y=num(b);
      return con(o==='*'?function(g){return x(g)*y(g)}:o==='/'?function(g){return x(g)/y(g)}:o==='+'?function(g){return x(g)+y(g)}:function(g){return x(g)-y(g)},'numero');
    };
    var nivel=function(sig,ops){return function(){
      var a=sig();
      while(ops.indexOf(mira())>=0){var o=toks[p++].o;a=dos(o,a,sig())}
      return a;
    }};
    var prod=nivel(prim,['*','/']),suma=nivel(prod,['+','-']),une=nivel(suma,['&']);
    var expr0=function(){
      var a=une(),o=mira();
      if(o==='='||o==='<>'||o==='<'||o==='>'||o==='<='||o==='>='){
        p++;var b=une(),l=a;
        return con(function(g){var r=compararF(l(g),b(g));return o==='='?r===0:o==='<>'?r!==0:o==='<'?r<0:o==='>'?r>0:o==='<='?r<=0:r>=0},'logico');
      }
      return a;
    };
    fn=expr0();
    if(p<toks.length)fn=null;
    else if(fn.tipo==='dato')fn.tipo='numero';
  }catch(e){fn=null}
  COMPILADAS[expr]=fn;
  return fn;
}
/* Los nombres de columna que usa una fórmula */
function referencias(expr){var out=[],re=/\{([^}]*)\}/g,m;while((m=re.exec(expr||'')))out.push(m[1].trim());return out}

/* ---------- Valores ---------- */
var SUMAS={},versionSumas=-1;
function sumas(col){
  if(versionSumas!==version){SUMAS={};versionSumas=version}
  var k=col.base+'|'+col.rel+'|'+col.campo;
  if(SUMAS[k])return SUMAS[k];
  var sb=base(col.base),rc=colPorId(sb,col.rel),tc=colPorId(sb,col.campo);
  if(!rc||!tc)return null;
  var m={};
  filasDe(col.base).forEach(function(f){
    var p=f.v[rc.id];if(!p)return;
    var v=valor(sb,f,tc,1);
    if(typeof v==='number'&&isFinite(v))m[p]=(m[p]||0)+v;
  });
  SUMAS[k]=m;
  return m;
}
/* El valor de una celda: lo guardado o lo calculado (número, texto, lista, verdadero/falso o un error «#…») */
function valor(b,f,col,d){
  d=d||0;
  if(!f||!col)return '';
  if(d>12)return '#CICLO';
  if(col.tipo==='referencia'){
    var rc=colPorId(b,col.rel);if(!rc||rc.tipo!=='relacion')return '#REF';
    var tb=base(rc.base);if(!tb)return '#REF';
    var tf=filaPorId(rc.base,f.v[rc.id]);if(!tf)return '';
    var tc=colPorId(tb,col.campo);if(!tc)return '#REF';
    return valor(tb,tf,tc,d+1);
  }
  if(col.tipo==='formula'){
    var fn=compilar(col.expr||'');if(!fn)return '#ERROR';
    var malo=null;
    var r=fn(function(n){
      var c=colPorNombre(b,n);
      if(!c){malo='#REF';return NaN}
      if(c===col){malo='#CICLO';return NaN}
      var v=valor(b,f,c,d+1);
      if(typeof v==='string'&&v.charAt(0)==='#'){malo=v;return NaN}
      return Array.isArray(v)?v.join(', '):v==null?'':v;
    });
    if(malo)return malo;
    if(typeof r==='number')return isFinite(r)?Math.round(r*1e6)/1e6:'#ERROR';
    return typeof r==='boolean'?r:r==null?'':String(r);
  }
  if(col.tipo==='suma'){var m=sumas(col);return m?Math.round((m[f.id]||0)*100)/100:'#REF'}
  var v=f.v[col.id];
  if(col.tipo==='casilla')return !!v;
  if(col.tipo==='multiple')return Array.isArray(v)?v:[];
  if(col.tipo==='numero'||col.tipo==='moneda')return typeof v==='number'&&isFinite(v)?v:'';
  return v==null?'':v;
}
/* Cómo se ve un cálculo: el tipo de la columna de origen (dato de la relación) o pesos si se pidió */
function tipoVisto(b,col){
  if(col.tipo==='referencia'){var rc=colPorId(b,col.rel),tb=rc&&base(rc.base),tc=tb&&colPorId(tb,col.campo);return tc?tipoVisto(tb,tc):'texto'}
  if(col.tipo==='formula'){var fn=compilar(col.expr||'');if(fn&&fn.tipo!=='numero')return 'texto'}
  if(col.tipo==='formula'||col.tipo==='suma')return col.moneda?'moneda':'numero';
  return col.tipo;
}
function esNumerica(b,col){var t=tipoVisto(b,col);return t==='numero'||t==='moneda'}
function numero(n){var t=Math.abs(n).toLocaleString('es-MX',{maximumFractionDigits:2});return n<0?'−'+t:t}
function dinero(n){var t=Math.abs(n).toLocaleString('es-MX',{style:'currency',currency:'MXN'});return n<0?'−'+t:t}
function fechaTexto(t){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t||'');return m?new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'}):String(t||'')}
/* El valor como texto, para ver, buscar, exportar y las relaciones */
function texto(b,f,col,d){
  if(!f||!col)return '';
  if(col.tipo==='relacion'){
    if((d||0)>6)return '#CICLO';
    var tb=base(col.base),tf=tb&&filaPorId(col.base,f.v[col.id]);
    return tf?texto(tb,tf,tb.columnas[0],(d||0)+1)||'Sin nombre':'';
  }
  var v=valor(b,f,col),t=tipoVisto(b,col);
  if(typeof v==='string'&&v.charAt(0)==='#')return v;
  if(v===''||v==null)return '';
  if(typeof v==='boolean')return v?'Sí':'No';
  if(Array.isArray(v))return v.join(', ');
  if(typeof v==='number')return t==='moneda'?dinero(v):numero(v);
  if(t==='fecha')return fechaTexto(v);
  return String(v);
}
function titulo(b,f){return texto(b,f,b.columnas[0])}

/* ---------- Ver: buscar, filtrar, ordenar, agrupar, totales ---------- */
function comparar(a,b){
  var an=typeof a==='number',bn=typeof b==='number';
  if(a===''||a==null)return b===''||b==null?0:1;
  if(b===''||b==null)return -1;
  if(an&&bn)return a-b;
  if(typeof a==='boolean'||typeof b==='boolean')return (a?1:0)-(b?1:0);
  return String(Array.isArray(a)?a.join(', '):a).localeCompare(String(Array.isArray(b)?b.join(', '):b),'es',{numeric:true,sensitivity:'base'});
}
function cumpleFiltro(b,f,filtro){
  if(!filtro||!filtro.col)return true;
  var col=colPorId(b,filtro.col);if(!col)return true;
  var v=valor(b,f,col),t=texto(b,f,col),q=String(filtro.val==null?'':filtro.val).trim(),op=filtro.op||'contiene';
  if(op==='vacio')return t==='';
  if(op==='novacio')return t!=='';
  if(col.tipo==='casilla'){var si=/^(si|sí|1|true|verdadero|x)$/i.test(q);return op==='distinto'?v!==si:v===si}
  var num=typeof v==='number'&&q!==''&&isFinite(Number(q.replace(/[$,\s]/g,'')));
  var qn=num?Number(q.replace(/[$,\s]/g,'')):0;
  var crudo=col.tipo==='fecha'?String(v):t;
  if(op==='mayor')return num?v>qn:comparar(crudo,q)>0;
  if(op==='menor')return num?v<qn:comparar(crudo,q)<0;
  var igual=num?v===qn:Array.isArray(v)?v.some(function(x){return sinAcentos(x)===sinAcentos(q)}):sinAcentos(crudo)===sinAcentos(q)||sinAcentos(t)===sinAcentos(q);
  if(op==='igual')return igual;
  if(op==='distinto')return !igual;
  return sinAcentos(t).indexOf(sinAcentos(q))>=0;
}
/* El color de una celda (formato condicional): el tono de la primera regla que se cumple, o '' */
var TONOS=[['','Sin color'],['bien','Verde'],['aviso','Amarillo'],['mal','Rojo'],['info','Azul']];
function tonoCelda(b,f,col){
  var l=col&&Array.isArray(col.colores)?col.colores:null;if(!l)return '';
  for(var i=0;i<l.length;i++){var r=l[i];if(r&&r.tono&&cumpleFiltro(b,f,{col:col.id,op:r.op||'igual',val:r.val}))return r.tono}
  return '';
}
/* Las filas que se ven en una vista (búsqueda extra opcional), ya filtradas y ordenadas */
function filasVista(b,vista,extra){
  var q=sinAcentos(((vista.q||'')+' '+(extra||'')).trim()),palabras=q?q.split(/\s+/):[];
  var l=filasDe(b.id).filter(function(f){
    if(!cumpleFiltro(b,f,vista.f))return false;
    if(!palabras.length)return true;
    var todo=sinAcentos(b.columnas.map(function(c){return texto(b,f,c)}).join(' '));
    return palabras.every(function(p){return todo.indexOf(p)>=0});
  });
  var s1=vista.s&&colPorId(b,vista.s.col),s2=vista.s2&&colPorId(b,vista.s2.col);
  if(s1||s2)l=l.slice().sort(function(x,y){
    var r=0;
    if(s1)r=comparar(s1.tipo==='relacion'?texto(b,x,s1):valor(b,x,s1),s1.tipo==='relacion'?texto(b,y,s1):valor(b,y,s1))*(vista.s.dir===-1?-1:1);
    if(!r&&s2)r=comparar(s2.tipo==='relacion'?texto(b,x,s2):valor(b,x,s2),s2.tipo==='relacion'?texto(b,y,s2):valor(b,y,s2))*(vista.s2.dir===-1?-1:1);
    return r||(x.orden||0)-(y.orden||0);
  });
  return l;
}
/* Grupos por una columna: [{clave, filas}] en el orden de sus opciones (o alfabético); lo vacío al final */
function agrupar(b,filas,colId){
  var col=colPorId(b,colId);if(!col)return [{clave:'',filas:filas}];
  var g={},orden=[];
  filas.forEach(function(f){
    var k=texto(b,f,col);
    if(!g[k]){g[k]=[];orden.push(k)}
    g[k].push(f);
  });
  var ops=col.tipo==='seleccion'&&Array.isArray(col.opciones)?col.opciones:null;
  orden.sort(function(a,c){
    if(a==='')return 1;if(c==='')return -1;
    if(ops){var ia=ops.indexOf(a),ic=ops.indexOf(c);if(ia>=0&&ic>=0)return ia-ic;if(ia>=0)return -1;if(ic>=0)return 1}
    return comparar(a,c);
  });
  return orden.map(function(k){return {clave:k,filas:g[k]}});
}
/* El total al pie de una columna (respeta el filtro: recibe las filas que se ven) */
function total(b,filas,col){
  if(!col.pie)return null;
  if(col.pie==='conteo')return {v:filas.filter(function(f){return texto(b,f,col)!==''}).length,t:'numero'};
  var ns=filas.map(function(f){return valor(b,f,col)}).filter(function(v){return typeof v==='number'&&isFinite(v)});
  var s=ns.reduce(function(a,x){return a+x},0);
  var v=col.pie==='promedio'?(ns.length?s/ns.length:0):s;
  return {v:Math.round(v*100)/100,t:tipoVisto(b,col)==='moneda'?'moneda':'numero'};
}
function totalTexto(tt){return !tt?'':tt.t==='moneda'?dinero(tt.v):numero(tt.v)}

/* ---------- Capturar: de lo que se escribe al valor guardado ---------- */
function aNumero(t){
  if(typeof t==='number')return t;
  var s=String(t==null?'':t).trim();if(!s)return '';
  var neg=/^[-−(]/.test(s)||/\)$/.test(s);
  s=s.replace(/[−()]/g,'').replace(/[$\s]/g,'').replace(/^-/,'');
  if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)||/^\d+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');
  else if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');
  var n=Number(s);
  return isFinite(n)&&s!==''?(neg?-n:n):'';
}
/* Fechas: AAAA-MM-DD o día/mes/año (como en México) */
function aFecha(t){
  var s=String(t==null?'':t).trim(),m;
  if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)))return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
  if((m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s))){var y=m[3].length===2?'20'+m[3]:m[3];if(+m[2]<=12&&+m[1]<=31)return y+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2)}
  return '';
}
function aCasilla(t){return typeof t==='boolean'?t:/^(si|sí|x|1|true|verdadero|yes)$/i.test(String(t==null?'':t).trim())}
/* El valor que se guarda para lo escrito en una columna */
function capturar(col,t){
  switch(col.tipo){
    case 'numero':case 'moneda':return aNumero(t);
    case 'fecha':return aFecha(t)||'';
    case 'casilla':return aCasilla(t);
    case 'multiple':return (Array.isArray(t)?t:String(t||'').split(/\s*[,;]\s*/)).map(function(x){return String(x).trim()}).filter(Boolean);
    default:return String(t==null?'':t);
  }
}

/* ---------- CSV ---------- */
/* Lee CSV (coma, punto y coma o tabulador; comillas dobles). Devuelve filas de celdas */
function leerCSV(txt){
  txt=String(txt||'').replace(/^\uFEFF/,'');
  var primera=txt.split(/\r?\n/)[0]||'',sep=[',',';','\t'].map(function(s){return [s,primera.split(s).length]}).sort(function(a,b){return b[1]-a[1]})[0][0];
  var filas=[],fila=[],celda='',dentro=false;
  for(var i=0;i<txt.length;i++){
    var ch=txt.charAt(i);
    if(dentro){
      if(ch==='"'){if(txt.charAt(i+1)==='"'){celda+='"';i++}else dentro=false}
      else celda+=ch;
    }else if(ch==='"')dentro=true;
    else if(ch===sep){fila.push(celda);celda=''}
    else if(ch==='\n'||ch==='\r'){
      if(ch==='\r'&&txt.charAt(i+1)==='\n')i++;
      fila.push(celda);filas.push(fila);fila=[];celda='';
    }else celda+=ch;
  }
  if(celda!==''||fila.length){fila.push(celda);filas.push(fila)}
  return filas.filter(function(f){return f.some(function(c){return String(c).trim()!==''})});
}
/* El tipo que parece tener una columna por sus valores */
function detectarTipo(vals){
  var l=vals.map(function(v){return String(v).trim()}).filter(Boolean);
  if(!l.length)return 'texto';
  if(l.every(function(v){return /^-?\$\s?-?[\d,]+(\.\d+)?$/.test(v)||/^\(\$[\d,]+(\.\d+)?\)$/.test(v)})||l.some(function(v){return /\$/.test(v)})&&l.every(function(v){return aNumero(v)!==''}))return 'moneda';
  if(l.every(function(v){return aNumero(v)!==''}))return 'numero';
  if(l.every(function(v){return aFecha(v)!==''}))return 'fecha';
  if(l.every(function(v){return /^(si|sí|no|x|verdadero|falso)$/i.test(v)}))return 'casilla';
  return 'texto';
}
function comillas(s){s=String(s==null?'':s);return /[",\n\r;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
/* CSV de las filas que se ven, con las columnas visibles: números sin formato y fechas AAAA-MM-DD */
function escribirCSV(b,filas,cols){
  var lineas=[cols.map(function(c){return comillas(c.nombre)}).join(',')];
  filas.forEach(function(f){
    lineas.push(cols.map(function(c){
      var v=c.tipo==='relacion'?texto(b,f,c):valor(b,f,c);
      if(typeof v==='number')return String(v);
      if(typeof v==='boolean')return v?'Sí':'No';
      if(Array.isArray(v))return comillas(v.join('; '));
      return comillas(v);
    }).join(','));
  });
  return '\uFEFF'+lineas.join('\r\n')+'\r\n';
}
/* Del CSV a columnas y filas de una base (columnas que ya existen por nombre; las demás, nuevas con su tipo) */
function deCSV(b,txt){
  var filas=leerCSV(txt);
  if(filas.length<2)return {nuevas:[],filas:[],error:'El archivo no tiene filas con datos.'};
  var cab=filas[0].map(function(t,i){return String(t).trim()||'Columna '+(i+1)}),datos=filas.slice(1);
  var nuevas=[],cols=cab.map(function(n,i){
    var c=colPorNombre(b,n);
    if(c&&!CALCULADO[c.tipo])return c;
    if(c)return null;
    c={id:nuevoId('c'),nombre:n,tipo:detectarTipo(datos.map(function(f){return f[i]||''}))};
    nuevas.push(c);return c;
  });
  var l=datos.map(function(f){
    var v={};
    cols.forEach(function(c,i){if(!c||c.tipo==='relacion')return;var x=capturar(c,f[i]==null?'':f[i]);if(x!==''&&!(Array.isArray(x)&&!x.length))v[c.id]=x});
    return v;
  });
  return {nuevas:nuevas,filas:l};
}

/* ---------- Texto y Markdown de un bloque (con la base ya leída) ---------- */
function tablaMd(id,vistaId){
  var b=base(id);if(!b)return '';
  var v=b.vistas.filter(function(x){return x.id===vistaId})[0]||b.vistas[0],cols=b.columnas.filter(function(c){return v.ocultas.indexOf(c.id)<0});
  var fs=filasVista(b,v);
  function celda(t){return String(t).replace(/\|/g,'\\|').replace(/\n/g,' ')}
  return '**'+b.nombre+'**\n\n| '+cols.map(function(c){return celda(c.nombre)}).join(' | ')+' |\n| '+cols.map(function(c){return esNumerica(b,c)?'---:':'---'}).join(' | ')+' |\n'+
    fs.map(function(f){return '| '+cols.map(function(c){return celda(texto(b,f,c))}).join(' | ')+' |'}).join('\n');
}
function textoPlano(id){
  var b=base(id);if(!b)return '';
  return b.nombre+'\n'+filasDe(id).map(function(f){return b.columnas.map(function(c){return texto(b,f,c)}).filter(Boolean).join(' · ')}).join('\n');
}
/* Lee de una vez las bases de un documento (para imprimir sin esperar) */
/* Otros bloques que leen bases (reportes, inventario) agregan aquí lo que necesitan: fn(doc) → promesa */
var precargas=[];
function precargar(doc){
  var ids=[];
  (function rec(l){(l||[]).forEach(function(n){
    if(n&&n.attrs){
      if(n.type==='basedatos'&&n.attrs.base)ids.push(n.attrs.base);
      if(n.attrs.cfg&&typeof n.attrs.cfg==='object'&&n.attrs.cfg.base)ids.push(n.attrs.cfg.base);
    }
    rec(n&&n.content);
  })})(doc&&doc.contenido&&doc.contenido.content);
  return Promise.all(ids.map(function(id){return cargar(id).catch(function(){return null})}).concat(precargas.map(function(fn){try{return Promise.resolve(fn(doc)).catch(function(){return null})}catch(e){return null}})));
}

/* Otras pestañas: si cambió una base que está en memoria, se vuelve a leer */
if(AT.datos&&AT.datos.on)AT.datos.on(function(c,deOtra){
  if(!deOtra)return;
  if(c.almacen==='bases'&&BASES[c.id])recargar(c.id);
  else if(c.almacen==='filas'){var b=c.base&&BASES[c.base]?[c.base]:Object.keys(BASES);b.forEach(function(id){recargar(id)})}
  else if(c.almacen==='*')Object.keys(BASES).forEach(function(id){recargar(id)});
});

AT.bases={TIPOS:TIPOS,CALCULADO:CALCULADO,OPS:OPS,PIES:PIES,nuevoId:nuevoId,clonar:clonar,sinAcentos:sinAcentos,
  cargar:cargar,recargar:recargar,todas:todas,base:base,filas:filasDe,fila:filaPorId,col:colPorId,colPorNombre:colPorNombre,
  guardarBase:guardarBase,guardarFila:guardarFila,guardarFilas:guardarFilas,nuevaFila:nuevaFila,borrarFila:borrarFila,
  crear:crear,semillaDe:semillaDe,vistaNueva:vistaNueva,normal:normal,
  compilar:compilar,referencias:referencias,valor:valor,texto:texto,titulo:titulo,tipoVisto:tipoVisto,esNumerica:esNumerica,
  TONOS:TONOS,tonoCelda:tonoCelda,dinero:dinero,numero:numero,fechaTexto:fechaTexto,filasVista:filasVista,agrupar:agrupar,total:total,totalTexto:totalTexto,cumpleFiltro:cumpleFiltro,
  capturar:capturar,aNumero:aNumero,aFecha:aFecha,leerCSV:leerCSV,detectarTipo:detectarTipo,escribirCSV:escribirCSV,deCSV:deCSV,
  tablaMd:tablaMd,textoPlano:textoPlano,precargar:precargar,precargas:precargas,on:on};
})();
