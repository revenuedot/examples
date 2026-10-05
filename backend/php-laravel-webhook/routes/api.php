<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: registers POST /webhooks/revenuedot.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

use App\Http\Controllers\RevenueDotWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/webhooks/revenuedot', RevenueDotWebhookController::class);
