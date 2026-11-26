# OneBook

Espacio de trabajo de **bloques y plantillas** para empresas de 5 a 100 personas: ventas, cobros, inventario, gastos y recursos humanos en páginas que cada departamento arma a su medida, con salas por departamento y un Inicio que cada quien arma. Todo se guarda en el navegador; lo local es gratis.

- Sitio: <https://chucho-rey.github.io/OneLearn/> (la rama `main` se publica sola con GitHub Pages).
- **Toda la documentación vive en Notion**, en la página «OneBook»: plan, características, roadmap y la **Documentación técnica** (arquitectura y convenciones, estructura y funciones, pruebas automáticas).

## Correrlo

Es un sitio estático, sin compilación: abre `index.html` o sirve la carpeta con cualquier servidor estático.

## Pruebas

```
cd pruebas
npm install && npx playwright install chromium   # la primera vez
npm test                                          # todas
node todas.js 3 24                                # solo algunas
```
