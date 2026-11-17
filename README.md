# OneLearn

Lecciones interactivas de tecnología (hardware, electrónica, software y redes) en español, con demos, repaso y apuntes que se guardan solos.

Es un sitio estático: no necesita servidor propio ni dependencias para funcionar. Abre `index.html` en el navegador, directamente desde el disco o desde cualquier servidor estático (por ejemplo, GitHub Pages). La única pieza compilada es el editor (Tiptap), y el resultado ya está guardado en `assets/vendor/`.

## Estructura

```
index.html                  Inicio: continúa donde te quedaste, notas recientes y explorar temas
manifest.webmanifest        Datos para instalar OneLearn como app
sw.js                       Service worker: guarda el sitio para usarlo sin conexión
assets/
  css/base.css              Estilos compartidos: identidad (4 variantes de color), barra lateral, página, bloques, laboratorios, repaso y apuntes
  js/ajustes.js             Ajustes de lectura (tema, contraste, tamaño, fuente, espacios, ancho, barra lateral); se carga en el <head> y expone AT.ajustes
  fonts/                    IBM Plex Sans y Mono, Atkinson Hyperlegible y OpenDyslexic (SIL OFL 1.1), alojadas aquí
  js/catalogo.js            Temario: grupos y lecciones de la barra lateral
  js/base.js                Utilidades (AT.$, AT.esc, AT.ico...), íconos, página actual, lectura de apuntes y repaso (AT.repaso)
  js/barra.js               Barra lateral, barra superior, menú en celular y pestañas Temas / Mis apuntes / Comunidad
  js/lectura.js             Panel Lectura (tamaño de texto, tema, contraste, fuente y espacios)
  js/apuntes.js             Hoja de apuntes de cada lección (abajo o acoplada a la derecha)
  js/app.js                 App instalable: service worker, aviso de actualización e instalación
  js/bloques.js             Formato de bloques: dibuja una lección o un documento a partir de su JSON (AT.bloques)
  js/avance.js              Avance de lectura por lección, mapa del tema y porcentajes; expone AT.avance
  js/inicio.js              Pantalla de inicio
  js/zen.js                 Modo zen, atajos de teclado (Z, N, J/K, ?, Esc) y su lista de ayuda
  icons/                    Ícono de OneLearn (SVG y PNG de 32, 180, 192 y 512 px, más una versión maskable)
  vendor/tiptap.min.js      Tiptap y ProseMirror empaquetados (MIT, ver tiptap-LICENSE.txt); no se edita a mano
herramientas/tiptap/        Cómo se compila assets/vendor/tiptap.min.js (esbuild)
pruebas/                    Pruebas automáticas con Playwright (ver pruebas/README.md)
lecciones/
  ram.html                  Lección «Memoria RAM»: su documento en JSON y las plantillas de sus laboratorios
  ram.css                   Estilos de sus laboratorios
  ram.js                    Sus laboratorios (AT.labs)
  cpu.html / .css / .js     Lección «Procesador (CPU)»
```

Los scripts son clásicos y comparten el objeto global `window.AT` (no se usan módulos ES) para que las páginas también funcionen abiertas con `file://`. Se cargan en este orden: `ajustes.js` (en el `<head>`), `catalogo.js`, `base.js`, `barra.js`, `lectura.js`, `apuntes.js` (solo en lecciones), `app.js` y después los de cada página.

Todos los tamaños del CSS van en `rem`, para que la página entera crezca con el tamaño de texto. Los colores son tokens en `base.css` con cuatro variantes (claro, oscuro, alto contraste claro y alto contraste oscuro); usa siempre los tokens, nunca colores sueltos.

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
3. Si la lección tiene laboratorios, crea `lecciones/gpu.css` y `lecciones/gpu.js`. Cada laboratorio es un bloque `{"type": "laboratorio", "attrs": {"id": "...", "nombre": "gpu-algo", "titulo": "..."}}`, una plantilla `<template data-lab="gpu-algo">` con su HTML y una función `AT.labs['gpu-algo']=function(raiz){...}` en el script. Tienes `AT.$`, `AT.$$`, `AT.fmt`, `AT.esc`, `AT.setPressed` y `AT.reduce`. Las preguntas de repaso van en el bloque `repaso` del JSON.
4. Agrega los archivos nuevos a `ARCHIVOS` en `sw.js` y sube `VERSION`, para que la lección funcione sin conexión.

No cambies el `id` de una lección ya publicada: es la clave con la que se guardan sus apuntes.

## Apuntes

Cada lección tiene una hoja de apuntes. Se guardan en el navegador de este dispositivo; la sincronización entre dispositivos llegará con las cuentas.

## App instalable y sin conexión

OneLearn se puede instalar como app desde el navegador (en iPhone, con Compartir > Agregar a inicio) y funciona sin conexión: `sw.js` guarda una copia de todo el sitio. Con conexión, cada archivo se pide primero a la red, así que siempre se ve lo publicado; sin conexión, se usa la copia.

**Al agregar o quitar un archivo del sitio** (una lección nueva, por ejemplo), agrégalo a la lista `ARCHIVOS` de `sw.js` y sube `VERSION`. La prueba `pruebas/6-app.js` falla si a la lista le falta algo.


## El editor (Tiptap)

Tiptap viene en muchos paquetes de npm que hay que empaquetar en uno. Eso se hace una sola vez, al actualizar su versión, y el resultado (`assets/vendor/tiptap.min.js`) se guarda en el repositorio, así que el sitio sigue sin necesitar compilación para publicarse:

```
cd herramientas/tiptap
npm install
npm run compilar
```

Las versiones están fijadas en `herramientas/tiptap/package.json`. El código propio del editor de OneLearn no se compila: es un script clásico más que usa `window.Tiptap`.
