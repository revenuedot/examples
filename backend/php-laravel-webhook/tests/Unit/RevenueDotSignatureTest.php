<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: tests the signature check with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

namespace Tests\Unit;

use App\Support\RevenueDotSignature;
use PHPUnit\Framework\TestCase;

class RevenueDotSignatureTest extends TestCase
{
    public function test_accepts_the_real_delivery_and_rejects_tampering_wrong_secrets_old_deliveries_and_missing_headers(): void
    {
        $f = json_decode(file_get_contents(__DIR__.'/../fixtures/initial-purchase.json'), true);
        preg_match('/t=(\d+)/', $f['signature_header'], $m);
        // Freeze "now" at the signing time; otherwise the 5-minute window has long passed.
        $at = (int) $m[1];
        $body = $f['body'];
        $sig = $f['signature_header'];

        $this->assertTrue(RevenueDotSignature::verify($body, $sig, $f['secret'], $at));
        $this->assertFalse(RevenueDotSignature::verify(preg_replace('/9\.99/', '0.99', $body, 1), $sig, $f['secret'], $at), 'changed body');
        $this->assertFalse(RevenueDotSignature::verify($body, $sig, 'whsec_wrong', $at), 'wrong secret');
        $this->assertFalse(RevenueDotSignature::verify($body, $sig, $f['secret'], $at + 301), 'old delivery');
        $this->assertFalse(RevenueDotSignature::verify($body, null, $f['secret'], $at), 'missing header');
    }
}
