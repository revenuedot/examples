<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: handles one POST /webhooks/revenuedot delivery: verify, dedupe, act on the event type.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

declare(strict_types=1);

require_once __DIR__ . '/verify.php';

/**
 * Takes plain values instead of superglobals so tests can call it directly.
 * $authorization is optional: the Authorization header value set on the webhook.
 * Returns [HTTP status, JSON body].
 *
 * @return array{0: int, 1: string}
 */
function revenuedot_handle_webhook(
    string $rawBody,
    ?string $signatureHeader,
    ?string $authorizationHeader,
    string $secret,
    ?string $authorization,
    int $now,
    string $seenDir,
): array {
    if (!revenuedot_verify_signature($rawBody, $signatureHeader, $secret, $now)) {
        return [401, '{"error":"invalid signature"}'];
    }
    if ($authorization !== null && $authorization !== '' && !hash_equals($authorization, $authorizationHeader ?? '')) {
        return [401, '{"error":"invalid authorization"}'];
    }
    $event = json_decode($rawBody, true)['event'] ?? null;
    if (!is_array($event)) {
        return [400, '{"error":"bad json"}'];
    }

    // At-least-once delivery: the same event.id can arrive twice. PHP forgets everything between
    // requests, so remember ids as empty files; mode 'x' fails if the file exists, which makes the
    // check atomic. Use a unique index in your database in production.
    if (!is_dir($seenDir)) {
        @mkdir($seenDir, 0700, true);
    }
    $marker = @fopen($seenDir . '/' . hash('sha256', (string) ($event['id'] ?? '')), 'x');
    if ($marker === false) {
        return [200, '{"received":true,"duplicate":true}'];
    }
    fclose($marker);

    // Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
    $user = $event['app_user_id'] ?? '';
    switch ($event['type'] ?? '') {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'UNCANCELLATION':
        case 'NON_RENEWING_PURCHASE':
        case 'PRODUCT_CHANGE':
            error_log(sprintf('grant %s to %s', implode(',', $event['entitlement_ids'] ?? []), $user));
            break;
        case 'EXPIRATION':
            error_log(sprintf('access ended for %s (%s)', $user, $event['expiration_reason'] ?? ''));
            break;
        default:
            error_log(sprintf('%s for %s', $event['type'] ?? '', $user));
    }
    return [200, '{"received":true}'];
}
