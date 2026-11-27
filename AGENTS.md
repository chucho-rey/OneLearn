# AGENTS.md: instrucciones para cualquier IA que trabaje en OneBook

Este archivo es la puerta de entrada para Claude, ChatGPT, GLM o cualquier otro agente. Léelo completo antes de tocar
código. Lo demás está en `docs/` (ver «Dónde está cada cosa»).

## El proyecto en una línea

**OneBook** (antes OneLearn): espacio de trabajo de bloques y plantillas para **empresas mexicanas de 5 a 100 personas**
(ventas, cobros, inventario, gastos, caja chica, recursos humanos, pedidos al Cedis, salas por departamento e Inicio
armable). Sitio estático en español (es-MX), sin servidor: **todo se guarda en el navegador** (IndexedDB y
localStorage). Se publica con GitHub Pages desde `main` en <https://chucho-rey.github.io/OneLearn/>.

## Antes de empezar (siempre)

1. Lee `docs/ESTADO.md`: qué está en curso, quién lo tiene y qué sigue. **No tomes una tarea que otra IA tiene «En curso».**
2. Lee `docs/arquitectura.md` (reglas y cómo está hecho cada área). Si vas a tocar un área, lee su sección completa.
3. `git status` y `git log --oneline -10`: trabaja sobre la última `main`.
4. Anota en `docs/ESTADO.md` que tomas la tarea (tu nombre de IA, rama y fecha) y haz commit de eso en tu rama.

## Reglas indispensables

- **Todo en español**: interfaz, comentarios del código, mensajes de commit y documentación.
- **Local primero**, solo pesos mexicanos (MXN), una empresa por espacio. Lo académico de OneLearn salió por completo: no
  lo vuelvas a agregar.
- **Scripts clásicos** con un espacio global `window.AT`, **sin módulos ES ni bundler ni framework** (debe funcionar con
  `file://`). El orden de los `<script>` de cada página importa.
- **No cambies las claves internas** aunque tengan el nombre viejo: prefijo `aprende-tecnologia:` en localStorage, base
  IndexedDB `onelearn`, cachés `onelearn-`. Cambiarlas borraría los datos de quien ya usa la app.
- **Nada se pierde:** el editor envuelve todo nodo que no conoce en `legado`/`legadoLinea` y lo devuelve idéntico al guardar.
  Un dato que no entiendes se conserva, no se borra.
- **CSS:** tamaños en `rem`; colores **solo** con los tokens de `assets/css/base.css` (cuatro variantes: claro, oscuro y
  alto contraste de cada uno). Nada de colores sueltos.
- **Accesibilidad:** patrones ARIA, foco explícito, `aria-disabled` en lugar de `disabled`, todo usable con teclado. Las
  pruebas auditan contraste WCAG (4.5:1; 7:1 en alto contraste) y desbordes.
- **Al agregar o quitar un archivo del sitio**, actualiza `ARCHIVOS` en `sw.js` y sube `VERSION` (`onelearn-N`).
- **Al agregar una función visible**, agrega o actualiza su sección de la Ayuda en `herramientas/ayuda/generar.py` y corre
  `python3 herramientas/ayuda/generar.py` (escribe `ayuda.html`; no lo edites a mano).
- **Cada tarea trae su prueba** `pruebas/N-nombre.js` (con `pruebas/lib.js`), con el siguiente número libre. **A `main` solo
  se sube con la suite completa pasando.** Nunca desactives ni borres una prueba para que pase.
- **Privacidad:** nada de datos reales de personas o empresas en el repositorio (es público). Ejemplos inventados.
- **No edites a mano** `assets/vendor/*.min.js` ni `ayuda.html`.

## Comandos

```bash
# Ver el sitio (no hay compilación)
python3 -m http.server 8123 --bind 127.0.0.1      # y abre http://127.0.0.1:8123/

# Pruebas (Playwright, carpeta pruebas/)
cd pruebas
npm install && npx playwright install chromium     # la primera vez, en una máquina propia
npm test                                           # todas: ~36 archivos, unos 8 minutos
node todas.js 22 46                                # solo 22-*.js y 46-*.js
DETALLE=1 node todas.js 46                         # muestra cada comprobación

# La Ayuda
python3 herramientas/ayuda/generar.py
```

En el contenedor de Claude Code, Playwright está instalado globalmente: antepón `NODE_PATH=/opt/node-tools/node_modules`
a cada `node`. La suite completa tarda unos 8 minutos: córrela en segundo plano.

## Flujo de trabajo entre varias IA

- **Una rama por tarea:** `ia/<herramienta>/<tarea-corta>` (por ejemplo `ia/glm/aviso-privacidad`, `ia/claude/f9-cuentas`).
  Nunca trabajes directo en `main`.
- **Commits pequeños y en español**, en imperativo o descriptivos («Agrega el aviso de privacidad», «Corrige el foco al
  cerrar la ficha»). Termina el mensaje con la línea de coautoría que agregue tu herramienta; si no agrega ninguna, pon
  `IA: <nombre de la herramienta>`.
- **Para subir a `main`:** la suite completa pasando en tu rama, `docs/` al día y `docs/ESTADO.md` actualizado. Si otra IA
  puede revisar la rama antes (ver `docs/ias.md`), mejor. Combina con `git merge --no-ff` o pide al usuario que lo haga.
- **Si encuentras algo roto que no es tu tarea**, anótalo en `docs/ESTADO.md` («Encontrado») en lugar de arreglarlo de pasada.
- **Si una decisión es del usuario** (precio, textos legales, algo que cambia el producto), pregúntale; no la inventes.

## Al terminar una tarea (checklist)

1. Prueba nueva o actualizada en `pruebas/`, y la suite completa pasando.
2. Si agregaste o quitaste archivos del sitio: `sw.js` (`ARCHIVOS` y `VERSION`).
3. Si cambió algo visible: sección de la Ayuda y `python3 herramientas/ayuda/generar.py`.
4. `docs/arquitectura.md`, `docs/estructura.md` y `docs/pruebas.md` al día (lo técnico vive en el repositorio).
5. `docs/ESTADO.md`: mueve la tarea a «Hecho» con fecha, commit y lo que quedó pendiente.
6. Commit, push de tu rama y, si corresponde, a `main`.
7. Notion (plan, Roadmap y características) lo actualiza Claude, que tiene acceso, o el usuario: deja en «Hecho» lo
   necesario para hacerlo.

## Dónde está cada cosa

| Archivo | Para qué |
|---|---|
| `AGENTS.md` | Este archivo: reglas, comandos y flujo. Empieza aquí. |
| `docs/ESTADO.md` | Qué está en curso, qué sigue (cola de tareas) y lo último hecho. Se actualiza en cada tarea. |
| `docs/arquitectura.md` | Cómo está hecho cada área, convenciones y las trampas conocidas. |
| `docs/estructura.md` | Qué hace cada archivo, orden de los scripts, formato de bloques y lo que guarda cada cosa. |
| `docs/pruebas.md` | Cómo funcionan las pruebas y qué cubre cada archivo. |
| `docs/ias.md` | Para el usuario y las IA: cuándo usar cada IA, cómo pasarse el trabajo y los comandos para pedirlo. |
| `.claude/skills/*/SKILL.md` | Procedimientos paso a paso (correr el sitio, retomar, cerrar una tarea, revisar una rama). Son Markdown normal: si tu herramienta no carga «skills», léelos como instrucciones. |
| `CLAUDE.md` | Lo mismo que este archivo más lo propio de Claude Code. |
| Notion «OneBook» | Plan del producto, Roadmap (vista del usuario) y características. No lo necesitas para programar. |
