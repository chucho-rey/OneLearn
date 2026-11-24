# OneBook

OneBook (antes OneLearn) es un espacio de trabajo hecho de **bloques y plantillas**, enfocado en negocios pequeños: pagos, cobros, pendientes y notas en páginas que cada quien arma a su medida. Todo se guarda en el dispositivo; la versión local es gratis y habrá planes de pago con nube. El plan del cambio y sus fases (F1 a F10, más ideas sin fecha) están en Notion («OneBook: plan para pivotear» y el Roadmap con el área OneBook). La versión anterior quedó en la etiqueta de git `onelearn-final` (commit `b4b9f6f`).

Además conserva todo lo de OneLearn, que desde la fase F2 es el módulo de estudio: lecciones interactivas de tecnología (hardware, electrónica, software, Linux, redes, ciberseguridad e inteligencia artificial) en español, con demos, repaso y apuntes que se guardan solos. Las lecciones se ordenan en rutas de aprendizaje, como «Redes y sistemas», y las de Linux traen una terminal simulada con ejercicios que se califican solos.

Es un sitio estático: no necesita servidor propio ni dependencias para funcionar. Abre `index.html` en el navegador, directamente desde el disco o desde cualquier servidor estático (por ejemplo, GitHub Pages). La única pieza compilada es el editor (Tiptap), y el resultado ya está guardado en `assets/vendor/`.

## Estructura

```
index.html                  Página de bienvenida para negocios (la raíz del sitio): una página de ejemplo hecha con bloques reales,
                            un plan de pagos para probar sin cuenta («Guárdalo en tu espacio» lo convierte en documento), la
                            calculadora de precio de venta (el mismo formulario del bloque), cómo
                            funciona, lo que ya hay y lo que viene, precios y preguntas. Quien ya usa OneBook en ese navegador va
                            directo a inicio.html (con ?conoce se queda en la bienvenida)
estudiantes.html            Bienvenida para estudiantes (la de OneLearn): lecciones, rutas, apuntes y tesis
app.html                    Pestañas dentro de la app, como en un navegador: cada pestaña es una página de la app en un iframe.
                            La app instalada abre aquí; «Abrir en pestañas» (barra lateral) entra con la página actual
entrar.html                 «Crea tu espacio»: para qué usarás OneBook (negocio, finanzas o estudiar), tu negocio o tu nombre y las
                            páginas para empezar; con ?editar cambia el perfil y los módulos; también restaura un respaldo
inicio.html                 Inicio de la app, según el perfil: con estudio, continúa donde te quedaste, tus documentos, notas, tu ruta,
                            proyectos y explorar temas; sin estudio, el nombre del negocio, tus páginas y páginas listas para usar
documento.html              Un documento tuyo (?id=...): editar con el editor de bloques o leerlo como una lección
acerca.html                 «Cómo está hecho OneBook»: las tecnologías del sitio explicadas para estudiantes de programación
rutas.html                  Rutas de aprendizaje: cada ruta por módulos, con su avance y «qué sigue»
proyectos/index.html        Lista de proyectos guiados, con su avance
proyectos/portafolio.html   Proyecto «Tu portafolio web»: 8 fases, su contenido en JSON (<script id="proyecto">)
proyectos/seguridad-negocio.*  Proyecto «Seguridad para un pequeño negocio»: 7 fases, matriz de riesgos y router simulado
proyectos/red-oficina.*     Proyecto «La red de una oficina»: 8 fases y sus diagramas interactivos (.js y .css propios)
manifest.webmanifest        Datos para instalar OneBook como app
sw.js                       Service worker: guarda el sitio para usarlo sin conexión
assets/
  css/base.css              Estilos compartidos: identidad (4 variantes de color), barra lateral, página, bloques, laboratorios, repaso y apuntes
  css/editor.css            Estilos del editor (solo documento.html): barra de herramientas, asa de bloque, menús y formularios
  css/negocio.css           Bloques de negocio: el plan de pagos al leer y los bloques de la tienda (al leer y su formulario,
                            .nb-f), en documento.html y en la bienvenida
  css/terminal.css          Estilos de la terminal simulada (solo en las lecciones que la usan)
  css/red.css               Estilos de los diagramas del simulador de red (solo en las lecciones que lo usan)
  js/ajustes.js             Ajustes de lectura (tema, contraste, tamaño, fuente, espacios, ancho hasta toda la pantalla, barra
                            lateral); se carga en el <head> y expone AT.ajustes
  js/perfil.js              El perfil del espacio y sus módulos (negocio, estudio); en el <head> de todas las páginas, después de
                            ajustes.js. Marca <html> con con-/sin-<módulo>, migra a quien ya usaba OneLearn y manda a entrar.html
                            si no hay espacio (AT.perfil)
  js/entrar.js              El asistente de «Crea tu espacio» (entrar.html)
  js/pestanas.js            El contenedor de pestañas (app.html): abrir, cerrar, cambiar, atajos, recordar, descargar las
                            que no se usan, hasta 12 y la lista en celular (AT.pestanas)
  fonts/                    IBM Plex Sans y Mono, Atkinson Hyperlegible y OpenDyslexic (SIL OFL 1.1), alojadas aquí
  js/catalogo.js            Temario: grupos y lecciones (en la barra lateral, cada grupo se pliega y se recuerda cuáles dejaste abiertos),
                            proyectos (AT.proyectos) y rutas de aprendizaje por módulos (AT.caminos)
  js/base.js                Utilidades (AT.$, AT.esc, AT.ico...), íconos, página actual y repaso (AT.repaso)
  js/datos.js               Tus datos en IndexedDB: documentos, notas, marcadores, tus plantillas, la papelera y las bases de
                            datos (bases y filas), respaldo e importación, también de Bases unificadas (AT.datos)
  js/bases.js               Motor de las bases de datos: tipos de columna, fórmulas sin eval, relaciones, filtro, orden,
                            grupos, totales y CSV (AT.bases)
  js/basedatos.js           Bloque «Base de datos»: vistas de tabla, tablero, galería y calendario, ficha, columnas, vistas
                            guardadas, deshacer, importar y exportar CSV (AT.basedatos)
  css/bases.css             Estilos del bloque «Base de datos», del reporte, los indicadores y los vencimientos
  js/inventario.js          Inventario conectado (fase F7): bases con rol (productos, movimientos, compras, gastos,
                            presupuesto), una vez por espacio; la nota de venta descuenta existencias; bloque «Resumen
                            del inventario» con pedido al proveedor y «Registrar entrada» (AT.inventario)
  js/factura.js             Importar la factura XML (CFDI 4.0 y 3.3) del proveedor: entradas, costos y la compra
                            (AT.factura)
  js/reporte.js             Bloque «Reporte»: desglose por uno o dos campos, periodos, comparar con el anterior,
                            presupuesto, gráfica y «Presentar» en diapositivas (AT.reporte)
  js/indicadores.js         Bloques «Indicadores» y «Próximos vencimientos» (AT.indicadores)
  js/barra.js               Barra lateral, barra superior, menú en celular y pestañas Temas / Mis apuntes / Comunidad
  js/lectura.js             Panel Lectura (tamaño de texto, tema, contraste, fuente y espacios)
  js/apuntes.js             Hoja de apuntes de cada lección (abajo o acoplada a la derecha)
  js/app.js                 App instalable: service worker, aviso de actualización e instalación
  js/respaldo.js            Ventana «Tus datos»: espacio, protección del navegador, descargar e importar respaldo; y la ventana
                            «Papelera»: recuperar, borrar para siempre y vaciar (AT.tusDatos, AT.papelera)
  js/crear.js               «Crear»: tipos de documento (cada uno de un módulo), sus plantillas (también las de negocio: pendientes,
                            corte de caja, fiado, gastos, nota de venta, precios, surtir, proveedores, préstamo) y la ventana
                            «¿Qué quieres crear?» (AT.crear)
  js/editor.js              El editor de bloques sobre Tiptap: bloques propios, barra, menú «/», asa para mover (AT.editor)
  js/documento.js           Página de un documento: modos Editar y Leer, autoguardado, Markdown, duplicar y eliminar
  js/fuentes.js             Fuentes de una tesis: formato APA 7 en español, citas y bibliografía, importar BibTeX y RIS,
                            buscar por DOI (Crossref) o ISBN (Open Library) y la ventana «Fuentes» (AT.fuentes)
  js/autoria.js             Registro de autoría de una tesis: sesiones, lo pegado y su origen, ventana «Autoría» y
                            constancia con huella SHA-256 (AT.autoria)
  js/piezas.js              Piezas académicas: figuras con imagen comprimida, tablas numeradas, ecuaciones y fórmulas (KaTeX),
                            notas al pie, índices de figuras y tablas, y referencias cruzadas (AT.piezas)
  js/pagos.js               Bloque «Plan de pagos»: una deuda en pagos (por número de pagos o pago fijo), calendario y pagos
                            marcados que se descuentan, al editar y al leer (AT.pagos)
  js/negocio.js             Base de los bloques de la tienda: dinero en centavos con signo, fechas, y el marco que registra cada
                            bloque en el editor, al leer, en el Markdown y en «/» (AT.negocio.bloque, vista, formulario)
  js/caja.js                Bloque «Corte de caja»: fondo, ventas por forma de pago, entradas y salidas, efectivo contado (o
                            billete por billete), sobrante o faltante y lo que te llevas (AT.caja)
  js/fiado.js               Bloque «Fiado»: clientes, lo que se llevan y sus abonos, saldo y estado de cuenta (AT.fiado)
  js/gastos.js              Bloque «Gastos del mes»: gastos por mes y categoría, pagados o pendientes, y gastos fijos que
                            «Generar mes» agrega sin repetir (AT.gastos)
  js/venta.js               Bloque «Nota de venta»: folio consecutivo, conceptos, descuento, IVA, forma de pago y cambio (AT.venta)
  js/precio.js              Bloque «Precio de venta»: precio con la ganancia, el IVA y la comisión, o la ganancia real de un
                            precio (AT.precio); también en la bienvenida
  js/porpagar.js            Bloque «Cuentas por pagar»: lo que debes a proveedores, lo vencido y lo que vence esta semana (AT.porpagar)
  js/proteger.js            «Respaldo» de la tesis: aviso, copia descargable y copia automática en un archivo (AT.proteger)
  js/entrega.js             «Entregar»: formato de entrega, portada, preliminares y cuerpo, revisión previa y registro de
                            cada entrega en la autoría (AT.entrega)
  js/imprimir.js            Vista para imprimir o guardar como PDF (imprimir.html), paginada con Paged.js
  js/exportar-docx.js       Exportar una tesis a Word con la librería docx (AT.exportarDocx)
  js/marcadores.js          Marcadores a bloques de las lecciones (botón junto al bloque o tecla M); AT.marcadores
  js/buscar.js              Búsqueda con Ctrl K en lecciones, documentos, notas y marcadores; índice compartido (AT.indice)
  js/bloques.js             Formato de bloques: dibuja una lección o un documento a partir de su JSON (AT.bloques)
  js/avance.js              Avance de lectura por lección, mapa del tema y porcentajes; expone AT.avance
  js/inicio.js              Pantalla de inicio (inicio.html): con negocio, acciones rápidas, «Prepara tu negocio», favoritas y
                            recientes, y páginas listas para usar
  js/landing.js             Bienvenidas: manda al Inicio a quien ya usa OneBook; en index.html dibuja la página de ejemplo, el
                            plan de pagos y la calculadora de precio para probar; en estudiantes.html cuenta lecciones, ruta y proyectos
  css/landing.css           Estilos de las dos páginas de bienvenida
  css/entrar.css            Estilos de «Crea tu espacio»
  css/pestanas.css          Estilos del contenedor de pestañas
  js/proyecto.js            Proyectos: la lista y cada proyecto por fases, con tareas que se guardan (AT.proyectosAvance en base.js)
  js/rutas.js               Página de rutas: módulos, avance y «qué sigue» (el cálculo es AT.avance.camino, en avance.js)
  js/terminal.js            Terminal Linux simulada para los laboratorios (AT.terminal): archivos, permisos, usuarios, sudo, procesos,
                            systemctl, apt, nano, tuberías y redirecciones, scripts, cron, red (ip, ping, dig, curl, nc, ss),
                            SSH entre varios equipos, ufw y nginx, y ejercicios que se califican solos
  js/red.js                 Direcciones IPv4 e IPv6 (AT.ip: subredes, binario, abreviar, EUI-64) y simulador de red (AT.red):
                            dibuja una topología en SVG y calcula el camino de un paquete con rutas estáticas u OSPF
  js/zen.js                 Modo zen, atajos de teclado (Z, N, J/K, ?, Esc) y su lista de ayuda
  icons/                    Ícono de OneBook: el «1» que forma la «B» (SVG y PNG de 32, 180, 192 y 512 px, más una versión maskable)
  vendor/tiptap.min.js      Tiptap y ProseMirror empaquetados (MIT, ver tiptap-LICENSE.txt); no se edita a mano
  vendor/katex/             KaTeX (MIT) con sus fuentes WOFF2: se carga solo cuando un documento tiene ecuaciones
  vendor/paged.min.js       Paged.js (MIT): pagina la vista para imprimir (portada, números de página, notas al pie)
  vendor/docx.min.js        docx (MIT), empaquetado: genera el DOCX de una tesis; se carga al exportar
herramientas/tiptap/        Cómo se compila assets/vendor/tiptap.min.js (esbuild)
herramientas/katex/         Cómo se copia KaTeX a assets/vendor/katex (npm run copiar)
herramientas/exportar/      Cómo se preparan docx.min.js y paged.min.js (npm run copiar)
imprimir.html               Vista para imprimir o guardar como PDF de un documento (imprimir.html?id=…)
pruebas/                    Pruebas automáticas con Playwright (ver pruebas/README.md)
docs/                       Planeación: qué falta para el MVP (MVP.md) y la idea del conector con Claude (conector-claude.md)
lecciones/
  ram.html                  Lección «Memoria RAM»: su documento en JSON y las plantillas de sus laboratorios
  ram.css                   Estilos de sus laboratorios
  ram.js                    Sus laboratorios (AT.labs)
  cpu.html / .css / .js     Lección «Procesador (CPU)»
  como-funciona.html / .css / .js   «Cómo funciona OneBook» (grupo OneBook): guía de uso con laboratorios que usan los controles reales
  <id>.html / .css / .js    Una lección por tema del catálogo (45 publicadas): hardware, electrónica, software, Linux,
                            redes, servidores y nube, ciberseguridad e inteligencia artificial, cada una con 2 a 5 laboratorios.
                            Las que tienen práctica en la terminal cargan terminal.css y terminal.js; las de subredes,
                            IPv6, enrutamiento y VPN, red.css y red.js (antes del script de la lección)
```

Los scripts son clásicos y comparten el objeto global `window.AT` (no se usan módulos ES) para que las páginas también funcionen abiertas con `file://`. Se cargan en este orden: `ajustes.js` (en el `<head>`), `catalogo.js`, `base.js`, `datos.js`, `barra.js`, `lectura.js`, `apuntes.js` (solo en lecciones), `app.js`, `respaldo.js`, `crear.js`, `buscar.js` y después los de cada página. En una lección: su script de laboratorios, `bloques.js`, `marcadores.js`, `avance.js` y `zen.js`. En `documento.html`: `fuentes.js`, `bloques.js`, `vendor/tiptap.min.js`, `editor.js`, `piezas.js`, `autoria.js`, `proteger.js`, `documento.js` y `zen.js`. En `acerca.html`: `bloques.js` y `zen.js`. En `rutas.html`: `avance.js` y `rutas.js`. Las lecciones con terminal o con simulador de red cargan `red.js` y `terminal.js` (las que usen) antes de su script de laboratorios.

Todos los tamaños del CSS van en `rem`, para que la página entera crezca con el tamaño de texto. Los colores son tokens en `base.css` con cuatro variantes (claro, oscuro, alto contraste claro y alto contraste oscuro); usa siempre los tokens, nunca colores sueltos.

## «Cómo está hecho OneBook»

`acerca.html` explica a estudiantes de programación con qué está hecho el sitio: HTML, CSS con variables, JavaScript sin framework, el formato de bloques, Tiptap y esbuild, IndexedDB, el service worker, la accesibilidad, las pruebas y la publicación, con ejemplos del código real y preguntas de repaso. Se abre desde la barra lateral («Cómo está hecho») y desde Inicio, y la búsqueda la incluye. Su contenido es un documento en el formato de bloques, como una lección: **si cambias algo de la arquitectura, actualiza también esta página.**

## Rutas de aprendizaje

Una ruta (`AT.caminos` en `catalogo.js`) ordena lecciones de varios grupos y proyectos en módulos, de lo básico a lo intermedio. `rutas.html` dibuja cada ruta con su avance (lecciones leídas al 100 % y proyectos terminados) y el botón «Qué sigue» (la primera lección o proyecto publicado que no has terminado). Inicio muestra la ruta con su siguiente paso, y al final de cada lección de una ruta se dice en qué módulo está y cuál sigue en la ruta, si no es la misma que la siguiente del temario.

La primera ruta es **Redes y sistemas**, en 7 módulos: Linux y la terminal, fundamentos de redes, direcciones, comunicación, servicios y administración, intermedio y proyectos. Están publicadas sus 27 lecciones y sus dos proyectos. Si una ruta futura incluye lecciones que todavía no existen, van en el catálogo sin `archivo` y salen como «Pronto».

## Terminal simulada

Las lecciones de Linux, redes y servidores tienen laboratorios con una terminal de Ubuntu que corre en el navegador (`assets/js/terminal.js`, sin servidor). Simula también la red: la puerta de enlace, un internet de ejemplo con DNS, y otros equipos (`remotos`) a los que se entra con `ssh`, cada uno con sus servicios, su firewall (`ufw`) y su nginx. Un laboratorio la crea con `AT.terminal(contenedor, opciones)`: `archivos` agrega archivos y carpetas al escenario, `preparar(sis, t)` ajusta procesos, servicios o usuarios, y `tareas` son los ejercicios, cada uno con `ok(sis, ultimo, t)`, una función que revisa el estado después de cada comando (por ejemplo, `sis.permisos('~/diario.txt')==='600'` o `ultimo.uso('grep', /ERROR/)`). Los ejercicios terminados se guardan en `localStorage` (`aprende-tecnologia:terminal`) y entran en el respaldo. Otros módulos pueden agregar comandos con `AT.terminal.comando(nombres, meta, fn)` (así agrega `docker` la lección de contenedores) y usar las piezas de `AT.terminal.util`; `s.red.web[ip]` y `s.red.dns[nombre]` agregan sitios y nombres de ejemplo, como la API de la lección de HTTP.

## Tesis y autoría

La tesis es el primer tipo académico de «Crear» (en `crear.js`, `academico:true`). Empieza con índice, índice de figuras, índice de tablas, la **declaración de autoría**, resumen, cinco capítulos, conclusiones, referencias y anexos; los datos de la portada (autor, universidad, programa, asesor, año) son propiedades. El plan completo de la fase y la investigación de herramientas están en `docs/tesis.md`.

- **Fuentes** (`fuentes.js`): viven en el documento (`doc.fuentes`). Se agregan a mano, por DOI (Crossref) o ISBN (Open Library), o importando BibTeX o RIS de Zotero y Mendeley. El formato es APA 7 en español: «y» entre autores, «et al.» desde tres, «s. f.», 2020a y 2020b para el mismo autor y año, y el formato de 2025 para conversaciones con IA.
- **Citas y bibliografía**: el nodo en línea `referencia` ({fuente, pagina, narrativa}) dibuja «(Pérez, 2020, p. 15)» o «Pérez (2020)», y el bloque `bibliografia` lista las fuentes citadas en orden alfabético, con sangría francesa. Se insertan con «Citar», con «/» o desde «Insertar»; solo los documentos académicos los ofrecen.
- **Declaración de autoría** (bloque `declaracion`, {ia, usos}): declara que el trabajo es propio y, si se usó IA, cuál y para qué. Al leer se ve como una declaración formal con el nombre del autor.
- **Registro de autoría** (`autoria.js`, `doc.autoria`): una extensión del editor cuenta por sesión lo tecleado, borrado y pegado (solo números; deshacer no cuenta). Al pegar un texto largo, una barra pregunta de dónde viene (de ti, de una fuente para citarla, o de una IA). La ventana «Autoría» resume el registro y descarga una **constancia** en HTML con sesiones, orígenes, las figuras y tablas con su nota de origen, la declaración y la huella SHA-256 del texto (y de las imágenes, si hay).
- **Piezas académicas** (`piezas.js`): `figura` (imagen comprimida en el dispositivo a WebP de hasta 1600 px, con título, texto alternativo y nota de origen; se inserta con «/imagen», pegando o arrastrando), `tablaNumerada` (una tabla con «Tabla N», título y nota), `ecuacion` y `formula` (LaTeX dibujado con KaTeX, que se carga solo si hace falta; «$$» y `$x^2$` al escribir), `notaPie` (Ctrl+Alt+F; al leer, las notas van al final con enlaces de ida y vuelta), `indicePiezas` y `refCruzada` («Figura 3», «Tabla 2», «Ecuación (4)» o una sección; se renumeran solas). Figuras, tablas y ecuaciones llevan `attrs.clave`, única en todo el documento, que es el destino de las referencias. Imágenes, ecuaciones y notas están en todos los documentos; la numeración de figuras, las tablas numeradas, los índices y las referencias cruzadas, solo en los académicos. `AT.bloques.registrar` agrega su dibujo al leer.
- **Pestañas** (`app.html`, `pestanas.js`, fase F3): varias páginas abiertas a la vez dentro de la app. Cada pestaña es un iframe del mismo origen; `base.js` detecta que vive en una (`AT.enPestana`) y le avisa al contenedor sus cambios de título y dirección, le pasa los atajos (Alt+T nueva, Alt+W cerrar, Alt+1…9, Alt+AvPág/RePág) y abre en pestaña nueva los enlaces con clic central o Ctrl/Cmd+clic. Hasta 12; se recuerdan (`aprende-tecnologia:pestanas`, que no cuenta como «ya usaba OneLearn») y al volver solo se carga la activa; las que llevan 10 minutos sin usarse se descargan. Antes de cerrar o descargar una pestaña se guarda lo pendiente (`AT.docGuardarYa`). En celular, un botón con el número de pestañas abre la lista. La misma página en dos pestañas (de la app o del navegador) no se pisa: `documento.js` avisa al abrir (BroadcastChannel `onebook-documentos`), la anterior guarda y queda solo para leer con «Editar aquí», y la nueva vuelve a leer el documento si llega ese último guardado. El botón Atrás del celular cierra primero lo abierto: las ventanas `<dialog>` lo hacen solas y los paneles usan `AT.alAtras` (CloseWatcher).
- **Bloques de la tienda** (`negocio.js` y un archivo por bloque, fase F4): corte de caja (`caja.js`), fiado (`fiado.js`), gastos del mes (`gastos.js`), nota de venta (`venta.js`), precio de venta (`precio.js`) y cuentas por pagar (`porpagar.js`). Se insertan con «/» en cualquier documento (módulo negocio), calculan en centavos y en pesos, y los negativos salen siempre con signo (−) y en rojo; un sobrante o una ganancia, con + y en verde. `AT.negocio.bloque(nombre, definición)` registra cada uno: el nodo atómico del editor con un atributo JSON por clave, su formulario (los campos se enlazan con `data-k="ruta"`, las casillas con `data-fecha` guardan la fecha del día, los botones con `data-acc`), su vista al leer (sus casillas y botones también cambian el bloque y se guardan: marcar pagado, anotar abonos, cambiar de mes), su texto para la búsqueda y su Markdown. El mismo formulario sirve fuera del editor (`AT.negocio.formulario`, la calculadora de la bienvenida). **Gastos:** los gastos fijos (cada mes, cada año o una sola vez) se anotan una vez y «Generar mes» crea sus filas del mes como pendientes, sin repetir las que ya estén (idea de Bases unificadas). **Nota de venta:** folio consecutivo por prefijo con `AT.folio('V')` (base.js; `aprende-tecnologia:folios`, en el respaldo, y al importar se queda el número más alto); al leer sale como recibo con el nombre y el teléfono del negocio y aclara que no es un comprobante fiscal. Todos se imprimen (`imprimir.js` tiene sus estilos de papel) y en el DOCX van como texto. En un bloque angosto, las tablas de gastos, fiado y cuentas por pagar se vuelven tarjetas.
- **Perfiles y módulos** (`perfil.js`, `entrar.html`, fase F2): cada espacio tiene un perfil (negocio, personal o estudio) que enciende módulos. El núcleo (páginas, notas, tablas, imágenes, imprimir, respaldo, búsqueda y ajustes) está siempre; el módulo **negocio** trae el plan de pagos, los bloques de la tienda y las plantillas de negocio; el módulo **estudio**, las lecciones, rutas, proyectos, libretas, apuntes, tesis y las herramientas académicas del editor. Lo de un módulo apagado no se muestra: la barra lateral (sin estudio, solo Inicio, Crear, Buscar y tus páginas), el Inicio (secciones `.m-estudio`, `.m-sin-estudio`), «Crear», el menú «/» (`modulo` en cada elemento de `AT.editorInsertar`) y la búsqueda. Los scripts de documento.html se siguen cargando todos (cualquier documento se puede abrir, aunque su módulo esté apagado). Sin espacio, Inicio manda a «Crea tu espacio»; quien ya usaba OneLearn queda con estudio y negocio. El perfil entra en el respaldo.
- **Entregar** (`entrega.js`, `imprimir.js`, `exportar-docx.js`, hito T4): el botón «Entregar» de la barra abre el formato de entrega (`doc.formato`: citas APA 7 o IEEE, papel carta o A4, Times New Roman o Arial a 12 puntos, interlineado doble o 1.5, margen izquierdo de 2.54 o 4 cm) y la lista «Antes de entregar» (declaración, pegados sin origen, figuras sin nota, citas o referencias rotas, secciones vacías, datos de la portada). La plantilla es la genérica de APA: portada sin número (de las propiedades), preliminares con números romanos (índices, declaración, resumen), cuerpo con números arábigos desde la introducción o el primer capítulo, número de página arriba a la derecha y cada capítulo en una página nueva. El **PDF** se hace en `imprimir.html` con Paged.js (índice con número de página, notas al pie al pie de su página) y se guarda con «Imprimir»; el **DOCX** se arma con la librería docx: estilos de Word, índice como campo que Word actualiza, índices de figuras y tablas desde sus leyendas, notas al pie de Word, imágenes, ecuaciones nativas de Word (`latexToMath`) y la huella del texto en las propiedades. Cada entrega queda en `doc.autoria.entregas` con su huella y la constancia las lista. Cualquier otro documento se puede imprimir o guardar como PDF desde «⋯».
- **IEEE** (`fuentes.js`): con `doc.formato.estilo === 'ieee'`, las citas se numeran por orden de primera aparición ([1], [2, p. 12]; el editor avisa el orden con `AT.fuentes.ordenVivo`) y la bibliografía va en ese orden, en el formato IEEE en español.
- **Proteger la tesis** (`proteger.js`): el botón «Respaldo» de la barra dice cuándo fue la última copia fuera del navegador y avisa si no hay una reciente. Su ventana descarga una copia de la tesis (se recupera con «Importar respaldo»), activa la **copia automática** en un archivo de la computadora (File System Access, en Chrome y Edge de escritorio; el enlace al archivo se guarda en IndexedDB, base `onelearn-archivos`) y pide al navegador que conserve los datos.

## Proyectos

«Proyectos» (barra lateral e Inicio) guía casos prácticos por fases, para que el estudiante termine con algo que pueda mostrar al buscar trabajo. El primero, **Tu portafolio web**, va desde cero: en su propia computadora, con Visual Studio Code, Git y GitHub, el estudiante crea y publica su sitio personal en 8 fases (preparar la computadora, planear, HTML, CSS, celular y accesibilidad, JavaScript, Git y GitHub, publicar y presentarlo).

Cada fase trae objetivo, qué aprenderás, para qué sirve en el trabajo, la explicación con código de ejemplo (en el formato de bloques), tareas que se marcan y un entregable; la última guarda la dirección del sitio publicado (solo https). El avance vive en `localStorage` (`aprende-tecnologia:proyectos`) y entra en el respaldo de «Tus datos».

**Seguridad para un pequeño negocio** (básico, sin programar) es una evaluación de seguridad de una panadería ficticia: inventario de activos, matriz de riesgos, cuentas (gestor de contraseñas y segundo factor), equipos y respaldos, el router, capacitación y plan de respuesta a incidentes; el estudiante aplica cada medida en sus propios dispositivos y entrega un informe profesional en GitHub.

**La red de una oficina** (intermedio), es un caso de redes: el estudiante diseña la red de un despacho contable ficticio (diagrama, equipos, costos y plan de IP), monta un servidor Ubuntu en una máquina virtual con Nextcloud para compartir archivos y editar documentos en colaboración, da acceso remoto seguro a las laptops por VPN (Tailscale, sobre WireGuard), programa respaldos y documenta todo en GitHub. Trae diagramas interactivos: la topología con el camino de los datos, un comprobador del plan de IP y un comparador de opciones de acceso remoto.

Un proyecto puede tener laboratorios o diagramas como las lecciones: bloques `laboratorio` en sus fases, sus `<template data-lab>` en la página y `AT.labs[...]` en `proyectos/<id>.js` (cargado antes de `bloques.js`).

Para agregar un proyecto: crea `proyectos/<id>.html` como `portafolio.html` con su JSON (`{id, titulo, props, intro, fases: [{id, titulo, duracion, objetivo, aprenderas, trabajo, contenido, tareas, entregable, enlace}]}`), agrégalo a `AT.proyectos` en `catalogo.js` (con el total de `tareas` y `fases`, que la prueba 14 comprueba) y a `sw.js`.

## Formato de bloques

Las lecciones y los documentos que crea cada estudiante usan el mismo formato, y se dibujan con el mismo código (`assets/js/bloques.js`):

```json
{
  "formato": 1, "tipo": "leccion", "id": "ram", "titulo": "Memoria RAM", "icono": "ram",
  "props": [{"nombre": "Nivel", "valor": "Básico", "estilo": "verde"}],
  "contenido": {"type": "doc", "content": [
    {"type": "heading", "attrs": {"id": "s-que", "level": 2}, "content": [{"type": "text", "text": "¿Qué es la memoria RAM?"}]},
    {"type": "paragraph", "attrs": {"id": "b-ram002"}, "content": [{"type": "text", "text": "La RAM", "marks": [{"type": "bold"}]}]}
  ]}
}
```

`contenido` usa el esquema del editor (Tiptap/ProseMirror). Cada bloque de primer nivel tiene un `id` fijo, que es el ancla de los marcadores: no lo cambies en una lección publicada. Tipos de bloque: `paragraph`, `heading` (niveles 2 y 3; los de nivel 2 son las secciones), listas (`bulletList`, `orderedList`, `taskList`), `blockquote`, `codeBlock`, `horizontalRule`, `table`, `callout` (variantes `info`, `aviso`, `idea`), `columnas`, `desplegable`, `laboratorio`, `repaso`, `indice` y `resumen`. El texto admite negrita, cursiva, subrayado, tachado, código, enlace, resaltado, subíndice y superíndice. El dibujo nunca interpreta el texto como HTML y descarta enlaces `javascript:`.

## Cómo agregar una lección

1. En `assets/js/catalogo.js`, agrega `archivo` a la lección (por ejemplo, `archivo:'gpu.html'`). Así deja de mostrarse como «Pronto» y aparece en la barra lateral y en «Siguiente lección».
2. Copia `lecciones/ram.html` como `lecciones/gpu.html`, cambia el `<title>` y la descripción, pon `data-leccion="gpu"` en el `<body>` (igual al `id` del catálogo) y reemplaza el JSON de `<script type="application/json" id="documento">` por el de la lección nueva.
3. Si la lección tiene laboratorios, crea `lecciones/gpu.css` y `lecciones/gpu.js`. Cada laboratorio es un bloque `{"type": "laboratorio", "attrs": {"id": "...", "nombre": "gpu-algo", "titulo": "..."}}`, una plantilla `<template data-lab="gpu-algo">` con su HTML y una función `AT.labs['gpu-algo']=function(raiz){...}` en el script. Tienes `AT.$`, `AT.$$`, `AT.fmt`, `AT.esc`, `AT.setPressed`, `AT.elegir` (un grupo de botones que elige un valor) y `AT.reduce`, y en `base.css` las piezas comunes de los laboratorios (`.kpis`, `.barras`/`.br`, `.msg`, `.campo`, `.status`, `.chips`, `.seg`). Las preguntas de repaso van en el bloque `repaso` del JSON.
4. Agrega los archivos nuevos a `ARCHIVOS` en `sw.js` y sube `VERSION`, para que la lección funcione sin conexión. Si la lección es parte de una ruta, ya está en `AT.caminos` por su `id`.
5. Agrega sus comprobaciones en `pruebas/comprobaciones.js` (los cálculos clave de cada laboratorio). `pruebas/13-temas.js` revisa sola cualquier lección del catálogo: contraste, desbordes y cada control de cada laboratorio.

No cambies el `id` de una lección ya publicada: es la clave con la que se guardan sus apuntes.

## Tus datos

Todo lo que escribe cada estudiante se guarda solo en su navegador; nada se sube a un servidor (la sincronización llegará con las cuentas).

- **IndexedDB** (base `onelearn`, `assets/js/datos.js`) guarda los documentos, las notas rápidas de cada lección y los marcadores. Si el navegador no tiene IndexedDB, se usa `localStorage`.
- La base va en su versión 2: además de documentos, notas y marcadores, guarda **tus plantillas** (almacén `plantillas`, entran en el respaldo) y la **papelera** (almacén `papelera`: al eliminar una página pasa ahí con la fecha; se recupera tal como estaba, se borra para siempre o se vacía, y lo que lleva más de 30 días se borra solo; no entra en el respaldo).
- Cada nota se escribe primero en `localStorage` (al instante) y luego en IndexedDB; si la página se cierra a la mitad, la siguiente carga termina de guardarla. Así se pasaron también las notas de la fase 1, sin perder ninguna.
- El avance de lectura y los ajustes siguen en `localStorage`, porque se leen antes de pintar la página.
- **Tus datos** (barra lateral) muestra cuánto hay guardado, el espacio usado y el disponible (lo que el navegador reserva para OneBook), si el navegador protege los datos (almacenamiento persistente) y permite **descargar un respaldo** en JSON e **importarlo** en otro navegador. Importar combina: entra lo que no existe y lo más reciente; nunca se borra nada.

## App instalable y sin conexión

OneBook se puede instalar como app desde el navegador (en iPhone, con Compartir > Agregar a inicio) y funciona sin conexión: `sw.js` guarda una copia de todo el sitio. Con conexión, cada archivo se pide primero a la red, así que siempre se ve lo publicado; sin conexión, se usa la copia.

**Al agregar o quitar un archivo del sitio** (una lección nueva, por ejemplo), agrégalo a la lista `ARCHIVOS` de `sw.js` y sube `VERSION`. La prueba `pruebas/6-app.js` falla si a la lista le falta algo.


## Crear y editar

«Crear» (barra lateral e inicio) abre la **galería de plantillas** (fase F5): categorías que se filtran (para tu negocio, tus finanzas, paquetes por giro, estudio y «Mis plantillas»), búsqueda sin acentos y, en cada plantilla, los bloques que trae. Estudio: **libreta de estudio** (índice, secciones, preguntas de repaso y resumen, como una lección), **notas** (una página en blanco), **apuntes de clase** (materia, profesor y fecha arriba; tareas al final) o **tesis** (ver «Tesis y autoría» abajo). Negocio: pendientes del día, cortes de caja, fiado, gastos, nota de venta, precios de venta, lista para surtir, proveedores, clientes, lista de precios y plan de negocio; finanzas: finanzas del mes, me deben y préstamo o crédito. Los **paquetes por giro** (tienda, comida, servicios, catálogo y freelance) crean varias páginas de una vez. Libro, documento de investigación, guía para examen, bitácora, presentación, documento en blanco y cotización llegan después.

**Tus plantillas:** en un documento, «⋯ › Guardar como plantilla» la guarda con un nombre y para qué sirve; «Sin lo anotado» (marcado) quita ventas, abonos, gastos del mes, cuentas, pagos marcados y tareas hechas, y deja nombres, gastos fijos y lo escrito. En la galería salen primero, en «Mis plantillas», con un botón para eliminarlas («Deshacer» en el aviso). Al usarlas, cada bloque se prepara (`AL_CREAR` en `crear.js`): el corte con la fecha de hoy, la nota de venta con folio nuevo (también en el título) y los gastos en el mes actual.

**Bases de datos** (fase F6, «/base»): una base vive aparte de las páginas (almacenes `bases` y `filas` de IndexedDB, versión 3 de la base), así que otras bases la leen sin abrir la página. Columnas de texto, número, moneda, fecha, selección, selección múltiple, casilla, teléfono, relación con una fila de cualquier base, dato de la relación, fórmula (`{Cantidad} * {Precio}`, con + − × ÷ y paréntesis; analizador propio, sin `eval`; errores `#REF`, `#ERROR` y `#CICLO`) y suma de otra base (lo que suman las filas que se relacionan con esta). La primera columna es el nombre de la fila. Vistas guardadas en pestañas: tabla (agrupar con subtotales), tablero por una selección (mover una tarjeta cambia su valor), galería y calendario por una fecha; cada una con búsqueda, filtro, orden en dos niveles y columnas ocultas. Total al pie por columna (suma, promedio o conteo, de lo que se ve), negritas y resaltado. Ficha de cada fila con las filas de otras bases que se relacionan con ella. Deshacer y rehacer (Ctrl+Z, Ctrl+Y). Importar CSV (reconoce $1,250.50, fechas día/mes/año y sí/no) y exportar lo que se ve. Al leer también se usa; al imprimir sale la vista como tabla. Las plantillas «Inventario» y «Clientes» traen la suya (el bloque lleva una semilla y la base se crea al abrir la página); duplicar la página copia la base; borrar la página para siempre borra sus bases. «Importar respaldo» abre un respaldo de **Bases unificadas**: cada libro, una página con sus tablas como bases, con relaciones, fórmulas, totales, columnas ocultas y vistas guardadas. Las fórmulas también comparan y deciden (fase F7): `SI({Existencias} < {Mínimo}; "Bajo"; "Bien")`, `Y`, `O`, `NO`, `MIN`, `MAX`, `ABS`, `REDONDEAR`, `DIAS({Vence})`, `HOY()`, texto entre comillas y `&`. Formato condicional: hasta tres reglas de color por columna (es, no es, contiene, mayor, menor, vacío → verde, amarillo, rojo o azul).

**Inventario, reportes y «Mi negocio»** (fase F7): las bases con rol (`rol`: productos, movimientos, compras, gastos, presupuesto) existen una vez por espacio; la plantilla Inventario, sus duplicados y tus plantillas muestran las mismas (el bloque lleva `semilla:{rol}` y `inventario.js` la busca o la crea). Productos calcula existencias (al empezar + entradas y salidas), por surtir, estado, valor y ganancia; la nota de venta liga cada concepto a un producto (`prod`), toma su precio, dice cuántos quedan y, al guardarse la página, se vuelve un movimiento «Venta» (`m-origen` venta:<página>:<bloque>:<concepto>; la papelera lo quita y se concilia al abrir). «Resumen del inventario»: valor, bajos y agotados, «Hacer pedido» por proveedor (crea la página del pedido), «Registrar entrada» e «Importar factura XML» (CFDI: entradas, costo nuevo y la compra; PUE pagada, PPD por pagar con su vencimiento; sin duplicar por folio fiscal). «Reporte» desglosa una base por uno o dos campos (una fecha agrupa por mes), suma, cuenta o promedia, en un periodo, con filtro, comparado con el periodo anterior (signo, flecha y porcentaje) o con un presupuesto (disponible en rojo si te pasas), con gráfica, «Presentar» en diapositivas e impresión en carta vertical u horizontal. «Indicadores» (cifras clave con flecha) y «Próximos vencimientos» (bases, planes de pago y cuentas por pagar). Plantillas «Reporte del mes» (un mes completo pasa al mes en curso al usar tu plantilla) y «Presupuesto del mes». En un espacio de negocio, el Inicio muestra «Mi negocio» (`d-minegocio`), una página de bloques que se crea sola y se edita como cualquier otra.

**Favoritas y papelera:** la estrella de la barra superior de un documento (o «⋯ › Agregar a favoritas») la marca sin cambiarle la fecha; las favoritas salen primero en la barra lateral, con su estrella, y aparte en el Inicio. «⋯ › Mover a la papelera» la saca de tus páginas; el Inicio ofrece «Deshacer», y la papelera (al final de tus páginas o en «Tus datos») la recupera o la borra para siempre. No hay páginas dentro de páginas, a propósito.

**Inicio de negocio:** acciones rápidas (el corte de hoy, una venta, el fiado, un gasto; abren la página que ya tienes con `documento.html#agregar=<bloque>`, que la abre para editar y agrega el corte de hoy si falta, o la crean), «Prepara tu negocio» (cinco pasos que se marcan solos al revisar tus páginas; se puede ocultar) y las páginas listas para usar con «Ver todas las plantillas». Con el perfil personal, las acciones son de finanzas.

Cada documento se abre en `documento.html?id=...` con dos modos: **Editar** (título, propiedades y el editor) y **Leer** (dibujado con `bloques.js`, igual que una lección; la tecla E vuelve a editar). Se guarda solo, unos instantes después de cada cambio. En el editor:

- Barra de herramientas (con flechas entre botones): deshacer, tipo de bloque, negrita, cursiva, subrayado, tachado, resaltado, código, enlace, listas, «Insertar» y opciones del bloque.
- **«/»** abre el menú para insertar: secciones, listas, tareas, callouts (información, aviso, idea), tabla, desplegable, columnas, preguntas de repaso, resumen, índice, cita textual, código, separador, imagen, ecuación, nota al pie, **plan de pagos** (`pagos.js`: el monto total y el número de pagos o un pago fijo, semanal, quincenal o mensual; calcula cada pago, el último absorbe el redondeo, y los pagos marcados se descuentan de lo que falta, también en modo lectura) y los **bloques de la tienda** (corte de caja, fiado, gastos del mes, nota de venta, precio de venta y cuentas por pagar). El menú pone primero lo que se llama como lo escrito (`/venta` ofrece la nota de venta antes que el corte de caja).
- **Asa del bloque** (al pasar el ratón): «+» inserta debajo; «⋮⋮» se arrastra para mover el bloque o abre sus opciones.
- Atajos: Alt+↑/↓ mueven el bloque, Ctrl+Mayús+D lo duplica, Ctrl+Z deshace, Esc suelta el editor (y otro Esc sale del modo zen).
- «⋯» descarga el documento como Markdown, lo duplica o lo elimina (con «Deshacer»).

## Marcadores, citas y búsqueda

- **Marcadores:** en una lección, al pasar el ratón (o tocar) un bloque aparece un botón para guardarlo; la tecla M guarda la sección que estás leyendo. Se listan en «Mis apuntes» y se quitan desde ahí o con el mismo botón.
- **Citas:** en el editor, «@» busca entre tus marcadores, las secciones de las lecciones y tus documentos, e inserta una cita. Al leer, tocar la cita lleva a ese bloque, resaltado (`lecciones/ram.html#b-...`).
- **Búsqueda:** Ctrl K (⌘K en Mac) o «Buscar» en la barra lateral. Busca sin acentos y con varias palabras en las lecciones (leídas de sus propios archivos, así funciona sin conexión), tus documentos, las notas rápidas y los marcadores. En el editor, Ctrl K con texto seleccionado crea un enlace.

## El editor (Tiptap)

Tiptap viene en muchos paquetes de npm que hay que empaquetar en uno. Eso se hace una sola vez, al actualizar su versión, y el resultado (`assets/vendor/tiptap.min.js`) se guarda en el repositorio, así que el sitio sigue sin necesitar compilación para publicarse:

```
cd herramientas/tiptap
npm install
npm run compilar
```

Las versiones están fijadas en `herramientas/tiptap/package.json`. El código propio del editor de OneBook no se compila: es un script clásico más que usa `window.Tiptap`.
