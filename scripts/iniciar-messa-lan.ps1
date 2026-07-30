$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $PSScriptRoot
$lanAddress = '192.168.0.42'

$Host.UI.RawUI.WindowTitle = "MESSA LAN - $($lanAddress):3000"
Set-Location -LiteralPath $projectDirectory

Write-Host ''
Write-Host '  MESSA disponible en tu red local' -ForegroundColor Yellow
Write-Host "  Carta: http://$($lanAddress):3000/vista" -ForegroundColor Cyan
Write-Host "  Admin: http://$($lanAddress):3000/admin" -ForegroundColor Cyan
Write-Host '  Mantené esta ventana abierta mientras lo probás desde el celular.' -ForegroundColor DarkGray
Write-Host ''

& pnpm.cmd exec next dev --hostname 0.0.0.0 --webpack
