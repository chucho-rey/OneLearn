# Estructura y funciones

OneBook es un sitio estático: no necesita servidor propio ni dependencias para funcionar. La única pieza compilada es el
editor (Tiptap), y el resultado ya está guardado en `assets/vendor/`.

## Archivos

```
index.html            Bienvenida para empresas: Inicio de ejemplo dibujado, la empresa de ejemplo, cómo se organiza,
                      herramientas por área, calculadora de precio, precios y preguntas. Con datos, va a inicio.html
                      (con ?conoce se queda)
ejemplo.html          Arma la empresa de ejemplo (Ferretería El Clavo) en un navegador sin empresa (ejemplo.js)
app.html              Pestañas dentro de la app (cada pestaña es una página en un iframe); la app instalada abre aquí
entrar.html           «Crea tu empresa»: empresa, departamentos y páginas para empezar; ?editar cambia los módulos;
                      también restaura un respaldo
empresa.html          «Tu empresa»: personas (rol, departamentos, PIN), departamentos y salas (tuempresa.js)
sala.html             Una sala (?id=sa-… o ?id=privado; ?nueva crea una): portada, quién entra, páginas, herramientas
recibir.html          Abre los enlaces entre un Cedis y sus sucursales: invitación, pedido, confirmación y formato (recibir.js)
inicio.html           Inicio: avisos, «Tus páginas» (explorador; en el celular, carpetas) primero, tableros «De tu
                      empresa» y «Lo tuyo», «Prepara tu negocio» y páginas listas para usar
documento.html        Una página (?id=…): editarla con el editor de bloques o leerla
imprimir.html         Vista para imprimir o guardar como PDF (imprimir.html?id=…)
ayuda.html            Ayuda: cada herramienta paso a paso (se genera; ayuda.js y ayuda.css)
manifest.webmanifest  Datos para instalar OneBook como app
sw.js                 Service worker: guarda el sitio para usarlo sin conexión
assets/css/           base.css (identidad, tokens, barra lateral y su árbol, página y bloques), editor.css, negocio.css,
                      bases.css, cedis.css, empresa.css, tablero.css, explorador.css, archivos.css, permisos.css,
                      versiones.css, landing.css, entrar.css, pestanas.css, ayuda.css, imprimir.css
assets/js/ajustes.js  Ajustes de lectura (tema, contraste, tamaño, fuente, espacios, ancho, barra) en el head
assets/js/perfil.js   Perfil del espacio y sus módulos (negocio, rh); en el head, después de ajustes.js
assets/js/base.js     Utilidades (AT.$, AT.esc, AT.ico…), íconos, la página actual y folios
assets/js/datos.js    IndexedDB: páginas, plantillas, papelera, bases y filas, historial, quién eres, permisos,
                      presencia; respaldo, importación (también de Bases unificadas) y borrarTodo
assets/js/empresa.js  La empresa: personas, departamentos, salas, tableros, PIN, respaldo (AT.empresa)
assets/js/persona.js  «¿Quién usa OneBook?» (cambiar de persona, con PIN)
assets/js/barra.js    Barra lateral («Tus páginas» como explorador, AT.ubicaciones), barra superior y menú en celular
assets/js/explorador.js  «Tus páginas» del Inicio: columnas, ordenar, buscar, selección, menú y teclado
assets/js/archivos.js El Inicio en el celular: carpetas, lista, ruta, «+» y navegación inferior (archivos.css)
assets/js/permisos.js «Personas y permisos» de una página
assets/js/tablero.js  Tableros de módulos del Inicio y portada de cada sala (AT.tablero)
assets/js/sala.js     La página de una sala; tuempresa.js, la página «Tu empresa»
assets/js/crear.js    «Crear»: tipos de página, plantillas, paquetes por giro y tus plantillas (AT.crear, AT.tiposDoc)
assets/js/bloques.js  Dibuja una página desde su JSON (AT.bloques)
assets/js/editor.js   El editor de bloques sobre Tiptap: barra, «/», «@», asa y legado (AT.editor)
assets/js/documento.js  Página de un documento: Editar y Leer, autoguardado, Markdown, duplicar, eliminar, historial
assets/js/piezas.js   Imágenes, tablas numeradas, notas al pie y referencias cruzadas
assets/js/pagos.js, negocio.js, caja.js, fiado.js, gastos.js, venta.js, precio.js, porpagar.js
                      Plan de pagos y bloques de la tienda
assets/js/bases.js, basedatos.js  Motor y bloque de las bases de datos
assets/js/inventario.js, factura.js, reporte.js, indicadores.js  Inventario, factura XML, reportes, indicadores
assets/js/cedis.js, pedidos.js  Pedidos al Cedis: bases, claves, enlaces firmados y los bloques del Cedis y del pedido
assets/js/recibir.js  La página que abre los enlaces del Cedis (recibir.html)
assets/js/sincro.js   Sincronización con el servidor de la oficina: conectar, subir, bajar, presencia y el estado
assets/js/nomina.js, rh.js, equipo.js  Recursos humanos: motor 2026, calculadoras y tu equipo
assets/js/versiones.js  Ventana «Historial de versiones» (el motor está en datos.js)
assets/js/exportar.js, imprimir.js, exportar-docx.js  Imprimir o exportar: PDF (Paged.js) y Word (docx)
assets/js/buscar.js   Búsqueda Ctrl K en tus páginas y en la Ayuda
assets/js/inicio.js   El Inicio: tableros por omisión, accesos rápidos, «Mi negocio», «Tu equipo», avisos
assets/js/landing.js, ejemplo.js  Bienvenida y empresa de ejemplo
assets/js/entrar.js, pestanas.js, lectura.js, app.js, respaldo.js, ayuda.js, zen.js
                      Crea tu empresa, pestañas, panel Lectura, app instalable, Tus datos y papelera,
                      Ayuda, modo zen y atajos
assets/fonts/         IBM Plex Sans y Mono, Atkinson Hyperlegible y OpenDyslexic (SIL OFL 1.1)
assets/icons/         Ícono de OneBook (SVG y PNG de 32, 180, 192 y 512 px, y maskable)
assets/vendor/        tiptap.min.js, paged.min.js y docx.min.js (MIT; no se editan a mano)
herramientas/         tiptap/ y exportar/ (cómo se compilan los vendor) y ayuda/generar.py (escribe ayuda.html)
pruebas/              Pruebas automáticas con Playwright (ver docs/pruebas.md)
servidor/             Servidor de la oficina (servidor.js), scripts para Windows y, sin subir a git, datos/ y certificado/
docs/                 Esta documentación y el estado del trabajo (ESTADO.md)
.claude/skills/       Procedimientos para agentes (correr el sitio, retomar, cerrar una tarea, revisar una rama)
```

## Orden de los scripts

Los scripts son clásicos y comparten `window.AT`. Orden: `ajustes.js` y `perfil.js` (en el head), `base.js`, `datos.js`,
`sincro.js` (en las páginas de la app; no en `imprimir.html` ni `ejemplo.html`), `empresa.js`, `barra.js`, `persona.js`, `lectura.js`, `app.js`, `respaldo.js`, `crear.js`, `buscar.js` y después los de
cada página (`entrar.html` e `imprimir.html` cargan `empresa.js` sin la barra).

- `documento.html`: `bloques.js`, `vendor/tiptap.min.js`, `editor.js`, `piezas.js`, los bloques de negocio y de recursos
  humanos, `bases.js`, `basedatos.js`, `inventario.js`, `reporte.js`, `indicadores.js`, `equipo.js`, `factura.js`,
  `cedis.js`, `pedidos.js`, `exportar.js`, `exportar-docx.js`, `documento.js`, `versiones.js`, `permisos.js` y `zen.js`.
- `inicio.html`: los bloques que se dibujan vivos en los tableros, `explorador.js`, `tablero.js`, `archivos.js` e
  `inicio.js` (en ese orden).
- `recibir.html`: `bloques.js`, `bases.js`, `cedis.js` y `recibir.js`.
- `ayuda.html`: `bloques.js`, `zen.js` y `ayuda.js`.

Un bloque nuevo que deba verse en el editor, al leer y al imprimir se carga en `documento.html` e `imprimir.html` (y en
`inicio.html`/`sala.html` si va en los tableros).

## Formato de bloques

```json
{
  "formato": 1, "tipo": "notas", "id": "d-abc123", "titulo": "Ventas de noviembre", "icono": "notas",
  "props": [{"nombre": "Área", "valor": "Ventas", "estilo": "etiqueta"}],
  "contenido": {"type": "doc", "content": [
    {"type": "heading", "attrs": {"id": "b-res001", "level": 2}, "content": [{"type": "text", "text": "Resumen"}]},
    {"type": "paragraph", "attrs": {"id": "b-par002"}, "content": [{"type": "text", "text": "Vendimos más", "marks": [{"type": "bold"}]}]}
  ]}
}
```

Tipos de bloque: `paragraph`, `heading` (niveles 2 y 3; los de nivel 2 son las secciones), listas (`bulletList`,
`orderedList`, `taskList`), `blockquote`, `codeBlock`, `horizontalRule`, `table`, `callout` (`info`, `aviso`, `idea`),
`columnas`, `desplegable`, `indice` y `resumen`, más los que registran otros archivos (piezas, bloques de negocio, base de
datos, reportes, recursos humanos, Cedis). El texto admite negrita, cursiva, subrayado, tachado, código, enlace, resaltado,
subíndice y superíndice, y el enlace a otra página («@», nodo `cita`). El dibujo nunca interpreta el texto como HTML y
descarta enlaces `javascript:`.

## Empresa, personas y departamentos (E2)

- **Empresa**: una por espacio, en `localStorage` (`aprende-tecnologia:empresa`, entra en el respaldo). «Crea tu empresa»
  la crea con quien usa el navegador como propietario. Un espacio sin empresa recibe una automática (`auto`).
- **Personas**: roles de la empresa propietario (uno; puede pasar la empresa), administrador y miembro. En cada
  departamento: responsable, miembro y consulta. El PIN (4 a 8 números) se guarda como huella (cyrb53 con el id).
- **Quién eres**: `AT.datos.yo`. «Cambiar de persona» pide el PIN si hay uno, guarda lo pendiente y recarga como la persona
  nueva (otras pestañas también).
- **«Tu empresa»**: quien administra agrega, cambia y quita personas y departamentos; el responsable de un departamento
  cambia su nombre, color y gente; un miembro cambia solo sus datos. El modelo revisa los mismos permisos.
- **Recursos humanos**: la base Empleados tiene la columna Departamento (`em-depto`, `origen:'departamentos'`); renombrar
  un departamento cambia sus filas.
- **Respaldo**: la misma empresa se junta persona por persona y departamento por departamento (gana el cambio más
  reciente; lo quitado no revive); la de otra empresa no se junta.
- **No es seguridad todavía**: sin servidor, quien tiene el navegador tiene los datos. Con la nube (F9), las cuentas y los
  permisos por fila harán cumplir este modelo.

## Salas (E3)

- **General** (`sa-general`, toda la empresa edita), **una por departamento** (`sa-d…`, su responsable la administra, sus
  miembros editan, los de consulta ven) y **entre departamentos** (`sa-l…`). Cualquier sala agrega departamentos que editan
  o solo ven y personas sueltas. Se crean solas con la empresa y con cada departamento.
- **Permiso de una página** (`rolPagina`): el mayor entre su lista y su sala (la sala solo cuenta si la página es de esta
  empresa). En Privado solo entran su propietario y su lista. Sin lista, la página está en la General.
- **Lo que no ves no está**: barra, explorador, búsqueda, «@» y vencimientos solo usan páginas que puedes ver; abrir una
  sin acceso dice «No tienes acceso» y deja pedirlo.
- **Crear**: «¿Dónde?» elige la sala; «⋯ › Mover a otra sala» la cambia. Una sala con páginas no se quita; quitar un
  departamento deja su sala con la misma gente.

## Inicio armable y portadas (E4)

Un tablero es `{modulos, cambio}` en la empresa (`empresa.tablero`, `persona.tablero`, `sala.tablero`).
`AT.empresa.tablero(capa, sala)` lo lee (null si nadie lo armó), `puedeTablero` dice quién lo edita y `guardarTablero` lo
guarda limpio (hasta 40 módulos, `cfg` de hasta 20,000 caracteres). Módulos: accesos rápidos, una página (bloques vivos;
así son «Mi negocio» y «Tu equipo»), indicadores, vencimientos, inventario, gráfica de una base, tu equipo, avisos,
actividad, tus salas, favoritas y recientes y una nota (solo en «Lo tuyo»). Por omisión (sin guardar nada): «De tu
empresa» trae los accesos rápidos, «Mi negocio» y «Tu equipo»; «Lo tuyo», favoritas y recientes y tus salas.

## El Inicio en el celular

Por debajo de 900 px, el Inicio es una app de archivos con tres secciones abajo: **Páginas** (abre aquí: búsqueda en
píldora, las salas como carpetas con la pestaña del color de su departamento, Privado, Favoritas, Compartidas y Papelera, y
las recientes; adentro de una carpeta, sus páginas con fecha y quién las cambió, orden por fecha o nombre, ruta en chips y
Atrás para subir), **Inicio** (los tableros, Prepara tu negocio, páginas listas para usar e Instalar) y **Empresa** (quién
eres, Tu empresa, las salas, Lectura, Tus datos y Ayuda). El botón flotante «+» crea en la carpeta donde estás. En una
página no hay navegación inferior; la barra lateral (menú) sigue igual. En escritorio no cambia nada.

## Barra lateral como explorador

«Tus páginas» en la barra: ubicaciones con su cuenta (todas, favoritas, recientes, compartidas y, si hay, compartidas
contigo y solicitudes), salas como carpetas (la flecha muestra sus páginas, colgadas de una línea del color del
departamento; se recuerdan abiertas), por tipo y la papelera. Se recorre con flechas como un árbol. En el Inicio, una
ubicación cambia el explorador (en el celular, abre la carpeta); desde otra página abre el Inicio ahí. «Mi negocio» y «Tu
equipo» no cuentan como páginas (están en el tablero).

## Bienvenida y empresa de ejemplo (E5)

`index.html` es para pymes de 5 a 100 personas, con precios (local gratis; la nube «Próximamente» sin cifra) y preguntas
honestas (varias personas hoy, permisos que aún no protegen, CFDI, nómina, Excel). `ejemplo.html` arma Ferretería El Clavo
con cifras fijas (semilla) y fechas relativas a hoy; con una empresa propia no toca nada. «Crear mi empresa» borra el
ejemplo (`AT.datos.borrarTodo`).

## Pestañas, bloques de la tienda y perfiles

- **Pestañas** (F3): hasta 12, se recuerdan (`aprende-tecnologia:pestanas`) y solo carga la activa; las que llevan 10
  minutos sin usarse se descargan. Atajos Alt+T, Alt+W, Alt+1…9, Alt+AvPág/RePág; clic central o Ctrl+clic abre en otra.
  La misma página en dos pestañas no se pisa (la vieja queda para leer con «Editar aquí»).
- **Bloques de la tienda** (F4): corte de caja, fiado, gastos del mes (gastos fijos con «Generar mes»), nota de venta
  (folio consecutivo `AT.folio('V')`; no es comprobante fiscal), precio de venta y cuentas por pagar. Calculan en
  centavos; los negativos van con signo y en rojo. Se imprimen y en el Word van como texto.
- **Perfiles y módulos** (F2): el núcleo (páginas, notas, tablas, imágenes, imprimir, respaldo, búsqueda, ajustes) está
  siempre; el módulo negocio trae el plan de pagos, los bloques de la tienda y sus plantillas; el módulo rh, recursos
  humanos.
- **Piezas**: `figura` (WebP de hasta 1600 px, con pie y texto alternativo), `tablaNumerada`, `notaPie` (Ctrl+Alt+F) y
  `refCruzada`.
- **Imprimir o exportar**: PDF (Paged.js: título y propiedades arriba, número de página, notas al pie, índice con páginas)
  y Word (Arial 11, interlineado 1.15, títulos de Word, tabla numerada, imagen, notas al pie y número de página).

## Tus datos

- Todo se guarda solo en el navegador; la sincronización llegará con las cuentas (F9).
- IndexedDB (base `onelearn`, versión 6): páginas, plantillas (en el respaldo), papelera (30 días; no va en el
  respaldo), bases y filas, historial de versiones de las páginas e historial de las filas (90 días y los últimos 50
  cambios de cada fila; no va en el respaldo).
- **Historial de las filas**: en la ficha de cada fila (quién, cuándo, valor de antes y «Volver a…») y en «⋯ › Actividad»
  de cada base (filtro por persona y «Recuperar fila»). Sin IndexedDB se usa `localStorage`.
- Ajustes, perfil, empresa, folios, quién eres y el Cedis van en `localStorage`.
- «Tus datos» muestra cuánto hay guardado y el espacio, si el navegador protege los datos, y permite descargar e importar
  un respaldo en JSON (importar combina: entra lo que no existe y lo más reciente; nunca borra). «Empezar de cero ›
  Eliminar todos los datos» (con confirmación y la opción de descargar antes un respaldo) borra todo del navegador y abre
  «Crea tu empresa».

## Servidor de la oficina

Una oficina puede correr `servidor/servidor.js` en un equipo siempre prendido (guía: `docs/servidor-local.md`). Cada
dispositivo abre OneBook desde ahí, se conecta una vez con la clave de la oficina y se sincroniza: lo que cambia uno les
llega a los demás en segundos, sin conexión se sigue trabajando y se sube al volver, una página que otro edita se abre
para leer y se actualiza sola, y «Trabajando ahora» muestra a los demás dispositivos. Los datos del servidor se guardan en
archivos con respaldo diario.

## App instalable y sin conexión

Se instala desde el navegador (en iPhone, Compartir › Agregar a inicio) y funciona sin conexión: `sw.js` guarda todo el
sitio y pide primero a la red. Al agregar o quitar un archivo del sitio, actualízalo en `ARCHIVOS` y sube `VERSION`.

## Crear y editar

- **Galería de plantillas**: para tu negocio, recursos humanos, paquetes por giro (tienda, comida, servicios, catálogo) y
  «Mis plantillas» («⋯ › Guardar como plantilla», con o sin lo anotado). La cotización y la presentación llegan después.
- **Bases de datos** (F6): columnas de texto, número, moneda, fecha, selección, selección múltiple, casilla, teléfono,
  relación, dato de la relación, fórmula (con SI, Y, O, NO, MIN, MAX, ABS, REDONDEAR, DIAS, HOY, ENTERO, texto y &;
  errores #REF, #ERROR y #CICLO), suma de otra base, número consecutivo (se pone solo, no se reusa) y saldo acumulado
  (saldo inicial más ingresos menos egresos, fila por fila, con franja de resumen). Vistas de tabla (agrupar), tablero,
  galería y calendario; filtro, orden, totales, ficha de cada fila, deshacer, CSV y formato condicional. Importa
  respaldos de Bases unificadas.
- **Caja chica**: plantilla mensual («Caja chica de noviembre de 2026») con Concepto, Número de movimiento, Fecha,
  Sucursal (HM Montejo), Proveedor, Ingreso/Egreso (verde o rojo), Monto y Saldo; la franja muestra saldo inicial
  (editable), ingresos, egresos y saldo final. La caja chica nueva empieza con el saldo final de la anterior.
- **Pedidos al Cedis** (F8, sin servidor): el Cedis invita a cada sucursal con un enlace que lleva su clave; la sucursal
  llena su pedido (mínimo, múltiplo, fecha de entrega, notas) y lo manda con un enlace firmado por WhatsApp o correo; el
  Cedis lo revisa (firma, versión, otra sucursal), ve el consolidado (insumo × sucursal, quién falta, llegó tarde), confirma
  lo que surte (regresa firmado) e imprime hojas de surtido y lista de compra o descarga el CSV. Ninguna sucursal recibe
  nada de otra.
- **Inventario y reportes** (F7): productos con existencias, por surtir, estado, valor y ganancia; la nota de venta
  descuenta; pedido por proveedor; factura XML (CFDI 4.0 y 3.3); reportes con comparación y presupuesto, gráfica y
  «Presentar»; indicadores y próximos vencimientos.
- **Historial de versiones**: huellas por bloque y trozos compartidos; una versión al abrir, cada 5 minutos, antes de un
  borrado grande, al salir, al restaurar y antes de importar; depuración (24 horas completas, luego una por día hasta 30
  días y una por semana hasta 6 meses; las que tienen nombre se quedan).
- **Recursos humanos** (módulo rh): `nomina.js` con las cifras de 2026 (UMA $117.31, salario mínimo $315.04 y $440.87 en
  la frontera, ISR del Anexo 8 de la RMF 2026, subsidio, IMSS, INFONAVIT); recibo, vacaciones, aguinaldo, finiquito y
  liquidación y PTU; tu equipo con faltas, vacaciones y nómina del periodo. Son estimaciones: el recibo oficial lo timbra
  el contador.
- **Editor**: barra de herramientas con flechas, «/» para insertar (pone primero lo que se llama como lo escrito), «@»
  para enlazar otra página, asa del bloque, atajos (Alt+↑/↓ mueven, Ctrl+Mayús+D duplica, Ctrl+Z deshace, Esc suelta el
  editor) y «⋯» para imprimir, Markdown, duplicar o eliminar.
- **Búsqueda**: Ctrl K (⌘K en Mac), sin acentos, en tus páginas y en la Ayuda.
- **Tiptap** se compila una sola vez al cambiar su versión (`herramientas/tiptap`); el código propio del editor no se
  compila.
