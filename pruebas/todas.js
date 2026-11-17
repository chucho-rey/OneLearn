/* Corre todas las pruebas, una tras otra, y resume. Sale con código 1 si alguna falla.
   Uso: node todas.js        (todas)
        node todas.js 3 5    (solo las que empiezan con 3 y con 5) */
'use strict';
const {spawnSync}=require('child_process');
const fs=require('fs'),path=require('path');

const filtro=process.argv.slice(2);
const archivos=fs.readdirSync(__dirname)
  .filter(function(f){return /^\d+-.*\.js$/.test(f)})
  .filter(function(f){return !filtro.length||filtro.some(function(x){return f.indexOf(x)===0})})
  .sort();
const resultados=archivos.map(function(f){
  const r=spawnSync(process.execPath,[path.join(__dirname,f)],{stdio:'inherit'});
  return {f:f,ok:r.status===0};
});
console.log('\nResumen');
resultados.forEach(function(x){console.log((x.ok?'  ✓ ':'  ✗ ')+x.f)});
const mal=resultados.filter(function(x){return !x.ok}).length;
console.log(mal?mal+' de '+resultados.length+' pruebas fallaron.':'Las '+resultados.length+' pruebas pasan.');
process.exitCode=mal?1:0;
