# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

OneLearn: sitio estático en español (es-MX) publicado con GitHub Pages en `https://chucho-rey.github.io/OneLearn/` (rama `main`). Lecciones interactivas de tecnología, más documentos propios del estudiante (libretas, notas, apuntes de clase) que se guardan solo en su navegador. Todo el texto de la interfaz, los comentarios del código y los mensajes de commit van en español. El plan y la hoja de ruta viven fuera del repositorio (un Artifact de claude.ai); el `README.md` describe el estado actual.

## Comandos

No hay paso de compilación para publicar: se abre `index.html` o se sirve la carpeta con cualquier servidor estático.

Pruebas (Playwright, en `pruebas/`):

```
cd pruebas
npm install && npx playwright install chromium   # la primera vez, en una máquina propia
npm test                      # todas (node todas.js)
node todas.js 3 10            # solo los archivos 3-*.js y 10-*.js
node 9-editor.js              # un solo archivo
DETALLE=1 node 2-lectura.js   # muestra también lo que pasa
```

En el contenedor de Claude Code, Playwright está instalado globalmente: anteponer `NODE_PATH=/opt/node-tools/node_modules`. La suite completa tarda unos 4 minutos; conviene correrla en segundo plano.

Tiptap (solo al cambiar su versión): `cd herramientas/tiptap && npm install && npm run compilar` regenera `assets/vendor/tiptap.min.js` y `tiptap-LICENSE.txt`. Las versiones están fijadas en su `package.json`.

## Arquitectura

- **Scripts clásicos con un espacio global `window.AT`**, sin módulos ES ni bundler (para que funcione con `file://`). El orden de los `<script>` importa y está documentado en el README; cada página (`index.html`, `documento.html`, `lecciones/*.html`) lista los suyos. `ajustes.js` va en el `<head>` y aplica tema, contraste, tamaño, etc. antes de pintar.
- **Formato de bloques** (`assets/js/bloques.js`): lecciones y documentos son el mismo JSON `{formato, tipo, id, titulo, icono, props, contenido}`, donde `contenido` es JSON de Tiptap/ProseMirror. Cada bloque de primer nivel tiene `attrs.id` fijo (ancla de marcadores y citas; no cambiarlo en lecciones publicadas). `bloques.js` lo dibuja sin `innerHTML` con datos del documento y filtra enlaces (`hrefSeguro`). El editor (`editor.js`) define los mismos tipos de bloque como nodos de Tiptap; un tipo nuevo debe agregarse en ambos lados (y en el Markdown de `documento.js` y el texto de `bloques.js`).
- **Lecciones** (`lecciones/<id>.html`): el contenido es un `<script type="application/json" id="documento">`; cada laboratorio es un bloque `laboratorio` + `<template data-lab="nombre">` + `AT.labs['nombre']=function(raiz){}` en `<id>.js`. El `id` debe coincidir con `assets/js/catalogo.js` y con `data-leccion` del `<body>`. Las 21 lecciones del catálogo están publicadas. Piezas comunes para laboratorios: `AT.elegir(sel, fn)` en `base.js` y las clases `.kpis`, `.barras`/`.br`, `.msg`, `.campo` en `base.css`; los estilos propios van en `lecciones/<id>.css`. Toda lección nueva necesita sus comprobaciones en `pruebas/comprobaciones.js` (las usa `13-temas.js`). Los textos de los laboratorios que vienen del estudiante se muestran con `textContent` o `esc()`.
- **Datos** (`datos.js`, `AT.datos`): documentos, notas y marcadores en IndexedDB (base `onelearn`), con `localStorage` como respaldo si no hay IndexedDB. Las notas se escriben primero en un diario de `localStorage` (`aprende-tecnologia:apuntes:<id>`) y luego en IndexedDB. Avance y ajustes siguen en `localStorage` (prefijo `aprende-tecnologia:`). Los cambios se avisan con `AT.datos.on` y entre pestañas con BroadcastChannel.
- **«Cómo está hecho OneLearn»** (`acerca.html`, `data-pagina="acerca"`): página para estudiantes de programación que describe la arquitectura y las tecnologías, en el formato de bloques. Si cambias la arquitectura, las versiones o las cifras de pruebas, actualiza también su JSON. La búsqueda la incluye por `PAGINAS` en `buscar.js`.
- **Proyectos** (`proyectos/`, `assets/js/proyecto.js`): casos prácticos por fases. Cada proyecto es `proyectos/<id>.html` con su JSON en `<script id="proyecto">` (fases con contenido en el formato de bloques, tareas y entregable) y una entrada en `AT.proyectos` (`catalogo.js`) cuyo total de tareas y fases debe coincidir (lo revisa `14-proyectos.js`). Si tiene diagramas interactivos, van como laboratorios en `proyectos/<id>.js` y `.css` (ver `red-oficina`). El avance está en `AT.proyectosAvance` (`base.js`, localStorage) y entra en el respaldo.
- **Rutas**: `inicio`, `documento` y `acerca` viven en la raíz; las lecciones en `lecciones/` y los proyectos en `proyectos/` (desde ahí `AT.rutas.lecciones` es `../lecciones/`). `AT.rutas.raiz` da el prefijo correcto; los `href` guardados (citas, marcadores) son relativos a la raíz.
- **Service worker** (`sw.js`): red primero y copia para usar sin conexión. **Al agregar o quitar cualquier archivo del sitio hay que actualizar `ARCHIVOS` y subir `VERSION`**; `pruebas/6-app.js` falla si falta alguno (excluye `pruebas/`, `herramientas/`, `.md` y `.txt`).

## Convenciones

- CSS: todos los tamaños en `rem`; colores solo con los tokens de `assets/css/base.css`, que tienen cuatro variantes (claro, oscuro, alto contraste claro y oscuro). Las pruebas auditan contraste WCAG (4.5:1, o 7:1 en alto contraste) y desbordes horizontales en varios anchos, tamaños de letra y fuentes (incluida OpenDyslexic).
- Accesibilidad: patrones ARIA (pestañas, barra de herramientas con flechas, combobox, `aria-disabled` en lugar de `disabled` para no perder el foco), manejo explícito del foco y atajos que se ignoran mientras se escribe.
- Cada hito trae su archivo de pruebas `pruebas/N-nombre.js` usando `lib.js` (`prueba`, `pagina`, `listo`, `revisar`). En pruebas del editor, deja una pausa breve después de teclas de movimiento o selección antes de un atajo (ProseMirror lee la selección del DOM de forma asíncrona).
