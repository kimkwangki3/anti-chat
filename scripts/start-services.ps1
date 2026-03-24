$repoRoot = "C:\apps\anti"
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$logsDir = Join-Path $repoRoot "logs"
$nodeExe = "C:\Program Files\nodejs\node.exe"

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

$backendLog = Join-Path $logsDir "backend.log"
$frontendLog = Join-Path $logsDir "frontend.log"

# 기존 프로세스 종료
$ports = @(5000, 3000)
foreach ($port in $ports) {
    $result = netstat -ano 2>$null | Select-String ":$port\s.*LISTENING"
    if ($result) {
        $result | ForEach-Object {
            $parts = ($_ -split '\s+') | Where-Object { $_ -ne '' }
            $procId = $parts[-1]
            if ($procId -match '^\d+$') {
                try { Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue } catch {}
            }
        }
    }
}

Start-Sleep -Seconds 1

# 백엔드 시작
Start-Process -FilePath $nodeExe `
    -ArgumentList "server.js" `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendLog `
    -RedirectStandardError (Join-Path $logsDir "backend.err.log") `
    -WindowStyle Hidden

# 프론트엔드 시작
Start-Process -FilePath $nodeExe `
    -ArgumentList "scripts\serve-dist.cjs" `
    -WorkingDirectory $frontendDir `
    -RedirectStandardOutput $frontendLog `
    -RedirectStandardError (Join-Path $logsDir "frontend.err.log") `
    -WindowStyle Hidden

Start-Sleep -Seconds 5
Write-Host "OK: services started"
