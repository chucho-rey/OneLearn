# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Las instrucciones son las mismas para todas las IA y viven en `AGENTS.md` (se incluye aquí abajo). Léelo completo, y
después `docs/ESTADO.md`.

@AGENTS.md

## Lo propio de Claude Code

- **Contenedor:** Playwright está instalado globalmente: antepón `NODE_PATH=/opt/node-tools/node_modules` a cada `node`
  (pruebas y el driver). La suite completa tarda unos 8 minutos: córrela en segundo plano, de preferencia en una copia
  (`git worktree`) para que tus cambios a medias no la afecten.
- **Skills** (`.claude/skills/`): `run-onelearn` (servir, manejar el sitio y capturas), `retomar`, `cerrar-tarea`,
  `revisar-rama` y `sincronizar-notion`. Las otras IA las leen como Markdown normal.
- **Notion:** eres la IA con Notion conectado. Notion guarda el plan, el Roadmap y las características (la vista del
  usuario); lo técnico vive en `docs/`. Al cerrar una tarea, sigue `sincronizar-notion`.
- **Ramas:** si la sesión te da una rama de trabajo propia, úsala en lugar de `ia/claude/<tarea>`; las demás reglas de
  `AGENTS.md` (suite completa antes de `main`, `docs/ESTADO.md` al día) no cambian.
