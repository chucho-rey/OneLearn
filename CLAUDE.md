# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

OneBook (antes OneLearn): sitio estático en español (es-MX) para **empresas** (bloques y plantillas: ventas, cobros, inventario, gastos, recursos humanos, salas por departamento e Inicio armable), publicado con GitHub Pages en `https://chucho-rey.github.io/OneLearn/` desde la rama `main`. Todo se guarda solo en el navegador.

**La documentación vive en Notion, no en el repositorio.** Antes de cambiar el código, lee en Notion la página «OneBook» → «Documentación técnica» → «Arquitectura y convenciones» (y, si hace falta, «Estructura y funciones» y «Pruebas automáticas»). El plan está en «OneBook: plan para pivotear» y las tareas en la base «Roadmap» (área OneBook). Al terminar algo, actualiza su fila del Roadmap y la página de Notion que corresponda. No agregues documentación al repositorio: solo este archivo y el `README.md` corto.

## Reglas indispensables

- Todo en español: interfaz, comentarios del código y mensajes de commit.
- Local primero, solo MXN, una empresa por espacio. Lo académico de OneLearn salió por completo; no lo vuelvas a agregar.
- Scripts clásicos con un espacio global `window.AT`, sin módulos ES ni bundler (debe funcionar con `file://`); el orden de los `<script>` de cada página importa.
- Las claves internas conservan el nombre viejo a propósito (prefijo `aprende-tecnologia:`, base IndexedDB `onelearn`, cachés `onelearn-`): cambiarlas borraría los datos de quien ya usa la app.
- **Nada se pierde:** el editor envuelve todo nodo que no conoce en `legado`/`legadoLinea` y lo devuelve idéntico al guardar.
- CSS: tamaños en `rem` y colores solo con los tokens de `assets/css/base.css` (cuatro variantes). Accesibilidad: ARIA, foco explícito, `aria-disabled` en lugar de `disabled`.
- **Al agregar o quitar un archivo del sitio**, actualiza `ARCHIVOS` en `sw.js` y sube `VERSION`.
- **Al agregar una función visible**, agrega o actualiza su sección de la Ayuda en `herramientas/ayuda/generar.py` y corre `python3 herramientas/ayuda/generar.py`.
- Cada hito trae su archivo de pruebas `pruebas/N-nombre.js` (con `lib.js`); a `main` solo se sube con la suite completa pasando.

## Comandos

```
cd pruebas
NODE_PATH=/opt/node-tools/node_modules node todas.js          # todas (unos 8 minutos; en segundo plano)
NODE_PATH=/opt/node-tools/node_modules node todas.js 3 24     # solo 3-*.js y 24-*.js
```

En el contenedor de Claude Code, Playwright está instalado globalmente (de ahí `NODE_PATH`). Para correr y manejar el sitio (servirlo, abrir páginas, capturas): skill `run-onelearn` (`.claude/skills/run-onelearn/`).
