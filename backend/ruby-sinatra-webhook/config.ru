# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: rackup entry point; refuses to start without the webhook signing secret.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
require_relative "app"

abort "Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)" if ENV["REVENUEDOT_WEBHOOK_SECRET"].to_s.empty?
run WebhookApp
