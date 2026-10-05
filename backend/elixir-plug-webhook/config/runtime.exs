# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: reads the webhook secret, optional Authorization value and PORT from the environment at boot.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Config

config :revenuedot_webhook,
  secret: System.get_env("REVENUEDOT_WEBHOOK_SECRET"),
  authorization: System.get_env("REVENUEDOT_WEBHOOK_AUTHORIZATION", ""),
  port: String.to_integer(System.get_env("PORT", "3000"))
