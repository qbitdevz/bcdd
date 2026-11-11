# BCDD — instalación en un comando (Windows PowerShell 5.1+ / PowerShell 7).
#
#   irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1 | iex
#
# Con opciones o con otro comando:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1))) --with-rule
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1))) doctor
#   (o bien: $env:BCDD_ARGS = 'doctor'; irm ... | iex)
#
# Volver a ejecutarlo actualiza a la última versión.
# Variables: BCDD_REPO=usuario/repo · BCDD_REF=rama-o-tag · BCDD_HOME=carpeta (por defecto ~\.bcdd)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }

$Repo = if ($env:BCDD_REPO) { $env:BCDD_REPO } else { 'qbitdevz/bcdd' }
$Ref = if ($env:BCDD_REF) { $env:BCDD_REF } else { 'main' }
$BcddDir = if ($env:BCDD_HOME) { $env:BCDD_HOME } else { Join-Path $HOME '.bcdd' }
$Url = if ($env:BCDD_ZIP_URL) { $env:BCDD_ZIP_URL } else { "https://github.com/$Repo/archive/$Ref.zip" }
$PassArgs = @($args)
if ($PassArgs.Count -eq 0 -and $env:BCDD_ARGS) { $PassArgs = @($env:BCDD_ARGS -split '\s+' | Where-Object { $_ }) }

function Fail($m) { Write-Host "✖ $m" -ForegroundColor Red; throw $m }

if ($Repo -like '*BCDD_REPO*' -and -not $env:BCDD_ZIP_URL) { Fail 'El repositorio de BCDD no está configurado. Definí $env:BCDD_REPO = "usuario/repo".' }

$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("bcdd-" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $Tmp | Out-Null
try {
  Write-Host "BCDD: descargando $Ref…"
  $Zip = Join-Path $Tmp 'bcdd.zip'
  try { Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing } catch { Fail "No pude descargar $Url" }
  Expand-Archive -Path $Zip -DestinationPath (Join-Path $Tmp 'x') -Force
  $Root = Get-ChildItem -Path (Join-Path $Tmp 'x') -Directory | Select-Object -First 1
  if (-not $Root -or -not (Test-Path (Join-Path $Root.FullName 'install.mjs')) -or -not (Test-Path (Join-Path $Root.FullName 'skills\bcdd\SKILL.md'))) {
    Fail 'La descarga no contiene el paquete BCDD.'
  }
  New-Item -ItemType Directory -Path $BcddDir -Force | Out-Null
  $Pkg = Join-Path $BcddDir 'pkg'
  if (Test-Path $Pkg) { Remove-Item $Pkg -Recurse -Force }
  Move-Item -Path $Root.FullName -Destination $Pkg
}
finally { Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue }

$NodeOk = $false
$Node = Get-Command node -ErrorAction SilentlyContinue
if ($Node) {
  try { if ([int](& node -p 'process.versions.node.split(".")[0]') -ge 18) { $NodeOk = $true } } catch { }
}

if ($NodeOk) {
  & node (Join-Path $Pkg 'install.mjs') @PassArgs
  if ($LASTEXITCODE -ne 0) { throw "BCDD terminó con errores (código $LASTEXITCODE)." }
  return
}

# Sin Node 18+: instalación básica, solo copia de la skill.
$Global = $false
foreach ($a in $PassArgs) {
  if ($a -eq '--global') { $Global = $true }
  elseif ($a -ne 'install') { Fail "'$a' necesita Node 18 o superior (doctor, update, lint, --with-rule). Sin Node solo se puede instalar la skill." }
}
$Base = if ($Global) { $HOME } else { (Get-Location).Path }
foreach ($d in @((Join-Path $Base '.claude\skills'), (Join-Path $Base '.agents\skills'))) {
  New-Item -ItemType Directory -Path $d -Force | Out-Null
  $Dest = Join-Path $d 'bcdd'
  if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
  Copy-Item -Path (Join-Path $Pkg 'skills\bcdd') -Destination $Dest -Recurse
  Write-Host "✔ skill instalada en $Dest"
}
Write-Host ''
Write-Host 'Listo (instalación básica: no encontré Node 18+).'
Write-Host 'La skill funciona igual. Con Node se suman doctor, lint, la regla para AGENTS.md y la página para el cliente.'
