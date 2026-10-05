<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the PHP webhook with a real signed delivery captured from a RevenueDot server; exits 1 on failure.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

declare(strict_types=1);

require_once __DIR__ . '/../src/handler.php';

$failures = 0;
function check(bool $ok, string $name): void
{
    global $failures;
    echo ($ok ? 'ok   ' : 'FAIL ') . $name . PHP_EOL;
    $failures += $ok ? 0 : 1;
}

$f = json_decode(file_get_contents(__DIR__ . '/fixtures/initial-purchase.json'), true, flags: JSON_THROW_ON_ERROR);
preg_match('/t=(\d+)/', $f['signature_header'], $m);
// Freeze "now" at the signing time; otherwise the 5-minute window has long passed.
$signedAt = (int) $m[1];
$body = $f['body'];
$secret = $f['secret'];
$sig = $f['signature_header'];

check(revenuedot_verify_signature($body, $sig, $secret, $signedAt), 'real delivery verifies');
check(!revenuedot_verify_signature(preg_replace('/9\.99/', '0.99', $body, 1), $sig, $secret, $signedAt), 'changed body fails');
check(!revenuedot_verify_signature($body, $sig, 'whsec_wrong', $signedAt), 'wrong secret fails');
check(!revenuedot_verify_signature($body, $sig, $secret, $signedAt + 301), 'old delivery fails');
check(!revenuedot_verify_signature($body, null, $secret, $signedAt), 'missing header fails');

// A fresh directory so an earlier run's ids do not turn the first delivery into a duplicate.
$seenDir = sys_get_temp_dir() . '/revenuedot-webhook-test-' . bin2hex(random_bytes(6));
$send = fn (string $sigHeader, string $auth) => revenuedot_handle_webhook($body, $sigHeader, $auth, $secret, $f['authorization_header'], $signedAt, $seenDir);

check($send($sig, $f['authorization_header']) === [200, '{"received":true}'], 'first delivery answers 200 {"received":true}');
check($send($sig, $f['authorization_header']) === [200, '{"received":true,"duplicate":true}'], 'retry is a duplicate');
check($send('t=1,v1=00', $f['authorization_header'])[0] === 401, 'bad signature answers 401');
check($send($sig, 'Bearer nope') === [401, '{"error":"invalid authorization"}'], 'wrong Authorization answers 401');

array_map('unlink', glob($seenDir . '/*') ?: []);
@rmdir($seenDir);

echo $failures === 0 ? 'all passed' . PHP_EOL : "$failures failed" . PHP_EOL;
exit($failures === 0 ? 0 : 1);
