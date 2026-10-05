<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: handles POST /webhooks/revenuedot: verify the signature, dedupe on event.id, act on the event type.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

namespace App\Http\Controllers;

use App\Support\RevenueDotSignature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class RevenueDotWebhookController
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('services.revenuedot.webhook_secret');
        if ($secret === '') {
            throw new RuntimeException('Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)');
        }

        // The raw bytes: the signature covers them exactly, so read them before $request->input() or ->json().
        $raw = $request->getContent();
        // now() follows Laravel's test clock, so tests can freeze time with travelTo().
        if (! RevenueDotSignature::verify($raw, $request->header(RevenueDotSignature::HEADER), $secret, now()->getTimestamp())) {
            return response()->json(['error' => 'invalid signature'], 401);
        }
        $authorization = (string) config('services.revenuedot.webhook_authorization');
        if ($authorization !== '' && ! hash_equals($authorization, (string) $request->header('Authorization', ''))) {
            return response()->json(['error' => 'invalid authorization'], 401);
        }
        $event = json_decode($raw, true)['event'] ?? null;
        if (! is_array($event)) {
            return response()->json(['error' => 'bad json'], 400);
        }

        // At-least-once delivery: the same event.id can arrive twice. Cache::add only writes when the key
        // is missing, atomically; keep ids longer than the retry window (about 2.5 hours).
        // Use a unique index in your database in production.
        if (! Cache::add('revenuedot-webhook:'.($event['id'] ?? ''), true, now()->addDays(7))) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        // Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
        $user = $event['app_user_id'] ?? '';
        match ($event['type'] ?? '') {
            'INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE' => Log::info(sprintf('grant %s to %s', implode(',', $event['entitlement_ids'] ?? []), $user)),
            'EXPIRATION' => Log::info(sprintf('access ended for %s (%s)', $user, $event['expiration_reason'] ?? '')),
            default => Log::info(sprintf('%s for %s', $event['type'] ?? '', $user)),
        };

        return response()->json(['received' => true]);
    }
}
