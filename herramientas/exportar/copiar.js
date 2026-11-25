/* Prepara las librerías para exportar documentos (solo al cambiar sus versiones):
   - docx: empaqueta entrada.js con esbuild en ../../assets/vendor/docx.min.js (window.Docx)
   - Paged.js: copia dist/paged.min.js (window.PagedModule) en ../../assets/vendor/paged.min.js
   y escribe exportar-LICENSE.txt con las licencias de todo lo incluido.
   Uso: npm install && npm run copiar */
'use strict';
const esbuild=require('esbuild'),fs=require('fs'),path=require('path');
const destino=path.resolve(__dirname,'../../assets/vendor');
const pkg=require('./package.json');
esbuild.build({
  entryPoints:[path.join(__dirname,'entrada.js')],
  bundle:true,minify:true,format:'iife',target:['es2020','safari15'],
  legalComments:'none',
  banner:{js:'/* docx '+pkg.devDependencies.docx+' empaquetado para OneBook. Licencia MIT: ver exportar-LICENSE.txt */'},
  outfile:path.join(destino,'docx.min.js'),metafile:true
}).then(function(r){
  fs.copyFileSync(path.join(__dirname,'node_modules/pagedjs/dist/paged.min.js'),path.join(destino,'paged.min.js'));
  /* docx trae dentro sus dependencias (fflate, nanoid): también van sus licencias */
  const paquetes=new Set(['pagedjs','fflate','nanoid'].filter(function(p){return fs.existsSync(path.join(__dirname,'node_modules',p))}));
  Object.keys(r.metafile.inputs).forEach(function(f){const m=f.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);if(m)paquetes.add(m[1])});
  let txt='Licencias del código incluido en docx.min.js y paged.min.js\n\n';
  Array.from(paquetes).sort().forEach(function(p){
    const dir=path.join(__dirname,'node_modules',p),info=require(path.join(dir,'package.json'));
    const lic=fs.readdirSync(dir).find(function(f){return /^licen[cs]e/i.test(f)});
    txt+='==== '+p+' '+info.version+' ('+(info.license||'')+')\n'+(lic?fs.readFileSync(path.join(dir,lic),'utf8').trim():'(sin archivo de licencia; '+info.license+')')+'\n\n';
  });
  fs.writeFileSync(path.join(destino,'exportar-LICENSE.txt'),txt);
  const kb=function(f){return Math.round(fs.statSync(path.join(destino,f)).size/1024)+' KB'};
  console.log('assets/vendor/docx.min.js: '+kb('docx.min.js')+' · paged.min.js: '+kb('paged.min.js')+' · '+paquetes.size+' paquetes');
}).catch(function(e){console.error(e);process.exitCode=1});
