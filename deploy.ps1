# anti-chat 배포 스크립트
# 사용법(서버에서): cd C:\apps\anti ; git pull ; .\deploy.ps1
$ErrorActionPreference = 'Stop'
$root = 'C:\apps\anti'

Write-Host "[1/3] git pull..." -ForegroundColor Cyan
git -C $root pull

Write-Host "[2/3] building frontend..." -ForegroundColor Cyan
Set-Location "$root\frontend"
npm run build

Write-Host "[3/3] restarting backend..." -ForegroundColor Cyan
pm2 restart backend --update-env

Write-Host "Done. Showing logs (Ctrl+C to exit)..." -ForegroundColor Green
pm2 logs backend --lines 25
