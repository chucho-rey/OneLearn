# Pruebas de OneLearn

Pruebas automáticas con Playwright. Cada archivo cubre un hito (de la fase 1 o la 2) y comprueba que todo funcione: en celular y escritorio, con texto del 90% al 150%, con las tres fuentes, en claro, oscuro y alto contraste, y con el teclado. Fallan si encuentran desbordes, errores, texto con poco contraste o un comportamiento distinto del esperado.

Las pruebas sirven el sitio en `http://127.0.0.1:<puerto>/OneLearn/`, igual que GitHub Pages, con un servidor incluido en `lib.js`. No hace falta instalar nada más.

## Cómo correrlas

En tu computadora, la primera vez:

```
cd pruebas
npm install
npx playwright install chromium
```

Después:

```
npm test               # todas
node todas.js 3 5      # solo la 3 y la 5
DETALLE=1 node 2-lectura.js   # muestra también cada comprobación que pasa
```

## Qué cubre cada archivo

| Archivo | Qué comprueba |
|---|---|
| `1-identidad.js` | Las cuatro variantes de color, el contraste, los cinco tamaños de texto y la migración de preferencias anteriores |
| `2-lectura.js` | El panel Lectura: cada opción, el teclado, Restablecer, el contraste del sistema y las fuentes para dislexia |
| `3-barra.js` | Las pestañas de la barra lateral, Mis apuntes y el foco en el menú del celular |
| `4-avance.js` | El registro de lectura, el mapa del tema, el repaso y la pantalla de inicio |
| `5-zen.js` | El modo zen sin ratón, los atajos y la nota acoplada a la derecha |
| `6-app.js` | La app instalable: manifiesto, íconos, que `sw.js` guarde todo el sitio, uso sin conexión e «Instalar» |
| `7-bloques.js` | El formato de bloques: las lecciones dibujadas desde su JSON, sus laboratorios y repaso, y que un documento no pueda inyectar código |
| `8-datos.js` | Tus datos: las notas de antes pasan a IndexedDB, guardado y recarga, otras pestañas, respaldo (descargar, navegador limpio, importar) y uso sin IndexedDB |
| `9-editor.js` | «Crear» y el editor: una libreta con secciones, callout, tabla y repaso que se ve como una lección; autoguardado, deshacer, mover, duplicar y arrastrar bloques, menú «/», barra con teclado, Markdown, duplicar, eliminar y deshacer, apuntes de clase y notas en celular |
| `10-marcadores.js` | Marcadores (ratón, tecla M y celular), su lista en Mis apuntes, la búsqueda con Ctrl K y citar un bloque de la RAM con «@» en una libreta que lleva de vuelta a ese bloque |
| `14-proyectos.js` | Proyectos: todos los del catálogo (fases completas, diagramas funcionando, enlaces que existen); la lista, las 8 fases del portafolio, tareas que se guardan, la fase donde te quedaste, el entregable solo https, el respaldo, Inicio y la búsqueda |
| `13-temas.js` | Todas las demás lecciones del catálogo (lo lee de `catalogo.js`): variantes de lectura, cada control de cada laboratorio sin errores ni desbordes, y los cálculos de `comprobaciones.js` (en las lecciones de Linux, cada ejercicio de la terminal se resuelve escribiendo los comandos). `LECCIONES=dns,cifrado node 13-temas.js` revisa solo esas |
| `12-hardware.js` | Las lecciones «Almacenamiento» y «Tarjeta gráfica»: todas las variantes de lectura y los cálculos de sus 8 laboratorios |
| `15-rutas.js` | Rutas de aprendizaje: que la ruta coincida con el catálogo, la página en todas las variantes, «qué sigue» con y sin avance, el aviso al final de las lecciones, Inicio, la barra lateral y la búsqueda |
| `16-terminal.js` | La terminal simulada: Tab, historial, Escape y Ctrl+C, errores, tuberías y redirecciones, la contraseña de sudo oculta, nano, ejercicios que se guardan, entran al respaldo y se reinician, teclas en pantalla para celular y el contraste de los colores de la salida |
| `18-piezas.js` | La tesis, segunda parte: «Respaldo» (aviso, copia descargable que se recupera en otro navegador, copia automática en un archivo simulado), figuras (imagen achicada a WebP, pegar imágenes, texto que gana a su imagen), tablas numeradas, ecuaciones y fórmulas con KaTeX, notas al pie, referencias cruzadas que se renumeran al mover una figura, índices, constancia con figuras y huella de imágenes, Markdown, lectura, celular y que no se carguen imágenes externas |
| `20-entregar.js` | Entregar la tesis: la ventana con el formato y «Antes de entregar», citas en IEEE, el DOCX (tres secciones con su numeración, márgenes, interlineado, estilos, índices como campos, imagen, ecuaciones de Word, notas al pie y la huella en las propiedades, leído del ZIP), el PDF con Paged.js (portada, i–v, cuerpo desde 1, índices con enlaces, notas al pie en su página, mismas páginas al guardar), cada entrega en el registro y la constancia, y que una libreta solo se imprime |
| `19-landing.js` | La página de bienvenida: la ve quien llega por primera vez, cifras sacadas del temario, botones hacia la app, «Crear un documento» abre Crear, quien ya usa OneLearn va directo a su Inicio (salvo con `?conoce`), «Ir al contenido» con Tab, y contraste y desbordes en celular, escritorio, oscuro, alto contraste ×1.5 y OpenDyslexic |
| `17-tesis.js` | La tesis: su estructura, el registro de autoría (tecleado, pegado y su origen, deshacer), fuentes a mano, BibTeX, RIS y DOI simulado, citas y bibliografía en APA 7, la declaración de autoría, la constancia con huella, Markdown, modo lectura, celular con alto contraste y que otros documentos no traigan estas herramientas |
| `11-acerca.js` | «Cómo está hecho OneLearn»: se ve bien en todos los temas y anchos, su índice, ejemplos y repaso, el modo zen, el acceso desde Inicio y la búsqueda |
| `lib.js` | Servidor, navegador, auditoría de contraste y utilidades compartidas |

La auditoría de contraste revisa todo el texto visible contra su fondo real y exige 4.5:1 (7:1 con alto contraste), como pide WCAG.
