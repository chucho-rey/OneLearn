/* Se carga en el <head>, antes de pintar, para que el tema y la barra lateral
   guardados se apliquen sin parpadeo. */
(function(){
  var t='';try{t=localStorage.getItem('aprende-tecnologia:tema')||''}catch(e){}
  if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
  var s='';try{s=localStorage.getItem('aprende-tecnologia:barra')||''}catch(e){}
  if(s==='cerrada')document.documentElement.classList.add('side-collapsed');
})();
