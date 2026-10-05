# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: starts the event-id store and, outside tests, the Bandit HTTP server on PORT (default 3000).
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
defmodule RevenuedotWebhook.Application do
  use Application
  require Logger

  @impl true
  def start(_type, _args) do
    children = [RevenuedotWebhook.Seen | server()]
    Supervisor.start_link(children, strategy: :one_for_one, name: RevenuedotWebhook.Supervisor)
  end

  # Tests call the router directly, so they skip the listener (config/config.exs sets server: false).
  defp server do
    if Application.get_env(:revenuedot_webhook, :server, true) do
      if Application.get_env(:revenuedot_webhook, :secret) in [nil, ""],
        do: raise("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)")

      port = Application.get_env(:revenuedot_webhook, :port, 3000)
      Logger.info("Listening on http://localhost:#{port}/webhooks/revenuedot")
      [{Bandit, plug: RevenuedotWebhook.Router, port: port}]
    else
      []
    end
  end
end
