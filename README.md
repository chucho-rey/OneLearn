# OneBook

OneBook (antes OneLearn) es un espacio de trabajo para **empresas** hecho de **bloques y plantillas**: ventas, cobros, inventario, gastos, recursos humanos y notas en páginas que cada quien arma a su medida. Todo se guarda en el dispositivo; la versión local es gratis y habrá planes de pago con nube. El plan y sus fases están en Notion («OneBook: plan para pivotear» y el Roadmap con el área OneBook); la etapa en curso es **Empresas** (E1 a E5: separar lo académico; empresa, personas y departamentos, y salas, hechas; siguen el Inicio armable y la bienvenida para empresas).

Lo académico de OneLearn (lecciones, rutas, proyectos, terminal simulada, libretas, apuntes y la tesis) se separó de OneBook el 25 de noviembre de 2026 (etapa E1). Queda completo en la historia de git: el último commit con todo es `b0e99c5` (y la etiqueta `onelearn-final`, `b4b9f6f`, es la versión de antes del cambio de nombre). Nadie pierde datos: ver «Lo de estudio que se separó» más abajo.

Es un sitio estático: no necesita servidor propio ni dependencias para funcionar. Abre `index.html` en el navegador, directamente desde el disco o desde cualquier servidor estático (por ejemplo, GitHub Pages). La única pieza compilada es el editor (Tiptap), y el resultado ya está guardado en `assets/vendor/`.

## Estructura

```
index.html                  Página de bienvenida (la raíz del sitio): una página de ejemplo hecha con bloques reales, un plan de
                            pagos para probar sin cuenta («Guárdalo en tu espacio» lo convierte en página), la calculadora de
                            precio de venta, cómo funciona, lo que ya hay, precios y preguntas. Quien ya usa OneBook en ese
                            navegador va directo a inicio.html (con ?conoce se queda en la bienvenida)
app.html                    Pestañas dentro de la app, como en un navegador: cada pestaña es una página de la app en un iframe.
                            La app instalada abre aquí; «Abrir en pestañas» (barra lateral) entra con la página actual
entrar.html                 «Crea tu empresa»: tu empresa (nombre, giro, teléfono, tu nombre, «Tengo empleados»), sus
                            departamentos y las páginas para empezar; con ?editar cambia los módulos; también restaura un respaldo
empresa.html                «Tu empresa»: las personas (rol, departamentos, PIN), los departamentos y las salas (tuempresa.js, empresa.css)
sala.html                   Una sala (?id=sa-… o ?id=privado; ?nueva crea una): quién entra, sus páginas y sus herramientas (sala.js)
inicio.html                 Inicio de la empresa: el nombre del negocio y la fecha, acciones rápidas, «Mi negocio» y «Tu equipo»,
                            tus páginas (explorador) y páginas listas para usar
documento.html              Una página tuya (?id=...): editarla con el editor de bloques o leerla
imprimir.html               Vista para imprimir o guardar como PDF de una página (imprimir.html?id=…)
ayuda.html                  Ayuda: cada herramienta explicada paso a paso (formato de bloques; ayuda.js y ayuda.css)
manifest.webmanifest        Datos para instalar OneBook como app
sw.js                       Service worker: guarda el sitio para usarlo sin conexión
assets/
  css/base.css              Estilos compartidos: identidad (4 variantes de color), barra lateral (contraída en escritorio
                            queda compacta, solo iconos), página y bloques (también el «legado»)
  css/editor.css            Estilos del editor (solo documento.html): barra de herramientas, asa de bloque, menús y formularios
  css/negocio.css           Bloques de negocio: el plan de pagos al leer y los bloques de la tienda (al leer y su formulario,
                            .nb-f), en documento.html y en la bienvenida
  js/ajustes.js             Ajustes de lectura (tema, contraste, tamaño, fuente, espacios, ancho hasta toda la pantalla, barra
                            lateral); se carga en el <head> y expone AT.ajustes
  js/perfil.js              El perfil del espacio y sus módulos (negocio, rh); en el <head> de todas las páginas, después de
                            ajustes.js. Marca <html> con con-/sin-<módulo>, convierte los perfiles de antes (estudio, «Mis
                            finanzas») y manda a entrar.html si no hay espacio (AT.perfil)
  js/entrar.js              El asistente de «Crea tu empresa» (entrar.html)
  js/pestanas.js            El contenedor de pestañas (app.html): abrir, cerrar, cambiar, atajos, recordar, descargar las
                            que no se usan, hasta 12 y la lista en celular (AT.pestanas)
  fonts/                    IBM Plex Sans y Mono, Atkinson Hyperlegible y OpenDyslexic (SIL OFL 1.1), alojadas aquí
  js/base.js                Utilidades (AT.$, AT.esc, AT.ico...), íconos y la página actual (AT.paginaActual, AT.rutas)
  js/empresa.js             La empresa (etapa Empresas): personas con rol (propietario, administrador, miembro), departamentos
                            (responsable, miembro, consulta), PIN, «Cambiar de persona», respaldo y la empresa automática
                            de los espacios de antes; en localStorage (AT.empresa, sin interfaz)
  js/persona.js             La ventana «¿Quién usa OneBook?» (cambiar de persona, con PIN) desde la barra lateral (AT.persona)
  js/tuempresa.js           La página «Tu empresa»: datos, personas, departamentos, salas y sus ventanas
  js/sala.js                La página de una sala: quién entra, herramientas sugeridas, «Nueva página aquí», sus páginas y
                            «Administrar sala» (departamentos que editan o solo ven, personas sueltas)
  css/empresa.css           Estilos de «Tu empresa» y los colores de los departamentos
  js/datos.js               Tus datos en IndexedDB: páginas, tus plantillas, la papelera, las bases de datos (bases y filas),
                            el historial de versiones, quién eres, permisos y presencia; respaldo e importación, también de
                            Bases unificadas; y lo de estudio que quedó (notas, marcadores, avance) (AT.datos)
  js/bases.js               Motor de las bases de datos: tipos de columna, fórmulas sin eval, relaciones, filtro, orden,
                            grupos, totales y CSV (AT.bases)
  js/basedatos.js           Bloque «Base de datos»: vistas de tabla, tablero, galería y calendario, ficha, columnas, vistas
                            guardadas, deshacer, importar y exportar CSV (AT.basedatos)
  css/bases.css             Estilos del bloque «Base de datos», del reporte, los indicadores y los vencimientos
  js/inventario.js          Inventario conectado (fase F7): bases con rol (productos, movimientos, compras, gastos,
                            presupuesto, empleados, incidencias), una vez por espacio; la nota de venta descuenta existencias;
                            bloque «Resumen del inventario» con pedido al proveedor y «Registrar entrada» (AT.inventario)
  js/factura.js             Importar la factura XML (CFDI 4.0 y 3.3) del proveedor: entradas, costos y la compra
                            (AT.factura)
  js/reporte.js             Bloque «Reporte»: desglose por uno o dos campos, periodos, comparar con el anterior,
                            presupuesto, gráfica y «Presentar» en diapositivas (AT.reporte)
  js/indicadores.js         Bloques «Indicadores» y «Próximos vencimientos» (AT.indicadores)
  js/nomina.js              Motor de recursos humanos con las cifras de 2026 (UMA, salario mínimo, tarifa del ISR,
                            subsidio, IMSS): recibo, vacaciones, aguinaldo, finiquito y PTU (AT.nomina, sin interfaz)
  js/rh.js                  Calculadoras de recursos humanos: recibo de nómina, vacaciones, aguinaldo, finiquito o
                            liquidación y reparto de utilidades (AT.rh)
  js/equipo.js              Tu equipo: bloques «Resumen de tu equipo» y «Nómina de tu equipo», «Agregar persona» y
                            «Anotar falta o vacaciones» (AT.equipo)
  js/versiones.js           Ventana «Historial de versiones» de una página: lista por día, vista previa con lo que
                            cambió, recuperar un bloque, restaurar, copiar y versiones con nombre (AT.versionesUI;
                            el motor está en datos.js, AT.datos.versiones)
  css/versiones.css         Estilos de esa ventana
  js/explorador.js          «Tus páginas» en el Inicio, como un explorador de archivos: ubicaciones, columnas
                            (modificado y por quién, tipo, trabajando ahora, permisos y tamaño), ordenar, buscar,
                            detalles o tarjetas, selección, menú de cada página y teclado (AT.explorador)
  css/explorador.css        Estilos del explorador
  js/permisos.js            Ventana «Personas y permisos» de una página: quién tiene acceso, invitar, cambiar,
                            quitar, solicitudes y pedir permisos (AT.permisos; en el Inicio y en la página)
  css/permisos.css          Estilos de esa ventana y de los avatares de las personas
  js/barra.js               Barra lateral (Inicio, Crear, Buscar, Tu empresa, «Tus páginas» y el pie con quién entra), barra
                            superior y menú en celular
  js/lectura.js             Panel Lectura (tamaño de texto, tema, contraste, fuente y espacios)
  js/app.js                 App instalable: service worker, aviso de actualización e instalación
  js/respaldo.js            Ventana «Tus datos»: espacio, protección del navegador, descargar e importar respaldo; y la ventana
                            «Papelera»: recuperar, borrar para siempre y vaciar (AT.tusDatos, AT.papelera)
  js/crear.js               «Crear»: tipos de página (cada uno de un módulo), sus plantillas y la galería «¿Qué quieres crear?»
                            con paquetes por giro y tus plantillas (AT.crear, AT.tiposDoc)
  js/editor.js              El editor de bloques sobre Tiptap: bloques propios, barra, menú «/», «@» para enlazar páginas,
                            asa para mover y el legado (lo que no conoce se conserva tal cual) (AT.editor)
  js/documento.js           Página de un documento: modos Editar y Leer, autoguardado, Markdown, duplicar, eliminar,
                            historial, permisos y las páginas de estudio solo para leer
  js/piezas.js              Imágenes comprimidas (con pie y texto alternativo), tablas numeradas, notas al pie y
                            referencias cruzadas (AT.piezas)
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
  js/exportar.js            «Imprimir o exportar»: el papel (carta o A4, vertical u horizontal) y la ventana con PDF y Word
                            (AT.exportar)
  js/imprimir.js            Vista para imprimir o guardar como PDF (imprimir.html), paginada con Paged.js
  js/exportar-docx.js       Exportar una página a Word con la librería docx (AT.exportarDocx)
  js/buscar.js              Búsqueda con Ctrl K en tus páginas y en la Ayuda; índice compartido (AT.indice)
  js/bloques.js             Formato de bloques: dibuja una página a partir de su JSON, también el legado (AT.bloques)
  js/inicio.js              Pantalla de inicio (inicio.html): acciones rápidas, «Prepara tu negocio», «Mi negocio» y «Tu
                            equipo», el explorador y páginas listas para usar
  js/landing.js             Bienvenida: manda al Inicio a quien ya usa OneBook; dibuja la página de ejemplo, el plan de pagos
                            y la calculadora de precio para probar
  css/landing.css           Estilos de la página de bienvenida
  css/entrar.css            Estilos de «Crea tu empresa»
  css/pestanas.css          Estilos del contenedor de pestañas
  js/ayuda.js               La página de ayuda: secciones por herramienta, filtro por módulo, buscador y «Crear …»
  css/ayuda.css             Estilos de la ayuda
  js/zen.js                 Modo zen y atajos de teclado (Z, J/K, E, ?, Esc) y su lista de ayuda
  icons/                    Ícono de OneBook: el «1» que forma la «B» (SVG y PNG de 32, 180, 192 y 512 px, más una versión maskable)
  vendor/tiptap.min.js      Tiptap y ProseMirror empaquetados (MIT, ver tiptap-LICENSE.txt); no se edita a mano
  vendor/paged.min.js       Paged.js (MIT): pagina la vista para imprimir (números de página, notas al pie)
  vendor/docx.min.js        docx (MIT), empaquetado: genera el Word de una página; se carga al exportar
herramientas/tiptap/        Cómo se compila assets/vendor/tiptap.min.js (esbuild)
herramientas/exportar/      Cómo se preparan docx.min.js y paged.min.js (npm run copiar)
herramientas/ayuda/         generar.py escribe ayuda.html (las secciones de la Ayuda se editan ahí)
pruebas/                    Pruebas automáticas con Playwright (ver pruebas/README.md)
```

Los scripts son clásicos y comparten el objeto global `window.AT` (no se usan módulos ES) para que las páginas también funcionen abiertas con `file://`. Se cargan en este orden: `ajustes.js` y `perfil.js` (en el `<head>`), `base.js`, `datos.js`, `empresa.js`, `barra.js`, `persona.js`, `lectura.js`, `app.js`, `respaldo.js`, `crear.js`, `buscar.js` y después los de cada página (`entrar.html` e `imprimir.html` cargan `empresa.js` sin la barra). En `documento.html`: `bloques.js`, `vendor/tiptap.min.js`, `editor.js`, `piezas.js`, los bloques de negocio y de recursos humanos, `exportar.js`, `exportar-docx.js`, `documento.js`, `versiones.js`, `permisos.js` y `zen.js`. En `ayuda.html`: `bloques.js`, `zen.js` y `ayuda.js`.

Todos los tamaños del CSS van en `rem`, para que la página entera crezca con el tamaño de texto. Los colores son tokens en `base.css` con cuatro variantes (claro, oscuro, alto contraste claro y alto contraste oscuro); usa siempre los tokens, nunca colores sueltos.

## Lo de estudio que se separó

OneBook es para empresas desde la etapa E1 (25 de noviembre de 2026). Salieron las lecciones, las rutas, los proyectos, la terminal y el simulador de red, las libretas, los apuntes de clase y de las lecciones, los marcadores, la tesis (fuentes, citas, bibliografía, autoría, declaración de IA, entrega y su respaldo), las ecuaciones, las preguntas de repaso, `estudiantes.html`, `acerca.html` y los perfiles «Estudio» y «Mis finanzas». Todo sigue en la historia de git (último commit con todo: `b0e99c5`). Nadie pierde datos:

- **Bloques que ya no existen** (`AT.bloques.LEGADO`: repaso, laboratorio, referencia, bibliografía, declaración, ecuación, fórmula e índice de figuras o tablas): `bloques.js` los dibuja como «legado», con su nombre y su texto (`AT.bloques.textoLegado`). El editor envuelve **cualquier** nodo que no conoce en `legado` (o `legadoLinea` dentro del texto) con su JSON original en `attrs.json`, y `desenvolver` lo devuelve idéntico al guardar; un bloque que no cuadra con el esquema también entra entero como legado en vez de perderse. El Markdown, el PDF y el Word los sacan como su texto.
- **Páginas de estudio** (`AT.datos.deEstudio`: tipo libreta, clase, libro, investigación, tesis, guía o bitácora): no salen en la barra, en el explorador ni en la búsqueda; el explorador las junta en «De estudio (solo lectura)» y `documento.js` las abre para leer, con un aviso, exportar o descargar (sus fuentes y su registro de autoría siguen en el documento).
- **Notas de las lecciones, marcadores, avance, proyectos y ejercicios de la terminal** siguen en IndexedDB y `localStorage` y entran en el respaldo.
- **Perfiles de antes**: `perfil.js` convierte «estudio» y «personal» en «negocio» con `aviso` ('estudio' o 'personal'); el Inicio lo explica una vez (`AT.perfil.aviso`, `quitarAviso`).

## Empresa, personas y departamentos

Etapa Empresas, E2. La empresa vive en `localStorage` (`aprende-tecnologia:empresa`, entra en el respaldo) y la maneja `empresa.js` (`AT.empresa`, sin interfaz):

- **Empresa**: `{id, nombre, giro, telefono, rfc, personas, departamentos}`. Una por espacio. «Crea tu empresa» (`entrar.html`) la crea con quien usa el navegador como **propietario** y responsable de los departamentos que elija. Un espacio de antes (perfil de negocio sin empresa) recibe la suya sola (`auto`), con su nombre de negocio. Sus datos también se guardan en el perfil (`perfil.negocio`).
- **Personas**: `{id:'u-…', nombre, correo, rol, deptos:{'dp-…': rol}, pin}`. Roles de la empresa: **propietario** (uno; puede pasar la empresa a otra persona), **administrador** (agrega y quita personas y departamentos) y **miembro**. En cada departamento: **responsable** (administra el departamento y su gente), **miembro** y **consulta**. El PIN (4 a 8 números) se guarda como huella (cyrb53 con el id), no a la vista.
- **Quién eres**: la persona activa es la de `AT.datos.yo` (`aprende-tecnologia:yo`). «Cambiar de persona» (`persona.js`, desde el pie de la barra lateral) pide el PIN si la persona tiene uno, guarda lo pendiente de la página y la vuelve a cargar como la persona nueva (`AT.empresa.entrarComo` → `AT.datos.ponerYo`); las otras pestañas también se recargan. Así los permisos de cada página, la presencia y «Modificado por» ya son de esa persona. Si la computadora no sabe quién eres, el Inicio lo pregunta.
- **«Tu empresa»** (`empresa.html`): quien administra agrega, cambia y quita personas y departamentos (pide confirmar lo que quita); el responsable de un departamento cambia su nombre, su color y su gente; un miembro ve todo y cambia solo su nombre, su correo y su PIN. El modelo revisa los mismos permisos (lanza un error con el motivo).
- **Páginas**: en «Personas y permisos», quien administra una página le da acceso directo a **alguien de tu empresa** (`AT.datos.acceso.dar`, sin invitación).
- **Recursos humanos**: la base Empleados tiene la columna **Departamento** (`em-depto`, selección con `origen:'departamentos'`): sus opciones son los departamentos (`AT.bases.opciones`), con su color, y renombrar un departamento cambia sus filas. Las bases de empleados de antes la reciben al usarse.
- **Respaldo**: la empresa entra si aquí no hay (o solo la automática y tú estás en la del respaldo); la misma empresa se junta persona por persona y departamento por departamento (gana el cambio más reciente; lo quitado queda marcado y no revive); la de otra empresa no se junta.

No es seguridad: sin servidor, quien tiene el navegador tiene los datos. Con la nube (F9), las cuentas y los permisos por fila harán cumplir este mismo modelo.

## Salas

Etapa Empresas, E3. Una sala es un espacio de trabajo con sus páginas; viven en la empresa (`empresa.salas`) y la sala de cada página en su acceso (`doc.acceso.sala`, con `doc.acceso.empresa`):

- **General** (`sa-general`): toda la empresa la ve y la edita. **Una por departamento** (`sa-d…`, id sacado del departamento, igual en cualquier navegador; su nombre y su color son los del departamento): su responsable la administra, sus miembros editan y los de consulta ven. **Entre departamentos** (`sa-l…`): las crean quien administra la empresa y los responsables (quien la crea la administra). Cualquier sala agrega departamentos que editan o solo ven y personas sueltas (administra, edita o ve). Quien administra la empresa administra todas. Las salas se crean solas (`asegurarSalas`) con la empresa, con cada departamento y, en una empresa de antes, al cargar.
- **El permiso de una página** (`datos.js`, `rolPagina`) es el mayor entre su lista (propietario, administrador, editor, lector) y su sala; la sala solo cuenta si la página es de esta empresa (una que llega del respaldo de otra empresa solo tiene su lista). En **Privado** solo entran su propietario y su lista. Las páginas de antes sin lista están en la General; las que ya tenían lista, en Privado.
- **Lo que no ves no está**: la barra lateral, el explorador (con una ubicación por sala, Privado y la columna «Sala»), la búsqueda, «@» y los próximos vencimientos solo usan páginas que puedes ver; abrir una por su dirección dice «No tienes acceso» y deja pedirlo (`AT.permisos.abrir` con `pedir`).
- **Crear**: «¿Dónde?» elige la sala (la de la página de sala o la ubicación del explorador, `AT.salaActual`, o la General; también Privado). Cada página nueva es de quien la crea (`AT.datos.acceso.nueva`); duplicar deja la copia en la misma sala. «⋯ › Mover a otra sala» (`AT.datos.acceso.mover`) la cambia, si puedes crear páginas en la sala de destino.
- **La página de una sala** (`sala.html`): quién entra, herramientas sugeridas según el nombre del departamento (Ventas: nota de venta, corte de caja…), «Nueva página aquí» y sus páginas; «Administrar sala» para quien la administra. Una sala con páginas no se quita; quitar un departamento deja su sala (con sus páginas) como sala entre departamentos, con la misma gente.
- **«Tu equipo»** (sueldos) nace en la sala de Recursos humanos si hay un departamento con ese nombre, o en Privado del propietario; la de antes pasa ahí una vez.

## Pestañas, bloques de la tienda y perfiles

- **Pestañas** (`app.html`, `pestanas.js`, fase F3): varias páginas abiertas a la vez dentro de la app. Cada pestaña es un iframe del mismo origen; `base.js` detecta que vive en una (`AT.enPestana`) y le avisa al contenedor sus cambios de título y dirección, le pasa los atajos (Alt+T nueva, Alt+W cerrar, Alt+1…9, Alt+AvPág/RePág) y abre en pestaña nueva los enlaces con clic central o Ctrl/Cmd+clic. Hasta 12; se recuerdan (`aprende-tecnologia:pestanas`, que no cuenta como «ya usaba OneLearn») y al volver solo se carga la activa; las que llevan 10 minutos sin usarse se descargan. Antes de cerrar o descargar una pestaña se guarda lo pendiente (`AT.docGuardarYa`). En celular, un botón con el número de pestañas abre la lista. La misma página en dos pestañas (de la app o del navegador) no se pisa: `documento.js` avisa al abrir (BroadcastChannel `onebook-documentos`), la anterior guarda y queda solo para leer con «Editar aquí», y la nueva vuelve a leer el documento si llega ese último guardado. El botón Atrás del celular cierra primero lo abierto: las ventanas `<dialog>` lo hacen solas y los paneles usan `AT.alAtras` (CloseWatcher).
- **Bloques de la tienda** (`negocio.js` y un archivo por bloque, fase F4): corte de caja (`caja.js`), fiado (`fiado.js`), gastos del mes (`gastos.js`), nota de venta (`venta.js`), precio de venta (`precio.js`) y cuentas por pagar (`porpagar.js`). Se insertan con «/» en cualquier documento (módulo negocio), calculan en centavos y en pesos, y los negativos salen siempre con signo (−) y en rojo; un sobrante o una ganancia, con + y en verde. `AT.negocio.bloque(nombre, definición)` registra cada uno: el nodo atómico del editor con un atributo JSON por clave, su formulario (los campos se enlazan con `data-k="ruta"`, las casillas con `data-fecha` guardan la fecha del día, los botones con `data-acc`), su vista al leer (sus casillas y botones también cambian el bloque y se guardan: marcar pagado, anotar abonos, cambiar de mes), su texto para la búsqueda y su Markdown. El mismo formulario sirve fuera del editor (`AT.negocio.formulario`, la calculadora de la bienvenida). **Gastos:** los gastos fijos (cada mes, cada año o una sola vez) se anotan una vez y «Generar mes» crea sus filas del mes como pendientes, sin repetir las que ya estén (idea de Bases unificadas). **Nota de venta:** folio consecutivo por prefijo con `AT.folio('V')` (base.js; `aprende-tecnologia:folios`, en el respaldo, y al importar se queda el número más alto); al leer sale como recibo con el nombre y el teléfono del negocio y aclara que no es un comprobante fiscal. Todos se imprimen (`imprimir.js` tiene sus estilos de papel) y en el DOCX van como texto. En un bloque angosto, las tablas de gastos, fiado y cuentas por pagar se vuelven tarjetas.
- **Perfiles y módulos** (`perfil.js`, `entrar.html`, fase F2): el espacio tiene el perfil «negocio», que enciende módulos (lo cambia quien administra la empresa). El núcleo (páginas, notas, tablas, imágenes, imprimir, respaldo, búsqueda y ajustes) está siempre; el módulo **negocio** trae el plan de pagos, los bloques de la tienda y sus plantillas; el módulo **rh**, recursos humanos. Lo de un módulo apagado no se muestra (clases `con-`/`sin-<módulo>` en `<html>`, «Crear», el menú «/» con `modulo` en cada elemento de `AT.editorInsertar` y la Ayuda). Sin espacio, Inicio manda a «Crea tu empresa». El perfil entra en el respaldo.
- **Piezas** (`piezas.js`): `figura` (imagen comprimida en el dispositivo a WebP de hasta 1600 px, con pie y texto alternativo; se inserta con «/imagen», pegando o arrastrando), `tablaNumerada` («Tabla N», título y nota; cualquier tabla se puede numerar desde su menú), `notaPie` (Ctrl+Alt+F; al leer, las notas van al final con enlaces de ida y vuelta) y `refCruzada` («ver Tabla 2» o una sección; el número se actualiza solo). Las tablas llevan `attrs.clave` única (la cuida el plugin de ids).
- **Imprimir o exportar** (`exportar.js`, `imprimir.js`, `exportar-docx.js`): «⋯ › Imprimir o exportar» elige el papel (`doc.formato`: carta o A4, vertical u horizontal) y ofrece el **PDF** (imprimir.html, paginado con Paged.js: título y propiedades arriba, número de página abajo, notas al pie al pie de su página e índice con páginas) y el **Word** (Arial de 11 puntos, interlineado 1.15, títulos de Word, tabla numerada, imagen, notas al pie y número de página).

## Formato de bloques

Tus páginas y las de la app (como la Ayuda) usan el mismo formato, y se dibujan con el mismo código (`assets/js/bloques.js`):

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

`contenido` usa el esquema del editor (Tiptap/ProseMirror). Cada bloque de primer nivel tiene un `id` fijo, que es el ancla de los enlaces y de la búsqueda. Tipos de bloque: `paragraph`, `heading` (niveles 2 y 3; los de nivel 2 son las secciones), listas (`bulletList`, `orderedList`, `taskList`), `blockquote`, `codeBlock`, `horizontalRule`, `table`, `callout` (variantes `info`, `aviso`, `idea`), `columnas`, `desplegable`, `indice` y `resumen`, más los que registran otros archivos (piezas, bloques de negocio, base de datos, reportes, recursos humanos). El texto admite negrita, cursiva, subrayado, tachado, código, enlace, resaltado, subíndice y superíndice, y el enlace a otra página («@», nodo `cita`). El dibujo nunca interpreta el texto como HTML y descarta enlaces `javascript:`.

## Tus datos

Todo lo que escribe cada persona se guarda solo en su navegador; nada se sube a un servidor (la sincronización llegará con las cuentas, fase F9).

- **IndexedDB** (base `onelearn`, `assets/js/datos.js`) guarda las páginas, tus plantillas, la papelera, las bases de datos, el historial de versiones y lo de estudio que quedó (notas de las lecciones y marcadores). Si el navegador no tiene IndexedDB, se usa `localStorage`.
- La base va en su versión 4: **tus plantillas** (almacén `plantillas`, entran en el respaldo), la **papelera** (almacén `papelera`: al eliminar una página pasa ahí con la fecha; se recupera tal como estaba, se borra para siempre o se vacía, y lo que lleva más de 30 días se borra solo; no entra en el respaldo), las **bases** y **filas** (versión 3) y el **historial** (`versiones` y `trozos`, versión 4).
- Las notas de las lecciones de antes que no alcanzaron a guardarse (el diario en `localStorage`) se terminan de pasar a IndexedDB al cargar cualquier página: no se pierde ninguna.
- Los ajustes (y el avance de las lecciones de antes) siguen en `localStorage`, porque se leen antes de pintar la página.
- **Tus datos** (barra lateral) muestra cuánto hay guardado, el espacio usado y el disponible (lo que el navegador reserva para OneBook), si el navegador protege los datos (almacenamiento persistente) y permite **descargar un respaldo** en JSON e **importarlo** en otro navegador. Importar combina: entra lo que no existe y lo más reciente; nunca se borra nada.

## App instalable y sin conexión

OneBook se puede instalar como app desde el navegador (en iPhone, con Compartir > Agregar a inicio) y funciona sin conexión: `sw.js` guarda una copia de todo el sitio. Con conexión, cada archivo se pide primero a la red, así que siempre se ve lo publicado; sin conexión, se usa la copia.

**Al agregar o quitar un archivo del sitio** (una página o un script nuevos, por ejemplo), agrégalo a la lista `ARCHIVOS` de `sw.js` y sube `VERSION`. La prueba `pruebas/6-app.js` falla si a la lista le falta algo.


## Crear y editar

«Crear» (barra lateral e inicio) abre la **galería de plantillas** (fase F5): categorías que se filtran (para tu negocio, recursos humanos, paquetes por giro y «Mis plantillas»), búsqueda sin acentos y, en cada plantilla, los bloques que trae: **notas** (una página en blanco), pendientes del día, cortes de caja, fiado, gastos, nota de venta, precios de venta, lista para surtir, inventario, reporte del mes, presupuesto, proveedores, clientes, lista de precios, plan de negocio y préstamo o crédito; con recursos humanos, tu equipo y las calculadoras de nómina. Los **paquetes por giro** (tienda, comida, servicios y catálogo) crean varias páginas de una vez. La cotización, la presentación y el documento en blanco llegan después.

**Tus plantillas:** en un documento, «⋯ › Guardar como plantilla» la guarda con un nombre y para qué sirve; «Sin lo anotado» (marcado) quita ventas, abonos, gastos del mes, cuentas, pagos marcados y tareas hechas, y deja nombres, gastos fijos y lo escrito. En la galería salen primero, en «Mis plantillas», con un botón para eliminarlas («Deshacer» en el aviso). Al usarlas, cada bloque se prepara (`AL_CREAR` en `crear.js`): el corte con la fecha de hoy, la nota de venta con folio nuevo (también en el título) y los gastos en el mes actual.

**Bases de datos** (fase F6, «/base»): una base vive aparte de las páginas (almacenes `bases` y `filas` de IndexedDB, versión 3 de la base), así que otras bases la leen sin abrir la página. Columnas de texto, número, moneda, fecha, selección, selección múltiple, casilla, teléfono, relación con una fila de cualquier base, dato de la relación, fórmula (`{Cantidad} * {Precio}`, con + − × ÷ y paréntesis; analizador propio, sin `eval`; errores `#REF`, `#ERROR` y `#CICLO`) y suma de otra base (lo que suman las filas que se relacionan con esta). La primera columna es el nombre de la fila. Vistas guardadas en pestañas: tabla (agrupar con subtotales), tablero por una selección (mover una tarjeta cambia su valor), galería y calendario por una fecha; cada una con búsqueda, filtro, orden en dos niveles y columnas ocultas. Total al pie por columna (suma, promedio o conteo, de lo que se ve), negritas y resaltado. Ficha de cada fila con las filas de otras bases que se relacionan con ella. Deshacer y rehacer (Ctrl+Z, Ctrl+Y). Importar CSV (reconoce $1,250.50, fechas día/mes/año y sí/no) y exportar lo que se ve. Al leer también se usa; al imprimir sale la vista como tabla. Las plantillas «Inventario» y «Clientes» traen la suya (el bloque lleva una semilla y la base se crea al abrir la página); duplicar la página copia la base; borrar la página para siempre borra sus bases. «Importar respaldo» abre un respaldo de **Bases unificadas**: cada libro, una página con sus tablas como bases, con relaciones, fórmulas, totales, columnas ocultas y vistas guardadas. Las fórmulas también comparan y deciden (fase F7): `SI({Existencias} < {Mínimo}; "Bajo"; "Bien")`, `Y`, `O`, `NO`, `MIN`, `MAX`, `ABS`, `REDONDEAR`, `DIAS({Vence})`, `HOY()`, texto entre comillas y `&`. Formato condicional: hasta tres reglas de color por columna (es, no es, contiene, mayor, menor, vacío → verde, amarillo, rojo o azul).

**Inventario, reportes y «Mi negocio»** (fase F7): las bases con rol (`rol`: productos, movimientos, compras, gastos, presupuesto) existen una vez por espacio; la plantilla Inventario, sus duplicados y tus plantillas muestran las mismas (el bloque lleva `semilla:{rol}` y `inventario.js` la busca o la crea). Productos calcula existencias (al empezar + entradas y salidas), por surtir, estado, valor y ganancia; la nota de venta liga cada concepto a un producto (`prod`), toma su precio, dice cuántos quedan y, al guardarse la página, se vuelve un movimiento «Venta» (`m-origen` venta:<página>:<bloque>:<concepto>; la papelera lo quita y se concilia al abrir). «Resumen del inventario»: valor, bajos y agotados, «Hacer pedido» por proveedor (crea la página del pedido), «Registrar entrada» e «Importar factura XML» (CFDI: entradas, costo nuevo y la compra; PUE pagada, PPD por pagar con su vencimiento; sin duplicar por folio fiscal). «Reporte» desglosa una base por uno o dos campos (una fecha agrupa por mes), suma, cuenta o promedia, en un periodo, con filtro, comparado con el periodo anterior (signo, flecha y porcentaje) o con un presupuesto (disponible en rojo si te pasas), con gráfica, «Presentar» en diapositivas e impresión en carta vertical u horizontal. «Indicadores» (cifras clave con flecha) y «Próximos vencimientos» (bases, planes de pago y cuentas por pagar). Plantillas «Reporte del mes» (un mes completo pasa al mes en curso al usar tu plantilla) y «Presupuesto del mes». En un espacio de negocio, el Inicio muestra «Mi negocio» (`d-minegocio`), una página de bloques que se crea sola y se edita como cualquier otra.

**Historial de versiones** (en «⋯» de cada página): el motor vive en `datos.js` (`AT.datos.versiones`, base `onelearn` versión 4 con los almacenes `versiones` —índice `doc`— y `trozos`). Una versión guarda la lista de huellas de sus bloques (cyrb53 doble más el largo del JSON de cada bloque) y cada bloque se guarda una sola vez en `trozos`: dos versiones o dos páginas duplicadas comparten lo igual, y una versión nueva solo agrega lo que cambió. Trozos y versión se escriben en la misma transacción; la limpieza de trozos sin uso revisa y borra en otra sola transacción, así nunca queda una versión sin sus bloques (y si faltara uno, `leer` lo marca y abre lo demás). Se guarda una al abrir una página sin historial, cada 5 minutos mientras escribes, antes de un borrado grande (3 bloques o 300 letras; los párrafos vacíos no cuentan), al salir o cambiar de pestaña, al restaurar y antes de que un respaldo reemplace la página; con nombre, cuando la persona la guarda. Depuración: todo lo de 24 horas, luego una por día hasta 30 días y una por semana hasta 6 meses, a lo más 100 automáticas; las que tienen nombre se quedan. Al borrar una página para siempre se borra su historial. Sin IndexedDB no hay historial; el respaldo no lo lleva. `versiones.js` es la ventana: lista por día con motivo y cambios, vista previa de solo lectura (sin `AT.docCambio`, con `inert` y sin ids repetidos) que marca lo que ya no está y lo que cambió (diferencia por palabras), «Recuperar este bloque», «Volver a como estaba», «Restaurar esta versión» (con «Deshacer»), «Copiar como página nueva» y nombre; `documento.js` le da `AT.docVersiones` (restaurar y recuperar conservan id, creado, favorita, ancho y autoría).

**Tus páginas: el explorador y los permisos**: en el Inicio, «Tus páginas» es un explorador (`explorador.js`, prefijo de clases `xp-`): ubicaciones (todas, favoritas, recientes, compartidas, compartidas contigo, solicitudes, por tipo, «De estudio» si quedan páginas de estudio, y papelera), columnas que se ordenan y se esconden (nombre, modificado y por quién —`doc.editadoPor`—, tipo, trabajando ahora, permisos y tamaño), buscar, detalles o tarjetas, selección (casilla, clic, Ctrl/Mayús + clic, espacio, Ctrl + A) con abrir, favorita y papelera («Deshacer»), y el menú de cada página («⋯», clic derecho o Mayús + F10). Recuerda ubicación, orden, vista y columnas en `aprende-tecnologia:explorador`. El modelo vive en `datos.js`: **quién eres** (`AT.datos.yo`, `aprende-tecnologia:yo`, entra en el respaldo y se adopta al restaurar si aquí no se usó ni le pusiste nombre o correo), **permisos** de cada página (`doc.acceso`: propietario, personas con rol admin, editor o lector e invitación pendiente o aceptada, solicitudes; `AT.datos.acceso`: rol, puede, personas, invitar, cambiarRol, quitar, solicitar, responder, aceptar; `documentos.guardar` no pisa un acceso más nuevo y al importar un respaldo gana el acceso con `cambio` más reciente) y **presencia** (`AT.datos.presencia`: cada página abierta se anuncia cada 15 s entre pestañas). `permisos.js` es la ventana «Personas y permisos»; `documento.js` abre para leer una página que no puedes editar (aviso y «Pedir permiso para editar»), se ajusta si cambian los permisos y acepta la invitación al abrirla. No es seguridad todavía: sin servidor, quien tiene el navegador tiene los datos; las invitaciones y solicitudes viajan con los respaldos hasta que lleguen las cuentas en la nube (F9) y los avisos.

**Ayuda** (`ayuda.html`, en la barra lateral para todos; se genera con `python3 herramientas/ayuda/generar.py`): una sección por herramienta (título de nivel 2 con id `ay-<módulo>-<nombre>`: núcleo, negocio o rh), con para qué sirve, los pasos y un consejo. `ayuda.js` agrupa cada sección, muestra las de tu espacio («Ver todas» con el aviso del módulo que falta; un enlace directo siempre se ve), filtra con su buscador y agrega «Crear …» con la plantilla de la herramienta. La búsqueda Ctrl K encuentra sus secciones en cualquier espacio. Al agregar o cambiar una herramienta visible, actualiza su sección.

**Recursos humanos** (módulo `rh`): se enciende con «Tengo empleados» al crear un negocio o al editar tu espacio. `nomina.js` calcula con las cifras de 2026 (UMA $117.31, salario mínimo $315.04 y $440.87 en la frontera, tarifa mensual del ISR del Anexo 8 de la RMF 2026, subsidio de 15.02 % de la UMA mensual hasta $11,492.66, cuotas del IMSS con la cesantía y vejez patronal de 2026, INFONAVIT 5 %): el recibo de un periodo (horas extra dobles y triples, descansos, prima dominical, faltas, exentos del art. 93, salario mínimo sin ISR ni cuota obrera), las vacaciones dignas del art. 76, el aguinaldo (exento 30 UMA), el finiquito y la liquidación (prima de antigüedad topada a dos mínimos, tres meses y 20 días por año con salario integrado, exento 90 UMA por año) y la PTU (mitad por días, mitad por salario, tope de tres meses). `rh.js` son sus cinco calculadoras (`nomina`, `vacaciones`, `aguinaldo`, `finiquito`, `ptu`, con `modulo:'rh'` en «/»). Las bases con rol `empleados` (`em-*`: antigüedad y vacaciones al año con fórmulas; `ENTERO` es nueva) e `incidencias` (`in-*`: falta, vacaciones, incapacidad, permiso, horas extra, retardo) viven en `inventario.js`; `equipo.js` las lee para el resumen (quién falta hoy, cumpleaños y aniversarios, sueldos y costo al mes, aguinaldo en noviembre y diciembre, PTU en abril y mayo) y la nómina del equipo (por periodo, con faltas y horas extra; aguinaldo y vacaciones de todos). Plantillas en «Crear → Recursos humanos»: Mi equipo, Nómina del periodo, Vacaciones, Aguinaldo, Finiquito, PTU y Calculadoras de nómina. El Inicio muestra «Tu equipo» (`d-miequipo`) y dos acciones rápidas. Son estimaciones: el recibo oficial lo timbra el contador.

**Favoritas y papelera:** la estrella de la barra superior de un documento (o «⋯ › Agregar a favoritas») la marca sin cambiarle la fecha; las favoritas salen primero en la barra lateral, con su estrella, y aparte en el Inicio. «⋯ › Mover a la papelera» la saca de tus páginas; el Inicio ofrece «Deshacer», y la papelera (al final de tus páginas o en «Tus datos») la recupera o la borra para siempre. No hay páginas dentro de páginas, a propósito.

**Inicio de negocio:** acciones rápidas (el corte de hoy, una venta, el fiado, un gasto; abren la página que ya tienes con `documento.html#agregar=<bloque>`, que la abre para editar y agrega el corte de hoy si falta, o la crean), «Prepara tu negocio» (cinco pasos que se marcan solos al revisar tus páginas; se puede ocultar) y las páginas listas para usar con «Ver todas las plantillas». Un espacio de «Mis finanzas» de antes ya es de negocio y tiene las mismas acciones.

Cada documento se abre en `documento.html?id=...` con dos modos: **Editar** (título, propiedades y el editor) y **Leer** (dibujado con `bloques.js`; la tecla E vuelve a editar). Se guarda solo, unos instantes después de cada cambio. En el editor:

- Barra de herramientas (con flechas entre botones): deshacer, tipo de bloque, negrita, cursiva, subrayado, tachado, resaltado, código, enlace, listas, «Insertar» y opciones del bloque.
- **«/»** abre el menú para insertar: secciones, listas, tareas, callouts (información, aviso, idea), tabla, tabla numerada, desplegable, columnas, resumen, índice, cita textual, código, separador, imagen, nota al pie, referencia cruzada, enlace a otra página (también con «@»), **plan de pagos** (`pagos.js`: el monto total y el número de pagos o un pago fijo, semanal, quincenal o mensual; calcula cada pago, el último absorbe el redondeo, y los pagos marcados se descuentan de lo que falta, también en modo lectura), los **bloques de la tienda** (corte de caja, fiado, gastos del mes, nota de venta, precio de venta y cuentas por pagar), la base de datos, los reportes y, con recursos humanos, sus calculadoras. El menú pone primero lo que se llama como lo escrito (`/venta` ofrece la nota de venta antes que el corte de caja).
- **Asa del bloque** (al pasar el ratón): «+» inserta debajo; «⋮⋮» se arrastra para mover el bloque o abre sus opciones.
- Atajos: Alt+↑/↓ mueven el bloque, Ctrl+Mayús+D lo duplica, Ctrl+Z deshace, Esc suelta el editor (y otro Esc sale del modo zen).
- «⋯» imprime o exporta (PDF y Word), descarga el documento como Markdown, lo duplica o lo elimina (con «Deshacer»).

## Enlaces y búsqueda

- **Enlaces a otras páginas:** en el editor, «@» busca entre tus páginas y sus secciones e inserta un enlace (nodo `cita`). Al leer, tocarlo lleva a esa página o sección, resaltada (`documento.html?id=…#b-...`). Las citas de antes a lecciones quedan como texto.
- **Búsqueda:** Ctrl K (⌘K en Mac) o «Buscar» en la barra lateral. Busca sin acentos y con varias palabras en tus páginas y en la Ayuda (leída de su propio archivo, así funciona sin conexión). En el editor, Ctrl K con texto seleccionado crea un enlace.

## El editor (Tiptap)

Tiptap viene en muchos paquetes de npm que hay que empaquetar en uno. Eso se hace una sola vez, al actualizar su versión, y el resultado (`assets/vendor/tiptap.min.js`) se guarda en el repositorio, así que el sitio sigue sin necesitar compilación para publicarse:

```
cd herramientas/tiptap
npm install
npm run compilar
```

Las versiones están fijadas en `herramientas/tiptap/package.json`. El código propio del editor de OneBook no se compila: es un script clásico más que usa `window.Tiptap`.
