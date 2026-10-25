# Test Redis Ping
$ErrorActionPreference = "SilentlyContinue"

$cli = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "redis-cli.exe" | Select-Object -First 1

if ($cli) {
    & $cli.FullName ping
} else {
    $conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet
    if ($conn) {
        Write-Host "PONG (TCP Port 6379 Open)" -ForegroundColor Green
    } else {
        Write-Host "Could not connect to Redis at 127.0.0.1:6379" -ForegroundColor Red
    }
}
