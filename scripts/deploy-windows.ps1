$ErrorActionPreference = "Stop"

$repoRoot = "C:\apps\anti"
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"

function Stop-PortProcess {
    param([Parameter(Mandatory = $true)][int]$Port)
    $result = netstat -ano 2>$null | Select-String ":$Port\s.*LISTENING"
    if (-not $result) { return }
    $result | ForEach-Object {
        $parts = $_ -split '\s+'
        $processId = $parts[-1]
        if ($processId -match '^\d+$') {
            try {
                Stop-Process -Id ([int]$processId) -Force -ErrorAction Stop
            } catch {
                Write-Warning "Failed to stop PID ${processId} on port ${Port}: $($_.Exception.Message)"
            }
        }
    }
}

$npmCmdObj = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if ($npmCmdObj) { $npmCmd = $npmCmdObj.Source } else { $npmCmd = (Get-Command "npm" -ErrorAction Stop).Source }

Set-Location $repoRoot
git config --global --add safe.directory $repoRoot
git fetch origin main
git checkout main
git pull --ff-only origin main

Stop-PortProcess -Port 5000
Stop-PortProcess -Port 3000

Set-Location $backendDir
& $npmCmd install --no-package-lock

Set-Location $frontendDir
& $npmCmd install --no-package-lock
& $npmCmd run build

& "$repoRoot\scripts\start-services.ps1"

Write-Host "Deployment completed."
