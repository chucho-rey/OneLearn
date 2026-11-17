/* Laboratorios de la lección «Sistema operativo». Cada uno se registra en AT.labs con el nombre de su bloque
   «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en sistema-operativo.html). */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,fmt=AT.fmt,esc=AT.esc,elegir=AT.elegir;

/* ---------- Demo 1: una llamada al sistema ---------- */
AT.labs['so-llamadas']=function(){
  /* Cada paso: en qué capa ocurre (0 programa, 1 kernel, 2 hardware) y qué pasa */
  var ACC=[
    {hw:'SSD',pasos:[
      [0,'El programa llama a una función de la biblioteca, por ejemplo fopen("notas.txt") en C.'],
      [0,'La biblioteca prepara la llamada al sistema open con el nombre del archivo y ejecuta la instrucción syscall.'],
      [1,'El procesador cambia a modo kernel. El kernel busca el archivo en el sistema de archivos y revisa que tengas permiso de abrirlo.'],
      [2,'Si hace falta, el controlador del SSD lee los datos de la carpeta desde el disco.'],
      [1,'El kernel anota el archivo abierto y le asigna un número, el descriptor de archivo (por ejemplo, 3).'],
      [0,'El procesador vuelve a modo usuario y el programa recibe el número 3. Con él pedirá leer o escribir.']]},
    {hw:'SSD',pasos:[
      [0,'El programa pide leer 4 KB del archivo número 3: llamada al sistema read.'],
      [1,'Modo kernel: el kernel revisa si esos datos ya están en su caché de archivos en la RAM.'],
      [2,'No están: el controlador le pide los bloques al SSD y el kernel pone a esperar al proceso mientras llegan.'],
      [2,'El SSD termina y avisa con una interrupción.'],
      [1,'El kernel copia los datos a la memoria del programa y lo marca como listo para correr.'],
      [0,'De vuelta en modo usuario, el programa tiene sus 4 KB.']]},
    {hw:'Pantalla',pasos:[
      [0,'El programa quiere mostrar «Hola» en la terminal: llamada al sistema write sobre la salida estándar (descriptor 1).'],
      [1,'Modo kernel: el kernel entrega el texto a la terminal correspondiente.'],
      [2,'La terminal dibuja las letras y el controlador de video las manda a la pantalla.'],
      [0,'El programa sigue en modo usuario; la llamada devolvió cuántos bytes escribió.']]},
    {hw:'RAM',pasos:[
      [0,'El programa quiere abrir otro: en Linux usa las llamadas fork y exec (en Windows, CreateProcess).'],
      [1,'Modo kernel: el kernel crea un proceso nuevo con su propio espacio de memoria.'],
      [2,'Carga el programa del disco a la RAM y prepara su tabla de páginas.'],
      [1,'Lo agrega a la lista del planificador para que reciba turnos de procesador.'],
      [0,'El programa original recibe el número del proceso nuevo (su PID) y los dos siguen corriendo.']]}
  ];
  var acc=0,i=0;
  function render(){
    var A=ACC[acc],p=A.pasos[Math.max(0,i-1)];
    $('#llHw').textContent=A.hw;
    $$('.ll-c').forEach(function(c){c.classList.toggle('on',i>0&&+c.getAttribute('data-c')===p[0])});
    if(!i){$('#llStat').setAttribute('data-k','');$('#llMsg').textContent='Pulsa «Siguiente paso».'}
    else{
      $('#llStat').setAttribute('data-k',p[0]===0?'':'warn');
      $('#llMsg').textContent=p[1];
    }
    $('#llPaso').textContent=i?'Paso '+i+' de '+A.pasos.length:'';
    $('#llSig').setAttribute('aria-disabled',i>=A.pasos.length?'true':'false');
  }
  $('#llSig').addEventListener('click',function(){if(i<ACC[acc].pasos.length){i++;render()}});
  $('#llReset').addEventListener('click',function(){i=0;render()});
  elegir('#llAcc',function(v){acc=+v;i=0;render()});
  render();
};

/* ---------- Demo 2: el planificador ---------- */
AT.labs['so-planificador']=function(){
  var PROC=[{n:'Editor',l:0,d:6},{n:'Música',l:1,d:2},{n:'Descarga',l:2,d:4},{n:'Chat',l:3,d:1}];
  var MSG={
    fcfs:'En orden de llegada es simple, pero si llega primero un proceso largo, los cortos esperan detrás de él. El chat, que solo necesitaba 1 ms, espera 9.',
    sjf:'El más corto primero da la menor espera promedio, pero hay que saber cuánto durará cada proceso, y un proceso largo podría esperar para siempre si siguen llegando cortos.',
    rr:'Por turnos, todos empiezan pronto: el tiempo hasta el primer turno baja mucho y el sistema se siente ágil. A cambio, hay más cambios de contexto.'
  };
  /* Devuelve la línea de tiempo: el índice del proceso que corre en cada ms */
  function planear(alg){
    var rest=PROC.map(function(p){return p.d}),t=0,linea=[],cola=[],llegados=0;
    function llegan(hasta){while(llegados<PROC.length&&PROC[llegados].l<=hasta){cola.push(llegados);llegados++}}
    llegan(0);
    while(rest.some(function(x){return x>0})){
      if(!cola.length){linea.push(-1);t++;llegan(t);continue}
      var k;
      if(alg==='sjf'){cola.sort(function(a,b){return PROC[a].d-PROC[b].d||PROC[a].l-PROC[b].l});k=cola.shift()}
      else k=cola.shift();
      var q=alg==='rr'?Math.min(2,rest[k]):rest[k];
      for(var j=0;j<q;j++){linea.push(k);rest[k]--;t++;llegan(t)}
      if(rest[k]>0)cola.push(k);
    }
    return linea;
  }
  function render(alg){
    var L=planear(alg),T=L.length,h='<thead><tr><th>Proceso</th>';
    for(var t=0;t<T;t++)h+='<th>'+t+'</th>';
    h+='</tr></thead><tbody>';
    var esp=0,res=0,cam=0;
    PROC.forEach(function(p,k){
      var fin=0,ini=-1,corre=[],celdas='';
      for(var t=0;t<T;t++){
        if(L[t]===k){fin=t+1;if(ini<0)ini=t;corre.push(t)}
        celdas+='<td class="'+(L[t]===k?'run':'')+'"></td>';
      }
      h+='<tr><th scope="row">'+esc(p.n)+' <span>(llega '+p.l+', dura '+p.d+')</span><span class="vh">, corre en los milisegundos '+corre.join(', ')+'</span></th>'+celdas+'</tr>';
      esp+=fin-p.l-p.d;res+=ini-p.l;
    });
    for(var t2=1;t2<T;t2++)if(L[t2]!==L[t2-1])cam++;
    $('#plTab').innerHTML=h+'</tbody>';
    $('#plEsp').textContent=fmt(esp/PROC.length,1)+' ms';
    $('#plRes').textContent=fmt(res/PROC.length,1)+' ms';
    $('#plCam').textContent=cam;
    $('#plMsg').textContent=MSG[alg];
  }
  elegir('#plAlg',render);
  render('fcfs');
};
})();
