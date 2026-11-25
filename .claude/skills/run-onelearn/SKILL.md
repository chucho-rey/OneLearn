---
name: run-onelearn
description: Run, start, serve, screenshot and drive OneBook (formerly OneLearn), the static Spanish business workspace site in this repo. Use when asked to run the site, open the Inicio, a page, the Ayuda or the landing, click or type through it, take a screenshot of a page, or run its Playwright test suite.
---

OneBook es un sitio estático (HTML, CSS y JS sin compilar). Un agente lo maneja con
`.claude/skills/run-onelearn/driver.cjs`: el script sirve el repositorio en `/OneLearn/`, igual que GitHub Pages, abre Chromium
sin ventana y ejecuta los comandos que recibe por stdin. Las rutas de abajo son relativas a la raíz del repositorio.

## Requisitos

No se instala nada. En este contenedor, Playwright y Chromium ya están instalados de forma global. Solo hay que
anteponer `NODE_PATH=/opt/node-tools/node_modules` a cada comando de `node`.

## Run (ruta del agente)

```bash
NODE_PATH=/opt/node-tools/node_modules node .claude/skills/run-onelearn/driver.cjs /tmp/onebook-capturas <<'EOF'
espacio Abarrotes Lupita
size 390 844
goto inicio.html
text #saludo
eval AT.perfil.actual().modulos
shot inicio-celular
size 1280 900
goto ayuda.html
text .page h1
shotel ayuda-corte #ay-negocio-corte
errors
EOF
```

Salida real: `espacio listo: Abarrotes Lupita`, el saludo del Inicio (`Abarrotes Lupita`), `["negocio","rh"]`, la ruta de
la captura, `Ayuda: cómo usar OneBook`, la ruta de la otra captura y `sin errores`. Las capturas quedan en la carpeta del
primer argumento (`/tmp/onebook-capturas` si no le pasas ninguna).

| Comando | Qué hace |
|---|---|
| `espacio [nombre]` | Crea un espacio de negocio (módulos negocio y rh) para las páginas que abras después. Sin espacio, `inicio.html` manda a `entrar.html` («Crea tu espacio») |
| `goto <ruta>` | Abre una página relativa a la raíz: `index.html` (bienvenida; si el navegador ya usó la app, salta a `inicio.html`; con `?conoce` se queda), `inicio.html`, `documento.html?id=<id>`, `ayuda.html`, `entrar.html`, `app.html` (pestañas) |
| `size <ancho> <alto>` | Cambia la ventana. `390 844` simula un celular |
| `click <sel>` · `fill <sel> <texto>` · `press <tecla>` | Clic, escribir y teclas (sintaxis de Playwright) |
| `text <sel>` · `eval <js>` | Imprime un texto o el resultado de una expresión (`eval AT.crear.nuevo('corte')` crea una página y la abre) |
| `shot <n>` · `shotel <n> <sel>` · `shotfull <n>` | Captura de la ventana, de un elemento o de la página completa |
| `wait <ms>` · `errors` | Espera; imprime los errores de consola acumulados |

## Run (ruta humana)

```bash
python3 -m http.server 8123 --bind 127.0.0.1   # luego abre http://127.0.0.1:8123/
lsof -ti:8123 -sTCP:LISTEN | xargs -r kill     # para detenerlo
```

Abrir `index.html` con doble clic (`file://`) también funciona: no hay módulos ES. Lo único que no corre así es el
service worker.

## Pruebas

```bash
cd pruebas
NODE_PATH=/opt/node-tools/node_modules node todas.js 21     # solo 21-pagos.js (unos 10 s)
NODE_PATH=/opt/node-tools/node_modules node todas.js        # todas (29 archivos, unos 7 min): córrela en segundo plano
```

## Gotchas

- **Cada vez que corres el driver, el navegador empieza limpio**: sin espacio, sin páginas y sin `localStorage`. Usa
  `espacio` antes del primer `goto` a la app; en la bienvenida (`index.html`), sin `espacio`, ves lo que ve alguien nuevo.
- **En el editor (`documento.html`), espera el guardado** antes de recargar o cambiar de página: `#docEstado` dice
  «Guardado». Tiptap enfoca de forma asíncrona: espera el foco en `.ProseMirror` antes de teclear.
- **Las páginas de la app viven en IndexedDB**, no en archivos: para abrir una, créala primero (`eval AT.crear.nuevo('notas')`
  o desde «Crear») o busca su id con `eval AT.datos.documentos.todos().then(l=>l.map(d=>d.id+' '+d.titulo))`.

## Troubleshooting

- `page.textContent: Timeout 30000ms exceeded` → el selector no existe en esa página (o te mandó a `entrar.html` por
  no tener espacio).
- `Cannot find module 'playwright'` → falta `NODE_PATH=/opt/node-tools/node_modules`. Por eso el driver es `.cjs`:
  `NODE_PATH` no aplica a `import` en módulos ES.
