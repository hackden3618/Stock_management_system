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
