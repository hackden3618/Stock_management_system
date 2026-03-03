# Growth Engine - Stock Management & POS System

A production-ready, offline-first stock management and POS system designed for retail business intelligence.

## 🚀 Features

- **Intelligent Dashboard**: Real-time inventory valuation, sales velocity (burn rate), and realized profit.
- **Strategist Alerts**: Automatic detection of Dead Stock (60+ days) and Out of Stock items with actionable business suggestions.
- **Batch Management (FEFO)**: Supports multiple stock batches with different costs and expiry dates, ensuring First-Expired-First-Out sales logic.
- **Smart Pricing**: Automatically calculates unit costs from batch totals and recommends competitive selling prices based on profit margins.
- **Silent Background Sync**: Works offline with a silent synchronization engine that pings the server for connectivity.
- **E-Commerce POS**: A visual, mobile-responsive product grid for quick sales with real-time stock validation.
- **Light/Dark Mode**: Optimized Forest Green theme for professional use.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Lucide Icons, Vanilla CSS.
- **Backend**: PHP (PDO), MySQL.
- **Persistence**: LocalStorage (client-side) + MySQL (server-side).

## 📥 Setup Instructions (Arch Linux / XAMPP)

### 1. Prerequisites

- **XAMPP** installed in `/opt/lampp`.
- **Node.js** and **npm** for the frontend.

### 2. Database Setup

1. Start XAMPP (Apache & MySQL).
2. The system is designed to auto-initialize the database. However, ensure your MySQL `root` user has no password (default) or update `api/db.php`.
   ```bash
   sudo /opt/lampp/xampp start
   ```

### 3. Backend Execution

The backend is located in the `api/` directory. You can run it via PHP's built-in server for development:

```bash
cd api
php -S 127.0.0.1:8000
```

_Ensure the URL `http://127.0.0.1:8000` is accessible._

### 4. Frontend Execution

1. Navigate to the `frontend` directory.
2. Install dependencies.
3. Start the Vite development server.

```bash
cd frontend
npm install
npm run dev
```

_Default frontend URL: `http://localhost:5173`_

## 📁 Project Structure

- `api/`: Shared PHP backend.
  - `db.php`: Database connection and schema auto-init.
  - `endpoints.php`: Main REST API.
  - `uploads/`: Directory for product images.
- `frontend/`: React application.
  - `src/hooks/useSync.js`: Silent sync logic.
  - `src/lib/storage.js`: Offline caching wrapper.
  - `src/pages/`: Dashboard, Stock, Products, etc.

## 📝 Important Notes

- **Portability**: This project uses absolute local paths for development (Vite). When sharing, ensure the `api` and `frontend` folders remain relative or update the `API_URL` constants in the frontend.
- **Image Support**: Currently supports Base64 strings or external URLs for product photos.

---

_Created for Production Excellence._
# Stock_management_system
