$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$frameworkRoot = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$metadataRoot = Join-Path $env:WINDIR 'System32/WinMetadata'
$source = Join-Path $projectRoot 'src/native/MediaWatcher.cs'
$output = Join-Path $projectRoot 'src/native/MeoMediaWatcher.exe'
$runtimeFacade = Get-ChildItem -LiteralPath (Join-Path $env:WINDIR 'Microsoft.NET/assembly/GAC_MSIL/System.Runtime') -Recurse -Filter System.Runtime.dll | Select-Object -First 1 -ExpandProperty FullName
& (Join-Path $frameworkRoot 'csc.exe') /nologo /target:exe /optimize+ ('/out:' + $output) ('/reference:' + $runtimeFacade) ('/reference:' + (Join-Path $frameworkRoot 'System.Runtime.WindowsRuntime.dll')) ('/reference:' + (Join-Path $frameworkRoot 'System.Web.Extensions.dll')) ('/reference:' + (Join-Path $frameworkRoot 'System.Drawing.dll')) ('/reference:' + (Join-Path $metadataRoot 'Windows.Foundation.winmd')) ('/reference:' + (Join-Path $metadataRoot 'Windows.Storage.winmd')) ('/reference:' + (Join-Path $metadataRoot 'Windows.Media.winmd')) $source
if ($LASTEXITCODE -ne 0) { throw 'Media helper compilation failed' }
Write-Output ('Built ' + $output)
