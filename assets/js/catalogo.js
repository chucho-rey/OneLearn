/* Temario de OneLearn.
   Cada lección con `archivo` aparece como enlace; sin `archivo` se muestra como «Pronto».
   `id` es la clave de los apuntes guardados: no la cambies en una lección publicada,
   o sus apuntes dejarán de aparecer. Las rutas de `archivo` son relativas a lecciones/. */
window.AT=window.AT||{};
window.AT.catalogo=[
  {grupo:'Hardware',lecciones:[
    {id:'ram',titulo:'Memoria RAM',archivo:'ram.html',icono:'ram'},
    {id:'cpu',titulo:'Procesador (CPU)',archivo:'cpu.html',icono:'cpu'},
    {id:'almacenamiento',titulo:'Almacenamiento'},
    {id:'gpu',titulo:'Tarjeta gráfica'},
    {id:'placa-base',titulo:'Placa base'}
  ]},
  {grupo:'Electrónica',lecciones:[
    {id:'capacitores',titulo:'Capacitores y resistencias'},
    {id:'transistores',titulo:'Transistores'},
    {id:'diodos',titulo:'Diodos y LEDs'}
  ]},
  {grupo:'Software',lecciones:[
    {id:'sistema-operativo',titulo:'Sistema operativo'},
    {id:'memoria-virtual',titulo:'Memoria virtual'},
    {id:'compiladores',titulo:'Compiladores'}
  ]},
  {grupo:'Redes',lecciones:[
    {id:'paquetes',titulo:'Cómo viaja un paquete'},
    {id:'dns',titulo:'DNS y direcciones IP'}
  ]}
];
