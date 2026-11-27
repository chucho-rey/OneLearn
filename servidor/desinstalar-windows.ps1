# OneBook: quita la tarea programada y la regla del firewall que crea instalar-windows.ps1.
# Los datos (servidor\datos) no se tocan.
# Uso (PowerShell como administrador): powershell -ExecutionPolicy Bypass -File servidor\desinstalar-windows.ps1
#Requires -RunAsAdministrator
Stop-ScheduledTask -TaskName 'OneBook servidor' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'OneBook servidor' -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName 'OneBook servidor' -ErrorAction SilentlyContinue
Write-Host 'Listo: el servidor de OneBook ya no arranca solo. Tus datos siguen en servidor\datos.'
