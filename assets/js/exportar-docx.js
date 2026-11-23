/* OneBook: exportar una tesis a Word (DOCX). Hito T4.
   AT.exportarDocx(doc) → Promise<{blob, nombre}>. Usa docx (assets/vendor/docx.min.js, window.Docx), que se carga
   la primera vez que se exporta. El archivo sigue la plantilla genérica de APA y el formato de doc.formato:
   - Tres secciones: portada sin número; preliminares con números romanos; cuerpo con números arábigos desde 1,
     arriba a la derecha. Cada capítulo empieza en una página nueva.
   - Estilos de Word de verdad (Título 1 y 2, texto con sangría de primera línea, bibliografía con sangría francesa),
     así el índice es un campo de Word que se actualiza, y los de figuras y tablas salen de sus leyendas.
   - Figuras (WebP se convierte a PNG), tablas con líneas como pide APA, ecuaciones como ecuaciones nativas de Word
     (latexToMath), notas al pie de Word, citas y bibliografía en el estilo del documento.
   - La huella del texto (la misma de la constancia de autoría) va en las propiedades del archivo.
   Se carga en documento.html, después de entrega.js. */
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
  var s=(doc.titulo||'tesis').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return (s||'tesis')+'.docx';
}

function exportar(doc){
  return cargar().then(function(D){
    var p=AT.entrega.partes(doc),f=p.formato,piezas=AT.piezas?AT.piezas.numerar(doc.contenido):{lista:[],por:{},secciones:[]};
    var LETRA=f.letra==='arial'?'Arial':'Times New Roman',LINEA=f.interlineado==='1.5'?360:480,TAM=24;
    var PAPEL=f.papel==='a4'?{width:11906,height:16838}:{width:12240,height:15840};
    var M=1440,IZQ=f.margen==='encuadernar'?2268:M,ANCHO=PAPEL.width-IZQ-M;
    var notas={},nNota=0,listas=0,secciones=[];

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
          var r=new D.TextRun(o);
          var href=ms.link&&AT.bloques.hrefSeguro(ms.link.href);
          out.push(href&&/^https?:|^mailto:/i.test(href)?new D.ExternalHyperlink({link:href,children:[new D.TextRun(Object.assign({},o,{style:'Hyperlink'}))]}):r);
        }else if(n.type==='hardBreak')out.push(new D.TextRun({break:1}));
        else if(n.type==='referencia')out.push(new D.TextRun(Object.assign({text:AT.fuentes.cita(a,doc.fuentes,doc)},extra||{})));
        else if(n.type==='cita')out.push(new D.TextRun(Object.assign({text:a.texto||''},extra||{})));
        else if(n.type==='refCruzada')out.push(new D.TextRun(Object.assign({text:AT.piezas.etiqueta(piezas.por[a.destino])},extra||{})));
        else if(n.type==='notaPie'){nNota++;notas[nNota]={children:[new D.Paragraph({style:'NotaPie',children:[new D.TextRun(String(a.texto||''))]})]};out.push(new D.FootnoteReferenceRun(nNota))}
        else if(n.type==='formula')out.push(matematica(a.latex));
      });
      return out;
    }
    function matematica(latex){
      try{return new D.Math({children:D.latexToMath(String(latex||''))})}
      catch(e){return new D.TextRun({text:String(latex||''),italics:true})}
    }
    function textoPlano(n){return AT.bloques.textoDe(n).replace(/\s+/g,' ').trim()}

    /* ---------- Bloques ---------- */
    var pendientes=[];/* imágenes que se cargan antes de armar el documento */
    function bloques(lista,ctx){
      var out=[];
      (lista||[]).forEach(function(n,i){out=out.concat(bloque(n,ctx,i))});
      return out;
    }
    function nuevaPagina(ctx){var s=ctx.primero;ctx.primero=false;return !s}
    function bloque(n,ctx,i){
      var a=n.attrs||{},c=n.content||[];
      switch(n.type){
        case 'paragraph':
          if(!c.length&&ctx.nivel===0)return [];
          return [new D.Paragraph(Object.assign({style:ctx.nivel?'TextoSinSangria':'Cuerpo',children:runs(c)},ctx.cita?{indent:{left:720}}:{}))];
        case 'heading':
          var h2=a.level!==3;
          return [new D.Paragraph({heading:h2?D.HeadingLevel.HEADING_1:D.HeadingLevel.HEADING_2,pageBreakBefore:h2&&ctx.capitulos?nuevaPagina(ctx):false,children:runs(c)})];
        case 'bulletList':case 'orderedList':case 'taskList':
          var inst=++listas;
          return c.map(function(li){
            var t=n.type==='taskList'?((li.attrs||{}).checked?'☑ ':'☐ '):'';
            var par=(li.content||[]).filter(function(x){return x.type==='paragraph'});
            var resto=(li.content||[]).filter(function(x){return x.type!=='paragraph'});
            var ps=[new D.Paragraph(Object.assign({style:'Lista',children:(t?[new D.TextRun(t)]:[]).concat(runs((par[0]||{}).content))},
              n.type==='orderedList'?{numbering:{reference:'numerada',level:0,instance:inst}}:n.type==='bulletList'?{bullet:{level:0}}:{}))];
            par.slice(1).forEach(function(x){ps.push(new D.Paragraph({style:'Lista',children:runs(x.content)}))});
            return ps.concat(bloques(resto,{nivel:1}));
          }).reduce(function(x,y){return x.concat(y)},[]);
        case 'blockquote':return bloques(c,{nivel:1,cita:true});
        case 'callout':case 'resumen':return bloques(c,{nivel:1});
        case 'codeBlock':
          return [new D.Paragraph({style:'Codigo',children:String(c.map(function(x){return x.text||''}).join('')).split('\n').map(function(l,k){return new D.TextRun({text:l,break:k?1:0})})})];
        case 'horizontalRule':return [new D.Paragraph({style:'TextoSinSangria',border:{bottom:{style:D.BorderStyle.SINGLE,size:6,color:'999999',space:1}},children:[]})];
        case 'columnas':return c.map(function(col){return bloques(col.content,{nivel:1})}).reduce(function(x,y){return x.concat(y)},[]);
        case 'desplegable':return [new D.Paragraph({style:'TextoSinSangria',children:runs((c[0]||{}).content,{bold:true})})].concat(bloques((c[1]||{}).content,{nivel:1}));
        case 'table':return [tabla(n),new D.Paragraph({style:'TextoSinSangria',children:[]})];
        case 'tablaNumerada':
          var xt=piezas.lista.filter(function(x){return x.clave===a.clave})[0];
          return [leyenda('Tabla',a.titulo,xt)].concat([tabla(c[0]||{content:[]})],a.nota?[nota(a.nota)]:[],[new D.Paragraph({style:'TextoSinSangria',children:[]})]);
        case 'figura':
          var xf=piezas.lista.filter(function(x){return x.clave===a.clave})[0];
          var lugar={par:null};
          pendientes.push(imagen(a.src).then(function(im){
            var w=Math.min(im.ancho,Math.round(ANCHO/15)),h=Math.round(im.alto*w/im.ancho);
            if(h>600){w=Math.round(w*600/h);h=600}
            lugar.img=new D.ImageRun({type:im.type,data:im.data,transformation:{width:w,height:h},altText:{title:a.titulo||'Figura',description:a.alt||a.titulo||'',name:'figura'}});
          },function(){}));
          return [leyenda('Figura',a.titulo,xf),{__imagen:lugar}].concat(a.nota?[nota(a.nota)]:[],[new D.Paragraph({style:'TextoSinSangria',children:[]})]);
        case 'ecuacion':
          var xe=piezas.lista.filter(function(x){return x.clave===a.clave})[0];
          return [new D.Paragraph({style:'TextoSinSangria',tabStops:[{type:D.TabStopType.CENTER,position:Math.round(ANCHO/2)},{type:D.TabStopType.RIGHT,position:ANCHO}],
            children:[new D.Tab(),matematica(a.latex),new D.Tab(),new D.TextRun('('+(xe?xe.n:'')+')')]})];
        case 'bibliografia':
          return AT.fuentes.bibliografia(doc,a.todas).map(function(r){
            return new D.Paragraph({style:'Bibliografia',children:r.trozos.map(function(x){return new D.TextRun({text:x.t,italics:!!x.i})})});
          });
        case 'declaracion':
          var dec=AT.fuentes.declaracion(a,AT.fuentes.autorDe(doc)),outD=[new D.Paragraph({style:'TituloPreliminar',pageBreakBefore:nuevaPagina(ctx),children:[new D.TextRun('Declaración de autoría')]})];
          dec.forEach(function(x){
            if(Array.isArray(x))x.forEach(function(y){outD.push(new D.Paragraph({style:'Lista',bullet:{level:0},children:[new D.TextRun(y)]}))});
            else outD.push(new D.Paragraph({style:'Cuerpo',children:[new D.TextRun(x)]}));
          });
          return outD;
        case 'indice':
          return [new D.Paragraph({style:'TituloPreliminar',pageBreakBefore:nuevaPagina(ctx),children:[new D.TextRun('Índice')]}),
            new D.TableOfContents('Índice',{hyperlink:true,headingStyleRange:'1-2'})];
        case 'indicePiezas':
          var cl=a.clase==='tabla'?'tabla':'figura',l=piezas.lista.filter(function(x){return x.clase===cl});
          if(!l.length)return [];
          var et=cl==='tabla'?'Tabla':'Figura';
          return [new D.Paragraph({style:'TituloPreliminar',pageBreakBefore:nuevaPagina(ctx),children:[new D.TextRun(cl==='tabla'?'Índice de tablas':'Índice de figuras')]}),
            new D.TableOfContents(cl==='tabla'?'Índice de tablas':'Índice de figuras',{hyperlink:true,stylesWithLevels:[new D.StyleLevel('Leyenda'+et,1)],
              cachedEntries:l.map(function(x){return {title:et+' '+x.n+(x.titulo?' '+x.titulo:''),level:1}})})];
        case 'repaso':
          return (a.preguntas||[]).filter(function(q){return q.q}).map(function(q,k){
            return [new D.Paragraph({style:'TextoSinSangria',children:[new D.TextRun({text:(k+1)+'. '+q.q,bold:true})]})].concat((q.o||[]).map(function(o){return new D.Paragraph({style:'Lista',bullet:{level:0},children:[new D.TextRun(o)]})}));
          }).reduce(function(x,y){return x.concat(y)},[]);
        case 'laboratorio':return [new D.Paragraph({style:'TextoSinSangria',children:[new D.TextRun({text:'Laboratorio: '+(a.titulo||''),italics:true})]})];
        /* Los bloques sin contenido propio (plan de pagos, bloques de la tienda) van como su texto */
        default:
          if(c.length)return bloques(c,{nivel:1});
          var tx=AT.bloques.textoDe(n).trim();
          return tx?tx.split('\n').filter(function(l){return l.trim()}).map(function(l){return new D.Paragraph({style:'TextoSinSangria',children:[new D.TextRun({text:l})]})}):[];
      }
    }
    /* APA: «Figura 1» en negritas y, en la línea de abajo, el título en cursiva. El número va escrito (no como campo SEQ,
       que fuera de Word sale vacío) y el estilo de la leyenda arma los índices de figuras y de tablas */
    function leyenda(et,titulo,x){
      return new D.Paragraph({style:'Leyenda'+et,keepNext:true,keepLines:true,children:[
        new D.TextRun({text:et+' '+(x?x.n:''),bold:true}),
        new D.TextRun({text:titulo||'',italics:true,break:1})]});
    }
    function nota(t){return new D.Paragraph({style:'NotaFigura',children:[new D.TextRun({text:'Nota.',italics:true}),new D.TextRun(' '+t)]})}
    function tabla(t){
      var filas=(t.content||[]),borde={style:D.BorderStyle.SINGLE,size:8,color:'000000'},nada={style:D.BorderStyle.NONE,size:0,color:'FFFFFF'};
      var cols=Math.max(1,Math.max.apply(null,filas.map(function(f){return (f.content||[]).length}).concat([1])));
      return new D.Table({width:{size:ANCHO,type:D.WidthType.DXA},layout:D.TableLayoutType.FIXED,columnWidths:Array.apply(null,Array(cols)).map(function(){return Math.floor(ANCHO/cols)}),
        borders:{top:borde,bottom:borde,left:nada,right:nada,insideHorizontal:nada,insideVertical:nada},
        rows:filas.map(function(f,i){
          var cab=(f.content||[]).every(function(x){return x.type==='tableHeader'});
          return new D.TableRow({tableHeader:cab&&i===0,children:(f.content||[]).map(function(cel){
            var ps=(cel.content||[]).map(function(x){return new D.Paragraph({style:'Tabla',children:x.type==='paragraph'?runs(x.content,cab?{bold:true}:null):[new D.TextRun(textoPlano(x))]})});
            return new D.TableCell({children:ps.length?ps:[new D.Paragraph({style:'Tabla',children:[]})],columnSpan:(cel.attrs||{}).colspan>1?cel.attrs.colspan:undefined,
              borders:cab?{bottom:borde}:undefined,margins:{top:40,bottom:40,left:80,right:80}});
          })});
        })});
    }

    /* ---------- Secciones ---------- */
    var portada=[],q=p.portada;
    if(p.academico&&q){
      function lin(t,o){if(t)portada.push(new D.Paragraph(Object.assign({style:'Portada',children:[new D.TextRun(Object.assign({text:t},o&&o.run||{}))]},o&&o.par||{})))}
      lin(q.universidad?q.universidad.toUpperCase():'',{run:{bold:true}});
      lin(q.facultad);
      lin(q.titulo,{run:{bold:true,size:28},par:{spacing:{before:2600}}});
      lin('Tesis',{par:{spacing:{before:1800}}});
      if(q.programa){lin('que para obtener el grado de');lin(q.programa)}
      if(q.autor){lin('Presenta',{par:{spacing:{before:1000}}});lin(q.autor)}
      if(q.asesor){lin('Asesor(a)',{par:{spacing:{before:700}}});lin(q.asesor)}
      lin([q.lugar,q.anio].filter(Boolean).join(', '),{par:{spacing:{before:1800}}});
    }
    var pre=bloques(p.preliminares,{nivel:0,capitulos:true,primero:true});
    var cue=bloques(p.cuerpo,{nivel:0,capitulos:p.academico,primero:true});
    if(!p.academico){
      cue=[new D.Paragraph({heading:D.HeadingLevel.TITLE,children:[new D.TextRun(doc.titulo||'Sin título')]})].concat(cue);
    }

    return Promise.all(pendientes).then(function(){
      /* Las figuras se ponen en su lugar ya con la imagen cargada */
      function poner(l){return l.map(function(x){return x&&x.__imagen?new D.Paragraph({alignment:D.AlignmentType.CENTER,keepNext:true,spacing:{line:240,lineRule:'auto'},children:x.__imagen.img?[x.__imagen.img]:[new D.TextRun({text:'(Imagen no disponible)',italics:true})]}):x})}
      pre=poner(pre);cue=poner(cue);
      function encabezado(){return {default:new D.Header({children:[new D.Paragraph({alignment:D.AlignmentType.RIGHT,children:[new D.TextRun({children:[D.PageNumber.CURRENT],font:LETRA,size:TAM})]})]})}}
      var pagina={size:PAPEL,margin:{top:M,right:M,bottom:M,left:IZQ,header:720,footer:720}};
      if(portada.length)secciones.push({properties:{page:pagina},children:portada});
      if(pre.length)secciones.push({properties:{type:D.SectionType.NEXT_PAGE,page:Object.assign({},pagina,{pageNumbers:{start:1,formatType:D.NumberFormat.LOWER_ROMAN}})},headers:encabezado(),children:pre});
      secciones.push({properties:{type:D.SectionType.NEXT_PAGE,page:Object.assign({},pagina,{pageNumbers:{start:1,formatType:D.NumberFormat.DECIMAL}})},headers:encabezado(),children:cue.length?cue:[new D.Paragraph('')]});
      return AT.autoria?AT.autoria.huella(AT.autoria.contenidoHuella(doc)):'';
    }).then(function(huella){
      var negro='000000',par={spacing:{line:LINEA,lineRule:'auto',before:0,after:0}};
      var documento=new D.Document({
        creator:q&&q.autor||'OneBook',title:doc.titulo||'Sin título',subject:q&&q.programa||'',
        description:huella?'Huella SHA-256 del texto (OneBook): '+huella:'',keywords:'OneBook',lastModifiedBy:q&&q.autor||'OneBook',
        features:{updateFields:true},
        footnotes:notas,
        numbering:{config:[{reference:'numerada',levels:[{level:0,format:'decimal',text:'%1.',alignment:D.AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}]},
        styles:{
          default:{
            document:{run:{font:LETRA,size:TAM,color:negro},paragraph:par},
            heading1:{run:{font:LETRA,size:TAM,bold:true,color:negro},paragraph:{alignment:D.AlignmentType.CENTER,spacing:{line:LINEA,lineRule:'auto',before:0,after:0},keepNext:true}},
            heading2:{run:{font:LETRA,size:TAM,bold:true,color:negro},paragraph:{spacing:{line:LINEA,lineRule:'auto',before:0,after:0},keepNext:true}},
            title:{run:{font:LETRA,size:32,bold:true,color:negro},paragraph:{spacing:{after:240}}},
            hyperlink:{run:{color:negro,underline:{}}},
            footnoteText:{run:{font:LETRA,size:20},paragraph:{spacing:{line:240,lineRule:'auto'}}}
          },
          paragraphStyles:[
            {id:'Cuerpo',name:'Texto de tesis',basedOn:'Normal',next:'Cuerpo',quickFormat:true,paragraph:{indent:{firstLine:720},spacing:{line:LINEA,lineRule:'auto'}}},
            {id:'TextoSinSangria',name:'Texto sin sangría',basedOn:'Normal',paragraph:{spacing:{line:LINEA,lineRule:'auto'}}},
            {id:'Lista',name:'Lista de tesis',basedOn:'Normal',paragraph:{spacing:{line:LINEA,lineRule:'auto'}}},
            {id:'TituloPreliminar',name:'Título de preliminares',basedOn:'Normal',next:'Cuerpo',run:{bold:true},paragraph:{alignment:D.AlignmentType.CENTER,keepNext:true,spacing:{line:LINEA,lineRule:'auto'}}},
            {id:'Portada',name:'Portada',basedOn:'Normal',paragraph:{alignment:D.AlignmentType.CENTER,spacing:{line:360,lineRule:'auto'}}},
            {id:'LeyendaFigura',name:'LeyendaFigura',basedOn:'Normal',next:'Normal',paragraph:{keepNext:true,spacing:{line:LINEA,lineRule:'auto',before:240}}},
            {id:'LeyendaTabla',name:'LeyendaTabla',basedOn:'Normal',next:'Normal',paragraph:{keepNext:true,spacing:{line:LINEA,lineRule:'auto',before:240}}},
            {id:'NotaFigura',name:'Nota de figura o tabla',basedOn:'Normal',run:{size:22},paragraph:{spacing:{line:LINEA,lineRule:'auto'}}},
            {id:'Tabla',name:'Texto de tabla',basedOn:'Normal',run:{size:22},paragraph:{spacing:{line:276,lineRule:'auto'}}},
            {id:'Bibliografia',name:'Bibliografía',basedOn:'Normal',paragraph:{indent:{left:720,hanging:720},spacing:{line:LINEA,lineRule:'auto'}}},
            {id:'Codigo',name:'Código',basedOn:'Normal',run:{font:'Consolas',size:20},paragraph:{spacing:{line:276,lineRule:'auto',before:120,after:120}}},
            {id:'NotaPie',name:'Nota al pie de tesis',basedOn:'Normal',run:{size:20},paragraph:{spacing:{line:240,lineRule:'auto'}}}
          ]
        },
        sections:secciones
      });
      return D.Packer.toBlob(documento).then(function(blob){return {blob:blob,nombre:nombreArchivo(doc),huella:huella}});
    });
  });
}

/* Exporta, descarga y anota la entrega en el registro de autoría */
function descargar(doc){
  return exportar(doc).then(function(r){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(r.blob);a.download=r.nombre;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
    return AT.entrega.registrar(doc,'docx').then(function(){return r.nombre});
  });
}
AT.exportarDocx={exportar:exportar,descargar:descargar,cargar:cargar};
})();
