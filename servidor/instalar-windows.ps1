# OneBook: deja el servidor de la oficina corriendo solo en un PC con Windows 10 u 11.
# - Crea la tarea programada «OneBook servidor», que arranca al prender el PC (aunque nadie inicie sesión) y se
#   vuelve a levantar si se cae.
# - Abre el puerto en el Firewall de Windows solo para redes privadas o de dominio (la red de la oficina).
# Uso (PowerShell como administrador, desde la carpeta del repositorio):
#   powershell -ExecutionPolicy Bypass -File servidor\instalar-windows.ps1
#   powershell -ExecutionPolicy Bypass -File servidor\instalar-windows.ps1 -Puerto 8443
# Para quitarlo: servidor\desinstalar-windows.ps1
#Requires -RunAsAdministrator
param([int]$Puerto = 8443)
$ErrorActionPreference = 'Stop'

$servidor = Join-Path $PSScriptRoot 'servidor.js'
$raiz = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw 'No se encontró Node. Instálalo con: winget install OpenJS.NodeJS.LTS (y abre otra ventana de PowerShell).' }
if (-not (Test-Path (Join-Path $PSScriptRoot 'certificado\onebook.pem'))) {
  Write-Warning 'No hay certificado en servidor\certificado\: el servidor arrancará sin https (ver docs\servidor-local.md).'
}

$accion = New-ScheduledTaskAction -Execute $node -Argument "`"$servidor`" --puerto $Puerto" -WorkingDirectory $raiz
$disparador = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName 'OneBook servidor' -Action $accion -Trigger $disparador -Principal $principal -Settings $ajustes -Force | Out-Null

if (-not (Get-NetFirewallRule -DisplayName 'OneBook servidor' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'OneBook servidor' -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow -Profile Private,Domain | Out-Null
}

Start-ScheduledTask -TaskName 'OneBook servidor'
Start-Sleep -Seconds 3
$estado = Join-Path $PSScriptRoot 'datos\estado.json'
Write-Host ''
Write-Host 'Listo: OneBook queda corriendo y arranca solo al prender este PC.'
if (Test-Path $estado) { Write-Host ('Clave de la oficina: ' + ((Get-Content $estado -Raw | ConvertFrom-Json).clave)) }
$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress
foreach ($ip in $ips) { Write-Host ("Ábrelo en los demás dispositivos: https://{0}:{1}/" -f $ip, $Puerto) }
Write-Host 'Si la red de la oficina aparece como «Pública» en Windows, cámbiala a «Privada» para que el firewall deje entrar.'
