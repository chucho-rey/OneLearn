# Pruebas de OneLearn

Pruebas automáticas con Playwright. Cada archivo cubre un hito de la fase 1 y comprueba que todo funcione: en celular y escritorio, con texto del 90% al 150%, con las tres fuentes, en claro, oscuro y alto contraste, y con el teclado. Fallan si encuentran desbordes, errores, texto con poco contraste o un comportamiento distinto del esperado.

Las pruebas sirven el sitio en `http://127.0.0.1:<puerto>/OneLearn/`, igual que GitHub Pages, con un servidor incluido en `lib.js`. No hace falta instalar nada más.

## Cómo correrlas

En tu computadora, la primera vez:

```
cd pruebas
npm install
npx playwright install chromium
```

Después:

```
npm test               # todas
node todas.js 3 5      # solo las de los hitos 3 y 5
DETALLE=1 node 2-lectura.js   # muestra también cada comprobación que pasa
```

## Qué cubre cada archivo

| Archivo | Qué comprueba |
|---|---|
| `1-identidad.js` | Las cuatro variantes de color, el contraste, los cinco tamaños de texto y la migración de preferencias anteriores |
| `2-lectura.js` | El panel Lectura: cada opción, el teclado, Restablecer, el contraste del sistema y las fuentes para dislexia |
| `3-barra.js` | Las pestañas de la barra lateral, Mis apuntes y el foco en el menú del celular |
| `4-avance.js` | El registro de lectura, el mapa del tema, el repaso y la pantalla de inicio |
| `5-zen.js` | El modo zen sin ratón, los atajos y la nota acoplada a la derecha |
| `lib.js` | Servidor, navegador, auditoría de contraste y utilidades compartidas |

La auditoría de contraste revisa todo el texto visible contra su fondo real y exige 4.5:1 (7:1 con alto contraste), como pide WCAG.
