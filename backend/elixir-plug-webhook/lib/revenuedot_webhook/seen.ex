# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: remembers delivered event ids so a retried delivery is not processed twice.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
defmodule RevenuedotWebhook.Seen do
  # At-least-once delivery: the same event.id can arrive twice. In memory here; use a unique index in production.
  use Agent

  def start_link(_opts), do: Agent.start_link(fn -> MapSet.new() end, name: __MODULE__)

  @doc "Returns true the first time an id is seen, false afterwards."
  def first_time?(id) do
    Agent.get_and_update(__MODULE__, fn seen -> {not MapSet.member?(seen, id), MapSet.put(seen, id)} end)
  end
end
