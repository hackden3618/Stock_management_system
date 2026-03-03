<?php
// api/db.php  — Database bootstrap & schema init

$host    = '127.0.0.1';
$db      = 'stock_mgmt_system';
$user    = 'root';   // ← change if needed
$pass    = '';       // ← change if needed
$charset = 'utf8mb4';

$dsn     = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Bootstrap: create DB if absent
    $tempPdo = new PDO("mysql:host=$host;charset=$charset", $user, $pass, $options);
    $tempPdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET $charset COLLATE utf8mb4_unicode_ci");

    $pdo = new PDO($dsn, $user, $pass, $options);

    // ── Schema ────────────────────────────────────────────────────────
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            username      VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role          ENUM('Admin','Cashier') DEFAULT 'Cashier',
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            name           VARCHAR(255) NOT NULL,
            price          DECIMAL(10,2) NOT NULL,
            stock_quantity INT NOT NULL DEFAULT 0,
            expiry_days    INT DEFAULT NULL,
            image_path     TEXT DEFAULT NULL,
            created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stock_batches (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            product_id   INT NOT NULL,
            quantity     INT NOT NULL,
            buying_price DECIMAL(10,2) NOT NULL,
            expiry_date  DATE NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sales (
            id           VARCHAR(64) PRIMARY KEY,
            total_amount DECIMAL(10,2) NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            synced_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sale_items (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            sale_id    VARCHAR(64) NOT NULL,
            product_id INT NOT NULL,
            quantity   INT NOT NULL,
            price      DECIMAL(10,2) NOT NULL,
            profit     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            FOREIGN KEY (sale_id)    REFERENCES sales(id)    ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sync_logs (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            action_type VARCHAR(50) NOT NULL,
            payload     JSON,
            synced_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ");

    // ── Safe column migrations ────────────────────────────────────────
    foreach ([
        "ALTER TABLE products   ADD COLUMN image_path TEXT DEFAULT NULL",
        "ALTER TABLE sale_items ADD COLUMN profit DECIMAL(10,2) NOT NULL DEFAULT 0.00",
    ] as $sql) {
        try { $pdo->exec($sql); } catch (\PDOException $e) { /* already exists */ }
    }

    // ── Seed data (only when empty) ───────────────────────────────────
    if ($pdo->query("SELECT COUNT(*) FROM products")->fetchColumn() == 0) {
        $pdo->exec("
            INSERT INTO products (name, price, stock_quantity, expiry_days) VALUES
            ('Ajab Wheat Flour 2Kg',   220.00,  50, 120),
            ('Safi Cooking Oil 1L',    350.00,  30, 365),
            ('Kabras Sugar 1Kg',       200.00, 100, 730),
            ('Ketepa Tea Leaves 500g', 300.00,  40, 365),
            ('Brookside Milk 500ml',   75.00,   60,   7),
            ('Omo Detergent 1Kg',      320.00,  20, 730);
        ");
        $pdo->exec("
            INSERT INTO stock_batches (product_id, quantity, buying_price, expiry_date) VALUES
            (1,  50, 180.00, DATE_ADD(CURDATE(), INTERVAL 120 DAY)),
            (2,  30, 300.00, DATE_ADD(CURDATE(), INTERVAL 365 DAY)),
            (3, 100, 160.00, DATE_ADD(CURDATE(), INTERVAL 730 DAY)),
            (4,  40, 250.00, DATE_ADD(CURDATE(), INTERVAL 365 DAY)),
            (5,  60,  55.00, DATE_ADD(CURDATE(), INTERVAL   7 DAY)),
            (6,  20, 260.00, DATE_ADD(CURDATE(), INTERVAL 730 DAY));
        ");
    }

    if ($pdo->query("SELECT COUNT(*) FROM users")->fetchColumn() == 0) {
        $hash = password_hash('admin123', PASSWORD_DEFAULT);
        $pdo->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'Admin')")
            ->execute(['admin', $hash]);
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "DB init failed: " . $e->getMessage()]);
    exit;
}
