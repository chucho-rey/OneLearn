/* Laboratorios de la lección «La terminal: primeros comandos». Cada uno se registra en AT.labs con el nombre
   de su bloque «laboratorio»; bloques.js lo llama después de copiar su plantilla (<template data-lab> en terminal.html).
   Los de práctica usan la terminal simulada (assets/js/terminal.js): cada ejercicio se califica solo. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,esc=AT.esc,elegir=AT.elegir;
var CASA='/home/ana';

/* ---------- Demo 1: las partes de un comando ---------- */
AT.labs['tm-partes']=function(raiz){
  var NOM={c:'Comando',o:'Opción',a:'Argumento'};
  var EJ=[
    {t:[['ls','c','lista lo que hay en una carpeta.'],['-l','o','«formato largo»: muestra permisos, dueño, tamaño y fecha de cada cosa.'],['/etc','a','la carpeta que quieres ver. Sin él, ls usa la carpeta donde estás.']],
     r:'Lista en formato largo lo que hay en /etc, la carpeta de configuración.'},
    {t:[['cp','c','copia archivos o carpetas.'],['-r','o','«recursiva»: copia la carpeta con todo lo que tiene adentro. Sin ella, cp no copia carpetas.'],['fotos','a','lo que vas a copiar (el origen).'],['respaldo','a','a dónde (el destino). El orden importa: primero el origen, luego el destino.']],
     r:'Copia la carpeta fotos, con todo su contenido, a una carpeta nueva llamada respaldo.'},
    {t:[['grep','c','busca las líneas que contienen un texto.'],['-i','o','no distingue mayúsculas: encuentra ERROR, Error y error.'],['error','a','el texto que buscas.'],['app.log','a','el archivo donde buscas.']],
     r:'Muestra las líneas de app.log que dicen «error», sin importar cómo esté escrito.'},
    {t:[['mkdir','c','crea carpetas.'],['-p','o','«padres»: crea también las carpetas de en medio que falten y no se queja si ya existen.'],['escuela/redes','a','la ruta que quieres crear. Sin -p, fallaría si escuela todavía no existe.']],
     r:'Crea la carpeta escuela y, dentro de ella, la carpeta redes, en un solo paso.'},
    {t:[['sudo','c','ejecuta el comando que le sigue como administrador. Te pedirá tu contraseña.'],['apt','c','el comando que sudo va a ejecutar: el instalador de programas de Ubuntu.'],['install','a','la acción que quieres. Algunos comandos usan su primer argumento como una orden (un «subcomando»).'],['tree','a','el programa que se va a instalar.']],
     r:'Instala el programa tree con permisos de administrador.'}
  ];
  function pintar(i){
    var e=EJ[i];
    $('#tpLinea',raiz).innerHTML='<span class="tp-ps">$</span> '+e.t.map(function(x){return '<span class="tp-tok tp-'+x[1]+'">'+esc(x[0])+'</span>'}).join(' ');
    $('#tpLista',raiz).innerHTML=e.t.map(function(x){return '<li><code class="tp-tok tp-'+x[1]+'">'+esc(x[0])+'</code><span><b>'+NOM[x[1]]+':</b> '+esc(x[2])+'</span></li>'}).join('');
    $('#tpMsg',raiz).textContent='En resumen: '+e.r;
  }
  elegir('#tpCmd',function(v){pintar(+v)});
  pintar(0);
};

/* ---------- Demo 2: tus primeros pasos ---------- */
AT.labs['tm-pasos']=function(raiz){
  AT.terminal($('.term-host',raiz),{
    clave:'tm-pasos',
    sugerencias:['pwd','ls','ls -l','cd Documentos','cd ..'],
    archivos:{
      '~/Documentos/informe-ventas.txt':'Ventas de octubre\nTienda en línea: 48,200 pesos\nTienda física: 31,750 pesos\n',
      '~/Documentos/receta-pozole.txt':'Pozole rojo para 6 personas\n1 kg de maíz pozolero\n1 kg de carne de cerdo\nChile guajillo y ancho\n',
      '~/Documentos/escuela/':null,
      '~/Documentos/escuela/tarea-redes.txt':'Tarea de redes\n1. Investigar qué es una dirección IP\n2. Dibujar la red de tu casa\nEntrega: viernes\n'
    },
    tareas:[
      {id:'pwd',texto:'Averigua en qué carpeta estás con `pwd`.',pista:'Escribe `pwd` y pulsa Enter. Significa «print working directory»: muestra la carpeta actual.',
       ok:function(s,u){return u.uso('pwd')}},
      {id:'ls',texto:'Mira qué hay en tu carpeta personal con `ls`.',pista:'Escribe `ls`. Las carpetas salen en color y los archivos en texto normal.',
       ok:function(s,u,t){return u.uso('ls')&&t.cwd()===CASA}},
      {id:'cd',texto:'Entra a la carpeta `Documentos`.',pista:'`cd Documentos`. Tip: escribe `cd Doc` y pulsa Tab para completar el nombre.',
       ok:function(s,u,t){return t.cwd()===CASA+'/Documentos'}},
      {id:'lsl',texto:'Dentro de Documentos, mira la lista larga con `ls -l`: ¿cuánto pesa cada archivo?',pista:'Escribe `ls -l`. La columna de números antes de la fecha es el tamaño en bytes.',
       ok:function(s,u){return u.uso('ls',/(^|\s)-\w*l/)&&/informe-ventas/.test(u.salida)}},
      {id:'cat',texto:'Entra a la subcarpeta `escuela` y lee `tarea-redes.txt` con `cat`.',pista:'`cd escuela` y luego `cat tarea-redes.txt`. También funciona de un jalón: `cat escuela/tarea-redes.txt`.',
       ok:function(s,u){return u.uso('cat',/tarea-redes/)&&u.codigo===0}},
      {id:'etc',texto:'Ve a la carpeta de configuración `/etc` con una ruta absoluta y lista lo que hay.',pista:'`cd /etc` (empieza con /, así funciona desde cualquier lugar) y después `ls`.',
       ok:function(s,u,t){return t.cwd()==='/etc'&&u.uso('ls')}},
      {id:'ocultos',texto:'Regresa a tu carpeta escribiendo solo `cd` y muestra también los archivos ocultos.',pista:'`cd` sin nada te lleva a casa. Luego `ls -a`: los ocultos empiezan con punto, como `.bashrc`.',
       ok:function(s,u,t){return t.cwd()===CASA&&u.uso('ls',/(^|\s)-\w*a/)&&/\.bashrc/.test(u.salida)}}
    ]
  });
};

/* ---------- Demo 3: ordena tu carpeta de Descargas ---------- */
AT.labs['tm-ordenar']=function(raiz){
  var D='~/Descargas/';
  var arch={};
  [['foto-playa.jpg','(imagen JPG)'],['foto-perro.jpg','(imagen JPG)'],['captura.png','(imagen PNG)'],['tarea-redes.pdf','(documento PDF)'],
   ['cv-ana.pdf','(documento PDF)'],['instalador-zoom.deb','(paquete de instalación)'],['notas-clase.txt','Clase de redes, martes\n- Una IP identifica a un equipo en la red\n- El router conecta redes distintas\n']].forEach(function(a){arch[D+a[0]]=a[1]+'\n'});
  AT.terminal($('.term-host',raiz),{
    clave:'tm-ordenar',
    sugerencias:['cd Descargas','ls','ls -l'],
    archivos:arch,
    tareas:[
      {id:'ver',texto:'Entra a `Descargas` y mira qué hay.',pista:'`cd Descargas` y luego `ls`.',
       ok:function(s,u,t){return t.cwd()===CASA+'/Descargas'&&u.uso('ls')}},
      {id:'carpetas',texto:'Crea dos carpetas dentro de Descargas: `Fotos` y `PDF`.',pista:'Con un solo comando: `mkdir Fotos PDF` (cada nombre es un argumento).',
       ok:function(s){return s.existe(D+'Fotos','d')&&s.existe(D+'PDF','d')}},
      {id:'fotos',texto:'Mueve las dos fotos `.jpg` a `Fotos` usando un comodín.',pista:'`mv *.jpg Fotos/`. El shell cambia `*.jpg` por todos los nombres que terminan en .jpg.',
       ok:function(s){return s.existe(D+'Fotos/foto-playa.jpg')&&s.existe(D+'Fotos/foto-perro.jpg')}},
      {id:'pdf',texto:'Mueve los dos PDF a la carpeta `PDF`.',pista:'`mv *.pdf PDF/`.',
       ok:function(s){return s.existe(D+'PDF/tarea-redes.pdf')&&s.existe(D+'PDF/cv-ana.pdf')}},
      {id:'copia',texto:'Copia `notas-clase.txt` a tu carpeta `Documentos` (el original se queda en Descargas).',pista:'`cp notas-clase.txt ~/Documentos/`. `~` es tu carpeta personal.',
       ok:function(s){return s.existe('~/Documentos/notas-clase.txt','f')&&s.existe(D+'notas-clase.txt','f')}},
      {id:'borrar',texto:'Borra el instalador `.deb`, que ya no necesitas.',pista:'`rm instalador-zoom.deb`. Usa Tab para no escribir todo el nombre.',
       ok:function(s){return !s.existe(D+'instalador-zoom.deb')}},
      {id:'renombrar',texto:'Cambia el nombre de `captura.png` a `pantalla.png`.',pista:'`mv` también renombra: `mv captura.png pantalla.png`.',
       ok:function(s){return !s.existe(D+'captura.png')&&(s.existe(D+'pantalla.png')||s.existe(D+'Fotos/pantalla.png'))}},
      {id:'leeme',texto:'Crea un archivo `leeme.txt` en Descargas que diga `Ordenado`.',pista:'`echo "Ordenado" > leeme.txt`. Revisa con `cat leeme.txt`.',
       ok:function(s){return /ordenad/i.test(s.leer(D+'leeme.txt')||'')}}
    ]
  });
};

/* ---------- Demo 4: investiga un registro ---------- */
AT.labs['tm-buscar']=function(raiz){
  var LOG=[
    '08:00:01 INFO  Servidor iniciado en el puerto 3000',
    '08:02:14 INFO  login marta',
    '08:05:40 INFO  login luis',
    '08:06:02 WARN  luis: contraseña incorrecta (intento 1)',
    '08:07:55 INFO  pedido 1041 creado por marta',
    '08:12:30 ERROR pago rechazado en el pedido 1041: tarjeta vencida',
    '08:15:12 INFO  login pedro',
    '08:20:44 INFO  pedido 1042 creado por pedro',
    '08:21:03 INFO  pago aprobado en el pedido 1042',
    '08:30:19 WARN  disco al 85 %',
    '08:41:52 ERROR no se pudo enviar el correo de confirmación a pedro',
    '09:02:10 INFO  login marta',
    '09:03:33 INFO  pedido 1043 creado por marta',
    '09:05:01 ERROR la base de datos tardó más de 5 s en responder',
    '09:05:02 WARN  reintentando la conexión con la base de datos',
    '09:05:04 INFO  conexión recuperada',
    '09:30:47 INFO  login luis',
    '09:48:15 INFO  pedido 1044 creado por luis',
    '10:01:00 INFO  login marta',
    '10:15:36 ERROR pago rechazado en el pedido 1044: fondos insuficientes',
    '10:16:02 INFO  respaldo programado para las 23:00',
    '10:20:11 INFO  pedido 1045 creado por marta'].map(function(l){return '2026-11-18 '+l}).join('\n')+'\n';
  AT.terminal($('.term-host',raiz),{
    clave:'tm-buscar',
    sugerencias:['cd registros','ls','cat app.log'],
    archivos:{
      '~/registros/app.log':LOG,
      '~/registros/viejo/':null,
      '~/registros/viejo/app-2026-10.log':'2026-10-31 23:59:58 INFO  cierre de mes\n'
    },
    tareas:[
      {id:'head',texto:'Entra a `registros` y muestra solo las primeras 5 líneas de `app.log`.',pista:'`cd registros` y luego `head -n 5 app.log`.',
       ok:function(s,u){return u.uso('head',/(^|\s)(-n\s*5|-5|--lines=5)(\s|$)/)&&/app\.log/.test(u.linea)}},
      {id:'tail',texto:'Muestra las últimas 3 líneas: lo más reciente que pasó.',pista:'`tail -n 3 app.log`. Los registros crecen hacia abajo, así que lo nuevo está al final.',
       ok:function(s,u){return u.uso('tail',/(^|\s)(-n\s*3|-3|--lines=3)(\s|$)/)&&/app\.log/.test(u.linea)}},
      {id:'grep',texto:'Muestra solo las líneas con `ERROR`.',pista:'`grep ERROR app.log`. grep distingue mayúsculas: «error» en minúsculas no encontraría nada aquí.',
       ok:function(s,u){return u.uso('grep',/ERROR/i)&&/ERROR/.test(u.salida)}},
      {id:'contar',texto:'Cuenta cuántos errores hubo, pasando la salida de grep a `wc -l` con una tubería.',pista:'`grep ERROR app.log | wc -l`. La barra vertical `|` conecta los dos comandos.',
       ok:function(s,u){return /\|/.test(u.linea)&&u.uso('grep',/ERROR/i)&&u.uso('wc')&&u.salida.trim()==='4'}},
      {id:'guardar',texto:'Guarda todas las líneas de error en un archivo `errores.txt`.',pista:'`grep ERROR app.log > errores.txt`. Luego revisa con `cat errores.txt`.',
       ok:function(s){var t=s.leer('~/registros/errores.txt')||s.leer('~/errores.txt')||'';return (t.match(/ERROR/g)||[]).length===4}},
      {id:'marta',texto:'¿Cuántas veces inició sesión marta? Cuéntalo con `grep -c`.',pista:'`grep -c "login marta" app.log`. Las comillas hacen que «login marta» sea un solo argumento.',
       ok:function(s,u){return u.uso('grep',/(^|\s)-\w*c/)&&u.salida.trim()==='3'}},
      {id:'find',texto:'Busca con `find` todos los archivos `.log` de tu carpeta personal, incluidos los de subcarpetas.',pista:'Desde tu carpeta: `find ~ -name "*.log"`. Las comillas evitan que el shell cambie el `*` antes de tiempo.',
       ok:function(s,u){return u.uso('find',/\.log/)&&/app-2026-10\.log/.test(u.salida)}}
    ]
  });
};
})();
