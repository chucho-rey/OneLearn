---
name: retomar
description: Empezar una sesión de trabajo en OneBook con cualquier IA. Lee AGENTS.md y docs/ESTADO.md, resume el estado, elige la siguiente tarea libre, la anota «En curso» y crea su rama. Úsalo al empezar, cuando el usuario diga «retoma», «continúa», «qué sigue» o «haz la T-NN».
---

# Retomar OneBook

Procedimiento para empezar a trabajar. Cualquier IA puede seguirlo leyendo este archivo.

## Pasos

1. **Ponte al día con `main`:**
   ```bash
   git fetch origin && git checkout main && git pull --ff-only
   git log --oneline -10
   ```
2. **Lee** `AGENTS.md` completo y `docs/ESTADO.md` completo. Si la tarea toca un área, lee su sección en
   `docs/arquitectura.md`.
3. **Resume al usuario** en pocas líneas: en qué está el proyecto (lo último en «Hecho»), qué está «En curso» y por quién,
   y qué tarea te toca (la que pidió, o la primera de «Siguiente» que encaje con tu herramienta según `docs/ias.md`).
4. **No tomes** una tarea «En curso» de otra IA. Si el usuario pide continuarla, lee su traspaso y sigue en su rama.
5. **Tómala:** crea la rama y anota la tarea en «En curso»:
   ```bash
   git checkout -b ia/<tu-herramienta>/<tarea-corta>
   ```
   En `docs/ESTADO.md`, mueve la tarea a «En curso» con el formato
   `- T-NN · Nombre — IA: <herramienta> · rama: ia/<herramienta>/<tarea> · desde: AAAA-MM-DD`
   y haz commit: `git commit -am "Toma la T-NN: <nombre>"`.
6. **Propón un plan corto** antes de programar (salvo que el usuario ya lo aprobó): archivos que tocarás, el número de la
   prueba nueva (`ls pruebas | sort -n | tail -3`), lo que cambia en la Ayuda y en `sw.js`, y lo que necesitas que decida
   el usuario. Espera su visto bueno.

## Antes de escribir código

- Corre las pruebas del área que vas a tocar para saber de dónde partes (`docs/pruebas.md` dice cuál cubre qué).
- Busca un patrón que ya exista y síguelo (otro bloque, otra plantilla, otra prueba) en lugar de inventar uno.
