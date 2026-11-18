/* Laboratorios de la lección «Scripts, cron y respaldos». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en scripts.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: arma una línea de cron ---------- */
var DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var MES3=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
/* Un campo de cron como lista de valores permitidos, o null si no es válido */
function campo(txt,min,max){
  var ok={},valido=String(txt).trim().split(',').every(function(parte){
    var m=parte.match(/^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/);if(!m)return false;
    var a=m[1]==='*'?min:+m[2],b=m[1]==='*'?max:m[3]!=null?+m[3]:(m[4]?max:a),paso=m[4]?+m[4]:1;
    if(a<min||b>max||a>b||paso<1)return false;
    for(var v=a;v<=b;v+=paso)ok[v]=1;return true;
  });
  if(!valido)return null;
  return Object.keys(ok).map(Number).sort(function(x,y){return x-y});
}
function lista(vs,nombres){
  var g=[],i=0;
  while(i<vs.length){var j=i;while(j+1<vs.length&&vs[j+1]===vs[j]+1)j++;var f=function(v){return nombres?nombres[v]:String(v)};g.push(j-i>=2?f(vs[i])+' a '+f(vs[j]):j>i?f(vs[i])+', '+f(vs[j]):f(vs[i]));i=j+1}
  return g.length>1?g.slice(0,-1).join(', ')+' y '+g[g.length-1]:g[0];
}
function dos(n){return (n<10?'0':'')+n}
AT.labs['sc-cron']=function(raiz){
  var EJ=[['Diario a las 2:30','30 2 * * *'],['Cada 5 minutos','*/5 * * * *'],['Lunes a viernes, 8:00','0 8 * * 1-5'],['Día 1 de cada mes','0 0 1 * *'],['Domingos a las 23:45','45 23 * * 0']];
  var ins=raiz.querySelectorAll('#ccF input');
  $('#ccEj',raiz).innerHTML=EJ.map(function(e){return '<button class="chip" type="button" data-v="'+e[1]+'" aria-pressed="'+(e[1]==='30 2 * * *')+'">'+esc(e[0])+'</button>'}).join('');
  function pintar(){
    var t=[].map.call(ins,function(i){return i.value.trim()}),R=[[0,59],[0,23],[1,31],[1,12],[0,7]],c=t.map(function(v,k){return campo(v,R[k][0],R[k][1])});
    [].forEach.call(ins,function(i,k){i.setAttribute('aria-invalid',c[k]?'false':'true')});
    $('#ccLinea',raiz).textContent=t.join(' ')+'  /home/ana/respaldo.sh';
    AT.setPressed($('#ccEj',raiz),function(b){return b.getAttribute('data-v')===t.join(' ')});
    var st=$('#ccStat',raiz),malo=c.indexOf(null);
    if(malo>=0){st.setAttribute('data-k','bad');$('#ccMsg',raiz).textContent='El campo «'+['minuto','hora','día del mes','mes','día de la semana'][malo]+'» no es válido. Usa un número, *, una lista (1,15), un rango (1-5) o un paso (*/10).';$('#ccProx',raiz).innerHTML='';return}
    var dow=c[4].map(function(d){return d%7}).filter(function(d,i,a){return a.indexOf(d)===i}).sort(),todoMin=t[0]==='*',todaHora=t[1]==='*';
    var hora;
    if(c[0].length===1&&c[1].length===1)hora='A las '+c[1][0]+':'+dos(c[0][0]);
    else if(/^\*\/\d+$/.test(t[0])&&todaHora)hora='Cada '+t[0].slice(2)+' minutos';
    else if(todoMin&&todaHora)hora='Cada minuto';
    else if(c[0].length===1&&todaHora)hora='En el minuto '+c[0][0]+' de cada hora';
    else hora='En el minuto '+lista(c[0])+(todaHora?' de cada hora':' de las '+lista(c[1])+' horas');
    var domT=t[2]!=='*',dowT=t[4]!=='*',dia;
    if(!domT&&!dowT)dia='todos los días';
    else if(dowT&&!domT)dia='los '+lista(dow,DIAS);
    else if(domT&&!dowT)dia=(c[2].length===1?'el día ':'los días ')+lista(c[2])+' del mes';
    else dia='los días '+lista(c[2])+' del mes y también los '+lista(dow,DIAS)+' (cron junta los dos)';
    var mes=t[3]==='*'?'':', en '+lista(c[3].map(function(m){return m-1}),MES);
    st.setAttribute('data-k',domT&&dowT?'warn':'good');
    $('#ccMsg',raiz).textContent=hora+', '+dia+mes+'.';
    /* Próximas tres: minuto por minuto desde el miércoles 18 de noviembre de 2026, 10:30 */
    var d=new Date(2026,10,18,10,30),out=[];
    for(var k=0;k<527040&&out.length<3;k++){
      d=new Date(d.getTime()+60000);
      if(c[0].indexOf(d.getMinutes())<0||c[1].indexOf(d.getHours())<0||c[3].indexOf(d.getMonth()+1)<0)continue;
      var enDom=c[2].indexOf(d.getDate())>=0,enDow=dow.indexOf(d.getDay())>=0;
      if(domT&&dowT?(enDom||enDow):(enDom&&enDow))out.push(DIAS[d.getDay()]+' '+d.getDate()+' '+MES3[d.getMonth()]+' '+d.getFullYear()+', '+dos(d.getHours())+':'+dos(d.getMinutes()));
    }
    $('#ccProx',raiz).innerHTML=out.length?out.map(function(x){return '<li>'+esc(x)+'</li>'}).join(''):'<li>En el próximo año no corre nunca (por ejemplo, 31 de febrero).</li>';
  }
  elegir('#ccEj',function(v){v.split(' ').forEach(function(x,k){ins[k].value=x});pintar()});
  [].forEach.call(ins,function(i){i.addEventListener('input',pintar)});
  pintar();
};

/* ---------- Demo 2: respalda, programa y restaura ---------- */
var SCRIPT='#!/bin/bash\n# respaldo.sh: respalda una carpeta en ~/respaldos con la fecha en el nombre\n# Uso: ./respaldo.sh carpeta\nORIGEN="$1"\nDESTINO="$HOME/respaldos"\nFECHA=$(date +%F)\n\nif [ -z "$ORIGEN" ]; then\n  echo "Uso: $0 carpeta"\n  exit 1\nfi\nif [ ! -d "$ORIGEN" ]; then\n  echo "No existe la carpeta $ORIGEN"\n  exit 1\nfi\n\nmkdir -p "$DESTINO"\nARCHIVO="$DESTINO/$(basename "$ORIGEN")-$FECHA.tar.gz"\ntar -czf "$ARCHIVO" "$ORIGEN"\necho "Respaldo listo: $ARCHIVO"\n';
AT.labs['sc-terminal']=function(raiz){
  function respaldos(s){var n=s.nodo('/home/ana/respaldos');return n&&n.t==='d'?Object.keys(n.h).filter(function(k){return /\.tar\.gz$/.test(k)}):[]}
  AT.terminal($('.term-host',raiz),{
    clave:'sc-terminal',
    sugerencias:['cat respaldo.sh','ls -l','crontab -l'],
    preparar:function(s){
      var o={u:'ana',g:'ana',modo:0o644};
      s.poner('/home/ana/respaldo.sh',SCRIPT,o);
      s.poner('/home/ana/Documentos/presupuesto.txt','Renta: 6500\nLuz: 420\nInternet: 499\n',o);
      s.poner('/home/ana/Documentos/ideas.md','# Ideas\n- Aprender redes\n- Montar un servidor en casa\n',o);
    },
    tareas:[
      {id:'leer',texto:'Lee el script de respaldo.',pista:'`cat respaldo.sh`. Recibe una carpeta, revisa que exista y la comprime en ~/respaldos con la fecha.',
       ok:function(s,u){return u.uso('cat',/respaldo\.sh/)}},
      {id:'x',texto:'Dale permiso de ejecución.',pista:'`chmod +x respaldo.sh`. Compruébalo con `ls -l`: aparece una x.',
       ok:function(s){var n=s.nodo('/home/ana/respaldo.sh');return !!(n&&n.modo&0o100)}},
      {id:'correr',texto:'Respalda la carpeta Documentos con el script.',pista:'`./respaldo.sh Documentos`. Prueba también sin argumento, o con una carpeta que no existe.',
       ok:function(s){return respaldos(s).length>0}},
      {id:'listar',texto:'Mira qué hay dentro del respaldo, sin extraerlo.',pista:'`ls respaldos` y luego `tar -tzf respaldos/` seguido del nombre del archivo (usa Tab para completarlo).',
       ok:function(s,u){return u.uso('tar',/-t/)&&/Documentos\/presupuesto\.txt/.test(u.salida)}},
      {id:'cron',texto:'Programa el respaldo para que corra todos los días a las 2:30.',pista:'`crontab -e` y agrega la línea `30 2 * * * /home/ana/respaldo.sh /home/ana/Documentos`. Revisa con `crontab -l`.',
       ok:function(s){return /^\s*30\s+2\s+\*\s+\*\s+\*\s+\/home\/ana\/respaldo\.sh\s+\/home\/ana\/Documentos/m.test(s.crontabs.ana||'')}},
      {id:'restaurar',texto:'Prueba el respaldo: restáuralo en /tmp/prueba.',pista:'`mkdir /tmp/prueba` y luego `tar -xzf respaldos/` (el nombre del archivo) `-C /tmp/prueba`. Revisa con `ls /tmp/prueba/Documentos`.',
       ok:function(s){return !!s.leer('/tmp/prueba/Documentos/presupuesto.txt')}}
    ]
  });
};
})();
