/* OneBook: exportar una página a Word (DOCX).
   AT.exportarDocx.exportar(doc) → Promise<{blob, nombre}> y descargar(doc) → Promise<nombre del archivo>.
   Usa docx (assets/vendor/docx.min.js, window.Docx), que se carga la primera vez que se exporta.
   - Formato de documento de trabajo: Arial de 11 puntos, interlineado 1.15, títulos a la izquierda y el número
     de página abajo a la derecha; papel carta o A4, vertical u horizontal (doc.formato, ver exportar.js).
   - Estilos de Word de verdad (Título 1 y 2), así el índice es un campo de Word que se actualiza.
   - Imágenes (WebP se convierte a PNG), tablas con líneas, tablas numeradas con su leyenda y notas al pie de Word.
   - Los bloques sin texto propio (plan de pagos, bloques de la tienda, bases de datos) van como su texto.
   Se carga en documento.html, después de exportar.js. */
(function(){
'use strict';
var AT=window.AT;

function cargar(){
  if(window.Docx)return Promise.resolve(window.Docx);
  return new Promise(function(ok,mal){
    var s=document.createElement('script');
    s.src=((AT.rutas&&AT.rutas.raiz)||'')+'assets/vendor/docx.min.js';
    s.onload=function(){window.Docx?ok(window.Docx):mal(new Error('No se pudo cargar el generador de Word'))};
    s.onerror=function(){s.remove();mal(new Error('No se pudo cargar el generador de Word. Revisa tu conexión'))};
    document.head.appendChild(s);
  });
}
/* WebP → PNG (Word no lee WebP); devuelve {data, type, ancho, alto} */
function imagen(src){
  return new Promise(function(ok,mal){
    var m=/^data:image\/(png|jpeg|webp|gif);base64,/.exec(src||'');
    if(!m){mal(new Error('imagen'));return}
    var img=new Image();
    img.onload=function(){
      var w=img.naturalWidth||1,h=img.naturalHeight||1;
      function bytes(b64){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
      if(m[1]==='png'||m[1]==='jpeg'||m[1]==='gif'){ok({data:bytes(src.slice(m[0].length)),type:m[1]==='jpeg'?'jpg':m[1],ancho:w,alto:h});return}
      var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0);
      ok({data:bytes(c.toDataURL('image/png').split(',')[1]),type:'png',ancho:w,alto:h});
    };
    img.onerror=function(){mal(new Error('imagen'))};
    img.src=src;
  });
}
function nombreArchivo(doc){
  var s=(doc.titulo||'documento').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return (s||'documento')+'.docx';
}

function exportar(doc){
  return cargar().then(function(D){
    var f=AT.exportar.formato(doc),piezas=AT.piezas?AT.piezas.numerar(doc.contenido):{lista:[],por:{},secciones:[]};
    var LETRA='Arial',TAM=22,LINEA=276,negro='000000';
    var PAPEL=f.papel==='a4'?{width:11906,height:16838}:{width:12240,height:15840},HORIZ=f.orientacion==='horizontal';
    var M=1440,ANCHO=(HORIZ?PAPEL.height:PAPEL.width)-2*M;
    var notas={},nNota=0,listas=0;

    /* ---------- Texto en línea ---------- */
    function runs(lista,extra){
      var out=[];
      (lista||[]).forEach(function(n){
        var a=n.attrs||{};
        if(n.type==='text'){
          var ms={};(n.marks||[]).forEach(function(m){ms[m.type]=m.attrs||true});
          /* Solo lo que está activo: un «negritas = no» explícito le ganaría al estilo del título */
          var o={text:n.text||''};
          if(ms.bold)o.bold=true;if(ms.italic)o.italics=true;if(ms.strike)o.strike=true;if(ms.underline)o.underline={};
          if(ms.highlight)o.highlight='yellow';if(ms.superscript)o.superScript=true;if(ms.subscript)o.subScript=true;if(ms.code)o.font='Consolas';
          Object.assign(o,extra||{});
          var href=ms.link&&AT.bloques.hrefSeguro(ms.link.href);
          out.push(href&&/^https?:|^mailto:/i.test(href)?new D.ExternalHyperlink({link:href,children:[new D.TextRun(Object.assign({},o,{style:'Hyperlink'}))]}):new D.TextRun(o));
        }else if(n.type==='hardBreak')out.push(new D.TextRun({break:1}));
        else if(n.type==='cita')out.push(new D.TextRun(Object.assign({text:a.texto||''},extra||{})));
        else if(n.type==='refCruzada')out.push(new D.TextRun(Object.assign({text:AT.piezas.etiqueta(piezas.por[a.destino])},extra||{})));
        else if(n.type==='notaPie'){nNota++;notas[nNota]={children:[new D.Paragraph({style:'NotaPie',children:[new D.TextRun(String(a.texto||''))]})]};out.push(new D.FootnoteReferenceRun(nNota))}
      });
      return out;
    }
    function textoPlano(n){return AT.bloques.textoDe(n).replace(/\s+/g,' ').trim()}

    /* ---------- Bloques ---------- */
    var pendientes=[];/* imágenes que se cargan antes de armar el documento */
    function bloques(lista,ctx){
      var out=[];
      (lista||[]).forEach(function(n){out=out.concat(bloque(n,ctx))});
      return out;
    }
    function bloque(n,ctx){
      var a=n.attrs||{},c=n.content||[];
      switch(n.type){
        case 'paragraph':
          if(!c.length&&!ctx.dentro)return [];
          return [new D.Paragraph(Object.assign({children:runs(c)},ctx.cita?{style:'Cita'}:{}))];
        case 'heading':
          return [new D.Paragraph({heading:a.level===3?D.HeadingLevel.HEADING_2:D.HeadingLevel.HEADING_1,children:runs(c)})];
        case 'bulletList':case 'orderedList':case 'taskList':
          var inst=++listas;
          return c.map(function(li){
            var t=n.type==='taskList'?((li.attrs||{}).checked?'☑ ':'☐ '):'';
            var par=(li.content||[]).filter(function(x){return x.type==='paragraph'});
            var resto=(li.content||[]).filter(function(x){return x.type!=='paragraph'});
            var ps=[new D.Paragraph(Object.assign({style:'Lista',children:(t?[new D.TextRun(t)]:[]).concat(runs((par[0]||{}).content))},
              n.type==='orderedList'?{numbering:{reference:'numerada',level:0,instance:inst}}:n.type==='bulletList'?{bullet:{level:0}}:{}))];
            par.slice(1).forEach(function(x){ps.push(new D.Paragraph({style:'Lista',children:runs(x.content)}))});
            return ps.concat(bloques(resto,{dentro:true}));
          }).reduce(function(x,y){return x.concat(y)},[]);
        case 'blockquote':return bloques(c,{dentro:true,cita:true});
        case 'callout':case 'resumen':
          return (n.type==='resumen'?[new D.Paragraph({heading:D.HeadingLevel.HEADING_2,children:[new D.TextRun('Resumen')]})]:[]).concat(bloques(c,{dentro:true}));
        case 'codeBlock':
          return [new D.Paragraph({style:'Codigo',children:String(c.map(function(x){return x.text||''}).join('')).split('\n').map(function(l,k){return new D.TextRun({text:l,break:k?1:0})})})];
        case 'horizontalRule':return [new D.Paragraph({border:{bottom:{style:D.BorderStyle.SINGLE,size:6,color:'999999',space:1}},children:[]})];
        case 'columnas':return c.map(function(col){return bloques(col.content,{dentro:true})}).reduce(function(x,y){return x.concat(y)},[]);
        case 'desplegable':return [new D.Paragraph({children:runs((c[0]||{}).content,{bold:true})})].concat(bloques((c[1]||{}).content,{dentro:true}));
        case 'table':return [tabla(n),new D.Paragraph({children:[]})];
        case 'tablaNumerada':
          var xt=piezas.lista.filter(function(x){return x.clave===a.clave})[0];
          return [leyenda('Tabla',a.titulo,xt),tabla(c[0]||{content:[]})].concat(a.nota?[nota(a.nota)]:[],[new D.Paragraph({children:[]})]);
        case 'figura':
          var lugar={};
          pendientes.push(imagen(a.src).then(function(im){
            var w=Math.min(im.ancho,Math.round(ANCHO/15)),h=Math.round(im.alto*w/im.ancho);
            if(h>600){w=Math.round(w*600/h);h=600}
            lugar.img=new D.ImageRun({type:im.type,data:im.data,transformation:{width:w,height:h},altText:{title:a.titulo||'Imagen',description:a.alt||a.titulo||'',name:'imagen'}});
          },function(){}));
          return [{__imagen:lugar}].concat(a.titulo?[new D.Paragraph({style:'Pie',children:[new D.TextRun({text:a.titulo,italics:true})]})]:[],[new D.Paragraph({children:[]})]);
        case 'indice':
          return [new D.TableOfContents('Índice',{hyperlink:true,headingStyleRange:'1-2'})];
        /* Los bloques sin contenido propio (plan de pagos, bloques de la tienda) van como su texto */
        default:
          if(c.length)return bloques(c,{dentro:true});
          var tx=AT.bloques.textoDe(n);
          return String(tx||'').split('\n').filter(function(l){return l.trim()}).map(function(l){
            return new D.Paragraph({children:[new D.TextRun({text:l.trim()})]});
          });
      }
    }
    /* «Tabla 1» en negritas y el título al lado; el número va escrito (un campo SEQ fuera de Word saldría vacío) */
    function leyenda(et,titulo,x){
      return new D.Paragraph({style:'Leyenda',keepNext:true,keepLines:true,children:[
        new D.TextRun({text:et+' '+(x?x.n:''),bold:true})].concat(titulo?[new D.TextRun({text:'. '+titulo})]:[])});
    }
    function nota(t){return new D.Paragraph({style:'Pie',children:[new D.TextRun({text:'Nota.',italics:true}),new D.TextRun(' '+t)]})}
    function tabla(t){
      var filas=(t.content||[]),borde={style:D.BorderStyle.SINGLE,size:4,color:'999999'};
      var cols=Math.max(1,Math.max.apply(null,filas.map(function(f){return (f.content||[]).length}).concat([1])));
      return new D.Table({width:{size:ANCHO,type:D.WidthType.DXA},layout:D.TableLayoutType.FIXED,columnWidths:Array.apply(null,Array(cols)).map(function(){return Math.floor(ANCHO/cols)}),
        borders:{top:borde,bottom:borde,left:borde,right:borde,insideHorizontal:borde,insideVertical:borde},
        rows:filas.map(function(f,i){
          var cab=(f.content||[]).every(function(x){return x.type==='tableHeader'});
          return new D.TableRow({tableHeader:cab&&i===0,children:(f.content||[]).map(function(cel){
            var ps=(cel.content||[]).map(function(x){return new D.Paragraph({style:'Tabla',children:x.type==='paragraph'?runs(x.content,cab?{bold:true}:null):[new D.TextRun(textoPlano(x))]})});
            return new D.TableCell({children:ps.length?ps:[new D.Paragraph({style:'Tabla',children:[]})],columnSpan:(cel.attrs||{}).colspan>1?cel.attrs.colspan:undefined,
              shading:cab?{type:D.ShadingType.CLEAR,color:'auto',fill:'F2F2F2'}:undefined,margins:{top:60,bottom:60,left:100,right:100}});
          })});
        })});
    }

    var cuerpo=[new D.Paragraph({heading:D.HeadingLevel.TITLE,children:[new D.TextRun(doc.titulo||'Sin título')]})];
    var props=(doc.props||[]).filter(function(p){return p&&p.nombre&&String(p.valor||'').trim()});
    props.forEach(function(p){cuerpo.push(new D.Paragraph({style:'Propiedad',children:[new D.TextRun({text:p.nombre+': ',bold:true}),new D.TextRun(String(p.valor))]}))});
    if(props.length)cuerpo.push(new D.Paragraph({children:[]}));
    cuerpo=cuerpo.concat(bloques((doc.contenido||{}).content,{}));

    return Promise.all(pendientes).then(function(){
      /* Las imágenes se ponen en su lugar ya cargadas */
      cuerpo=cuerpo.map(function(x){
        return x&&x.__imagen?new D.Paragraph({alignment:D.AlignmentType.CENTER,keepNext:true,children:x.__imagen.img?[x.__imagen.img]:[new D.TextRun({text:'(Imagen no disponible)',italics:true})]}):x;
      });
      var pie={default:new D.Footer({children:[new D.Paragraph({alignment:D.AlignmentType.RIGHT,children:[new D.TextRun({children:[D.PageNumber.CURRENT],font:LETRA,size:18,color:'595959'})]})]})};
      var documento=new D.Document({
        creator:'OneBook',title:doc.titulo||'Sin título',lastModifiedBy:'OneBook',
        features:{updateFields:true},
        footnotes:notas,
        numbering:{config:[{reference:'numerada',levels:[{level:0,format:'decimal',text:'%1.',alignment:D.AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}]},
        styles:{
          default:{
            document:{run:{font:LETRA,size:TAM,color:negro},paragraph:{spacing:{line:LINEA,lineRule:'auto',before:0,after:120}}},
            heading1:{run:{font:LETRA,size:32,bold:true,color:negro},paragraph:{spacing:{before:360,after:120},keepNext:true}},
            heading2:{run:{font:LETRA,size:26,bold:true,color:negro},paragraph:{spacing:{before:240,after:80},keepNext:true}},
            title:{run:{font:LETRA,size:44,bold:true,color:negro},paragraph:{spacing:{after:240}}},
            hyperlink:{run:{color:'1F4E79',underline:{}}},
            footnoteText:{run:{font:LETRA,size:18},paragraph:{spacing:{line:240,lineRule:'auto'}}}
          },
          paragraphStyles:[
            {id:'Lista',name:'Lista',basedOn:'Normal',paragraph:{spacing:{line:LINEA,lineRule:'auto',after:60}}},
            {id:'Cita',name:'Cita',basedOn:'Normal',run:{italics:true},paragraph:{indent:{left:720}}},
            {id:'Propiedad',name:'Propiedad',basedOn:'Normal',paragraph:{spacing:{after:40}}},
            {id:'Leyenda',name:'Leyenda',basedOn:'Normal',next:'Normal',paragraph:{keepNext:true,spacing:{before:120,after:60}}},
            {id:'Pie',name:'Pie de imagen o tabla',basedOn:'Normal',run:{size:20,color:'404040'},paragraph:{spacing:{before:60,after:120}}},
            {id:'Tabla',name:'Texto de tabla',basedOn:'Normal',run:{size:20},paragraph:{spacing:{line:240,lineRule:'auto',after:0}}},
            {id:'Codigo',name:'Código',basedOn:'Normal',run:{font:'Consolas',size:20},paragraph:{spacing:{line:240,lineRule:'auto',before:120,after:120}}},
            {id:'NotaPie',name:'Nota al pie',basedOn:'Normal',run:{size:18},paragraph:{spacing:{line:240,lineRule:'auto',after:0}}}
          ]
        },
        sections:[{
          properties:{page:{size:{width:PAPEL.width,height:PAPEL.height,orientation:HORIZ?D.PageOrientation.LANDSCAPE:D.PageOrientation.PORTRAIT},
            margin:{top:M,right:M,bottom:M,left:M,header:720,footer:720}}},
          footers:pie,
          children:cuerpo
        }]
      });
      return D.Packer.toBlob(documento).then(function(blob){return {blob:blob,nombre:nombreArchivo(doc)}});
    });
  });
}

function descargar(doc){
  return exportar(doc).then(function(r){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(r.blob);a.download=r.nombre;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
    return r.nombre;
  });
}
AT.exportarDocx={exportar:exportar,descargar:descargar,cargar:cargar};
})();
