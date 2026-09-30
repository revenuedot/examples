# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: Mix project for the Plug + Bandit webhook receiver.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
defmodule RevenuedotWebhook.MixProject do
  use Mix.Project

  def project do
    [
      app: :revenuedot_webhook,
      version: "0.1.0",
      elixir: "~> 1.15",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger, :crypto], mod: {RevenuedotWebhook.Application, []}]
  end

  defp deps do
    [
      {:bandit, "~> 1.7"},
      {:jason, "~> 1.4"},
      {:plug, "~> 1.18"}
    ]
  end
end
