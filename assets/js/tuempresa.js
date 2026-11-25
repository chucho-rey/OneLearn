/* OneBook: la página «Tu empresa» (empresa.html, etapa Empresas, E2). Usa el modelo de empresa.js (AT.empresa).
   - Los datos de la empresa (nombre, giro, teléfono y RFC): los cambia quien la administra.
   - Personas: su rol en la empresa (propietario, administrador o miembro), sus departamentos y si tienen PIN.
     Quien administra agrega, cambia y quita; cada quien cambia su nombre, su correo y su PIN (empresa.html#yo abre
     la tuya). El propietario puede pasar la empresa a otra persona.
   - Departamentos: nombre, color y su gente con su rol (responsable, miembro o consulta). Los agrega y los quita
     quien administra la empresa; su responsable cambia el nombre, el color y quién está.
   - Quien no administra ve todo, sin botones para cambiar lo que no le toca.
   Quitar algo pide confirmarlo con un segundo toque. Al cerrar una ventana, el foco vuelve a su botón. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,E=AT.empresa,P=AT.perfil;
var raiz=$('#emp');
if(!E||!raiz)return;

function giroTexto(g){return P&&P.nombreGiro?P.nombreGiro(g):''}
function plural(n,uno,varios){return n+' '+(n===1?uno:varios)}
function anunciar(t){var m=$('#empMsg');m.textContent='';setTimeout(function(){m.textContent=t},30)}
function opcion(v,t,sel){return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(t)+'</option>'}

/* ---------- La página ---------- */
function pintar(){
  var e=E.leer(),yo=E.activa(),admin=E.esAdmin();
  if(!e){
    $('#empNombre').textContent='Tu empresa';
    $('#empSub').textContent='Todavía no hay una empresa en este navegador.';
    $('#empTu').innerHTML='<a class="btn pri" href="'+AT.rutas.raiz+'entrar.html">Crear tu empresa</a>';
    $$('.emp-sec,.emp-roles').forEach(function(x){x.hidden=true});
    return;
  }
  $('#empNombre').textContent=e.nombre||'Tu empresa';
  $('#empSub').textContent=[giroTexto(e.giro),e.telefono?'Tel. '+e.telefono:'',e.rfc?'RFC '+e.rfc:''].filter(Boolean).join(' · ');
  $('#empDatos').hidden=!admin;
  $('#empAgregarP').hidden=!admin;
  $('#empAgregarD').hidden=!admin;
  $('#empTu').innerHTML=yo?(yo.nombre?'Entras como <b>'+esc(yo.nombre)+'</b> ('+esc(E.ROLES[yo.rol].nombre.toLowerCase())+'). ':
        'Entras como '+esc(E.ROLES[yo.rol].nombre.toLowerCase())+', todavía sin nombre. <button class="emp-link" type="button" data-emp="editar" data-id="'+esc(yo.id)+'">Ponte tu nombre</button> · ')+
      '<button class="emp-link" type="button" data-emp="persona">Cambiar de persona</button>':
    'Esta computadora no sabe quién eres. <button class="emp-link" type="button" data-emp="persona">Elige quién eres</button>';

  var ps=E.personas();
  $('#empPerN').textContent='('+ps.length+')';
  $('#empPersonas').innerHTML=ps.map(function(p){
    var tu=yo&&p.id===yo.id,ds=E.deptosDe(p.id),puede=admin||tu;
    return '<li class="emp-p" data-id="'+esc(p.id)+'">'+AT.avatar(p)+
      '<div class="emp-q"><b>'+esc(p.nombre||'Sin nombre')+(tu?' <em>(tú)</em>':'')+'</b>'+(p.correo?'<small>'+esc(p.correo)+'</small>':'')+'</div>'+
      '<span class="emp-rol emp-rol-'+p.rol+'">'+esc(E.ROLES[p.rol].nombre)+'</span>'+
      '<span class="emp-chips">'+(ds.length?ds.map(function(x){
        return '<span class="emp-chip c-'+esc(x.depto.color)+'">'+esc(x.depto.nombre)+' · '+esc(E.ROLES_DEP[x.rol].nombre.toLowerCase())+'</span>';
      }).join(''):'<span class="emp-sin">Sin departamento</span>')+'</span>'+
      (p.pin?'<span class="emp-pin">'+ico('candado')+'Con PIN</span>':'')+
      (puede?'<button class="btn emp-ed" type="button" data-emp="editar" data-id="'+esc(p.id)+'" aria-label="Editar a '+esc(p.nombre||'esta persona')+'">Editar</button>':'')+
    '</li>';
  }).join('');

  var ds=E.departamentos();
  $('#empDepN').textContent='('+ds.length+')';
  $('#empDeptos').innerHTML=ds.length?ds.map(function(d){
    var ms=E.miembros(d.id),cuenta={responsable:0,miembro:0,consulta:0};
    ms.forEach(function(m){cuenta[m.rol]++});
    var resumen=[cuenta.responsable?plural(cuenta.responsable,'responsable','responsables'):'',cuenta.miembro?plural(cuenta.miembro,'miembro','miembros'):'',
      cuenta.consulta?plural(cuenta.consulta,'de consulta','de consulta'):''].filter(Boolean).join(' · ')||'Sin personas todavía';
    return '<article class="emp-d" data-id="'+esc(d.id)+'"><h3><span class="emp-dot c-'+esc(d.color)+'" aria-hidden="true"></span>'+esc(d.nombre)+'</h3>'+
      '<p class="emp-d-n">'+esc(resumen)+'</p>'+
      (ms.length?'<ul class="emp-d-l">'+ms.map(function(m){
        return '<li>'+AT.avatar(m.persona)+'<span>'+esc(m.persona.nombre||'Sin nombre')+'</span><small>'+esc(E.ROLES_DEP[m.rol].nombre)+'</small></li>';
      }).join('')+'</ul>':'')+
      (E.puedeDepto(d.id,'administrar')?'<button class="btn" type="button" data-emp="depto" data-id="'+esc(d.id)+'">Administrar <span class="vh">'+esc(d.nombre)+'</span></button>':'')+
    '</article>';
  }).join(''):'<p class="emp-vacio">Todavía no hay departamentos.'+(admin?' Agrega el primero: por ejemplo, Ventas o Almacén.':'')+'</p>';

  $('#empRoles').innerHTML=Object.keys(E.ROLES).map(function(k){return '<div><dt>'+esc(E.ROLES[k].nombre)+'</dt><dd>'+esc(E.ROLES[k].desc)+'</dd></div>'}).join('')+
    Object.keys(E.ROLES_DEP).map(function(k){return '<div><dt>'+esc(E.ROLES_DEP[k].nombre)+' de un departamento</dt><dd>'+esc(E.ROLES_DEP[k].desc)+'</dd></div>'}).join('');
}

/* ---------- Ventanas ---------- */
var dlg=null,abridor=null;
function ventana(titulo,html,clase){
  if(dlg&&dlg.open)dlg.close();
  dlg=document.createElement('dialog');
  dlg.className='atajos emp-dlg'+(clase?' '+clase:'');dlg.setAttribute('aria-labelledby','empDlgT');
  dlg.innerHTML='<div class="at-h"><h2 id="empDlgT">'+esc(titulo)+'</h2><button class="lec-x" type="button" data-cerrar aria-label="Cerrar">'+ico('close')+'</button></div>'+html+
    '<p class="td-msg" id="empDlgMsg" role="status"></p>';
  document.body.appendChild(dlg);
  var d=dlg;
  d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-cerrar]'))d.close()});
  d.addEventListener('close',function(){
    d.remove();
    var b=abridor&&abridor.isConnected?abridor:null;
    if(!b&&abridor&&abridor.getAttribute){var id=abridor.getAttribute('data-id');b=id&&$('[data-emp="'+abridor.getAttribute('data-emp')+'"][data-id="'+id+'"]')}
    if(b&&b.focus)b.focus({preventScroll:true});
  });
  d.showModal();
  var f=$('input:not([type="hidden"]),select',d);if(f)f.focus();
  return d;
}
function error(t){var m=$('#empDlgMsg',dlg);if(m){m.textContent=t;m.classList.add('err')}}
/* Quitar algo: el primer toque pide confirmar */
function confirmar(b,texto){
  if(b.getAttribute('data-seguro')==='1')return true;
  b.setAttribute('data-seguro','1');b.textContent=texto;
  var m=$('#empDlgMsg',dlg);if(m){m.classList.remove('err');m.textContent='Toca otra vez para confirmar.'}
  return false;
}
function listo(t){if(dlg)dlg.close();pintar();AT.aviso(t);anunciar(t)}

/* Datos de la empresa */
function abrirDatos(){
  var e=E.leer(),giros=P&&P.GIROS||[];
  var d=ventana('Datos de la empresa','<form class="emp-f" novalidate>'+
    '<label class="campo-l"><span>Nombre de la empresa</span><input name="nombre" maxlength="80" required value="'+esc(e.nombre)+'"></label>'+
    '<label class="campo-l"><span>Giro</span><select name="giro">'+giros.map(function(g){return opcion(g[0],g[1],e.giro)}).join('')+'</select></label>'+
    '<div class="emp-2"><label class="campo-l"><span>Teléfono <small>(opcional)</small></span><input name="telefono" type="tel" maxlength="30" value="'+esc(e.telefono)+'"></label>'+
    '<label class="campo-l"><span>RFC <small>(opcional)</small></span><input name="rfc" maxlength="13" autocapitalize="characters" value="'+esc(e.rfc)+'"></label></div>'+
    '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>');
  $('form',d).addEventListener('submit',function(ev){
    ev.preventDefault();var f=ev.target.elements;
    try{E.cambiarDatos({nombre:f.nombre.value,giro:f.giro.value,telefono:f.telefono.value,rfc:f.rfc.value});listo('Datos de la empresa guardados.')}
    catch(err){error(err.message)}
  });
}

/* Agregar o editar a una persona */
function abrirPersona(pid){
  var p=pid?E.persona(pid):null,yo=E.activa(),admin=E.esAdmin(),tu=!!(p&&yo&&p.id===yo.id);
  if(pid&&!p){pintar();return}
  var deps=E.departamentos(),prop=p&&p.rol==='propietario';
  var pinAqui=!p||tu||(admin&&!prop);
  var h='<form class="emp-f" novalidate>'+
    '<div class="emp-2"><label class="campo-l"><span>Nombre</span><input name="nombre" maxlength="60" required autocomplete="off" value="'+esc(p?p.nombre:'')+'"></label>'+
    '<label class="campo-l"><span>Correo <small>(opcional)</small></span><input name="correo" type="email" maxlength="254" autocomplete="off" value="'+esc(p?p.correo:'')+'"></label></div>';
  if(admin&&!prop)h+='<label class="campo-l"><span>Rol en la empresa</span><select name="rol">'+opcion('miembro','Miembro',p?p.rol:'miembro')+opcion('admin','Administrador',p&&p.rol)+'</select></label>';
  else if(p)h+='<p class="emp-dato"><span>Rol en la empresa</span><b>'+esc(E.ROLES[p.rol].nombre)+'</b></p>';
  if(admin&&deps.length){
    h+='<fieldset class="emp-fs"><legend>Departamentos</legend><div class="emp-deps-f">'+deps.map(function(d){
      var r=p&&p.deptos[d.id]||'';
      return '<label class="emp-dep-f"><span><i class="emp-dot c-'+esc(d.color)+'" aria-hidden="true"></i>'+esc(d.nombre)+'</span><select name="dep-'+esc(d.id)+'" aria-label="Rol en '+esc(d.nombre)+'">'+
        opcion('','No está',r)+Object.keys(E.ROLES_DEP).map(function(k){return opcion(k,E.ROLES_DEP[k].nombre,r)}).join('')+'</select></label>';
    }).join('')+'</div></fieldset>';
  }
  if(pinAqui){
    var tiene=!!(p&&p.pin);
    h+='<fieldset class="emp-fs"><legend>PIN para entrar</legend>'+
      '<p class="emp-txt">'+(tiene?'Tiene PIN. Escribe uno nuevo para cambiarlo.':'Sin PIN, cualquiera en esta computadora puede entrar como '+(tu?'tú':'esta persona')+'.')+' De 4 a 8 números.</p>'+
      '<div class="emp-2"><label class="campo-l"><span>'+(tiene?'PIN nuevo':'PIN')+' <small>(opcional)</small></span><input name="pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" pattern="[0-9]*"></label>'+
      '<label class="campo-l"><span>Repítelo</span><input name="pin2" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" pattern="[0-9]*"></label></div>'+
      (tiene?'<button class="btn" type="button" data-acc="sinpin">Quitar el PIN</button>':'')+'</fieldset>';
  }
  h+='<div class="td-bt"><button class="btn pri" type="submit">'+(p?'Guardar':'Agregar')+'</button><button class="btn" type="button" data-cerrar>Cancelar</button></div>';
  if(p&&admin&&!tu&&!prop)h+='<div class="td-bt emp-peligro">'+(E.rol()==='propietario'?'<button class="btn" type="button" data-acc="propietario">Hacerla propietaria</button>':'')+
    '<button class="btn emp-quitar" type="button" data-acc="quitar">Quitar de la empresa</button></div>';
  h+='</form>';
  var d=ventana(p?(tu?'Tus datos':p.nombre||'Persona'):'Agregar persona',h);
  var form=$('form',d);
  form.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-acc]');if(!b)return;
    var a=b.getAttribute('data-acc');
    try{
      if(a==='sinpin'){E.quitarPin(p.id);listo('Se quitó el PIN.')}
      else if(a==='quitar'){if(confirmar(b,'Sí, quitar a '+(p.nombre||'esta persona'))){E.quitarPersona(p.id);listo((p.nombre||'La persona')+' ya no está en la empresa.')}}
      else if(a==='propietario'){if(confirmar(b,'Sí, hacerla propietaria (tú quedas como administrador)')){E.hacerPropietario(p.id);listo((p.nombre||'Esa persona')+' es ahora la propietaria de la empresa.')}}
    }catch(err){error(err.message)}
  });
  form.addEventListener('submit',function(ev){
    ev.preventDefault();var f=form.elements;
    var pin=f.pin?f.pin.value.trim():'',pin2=f.pin2?f.pin2.value.trim():'';
    if(pin||pin2){
      if(!/^\d{4,8}$/.test(pin)){error('El PIN lleva de 4 a 8 números.');f.pin.focus();return}
      if(pin!==pin2){error('Los dos PIN no son iguales.');f.pin2.focus();return}
    }
    var deptos={};
    deps.forEach(function(x){var s=f['dep-'+x.id];if(s&&s.value)deptos[x.id]=s.value});
    try{
      if(!p){
        var n=E.agregarPersona({nombre:f.nombre.value,correo:f.correo.value,rol:f.rol?f.rol.value:'miembro',deptos:deptos,pin:pin});
        listo((n.nombre||'La persona')+' ya está en tu empresa.');
        return;
      }
      var c={nombre:f.nombre.value,correo:f.correo.value};
      if(f.rol&&f.rol.value!==p.rol)c.rol=f.rol.value;
      E.cambiarPersona(p.id,c);
      if(admin)deps.forEach(function(x){var nuevo=deptos[x.id]||'';if(nuevo!==(p.deptos[x.id]||''))E.ponerEnDepto(x.id,p.id,nuevo)});
      if(pin)E.ponerPin(p.id,pin);
      listo(tu?'Tus datos se guardaron.':'Cambios guardados.');
    }catch(err){error(err.message)}
  });
}

/* Agregar o administrar un departamento */
function abrirDepto(did){
  var dep=did?E.departamento(did):null,admin=E.esAdmin();
  if(did&&!dep){pintar();return}
  var ps=E.personas(),color=dep?dep.color:E.COLORES[E.departamentos().length%E.COLORES.length][0];
  var h='<form class="emp-f" novalidate>'+
    '<label class="campo-l"><span>Nombre</span><input name="nombre" maxlength="40" required autocomplete="off" value="'+esc(dep?dep.nombre:'')+'" placeholder="Por ejemplo, Ventas"></label>'+
    '<fieldset class="emp-fs"><legend>Color</legend><div class="emp-colores">'+E.COLORES.map(function(c){
      return '<label class="emp-color"><input type="radio" name="color" value="'+c[0]+'"'+(c[0]===color?' checked':'')+'><span class="emp-dot c-'+c[0]+'" aria-hidden="true"></span><span>'+esc(c[1])+'</span></label>';
    }).join('')+'</div></fieldset>'+
    '<fieldset class="emp-fs"><legend>Personas</legend><div class="emp-deps-f">'+ps.map(function(p){
      var r=dep&&p.deptos[dep.id]||'';
      return '<label class="emp-dep-f"><span>'+AT.avatar(p)+esc(p.nombre||'Sin nombre')+'</span><select name="p-'+esc(p.id)+'" aria-label="Rol de '+esc(p.nombre||'esta persona')+'">'+
        opcion('','No está',r)+Object.keys(E.ROLES_DEP).map(function(k){return opcion(k,E.ROLES_DEP[k].nombre,r)}).join('')+'</select></label>';
    }).join('')+'</div></fieldset>'+
    '<div class="td-bt"><button class="btn pri" type="submit">'+(dep?'Guardar':'Agregar')+'</button><button class="btn" type="button" data-cerrar>Cancelar</button></div>'+
    (dep&&admin?'<div class="td-bt emp-peligro"><button class="btn emp-quitar" type="button" data-acc="quitar">Quitar el departamento</button></div>':'')+
  '</form>';
  var d=ventana(dep?dep.nombre:'Agregar departamento',h);
  var form=$('form',d);
  form.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-acc="quitar"]');if(!b)return;
    try{if(confirmar(b,'Sí, quitar '+dep.nombre+' (las personas siguen en la empresa)')){E.quitarDepto(dep.id);listo('Se quitó el departamento '+dep.nombre+'.')}}
    catch(err){error(err.message)}
  });
  form.addEventListener('submit',function(ev){
    ev.preventDefault();var f=form.elements;
    var col=(form.querySelector('input[name="color"]:checked')||{}).value;
    var roles={};ps.forEach(function(p){var s=f['p-'+p.id];if(s&&s.value)roles[p.id]=s.value});
    try{
      if(!dep){
        var n=E.agregarDepto({nombre:f.nombre.value,color:col,personas:roles});
        listo('Departamento '+n.nombre+' agregado.');
        return;
      }
      var r=E.cambiarDepto(dep.id,{nombre:f.nombre.value,color:col});
      ps.forEach(function(p){var nuevo=roles[p.id]||'';if(nuevo!==(p.deptos[dep.id]||''))E.ponerEnDepto(dep.id,p.id,nuevo)});
      listo('Departamento '+r.nombre+' guardado.');
    }catch(err){error(err.message)}
  });
}

/* ---------- Eventos ---------- */
raiz.addEventListener('click',function(e){
  var b=e.target.closest('[data-emp],#empDatos,#empAgregarP,#empAgregarD');if(!b)return;
  abridor=b;
  if(b.id==='empDatos')abrirDatos();
  else if(b.id==='empAgregarP')abrirPersona('');
  else if(b.id==='empAgregarD')abrirDepto('');
  else{
    var a=b.getAttribute('data-emp');
    if(a==='editar')abrirPersona(b.getAttribute('data-id'));
    else if(a==='depto')abrirDepto(b.getAttribute('data-id'));
    else if(a==='persona'&&AT.persona)AT.persona.abrir(b);
  }
});
/* Otra pestaña cambió la empresa: se vuelve a pintar (sin cerrar una ventana abierta) */
E.on(function(c,deOtra){if(deOtra)pintar()});
pintar();
/* empresa.html#yo abre tus datos (tu nombre y tu PIN) */
if(location.hash==='#yo'&&E.activa()){abridor=$('[data-emp="editar"][data-id="'+E.activa().id+'"]');abrirPersona(E.activa().id)}
})();
