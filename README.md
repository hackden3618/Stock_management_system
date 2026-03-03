# 📦 Stock Management System, Growth Engine

A full-stack retail stock management and accounting system built with **React (Vite)** on the frontend and **PHP + MySQL** on the backend. Designed to run locally on XAMPP and be easily shared with your team.

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🛒 POS / Sell Products | Cart-based POS, stock validation, qty warnings |
| 📦 Inventory Management | Add products with photos, receive stock batches |
| 📊 Live Dashboard | SVG charts — 14-day revenue/profit trends, animated turnover gauge, hourly sales |
| 💰 FEFO Profit Tracking | Automatic First-Expiry-First-Out profit per sale |
| 🖼️ Product Photos | Real file upload (JPEG/PNG/WebP), stored server-side in `api/uploads/` |
| 💡 Recommended Prices | Margin-based price suggestion (35%, 25%, 20% tiers) |
| 🔔 Smart Alerts | Per-product: out-of-stock, low-stock, dead-stock, expiry warnings |
| 🔄 Silent Background Sync | localStorage queue → DB sync; 30s ping; idempotent UUID-based sales |
| 📵 Offline Mode | All reads served from local cache when server is unreachable |
| 🌙 Dark / Light Theme | Persistent toggle |
| 🔐 Auth | Session login — Admin and Cashier roles |

---

## 🛠 Tech Stack

- **Frontend** React 19 + Vite 7 + React Router 7 + Lucide Icons + pure SVG charts (zero charting library dependency)
- **Backend** PHP 8+, PDO, MySQL / MariaDB
- **Storage** REST JSON API, localStorage cache + sync queue

---

## 🚀 Quick Start — XAMPP on Arch Linux (or any OS)

### 1. Prerequisites

```bash
# Arch Linux — install XAMPP manually from https://apachefriends.org
# or use your distro's package for PHP + MySQL
sudo pacman -S nodejs npm    # only npm is needed; PHP is inside XAMPP
```

Start MySQL and Apache via XAMPP:

```bash
sudo /opt/lampp/lampp start
```

### 2. Place the project

```bash
cp -r Stock_management_system/ /opt/lampp/htdocs/stock/
# OR if cloning from git:
cd /opt/lampp/htdocs && git clone <your-repo-url> stock
```

### 3. Configure DB credentials

Open `api/db.php` and adjust:

```php
$host = '127.0.0.1';
$db   = 'stock_mgmt_system'; // auto-created on first run — nothing to import
$user = 'root';
$pass = '';                   // your MySQL password
```

### 4. Start the PHP API server

```bash
cd /opt/lampp/htdocs/stock/api
php -S 127.0.0.1:8000
```

> Keep this terminal open while using the app. The database and all tables are created automatically on first request.

### 5. Install and run the frontend

```bash
cd /opt/lampp/htdocs/stock/frontend
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 6. Default login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

---

## 📁 Project Structure

```
Stock_management_system/
├── api/
│   ├── db.php           # DB connection + auto schema bootstrap
│   ├── endpoints.php    # All REST API endpoints
│   ├── auth.php         # Login / auth endpoint
│   └── uploads/         # Product images (auto-created, writable)
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx      # KPIs, SVG charts, alert panels
    │   │   ├── Products.jsx       # POS sell screen
    │   │   ├── Cart.jsx           # Checkout + sync trigger
    │   │   ├── Stock.jsx          # Buy Products / receive stock
    │   │   ├── Notifications.jsx  # Full alert centre (per-product)
    │   │   ├── DeadStock.jsx      # Dead stock report
    │   │   ├── OutOfStock.jsx     # Out-of-stock report
    │   │   ├── Settings.jsx       # App settings
    │   │   └── Login.jsx
    │   ├── hooks/useSync.js       # 30s ping + background sync logic
    │   ├── lib/storage.js         # API_BASE_URL + StorageManager
    │   ├── context/AuthContext.jsx
    │   ├── App.jsx                # Sidebar layout + routing
    │   └── index.css
    └── package.json
```

---

## 🔌 API Reference

Base URL: `http://127.0.0.1:8000/endpoints.php?action=<action>`

| Action | Method | Description |
|---|---|---|
| `ping` | GET | Health-check — returns `{status:"success", ts:…}` |
| `getProducts` | GET | Full product catalog |
| `addProduct` | POST | Register new product + initial stock batch |
| `updateProduct` | POST | Edit name / price / image |
| `deleteProduct` | POST | Remove product and all batches |
| `addStock` | POST | Receive a new batch into an existing product |
| `uploadImage` | POST | Accept base64 image → save to `uploads/` → return URL |
| `getDashboardStats` | GET | All KPIs, alerts, recent sales |
| `getSalesChart` | GET | Daily revenue + profit for last N days (default 14) |
| `sync` | POST | Commit a sale (idempotent — UUID deduplication) |

Auth: `auth.php` — POST `{ username, password }` → returns token + user object

---

## 🔄 Sync Architecture

```
User makes a sale (Cart → Checkout)
          │
          ▼
   Sale written to localStorage queue (UUID assigned)
          │                  │
          │         Dashboard reads from queue length
          │         to show "X pending" badge
          │
   [ping every 30s / navigator.online event]
          │
       Online?
       /     \
      No      Yes
      │        │
   Wait       POST /api?action=sync
              │
              ├── Idempotency check (skip if UUID exists)
              ├── Pre-flight stock validation
              ├── FEFO batch deduction (oldest-expiry-first)
              ├── Profit calculated per line
              └── Products.stock_quantity decremented
                         │
                   fetchLatestProducts() → localStorage cache updated
                         │
                   Dashboard re-fetches stats (sales today flashes)
```

---

## 🖼️ Product Images

Images are uploaded as base64 from the browser → `api/uploadImage` → saved to `api/uploads/` as a file → the URL (`http://127.0.0.1:8000/uploads/prod_xxx.jpg`) is stored in `products.image_path`.

- **Max size**: 5 MB per image
- **Supported formats**: JPEG, PNG, WebP, GIF
- **Fallback**: If the server upload fails (e.g. offline), the data URI is stored temporarily in memory

---

## 💡 Recommended Pricing Logic

When you enter the total batch cost and quantity:

```
unit_cost = total_batch_cost / quantity

if unit_cost < 100  → recommend unit_cost × 1.35  (35% margin)
if unit_cost < 500  → recommend unit_cost × 1.25  (25% margin)
else                → recommend unit_cost × 1.20  (20% margin)
```

You are always free to override the suggestion.

---

## 🔔 Alert Thresholds

| Alert Type | Condition |
|---|---|
| **Out of Stock** | `stock_quantity <= 0` |
| **Low Stock** | `0 < stock_quantity < 10` |
| **Dead Stock** | Batch sitting > 60 days with remaining units |
| **Expiry Warning** | Batch expires within 14 days |
| **Expired** | Batch past expiry date (highlighted red) |

---

## 📊 Dashboard Charts

All charts are rendered in pure SVG — no external charting library required.

| Chart | Data |
|---|---|
| 14-Day Revenue Bar Chart | `getSalesChart?days=14` → `daily[].revenue` |
| 14-Day Profit Line Chart | Same call → `daily[].profit` |
| Turnover Gauge | `getDashboardStats` → `turnover_ratio` (COGS / avg inventory) |
| Today's Hourly Bar Chart | `getSalesChart` → `hourly[]` (appears once you have same-day sales) |
| Top Products Horizontal Bar | `top_products[].units_sold` |

---

## 🤝 Sharing with Your Team

Every team member needs:

1. XAMPP (Apache + MySQL running)
2. Node.js + npm

Steps:
```bash
# 1. Copy or clone the project into htdocs
# 2. Start the API:
cd api && php -S 127.0.0.1:8000

# 3. Start the frontend:
cd frontend && npm install && npm run dev
```

The database bootstraps itself automatically — **no SQL file to import**.

### Changing the API URL

If using a shared or remote server, edit one line:

```js
// frontend/src/lib/storage.js
export const API_BASE_URL = 'http://YOUR_SERVER_IP:8000/endpoints.php';
```

### Production build

```bash
cd frontend
npm run build        # outputs to frontend/dist/
```

Copy `dist/` to your Apache `htdocs` and update `API_BASE_URL` to the server's public address.

---

## ⚙️ Advanced: Apache instead of PHP built-in

1. Place project in `/opt/lampp/htdocs/stock/`
2. Create `api/.htaccess`:
   ```apache
   Header set Access-Control-Allow-Origin "*"
   ```
3. Update storage.js:
   ```js
   export const API_BASE_URL = 'http://localhost/stock/api/endpoints.php';
   ```

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| `DB init failed` | Check MySQL is running; verify `$user`/`$pass` in `db.php` |
| CORS errors in browser | Confirm `php -S 127.0.0.1:8000` is running in the `api/` directory |
| Images not displaying | Run `chmod -R 755 api/uploads/` to ensure the folder is writable |
| Sales stuck as "pending" | Open DevTools → Network → check the `sync` endpoint response body for errors |
| Stale product data | Click Refresh in the Buy Products page, or wait 30s for auto-refresh |
| `404 Endpoint not found` | Double-check you're pointing to `endpoints.php` not `index.php` |
| Profit shows 0 | This was caused by a `pid` bug — fixed. Delete old products and re-add to get correct batches |

---

## 📄 License

MIT — free to use and modify for personal or commercial retail projects.
