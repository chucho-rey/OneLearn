# OneLearn: qué falta para un MVP

Un MVP (producto mínimo viable) es la versión más pequeña de OneLearn que puede usar un grupo real de estudiantes y que te dice si la idea funciona. No es «la app terminada». Es lo justo para responder unas pocas preguntas con datos.

Este documento parte de lo que ya existe en el repositorio (noviembre de 2026) y propone qué falta, qué queda fuera y cómo saber si el MVP funcionó.

## 1. La idea que el MVP tiene que probar

> Un estudiante aprende mejor cómo funciona la tecnología con lecciones cortas e interactivas, y regresa porque ahí mismo guarda sus apuntes y su avance.

De ahí salen tres preguntas:

1. **¿Terminan las lecciones?** Si la gente abre una lección y la deja a la mitad, el problema es el contenido o el formato.
2. **¿Regresan?** Si nadie vuelve en una semana, falta una razón para volver (más temas, recordatorios, avance visible).
3. **¿Usan «Crear»?** Si nadie hace libretas o apuntes, quizá esa parte no es necesaria para el MVP, o no se entiende.

Todo lo que no ayude a contestar esto puede esperar.

## 2. Lo que ya está listo

| Área | Estado |
|---|---|
| Lecciones interactivas | 25 de tecnología, en siete grupos (Hardware, Electrónica, Software, Linux, Redes, Ciberseguridad e Inteligencia artificial), cada una con laboratorios, repaso y resumen |
| Rutas de aprendizaje | «Redes y sistemas», de básico a intermedio en 7 módulos, completa: 27 lecciones y 2 proyectos, con una terminal simulada (red, SSH, firewall, nginx, docker) y ejercicios que se califican solos |
| Lectura | Temas claro y oscuro, alto contraste, 5 tamaños de letra, fuentes para dislexia, modo zen, atajos de teclado |
| Avance | Secciones leídas, «Continúa donde te quedaste», resultado del repaso |
| Apuntes | Nota rápida en cada lección; libretas, notas y apuntes de clase con el editor de bloques |
| Marcadores, citas y búsqueda | Marcadores en cualquier bloque, citas con «@» y búsqueda con Ctrl K, incluso sin conexión |
| Tus datos | Todo en el navegador (IndexedDB), con respaldo e importación, espacio usado y disponible |
| App | Instalable (PWA) y funciona sin conexión |
| Calidad | 16 archivos de pruebas automáticas, más de 1,800 comprobaciones (contraste, desbordes, funciones) |
| Costo | 0: GitHub Pages, sin servidor |

La base técnica es sólida. **Lo que más falta es contenido, saber qué pasa con los usuarios y algunos requisitos legales.**

## 3. Lo que falta para el MVP

Ordenado por importancia. Lo marcado como **Necesario** bloquea el lanzamiento; lo marcado como **Recomendado** se puede hacer en paralelo o justo después.

### 3.1 Contenido: un recorrido completo · Hecho

Las lecciones del temario original y las de la ruta «Redes y sistemas» están publicadas. Lo que falta aquí es **revisarlas con personas**: que alguien que sepa de cada tema (un profesor, un estudiante avanzado) lea al menos las de su área y confirme que no hay errores ni explicaciones confusas.

- Cada lección nueva sigue los pasos del `README.md` («Cómo agregar una lección») y trae sus comprobaciones.
- Las **rutas** ya existen (`rutas.html`): la primera, «Redes y sistemas», está completa. Otra ruta útil sería «Empieza aquí si estudias programación».

### 3.2 «Cómo funciona OneLearn» (hito 7) · Hecho

Es el primer tema del temario, en el grupo «OneLearn», y la bienvenida de Inicio lo sugiere. Explica lecciones, Lectura, atajos, apuntes, marcadores, «Crear», búsqueda, proyectos, dónde se guardan los datos e instalar la app. Sus cuatro laboratorios usan los controles reales: ajustar la lectura, probar los atajos, ver tus datos de este navegador e instalar la app.

### 3.3 Saber qué pasa: medición · Necesario

Hoy OneLearn no mide nada. Sin datos, el MVP no puede contestar las preguntas de la sección 1.

- Una herramienta de analítica **respetuosa con la privacidad**, sin cookies ni datos personales. Opciones: GoatCounter (gratis para proyectos pequeños), Plausible o Umami (de pago o en tu propio servidor), o Cloudflare Web Analytics (gratis).
- Medir solo eventos del producto, nunca el contenido: «abrió lección», «terminó lección», «terminó repaso», «creó documento», «descargó respaldo», «instaló la app».
- Avisarlo con claridad en el aviso de privacidad y en «Tus datos».

### 3.4 Una forma de escuchar a los usuarios · Necesario

Un botón «Enviar comentarios» en la barra lateral (un formulario de Google o Tally sirve al principio) y, mejor aún, hablar con 5 a 10 estudiantes que lo usen una semana.

### 3.5 Aviso de privacidad y términos · Necesario

Aunque los datos no salgan del dispositivo, en México la ley de protección de datos personales pide un aviso de privacidad en cuanto se recaba cualquier dato, y la analítica y el formulario de comentarios ya lo hacen.

- **Aviso de privacidad:** qué se mide, qué no, dónde viven los apuntes y cómo borrarlos.
- **Términos de uso** sencillos.
- **Créditos y licencias:** Tiptap (MIT) y las fuentes (SIL OFL) ya están; falta decidir la licencia del contenido de las lecciones.

### 3.6 Probar en dispositivos reales · Necesario

Las pruebas automáticas usan Chromium. Falta probar a mano en:

- iPhone con Safari: instalación, modo sin conexión, el editor con el teclado del celular, y que Safari no borre los datos (Safari borra el almacenamiento de los sitios que no visitas en 7 días, salvo si la app está instalada).
- Android con Chrome.
- Firefox de escritorio.
- Un lector de pantalla (VoiceOver o NVDA) en una lección completa.

### 3.7 Proteger los datos del estudiante · Hecho

- Inicio recuerda descargar un respaldo si hay documentos o notas y el último respaldo tiene 14 días o más (o nunca se hizo). Se puede posponer una semana.
- El almacenamiento persistente se pide al crear un documento, además de desde «Tus datos» y desde la lección «Cómo funciona OneLearn».

### 3.8 Imágenes en los documentos · Recomendado

Es la función que más se va a extrañar al estudiar (diagramas, fotos del pizarrón). Es el hito 3.1 del plan. Si el MVP quiere medir el uso de «Crear», conviene tenerla.

### 3.9 Imprimir o guardar como PDF · Recomendado

El hito 3.2 del plan. Es pequeño y permite entregar trabajos hechos en OneLearn.

### 3.10 Dominio propio · Recomendado

`chucho-rey.github.io/OneLearn` funciona, pero un dominio propio (por ejemplo, `onelearn.mx`) da confianza y es necesario más adelante para las cuentas y el conector con Claude. Cuesta unos cientos de pesos al año y GitHub Pages lo admite gratis.

### 3.11 Errores en producción · Recomendado

Un registro de errores de JavaScript (Sentry tiene un plan gratuito) para enterarse cuando algo falla en el celular de alguien.

## 4. Lo que queda fuera del MVP

Estas ideas son buenas, pero no ayudan a contestar las preguntas de la sección 1 y algunas cuestan mucho:

- **Cuentas y sincronización entre dispositivos.** Requieren un servidor y una base de datos, con su costo y su responsabilidad legal. El respaldo en JSON cubre el MVP. Si las entrevistas dicen que es lo que más falta, son lo primero después del MVP.
- **Comunidad** (publicar temas, explorar los de otros). Depende de las cuentas y necesita moderación.
- **Libro, investigación, tesis, EPUB y DOCX** (fase 3, hitos 3.3 a 3.5).
- **Historial de versiones** (hito 3.6).
- **Conector con Claude** (ver `docs/conector-claude.md`). Depende de las cuentas.
- **Apps nativas en las tiendas.** La PWA ya se instala; una app de tienda tiene sentido cuando haya usuarios que la pidan.

## 5. Cómo saber si funcionó

Antes de lanzar, conviene fijar metas. Unas razonables para un primer grupo de 30 a 100 estudiantes, durante 4 semanas:

| Pregunta | Métrica | Meta |
|---|---|---|
| ¿Terminan las lecciones? | De quienes abren una lección, cuántos llegan al final | 40 % o más |
| ¿Aprenden? | Resultado promedio del repaso | 70 % o más |
| ¿Regresan? | Quienes vuelven al menos una vez en los 7 días siguientes | 25 % o más |
| ¿Usan «Crear»? | Quienes crean al menos un documento | 20 % o más |
| ¿Lo recomiendan? | Pregunta en el formulario: «¿Qué tan probable es que lo recomiendes?» (0 a 10) | Mayoría de 9 y 10 |

Si una meta no se cumple, la tabla te dice dónde mirar: el contenido, las razones para volver o «Crear».

## 6. Orden sugerido

1. Aviso de privacidad, analítica y botón de comentarios (unos días).
2. ~~Hito 7: «Cómo funciona OneLearn»~~ (hecho).
3. Revisión del contenido con personas que conozcan cada tema.
4. ~~Recordatorio de respaldo y almacenamiento persistente~~ (hecho).
5. Pruebas en dispositivos reales.
6. Lanzamiento con un grupo pequeño (un salón, un club de programación, un servidor de Discord).
7. En paralelo, si da tiempo: imágenes y PDF.

## 7. Costos del MVP

| Concepto | Costo |
|---|---|
| Publicación (GitHub Pages) | Gratis |
| Analítica (GoatCounter o Cloudflare) | Gratis |
| Comentarios (Google Forms o Tally) | Gratis |
| Registro de errores (Sentry, plan gratuito) | Gratis |
| Dominio propio | Unos cientos de pesos al año |

El MVP sigue sin servidor. El primer costo real llega con las cuentas y la sincronización.
