<?php
// api/db.php — Database bootstrap, schema, and migrations

$host    = '127.0.0.1';
$db      = 'stock_mgmt_system';
$user    = 'root';
$pass    = '';        // ← change if your MySQL root has a password
$charset = 'utf8mb4';
$opts = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $tmp = new PDO("mysql:host=$host;charset=$charset", $user, $pass, $opts);
    $tmp->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET $charset COLLATE utf8mb4_unicode_ci");

    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=$charset", $user, $pass, $opts);

    // ── Schema ─────────────────────────────────────────────────────
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS shops (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            name         VARCHAR(255) NOT NULL,
            owner_id     INT DEFAULT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS users (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            username      VARCHAR(100) NOT NULL UNIQUE,
            email         VARCHAR(255) DEFAULT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role          ENUM('Admin','Cashier') DEFAULT 'Admin',
            shop_id       INT DEFAULT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS products (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            shop_id        INT NOT NULL DEFAULT 1,
            name           VARCHAR(255) NOT NULL,
            price          DECIMAL(10,2) NOT NULL,
            stock_quantity INT NOT NULL DEFAULT 0,
            expiry_days    INT DEFAULT NULL,
            image_path     TEXT DEFAULT NULL,
            created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS stock_batches (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            product_id   INT NOT NULL,
            quantity     INT NOT NULL,
            buying_price DECIMAL(10,2) NOT NULL,
            expiry_date  DATE NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS sales (
            id           VARCHAR(64) PRIMARY KEY,
            shop_id      INT NOT NULL DEFAULT 1,
            total_amount DECIMAL(10,2) NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            synced_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS sale_items (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            sale_id    VARCHAR(64) NOT NULL,
            product_id INT NOT NULL,
            quantity   INT NOT NULL,
            price      DECIMAL(10,2) NOT NULL,
            profit     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            FOREIGN KEY (sale_id)    REFERENCES sales(id)    ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;

        CREATE TABLE IF NOT EXISTS sync_logs (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            action_type VARCHAR(50) NOT NULL,
            payload     JSON,
            synced_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    ");

    // ── Safe column migrations (skip if already applied) ───────────
    $safeAlter = [
        "ALTER TABLE products   ADD COLUMN image_path TEXT DEFAULT NULL",
        "ALTER TABLE products   ADD COLUMN shop_id INT NOT NULL DEFAULT 1",
        "ALTER TABLE sales      ADD COLUMN shop_id INT NOT NULL DEFAULT 1",
        "ALTER TABLE sale_items ADD COLUMN profit DECIMAL(10,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE users      ADD COLUMN shop_id INT DEFAULT NULL",
        "ALTER TABLE users      ADD COLUMN email VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE users      ADD COLUMN token VARCHAR(64) DEFAULT NULL",
    ];
    foreach ($safeAlter as $sql) {
        try { $pdo->exec($sql); } catch (PDOException $e) { /* already exists */ }
    }

    // ── NO SEED DATA — shops start empty ───────────────────────────
    // Users are created via signup (auth.php?action=signup)

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "DB init failed: " . $e->getMessage()]);
    exit;
}
