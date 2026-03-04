<?php
require_once 'db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$action = $_GET['action'] ?? '';

// ── Auth: resolve shop_id from Bearer token ───────────────────────
function getShopId($pdo) {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token  = trim(str_replace('Bearer', '', $header));
    if (!$token) return null;
    $stmt = $pdo->prepare("SELECT shop_id FROM users WHERE token = ?");
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    return $row ? intval($row['shop_id']) : null;
}

// Every action that reads/writes shop data requires a valid token
$publicActions = ['ping', 'uploadImage'];
if (!in_array($action, $publicActions)) {
    $shopId = getShopId($pdo);
    if (!$shopId) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorised. Please log in."]);
        exit;
    }
}

function getUploadDir() {
    $dir = __DIR__ . '/uploads/products/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir;
}
function getUploadUrl() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
    return $scheme . '://' . $host . '/uploads/products/';
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
            echo json_encode(["status" => "error", "message" => "No image data"]); exit;
        }
        try {
            $base64 = $d['base64'];
            $ext = 'jpg';
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $m)) {
                $ext    = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
                $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
            }
            if (!in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                echo json_encode(["status" => "error", "message" => "Invalid image type"]); exit;
            }
            $imgData = base64_decode($base64);
            if (!$imgData || strlen($imgData) > 5 * 1024 * 1024) {
                echo json_encode(["status" => "error", "message" => "Image too large (max 5 MB)"]); exit;
            }
            $filename = 'prod_' . uniqid() . '.' . $ext;
            file_put_contents(getUploadDir() . $filename, $imgData);
            echo json_encode(["status" => "success", "url" => getUploadUrl() . $filename]);
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── GET PRODUCTS (scoped to shop) ─────────────────────────────────
    case 'getProducts':
        try {
            // Also return sellable_quantity (from non-expired batches) and expired_quantity
            $stmt = $pdo->prepare("
                SELECT p.*,
                    COALESCE((
                        SELECT SUM(sb.quantity) FROM stock_batches sb
                        WHERE sb.product_id = p.id AND sb.quantity > 0 AND sb.expiry_date >= CURDATE()
                    ), 0) AS sellable_quantity,
                    COALESCE((
                        SELECT SUM(sb.quantity) FROM stock_batches sb
                        WHERE sb.product_id = p.id AND sb.quantity > 0 AND sb.expiry_date < CURDATE()
                    ), 0) AS expired_quantity
                FROM products p WHERE p.shop_id = ? ORDER BY p.name ASC
            ");
            $stmt->execute([$shopId]);
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── ADD PRODUCT ───────────────────────────────────────────────────
    case 'addProduct':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['name'], $d['price'])) {
            echo json_encode(["status" => "error", "message" => "Name and price required"]); exit;
        }
        try {
            $pdo->beginTransaction();
            $qty = intval($d['quantity'] ?? 0);
            $buy = floatval($d['buying_price'] ?? floatval($d['price']) * 0.7);
            $exp = $d['expiry_date'] ?? date('Y-m-d', strtotime('+1 year'));
            $img = $d['image_path'] ?? null;

            $pdo->prepare("INSERT INTO products (shop_id, name, price, stock_quantity, expiry_days, image_path) VALUES (?,?,?,?,?,?)")
                ->execute([$shopId, $d['name'], floatval($d['price']), $qty, intval($d['expiry_days'] ?? 365), $img]);
            $pid = $pdo->lastInsertId();

            if ($qty > 0) {
                $pdo->prepare("INSERT INTO stock_batches (product_id, quantity, buying_price, expiry_date) VALUES (?,?,?,?)")
                    ->execute([$pid, $qty, $buy, $exp]);
            }
            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "Product added", "id" => $pid]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── UPDATE PRODUCT ────────────────────────────────────────────────
    case 'updateProduct':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['id'])) { echo json_encode(["status"=>"error","message"=>"id required"]); exit; }
        try {
            $fields = []; $params = [];
            if (isset($d['name']))       { $fields[] = "name = ?";       $params[] = $d['name']; }
            if (isset($d['price']))      { $fields[] = "price = ?";      $params[] = floatval($d['price']); }
            if (isset($d['image_path'])) { $fields[] = "image_path = ?"; $params[] = $d['image_path']; }
            if (empty($fields)) { echo json_encode(["status"=>"success","message"=>"Nothing to update"]); break; }
            $params[] = $d['id']; $params[] = $shopId;
            $pdo->prepare("UPDATE products SET ".implode(',',$fields)." WHERE id = ? AND shop_id = ?")->execute($params);
            echo json_encode(["status" => "success"]);
        } catch (Exception $e) {
            http_response_code(500); echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── DELETE PRODUCT ────────────────────────────────────────────────
    case 'deleteProduct':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['id'])) { echo json_encode(["status"=>"error","message"=>"id required"]); exit; }
        try {
            $pdo->prepare("DELETE FROM products WHERE id = ? AND shop_id = ?")->execute([$d['id'], $shopId]);
            echo json_encode(["status" => "success"]);
        } catch (Exception $e) {
            http_response_code(500); echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── RECEIVE STOCK ─────────────────────────────────────────────────
    case 'addStock':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $d = json_decode(file_get_contents('php://input'), true);
        if (!$d || !isset($d['product_id'], $d['quantity'], $d['buying_price'], $d['expiry_date'])) {
            echo json_encode(["status" => "error", "message" => "Invalid payload"]); exit;
        }
        try {
            // Verify product belongs to this shop
            $chk = $pdo->prepare("SELECT id FROM products WHERE id = ? AND shop_id = ?");
            $chk->execute([$d['product_id'], $shopId]);
            if (!$chk->fetch()) { echo json_encode(["status"=>"error","message"=>"Product not found"]); exit; }

            $pdo->beginTransaction();
            $pdo->prepare("INSERT INTO stock_batches (product_id, quantity, buying_price, expiry_date) VALUES (?,?,?,?)")
                ->execute([$d['product_id'], $d['quantity'], $d['buying_price'], $d['expiry_date']]);
            $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
                ->execute([$d['quantity'], $d['product_id']]);
            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "Stock added"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500); echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── DASHBOARD STATS (shop-scoped) ─────────────────────────────────
    case 'getDashboardStats':
        try {
            $sid = $shopId;

            $invValue   = $pdo->prepare("SELECT COALESCE(SUM(price * stock_quantity),0) FROM products WHERE shop_id=?");
            $invValue->execute([$sid]); $invValue = $invValue->fetchColumn();

            $salesToday = $pdo->prepare("SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE shop_id=? AND DATE(created_at)=CURDATE()");
            $salesToday->execute([$sid]); $salesToday = $salesToday->fetchColumn();

            $salesAll   = $pdo->prepare("SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE shop_id=?");
            $salesAll->execute([$sid]); $salesAll = $salesAll->fetchColumn();

            $profitAll  = $pdo->prepare("SELECT COALESCE(SUM(si.profit),0) FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.shop_id=?");
            $profitAll->execute([$sid]); $profitAll = $profitAll->fetchColumn();

            $txToday = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE shop_id=? AND DATE(created_at)=CURDATE()");
            $txToday->execute([$sid]); $txToday = $txToday->fetchColumn();

            $burnRate = $pdo->prepare("SELECT COALESCE(AVG(daily_total),0) FROM (SELECT DATE(created_at) AS d, SUM(total_amount) AS daily_total FROM sales WHERE shop_id=? GROUP BY DATE(created_at)) AS ds");
            $burnRate->execute([$sid]); $burnRate = $burnRate->fetchColumn();

            $topProds = $pdo->prepare("
                SELECT p.name, COALESCE(SUM(si.quantity),0) AS units_sold, COALESCE(SUM(si.profit),0) AS total_profit
                FROM products p LEFT JOIN sale_items si ON si.product_id=p.id LEFT JOIN sales s ON s.id=si.sale_id AND s.shop_id=?
                WHERE p.shop_id=? GROUP BY p.id,p.name ORDER BY units_sold DESC LIMIT 5
            ");
            $topProds->execute([$sid,$sid]); $topProds = $topProds->fetchAll();

            $lowStock   = $pdo->prepare("SELECT COUNT(*) FROM products WHERE shop_id=? AND stock_quantity>0 AND stock_quantity<10");
            $lowStock->execute([$sid]); $lowStock=$lowStock->fetchColumn();

            $outOfStock = $pdo->prepare("SELECT COUNT(*) FROM products WHERE shop_id=? AND stock_quantity<=0");
            $outOfStock->execute([$sid]); $outOfStock=$outOfStock->fetchColumn();

            $deadStock = $pdo->prepare("
                SELECT p.name, sb.quantity, sb.buying_price,
                       DATEDIFF(CURDATE(),sb.created_at) AS days_held,
                       (sb.quantity*sb.buying_price) AS capital_locked
                FROM stock_batches sb JOIN products p ON p.id=sb.product_id
                WHERE p.shop_id=? AND sb.quantity>0 AND DATEDIFF(CURDATE(),sb.created_at)>60
                ORDER BY days_held DESC LIMIT 10
            ");
            $deadStock->execute([$sid]); $deadStock=$deadStock->fetchAll();

            $outProds = $pdo->prepare("SELECT id,name,price,image_path FROM products WHERE shop_id=? AND stock_quantity<=0");
            $outProds->execute([$sid]); $outProds=$outProds->fetchAll();

            $lowProds = $pdo->prepare("SELECT id,name,stock_quantity,price FROM products WHERE shop_id=? AND stock_quantity>0 AND stock_quantity<10 ORDER BY stock_quantity ASC");
            $lowProds->execute([$sid]); $lowProds=$lowProds->fetchAll();

            $recentSales = $pdo->prepare("
                SELECT s.id,s.total_amount,s.created_at,COUNT(si.id) AS item_count
                FROM sales s JOIN sale_items si ON si.sale_id=s.id
                WHERE s.shop_id=? GROUP BY s.id ORDER BY s.created_at DESC LIMIT 10
            ");
            $recentSales->execute([$sid]); $recentSales=$recentSales->fetchAll();

            $expiryAlerts = $pdo->prepare("
                SELECT p.name,sb.quantity,sb.expiry_date,DATEDIFF(sb.expiry_date,CURDATE()) AS days_left
                FROM stock_batches sb JOIN products p ON p.id=sb.product_id
                WHERE p.shop_id=? AND sb.quantity>0 AND sb.expiry_date IS NOT NULL
                  AND DATEDIFF(sb.expiry_date,CURDATE()) BETWEEN -7 AND 14
                ORDER BY days_left ASC LIMIT 10
            ");
            $expiryAlerts->execute([$sid]); $expiryAlerts=$expiryAlerts->fetchAll();

            $cogs = $pdo->prepare("SELECT COALESCE(SUM(si.quantity*si.price),0) FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.shop_id=?");
            $cogs->execute([$sid]); $cogs=floatval($cogs->fetchColumn());
            $avgInv   = floatval($invValue) ?: 1;
            $turnover = $avgInv > 0 ? round($cogs / $avgInv, 2) : 0;


            // Expired stock losses
            $totalLosses = $pdo->prepare("
                SELECT COALESCE(SUM(sb.quantity * sb.buying_price), 0)
                FROM stock_batches sb JOIN products p ON p.id = sb.product_id
                WHERE p.shop_id = ? AND sb.quantity > 0 AND sb.expiry_date < CURDATE()
            ");
            $totalLosses->execute([$sid]); $totalLosses = $totalLosses->fetchColumn();

            $expiredCount = $pdo->prepare("
                SELECT COUNT(DISTINCT p.id)
                FROM products p JOIN stock_batches sb ON sb.product_id = p.id
                WHERE p.shop_id = ? AND sb.quantity > 0 AND sb.expiry_date < CURDATE()
            ");
            $expiredCount->execute([$sid]); $expiredCount = $expiredCount->fetchColumn();

                        echo json_encode(["status"=>"success","data"=>[
                "inventory_value"       => round(floatval($invValue),2),
                "sales_today"           => round(floatval($salesToday),2),
                "sales_all_time"        => round(floatval($salesAll),2),
                "profit_all_time"       => round(floatval($profitAll),2),
                "low_stock_count"       => intval($lowStock),
                "out_of_stock_count"    => intval($outOfStock),
                "burn_rate_per_day"     => round(floatval($burnRate),2),
                "turnover_ratio"        => $turnover,
                "tx_today"              => intval($txToday),
                "top_products"          => $topProds,
                "dead_stock"            => $deadStock,
                "out_of_stock_products" => $outProds,
                "low_stock_products"    => $lowProds,
                "expiry_alerts"         => $expiryAlerts,
                "recent_sales"          => $recentSales,
                "total_losses"          => round(floatval($totalLosses),2),
                "expired_count"         => intval($expiredCount),
            ]]);
        } catch (Exception $e) {
            http_response_code(500); echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        break;

    // ── SALES CHART ───────────────────────────────────────────────────
    case 'getSalesChart':
        try {
            $days = max(7, min(30, intval($_GET['days'] ?? 14)));

            $rows = $pdo->prepare("
                SELECT DATE(s.created_at) AS sale_date,
                       COALESCE(SUM(s.total_amount),0) AS revenue,
                       COALESCE(SUM(si.profit),0) AS profit,
                       COUNT(DISTINCT s.id) AS transactions
                FROM sales s LEFT JOIN sale_items si ON si.sale_id=s.id
                WHERE s.shop_id=? AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(s.created_at) ORDER BY sale_date ASC
            ");
            $rows->execute([$shopId, $days]);
            $rawData = $rows->fetchAll();

            $map = [];
            for ($i=$days-1; $i>=0; $i--) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $map[$date] = ['date'=>$date,'label'=>date('M j',strtotime($date)),'revenue'=>0,'profit'=>0,'transactions'=>0];
            }
            foreach ($rawData as $r) {
                if (isset($map[$r['sale_date']])) {
                    $map[$r['sale_date']]['revenue']      = round(floatval($r['revenue']),2);
                    $map[$r['sale_date']]['profit']       = round(floatval($r['profit']),2);
                    $map[$r['sale_date']]['transactions'] = intval($r['transactions']);
                }
            }

            $hourly = $pdo->prepare("
                SELECT HOUR(created_at) AS hr,
                       COALESCE(SUM(total_amount),0) AS revenue,
                       COUNT(*) AS transactions
                FROM sales WHERE shop_id=? AND DATE(created_at)=CURDATE()
                GROUP BY HOUR(created_at) ORDER BY hr ASC
            ");
            $hourly->execute([$shopId]); $hourly=$hourly->fetchAll();

            echo json_encode(["status"=>"success","data"=>["daily"=>array_values($map),"hourly"=>$hourly]]);
        } catch (Exception $e) {
            http_response_code(500); echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        break;

    // ── SYNC SALE ─────────────────────────────────────────────────────
    case 'sync':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
        $inputData = json_decode(file_get_contents('php://input'), true);
        if (!$inputData || !isset($inputData['type'], $inputData['payload'])) {
            echo json_encode(["status"=>"error","message"=>"Invalid sync payload"]); exit;
        }
        try {
            $pdo->beginTransaction();
            $pdo->prepare("INSERT INTO sync_logs (action_type, payload) VALUES (?,?)")
                ->execute([$inputData['type'], json_encode($inputData['payload'])]);

            if ($inputData['type'] === 'NEW_SALE') {
                $payload = $inputData['payload'];
                $saleId  = $inputData['id'];
                $rawTs   = $inputData['timestamp'] ?? null;
                $ts      = $rawTs ? date('Y-m-d H:i:s', strtotime($rawTs)) : date('Y-m-d H:i:s');

                // Idempotency
                $dup = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE id=?");
                $dup->execute([$saleId]);
                if ($dup->fetchColumn() > 0) { $pdo->rollBack(); echo json_encode(["status"=>"success","message"=>"Already synced"]); exit; }

                // Stock validation
                foreach ($payload['items'] as $item) {
                    $avail = $pdo->prepare("
                        SELECT COALESCE(SUM(sb.quantity),0) AS sellable
                        FROM stock_batches sb JOIN products p ON p.id=sb.product_id
                        WHERE p.id=? AND p.shop_id=? AND sb.quantity>0 AND sb.expiry_date>=CURDATE()
                    ");
                    $avail->execute([$item['product_id'], $shopId]);
                    $row = $avail->fetch();
                    if (!$row || intval($row['sellable']) < intval($item['quantity'])) {
                        $pdo->rollBack(); http_response_code(409);
                        echo json_encode(["status"=>"error","message"=>"Insufficient stock for product ".$item['product_id']]); exit;
                    }
                }

                $pdo->prepare("INSERT INTO sales (id, shop_id, total_amount, created_at) VALUES (?,?,?,?)")
                    ->execute([$saleId, $shopId, $payload['total_amount'], $ts]);

                $itemStmt  = $pdo->prepare("INSERT INTO sale_items (sale_id,product_id,quantity,price,profit) VALUES (?,?,?,?,?)");
                $stockStmt = $pdo->prepare("UPDATE products SET stock_quantity=stock_quantity-? WHERE id=?");
                $batchQ    = $pdo->prepare("SELECT id,quantity,buying_price FROM stock_batches WHERE product_id=? AND quantity>0 AND expiry_date >= CURDATE() ORDER BY expiry_date ASC");
                $batchU    = $pdo->prepare("UPDATE stock_batches SET quantity=quantity-? WHERE id=?");

                foreach ($payload['items'] as $item) {
                    $qtyLeft = intval($item['quantity']); $profit = 0;
                    $batchQ->execute([$item['product_id']]);
                    foreach ($batchQ->fetchAll() as $batch) {
                        if ($qtyLeft <= 0) break;
                        $take    = min(intval($batch['quantity']), $qtyLeft);
                        $profit += (floatval($item['price']) - floatval($batch['buying_price'])) * $take;
                        $qtyLeft -= $take;
                        $batchU->execute([$take, $batch['id']]);
                    }
                    $itemStmt->execute([$saleId, $item['product_id'], $item['quantity'], $item['price'], round($profit,2)]);
                    $stockStmt->execute([$item['quantity'], $item['product_id']]);
                }
            }
            $pdo->commit();
            echo json_encode(["status"=>"success","message"=>"Synced"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500); echo json_encode(["status"=>"error","message"=>"Sync failed: ".$e->getMessage()]);
        }
        break;


    // ── EXPIRED STOCK ─────────────────────────────────────────────────
    // Returns expired batches grouped by product, with velocity data
    // to power the strategist advice engine in the frontend.
    case 'getExpiredStock':
        try {
            $rows = $pdo->prepare("
                SELECT
                    p.id            AS product_id,
                    p.name,
                    p.price         AS selling_price,
                    p.image_path,
                    sb.id           AS batch_id,
                    sb.quantity,
                    sb.buying_price,
                    sb.expiry_date,
                    sb.created_at   AS batch_received,
                    DATEDIFF(CURDATE(), sb.expiry_date)      AS days_expired,
                    DATEDIFF(sb.expiry_date, sb.created_at)  AS shelf_life_days,
                    (sb.quantity * sb.buying_price)          AS capital_locked,

                    -- How many units of this product sold in the batch's shelf window
                    COALESCE((
                        SELECT SUM(si.quantity)
                        FROM sale_items si
                        JOIN sales s ON s.id = si.sale_id
                        WHERE si.product_id = p.id
                          AND s.shop_id = :sid1
                          AND s.created_at BETWEEN sb.created_at AND sb.expiry_date
                    ), 0) AS units_sold_in_window,

                    -- Average daily sales velocity for this product (all time)
                    COALESCE((
                        SELECT SUM(si.quantity) / GREATEST(DATEDIFF(CURDATE(), MIN(s.created_at)), 1)
                        FROM sale_items si
                        JOIN sales s ON s.id = si.sale_id
                        WHERE si.product_id = p.id AND s.shop_id = :sid2
                    ), 0) AS avg_daily_velocity

                FROM stock_batches sb
                JOIN products p ON p.id = sb.product_id
                WHERE p.shop_id = :sid3
                  AND sb.quantity > 0
                  AND sb.expiry_date < CURDATE()
                ORDER BY sb.expiry_date ASC
            ");
            $rows->execute([':sid1' => $shopId, ':sid2' => $shopId, ':sid3' => $shopId]);
            $expired = $rows->fetchAll();

            // Totals
            $totalLoss   = array_sum(array_column($expired, 'capital_locked'));
            $totalUnits  = array_sum(array_column($expired, 'quantity'));

            echo json_encode([
                "status" => "success",
                "data"   => [
                    "batches"     => $expired,
                    "total_loss"  => round(floatval($totalLoss), 2),
                    "total_units" => intval($totalUnits),
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ── EXPIRING SOON ─────────────────────────────────────────────────
    // Returns batches expiring in next N days with velocity & discount data
    case 'getExpiringSoon':
        try {
            $days = max(1, min(30, intval($_GET['days'] ?? 14)));
            $rows = $pdo->prepare("
                SELECT
                    p.id            AS product_id,
                    p.name,
                    p.price         AS selling_price,
                    p.image_path,
                    sb.id           AS batch_id,
                    sb.quantity,
                    sb.buying_price,
                    sb.expiry_date,
                    sb.created_at   AS batch_received,
                    DATEDIFF(sb.expiry_date, CURDATE())      AS days_left,
                    DATEDIFF(sb.expiry_date, sb.created_at)  AS shelf_life_days,
                    (sb.quantity * sb.buying_price)          AS capital_at_risk,

                    -- Velocity: avg units sold per day for this product
                    COALESCE((
                        SELECT SUM(si.quantity) / GREATEST(DATEDIFF(CURDATE(), MIN(s.created_at)), 1)
                        FROM sale_items si
                        JOIN sales s ON s.id = si.sale_id
                        WHERE si.product_id = p.id AND s.shop_id = :sid1
                    ), 0) AS avg_daily_velocity

                FROM stock_batches sb
                JOIN products p ON p.id = sb.product_id
                WHERE p.shop_id = :sid2
                  AND sb.quantity > 0
                  AND sb.expiry_date >= CURDATE()
                  AND sb.expiry_date <= DATE_ADD(CURDATE(), INTERVAL :days DAY)
                ORDER BY sb.expiry_date ASC
            ");
            $rows->execute([':sid1' => $shopId, ':sid2' => $shopId, ':days' => $days]);
            $expiring = $rows->fetchAll();

            echo json_encode(["status" => "success", "data" => $expiring]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(["status"=>"error","message"=>"Unknown action: $action"]);
        break;
}
