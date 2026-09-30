# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: tests the Plug webhook with a real signed delivery captured from a RevenueDot server.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
defmodule RevenuedotWebhookTest do
  use ExUnit.Case, async: false
  import Plug.Test
  import Plug.Conn
  alias RevenuedotWebhook.{Router, Signature}

  @fixture "fixtures/initial-purchase.json" |> Path.expand(__DIR__) |> File.read!() |> Jason.decode!()
  @signed_at ~r/t=(\d+)/ |> Regex.run(@fixture["signature_header"]) |> List.last() |> String.to_integer()

  setup do
    Application.put_env(:revenuedot_webhook, :secret, @fixture["secret"])
    Application.put_env(:revenuedot_webhook, :authorization, @fixture["authorization_header"])
    Application.put_env(:revenuedot_webhook, :clock, fn -> @signed_at end)
    on_exit(fn -> Application.delete_env(:revenuedot_webhook, :clock) end)
  end

  test "accepts the real delivery and rejects tampering, wrong secrets and old deliveries" do
    %{"secret" => secret, "signature_header" => sig, "body" => body} = @fixture
    assert Signature.valid?(body, sig, secret, now: @signed_at)
    refute Signature.valid?(String.replace(body, "9.99", "0.99", global: false), sig, secret, now: @signed_at)
    refute Signature.valid?(body, sig, "whsec_wrong", now: @signed_at)
    refute Signature.valid?(body, sig, secret, now: @signed_at + 301)
    refute Signature.valid?(body, nil, secret, now: @signed_at)
  end

  test "POST /webhooks/revenuedot answers 200, dedupes retries and refuses bad signatures" do
    good_sig = @fixture["signature_header"]
    good_auth = @fixture["authorization_header"]

    conn = deliver(good_sig, good_auth)
    assert {conn.status, Jason.decode!(conn.resp_body)} == {200, %{"received" => true}}
    conn = deliver(good_sig, good_auth)
    assert {conn.status, Jason.decode!(conn.resp_body)} == {200, %{"received" => true, "duplicate" => true}}
    conn = deliver("t=1,v1=00", good_auth)
    assert {conn.status, Jason.decode!(conn.resp_body)} == {401, %{"error" => "invalid signature"}}
    conn = deliver(good_sig, "Bearer nope")
    assert {conn.status, Jason.decode!(conn.resp_body)} == {401, %{"error" => "invalid authorization"}}
  end

  defp deliver(signature, authorization) do
    conn(:post, "/webhooks/revenuedot", @fixture["body"])
    |> put_req_header("content-type", "application/json")
    |> put_req_header("x-revenuecat-webhook-signature", signature)
    |> put_req_header("authorization", authorization)
    |> Router.call(Router.init([]))
  end
end
