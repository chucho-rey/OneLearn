# Trabajar OneBook con varias IA

Guía para el usuario y para las IA (Claude Opus, ChatGPT Astra, GLM 5.4 o la que siga). Las reglas técnicas están en
`AGENTS.md`; aquí está **cómo repartir el trabajo, cómo pasarlo de una IA a otra y qué pedirles**.

## Cómo encuentra cada IA las instrucciones

- **Todas** deben leer `AGENTS.md` (la puerta de entrada) y `docs/ESTADO.md` (qué sigue). Muchas herramientas de agentes
  leen `AGENTS.md` solas al abrir el repositorio; si la tuya no, empieza cada conversación con el comando **«Retoma
  OneBook»** (abajo).
- **Claude Code** lee `CLAUDE.md` (que incluye `AGENTS.md`) y carga los procedimientos de `.claude/skills/` como skills:
  puedes pedirlos por nombre (`/retomar`, `/cerrar-tarea`, `/revisar-rama`, `/sincronizar-notion`, `run-onelearn`).
- **ChatGPT, GLM y otras**: los procedimientos de `.claude/skills/*/SKILL.md` son Markdown normal. Pídeles «sigue el
  procedimiento `.claude/skills/cerrar-tarea/SKILL.md`» y lo leen como instrucciones.
- Cada IA necesita su propio acceso al repositorio de GitHub para hacer push. Ninguna necesita Notion para programar.

## Cuándo usar cada una

Son puntos de partida: ajústalos con lo que veas. Para calibrar, dale a las tres la misma tarea chica (por ejemplo la T-06
de `docs/ESTADO.md`) y compara el resultado, el tiempo y el costo.

| Tipo de trabajo | Úsala | Por qué |
|---|---|---|
| Planear una etapa grande o una decisión de producto (F9, precios, qué va primero) | Claude Opus para el plan; ChatGPT Astra como segunda opinión | Planear bien ahorra rehacer; una segunda IA encuentra huecos que la primera no ve |
| Funciones nuevas que tocan muchos archivos (un área nueva, la nube, sincronización) | Claude Opus | Conoce a fondo la arquitectura (la escribió) y sostiene cambios largos con sus pruebas |
| Investigar afuera: leyes (LFPDPPP), cifras del SAT o IMSS del año, comparar servicios (Supabase, analítica, formularios) | ChatGPT Astra (si tiene búsqueda web) | Investigación y resumen de fuentes; luego otra IA lo programa |
| Tareas acotadas que siguen un patrón que ya existe: una plantilla nueva, un bloque parecido a otro, textos y Ayuda, pruebas que faltan, un fallo con pasos claros | GLM 5.4 | Trabajo bien delimitado y más barato; la regla de las pruebas atrapa los errores |
| Revisar una rama antes de subirla a `main` | **Una IA distinta** de la que la hizo | Ojos nuevos; nadie revisa su propio trabajo |
| Diseño visual y accesibilidad (contraste, foco, celular) | Claude Opus | Tiene el procedimiento para capturar pantallas y revisarlas |
| Pruebas que fallan a veces (intermitentes) o fallos difíciles | Claude Opus o ChatGPT Astra | Requieren leer mucho código y correr varias veces |
| Actualizar Notion (Roadmap, Características, plan) | Claude Opus | Es la que tiene Notion conectado; las demás dejan lo necesario en `docs/ESTADO.md` |
| Textos para el usuario final (Ayuda, bienvenida, avisos) | Cualquiera; revisa tú el tono | El tono es del producto: español de México, frases cortas, verbos claros |

Reglas de oro: **una tarea, una IA, una rama**; **nadie sube a `main` sin la suite completa pasando**; **lo que una decide
y otra necesita saber va a `docs/`**, no se queda en el chat.

## Cómo pasar el trabajo de una IA a otra

1. La IA que termina (o se queda sin contexto) deja un **traspaso** en `docs/ESTADO.md`, debajo de su tarea «En curso»:
   qué hizo, qué falta, decisiones tomadas, trampas encontradas y cómo correr lo que hizo. Hace commit y push de su rama.
2. La IA que sigue recibe el comando **«Continúa la T-NN»** (abajo): lee `AGENTS.md`, `docs/ESTADO.md` y el traspaso, hace
   `git fetch` y se cambia a esa rama.
3. Al terminar, cambia en «En curso» la herramienta que la tiene. Nunca dos IA en la misma rama a la vez.

## Comandos para copiar y pegar (sirven en cualquier IA)

Pégalos tal cual; cambia lo que está entre `<…>`.

**Retoma OneBook** (para empezar cualquier conversación)
> Lee `AGENTS.md` y `docs/ESTADO.md` del repositorio OneBook. Dime en pocas líneas en qué está el proyecto, qué está en
> curso y qué tarea te conviene tomar según `docs/ias.md`. No cambies nada todavía.

**Haz la T-NN** (con plan primero)
> Toma la tarea T-NN de `docs/ESTADO.md` siguiendo `AGENTS.md`: anótala «En curso» con tu nombre, crea la rama
> `ia/<tu-herramienta>/<tarea>` y propón un plan corto (archivos que tocarás, prueba nueva, riesgos). Espera mi visto
> bueno antes de programar.

**Hazla completa** (cuando ya aprobaste el plan)
> Adelante con el plan. Al terminar sigue «Al terminar una tarea» de `AGENTS.md` (o el procedimiento
> `.claude/skills/cerrar-tarea/SKILL.md`) y dime el resultado de la suite completa.

**Continúa la T-NN** (traspaso desde otra IA)
> Continúa la tarea T-NN que dejó otra IA: lee `AGENTS.md`, `docs/ESTADO.md` (su traspaso) y cámbiate a la rama
> `<rama>`. Dime qué entendiste que falta antes de cambiar algo.

**Revisa la rama** (antes de subir a `main`)
> Sigue `.claude/skills/revisar-rama/SKILL.md` para revisar la rama `<rama>` contra `main`. Dame la lista de problemas,
> del más grave al menos grave. No cambies nada.

**Corrige lo de la revisión**
> Corrige estos puntos de la revisión en tu rama: <pega la lista>. Corre las pruebas que tocan y la suite completa.

**Súbelo a main**
> La rama `<rama>` ya está revisada y corregida. Con la suite completa pasando, combínala en `main` (`git merge --no-ff`),
> sube `main` y mueve la tarea a «Hecho» en `docs/ESTADO.md` con la fecha y el commit.

**Corre las pruebas**
> Corre las pruebas `<números>` (o la suite completa) y dime qué falló y por qué. No cambies nada.

**Explícame**
> Explícame cómo funciona <área> en OneBook: archivos, funciones y datos que intervienen, con base en `docs/` y el código.
> No cambies nada.

**Encontré un fallo**
> Anota en `docs/ESTADO.md` › «Encontrado»: <qué pasa, dónde y cómo reproducirlo>. Si lo entiendes, propón la tarea
> (T-NN siguiente) con su «listo cuando».

**Captura de pantalla**
> Abre <página> en celular (390×844) y en escritorio (1280×900), en claro y oscuro, siguiendo
> `.claude/skills/run-onelearn/SKILL.md`, y mándame las capturas con lo que veas mal.

**Deja el traspaso** (cuando una IA se queda sin contexto o cambias de IA)
> Vamos a pasar esta tarea a otra IA. Deja el traspaso en `docs/ESTADO.md` (qué hiciste, qué falta, decisiones,
> trampas y cómo probarlo), haz commit y sube tu rama.

**Sincroniza Notion** (solo Claude)
> Sigue `/sincronizar-notion`: pasa a Notion (Roadmap y Características) lo que está en `docs/ESTADO.md` › «Hecho» desde
> la última sincronización.

## Procedimientos (skills) en `.claude/skills/`

| Procedimiento | Para qué |
|---|---|
| `run-onelearn` | Servir el sitio, abrir páginas, hacer clic, escribir y tomar capturas; correr las pruebas |
| `retomar` | Empezar una sesión: leer el estado, elegir tarea, anotarla y crear la rama |
| `cerrar-tarea` | Terminar: suite completa, sw.js, Ayuda, docs, ESTADO.md, commit y push |
| `revisar-rama` | Revisar el trabajo de otra IA contra las reglas, con la lista de problemas |
| `sincronizar-notion` | Solo Claude: pasar lo hecho a Notion (Roadmap y Características) |

## Si algo sale mal

- **Dos IA tocaron lo mismo:** la segunda en subir resuelve el conflicto en su rama (`git merge main`), corre la suite y
  avisa en «Encontrado» si algo no cuadra.
- **`main` quedó rota:** lo primero es `git revert` del commit que la rompió (no reescribir la historia) y anotarlo; luego
  se corrige en una rama.
- **Una IA cambió una regla de `AGENTS.md` sin preguntar:** revierte ese cambio; las reglas las cambia el usuario.
- **Una IA inventó un dato** (precio, texto legal, cifra fiscal, enlace): no se sube; pídele la fuente o decide tú.
