# Fase de tesis

Una tesis es el documento más largo y más vigilado que escribe un estudiante. OneLearn ya tiene el editor, el formato de bloques y el guardado en el dispositivo; esta fase agrega lo que una tesis necesita y que hoy un estudiante junta de cinco programas distintos. El eje es la **autoría**: que el estudiante pueda demostrar que el trabajo es suyo, y que dé el crédito correcto a cada idea ajena.

## 1. Qué usa hoy un estudiante para hacer su tesis

| Necesidad | Herramientas comunes | Qué hace OneLearn |
|---|---|---|
| Escribir textos largos con estructura | Word, Google Docs, LaTeX (Overleaf) | Editor de bloques con plantilla de tesis, índice automático y capítulos (T1) |
| Guardar y ordenar fuentes | Zotero, Mendeley, EndNote | Fuentes del documento: a mano, por DOI o ISBN, o importadas de Zotero y Mendeley en BibTeX o RIS (T2) |
| Citar y armar la bibliografía | El complemento de Zotero en Word, el gestor de citas de Word | Citas en el texto y bibliografía automática en APA 7, en español (T2); IEEE, Vancouver y Chicago después (T4) |
| Notas al pie, figuras, tablas y ecuaciones numeradas | Word, LaTeX | T3 |
| Índices de figuras y tablas, referencias cruzadas | Word, LaTeX | T3 |
| Formato de entrega: márgenes, interlineado, portada, numeración | Plantillas de cada facultad en Word o LaTeX | Exportar a PDF y DOCX con plantillas (T4) |
| Demostrar que el texto es propio | Historial de Google Docs, Grammarly Authorship, GPTZero Writing Report | Registro de autoría desde el primer día (T1) y constancia con historial y huella (T5) |
| Declarar el uso de IA | Políticas de cada universidad; guía de APA | Bloque «Declaración de autoría» y cita de IA en APA 7 (T1 y T2) |
| Revisar con el asesor | Comentarios de Word o Google Docs, correo | Paquete de revisión y comentarios (T6) |
| Detectar plagio | Turnitin, iThenticate (los usa la universidad) | Fuera de alcance: OneLearn ayuda a no cometerlo (citas y origen de lo pegado), no a juzgar textos ajenos |

## 2. La autoría, en el centro

Los detectores de IA analizan el texto terminado y fallan seguido. La alternativa que se está imponiendo es mostrar **el proceso de escritura**: cuándo se escribió cada parte, qué se tecleó y qué se pegó, y de dónde vino lo pegado. Así funcionan Grammarly Authorship y el reporte de GPTZero, que reconstruyen el historial de Google Docs ([Grammarly Authorship](https://www.grammarly.com/authorship), [GPTZero: herramientas de reproducción de escritura](https://gptzero.me/news/best-writing-replay-tools/)). Una prueba independiente concluyó que las estadísticas y la reproducción del proceso sirven mucho más que los porcentajes de «IA» ([Plagiarism Today](https://www.plagiarismtoday.com/2025/11/06/how-grammarly-launders-ai-generated-content/amp/)).

OneLearn lo hace de forma más simple y privada, porque el documento vive en el dispositivo del estudiante:

1. **Registro de sesiones.** Cada vez que escribes, se anota la sesión: cuándo empezó y terminó, cuánto tecleaste, cuánto borraste y cuánto pegaste. Solo números, nunca las teclas.
2. **Origen de lo pegado.** Al pegar un texto largo, OneLearn pregunta de dónde viene: de ti (otro borrador tuyo), de una fuente (y la cita en ese momento) o de una IA (y te recuerda declararlo). Se puede contestar después.
3. **Declaración de autoría y de uso de IA.** Un bloque de la tesis donde declaras que el trabajo es tuyo y, si usaste IA, qué herramienta y para qué. Al leer, se ve como una declaración formal con tu nombre.
4. **Constancia de autoría.** Un archivo que resume el registro (tiempo, sesiones, porcentaje tecleado y pegado, orígenes, declaración) con la huella SHA-256 del texto: si alguien cambia el texto, la huella ya no coincide.
5. **Dar crédito a otros.** Citar bien también es autoría: cada cita apunta a una fuente y la bibliografía se arma sola, sin olvidos. Lo mismo con las imágenes: cada figura tiene una nota de origen («Elaboración propia» o de dónde viene); «Autoría» avisa de las que no la tienen, la constancia las lista y su huella cubre también las imágenes.

Límites que hay que decir claro: el registro demuestra cómo se escribió *dentro de OneLearn*; no ve lo que pasa en otra ventana o en otro dispositivo, y el estudiante puede no compartirlo. Es evidencia a favor del estudiante, no un detector. Todo se guarda solo en su dispositivo y entra en el respaldo.

## 3. Citas y fuentes: decisiones

- **Estilo inicial: APA 7 en español.** Es el más pedido en las universidades de México y Latinoamérica para ciencias sociales, salud y educación. En español se usa «y» en lugar de «&», «s. f.» sin fecha, «p.» y «pp.» y «Ed.»/«Eds.».
- **Citar IA en APA.** APA actualizó en 2025 el formato para citar conversaciones con IA generativa: la empresa como autor, la fecha, el título del chat en cursiva con la descripción entre corchetes, la herramienta y el enlace compartido ([guía de APA Style, vía VU Library](https://libraryguides.vu.edu.au/apa-referencing/generativeAI), [Western Technical College](https://westerntc.libguides.com/APA7/ChatGPT)). OneLearn trae el tipo de fuente «Conversación con IA» con ese formato.
- **Formateador propio en lugar de citeproc-js.** Los procesadores CSL completos (citeproc-js, usado por Zotero) manejan miles de estilos, pero pesan cientos de KB y sus licencias y estilos tienen condiciones de redistribución ([CSL](https://citationstyles.org/developers/)). Para APA 7 basta un formateador pequeño y probado; si después hacen falta muchos estilos, se evalúa citeproc-js.
- **Buscar por DOI e ISBN.** La API REST de Crossref es pública y gratuita, sin llave ([Crossref](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)); Open Library da los datos de libros por ISBN. Si no hay conexión, se escriben los datos a mano.
- **Importar de Zotero y Mendeley.** Los dos exportan BibTeX y RIS; OneLearn los lee pegando el texto o eligiendo el archivo.

## 4. Formato de entrega

No hay un formato único: cada universidad, y en la UNAM cada facultad, fija el suyo. Lo más común es márgenes de 2.5 a 3 cm (a veces 4 cm a la izquierda para encuadernar), letra de 12 puntos e interlineado de 1.5, portada con institución, título, grado, sustentante, asesor, lugar y año, y después agradecimientos opcionales, índices, capítulos, referencias y anexos ([instructivo de tesis de la DGB, UNAM](https://siicana.dgb.unam.mx/doc/2_INSTRUCTIVO_NIVEL_LICENCIATURA_CON_TESIS.pdf), [lineamientos de la UNAM para textos](https://www.resilienciasismica.unam.mx/docs/SAMC2025_LineamientosTextos_20250113.pdf)). Por eso las plantillas de T4 serán ajustes (márgenes, letra, interlineado, numeración) sobre la misma tesis, empezando por una genérica en APA y agregando las de universidades conforme se pidan.

Para exportar: PDF con CSS de impresión (Paged.js, licencia MIT, agrega números de página, encabezados y notas al pie; [Paged.js](https://pagedjs.org/documentation/)) y DOCX con la librería `docx` (MIT, funciona en el navegador y maneja estilos, numeración y notas al pie). Para la constancia, OpenTimestamps permite sellar en el tiempo la huella del documento sin registrarse y sin enviar el texto, solo su huella ([OpenTimestamps](https://opentimestamps.org/)).

## 5. Proteger la tesis

Una tesis es meses de trabajo y en OneLearn vive en un solo navegador. Antes de exportarla hace falta que no se pierda:

- **«Respaldo» en la barra de la tesis**: dice cuándo fue la última copia fuera del navegador (respaldo de «Tus datos», copia descargada o copia automática) y se marca si no hay copias o la última tiene más de 7 días.
- **Copia automática en un archivo**: con File System Access (Chrome y Edge de escritorio) eliges un archivo una vez, idealmente en una carpeta que se sincroniza (Google Drive, OneDrive, iCloud), y se actualiza cada vez que se guarda. El navegador vuelve a pedir permiso en cada sesión; mientras tanto, la copia queda «en pausa».
- **Descargar una copia** de la tesis en el formato del respaldo, que se recupera con «Importar respaldo» en otro navegador o equipo.
- **Pedir al navegador que conserve los datos** (`navigator.storage.persist`).

## 6. Decisiones tomadas

- **Formato de entrega:** primero una plantilla genérica en APA (T4); las de universidades se agregan conforme se pidan.
- **Segundo estilo de citas:** IEEE, por las ingenierías (T4).
- **Registro de autoría:** solo en documentos académicos (tesis y, después, investigación); las libretas y notas no lo llevan.

## 7. Hitos

| Hito | Qué entrega | Listo cuando |
|---|---|---|
| **T1 · Tesis y autoría** ✓ | «Tesis» en Crear con su estructura (resumen, capítulos, conclusiones, referencias, anexos); datos de portada como propiedades; registro de sesiones y de lo pegado con su origen; bloque «Declaración de autoría»; panel «Autoría» y constancia descargable | Escribes y pegas en una tesis, contestas de dónde vino lo pegado y la constancia lo refleja con la huella del texto |
| **T2 · Fuentes, citas y bibliografía** ✓ | Fuentes del documento (a mano, DOI, ISBN, BibTeX, RIS); citas en el texto con página; bibliografía automática en APA 7 | Citas tres fuentes y la bibliografía aparece sola, en orden alfabético y con el formato de APA |
| **T3 · Piezas académicas** ✓ | Imágenes comprimidas con pie (hito 3.1), notas al pie, figuras y tablas numeradas, ecuaciones (KaTeX), índices de figuras y tablas, referencias cruzadas | Mueves una figura y su número y sus referencias se actualizan solos |
| **T4 · Entregar** | PDF con formato de tesis (portada, numeración romana y arábiga, márgenes) y DOCX; plantillas de formato; estilos IEEE, Vancouver y Chicago | Una tesis exportada a DOCX respeta márgenes, interlineado e índices de la plantilla |
| **T5 · Historial y constancia completa** | Versiones del documento (hito 3.6), comparar versiones, constancia con línea de tiempo y sello de tiempo opcional con OpenTimestamps | Recuperas una versión de hace una semana y la constancia muestra la huella de cada versión |
| **T6 · Asesor y defensa** | Paquete de revisión para el asesor y comentarios; guía y presentación para la defensa. Compartir en línea depende de las cuentas | Tu asesor deja comentarios en un archivo que tú importas y resuelves |

T1 y T2 forman la primera entrega; T3 y la protección de datos, la segunda. Con T4 (exportar) una tesis ya se puede entregar. Libro y documento de investigación (hitos 3.3 y 3.4) reutilizan todo esto: la investigación es una tesis más corta.
