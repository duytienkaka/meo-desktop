$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$frameworkRoot=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
& (Join-Path $frameworkRoot 'csc.exe') /nologo /target:exe /optimize+ ('/out:'+(Join-Path $projectRoot 'src/native/MeoScreenshotBridge.exe')) ('/reference:'+(Join-Path $frameworkRoot 'System.Web.Extensions.dll')) ('/reference:'+(Join-Path $frameworkRoot 'System.Windows.Forms.dll')) (Join-Path $projectRoot 'src/native/ScreenshotBridge.cs')
if($LASTEXITCODE -ne 0){throw 'Screenshot helper compilation failed'}
