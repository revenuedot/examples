# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: Sinatra app with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
require "json"
require "set"
require "sinatra/base"
require_relative "verify"

class WebhookApp < Sinatra::Base
  set :secret, ENV["REVENUEDOT_WEBHOOK_SECRET"]
  set :authorization, ENV["REVENUEDOT_WEBHOOK_AUTHORIZATION"].to_s # optional: the Authorization header value set on the webhook
  set :clock, -> { Time.now } # Sinatra calls a proc setting on each read; tests freeze it at the fixture's timestamp
  # At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  set :seen, Set.new
  set :seen_lock, Mutex.new
  # Sinatra's development mode only answers localhost; RevenueDot in Docker calls host.docker.internal.
  set :host_authorization, { permitted_hosts: [] }

  post "/webhooks/revenuedot" do
    content_type :json
    # Read the raw bytes first: the signature covers them exactly.
    raw = request.body.read
    unless RevenueDotSignature.valid?(raw, request.env["HTTP_X_REVENUECAT_WEBHOOK_SIGNATURE"], settings.secret, now: settings.clock)
      halt 401, { error: "invalid signature" }.to_json
    end
    if !settings.authorization.empty? && !Rack::Utils.secure_compare(request.env["HTTP_AUTHORIZATION"].to_s, settings.authorization)
      halt 401, { error: "invalid authorization" }.to_json
    end

    event = JSON.parse(raw).fetch("event")
    duplicate = settings.seen_lock.synchronize { !settings.seen.add?(event["id"]) }
    return { received: true, duplicate: true }.to_json if duplicate

    # Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
    case event["type"]
    when "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"
      logger.info "grant #{Array(event["entitlement_ids"]).join(",")} to #{event["app_user_id"]}"
    when "EXPIRATION"
      logger.info "access ended for #{event["app_user_id"]} (#{event["expiration_reason"]})"
    else
      logger.info "#{event["type"]} for #{event["app_user_id"]}"
    end
    { received: true }.to_json
  end
end
