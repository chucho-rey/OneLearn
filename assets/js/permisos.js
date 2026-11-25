/* OneBook: la ventana «Personas y permisos» de una página (en el Inicio, desde el explorador, y en la página, desde
   «⋯»). El modelo está en datos.js (AT.datos.acceso).
   - Quién tiene acceso: el propietario primero, cada persona con su permiso (Administrador, Puede editar o Solo
     puede ver) y si su invitación está pendiente. Tú sales marcado y puedes poner tu nombre y correo.
   - Si administras la página: cambiar el permiso de cada persona, quitarla, invitar a alguien (nombre, correo y
     permiso) y responder las solicitudes (aprobar o rechazar).
   - Si no la administras: tu permiso y «Pedir más permisos» (con un mensaje); la solicitud queda pendiente en la
     página para quienes la administran (en su explorador, «Solicitudes»).
   Mientras OneBook vive en este navegador, invitaciones y solicitudes quedan anotadas; llegarán a las demás
   personas con las cuentas en la nube, y los avisos (notificaciones) después. Expone AT.permisos.abrir. */
(function(){
'use strict';
var AT=window.AT,$=AT.$,$$=AT.$$,esc=AT.esc,ico=AT.ico,D=AT.datos,A=D&&D.acceso;
if(!A)return;
var ORDEN=['admin','editor','lector'];
/* Las iniciales y el color de cada persona son los de base.js (AT.iniciales, AT.tonoPersona) */
var iniciales=AT.iniciales;
function avatar(p,clase){return '<span class="perm-av t'+AT.tonoPersona(p)+(clase?' '+clase:'')+'" aria-hidden="true">'+esc(iniciales(p))+'</span>'}
function nombreDe(p){return p.tu?(p.nombre?p.nombre+' (tú)':'Tú'):p.nombre||p.correo||'Sin nombre'}
function cuando(t){
  if(!t)return '';
  var d=new Date(t),min=(Date.now()-d.getTime())/6e4;
  if(min<1)return 'hace un momento';if(min<60)return 'hace '+Math.round(min)+' min';
  if(min<60*24)return 'hoy, '+d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'});
  return 'el '+d.toLocaleDateString('es-MX',{day:'numeric',month:'short'});
}
function opcion(r,sel){return '<option value="'+r+'"'+(r===sel?' selected':'')+'>'+esc(A.ROLES[r].nombre)+'</option>'}
function opciones(sel){return ORDEN.map(function(r){return opcion(r,sel)}).join('')}
/* Lo que puede pedir quien tiene el permiso «rol» (o ninguno): solo lo que está arriba del suyo */
function opcionesPedir(rol,sel){
  var l=ORDEN.filter(function(r){return rol==='ninguno'||A.ROLES[r].n>A.ROLES[rol].n});
  if(l.indexOf(sel)<0)sel=l.indexOf('editor')>=0?'editor':l[0];
  return l.map(function(r){return opcion(r,sel)}).join('');
}

/* Salas (E3): dónde vive la página y quién la ve por eso, además de su lista */
function salaLinea(doc){
  var sa=A.sala?A.sala(doc):'';if(!sa)return '';
  if(sa==='privado')return '<p class="perm-nota perm-sala">'+ico('candado')+'<span><b>Privada:</b> solo la ven su propietario y quienes están en esta lista.</span></p>';
  var s=AT.empresa&&AT.empresa.sala(sa);
  if(!s)return '<p class="perm-nota perm-sala"><span>Su sala ya no existe: solo la ven quienes están en esta lista.</span></p>';
  return '<p class="perm-nota perm-sala"><i class="emp-dot c-'+esc(s.color)+'" aria-hidden="true"></i><span>Está en la sala <a href="sala.html?id='+encodeURIComponent(sa)+'">'+esc(s.tipo==='general'?'General':s.nombre)+'</a>: '+
    (s.tipo==='general'?'la ve y la edita toda la empresa.':'la ven quienes entran a la sala.')+' Esta lista agrega a otras personas.</span></p>';
}
var dlg=null,docId='',abridor=null,editandoYo=false;
function crear(){
  dlg=document.createElement('dialog');
  dlg.className='atajos perm-dlg';dlg.setAttribute('aria-labelledby','permT');
  document.body.appendChild(dlg);
  /* Al cerrar, el foco vuelve a quien la abrió (si el explorador se redibujó, a los permisos de esa página) */
  dlg.addEventListener('close',function(){
    var b=abridor&&abridor.isConnected?abridor:document.querySelector('[data-fila="'+(window.CSS&&CSS.escape?CSS.escape(docId):docId)+'"] [data-k="perm"]');
    if(b&&b.focus)b.focus({preventScroll:true});
  });
  dlg.addEventListener('click',function(e){
    if(e.target===dlg){dlg.close();return}
    var b=e.target.closest('[data-perm]');if(!b||b.getAttribute('aria-disabled')==='true')return;
    var a=b.getAttribute('data-perm');
    if(a==='cerrar')dlg.close();
    else if(a==='quitar')hacer(A.quitar(docId,b.getAttribute('data-id')),'Se quitó el acceso.',b);
    else if(a==='aprobar'||a==='rechazar')hacer(A.responder(docId,b.getAttribute('data-id'),a==='aprobar'),a==='aprobar'?'Solicitud aprobada: ya tiene ese permiso.':'Solicitud rechazada.',b);
    else if(a==='yo'){editandoYo=true;pintar('#permYoNombre')}
    else if(a==='yo-no'){editandoYo=false;pintar('[data-perm="yo"]')}
  });
  dlg.addEventListener('change',function(e){
    var s=e.target.closest('[data-rol]');if(!s)return;
    hacer(A.cambiarRol(docId,s.getAttribute('data-rol'),s.value),'Permiso cambiado.',s);
  });
  dlg.addEventListener('submit',function(e){
    e.preventDefault();
    var f=e.target;
    if(f.id==='permEmp'){var pe=AT.empresa&&AT.empresa.persona(f.elements.persona.value);hacer(A.dar(docId,pe,f.elements.rol.value),
      'Listo: '+(pe&&pe.nombre||'esa persona')+' ya tiene acceso.',f.querySelector('[type="submit"]'),'#permEmpP, #permInvCorreo')}
    else if(f.id==='permInv')hacer(A.invitar(docId,{nombre:f.elements.nombre.value,correo:f.elements.correo.value,rol:f.elements.rol.value}),
      'Invitación anotada: llegará cuando OneBook tenga cuentas en la nube.',f.querySelector('[type="submit"]'),'#permInvCorreo');
    else if(f.id==='permPedir')hacer(A.solicitar(docId,{rol:f.elements.rol.value,mensaje:f.elements.mensaje.value}),
      'Solicitud enviada: quienes administran la página la verán en su explorador.',f.querySelector('[type="submit"]'));
    else if(f.id==='permYo'){
      try{D.cambiarYo({nombre:f.elements.nombre.value,correo:f.elements.correo.value});editandoYo=false;pintar('[data-perm="yo"]');AT.aviso('Tu nombre se guardó.')}
      catch(x){msg(x.message)}
    }
  });
}
function msg(t){var m=$('#permMsg',dlg);if(m)m.textContent=t||''}
/* Hace un cambio, repinta con lo guardado y deja el foco en un lugar que tenga sentido */
function hacer(p,ok,boton,foco){
  if(boton)boton.setAttribute('aria-disabled','true');
  msg('');
  return p.then(function(){return pintar(foco||null)}).then(function(){AT.aviso(ok)},function(e){
    if(boton&&boton.isConnected)boton.removeAttribute('aria-disabled');
    msg(e&&e.message||'No se pudo guardar. Inténtalo otra vez.');
  });
}
function pintar(foco){
  return D.documentos.leer(docId).then(function(doc){
    if(!doc){dlg.close();AT.aviso('Esa página ya no existe.');return}
    var gente=A.personas(doc),rol=A.rol(doc),admin=A.puede(doc,'compartir'),pend=A.pendientes(doc),mia=A.tuSolicitud(doc),y=D.yo();
    var h='<div class="at-h"><h2 id="permT">'+ico('users')+'Personas y permisos</h2><button class="lec-x" type="button" data-perm="cerrar" aria-label="Cerrar">'+ico('close')+'</button></div>'+
      '<p class="perm-doc">«'+esc(doc.titulo||'Sin título')+'» · tu permiso: <b>'+esc(A.nombreRol(rol))+'</b></p>'+salaLinea(doc)+
      '<h3 class="perm-h">Con acceso <small>'+gente.length+(gente.length===1?' persona':' personas')+'</small></h3>'+
      '<ul class="perm-l">'+gente.map(function(p){
        var puedeCambiar=admin&&p.rol!=='dueno'&&!p.tu;
        return '<li class="perm-p">'+avatar(p)+'<span class="perm-q"><b>'+esc(nombreDe(p))+'</b><small>'+esc(p.correo||(p.tu?'Sin correo':''))+
            (p.estado==='invitado'?' <em class="perm-pend">Invitación pendiente</em>':'')+'</small></span>'+
          (puedeCambiar?'<label class="vh" for="permR-'+esc(p.id)+'">Permiso de '+esc(nombreDe(p))+'</label><select id="permR-'+esc(p.id)+'" data-rol="'+esc(p.id)+'">'+opciones(p.rol)+'</select>'+
              '<button type="button" class="nb-x" data-perm="quitar" data-id="'+esc(p.id)+'" aria-label="Quitar el acceso de '+esc(nombreDe(p))+'" title="Quitar acceso">×</button>':
            '<span class="perm-rol">'+esc(A.nombreRol(p.rol))+'</span>')+
          (p.tu&&!editandoYo?'<button type="button" class="btn perm-yo-b" data-perm="yo">'+(y.nombre?'Cambiar tu nombre':'Pon tu nombre')+'</button>':'')+
        '</li>';
      }).join('')+'</ul>';
    if(editandoYo)h+='<form class="perm-f" id="permYo" novalidate><p class="perm-nota">Así te verán las demás personas cuando compartas tus páginas.</p>'+
      '<div class="perm-2"><label class="campo-l"><span>Tu nombre</span><input type="text" name="nombre" id="permYoNombre" maxlength="60" value="'+esc(y.nombre)+'" autocomplete="name"></label>'+
      '<label class="campo-l"><span>Tu correo (opcional)</span><input type="email" name="correo" maxlength="254" value="'+esc(y.correo)+'" autocomplete="email"></label></div>'+
      '<div class="td-bt"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-perm="yo-no">Cancelar</button></div></form>';
    if(admin){
      if(pend.length)h+='<h3 class="perm-h">Solicitudes <small>'+pend.length+'</small></h3><ul class="perm-l perm-sol">'+pend.map(function(s){
        var de=s.de||{};
        return '<li class="perm-p">'+avatar(de)+'<span class="perm-q"><b>'+esc(de.nombre||de.correo||'Alguien')+'</b> pide «'+esc(A.nombreRol(s.rol))+'»'+
          '<small>'+esc(cuando(s.fecha))+(s.mensaje?' · «'+esc(s.mensaje)+'»':'')+'</small></span>'+
          '<span class="perm-acc"><button type="button" class="btn pri" data-perm="aprobar" data-id="'+esc(s.id)+'">Aprobar</button>'+
          '<button type="button" class="btn" data-perm="rechazar" data-id="'+esc(s.id)+'">Rechazar</button></span></li>';
      }).join('')+'</ul>';
      /* Alguien de tu empresa: entra directo (comparte este navegador) */
      var E=AT.empresa,deEmpresa=E?E.personas().filter(function(x){return x.id!==y.id&&!gente.some(function(g){return g.id===x.id})}):[];
      if(deEmpresa.length)h+='<form class="perm-f" id="permEmp" novalidate><h3 class="perm-h">Alguien de tu empresa</h3>'+
        '<div class="perm-2"><label class="campo-l"><span>Persona</span><select name="persona" id="permEmpP">'+deEmpresa.map(function(x){
          return '<option value="'+esc(x.id)+'">'+esc(x.nombre||'Sin nombre')+'</option>';
        }).join('')+'</select></label>'+
        '<label class="campo-l"><span>Permiso</span><select name="rol">'+opciones('editor')+'</select></label></div>'+
        '<div class="td-bt"><button class="btn pri" type="submit">Dar acceso</button></div></form>';
      h+='<form class="perm-f" id="permInv" novalidate><h3 class="perm-h">'+(deEmpresa.length?'O invitar por correo':'Invitar a alguien')+'</h3>'+
        '<div class="perm-3"><label class="campo-l"><span>Nombre (opcional)</span><input type="text" name="nombre" maxlength="60" autocomplete="off"></label>'+
        '<label class="campo-l"><span>Correo</span><input type="email" name="correo" id="permInvCorreo" maxlength="254" required autocomplete="off"></label>'+
        '<label class="campo-l"><span>Permiso</span><select name="rol">'+opciones('editor')+'</select></label></div>'+
        '<div class="td-bt"><button class="btn pri" type="submit">Invitar</button></div></form>';
    }else{
      h+='<form class="perm-f" id="permPedir" novalidate><h3 class="perm-h">Pedir más permisos</h3>'+
        (mia?'<p class="perm-nota perm-ya">Pediste «'+esc(A.nombreRol(mia.rol))+'» '+esc(cuando(mia.fecha))+'. Está pendiente: quienes administran la página la verán en su explorador. Puedes cambiarla.</p>':
          '<p class="perm-nota">Quienes administran la página verán tu solicitud y te darán el permiso.</p>')+
        '<div class="perm-2"><label class="campo-l"><span>Permiso que pides</span><select name="rol" id="permPedirRol">'+opcionesPedir(rol,mia?mia.rol:PEDIR)+'</select></label>'+
        '<label class="campo-l"><span>Mensaje (opcional)</span><input type="text" name="mensaje" maxlength="300" value="'+esc(mia?mia.mensaje:'')+'" placeholder="Ej. Necesito actualizar los precios" autocomplete="off"></label></div>'+
        '<div class="td-bt"><button class="btn pri" type="submit">'+(mia?'Cambiar solicitud':'Enviar solicitud')+'</button></div></form>';
    }
    h+='<p class="bd-msg" id="permMsg" role="alert"></p>'+
      '<details class="perm-roles"><summary>¿Qué puede hacer cada permiso?</summary><dl>'+['dueno','admin','editor','lector'].map(function(r){
        return '<div><dt>'+esc(A.ROLES[r].nombre)+'</dt><dd>'+esc(A.ROLES[r].desc)+'</dd></div>';
      }).join('')+'</dl></details>'+
      '<p class="perm-nota perm-pie">Por ahora OneBook guarda todo en este navegador: las invitaciones y las solicitudes quedan anotadas en la página y llegarán a las demás personas cuando OneBook tenga cuentas en la nube. Los avisos llegan después.</p>';
    dlg.innerHTML=h;
    var f=foco&&dlg.querySelector(foco);
    if(f)f.focus();
  });
}
var PEDIR='';
function abrir(id,desde,op){
  if(!id)return;
  if(!dlg)crear();
  docId=id;abridor=desde||document.activeElement;editandoYo=false;PEDIR=op&&op.pedir||'';
  return pintar().then(function(){
    if(!dlg.open)dlg.showModal();
    var f=dlg.querySelector(PEDIR?'#permPedirRol':'select[data-rol], #permInvCorreo, #permPedirRol, [data-perm="cerrar"]');
    if(f)f.focus();
  });
}
/* Si cambian los permisos en otra pestaña mientras está abierta, se repinta */
D.on(function(c,deOtra){
  if(!dlg||!dlg.open||!deOtra)return;
  if((c.almacen==='documentos'&&c.id===docId&&c.acceso)||c.almacen==='yo')pintar();
});
AT.permisos={abrir:abrir,avatar:avatar,iniciales:iniciales,nombreDe:nombreDe};
})();
