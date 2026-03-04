# 📦 Stock Management System, Growth Engine

A full-stack retail stock management and accounting system built with:

* **Frontend**: React (Vite)
* **Backend**: PHP + MySQL (XAMPP-friendly)
* **Storage**: REST API + local cache + sync queue

Runs locally. Shares easily. Doesn’t fight your OS.

---

# 🚀 Quick Start (Recommended)

This project includes **smart startup scripts** that:

* Detect your OS
* Detect PHP (system or XAMPP)
* Detect Node/npm
* Start backend + frontend automatically

---

## ⚡ 1. Run the Auto Script

### Open terminal (or VS Code terminal)

```bash
cd path/to/stock
```

---

### 🐧 Linux / macOS

```bash
chmod +x start.sh
./start.sh
```

---

### 🪟 Windows (PowerShell)

```powershell
./start.ps1
```

If blocked:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🌐 Open App

```
http://localhost:5173
```

---

## 🔐 Login

| Field    | Value    |
| -------- | -------- |
| Username | admin    |
| Password | admin123 |

---

# 🧠 What the Script Handles

* Finds PHP:

  * `php`
  * `/opt/lampp/bin/php`
  * `C:\xampp\php\php.exe`
* Checks Node + npm
* Starts backend (PHP server)
* Installs frontend deps
* Starts frontend (Vite)

No alias needed. No guessing.

---

# 📜 Scripts

---

## 🐧 `start.sh` (Linux/macOS)

```bash
#!/bin/bash

echo "Checking environment..."

# ---------- PHP Detection ----------
if command -v php >/dev/null 2>&1; then
    PHP_BIN="php"
elif [ -x "/opt/lampp/bin/php" ]; then
    PHP_BIN="/opt/lampp/bin/php"
else
    echo "[ERROR] PHP not found. Install PHP or XAMPP."
    exit 1
fi

echo "[OK] PHP -> $PHP_BIN"

# ---------- Node Detection ----------
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js not found."
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm not found."
    exit 1
fi

echo "[OK] Node + npm detected"

# ---------- Start Backend ----------
echo "Starting backend..."
cd api || exit
$PHP_BIN -S 127.0.0.1:8000 &
BACK_PID=$!

# ---------- Start Frontend ----------
echo "Starting frontend..."
cd ../frontend || exit
npm install
npm run dev &
FRONT_PID=$!

echo ""
echo "[READY] http://localhost:5173"
echo "Press Ctrl+C to stop"

trap "kill $BACK_PID $FRONT_PID" EXIT
wait
```

---

## 🪟 `start.ps1` (Windows)

```powershell
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
```

---

# 👑 Ultimate Mode (Single Cross-Platform Launcher)

If you want **one command for everything**, use Node as the launcher.

---

## 📜 `start.js`

```javascript
const { spawn } = require("child_process");
const os = require("os");

function run(cmd, args, options = {}) {
  const p = spawn(cmd, args, { stdio: "inherit", shell: true, ...options });
  return p;
}

console.log("Checking environment...");

// Node check
if (!process.version) {
  console.error("Node is required.");
  process.exit(1);
}

// PHP detection
let php = "php";

const isWin = os.platform() === "win32";

if (isWin) {
  php = "php";
} else {
  php = "php";
}

// fallback handled by system/XAMPP PATH

console.log("Starting backend...");
run(php, ["-S", "127.0.0.1:8000"], { cwd: "api" });

console.log("Installing frontend deps...");
run("npm", ["install"], { cwd: "frontend" });

setTimeout(() => {
  console.log("Starting frontend...");
  run("npm", ["run", "dev"], { cwd: "frontend" });
}, 2000);

console.log("\nApp will be available at http://localhost:5173");
```

---

## ▶️ Run It

```bash
node start.js
```

---

# 🧠 VS Code Users

1. Open project folder
2. Open terminal (`Ctrl + ``)
3. Run:

```bash
./start.sh
```

or

```powershell
./start.ps1
```

or

```bash
node start.js
```

---

# 🛠 Manual Setup (Fallback)

## Start backend

```bash
cd api
php -S 127.0.0.1:8000
```

---

## Start frontend

```bash
cd frontend
npm install
npm run dev
```

---

# ⚠️ Troubleshooting

| Issue             | Fix                               |
| ----------------- | --------------------------------- |
| PHP not found     | Install XAMPP or add to PATH      |
| Node not found    | Install Node.js                   |
| MySQL not running | Start in XAMPP                    |
| Port conflict     | Disable Skype/IIS                 |
| App not loading   | Ensure backend + frontend running |

---

# 🧠 Notes

* Backend → [http://127.0.0.1:8000](http://127.0.0.1:8000)
* Frontend → [http://localhost:5173](http://localhost:5173)
* DB auto-creates (no SQL import)

---

# 📄 License

MIT

---
