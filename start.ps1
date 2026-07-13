$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Output "Killing old processes..."
Get-Process -Name "python","node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
# Double-check ports are free
netstat -ano | Select-String ":5173\s|:8000\s" | Select-String "LISTENING" | ForEach-Object {
    $pid = $_ -replace '.*\s+(\d+)$', '$1'
    if ($pid -match '^\d+$') { taskkill /F /PID $pid 2>$null }
}

Write-Output "Cleaning pycache..."
Get-ChildItem -Path "$root\backend" -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force

Write-Output "Starting backend..."
Start-Process -WindowStyle Hidden -FilePath "C:\Users\PVTUSER2\AppData\Local\Programs\Python\Python313\python.exe" -ArgumentList "-m backend.main" -WorkingDirectory $root

Write-Output "Waiting for backend..."
while ($true) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 3
        if ($r.Content -match '"status":"ok"') { break }
    } catch {}
    Start-Sleep 3
}
Write-Output "Backend ready."

Write-Output "Starting frontend..."
Start-Process -WindowStyle Hidden -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$root\frontend`" && npx.cmd vite" -WorkingDirectory "$root\frontend"

Write-Output "Waiting for frontend..."
while ($true) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3
        if ($r.Content -match '<div id=.root.>') { break }
    } catch {}
    Start-Sleep 2
}
Write-Output "Frontend ready at http://localhost:5175"
Start-Process "http://localhost:5175"