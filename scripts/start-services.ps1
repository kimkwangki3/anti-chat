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

Start-Sleep -Seconds 5
Write-Host "OK: services started"
