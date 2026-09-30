<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: front controller that routes POST /webhooks/revenuedot to the webhook handler.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

declare(strict_types=1);

require_once __DIR__ . '/../src/handler.php';

header('Content-Type: application/json');

if (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) !== '/webhooks/revenuedot') {
    http_response_code(404);
    echo '{"error":"not found"}';
    return;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo '{"error":"method not allowed"}';
    return;
}
$secret = getenv('REVENUEDOT_WEBHOOK_SECRET') ?: '';
if ($secret === '') {
    error_log('Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)');
    http_response_code(500);
    echo '{"error":"server not configured"}';
    return;
}

[$status, $body] = revenuedot_handle_webhook(
    // The raw bytes, read before anything parses them: the signature covers them exactly.
    file_get_contents('php://input') ?: '',
    $_SERVER['HTTP_X_REVENUECAT_WEBHOOK_SIGNATURE'] ?? null,
    $_SERVER['HTTP_AUTHORIZATION'] ?? null,
    $secret,
    getenv('REVENUEDOT_WEBHOOK_AUTHORIZATION') ?: null,
    time(),
    getenv('REVENUEDOT_SEEN_DIR') ?: sys_get_temp_dir() . '/revenuedot-webhook-events',
);
http_response_code($status);
echo $body;
