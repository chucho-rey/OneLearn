"""Genera ayuda.html (guía de herramientas en el formato de bloques). Cada herramienta es un título de nivel 2 con
id ay-<módulo>-<nombre> (núcleo, negocio o rh): ayuda.js lo usa para mostrar solo lo de tu espacio y la
búsqueda (Ctrl K) lo encuentra como sección."""
import json,re,os
# Se corre desde cualquier lugar: python3 herramientas/ayuda/generar.py (escribe ayuda.html en la raíz)
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..'))
n=[0]
def nid():
    n[0]+=1
    return 'ay-b%03d'%n[0]
def runs(t):
    out=[]
    for i,parte in enumerate(re.split(r'\*\*(.+?)\*\*',t)):
        if not parte:continue
        r={'type':'text','text':parte}
        if i%2:r['marks']=[{'type':'bold'}]
        out.append(r)
    return out
def P(t):return {'type':'paragraph','attrs':{'id':nid()},'content':runs(t)}
def H(t,id=None,nivel=2):return {'type':'heading','attrs':{'id':id or nid(),'level':nivel},'content':runs(t)}
def L(pasos,ord=True):
    return {'type':'orderedList' if ord else 'bulletList','attrs':{'id':nid()},'content':[{'type':'listItem','content':[{'type':'paragraph','content':runs(p)}]} for p in pasos]}
def C(t,v='idea'):return {'type':'callout','attrs':{'id':nid(),'variante':v},'content':[{'type':'paragraph','content':runs(t)}]}

def herramienta(mod,clave,titulo,para,pasos,tip=None,mas=None):
    b=[H(titulo,'ay-%s-%s'%(mod,clave)),P(para),L(pasos)]
    if mas:b.append(L(mas,False))
    if tip:b.append(C(tip))
    return b

c=[]
c.append(P('Aquí está cada herramienta de OneBook: para qué sirve y cómo se usa, paso a paso. Usa el índice, el buscador de esta página o **Ctrl K** desde cualquier lugar. Ves las herramientas de tu espacio; con «Ver todas» aparecen también las de los módulos que tienes apagados.'))
c.append({'type':'indice','attrs':{'id':nid()}})

# ---------------- Empezar ----------------
c+=herramienta('nucleo','espacio','Crea tu empresa y sus módulos',
 'Al entrar por primera vez creas tu empresa: su nombre, su giro, tu nombre, sus departamentos y si tienes empleados. Eso decide qué herramientas ves.',
 ['En «Crea tu empresa» escribe el nombre de la empresa, su giro, su teléfono (si quieres) y **tu nombre**: quedas como propietario.',
  'Si tienes empleados, marca **Tengo empleados**: se enciende Recursos humanos.',
  'Revisa los **departamentos** que te sugerimos según el giro: quita los que no quieras y agrega otros.',
  'Elige las páginas con las que quieres empezar y pulsa «Crear mi empresa».',
  'Para cambiarlo después: **Tus datos** (barra lateral) → «Cambiar tu espacio» (solo quien administra la empresa). Ahí enciendes o apagas los módulos: Negocio y dinero y Recursos humanos.'],
 'Apagar un módulo no borra nada: solo deja de mostrar sus herramientas.')
c+=herramienta('nucleo','ejemplo','La empresa de ejemplo',
 'Para conocer OneBook sin capturar nada: Ferretería El Clavo ya trae seis personas en cuatro departamentos, cada uno con su sala, dos meses de ventas, inventario, compras por pagar, gastos, la nómina de su equipo y el Inicio armado.',
 ['En la página de bienvenida, pulsa **Explora una empresa de ejemplo**. Se arma en este navegador en unos segundos y abre su Inicio.',
  'Empieza por la página **Empieza aquí** (en tus favoritas): dice qué probar.',
  'Abajo en la barra lateral, **cambia de persona**: Lupita es la dueña y ve todo; Carlos (Ventas), Rosa (Almacén), Mario (Administración) y Ana (Recursos humanos) ven solo sus salas.',
  'Cuando quieras empezar la tuya, pulsa **Crear mi empresa** en el Inicio y confirma: el ejemplo se borra de este navegador y se abre «Crea tu empresa».'],
 'El ejemplo solo se arma en un navegador sin empresa: si ya tienes la tuya, no la toca. Para verlo sin mezclar nada, ábrelo en una ventana privada (o de incógnito).')
c+=herramienta('nucleo','empresa','Tu empresa: personas y roles',
 'En «Tu empresa» (barra lateral) está la gente que usa OneBook en tu empresa, el rol de cada quien y sus departamentos.',
 ['Pulsa **Agregar persona**: su nombre, su correo (si quieres), su rol y sus departamentos. Puedes ponerle un PIN.',
  'Los roles de la empresa: **Propietario** (hace todo; es quien la creó), **Administrador** (agrega personas y departamentos y les da permisos) y **Miembro** (usa OneBook con los permisos de sus departamentos).',
  'Con **Editar** cambias su nombre, su rol, sus departamentos o su PIN, o la quitas de la empresa (pide confirmar).',
  'El propietario puede pasarle la empresa a otra persona con «Hacerla propietaria»: él queda como administrador.',
  '«Editar datos» cambia el nombre, el giro, el teléfono y el RFC de la empresa.'],
 'Si no administras la empresa, ves a todos y cambias solo tus datos: tu nombre, tu correo y tu PIN.')
c+=herramienta('nucleo','departamentos','Departamentos',
 'Los departamentos agrupan a tu gente: Ventas, Almacén, Administración… Una persona puede estar en varios. Cada departamento tiene su sala con sus páginas, donde solo entra su gente (ver «Salas»).',
 ['En «Tu empresa», pulsa **Agregar departamento**: su nombre, su color y quién está.',
  'Cada persona tiene un rol en el departamento: **Responsable** (lo administra y decide quién está), **Miembro** (entra y edita) o **Consulta** (solo ve).',
  '«Administrar» cambia el nombre, el color y la gente del departamento. Quitar un departamento no quita a las personas de la empresa.',
  'Con Recursos humanos, la base **Empleados** tiene la columna **Departamento** (y «Agregar persona» la pregunta): sus opciones son los departamentos de tu empresa, con su color, y si cambias el nombre de uno, se cambia también ahí.'],
 'Los departamentos los agrega y los quita quien administra la empresa; su responsable puede cambiar su nombre, su color y su gente.')
c+=herramienta('nucleo','salas','Salas',
 'Una sala es un espacio de trabajo con sus páginas. Hay una **General** (toda la empresa la ve y la edita), una por cada departamento y las que hagas entre departamentos. Cada página vive en una sala o en **Privado**, y solo la ven quienes entran a su sala.',
 ['En la barra lateral, **Salas** lista las que ves, con cuántas páginas tiene cada una; la flecha muestra sus páginas ahí mismo. Toca su nombre para abrirla: quién entra, sus páginas y las herramientas que se sugieren para ese departamento.',
  'Arriba de la sala está su **Portada**: avisos, una página, indicadores o una gráfica que arma quien administra la sala (con «Editar», como el Inicio). Si está vacía, los demás no la ven.',
  'En la sala de un departamento, su **responsable** la administra, sus **miembros** editan y los de **consulta** solo ven. Quien administra la empresa entra a todas.',
  '«Administrar sala» agrega otros departamentos (que editan o solo ven) y personas sueltas. Una sala entre departamentos también tiene nombre y color, y la crean quien administra la empresa y los responsables (en «Tu empresa» → «Agregar sala»).',
  '**Nueva página aquí** crea la página en esa sala. En «Crear», **¿Dónde?** elige la sala (o Privado); empieza en la sala donde estás.',
  'Para cambiar una página de sala: en la página, «⋯» → **Mover a otra sala** (quien la administra).',
  'Si abres una página de una sala donde no estás, verás «No tienes acceso» y podrás **pedir acceso** a quien la administra.'],
 'Una sala con páginas no se quita: muévelas antes. Si quitas un departamento, su sala se queda con sus páginas y con la misma gente.')
c+=herramienta('nucleo','persona','Cambiar de persona y tu PIN',
 'Si varias personas usan OneBook en la misma computadora, cada quien entra como sí misma: así sus páginas, sus permisos y «Modificado por» son suyos.',
 ['Abajo en la barra lateral está tu nombre. Tócalo para abrir **¿Quién usa OneBook?**',
  'Elige a la persona. Si tiene PIN, escríbelo y pulsa «Entrar». La página se vuelve a abrir como esa persona (antes se guarda lo pendiente).',
  'Para ponerte un PIN: en «Tu empresa», pulsa «Editar» en tu nombre y escribe un PIN de 4 a 8 números (dos veces).',
  'Si la computadora no sabe quién eres, el Inicio te pide que elijas tu nombre.'],
 'El PIN ordena quién entra como quién, pero no es una contraseña: quien tiene el navegador tiene los datos. Con la nube, cada persona entrará con su propia cuenta.')
c+=herramienta('nucleo','inicio','El Inicio y sus tableros',
 'Es lo primero que ves al abrir OneBook. Arriba están **Tus páginas** (el explorador); después, dos tableros de módulos que tú armas: **De tu empresa** (lo que ven todos) y **Lo tuyo** (solo para ti), y «Prepara tu negocio».',
 ['Mientras nadie lo arma, **De tu empresa** trae los accesos rápidos y **Mi negocio** (y **Tu equipo**, con Recursos humanos), y **Lo tuyo**, tus favoritas y recientes y tus salas.',
  'Pulsa **Editar** en un tablero. Cada módulo muestra sus botones: mover antes o después, su **tamaño** (chico, mediano o grande), configurar y quitar. También puedes **arrastrarlo**. Los cambios se guardan solos; «Listo» esconde los botones.',
  '**Agregar** abre el catálogo de módulos: accesos rápidos, **una página** (sus bloques, vivos), indicadores, próximos vencimientos, inventario, **gráfica de una base** (agrupada por la columna que elijas), tu equipo, **avisos** para todos, actividad reciente, tus salas, favoritas y recientes y, en «Lo tuyo», una **nota** que se guarda sola.',
  '**Mi negocio** y **Tu equipo** son páginas de bloques: «Editar esta página» (abajo del módulo) las abre para agregar o quitar bloques.',
  '**Prepara tu negocio**: una lista de primeros pasos que se marca sola.',
  '**Tus páginas**, hasta arriba: el explorador con todas tus páginas (ver «Tus páginas: el explorador»).'],
 'El tablero de la empresa lo arma quien la administra; los demás lo ven tal cual. «Lo tuyo» es de cada persona. Cada sala tiene también su **Portada**, que arma quien administra la sala. Un módulo con una página que alguien no puede ver no se le muestra.')
c+=herramienta('nucleo','explorador','Tus páginas: el explorador',
 'En el Inicio, «Tus páginas» funciona como un explorador de archivos: todas tus páginas en una tabla, con su información en columnas. Dónde mirar lo eliges en la barra lateral.',
 ['En la barra lateral, en **Tus páginas**, eliges dónde mirar: todas, **Favoritas**, **Recientes** (7 días), **Compartidas** o un tipo (negocio, recursos humanos y otras); cada una dice cuántas páginas tiene. Si te comparten páginas o te piden permisos, aparecen «Compartidas contigo» y «Solicitudes». Arriba del explorador dice dónde estás.',
  'Columnas: **Nombre**, **Modificado** (cuándo y quién), **Tipo**, **Trabajando ahora** (quién la tiene abierta y si edita o lee), **Permisos** y **Tamaño**. Toca un encabezado para ordenar; con «Columnas» escondes las que no uses.',
  'Busca con el cuadro «Buscar en tus páginas» (sin importar mayúsculas ni acentos) y cambia entre **Detalles** y **Tarjetas**.',
  'Para abrir una página, toca su nombre (o doble clic en la fila). Para seleccionar, usa la casilla, un clic en la fila (Ctrl o Mayús + clic para varias) o la barra espaciadora; con algo seleccionado aparecen «Abrir», «Favorita» y «Papelera».',
  'Cada página tiene su menú en «⋯» o con clic derecho: abrir en otra pestaña, favorita, personas y permisos, historial de versiones, duplicar y papelera.'],
 'Con el teclado: las flechas arriba y abajo cambian de página, Enter la abre, la barra espaciadora la selecciona, Ctrl + A selecciona todas y Mayús + F10 abre su menú.')
c+=herramienta('nucleo','crear','Crear una página',
 'Cada página nace de una plantilla con los bloques que necesitas, o en blanco.',
 ['Pulsa **Crear** en la barra lateral (o «+ Crear» en el Inicio).',
  'Elige una plantilla por categoría o búscala por nombre. Cada una dice qué trae.',
  'Los **paquetes por giro** crean varias páginas de una vez (por ejemplo, tienda: corte, inventario, reporte, fiado y proveedores).',
  'Para reutilizar una página tuya: en la página, «⋯» → «Guardar como plantilla». Aparece en **Mis plantillas**.'])
c+=herramienta('nucleo','escribir','Escribir y bloques',
 'Una página es una lista de bloques: texto, títulos, listas, tablas y bloques especiales como el corte de caja o una base de datos.',
 ['Escribe directo. Para insertar un bloque, escribe **/** al empezar una línea y elige (también con «+ Insertar» en la barra de herramientas).',
  'Atajos de escritura: «# » título, «- » lista, «1. » lista numerada, «[ ] » casilla y «> » cita.',
  'Arrastra un bloque desde el asa que aparece a su izquierda para moverlo.',
  'Todo se guarda solo mientras escribes; arriba dice «Guardado».'],
 'Ctrl Z deshace y Ctrl Shift Z rehace, también dentro de las tablas y bases de datos.')
c+=herramienta('nucleo','leer','Leer, imprimir y compartir',
 'Cada página se puede leer sin distracciones, imprimir o guardar en PDF y descargar.',
 ['**Leer** (arriba a la derecha) muestra la página sin la barra de edición; ahí puedes marcar pagos o abonos.',
  '«⋯» → **Imprimir o exportar**: un **PDF** con números de página (carta o A4, vertical u horizontal, con los bloques como hojas de papel) o un archivo de **Word** para seguir editándolo.',
  '«⋯» → **Descargar**: en Markdown o como copia de la página para importarla en otro navegador.',
  '«⋯» → **Ancho completo** usa todo el ancho de la pantalla; la estrella la marca como **favorita**.'])
c+=herramienta('nucleo','papelera','Papelera',
 'Lo que borras va a la papelera y se puede recuperar durante 30 días.',
 ['En una página: «⋯» → «Mover a la papelera».',
  'Para recuperarla: **Tus datos** → «Papelera» → «Restaurar».',
  'Pasados 30 días, o con «Vaciar papelera», se borra para siempre.'])
c+=herramienta('nucleo','versiones','Historial de versiones',
 'Cada página guarda sus versiones sola: puedes ver cómo estaba, qué cambió y recuperar una versión completa o solo un bloque.',
 ['En la página, «⋯» → **Historial de versiones**.',
  'A la izquierda están las versiones por día, con la hora, por qué se guardó y qué cambió. Elige una para verla.',
  'Con «Marcar lo que cambió desde entonces» ves lo que **ya no está** (en rojo) y lo que **cambió** (en amarillo, con «Ver qué cambió» palabra por palabra).',
  '«Recuperar este bloque» regresa solo ese bloque; «Volver a como estaba» deshace los cambios de un bloque.',
  '«Restaurar esta versión» deja toda la página como estaba (la de ahora se guarda antes, así que puedes deshacerlo); «Copiar como página nueva» la abre aparte sin tocar la tuya.',
  'Escribe un nombre y pulsa «Guardar versión» antes de un cambio grande: las versiones con nombre no se borran solas.'],
 'Se guarda una versión cada 5 minutos mientras escribes, antes de borrar mucho, al salir de la página y antes de importar un respaldo. Solo se guardan los bloques que cambian, así que ocupa poco. Después de un día quedan una por día y, después de un mes, una por semana. Las filas de las bases de datos no entran: tienen su propio deshacer.')
c+=herramienta('nucleo','permisos','Personas y permisos',
 'Cada página tiene su lista de personas con acceso y lo que cada una puede hacer. Hoy OneBook vive en tu navegador; con las cuentas en la nube, esta lista será la que decida quién entra.',
 ['Ábrela con la columna **Permisos** del explorador, con «⋯» → «Personas y permisos» en la página, o con «Pedir permiso para editar» si solo puedes verla.',
  'Los permisos: **Propietario** (todo), **Administrador** (edita y decide quién más entra), **Puede editar** y **Solo puede ver**.',
  'Una página la ven quienes entran a su **sala** (o, en Privado, solo su propietario). Esta lista agrega a otras personas: por ejemplo, alguien de otro departamento.',
  'Si administras la página: dale acceso a **alguien de tu empresa** (entra directo, en esta misma computadora) o invita a alguien con su correo; cambia el permiso de cada quien, quítale el acceso y **aprueba o rechaza** las solicitudes.',
  'Si no la administras: verás tu permiso y podrás **pedir más** (con un mensaje). Las solicitudes llegan a «Solicitudes» en el explorador de quien la administra.',
  '«Pon tu nombre» (o «Cambiar tu nombre») es como te verán los demás.'],
 'Por ahora, las invitaciones y solicitudes quedan anotadas en la página y viajan con tus respaldos; llegarán solas cuando OneBook tenga cuentas en la nube, y los avisos (notificaciones) después. Una página que solo puedes ver se abre para leer.')
c+=herramienta('nucleo','buscar','Buscar',
 'Encuentra cualquier página, sección o herramienta de la ayuda.',
 ['Pulsa **Ctrl K** (Cmd K en Mac) o «Buscar» en la barra lateral.',
  'Escribe unas letras: busca en títulos y en el texto, sin importar acentos.',
  'Usa las flechas y Enter para abrir el resultado.'])
c+=herramienta('nucleo','barra','La barra lateral y las pestañas',
 'La barra lateral te lleva a todo, y **Tus páginas** funciona como un explorador; en escritorio se puede hacer compacta.',
 ['**Tus páginas**: arriba, las ubicaciones con cuántas páginas tiene cada una (todas, favoritas, recientes, compartidas); en el Inicio cambian el explorador y, desde otra página, abren el Inicio ahí. Después, **Salas**: la flecha junto a cada sala muestra sus páginas, colgadas de una línea del color de su departamento, y el nombre abre la sala. Al final, **Por tipo** y la **Papelera**.',
  'Con el teclado: las flechas arriba y abajo recorren la lista; la derecha abre una sala (o entra a sus páginas) y la izquierda la cierra (o sube a la sala). Las salas que dejes abiertas se quedan así.',
  'El botón de la barra (junto al logo) la **contrae**: quedan solo los iconos y su nombre sale al pasar el puntero. El mismo botón la vuelve a expandir.',
  'En celular, el botón de menú (arriba a la izquierda) la abre.',
  '**Abrir en pestañas** trabaja con varias páginas abiertas a la vez, como en un navegador. Con clic central o Ctrl + clic, un enlace se abre en otra pestaña.'])
c+=herramienta('nucleo','lectura','Lectura y accesibilidad',
 'Ajusta OneBook a tus ojos y a tu forma de leer.',
 ['Pulsa **Aa** (arriba a la derecha).',
  'Elige tamaño de letra, tema claro u oscuro, alto contraste, la letra OpenDyslexic, el espacio entre líneas y el ancho de la columna.',
  'El **modo zen** (tecla Z en una página) esconde todo menos el texto.',
  'La tecla **?** muestra los atajos de teclado.'],
 'Todo se puede usar solo con teclado y con lector de pantalla.')
c+=herramienta('nucleo','celular','OneBook en el celular',
 'En el celular, el Inicio funciona como una app de archivos: tus salas son carpetas y adentro están sus páginas.',
 ['Abajo hay tres secciones: **Páginas** (tus carpetas), **Inicio** (los tableros de tu empresa y los tuyos) y **Empresa** (quién eres, Tu empresa, las salas, Lectura, Tus datos y Ayuda).',
  'En **Páginas**, toca una carpeta para ver sus páginas. Cada sala lleva el color de su departamento; también están Privado, Favoritas y la Papelera.',
  'Arriba ves la ruta (Tus páginas › Ventas). Toca «Tus páginas» o el botón Atrás del celular para subir.',
  'Ordena las páginas por **Más recientes** o **Por nombre**, y toca **⋯** junto a una página para abrirla en otra pestaña, marcarla favorita, compartirla, duplicarla o mandarla a la papelera.',
  'El botón **+** crea una página en la carpeta donde estás.',
  'Busca con la barra de arriba: encuentra páginas de todas tus salas.'],
 'En una computadora (más de 900 px de ancho) se ve el explorador completo, con columnas, y los tableros debajo.')
c+=herramienta('nucleo','datos','Tus datos y respaldos',
 'Todo lo que haces se guarda en este navegador, en este dispositivo. Nada se sube a internet.',
 ['**Tus datos** → «Descargar respaldo» guarda un archivo con todo: páginas, bases de datos, plantillas y ajustes.',
  'En otro dispositivo o navegador: «Importar respaldo» con ese archivo.',
  'El Inicio te recuerda descargar un respaldo cada dos semanas.',
  'Para usar OneBook sin internet, instálalo como app desde el menú del navegador («Instalar» o «Agregar a la pantalla de inicio»).',
  'Para empezar de cero: **Tus datos** → «Eliminar todos los datos» → «Sí, eliminar todo». Se borran tus páginas, bases, plantillas, la papelera, tu empresa y tus ajustes de este navegador, y vuelves a «Crea tu empresa». No se puede deshacer: descarga antes un respaldo si quieres conservar algo.'],
 'Si borras los datos del navegador se borra lo que no esté respaldado. Guarda tus respaldos en otro lugar.','')

# ---------------- Negocio ----------------
c+=herramienta('negocio','cajachica','Caja chica',
 'El efectivo que entregan las sucursales y los pagos o compras que salen de la misma caja, con el saldo después de cada movimiento. Se hace una por mes.',
 ['Crea «Caja chica» (Crear → Para tu negocio). Se llama con el mes, por ejemplo «Caja chica de noviembre de 2026».',
  'Revisa el **Saldo inicial** arriba de la tabla: viene del saldo final de la caja chica anterior. Si es la primera, escríbelo.',
  'Agrega un movimiento con **+ Nueva**: concepto, fecha, sucursal, proveedor, **Ingreso** o **Egreso** y el monto (siempre en positivo). El **Número de movimiento** se pone solo.',
  'La columna **Saldo** es el saldo de la fila anterior más el ingreso o menos el egreso. Arriba ves el saldo inicial, los ingresos, los egresos y el saldo final.',
  'Al empezar el mes, crea otra «Caja chica»: arranca con el saldo final de la anterior.'],
 'El saldo sigue el número de movimiento, no el orden en que ves la tabla: puedes ordenar o filtrar sin que cambie. Las sucursales se agregan en las opciones de la columna «Sucursal».')
c+=herramienta('negocio','cedis','Pedidos al Cedis',
 'Si tienes un Cedis (almacén central) que surte a tus sucursales: cada sucursal te manda su pedido con un enlace por WhatsApp o correo, y tú ves el total por insumo, confirmas lo que surtes e imprimes las hojas de surtido. Ninguna sucursal ve lo de otra.',
 ['En el Cedis, crea «Cedis: pedidos de sucursales» (Crear → Para tu negocio). Trae insumos y sucursales de ejemplo: cámbialos por los tuyos en sus tablas. En **Ajustes** pones el nombre del Cedis, la hora de corte y los días de entrega.',
  'Junto a cada sucursal, toca **Invitar** y mándale el enlace por WhatsApp o correo. Cada sucursal tiene su propia clave.',
  'La sucursal abre el enlace en su celular o computadora: si no tiene OneBook, se crea su espacio. Queda su página «Pedido a …» con el formato.',
  'En la sucursal: escribe las cantidades (respeta el mínimo y de cuánto en cuánto va cada insumo), la fecha de entrega y notas, y toca **Enviar al Cedis**. Si cambias algo, vuelve a enviarlo: reemplaza al anterior.',
  'En el Cedis, abre el enlace que te llegó y toca **Agregar a los pedidos**. Si no se abre solo, usa **Pegar enlace**. El consolidado suma cada insumo por sucursal y dice quién falta y quién llegó tarde.',
  'Toca **Confirmar** para poner lo que sí surtes (y una nota, como «sin existencia»); la confirmación se manda a la sucursal con otro enlace. Después, **Marcar surtido**.',
  'Imprime las **Hojas de surtido** (una por sucursal, con firmas), la **Lista de compra** o descarga el **CSV** del consolidado.'],
 'Los enlaces van firmados con la clave de cada sucursal: si alguien cambia un pedido o lo manda a nombre de otra sucursal, OneBook lo rechaza. Si una invitación llegó a quien no debía, usa **Invitación → Cambiar clave**. Si cambias los insumos, la sucursal aparece con «Formato viejo»: toca **Mandar formato**. Todo se guarda en cada dispositivo; con la nube, los pedidos llegarán solos.')
c+=herramienta('negocio','corte','Corte de caja',
 'Al cerrar el día: fondo, ventas, retiros y efectivo contado. Te dice si la caja cuadra.',
 ['Crea la página «Corte de caja» (o usa la acción rápida «Corte de hoy»).',
  'Escribe el fondo con el que abriste y las ventas del día (efectivo, tarjeta, transferencia).',
  'Anota las entradas y salidas de efectivo (retiros, pagos a proveedores).',
  'Cuenta el efectivo por billete y moneda: el corte dice si sobra o falta.'],
 'Un corte por día. Para el de mañana, la acción rápida agrega uno nuevo en la misma página.')
c+=herramienta('negocio','fiado','Fiado',
 'Quién te debe, lo que se lleva, sus abonos y su saldo.',
 ['Crea la página «Fiado» o usa «Anotar fiado» en el Inicio.',
  'Agrega a cada cliente con su teléfono.',
  'Anota lo que se lleva (cargo) o lo que te paga (abono) y pulsa Enter.',
  'Al leer la página también puedes anotar abonos.'])
c+=herramienta('negocio','gastos','Gastos del mes',
 'Lo que sale, por categoría, con el total del mes.',
 ['Crea la página «Gastos del mes» o usa «Anotar un gasto».',
  'Anota cada gasto con su fecha, concepto, categoría y monto.',
  'Los **gastos fijos** (renta, luz, internet) se anotan una vez; «Generar mes» los agrega cada mes.'])
c+=herramienta('negocio','venta','Nota de venta',
 'Un recibo con folio, conceptos, IVA, total y cambio, para imprimir o mandar.',
 ['Usa «Nueva venta» en el Inicio: crea la nota con el folio siguiente y la fecha de hoy.',
  'Escribe los conceptos: si tienes Inventario, elige el producto y toma su precio (y te dice cuántos quedan).',
  'Indica si cobras IVA y cuánto te pagaron: calcula el cambio.',
  'Imprímela o guárdala en PDF. Al guardarse, descuenta del inventario lo vendido.'])
c+=herramienta('negocio','precio','Precio de venta',
 'Calcula a cuánto vender con la ganancia que quieres, el IVA y la comisión de la tarjeta, o cuánto ganas con un precio que ya tienes.',
 ['Inserta «Precio de venta» con «/» (o crea la página «Precios de venta»).',
  'Escribe lo que te cuesta y cuánto quieres ganar (o el precio que ya tienes).',
  'Marca si cobras IVA y la comisión de tu terminal o plataforma.',
  'Puedes redondear el precio a $0.50, $1, $5 o $10.'])
c+=herramienta('negocio','porpagar','Cuentas por pagar',
 'Lo que les debes a tus proveedores y cuándo vence.',
 ['Crea la página «Proveedores» o inserta «Cuentas por pagar».',
  'Anota a quién le debes, cuánto y cuándo vence; marca lo pagado.',
  'Lo que vence pronto sale en «Próximos vencimientos».'])
c+=herramienta('negocio','pagos','Plan de pagos',
 'Una deuda o una venta a plazos: cuánto es cada pago, cuándo y cuánto falta.',
 ['Inserta «Plan de pagos» con «/» o crea «Préstamo o crédito».',
  'Escribe el monto y el número de pagos (o la cuota) y la frecuencia.',
  'Al leer la página, marca cada pago al hacerlo.'])
c+=herramienta('negocio','inventario','Inventario',
 'Tus productos con su costo, precio y existencias, que se calculan solas: lo que tenías, más lo que entra, menos lo que vendes.',
 ['Crea la página «Inventario». Trae Productos, Entradas y salidas, Compras y el resumen.',
  'Anota cada producto con su costo, precio, cuántos tenías al empezar y el mínimo.',
  'Cuando llega mercancía, usa «Registrar entrada» (o «Importar factura XML»). Las notas de venta restan lo vendido.',
  'El resumen dice el valor del inventario, lo que está bajo el mínimo o agotado, y con «Hacer pedido» arma la página del pedido para cada proveedor.'],
 'Las tablas del inventario son las mismas en todas tus páginas: si las muestras en otra página, ves los mismos datos.')
c+=herramienta('negocio','factura','Importar la factura XML del proveedor',
 'Con el XML de la factura (CFDI 4.0 o 3.3), OneBook anota la compra, las entradas y el costo nuevo de cada producto.',
 ['En el resumen del inventario, pulsa «Importar factura XML» y elige el archivo.',
  'Revisa cada concepto: OneBook propone el producto por código o nombre; puedes crear uno nuevo o decir que no es de inventario.',
  'Confirma: la compra queda pagada (PUE) o por pagar con su vencimiento (PPD). La misma factura no se importa dos veces.'])
c+=herramienta('negocio','reporte','Reportes',
 'Tus ventas, compras o gastos por mes, producto o proveedor, comparados con el periodo anterior y con gráfica.',
 ['Crea «Reporte del mes» o inserta «Reporte» con «/» en cualquier página con una base de datos.',
  'En «Ajustar reporte» elige la base, cómo agrupar (por un campo o dos), qué sumar o contar y el periodo.',
  'Activa «Comparar con el periodo anterior» o un presupuesto.',
  '«Presentar» lo muestra en pantalla completa, como diapositivas.'])
c+=herramienta('negocio','indicadores','Indicadores y próximos vencimientos',
 'Tus cifras clave con su flecha de cambio, y lo que vence en los próximos días.',
 ['Inserta «Indicadores» con «/»: ventas del mes, valor del inventario, compras por pagar y más; «Ajustar» cambia cuáles.',
  'Inserta «Próximos vencimientos»: junta lo que vence de tus bases, planes de pago y cuentas por pagar, lo vencido primero.'])
c+=herramienta('negocio','presupuesto','Presupuesto del mes',
 'Cuánto quieres gastar por categoría y cuánto llevas: lo disponible sale en rojo si te pasas.',
 ['Crea «Presupuesto del mes».',
  'En «Presupuesto» escribe cuánto quieres gastar al mes en cada categoría.',
  'En «Gastos» anota lo que gastas: el reporte compara lo real contra lo presupuestado.'])

# ---------------- Bases de datos (núcleo) ----------------
c+=herramienta('nucleo','bases','Bases de datos',
 'Una tabla con columnas de distintos tipos, cálculos y varias vistas: clientes, productos, pedidos, lo que necesites.',
 ['Inserta «Base de datos» con «/» o crea la página «Clientes».',
  'Agrega columnas con «+»: texto, número, moneda, fecha, selección, casilla, teléfono, relación con otra base, fórmula, suma de otra base, número consecutivo o saldo acumulado.',
  '**Número consecutivo** numera solo cada fila nueva (1, 2, 3…); no se repite ni se reusa aunque elimines filas. **Saldo acumulado** suma o resta el monto de cada fila al saldo de la anterior, desde un saldo inicial, según una columna de selección (por ejemplo, «Egreso» resta).',
  'Cambia de vista: tabla, tablero (por grupos), galería (tarjetas) o calendario. Cada vista guarda su filtro, orden y columnas ocultas.',
  'Toca el cuadrito de la izquierda de una fila para ver su ficha completa.',
  'Importa o descarga en CSV (por ejemplo, desde Excel) en «⋯» de la base.'],
 'Fórmulas: usa el nombre de otras columnas entre llaves, por ejemplo {Precio} * {Cantidad}, o SI({Existencias} < {Mínimo}; "Bajo"; "Bien"). También MAX, MIN, ENTERO, REDONDEAR y DIAS({Vence}).')
c+=herramienta('nucleo','historialfilas','Historial de las filas',
 'Cada fila de una base guarda su historial: quién cambió qué celda, cuándo, y el valor de antes. Sirve para saber quién movió algo y para regresarlo.',
 ['Abre la ficha de una fila (el cuadrito de su izquierda). Abajo, en **Historial**, está cada cambio: quién, cuándo y el valor de antes tachado junto al nuevo.',
  'Para regresar un valor, pulsa **Volver a «…»** junto al cambio. Queda anotado como un cambio más.',
  'Para ver todo lo que cambió en la base: «⋯» de la base → **Actividad**. Puedes ver solo lo de una persona con «Persona».',
  'Si alguien eliminó una fila, en **Actividad** aparece «Eliminó la fila» con **Recuperar fila**: vuelve con todos sus valores.'],
 'Los cambios seguidos de la misma persona en la misma fila (a menos de 2 minutos) se juntan en uno, y lo que escribes enseguida en una fila nueva cuenta como parte de crearla. Se guarda 90 días y siempre los últimos 50 cambios de cada fila. Vive en este navegador: no va en el respaldo.')
c+=herramienta('nucleo','colores','Color según el valor',
 'Pinta las celdas de una columna según lo que dicen: en rojo lo vencido, en verde lo pagado.',
 ['En el encabezado de la columna, abre su menú y elige «Color según el valor».',
  'Agrega hasta tres reglas: es, no es, contiene, mayor, menor o vacío, cada una con su color (verde, amarillo, rojo o azul).'],
 'Una celda vacía no es mayor ni menor que nada: solo la pinta la regla «está vacío».')

# ---------------- Recursos humanos ----------------
RH_INFO=C('**Recursos humanos** se enciende con «Tengo empleados» al crear tu espacio, o en Tus datos → «Cambiar tu espacio». Los cálculos usan las cifras de 2026 (UMA $117.31, salario mínimo $315.04 y $440.87 en la frontera norte, tarifa del ISR del SAT y cuotas del IMSS). Son estimaciones para planear: tu contador timbra los recibos oficiales.','info')
eq=herramienta('rh','equipo','Mi equipo',
 'Tus empleados en un lugar: su antigüedad y vacaciones se calculan solas, y ves quién falta hoy, los cumpleaños y lo que te cuesta tu equipo.',
 ['Crea la página «Mi equipo» (Crear → Recursos humanos).',
  'Pulsa **Agregar persona**: nombre, puesto, fecha de ingreso, salario diario y cada cuándo cobra (semanal, catorcenal, quincenal o mensual).',
  'Anota faltas, vacaciones, incapacidades, permisos y horas extra con **Anotar falta o vacaciones** (también desde el Inicio).',
  'Quien se va: en la tabla «Empleados», cambia su Estado a «Baja» y escribe su fecha de baja.'],
 'El Inicio muestra «Tu equipo»: quién falta o está de vacaciones hoy, cumpleaños y aniversarios del mes, y el aguinaldo cuando se acerca diciembre.')
eq.insert(2,RH_INFO)
c+=eq
c+=herramienta('rh','nomina','Nómina del periodo',
 'La nómina de todo tu equipo para una quincena, semana o mes: descuenta las faltas, paga las horas extra anotadas y calcula ISR, IMSS, neto y lo que le cuesta al negocio.',
 ['Usa «Nómina de la quincena» en el Inicio o crea la página «Nómina del periodo».',
  'En el bloque elige el periodo (semanal, catorcenal, quincenal o mensual) y cuándo empieza.',
  'Sale una fila por persona que cobra en ese periodo, con sus faltas y horas extra, y el total.',
  'Imprímela con «⋯» → «Imprimir o guardar PDF».'],
 'Las primeras 9 horas extra de la semana se pagan dobles y las demás triples. Las faltas e incapacidades no se pagan.')
c+=herramienta('rh','recibo','Recibo de nómina',
 'El detalle de una persona en un periodo: sueldo, horas extra, descansos o festivos trabajados, prima dominical y bonos; ISR con subsidio, IMSS y neto.',
 ['Inserta «Recibo de nómina» con «/».',
  'Escribe el salario (diario o mensual), el periodo, la fecha de ingreso y la zona del salario mínimo.',
  'Anota lo del periodo: faltas, horas extra, descansos trabajados, domingos y bonos.',
  'Marca «Ver lo que le cuesta al negocio» para ver las cuotas del IMSS del patrón, el INFONAVIT y, si lo escribes, el impuesto estatal sobre nómina.'],
 'Con salario mínimo no se retiene ISR del sueldo y el patrón paga también la cuota del IMSS del trabajador.')
c+=herramienta('rh','vacaciones','Vacaciones',
 'Cuántos días le tocan a cada quien por ley, cuántos ha tomado y su prima vacacional.',
 ['Crea la página «Vacaciones»: la tabla de todo tu equipo sale de «Mi equipo».',
  'Para una persona, inserta «Vacaciones» y escribe su fecha de ingreso y su salario.',
  'Escribe los días ya tomados: te dice los disponibles, el pago y la prima vacacional (al menos 25 %).'],
 'Por ley (vacaciones dignas): 12 días el primer año, 14, 16, 18 y 20 el quinto; luego 2 más cada cinco años.')
c+=herramienta('rh','aguinaldo','Aguinaldo',
 'Al menos 15 días de salario antes del 20 de diciembre, o la parte proporcional si entró este año.',
 ['Crea la página «Aguinaldo»: sale el de todo tu equipo, con ISR y neto.',
  'Para una persona, inserta «Aguinaldo» con su salario y fecha de ingreso.',
  'Si das más de 15 días, cámbialo en «Días de aguinaldo».'],
 'Está exento de ISR hasta 30 UMA ($3,519.30 en 2026); lo demás paga ISR.')
c+=herramienta('rh','finiquito','Finiquito o liquidación',
 'Lo que le corresponde a quien se va: por renuncia, despido justificado o despido injustificado.',
 ['Crea la página «Finiquito» o inserta el bloque.',
  'Escribe el salario, la fecha de ingreso, la de salida y el motivo.',
  'Agrega los días de sueldo sin pagar y las vacaciones pendientes o ya tomadas.',
  'Te da el desglose: sueldo, aguinaldo y vacaciones proporcionales, prima vacacional y, según el motivo, prima de antigüedad e indemnización, con ISR estimado.'],
 'En un despido injustificado se pagan tres meses de salario integrado; los 20 días por año aplican si el patrón no reinstala al trabajador o si este termina la relación por culpa del patrón. Revísalo con tu contador o abogado.')
c+=herramienta('rh','ptu','Reparto de utilidades (PTU)',
 'El 10 % de la utilidad fiscal del año se reparte entre tu equipo a más tardar el 30 de mayo.',
 ['Crea la página «Reparto de utilidades».',
  'Escribe la utilidad fiscal (o el monto a repartir).',
  'Pulsa «Traer a tu equipo»: llena los días trabajados y el salario de cada quien desde «Mi equipo».',
  'Te dice cuánto le toca a cada persona: la mitad por días trabajados y la mitad por salario, con el tope de tres meses de salario.'])

doc={'formato':1,'tipo':'pagina','id':'ayuda','titulo':'Ayuda: cómo usar OneBook','icono':'ayuda',
 'props':[{'nombre':'Categoría','valor':'Ayuda','estilo':'etiqueta'},{'nombre':'Para','valor':'Todos','estilo':'texto'}],
 'contenido':{'type':'doc','content':c}}

html='''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Ayuda · OneBook</title>
<meta name="description" content="Cada herramienta de OneBook explicada paso a paso: páginas y bloques, tu negocio, inventario y reportes, bases de datos y recursos humanos.">
<link rel="icon" href="assets/icons/icono.svg" type="image/svg+xml">
<link rel="icon" href="assets/icons/icono-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/icons/icono-180.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#fbfcfc" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111716" media="(prefers-color-scheme: dark)">
<link rel="preload" href="assets/fonts/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<script src="assets/js/ajustes.js"></script>
<script src="assets/js/perfil.js"></script>
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/ayuda.css">
</head>
<body data-pagina="ayuda">

<div class="app">
  <aside class="side" id="side" aria-label="Navegación"></aside>

  <div class="main">
    <header class="topbar" id="topbar"></header>

    <main class="page">
      <noscript><p>Esta página necesita JavaScript para mostrarse.</p></noscript>
    </main>
  </div>
</div>

<!-- La guía, en el formato de bloques (la dibuja assets/js/bloques.js; ayuda.js agrega el buscador y el filtro por módulo).
     Cada herramienta es un título de nivel 2 con id ay-<módulo>-<nombre>. -->
<script type="application/json" id="documento">
'''+json.dumps(doc,indent=1,ensure_ascii=False)+'''
</script>

<script src="assets/js/base.js"></script>
<script src="assets/js/datos.js"></script>
<script src="assets/js/empresa.js"></script>
<script src="assets/js/barra.js"></script>
<script src="assets/js/persona.js"></script>
<script src="assets/js/lectura.js"></script>
<script src="assets/js/app.js"></script>
<script src="assets/js/respaldo.js"></script>
<script src="assets/js/crear.js"></script>
<script src="assets/js/buscar.js"></script>
<script src="assets/js/bloques.js"></script>
<script src="assets/js/zen.js"></script>
<script src="assets/js/ayuda.js"></script>
</body>
</html>
'''
open('ayuda.html','w',encoding='utf-8').write(html)
print('ok',len(c),'bloques')
