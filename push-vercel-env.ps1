#!/usr/bin/env pwsh
# Push every var from .env to Vercel production + preview + development.
# Skips empty values and comments.

$env:NODE_OPTIONS = "--use-system-ca"
Set-Location D:\computo\apps\web

$envFile = "D:\computo\.env"
$lines = Get-Content $envFile

foreach ($line in $lines) {
    if ($line -match '^\s*#' -or -not ($line -match '^([A-Z0-9_]+)=(.*)$')) { continue }
    $name = $matches[1]
    $value = $matches[2]
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "skip $name (empty)" -ForegroundColor DarkGray
        continue
    }
    Write-Host "→ $name" -ForegroundColor Cyan
    foreach ($target in @("production", "preview", "development")) {
        # Remove if exists, then add (vercel env add fails if already set)
        $value | & vercel env rm $name $target --yes 2>$null | Out-Null
        $value | & vercel env add $name $target 2>&1 | Select-String -NotMatch "RemoteException|NativeCommand|En línea|Carácter|FullyQualified|^\s*$" | Out-Null
    }
}
Write-Host "`nDone." -ForegroundColor Green
