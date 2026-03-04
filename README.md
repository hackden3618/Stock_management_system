# Stock Management System

A simple full-stack stock management system:

- Backend: PHP (built-in server)
- Frontend: React + Vite

---

# Requirements

Make sure you have installed:

- Node.js (v18 or newer)
- npm (comes with Node)
- PHP

---

# 🚀 Running the Project

---

## 🪟 Windows (VS Code Recommended)

### Step 1: Open the project

- Open **VS Code**
- Click **File → Open Folder**
- Select the project folder

---

### Step 2: Open terminal

- Press: `Ctrl + ~`

---

### Step 3: Start Backend (PHP)

If PHP works globally:

```powershell
php -S 127.0.0.1:8000 -t api
````

If using XAMPP:

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8000 -t api
```

---

### Step 4: Start Frontend

Open a **new terminal** in VS Code:

```powershell
cd frontend
npm install
npm run dev
```

---

### Step 5: Open the app

Go to:

* [http://localhost:5173](http://localhost:5173)

---

## 🐧 Linux (Arch / Ubuntu / etc.)

### Step 1: Start Backend

```bash
php -S 127.0.0.1:8000 -t api
```

If using XAMPP:

```bash
/opt/lampp/bin/php -S 127.0.0.1:8000 -t api
```

---

### Step 2: Start Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

---

### Step 3: Open the app

* [http://localhost:5173](http://localhost:5173)

---

# 🧠 Notes

* Backend runs on: `127.0.0.1:8000`
* Frontend runs on: `localhost:5173`
* Keep both terminals running

---

# ❗ Troubleshooting

### PHP not found

* Windows: Use full path (XAMPP example above)
* Linux: Install PHP or use `/opt/lampp/bin/php`

---

### Port already in use

Change backend port:

```bash
/opt/lampp/bin/php -S 127.0.0.1:8001 -t api
```

---

### npm not found

Install Node.js from:

* [https://nodejs.org/](https://nodejs.org/)

---

# 🧑‍💻 Developer Notes

* Frontend: React (Vite)
* Backend: Plain PHP
* No frameworks required

---

# ✔️ Summary

Run two things:

1. Backend (PHP)
2. Frontend (npm)

That’s it.

---
