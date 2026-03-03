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

switch ($action) {

    // ── PING ────────────────────────────────────────────────────────
    case 'ping':
        echo json_encode(["status" => "success", "message" => "pong"]);
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
            $pid = $pdo->lastInsertId();

            if ($qty > 0) {
                $pdo->prepare("INSERT INTO stock_batches (product_id, quantity, buying_price, expiry_date) VALUES (?, ?, ?, ?)")
                    ->execute([pid, $qty, $buy, $exp]);
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
            if (isset($d['price']))      { $fields[] = "price = ?";      $params[] = $d['price']; }
            if (isset($d['image_path'])) { $fields[] = "image_path = ?"; $params[] = $d['image_path']; }
            if (empty($fields))          { echo json_encode(["status"=>"success","message"=>"Nothing to update"]); break; }
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
            // Total inventory value = sum(price * stock_quantity)
            $invValue = $pdo->query("SELECT COALESCE(SUM(price * stock_quantity), 0) AS total FROM products")->fetchColumn();

            // Total sales today
            $salesToday = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales WHERE DATE(created_at) = CURDATE()")->fetchColumn();

            // Total sales all time
            $salesAll   = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales")->fetchColumn();

            // Total profit all time
            $profitAll  = $pdo->query("SELECT COALESCE(SUM(profit), 0) AS total FROM sale_items")->fetchColumn();

            // Top 5 products by units sold
            $topProds   = $pdo->query("
                SELECT p.name, COALESCE(SUM(si.quantity), 0) AS units_sold
                FROM products p
                LEFT JOIN sale_items si ON si.product_id = p.id
                GROUP BY p.id, p.name
                ORDER BY units_sold DESC
                LIMIT 5
            ")->fetchAll();

            // Top 5 days by sales revenue
            $topDays    = $pdo->query("
                SELECT DAYNAME(created_at) AS day_name, COALESCE(SUM(total_amount), 0) AS revenue
                FROM sales
                GROUP BY DAYNAME(created_at)
                ORDER BY revenue DESC
                LIMIT 5
            ")->fetchAll();

            // Low stock count
            $lowStock   = $pdo->query("SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND stock_quantity < 10")->fetchColumn();

            // Out of stock count
            $outOfStock = $pdo->query("SELECT COUNT(*) FROM products WHERE stock_quantity <= 0")->fetchColumn();

            // Burn rate: Avg daily stock cost consumed (proxy: avg daily sales / rough margin)
            $burnRate   = $pdo->query("
                SELECT COALESCE(AVG(daily_total), 0) FROM (
                    SELECT DATE(created_at) AS d, SUM(total_amount) AS daily_total
                    FROM sales GROUP BY DATE(created_at)
                ) AS daily_sales
            ")->fetchColumn();

            // Dead stock: batches older than 60 days with remaining quantity
            $deadStock  = $pdo->query("
                SELECT p.name, sb.quantity, sb.buying_price, DATEDIFF(CURDATE(), sb.created_at) AS days_held,
                       (sb.quantity * sb.buying_price) AS capital_locked
                FROM stock_batches sb
                JOIN products p ON p.id = sb.product_id
                WHERE sb.quantity > 0 AND DATEDIFF(CURDATE(), sb.created_at) > 60
                ORDER BY days_held DESC
                LIMIT 10
            ")->fetchAll();

            // Out of stock full product list
            $outOfStockProducts = $pdo->query("SELECT id, name, price FROM products WHERE stock_quantity <= 0")->fetchAll();

            // Recent sales
            $recentSales = $pdo->query("
                SELECT s.id, s.total_amount, s.created_at,
                       COUNT(si.id) AS item_count
                FROM sales s
                JOIN sale_items si ON si.sale_id = s.id
                GROUP BY s.id
                ORDER BY s.created_at DESC
                LIMIT 5
            ")->fetchAll();

            // Turnover ratio: Cost of Goods Sold / Average Inventory Value
            $cogs      = $pdo->query("SELECT COALESCE(SUM(si.quantity * si.price), 0) FROM sale_items si")->fetchColumn();
            $avgInv    = floatval($invValue) ?: 1;
            $turnover  = $avgInv > 0 ? round($cogs / $avgInv, 1) : 0;

            echo json_encode([
                "status" => "success",
                "data"   => [
                    "inventory_value"      => round(floatval($invValue), 2),
                    "sales_today"          => round(floatval($salesToday), 2),
                    "sales_all_time"       => round(floatval($salesAll), 2),
                    "profit_all_time"      => round(floatval($profitAll), 2),
                    "low_stock_count"      => intval($lowStock),
                    "out_of_stock_count"   => intval($outOfStock),
                    "burn_rate_per_day"    => round(floatval($burnRate), 2),
                    "turnover_ratio"       => $turnover,
                    "top_products"         => $topProds,
                    "top_days"            => $topDays,
                    "dead_stock"          => $deadStock,
                    "out_of_stock_products"=> $outOfStockProducts,
                    "recent_sales"        => $recentSales,
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
            $stmt = $pdo->prepare("INSERT INTO sync_logs (action_type, payload) VALUES (?, ?)");
            $stmt->execute([$inputData['type'], json_encode($inputData['payload'])]);

            if ($inputData['type'] === 'NEW_SALE') {
                $payload = $inputData['payload'];
                $saleId  = $inputData['id'];
                $ts      = $inputData['timestamp'] ?? date('Y-m-d H:i:s');

                $pdo->prepare("INSERT INTO sales (id, total_amount, created_at) VALUES (?, ?, ?)")
                    ->execute([$saleId, $payload['total_amount'], $ts]);

                $itemStmt  = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, price, profit) VALUES (?, ?, ?, ?, ?)");
                $stockStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
                $batchQ    = $pdo->prepare("SELECT id, quantity, buying_price FROM stock_batches WHERE product_id = ? AND quantity > 0 ORDER BY expiry_date ASC");
                $batchU    = $pdo->prepare("UPDATE stock_batches SET quantity = quantity - ? WHERE id = ?");

                foreach ($payload['items'] as $item) {
                    $qtyLeft = $item['quantity'];
                    $profit  = 0;
                    $batchQ->execute([$item['product_id']]);
                    foreach ($batchQ->fetchAll() as $batch) {
                        if ($qtyLeft <= 0) break;
                        $take    = min($batch['quantity'], $qtyLeft);
                        $profit += ($item['price'] - $batch['buying_price']) * $take;
                        $qtyLeft -= $take;
                        $batchU->execute([$take, $batch['id']]);
                    }
                    $itemStmt->execute([$saleId, $item['product_id'], $item['quantity'], $item['price'], $profit]);
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
