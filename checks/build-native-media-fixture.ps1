$ErrorActionPreference='Stop'
$frameworkRoot=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$metadataRoot=Join-Path $env:WINDIR 'System32/WinMetadata'
$runtimeFacade=Get-ChildItem -LiteralPath (Join-Path $env:WINDIR 'Microsoft.NET/assembly/GAC_MSIL/System.Runtime') -Recurse -Filter System.Runtime.dll | Select-Object -First 1 -ExpandProperty FullName
$interopFacade=Get-ChildItem -LiteralPath (Join-Path $env:WINDIR 'Microsoft.NET/assembly/GAC_MSIL/System.Runtime.InteropServices.WindowsRuntime') -Recurse -Filter '*.dll' | Select-Object -First 1 -ExpandProperty FullName
& (Join-Path $frameworkRoot 'csc.exe') /nologo /target:exe ('/out:'+(Join-Path $PSScriptRoot 'MeoMediaFixture.exe')) ('/reference:'+(Join-Path $frameworkRoot 'System.Drawing.dll')) ('/reference:'+(Join-Path $frameworkRoot 'System.Windows.Forms.dll')) ('/reference:'+$runtimeFacade) ('/reference:'+$interopFacade) ('/reference:'+(Join-Path $frameworkRoot 'System.Runtime.WindowsRuntime.dll')) ('/reference:'+(Join-Path $metadataRoot 'Windows.Foundation.winmd')) ('/reference:'+(Join-Path $metadataRoot 'Windows.Media.winmd')) ('/reference:'+(Join-Path $metadataRoot 'Windows.Storage.winmd')) (Join-Path $PSScriptRoot 'native-media-fixture.cs')
if($LASTEXITCODE -ne 0){throw 'Media fixture compilation failed'}
