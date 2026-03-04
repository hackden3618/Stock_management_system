<?php
/**
 * Router for php -S 127.0.0.1:8000
 * Serves static files from uploads/ and routes everything else to endpoints.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve files from the uploads directory directly
if (preg_match('/^\/uploads\//', $uri)) {
    $file = __DIR__ . $uri;
    if (file_exists($file) && is_file($file)) {
        $ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = match($ext) {
            'svg'  => 'image/svg+xml',
            'webp' => 'image/webp',
            'jpg', 'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
            default => 'application/octet-stream',
        };
        header("Content-Type: $mime");
        header("Cache-Control: public, max-age=86400");
        header("Access-Control-Allow-Origin: *");
        readfile($file);
        return true;
    }
    http_response_code(404);
    echo "Not found";
    return true;
}

// Everything else → endpoints
require __DIR__ . '/endpoints.php';
