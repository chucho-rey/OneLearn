---
name: run-onelearn
description: Run, start, serve, screenshot and drive OneLearn (the static Spanish learning site), including its simulated Linux terminal labs. Use when asked to run OneLearn, open a lesson or the Rutas page, type commands in a lab terminal, take a screenshot of a page, or run its Playwright test suite.
---

OneLearn es un sitio estático (HTML, CSS y JS sin compilar). Un agente lo maneja con
`.claude/skills/run-onelearn/driver.cjs`: el script sirve el repositorio en `/OneLearn/`, igual que GitHub Pages, abre Chromium
sin ventana y ejecuta los comandos que recibe por stdin. Las rutas de abajo son relativas a la raíz del repositorio.

## Requisitos

No se instala nada. En este contenedor, Playwright y Chromium ya están instalados de forma global. Solo hay que
anteponer `NODE_PATH=/opt/node-tools/node_modules` a cada comando de `node`.

## Run (ruta del agente)

```bash
NODE_PATH=/opt/node-tools/node_modules node .claude/skills/run-onelearn/driver.cjs /tmp/onelearn-capturas <<'EOF'
size 390 844
goto lecciones/terminal.html
term 1 ls -a
text .demo >> nth=1 >> .term-ej-n
shotel lab-terminal .demo >> nth=1
goto rutas.html
shot rutas-celular
errors
EOF
```

Salida real: imprime la terminal tras `ls -a`, después `2 de 7` (ejercicios cumplidos), las rutas de las dos capturas y
`sin errores`. Las capturas quedan en la carpeta del primer argumento (`/tmp/onelearn-capturas` si no le pasas ninguna).

| Comando | Qué hace |
|---|---|
| `goto <ruta>` | Abre una página relativa a la raíz: `index.html` (bienvenida; si el navegador ya usó la app, salta a `inicio.html`), `inicio.html`, `rutas.html`, `lecciones/<id>.html`, `proyectos/<id>.html` |
| `size <ancho> <alto>` | Cambia la ventana. `390 844` simula un celular |
| `click <sel>` · `fill <sel> <texto>` · `press <tecla>` | Clic, escribir y teclas (sintaxis de Playwright) |
| `term <n> <línea>` | Escribe en la terminal simulada del laboratorio `n` (empieza en 0, cuenta todos los `.demo`), espera a que termine y muestra las últimas líneas |
| `text <sel>` · `eval <js>` | Imprime un texto o el resultado de una expresión (`eval AT.leccion.id`) |
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
NODE_PATH=/opt/node-tools/node_modules node todas.js 15     # solo 15-rutas.js (unos 7 s)
NODE_PATH=/opt/node-tools/node_modules node todas.js        # las 16 (unos 9 min): córrela en segundo plano
```

## Gotchas

- **`:nth-of-type` no sirve para elegir laboratorios.** `.demo` no son hermanos (cada uno vive en su propio bloque).
  Usa `.demo >> nth=1`. Con `:nth-of-type`, `text` espera 30 s y falla por tiempo.
- **`shotfull` en celular sale ilegible:** una lección mide más de 15 000 px de alto. Usa `shotel` sobre el laboratorio.
- **Para saber que la terminal terminó, no esperes un tiempo fijo.** Mientras un comando corre, `.term-ps-v` está
  vacío; vuelve a tener texto cuando termina o cuando hace una pregunta. `term` ya espera eso. Si el comando pide
  contraseña (`sudo`) o «¿Desea continuar?», manda la respuesta con otra línea `term <n> <respuesta>`. Cualquier
  contraseña sirve.
- **Los ejercicios se califican de forma permisiva.** `ls -a` en tu carpeta cumple también el ejercicio «ls». No
  supongas que van en orden.
- Cada vez que corres el driver, el navegador empieza limpio: sin avance, sin ejercicios guardados y sin
  `localStorage`.

## Troubleshooting

- `page.textContent: Timeout 30000ms exceeded` → el selector no existe (ver el gotcha de `nth-of-type`).
- `Cannot find module 'playwright'` → falta `NODE_PATH=/opt/node-tools/node_modules`. Por eso el driver es `.cjs`:
  `NODE_PATH` no aplica a `import` en módulos ES.
