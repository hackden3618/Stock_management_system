# 📦 Growth Engine — Stock Management System

A full-stack retail POS and inventory system. PHP API backend, React + Vite frontend, MySQL database.

---

## 🚀 Quick Start (First time setup)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/Stock_management_system.git
cd Stock_management_system
```

### 2. Start MySQL
Make sure MySQL is running (via XAMPP, WAMP, or system service):
```bash
# Arch Linux / systemd
sudo systemctl start mysqld

# XAMPP
sudo /opt/lampp/lampp startmysql
```

### 3. Run the database migration ← everyone does this once
```bash
cd api
php migrate.php
```

You should see output like:
```
── Database ──
  ✅ Database `stock_mgmt_system` ready

── Tables ──
  ✅ Table `users` ready
  ✅ Table `products` ready
  ...

── Seed data ──
  ✅ Admin user created  (username: admin / password: admin123)
  ✅ Sample products + stock batches seeded (6 products)

✅ Migration complete.
```

### 4. Start the PHP API server
```bash
# from the api/ directory
php -S 127.0.0.1:8000
```

### 5. Start the React frontend
```bash
cd frontend
npm install       # first time only
npm run dev
```

### 6. Open the app
Go to **http://localhost:5173** and log in with:
- **Username:** `admin`
- **Password:** `admin123`

---

## 🔄 Collaborator workflow (pulling updates)

When a teammate pushes new code, here's what to do:

```bash
git pull
cd api
php migrate.php    # ← always run this after pulling
```

`migrate.php` is **safe to run multiple times** — it skips steps that are already done and only applies what's new. You will never lose your existing data by running it again.

```
── Column migrations ──
  ⏭  Add image_path to products (already applied)
  ✅ Add new_column_name           ← only new things get applied
```

---

## 📂 Project structure

```
Stock_management_system/
├── api/
│   ├── migrate.php      ← run this after every git pull
│   ├── db.php           ← DB connection + auto-bootstrap
│   ├── endpoints.php    ← all API actions
│   ├── auth.php         ← login / token
│   ├── index.php        ← router
│   └── uploads/         ← product images (not synced via git)
├── frontend/
│   ├── src/
│   │   ├── pages/       ← Dashboard, Products, Cart, Stock, ...
│   │   ├── hooks/       ← useSync (online ping)
│   │   ├── context/     ← AuthContext
│   │   └── lib/
│   │       └── storage.js  ← API_BASE_URL + cart helpers
│   └── package.json
└── README.md
```

---

## 🔌 API Endpoints

Base URL: `http://127.0.0.1:8000/endpoints.php`

| Action | Method | Description |
|---|---|---|
| `getProducts` | GET | All products with stock |
| `getDashboardStats` | GET | KPIs, alerts, top products |
| `getSalesChart&days=14` | GET | 14-day revenue + profit |
| `addProduct` | POST | Create product + first batch |
| `receiveStock` | POST | Add new stock batch |
| `updateProduct` | POST | Edit name / price / image |
| `deleteProduct` | POST | Remove product + batches |
| `sync` | POST | Record a sale (FEFO deduction) |
| `uploadImage` | POST | Upload product photo |
| `ping` | GET | Health check |

---

## 🗄️ Database schema

```
users          → id, username, password_hash, role
products       → id, name, price, stock_quantity, image_path
stock_batches  → id, product_id, quantity, buying_price, expiry_date
sales          → id (UUID), total_amount, created_at
sale_items     → id, sale_id, product_id, quantity, price, profit
sync_logs      → id, action_type, payload, synced_at
```

Stock is deducted **FEFO** (First Expiry, First Out) — oldest batches are consumed first.

---

## 🖼️ Product images

Product images are uploaded to `api/uploads/` and served by the PHP server. They are **not committed to git** (see `.gitignore`). Each collaborator's uploads folder will contain whatever images they've uploaded on their machine. When you move to a hosted server, you'll copy the uploads folder manually or use shared storage.

---

## ⚙️ Changing the API URL

If you run the API on a different port or host, update this one line in `frontend/src/lib/storage.js`:

```js
export const API_BASE_URL = 'http://127.0.0.1:8000/endpoints.php';
```

---

## 🐞 Troubleshooting

| Problem | Fix |
|---|---|
| `No products found` | Make sure `php -S 127.0.0.1:8000` is running in the `api/` folder |
| `DB init failed` | Run `php migrate.php` and check MySQL is started |
| Charts show no data | Make at least one sale through the cart |
| Login fails | Re-run `php migrate.php` — it will re-seed admin if users table is empty |
| CORS error in browser | Confirm PHP is running on port 8000, not 8080 or another port |
| Images not showing for collaborators | Images are local — each dev has their own `api/uploads/` |

---

## 👥 Login credentials (default)

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Admin |

> ⚠️ Change the admin password after deploying to a live server.

