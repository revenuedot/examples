# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: verifies the HMAC signature on a RevenueDot webhook delivery.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
defmodule RevenuedotWebhook.Signature do
  @moduledoc """
  Checks `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
  Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers.
  """

  @doc "The signature header, lowercased as Plug stores request headers."
  def header, do: "x-revenuecat-webhook-signature"

  @doc """
  `raw_body` must be the exact bytes received; re-encoding decoded JSON changes them.
  Options: `:now` (unix seconds, for tests) and `:tolerance` (seconds, default 300).
  """
  def valid?(raw_body, header, secret, opts \\ []) do
    now = Keyword.get_lazy(opts, :now, fn -> System.os_time(:second) end)
    tolerance = Keyword.get(opts, :tolerance, 300)

    # The regex stays inline: OTP 28 no longer allows compiled regexes in module attributes.
    with header when is_binary(header) <- header,
         [_, t, v1] <- Regex.run(~r/(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)/, header),
         # Refuse old deliveries so a captured request cannot be replayed.
         true <- abs(now - String.to_integer(t)) <= tolerance do
      expected = :crypto.mac(:hmac, :sha256, secret, [t, ".", raw_body]) |> Base.encode16(case: :lower)
      Plug.Crypto.secure_compare(expected, v1)
    else
      _ -> false
    end
  end
end
