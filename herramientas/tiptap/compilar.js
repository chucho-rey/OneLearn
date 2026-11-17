/* Compila entrada.js en ../../assets/vendor/tiptap.min.js y copia las licencias.
   Uso: npm install && npm run compilar */
'use strict';
const esbuild=require('esbuild'),fs=require('fs'),path=require('path');
const destino=path.resolve(__dirname,'../../assets/vendor');
fs.mkdirSync(destino,{recursive:true});
const pkg=require('./package.json');
esbuild.build({
  entryPoints:[path.join(__dirname,'entrada.js')],
  bundle:true,minify:true,format:'iife',target:['es2020','safari15'],
  legalComments:'none',
  banner:{js:'/* Tiptap '+pkg.devDependencies['@tiptap/core']+' y ProseMirror, empaquetados para OneLearn. Licencia MIT: ver tiptap-LICENSE.txt */'},
  outfile:path.join(destino,'tiptap.min.js'),metafile:true
}).then(function(r){
  /* Licencias de todo lo que entró en el paquete */
  const paquetes=new Set();
  Object.keys(r.metafile.inputs).forEach(function(f){
    const m=f.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    if(m)paquetes.add(m[1]);
  });
  let txt='Licencias del código incluido en tiptap.min.js\n\n';
  Array.from(paquetes).sort().forEach(function(p){
    const dir=path.join(__dirname,'node_modules',p);
    const info=require(path.join(dir,'package.json'));
    const lic=fs.readdirSync(dir).find(function(f){return /^licen[cs]e/i.test(f)});
    txt+='==== '+p+' '+info.version+' ('+info.license+')\n'+(lic?fs.readFileSync(path.join(dir,lic),'utf8').trim():'(sin archivo de licencia; '+info.license+')')+'\n\n';
  });
  fs.writeFileSync(path.join(destino,'tiptap-LICENSE.txt'),txt);
  const kb=Math.round(fs.statSync(path.join(destino,'tiptap.min.js')).size/1024);
  console.log('assets/vendor/tiptap.min.js: '+kb+' KB, '+paquetes.size+' paquetes');
}).catch(function(){process.exitCode=1});
