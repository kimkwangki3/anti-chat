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
        if (Test-Path $candidate) { return $candidate }
    }

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($command -and $command.Source) { return $command.Source }
    throw "Executable not found: $CommandName"
}

function Stop-PortProcess {
    param([Parameter(Mandatory = $true)][int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) { return }
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $pids) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-Warning "Failed to stop PID ${processId} on port ${Port}: $($_.Exception.Message)"
        }
    }
}

function Wait-ListeningPort {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listening) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

$nodeExe = Resolve-ExecutablePath -CommandName "node" -CandidatePaths @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe"
)

$backendLog = Join-Path $logsDir "backend.log"
$frontendLog = Join-Path $logsDir "frontend.log"

Stop-PortProcess -Port 5000
Stop-PortProcess -Port 3000

Start-Process -FilePath "cmd.exe" `
    -WorkingDirectory $backendDir `
    -ArgumentList "/c `"$nodeExe`" server.js >> `"$backendLog`" 2>&1" `
    -WindowStyle Hidden

Start-Process -FilePath "cmd.exe" `
    -WorkingDirectory $frontendDir `
    -ArgumentList "/c `"$nodeExe`" scripts\serve-dist.cjs >> `"$frontendLog`" 2>&1" `
    -WindowStyle Hidden

$backendReady = Wait-ListeningPort -Port 5000 -TimeoutSeconds 30
$frontendReady = Wait-ListeningPort -Port 3000 -TimeoutSeconds 30

if (-not $backendReady -or -not $frontendReady) {
    Write-Host "Service startup failed. Recent logs:"
    if (Test-Path $backendLog) { Get-Content $backendLog -Tail 80 }
    if (Test-Path $frontendLog) { Get-Content $frontendLog -Tail 80 }
    throw "Failed to start services. backendReady=$backendReady, frontendReady=$frontendReady"
}

Write-Host "OK: 5000/3000 listening"
