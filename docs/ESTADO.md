# Estado del trabajo

El tablero que comparten todas las IA. **Léelo antes de empezar y actualízalo al tomar y al terminar una tarea** (en tu
rama, en el mismo commit que el trabajo). El Roadmap de Notion es la vista del usuario; este archivo manda para el trabajo
diario.

Reglas: una tarea «En curso» es de quien la tomó, no la toques; si llevas más de un día sin avanzarla, devuélvela a «Siguiente».
Cada tarea tiene un número (`T-NN`) para pedirla por nombre: «Haz la T-03».

## En curso

_(nada por ahora)_

Formato para tomar una: `- T-NN · Nombre — IA: <herramienta> · rama: ia/<herramienta>/<tarea> · desde: AAAA-MM-DD`

## Siguiente (en orden)

### T-01 · Aviso de privacidad y términos de uso — prioridad alta, tamaño S
Páginas `privacidad.html` y `terminos.html` para empresas: qué datos se guardan y dónde (hoy, solo en el navegador), qué
se mide, cómo borrar todo (Tus datos › Eliminar todos los datos) y qué cambia con la nube (F9). Enlazadas desde «Tus
datos», la bienvenida y la Ayuda. **El texto legal lo aprueba el usuario** (no inventes datos de la empresa: razón social,
domicilio o correo de contacto se le piden).
Listo cuando: las páginas están publicadas, enlazadas y con su prueba.

### T-02 · Analítica respetuosa con la privacidad — alta, S
Sin cookies (GoatCounter, Plausible o Cloudflare; **el servicio lo elige el usuario**). Solo eventos: abrió la empresa de
ejemplo, creó su empresa, creó una página (por tipo), agregó una persona, descargó un respaldo, instaló la app. Debe
funcionar sin conexión sin errores y respetar «Do Not Track». Depende de T-01 (el aviso dice qué se mide).
Listo cuando: se ven los eventos en el panel del servicio.

### T-03 · Botón «Enviar comentarios» — alta, S
En la barra lateral (pie) y en la Ayuda: abre un formulario externo (Tally o Google Forms; **el enlace lo da el usuario**)
con la página y la versión (`VERSION` de sw.js) como campos ocultos. Las entrevistas con 5 a 10 pymes las hace el usuario.
Listo cuando: el botón abre el formulario con esos datos y tiene su prueba.

### T-04 · Probar en dispositivos reales — alta, M
iPhone con Safari (instalar, sin conexión, editor, que no borre datos), Android, Firefox y un lector de pantalla; varias
personas en la misma computadora con «Cambiar de persona»; pedidos al Cedis entre dos celulares. Lo hace el usuario; las
IA corrigen la lista de fallos (cada fallo, una tarea en «Encontrado»).

### T-05 · Pendientes de F8 (pedidos al Cedis) — media, S
Indicadores del Cedis en «Mi negocio» (pedidos del día: 2 de 3, cuántos faltan, renglones con faltante) y, si existe el
inventario, registrar la salida al «Marcar surtido». Ver `docs/arquitectura.md` › Pedidos al Cedis.

### T-06 · Detalles pendientes de la interfaz — baja, S
Las ventas de la empresa de ejemplo (~$56 mil) no coinciden con el dibujo de la portada ($186,420): que coincidan. (El
selector de ubicación del explorador en el celular ya se resolvió con la vista de archivos.)

### T-07 · F9 · Cuentas y nube (de pago) — media, L (grande: planearlo antes con el usuario)
Servidor (Supabase sugerido): entrar con correo y código, Google opcional, sincronización entre dispositivos, subir el
espacio local, aviso de privacidad (LFPDPPP) y cobro del plan Nube ($99 MXN al mes o $990 al año, sugerido).
Organizaciones para cadenas: el Cedis con sus sucursales y permisos revisados en el servidor (etapa B de los pedidos).
Sin empleados por ahora (decidido el 23 de noviembre de 2026). Local, gratis siempre. **Antes de programar: un plan por
etapas aprobado por el usuario** (proveedor, costos, qué se sincroniza primero, migración de datos locales).
Listo cuando: una persona usa su negocio en varios dispositivos y paga la nube.

### Después (ideas, sin orden)
- Piloto con dos o tres empresas durante 4 semanas (lo organiza el usuario).
- Dominio propio y registro de errores (Sentry gratuito).
- Herramientas pendientes de la tienda: cotización que se vuelve nota de venta, tanda, datos para cobrar (CLABE y QR),
  recordatorio por WhatsApp, costo de receta y punto de equilibrio.
- IA para tus datos (preguntas en lenguaje normal, resúmenes, capturar tickets desde una foto) y conector MCP: dependen de F9.

## Encontrado (problemas vistos de pasada)

_(nada por ahora)_ Formato: `- AAAA-MM-DD · qué pasa, dónde y cómo reproducirlo — visto por <IA>`

## Hecho recientemente

- 2026-11-26 · F8 · Pedidos al Cedis, etapa A sin servidor (`a69d14d`) — Claude. Pendiente: T-05.
- 2026-11-26 · Vista de archivos en el celular (`6f66a7a`) — Claude.
- 2026-11-26 · Caja chica, número consecutivo, saldo acumulado y «Eliminar todos los datos» (`13a7cbb`) — Claude.
- 2026-11-26 · Historial de las filas de las bases de datos (`7ba1e7e`) — Claude.
- 2026-11-26 · Quita lo académico por completo (`92bac18`) — Claude.
- 2026-11-27 · Documentación para varias IA: `AGENTS.md`, `docs/` y procedimientos en `.claude/skills/` — Claude.

## Decisiones vigentes (no las cambies sin preguntar)

- Local primero y gratis siempre; la nube (F9) será de pago. Solo MXN. Una empresa por espacio.
- Sin empleados con cuentas propias por ahora (plan Equipo, roles en el servidor y cuentas para clientes, después).
- Lo académico (lecciones, tesis) no vuelve a OneBook.
- Pedidos al Cedis: etapa A sin servidor con enlaces firmados; la etapa B (envío automático) va con F9.
- Sin frameworks ni bundler: scripts clásicos con `window.AT`.
