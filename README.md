# 📦 Stock Management System, Growth Engine

## 🚀 Quick Start (Cross-Platform Setup --- Everyone Welcome 😎)

Yes... even you Windows guys, I got you this time 😉

------------------------------------------------------------------------

## 🧰 Prerequisites

### Linux (Arch, Fedora, Debian/Ubuntu)


Debian/Ubuntu: sudo apt update sudo apt install nodejs npm

------------------------------------------------------------------------

### Windows Setup (Simple Mode 🧠)

1.  Install Node.js: https://nodejs.org/en/download/

2.  Install XAMPP: https://www.apachefriends.org/index.html

3.  Start Apache and MySQL from XAMPP Control Panel

------------------------------------------------------------------------

## ⚡ One-Click Windows Starter Script

Save this as: start_app.bat

  ----------------------------------------------------------------
  @echo off echo Starting Stock Management System...

  cd /d C:`\xampp`{=tex}`\htdocs`{=tex}`\stock`{=tex}`\api`{=tex}
  start cmd /k php -S 127.0.0.1:8000

  cd /d
  C:`\xampp`{=tex}`\htdocs`{=tex}`\stock`{=tex}`\frontend`{=tex}
  start cmd /k npm install start cmd /k npm run dev

  echo. echo App starting... echo Open http://localhost:5173 in
  your browser pause
  ----------------------------------------------------------------

Double-click it and relax 😎

------------------------------------------------------------------------

## 🐧 Linux Start

cd api php -S 127.0.0.1:8000

cd ../frontend npm install npm run dev

------------------------------------------------------------------------

## 🔐 Login

Username: admin Password: admin123

------------------------------------------------------------------------

## 🧠 Notes

-   Backend runs on: http://127.0.0.1:8000
-   Frontend runs on: http://localhost:5173
-   Database auto-creates --- no import needed

------------------------------------------------------------------------

## 🤝 Team Setup

Everyone installs: - XAMPP - Node.js

Then runs: - Backend (php server) - Frontend (npm dev)

No drama. No SQL files. Just run.

------------------------------------------------------------------------

## 🐛 Troubleshooting

-   Apache/MySQL not running → start in XAMPP
-   php not recognized → add C:`\xampp`{=tex}`\php `{=tex}to PATH
-   port issues → disable Skype/IIS

------------------------------------------------------------------------

MIT License
