<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: reads the webhook secret and optional Authorization value from the environment.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

return [
    'revenuedot' => [
        'webhook_secret' => env('REVENUEDOT_WEBHOOK_SECRET'),
        // Optional: the Authorization header value set on the webhook.
        'webhook_authorization' => env('REVENUEDOT_WEBHOOK_AUTHORIZATION'),
    ],
];
