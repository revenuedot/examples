<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: boots the Laravel app and loads routes/api.php without the /api prefix.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    // The api group has no session, cookies or CSRF check, which a server-to-server webhook must not need.
    ->withRouting(api: __DIR__.'/../routes/api.php', apiPrefix: '')
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
