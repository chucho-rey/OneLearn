---
name: revisar-rama
description: Revisar el trabajo de otra IA (una rama ia/…) antes de subirlo a main de OneBook, contra las reglas de AGENTS.md, y devolver una lista de problemas ordenada por gravedad, sin cambiar nada. Úsalo cuando el usuario diga «revisa la rama», «revisa lo que hizo <IA>» o antes de combinar en main.
---

# Revisar una rama

Procedimiento para revisar. Cualquier IA puede seguirlo. **No cambies nada**: el resultado es una lista para quien hizo
la rama (o para el usuario).

## 1. Trae la rama y mira el cambio completo

```bash
git fetch origin
git log --oneline main..origin/<rama>
git diff main...origin/<rama> --stat
git diff main...origin/<rama>
```

Lee también la tarea en `docs/ESTADO.md` (qué se pidió y su «listo cuando») y el traspaso si lo hay.

## 2. Revisa, en este orden

1. **Hace lo que pide la tarea** y nada más (sin cambios de pasada en otras áreas).
2. **Errores de lógica:** casos vacíos, datos viejos de respaldos, permisos (`AT.datos.acceso.puede`), datos que se
   pierden, fechas y dinero (centavos, MXN), cosas que solo funcionan con un espacio recién creado.
3. **Reglas de `AGENTS.md`:** español, scripts clásicos con `AT` (sin `import`/`export`, sin frameworks), claves
   internas sin cambiar, CSS en `rem` y con tokens, accesibilidad (ARIA, foco, `aria-disabled`, teclado).
4. **Lo que no se puede olvidar:** `sw.js` (`ARCHIVOS` y `VERSION`) si hay archivos nuevos; Ayuda generada; prueba
   nueva con su número; `docs/` y `docs/ESTADO.md` al día.
5. **La prueba** comprueba de verdad lo que dice (no solo que «no truena») e incluye celular y alto contraste si hay
   interfaz.
6. **Privacidad y seguridad:** sin datos reales, sin `innerHTML` con texto del usuario sin escapar (`AT.esc`), sin
   enlaces `javascript:`, sin llaves o secretos en el código.

## 3. Corre las pruebas

```bash
git worktree add ../revision origin/<rama>
cd ../revision/pruebas && node todas.js <números del área>     # y la suite completa si vas a aprobar
```

(En el contenedor de Claude Code, antepón `NODE_PATH=/opt/node-tools/node_modules`.) Al terminar:
`git worktree remove ../revision`.

## 4. Entrega

Una lista de problemas del más grave al menos grave. Cada uno con archivo y línea, qué pasa, cómo se reproduce y qué
sugieres. Termina con un veredicto: **lista para `main`**, **lista con cambios menores** o **necesita cambios**. Si no
encontraste nada, dilo así: no inventes problemas para llenar la lista.
