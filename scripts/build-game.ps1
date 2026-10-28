$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$frameworkRoot = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$output = Join-Path $projectRoot 'src/native/MeoGameWatcher.exe'
& (Join-Path $frameworkRoot 'csc.exe') /nologo /target:exe /optimize+ ('/out:' + $output) ('/reference:' + (Join-Path $frameworkRoot 'System.Web.Extensions.dll')) (Join-Path $projectRoot 'src/native/GameWatcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'Game helper compilation failed' }
Write-Output ('Built ' + $output)
