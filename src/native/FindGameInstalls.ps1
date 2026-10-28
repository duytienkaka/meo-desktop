$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$steamRoots = @()
foreach ($key in @('HKCU:\Software\Valve\Steam','HKLM:\SOFTWARE\WOW6432Node\Valve\Steam','HKLM:\SOFTWARE\Valve\Steam')) {
    $entry = Get-ItemProperty -LiteralPath $key
    if ($entry.SteamPath) { $steamRoots += $entry.SteamPath }
    if ($entry.InstallPath) { $steamRoots += $entry.InstallPath }
}
$games = @()
foreach ($root in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall')) {
    foreach ($key in Get-ChildItem -LiteralPath $root) {
        $entry = Get-ItemProperty -LiteralPath $key.PSPath
        if ($entry.DisplayName -and $entry.InstallLocation -and ($entry.UninstallString -match 'steam://uninstall/' -or $entry.InstallLocation -match '\\(SteamLibrary\\steamapps\\common|steamapps\\common|Epic Games|GOG Games|Riot Games|XboxGames)\\' -or $entry.Publisher -match '^(Riot Games|miHoYo|COGNOSPHERE|HoYoverse|GOG.com)$')) {
            $games += @{name=[string]$entry.DisplayName;location=[string]$entry.InstallLocation;source='Windows'}
        }
    }
}
@{steamRoots=@($steamRoots | Select-Object -Unique);games=@($games)} | ConvertTo-Json -Depth 4 -Compress
