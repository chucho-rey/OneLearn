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
  {grupo:'Linux',lecciones:[
    {id:'terminal',titulo:'La terminal: primeros comandos',archivo:'terminal.html',icono:'terminal'},
    {id:'permisos',titulo:'Archivos, permisos y usuarios',archivo:'permisos.html',icono:'permisos'},
    {id:'procesos',titulo:'Procesos y servicios',archivo:'procesos.html',icono:'procesos'},
    {id:'apt',titulo:'Instalar software con apt',archivo:'apt.html',icono:'apt'},
    {id:'scripts',titulo:'Scripts, cron y respaldos'}
  ]},
  {grupo:'Redes',lecciones:[
    {id:'que-es-red',titulo:'Qué es una red',archivo:'que-es-red.html',icono:'lan'},
    {id:'modelo-osi',titulo:'Modelo OSI y TCP/IP',archivo:'modelo-osi.html',icono:'osi'},
    {id:'paquetes',titulo:'Cómo viaja un paquete',archivo:'paquetes.html',icono:'paquete'},
    {id:'ethernet',titulo:'Ethernet, MAC y switches',archivo:'ethernet.html',icono:'ethernet'},
    {id:'wifi',titulo:'Wi-Fi',archivo:'wifi.html',icono:'wifi'},
    {id:'dns',titulo:'DNS y direcciones IP',archivo:'dns.html',icono:'globo'},
    {id:'subredes',titulo:'Subredes y CIDR',archivo:'subredes.html',icono:'subred'},
    {id:'dhcp-nat',titulo:'DHCP y NAT',archivo:'dhcp-nat.html',icono:'nat'},
    {id:'ipv6',titulo:'IPv6 en la práctica',archivo:'ipv6.html',icono:'ipv6'},
    {id:'tcp-udp',titulo:'TCP, UDP y puertos',archivo:'tcp-udp.html',icono:'puertos'},
    {id:'enrutamiento',titulo:'Enrutamiento',archivo:'enrutamiento.html',icono:'router'},
    {id:'http',titulo:'HTTP y HTTPS',archivo:'http.html',icono:'http'},
    {id:'diagnostico',titulo:'Diagnóstico de red',archivo:'diagnostico.html',icono:'diagnostico'},
    {id:'vlan',titulo:'VLAN y segmentación'}
  ]},
  {grupo:'Servidores y nube',lecciones:[
    {id:'ssh',titulo:'SSH y acceso remoto'},
    {id:'servidor-web',titulo:'Servidor web con Nginx'},
    {id:'firewalls',titulo:'Firewalls'},
    {id:'vpn',titulo:'VPN'},
    {id:'contenedores',titulo:'Virtualización y contenedores'},
    {id:'monitoreo',titulo:'Monitoreo y registros'},
    {id:'nube',titulo:'Introducción a la nube'}
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

/* Rutas de aprendizaje: ordenan lecciones de varios grupos (y proyectos) en un camino por módulos.
   En la interfaz se llaman «Rutas» (rutas.html); en el código, AT.caminos, porque AT.rutas son las rutas de los archivos.
   `lecciones` y `proyectos` usan los id de AT.catalogo y AT.proyectos; una lección sin `archivo` sale como «Pronto». */
window.AT.caminos=[
  {id:'redes-sistemas',titulo:'Redes y sistemas',icono:'ruta',nivel:'De básico a intermedio',duracion:'40 a 55 horas, con los dos proyectos',
   descripcion:'Aprende a manejar Linux desde la terminal, entiende cómo viajan los datos por una red y administra servidores: SSH, servidor web, firewall, VPN, contenedores y la nube. Termina con dos proyectos reales.',
   para:'Para quien quiere trabajar en soporte técnico, redes o administración de sistemas, o entender la infraestructura que usa como programador. No necesitas saber nada antes: la terminal y los laboratorios funcionan en el navegador.',
   modulos:[
     {titulo:'Linux y la terminal',meta:'Manejar Linux sin ventanas: moverte por las carpetas, dar permisos, vigilar procesos y servicios e instalar programas.',
      lecciones:['sistema-operativo','terminal','permisos','procesos','apt']},
     {titulo:'Fundamentos de redes',meta:'Qué es una red, cómo se organiza en capas y cómo viajan los datos por cable y por Wi-Fi.',
      lecciones:['que-es-red','modelo-osi','paquetes','ethernet','wifi']},
     {titulo:'Direcciones',meta:'Cómo recibe su dirección cada equipo: IP, subredes, DNS, DHCP, NAT e IPv6.',
      lecciones:['dns','subredes','dhcp-nat','ipv6']},
     {titulo:'Comunicación',meta:'Cómo hablan los programas por la red: puertos, TCP y UDP, rutas, HTTP y las herramientas para encontrar fallas.',
      lecciones:['tcp-udp','enrutamiento','http','diagnostico']},
     {titulo:'Servicios y administración',meta:'Montar y proteger servicios: acceso remoto por SSH, un servidor web, firewall, VPN y tareas automáticas.',
      lecciones:['ssh','servidor-web','firewalls','vpn','scripts']},
     {titulo:'Intermedio',meta:'Lo que se usa en las empresas: VLAN, máquinas virtuales y contenedores, monitoreo y la nube.',
      lecciones:['vlan','contenedores','monitoreo','nube']},
     {titulo:'Proyectos',meta:'Aplica todo en dos casos reales, fase por fase, y termina con entregables para tu portafolio.',
      proyectos:['seguridad-negocio','red-oficina']}
   ]}
];
