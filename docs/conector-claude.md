# Idea: OneLearn como conector de Claude

**Estado:** idea para después del MVP. Este documento explica cómo funcionaría y qué se necesita.

## La idea

Le pides a Claude un estudio o una investigación y le dices «guárdalo en OneLearn». Claude lo escribe directamente en tu cuenta de OneLearn, ya con el formato de OneLearn: secciones, callouts, tablas, preguntas de repaso y resumen. Lo abres en la web o en la app y se ve como una lección más, listo para editar, marcar y estudiar.

OneLearn sería **el estándar**: Claude no guarda «un texto»; guarda un documento de OneLearn válido.

## Cómo funcionan los conectores de Claude

Los conectores de Claude, como el de Notion, usan el **Model Context Protocol (MCP)**, un protocolo abierto para que un modelo use herramientas externas.

```
Tú ──► Claude ──(MCP, por internet)──► Servidor MCP de OneLearn ──► Tu cuenta de OneLearn
                                             │
                                             └─ crear_documento, buscar, leer_documento…
```

1. OneLearn publica un **servidor MCP** en internet (por ejemplo, `https://mcp.onelearn.mx`).
2. El servidor anuncia **herramientas**: cada una tiene un nombre, una descripción y un esquema de sus datos de entrada (JSON Schema).
3. En Claude, agregas el conector: en la configuración de conectores, «Agregar conector personalizado» y la dirección del servidor. Más adelante se puede solicitar que aparezca en el directorio de conectores de Claude, para que cualquiera lo encuentre.
4. La primera vez, Claude te manda a OneLearn a **iniciar sesión y dar permiso** (OAuth, igual que «Iniciar sesión con Google»). Así Claude actúa en tu cuenta sin conocer tu contraseña.
5. Cuando pides «guárdalo en OneLearn», Claude llama a la herramienta `crear_documento` con el contenido. El servidor lo revisa, lo guarda y responde con el enlace.

Como el conector vive en el servidor, funciona igual desde Claude en la web, la app de escritorio y el celular.

Un punto importante sobre el costo: **cuando Claude usa tu conector, el uso del modelo corre por la cuenta de Claude del estudiante**. OneLearn no paga la API de Anthropic por esto; solo paga su servidor.

## Las herramientas que tendría

| Herramienta | Qué hace |
|---|---|
| `formato_onelearn` | Devuelve la guía del formato: tipos de documento, tipos de bloque y un ejemplo. Claude la lee antes de escribir. |
| `crear_documento` | Crea un documento (libreta, notas, investigación…) con título, propiedades y contenido. |
| `actualizar_documento` | Agrega o reemplaza secciones de un documento existente. |
| `buscar` | Busca en las lecciones y en los documentos del estudiante (lo mismo que Ctrl K). |
| `leer_documento` | Lee un documento, para que Claude lo resuma, lo corrija o haga preguntas de repaso. |
| `crear_repaso` | Agrega un bloque de preguntas de repaso a un documento. |

Así Claude no solo exporta: también puede estudiar contigo sobre tus propios apuntes («hazme un examen con mis apuntes de redes»).

## El formato como estándar

La ventaja es que **OneLearn ya tiene un formato propio y documentado** (el formato de bloques del `README.md`), y el mismo código lo valida y lo dibuja. Para el conector:

- **El esquema de `crear_documento` es el formato de bloques.** Claude recibe el JSON Schema y escribe directamente `heading`, `callout`, `table`, `repaso`, `resumen`…
- **El servidor valida con las mismas reglas que la web:** tipos de bloque conocidos, ids únicos, enlaces seguros (sin `javascript:`) y tamaño máximo. Si algo no cumple, responde con un error claro («el bloque 12 es un `video`, que no existe; usa un enlace») y Claude lo corrige solo.
- **Adaptar en lugar de rechazar:** también se puede aceptar Markdown y convertirlo en bloques en el servidor. Es más fácil para el modelo, pero se pierden los bloques propios (repaso, callouts). Lo ideal es aceptar las dos cosas.
- **Cada tipo de documento con su plantilla:** una «investigación» trae resumen, introducción, método, resultados, discusión y referencias. Claude recibe la plantilla y la llena.
- **Versión del formato:** el campo `formato: 1` ya existe. Si el formato cambia, el servidor sabe convertir los documentos viejos.

## Qué se necesita

### 1. Cuentas y sincronización (lo más grande)

Hoy tus documentos viven solo en tu navegador (IndexedDB). Claude trabaja desde los servidores de Anthropic y **no puede llegar a tu navegador**. Por eso el conector necesita que los documentos también vivan en un servidor:

- Inicio de sesión (correo, Google, Apple).
- Una base de datos con los documentos de cada usuario.
- Sincronización entre la base de datos y el navegador, que también funcione sin conexión y resuelva conflictos (dos dispositivos editaron lo mismo). El formato de bloques con ids fijos ayuda mucho aquí.

Esto ya estaba previsto para la comunidad y para usar OneLearn en varios dispositivos. El conector se construye encima.

Opciones razonables: **Supabase** (Postgres, cuentas y almacenamiento; tiene plan gratuito), **Firebase**, o **Cloudflare Workers con D1**.

### 2. El servidor MCP

- Un servicio HTTPS que hable MCP (transporte HTTP). Hay SDK oficiales de MCP para TypeScript y Python; con TypeScript se puede reutilizar la validación de `bloques.js`.
- **Autorización OAuth 2.1**, que es lo que pide MCP para servidores remotos: la pantalla «Claude quiere acceder a tu OneLearn» con los permisos (crear documentos, leerlos).
- Puede vivir en el mismo lugar que las cuentas (por ejemplo, Cloudflare Workers o una función en Supabase).

### 3. Seguridad

- **Permisos mínimos:** al principio, solo crear y leer. Nada de borrar.
- **Bandeja de entrada:** lo que Claude crea llega como borrador marcado «Hecho con Claude», y tú decides si lo guardas. Así un error no sobrescribe tus apuntes.
- **Revisar todo lo que llega:** el contenido viene de un modelo, que pudo leer páginas web con instrucciones maliciosas. Por eso se valida y se dibuja sin `innerHTML`, como ya hace OneLearn.
- **Límites:** tamaño máximo por documento y número de llamadas por minuto.
- Actualizar el aviso de privacidad: qué datos pasan por el conector.

### 4. Probar y publicar

- Probarlo como conector personalizado en tu propia cuenta de Claude.
- Escribir pruebas del servidor: documentos válidos, inválidos y maliciosos.
- Si quieres que lo encuentre cualquiera, solicitar que entre al directorio de conectores de Claude. Anthropic revisa seguridad, privacidad y documentación.

Las opciones exactas (en qué planes de Claude se pueden agregar conectores personalizados, cómo se solicita el directorio) cambian con el tiempo; hay que revisar la documentación de Anthropic y de MCP (modelcontextprotocol.io) cuando llegue el momento.

## Pasos intermedios, sin servidor

Antes de tener cuentas, se puede probar la idea casi gratis:

1. **Hoy mismo:** pídele a Claude un estudio «como un respaldo de OneLearn» (un JSON con `"app": "OneLearn"`, `"formato": 1` y un documento en `documentos`). Descárgalo e impórtalo en «Tus datos». La importación ya valida el contenido y no borra nada.
2. **Una Skill de Claude** con la guía del formato de OneLearn y ejemplos de cada tipo de documento. Con ella, Claude genera siempre documentos válidos sin que expliques el formato cada vez.
3. **«Pegar desde Claude» en OneLearn:** pegar Markdown (o el JSON) en el editor y convertirlo en bloques: secciones, tablas, listas y, con algunas convenciones, callouts y preguntas de repaso.
4. **Importar un solo documento** (no solo respaldos completos), desde un archivo o arrastrándolo.

Con eso se aprende qué piden los estudiantes a Claude y qué formato necesitan, antes de invertir en el servidor.

## Orden sugerido

1. MVP (ver `docs/MVP.md`).
2. Pasos intermedios 1 a 4.
3. Cuentas y sincronización.
4. Servidor MCP con `formato_onelearn`, `crear_documento` y `buscar`, solo para tu cuenta.
5. Bandeja de entrada, permisos y pruebas de seguridad.
6. Abrirlo a más usuarios y solicitar el directorio de Claude.
