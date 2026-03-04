<?php
/**
 * migrate.php — Run this ONCE after cloning or pulling new changes.
 *
 * Usage (terminal):
 *   cd api
 *   php migrate.php
 *
 * What it does:
 *   1. Creates the database if it doesn't exist
 *   2. Creates ALL tables with the full current schema
 *   3. Runs safe column/index migrations (skips if already applied)
 *   4. Prints a clear pass/skip/fail log for every step
 *
 * Multi-user model:
 *   Every shop is isolated by shop_id. A user signs up → creates a shop →
 *   all products, sales and batches belong to that shop only.
 *   No seed data is created — shops start empty and owners add their own products.
 */

// ── Config ─────────────────────────────────────────────────────────────
$host    = '127.0.0.1';
$db      = 'stock_mgmt_system';
$user    = 'root';
$pass    = '';          // ← change if your MySQL has a root password
$charset = 'utf8mb4';
// ───────────────────────────────────────────────────────────────────────

$opts = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

$isCLI = php_sapi_name() === 'cli';
$nl    = $isCLI ? "\n" : "<br>";
if (!$isCLI) { header('Content-Type: text/plain'); }

function ok($msg)      { global $nl; echo "  ✅ $msg$nl"; }
function skip($msg)    { global $nl; echo "  ⏭  $msg (already applied)$nl"; }
function fail($msg)    { global $nl; echo "  ❌ $msg$nl"; }
function section($ttl) { global $nl; echo "{$nl}── $ttl ──{$nl}"; }

echo "GROWTH ENGINE — Database Migration{$nl}";
echo str_repeat('─', 40) . $nl;

// ── Step 1: Create database ─────────────────────────────────────────────
section('Database');
try {
    $tmp = new PDO("mysql:host=$host;charset=$charset", $user, $pass, $opts);
    $tmp->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET $charset COLLATE utf8mb4_unicode_ci");
    ok("Database `$db` ready");
} catch (PDOException $e) {
    fail("Cannot connect to MySQL: " . $e->getMessage());
    exit(1);
}

$pdo = new PDO("mysql:host=$host;dbname=$db;charset=$charset", $user, $pass, $opts);

// ── Step 2: Create tables (full current schema) ─────────────────────────
section('Tables');

$tables = [

    'shops' => "CREATE TABLE IF NOT EXISTS shops (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        owner_id   INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB",

    'users' => "CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        username      VARCHAR(100) NOT NULL UNIQUE,
        email         VARCHAR(255) DEFAULT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          ENUM('Admin','Cashier') DEFAULT 'Admin',
        shop_id       INT DEFAULT NULL,
        token         VARCHAR(64)  DEFAULT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB",

    'products' => "CREATE TABLE IF NOT EXISTS products (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        shop_id        INT NOT NULL,
        name           VARCHAR(255) NOT NULL,
        price          DECIMAL(10,2) NOT NULL,
        stock_quantity INT NOT NULL DEFAULT 0,
        expiry_days    INT DEFAULT NULL,
        image_path     TEXT DEFAULT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB",

    'stock_batches' => "CREATE TABLE IF NOT EXISTS stock_batches (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        product_id   INT NOT NULL,
        quantity     INT NOT NULL,
        buying_price DECIMAL(10,2) NOT NULL,
        expiry_date  DATE NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB",

    'sales' => "CREATE TABLE IF NOT EXISTS sales (
        id           VARCHAR(64) PRIMARY KEY,
        shop_id      INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB",

    'sale_items' => "CREATE TABLE IF NOT EXISTS sale_items (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        sale_id    VARCHAR(64) NOT NULL,
        product_id INT NOT NULL,
        quantity   INT NOT NULL,
        price      DECIMAL(10,2) NOT NULL,
        profit     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (sale_id)    REFERENCES sales(id)    ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB",

    'sync_logs' => "CREATE TABLE IF NOT EXISTS sync_logs (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        payload     JSON,
        synced_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB",
];

foreach ($tables as $name => $sql) {
    try {
        $pdo->exec($sql);
        ok("Table `$name` ready");
    } catch (PDOException $e) {
        fail("Table `$name`: " . $e->getMessage());
    }
}

// ── Step 3: Column / index migrations ───────────────────────────────────
// Safe — each one silently skips if the column already exists.
// Add future migrations HERE (never remove old ones).
section('Column migrations');

$migrations = [
    ['Add image_path to products',              "ALTER TABLE products   ADD COLUMN image_path TEXT DEFAULT NULL"],
    ['Add shop_id to products',                 "ALTER TABLE products   ADD COLUMN shop_id INT NOT NULL DEFAULT 1"],
    ['Add shop_id to sales',                    "ALTER TABLE sales      ADD COLUMN shop_id INT NOT NULL DEFAULT 1"],
    ['Add profit to sale_items',                "ALTER TABLE sale_items ADD COLUMN profit DECIMAL(10,2) NOT NULL DEFAULT 0.00"],
    ['Add email to users',                      "ALTER TABLE users      ADD COLUMN email VARCHAR(255) DEFAULT NULL"],
    ['Add shop_id to users',                    "ALTER TABLE users      ADD COLUMN shop_id INT DEFAULT NULL"],
    ['Add token to users',                      "ALTER TABLE users      ADD COLUMN token VARCHAR(64) DEFAULT NULL"],
    ['Add owner_id to shops',                   "ALTER TABLE shops      ADD COLUMN owner_id INT DEFAULT NULL"],
    ['Index products.shop_id',                  "ALTER TABLE products   ADD INDEX idx_products_shop (shop_id)"],
    ['Index sales.shop_id',                     "ALTER TABLE sales      ADD INDEX idx_sales_shop (shop_id)"],
];

foreach ($migrations as [$desc, $sql]) {
    try {
        $pdo->exec($sql);
        ok($desc);
    } catch (PDOException $e) {
        $msg = $e->getMessage();
        // 1060 = Duplicate column, 1061 = Duplicate key name — both mean already applied
        if (str_contains($msg, 'Duplicate column') || str_contains($msg, 'Duplicate key name')) {
            skip($desc);
        } else {
            fail("$desc: $msg");
        }
    }
}

// ── Step 4: No seed data — shops start empty ─────────────────────────────
section('Seed data');
echo "  ℹ️  No seed data. Users sign up via the app; their shop starts empty.$nl";
echo "  ℹ️  Each user's data is fully isolated by shop_id.$nl";

// ── Done ───────────────────────────────────────────────────────────────
echo "{$nl}" . str_repeat('─', 40) . $nl;
echo "✅ Migration complete. Start the API server with:{$nl}";
echo "   cd api && php -S 127.0.0.1:8000{$nl}{$nl}";
echo "Then open the frontend:{$nl}";
echo "   cd frontend && npm install && npm run dev{$nl}{$nl}";
