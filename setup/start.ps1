Write-Host "Checking environment..." -ForegroundColor Cyan

# ---------- PHP Detection ----------
$php = Get-Command php -ErrorAction SilentlyContinue

if ($php) {
    $PHP_BIN = "php"
} elseif (Test-Path "C:\xampp\php\php.exe") {
    $PHP_BIN = "C:\xampp\php\php.exe"
} else {
    Write-Host "[ERROR] PHP not found. Install XAMPP." -ForegroundColor Red
    exit
}

Write-Host "[OK] PHP -> $PHP_BIN" -ForegroundColor Green

# ---------- Node Detection ----------
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found" -ForegroundColor Red
    exit
}

if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm not found" -ForegroundColor Red
    exit
}

Write-Host "[OK] Node + npm detected" -ForegroundColor Green

# ---------- Backend ----------
Start-Process powershell -ArgumentList "cd api; $PHP_BIN -S 127.0.0.1:8000"

# ---------- Frontend ----------
Start-Process powershell -ArgumentList "cd frontend; npm install"
Start-Process powershell -ArgumentList "cd frontend; npm run dev"

Write-Host ""
Write-Host "[READY] http://localhost:5173" -ForegroundColor Green
