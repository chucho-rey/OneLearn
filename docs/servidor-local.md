# OneBook en la red de la oficina (servidor local)

Un equipo de la oficina (que siempre está prendido) guarda los datos de todos, y cada computadora o celular de la misma
red trabaja con ellos. No usa internet ni servicios de terceros: todo se queda en la oficina.

- **El servidor** es `servidor/servidor.js` (Node, sin paquetes que instalar). Sirve OneBook y guarda los datos en
  `servidor/datos/` (con un respaldo diario en `servidor/datos/respaldos/`, se quedan los últimos 14).
- **Cada dispositivo** abre OneBook desde el servidor (`https://IP-del-servidor:8443/`), se conecta una vez con la
  **clave de la oficina** y desde ahí trabaja como siempre. Cada uno guarda su copia: si se cae el wifi o se apaga el
  servidor, sigue trabajando y sube sus cambios al volver.
- **Trabajo en equipo:** lo que cambia en un dispositivo llega a los demás en segundos. Si alguien está editando una
  página, en los demás se abre para leer (y se actualiza sola); «Editar aquí» la pasa. En las bases de datos cada
  fila es independiente: dos personas pueden llenar la misma tabla a la vez. «Trabajando ahora» del Inicio muestra quién
  tiene abierta cada página en cada dispositivo.
- Si dos dispositivos cambian **lo mismo** sin conexión, gana el cambio más reciente. Las páginas se cuidan con el
  bloqueo de arriba; «Tu empresa» (personas y departamentos) también se guarda completa: que la edite una persona a la vez.

Plan de la prueba: **1)** la Mac mini hace de servidor y el Nothing Phone 2 se conecta; **2)** se pasa todo al PC de la
oficina (Windows) y se conectan los demás.

---

## 1. Prueba en casa: la Mac mini de servidor

### 1.1 Lo que se instala una vez (Terminal)

```bash
# Homebrew (si no lo tienes): https://brew.sh
brew install node mkcert
git clone https://github.com/chucho-rey/OneLearn.git
cd OneLearn
```

### 1.2 La IP fija de la Mac

En **Ajustes del Sistema › Red › Wi-Fi (o Ethernet) › Detalles › TCP/IP** anota la dirección IPv4 (por ejemplo
`192.168.1.20`). Para que no cambie, pide en tu módem una **reserva de DHCP** para la Mac (en la página del módem, casi
siempre `192.168.1.1`, sección DHCP o LAN). Si no puedes, revisa la IP cada vez que la uses.

### 1.3 El certificado (para https)

```bash
mkcert -install                       # crea tu «autoridad» local y la marca como confiable en esta Mac
mkdir -p servidor/certificado
mkcert -cert-file servidor/certificado/onebook.pem -key-file servidor/certificado/onebook-key.pem \
  192.168.1.20 localhost 127.0.0.1    # cambia 192.168.1.20 por la IP de tu Mac
open "$(mkcert -CAROOT)"              # abre la carpeta con rootCA.pem (el que va al celular)
```

> **No compartas `rootCA-key.pem`** (está en esa misma carpeta). Solo `rootCA.pem` va a los dispositivos.

### 1.4 Arrancar el servidor

```bash
node servidor/servidor.js
```

Verás algo así:

```
OneBook: servidor de la oficina «OneBook de la oficina»
  Ábrelo en los dispositivos de la red: https://192.168.1.20:8443/
  Clave de la oficina: K7QH-2MXP
```

La primera vez, macOS pregunta si `node` puede **aceptar conexiones entrantes**: elige **Permitir**. El servidor sigue
corriendo mientras la Terminal esté abierta (para detenerlo, `Ctrl + C`). La clave también está en
`servidor/datos/estado.json`. Opciones: `--puerto 8443`, `--nombre "Taquería La Oficina"`, `--clave ABCD-1234`.

### 1.5 La Mac como primer dispositivo

1. Abre `https://192.168.1.20:8443/` en Safari o Chrome de la misma Mac.
2. Aparece **Conectar con la oficina**: escribe la clave y un nombre («Mac de Lupita»).
3. El servidor está vacío: crea tu empresa como siempre («Crea tu empresa»). Todo lo que hagas se guarda en el servidor.

> Lo que ya tienes en OneBook desde internet (`chucho-rey.github.io`) es otra copia: no aparece aquí. Si quieres pasarlo,
> descarga un respaldo allá (**Tus datos › Descargar respaldo**) e impórtalo aquí (**Tus datos › Importar respaldo**):
> se sube al servidor. Para la prueba decidimos **empezar de cero**.

### 1.6 El Nothing Phone 2

1. Pasa `rootCA.pem` al celular (por correo, Google Drive, Telegram o cable).
2. **Instala el certificado:** Ajustes › Seguridad y privacidad › Más ajustes de seguridad › Encriptación y credenciales
   › Instalar un certificado › **Certificado de CA** › «Instalar de todas formas» › elige `rootCA.pem`. (Si no
   encuentras la ruta, busca «certificado» en Ajustes.) Android avisa que la red «podría estar supervisada»: es normal
   con un certificado propio.
3. Conecta el celular al **mismo wifi** que la Mac y abre en Chrome `https://192.168.1.20:8443/`.
4. **Conectar con la oficina** → la clave y un nombre («Nothing de Lupita»). Recibe los datos de la oficina y pregunta
   **¿Quién eres?**: elige tu nombre (o agrega antes a otra persona en «Tu empresa» desde la Mac).
5. Opcional: menú de Chrome › **Instalar app** (o «Agregar a la pantalla principal»).

### 1.7 Qué probar

| Prueba | Qué debe pasar |
|---|---|
| En la Mac, crea una página y escribe algo | Aparece en el celular en segundos (Inicio › Páginas) |
| En el celular, agrega una fila a una base (por ejemplo la caja chica) | Aparece en la Mac sin recargar |
| Abre la misma página en los dos | El segundo la ve para leer: «… está editando esta página»; se actualiza sola |
| En el celular toca «Editar aquí» | El celular edita y la Mac queda para leer |
| Apaga el wifi del celular y cambia algo | La barra dice «Sin conexión · 1»; al prender el wifi se sube solo |
| Detén el servidor (`Ctrl + C`) y vuelve a arrancarlo | Nada se pierde; los dispositivos vuelven a «Al día» |
| Inicio › «Trabajando ahora» (en la computadora) | Muestra a la otra persona y si edita o lee |

El estado se ve arriba a la derecha (**Al día**, **Subiendo 2**, **Sin conexión**) y en **Tus datos › Servidor de la
oficina** (ahí también: «Sincronizar ahora» y «Desconectar este dispositivo»).

---

## 2. En la oficina: el PC con Windows de servidor

### 2.1 Instalar (PowerShell como administrador)

```powershell
winget install OpenJS.NodeJS.LTS
winget install FiloSottile.mkcert
winget install Git.Git            # o descarga el ZIP del repositorio desde GitHub
# cierra y vuelve a abrir PowerShell como administrador
git clone https://github.com/chucho-rey/OneLearn.git C:\OneBook
cd C:\OneBook
```

### 2.2 Usar la misma «autoridad» que en la Mac (así no reinstalas el certificado en los celulares)

1. En la Mac: `open "$(mkcert -CAROOT)"` y copia `rootCA.pem` **y** `rootCA-key.pem` a una memoria USB.
2. En el PC: `mkcert -CAROOT` dice la carpeta (por ejemplo `C:\Users\Admin\AppData\Local\mkcert`); copia ahí los dos
   archivos y corre `mkcert -install`.
3. Fija la IP del PC (reserva DHCP en el módem) y crea su certificado:

```powershell
mkdir servidor\certificado
mkcert -cert-file servidor\certificado\onebook.pem -key-file servidor\certificado\onebook-key.pem 192.168.1.50 localhost 127.0.0.1
```

(Cambia `192.168.1.50` por la IP del PC.) Borra `rootCA-key.pem` de la memoria USB al terminar.

### 2.3 Pasar los datos de la prueba (opcional)

Copia la carpeta `servidor/datos` de la Mac a `C:\OneBook\servidor\datos` con el servidor detenido en los dos. Se
conserva todo, también la clave. Si prefieres empezar limpio en la oficina, no copies nada.

### 2.4 Que arranque solo

```powershell
powershell -ExecutionPolicy Bypass -File servidor\instalar-windows.ps1
```

Crea la tarea programada **OneBook servidor** (arranca al prender el PC aunque nadie inicie sesión y se levanta sola si
se cae), abre el puerto 8443 en el firewall para redes privadas y muestra la clave y la dirección. Si Windows tiene la red
de la oficina como **Pública**, cámbiala a **Privada** (Configuración › Red e Internet › propiedades de la red). Para
quitarlo: `servidor\desinstalar-windows.ps1` (los datos no se tocan).

### 2.5 Conectar los dispositivos

- **Celulares:** si ya instalaste el certificado de la Mac, solo abre `https://IP-del-PC:8443/`. Los dispositivos que
  estaban conectados a la Mac: **Tus datos › Desconectar este dispositivo** y conéctalos de nuevo al PC.
- **Computadoras con Windows:** copia `rootCA.pem` y cámbiale el nombre a `rootCA.crt`, doble clic › Instalar certificado › Equipo local › «Colocar todos los
  certificados en el siguiente almacén» › **Entidades de certificación raíz de confianza**. Luego abre la dirección en
  Chrome o Edge.
- **Mac:** doble clic en `rootCA.pem` › Llaveros › Sistema; ábrelo en Acceso a Llaveros, doble clic › Confiar › «Confiar
  siempre».
- **iPhone (si hay):** abre `rootCA.pem` (por AirDrop o correo) › Ajustes › Perfil descargado › Instalar; después
  Ajustes › General › Información › Ajustes de confianza de certificados › activa el de mkcert.

---

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El celular no abre la dirección | Mismo wifi (no la red de invitados); la IP correcta; el servidor corriendo; en Windows, el firewall y la red «Privada» |
| «Tu conexión no es privada» | Falta instalar `rootCA.pem` en ese dispositivo, o el certificado se hizo con otra IP (vuelve a correr `mkcert` con la IP actual) |
| La barra dice «Sin conexión» | El servidor está apagado o el dispositivo salió del wifi; los cambios esperan y se suben solos |
| «La clave de la oficina ya no es válida» | Cambió la clave del servidor: **Tus datos › Desconectar este dispositivo** y conéctalo con la nueva |
| Quiero ver la clave | `servidor/datos/estado.json` («clave») |
| Recuperar datos | Detén el servidor, copia la carpeta de `servidor/datos/respaldos/AAAA-MM-DD_HHMM/` a `servidor/datos/almacenes/` (y `estado.json` a `servidor/datos/`) y arráncalo |

Notas:
- Sin certificado (`node servidor/servidor.js --http`) también funciona para probar en el navegador, pero no se instala
  como app, no funciona sin conexión y los pedidos al Cedis no se pueden firmar.
- La clave evita que cualquiera en el wifi lea los datos, pero no es una cuenta por persona: «Cambiar de persona» sigue
  siendo de confianza, como siempre. Las cuentas llegan con la nube (F9).
- Los enlaces de pedidos al Cedis que se arman aquí apuntan al servidor de la oficina: solo se abren dentro de su red.
