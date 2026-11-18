/* Copia KaTeX a ../../assets/vendor/katex: el JS, el CSS (solo con las fuentes WOFF2, que leen todos los
   navegadores actuales) y su licencia. El sitio lo carga solo cuando un documento tiene ecuaciones.
   Uso: npm install && npm run copiar */
'use strict';
const fs=require('fs'),path=require('path');
const origen=path.join(__dirname,'node_modules/katex'),dist=path.join(origen,'dist');
const destino=path.resolve(__dirname,'../../assets/vendor/katex');
fs.rmSync(destino,{recursive:true,force:true});
fs.mkdirSync(path.join(destino,'fonts'),{recursive:true});
fs.copyFileSync(path.join(dist,'katex.min.js'),path.join(destino,'katex.min.js'));
/* La versión «swap» muestra la ecuación con otra letra mientras llega la fuente, en vez de dejarla en blanco */
let css=fs.readFileSync(path.join(dist,'katex-swap.min.css'),'utf8');
css=css.replace(/,url\(fonts\/[^)]+\.woff\) format\("woff"\)/g,'').replace(/,url\(fonts\/[^)]+\.ttf\) format\("truetype"\)/g,'');
if(/\.(woff|ttf)\)/.test(css))throw new Error('Quedaron fuentes que no son WOFF2 en el CSS');
fs.writeFileSync(path.join(destino,'katex.min.css'),css);
const fuentes=fs.readdirSync(path.join(dist,'fonts')).filter(function(f){return f.endsWith('.woff2')});
fuentes.forEach(function(f){fs.copyFileSync(path.join(dist,'fonts',f),path.join(destino,'fonts',f))});
const ver=require(path.join(origen,'package.json')).version;
fs.writeFileSync(path.join(destino,'LICENSE.txt'),'KaTeX '+ver+' (MIT)\n\n'+fs.readFileSync(path.join(origen,'LICENSE'),'utf8'));
console.log('assets/vendor/katex: KaTeX '+ver+', '+fuentes.length+' fuentes');
