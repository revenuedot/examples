# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: single-file Rails app with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
require "json"
require "set"
require "action_controller/railtie"
require_relative "verify"

class WebhookApp < Rails::Application
  config.load_defaults 8.0
  config.eager_load = false
  config.logger = ActiveSupport::Logger.new($stdout)
  # RevenueDot in Docker calls host.docker.internal, which Rails' development host check would refuse.
  config.hosts.clear
  # This app sets no cookies or sessions; the value only satisfies Rails' boot check.
  config.secret_key_base = ENV.fetch("SECRET_KEY_BASE", "unused-no-cookies-or-sessions")
  config.x.webhook_secret = ENV["REVENUEDOT_WEBHOOK_SECRET"]
  config.x.webhook_authorization = ENV["REVENUEDOT_WEBHOOK_AUTHORIZATION"].to_s # optional: the Authorization header value set on the webhook
end

# Initialize before defining the controller: initialization adds Rails' default CSRF check to every controller,
# and skip_forgery_protection below must run after it.
Rails.application.initialize!

class WebhooksController < ActionController::Base
  # RevenueDot is a server, not a browser form: there is no CSRF token to check.
  skip_forgery_protection
  class_attribute :clock, default: -> { Time.now } # tests freeze this at the fixture's timestamp
  # At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  SEEN = Set.new
  SEEN_LOCK = Mutex.new

  def create
    config = Rails.configuration.x
    # raw_post is the exact bytes received: the signature covers them, so never re-encode params.
    raw = request.raw_post
    unless RevenueDotSignature.valid?(raw, request.headers[RevenueDotSignature::HEADER], config.webhook_secret, now: clock.call)
      return render json: { error: "invalid signature" }, status: :unauthorized
    end
    if config.webhook_authorization.present? &&
        !ActiveSupport::SecurityUtils.secure_compare(request.authorization.to_s, config.webhook_authorization)
      return render json: { error: "invalid authorization" }, status: :unauthorized
    end

    event = JSON.parse(raw).fetch("event")
    if SEEN_LOCK.synchronize { !SEEN.add?(event["id"]) }
      return render json: { received: true, duplicate: true }
    end

    # Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
    case event["type"]
    when "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"
      logger.info "grant #{Array(event["entitlement_ids"]).join(",")} to #{event["app_user_id"]}"
    when "EXPIRATION"
      logger.info "access ended for #{event["app_user_id"]} (#{event["expiration_reason"]})"
    else
      logger.info "#{event["type"]} for #{event["app_user_id"]}"
    end
    render json: { received: true }
  end
end

Rails.application.routes.draw do
  post "/webhooks/revenuedot", to: "webhooks#create"
end
