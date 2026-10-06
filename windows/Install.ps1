$ErrorActionPreference = 'Stop'
$destination = Join-Path $env:LOCALAPPDATA 'MASSIVE95\Application'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
Get-ChildItem -LiteralPath $PSScriptRoot | Where-Object { $_.Name -notin @('Install.ps1','Install.cmd','Uninstall.ps1') } | Copy-Item -Destination $destination -Recurse -Force
$screenSaver = Join-Path $destination 'MASSIVE95.scr'
if (!(Test-Path -LiteralPath $screenSaver)) { throw 'MASSIVE95.scr is missing. Extract the complete ZIP before installing.' }
Start-Process -FilePath "$env:WINDIR\System32\rundll32.exe" -ArgumentList "desk.cpl,InstallScreenSaver `"$screenSaver`""
Write-Host 'MASSIVE 95 is installed. Choose Settings to select your screen saver, then Apply in Windows.'
