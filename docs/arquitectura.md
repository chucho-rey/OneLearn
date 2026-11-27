# Arquitectura y convenciones

Cómo está hecho OneBook, área por área. Las reglas indispensables y los comandos de todos los días están en
`AGENTS.md`; aquí está el detalle. Si cambias cómo funciona un área, actualiza su sección en el mismo commit.

## Lo general

- No hay paso de compilación: `index.html` es la bienvenida (landing) y el Inicio de la app es `inicio.html`; las pruebas
  entran por `inicio.html`. GitHub Pages publica la rama `main`.
- **Scripts clásicos con un espacio global `window.AT`**, sin módulos ES ni bundler (para que funcione con `file://`). El
  orden de los scripts importa (ver `docs/estructura.md`); cada página lista los suyos. `ajustes.js` y `perfil.js` van en el
  `<head>` y aplican tema, contraste, tamaño y módulos antes de pintar.
- Local primero, solo MXN, una empresa por espacio. Local es gratis; la nube será de pago (F9).
- Las claves internas conservan el nombre viejo a propósito (prefijo `aprende-tecnologia:`, base `onelearn`, cachés
  `onelearn-`): cambiarlas borraría los datos de quien ya usa la app. Los respaldos se escriben con `app:'OneBook'` y se
  aceptan también los de `app:'OneLearn'`.
- Lo académico de OneLearn salió por completo (sin red de compatibilidad desde el 26 de noviembre de 2026); vive en la
  historia de git (último commit con todo: `b0e99c5`) y en la página «Archivo OneLearn» de Notion.
- **Rutas:** todas las páginas viven en la raíz (`AT.rutas.raiz` es vacío); los `href` guardados son relativos a la raíz.
- **Service worker** (`sw.js`): red primero y copia sin conexión. **Al agregar o quitar un archivo del sitio, actualiza
  `ARCHIVOS` y sube `VERSION`**; `pruebas/6-app.js` falla si falta alguno.

### Comandos menos frecuentes

- Tiptap (solo al cambiar su versión): `cd herramientas/tiptap && npm install && npm run compilar` regenera
  `assets/vendor/tiptap.min.js` y `tiptap-LICENSE.txt` (versiones fijadas en su `package.json`).
- docx y Paged.js: `cd herramientas/exportar && npm install && npm run copiar` regenera `docx.min.js`, `paged.min.js` y
  `exportar-LICENSE.txt`.
- Ayuda: `python3 herramientas/ayuda/generar.py` escribe `ayuda.html`.

## Áreas

### Formato de bloques (`bloques.js`, `editor.js`)

Las páginas (y la Ayuda) son el mismo JSON `{formato, tipo, id, titulo, icono, props, contenido}`, donde `contenido` es JSON
de Tiptap/ProseMirror. Cada bloque de primer nivel tiene `attrs.id` fijo (ancla de enlaces y de la búsqueda). `bloques.js`
lo dibuja sin `innerHTML` con datos del documento y filtra enlaces (`hrefSeguro`); un tipo desconocido no se dibuja. El
editor (`editor.js`) define los mismos tipos como nodos de Tiptap: **un tipo nuevo se agrega en ambos lados** (y en el
Markdown de `documento.js` y el texto de `bloques.js`). **Nada se pierde:** el editor envuelve todo nodo que no conoce (o que
no cuadra con el esquema) en `legado`/`legadoLinea` con el JSON original en `attrs.json`, y `desenvolver` lo devuelve
idéntico al guardar.

### Piezas, imprimir y exportar (`piezas.js`, `exportar.js`, `imprimir.html`/`imprimir.js`, `exportar-docx.js`)

Imagen comprimida (`figura`), tabla numerada, notas al pie y referencias cruzadas, registradas con `AT.editorExtensiones`
/ `AT.editorInsertar`, `AT.bloques.registrar` y `AT.piezas.md`. Las tablas llevan `attrs.clave` única, destino de
`refCruzada`. «⋯ › Imprimir o exportar» guarda el papel en `doc.formato` (papel carta o a4, orientación vertical u
horizontal) y ofrece PDF (Paged.js) y Word (paquete docx). Pruebas: `18-piezas.js`, `20-exportar.js`.

### Bloques de la tienda (F4: `negocio.js` + `caja.js`, `fiado.js`, `gastos.js`, `venta.js`, `precio.js`, `porpagar.js`)

Un bloque se define con `AT.negocio.bloque(nombre, {etiqueta, def, filas, editar, resultado, leer, refrescar, acciones,
texto, md, insertar, foco})`, que registra el nodo atómico, su dibujo, texto, Markdown y su entrada en «/» con
`modulo:'negocio'`; agrega el tipo a `AT.editorConId`. El HTML enlaza campos con `data-k="ruta"` (`data-fecha`,
`data-repintar`) y botones con `data-acc` (`agregar`/`quitar` con `data-lista`/`data-i`; `data-enter`). `filas` no usa
datos al azar. Ojo: `completar` solo conserva las claves que trae `def` en los objetos (un `{}` en `def` pierde lo
guardado; usa `null` o arreglos). Dinero: `AT.negocio.centavos`, `dinero(c, signo)`, `monto(c, signo)` (negativos con «−»
y `.neg`). Folios: `AT.folio(prefijo)` (`aprende-tecnologia:folios`, en el respaldo). En las pruebas, espera el foco en
`.ProseMirror` antes de teclear. Prueba: `24-tienda.js`.

### Plantillas, favoritas y papelera (F5; sin páginas dentro de páginas, a propósito)

`crear.js` es la galería (`AT.tiposDoc` con `cat` general, negocio o rh y `trae`; el orden de la galería es `ORDEN`: un
tipo que no está en `ORDEN` no sale, como `pedidocedis`; `PAQUETES` por giro; «Mis plantillas» en `AT.datos.plantillas`).
`armar(tipo, extra)` le pasa `extra` a la plantilla. `guardarPlantilla` usa `VACIAR` por tipo de bloque y
`desdePlantilla` usa `AL_CREAR`: un bloque nuevo con datos del día o anotados se agrega ahí. Papelera: `AT.datos.papelera`
(30 días) y `respaldo.js` (`AT.papelera.abrir`, `[data-papelera]`). Favorita: `doc.favorito` con `conservarFecha`.
Prueba: `25-plantillas.js`.

### Bases de datos (F6: `bases.js` motor, `basedatos.js` bloque, `bases.css`)

Base `{id, nombre, doc, columnas, vistas}` y fila `{id, base, v, orden}` (v = valores por id de columna) en los almacenes
`bases` y `filas` (índice `base`). `AT.bases` guarda en memoria lo leído, calcula (fórmulas con `compilar`, sin eval),
filtra, ordena, agrupa, totaliza, lee y escribe CSV y avisa los cambios (`AT.bases.on`). La primera columna siempre es de
texto (el nombre de la fila). Tipos calculados en `AT.bases.CALCULADO` (referencia, fórmula, suma, saldo); de solo lectura
en `SOLO_LEER` (consecutivo). El bloque guarda `{base, vista}` o `{semilla}`; la base se crea al abrirlo. Una semilla con
`rol` busca la base de ese rol del espacio: los del inventario con `AT.inventario.base`, los demás con
`AT.bases.porRol[rol](doc)` (los registra quien los define, como `cedis.js`). `imprimir.js` llama `AT.bases.precargar`.
Importador de Bases unificadas en `datos.js`. Un `.vh` dentro de una tabla con scroll necesita un ancestro posicionado.
Prueba: `26-bases.js`.

### Historial de las filas (`AT.datos.historial` en datos.js; lo anota `bases.js`, lo muestra `basedatos.js`)

Entrada `{id, base, fila, t, quien:{id, nombre}, tipo nueva|cambio|borrada|recuperada, cambios:{idColumna:{a, d}}, titulo,
copia:{v, orden}}` (copia solo en las borradas). `guardarFila(f, op)`, `guardarFilas(lista, op)` y `borrarFila(f, op)`
anotan solos: `op.historial===false` no anota (la empresa de ejemplo, procesos automáticos), `op.juntar===false` no junta
(«Volver a») y `op.motivo==='recuperada'`. Junta los cambios seguidos de la misma persona en la misma fila
(`AT.bases.HISTORIAL.juntar`, 2 min; las pruebas lo cambian) y lo que se escribe enseguida en una fila nueva va en su
creación. Si la base no estaba leída en memoria, no se anota. Depuración diaria (`aprende-tecnologia:historial-depurado`):
90 días y siempre los últimos 50 por fila. No va en el respaldo; `borrarConFilas` borra su historial. Prueba:
`43-historial-filas.js`.

### Número consecutivo, saldo acumulado y caja chica (`bases.js`, `basedatos.js`, plantilla `cajachica`)

`consecutivo` está en `SOLO_LEER` (se guarda en la fila pero no se escribe a mano ni se importa del CSV); `nuevaFila` le da
el siguiente al mayor entre las filas y `col.ultimo` (no se reusa) y guarda la base. Al volver consecutiva una columna, el
diálogo numera las filas por `orden`. `saldo` es calculado: col `{inicial, monto, signo (columna de selección), resta (por
omisión «Egreso»), por (columna de orden: consecutivo, fecha o número)}`; `AT.bases.saldos` recorre las filas en el orden
de `por` (no el de la vista) con caché por `version` (`guardarBase` sube `version`), y `resumenSaldo` da inicial,
ingresos, egresos y final para la franja `.bd-saldo` (saldo inicial editable, `[data-saldo-ini]`). Una semilla con
`arrastre` (la caja chica: `'caja-chica'`) marca la base con `arrastre` y `creada`; al crearse vacía toma como saldo
inicial el saldo final de la base más reciente con el mismo arrastre (`arrastrarSaldo`). «Color según el valor»: una celda
vacía no cumple «mayor» ni «menor». Prueba: `44-caja-chica.js`.

### Inventario, reportes e indicadores (F7: `inventario.js`, `factura.js`, `reporte.js`, `indicadores.js`)

Bases con `rol` (productos, movimientos, compras, gastos, presupuesto, empleados, incidencias), una por espacio:
`AT.inventario.asegurar(doc, roles)` (ids de columna fijos `p-*`, `m-*`, `c-*`, `g-*`, `r-*`, `em-*`, `in-*`). La nota
de venta liga conceptos a productos e `inventario.js` sincroniza sus movimientos «Venta» al guardarse (`m-origen` =
`venta:página:bloque:índice`), los quita antes de la papelera y concilia al abrir. Bloques con atributo `cfg`: `reporte`,
`indicadores` y `vencimientos`; en el Inicio y en las salas se dibujan vivos y al imprimir como papel
(`AT.bases.precargas`). Para abrir una ventana desde un clic en un bloque usa `setTimeout`. «Mi negocio» =
`d-minegocio`. Pruebas: 28 a 31.

### Pedidos al Cedis (F8, etapa A sin servidor: `cedis.js`, `pedidos.js`, `recibir.html` + `recibir.js`, `cedis.css`)

- **Bases con rol** `insumos` (`i-*`), `sucursales` (`s-*`), `pedidos` (`e-*`: folio, sucursal como relación, entrega,
  versión, enviado, estado Recibido, Confirmado o Surtido, llegó tarde, notas, confirmación) y `renglones` (`l-*`: pedido,
  código, pidió, surte, nota); las crea `AT.cedis.asegurar` (con 25 insumos y 3 sucursales de ejemplo) y los bloques Base
  de datos las encuentran con `AT.bases.porRol`.
- **Lo que no va en bases** vive en `aprende-tecnologia:cedis` = `{yo (este espacio como Cedis: id, nombre, corte, dias,
  doc), claves (por fila de sucursal: k, kv, fmt), conexiones (por Cedis: cedis, suc, k, kv, formato, doc, actual,
  historial)}`; entra en el respaldo y al importar solo se agrega lo que falta (nunca se pisa una clave). Las claves no
  van en ninguna base ni en el CSV.
- **Enlaces** `recibir.html#tipo.datos.firma` (inv, ped, con, fmt): JSON corto, `deflate-raw` en base64url («z»; sin
  comprimir «j»), firma HMAC-SHA256 (WebCrypto) con la clave de 32 bytes de la sucursal, que cubre el tipo y los datos.
  Desde `file://` el enlace usa la dirección pública. Si pasa de 6,000 caracteres se ofrece como archivo `.onebook`.
- **Revisión** (`revisarPedido`): rechaza otro Cedis, sucursal sin clave, firma alterada, clave vieja (`kv`) y versión
  vieja o repetida; al reemplazar dice qué cambió. Llegó tarde = mandado después de la hora de corte del día anterior.
- **El pedido de la sucursal no va en la página**: el bloque `pedidocedis` guarda solo `cedis` y lee
  `conexiones[cedis].actual` (así una confirmación que llega por enlace no choca con la página abierta).
- Bloques: `cedis` (panel del Cedis) y `pedidocedis` (vivos en documento.html; en papel al imprimir). `AT.pedidos.compartir`
  (WhatsApp, correo, compartir, copiar, archivo) e `AT.pedidos.imprimir` (hojas con `html.cd-imprimiendo` y
  `#cdImprimir`, sin el resto de la página). `recibir.js` también escucha `hashchange`.
- Prueba: `46-cedis.js` (dos navegadores: Cedis y sucursal). Pendiente: indicadores del Cedis en «Mi negocio» y
  descontar inventario al surtir. La etapa B (con servidor) va en F9.

### Recursos humanos (módulo `rh`)

`nomina.js` con las cifras de 2026 en `AT.nomina.T` (**actualízalas cada año**); `rh.js` calculadoras; `equipo.js` bloques
`equipo` y `planilla`. «Tu equipo» es `d-miequipo`. Pruebas: `33-rh.js`, `34-equipo.js`.

### Plan de pagos (`pagos.js`)

attrs `{titulo, modo plazos o cuota, monto, pagos, cuota, frecuencia, inicio, pagados}`; `AT.pagos.calcular` trabaja en
centavos y el último pago absorbe el redondeo. Prueba: `21-pagos.js`.

### Datos (`datos.js`, `AT.datos`)

Páginas, plantillas, papelera, bases, filas e historial en IndexedDB (base `onelearn`, **versión 6**: almacenes
`documentos`, `plantillas`, `papelera`, `bases`, `filas`, `versiones`, `trozos` e `historial`; la 5 borró los viejos
`notas` y `marcadores`), con `localStorage` como respaldo si no hay IndexedDB. Ajustes, perfil, empresa, folios, quién eres
y el Cedis en `localStorage` (prefijo `aprende-tecnologia:`); al cargar se borran las claves de las lecciones de antes
(`LIMPIAR`). Cambios con `AT.datos.on` y entre pestañas con BroadcastChannel. Respaldo: `exportar`/`importar` (importar
combina: entra lo que no existe y lo más reciente; nunca borra). `AT.datos.borrarTodo()` vacía todo (lo usan «Crear mi
empresa» y «Tus datos › Eliminar todos los datos») y luego bloquea las escrituras de esa pestaña hasta recargar, para que
lo abierto (el Inicio recrea «Mi negocio») no se vuelva a crear; las otras pestañas reciben el aviso `todo`, se bloquean
y se recargan.

### Historial de versiones (`AT.datos.versiones`, `versiones.js`)

Versiones por bloques con huellas y trozos compartidos. `documento.js` llama `abrir`, `observar` (una cada 5 min y antes
de un borrado grande) y `tomar`; `importar` guarda la de antes. Lo que no es contenido va en el trozo «meta»
(`FUERA_META`). Si un bloque nuevo guarda datos fuera de `contenido`, revisa `FUERA_META` y `CONSERVAR` (documento.js). En
las pruebas, `config.ventana=0`. Prueba: `36-versiones.js`.

### Barra lateral como explorador (`barra.js`, `#arbol`, `.arb-*` en base.css)

Ubicaciones con su cuenta (`[data-ubic]`; en el Inicio llaman `AT.explorador.ir`, desde otra página abren
`inicio.html#ubic=clave`; en el celular, `AT.archivos.ir`), salas como carpetas con sus páginas (`[data-sala]`, `.arb-tg`,
abiertas en `aprende-tecnologia:arbol`), por tipo y papelera; flechas como árbol. `AT.ubicaciones` es el modelo que
comparte con el explorador y con la vista del celular (`AT.barraUbicacion` marca la ubicación). Se dibuja en
`DOMContentLoaded`. Prueba: `3-barra.js`.

### Explorador y permisos (`explorador.js`, `permisos.js`; modelo en `datos.js`)

`AT.datos.yo`, `AT.datos.acceso` sobre `doc.acceso`, `AT.datos.presencia`. Roles dueno, admin, editor, lector (y
`ninguno`); `acceso.puede(doc, 'ver' | 'editar' | 'compartir')`. **Cambia los permisos siempre con `AT.datos.acceso`**,
nunca escribiendo `doc.acceso` a mano. `AT.explorador.menu(boton, id)` abre el menú de una página desde otro lugar; el menú
se cierra con un desplazamiento solo si lo que lo abrió se movió. Prueba: `37-explorador.js`.

### El Inicio en el celular (`archivos.js` + `archivos.css`, solo por debajo de 900 px)

Navegación inferior `#celNav` con tres secciones en `body[data-cel]` (`paginas`, `inicio`, `empresa`; se recuerda en
`sessionStorage` «onebook-cel-seccion»). El CSS esconde por sección: en Páginas el explorador `#xp` se esconde y se ve
`#celArchivos`; en Inicio, los tableros, Prepara, plantillas e Instalar; en Empresa, `#celEmpresa`. Las carpetas son las
ubicaciones de `AT.ubicaciones`; la carpeta va en `inicio.html#carpeta=clave` con `pushState` desde la raíz (Atrás sube).
El «+» `#celNuevo` pone `AT.salaActual` antes de abrir Crear. `inicio.js` llama `AT.archivos.datos(docs)`. **En las pruebas
de celular que usan los tableros, toca antes `.cn-b[data-seccion="inicio"]`; el «+» es `#celNuevo`** (no `.xp-nuevo`).
Prueba: `45-archivos-celular.js`.

### Empresa, personas y departamentos (E2: `empresa.js`, `persona.js`, `empresa.html` + `tuempresa.js`)

`aprende-tecnologia:empresa` = `{id, nombre, giro, telefono, rfc, personas, departamentos, salas, tablero}`; cada persona
`{id u-…, nombre, correo, rol propietario|admin|miembro, deptos (responsable, miembro o consulta por departamento), pin
(huella), cambio, borrado}`. La persona activa es `AT.datos.yo`; `AT.empresa.entrarComo` cambia de persona y recarga.
**Cambia la empresa siempre con `AT.empresa`** (revisa permisos y lanza un Error con el motivo; lo quitado queda
`borrado`). `AT.empresa.combinar` junta respaldos. Prueba: `39-empresa.js`.

### Salas (E3: `empresa.js`, `sala.html` + `sala.js`)

General `sa-general`, una por departamento `sa-d…` y libres `sa-l…`. La sala de cada página va en `doc.acceso.sala` (y
`doc.acceso.empresa`). `rolPagina` = máximo entre la lista y la sala. **Todo lo que lista páginas filtra con
`AT.datos.acceso.puede(d,'ver')`.** Páginas nuevas: `AT.datos.acceso.nueva(sala)`; mover: `AT.datos.acceso.mover`.
Prueba: `40-salas.js`.

### Tableros (E4: `tablero.js` + `tablero.css`)

`empresa.tablero`, `persona.tablero`, `sala.tablero` = `{modulos (id m-…, tipo, tam s|m|l, cfg), cambio}`.
`AT.tablero.montar(cont, {capa, sala, id, titulo, defecto, ocultarVacio})`; catálogo `AT.tablero.MODS`. El módulo
`pagina` crea «Mi negocio» y «Tu equipo» con `AT.tablero.creadores`. Prueba: `41-tablero.js` (para arrastrar, los módulos
deben estar a la vista).

### Perfiles y módulos (`perfil.js`, `entrar.html`/`entrar.js`)

`aprende-tecnologia:perfil` = `{perfil negocio, modulos, nombre, negocio (nombre, giro, telefono), creado, migrado,
ejemplo}`. `AT.perfil.tiene(modulo)` decide qué se ve; módulos `negocio` y `rh` (el núcleo siempre). Lo de un módulo lleva
su marca (`modulo` en `crear.js` y en `AT.editorInsertar`, clases `.m-negocio`/`.m-rh`). Con datos y sin un perfil válido,
el espacio recibe uno de negocio. **Sin perfil, `inicio.html` manda a `entrar.html`.** En las pruebas, `pagina()` siembra
un negocio; `perfil:false` deja el navegador sin espacio. Prueba: `22-entrar.js`.

### Bienvenida y empresa de ejemplo (E5: `landing.js`, `ejemplo.html` + `ejemplo.js`)

`index.html` carga `base.js`, `bloques.js`, `negocio.js` y `precio.js` solo para la calculadora; si el navegador ya tiene
datos, manda a `inicio.html` (salvo `?conoce`). `AT.ejemplo.armar` arma Ferretería El Clavo en un navegador sin perfil
(`ejemplo:true`); «Crear mi empresa» (`#iniEjemplo`) llama `AT.datos.borrarTodo()`. Pruebas: `19-landing.js`,
`42-ejemplo.js`.

### Pestañas (F3: `app.html`, `pestanas.js`)

Cada página en un iframe; `base.js` marca `AT.enPestana`, avisa título y dirección y pasa atajos. `AT.docGuardarYa` antes
de cerrar; bloqueo de la misma página en dos pestañas (`onebook-documentos`). Botón Atrás: `AT.alAtras(fn)`. Prueba:
`23-pestanas.js`.

### Ayuda (`ayuda.html`, `ayuda.js`; se genera con `herramientas/ayuda/generar.py`)

Cada herramienta es un título de nivel 2 con id `ay-<módulo>-<nombre>`; `PLANTILLA` en `ayuda.js` liga la sección con su
plantilla («Crear …»). Prueba: `35-ayuda.js`.

## Convenciones

- CSS: todos los tamaños en `rem`; colores solo con los tokens de `base.css` (cuatro variantes: claro, oscuro, alto
  contraste claro y oscuro); sombras con `--sh-1` y `--sh-2`. La Ayuda usa `--page-w` y las páginas de trabajo `--app-w`.
  Las pruebas auditan contraste WCAG (4.5:1, o 7:1 en alto contraste) y desbordes en varios anchos, tamaños y fuentes
  (también OpenDyslexic).
- Accesibilidad: patrones ARIA (pestañas, barra de herramientas con flechas, combobox, árbol), `aria-disabled` en lugar
  de `disabled`, manejo explícito del foco y atajos que se ignoran mientras se escribe.
- Textos de la interfaz: español de México, frases cortas, verbos claros («Enviar al Cedis», no «Procesar»); un error dice
  qué pasó y qué hacer.
- En pruebas del editor, deja una pausa breve después de teclas de movimiento o selección antes de un atajo.

## Trampas conocidas (para no repetirlas)

- `waitForURL(/documento\.html/)` se cumple de inmediato si ya estás en otra página `documento.html`: espera a que cambie
  la dirección (compara con la anterior).
- `page.goto` a la misma página con otro `#…` no recarga: la página debe escuchar `hashchange`.
- Playwright `click` en un selector que también existe escondido (por ejemplo `[data-orden]` del explorador en el
  celular) elige el primero: acota el selector al contenedor visible.
- Un bloque que repinta solo si el foco está fuera se queda viejo cuando el foco está dentro: repinta y devuelve el foco.
- `pagina()` de `lib.js` vuelve a sembrar el espacio en cada carga; para probar «sin espacio» después de borrar, usa
  `perfil:false` o quita la clave con un `addInitScript`.
