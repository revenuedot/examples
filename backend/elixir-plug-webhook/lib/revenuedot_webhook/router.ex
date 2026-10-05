# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: Plug router with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
defmodule RevenuedotWebhook.Router do
  use Plug.Router
  require Logger
  alias RevenuedotWebhook.{Seen, Signature}

  # No Plug.Parsers here: it reads and discards the body, and the signature needs the exact raw bytes.
  plug :match
  plug :dispatch

  post "/webhooks/revenuedot" do
    # Read the raw bytes first: the signature covers them exactly.
    case Plug.Conn.read_body(conn) do
      {:ok, raw, conn} -> receive_delivery(conn, raw)
      {:more, _partial, conn} -> reply(conn, 413, %{error: "body too large"})
      {:error, _reason} -> reply(conn, 400, %{error: "unreadable body"})
    end
  end

  match _ do
    send_resp(conn, 404, "not found")
  end

  defp receive_delivery(conn, raw) do
    config = Application.get_all_env(:revenuedot_webhook)
    now = Keyword.get(config, :clock, fn -> System.os_time(:second) end).()

    with {:sig, true} <- {:sig, Signature.valid?(raw, header(conn, Signature.header()), config[:secret], now: now)},
         {:auth, true} <- {:auth, authorized?(header(conn, "authorization"), config[:authorization])},
         {:ok, %{"event" => event}} <- Jason.decode(raw) do
      if Seen.first_time?(event["id"]) do
        handle(event)
        reply(conn, 200, %{received: true})
      else
        reply(conn, 200, %{received: true, duplicate: true})
      end
    else
      {:sig, false} -> reply(conn, 401, %{error: "invalid signature"})
      {:auth, false} -> reply(conn, 401, %{error: "invalid authorization"})
      _ -> reply(conn, 400, %{error: "bad json"})
    end
  end

  # Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
  defp handle(%{"type" => type} = event)
       when type in ~w(INITIAL_PURCHASE RENEWAL UNCANCELLATION NON_RENEWING_PURCHASE PRODUCT_CHANGE) do
    Logger.info("grant #{Enum.join(event["entitlement_ids"] || [], ",")} to #{event["app_user_id"]}")
  end

  defp handle(%{"type" => "EXPIRATION"} = event),
    do: Logger.info("access ended for #{event["app_user_id"]} (#{event["expiration_reason"]})")

  defp handle(event), do: Logger.info("#{event["type"]} for #{event["app_user_id"]}")

  # Optional: the Authorization header value set on the webhook. Empty skips the check.
  defp authorized?(_got, want) when want in [nil, ""], do: true
  defp authorized?(got, want), do: Plug.Crypto.secure_compare(got || "", want)

  defp header(conn, name), do: conn |> get_req_header(name) |> List.first()

  defp reply(conn, status, body) do
    conn |> put_resp_content_type("application/json") |> send_resp(status, Jason.encode!(body))
  end
end
