/* Temario de OneLearn.
   Cada lección con `archivo` aparece como enlace; sin `archivo` se muestra como «Pronto».
   `id` es la clave de los apuntes guardados: no la cambies en una lección publicada,
   o sus apuntes dejarán de aparecer. Las rutas de `archivo` son relativas a lecciones/.
   En la barra lateral cada grupo se pliega, así que puedes agregar grupos sin que se alargue de más;
   en Inicio, los grupos sin lecciones publicadas se juntan en «Próximos temas». */
window.AT=window.AT||{};
window.AT.catalogo=[
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
