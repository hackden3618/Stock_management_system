<?php
// api/db.php
// Setup MySQL Database Connection using PDO

$host = '127.0.0.1';
$db   = 'stock_mgmt_system';
$user = 'root'; // Adjust as per your MySQL setup
$pass = '';     // Adjust as per your MySQL setup
$charset = 'utf8mb4';

// Standard DSN for MySQL
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Check if database exists by connecting without dbname first
    $tempDsn = "mysql:host=$host;charset=$charset";
    $tempPdo = new PDO($tempDsn, $user, $pass, $options);
    
    // Create database if it doesn't exist
    $tempPdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET $charset COLLATE utf8mb4_unicode_ci");
    
    // Now connect to the actual database
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Initialize Tables
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            stock_quantity INT NOT NULL DEFAULT 0,
            expiry_days INT DEFAULT NULL,
            image_path TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS sales (
            id VARCHAR(64) PRIMARY KEY, /* UUID from local client */
            total_amount DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sale_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sale_id VARCHAR(64) NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS sync_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            action_type VARCHAR(50) NOT NULL,
            payload JSON,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stock_batches (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            buying_price DECIMAL(10, 2) NOT NULL,
            expiry_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('Admin', 'Cashier') DEFAULT 'Cashier',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ");

    try {
        $pdo->exec("ALTER TABLE products ADD COLUMN image_path TEXT DEFAULT NULL");
    } catch (\PDOException $e) { /* Ignore if exists */ }

    try {
        $pdo->exec("ALTER TABLE sale_items ADD COLUMN profit DECIMAL(10, 2) NOT NULL DEFAULT 0.00");
    } catch (\PDOException $e) { /* Ignore if exists */ }

    // Insert dummy data if products table is empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM products");
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("
            INSERT INTO products (name, price, stock_quantity, expiry_days) VALUES
            ('Ajab Wheat Flour 2Kg', 220.00, 50, 120),
            ('Safi Cooking Oil 1L', 350.00, 30, 365),
            ('Kabras Sugar 1Kg', 200.00, 100, 730),
            ('Ketepa Tea Leaves 500g', 300.00, 40, 365)
        ");

        $pdo->exec("
            INSERT INTO stock_batches (product_id, quantity, buying_price, expiry_date) VALUES
            (1, 50, 180.00, DATE_ADD(CURDATE(), INTERVAL 120 DAY)),
            (2, 30, 300.00, DATE_ADD(CURDATE(), INTERVAL 365 DAY)),
            (3, 100, 160.00, DATE_ADD(CURDATE(), INTERVAL 730 DAY)),
            (4, 40, 250.00, DATE_ADD(CURDATE(), INTERVAL 365 DAY))
        ");
    }

    // Insert dummy admin if users table is empty
    $stmtUsers = $pdo->query("SELECT COUNT(*) FROM users");
    if ($stmtUsers->fetchColumn() == 0) {
        $admin_pass = password_hash('admin123', PASSWORD_DEFAULT);
        $pdo->exec("INSERT INTO users (username, password_hash, role) VALUES ('admin', '$admin_pass', 'Admin')");
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed: " . $e->getMessage()]);
    exit;
}
