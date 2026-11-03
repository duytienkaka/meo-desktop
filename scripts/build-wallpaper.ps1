$projectRoot=Split-Path $PSScriptRoot -Parent
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:exe /optimize+ ('/out:'+(Join-Path $projectRoot 'src\native\MeoWallpaperHost.exe')) (Join-Path $projectRoot 'src\native\WallpaperHost.cs')
if($LASTEXITCODE -ne 0){throw 'Wallpaper helper build failed'}
