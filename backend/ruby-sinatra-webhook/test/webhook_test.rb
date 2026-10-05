# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: tests the Sinatra webhook with a real signed delivery captured from a RevenueDot server.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
ENV["APP_ENV"] = "test"
require "minitest/autorun"
require "rack/test"
require_relative "../app"

FIXTURE = JSON.parse(File.read(File.join(__dir__, "fixtures/initial-purchase.json")))
SIGNED_AT = Time.at(FIXTURE["signature_header"][/t=(\d+)/, 1].to_i)

class VerifyTest < Minitest::Test
  def valid?(body: FIXTURE["body"], header: FIXTURE["signature_header"], secret: FIXTURE["secret"], now: SIGNED_AT)
    RevenueDotSignature.valid?(body, header, secret, now: now)
  end

  def test_signature
    assert valid?
    refute valid?(body: FIXTURE["body"].sub("9.99", "0.99"))
    refute valid?(secret: "whsec_wrong")
    refute valid?(now: SIGNED_AT + 301)
    refute valid?(header: nil)
  end
end

class WebhookTest < Minitest::Test
  include Rack::Test::Methods

  def app
    WebhookApp.set :secret, FIXTURE["secret"]
    WebhookApp.set :authorization, FIXTURE["authorization_header"]
    WebhookApp.set :clock, -> { SIGNED_AT }
    WebhookApp.set :seen, Set.new
    WebhookApp
  end

  def send_delivery(signature, authorization)
    post "/webhooks/revenuedot", FIXTURE["body"],
      "CONTENT_TYPE" => "application/json",
      "HTTP_X_REVENUECAT_WEBHOOK_SIGNATURE" => signature,
      "HTTP_AUTHORIZATION" => authorization
    last_response
  end

  def test_handler
    res = send_delivery(FIXTURE["signature_header"], FIXTURE["authorization_header"])
    assert_equal 200, res.status
    assert_equal({ "received" => true }, JSON.parse(res.body))
    res = send_delivery(FIXTURE["signature_header"], FIXTURE["authorization_header"])
    assert_equal({ "received" => true, "duplicate" => true }, JSON.parse(res.body))
    res = send_delivery("t=1,v1=00", FIXTURE["authorization_header"])
    assert_equal 401, res.status
    assert_equal({ "error" => "invalid signature" }, JSON.parse(res.body))
    res = send_delivery(FIXTURE["signature_header"], "Bearer nope")
    assert_equal 401, res.status
    assert_equal({ "error" => "invalid authorization" }, JSON.parse(res.body))
  end
end
