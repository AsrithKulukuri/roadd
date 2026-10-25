# Redis Lifecycle Manager Script for ROAD
# Automatically checks connectivity, Docker, or native Windows Redis binary

$ErrorActionPreference = "Continue"

Write-Host "[Redis Check] Probing 127.0.0.1:6379..." -ForegroundColor Cyan
$conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($conn) {
    Write-Host "[Redis Ready] Redis is already active and listening on port 6379." -ForegroundColor Green
    exit 0
}

Write-Host "[Redis Offline] No Redis instance responding on port 6379." -ForegroundColor Yellow

# 1. Try Docker if installed
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Write-Host "[Docker] Docker detected. Checking/starting Redis container..." -ForegroundColor Cyan
    $existing = docker ps -a --filter "name=road-redis" --format "{{.Names}}"
    if ($existing -eq "road-redis") {
        Write-Host "Starting existing container 'road-redis'..." -ForegroundColor Cyan
        docker start road-redis
    } else {
        Write-Host "Pulling redis:alpine image and running 'road-redis'..." -ForegroundColor Cyan
        docker run -d --name road-redis -p 6379:6379 --restart unless-stopped redis:alpine
    }
    Start-Sleep -Seconds 2
    $connAfter = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connAfter) {
        Write-Host "[Redis Ready] Docker Redis started successfully on port 6379." -ForegroundColor Green
        exit 0
    }
}

# 2. Try Windows native Redis Server (winget installed)
$nativeRedis = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "redis-server.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($nativeRedis) {
    Write-Host "[Native Redis] Found Windows Redis server at $($nativeRedis.FullName)." -ForegroundColor Cyan
    Start-Process -FilePath $nativeRedis.FullName -ArgumentList "--port 6379" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $connAfter = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connAfter) {
        Write-Host "[Redis Ready] Native Windows Redis started successfully on port 6379." -ForegroundColor Green
        exit 0
    }
}

Write-Host "[Redis Error] Could not start Redis. Please ensure Docker is running or run: winget install taizod1024.redis-windows-fork" -ForegroundColor Red
exit 1
