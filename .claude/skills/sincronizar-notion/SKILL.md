---
name: sincronizar-notion
description: Solo para Claude con Notion conectado. Pasa a Notion (base Roadmap y página «Características de la web» de OneBook) lo que docs/ESTADO.md marca como hecho o nuevo desde la última sincronización. Úsalo cuando el usuario diga «sincroniza Notion» o al cerrar una tarea grande.
---

# Sincronizar Notion

Notion es la vista del usuario (plan, Roadmap y características). La fuente técnica es el repositorio (`docs/`); este
procedimiento solo lleva el estado y las características a Notion. No copies documentación técnica a Notion.

## Dónde está

- Página «OneBook» (portada): id `41c934fcd3238122b7ecc3e983da7005`.
- Base «Roadmap»: fuente de datos `collection://41c934fc-d323-81d4-b40b-000b3b274e58` (columnas: Nombre, Estado
  Idea|Pendiente|Sigue|En curso|Hecho, Área OneBook, Prioridad, Tamaño S|M|L, Orden, Descripción, Listo cuando).
- «Características de la web»: id `41c934fcd3238183b5e9d794a1c6c02e`.
- «Documentación técnica»: id `424934fcd32381f38fbec696370ada8d` (sus páginas solo apuntan al repositorio).

## Pasos

1. Lee `docs/ESTADO.md` («Hecho recientemente», «En curso» y «Siguiente»).
2. Busca en el Roadmap (área OneBook) las filas que correspondan. Para cada tarea hecha: Estado → Hecho y, al principio
   de su página, una sección «Hecho (fecha, commit)» con 3 a 6 viñetas (qué se hizo, cambios contra el plan y lo
   pendiente). Una tarea nueva de `docs/ESTADO.md` que no esté en el Roadmap se crea con su descripción y «listo cuando».
   La que está «En curso» en el repositorio queda «En curso» en Notion.
3. Si cambió lo que el sitio hace, actualiza «Características de la web» (y el conteo de pruebas de su última sección).
4. En Notion no uses `<` ni `>` dentro del texto (se leen como etiquetas); usa comillas «».
5. Al terminar, agrega en `docs/ESTADO.md`, al final de «Hecho recientemente», la línea
   `AAAA-MM-DD · Notion sincronizado hasta <commit> — Claude`.
