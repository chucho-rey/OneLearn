---
name: cerrar-tarea
description: Terminar una tarea de OneBook y dejarla lista para subir: suite completa de pruebas, sw.js, Ayuda, documentación en docs/, docs/ESTADO.md, commit y push de la rama (y a main si ya fue revisada). Úsalo cuando el usuario diga «cierra la tarea», «termina», «publícalo» o «súbelo».
---

# Cerrar una tarea

Procedimiento para terminar. Cualquier IA puede seguirlo leyendo este archivo. Si algún paso falla, para y díselo al
usuario con el error; no lo saltes.

## 1. Revisa tu propio cambio

```bash
git status
git diff main --stat
git diff main
```

- Todo en español (interfaz, comentarios, commits). Sin `console.log` de depuración.
- CSS en `rem` y con tokens de `assets/css/base.css`; nada de colores sueltos.
- `aria-disabled` en lugar de `disabled`; el foco vuelve a donde debe al cerrar ventanas.
- No cambiaste claves internas (`aprende-tecnologia:`, `onelearn`).

## 2. Lo que no se puede olvidar

- **Archivos nuevos o quitados del sitio:** `ARCHIVOS` en `sw.js` y subir `VERSION` (`onelearn-N` → `N+1`).
- **Algo visible cambió:** sección de la Ayuda en `herramientas/ayuda/generar.py` y
  `python3 herramientas/ayuda/generar.py`. Si es una plantilla nueva, su id en `PLANTILLA` de `assets/js/ayuda.js`.
- **Prueba:** `pruebas/N-nombre.js` nueva o actualizada. Si agregaste una plantilla a la galería, la lista esperada de
  «Crear» en `pruebas/22-entrar.js` cambia.
- **Documentación:** la sección del área en `docs/arquitectura.md`; `docs/estructura.md` si hay archivos nuevos;
  `docs/pruebas.md` (fila de la prueba nueva y el conteo).

## 3. Suite completa

```bash
cd pruebas
node todas.js                 # en una máquina propia (npm install y npx playwright install chromium la primera vez)
NODE_PATH=/opt/node-tools/node_modules node todas.js   # en el contenedor de Claude Code
```

Tarda unos 8 minutos. Tiene que terminar en «Las N pruebas pasan». Si una prueba que no tocaste falla, revisa si tu
cambio la afectó (por ejemplo, un texto o un orden que cambió). Nunca la borres ni la desactives. Anota cuántos archivos
y comprobaciones pasaron (suma de «comprobaciones bien»).

## 4. Estado y commit

- En `docs/ESTADO.md`: quita la tarea de «En curso» y agrégala arriba en «Hecho recientemente» con
  `AAAA-MM-DD · Nombre (`commit`) — IA. Pendiente: …`. Si quedó algo pendiente, créalo como tarea nueva en «Siguiente».
- Commit en español, con un título corto y viñetas de lo que cambió:
  ```bash
  git add -A
  git commit -m "<Título>" -m "- <qué cambió>
  - <prueba y suite: N archivos, M comprobaciones>"
  git push -u origin ia/<herramienta>/<tarea>
  ```
  Termina el mensaje con la línea de coautoría de tu herramienta; si no agrega ninguna, `IA: <herramienta>`.

## 5. A `main` (solo si el usuario lo pide o la rama ya fue revisada)

```bash
git checkout main && git pull --ff-only
git merge --no-ff ia/<herramienta>/<tarea>
cd pruebas && node todas.js      # otra vez, ya combinada
git push origin main
```

GitHub Pages publica `main` sola en unos minutos. Dile al usuario qué se publicó y el resultado de la suite.

## 6. Notion

Si eres Claude con Notion conectado, sigue `sincronizar-notion`. Si no, no hagas nada: lo que hiciste ya está en
`docs/ESTADO.md` y Claude o el usuario lo pasan a Notion.
