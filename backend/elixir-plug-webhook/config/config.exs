# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: compile-time config; tests call the router directly, so they do not start the HTTP listener.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Config

config :revenuedot_webhook, server: config_env() != :test
