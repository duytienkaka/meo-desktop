$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /target:exe /platform:x64 /optimize+ ('/out:'+(Join-Path $root 'src/native/MeoTaskbarTransparency.exe')) (Join-Path $root 'src/native/TaskbarTransparency.cs')
if($LASTEXITCODE -ne 0){throw 'Taskbar transparency helper compilation failed'}
