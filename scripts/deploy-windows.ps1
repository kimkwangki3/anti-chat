$ErrorActionPreference = "Stop"

$repoRoot = "C:\apps\anti"
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$logsDir = Join-Path $repoRoot "logs"

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

function Stop-PortProcess {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
        } catch {
            Write-Warning "Failed to stop PID $pid on port $Port: $($_.Exception.Message)"
        }
    }
}

Set-Location $repoRoot

git fetch origin main
git checkout main
git pull --ff-only origin main

Set-Location $backendDir
npm install

Set-Location $frontendDir
npm install
npm run build

Stop-PortProcess -Port 5000
Stop-PortProcess -Port 3000

$backendLog = Join-Path $logsDir "backend.log"
$frontendLog = Join-Path $logsDir "frontend.log"

Start-Process -FilePath "cmd.exe" `
    -WorkingDirectory $backendDir `
    -ArgumentList "/c node server.js >> `"$backendLog`" 2>&1" `
    -WindowStyle Hidden

Start-Process -FilePath "cmd.exe" `
    -WorkingDirectory $frontendDir `
    -ArgumentList "/c node scripts\serve-dist.cjs >> `"$frontendLog`" 2>&1" `
    -WindowStyle Hidden

Write-Host "Deployment completed."
