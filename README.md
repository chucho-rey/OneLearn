# OneBook

Espacio de trabajo de **bloques y plantillas** para empresas de 5 a 100 personas: ventas, cobros, inventario, gastos, caja
chica, recursos humanos y pedidos al Cedis, en páginas que cada departamento arma a su medida, con salas por departamento
y un Inicio que cada quien arma. Todo se guarda en el navegador; lo local es gratis.

- Sitio: <https://chucho-rey.github.io/OneLearn/> (la rama `main` se publica sola con GitHub Pages).
- **Para programar (personas o IA):** empieza por [`AGENTS.md`](AGENTS.md) y [`docs/ESTADO.md`](docs/ESTADO.md). La
  documentación técnica está en [`docs/`](docs/); la guía para trabajar con varias IA, en [`docs/ias.md`](docs/ias.md).
- El plan del producto, el Roadmap y las características viven en Notion («OneBook»).

## Correrlo

Es un sitio estático, sin compilación: abre `index.html` o sirve la carpeta con cualquier servidor estático
(`python3 -m http.server 8123`).

## Pruebas

```
cd pruebas
npm install && npx playwright install chromium   # la primera vez
npm test                                          # todas (unos 8 minutos)
node todas.js 3 24                                # solo algunas
```
