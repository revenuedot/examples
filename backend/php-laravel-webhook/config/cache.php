<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: remembers delivered event ids in files by default, so the example runs without a database or a .env.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

// Laravel merges this over its own config/cache.php; only the default store changes (Laravel's is "database").
return [
    'default' => env('CACHE_STORE', 'file'),
];
