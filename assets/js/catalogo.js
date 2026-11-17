/* Temario de OneLearn.
   Cada lección con `archivo` aparece como enlace; sin `archivo` se muestra como «Pronto».
   `id` es la clave de los apuntes guardados: no la cambies en una lección publicada,
   o sus apuntes dejarán de aparecer. Las rutas de `archivo` son relativas a lecciones/.
   En la barra lateral cada grupo se pliega, así que puedes agregar grupos sin que se alargue de más;
   en Inicio, los grupos sin lecciones publicadas se juntan en «Próximos temas». */
window.AT=window.AT||{};
window.AT.catalogo=[
  {grupo:'OneLearn',lecciones:[
    {id:'como-funciona',titulo:'Cómo funciona OneLearn',archivo:'como-funciona.html',icono:'info'}
  ]},
  {grupo:'Hardware',lecciones:[
    {id:'ram',titulo:'Memoria RAM',archivo:'ram.html',icono:'ram'},
    {id:'cpu',titulo:'Procesador (CPU)',archivo:'cpu.html',icono:'cpu'},
    {id:'almacenamiento',titulo:'Almacenamiento',archivo:'almacenamiento.html',icono:'disco'},
    {id:'gpu',titulo:'Tarjeta gráfica',archivo:'gpu.html',icono:'gpu'},
    {id:'placa-base',titulo:'Placa base',archivo:'placa-base.html',icono:'placa'}
  ]},
  {grupo:'Electrónica',lecciones:[
    {id:'capacitores',titulo:'Capacitores y resistencias',archivo:'capacitores.html',icono:'resistencia'},
    {id:'transistores',titulo:'Transistores',archivo:'transistores.html',icono:'transistor'},
    {id:'diodos',titulo:'Diodos y LEDs',archivo:'diodos.html',icono:'led'}
  ]},
  {grupo:'Software',lecciones:[
    {id:'sistema-operativo',titulo:'Sistema operativo',archivo:'sistema-operativo.html',icono:'so'},
    {id:'memoria-virtual',titulo:'Memoria virtual',archivo:'memoria-virtual.html',icono:'capas'},
    {id:'compiladores',titulo:'Compiladores',archivo:'compiladores.html',icono:'compilar'}
  ]},
  {grupo:'Redes',lecciones:[
    {id:'paquetes',titulo:'Cómo viaja un paquete',archivo:'paquetes.html',icono:'paquete'},
    {id:'dns',titulo:'DNS y direcciones IP',archivo:'dns.html',icono:'globo'}
  ]},
  {grupo:'Ciberseguridad',lecciones:[
    {id:'contrasenas',titulo:'Contraseñas y autenticación',archivo:'contrasenas.html',icono:'llave'},
    {id:'cifrado',titulo:'Cifrado',archivo:'cifrado.html',icono:'candado'},
    {id:'phishing',titulo:'Phishing e ingeniería social',archivo:'phishing.html',icono:'anzuelo'},
    {id:'malware',titulo:'Malware y cómo protegerte',archivo:'malware.html',icono:'bicho'}
  ]},
  {grupo:'Inteligencia artificial',lecciones:[
    {id:'que-es-ia',titulo:'Qué es la inteligencia artificial',archivo:'que-es-ia.html',icono:'chispa'},
    {id:'aprendizaje-automatico',titulo:'Aprendizaje automático',archivo:'aprendizaje-automatico.html',icono:'grafica'},
    {id:'redes-neuronales',titulo:'Redes neuronales',archivo:'redes-neuronales.html',icono:'red'},
    {id:'modelos-lenguaje',titulo:'Modelos de lenguaje (LLM)',archivo:'modelos-lenguaje.html',icono:'chat'}
  ]}
];

/* Proyectos guiados por fases. `tareas` es el total de tareas del proyecto (para el avance sin abrirlo);
   pruebas/14-proyectos.js comprueba que coincida con el proyecto. Las rutas de `archivo` son relativas a proyectos/. */
window.AT.proyectos=[
  {id:'portafolio',titulo:'Tu portafolio web',archivo:'portafolio.html',icono:'proyecto',nivel:'Desde cero',duracion:'15 a 22 horas',fases:8,tareas:39,
   descripcion:'Crea y publica tu sitio web personal con HTML, CSS, JavaScript, Git y GitHub. Al terminar tendrás un enlace real para tu CV.'},
  {id:'seguridad-negocio',titulo:'Seguridad para un pequeño negocio',archivo:'seguridad-negocio.html',icono:'candado',nivel:'Básico',duracion:'10 a 14 horas',fases:7,tareas:31,
   descripcion:'Evalúa la seguridad de una panadería: cuentas, equipos, respaldos, red y personas. Al terminar entregas un informe de seguridad profesional.'},
  {id:'red-oficina',titulo:'La red de una oficina',archivo:'red-oficina.html',icono:'globo',nivel:'Intermedio',duracion:'15 a 20 horas',fases:8,tareas:38,
   descripcion:'Diseña la red de un despacho, monta un servidor Ubuntu con Nextcloud para editar documentos en colaboración y da acceso remoto seguro por VPN.'}
];
