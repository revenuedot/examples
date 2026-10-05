<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests POST /webhooks/revenuedot through Laravel's HTTP kernel with a real signed delivery.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

namespace Tests\Feature;

use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RevenueDotWebhookTest extends TestCase
{
    public function test_answers_200_dedupes_retries_and_refuses_bad_signatures_and_authorization(): void
    {
        $f = json_decode(file_get_contents(__DIR__.'/../fixtures/initial-purchase.json'), true);
        preg_match('/t=(\d+)/', $f['signature_header'], $m);
        // Freeze "now" at the signing time; otherwise the 5-minute window has long passed.
        $this->travelTo(Carbon::createFromTimestamp((int) $m[1]));
        config([
            'services.revenuedot.webhook_secret' => $f['secret'],
            'services.revenuedot.webhook_authorization' => $f['authorization_header'],
        ]);

        // call() sends the body string unchanged; postJson() would re-encode an array.
        $send = fn (string $signature, string $authorization): TestResponse => $this->call('POST', '/webhooks/revenuedot', server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_REVENUECAT_WEBHOOK_SIGNATURE' => $signature,
            'HTTP_AUTHORIZATION' => $authorization,
        ], content: $f['body']);

        $send($f['signature_header'], $f['authorization_header'])->assertOk()->assertExactJson(['received' => true]);
        $send($f['signature_header'], $f['authorization_header'])->assertOk()->assertExactJson(['received' => true, 'duplicate' => true]);
        $send('t=1,v1=00', $f['authorization_header'])->assertUnauthorized()->assertExactJson(['error' => 'invalid signature']);
        $send($f['signature_header'], 'Bearer nope')->assertUnauthorized()->assertExactJson(['error' => 'invalid authorization']);
    }
}
