$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Compilador C# do Windows não encontrado.' }
& $compiler /nologo /optimize+ /target:exe /platform:x64 /out:"$root\CentipedeArena.exe" "$root\launcher\CentipedeArenaLauncher.cs"
if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar o launcher (código $LASTEXITCODE)." }
Write-Host "Criado: $root\CentipedeArena.exe"
