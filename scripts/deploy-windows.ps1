$ErrorActionPreference = "Stop"

$repoRoot = "C:\apps\anti"
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$logsDir = Join-Path $repoRoot "logs"

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

function Resolve-ExecutablePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName,

        [Parameter(Mandatory = $true)]
        [string[]]$CandidatePaths
    )

    foreach ($candidate in $CandidatePaths) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($command -and $command.Source) {
        return $command.Source
    }

    throw "Executable not found: $CommandName"
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
    foreach ($processId in $pids) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-Warning "Failed to stop PID ${processId} on port ${Port}: $($_.Exception.Message)"
        }
    }
}

Set-Location $repoRoot

$nodeExe = Resolve-ExecutablePath -CommandName "node" -CandidatePaths @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe"
)

$npmCmd = Resolve-ExecutablePath -CommandName "npm" -CandidatePaths @(
    "$env:ProgramFiles\nodejs\npm.cmd",
    "${env:ProgramFiles(x86)}\nodejs\npm.cmd"
)

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

$backendLog = Join-Path $logsDir "backend.log"
$frontendLog = Join-Path $logsDir "frontend.log"

Start-Process -FilePath "cmd.exe" `
    -WorkingDirectory $backendDir `
    -ArgumentList "/c `"$nodeExe`" server.js >> `"$backendLog`" 2>&1" `
    -WindowStyle Hidden

Start-Process -FilePath "cmd.exe" `
    -WorkingDirectory $frontendDir `
    -ArgumentList "/c `"$nodeExe`" scripts\serve-dist.cjs >> `"$frontendLog`" 2>&1" `
    -WindowStyle Hidden

Write-Host "Deployment completed."
