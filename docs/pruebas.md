# Pruebas automáticas

Pruebas con Playwright en `pruebas/`. Cada archivo cubre un hito y comprueba que todo funcione en celular y escritorio,
con texto del 90 % al 150 %, con las tres fuentes, en claro, oscuro y alto contraste, y con el teclado. Fallan si
encuentran desbordes, errores de consola, texto con poco contraste (WCAG: 4.5:1, o 7:1 en alto contraste) o un
comportamiento distinto del esperado. Sirven el sitio en `http://127.0.0.1:puerto/OneLearn/`, igual que GitHub Pages, con
un servidor incluido en `lib.js`.

## Cómo correrlas

```bash
cd pruebas
npm install
npx playwright install chromium   # la primera vez
npm test                          # todas (unos 8 minutos)
node todas.js 3 24                # solo 3-*.js y 24-*.js
DETALLE=1 node todas.js 46        # muestra cada comprobación que pasa
```

En el contenedor de Claude Code: `NODE_PATH=/opt/node-tools/node_modules node todas.js …` (Playwright está instalado
globalmente). Para correr la suite completa sin que tus cambios a medias la afecten, conviene correrla en una copia
(`git worktree add`) o en segundo plano.

## Cómo escribir una prueba nueva

- Archivo `pruebas/N-nombre.js` con el siguiente número libre (hoy el último es 46). Empieza con un comentario que diga qué
  comprueba, en viñetas.
- Usa `lib.js`: `prueba(nombre, async ({browser, base, r}) => …)`, `pagina(browser, {ancho, alto, reducir, ajustes,
  perfil, local, movil})`, `listo(p, ms)`, `revisar(p, r, etiqueta)` (desbordes, contraste y errores) y `cerrar(p)`.
  Comprobaciones: `r.cumple(condición, 'texto', detalle)` y `r.igual(obtenido, esperado, 'texto')`. Los textos de las
  comprobaciones dicen lo que el usuario vería («la sucursal ve la confirmación con el faltante»).
- `pagina()` abre un navegador con un espacio de negocio ya creado (y vuelve a sembrarlo en cada carga); `perfil:false` lo
  deja sin espacio y un objeto pone ese perfil.
- Prueba también en celular (390 px) y con oscuro y alto contraste (`revisar`). En el celular, el Inicio tiene secciones:
  si usas los tableros, toca antes `.cn-b[data-seccion="inicio"]`; el botón para crear es `#celNuevo`.
- Para dos personas o dispositivos (Cedis y sucursal), abre dos `pagina()`: cada una tiene su almacenamiento.
- Nunca borres ni desactives una prueba que falla para subir a `main`: arregla el código o, si el cambio de
  comportamiento es a propósito, actualiza la prueba y explícalo en el commit.

## Qué cubre cada archivo

| Archivo | Qué comprueba |
| --- | --- |
| `1-identidad.js` | Las cuatro variantes de color en el Inicio y la Ayuda, el contraste, los tamaños de texto, la migración de preferencias anteriores y que se borren las claves de las lecciones de antes |
| `2-lectura.js` | El panel Lectura: cada opción, el teclado, Restablecer, el contraste del sistema y las fuentes para dislexia |
| `3-barra.js` | La barra lateral: «Tus páginas» como explorador (ubicaciones con su cuenta, salas como carpetas, teclado como árbol, la página abierta marcada, papelera), menú en celular con trampa de foco y variantes sin desbordes |
| `5-zen.js` | Modo zen y atajos: Z, J y K, tamaño y ancho, ?, Esc y E; nada se activa mientras escribes |
| `6-app.js` | App instalable: manifiesto, íconos, que `sw.js` guarde todo el sitio, uso sin conexión e «Instalar» |
| `7-bloques.js` | El formato de bloques: la Ayuda y tus páginas desde su JSON, que un documento no pueda inyectar código y que un tipo desconocido se ignore |
| `8-datos.js` | Tus datos: la base sube de versión sin los almacenes de las lecciones, guardado y otras pestañas, respaldo (descargar, navegador limpio, importar) y uso sin IndexedDB |
| `9-editor.js` | «Crear» y el editor: secciones, callout, tabla, resumen e índice; autoguardado, deshacer, mover, duplicar y arrastrar bloques, «/», asa, barra con teclado, Markdown, eliminar con «Deshacer», propiedades y zen |
| `18-piezas.js` | Imágenes que se comprimen, tablas numeradas, notas al pie y referencias cruzadas; al leer, Markdown, celular y que no se carguen imágenes externas |
| `19-landing.js` | La bienvenida para empresas: portada, empresa de ejemplo, herramientas por área, calculadora de precio, precios sin cifra, preguntas, `?conoce` y variantes |
| `20-exportar.js` | «Imprimir o exportar»: papel y orientación, el PDF con Paged.js y el Word (leído del ZIP) |
| `21-pagos.js` | El plan de pagos: cálculo, fechas, pago fijo, marcar al editar y al leer, Markdown y celular |
| `22-entrar.js` | Perfiles y «Crea tu empresa»: los tres pasos, departamentos y páginas sugeridas, solo lo de la empresa en barra, Crear (lista completa de plantillas), «/» y búsqueda; «Cambiar tu espacio»; con datos y un perfil que ya no existe, un espacio de negocio; restaurar respaldos |
| `23-pestanas.js` | Pestañas dentro de la app: abrir, título, la misma página en dos pestañas, atajos, recordar, descargar, hasta 12, Atrás y celular |
| `24-tienda.js` | Bloques de la tienda: corte de caja, fiado, gastos con «Generar mes», nota de venta, precio de venta y cuentas por pagar; leer, guardar, Markdown, búsqueda, imprimir y folios |
| `25-plantillas.js` | Inicio de negocio, galería de plantillas, paquetes por giro, «Guardar como plantilla», favoritas y papelera |
| `26-bases.js` | Bases de datos: columnas de cada tipo, vistas, ficha, deshacer, CSV, suma de otra base, imprimir, respaldo y Bases unificadas |
| `27-ancho.js` | Ancho y detalles visuales: columna de la Ayuda, ancho de trabajo, «Ancho completo», enlaces con forma de botón y etiquetas de color |
| `28-inventario.js` | Inventario: fórmulas, existencias, resumen, «Registrar entrada», la nota de venta que descuenta, pedido, factura XML y lista de precios |
| `29-reportes.js` | Reportes: comparación con el mes pasado, gráfica, ajustes, «Presentar», al leer e imprimir horizontal |
| `30-indicadores.js` | Formato condicional, indicadores, próximos vencimientos y presupuesto del mes |
| `31-minegocio.js` | «Mi negocio» como módulo del tablero: se crea una vez, bloques vivos, «Editar esta página» |
| `32-barra-compacta.js` | La barra lateral compacta (solo iconos), sus globos, «Expandir» y celular |
| `33-rh.js` | Recursos humanos: motor de 2026 (ISR, subsidio, IMSS) y calculadoras |
| `34-equipo.js` | Tu equipo: empleados e incidencias, resumen, nómina del equipo y «Tu equipo» en el Inicio |
| `35-ayuda.js` | Ayuda: secciones por herramienta, filtro por módulo, buscador, «Crear …» y Ctrl K |
| `36-versiones.js` | Historial de versiones: subida de la base, cuándo se guarda, ventana, vista previa, recuperar, restaurar, nombre y depuración |
| `37-explorador.js` | Explorador y permisos: columnas, orden, ubicaciones, búsqueda, teclado, selección, menú, «Personas y permisos» y el recorrido entre dos personas con respaldos |
| `39-empresa.js` | Empresa, personas y departamentos: «Tu empresa», PIN, cambiar de persona, permisos de miembro y responsable, columna Departamento y respaldo |
| `40-salas.js` | Salas: General y por departamento, la página de una sala, «¿Dónde?», lo que ve cada quien, administrar, mover y respaldo |
| `41-tablero.js` | Inicio armable: tableros por omisión, editar, arrastrar, catálogo, nota, gráfica, portada de sala, permisos y respaldo |
| `42-ejemplo.js` | La empresa de ejemplo: se arma con cifras fijas, lo que ve cada persona, «Crear mi empresa» y que no toque una empresa propia |
| `43-historial-filas.js` | Historial de las filas: fila nueva y lo escrito enseguida como su creación, cambios juntados, la ficha con «Volver a», otra persona, «Actividad» con filtro, eliminar y «Recuperar fila», depuración (90 días y 50 por fila), no va en el respaldo, versión 6 y borrar la base; celular oscuro y alto contraste |
| `44-caja-chica.js` | Caja chica: color con celda vacía, la plantilla y sus columnas, número consecutivo (no se escribe, no se reusa, numera lo que había), saldo acumulado (orden del número, no de la vista; saldo inicial en la franja; la caja siguiente lo arrastra) y «Eliminar todos los datos» con confirmación; celular oscuro y alto contraste |
| `45-archivos-celular.js` | El Inicio en el celular: escritorio sin cambios; Páginas con carpetas y su cuenta, color de la sala, recientes, entrar a una carpeta (dirección, foco, ruta, páginas de la sala), orden, «+» en la sala, menú «⋯» y permisos, Atrás y el chip suben, buscar, barra lateral, abrir una página sin navegación inferior; secciones Inicio y Empresa, recordar la sección; variantes oscuro y alto contraste, ×1.5 OpenDyslexic y 320 px |
| `46-cedis.js` | Pedidos al Cedis con dos navegadores: plantilla con ejemplos, ajustes, invitación (solo su sucursal, clave aparte), la sucursal sin espacio se conecta, mínimo y múltiplo, enviar y versión 2, recibir (repetido, viejo, firma alterada, otra sucursal), qué cambió, consolidado y quién falta, confirmar con faltante, la sucursal lo ve, surtido, hojas, lista de compra y CSV, formato actualizado, repetir el último pedido, cambiar clave, respaldo; celular y alto contraste |
| `lib.js` | Servidor, navegador, auditoría de contraste y utilidades compartidas |

Al 27 de noviembre de 2026: 36 archivos y 2,168 comprobaciones, todas pasando.
