# Kill any process using port 3000
Write-Host "[CHECK] Checking for processes on port 3000..."
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "[KILL] Found processes on port 3000. Killing them..."
    foreach ($process in $processes) {
        $procid = $process.OwningProcess
        Write-Host "  Killing PID: $procid"
        Stop-Process -Id $procid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "[OK] Port 3000 cleared"
} else {
    Write-Host "[OK] Port 3000 is free"
}

Write-Host ""
Write-Host "[START] Starting server..."
npm start
