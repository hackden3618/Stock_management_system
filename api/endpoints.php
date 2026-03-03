<?php
// api/endpoints.php

require_once 'db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';

// ── Helpers ──────────────────────────────────────────────────────────
function getUploadDir() {
    $dir = __DIR__ . '/uploads/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir;
}
function getUploadUrl() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
    return $scheme . '://' . $host . '/uploads/';
}

switch ($action) {

    // ── PING ────────────────────────────────────────────────────────
    case 'ping':
        echo json_encode(["status" => "success", "message" => "pong", "ts" => time()]);
        break;

    // ── UPLOAD IMAGE ─────────────────────────────────────────────────
    case 'uploadImage':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || empty($d['base64'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "No image data"]);
            exit;
        }
        try {
            $base64 = $d['base64'];
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $m)) {
                $ext    = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
                $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
            } else {
                $ext = 'jpg';
            }
            $allowed = ['jpg','jpeg','png','gif','webp'];
            if (!in_array($ext, $allowed)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Invalid image type"]);
                exit;
            }
            $imgData = base64_decode($base64);
            if ($imgData === false || strlen($imgData) > 5 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Image too large or corrupt (max 5MB)"]);
                exit;
            }
            $filename = uniqid('prod_', true) . '.' . $ext;
            file_put_contents(getUploadDir() . $filename, $imgData);
            echo json_encode(["status" => "success", "url" => getUploadUrl() . $filename]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── GET ALL PRODUCTS ─────────────────────────────────────────────
    case 'getProducts':
        try {
            $stmt = $pdo->query("SELECT * FROM products ORDER BY name ASC");
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── ADD NEW PRODUCT ──────────────────────────────────────────────
    case 'addProduct':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['name'], $d['price'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Name and price are required"]);
            exit;
        }
        try {
            $pdo->beginTransaction();
            $qty   = intval($d['quantity'] ?? 0);
            $price = floatval($d['price']);
            $buy   = floatval($d['buying_price'] ?? $price * 0.7);
            $exp   = $d['expiry_date'] ?? date('Y-m-d', strtotime('+1 year'));
            $img   = $d['image_path'] ?? null;

            $stmt = $pdo->prepare("INSERT INTO products (name, price, stock_quantity, expiry_days, image_path) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$d['name'], $price, $qty, intval($d['expiry_days'] ?? 365), $img]);
            $pid = $pdo->lastInsertId(); // ✅ FIXED: was bare constant 'pid'

            if ($qty > 0) {
                $pdo->prepare("INSERT INTO stock_batches (product_id, quantity, buying_price, expiry_date) VALUES (?, ?, ?, ?)")
                    ->execute([$pid, $qty, $buy, $exp]); // ✅ $pid — FIXED
            }
            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "Product added", "id" => $pid]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── UPDATE PRODUCT ───────────────────────────────────────────────
    case 'updateProduct':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['id'])) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"id required"]); exit; }
        try {
            $fields = []; $params = [];
            if (isset($d['name']))       { $fields[] = "name = ?";       $params[] = $d['name']; }
            if (isset($d['price']))      { $fields[] = "price = ?";      $params[] = floatval($d['price']); }
            if (isset($d['image_path'])) { $fields[] = "image_path = ?"; $params[] = $d['image_path']; }
            if (empty($fields)) { echo json_encode(["status"=>"success","message"=>"Nothing to update"]); break; }
            $params[] = $d['id'];
            $pdo->prepare("UPDATE products SET ".implode(', ',$fields)." WHERE id = ?")->execute($params);
            echo json_encode(["status" => "success"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── DELETE PRODUCT ───────────────────────────────────────────────
    case 'deleteProduct':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['id'])) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"id required"]); exit; }
        try {
            $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$d['id']]);
            echo json_encode(["status" => "success"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── RECEIVE STOCK INTO EXISTING PRODUCT ──────────────────────────
    case 'addStock':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['product_id'], $d['quantity'], $d['buying_price'], $d['expiry_date'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid payload for receiving stock"]);
            exit;
        }
        try {
            $pdo->beginTransaction();
            $pdo->prepare("INSERT INTO stock_batches (product_id, quantity, buying_price, expiry_date) VALUES (?, ?, ?, ?)")
                ->execute([$d['product_id'], $d['quantity'], $d['buying_price'], $d['expiry_date']]);
            $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
                ->execute([$d['quantity'], $d['product_id']]);
            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "Stock batch added successfully"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── DASHBOARD STATS ──────────────────────────────────────────────
    case 'getDashboardStats':
        try {
            $invValue   = $pdo->query("SELECT COALESCE(SUM(price * stock_quantity), 0) FROM products")->fetchColumn();
            $salesToday = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) = CURDATE()")->fetchColumn();
            $salesAll   = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM sales")->fetchColumn();
            $profitAll  = $pdo->query("SELECT COALESCE(SUM(profit), 0) FROM sale_items")->fetchColumn();

            $topProds = $pdo->query("
                SELECT p.name, COALESCE(SUM(si.quantity), 0) AS units_sold,
                       COALESCE(SUM(si.profit), 0) AS total_profit
                FROM products p
                LEFT JOIN sale_items si ON si.product_id = p.id
                GROUP BY p.id, p.name
                ORDER BY units_sold DESC LIMIT 5
            ")->fetchAll();

            $topDays = $pdo->query("
                SELECT DAYNAME(created_at) AS day_name,
                       COALESCE(SUM(total_amount), 0) AS revenue
                FROM sales GROUP BY DAYNAME(created_at)
                ORDER BY revenue DESC LIMIT 7
            ")->fetchAll();

            $lowStock   = $pdo->query("SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND stock_quantity < 10")->fetchColumn();
            $outOfStock = $pdo->query("SELECT COUNT(*) FROM products WHERE stock_quantity <= 0")->fetchColumn();

            $burnRate = $pdo->query("
                SELECT COALESCE(AVG(daily_total), 0) FROM (
                    SELECT DATE(created_at) AS d, SUM(total_amount) AS daily_total
                    FROM sales GROUP BY DATE(created_at)
                ) AS ds
            ")->fetchColumn();

            $deadStock = $pdo->query("
                SELECT p.name, sb.quantity, sb.buying_price,
                       DATEDIFF(CURDATE(), sb.created_at) AS days_held,
                       (sb.quantity * sb.buying_price) AS capital_locked
                FROM stock_batches sb
                JOIN products p ON p.id = sb.product_id
                WHERE sb.quantity > 0 AND DATEDIFF(CURDATE(), sb.created_at) > 60
                ORDER BY days_held DESC LIMIT 10
            ")->fetchAll();

            $outOfStockProducts  = $pdo->query("SELECT id, name, price FROM products WHERE stock_quantity <= 0")->fetchAll();
            $lowStockProducts    = $pdo->query("SELECT id, name, stock_quantity, price FROM products WHERE stock_quantity > 0 AND stock_quantity < 10 ORDER BY stock_quantity ASC")->fetchAll();

            $recentSales = $pdo->query("
                SELECT s.id, s.total_amount, s.created_at, COUNT(si.id) AS item_count
                FROM sales s JOIN sale_items si ON si.sale_id = s.id
                GROUP BY s.id ORDER BY s.created_at DESC LIMIT 10
            ")->fetchAll();

            $expiryAlerts = $pdo->query("
                SELECT p.name, sb.quantity, sb.expiry_date,
                       DATEDIFF(sb.expiry_date, CURDATE()) AS days_left
                FROM stock_batches sb JOIN products p ON p.id = sb.product_id
                WHERE sb.quantity > 0
                  AND sb.expiry_date IS NOT NULL
                  AND DATEDIFF(sb.expiry_date, CURDATE()) BETWEEN -7 AND 14
                ORDER BY days_left ASC LIMIT 10
            ")->fetchAll();

            $cogs     = $pdo->query("SELECT COALESCE(SUM(si.quantity * si.price), 0) FROM sale_items si")->fetchColumn();
            $avgInv   = floatval($invValue) ?: 1;
            $turnover = $avgInv > 0 ? round($cogs / $avgInv, 2) : 0;
            $txToday  = $pdo->query("SELECT COUNT(*) FROM sales WHERE DATE(created_at) = CURDATE()")->fetchColumn();

            echo json_encode([
                "status" => "success",
                "data"   => [
                    "inventory_value"       => round(floatval($invValue), 2),
                    "sales_today"           => round(floatval($salesToday), 2),
                    "sales_all_time"        => round(floatval($salesAll), 2),
                    "profit_all_time"       => round(floatval($profitAll), 2),
                    "low_stock_count"       => intval($lowStock),
                    "out_of_stock_count"    => intval($outOfStock),
                    "burn_rate_per_day"     => round(floatval($burnRate), 2),
                    "turnover_ratio"        => $turnover,
                    "tx_today"             => intval($txToday),
                    "top_products"          => $topProds,
                    "top_days"             => $topDays,
                    "dead_stock"           => $deadStock,
                    "out_of_stock_products" => $outOfStockProducts,
                    "low_stock_products"    => $lowStockProducts,
                    "expiry_alerts"        => $expiryAlerts,
                    "recent_sales"         => $recentSales,
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── SALES CHART DATA ─────────────────────────────────────────────
    case 'getSalesChart':
        try {
            $days = intval($_GET['days'] ?? 14);
            $days = max(7, min(30, $days));

            $rows = $pdo->prepare("
                SELECT DATE(s.created_at) AS sale_date,
                       COALESCE(SUM(s.total_amount), 0) AS revenue,
                       COALESCE(SUM(si.profit), 0) AS profit,
                       COUNT(DISTINCT s.id) AS transactions
                FROM sales s
                LEFT JOIN sale_items si ON si.sale_id = s.id
                WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL :d DAY)
                GROUP BY DATE(s.created_at)
                ORDER BY sale_date ASC
            ");
            $rows->execute([':d' => $days]);
            $rawData = $rows->fetchAll();

            // Fill date gaps with zeros
            $map = [];
            for ($i = $days - 1; $i >= 0; $i--) {
                $date      = date('Y-m-d', strtotime("-$i days"));
                $map[$date] = ['date' => $date, 'label' => date('M j', strtotime($date)), 'revenue' => 0, 'profit' => 0, 'transactions' => 0];
            }
            foreach ($rawData as $r) {
                if (isset($map[$r['sale_date']])) {
                    $map[$r['sale_date']]['revenue']      = round(floatval($r['revenue']), 2);
                    $map[$r['sale_date']]['profit']       = round(floatval($r['profit']), 2);
                    $map[$r['sale_date']]['transactions'] = intval($r['transactions']);
                }
            }

            // Hourly for today
            $hourly = $pdo->query("
                SELECT HOUR(created_at) AS hr,
                       COALESCE(SUM(total_amount), 0) AS revenue,
                       COUNT(*) AS transactions
                FROM sales WHERE DATE(created_at) = CURDATE()
                GROUP BY HOUR(created_at) ORDER BY hr ASC
            ")->fetchAll();

            echo json_encode([
                "status" => "success",
                "data"   => [
                    "daily"  => array_values($map),
                    "hourly" => $hourly
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── SYNC SALE ─────────────────────────────────────────────────────
    case 'sync':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $inputData = json_decode(file_get_contents('php://input'), true);
        if (!$inputData || !isset($inputData['type'], $inputData['payload'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid sync payload format"]);
            exit;
        }
        try {
            $pdo->beginTransaction();

            $pdo->prepare("INSERT INTO sync_logs (action_type, payload) VALUES (?, ?)")
                ->execute([$inputData['type'], json_encode($inputData['payload'])]);

            if ($inputData['type'] === 'NEW_SALE') {
                $payload = $inputData['payload'];
                $saleId  = $inputData['id'];
                $rawTs = $inputData['timestamp'] ?? null;
                $ts = $rawTs ? date('Y-m-d H:i:s', strtotime($rawTs)) : date('Y-m-d H:i:s');

                // Idempotency: skip duplicate syncs
                $dup = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE id = ?");
                $dup->execute([$saleId]);
                if ($dup->fetchColumn() > 0) {
                    $pdo->rollBack();
                    echo json_encode(["status" => "success", "message" => "Already synced"]);
                    exit;
                }

                // Pre-flight stock validation
                foreach ($payload['items'] as $item) {
                    $avail = $pdo->prepare("SELECT stock_quantity FROM products WHERE id = ?");
                    $avail->execute([$item['product_id']]);
                    $row = $avail->fetch();
                    if (!$row || intval($row['stock_quantity']) < intval($item['quantity'])) {
                        $pdo->rollBack();
                        http_response_code(409);
                        echo json_encode(["status" => "error", "message" => "Insufficient stock for product_id " . $item['product_id']]);
                        exit;
                    }
                }

                $pdo->prepare("INSERT INTO sales (id, total_amount, created_at) VALUES (?, ?, ?)")
                    ->execute([$saleId, $payload['total_amount'], $ts]);

                $itemStmt  = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, price, profit) VALUES (?, ?, ?, ?, ?)");
                $stockStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
                $batchQ    = $pdo->prepare("SELECT id, quantity, buying_price FROM stock_batches WHERE product_id = ? AND quantity > 0 ORDER BY expiry_date ASC");
                $batchU    = $pdo->prepare("UPDATE stock_batches SET quantity = quantity - ? WHERE id = ?");

                foreach ($payload['items'] as $item) {
                    $qtyLeft = intval($item['quantity']);
                    $profit  = 0;
                    $batchQ->execute([$item['product_id']]);
                    foreach ($batchQ->fetchAll() as $batch) {
                        if ($qtyLeft <= 0) break;
                        $take    = min(intval($batch['quantity']), $qtyLeft);
                        $profit += (floatval($item['price']) - floatval($batch['buying_price'])) * $take;
                        $qtyLeft -= $take;
                        $batchU->execute([$take, $batch['id']]);
                    }
                    $itemStmt->execute([$saleId, $item['product_id'], $item['quantity'], $item['price'], round($profit, 2)]);
                    $stockStmt->execute([$item['quantity'], $item['product_id']]);
                }
            }

            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "Synced successfully"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Sync failed: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Endpoint not found: $action"]);
        break;
}
