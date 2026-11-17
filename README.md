# OneLearn

Lecciones interactivas de tecnología (hardware, electrónica, software y redes) en español, con demos, repaso y apuntes que se guardan solos.

Es un sitio estático: no necesita compilación ni dependencias. Abre `index.html` en el navegador, directamente desde el disco o desde cualquier servidor estático (por ejemplo, GitHub Pages).

## Estructura

```
index.html                  Inicio: continúa donde te quedaste, notas recientes y explorar temas
assets/
  css/base.css              Estilos compartidos: identidad (4 variantes de color), barra lateral, página, bloques, laboratorios, repaso y apuntes
  js/ajustes.js             Ajustes de lectura (tema, contraste, tamaño, fuente, espacios, ancho, barra lateral); se carga en el <head> y expone AT.ajustes
  fonts/                    Atkinson Hyperlegible y OpenDyslexic (SIL OFL 1.1), alojadas aquí; solo se descargan si alguien las elige
  js/catalogo.js            Temario: grupos y lecciones de la barra lateral
  js/comun.js               Arma la barra lateral, la barra superior y los apuntes; panel Lectura, navegación, repaso y utilidades (AT.*)
  js/avance.js              Avance de lectura por lección, mapa del tema y porcentajes; expone AT.avance
  js/inicio.js              Pantalla de inicio
  js/zen.js                 Modo zen, atajos de teclado (Z, N, J/K, ?, Esc) y su lista de ayuda
  icons/                    Ícono de OneLearn (SVG y PNG de 32, 180, 192 y 512 px, más una versión maskable)
lecciones/
  ram.html                  Contenido de la lección «Memoria RAM»
  ram.css                   Estilos de sus demos
  ram.js                    Sus demos y las preguntas de repaso
  cpu.html / .css / .js     Lección «Procesador (CPU)»
```

Los scripts son clásicos y comparten el objeto global `window.AT` (no se usan módulos ES) para que las páginas también funcionen abiertas con `file://`.

Todos los tamaños del CSS van en `rem`, para que la página entera crezca con el tamaño de texto. Los colores son tokens en `base.css` con cuatro variantes (claro, oscuro, alto contraste claro y alto contraste oscuro); usa siempre los tokens, nunca colores sueltos.

## Cómo agregar una lección

1. En `assets/js/catalogo.js`, agrega `archivo` a la lección (por ejemplo, `archivo:'cpu.html'`). Así deja de mostrarse como «Pronto» y aparece en la barra lateral y en «Siguiente lección».
2. Copia `lecciones/ram.html` como `lecciones/cpu.html`, cambia el `<title>`, pon `data-leccion="cpu"` en el `<body>` (igual al `id` del catálogo) y reemplaza el contenido de `<main class="page">`.
3. Si la lección tiene demos propias, crea `lecciones/cpu.css` y `lecciones/cpu.js` y enlázalos en lugar de los de RAM. Desde el script tienes `AT.$`, `AT.$$`, `AT.fmt`, `AT.esc`, `AT.setPressed`, `AT.reduce` y `AT.repaso({host, score, reset, preguntas})`.

No cambies el `id` de una lección ya publicada: es la clave con la que se guardan sus apuntes.

## Apuntes

Cada lección tiene una hoja de apuntes. Se guardan en el navegador (`localStorage`) y, si la página se publica como Artifact de Claude con las capacidades `db` y `user`, también en la cuenta de quien la ve, para que se sincronicen entre dispositivos.
