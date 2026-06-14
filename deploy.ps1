# anti-chat 배포 스크립트
# 사용법(서버에서): cd C:\apps\anti ; git pull ; .\deploy.ps1
$ErrorActionPreference = 'Stop'
$root = 'C:\apps\anti'

Write-Host "[1/3] syncing to origin/main (force)..." -ForegroundColor Cyan
# git pull 은 런타임 로그파일/로컬수정 때문에 자주 막히므로 강제로 원격과 일치시킴
git -C $root fetch origin
git -C $root reset --hard origin/main

Write-Host "[2/3] building frontend..." -ForegroundColor Cyan
Set-Location "$root\frontend"
npm run build

Write-Host "[3/3] restarting backend..." -ForegroundColor Cyan
pm2 restart backend --update-env

Write-Host "Done. Showing logs (Ctrl+C to exit)..." -ForegroundColor Green
pm2 logs backend --lines 25
