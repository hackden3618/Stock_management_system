<?php
// api/auth.php — login, signup, get-shop
require_once 'db.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$action = $_GET['action'] ?? 'login';
$data   = json_decode(file_get_contents("php://input"), true) ?? [];

// ── Helper: simple session token stored in DB ─────────────────────
function makeToken() { return bin2hex(random_bytes(24)); }

function validateToken($pdo, $token) {
    if (!$token) return null;
    $stmt = $pdo->prepare("
        SELECT u.id, u.username, u.email, u.role, u.shop_id, s.name AS shop_name
        FROM users u
        LEFT JOIN shops s ON s.id = u.shop_id
        WHERE u.token = ?
    ");
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

// ── Add token column if missing ───────────────────────────────────
try { $pdo->exec("ALTER TABLE users ADD COLUMN token VARCHAR(64) DEFAULT NULL"); } catch (PDOException $e) {}

// ═══════════════════════════════════════════════════════════════════
// SIGNUP  POST auth.php?action=signup
// Body: { username, email, password, shop_name }
// ═══════════════════════════════════════════════════════════════════
if ($action === 'signup') {
    $username  = trim($data['username']  ?? '');
    $email     = trim($data['email']     ?? '');
    $password  = $data['password']       ?? '';
    $shopName  = trim($data['shop_name'] ?? '');

    if (!$username || !$password || !$shopName) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username, password and shop name are required."]);
        exit;
    }
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Password must be at least 6 characters."]);
        exit;
    }

    // Check duplicate username
    $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $check->execute([$username]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Username already taken."]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Create the shop
        $pdo->prepare("INSERT INTO shops (name) VALUES (?)")->execute([$shopName]);
        $shopId = $pdo->lastInsertId();

        // 2. Create the user
        $hash  = password_hash($password, PASSWORD_DEFAULT);
        $token = makeToken();
        $pdo->prepare("INSERT INTO users (username, email, password_hash, role, shop_id, token) VALUES (?, ?, ?, 'Admin', ?, ?)")
            ->execute([$username, $email, $hash, $shopId, $token]);
        $userId = $pdo->lastInsertId();

        // 3. Point shop.owner_id back to user
        $pdo->prepare("UPDATE shops SET owner_id = ? WHERE id = ?")->execute([$userId, $shopId]);

        $pdo->commit();

        echo json_encode([
            "status" => "success",
            "token"  => $token,
            "user"   => [
                "id"        => $userId,
                "username"  => $username,
                "email"     => $email,
                "role"      => "Admin",
                "shop_id"   => $shopId,
                "shop_name" => $shopName,
            ]
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Signup failed: " . $e->getMessage()]);
    }
    exit;
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN  POST auth.php?action=login
// Body: { username, password }
// ═══════════════════════════════════════════════════════════════════
if ($action === 'login') {
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username and password required."]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT u.id, u.username, u.email, u.role, u.shop_id, u.password_hash, s.name AS shop_name
        FROM users u
        LEFT JOIN shops s ON s.id = u.shop_id
        WHERE u.username = ?
    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid username or password."]);
        exit;
    }

    $token = makeToken();
    $pdo->prepare("UPDATE users SET token = ? WHERE id = ?")->execute([$token, $user['id']]);

    echo json_encode([
        "status" => "success",
        "token"  => $token,
        "user"   => [
            "id"        => $user['id'],
            "username"  => $user['username'],
            "email"     => $user['email'],
            "role"      => $user['role'],
            "shop_id"   => $user['shop_id'],
            "shop_name" => $user['shop_name'],
        ]
    ]);
    exit;
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE PROFILE  POST auth.php?action=updateProfile
// Body: { email?, current_password?, new_password? }
// Header: Authorization: Bearer <token>
// ═══════════════════════════════════════════════════════════════════
if ($action === 'updateProfile') {
    $token    = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    $authUser = validateToken($pdo, $token);
    if (!$authUser) { http_response_code(401); echo json_encode(["status"=>"error","message"=>"Unauthorised"]); exit; }

    $email       = isset($data['email']) ? trim($data['email']) : null;
    $currentPass = $data['current_password'] ?? null;
    $newPass     = $data['new_password']     ?? null;

    // If changing password, verify current password first
    if ($newPass) {
        if (strlen($newPass) < 6) {
            http_response_code(400);
            echo json_encode(["status"=>"error","message"=>"New password must be at least 6 characters."]);
            exit;
        }
        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$authUser['id']]);
        $row  = $stmt->fetch();
        if (!$row || !password_verify($currentPass, $row['password_hash'])) {
            http_response_code(401);
            echo json_encode(["status"=>"error","message"=>"Current password is incorrect."]);
            exit;
        }
    }

    $sets = []; $params = [];
    if ($email !== null)  { $sets[] = "email = ?";         $params[] = $email; }
    if ($newPass !== null){ $sets[] = "password_hash = ?"; $params[] = password_hash($newPass, PASSWORD_DEFAULT); }

    if (empty($sets)) {
        echo json_encode(["status"=>"success","message"=>"Nothing to update."]);
        exit;
    }

    $params[] = $authUser['id'];
    $pdo->prepare("UPDATE users SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
    echo json_encode(["status"=>"success","message"=>"Profile updated."]);
    exit;
}


// Body: { shop_name }  Header: Authorization: Bearer <token>
// ═══════════════════════════════════════════════════════════════════
if ($action === 'updateShop') {
    $token    = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    $authUser = validateToken($pdo, $token);
    if (!$authUser) { http_response_code(401); echo json_encode(["status"=>"error","message"=>"Unauthorised"]); exit; }

    $newName = trim($data['shop_name'] ?? '');
    if (!$newName) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"Shop name required"]); exit; }

    $pdo->prepare("UPDATE shops SET name = ? WHERE id = ?")->execute([$newName, $authUser['shop_id']]);
    echo json_encode(["status" => "success", "shop_name" => $newName]);
    exit;
}

http_response_code(400);
echo json_encode(["status" => "error", "message" => "Unknown action."]);
