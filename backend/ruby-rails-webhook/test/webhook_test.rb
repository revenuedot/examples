# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: tests the Rails webhook with a real signed delivery captured from a RevenueDot server.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
require "json"
ENV["RAILS_ENV"] = "test"
FIXTURE = JSON.parse(File.read(File.join(__dir__, "fixtures/initial-purchase.json")))
ENV["REVENUEDOT_WEBHOOK_SECRET"] = FIXTURE["secret"]
ENV["REVENUEDOT_WEBHOOK_AUTHORIZATION"] = FIXTURE["authorization_header"]
require_relative "../app"
require "rails/test_help"
require "minitest/autorun"

SIGNED_AT = Time.at(FIXTURE["signature_header"][/t=(\d+)/, 1].to_i)

class VerifyTest < ActiveSupport::TestCase
  def valid?(body: FIXTURE["body"], header: FIXTURE["signature_header"], secret: FIXTURE["secret"], now: SIGNED_AT)
    RevenueDotSignature.valid?(body, header, secret, now: now)
  end

  test "accepts the real delivery and rejects tampering, wrong secrets and old deliveries" do
    assert valid?
    assert_not valid?(body: FIXTURE["body"].sub("9.99", "0.99"))
    assert_not valid?(secret: "whsec_wrong")
    assert_not valid?(now: SIGNED_AT + 301)
    assert_not valid?(header: nil)
  end
end

class WebhookTest < ActionDispatch::IntegrationTest
  setup { WebhooksController.clock = -> { SIGNED_AT } }

  def send_delivery(signature, authorization)
    post "/webhooks/revenuedot", params: FIXTURE["body"], headers: {
      "Content-Type" => "application/json",
      "X-RevenueCat-Webhook-Signature" => signature,
      "Authorization" => authorization
    }
  end

  test "POST /webhooks/revenuedot answers 200, dedupes retries and refuses bad signatures" do
    send_delivery(FIXTURE["signature_header"], FIXTURE["authorization_header"])
    assert_response 200
    assert_equal({ "received" => true }, response.parsed_body)
    send_delivery(FIXTURE["signature_header"], FIXTURE["authorization_header"])
    assert_equal({ "received" => true, "duplicate" => true }, response.parsed_body)
    send_delivery("t=1,v1=00", FIXTURE["authorization_header"])
    assert_response 401
    assert_equal({ "error" => "invalid signature" }, response.parsed_body)
    send_delivery(FIXTURE["signature_header"], "Bearer nope")
    assert_response 401
    assert_equal({ "error" => "invalid authorization" }, response.parsed_body)
  end
end
